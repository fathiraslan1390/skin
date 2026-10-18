/* =====================================================================
 * portal-api.js — طبقة بيانات بوابة سكن جروب (SakanPortalAPI)
 * ---------------------------------------------------------------------
 * دي نقطة الربط الوحيدة مع السيرفر. كل الدوال async وبترجّع نفس الشكل
 * اللي الواجهة مستنياه، فالزميل بتاع الداتا يبدّل جسم كل دالة بـ fetch
 * من غير ما يلمس portal.js.
 *
 * الحسابات 3 أنواع:
 *   - مدير النظام (admin): بيفتح حسابات المهندسين والملّاك ويحدد صلاحياتهم.
 *   - مهندس (engineer): بيدير الملّاك والمشاريع حسب الصلاحيات اللي المدير اداهاله.
 *   - مالك / عميل (client): حساب واحد بيوزر وباسورد، وتحته مشروع أو أكتر
 *     (مثلاً أكتر من غرفة دريسنج).
 * المهندسين والمديرين في db.engineers (الحقل role بيفرّق بينهم).
 *
 * المهندس المسؤول: المدير يقدر يحدد مهندس للمالك (owner.engineer) أو للمشروع
 * نفسه (project.engineer، وده بيغلب). المهندس بيشوف المشاريع اللي متحدد هو
 * مسؤول عنها، واللي مالهاش مهندس محدد. على السيرفر الفلترة دي لازم تتعمل
 * في GET /projects و GET /owners نفسهم.
 *
 * دلوقتي (نسخة تجريبية): كل حاجة متخزنة في localStorage على نفس الجهاز
 * ونفس المتصفح. أول ما السيرفر يتربط، أي حد يدخل من أي جهاز.
 *
 * الأمان: كلمة المرور بتتخزن hash (SHA-256) مش نص صريح، لكن ده مش أمان
 * حقيقي طالما البيانات في المتصفح. التحقق الحقيقي لازم يبقى على السيرفر.
 * ===================================================================== */

