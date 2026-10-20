"""يولّد الثيم الليلي من ألوان البرنامج نفسه.
بيقرا كل CSS، ولكل قاعدة فيها ألوان بيعمل نسخة تحت html[data-theme=dark]
بنفس اللون بس مقلوب الإضاءة (الفاتح يغمق والغامق يفتح) ومحتفظ بدرجته.
ورقة التقرير والطباعة والشريط الأسود مش بيتغيروا."""
import re, colorsys

NAMED = {'white': '#ffffff', 'black': '#000000'}
SKIP_SEL = ('sk-paper', 'printArea', 'sk-topnav', '#sakan-intro', 'sk-tab', '.sk-btn-dark', '.primary', '.text-button', '.secondary', '.sk-btn-blue', '.sk-btn-green', 'sk-seg-btn[aria-checked', 'sk-chip-btn[aria-checked', '.sk-role', '.sk-badge', '.sk-count', '.sk-bell-count', 'sk-lightbox', '.sk-lb-', '.sk-gal-fav', '.sk-gal-edit')
SKIP_PROPS = ('box-shadow', 'text-shadow', 'filter')
COLOR_PROPS = ('color', 'background', 'border', 'fill', 'stroke', 'outline')
COLOR = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^)]*\)|\b(?:white|black)\b')

def parse(c):
    c = c.lower()
    if c in NAMED: c = NAMED[c]
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4): h = ''.join(ch * 2 for ch in h)
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return r, g, b, a
    nums = [float(x) for x in re.findall(r'[\d.]+', c)]
    return nums[0] / 255, nums[1] / 255, nums[2] / 255, (nums[3] if len(nums) > 3 else 1)

def flip(m):
    r, g, b, a = parse(m.group(0))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    l2 = 0.09 + (1 - l) * 0.82          # الأبيض ← رمادي غامق، والكحلي ← فاتح
    if l > 0.85: s *= 0.35               # الخلفيات الفاتحة تبقى رمادي هادي
    r, g, b = colorsys.hls_to_rgb(h, l2, min(s, 0.55))
    hx = '#%02x%02x%02x' % tuple(round(v * 255) for v in (r, g, b))
    return hx if a >= 0.999 else 'rgba(%d,%d,%d,%.3g)' % (round(r * 255), round(g * 255), round(b * 255), a)

def blocks(css):
    """بيرجع (prelude, body) لكل قاعدة في المستوى ده"""
    i, n, out = 0, len(css), []
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        depth, k = 1, j + 1
        while k < n and depth:
            depth += {'{': 1, '}': -1}.get(css[k], 0)
            k += 1
        out.append((css[i:j].strip(), css[j + 1:k - 1]))
        i = k
    return out

def convert(css, prefix='html[data-theme=dark]', recolor=True):
    out = []
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    for pre, body in blocks(css):
        if pre.startswith('@media'):
            if 'print' in pre: continue
            inner = convert(body, prefix, recolor)
            if inner: out.append(pre + '{' + inner + '}')
            continue
        if pre.startswith('@'): continue
        decls = []
        for d in body.split(';'):
            if ':' not in d: continue
            prop, val = d.split(':', 1)
            prop = prop.strip()
            if prop.startswith('--') or not prop.startswith(SKIP_PROPS):
                if COLOR.search(val): decls.append(prop + ':' + (COLOR.sub(flip, val) if recolor else val).strip())
                # ألوان جاية من متغيرات: بنكررها عشان ترتيب الأولوية يفضل زي الأصل
                elif 'var(--' in val and prop.startswith(COLOR_PROPS): decls.append(prop + ':' + val.strip())
        if not decls: continue
        sels = []
        for sel in pre.split(','):
            sel = sel.strip()
            if not sel or any(k in sel for k in SKIP_SEL): continue
            if sel in (':root', 'html'): sels.append(prefix)
            elif sel.startswith('html'): sels.append(prefix + sel[4:])
            else: sels.append(prefix + ' ' + sel)
        if sels: out.append(','.join(sels) + '{' + ';'.join(decls) + '}')
    return '\n'.join(out)

def dark_css(*sources):
    base = '\n'.join(convert(s) for s in sources)
    # ورقة التقرير بتفضل بيضا: بنرجّع ألوان المخطط الأصلية جواها
    paper = convert(sources[0], 'html[data-theme=dark] .sk-paper', recolor=False)
    # ألوان مكتوبة جوه رسم المخطط (fill / stroke) والصفحة نفسها
    extra = '''
html[data-theme=dark]{color-scheme:dark}
html[data-theme=dark] body{background:#141716}
html[data-theme=dark] #brand{filter:invert(1) brightness(1.5)}
html[data-theme=dark] #mapMount [fill="#e5e4dd"],html[data-theme=dark] #mapMount [fill="#e1e7dd"]{fill:#2a2f2c}
html[data-theme=dark] #mapMount [stroke="#b8bfb3"],html[data-theme=dark] #mapMount [stroke="#afb7ad"],html[data-theme=dark] #mapMount [stroke="#b3bdb1"]{stroke:#5b635e}
html[data-theme=dark] .sk-paper{box-shadow:0 2px 18px #0008}
html[data-theme=dark] .sk-btn-dark{background:#f2f2f2;border-color:#f2f2f2;color:#111}
html[data-theme=dark] .text-button{color:#d6d6d6!important;text-decoration-color:#555}
html[data-theme=dark] .primary{background:#f2f2f2!important;border-color:#f2f2f2!important;color:#111!important}
html[data-theme=dark] .primary:hover:not(:disabled){background:#d4d4d4!important;border-color:#d4d4d4!important}
html[data-theme=dark] .primary:disabled{background:#3a3a3a!important;border-color:#3a3a3a!important;color:#8a8a8a!important}
html[data-theme=dark] .secondary{background:transparent!important;border-color:#3d3d3d!important;color:#e6e6e6!important}
html[data-theme=dark] .secondary:disabled{color:#666!important;border-color:#2e2e2e!important}
html[data-theme=dark] .secondary:hover:not(:disabled){background:#262626!important;border-color:#777!important}
html[data-theme=dark] .sk-finish #viewRoom:disabled{color:#777!important;background:transparent!important;border-color:#3a3a3a!important}
html[data-theme=dark] .sk-btn-blue{background:#2f6fb3;border-color:#2f6fb3;color:#fff}
html[data-theme=dark] .sk-btn-green{background:#2f8a55;border-color:#2f8a55;color:#fff}
html[data-theme=dark] .sk-status.draft{background:#4a3d14;color:#f3d77a}
html[data-theme=dark] .sk-status.dirty{background:#4d3312;color:#f5c27a}
html[data-theme=dark] .sk-status.approved{background:#173d27;color:#8fd8a8}
html[data-theme=dark] .sk-seg-btn[aria-checked="true"],html[data-theme=dark] .sk-chip-btn[aria-checked="true"]{background:#f2f2f2;border-color:#f2f2f2;color:#111}
html[data-theme=dark] input,html[data-theme=dark] select,html[data-theme=dark] textarea{color-scheme:dark}
html[data-theme=dark] .type-option img,html[data-theme=dark] .summary-row img,html[data-theme=dark] #typePreview img{background:#fff;border-radius:6px}
'''
    # الثيم الليلي للشاشة بس، والطباعة تفضل فاتحة
    return '@media screen{\n' + base + '\n' + paper + extra + '}' 
