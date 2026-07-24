import { describe, it, expect } from 'vitest';
import {
  FormState,
  emptyForm,
  deriveSegment,
  deriveOverlay,
  isAdvancedDemand,
  formToInterviewCore,
  buildFormContext,
  WORK_TYPES,
  AI_MATURITY,
  NEED_OPTIONS,
  FRICTION_OPTIONS,
  COST_TAG_OPTIONS,
  LOCAL_TAG_OPTIONS,
  GOV_TAG_OPTIONS,
  FEATURE_OPTIONS,
  LIKELIHOOD_OPTIONS,
  FIRST_USE_OPTIONS,
  TIMEFRAME_OPTIONS,
  BLOCKER_OPTIONS,
  AI_WORK_OPTIONS,
  AD_PAIN_OPTIONS,
  ORG_TYPES,
} from '@/lib/questions';

// RR-AD example. Scores C5/T2/L5/U4/G3 -> AD DVI = 0.35*5+0.10*2+0.25*5+0.15*4+0.15*3 = 4.25
function sampleForm(): FormState {
  return {
    ...emptyForm(),
    orgType: ORG_TYPES[0],
    workType: WORK_TYPES[0], // research -> RR
    aiMaturity: AI_MATURITY[0], // regularly -> AD
    needTags: [NEED_OPTIONS[0]],
    competitors: ['AWS', 'Azure'],
    frictionTags: [FRICTION_OPTIONS[0]],
    costRating: 5,
    costTags: [COST_TAG_OPTIONS[1]],
    techRating: 2,
    locRating: 5,
    locTags: [LOCAL_TAG_OPTIONS[0]],
    uvpRating: 4,
    featureTags: [FEATURE_OPTIONS[0]],
    govRating: 3,
    govTags: [GOV_TAG_OPTIONS[0]],
    likelihood: LIKELIHOOD_OPTIONS[4],
    firstUse: FIRST_USE_OPTIONS[0],
    timeframe: TIMEFRAME_OPTIONS[1],
    blockers: [BLOCKER_OPTIONS[0]],
    aiWork: [AI_WORK_OPTIONS[2]],
    adPain: [AD_PAIN_OPTIONS[0]],
    contactAnswered: true,
    contactConsent: false,
  };
}

describe('routing derivation', () => {
  it('derives RR from research work', () => {
    expect(deriveSegment({ ...emptyForm(), workType: WORK_TYPES[0] })).toBe('RR');
  });
  it('derives DD from software work', () => {
    expect(deriveSegment({ ...emptyForm(), workType: WORK_TYPES[1] })).toBe('DD');
  });
  it('uses the primary-context follow-up when work type is "both"', () => {
    expect(
      deriveSegment({ ...emptyForm(), workType: WORK_TYPES[2], primaryContext: WORK_TYPES[1] })
    ).toBe('DD');
    expect(
      deriveSegment({ ...emptyForm(), workType: WORK_TYPES[2], primaryContext: WORK_TYPES[0] })
    ).toBe('RR');
  });

  it('derives AD from regular or occasional AI use, basic otherwise', () => {
    expect(deriveOverlay({ ...emptyForm(), aiMaturity: AI_MATURITY[0] })).toBe('AD');
    expect(deriveOverlay({ ...emptyForm(), aiMaturity: AI_MATURITY[1] })).toBe('AD');
    expect(deriveOverlay({ ...emptyForm(), aiMaturity: AI_MATURITY[3] })).toBe('basic');
    expect(isAdvancedDemand({ ...emptyForm(), aiMaturity: AI_MATURITY[2] })).toBe(false);
  });
});

describe('formToInterviewCore', () => {
  it('derives the route and computes the AD-weighted DVI from the ratings', () => {
    const core = formToInterviewCore(sampleForm());
    expect(core.segment).toBe('RR');
    expect(core.overlay).toBe('AD');
    expect(core.route).toBe('RR-AD');
    expect(core.scores).toEqual({
      costBarrier: 5,
      technicalComplexity: 2,
      localizationGap: 5,
      uvpResonance: 4,
      governanceResonance: 3,
    });
    expect(core.dvi).toBe(4.25);
    expect(core.interpretation).toBe('Strong demand signal');
  });

  it('merges and de-dupes component sub-friction (and AD pain) into frictionTags', () => {
    const core = formToInterviewCore(sampleForm());
    expect(core.frictionTags).toEqual([
      FRICTION_OPTIONS[0],
      COST_TAG_OPTIONS[1],
      LOCAL_TAG_OPTIONS[0],
      GOV_TAG_OPTIONS[0],
      AD_PAIN_OPTIONS[0],
    ]);
  });

  it('joins competitors, keeps AD work, and gates contact fields off without consent', () => {
    const core = formToInterviewCore(sampleForm());
    expect(core.competitors).toBe('AWS; Azure');
    expect(core.aiWork).toBe(AI_WORK_OPTIONS[2]);
    expect(core.contactName).toBe('');
    expect(core.contactEmail).toBe('');
  });

  it('keeps contact fields when consent is given', () => {
    const core = formToInterviewCore({
      ...sampleForm(),
      contactConsent: true,
      contactName: 'Jane Cruz',
      contactEmail: 'jane@agency.gov.ph',
    });
    expect(core.contactName).toBe('Jane Cruz');
    expect(core.contactEmail).toBe('jane@agency.gov.ph');
  });

  it('drops AD work for basic respondents', () => {
    const core = formToInterviewCore({ ...sampleForm(), aiMaturity: AI_MATURITY[3] });
    expect(core.overlay).toBe('basic');
    expect(core.aiWork).toBe('');
  });
});

describe('buildFormContext', () => {
  it('includes each rating and its ticked tags for reconciliation', () => {
    const ctx = buildFormContext(sampleForm());
    expect(ctx).toContain('Route: RR-AD');
    expect(ctx).toContain('Cost rating: 5/5');
    expect(ctx).toContain('Technical rating: 2/5');
    expect(ctx).toContain(COST_TAG_OPTIONS[1]);
    expect(ctx).toContain('do NOT re-ask');
  });
});
