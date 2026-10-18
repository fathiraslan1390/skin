/* =====================================================================
 * i18n.js — لغة البرنامج: عربي أو إنجليزي (SakanI18n)
 * ---------------------------------------------------------------------
 * البرنامج الأصلي مكتوب عربي جوه الكود. بدل ما نعدّل كل سطر فيه، الملف ده
 * بيترجم الشاشة نفسها: أي نص عربي يظهر (حتى لو البرنامج غيّره بعدين)
 * بيدور على ترجمته في القاموس EN، ولو فيه أرقام أو أسماء بيستخدم RULES.
 * لما ترجع للعربي، كل نص بيرجع زي ما كان بالظبط.
 *
 * لإضافة ترجمة: ضيف السطر العربي بالظبط (من غير مسافات زيادة) في EN.
 * الأسماء اللي بيكتبها المستخدم (مشاريع، ملّاك) بتفضل زي ما هي.
 * ===================================================================== */

window.SakanI18n = (function () {
  "use strict";

  const EN = {
    /* ---------- عام ---------- */
    "سكن جروب": "Sakan Group", "إغلاق": "Close", "إلغاء": "Cancel", "حذف": "Delete", "تعديل": "Edit", "اختيار": "Choose",
    "تمام": "OK", "نسخ": "Copy", "اتنسخ ✓": "Copied ✓", "انسخها يدوي": "Copy it manually", "إضافة": "Add", "تغيير": "Change",
    "الاسم": "Name", "اسم المستخدم": "Username", "كلمة المرور": "Password", "دخول": "Sign in", "خروج": "Sign out",
    "مهندس": "Engineer", "مالك": "Owner", "عميل": "Client", "مدير النظام": "System admin", "المهندس": "Engineer", "المالك": "Owner", "العميل": "Client",
    "أنت": "You", "ثابت": "fixed", "الملفات": "Files", "؟": "?", "—": "—", "م": "m",

    /* ---------- الشاشة الرئيسية ---------- */
    "مخططك": "Your plan", "اختياراتك": "Your choices", "ملخّص اختياراتك": "Choices summary",
    "المخطط الحالي": "Current plan", "غرفة ملابس الأستاذ طلال": "Mr. Talal's dressing room", "غرف ملابس الأستاذ طلال": "Mr. Talal's dressing room",
    "الأستاذ طلال": "Mr. Talal", "غرفة ملابس طلال": "Talal's dressing room",
    "اختيار / رفع مخطط": "Choose / upload plan", "تعديل البوكسات والمقياس": "Edit boxes & scale", "تحميل ملف المشروع ↓": "Download project file ↓",
    "من المخطط إلى مساحتك": "From plan to your space", "كل بوكس، على ذوقك.": "Every box, your way.",
    "اضغط على الخزانة، شاهد التقسيمات المناسبة، واختر ما يناسب احتياجك.": "Tap a cabinet, see the layouts that fit, and pick what suits you.",
    "اختياراتك محفوظة هنا": "Your choices are saved here", "على هذا الجهاز تلقائيًا": "automatically on this device",
    "مخطط تفاعلي": "Interactive plan", "تم الاختيار": "Chosen", "البوكس الحالي": "Current box", "وحدة ثابتة": "Fixed unit",
    "الكورنرات B03 · B04 · B07 بواجهة مشطوفة.": "Corners B03 · B04 · B07 have chamfered fronts.",
    "شاهد المكتب السحب": "View the pull-out desk", "خزانة مستقيمة": "Straight cabinet", "خزانة": "Cabinet",
    "ابدأ باختيار أول تقسيمة": "Start by choosing the first layout", "التقسيم الداخلي": "Interior layout",
    "استعرض التقسيمات بالصور": "Browse layouts with pictures", "اضغط على صورة لمعاينتها، ثم اعتمد اختيارك.": "Tap a picture to preview it, then confirm your choice.",
    "اعتمد لهذه الخزانة": "Use for this cabinet", "اعتمد لهذه الخزانة ✓": "Use for this cabinet ✓", "هذا اختيارك الحالي": "This is your current choice",
    "مسح اختيار البوكس": "Clear box choice", "البوكس السابق": "Previous box", "→ البوكس السابق": "→ Previous box", "البوكس التالي ←": "Next box ←", "البوكس التالي": "Next box",
    "هذه الاختيارات لتحديد التوزيع الداخلي؛ المقاسات النهائية وإمكانية التنفيذ يراجعها المصمم.": "These choices set the interior layout; the designer reviews final sizes and feasibility.",
    "شوف اختياراتك في مكانها": "See your choices in place", "ادخل غرفتك ولفّ فيها 360°": "Step into your room and look around 360°",
    "استعرض غرفتك 360°": "View your room in 360°", "جاهز لتخصيص مساحتك؟": "Ready to customize your space?",
    "اكتملت اختيارات مساحتك": "Your space is fully chosen", "كل البوكسات لها اختيارات": "Every box has a choice",
    "راجع الاختيارات، ثم نزّل الملخص وأرسله للمصمم.": "Review your choices, then download the summary and send it to the designer.",
    "مراجعة الاختيارات": "Review choices", "الاختيارات تُحفظ على جهازك، ولا تُرسل تلقائيًا لأي جهة.": "Choices are saved on your device and are not sent anywhere automatically.",
    "تصميم التفاصيل التي تناسبك": "Designing the details that suit you", "بدء اختيارات جديدة": "Start new choices",
    "تفاصيل مساحتك": "Your space details", "ملخّص الاختيارات": "Choices summary", "اسم العميل": "Client name", "ملاحظات للمصمم": "Notes for the designer",
    "تحميل الملخّص": "Download summary", "طباعة / حفظ PDF": "Print / save PDF",
    "تحميل الملخص لا يرسله تلقائيًا. أرسل الملف للمصمم بعد المراجعة.": "Downloading the summary doesn't send it. Send the file to the designer after reviewing.",
    "وحدة الشباك": "Window unit", "أدراج ومكتب سحب": "Drawers and pull-out desk", "أدراج + مكتب سحب": "Drawers + pull-out desk", "الشباك": "Window",
    "وحدة ثابتة حسب التصميم المعتمد، مع سطح عمل يُسحب من الواجهة. لا تحتاج لاختيار Type.": "Fixed unit per the approved design, with a work surface that pulls out from the front. No Type choice needed.",
    "بدء اختيارات جديدة؟": "Start new choices?", "سيتم مسح اختيارات البوكسات الحالية على هذا الجهاز.": "The current box choices on this device will be cleared.",
    "امسح الاختيارات": "Clear choices", "احتفظ بها": "Keep them", "مدخل الغرفة": "Room entrance",
    "اختر تقسيمة": "Choose a layout", "اختَر تقسيمة": "Choose a layout", "حسب التصميم": "Per design", "لم يتم الاختيار": "Not chosen",
    "بانتظار اختيارك": "Awaiting your choice", "المقاسات حسب المخطط": "Sizes per plan",
    "وحدة ثابتة حسب التصميم، ولا تحتاج لاختيار Type.": "Fixed unit per design; no Type choice needed.",
    "تخيّل ترتيبك من الداخل": "Picture your interior", "افتح القائمة وشاهد الخيارات بالصور": "Open the list and see the options with pictures",
    "لا توجد نتائج بهذا البحث.": "No results for this search.", "تم مسح اختيار البوكس": "Box choice cleared", "تم بدء اختيارات جديدة": "New choices started",
    "تم تنزيل الملخص. أرسله للمصمم بعد المراجعة.": "Summary downloaded. Send it to the designer after reviewing.",
    "تعذّر الحفظ على الجهاز. نزّل ملف المشروع للاحتفاظ به.": "Couldn't save on this device. Download the project file to keep it.",
    "تعذّر الحفظ التلقائي. نزّل الملخص للاحتفاظ باختياراتك.": "Autosave failed. Download the summary to keep your choices.",
    "اضغط على كود البوكس لاختيار تقسيمته. الوحدات الثابتة حسب التصميم.": "Tap a box code to choose its layout. Fixed units are per design.",
    "ملاحظات": "Notes", "لا توجد ملاحظات.": "No notes.", "التاريخ:": "Date:", "العميل:": "Client:", "المكتمل:": "Completed:", "مرجع الكتالوج:": "Catalog ref:",
    "البوكس": "Box", "الاختيار": "Choice", "الصورة": "Picture",
    "وحدة الشباك: أدراج ومكتب سحب حسب التصميم المعتمد.": "Window unit: drawers and pull-out desk per the approved design.",
    "الوحدات الثابتة حسب التصميم المرفق.": "Fixed units per the attached design.",
    "الاختيارات لتحديد التوزيع؛ المقاسات والخلوص وإمكانية التنفيذ تراجع قبل الاعتماد.": "Choices set the layout; sizes, clearances and feasibility are reviewed before approval.",

    /* أنواع الخزائن والتقسيمات */
    "كورنر مشطوف": "Chamfered corner", "كورنر بواجهة مشطوفة": "Chamfered-front corner", "كورنر L": "L corner", "وحدة ثابتة حسب التصميم": "Fixed unit per design",
    "تعليق طويل": "Long hanging", "تعليق طويل ودرج": "Long hanging and drawer", "تعليق طويل وخانات علوية": "Long hanging and upper cubbies",
    "تعليق طويل وأرفف علوية": "Long hanging and upper shelves", "تعليق على مستويين": "Double hanging", "تعليق دورين": "Double hanging",
    "تعليق وأربعة أدراج": "Hanging and four drawers", "تعليق وأرفف جانبية": "Hanging and side shelves", "تعليق وأرفف ودرجان": "Hanging, shelves and two drawers",
    "تعليق وثلاثة أدراج": "Hanging and three drawers", "تعليق وحامل بناطيل": "Hanging and trouser rack", "تعليق وخانات ودرجان": "Hanging, cubbies and two drawers",
    "تعليق ودرج وحامل بناطيل": "Hanging, drawer and trouser rack", "تعليق وأرفف وأربعة أدراج": "Hanging, shelves and four drawers",
    "أرفف أحذية مائلة": "Angled shoe shelves", "أرفف كاملة": "Full shelves", "أرفف": "Shelves", "أرفف وتعليق وحامل بناطيل": "Shelves, hanging and trouser rack",
    "أرفف وثلاثة أدراج": "Shelves and three drawers", "أرفف وحامل بناطيل": "Shelves and trouser rack", "أرفف وخمسة أدراج": "Shelves and five drawers",
    "خانات وأرفف سفلية": "Cubbies and lower shelves", "خانات وثلاثة أدراج": "Cubbies and three drawers",

    /* المنظور 360 */
    "منظور 360°": "360° view", "التقسيمات المعتمدة لكل بوكس داخل مخطط الغرفة": "The approved layout of every box inside the room plan",
    "تعديل الاختيارات": "Edit choices", "داخل الغرفة": "Inside the room", "نظرة عامة": "Overview", "إعادة الكاميرا ↺": "Reset camera ↺",
    "داخل الغرفة · اسحب للنظر حولك، وتحرك بالأسهم": "Inside the room · drag to look around, move with the arrows",
    "عجلة الماوس أو إصبعان للتقدّم والرجوع": "Mouse wheel or two fingers to move forward and back",
    "تفاصيل العرض": "View details", "ارتفاع الخزائن": "Cabinet height", "ارتفاع توضيحي قابل للتغيير": "Illustrative height, adjustable",
    "ارتفاع الكاميرا": "Camera height", "إظهار الأكواد والـType": "Show codes and Type", "فتح المكتب السحب": "Open the pull-out desk",
    "حفظ صورة للمنظور ↓": "Save view image ↓",
    "عرض توضيحي للتوزيع الداخلي بدون ضلف. أبعاد المخطط محفوظة؛ ارتفاع الخزائن وخلوص الإكسسوارات تُراجع عند التنفيذ.": "Illustrative interior view without doors. Plan dimensions are kept; cabinet height and accessory clearances are reviewed at build time.",
    "عرض توضيحي للخزائن بدون ضلف أو حوائط، حسب البوكسات والمقياس المحددين على المخطط. تُراجع المقاسات والخلوص قبل التنفيذ.": "Illustrative view of the cabinets without doors or walls, from the boxes and scale on the plan. Sizes and clearances are reviewed before building.",
    "للحركة ·": "to move ·", "للالتفاف": "to turn", "اسحب المشهد للنظر حولك · اضغط الكود للاقتراب من البوكس": "Drag to look around · tap a code to go to that box",
    "حدد مسافة معروفة من «تعديل البوكسات والمقياس» لتشغيل المنظور.": "Set a known distance in “Edit boxes & scale” to enable the 360° view.",
    "المنظور جاهز بتقسيماتك المختارة": "The view is ready with your chosen layouts",
    "نظرة عامة · اسحب للدوران، وقرّب بعجلة الماوس أو بإصبعين": "Overview · drag to rotate, zoom with the mouse wheel or two fingers",
    "اقترب من خزانة…": "Go to a cabinet…",
    "تعذّر تشغيل العرض ثلاثي الأبعاد على هذا المتصفح. جرّب Chrome أو Safari أو Edge مع تفعيل تسريع الرسوميات.": "3D view couldn't start in this browser. Try Chrome, Safari or Edge with graphics acceleration on.",
    "لم يتم حفظ الصورة. يمكنك التقاط صورة للشاشة.": "The image wasn't saved. You can take a screenshot.",
    "توقّف عرض الرسوميات مؤقتًا. أغلق المنظور وافتحه مرة أخرى بعد لحظات.": "Graphics paused. Close the view and open it again in a moment.",
    "اختيار التقسيمة": "Choose layout", "ابحث بالاسم أو رقم الـType…": "Search by name or Type number…", "البحث في التقسيمات": "Search layouts",
    "إغلاق قائمة التايبات": "Close the type list", "أي تفضيلات أو تعديلات تحب نراعيها…": "Any preferences or changes we should consider…",
    "وحدة أدراج أسفل الشباك مع سطح المكتب مسحوبًا للخارج": "Drawer unit under the window with the desk pulled out",
    "إغلاق المنظور": "Close view", "وضع الكاميرا": "Camera mode", "الاقتراب من خزانة": "Go to a cabinet",
    "منظور ثلاثي الأبعاد للغرفة. اسحب للنظر حولك واستخدم الأسهم للتحرك.": "3D room view. Drag to look around and use the arrows to move.",
    "التحرك داخل الغرفة": "Move inside the room", "تقدّم": "Forward", "تحرّك يسارًا": "Move left", "ارجع للخلف": "Back", "تحرّك يمينًا": "Move right", "إعدادات المنظور": "View settings",

    /* مكتبة المخططات والمحرر */
    "مساحة مستقلة لكل عميل": "A separate space for every client", "اختار مخططك وابدأ": "Pick your plan and start",
    "ارفع مخطط الخزائن، أو افتح مشروعًا محفوظًا. لكل مخطط بوكساته واختياراته الخاصة.": "Upload a cabinet plan or open a saved project. Each plan has its own boxes and choices.",
    "+ رفع مخطط جديد": "+ Upload new plan", "صورة أو PDF": "Image or PDF", "فتح ملف مشروع": "Open project file", "JSON صادر من البرنامج": "JSON exported by the program",
    "المخططات محفوظة على جهازك. لنقلها لجهاز أو عميل آخر، حمّل ملف المشروع وأرسله معه.": "Plans are saved on your device. To move one to another device or client, download the project file and send it.",
    "مخططاتي": "My plans", "تجهيز المخطط": "Plan setup", "مخطط جديد": "New plan", "تعديل المخطط": "Edit plan", "حفظ وبدء الاختيارات ←": "Save and start choosing ←",
    "اسم المخطط / الغرفة": "Plan / room name", "ارتفاع الخزائن (م)": "Cabinet height (m)", "اختيار ملف المخطط": "Choose plan file", "صفحة PDF": "PDF page",
    "+ إضافة بوكس": "+ Add box", "ضبط المقياس للـ360°": "Set scale for 360°", "إلغاء النقطة": "Cancel point", "تكبير": "Zoom",
    "ارفع صورة أو PDF للمخطط أولًا.": "Upload a plan image or PDF first.", "مخططك يبدأ هنا": "Your plan starts here",
    "ارفع صورة أو PDF، ثم حدد كل بوكس بالضغط على ركنين متقابلين.": "Upload an image or PDF, then mark each box by tapping two opposite corners.",
    "بيانات البوكس": "Box details", "كود البوكس": "Box code", "شكل الوحدة": "Unit shape", "ناحية واجهة الخزانة": "Cabinet front faces",
    "عمق الكورنر (سم)": "Corner depth (cm)", "ارتفاع الوحدة الثابتة (سم)": "Fixed unit height (cm)", "يسار %": "Left %", "أعلى %": "Top %", "عرض %": "Width %", "ارتفاع %": "Height %",
    "تطبيق تعديل البوكس": "Apply box changes",
    "اضبط شكل الوحدة واتجاه واجهتها حتى تظهر التقسيمات في اتجاهها الصحيح داخل المنظور.": "Set the unit shape and front direction so layouts face the right way in the 3D view.",
    "المقياس": "Scale", "لم يُضبط. الاختيارات متاحة، والمنظور يحتاج مقياسًا.": "Not set. Choices work; the 3D view needs a scale.",
    "المقياس مضبوط · جاهز لتكوين المنظور عند اكتمال الاختيارات.": "Scale set · ready for the 3D view once choices are complete.",
    "المسافة الحقيقية بين النقطتين (سم)": "Real distance between the points (cm)", "اعتماد المقياس": "Apply scale", "البوكسات": "Boxes",
    "حدد حدود جسم كل خزانة، وليس كل ضلفة.": "Mark the body of each cabinet, not each door.",
    "إغلاق المحرر": "Close editor", "مثال: غرفة ملابس أستاذة غصون": "e.g. Ms. Ghosoun's dressing room", "مثال: 391": "e.g. 391",
    "جارٍ تجهيز المخطط…": "Preparing the plan…", "اضغط نهاية المسافة المعروفة، ثم اكتب طولها الحقيقي.": "Tap the end of the known distance, then type its real length.",
    "اضغط نقطتين بينهما مسافة تعرف مقاسها.": "Tap two points with a distance you know.", "اضغط الركن المقابل لإكمال البوكس.": "Tap the opposite corner to finish the box.",
    "اضغط ركنين متقابلين لتحديد بوكس.": "Tap two opposite corners to mark a box.", "اضغط بوكسًا لتعديله، أو «إضافة بوكس» لتحديد غيره.": "Tap a box to edit it, or “Add box” to mark another.",
    "لم تُضف بوكسات بعد.": "No boxes yet.", "تحديد بوكسات المخطط": "Mark plan boxes",
    "أعلى يسار ↖": "Top left ↖", "أعلى يمين ↗": "Top right ↗", "أسفل يمين ↘": "Bottom right ↘", "أسفل يسار ↙": "Bottom left ↙",
    "أسفل المخطط ↓": "Plan bottom ↓", "أعلى المخطط ↑": "Plan top ↑", "يمين المخطط →": "Plan right →", "يسار المخطط ←": "Plan left ←", "مكان الركنة المغلقة": "Closed corner position",
    "المخطط الأصلي · 9 بوكسات": "Original plan · 9 boxes", "مفتوح حاليًا": "Open now", "تحميل المشروع": "Download project", "حذف من الجهاز": "Delete from device",
    "ملف المشروع غير معتمد. اختر ملف JSON صادر من البرنامج.": "Unrecognised project file. Choose a JSON exported by the program.",
    "اكتب اسمًا للمخطط لا يزيد عن 100 حرف.": "Enter a plan name of up to 100 characters.", "صورة المخطط غير صالحة أو كبيرة جدًا.": "The plan image is invalid or too large.",
    "أبعاد صورة المخطط غير صالحة.": "Invalid plan image size.", "حدد من 1 إلى 100 بوكس على المخطط.": "Mark 1 to 100 boxes on the plan.",
    "أكواد البوكسات يجب أن تكون مختلفة، مثل B01 وB02.": "Box codes must differ, e.g. B01 and B02.", "نوع بوكس غير معروف.": "Unknown box type.",
    "حدد اتجاه واجهة كل بوكس.": "Set the front direction of every box.", "حدد اتجاه واجهة البوكس المستقيم.": "Set the front direction of the straight box.",
    "حدد الركن المغلق للكورنر.": "Set the corner's closed side.", "حدود بوكس غير صالحة.": "Invalid box bounds.", "أحد البوكسات خارج صورة المخطط.": "A box is outside the plan image.",
    "عمق الكورنر يجب أن يكون بين 20 و150 سم.": "Corner depth must be 20–150 cm.", "ارتفاع الوحدة الثابتة يجب أن يكون بين 20 و150 سم.": "Fixed unit height must be 20–150 cm.",
    "أضف خزانة واحدة على الأقل لاختيار تقسيمتها.": "Add at least one cabinet to choose a layout for.",
    "راجع المقياس: امتداد الخزائن أكبر من 30 مترًا.": "Check the scale: the cabinets span more than 30 m.",
    "راجع المقياس: أحد البوكسات أصغر من المقاس المناسب للرسم.": "Check the scale: a box is too small to draw.",
    "عمق الكورنر أكبر من مساحة ضلعيه. راجع حدود الكورنر أو العمق أو المقياس.": "The corner depth exceeds its sides. Check the corner bounds, depth or scale.",
    "مساحة الحركة ضيقة جدًا. راجع حدود البوكسات والمقياس.": "Walking space is too tight. Check the boxes and scale.",
    "ملف المشروع كبير جدًا.": "The project file is too large.", "المشروع مفتوح، لكن الحفظ على الجهاز تعذّر. احتفظ بملف المشروع.": "The project is open but couldn't be saved on this device. Keep the project file.",
    "تعذّر قراءة ملف JSON. اختر ملف مشروع صادر من البرنامج.": "Couldn't read the JSON file. Choose a project file exported by the program.",
    "إغلاق المحرر؟ التعديلات الجديدة لن تُحفظ قبل الضغط على حفظ.": "Close the editor? New changes aren't saved until you press Save.",
    "استبدال صورة المخطط سيحذف حدود البوكسات والمقياس داخل هذه المسودة. متابعة؟": "Replacing the plan image clears the boxes and scale in this draft. Continue?",
    "اختر ملفًا أصغر من 30 ميجابايت.": "Choose a file under 30 MB.", "الملفات المدعومة: PDF أو PNG أو JPG أو WebP.": "Supported files: PDF, PNG, JPG or WebP.",
    "تعذّر فتح صورة المخطط.": "Couldn't open the plan image.", "الـPDF محمي بكلمة مرور. ارفع نسخة مفتوحة أو صورة للمخطط.": "The PDF is password protected. Upload an unlocked copy or an image.",
    "تعذّر فتح المخطط. جرّب تصديره كصورة PNG.": "Couldn't open the plan. Try exporting it as a PNG.",
    "تغيير صفحة المخطط سيحذف حدود البوكسات في هذه المسودة. متابعة؟": "Changing the plan page clears the boxes in this draft. Continue?",
    "تعذّر عرض هذه الصفحة.": "Couldn't show this page.", "حدد نقطتين متباعدتين لضبط المقياس.": "Pick two points further apart to set the scale.",
    "المساحة صغيرة جدًا. اضغط ركنًا مقابلًا أبعد.": "Too small. Tap an opposite corner further away.",
    "اكتب كودًا مختلفًا بحروف إنجليزية وأرقام، مثل B01.": "Enter a different code using English letters and numbers, e.g. B01.",
    "راجع موضع البوكس وأبعاده داخل حدود الصورة.": "Check the box position and size within the image.",
    "اكتب المسافة الحقيقية بالسنتيمتر، من 10 إلى 10000 سم.": "Enter the real distance in cm, from 10 to 10000.",
    "تم فتح المخطط، لكن الحفظ على الجهاز تعذّر. حمّل ملف المشروع الآن.": "The plan is open but couldn't be saved on this device. Download the project file now.",
    "خزانة مستقيمة (straight)": "Straight cabinet",

    /* ---------- البوابة ---------- */
    "شريط الأدوات": "Toolbar", "مشاريع المالك": "Owner projects", "المشاريع": "Projects", "طريقة الرسم:": "Drawing method:", "طريقة الرسم": "Drawing method", "سحب": "Drag", "بالمقاسات": "By measurements", "تلقائي": "Automatic",
    "رسم بالسحب": "Draw by dragging", "اسحب على المخطط من ركن الخزانة للركن المقابل. اسحب البوكس عشان تحرّكه، ومن المربعات الصغيرة عشان تكبّره. البوكس بيلزق لوحده في حواف البوكسات اللي جنبه.": "Drag on the plan from one corner of the cabinet to the opposite one. Drag a box to move it, or its small squares to resize it. Boxes snap to the edges of neighbouring boxes.",
    "رسم بالمقاسات": "Draw by measurements", "اضغط أول الحيطة وآخرها (أو اسحب عليها) على الخط اللي الخزاين هتتركب عليه.": "Click the start and end of the wall (or drag along it) on the line the cabinets will sit against.",
    "اضغط آخر الحيطة.": "Click the end of the wall.", "اكتب المقاسات، وهتشوف البوكسات قبل ما تترص.": "Type the sizes; you'll see the boxes before they're placed.",
    "طول الحيطة (سم)": "Wall length (cm)", "عروض الخزاين بالترتيب (سم)": "Cabinet widths in order (cm)", "العمق (سم)": "Depth (cm)", "الخزاين ناحية:": "Cabinets on:",
    "امسك نقطة 1 أو 2 وحرّكها عشان تظبط الحيطة، واكتب المقاسات.": "Drag point 1 or 2 to adjust the wall, then type the sizes.",
    "اضغط آخر الحيطة (نقطة 2).": "Click the end of the wall (point 2).", "ميل البوكس (درجة)": "Box angle (degrees)",
    "تعذّر الاتصال بالسيرفر. اتأكد من الإنترنت وجرّب تاني.": "Couldn't reach the server. Check your internet and try again.", "الجلسة انتهت. ادخل تاني.": "Your session ended. Please sign in again.",
    "محاولات دخول غلط كتير. استنى 10 دقايق وجرّب تاني.": "Too many failed sign-ins. Wait 10 minutes and try again.", "حصلت مشكلة على السيرفر.": "Something went wrong on the server.",
    "مش مسموح.": "Not allowed.", "مش مسموحلك تمسح.": "You're not allowed to delete.", "ده لمدير النظام بس.": "Only the system admin can do this.", "تعذّر الاتصال. جرّب تاني.": "Couldn't connect. Try again.",
    "بالنقط": "Points", "رسم بالنقط": "Draw by points", "تم": "Done", "شيل آخر نقطة": "Remove last point", "ابدأ من الأول": "Start over",
    "اضغط على أركان الخزانة واحد ورا التاني حواليها. 4 نقط للخزانة المستقيمة، 5 للكورنر المشطوف، 6 للكورنر حرف L. اقفل الشكل بالضغط على نقطة 1 أو «تم». تقدر تمسك أي نقطة وتحرّكها قبل ما تخلّص.": "Click the cabinet's corners one after another around it. 4 points for a straight cabinet, 5 for a chamfered corner, 6 for an L corner. Close the shape by clicking point 1 or «Done». You can drag any point before you finish.",
    "اضغط على أركان الخزانة بالترتيب، واقفل الشكل على نقطة 1.": "Click the cabinet's corners in order, and close the shape on point 1.",
    "الشكل صغير قوي.": "The shape is too small.", "مش قادر أعرف شكل الزاوية. حط النقط على أركان الخزانة بالترتيب حواليها.": "Couldn't work out the corner shape. Place the points on the cabinet's corners in order around it.",
    "اتضافت. اضبط المقياس عشان عمق الزاوية يطلع مظبوط.": "Added. Set the scale so the corner depth comes out right.",
    "تحت الخط ↓": "Below the line ↓", "فوق الخط ↑": "Above the line ↑", "يمين الخط →": "Right of the line →", "شمال الخط ←": "Left of the line ←",
    "رص البوكسات": "Place boxes", "ارسم الحيطة من جديد": "Redraw the wall", "رسم تلقائي": "Automatic drawing",
    "«دوّر على الخزاين» بيعلّم المستطيلات اللي شكلها خزانة، واضغط على أي واحد منهم عشان يتضاف. أو ارسم تقريبي حوالين الخزانة، والبرنامج يظبط البوكس على خطوط المخطط.": "“Find cabinets” marks rectangles that look like cabinets; click any of them to add it. Or draw roughly around a cabinet and the box snaps to the plan's lines.",
    "دوّر على الخزاين": "Find cabinets", "إضافة الكل": "Add all", "تكرار": "Duplicate",
    "Ctrl+D تكرار البوكس · الأسهم للتحريك · Delete للحذف · Ctrl + العجلة للتكبير": "Ctrl+D duplicate · arrows move · Delete removes · Ctrl + wheel zooms",
    "حدد الحيطة، واكتب عروض الخزاين بالسنتي.": "Mark the wall, then type the cabinet widths in cm.", "دوّر على الخزاين، أو ارسم تقريبي حوالين كل خزانة.": "Find cabinets, or draw roughly around each cabinet.",
    "اسحب لرسم بوكس. اسحب البوكس لتحريكه، ومن أركانه لتكبيره.": "Drag to draw a box. Drag a box to move it, or its corners to resize it.",
    "بدوّر على الخزاين في المخطط…": "Looking for cabinets in the plan…", "مالقيتش مستطيلات واضحة. جرّب «ارسم تقريبي» على كل خزانة.": "No clear rectangles found. Try drawing roughly around each cabinet.",
    "مقدرتش أحلل الصورة دي.": "Couldn't analyse this image.", "ارسم خط الحيطة الأول.": "Draw the wall line first.", "اكتب طول الحيطة بالسنتي.": "Type the wall length in cm.",
    "اكتب عروض الخزاين بالسنتي، مثلًا: 90، 60، 120.": "Type the cabinet widths in cm, e.g. 90, 60, 120.", "البوكسات بتطلع برا المخطط. جرّب الناحية التانية أو راجع الطول.": "The boxes go outside the plan. Try the other side or check the length.",
    "العملاء": "Clients", "عرض 360°": "360° view", "مراجعة": "Review", "الإدارة": "Administration", "+ عميل جديد": "+ New client", "› كل العملاء": "‹ All clients", "+ مشروع للعميل ده": "+ Project for this client", "لسه مفيش عملاء": "No clients yet", "مفيش مشاريع للعميل ده.": "This client has no projects.", "جرّب اسم تاني للعميل أو المشروع.": "Try another client or project name.", "ابحث باسم العميل أو المشروع أو اسم المستخدم أو المهندس…": "Search by client, project, username or engineer…", "ابدأ بـ «عميل جديد» واعمله اسم مستخدم وكلمة مرور، وبعدين ضيفله مشروع أو أكتر.": "Start with “New client”, give them a username and password, then add one or more projects.", "اطلب من مدير النظام يضيف حسابات العملاء.": "Ask the system admin to add client accounts.", "الإعدادات": "Settings", "المستخدمين والصلاحيات": "Users & permissions",
    "ليلي / نهاري": "Dark / light", "تسجيل الدخول": "Sign in", "المالك يدخل باسم المستخدم وكلمة المرور اللي بعتهاله المهندس.": "Owners sign in with the username and password the engineer sent them.",
    "اسم المستخدم أو كلمة المرور غلط.": "Wrong username or password.",
    "لوحة المهندس": "Engineer panel", "+ مشروع جديد": "+ New project", "+ مالك جديد": "+ New owner", "+ مهندس جديد": "+ New engineer", "سجل التعديلات": "Change log",
    "ابحث باسم المشروع أو المالك أو اسم المستخدم أو المهندس…": "Search by project, owner, username or engineer…", "بحث عن مشروع أو عميل": "Search for a project or client",
    "حساب العميل": "Client account", "مالك جديد": "New owner", "تعديل حساب المالك": "Edit owner account",
    "المالك بيدخل بالحساب ده ويشوف كل مشاريعه، زي أكتر من غرفة دريسنج.": "The owner signs in with this account and sees all their projects, such as several dressing rooms.",
    "اسم المالك": "Owner name", "حفظ الحساب": "Save account", "صلاحيات المالك": "Owner permissions",
    "يعدّل الاختيارات (من غيرها يتفرج بس)": "Can edit choices (otherwise view only)", "يحفظ المقترح النهائي": "Can save the final proposal", "يبعت التقرير للمهندس": "Can send the report to the engineer",
    "المهندس المسؤول عن المالك": "Engineer responsible for the owner", "المهندس المسؤول عن المشروع": "Engineer responsible for the project",
    "بدون تحديد (أي مهندس)": "Not set (any engineer)", "زي المهندس المسؤول عن المالك": "Same as the owner's engineer", "أي مهندس": "any engineer",
    "مشروع": "Project", "اسم المشروع / الغرفة": "Project / room name", "مثال: دريسنج الماستر": "e.g. Master dressing room", "مخطط المشروع": "Project plan",
    "رفع مخطط جديد": "Upload new plan", "حفظ المشروع": "Save project", "تعديل المشروع": "Edit project", "مشروع جديد": "New project", "(المخطط التجريبي)": "(demo plan)",
    "بيانات دخول المالك": "Owner sign-in details", "ابعت البيانات دي للمالك. كلمة المرور مش هتظهر تاني، ولو نسيتها اعمل واحدة جديدة من «تعديل الحساب».": "Send these details to the owner. The password won't be shown again; if it's forgotten, set a new one from “Edit account”.",
    "مين عدّل إيه وإمتى": "Who changed what, and when", "المشروع": "Project", "التاريخ والوقت": "Date & time", "المستخدم": "User", "التعديل": "Change", "كل المشاريع": "All projects",
    "مفيش تعديلات متسجلة.": "No changes recorded.",
    "المهندسين ومديري النظام": "Engineers and system admins", "الملّاك (العملاء)": "Owners (clients)", "حساب": "Account", "مهندس جديد": "New engineer", "تعديل الحساب": "Edit account",
    "نوع الحساب": "Account type", "صلاحيات المهندس": "Engineer permissions", "يضيف ويعدّل حسابات الملّاك": "Can add and edit owner accounts",
    "يضيف ويعدّل المشاريع": "Can add and edit projects", "يحذف المشاريع وحسابات الملّاك": "Can delete projects and owner accounts", "يشوف سجل التعديلات": "Can view the change log",
    "كل الصلاحيات": "All permissions", "الملّاك": "Owners", "الحذف": "Delete", "السجل": "Log", "تعديل الاختيارات": "Edit choices", "المقترح النهائي": "Final proposal", "إرسال التقرير": "Send report",
    "سيبها فاضية لو مش هتغيّرها.": "Leave blank to keep it.", "لسه مفيش ملّاك.": "No owners yet.", "بدون صلاحيات": "No permissions",
    "لغة البرنامج": "Language", "الثيم": "Theme", "☀ نهاري": "☀ Light", "☾ ليلي": "☾ Dark", "تغيير كلمة المرور بتاعتي": "Change my password", "كلمة المرور الجديدة": "New password",
    "اتغيرت كلمة المرور.": "Password changed.",
    "المقترحات": "Proposals", "تقرير PDF": "PDF report", "مقترح ١": "Proposal 1", "مقترح ٢": "Proposal 2", "الاختيارات الحالية": "Current choices", "الاختيارات": "Choices",
    "احفظ اختياراتك الحالية كمقترح ١ أو مقترح ٢ عشان تقارن بينهم، ولما تستقر احفظها كمقترح نهائي.": "Save your current choices as Proposal 1 or Proposal 2 to compare them, and when you decide, save them as the final proposal.",
    "احفظ الاختيارات الحالية هنا": "Save current choices here", "استرجاع": "Restore", "لسه ماتحفظش": "Not saved yet",
    "اختار تقسيمة لبوكس واحد على الأقل قبل ما تحفظ المقترح.": "Choose a layout for at least one box before saving the proposal.",
    "هتحفظ الاختيارات الحالية كمقترح نهائي. متأكد؟": "Save the current choices as the final proposal. Are you sure?",
    "تقرير على ورق سكن جروب": "Report on Sakan Group letterhead", "تقرير الاختيارات": "Choices report", "نسخة التقرير": "Report version",
    "حفظ PDF / طباعة": "Save PDF / print", "إرسال التقرير للمهندس": "Send report to engineer",
    "تقرير اختيارات الخزائن": "Cabinet choices report", "النسخة": "Version", "المخطط": "Plan", "التاريخ": "Date", "الوقت": "Time", "المكتمل": "Completed", "تاريخ الحفظ": "Saved on",
    "الخزانة والمقاس": "Cabinet & size", "التقسيمة المختارة": "Chosen layout", "توقيع المالك": "Owner signature", "اعتماد المهندس": "Engineer approval",
    "سكن جروب · SAKAN GROUP": "SAKAN GROUP",
    "مفيش مشاريع لسه": "No projects yet", "ضيف مشروع للعميل ده من تبويب «العملاء».": "Add a project for this client from the “Clients” tab.",
    "المهندس لسه ماضافلكش مشاريع.": "The engineer hasn't added projects for you yet.", "لسه مفيش ملّاك": "No owners yet",
    "ابدأ بـ «مالك جديد» واعمله اسم مستخدم وكلمة مرور، وبعدين ضيفله مشروع أو أكتر.": "Start with “New owner”, give them a username and password, then add one or more projects.",
    "اطلب من مدير النظام يضيف حسابات الملّاك.": "Ask the system admin to add owner accounts.",
    "مفيش نتايج": "No results", "جرّب اسم تاني للمشروع أو المالك.": "Try another project or owner name.",
    "+ مشروع للمالك ده": "+ Project for this owner", "فتح المشروع": "Open project", "عرض التقرير": "View report", "مفيش مشاريع للمالك ده.": "This owner has no projects.",
    "لسه محدش عدّل": "No edits yet", "مفيش مشروع مفتوح. افتح مشروع من «العملاء» أو «مشاريع المالك».": "No project open. Open one from “Clients” or “Owner projects”.",
    "افتح مشروع الأول من «مشاريع المالك».": "Open a project first from “Owner projects”.", "المشروع ده مش موجود.": "This project doesn't exist.",
    "مخطط المشروع مش موجود على الجهاز ده. لحد ما السيرفر يتربط، المشروع بيشتغل على نفس الجهاز اللي المهندس عمله عليه.": "This project's plan isn't on this device. Until the server is connected, a project only works on the device the engineer created it on.",
    "لسه مفيش ملّاك": "No owners yet",
    /* السجل */
    "تسجيل دخول": "Signed in", "تسجيل خروج": "Signed out", "تعديل الاختيارات ": "Edited choices", "تعديل الملاحظات": "Edited notes", "مسح الملاحظات": "Cleared notes",
    "حذف مشروع": "Deleted project", "تعديل مشروع": "Edited project", "إضافة مشروع": "Added project", "حذف مالك": "Deleted owner", "تعديل مالك": "Edited owner", "إضافة مالك": "Added owner",
    "حذف حساب": "Deleted account", "تعديل حساب": "Edited account", "إضافة حساب": "Added account", "تغيير كلمة المرور": "Changed password",
    "حفظ تقرير PDF": "Saved PDF report", "إرسال تقرير للمهندس": "Sent report to engineer", "كلمة مرور جديدة": "new password",
    /* أخطاء البيانات */
    "مساحة التخزين على الجهاز اتملت. امسح مشاريع قديمة وجرّب تاني.": "Device storage is full. Delete old projects and try again.",
    "اكتب اسم المالك.": "Enter the owner's name.", "اكتب اسم المشروع.": "Enter the project name.", "اكتب الاسم.": "Enter the name.",
    "اسم المستخدم من 3 لـ 30 حرف إنجليزي أو رقم (مسموح . _ -).": "Username must be 3–30 English letters or digits (. _ - allowed).",
    "اسم المستخدم ده مستخدم قبل كده. اختار اسم تاني.": "That username is taken. Choose another.",
    "كلمة المرور 4 حروف أو أرقام على الأقل.": "Password must be at least 4 characters.",
    "لما تغيّر اسم المستخدم اكتب كلمة مرور جديدة كمان.": "When changing the username, enter a new password too.",
    "اختار مالك المشروع.": "Choose the project owner.", "اختار مخطط المشروع.": "Choose the project plan.", "المشروع مش موجود.": "Project not found.",
    "الحساب مش موجود.": "Account not found.", "لازم يفضل فيه مدير نظام واحد على الأقل.": "There must be at least one system admin.",
    "العربية": "العربية", "اسم المستخدم:": "Username:", "المهندس المسؤول": "Responsible engineer",
    /* مسودة واعتماد */
    "حفظ": "Save", "حفظ مسودة": "Save draft", "اختيار المالك": "Owner's choices", "المخططات والملفات": "Plans & files", "اعتماد نهائي": "Final approval", "رجوع لمسودة للتعديل": "Back to draft to edit", "مسودة": "Draft", "معتمد نهائي ✓": "Approved ✓",
    "تعديلات مش محفوظة": "Unsaved changes", "اتحفظت الاختيارات كمسودة.": "Choices saved as a draft.", "اتعتمدت الاختيارات.": "Choices approved.",
    "فيه تعديلات في الاختيارات لسه ماتحفظتش. تحفظها قبل ما تكمل؟": "You have unsaved changes to the choices. Save them before continuing?",
    "اعتماد نهائي للاختيارات؟ بعد الاعتماد مش هتتعدل غير لو رجعتها مسودة.": "Approve the choices as final? After approval they can't be edited unless returned to draft.",
    "اعتماد نهائي للاختيارات": "Approved choices as final",
    "ترجّع الاختيارات مسودة عشان تعدّل عليها؟ هيتسجل في السجل إنها اتفتحت تاني.": "Return the choices to draft to edit them? The log will record that they were reopened.",
    "الاختيارات معتمدة. رجّعها مسودة الأول عشان تعدّل.": "The choices are approved. Return them to draft first to edit.",
    "يعتمد الاختيارات نهائي ويحفظ المقترح النهائي": "Can approve choices and save the final proposal",
    /* الاعتماد للتصنيع وطلب التعديل */
    "تم الاعتماد - ابدأ التصنيع": "Approved – start manufacturing", "تم الاعتماد - في التصنيع ✓": "Approved – in manufacturing ✓",
    "فتح للتعديل": "Reopen for editing", "طلب السماح بالتعديل": "Request permission to edit", "السماح بالتعديل": "Allow editing",
    "رفض الطلب": "Reject request", "رفض طلب التعديل": "Edit request rejected",
    "طلب التعديل مستني موافقة مدير النظام": "Edit request awaiting system admin approval",
    "مدير النظام سمح بالتعديل": "System admin allowed editing", "مدير النظام رفض طلب التعديل": "System admin rejected the edit request",
    "اتبعت الطلب لمدير النظام.": "Request sent to the system admin.",
    "إيه التعديل اللي محتاجه؟ الطلب هيروح لمدير النظام.": "What change do you need? The request will go to the system admin.",
    "مفيش طلب تعديل.": "There is no edit request.", "الاختيارات لسه مسودة، تقدر تعدّل عادي.": "The choices are still a draft; you can edit them.",
    "تم الاعتماد - ابدأ التصنيع؟ بعد كده الاختيارات مش هتتعدل غير لو مدير النظام سمح بالتعديل.": "Approve and start manufacturing? After that the choices can't be edited unless the system admin allows it.",
    "تسمح للمالك يعدّل الاختيارات؟ هترجع مسودة.": "Allow the owner to edit the choices? They will go back to draft.",
    "ترفض طلب التعديل؟": "Reject the edit request?",
    "ترجّع الاختيارات مسودة عشان تتعدل؟ هيتسجل في السجل إنها اتفتحت تاني.": "Return the choices to draft for editing? The log will record that they were reopened.",
    "الاختيارات معتمدة ومقفولة. اطلب من مدير النظام السماح بالتعديل.": "The choices are approved and locked. Ask the system admin for permission to edit.",
    "فيه طلب تعديل مستني الموافقة.": "An edit request is already pending.",
    /* المخططات والملفات */
    "المخططات": "Plans", "المهندس بيرفع المخطط، والمالك بيختار عليه": "The engineer uploads the plan; the owner chooses on it",
    "لسه مفيش مخططات مرفوعة": "No plans uploaded yet", "ارفع صورة أو PDF للمخطط، وحدد عليه البوكسات.": "Upload a plan image or PDF and mark its boxes.",
    "المقياس مضبوط": "Scale set", "من غير مقياس": "No scale", "مش مستخدم في أي مشروع": "Not used in any project",
    "حذف مخطط": "Deleted plan", "حفظ مخطط": "Saved plan", "يضيف ويعدّل المشاريع والمخططات": "Can add and edit projects and plans",
    "يضيف ملفات للمشروع (مخططات وتصاميم ومحاضر)": "Can add project files (plans, designs, minutes)",
    "يحذف المشاريع والمخططات والملفات وحسابات الملّاك": "Can delete projects, plans, files and owner accounts",
    "ملفات المشروع": "Project files", "مخططات": "Plans", "تصاميم": "Designs", "محاضر اجتماعات": "Meeting minutes", "نوع الملف": "File type",
    "+ إضافة ملف": "+ Add file", "فتح": "Open", "تنزيل": "Download", "اتضاف الملف.": "File added.", "إضافة ملف": "Added file", "حذف ملف": "Deleted file",
    "تعذّر حفظ الملف على الجهاز.": "Couldn't save the file on this device.", "الملف أكبر من 25 ميجابايت.": "The file is larger than 25 MB.",
    /* التعليقات والإشعارات */
    "التعليقات": "Comments", "إرسال": "Send", "اكتب تعليقك…": "Write a comment…", "اكتب تعليقك": "Write a comment", "اكتب التعليق الأول.": "Write a comment first.",
    "اكتب أي سؤال أو طلب للمهندس هنا، وهيوصله إشعار.": "Write any question or request for the engineer here; they'll get a notification.",
    "مفيش تعليقات لسه.": "No comments yet.", "تعليق من المالك": "Owner comment", "رد على المالك": "Reply to owner",
    "الإشعارات": "Notifications", "مفيش جديد.": "Nothing new.", "تعليق جديد": "New comment", "تقرير مبعوت": "Report sent",
  };

  /* نصوص فيها أرقام أو أسماء. الجزء اللي بين الأقواس بيتترجم لو ليه ترجمة. */
  const RULES = [
    [/^مخطط علوي · (\d+) بوكسات للاختيار$/, "Top-view plan · $1 boxes to choose"],
    [/^مخطط علوي · (\d+) بوكسات$/, "Top-view plan · $1 boxes"],
    [/^اخترت (\d+) من (\d+) بوكسات$/, "$1 of $2 boxes chosen"],
    [/^باقي (\d+) بوكسات$/, "$1 boxes left"],
    [/^أكمل اختيار (\d+) بوكسات لعرض الغرفة$/, "Choose $1 more boxes to view the room"],
    [/^(\d+) اختيارات مناسبة$/, "$1 matching options"],
    [/^(\d+) اختيارًا$/, "$1 options"],
    [/^(\d+) من (\d+) اختيارات مكتملة$/, "$1 of $2 choices complete"],
    [/^(\d+) من (\d+) اختيارات$/, "$1 of $2 choices"],
    [/^(\d+) من (\d+) بوكسات$/, "$1 of $2 boxes"],
    [/^(\d+) اختيارات$/, "$1 choices"],
    [/^(\d+) بوكسات للاختيارات$/, "$1 boxes for choices"],
    [/^(\d+) وحدات محددة$/, "$1 units marked"],
    [/^(\d+) بوكسات$/, "$1 boxes"],
    [/^(\d+) مشاريع$/, "$1 projects"],
    [/^(\d+) ملّاك$/, "$1 owners"],
    [/^(\d+) عملاء$/, "$1 clients"],
    [/^إضافة الكل \((\d+)\)$/, "Add all ($1)"],
    [/^(\S) تبديل الناحية$/, "$1 Switch side"],
    [/^الطول على المقياس: (\d+) سم · الميل: (-?\d+)°$/, "Length on scale: $1 cm · Angle: $2°"],
    [/^الميل: (-?\d+)°$/, "Angle: $1°"],
    [/^(\d+) نقط$/, "$1 points"],
    [/^(\d+) نقط · خزانة مستقيمة$/, "$1 points · straight cabinet"],
    [/^(\d+) نقط · كورنر مشطوف$/, "$1 points · chamfered corner"],
    [/^(\d+) نقط · كورنر حرف L$/, "$1 points · L corner"],
    [/^اتحطت (\d+) نقط\. الخزانة المستقيمة 4 نقط، والكورنر المشطوف 5، والكورنر حرف L ست نقط\.$/, "$1 points placed. A straight cabinet takes 4 points, a chamfered corner 5, and an L corner 6."],
    [/^مجموع العروض ([\d.]+) سم أكبر من طول الحيطة ([\d.]+) سم\.$/, "The widths add up to $1 cm, more than the $2 cm wall."],
    [/^(\d+) اختيارات محفوظة$/, "$1 saved choices"],
    [/^عرض ([\d.,]+) سم$/, "Width $1 cm"],
    [/^عمق ([\d.,]+) سم$/, "Depth $1 cm"],
    [/^ضلعان ([\d.,]+) × ([\d.,]+) سم$/, "Sides $1 × $2 cm"],
    [/^([\d.,]+) م$/, "$1 m"],
    [/^صفحة (\d+) \/ (\d+)$/, "Page $1 / $2"],
    [/^اقترب من (.+)$/, "Go to $1"],
    [/^تم حفظ اختيار (\S+) — (.+)$/, "Saved $1 — $2"],
    [/^سكن جروب \/ (.+)$/, "Sakan Group / $1"],
    [/^سكن جروب \| (.+)$/, "Sakan Group | $1"],
    [/^ملخص اختيارات (.+)$/, "Choices summary — $1"],
    [/^(\S+): اختار (.+)$/, "$1: chose $2"],
    [/^(\S+): مسح (.+)$/, "$1: cleared $2"],
    [/^(\S+): من (.+) إلى (.+)$/, "$1: from $2 to $3"],
    [/^آخر تعديل (.+)$/, "Last edit $1"],
    [/^اتبعت تقرير «(.+)» للمهندس\. لو عايز تبعته بنفسك كمان، اضغط «حفظ PDF» وابعت الملف\.$/, "The “$1” report was sent to the engineer. To send it yourself too, press “Save PDF” and send the file."],
    [/^اتبعت تقرير «(.+)» (.+)$/, "“$1” report sent $2"],
    [/^اتحفظ «(.+)»\.$/, "“$1” saved."],
    [/^رجعت اختيارات «(.+)»\.$/, "“$1” choices restored."],
    [/^«(.+)» محفوظ قبل كده\. تستبدله بالاختيارات الحالية؟$/, "“$1” is already saved. Replace it with the current choices?"],
    [/^ترجّع اختيارات «(.+)»؟ .*$/, "Restore the “$1” choices? Your current choices will change (save them in a proposal first if you want to keep them)."],
    [/^حذف مشروع «(.+)»؟ .*$/, "Delete project “$1”? Its proposals and choices will be removed."],
    [/^حذف حساب «(.+)»؟ المالك .*و(\d+) مشاريع.*$/, "Delete “$1”'s account? The owner won't be able to sign in, and their $2 projects will be removed."],
    [/^حذف حساب «(.+)»؟ مش هيقدر يدخل تاني\.$/, "Delete “$1”'s account? They won't be able to sign in."],
    [/^حذف «(.+)» من هذا الجهاز؟ .*$/, "Delete “$1” from this device? Keep the project file if you want to open it later."],
    [/^المشروع «(.+)» موجود\. .*$/, "Project “$1” exists. Open the incoming copy and replace the saved one?"],
    [/^اعتمده (.+?) · (.+) · مدير النظام رفض طلب التعديل$/, "Approved by $1 · $2 · System admin rejected the edit request"],
    [/^(.+) طالب السماح بالتعديل: (.+)$/, "$1 requests permission to edit: $2"],
    [/^(.+) طالب السماح بالتعديل$/, "$1 requests permission to edit"],
    [/^اعتمده (.+)$/, "Approved by $1"],
    [/^آخر حفظ (.+)$/, "Last saved $1"],
    [/^رجعت اختيارات «(.+)»\. اضغط «حفظ مسودة» عشان تتحفظ\.$/, "“$1” choices restored. Press “Save draft” to keep them."],
    [/^حذف حساب «(.+)»؟ المالك مش هيقدر يدخل تاني، و(\d+) مشاريع بتاعته هيتمسحوا\.$/, "Delete “$1”'s account? The owner won't be able to sign in, and their $2 projects will be removed."],
    [/^المخطط ده مستخدم في (\d+) مشاريع\. .*$/, "This plan is used in $1 projects. Change those projects' plan first via “Edit”."],
    [/^حذف مخطط «(.+)»؟$/, "Delete plan “$1”?"],
    [/^حذف الملف «(.+)»؟$/, "Delete file “$1”?"],
    [/^مفيش (.+) في المشروع ده\.$/, "No $1 in this project."],
    [/^اتضاف (\d+) ملفات\.$/, "$1 files added."],
    [/^مستخدم في: (.+)$/, "Used in: $1"],
    [/^(.+) \((\d+)\)$/, "$1 ($2)"],
    [/^حفظ (.+)$/, "Saved $1"],
    [/^استرجاع (.+)$/, "Restored $1"],
    [/^المالك ([^:].*)$/, "Owner $1"],
    [/^المهندس المسؤول ([^:].*)$/, "Responsible engineer $1"],
    [/^(.+) ([✓✕—])$/, "$1 $2"],
    [/^(.*) \((.+)\)$/, "$1 ($2)"],
    [/^([^:]{1,40}): (.*)$/, "$1: $2"],
  ];

  const AR = /[؀-ۿ]/;
  const SEPARATORS = [" · ", " • ", "، ", " — ", "\n"];
  let lang = "ar";

  function tr(text) {
    const norm = text.replace(/\s+/g, " ").trim();
    if (!norm || !AR.test(norm)) return null;
    if (EN[norm] !== undefined) return EN[norm];
    if (/^[·•] /.test(norm)) { const rest = tr(norm.slice(2)); return rest ? norm.slice(0, 2) + rest : null; }
    for (const [re, out] of RULES) {
      const m = norm.match(re);
      if (!m) continue;
      return out.replace(/\$(\d)/g, (_, i) => { const g = m[i] || ""; return tr(g) || g; });
    }
    for (const sep of SEPARATORS) {
      const parts = (sep === "\n" ? text : norm).split(sep);
      if (parts.length < 2) continue;
      const done = parts.map((p) => tr(p) || p.trim());
      if (done.some((p, i) => p !== parts[i].trim())) return done.join(sep === "، " ? ", " : sep);
    }
    return null;
  }

  /* ---------- ترجمة الشاشة ---------- */
  const textOrig = new Map();   // text node → { orig, shown }
  const attrOrig = new Map();   // element → { attr: { orig, shown } }
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  let observer = null;

  function doText(node) {
    const cur = node.nodeValue, rec = textOrig.get(node);
    if (rec && cur === rec.shown) return;
    const t = tr(cur);
    if (!t) { if (rec) textOrig.delete(node); return; }
    const lead = cur.match(/^\s*/)[0], trail = cur.match(/\s*$/)[0];
    const shown = lead + t + trail;
    textOrig.set(node, { orig: cur, shown });
    node.nodeValue = shown;
  }
  function doAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a), recs = attrOrig.get(el) || {}, rec = recs[a];
      if (rec && cur === rec.shown) continue;
      const t = tr(cur);
      if (!t) continue;
      recs[a] = { orig: cur, shown: t };
      attrOrig.set(el, recs);
      el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
    doAttrs(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && (n.tagName === "SCRIPT" || n.tagName === "STYLE") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = it.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }

  function start() {
    walk(document.body);
    observer = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") doText(m.target);
        else if (m.type === "attributes") doAttrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function stop() {
    if (observer) observer.disconnect();
    observer = null;
    for (const [node, rec] of textOrig) if (node.nodeValue === rec.shown) node.nodeValue = rec.orig;
    for (const [el, recs] of attrOrig) for (const a in recs) if (el.getAttribute(a) === recs[a].shown) el.setAttribute(a, recs[a].orig);
    textOrig.clear();
    attrOrig.clear();
  }

  // رسايل التأكيد والتنبيه اللي البرنامج بيطلعها
  const nativeConfirm = window.confirm.bind(window), nativeAlert = window.alert.bind(window);
  window.confirm = (msg) => nativeConfirm(lang === "en" ? tr(String(msg)) || msg : msg);
  window.alert = (msg) => nativeAlert(lang === "en" ? tr(String(msg)) || msg : msg);
  const nativePrompt = window.prompt.bind(window);
  window.prompt = (msg, def) => nativePrompt(lang === "en" ? tr(String(msg)) || msg : msg, def);

  function setLang(next) {
    next = next === "en" ? "en" : "ar";
    const root = document.documentElement;
    root.lang = next;
    root.dir = next === "en" ? "ltr" : "rtl";
    if (next === lang && (next === "ar" || observer)) return;
    lang = next;
    if (lang === "en") start(); else stop();
  }

  return { setLang, lang: () => lang, t: (s) => (lang === "en" ? tr(s) || s : s), tr };
})();
