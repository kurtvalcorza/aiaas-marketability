# Quickstart — Validate the Asset & Contribution axis

## 1. Unit invariants (`npm test`)
- `computeAcScore(4, 1) === 1` and `computeAcScore(1, 4) === 1` (min-gate); `computeAcScore(5,5) === 5`;
  non-finite → 0.
- `classifyQuadrant`: `(3, 3)=Anchor`, `(3, 2)=Consumer`, `(2, 3)=Contributor`, `(2, 2)=Peripheral`;
  boundary `(2.5, 2.5)=Anchor` (inclusive).
- **Axis independence:** for a fixed demand form, changing only `assetPossession`/`assetWillingness`
  changes `acScore`/`quadrant` but **not** `dvi`; changing only demand ratings does not change `acScore`.
- `formToInterviewCore` sets `asset`, `acScore`, `quadrant`, and merges `assetTags` into `frictionTags`.
- Zod accepts asset in [0,5] and a valid quadrant; rejects out-of-range / bad quadrant.
- Record builder + Neon insert carry the four asset fields; export includes them.

## 2. Type + lint
`npx tsc --noEmit` · `npm run lint` (no new issues).

## 3. Manual (`npm run dev`)
Complete the form → the new **Asset & Contribution** section appears (2 ratings + tags). Finish → the
DVI result is unchanged by the asset answers (independence); the quadrant is an analytical field.

## 4. Storage (if Neon)
Apply `schema.sql` (idempotent). Submit → row has `asset_possession_score`, `asset_willingness_score`,
`ac_score`, `matrix_quadrant`. `SELECT * FROM demand_asset_matrix;` shows quadrant counts. A pre-feature
row reads with NULL asset fields.

## Done when §1 passes, §2 clean, §3 shows independence + the new section, §4 confirms storage + matrix.
