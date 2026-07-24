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
import { isEnrichmentDisabled, type EnrichmentResult } from './enrichmentService';

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

    const inserted = (await sql`
      INSERT INTO aiaas_market_analysis (
        timestamp, segment_vector, ai_maturity_overlay, final_route,
        organization_type, current_work_type, ai_maturity, ai_work,
        main_problem, need_tags, competitor_benchmarked, friction_tags, use_case_tags,
        cost_barrier_score_c, technical_complexity_score_t, localization_gap_score_l, uvp_resonance_score_u, governance_resonance_score_g,
        dvi_score, dvi_model_version, interpretation, likelihood_to_try, first_use_pathway, timeframe, adoption_blockers,
        contact_consent, contact_name, contact_email, sanitized_summary, conversation_history
      ) VALUES (
        ${r.timestamp}, ${r.segment}, ${r.overlay}, ${r.route},
        ${r.organizationType}, ${r.currentWorkType}, ${r.aiMaturity}, ${r.aiWork},
        ${r.mainProblem}, ${r.needTags}, ${r.competitors}, ${r.frictionTags}, ${r.useCaseTags},
        ${r.costBarrier}, ${r.technicalComplexity}, ${r.localizationGap}, ${r.uvpResonance}, ${r.governanceResonance},
        ${r.dvi}, ${r.dviModelVersion}, ${r.interpretation}, ${r.likelihoodToTry}, ${r.firstUsePathway}, ${r.timeframe}, ${r.adoptionBlockers},
        ${r.contactConsent}, ${r.contactName}, ${r.contactEmail}, ${r.summary}, ${r.conversationHistory}
      )
      RETURNING assessment_id
    `) as { assessment_id: number | string }[];

    console.log('[neonSubmission] Interview inserted successfully');
    return {
      success: true,
      message: 'Interview submitted successfully',
      // BIGINT comes back from the driver as a string (precision-safe); it is
      // only ever used as an opaque id in a parameterized query, so keep it as-is.
      assessmentId: inserted[0]?.assessment_id,
    };
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

/**
 * Attaches the qualitative enrichment to an already-stored interview row.
 *
 * Best-effort: a `null` result (enrichment disabled, unconfigured, or failed)
 * flips the row to `skipped`/`failed` so coverage stays observable, and any DB
 * error is swallowed — enrichment must never surface as a submission failure.
 * JSONB columns are cast explicitly (`::jsonb`) since the params are JSON text.
 */
export async function updateEnrichment(
  assessmentId: number | string,
  enriched: EnrichmentResult | null,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    const sql = neon(process.env.DATABASE_URL);

    if (!enriched) {
      // Distinguish an intentional non-run (disabled / no key) from a genuine
      // runtime failure (timeout / model error) so enrichment_coverage stays honest.
      const status = isEnrichmentDisabled() ? 'skipped' : 'failed';
      await sql`
        UPDATE aiaas_market_analysis
        SET enrichment_status = ${status}
        WHERE assessment_id = ${assessmentId}
      `;
      return;
    }

    const e = enriched.enrichment;
    await sql`
      UPDATE aiaas_market_analysis SET
        enrichment_status  = 'ok',
        enrichment_model   = ${enriched.model},
        enrichment_version = ${enriched.version},
        enriched_at        = NOW(),
        themes                 = ${JSON.stringify(e.themes)}::jsonb,
        quantified_pains       = ${JSON.stringify(e.quantifiedPains)}::jsonb,
        evidence_sentiment     = ${e.sentiment},
        interview_quality      = ${e.interviewQuality},
        reconciliation_events  = ${JSON.stringify(e.reconciliationEvents)}::jsonb,
        llm_inferred_cost_c         = ${e.inferred.cost},
        llm_inferred_technical_t    = ${e.inferred.technical},
        llm_inferred_localization_l = ${e.inferred.localization},
        llm_inferred_uvp_u          = ${e.inferred.uvp},
        llm_inferred_rationale      = ${JSON.stringify(e.inferredRationale)}::jsonb,
        suggested_need_tags     = ${e.suggestedNeedTags.join('; ')},
        suggested_friction_tags = ${e.suggestedFrictionTags.join('; ')},
        suggested_use_case_tags = ${e.suggestedUseCaseTags.join('; ')}
      WHERE assessment_id = ${assessmentId}
    `;
    console.log('[neonSubmission] Enrichment attached');
  } catch (error: unknown) {
    safeLogError('[neonSubmission] Error attaching enrichment', error);
  }
}
