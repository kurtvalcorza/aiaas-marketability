# Quickstart — Validate the Governance Resonance component

Prerequisites: repo installed (`npm install`), Node per `package.json`.

## 1. Unit invariants (fast, no DB)
```bash
npm test
```
Expect (new/updated assertions):
- Both overlays' weight sets sum to **1.0** with five components.
- `computeDVI({C,T,L,U,G}, overlay)` matches a hand-computed Scheme-A value; e.g.
  `basic` all-3.0 → `3.00`; `AD` C5 T0 L5 U0 G5 → `0.35*5 + 0.25*5 + 0.15*5 = 3.75`.
- All-zero scores → DVI `0.00` (Weak band still reachable).
- `interpretDVI` band boundaries unchanged (Weak <1.5, Limited <2.5, Moderate <3.5, Strong ≥3.5).
- `formToInterviewCore` maps `govRating`→`scores.governanceResonance` and merges `govTags` into
  `frictionTags`.
- Zod rejects `governanceResonance` outside `[0,5]`; the record builder includes
  `governanceResonance` and `dviModelVersion = 'v2'`.

## 2. Type + lint
```bash
npx tsc --noEmit
npm run lint
```

## 3. Manual end-to-end (dev server)
```bash
npm run dev
```
- Complete the form; confirm the **governance rating** question appears with 0–5 options and an
  optional governance tag group.
- Finish the interview; the results card shows a demand band computed from five components.
- Confirm the chat transcript never prints the governance number (FR-064).

## 4. Storage (if Neon configured)
- Apply the migration in `schema.sql` (idempotent `ALTER … ADD COLUMN IF NOT EXISTS`).
- Submit one interview; verify the row has `governance_resonance_score_g` populated and
  `dvi_model_version = 'v2'`.
- Verify a hand-inserted pre-existing row (or a prior record) reads with NULL governance and
  `dvi_model_version = 'v1'` — unaffected.
- `SELECT * FROM dvi_overall;` shows `avg_governance_resonance`.

## Done when
All of §1 passes, §2 is clean, and §3 shows the question + a five-component band. §4 confirms
forward inserts and backward-compatible reads.
