"use strict";

const SUPABASE_URL = "https://ytdvhiijxxaqofduorwm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dQRoxdwRJDDgWLze1U4ZqA_aaVlKC-1";

const GREGORIAN_MONTHS = [
    "كانون الثاني",
    "شباط",
    "آذار",
    "نيسان",
    "أيار",
    "حزيران",
    "تموز",
    "آب",
    "أيلول",
    "تشرين الأول",
    "تشرين الثاني",
    "كانون الأول"
];

const ARABIC_DAY_NAMES = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت"
];

function dbStatus(message, type = "") {
    const el = document.getElementById("databaseStatus");
    if (!el) return;

    el.textContent = message;
    el.className = "database-status" + (type ? " " + type : "");
}

function dbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        ...extra
    };
}

function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;

    const wanted = String(value);

    // إذا كانت القيمة موجودة في القائمة نختارها.
    const exists = Array.from(el.options || []).some(
        option => option.value === wanted
    );

    if (exists) {
        el.value = wanted;
        return true;
    }

    return false;
}

/* =====================================================
   ضبط تاريخ اليوم تلقائياً عند فتح البرنامج
===================================================== */
function setTodayDateAutomatically() {
    const now = new Date();

    const day = now.getDate();
    const monthIndex = now.getMonth();
    const year = now.getFullYear();
    const dayName = ARABIC_DAY_NAMES[now.getDay()];

    setSelectValue("gregorianDay", day);
    setSelectValue("gregorianMonth", GREGORIAN_MONTHS[monthIndex]);
    setSelectValue("gregorianYear", year);
    setSelectValue("dayName", dayName);

    if (typeof updateAll === "function") {
        updateAll();
    }

    return {
        day,
        month: monthIndex + 1,
        year,
        dayName
    };
}

/* =====================================================
   تحميل مواقيت الشهر واليوم من الجدول السنوي
   السنة لا تدخل في اختيار أوقات الصلاة
===================================================== */
async function loadPrayerFromDatabase(silent = false) {
    try {
        if (!silent) {
            dbStatus("جاري تحميل مواقيت اليوم...");
        }

        const monthName = document.getElementById("gregorianMonth")?.value;
        const month = GREGORIAN_MONTHS.indexOf(monthName) + 1;
        const day = Number(document.getElementById("gregorianDay")?.value);

        if (!month || !day) {
            throw new Error("التاريخ الميلادي غير مكتمل");
        }

        const url = new URL(`${SUPABASE_URL}/rest/v1/annual_prayer_times`);
        url.searchParams.set("select", "*");
        url.searchParams.set("gregorian_month", `eq.${month}`);
        url.searchParams.set("gregorian_day", `eq.${day}`);
        url.searchParams.set("limit", "1");

        const response = await fetch(url, {
            headers: dbHeaders()
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const rows = await response.json();

        if (!rows.length) {
            dbStatus("لا توجد مواقيت محفوظة لهذا التاريخ", "error");
            return false;
        }

        const row = rows[0];

        const values = {
            fajr: row.fajr,
            sunrise: row.sunrise,
            dhuhr: row.dhuhr,
            asr: row.asr,
            maghrib: row.maghrib,
            isha: row.isha
        };

        Object.entries(values).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el && value !== null && value !== undefined) {
                el.value = String(value);
            }
        });

        if (typeof updateAll === "function") {
            updateAll();
        }

        dbStatus("تم تحميل مواقيت تاريخ اليوم تلقائياً ✓", "success");
        return true;

    } catch (error) {
        console.error(error);
        dbStatus("تعذر تحميل مواقيت اليوم", "error");

        if (!silent) {
            alert("تعذر تحميل المواقيت من قاعدة البيانات. تحقق من اتصال الإنترنت.");
        }

        return false;
    }
}

/* =====================================================
   حفظ/تعديل وقت يوم في الجدول السنوي
===================================================== */
function currentAnnualPrayerRecord() {
    const monthName = document.getElementById("gregorianMonth").value;
    const month = GREGORIAN_MONTHS.indexOf(monthName) + 1;

    return {
        gregorian_day: Number(document.getElementById("gregorianDay").value),
        gregorian_month: month,
        fajr: document.getElementById("fajr").value,
        sunrise: document.getElementById("sunrise").value,
        dhuhr: document.getElementById("dhuhr").value,
        asr: document.getElementById("asr").value,
        maghrib: document.getElementById("maghrib").value,
        isha: document.getElementById("isha").value
    };
}

async function savePrayerToDatabase() {
    try {
        dbStatus("جاري الحفظ...");

        const record = currentAnnualPrayerRecord();

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/annual_prayer_times?on_conflict=gregorian_month,gregorian_day`,
            {
                method: "POST",
                headers: dbHeaders({
                    Prefer: "resolution=merge-duplicates,return=representation"
                }),
                body: JSON.stringify(record)
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        dbStatus("تم حفظ المواقيت في قاعدة البيانات ✓", "success");

    } catch (error) {
        console.error(error);
        dbStatus("تعذر الحفظ", "error");
        alert("تعذر الحفظ في قاعدة البيانات.");
    }
}

/* =====================================================
   عند تغيير اليوم أو الشهر يحمّل وقته تلقائياً أيضاً
===================================================== */
function setupAutomaticDateChangeLoading() {
    const daySelect = document.getElementById("gregorianDay");
    const monthSelect = document.getElementById("gregorianMonth");

    daySelect?.addEventListener("change", () => {
        loadPrayerFromDatabase(true);
    });

    monthSelect?.addEventListener("change", () => {
        loadPrayerFromDatabase(true);
    });
}

/* =====================================================
   تشغيل الاتصال
===================================================== */
async function setupSupabaseDatabase() {
    document
        .getElementById("savePrayerDbBtn")
        ?.addEventListener("click", savePrayerToDatabase);

    document
        .getElementById("loadPrayerDbBtn")
        ?.addEventListener("click", () => loadPrayerFromDatabase(false));

    setupAutomaticDateChangeLoading();

    // أول ما يفتح البرنامج:
    // 1- يضبط تاريخ اليوم
    // 2- يجلب أوقاته مباشرة من Supabase
    setTodayDateAutomatically();
    await loadPrayerFromDatabase(true);
}
