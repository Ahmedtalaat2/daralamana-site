# -*- coding: utf-8 -*-
"""يبني موقع دار الأمانة كملفات HTML ثابتة (عربي في الجذر، إنجليزي في /en/)."""
import json, os, re, shutil, sys, glob, datetime
from html import escape as e
from content import CONFIG as C, SERVICES, FAQ, T, PRIVACY

SRC = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SRC, "dist")
# رابط الموقع: من متغير SITE_URL في Coolify، أو من content.py
C["base_url"] = (os.environ.get("SITE_URL") or C["base_url"]).rstrip("/")

# ---------- blog ----------
def md(text):
    """Markdown بسيط: عناوين، فقرات، قوائم، اقتباس، عريض، مائل، روابط، صور."""
    def inline(t):
        t = e(t, quote=False)
        t = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)\)', r'<img src="\2" alt="\1" loading="lazy">', t)
        t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{m.group(2)}"' + ('' if m.group(2).startswith(('/', '#', '.')) else ' target="_blank" rel="noopener"') + f'>{m.group(1)}</a>', t)
        t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
        t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)
        return t
    out, para, lst = [], [], None
    def flush():
        nonlocal para, lst
        if para: out.append("<p>" + "<br>".join(inline(x) for x in para) + "</p>"); para = []
        if lst: out.append(f"<{lst[0]}>" + "".join(f"<li>{inline(x)}</li>" for x in lst[1]) + f"</{lst[0]}>"); lst = None
    for raw in (text or "").replace("\r", "").split("\n"):
        line = raw.strip()
        m = re.match(r'^(#{1,4})\s+(.*)', line)
        if not line: flush(); continue
        if m: flush(); h = max(2, len(m.group(1))); out.append(f"<h{h}>{inline(m.group(2))}</h{h}>"); continue
        if line.startswith("> "): flush(); out.append(f"<blockquote>{inline(line[2:])}</blockquote>"); continue
        mu = re.match(r'^[-*]\s+(.*)', line); mo = re.match(r'^\d+[.)]\s+(.*)', line)
        if mu or mo:
            kind = "ul" if mu else "ol"
            if para: flush()
            if lst and lst[0] != kind: flush()
            lst = lst or (kind, []); lst[1].append((mu or mo).group(1)); continue
        if lst: flush()
        para.append(line)
    flush()
    return "\n".join(out)

def load_posts():
    posts = {"ar": {}, "en": {}}
    for L in posts:
        for f in glob.glob(os.path.join(SRC, "content", "blog", L, "*.json")):
            try:
                d = json.load(open(f, encoding="utf-8"))
            except Exception as ex:
                print("skip", f, ex); continue
            if d.get("draft"): continue
            slug = re.sub(r'[^a-z0-9-]', '', (d.get("slug") or os.path.basename(f)[:-5]).lower())
            if not slug or not d.get("title"): continue
            d["slug"] = slug; d["date"] = str(d.get("date") or datetime.date.today().isoformat())[:10]
            posts[L][slug] = d
    return {L: dict(sorted(p.items(), key=lambda kv: kv[1]["date"], reverse=True)) for L, p in posts.items()}

POSTS = load_posts()
AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]

def fmt_date(L, iso):
    try: d = datetime.date.fromisoformat(iso)
    except ValueError: return iso
    return f"{d.day} {AR_MONTHS[d.month-1]} {d.year}" if L == "ar" else d.strftime("%B %-d, %Y")

def has_lang(x, key):
    """هل الصفحة دي موجودة باللغة x؟ (المقالات ممكن تكون بلغة واحدة)"""
    return not key.startswith("blog/") or key[5:] in POSTS[x]

PAGE_OG = {}
import hashlib
def ver(path):
    try: return hashlib.md5(open(os.path.join(SRC, "static", path), "rb").read()).hexdigest()[:8]
    except OSError: return "1"


ICONS = {
 "hospital": '<path d="M12 6v4M14 14h-4M14 18h-4M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>',
 "pregnant": '<circle cx="11" cy="4" r="2"/><path d="M9 21v-5l-1-1V10a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v1a4 4 0 0 1 0 7v3"/>',
 "toddler": '<circle cx="12" cy="5" r="3"/><path d="M9 21v-6l-3-3 2-3h8l2 3-3 3v6M12 15v6"/>',
 "baby": '<path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
 "font-plus": '<path d="M3 19 8.5 5 14 19M5.2 14h6.6M18.5 8v7M15 11.5h7"/>',
 "font-minus": '<path d="M3 19 8.5 5 14 19M5.2 14h6.6M15 11.5h7"/>',
 "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 "bandage": '<path d="M10 10.01h.01M10 14.01h.01M14 10.01h.01M14 14.01h.01M18 6v12M6 6v12"/><rect x="2" y="6" width="20" height="12" rx="2"/>',
 "syringe": '<path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"/>',
 "pulse": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
 "heart-hand": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66M18 15l-2-2M15 18l-2-2"/>',
 "clipboard": '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 14h6M12 17v-6"/>',
 "bed": '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
 "user-check": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
 "message": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7M17 12H7"/>',
 "languages": '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
 "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
 "check": '<path d="M20 6 9 17l-5-5"/>',
 "chev": '<path d="m9 18 6-6-6-6"/>',
 "plus": '<path d="M12 5v14M5 12h14"/>',
 "pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
 "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
 "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',
 "x": '<path d="M18 6 6 18M6 6l12 12"/>',
 "globe": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
 "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 "book": '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
}
WA = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z"/></svg>'
SOCIAL = {
 "instagram": '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
 "tiktok": '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48"/></svg>',
 "facebook": '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.33-.04-1.56-.14-2.86-.14C11.93 2 10 3.66 10 6.7v2.8H7v4h3V22h4z"/></svg>',
 "snapchat": '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c3 0 5 2.2 5 5.2v2.3c.5.2 1.2-.2 1.6 0 .6.3.4 1-.2 1.3-.6.3-1.6.5-1.5 1.2.4 1.6 1.8 3.2 3.4 3.7.5.2.4.8-.1 1-.8.3-1.7.3-2 .7-.2.4-.1 1-.6 1.1-.6.1-1.4-.3-2.3 0-1 .3-1.8 1.5-3.3 1.5s-2.3-1.2-3.3-1.5c-.9-.3-1.7.1-2.3 0-.5-.1-.4-.7-.6-1.1-.3-.4-1.2-.4-2-.7-.5-.2-.6-.8-.1-1 1.6-.5 3-2.1 3.4-3.7.1-.7-.9-.9-1.5-1.2-.6-.3-.8-1-.2-1.3.4-.2 1.1.2 1.6 0V7.2C7 4.2 9 2 12 2z"/></svg>',
}

