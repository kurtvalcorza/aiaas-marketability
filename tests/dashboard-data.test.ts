import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }));
vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => mockSql) }));

import {
  bandForDvi,
  BAND_COLORS,
  VECTOR_LABELS,
  OVERLAY_LABELS,
  fetchDashboardData,
} from '@/lib/dashboard-data';

describe('bandForDvi', () => {
  it.each([
    [0, 'Weak'],
    [1.49, 'Weak'],
    [1.5, 'Limited'],
    [2.49, 'Limited'],
    [2.5, 'Moderate'],
    [3.49, 'Moderate'],
    [3.5, 'Strong'],
    [5, 'Strong'],
  ])('maps DVI %s to %s', (dvi, expected) => {
    expect(bandForDvi(dvi as number)).toBe(expected);
  });

  it('has a colour for every band it can return', () => {
    for (const band of ['Weak', 'Limited', 'Moderate', 'Strong']) {
      expect(BAND_COLORS[band]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('code labels', () => {
  it('labels both segment vectors', () => {
    expect(VECTOR_LABELS.RR).toBeTruthy();
    expect(VECTOR_LABELS.DD).toBeTruthy();
  });

  it('labels both maturity overlays', () => {
    expect(OVERLAY_LABELS.basic).toBeTruthy();
    expect(OVERLAY_LABELS.AD).toBeTruthy();
  });
});

describe('fetchDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pass@host/db';
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('reads avg_governance_resonance into overall.avgGovernanceResonance', async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          interviews: 10, avg_dvi: '3.10', avg_cost_barrier: '3', avg_technical_complexity: '2',
          avg_localization_gap: '3', avg_uvp_resonance: '3', avg_governance_resonance: '3.40',
          contact_consented: 4, latest_submission: '2026-07-24T00:00:00Z',
        },
      ])
      .mockResolvedValueOnce([]) // dvi_by_vector
      .mockResolvedValueOnce([]) // dvi_by_overlay
      .mockResolvedValueOnce([]) // dvi_by_route
      .mockResolvedValueOnce([]) // dvi_band_distribution
      .mockResolvedValueOnce([{ interviews: 10, workbench_interested: 2, workbench_interest_pct: '20.0' }])
      .mockResolvedValueOnce([]); // demand_asset_matrix

    const data = await fetchDashboardData();
    expect(data.overall.avgGovernanceResonance).toBe(3.4);
  });
});
