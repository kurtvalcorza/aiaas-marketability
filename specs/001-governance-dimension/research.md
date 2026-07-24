# Research — Governance Resonance (5th DVI Component)

## R1 — Governance weight scheme
- **Decision:** Scheme A. `basic` = C 0.25, T 0.20, L 0.25, U 0.15, G 0.15; `AD` = C 0.35, T 0.10,
  L 0.25, U 0.15, G 0.15. Each sums to 1.0.
- **Rationale:** G is a co-differentiator with Localization; weighting it equally across overlays lets
  the ratings — not the weights — reveal whether Advanced-Demand teams value governance more. UVP
  trimmed 0.20→0.15 to avoid double-counting the value signal now that governance is explicit.
- **Alternatives:** B (G heavier in AD — encodes the prior); C (light-touch G=0.10). Rejected in
  clarify in favour of the methodologically-neutral balanced scheme.

## R2 — Governance sub-factor tags
- **Decision:** Reuse the existing pattern — governance tags (`govTags`) merge into `frictionTags` in
  `formToInterviewCore`, exactly as `costTags`/`techTags`/`locTags` already do. No new tag column.
- **Rationale:** Consistency with the current data shape (Principle 5); the tags are evidence only and
  never feed the score (FR-102). Minimises schema surface.
- **Alternatives:** A dedicated `governance_tags` column — rejected as inconsistent with the four
  existing component tag groups, which are all folded into friction.

## R3 — Backward compatibility / methodology versioning
- **Decision:** `governance_resonance_score_g` is **NULLABLE**; add `dvi_model_version TEXT NOT NULL
  DEFAULT 'v1'`; new inserts stamp `'v2'` (`DVI_MODEL_VERSION` in `lib/dvi.ts`). Prior rows keep their
  original DVI, NULL governance, and version `v1`.
- **Rationale:** Satisfies FR-108 — prior four-component records remain interpretable and are never
  recomputed; NULL correctly means "not collected", not "governance = 0".
- **Alternatives:** `NOT NULL DEFAULT 0` on the new column — rejected: would misrepresent old records
  as "governance does not matter". Full recomputation — impossible (no G data) and out of scope.

## R4 — Governance component semantics
- **Decision:** Resonance-type (higher rating = stronger demand), using the `USEFULNESS_SCALE`
  labels, parallel to UVP Resonance.
- **Rationale:** Governance/sovereignty is a value proposition of the proposed platform; the question
  asks how much it matters, not how much it blocks.
- **Alternatives:** Barrier-type framing (governance concerns with incumbents) — rejected; that angle
  is already partly covered by the "Data residency or sovereignty concerns" friction/AD-pain tags.

## R5 — Enrichment (shadow-rating) parity
- **Decision:** Add the DB column `llm_inferred_governance_g` and a `governance_gap` column to the
  `self_vs_inferred` view now, for structural parity. Updating the enrichment **prompt/service** to
  actually populate the governance shadow rating is a bounded, research-only follow-up (it never feeds
  the DVI, per the enrichment scope in `docs/specs/llm-scope-expansion.md`).
- **Rationale:** Keeps the schema consistent without expanding this feature into the enrichment
  pipeline. The shadow rating is explicitly excluded from DVI math.
- **Alternatives:** Full enrichment integration now — deferred to keep the change bounded.

## R6 — Reconciliation / re-rate of governance
- **Decision:** Extend the re-rate component set so the model can emit `[[RERATE:governance]]` when the
  governance rating contradicts governance tags; the app re-collects the value and recomputes the DVI.
- **Rationale:** Preserves FR-064 (app owns the number) while giving governance the same
  contradiction-handling as the other components.

## R7 — Migration mechanics
- **Decision:** Idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` block plus `CREATE OR REPLACE VIEW`,
  mirroring the existing enrichment migration in `schema.sql`. Safe to re-run.
- **Rationale:** Zero-downtime, re-runnable, consistent with the file's established pattern.
