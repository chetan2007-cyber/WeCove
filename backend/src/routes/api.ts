import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createInquiry, getHealthCheck } from '../controllers/inquiry.controller';

const router = Router();

// Rate limiter for inquiries: max 10 submissions per 15 minutes per IP
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many inquiries submitted from this IP address. Please wait a few minutes before trying again.',
  },
});

router.post('/inquiries', inquiryLimiter, createInquiry);
router.get('/health', getHealthCheck);

export default router;
