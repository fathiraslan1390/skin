"""يركّب بوابة سكن جروب على البرنامج: python3 portal_build.py <rebranded.html> <portal-dir> <out.html>"""
import sys
src, pdir, out = sys.argv[1:4]
h = open(src).read()
def sub(old, new):
    global h
    assert h.count(old) == 1, old[:60]
    h = h.replace(old, new)

# 1) دوال زيادة في INDESIGN_APP عشان البوابة تحمّل وتقرا الاختيارات
sub("window.INDESIGN_APP={getSelections:()=>({...S}),",
    "window.INDESIGN_APP={getSelections:()=>({...S}),"
    "/* SAKAN-PORTAL */"
    "setState(sel,client,notes){S={};for(const b of D.boxes){let t=T.get(Number(sel?.[b.id]));if(t?.kind===b.kind)S[b.id]=t.id}if(client!=null)$('clientName').value=client;if(notes!=null)$('clientNotes').value=notes;save();activate(D.boxes.some(b=>b.id===active)?active:D.boxes[0].id)},"
    "withSelections(sel,fn){let keep=S;S={};for(const b of D.boxes){let t=T.get(Number(sel?.[b.id]));if(t?.kind===b.kind)S[b.id]=t.id}try{return fn()}finally{S=keep}},"
    "planSVG:()=>svg(),"
    "boxes:()=>D.boxes.map(b=>({id:b.id,kind:kindName(b.kind),dims:isCorner(b)&&PlanProjects.current.builtin?'ضلعان 100 × 100 سم · عمق 60 سم':boxDims(b),type:T.get(S[b.id])||null})),"
    "typeOf:id=>T.get(Number(id)),title:()=>D.title,")

# 2) البرنامج مايفتحش المكتبة لوحده أول ما يفتح: البوابة هي اللي بتقرر بعد الدخول
sub("(async()=>{let savedId;", "/* SAKAN-PORTAL: boot بيتنادى من البوابة */const boot=(async()=>{let savedId;")
sub("if(savedId!=='talal-dressing-v1'&&!hasOld)await library()}})();", "if(savedId!=='talal-dressing-v1'&&!hasOld)await library()}});")
sub("window.INDESIGN_PROJECTS_UI={openEditor,", "window.INDESIGN_PROJECTS_UI={boot,openEditor,"
    "editor:{get selected(){return selected},set selected(v){selected=v},get tool(){return tool},set tool(v){tool=v;first=null},"
    "get first(){return first},get busy(){return busy},error},")

# 2ب) المحرر بيبلّغ بعد كل رسم، عشان أدوات الرسم (plan-editor-plus.js) تضيف السحب والمقاسات والتلقائي
sub("بوكسات للاختيارات`;fillBoxForm();}", "بوكسات للاختيارات`;fillBoxForm();window.dispatchEvent(new Event('indesign:editor-render'));}")

# 2د) المخططات بتتحفظ على السيرفر لو البوابة شغالة على Supabase (SakanPlanRemote من portal-api-remote.js)
sub("async function list(){let all=[];", "async function list(){if(root.SakanPlanRemote)return root.SakanPlanRemote.list();let all=[];")
sub("async function put(p){let v=clone(p);", "async function put(p){if(root.SakanPlanRemote)return root.SakanPlanRemote.put(clone(p));let v=clone(p);")
sub("async function remove(id){memory.delete(id);", "async function remove(id){if(root.SakanPlanRemote)return root.SakanPlanRemote.remove(id);memory.delete(id);")

# 2هـ) المخطط التجريبي (غرفة طلال) مايظهرش في مكتبة المخططات
sub("$('projectList').innerHTML=[P.builtin,...plans].map(", "$('projectList').innerHTML=plans.map(")
sub("</article>`).join('');const all=new Map([P.builtin,...plans]", "</article>`).join('')||'<p class=\"sk-muted\">لا توجد مخططات بعد. ارفع مخططًا جديدًا.</p>';const all=new Map([P.builtin,...plans]")

# 2و) الاختيارات بتتحفظ في المشروع (portal.js)، مش في المخطط: المخطط مشترك بين كل المشاريع اللي عليه
sub("function save(){if(!PlanProjects.current.builtin){let p=PlanProjects.current;p.selections={...S};p.client=$('clientName').value;p.notes=$('clientNotes').value;PlanProjects.put(p).then(ok=>{if(!ok)toast('تعذّر الحفظ على الجهاز. نزّل ملف المشروع للاحتفاظ به.');});return}",
    "function save(){if(!PlanProjects.current.builtin)return;")

