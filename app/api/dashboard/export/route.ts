/**
 * Dashboard CSV export.
 * Streams the aiaas_market_analysis dataset as CSV for offline analysis.
 *
 * This route lives under /api, which proxy.ts explicitly excludes from the
 * dashboard gate, so it re-checks the session cookie itself before returning
 * any data. Contact PII (name/email) is intentionally NOT selected or exported
 * (see lib/dashboard-export.ts). Cells are escaped and formula-injection-guarded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { DASHBOARD_COOKIE, requireDashboardSession } from '@/lib/dashboard-auth';
import { buildCsv } from '@/lib/dashboard-export';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest): Promise<Response> {
  const token = request.cookies.get(DASHBOARD_COOKIE)?.value;
  const authed = await requireDashboardSession(token);
  if (!authed) {
    return NextResponse.redirect(new URL('/dashboard/login', request.url), 303);
  }

  if (!process.env.DATABASE_URL) {
    return new NextResponse('DATABASE_URL is not configured', { status: 500 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    // contact_name / contact_email are deliberately omitted — the export must
    // not expose respondents' personal details to dashboard-password holders.
    // JSONB columns (themes, quantified_pains, reconciliation_events,
    // llm_inferred_rationale) are cast to text so the CSV cell carries the JSON
    // string instead of "[object Object]". Enrichment columns hold no contact
    // PII, so they are safe to include.
    const rows = (await sql`
      SELECT assessment_id, created_at, timestamp, segment_vector, ai_maturity_overlay,
             final_route, organization_type, current_work_type, ai_maturity, ai_work,
             main_problem, need_tags, competitor_benchmarked, friction_tags, use_case_tags,
             cost_barrier_score_c, technical_complexity_score_t, localization_gap_score_l,
             uvp_resonance_score_u, governance_resonance_score_g, dvi_score, dvi_model_version,
             interpretation, likelihood_to_try,
             first_use_pathway, timeframe, adoption_blockers, contact_consent,
             sanitized_summary, conversation_history,
             enrichment_status, evidence_sentiment, interview_quality,
             themes::text                AS themes,
             quantified_pains::text      AS quantified_pains,
             reconciliation_events::text AS reconciliation_events,
             llm_inferred_cost_c, llm_inferred_technical_t,
             llm_inferred_localization_l, llm_inferred_uvp_u, llm_inferred_governance_g,
             llm_inferred_rationale::text AS llm_inferred_rationale,
             suggested_need_tags, suggested_friction_tags, suggested_use_case_tags
      FROM aiaas_market_analysis
      ORDER BY created_at ASC
    `) as Record<string, unknown>[];

    const csv = buildCsv(rows);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="aiaas-market-responses-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('Failed to export data', { status: 500 });
  }
}
