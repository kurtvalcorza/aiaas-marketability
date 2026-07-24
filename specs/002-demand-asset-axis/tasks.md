# Tasks — Asset & Contribution Axis (demand × asset matrix)

**Feature:** `002-demand-asset-axis` · **Plan:** `./plan.md` · Tests required (FR-211, Principle 6)

Legend: `[P]` parallelizable. `[US1]` respondent supplies the asset signal · `[US2]` matrix classification.

## Phase 1: Foundational — matrix module + data-shape spine (BLOCKS all; one change per Principle 5)
- [X] T001 Create `lib/matrix.ts`: `AC_SCALE`, `MATRIX_CUT = 2.5`, `QUADRANTS`, `clamp`/round helpers (not imported from dvi.ts), `computeAcScore(possession, willingness) = round2(min(clamp,clamp))`, `classifyQuadrant(dvi, ac)`. No import of `lib/dvi.ts` (independence).
- [X] T002 In `lib/types.ts`: `InterviewData` += `asset: { possession: number; willingness: number }`, `acScore: number`, `quadrant: Quadrant`; `InterviewRecord` += `assetPossession`, `assetWillingness`, `acScore`, `matrixQuadrant`. Export `Quadrant` type.
- [X] T003 [P] In `lib/schemas.ts`: add `assetSchema` (possession/willingness 0–5), and to `interviewDataSchema` add `asset`, `acScore` (0–5), `quadrant` (enum of QUADRANTS). (dep: T001, T002)
- [X] T004 [P] Migrate `schema.sql`: NULLABLE `asset_possession_score` / `asset_willingness_score` NUMERIC(3,1) CHECK 0–5; `ac_score` NUMERIC(3,2) CHECK 0–5; `matrix_quadrant` TEXT CHECK IN ('Anchor','Consumer','Contributor','Peripheral'); idempotent ALTER; add views `demand_asset_matrix` (count per quadrant) and `matrix_by_route`.
- [X] T005 In `services/submissionRecord.ts`: map `assetPossession`, `assetWillingness`, `acScore`, `matrixQuadrant`. (dep: T002)
- [X] T006 [P] In `services/neonSubmissionService.ts`: INSERT the four asset columns. (dep: T005)

## Phase 2: [US1] Respondent supplies the asset signal
- [X] T007 [US1] In `lib/questions.ts`: `FormState` += `assetPossession`, `assetWillingness`, `assetTags`; `emptyForm` defaults (-1/-1/[]); add `ASSET_TAG_OPTIONS`; `buildFormContext` line; in `formToInterviewCore` set `asset`, compute `acScore = computeAcScore(...)` and `quadrant = classifyQuadrant(dvi, acScore)`, merge `assetTags` into friction. (dep: T001, T002)
- [X] T008 [US1] In `components/InterviewForm.tsx`: new "Asset & Contribution" section (possession + willingness ratings + optional tag group) with required validation; renumber trailing sections. (dep: T007)

## Phase 3: [US2] Matrix surfaced downstream
- [X] T009 [US2] In `lib/dashboard-data.ts`: read quadrant counts (`demand_asset_matrix`) into `DashboardData` (+ type). (dep: T004)
- [X] T010 [US2] In `lib/dashboard-export.ts` + `app/api/dashboard/export/route.ts`: add `asset_possession_score`, `asset_willingness_score`, `ac_score`, `matrix_quadrant` to the export columns and the SELECT. (dep: T004)

## Phase 4: Tests (required)
- [X] T011 [P] `tests/matrix.test.ts`: min-gate (`computeAcScore(4,1)=1`, `(5,5)=5`, non-finite=0); quadrant boundaries incl. inclusive `(2.5,2.5)=Anchor`. (dep: T001)
- [X] T012 [P] Axis-independence test (in `tests/questions.test.ts`): changing only asset ratings changes `acScore`/`quadrant` but not `dvi`; changing only demand ratings does not change `acScore`. (dep: T007)
- [X] T013 [P] `tests/questions.test.ts`: `formToInterviewCore` sets asset/acScore/quadrant and merges `assetTags` into `frictionTags`. (dep: T007)
- [X] T014 [P] `tests/validation.test.ts`: Zod accepts asset in [0,5] + valid quadrant; rejects out-of-range and a bad quadrant. (dep: T003)
- [X] T015 [P] `tests/services/submissionRecord.test.ts` + `neonSubmissionService.test.ts`: record + insert carry the four asset fields. (dep: T005, T006)

## Phase 5: Polish & docs
- [X] T016 [P] Update `ARCHITECTURE.md` (add the asset axis + matrix; note DVI unchanged/independent).
- [X] T017 [P] Update `README.md` (two-axis demand × asset matrix).
- [X] T018 [P] Add `docs/specs/demand-asset-axis.md` (construct, min-gate, ≥2.5 cut, quadrant labels, independence, backward-compat).
- [X] T019 Run `./quickstart.md`: `npm test`, `npx tsc --noEmit`, `npm run lint`.

## Dependencies
Foundational (T001–T006) → US1 (T007–T008) → US2 (T009–T010) → Tests (T011–T015) → Polish (T016–T019).

**Totals:** 19 tasks. MVP = T001–T008 + T011–T014.
