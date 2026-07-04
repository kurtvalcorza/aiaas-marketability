/**
 * Neon Submission Service
 * Inserts interview data into a Neon (serverless PostgreSQL) database.
 * Run schema.sql once in your Neon console before enabling this service.
 */

import { neon } from '@neondatabase/serverless';
import { InterviewData } from '@/lib/types';
import { SubmissionResult } from './submissionService';
import { buildSubmissionRecord } from './submissionRecord';
import { safeLogError } from '@/lib/safe-logger';

const QUERY_TIMEOUT_MS = 10_000;

export async function submitToNeon(data: InterviewData): Promise<SubmissionResult> {
  if (!process.env.DATABASE_URL) {
    console.error('[neonSubmission] DATABASE_URL is not configured - interview cannot be stored');
    return {
      success: false,
      message: 'Submission failed. Please try again.',
      error: 'DATABASE_URL is not configured',
    };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort('Neon query timed out'), QUERY_TIMEOUT_MS);

  try {
    const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: abortController.signal } });
    const r = buildSubmissionRecord(data);

    await sql`
      INSERT INTO aiaas_market_analysis (
        timestamp, segment_vector, ai_maturity_overlay, final_route,
        organization_type, current_work_type, ai_maturity, ai_work,
        main_problem, need_tags, competitor_benchmarked, friction_tags, use_case_tags,
        cost_barrier_score_c, technical_complexity_score_t, localization_gap_score_l, uvp_resonance_score_u,
        dvi_score, interpretation, likelihood_to_try, first_use_pathway, timeframe, adoption_blockers,
        contact_consent, contact_name, contact_email, sanitized_summary, conversation_history
      ) VALUES (
        ${r.timestamp}, ${r.segment}, ${r.overlay}, ${r.route},
        ${r.organizationType}, ${r.currentWorkType}, ${r.aiMaturity}, ${r.aiWork},
        ${r.mainProblem}, ${r.needTags}, ${r.competitors}, ${r.frictionTags}, ${r.useCaseTags},
        ${r.costBarrier}, ${r.technicalComplexity}, ${r.localizationGap}, ${r.uvpResonance},
        ${r.dvi}, ${r.interpretation}, ${r.likelihoodToTry}, ${r.firstUsePathway}, ${r.timeframe}, ${r.adoptionBlockers},
        ${r.contactConsent}, ${r.contactName}, ${r.contactEmail}, ${r.summary}, ${r.conversationHistory}
      )
    `;

    console.log('[neonSubmission] Interview inserted successfully');
    return { success: true, message: 'Interview submitted successfully' };
  } catch (error: unknown) {
    safeLogError('[neonSubmission] Error inserting interview', error);
    return {
      success: false,
      message: 'Submission failed. Please try again.',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
