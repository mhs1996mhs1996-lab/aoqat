"use strict";


/* =====================================================
   اختصار العناصر
===================================================== */

const $ = id =>
    document.getElementById(id);


/* =====================================================
   بيانات العناصر
===================================================== */

const draggableElements = [

    ".quran",

    "#dayP",

    ".dateRight",

    ".dateLeft",

    "#hijriMonthP",

    "#gregorianMonthP",

    "#hijriYearP",

    "#gregorianYearP",

    ".prayer-row:nth-child(1)",

    ".prayer-row:nth-child(2)",

    ".prayer-row:nth-child(3)",

    ".prayer-row:nth-child(4)",

    ".prayer-row:nth-child(5)",

    ".prayer-row:nth-child(6)",

    "#footerP"

];


/* =====================================================
   إنشاء القوائم
===================================================== */

function fillSelect(id, values) {

    const select = $(id);

    if (!select) return;


    select.innerHTML = "";


    values.forEach(value => {

        const option =
            document.createElement("option");


        option.value = value;

        option.textContent = value;


        select.appendChild(option);

    });

}


/* =====================================================
   بيانات التاريخ
===================================================== */

function initDateData() {


    /* اليوم الهجري */

    fillSelect(
        "hijriDay",

        Array.from(
            { length: 31 },
            (_, i) => String(i + 1)
        )
    );


    /* اليوم الميلادي */

    fillSelect(
        "gregorianDay",

        Array.from(
            { length: 31 },
            (_, i) => String(i + 1)
        )
    );


    /* السنة الهجرية */

    fillSelect(
        "hijriYear",

        Array.from(
            { length: 101 },
            (_, i) => String(1400 + i)
        )
    );


    /* السنة الميلادية */

    fillSelect(
        "gregorianYear",

        Array.from(
            { length: 201 },
            (_, i) => String(1900 + i)
        )
    );


    /* القيم الافتراضية */

    $("dayName").value =
        "الأحد";


    $("hijriDay").value =
        "17";


    $("gregorianDay").value =
        "30";


    $("hijriMonth").value =
        "ربيع الأول";


    $("gregorianMonth").value =
        "آب";


    $("hijriYear").value =
        "1448";


    $("gregorianYear").value =
        "2026";

}


/* =====================================================
   أوقات الصلاة
===================================================== */

function initPrayerTimes() {

    const times = [];


    for (
        let hour = 0;
        hour < 24;
        hour++
    ) {

        for (
            let minute = 0;
            minute < 60;
            minute++
        ) {

            const hour12 =
                ((hour + 11) % 12) + 1;


            times.push(
                `${hour12}:${String(minute).padStart(2, "0")}`
            );

        }

    }


    [

        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha"

    ].forEach(id => {

        fillSelect(
            id,
            times
        );

    });


    $("fajr").value =
        "4:17";


    $("sunrise").value =
        "5:39";


    $("dhuhr").value =
        "12:10";


    $("asr").value =
        "3:50";


    $("maghrib").value =
        "6:37";


    $("isha").value =
        "7:57";

}


/* =====================================================
   تحديث بيانات التاريخ في المعاينة
===================================================== */

function updateDatePreview() {


    $("dayP").textContent =
        $("dayName").value;


    $("hijriDayP").textContent =
        $("hijriDay").value;


    $("gregorianDayP").textContent =
        $("gregorianDay").value;


    $("hijriMonthP").textContent =
        $("hijriMonth").value;


    $("gregorianMonthP").textContent =
        $("gregorianMonth").value;


    $("hijriYearP").textContent =
        $("hijriYear").value + "هـ";


    $("gregorianYearP").textContent =
        $("gregorianYear").value + "م";

}


/* =====================================================
   تحديث أوقات الصلاة
===================================================== */

function updatePrayerPreview() {


    [

        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha"

    ].forEach(id => {

        const output =
            $(id + "P");


        const input =
            $(id);


        if (output && input) {

            output.textContent =
                input.value;

        }

    });

}


/* =====================================================
   تحديث النص السفلي
===================================================== */

function updateFooter() {

    $("footerP").textContent =
        $("footerText").value;

}


/* =====================================================
   تحديث كامل
===================================================== */

function updateAll() {

    updateDatePreview();

    updatePrayerPreview();

    updateFooter();

    updateBackground();

}


/* =====================================================
   الخلفية
===================================================== */

