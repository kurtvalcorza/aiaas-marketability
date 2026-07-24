# Tasks — Governance Resonance (5th DVI Component)

**Feature:** `001-governance-dimension` · **Plan:** `./plan.md` · **Tests:** required (FR-110, Constitution P6)

Legend: `[P]` = parallelizable (different files, no incomplete dependency). Story labels: `[US1]`
respondent can rate governance · `[US2]` governance reconciliation. Foundational/Setup/Polish carry
no story label.

## Phase 1: Setup
- [x] T001 Confirm Vitest runs green on a clean checkout (`npm install && npm test`) to establish a baseline before changes.

## Phase 2: Foundational — scoring core + data-shape spine (BLOCKS all stories; land together per Constitution Principle 5)
- [x] T002 Add `governanceResonance: number` to `DVIScores`, and `governanceResonance: number` + `dviModelVersion: string` to `InterviewRecord`, in `lib/types.ts`.
- [x] T003 In `lib/dvi.ts`: add `governanceResonance` to `DVI_WEIGHTS.basic` (0.15) and `DVI_WEIGHTS.AD` (0.15) with the Scheme-A re-weighting (basic C.25 T.20 L.25 U.15; AD C.35 T.10 L.25 U.15); add the G term to `computeDVI`; export `DVI_MODEL_VERSION = 'v2'`. (dep: T002)
- [x] T004 [P] In `lib/schemas.ts`: add `governanceResonance: scoreSchema` to `dviScoresSchema`. (dep: T002)
- [x] T005 [P] Migrate `schema.sql`: add NULLABLE `governance_resonance_score_g NUMERIC(3,1) CHECK (… BETWEEN 0 AND 5)` and `dvi_model_version TEXT NOT NULL DEFAULT 'v1'` to the `CREATE TABLE` and to an idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` block; add `avg_governance_resonance` to `dvi_by_vector` and `dvi_overall`; add `governance_gap` to `self_vs_inferred`; add shadow column `llm_inferred_governance_g NUMERIC(3,1) CHECK (… BETWEEN 0 AND 5)`.
- [x] T006 In `services/submissionRecord.ts`: map `governanceResonance: data.scores.governanceResonance` and stamp `dviModelVersion: DVI_MODEL_VERSION`. (dep: T002, T003)
- [x] T007 [P] In `services/neonSubmissionService.ts`: add `governance_resonance_score_g` and `dvi_model_version` to the parameterized INSERT column/value list. (dep: T006)
- [x] T008 [P] In `services/submissionService.ts`: add the two new fields to the Google Sheets record mapping so the backends do not drift. (dep: T006)

## Phase 3: [US1] Respondent can rate governance
**Goal:** the form collects a 0–5 governance rating + optional tags; the DVI is computed from five components.
**Independent test:** completing the form yields `scores.governanceResonance ∈ [0,5]` and a five-component DVI.
- [x] T009 [US1] In `lib/questions.ts`: add `govRating: number` and `govTags: string[]` to `FormState`; default them in `emptyForm` (`govRating: -1`, `govTags: []`); add `GOV_TAG_OPTIONS`; add the governance question using `USEFULNESS_SCALE`; add a governance line to `buildFormContext`; in `formToInterviewCore` set `scores.governanceResonance = form.govRating` and merge `form.govTags` into the friction list. (dep: T002, T003)
- [x] T010 [US1] In `components/InterviewForm.tsx`: render the governance rating control (0–5) and the optional governance tag group, wired to `govRating`/`govTags`. (dep: T009)

## Phase 4: [US2] Governance reconciliation (re-rate)
**Goal:** a governance rating that contradicts the governance tags can be re-collected by the app.
**Independent test:** a `[[RERATE:governance]]` directive triggers app re-collection and a recomputed DVI; the model never writes the number.
- [x] T011 [US2] In `lib/systemPrompt.ts`: permit the model to emit a bare `[[RERATE:governance]]` directive on a governance rating–tag contradiction (mirror the existing per-component reconciliation guidance).
- [x] T012 [US2] In `lib/report-parser.ts`: extend the re-rate component set/parsing to recognize `governance`. 
- [x] T013 [US2] In `hooks/useInterviewFlow.ts`: extend the `RerateComponent` type and `rerate()` so `rerate('governance', v)` updates the score and recomputes the five-component DVI. (dep: T012, T003)

## Phase 5: Tests (required)
- [x] T014 [P] In `tests/dvi.test.ts`: assert both overlays' five weights sum to 1.0; add `computeDVI` cases incl. governance (e.g. `AD` C5 T0 L5 U0 G5 → 3.75; all-zero → 0.00); confirm band boundaries unchanged. (dep: T003)
- [x] T015 [P] In `tests/questions.test.ts`: assert `formToInterviewCore` maps `govRating`→`scores.governanceResonance` and merges `govTags` into `frictionTags`. (dep: T009)
- [x] T016 [P] In `tests/services/submissionRecord.test.ts`: assert the built record includes `governanceResonance` and `dviModelVersion === 'v2'`. (dep: T006)
- [x] T017 [P] Add a Zod case (in `tests/questions.test.ts` or a schemas test) asserting `dviScoresSchema` accepts `governanceResonance` in `[0,5]` and rejects out-of-range values. (dep: T004)
- [x] T018 [P] In `tests/services/neonSubmissionService.test.ts`: assert the INSERT carries the two new columns. (dep: T007)

## Phase 6: Polish & docs
- [x] T019 [P] Update the DVI component/weights table in `ARCHITECTURE.md` to five components (Scheme A) and note `dvi_model_version`.
- [x] T020 [P] Update `README.md` to describe the five-component index.
- [x] T021 [P] Add `docs/specs/governance-dimension.md` — methodology note: five components, Scheme-A weights, resonance-type G, v1→v2 versioning, no retroactive recompute.
- [x] T022 Run `./quickstart.md`: `npm test`, `npx tsc --noEmit`, `npm run lint`; manual form check; confirm five-component band + FR-064 (no governance number in chat).

## Dependencies (story completion order)
Foundational (T002–T008) → US1 (T009–T010) → US2 (T011–T013) → Tests (T014–T018) → Polish (T019–T022).
US1 and US2 are independent of each other once Foundational lands; US2 can be deferred without blocking US1.

## Parallel execution examples
- After T002: run **T004** and **T005** in parallel (schemas vs schema.sql — different files).
- After T006: run **T007** and **T008** in parallel (Neon vs Sheets backends).
- Test phase: **T014–T018** are all `[P]` (distinct test files/areas).
- Docs: **T019–T021** are all `[P]`.

## Implementation strategy (MVP first)
**MVP = Foundational + US1 (T002–T010) + core tests (T014–T017).** That yields a working five-component
DVI collected from the form and persisted correctly, with the invariants tested. US2 (reconciliation)
and the docs polish follow incrementally.

**Totals:** 22 tasks — Setup 1 · Foundational 7 · US1 2 · US2 3 · Tests 5 · Polish 4. Parallel
opportunities: 12 tasks marked `[P]`.

## Phase 7: Convergence (appended 2026-07-24 by speckit-converge)

Read-side drift: the write path, `schema.sql`, and DB views are fully five-component, but the
dashboard data/export layer still enumerates only four. No CRITICAL/HIGH; no constitution violation
(the write-path Principle 5 scope is consistent) — these close read-side consistency gaps.

- [x] T023 [P] Add `avg_governance_resonance` to the `dvi_overall` SELECT and an `avgGovernanceResonance` field to `OverallStats` (type + mapping) in `lib/dashboard-data.ts`, so the dashboard summary reflects the fifth component per SC-5 (partial).
- [x] T024 [P] Add `governance_resonance_score_g`, `dvi_model_version`, and `llm_inferred_governance_g` to the CSV export column allowlist in `lib/dashboard-export.ts`, so exports surface the fifth component and the methodology version per SC-4 / SC-5 (partial).
- [x] T025 Update `tests/dashboard-data.test.ts` (and any dashboard-export test) to assert the governance average is read and the new columns export, per FR-110 (partial).
