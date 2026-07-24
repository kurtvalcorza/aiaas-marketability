# Feature Specification — Asset & Contribution Axis (demand × asset matrix)

**Feature dir:** `specs/002-demand-asset-axis/`
**Status:** Draft (pre-clarify)
**Created:** 2026-07-24

## Summary

Add a **second measured axis** to the instrument — an **Asset & Contribution (AC) signal** — capturing
whether a respondent's organization (a) *possesses* reusable AI assets (datasets, models, documentation,
benchmarks) and (b) is *willing to contribute/share* them into a governed local platform. Plotted against
the existing demand signal (the DVI), it produces a **demand × asset matrix** that classifies each
respondent as an ecosystem **Anchor**, **Consumer**, **Contributor**, or **Peripheral** participant.

The DVI (now five components incl. governance) measures the **demand** side — *would you use it*. The AC
axis measures the **supply / participation** side — *do you have assets, and would you share them*. Both
are app-owned, deterministic, and never scored by the model.

## Why (motivation)

- **The instrument is currently one-sided.** The DVI, even with governance, measures consumption demand.
  A platform ecosystem is viable only if **both** sides show up: consumers who reuse assets *and*
  contributors who supply them.
- **It is the heart of the market-study thesis.** The study argues DIMER's value comes from the RR↔DD
  interaction and the responsible reuse of publicly-funded AI assets (§2.5, §5.4). Without an
  asset/contribution signal, the instrument cannot detect whether that two-sided ecosystem will form.
- **It realizes the locked design.** The DIMER readiness design (2026-06-26) was a **demand × asset
  matrix**. The demand axis is built; this feature adds the asset axis it always called for.
- **It drives seeding strategy and SOM.** Distinguishing **Anchors** (asset-rich, high-demand
  institutions that seed *and* consume content) from pure **Consumers** tells the program who to onboard
  first — a distinction the current instrument cannot make.

## Clarifications

### Session 2026-07-24

