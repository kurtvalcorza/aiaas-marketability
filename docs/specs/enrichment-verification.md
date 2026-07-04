# Handoff: Live verification of the qualitative-enrichment pass

## Goal
Confirm the end-to-end round-trip that unit tests can't cover:
submit an interview → row stored → `after()` fires → Gemini `generateObject`
→ `updateEnrichment` writes back → `enrichment_status = 'ok'` with populated columns.

The enrichment pass (see [`llm-scope-expansion.md`](./llm-scope-expansion.md)) ships
behind the `ENRICHMENT_ENABLED` flag (on by default when a Google AI key is present)
and runs on the Neon backend only. Unit tests use an injected mock model, so this
runbook is the way to exercise the live path.

## Prerequisites
- Node 20+.
- A Neon Postgres database (a scratch/dev DB is fine).
- A Google AI (Gemini) API key.

## 1. Apply the migration
The enrichment writes to new columns; if they don't exist the write-back fails
silently (row still saved, status stays `pending`). Run the schema — the
enrichment block is `ADD COLUMN IF NOT EXISTS`, so re-running is safe:

- Paste `schema.sql` into the Neon SQL Editor and run it, **or**
  ```bash
  psql "$DATABASE_URL" -f schema.sql
  ```

Sanity check the columns landed:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'aiaas_market_analysis' AND column_name LIKE '%enrich%';
-- expect: enrichment_status, enrichment_model, enrichment_version, enriched_at
```

## 2. Configure env (`.env.local`)
```bash
GOOGLE_GENERATIVE_AI_API_KEY=<your-gemini-key>
DATABASE_URL=<your-neon-connection-string>
STORAGE_PROVIDER=neon
# leave ENRICHMENT_ENABLED blank = on. ENRICHMENT_MODEL / ENRICHMENT_TIMEOUT_MS optional.
```

## 3. Run the app
```bash
npm install
npm run dev   # http://localhost:3000
```

## 4. Submit one interview
Fastest path is a direct POST (bypasses the UI, still hits validation + rate limit).
The `conversationHistory` deliberately contains an email + phone to prove input-side
PII sanitization:

```bash
curl -sS -X POST http://localhost:3000/api/submit \
  -H 'Content-Type: application/json' \
  -d '{
    "segment":"RR","overlay":"AD","route":"RR-AD",
    "organizationType":"University research lab","currentWorkType":"NLP research",
    "aiMaturity":"Actively training models","aiWork":"Fine-tuning local LLMs",
    "mainProblem":"No Filipino-language datasets to fine-tune on",
    "needTags":["Localized datasets","Ready-to-use models"],
    "competitors":"OpenAI, self-hosted Llama",
    "frictionTags":["Cloud egress fees","No local data"],
    "useCaseTags":["Inference API","Fine-tuning workbench"],
    "scores":{"costBarrier":1,"technicalComplexity":3,"localizationGap":5,"uvpResonance":4},
    "dvi":3.2,"interpretation":"Moderate demand signal",
    "likelihoodToTry":"Very likely","firstUsePathway":"Call the inference API",
    "timeframe":"Within 3 months","adoptionBlockers":"Budget approval",
    "contactConsent":false,"contactName":"","contactEmail":"",
    "summary":"Research lab blocked by lack of localized datasets and egress costs.",
    "timestamp":"2026-07-04T12:00:00.000Z",
    "conversationHistory":"Interviewer: what does egress cost monthly? Respondent: ~PHP 40k. Reach me at jane@example.com or 213-555-0134. Missing Tagalog and Cebuano corpora."
  }'
# expect: {"success":true,"message":"Interview submitted successfully"}
```

Enrichment is async (a Gemini call), so **wait ~10–20s** before querying.

## 5. Verify in the DB
```sql
SELECT enrichment_status, enrichment_model, evidence_sentiment, interview_quality,
       themes, quantified_pains, reconciliation_events,
       llm_inferred_cost_c, llm_inferred_technical_t,
       llm_inferred_localization_l, llm_inferred_uvp_u,
       suggested_need_tags, conversation_history
FROM aiaas_market_analysis
ORDER BY created_at DESC LIMIT 1;
```

### Acceptance criteria
- [ ] `enrichment_status = 'ok'` (transitioned from `pending`).
- [ ] `themes`, `quantified_pains`, `reconciliation_events` are valid JSON arrays.
- [ ] `llm_inferred_*` are numerics in 0–5, and **differ from the self-ratings**
      (e.g. inferred cost > the self-rated 1, since the transcript stresses cost) —
      this is the shadow-rating / self-report-bias signal.
- [ ] **No PII** anywhere: `jane@example.com` / `213-555-0134` appear nowhere in
      `conversation_history` or any enrichment column (redacted to `[EMAIL_REDACTED]` /
      `[PHONE_REDACTED]`). This confirms both input- and output-side scrubbing.

### Views
```sql
SELECT * FROM enrichment_coverage;   -- an 'ok' row after step 4
SELECT * FROM theme_frequency;
SELECT * FROM self_vs_inferred;      -- self vs shadow-rating gaps per route
SELECT * FROM reconciliation_rate;
```

## 6. Negative checks (optional but recommended)
- **Disabled → skipped:** set `ENRICHMENT_ENABLED=false`, restart, submit again →
  new row lands `enrichment_status = 'skipped'` (not `'failed'`).
- **Failure → failed:** set `ENRICHMENT_MODEL=models/does-not-exist`, restart, submit →
  new row lands `enrichment_status = 'failed'`, and the submission still returns `200`.

## Troubleshooting
- **Stuck at `pending`:** the `after()` write-back errored. Check the dev-server
  console for `[neonSubmission] Error attaching enrichment [ … code=42703]` —
  `42703` = column doesn't exist ⇒ step 1 (migration) wasn't applied.
- **`skipped` unexpectedly:** `ENRICHMENT_ENABLED=false` or no `GOOGLE_GENERATIVE_AI_API_KEY`.
- **`failed`:** bad/expired key, wrong `ENRICHMENT_MODEL`, network, or timeout
  (raise `ENRICHMENT_TIMEOUT_MS`).
- **Submission itself 400s:** a field violates `interviewDataSchema`
  (`lib/schemas.ts`) — e.g. `contactEmail` must be `""` or a valid email; `timestamp`
  must be ISO-8601.

## Rollback
Set `ENRICHMENT_ENABLED=false` — submissions are unaffected; rows just record
`skipped`. The columns/views are additive and harmless if unused.
