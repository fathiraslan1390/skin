/* =====================================================================
 * portal.js — بوابة سكن جروب جوه البرنامج
 * ---------------------------------------------------------------------
 * - شريط أدوات أسود فوق: «مشاريع المالك» (للمالك والمهندس)، «المشاريع»
 *   (للمهندس والمدير)، «المستخدمين والصلاحيات» (لمدير النظام بس)،
 *   «الإعدادات» (اللغة والثيم وكلمة المرور)، واسم المستخدم وخروج.
 * - شاشة دخول لمدير النظام والمهندس والمالك (العميل).
 * - مدير النظام: يفتح حسابات المهندسين والملّاك ويحدد صلاحيات كل واحد.
 * - المالك حساب واحد وتحته مشروع أو أكتر (مثلاً أكتر من غرفة دريسنج).
 * - المهندس: يضيف الملّاك والمشاريع ويعدّلهم ويحذفهم ويشوف السجل،
 *   كل ده حسب الصلاحيات اللي المدير اداهاله.
 * - المدير يحدد مهندس مسؤول للمالك أو للمشروع. المهندس بيشوف اللي هو
 *   مسؤول عنه، واللي مالوش مهندس محدد.
 * - بحث عن مشروع أو مالك في تبويب «المشاريع».
 * - بعد الدخول البرنامج بيفتح على آخر مشروع اشتغلت عليه، والقوايم في التبويبات.
 * - الاختيارات زي سند القيد: «حفظ» بيحفظها مسودة، و«اعتماد نهائي» بيقفلها،
 *   وعشان تعدّل بعد الاعتماد لازم «رجوع لمسودة».
 * - المخططات: المهندس بيرفعها ويعدّلها ويحذفها، والمالك بيختار عليها بس.
 * - ملفات المشروع: مخططات وتصاميم ومحاضر اجتماعات كمرجع.
 * - تعليقات جوه المشروع، وإشعارات بالجديد (جرس في الشريط الأسود).
 * - سجل بكل تعديل: مين (مهندس/مالك) عدّل إيه، بالتاريخ والوقت.
 * - المقترحات: مقترح ١، مقترح ٢، المقترح النهائي.
 * - تقرير PDF شكله ورق رسمي بلوجو سكن جروب، والمالك يبعته للمهندس.
 *
 * بيعتمد على: APP_DATA و PlanProjects و INDESIGN_APP و INDESIGN_PROJECTS_UI
 * (البرنامج الأصلي)، و SakanPortalAPI (portal-api.js) للبيانات،
 * و SakanI18n (i18n.js) للغة الإنجليزي.
 * ===================================================================== */

