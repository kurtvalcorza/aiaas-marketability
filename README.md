# AIaaS Demand Viability Index (DVI) Chatbot

A chatbot-supported **marketability and demand-validation** instrument for a localized AI-as-a-Service (AIaaS) platform (DOST-NAIRA). It interviews potential platform users, routes them into the RR/DD matrix, detects the Advanced Demand (AD) overlay, collects competitor-friction and value-proposition evidence, and computes a study-specific **Demand Viability Index**.

It is **not** a readiness assessment, and the DVI is **not** a formal validated scale — it is a preliminary, study-specific operational demand signal.

Built on the ai-readiness-assessment template's infrastructure (streaming chat, rate limiting, PII redaction, consent, dual storage).

## How it works — a form, then a short chat

The interview is a two-phase hybrid. **The app owns all structured data and all scoring; the language model never computes a score.**

1. **Structured form** ([`components/InterviewForm.tsx`](components/InterviewForm.tsx)) — routing questions, tag pickers, and the five **0–5 self-ratings** (Cost, Technical complexity, Localization gap, UVP usefulness, Governance resonance). On submit, [`formToInterviewCore()`](lib/questions.ts) derives the segment vector and AD overlay, computes the DVI deterministically from the ratings, and merges the component sub-friction tags into the friction list.
2. **Reconciling chat** ([`hooks/useInterviewFlow.ts`](hooks/useInterviewFlow.ts) + [`lib/systemPrompt.ts`](lib/systemPrompt.ts)) — a brief, focused conversation that does only three things:
   - asks the one **open-ended** question ("what's the main problem you're trying to solve?"),
   - **reconciles contradictions** between a rating and the tags selected (e.g. Cost rated 0 but three cost problems ticked),
   - writes the visible **summary**.

The form answers are handed to the chat as a hidden `system` context message so the model never re-asks anything the form already captured.

### Contradiction reconciliation — the app re-collects the number

When a rating conflicts with the evidence, the model points it out and asks whether to keep or revise it. **If (and only if) the respondent chooses to revise, the model emits a bare directive** — `[[RERATE:cost]]` / `[[RERATE:technical]]` / `[[RERATE:localization]]` / `[[RERATE:uvp]]`, **with no number**. The app then renders a rating control, the respondent picks the new value, and the app recomputes the DVI. The model never states, guesses, or writes a numeric score.

## Routing — four routes

Two vectors × two maturity overlays. AD is an overlay (any confirmed active AI use — "Yes, regularly" or "Yes, occasionally/experimentally" on the AI-maturity question), detected even for otherwise Basic respondents.

| Route | Respondents | Competitors benchmarked |
|-------|-------------|-------------------------|
| **RR-Basic** | Research/repository users, no AI expertise | Kaggle, open-source hubs |
| **RR-AD** | Research/gov teams with AI/data-science capability | AWS, Azure, HuggingFace, Kaggle |
| **DD-Basic** | Developers with no AI/MLOps subteam | HuggingFace, Roboflow, AWS, Azure, IBM |
| **DD-AD** | Teams already building/deploying AI | AWS, Azure, HuggingFace, Roboflow, IBM |

Respondents who answer "both" or "not sure" for their work type get a primary-context follow-up; the segment vector is derived from that primary use case.

## Demand Viability Index

```
Base (Basic): DVI    = 0.25·C + 0.20·T + 0.25·L + 0.15·U + 0.15·G
AD:           DVI_AD = 0.35·C + 0.10·T + 0.25·L + 0.15·U + 0.15·G   range 0.00–5.00
```