# 2ج) البوكس ممكن يبقى مايل (angle بالدرجات حوالين نصه) عشان الحيطان المايلة: في الخريطة وفي الـ360°
sub("function polygon(b,p){let {x,y,w,h}=b;",
    "function polygon(b,p){let q=polygon0(b,p),a=(b.angle||0)*Math.PI/180;if(!a)return q;let cx=b.x+b.w/2,cy=b.y+b.h/2,c=Math.cos(a),s=Math.sin(a);"
    "return q.map(([X,Y])=>[cx+(X-cx)*c-(Y-cy)*s,cy+(X-cx)*s+(Y-cy)*c])}function polygon0(b,p){let {x,y,w,h}=b;")
sub("if(b.kind==='fixed'){d.fixedHeight=b.fixedHeight/100;fixed.push(d)}else defs.push(d)}",
    "if(b.angle){let a=b.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=x+w/2,cz=z+h/2,R=(X,Z)=>[cx+(X-cx)*c-(Z-cz)*s,cz+(X-cx)*s+(Z-cz)*c],V=v=>[v[0]*c-v[2]*s,v[1],v[0]*s+v[2]*c],q=R(d.p[0],d.p[2]);"
    "d.p=[q[0],d.p[1],q[1]];d.u=V(d.u);d.f=V(d.f);d.look=R(d.look[0],d.look[1])}"
    "if(b.kind==='fixed'){d.fixedHeight=b.fixedHeight/100;fixed.push(d)}else defs.push(d)}")

# 2ز) قايمة التقسيمات فيها تبويبات: التقسيمات، تسريحة داخل الخزانة، المفضلة، تقسيم مخصص (portal.js بيدير المفضلة والمخصص)
#     التايب بياخد cat: 'div' (الافتراضي) أو 'dresser' أو 'custom'. المخصص بيظهر بس في المشروع اللي اترفع فيه
sub("allowed=()=>D.types.filter(t=>t.kind===box().kind);",
    "allowed=()=>D.types.filter(t=>t.kind===box().kind&&(t.cat!=='custom'||(window.skCustomIds||[]).includes(t.id)));")
sub('id="pickerMenu" class="picker-menu" hidden><div class="picker-search">',
    'id="pickerMenu" class="picker-menu" hidden><div id="skTypeTabs" class="sk-type-tabs" role="tablist" aria-label="أقسام التقسيمات">'
    '<button type="button" role="tab" data-type-tab="div" aria-selected="true">التقسيمات</button>'
    '<button type="button" role="tab" data-type-tab="dresser" aria-selected="false">تسريحة داخل الخزانة</button>'
    '<button type="button" role="tab" data-type-tab="fav" aria-selected="false">المفضلة</button>'
    '<button type="button" role="tab" data-type-tab="custom" aria-selected="false">تقسيم مخصص</button></div>'
    '<div id="skCustomPanel" class="sk-custom-panel" hidden><label>اسم التقسيمة <input id="skCustomName" type="text" maxlength="60" placeholder="مثال: رفوف مع درج سفلي"></label>'
    '<label class="sk-custom-file"><input id="skCustomFile" type="file" accept="image/*"><span>رفع صورة التقسيمة</span></label>'
    '<small>تُحفظ التقسيمة المخصصة مع هذا المشروع وتظهر لهذا النوع من الخزائن.</small></div><div class="picker-search">')
sub("function options(){let q=$('typeSearch').value.trim().toLowerCase(),list=allowed().filter(t=>(t.label+' '+t.name+' '+t.id).toLowerCase().includes(q));$('typeGrid').innerHTML=list.map(t=>`<button class=\"type-option\" data-type=\"${t.id}\" aria-pressed=\"${draft===t.id}\" aria-label=\"${t.label} ${t.name}\"><img src=\"${t.image}\" alt=\"${t.name}\" loading=\"lazy\"><b>${t.label}</b><span>${t.name}</span></button>`).join('')||'<p>لا توجد نتائج بهذا البحث.</p>';",
    "function options(){let q=$('typeSearch').value.trim().toLowerCase(),cat=window.skTypeTab||'div',fav=window.skFavs||[],"
    "list=allowed().filter(t=>cat==='fav'?fav.includes(t.id):(t.cat||'div')===cat).filter(t=>(t.label+' '+t.name+' '+t.id).toLowerCase().includes(q));"
    "$('typeGrid').innerHTML=list.map(t=>`<div class=\"sk-type-cell\"><button class=\"type-option\" data-type=\"${t.id}\" aria-pressed=\"${draft===t.id}\" aria-label=\"${t.label} ${t.name}\"><img src=\"${t.image}\" alt=\"${t.name}\" loading=\"lazy\"><b>${t.label}</b><span>${t.name}</span></button>"
    "<button type=\"button\" class=\"sk-fav${fav.includes(t.id)?' on':''}\" data-fav=\"${t.id}\" aria-pressed=\"${fav.includes(t.id)}\" aria-label=\"المفضلة\" title=\"المفضلة\">★</button></div>`).join('')"
    "||`<p class=\"sk-type-empty\">${q?'لا توجد نتائج بهذا البحث.':({dresser:'لا توجد تسريحات مضافة بعد.',fav:'لا توجد تقسيمات في المفضلة بعد. اضغط النجمة على أي تقسيمة لإضافتها.',custom:'لا توجد تقسيمات مخصصة لهذه الخزانة بعد. ارفع صورة التقسيمة من الأعلى.'}[cat]||'لا توجد نتائج بهذا البحث.')}</p>`;"
    "$('typeGrid').querySelectorAll('[data-fav]').forEach(el=>el.onclick=e=>{e.stopPropagation();window.skToggleFav&&window.skToggleFav(Number(el.dataset.fav))});")
