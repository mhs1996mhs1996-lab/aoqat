"use strict";
(function(){
  function fix(){
    const next=document.getElementById("nextPrayerLabel");
    const iqama=document.getElementById("iqamaLabel");
    [next,iqama].forEach(el=>{
      if(!el||el.tagName!=="SPAN") return;
      const d=document.createElement("div");
      d.id=el.id;
      d.className="prayer-countdown-label";
      d.textContent=el.textContent;
      el.replaceWith(d);
    });
    const iq=document.getElementById("iqamaStatus");
    if(iq?.hidden) iq.style.setProperty("display","none","important");
  }
  const style=document.createElement("style");
  style.id="prayerCountdownMobileFixStyles";
  style.textContent=`
    #nextPrayerLabel,#iqamaLabel{display:block!important;color:#fff!important;font-size:14px!important;font-weight:700!important;line-height:1.4!important;direction:rtl!important;white-space:nowrap!important}
    #iqamaStatus[hidden]{display:none!important}
    #iqamaStatus:not([hidden]){display:flex!important}
    @media(max-width:600px){#nextPrayerLabel,#iqamaLabel{font-size:11px!important}.next-prayer{max-width:100%!important;flex-wrap:nowrap!important}}
  `;
  document.head.appendChild(style);
  fix();
  setTimeout(fix,100);
  setTimeout(fix,700);
  window.addEventListener("aoqatModulesReady",fix);
  const obs=new MutationObserver(()=>{
    const iq=document.getElementById("iqamaStatus");
    if(iq?.hidden) iq.style.setProperty("display","none","important");
    else if(iq) iq.style.removeProperty("display");
  });
  setTimeout(()=>{const iq=document.getElementById("iqamaStatus");if(iq)obs.observe(iq,{attributes:true,attributeFilter:["hidden"]});},150);
})();