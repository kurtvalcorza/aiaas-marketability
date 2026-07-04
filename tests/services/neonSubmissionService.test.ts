import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InterviewData } from '@/lib/types';

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }));
vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => mockSql) }));

import { neon } from '@neondatabase/serverless';
import { submitToNeon } from '@/services/neonSubmissionService';

const NUL = String.fromCharCode(0);

const data: InterviewData = {
  timestamp: '2024-01-15T10:30:00Z',
  segment: 'RR', overlay: 'AD', route: 'RR-AD',
  organizationType: 'Government AI department',
  currentWorkType: 'Policy analytics',
  aiMaturity: 'Yes, regularly',
  aiWork: 'Train AI models',
  mainProblem: 'Lower-cost localized inference',
  needTags: ['Localized datasets'],
  competitors: 'AWS; Azure',
  frictionTags: ['cost', 'data sovereignty'],
  useCaseTags: ['Secure or local inference option'],
  scores: { costBarrier: 5, technicalComplexity: 2, localizationGap: 5, uvpResonance: 4 },
  dvi: 4.5, interpretation: 'Strong demand signal',
  likelihoodToTry: 'Very likely', firstUsePathway: 'Explore datasets', timeframe: 'Within 1-3 months',
  adoptionBlockers: 'No relevant datasets',
  contactConsent: true, contactName: 'Jane Cruz', contactEmail: 'jane@agency.gov.ph',
  summary: 'Advanced team constrained by cost.',
  conversationHistory: '[]',
};

describe('Neon Submission Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pass@host/db';
    mockSql.mockResolvedValue([]);
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('fails loudly without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    const r = await submitToNeon(data);
    expect(r.success).toBe(false);
    expect(r.error).toBe('DATABASE_URL is not configured');
    expect(neon).not.toHaveBeenCalled();
  });

  it('inserts all fields in column order', async () => {
    const r = await submitToNeon(data);
    expect(r.success).toBe(true);
    const values = mockSql.mock.calls[0].slice(1);
    expect(values).toEqual([
      '2024-01-15T10:30:00Z', 'RR', 'AD', 'RR-AD',
      'Government AI department', 'Policy analytics', 'Yes, regularly', 'Train AI models',
      'Lower-cost localized inference', 'Localized datasets', 'AWS; Azure', 'cost; data sovereignty',
      'Secure or local inference option',
      5, 2, 5, 4,
      4.5, 'Strong demand signal', 'Very likely', 'Explore datasets', 'Within 1-3 months',
      'No relevant datasets', true, 'Jane Cruz', 'jane@agency.gov.ph',
      'Advanced team constrained by cost.', '[]',
    ]);
  });

  it('strips NUL and redacts PII before inserting', async () => {
    await submitToNeon({ ...data, organizationType: `Gov${NUL}Dept`, conversationHistory: 'Contact me at user@example.com' });
    const values = mockSql.mock.calls[0].slice(1);
    expect(values[4]).toBe('GovDept'); // organization_type
    expect(values[27]).toBe('Contact me at [EMAIL_REDACTED]'); // conversation_history
  });

  it('returns a failure result when the insert throws', async () => {
    mockSql.mockRejectedValue(new Error('relation "aiaas_market_analysis" does not exist'));
    const r = await submitToNeon(data);
    expect(r.success).toBe(false);
    expect(r.error).toContain('aiaas_market_analysis');
  });
});
