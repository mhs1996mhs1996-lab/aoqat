// لا توجد بيانات أوقات تجريبية في هذا الملف.
// جميع أوقات الصلاة الفعلية يتم تحميلها من Supabase.
const prayerTimes = [];

// تحميل نظام الأقسام المرتبة داخل بيانات التصميم.
(function(){
    if (document.querySelector('script[data-modal-panels]')) return;
    const modalScript = document.createElement("script");
    modalScript.src = "js/modal-panels.js?v=3";
    modalScript.dataset.modalPanels = "true";
    document.head.appendChild(modalScript);
})();

// تحميل التصاميم الإضافية بالتسلسل بعد اكتمال تشغيل الواجهة الأساسية.
window.addEventListener("load", () => {
    if (document.querySelector('script[data-second-design]')) return;

    const script = document.createElement("script");
    script.src = "js/second-design.js?v=3";
    script.dataset.secondDesign = "true";
    script.onload = () => {
        if (document.querySelector('script[data-additional-designs]')) return;
        const extraScript = document.createElement("script");
        extraScript.src = "js/additional-designs.js?v=4";
        extraScript.dataset.additionalDesigns = "true";
        extraScript.onload = () => {
            if (document.querySelector('script[data-night-design]')) return;
            const nightScript = document.createElement("script");
            nightScript.src = "js/night-design.js?v=1";
            nightScript.dataset.nightDesign = "true";
            document.body.appendChild(nightScript);
        };
        document.body.appendChild(extraScript);
    };
    document.body.appendChild(script);
});
