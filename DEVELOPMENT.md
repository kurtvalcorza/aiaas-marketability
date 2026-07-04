# Development Guide

This is the **AIaaS Demand Viability Index (DVI) Chatbot** — a marketability /
demand-validation interview tool for a localized AI-as-a-Service (AIaaS) platform
(DOST-NAIRA). A respondent first completes a structured form (routing, tag pickers, and the
four 0.0–5.0 component self-ratings), then a short chat (open-ended problem,
contradiction reconciliation, any AD follow-up, and the summary). The app is
routed into one of four interview routes (RR / DD primary vector × Basic / AD
maturity overlay) and scored with an overlay-weighted Demand Viability Index
(DVI) that the **app computes deterministically from the self-ratings — the model
never scores**. It is built on the `ai-readiness-assessment` template but is
**not** a readiness assessment.

## Project Structure

```
aiaas-marketability-chatbot/
├── app/
│   ├── api/
│   │   ├── chat/         # Chat API endpoint with AI streaming
│   │   ├── submit/       # Interview submission endpoint
│   │   └── csp-report/   # Content-Security-Policy violation reports
│   ├── layout.tsx        # Root layout with analytics
│   └── page.tsx          # Main chat interface
├── components/
│   ├── AssessmentComplete.tsx  # Completion screen with app-computed DVI card + report
│   ├── ChatHeader.tsx          # Header component
│   ├── ChatInput.tsx           # Input component with validation
│   ├── ChatMessage.tsx         # Message display component
│   ├── ChatMessageList.tsx     # Scrolling message list
│   ├── ChatErrorBoundary.tsx   # Chat-scoped error boundary
│   ├── ConsentBanner.tsx       # Data-collection consent banner
│   ├── ErrorAlert.tsx          # Error notification component
│   ├── ErrorBoundary.tsx       # App-level error boundary
│   ├── InterviewForm.tsx       # Phase 1: structured form (routing, tags, four 0–5 ratings)
│   └── LoadingIndicator.tsx    # Loading animation
├── hooks/
│   ├── useInterviewFlow.ts     # form→chat phase machine, rerate, completion & submission
│   ├── useChatScroll.ts        # Auto-scroll behavior
│   └── useConsent.ts           # Consent state
├── lib/
│   ├── dvi.ts            # Demand Viability Index computation (weights, bands)
│   ├── questions.ts      # Form question bank, form→InterviewCore mapping, DVI computation
│   ├── routes.ts         # Route / overlay / contact-consent helpers
│   ├── report-parser.ts  # Chat-phase parsing (summary, main problem, rerate directive)
│   ├── systemPrompt.ts   # Chat-phase interviewer system prompt (reconcile + summary)
│   ├── schemas.ts        # Zod schemas (env, interview data)
│   ├── types.ts          # TypeScript type definitions (InterviewData, etc.)
│   ├── constants.ts      # Application constants and patterns
│   ├── env.ts            # Environment validation
│   ├── storage-provider.ts # Resolves the active storage backend
│   ├── rate-limit.ts     # Rate limiting (Vercel KV + in-memory)
│   ├── validation.ts     # Security and data validation (PII, injection)
│   ├── webhook-signing.ts # HMAC signing for the Google Sheets webhook
│   └── consent.ts        # Consent helpers
├── services/
│   ├── chatService.ts            # Chat request helpers
│   ├── submissionRecord.ts       # Maps InterviewData -> flat storage record
│   ├── submissionService.ts      # Google Sheets submission backend
│   └── neonSubmissionService.ts  # Neon PostgreSQL submission backend
├── schema.sql            # Neon schema: aiaas_market_analysis + aggregate views
└── package.json
```

## Architecture

### Frontend (Next.js App Router)

- **React Components**: Modular, reusable UI components with TypeScript
- **AI SDK**: Vercel AI SDK for streaming chat responses
- **Tailwind CSS**: Utility-first styling with responsive design
- **Accessibility**: WCAG 2.1 compliant with ARIA labels and keyboard navigation

### Backend (API Routes)

- **Chat API** (`/api/chat`):
  - Streams responses from Google Gemini 2.5 Flash (via the AI SDK)
  - Runs the route-aware interview defined in `lib/systemPrompt.ts`
  - Rate limiting: 30 requests per minute per IP
  - Content validation and prompt injection detection
  - Message length and count limits

