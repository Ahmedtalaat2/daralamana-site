/* =========================================================
   دار الأمانة — الإعدادات
   حط الأكواد والروابط هنا بس. أي خانة فاضية = الميزة ما تشتغل.
   ========================================================= */
window.SITE_CONFIG = {
  // n8n
  N8N_CHAT_WEBHOOK: "",  // رابط Webhook للمساعد الذكي  (POST {message, sessionId, lang} ← يرجع {reply})
  N8N_LEAD_WEBHOOK: "",  // رابط Webhook للطلبات والتوظيف (POST بيانات الفورم)
  // المدونة: لو حطيت رابط Blogger، آخر ٣ مقالات تظهر في الرئيسية تلقائياً
  BLOGGER_URL: "",       // مثال: "https://daralamana.blogspot.com"
  // أدوات القياس
  GA4_ID: "",            // Google Analytics 4   مثال: "G-XXXXXXXXXX"
  GOOGLE_ADS_ID: "",     // Google Ads           مثال: "AW-XXXXXXXXX"
  GOOGLE_ADS_LEAD_LABEL: "",
  META_PIXEL_ID: "",
  SNAP_PIXEL_ID: "",
  TIKTOK_PIXEL_ID: "",
  GOOGLE_SITE_VERIFICATION: ""
};
