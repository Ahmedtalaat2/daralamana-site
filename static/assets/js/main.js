/* دار الأمانة — main.js */
(function () {
  var d = document, root = d.documentElement;

  // ---- حجم الخط (A+ / A-) ويتذكره ----
  var levels = ["fs--1", "", "fs-1", "fs-2"], cur = 1;
  try { var saved = localStorage.getItem("fs"); if (saved !== null) cur = +saved; } catch (e) {}
  function applyFs() { levels.forEach(function (c) { if (c) root.classList.remove(c); }); if (levels[cur]) root.classList.add(levels[cur]); }
  applyFs();
  d.querySelectorAll("[data-font]").forEach(function (b) {
    b.addEventListener("click", function () {
      cur = Math.max(0, Math.min(levels.length - 1, cur + (+b.dataset.font)));
      applyFs(); try { localStorage.setItem("fs", cur); } catch (e) {}
    });
  });

  // ---- القائمة في الموبايل ----
  var burger = d.querySelector(".burger"), nav = d.getElementById("nav");
  if (burger) burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open); nav.classList.toggle("open", open);
  });

  // ---- حفظ اختيار اللغة ----
  d.querySelectorAll(".lang").forEach(function (a) {
    a.addEventListener("click", function () { try { localStorage.setItem("lang", a.getAttribute("hreflang")); } catch (e) {} });
  });

  // ---- ظهور العناصر مع السكرول ----
  var els = d.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + "ms"; io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });

  // ---- تتبع النقرات ----
  d.addEventListener("click", function (ev) {
    var a = ev.target.closest("[data-track]");
    if (a && window.track) window.track(a.dataset.track, { page: location.pathname });
  });

  // ---- فورم الطلب (٣ خطوات ← واتساب) ----
  var f = d.getElementById("wizard");
  if (!f) return;
  var steps = f.querySelectorAll(".wz-step"), step = 0;
  var next = f.querySelector(".wz-next"), back = f.querySelector(".wz-back"), send = f.querySelector(".wz-send");
  var bar = f.querySelector(".wz-bar i"), num = f.querySelector(".wz-n");
  var labels = JSON.parse(f.dataset.labels);

  // لو جاي من صفحة خدمة، نختارها تلقائياً
  var pre = new URLSearchParams(location.search).get("service");
  if (pre) { var r = f.querySelector('input[name=service][value="' + pre + '"]'); if (r) r.checked = true; }

  function show(i) {
    steps.forEach(function (s, k) { s.hidden = k !== i; s.classList.toggle("is-on", k === i); });
    step = i; num.textContent = i + 1; bar.style.width = ((i + 1) / steps.length * 100) + "%";
    back.hidden = i === 0; next.hidden = i === steps.length - 1; send.hidden = i !== steps.length - 1;
    var first = steps[i].querySelector("legend"); if (first) { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
    f.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function valid(i) {
    var s = steps[i], ok = true, names = {};
    s.querySelectorAll("[required]").forEach(function (el) {
      if (el.type === "radio") { names[el.name] = names[el.name] || !!s.querySelector('input[name="' + el.name + '"]:checked'); }
      else if (el.type === "checkbox") { if (!el.checked) ok = false; }
      else if (!el.value.trim()) ok = false;
    });
    for (var n in names) if (!names[n]) ok = false;
    var err = s.querySelector(".err"); err.hidden = ok; err.textContent = ok ? "" : f.dataset.required;
    return ok;
  }
  // اختيار الخدمة ينقلك للخطوة اللي بعدها تلقائياً (أسهل لكبار السن)
  steps[0].addEventListener("change", function () { setTimeout(function () { if (valid(0)) show(1); }, 250); });
  next.addEventListener("click", function () { if (valid(step)) show(step + 1); });
  back.addEventListener("click", function () { show(step - 1); });

  function val(name) {
    var el = f.querySelector('[name="' + name + '"]:checked') || f.querySelector('[name="' + name + '"]');
    if (!el) return "";
    return (el.dataset && el.dataset.label) || el.value.trim();
  }
  var started = false;
  f.addEventListener("change", function () { if (!started && window.track) { started = true; window.track("form_start", { page: location.pathname }); } });
  f.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!valid(step)) return;
    var lines = [f.dataset.intro, ""];
    ["service", "who", "area", "lang", "when", "name", "phone", "notes"].forEach(function (k) {
      var v = val(k); if (v) lines.push("• " + labels[k] + ": " + v);
    });
    var url = "https://wa.me/" + f.dataset.wa + "?text=" + encodeURIComponent(lines.join("\n"));
    var hook = (window.SITE_CONFIG || {}).N8N_LEAD_WEBHOOK;
    var data = { source: "website", lang_site: document.documentElement.lang, page: location.pathname, sent_at: new Date().toISOString() };
    ["service", "who", "area", "lang", "when", "name", "phone", "notes"].forEach(function (k) { data[k] = val(k); });
    var btn = f.querySelector(".wz-send"), label = btn.textContent;
    btn.disabled = true; btn.textContent = btn.dataset.sending || "...";
    function finish(ok) {
      btn.disabled = false; btn.textContent = label;
      if (ok) {
        steps.forEach(function (s) { s.hidden = true; });
        f.querySelector(".wz-nav").hidden = true; f.querySelector(".wz-top").hidden = true;
        f.querySelector(".wz-fail").hidden = true;
        f.querySelector(".wz-done").hidden = false;
        if (window.track) window.track("lead", { service: data.service, channel: "form" });
      } else {
        var fail = f.querySelector(".wz-fail"); fail.hidden = false;
        fail.querySelector(".wz-open").href = url;
        fail.scrollIntoView({ behavior: "smooth", block: "center" }); return;
      }
      f.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // يرسل الطلب لـ n8n (بدون أي مفاتيح سرية في الموقع)، ويأكد للعميل بس لما السيرفر يرد بنجاح
    if (!hook || !window.fetch) { finish(false); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(timer); finish(r.ok); })
      .catch(function () { clearTimeout(timer); finish(false); });
  });
})();