def ic(name, cls="ic"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'

def svc_name(s, L): return s[L]["name"]

# ---------- paths ----------
def page_path(L, key):
    base = "" if L == "ar" else "en/"
    return base + ("index.html" if key == "index" else f"{key}.html")

def url_of(L, key):
    p = page_path(L, key)
    if p.endswith("index.html"): p = p[:-10]
    return f'{C["base_url"]}/{p}'

def rel(from_path, to_path):
    depth = from_path.count("/")
    r = "../" * depth + to_path
    if r.endswith("index.html"): r = r[:-10] or "./"
    if r == "": r = "./"
    return r

# ---------- layout ----------
def head(L, key, title, desc, schema):
    t = T[L]; me = page_path(L, key); root = rel(me, "")
    other = T[L]["other"]
    langs = [x for x in ("ar", "en") if has_lang(x, key)]
    alt = ""
    if len(langs) == 2:
        alt = "".join(f'<link rel="alternate" hreflang="{x}" href="{url_of(x, key)}">' for x in langs)
        alt += f'<link rel="alternate" hreflang="x-default" href="{url_of("ar", key)}">'
    og_img = PAGE_OG.get("image") or f'{C["base_url"]}/assets/img/og-{L}.jpg'
    og_type = PAGE_OG.get("type", "website")
    sch = "".join(f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>' for s in schema)
    return f'''<!doctype html>
<html lang="{L}" dir="{t["dir"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url_of(L, key)}">
{alt}
<meta name="theme-color" content="#24173F">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{e(t["brand_full"])}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url_of(L, key)}">
<meta property="og:image" content="{og_img}">
<meta property="og:locale" content="{"ar_QA" if L=="ar" else "en_US"}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="{root}assets/img/favicon.png">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/css/style.css?v={ver("assets/css/style.css")}">
{sch}
<script>document.documentElement.classList.add("js")</script>
<script src="{root}assets/js/config.js?v={ver("assets/js/config.js")}"></script>
<script src="{root}assets/js/tracking.js?v={ver("assets/js/tracking.js")}"></script>
</head>'''

def header(L, key):
    t = T[L]; me = page_path(L, key); other = t["other"]
    links = ""
    for k, label in t["nav"]:
        cur = ' aria-current="page"' if (k == key or (k in ("services", "blog") and key.startswith(k + "/"))) else ""
        links += f'<li><a href="{rel(me, page_path(L, k))}"{cur}>{label}</a></li>'
    logo = "logo-h.png"
    return f'''<body data-lang="{L}">
<a class="skip" href="#main">{t["skip"]}</a>
<header class="site-header">
 <div class="wrap hdr">
  <a class="logo" href="{rel(me, page_path(L, "index"))}" aria-label="{e(t["brand_full"])}"><picture><source media="(max-width:640px)" srcset="{rel(me, "assets/img/logo-icon.png")}"><img src="{rel(me, "assets/img/" + logo)}" alt="{e(t["brand_full"])}" width="212" height="78"></picture></a>
  <nav class="nav" id="nav" aria-label="{t["menu"]}"><ul>{links}</ul>
   <a class="btn btn-teal nav-cta" href="{rel(me, page_path(L, "request"))}">{t["cta_request"]}</a>
  </nav>
  <div class="tools">
   <div class="fontsize" dir="ltr" role="group" aria-label="{t["font_bigger"]}">
    <button type="button" class="tbtn" data-font="-1" aria-label="{t["font_smaller"]}" title="{t["font_smaller"]}">{ic("font-minus")}</button>
    <button type="button" class="tbtn" data-font="1" aria-label="{t["font_bigger"]}" title="{t["font_bigger"]}">{ic("font-plus")}</button>
   </div>
   <a class="tbtn lang" href="{rel(me, page_path(other, key if has_lang(other, key) else "blog"))}" hreflang="{other}" lang="{other}">{ic("globe")}<span class="lbl">{t["other_label"]}</span></a>
   <button type="button" class="tbtn burger" aria-controls="nav" aria-expanded="false" aria-label="{t["menu"]}">{ic("menu", "ic i-open")}{ic("x", "ic i-close")}</button>
  </div>
 </div>
</header>
<main id="main">'''

def wa_link(L, msg=None):
    from urllib.parse import quote
    return f'https://wa.me/{C["whatsapp"]}?text={quote(msg or T[L]["f_wa_msg"])}'

def footer(L, key):
    t = T[L]; me = page_path(L, key)
    svc = "".join(f'<li><a href="{rel(me, page_path(L, "services/" + s["slug"]))}">{svc_name(s, L)}</a></li>' for s in SERVICES)
    links = "".join(f'<li><a href="{rel(me, page_path(L, k))}">{lab}</a></li>' for k, lab in t["nav"] if k != "index")
    links += f'<li><a href="{rel(me, page_path(L, "privacy"))}">{t["privacy"]}</a></li>'
    soc = "".join(f'<a href="{C[n]}" target="_blank" rel="noopener" aria-label="{n}">{SOCIAL[n]}</a>' for n in ("instagram", "tiktok", "snapchat", "facebook"))
    year = datetime.date.today().year
    return f'''</main>
<footer class="site-footer">
 <div class="wrap fgrid">
  <div class="fcol">
   <img src="{rel(me, "assets/img/logo-h-light.png")}" alt="{e(t["brand_full"])}" width="212" height="78" loading="lazy">
   <p>{t["footer_about"]}</p>
   <div class="social">{soc}</div>
  </div>
  <div class="fcol"><h2>{t["footer_services"]}</h2><ul>{svc}</ul></div>
  <div class="fcol"><h2>{t["footer_links"]}</h2><ul>{links}</ul></div>
  <div class="fcol"><h2>{t["footer_contact"]}</h2>
   <ul class="clist">
    <li><a href="{wa_link(L)}" data-track="whatsapp" target="_blank" rel="noopener">{WA}<span dir="ltr">{C["whatsapp_display"]}</span></a></li>
    <li><a href="tel:{C["phone"]}" data-track="call">{ic("phone")}<span dir="ltr">{C["phone_display"]}</span></a></li>
    <li><a href="mailto:{C["email"]}">{ic("mail")}<span>{C["email"]}</span></a></li>
    <li>{ic("pin")}<span>{C["city_" + L]}</span></li>
   </ul>
  </div>
 </div>
 <div class="wrap fbottom"><div class="sig"><span>© {year} <bdi>أحمد الجمل</bdi> | <bdi dir="ltr">Ahmed Al Gamal</bdi><span class="rt"> · {t["rights"]}</span></span><a class="dev-wa" href="https://wa.me/971507761628" target="_blank" rel="noopener" aria-label="WhatsApp Ahmed Al Gamal">{WA}<span dir="ltr">+971 50 776 1628</span></a></div></div>
</footer>
<div class="dock" role="group" aria-label="{t["footer_contact"]}">
 <a class="dock-wa" href="{wa_link(L)}" target="_blank" rel="noopener" data-track="whatsapp" aria-label="{t["cta_whatsapp"]}" title="{t["cta_whatsapp"]}">{WA}</a>
 <a class="dock-call" href="tel:{C["phone"]}" data-track="call" aria-label="{t["cta_call"]}" title="{t["cta_call"]}">{ic("phone")}</a>
</div>
<script src="{rel(me, "assets/js/main.js")}?v={ver("assets/js/main.js")}" defer></script>
</body>
</html>'''

def page(L, key, title, desc, body, schema=()):
    org = org_schema(L)
    crumbs = breadcrumb_schema(L, key, title)
    s = [org] + ([crumbs] if crumbs else []) + list(schema)
    return head(L, key, title, desc, s) + header(L, key) + body + footer(L, key)

# ---------- schema ----------
def org_schema(L):
    t = T[L]
    return {"@context": "https://schema.org", "@type": "MedicalBusiness", "@id": C["base_url"] + "/#org",
            "name": t["brand_full"], "alternateName": [T["ar"]["brand"], T["en"]["brand"]],
            "url": url_of(L, "index"), "logo": C["base_url"] + "/assets/img/logo-full.png",
            "image": C["base_url"] + f"/assets/img/og-{L}.jpg", "telephone": C["phone"], "email": C["email"],
            "address": {"@type": "PostalAddress", "addressLocality": "Doha", "addressCountry": "QA"},
            "areaServed": {"@type": "Country", "name": "Qatar"}, "availableLanguage": ["Arabic", "English"],
            "sameAs": [C["instagram"], C["tiktok"], C["facebook"], C["snapchat"]],
            "makesOffer": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": s[L]["name"], "url": url_of(L, "services/" + s["slug"])}} for s in SERVICES]}

def breadcrumb_schema(L, key, title):
    if key == "index": return None
    items = [(T[L]["nav"][0][1], url_of(L, "index"))]
    if key.startswith("services/"): items.append((dict(T[L]["nav"])["services"], url_of(L, "services")))
    if key.startswith("blog/"): items.append((dict(T[L]["nav"])["blog"], url_of(L, "blog")))
    items.append((title.split(" | ")[0], url_of(L, key)))
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}

def faq_schema(L):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ[L]]}

