// لا توجد بيانات أوقات تجريبية في هذا الملف.
// جميع أوقات الصلاة الفعلية يتم تحميلها من Supabase.
const prayerTimes = [];

(function(){
    if (document.querySelector('script[data-modal-panels]')) return;
    const modalScript = document.createElement("script");
    modalScript.src = "js/modal-panels.js?v=4";
    modalScript.dataset.modalPanels = "true";
    document.head.appendChild(modalScript);
})();

window.addEventListener("load", () => {
    if (document.querySelector('script[data-second-design]')) return;
    const script = document.createElement("script");
    script.src = "js/second-design.js?v=3";
    script.dataset.secondDesign = "true";
    script.onload = () => {
        const extraScript = document.createElement("script");
        extraScript.src = "js/additional-designs.js?v=4";
        extraScript.dataset.additionalDesigns = "true";
        extraScript.onload = () => {
            const nightScript = document.createElement("script");
            nightScript.src = "js/night-design.js?v=1";
            nightScript.dataset.nightDesign = "true";
            nightScript.onload = () => {
                const fiveScript = document.createElement("script");
                fiveScript.src = "js/five-new-designs.js?v=1";
                fiveScript.dataset.fiveNewDesigns = "true";
                fiveScript.onload = () => {
                    const exportScript = document.createElement("script");
                    exportScript.src = "js/exact-export.js?v=6";
                    exportScript.dataset.exactExport = "true";
                    document.body.appendChild(exportScript);
                };
                document.body.appendChild(fiveScript);
            };
            document.body.appendChild(nightScript);
        };
        document.body.appendChild(extraScript);
    };
    document.body.appendChild(script);
});