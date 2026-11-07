(function(){
  "use strict";
  if(window.AoqatWidgetAppearance)return;
  const KEY="aoqatWidgetAppearanceV1";
  const IDS=["next","times","iqama"];
  const NAMES={next:"الصلاة القادمة",times:"مواقيت الصلاة الخمسة",iqama:"باقي ومضى على الإقامة"};
  const BG={transparent:["شفاف تماماً","transparent"],mist:["ضبابي هادئ","rgba(37,78,100,.50)"],blue:["أزرق هادئ","rgba(17,80,109,.83)"],dark:["داكن مميز","rgba(12,37,53,.88)"],cream:["عاجي نصف شفاف","rgba(239,230,213,.87)"]};
  const COLORS={white:["أبيض","#ffffff"],ivory:["عاجي","#fff6d6"],gold:["ذهبي","#ffdb80"],navy:["كحلي","#123143"],black:["فحمي","#1c2327"]};
  const FONTS={sans:["واضح حديث","Tahoma,Arial,sans-serif"],serif:["نسخي كلاسيكي","serif"],condensed:["مختصر","Arial Narrow,Tahoma,sans-serif"],medium:["عريض حديث","Arial,Tahoma,sans-serif"]};
  const defaults=id=>({background:id==="times"?"mist":"transparent",color:"white",font:"sans",scale:105});
  const clean=(id,from)=>{
    const a=defaults(id),v=(from&&typeof from==="object")?from:{};
    if(BG[v.background])a.background=v.background;
    if(COLORS[v.color])a.color=v.color;
    if(FONTS[v.font])a.font=v.font;
    if(Number.isFinite(Number(v.scale)))a.scale=Math.max(75,Math.min(145,Math.round(Number(v.scale)/5)*5));
    return a;
  };
  function load(){
    let saved={};
    try{
      const raw=window.AndroidNative?.readWidgetAppearance?.()||localStorage.getItem(KEY)||"{}";
      saved=JSON.parse(raw)||{};
    }catch(_){}
    return Object.fromEntries(IDS.map(id=>[id,clean(id,saved[id])]));
  }
  function save(settings){
    const value=JSON.stringify(settings);
    try{
      if(window.AndroidNative?.configureWidgetAppearance &&
         window.AndroidNative.configureWidgetAppearance(value)===false)return false;
      localStorage.setItem(KEY,value);
      return true;
    }catch(err){console.warn("Widget appearance not saved",err);return false;}
  }
  function css(){
    if(document.getElementById("aoqatWidgetAppearanceCss"))return;
    const sheet=document.createElement("style");sheet.id="aoqatWidgetAppearanceCss";
    sheet.textContent=`
      #aoqatWidgetAppearance{display:grid;gap:12px;direction:rtl;font-family:Tahoma,Arial,sans-serif;color:#203b42}
      #aoqatWidgetAppearance .wa-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
      #aoqatWidgetAppearance .wa-tabs button{border:1px solid #b9d4d7;border-radius:11px;padding:9px 4px;background:#f2f9f7;color:#1d4451;font-size:13px;font-weight:750}
      #aoqatWidgetAppearance .wa-tabs button[aria-pressed=true]{background:#256e76;color:white}
      #aoqatWidgetAppearance .wa-preview{border-radius:20px;min-height:140px;display:grid;place-content:center;text-align:center;gap:7px;padding:16px;box-shadow:inset 0 0 0 1px #a7c5cc6b,0 5px 15px #10242f24}
      #aoqatWidgetAppearance .wa-preview>*{margin:0;line-height:1.45;text-shadow:0 2px 4px #0009}
      #aoqatWidgetAppearance .wa-control{display:grid;gap:5px;font-size:15px;font-weight:750}
      #aoqatWidgetAppearance select,#aoqatWidgetAppearance input[type=range]{width:100%;min-width:0}
      #aoqatWidgetAppearance select{border:1px solid #bdd2d1;border-radius:9px;padding:9px;background:#fff;color:#233d44;font-size:15px}
      #aoqatWidgetAppearance .wa-note{font-size:13px;color:#4b5c63;line-height:1.8}
      #aoqatWidgetAppearance .wa-reset{padding:10px;border:1px solid #b5cac9;background:#eff6f4;border-radius:10px;color:#254653;font-weight:bold}
    `;document.head.appendChild(sheet);
  }
  function createPanel(){
    css();
    const data=load(), root=document.createElement("section");root.id="aoqatWidgetAppearance";root.setAttribute("dir","rtl");
    let active="next";
    const title=document.createElement("strong");title.textContent="🎨 تخصيص بطاقات شاشة الهاتف";
    const tabs=document.createElement("div");tabs.className="wa-tabs";
    const tabButtons={};
    const preview=document.createElement("div");preview.className="wa-preview";
    const controls=document.createElement("div");controls.style.cssText="display:grid;gap:10px";
    const feedback=document.createElement("p");feedback.className="wa-note";feedback.setAttribute("role","status");feedback.textContent="";
    const descriptions={
      next:["الصلاة القادمة","الظهر بعد 01:20:15","مواقيت الحويجة"],
      times:["مواقيت الصلاة اليوم","الفجر 5:16 ص | الظهر 11:53 ص","العصر 2:49 م | المغرب 5:10 م | العشاء 6:30 م"],
      iqama:["باقي على الإقامة: 04:12","مضى على الإقامة: 00:00","صلاة العصر"]
    };
    function refresh(){
      const cfg=data[active];
      Object.entries(tabButtons).forEach(([id,b])=>b.setAttribute("aria-pressed",String(id===active)));
      const bg=BG[cfg.background][1],text=COLORS[cfg.color][1],font=FONTS[cfg.font][1];
      preview.style.background=bg;
      preview.style.color=text;
      preview.style.fontFamily=font;
      preview.style.backdropFilter=cfg.background==="mist"?"blur(10px)":"none";
      preview.replaceChildren(...descriptions[active].map((t,i)=>{const el=document.createElement("p");el.textContent=t;el.style.fontSize=(cfg.scale/100*(i===1?22:17))+"px";el.style.fontWeight="800";return el;}));
      controls.replaceChildren();
      function choice(name,label,options,key){
        const wrap=document.createElement("label");wrap.className="wa-control";wrap.textContent=label;
        const select=document.createElement("select");select.setAttribute("aria-label",label);
        Object.entries(options).forEach(([id,[text]])=>{const o=document.createElement("option");o.value=id;o.textContent=text;select.append(o);});
        select.value=cfg[key];select.onchange=()=>{data[active][key]=select.value;feedback.textContent=save(data)?"تم حفظ الإعداد. تتحدث البطاقة على أندرويد.":"تعذر حفظ التعديل؛ أعد المحاولة.";refresh();};
        wrap.append(select);controls.append(wrap);
      }
      choice("background","خلفية البطاقة",BG,"background");
      choice("color","لون الخط",COLORS,"color");
      choice("font","نوع الخط",FONTS,"font");
      const scale=document.createElement("label");scale.className="wa-control";scale.textContent="حجم الكتابة داخل البطاقة";
      const slider=document.createElement("input");slider.type="range";slider.min="75";slider.max="145";slider.step="5";slider.value=String(cfg.scale);
      const value=document.createElement("span");value.textContent=cfg.scale+"٪";
      slider.oninput=()=>{value.textContent=slider.value+"٪";data[active].scale=Number(slider.value);preview.style.fontSize=slider.value+"%";preview.querySelectorAll("p").forEach((p,i)=>p.style.fontSize=(Number(slider.value)/100*(i===1?22:17))+"px");};
      slider.onchange=()=>{feedback.textContent=save(data)?"تم حفظ حجم الكتابة.":"تعذر حفظ حجم الكتابة.";};
      scale.append(slider,value);controls.append(scale);
    }
    IDS.forEach(id=>{
      const b=document.createElement("button");b.type="button";b.textContent=NAMES[id];b.onclick=()=>{active=id;feedback.textContent="";refresh();};tabs.append(b);tabButtons[id]=b;
    });
    const note=document.createElement("p");note.className="wa-note";
    note.textContent="لمساحة البطاقة نفسها، اضغط عليها مطولاً في شاشة الهاتف واسحب حوافها للتكبير أو التصغير. بعض المشغلات تقيّد الحد الأدنى. الخلفية الضبابية على أندرويد شفافية ملوّنة؛ معاينة الويب توضيحية.";
    const reset=document.createElement("button");reset.type="button";reset.className="wa-reset";reset.textContent="إرجاع هذا التصميم إلى الافتراضي";reset.onclick=()=>{data[active]=defaults(active);feedback.textContent=save(data)?"رجعت إعدادات هذه البطاقة.":"تعذر حفظ الإعداد.";refresh();};
    root.append(title,tabs,preview,controls,note,reset,feedback);
    refresh();
    return root;
  }
  window.AoqatWidgetAppearance={createPanel,load};
})();
