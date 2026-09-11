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

(function(){
    if (document.querySelector('script[data-tomorrow-alarm]')) return;
    const alarmScript = document.createElement("script");
    alarmScript.src = "js/tomorrow-alarm.js?v=1";
    alarmScript.dataset.tomorrowAlarm = "true";
    alarmScript.onload = () => {
        if (document.querySelector('script[data-push-notifications]')) return;
        const pushScript = document.createElement("script");
        pushScript.src = "js/push-notifications.js?v=1";
        pushScript.dataset.pushNotifications = "true";
        document.head.appendChild(pushScript);
    };
    document.head.appendChild(alarmScript);
})();

window.addEventListener("load", () => {
    const hideLegacy = document.createElement("script");
    hideLegacy.src = "js/hide-legacy-design.js?v=1";
    hideLegacy.dataset.hideLegacyDesign = "true";
    hideLegacy.onload = () => {
        if (document.querySelector('script[data-second-design]')) return;
        const script = document.createElement("script");
        script.src = "js/second-design.js?v=4";
        script.dataset.secondDesign = "true";
        script.onload = () => {
            const extraScript = document.createElement("script");
            extraScript.src = "js/additional-designs.js?v=5";
            extraScript.dataset.additionalDesigns = "true";
            extraScript.onload = () => {
                const nightScript = document.createElement("script");
                nightScript.src = "js/night-design.js?v=3";
                nightScript.dataset.nightDesign = "true";
                nightScript.onload = () => {
                    const fiveScript = document.createElement("script");
                    fiveScript.src = "js/five-new-designs.js?v=6";
                    fiveScript.dataset.fiveNewDesigns = "true";
                    fiveScript.onload = () => {
                        const dateOrderScript = document.createElement("script");
                        dateOrderScript.src = "js/reference-date-order-fix.js?v=1";
                        dateOrderScript.dataset.referenceDateOrderFix = "true";
                        dateOrderScript.onload = () => {
                            const footerGuardScript = document.createElement("script");
                            footerGuardScript.src = "js/footer-placement-guard.js?v=1";
                            footerGuardScript.dataset.footerPlacementGuard = "true";
                            footerGuardScript.onload = () => {
                                const ornateScript = document.createElement("script");
                                ornateScript.src = "js/ornate-reference-design.js?v=1";
                                ornateScript.dataset.ornateReferenceDesign = "true";
                                ornateScript.onload = () => {
                                    const editScript = document.createElement("script");
                                    editScript.src = "js/manual-edit-toggle.js?v=5";
                                    editScript.dataset.manualEditToggle = "true";
                                    editScript.onload = () => {
                                        const toolsScript = document.createElement("script");
                                        toolsScript.src = "js/background-tools-organizer.js?v=2";
                                        toolsScript.dataset.backgroundToolsOrganizer = "true";
                                        toolsScript.onload = () => {
                                            const footerScript = document.createElement("script");
                                            footerScript.src = "js/footer-background-organizer.js?v=1";
                                            footerScript.dataset.footerBackgroundOrganizer = "true";
                                            footerScript.onload = () => {
                                                const fontScript = document.createElement("script");
                                                fontScript.src = "js/universal-font-controls.js?v=7";
                                                fontScript.dataset.universalFontControls = "true";
                                                fontScript.onload = () => {
                                                    const fontManagerScript = document.createElement("script");
                                                    fontManagerScript.src = "js/font-design-manager.js?v=2";
                                                    fontManagerScript.dataset.fontDesignManager = "true";
                                                    fontManagerScript.onload = () => {
                                                        const historyScript = document.createElement("script");
                                                        historyScript.src = "js/design-history.js?v=1";
                                                        historyScript.dataset.designHistory = "true";
                                                        historyScript.onload = () => {
                                                            const previewEditScript = document.createElement("script");
                                                            previewEditScript.src = "js/universal-preview-editor.js?v=2";
                                                            previewEditScript.dataset.universalPreviewEditor = "true";
                                                            previewEditScript.onload = () => {
                                                                const toolbarScript = document.createElement("script");
                                                                toolbarScript.src = "js/export-toolbar.js?v=3";
                                                                toolbarScript.dataset.exportToolbar = "true";
                                                                toolbarScript.onload = () => {
                                                                    const exportScript = document.createElement("script");
                                                                    exportScript.src = "js/exact-export.js?v=13";
                                                                    exportScript.dataset.exactExport = "true";
                                                                    document.body.appendChild(exportScript);
                                                                };
                                                                document.body.appendChild(toolbarScript);
                                                            };
                                                            document.body.appendChild(previewEditScript);
                                                        };
                                                        document.body.appendChild(historyScript);
                                                    };
                                                    document.body.appendChild(fontManagerScript);
                                                };
                                                document.body.appendChild(fontScript);
                                            };
                                            document.body.appendChild(footerScript);
                                        };
                                        document.body.appendChild(toolsScript);
                                    };
                                    document.body.appendChild(editScript);
                                };
                                document.body.appendChild(ornateScript);
                            };
                            document.body.appendChild(footerGuardScript);
                        };
                        document.body.appendChild(dateOrderScript);
                    };
                    document.body.appendChild(fiveScript);
                };
                document.body.appendChild(nightScript);
            };
            document.body.appendChild(extraScript);
        };
        document.body.appendChild(script);
    };
    document.body.appendChild(hideLegacy);
});