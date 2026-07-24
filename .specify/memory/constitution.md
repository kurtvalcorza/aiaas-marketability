<!--
SYNC IMPACT REPORT
Version change: (none) → 1.0.0
Bump rationale: Initial ratification of the project constitution. MINOR/MAJOR N/A (first version).
Principles defined (7):
  1. App-Owned Deterministic Scoring (NON-NEGOTIABLE)
  2. Respondent-Facing / Internal Boundary (FR-064)
  3. Privacy & Consent by Default
  4. Defense in Depth; Scores Injection-Proof by Design
  5. Single Source of Truth for the Data Shape
  6. Type Safety & Testability First
  7. Instrument-Scope Humility & Versioned Methodology
Sections added: Core Principles; Scoring-Model Constraints; Development Workflow & Quality Gates; Governance.
Templates:
  - .specify/templates/plan-template.md — ⚠ not present; will be created by speckit-plan (must include a Constitution Check gate covering Principles 1,2,5,6,7).
  - .specify/templates/spec-template.md — ⚠ not present; created by speckit-specify.
  - .specify/templates/tasks-template.md — ⚠ not present; created by speckit-tasks.
Runtime docs checked: ARCHITECTURE.md, SECURITY.md, README.md — consistent; no stale references introduced.
Deferred TODOs: RATIFICATION_DATE set to first-adoption date (2026-07-24); original project start predates this constitution.
-->

# AIaaS Demand Viability Index (DVI) Chatbot — Constitution

The non-negotiable principles that gate every spec, plan, and task in this repository. These
encode the instrument's validity guarantees; a change that violates one is a defect, not a
trade-off, unless the principle itself is amended through the Governance process below.

## Core Principles

### 1. App-Owned Deterministic Scoring (NON-NEGOTIABLE)

The DVI and every component score MUST be computed in application code (`lib/dvi.ts`) from the
respondent's structured 0.0–5.0 self-ratings. The language model MUST NEVER compute, assign,
alter, or narrate a score. Each overlay's weight set MUST sum to exactly 1.0; component scores
MUST be clamped to `[0.0, 5.0]` before weighting; a non-finite (unparseable) score MUST collapse
to the scale minimum so it cannot inflate demand. The stored DVI MUST be reproducible from the
stored component scores and overlay alone.

**Rationale:** instrument validity and auditability depend on the score being a pure function of
recorded inputs — not of model arithmetic, which is neither deterministic nor inspectable.

### 2. Respondent-Facing / Internal Boundary — FR-064

Component scores, component weights, the DVI value, and contact details MUST NEVER appear in
model output or the chat transcript. The chat UI MUST render only the visible respondent summary;
the app displays the DVI and route separately, from app-computed values. The model's reconciliation
signal is limited to a bare `[[RERATE:x]]` directive — never a number it authored.

**Rationale:** prevents the model from leaking, priming, or influencing the index, and keeps
respondent-facing prose cleanly separated from the analytical record.

### 3. Privacy & Consent by Default

PII (email, phone, SSN) MUST be redacted client-side and RE-APPLIED server-side before storage.
Contact name and email MUST be stored only when `contactConsent === true`; ambiguous or missing
consent MUST default to "no consent." Declining consent MUST NOT remove functionality — the
respondent can still view and print their report. Only sanitized records reach any storage backend.

**Rationale:** a self-service public instrument must fail safe on privacy; client controls can be
bypassed, so the server is the authority.

### 4. Defense in Depth; Scores Injection-Proof by Design

Every submission MUST pass Zod validation (enums, 0.0–5.0 ranges, per-field length bounds) before
storage. The chat path MUST enforce rate limits, message/conversation caps, and prompt-injection
screening on BOTH `user` and `system` content, allowing at most one leading `system` message. The
architecture MUST guarantee that even a successful injection can, at most, alter free-text summary
prose — never a stored score, route, overlay, or contact field.

