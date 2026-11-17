# موقع دار الأمانة للرعاية والخدمات الصحية

موقع ثابت سريع بلغتين (العربي في الجذر، والإنجليزي في `/en/`)، فيه مدونة ولوحة تحكم لكتابة المقالات.

## إزاي بيشتغل
1. تدخل على `https://الدومين/admin` بكلمة المرور.
2. من زرار **إضافة مقال** تكتب المقال وتختار الصورة وتدوس **نشر**، فيتحفظ في الريبو ده كملف جوه `content/blog/` (والصور في `static/assets/img/blog/`).
3. Coolify بيلاحظ التحديث، فيبني الموقع من جديد وينشره خلال دقيقة تقريباً.

## الملفات المهمة
| الملف | فيه إيه |
|---|---|
| `content.py` | كل نصوص الموقع والخدمات والأسئلة، والبيانات الحقيقية في `CONFIG` (الواتساب والهاتف والإيميل والحسابات) |
| `content/blog/ar` و `content/blog/en` | المقالات (لوحة التحكم بتكتب فيهم لوحدها) |
| `static/assets/js/config.js` | أكواد Google Analytics وGoogle Ads والبكسلات، و`UMAMI_WEBSITE_ID` لعداد الزوار |
| `static/admin/` | لوحة التحكم (`admin.js` و`admin.css`)، و`auth.json` = التوكن متشفّر بكلمة المرور |
| `build.py` | بيبني الموقع كله في مجلد `dist/` |

## الربط مع Coolify (مرة واحدة)
1. في Coolify: **New Resource ← Public/Private Repository (GitHub App)** واختار الريبو ده والفرع `main`.
2. Build Pack: **Dockerfile** (الملف موجود في الريبو).
3. Port: `80`.
4. Environment Variables: ضيف `SITE_URL` = رابط الموقع الكامل، مثال `https://daralamana.qa`، وفعّل عليه "Build Variable".
5. حط الدومين في خانة Domains، وفعّل **Auto Deploy**.

## الدخول على لوحة التحكم
- الدخول بكلمة مرور. أول مرة بتحط توكن GitHub (Fine-grained token) على الريبو ده بس، بصلاحية `Contents: Read and write` (و`Actions: Read` لو عايز تشوف حالة تحديث الموقع)، وتختار كلمة مرور.
- اعمل التوكن من: GitHub ← Settings ← Developer settings ← Personal access tokens ← Fine-grained tokens.
- اللوحة فيها: داش بورد (الزوار، المقالات، حالة الموقع)، وإضافة وتعديل وحذف المقالات، وتغيير كلمة المرور.
- عداد الزوار: من القائمة ← **اربط عداد الزوار** (Umami مجاني). مفتاح الـ API بيتحفظ متشفّر مع التوكن.

## تشغيل محلي (اختياري)
```
python3 build.py dist
python3 -m http.server -d dist 8000
```
