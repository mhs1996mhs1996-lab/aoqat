(function(root){'use strict';
 const C=root.AoqatHijriCore;
 function clean(raw){return String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&nbsp;|&quot;|&amp;/g,' ').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ـ/g,'').replace(/\s+/g,' ').trim();}
 function decode(raw){return String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&');}
 function items(xml){
  const tag=(s,name)=>decode((s.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))||[])[1]||'');
  return [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>({title:tag(m[1],'title'),body:tag(m[1],'description')+' '+tag(m[1],'content:encoded'),url:tag(m[1],'link'),publishedAt:tag(m[1],'pubDate')}));
 }
 function parse(item,now=new Date()){
  let host;try{host=new URL(item.url).hostname;}catch(_){return null;}
  if(!['dws.gov.iq','www.dws.gov.iq','ina.iq','www.ina.iq'].includes(host))return null;
  const text=clean(item.title+' '+item.body),published=Date.parse(item.publishedAt);
  if(!Number.isFinite(published)||published>+now+3600000||+now-published>45*86400000)return null;
  if(!/ديوان الوقف السني/.test(text)||!/(اعلن|يعلن|تعلن|اعلنت)/.test(text))return null;
  const first=/(?:غرة|اول(?: ايام)?|الاول(?: من)?)(?: شهر)?\s+(رمضان|شوال|ذ[يو] الحجة)/g;let match;const results=[];
  while((match=first.exec(text))){
   const month=match[1]==='رمضان'?9:match[1]==='شوال'?10:12;
   const context=text.slice(Math.max(0,match.index-160),match.index+match[0].length+160);
   const dates=[];
   for(const d of context.matchAll(/(?<!\d)(\d{4})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{1,2})(?!\d)/g))dates.push(d[1]+'-'+d[2].padStart(2,'0')+'-'+d[3].padStart(2,'0'));
   for(const d of context.matchAll(/(?<!\d)(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(20\d{2})(?!\d)/g))dates.push(d[3]+'-'+d[2].padStart(2,'0')+'-'+d[1].padStart(2,'0'));
   const unique=[...new Set(dates)].filter(x=>C.parseKey(x)!==null);let startDate;
   if(unique.length===1)startDate=unique[0];
   else if(unique.length===0){
    const before=text.slice(Math.max(0,match.index-100),match.index);
    if(!/غدا/.test(before)||/متمم|المكمل|مكمل/.test(before))continue;
    const key=C.key(new Date(published));startDate=C.key(new Date(Date.parse(key+'T12:00:00+03:00')+86400000));
   }else continue;
   const start=C.parseKey(startDate);if(start===null||Math.abs(start-published)>4*86400000)continue;
   const years=[...context.matchAll(/(?<!\d)(14\d{2}|15\d{2})(?!\d)/g)].map(x=>+x[1]);if(new Set(years).size>1)continue;
   const year=years[0]||C.baseline(new Date(start)).year;
   const a=C.validate({year,month,startDate,source:item.url,publishedAt:new Date(published).toISOString()});
   if(a)results.push(a);
  }
  const unique=[...new Map(results.map(a=>[a.year+':'+a.month+':'+a.startDate,a])).values()];if(unique.length!==1)return null;return unique[0];
 }
 const api={clean,items,parse};root.AoqatHijriAnnouncementParser=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
