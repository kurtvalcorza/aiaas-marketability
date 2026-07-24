import { describe, it, expect } from 'vitest';
import {
  EXPORT_COLUMNS,
  EXCLUDED_PII_COLUMNS,
  csvCell,
  buildCsv,
} from '@/lib/dashboard-export';

describe('EXPORT_COLUMNS — no contact PII', () => {
  it('excludes every PII column listed in EXCLUDED_PII_COLUMNS', () => {
    // EXCLUDED_PII_COLUMNS is the single source of truth for the exclusion.
    for (const col of EXCLUDED_PII_COLUMNS) {
      expect(EXPORT_COLUMNS).not.toContain(col);
    }
    // Guard against the exclusion list being silently emptied.
    expect(EXCLUDED_PII_COLUMNS).toContain('contact_name');
    expect(EXCLUDED_PII_COLUMNS).toContain('contact_email');
  });

  it('keeps the consent flag and core analytics columns', () => {
    for (const col of ['contact_consent', 'dvi_score', 'segment_vector', 'need_tags']) {
      expect(EXPORT_COLUMNS).toContain(col);
    }
  });
});

describe('buildCsv', () => {
  it('never emits contact PII even when the rows carry those fields', () => {
    const rows = [
      {
        assessment_id: 1,
        dvi_score: '4.20',
        contact_consent: true,
        contact_name: 'Jane Dela Cruz',
        contact_email: 'jane@example.com',
      },
    ];
    const csv = buildCsv(rows);
    expect(csv).not.toContain('Jane Dela Cruz');
    expect(csv).not.toContain('jane@example.com');
    expect(csv).not.toContain('contact_name');
    expect(csv).not.toContain('contact_email');
    // the non-PII fields still make it through
    expect(csv).toContain('4.20');
  });

  it('starts with a UTF-8 BOM and a header row', () => {
    const csv = buildCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(EXPORT_COLUMNS.join(','));
  });

  it('exports the enrichment columns (research-only, no contact PII)', () => {
    for (const col of [
      'enrichment_status', 'evidence_sentiment', 'interview_quality', 'themes',
      'quantified_pains', 'reconciliation_events', 'llm_inferred_cost_c',
      'suggested_need_tags',
    ]) {
      expect(EXPORT_COLUMNS).toContain(col);
    }
    // and still no contact PII smuggled in via the new columns
    for (const col of EXCLUDED_PII_COLUMNS) {
      expect(EXPORT_COLUMNS).not.toContain(col);
    }
  });

  it('exports the governance component and methodology version', () => {
    for (const col of ['governance_resonance_score_g', 'dvi_model_version', 'llm_inferred_governance_g']) {
      expect(EXPORT_COLUMNS).toContain(col);
    }
  });

  it('serializes a JSONB-as-text cell without "[object Object]"', () => {
    // The export SELECT casts JSONB to text, so buildCsv receives a string.
    const rows = [{ assessment_id: 1, themes: '["cost","localization"]' }];
    const csv = buildCsv(rows);
    expect(csv).toContain('cost');
    expect(csv).not.toContain('[object Object]');
  });
});

describe('csvCell', () => {
  it('returns empty string for null/undefined', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('neutralizes spreadsheet formula injection', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });

  it('quote-escapes cells containing comma, quote, or newline (RFC 4180)', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('leaves plain values untouched', () => {
    expect(csvCell('RR-AD')).toBe('RR-AD');
    expect(csvCell(4.2)).toBe('4.2');
  });
});
