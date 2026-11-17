/* لوحة تحكم دار الأمانة
   - الدخول بكلمة مرور: توكن GitHub (ومفتاح عداد الزوار) متشفّرين في admin/auth.json
   - المقالات: ملفات JSON في content/blog/{ar,en}/، والحفظ بيعمل commit على GitHub والموقع بيتحدّث لوحده
   - الزوار: Umami (لو اتربط من الداش بورد) */
(function () {
  "use strict";
  var REPO = "Ahmedtalaat2/daralamana-site", BRANCH = "main";
  var AUTH_FILE = "static/admin/auth.json", CFG_FILE = "static/assets/js/config.js", IMG_DIR = "static/assets/img/blog";
  var API = window.GH_API || "https://api.github.com", UMAMI_API = window.UMAMI_API || "https://api.umami.is/v1";
  var KEY = "dar-admin", ITER = 600000;
  var SITE = new URL("../", location.href).href;            // جذر الموقع
  var LANGS = { ar: "عربي", en: "English" };
  var TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Qatar"; } catch (e) { return "Asia/Qatar"; } })();
  var app = document.getElementById("app");

  /* ---------- أدوات ---------- */
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    posts: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    ol: '<path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c0-1 2.5-1 2.5.3 0 1-2.5 2-2.5 3.2h2.7"/>',
    quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 12l3 3M14.5 4.5C17 2 21 3 21 3s1 4-1.5 6.5L13 16l-5-5z"/>',
    article: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'
  };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || "") + "</svg>"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var AR_M = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  function fmtDate(iso) { var p = String(iso || "").split("-"); if (p.length < 3) return iso || ""; return (+p[2]) + " " + AR_M[(+p[1]) - 1] + " " + p[0]; }
  function num(n) { n = +n || 0; return n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n); }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "من لحظات"; if (s < 3600) return "من " + Math.round(s / 60) + " دقيقة";
    if (s < 86400) return "من " + Math.round(s / 3600) + " ساعة"; return "من " + Math.round(s / 86400) + " يوم";
  }
  function siteUrl(p) { return p && p.charAt(0) === "/" ? SITE + p.slice(1) : p; }
  function postUrl(p) { return SITE + (p.lang === "en" ? "en/" : "") + "blog/" + p.d.slug + ".html"; }

  var toastT;
  function toast(msg, bad, ms) {
    var t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
    clearTimeout(toastT); if (ms !== 0) toastT = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }
  function modal(html, onMount) {
    var m = document.createElement("div"); m.className = "modal"; m.innerHTML = '<div class="g-card" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) close(); });
    function close() { m.remove(); }
    if (onMount) onMount(m.firstChild, close);
    var f = $("input, textarea", m); if (f) setTimeout(function () { f.focus(); }, 50);
    return close;
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      modal('<h1>' + esc(title) + '</h1><p class="muted">' + esc(text) + '</p><div class="row"><button class="btn ' + (danger ? "danger solid" : "pri") + '" data-ok>' + esc(okLabel) + '</button><button class="btn ghost" data-no>رجوع</button></div>',
        function (box, close) {
          $("[data-ok]", box).onclick = function () { close(); res(true); };
          $("[data-no]", box).onclick = function () { close(); res(false); };
        });
    });
  }

  /* ---------- base64 / تشفير ---------- */
  var enc = new TextEncoder(), dec = new TextDecoder();
  function bytesB64(u8) { var s = ""; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function b64Bytes(s) { return Uint8Array.from(atob(String(s).replace(/\s/g, "")), function (c) { return c.charCodeAt(0); }); }
  function textB64(t) { return bytesB64(enc.encode(t)); }
  function b64Text(s) { return dec.decode(b64Bytes(s)); }
  function blobB64(b) { return b.arrayBuffer().then(function (buf) { return bytesB64(new Uint8Array(buf)); }); }
  function keyFrom(pass, salt, iter) {
    return crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function seal(vault, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return keyFrom(pass, salt, ITER).then(function (k) { return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, enc.encode(JSON.stringify(vault))); })
      .then(function (ct) { return { v: 2, iter: ITER, salt: bytesB64(salt), iv: bytesB64(iv), data: bytesB64(new Uint8Array(ct)) }; });
  }
  function unseal(box, pass) {
    return keyFrom(pass, b64Bytes(box.salt), box.iter).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64Bytes(box.iv) }, k, b64Bytes(box.data)); })
      .then(function (pt) { var t = dec.decode(pt); if (t.charAt(0) === "{") { try { return JSON.parse(t); } catch (e) {} } return { token: t }; });
  }

  /* ---------- الجلسة ---------- */
  var S = { vault: null, posts: null, dirty: false };
  function loadSession() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && v.token) return v; } catch (e) {}
    try { var o = JSON.parse(localStorage.getItem("sveltia-cms.user") || "null"); if (o && o.token) return { token: o.token }; } catch (e) {}  // من لوحة التحكم القديمة
    return null;
  }
  function saveSession(v) { S.vault = v; try { localStorage.setItem(KEY, JSON.stringify(v)); localStorage.removeItem("sveltia-cms.user"); } catch (e) {} }
  function logout(msg) {
    try { localStorage.removeItem(KEY); localStorage.removeItem("sveltia-cms.user"); if (msg) sessionStorage.setItem("gate-msg", msg); } catch (e) {}
    S.dirty = false; location.hash = ""; location.reload();
  }

  /* ---------- GitHub ---------- */
  function gh(path, opt) {
    opt = opt || {};
    var h = { Authorization: "Bearer " + S.vault.token, Accept: "application/vnd.github+json" };
    if (opt.body) h["Content-Type"] = "application/json";
    return fetch(API + path, { method: opt.method || "GET", headers: h, body: opt.body, cache: "no-store" }).then(function (r) {
      if (r.status === 401) { logout("توكن GitHub انتهى أو اتلغى. دوس «تحديث توكن GitHub»."); throw new Error("401"); }
      return r;
    });
  }
  function contents(p) { return "/repos/" + REPO + "/contents/" + p.split("/").map(encodeURIComponent).join("/"); }
  function getFile(p) {
    return gh(contents(p) + "?ref=" + BRANCH).then(function (r) {
      if (r.status === 404) return null; if (!r.ok) throw new Error("gh " + r.status);
      return r.json().then(function (j) { return { sha: j.sha, text: b64Text(j.content || "") }; });
    });
  }
  function putFile(p, b64, msg, sha) {
    var body = { message: msg, branch: BRANCH, content: b64 }; if (sha) body.sha = sha;
    return gh(contents(p), { method: "PUT", body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { var e = new Error("gh " + r.status); e.status = r.status; e.detail = t; throw e; });
      return r.json().then(function (j) { return j.content.sha; });
    });
  }
  function delFile(p, sha, msg) {
    return gh(contents(p), { method: "DELETE", body: JSON.stringify({ message: msg, branch: BRANCH, sha: sha }) }).then(function (r) {
      if (!r.ok && r.status !== 404) throw new Error("gh " + r.status);
    });
  }
  function checkToken(token) {
    return fetch(API + "/repos/" + REPO, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }, cache: "no-store" }).then(function (r) {
      if (r.status === 401) return "توكن GitHub انتهى أو اتلغى. دوس «تحديث توكن GitHub».";
      if (!r.ok) return "التوكن مالوش صلاحية على مستودع الموقع.";
      return r.json().then(function (j) { return j.permissions && !j.permissions.push ? "التوكن صلاحيته قراءة بس، لازم Contents: Read and write." : ""; });
    }).catch(function () { return ""; });
  }
  function saveAuth(vault, pass, msg) {
    return Promise.all([seal(vault, pass), getFile(AUTH_FILE)]).then(function (a) {
      return putFile(AUTH_FILE, textB64(JSON.stringify(a[0], null, 2) + "\n"), msg, a[1] && a[1].sha);
    });
  }
  function fetchAuthBox() {
    return fetch("auth.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  /* ---------- المقالات ---------- */
  function loadPosts(force) {
    if (S.posts && !force) return Promise.resolve(S.posts);
    var all = [];
    return Promise.all(["ar", "en"].map(function (L) {
      return gh(contents("content/blog/" + L) + "?ref=" + BRANCH).then(function (r) {
        if (r.status === 404) return; if (!r.ok) throw new Error("gh " + r.status);
        return r.json().then(function (list) {
          return Promise.all(list.filter(function (f) { return /\.json$/.test(f.name); }).map(function (f) {
            return getFile(f.path).then(function (x) {
              if (!x) return; var d; try { d = JSON.parse(x.text); } catch (e) { return; }
              d.slug = d.slug || f.name.replace(/\.json$/, "");
              all.push({ lang: L, path: f.path, sha: x.sha, d: d });
            });
          }));
        });
      });
    })).then(function () { S.posts = sortPosts(all); return S.posts; });
  }
  function sortPosts(a) { return a.sort(function (x, y) { return String(y.d.date || "").localeCompare(String(x.d.date || "")) || String(x.d.title).localeCompare(String(y.d.title)); }); }
  function findPost(L, slug) { return (S.posts || []).filter(function (p) { return p.lang === L && p.d.slug === slug; })[0]; }

  /* ---------- حالة نشر الموقع ---------- */
  var deployTimer = null;
  function deployStatus() {
    return gh("/repos/" + REPO + "/actions/runs?per_page=1&branch=" + BRANCH).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.workflow_runs && j.workflow_runs[0]; }).catch(function () { return null; });
  }
  function renderDeploy(el, run) {
    if (!el) return;
    if (!run) { el.innerHTML = '<span class="dot"></span><span class="muted">مش قادر أعرف حالة التحديث دلوقتي.</span>'; return; }
    var busy = run.status !== "completed", bad = !busy && run.conclusion !== "success";
    el.innerHTML = '<span class="dot' + (busy ? " run" : bad ? " bad" : "") + '"></span><span>' +
      (busy ? "الموقع بيتحدّث دلوقتي... (حوالي دقيقة)" : bad ? "آخر تحديث للموقع ماكملش. جرّب تحفظ تاني أو كلّمني." : "الموقع محدّث، آخر تحديث " + ago(run.updated_at)) + "</span>";
    return busy;
  }
  function watchDeploy() {
    clearTimeout(deployTimer);
    var tries = 0;
    (function tick() {
      deployStatus().then(function (run) {
        var busy = renderDeploy($("#deploy"), run);
        if ((busy || tries < 2) && tries++ < 30) deployTimer = setTimeout(tick, 8000);
      });
    })();
  }

  /* ---------- الزوار (Umami) ---------- */
  function umamiId() { return (window.SITE_CONFIG && window.SITE_CONFIG.UMAMI_WEBSITE_ID) || ""; }
  function umamiOn() { return !!(umamiId() && S.vault && S.vault.umami); }
  function um(path, q) {
    var qs = Object.keys(q || {}).map(function (k) { return k + "=" + encodeURIComponent(q[k]); }).join("&");
    return fetch(UMAMI_API + "/websites/" + umamiId() + path + (qs ? "?" + qs : ""), { headers: { "x-umami-api-key": S.vault.umami, Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("umami " + r.status); return r.json(); });
  }
  function val(x) { return x && typeof x === "object" ? +x.value || 0 : +x || 0; }
  function dayStart(daysAgo) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - daysAgo); return d.getTime(); }
  function metric(type, start) {
    var q = { startAt: start, endAt: Date.now(), type: type, limit: 6 };
    return um("/metrics", q).catch(function (e) { if (type === "path") { q.type = "url"; return um("/metrics", q); } throw e; });
  }

  /* ---------- الهيكل ---------- */
  function shell(active, inner) {
    var tabs = [["", "home", "الرئيسية"], ["posts", "posts", "المقالات"]];
    function t(cls) { return tabs.map(function (x) { return '<a href="#/' + x[0] + '" class="' + (active === x[0] ? "on" : "") + '">' + ic(x[1]) + "<span>" + x[2] + "</span></a>"; }).join(""); }
    app.innerHTML =
      '<header class="top"><div class="top-in">' +
      '<a class="brand" href="#/"><img src="../assets/img/logo-icon.png" alt=""><span><b>لوحة التحكم</b><small>دار الأمانة</small></span></a>' +
      '<nav class="tabs">' + t() + '</nav><span class="sp"></span>' +
      '<a class="btn pri add" href="#/new" aria-label="إضافة مقال">' + ic("plus") + '<span class="add-txt">إضافة مقال</span></a>' +
      '<div class="menu"><button class="btn ghost icon" id="menu-btn" aria-label="القائمة" aria-haspopup="true">' + ic("menu") + '</button>' +
      '<div class="menu-pop" id="menu-pop" hidden>' +
      '<a href="' + SITE + '" target="_blank" rel="noopener">' + ic("globe") + 'افتح الموقع</a>' +
      '<button id="m-umami">' + ic("chart") + (umamiOn() ? "إعدادات عداد الزوار" : "اربط عداد الزوار") + '</button>' +
      '<button id="m-pass">' + ic("lock") + 'تغيير كلمة المرور</button>' +
      '<button id="m-out" class="red">' + ic("out") + 'خروج</button></div></div>' +
      '</div></header><main id="main">' + inner + '</main>' +
      '<nav class="btab">' + t() + '</nav>';
    var pop = $("#menu-pop");
    $("#menu-btn").onclick = function (e) { e.stopPropagation(); pop.hidden = !pop.hidden; };
    document.onclick = function () { pop.hidden = true; };
    $("#m-pass").onclick = changePassword;
    $("#m-umami").onclick = setupUmami;
    $("#m-out").onclick = function () { confirmBox("تسجيل الخروج؟", "هتحتاج كلمة المرور تاني علشان تدخل.", "خروج").then(function (ok) { if (ok) logout(); }); };
    document.body.classList.toggle("editing", active === "edit");
    window.scrollTo(0, 0);
  }
  function loadingHtml(t) { return '<div class="loading"><span class="spin"></span>' + (t || "جاري التحميل...") + "</div>"; }

  /* ---------- الرئيسية ---------- */
  function viewDash() {
    shell("", loadingHtml());
    loadPosts().then(function (posts) {
      var live = posts.filter(function (p) { return !p.d.draft; }), drafts = posts.length - live.length;
      var ar = live.filter(function (p) { return p.lang === "ar"; }).length, en = live.length - ar;
      var u = umamiOn();
      var stat = function (cls, icon, k, id, s) { return '<div class="card stat ' + cls + '"><div class="k">' + ic(icon) + k + '</div><div class="v" id="' + id + '">' + (u || id === "st-posts" ? "…" : "—") + '</div><div class="s" id="' + id + '-s">' + (s || "") + "</div></div>"; };
      var h = '<div class="h"><div><h1>أهلاً بيك 👋</h1><p>متابعة سريعة للموقع والمقالات.</p></div></div>' +
        '<div class="grid g4">' +
        stat("pur", "users", "زوار النهارده", "st-today", "") +
        stat("", "users", "زوار آخر ٧ أيام", "st-week", "") +
        stat("", "eye", "مشاهدات آخر ٣٠ يوم", "st-month", "") +
        '<div class="card stat"><div class="k">' + ic("article") + 'المقالات المنشورة</div><div class="v" id="st-posts">' + live.length + '</div><div class="s">عربي ' + ar + " · English " + en + (drafts ? " · مسودات " + drafts : "") + "</div></div>" +
        "</div>";
      if (!u) h += '<div class="card sec"><h2>' + ic("chart") + 'عداد الزوار مش مربوط لسه</h2><p class="muted" style="margin:0 0 12px">اربطه مرة واحدة، وبعدها هتشوف هنا عدد الزوار، وأكتر الصفحات زيارة، والزوار جايين منين، وموبايل ولا كمبيوتر.</p><button class="btn pri" id="go-umami">' + ic("chart") + 'اربط عداد الزوار</button></div>';
      else h += '<div class="grid g2 sec">' +
        '<div class="card"><h2>' + ic("chart") + 'الزيارات آخر ١٤ يوم</h2><div id="u-chart">' + loadingHtml("") + '</div></div>' +
        '<div class="card"><h2>' + ic("eye") + 'أكتر الصفحات زيارة <small class="muted">(٣٠ يوم)</small></h2><div id="u-pages">' + loadingHtml("") + '</div></div>' +
        '<div class="card"><h2>' + ic("link") + 'الزوار جايين منين <small class="muted">(٣٠ يوم)</small></h2><div id="u-refs">' + loadingHtml("") + '</div></div>' +
        '<div class="card"><h2>' + ic("phone") + 'الأجهزة <small class="muted">(٣٠ يوم)</small></h2><div id="u-dev">' + loadingHtml("") + '</div></div></div>';
      h += '<div class="grid g2 sec">' +
        '<div class="card"><h2>' + ic("posts") + 'آخر المقالات</h2>' + (posts.length ? '<ul class="rank">' + posts.slice(0, 5).map(function (p) {
          return '<li><span class="t" style="direction:' + (p.lang === "en" ? "ltr" : "rtl") + '">' + esc(p.d.title) + '</span>' + (p.d.draft ? '<span class="tag draft">مسودة</span>' : "") + '<a class="btn sm" href="#/edit/' + p.lang + "/" + encodeURIComponent(p.d.slug) + '">' + ic("edit") + "تعديل</a></li>";
        }).join("") + "</ul>" : '<p class="muted">مافيش مقالات لسه.</p>') +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><a class="btn pri sm" href="#/new">' + ic("plus") + 'إضافة مقال</a><a class="btn sm" href="#/posts">كل المقالات</a></div></div>' +
        '<div class="card"><h2>' + ic("rocket") + 'حالة الموقع</h2><div class="deploy" id="deploy"><span class="dot run"></span><span class="muted">بشوف...</span></div>' +
        '<p class="muted" style="font-size:13.5px;margin:12px 0 0">أي مقال تحفظه بيظهر على الموقع بعد دقيقة تقريباً.</p>' +
        '<a class="btn ghost sm" style="margin-top:12px" href="' + SITE + '" target="_blank" rel="noopener">' + ic("globe") + 'افتح الموقع</a></div></div>';
      $("#main").innerHTML = h;
      if ($("#go-umami")) $("#go-umami").onclick = setupUmami;
      watchDeploy();
      if (u) loadVisitors();
    }).catch(failView);
  }
  function loadVisitors() {
    var now = Date.now();
    function set(id, v, s) { var el = $("#" + id); if (el) el.textContent = v; if (s != null && $("#" + id + "-s")) $("#" + id + "-s").textContent = s; }
    var fail = function () { set("st-today", "—"); var c = $("#u-chart"); if (c) c.innerHTML = '<p class="note amber">مش قادر أجيب أرقام الزوار دلوقتي. اتأكد من إعدادات عداد الزوار من القائمة.</p>'; ["u-pages", "u-refs", "u-dev"].forEach(function (i) { if ($("#" + i)) $("#" + i).innerHTML = '<p class="muted">—</p>'; }); };
    um("/stats", { startAt: dayStart(0), endAt: now }).then(function (s) { set("st-today", num(val(s.visitors)), num(val(s.pageviews)) + " مشاهدة"); }).catch(fail);
    um("/stats", { startAt: dayStart(6), endAt: now }).then(function (s) { set("st-week", num(val(s.visitors)), num(val(s.pageviews)) + " مشاهدة"); }).catch(function () { set("st-week", "—"); });
    um("/stats", { startAt: dayStart(29), endAt: now }).then(function (s) { set("st-month", num(val(s.pageviews)), num(val(s.visitors)) + " زائر"); }).catch(function () { set("st-month", "—"); });
    um("/pageviews", { startAt: dayStart(13), endAt: now, unit: "day", timezone: TZ }).then(function (r) {
      var m = {}; (r.pageviews || []).forEach(function (p) { m[String(p.x).slice(0, 10)] = +p.y || 0; });
      var days = []; for (var i = 13; i >= 0; i--) { var d = new Date(dayStart(i)); var k = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); days.push([d, m[k] || 0]); }
      var max = Math.max.apply(null, days.map(function (x) { return x[1]; }).concat([1]));
      $("#u-chart").innerHTML = '<div class="chart">' + days.map(function (x) {
        return '<div class="b" title="' + x[1] + '"><em>' + (x[1] || "") + '</em><i style="height:' + Math.max(2, Math.round(x[1] / max * 100)) + '%"></i><span>' + x[0].getDate() + "/" + (x[0].getMonth() + 1) + "</span></div>";
      }).join("") + "</div>";
    }).catch(fail);
    var start30 = dayStart(29);
    function list(id, type, label) {
      metric(type, start30).then(function (rows) {
        var el = $("#" + id); if (!el) return;
        if (!rows || !rows.length) { el.innerHTML = '<p class="muted">لسه مافيش بيانات.</p>'; return; }
        el.innerHTML = '<ul class="rank">' + rows.slice(0, 6).map(function (r) { return '<li><span class="t">' + esc(label(r.x)) + '</span><span class="n">' + num(r.y) + "</span></li>"; }).join("") + "</ul>";
      }).catch(function () { var el = $("#" + id); if (el) el.innerHTML = '<p class="muted">—</p>'; });
    }
    list("u-pages", "path", function (x) { return pageName(x); });
    list("u-refs", "referrer", function (x) { return refName(x); });
    list("u-dev", "device", function (x) { return { mobile: "موبايل", desktop: "كمبيوتر", laptop: "لابتوب", tablet: "تابلت" }[x] || x || "غير معروف"; });
  }
  function pageName(x) {
    var p = String(x || "/").replace(/^\/daralamana-site/, "").replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
    var map = { "/": "الرئيسية", "/en/": "الرئيسية (English)", "/blog": "المدونة", "/services": "الخدمات", "/request": "اطلب ممرضة", "/contact": "تواصل معنا", "/faq": "أسئلة شائعة", "/about": "من نحن", "/careers": "الوظائف" };
    if (map[p]) return map[p];
    var m = p.match(/^\/(en\/)?blog\/(.+)$/);
    if (m) { var post = findPost(m[1] ? "en" : "ar", m[2]); return "مقال: " + (post ? post.d.title : m[2]); }
    return p;
  }
  function refName(x) {
    if (!x) return "دخول مباشر";
    var h = String(x).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    var map = { "google": "جوجل", "instagram": "انستجرام", "l.instagram": "انستجرام", "facebook": "فيسبوك", "l.facebook": "فيسبوك", "m.facebook": "فيسبوك", "t.co": "X (تويتر)", "x": "X (تويتر)", "wa.me": "واتساب", "whatsapp": "واتساب", "tiktok": "تيك توك", "snapchat": "سناب شات", "bing": "Bing", "linkedin": "لينكدإن", "youtube": "يوتيوب" };
    var base = h.replace(/\.(com|net|org|co|qa|ae|sa)(\.[a-z]+)?$/, "");
    return map[base] || map[base.split(".").pop()] || h;
  }

  /* ---------- كل المقالات ---------- */
  var listState = { q: "", f: "all" };
  function viewPosts() {
    shell("posts", loadingHtml());
    loadPosts().then(function () {
      $("#main").innerHTML = '<div class="h"><div><h1>كل المقالات</h1><p id="p-count"></p></div><a class="btn pri" href="#/new">' + ic("plus") + 'إضافة مقال</a></div>' +
        '<div class="tools"><input class="inp" id="p-q" type="search" placeholder="ابحث في العناوين..." value="' + esc(listState.q) + '">' +
        '<div class="chips" id="p-f">' + [["all", "الكل"], ["ar", "عربي"], ["en", "English"], ["draft", "مسودات"]].map(function (c) { return '<button class="chip' + (listState.f === c[0] ? " on" : "") + '" data-f="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div></div>" +
        '<div class="plist" id="p-list"></div>';
      $("#p-q").oninput = function () { listState.q = this.value; drawList(); };
      $$("#p-f .chip").forEach(function (b) { b.onclick = function () { listState.f = b.dataset.f; $$("#p-f .chip").forEach(function (x) { x.classList.toggle("on", x === b); }); drawList(); }; });
      drawList();
    }).catch(failView);
  }
  function drawList() {
    var q = listState.q.trim().toLowerCase(), f = listState.f;
    var rows = S.posts.filter(function (p) {
      if (f === "ar" || f === "en") { if (p.lang !== f) return false; } else if (f === "draft" && !p.d.draft) return false;
      return !q || (String(p.d.title) + " " + String(p.d.description || "")).toLowerCase().indexOf(q) >= 0;
    });
    $("#p-count").textContent = S.posts.length + " مقال" + (rows.length !== S.posts.length ? " · ظاهر " + rows.length : "");
    var el = $("#p-list");
    if (!rows.length) { el.innerHTML = '<div class="card empty">' + (S.posts.length ? "مافيش مقالات بالبحث ده." : "مافيش مقالات لسه. دوس «إضافة مقال» واكتب أول مقال.") + "</div>"; return; }
    el.innerHTML = rows.map(function (p, i) {
      var img = siteUrl(p.d.image || "/assets/img/vitals.webp");
      return '<div class="card prow"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="m"><b dir="' + (p.lang === "en" ? "ltr" : "rtl") + '">' + esc(p.d.title || "(بدون عنوان)") + '</b><small><span class="tag">' + LANGS[p.lang] + '</span>' +
        (p.d.draft ? '<span class="tag draft">مسودة</span>' : '<span class="tag live">منشور</span>') + "<span>" + esc(fmtDate(p.d.date)) + "</span></small></div>" +
        '<div class="a"><a class="btn sm" href="#/edit/' + p.lang + "/" + encodeURIComponent(p.d.slug) + '">' + ic("edit") + "تعديل</a>" +
        (p.d.draft ? "" : '<a class="btn sm ghost" href="' + esc(postUrl(p)) + '" target="_blank" rel="noopener">' + ic("eye") + "عرض</a>") +
        '<button class="btn sm danger" data-del="' + S.posts.indexOf(p) + '">' + ic("trash") + "حذف</button></div></div>";
    }).join("");
    $$("[data-del]", el).forEach(function (b) { b.onclick = function () { deletePost(S.posts[+b.dataset.del]); }; });
  }
  function deletePost(p) {
    confirmBox("حذف المقال؟", "«" + p.d.title + "» هيتشال من الموقع نهائياً. الخطوة دي مش بترجع.", "احذف", true).then(function (ok) {
      if (!ok) return;
      toast("جاري الحذف...", false, 0);
      delFile(p.path, p.sha, "حذف مقال: " + p.d.slug).then(function () {
        S.posts = S.posts.filter(function (x) { return x !== p; });
        toast("اتحذف ✓ وهيختفي من الموقع خلال دقيقة");
        if (location.hash.indexOf("#/edit") === 0) { S.dirty = false; location.hash = "#/posts"; } else drawList();
      }).catch(function () { toast("الحذف ماتمش، جرّب تاني.", true); });
    });
  }

  /* ---------- المحرر: Markdown ⇄ HTML ---------- */
  function mdInline(t) {
    t = esc(t);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, a, s) { return '<img src="' + siteUrl(s) + '" data-src="' + s + '" alt="' + a + '">'; });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?![\w*])/g, function (m, pre, x) { return /\s$/.test(x) ? m : pre + "<em>" + x + "</em>"; });
    return t;
  }
  function mdToHtml(text) {
    var out = [], para = [], lst = null;
    function flush() {
      if (para.length) { out.push("<p>" + para.map(mdInline).join("<br>") + "</p>"); para = []; }
      if (lst) { out.push("<" + lst[0] + ">" + lst[1].map(function (x) { return "<li>" + mdInline(x) + "</li>"; }).join("") + "</" + lst[0] + ">"); lst = null; }
    }
    String(text || "").replace(/\r/g, "").split("\n").forEach(function (raw) {
      var line = raw.trim(), m;
      if (!line) return flush();
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flush(); var h = Math.max(2, Math.min(3, m[1].length)); out.push("<h" + h + ">" + mdInline(m[2]) + "</h" + h + ">"); return; }
      if (line.indexOf("> ") === 0) { flush(); out.push("<blockquote>" + mdInline(line.slice(2)) + "</blockquote>"); return; }
      var mu = line.match(/^[-*]\s+(.*)/), mo = line.match(/^\d+[.)]\s+(.*)/);
      if (mu || mo) {
        var kind = mu ? "ul" : "ol"; if (para.length) flush(); if (lst && lst[0] !== kind) flush();
        lst = lst || [kind, []]; lst[1].push((mu || mo)[1]); return;
      }
      if (lst) flush();
      para.push(line);
    });
    flush();
    return out.join("");
  }
  var BLOCK = /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|FIGURE|PRE|TABLE)$/;
  function imgMd(n) {
    var s = n.getAttribute("data-src") || n.getAttribute("src") || "";
    if (s.indexOf(SITE) === 0) s = "/" + s.slice(SITE.length);
    if (!s || /^(blob|data):/.test(s)) return "";
    return "![" + (n.getAttribute("alt") || "").replace(/[\[\]\n]/g, " ") + "](" + s.replace(/\s/g, "%20") + ")";
  }
  function wrapMd(c, m) { var t = c.trim(); if (!t) return c; return c.match(/^\s*/)[0] + m + t + m + c.match(/\s*$/)[0]; }
  function inl(node) {
    var s = "";
    Array.prototype.forEach.call(node.childNodes, function (n) {
      if (n.nodeType === 3) { s += n.nodeValue.replace(/ /g, " ").replace(/[ \t\r\n]+/g, " "); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName, st = n.getAttribute("style") || "";
      if (t === "BR") { s += "\n"; return; }
      if (t === "IMG") { var im = imgMd(n); if (im) s += "\n" + im + "\n"; return; }
      var c = inl(n);
      if (t === "B" || t === "STRONG" || /font-weight:\s*(bold|[6-9]00)/.test(st)) s += wrapMd(c, "**");
      else if (t === "I" || t === "EM" || /font-style:\s*italic/.test(st)) s += wrapMd(c, "*");
      else if (t === "A") { var h = (n.getAttribute("href") || "").trim(); s += h && c.trim() ? "[" + c.trim().replace(/[\[\]]/g, "") + "](" + h.replace(/\s/g, "%20") + ")" : c; }
      else if (BLOCK.test(t)) s += "\n" + c + "\n";
      else s += c;
    });
    return s;
  }
  function cleanLines(s) { return s.split("\n").map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean); }
  function htmlToMd(root) {
    var out = [], run = [];
    function flushRun() {
      if (!run.length) return; var box = document.createElement("div"); run.forEach(function (n) { box.appendChild(n.cloneNode(true)); }); run = [];
      var l = cleanLines(inl(box)); if (l.length) out.push(l.join("\n"));
    }
    (function walk(el) {
      Array.prototype.forEach.call(el.childNodes, function (n) {
        var t = n.nodeType === 1 ? n.tagName : "";
        if (/^H[1-6]$/.test(t)) { flushRun(); var x = cleanLines(inl(n)).join(" "); if (x) out.push((/^H[1-2]$/.test(t) ? "## " : "### ") + x); }
        else if (t === "UL" || t === "OL") {
          flushRun(); var i = 0, lines = [];
          Array.prototype.forEach.call(n.children, function (li) { var x = cleanLines(inl(li)).join(" "); if (x) lines.push((t === "OL" ? (++i) + ". " : "- ") + x); });
          if (lines.length) out.push(lines.join("\n"));
        }
        else if (t === "BLOCKQUOTE") {
          flushRun(); var q = [];
          cleanLines(inl(n)).forEach(function (l) { if (/^!\[/.test(l)) { if (q.length) out.push(q.join("\n")); q = []; out.push(l); } else q.push("> " + l); });
          if (q.length) out.push(q.join("\n"));
        }
        else if (t === "IMG") { flushRun(); var im = imgMd(n); if (im) out.push(im); }
        else if (t && BLOCK.test(t)) {
          flushRun();
          if ($$("h1,h2,h3,h4,h5,h6,ul,ol,blockquote,p,div", n).length) walk(n);
          else { var l = cleanLines(inl(n)); if (l.length) out.push(l.join("\n")); }
        }
        else run.push(n);
      });
    })(root);
    flushRun();
    // سطر عادي بيبدأ برموز ماركداون يتقري غلط، فنفصله
    return out.map(function (b) { return b.split("\n").map(function (l) { return l; }).join("\n"); }).join("\n\n").trim();
  }

  /* ---------- الصور ---------- */
  function shrink(file, maxW) {
    if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return Promise.resolve(file);
    return new Promise(function (res) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, maxW / w);
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b && b.size < file.size * 1.1 ? b : file); }, "image/jpeg", 0.84);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  function pickImage(cb) {
    var i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
    i.onchange = function () { if (i.files && i.files[0]) cb(i.files[0]); };
    i.click();
  }
  function uploadImage(blob, slug) {
    var ext = /png/.test(blob.type) ? "png" : /gif/.test(blob.type) ? "gif" : /webp/.test(blob.type) ? "webp" : "jpg";
    var name = (slug || "img") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + "." + ext;
    return blobB64(blob).then(function (b64) { return putFile(IMG_DIR + "/" + name, b64, "رفع صورة: " + name); })
      .then(function () { return "/assets/img/blog/" + name; });
  }

  /* ---------- الرابط من العنوان ---------- */
  var TR = { "ا": "a", "أ": "a", "إ": "e", "آ": "a", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d", "ذ": "th", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
    "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ة": "a", "و": "w", "ي": "y", "ى": "a",
    "ئ": "e", "ؤ": "o", "ء": "", "ـ": "" };
  function slugify(t) {
    var s = String(t || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[ً-ْ]/g, "");
    s = s.split("").map(function (c) { return TR[c] != null ? TR[c] : c; }).join("").toLowerCase();
    s = s.normalize ? s.normalize("NFKD").replace(/[̀-ͯ]/g, "") : s;
    s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (s.length > 60) s = s.slice(0, 60).replace(/-[^-]*$/, "");
    return s;
  }

  /* ---------- المحرر ---------- */
  var E = null;
  function viewEditor(L, slug) {
    shell("edit", loadingHtml());
    loadPosts().then(function () {
      var orig = slug ? findPost(L, slug) : null;
      if (slug && !orig) { $("#main").innerHTML = '<div class="card empty">المقال ده مش موجود. يمكن اتحذف.<br><br><a class="btn" href="#/posts">كل المقالات</a></div>'; return; }
      var d = orig ? orig.d : { title: "", description: "", date: today(), image: "", image_alt: "", body: "", draft: false };
      E = { orig: orig, lang: orig ? orig.lang : (listState.f === "en" ? "en" : "ar"), cover: d.image || "", coverBlob: null, slugTouched: !!orig, pending: {} };
      var title = orig ? "تعديل مقال" : "مقال جديد";
      $("#main").innerHTML =
        '<div class="h"><div><h1>' + title + '</h1><p>' + (orig ? (orig.d.draft ? "المقال ده مسودة ومش ظاهر على الموقع." : "المقال ده منشور على الموقع.") : "اكتب المقال واختار صورة، وبعدين دوس نشر.") + '</p></div>' +
        '<a class="btn ghost sm" href="#/posts">رجوع للمقالات</a></div>' +
        '<div class="ed"><div>' +
        '<div class="card">' +
        '<label class="fld"><span>العنوان</span><input class="inp title-inp" id="e-title" maxlength="140" placeholder="مثال: كيف تجهز البيت لاستقبال المريض بعد المستشفى؟" value="' + esc(d.title) + '"></label>' +
        '<label class="fld"><span>وصف قصير <em class="count" id="e-dcount"></em></span><textarea class="inp" id="e-desc" rows="2" placeholder="سطر أو اتنين بيظهروا تحت العنوان وفي نتايج جوجل.">' + esc(d.description || "") + '</textarea><small>يفضّل من ١٢٠ لـ ١٦٠ حرف.</small></label>' +
        '<div class="fld" style="margin:0"><span>المقال</span>' +
        '<div class="tb" id="e-tb" role="toolbar" aria-label="أدوات التنسيق">' +
        '<button type="button" data-cmd="h2" title="عنوان كبير">عنوان</button><button type="button" data-cmd="h3" title="عنوان فرعي">فرعي</button><button type="button" data-cmd="p" title="نص عادي">نص</button><span class="sep"></span>' +
        '<button type="button" data-cmd="bold" title="عريض"><b>B</b></button><button type="button" data-cmd="italic" title="مائل"><i>I</i></button><span class="sep"></span>' +
        '<button type="button" data-cmd="ul" title="قائمة نقط">' + ic("ul") + '</button><button type="button" data-cmd="ol" title="قائمة أرقام">' + ic("ol") + '</button><button type="button" data-cmd="quote" title="اقتباس / ملحوظة">' + ic("quote") + '</button><span class="sep"></span>' +
        '<button type="button" data-cmd="link" title="رابط">' + ic("link") + '</button><button type="button" data-cmd="image" title="صورة جوه المقال">' + ic("image") + "</button></div>" +
        '<div class="rte" id="e-body" contenteditable="true" data-ph="ابدأ اكتب المقال هنا... استخدم زرار «عنوان» للعناوين." spellcheck="true"></div></div>' +
        "</div></div>" +
        '<aside class="ed-side">' +
        '<div class="card ed-actions side"><button class="btn pri" data-save="pub">' + ic("rocket") + (orig && !orig.d.draft ? "حفظ التعديلات" : "نشر المقال") + '</button><button class="btn" data-save="draft">حفظ كمسودة</button>' +
        (orig ? '<button class="btn danger sm" id="e-del">' + ic("trash") + "حذف المقال</button>" : "") + "</div>" +
        '<div class="card"><h2>' + ic("image") + 'صورة المقال</h2><div class="cover" id="e-cover" role="button" tabindex="0"></div>' +
        '<div class="cover-act"><button class="btn sm" id="e-cover-pick">اختار صورة</button><button class="btn sm ghost" id="e-cover-rm">شيل الصورة</button></div>' +
        '<label class="fld" style="margin:12px 0 0"><span>وصف الصورة (لجوجل)</span><input class="inp" id="e-alt" placeholder="مثال: ممرضة تقيس ضغط مريض في البيت" value="' + esc(d.image_alt || "") + '"></label></div>' +
        '<div class="card"><h2>' + ic("globe") + 'اللغة والتاريخ</h2>' +
        (orig ? '<p style="margin:0 0 12px">اللغة: <span class="tag">' + LANGS[E.lang] + "</span></p>" : '<div class="seg" id="e-lang" style="margin-bottom:14px"><button type="button" data-l="ar">عربي</button><button type="button" data-l="en">English</button></div>') +
        '<label class="fld"><span>تاريخ النشر</span><input class="inp" type="date" id="e-date" value="' + esc(String(d.date || today()).slice(0, 10)) + '"></label>' +
        '<label class="switch"><span>مسودة (مش ظاهر على الموقع)</span><input type="checkbox" id="e-draft"' + (d.draft ? " checked" : "") + "></label>" +
        '<details class="adv" style="margin-top:14px"><summary>رابط المقال</summary><label class="fld" style="margin:10px 0 0"><input class="inp ltr" id="e-slug" dir="ltr" placeholder="how-to-prepare-home" value="' + esc(d.slug || "") + '">' +
        '<small>حروف إنجليزي صغيرة وأرقام وشرطات بس. بيتعمل لوحده من العنوان. استخدم نفس الرابط للمقال العربي ونسخته الإنجليزي.</small><small dir="ltr" id="e-url" style="word-break:break-all"></small></label></details>' +
        "</div></aside></div>" +
        '<div class="ed-bar"><button class="btn" data-save="draft">مسودة</button><button class="btn pri" data-save="pub">' + ic("rocket") + (orig && !orig.d.draft ? "حفظ" : "نشر") + "</button></div>";

      var body = $("#e-body");
      body.innerHTML = mdToHtml(d.body);
      try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
      setLang(E.lang);
      drawCover();
      var dirty = function () { S.dirty = true; };
      ["#e-title", "#e-desc", "#e-alt", "#e-date", "#e-draft"].forEach(function (s) { $(s).addEventListener("input", dirty); $(s).addEventListener("change", dirty); });
      body.addEventListener("input", dirty);
      $("#e-title").addEventListener("input", function () { if (!E.slugTouched) $("#e-slug").value = slugify(this.value); showUrl(); });
      $("#e-slug").addEventListener("input", function () { E.slugTouched = true; S.dirty = true; showUrl(); });
      $("#e-desc").addEventListener("input", countDesc); countDesc(); showUrl();
      if ($("#e-lang")) $$("#e-lang button").forEach(function (b) { b.onclick = function () { setLang(b.dataset.l); S.dirty = true; showUrl(); }; });
      $("#e-cover").onclick = $("#e-cover-pick").onclick = function () { pickImage(function (f) { shrink(f, 1600).then(function (b) { E.coverBlob = b; E.cover = URL.createObjectURL(b); S.dirty = true; drawCover(); }); }); };
      $("#e-cover").onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.click(); } };
      $("#e-cover-rm").onclick = function () { E.cover = ""; E.coverBlob = null; S.dirty = true; drawCover(); };
      $$("[data-save]").forEach(function (b) { b.onclick = function () { save(b.dataset.save === "draft"); }; });
      if ($("#e-del")) $("#e-del").onclick = function () { deletePost(orig); };
      setupToolbar(body);
      S.dirty = false;
    }).catch(failView);
  }
  function setLang(L) {
    E.lang = L; var b = $("#e-body"); b.dir = L === "en" ? "ltr" : "rtl"; $("#e-title").dir = $("#e-desc").dir = b.dir;
    if ($("#e-lang")) $$("#e-lang button").forEach(function (x) { x.classList.toggle("on", x.dataset.l === L); });
  }
  function countDesc() { var n = $("#e-desc").value.trim().length, c = $("#e-dcount"); c.textContent = n + " حرف"; c.className = "count" + (n > 170 ? " over" : ""); }
  function showUrl() { var s = $("#e-slug").value.trim() || slugify($("#e-title").value); $("#e-url").textContent = s ? SITE + (E.lang === "en" ? "en/" : "") + "blog/" + s + ".html" : ""; }
  function drawCover() {
    var c = $("#e-cover");
    c.innerHTML = E.cover ? '<img src="' + esc(E.cover.indexOf("blob:") === 0 ? E.cover : siteUrl(E.cover)) + '" alt="">' : ic("image") + "<b>دوس واختار صورة</b><small>من الموبايل أو الكمبيوتر. الصورة بتتصغّر لوحدها.</small>";
    $("#e-cover-rm").hidden = !E.cover;
  }
  function setupToolbar(body) {
    var saved = null;
    function keep() { var s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); }
    function restore() { body.focus(); if (saved) { var s = getSelection(); s.removeAllRanges(); s.addRange(saved); } }
    document.addEventListener("selectionchange", function () { if (document.activeElement === body) { keep(); mark(); } });
    function block() { var n = getSelection().anchorNode; while (n && n !== body) { if (n.nodeType === 1 && /^(H2|H3|BLOCKQUOTE|P|LI)$/.test(n.tagName)) return n.tagName; n = n.parentNode; } return ""; }
    function mark() {
      var b = block();
      $$("#e-tb [data-cmd]").forEach(function (x) {
        var c = x.dataset.cmd, on = false;
        try { on = c === "h2" ? b === "H2" : c === "h3" ? b === "H3" : c === "quote" ? b === "BLOCKQUOTE" : c === "bold" ? document.queryCommandState("bold") : c === "italic" ? document.queryCommandState("italic") : c === "ul" ? document.queryCommandState("insertUnorderedList") : c === "ol" ? document.queryCommandState("insertOrderedList") : false; } catch (e) {}
        x.classList.toggle("on", on);
      });
    }
    $$("#e-tb [data-cmd]").forEach(function (btn) {
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); });  // ما نضيعش التحديد
      btn.onclick = function () {
        var c = btn.dataset.cmd; restore();
        if (c === "h2" || c === "h3") document.execCommand("formatBlock", false, block() === c.toUpperCase() ? "p" : c);
        else if (c === "p") document.execCommand("formatBlock", false, "p");
        else if (c === "quote") document.execCommand("formatBlock", false, block() === "BLOCKQUOTE" ? "p" : "blockquote");
        else if (c === "bold" || c === "italic") document.execCommand(c);
        else if (c === "ul") document.execCommand("insertUnorderedList");
        else if (c === "ol") document.execCommand("insertOrderedList");
        else if (c === "link") return addLink(restore);
        else if (c === "image") return addImage(restore);
        S.dirty = true; keep(); mark();
      };
    });
    body.addEventListener("paste", function (e) {
      var t = (e.clipboardData || window.clipboardData).getData("text/plain"); if (t == null) return;
      e.preventDefault();
      var parts = t.replace(/\r/g, "").split(/\n\s*\n/).map(function (p) { return esc(p.trim()).replace(/\n/g, "<br>"); }).filter(Boolean);
      document.execCommand("insertHTML", false, parts.length > 1 ? parts.map(function (p) { return "<p>" + p + "</p>"; }).join("") : (parts[0] || ""));
      S.dirty = true;
    });
    body.addEventListener("keydown", function (e) {
      // Enter جوه اقتباس أو عنوان يرجّع لنص عادي
      if (e.key === "Enter" && !e.shiftKey && /^(BLOCKQUOTE|H2|H3)$/.test(block())) {
        e.preventDefault(); document.execCommand("insertParagraph"); document.execCommand("formatBlock", false, "p"); S.dirty = true; return;
      }
      if ((e.ctrlKey || e.metaKey) && /^[bi]$/i.test(e.key)) { e.preventDefault(); document.execCommand(e.key.toLowerCase() === "b" ? "bold" : "italic"); S.dirty = true; }
    });
  }
  function addLink(restore) {
    var sel = getSelection(), txt = sel.toString();
    modal('<h1>إضافة رابط</h1><label class="fld"><span>الرابط</span><input class="inp ltr" id="l-url" dir="ltr" placeholder="https://..." inputmode="url"></label>' +
      (txt ? "" : '<label class="fld"><span>النص اللي هيظهر</span><input class="inp" id="l-txt" placeholder="مثال: اطلب ممرضة"></label>') +
      '<div class="err" id="l-err"></div><div class="row"><button class="btn pri" id="l-ok">إضافة</button><button class="btn ghost" id="l-no">إلغاء</button></div>',
      function (box, close) {
        $("#l-no", box).onclick = close;
        $("#l-ok", box).onclick = function () {
          var u = $("#l-url", box).value.trim(); if (!u) { $("#l-err", box).textContent = "اكتب الرابط."; return; }
          if (!/^(https?:|mailto:|tel:|\/|#)/.test(u)) u = /^[\w.-]+\.[a-z]{2,}/i.test(u) ? "https://" + u : u;
          var t2 = $("#l-txt", box) ? $("#l-txt", box).value.trim() || u : null;
          close(); restore();
          if (t2) document.execCommand("insertHTML", false, '<a href="' + esc(u) + '">' + esc(t2) + "</a>&nbsp;");
          else document.execCommand("createLink", false, u);
          S.dirty = true;
        };
        $("#l-url", box).onkeydown = function (e) { if (e.key === "Enter") $("#l-ok", box).click(); };
      });
  }
  function addImage(restore) {
    pickImage(function (f) {
      shrink(f, 1400).then(function (b) {
        var id = "p" + Date.now().toString(36); E.pending[id] = b;
        restore();
        document.execCommand("insertHTML", false, '<img src="' + URL.createObjectURL(b) + '" data-pid="' + id + '" class="pending" alt="' + esc($("#e-title").value.trim()) + '"><p><br></p>');
        S.dirty = true;
      });
    });
  }
  function save(asDraft) {
    var title = $("#e-title").value.trim(), desc = $("#e-desc").value.replace(/\s+/g, " ").trim(), body = $("#e-body");
    var slug = slugify($("#e-slug").value.trim()) || slugify(title);
    if (!title) { toast("اكتب عنوان للمقال الأول.", true); $("#e-title").focus(); return; }
    if (!asDraft && !body.textContent.trim() && !$("img", body)) { toast("المقال فاضي. اكتب المقال أو احفظه كمسودة.", true); body.focus(); return; }
    if (!asDraft && !desc) { toast("اكتب وصف قصير للمقال (بيظهر في جوجل).", true); $("#e-desc").focus(); return; }
    var L = E.lang, orig = E.orig;
    if (!slug) slug = "post-" + Date.now().toString(36);
    var taken = function (s) { return (S.posts || []).some(function (p) { return p.lang === L && p.d.slug === s && p !== orig; }); };
    if (taken(slug)) { var n = 2; while (taken(slug + "-" + n)) n++; slug = slug + "-" + n; }
    $("#e-slug").value = slug;
    var btns = $$("[data-save]"); btns.forEach(function (b) { b.disabled = true; });
    toast("جاري الحفظ...", false, 0);
    var image = E.cover && E.cover.indexOf("blob:") !== 0 ? E.cover : "";
    var steps = Promise.resolve();
    if (E.coverBlob) steps = steps.then(function () { toast("جاري رفع صورة المقال...", false, 0); return uploadImage(E.coverBlob, slug).then(function (p) { image = p; E.cover = p; E.coverBlob = null; }); });
    $$("img[data-pid]", body).forEach(function (img) {
      steps = steps.then(function () {
        var blob = E.pending[img.dataset.pid]; if (!blob) { img.remove(); return; }
        toast("جاري رفع الصور...", false, 0);
        return uploadImage(blob, slug).then(function (p) { img.setAttribute("data-src", p); img.removeAttribute("data-pid"); img.classList.remove("pending"); delete E.pending[img.dataset.pid]; });
      });
    });
    steps.then(function () {
      var d = {};
      if (orig) Object.keys(orig.d).forEach(function (k) { d[k] = orig.d[k]; });
      d.title = title; d.slug = slug; d.date = $("#e-date").value || today(); d.description = desc;
      d.image = image; d.image_alt = $("#e-alt").value.trim(); d.body = htmlToMd(body); d.draft = !!asDraft;
      if (orig && !orig.d.draft && !asDraft) d.updated = today(); else delete d.updated;
      if (!d.image) delete d.image; if (!d.image_alt) delete d.image_alt;
      var path = "content/blog/" + L + "/" + slug + ".json", json = JSON.stringify(d, null, 2) + "\n";
      var same = orig && orig.path === path;
      var msg = (orig ? "تعديل مقال: " : "مقال جديد: ") + slug;
      return putFile(path, textB64(json), msg, same ? orig.sha : undefined).then(function (sha) {
        var rec = { lang: L, path: path, sha: sha, d: d };
        var after = orig && !same ? delFile(orig.path, orig.sha, "نقل مقال: " + orig.d.slug + " ← " + slug) : Promise.resolve();
        return after.then(function () {
          S.posts = sortPosts((S.posts || []).filter(function (p) { return p !== orig; }).concat([rec]));
          S.dirty = false;
          toast(asDraft ? "اتحفظ كمسودة ✓ (مش ظاهر على الموقع)" : "اتحفظ ✓ وهيظهر على الموقع خلال دقيقة تقريباً", false, 4500);
          location.hash = "#/posts";
        });
      });
    }).catch(function (e) {
      btns.forEach(function (b) { b.disabled = false; });
      toast(e && e.status === 422 ? "فيه مقال تاني بنفس الرابط. غيّر رابط المقال وجرّب تاني." : e && e.status === 409 ? "المقال اتعدّل من مكان تاني. افتحه من جديد وجرّب." : "الحفظ ماتمش. اتأكد من النت وجرّب تاني.", true, 6000);
    });
  }

  /* ---------- كلمة المرور + عداد الزوار ---------- */
  function changePassword() {
    $("#menu-pop") && ($("#menu-pop").hidden = true);
    modal('<h1>تغيير كلمة المرور</h1><p class="muted">كلمة المرور الجديدة بتشتغل خلال دقيقة أو اتنين.</p>' +
      '<label class="fld"><span>كلمة المرور الجديدة (١٠ حروف على الأقل)</span><input class="inp ltr" type="password" id="c-1" autocomplete="new-password"></label>' +
      '<label class="fld"><span>تأكيد كلمة المرور</span><input class="inp ltr" type="password" id="c-2" autocomplete="new-password"></label>' +
      '<div class="err" id="c-err"></div><div class="row"><button class="btn pri" id="c-ok">حفظ</button><button class="btn ghost" id="c-no">إلغاء</button></div>',
      function (box, close) {
        $("#c-no", box).onclick = close;
        $("#c-ok", box).onclick = function () {
          var a = $("#c-1", box).value, b = $("#c-2", box).value, err = $("#c-err", box), btn = this;
          if (a.length < 10) { err.textContent = "كلمة المرور لازم ١٠ حروف على الأقل."; return; }
          if (a !== b) { err.textContent = "كلمتين المرور مش زي بعض."; return; }
          btn.disabled = true; err.className = "err"; err.textContent = "جاري الحفظ...";
          saveAuth(S.vault, a, "تغيير كلمة مرور لوحة التحكم").then(function () { close(); toast("اتغيّرت كلمة المرور ✓"); })
            .catch(function () { btn.disabled = false; err.textContent = "حصل خطأ، جرّب تاني."; });
        };
      });
  }
  function setupUmami() {
    $("#menu-pop") && ($("#menu-pop").hidden = true);
    modal('<h1>ربط عداد الزوار</h1><p class="muted">بنستخدم Umami (مجاني). الخطوات دي مرة واحدة بس:</p>' +
      '<ol style="margin:0 0 16px;padding-inline-start:20px;font-size:14px;line-height:1.9">' +
      '<li>ادخل <a href="https://cloud.umami.is/signup" target="_blank" rel="noopener">cloud.umami.is</a> واعمل حساب مجاني.</li>' +
      '<li>دوس <b>Add website</b> واكتب اسم الموقع ورابطه، وانسخ الـ <b>Website ID</b>.</li>' +
      '<li>من <b>Settings ← API keys</b> اعمل مفتاح جديد وانسخه.</li></ol>' +
      '<label class="fld"><span>Website ID</span><input class="inp ltr" id="u-id" dir="ltr" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="' + esc(umamiId()) + '"></label>' +
      '<label class="fld"><span>API key</span><input class="inp ltr" id="u-key" dir="ltr" type="password" autocomplete="off" placeholder="' + (S.vault.umami ? "محفوظ (اكتب مفتاح جديد لو عايز تغيّره)" : "api_...") + '"></label>' +
      '<label class="fld"><span>كلمة مرور لوحة التحكم</span><input class="inp ltr" id="u-pass" type="password" autocomplete="current-password"><small>علشان نحفظ المفتاح متشفّر.</small></label>' +
      '<div class="err" id="u-err"></div><div class="row"><button class="btn pri" id="u-ok">حفظ</button><button class="btn ghost" id="u-no">إلغاء</button></div>',
      function (box, close) {
        $("#u-no", box).onclick = close;
        $("#u-ok", box).onclick = function () {
          var id = $("#u-id", box).value.trim(), key = $("#u-key", box).value.trim() || S.vault.umami || "", pass = $("#u-pass", box).value, err = $("#u-err", box), btn = this;
          if (!/^[0-9a-f-]{36}$/i.test(id)) { err.textContent = "الـ Website ID شكله غلط. انسخه زي ما هو من Umami."; return; }
          if (!key) { err.textContent = "حط الـ API key."; return; }
          if (!pass) { err.textContent = "اكتب كلمة مرور لوحة التحكم."; return; }
          btn.disabled = true; err.className = "err"; err.textContent = "بتأكد من البيانات...";
          fetchAuthBox().then(function (box2) { return box2 ? unseal(box2, pass) : Promise.reject("nobox"); })
            .catch(function () { throw { msg: "كلمة مرور لوحة التحكم غلط." }; })
            .then(function () {
              return fetch(UMAMI_API + "/websites/" + id + "/stats?startAt=" + dayStart(0) + "&endAt=" + Date.now(), { headers: { "x-umami-api-key": key, Accept: "application/json" } })
                .catch(function () { throw { msg: "مش قادر أوصل لـ Umami. اتأكد من النت وجرّب تاني." }; })
                .then(function (r) { if (!r.ok) throw { msg: r.status === 401 || r.status === 403 ? "الـ API key مش شغال أو مالوش صلاحية على الموقع ده." : r.status === 404 ? "الـ Website ID مش موجود." : "Umami رد بخطأ (" + r.status + ")." }; });
            })
            .then(function () {
              err.textContent = "جاري الحفظ...";
              var v = { token: S.vault.token, umami: key };
              return saveAuth(v, pass, "ربط عداد الزوار").then(function () { saveSession(v); return getFile(CFG_FILE); }).then(function (f) {
                var t = f.text;
                if (/UMAMI_WEBSITE_ID:\s*"[^"]*"/.test(t)) t = t.replace(/UMAMI_WEBSITE_ID:\s*"[^"]*"/, 'UMAMI_WEBSITE_ID: "' + id + '"');
                else t = t.replace(/(GA4_ID:[^\n]*\n)/, '$1  UMAMI_WEBSITE_ID: "' + id + '",  // عداد الزوار (Umami) — بيتظبط من لوحة التحكم\n');
                return t === f.text ? null : putFile(CFG_FILE, textB64(t), "ربط عداد الزوار", f.sha);
              });
            })
            .then(function () { window.SITE_CONFIG = window.SITE_CONFIG || {}; window.SITE_CONFIG.UMAMI_WEBSITE_ID = id; close(); toast("اتربط عداد الزوار ✓ الأرقام هتبدأ تتعد بعد ما الموقع يتحدّث (دقيقة)", false, 5000); route(true); })
            .catch(function (e) { btn.disabled = false; err.textContent = (e && e.msg) || "حصل خطأ، جرّب تاني."; });
        };
      });
  }

  /* ---------- الدخول ---------- */
  function viewLogin(box, msg) {
    app.innerHTML = '<div class="login">' +
      '<form class="g-card" id="g-login"' + (box ? "" : " hidden") + '><img src="../assets/img/logo-icon.png" alt=""><h1>لوحة تحكم دار الأمانة</h1><p>اكتب كلمة المرور للدخول</p>' +
      '<label class="fld"><span>كلمة المرور</span><input class="inp ltr" id="g-pass" type="password" autocomplete="current-password" required></label>' +
      '<div class="err" id="g-err">' + esc(msg || "") + '</div><button class="btn pri" type="submit">دخول</button><button class="btn" type="button" id="g-renew">تحديث توكن GitHub</button></form>' +
      '<form class="g-card" id="g-setup"' + (box ? " hidden" : "") + '><img src="../assets/img/logo-icon.png" alt=""><h1>' + (box ? "تحديث توكن GitHub" : "إعداد الدخول لأول مرة") + '</h1><p>حط توكن GitHub واختار كلمة مرور.</p>' +
      '<label class="fld"><span>توكن GitHub</span><input class="inp ltr" id="s-token" type="password" autocomplete="off" required></label>' +
      '<label class="fld"><span>كلمة المرور (١٠ حروف على الأقل)</span><input class="inp ltr" id="s-pass" type="password" autocomplete="new-password" minlength="10" required></label>' +
      '<label class="fld"><span>تأكيد كلمة المرور</span><input class="inp ltr" id="s-pass2" type="password" autocomplete="new-password" minlength="10" required></label>' +
      '<div class="err" id="s-err"></div><button class="btn pri" type="submit">حفظ وتسجيل الدخول</button>' + (box ? '<button class="btn" type="button" id="s-back">رجوع</button>' : "") + "</form>" +
      '<div class="dev-sig"><span>© ' + new Date().getFullYear() + ' أحمد الجمل</span><a href="https://wa.me/971507761628?text=' + encodeURIComponent("مرحباً أحمد، تواصلت معك من لوحة تحكم دار الأمانة") + '" target="_blank" rel="noopener">+971 50 776 1628</a></div></div>';
    $("#g-renew").onclick = function () { $("#g-login").hidden = true; $("#g-setup").hidden = false; };
    if ($("#s-back")) $("#s-back").onclick = function () { $("#g-login").hidden = false; $("#g-setup").hidden = true; };
    $("#g-login").onsubmit = function (e) {
      e.preventDefault(); var f = this, b = $("button[type=submit]", f); b.disabled = true; $("#g-err").textContent = "";
      unseal(box, $("#g-pass").value).then(function (v) {
        return checkToken(v.token).then(function (why) { if (why) { $("#g-err").textContent = why; b.disabled = false; return; } saveSession(v); route(true); });
      }, function () { $("#g-err").textContent = "كلمة المرور غلط، جرّب تاني."; b.disabled = false; });
    };
    $("#g-setup").onsubmit = function (e) {
      e.preventDefault(); var t = $("#s-token").value.trim(), p = $("#s-pass").value, b = $("button[type=submit]", this);
      if (p.length < 10) { $("#s-err").textContent = "كلمة المرور لازم ١٠ حروف على الأقل."; return; }
      if (p !== $("#s-pass2").value) { $("#s-err").textContent = "كلمتين المرور مش زي بعض."; return; }
      b.disabled = true; $("#s-err").textContent = "";
      checkToken(t).then(function (why) {
        if (why) throw why;
        var v = { token: t }; S.vault = v;
        return saveAuth(v, p, "إعداد كلمة مرور لوحة التحكم").then(function () { saveSession(v); route(true); });
      }).catch(function (why) { $("#s-err").textContent = typeof why === "string" ? why : "التوكن مش شغال أو مالوش صلاحية على المستودع."; b.disabled = false; });
    };
  }

  /* ---------- التنقل ---------- */
  function failView(e) {
    if (e && e.message === "401") return;
    $("#main").innerHTML = '<div class="card empty">مش قادر أحمّل البيانات دلوقتي. اتأكد من النت وجرّب تاني.<br><br><button class="btn" onclick="location.reload()">حاول تاني</button></div>';
  }
  var lastHash = location.hash, skip = false;
  function route(force) {
    if (!S.vault) {
      var msg = ""; try { msg = sessionStorage.getItem("gate-msg") || ""; sessionStorage.removeItem("gate-msg"); } catch (e) {}
      return fetchAuthBox().then(function (box) { viewLogin(box && box.data ? box : null, msg); });
    }
    var h = location.hash.replace(/^#\/?/, ""), m;
    if (!force && h === lastHash.replace(/^#\/?/, "") && app.firstChild && app.firstChild.className === "top") return;
    lastHash = location.hash;
    if (h === "new") viewEditor();
    else if ((m = h.match(/^edit\/(ar|en)\/(.+)$/))) viewEditor(m[1], decodeURIComponent(m[2]));
    else if (h === "posts") viewPosts();
    else viewDash();
  }
  window.addEventListener("hashchange", function () {
    if (skip) { skip = false; return; }
    if (S.dirty) {
      var to = location.hash; skip = true; history.replaceState(null, "", lastHash || "#/");
      confirmBox("تخرج من غير ما تحفظ؟", "عندك تعديلات على المقال ماتحفظتش، هتضيع لو خرجت.", "اخرج من غير حفظ", true).then(function (ok) {
        skip = false; if (ok) { S.dirty = false; location.hash = to; }
      });
      return;
    }
    route(true);
  });
  window.addEventListener("beforeunload", function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

  window.__darMd = { toHtml: mdToHtml, toMd: htmlToMd };   // للاختبار
  S.vault = loadSession();
  route(true);
})();
