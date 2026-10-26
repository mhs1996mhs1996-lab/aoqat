(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;
 const C=window.AoqatMonthlyCalendarsCore,R=window.AoqatMonthlyCalendarRenderer,KEY='aoqatMonthlyCalendarsV1',SENT='aoqatMonthlyCalendarsSentV1';if(!C||!R)return;
 const $=id=>document.getElementById(id);let sequence=0,backAction=null,fallbackNotification=null;
 function read(){try{return C.normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){return C.defaults();}}
 function save(s){const value=C.normalize(s);localStorage.setItem(KEY,JSON.stringify(value));return value;}
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='main-action';b.textContent=label;b.onclick=fn;return b;};
 function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
 function label(name,input){const e=document.createElement('label');e.append(text('span',name),input);return e;}
 function show(title,back){if($('adhanServicesDialog')&&!$('adhanServicesDialog').hidden)$('adhanServicesBack')?.click();sequence++;const page=document.createElement('section');page.id='monthlyCalendars';page.className='mc-page';backAction=back;window.AoqatWebSettingsNavigation.sub(title,page,'main');return page;}
 function rawRows(){return typeof availablePrayerRows==='function'?availablePrayerRows(false):window.AoqatPrayerBackupRows||[];}
 function model(year,month){const m=C.build(year,month,rawRows());if(m.missing.length)throw Error('مواقيت غير متاحة للأيام: '+m.missing.join('، ')+'. لا يمكن مشاركة تقويم ناقص.');return m;}
 function current(){return C.baghdad(new Date());}
 function open(){const p=show('التقاويم',null),now=current(),s=read();p.classList.add('mc-home');window.aoqatMountDailyCalendar?.(p);p.append(text('h3','التقاويم الشهرية'),text('p','اختر السنة ثم الشهر للمعاينة والمشاركة.'));
  const actions=document.createElement('div');actions.className='mc-actions';actions.append(button('تغيير التصميم',()=>designs(now.year,now.month,open)),button('تنسيق الخط للتقويم',()=>format(now.year,now.month,open)),button('تنبيه نشر تقويم الشهر',reminder));p.append(actions);
  const years=[...new Set([...Array.from({length:5},(_,i)=>now.year+i),...s.years])].sort((a,b)=>a-b),grid=document.createElement('div');grid.className='mc-years';for(const year of years){const b=button('📁 '+year+' م',()=>yearView(year));b.dataset.calendarYear=year;b.append(text('small','12 تقويماً شهرياً'));grid.append(b);}p.append(grid);
  const form=document.createElement('form');form.className='mc-add-year';const input=document.createElement('input');input.type='number';input.min='2026';input.max='2200';input.step='1';input.value=now.year+5;input.setAttribute('aria-label','سنة تقاويم إضافية');const add=button('فتح سنة أخرى',()=>{});add.type='submit';form.append(label('السنة الميلادية',input),add);form.onsubmit=e=>{e.preventDefault();if(!input.reportValidity()||!input.value)return;const year=Number(input.value),settings=read();settings.years.push(year);save(settings);yearView(year);};p.append(form);
 }
 function yearView(year){
  const p=show('تقاويم سنة '+year,open),token=sequence;
  p.classList.add('mc-year-view','mc-year-v5');
  const themes=[
    {id:'luxgrid',name:'1 الشبكة الفاخرة',desc:'شبكة بطاقات مذهبة مع البحث'},
    {id:'arch',name:'2 الشرائح الأنيقة',desc:'قوس إسلامي وفوانيس وتنقل بالسحب'},
    {id:'modernlist',name:'3 القائمة الحديثة',desc:'قائمة بيضاء مصغرة لكل شهر'},
    {id:'seasons',name:'4 الخلفيات الشهرية',desc:'مناظر طبيعية موسمية مختلفة'},
    {id:'colorcards',name:'5 البطاقات الملونة',desc:'أرقام سداسية وألوان متدرجة'},
    {id:'timeline',name:'6 الخط الزمني',desc:'بطاقات متتابعة مع خط زمني'},
    {id:'shelf',name:'7 الرف الجميل',desc:'رف خشبي مع التقاويم ككتب'},
    {id:'flip',name:'8 التقويم التفاعلي',desc:'تقويم معلّق بحلقات مع تقليب'},
    {id:'circles',name:'9 الدوائر العصرية',desc:'دوائر أنيقة بصور الأشهر'},
    {id:'fullscreen',name:'10 العرض الكامل',desc:'إطار مصوّر وشريط معاينات'}
  ];

  // Decorative SVG illustrations are self-contained: no remote image requests and no effect on calendar data.
  const illustration=(kind,n=1)=>{
    const winter=n<=2||n===12, spring=n>=3&&n<=5, summer=n>=6&&n<=8;
    const sky=winter?['#a4d4ee','#e3f2fa']:spring?['#b9dbed','#ffe2c7']:summer?['#67c9df','#f7d7a4']:['#f7b58b','#e7d7b9'];
    const svgStart='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="'+sky[0]+'"/><stop offset="1" stop-color="'+sky[1]+'"/></linearGradient><linearGradient id="g" x2="0" y2="1"><stop stop-color="#1b7467"/><stop offset="1" stop-color="#062e34"/></linearGradient></defs>';
    let art='';
    if(kind==='seasons'){
      art='<rect width="400" height="520" fill="url(#s)"/><circle cx="300" cy="88" r="45" fill="#fff1b5" opacity=".9"/>';
      if(winter)art+='<path d="M-30 345L105 120 180 255 254 94 440 351Z" fill="#759cb1"/><path d="M54 209L105 120 156 213 130 199 110 182 91 201ZM207 169L254 94 309 190 278 178 254 151 232 184Z" fill="#fff9f1"/><path d="M0 360Q150 310 400 360V520H0" fill="#2f6279"/>';
      else if(spring)art+='<path d="M0 365Q95 280 200 340T400 325V520H0" fill="#74a879"/><path d="M0 435Q170 310 400 430V520H0" fill="#377a68"/><path d="M68 405V270M325 404V254" stroke="#624b40" stroke-width="13"/><g fill="#f4b4c9"><circle cx="65" cy="263" r="52"/><circle cx="330" cy="251" r="55"/><circle cx="102" cy="292" r="31"/></g>';
      else if(summer)art+='<path d="M0 340Q140 300 400 338V520H0" fill="#128eab"/><path d="M0 435Q180 390 400 422V520H0" fill="#e6d49e"/><path d="M315 410Q290 285 305 202" stroke="#795b35" stroke-width="17" fill="none"/><g stroke="#2d8562" stroke-width="16" stroke-linecap="round"><path d="M305 208Q240 154 177 184M305 208Q355 143 415 174M305 208Q263 124 272 105M305 208Q366 196 395 241"/></g>';
      else art+='<path d="M0 370Q100 290 230 340T400 306V520H0" fill="#b28e68"/><path d="M0 430Q220 345 400 420V520H0" fill="#587b63"/><path d="M96 405V242M290 398V210" stroke="#6b5341" stroke-width="12"/><g fill="#d7a453"><circle cx="98" cy="240" r="52"/><circle cx="285" cy="207" r="59"/></g>';
      art+='<path d="M0 505Q150 458 400 501" fill="none" stroke="#fff7e0" stroke-width="3" opacity=".55"/>';
    }else if(kind==='arch'){
      art='<rect width="400" height="520" fill="#073f40"/><path d="M20 520V180Q200 -95 380 180V520" fill="#19685e" stroke="#e6cb88" stroke-width="8"/><path d="M36 520V185Q200 -58 364 185V520" fill="none" stroke="#e4c88c" stroke-width="2"/><g stroke="#d5b16d" stroke-width="2" fill="none" opacity=".35"><path d="M0 360Q200 200 400 360M0 420Q200 260 400 420"/></g><g stroke="#d5b16d" stroke-width="2"><path d="M58 0V90M342 0V90"/></g><g fill="#edca7b" stroke="#fce9b1" stroke-width="3"><path d="M37 91H79L72 143H44Z"/><path d="M321 91H363L356 143H328Z"/></g><g fill="#ffedaa" opacity=".65"><ellipse cx="58" cy="119" rx="36" ry="55"/><ellipse cx="342" cy="119" rx="36" ry="55"/></g>';
    }else if(kind==='shelf'){
      art='<rect width="400" height="520" fill="#2b1a12"/><g fill="#674026" stroke="#b18450" stroke-width="3">';
      for(let y=128;y<540;y+=128)art+='<rect x="0" y="'+y+'" width="400" height="19" rx="3"/><rect x="0" y="'+(y+18)+'" width="400" height="8" fill="#26170f"/>';
      art+='</g><path d="M16 0V520M384 0V520" stroke="#b37e45" stroke-width="14"/><g fill="#f5c76c"><circle cx="40" cy="24" r="4"/><circle cx="360" cy="24" r="4"/></g>';
    }else if(kind==='fullscreen'){
      art='<rect width="400" height="520" fill="url(#s)"/><circle cx="322" cy="72" r="42" fill="#ffe0a0"/><path d="M0 390Q170 330 400 390V520H0" fill="#149db1"/><path d="M0 470Q220 398 400 466V520H0" fill="#eddaa8"/><path d="M40 520Q95 385 80 260" stroke="#725339" stroke-width="16" fill="none"/><g stroke="#367e59" stroke-width="16" stroke-linecap="round"><path d="M80 262Q18 207 -20 228M80 262Q123 194 191 204M80 262Q70 191 40 170"/></g><path d="M205 450V320L235 295V450M270 450V335L299 312V450" fill="#f8edcf" opacity=".55"/>';
    }else if(kind==='flip'){
      art='<rect width="400" height="520" fill="#0c5b56"/><g fill="#fff5d9" opacity=".15"><circle cx="50" cy="70" r="30"/><circle cx="350" cy="110" r="46"/></g><path d="M0 520Q200 445 400 520" fill="#d8b873" opacity=".25"/>';
    }
    return 'url("data:image/svg+xml,'+encodeURIComponent(svgStart+art+'</svg>')+'")';
  };
  const storageKey='aoqatYearGalleryStylesV5';
  let settings={};try{settings=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch(_){}
  let enabled=Array.isArray(settings.enabled)?settings.enabled.filter(id=>themes.some(t=>t.id===id)):themes.map(t=>t.id);
  // New presets should also appear for people who previously enabled all seven presets.
  if(Array.isArray(settings.enabled)&&settings.enabled.length===7&&['modernlist','timeline','circles'].every(id=>!settings.enabled.includes(id)))enabled=themes.map(t=>t.id);
  if(!enabled.length)enabled=themes.map(t=>t.id);
  let active=enabled.includes(settings.active)?settings.active:enabled[0],focused=1,search='';
  const saveStyles=()=>{try{localStorage.setItem(storageKey,JSON.stringify({enabled,active}));}catch(_){}};
  const intro=text('p','اختر الشهر لعرض تصاميمه وحفظه أو مشاركته.');
  const toggleThemes=button('☷ تغيير نمط العرض',()=>{const open=toolbar.dataset.expanded!=='true';toolbar.dataset.expanded=String(open);toggleThemes.setAttribute('aria-expanded',String(open));});toggleThemes.className='mc-theme-toggle';toggleThemes.setAttribute('aria-expanded','false');
  const toolbar=document.createElement('div');toolbar.className='mc-year-themes';
  const choices=document.createElement('div');choices.className='mc-year-theme-choices';
  const manage=button('⚙ الأنماط',()=>{manager.hidden=!manager.hidden;manage.setAttribute('aria-expanded',String(!manager.hidden));});
  manage.classList.add('mc-theme-manage');manage.setAttribute('aria-expanded','false');
  const manager=document.createElement('div');manager.className='mc-year-theme-manager';manager.hidden=true;
  const currentTheme=text('div','');currentTheme.className='mc-current-theme';currentTheme.setAttribute('role','status');
  const stage=document.createElement('div');stage.className='mc-gallery-stage';
  const scene=document.createElement('div');scene.className='mc-scene';scene.setAttribute('aria-hidden','true');
  const decoration=document.createElement('div');decoration.className='mc-decor';decoration.setAttribute('aria-hidden','true');scene.append(decoration);
  const grid=document.createElement('div');grid.className='mc-months';grid.setAttribute('aria-label','أشهر السنة');
  const searchBar=document.createElement('div');searchBar.className='mc-gallery-search';
  const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='ابحث عن شهر...';searchInput.setAttribute('aria-label','ابحث عن شهر');
  searchInput.oninput=()=>{search=searchInput.value.trim();filterMonths();};
  searchBar.append(searchInput);
  const monthNav=document.createElement('div');monthNav.className='mc-month-nav';
  const previous=button('❮',()=>focusMonth(focused-1));previous.setAttribute('aria-label','الشهر السابق');
  const next=button('❯',()=>focusMonth(focused+1));next.setAttribute('aria-label','الشهر التالي');
  const navNumbers=document.createElement('div');navNumbers.className='mc-month-nav-numbers';
  for(let month=1;month<=12;month++){
    const b=button(String(month).padStart(2,'0'),()=>focusMonth(month));b.setAttribute('aria-label',C.months[month-1]);
    const thumb=document.createElement('img');thumb.alt='';thumb.loading='lazy';b.append(thumb);
    navNumbers.append(b);
  }
  monthNav.append(previous,navNumbers,next);
  const filterMonths=()=>{
    grid.querySelectorAll('[data-calendar-month]').forEach(el=>{
      const n=Number(el.dataset.calendarMonth);
      el.hidden=!!search&&!C.months[n-1].includes(search)&&!String(n).includes(search);
    });
  };
  const focusMonth=n=>{
    focused=(n+11)%12+1;
    stage.style.setProperty('--mc-scene-art',illustration(active,focused));
    grid.querySelectorAll('[data-calendar-month]').forEach(el=>el.classList.toggle('mc-featured',Number(el.dataset.calendarMonth)===focused));
    Array.from(navNumbers.children).forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===focused)));
    const selected=navNumbers.children[focused-1];
    if(selected&&monthNav.contains(selected)){navNumbers.scrollTo({left:selected.offsetLeft-navNumbers.offsetLeft-navNumbers.clientWidth/2+selected.clientWidth/2,behavior:'smooth'});}
  };
  const paint=()=>{
    p.dataset.galleryTheme=active;
    decoration.textContent='';
    stage.style.setProperty('--mc-scene-art',illustration(active,focused));
    // Explicit, gallery-owned paint for the reference's dark emerald month cards.
    // The hosting app has highly specific button/theme styles; setting these on
    // the isolated annual gallery is safer than affecting the other nine templates.
    grid.querySelectorAll('[data-calendar-month]').forEach(card=>{
      const isGrid=active==='luxgrid';
      const set=(el,property,value)=>el.style.setProperty(property,value,'important');
      if(isGrid){
        set(card,'background','linear-gradient(150deg,#073c3d,#07534b)');
        set(card,'background-image','linear-gradient(150deg,#073c3d,#07534b)');
        set(card,'color','#fff9e9');set(card,'border','1px solid #c8a76b');
        set(card,'border-radius','9px');set(card,'box-shadow','none');
        const title=card.querySelector('.mc-month-info strong');
        if(title)set(title,'color','#fff9e9');
        const date=card.querySelector('.mc-month-info small');
        if(date)set(date,'color','#dbcba0');
      }else{
        for(const key of ['background','background-image','color','border','border-radius','box-shadow'])card.style.removeProperty(key);
        for(const el of card.querySelectorAll('.mc-month-info strong,.mc-month-info small'))el.style.removeProperty('color');
      }
    });
    const chosen=themes.find(t=>t.id===active);
    currentTheme.textContent='✓ '+chosen.name+' — '+chosen.desc;
    choices.replaceChildren();
    for(const theme of themes.filter(t=>enabled.includes(t.id))){
      const b=button((active===theme.id?'✓ ':'')+theme.name,()=>{
        active=theme.id;search='';searchInput.value='';filterMonths();saveStyles();paint();focusMonth(focused);
      });
      b.classList.add('mc-theme-option');b.setAttribute('aria-pressed',String(active===theme.id));
      choices.append(b);
    }
    manager.replaceChildren(text('p','أخفِ الأنماط غير المرغوبة ويمكنك إعادتها بأي وقت.'));
    for(const theme of themes){
      const line=document.createElement('label');line.className='mc-theme-check';
      const check=document.createElement('input');check.type='checkbox';check.checked=enabled.includes(theme.id);
      check.onchange=()=>{
        if(!check.checked&&enabled.length===1){check.checked=true;return;}
        enabled=check.checked?[...enabled,theme.id]:enabled.filter(id=>id!==theme.id);
        if(!enabled.includes(active))active=enabled[0];
        saveStyles();paint();focusMonth(focused);
      };
      line.append(check,text('span',theme.name+' — '+theme.desc));manager.append(line);
    }
    manager.append(button('إظهار جميع الأنماط',()=>{enabled=themes.map(t=>t.id);saveStyles();paint();}));
    monthNav.hidden=!['arch','flip','fullscreen'].includes(active);
    searchBar.hidden=active!=='luxgrid';
  };
  toolbar.append(choices,manage);stage.append(scene,searchBar,grid,monthNav);
  p.append(toggleThemes,toolbar,currentTheme,manager,stage);
  // The annual gallery uses its own consistent navy/gold preview, independent of
  // the user's editable monthly template and palette. Opening a month still uses
  // the original saved settings, so no monthly design/export behavior is changed.
  const galleryPreviewSettings=C.designDefaults('navy-gold');
  for(let month=1;month<=12;month++){
    const b=button('',()=>preview(year,month)),img=document.createElement('img');
    img.alt='تقويم '+C.months[month-1]+' '+year;img.loading='lazy';b.dataset.calendarMonth=month;
    const art=document.createElement('span');art.className='mc-month-art';art.append(img);
    const info=document.createElement('span');info.className='mc-month-info';
    const num=text('span',String(month).padStart(2,'0'));num.className='mc-month-number';
    info.append(num,text('strong',C.months[month-1]),text('small',year+' / '+String(month).padStart(2,'0')),text('em','فتح التقويم ›'));
    b.append(art,info);b.style.setProperty('--mc-month-landscape',illustration('seasons',month));grid.append(b);
  }
  let startX=0,startY=0;
  stage.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;},{passive:true});
  stage.addEventListener('touchend',e=>{
    if(!['arch','flip','fullscreen'].includes(active)||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)focusMonth(focused+(dx>0?1:-1));
  },{passive:true});
  paint();focusMonth(1);
  (async()=>{for(let month=1;month<=12;month++){
    if(token!==sequence||!p.isConnected)return;
    const b=grid.querySelector('[data-calendar-month="'+month+'"]');
    try{
      const canvas=await R.render(model(year,month),galleryPreviewSettings,.25);
      if(token!==sequence||!p.isConnected)return;
      const src=canvas.toDataURL('image/png');
      b.querySelector('img').src=src;
      navNumbers.children[month-1].querySelector('img').src=src;
    }catch(e){b.append(text('small',e.message));}
  }})();
 }
 function preview(year,month){const p=show(C.months[month-1]+' '+year,()=>yearView(year)),token=sequence,actions=document.createElement('div'),img=document.createElement('img'),status=text('p','جاري تجهيز التقويم…');let file,url,sharing=false;actions.className='mc-actions';img.className='mc-preview';img.alt='مواقيت الصلاة لمدينة الحويجة وضواحيها لشهر '+C.months[month-1]+' '+year;const share=button('مشاركة التقويم',async()=>{if(!file||sharing)return;sharing=true;share.disabled=true;try{await navigator.share({files:[file],title:img.alt});status.textContent='التقويم جاهز للمشاركة والحفظ.';}catch(e){status.textContent=e.name==='AbortError'?'تم إلغاء المشاركة.':'تعذرت المشاركة؛ يمكنك حفظ الصورة ومشاركتها من الصور.';}finally{sharing=false;share.disabled=false;}}),download=button('حفظ الصورة على الهاتف',()=>{if(!file||!url)return;const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();status.textContent='تم طلب حفظ صورة التقويم.';});share.disabled=download.disabled=true;actions.append(share,download,button('تغيير التصميم',()=>designs(year,month,()=>preview(year,month))),button('تنسيق الخط للتقويم',()=>format(year,month,()=>preview(year,month))));const chosen=C.designs.find(d=>d.id===read().design);p.append(actions,text('small','التصميم '+chosen.number+' — '+chosen.name),img,status);status.setAttribute('role','status');
  let activeUrl;const release=()=>{if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null;}};const observer=new MutationObserver(()=>{if(!p.isConnected){release();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
  (async()=>{try{const canvas=await R.render(model(year,month),read()),blob=await R.blob(canvas);if(token!==sequence||!p.isConnected)return;file=new File([blob],'aoqat-hawija-'+year+'-'+String(month).padStart(2,'0')+'.png',{type:'image/png'});activeUrl=url=URL.createObjectURL(blob);img.src=url;download.disabled=false;const can=!!navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}));share.hidden=!can;share.disabled=!can;status.textContent=can?'الصورة جاهزة للمشاركة والحفظ.':'الصورة جاهزة للحفظ؛ المشاركة المباشرة غير متاحة في هذا المتصفح.';}catch(e){if(p.isConnected)status.textContent=e.message||'تعذر تجهيز التقويم.';}})();
 }
 function designs(year,month,back=open){const p=show('تغيير التصميم',back),token=sequence,grid=document.createElement('div');grid.className='mc-designs';p.append(text('p','اختر تصميم التقويم بألوانه الجاهزة. يمكنك تعديل الخط والألوان لاحقاً، والمواقيت لا تتغير.'),grid);let s=read();const cards=[];for(const design of C.designs){const b=button('',()=>{s=read();const preset=C.designDefaults(design.id);if(!['navy-gold','iraqi-paper','minimal-modern','islamic-corners'].includes(design.id))for(const id of Object.keys(C.groups))preset.styles[id]={...preset.styles[id],font:s.styles[id].font,size:s.styles[id].size};s=save({...preset,design:design.id,reminder:s.reminder,years:s.years});designs(year,month,back);}),img=document.createElement('img'),name=text('strong','');b.dataset.calendarDesign=design.id;img.alt='التصميم '+design.number+' — '+design.name;b.append(img,name);grid.append(b);cards.push({b,img,name,design});}function paint(){for(const {b,name,design} of cards){const active=s.design===design.id;b.dataset.enabled=String(active);b.setAttribute('aria-pressed',String(active));name.textContent=(active?'✓ ':'')+'التصميم '+design.number+' — '+design.name;}}paint();(async()=>{for(const {img,design} of cards){try{const canvas=await R.render(model(year,month),design.id===s.design?s:{...C.designDefaults(design.id),styles:Object.fromEntries(Object.entries(C.designDefaults(design.id).styles).map(([id,v])=>[id,{...v,font:['navy-gold','iraqi-paper','minimal-modern','islamic-corners'].includes(design.id)?v.font:s.styles[id].font,size:['navy-gold','iraqi-paper','minimal-modern','islamic-corners'].includes(design.id)?v.size:s.styles[id].size}])),design:design.id},.3);if(token!==sequence||!p.isConnected)return;img.src=canvas.toDataURL('image/png');}catch(e){if(p.isConnected)p.append(text('p',e.message));}}})();}
 function format(year,month,back=open){const p=show('تنسيق الخط للتقويم',back),form=document.createElement('div'),img=document.createElement('img'),status=text('p','');form.className='mc-format';img.className='mc-preview';img.alt='معاينة تنسيق التقويم';status.setAttribute('role','status');let s=read(),drawId=0,timer;
  const group=document.createElement('select');group.id='mcElement';for(const [id,g] of Object.entries(C.groups))group.append(new Option(g.name,id));const font=document.createElement('select');font.id='mcFont';for(const [id,name] of [['Times New Roman','Times New Roman'],['AoqatCalendar','أميري'],['Arial','Arial']])font.append(new Option(name,id));const size=document.createElement('input');size.id='mcFontSize';size.type='number';size.min='16';size.max='64';const color=document.createElement('input');color.id='mcTextColor';color.type='color';const bg=document.createElement('input');bg.id='mcElementBackground';bg.type='color';const pageBg=document.createElement('input');pageBg.id='mcPageBackground';pageBg.type='color';pageBg.value=s.page;const border=document.createElement('input');border.type='color';border.id='mcBorderColor';border.value=s.border;const palette=document.createElement('select');palette.id='mcPalette';palette.append(new Option('اختيار ألوان جاهزة',''));C.palettes.forEach((v,i)=>palette.append(new Option(v.name,String(i))));
  const sizeRange=document.createElement('input');sizeRange.type='range';sizeRange.min='16';sizeRange.max='64';sizeRange.step='1';sizeRange.id='mcFontSizeRange';sizeRange.setAttribute('aria-label','تغيير حجم خط العنصر');const sizeBox=document.createElement('div');sizeBox.className='mc-size-controls';const stepSize=amount=>{size.value=Math.max(16,Math.min(64,Number(size.value||s.styles[group.value].size)+amount));size.dispatchEvent(new Event('input'));};const smaller=button('−',()=>stepSize(-1)),larger=button('+',()=>stepSize(1));smaller.id='mcFontSmaller';larger.id='mcFontLarger';smaller.setAttribute('aria-label','تصغير حجم الخط');larger.setAttribute('aria-label','تكبير حجم الخط');sizeBox.append(smaller,size,larger,sizeRange);sizeRange.oninput=()=>{size.value=sizeRange.value;size.dispatchEvent(new Event('input'));};
  form.append(label('العنصر المراد تنسيقه',group),label('نوع الخط',font),label('حجم الخط',sizeBox),label('لون الخط / النص',color),label('لون خلفية العنصر',bg),label('لون خلفية التقويم',pageBg),label('لون حدود الجدول',border),label('تناسق الألوان',palette));p.append(text('p','التنسيق يخص التقاويم فقط ويُطبّق على جميع الشهور والسنوات. المواقيت لا تتغير. يتوسع الجدول عند تكبير الخط حتى يُطبّق الحجم المختار. يبقى العنوان بسطر واحد ضمن الإطار.'),form,img,status);
  function fill(){const g=s.styles[group.value];font.value=g.font;size.value=g.size;sizeRange.value=g.size;color.value=g.color;bg.value=g.bg;}
  async function draw(){const id=++drawId;try{const canvas=await R.render(model(year,month),s,.65);if(id===drawId&&p.isConnected){img.src=canvas.toDataURL('image/png');const applied=canvas.calendarFontSizes?.[group.value],requested=s.styles[group.value].size;status.textContent=applied&&applied<requested-.5?'التنسيق محفوظ. حجم هذا الجزء المعروض '+Math.round(applied)+' بدلاً من '+requested+' لإبقاء العنوان واسم الشهر بسطر واحد داخل الإطار.':'التنسيق محفوظ تلقائياً. حجم الخط '+requested+'.';}}catch(e){if(p.isConnected)status.textContent=e.message;}}
  function persist(){sizeRange.value=s.styles[group.value].size;s=save(s);status.textContent='جاري تحديث المعاينة…';clearTimeout(timer);timer=setTimeout(draw,100);}
  group.onchange=()=>{fill();status.textContent='تعديل: '+C.groups[group.value].name;};
  const updateStyle=(key,input)=>{const update=()=>{if(key==='size'&&(!input.value||!input.checkValidity())){status.textContent='اختر حجم خط من 16 إلى 64.';return;}s.styles[group.value][key]=key==='size'?Number(input.value):input.value;persist();};input.oninput=update;input.onchange=update;};
  updateStyle('font',font);updateStyle('size',size);updateStyle('color',color);updateStyle('bg',bg);
  for(const [input,key] of [[pageBg,'page'],[border,'border']]){const update=()=>{s[key]=input.value;persist();};input.oninput=update;input.onchange=update;}
  palette.onchange=()=>{if(palette.value==='')return;const base=C.defaults(Number(palette.value));for(const id of Object.keys(C.groups))base.styles[id]={...base.styles[id],font:s.styles[id].font,size:s.styles[id].size};s=save({...base,design:s.design,reminder:s.reminder,years:s.years});pageBg.value=s.page;border.value=s.border;fill();draw();};fill();draw();
  p.append(button('إرجاع تنسيق التقاويم الافتراضي',()=>{s=save({...C.designDefaults(s.design),design:s.design,reminder:s.reminder,years:s.years});pageBg.value=s.page;border.value=s.border;palette.value='';fill();draw();}));
 }
 function reminder(){const p=show('تنبيه نشر تقويم الشهر',open),s=read(),toggle=button('',async()=>{s.reminder.enabled=!s.reminder.enabled;save(s);paint();if(s.reminder.enabled&&typeof Notification!=='undefined'&&Notification.permission==='default')try{await Notification.requestPermission();}catch(_){}if(!s.reminder.enabled)clearReminder();else tick();}),time=document.createElement('input');time.type='time';time.value=s.reminder.time;time.id='mcReminderTime';const info=text('p','يظهر التذكير في آخر يوم من كل شهر لتجهيز تقويم الشهر القادم ومشاركته. لا ينشر تلقائياً.');function paint(){toggle.textContent='تنبيه نهاية الشهر: '+(s.reminder.enabled?'مفعّل':'متوقف');toggle.setAttribute('aria-pressed',String(s.reminder.enabled));toggle.classList.add('mc-toggle');time.disabled=!s.reminder.enabled;}time.onchange=()=>{if(!time.checkValidity()||!time.value)return;s.reminder.time=time.value;save(s);tick();};paint();p.append(toggle,info,label('وقت التنبيه بتوقيت العراق',time),text('p','تنبيه الويب يعمل أثناء تشغيل الصفحة. إذا كانت الصفحة مغلقة بالكامل، يحتاج التنبيه المضمون بالخلفية إلى نسخة Android.'));}
 function openDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})/),now=current();const year=m?Number(m[1]):now.year,month=m?Number(m[2]):now.month;if(year<2026||year>2200||month<1||month>12)return;document.body.classList.add('design-menu-open');preview(year,month);}
 async function clearReminder(){fallbackNotification?.close();fallbackNotification=null;$('monthlyCalendarBanner')?.remove();try{const reg=await navigator.serviceWorker?.getRegistration();const notifications=await reg?.getNotifications();notifications?.filter(n=>n.data?.kind==='calendar-post-reminder').forEach(n=>n.close());}catch(_){}}
 async function deliver(event){const entry=window.AoqatReminderInbox?.add(event);$('monthlyCalendarBanner')?.remove();const banner=document.createElement('aside');banner.id='monthlyCalendarBanner';banner.setAttribute('role','alert');banner.dir='rtl';banner.append(text('strong',event.title),button('معاينة التقويم ومشاركته',()=>{openDate(event.targetDate);banner.remove();}),button('إغلاق',()=>banner.remove()));document.body.append(banner);if(typeof Notification==='undefined'||Notification.permission!=='granted')return;const options={body:event.body,icon:'/assets/icons/app-icon.svg',tag:event.key,data:{kind:'calendar-post-reminder',id:entry?.id,entry,url:'/?calendar='+event.targetDate.slice(0,7)}};try{const reg=await navigator.serviceWorker?.getRegistration();if(!read().reminder.enabled)return;if(reg)await reg.showNotification(event.title,options);else {const n=fallbackNotification=new Notification(event.title,options);n.onclick=()=>{window.focus();openDate(event.targetDate);n.close();};}}catch(_){}}
 function tick(now=new Date()){const event=C.reminderEvent(now,read());if(!event)return;let sent;try{sent=JSON.parse(localStorage.getItem(SENT)||'{}');}catch(_){sent={};}if(!sent||typeof sent!=='object'||Array.isArray(sent))sent={};if(sent[event.key])return;sent[event.key]=+now;for(const key of Object.keys(sent))if(+now-sent[key]>400*86400000)delete sent[key];localStorage.setItem(SENT,JSON.stringify(sent));deliver(event);}
 document.addEventListener('click',e=>{if(!e.target.closest('.web-back'))return;if($('webCalendar')?.dataset.monthlyParent==='true'){e.preventDefault();e.stopImmediatePropagation();open();return;}if(!$('monthlyCalendars')||!backAction)return;e.preventDefault();e.stopImmediatePropagation();backAction();},true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});window.addEventListener('storage',e=>{if(e.key===KEY&&!read().reminder.enabled)clearReminder();});setInterval(()=>tick(),30000);
 window.AoqatCalendars={open,openDate,yearView,preview,format,designs,reminder,read,tick};
 function ready(){if(!window.aoqatUIReady||!window.AoqatWebSettingsNavigation){setTimeout(ready,150);return;}const target=new URLSearchParams(location.search).get('calendar');if(target)openDate(target);tick();}ready();
})();
