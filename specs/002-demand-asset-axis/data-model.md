# Data Model — Asset & Contribution Axis

## New module `lib/matrix.ts`
```
AC_SCALE = { MIN: 0.0, MAX: 5.0 }
MATRIX_CUT = 2.5                       // inclusive high/low cut on each axis
QUADRANTS = ['Anchor','Consumer','Contributor','Peripheral']
computeAcScore(possession, willingness) -> round2(min(clamp(possession), clamp(willingness)))
classifyQuadrant(dvi, ac) -> dvi>=2.5 ? (ac>=2.5?'Anchor':'Consumer') : (ac>=2.5?'Contributor':'Peripheral')
```
`clamp` / rounding mirror `lib/dvi.ts` (non-finite → MIN). **No import of `lib/dvi.ts`** (independence).

## Types (`lib/types.ts`)
| Entity | New fields |
|---|---|
| `InterviewData` | `asset: { possession: number; willingness: number }` · `acScore: number` · `quadrant: Quadrant` |
| `InterviewRecord` | `assetPossession: number` · `assetWillingness: number` · `acScore: number` · `matrixQuadrant: string` |

## Form (`lib/questions.ts`)
| FormState field | Default | Notes |
|---|---|---|
| `assetPossession` | -1 | 0–5, "do you hold reusable AI assets?" (USEFULNESS-style scale) |
| `assetWillingness` | -1 | 0–5, "would you contribute them?" |
| `assetTags` | [] | optional `ASSET_TAG_OPTIONS`; merged into `frictionTags` |

`formToInterviewCore`: `asset = {possession, willingness}`; `acScore = computeAcScore(...)`;
`quadrant = classifyQuadrant(dvi, acScore)`; merge `assetTags` into friction.

## Validation (`lib/schemas.ts`)
- `assetSchema = { possession: score0-5, willingness: score0-5 }`
- `interviewDataSchema` += `asset: assetSchema`, `acScore: 0–5`, `quadrant: z.enum(QUADRANTS)`

## Storage (`schema.sql`, NULLABLE — pre-feature rows read as "not collected")
| Record field | Column | Type |
|---|---|---|
| assetPossession | asset_possession_score | NUMERIC(3,1) CHECK 0–5 |
| assetWillingness | asset_willingness_score | NUMERIC(3,1) CHECK 0–5 |
| acScore | ac_score | NUMERIC(3,2) CHECK 0–5 |
| matrixQuadrant | matrix_quadrant | TEXT CHECK IN (4 labels) |

Views: `demand_asset_matrix` (count per quadrant), `matrix_by_route` (quadrant × final_route).
Dashboard: export columns + `avg`/counts surfaced.

## ASSET_TAG_OPTIONS (evidence only)
Localized datasets we built · Trained/fine-tuned models · Annotated/benchmark data · Technical
documentation · Code/pipelines · Nothing shareable yet. *(final wording in implement)*
