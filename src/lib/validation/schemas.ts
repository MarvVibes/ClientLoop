// ====================================================================
// CLIENTLOOP ZOD VALIDATION SCHEMAS
// Type-Safe Boundaries for Forms, APIs, and Webhooks
// ====================================================================

import { z } from 'zod'
import { normalizePhoneNumber } from '../phone/normalize'

// 1. Phone validation helper schema
export const phoneSchema = z.string().superRefine((val, ctx) => {
  const result = normalizePhoneNumber(val)
  if (!result.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error || 'Invalid phone number format',
    })
  }
})

// 2. Staff Record Visit Form Schema
export const recordVisitSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  countryCode: z.string().default('+1'),
  customerName: z.string().trim().max(100).optional().nullable(),
  service: z.string().min(1, 'Service selection is required'),
  serviceId: z.string().optional().nullable(),
  sendQuestionnaire: z.boolean().default(true),
  consentBasis: z.enum([
    'implicit_transaction',
    'explicit_oral',
    'explicit_written',
  ]).default('implicit_transaction'),
  notes: z.string().max(500).optional().nullable(),
}).superRefine((data, ctx) => {
  const normalized = normalizePhoneNumber(data.phone, data.countryCode)
  if (!normalized.isValid) {
    ctx.addIssue({
      path: ['phone'],
      code: z.ZodIssueCode.custom,
      message: normalized.error || 'Invalid phone number format for selected country',
    })
  }
})

export type RecordVisitInput = z.infer<typeof recordVisitSchema>

// 3. Customer Questionnaire Public Submission Schema
export const questionnaireSubmissionSchema = z.object({
  tokenHash: z.string().min(16, 'Invalid security token hash'),
  firstVisitAnswer: z.boolean(),
  discoverySourceAnswer: z.string().min(1, 'Please select how you heard about us'),
  serviceAnswer: z.string().min(1, 'Service received is required'),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  feedbackText: z.string().max(1000, 'Feedback cannot exceed 1000 characters').optional().nullable(),
})

export type QuestionnaireSubmissionInput = z.infer<typeof questionnaireSubmissionSchema>

// 4. Business Workspace Profile & Settings Schema
export const businessSettingsSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  category: z.string().min(2),
  timezone: z.string().default('UTC'),
  address: z.string().max(255).optional().nullable(),
  googleReviewUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  services: z.array(z.object({
    id: z.string(),
    name: z.string().min(1),
    defaultPrice: z.number().nonnegative().optional(),
    defaultDurationMin: z.number().int().positive().optional(),
  })).min(1, 'At least one service must be configured'),
  discoverySourceOptions: z.array(z.string().min(1)).min(2, 'At least 2 discovery source options required'),
  messagingConfig: z.object({
    provider: z.string().default('whatsapp_cloud_api'),
    cooldownHours: z.number().int().min(1).max(720).default(72),
    autoSendOnVisit: z.boolean().default(true),
    whatsappPhoneNumberId: z.string().optional().nullable(),
  }),
})

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>

// 5. WhatsApp Message Dispatch Queue Job Schema
export const messageQueueJobSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  visitId: z.string().uuid().optional().nullable(),
  recipientPhone: z.string().regex(/^\+\d{8,15}$/, 'Recipient must be normalized E.164 phone'),
  templateName: z.string().min(1),
  idempotencyKey: z.string().min(8),
  parameters: z.record(z.string(), z.string()).optional(),
})

export type MessageQueueJobInput = z.infer<typeof messageQueueJobSchema>
