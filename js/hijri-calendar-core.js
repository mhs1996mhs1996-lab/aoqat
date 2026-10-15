(function(root){'use strict';
 const DAY=86400000;
 const names=['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
 function key(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
 function baseline(date){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{timeZone:'Asia/Baghdad',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date).map(x=>[x.type,x.value]));return {year:+p.year,month:+p.month,day:+p.day};}
 function parseKey(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const t=Date.parse(value+'T12:00:00+03:00');return Number.isFinite(t)&&key(new Date(t))===value?t:null;}
 function validate(raw){
  if(!raw||!Number.isInteger(raw.year)||raw.year<1400||raw.year>1600||![9,10,12].includes(raw.month))return null;
  const at=parseKey(raw.startDate);if(at===null)return null;
  let offset=null;
  for(let n=-3;n<=3;n++){const h=baseline(new Date(at+n*DAY));if(h.year===raw.year&&h.month===raw.month&&h.day===1)offset=n;}
  if(offset===null||raw.publishedAt&&!Number.isFinite(Date.parse(raw.publishedAt)))return null;
  return {year:raw.year,month:raw.month,startDate:raw.startDate,offset,source:typeof raw.source==='string'?raw.source:'',publishedAt:raw.publishedAt||''};
 }
 function normalize(rows){if(!Array.isArray(rows))return [];const by=new Map();for(const row of rows){const a=validate(row);if(a)by.set(a.year+':'+a.month,a);}return [...by.values()].sort((a,b)=>a.startDate.localeCompare(b.startDate));}
 function parts(date,rows=[]){
  const k=key(date),eligible=normalize(rows).filter(a=>a.year>=1448),first=eligible.find(a=>a.month===9),anchor=(first?eligible.filter(a=>a.startDate>=first.startDate):[]).filter(a=>a.startDate<=k||(parseKey(a.startDate)-parseKey(k)===DAY&&a.publishedAt&&key(new Date(a.publishedAt))<=k)).at(-1);
  return baseline(new Date(+date+(anchor?.offset||0)*DAY));
 }
 const api={DAY,names,key,baseline,parseKey,validate,normalize,parts};root.AoqatHijriCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
