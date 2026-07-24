# Data Model — Governance Resonance (5th DVI Component)

## DVIScores (`lib/types.ts`)

| Field | Type | Range | Notes |
|---|---|---|---|
| costBarrier | number | 0.0–5.0 | existing (C) |
| technicalComplexity | number | 0.0–5.0 | existing (T) |
| localizationGap | number | 0.0–5.0 | existing (L) |
| uvpResonance | number | 0.0–5.0 | existing (U) |
| **governanceResonance** | number | 0.0–5.0 | **new (G)** — resonance-type |

## Weight model (`lib/dvi.ts`, `DVI_WEIGHTS`)

| Overlay | C | T | L | U | G | Σ |
|---|---|---|---|---|---|---|
| basic | 0.25 | 0.20 | 0.25 | 0.15 | 0.15 | 1.00 |
| AD | 0.35 | 0.10 | 0.25 | 0.15 | 0.15 | 1.00 |

- `computeDVI` adds `w.governanceResonance * clampScore(scores.governanceResonance)`.
- New export: `DVI_MODEL_VERSION = 'v2'`.
- Bands and `[0.0, 5.0]` output range unchanged.

## FormState (`lib/questions.ts`)

| Field | Type | Default | Notes |
|---|---|---|---|
| **govRating** | number | -1 | new 0–5 self-rating (uses `USEFULNESS_SCALE`) |
| **govTags** | string[] | [] | new; merged into `frictionTags` (not a separate column) |

New option list `GOV_TAG_OPTIONS` (evidence tags), e.g.: Data residency / on-shore hosting · Data
ownership & IP retention · Public-sector / DOST alignment · Avoiding vendor lock-in · Auditability &
transparency · Local accountability. (Final wording confirmed in implement.)

`formToInterviewCore`: `scores.governanceResonance = form.govRating`; `friction = dedupe([...existing,
...form.govTags])`.

## InterviewRecord (`lib/types.ts`) & storage

| Field (record) | DB column | Type | Null? | Notes |
|---|---|---|---|---|
| governanceResonance | governance_resonance_score_g | NUMERIC(3,1) CHECK 0–5 | **NULLABLE** | new; NULL for pre-v2 rows |
| dviModelVersion | dvi_model_version | TEXT NOT NULL DEFAULT 'v1' | no | new inserts stamp 'v2' |

Existing component columns (`cost_barrier_score_c` … `uvp_resonance_score_u`) stay `NOT NULL`. The new
component is nullable *specifically* so historical records read as "not collected" rather than 0.

### Views (`schema.sql`)
- `dvi_by_vector`, `dvi_overall`: add `ROUND(AVG(governance_resonance_score_g), 2) AS avg_governance_resonance` (NULLs ignored by AVG).
- `self_vs_inferred`: add `governance_gap` (self − shadow), gated on `enrichment_status='ok'`.
- Shadow column `llm_inferred_governance_g NUMERIC(3,1) CHECK 0–5` (research-only, excluded from DVI).

## Validation (`lib/schemas.ts`)
- `dviScoresSchema` gains `governanceResonance: scoreSchema` (0.0–5.0).
- `dvi_model_version` is app-stamped in the record builder, not part of the client-submitted
  `interviewDataSchema` (it is not user input).

## State transitions
- Form: `govRating` starts at `-1` (unset) → respondent selects 0–5 → included in `computeDVI`.
- Re-rate: `[[RERATE:governance]]` → app re-collects `govRating` → `rerate('governance', v)` → DVI
  recomputed (5 components).
