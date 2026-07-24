-- AIaaS Demand Viability Index (DVI) Chatbot - Neon PostgreSQL Schema
-- Run this once in your Neon database console before enabling STORAGE_PROVIDER=neon.
-- (Nothing is deployed yet; if you created an earlier version of this table,
--  DROP TABLE aiaas_market_analysis CASCADE; first, then re-run this file.)

CREATE TABLE IF NOT EXISTS aiaas_market_analysis (
  assessment_id                 BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  timestamp                     TIMESTAMPTZ  NOT NULL,
  segment_vector                TEXT         NOT NULL CHECK (segment_vector IN ('RR', 'DD')),
  ai_maturity_overlay           TEXT         NOT NULL CHECK (ai_maturity_overlay IN ('basic', 'AD')),
  final_route                   TEXT         NOT NULL CHECK (final_route IN ('RR-Basic', 'RR-AD', 'DD-Basic', 'DD-AD')),
  organization_type             TEXT,
  current_work_type             TEXT,
  ai_maturity                   TEXT,
  ai_work                       TEXT,        -- Advanced Demand: current AI-related work
  main_problem                  TEXT,        -- open-ended (chat phase)
  need_tags                     TEXT,        -- '; '-joined
  competitor_benchmarked        TEXT,        -- '; '-joined
  friction_tags                 TEXT,        -- '; '-joined
  use_case_tags                 TEXT,        -- '; '-joined
  -- DVI component self-ratings, each 0.0-5.0 (0 = not a barrier / not useful)
  cost_barrier_score_c          NUMERIC(3,1) NOT NULL CHECK (cost_barrier_score_c BETWEEN 0 AND 5),
  technical_complexity_score_t  NUMERIC(3,1) NOT NULL CHECK (technical_complexity_score_t BETWEEN 0 AND 5),
  localization_gap_score_l      NUMERIC(3,1) NOT NULL CHECK (localization_gap_score_l BETWEEN 0 AND 5),
  uvp_resonance_score_u         NUMERIC(3,1) NOT NULL CHECK (uvp_resonance_score_u BETWEEN 0 AND 5),
  -- Governance Resonance (G): 5th component (methodology v2). NULLABLE on purpose —
  -- pre-v2 rows have no value, and NULL must read as "not collected", never as 0.
  governance_resonance_score_g  NUMERIC(3,1) CHECK (governance_resonance_score_g BETWEEN 0 AND 5),
  -- Weighted Demand Viability Index, 0.00-5.00 (AD routes use AD-adjusted weights)
  dvi_score                     NUMERIC(3,2) NOT NULL CHECK (dvi_score BETWEEN 0 AND 5),
  dvi_model_version             TEXT         NOT NULL DEFAULT 'v1',  -- 'v1'=4 components; 'v2'=5 (adds G)
  -- Asset & Contribution axis (supply side; INDEPENDENT of the DVI). NULLABLE:
  -- pre-feature rows have no asset axis (NULL = not collected). See lib/matrix.ts.
  asset_possession_score        NUMERIC(3,1) CHECK (asset_possession_score BETWEEN 0 AND 5),
  asset_willingness_score       NUMERIC(3,1) CHECK (asset_willingness_score BETWEEN 0 AND 5),
  ac_score                      NUMERIC(3,2) CHECK (ac_score BETWEEN 0 AND 5),  -- min(possession, willingness)
  matrix_quadrant               TEXT CHECK (matrix_quadrant IN ('Anchor','Consumer','Contributor','Peripheral')),
  interpretation                TEXT,
  likelihood_to_try             TEXT,
  first_use_pathway             TEXT,
  timeframe                     TEXT,
  adoption_blockers             TEXT,
  contact_consent               BOOLEAN      NOT NULL DEFAULT FALSE,
  contact_name                  TEXT,        -- stored only with contact_consent = true
  contact_email                 TEXT,        -- stored only with contact_consent = true
  sanitized_summary             TEXT,
  conversation_history          TEXT,
  -- ── LLM qualitative enrichment (research-only; NEVER feeds DVI / route) ──────
  -- Populated by a second, structured LLM pass after the row is stored. Every
  -- column here is nullable and excluded from all DVI math. See
  -- docs/specs/llm-scope-expansion.md.
  enrichment_status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending','ok','failed','skipped')),
  enrichment_model              TEXT,
  enrichment_version            TEXT,
  enriched_at                   TIMESTAMPTZ,
  themes                        JSONB,   -- string[]
  quantified_pains              JSONB,   -- {metric,value,unit,context}[]
  evidence_sentiment            TEXT     CHECK (evidence_sentiment IN ('negative','mixed','neutral','positive')),
  interview_quality             TEXT     CHECK (interview_quality IN ('low','medium','high')),
  reconciliation_events         JSONB,   -- {component,conflict,outcome,rationale}[]
  -- Shadow (evidence-based) ratings — comparison only, EXCLUDED from dvi_score
  llm_inferred_cost_c           NUMERIC(3,1) CHECK (llm_inferred_cost_c          BETWEEN 0 AND 5),
  llm_inferred_technical_t      NUMERIC(3,1) CHECK (llm_inferred_technical_t     BETWEEN 0 AND 5),
  llm_inferred_localization_l   NUMERIC(3,1) CHECK (llm_inferred_localization_l  BETWEEN 0 AND 5),
  llm_inferred_uvp_u            NUMERIC(3,1) CHECK (llm_inferred_uvp_u           BETWEEN 0 AND 5),
  llm_inferred_governance_g     NUMERIC(3,1) CHECK (llm_inferred_governance_g    BETWEEN 0 AND 5),
  llm_inferred_rationale        JSONB,   -- {cost,technical,localization,uvp,governance: string}
  suggested_need_tags           TEXT,    -- '; '-joined
  suggested_friction_tags       TEXT,    -- '; '-joined
  suggested_use_case_tags       TEXT     -- '; '-joined
);