function updateBackground() {

    const design =
        $("design");


    if (!design) return;


    if (
        $("bgType").value ===
        "gradient"
    ) {

        design.style.backgroundImage =

            `radial-gradient(
                circle at 50% 47%,
                rgba(20,91,82,.45),
                transparent 36%
            ),
            radial-gradient(
                circle at 50% 55%,
                rgba(4,30,30,.35),
                transparent 65%
            ),
            linear-gradient(
                145deg,
                ${$("color1").value},
                ${$("color2").value} 55%,
                #031b1b
            )`;

    }

}


/* =====================================================
   التحكم بالخلفية
===================================================== */

function setupBackground() {


    $("bgType")
        ?.addEventListener(
            "change",
            () => {

                const image =
                    $("bgType").value ===
                    "image";


                $("gradientBox")
                    .classList
                    .toggle(
                        "hidden",
                        image
                    );


                $("imageBox")
                    .classList
                    .toggle(
                        "hidden",
                        !image
                    );


                if (!image) {

                    updateBackground();

                }

            }
        );


    $("color1")
        ?.addEventListener(
            "input",
            updateBackground
        );


    $("color2")
        ?.addEventListener(
            "input",
            updateBackground
        );


    $("bgFile")
        ?.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files[0];


                if (!file) return;


                const reader =
                    new FileReader();


                reader.onload =
                    function () {

                        $("design")
                            .style
                            .backgroundImage =
                            `url("${reader.result}")`;


                        $("design")
                            .style
                            .backgroundSize =
                            "cover";


                        $("design")
                            .style
                            .backgroundPosition =
                            "center";

                    };


                reader.readAsDataURL(file);

            }
        );

}


/* =====================================================
   القوائم المنسدلة
===================================================== */

function setupInputs() {


    [

        "dayName",
        "hijriDay",
        "gregorianDay",
        "hijriMonth",
        "gregorianMonth",
        "hijriYear",
        "gregorianYear"

    ].forEach(id => {

        $(id)?.addEventListener(
            "change",
            updateDatePreview
        );

    });


    [

        "fajr",
        "sunrise",
        "dhuhr",
        "asr",
        "maghrib",
        "isha"

    ].forEach(id => {

        $(id)?.addEventListener(
            "change",
            updatePrayerPreview
        );

    });


    $("footerText")
        ?.addEventListener(
            "input",
            updateFooter
        );

}


/* =====================================================
   السحب والإفلات
===================================================== */

function setupDragging() {

    const design =
        $("design");


    if (!design) return;


    draggableElements.forEach(
        selector => {


            const element =
                document.querySelector(
                    selector
                );


            if (!element) return;


            element.classList.add(
                "draggable"
            );


            let dragging = false;


            let startX = 0;

            let startY = 0;


            let baseX =
                parseFloat(
                    element.dataset.x
                ) || 0;


            let baseY =
                parseFloat(
                    element.dataset.y
                ) || 0;


            let scale = 1;


            function point(event) {

                return event.touches
                    ? event.touches[0]
                    : event;

            }


            function start(event) {

                if (
                    event.button !== undefined &&
                    event.button !== 0
                ) {

                    return;

                }


                const p =
                    point(event);


                const rect =
                    design.getBoundingClientRect();


                scale =
                    rect.width /
                    design.offsetWidth ||
                    1;


                startX =
                    p.clientX;


                startY =
                    p.clientY;


                baseX =
                    parseFloat(
                        element.dataset.x
                    ) || 0;


                baseY =
                    parseFloat(
                        element.dataset.y
                    ) || 0;


                dragging = true;


                element.classList.add(
                    "dragging"
                );


                event.preventDefault();

            }


            function move(event) {

                if (!dragging) return;


                const p =
                    point(event);


                const dx =
                    (p.clientX - startX) /
                    scale;


                const dy =
                    (p.clientY - startY) /
                    scale;


                const x =
                    baseX + dx;


                const y =
                    baseY + dy;


                element.dataset.x =
                    x;


                element.dataset.y =
                    y;


                element.style.transform =
                    `translate(${x}px, ${y}px)`;


                event.preventDefault();

            }


            function end() {

                dragging = false;


                element.classList.remove(
                    "dragging"
                );

            }


            element.addEventListener(
                "mousedown",
                start
            );


            window.addEventListener(
                "mousemove",
                move,
                {
                    passive: false
                }
            );


            window.addEventListener(
                "mouseup",
                end
            );


            element.addEventListener(
                "touchstart",
                start,
                {
                    passive: false
                }
            );


            window.addEventListener(
                "touchmove",
                move,
                {
                    passive: false
                }
            );


            window.addEventListener(
                "touchend",
                end
            );

        }
    );

}


