import base64, sys
app=open(sys.argv[1]).read(); out_path=sys.argv[2]
intro=open('/mnt/project-files/sakan-intro.html').read().replace('href="design.html"','href="#start"').replace('>ابدأ التصميم</a>','>دخول</a>')
bridge='''<script>
/* جوه البرنامج المدمج: زرار «دخول» بيبلّغ الصفحة الأم تقفل الانترو وتظهر شاشة الدخول */
document.querySelector(".cta a").addEventListener("click", function (e) {
  e.preventDefault();
  parent.postMessage({ type: "sakan-start" }, "*");
});
</script>
</body>'''
assert intro.count('</body>')==1
intro=intro.replace('</body>',bridge)
b64=base64.b64encode(intro.encode()).decode()
overlay='''
<!-- ===================== شاشة سكن جروب الترحيبية =====================
     الانترو محفوظ base64 ومعروض في iframe جوه dialog فوق البرنامج، عشان
     تنسيقه مايتلخبطش مع تنسيق البرنامج ويفضل فوق أي نافذة البرنامج بيفتحها.
     «دخول» بيقفل الانترو ويظهر البرنامج. -->
<style>
  #sakan-intro { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; max-width: none; max-height: none;
    margin: 0; padding: 0; border: 0; background: #fff; transition: opacity .5s ease; }
  #sakan-intro::backdrop { background: #fff; }
  #sakan-intro iframe { border: 0; width: 100%; height: 100%; display: block; }
</style>
<dialog id="sakan-intro"><iframe title="سكن جروب"></iframe></dialog>
<script>
(function () {
  var intro = document.getElementById("sakan-intro");
  var frame = intro.querySelector("iframe");
  var appTitle = document.title;
  var done = false;
  var bytes = Uint8Array.from(atob("__B64__"), function (c) { return c.charCodeAt(0); });
  frame.srcdoc = new TextDecoder().decode(bytes);
  document.title = "سكن جروب";

  // نفتح الانترو كـ modal، ولو البرنامج فتح نافذة بعده نرجّعه فوق
  function bringToFront() {
    if (done) return;
    if (intro.open) intro.close();
    intro.showModal();
  }
  bringToFront();
  window.addEventListener("load", function () { setTimeout(bringToFront, 0); });
  intro.addEventListener("cancel", function (e) { e.preventDefault(); });  // زرار Esc مايقفلوش

  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "sakan-start") return;
    done = true;
    document.title = appTitle;
    intro.style.opacity = "0";
    setTimeout(function () { intro.close(); intro.remove(); }, 500);
  });
})();
</script>
</body>'''.replace('__B64__',b64)
i=app.rindex('</body>')
open(out_path,'w').write(app[:i]+overlay+app[i+len('</body>'):])