- **Submit API** (`/api/submit`):
  - Persists a completed interview to the configured storage backend
    (Neon PostgreSQL or Google Sheets), resolved per request via
    `resolveStorageProvider()`
  - Rate limiting: 5 submissions per 5 minutes per IP
  - Data structure validation (`validateInterviewData`, Zod)
  - PII sanitization and NUL stripping before storage

- **CSP Report API** (`/api/csp-report`):
  - Collects browser Content-Security-Policy violation reports

### Data Model (DVI)

An interview is captured as an `InterviewData` object (`lib/types.ts`) and
flattened by `services/submissionRecord.ts` into the record every backend
stores. The form owns most fields; `mainProblem` and `summary` come from the
chat phase. Key fields:

- **Route metadata**: `route` (`RR-Basic` | `RR-AD` | `DD-Basic` | `DD-AD`),
  derived `segment` (`RR` | `DD`) and `overlay` (`basic` | `AD`) — see
  `lib/routes.ts`. AD is a maturity overlay detected within RR or DD, not a
  separate market.
- **Four DVI component scores** (`scores`, each a **0.0–5.0 self-rating** from the
  form, `lib/dvi.ts`): Cost Barrier (C), Technical Complexity (T), Localization
  Gap (L), UVP Resonance (U). **The rating IS the component score — the model
  never computes or assigns one.** The scale floor is 0, which makes the "Weak"
  band reachable.
- **`dvi`**: the overlay-weighted Demand Viability Index (0.00–5.00), computed
  deterministically by the app via `computeDVI()` from the self-ratings, so the
  stored value is auditable. Basic weights are `0.30·C + 0.25·T + 0.25·L + 0.20·U`;
  AD weights de-emphasize Technical Complexity: `0.40·C + 0.10·T + 0.30·L + 0.20·U`.
- **`interpretation`**: one of four demand bands (`interpretDVI()`) — Strong
  (≥3.5), Moderate (≥2.5), Limited (≥1.5), or Weak.
- **Qualitative fields**: `organizationType`, `currentWorkType`, `aiMaturity`,
  `aiWork` (AD only), `mainProblem` (open-ended, from chat), `needTags`,
  `competitors`, `frictionTags`/`useCaseTags`, `likelihoodToTry`,
  `firstUsePathway`, `timeframe`, `adoptionBlockers`, `summary`,
  `conversationHistory`.
- **Contact consent**: `contactConsent` (a boolean) gates whether `contactName`
  and `contactEmail` are captured and stored at all.

The Neon backend writes to the `aiaas_market_analysis` table (see `schema.sql`),
which also defines aggregate views (`dvi_by_vector`, `dvi_by_overlay`,
`dvi_by_route`) for a planned researcher dashboard.

### Security Features

1. **Rate Limiting**:
   - Production: Vercel KV (Redis-based, distributed)
   - Development: In-memory fallback
   - Automatic cleanup of old entries
   - Configurable limits per endpoint

2. **Input Validation**:
   - Maximum message length (2000 characters)
   - Maximum conversation size (80 messages)
   - Spam detection (unique character analysis)
   - Prompt injection pattern detection (screens both `user` and `system` messages;
     at most one `system` message, which must be first)

3. **Data Sanitization**:
   - PII redaction (email, phone, SSN)
   - Conversation history truncation
   - Field length limits
   - Structure validation

## Environment Variables

See `.env.example` for the full, annotated list.

### Required

- `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey) (powers Gemini 2.5 Flash)

### Storage (configure at least one to persist interviews)

- `DATABASE_URL`: Neon PostgreSQL connection string. Run `schema.sql` once in the
  Neon SQL Editor to create the `aiaas_market_analysis` table and views.
- `STORAGE_PROVIDER`: `neon` or `google_sheets`. If unset, the backend is
  auto-detected — Neon when `DATABASE_URL` is set, otherwise Google Sheets when
  `GOOGLE_SHEETS_WEBHOOK_URL` is set.
- `GOOGLE_SHEETS_WEBHOOK_URL`: Apps Script Web App URL for the Google Sheets
  backend (alternative to Neon).
- `WEBHOOK_SIGNING_SECRET`: Optional shared secret for HMAC-signing the Google
  Sheets webhook payload; must match the `SIGNING_SECRET` in your Apps Script.

If no storage backend is configured, the app still runs but does not save
interviews.

### Optional (production rate limiting)

- `KV_REST_API_URL`: Vercel KV REST API URL (for distributed rate limiting)
- `KV_REST_API_TOKEN`: Vercel KV REST API token (for distributed rate limiting)

## Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Run the test suite** (Vitest):
   ```bash
   npm test          # single run
   npm run test:watch  # watch mode
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Rate Limiting Setup