# ---------- blocks ----------
def cta_buttons(L, me, light=False):
    t = T[L]
    return f'''<div class="ctas">
 <a class="btn btn-teal btn-lg" href="{rel(me, page_path(L, "request"))}" data-track="request_click">{t["cta_request"]}</a>
 <a class="btn {"btn-wa" if not light else "btn-wa"} btn-lg" href="{wa_link(L)}" target="_blank" rel="noopener" data-track="whatsapp">{WA}{t["cta_whatsapp"]}</a>
</div>'''

def page_hero(L, me, title, text, crumb=None):
    t = T[L]
    bc = f'<nav class="crumbs" aria-label="breadcrumb"><a href="{rel(me, page_path(L, "index"))}">{t["nav"][0][1]}</a>'
    if crumb: bc += f'<span>/</span><a href="{rel(me, page_path(L, crumb[0]))}">{crumb[1]}</a>'
    bc += f'<span>/</span><span aria-current="page">{title}</span></nav>'
    return f'<section class="phero grid-bg"><div class="wrap">{bc}<h1>{title}</h1><p>{text}</p></div></section>'

def services_grid(L, me, exclude=None):
    t = T[L]; out = ""
    for s in SERVICES:
        if s["slug"] == exclude: continue
        href = rel(me, page_path(L, "services/" + s["slug"]))
        out += f'''<a class="scard reveal" href="{href}">
 <span class="sicon">{ic(s["icon"])}</span>
 <h3>{s[L]["name"]}</h3><p>{s[L]["short"]}</p>
 <span class="more">{t["more"]}{ic("chev", "ic chev")}</span></a>'''
    return f'<div class="sgrid">{out}</div>'

