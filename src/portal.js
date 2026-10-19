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
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const SESSION = "sakan:session", PREFS = "sakan:prefs";

  const SLOTS = { p1: "مقترح ١", p2: "مقترح ٢", final: "المقترح النهائي" };
  const ROLE = { admin: "مدير النظام", engineer: "مهندس", client: "مالك" };

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
  const lastKey = () => "sakan:last:" + user.username.toLowerCase();

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
  function closeAll() { document.querySelectorAll("dialog.sk-dialog[open]").forEach((d) => d.close()); }

  function log(action, details, p = project) {
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
    if ($("skReport").open) { renderReport(); fitPreview(); }
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
      if (id === "skOwner") openOwner();
      else if (id === "skProjects") { clientView = ""; $("skSearch").value = ""; openProjects(); }
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

    // شريط صغير تحت المخطط: عرض 360° ومراجعة الاختيارات في سطر واحد
    const invite = document.querySelector(".room-invite"), bottom = document.querySelector(".bottom-bar");
    if (invite && bottom) {
      const finish = document.createElement("div");
      finish.className = "sk-finish";
      invite.before(finish);
      finish.append(invite, bottom);
      $("viewRoom").innerHTML = "عرض 360° <span>↗</span>";
      $("summaryBottom").innerHTML = "مراجعة <span>←</span>";
    }
    // تبويبات المشروع تحت هيدر المخطط
    const stripBox = document.querySelector(".project-strip");
    stripBox.insertAdjacentHTML("beforeend",
      `<nav class="sk-strip-tabs sk-need-project">
        <button id="skCommentsBtn">التعليقات <span id="skCommentsCount" class="sk-count" hidden></span></button>
        <button id="skFilesBtn">المخططات والملفات</button>
        <button id="skProposalsBtn">المقترحات</button>
        <button id="skReportBtn">تقرير PDF</button>
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
          <button class="sk-btn sk-btn-blue" id="skSaveWork">حفظ مسودة</button>
          <button class="sk-btn sk-btn-green" id="skApprove">تم الاعتماد - ابدأ التصنيع</button>
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
    $("skEmptyOpen") && ($("skEmptyOpen").onclick = () => openOwner());
  }

  function markTab() {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", $(b.dataset.tab).open));
    $("skScrim").hidden = !document.querySelector("dialog.sk-panel[open]");
  }

  function updateChrome() {
    document.body.classList.toggle("sk-role-engineer", isEng());
    document.body.classList.toggle("sk-role-client", !!user && user.role === "client");
    document.body.classList.toggle("sk-role-admin", isAdmin());
    // المالك اللي مالوش صلاحية تعديل بيتفرج بس
    document.body.classList.toggle("sk-readonly", !!user && user.role === "client" && !can("edit"));
    document.body.classList.toggle("sk-can-log", can("viewLog"));
    document.body.classList.toggle("sk-has-project", !!project);
    syncEmpty();
    $("skTopnav").hidden = !user;
    if (!user) { $("skProjectLabel").textContent = ""; updateWorkbar(); return; }
    $("skUserName").textContent = user.name;
    $("skUserRole").textContent = ROLE[user.role];
    $("skUserRole").className = "sk-role sk-badge-" + user.role;
    $("skProjectLabel").textContent = project
      ? `مشروع: ${project.name} · المالك: ${project.ownerName}`
      : (isEng() ? "لا يوجد مشروع مفتوح. افتح مشروعًا من «العملاء» أو «مشاريع المالك»." : "لم يضف المهندس أي مشاريع لك بعد.");
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

  async function enter(projectId, fresh) {
    project = null;
    updateChrome();
    if (fresh) await log("تسجيل دخول", ROLE[user.role]);
    // مفيش قوايم بتتفتح في وشك: بنفتح آخر مشروع اشتغلت عليه، أو أحدث مشروع،
    // والمشاريع التانية في تبويب «مشاريع المالك» و«المشاريع».
    const list = (await API.listProjects(user.role === "client" ? user.ownerId : undefined)).filter(mineProject);
    let last = projectId;
    try { last = last || localStorage.getItem(lastKey()); } catch (e) {}
    const target = list.find((p) => p.id === last) || list[0];
    if (target) await openProject(target.id);
    else APP.loadProject(P.builtin);
    updateChrome();
    saveSession();
    refreshNotifications();
  }

  async function logout() {
    if (!(await leaveProject())) return;
    await log("تسجيل خروج");
    closeAll();
    if (API.logout) API.logout().catch(() => {});
    user = null; project = null; dirty = false; ownerView = "";
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
    APP.setState(p.work && p.work.selections, p.ownerName, p.work ? p.work.notes : "");
    saved = { selections: APP.getSelections(), notes: $("clientNotes").value };
    dirty = false;
    muted = false;
    try { localStorage.setItem(lastKey(), p.id); } catch (e) {}
    closeAll();
    updateChrome();
    saveSession();
    refreshNotifications();
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
    if (project && P.current.id !== project.planId) { project = null; updateChrome(); saveSession(); }
  });

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
    dirty = !sameSel(saved.selections, APP.getSelections()) || saved.notes !== $("clientNotes").value;
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
      project = await API.saveWork(project.id, { selections: sel, notes, by: by() });
    } catch (e) { alert(e.message); return false; }
    if (changes.length) await log("تعديل الاختيارات", changes.join("، "));
    if (notes !== saved.notes) await log("تعديل الملاحظات", notes.trim().length > 80 ? notes.trim().slice(0, 80) + "…" : notes.trim() || "مسح الملاحظات");
    saved = { selections: sel, notes };
    dirty = false;
    updateWorkbar();
    notice("تم حفظ الاختيارات كمسودة.");
    return true;
  }

  async function approveWork() {
    if (!project) return;
    if (!confirm("تم الاعتماد - ابدأ التصنيع؟ بعد ذلك لن يمكن تعديل الاختيارات إلا إذا سمح مدير النظام بالتعديل.")) return;
    if (dirty && !(await saveWork())) return;
    try {
      project = await API.approveWork(project.id, by());
      // الاعتماد بيتحفظ كمان كمقترح نهائي
      project = await API.saveProposal(project.id, "final", { selections: saved.selections, notes: saved.notes, by: by() });
    } catch (e) { alert(e.message); return; }
    await log("تم الاعتماد - ابدأ التصنيع", `${count(saved.selections)} من ${APP.boxes().length} اختيارات`);
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
  function projectFacts(p) {
    const last = p.work && p.work.updatedAt
      ? `آخر تعديل ${fmtDate(p.work.updatedAt)} · ${esc(p.work.updatedBy.name)} (${ROLE[p.work.updatedBy.role]})`
      : "لم يعدّل أحد بعد";
    const rep = (p.reports || []).slice(-1)[0];
    return `<span class="sk-muted">المخطط: ${esc(p.planTitle || "—")} · ${count(p.work && p.work.selections)} اختيارات</span>
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
    const list = ownerId ? (await API.listProjects(ownerId)).filter(mineProject) : [];
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
    $("skNewProject").hidden = !can("manageProjects");
    $("skNewOwner").hidden = !can("manageOwners");
    open("skProjects");
    await renderProjects();
  }

  // تبويب «العملاء»: قايمة العملاء مرتبة بالاسم، وبالضغط على عميل تظهر مشاريعه
  let clientView = "";
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), "ar");

  async function renderProjects() {
    const list = (await API.listProjects()).filter(mineProject);
    const owners = (await API.listOwners()).filter((o) => mineOwner(o, list)).sort(byName);
    const el = $("skProjectList");
    if (clientView && !owners.some((o) => o.id === clientView)) clientView = "";
    $("skSearch").hidden = !!clientView;
    $("skSearchCount").hidden = true;
    if (!owners.length) {
      el.innerHTML = `<div class="sk-empty"><b>لا يوجد عملاء بعد</b><p>${can("manageOwners") ? "ابدأ بـ «عميل جديد» وأنشئ له اسم مستخدم وكلمة مرور، ثم أضف له مشروعًا أو أكثر." : "اطلب من مدير النظام إضافة حسابات العملاء."}</p></div>`;
      return;
    }
    const canOwners = can("manageOwners"), canProjects = can("manageProjects"), canDel = can("deleteItems"), canLog = can("viewLog");

    if (!clientView) {
      const q = $("skSearch").value.trim().toLowerCase();
      const hit = (...texts) => texts.some((t) => String(t || "").toLowerCase().includes(q));
      const rows = owners.map((o) => {
        const projects = list.filter((p) => p.ownerId === o.id);
        const matched = q && !hit(o.name, o.username, o.engineerName) ? projects.filter((p) => hit(p.name, p.planTitle, p.responsibleName)) : [];
        return { o, projects, matched };
      }).filter((r) => !q || hit(r.o.name, r.o.username, r.o.engineerName) || r.matched.length);
      $("skSearchCount").hidden = !q;
      $("skSearchCount").textContent = `${rows.length} عملاء`;
      if (!rows.length) { el.innerHTML = `<div class="sk-empty"><b>لا توجد نتائج</b><p>جرّب اسمًا آخر للعميل أو المشروع.</p></div>`; return; }
      el.innerHTML = `<ol class="sk-client-list">${rows.map(({ o, projects, matched }) => `
        <li><button class="sk-client" data-client="${o.id}">
          <span class="sk-client-avatar">${esc(String(o.name).replace(/^(أ|م|د|ا)\.\s*/, "").charAt(0))}</span>
          <span class="sk-client-main"><b>${esc(o.name)}</b>
            <small>اسم المستخدم: <span dir="ltr">${esc(o.username)}</span> · المهندس المسؤول: ${o.engineerName ? esc(o.engineerName) : "أي مهندس"}</small>
            ${matched.length ? `<small class="sk-client-hit">${matched.map((p) => esc(p.name)).join("، ")}</small>` : ""}</span>
          <span class="sk-chip">${projects.length} مشاريع</span>
          <span class="sk-client-go" aria-hidden="true">‹</span>
        </button></li>`).join("")}</ol>`;
      el.querySelectorAll("[data-client]").forEach((b) => (b.onclick = () => { clientView = b.dataset.client; renderProjects(); }));
      return;
    }

    const o = owners.find((x) => x.id === clientView);
    const mine = list.filter((p) => p.ownerId === o.id);
    el.innerHTML = `<button class="sk-btn sk-back" id="skClientsBack">› كل العملاء</button>
      <section class="sk-owner-group">
        <header>
          <div><b>${esc(o.name)}</b> <span class="sk-muted">اسم المستخدم: <span dir="ltr">${esc(o.username)}</span> · ${mine.length} مشاريع · المهندس المسؤول: ${o.engineerName ? esc(o.engineerName) : "أي مهندس"}</span></div>
          <div class="sk-actions">
            ${canProjects ? `<button class="sk-btn sk-btn-dark" data-add-for="${o.id}">+ مشروع لهذا العميل</button>` : ""}
            ${canOwners ? `<button class="sk-btn" data-owner-edit="${o.id}">تعديل الحساب</button>` : ""}
            ${canDel ? `<button class="sk-btn sk-danger" data-owner-del="${o.id}">حذف الحساب</button>` : ""}
          </div>
        </header>
        ${mine.map((p) => `<article class="sk-project ${project && project.id === p.id ? "current" : ""}">
          <div class="sk-project-main"><b>${esc(p.name)}</b>${projectFacts(p)}</div>
          <div class="sk-project-actions">
            <button class="sk-btn sk-btn-dark" data-open="${p.id}">فتح المشروع</button>
            ${reportButton(p)}
            ${canProjects ? `<button class="sk-btn" data-edit="${p.id}">تعديل</button>` : ""}
            ${canLog ? `<button class="sk-btn" data-log="${p.id}">السجل</button>` : ""}
            ${canDel ? `<button class="sk-btn sk-danger" data-del="${p.id}">حذف</button>` : ""}
          </div>
        </article>`).join("") || `<p class="sk-muted sk-owner-empty">لا توجد مشاريع لهذا العميل.</p>`}
      </section>`;
    $("skClientsBack").onclick = () => { clientView = ""; renderProjects(); };
    const ownersById = new Map(owners.map((o) => [o.id, o]));
    wireProjectButtons(el, new Map(list.map((p) => [p.id, p])));
    el.querySelectorAll("[data-add-for]").forEach((b) => (b.onclick = () => openProjectForm({ ownerId: b.dataset.addFor })));
    el.querySelectorAll("[data-owner-edit]").forEach((b) => (b.onclick = () => openOwnerForm(ownersById.get(b.dataset.ownerEdit))));
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

  /* ---------------- فورم المالك ---------------- */
  async function openOwnerForm(o) {
    if (isAdmin()) { $("skOEngineer").innerHTML = await engineerOptions("بدون تحديد (أي مهندس)"); $("skOEngineer").value = (o && o.engineer) || ""; }
    $("skOwnerFormEl").dataset.id = o ? o.id : "";
    $("skOFTitle").textContent = o ? "تعديل حساب المالك" : "مالك جديد";
    $("skOName").value = o ? o.name : "";
    $("skOUser").value = o ? o.username : "";
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
      const o = await API.saveOwner({ id, name: $("skOName").value, username: $("skOUser").value, password, perms, engineer }, by());
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
    notice("افتح مشروعًا أولًا من «مشاريع المالك».");
    openOwner();
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
    say("skPropMsg", `تم استرجاع اختيارات «${SLOTS[slot]}». اضغط «حفظ مسودة» لحفظها.`);
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

  /* التقرير بيتقسم صفحات A4 بإيدينا (مش بالمتصفح)، عشان كل صفحة يبقى فيها
     لوجو سكن فوق على اليمين ورقم الصفحة تحت، في المعاينة وفي الـ PDF وعلى كل المتصفحات. */
  function reportParts(slot) {
    const v = versionData(slot);
    const d = new Date();
    const { plan, boxes } = APP.withSelections(v.selections, () => ({
      plan: APP.planSVG().replace(/(class="unit[^"]*?)\sactive\b/g, "$1"),   // من غير تحديد البوكس المفتوح
      boxes: APP.boxes(),
    }));
    const done = boxes.filter((b) => b.type).length;
    const savedLine = slot === "current" ? "" : `<div><dt>تاريخ الحفظ</dt><dd>${fmtDate(v.savedAt)} · ${esc(v.savedBy.name)}</dd></div>`;
    return {
      head: `<header class="sk-paper-head">
        <img src="${APP_DATA.logo}" alt="سكن جروب">
        <div class="sk-paper-title"><h1>تقرير اختيارات الخزائن</h1><span dir="ltr">${reportNumber(slot)}</span></div>
      </header>`,
      foot: (i, n) => `<footer class="sk-paper-foot"><span>سكن جروب · SAKAN GROUP</span><span>الاختيارات لتحديد التوزيع؛ المقاسات والخلوص وإمكانية التنفيذ تراجع قبل الاعتماد.</span><b class="sk-page-no">صفحة ${i} من ${n}</b></footer>`,
      intro: [`<dl class="sk-paper-meta">
        <div><dt>المشروع</dt><dd>${esc(project.name)}</dd></div>
        <div><dt>المالك</dt><dd>${esc(project.ownerName)}</dd></div>
        <div><dt>النسخة</dt><dd class="sk-paper-version ${slot}">${slot === "current" ? "الاختيارات الحالية" : SLOTS[slot]}</dd></div>
        <div><dt>المخطط</dt><dd>${esc(project.planTitle || APP.title())}</dd></div>
        <div><dt>التاريخ</dt><dd>${fmtDay(d)}</dd></div>
        <div><dt>الوقت</dt><dd>${fmtTime(d)}</dd></div>
        <div><dt>المكتمل</dt><dd>${done} من ${boxes.length} بوكسات</dd></div>
        ${savedLine}
      </dl>`, `<section class="sk-paper-plan">${plan}</section>`],
      thead: `<thead><tr><th>البوكس</th><th>الخزانة والمقاس</th><th>التقسيمة المختارة</th><th>الصورة</th></tr></thead>`,
      rows: boxes.map((b) => `<tr>
          <td dir="ltr" class="sk-code">${esc(b.id)}</td>
          <td>${esc(b.kind)}<br><small>${esc(b.dims)}</small></td>
          <td>${b.type ? `<b dir="ltr">${esc(b.type.label)}</b><br>${esc(b.type.name)}` : '<span class="sk-pending">لم يتم الاختيار</span>'}</td>
          <td>${b.type ? `<img src="${b.type.image}" alt="">` : "—"}</td>
        </tr>`),
      outro: [`<section class="sk-paper-notes"><h3>ملاحظات</h3><p>${esc(v.notes || "لا توجد ملاحظات.")}</p></section>`,
        `<section class="sk-paper-sign"><div><span>توقيع المالك</span></div><div><span>اعتماد المهندس</span></div></section>`],
    };
  }

  // بيرص أجزاء التقرير في صفحات ثابتة المقاس: لو الجزء مادخلش الصفحة بيروح للي بعدها
  function buildReport(slot, target) {
    const r = reportParts(slot);
    const lab = document.createElement("div");
    lab.className = "sk-report-lab";
    document.body.appendChild(lab);
    const pages = [];
    let body, tbody;
    const newPage = () => {
      const page = document.createElement("article");
      page.className = "sk-paper";
      page.innerHTML = r.head + '<div class="sk-paper-body"></div>' + r.foot(1, 1);
      lab.appendChild(page);
      pages.push(page);
      body = page.querySelector(".sk-paper-body");
      tbody = null;
    };
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    const put = (el, parent) => {
      parent.appendChild(el);
      if (fits() || parent.children.length === 1 && body.children.length <= 1) return;
      el.remove();
      newPage();
      put(el, body);
    };
    const table = () => {
      if (tbody) return tbody;
      const t = document.createElement("table");
      t.className = "sk-paper-table";
      t.innerHTML = r.thead + "<tbody></tbody>";
      body.appendChild(t);
      tbody = t.tBodies[0];
      return tbody;
    };
    const frag = (html) => { const tpl = document.createElement("template"); tpl.innerHTML = html.trim(); return tpl.content.firstChild; };
    newPage();
    r.intro.forEach((h) => put(frag(h), body));
    r.rows.forEach((h) => {
      const tpl = document.createElement("template");
      tpl.innerHTML = "<table><tbody>" + h + "</tbody></table>";
      const tr = tpl.content.querySelector("tr");
      const tb = table();
      tb.appendChild(tr);
      if (fits() || tb.children.length === 1) return;
      tr.remove();
      if (!tb.children.length) tb.closest("table").remove();
      newPage();
      table().appendChild(tr);
    });
    tbody = null;
    r.outro.forEach((h) => put(frag(h), body));
    pages.forEach((p, i) => (p.querySelector(".sk-page-no").textContent = `صفحة ${i + 1} من ${pages.length}`));
    target.replaceChildren(...pages);
    lab.remove();
  }

  function openReport(slot) {
    if (!needProject()) return;
    reportSlot = slot && versionData(slot) ? slot : "current";
    say("skReportMsg", "");
    $("skSendReport").hidden = user.role !== "client" || !can("send");
    renderReport();
    open("skReport");
    fitPreview();
  }

  function renderReport() {
    const slots = [["current", "الاختيارات الحالية"], ...Object.entries(SLOTS)];
    $("skReportSlots").innerHTML = slots.map(([k, name]) => {
      const ok = !!versionData(k);
      return `<button class="sk-chip-btn" role="radio" aria-checked="${k === reportSlot}" data-slot="${k}" ${ok ? "" : "disabled"}>${name}</button>`;
    }).join("");
    $("skReportSlots").querySelectorAll("[data-slot]").forEach((b) => (b.onclick = () => { reportSlot = b.dataset.slot; renderReport(); fitPreview(); }));
    buildReport(reportSlot, $("skReportPreview"));
  }

  // المعاينة ورقة A4 بمقاسها الحقيقي، بنصغّرها على قد النافذة
  function fitPreview() {
    const box = $("skReportPreview"), papers = box.querySelectorAll(".sk-paper");
    const z = Math.min(1, (box.clientWidth - 24) / 794);
    papers.forEach((p) => (p.style.zoom = z > 0 ? z : 1));
  }
  window.addEventListener("resize", () => $("skReport").open && fitPreview());

  $("skPrintReport").onclick = async () => {
    buildReport(reportSlot, $("printArea"));
    document.body.classList.add("sk-printing");
    const label = reportSlot === "current" ? "الاختيارات الحالية" : SLOTS[reportSlot];
    const oldTitle = document.title;
    document.title = `SakanGroup-${project.name}-${I18N.t(label)}`.replace(/[<>:"/\\|?*]/g, "");   // اسم ملف الـ PDF
    await log("حفظ تقرير PDF", label);
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
  const NOTIFY = { comment: "تعليق جديد", report: "تقرير مُرسل", approved: "تم الاعتماد - ابدأ التصنيع", editRequest: "طلب السماح بالتعديل", editAllowed: "مدير النظام سمح بالتعديل", editRejected: "مدير النظام رفض طلب التعديل" };
  let notifications = [];
  async function refreshNotifications() {
    if (!user) return;
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

  /* ---------------- البداية ---------------- */
  async function start() {
    injectChrome();
    applyPrefs(readPrefs());
    await API.ready();
    const s = readSession();
    const u = s && (await API.whoami(s));
    if (u) { user = u; await enter(s.projectId, false); }
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

  // المالك مايقدرش يفتح مكتبة المخططات الأصلية حتى لو حاول
  $("projectsDialog").addEventListener("toggle", () => {
    if ($("projectsDialog").open && (!user || user.role === "client")) $("projectsDialog").close();
  });

  start().catch((e) => { console.error(e); showLogin(); });
})();