/* =====================================================
   تنسيق الخط
===================================================== */

let selectedElement = null;


/* =====================================================
   اختيار العنصر
===================================================== */

function setupFontSystem() {


    $("elementSelect")
        ?.addEventListener(
            "change",
            function () {


                const selector =
                    this.value;


                if (!selector) {

                    selectedElement =
                        null;

                    return;

                }


                selectedElement =
                    document.querySelector(
                        selector
                    );


                if (
                    !selectedElement
                ) return;


                loadElementStyle();

            }
        );


    /* الخط */

    $("fontFamily")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    /* الحجم */

    $("fontSize")
        ?.addEventListener(
            "input",
            applyFontStyle
        );


    /* الوزن */

    $("fontWeight")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    /* اللون */

    $("fontColor")
        ?.addEventListener(
            "input",
            applyFontStyle
        );


    /* المحاذاة */

    $("textAlign")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    /* الظل */

    $("textShadow")
        ?.addEventListener(
            "change",
            applyFontStyle
        );


    setupFontUpload();

}


/* =====================================================
   تحميل تنسيق العنصر
===================================================== */

function loadElementStyle() {

    if (!selectedElement)
        return;


    const style =
        getComputedStyle(
            selectedElement
        );


    $("fontFamily").value =
        normalizeFontFamily(
            style.fontFamily
        );


    $("fontSize").value =
        parseFloat(
            style.fontSize
        );


    $("fontWeight").value =
        style.fontWeight;


    $("fontColor").value =
        rgbToHex(
            style.color
        );


    $("textAlign").value =
        style.textAlign;


    if (
        style.textShadow ===
        "none"
    ) {

        $("textShadow").value =
            "none";

    }

    else if (
        style.textShadow.includes(
            "255, 215, 0"
        )
    ) {

        $("textShadow").value =
            "gold";

    }

    else {

        $("textShadow").value =
            "black";

    }

}


/* =====================================================
   تطبيق تنسيق الخط
===================================================== */

function applyFontStyle() {

    if (!selectedElement)
        return;


    selectedElement.style.fontFamily =
        `"${$("fontFamily").value}"`;


    selectedElement.style.fontSize =
        `${$("fontSize").value}px`;


    selectedElement.style.fontWeight =
        $("fontWeight").value;


    selectedElement.style.color =
        $("fontColor").value;


    selectedElement.style.textAlign =
        $("textAlign").value;


    const shadow =
        $("textShadow").value;


    if (shadow === "none") {

        selectedElement.style.textShadow =
            "none";

    }


    if (shadow === "black") {

        selectedElement.style.textShadow =
            "4px 4px 3px #000";

    }


    if (shadow === "gold") {

        selectedElement.style.textShadow =
            "4px 4px 3px #000, 0 0 10px #ffd45c";

    }


    if (shadow === "green") {

        selectedElement.style.textShadow =
            "4px 4px 3px #000, 0 0 10px #26ff00";

    }

}


/* =====================================================
   إضافة خط من الجهاز
===================================================== */

function setupFontUpload() {


    $("fontFile")
        ?.addEventListener(
            "change",
            async event => {


                const file =
                    event.target.files[0];


                if (!file) return;


                const fontName =
                    file.name
                        .replace(
                            /\.(ttf|otf|woff2?|)$/i,
                            ""
                        )
                        .replace(
                            /[^a-zA-Z0-9\u0600-\u06FF]/g,
                            "_"
                        );


                try {


                    const fontFace =
                        new FontFace(
                            fontName,
                            `url(${URL.createObjectURL(file)})`
                        );


                    await fontFace.load();


                    document.fonts.add(
                        fontFace
                    );


                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        fontName;


                    option.textContent =
                        fontName +
                        " ✓";


                    $("fontFamily")
                        .appendChild(
                            option
                        );


                    $("fontFamily").value =
                        fontName;


                    applyFontStyle();


                    alert(
                        "تمت إضافة الخط بنجاح"
                    );


                }
                catch (error) {


                    console.error(
                        error
                    );


                    alert(
                        "تعذر تحميل الخط."
                    );

                }

            }
        );

}


/* =====================================================
   تحويل RGB إلى HEX
===================================================== */