### Development (In-Memory)

No configuration needed. The app automatically uses in-memory rate limiting in development.

### Production (Vercel KV)

1. **Create Vercel KV database**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Navigate to Storage
   - Create a new KV database

2. **Link to project**:
   ```bash
   vercel link
   vercel env pull
   ```

3. **Deploy**:
   ```bash
   vercel deploy
   ```

The app will automatically detect KV credentials and use distributed rate limiting.

## Testing

### Automated Tests

Unit and integration tests run on Vitest (`npm test`), covering DVI computation,
route/overlay resolution, report parsing, validation, and the storage backends.

### Manual Testing Checklist

- [ ] Chat interaction works correctly
- [ ] Messages display with proper formatting
- [ ] Rate limiting triggers after threshold
- [ ] Route detection works for all four routes (RR-Basic, RR-AD, DD-Basic, DD-AD)
- [ ] DVI and interpretation band match the component scores (per overlay weights)
- [ ] Interview completion detected and submission persists to the storage backend
- [ ] Report download (Markdown) works
- [ ] Report download (PDF) works
- [ ] New interview reset works
- [ ] Consent banner and contact-consent choice are honored (name/email dropped without consent)
- [ ] Mobile responsive design
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

### Security Testing

- [ ] Prompt injection attempts are logged
- [ ] Long messages are rejected
- [ ] Too many messages are rejected
- [ ] Rate limit blocks excessive requests
- [ ] PII is redacted in stored data

## Code Quality Standards

### TypeScript

- ✅ Strict mode enabled
- ✅ No `any` types (except controlled legacy code)
- ✅ Explicit return types on functions
- ✅ Interface definitions for all data structures

### Components

- ✅ Functional components with hooks
- ✅ Props interfaces defined
- ✅ JSDoc comments on exported functions
- ✅ Accessibility attributes (ARIA, roles)

### Security

- ✅ Input validation on all user data
- ✅ Rate limiting on all API routes
- ✅ PII sanitization before storage
- ✅ Content Security Policy headers
- ✅ HTTPS only in production

### Performance

- ✅ Code splitting with dynamic imports
- ✅ Lazy loading for PDF generation
- ✅ Efficient re-renders with proper dependencies
- ✅ Cleanup in useEffect hooks

## Deployment

### Vercel (Recommended)

```bash
vercel deploy --prod
```

### Other Platforms

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables in your platform

3. Start the server:
   ```bash
   npm start
   ```

## Monitoring

### Logs

- Check Vercel dashboard for runtime logs
- Monitor rate limiting warnings
- Review prompt injection detection logs

### Analytics

- Vercel Analytics enabled by default
- Tracks page views and user interactions
- Privacy-friendly (no cookies)

## Troubleshooting

### Rate Limiting Not Working

**Issue**: Rate limits not enforced across multiple server instances

**Solution**: Configure Vercel KV:
```bash
# Check if KV is configured
echo $KV_REST_API_URL
echo $KV_REST_API_TOKEN

# If empty, link your project
vercel link
vercel env pull
```

### Build Errors

**Issue**: TypeScript errors during build

**Solution**:
```bash
# Check types
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### PDF Generation Fails

**Issue**: PDF download shows error

**Solution**:
- Check browser console for errors
- Ensure popups are allowed (PDF uses browser print dialog)
- Try Markdown or HTML download as fallback

## Contributing

1. Follow the existing code style
2. Add JSDoc comments to new functions
3. Update TypeScript types
4. Test accessibility with keyboard navigation
5. Run build before committing

## License

Private project - All rights reserved
