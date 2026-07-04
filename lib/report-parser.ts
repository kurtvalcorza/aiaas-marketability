/**
 * Chat-phase parsing helpers.
 *
 * The form owns the structured data (route, ratings, tags, intent, contact).
 * The chat only contributes the open-ended problem statement and the summary
 * prose, and may emit a re-rate directive. These helpers extract exactly that.
 */

import {
  INTERVIEW_COMPLETE_MARKER,
  FIELDS_MARKER,
  RERATE_PATTERN,
  RERATE_PATTERN_GLOBAL,
  RerateComponent,
} from './constants/parsing';
import { DVIScores } from './types';

/** Maps a re-rate component keyword to the DVIScores field it targets. */
export const RERATE_FIELD: Record<RerateComponent, keyof DVIScores> = {
  cost: 'costBarrier',
  technical: 'technicalComplexity',
  localization: 'localizationGap',
  uvp: 'uvpResonance',
};

/** Returns the re-rate component requested in the text, or null. */
export function parseRerateRequest(text: string): RerateComponent | null {
  const m = text.match(RERATE_PATTERN);
  return m ? (m[1].toLowerCase() as RerateComponent) : null;
}

/** Removes all re-rate directives from displayed text. */
export function stripRerateDirectives(text: string): string {
  return text.replace(RERATE_PATTERN_GLOBAL, '').trim();
}

/** Whether the chat has produced the final report. */
export function isInterviewComplete(content: string): boolean {
  if (content.includes(INTERVIEW_COMPLETE_MARKER)) return true;
  // Fallback: the visible summary heading plus the fields block.
  return content.includes('## Your AIaaS Demand Summary') && content.includes(FIELDS_MARKER);
}

/**
 * Returns only the respondent-facing summary: everything before the FIELDS
 * block, with the completion marker and any re-rate directives removed.
 */
export function getRespondentSummary(content: string): string {
  const visible = content.split(FIELDS_MARKER)[0].replace(INTERVIEW_COMPLETE_MARKER, '');
  return stripRerateDirectives(visible).trim();
}

/** Extracts the open-ended main-problem statement from the FIELDS block. */
export function extractMainProblem(content: string): string {
  const fields = content.split(FIELDS_MARKER)[1] ?? '';
  const m = fields.match(/Main Problem:\s*(.+)/i);
  return m?.[1]?.trim() ?? '';
}
