/**
 * Researcher-dashboard data access.
 * Read-only aggregate queries over the Neon views defined in schema.sql
 * (dvi_overall, dvi_by_vector/overlay/route, dvi_band_distribution,
 * workbench_demand). No user input reaches these queries.
 */

import { neon } from '@neondatabase/serverless';

export interface OverallStats {
  interviews: number;
  avgDvi: number | null;
  avgCostBarrier: number | null;
  avgTechnicalComplexity: number | null;
  avgLocalizationGap: number | null;
  avgUvpResonance: number | null;
  avgGovernanceResonance: number | null;
  contactConsented: number;
  latestSubmission: string | null;
}

export interface GroupRow {
  key: string;
  interviews: number;
  avgDvi: number | null;
}

export interface BandRow {
  band: string;
  interviews: number;
}

export interface MatrixRow {
  quadrant: string;
  interviews: number;
}

export interface WorkbenchDemand {
  interviews: number;
  interested: number;
  pct: number | null;
}

export interface DashboardData {
  overall: OverallStats;
  byVector: GroupRow[];
  byOverlay: GroupRow[];
  byRoute: GroupRow[];
  bands: BandRow[];
  workbench: WorkbenchDemand;
  matrix: MatrixRow[];
}

/** Postgres NUMERIC / bigint come back as strings over the wire; coerce safely. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(v: unknown): number {
  return Math.trunc(num(v) ?? 0);
}

export async function fetchDashboardData(): Promise<DashboardData> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  const sql = neon(process.env.DATABASE_URL);

  const [overallRows, vectorRows, overlayRows, routeRows, bandRows, workbenchRows, matrixRows] =
    await Promise.all([
      sql`SELECT interviews, avg_dvi, avg_cost_barrier, avg_technical_complexity,
                 avg_localization_gap, avg_uvp_resonance, avg_governance_resonance,
                 contact_consented, latest_submission
          FROM dvi_overall`,
      sql`SELECT segment_vector AS key, interviews, avg_dvi FROM dvi_by_vector ORDER BY segment_vector`,
      sql`SELECT ai_maturity_overlay AS key, interviews, avg_dvi FROM dvi_by_overlay ORDER BY ai_maturity_overlay`,
      sql`SELECT final_route AS key, interviews, avg_dvi FROM dvi_by_route ORDER BY final_route`,
      sql`SELECT band, interviews FROM dvi_band_distribution ORDER BY sort_order`,
      sql`SELECT interviews, workbench_interested, workbench_interest_pct FROM workbench_demand`,
      sql`SELECT quadrant, interviews FROM demand_asset_matrix`,
    ]);

  const o = overallRows[0] ?? {};
  const overall: OverallStats = {
    interviews: int(o.interviews),
    avgDvi: num(o.avg_dvi),
    avgCostBarrier: num(o.avg_cost_barrier),
    avgTechnicalComplexity: num(o.avg_technical_complexity),
    avgLocalizationGap: num(o.avg_localization_gap),
    avgUvpResonance: num(o.avg_uvp_resonance),
    avgGovernanceResonance: num(o.avg_governance_resonance),
    contactConsented: int(o.contact_consented),
    latestSubmission: o.latest_submission ? String(o.latest_submission) : null,
  };

  const toGroup = (rows: Record<string, unknown>[]): GroupRow[] =>
    rows.map((r) => ({
      key: String(r.key ?? ''),
      interviews: int(r.interviews),
      avgDvi: num(r.avg_dvi),
    }));

  const bands: BandRow[] = bandRows.map((r) => ({
    band: String(r.band ?? ''),
    interviews: int(r.interviews),
  }));

  const w = workbenchRows[0] ?? {};
  const workbench: WorkbenchDemand = {
    interviews: int(w.interviews),
    interested: int(w.workbench_interested),
    pct: num(w.workbench_interest_pct),
  };

  const matrix: MatrixRow[] = matrixRows.map((r) => ({
    quadrant: String(r.quadrant ?? ''),
    interviews: int(r.interviews),
  }));

  return {
    overall,
    byVector: toGroup(vectorRows),
    byOverlay: toGroup(overlayRows),
    byRoute: toGroup(routeRows),
    bands,
    workbench,
    matrix,
  };
}

/** Human-readable labels for the coded segment/overlay/route values. */
export const VECTOR_LABELS: Record<string, string> = {
  RR: 'Research / Data',
  DD: 'Developer',
};

export const OVERLAY_LABELS: Record<string, string> = {
  basic: 'Basic (no active AI)',
  AD: 'Advanced Demand (active AI)',
};

/** DVI band for a score, matching the thresholds in schema.sql / the instrument. */
export function bandForDvi(dvi: number): 'Weak' | 'Limited' | 'Moderate' | 'Strong' {
  if (dvi < 1.5) return 'Weak';
  if (dvi < 2.5) return 'Limited';
  if (dvi < 3.5) return 'Moderate';
  return 'Strong';
}

export const BAND_COLORS: Record<string, string> = {
  Weak: '#dc2626', // red-600
  Limited: '#f59e0b', // amber-500
  Moderate: '#3b82f6', // blue-500
  Strong: '#16a34a', // green-600
};