def faq_list(L, n=None):
    items = FAQ[L][:n] if n else FAQ[L]
    return '<div class="faq">' + "".join(
        f'<details class="reveal"><summary><span>{e(q)}</span>{ic("plus", "ic pm")}</summary><p>{e(a)}</p></details>' for q, a in items) + "</div>"

def band(L, me):
    t = T[L]
    return f'''<section class="band grid-bg"><img class="band-bg" src="{rel(me, "assets/img/vitals.webp")}" alt="" loading="lazy" aria-hidden="true"><div class="wrap band-in reveal">
 <div><h2>{t["band_title"]}</h2><p>{t["band_text"]}</p></div>{cta_buttons(L, me)}</div></section>'''

# ---------- pages ----------
def p_home(L):
    t = T[L]; me = page_path(L, "index")
    pts = "".join(f'<li><span class="ti">{ic(i)}</span><span>{p}</span></li>' for i, p in zip(("user-check", "clipboard", "phone"), t["hero_points"]))
    pillars = "".join(f'<div class="pillar reveal"><span class="picon">{ic(i)}</span><h3>{h}</h3><p>{p}</p></div>' for i, h, p in t["pillars"])
    steps = "".join(f'<li class="reveal"><span class="num">{n}</span><h3>{h}</h3><p>{p}</p></li>' for n, (h, p) in zip(("١٢٣٤" if L == "ar" else "1234"), t["steps"]))
    qs = "".join(f'<li>{ic("check")}<span>{q}</span></li>' for q in t["q_list"])
    body = f'''
<section class="hero hx">
 <img class="hx-bg" src="{rel(me, "assets/img/vitals.webp")}" alt="" width="700" height="601" aria-hidden="true">
 <div class="wrap hx-in">
  <div class="hx-txt">
   <h1>{t["hero_title"]}</h1>
   <p class="lead">{t["hero_text"]}</p>
   <div class="ctas hx-ctas">
    <a class="btn btn-light btn-lg" href="{rel(me, page_path(L, "request"))}" data-track="request_click">{t["cta_request"]}{ic("chev", "ic chev")}</a>
    <a class="btn btn-wa btn-lg" href="{wa_link(L)}" target="_blank" rel="noopener" data-track="whatsapp">{WA}{t["cta_whatsapp"]}</a>
   </div>
   <ul class="hx-trust">{pts}</ul>
  </div>
  <div class="hx-media">
   <div class="hx-frame">
    <img src="{rel(me, "assets/img/hero.webp")}" alt="" width="720" height="900" fetchpriority="high"><img src="{rel(me, "assets/img/vitals.webp")}" alt="" width="700" height="601" loading="lazy">
   </div>
   <div class="hx-float hx-f1"><span class="fi">{ic("message")}</span><span><b>{t["float1_t"]}</b><small>{t["float1_s"]}</small></span></div>
   <div class="hx-float hx-f2"><span class="fi">{ic("user-check")}</span><span><b>{t["float2_t"]}</b><small>{t["float2_s"]}</small></span></div>
  </div>
 </div>
</section>
<section class="sec"><div class="wrap">
 <header class="shead reveal"><p class="kicker">{t["pillars_kicker"]}</p><h2>{t["pillars_title"]}</h2></header>
 <div class="pillars">{pillars}</div>
</div></section>
<section class="sec sec-soft"><div class="wrap">
 <header class="shead reveal"><p class="kicker">{t["services_kicker"]}</p><h2>{t["services_title"]}</h2><p>{t["services_text"]}</p></header>
 {services_grid(L, me)}
</div></section>
<section class="sec"><div class="wrap qbox reveal">
 <div class="qimg"><img src="{rel(me, "assets/img/family.webp")}" alt="" width="520" height="650" loading="lazy"></div>
 <div class="qtxt"><p class="kicker">{t["q_kicker"]}</p><h2>{t["q_title"]}</h2><ul class="qlist">{qs}</ul><p class="qans">{t["q_answer"]}</p>
 <a class="btn btn-purple btn-lg" href="{rel(me, page_path(L, "about"))}">{dict(t["nav"])["about"]}</a></div>
</div></section>
<section class="sec sec-soft"><div class="wrap">
 <header class="shead reveal"><p class="kicker">{t["steps_kicker"]}</p><h2>{t["steps_title"]}</h2></header>
 <ol class="steps">{steps}</ol>
</div></section>
<section class="sec sec-soft" id="request"><div class="wrap narrow">
 <header class="shead reveal"><p class="kicker">{t["request_kicker"]}</p><h2>{t["request_title"]}</h2><p>{t["request_text"]}</p></header>
 {wizard(L)}
</div></section>
{latest_posts(L, me)}
<section class="sec"><div class="wrap narrow">
 <header class="shead reveal"><h2>{t["faq_title"]}</h2></header>
 {faq_list(L, 4)}
 <p class="center"><a class="btn btn-ghost" href="{rel(me, page_path(L, "faq"))}">{t["faq_more"]}</a></p>
</div></section>
{band(L, me)}
<section class="sec" id="contact"><div class="wrap contact">
 <header class="shead reveal"><h2>{t["contact_title"]}</h2><p>{t["contact_text"]}</p></header>
 {contact_block(L, me)}
</div></section>'''
    return page(L, "index", t["home_title"], t["home_desc"], body, [faq_schema(L)])

