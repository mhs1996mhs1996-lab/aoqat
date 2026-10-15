(function(root){'use strict';
  const ids=['morning','evening','prayer','sleep','waking','tasbih'];
  const prayers=['fajr','dhuhr','asr','maghrib','isha'];
  const titles={morning:'أذكار الصباح',evening:'أذكار المساء',prayer:'أذكار بعد الصلاة',sleep:'أذكار النوم',waking:'أذكار الاستيقاظ',tasbih:'التسبيح والاستغفار والصلاة على النبي ﷺ'};
  const iqamaDefaults={fajr:20,dhuhr:10,asr:10,maghrib:10,isha:10};
  const clocks={morning:['06:00'],evening:['17:00'],prayer:['05:30','12:30','15:30','18:30','20:00'],sleep:['22:00'],waking:['07:00'],tasbih:['09:00','16:00']};
  function clock(v){const m=/^(\d{2}):(\d{2})$/.exec(String(v));return m&&+m[1]<24&&+m[2]<60?+m[1]*60+(+m[2]):null;}
  function minutes(v,id){const m=/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(String(v));if(!m||+m[1]>23)return null;let h=+m[1];if(['asr','maghrib','isha'].includes(id)&&h<12)h+=12;if(id==='fajr'&&h===12)h=0;return h*60+(+m[2]);}
  function normalize(raw={}){return Object.fromEntries(ids.map(id=>{const r=raw?.[id],n=Number(r?.offset);return [id,{enabled:r?.enabled!==false,mode:r?.mode==='custom'?'custom':'default',type:r?.type==='clock'?'clock':'relative',offset:Number.isInteger(n)&&n>=-120&&n<=120?n:0,times:clocks[id].map((v,i)=>clock(r?.times?.[i])!==null?r.times[i]:v)}];}));}
  function day(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));const key=p.year+'-'+p.month+'-'+p.day;return {key,month:+p.month,day:+p.day,start:+new Date(key+'T00:00:00+03:00')};}
  function duration(raw,id,fallback){const n=raw?.[id];return Number.isInteger(n)&&n>=0&&n<=120?n:fallback;}
  // row is already transformed by the application's prayer-time choice exactly once.
  function events(now,raw,row,iqama={},after={}){const d=day(now),s=normalize(raw),out=[];
    const valid=row&&+row.gregorian_month===d.month&&+row.gregorian_day===d.day;
    const prayer=id=>valid?minutes(row[id],id):null;
    const finish=id=>{const t=prayer(id);return t===null?null:t+duration(iqama,id,iqamaDefaults[id])+duration(after,id,10);};
    const add=(id,slot,t)=>{if(t===null||!Number.isFinite(t))return;out.push({kind:'azkar-reminder',section:'azkar',topicId:id,key:'azkar:'+id+':'+d.key+':'+slot,at:d.start+t*60000,title:'تذكير: '+titles[id],body:'حان وقت '+titles[id]+'. اضغط لفتح الأذكار.'});};
    for(const id of ids){const v=s[id];if(!v.enabled)continue;
      if(id==='sleep'||id==='waking'||v.mode==='custom'&&v.type==='clock'){(v.mode==='default'?clocks[id]:v.times).forEach((t,i)=>add(id,i,clock(t)));continue;}
      const offset=v.mode==='custom'?v.offset:0;
      const shift=t=>t===null?null:t+offset;
      if(id==='morning')add(id,0,shift(finish('fajr')));
      if(id==='evening'){const t=prayer('maghrib');add(id,0,t===null?null:t-20+offset);}
      if(id==='prayer')prayers.forEach(p=>add(id,p,shift(finish(p))));
      if(id==='tasbih'){const t=prayer('sunrise');add(id,0,t===null?null:t+120+offset);add(id,1,shift(finish('asr')));}
    }return out.sort((a,b)=>a.at-b.at);
  }
  const api={ids,prayers,titles,clocks,clock,minutes,day,normalize,events};root.AoqatAzkarRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
