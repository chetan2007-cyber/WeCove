import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  contactEmail: process.env.CONTACT_EMAIL || 'wecove.in@gmail.com',
  resendApiKey: process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'WeCove Inquiries <inquiries@wecove.in>',
  smtpUser: process.env.SMTP_USER || 'sharmachetan7816@gmail.com',
  smtpPass: process.env.EMAIL_PASS || process.env.SMTP_PASS || '',
};