def p_services(L):
    t = T[L]; me = page_path(L, "services")
    body = page_hero(L, me, t["services_page_title"], t["services_page_text"]) + \
        f'<section class="sec"><div class="wrap">{services_grid(L, me)}<p class="note">{ic("shield")}{t["svc_note"]}</p></div></section>' + band(L, me)
    title = f'{t["services_page_title"]} | {t["brand"]}'
    return page(L, "services", title, t["services_page_text"], body)

def p_service(L, s):
    t = T[L]; key = "services/" + s["slug"]; me = page_path(L, key); d = s[L]
    inc = "".join(f'<li>{ic("check")}{x}</li>' for x in d["items"])
    fr = "".join(f'<li>{ic("check")}{x}</li>' for x in d["for"])
    from urllib.parse import quote
    msg = (t["f_wa_msg"] + " - " + d["name"])
    body = page_hero(L, me, d["name"], d["intro"], ("services", dict(t["nav"])["services"])) + f'''
<section class="sec"><div class="wrap svc">
 <div class="svc-main">
  <div class="card reveal"><h2>{ic(s["icon"], "ic h-ic")}{t["svc_includes"]}</h2><ul class="ticks">{inc}</ul></div>
  <div class="card reveal"><h2>{ic("user-check", "ic h-ic")}{t["svc_for"]}</h2><ul class="ticks">{fr}</ul></div>
  <p class="note">{ic("shield")}{t["svc_note"]}</p>
 </div>
 <aside class="svc-side reveal">
  <div class="side-card grid-bg"><h2>{t["svc_cta_title"]}</h2><p>{t["svc_cta_text"]}</p>
   <a class="btn btn-teal btn-lg btn-block" href="{rel(me, page_path(L, "request"))}?service={s["slug"]}" data-track="request_click">{t["cta_request"]}</a>
   <a class="btn btn-wa btn-lg btn-block" href="https://wa.me/{C["whatsapp"]}?text={quote(msg)}" target="_blank" rel="noopener" data-track="whatsapp">{WA}{t["cta_whatsapp"]}</a>
   <a class="btn btn-ghost-light btn-lg btn-block" href="tel:{C["phone"]}" data-track="call">{ic("phone")}{t["cta_call"]}</a>
  </div>
 </aside>
</div></section>
<section class="sec sec-soft"><div class="wrap"><header class="shead reveal"><h2>{t["other_services"]}</h2></header>{services_grid(L, me, s["slug"])}</div></section>'''
    title = f'{d["name"]} في البيت | {t["brand"]} قطر' if L == "ar" else f'{d["name"]} at Home in Qatar | {t["brand"]}'
    svc_schema = {"@context": "https://schema.org", "@type": "Service", "name": d["name"], "description": d["intro"],
                  "provider": {"@id": C["base_url"] + "/#org"}, "areaServed": {"@type": "Country", "name": "Qatar"},
                  "serviceType": "Home nursing", "url": url_of(L, key)}
    return page(L, key, title, d["short"] + " " + t["home_desc"].split(":")[0], body, [svc_schema])

def p_about(L):
    t = T[L]; me = page_path(L, "about")
    pillars = "".join(f'<div class="pillar reveal"><span class="picon">{ic(i)}</span><h3>{h}</h3><p>{p}</p></div>' for i, h, p in t["pillars"])
    steps = "".join(f'<li class="reveal"><span class="num">{n}</span><h3>{h}</h3><p>{p}</p></li>' for n, (h, p) in zip(("١٢٣٤" if L == "ar" else "1234"), t["steps"]))
    np = "".join(f'<li>{ic("check")}{x}</li>' for x in t["nurses_points"])
    body = page_hero(L, me, t["about_title"], t["about_text"]) + f'''
<section class="sec"><div class="wrap split reveal">
 <div><h2>{t["about_story_title"]}</h2><p class="lead-dark">{t["about_story"]}</p></div>
 <div class="pillars pillars-col">{pillars}</div>
</div></section>
<section class="sec sec-soft"><div class="wrap qbox reveal" id="nurses">
 <div class="qimg"><img src="{rel(me, "assets/img/hero.webp")}" alt="" width="720" height="900" loading="lazy"></div>
 <div class="qtxt"><h2>{t["nurses_title"]}</h2><p class="lead-dark">{t["nurses_text"]}</p><ul class="ticks">{np}</ul></div>
</div></section>
<section class="sec"><div class="wrap"><header class="shead reveal"><h2>{t["steps_title"]}</h2></header><ol class="steps">{steps}</ol></div></section>
{band(L, me)}'''
    return page(L, "about", f'{t["about_title"]} | {t["brand"]}', t["about_story"], body)