function rgbToHex(rgb) {

    if (
        !rgb ||
        rgb.startsWith("#")
    ) {

        return rgb || "#ffffff";

    }


    const match =
        rgb.match(
            /\d+/g
        );


    if (
        !match ||
        match.length < 3
    ) {

        return "#ffffff";

    }


    return "#" +
        match
            .slice(0, 3)
            .map(
                n =>
                    Number(n)
                        .toString(16)
                        .padStart(2, "0")
            )
            .join("");

}


/* =====================================================
   اسم الخط
===================================================== */

function normalizeFontFamily(value) {

    if (!value)
        return "Arial";


    return value
        .split(",")[0]
        .replace(
            /["']/g,
            ""
        )
        .trim();

}


/* =====================================================
   النوافذ / فتح وإغلاق الأقسام
===================================================== */

function setupPanels() {


    document
        .querySelectorAll(
            "[data-open-panel]"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    const panel =
                        $(
                            button.dataset
                                .openPanel
                        );


                    if (!panel)
                        return;


                    panel.classList.toggle(
                        "active-panel"
                    );


                    panel.scrollIntoView({
                        behavior:
                            "smooth",
                        block:
                            "nearest"
                    });

                }
            );

        });


    document
        .querySelectorAll(
            ".collapse-btn"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    const panel =
                        button.closest(
                            ".accordion-panel"
                        );


                    if (!panel)
                        return;


                    panel.classList.toggle(
                        "collapsed"
                    );


                    button.textContent =
                        panel.classList.contains(
                            "collapsed"
                        )
                            ? "+"
                            : "−";

                }
            );

        });

}


/* =====================================================
   إعادة ضبط المواضع
===================================================== */

function resetPositions() {


    document
        .querySelectorAll(
            ".draggable"
        )
        .forEach(element => {


            element.dataset.x =
                "0";


            element.dataset.y =
                "0";


            element.style.transform =
                "";

        });

}


function setupReset() {

    $("resetPositions")
        ?.addEventListener(
            "click",
            resetPositions
        );

}


/* =====================================================
   التصدير
===================================================== */

async function exportImage(format) {


    const design =
        $("design");


    if (!design)
        return;


    const WIDTH =
        1024;


    const HEIGHT =
        1448;


    const SCALE =
        2;


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        WIDTH * SCALE;


    canvas.height =
        HEIGHT * SCALE;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.scale(
        SCALE,
        SCALE
    );


    try {

        if (
            document.fonts &&
            document.fonts.ready
        ) {

            await document.fonts.ready;

        }

    }
    catch (error) {}


    await drawBackground(
        ctx,
        design,
        WIDTH,
        HEIGHT
    );


    drawBorderExport(
        ctx
    );


    /* الآية */

    drawElement(
        ctx,
        document.querySelector(
            ".quran"
        ),
        design
    );


    /* التاريخ */

    [

        "#dayP",
        ".dateRight span",
        ".dateLeft span",
        "#hijriMonthP",
        "#gregorianMonthP",
        "#hijriYearP",
        "#gregorianYearP"

    ].forEach(selector => {

        drawElement(
            ctx,
            document.querySelector(
                selector
            ),
            design
        );

    });


    /* أوقات الصلاة */

    design
        .querySelectorAll(
            ".prayer-row"
        )
        .forEach(row => {

            drawElement(
                ctx,
                row.querySelector("b"),
                design
            );


            drawElement(
                ctx,
                row.querySelector("span"),
                design
            );

        });


    /* النص السفلي */

    drawElement(
        ctx,
        $("footerP"),
        design
    );


    const mime =
        format === "jpg"
            ? "image/jpeg"
            : format === "webp"
                ? "image/webp"
                : "image/png";


    const quality =
        format === "png"
            ? undefined
            : .98;


    canvas.toBlob(
        blob => {


            if (!blob) {

                alert(
                    "تعذر إنشاء الصورة."
                );

                return;

            }


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                `noor-prayer-calendar.${format}`;


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            setTimeout(
                () => {

                    URL.revokeObjectURL(
                        url
                    );

                },
                2000
            );

        },

        mime,

        quality

    );

}


/* =====================================================
   رسم الخلفية للتصدير
===================================================== */

