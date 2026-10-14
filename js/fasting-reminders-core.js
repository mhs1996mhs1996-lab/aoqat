(function(root){'use strict';
 const defaults=()=>({enabled:true,time:'20:00'});
 function normalize(raw){return {enabled:raw?.enabled!==false,time:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw?.time)?raw.time:'20:00'};}
 function dateParts(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));const key=p.year+'-'+p.month+'-'+p.day;return {key,start:+new Date(key+'T00:00:00+03:00')};}
 function target(now){const d=dateParts(now),day=new Date(d.start+86400000+43200000),h=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{timeZone:'Asia/Baghdad',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(day).map(x=>[x.type,x.value]));return {key:dateParts(day).key,weekday:new Date(dateParts(day).key+'T00:00:00Z').getUTCDay(),month:+h.month,day:+h.day};}
 function reasons(d){if(d.month===9||(d.month===10&&d.day===1)||(d.month===12&&d.day>=10&&d.day<=13))return [];
 const out=[];const add=(id,label)=>out.push({id,label});
 if(d.month===12&&d.day===9)add('arafah','صيام يوم عرفة لغير الحاج');
 if(d.month===1&&(d.day===9||d.day===10))add('ashura',d.day===9?'صيام تاسوعاء مع عاشوراء':'صيام عاشوراء');
 if([13,14,15].includes(d.day))add('white-days','صيام الأيام البيض');
 if(d.weekday===1||d.weekday===4)add('monday-thursday',d.weekday===1?'صيام الاثنين':'صيام الخميس');
 if(d.month===10&&d.day===2)add('shawwal','التذكير بستة أيام من شوال؛ اختر أيامك المناسبة');
 if(d.month===1&&d.day===1)add('muharram','التذكير بالإكثار من الصيام في محرم');
 return out;}
 function event(now,raw){const s=normalize(raw);if(!s.enabled)return null;const d=dateParts(now),tomorrow=target(now),items=reasons(tomorrow);if(!items.length)return null;const [h,m]=s.time.split(':').map(Number);return {kind:'fasting',key:'fasting:'+tomorrow.key,at:d.start+(h*60+m)*60000,title:'تذكير بصيام التطوع',body:'تذكير للغد: '+items.map(x=>x.label).join('، ')+'.\nحسب التقويم الهجري في التطبيق (أم القرى)؛ تُراعى رؤية الهلال المحلية.',section:'fasting',topicId:items[0].id};}
 const api={defaults,normalize,dateParts,target,reasons,event};root.AoqatFastingRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);