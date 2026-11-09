/* يحمّل أدوات القياس من config.js، ويوفّر window.track(event, data) */
(function () {
  var c = window.SITE_CONFIG || {};
  var d = document;
  function load(src) { var s = d.createElement("script"); s.async = true; s.src = src; d.head.appendChild(s); }

  if (c.GOOGLE_SITE_VERIFICATION) {
    var m = d.createElement("meta"); m.name = "google-site-verification"; m.content = c.GOOGLE_SITE_VERIFICATION; d.head.appendChild(m);
  }
  // Google (GA4 + Ads)
  if (c.GA4_ID || c.GOOGLE_ADS_ID) {
    load("https://www.googletagmanager.com/gtag/js?id=" + (c.GA4_ID || c.GOOGLE_ADS_ID));
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    if (c.GA4_ID) gtag("config", c.GA4_ID);
    if (c.GOOGLE_ADS_ID) gtag("config", c.GOOGLE_ADS_ID);
  }
  // Meta Pixel
  if (c.META_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, d, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", c.META_PIXEL_ID); fbq("track", "PageView");
  }
  // Snapchat Pixel
  if (c.SNAP_PIXEL_ID) {
    (function (e, t, n) { if (e.snaptr) return; var a = e.snaptr = function () { a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments) }; a.queue = []; var s = "script"; var r = t.createElement(s); r.async = !0; r.src = n; var u = t.getElementsByTagName(s)[0]; u.parentNode.insertBefore(r, u); })(window, d, "https://sc-static.net/scevent.min.js");
    snaptr("init", c.SNAP_PIXEL_ID, {}); snaptr("track", "PAGE_VIEW");
  }
  // TikTok Pixel
  if (c.TIKTOK_PIXEL_ID) {
    !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.load = function (e) { var n = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._o = ttq._o || {}; var o = d.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = n + "?sdkid=" + e + "&lib=" + t; var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a) }; ttq.load(c.TIKTOK_PIXEL_ID); ttq.page(); }(window, d, "ttq");
  }

  // حدث موحّد يروح لكل الأدوات
  // whatsapp | call | request_click | lead
  window.track = function (name, data) {
    data = data || {};
    try {
      if (window.gtag) {
        gtag("event", name === "lead" ? "generate_lead" : name, data);
        if (name === "lead" && c.GOOGLE_ADS_ID && c.GOOGLE_ADS_LEAD_LABEL) gtag("event", "conversion", { send_to: c.GOOGLE_ADS_ID + "/" + c.GOOGLE_ADS_LEAD_LABEL });
      }
      if (window.fbq) fbq(name === "lead" ? "track" : "trackCustom", name === "lead" ? "Lead" : (name === "whatsapp" || name === "call" ? "Contact" : name), data);
      if (window.snaptr) snaptr("track", name === "lead" ? "SIGN_UP" : "CUSTOM_EVENT_1", data);
      if (window.ttq) ttq.track(name === "lead" ? "SubmitForm" : "Contact", data);
    } catch (e) {}
  };
})();
