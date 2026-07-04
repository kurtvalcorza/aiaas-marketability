/**
 * LLM qualitative-enrichment schema — the single source of truth for the second,
 * structured pass that runs once per completed interview.
 *
 * Every field here is RESEARCH-ONLY. None of it feeds the DVI, the route, or the
 * authoritative self-ratings — the model may enrich, compare, and annotate, but
 * it never authors the metric (see docs/specs/llm-scope-expansion.md §3). The
 * Zod schema both constrains the `generateObject` output and provides the type.
 */

import { z } from 'zod';

/** Bumped when the extraction prompt or schema changes; stored per row for provenance. */
export const ENRICHMENT_VERSION = '1.0.0';

/** A DVI component score on the same 0.0–5.0 scale used by the form. */
const score = z.number().min(0).max(5);

/** A concrete, quantified pain surfaced in the interview (value optional). */
export const PainSchema = z.object({
  metric: z.string().max(120),
  value: z.number().nullable(),
  unit: z.string().max(40).nullable(),
  context: z.string().max(280),
});
export type Pain = z.infer<typeof PainSchema>;

/** A reconciliation event: where a self-rating conflicted with the evidence. */
export const ReconEventSchema = z.object({
  component: z.enum(['cost', 'technical', 'localization', 'uvp']),
  conflict: z.string().max(280),
  outcome: z.enum(['kept', 'revised', 'not_flagged']),
  rationale: z.string().max(280),
});
export type ReconEvent = z.infer<typeof ReconEventSchema>;

/** Structured research annotations extracted from one completed interview. */
export const EnrichmentSchema = z.object({
  // 1. Qualitative coding
  themes: z.array(z.string().max(60)).max(8),
  quantifiedPains: z.array(PainSchema).max(6),
  sentiment: z.enum(['negative', 'mixed', 'neutral', 'positive']),
  interviewQuality: z.enum(['low', 'medium', 'high']),

  // 2. Reconciliation audit
  reconciliationEvents: z.array(ReconEventSchema).max(4),

  // 3. Shadow (evidence-based) ratings — COMPARISON ONLY, excluded from the DVI
  inferred: z.object({
    cost: score,
    technical: score,
    localization: score,
    uvp: score,
  }),
  inferredRationale: z.object({
    cost: z.string().max(280),
    technical: z.string().max(280),
    localization: z.string().max(280),
    uvp: z.string().max(280),
  }),

  // 4. Candidate tags surfaced in chat but not ticked on the form (non-authoritative)
  suggestedNeedTags: z.array(z.string().max(60)).max(6),
  suggestedFrictionTags: z.array(z.string().max(60)).max(6),
  suggestedUseCaseTags: z.array(z.string().max(60)).max(6),
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;
