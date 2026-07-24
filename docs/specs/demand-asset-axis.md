# Demand × Asset Matrix — the supply/participation axis

**Status:** implemented · **Added:** 2026-07-24 · **Feature spec:** `specs/002-demand-asset-axis/`

## What changed

The instrument gained a **second axis**, independent of the DVI. The DVI answers *"would you
use it?"* (demand). The new **Asset & Contribution (AC)** score answers the other half of a
platform ecosystem: *"do you hold reusable AI assets, and would you contribute them?"* (supply).

This closes a structural gap in the study's thesis: a democratized, sovereign AIaaS platform is a
two-sided ecosystem, but the instrument previously measured only the consumption side. Reuse and
contribution were implied inside optional friction tags with no dedicated signal. AC measures it
directly, and plotting AC against the DVI classifies each respondent into one of four quadrants.

## The AC score (min-gate)

`AC = min(Possession, Willingness)`, each a 0.0–5.0 respondent self-rating, clamped to `[0,5]`,
rounded to two decimals (`lib/matrix.ts`). Like every DVI component it is a **form self-rating** —
the language model never computes, assigns, or narrates it.

- **Possession** — how much reusable AI material the org holds (datasets, models, tooling, domain
  corpora), on `EXTENT_SCALE`.
- **Willingness** — how willing they are to contribute/share it, on `WILLINGNESS_SCALE`.
- The **min** is deliberate: an org supplies the ecosystem only if it *both* has assets *and* will
  share them. Asset-rich-but-unwilling (`min(4,1)=1`) and willing-but-empty (`min(1,4)=1`) both
  correctly score low. `0` is a valid rating (none / would not share).

## Quadrants (inclusive ≥ 2.5 cut)

Each axis is split at **2.5** (inclusive high), aligned to the DVI Limited→Moderate boundary:

| | Asset low (< 2.5) | Asset high (≥ 2.5) |
|---|---|---|
| **Demand high (DVI ≥ 2.5)** | **Consumer** — wants it, brings little | **Anchor** — wants it and can seed it |
| **Demand low (DVI < 2.5)** | **Peripheral** — neither | **Contributor** — could seed it, low own-demand |

`(2.5, 2.5)` classifies as **Anchor** (both cuts inclusive). `Anchor / Consumer / Contributor /
Peripheral` is the single source of truth for labels (`QUADRANTS` in `lib/matrix.ts`).

## Independence

`lib/matrix.ts` **must not import `lib/dvi.ts`** (spec FR-207). Asset answers never affect the DVI;
the DVI never affects the AC score. `classifyQuadrant(dvi, ac)` only *reads* the DVI to place the
point — it does not feed back into either component. The axis-independence test in
`tests/questions.test.ts` guards this: changing only the asset ratings moves `acScore`/`quadrant`
but not `dvi`/`scores`, and changing only a demand rating moves `dvi` but not `acScore`.

## Data-shape touch points (single change, Constitution Principle 5)

`InterviewData` (`asset`, `acScore`, `quadrant`) · `InterviewRecord`
(`assetPossession`, `assetWillingness`, `acScore`, `matrixQuadrant`) · `assetSchema` +
`interviewDataSchema` (Zod, 0–5 + quadrant enum) · `FormState`/`emptyForm`/`formToInterviewCore`
(`lib/questions.ts`) · `InterviewForm` ("Asset & Contribution" section) · `buildSubmissionRecord`
· Neon INSERT · Google Sheets record (via the shared builder) · `schema.sql` (four NULLABLE asset
columns, idempotent `ALTER … ADD COLUMN IF NOT EXISTS`, `demand_asset_matrix` + `matrix_by_route`
views) · dashboard read (`demand_asset_matrix` → `DashboardData.matrix`) and CSV export columns.

Asset **type tags** are evidence only and fold into the existing `frictionTags` list (as the
cost/technical/localization/governance sub-tags already do); they never affect the AC score.

## Backward compatibility

The four asset columns are **NULLABLE**. Records collected before this feature carry NULL for all
four; NULL means "not collected", not "asset = 0". Matrix views and analytics exclude NULL-asset
rows from quadrant counts. No existing record is recomputed. The DVI methodology (`v2`) and its
weights are unchanged — this feature adds an orthogonal axis, it does not touch the DVI.
