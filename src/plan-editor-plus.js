/* أدوات رسم البوكسات في محرر المخطط (SakanPlanTools)
 * طرق الرسم التلاتة، والمهندس بيختار منهم وقت الرسم:
 * - «سحب»: يسحب مستطيل مرة واحدة، ويحرّك البوكس أو يكبّره من أركانه، والبوكس بيلزق في اللي جنبه.
 * - «بالمقاسات»: يحدد الحائط بخط، ويكتب عروض الخزائن بالسنتي، فتترص لوحدها بالمقاس الحقيقي.
 * - «تلقائي»: البرنامج يدور على مستطيلات الخزائن في الصورة، أو يرسم تقريبي والبرنامج يظبطه على خطوط المخطط.
 * وفي كل الطرق: تكرار البوكس (Ctrl+D)، تحريك بالأسهم، حذف بـ Delete، وتكبير بـ Ctrl + عجلة الماوس.
 * بيعتمد على INDESIGN_PROJECTS_UI.editor اللي portal_build.py بيضيفه للمحرر.
 */
(() => {
  "use strict";
  const UI = window.INDESIGN_PROJECTS_UI, ED = UI && UI.editor, P = window.PlanProjects;
  if (!ED || !P) return;
  const $ = (id) => document.getElementById(id);
  const MODES = { drag: "سحب", points: "بالنقاط", wall: "بالمقاسات", auto: "تلقائي" };
  let mode = "drag";
  try { mode = localStorage.getItem("sakan:drawMode") || "drag"; } catch (e) {}
  if (!MODES[mode]) mode = "drag";

  let drag = null, suppressClick = false;
  let wall = { a: null, b: null };   // خط الحائط في وضع «بالمقاسات»
  let candidates = [];                // مستطيلات لقاها الوضع «التلقائي»
  let poly = [];                      // نقاط حدود الخزانة في وضع «بالنقاط»
  let pixels = null;                  // كاش صورة المخطط للتحليل

  const draft = () => UI.getDraft();
  const svgEl = () => $("planEditorSvg");
  const H = () => (1000 * draft().imageHeight) / draft().imageWidth;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const unitPerPx = () => { const s = svgEl(), w = s ? s.getBoundingClientRect().width : 0; return w > 0 ? 1000 / w : 1; };
  // البوكس ممكن يبقى مايل (angle بالدرجات حوالين نصه)، عشان الحيطان اللي مش على اتجاه المخطط
  const rad = (b) => ((b.angle || 0) * Math.PI) / 180;
  const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];
  const rotate = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  // البوكس المايل بيفضل نصه جوه المخطط، والمستقيم كله جوه المخطط
  function keepInside(b) {
    if (b.angle) { const [cx, cy] = center(b); b.x = clamp(cx, 0, 1000) - b.w / 2; b.y = clamp(cy, 0, H()) - b.h / 2; }
    else { b.x = clamp(b.x, 0, 1000 - b.w); b.y = clamp(b.y, 0, H() - b.h); }
  }
  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, attrs, cls) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); if (cls) el.setAttribute("class", cls); return el; };
  const ready = () => draft() && draft().image && !ED.busy && $("planEditorDialog").open;

  function toSvg(e) {
    const s = svgEl(), pt = s.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const t = pt.matrixTransform(s.getScreenCTM().inverse());
    return [clamp(t.x, 0, 1000), clamp(t.y, 0, H())];
  }
  function nextId() {
    let n = 1;
    while (draft().boxes.some((b) => b.id === "B" + String(n).padStart(2, "0"))) n++;
    return "B" + String(n).padStart(2, "0");
  }
  // البوكس الجديد بياخد اتجاه الواجهة والعمق من البوكس المختار، عشان صف خزاين ورا بعض يترسم بسرعة
  function newBox(x, y, w, h, extra) {
    const t = draft().boxes.find((b) => b.id === ED.selected);
    const straight = !t || t.kind === "straight" || t.kind === "fixed";
    return Object.assign({
      id: nextId(), x, y, w, h,
      kind: t && straight ? t.kind : "straight",
      face: t && straight ? t.face : "south",
      depth: t ? t.depth : 60,
      fixedHeight: t ? t.fixedHeight : 80,
    }, extra || {});
  }
  function addBoxes(list) {
    for (const b of list) { b.id = nextId(); draft().boxes.push(b); }
    if (list.length) ED.selected = list[list.length - 1].id;
    ED.tool = "select";
    ED.error("editorError", "");
    UI.updateEditor();
  }

  /* ---------------- اللزق في حواف البوكسات التانية ---------------- */
  function edges(skip) {
    const xs = [0, 1000], ys = [0, H()];
    for (const b of draft().boxes) if (b !== skip && !b.angle) { xs.push(b.x, b.x + b.w); ys.push(b.y, b.y + b.h); }
    return { xs, ys };
  }
  function nearest(v, list, tol) {
    let best = null;
    for (const c of list) if (Math.abs(c - v) <= tol && (best == null || Math.abs(c - v) < Math.abs(best - v))) best = c;
    return best;
  }
  function snapPoint(q, skip) {
    const { xs, ys } = edges(skip), tol = 8 * unitPerPx();
    const sx = nearest(q[0], xs, tol), sy = nearest(q[1], ys, tol);
    return [sx == null ? q[0] : sx, sy == null ? q[1] : sy];
  }
  // بيلزق أقرب حافة من حافتين (شمال/يمين أو فوق/تحت) في أقرب خط
  function snapPair(a, size, list, tol) {
    let best = null;
    for (const edge of [a, a + size]) {
      const c = nearest(edge, list, tol);
      if (c != null && (best == null || Math.abs(c - edge) < Math.abs(best))) best = c - edge;
    }
    return best == null ? 0 : best;
  }

  /* ---------------- رسم البوكس الواحد وهو بيتحرك ---------------- */
  function paintBox(b) {
    const g = svgEl() && svgEl().querySelector(`[data-editor-box="${CSS.escape(b.id)}"]`);
    if (!g) return;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    g.querySelector("polygon").setAttribute("points", P.polygon(b, draft()).map((q) => q.join(",")).join(" "));
    const r = g.querySelector("rect"), t = g.querySelector("text");
    r.setAttribute("x", cx - 29); r.setAttribute("y", cy - 14);
    t.setAttribute("x", cx); t.setAttribute("y", cy + 3);
  }
  function guides(xs, ys) {
    const s = svgEl(); if (!s) return;
    s.querySelectorAll(".sk-guide").forEach((el) => el.remove());
    for (const x of xs) s.appendChild(make("line", { x1: x, x2: x, y1: 0, y2: H() }, "sk-guide"));
    for (const y of ys) s.appendChild(make("line", { y1: y, y2: y, x1: 0, x2: 1000 }, "sk-guide"));
  }
  function handles() {
    const s = svgEl(); if (!s) return;
    s.querySelectorAll(".sk-handles").forEach((el) => el.remove());
    const b = draft().boxes.find((q) => q.id === ED.selected);
    if (!b) return;
    // مربعات صغيرة (حوالي 7 بكسل) ومايزيدوش عن جزء صغير من البوكس، عشان مايغطوش عليه.
    // مكان المسك أوسع شوية من المربع نفسه وشفاف، عشان يتمسك بالصباع
    const upp = unitPerPx(), side = Math.min(b.w, b.h);
    const r = Math.min(3.5 * upp, side / 8), hit = Math.max(r, Math.min(9 * upp, side / 4));
    const [cx, cy] = center(b), g = make("g", b.angle ? { transform: `rotate(${b.angle} ${cx} ${cy})` } : {}, "sk-handles");
    const pos = side / upp < 48
      ? { nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1] } // البوكس الصغير: الأركان بس
      : { nw: [0, 0], n: [.5, 0], ne: [1, 0], e: [1, .5], se: [1, 1], s: [.5, 1], sw: [0, 1], w: [0, .5] };
    for (const d in pos) {
      const [fx, fy] = pos[d], hx = b.x + b.w * fx, hy = b.y + b.h * fy;
      g.appendChild(make("rect", { x: hx - hit, y: hy - hit, width: 2 * hit, height: 2 * hit, "data-handle": d }, "sk-handle-hit sk-h-" + d));
      g.appendChild(make("rect", { x: hx - r, y: hy - r, width: 2 * r, height: 2 * r, rx: r / 3 }, "sk-handle"));
    }
    s.appendChild(g);
  }

  /* ---------------- السحب: رسم / تحريك / تكبير / خط الحائط / رسم تقريبي ---------------- */
  function onDown(e) {
    suppressClick = false; // لو click قديم ماوصلش، مايبلعش الضغطة الجديدة
    if (!ready() || e.button !== 0 || ED.tool === "scale" || ED.first) return;
    const s = svgEl(); if (!s || !s.contains(e.target)) return;
    if (e.target.closest("[data-cand]")) return; // الضغط على مستطيل مقترح بيضيفه (في click)
    const q = toSvg(e), handle = e.target.closest("[data-handle]"), boxEl = e.target.closest("[data-editor-box]");
    const box = (id) => draft().boxes.find((b) => b.id === id), wallPt = e.target.closest("[data-wall-pt]"), polyPt = e.target.closest("[data-poly-pt]");
    if (polyPt) {
      drag = { kind: "polypt", i: Number(polyPt.dataset.polyPt), start: q };
    } else if (mode === "points" && poly.length) {
      drag = { kind: "points", start: q }; // وإحنا بنرسم، الضغط فوق بوكس تاني بيحط نقطة برضه
    } else if (wallPt) {
      drag = { kind: "wallpt", which: wallPt.dataset.wallPt, start: q };
    } else if (handle) {
      const b = box(ED.selected);
      drag = { kind: "resize", dir: handle.dataset.handle, b, o: { x: b.x, y: b.y, w: b.w, h: b.h }, start: q };
    } else if (boxEl && !(mode === "wall" && wall.a && !wall.b)) {
      const b = box(boxEl.dataset.editorBox);
      drag = { kind: "move", b, o: { x: b.x, y: b.y, w: b.w, h: b.h }, start: q, select: true };
    } else if (mode === "wall" && wall.b) {
      return; // الحائط متحددة: اللمس في مكان فاضي مايحرّكهاش، والتظبيط بمسك النقطة نفسها
    } else if (mode === "points") {
      drag = { kind: "points", start: q };
    } else if (e.pointerType === "touch" && mode !== "wall") {
      return; // باللمس، السحب على مكان فاضي بيحرّك الصفحة، والرسم بضغطتين على ركنين
    } else if (mode === "wall") {
      drag = { kind: "wall", start: q };
    } else {
      drag = { kind: mode === "auto" ? "rough" : "draw", start: snapPoint(q) };
    }
    drag.moved = false;
    drag.px = [e.clientX, e.clientY];
    drag.pointer = e.pointerId;
    e.preventDefault();
  }
  function onMove(e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.px[0], e.clientY - drag.px[1]) < 5) return;
    if (!drag.moved) { try { svgEl().setPointerCapture(drag.pointer); } catch (err) {} } // الضغطة من غير سحب تفضل click عادي
    drag.moved = true;
    const q = toSvg(e), s = svgEl(), tol = 8 * unitPerPx();
    if (drag.kind === "draw" || drag.kind === "rough") {
      const c = drag.kind === "draw" ? snapPoint(q) : q, a = drag.start;
      let r = s.querySelector(".sk-preview");
      if (!r) { r = make("rect", {}, "sk-preview" + (drag.kind === "rough" ? " rough" : "")); s.appendChild(r); }
      drag.rect = { x: Math.min(a[0], c[0]), y: Math.min(a[1], c[1]), w: Math.abs(a[0] - c[0]), h: Math.abs(a[1] - c[1]) };
      for (const k in drag.rect) r.setAttribute(k === "w" ? "width" : k === "h" ? "height" : k, drag.rect[k]);
    } else if (drag.kind === "wall") {
      wall = { a: drag.start, b: magnet(drag.start, q, e) };
      paintWall();
    } else if (drag.kind === "polypt") {
      const prev = poly[drag.i - 1];
      poly[drag.i] = prev && !e.shiftKey ? magnet(prev, q, e) : q;
      paintPoly();
    } else if (drag.kind === "wallpt") {
      const other = drag.which === "a" ? wall.b : wall.a;
      wall[drag.which] = other ? magnet(other, q, e) : q;
      paintWall(); renderPanel();
    } else if (drag.kind === "move" && drag.b.angle) {
      const { b, o } = drag;
      Object.assign(b, { x: o.x + q[0] - drag.start[0], y: o.y + q[1] - drag.start[1] });
      keepInside(b); paintBox(b); handles();
    } else if (drag.kind === "resize" && drag.b.angle) {
      // البوكس المايل: الحركة بتتحسب على اتجاه البوكس نفسه، والضلع المقابل بيفضل مكانه
      const { b, o, dir } = drag, a = rad(b);
      const [dx, dy] = rotate([q[0] - drag.start[0], q[1] - drag.start[1]], -a);
      let L = -o.w / 2, R = o.w / 2, T = -o.h / 2, B = o.h / 2;
      if (dir.includes("w")) L = Math.min(L + dx, R - 4);
      if (dir.includes("e")) R = Math.max(R + dx, L + 4);
      if (dir.includes("n")) T = Math.min(T + dy, B - 4);
      if (dir.includes("s")) B = Math.max(B + dy, T + 4);
      const [mx, my] = rotate([(L + R) / 2, (T + B) / 2], a), cx = o.x + o.w / 2 + mx, cy = o.y + o.h / 2 + my;
      Object.assign(b, { x: cx - (R - L) / 2, y: cy - (B - T) / 2, w: R - L, h: B - T });
      paintBox(b); handles();
    } else if (drag.kind === "move") {
      const { b, o } = drag, { xs, ys } = edges(b);
      let x = clamp(o.x + q[0] - drag.start[0], 0, 1000 - o.w), y = clamp(o.y + q[1] - drag.start[1], 0, H() - o.h);
      const dx = snapPair(x, o.w, xs, tol), dy = snapPair(y, o.h, ys, tol);
      x = clamp(x + dx, 0, 1000 - o.w); y = clamp(y + dy, 0, H() - o.h);
      Object.assign(b, { x, y });
      paintBox(b); handles();
      guides(dx ? [nearest(x, xs, tol) ?? x + o.w] : [], dy ? [nearest(y, ys, tol) ?? y + o.h] : []);
    } else if (drag.kind === "resize") {
      const { b, o, dir } = drag, { xs, ys } = edges(b);
      let L = o.x, T = o.y, R = o.x + o.w, B = o.y + o.h;
      const dx = q[0] - drag.start[0], dy = q[1] - drag.start[1], snap = (v, list) => nearest(v, list, tol) ?? v;
      if (dir.includes("w")) L = clamp(snap(o.x + dx, xs), 0, R - 4);
      if (dir.includes("e")) R = clamp(snap(o.x + o.w + dx, xs), L + 4, 1000);
      if (dir.includes("n")) T = clamp(snap(o.y + dy, ys), 0, B - 4);
      if (dir.includes("s")) B = clamp(snap(o.y + o.h + dy, ys), T + 4, H());
      Object.assign(b, { x: L, y: T, w: R - L, h: B - T });
      paintBox(b); handles();
    }
  }
  function onUp(e) {
    const d = drag; drag = null;
    if (!d) return;
    const s = svgEl();
    if (s) { s.querySelectorAll(".sk-preview, .sk-guide").forEach((el) => el.remove()); try { s.releasePointerCapture(e.pointerId); } catch (err) {} }
    if (d.kind === "polypt") {
      suppressClick = true;
      if (!d.moved && d.i === 0 && poly.length >= 3) finishPoly(); // الضغط على نقطة 1 بيقفل الشكل
      return;
    }
    if (d.kind === "points") {
      suppressClick = true;
      if (!d.moved) { const q = toSvg(e); poly.push(poly.length ? magnet(poly[poly.length - 1], q, e) : q); paintPoly(); renderPanel(); }
      return;
    }
    if (d.kind === "wallpt") {
      suppressClick = true;
      if (d.moved && wall.b) wallReady(false);
      return;
    }
    if (d.kind === "wall") {
      const q = toSvg(e);
      if (d.moved) { wall = { a: d.start, b: magnet(d.start, q, e) }; suppressClick = true; wallReady(); }
      else { // ضغطتين: نقطة 1 (أول الحائط) ونقطة 2 (آخرها)
        if (!wall.a) wall = { a: q, b: null }; else if (!wall.b) { wall.b = magnet(wall.a, q, e); wallReady(); }
        suppressClick = true; paintWall(); renderPanel();
      }
      return;
    }
    if (!d.moved) { if (d.select) return; return; }
    suppressClick = true;
    if (d.kind === "draw") {
      const r = d.rect;
      if (!r || r.w < 4 || r.h < 4) return;
      addBoxes([newBox(r.x, r.y, r.w, r.h)]);
    } else if (d.kind === "rough") {
      const r = d.rect;
      if (!r || r.w < 4 || r.h < 4) return;
      fitToLines(r).then((f) => addBoxes([newBox(f.x, f.y, f.w, f.h)]));
    } else {
      ED.selected = d.b.id;
      ED.tool = "select";
      UI.updateEditor();
    }
  }

  /* ---------------- «بالمقاسات»: خط الحائط وعروض الخزائن ---------------- */
  // خط الحائط بأي زاوية. لو قريب جدًا من الأفقي أو الرأسي (أقل من درجة ونص) بيتعدل لوحده، إلا لو Alt مضغوط
  function magnet(a, q, e) {
    if (e && e.altKey) return q;
    const ang = Math.atan2(q[1] - a[1], q[0] - a[0]), near = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(ang - near) > (1.5 * Math.PI) / 180) return q;
    const L = Math.hypot(q[0] - a[0], q[1] - a[1]);
    return [clamp(a[0] + L * Math.cos(near), 0, 1000), clamp(a[1] + L * Math.sin(near), 0, H())];
  }
  const wallUnits = () => wall.b ? Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]) : 0;
  const wallDir = () => { const L = wallUnits() || 1; return [(wall.b[0] - wall.a[0]) / L, (wall.b[1] - wall.a[1]) / L]; };
  const wallAngle = () => { const [x, y] = wallDir(); let d = Math.round((-Math.atan2(y, x) * 180) / Math.PI); d = ((d % 180) + 180) % 180; return d > 90 ? d - 180 : d; };
  // ناحية الخزائن: الناحية الأولى دايمًا تحت الخط أو يمينه، والتانية عكسها
  function wallNormal() {
    const [tx, ty] = wallDir();
    let n = [-ty, tx];
    if (n[1] < -1e-6 || (Math.abs(n[1]) <= 1e-6 && n[0] < 0)) n = [-n[0], -n[1]];
    return $("skWallSide").dataset.side === "2" ? [-n[0], -n[1]] : n;
  }
  function wallReady(focus = true) {
    if (wallUnits() < 5) { wall = { a: wall.a, b: null }; paintWall(); renderPanel(); return; }
    const sc = draft().scale;
    if (sc && sc.metersPerUnit) $("skWallLen").value = Math.round(wallUnits() * sc.metersPerUnit * 100);
    paintWall(); renderPanel();
    if (focus) setTimeout(() => (sc ? $("skWallWidths") : $("skWallLen")).focus(), 0);
  }
  const num = (v) => Number(String(v).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[٫,]/g, ".").trim());
  const widthsOf = (v) => String(v).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).split(/[\s,،؛;+\-]+/).map(Number).filter((n) => n > 0);
  // بوكس عرضه w وعمقه d، نصه c، وواجهته ناحية f. لو الاتجاه مستقيم بيرجع بوكس عادي، ولو مايل بيرجع بوكس بزاوية
  function orientedBox([cx, cy], w, d, f) {
    // الواجهة الأقرب للاتجاه، والفرق (أقل من 45 درجة) بيبقى ميل البوكس
    const ang = (Math.atan2(f[1], f[0]) * 180) / Math.PI, near = Math.round(ang / 90) * 90, k = ((near % 360) + 360) % 360;
    const b = k === 90 || k === 270
      ? { x: cx - w / 2, y: cy - d / 2, w, h: d, face: k === 90 ? "south" : "north" }
      : { x: cx - d / 2, y: cy - w / 2, w: d, h: w, face: k === 0 ? "east" : "west" };
    const t = Math.round((ang - near) * 100) / 100;
    if (Math.abs(t) >= 0.05) b.angle = t;
    return b;
  }
  function wallLayout() {
    if (!wall.b) return { err: "ارسم خط الحائط أولًا." };
    const len = num($("skWallLen").value), depth = num($("skWallDepth").value) || 60, widths = widthsOf($("skWallWidths").value);
    if (!(len >= 20)) return { err: "اكتب طول الحائط بالسنتيمتر." };
    if (!widths.length) return { err: "اكتب عروض الخزائن بالسنتي، مثلًا: 90، 60، 120." };
    const total = widths.reduce((a, b) => a + b, 0);
    if (total > len + 0.5) return { err: `مجموع العروض ${total} سم أكبر من طول الحائط ${len} سم.` };
    const u = wallUnits() / len, t = wallDir(), n = wallNormal(), d = depth * u;
    const out = []; let at = 0;
    for (const wcm of widths) {
      const w = wcm * u, m = at + w / 2;
      out.push(orientedBox([wall.a[0] + t[0] * m + n[0] * d / 2, wall.a[1] + t[1] * m + n[1] * d / 2], w, d, n));
      at += w;
    }
    const outside = (b) => P.polygon(Object.assign({ kind: "straight" }, b), draft()).some(([x, y]) => x < -0.5 || y < -0.5 || x > 1000.5 || y > H() + 0.5);
    if (out.some(outside)) return { err: "البوكسات تخرج عن حدود المخطط. جرّب الجهة الأخرى أو راجع الطول.", out };
    return { out, len, u, depth };
  }
  function paintWall() {
    const s = svgEl(); if (!s) return;
    s.querySelectorAll(".sk-wall").forEach((el) => el.remove());
    if (mode !== "wall" || !wall.a) return;
    const g = make("g", {}, "sk-wall"), upp = unitPerPx();
    if (wall.b) {
      const lay = wallLayout();
      for (const b of lay.out || []) g.appendChild(make("polygon", { points: P.polygon(Object.assign({ kind: "straight" }, b), draft()).map((q) => q.join(",")).join(" ") }, "sk-wall-box"));
      g.appendChild(make("line", { x1: wall.a[0], y1: wall.a[1], x2: wall.b[0], y2: wall.b[1] }, "sk-wall-line"));
    }
    // كل نقطة بتتمسك وتتحرك لوحدها. الدايرة الشفافة الأكبر هي مكان المسك
    [["a", wall.a, "1"], ["b", wall.b, "2"]].forEach(([k, p, label]) => {
      if (!p) return;
      g.appendChild(make("circle", { cx: p[0], cy: p[1], r: 13 * upp, "data-wall-pt": k }, "sk-wall-hit"));
      g.appendChild(make("circle", { cx: p[0], cy: p[1], r: 6 * upp }, "sk-wall-pt"));
      const t = make("text", { x: p[0], y: p[1] + 3 * upp, "font-size": 8 * upp }, "sk-wall-num");
      t.textContent = label; g.appendChild(t);
    });
    s.appendChild(g);
  }
  function applyWall() {
    const lay = wallLayout();
    if (lay.err) { say(lay.err); return; }
    if (!draft().scale) draft().scale = { metersPerUnit: lay.len / 100 / wallUnits(), points: [wall.a.slice(), wall.b.slice()], lengthCm: lay.len };
    const depth = lay.depth;
    wall = { a: null, b: null };
    addBoxes(lay.out.map((b) => {
      const nb = Object.assign(newBox(b.x, b.y, b.w, b.h), { kind: "straight", face: b.face, depth });
      if (b.angle) nb.angle = b.angle; else delete nb.angle;
      return nb;
    }));
    say("");
  }

  /* ---------------- «بالنقاط»: حدود الخزانة نقطة نقطة ---------------- */
  // 4 نقاط = خزانة مستقيمة، 5 نقاط = كورنر مشطوف، 6 نقاط = كورنر حرف L. الشكل ممكن يبقى مايل
  function paintPoly() {
    const s = svgEl(); if (!s) return;
    s.querySelectorAll(".sk-poly").forEach((el) => el.remove());
    if (mode !== "points" || !poly.length) return;
    const g = make("g", {}, "sk-poly"), upp = unitPerPx(), pts = poly.map((q) => q.join(",")).join(" ");
    if (poly.length >= 3) g.appendChild(make("polygon", { points: pts }, "sk-poly-fill"));
    g.appendChild(make("polyline", { points: pts }, "sk-wall-line"));
    poly.forEach((p, i) => {
      g.appendChild(make("circle", { cx: p[0], cy: p[1], r: 12 * upp, "data-poly-pt": i }, "sk-wall-hit"));
      g.appendChild(make("circle", { cx: p[0], cy: p[1], r: (i === 0 && poly.length >= 3 ? 7.5 : 6) * upp }, "sk-wall-pt" + (i === 0 && poly.length >= 3 ? " sk-poly-close" : "")));
      const t = make("text", { x: p[0], y: p[1] + 3 * upp, "font-size": 8 * upp }, "sk-wall-num");
      t.textContent = i + 1; g.appendChild(t);
    });
    s.appendChild(g);
  }
  // بيشيل النقط المكررة أو اللي على نفس الخط
  function cleanPoly(pts) {
    let out = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 2);
    if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 2) out.pop();
    for (let changed = true; changed && out.length > 3;) {
      changed = false;
      for (let i = 0; i < out.length; i++) {
        const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
        const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        let d = Math.abs(t2 - t1) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d;
        if (d < (8 * Math.PI) / 180) { out.splice(i, 1); changed = true; break; }
      }
    }
    return out;
  }
  function fitPoly(raw) {
    const pts = cleanPoly(raw), n = pts.length;
    if (n < 4 || n > 6) return { err: `تم وضع ${n} نقاط. الخزانة المستقيمة 4 نقاط، والكورنر المشطوف 5، والكورنر حرف L ست نقاط.` };
    // ميل الشكل من أطول ضلع فيه، وأقل من درجة ونص بيتعدل مستقيم
    let long = 0, ang = 0;
    pts.forEach((p, i) => { const q = pts[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L > long) { long = L; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); } });
    ang -= Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(ang) < (1.5 * Math.PI) / 180) ang = 0;
    const c0 = [pts.reduce((a, p) => a + p[0], 0) / n, pts.reduce((a, p) => a + p[1], 0) / n];
    const loc = pts.map((p) => rotate([p[0] - c0[0], p[1] - c0[1]], -ang));
    const x0 = Math.min(...loc.map((p) => p[0])), x1 = Math.max(...loc.map((p) => p[0])), y0 = Math.min(...loc.map((p) => p[1])), y1 = Math.max(...loc.map((p) => p[1]));
    const w = x1 - x0, h = y1 - y0;
    if (w < 4 || h < 4) return { err: "الشكل صغير جدًا." };
    const [cx, cy] = rotate([(x0 + x1) / 2, (y0 + y1) / 2], ang), center = [c0[0] + cx, c0[1] + cy];
    const box = { x: center[0] - w / 2, y: center[1] - h / 2, w, h };
    if (ang) box.angle = Math.round((ang * 180 / Math.PI) * 100) / 100;
    if (n === 4) return { box: Object.assign(box, { kind: "straight" }) };
    // الركن الناقص من المستطيل اللي حوالين الشكل هو جوه الزاوية، والواجهة عكسه
    const tol = Math.min(w, h) * 0.12, has = (X, Y) => loc.some((p) => Math.hypot(p[0] - X, p[1] - Y) <= tol);
    const corners = { nw: [x0, y0], ne: [x1, y0], se: [x1, y1], sw: [x0, y1] }, opposite = { nw: "se", ne: "sw", se: "nw", sw: "ne" };
    const missing = Object.keys(corners).filter((k) => !has(...corners[k]));
    if (missing.length !== 1) return { err: "تعذّر تحديد شكل الزاوية. ضع النقاط على أركان الخزانة بالترتيب حولها." };
    const face = opposite[missing[0]], mx = face === "ne" || face === "se", mz = face === "sw" || face === "se";
    const uv = loc.map((p) => [mx ? x1 - p[0] : p[0] - x0, mz ? y1 - p[1] : p[1] - y0]);
    // عمق الضلعين: النقطة اللي على الحافة البعيدة وجوه الشكل
    const dy = Math.max(...uv.filter((p) => p[0] >= w - tol && p[1] > tol).map((p) => p[1]).concat([0])) || h * 0.4;
    const dx = Math.max(...uv.filter((p) => p[1] >= h - tol && p[0] > tol).map((p) => p[0]).concat([0])) || w * 0.4;
    const sc = draft().scale, dep = (Math.min(dx, w * 0.9) + Math.min(dy, h * 0.9)) / 2;
    Object.assign(box, { kind: n === 6 ? "lcorner" : "corner", face });
    if (sc && sc.metersPerUnit) box.depth = Math.max(20, Math.round(dep * sc.metersPerUnit * 100));
    return { box, noScale: !(sc && sc.metersPerUnit) };
  }
  function finishPoly() {
    const f = fitPoly(poly);
    if (f.err) { say(f.err); return; }
    poly = [];
    const nb = Object.assign(newBox(f.box.x, f.box.y, f.box.w, f.box.h), f.box);
    if (f.box.kind === "straight" && !["south", "north", "east", "west"].includes(nb.face)) nb.face = "south";
    if (!f.box.angle) delete nb.angle;
    addBoxes([nb]);
    say(f.noScale && f.box.kind !== "straight" ? "تمت الإضافة. اضبط المقياس ليكون عمق الزاوية صحيحًا." : "");
  }

  /* ---------------- «تلقائي»: تحليل صورة المخطط ---------------- */
  async function getPixels() {
    const d = draft();
    if (pixels && pixels.src === d.image) return pixels;
    const im = new Image();
    im.src = d.image;
    await im.decode();
    const W = Math.min(1100, im.width), Hh = Math.round((im.height * W) / im.width);
    const c = document.createElement("canvas"); c.width = W; c.height = Hh;
    const ctx = c.getContext("2d"); ctx.drawImage(im, 0, 0, W, Hh);
    const data = ctx.getImageData(0, 0, W, Hh).data, dark = new Uint8Array(W * Hh);
    for (let i = 0; i < W * Hh; i++) dark[i] = (data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11) < 165 ? 1 : 0;
    pixels = { src: d.image, W, H: Hh, dark };
    return pixels;
  }
  // رسم تقريبي: كل حافة بتتلزق في أقوى خط في المخطط قريب منها
  async function fitToLines(r) {
    const px = await getPixels(), sx = px.W / 1000, sy = px.H / H();
    const R = { x: r.x * sx, y: r.y * sy, w: r.w * sx, h: r.h * sy };
    const mx = Math.max(6, R.w * 0.2), my = Math.max(6, R.h * 0.2);
    const col = (x, y0, y1) => { let n = 0; x = Math.round(x); for (let y = Math.max(0, Math.round(y0)); y < Math.min(px.H, y1); y++) n += px.dark[y * px.W + x] || 0; return n / Math.max(1, y1 - y0); };
    const row = (y, x0, x1) => { let n = 0; y = Math.round(y); for (let x = Math.max(0, Math.round(x0)); x < Math.min(px.W, x1); x++) n += px.dark[y * px.W + x] || 0; return n / Math.max(1, x1 - x0); };
    // أقرب خط غامق للحافة اللي اترسمت. لو الخط سميك (حيطة) بناخد وشه الداخلي، ولو رفيع بناخد نصه
    const best = (from, to, f, at, inward) => {
      const runs = []; let cur = null;
      for (let p = Math.max(0, Math.round(from)); p <= Math.round(to); p++) {
        if (f(p) >= 0.45) { if (cur) cur[1] = p; else runs.push(cur = [p, p]); } else cur = null;
      }
      if (!runs.length) return null;
      const dist = (r) => (at < r[0] ? r[0] - at : at > r[1] ? at - r[1] : 0);
      const r = runs.sort((a, b) => dist(a) - dist(b))[0];
      return r[1] - r[0] >= 4 ? (inward > 0 ? r[1] + 1 : r[0]) : (r[0] + r[1]) / 2;
    };
    const cy0 = R.y + R.h * .15, cy1 = R.y + R.h * .85, cx0 = R.x + R.w * .15, cx1 = R.x + R.w * .85;
    const L = best(R.x - mx, Math.min(px.W - 1, R.x + mx), (x) => col(x, cy0, cy1), R.x, 1) ?? R.x;
    const Rr = best(Math.max(0, R.x + R.w - mx), Math.min(px.W - 1, R.x + R.w + mx), (x) => col(x, cy0, cy1), R.x + R.w, -1) ?? R.x + R.w;
    const T = best(R.y - my, Math.min(px.H - 1, R.y + my), (y) => row(y, cx0, cx1), R.y, 1) ?? R.y;
    const B = best(Math.max(0, R.y + R.h - my), Math.min(px.H - 1, R.y + R.h + my), (y) => row(y, cx0, cx1), R.y + R.h, -1) ?? R.y + R.h;
    if (Rr - L < 3 || B - T < 3) return r;
    return { x: L / sx, y: T / sy, w: (Rr - L) / sx, h: (B - T) / sy };
  }
  // بيدوّر على المساحات المقفولة اللي شكلها مستطيل وحجمها قريب من حجم خزانة
  async function detect() {
    say("جارٍ البحث عن الخزائن في المخطط…");
    const px = await getPixels(), { W } = px, Hh = px.H;
    const wall = new Uint8Array(W * Hh);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      wall[i] = px.dark[i] || (x > 0 && px.dark[i - 1]) || (x < W - 1 && px.dark[i + 1]) || (y > 0 && px.dark[i - W]) || (y < Hh - 1 && px.dark[i + W]) ? 1 : 0;
    }
    const seen = new Uint8Array(W * Hh), found = [], stack = new Int32Array(W * Hh);
    const minA = W * Hh * 0.0003, maxA = W * Hh * 0.06;
    for (let s = 0; s < W * Hh; s++) {
      if (wall[s] || seen[s]) continue;
      let top = 0, area = 0, x0 = W, y0 = Hh, x1 = 0, y1 = 0, edge = false;
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top], x = i % W, y = (i / W) | 0;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x === 0 || y === 0 || x === W - 1 || y === Hh - 1) edge = true;
        for (const j of [i - 1, i + 1, i - W, i + W]) {
          if (j < 0 || j >= W * Hh || seen[j] || wall[j]) continue;
          if ((j === i - 1 && x === 0) || (j === i + 1 && x === W - 1)) continue;
          seen[j] = 1; stack[top++] = j;
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (edge || area < minA || area > maxA || bw < 12 || bh < 12) continue;
      if (area / (bw * bh) < 0.82 || Math.max(bw / bh, bh / bw) > 10) continue;
      found.push({ x: (x0 - 1) * 1000 / W, y: (y0 - 1) * H() / Hh, w: (bw + 2) * 1000 / W, h: (bh + 2) * H() / Hh });
    }
    const overlaps = (a, b) => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return ix * iy / Math.min(a.w * a.h, b.w * b.h) > 0.5; };
    candidates = found.filter((c) => !draft().boxes.some((b) => overlaps(b, c)));
    paintCandidates(); renderPanel();
    say(candidates.length ? "" : "لم يُعثر على مستطيلات واضحة. جرّب الرسم التقريبي حول كل خزانة.");
  }
  function paintCandidates() {
    const s = svgEl(); if (!s) return;
    s.querySelectorAll(".sk-cands").forEach((el) => el.remove());
    if (mode !== "auto" || !candidates.length) return;
    const g = make("g", {}, "sk-cands");
    candidates.forEach((c, i) => {
      const r = make("rect", { x: c.x, y: c.y, width: c.w, height: c.h, "data-cand": i }, "sk-cand");
      g.appendChild(r);
    });
    s.appendChild(g);
  }
  function addCandidate(i) {
    const c = candidates[i]; if (!c) return;
    candidates.splice(i, 1);
    addBoxes([newBox(c.x, c.y, c.w, c.h)]);
  }

  /* ---------------- لوحة طريقة الرسم ---------------- */
  function say(msg) { const el = $("skDrawMsg"); if (el) { el.textContent = msg; el.hidden = !msg; } }
  function injectUI() {
    if ($("skDrawModes")) return;
    $("drawBox").insertAdjacentHTML("beforebegin",
      `<div class="sk-draw-modes" id="skDrawModes" role="radiogroup" aria-label="طريقة الرسم">
        <span>طريقة الرسم:</span>
        ${Object.keys(MODES).map((m) => `<button type="button" role="radio" data-draw-mode="${m}">${MODES[m]}</button>`).join("")}
      </div>`);
    document.querySelector(".editor-sidebar").insertAdjacentHTML("afterbegin",
      `<section class="sk-draw-panel" id="skDrawPanel">
        <div data-for="drag"><b>رسم بالسحب</b>
          <p>اسحب على المخطط من ركن الخزانة إلى الركن المقابل. اسحب البوكس لتحريكه، ومن المربعات الصغيرة لتكبيره. يلتصق البوكس تلقائيًا بحواف البوكسات المجاورة.</p></div>
        <div data-for="points"><b>رسم بالنقاط</b>
          <p>اضغط على أركان الخزانة واحدًا تلو الآخر حولها. 4 نقاط للخزانة المستقيمة، 5 للكورنر المشطوف، 6 للكورنر حرف L. أغلق الشكل بالضغط على نقطة 1 أو «تم». يمكنك سحب أي نقطة وتحريكها قبل الانتهاء.</p>
          <p class="sk-wall-info" id="skPolyInfo" hidden></p>
          <div class="sk-auto-actions">
            <button type="button" class="primary" id="skPolyDone">تم</button>
            <button type="button" class="secondary" id="skPolyUndo">احذف آخر نقطة</button>
            <button type="button" class="text-button" id="skPolyClear">ابدأ من الأول</button>
          </div></div>
        <div data-for="wall"><b>رسم بالمقاسات</b>
          <p id="skWallHint">اضغط على بداية الحائط ونهايته (أو اسحب عليه) على الخط الذي ستُركّب عليه الخزائن.</p>
          <p class="sk-wall-info" id="skWallInfo" dir="auto" hidden></p>
          <div id="skWallForm">
            <label>طول الحائط (سم)<input id="skWallLen" inputmode="decimal" dir="ltr"></label>
            <label>عروض الخزائن بالترتيب (سم)<input id="skWallWidths" dir="ltr" placeholder="90, 60, 120"></label>
            <label>العمق (سم)<input id="skWallDepth" inputmode="decimal" dir="ltr" value="60"></label>
            <div class="sk-wall-side"><span>جهة الخزائن:</span><button type="button" id="skWallSide" data-side="1"></button></div>
            <button type="button" class="primary" id="skWallApply">رص البوكسات</button>
            <button type="button" class="text-button" id="skWallReset">ارسم الحائط من جديد</button>
          </div></div>
        <div data-for="auto"><b>رسم تلقائي</b>
          <p>«ابحث عن الخزائن» يحدد المستطيلات التي تشبه الخزائن، واضغط على أيٍّ منها لإضافته. أو ارسم تقريبيًا حول الخزانة، وسيضبط البرنامج البوكس على خطوط المخطط.</p>
          <div class="sk-auto-actions">
            <button type="button" class="primary" id="skDetect">ابحث عن الخزائن</button>
            <button type="button" class="secondary" id="skAddAll" hidden>إضافة الكل</button>
          </div></div>
        <p class="sk-draw-msg" id="skDrawMsg" role="status" hidden></p>
        <p class="sk-draw-keys">Ctrl+D تكرار البوكس · الأسهم للتحريك · Delete للحذف · Ctrl + العجلة للتكبير</p>
      </section>`);
    $("boxEditorFields").querySelector(".box-fields-heading").insertAdjacentHTML("beforeend",
      `<button type="button" class="text-button" id="skDupBox">تكرار</button>`);
    $("editBoxDepth").closest("label").insertAdjacentHTML("afterend",
      `<label>ميل البوكس (درجة)<input id="skBoxAngle" inputmode="decimal" dir="ltr" placeholder="0"></label>`);
    $("skBoxAngle").onchange = () => {
      const b = draft().boxes.find((q) => q.id === ED.selected); if (!b) return;
      let a = num($("skBoxAngle").value) || 0; a = ((a % 360) + 540) % 360 - 180;
      if (Math.abs(a) < 0.01) delete b.angle; else b.angle = Math.round(a * 100) / 100;
      UI.updateEditor();
    };

    document.querySelectorAll("[data-draw-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.drawMode)));
    $("skWallSide").onclick = () => { $("skWallSide").dataset.side = $("skWallSide").dataset.side === "1" ? "2" : "1"; renderPanel(); paintWall(); };
    for (const id of ["skWallLen", "skWallWidths", "skWallDepth"]) $(id).oninput = () => { paintWall(); say(""); };
    $("skWallWidths").onkeydown = (e) => { if (e.key === "Enter") applyWall(); };
    $("skWallApply").onclick = applyWall;
    $("skWallReset").onclick = () => { wall = { a: null, b: null }; paintWall(); renderPanel(); };
    $("skDetect").onclick = () => detect().catch(() => say("تعذّر تحليل هذه الصورة."));
    $("skAddAll").onclick = () => { const all = candidates.splice(0); addBoxes(all.map((c) => newBox(c.x, c.y, c.w, c.h))); renderPanel(); };
    $("skDupBox").onclick = duplicate;
    $("skPolyDone").onclick = finishPoly;
    $("skPolyUndo").onclick = () => { poly.pop(); paintPoly(); renderPanel(); say(""); };
    $("skPolyClear").onclick = () => { poly = []; paintPoly(); renderPanel(); say(""); };

    const canvas = $("editorCanvas");
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", () => { drag = null; });
    canvas.addEventListener("click", (e) => {
      if (suppressClick) { suppressClick = false; e.stopPropagation(); return; }
      const cand = e.target.closest && e.target.closest("[data-cand]");
      if (cand) { e.stopPropagation(); addCandidate(Number(cand.dataset.cand)); return; }
      if ((mode === "wall" || mode === "points") && !e.target.closest("[data-editor-box]")) e.stopPropagation();
    }, true);
    document.querySelector(".editor-canvas-scroll").addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const z = $("planZoom"), v = clamp(Number(z.value) + (e.deltaY < 0 ? 0.1 : -0.1), Number(z.min), Number(z.max));
      z.value = v.toFixed(1); z.dispatchEvent(new Event("input"));
      setTimeout(afterRender, 0);
    }, { passive: false });
    $("planZoom").addEventListener("input", () => setTimeout(afterRender, 0));
    document.addEventListener("keydown", onKey);
  }
  function setMode(m) {
    mode = m;
    try { localStorage.setItem("sakan:drawMode", m); } catch (e) {}
    wall = { a: null, b: null }; poly = [];
    if (m !== "auto") candidates = [];
    ED.tool = m === "drag" ? "draw" : "select";
    say("");
    UI.updateEditor();
  }
  function renderPanel() {
    document.querySelectorAll("[data-draw-mode]").forEach((b) => b.setAttribute("aria-checked", b.dataset.drawMode === mode));
    document.querySelectorAll("#skDrawPanel [data-for]").forEach((el) => (el.hidden = el.dataset.for !== mode));
    $("skWallForm").hidden = !wall.b;
    $("skWallHint").textContent = wall.b ? "اسحب النقطة 1 أو 2 لضبط الحائط، واكتب المقاسات." : wall.a ? "اضغط على نهاية الحائط (نقطة 2)." : "اضغط على بداية الحائط ونهايته (أو اسحب عليه) على الخط الذي ستُركّب عليه الخزائن.";
    $("skWallInfo").hidden = !wall.b;
    if (wall.b) {
      const sc = draft().scale, cm = sc && sc.metersPerUnit ? Math.round(wallUnits() * sc.metersPerUnit * 100) : null;
      $("skWallInfo").textContent = (cm ? `الطول على المقياس: ${cm} سم · ` : "") + `الميل: ${wallAngle()}°`;
      const [nx, ny] = wallNormal(), i = ((Math.round(Math.atan2(ny, nx) / (Math.PI / 4)) % 8) + 8) % 8;
      $("skWallSide").textContent = "→↘↓↙←↖↑↗"[i] + " تبديل الجهة";
    }
    const kinds = { 4: "خزانة مستقيمة", 5: "كورنر مشطوف", 6: "كورنر حرف L" };
    $("skPolyInfo").hidden = !poly.length;
    $("skPolyInfo").textContent = `${poly.length} نقاط` + (kinds[poly.length] ? ` · ${kinds[poly.length]}` : "");
    $("skPolyDone").disabled = poly.length < 4; $("skPolyUndo").disabled = !poly.length; $("skPolyClear").hidden = !poly.length;
    $("skAddAll").hidden = !candidates.length;
    $("skAddAll").textContent = `إضافة الكل (${candidates.length})`;
  }
  function helpText() {
    if (!draft().image || ED.busy || ED.tool === "scale" || ED.first) return;
    const t = mode === "points" ? "اضغط على أركان الخزانة بالترتيب، وأغلق الشكل عند نقطة 1."
      : mode === "wall" ? "حدد الحيطة، واكتب عروض الخزائن بالسنتيمتر."
      : mode === "auto" ? "ابحث عن الخزائن، أو ارسم تقريبيًا حول كل خزانة."
      : "اسحب لرسم بوكس. اسحب البوكس لتحريكه، ومن أركانه لتكبيره.";
    $("editorHelp").textContent = t;
  }
  function afterRender() {
    if (!draft() || !$("skDrawModes")) return;
    renderPanel();
    if (!draft().image) return;
    handles(); paintWall(); paintPoly(); paintCandidates(); helpText();
    const b = draft().boxes.find((q) => q.id === ED.selected), ang = $("skBoxAngle");
    if (b && ang && document.activeElement !== ang) ang.value = b.angle ? b.angle : "";
  }

  /* ---------------- تكرار وكيبورد ---------------- */
  function duplicate() {
    const b = draft().boxes.find((q) => q.id === ED.selected); if (!b) return;
    const free = (x, y) => x >= 0 && y >= 0 && x + b.w <= 1000.1 && y + b.h <= H() + 0.1 && !draft().boxes.some((q) => x < q.x + q.w - 0.5 && x + b.w > q.x + 0.5 && y < q.y + q.h - 0.5 && y + b.h > q.y + 0.5);
    if (b.angle) { // البوكس المايل: النسخة بتتحط جنبه على نفس الحائط
      const [ux, uy] = rotate([b.w, 0], rad(b)), c = { ...b, x: b.x + ux, y: b.y + uy };
      if (c.x + c.w / 2 > 1000 || c.y + c.h / 2 > H() || c.x + c.w / 2 < 0 || c.y + c.h / 2 < 0) Object.assign(c, { x: b.x - ux, y: b.y - uy });
      keepInside(c); addBoxes([c]); return;
    }
    const spots = [[b.x + b.w, b.y], [b.x - b.w, b.y], [b.x, b.y + b.h], [b.x, b.y - b.h]];
    const [x, y] = spots.find(([x, y]) => free(x, y)) || [clamp(b.x + 15, 0, 1000 - b.w), clamp(b.y + 15, 0, H() - b.h)];
    addBoxes([Object.assign({}, b, { x, y })]);
  }
  function onKey(e) {
    if (!$("planEditorDialog").open || !draft() || !draft().image) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (mode === "points" && poly.length) {
      if (e.key === "Enter") { e.preventDefault(); finishPoly(); return; }
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); poly.pop(); paintPoly(); renderPanel(); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); poly = []; say(""); paintPoly(); renderPanel(); return; }
    }
    const b = draft().boxes.find((q) => q.id === ED.selected);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(); return; }
    if (!b) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); $("removeEditorBox").click(); return; }
    const step = e.shiftKey ? 10 : 1, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!mv) return;
    e.preventDefault();
    b.x += mv[0]; b.y += mv[1]; keepInside(b);
    paintBox(b); handles();
    clearTimeout(onKey.t); onKey.t = setTimeout(() => UI.updateEditor(), 400);
  }

  // مخطط جديد أو صورة جديدة: نبدأ من الأول بالطريقة اللي المهندس اختارها آخر مرة
  let lastKey = "";
  window.addEventListener("indesign:editor-render", () => {
    injectUI();
    const d = draft(), key = d ? d.id + "|" + (d.image ? d.image.length : 0) : "";
    if (key !== lastKey) { lastKey = key; wall = { a: null, b: null }; poly = []; candidates = []; if (mode !== "drag" && ED.tool === "draw") ED.tool = "select"; }
    afterRender();
  });
  window.SakanPlanTools = { setMode, mode: () => mode, detect, fitToLines, duplicate, fitPoly };
})();
