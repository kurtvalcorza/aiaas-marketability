import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/submit/route';

vi.mock('@/lib/rate-limit', () => ({ checkSubmissionRateLimit: vi.fn() }));
vi.mock('@/lib/validation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/validation')>()),
  validateInterviewData: vi.fn(),
}));
vi.mock('@/services/neonSubmissionService', () => ({ submitToNeon: vi.fn() }));

import { checkSubmissionRateLimit } from '@/lib/rate-limit';
import { validateInterviewData } from '@/lib/validation';
import { submitToNeon } from '@/services/neonSubmissionService';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const validInterviewData = {
  segment: 'DD', overlay: 'basic', route: 'DD-Basic',
  organizationType: 'Software development team', currentWorkType: 'Web and mobile apps',
  aiMaturity: 'No, and we currently have no AI capacity', aiWork: '',
  mainProblem: 'Add AI features', needTags: ['Ready-to-use APIs'], competitors: 'AWS; Azure',
  frictionTags: ['Too expensive'], useCaseTags: ['Ready-to-use APIs'],
  scores: { costBarrier: 4, technicalComplexity: 4, localizationGap: 3, uvpResonance: 4, governanceResonance: 4 },
  asset: { possession: 3, willingness: 3 }, acScore: 3, quadrant: 'Anchor',
  dvi: 3.75, interpretation: 'Strong demand signal',
  likelihoodToTry: 'Very likely', firstUsePathway: 'Use a ready-to-use API', timeframe: 'Immediately',
  adoptionBlockers: 'No clear use case',
  contactConsent: false, contactName: '', contactEmail: '',
  summary: 'Dev team wants simpler AI deployment.',
  timestamp: new Date().toISOString(), conversationHistory: '[]',
};

const req = (body: unknown) =>
  new Request('http://localhost/api/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

describe('/api/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkSubmissionRateLimit as any).mockResolvedValue({ allowed: true, remaining: 4 });
    (validateInterviewData as any).mockReturnValue(undefined);
    vi.mocked(submitToNeon).mockResolvedValue({ success: true, message: 'Interview submitted successfully' });
    mockFetch.mockResolvedValue({
      ok: true, status: 200, redirected: false,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
      json: () => Promise.resolve({ success: true }),
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    delete process.env.DATABASE_URL;
    delete process.env.STORAGE_PROVIDER;
  });

  it('returns 429 when rate limited', async () => {
    (checkSubmissionRateLimit as any).mockResolvedValue({ allowed: false, remaining: 0 });
    expect((await POST(req(validInterviewData))).status).toBe(429);
  });

  it('returns 400 when validation rejects the data', async () => {
    (validateInterviewData as any).mockImplementation(() => {
      throw new Error('Validation failed: route: Invalid enum value');
    });
    const res = await POST(req({ invalid: 'data' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Validation failed');
  });

  it('succeeds when no webhook is configured', async () => {
    const res = await POST(req(validInterviewData));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toContain('webhook not configured');
  });

  it('formats data correctly for Google Sheets', async () => {
    process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/test';
    await POST(req(validInterviewData));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      timestamp: validInterviewData.timestamp,
      segment: 'DD', overlay: 'basic', route: 'DD-Basic',
      organizationType: 'Software development team', currentWorkType: 'Web and mobile apps',
      aiMaturity: 'No, and we currently have no AI capacity', aiWork: '',
      mainProblem: 'Add AI features', needTags: 'Ready-to-use APIs', competitors: 'AWS; Azure',
      frictionTags: 'Too expensive', useCaseTags: 'Ready-to-use APIs',
      costBarrier: 4, technicalComplexity: 4, localizationGap: 3, uvpResonance: 4, governanceResonance: 4,
      dvi: 3.75, dviModelVersion: 'v2', interpretation: 'Strong demand signal',
      assetPossession: 3, assetWillingness: 3, acScore: 3, matrixQuadrant: 'Anchor',
      likelihoodToTry: 'Very likely', firstUsePathway: 'Use a ready-to-use API', timeframe: 'Immediately',
      adoptionBlockers: 'No clear use case',
      contactConsent: false, contactName: '', contactEmail: '',
      summary: 'Dev team wants simpler AI deployment.', conversationHistory: '[]',
    });
  });

  it('does not leak internal details on Google Sheets failure', async () => {
    process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/test';
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Internal Server Error' });
    const res = await POST(req(validInterviewData));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Submission failed. Please try again.');
  });

  it('includes security headers', async () => {
    const res = await POST(req(validInterviewData));
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('routes to Neon when DATABASE_URL is configured', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host/db';
    const res = await POST(req(validInterviewData));
    expect(res.status).toBe(200);
    expect(submitToNeon).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
