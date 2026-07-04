# Security Measures

This document outlines the security measures implemented in the **AIaaS Demand Viability Index (DVI) Chatbot** — a marketability / demand-validation interview tool for a localized AI-as-a-Service (AIaaS) platform (DOST-NAIRA) — to protect against abuse, data breaches, and malicious input.

## Overview

The application is a Next.js app that conducts a scored market-evidence interview and persists a compact, sanitized record to a configurable storage backend (Neon PostgreSQL by default, or an optional Google Sheets webhook). Security controls are layered across the frontend, the API routes, and the storage services.

**Security posture highlights:**
- ✅ Two-tier rate limiting (chat + submission), with an optional Vercel KV distributed limiter and an in-memory fallback
- ✅ Message length cap (2,000 chars) + spam/gibberish detection + prompt-injection detection (blocking)
- ✅ Zod schema validation of every submission (enums, score/DVI ranges, per-field length bounds)
- ✅ PII redaction (email / phone / SSN) applied client-side and **re-applied server-side** before storage
- ✅ Contact-consent gating: name/email are captured and stored **only** with explicit consent
- ✅ Parameterized (tagged-template) SQL for Neon; optional HMAC-signed Google Sheets webhook
- ✅ Hardened Content Security Policy + security headers set in a Next.js proxy
- ✅ CSP violation reporting endpoint with its own rate limiting
- ✅ Sanitized API error responses (only known validation errors surfaced; all others generic)
- ✅ Privacy consent banner; declining still lets the user view/print their report

---

## 1. Privacy & Consent Management

### User Consent Banner
- **Implementation**: `components/ConsentBanner.tsx`, `lib/consent.ts`, `hooks/useConsent.ts`
- **Behavior**:
  - Displays on first visit with a clear privacy notice
  - User can accept or decline data collection; closing the banner (or the backdrop) counts as **decline**
  - Choice is stored in `localStorage`, versioned (`CONSENT_VERSION`) so a change of terms re-prompts returning users
  - Consent is required before an interview record is submitted to storage
- **User Control**:
  - Accept: the sanitized interview record is saved to the configured storage backend (Neon PostgreSQL by default, or Google Sheets)
  - Decline: the interview still works and the report can still be viewed/printed; nothing is persisted
  - Preference persists across sessions

### In-Interview Contact Consent
Beyond the consent banner, each submitted record carries a `contactConsent` boolean captured in the form (see §5 and §9): it gates whether the respondent's name and work email are captured and stored at all. Without consent those fields are dropped before storage.

### Data Collection Transparency
- The banner explains what is collected and that responses are sanitized to remove personal information before storage
- Contact details are stored only if the respondent explicitly opts in
- Declining does not remove functionality (report is still viewable/printable)

---

## 2. Content Security Policy (CSP) & Security Headers

Security headers are set in `proxy.ts` (a Next.js proxy) on every non-API, non-static request. A fresh cryptographic nonce is generated per request and exposed to pages via the `x-nonce` request header.

### Environment-Based CSP
- **Development Mode**: relaxed CSP for hot reload and dev tooling (wildcard `frame-ancestors` for common preview hosts, `X-CSP-Nonce` response header for debugging)
- **Production Mode**: specific domains only (no wildcards)

### CSP Directives (Production)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' blob: data: https://fonts.gstatic.com;
font-src 'self' https://fonts.gstatic.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self' https://acabai-ph.vercel.app https://kurt.valcorza.com;
connect-src 'self' https://generativelanguage.googleapis.com https://script.google.com https://va.vercel-scripts.com https://vitals.vercel-insights.com;
worker-src 'self' blob:;
upgrade-insecure-requests;
report-uri /api/csp-report;
```

**Note**: The app is designed to be embeddable as an iframe on trusted domains, so `frame-ancestors` allows a specific allowlist. Next.js requires `'unsafe-inline'` and `'unsafe-eval'` in `script-src` for its framework scripts under this proxy-based CSP approach; the per-request nonce provides additional protection for custom inline scripts. `connect-src` is limited to the Gemini API (`generativelanguage.googleapis.com`), the Google Apps Script webhook host, and Vercel analytics.

### Additional Security Headers
Set alongside the CSP in `proxy.ts`:
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-DNS-Prefetch-Control: false`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()`

The chat API route additionally sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` on its streaming response.