def wizard(L):
    t = T[L]
    svc_opts = "".join(f'<label class="opt"><input type="radio" name="service" value="{s["slug"]}" data-label="{e(s[L]["name"])}" required><span>{ic(s["icon"])}{s[L]["name"]}</span></label>' for s in SERVICES)
    svc_opts += f'<label class="opt"><input type="radio" name="service" value="other" data-label="{e(t["f_other"])}"><span>{ic("message")}{t["f_other"]}</span></label>'
    def chips(name, opts):
        return "".join(f'<label class="chip"><input type="radio" name="{name}" value="{e(o)}" data-label="{e(o)}" required><span>{o}</span></label>' for o in opts)
    labels = json.dumps(t["f_labels"], ensure_ascii=False)
    return f'''<form class="wizard card" id="wizard" novalidate data-wa="{C["whatsapp"]}" data-intro="{e(t["f_wa_msg"])}" data-labels='{e(labels)}' data-required="{e(t["f_required"])}">
 <div class="wz-top"><p class="wz-count" aria-live="polite"><span>{t["f_step"]}</span> <b class="wz-n">1</b> <span>{t["f_of"]}</span> 3</p><div class="wz-bar"><i></i></div></div>
 <fieldset class="wz-step is-on" data-step="1"><legend>{t["f_q1"]}</legend><div class="opts">{svc_opts}</div><p class="err" hidden></p></fieldset>
 <fieldset class="wz-step" data-step="2" hidden><legend>{t["f_q2"]}</legend>
  <p class="flabel">{t["f_who"]}</p><div class="chips">{chips("who", t["f_who_opts"])}</div>
  <label class="field"><span class="flabel">{t["f_area"]}</span><input type="text" name="area" required placeholder="{e(t["f_area_ph"])}" autocomplete="address-level2"></label>
  <p class="flabel">{t["f_lang"]}</p><div class="chips">{chips("lang", t["f_lang_opts"])}</div>
  <p class="flabel">{t["f_when"]}</p><div class="chips">{chips("when", t["f_when_opts"])}</div>
  <p class="err" hidden></p></fieldset>
 <fieldset class="wz-step" data-step="3" hidden><legend>{t["f_q3"]}</legend>
  <label class="field"><span class="flabel">{t["f_name"]}</span><input type="text" name="name" required autocomplete="name"></label>
  <label class="field"><span class="flabel">{t["f_phone"]}</span><input type="tel" name="phone" required inputmode="tel" dir="ltr" placeholder="{e(t["f_phone_ph"])}" autocomplete="tel"></label>
  <label class="field"><span class="flabel">{t["f_notes"]}</span><textarea name="notes" rows="3" placeholder="{e(t["f_notes_ph"])}"></textarea></label>
  <p class="hint">{ic("shield")}{t["f_hint"]}</p>
  <label class="consent"><input type="checkbox" name="consent" required><span>{t["f_consent"]}</span></label>
  <p class="err" hidden></p></fieldset>
 <div class="wz-done" hidden><span class="done-ic">{ic("check")}</span><h2>{t["f_done_title"]}</h2><p>{t["f_done_text"]}</p><a class="btn btn-wa btn-lg wz-open" href="#" target="_blank" rel="noopener">{WA}{t["cta_whatsapp"]}</a></div>
 <div class="wz-nav"><button type="button" class="btn btn-ghost btn-lg wz-back" hidden>{t["f_back"]}</button><button type="button" class="btn btn-teal btn-lg wz-next">{t["f_next"]}</button><button type="submit" class="btn btn-wa btn-lg wz-send" hidden>{WA}{t["f_send"]}</button></div>
</form>'''

def p_request(L):
    t = T[L]; me = page_path(L, "request")
    body = page_hero(L, me, t["request_title"], t["request_text"]) + f'''
<section class="sec"><div class="wrap narrow">
{wizard(L)}
</div></section>'''
    return page(L, "request", f'{t["request_title"]} | {t["brand"]}', t["request_text"] + " " + t["home_desc"], body)

def p_faq(L):
    t = T[L]; me = page_path(L, "faq")
    body = page_hero(L, me, t["faq_title"], t["faq_page_text"]) + f'<section class="sec"><div class="wrap narrow">{faq_list(L)}</div></section>' + band(L, me)
    return page(L, "faq", f'{t["faq_title"]} | {t["brand"]}', t["faq_page_text"], body, [faq_schema(L)])

def contact_block(L, me):
    t = T[L]
    return f'''<div class="ccards">
  <a class="ccard ccard-wa reveal" href="{wa_link(L)}" target="_blank" rel="noopener" data-track="whatsapp">{WA}<span class="ct"><small>{t["c_whatsapp"]}</small><span dir="ltr">{C["whatsapp_display"]}</span></span></a>
  <a class="ccard reveal" href="tel:{C["phone"]}" data-track="call">{ic("phone")}<span class="ct"><small>{t["c_phone"]}</small><span dir="ltr">{C["phone_display"]}</span></span></a>
  <a class="ccard reveal" href="mailto:{C["email"]}">{ic("mail")}<span class="ct"><small>{t["c_email"]}</small><span>{C["email"]}</span></span></a>
  <div class="ccard reveal">{ic("pin")}<span class="ct"><small>{t["c_address"]}</small><span>{C["city_" + L]}</span></span></div>
 </div>
 <div class="mapbox reveal"><iframe title="map" src="https://www.google.com/maps?q=Doha,Qatar&hl={L}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>'''

