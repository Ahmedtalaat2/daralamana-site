/* Dar Alamana admin dashboard
   - Password login: the GitHub token (and the visitor counter key) are encrypted in admin/auth.json
   - Articles: JSON files in content/blog/{ar,en}/. Saving makes a commit on GitHub and the site rebuilds itself
   - Visitors: Umami (once connected from the dashboard) */
(function () {
  "use strict";
  var REPO = "Ahmedtalaat2/daralamana-site", BRANCH = "main";
  var AUTH_FILE = "static/admin/auth.json", CFG_FILE = "static/assets/js/config.js", IMG_DIR = "static/assets/img/blog";
  var API = window.GH_API || "https://api.github.com", UMAMI_API = window.UMAMI_API || "https://api.umami.is/v1";
  var KEY = "dar-admin", ITER = 600000;
  var SITE = new URL("../", location.href).href;            // site root
  var LANGS = { ar: "Arabic", en: "English" };
  var TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Qatar"; } catch (e) { return "Asia/Qatar"; } })();
  var app = document.getElementById("app");

  /* ---------- helpers ---------- */
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
  var AR_M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) { var p = String(iso || "").split("-"); if (p.length < 3) return iso || ""; return AR_M[(+p[1]) - 1] + " " + (+p[2]) + ", " + p[0]; }
  function num(n) { n = +n || 0; return n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n); }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    var u = function (n, w) { return n + " " + w + (n === 1 ? "" : "s") + " ago"; };
    if (s < 60) return "just now"; if (s < 3600) return u(Math.round(s / 60), "minute");
    if (s < 86400) return u(Math.round(s / 3600), "hour"); return u(Math.round(s / 86400), "day");
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
      modal('<h1>' + esc(title) + '</h1><p class="muted">' + esc(text) + '</p><div class="row"><button class="btn ' + (danger ? "danger solid" : "pri") + '" data-ok>' + esc(okLabel) + '</button><button class="btn ghost" data-no>Cancel</button></div>',
        function (box, close) {
          $("[data-ok]", box).onclick = function () { close(); res(true); };
          $("[data-no]", box).onclick = function () { close(); res(false); };
        });
    });
  }

  /* ---------- base64 / encryption ---------- */
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

  /* ---------- session ---------- */
  var S = { vault: null, posts: null, dirty: false };
  function loadSession() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && v.token) return v; } catch (e) {}
    try { var o = JSON.parse(localStorage.getItem("sveltia-cms.user") || "null"); if (o && o.token) return { token: o.token }; } catch (e) {}  // from the old admin
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
      if (r.status === 401) { logout("Your GitHub token expired or was removed. Tap \"Update GitHub token\"."); throw new Error("401"); }
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
      if (r.status === 401) return "Your GitHub token expired or was removed. Tap \"Update GitHub token\".";
      if (!r.ok) return "This token can’t access the website’s repository.";
      return r.json().then(function (j) { return j.permissions && !j.permissions.push ? "This token can only read. It needs \"Contents: Read and write\"." : ""; });
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

  /* ---------- articles ---------- */
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

  /* ---------- site update status ---------- */
  var deployTimer = null;
  function deployStatus() {
    return gh("/repos/" + REPO + "/actions/runs?per_page=1&branch=" + BRANCH).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.workflow_runs && j.workflow_runs[0]; }).catch(function () { return null; });
  }
  function renderDeploy(el, run) {
    if (!el) return;
    if (!run) { el.innerHTML = '<span class="dot"></span><span class="muted">Can’t check the update status right now.</span>'; return; }
    var busy = run.status !== "completed", bad = !busy && run.conclusion !== "success";
    el.innerHTML = '<span class="dot' + (busy ? " run" : bad ? " bad" : "") + '"></span><span>' +
      (busy ? "The website is updating... (about 1 minute)" : bad ? "The last website update didn’t finish. Try saving again, or contact support." : "The website is up to date. Last update " + ago(run.updated_at)) + "</span>";
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

  /* ---------- visitors (Umami) ---------- */
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

  /* ---------- layout ---------- */
  function shell(active, inner) {
    var tabs = [["", "home", "Dashboard"], ["posts", "posts", "Articles"]];
    function links() { return tabs.map(function (x) { return '<a href="#/' + x[0] + '" class="' + (active === x[0] ? "on" : "") + '">' + ic(x[1]) + "<span>" + x[2] + "</span></a>"; }).join(""); }
    var logo = '<span class="logo-chip"><img src="../assets/img/logo-icon.png" alt=""></span>';
    var menuItems =
      '<a href="' + SITE + '" target="_blank" rel="noopener">' + ic("globe") + 'Open website</a>' +
      '<button data-act="umami">' + ic("chart") + (umamiOn() ? "Visitor counter" : "Connect visitor counter") + '</button>' +
      '<button data-act="pass">' + ic("lock") + 'Change password</button>' +
      '<button data-act="out" class="red">' + ic("out") + 'Log out</button>';
    var d = new Date(), hour = d.getHours();
    var hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    app.innerHTML =
      '<div class="mtop">' + logo + '<b>Dar Alamana</b><span class="sp"></span>' +
      '<a class="btn pri add" href="#/new" aria-label="New article">' + ic("plus") + '</a>' +
      '<div class="menu"><button class="btn icon" id="menu-btn" aria-label="Menu" aria-haspopup="true">' + ic("menu") + '</button><div class="menu-pop nav" id="menu-pop" hidden>' + menuItems + '</div></div></div>' +
      '<div class="frame"><aside class="side">' +
      '<a class="brand" href="#/">' + logo + '<span><b>Dar Alamana</b><small>Admin dashboard</small></span></a>' +
      '<nav class="nav">' + links() + '<a href="#/new" class="' + (active === "edit" && location.hash === "#/new" ? "on" : "") + '">' + ic("plus") + '<span>New article</span></a></nav>' +
      '<span class="sp"></span><div class="lbl">Settings</div><nav class="nav">' + menuItems + '</nav></aside>' +
      '<div class="colm"><header class="top"><div class="hi"><h1>' + hello + ', <span>Dar Alamana</span></h1><p>' + d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + '</p></div>' +
      '<span class="sp"></span><a class="btn pri add-top" href="#/new">' + ic("plus") + 'New article</a>' +
      '<div class="me">' + logo + '<span><b>Admin</b><small>Dar Alamana</small></span></div></header>' +
      '<main id="main">' + inner + '</main></div></div>' +
      '<nav class="btab">' + links() + '</nav>';
    var pop = $("#menu-pop");
    $("#menu-btn").onclick = function (e) { e.stopPropagation(); pop.hidden = !pop.hidden; };
    document.onclick = function () { pop.hidden = true; };
    $$("[data-act]").forEach(function (b) {
      b.onclick = function () {
        pop.hidden = true; var a = b.dataset.act;
        if (a === "pass") changePassword(); else if (a === "umami") setupUmami();
        else confirmBox("Log out?", "You will need your password to log in again.", "Log out").then(function (ok) { if (ok) logout(); });
      };
    });
    document.body.classList.toggle("editing", active === "edit");
    window.scrollTo(0, 0);
  }
  function loadingHtml(t) { return '<div class="loading"><span class="spin"></span>' + (t || "Loading...") + "</div>"; }

  /* ---------- home ---------- */
  var RANGE = 14;
  function viewDash() {
    shell("", loadingHtml());
    loadPosts().then(function (posts) {
      var live = posts.filter(function (p) { return !p.d.draft; }), drafts = posts.length - live.length;
      var ar = live.filter(function (p) { return p.lang === "ar"; }).length, en = live.length - ar;
      var u = umamiOn();
      var stat = function (cls, icon, k, id) { return '<div class="card stat ' + cls + '"><div class="k">' + ic(icon) + k + '</div><div class="v" id="' + id + '">' + (u ? "…" : "—") + '</div><div class="s" id="' + id + '-s">' + (u ? "" : "Not connected yet") + "</div></div>"; };
      var waiting = function (id) { return '<div id="' + id + '">' + (u ? loadingHtml("") : '<p class="muted" style="margin:0">Connect the visitor counter to see this.</p>') + "</div>"; };
      var tiles = posts.slice(0, 4).map(function (p) {
        return '<a class="tile" href="#/edit/' + p.lang + "/" + encodeURIComponent(p.d.slug) + '"><img src="' + esc(siteUrl(p.d.image || "/assets/img/vitals.webp")) + '" alt="" loading="lazy">' +
          '<b dir="' + (p.lang === "en" ? "ltr" : "rtl") + '">' + esc(p.d.title) + '</b><small>' + (p.d.draft ? '<span class="tag draft">Draft</span>' : '<span class="tag live">Live</span>') + esc(fmtDate(p.d.date)) + "</small></a>";
      }).join("");
      var h =
        '<div class="grid g4">' +
        stat("pur", "users", "Visitors today", "st-today") +
        stat("", "users", "Visitors · 7 days", "st-week") +
        stat("", "eye", "Page views · 30 days", "st-month") +
        '<div class="card stat"><div class="k">' + ic("article") + 'Published articles</div><div class="v">' + live.length + '</div><div class="s">Arabic ' + ar + " · English " + en + (drafts ? " · " + drafts + " draft" + (drafts > 1 ? "s" : "") : "") + "</div></div></div>" +
        '<div class="grid g3 sec">' +
        '<div class="card glow">' + (u
          ? '<h2>Share something helpful</h2><p>New articles help families find you on Google. Write one in a few minutes.</p><a class="btn pri" href="#/new">' + ic("plus") + "Write a new article</a>"
          : '<h2>See who visits your website</h2><p>Connect the free visitor counter once. Then all your numbers show up right here.</p><button class="btn pri" id="go-umami">' + ic("chart") + "Connect visitor counter</button>") + "</div>" +
        '<div class="card"><h2>' + ic("eye") + 'Top pages <small class="muted">· 30 days</small></h2>' + waiting("u-pages") + "</div>" +
        '<div class="card wide"><div class="card-h"><h2>' + ic("posts") + 'Latest articles</h2><a class="btn sm" href="#/posts">See all</a></div>' +
        (tiles ? '<div class="tiles">' + tiles + "</div>" : '<p class="muted">No articles yet.</p>') + "</div></div>" +
        '<div class="card sec"><div class="card-h"><h2>' + ic("chart") + 'Website traffic</h2><div class="pills" id="rng">' +
        [[7, "7D"], [14, "14D"], [30, "1M"], [90, "3M"]].map(function (r) { return '<button class="pill' + (r[0] === RANGE ? " on" : "") + '" data-r="' + r[0] + '">' + r[1] + "</button>"; }).join("") +
        "</div></div>" + (u ? '<div id="u-chart">' + loadingHtml("") + "</div>" : '<div class="note">Your daily visitors will show here as a chart once the visitor counter is connected.</div>') + "</div>" +
        '<div class="grid g3 sec">' +
        '<div class="card"><h2>' + ic("link") + 'Where visitors come from <small class="muted">· 30 days</small></h2>' + waiting("u-refs") + "</div>" +
        '<div class="card"><h2>' + ic("phone") + 'Devices <small class="muted">· 30 days</small></h2>' + waiting("u-dev") + "</div>" +
        '<div class="card wide"><h2>' + ic("rocket") + 'Website status</h2><div class="deploy" id="deploy"><span class="dot run"></span><span class="muted">Checking...</span></div>' +
        '<p class="muted" style="font-size:13.5px;margin:12px 0 14px">Articles you save show up on the website in about 1 minute.</p>' +
        '<a class="btn sm" href="' + SITE + '" target="_blank" rel="noopener">' + ic("globe") + "Open website</a></div></div>";
      $("#main").innerHTML = h;
      if ($("#go-umami")) $("#go-umami").onclick = setupUmami;
      $$("#rng .pill").forEach(function (b) {
        b.onclick = function () { if (!u) return setupUmami(); RANGE = +b.dataset.r; $$("#rng .pill").forEach(function (x) { x.classList.toggle("on", x === b); }); loadChart(); };
      });
      watchDeploy();
      if (u) loadVisitors();
    }).catch(failView);
  }
  function loadVisitors() {
    var now = Date.now();
    function set(id, v, s) { var el = $("#" + id); if (el) el.textContent = v; if (s != null && $("#" + id + "-s")) $("#" + id + "-s").textContent = s; }
    var fail = function () { set("st-today", "—", "Couldn’t load"); };
    um("/stats", { startAt: dayStart(0), endAt: now }).then(function (s) { set("st-today", num(val(s.visitors)), num(val(s.pageviews)) + " page views"); }).catch(fail);
    um("/stats", { startAt: dayStart(6), endAt: now }).then(function (s) { set("st-week", num(val(s.visitors)), num(val(s.pageviews)) + " page views"); }).catch(function () { set("st-week", "—"); });
    um("/stats", { startAt: dayStart(29), endAt: now }).then(function (s) { set("st-month", num(val(s.pageviews)), num(val(s.visitors)) + " visitors"); }).catch(function () { set("st-month", "—"); });
    loadChart();
    var start30 = dayStart(29);
    function list(id, type, label, icon, bars) {
      metric(type, start30).then(function (rows) {
        var el = $("#" + id); if (!el) return;
        if (!rows || !rows.length) { el.innerHTML = '<p class="muted" style="margin:0">No data yet.</p>'; return; }
        var total = rows.reduce(function (a, r) { return a + (+r.y || 0); }, 0) || 1;
        el.innerHTML = '<ul class="rank">' + rows.slice(0, bars ? 5 : 5).map(function (r) {
          var pct = Math.round((+r.y || 0) / total * 100);
          return '<li><span class="ri">' + ic(icon(r.x)) + '</span><span class="t">' + esc(label(r.x)) + (bars ? '<span class="bar"><i style="width:' + pct + '%"></i></span>' : "") + '</span><span class="n">' + num(r.y) + (bars ? "<small>" + pct + "%</small>" : "") + "</span></li>";
        }).join("") + "</ul>";
      }).catch(function () { var el = $("#" + id); if (el) el.innerHTML = '<p class="muted" style="margin:0">Couldn’t load. Check the visitor counter in the menu.</p>'; });
    }
    list("u-pages", "path", pageName, function (x) { return /blog\//.test(x) ? "article" : "globe"; }, false);
    list("u-refs", "referrer", refName, function () { return "link"; }, true);
    list("u-dev", "device", function (x) { return { mobile: "Phone", desktop: "Computer", laptop: "Laptop", tablet: "Tablet" }[x] || x || "Unknown"; }, function (x) { return x === "mobile" || x === "tablet" ? "phone" : "chart"; }, true);
  }
  var chartCache = {};
  function loadChart() {
    var el = $("#u-chart"); if (!el) return;
    var n = RANGE, key = n + ":" + dayStart(0);
    var draw = function (days) { var e2 = $("#u-chart"); if (e2 && RANGE === n) lineChart(e2, days); };
    if (chartCache[key]) return draw(chartCache[key]);
    el.innerHTML = loadingHtml("");
    um("/pageviews", { startAt: dayStart(n - 1), endAt: Date.now(), unit: "day", timezone: TZ }).then(function (r) {
      var m = {}; (r.pageviews || []).forEach(function (p) { m[String(p.x).slice(0, 10)] = +p.y || 0; });
      var days = []; for (var i = n - 1; i >= 0; i--) { var d = new Date(dayStart(i)); days.push({ d: d, y: m[d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())] || 0 }); }
      chartCache[key] = days; draw(days);
    }).catch(function () { var e2 = $("#u-chart"); if (e2) e2.innerHTML = '<p class="note amber">Can’t load visitor numbers right now. Check the visitor counter in the menu.</p>'; });
  }
  function lineChart(el, pts) {
    el.innerHTML = '<div class="lc"></div><div class="lc-x"></div>';
    var box = $(".lc", el), W = Math.max(280, box.clientWidth), H = box.clientHeight, L = 38, T = 14, B = 10, R = 8;
    var max = Math.max.apply(null, pts.map(function (p) { return p.y; }).concat([4]));
    var step = Math.pow(10, Math.floor(Math.log10(max))); var top = Math.ceil(max / step) * step; if (top / step < 3) { step /= 2; top = Math.ceil(max / step) * step; }
    var X = function (i) { return L + (W - L - R) * (pts.length === 1 ? .5 : i / (pts.length - 1)); }, Y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var xy = pts.map(function (p, i) { return [X(i), Y(p.y)]; });
    var line = "M" + xy[0][0] + "," + xy[0][1];
    for (var i = 1; i < xy.length; i++) { var a = xy[i - 1], b = xy[i], mx = (a[0] + b[0]) / 2; line += " C" + mx + "," + a[1] + " " + mx + "," + b[1] + " " + b[0] + "," + b[1]; }
    var area = line + " L" + xy[xy.length - 1][0] + "," + (H - B) + " L" + xy[0][0] + "," + (H - B) + " Z";
    var grid = ""; for (var v = 0; v <= top; v += step) { var y = Y(v); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.07)"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" fill="#6F6688" font-size="11" text-anchor="end">' + num(v) + "</text>"; }
    box.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-label="Page views per day"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9B78D7" stop-opacity=".55"/><stop offset="1" stop-color="#5A3E98" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9B78D7"/><stop offset="1" stop-color="#E4D4FA"/></linearGradient></defs>' + grid +
      '<path d="' + area + '" fill="url(#ga)"/><path d="' + line + '" fill="none" stroke="url(#gl)" stroke-width="2.4" stroke-linecap="round"/>' +
      '<line id="lc-v" y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(202,177,234,.6)" stroke-dasharray="3 4"/><circle id="lc-d" r="6" fill="#F1EDF9" stroke="#9B78D7" stroke-width="3"/></svg><div class="tip" id="lc-t"></div>';
    var xs = $(".lc-x", el), every = Math.ceil(pts.length / 7);
    xs.innerHTML = pts.map(function (p, i) { return i % every === 0 || i === pts.length - 1 ? "<span>" + p.d.getDate() + " " + AR_M[p.d.getMonth()] + "</span>" : ""; }).join("");
    function show(i) {
      var p = pts[i], q = xy[i];
      $("#lc-v").setAttribute("x1", q[0]); $("#lc-v").setAttribute("x2", q[0]); $("#lc-d").setAttribute("cx", q[0]); $("#lc-d").setAttribute("cy", q[1]);
      var t = $("#lc-t"); t.style.left = Math.min(Math.max(q[0], 60), W - 60) + "px"; t.style.top = q[1] + "px"; t.classList.toggle("below", q[1] < 70);
      t.innerHTML = "<span>" + p.d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + "</span><b>" + p.y + " page view" + (p.y === 1 ? "" : "s") + "</b>";
    }
    var best = 0; pts.forEach(function (p, i) { if (p.y >= pts[best].y) best = i; }); show(best);
    box.addEventListener("pointermove", function (e) { var r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; var i = Math.round((x - L) / ((W - L - R) / Math.max(1, pts.length - 1))); show(Math.max(0, Math.min(pts.length - 1, i))); });
    clearTimeout(lineChart.t);
    window.onresize = function () { clearTimeout(lineChart.t); lineChart.t = setTimeout(function () { var e2 = $("#u-chart"); if (e2 && $(".lc", e2) && Math.abs($(".lc", e2).clientWidth - W) > 20) lineChart(e2, pts); }, 200); };
  }
  function pageName(x) {
    var p = String(x || "/").replace(/^\/daralamana-site/, "").replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
    var map = { "/": "Home (Arabic)", "/en/": "Home (English)", "/blog": "Blog (Arabic)", "/en/blog": "Blog (English)", "/services": "Services", "/en/services": "Services (English)", "/request": "Request a nurse", "/en/request": "Request a nurse (English)", "/contact": "Contact", "/en/contact": "Contact (English)", "/faq": "FAQ", "/en/faq": "FAQ (English)", "/about": "About", "/en/about": "About (English)", "/careers": "Careers", "/en/careers": "Careers (English)" };
    if (map[p]) return map[p];
    var m = p.match(/^\/(en\/)?blog\/(.+)$/);
    if (m) { var post = findPost(m[1] ? "en" : "ar", m[2]); return "Article: " + (post ? post.d.title : m[2]); }
    return p;
  }
  function refName(x) {
    if (!x) return "Direct (typed or saved link)";
    var h = String(x).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    var map = { "google": "Google", "instagram": "Instagram", "l.instagram": "Instagram", "facebook": "Facebook", "l.facebook": "Facebook", "m.facebook": "Facebook", "t.co": "X (Twitter)", "x": "X (Twitter)", "wa.me": "WhatsApp", "whatsapp": "WhatsApp", "tiktok": "TikTok", "snapchat": "Snapchat", "bing": "Bing", "linkedin": "LinkedIn", "youtube": "YouTube" };
    var base = h.replace(/\.(com|net|org|co|qa|ae|sa)(\.[a-z]+)?$/, "");
    return map[base] || map[base.split(".").pop()] || h;
  }

  /* ---------- all articles ---------- */
  var listState = { q: "", f: "all" };
  function viewPosts() {
    shell("posts", loadingHtml());
    loadPosts().then(function () {
      $("#main").innerHTML = '<div class="h"><div><h1>All articles</h1><p id="p-count"></p></div><a class="btn pri" href="#/new">' + ic("plus") + 'New article</a></div>' +
        '<div class="tools"><input class="inp" id="p-q" type="search" placeholder="Search titles..." value="' + esc(listState.q) + '">' +
        '<div class="chips" id="p-f">' + [["all", "All"], ["ar", "Arabic"], ["en", "English"], ["draft", "Drafts"]].map(function (c) { return '<button class="chip' + (listState.f === c[0] ? " on" : "") + '" data-f="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div></div>" +
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
    $("#p-count").textContent = S.posts.length + (S.posts.length === 1 ? " article" : " articles") + (rows.length !== S.posts.length ? " · showing " + rows.length : "");
    var el = $("#p-list");
    if (!rows.length) { el.innerHTML = '<div class="card empty">' + (S.posts.length ? "No articles match your search." : "No articles yet. Tap \"New article\" to write your first one.") + "</div>"; return; }
    el.innerHTML = rows.map(function (p, i) {
      var img = siteUrl(p.d.image || "/assets/img/vitals.webp");
      return '<div class="card prow"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="m"><b dir="' + (p.lang === "en" ? "ltr" : "rtl") + '">' + esc(p.d.title || "(No title)") + '</b><small><span class="tag">' + LANGS[p.lang] + '</span>' +
        (p.d.draft ? '<span class="tag draft">Draft</span>' : '<span class="tag live">Published</span>') + "<span>" + esc(fmtDate(p.d.date)) + "</span></small></div>" +
        '<div class="a"><a class="btn sm" href="#/edit/' + p.lang + "/" + encodeURIComponent(p.d.slug) + '">' + ic("edit") + "Edit</a>" +
        (p.d.draft ? "" : '<a class="btn sm ghost" href="' + esc(postUrl(p)) + '" target="_blank" rel="noopener">' + ic("eye") + "View</a>") +
        '<button class="btn sm danger" data-del="' + S.posts.indexOf(p) + '">' + ic("trash") + "Delete</button></div></div>";
    }).join("");
    $$("[data-del]", el).forEach(function (b) { b.onclick = function () { deletePost(S.posts[+b.dataset.del]); }; });
  }
  function deletePost(p) {
    confirmBox("Delete this article?", "\"" + p.d.title + "\" will be removed from the website for good. You can’t undo this.", "Delete", true).then(function (ok) {
      if (!ok) return;
      toast("Deleting...", false, 0);
      delFile(p.path, p.sha, "Delete article: " + p.d.slug).then(function () {
        S.posts = S.posts.filter(function (x) { return x !== p; });
        toast("Deleted ✓ It will disappear from the website in about 1 minute.");
        if (location.hash.indexOf("#/edit") === 0) { S.dirty = false; location.hash = "#/posts"; } else drawList();
      }).catch(function () { toast("Couldn’t delete. Please try again.", true); });
    });
  }

  /* ---------- editor: Markdown <-> HTML ---------- */
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
    return out.map(function (b) { return b.split("\n").map(function (l) { return l; }).join("\n"); }).join("\n\n").trim();
  }

  /* ---------- images ---------- */
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
    return blobB64(blob).then(function (b64) { return putFile(IMG_DIR + "/" + name, b64, "Upload image: " + name); })
      .then(function () { return "/assets/img/blog/" + name; });
  }

  /* ---------- link (slug) from the title ---------- */
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

  /* ---------- editor ---------- */
  var E = null;
  function viewEditor(L, slug) {
    shell("edit", loadingHtml());
    loadPosts().then(function () {
      var orig = slug ? findPost(L, slug) : null;
      if (slug && !orig) { $("#main").innerHTML = '<div class="card empty">This article doesn’t exist. It may have been deleted.<br><br><a class="btn" href="#/posts">All articles</a></div>'; return; }
      var d = orig ? orig.d : { title: "", description: "", date: today(), image: "", image_alt: "", body: "", draft: false };
      E = { orig: orig, lang: orig ? orig.lang : (listState.f === "en" ? "en" : "ar"), cover: d.image || "", coverBlob: null, slugTouched: !!orig, pending: {} };
      var title = orig ? "Edit article" : "New article";
      $("#main").innerHTML =
        '<div class="h"><div><h1>' + title + '</h1><p>' + (orig ? (orig.d.draft ? "This article is a draft. It is not on the website." : "This article is live on the website.") : "Write your article, add a photo, then tap Publish.") + '</p></div>' +
        '<a class="btn ghost sm" href="#/posts">Back to articles</a></div>' +
        '<div class="ed"><div>' +
        '<div class="card">' +
        '<label class="fld"><span>Title</span><input class="inp title-inp" id="e-title" maxlength="140" placeholder="Example: How to get your home ready after a hospital stay" value="' + esc(d.title) + '"></label>' +
        '<label class="fld"><span>Short description <em class="count" id="e-dcount"></em></span><textarea class="inp" id="e-desc" rows="2" placeholder="1 or 2 lines. Shown under the title and in Google results.">' + esc(d.description || "") + '</textarea><small>Best between 120 and 160 characters.</small></label>' +
        '<div class="fld" style="margin:0"><span>Article</span>' +
        '<div class="tb" id="e-tb" role="toolbar" aria-label="Formatting tools">' +
        '<button type="button" data-cmd="h2" title="Big heading">Heading</button><button type="button" data-cmd="h3" title="Small heading">Sub</button><button type="button" data-cmd="p" title="Normal text">Text</button><span class="sep"></span>' +
        '<button type="button" data-cmd="bold" title="Bold"><b>B</b></button><button type="button" data-cmd="italic" title="Italic"><i>I</i></button><span class="sep"></span>' +
        '<button type="button" data-cmd="ul" title="Bullet list">' + ic("ul") + '</button><button type="button" data-cmd="ol" title="Numbered list">' + ic("ol") + '</button><button type="button" data-cmd="quote" title="Quote / note">' + ic("quote") + '</button><span class="sep"></span>' +
        '<button type="button" data-cmd="link" title="Link">' + ic("link") + '</button><button type="button" data-cmd="image" title="Photo in the article">' + ic("image") + "</button></div>" +
        '<div class="rte" id="e-body" contenteditable="true" data-ph="Start writing here... Use the Heading button for headings." spellcheck="true"></div></div>' +
        "</div></div>" +
        '<aside class="ed-side">' +
        '<div class="card ed-actions side"><button class="btn pri" data-save="pub">' + ic("rocket") + (orig && !orig.d.draft ? "Save changes" : "Publish") + '</button><button class="btn" data-save="draft">Save as draft</button>' +
        (orig ? '<button class="btn danger sm" id="e-del">' + ic("trash") + "Delete article</button>" : "") + "</div>" +
        '<div class="card"><h2>' + ic("image") + 'Cover photo</h2><div class="cover" id="e-cover" role="button" tabindex="0"></div>' +
        '<div class="cover-act"><button class="btn sm" id="e-cover-pick">Choose photo</button><button class="btn sm ghost" id="e-cover-rm">Remove</button></div>' +
        '<label class="fld" style="margin:12px 0 0"><span>Photo description (for Google)</span><input class="inp" id="e-alt" placeholder="Example: A nurse checking a patient’s blood pressure at home" value="' + esc(d.image_alt || "") + '"></label></div>' +
        '<div class="card"><h2>' + ic("globe") + 'Language and date</h2>' +
        (orig ? '<p style="margin:0 0 12px">Language: <span class="tag">' + LANGS[E.lang] + "</span></p>" : '<div class="seg" id="e-lang" style="margin-bottom:14px"><button type="button" data-l="ar">Arabic</button><button type="button" data-l="en">English</button></div>') +
        '<label class="fld"><span>Publish date</span><input class="inp" type="date" id="e-date" value="' + esc(String(d.date || today()).slice(0, 10)) + '"></label>' +
        '<label class="switch"><span>Draft (hidden from the website)</span><input type="checkbox" id="e-draft"' + (d.draft ? " checked" : "") + "></label>" +
        '<details class="adv" style="margin-top:14px"><summary>Article link</summary><label class="fld" style="margin:10px 0 0"><input class="inp ltr" id="e-slug" dir="ltr" placeholder="how-to-prepare-home" value="' + esc(d.slug || "") + '">' +
        '<small>Small English letters, numbers and dashes only. It is made from the title for you. Use the same link for the Arabic article and its English version.</small><small dir="ltr" id="e-url" style="word-break:break-all"></small></label></details>' +
        "</div></aside></div>" +
        '<div class="ed-bar"><button class="btn" data-save="draft">Draft</button><button class="btn pri" data-save="pub">' + ic("rocket") + (orig && !orig.d.draft ? "Save" : "Publish") + "</button></div>";

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
  function countDesc() { var n = $("#e-desc").value.trim().length, c = $("#e-dcount"); c.textContent = n + " characters"; c.className = "count" + (n > 170 ? " over" : ""); }
  function showUrl() { var s = $("#e-slug").value.trim() || slugify($("#e-title").value); $("#e-url").textContent = s ? SITE + (E.lang === "en" ? "en/" : "") + "blog/" + s + ".html" : ""; }
  function drawCover() {
    var c = $("#e-cover");
    c.innerHTML = E.cover ? '<img src="' + esc(E.cover.indexOf("blob:") === 0 ? E.cover : siteUrl(E.cover)) + '" alt="">' : ic("image") + "<b>Tap to choose a photo</b><small>From your phone or computer. We make it smaller for you.</small>";
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
      btn.addEventListener("mousedown", function (e) { e.preventDefault(); });  // keep the text selection
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
      // Enter inside a quote or heading goes back to normal text
      if (e.key === "Enter" && !e.shiftKey && /^(BLOCKQUOTE|H2|H3)$/.test(block())) {
        e.preventDefault(); document.execCommand("insertParagraph"); document.execCommand("formatBlock", false, "p"); S.dirty = true; return;
      }
      if ((e.ctrlKey || e.metaKey) && /^[bi]$/i.test(e.key)) { e.preventDefault(); document.execCommand(e.key.toLowerCase() === "b" ? "bold" : "italic"); S.dirty = true; }
    });
  }
  function addLink(restore) {
    var sel = getSelection(), txt = sel.toString();
    modal('<h1>Add a link</h1><label class="fld"><span>Link</span><input class="inp ltr" id="l-url" dir="ltr" placeholder="https://..." inputmode="url"></label>' +
      (txt ? "" : '<label class="fld"><span>Text to show</span><input class="inp" id="l-txt" placeholder="Example: Request a nurse"></label>') +
      '<div class="err" id="l-err"></div><div class="row"><button class="btn pri" id="l-ok">Add</button><button class="btn ghost" id="l-no">Cancel</button></div>',
      function (box, close) {
        $("#l-no", box).onclick = close;
        $("#l-ok", box).onclick = function () {
          var u = $("#l-url", box).value.trim(); if (!u) { $("#l-err", box).textContent = "Please type the link."; return; }
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
    if (!title) { toast("Please add a title first.", true); $("#e-title").focus(); return; }
    if (!asDraft && !body.textContent.trim() && !$("img", body)) { toast("The article is empty. Write something, or save it as a draft.", true); body.focus(); return; }
    if (!asDraft && !desc) { toast("Please add a short description (it shows in Google).", true); $("#e-desc").focus(); return; }
    var L = E.lang, orig = E.orig;
    if (!slug) slug = "post-" + Date.now().toString(36);
    var taken = function (s) { return (S.posts || []).some(function (p) { return p.lang === L && p.d.slug === s && p !== orig; }); };
    if (taken(slug)) { var n = 2; while (taken(slug + "-" + n)) n++; slug = slug + "-" + n; }
    $("#e-slug").value = slug;
    var btns = $$("[data-save]"); btns.forEach(function (b) { b.disabled = true; });
    toast("Saving...", false, 0);
    var image = E.cover && E.cover.indexOf("blob:") !== 0 ? E.cover : "";
    var steps = Promise.resolve();
    if (E.coverBlob) steps = steps.then(function () { toast("Uploading the cover photo...", false, 0); return uploadImage(E.coverBlob, slug).then(function (p) { image = p; E.cover = p; E.coverBlob = null; }); });
    $$("img[data-pid]", body).forEach(function (img) {
      steps = steps.then(function () {
        var blob = E.pending[img.dataset.pid]; if (!blob) { img.remove(); return; }
        toast("Uploading photos...", false, 0);
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
      var msg = (orig ? "Edit article: " : "New article: ") + slug;
      return putFile(path, textB64(json), msg, same ? orig.sha : undefined).then(function (sha) {
        var rec = { lang: L, path: path, sha: sha, d: d };
        var after = orig && !same ? delFile(orig.path, orig.sha, "Move article: " + orig.d.slug + " -> " + slug) : Promise.resolve();
        return after.then(function () {
          S.posts = sortPosts((S.posts || []).filter(function (p) { return p !== orig; }).concat([rec]));
          S.dirty = false;
          toast(asDraft ? "Saved as draft ✓ (not on the website)" : "Saved ✓ It will be on the website in about 1 minute.", false, 4500);
          location.hash = "#/posts";
        });
      });
    }).catch(function (e) {
      btns.forEach(function (b) { b.disabled = false; });
      toast(e && e.status === 422 ? "Another article already uses this link. Change the article link and try again." : e && e.status === 409 ? "This article was changed somewhere else. Open it again and retry." : "Couldn’t save. Check your internet and try again.", true, 6000);
    });
  }

  /* ---------- password + visitor counter ---------- */
  function changePassword() {
    $("#menu-pop") && ($("#menu-pop").hidden = true);
    modal('<h1>Change password</h1><p class="muted">Your new password starts working in 1 to 2 minutes.</p>' +
      '<label class="fld"><span>New password (at least 10 characters)</span><input class="inp ltr" type="password" id="c-1" autocomplete="new-password"></label>' +
      '<label class="fld"><span>Type it again</span><input class="inp ltr" type="password" id="c-2" autocomplete="new-password"></label>' +
      '<div class="err" id="c-err"></div><div class="row"><button class="btn pri" id="c-ok">Save</button><button class="btn ghost" id="c-no">Cancel</button></div>',
      function (box, close) {
        $("#c-no", box).onclick = close;
        $("#c-ok", box).onclick = function () {
          var a = $("#c-1", box).value, b = $("#c-2", box).value, err = $("#c-err", box), btn = this;
          if (a.length < 10) { err.textContent = "The password needs at least 10 characters."; return; }
          if (a !== b) { err.textContent = "The two passwords don’t match."; return; }
          btn.disabled = true; err.className = "err"; err.textContent = "Saving...";
          saveAuth(S.vault, a, "Change admin password").then(function () { close(); toast("Password changed ✓"); })
            .catch(function () { btn.disabled = false; err.textContent = "Something went wrong. Please try again."; });
        };
      });
  }
  function setupUmami() {
    $("#menu-pop") && ($("#menu-pop").hidden = true);
    modal('<h1>Connect visitor counter</h1><p class="muted">We use Umami (free). You only do this once:</p>' +
      '<ol style="margin:0 0 16px;padding-inline-start:20px;font-size:14px;line-height:1.9">' +
      '<li>Go to <a href="https://cloud.umami.is/signup" target="_blank" rel="noopener">cloud.umami.is</a> and make a free account.</li>' +
      '<li>Tap <b>Add website</b>, type the website name and link, then copy the <b>Website ID</b>.</li>' +
      '<li>Go to <b>Settings → API keys</b>, make a new key and copy it.</li></ol>' +
      '<label class="fld"><span>Website ID</span><input class="inp ltr" id="u-id" dir="ltr" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="' + esc(umamiId()) + '"></label>' +
      '<label class="fld"><span>API key</span><input class="inp ltr" id="u-key" dir="ltr" type="password" autocomplete="off" placeholder="' + (S.vault.umami ? "Saved (type a new key to change it)" : "api_...") + '"></label>' +
      '<label class="fld"><span>Your dashboard password</span><input class="inp ltr" id="u-pass" type="password" autocomplete="current-password"><small>We need it to save the key safely (encrypted).</small></label>' +
      '<div class="err" id="u-err"></div><div class="row"><button class="btn pri" id="u-ok">Save</button><button class="btn ghost" id="u-no">Cancel</button></div>',
      function (box, close) {
        $("#u-no", box).onclick = close;
        $("#u-ok", box).onclick = function () {
          var id = $("#u-id", box).value.trim(), key = $("#u-key", box).value.trim() || S.vault.umami || "", pass = $("#u-pass", box).value, err = $("#u-err", box), btn = this;
          if (!/^[0-9a-f-]{36}$/i.test(id)) { err.textContent = "This Website ID doesn’t look right. Copy it exactly from Umami."; return; }
          if (!key) { err.textContent = "Please add the API key."; return; }
          if (!pass) { err.textContent = "Please type your dashboard password."; return; }
          btn.disabled = true; err.className = "err"; err.textContent = "Checking...";
          fetchAuthBox().then(function (box2) { return box2 ? unseal(box2, pass) : Promise.reject("nobox"); })
            .catch(function () { throw { msg: "Wrong dashboard password." }; })
            .then(function () {
              return fetch(UMAMI_API + "/websites/" + id + "/stats?startAt=" + dayStart(0) + "&endAt=" + Date.now(), { headers: { "x-umami-api-key": key, Accept: "application/json" } })
                .catch(function () { throw { msg: "Can’t reach Umami. Check your internet and try again." }; })
                .then(function (r) { if (!r.ok) throw { msg: r.status === 401 || r.status === 403 ? "This API key doesn’t work, or it can’t access this website." : r.status === 404 ? "This Website ID was not found." : "Umami returned an error (" + r.status + ")." }; });
            })
            .then(function () {
              err.textContent = "Saving...";
              var v = { token: S.vault.token, umami: key };
              return saveAuth(v, pass, "Connect visitor counter").then(function () { saveSession(v); return getFile(CFG_FILE); }).then(function (f) {
                var t = f.text;
                if (/UMAMI_WEBSITE_ID:\s*"[^"]*"/.test(t)) t = t.replace(/UMAMI_WEBSITE_ID:\s*"[^"]*"/, 'UMAMI_WEBSITE_ID: "' + id + '"');
                else t = t.replace(/(GA4_ID:[^\n]*\n)/, '$1  UMAMI_WEBSITE_ID: "' + id + '",  // عداد الزوار (Umami) — بيتظبط من لوحة التحكم\n');
                return t === f.text ? null : putFile(CFG_FILE, textB64(t), "Connect visitor counter", f.sha);
              });
            })
            .then(function () { window.SITE_CONFIG = window.SITE_CONFIG || {}; window.SITE_CONFIG.UMAMI_WEBSITE_ID = id; close(); toast("Visitor counter connected ✓ Counting starts after the website updates (about 1 minute).", false, 5000); route(true); })
            .catch(function (e) { btn.disabled = false; err.textContent = (e && e.msg) || "Something went wrong. Please try again."; });
        };
      });
  }

  /* ---------- login ---------- */
  function viewLogin(box, msg) {
    app.innerHTML = '<div class="login">' +
      '<form class="g-card" id="g-login"' + (box ? "" : " hidden") + '><span class="logo-chip big"><img src="../assets/img/logo-icon.png" alt=""></span><h1>Dar Alamana Dashboard</h1><p>Type your password to log in</p>' +
      '<label class="fld"><span>Password</span><input class="inp ltr" id="g-pass" type="password" autocomplete="current-password" required></label>' +
      '<div class="err" id="g-err">' + esc(msg || "") + '</div><button class="btn pri" type="submit">Log in</button><button class="btn" type="button" id="g-renew">Update GitHub token</button></form>' +
      '<form class="g-card" id="g-setup"' + (box ? " hidden" : "") + '><span class="logo-chip big"><img src="../assets/img/logo-icon.png" alt=""></span><h1>' + (box ? "Update GitHub token" : "First-time setup") + '</h1><p>Paste your GitHub token and choose a password.</p>' +
      '<label class="fld"><span>GitHub token</span><input class="inp ltr" id="s-token" type="password" autocomplete="off" required></label>' +
      '<label class="fld"><span>Password (at least 10 characters)</span><input class="inp ltr" id="s-pass" type="password" autocomplete="new-password" minlength="10" required></label>' +
      '<label class="fld"><span>Type it again</span><input class="inp ltr" id="s-pass2" type="password" autocomplete="new-password" minlength="10" required></label>' +
      '<div class="err" id="s-err"></div><button class="btn pri" type="submit">Save and log in</button>' + (box ? '<button class="btn" type="button" id="s-back">Back</button>' : "") + "</form>" +
      '<div class="dev-sig"><span>© ' + new Date().getFullYear() + ' Ahmed Al Gamal</span><a href="https://wa.me/971507761628?text=' + encodeURIComponent("Hi Ahmed, I’m contacting you from the Dar Alamana dashboard") + '" target="_blank" rel="noopener">+971 50 776 1628</a></div></div>';
    $("#g-renew").onclick = function () { $("#g-login").hidden = true; $("#g-setup").hidden = false; };
    if ($("#s-back")) $("#s-back").onclick = function () { $("#g-login").hidden = false; $("#g-setup").hidden = true; };
    $("#g-login").onsubmit = function (e) {
      e.preventDefault(); var f = this, b = $("button[type=submit]", f); b.disabled = true; $("#g-err").textContent = "";
      unseal(box, $("#g-pass").value).then(function (v) {
        return checkToken(v.token).then(function (why) { if (why) { $("#g-err").textContent = why; b.disabled = false; return; } saveSession(v); route(true); });
      }, function () { $("#g-err").textContent = "Wrong password. Please try again."; b.disabled = false; });
    };
    $("#g-setup").onsubmit = function (e) {
      e.preventDefault(); var t = $("#s-token").value.trim(), p = $("#s-pass").value, b = $("button[type=submit]", this);
      if (p.length < 10) { $("#s-err").textContent = "The password needs at least 10 characters."; return; }
      if (p !== $("#s-pass2").value) { $("#s-err").textContent = "The two passwords don’t match."; return; }
      b.disabled = true; $("#s-err").textContent = "";
      checkToken(t).then(function (why) {
        if (why) throw why;
        var v = { token: t }; S.vault = v;
        return saveAuth(v, p, "Set up admin password").then(function () { saveSession(v); route(true); });
      }).catch(function (why) { $("#s-err").textContent = typeof why === "string" ? why : "This token doesn’t work, or it can’t access the repository."; b.disabled = false; });
    };
  }

  /* ---------- navigation ---------- */
  function failView(e) {
    if (e && e.message === "401") return;
    $("#main").innerHTML = '<div class="card empty">Can’t load your data right now. Check your internet and try again.<br><br><button class="btn" onclick="location.reload()">Try again</button></div>';
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
      confirmBox("Leave without saving?", "You have changes that are not saved. They will be lost if you leave.", "Leave without saving", true).then(function (ok) {
        skip = false; if (ok) { S.dirty = false; location.hash = to; }
      });
      return;
    }
    route(true);
  });
  window.addEventListener("beforeunload", function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

  window.__darMd = { toHtml: mdToHtml, toMd: htmlToMd };   // for tests
  S.vault = loadSession();
  route(true);
})();