C = Cost Barrier · T = Technical Complexity · L = Localization Gap · U = UVP Resonance · G = Governance Resonance. AD reduces the T weight (advanced teams aren't blocked by skill) and reallocates it mainly to Cost; G is weighted equally across overlays (methodology **v2** — prior four-component records keep their original DVI and are never recomputed). Each component is a **respondent 0–5 self-rating**; the DVI is **recomputed deterministically in code** ([`lib/dvi.ts`](lib/dvi.ts)) using the route's overlay weights, so the stored value is auditable and never depends on the model's arithmetic.

The scale floor is **0** ("not a barrier" / "not useful"), which makes the "Weak" band reachable.

**Interpretation:** Weak 0.00–1.49 · Limited 1.50–2.49 · Moderate 2.50–3.49 · **Strong 3.50–5.00**.

### Demand × Asset matrix

The DVI is the **demand** axis. A second, **independent** axis measures **supply**: the **Asset & Contribution (AC)** score = `min(Possession, Willingness)` (two 0–5 self-ratings, computed in [`lib/matrix.ts`](lib/matrix.ts), which never imports `lib/dvi.ts`). The min-gate means an org scores high only if it both *holds* reusable AI assets and *would share* them. Plotting AC against the DVI with an inclusive **≥ 2.5** cut classifies each respondent — **Anchor** (high demand + high asset), **Consumer** (high demand, low asset), **Contributor** (low demand, high asset), **Peripheral** (low both). The asset fields are NULLABLE and backward-compatible; the DVI is untouched. See [`docs/specs/demand-asset-axis.md`](docs/specs/demand-asset-axis.md).

## What the form collects

**Every respondent** (form): organization type, current work, AI maturity, what they need, alternatives tried, friction with alternatives, the five DVI 0–5 ratings (each with an optional sub-friction tag picker), the two **Asset & Contribution** 0–5 ratings (asset possession + contribution willingness, with an optional asset-type tag picker), likelihood to try, first-use pathway, timeframe, adoption blockers, and a contact-consent choice.

**Advanced Demand respondents** additionally answer: their current AI-related work and their most significant remaining pain points.

**In the chat:** the open-ended main-problem statement, any rating revisions, and — for AD teams — one follow-up on the pain that persists despite existing AI capability.

## Respondent-facing vs internal (FR-064)

The model's final message contains a **visible respondent summary** (main friction, how the platform fits, a suggested next step, and the study-index disclaimer), followed by a `###FIELDS###` block (the open-ended main problem) and a `###INTERVIEW_COMPLETE###` marker. [`lib/report-parser.ts`](lib/report-parser.ts) shows the respondent only the visible summary and strips the fields block, the marker, and any `[[RERATE:x]]` directives. **The numeric component scores and DVI are computed and displayed by the app — never emitted or narrated by the model** — and contact details never appear in the chat UI.

## Privacy

- **Contact consent** — name and work email are captured and stored **only** if the respondent explicitly agrees to be contacted; without consent those fields are dropped before storage.
- Stray PII (emails, phone numbers, SSNs) is redacted from stored free-text, and the system prompt never requests credentials or personal identifiers.

## Quick Start

1. `npm install`
2. Create `.env.local` (see [`.env.example`](.env.example)): `GOOGLE_GENERATIVE_AI_API_KEY`, plus `DATABASE_URL` (+ `STORAGE_PROVIDER=neon`) or `GOOGLE_SHEETS_WEBHOOK_URL`.
3. `npm run dev` → http://localhost:3000

Without a storage backend configured the app still runs end-to-end; it simply won't persist interviews.

### Neon setup

Run [`schema.sql`](schema.sql) once in the Neon SQL Editor to create the `aiaas_market_analysis` table and the `dvi_by_vector` / `dvi_by_overlay` / `dvi_by_route` aggregate views. Stored columns: `timestamp`, `segment_vector`, `ai_maturity_overlay`, `final_route`, `organization_type`, `current_work_type`, `ai_maturity`, `ai_work`, `main_problem`, `need_tags`, `competitor_benchmarked`, `friction_tags`, `use_case_tags`, the four component scores (`cost_barrier_score_c` / `technical_complexity_score_t` / `localization_gap_score_l` / `uvp_resonance_score_u`), `dvi_score`, `interpretation`, `likelihood_to_try`, `first_use_pathway`, `timeframe`, `adoption_blockers`, `contact_consent`, `contact_name`, `contact_email`, `sanitized_summary`, `conversation_history` (plus an auto `assessment_id` and `created_at`).

### Google Sheets fallback

Create a sheet whose Row 1 headers match the column order documented in [`.env.example`](.env.example) (Timestamp … Conversation History), add the Apps Script `doPost` webhook (see [DEPLOYMENT.md](DEPLOYMENT.md)), and set `GOOGLE_SHEETS_WEBHOOK_URL` + `STORAGE_PROVIDER=google_sheets`.

## Security

Input validation (2,000-char messages) · rate limiting (30 chat/min, 5 submissions/5 min) · PII redaction on stored free-text · Zod payload bounds (segment/overlay/route enums, component scores 0–5, DVI 0–5) · prompt-injection detection · consent-gated contact storage · fail-loud storage with a 10s DB timeout · a system prompt that never requests credentials or personal identifiers. See [SECURITY.md](SECURITY.md).

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint` · `npm test`

## Roadmap

**Researcher dashboard** (deferred): aggregate views over `dvi_by_vector` / `dvi_by_overlay` / `dvi_by_route` — average DVI by vector and overlay, an Advanced Target Market Evidence bucket for the `*-AD` routes, competitor-friction counts, and top friction/use-case tags.

## License

MIT
