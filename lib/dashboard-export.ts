/**
 * Researcher-dashboard CSV export — shared, testable logic.
 *
 * EXPORT_COLUMNS deliberately EXCLUDES `contact_name` and `contact_email`: the
 * dashboard sits behind a single shared password, so the export must not hand
 * every password holder the respondents' personal contact details. The
 * `contact_consent` boolean stays (a researcher can see that a contact exists);
 * retrieving the actual name/email is a separate, credentialed step against the
 * database directly. Do not add the contact PII columns back here.
 */

/** Columns included in the CSV export, in order. No contact PII (see above). */
export const EXPORT_COLUMNS = [
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
  'sanitized_summary',
  'conversation_history',
] as const;

/** Contact PII columns that must never appear in the export. */
export const EXCLUDED_PII_COLUMNS = ['contact_name', 'contact_email'] as const;

/**
 * Escapes a single CSV cell (RFC 4180) and neutralizes spreadsheet formula
 * injection by prefixing a leading =, +, -, @, tab, or CR with an apostrophe.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s =
    typeof value === 'string'
      ? value
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  // Neutralize spreadsheet formula injection first, then RFC-4180 quote-escape.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Builds CSV text: a UTF-8 BOM (so Excel reads accents correctly), a header
 * row, then one row per record, using the given columns.
 */
export function buildCsv(
  rows: Record<string, unknown>[],
  columns: readonly string[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((c) => csvCell(row[c])).join(',')).join('\r\n');
  return `﻿${header}\r\n${body}\r\n`;
}
