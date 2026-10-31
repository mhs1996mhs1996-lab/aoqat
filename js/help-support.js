(function(){'use strict';
  // Support number is set by the app owner; country code without a leading +.
  const WHATSAPP_NUMBER='9647857994000';
  const MESSAGE='السلام عليكم، أود التواصل بخصوص تطبيق أوقات الصلاة في الحويجة.';
  // Keep these labels identical to the app's settings and home buttons.
  const guides=[
    {icon:'🕌',title:'مواقيت الصلاة',hint:'الصلاة القادمة وبيانات اليوم التالي',steps:[
      'افتح الواجهة الرئيسية حتى تشاهد موعد الصلاة القادمة والوقت المتبقي عليها.',
      'تعتمد المواقيت على قاعدة بيانات الصلاة لمدينة الحويجة وضواحيها داخل التطبيق.',
      'من «بيانات التاريخ و الصلاة» تستطيع مراجعة الأوقات، واستخدم خيار «بيانات اليوم التالي» لمشاهدة مواقيت الغد.'
    ]},
    {icon:'🔊',title:'الأذان والتنبيهات',hint:'اختيار صوت الأذان وتشغيل كل صلاة',steps:[
      'ادخل إلى «بيانات الاذان والإقامة»، ثم افتح «الأذان والتنبيه».',
      'فعّل زر الأذان ثم حدد وضع الأذان لكل صلاة والصوت ومستوى الصوت.',
      'من إعدادات الهاتف امنح التطبيق أذونات التنبيهات والمنبّه والعمل في الخلفية. إشعار الصلاة ومنبّه الصلاة إعدادان مستقلان عن الأذان.'
    ]},
    {icon:'⏰',title:'منبّه الصلاة',hint:'المنبه والغفوة وأوقات التشغيل',steps:[
      'افتح إعدادات «منبّه مواقيت الصلاة»، ثم فعّل المنبّه للصلوات المطلوبة.',
      'حدّد إعدادات الغفوة والتكرار حسب رغبتك.',
      'اسمح للمنبّه بالعمل في الخلفية وإظهار التنبيه على الشاشة، وتأكد من صلاحية المنبّهات الدقيقة.'
    ]},
    {icon:'⏳',title:'الإقامة والعدّاد',hint:'باقي على الإقامة ومضى على الإقامة',steps:[
      'من «بيانات الاذان والإقامة» اختر مدة «أوقات الإقامة» المناسبة لكل صلاة.',
      'بعد الأذان يظهر «باقي على الإقامة». وعند وصوله إلى 00:00 يبدأ «مضى على الإقامة».',
      'العدّاد يعتمد على الوقت المحدد للصلاة والإقامة، وليس على وقت فتح التطبيق.'
    ]},
    {icon:'🔕',title:'وضع الصامت بعد الإقامة',hint:'تشغيل الصامت واستعادة الرنين تلقائياً',steps:[
      'من إعدادات «الأذان والتنبيه» فعّل «وضع صامت بعد الإقامة» وحدد المدة لكل صلاة.',
      'عند انتهاء عدّاد «باقي على الإقامة» يحاول التطبيق جعل رنين الهاتف صامتاً للمدة التي حددتها.',
      'عند انتهاء المدة يحاول التطبيق استعادة وضع الرنين السابق. يبقى جدول «عدم الإزعاج» الذي ضبطته على الهاتف مستقلاً.',
      'إذا لم يتغيّر الصوت، افتح تفاصيل حالة الصامت في الإعدادات وتحقق من صلاحية التحكم بالصامت والمنبّهات الدقيقة.'
    ]},
    {icon:'📖',title:'القرآن الكريم',hint:'تقليب الصفحات والعلامات المرجعية',steps:[
      'افتح «القرآن الكريم» من القائمة الرئيسية للدخول إلى المصحف.',
      'انتقل بين الصفحات بالسحب، واضغط على الصفحة لإظهار أدوات القراءة أو إخفائها.',
      'اضغط مطولاً على الآية لإضافة علامة مرجعية، واستعرضها من «علاماتي». المصحف المضمّن في APK يعمل بدون إنترنت.'
    ]},
    {icon:'📅',title:'التقاويم السنوية',hint:'الاستعراض والحفظ والمشاركة',steps:[
      'افتح «التقاويم» من الإعدادات واختر السنة والشهر.',
      'عدّل تنسيق التقويم بحسب الخيارات المتاحة.',
      'استخدم خيار حفظ صورة التقويم أو مشاركتها على الهاتف.'
    ]},
    {icon:'🌿',title:'حقيبة المسلم',hint:'الأذكار وسنن الجمعة وصيام التطوع',steps:[
      'افتح «حقيبة المسلم» من القائمة الرئيسية.',
      'اختر «الأذكار» أو «سنن يوم الجمعة» أو «صيام التطوع».',
      'يمكنك تفعيل تذكيرات الأقسام وتحديد أوقاتها من إعداداتها.'
    ]},
    {icon:'🛠️',title:'حل المشكلات الشائعة',hint:'إذا تأخر الأذان أو الصامت أو الإشعارات',steps:[
      'تأكد أولاً من تفعيل الخدمة المطلوبة داخل التطبيق ومن إعدادات كل صلاة.',
      'راجع أذونات الإشعارات والمنبّهات الدقيقة والتحكم بوضع الصامت، حسب الخدمة.',
      'راجع إعدادات البطارية والعمل في الخلفية؛ بعض الهواتف قد تؤخر التنبيهات أو تقيدها.',
      'إذا استمرت المشكلة استخدم «تواصل معنا عبر واتساب» وأرسل نوع الهاتف ووصف المشكلة، من دون مشاركة أي بيانات خاصة.'
    ]}
  ];

  function element(tag,text,cls){
    const x=document.createElement(tag);
    if(text!=null)x.textContent=text;
    if(cls)x.className=cls;
    return x;
  }
  function applyCss(){
    if(document.getElementById('aoqatHelpStyle'))return;
    const style=element('style');style.id='aoqatHelpStyle';
    style.textContent=[
      '.aoqat-help{direction:rtl;max-width:720px;margin:0 auto;padding:8px 7px 25px;line-height:1.8;color:var(--wt-text,#403528);font-family:inherit}',
      '.aoqat-help *{box-sizing:border-box}',
      '.aoqat-help .ah-intro{padding:15px 16px;margin:6px 0 15px;border:1px solid #dac9a7;border-radius:16px;background:linear-gradient(135deg,#fffdf8,#f4ebd7);border-right:4px solid #b89240}',
      '.aoqat-help .ah-intro h3{font-size:19px;line-height:1.6;margin:0 0 4px;color:#155c48;font-weight:750}',
      '.aoqat-help .ah-intro p{font-size:14px;color:#625c4c;margin:0}',
      '.aoqat-help .ah-list{border-radius:16px;overflow:hidden;border:1px solid #dfd0b1;box-shadow:0 2px 9px #5e49310d;background:#fffaf0}',
      '.aoqat-help .ah-row{display:flex;align-items:center;width:100%;gap:13px;min-height:70px;padding:10px 14px;border:0;border-bottom:1px solid #e8dabe;border-radius:0;background:linear-gradient(90deg,#fffaf1,#f8eed9);font:inherit;color:#3f3425;text-align:right;cursor:pointer}',
      '.aoqat-help .ah-row:nth-child(even){background:linear-gradient(90deg,#f8eed9,#fffaf1)}',
      '.aoqat-help .ah-list>:last-child .ah-row,.aoqat-help .ah-list>.ah-row:last-child{border-bottom:0}',
      '.aoqat-help .ah-row:active{background:#eee0bf}',
      '.aoqat-help .ah-icon{display:flex;align-items:center;justify-content:center;flex:0 0 42px;height:42px;border:1px solid #dec99e;border-radius:13px;background:#f4e6c7;font-size:24px}',
      '.aoqat-help .ah-copy{display:flex;flex:1;flex-direction:column;gap:1px;min-width:0}',
      '.aoqat-help .ah-label{font-size:16px;line-height:1.45;font-weight:750;color:#305341}',
      '.aoqat-help .ah-hint{font-size:12px;line-height:1.6;color:#776d58}',
      '.aoqat-help .ah-chevron{font-size:25px;color:#b18a3e;line-height:1;transition:transform .15s ease}',
      '.aoqat-help details{margin:0;border-bottom:1px solid #e8dabe}',
      '.aoqat-help details:last-child{border-bottom:0}',
      '.aoqat-help summary{list-style:none;cursor:pointer;outline-offset:-3px}',
      '.aoqat-help summary::-webkit-details-marker{display:none}',
      '.aoqat-help details[open] .ah-chevron{transform:rotate(-90deg)}',
      '.aoqat-help .ah-steps{background:#fffdf8;padding:12px 18px 17px;margin:0;border-top:1px solid #ebdeca;list-style:none;counter-reset:aqStep}',
      '.aoqat-help .ah-steps li{counter-increment:aqStep;display:flex;align-items:flex-start;gap:11px;padding:8px 0;font-size:14px;color:#3e4c3e;line-height:1.85}',
      '.aoqat-help .ah-steps li:before{content:counter(aqStep);flex:0 0 27px;height:27px;border-radius:50%;background:#e5d3a6;color:#426246;font-size:13px;text-align:center;font-weight:750;line-height:27px}',
      '.aoqat-help .ah-note{border:1px solid #e2cca1;background:#fff6df;border-radius:12px;padding:12px 14px;margin:13px 0;color:#6c5b38;font-size:13px}',
      '.aoqat-help .ah-card{border:1px solid #decbaa;border-radius:13px;background:#fffcf4;padding:14px;margin:10px 0;font-size:14px;overflow-wrap:anywhere}',
      '.aoqat-help .ah-button{display:flex;justify-content:center;align-items:center;gap:8px;width:100%;min-height:54px;background:#176c54;border:1px solid #12563f;color:#fff;border-radius:13px;margin-top:14px;padding:12px;font-size:16px;font-family:inherit;font-weight:750;cursor:pointer}',
      '.aoqat-help .ah-button:disabled{background:#98a59e;border-color:#98a59e;cursor:default}',
      '.aoqat-help button:focus-visible,.aoqat-help summary:focus-visible{outline:3px solid #c89d41;outline-offset:2px}',
      '.aoqat-help .ah-muted{font-size:13px;color:#776d58;margin:8px 0 0}',
      '@media(max-width:370px){.aoqat-help .ah-row{min-height:66px;padding:8px 10px;gap:9px}.aoqat-help .ah-icon{flex-basis:36px;height:36px;font-size:21px}.aoqat-help .ah-label{font-size:15px}}'
    ].join('');
    document.head.append(style);
  }
  function page(title,description){
    applyCss();
    const root=element('section',null,'aoqat-help');root.dir='rtl';
    const intro=element('div',null,'ah-intro');
    intro.append(element('h3',title),element('p',description));
    root.append(intro);return root;
  }
  function row(icon,title,hint){
    const b=element('button',null,'ah-row');b.type='button';
    b.append(element('span',icon,'ah-icon'));
    const copy=element('span',null,'ah-copy');
    copy.append(element('span',title,'ah-label'),element('span',hint,'ah-hint'));
    b.append(copy,element('span','‹','ah-chevron'));
    return b;
  }
  function home(go){
    const root=page('المساعدة والتواصل','كل ما تحتاجه للتعرف على التطبيق أو التواصل معنا، بخيارات واضحة وسهلة.');
    const list=element('div',null,'ah-list');
    for(const [id,icon,title,detail] of [
      ['guide','📖','شرح استخدام التطبيق','شرح الخدمات خطوة بخطوة، بدون إنترنت'],
      ['contact','💬','تواصل معنا عبر واتساب','للمساعدة والاقتراحات والإبلاغ عن مشكلة']
    ]){const b=row(icon,title,detail);b.onclick=()=>go(id);list.append(b);}
    root.append(list);return root;
  }
  function guide(){
    const root=page('شرح استخدام التطبيق','اضغط على القسم الذي تريد شرحه؛ الأزرار مرتبة مثل قائمة إعدادات التطبيق.');
    const list=element('div',null,'ah-list');
    for(const entry of guides){
      const details=element('details');
      const summary=element('summary',null,'ah-row');
      summary.append(element('span',entry.icon,'ah-icon'));
      const copy=element('span',null,'ah-copy');
      copy.append(element('span',entry.title,'ah-label'),element('span',entry.hint,'ah-hint'));
      summary.append(copy,element('span','‹','ah-chevron'));
      const ol=element('ol',null,'ah-steps');
      for(const instruction of entry.steps)ol.append(element('li',instruction));
      details.append(summary,ol);list.append(details);
    }
    root.append(list,element('p','ملاحظة: خدمات الأذان والصامت والمنبّه تتأثر بصلاحيات الهاتف وإعدادات البطارية. المواقيت داخل التطبيق مخصصة لمدينة الحويجة وضواحيها.','ah-note'));
    return root;
  }
  function contact(){
    const root=page('تواصل معنا عبر واتساب','للاستفسارات أو الاقتراحات أو الإبلاغ عن مشكلة في التطبيق.');
    root.append(element('p','رسالتك الجاهزة: '+MESSAGE,'ah-card'));
    const digits=WHATSAPP_NUMBER.replace(/\D/g,'');
    const valid=/^[1-9]\d{7,14}$/.test(digits);
    const button=element('button',valid?'💬 فتح محادثة واتساب':'💬 واتساب — بانتظار رقم الدعم','ah-button');
    button.type='button';button.disabled=!valid;
    if(valid)button.onclick=()=>{
      const url='https://wa.me/'+digits+'?text='+encodeURIComponent(MESSAGE);
      if(typeof window.AndroidNative?.openSupportWhatsApp==='function')
        window.AndroidNative.openSupportWhatsApp(url);
      else window.open(url,'_blank','noopener,noreferrer');
    };
    root.append(button);
    if(!valid)root.append(element('p','سيتفعّل زر واتساب بعد إضافة رقم التواصل الرسمي.','ah-muted'));
    else root.append(element('p','يُفتح واتساب خارج التطبيق. قد يحتاج الهاتف إلى اتصال بالإنترنت.','ah-muted'));
    return root;
  }
  window.AoqatHelpSupport={home,guide,contact};
})();