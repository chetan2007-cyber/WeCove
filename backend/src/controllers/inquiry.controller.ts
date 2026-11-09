import { Request, Response, NextFunction } from 'express';
import { inquirySchema } from '../validators/inquiry.validator';
import { saveInquiry, checkDbHealth } from '../services/db.service';
import { sendInquiryNotification } from '../services/email.service';

export async function createInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = inquirySchema.safeParse(req.body);

    if (!parseResult.success) {
      const formattedErrors = parseResult.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        message: 'Validation failed. Please correct the fields below.',
        errors: formattedErrors,
      });
      return;
    }

    const data = parseResult.data;

    // Spam honeypot trap
    if (data._gotcha && data._gotcha.trim().length > 0) {
      console.warn('[Anti-Spam] Bot detected via honeypot trap');
      res.status(200).json({
        success: true,
        message: 'Thank you for reaching out. We will review your inquiry shortly.',
      });
      return;
    }

    // Persist inquiry in database
    const savedInquiry = await saveInquiry(data);

    // Dispatch email notification asynchronously
    const emailResult = await sendInquiryNotification(savedInquiry);

    res.status(201).json({
      success: true,
      message: 'Inquiry received and securely stored. Our engineering team will review your project and get in touch promptly.',
      data: {
        id: savedInquiry.id,
        createdAt: savedInquiry.createdAt,
        emailDispatched: emailResult.sent,
        notice: emailResult.sent
          ? 'Notification delivered to wecove.in@gmail.com'
          : 'Inquiry recorded. Email notification queued.',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getHealthCheck(req: Request, res: Response): Promise<void> {
  const dbHealth = await checkDbHealth();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'WeCove.in API',
    version: '1.0.0',
    database: dbHealth,
    uptimeSeconds: Math.floor(process.uptime()),
  });
}
