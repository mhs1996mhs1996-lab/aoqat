(function(root){'use strict';
  const defaults=()=>({sunnah:false,kahf:false,afterMaghrib:20,kahfTime:'08:00'});
  function clock(value){const m=/^(\d{2}):(\d{2})$/.exec(String(value));return m&&+m[1]<24&&+m[2]<60?+m[1]*60+(+m[2]):null;}
  function normalize(raw={}){const s=defaults();s.sunnah=raw?.sunnah===true;s.kahf=raw?.kahf===true;const n=Number(raw?.afterMaghrib);if(Number.isInteger(n)&&n>=0&&n<=120)s.afterMaghrib=n;if(clock(raw?.kahfTime)!==null)s.kahfTime=raw.kahfTime;return s;}
  function dateParts(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));const key=p.year+'-'+p.month+'-'+p.day;return {key,month:+p.month,day:+p.day,weekday:new Date(key+'T00:00:00Z').getUTCDay(),start:new Date(key+'T00:00:00+03:00').getTime()};}
  function prayerMinutes(value,id){const m=/^(\d{1,2}):(\d{2})$/.exec(String(value));if(!m||+m[1]>23||+m[2]>59)return null;let h=+m[1];if(id==='maghrib'&&h<12)h+=12;if(id==='fajr'&&h===12)h=0;return h*60+(+m[2]);}
  function events(now,raw,row){const s=normalize(raw),d=dateParts(now),out=[];if(!row||+row.gregorian_month!==d.month||+row.gregorian_day!==d.day)return out;
    const maghrib=prayerMinutes(row.maghrib,'maghrib');
    if(s.sunnah&&d.weekday===4&&maghrib!==null)out.push({kind:'sunnah',key:'sunnah:'+d.key,at:d.start+(maghrib+s.afterMaghrib)*60000,title:'تذكير بسنن الجمعة',body:'دخلت ليلة الجمعة. تذكّر الصلاة على النبي ﷺ والاستعداد للغسل والتطيّب والتبكير غداً.'});
    const time=clock(s.kahfTime),fajr=prayerMinutes(row.fajr,'fajr');
    if(s.kahf&&d.weekday===5&&time!==null&&fajr!==null&&maghrib!==null&&time>=fajr&&time<maghrib)out.push({kind:'kahf',key:'kahf:'+d.key,at:d.start+time*60000,title:'تذكير بقراءة سورة الكهف',body:'تذكير بقراءة سورة الكهف اليوم. وقت قراءتها واسع خلال نهار الجمعة.'});return out;
  }
  const api={defaults,normalize,clock,dateParts,events,prayerMinutes};root.AoqatFridayRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
