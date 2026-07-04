# Deployment Guide

This guide covers deploying the AIaaS Demand Viability Index (DVI) Chatbot to Vercel and setting up storage (Neon PostgreSQL primary, or Google Sheets as a fallback).

## Prerequisites

1. A Vercel account (https://vercel.com)
2. A Google Generative AI API key (https://aistudio.google.com/app/apikey)
3. For storage: a Neon project (https://neon.tech) **or** a Google account for Sheets

## Step 1: Set up storage

### Option A — Neon PostgreSQL (primary)

1. Create a free project at [neon.tech](https://neon.tech).
2. In the Neon SQL Editor, run the contents of [`schema.sql`](./schema.sql) once — this creates the `aiaas_market_analysis` table and the `dvi_by_vector` / `dvi_by_overlay` / `dvi_by_route` aggregate views.
3. Copy the connection string; you'll set it as `DATABASE_URL` in Step 2.

### Option B — Google Sheets (fallback)

1. Create a new spreadsheet named e.g. "AIaaS Market Analysis".
2. Add these headers in row 1, in this exact column order (A1 onward):

   `Timestamp, Segment, Overlay, Route, Organization Type, Current Work Type, AI Maturity, AI Work, Main Problem, Need Tags, Competitors, Friction Tags, Use Case Tags, Cost Barrier (C), Technical Complexity (T), Localization Gap (L), UVP Resonance (U), DVI, Interpretation, Likelihood To Try, First-Use Pathway, Timeframe, Adoption Blockers, Contact Consent, Contact Name, Contact Email, Summary, Conversation History`

3. Go to **Extensions → Apps Script**, delete any existing code, and paste:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    // If you set WEBHOOK_SIGNING_SECRET (see below), the payload is wrapped —
    // unwrap it here and verify the HMAC before trusting the data.
    if (data._webhookPayload) {
      data = JSON.parse(data._webhookPayload);
    }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      data.timestamp,
      data.segment,
      data.overlay,
      data.route,
      data.organizationType,
      data.currentWorkType,
      data.aiMaturity,
      data.aiWork,
      data.mainProblem,
      data.needTags,
      data.competitors,
      data.frictionTags,
      data.useCaseTags,
      data.costBarrier,
      data.technicalComplexity,
      data.localizationGap,
      data.uvpResonance,
      data.dvi,
      data.interpretation,
      data.likelihoodToTry,
      data.firstUsePathway,
      data.timeframe,
      data.adoptionBlockers,
      data.contactConsent,
      data.contactName,
      data.contactEmail,
      data.summary,
      data.conversationHistory
    ]);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. **Deploy → New deployment**, type **Web app**, Execute as **Me**, Access **Anyone**, then **Deploy**.
5. **Copy the Web App URL** — you'll set it as `GOOGLE_SHEETS_WEBHOOK_URL`.

> **Signed webhooks (optional):** if you set `WEBHOOK_SIGNING_SECRET`, the app HMAC-signs the payload and wraps it as `{ _webhookPayload, _webhookSignature, _webhookTimestamp }`. The `doPost` above unwraps `_webhookPayload`; for real integrity you should also recompute and compare the HMAC in the script. Leave the secret unset to send plain JSON.

## Step 2: Deploy to Vercel

### Option A: Deploy from GitHub (recommended)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/aiaas-marketability-chatbot.git
   git push -u origin main
   ```
2. Go to https://vercel.com/new and import the repository.
3. Framework Preset **Next.js**, Root Directory `./`, Build Command `npm run build`, Output `.next`.
4. Add Environment Variables:
   - `GOOGLE_GENERATIVE_AI_API_KEY` — your Google AI API key (required)
   - `DATABASE_URL` — Neon connection string (run `schema.sql` in the Neon console first)
   - `STORAGE_PROVIDER` — `neon` or `google_sheets` (optional; auto-detected from credentials when unset)
   - `GOOGLE_SHEETS_WEBHOOK_URL` — the Web App URL from Step 1 (only if using Sheets)
   - `WEBHOOK_SIGNING_SECRET` — optional, to sign the Sheets payload
5. Click **Deploy**.

### Option B: Deploy using Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
vercel env add GOOGLE_GENERATIVE_AI_API_KEY
vercel env add DATABASE_URL
vercel env add STORAGE_PROVIDER
vercel env add GOOGLE_SHEETS_WEBHOOK_URL
vercel --prod
```

## Step 3: Configure a custom domain (optional)

In the Vercel project dashboard, **Settings → Domains**, add your domain (e.g. `aiaas-study.dost.gov.ph`) and update DNS per Vercel's instructions.

## Step 4: Test the deployment

1. Visit the deployed URL and complete a test interview through to the summary.
2. Check your storage backend — the record should appear in the Neon `aiaas_market_analysis` table (or your Google Sheet).
3. Use the "View Report" button to confirm the printable summary renders (component scores stay internal).

## Environment Variables Summary

```
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Neon PostgreSQL (primary storage)
DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require
STORAGE_PROVIDER=neon

# Google Sheets (alternative backend)
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/...
WEBHOOK_SIGNING_SECRET=            # optional
```

The same variables must be added to Vercel's environment settings.

## Monitoring and analytics

- **Neon:** query the table — `SELECT * FROM aiaas_market_analysis ORDER BY created_at DESC`. The `dvi_by_vector` / `dvi_by_overlay` / `dvi_by_route` views give average DVI per segment vector, maturity overlay, and final route (the `*-AD` rows are the Advanced Target Market Evidence).
- **Google Sheets:** records append as rows; build charts/pivots directly, or export to CSV.
- **Logs:** Vercel dashboard → deployment/function logs.

## Troubleshooting

### Interview not saving to Neon
1. Check Vercel logs for `[neonSubmission]` errors (`code=42P01` means the `aiaas_market_analysis` table is missing — run `schema.sql`).
2. Verify `DATABASE_URL` is set for **Production** (not just Preview).
3. Verify `STORAGE_PROVIDER` is `neon` or unset (an unrecognized value warns and falls back to auto-detection).
4. Free-tier Neon computes suspend when idle; the first request after suspension is slower.

### Interview not submitting to Google Sheets
1. Verify the webhook URL is correct and `STORAGE_PROVIDER=google_sheets` (or `DATABASE_URL` is unset so auto-detection picks Sheets).
2. Ensure the Apps Script is deployed as a Web app with "Anyone" access.
3. If you enabled `WEBHOOK_SIGNING_SECRET`, confirm the script unwraps `_webhookPayload`.

### Slow responses / build failures
- Check the Google AI API quota; consider a higher Vercel function timeout.
- Ensure Node.js ≥ 20 and that all dependencies are in `package.json`.

## Security considerations

1. **Never commit `.env.local`** to git.
2. Rate limiting is built in (30 chat req/min, 5 submissions/5 min).
3. PII is redacted server-side; contact name/email are stored only with the respondent's consent.
4. Vercel serves HTTPS by default.

## Updating the deployment

Commit and push to GitHub (Vercel auto-redeploys), or run `vercel --prod`.
