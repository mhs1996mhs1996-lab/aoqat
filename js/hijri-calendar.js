(function(){'use strict';
 if(window.AndroidNative?.configureAdhan)return;
 const C=window.AoqatHijriCore,KEY='aoqatHijriAnchorsV1',url='https://ytdvhiijxxaqofduorwm.supabase.co/functions/v1/hijri-sync';
 let anchors=[];try{anchors=C.normalize(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch(_){}
 let pending=false;
 function parts(date){return C.parts(date,anchors);}
 async function sync(){
  if(pending||!navigator.onLine)return;pending=true;
  try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Calendar unavailable');
   const body=await r.json();if(body.status!=='ok'||!Array.isArray(body.anchors))return;
   const next=C.normalize([...anchors,...body.anchors]);if(!next.length)return;
   if(JSON.stringify(next)!==JSON.stringify(anchors)){anchors=next;try{localStorage.setItem(KEY,JSON.stringify(anchors));}catch(_){}
    if(typeof updateDateFromGregorian==='function')updateDateFromGregorian();window.dispatchEvent(new Event('aoqatHijriUpdated'));}
  }catch(_){}finally{pending=false;}
 }
 window.AoqatHijriCalendar={parts,sync};
 window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
 setInterval(sync,300000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,1500),{once:true});else setTimeout(sync,1500);
})();
