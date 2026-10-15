(function(root){'use strict';
  const topicIds=['monday','thursday','white-days','tasua','ashura','shawwal','dhul-hijjah','arafah'];
  const defaults=()=>({enabled:false,mode:'after',delay:20,time:'18:00',design:'weekly',topics:[...topicIds],topicSchema:2});
  function normalize(raw={}){
    const s=defaults();s.enabled=raw?.enabled===true;
    if(raw?.mode==='clock')s.mode='clock';
    if(Number.isInteger(raw?.delay)&&raw.delay>=1&&raw.delay<=120)s.delay=raw.delay;
    if(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw?.time))s.time=raw.time;
    if(['weekly','0','1','2','3','4','5'].includes(String(raw?.design)))s.design=String(raw.design);
    if(Array.isArray(raw?.topics))s.topics=root.AoqatFastingPostsCalendar.selectedTopics(raw.topics,raw.topicSchema===2);
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
    const C=root.AoqatFridayRemindersCore,d=C.dateParts(now),out=[];
    for(const kind of ['friday','fasting']){
      const s=normalize(settings?.[kind]);if(!s.enabled)continue;
      const at=schedule(now,s,row);if(at===null)continue;
      const choices=kind==='friday'?(d.weekday===4?[{topicId:'',targetDate:''}]:[]):root.AoqatFastingPostsCalendar.candidates(now).filter(x=>s.topics.includes(x.id));
      for(const item of choices)out.push({kind:'community-post',key:'publish:'+kind+':'+(item.topicId||'friday')+':'+d.key,at,section:kind,topicId:item.topicId,targetDate:item.targetDate,action:'post',
        title:kind==='friday'?'حان وقت نشر بوست سنن الجمعة':'حان وقت نشر بوست '+item.title,
        body:kind==='friday'?'جهّز بوست سنن الجمعة وشاركه قبل أذان العشاء.':'جهّز بوست التذكير بالصيام وشاركه قبل أذان العشاء.'});
    }
    return out;
  }
  const api={topicIds,defaults,normalize,themeIndex,schedule,events};root.AoqatCommunityPostsCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
