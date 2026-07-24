import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatForGoogleSheets, signPayload, submitToGoogleSheets } from '@/services/submissionService';
import { InterviewData, InterviewRecord } from '@/lib/types';

const baseData: InterviewData = {
  timestamp: '2024-01-15T10:30:00Z',
  segment: 'DD', overlay: 'basic', route: 'DD-Basic',
  organizationType: 'Software development team',
  currentWorkType: 'Web and mobile apps',
  aiMaturity: 'No, and we currently have no AI capacity',
  aiWork: '',
  mainProblem: 'Add AI features without heavy setup',
  needTags: ['Ready-to-use APIs'],
  competitors: 'AWS; Azure',
  frictionTags: ['Too expensive'],
  useCaseTags: ['Ready-to-use APIs'],
  scores: { costBarrier: 4, technicalComplexity: 4, localizationGap: 3, uvpResonance: 4, governanceResonance: 4 },
  asset: { possession: 3, willingness: 3 }, acScore: 3, quadrant: 'Anchor',
  dvi: 3.75, interpretation: 'Strong demand signal',
  likelihoodToTry: 'Very likely', firstUsePathway: 'Use a ready-to-use API', timeframe: 'Immediately',
  adoptionBlockers: 'No clear use case',
  contactConsent: false, contactName: '', contactEmail: '',
  summary: 'Dev team wants simpler AI deployment.',
  conversationHistory: '',
};

describe('Submission Service', () => {
  it('formatForGoogleSheets returns the flat record', () => {
    const r = formatForGoogleSheets(baseData);
    expect(r.route).toBe('DD-Basic');
    expect(r.needTags).toBe('Ready-to-use APIs');
    expect(r.frictionTags).toBe('Too expensive');
    expect(r.dvi).toBe(3.75);
    expect(r.contactConsent).toBe(false);
    expect(r.contactName).toBe('');
  });

  it('signPayload signs when a secret is provided and passes through otherwise', () => {
    const record = formatForGoogleSheets(baseData) as InterviewRecord;
    const signed = JSON.parse(signPayload(record, 'secret'));
    expect(signed).toHaveProperty('_webhookPayload');
    expect(signed).toHaveProperty('_webhookSignature');
    expect(JSON.parse(signPayload(record))).toEqual(record);
  });

  describe('submitToGoogleSheets', () => {
    const mockFetch = vi.fn();
    const originalFetch = global.fetch;
    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockReset();
    });
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns success when the webhook is not configured', async () => {
      const r = await submitToGoogleSheets(baseData, {});
      expect(r.success).toBe(true);
      expect(r.message).toContain('webhook not configured');
    });

    it('submits successfully with a webhook', async () => {
      mockFetch.mockResolvedValue({
        ok: true, status: 200, redirected: false,
        text: async () => JSON.stringify({ success: true }),
        json: async () => ({ success: true }),
      });
      const r = await submitToGoogleSheets(baseData, { webhookUrl: 'https://example.com/webhook' });
      expect(r.success).toBe(true);
      expect(r.message).toBe('Interview submitted successfully');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const r = await submitToGoogleSheets(baseData, { webhookUrl: 'https://example.com/webhook' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('Network error');
    });
  });
});