def p_contact(L):
    t = T[L]; me = page_path(L, "contact")
    soc = "".join(f'<a href="{C[n]}" target="_blank" rel="noopener" aria-label="{n}">{SOCIAL[n]}</a>' for n in ("instagram", "tiktok", "snapchat", "facebook"))
    body = page_hero(L, me, t["contact_title"], t["contact_text"]) + f'''
<section class="sec"><div class="wrap contact">
 {contact_block(L, me)}
 <div class="csocial reveal"><b>{t["c_social"]}</b><span dir="ltr">{C["handle"]}</span><div class="social social-dark">{soc}</div>
  <a class="btn btn-ghost" href="{rel(me, page_path(L, "blog"))}">{ic("book")}{t["blog_cta"]}</a></div>
</div></section>'''
    return page(L, "contact", f'{t["contact_title"]} | {t["brand"]}', t["contact_text"], body)

def p_privacy(L):
    t = T[L]; me = page_path(L, "privacy")
    items = "".join(f'<h2>{h}</h2><p>{p}</p>' for h, p in PRIVACY[L])
    body = page_hero(L, me, t["privacy_title"], t["brand_full"]) + f'<section class="sec"><div class="wrap narrow prose card">{items}</div></section>'
    return page(L, "privacy", f'{t["privacy_title"]} | {t["brand"]}', t["privacy_title"] + " - " + t["brand_full"], body)

def p_404(L):
    t = T[L]; me = page_path(L, "404")
    en = T["en"]
    body = f'''<section class="nf grid-bg"><div class="wrap nf-in">
 <div class="nf-code" aria-hidden="true"><span>4</span><span class="nf-heart">{ic("heart-hand")}</span><span>4</span></div>
 <svg class="nf-pulse" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30h210l18-22 22 44 20-38 16 16h314"/></svg>
 <h1>{t["404_title"]}</h1>
 <p>{t["404_text"]}</p>
 <div class="ctas nf-ctas">
  <a class="btn btn-teal btn-lg" href="{rel(me, page_path(L, "index"))}">{t["nav"][0][1]}</a>
  <a class="btn btn-ghost-light btn-lg" href="{rel(me, page_path(L, "services"))}">{dict(t["nav"])["services"]}</a>
  <a class="btn btn-wa btn-lg" href="{wa_link(L)}" target="_blank" rel="noopener" data-track="whatsapp">{WA}{t["cta_whatsapp"]}</a>
 </div>
 <p class="nf-en" lang="en" dir="ltr">{en["404_title"]}. <a href="{rel(me, page_path("en", "index"))}">Go to the English site</a></p>
</div></section>'''
    html = page(L, "404", t["404_title"], t["404_text"], body)
    return html.replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"', 1)

# ---------- blog pages ----------
BT = {
    "ar": {"title": "المدونة", "text": "نصايح ومعلومات تساعدك تهتم بأهلك في البيت، من فريق دار الأمانة.", "latest": "من المدونة", "latest_title": "نصايح تهمّك", "all": "كل المقالات", "read": "اقرأ المقال", "empty": "المقالات جاية قريب.", "related": "مقالات ثانية", "note": "المعلومات هنا عامة للتوعية، وما تغني عن استشارة الطبيب المعالج."},
    "en": {"title": "Blog", "text": "Practical tips to help you care for your loved ones at home, from the Dar Alamana team.", "latest": "From the blog", "latest_title": "Helpful reads", "all": "All articles", "read": "Read article", "empty": "Articles are coming soon.", "related": "More articles", "note": "This information is general and does not replace advice from the treating doctor."},
}

def post_img(d):
    img = (d.get("image") or "").strip()
    return img or "/assets/img/vitals.webp"

def post_src(me, img):
    return rel(me, img.lstrip("/")) if img.startswith("/") else img

def post_cards(L, me, posts):
    b = BT[L]; out = ""
    for d in posts:
        href = rel(me, page_path(L, "blog/" + d["slug"]))
        out += f'''<a class="bcard reveal" href="{href}">
 <span class="bimg"><img src="{post_src(me, post_img(d))}" alt="{e(d.get("image_alt") or d["title"])}" loading="lazy" width="600" height="375"></span>
 <span class="bbody"><time datetime="{d["date"]}">{fmt_date(L, d["date"])}</time><h3>{e(d["title"])}</h3><p>{e(d.get("description", ""))}</p>
 <span class="more">{b["read"]}{ic("chev", "ic chev")}</span></span></a>'''
    return f'<div class="bgrid">{out}</div>'

def latest_posts(L, me):
    posts = list(POSTS[L].values())[:3]
    if not posts: return ""
    b = BT[L]
    return f'''<section class="sec sec-soft"><div class="wrap">
 <header class="shead reveal"><p class="kicker">{b["latest"]}</p><h2>{b["latest_title"]}</h2></header>
 {post_cards(L, me, posts)}
 <p class="center"><a class="btn btn-ghost" href="{rel(me, page_path(L, "blog"))}">{b["all"]}</a></p>
</div></section>'''

