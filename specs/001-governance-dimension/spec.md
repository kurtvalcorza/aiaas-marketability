# Feature Specification — Governance Resonance (5th DVI Component)

**Feature dir:** `specs/001-governance-dimension/`
**Status:** Draft (pre-clarify)
**Created:** 2026-07-24

## Summary

Add a fifth component to the Demand Viability Index — **Governance Resonance (G)** — a 0.0–5.0
respondent self-rating of how strongly *local / sovereign AI governance* (data residency and
ownership, public-sector / DOST alignment, and trust in who controls the platform) matters to them
as a reason to adopt a localized AIaaS platform.

Today the index measures four components — Cost Barrier (C), Technical Complexity (T), Localization
Gap (L), and UVP Resonance (U). The study's own market analysis rests on four structural gaps —
localization, **institutional governance**, technology transfer, and digital sovereignty — yet
governance/sovereignty is the one pillar with *no dedicated demand signal*; it is only captured
indirectly inside general UVP Resonance and a couple of optional friction tags. As a result the
instrument can under-detect demand that is specifically about governance — the very thing that
differentiates the proposed platform from AWS, Azure, and IBM. This feature closes that gap.

## Why (motivation)

- **Analytical completeness.** The demand instrument should measure all four structural gaps the
  study argues, not three-and-a-half. Governance is currently the blind spot.
- **Differentiation is governance-shaped.** A localized, publicly-governed platform competes with
  global incumbents primarily on sovereignty and trust, not features alone; the index should be
  able to see whether that value resonates.
- **Segment insight.** Advanced-Demand teams (who have cleared the skills bar) are exactly the
  cohort expected to weigh governance and sovereignty most heavily; without a G signal that
  distinction is invisible.

## Clarifications

### Session 2026-07-24

- Q: How much relative weight should Governance Resonance carry, and from where, in each overlay? → A: **Scheme A — Balanced co-differentiator.** `basic` = C 0.25, T 0.20, L 0.25, U 0.15, G 0.15; `AD` = C 0.35, T 0.10, L 0.25, U 0.15, G 0.15. G sits alongside Localization as a co-differentiator, weighted equally across overlays so the collected ratings — not the weights — reveal whether Advanced-Demand teams value governance more. UVP drops 0.20→0.15 in both overlays to avoid double-counting the value-proposition signal now that governance is explicit.

## User Scenarios & Testing

### Primary flow

1. A respondent completes the structured form. Alongside the existing four self-ratings, they are
   asked **one additional 0–5 question**: how much local/sovereign AI governance matters to them,
   with an optional set of governance sub-factor tags (e.g., data residency, public-sector fit,
   avoiding vendor lock-in, auditability).
2. On form completion the app computes the DVI deterministically from **five** components and shows
   the respondent their route and demand band as before.
3. The scored record — now including the governance rating and its band contribution — is validated
   and stored.

### Acceptance scenarios

- **AS-1 — Governance captured:** A completed interview produces a record containing a governance
  self-rating in `[0.0, 5.0]` and a DVI computed from all five components.
- **AS-2 — Weights valid:** For every overlay (`basic`, `AD`), the five component weights sum to
  exactly 1.0; the stored DVI is reproducible from the five stored scores and the overlay.
- **AS-3 — Model never scores:** The governance rating comes only from the form; the language model
  never emits, narrates, or alters it (extends FR-064 to the new component).
- **AS-4 — Reconciliation:** If the respondent's governance rating contradicts their governance
  tags (e.g., rates governance "not useful" but ticks "data residency is critical"), the chat may
  ask them to re-rate; the app re-collects the value and recomputes the DVI.
- **AS-5 — Prior records interpretable:** Records collected before this change remain valid and
  distinguishable from five-component records; no prior record is silently recomputed or corrupted.
- **AS-6 — Privacy unchanged:** The new field carries no PII; consent and redaction behavior are
  unchanged.

## Functional Requirements

- **FR-101** The instrument MUST collect a Governance Resonance rating as a single 0.0–5.0
  self-rating in the form phase, using the same rating UX as the existing components.
- **FR-102** The instrument MUST offer an optional set of governance sub-factor tags so respondents
  can indicate *which* governance concerns drive the rating; these tags are evidence only and MUST
  NOT alter the numeric score.
