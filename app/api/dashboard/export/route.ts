/**
 * Dashboard CSV export.
 * Streams the full aiaas_market_analysis dataset as CSV for offline analysis.
 *
 * This route lives under /api, which proxy.ts explicitly excludes from the
 * dashboard gate, so it re-checks the session cookie itself before returning
 * any data. Cells are escaped and formula-injection-guarded for spreadsheets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { DASHBOARD_COOKIE, verifySessionToken } from '@/lib/dashboard-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COLUMNS = [
  'assessment_id',
  'created_at',
  'timestamp',
  'segment_vector',
  'ai_maturity_overlay',
  'final_route',
  'organization_type',
  'current_work_type',
  'ai_maturity',
  'ai_work',
  'main_problem',
  'need_tags',
  'competitor_benchmarked',
  'friction_tags',
  'use_case_tags',
  'cost_barrier_score_c',
  'technical_complexity_score_t',
  'localization_gap_score_l',
  'uvp_resonance_score_u',
  'dvi_score',
  'interpretation',
  'likelihood_to_try',
  'first_use_pathway',
  'timeframe',
  'adoption_blockers',
  'contact_consent',
  'contact_name',
  'contact_email',
  'sanitized_summary',
  'conversation_history',
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s =
    typeof value === 'string'
      ? value
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest): Promise<Response> {
  const secret = process.env.DASHBOARD_PASSWORD;
  const token = request.cookies.get(DASHBOARD_COOKIE)?.value;
  const authed = secret ? await verifySessionToken(token, secret) : false;
  if (!authed) {
    return NextResponse.redirect(new URL('/dashboard/login', request.url), 303);
  }

  if (!process.env.DATABASE_URL) {
    return new NextResponse('DATABASE_URL is not configured', { status: 500 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = (await sql`
      SELECT assessment_id, created_at, timestamp, segment_vector, ai_maturity_overlay,
             final_route, organization_type, current_work_type, ai_maturity, ai_work,
             main_problem, need_tags, competitor_benchmarked, friction_tags, use_case_tags,
             cost_barrier_score_c, technical_complexity_score_t, localization_gap_score_l,
             uvp_resonance_score_u, dvi_score, interpretation, likelihood_to_try,
             first_use_pathway, timeframe, adoption_blockers, contact_consent,
             contact_name, contact_email, sanitized_summary, conversation_history
      FROM aiaas_market_analysis
      ORDER BY created_at ASC
    `) as Record<string, unknown>[];

    const header = COLUMNS.join(',');
    const body = rows.map((row) => COLUMNS.map((c) => csvCell(row[c])).join(',')).join('\r\n');
    // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
    const csv = `﻿${header}\r\n${body}\r\n`;

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
