(function(){'use strict';
  // This help page is shared by the web app and the standalone offline APK.
  // Support number: Iraq country code + local WhatsApp number without leading zero.
  const WHATSAPP_NUMBER='9647857994000';
  const MESSAGE='السلام عليكم، أود التواصل بخصوص تطبيق أوقات الصلاة في الحويجة.';

  // The labels below reflect the actual buttons in the app's main settings menu.
  // "example" is a visual illustration only, never a dead clickable button.
  const guides=[
    {icon:'🕌',title:'مواقيت الصلاة',hint:'موعد الصلاة القادمة وبيانات اليوم التالي',
      route:['الواجهة الرئيسية','بيانات التاريخ و الصلاة'],
      steps:['شاهد اسم الصلاة القادمة والوقت المتبقي في الواجهة الرئيسية.','اضغط على «بيانات التاريخ و الصلاة» لعرض مواقيت الصلوات حسب قاعدة بيانات الحويجة.','لمعرفة مواقيت الغد، استخدم خيار «بيانات اليوم التالي» ثم ارجع إلى بيانات اليوم.'],example:'بيانات التاريخ و الصلاة'},
    {icon:'🔊',title:'الأذان والتنبيهات',hint:'اختيار الأذان والصوت لكل صلاة',
      route:['الإعدادات','بيانات الاذان والإقامة','الأذان والتنبيه'],
      steps:['افتح «بيانات الاذان والإقامة» ثم «الأذان والتنبيه».','فعّل الأذان، واختر الصلوات والأصوات ومستوى صوت الأذان حسب رغبتك.','تأكد من صلاحيات الإشعارات وتشغيل المنبهات والعمل بالخلفية، فبعض الهواتف تقيّد الأذان عند قفل الشاشة.'],example:'الأذان والتنبيه'},
    {icon:'⏰',title:'منبّه مواقيت الصلاة',hint:'التنبيه والغفوة والتكرار',
      route:['بيانات الاذان والإقامة','منبه مواقيت الصلاة'],
      steps:['افتح إعدادات المنبه وفعّل الزر الرئيسي أولاً.','حدّد الصلوات التي تريد تشغيل المنبه لها، ثم اضبط خيارات الغفوة والتكرار المتاحة.','اسمح للتطبيق بالمنبهات الدقيقة وإشعارات شاشة القفل حتى يصل التنبيه في موعده.'],example:'منبّه مواقيت الصلاة'},
    {icon:'⏳',title:'الإقامة ووضع الصامت',hint:'العد التنازلي والصامت بعد الإقامة',
      route:['بيانات الاذان والإقامة','أوقات الإقامة','تفعيل وضع صامت بعد الإقامة'],
      steps:['حدّد مدة «باقي على الإقامة» لكل صلاة من إعدادات الإقامة.','عندما يصل العد إلى 00:00 يبدأ وقت «مضى على الإقامة».','إذا فعّلت «وضع صامت بعد الإقامة»، يطلب التطبيق جعل رنين الهاتف صامتاً للمدة التي اخترتها، ثم استعادة وضعه السابق. يحتاج ذلك صلاحية التحكم بأوضاع الصوت والمنبهات الدقيقة في أندرويد.'],example:'تفعيل وضع صامت بعد الإقامة',
      note:'جدول «عدم الإزعاج» الذي يضبطه صاحب الهاتف مستقل عن مدة الصامت الخاصة بالإقامة.'},
    {icon:'📖',title:'القرآن الكريم',hint:'القراءة والتقليب والعلامات المرجعية',
      route:['الإعدادات','القرآن الكريم'],
      steps:['افتح «القرآن الكريم» للدخول مباشرة إلى المصحف.','اسحب لتقليب الصفحات، واضغط على الصفحة لإظهار أو إخفاء أدوات القراءة.','اضغط مطولاً على الآية لإضافة علامة مرجعية؛ ويمكنك الرجوع إلى علاماتك وصفحتك الأخيرة.'],example:'القرآن الكريم'},
    {icon:'📅',title:'التقاويم السنوية',hint:'الشهور والتنسيق وحفظ التقويم',
      route:['الإعدادات','التقاويم'],
      steps:['افتح «التقاويم» واختر الشهر والسنة المطلوبين.','اضبط خيارات التنسيق المتاحة مثل ألوان العنوان والخلفية وحجم الخط.','استخدم خيار حفظ أو مشاركة صورة التقويم بعد مراجعة المعاينة.'],example:'التقاويم'},
    {icon:'🌿',title:'حقيبة المسلم',hint:'الأذكار وسنن الجمعة وصيام التطوع',
      route:['الإعدادات','حقيبة المسلم'],
      steps:['افتح «حقيبة المسلم» ثم اختر القسم الذي يناسبك.','في الأذكار يمكنك متابعة أذكار الصباح والمساء وغيرها.','تحكم في تنبيهات سنن يوم الجمعة وصيام التطوع من إعدادات كل قسم.'],example:'حقيبة المسلم'},
    {icon:'🧭',title:'اتجاه القبلة',hint:'معرفة الاتجاه من بوصلة الهاتف',
      route:['الإعدادات','اتجاه القبلة'],
      steps:['افتح «اتجاه القبلة» من القائمة.','امنح الأذونات التي يطلبها الهاتف إذا احتاجت البوصلة ذلك.','أبعد الهاتف عن المعادن والمغناطيسات، وحرّكه بلطف لمعايرة المستشعر إذا بدا الاتجاه غير ثابت.'],example:'اتجاه القبلة'},
    {icon:'🛠️',title:'حل المشكلات الشائعة',hint:'الأذان والصامت والتنبيه والخدمات الخلفية',
      route:['الإعدادات','بيانات الاذان والإقامة'],
      steps:['إذا ما ظهر الأذان أو المنبه: تأكد من تفعيل الخدمة والصلوات المطلوبة ووجود صوت في الهاتف.','إذا تأخر التنبيه: افحص صلاحيات الإشعارات والمنبهات الدقيقة والعمل بالخلفية وإعدادات توفير البطارية.','إذا ما اشتغل الصامت بعد الإقامة: افتح إعدادات الصامت وراجع معلومات حالته وآخر محاولة تنفيذ، ثم استخدم «تواصل معنا» لإرسال تفاصيل المشكلة.'],example:'بيانات الاذان والإقامة'}
  ];

  function el(tag,text,cls){
    const node=document.createElement(tag);
    if(text!=null)node.textContent=text;
    if(cls)node.className=cls;
    return node;
  }
  function css(){
    if(document.getElementById('aoqatHelpStyle'))return;
    const style=el('style');style.id='aoqatHelpStyle';
    style.textContent=[
      '.aoqat-help{direction:rtl;text-align:right;line-height:1.65;color:#243d32;max-width:720px;margin:0 auto;padding:12px 12px 26px;font-family:inherit;box-sizing:border-box}',
      '.aoqat-help *{box-sizing:border-box}',
      '.aoqat-help .ah-hero{background:linear-gradient(130deg,#fffef9,#f7ecd0);border:1px solid #d6c59f;border-right:4px solid #b58d3c;border-radius:16px;padding:15px 16px;margin:0 0 15px;box-shadow:0 3px 12px #3526110a}',
      '.aoqat-help .ah-eyebrow{display:block;color:#806121;font-size:12px;font-weight:800;letter-spacing:.25px;margin-bottom:4px}',
      '.aoqat-help .ah-hero h3{font-size:21px;line-height:1.4;margin:0 0 7px;color:#175443;font-weight:800}',
      '.aoqat-help .ah-hero p{font-size:14px;margin:0;color:#526359}',
      '.aoqat-help .ah-list{display:grid;gap:9px;margin:0}',
      '.aoqat-help .ah-nav-row{display:flex;align-items:center;text-align:right;gap:12px;width:100%;min-height:74px;padding:12px;border-radius:13px;border:1px solid #d9cbaa;background:linear-gradient(95deg,#fffdf7,#f8efdc);font:inherit;color:#243d32;cursor:pointer;box-shadow:0 2px 6px #49391608}',
      '.aoqat-help .ah-nav-row:active{background:#f1e5c6;transform:translateY(1px)}',
      '.aoqat-help .ah-icon{display:flex;align-items:center;justify-content:center;flex:0 0 46px;width:46px;height:46px;background:#fff9e9;border:1px solid #d8c69b;border-radius:12px;font-size:25px}',
      '.aoqat-help .ah-labels{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.aoqat-help .ah-row-title{display:block;font-size:16px;font-weight:800;color:#1d5847}',
      '.aoqat-help .ah-sub{display:block;font-size:12px;color:#637267;line-height:1.5}',
      '.aoqat-help .ah-arrow{color:#ac8339;font-size:24px;font-weight:700;flex:0 0 16px;line-height:1}',
      '.aoqat-help button:focus-visible,.aoqat-help summary:focus-visible{outline:3px solid #c69a49;outline-offset:3px}',
      '.aoqat-help .ah-section{margin:0 0 9px;background:#fffcf5;border:1px solid #d9cbaa;border-radius:13px;overflow:hidden;box-shadow:0 2px 6px #49391608}',
      '.aoqat-help .ah-section[open]{border-color:#b99d62;box-shadow:0 4px 12px #49391614}',
      '.aoqat-help .ah-section summary{display:flex;gap:12px;align-items:center;cursor:pointer;min-height:72px;padding:11px 12px;list-style:none;background:linear-gradient(95deg,#fffdf7,#f8efdc)}',
      '.aoqat-help .ah-section summary::-webkit-details-marker{display:none}',
      '.aoqat-help .ah-section[open] summary{border-bottom:1px solid #e5d6b6}',
      '.aoqat-help .ah-section[open] .ah-arrow{transform:rotate(-90deg)}',
      '.aoqat-help .ah-steps{padding:13px 14px 15px;display:grid;gap:11px;background:#fffdf7}',
      '.aoqat-help .ah-route{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:9px 10px;background:#f6f0df;border-radius:10px;border:1px solid #e5d6b6;font-size:12px;color:#4b594b}',
      '.aoqat-help .ah-route-name{font-weight:800;color:#235a47}',
      '.aoqat-help .ah-step{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#2e4337;line-height:1.8}',
      '.aoqat-help .ah-step-num{display:flex;align-items:center;justify-content:center;flex:0 0 26px;height:26px;margin-top:1px;border-radius:50%;border:1px solid #d7bb7b;color:#7f591a;background:#f7eac9;font-weight:800;font-size:13px}',
      '.aoqat-help .ah-demo-label{color:#665d48;font-size:12px;margin-bottom:5px;font-weight:700}',
      '.aoqat-help .ah-example{display:flex;align-items:center;gap:12px;max-width:100%;border-radius:11px;background:linear-gradient(95deg,#f7efd9,#fff9ee);border:1px solid #dbca9f;padding:11px 14px;font-size:15px;color:#3f3425;font-weight:700}',
      '.aoqat-help .ah-example-icon{font-size:21px;width:30px;text-align:center}',
      '.aoqat-help .ah-note{background:#f7f0dd;color:#675128;padding:11px 12px;border-right:3px solid #b58d3c;border-radius:9px;font-size:13px;margin:6px 0 0;line-height:1.8}',
      '.aoqat-help .ah-contact{background:#fffdf6;border:1px solid #dfceab;border-radius:13px;padding:16px;margin:0 0 14px}',
      '.aoqat-help .ah-contact-number{direction:ltr;text-align:right;unicode-bidi:plaintext;font-size:18px;font-weight:800;color:#1c5948;letter-spacing:.2px}',
      '.aoqat-help .ah-button{min-height:52px;width:100%;padding:12px 15px;border-radius:12px;background:#176e5c;color:white;border:1px solid #175f50;font:inherit;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 9px #176e5c18}',
      '.aoqat-help .ah-button:disabled{background:#899991;border-color:#899991;cursor:default}',
      '.aoqat-help .ah-muted{font-size:13px;color:#637267;margin:9px 0 0;line-height:1.8}',
      '@media(max-width:360px){.aoqat-help{padding:9px 8px 18px}.aoqat-help .ah-nav-row,.aoqat-help .ah-section summary{gap:9px;padding:10px}.aoqat-help .ah-icon{flex-basis:40px;width:40px;height:40px;font-size:23px}.aoqat-help .ah-row-title{font-size:15px}}'
    ].join('');
    document.head.append(style);
  }
  function hero(title,desc,eyebrow){
    css();
    const view=el('section',null,'aoqat-help');view.dir='rtl';
    const top=el('div',null,'ah-hero');
    top.append(el('span',eyebrow||'دليل أوقات الصلاة في الحويجة','ah-eyebrow'),el('h3',title),el('p',desc));
    view.append(top);
    return view;
  }
  function navRow(icon,title,desc,open){
    const button=el('button',null,'ah-nav-row');button.type='button';
    const labels=el('span',null,'ah-labels');
    labels.append(el('span',title,'ah-row-title'),el('span',desc,'ah-sub'));
    button.append(el('span',icon,'ah-icon'),labels,el('span','‹','ah-arrow'));
    button.onclick=open;
    return button;
  }
  function home(go){
    const view=hero('المساعدة والتواصل','دليل واضح لخدمات التطبيق، وطريقة التواصل مع فريق الدعم.');
    const list=el('div',null,'ah-list');
    list.append(
      navRow('📖','شرح استخدام التطبيق','خطوات مبسّطة مع أشكال الأزرار',()=>go('guide')),
      navRow('💬','تواصل معنا عبر واتساب','الاستفسارات والملاحظات والمقترحات',()=>go('contact'))
    );
    view.append(list);
    return view;
  }
  function guide(){
    const view=hero('شرح استخدام التطبيق','اختر أي قسم لعرض خطوات استخدامه. جميع الشروحات متاحة دون إنترنت.');
    for(const item of guides){
      const section=el('details',null,'ah-section');
      const summary=el('summary');
      const labels=el('span',null,'ah-labels');
      labels.append(el('span',item.title,'ah-row-title'),el('span',item.hint,'ah-sub'));
      summary.append(el('span',item.icon,'ah-icon'),labels,el('span','‹','ah-arrow'));
      const body=el('div',null,'ah-steps');
      const route=el('div',null,'ah-route');
      route.append(el('span','المسار: ','ah-route-name'));
      item.route.forEach((part,i)=>{
        if(i)route.append(el('span','‹','ah-route-separator'));
        route.append(el('span',part));
      });
      body.append(route);
      item.steps.forEach((text,i)=>{
        const row=el('div',null,'ah-step');
        row.append(el('span',String(i+1),'ah-step-num'),el('span',text));
        body.append(row);
      });
      const exampleWrap=el('div');
      exampleWrap.append(el('div','شكل الزر داخل التطبيق (للتوضيح):','ah-demo-label'));
      const example=el('div',null,'ah-example');
      example.setAttribute('aria-label','شكل توضيحي للزر: '+item.example);
      example.append(el('span',item.icon,'ah-example-icon'),el('span',item.example));
      exampleWrap.append(example);body.append(exampleWrap);
      if(item.note)body.append(el('p',item.note,'ah-note'));
      section.append(summary,body);
      view.append(section);
    }
    view.append(el('p','ملاحظة: تعتمد المواقيت على قاعدة بيانات المشروع، وقد تتأثر التنبيهات بإعدادات النظام والصلاحيات وتوفير البطارية.','ah-note'));
    return view;
  }
  function contact(){
    const view=hero('تواصل معنا','للاستفسارات أو الإبلاغ عن مشكلة أو مشاركة اقتراح بخصوص التطبيق.');
    const card=el('div',null,'ah-contact');
    card.append(el('div','رقم الدعم عبر واتساب','ah-demo-label'),el('div','+964 785 799 4000','ah-contact-number'));
    view.append(card);
    const digits=WHATSAPP_NUMBER.replace(/\D/g,'');
    const valid=/^[1-9]\d{7,14}$/.test(digits);
    const button=el('button',valid?'💬 فتح محادثة واتساب':'💬 واتساب غير متاح حالياً','ah-button');
    button.type='button';button.disabled=!valid;
    if(valid)button.onclick=()=>{
      const url='https://wa.me/'+digits+'?text='+encodeURIComponent(MESSAGE);
      if(typeof window.AndroidNative?.openSupportWhatsApp==='function')
        window.AndroidNative.openSupportWhatsApp(url);
      else window.open(url,'_blank','noopener,noreferrer');
    };
    view.append(button);
    view.append(el('p','يحتاج فتح محادثة واتساب إلى اتصال بالإنترنت. شرح التطبيق نفسه يعمل دون إنترنت.','ah-muted'));
    return view;
  }
  window.AoqatHelpSupport={home,guide,contact};
})();