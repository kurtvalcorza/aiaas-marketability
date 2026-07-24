/**
 * Zod schemas for runtime validation and type inference
 * Provides type-safe validation for environment variables and API data
 */

import { z } from 'zod';
import { VALIDATION } from './constants/validation';
import { QUADRANTS } from './matrix';

const I = VALIDATION.INTERVIEW;

/**
 * Environment variables schema
 */
export const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, 'API key is required'),
  GOOGLE_SHEETS_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  WEBHOOK_SIGNING_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url().optional().or(z.literal('')),
  STORAGE_PROVIDER: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Qualitative-enrichment pass (optional runtime knobs; read directly by the
  // service). Enrichment runs when a Google AI key is present unless disabled.
  ENRICHMENT_ENABLED: z.string().optional(),
  ENRICHMENT_MODEL: z.string().optional(),
  ENRICHMENT_TIMEOUT_MS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** DVI component score: a 0.0–5.0 self-rating. */
const scoreSchema = z.number().min(I.SCORE_MIN).max(I.SCORE_MAX);

export const dviScoresSchema = z.object({
  costBarrier: scoreSchema,
  technicalComplexity: scoreSchema,
  localizationGap: scoreSchema,
  uvpResonance: scoreSchema,
  governanceResonance: scoreSchema,
});

/** Asset & Contribution sub-signals (supply axis), each a 0.0–5.0 self-rating. */
export const assetSchema = z.object({
  possession: scoreSchema,
  willingness: scoreSchema,
});

const tagArraySchema = z.array(z.string().max(I.MAX_TAG_LENGTH)).max(I.MAX_TAGS);

/**
 * Interview data schema
 * Validates a scored market-evidence record before submission
 */
export const interviewDataSchema = z.object({
  segment: z.enum(['RR', 'DD']),
  overlay: z.enum(['basic', 'AD']),
  route: z.enum(['RR-Basic', 'RR-AD', 'DD-Basic', 'DD-AD']),
  organizationType: z.string().max(I.MAX_ORGANIZATION_TYPE_LENGTH),
  currentWorkType: z.string().max(I.MAX_CURRENT_WORK_LENGTH),
  aiMaturity: z.string().max(I.MAX_AI_MATURITY_LENGTH),
  aiWork: z.string().max(I.MAX_AI_MATURITY_LENGTH),
  mainProblem: z.string().max(I.MAX_USE_CASE_LENGTH),
  needTags: tagArraySchema,
  competitors: z.string().max(I.MAX_COMPETITORS_LENGTH),
  frictionTags: tagArraySchema,
  useCaseTags: tagArraySchema,
  scores: dviScoresSchema,
  asset: assetSchema,
  dvi: z.number().min(I.DVI_MIN).max(I.DVI_MAX),
  acScore: z.number().min(I.SCORE_MIN).max(I.SCORE_MAX),
  quadrant: z.enum(QUADRANTS as unknown as [string, ...string[]]),
  interpretation: z.string().max(I.MAX_INTERPRETATION_LENGTH),
  likelihoodToTry: z.string().max(I.MAX_LIKELIHOOD_LENGTH),
  firstUsePathway: z.string().max(I.MAX_PATHWAY_LENGTH),
  timeframe: z.string().max(I.MAX_TIMEFRAME_LENGTH),
  adoptionBlockers: z.string().max(I.MAX_BLOCKERS_LENGTH),
  contactConsent: z.boolean(),
  contactName: z.string().max(I.MAX_CONTACT_NAME_LENGTH),
  // Empty when no contact consent; otherwise must look like an email address.
  contactEmail: z
    .string()
    .max(I.MAX_CONTACT_EMAIL_LENGTH)
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: 'Invalid work email',
    }),
  summary: z.string().max(I.MAX_SUMMARY_LENGTH),
  timestamp: z.string().datetime(),
  conversationHistory: z.string().max(I.MAX_HISTORY_PAYLOAD_SIZE).optional(),
});

export type InterviewData = z.infer<typeof interviewDataSchema>;
