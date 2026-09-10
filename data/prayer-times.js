// لا توجد بيانات أوقات تجريبية في هذا الملف.
// جميع أوقات الصلاة الفعلية يتم تحميلها من Supabase.
const prayerTimes = [];

// تحميل نظام الأقسام المرتبة داخل بيانات التصميم.
(function(){
    if (document.querySelector('script[data-modal-panels]')) return;
    const modalScript = document.createElement("script");
    modalScript.src = "js/modal-panels.js?v=4";
    modalScript.dataset.modalPanels = "true";
    document.head.appendChild(modalScript);
})();

// إزالة نسخة النص السفلي المكررة من أعلى التصاميم إن وجدت.
(function(){
    if (document.querySelector('script[data-preview-footer-cleanup]')) return;
    const cleanupScript = document.createElement("script");
    cleanupScript.src = "js/preview-footer-cleanup.js?v=1";
    cleanupScript.dataset.previewFooterCleanup = "true";
    document.head.appendChild(cleanupScript);
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
