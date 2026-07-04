import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichInterview, redactEnrichment } from '@/services/enrichmentService';
import { EnrichmentSchema, Enrichment } from '@/lib/schemas/enrichment';
import { InterviewData } from '@/lib/types';

const data: InterviewData = {
  segment: 'RR',
  overlay: 'AD',
  route: 'RR-AD',
  organizationType: 'university lab',
  currentWorkType: 'research',
  aiMaturity: 'advanced',
  aiWork: 'training models',
  mainProblem: 'no localized datasets',
  needTags: ['datasets'],
  competitors: 'none',
  frictionTags: ['cost'],
  useCaseTags: ['inference'],
  scores: { costBarrier: 1, technicalComplexity: 3, localizationGap: 5, uvpResonance: 4 },
  dvi: 3.2,
  interpretation: 'Moderate demand signal',
  likelihoodToTry: 'high',
  firstUsePathway: 'API',
  timeframe: '3 months',
  adoptionBlockers: 'budget',
  contactConsent: false,
  contactName: '',
  contactEmail: '',
  summary: 'summary',
  timestamp: '2026-07-04T00:00:00.000Z',
  conversationHistory: 'Q: what does cost you? A: a lot',
};

const enrichment: Enrichment = {
  themes: ['cost', 'localization'],
  quantifiedPains: [{ metric: 'egress', value: 4200, unit: 'PHP/month', context: 'monthly' }],
  sentiment: 'negative',
  interviewQuality: 'high',
  reconciliationEvents: [
    { component: 'cost', conflict: 'rated 1 but ticked cost pains', outcome: 'revised', rationale: 'evidence disagreed' },
  ],
  inferred: { cost: 4, technical: 2, localization: 5, uvp: 3 },
  inferredRationale: { cost: 'a', technical: 'b', localization: 'c', uvp: 'd' },
  suggestedNeedTags: ['datasets'],
  suggestedFrictionTags: [],
  suggestedUseCaseTags: ['inference'],
};

const ENV_KEYS = ['GOOGLE_GENERATIVE_AI_API_KEY', 'ENRICHMENT_ENABLED', 'ENRICHMENT_MODEL', 'ENRICHMENT_TIMEOUT_MS'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
  delete process.env.ENRICHMENT_ENABLED;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('enrichInterview', () => {
  it('maps a successful extraction and reports provenance', async () => {
    const generate = vi.fn().mockResolvedValue({ object: enrichment });
    const result = await enrichInterview(data, { generate: generate as never });
    expect(generate).toHaveBeenCalledOnce();
    expect(result).not.toBeNull();
    expect(result!.enrichment.inferred.cost).toBe(4);
    expect(result!.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(EnrichmentSchema.safeParse(result!.enrichment).success).toBe(true);
  });

  it('returns null (never throws) when the model errors', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(enrichInterview(data, { generate: generate as never })).resolves.toBeNull();
  });

  it('is disabled by ENRICHMENT_ENABLED=false and does not call the model', async () => {
    process.env.ENRICHMENT_ENABLED = 'false';
    const generate = vi.fn();
    const result = await enrichInterview(data, { generate: generate as never });
    expect(result).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns null when no API key is configured', async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const generate = vi.fn();
    const result = await enrichInterview(data, { generate: generate as never });
    expect(result).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('redactEnrichment', () => {
  it('scrubs PII from every free-text field', () => {
    const withPii: Enrichment = {
      ...enrichment,
      themes: ['reach jane@example.com'],
      quantifiedPains: [{ metric: 'call 213-555-0134', value: null, unit: null, context: 'email a@b.com' }],
      reconciliationEvents: [{ ...enrichment.reconciliationEvents[0], rationale: 'from x@y.com' }],
      inferredRationale: { ...enrichment.inferredRationale, cost: 'contact z@w.com' },
      suggestedNeedTags: ['dm me at foo@bar.com'],
    };
    const out = redactEnrichment(withPii);
    const blob = JSON.stringify(out);
    expect(blob).not.toContain('jane@example.com');
    expect(blob).not.toContain('a@b.com');
    expect(blob).not.toContain('x@y.com');
    expect(blob).not.toContain('z@w.com');
    expect(blob).not.toContain('foo@bar.com');
    expect(blob).toContain('[EMAIL_REDACTED]');
  });
});