# التايبات المخصصة بتتضاف للبرنامج وقت فتح المشروع أو الرفع، وpick بيختار تايب كأنه اتضغط من القايمة
sub("typeOf:id=>T.get(Number(id)),title:()=>D.title,",
    "typeOf:id=>T.get(Number(id)),title:()=>D.title,"
    "activeKind:()=>box().kind,addTypes(list){for(const t of list||[])if(!T.has(t.id)){D.types.push(t);T.set(t.id,t)}},"
    "pick(id){if(!allowed().some(t=>t.id===id))return;draft=id;close();preview();$('applyType').focus({preventScroll:true})},"
    "refreshTypes(){$('optionsCount').textContent=`${allowed().length} اختيارات مناسبة`;if(!$('pickerMenu').hidden)options()},")
# 2ح) بوكس الزاوية من غير مقياس: عمقه بيتحفظ بوحدات المخطط (depthU) لما يتعدل من نقط أركانه
sub("let dep=p.scale?b.depth/100/p.scale.metersPerUnit:Math.min(w,h)*.6,", "let dep=p.scale?b.depth/100/p.scale.metersPerUnit:(b.depthU||Math.min(w,h)*.6),")
# 2ط) بوكس الزاوية اللي اتعدلت نقطه بإيد المهندس: النقط محفوظة نسبةً للمستطيل اللي حواليه (pts بين 0 و1)،
#     فالتحريك والتكرار والميل بيمشوا عليها. عدد النقط لازم يناسب النوع (5 للمشطوف و6 لحرف L)، غير كده بيترسم الشكل المنتظم
sub("function polygon0(b,p){let {x,y,w,h}=b;", "function polygon0(b,p){let {x,y,w,h}=b;if((b.kind==='corner'||b.kind==='lcorner')&&Array.isArray(b.pts)&&b.pts.length===(b.kind==='lcorner'?6:5))return b.pts.map(([u,v])=>[x+u*w,y+v*h]);")

# 3) التنسيق والنوافذ والسكريبتات
import re
sys.path.insert(0, pdir)
import dark_theme
css = open(pdir + '/portal.css').read()
app_css = '\n'.join(re.findall(r'<style>(.*?)</style>', h, re.S))
dark = dark_theme.dark_css(app_css, css)   # الثيم الليلي متولّد من ألوان البرنامج نفسه
# أيقونة الشاشة الرئيسية للموبايل (الملفات في icons/ و manifest.webmanifest جنب index.html على GitHub)
sub('<meta name="theme-color"', '<link rel="apple-touch-icon" href="icons/icon-180.png"><link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png"><link rel="manifest" href="manifest.webmanifest"><meta name="apple-mobile-web-app-title" content="سكن جروب"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="theme-color"')
sub("</head>", "<style>\n" + css + "\n/* ===== الثيم الليلي (dark_theme.py) ===== */\n" + dark + "</style>\n</head>")
html = open(pdir + '/portal.html').read()
# لو فيه config.json (رابط Supabase ومفتاحه العام) البرنامج بيشتغل على السيرفر، وإلا على الجهاز بس
import json, os
cfg_path = os.environ.get('SAKAN_CONFIG') or pdir + '/config.json'
cfg = json.load(open(cfg_path)) if os.path.exists(cfg_path) else {}
js = "window.SAKAN_CONFIG = " + json.dumps(cfg) + ";\n" + "\n".join(open(pdir + '/' + f).read() for f in ('i18n.js', 'portal-api.js', 'portal-api-remote.js', 'portal.js', 'plan-editor-plus.js'))
i = h.rindex("</body>")
h = h[:i] + html + "\n<script>\n" + js + "</script>\n" + h[i:]
open(out, 'w').write(h)
print("ok", len(h))
