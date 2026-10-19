/* =====================================================================
 * portal-api-remote.js — نفس دوال SakanPortalAPI بس على Supabase
 * ---------------------------------------------------------------------
 * بيشتغل لوحده لو window.SAKAN_CONFIG فيه supabaseUrl و supabaseKey
 * (portal_build.py بيحطهم من config.json). من غيرهم البرنامج بيفضل على
 * الجهاز بس (portal-api.js).
 *
 * كل الطلبات بتروح لدالة واحدة على السيرفر: sakan_api(token, op, args)
 * (supabase/schema.sql)، وهي اللي بتتأكد من الجلسة والصلاحيات.
 * المفتاح العام (anon) بس اللي بيتحط هنا، ومايقدرش يقرا الجداول مباشرة.
 *
 * صور المخططات والملفات كبيرة، فبتترفع وتتنزل على أجزاء (chunk).
 * وكمان المخططات بتتحفظ على السيرفر (window.SakanPlanRemote) بدل الجهاز.
 * ===================================================================== */
(function () {
  "use strict";
  const CFG = window.SAKAN_CONFIG || {};
  if (!CFG.supabaseUrl || !CFG.supabaseKey) return;

  const URL_ = CFG.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/sakan_api";
  const TOKEN = "sakan:token";
  const CHUNK = 1500000; // حروف في كل جزء
  // المفتاح القديم (anon) JWT وبيتبعت كمان في Authorization. الجديد (sb_publishable_) في apikey بس
  const HEADERS = Object.assign({ apikey: CFG.supabaseKey, "Content-Type": "application/json" },
    /^eyJ/.test(CFG.supabaseKey) ? { Authorization: "Bearer " + CFG.supabaseKey } : {});
  let token = null;
  try { token = localStorage.getItem(TOKEN); } catch (e) {}
  const setToken = (t) => { token = t; try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch (e) {} };

  async function call(op, args) {
    let res;
    try {
      res = await fetch(URL_, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ token, op, args: args || {} }),
      });
    } catch (e) {
      throw Error("تعذّر الاتصال بالسيرفر. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.");
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.message) || "حدثت مشكلة في السيرفر.";
      if (msg === "SESSION") { setToken(null); throw Error("انتهت الجلسة. سجّل الدخول مرة أخرى."); }
      throw Error(msg);
    }
    return body;
  }

  const uploadId = () => "up-" + (crypto.randomUUID ? crypto.randomUUID() : "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12));
  async function upload(text) {
    const id = uploadId();
    for (let i = 0, seq = 0; i < text.length || seq === 0; i += CHUNK, seq++) await call("chunk", { upload: id, seq, data: text.slice(i, i + CHUNK) });
    return id;
  }
  async function download(kind, ref, count) {
    const parts = [];
    for (let seq = 0; seq < count; seq++) parts.push(await call("readChunk", { kind, ref, seq }));
    return parts.join("");
  }
  const toBase64 = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  function fromBase64(b64, type) {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  window.SakanPortalAPI = {
    remote: true,
    async ready() {},
    async login(username, password) {
      const r = await call("login", { username, password });
      if (!r) return null;
      setToken(r.token);
      return r.user;
    },
    async whoami() {
      if (!token) return null;
      try { return await call("whoami"); } catch (e) { return null; }
    },
    setAvatar: (me, avatar) => call("setAvatar", { avatar: avatar || "" }),
    async logout() { try { await call("logout"); } finally { setToken(null); } },

    listOwners: () => call("listOwners"),
    saveOwner: (data) => call("saveOwner", { data }),
    deleteOwner: (id) => call("deleteOwner", { id }),
    archiveOwner: (id, archived) => call("archiveOwner", { id, archived: !!archived }),

    listProjects: (ownerId) => call("listProjects", { ownerId: ownerId || "" }),
    getProject: (id) => call("getProject", { id }),
    saveProject: (data) => call("saveProject", { data }),
    deleteProject: (id) => call("deleteProject", { id }),
    setProjectMeta: (id, meta) => call("setProjectMeta", { id, meta }),
    saveWork: (id, work) => call("saveWork", { id, work }),
    approveWork: (id) => call("approveWork", { id }),
    requestEdit: (id, reason) => call("requestEdit", { id, reason }),
    resolveEdit: (id, allow) => call("resolveEdit", { id, allow: !!allow }),
    reopenWork: (id) => call("reopenWork", { id }),
    addComment: (id, text) => call("addComment", { id, text }),
    markSeen: (username, projectId) => call("markSeen", { id: projectId }),
    listNotifications: () => call("listNotifications"),
    saveProposal: (id, slot, data) => call("saveProposal", { id, slot, data: { selections: data.selections, notes: data.notes } }),
    sendReport: (id, data) => call("sendReport", { id, data: { slot: data.slot, number: data.number } }),

    listFiles: (projectId) => call("listFiles", { id: projectId }),
    async addFile(projectId, file, category) {
      if (file.size > 25 * 1024 * 1024) throw Error("الملف أكبر من 25 ميجابايت.");
      const up = await upload(await toBase64(file));
      return call("addFile", { id: projectId, upload: up, meta: { name: file.name, type: file.type, size: file.size, category } });
    },
    async getFile(id) {
      const f = await call("getFile", { id });
      if (!f) return null;
      return fromBase64(await download("file", id, f.chunks), f.meta.type);
    },
    deleteFile: (id) => call("deleteFile", { id }),

    listStaff: () => call("listStaff"),
    saveStaff: (data) => call("saveStaff", { data }),
    deleteStaff: (username) => call("deleteStaff", { username }),
    changePassword: (username, password) => call("changePassword", { username, password }),

    addLog: (entry) => call("addLog", { entry }),
    listLog: (projectId) => call("listLog", { projectId: projectId || "" }),
  };

  /* المخططات: PlanProjects.list/put/remove بيعدّوا من هنا (portal_build.py).
     الصورة بتتنزل مرة واحدة وتفضل في الذاكرة لحد ما المخطط يتعدّل. */
  const images = new Map(); // id → { updated, image }
  window.SakanPlanRemote = {
    async list() {
      if (!token) return [];
      const rows = await call("listPlans").catch(() => []);
      const out = [];
      for (const p of rows) {
        let c = images.get(p.id);
        if (!c || c.updated !== p.updated) {
          try { c = { updated: p.updated, image: p.imageChunks ? await download("plan", p.id, p.imageChunks) : "" }; images.set(p.id, c); }
          catch (e) { continue; }
        }
        const q = Object.assign({}, p, { image: c.image });
        delete q.imageChunks;
        out.push(q);
      }
      return out.sort((a, b) => b.updated - a.updated);
    },
    async put(p) {
      try {
        p.updated = Date.now();
        const c = images.get(p.id), same = c && c.image === p.image;
        const up = same ? "" : await upload(p.image || "");
        await call("putPlan", { plan: Object.assign({}, p, { image: undefined }), upload: up });
        images.set(p.id, { updated: p.updated, image: p.image });
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    async remove(id) {
      await call("removePlan", { id });
      images.delete(id);
    },
  };
})();
