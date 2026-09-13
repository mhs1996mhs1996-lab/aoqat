// لا توجد بيانات أوقات تجريبية في هذا الملف.
// جميع أوقات الصلاة الفعلية يتم تحميلها من Supabase.
const prayerTimes = [];

(function(){
    function loadScript(src, dataName, parent=document.body){
        return new Promise(resolve=>{
            const selector=`script[data-${dataName}]`;
            if(document.querySelector(selector)){resolve();return;}
            const s=document.createElement("script");
            s.src=src;
            s.setAttribute(`data-${dataName}`,"true");
            s.onload=()=>resolve();
            // لا نوقف بقية البرنامج إذا تعذر تحميل إضافة ثانوية.
            s.onerror=()=>{console.error("تعذر تحميل",src);resolve();};
            parent.appendChild(s);
        });
    }

    // إصلاح بدء التشغيل يعمل أولاً لمنع ظهور واجهة قديمة/جزئية أثناء تحميل باقي الوحدات.
    loadScript("js/startup-stabilizer.js?v=1","startup-stabilizer",document.head);
    loadScript("js/modal-panels.js?v=4","modal-panels",document.head);

    loadScript("js/tomorrow-alarm.js?v=1","tomorrow-alarm",document.head).then(()=>
        loadScript("js/push-notifications.js?v=1","push-notifications",document.head)
    );

    window.addEventListener("load",async()=>{
        await loadScript("js/hide-legacy-design.js?v=1","hide-legacy-design");
        await loadScript("js/second-design.js?v=5","second-design");
        await loadScript("js/additional-designs.js?v=6","additional-designs");
        await loadScript("js/night-design.js?v=3","night-design");
        await loadScript("js/five-new-designs.js?v=6","five-new-designs");
        await loadScript("js/reference-date-order-fix.js?v=1","reference-date-order-fix");
        await loadScript("js/footer-placement-guard.js?v=1","footer-placement-guard");
        await loadScript("js/manual-edit-toggle.js?v=5","manual-edit-toggle");
        await loadScript("js/background-tools-organizer.js?v=2","background-tools-organizer");
        await loadScript("js/footer-background-organizer.js?v=1","footer-background-organizer");
        await loadScript("js/interface-clock.js?v=1","interface-clock");
        await loadScript("js/universal-font-controls.js?v=8","universal-font-controls");
        await loadScript("js/font-design-manager.js?v=2","font-design-manager");
        await loadScript("js/design-history.js?v=2","design-history");
        await loadScript("js/universal-preview-editor.js?v=2","universal-preview-editor");
        await loadScript("js/export-toolbar.js?v=4","export-toolbar");
        await loadScript("js/compact-design-menu.js?v=1","compact-design-menu");
        await loadScript("js/exact-export.js?v=19","exact-export");
        window.dispatchEvent(new CustomEvent("aoqatModulesReady"));
    },{once:true});
})();