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
  -- Weighted Demand Viability Index, 0.00-5.00 (AD routes use AD-adjusted weights)
  dvi_score                     NUMERIC(3,2) NOT NULL CHECK (dvi_score BETWEEN 0 AND 5),
  interpretation                TEXT,
  likelihood_to_try             TEXT,
  first_use_pathway             TEXT,
  timeframe                     TEXT,
  adoption_blockers             TEXT,
  contact_consent               BOOLEAN      NOT NULL DEFAULT FALSE,
  contact_name                  TEXT,        -- stored only with contact_consent = true
  contact_email                 TEXT,        -- stored only with contact_consent = true
  sanitized_summary             TEXT,
  conversation_history          TEXT
);

-- Aggregate demand views for the researcher dashboard (a planned follow-up).
CREATE OR REPLACE VIEW dvi_by_vector AS
SELECT
  segment_vector,
  COUNT(*)                                     AS interviews,
  ROUND(AVG(dvi_score), 2)                     AS avg_dvi,
  ROUND(AVG(cost_barrier_score_c), 2)          AS avg_cost_barrier,
  ROUND(AVG(technical_complexity_score_t), 2)  AS avg_technical_complexity,
  ROUND(AVG(localization_gap_score_l), 2)      AS avg_localization_gap,
  ROUND(AVG(uvp_resonance_score_u), 2)         AS avg_uvp_resonance
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
