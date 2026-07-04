import { describe, it, expect } from 'vitest';
import { EnrichmentSchema, ENRICHMENT_VERSION } from '@/lib/schemas/enrichment';

const valid = {
  themes: ['cost', 'localization'],
  quantifiedPains: [{ metric: 'cloud egress', value: 4200, unit: 'PHP/month', context: 'monthly bill' }],
  sentiment: 'negative' as const,
  interviewQuality: 'high' as const,
  reconciliationEvents: [
    { component: 'cost' as const, conflict: 'rated low but ticked cost pains', outcome: 'revised' as const, rationale: 'evidence disagreed' },
  ],
  inferred: { cost: 4, technical: 2, localization: 5, uvp: 3 },
  inferredRationale: { cost: 'a', technical: 'b', localization: 'c', uvp: 'd' },
  suggestedNeedTags: ['datasets'],
  suggestedFrictionTags: [],
  suggestedUseCaseTags: ['inference'],
};

describe('EnrichmentSchema', () => {
  it('accepts a well-formed enrichment', () => {
    expect(EnrichmentSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects shadow ratings outside 0..5', () => {
    const bad = { ...valid, inferred: { ...valid.inferred, cost: 6 } };
    expect(EnrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown sentiment enum', () => {
    const bad = { ...valid, sentiment: 'furious' };
    expect(EnrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an unknown reconciliation outcome', () => {
    const bad = { ...valid, reconciliationEvents: [{ ...valid.reconciliationEvents[0], outcome: 'maybe' }] };
    expect(EnrichmentSchema.safeParse(bad).success).toBe(false);
  });

  it('exposes a version string', () => {
    expect(ENRICHMENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
