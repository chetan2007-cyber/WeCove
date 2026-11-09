import { z } from 'zod';

export const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  company: z.string().trim().max(100).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  projectType: z.string().trim().min(2, 'Please select a project type').max(100),
  budget: z.string().trim().max(50).optional().default(''),
  message: z.string().trim().min(10, 'Message must be at least 10 characters long').max(3000, 'Message cannot exceed 3000 characters'),
  // Anti-spam honeypot field
  _gotcha: z.string().optional(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
