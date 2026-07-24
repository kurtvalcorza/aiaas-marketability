# Governance Resonance (G) — 5th DVI Component (methodology v2)

**Status:** implemented · **Added:** 2026-07-24 · **Feature spec:** `specs/001-governance-dimension/`

## What changed

The Demand Viability Index gained a fifth component, **Governance Resonance (G)** — a 0.0–5.0
respondent self-rating of how much *local / sovereign AI governance* (on-shore data, local data
ownership, public-sector / DOST alignment, avoiding vendor lock-in, auditability, local
accountability) matters to their decision to adopt a localized AIaaS platform.

Governance was previously the one structural gap in the study's thesis (localization, **governance**,
technology transfer, sovereignty) with no dedicated demand signal — it was only implied inside general
UVP Resonance and a couple of optional friction tags. G measures it directly.

G is a **resonance-type** component (higher rating = stronger demand), collected on the same
`USEFULNESS_SCALE` as UVP. Like every component, it is a form self-rating; the language model never
computes, assigns, or narrates it.

## Weights (Scheme A)

| Overlay | C | T | L | U | G | Σ |
|---|---|---|---|---|---|---|
| basic | 0.25 | 0.20 | 0.25 | 0.15 | 0.15 | 1.00 |
| AD | 0.35 | 0.10 | 0.25 | 0.15 | 0.15 | 1.00 |

- UVP dropped 0.20→0.15 in both overlays to avoid double-counting the value-proposition signal now
  that governance is explicit.
- G is weighted **equally across overlays** on purpose: the collected ratings — not the weights —
  should reveal whether Advanced-Demand teams value governance more.
- Interpretation bands (Weak <1.5 · Limited <2.5 · Moderate <3.5 · Strong ≥3.5) and the 0.0–5.0
  range are unchanged.

## Versioning & backward compatibility

- `DVI_MODEL_VERSION = 'v2'` (`lib/dvi.ts`) is stamped on every new record (`dvi_model_version`).
- Records collected under the four-component model are **v1**: they keep their original DVI, have a
  NULL `governance_resonance_score_g`, and are **never recomputed**. NULL means "not collected", not
  "governance = 0".
- Analytics MUST treat `dvi_model_version` as the discriminator when comparing across time.

## Data-shape touch points (single change, Constitution Principle 5)

`DVIScores` · `DVI_WEIGHTS`/`computeDVI` · `dviScoresSchema` (Zod) · `FormState`/`formToInterviewCore`
· `InterviewForm` · `buildSubmissionRecord` · Neon INSERT · Google Sheets record (via the shared
builder) · `schema.sql` (`governance_resonance_score_g` NULLABLE + `dvi_model_version`, idempotent
`ALTER … ADD COLUMN IF NOT EXISTS`, view columns) · re-rate path (`RerateComponent`, `RERATE_FIELD`,
`[[RERATE:governance]]`, the re-rate UI).

Governance **sub-factor tags** are evidence only and fold into the existing `frictionTags` list (as the
cost/technical/localization sub-tags already do); they never affect the numeric score.

## Enrichment (research-only) parity

`schema.sql` adds `llm_inferred_governance_g` and a `governance_gap` column to `self_vs_inferred` for
structural parity. Populating the governance shadow rating from the enrichment pass is a bounded
follow-up (research-only; excluded from DVI math per `docs/specs/llm-scope-expansion.md`).
