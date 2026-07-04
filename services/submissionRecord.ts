/**
 * Submission Record Builder
 * Single source of truth for mapping InterviewData to the flat record
 * persisted by every storage backend (Google Sheets, Neon PostgreSQL).
 */

import { InterviewData, InterviewRecord } from '@/lib/types';
import { sanitizePII, truncateText } from '@/lib/validation';
import { MAX_CONVERSATION_HISTORY_SIZE } from '@/lib/constants';

export type SubmissionRecord = InterviewRecord;

const NUL = String.fromCharCode(0);

function stripNullChars(text: string): string {
  return text.split(NUL).join('');
}

/** Redacts PII then strips NULs from a free-text field. */
function clean(text: string): string {
  return stripNullChars(sanitizePII(text));
}

/**
 * Builds the storage record for an interview submission.
 *
 * Contact consent gates the name and work email — they are stored ONLY when the
 * respondent agreed to be contacted. PII redaction and the conversation-history
 * size cap are re-applied server-side. Contact name/email are stored verbatim
 * (with consent) rather than PII-redacted, since they are the intended fields.
 */
export function buildSubmissionRecord(data: InterviewData): InterviewRecord {
  const conversationHistory = truncateText(
    sanitizePII(data.conversationHistory || ''),
    MAX_CONVERSATION_HISTORY_SIZE
  );

  const consented = data.contactConsent === true;

  return {
    timestamp: stripNullChars(data.timestamp),
    segment: stripNullChars(data.segment),
    overlay: stripNullChars(data.overlay),
    route: stripNullChars(data.route),
    organizationType: clean(data.organizationType),
    currentWorkType: clean(data.currentWorkType),
    aiMaturity: clean(data.aiMaturity),
    aiWork: clean(data.aiWork),
    mainProblem: clean(data.mainProblem),
    needTags: clean(data.needTags.join('; ')),
    competitors: clean(data.competitors),
    frictionTags: clean(data.frictionTags.join('; ')),
    useCaseTags: clean(data.useCaseTags.join('; ')),
    costBarrier: data.scores.costBarrier,
    technicalComplexity: data.scores.technicalComplexity,
    localizationGap: data.scores.localizationGap,
    uvpResonance: data.scores.uvpResonance,
    dvi: data.dvi,
    interpretation: stripNullChars(data.interpretation),
    likelihoodToTry: clean(data.likelihoodToTry),
    firstUsePathway: clean(data.firstUsePathway),
    timeframe: clean(data.timeframe),
    adoptionBlockers: clean(data.adoptionBlockers),
    contactConsent: consented,
    contactName: consented ? stripNullChars(data.contactName) : '',
    contactEmail: consented ? stripNullChars(data.contactEmail) : '',
    summary: clean(data.summary),
    conversationHistory: stripNullChars(conversationHistory),
  };
}
