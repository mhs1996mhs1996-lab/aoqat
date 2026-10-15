import './hijri-core.js';
import './announcement-parser.js';
const base=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const headers={'apikey':service,'Authorization':'Bearer '+service,'Content-Type':'application/json'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,x-hijri-sync-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const answer=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
async function rest(path,options={}){
 const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}});
 if(!r.ok)throw Error('database_'+r.status);const text=await r.text();return text?JSON.parse(text):null;
}
async function sources(){
 const urls=['https://dws.gov.iq/feed/','https://dws.gov.iq/?feed=rss2','https://ina.iq/ar/rss.xml'];
 const found=[],states=[];
 await Promise.all(urls.map(async url=>{
  try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/rss+xml,text/xml'},signal:AbortSignal.timeout(9000),redirect:'error'});
   if(!r.ok)throw Error('http_'+r.status);const xml=await r.text();if(xml.length>3000000)throw Error('too_large');
   const items=globalThis.AoqatHijriAnnouncementParser.items(xml);
   const latest=Math.max(...items.map(x=>Date.parse(x.publishedAt)).filter(Number.isFinite),0);
   states.push({source:url,status:Date.now()-latest>3*86400000?'stale':'ok',items:items.length});
   for(const item of items){const row=globalThis.AoqatHijriAnnouncementParser.parse(item);if(row)found.push(row);}
  }catch(e){states.push({source:url,status:String(e.message).slice(0,90)});}
 }));
 return {found,states};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method==='GET'){
  try{const anchors=await rest('hijri_month_starts?select=year,month,startDate:start_date,source,publishedAt:published_at&order=start_date.asc');
   return answer({status:'ok',anchors,checkedAt:new Date().toISOString()});
  }catch(_){return answer({status:'unavailable',anchors:[]},503);}
 }
 if(req.method!=='POST')return answer({error:'method'},405);
 try{
  const rows=await rest('hijri_sync_state?id=eq.1&select=secret,last_checked');const state=rows?.[0];
  if(!state||req.headers.get('x-hijri-sync-secret')!==state.secret)return answer({error:'unauthorized'},401);
  if(state.last_checked&&Date.now()-Date.parse(state.last_checked)<240000)return answer({status:'throttled'});
  await rest('hijri_sync_state?id=eq.1',{method:'PATCH',body:JSON.stringify({last_checked:new Date().toISOString()})});
  const {found,states}=await sources(),group=new Map();
  for(const a of found){const k=a.year+':'+a.month;if(!group.has(k))group.set(k,[]);group.get(k).push(a);}
  let inserted=0,conflicts=0;
  for(const entries of group.values()){
   if(new Set(entries.map(x=>x.startDate)).size!==1){conflicts++;continue;}
   const a=entries[0];if(a.year<1448)continue;
   const first=await rest('hijri_month_starts?month=eq.9&year=gte.1448&select=year&limit=1');
   if(a.month!==9&&!first?.length)continue;
   const old=await rest('hijri_month_starts?year=eq.'+a.year+'&month=eq.'+a.month+'&select=start_date');
   if(old?.length&&old[0].start_date!==a.startDate){conflicts++;continue;}
   await rest('hijri_month_starts?on_conflict=year,month',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({year:a.year,month:a.month,start_date:a.startDate,source:a.source,published_at:a.publishedAt})});inserted++;
  }
  await rest('hijri_sync_state?id=eq.1',{method:'PATCH',body:JSON.stringify({last_status:{states,inserted,conflicts}})});
  return answer({status:'checked',inserted,conflicts,sources:states});
 }catch(e){return answer({error:String(e.message).slice(0,80)},500);}
});
