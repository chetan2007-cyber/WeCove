# 2. Source-Code Rebranding Migration Report

**Product**: CampZen  
**Operating Company**: WeCove.in  
**Status**: Completed & Verified  

---

## 1. Brand Hierarchy Rules
1. **Product Name**: `CampZen` (Case-sensitive: "CampZen", never "Kami" or "Campzen").
2. **Company Name**: `WeCove.in` (Legal entity, copyright holder, domain owner).
3. **Application Title**: `CampZen: Campus Life, Made Simple`

---

## 2. Identifier Mapping Table

| Scope | Old Identifier | New Identifier | Compatibility Status |
| :--- | :--- | :--- | :--- |
| **Android Package** | `com.kamimobile` | `in.wecove.campzen` | Active |
| **App Title** | Kami Student / Kami | CampZen | Active |
| **Database Name** | `test` | `campzen_production` | Active Cutover |
| **API Domain** | `api.kami.in` / Render default | `api.wecove.in` | Active (SSL Verified) |
| **Email Sender** | `Kami Support <...>` | `CampZen by WeCove.in <otp@wecove.in>` | Active (Resend API) |
| **Print Spooler Doc** | `Kami-{OrderNumber}-...` | `CampZen-{OrderNumber}-...` | Active |
| **Print Script** | `kami-win-print.ps1` | `campzen-win-print.ps1` | Dual Compatible |
| **Auth Token Key** | `auth_token` | `campzen_access_token` | SecureStore Keystore |
| **Refresh Token Key** | N/A (None existed) | `campzen_refresh_token` | SecureStore Keystore |
| **Webhook Header** | `x-kami-webhook-secret` | `x-campzen-webhook-secret` | Both headers accepted |

---

## 3. Backwards Compatibility Bridges
To guarantee that background tasks or legacy components do not fail:
1. **Webhook Authentication**: Backend Express middleware checks `req.headers['x-campzen-webhook-secret'] || req.headers['x-kami-webhook-secret']`.
2. **Print Script Fallback**: `printer.service.js` automatically prefers `campzen-win-print.ps1` if present, falling back to `kami-win-print.ps1` if executing in an unmigrated environment.
3. **Database Migration Safety**: The original `test` database remains completely intact and untouched on MongoDB Atlas as an immutable historical backup.