window.SakanPortalAPI = (function () {
  "use strict";

  const KEY = "sakan:portal:v1";
  const MAX_LOG = 5000;

  /* حساب مدير النظام الافتراضي. غيّر كلمة المرور من «المستخدمين والصلاحيات». */
  const DEFAULT_ADMIN = { username: "admin", name: "مدير النظام", password: "sakan123" };

  /* الصلاحيات. القيم دي هي الافتراضي لأي حساب جديد. */
  const ENGINEER_PERMS = { manageOwners: true, manageProjects: true, manageFiles: false, deleteItems: false, viewLog: true };
  const CLIENT_PERMS = { edit: true, final: true, send: true };
  const perms = (defaults, given) => { const out = {}; for (const k in defaults) out[k] = given && k in given ? !!given[k] : defaults[k]; return out; };

  const now = () => new Date().toISOString();

  /* مخزن الملفات (IndexedDB) */
  const files = (function () {
    let dbp;
    const openDB = () => dbp || (dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open("sakan-portal-files", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "id" }).createIndex("projectId", "projectId");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
    const call = async (mode, fn) => {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const t = db.transaction("files", mode), req = fn(t.objectStore("files"));
        let result;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onerror = t.onabort = () => reject(t.error || Error("تعذّر حفظ الملف على الجهاز."));
      });
    };
    return {
      put: (row) => call("readwrite", (s) => s.put(row)),
      get: (id) => call("readonly", (s) => s.get(id)),
      remove: (id) => call("readwrite", (s) => s.delete(id)),
      async list(projectId) {
        const rows = (await call("readonly", (s) => s.index("projectId").getAll(projectId))) || [];
        return rows.map((r) => { const o = Object.assign({}, r); delete o.blob; return o; }).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      },
      async removeProject(projectId) {
        for (const r of await this.list(projectId)) await this.remove(r.id);
      },
    };
  })();
  const uid = (p) => p + "-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const USERNAME = /^[A-Za-z0-9._-]{3,30}$/;

  function load() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { db = null; }
    if (!db || typeof db !== "object") db = {};
    for (const k of ["engineers", "owners", "projects", "log"]) db[k] = Array.isArray(db[k]) ? db[k] : [];
    db.seen = db.seen && typeof db.seen === "object" ? db.seen : {};
    // نسخة أقدم: مكانش فيه مدير نظام. أول حساب بيبقى المدير.
    if (db.engineers.length && !db.engineers.some((e) => e.role === "admin")) db.engineers[0].role = "admin";
    for (const e of db.engineers) { e.role = e.role || "engineer"; if (e.role === "engineer") e.perms = perms(ENGINEER_PERMS, e.perms); }
    for (const o of db.owners) o.perms = perms(CLIENT_PERMS, o.perms);
    // نسخة أقدم: كل مشروع كان ليه يوزر وباسورد. بنحوّل كل يوزر لحساب مالك.
    for (const p of db.projects) {
      if (p.ownerId || !p.username) continue;
      let o = db.owners.find((x) => same(x.username, p.username));
      if (!o) {
        o = { id: uid("own"), name: p.clientName || p.username, username: p.username, passwordHash: p.passwordHash, perms: perms(CLIENT_PERMS), createdAt: p.createdAt || now(), createdBy: p.createdBy };
        db.owners.push(o);
      }
      p.ownerId = o.id;
      delete p.username; delete p.passwordHash; delete p.clientName;
    }
    return db;
  }
  function store(db) {
    if (db.log.length > MAX_LOG) db.log = db.log.slice(-MAX_LOG);
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { throw Error("امتلأت مساحة التخزين على الجهاز. احذف مشاريع قديمة وحاول مرة أخرى."); }
  }

  async function hash(username, password) {
    const text = "sakan|" + String(username).trim().toLowerCase() + "|" + password;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return "s256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // احتياطي لو المتصفح مش بيدعم crypto.subtle
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return "fnv:" + (h >>> 0).toString(16);
  }

  async function ready() {
    const db = load();
    if (!db.engineers.length) {
      db.engineers.push({
        username: DEFAULT_ADMIN.username, name: DEFAULT_ADMIN.name, role: "admin",
        passwordHash: await hash(DEFAULT_ADMIN.username, DEFAULT_ADMIN.password), createdAt: now(),
      });
    }
    store(db);   // بيحفظ تحويل النسخة القديمة لو حصل
  }

  const usernameTaken = (db, username, exceptOwnerId) =>
    db.engineers.some((e) => same(e.username, username)) ||
    db.owners.some((o) => o.id !== exceptOwnerId && same(o.username, username));

  /* شكل المستخدم اللي بيرجع بعد الدخول:
     { role: "admin", username, name, perms: {} }        (المدير يقدر يعمل كل حاجة)
     { role: "engineer", username, name, perms: { manageOwners, manageProjects, deleteItems, viewLog } }
     { role: "client", username, name, ownerId, perms: { edit, final, send } } */
  const asEngineer = (e) => ({ role: e.role, username: e.username, name: e.name || e.username, perms: e.role === "admin" ? {} : perms(ENGINEER_PERMS, e.perms) });
  const asClient = (o) => ({ role: "client", username: o.username, name: o.name, ownerId: o.id, perms: perms(CLIENT_PERMS, o.perms) });
  const staffName = (db, username) => { const e = username && db.engineers.find((x) => same(x.username, username)); return e ? e.name : ""; };
  const publicOwner = (o, db) => ({ id: o.id, name: o.name, username: o.username, perms: perms(CLIENT_PERMS, o.perms), engineer: o.engineer || "", engineerName: staffName(db, o.engineer), createdAt: o.createdAt, projects: db.projects.filter((p) => p.ownerId === o.id).length });
  const publicProject = (p, db) => {
    const o = db.owners.find((x) => x.id === p.ownerId);
    // المهندس المسؤول: بتاع المشروع لو متحدد، وإلا بتاع المالك
    const responsible = p.engineer || (o && o.engineer) || "";
    return Object.assign(clone(p), { ownerName: o ? o.name : "", ownerUsername: o ? o.username : "", engineer: p.engineer || "", responsible, responsibleName: staffName(db, responsible) });
  };
  const byDate = (a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt));
  function markSeenIn(db, username, projectId) {
    const k = String(username).toLowerCase();
    db.seen[k] = db.seen[k] || {};
    db.seen[k][projectId] = now();
  }

  return {
    ready,

    /* POST /auth/login  { username, password } */
    async login(username, password) {
      const db = load();
      const h = await hash(username, password);
      const e = db.engineers.find((x) => same(x.username, username));
      if (e) return e.passwordHash === h ? asEngineer(e) : null;
      const o = db.owners.find((x) => same(x.username, username));
      if (o) return o.passwordHash === h ? asClient(o) : null;
      return null;
    },

    /* GET /auth/me — يرجّع المستخدم لو الجلسة لسه صالحة */
    async whoami(session) {
      if (!session) return null;
      const db = load();
      if (session.role !== "client") { const e = db.engineers.find((x) => same(x.username, session.username)); return e ? asEngineer(e) : null; }
      const o = db.owners.find((x) => same(x.username, session.username));
      return o ? asClient(o) : null;
    },

    /* ---------- الملّاك (حسابات العملاء) ---------- */

    /* GET /owners (للمهندس بس) */
    async listOwners() {
      const db = load();
      return db.owners.map((o) => publicOwner(o, db)).sort((a, b) => a.name.localeCompare(b.name, "ar"));
    },

    /* POST /owners أو PUT /owners/:id   data: { id?, name, username, password?, perms?, engineer? } */
    async saveOwner(data, by) {
      const db = load();
      const name = String(data.name || "").trim(), username = String(data.username || "").trim();
      if (!name) throw Error("اكتب اسم المالك.");
      if (!USERNAME.test(username)) throw Error("يتكون اسم المستخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا (مسموح . _ -).");
      let o = data.id ? db.owners.find((x) => x.id === data.id) : null;
      if (usernameTaken(db, username, o && o.id)) throw Error("اسم المستخدم هذا مستخدم من قبل. اختر اسمًا آخر.");
      if ((!o || data.password) && (!data.password || data.password.length < 4)) throw Error("يجب ألا تقل كلمة المرور عن 4 حروف أو أرقام.");
      if (o && !same(o.username, username) && !data.password) throw Error("عند تغيير اسم المستخدم اكتب كلمة مرور جديدة أيضًا.");
      if (!o) { o = { id: uid("own"), createdAt: now(), createdBy: by, perms: perms(CLIENT_PERMS) }; db.owners.push(o); }
      Object.assign(o, { name, username, updatedAt: now() });
      if (data.perms) o.perms = perms(CLIENT_PERMS, data.perms);
      if (data.engineer !== undefined) o.engineer = data.engineer || "";
      if (data.password) o.passwordHash = await hash(username, data.password);
      store(db);
      return publicOwner(o, db);
    },

    /* DELETE /owners/:id — بيمسح الحساب ومشاريعه */
    async deleteOwner(id) {
      const db = load();
      db.owners = db.owners.filter((x) => x.id !== id);
      db.projects = db.projects.filter((p) => p.ownerId !== id);
      store(db);
    },

    /* ---------- المشاريع ---------- */

    /* GET /projects?ownerId=  (العميل ياخد مشاريعه بس، والسيرفر لازم يتأكد من ده) */
    async listProjects(ownerId) {
      const db = load();
      return db.projects.filter((p) => !ownerId || p.ownerId === ownerId).sort(byDate).map((p) => publicProject(p, db));
    },

    /* GET /projects/:id */
    async getProject(id) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      return p ? publicProject(p, db) : null;
    },

    /* POST /projects أو PUT /projects/:id   data: { id?, name, ownerId, planId, planTitle, engineer? } */
    async saveProject(data, by) {
      const db = load();
      const name = String(data.name || "").trim();
      if (!name) throw Error("اكتب اسم المشروع.");
      if (!db.owners.some((o) => o.id === data.ownerId)) throw Error("اختر مالك المشروع.");
      if (!data.planId) throw Error("اختر مخطط المشروع.");
      let p = data.id ? db.projects.find((x) => x.id === data.id) : null;
      if (!p) {
        p = { id: uid("prj"), createdAt: now(), createdBy: by, work: { selections: {}, notes: "" }, proposals: {}, reports: [] };
        db.projects.push(p);
      }
      Object.assign(p, { name, ownerId: data.ownerId, planId: data.planId, planTitle: data.planTitle || "", updatedAt: now() });
      if (data.engineer !== undefined) p.engineer = data.engineer || "";
      store(db);
      return publicProject(p, db);
    },

    /* DELETE /projects/:id */
    async deleteProject(id) {
      const db = load();
      db.projects = db.projects.filter((x) => x.id !== id);
      store(db);
      files.removeProject(id).catch(() => {});
    },

    /* PUT /projects/:id/work — حفظ الاختيارات كمسودة (زرار «حفظ»).
       work.status: "draft" (مسودة) أو "approved" (معتمد نهائي). المعتمد مايتعدلش
       غير بعد ما يرجع مسودة (زي سند القيد: Draft و Posted). */
    async saveWork(id, work) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) return null;
      if (p.work && p.work.status === "approved") throw Error("الاختيارات معتمدة ومقفلة. اطلب من مدير النظام السماح بالتعديل.");
      p.work = { selections: work.selections || {}, notes: work.notes || "", status: "draft", updatedAt: now(), updatedBy: work.by };
      p.updatedAt = p.work.updatedAt;
      store(db);
      return publicProject(p, db);
    },

    /* POST /projects/:id/approve — اعتماد نهائي للاختيارات المحفوظة */
    async approveWork(id, by) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) throw Error("المشروع غير موجود.");
      p.work = Object.assign({ selections: {}, notes: "" }, p.work, { status: "approved", approvedAt: now(), approvedBy: by });
      p.updatedAt = now();
      store(db);
      return publicProject(p, db);
    },

    /* POST /projects/:id/edit-request — المالك بيطلب من مدير النظام يفتح الاختيارات للتعديل
       بعد «تم الاعتماد - ابدأ التصنيع» */
    async requestEdit(id, reason, by) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) throw Error("المشروع غير موجود.");
      if (!p.work || p.work.status !== "approved") throw Error("الاختيارات ما زالت مسودة، ويمكنك تعديلها.");
      if (p.editRequest && p.editRequest.status === "pending") throw Error("يوجد طلب تعديل بانتظار الموافقة.");
      p.editRequest = { status: "pending", reason: String(reason || "").trim().slice(0, 500), at: now(), by };
      p.updatedAt = now();
      store(db);
      return publicProject(p, db);
    },

    /* POST /projects/:id/edit-request/resolve — مدير النظام يسمح (يرجّعها مسودة) أو يرفض */
    async resolveEdit(id, allow, by) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p || !p.editRequest || p.editRequest.status !== "pending") throw Error("لا يوجد طلب تعديل.");
      Object.assign(p.editRequest, { status: allow ? "allowed" : "rejected", resolvedAt: now(), resolvedBy: by });
      if (allow) p.work = Object.assign({ selections: {}, notes: "" }, p.work, { status: "draft", reopenedAt: now(), reopenedBy: by });
      p.updatedAt = now();
      store(db);
      return publicProject(p, db);
    },

    /* POST /projects/:id/reopen — رجوع لمسودة عشان التعديل */
    async reopenWork(id, by) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) throw Error("المشروع غير موجود.");
      p.work = Object.assign({ selections: {}, notes: "" }, p.work, { status: "draft", reopenedAt: now(), reopenedBy: by });
      p.updatedAt = now();
      store(db);
      return publicProject(p, db);
    },

    /* POST /projects/:id/comments — تعليقات المشروع (المالك يكتب، والمدير أو المهندس يرد) */
    async addComment(id, text, by) {
      text = String(text || "").trim().slice(0, 2000);
      if (!text) throw Error("اكتب التعليق أولًا.");
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) throw Error("المشروع غير موجود.");
      p.comments = p.comments || [];
      p.comments.push({ id: uid("cmt"), text, at: now(), by });
      p.updatedAt = now();
      markSeenIn(db, by.username, id);
      store(db);
      return publicProject(p, db);
    },

    /* PUT /notifications/seen — المستخدم فتح المشروع وشاف الجديد */
    async markSeen(username, projectId) {
      const db = load();
      markSeenIn(db, username, projectId);
      store(db);
    },

    /* GET /notifications — الجديد في المشاريع اللي المستخدم يشوفها:
       تعليقات من غيره، وللمهندس والمدير كمان التقارير المبعوتة والاعتماد.
       على السيرفر: تتبعت كمان push أو إيميل. */
    async listNotifications(user) {
      const db = load();
      const seen = db.seen[String(user.username).toLowerCase()] || {};
      const out = [];
      for (const p of db.projects) {
        const o = db.owners.find((x) => x.id === p.ownerId);
        const responsible = p.engineer || (o && o.engineer) || "";
        if (user.role === "client" && p.ownerId !== user.ownerId) continue;
        if (user.role === "engineer" && responsible && !same(responsible, user.username)) continue;
        const since = seen[p.id] || "";
        const add = (kind, at, by, text) => { if (at > since && by && !same(by.username, user.username)) out.push({ projectId: p.id, projectName: p.name, ownerName: o ? o.name : "", kind, at, by, text }); };
        for (const c of p.comments || []) add("comment", c.at, c.by, c.text);
        if (user.role !== "client") {
          for (const r of p.reports || []) add("report", r.sentAt, r.sentBy, r.slot);
          if (p.work && p.work.status === "approved" && p.work.approvedAt) add("approved", p.work.approvedAt, p.work.approvedBy, "");
        }
        const req = p.editRequest;
        if (req && req.status === "pending" && user.role === "admin") add("editRequest", req.at, req.by, req.reason);
        if (req && req.status !== "pending" && user.role === "client") add(req.status === "allowed" ? "editAllowed" : "editRejected", req.resolvedAt, req.resolvedBy, "");
      }
      return out.sort((a, b) => b.at.localeCompare(a.at));
    },

    /* PUT /projects/:id/proposals/:slot   slot = p1 | p2 | final */
    async saveProposal(id, slot, data) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) throw Error("المشروع غير موجود.");
      p.proposals = p.proposals || {};
      p.proposals[slot] = { selections: data.selections || {}, notes: data.notes || "", savedAt: now(), savedBy: data.by };
      p.updatedAt = now();
      store(db);
      return publicProject(p, db);
    },

    /* POST /projects/:id/reports — العميل بيرسل التقرير إلى المهندس.
       على السيرفر: يحفظ الـ PDF أو يبعته إيميل/واتساب للمهندس. */
    async sendReport(id, data) {
      const db = load();
      const p = db.projects.find((x) => x.id === id);
      if (!p) throw Error("المشروع غير موجود.");
      p.reports = p.reports || [];
      p.reports.push({ slot: data.slot, number: data.number, sentAt: now(), sentBy: data.by });
      store(db);
      return publicProject(p, db);
    },

    /* ---------- ملفات المشروع المرجعية ----------
       مخططات وتصاميم ومحاضر اجتماعات. الملفات نفسها في IndexedDB لأنها كبيرة
       على localStorage. على السيرفر: POST /projects/:id/files (multipart). */

    /* GET /projects/:id/files — بيرجّع البيانات من غير الملف نفسه */
    listFiles: (projectId) => files.list(projectId),

    /* POST /projects/:id/files   category = plans | designs | minutes */
    async addFile(projectId, file, category, by) {
      if (file.size > 25 * 1024 * 1024) throw Error("الملف أكبر من 25 ميجابايت.");
      const row = { id: uid("file"), projectId, category, name: file.name, type: file.type || "application/octet-stream", size: file.size, addedAt: now(), addedBy: by, blob: file };
      await files.put(row);
      const out = Object.assign({}, row); delete out.blob;
      return out;
    },

    /* GET /files/:id — بيرجّع الملف (Blob) عشان يتفتح أو يتنزل */
    getFile: (id) => files.get(id).then((r) => (r ? r.blob : null)),

    /* DELETE /files/:id */
    deleteFile: (id) => files.remove(id),

    /* ---------- المهندسين ومديري النظام (للمدير بس) ---------- */

    /* GET /staff */
    async listStaff() {
      return load().engineers.map((e) => ({ username: e.username, name: e.name, role: e.role, perms: e.role === "admin" ? null : perms(ENGINEER_PERMS, e.perms), createdAt: e.createdAt }));
    },

    /* POST /staff أو PUT /staff/:username
       data: { original?, name, username, password?, role: "admin"|"engineer", perms? } */
    async saveStaff(data) {
      const db = load();
      const username = String(data.username || "").trim(), name = String(data.name || "").trim();
      const e = data.original ? db.engineers.find((x) => same(x.username, data.original)) : null;
      if (!name) throw Error("اكتب الاسم.");
      if (!USERNAME.test(username)) throw Error("يتكون اسم المستخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا (مسموح . _ -).");
      if (db.owners.some((o) => same(o.username, username)) || db.engineers.some((x) => x !== e && same(x.username, username))) throw Error("اسم المستخدم هذا مستخدم من قبل. اختر اسمًا آخر.");
      if ((!e || data.password) && (!data.password || data.password.length < 4)) throw Error("يجب ألا تقل كلمة المرور عن 4 حروف أو أرقام.");
      if (e && !same(e.username, username) && !data.password) throw Error("عند تغيير اسم المستخدم اكتب كلمة مرور جديدة أيضًا.");
      const role = data.role === "admin" ? "admin" : "engineer";
      if (e && e.role === "admin" && role !== "admin" && db.engineers.filter((x) => x.role === "admin").length === 1) throw Error("يجب أن يبقى مدير نظام واحد على الأقل.");
      const row = e || { createdAt: now() };
      Object.assign(row, { name, username, role, perms: role === "admin" ? undefined : perms(ENGINEER_PERMS, data.perms || row.perms) });
      if (data.password) row.passwordHash = await hash(username, data.password);
      if (!e) db.engineers.push(row);
      store(db);
    },

    /* DELETE /staff/:username */
    async deleteStaff(username) {
      const db = load();
      const e = db.engineers.find((x) => same(x.username, username));
      if (!e) return;
      if (e.role === "admin" && db.engineers.filter((x) => x.role === "admin").length === 1) throw Error("يجب أن يبقى مدير نظام واحد على الأقل.");
      db.engineers = db.engineers.filter((x) => x !== e);
      store(db);
    },

    /* PUT /staff/:username/password — كل واحد يغيّر كلمة المرور بتاعته */
    async changePassword(username, password) {
      if (!password || password.length < 4) throw Error("يجب ألا تقل كلمة المرور عن 4 حروف أو أرقام.");
      const db = load();
      const e = db.engineers.find((x) => same(x.username, username)) || db.owners.find((x) => same(x.username, username));
      if (!e) throw Error("الحساب غير موجود.");
      e.passwordHash = await hash(e.username, password);
      store(db);
    },

    /* ---------- سجل التعديلات ----------
       على السيرفر الوقت والمستخدم بيتاخدوا من الجلسة نفسها، مش من
       المتصفح، عشان محدش يقدر يزوّرهم. */

    /* POST /log */
    async addLog(entry) {
      const db = load();
      db.log.push(Object.assign({ id: uid("log"), at: now() }, entry));
      store(db);
    },

    /* GET /log?projectId= */
    async listLog(projectId) {
      const log = load().log;
      return (projectId ? log.filter((x) => x.projectId === projectId) : log).slice().reverse();
    },
  };
})();