**Rationale:** the strongest control is architectural (Principle 1), with validation and screening
as defense in depth; the denylist alone is a speed bump, not a guarantee.

### 5. Single Source of Truth for the Data Shape

`buildSubmissionRecord` (`services/submissionRecord.ts`) MUST be the sole `InterviewData →
InterviewRecord` builder for all storage backends. The TypeScript types (`lib/types.ts`), the Zod
schema (`lib/schemas.ts`), the database schema and its CHECK constraints (`schema.sql`), and every
backend MUST agree on one field set and one set of bounds. Any added or changed field MUST be
propagated to all of them in the SAME change.

**Rationale:** divergence between backends, validation, and storage causes silent data loss and
un-auditable records; one shape enforced everywhere prevents drift.

### 6. Type Safety & Testability First

Business logic MUST be pure, framework-agnostic functions with runtime Zod validation and
compile-time TypeScript types. Deterministic logic — DVI weights/bands/clamping, form→core mapping,
report parsing, consent/route normalization, storage resolution — MUST be unit-tested (Vitest),
coverage target ≥80%. Any change to the scoring model MUST ship with tests asserting each overlay's
weight-set sum equals 1.0 and the band boundaries hold.

**Rationale:** the index is only trustworthy if its math is continuously verified.

### 7. Instrument-Scope Humility & Versioned Methodology

The DVI is a STUDY-SPECIFIC operational demand index — NOT a validated psychometric scale,
certification, readiness assessment, or proof of market demand. Documentation MUST NOT overclaim.
Any change to the scoring model (components, weights, bands, or scale) MUST be versioned and
documented so records collected under a prior model remain interpretable, and MUST preserve
Principle 1 (determinism) and Principle 5 (single data shape).

**Rationale:** methodological transparency and comparability of data gathered over time.

## Scoring-Model Constraints

These apply to any work that touches the DVI:

- Weight sets are defined per overlay (`basic`, `AD`) and MUST each sum to 1.0. A unit test MUST
  assert this for every overlay.
- The scale floor is 0.0 ("not a barrier" / "not useful"), which keeps the "Weak" band reachable;
  the floor MUST NOT be raised without amending this constitution.
- Interpretation bands (Weak / Limited / Moderate / Strong) are defined once in `lib/dvi.ts` and
  consumed everywhere via `interpretDVI` — never re-hardcoded.
- Adding, removing, or reweighting a component is a methodology change (Principle 7): it requires a
  spec, a version record, and backward-compatibility handling for previously stored records.

## Development Workflow & Quality Gates

- Follow the spec-kit flow for non-trivial change: constitution → specify → clarify → plan → tasks
  → analyze → implement. Each `plan` MUST include a Constitution Check gate covering Principles
  1, 2, 5, 6, and 7.
- Clean architecture is maintained: presentation (components) / logic (hooks, services) / thin API
  controllers / utilities. Services are plain exported functions.
- A change is not "done" until it is type-clean, lint-clean, and its new/changed logic is tested;
  the data-shape principle (5) is verified end-to-end (types ↔ Zod ↔ schema.sql ↔ backends).

## Governance

- **Authority:** this constitution supersedes ad-hoc convention. Where it conflicts with a habit or
  a convenience, the constitution wins.
- **Amendment procedure:** amendments require a documented rationale, maintainer review, and a
  version bump. Scoring-model changes additionally require a spec and a methodology version record.
- **Versioning policy (this document):** semantic versioning — MAJOR for backward-incompatible
  principle removal or redefinition; MINOR for a new principle or materially expanded section; PATCH
  for clarifications and wording.
- **Compliance review:** every plan is checked against these principles at its Constitution Check
  gate. A justified, unavoidable deviation MUST be recorded in the plan's Complexity Tracking with
  the simpler alternative that was rejected and why; an unjustified violation blocks the change.

**Version:** 1.0.0 | **Ratified:** 2026-07-24 | **Last Amended:** 2026-07-24