### CSP Violation Reporting
- **Endpoint**: `POST /api/csp-report` (`app/api/csp-report/route.ts`)
- Logs violation details server-side; has its own in-memory rate limiter (100 reports/min per IP) to prevent flooding
- Only a `POST` handler exists (no `GET`), avoiding information disclosure

---

## 3. Rate Limiting

Implemented in `lib/rate-limit.ts` with limits configured in `lib/constants/security.ts`.

### Chat API Rate Limiting
- **Limit**: 30 requests per minute per IP address
- **Window**: 60 seconds
- **Response**: HTTP 429 with `Retry-After: 60` (and `X-RateLimit-Remaining: 0`)
- **Location**: `app/api/chat/route.ts`

### Submission API Rate Limiting
- **Limit**: 5 submissions per 5 minutes per IP address
- **Window**: 300 seconds (5 minutes)
- **Response**: HTTP 429 with `Retry-After: 300`
- **Purpose**: prevents spam submissions to the storage backend
- **Location**: `app/api/submit/route.ts`

### Rate Limiting Mechanism
- Keyed on the client IP from the `x-forwarded-for` header (provided by Vercel); degrades gracefully to `'unknown'` when unavailable
- **Distributed limiter (optional)**: if `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set and `@vercel/kv` is installed, an atomic Redis-backed limiter is used (fails open if KV errors)
- **In-memory fallback**: used when KV is not configured, with automatic cleanup of expired records every 5 minutes; resets on server restart and is not shared across instances

---

## 4. Input Validation

### Chat Message Validation
Enforced in `services/chatService.ts` (limits in `lib/constants/validation.ts`, patterns in `lib/constants/security.ts`):

- **Message length**: maximum 2,000 characters per user message; over-limit messages are rejected
- **Conversation length**: maximum 80 messages per conversation (accommodates the multi-question interview flow)
- **Spam / gibberish detection** (`validateMessageContent` in `lib/validation.ts`): rejects extremely repetitive input (fewer than 5 unique characters in messages longer than 100 characters)
- **Prompt-injection screening** (`detectPromptInjection` in `lib/validation.ts`): applied to **both `user` and `system`** message content; when a pattern matches, the request is **blocked** (`BLOCK_PROMPT_INJECTION` is enabled). This is a best-effort denylist — a speed bump, not a complete defense — kept high-signal to avoid false positives on real answers. Patterns include:
  - "ignore / disregard / forget (the) (previous|all|prior|above|preceding) (instructions|prompts|rules|messages)"
  - role-override ("system: you are ...", "you are now a/an/the ...")
  - prompt-exfiltration ("reveal / print / show / repeat / expose (your) (system) prompt/instructions")
  - "new instructions:"
  - `<script>` tags, template injection `{{ ... }}`, string interpolation `${ ... }`
- **Conversation-shape enforcement** (`validateConversation`): rejects unrecognized message roles and allows **at most one `system` message, which must be first** — so a direct API caller cannot smuggle extra or mid-conversation `system` instructions past the injection screen (previously only `role: "user"` was screened). The system message has its own length cap (`MAX_SYSTEM_MESSAGE_LENGTH`); `assistant` turns (the model's own prior output) are passed through unmodified.
- **Architectural guardrail (the strongest layer)**: even a successful injection cannot corrupt results. The DVI and component scores are computed by the app from the structured form — never by the model — and no secrets are placed in the model's context. A jailbreak can at most alter free-text summary prose, not the stored score, route, or contact data.

The client also enforces the 2,000-character limit (`maxLength` + character counter) for UX, but the server-side checks above are authoritative.

### Submission Validation (Zod)
Every submission to `POST /api/submit` is validated against `interviewDataSchema` in `lib/schemas.ts` (via `validateInterviewData`). This enforces the full data model rather than ad-hoc field checks:

- **Enums**: `segment` (`RR`/`DD`), `overlay` (`basic`/`AD`), `route` (`RR-Basic`/`RR-AD`/`DD-Basic`/`DD-AD`)
- **DVI component scores** (`costBarrier`, `technicalComplexity`, `localizationGap`, `uvpResonance`): each a number in the range **0.0–5.0**
- **DVI** (`dvi`): a number in the range **0–5**
- **Contact email**: must be empty or a valid work-email shape
- **Per-field length bounds** on all free-text fields and tag arrays (organization type, main problem, need/friction/use-case tags, competitors, blockers, summary, contact fields, etc.), so a direct API call cannot store unbounded data
- **Conversation history**: hard request cap (`MAX_HISTORY_PAYLOAD_SIZE`), further truncated before storage

Field-length limits are enforced by the Zod schema itself; there is no separate manual length check in the route.

---

## 5. Data Sanitization

### PII Redaction
`sanitizePII` in `lib/validation.ts` redacts (patterns in `lib/constants/validation.ts`):
- **Email addresses** → `[EMAIL_REDACTED]`
- **Phone numbers** → `[PHONE_REDACTED]`
- **Social Security Numbers** → `[SSN_REDACTED]`

### Conversation History Sanitization
`sanitizeConversationHistory` (`lib/validation.ts`) builds a minimal `{role, content}` structure with only text parts, redacts PII, truncates each message to 500 chars, and caps the whole history at 50,000 bytes (`MAX_CONVERSATION_HISTORY_SIZE`). It fails gracefully to a safe placeholder if sanitization throws.

### Server-Side Re-Sanitization Before Storage
`services/submissionRecord.ts` (`buildSubmissionRecord`) is the single source of truth for the flat record every backend stores, so backends cannot drift. Because client-side sanitization can be bypassed by calling the API directly, it re-applies protection server-side:
- Re-runs PII redaction and re-truncates the conversation history to the size cap
- Redacts PII in every free-text field and strips NUL characters (which PostgreSQL `TEXT` columns cannot store)
- **Contact-consent gating**: `contactName` and `contactEmail` are stored **only** when `contactConsent === true` (stored verbatim, since they are the intended contact fields), and blank otherwise

---

## 6. Error Handling

### Client-Side
- User-friendly error messages in the UI (e.g. "Message too long")
- Errors do not expose internal system details
- **Location**: `app/page.tsx`, `components/ErrorAlert.tsx`, `components/ErrorBoundary.tsx`, `components/ChatErrorBoundary.tsx`

### Server-Side
- API handlers are wrapped in try/catch; server-side logging goes through `lib/safe-logger.ts` (redacted logging)
- Only a small allowlist of known validation error messages is surfaced to the client (e.g. Zod "Validation failed: ...", length/injection errors); all other errors return a generic message
- Correct HTTP status codes are used (400 for validation, 429 for rate limiting, 500 for internal)
- **Location**: `app/api/chat/route.ts`, `app/api/submit/route.ts`, `lib/api-utils.ts`

---

## 7. Content Rendering Safety

### Markdown Rendering
- **Library**: `react-markdown` with `remark-gfm`, which sanitizes HTML and prevents XSS by default; no raw HTML is enabled
- **Location**: `components/ChatMessage.tsx`

### React's Built-in XSS Protection
- All user input is rendered through React components with automatic HTML escaping
- No `dangerouslySetInnerHTML` is used in the chat/report UI

### Report Preview
The completed-interview "View Report" opens a styled HTML report in a new browser tab for printing / "Save as PDF" (no third-party PDF library is bundled). **Location**: `components/AssessmentComplete.tsx`.

---

## 8. Environment Security

### API Key & Secret Protection
- The Google AI (Gemini) API key, storage credentials, and webhook secret are read from environment variables and validated at runtime via a Zod env schema (`lib/schemas.ts`, `lib/env.ts`)
- Secrets are never committed to git (`.env.local` is git-ignored)
- Environment variables: `GOOGLE_GENERATIVE_AI_API_KEY`, `DATABASE_URL`, `STORAGE_PROVIDER`, `GOOGLE_SHEETS_WEBHOOK_URL`, `WEBHOOK_SIGNING_SECRET` (and optionally `KV_REST_API_URL` / `KV_REST_API_TOKEN`)

### Vercel Deployment Security
- HTTPS enforced by default; environment variables encrypted at rest
- Webhook URL and database credentials are server-only and never exposed to the client

---

## 9. Storage Integration Security

The active backend is chosen by `resolveStorageProvider` (`lib/storage-provider.ts`): an explicit `STORAGE_PROVIDER` wins, otherwise it is inferred from whichever backend is configured (`DATABASE_URL` → Neon, else `GOOGLE_SHEETS_WEBHOOK_URL` → Sheets).

### Neon PostgreSQL (primary storage)
- `DATABASE_URL` grants full SQL read/write over all collected interview data — treat it as a high-value secret (more powerful than the append-only Sheets webhook)
- Connection string should use `sslmode=require`
- PII redaction, per-field cleaning, and the conversation-history size cap are re-applied server-side before insert (`services/submissionRecord.ts`)
- The `INSERT` uses the Neon driver's **tagged-template (parameterized) API** — no string-built SQL — into the `aiaas_market_analysis` table
- Inserts have a 10-second abort timeout so a hung connection fails fast (well within the route's 30s `maxDuration`)
- The table enforces its own `CHECK` constraints (route/overlay/segment enums, component scores 0–5, DVI 0–5) as a defense-in-depth backstop to the Zod validation
- **Location**: `services/neonSubmissionService.ts`, `schema.sql`

### Google Sheets Webhook (optional backend)
- The webhook URL is sensitive (contains a random token) and should be kept confidential
- Only the sanitized, PII-redacted record is sent (no raw user input)
- Rate limiting and Zod validation apply on both client and server before submission
- Optional **HMAC-SHA256 signing** via `WEBHOOK_SIGNING_SECRET`: when set, the payload is signed over `${timestamp}.${payload}` so the receiving Google Apps Script can verify origin and reject stale requests (`MAX_TIMESTAMP_DRIFT_MS` = 5 min)
- **Location**: `services/submissionService.ts`, `lib/webhook-signing.ts`

### Data Privacy
- Conversation history and free-text fields are sanitized before storage (client-side and again server-side)
- PII is redacted automatically; contact name/email are captured and stored only with explicit `contactConsent`

---

## 10. Known Limitations & Future Improvements

### Current Limitations
1. **Rate Limiting**: the in-memory fallback resets on server restart and is not shared across instances (configure Vercel KV for cross-instance limiting)
2. **IP-Based**: can be bypassed with VPN/proxies (acceptable for this low-stakes research tool)
3. **PII Detection**: regex-based; may miss complex or unusual PII formats
4. **No Authentication**: anyone can use the interview tool (by design for a self-service research instrument)
5. **CSP**: Next.js requires `'unsafe-inline'` and `'unsafe-eval'` for framework scripts under the proxy-based CSP
6. **Webhook**: Google Sheets webhook HMAC signing is opt-in (requires `WEBHOOK_SIGNING_SECRET`)

### Recommended Future Enhancements
1. **Persistent Rate Limiting**: enable Vercel KV in production for cross-instance rate limiting
2. **Advanced PII Detection**: ML-based entity recognition
3. **CAPTCHA**: add a bot-abuse challenge on submission
4. **Audit Logging**: log submissions with metadata for security monitoring
5. **Data Retention Policy**: automatic deletion of old interview records
6. **API Key Rotation**: regular rotation schedule for the Gemini API key

---

## Security Checklist for Deployment

- [ ] Environment variables configured correctly (`GOOGLE_GENERATIVE_AI_API_KEY`, storage backend)
- [ ] `.env.local` not committed to git
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Neon `DATABASE_URL` kept confidential (grants full database access) and uses `sslmode=require`
- [ ] Google Sheets webhook URL kept confidential (if used)
- [ ] `WEBHOOK_SIGNING_SECRET` set if the Sheets webhook is used
- [ ] Rate limiting tested and working (Vercel KV configured for production)
- [ ] Submission validation tested with edge cases (enums, out-of-range scores/DVI)
- [ ] Error messages don't leak sensitive information
- [ ] PII redaction tested with sample data (email / phone / SSN)
- [ ] Contact-consent gating tested (name/email dropped without consent)
- [ ] Users informed about data collection (consent banner)
- [ ] Monitoring and logging enabled for security events

---

## Incident Response

If you suspect a security issue:

1. **Do Not** disable the application immediately (may alert attackers)
2. **Review Logs**: check server logs for unusual patterns
3. **Check Rate Limits**: verify whether rate limiting is triggering
4. **Review Stored Data**: check the Neon `aiaas_market_analysis` table (and/or the Google Sheet) for suspicious submissions
5. **Rotate Keys**: if compromise is suspected, rotate the Gemini API key
6. **Rotate Database Credentials**: if `DATABASE_URL` may be exposed, reset the database password/role in the Neon console immediately and review database access history
7. **Update Webhook**: generate a new Google Sheets webhook URL if exposed, and rotate `WEBHOOK_SIGNING_SECRET`
8. **Document**: record the incident and the response actions taken

---

## Questions or Concerns?

For security-related questions or to report a vulnerability, please contact the repository maintainer.

**Note**: This is a self-service market-research interview tool for the AIaaS demand study. It should not be used to collect or store highly sensitive personal information.
