(function(root){'use strict';
  const topicIds=['monday-thursday','white-days','arafah','ashura','shawwal','muharram'];
  const defaults=()=>({enabled:false,mode:'after',delay:20,time:'18:00',design:'weekly',topics:[...topicIds]});
  function normalize(raw={}){
    const s=defaults();s.enabled=raw?.enabled===true;
    if(raw?.mode==='clock')s.mode='clock';
    if(Number.isInteger(raw?.delay)&&raw.delay>=1&&raw.delay<=120)s.delay=raw.delay;
    if(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw?.time))s.time=raw.time;
    if(['weekly','0','1','2','3','4','5'].includes(String(raw?.design)))s.design=String(raw.design);
    if(Array.isArray(raw?.topics))s.topics=topicIds.filter(id=>raw.topics.includes(id));
    return s;
  }
  function themeIndex(date,design='weekly'){
    if(design!=='weekly')return Number(normalize({design}).design)||0;
    const key=root.AoqatFridayRemindersCore.dateParts(date).key;
    return ((Math.floor((Date.parse(key+'T00:00:00Z')/86400000)/7)%6)+6)%6;
  }
  function schedule(now,raw,row){
    const C=root.AoqatFridayRemindersCore,s=normalize(raw),d=C.dateParts(now);
    if(!row||+row.gregorian_month!==d.month||+row.gregorian_day!==d.day)return null;
    const maghrib=C.prayerMinutes(row.maghrib,'maghrib'),isha=C.prayerMinutes(row.isha,'maghrib');
    if(maghrib===null||isha===null||isha<=maghrib)return null;
    const time=s.mode==='clock'?C.clock(s.time):maghrib+s.delay;
    if(time===null||time<=maghrib||time>=isha)return null;
    return d.start+time*60000;
  }
  function events(now,settings,row){
    const C=root.AoqatFridayRemindersCore,F=root.AoqatFastingRemindersCore,d=C.dateParts(now),out=[];
    for(const kind of ['friday','fasting']){
      const s=normalize(settings?.[kind]);if(!s.enabled)continue;
      const at=schedule(now,s,row);if(at===null)continue;
      let topicId='',targetDate='';
      if(kind==='friday'){if(d.weekday!==4)continue;}
      else{
        const tomorrow=F.target(now),reasons=F.reasons(tomorrow).filter(item=>s.topics.includes(item.id));
        if(!reasons.length)continue;topicId=reasons[0].id;targetDate=tomorrow.key;
      }
      out.push({kind:'community-post',key:'publish:'+kind+':'+d.key,at,section:kind,topicId,targetDate,action:'post',
        title:kind==='friday'?'حان وقت نشر بوست سنن الجمعة':'حان وقت نشر بوست صيام التطوع',
        body:kind==='friday'?'جهّز بوست سنن الجمعة وشاركه قبل أذان العشاء.':'جهّز بوست تذكير صيام الغد وشاركه قبل أذان العشاء.'});
    }
    return out;
  }
  const api={topicIds,defaults,normalize,themeIndex,schedule,events};root.AoqatCommunityPostsCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
