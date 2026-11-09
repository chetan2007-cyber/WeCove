import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { InquiryRecord } from './db.service';
import { config } from '../config';

interface EmailResult {
  sent: boolean;
  provider: string;
  error?: string;
}

export async function sendInquiryNotification(inquiry: InquiryRecord): Promise<EmailResult> {
  const formattedDate = new Date(inquiry.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const subject = `[New Inquiry] ${inquiry.projectType} — from ${inquiry.name}${inquiry.company ? ` (${inquiry.company})` : ''}`;

  const textBody = `
=============================================
NEW PROJECT INQUIRY — WECOVE.IN
=============================================

Inquiry ID: ${inquiry.id}
Received:   ${formattedDate}

CLIENT DETAILS:
- Full Name:    ${inquiry.name}
- Email:        ${inquiry.email}
- Company:      ${inquiry.company || 'Not provided'}
- Phone:        ${inquiry.phone || 'Not provided'}

PROJECT DETAILS:
- Project Type: ${inquiry.projectType}
- Budget:       ${inquiry.budget || 'Not specified'}

PROJECT DESCRIPTION:
${inquiry.message}

---------------------------------------------
Direct Reply-To: ${inquiry.email}
Official WeCove.in Notifications
`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #f4f4f6; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #14161f; border: 1px solid #232734; border-radius: 12px; overflow: hidden; }
    .header { background-color: #08090c; padding: 28px 32px; border-bottom: 1px solid #232734; }
    .brand { color: #ccff00; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; }
    .tagline { color: #8a909e; font-size: 13px; margin-top: 4px; }
    .content { padding: 32px; }
    .badge { display: inline-block; background-color: rgba(204, 255, 0, 0.12); color: #ccff00; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 24px 0; }
    .grid { margin-bottom: 24px; border-collapse: collapse; width: 100%; }
    .grid td { padding: 8px 0; vertical-align: top; }
    .label { width: 130px; color: #8a909e; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { color: #ffffff; font-size: 14px; font-weight: 600; }
    .message-box { background-color: #090a0d; border: 1px solid #232734; border-radius: 8px; padding: 20px; margin-top: 20px; color: #e2e4e9; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .footer { padding: 20px 32px; background-color: #0c0d12; border-top: 1px solid #232734; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">WeCove.in</div>
      <div class="tagline">Digital Product Studio & Software Development</div>
    </div>
    <div class="content">
      <div class="badge">New Inbound Inquiry</div>
      <h1 class="title">Project Inquiry Received</h1>
      <table class="grid">
        <tr>
          <td class="label">Client Name</td>
          <td class="value">${inquiry.name}</td>
        </tr>
        <tr>
          <td class="label">Email</td>
          <td class="value"><a href="mailto:${inquiry.email}" style="color: #ccff00; text-decoration: none;">${inquiry.email}</a></td>
        </tr>
        <tr>
          <td class="label">Company</td>
          <td class="value">${inquiry.company || 'Not provided'}</td>
        </tr>
        <tr>
          <td class="label">Phone</td>
          <td class="value">${inquiry.phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td class="label">Project Type</td>
          <td class="value">${inquiry.projectType}</td>
        </tr>
        <tr>
          <td class="label">Budget</td>
          <td class="value">${inquiry.budget || 'Not specified'}</td>
        </tr>
        <tr>
          <td class="label">Submitted</td>
          <td class="value">${formattedDate}</td>
        </tr>
      </table>

      <div style="margin-top: 24px; font-size: 13px; font-weight: 600; text-transform: uppercase; color: #8a909e;">Project Description</div>
      <div class="message-box">${inquiry.message}</div>
    </div>
    <div class="footer">
      Reply directly to this email to contact ${inquiry.name} (${inquiry.email}).<br />
      WeCove.in • Official Notification System
    </div>
  </div>
</body>
</html>
`;

  // 1. Try Resend if configured
  if (config.resendApiKey && !config.resendApiKey.includes('placeholder')) {
    try {
      const resend = new Resend(config.resendApiKey);
      const data = await resend.emails.send({
        from: config.emailFrom,
        to: config.contactEmail,
        replyTo: inquiry.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      if (data.error) {
        console.error('[Email Service] Resend API error:', data.error);
        return { sent: false, provider: 'resend', error: data.error.message };
      }

      console.log('[Email Service] Inquiry email dispatched successfully via Resend');
      return { sent: true, provider: 'resend' };
    } catch (err) {
      console.error('[Email Service] Resend execution error:', err);
      // Fall through to SMTP if configured
    }
  }

  // 2. Try Nodemailer / SMTP (e.g. Gmail app password)
  if (config.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${inquiry.name} (via WeCove)" <${config.smtpUser}>`,
        to: config.contactEmail,
        replyTo: inquiry.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      console.log('[Email Service] Inquiry email dispatched successfully via SMTP');
      return { sent: true, provider: 'smtp' };
    } catch (err) {
      console.error('[Email Service] SMTP dispatch error:', err);
      return { sent: false, provider: 'smtp', error: (err as Error).message };
    }
  }

  // 3. Fallback: Local development notification logger
  console.log('--------------------------------------------------');
  console.log('[Email Service - Dev Mode] Inquiry notification prepared for', config.contactEmail);
  console.log(`From: ${inquiry.name} <${inquiry.email}>`);
  console.log(`Type: ${inquiry.projectType} | Budget: ${inquiry.budget}`);
  console.log('Note: To deliver real inbox emails, configure RESEND_API_KEY or EMAIL_PASS in backend/.env');
  console.log('--------------------------------------------------');

  return {
    sent: false,
    provider: 'unconfigured',
    error: 'Email provider credentials not configured in environment variables. Inquiry was safely persisted.',
  };
}
