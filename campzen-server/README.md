# CampZen — Backend API Service

Official production backend API for the CampZen student mobile printing platform.
Provides authentication, document vault, pricing calculation, order management, shop directory, and automated printing interfaces.

---

## 🚀 Cloud Deployment (Render.com)

- **Runtime**: Node.js
- **Build Command**: `npm install`
- **Start Command**: `node src/server.js`
- **Root Directory**: `campzen-server`

### Required Environment Variables

| Variable | Description | Recommended Production Value |
|---|---|---|
| `PORT` | Listening HTTP Port | `10000` (Render sets automatically) |
| `NODE_ENV` | Node Environment | `production` |
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://wecovein_db_user:heisenberg@cluster0.noawy4c.mongodb.net/` |
| `JWT_SECRET` | Cryptographic secret for auth tokens | (Generate a secure random string) |
| `JWT_EXPIRE` | JWT Token expiry | `30d` |
| `AUTO_PRINT_ENABLED` | Physical print spooler daemon | `false` (Physical printing handled by shop agent) |
| `EMAIL_USER` | Transactional email account | `sharmachetan7816@gmail.com` |
| `EMAIL_PASS` | SMTP App Password | (App password) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `348524516027-pjo36n9gmmp24psps42j50e56vvts676.apps.googleusercontent.com` |

---

## 🌐 Custom Domain & DNS

- **Custom Domain**: `api.wecove.in`
- In Cloudflare DNS:
  - **Type**: `CNAME`
  - **Name**: `api`
  - **Target**: `<render-service-name>.onrender.com`
  - **Proxy Status**: Proxied (or DNS only)
