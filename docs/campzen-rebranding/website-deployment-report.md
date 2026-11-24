# 11. Website & Download Center Deployment Report

**Domains**: `wecove.in`, `www.wecove.in`  
**Host**: Render Static Sites (`wecove-1.onrender.com`)  
**Deployment Status**: Production Live  

---

## 1. Download Landing Page (`/download/campzen`)
- Hero section showcasing the new CampZen squircle logo and branding.
- One-click APK download button targeting `/downloads/campzen-v1.0.0.apk`.
- One-click copyable SHA-256 checksum and Certificate Fingerprint for security verification.
- User-friendly Google Play Protect installation guide ("More details" -> "Install anyway").

---

## 2. SPA Client-Side Routing Fix (`_redirects`)
- Added `_redirects` file (`/* /index.html 200`) to `public/` and `dist/`.
- Resolves HTTP 404 errors when visitors land directly on deep links like `https://wecove.in/download/campzen`.

---

## 3. SEO & OpenGraph Metadata
- Title: `CampZen for Android — Campus Life, Made Simple | WeCove.in`
- Description: `Download the official CampZen Android app by WeCove.in. Queue-free campus printing, stationery ordering, and academic services.`
