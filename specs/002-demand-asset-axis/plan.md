# Implementation Plan — Asset & Contribution Axis (demand × asset matrix)

**Feature:** `002-demand-asset-axis` · **Spec:** `./spec.md` · **Date:** 2026-07-24

## Technical Context
- TypeScript, Next.js 16, React 19, Zod, Vitest. Neon PostgreSQL + Google Sheets (shared record builder).
- Builds on `001-governance-dimension` (branch `feat/governance-dvi-dimension`).
- External interface delta: `POST /api/submit` gains `asset`, `acScore`, `quadrant`.

## Design decisions (research)
- **AC score:** `AC = min(Possession, Willingness)`, each a 0–5 self-rating, both clamped; result rounded
  to 2 dp. Min-gate = you supply content only if you both hold assets and will share. Both sub-signals
  stored separately (analysts can find asset-rich-but-unwilling). *(clarify)*
- **Matrix:** high = `≥ 2.5` (inclusive) per axis. Anchor (D≥2.5 & AC≥2.5), Consumer (D≥2.5 & AC<2.5),
  Contributor (D<2.5 & AC≥2.5), Peripheral (both <2.5). Thresholds/labels defined once in `lib/matrix.ts`.
  *(clarify)*
- **Independence (FR-207):** AC lives in a **new `lib/matrix.ts`**, never touches `lib/dvi.ts`. The DVI is
  unchanged; the asset answers never enter `computeDVI`, and the DVI never enters `computeAcScore`.
- **No chat re-rate for AC:** the two asset ratings are added to the form context (so the model won't
  re-ask) but are **not** wired into the `[[RERATE:x]]` mechanism (that maps to DVI components only) —
  keeps the axes cleanly separate. Reconciliation of AC is out of scope.
- **Versioning / backward-compat:** new asset columns are **NULLABLE**; a record's asset axis is present
  iff `ac_score IS NOT NULL`. Prior records have no AC/quadrant and are never recomputed. The AC
  methodology is documented as v1 (no dedicated version column — `ac_score IS NULL` is the discriminator).
- **Asset tags:** optional `ASSET_TAG_OPTIONS` (what kinds of assets) fold into `useCaseTags`/`needTags`?
  → fold into the existing **`frictionTags`** list like the other sub-tag groups; evidence only, never
  affects AC.

## Constitution Check
| Principle | Verdict |
|---|---|
| 1 — App-owned deterministic scoring | ✅ AC computed in code (min), clamped; model never scores |
| 2 — Respondent/internal boundary | ✅ AC/quadrant are analytical fields; not emitted by the model |
| 3 — Privacy & consent | ✅ no PII introduced |
| 4 — Defense in depth | ✅ Zod range + DB CHECK on both sub-scores and AC; quadrant enum |
| 5 — Single source of truth | ✅ asset fields added to types ↔ Zod ↔ schema.sql ↔ record ↔ both backends ↔ dashboard in one change |
| 6 — Type safety & testability | ✅ tests for min-gate, quadrant boundaries, **axis independence** |
| 7 — Versioned methodology | ✅ AC is a new parallel axis (DVI untouched); nullable columns; prior records not recomputed |

**Gate: PASS.**

## Touch points (single coordinated change — Principle 5)
- **New:** `lib/matrix.ts` — `AC_SCALE`, `MATRIX_CUT=2.5`, `QUADRANTS`, `computeAcScore(p,w)`,
  `classifyQuadrant(dvi, ac)`.
- `lib/types.ts` — `InterviewData` += `asset: {possession, willingness}`, `acScore`, `quadrant`;
  `InterviewRecord` += `assetPossession`, `assetWillingness`, `acScore`, `matrixQuadrant`.
- `lib/schemas.ts` — `assetSchema` (possession/willingness 0–5) + `acScore` (0–5) + `quadrant` enum.
- `lib/questions.ts` — `FormState` += `assetPossession`, `assetWillingness`, `assetTags`; `emptyForm`;
  `ASSET_TAG_OPTIONS`; `buildFormContext` line; `formToInterviewCore` computes AC + quadrant, merges tags.
- `components/InterviewForm.tsx` — new "Asset & Contribution" section (2 ratings + tag group) + required
  validation; renumber trailing sections.
- `services/submissionRecord.ts` — map the four asset fields.
- `services/neonSubmissionService.ts` — INSERT the four columns.
- `schema.sql` — `asset_possession_score`, `asset_willingness_score` NUMERIC(3,1) NULLABLE CHECK 0–5;
  `ac_score` NUMERIC(3,2) NULLABLE CHECK 0–5; `matrix_quadrant` TEXT NULLABLE CHECK IN (4 labels);
  idempotent ALTER; new `demand_asset_matrix` view (quadrant counts) + `matrix_by_route`.
- `lib/dashboard-data.ts` + `lib/dashboard-export.ts` + `app/api/dashboard/export/route.ts` — surface the
  asset fields + quadrant (in-scope now, unlike governance which needed convergence).
- **Docs:** ARCHITECTURE, README, `docs/specs/demand-asset-axis.md`.
- **Tests:** `lib/matrix` (min-gate, quadrant boundaries), **axis independence**, form mapping, record,
  Zod, export/read.

## Out of scope
DVI components/weights; retroactive scoring; chat re-rate of AC; real asset ingestion.

**Gate: PASS — ready for `speckit-tasks`.**
