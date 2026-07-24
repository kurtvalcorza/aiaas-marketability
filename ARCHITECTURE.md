# AIaaS Demand Viability Index (DVI) Chatbot - Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Domain Model](#domain-model)
3. [Architecture Principles](#architecture-principles)
4. [System Architecture](#system-architecture)
5. [Folder Structure](#folder-structure)
6. [Design Patterns](#design-patterns)
7. [Data Flow](#data-flow)
8. [Component Architecture](#component-architecture)
9. [Service Layer](#service-layer)
10. [State Management](#state-management)
11. [API Design](#api-design)
12. [Security Architecture](#security-architecture)
13. [Testing Strategy](#testing-strategy)
14. [Performance Considerations](#performance-considerations)
15. [Development Guidelines](#development-guidelines)

## Overview

The **AIaaS Demand Viability Index (DVI) Chatbot** (`aiaas-marketability`) is a Next.js application that runs a two-phase **marketability and demand-validation instrument** ("form + reconciling chat") for a localized AI repository and AI-as-a-Service (AIaaS) platform under the DOST-NAIRA project. A structured form collects routing, tag selections, adoption intent, and the four **0.0–5.0 component self-ratings**; a short chat then handles the one open-ended question, contradiction reconciliation, any Advanced-Demand follow-up, and the visible summary. The app routes the respondent through the RR/DD matrix with an AI-maturity overlay, gathers competitor-friction and value-proposition evidence, and computes a study-specific **Demand Viability Index (DVI)**.

**The app owns all structured data and all scoring; the language model never computes or assigns a score.** The five DVI components are the respondent's own self-ratings from the form.

This is explicitly **NOT a readiness assessment**, and the DVI is a study-specific operational index — not a formal validated scale, certification, or proof of market demand. It was built from the `ai-readiness-assessment` template, so one internal plumbing name is retained (the `AssessmentComplete` component); this document describes it by its current function.

The application follows a clean architecture pattern with clear separation of concerns between presentation, business logic, and data access layers.

### Key Technologies

- **Frontend Framework**: Next.js 16 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Google Generative AI via the AI SDK (`@ai-sdk/google`, Gemini 2.5 Flash)
- **Validation**: Zod for runtime type validation
- **Storage**: Neon serverless PostgreSQL or a Google Sheets webhook (selectable)
- **Testing**: Vitest with React Testing Library
- **Deployment**: Vercel with optional Vercel KV (rate limiting)

## Domain Model

### Routing: two vectors × two overlays

Every respondent is placed on a **primary vector** and given an **AI-maturity overlay**, yielding one of four final **routes**:

| | Basic (no in-house AI/MLOps) | AD — Advanced Demand (uses/trains/deploys AI) |
| --- | --- | --- |
| **RR** — Research / Repository | `RR-Basic` | `RR-AD` |
| **DD** — Developer / Deployment | `DD-Basic` | `DD-AD` |

AD is not a separate market; it is an overlay detected within RR or DD (the form derives it from any confirmed active AI use). Route helpers live in `lib/routes.ts` (`routeToSegmentOverlay`, `toRoute`, `normalizeRoute`, `normalizeContactConsent`).

### The Demand Viability Index (DVI)

Each of the five components is the respondent's own **0.0–5.0 self-rating**, collected directly by the form — the model never computes, assigns, or narrates a score. The DVI is **computed deterministically in code** (`lib/dvi.ts`) from those self-ratings so the stored value is auditable rather than dependent on the model's arithmetic:

| Component | Symbol | Base weight | AD-adjusted weight |
| --- | --- | --- | --- |
| Cost Barrier | C | 0.25 | 0.35 |
| Technical Complexity | T | 0.20 | 0.10 |
| Localization Gap | L | 0.25 | 0.25 |
| UVP Resonance | U | 0.15 | 0.15 |
| Governance Resonance | G | 0.15 | 0.15 |

For AD respondents (who already use/deploy AI), Technical Complexity is de-emphasized and its weight reallocated mainly to Cost Barrier; Governance Resonance (G) is weighted equally across overlays so the collected ratings — not the weights — reveal whether AD teams value governance more. Each weight set sums to 1.0. This five-component model is methodology **v2** (`dvi_model_version`); records collected under the four-component **v1** model keep their original DVI and are never recomputed. See `specs/001-governance-dimension/` and `docs/specs/governance-dimension.md`. Scores are clamped to `[0.0, 5.0]` before weighting; a non-finite score collapses to the minimum so it cannot inflate demand. The scale floor is **0** ("not a barrier" / "not useful"), which makes the "Weak" band reachable.

The resulting DVI (`0.00`–`5.00`) maps to one of four interpretation bands (`interpretDVI`):

| Band | DVI range |
| --- | --- |
| Strong demand signal | ≥ 3.5 |
| Moderate demand signal | 2.5 – 3.49 |
| Limited demand signal | 1.5 – 2.49 |
| Weak demand signal | < 1.5 |

### Respondent-facing vs. internal fields (FR-064)

The model's final message contains a **visible respondent summary** (heading `## Your AIaaS Demand Summary`), then a `###FIELDS###` block (a single line, `Main Problem: ...`), then a `###INTERVIEW_COMPLETE###` marker. `lib/report-parser.ts` shows the respondent only the visible summary and strips the FIELDS block, the marker, and any `[[RERATE:x]]` directives. The five component scores and the DVI are computed and displayed by the app — never emitted or narrated by the model — and contact details never appear in the chat UI.

## Architecture Principles

The application is built on the following core principles:

### 1. Separation of Concerns

UI, business logic, and data access are clearly separated into distinct layers:

- **Presentation Layer**: React components focused solely on rendering
- **Business Logic Layer**: Custom hooks and service functions
- **API Layer**: Thin controllers that delegate to services
- **Utilities Layer**: Shared utilities, constants, and validation

### 2. Single Responsibility

Each module has one clear purpose:

- Components handle rendering and user interaction
- Hooks manage state and side effects
- Services contain business logic
- API routes handle HTTP concerns

### 3. Plain Functions over Classes

Services are implemented as plain exported functions rather than classes:

- Simpler to use (no instantiation ceremony)
- Equally testable
- Less boilerplate
- More idiomatic for React/Next.js

### 4. Testability First

All business logic is designed to be easily testable in isolation:

- Pure functions where possible
- Dependency injection through parameters
- Framework-agnostic services
- Comprehensive test coverage (>80%)

### 5. Type Safety

Runtime validation with compile-time type inference:

- Zod schemas for runtime validation
- TypeScript for compile-time safety
- Single source of truth for types
- Clear, actionable error messages

### 6. Progressive Enhancement

The refactoring was done incrementally without breaking changes:

- New code added alongside existing code
- Gradual migration to new patterns
- Backward compatibility maintained
- Zero regression in functionality

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Application                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ Components │  │   Hooks    │  │  Services  │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes                               │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ /api/chat  │  │/api/submit │  │   Proxy   │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │  Google AI API   │ │ Neon PostgreSQL  │ │ Google Sheets    │
  │  (Gemini 2.5)    │ │ (primary store)  │ │ (alt. webhook)   │
  └──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      app/page.tsx                            │
│                   (Main Chat Component)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Custom Hooks:                                        │  │
│  │  • useInterviewFlow (form→chat phase machine +       │  │
│  │      completion; wraps @ai-sdk/react useChat)        │  │
│  │  • useChatScroll (auto-scroll)                       │  │
│  │  • useConsent (consent banner)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Child Components:                                    │  │
│  │  • ChatHeader                                         │  │
│  │  • ChatMessageList                                    │  │
│  │    ├─ ChatMessage                                     │  │
│  │    ├─ LoadingIndicator                               │  │
│  │    ├─ ErrorAlert                                     │  │
│  │    └─ AssessmentComplete                             │  │
│  │  • ChatInput                                          │  │
│  │  • ConsentBanner                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
aiaas-marketability/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── chat/                 # Interview streaming endpoint
│   │   │   └── route.ts
│   │   ├── submit/               # Scored-record submission endpoint
│   │   │   └── route.ts
│   │   └── csp-report/           # CSP violation reporting
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main chat interface (interview UI)
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── AssessmentComplete.tsx    # Completion screen: DVI card + report preview
│   ├── ChatHeader.tsx            # Header component
│   ├── ChatInput.tsx             # Input with validation
│   ├── ChatMessage.tsx           # Individual message display
│   ├── ChatMessageList.tsx       # Message list container
│   ├── ChatErrorBoundary.tsx     # Chat-scoped error boundary
│   ├── ConsentBanner.tsx         # Privacy consent banner
│   ├── ErrorAlert.tsx            # Error notifications
│   ├── ErrorBoundary.tsx         # Error boundary component
│   ├── InterviewForm.tsx         # Phase 1: structured form (routing, tags, five 0–5 ratings)
│   └── LoadingIndicator.tsx      # Loading animation
│
├── hooks/                        # Custom React hooks
│   ├── useInterviewFlow.ts       # form→chat phase machine, rerate, completion & submission
│   ├── useChatScroll.ts          # Auto-scroll behavior
│   └── useConsent.ts             # Consent banner management
│
├── services/                     # Business logic services
│   ├── chatService.ts            # Message validation & AI-message prep
│   ├── submissionRecord.ts       # buildSubmissionRecord: shared record builder
│   ├── submissionService.ts      # Google Sheets webhook submission
│   └── neonSubmissionService.ts  # Neon PostgreSQL submission
│
├── lib/                          # Utilities and shared code
│   ├── api-utils.ts              # Response formatting utilities
│   ├── constants.ts              # Markers, size caps, and re-exports
│   ├── constants/                # Organized constants
│   │   ├── parsing.ts            # Report-parsing regex patterns
│   │   ├── security.ts           # Rate limits & injection patterns
│   │   └── validation.ts         # PII patterns & field-length rules
│   ├── consent.ts                # Consent management utilities
│   ├── dvi.ts                    # DVI weights, bands & computation
│   ├── env.ts                    # Environment validation
│   ├── rate-limit.ts             # Rate limiting (Vercel KV + in-memory)
│   ├── questions.ts              # Form question bank, form→InterviewCore mapping, DVI computation
│   ├── report-parser.ts          # Chat-phase parsing (summary, main problem, rerate)
│   ├── routes.ts                 # Route/overlay/contact-consent normalizers
│   ├── safe-logger.ts            # PII-safe error/result logging
│   ├── schemas.ts                # Zod schemas for validation
│   ├── storage-provider.ts       # Storage-backend resolution
│   ├── systemPrompt.ts           # Chat-phase interviewer system prompt (reconcile + summary)
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils.ts                  # Utility functions
│   ├── validation.ts             # Security & interview-data validation
│   └── webhook-signing.ts        # HMAC signing for webhooks
│
├── tests/                        # Test suite (Vitest)
├── schema.sql                    # Neon table + demand aggregate views
├── proxy.ts                      # Security headers & CSP
├── ARCHITECTURE.md               # This file
├── README.md                     # Project documentation
├── DEPLOYMENT.md                 # Deployment guide
├── DEVELOPMENT.md                # Developer setup guide
└── SECURITY.md                   # Security guidelines
```

## Design Patterns

### 1. Controller-Service Pattern

API routes act as thin controllers that delegate to service functions:

```typescript
// API Route (Controller)
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate input
  const validation = validateMessage(body.message);
  if (!validation.valid) {
    return createErrorResponse(validation.error, 400);
  }
  
  // Delegate to service
  const result = await chatService.processMessage(body);
  
  // Return response
  return createJsonResponse(result);
}
```

**Benefits**:
- Business logic is testable without HTTP layer
- Services can be reused across multiple routes
- Clear separation of concerns

### 2. Custom Hooks Pattern

Complex state management and side effects are encapsulated in custom hooks:

```typescript
// Hook encapsulates the two-phase interview flow
const flow = useInterviewFlow();

// Component uses hook without knowing implementation details:
// the form phase calls flow.startChat(form); the chat phase renders
// flow.messages and calls flow.handleSendMessage(text). Completion
// detection and submission are handled inside the hook.
```

**Benefits**:
- Reusable across components
- Testable in isolation
- Cleaner component code

### 3. Composition Pattern

Components are composed from smaller, focused components:

```typescript
<ChatMessageList
  messages={messages}
  isLoading={isLoading}
  error={error}
  isComplete={isComplete}
  report={report}
  core={core}
  messagesEndRef={messagesEndRef}
/>
```

**Benefits**:
- Each component has single responsibility
- Easy to test individual components
- Flexible and maintainable

### 4. Dependency Injection

Dependencies are passed as parameters rather than imported directly:

```typescript
export async function submitToGoogleSheets(
  data: InterviewData,
  config: SubmissionConfig  // Injected dependency (webhookUrl, signingSecret)
): Promise<SubmissionResult> {
  // Use config instead of importing environment variables
}
```

**Benefits**:
- Easy to test with mock dependencies
- Flexible configuration
- No hidden dependencies

## Data Flow

### Interview Flow

```
1. Form phase (InterviewForm)
   │
   ├─> Respondent answers routing, tag pickers, and the five 0–5 self-ratings
   │
   ├─> useInterviewFlow.startChat(form)
   │   ├─> formToInterviewCore(form): derives segment + AD overlay, computes the
   │   │     DVI deterministically (lib/dvi.ts), merges sub-friction tags
   │   └─> Seeds messages: a hidden `system` form-context message
   │         (buildFormContext) + a hardcoded first assistant question (Q6)
   │   └─> phase = 'chat'
   │
2. Chat phase — message submission
   │
   ├─> ChatInput → useInterviewFlow.handleSendMessage()
   │   ├─> Sets timeout (30s)
   │   └─> Calls useChat.sendMessage()
   │
3. API Request
   │
   ├─> POST /api/chat
   │   ├─> Rate limiting check
   │   ├─> chatService.validateConversation()  (≤1 system message, must be first)
   │   ├─> chatService.prepareMessagesForAI()  (validates user + system;
   │   │     prompt-injection check on both)
   │   └─> streamText() → Gemini 2.5 Flash with systemPrompt
   │
4. Response Streaming
   │
   ├─> useChat receives text-stream chunks
   │   └─> Updates messages state
   │
   ├─> (optional) model emits a bare `[[RERATE:x]]` directive; the app renders a
   │     rating control, the respondent re-enters the value, and
   │     useInterviewFlow.rerate() recomputes the DVI (the app owns the number)
   │
5. Completion Detection (inside useInterviewFlow effect)
   │
   ├─> isInterviewComplete() (###INTERVIEW_COMPLETE### / summary heading + FIELDS)
   ├─> getRespondentSummary() for display (strips FIELDS block, marker, RERATE) (FR-064)
   ├─> extractMainProblem() from the ###FIELDS### block
   └─> submitInterview() (skipped, with a friendly message, if consent declined)
   │
6. Backend Submission
   │
   ├─> POST /api/submit
   │   ├─> validateInterviewData() (Zod)
   │   ├─> resolveStorageProvider() (STORAGE_PROVIDER env var, or auto-detect)
   │   ├─> Neon: submitToNeon()
   │   │   └─> buildSubmissionRecord() → INSERT INTO aiaas_market_analysis
   │   └─> Google Sheets: submitToGoogleSheets()
   │       ├─> formatForGoogleSheets() (shared buildSubmissionRecord())
   │       ├─> signPayload() (HMAC)
   │       └─> Sends to Google Sheets webhook
   │
7. Completion UI
   │
   └─> AssessmentComplete component
       ├─> App-computed DVI summary card (route, band, DVI badge)
       └─> View Report (HTML preview in new tab, print/save-as-PDF)
```

### State Management Flow

```
┌─────────────────────────────────────────────────┐
│           Component State (useState)             │
│  • mounted                                       │
│  • messagesEndRef                                │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│ useInterviewFlow  │  │   useConsent     │
│  • phase          │  │  • showBanner    │
│  • isComplete     │  │  • hasAccepted   │
│  • report         │  └──────────────────┘
│  • core (DVI)     │
│  • submissionError│
│  • isSubmitting   │
└──────────────────┘
        │
        ▼ (wraps)
┌──────────────────┐
│     useChat      │
│  • messages      │
│  • status        │
│  • error         │
│  • sendMessage   │
└──────────────────┘
```

## Component Architecture

### Main Chat Component (app/page.tsx)

**Responsibilities**:
- Compose child components
- Integrate custom hooks
- Handle mount state
- Coordinate data flow

**Key Features**:
- Under 200 lines
- No business logic
- Clear hook integration
- Error boundaries

### ChatMessageList Component

**Responsibilities**:
- Render message list
- Show loading states
- Display errors
- Show completion UI

**Props**:
```typescript
interface ChatMessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  error?: Error;
  isComplete: boolean;
  report: string;                 // respondent-facing summary only (no scores)
  core: InterviewCore | null;     // route, DVI, interpretation for the results card
  messagesEndRef: RefObject<HTMLDivElement>;
  onStartNew: () => void;
  onClearError: () => void;
}
```

### ChatInput Component

**Responsibilities**:
- Handle user input
- Validate message length
- Auto-resize textarea
- Keyboard shortcuts

**Features**:
- Character counter
- Spam detection
- Enter to send
- Escape to clear

## Service Layer

### Chat Service (services/chatService.ts)

**Purpose**: Handle message validation and preparation for AI

**Functions**:
```typescript
validateMessage(content: string): ValidationResult
validateConversation(messages: any[]): ValidationResult
detectPromptInjectionAttempt(content: string): ValidationResult
prepareMessagesForAI(messages: IncomingMessage[]): CoreMessage[]
```

**Design**:
- Plain exported functions
- Pure functions (no side effects)
- Framework-agnostic
- Fully testable

### Submission Services (services/)

**Purpose**: Format a scored interview and submit it to the configured storage backend

**Shared record builder** (`services/submissionRecord.ts`) — single source of truth for the
`InterviewData → InterviewRecord` mapping used by every backend, so they cannot drift. It strips
NUL characters (PostgreSQL TEXT columns reject them), re-applies PII redaction and the
conversation-history size cap server-side (client sanitization can be bypassed), and enforces
contact-consent gating: `contactName`/`contactEmail` are stored **only** when `contactConsent === true`
(and blank otherwise):
```typescript
buildSubmissionRecord(data: InterviewData): InterviewRecord
```

**Google Sheets** (`services/submissionService.ts`):
```typescript
formatForGoogleSheets(data: InterviewData): InterviewRecord
signPayload(data: InterviewRecord, signingSecret?: string): string
submitToGoogleSheets(data: InterviewData, config: SubmissionConfig): Promise<SubmissionResult>
```

**Neon PostgreSQL** (`services/neonSubmissionService.ts`):
```typescript
submitToNeon(data: InterviewData): Promise<SubmissionResult>  // INSERT INTO aiaas_market_analysis
```

The active backend is chosen per request by `resolveStorageProvider()` (`lib/storage-provider.ts`):
an explicit `STORAGE_PROVIDER` (`neon` | `google_sheets`) wins; otherwise Neon is used when
`DATABASE_URL` is set, then Google Sheets when `GOOGLE_SHEETS_WEBHOOK_URL` is set, else it routes to
the Sheets service which reports "webhook not configured" without failing (local dev without storage).

**Design**:
- Configuration via parameters / environment
- Both services return the same structured `SubmissionResult`
- Handle errors gracefully (Neon inserts carry a 10s abort timeout below the route's 30s `maxDuration`)
- Shared `buildSubmissionRecord` mapping prevents backend drift
- Errors are logged through `safeLogError` (PII-safe)

## State Management

### Custom Hooks

#### useInterviewFlow

**Purpose**: Orchestrate the two-phase instrument — the structured form, then the short chat
(open-ended problem, contradiction reconciliation, AD follow-up, summary). The app owns all
structured data and computes the DVI; the model is used only for the conversation and summary prose.
It wraps the AI SDK `useChat`.

**State** (`FlowState`):
```typescript
type Phase = 'form' | 'chat';

interface FlowState {
  phase: Phase;
  isComplete: boolean;
  report: string;                 // respondent-facing summary only (no scores)
  core: InterviewCore | null;     // route, DVI, interpretation for the results card
  submissionError: string;
  isSubmitting: boolean;
}
```

**Actions returned by the hook**:
```typescript
startChat(form: FormState): void            // form→chat: computes core+DVI, seeds context + Q6
rerate(component: RerateComponent, value: number): void  // app re-collects the value, recomputes DVI
handleSendMessage(text: string): Promise<void>
clearError(): void
```

**Features**:
- Phase machine: on `startChat`, `formToInterviewCore` computes the DVI, and the hook seeds a hidden
  `system` form-context message plus a hardcoded first assistant question (Q6)
- Contradiction reconciliation: when the model emits a bare `[[RERATE:x]]` directive, the app
  re-collects the value and `rerate()` recomputes the DVI — the model never writes a number
- Completion is detected via the `###INTERVIEW_COMPLETE###` marker (or the summary heading + FIELDS block)
- Duplicate submission prevention (`hasSubmittedRef`)
- Request timeout management (30s)
- Automatic cleanup on unmount
- Skips submission (with a friendly message) when the user declined consent
- Shows only the respondent-facing summary; the component scores and DVI are app-computed and never
  emitted by the model (FR-064)

#### useChatScroll

**Purpose**: Handle smooth scrolling with debouncing

**Features**:
- Debounced scroll during streaming
- Immediate scroll on completion
- Configurable behavior
- Automatic cleanup

#### useConsent

**Purpose**: Manage consent banner state

**Features**:
- localStorage persistence
- Accept/decline actions
- Banner visibility control
- Session persistence

## API Design

### API Utilities (lib/api-utils.ts)

**Purpose**: Consistent response formatting and error handling

**Functions**:
```typescript
getSecurityHeaders(): Record<string, string>
createJsonResponse<T>(data: T, options?: ResponseOptions): Response
createErrorResponse(error: Error | string, status: number, options?: ErrorOptions): Response
```

**Features**:
- Security headers on all responses
- Error message sanitization
- Type-safe responses
- Consistent structure

### Chat API (/api/chat/route.ts)

**Endpoint**: `POST /api/chat`

**Request**:
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

**Response**: Streaming text (Server-Sent Events)

**Features**:
- Rate limiting (30 req/min)
- Prompt injection detection
- Message validation
- Streaming responses

### Submit API (/api/submit/route.ts)

**Endpoint**: `POST /api/submit`

**Request** (`InterviewData`, validated by `interviewDataSchema` in `lib/schemas.ts`):
```typescript
{
  segment: 'RR' | 'DD';
  overlay: 'basic' | 'AD';
  route: 'RR-Basic' | 'RR-AD' | 'DD-Basic' | 'DD-AD';
  organizationType: string;
  currentWorkType: string;
  aiMaturity: string;          // current AI maturity answer
  aiWork: string;              // Advanced Demand only; '' otherwise
  mainProblem: string;         // open-ended, from the chat phase
  needTags: string[];
  competitors: string;
  frictionTags: string[];      // friction with alternatives + component sub-friction
  useCaseTags: string[];
  scores: {                    // each a 0.0–5.0 self-rating; hidden from the respondent
    costBarrier: number;         // C
    technicalComplexity: number; // T
    localizationGap: number;     // L
    uvpResonance: number;        // U
  };
  dvi: number;                 // 0.00–5.00, computed deterministically by the app
  interpretation: string;      // Weak / Limited / Moderate / Strong demand signal
  likelihoodToTry: string;
  firstUsePathway: string;
  timeframe: string;
  adoptionBlockers: string;
  contactConsent: boolean;
  contactName: string;         // stored only with contact consent
  contactEmail: string;        // stored only with contact consent
  summary: string;
  timestamp: string;           // ISO 8601
  conversationHistory?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

**Features**:
- Rate limiting (5 req/5min)
- Schema + field-length validation with Zod (`validateInterviewData`)
- Server-side PII redaction and contact-consent gating (in `buildSubmissionRecord`)
- Provider resolution (`resolveStorageProvider`) → Neon `aiaas_market_analysis` or Google Sheets
- HMAC webhook signing (Google Sheets path)

## Security Architecture

### Defense in Depth

Multiple layers of security protection:

1. **Input Validation**
   - Length limits (2,000 chars)
   - Content quality checks
   - Spam detection

2. **Rate Limiting**
   - Chat: 30 requests/minute
   - Submit: 5 requests/5 minutes
   - Vercel KV in production
   - In-memory fallback

3. **Prompt Injection Detection**
   - Pattern matching
   - Configurable blocking
   - Logging of attempts

4. **PII Redaction**
   - Email addresses
   - Phone numbers
   - SSN (if applicable)
   - Applied before storage

5. **Content Security Policy**
   - Strict CSP headers
   - Violation reporting
   - XSS prevention

6. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Applied to all responses

### Data Flow Security

```
User Input
    │
    ├─> Length validation
    ├─> Spam detection
    ├─> Prompt injection check
    │
API Request
    │
    ├─> Rate limiting
    ├─> Schema validation
    │
Processing
    │
    ├─> PII redaction
    ├─> Content sanitization
    │
Storage
    └─> Sanitized data only
```

## Testing Strategy

### Test Coverage

- **Target**: >80% coverage
- **Focus**: Business logic and critical paths — DVI computation/bands, form→core mapping, chat-phase
  parsing (summary / main problem / rerate), route + contact-consent normalization, storage-provider
  resolution, record building (PII redaction + contact-consent gating), rate limiting, and env validation

### Test Types

#### 1. Unit Tests

**Services**:
```typescript
describe('chatService', () => {
  it('should validate message length', () => {});
  it('should detect spam content', () => {});
  it('should detect prompt injection', () => {});
});
```

**Hooks**:
```typescript
describe('useInterviewFlow', () => {
  it('should start in the form phase', () => {});
  it('should compute the DVI on startChat and seed the chat context', () => {});
  it('should recompute the DVI on rerate', () => {});
  it('should detect completion and prevent duplicate submission', () => {});
});
```

#### 2. Component Tests

```typescript
describe('ChatMessage', () => {
  it('should render user message', () => {});
  it('should render assistant message', () => {});
  it('should render markdown', () => {});
});
```

#### 3. Integration Tests

```typescript
describe('Interview Flow', () => {
  it('should complete a full interview and compute the DVI', async () => {});
  it('should handle errors gracefully', async () => {});
  it('should respect the consent choice', async () => {});
});
```

### Testing Tools

- **Test Runner**: Vitest
- **Component Testing**: React Testing Library
- **Assertions**: Vitest expect
- **Mocking**: Vitest vi
- **Coverage**: Vitest coverage

## Performance Considerations

### Bundle Size

- **Base**: ~150KB gzipped
- **Zod**: +14KB gzipped
- **Total**: ~165KB gzipped
- **Target**: <200KB gzipped

### Code Splitting

- Services and hooks are tree-shakeable
- Dynamic imports for heavy components
- Route-based code splitting (Next.js)

### Runtime Performance

- Hook extractions: No overhead
- Service layer: Minimal overhead
- Zod validation: Server-side only

### Optimization Strategies

1. **Component Optimization**
   - Memoization where needed
   - Lazy loading for heavy components
   - Efficient re-render prevention

2. **Network Optimization**
   - Streaming responses
   - Compression enabled
   - CDN for static assets

3. **Caching Strategy**
   - Static assets cached
   - API responses not cached (dynamic)
   - Rate limit data in Vercel KV

## Development Guidelines

### Adding New Features

#### 1. New API Endpoint

```typescript
// 1. Create route handler
export async function POST(request: Request) {
  // 2. Use createJsonResponse/createErrorResponse
  // 3. Delegate to service function
  // 4. Add tests
}
```

#### 2. New Business Logic

```typescript
// 1. Add to appropriate service file
export function newFeature(input: Input): Output {
  // 2. Keep framework-agnostic
  // 3. Return structured results
  // 4. Add comprehensive tests
}
```

#### 3. New Component

```typescript
// 1. Create in components/
export function NewComponent(props: Props) {
  // 2. Focus on rendering
  // 3. Delegate logic to hooks
  // 4. Add tests in tests/components/
}
```

#### 4. New Hook

```typescript
// 1. Create in hooks/
export function useNewFeature() {
  // 2. Manage state and side effects
  // 3. Return clear interface
  // 4. Add tests in tests/hooks/
}
```

### Code Organization Principles

1. **Components**: Focus on rendering, delegate logic to hooks
2. **Hooks**: Manage state and side effects, return clear interfaces
3. **Services**: Pure functions for business logic, no framework dependencies
4. **API Routes**: Thin controllers that validate input and call services

### Best Practices

1. **Type Safety**
   - Use TypeScript strict mode
   - Define interfaces for all data structures
   - Use Zod for runtime validation

2. **Error Handling**
   - Use try-catch blocks
   - Return structured error results
   - Log errors appropriately
   - Sanitize error messages for clients

3. **Testing**
   - Write tests before refactoring
   - Test business logic thoroughly
   - Use React Testing Library best practices
   - Maintain >80% coverage

4. **Documentation**
   - Add JSDoc comments for public functions
   - Update README when adding features
   - Document complex logic inline
   - Keep ARCHITECTURE.md current

5. **Performance**
   - Profile before optimizing
   - Use React DevTools
   - Monitor bundle size
   - Optimize critical paths only

### Common Patterns

#### Error Handling Pattern

```typescript
try {
  const result = await operation();
  return createJsonResponse({ success: true, data: result });
} catch (error) {
  console.error('Operation failed:', error);
  return createErrorResponse(error, 500);
}
```

#### Validation Pattern

```typescript
const validation = validateInput(input);
if (!validation.valid) {
  return createErrorResponse(validation.error, 400);
}
```

#### Service Call Pattern

```typescript
const result = await service.operation(data, config);
if (!result.success) {
  return createErrorResponse(result.error, 500);
}
return createJsonResponse(result);
```

## Conclusion

This architecture provides a solid foundation for maintaining and extending the AIaaS Demand Viability Index (DVI) Chatbot. The clear separation of concerns, app-owned deterministic DVI computation (the model never scores), the strict respondent-facing-vs-internal-field boundary (FR-064), pluggable storage backends, and focus on type safety make the codebase maintainable and reliable.

For questions or suggestions about the architecture, please open an issue or submit a pull request.

---

**Last Updated**: July 2026  
**Maintainer**: Kurt Valcorza
