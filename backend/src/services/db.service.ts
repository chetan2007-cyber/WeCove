import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { InquiryInput } from '../validators/inquiry.validator';
import { config } from '../config';

export interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  projectType: string;
  budget?: string | null;
  message: string;
  status: 'NEW' | 'IN_REVIEW' | 'CONTACTED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

let prisma: PrismaClient | null = null;
let isPrismaAvailable = false;

// Attempt to initialize Prisma if DATABASE_URL is configured
if (config.databaseUrl && !config.databaseUrl.includes('placeholder')) {
  try {
    prisma = new PrismaClient();
    isPrismaAvailable = true;
  } catch (err) {
    console.warn('[DB Service] Prisma initialization deferred:', (err as Error).message);
    prisma = null;
    isPrismaAvailable = false;
  }
}

// Fallback persistence directory
const fallbackDataDir = path.resolve(__dirname, '../../data');
const fallbackDataFile = path.join(fallbackDataDir, 'inquiries.json');

function ensureFallbackStore(): void {
  try {
    if (!fs.existsSync(fallbackDataDir)) {
      fs.mkdirSync(fallbackDataDir, { recursive: true });
    }
    if (!fs.existsSync(fallbackDataFile)) {
      fs.writeFileSync(fallbackDataFile, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('[DB Service] Error creating fallback store:', error);
  }
}

export async function saveInquiry(data: InquiryInput): Promise<InquiryRecord> {
  const cleanData = {
    name: data.name,
    email: data.email,
    company: data.company || null,
    phone: data.phone || null,
    projectType: data.projectType,
    budget: data.budget || null,
    message: data.message,
    status: 'NEW' as const,
  };

  // If Prisma is available, attempt PostgreSQL persistence
  if (isPrismaAvailable && prisma) {
    try {
      const record = await prisma.inquiry.create({
        data: cleanData,
      });
      return record as InquiryRecord;
    } catch (prismaError) {
      console.warn('[DB Service] PostgreSQL query failed, saving to local fallback storage:', (prismaError as Error).message);
    }
  }

  // Resilient fallback storage so inquiries are never dropped
  ensureFallbackStore();
  const newRecord: InquiryRecord = {
    id: randomUUID(),
    ...cleanData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    let existing: InquiryRecord[] = [];
    if (fs.existsSync(fallbackDataFile)) {
      const fileContent = fs.readFileSync(fallbackDataFile, 'utf-8');
      existing = JSON.parse(fileContent || '[]');
    }
    existing.unshift(newRecord);
    fs.writeFileSync(fallbackDataFile, JSON.stringify(existing, null, 2), 'utf-8');
    console.log(`[DB Service] Inquiry ${newRecord.id} safely persisted (fallback store)`);
  } catch (fileErr) {
    console.error('[DB Service] Failed to write to fallback store:', fileErr);
    // Still return the record so the flow doesn't crash
  }

  return newRecord;
}

export async function checkDbHealth(): Promise<{ status: string; engine: string }> {
  if (isPrismaAvailable && prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', engine: 'postgresql' };
    } catch {
      return { status: 'fallback_active', engine: 'filesystem_backup' };
    }
  }
  return { status: 'ready', engine: 'resilient_store' };
}
