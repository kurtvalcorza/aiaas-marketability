import { describe, it, expect } from 'vitest';
import {
  isInterviewComplete,
  getRespondentSummary,
  extractMainProblem,
  parseRerateRequest,
  stripRerateDirectives,
  RERATE_FIELD,
} from '@/lib/report-parser';

const finalReport = `## Your AIaaS Demand Summary

**Main friction:** Cloud cost and data residency limit their use of commercial AI.
**How the AIaaS platform could help:** A localized secure inference tier would address cost and sovereignty.
**Possible adoption step:** Piloting secure inference for one project.

_The DVI is a preliminary, study-specific operational index — not a formal validated scale, certification, or proof of market demand._

###FIELDS###
Main Problem: We need lower-cost localized inference for policy analytics.

###INTERVIEW_COMPLETE###`;

describe('chat parsing', () => {
  describe('isInterviewComplete', () => {
    it('detects the completion marker', () => {
      expect(isInterviewComplete(finalReport)).toBe(true);
    });
    it('detects completion via the summary heading + fields block when the marker is missing', () => {
      expect(isInterviewComplete(finalReport.replace('###INTERVIEW_COMPLETE###', ''))).toBe(true);
    });
    it('returns false for a normal message', () => {
      expect(isInterviewComplete('What is the main problem you are solving?')).toBe(false);
    });
  });

  describe('getRespondentSummary', () => {
    it('returns the visible summary and hides the fields block and marker', () => {
      const s = getRespondentSummary(finalReport);
      expect(s).toContain('Main friction');
      expect(s).toContain('study-specific operational index');
      expect(s).not.toContain('###FIELDS###');
      expect(s).not.toContain('Main Problem');
      expect(s).not.toContain('###INTERVIEW_COMPLETE###');
    });
    it('strips re-rate directives from displayed text', () => {
      const s = getRespondentSummary('You rated Cost 0 but flagged billing. [[RERATE:cost]]');
      expect(s).not.toContain('[[RERATE');
      expect(s).toContain('flagged billing');
    });
  });

  describe('extractMainProblem', () => {
    it('reads the main problem from the fields block', () => {
      expect(extractMainProblem(finalReport)).toBe('We need lower-cost localized inference for policy analytics.');
    });
    it('returns empty string when absent', () => {
      expect(extractMainProblem('no fields here')).toBe('');
    });
  });

  describe('re-rate directive', () => {
    it('parses the targeted component', () => {
      expect(parseRerateRequest('please revise [[RERATE:technical]]')).toBe('technical');
      expect(parseRerateRequest('[[RERATE:UVP]]')).toBe('uvp');
      expect(parseRerateRequest('no directive')).toBeNull();
    });
    it('strips all directives', () => {
      expect(stripRerateDirectives('a [[RERATE:cost]] b [[RERATE:localization]]')).not.toContain('[[RERATE');
    });
    it('maps components to score fields', () => {
      expect(RERATE_FIELD.cost).toBe('costBarrier');
      expect(RERATE_FIELD.technical).toBe('technicalComplexity');
      expect(RERATE_FIELD.localization).toBe('localizationGap');
      expect(RERATE_FIELD.uvp).toBe('uvpResonance');
    });
  });
});
