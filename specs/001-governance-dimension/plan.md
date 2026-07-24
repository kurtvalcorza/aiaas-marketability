# Implementation Plan — Governance Resonance (5th DVI Component)

**Feature:** `001-governance-dimension` · **Spec:** `./spec.md` · **Date:** 2026-07-24

## Technical Context

- **Stack:** TypeScript, Next.js 16 (App Router), React 19, Zod (runtime validation), Vitest (tests).
- **Storage:** Neon PostgreSQL (primary, `aiaas_market_analysis`) + optional Google Sheets webhook;
  one record builder (`services/submissionRecord.ts`) feeds both.
- **Scoring:** deterministic, app-owned (`lib/dvi.ts`); model never scores (FR-064).
- **Interfaces touched:** internal modules + one external interface delta — the `POST /api/submit`
  payload gains `scores.governanceResonance` (see `contracts/submit-payload.md`).
- **Unknowns:** none remaining (weight scheme resolved in clarify → Scheme A).

## Constitution Check

| Principle | Impact | Verdict |
|---|---|---|
| 1 — App-owned deterministic scoring | G is an app-computed self-rating; weights (Scheme A) sum to 1.0 per overlay; clamped `[0,5]` | ✅ PASS (add weight-sum test) |
| 2 — Respondent/internal boundary (FR-064) | G never emitted or narrated by the model; only `[[RERATE:governance]]` signal | ✅ PASS |
| 3 — Privacy & consent | No PII introduced; consent/redaction unchanged | ✅ PASS |
| 4 — Defense in depth; injection-proof | Zod range 0–5 + DB CHECK; a jailbreak cannot alter G | ✅ PASS |
| 5 — Single source of truth for data shape | G added to types ↔ Zod ↔ `schema.sql` ↔ record builder ↔ both backends in ONE change | ✅ PASS (tracked as a single task group) |
| 6 — Type safety & testability | New tests: weight sums (both overlays), 5-component computeDVI, form→core mapping | ✅ PASS |
| 7 — Versioned methodology | `dvi_model_version` v1→v2; prior records not recomputed; docs updated | ✅ PASS |

**No unjustified violations. Gate: PASS.**

## Phase 0 — Research

See `./research.md`. Resolved decisions:
1. Governance sub-factor tags **merge into `frictionTags`** (like the existing cost/tech/loc tags) —
   no new tag column.
2. Backward compatibility: new `governance_resonance_score_g` column is **NULLABLE**; add
   `dvi_model_version TEXT NOT NULL DEFAULT 'v1'`; new inserts stamp `'v2'`. Prior rows stay v1 with
   NULL governance — never recomputed (FR-108).
3. Weights: **Scheme A** — `basic` C.25 T.20 L.25 U.15 G.15; `AD` C.35 T.10 L.25 U.15 G.15.
4. Governance is **resonance-type** (higher = more demand), parallel to UVP.
5. Enrichment parity: add shadow column `llm_inferred_governance_g` + view columns now; the
   enrichment **prompt/service** update is a bounded, research-only follow-up (never feeds DVI).
6. Reconciliation: extend the re-rate component set so `[[RERATE:governance]]` re-collects G.
7. Migration is **idempotent** (`ADD COLUMN IF NOT EXISTS`), matching the existing enrichment block.

## Phase 1 — Design

See `./data-model.md`, `./contracts/submit-payload.md`, `./quickstart.md`.

### Touch points (single coordinated change — Principle 5)

**Scoring core**
- `lib/dvi.ts` — add `governanceResonance` to `DVI_WEIGHTS.basic` and `.AD`; add term to
  `computeDVI`; export `DVI_MODEL_VERSION = 'v2'`.
- `lib/types.ts` — `DVIScores` += `governanceResonance`; `InterviewRecord` += `governanceResonance`,
  `dviModelVersion`.

**Form & mapping**
- `lib/questions.ts` — `FormState` += `govRating`, `govTags`; `emptyForm` defaults; add
  `GOV_TAG_OPTIONS` + a governance question using `USEFULNESS_SCALE`; `buildFormContext` += gov line;
  `formToInterviewCore` — put `govRating` into `scores.governanceResonance` and merge `govTags` into
  the friction list.
- `components/InterviewForm.tsx` — render the governance rating + optional tag group (read during
  implement).

**Validation & persistence (all in the same change)**
- `lib/schemas.ts` — `dviScoresSchema` += `governanceResonance: scoreSchema`.
- `services/submissionRecord.ts` — map `governanceResonance` + stamp `dviModelVersion`.
- `services/neonSubmissionService.ts` — INSERT the two new columns.
- `services/submissionService.ts` — Google Sheets record parity.
- `schema.sql` — `governance_resonance_score_g NUMERIC(3,1)` NULLABLE `CHECK 0–5`;
  `dvi_model_version TEXT NOT NULL DEFAULT 'v1'`; idempotent `ALTER … ADD COLUMN IF NOT EXISTS`;
  add `avg_governance_resonance` to `dvi_by_vector`/`dvi_overall`; `governance_gap` to
  `self_vs_inferred`; shadow col `llm_inferred_governance_g`.

**Reconciliation**
- `lib/systemPrompt.ts` — allow the model to emit `[[RERATE:governance]]` on a G contradiction.
- `lib/report-parser.ts` + `hooks/useInterviewFlow.ts` — extend the re-rate component set to include
  governance; `rerate()` recomputes the 5-component DVI.

**Docs**
- `ARCHITECTURE.md` (DVI component table + weights), `README.md`, and a new
  `docs/specs/governance-dimension.md` methodology note (five components, Scheme A, v1→v2).

**Tests**
- `tests/` — weight-set sums = 1.0 for both overlays (5 components); `computeDVI` with G; band
  boundaries preserved; `formToInterviewCore` maps `govRating`→`governanceResonance` and merges
  `govTags`; Zod accepts/【rejects out-of-range G; record builder includes the new fields + version.

## Not doing (per spec Out of Scope)
- No re-tuning of C/T/L/U meanings; no retroactive re-scoring; no dashboard redesign beyond adding
  the new component where the four already appear; competitor list unchanged (Azure/IBM already present).

**Gate: PASS — ready for `speckit-tasks`.**
