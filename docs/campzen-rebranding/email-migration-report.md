# 4. Email Notification Migration Report

**Sender**: `CampZen by WeCove.in <otp@wecove.in>`  
**Domain**: `wecove.in`  
**Transport**: Resend HTTPS REST API (Port 443)  
**Status**: Active & Verified  

---

## 1. Deliverability Challenge & Resolution
- **Issue**: Outbound SMTP on ports 25, 465, and 587 is blocked by default on Render's cloud infrastructure, causing traditional Nodemailer SMTP transports to time out.
- **Solution**: Implemented direct HTTPS REST integration using Resend API (`api.resend.com/emails`), which communicates strictly over outbound port 443 (HTTPS) and guarantees immediate delivery.

---

## 2. Configured Templates
1. **Email OTP Verification Template**:
   - Header: Clean CampZen header with WeCove.in branding.
   - Body: 6-digit verification code with 10-minute expiry notice.
   - Anti-phishing security advisory.
2. **Order Confirmation & Pickup Pass Template**:
   - Includes order number, page breakdown, pickup counter code, and total amount.
3. **Password Reset Notification**:
   - Time-limited secure reset link / code.
