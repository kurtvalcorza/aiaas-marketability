import { describe, it, expect } from 'vitest';
import { buildSubmissionRecord } from '@/services/submissionRecord';
import { InterviewData } from '@/lib/types';
import { MAX_CONVERSATION_HISTORY_SIZE } from '@/lib/constants';

const NUL = String.fromCharCode(0);

export const baseData: InterviewData = {
  timestamp: '2024-01-15T10:30:00Z',
  segment: 'RR',
  overlay: 'AD',
  route: 'RR-AD',
  organizationType: 'Government AI department',
  currentWorkType: 'Policy analytics',
  aiMaturity: 'Yes, regularly',
  aiWork: 'Train AI models',
  mainProblem: 'Lower-cost localized inference',
  needTags: ['Localized datasets'],
  competitors: 'AWS; Azure',
  frictionTags: ['cost', 'data sovereignty'],
  useCaseTags: ['Secure or local inference option'],
  scores: { costBarrier: 5, technicalComplexity: 2, localizationGap: 5, uvpResonance: 4, governanceResonance: 4 },
  asset: { possession: 4, willingness: 3 },
  acScore: 3,
  quadrant: 'Anchor',
  dvi: 4.5,
  interpretation: 'Strong demand signal',
  likelihoodToTry: 'Very likely',
  firstUsePathway: 'Explore datasets',
  timeframe: 'Within 1-3 months',
  adoptionBlockers: 'No relevant datasets',
  contactConsent: true,
  contactName: 'Jane Cruz',
  contactEmail: 'jane@agency.gov.ph',
  summary: 'Advanced team constrained by cost.',
};

describe('buildSubmissionRecord', () => {
  it('maps interview data to the flat record and keeps contact with consent', () => {
    const r = buildSubmissionRecord({ ...baseData, conversationHistory: 'User: Hi' });
    expect(r).toEqual({
      timestamp: '2024-01-15T10:30:00Z',
      segment: 'RR',
      overlay: 'AD',
      route: 'RR-AD',
      organizationType: 'Government AI department',
      currentWorkType: 'Policy analytics',
      aiMaturity: 'Yes, regularly',
      aiWork: 'Train AI models',
      mainProblem: 'Lower-cost localized inference',
      needTags: 'Localized datasets',
      competitors: 'AWS; Azure',
      frictionTags: 'cost; data sovereignty',
      useCaseTags: 'Secure or local inference option',
      costBarrier: 5,
      technicalComplexity: 2,
      localizationGap: 5,
      uvpResonance: 4,
      governanceResonance: 4,
      dvi: 4.5,
      dviModelVersion: 'v2',
      interpretation: 'Strong demand signal',
      assetPossession: 4,
      assetWillingness: 3,
      acScore: 3,
      matrixQuadrant: 'Anchor',
      likelihoodToTry: 'Very likely',
      firstUsePathway: 'Explore datasets',
      timeframe: 'Within 1-3 months',
      adoptionBlockers: 'No relevant datasets',
      contactConsent: true,
      contactName: 'Jane Cruz',
      contactEmail: 'jane@agency.gov.ph',
      summary: 'Advanced team constrained by cost.',
      conversationHistory: 'User: Hi',
    });
  });

  it('drops contact name and email without consent', () => {
    const r = buildSubmissionRecord({ ...baseData, contactConsent: false });
    expect(r.contactConsent).toBe(false);
    expect(r.contactName).toBe('');
    expect(r.contactEmail).toBe('');
  });

  it('strips NUL characters from text fields', () => {
    const r = buildSubmissionRecord({ ...baseData, mainProblem: `Sec${NUL}ure`, summary: `Good${NUL}fit` });
    expect(r.mainProblem).toBe('Secure');
    expect(r.summary).toBe('Goodfit');
  });

  it('redacts PII from stored free-text fields', () => {
    const r = buildSubmissionRecord({
      ...baseData,
      summary: 'Reach us at 123-456-7890',
      conversationHistory: 'Email me at user@example.com please',
    });
    expect(r.summary).toBe('Reach us at [PHONE_REDACTED]');
    expect(r.conversationHistory).toBe('Email me at [EMAIL_REDACTED] please');
  });

  it('truncates oversized conversation history', () => {
    const r = buildSubmissionRecord({ ...baseData, conversationHistory: 'x'.repeat(MAX_CONVERSATION_HISTORY_SIZE + 1000) });
    expect(r.conversationHistory.endsWith('...[truncated]')).toBe(true);
  });
});
