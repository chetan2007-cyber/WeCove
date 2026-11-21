/**
 * Kami - Authoritative Email Service
 * Handles SMTP delivery for verification OTPs via Gmail SMTP / custom SMTP provider
 */

const nodemailer = require('nodemailer');
const { maskEmail } = require('../utils/otp');

// In-memory record for development & test environment verification
const devOutbox = [];

const createTransporter = () => {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const rawPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || '';
    const pass = rawPass.replace(/\s+/g, '');

    if (user && pass) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass
            },
            connectionTimeout: 4000,
            greetingTimeout: 4000,
            socketTimeout: 5000
        });
    }

    // Fallback: Safe dev simulator (no real SMTP credentials configured yet)
    return {
        isSimulated: true,
        sendMail: async (mailOptions) => {
            devOutbox.push({
                ...mailOptions,
                sentAt: new Date()
            });
            // Keep outbox size bounded
            if (devOutbox.length > 50) devOutbox.shift();
            return { messageId: `sim-${Date.now()}` };
        }
    };
};

let transporter = createTransporter();

/**
 * Re-initialize transporter (e.g. after env reload)
 */
const reconfigure = () => {
    transporter = createTransporter();
};

const sendViaResendApi = async (to, subject, html, text) => {
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
    if (!apiKey) return null;

    const from = process.env.EMAIL_FROM || 'CampZen <onboarding@resend.dev>';
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject,
                html,
                text
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`📧 [Resend Dispatched] Email sent via HTTPS REST API to ${maskEmail(to)} (ID: ${data.id})`);
            return { success: true, messageId: data.id };
        } else {
            console.warn('[Resend API Warning]', data);
            return null;
        }
    } catch (err) {
        console.warn('[Resend Fetch Error]', err.message);
        return null;
    }
};

/**
 * Send 6-digit email verification OTP to student
 */
const sendVerificationEmail = async (to, otp) => {
    if (!to || !otp) {
        throw new Error('Email recipient and OTP are required');
    }

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'Kami Campus Printing <noreply@kami.campus>';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px; color: #1F1F1F; }
    .card { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #EDE8E0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { text-align: center; margin-bottom: 24px; }
    .hanko { display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #C8372D; color: #FFFFFF; font-size: 24px; font-weight: bold; border-radius: 8px; text-align: center; }
    .title { font-size: 22px; font-weight: 700; color: #1F1F1F; margin: 16px 0 8px 0; }
    .subtitle { font-size: 14px; color: #6E685F; margin: 0; }
    .code-container { background: #FAF7F2; border: 1px dashed #DDD7CD; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #C8372D; margin: 0; }
    .expiry { font-size: 13px; color: #8C8275; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #A0988C; margin-top: 32px; border-top: 1px solid #F0ECE4; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="hanko">紙</div>
      <h1 class="title">Verify your email</h1>
      <p class="subtitle">Use this code to complete your Kami student registration.</p>
    </div>
    
    <div class="code-container">
      <div class="code">${otp}</div>
      <div class="expiry">This verification code expires in 10 minutes.</div>
    </div>
    
    <p style="font-size: 14px; color: #4A443C; line-height: 1.5;">
      If you did not request this verification code, please ignore this email or reach out to your campus Kami support.
    </p>
    
    <div class="footer">
      Kami • Campus Cloud Printing Network
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `Kami Campus Printing - Verify Your Email\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\nIf you did not request this code, please ignore this email.`;

    const mailOptions = {
        from: fromAddress,
        to,
        subject: 'Your Kami Verification Code',
        text: textContent,
        html: htmlContent
    };

    // 1. Try Resend HTTPS REST API first (Port 443 - bypasses all cloud SMTP firewall blocks)
    const resendResult = await sendViaResendApi(to, 'Your CampZen Verification Code', htmlContent, textContent);
    if (resendResult && resendResult.success) {
        return resendResult;
    }

    // 2. Fallback to Nodemailer SMTP
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 [Email Dispatched] Verification code sent to ${maskEmail(to)} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ [Email Delivery Notice] SMTP delivery to ${maskEmail(to)} did not complete (${error.message}).`);
        console.log(`🔑 [CAMPZEN OTP VERIFICATION CODE] For ${to}: >>> ${otp} <<<`);
        return { success: true, simulated: true, fallbackOtp: otp };
    }
};

/**
 * Send 6-digit password reset OTP to user
 */
const sendPasswordResetEmail = async (to, otp) => {
    if (!to || !otp) {
        throw new Error('Email recipient and OTP are required');
    }

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'Kami Campus Printing <noreply@kami.campus>';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px; color: #1F1F1F; }
    .card { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #EDE8E0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { text-align: center; margin-bottom: 24px; }
    .hanko { display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #C8372D; color: #FFFFFF; font-size: 24px; font-weight: bold; border-radius: 8px; text-align: center; }
    .title { font-size: 22px; font-weight: 700; color: #1F1F1F; margin: 16px 0 8px 0; }
    .subtitle { font-size: 14px; color: #6E685F; margin: 0; }
    .code-container { background: #FAF7F2; border: 1px dashed #DDD7CD; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #C8372D; margin: 0; }
    .expiry { font-size: 13px; color: #8C8275; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #A0988C; margin-top: 32px; border-top: 1px solid #F0ECE4; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="hanko">鍵</div>
      <h1 class="title">Reset Your Password</h1>
      <p class="subtitle">Use this code to verify your identity and set a new password for your Kami account.</p>
    </div>
    
    <div class="code-container">
      <div class="code">${otp}</div>
      <div class="expiry">This password reset code expires in 10 minutes.</div>
    </div>
    
    <p style="font-size: 14px; color: #4A443C; line-height: 1.5;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
    
    <div class="footer">
      Kami • Campus Cloud Printing Network
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `Kami Campus Printing - Password Reset\n\nYour 6-digit password reset code is: ${otp}\n\nThis code expires in 10 minutes.\nIf you did not request this, please ignore this email.`;

    const mailOptions = {
        from: fromAddress,
        to,
        subject: 'Kami Password Reset Code',
        text: textContent,
        html: htmlContent
    };

    // 1. Try Resend HTTPS REST API first (Port 443 - bypasses all cloud SMTP firewall blocks)
    const resendResult = await sendViaResendApi(to, 'CampZen Password Reset Code', htmlContent, textContent);
    if (resendResult && resendResult.success) {
        return resendResult;
    }

    // 2. Fallback to Nodemailer SMTP
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`🔑 [Email Dispatched] Password reset code sent to ${maskEmail(to)} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ [Email Delivery Notice] SMTP delivery to ${maskEmail(to)} did not complete (${error.message}).`);
        console.log(`🔑 [CAMPZEN OTP RESET CODE] For ${to}: >>> ${otp} <<<`);
        return { success: true, simulated: true, fallbackOtp: otp };
    }
};

/**
 * Helper for testing and dev inspection
 */
const getDevOutbox = () => [...devOutbox];
const clearDevOutbox = () => { devOutbox.length = 0; };

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    reconfigure,
    getDevOutbox,
    clearDevOutbox
};
