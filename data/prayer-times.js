// لا توجد بيانات أوقات تجريبية في هذا الملف.
// جميع أوقات الصلاة الفعلية يتم تحميلها من Supabase.
const prayerTimes = [];

// تحميل نظام النوافذ المنبثقة لأقسام بيانات التصميم.
(function(){
    if (document.querySelector('script[data-modal-panels]')) return;
    const modalScript = document.createElement("script");
    modalScript.src = "js/modal-panels.js?v=1";
    modalScript.dataset.modalPanels = "true";
    document.head.appendChild(modalScript);
})();

// تحميل نظام التصاميم الإضافية بعد اكتمال تشغيل الواجهة الأساسية.
window.addEventListener("load", () => {
    if (document.querySelector('script[data-second-design]')) return;

    const script = document.createElement("script");
    script.src = "js/second-design.js?v=1";
    script.dataset.secondDesign = "true";
    document.body.appendChild(script);
});
