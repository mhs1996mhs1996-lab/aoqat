(function(){'use strict';
 // International digits only; empty until the owner supplies an official WhatsApp number.
 const WHATSAPP_NUMBER='9647832764696';
 const MESSAGE='السلام عليكم، أود التواصل بخصوص تطبيق أوقات الصلاة في الحويجة.';
 const guides=[
 ['🕌 مواقيت الصلاة','يعرض التطبيق مواقيت الصلاة لمدينة الحويجة من قاعدة بياناته الداخلية. لمعرفة بيانات الغد افتح خيار اليوم التالي.'],
 ['🔊 الأذان والتنبيهات','افتح بيانات الأذان والإقامة ثم الأذان والتنبيه، وفعّل الصلاة المطلوبة، واختر صوت الأذان ومستواه. إشعار الصلاة ومنبهها إعدادان مستقلان.'],
 ['⏰ منبه الصلاة','فعّل المنبه للصلوات المطلوبة، وحدد مدة الغفوة وعدد تكراراتها. للسماح برنينه والهاتف مقفول، امنح صلاحيات المنبه والإشعارات وظهور شاشة التنبيه.'],
 ['⏳ الإقامة','من بيانات الأذان والإقامة اضبط مدة الإقامة لكل صلاة. يتبع العد التنازلي إعداداتك.'],
 ['🔕 وضع الصامت','اختار الصلوات ومدة الصامت حسب رغبتك. قد يحتاج التطبيق إذن التحكم بوضع عدم الإزعاج.'],
 ['📖 القرآن الكريم','افتح المصحف واقلب الصفحات بالسحب، واضغط على الصفحة لإظهار الأدوات، واضغط مطولاً على الآية لوضع علامة.'],
 ['📅 التقاويم','اختار الشهر والسنة من التقاويم، ثم احفظ صورة التقويم أو شاركها.'],
 ['🌿 حقيبة المسلم','تضم الأذكار وسنن يوم الجمعة وصيام التطوع. تگدر تضبط التذكيرات لكل خدمة.'],
 ['🛠️ إذا ما اشتغل التنبيه','تأكد من تفعيل الخدمة والصلاحيات والصوت والعمل بالخلفية، وراجع إعدادات توفير البطارية؛ بعض الهواتف تؤخر التنبيهات.']
 ];
 function element(tag,txt,cls){const x=document.createElement(tag);if(txt!=null)x.textContent=txt;if(cls)x.className=cls;return x;}
 function applyCss(){if(document.getElementById('aoqatHelpStyle'))return;const s=element('style');s.id='aoqatHelpStyle';s.textContent='.aoqat-help{direction:rtl;line-height:1.75;color:#183f38;max-width:700px;margin:auto}.aoqat-help p{margin:6px 0 12px}.aoqat-help .ah-button{width:100%;min-height:50px;display:block;text-align:right;margin:8px 0;padding:12px 14px;font:inherit;font-size:16px;border:0;border-radius:11px;background:#176e5c;color:white;cursor:pointer}.aoqat-help .ah-button:disabled{background:#899991;cursor:default}.aoqat-help button:focus-visible,.aoqat-help summary:focus-visible{outline:3px solid #d1a041;outline-offset:2px}.aoqat-help details,.aoqat-help .ah-card{background:#fffcf5;border:1px solid #b2cbbf;border-radius:11px;padding:12px;margin:0 0 9px}.aoqat-help summary{font-weight:bold;cursor:pointer;min-height:36px}.aoqat-help details p{padding-top:10px;margin:0}.aoqat-help .ah-note{padding:10px;background:#f8f0dc;border-right:4px solid #b38c27;border-radius:8px}.aoqat-help .ah-muted{font-size:14px;color:#596d64}';document.head.append(s);}
 function page(title,description){applyCss();const v=element('section',null,'aoqat-help');v.dir='rtl';v.append(element('h3',title),element('p',description,'ah-muted'));return v;}
 function home(go){const v=page('حول التطبيق والدعم','اختر الخدمة اللي تحتاجها.');for(const [id,title,detail] of [['guide','📘 تعليمات الاستخدام','شرح بسيط لجميع الأقسام'],['contact','💬 تواصل معنا عبر واتساب','أرسل اقتراحك أو استفسارك']]){const b=element('button',title,'ah-button');b.type='button';b.onclick=()=>go(id);v.append(b,element('p',detail,'ah-muted'));}return v;}
 function guide(){const v=page('تعليمات الاستخدام','اضغط على عنوان القسم حتى يظهر الشرح. تعمل الصفحة بدون إنترنت.');for(const [title,description] of guides){const d=element('details');d.append(element('summary',title),element('p',description));v.append(d);}v.append(element('p','تنويه: قد تختلف المواقيت عن الإعلانات المحلية، ويتأثر وصول الأذان والتنبيهات بصلاحيات الهاتف وإعداداته.','ah-note'));return v;}
 function contact(){const v=page('تواصل معنا عبر واتساب','للاستفسارات أو الإبلاغ عن مشكلة أو تقديم اقتراح.');v.append(element('p','الرسالة الجاهزة: '+MESSAGE,'ah-card'));const digits=WHATSAPP_NUMBER.replace(/\D/g,'');const available=/^[1-9]\d{7,14}$/.test(digits);const b=element('button',available?'💬 فتح محادثة واتساب':'💬 واتساب — بانتظار رقم الدعم','ah-button');b.type='button';b.disabled=!available;if(available)b.onclick=()=>{const url='https://wa.me/'+digits+'?text='+encodeURIComponent(MESSAGE);if(typeof window.AndroidNative?.openSupportWhatsApp==='function')window.AndroidNative.openSupportWhatsApp(url);else window.open(url,'_blank','noopener,noreferrer');};v.append(b);if(!available)v.append(element('p','سيُفعّل زر واتساب بعد إضافة رقم التواصل الرسمي.','ah-muted'));return v;}
 window.AoqatHelpSupport={home,guide,contact};
})();