- Q: How is the AC score composed and combined? → A: **Two 0–5 sub-signals — Possession** ("do you
  hold reusable AI assets?") **and Willingness** ("would you contribute them to a governed local
  platform?"). **AC = min(Possession, Willingness)** — an organization only supplies content if it both
  *has* assets and *will* share them, so asset-rich-but-unwilling correctly scores low. Both sub-signals
  are **stored separately** so analysts can still identify (and court, with governance guarantees) the
  asset-rich-but-unwilling cohort. Readiness is not part of the AC score.
- Q: Matrix thresholds and quadrant labels? → A: **High = ≥ 2.5** on each axis (inclusive lower bound,
  aligned with the DVI Limited→Moderate band boundary). Quadrants: **Anchor** (DVI ≥ 2.5 & AC ≥ 2.5),
  **Consumer** (DVI ≥ 2.5 & AC < 2.5), **Contributor** (DVI < 2.5 & AC ≥ 2.5), **Peripheral** (both < 2.5).

## User Scenarios & Testing

### Primary flow
1. The respondent completes the demand block (routing, five DVI ratings, governance, adoption intent) as
   today, plus a new short **Asset & Contribution block**: whether they hold reusable AI assets, how
   ready those are to share, and whether they'd contribute them to a governed local platform.
2. On completion the app computes the DVI (demand) **and** a deterministic AC score (supply), and
   classifies the respondent into a demand × asset **matrix quadrant**.
3. The respondent sees their demand result as today; the AC score and quadrant are analytical fields.

### Acceptance scenarios
- **AS-1 — AC captured:** a completed interview yields an AC score in `[0.0, 5.0]` derived from the asset
  answers, alongside the DVI.
- **AS-2 — Matrix classification:** each respondent is deterministically classified into exactly one
  quadrant from `(DVI, AC)` using defined thresholds.
- **AS-3 — Axis independence:** changing only the asset answers changes AC and the quadrant but **not**
  the DVI; changing only demand answers does not change AC.
- **AS-4 — Model never scores:** AC, like the DVI, is computed by the app from the form; the model never
  emits, narrates, or alters it.
- **AS-5 — Anchor identification:** analysts can, from stored data alone, list respondents in the
  high-demand + high-asset quadrant, segmented by route.
- **AS-6 — Backward compatibility:** records from before this feature remain valid and are distinguishable
  (no AC / no quadrant), never recomputed.

## Functional Requirements

- **FR-201** The instrument MUST collect an **asset-possession** signal — whether the organization holds
  reusable AI assets (datasets, models, documentation, benchmarks, etc.) that could be shared.
- **FR-202** The instrument MUST collect a **contribution-willingness** signal — whether the organization
  would contribute/share those assets into a governed local platform.
- **FR-203** Asset-readiness is **not** part of the AC score (resolved in clarify). Readiness/asset-type
  detail MAY be captured as optional evidence tags only, which MUST NOT affect the AC value.
- **FR-204** The AC score MUST be computed deterministically in app code as **`AC = min(Possession,
  Willingness)`** on a `0.0–5.0` scale; Possession and Willingness MUST each be stored separately. AC MUST
  NEVER be computed, assigned, altered, or narrated by the model (same discipline as the DVI; FR-064
  extended).
- **FR-205** The system MUST classify each respondent into exactly one **demand × asset matrix quadrant**
  from `(DVI, AC)` using a **≥ 2.5** high/low cut (inclusive) on each axis: **Anchor** (DVI ≥ 2.5 & AC ≥
  2.5), **Consumer** (DVI ≥ 2.5 & AC < 2.5), **Contributor** (DVI < 2.5 & AC ≥ 2.5), **Peripheral** (both
  < 2.5). Thresholds and labels MUST be defined once and consumed everywhere.
- **FR-206** The AC score, its sub-signals, and the quadrant MUST be persisted across the type model,
  runtime validation, the database schema, and every storage backend **in the same change**
  (Constitution Principle 5).
- **FR-207** The AC axis MUST be **independent of the DVI**: it MUST NOT change DVI components, weights,
  bands, or values. DVI remains the demand axis; AC is a parallel supply axis.
- **FR-208** The matrix quadrant labels and axis thresholds MUST be defined in one place and reused (no
  re-hardcoding), analogous to the DVI bands.
- **FR-209** The matrix distribution MUST be reportable/segmentable by route (RR/DD × basic/AD).
- **FR-210** The methodology (AC construct, thresholds, quadrants) MUST be documented and versioned so
  prior records remain interpretable; documentation MUST NOT overclaim (Constitution Principle 7).
- **FR-211** Tests MUST cover the deterministic AC computation, axis independence (FR-207), and the
  quadrant boundary classification (Constitution Principle 6).

## Key Entities

- **Asset & Contribution signal** — one or more `0.0–5.0` sub-signals (possession, willingness, and
  optionally readiness) reduced to a single AC score.
- **Matrix quadrant** — a categorical classification derived from `(DVI, AC)` and defined thresholds.
- **Interview record** — gains the AC score, its sub-signals, and the quadrant, mirrored across type ↔
  validation ↔ schema ↔ backends, with a methodology version.

## Success Criteria

- **SC-1** 100% of interviews after release yield a DVI, an AC score in `[0,5]`, and a matrix quadrant.
- **SC-2** From stored data alone, analysts can identify ecosystem **Anchors** (high demand + high asset)
  distinct from pure **Consumers** (high demand + low asset).
- **SC-3** The AC axis is provably independent of the DVI (an automated test shows asset answers do not
  move the DVI, and demand answers do not move AC).
- **SC-4** The quadrant is deterministic and reproducible from the stored DVI + AC alone.
- **SC-5** The matrix distribution can be segmented by RR/DD and by maturity overlay.

## Assumptions

- The DVI (five components) is **unchanged**; AC is a new, parallel axis — not a sixth DVI component.
- The AC block is asked of **all** respondents (both segments, both overlays); RR is expected to skew
  asset-rich and DD asset-light, but everyone answers so the data — not the design — reveals the pattern.
- Versioning continues per Principle 7; prior records have no AC/quadrant and are never recomputed.
- No new PII; existing consent, redaction, validation, and rate-limiting controls apply unchanged.

## Edge Cases

- **Asset-rich but unwilling to contribute:** valid and important — possession high, willingness low. The
  AC construct MUST be able to represent this (it is exactly the friction DIMER governance must address).
- **Willing but no assets:** valid — a future contributor with nothing yet to give.
- **Boundary respondent** on an axis threshold: deterministic tie-breaking (inclusive lower bound, like
  the DVI bands).
- **Pre-release record:** no AC, no quadrant — handled as a demand-only record, not AC = 0.

## Out of Scope

- Changing the DVI's five components, weights, or bands.
- Retroactively scoring historical records.
- Full dashboard redesign beyond surfacing the AC score and quadrant where the DVI already appears
  (note: the governance-feature convergence tasks T023–T025 already touch the dashboard read/export).
- Any actual asset ingestion / platform-building — this measures *stated* supply, not real assets.

## Open clarifications

_None. AC composition (min-gated Possession + Willingness) and the matrix thresholds/labels (≥2.5 cut;
Anchor/Consumer/Contributor/Peripheral) were resolved 2026-07-24 — see Clarifications and FR-204/FR-205._