- **FR-103** The DVI MUST be computed from five components using the resolved **Scheme A** weights —
  `basic` = C 0.25, T 0.20, L 0.25, U 0.15, G 0.15; `AD` = C 0.35, T 0.10, L 0.25, U 0.15, G 0.15 —
  and each overlay's weight set MUST sum to 1.0 (Constitution Principle 1 & Scoring-Model Constraints).
- **FR-104** Governance Resonance is a **resonance-type** component (higher rating = stronger
  demand), parallel to UVP Resonance — not a barrier-type component.
- **FR-105** The governance rating MUST be owned by the app and never computed, assigned, altered,
  or narrated by the language model (FR-064 extended).
- **FR-106** The governance rating MUST be recomputable into the DVI on re-rate, exactly like the
  existing components.
- **FR-107** The governance **rating** MUST be added to the type model, runtime validation, and the
  database schema *in the same change* (Constitution Principle 5), with the same 0.0–5.0 bounds and
  CHECK constraint as the other components. The governance **sub-factor tags** MUST be persisted via
  the existing friction-tag list (consistent with how the cost/technical/localization sub-tags are
  already folded into `frictionTags`) — not as a dedicated field — and every storage backend MUST
  receive both.
- **FR-108** The change MUST record a **scoring-model methodology version** so that records
  collected under the four-component model and the five-component model are distinguishable and
  each remains interpretable (Constitution Principle 7). Prior records MUST NOT be recomputed.
- **FR-109** The four interpretation bands (Weak / Limited / Moderate / Strong) and the 0.0–5.0
  output range MUST be preserved; only the component set and weights change.
- **FR-110** Existing tests MUST be updated and new tests added so that the weight-sum invariant,
  the five-component computation, and the band boundaries are all covered (Constitution Principle 6).
- **FR-111** Respondent-facing documentation and the study's methodology note MUST describe the
  five-component index without overclaiming (Constitution Principle 7).

## Key Entities

- **DVI component set** — gains a fifth member, **Governance Resonance (G)**, a 0.0–5.0 self-rating.
- **Interview record** — gains a governance score field (and a governance sub-factor tag field), a
  methodology-version marker, mirrored across type model, validation, and storage schema.
- **Weight model** — per-overlay weight sets expand from four to five entries, each summing to 1.0.

## Success Criteria

- **SC-1** 100% of interviews submitted after release contain a governance rating in `[0.0, 5.0]`
  and a DVI derived from five components.
- **SC-2** For every overlay, the five weights sum to 1.0 (verifiable by an automated invariant
  check); the stored DVI is exactly reproducible from the five stored scores plus overlay.
- **SC-3** The instrument adds exactly **one** required rating question and **one** optional tag
  group for governance — no additional required steps — keeping the incremental respondent burden
  minimal and measurable.
- **SC-4** Records collected before release remain readable and are unambiguously identifiable as
  four-component records; none are recomputed or invalidated.
- **SC-5** Analysts can segment demand by governance strength (e.g., compare governance rating
  distributions between Basic and Advanced-Demand respondents) from the stored data alone.

## Assumptions

- Governance Resonance is asked of **all** respondents (both segments, both overlays); it is not
  route-gated. The AD overlay may weight it differently (see clarification) but everyone answers it.
- The 0.0–5.0 scale and four output bands are retained; only the component set/weights change.
- Backward compatibility is handled by **versioning the methodology**, not by recomputation — prior
  four-component records keep their original DVI and are tagged as model v1.
- The governance sub-factor tags are evidence tags (like the existing cost/technical/localization
  tag groups) and do not feed the numeric score.
- No PII is introduced; existing consent, redaction, rate-limiting, and validation controls apply
  unchanged.

## Edge Cases

- A respondent rates governance `0` ("does not matter"): valid; contributes 0 to the weighted sum
  and must keep the "Weak" band reachable.
- Governance rating present but all sub-factor tags empty: valid (rating stands alone).
- A pre-release record with no governance field is read by analytics: MUST be handled as a
  four-component (v1) record, not treated as governance = 0.
- Rating–tag contradiction: handled by the existing re-rate reconciliation path (AS-4).

## Out of Scope

- Re-tuning the *other* four components' meanings or scales.
- Retroactively re-scoring historical records.
- Dashboard/report redesign beyond surfacing the new component where the existing four appear.
- Adding Azure/IBM/Google Cloud to the competitor list (already present in the form options).

## Open clarifications

_None. The governance weight emphasis was resolved on 2026-07-24 (Scheme A — see Clarifications and FR-103)._