def p_blog(L):
    t = T[L]; b = BT[L]; me = page_path(L, "blog")
    posts = list(POSTS[L].values())
    inner = post_cards(L, me, posts) if posts else f'<p class="center">{b["empty"]}</p>'
    body = page_hero(L, me, b["title"], b["text"]) + f'<section class="sec"><div class="wrap">{inner}</div></section>' + band(L, me)
    schema = {"@context": "https://schema.org", "@type": "Blog", "name": f'{b["title"]} | {t["brand"]}', "url": url_of(L, "blog"), "inLanguage": L,
              "blogPost": [{"@type": "BlogPosting", "headline": d["title"], "url": url_of(L, "blog/" + d["slug"]), "datePublished": d["date"]} for d in posts]}
    return page(L, "blog", f'{b["title"]} | {t["brand"]}', b["text"], body, [schema])

def p_post(L, d):
    t = T[L]; b = BT[L]; key = "blog/" + d["slug"]; me = page_path(L, key)
    img = post_img(d); abs_img = C["base_url"] + img if img.startswith("/") else img
    others = [x for x in POSTS[L].values() if x["slug"] != d["slug"]][:3]
    bc = f'<nav class="crumbs" aria-label="breadcrumb"><a href="{rel(me, page_path(L, "index"))}">{t["nav"][0][1]}</a><span>/</span><a href="{rel(me, page_path(L, "blog"))}">{b["title"]}</a></nav>'
    body = f'''<section class="phero grid-bg"><div class="wrap narrow">{bc}<h1>{e(d["title"])}</h1><p>{e(d.get("description", ""))}</p>
 <p class="pmeta"><time datetime="{d["date"]}">{fmt_date(L, d["date"])}</time></p></div></section>
<section class="sec"><div class="wrap narrow">
 <article class="article card">
  <img class="acover" src="{post_src(me, img)}" alt="{e(d.get("image_alt") or d["title"])}" width="900" height="560">
  <div class="prose">{md(d.get("body", "")).replace(' src="/', ' src="' + rel(me, "")).replace(' href="/', ' href="' + rel(me, ""))}</div>
  <p class="anote">{b["note"]}</p>
  {cta_buttons(L, me)}
 </article>
</div></section>'''
    if others:
        body += f'<section class="sec sec-soft"><div class="wrap"><header class="shead"><h2>{b["related"]}</h2></header>{post_cards(L, me, others)}</div></section>'
    schema = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": d["title"], "description": d.get("description", ""),
              "image": abs_img, "datePublished": d["date"], "dateModified": d.get("updated") or d["date"], "inLanguage": L,
              "mainEntityOfPage": url_of(L, key), "author": {"@type": "Organization", "name": t["brand_full"], "url": url_of(L, "index")},
              "publisher": {"@id": C["base_url"] + "/#org"}}
    PAGE_OG.clear(); PAGE_OG.update({"image": abs_img, "type": "article"})
    html = page(L, key, f'{d["title"]} | {t["brand"]}', d.get("description") or d["title"], body, [schema])
    PAGE_OG.clear()
    return html

# ---------- build ----------
def write(path, html):
    full = os.path.join(OUT, path); os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f: f.write(html)

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    shutil.copytree(os.path.join(SRC, "static"), OUT)
    cfg = os.path.join(OUT, "admin", "config.yml")
    if os.path.exists(cfg):  # رابط الموقع الكامل للوحة التحكم
        y = open(cfg, encoding="utf-8").read().replace("site_url: /\n", f'site_url: {C["base_url"]}/\n').replace("display_url: /\n", f'display_url: {C["base_url"]}/\n')
        open(cfg, "w", encoding="utf-8").write(y)
    keys = []
    for L in ("ar", "en"):
        pages = {"index": p_home(L), "services": p_services(L), "about": p_about(L), "request": p_request(L),
                 "faq": p_faq(L), "contact": p_contact(L), "privacy": p_privacy(L), "blog": p_blog(L)}
        for s in SERVICES: pages["services/" + s["slug"]] = p_service(L, s)
        for d in POSTS[L].values(): pages["blog/" + d["slug"]] = p_post(L, d)
        for k, h in pages.items(): write(page_path(L, k), h)
        keys += [k for k in pages if k not in keys]
    write("404.html", p_404("ar").replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n<base href="{C["base_url"]}/">', 1))
    # sitemap + robots
    today = datetime.date.today().isoformat()
    urls = ""
    for k in keys:
        langs = [x for x in ("ar", "en") if has_lang(x, k)]
        for L in langs:
            alts = "".join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{url_of(x, k)}"/>' for x in langs) if len(langs) == 2 else ""
            pr = "1.0" if k == "index" else ("0.9" if k.startswith("services") or k == "request" else "0.6")
            lm = POSTS[L][k[5:]].get("updated") or POSTS[L][k[5:]]["date"] if k.startswith("blog/") else today
            urls += f'<url><loc>{url_of(L, k)}</loc><lastmod>{str(lm)[:10]}</lastmod><priority>{pr}</priority>{alts}</url>\n'
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n{urls}</urlset>\n')
    write("robots.txt", f'User-agent: *\nAllow: /\n\nSitemap: {C["base_url"]}/sitemap.xml\n')
    print("built", OUT)

if __name__ == "__main__":
    main()
