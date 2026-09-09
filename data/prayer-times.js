// لا توجد بيانات أوقات تجريبية في هذا الملف.
// جميع أوقات الصلاة الفعلية يتم تحميلها من Supabase.
const prayerTimes = [];

// تحميل نظام التصميم الثاني بعد اكتمال تشغيل الواجهة الأساسية.
window.addEventListener("load", () => {
    if (document.querySelector('script[data-second-design]')) return;

    const script = document.createElement("script");
    script.src = "js/second-design.js?v=1";
    script.dataset.secondDesign = "true";
    document.body.appendChild(script);
});
