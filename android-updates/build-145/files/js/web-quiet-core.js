/* Web-only quiet previews; Android ringer control is implemented separately. */
(function(root){'use strict';
 if(root.AndroidNative?.configureAdhan)return;
 const C=root.AoqatAdhanCore;if(!C)return;
 const normalize=C.normalize,defaults=C.defaults,iqamaWindow=C.afterIqamaSilentWindow;
 const fresh=()=>({enabled:false,minutes:Object.fromEntries(C.ids.map(id=>[id,20]))});
 C.defaults=()=>({...defaults(),afterAdhanSilent:fresh()});
 C.normalize=raw=>{const s=normalize(raw),v=raw?.afterAdhanSilent,d=fresh();d.enabled=v?.enabled===true;for(const id of C.ids){const n=Number(v?.minutes?.[id]);if(Number.isFinite(n))d.minutes[id]=Math.max(0,Math.min(120,Math.floor(n)));}s.afterAdhanSilent=d;return s;};
 C.afterAdhanSilentWindow=(rows,now,raw)=>{const s=C.normalize(raw);if(!s.afterAdhanSilent.enabled)return null;const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1),active=[],seen=new Set();
  for(const e of [...C.events(rows,yesterday),...C.events(rows,now)]){const key=e.id+':'+e.at;if(seen.has(key)||e.friday&&s.friday.enabled)continue;seen.add(key);const end=e.at+s.afterAdhanSilent.minutes[e.id]*60000;if(+now>=e.at&&+now<end)active.push({prayerId:e.id,start:e.at,end,source:'adhan'});}
  if(!active.length)return null;active.sort((a,b)=>b.start-a.start);return {...active[0],end:Math.max(...active.map(e=>e.end))};
 };
 C.afterIqamaSilentWindow=(rows,now,raw,iqama={})=>{const s=C.normalize(raw),a=iqamaWindow(rows,now,{...s,enabled:true},iqama),b=C.afterAdhanSilentWindow(rows,now,s);const active=[a&&{...a,source:'iqama'},b].filter(Boolean);if(!active.length)return null;active.sort((a,b)=>b.start-a.start);return {...active[0],end:Math.max(...active.map(e=>e.end))};};
 if(typeof module!=='undefined')module.exports=C;
})(typeof window==='undefined'?globalThis:window);