async function drawBackground(
    ctx,
    design,
    W,
    H
) {


    const background =
        getComputedStyle(
            design
        ).backgroundImage;


    if (
        background &&
        background.includes(
            "url("
        )
    ) {


        const match =
            background.match(
                /url\(["']?(.*?)["']?\)/
            );


        if (match) {


            const image =
                new Image();


            await new Promise(
                resolve => {


                    image.onload =
                        () => {


                            ctx.drawImage(
                                image,
                                0,
                                0,
                                W,
                                H
                            );


                            resolve();

                        };


                    image.onerror =
                        resolve;


                    image.src =
                        match[1];

                }
            );


        }

    }

    else {


        const c1 =
            $("color1")?.value ||
            "#031b1b";


        const c2 =
            $("color2")?.value ||
            "#0b3b37";


        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                W,
                H
            );


        gradient.addColorStop(
            0,
            c1
        );


        gradient.addColorStop(
            .55,
            c2
        );


        gradient.addColorStop(
            1,
            "#031b1b"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            0,
            W,
            H
        );

    }

}


/* =====================================================
   إطار التصدير
===================================================== */

function drawBorderExport(ctx) {


    ctx.save();


    ctx.strokeStyle =
        "#e8bd58";


    ctx.lineWidth =
        3;


    roundRect(
        ctx,
        52,
        52,
        920,
        1344,
        62
    );


    ctx.stroke();


    ctx.fillStyle =
        "#e8bd58";


    ctx.font =
        "34px Georgia";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "✦",
        512,
        45
    );


    ctx.fillText(
        "✦",
        512,
        1410
    );


    ctx.restore();

}


/* =====================================================
   مستطيل دائري
===================================================== */

function roundRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
) {


    ctx.beginPath();


    ctx.moveTo(
        x + radius,
        y
    );


    ctx.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        radius
    );


    ctx.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        radius
    );


    ctx.arcTo(
        x,
        y + height,
        x,
        y,
        radius
    );


    ctx.arcTo(
        x,
        y,
        x + width,
        y,
        radius
    );


    ctx.closePath();

}


/* =====================================================
   رسم عنصر للناتج النهائي
===================================================== */

function drawElement(
    ctx,
    element,
    design
) {


    if (!element)
        return;


    const rect =
        element.getBoundingClientRect();


    const designRect =
        design.getBoundingClientRect();


    const scale =
        designRect.width /
        design.offsetWidth ||
        1;


    const x =
        (rect.left -
            designRect.left) /
        scale;


    const y =
        (rect.top -
            designRect.top) /
        scale;


    const width =
        rect.width /
        scale;


    const style =
        getComputedStyle(
            element
        );


    const text =
        element.textContent.trim();


    if (!text)
        return;


    const fontSize =
        parseFloat(
            style.fontSize
        ) || 16;


    const family =
        style.fontFamily ||
        "Arial";


    const weight =
        style.fontWeight ||
        "400";


    ctx.save();


    ctx.font =
        `${weight} ${fontSize}px ${family}`;


    ctx.fillStyle =
        style.color ||
        "#ffffff";


    ctx.textBaseline =
        "top";


    ctx.textAlign =
        style.textAlign ||
        "left";


    let textX =
        x;


    if (
        style.textAlign ===
        "center"
    ) {

        textX =
            x + width / 2;

    }


    else if (
        style.textAlign ===
        "right"
    ) {

        textX =
            x + width;

    }


    applyCanvasShadow(
        ctx,
        style.textShadow
    );


    ctx.fillText(
        text,
        textX,
        y
    );


    ctx.restore();

}


/* =====================================================
   ظل التصدير
===================================================== */

function applyCanvasShadow(
    ctx,
    shadow
) {


    if (
        !shadow ||
        shadow === "none"
    ) {

        return;

    }


    ctx.shadowColor =
        "#000000";


    ctx.shadowBlur =
        3;


    ctx.shadowOffsetX =
        3;


    ctx.shadowOffsetY =
        3;

}


/* =====================================================
   أزرار التصدير
===================================================== */

function setupExport() {


    $("exportBtn")
        ?.addEventListener(
            "click",
            () =>
                exportImage(
                    "png"
                )
        );


    document
        .querySelectorAll(
            "[data-export-format]"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    exportImage(
                        button.dataset
                            .exportFormat
                    );

                }
            );

        });

}


/* =====================================================
   التشغيل
===================================================== */

function init() {


    initDateData();


    initPrayerTimes();


    setupInputs();


    setupBackground();


    setupDragging();


    setupFontSystem();


    setupPanels();


    setupReset();


    setupExport();


    setupSupabaseDatabase();


    updateAll();

}


if (
    document.readyState ===
    "loading"
) {


    document.addEventListener(
        "DOMContentLoaded",
        init
    );


}

else {


    init();

}