(function () {
  "use strict";

  const API = window.SakanPortalAPI, APP = window.INDESIGN_APP, UI = window.INDESIGN_PROJECTS_UI, P = window.PlanProjects, I18N = window.SakanI18n;
  const $ = (id) => document.getElementById(id);
  // الصورة الشخصية: صورة صغيرة data:image، ولو مفيش بيظهر أول حرف من الاسم
  const okAvatar = (a) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(a || ""));
  const avatarHTML = (u, cls, id) => {
    const letter = String((u && u.name) || "?").replace(/^(أ|م|د|ا|م\.|د\.)\.\s*/, "").trim().charAt(0) || "?";
    return `<span class="sk-avatar ${cls || ""}"${id ? ` id="${id}"` : ""}>${u && okAvatar(u.avatar) ? `<img src="${u.avatar}" alt="">` : esc(letter)}</span>`;
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const SESSION = "sakan:session", PREFS = "sakan:prefs";

  const SLOTS = { p1: "مقترح ١", p2: "مقترح ٢", final: "المقترح النهائي" };
  const ROLE = { admin: "مدير النظام", engineer: "مهندس", client: "مالك", guest: "زائر" };

  let user = null;        // المستخدم الداخل دلوقتي
  let project = null;     // المشروع المفتوح دلوقتي (أو null)
  let saved = { selections: {}, notes: "" };  // آخر نسخة محفوظة من الاختيارات
  let dirty = false;      // فيه تعديلات لسه ماتحفظتش
  let muted = false;      // وإحنا بنحمّل اختيارات بنفسنا مانعتبرهاش تعديل
  let pendingForm = null; // فورم المشروع وقت ما المهندس بيرفع مخطط جديد
  let reportSlot = "current";
  let ownerView = "";     // المالك المعروض في «مشاريع المالك» (للمهندس)
  let returnTo = null;    // النافذة اللي نرجعلها بعد حفظ فورم
  const FILE_CATS = { plans: "مخططات", designs: "تصاميم", minutes: "محاضر اجتماعات" };
  let fileCat = "plans";

  /* ---------------- أدوات صغيرة ---------------- */
  const locale = () => (I18N.lang() === "en" ? "en-GB" : "ar-EG");
  const fmtDate = (iso) => new Date(iso).toLocaleString(locale(), { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const fmtDay = (d) => d.toLocaleDateString(locale(), { year: "numeric", month: "long", day: "numeric" });
  const fmtTime = (d) => d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
  const count = (sel) => Object.keys(sel || {}).length;
  const by = () => ({ username: user.username, name: user.name, role: user.role });
  const notice = (msg) => window.dispatchEvent(new CustomEvent("indesign:notice", { detail: msg }));
  const typeLabel = (id) => { const t = APP.typeOf(id); return t ? t.label : "؟"; };
  const isEng = () => !!user && (user.role === "engineer" || user.role === "admin");   // مهندس أو مدير
  const isAdmin = () => !!user && user.role === "admin";
  const isGuest = () => !!user && user.role === "guest";   // الزائر بيتفرج على معرض الأعمال بس، من غير حساب
  /* الصلاحيات: المدير يقدر كل حاجة، والباقي حسب اللي المدير حدده */
  const can = (perm) => isAdmin() || (!!user && !!user.perms && !!user.perms[perm]);
  /* المهندس المسؤول: المهندس بيشوف مشاريعه واللي مالهاش مهندس محدد */
  const mineProject = (p) => !user || user.role !== "engineer" || !p.responsible || p.responsible === user.username;
  const mineOwner = (o, projects) => !user || user.role !== "engineer" || !o.engineer || o.engineer === user.username || projects.some((p) => p.ownerId === o.id && mineProject(p));
  const engineerLine = (p) => `المهندس المسؤول: ${p.responsibleName ? esc(p.responsibleName) : "أي مهندس"}`;
  async function engineerOptions(emptyLabel) {
    const staff = (await API.listStaff()).filter((e) => e.role === "engineer");
    return `<option value="">${emptyLabel}</option>` + staff.map((e) => `<option value="${esc(e.username)}">${esc(e.name)} (${esc(e.username)})</option>`).join("");
  }
  function say(id, msg, isError) {
    const el = $(id);
    el.textContent = msg || "";
    el.hidden = !msg;
    el.classList.toggle("sk-error", !!isError);
  }
  // تبويبات الشريط الأسود بتفتح كلوحة تحته (مش modal) عشان الشريط يفضل شغال،
  // والفورمات والتأكيدات بتفتح modal عادي.
  function open(id) {
    const d = $(id);
    if (!d.open) d.classList.contains("sk-panel") ? d.show() : d.showModal();
    markTab();
  }
  function close(id) { const d = $(id); if (d.open) d.close(); }
  // الزائر مالوش غير المعرض، فمابيتقفلش
  function closeAll() { document.querySelectorAll("dialog.sk-dialog[open]").forEach((d) => { if (!(isGuest() && d.id === "skGallery")) d.close(); }); }

  function log(action, details, p = project) {
    if (!user || isGuest()) return Promise.resolve();
    return API.addLog({
      username: user.username, name: user.name, role: user.role,
      projectId: p ? p.id : null, projectName: p ? p.name : "",
      action, details: details || "",
    }).catch((e) => console.error(e));
  }

  function saveSession() {
    try { sessionStorage.setItem(SESSION, JSON.stringify(user ? { username: user.username, role: user.role, projectId: project && project.id } : null)); } catch (e) {}
  }
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION) || "null"); } catch (e) { return null; }
  }

  /* ---------------- الإعدادات: اللغة والثيم ---------------- */
  function readPrefs() {
    try { return Object.assign({ lang: "ar", theme: "light" }, JSON.parse(localStorage.getItem(PREFS) || "{}")); }
    catch (e) { return { lang: "ar", theme: "light" }; }
  }
  function applyPrefs(prefs) {
    try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {}
    document.documentElement.dataset.theme = prefs.theme;
    I18N.setLang(prefs.lang);
    document.querySelectorAll("[data-set-lang]").forEach((b) => b.setAttribute("aria-checked", b.dataset.setLang === prefs.lang));
    document.querySelectorAll("[data-set-theme]").forEach((b) => b.setAttribute("aria-checked", b.dataset.setTheme === prefs.theme));
    document.querySelectorAll(".sk-login-prefs [data-set-lang]").forEach((b) => (b.hidden = b.dataset.setLang === prefs.lang));
  }
  function setPref(key, value) {
    const prefs = readPrefs();
    if (prefs[key] === value) return;
    prefs[key] = value;
    applyPrefs(prefs);
    if (key === "lang") rerenderOpen();
  }
  // بعد تغيير اللغة نعيد رسم النوافذ المفتوحة عشان التواريخ تتكتب باللغة الجديدة
  function rerenderOpen() {
    updateChrome();
    if ($("skOwner").open) renderOwner();
    if ($("skProjects").open) renderProjects();
    if ($("skLog").open) renderLog();
    if ($("skProposals").open) renderProposals();
    if ($("skReport").open) renderReport();
    if ($("skGallery").open) renderGallery();
  }

  /* ---------------- شريط الأدوات الأسود ---------------- */
  function injectChrome() {
    document.querySelectorAll("[data-sk-logo]").forEach((img) => (img.src = APP_DATA.logo));
    document.querySelectorAll("[data-sk-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
    document.querySelectorAll("dialog.sk-dialog").forEach((d) => d.addEventListener("close", markTab));
    $("skLogin").addEventListener("cancel", (e) => e.preventDefault());

    document.body.prepend($("skTopnav"));
    document.querySelector("main").insertAdjacentHTML("afterbegin", '<section class="sk-no-project-card" id="skNoProject"></section>');
    document.body.prepend($("skScrim"));
    document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => {
      const id = b.dataset.tab, wasOpen = $(id).open;
      closeAll();
      if (wasOpen) return;
      if (id === "skGallery") openGallery();
      else if (id === "skOwner") openOwner();
      else if (id === "skProjects") { clientView = ""; archiveView = false; $("skSearch").value = ""; openProjects(); }
      else if (id === "skUsers") openUsers();
      else if (id === "skNotify") openNotify();
      else if (id === "skSettings") {
        $("skOpenLog").hidden = !can("viewLog");
        $("skOpenPlans").hidden = !can("manageProjects") && !can("deleteItems");
        $("skAdminTools").hidden = $("skOpenLog").hidden && $("skOpenPlans").hidden;
        open(id);
      }
      else open(id);
    }));
    $("skLogout").onclick = logout;
    $("skMe").onclick = () => { if (!isGuest()) openProfile(); };
    $("skScrim").onclick = closeAll;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.querySelector("dialog[open]:modal")) closeAll(); });

    document.querySelectorAll("[data-set-lang]").forEach((b) => (b.onclick = () => setPref("lang", b.dataset.setLang)));
    document.querySelectorAll("[data-set-theme]").forEach((b) => (b.onclick = () => setPref("theme", b.dataset.setTheme)));
    document.querySelectorAll("[data-toggle-theme]").forEach((b) => (b.onclick = () => setPref("theme", readPrefs().theme === "dark" ? "light" : "dark")));

    const strip = document.querySelector(".project-strip > div");
    const label = document.createElement("small");
    label.id = "skProjectLabel";
    label.className = "sk-project-label";
    strip.appendChild(label);

    // المنظور 360° وشريط «مراجعة» اتشالوا بطلب العميل (الإخفاء في portal.css)
    // تبويبات المشروع تحت هيدر المخطط
    const stripBox = document.querySelector(".project-strip");
    stripBox.insertAdjacentHTML("beforeend",
      `<nav class="sk-strip-tabs sk-need-project">
        <button id="skCommentsBtn">التعليقات <span id="skCommentsCount" class="sk-count" hidden></span></button>
        <button id="skFilesBtn">المخططات والملفات</button>
        <button id="skProposalsBtn">المقترحات</button>
        <button id="skReportBtn">إرسال واتساب</button>
      </nav>`);
    $("skProposalsBtn").onclick = openProposals;
    $("skReportBtn").onclick = () => openReport("current");
    $("skFilesBtn").onclick = openFiles;
    $("skCommentsBtn").onclick = openComments;

    // شريط حالة الاختيارات: مسودة / معتمد
    stripBox.insertAdjacentHTML("beforeend",
      `<section class="sk-workbar" id="skWorkbar" hidden>
        <b class="sk-workbar-title">اختيار المالك</b>
        <span class="sk-status" id="skWorkStatus"></span>
        <span class="sk-muted" id="skWorkInfo"></span>
        <span class="sk-workbar-actions">
          <button class="sk-btn sk-btn-blue" id="skSaveWork">حفظ كمسودة</button>
          <button class="sk-btn sk-btn-green" id="skApprove">حفظ نهائي للتصنيع</button>
          <button class="sk-btn" id="skReopen">فتح للتعديل</button>
          <button class="sk-btn" id="skRequestEdit">طلب السماح بالتعديل</button>
          <button class="sk-btn sk-btn-dark" id="skAllowEdit">السماح بالتعديل</button>
          <button class="sk-btn sk-danger" id="skRejectEdit">رفض الطلب</button>
        </span>
      </section>`);
    $("skSaveWork").onclick = () => saveWork();
    $("skApprove").onclick = approveWork;
    $("skReopen").onclick = reopenWork;
    $("skRequestEdit").onclick = requestEdit;
    $("skAllowEdit").onclick = () => resolveEdit(true);
    $("skRejectEdit").onclick = () => resolveEdit(false);
    $("skEmptyOpen") && ($("skEmptyOpen").onclick = () => (isEng() ? openProjects() : openOwner()));
  }

  function markTab() {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", $(b.dataset.tab).open));
    $("skScrim").hidden = !document.querySelector("dialog.sk-panel[open]");
  }

  function updateChrome() {
    document.body.classList.toggle("sk-role-engineer", isEng());
    document.body.classList.toggle("sk-role-client", !!user && user.role === "client");
    document.body.classList.toggle("sk-role-admin", isAdmin());
    document.body.classList.toggle("sk-role-guest", isGuest());
    // المالك اللي مالوش صلاحية تعديل بيتفرج بس
    document.body.classList.toggle("sk-readonly", !!user && user.role === "client" && !can("edit"));
    document.body.classList.toggle("sk-can-log", can("viewLog"));
    document.body.classList.toggle("sk-has-project", !!project);
    syncEmpty();
    $("skTopnav").hidden = !user;
    if (!user) { $("skProjectLabel").textContent = ""; updateWorkbar(); return; }
    $("skUserName").textContent = user.name;
    $("skMe").title = `${user.name} · ${ROLE[user.role]}`;
    $("skMeAvatar").outerHTML = avatarHTML(user, "sk-avatar-sm", "skMeAvatar");
    $("skLogout").textContent = isGuest() ? "تسجيل الدخول" : "خروج";
    if (isGuest()) { $("skProjectLabel").textContent = ""; document.title = "سكن جروب | معرض أعمالنا"; updateWorkbar(); return; }
    $("skProjectLabel").textContent = project
      ? `مشروع: ${project.name} · المالك: ${project.ownerName}`
      : (isEng() ? "لا يوجد مشروع مفتوح. افتح مشروعًا من «العملاء»." : "لم يضف المهندس أي مشاريع لك بعد.");
    if (project) document.title = "سكن جروب | " + project.name;
    updateWorkbar();
  }

  /* لما مفيش مشروع مفتوح، بدل المخطط التجريبي بتظهر رسالة فاضية بالخطوة الجاية */
  function syncEmpty() {
    const empty = !project && (!P.current || P.current.builtin);
    document.body.classList.toggle("sk-no-project", empty);
    const el = $("skNoProject");
    if (!el || !empty) return;
    if (!user) { el.innerHTML = ""; return; }
    el.innerHTML = isEng()
      ? `<b>لا يوجد مشروع مفتوح</b><p>افتح مشروعًا من «العملاء»، أو أضف عميلًا ومشروعًا جديدًا.</p>
         <div class="sk-actions"><button class="sk-btn sk-btn-dark" data-empty="clients">العملاء</button>${can("manageProjects") ? '<button class="sk-btn" data-empty="plans">المخططات</button>' : ""}</div>`
      : `<b>لا توجد مشاريع بعد</b><p>سيظهر مشروعك هنا بمجرد أن يضيفه المهندس المسؤول.</p>`;
    el.querySelectorAll("[data-empty]").forEach((b) => (b.onclick = () => (b.dataset.empty === "plans" ? openPlans() : $("skTabProjects").click())));
  }
  window.addEventListener("indesign:project", () => setTimeout(syncEmpty, 0));

  /* ---------------- مسودة / اعتماد نهائي ---------------- */
  const approved = () => !!project && !!project.work && project.work.status === "approved";
  const canEdit = () => !!user && (user.role !== "client" || can("edit"));
  const canApprove = () => !!user && (user.role !== "client" || can("final"));

  function updateWorkbar() {
    const bar = $("skWorkbar");
    if (!bar) return;
    bar.hidden = !project;
    document.body.classList.toggle("sk-locked", approved());
    if (!project) return;
    const w = project.work || {};
    const st = $("skWorkStatus");
    st.className = "sk-status " + (approved() ? "approved" : dirty ? "dirty" : "draft");
    const req = project.editRequest, pending = approved() && !!req && req.status === "pending";
    st.textContent = approved() ? "تم الاعتماد - في التصنيع ✓" : dirty ? "تعديلات غير محفوظة" : "مسودة";
    $("skWorkInfo").textContent = pending
      ? (isAdmin() ? `${req.by.name} يطلب السماح بالتعديل${req.reason ? ": " + req.reason : ""}` : "طلب التعديل بانتظار موافقة مدير النظام")
      : approved()
      ? `اعتمده ${w.approvedBy ? w.approvedBy.name : ""} · ${fmtDate(w.approvedAt)}${req && req.status === "rejected" && user.role === "client" ? " · مدير النظام رفض طلب التعديل" : ""}`
      : w.updatedAt ? `آخر حفظ ${fmtDate(w.updatedAt)} · ${w.updatedBy ? w.updatedBy.name : ""}` : "لم يُحفظ بعد";
    // بعد الاعتماد: مدير النظام بس اللي يفتح التعديل، والمالك يطلب منه
    $("skRequestEdit").hidden = !approved() || user.role !== "client" || pending;
    $("skAllowEdit").hidden = $("skRejectEdit").hidden = !pending || !isAdmin();
    $("skSaveWork").hidden = approved() || !canEdit();
    $("skSaveWork").disabled = !dirty;
    $("skSaveWork").classList.toggle("sk-btn-dark", dirty);
    $("skApprove").hidden = approved() || !canApprove() || !canEdit();
    $("skApprove").classList.toggle("sk-btn-dark", !dirty);
    $("skReopen").hidden = !approved() || !isAdmin() || pending;
    $("skWorkInfo").hidden = !approved() && !pending;   // سطر «آخر حفظ» اتشال؛ بيظهر بس بعد الحفظ النهائي أو لو فيه طلب تعديل
  }

  /* ---------------- الدخول والخروج ---------------- */
  function showLogin() {
    $("skLoginForm").reset();
    say("skLoginError", "");
    open("skLogin");
    setTimeout(() => $("skLoginUser").focus(), 50);
  }

  $("skLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    say("skLoginError", "");
    let u;
    try { u = await API.login($("skLoginUser").value.trim(), $("skLoginPass").value); }
    catch (err) { return say("skLoginError", err.message || "تعذّر الاتصال. حاول مرة أخرى.", true); }
    if (!u) return say("skLoginError", "اسم المستخدم أو كلمة المرور غير صحيحة.", true);
    user = u;
    close("skLogin");
    await enter(null, true);
  });

  // الزائر: من غير حساب، وبيفتح على معرض الأعمال على طول
  $("skGuest").onclick = () => enterGuest();
  function enterGuest() {
    user = { role: "guest", username: "", name: "زائر", avatar: "", perms: {} };
    project = null;
    close("skLogin");
    APP.loadProject(P.builtin);
    updateChrome();
    saveSession();
    openGallery();
  }

  async function enter(projectId, fresh) {
    project = null;
    updateChrome();
    if (fresh) await log("تسجيل دخول", ROLE[user.role]);
    // بعد تسجيل الدخول بتظهر قائمة المشاريع وهو يختار. فتح الصفحة من جديد (الجلسة محفوظة) بيرجع لنفس المشروع
    const list = (await API.listProjects(user.role === "client" ? user.ownerId : undefined)).filter(mineProject);
    const target = projectId && list.find((p) => p.id === projectId);
    if (target) await openProject(target.id);
    else APP.loadProject(P.builtin);
    updateChrome();
    if (!target) await (isEng() ? openProjects() : openOwner()); // المهندس والمدير على «العملاء»، والمالك على مشاريعه
    saveSession();
    refreshNotifications();
  }

  /* ---------------- الصورة الشخصية ---------------- */
  function openProfile() {
    $("skProfileTitle").textContent = user.name;
    $("skProfileRole").textContent = ROLE[user.role];
    $("skProfileAvatar").outerHTML = avatarHTML(user, "sk-avatar-xl", "skProfileAvatar");
    $("skAvatarRemove").hidden = !user.avatar;
    say("skProfileError", "");
    closeAll();
    open("skProfile");
  }
  // بنصغّر الصورة لمربع 192 بكسل قبل الحفظ، عشان تبقى خفيفة
  async function squareImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = new Image(); im.src = url; await im.decode();
      const side = Math.min(im.width, im.height), c = document.createElement("canvas");
      c.width = c.height = 192;
      c.getContext("2d").drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 192, 192);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }
  async function saveAvatar(avatar) {
    try {
      const u = await API.setAvatar(user, avatar);
      user.avatar = (u && u.avatar) || "";
      updateChrome();
      openProfile();
      notice(avatar ? "تم حفظ صورتك." : "تم حذف صورتك.");
    } catch (err) { say("skProfileError", err.message || "تعذّر حفظ الصورة.", true); }
  }
  $("skAvatarFile").onchange = async () => {
    const f = $("skAvatarFile").files[0]; $("skAvatarFile").value = "";
    if (!f) return;
    let data;
    try { data = await squareImage(f); } catch (e) { return say("skProfileError", "تعذّرت قراءة الصورة. اختر صورة بصيغة JPG أو PNG.", true); }
    saveAvatar(data);
  };
  $("skAvatarRemove").onclick = () => saveAvatar("");

  async function logout() {
    if (!(await leaveProject())) return;
    await log("تسجيل خروج");
    closeAll();
    if (API.logout && !isGuest()) API.logout().catch(() => {});
    user = null; project = null; dirty = false; ownerView = "";
    closeAll();
    close("skLightbox");
    saveSession();
    APP.loadProject(P.builtin);
    updateChrome();
    showLogin();
  }

  /* ---------------- فتح مشروع ---------------- */
  async function findPlan(planId) {
    if (!planId || planId === P.builtin.id) return P.builtin;
    const plan = (await P.list()).find((q) => q.id === planId);
    if (!plan) return null;
    try { return P.validate(plan); } catch (e) { return plan; }
  }

  // قبل ما نسيب المشروع: لو فيه تعديلات غير محفوظة نسأل
  async function leaveProject() {
    if (!project || !dirty) return true;
    if (confirm("توجد تعديلات في الاختيارات لم تُحفظ بعد. هل تريد حفظها قبل المتابعة؟")) return saveWork();
    dirty = false;
    return true;
  }

  async function openProject(id) {
    if (project && project.id === id) { closeAll(); return; }
    if (!(await leaveProject())) return;
    const p = await API.getProject(id);
    // المالك مايفتحش غير مشاريعه (والسيرفر لازم يتأكد من ده كمان)
    if (!p || (user.role === "client" && p.ownerId !== user.ownerId) || !mineProject(p)) { notice("هذا المشروع غير موجود."); return; }
    const plan = await findPlan(p.planId);
    if (!plan) {
      // المخطط اتحذف: المهندس يختار للمشروع مخطط جديد
      if (can("manageProjects")) { if (confirm(`مخطط مشروع «${p.name}» محذوف. هل تريد اختيار مخطط جديد له الآن؟`)) openProjectForm(p); }
      else alert("مخطط هذا المشروع غير متاح حاليًا. تواصل مع المهندس المسؤول.");
      return;
    }
    project = p;          // لازم قبل activate عشان حدث indesign:project مايفصلش المشروع
    muted = true;
    await UI.activate(plan);
    useCustom(p.work && p.work.custom);   // قبل setState عشان الاختيارات المخصصة تتعرف
    APP.setState(p.work && p.work.selections, p.ownerName, p.work ? p.work.notes : "");
    saved = { selections: APP.getSelections(), notes: $("clientNotes").value, custom: custom.length };
    dirty = false;
    muted = false;
    closeAll();
    updateChrome();
    saveSession();
    refreshNotifications();
    rotateTip();
  }

  // المالك على الموبايل وهو ماسكه بالطول: نصيحة مرة واحدة إنه يقلبه بالعرض. لو قلبه بتختفي، ولو قفلها مابترجعش
  const portrait = () => matchMedia("(orientation: portrait) and (max-width: 820px) and (pointer: coarse)").matches;
  function rotateTip() {
    const key = "sakan:rotateTip:" + user.username.toLowerCase();
    let seen = false;
    try { seen = !!localStorage.getItem(key); } catch (e) {}
    if (user.role !== "client" || seen || !portrait() || $("skRotateTip")) return;
    try { localStorage.setItem(key, "1"); } catch (e) {}
    document.body.insertAdjacentHTML("beforeend", `<div class="sk-rotate-tip" id="skRotateTip" role="dialog" aria-live="polite" aria-labelledby="skRotateTitle">
      <div class="sk-rotate-card">
        <svg class="sk-rotate-icon" viewBox="0 0 64 64" aria-hidden="true"><rect x="22" y="8" width="20" height="36" rx="4"/><path d="M14 40a20 20 0 0 0 30 14"/><path d="M40 50l4 4-5 3"/></svg>
        <b id="skRotateTitle">من فضلك اقلب الموبايل بالعرض</b>
        <p>اختيار التقسيمات أسهل وأوضح والموبايل بالعرض. ويمكنك المتابعة بالطول إذا أردت.</p>
        <button class="sk-btn sk-btn-dark" id="skRotateOk">حسنًا</button>
      </div></div>`);
    const tip = $("skRotateTip"), done = () => { tip.remove(); removeEventListener("resize", check); };
    const check = () => { if (!portrait()) done(); };
    $("skRotateOk").onclick = done;
    addEventListener("resize", check);
  }

  // لو المهندس فتح مخطط تاني من المكتبة الأصلية، المشروع مايبقاش مربوط بيه
  window.addEventListener("indesign:project", () => {
    if (pendingForm && !P.current.builtin) {
      const form = pendingForm;
      pendingForm = null;
      form.planId = P.current.id;
      project = null;
      setTimeout(() => openProjectForm(form), 0);
    }
    if (project && P.current.id !== project.planId) { project = null; useCustom([]); updateChrome(); saveSession(); }
  });

  /* ---------------- التقسيمات المخصصة: صور بيرفعها المستخدم للمشروع ----------------
     بتتحفظ مع الاختيارات (work.custom)، وكل واحدة تايب رقمه مميز وبيظهر بس في تبويب «تقسيم مخصص» */
  let custom = [];
  const cleanName = (v) => String(v || "").replace(/[<>"'&`]/g, "").trim().slice(0, 60);
  function useCustom(list) {
    custom = (Array.isArray(list) ? list : []).filter((t) => t && Number.isFinite(t.id) && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t.image || ""))
      .map((t) => ({ id: t.id, label: cleanName(t.label) || "مخصص", name: cleanName(t.name) || "تقسيمة مخصصة", kind: t.kind, image: t.image, cat: "custom" }));
    APP.addTypes(custom);
    window.skCustomIds = custom.map((t) => t.id);
    APP.refreshTypes();
  }
  function shrink(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", 0.82));
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(Error("تعذّرت قراءة الصورة. اختر صورة بصيغة JPG أو PNG.")); };
      im.src = url;
    });
  }
  async function addCustom(file) {
    if (!project) return alert("افتح مشروعًا أولًا لإضافة تقسيمة مخصصة.");
    if (approved()) return alert("الاختيارات معتمدة ومقفلة. اطلب من مدير النظام السماح بالتعديل.");
    if (custom.length >= 60) return alert("وصلت إلى الحد الأقصى للتقسيمات المخصصة في هذا المشروع (60).");
    let image;
    try { image = await shrink(file); } catch (e) { return alert(e.message); }
    const n = custom.length + 1, t = { id: Date.now(), label: "مخصص " + n, name: cleanName($("skCustomName").value) || "تقسيمة مخصصة " + n, kind: APP.activeKind(), image, cat: "custom" };
    useCustom(custom.concat([t]));
    $("skCustomName").value = "";
    APP.pick(t.id);
    checkDirty();
  }

  /* ---------------- تسجيل كل تعديل ---------------- */
  function describeChanges(a, b) {
    const ids = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return ids.filter((id) => a[id] !== b[id]).map((id) =>
      !a[id] ? `${id}: اختر ${typeLabel(b[id])}` :
      !b[id] ? `${id}: مسح ${typeLabel(a[id])}` :
      `${id}: من ${typeLabel(a[id])} إلى ${typeLabel(b[id])}`);
  }

  const sameSel = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  function checkDirty() {
    if (muted || !project || !user) return;
    dirty = !sameSel(saved.selections, APP.getSelections()) || saved.notes !== $("clientNotes").value || saved.custom !== custom.length;
    updateWorkbar();
  }
  window.addEventListener("indesign:selection", checkDirty);
  $("clientNotes").addEventListener("input", checkDirty);
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* «حفظ»: الاختيارات بتتحفظ مسودة، والسجل بيكتب إيه اللي اتغير من آخر حفظ */
  async function saveWork() {
    if (!project || approved()) return false;
    const sel = APP.getSelections(), notes = $("clientNotes").value;
    const changes = describeChanges(saved.selections, sel);
    try {
      project = await API.saveWork(project.id, { selections: sel, notes, custom, by: by() });
    } catch (e) { alert(e.message); return false; }
    if (changes.length) await log("تعديل الاختيارات", changes.join("، "));
    if (notes !== saved.notes) await log("تعديل الملاحظات", notes.trim().length > 80 ? notes.trim().slice(0, 80) + "…" : notes.trim() || "مسح الملاحظات");
    saved = { selections: sel, notes, custom: custom.length };
    dirty = false;
    updateWorkbar();
    notice("تم حفظ الاختيارات كمسودة.");
    return true;
  }

  async function approveWork() {
    if (!project) return;
    if (!confirm("حفظ نهائي للتصنيع؟ بعد ذلك لن يمكن تعديل الاختيارات إلا إذا سمح مدير النظام بالتعديل.")) return;
    if (dirty && !(await saveWork())) return;
    try {
      project = await API.approveWork(project.id, by());
      // الاعتماد بيتحفظ كمان كمقترح نهائي
      project = await API.saveProposal(project.id, "final", { selections: saved.selections, notes: saved.notes, by: by() });
    } catch (e) { alert(e.message); return; }
    await log("حفظ نهائي للتصنيع", `${count(saved.selections)} من ${APP.boxes().length} اختيارات`);
    updateWorkbar();
    notice("تم اعتماد الاختيارات.");
  }

  async function requestEdit() {
    const reason = prompt("ما التعديل الذي تحتاجه؟ سيُرسل الطلب إلى مدير النظام.");
    if (reason === null) return;
    try { project = await API.requestEdit(project.id, reason, by()); } catch (e) { alert(e.message); return; }
    await log("طلب السماح بالتعديل", reason.trim());
    updateWorkbar();
    notice("تم إرسال الطلب إلى مدير النظام.");
  }

  async function resolveEdit(allow) {
    if (!confirm(allow ? "هل تسمح للمالك بتعديل الاختيارات؟ ستعود إلى مسودة." : "هل تريد رفض طلب التعديل؟")) return;
    try { project = await API.resolveEdit(project.id, allow, by()); } catch (e) { alert(e.message); return; }
    await log(allow ? "السماح بالتعديل" : "رفض طلب التعديل", project.editRequest.by.name);
    updateWorkbar();
    refreshNotifications();
  }

  async function reopenWork() {
    if (!project) return;
    if (!confirm("هل تريد إعادة الاختيارات إلى مسودة لتعديلها؟ سيُسجَّل في السجل أنها فُتحت مرة أخرى.")) return;
    try { project = await API.reopenWork(project.id, by()); } catch (e) { alert(e.message); return; }
    await log("إعادة إلى مسودة للتعديل");
    updateWorkbar();
  }

  /* ---------------- كروت المشاريع (مشتركة بين الشاشتين) ---------------- */
  function slotChips(p) {
    return Object.keys(SLOTS).map((k) => {
      const pr = p.proposals && p.proposals[k];
      return `<span class="sk-chip ${pr ? "on" : ""}">${SLOTS[k]} ${pr ? "✓" : "—"}</span>`;
    }).join("");
  }
  // حالة المشروع يحددها المهندس. المشروع اللي مالوش حالة: «معتمد» لو اتحفظ نهائي، وإلا «تحت الدراسة»
  const STAGES = { study: "تحت الدراسة", approved: "معتمد", progress: "جاري التنفيذ", done: "منتهي" }, STAGE_KEYS = Object.keys(STAGES);
  const stageOf = (p) => (STAGES[p.stage] ? p.stage : p.work && p.work.status === "approved" ? "approved" : "study");
  const stageChip = (p) => `<span class="sk-stage sk-stage-${stageOf(p)}"><i class="sk-dot" aria-hidden="true"></i>${STAGES[stageOf(p)]}</span>`;
  function projectFacts(p) {
    const last = p.work && p.work.updatedAt
      ? `آخر تعديل ${fmtDate(p.work.updatedAt)} · ${esc(p.work.updatedBy.name)} (${ROLE[p.work.updatedBy.role]})`
      : "لم يعدّل أحد بعد";
    const rep = (p.reports || []).slice(-1)[0];
    return `<span class="sk-stage-row">${stageChip(p)}</span><span class="sk-muted">المخطط: ${esc(p.planTitle || "—")} · ${count(p.work && p.work.selections)} اختيارات</span>
      ${isEng() ? `<span class="sk-muted">${engineerLine(p)}</span>` : ""}
      <span class="sk-muted">${last}</span>
      <span class="sk-chips">${slotChips(p)}</span>
      ${rep ? `<span class="sk-sent">تم إرسال تقرير «${SLOTS[rep.slot] || "الاختيارات الحالية"}» ${fmtDate(rep.sentAt)}</span>` : ""}`;
  }
  function wireProjectButtons(root, byId) {
    root.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openProject(b.dataset.open)));
    root.querySelectorAll("[data-report]").forEach((b) => (b.onclick = async () => { await openProject(b.dataset.report); openReport(b.dataset.slot); }));
    root.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openProjectForm(byId.get(b.dataset.edit))));
    root.querySelectorAll("[data-log]").forEach((b) => (b.onclick = () => openLog(b.dataset.log)));
    root.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      const p = byId.get(b.dataset.del);
      if (!confirm(`حذف مشروع «${p.name}»؟ ستُحذف مقترحاته واختياراته.`)) return;
      await API.deleteProject(p.id);
      await log("حذف مشروع", `${p.name} · المالك ${p.ownerName}`, p);
      if (project && project.id === p.id) { project = null; dirty = false; }
      updateChrome();
      rerenderOpen();
    }));
  }
  const reportButton = (p) => { const rep = (p.reports || []).slice(-1)[0]; return rep ? `<button class="sk-btn" data-report="${p.id}" data-slot="${rep.slot}">عرض التقرير</button>` : ""; };

  /* ---------------- مشاريع المالك (للمالك والمهندس) ---------------- */
  async function openOwner(ownerId) {
    if (!user) return;
    if (ownerId) ownerView = ownerId;
    open("skOwner");
    await renderOwner();
  }

  async function renderOwner() {
    let ownerId = user.ownerId, ownerName = user.name;
    if (isEng()) {
      const all = await API.listProjects();
      const owners = (await API.listOwners()).filter((o) => mineOwner(o, all));
      if (!owners.some((o) => o.id === ownerView)) ownerView = project ? project.ownerId : (owners[0] ? owners[0].id : "");
      $("skOwnerPick").innerHTML = owners.map((o) => `<option value="${o.id}">${esc(o.name)} (${esc(o.username)})</option>`).join("") || `<option value="">لا يوجد ملّاك بعد</option>`;
      $("skOwnerPick").value = ownerView;
      ownerId = ownerView;
      const o = owners.find((x) => x.id === ownerId);
      ownerName = o ? o.name : "";
    }
    $("skOwnerEyebrow").textContent = ownerName;
    const list = ownerId ? (await API.listProjects(ownerId)).filter((p) => mineProject(p) && !p.archived) : [];
    const el = $("skOwnerList");
    if (!list.length) {
      el.innerHTML = `<div class="sk-empty"><b>لا توجد مشاريع بعد</b><p>${isEng() ? "أضف مشروعًا لهذا العميل من تبويب «العملاء»." : "لم يضف المهندس أي مشاريع لك بعد."}</p></div>`;
      return;
    }
    el.innerHTML = list.map((p) => `<article class="sk-room ${project && project.id === p.id ? "current" : ""}">
        <b>${esc(p.name)}</b>
        ${projectFacts(p)}
        <div class="sk-actions">
          <button class="sk-btn sk-btn-dark" data-open="${p.id}">${project && project.id === p.id ? "مفتوح حاليًا" : "فتح المشروع"}</button>
          ${isEng() ? reportButton(p) : ""}
        </div>
      </article>`).join("");
    wireProjectButtons(el, new Map(list.map((p) => [p.id, p])));
  }
  $("skOwnerPick").onchange = () => { ownerView = $("skOwnerPick").value; renderOwner(); };

  /* ---------------- المشاريع (للمهندس بس) ---------------- */
  let searchTimer;
  $("skSearch").oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderProjects, 150); };

  async function openProjects() {
    if (!isEng()) return;
    $("skNewProject").hidden = true; // إضافة المشروع من صفحة العميل
    $("skNewOwner").hidden = !can("manageOwners");
    open("skProjects");
    await renderProjects();
  }

  // تبويب «العملاء»: قايمة العملاء مرتبة بالاسم، وبالضغط على عميل تظهر مشاريعه
  let clientView = "", archiveView = false;
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), "ar");

  async function renderProjects() {
    const all = (await API.listProjects()).filter(mineProject);
    const owners = (await API.listOwners()).filter((o) => mineOwner(o, all)).sort(byName);
    const el = $("skProjectList");
    if (clientView && !owners.some((o) => o.id === clientView)) clientView = "";
    $("skClientFilter").hidden = !!clientView;
    $("skClientsToolbar").hidden = !!clientView || !can("manageOwners");
    $("skSearchCount").hidden = true;
    document.querySelectorAll("[data-archive-view]").forEach((b) => b.setAttribute("aria-checked", b.dataset.archiveView === (archiveView ? "1" : "")));
    if (!owners.length) {
      el.innerHTML = `<div class="sk-empty"><b>لا يوجد عملاء بعد</b><p>${can("manageOwners") ? "ابدأ بـ «عميل جديد» وأنشئ له اسم مستخدم وكلمة مرور، ثم أضف له مشروعًا أو أكثر." : "اطلب من مدير النظام إضافة حسابات العملاء."}</p></div>`;
      return;
    }
    const canOwners = can("manageOwners"), canProjects = can("manageProjects"), canDel = can("deleteItems"), canLog = can("viewLog");

    // جدول العملاء: اسم العميل، المنطقة، المشاريع تحت الدراسة، المشاريع المعتمدة
    if (!clientView) {
      const q = $("skSearch").value.trim().toLowerCase();
      const hit = (...texts) => texts.some((t) => String(t || "").toLowerCase().includes(q));
      const rows = owners.filter((o) => !!o.archived === archiveView).map((o) => {
        const projects = all.filter((p) => p.ownerId === o.id && !p.archived);
        const matched = q && !hit(o.name, o.username, o.region, o.engineerName) ? all.filter((p) => p.ownerId === o.id && hit(p.name, p.planTitle, p.responsibleName)) : [];
        return { o, projects, matched };
      }).filter((r) => !q || hit(r.o.name, r.o.username, r.o.region, r.o.engineerName) || r.matched.length);
      $("skSearchCount").hidden = !q;
      $("skSearchCount").textContent = `${rows.length} عملاء`;
      if (!rows.length) {
        el.innerHTML = q ? `<div class="sk-empty"><b>لا توجد نتائج</b><p>جرّب اسمًا آخر للعميل أو المشروع.</p></div>`
          : `<div class="sk-empty"><b>${archiveView ? "لا يوجد عملاء في الأرشيف" : "كل العملاء في الأرشيف"}</b></div>`;
        return;
      }
      const n = (list, st) => list.filter((p) => stageOf(p) === st).length;
      el.innerHTML = `<div class="sk-table-wrap"><table class="sk-table sk-clients-table">
        <thead><tr><th>اسم العميل</th><th>المنطقة</th><th>المشاريع تحت الدراسة</th><th>المشاريع المعتمدة</th></tr></thead>
        <tbody>${rows.map(({ o, projects, matched }) => `<tr data-client="${o.id}" tabindex="0">
          <td><span class="sk-name-cell">${avatarHTML(o, "sk-avatar-sm")}<b>${esc(o.name)}</b></span>${matched.length ? `<small class="sk-client-hit">${matched.map((p) => esc(p.name)).join("، ")}</small>` : ""}</td>
          <td>${o.region ? esc(o.region) : `<span class="sk-muted">—</span>`}</td>
          <td class="sk-num">${n(projects, "study")}</td>
          <td class="sk-num">${n(projects, "approved")}</td>
        </tr>`).join("")}</tbody></table></div>`;
      el.querySelectorAll("tr[data-client]").forEach((tr) => {
        tr.onclick = () => { clientView = tr.dataset.client; renderProjects(); };
        tr.onkeydown = (e) => { if (e.key === "Enter") tr.onclick(); };
      });
      return;
    }

    // صفحة العميل: تفاصيله، وتحتها جدول مشاريعه (اسم المشروع وحالته)
    const o = owners.find((x) => x.id === clientView);
    const mine = all.filter((p) => p.ownerId === o.id), live = mine.filter((p) => !p.archived), old = mine.filter((p) => p.archived);
    // نفس شكل جدول العملاء: الضغط على الصف بيفتح المشروع، والحالة بتتغير من الخانة بتاعتها، والباقي تحت «⋯»
    const row = (p) => `<tr class="${project && project.id === p.id ? "current" : ""}" data-row-open="${p.id}" tabindex="0">
        <td><b>${esc(p.name)}</b></td>
        <td>${canProjects && !p.archived ? `<span class="sk-stage-pick-wrap sk-stage-${stageOf(p)}"><i class="sk-dot" aria-hidden="true"></i><select class="sk-stage-pick" data-stage="${p.id}" aria-label="حالة المشروع">${STAGE_KEYS.map((k) => `<option value="${k}" ${stageOf(p) === k ? "selected" : ""}>${STAGES[k]}</option>`).join("")}</select></span>` : stageChip(p)}</td>
        <td>${p.work && p.work.updatedAt ? new Date(p.work.updatedAt).toLocaleDateString(locale(), { year: "numeric", month: "short", day: "numeric" }) : `<span class="sk-muted">—</span>`}</td>
        <td class="sk-more-cell"><details class="sk-more"><summary aria-label="المزيد">⋯</summary><div>
            <button class="sk-btn" data-open="${p.id}">فتح المشروع</button>
            ${reportButton(p)}
            ${canProjects && !p.archived ? `<button class="sk-btn" data-edit="${p.id}">تعديل</button>` : ""}
            ${canLog ? `<button class="sk-btn" data-log="${p.id}">السجل</button>` : ""}
            ${canProjects ? `<button class="sk-btn" data-archive="${p.id}" data-on="${p.archived ? "" : "1"}">${p.archived ? "إرجاع من الأرشيف" : "أرشفة"}</button>` : ""}
            ${canDel ? `<button class="sk-btn sk-danger" data-del="${p.id}">حذف</button>` : ""}
          </div></details></td>
      </tr>`;
    const table = (list) => `<div class="sk-table-wrap"><table class="sk-table sk-clients-table sk-projects-table">
        <thead><tr><th>اسم المشروع</th><th>حالة المشروع</th><th>آخر تعديل</th><th></th></tr></thead>
        <tbody>${list.map(row).join("")}</tbody></table></div>`;
    el.innerHTML = `<button class="sk-btn sk-back" id="skClientsBack">› كل العملاء</button>
      <section class="sk-client-card">
        <header>
          <div><div class="sk-client-id">${avatarHTML(o, "sk-avatar-lg")}<h3>${esc(o.name)}${o.archived ? ` <span class="sk-chip">في الأرشيف</span>` : ""}</h3></div>
            <dl class="sk-client-facts">
              <div><dt>المنطقة</dt><dd>${o.region ? esc(o.region) : "—"}</dd></div>
              <div><dt>اسم المستخدم</dt><dd dir="ltr">${esc(o.username)}</dd></div>
              <div><dt>المهندس المسؤول</dt><dd>${o.engineerName ? esc(o.engineerName) : "أي مهندس"}</dd></div>
              <div><dt>المشاريع</dt><dd>${live.length}</dd></div>
            </dl></div>
          <div class="sk-actions">
            ${canProjects && !o.archived ? `<button class="sk-btn sk-btn-dark" data-add-for="${o.id}">+ مشروع لهذا العميل</button>` : ""}
            ${canOwners ? `<button class="sk-btn" data-owner-edit="${o.id}">تعديل الحساب</button>` : ""}
            ${canOwners ? `<button class="sk-btn" data-owner-archive="${o.id}">${o.archived ? "إرجاع من الأرشيف" : "أرشفة العميل"}</button>` : ""}
            ${canDel ? `<button class="sk-btn sk-danger" data-owner-del="${o.id}">حذف الحساب</button>` : ""}
          </div>
        </header>
      </section>
      <h3 class="sk-section-title">المشاريع</h3>
      ${live.length ? table(live) : `<p class="sk-muted sk-owner-empty">لا توجد مشاريع حالية لهذا العميل.</p>`}
      ${old.length ? `<details class="sk-archived"><summary>المشاريع المؤرشفة (${old.length})</summary>${table(old)}</details>` : ""}`;
    $("skClientsBack").onclick = () => { clientView = ""; renderProjects(); };
    const ownersById = new Map(owners.map((o) => [o.id, o])), byId = new Map(all.map((p) => [p.id, p]));
    wireProjectButtons(el, byId);
    el.querySelectorAll("tr[data-row-open]").forEach((tr) => {
      tr.onclick = (e) => { if (!e.target.closest("select, details")) openProject(tr.dataset.rowOpen); };
      tr.onkeydown = (e) => { if (e.key === "Enter" && e.target === tr) openProject(tr.dataset.rowOpen); };
    });
    el.querySelectorAll("[data-stage]").forEach((sel) => (sel.onchange = async () => {
      const p = byId.get(sel.dataset.stage);
      try {
        await API.setProjectMeta(p.id, { stage: sel.value });
        await log("تغيير حالة المشروع", `${p.name} · ${STAGES[sel.value]}`, p.id);
        if (project && project.id === p.id) project.stage = sel.value;
        notice(`حالة «${p.name}»: ${STAGES[sel.value]}`);
      } catch (err) { alert(err.message); }
      renderProjects();
    }));
    el.querySelectorAll("[data-archive]").forEach((b) => (b.onclick = async () => {
      const p = byId.get(b.dataset.archive), on = !!b.dataset.on;
      if (on && !confirm(`أرشفة مشروع «${p.name}»؟ سيختفي من القوائم، ويمكنك إرجاعه من «المشاريع المؤرشفة».`)) return;
      try {
        await API.setProjectMeta(p.id, { archived: on });
        await log(on ? "أرشفة مشروع" : "إرجاع مشروع من الأرشيف", p.name, p.id);
      } catch (err) { alert(err.message); }
      renderProjects();
    }));
    el.querySelectorAll("[data-add-for]").forEach((b) => (b.onclick = () => openProjectForm({ ownerId: b.dataset.addFor })));
    el.querySelectorAll("[data-owner-edit]").forEach((b) => (b.onclick = () => openOwnerForm(ownersById.get(b.dataset.ownerEdit))));
    el.querySelectorAll("[data-owner-archive]").forEach((b) => (b.onclick = async () => {
      const o = ownersById.get(b.dataset.ownerArchive), on = !o.archived;
      if (on && !confirm(`أرشفة العميل «${o.name}»؟ سيختفي من جدول العملاء، ويمكنك إرجاعه من «الأرشيف».`)) return;
      try {
        await API.archiveOwner(o.id, on);
        await log(on ? "أرشفة عميل" : "إرجاع عميل من الأرشيف", `${o.name} · ${o.username}`, null);
      } catch (err) { return alert(err.message); }
      clientView = ""; archiveView = false;
      renderProjects();
    }));
    el.querySelectorAll("[data-owner-del]").forEach((b) => (b.onclick = async () => {
      const o = ownersById.get(b.dataset.ownerDel);
      if (!confirm(`حذف حساب «${o.name}»؟ لن يتمكن المالك من الدخول مرة أخرى، وستُحذف مشاريعه (${o.projects}).`)) return;
      await API.deleteOwner(o.id);
      await log("حذف مالك", `${o.name} · ${o.username}`, null);
      if (project && project.ownerId === o.id) project = null;
      clientView = "";
      updateChrome();
      renderProjects();
    }));
  }
  document.querySelectorAll("[data-archive-view]").forEach((b) => (b.onclick = () => { archiveView = !!b.dataset.archiveView; renderProjects(); }));

  /* ---------------- فورم المالك ---------------- */
  async function openOwnerForm(o) {
    if (isAdmin()) { $("skOEngineer").innerHTML = await engineerOptions("بدون تحديد (أي مهندس)"); $("skOEngineer").value = (o && o.engineer) || ""; }
    $("skOwnerFormEl").dataset.id = o ? o.id : "";
    $("skOFTitle").textContent = o ? "تعديل حساب المالك" : "مالك جديد";
    $("skOName").value = o ? o.name : "";
    $("skOUser").value = o ? o.username : "";
    $("skORegion").value = (o && o.region) || "";
    $("skOPass").value = "";
    $("skOPass").required = !o;
    $("skOPassHint").textContent = o ? "اتركها فارغة إذا لم تكن ستغيّرها." : "";
    const perms = o ? o.perms : { edit: true, final: true, send: true };
    document.querySelectorAll("[data-operm]").forEach((c) => (c.checked = !!perms[c.dataset.operm]));
    say("skOwnerFormError", "");
    returnTo = $("skUsers").open ? "users" : "projects";
    closeAll();
    open("skOwnerForm");
  }
  $("skNewOwner").onclick = () => openOwnerForm(null);

  $("skOwnerFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("skOwnerFormEl").dataset.id, password = $("skOPass").value;
    try {
      const perms = isAdmin() ? Object.fromEntries([...document.querySelectorAll("[data-operm]")].map((c) => [c.dataset.operm, c.checked])) : undefined;
      const engineer = isAdmin() ? $("skOEngineer").value : undefined;
      const o = await API.saveOwner({ id, name: $("skOName").value, username: $("skOUser").value, region: $("skORegion").value, password, perms, engineer }, by());
      await log(id ? "تعديل مالك" : "إضافة مالك", `${o.name} · ${o.username}${o.engineerName ? " · المهندس المسؤول " + o.engineerName : ""}${password && id ? " · كلمة مرور جديدة" : ""}`, null);
      if (project && project.ownerId === o.id) project.ownerName = o.name;
      updateChrome();
      close("skOwnerForm");
      const back = returnTo === "users" ? openUsers : openProjects;
      if (password) showCreds("المالك", o.name, o.username, password, back);
      else back();
    } catch (err) { say("skOwnerFormError", err.message, true); }
  });

  function showCreds(kind, name, username, password, then) {
    $("skCredsText").textContent = `سكن جروب\n${kind}: ${name}\nاسم المستخدم: ${username}\nكلمة المرور: ${password}`;
    open("skCreds");
    $("skCreds").addEventListener("close", then, { once: true });
  }

  $("skCopyCreds").onclick = async () => {
    try { await navigator.clipboard.writeText($("skCredsText").textContent); $("skCopyCreds").textContent = "تم النسخ ✓"; }
    catch (e) { $("skCopyCreds").textContent = "انسخها يدويًا"; }
    setTimeout(() => ($("skCopyCreds").textContent = "نسخ"), 2000);
  };

  /* ---------------- فورم المشروع ---------------- */
  async function openProjectForm(p) {
    const owners = await API.listOwners();
    if (!owners.length) { openOwnerForm(null); return; }
    const editing = p && p.id;
    $("skProjectFormEl").dataset.id = editing ? p.id : "";
    $("skFormTitle").textContent = editing ? "تعديل المشروع" : "مشروع جديد";
    $("skFName").value = (p && p.name) || "";
    $("skFOwner").innerHTML = owners.map((o) => `<option value="${o.id}">${esc(o.name)} (${esc(o.username)})</option>`).join("");
    $("skFOwner").value = (p && p.ownerId) || ownerView || owners[0].id;
    if (isAdmin()) { $("skFEngineer").innerHTML = await engineerOptions("نفس المهندس المسؤول عن المالك"); $("skFEngineer").value = (p && p.engineer) || ""; }
    const plans = await P.list();
    $("skFPlan").innerHTML = `<option value="">${plans.length ? "اختر مخطط المشروع" : "لا توجد مخططات بعد، ارفع مخططًا أولًا"}</option>` +
      plans.map((q) => `<option value="${esc(q.id)}">${esc(q.title)}</option>`).join("");
    $("skFPlan").value = (p && plans.some((q) => q.id === p.planId) && p.planId) || (plans.length === 1 ? plans[0].id : "");
    say("skFormError", "");
    closeAll();
    open("skProjectForm");
  }

  const readForm = () => ({
    id: $("skProjectFormEl").dataset.id || undefined,
    name: $("skFName").value, ownerId: $("skFOwner").value, planId: $("skFPlan").value,
    engineer: isAdmin() ? $("skFEngineer").value : undefined,
  });

  $("skNewProject").onclick = () => openProjectForm(clientView ? { ownerId: clientView } : null);
  $("skFNewPlan").onclick = () => {
    pendingForm = readForm();
    close("skProjectForm");
    UI.openEditor(null);
    $("planFile").click();
  };

  $("skProjectFormEl").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = readForm();
    say("skFormError", "");
    try {
      const plan = await findPlan(data.planId);
      data.planTitle = plan ? plan.title : "";
      const saved = await API.saveProject(data, by());
      await log(data.id ? "تعديل مشروع" : "إضافة مشروع", `${saved.name} · المالك ${saved.ownerName}${saved.responsibleName ? " · المهندس المسؤول " + saved.responsibleName : ""}`, saved);
      if (project && project.id === saved.id) project = saved;
      updateChrome();
      close("skProjectForm");
      openProjects();
    } catch (err) { say("skFormError", err.message, true); }
  });

  /* ---------------- سجل التعديلات ---------------- */
  async function openLog(projectId) {
    if (!can("viewLog")) return;
    const list = await API.listProjects();
    $("skLogFilter").innerHTML = `<option value="">كل المشاريع</option>` + list.map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.ownerName)}</option>`).join("");
    $("skLogFilter").value = projectId || "";
    closeAll();
    open("skLog");
    renderLog();
  }
  $("skOpenLog").onclick = () => openLog("");
  $("skLogFilter").onchange = renderLog;

  async function renderLog() {
    const rows = await API.listLog($("skLogFilter").value);
    $("skLogRows").innerHTML = rows.length ? rows.map((r) => `<tr>
        <td class="sk-nowrap">${fmtDate(r.at)}</td>
        <td><b>${esc(r.name)}</b><br><span class="sk-role sk-badge-${r.role}">${ROLE[r.role] || ""}</span> <span class="sk-muted" dir="ltr">${esc(r.username)}</span></td>
        <td>${esc(r.projectName || "—")}</td>
        <td><b>${esc(r.action)}</b>${r.details ? `<br><span class="sk-muted">${esc(r.details)}</span>` : ""}</td>
      </tr>`).join("") : `<tr><td colspan="4" class="sk-muted">لا توجد تعديلات مسجلة.</td></tr>`;
  }

  /* ---------------- المستخدمين والصلاحيات (لمدير النظام) ---------------- */
  const STAFF_PERMS = { manageOwners: "الملّاك", manageProjects: "المشاريع", manageFiles: "الملفات", deleteItems: "الحذف", viewLog: "السجل" };
  const CLIENT_PERMS = { edit: "تعديل الاختيارات", final: "المقترح النهائي", send: "إرسال التقرير" };
  const permChips = (perms, names) => Object.keys(names).map((k) => `<span class="sk-chip ${perms && perms[k] ? "on" : ""}">${names[k]} ${perms && perms[k] ? "✓" : "✕"}</span>`).join("");

  async function openUsers() {
    if (!isAdmin()) return;
    closeAll();
    say("skUsersMsg", "");
    open("skUsers");
    await renderUsers();
  }

  async function renderUsers() {
    const staff = await API.listStaff(), owners = await API.listOwners();
    $("skStaffList").innerHTML = staff.map((e) => `<article class="sk-user">
        <div><b>${esc(e.name)}</b> <span class="sk-role sk-badge-${e.role}">${ROLE[e.role]}</span> <span class="sk-muted" dir="ltr">${esc(e.username)}</span>${e.username === user.username ? ' <span class="sk-chip on">أنت</span>' : ""}
          <div class="sk-chips">${e.role === "admin" ? '<span class="sk-chip on">كل الصلاحيات</span>' : permChips(e.perms, STAFF_PERMS)}</div></div>
        <div class="sk-actions"><button class="sk-btn" data-staff-edit="${esc(e.username)}">تعديل</button>${e.username === user.username ? "" : `<button class="sk-btn sk-danger" data-staff-del="${esc(e.username)}">حذف</button>`}</div>
      </article>`).join("");
    $("skClientList").innerHTML = owners.map((o) => `<article class="sk-user">
        <div><b>${esc(o.name)}</b> <span class="sk-role sk-badge-client">${ROLE.client}</span> <span class="sk-muted" dir="ltr">${esc(o.username)}</span> <span class="sk-muted">· ${o.projects} مشاريع · المهندس المسؤول: ${o.engineerName ? esc(o.engineerName) : "أي مهندس"}</span>
          <div class="sk-chips">${permChips(o.perms, CLIENT_PERMS)}</div></div>
        <div class="sk-actions"><button class="sk-btn" data-client-edit="${o.id}">تعديل</button><button class="sk-btn sk-danger" data-client-del="${o.id}">حذف</button></div>
      </article>`).join("") || `<p class="sk-muted">لا يوجد ملّاك بعد.</p>`;
    const staffBy = new Map(staff.map((e) => [e.username, e])), ownersBy = new Map(owners.map((o) => [o.id, o]));
    $("skUsers").querySelectorAll("[data-staff-edit]").forEach((b) => (b.onclick = () => openStaffForm(staffBy.get(b.dataset.staffEdit))));
    $("skUsers").querySelectorAll("[data-staff-del]").forEach((b) => (b.onclick = async () => {
      const e = staffBy.get(b.dataset.staffDel);
      if (!confirm(`حذف حساب «${e.name}»؟ لن يتمكن من الدخول مرة أخرى.`)) return;
      try { await API.deleteStaff(e.username); await log("حذف حساب", `${e.name} · ${e.username}`, null); renderUsers(); }
      catch (err) { say("skUsersMsg", err.message, true); }
    }));
    $("skUsers").querySelectorAll("[data-client-edit]").forEach((b) => (b.onclick = () => openOwnerForm(ownersBy.get(b.dataset.clientEdit))));
    $("skUsers").querySelectorAll("[data-client-del]").forEach((b) => (b.onclick = async () => {
      const o = ownersBy.get(b.dataset.clientDel);
      if (!confirm(`حذف حساب «${o.name}»؟ لن يتمكن المالك من الدخول مرة أخرى، وستُحذف مشاريعه (${o.projects}).`)) return;
      await API.deleteOwner(o.id);
      await log("حذف مالك", `${o.name} · ${o.username}`, null);
      if (project && project.ownerId === o.id) { project = null; updateChrome(); }
      renderUsers();
    }));
  }
  $("skNewStaff").onclick = () => openStaffForm(null);
  $("skNewOwner2").onclick = () => openOwnerForm(null);

  function openStaffForm(e) {
    $("skStaffFormEl").dataset.original = e ? e.username : "";
    $("skSFTitle").textContent = e ? "تعديل الحساب" : "مهندس جديد";
    $("skSName").value = e ? e.name : "";
    $("skSUser").value = e ? e.username : "";
    $("skSPass").value = "";
    $("skSPass").required = !e;
    $("skSPassHint").textContent = e ? "اتركها فارغة إذا لم تكن ستغيّرها." : "";
    $("skSRole").value = e ? e.role : "engineer";
    const perms = (e && e.perms) || { manageOwners: true, manageProjects: true, deleteItems: false, viewLog: true };
    document.querySelectorAll("[data-sperm]").forEach((c) => (c.checked = !!perms[c.dataset.sperm]));
    $("skSPerms").hidden = $("skSRole").value === "admin";
    say("skStaffFormError", "");
    closeAll();
    open("skStaffForm");
  }
  $("skSRole").onchange = () => ($("skSPerms").hidden = $("skSRole").value === "admin");

  $("skStaffFormEl").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const original = $("skStaffFormEl").dataset.original, password = $("skSPass").value;
    const data = {
      original, name: $("skSName").value, username: $("skSUser").value, password, role: $("skSRole").value,
      perms: Object.fromEntries([...document.querySelectorAll("[data-sperm]")].map((c) => [c.dataset.sperm, c.checked])),
    };
    try {
      await API.saveStaff(data);
      const permsText = data.role === "admin" ? "كل الصلاحيات" : Object.keys(STAFF_PERMS).filter((k) => data.perms[k]).map((k) => STAFF_PERMS[k]).join("، ") || "بدون صلاحيات";
      await log(original ? "تعديل حساب" : "إضافة حساب", `${data.name.trim()} · ${data.username.trim()} · ${ROLE[data.role]} · ${permsText}`, null);
      // لو المدير عدّل حسابه هو، نحدّث بياناته
      if (original && original === user.username) { user = (await API.whoami({ username: data.username.trim(), role: data.role })) || user; updateChrome(); saveSession(); }
      close("skStaffForm");
      if (password) showCreds(ROLE[data.role], data.name.trim(), data.username.trim(), password, openUsers);
      else openUsers();
    } catch (err) { say("skStaffFormError", err.message, true); }
  });

  /* تغيير كلمة المرور (من الإعدادات، لأي حساب) */
  $("skPassForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await API.changePassword(user.username, $("skNewPass").value);
      await log("تغيير كلمة المرور", "", null);
      $("skPassForm").reset();
      say("skSettingsMsg", "تم تغيير كلمة المرور.");
    } catch (err) { say("skSettingsMsg", err.message, true); }
  });

  /* ---------------- المقترحات ---------------- */
  function needProject() {
    if (project) return true;
    notice(isEng() ? "افتح مشروعًا أولًا من «العملاء»." : "افتح مشروعًا أولًا من «مشاريع المالك».");
    isEng() ? openProjects() : openOwner();
    return false;
  }

  function openProposals() {
    if (!needProject()) return;
    $("skPropProject").textContent = project.name;
    say("skPropMsg", "");
    renderProposals();
    open("skProposals");
  }

  // المالك محتاج صلاحية «تعديل الاختيارات»، والمقترح النهائي محتاج صلاحيته كمان
  const canSave = (slot) => user.role !== "client" || (can("edit") && (slot !== "final" || can("final")));

  function renderProposals() {
    const total = APP.boxes().length;
    $("skPropList").innerHTML = Object.keys(SLOTS).map((k) => {
      const pr = project.proposals && project.proposals[k];
      return `<article class="sk-prop ${k === "final" ? "final" : ""} ${pr ? "saved" : ""}">
        <div><b>${SLOTS[k]}</b>
          <span class="sk-muted">${pr ? `${count(pr.selections)} من ${total} اختيارات · ${fmtDate(pr.savedAt)} · ${esc(pr.savedBy.name)} (${ROLE[pr.savedBy.role]})` : "لم يُحفظ بعد"}</span></div>
        <div class="sk-actions">
          ${canSave(k) ? `<button class="sk-btn ${k === "final" ? "sk-btn-dark" : ""}" data-save="${k}">احفظ الاختيارات الحالية هنا</button>` : ""}
          ${pr && canSave(k) ? `<button class="sk-btn" data-load="${k}">استرجاع</button>` : ""}
          ${pr ? `<button class="sk-btn" data-rep="${k}">تقرير PDF</button>` : ""}
        </div>
      </article>`;
    }).join("");
    $("skPropList").querySelectorAll("[data-save]").forEach((b) => (b.onclick = () => saveProposal(b.dataset.save)));
    $("skPropList").querySelectorAll("[data-load]").forEach((b) => (b.onclick = () => restoreProposal(b.dataset.load)));
    $("skPropList").querySelectorAll("[data-rep]").forEach((b) => (b.onclick = () => { close("skProposals"); openReport(b.dataset.rep); }));
  }

  async function saveProposal(slot) {
    const sel = APP.getSelections();
    if (!count(sel)) return say("skPropMsg", "اختر تقسيمة لبوكس واحد على الأقل قبل حفظ المقترح.", true);
    const old = project.proposals && project.proposals[slot];
    if (old && !confirm(`«${SLOTS[slot]}» محفوظ من قبل. هل تريد استبداله بالاختيارات الحالية؟`)) return;
    if (slot === "final" && !old && !confirm("سيتم حفظ الاختيارات الحالية كمقترح نهائي. هل أنت متأكد؟")) return;
    try {
      project = await API.saveProposal(project.id, slot, { selections: sel, notes: $("clientNotes").value, by: by() });
      await log("حفظ " + SLOTS[slot], `${count(sel)} من ${APP.boxes().length} اختيارات`);
      say("skPropMsg", `تم حفظ «${SLOTS[slot]}».`);
      renderProposals();
    } catch (err) { say("skPropMsg", err.message, true); }
  }

  async function restoreProposal(slot) {
    const pr = project.proposals[slot];
    if (approved()) return say("skPropMsg", "الاختيارات معتمدة ومقفلة. اطلب من مدير النظام السماح بالتعديل.", true);
    if (!confirm(`هل تريد استرجاع اختيارات «${SLOTS[slot]}»؟ ستتغير الاختيارات الحالية (إذا أردت الاحتفاظ بها فاحفظها في مقترح أولًا).`)) return;
    muted = true;
    APP.setState(pr.selections, null, pr.notes);
    muted = false;
    checkDirty();
    await log("استرجاع " + SLOTS[slot], `${count(pr.selections)} اختيارات`);
    say("skPropMsg", `تم استرجاع اختيارات «${SLOTS[slot]}». اضغط «حفظ كمسودة» لحفظها.`);
  }

  /* ---------------- تقرير PDF ---------------- */
  function versionData(slot) {
    if (slot === "current") return { selections: APP.getSelections(), notes: $("clientNotes").value };
    return project.proposals && project.proposals[slot];
  }

  function reportNumber(slot) {
    const d = new Date(), pad = (n) => String(n).padStart(2, "0");
    return `SG-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${project.id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()}-${slot === "current" ? "C" : slot.toUpperCase()}`;
  }

  /* التقرير بنفس شكل تقرير الاختيارات المعتمد: صفحة المسقط المرقّم، ثم ملخص البوكسات المختارة،
     ثم أشكال التقسيمات المختارة فقط، ثم التقسيمات المخصصة، ثم صور التصميم المرفوعة من المهندس.
     الصفحات A4 بتتقسم بإيدينا عشان المعاينة والـ PDF يطلعوا زي بعض. */
  const designCache = new Map();   // id الملف ← صور جاهزة (data URL)
  function shrinkTo(src, max) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        res({ src: c.toDataURL("image/jpeg", 0.84), w: c.width, h: c.height });
      };
      im.onerror = () => rej(Error("bad image"));
      im.src = src;
    });
  }
  async function pdfImages(blob, limit) {
    if (!Promise.withResolvers) Promise.withResolvers = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
    if (!Promise.try) Promise.try = (fn, ...args) => new Promise((resolve) => resolve(fn(...args)));
    const engine = await window.loadPlanPDF();
    const doc = await engine.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: true, isEvalSupported: false }).promise;
    const out = [];
    try {
      for (let i = 1; i <= Math.min(doc.numPages, limit); i++) {
        const page = await doc.getPage(i), v0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: Math.min(3, 1400 / Math.max(v0.width, v0.height)) });
        const c = document.createElement("canvas");
        c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: g, viewport: vp }).promise;
        out.push({ src: c.toDataURL("image/jpeg", 0.84), w: c.width, h: c.height });
      }
    } finally { doc.destroy(); }
    return out;
  }
  async function designImages() {
    let files = [];
    try { files = (await API.listFiles(project.id)).filter((f) => f.category === "designs"); } catch (e) { return []; }
    const out = [];
    for (const f of files) {
      if (out.length >= 8) break;
      if (!/^image\//.test(f.type) && !/pdf/.test(f.type)) continue;
      if (!designCache.has(f.id)) {
        try {
          const blob = await API.getFile(f.id);
          if (/pdf/.test(f.type)) designCache.set(f.id, await pdfImages(blob, 4));
          else {
            const u = URL.createObjectURL(blob);
            try { designCache.set(f.id, [await shrinkTo(u, 1400)]); } finally { URL.revokeObjectURL(u); }
          }
        } catch (e) { designCache.set(f.id, []); }
      }
      designCache.get(f.id).forEach((im) => out.length < 8 && out.push({ ...im, name: f.name }));
    }
    return out;
  }

  async function reportSections(slot) {
    const v = versionData(slot);
    const d = new Date();
    const { plan, boxes } = APP.withSelections(v.selections, () => ({
      plan: APP.planSVG().replace(/(class="unit[^"]*?)\sactive\b/g, "$1"),   // من غير تحديد البوكس المفتوح
      boxes: APP.boxes(),
    }));
    const chosen = boxes.filter((b) => b.type);
    const version = slot === "current" ? "الاختيارات الحالية" : SLOTS[slot];
    const planName = project.planTitle || APP.title();
    const head = (title, ...lines) => `<header class="sk-paper-head sk-rep-head">
        <div class="sk-rep-title"><h1>${title}</h1>${lines.filter(Boolean).map((l) => `<p>${l}</p>`).join("")}</div>
        <img src="${APP_DATA.logo}" alt="سكن جروب">
      </header>`;
    const boxList = (t) => chosen.filter((b) => b.type.id === t.id).map((b) => b.id);
    const sections = [];

    // ١) المسقط المرقّم وسجل البوكسات المختارة
    sections.push({
      head: head("اختيارات العميل للتقسيمات", `${esc(project.name)} / ${esc(planName)} / <span dir="ltr">${reportNumber(slot)}</span>`),
      units: [`<section class="sk-rep-panel sk-rep-plan">
          <h2>${esc(project.name)}</h2>
          <p class="sk-rep-caps">المسقط المرقّم / اختيارات العميل</p>
          <p class="sk-rep-small"><span>${esc(version)}</span> · <span>${fmtDay(d)}</span> · <span>${chosen.length} من ${boxes.length} بوكسات</span></p>
          <div class="sk-rep-plan-svg">${plan}</div>
        </section>`,
        `<section class="sk-rep-reg">
          <h3>سجل البوكسات المختارة / العرض × العمق (سم)</h3>
          ${chosen.length ? `<div class="sk-rep-reg-grid">${chosen.map((b) => `<div><b dir="ltr">${esc(b.id)}</b><span>${esc(b.kind)}</span><span dir="auto" class="sk-rep-type">${esc(b.type.label)}</span><small>${esc(b.dims)}</small></div>`).join("")}</div>`
            : `<p class="sk-rep-small">لم يتم اختيار أي تقسيمة بعد.</p>`}
        </section>`],
    });

    // ٢) ملخص الاختيارات: كارت لكل بوكس مختار
    sections.push({
      head: head("ملخص اختيارات الخزائن", `${esc(project.name)} — ${esc(project.ownerName)}`, `<span>${esc(version)}</span> &nbsp;|&nbsp; <span>${fmtDay(d)}</span>`),
      units: chosen.map((b) => `<article class="sk-rep-card">
          <div class="sk-rep-id" dir="ltr">${esc(b.id)}</div>
          <div class="sk-rep-card-text"><b>${esc(b.kind)}</b><span>${esc(b.dims)}</span><strong dir="auto">${esc(b.type.label)}</strong><small>${esc(b.type.name)}</small></div>
          <img src="${b.type.image}" alt="">
        </article>`).concat([`<section class="sk-rep-notes"><h3>ملاحظات العميل</h3><p>${esc(v.notes || "لا توجد ملاحظات إضافية.")}</p>
          <p class="sk-rep-disclaimer">الاختيارات مسجلة حسب رقم البوكس، وتُراجع المقاسات والفتحات والإكسسوارات قبل التنفيذ.</p></section>`]),
    });

    // ٣) أشكال التقسيمات المختارة فقط (من غير المخصصة)، كل صف ٤ أشكال
    const types = [...new Map(chosen.filter((b) => b.type.cat !== "custom").map((b) => [b.type.id, b.type])).values()];
    if (types.length) {
      const rows = [];
      for (let i = 0; i < types.length; i += 4) rows.push(types.slice(i, i + 4));
      sections.push({
        head: head("أشكال التقسيمات الداخلية", "الأشكال المختارة فقط / واجهات أمامية"),
        units: rows.map((row) => `<div class="sk-rep-types">${row.map((t) => `<figure>
            <img src="${t.image}" alt="">
            <figcaption><b dir="auto">${esc(t.label)}</b><span>${esc(t.name)}</span><small dir="ltr">${boxList(t).join(" + ")}</small></figcaption>
          </figure>`).join("")}${"<figure></figure>".repeat(4 - row.length)}</div>`).concat([`<p class="sk-rep-disclaimer">أشكال توضيحية؛ تُؤكد مقاسات الوحدات والإكسسوارات النهائية قبل التصنيع.</p>`]),
      });
    }

    // ٤) كل تقسيمة مخصصة في صفحة لوحدها بصورة كبيرة
    const customs = [...new Map(chosen.filter((b) => b.type.cat === "custom").map((b) => [b.type.id, b.type])).values()];
    customs.forEach((t) => sections.push({
      head: head("أشكال التقسيمات الداخلية", `<span>مقترح المشروع</span> / <span dir="ltr">${boxList(t).join(" + ")}</span>`),
      units: [`<section class="sk-rep-panel sk-rep-custom">
          <h2 dir="auto">${esc(t.label)}</h2>
          <p class="sk-rep-caps">${esc(t.name)}</p>
          <img src="${t.image}" alt="">
        </section>`],
    }));

    // ٥) صور التصميم المرفوعة في ملفات المشروع (تصاميم)
    const imgs = await designImages();
    if (imgs.length) {
      const rows = [];
      for (let i = 0; i < imgs.length; i += 2) rows.push(imgs.slice(i, i + 2));
      sections.push({
        head: head("مراجع التصميم", "للاسترشاد بالشكل فقط؛ ترقيم البوكسات والتقسيمات الداخلية حسب المخطط وسجل الاختيارات."),
        units: rows.map((row) => `<div class="sk-rep-designs${row.length === 1 ? " one" : ""}">${row.map((im) => `<img src="${im.src}" alt="">`).join("")}</div>`),
      });
    }
    return sections;
  }

  const reportFoot = (i, n) => `<footer class="sk-paper-foot"><span>سكن جروب · SAKAN GROUP</span><b class="sk-page-no">صفحة ${i} من ${n}</b></footer>`;
  let reportRun = 0;
  // بيرص كل قسم من أول صفحة جديدة، ولو الجزء مادخلش الصفحة بيروح للي بعدها
  async function buildReport(slot, target) {
    const run = ++reportRun;
    const sections = await reportSections(slot);
    if (run !== reportRun) return false;
    const lab = document.createElement("div");
    lab.className = "sk-report-lab";
    document.body.appendChild(lab);
    const pages = [];
    let body;
    const newPage = (head) => {
      const page = document.createElement("article");
      page.className = "sk-paper sk-rep";
      page.innerHTML = head + '<div class="sk-paper-body"></div>' + reportFoot(1, 1);
      lab.appendChild(page);
      pages.push(page);
      body = page.querySelector(".sk-paper-body");
    };
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    const frag = (html) => { const tpl = document.createElement("template"); tpl.innerHTML = html.trim(); return tpl.content.firstChild; };
    sections.forEach((s) => {
      newPage(s.head);
      s.units.forEach((h) => {
        const el = frag(h);
        body.appendChild(el);
        if (fits() || body.children.length === 1) return;
        el.remove();
        newPage(s.head);
        body.appendChild(el);
      });
    });
    pages.forEach((p, i) => (p.querySelector(".sk-page-no").textContent = `صفحة ${i + 1} من ${pages.length}`));
    target.replaceChildren(...pages);
    lab.remove();
    return true;
  }

  function openReport(slot) {
    if (!needProject()) return;
    reportSlot = slot && versionData(slot) ? slot : "current";
    say("skReportMsg", "");
    $("skSendReport").hidden = user.role !== "client" || !can("send");
    open("skReport");
    renderReport();
  }

  async function renderReport() {
    const slots = [["current", "الاختيارات الحالية"], ...Object.entries(SLOTS)];
    $("skReportSlots").innerHTML = slots.map(([k, name]) => {
      const ok = !!versionData(k);
      return `<button class="sk-chip-btn" role="radio" aria-checked="${k === reportSlot}" data-slot="${k}" ${ok ? "" : "disabled"}>${name}</button>`;
    }).join("");
    $("skReportSlots").querySelectorAll("[data-slot]").forEach((b) => (b.onclick = () => { reportSlot = b.dataset.slot; renderReport(); }));
    const box = $("skReportPreview");
    if (!box.querySelector(".sk-paper")) box.innerHTML = '<p class="sk-muted sk-rep-wait">جارٍ تجهيز التقرير…</p>';
    if (await buildReport(reportSlot, box)) fitPreview();
  }

  // المعاينة ورقة A4 بمقاسها الحقيقي، بنصغّرها على قد النافذة
  function fitPreview() {
    const box = $("skReportPreview"), papers = box.querySelectorAll(".sk-paper");
    const z = Math.min(1, (box.clientWidth - 24) / 794);
    papers.forEach((p) => (p.style.zoom = z > 0 ? z : 1));
  }
  window.addEventListener("resize", () => $("skReport").open && fitPreview());

  /* تنزيل PDF مباشرة (من غير نافذة الطباعة): كل صفحة بتتحول لصورة وبنكتب ملف PDF صغير بإيدينا.
     ده بيشتغل على الموبايل وجوه التطبيقات اللي مفيهاش طباعة. */
  function makePDF(imgs) {
    const parts = [], offs = [];
    let len = 0;
    const add = (x) => { const b = typeof x === "string" ? Uint8Array.from(x, (c) => c.charCodeAt(0)) : x; parts.push(b); len += b.length; };
    const obj = (n, body, stream) => {
      offs[n] = len;
      add(`${n} 0 obj\n${body}\n`);
      if (stream) { add("stream\n"); add(stream); add("\nendstream\n"); }
      add("endobj\n");
    };
    const W = 595.28, H = 841.89, n = imgs.length;
    add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, `<< /Type /Pages /Kids [${imgs.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${n} >>`);
    imgs.forEach((im, i) => {
      const p = 3 + i * 3, draw = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
      obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
      obj(p + 1, `<< /Length ${draw.length} >>`, draw);
      obj(p + 2, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>`, im.data);
    });
    const xref = len, count = 3 + n * 3;
    add(`xref\n0 ${count}\n0000000000 65535 f \n` + offs.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join(""));
    add(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  }
  async function reportPDF() {
    const stage = document.createElement("div");
    stage.className = "sk-pdf-stage";
    stage.setAttribute("dir", document.documentElement.getAttribute("dir") || "rtl");
    document.body.appendChild(stage);
    try {
      await buildReport(reportSlot, stage);
      await Promise.all([...stage.querySelectorAll("img")].map((im) => im.complete || new Promise((r) => { im.onload = im.onerror = r; })));
      await flattenForPDF(stage);
      const imgs = [];
      for (const pg of stage.querySelectorAll(".sk-paper")) {
        const c = await window.html2canvas(pg, { scale: 2, backgroundColor: "#f4f1ea", logging: false, scrollX: 0, scrollY: 0, windowWidth: 1200 });
        const b64 = c.toDataURL("image/jpeg", 0.88).split(",")[1];
        const bin = atob(b64), data = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
        imgs.push({ w: c.width, h: c.height, data });
      }
      return makePDF(imgs);
    } finally { stage.remove(); }
  }
  // html2canvas مش بيرسم صور SVG ولا رسم المخطط مظبوط، فبنحولهم صور PNG بالمتصفح نفسه قبل التصوير
  const PDF_PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity", "opacity", "display", "visibility", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline", "paint-order", "stroke-linejoin"];
  const toPNG = (src, w, h) => new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * 2)); c.height = Math.max(1, Math.round(h * 2));
      try { c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/png")); } catch (e) { res(null); }
    };
    im.onerror = () => res(null);
    im.src = src;
  });
  async function flattenForPDF(root) {
    for (const im of root.querySelectorAll('img[src^="data:image/svg"]')) {
      const r = im.getBoundingClientRect(), k = Math.min(r.width / (im.naturalWidth || r.width), r.height / (im.naturalHeight || r.height));
      const w = (im.naturalWidth || r.width) * k, h = (im.naturalHeight || r.height) * k;
      const png = w && h && await toPNG(im.src, w * 1.5, h * 1.5);
      if (png) im.src = png;
    }
    for (const svg of root.querySelectorAll(".sk-paper svg")) {
      if (svg.parentElement.closest("svg")) continue;
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const copy = svg.cloneNode(true), src = [svg, ...svg.querySelectorAll("*")], dst = [copy, ...copy.querySelectorAll("*")];
      src.forEach((el, i) => {
        const cs = getComputedStyle(el);
        dst[i].setAttribute("style", PDF_PROPS.map((k) => `${k}:${cs.getPropertyValue(k)}`).join(";"));
      });
      copy.setAttribute("width", r.width); copy.setAttribute("height", r.height);
      copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copy));
      const png = await toPNG(url, r.width * 1.5, r.height * 1.5);
      if (!png) continue;
      const img = document.createElement("img");
      img.src = png; img.style.cssText = `width:${r.width}px;height:${r.height}px;display:block;margin:0 auto`;
      await new Promise((ok) => { img.onload = img.onerror = ok; });
      svg.replaceWith(img);
    }
  }
  async function saveFile(blob, name) {
    const dl = window.claude && window.claude.use ? await window.claude.use("downloads").catch(() => null) : null;
    if (dl) return dl.save({ filename: name, data: blob });   // داخل معاينة claude.ai
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }
  /* مشاركة التقرير على واتساب: على الموبايل بيفتح قايمة المشاركة بملف الـ PDF نفسه،
     وعلى الكمبيوتر بينزّل الملف ويفتح واتساب برسالة عشان المستخدم يرفق الملف. */
  let sharedPDF = null;   // ملف جاهز للمشاركة: لو المتصفح طلب ضغطة تانية مانعيدش التجهيز
  const pdfKey = () => reportSlot + JSON.stringify(versionData(reportSlot)) + I18N.lang();
  $("skShareReport").onclick = async () => {
    const btn = $("skShareReport"), label = reportSlot === "current" ? "الاختيارات الحالية" : SLOTS[reportSlot];
    const name = `SakanGroup-${reportNumber(reportSlot)}.pdf`, text = `${I18N.t("تقرير اختيارات الخزائن")} · ${project.name}`;
    btn.disabled = true;
    try {
      if (!sharedPDF || sharedPDF.key !== pdfKey()) {
        say("skReportMsg", "جارٍ تجهيز ملف PDF…");
        sharedPDF = { key: pdfKey(), blob: await reportPDF() };
      }
      const file = new File([sharedPDF.blob], name, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: text, text });
          await log("مشاركة التقرير", label);
          say("skReportMsg", "تمت مشاركة التقرير.");
          return;
        } catch (e) {
          if (e && e.name === "AbortError") return say("skReportMsg", "تم إلغاء المشاركة.");
          if (e && e.name === "NotAllowedError") return say("skReportMsg", "ملف PDF جاهز. اضغط «مشاركة واتساب» مرة أخرى للإرسال.");
        }
      }
      await saveFile(sharedPDF.blob, name);
      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
      await log("مشاركة التقرير", label);
      say("skReportMsg", "تم تنزيل ملف PDF وفتح واتساب. أرفق الملف من التنزيلات داخل المحادثة.");
    } catch (err) {
      say("skReportMsg", "تعذّر تجهيز ملف PDF. جرّب زر «طباعة» واختر «حفظ بصيغة PDF».", true);
    } finally { btn.disabled = false; }
  };

  $("skDownloadReport").onclick = async () => {
    const btn = $("skDownloadReport"), label = reportSlot === "current" ? "الاختيارات الحالية" : SLOTS[reportSlot];
    btn.disabled = true;
    say("skReportMsg", "جارٍ تجهيز ملف PDF…");
    try {
      const blob = await reportPDF();
      await saveFile(blob, `SakanGroup-${reportNumber(reportSlot)}.pdf`);   // اسم إنجليزي: بعض المتصفحات بتتجاهل الأسماء العربي
      await log("حفظ تقرير PDF", label);
      say("skReportMsg", "تم تجهيز ملف PDF.");
    } catch (err) {
      say("skReportMsg", err && err.code === "declined" ? "تم إلغاء التنزيل." : "تعذّر تجهيز ملف PDF. جرّب زر «طباعة» واختر «حفظ بصيغة PDF».", true);
    } finally { btn.disabled = false; }
  };

  $("skPrintReport").onclick = async () => {
    const btn = $("skPrintReport");
    btn.disabled = true;
    try { await buildReport(reportSlot, $("printArea")); } finally { btn.disabled = false; }
    document.body.classList.add("sk-printing");
    const label = reportSlot === "current" ? "الاختيارات الحالية" : SLOTS[reportSlot];
    const oldTitle = document.title;
    document.title = `SakanGroup-${project.name}-${I18N.t(label)}`.replace(/[<>:"/\\|?*]/g, "");   // اسم ملف الـ PDF
    await log("طباعة التقرير", label);
    window.print();
    document.title = oldTitle;
  };
  window.addEventListener("afterprint", () => document.body.classList.remove("sk-printing"));

  $("skSendReport").onclick = async () => {
    const label = reportSlot === "current" ? "الاختيارات الحالية" : SLOTS[reportSlot];
    try {
      project = await API.sendReport(project.id, { slot: reportSlot, number: reportNumber(reportSlot), by: by() });
      await log("إرسال تقرير للمهندس", label);
      say("skReportMsg", `تم إرسال تقرير «${label}» إلى المهندس. إذا أردت إرساله بنفسك أيضًا، اضغط «حفظ PDF» وأرسل الملف.`);
    } catch (err) { say("skReportMsg", err.message, true); }
  };

  /* ---------------- المخططات (المهندس بيرفعها ويعدّلها ويحذفها) ---------------- */
  async function openPlans() {
    closeAll();
    open("skPlans");
    $("skUploadPlan").hidden = !can("manageProjects");
    await renderPlans();
  }
  $("skOpenPlans").onclick = openPlans;
  $("skUploadPlan").onclick = () => { closeAll(); UI.openEditor(null); $("planFile").click(); };

  async function renderPlans() {
    const plans = await P.list(), projects = await API.listProjects();
    $("skPlanList").innerHTML = plans.length ? plans.map((q) => {
      const used = projects.filter((p) => p.planId === q.id);
      return `<article class="sk-plan">
        <img src="${q.image}" alt="">
        <div><b>${esc(q.title)}</b>
          <span class="sk-muted">${q.boxes.filter((b) => b.kind !== "fixed").length} بوكسات · ${q.scale ? "المقياس مضبوط" : "بدون مقياس"}</span>
          <span class="sk-muted">${used.length ? "مستخدم في: " + used.map((p) => esc(p.name)).join("، ") : "غير مستخدم في أي مشروع"}</span></div>
        <div class="sk-actions">
          ${can("manageProjects") ? `<button class="sk-btn" data-plan-edit="${esc(q.id)}">تعديل البوكسات والمقياس</button>` : ""}
          ${can("deleteItems") ? `<button class="sk-btn sk-danger" data-plan-del="${esc(q.id)}">حذف</button>` : ""}
        </div>
      </article>`;
    }).join("") : `<div class="sk-empty"><b>لا توجد مخططات مرفوعة بعد</b><p>ارفع صورة أو PDF للمخطط، وحدد عليه البوكسات.</p></div>`;
    const byId = new Map(plans.map((q) => [q.id, q]));
    $("skPlanList").querySelectorAll("[data-plan-edit]").forEach((b) => (b.onclick = () => { closeAll(); UI.openEditor(P.validate(byId.get(b.dataset.planEdit))); }));
    $("skPlanList").querySelectorAll("[data-plan-del]").forEach((b) => (b.onclick = async () => {
      const q = byId.get(b.dataset.planDel), used = projects.filter((p) => p.planId === q.id);
      if (!confirm(used.length
        ? `المخطط «${q.title}» مستخدم في: ${used.map((p) => p.name).join("، ")}.\nعند حذفه ستبقى هذه المشاريع بدون مخطط إلى أن تختار لها مخططًا جديدًا من «تعديل». هل تريد الحذف؟`
        : `حذف مخطط «${q.title}»؟`)) return;
      await P.remove(q.id);
      await log("حذف مخطط", q.title, null);
      if (P.current.id === q.id) { if (project && project.planId === q.id) { project = null; dirty = false; updateChrome(); } APP.loadProject(P.builtin); }
      syncEmpty();
      renderPlans();
    }));
  }
  // بعد ما المهندس يحفظ مخطط من المحرر، نسجلها
  window.addEventListener("indesign:project", () => {
    if (user && isEng() && !P.current.builtin && $("planEditorDialog").open === false && !project) log("حفظ مخطط", P.current.title, null);
  });

  /* ---------------- ملفات المشروع (مرجع) ---------------- */
  const canFiles = () => isAdmin() || (user.role === "engineer" && can("manageFiles"));
  const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

  async function openFiles() {
    if (!needProject()) return;
    $("skFilesProject").textContent = project.name;
    $("skAddFile").hidden = !canFiles();
    say("skFilesMsg", "");
    open("skFiles");
    await renderFiles();
  }

  async function renderFiles() {
    const all = await API.listFiles(project.id);
    $("skFileCats").innerHTML = Object.entries(FILE_CATS).map(([k, name]) =>
      `<button class="sk-chip-btn" role="radio" aria-checked="${k === fileCat}" data-cat="${k}">${name} (${all.filter((f) => f.category === k).length})</button>`).join("");
    $("skFileCats").querySelectorAll("[data-cat]").forEach((b) => (b.onclick = () => { fileCat = b.dataset.cat; renderFiles(); }));
    const list = all.filter((f) => f.category === fileCat);
    $("skFileList").innerHTML = list.length ? list.map((f) => `<article class="sk-file">
        <span class="sk-file-icon">${/^image\//.test(f.type) ? "🖼" : /pdf/.test(f.type) ? "PDF" : "📄"}</span>
        <div><b>${esc(f.name)}</b><span class="sk-muted">${fmtSize(f.size)} · ${fmtDate(f.addedAt)} · ${esc(f.addedBy.name)}</span></div>
        <div class="sk-actions"><button class="sk-btn" data-file-open="${f.id}">فتح</button><button class="sk-btn" data-file-get="${f.id}">تنزيل</button>
          ${canFiles() && can("deleteItems") ? `<button class="sk-btn sk-danger" data-file-del="${f.id}">حذف</button>` : ""}</div>
      </article>`).join("") : `<div class="sk-empty"><p>لا توجد ${FILE_CATS[fileCat]} في هذا المشروع.</p></div>`;
    const byId = new Map(list.map((f) => [f.id, f]));
    const blobUrl = async (id) => URL.createObjectURL(await API.getFile(id));
    $("skFileList").querySelectorAll("[data-file-open]").forEach((b) => (b.onclick = async () => { const u = await blobUrl(b.dataset.fileOpen); window.open(u, "_blank"); setTimeout(() => URL.revokeObjectURL(u), 60000); }));
    $("skFileList").querySelectorAll("[data-file-get]").forEach((b) => (b.onclick = async () => {
      const u = await blobUrl(b.dataset.fileGet), a = document.createElement("a");
      a.href = u; a.download = byId.get(b.dataset.fileGet).name; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 5000);
    }));
    $("skFileList").querySelectorAll("[data-file-del]").forEach((b) => (b.onclick = async () => {
      const f = byId.get(b.dataset.fileDel);
      if (!confirm(`حذف الملف «${f.name}»؟`)) return;
      await API.deleteFile(f.id);
      await log("حذف ملف", `${FILE_CATS[f.category]} · ${f.name}`);
      renderFiles();
    }));
  }
  $("skAddFile").onclick = () => $("skFileInput").click();
  $("skFileInput").onchange = async (e) => {
    const list = [...e.target.files];
    e.target.value = "";
    try {
      for (const f of list) {
        await API.addFile(project.id, f, fileCat, by());
        await log("إضافة ملف", `${FILE_CATS[fileCat]} · ${f.name}`);
      }
      say("skFilesMsg", list.length > 1 ? `تمت إضافة ${list.length} ملفات.` : "تمت إضافة الملف.");
    } catch (err) { say("skFilesMsg", err.message, true); }
    renderFiles();
  };

  /* ---------------- التعليقات ---------------- */
  async function openComments() {
    if (!needProject()) return;
    $("skCommentsProject").textContent = project.name;
    open("skComments");
    await renderComments();
    $("skCommentText").focus();
  }

  async function renderComments() {
    project = (await API.getProject(project.id)) || project;
    const list = project.comments || [];
    $("skCommentList").innerHTML = list.length ? list.map((c) => `<article class="sk-comment ${c.by.username === user.username ? "mine" : ""} ${c.by.role === "client" ? "from-client" : ""}">
        <header><b>${esc(c.by.name)}</b> <span class="sk-role sk-badge-${c.by.role}">${ROLE[c.by.role]}</span> <span class="sk-muted">${fmtDate(c.at)}</span></header>
        <p>${esc(c.text)}</p>
      </article>`).join("") : `<div class="sk-empty"><p>${user.role === "client" ? "اكتب هنا أي سؤال أو طلب للمهندس، وسيصله إشعار." : "لا توجد تعليقات بعد."}</p></div>`;
    $("skCommentList").scrollTop = $("skCommentList").scrollHeight;
    await API.markSeen(user.username, project.id);
    refreshNotifications();
  }

  $("skCommentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("skCommentText").value;
    try {
      project = await API.addComment(project.id, text, by());
      $("skCommentText").value = "";
      await log(user.role === "client" ? "تعليق من المالك" : "رد على المالك", text.trim().length > 80 ? text.trim().slice(0, 80) + "…" : text.trim());
      renderComments();
    } catch (err) { alert(err.message); }
  });

  /* ---------------- الإشعارات ---------------- */
  const NOTIFY = { comment: "تعليق جديد", report: "تقرير مُرسل", approved: "حفظ نهائي للتصنيع", editRequest: "طلب السماح بالتعديل", editAllowed: "مدير النظام سمح بالتعديل", editRejected: "مدير النظام رفض طلب التعديل" };
  let notifications = [];
  async function refreshNotifications() {
    if (!user || isGuest()) return;
    notifications = await API.listNotifications(user);
    $("skBellCount").textContent = notifications.length > 9 ? "9+" : notifications.length;
    $("skBellCount").hidden = !notifications.length;
    updateCommentCount();
    if ($("skNotify").open) renderNotify();
  }
  function updateCommentCount() {
    const n = project ? notifications.filter((x) => x.projectId === project.id && x.kind === "comment").length : 0;
    $("skCommentsCount").textContent = n;
    $("skCommentsCount").hidden = !n;
  }
  function openNotify() { open("skNotify"); renderNotify(); }
  function renderNotify() {
    $("skNotifyList").innerHTML = notifications.length ? notifications.map((n, i) => `<button class="sk-notice" data-n="${i}">
        <b>${NOTIFY[n.kind]} · ${esc(n.projectName)}</b>
        <span>${esc(n.by.name)} (${ROLE[n.by.role]})${n.kind === "comment" || n.kind === "editRequest" ? (n.text ? ": " + esc(n.text.length > 120 ? n.text.slice(0, 120) + "…" : n.text) : "") : n.kind === "report" ? ": " + (SLOTS[n.text] || "الاختيارات الحالية") : ""}</span>
        <span class="sk-muted">${fmtDate(n.at)}</span>
      </button>`).join("") : `<div class="sk-empty"><p>لا جديد.</p></div>`;
    $("skNotifyList").querySelectorAll("[data-n]").forEach((b) => (b.onclick = async () => {
      const n = notifications[Number(b.dataset.n)];
      await API.markSeen(user.username, n.projectId);
      closeAll();
      await openProject(n.projectId);
      if (project && project.id === n.projectId) {
        if (n.kind === "comment") openComments();
        else if (n.kind === "report") openReport(n.text);
        else refreshNotifications();
      }
    }));
  }
  // على الجهاز ده بنشيّك كل شوية. مع السيرفر: push أو WebSocket.
  setInterval(refreshNotifications, 20000);
  window.addEventListener("focus", refreshNotifications);
  window.addEventListener("storage", (e) => e.key === "sakan:portal:v1" && refreshNotifications());

  /* ---------------- معرض الأعمال ----------------
     أقسام رئيسية وتحتها فرعية، وصور المنتجات في شبكة. الضغط على صورة بيفتحها كبيرة
     (تكبير بالعجلة أو بصباعين أو بالضغط مرتين، وتحريك وهي مكبّرة، وتقليب بالأسهم أو بالسحب).
     المفضلة متخزنة على الجهاز نفسه. مدير النظام بس اللي بيضيف الأقسام والصور. */
  const GAL_FAV = "sakan:gallery:favs";
  const okImg = (a) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(a || ""));
  let gal = { cats: [], items: [] }, galMain = "", galSub = "", galShown = [];
  const galFavs = () => { try { return new Set(JSON.parse(localStorage.getItem(GAL_FAV) || "[]")); } catch (e) { return new Set(); } };
  function galToggleFav(id) {
    const f = galFavs();
    f.has(id) ? f.delete(id) : f.add(id);
    try { localStorage.setItem(GAL_FAV, JSON.stringify([...f])); } catch (e) {}
    return f.has(id);
  }
  const galCat = (id) => gal.cats.find((c) => c.id === id);
  const galMains = () => gal.cats.filter((c) => !c.parent);
  const galSubs = (id) => gal.cats.filter((c) => c.parent === id);
  const galMainOf = (item) => { const c = galCat(item.categoryId); return c ? (c.parent || c.id) : ""; };
  function galPath(item) {
    const c = galCat(item.categoryId);
    if (!c) return "";
    const m = c.parent && galCat(c.parent);
    return m ? `${m.name} › ${c.name}` : c.name;
  }
  function galCatOptions(selected) {
    return galMains().map((m) => `<option value="${esc(m.id)}"${m.id === selected ? " selected" : ""}>${esc(m.name)}</option>` +
      galSubs(m.id).map((c) => `<option value="${esc(c.id)}"${c.id === selected ? " selected" : ""}>— ${esc(c.name)}</option>`).join("")).join("");
  }

  async function openGallery() {
    closeAll();
    open("skGallery");
    say("skGalMsg", gal.cats.length ? "" : "جارٍ تحميل المعرض…");
    try { gal = await API.listGallery(); say("skGalMsg", ""); }
    catch (e) { say("skGalMsg", e.message || "تعذّر تحميل المعرض. حاول مرة أخرى.", true); }
    if (galMain && galMain !== "fav" && !galCat(galMain)) galMain = "";
    if (galSub && !galCat(galSub)) galSub = "";
    renderGallery();
  }

  function renderGallery() {
    const favs = galFavs(), items = gal.items.filter((x) => okImg(x.thumb));
    const inMain = (id) => items.filter((x) => galMainOf(x) === id);
    const chip = (key, label, n, on, attr) => `<button type="button" ${attr}="${esc(key)}" aria-pressed="${on}"><span>${label}</span> <small>${n}</small></button>`;
    $("skGalMain").innerHTML = chip("", "الكل", items.length, galMain === "", "data-gal-main") +
      galMains().map((m) => chip(m.id, esc(m.name), inMain(m.id).length, galMain === m.id, "data-gal-main")).join("") +
      chip("fav", "♥ المفضلة", items.filter((x) => favs.has(x.id)).length, galMain === "fav", "data-gal-main");
    const subs = galMain && galMain !== "fav" ? galSubs(galMain) : [];
    $("skGalSubs").hidden = !subs.length;
    $("skGalSubs").innerHTML = subs.length ? chip("", "كل " + esc(galCat(galMain).name), inMain(galMain).length, galSub === "", "data-gal-sub") +
      subs.map((c) => chip(c.id, esc(c.name), items.filter((x) => x.categoryId === c.id).length, galSub === c.id, "data-gal-sub")).join("") : "";
    galShown = galMain === "fav" ? items.filter((x) => favs.has(x.id))
      : galSub ? items.filter((x) => x.categoryId === galSub)
      : galMain ? inMain(galMain) : items;
    const grid = $("skGalGrid");
    if (!galShown.length) {
      grid.innerHTML = `<div class="sk-gal-empty"><b>${galMain === "fav" ? "لا توجد صور في المفضلة بعد" : "لا توجد صور في هذا القسم بعد"}</b>
        <p class="sk-muted">${galMain === "fav" ? "اضغط على ♥ فوق أي صورة لتظهر هنا." : isAdmin() ? "أضف صورًا من «+ إضافة صور»." : "ترقّب أعمالنا الجديدة قريبًا."}</p></div>`;
      return;
    }
    grid.innerHTML = galShown.map((x, i) => `<figure class="sk-gal-card" data-gal-open="${i}" tabindex="0" role="button" aria-label="${esc(x.title || galPath(x))}">
        <img src="${x.thumb}" alt="${esc(x.title || galPath(x))}" loading="lazy">
        <figcaption>${x.title ? `<b>${esc(x.title)}</b>` : ""}<small>${esc(galPath(x))}</small></figcaption>
        <button type="button" class="sk-gal-fav${favs.has(x.id) ? " on" : ""}" data-gal-fav="${esc(x.id)}" aria-pressed="${favs.has(x.id)}" aria-label="${favs.has(x.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}">♥</button>
        ${isAdmin() ? `<button type="button" class="sk-gal-edit" data-gal-edit="${esc(x.id)}" aria-label="تعديل الصورة">✎</button>` : ""}
      </figure>`).join("");
  }

  $("skGalMain").onclick = (e) => { const b = e.target.closest("[data-gal-main]"); if (!b) return; galMain = b.dataset.galMain; galSub = ""; renderGallery(); };
  $("skGalSubs").onclick = (e) => { const b = e.target.closest("[data-gal-sub]"); if (!b) return; galSub = b.dataset.galSub; renderGallery(); };
  $("skGalGrid").onclick = (e) => {
    const fav = e.target.closest("[data-gal-fav]"), edit = e.target.closest("[data-gal-edit]"), card = e.target.closest("[data-gal-open]");
    if (fav) { galToggleFav(fav.dataset.galFav); renderGallery(); return; }
    if (edit) { openGalItem(edit.dataset.galEdit); return; }
    if (card) lightbox(+card.dataset.galOpen);
  };
  $("skGalGrid").onkeydown = (e) => {
    const card = e.target.closest && e.target.closest("[data-gal-open]");
    if (card && e.target === card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); lightbox(+card.dataset.galOpen); }
  };

  /* ---- رفع الصور (المدير) ---- */
  // بنصغّر الصورة قبل الرفع: نسخة كبيرة للعرض ونسخة صغيرة للشبكة
  async function shrinkImage(file, max, quality) {
    const url = URL.createObjectURL(file);
    try {
      const im = new Image(); im.src = url; await im.decode();
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);   // الشفاف (PNG) بيبقى أبيض
      g.drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", quality);
    } finally { URL.revokeObjectURL(url); }
  }
  let galFiles = [];
  $("skGalAdd").onclick = () => {
    if (!gal.cats.length) return say("skGalMsg", "أضف قسمًا أولًا من «إدارة الأقسام».", true);
    $("skGalFiles").click();
  };
  $("skGalFiles").onchange = () => {
    galFiles = [...$("skGalFiles").files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    $("skGalFiles").value = "";
    if (!galFiles.length) return say("skGalMsg", "اختر صورًا بصيغة JPG أو PNG أو WEBP.", true);
    $("skGalUpCat").innerHTML = galCatOptions(galSub || (galMain !== "fav" && galMain) || "");
    $("skGalUpText").value = "";
    $("skGalUpInfo").textContent = galFiles.length === 1 ? "صورة واحدة مختارة." : `${galFiles.length} صور مختارة.`;
    say("skGalUpError", "");
    $("skGalUpGo").disabled = false;
    open("skGalUpload");
  };
  $("skGalUpForm").onsubmit = async (e) => {
    e.preventDefault();
    const categoryId = $("skGalUpCat").value, title = $("skGalUpText").value.trim();
    $("skGalUpGo").disabled = true;
    let done = 0;
    try {
      for (const f of galFiles) {
        $("skGalUpInfo").textContent = `جارٍ رفع الصورة ${done + 1} من ${galFiles.length}…`;
        const [image, thumb] = [await shrinkImage(f, 1800, 0.85), await shrinkImage(f, 560, 0.74)];
        gal.items.unshift(await API.addGalleryItem(user, { categoryId, title, thumb }, image));
        done++;
      }
    } catch (err) {
      $("skGalUpGo").disabled = false;
      renderGallery();
      return say("skGalUpError", (done ? `تم رفع ${done} من ${galFiles.length}. ` : "") + (err.message || "تعذّر رفع الصورة. حاول مرة أخرى."), true);
    }
    close("skGalUpload");
    log("إضافة صور للمعرض", `${done} · ${galPath({ categoryId })}`, null);
    const c = galCat(categoryId);
    galMain = c ? (c.parent || c.id) : ""; galSub = c && c.parent ? c.id : "";
    renderGallery();
    notice(done === 1 ? "تمت إضافة الصورة إلى المعرض." : `تمت إضافة ${done} صور إلى المعرض.`);
  };

  /* ---- تعديل صورة (المدير) ---- */
  let galEditing = null;
  function openGalItem(id) {
    galEditing = gal.items.find((x) => x.id === id);
    if (!galEditing) return;
    $("skGalItemImg").src = galEditing.thumb;
    $("skGalItemText").value = galEditing.title || "";
    $("skGalItemCat").innerHTML = galCatOptions(galEditing.categoryId);
    say("skGalItemError", "");
    open("skGalItem");
  }
  $("skGalItemForm").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const it = await API.saveGalleryItem(user, galEditing.id, { title: $("skGalItemText").value, categoryId: $("skGalItemCat").value });
      Object.assign(galEditing, it);
    } catch (err) { return say("skGalItemError", err.message || "تعذّر الحفظ.", true); }
    close("skGalItem");
    renderGallery();
    notice("تم حفظ الصورة.");
  };
  $("skGalItemDel").onclick = async () => {
    if (!confirm("حذف هذه الصورة من المعرض؟")) return;
    try { await API.deleteGalleryItem(user, galEditing.id); }
    catch (err) { return say("skGalItemError", err.message || "تعذّر الحذف.", true); }
    gal.items = gal.items.filter((x) => x !== galEditing);
    close("skGalItem");
    log("حذف صورة من المعرض", galPath(galEditing), null);
    renderGallery();
  };

  /* ---- إدارة الأقسام (المدير) ---- */
  function renderGalCats() {
    $("skGalCatParent").innerHTML = `<option value="">قسم رئيسي</option>` + galMains().map((m) => `<option value="${esc(m.id)}">قسم فرعي تحت «${esc(m.name)}»</option>`).join("");
    const count = (id) => gal.items.filter((x) => x.categoryId === id).length;
    const row = (c, sub) => `<div class="sk-gal-cat-row${sub ? " sub" : ""}">
        <span><b>${esc(c.name)}</b> <small class="sk-muted">${count(c.id)} صورة</small></span>
        <span class="sk-gal-cat-actions"><button type="button" class="sk-btn" data-cat-rename="${esc(c.id)}">تعديل الاسم</button><button type="button" class="sk-btn sk-danger" data-cat-del="${esc(c.id)}">حذف</button></span>
      </div>`;
    $("skGalCatList").innerHTML = galMains().length
      ? galMains().map((m) => `<section class="sk-gal-cat-group">${row(m)}${galSubs(m.id).map((c) => row(c, true)).join("")}</section>`).join("")
      : `<p class="sk-muted">لا توجد أقسام بعد.</p>`;
  }
  $("skGalManage").onclick = () => { say("skGalCatsError", ""); $("skGalCatName").value = ""; renderGalCats(); open("skGalCats"); };
  $("skGalCatForm").onsubmit = async (e) => {
    e.preventDefault();
    try { gal.cats.push(await API.saveGalleryCat(user, { name: $("skGalCatName").value, parent: $("skGalCatParent").value })); }
    catch (err) { return say("skGalCatsError", err.message || "تعذّر الحفظ.", true); }
    say("skGalCatsError", "");
    const parent = $("skGalCatParent").value;
    $("skGalCatName").value = "";
    renderGalCats();
    $("skGalCatParent").value = parent;
    renderGallery();
  };
  $("skGalCatList").onclick = async (e) => {
    const ren = e.target.closest("[data-cat-rename]"), del = e.target.closest("[data-cat-del]");
    const c = (ren || del) && galCat(ren ? ren.dataset.catRename : del.dataset.catDel);
    if (!c) return;
    try {
      if (ren) {
        const name = prompt("الاسم الجديد للقسم", c.name);
        if (name == null || !name.trim() || name.trim() === c.name) return;
        Object.assign(c, await API.saveGalleryCat(user, { id: c.id, name }));
      } else {
        const subs = galSubs(c.id), ids = [c.id, ...subs.map((x) => x.id)], n = gal.items.filter((x) => ids.includes(x.categoryId)).length;
        if (!confirm(`حذف قسم «${c.name}»${subs.length ? " وأقسامه الفرعية" : ""}${n ? ` و${n} صورة فيه` : ""}؟ لا يمكن التراجع عن الحذف.`)) return;
        await API.deleteGalleryCat(user, c.id);
        gal.cats = gal.cats.filter((x) => !ids.includes(x.id));
        gal.items = gal.items.filter((x) => !ids.includes(x.categoryId));
        if (ids.includes(galMain)) galMain = "";
        if (ids.includes(galSub)) galSub = "";
        log("حذف قسم من المعرض", c.name, null);
      }
    } catch (err) { return say("skGalCatsError", err.message || "تعذّر الحفظ.", true); }
    renderGalCats();
    renderGallery();
  };

  /* ---- عرض الصورة كبيرة ---- */
  let lbIndex = 0, lbZ = 1, lbX = 0, lbY = 0;
  const lbImg = $("skLbImg"), lbStage = $("skLbStage");
  const rtl = () => document.documentElement.dir !== "ltr";
  function lbApply(animate) {
    lbImg.style.transition = animate ? "transform .2s ease" : "none";
    if (lbZ <= 1) { lbZ = 1; lbX = lbY = 0; }
    // مايخرجش برا الشاشة وهو مكبّر
    const mx = (lbImg.offsetWidth * (lbZ - 1)) / 2, my = (lbImg.offsetHeight * (lbZ - 1)) / 2;
    lbX = Math.max(-mx, Math.min(mx, lbX)); lbY = Math.max(-my, Math.min(my, lbY));
    lbImg.style.transform = `translate(${lbX}px, ${lbY}px) scale(${lbZ})`;
    lbStage.classList.toggle("zoomed", lbZ > 1);
  }
  const lbZoom = (z, animate) => { lbZ = Math.max(1, Math.min(5, z)); lbApply(animate); };
  function lbFav() {
    const on = galShown[lbIndex] && galFavs().has(galShown[lbIndex].id);
    $("skLbFav").classList.toggle("on", !!on);
    $("skLbFav").setAttribute("aria-pressed", String(!!on));
    $("skLbFav").setAttribute("aria-label", on ? "إزالة من المفضلة" : "إضافة إلى المفضلة");
  }
  async function lightbox(i) {
    if (!galShown.length) return;
    lbIndex = (i + galShown.length) % galShown.length;
    const it = galShown[lbIndex];
    lbZ = 1; lbApply(false);
    lbImg.src = it.thumb;                   // الصغيرة الأول لحد ما الكبيرة تتحمّل
    lbImg.alt = it.title || galPath(it);
    lbStage.classList.add("loading");
    $("skLbCount").textContent = `${lbIndex + 1} / ${galShown.length}`;
    $("skLbCap").innerHTML = `${it.title ? `<b>${esc(it.title)}</b>` : ""}<small>${esc(galPath(it))}</small>`;
    $("skLbPrev").hidden = $("skLbNext").hidden = galShown.length < 2;
    lbFav();
    if (!$("skLightbox").open) $("skLightbox").showModal();
    try {
      const big = await API.galleryImage(it);
      if (galShown[lbIndex] === it && okImg(big)) lbImg.src = big;
    } catch (e) { console.error(e); }
    if (galShown[lbIndex] === it) lbStage.classList.remove("loading");
  }
  const lbStep = (d) => lightbox(lbIndex + d);
  $("skLbNext").onclick = () => lbStep(1);
  $("skLbPrev").onclick = () => lbStep(-1);
  $("skLbClose").onclick = () => $("skLightbox").close();
  $("skLbZoomIn").onclick = () => lbZoom(lbZ * 1.6, true);
  $("skLbZoomOut").onclick = () => lbZoom(lbZ / 1.6, true);
  $("skLbFav").onclick = () => { galToggleFav(galShown[lbIndex].id); lbFav(); renderGallery(); };
  $("skLightbox").addEventListener("close", () => { lbImg.removeAttribute("src"); });
  $("skLightbox").addEventListener("click", (e) => { if (e.target === $("skLightbox") || e.target === lbStage) $("skLightbox").close(); });
  $("skLightbox").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") lbStep(rtl() ? 1 : -1);
    else if (e.key === "ArrowRight") lbStep(rtl() ? -1 : 1);
    else if (e.key === "+" || e.key === "=") lbZoom(lbZ * 1.6, true);
    else if (e.key === "-") lbZoom(lbZ / 1.6, true);
  });
  let lbPointer = "mouse";
  lbImg.addEventListener("dblclick", () => { if (lbPointer !== "touch") lbZoom(lbZ > 1 ? 1 : 2.5, true); });
  lbStage.addEventListener("wheel", (e) => { e.preventDefault(); lbZoom(lbZ * (e.deltaY < 0 ? 1.15 : 1 / 1.15), false); }, { passive: false });
  // السحب: وهي مكبّرة بيحرّكها، ومن غير تكبير السحب للجنب بيقلّب. وبصباعين تكبير وتصغير
  (function lbGestures() {
    const pts = new Map();
    let start = null, pinch = null, lastTap = 0;
    lbImg.addEventListener("pointerdown", (e) => {
      lbPointer = e.pointerType;
      lbImg.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: lbZ };
        start = null;
      } else start = { x: e.clientX, y: e.clientY, ox: lbX, oy: lbY, t: Date.now() };
    });
    lbImg.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        lbZoom(pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), false);
      } else if (start && lbZ > 1) {
        lbX = start.ox + e.clientX - start.x; lbY = start.oy + e.clientY - start.y; lbApply(false);
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pinch) { if (pts.size < 2) pinch = null; start = null; return; }
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (lbZ === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) lbStep((dx > 0) === rtl() ? 1 : -1);
      else if (e.pointerType === "touch" && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        // الضغط مرتين بالصباع يكبّر ويصغّر
        if (Date.now() - lastTap < 300) { lbZoom(lbZ > 1 ? 1 : 2.5, true); lastTap = 0; } else lastTap = Date.now();
      }
      start = null;
    };
    lbImg.addEventListener("pointerup", end);
    lbImg.addEventListener("pointercancel", end);
  })();

  /* ---------------- البداية ---------------- */
  async function start() {
    injectChrome();
    applyPrefs(readPrefs());
    await API.ready();
    const s = readSession();
    const u = s && s.role !== "guest" && (await API.whoami(s));
    if (s && s.role === "guest") enterGuest();
    else if (u) { user = u; await enter(s.projectId, false); }
    else showLogin();
  }

  /* تكبير وتصغير المخطط بصباعين على الموبايل، زي الصور: الفتح يكبّر والضم يصغّر،
     وتحريك الصباعين مع بعض يحرّك المخطط. الصباع الواحد يفضل للسكرول واختيار البوكسات.
     التكبير متخزن في متغيرات CSS على #mapMount، عشان المخطط بيترسم من جديد مع كل اختيار. */
  (function mapPinch() {
    const wrap = $("mapMount");
    if (!wrap) return;
    let z = 1, tx = 0, ty = 0, p = null;
    const svg = () => wrap.querySelector("svg");
    const mid = (t) => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
    const apply = () => {
      wrap.style.setProperty("--sk-z", z); wrap.style.setProperty("--sk-tx", tx + "px"); wrap.style.setProperty("--sk-ty", ty + "px");
      wrap.classList.toggle("sk-zoomed", z > 1);
    };
    wrap.addEventListener("touchstart", (e) => {
      const s = svg();
      if (e.touches.length !== 2 || !s) return;
      const r = s.getBoundingClientRect();
      p = { d: dist(e.touches), z, ox: r.left - tx, oy: r.top - ty, w: r.width / z, h: r.height / z };
      const m = mid(e.touches);
      p.u = (m[0] - p.ox - tx) / z; p.v = (m[1] - p.oy - ty) / z;   // نقطة المخطط اللي تحت الصباعين
    }, { passive: true });
    wrap.addEventListener("touchmove", (e) => {
      if (!p || e.touches.length !== 2) return;
      e.preventDefault();
      const m = mid(e.touches);
      z = Math.min(4, Math.max(1, p.z * dist(e.touches) / p.d));
      tx = Math.min(0, Math.max(p.w * (1 - z), m[0] - p.ox - p.u * z));
      ty = Math.min(0, Math.max(p.h * (1 - z), m[1] - p.oy - p.v * z));
      apply();
    }, { passive: false });
    const end = (e) => {
      if (e.touches.length < 2) p = null;
      if (!e.touches.length && z < 1.05) { z = 1; tx = ty = 0; apply(); }
    };
    wrap.addEventListener("touchend", end);
    wrap.addEventListener("touchcancel", end);
    window.addEventListener("indesign:project", () => { z = 1; tx = ty = 0; apply(); });
  })();

  /* ---------------- قايمة التقسيمات: التبويبات والمفضلة ----------------
     المفضلة متخزنة على الجهاز نفسه، عشان كل مستخدم يوصل للتقسيمات اللي بيستعملها كتير */
  (function typeTabs() {
    const FAV = "sakan-fav-types";
    try { window.skFavs = (JSON.parse(localStorage.getItem(FAV) || "[]") || []).filter(Number.isFinite); } catch (e) { window.skFavs = []; }
    const refresh = () => $("typeSearch").dispatchEvent(new Event("input"));
    window.skToggleFav = (id) => {
      const f = window.skFavs, i = f.indexOf(id);
      if (i < 0) f.push(id); else f.splice(i, 1);
      try { localStorage.setItem(FAV, JSON.stringify(f)); } catch (e) {}
      refresh();
    };
    function setTab(cat) {
      window.skTypeTab = cat;
      document.querySelectorAll("[data-type-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.typeTab === cat)));
      $("skCustomPanel").hidden = cat !== "custom";
      refresh();
    }
    $("skTypeTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-type-tab]"); if (b) setTab(b.dataset.typeTab); });
    $("skCustomFile").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (f) addCustom(f);
    });
  })();

  /* صورة صغيرة للتقسيمة المختارة جنب البوكس المحدد على المخطط، والضغط عليها يعرض الشكل كبير.
     المخطط بيترسم من جديد مع كل اختيار، فالصورة بتتضاف بعد كل رسم */
  (function mapThumb() {
    const mount = $("mapMount");
    if (!mount) return;
    const NS = "http://www.w3.org/2000/svg";
    let shown = null;
    function paint() {
      const s = mount.querySelector("svg"), u = s && s.querySelector(".unit.active[data-box]");
      if (!u || s.querySelector(".sk-thumb")) return;
      const t = APP.typeOf(APP.getSelections()[u.dataset.box]);
      if (!t) return;
      const vb = s.viewBox.baseVal, bb = u.getBBox(), sz = Math.max(56, Math.min(96, vb.width * 0.08)), gap = 8;
      let x = bb.x + bb.width + gap;
      if (x + sz > vb.width) x = bb.x - sz - gap;
      x = Math.max(0, Math.min(vb.width - sz, x));
      const y = Math.max(0, Math.min(vb.height - sz, bb.y + bb.height / 2 - sz / 2));
      const g = document.createElementNS(NS, "g"), el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); g.appendChild(e); return e; };
      g.setAttribute("class", "sk-thumb"); g.setAttribute("role", "button"); g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", "عرض شكل التقسيم " + t.label);
      el("rect", { x, y, width: sz, height: sz, rx: 7, class: "sk-thumb-bg" });
      el("image", { x: x + 4, y: y + 4, width: sz - 8, height: sz - 8, preserveAspectRatio: "xMidYMid meet", href: t.image });
      el("circle", { cx: x + sz - 2, cy: y + 2, r: 9, class: "sk-thumb-dot" });
      const plus = el("text", { x: x + sz - 2, y: y + 6, class: "sk-thumb-plus" }); plus.textContent = "+";
      const tip = document.createElementNS(NS, "title"); tip.textContent = "اضغط لعرض شكل التقسيم"; g.appendChild(tip);
      const go = (e) => { e.stopPropagation(); e.preventDefault(); view(u.dataset.box, t); };
      g.addEventListener("click", go);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });
      s.appendChild(g);
    }
    function view(id, t) {
      shown = id;
      $("skTypeViewTitle").textContent = "شكل التقسيم · " + id;
      $("skTypeViewImg").src = t.image; $("skTypeViewImg").alt = t.name;
      $("skTypeViewCap").innerHTML = `<b dir="ltr">${esc(t.label)}</b> ${esc(t.name)}`;
      $("skTypeViewChange").hidden = approved();
      open("skTypeView");
    }
    $("skTypeViewChange").onclick = () => { close("skTypeView"); if (shown) APP.focusBox(shown); };
    new MutationObserver(paint).observe(mount, { childList: true });
    paint();
  })();

  // المالك مايقدرش يفتح مكتبة المخططات الأصلية حتى لو حاول
  $("projectsDialog").addEventListener("toggle", () => {
    if ($("projectsDialog").open && (!user || user.role === "client")) $("projectsDialog").close();
  });

  start().catch((e) => { console.error(e); showLogin(); });
})();
