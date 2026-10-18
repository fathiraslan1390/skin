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

# 2ج) البوكس ممكن يبقى مايل (angle بالدرجات حوالين نصه) عشان الحيطان المايلة: في الخريطة وفي الـ360°
sub("function polygon(b,p){let {x,y,w,h}=b;",
    "function polygon(b,p){let q=polygon0(b,p),a=(b.angle||0)*Math.PI/180;if(!a)return q;let cx=b.x+b.w/2,cy=b.y+b.h/2,c=Math.cos(a),s=Math.sin(a);"
    "return q.map(([X,Y])=>[cx+(X-cx)*c-(Y-cy)*s,cy+(X-cx)*s+(Y-cy)*c])}function polygon0(b,p){let {x,y,w,h}=b;")
sub("if(b.kind==='fixed'){d.fixedHeight=b.fixedHeight/100;fixed.push(d)}else defs.push(d)}",
    "if(b.angle){let a=b.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=x+w/2,cz=z+h/2,R=(X,Z)=>[cx+(X-cx)*c-(Z-cz)*s,cz+(X-cx)*s+(Z-cz)*c],V=v=>[v[0]*c-v[2]*s,v[1],v[0]*s+v[2]*c],q=R(d.p[0],d.p[2]);"
    "d.p=[q[0],d.p[1],q[1]];d.u=V(d.u);d.f=V(d.f);d.look=R(d.look[0],d.look[1])}"
    "if(b.kind==='fixed'){d.fixedHeight=b.fixedHeight/100;fixed.push(d)}else defs.push(d)}")

# 3) التنسيق والنوافذ والسكريبتات
import re
sys.path.insert(0, pdir)
import dark_theme
css = open(pdir + '/portal.css').read()
app_css = '\n'.join(re.findall(r'<style>(.*?)</style>', h, re.S))
dark = dark_theme.dark_css(app_css, css)   # الثيم الليلي متولّد من ألوان البرنامج نفسه
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