-- Idempotent migration for existing deployments (safe to re-run). New installs
-- already get these from the CREATE TABLE above; this block upgrades a table
-- created before the enrichment pass without dropping it.
ALTER TABLE aiaas_market_analysis
  ADD COLUMN IF NOT EXISTS asset_possession_score  NUMERIC(3,1)
    CHECK (asset_possession_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS asset_willingness_score NUMERIC(3,1)
    CHECK (asset_willingness_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS ac_score                NUMERIC(3,2)
    CHECK (ac_score BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS matrix_quadrant         TEXT
    CHECK (matrix_quadrant IN ('Anchor','Consumer','Contributor','Peripheral')),
  ADD COLUMN IF NOT EXISTS governance_resonance_score_g NUMERIC(3,1)
    CHECK (governance_resonance_score_g BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS dvi_model_version            TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS llm_inferred_governance_g    NUMERIC(3,1)
    CHECK (llm_inferred_governance_g BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending','ok','failed','skipped')),
  ADD COLUMN IF NOT EXISTS enrichment_model            TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_version          TEXT,
  ADD COLUMN IF NOT EXISTS enriched_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS themes                      JSONB,
  ADD COLUMN IF NOT EXISTS quantified_pains            JSONB,
  ADD COLUMN IF NOT EXISTS evidence_sentiment          TEXT
    CHECK (evidence_sentiment IN ('negative','mixed','neutral','positive')),
  ADD COLUMN IF NOT EXISTS interview_quality           TEXT
    CHECK (interview_quality IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS reconciliation_events       JSONB,
  ADD COLUMN IF NOT EXISTS llm_inferred_cost_c         NUMERIC(3,1)
    CHECK (llm_inferred_cost_c         BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS llm_inferred_technical_t    NUMERIC(3,1)
    CHECK (llm_inferred_technical_t    BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS llm_inferred_localization_l NUMERIC(3,1)
    CHECK (llm_inferred_localization_l BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS llm_inferred_uvp_u          NUMERIC(3,1)
    CHECK (llm_inferred_uvp_u          BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS llm_inferred_rationale      JSONB,
  ADD COLUMN IF NOT EXISTS suggested_need_tags         TEXT,
  ADD COLUMN IF NOT EXISTS suggested_friction_tags     TEXT,
  ADD COLUMN IF NOT EXISTS suggested_use_case_tags     TEXT;

-- Aggregate demand views for the researcher dashboard (a planned follow-up).
CREATE OR REPLACE VIEW dvi_by_vector AS
SELECT
  segment_vector,
  COUNT(*)                                     AS interviews,
  ROUND(AVG(dvi_score), 2)                     AS avg_dvi,
  ROUND(AVG(cost_barrier_score_c), 2)          AS avg_cost_barrier,
  ROUND(AVG(technical_complexity_score_t), 2)  AS avg_technical_complexity,
  ROUND(AVG(localization_gap_score_l), 2)      AS avg_localization_gap,
  ROUND(AVG(uvp_resonance_score_u), 2)         AS avg_uvp_resonance,
  ROUND(AVG(governance_resonance_score_g), 2)  AS avg_governance_resonance
FROM aiaas_market_analysis
GROUP BY segment_vector;

CREATE OR REPLACE VIEW dvi_by_overlay AS
SELECT ai_maturity_overlay, COUNT(*) AS interviews, ROUND(AVG(dvi_score), 2) AS avg_dvi
FROM aiaas_market_analysis
GROUP BY ai_maturity_overlay;

CREATE OR REPLACE VIEW dvi_by_route AS
SELECT final_route, COUNT(*) AS interviews, ROUND(AVG(dvi_score), 2) AS avg_dvi
FROM aiaas_market_analysis
GROUP BY final_route;

-- Overall rollup: one row summarising the whole dataset for the KPI header.
CREATE OR REPLACE VIEW dvi_overall AS
SELECT
  COUNT(*)                                     AS interviews,
  ROUND(AVG(dvi_score), 2)                     AS avg_dvi,
  ROUND(AVG(cost_barrier_score_c), 2)          AS avg_cost_barrier,
  ROUND(AVG(technical_complexity_score_t), 2)  AS avg_technical_complexity,
  ROUND(AVG(localization_gap_score_l), 2)      AS avg_localization_gap,
  ROUND(AVG(uvp_resonance_score_u), 2)         AS avg_uvp_resonance,
  ROUND(AVG(governance_resonance_score_g), 2)  AS avg_governance_resonance,
  COUNT(*) FILTER (WHERE contact_consent)      AS contact_consented,
  MAX(created_at)                              AS latest_submission
FROM aiaas_market_analysis;

-- DVI band distribution (Weak <1.5, Limited 1.5-2.5, Moderate 2.5-3.5, Strong >=3.5).
-- sort_order keeps the bands in ascending strength for charting; empty bands are
-- surfaced via the LEFT JOIN so the dashboard always shows all four.
CREATE OR REPLACE VIEW dvi_band_distribution AS
WITH bands(band, sort_order) AS (
  VALUES ('Weak', 1), ('Limited', 2), ('Moderate', 3), ('Strong', 4)
),
scored AS (
  SELECT
    CASE
      WHEN dvi_score < 1.5 THEN 'Weak'
      WHEN dvi_score < 2.5 THEN 'Limited'
      WHEN dvi_score < 3.5 THEN 'Moderate'
      ELSE 'Strong'
    END AS band
  FROM aiaas_market_analysis
)
SELECT b.band, b.sort_order, COUNT(s.band) AS interviews
FROM bands b
LEFT JOIN scored s ON s.band = b.band
GROUP BY b.band, b.sort_order
ORDER BY b.sort_order;

-- Demand signal for the proposed fine-tuning / model-training workbench.
-- Matches the instrumented option strings across the need, use-case, and
-- first-use fields (see lib/questions.ts). One row: how many respondents
-- signalled workbench interest, and the share of all respondents.
CREATE OR REPLACE VIEW workbench_demand AS
WITH flagged AS (
  SELECT
    (
      need_tags ILIKE '%fine-tun%' OR need_tags ILIKE '%train%'
      OR use_case_tags ILIKE '%fine-tun%' OR use_case_tags ILIKE '%train%'
      OR first_use_pathway ILIKE '%fine-tun%' OR first_use_pathway ILIKE '%train%'
    ) AS wants_workbench
  FROM aiaas_market_analysis
)
SELECT
  COUNT(*)                                   AS interviews,
  COUNT(*) FILTER (WHERE wants_workbench)     AS workbench_interested,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE wants_workbench) / NULLIF(COUNT(*), 0),
    1
  )                                          AS workbench_interest_pct
FROM flagged;

-- ── Enrichment research views (only rows the LLM pass successfully coded) ──────

-- Theme frequency across the corpus.
CREATE OR REPLACE VIEW theme_frequency AS
SELECT theme, COUNT(*) AS mentions
FROM aiaas_market_analysis, jsonb_array_elements_text(themes) AS theme
WHERE enrichment_status = 'ok'
GROUP BY theme
ORDER BY mentions DESC;

-- Self-report vs evidence-based (shadow) rating gap per route — a bias signal.
-- Positive gap = respondents rated the barrier higher than the evidence supports.
CREATE OR REPLACE VIEW self_vs_inferred AS
SELECT final_route,
  COUNT(*)                                                              AS interviews,
  ROUND(AVG(cost_barrier_score_c          - llm_inferred_cost_c), 2)         AS cost_gap,
  ROUND(AVG(technical_complexity_score_t  - llm_inferred_technical_t), 2)    AS technical_gap,
  ROUND(AVG(localization_gap_score_l      - llm_inferred_localization_l), 2) AS localization_gap,
  ROUND(AVG(uvp_resonance_score_u         - llm_inferred_uvp_u), 2)          AS uvp_gap,
  ROUND(AVG(governance_resonance_score_g  - llm_inferred_governance_g), 2)   AS governance_gap
FROM aiaas_market_analysis
WHERE enrichment_status = 'ok'
GROUP BY final_route;

-- Reconciliation rate: share of interviews where a self-rating was revised.
CREATE OR REPLACE VIEW reconciliation_rate AS
SELECT final_route,
  COUNT(*)                                                        AS interviews,
  COUNT(*) FILTER (WHERE reconciliation_events @> '[{"outcome":"revised"}]') AS revised
FROM aiaas_market_analysis
WHERE enrichment_status = 'ok'
GROUP BY final_route;

-- Enrichment coverage: how much of the corpus has been coded, by status.
CREATE OR REPLACE VIEW enrichment_coverage AS
SELECT enrichment_status, COUNT(*) AS interviews
FROM aiaas_market_analysis
GROUP BY enrichment_status;

-- ── Demand × Asset matrix (feature 002) ──────────────────────────────────────
-- Quadrant counts across respondents who have the asset axis (ac_score set).
-- Anchor = high demand + high asset (seed + consume); Consumer = high demand,
-- low asset; Contributor = low demand, high asset; Peripheral = low + low.
CREATE OR REPLACE VIEW demand_asset_matrix AS
SELECT matrix_quadrant AS quadrant, COUNT(*) AS interviews
FROM aiaas_market_analysis
WHERE matrix_quadrant IS NOT NULL
GROUP BY matrix_quadrant;

-- Matrix quadrant distribution per final route (RR/DD × basic/AD).
CREATE OR REPLACE VIEW matrix_by_route AS
SELECT final_route, matrix_quadrant AS quadrant, COUNT(*) AS interviews
FROM aiaas_market_analysis
WHERE matrix_quadrant IS NOT NULL
GROUP BY final_route, matrix_quadrant
ORDER BY final_route, matrix_quadrant;
