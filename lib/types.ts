/**
 * Shared TypeScript type definitions for the AIaaS Demand Viability Index (DVI) Chatbot.
 *
 * This is a hybrid form + chat instrument. A structured form collects routing,
 * tag selections, and the four 0.0–5.0 component self-ratings; a short chat phase
 * handles the open-ended problem statement, contradiction reconciliation, any
 * Advanced-Demand follow-ups, and contact consent. The DVI is computed
 * deterministically in app code from the self-ratings — the model never scores.
 */

import type { Quadrant } from './matrix';

/** Represents a message part in the chat conversation */
export interface MessagePart {
  type: 'text';
  text: string;
}

/** Represents a single message in the chat UI */
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
}

/** Core message format for AI SDK */
export interface CoreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Primary analytical vector. RR = Research/Repository, DD = Developer/Deployment. */
export type Segment = 'RR' | 'DD';

/**
 * AI-maturity overlay within a vector.
 * - basic: no internal AI experts / no AI or MLOps subteam
 * - AD (Advanced Demand): confirmed active AI use/training/deployment/integration
 *   or an internal AI / data-science / analytics unit
 */
export type Overlay = 'basic' | 'AD';

/** The final route = segment + overlay. */
export type Route = 'RR-Basic' | 'RR-AD' | 'DD-Basic' | 'DD-AD';

/**
 * The four DVI component scores, each a 0.0–5.0 self-rating collected directly
 * from the form. The rating IS the component score (no model interpretation).
 */
export interface DVIScores {
  /** C — cost as a barrier (APIs, cloud, compute, subscriptions, egress) */
  costBarrier: number;
  /** T — technical complexity as a barrier (AI/MLOps/deployment/integration) */
  technicalComplexity: number;
  /** L — lack of localized / Philippine-relevant datasets and models */
  localizationGap: number;
  /** U — usefulness of / resonance with the AIaaS platform's value proposition */
  uvpResonance: number;
  /** G — resonance with local / sovereign AI governance (data residency, ownership, public-sector fit) */
  governanceResonance: number;
}

/**
 * A scored interview, ready for submission to storage. Most fields are collected
 * directly by the form; `mainProblem` and `summary` come from the chat phase.
 */
export interface InterviewData {
  segment: Segment;
  overlay: Overlay;
  route: Route;
  /** Organization / team category (Q1) */
  organizationType: string;
  /** Current work type (Q2) */
  currentWorkType: string;
  /** Current AI maturity (Q3) */
  aiMaturity: string;
  /** Current AI-related work — Advanced Demand only (Q23); '' otherwise */
  aiWork: string;
  /** Main problem the respondent is trying to solve (Q6, open-ended, from chat) */
  mainProblem: string;
  /** What the team needs most (Q5) */
  needTags: string[];
  /** Competitors / alternatives tried or considered (Q8) */
  competitors: string;
  /** Friction with alternatives + component sub-friction (Q9/Q11/Q14/Q17/Q24) */
  frictionTags: string[];
  /** AIaaS features the respondent finds valuable (Q20) */
  useCaseTags: string[];
  scores: DVIScores;
  /** Weighted DVI, 0.00–5.00 (computed from scores + overlay) */
  dvi: number;
  /** Interpretation band derived from dvi */
  interpretation: string;
  /** Asset & Contribution self-ratings (supply axis) — see lib/matrix.ts */
  asset: { possession: number; willingness: number };
  /** AC score = min(possession, willingness), 0.00–5.00 */
  acScore: number;
  /** Demand × asset quadrant from (dvi, acScore) */
  quadrant: Quadrant;
  /** Likelihood to try the AIaaS platform (Q21) */
  likelihoodToTry: string;
  /** Most realistic first-use pathway (Q26) */
  firstUsePathway: string;
  /** Expected timeframe to try (Q27) */
  timeframe: string;
  /** What would prevent adoption (Q28) */
  adoptionBlockers: string;
  /** Whether the respondent agreed to be contacted (Q29) */
  contactConsent: boolean;
  /** Contact name — only captured/stored with contact consent (Q30) */
  contactName: string;
  /** Work email — only captured/stored with contact consent (Q30) */
  contactEmail: string;
  /** Short AI-generated, PII-sanitized market-evidence summary */
  summary: string;
  timestamp: string;
  conversationHistory?: string;
}

/**
 * Flat record persisted by every storage backend (Neon PostgreSQL, Google
 * Sheets). Single source of truth for the stored column shape. Mirrors the
 * aiaas_market_analysis table.
 */
export interface InterviewRecord {
  timestamp: string;
  segment: string;
  overlay: string;
  route: string;
  organizationType: string;
  currentWorkType: string;
  aiMaturity: string;
  aiWork: string;
  mainProblem: string;
  needTags: string;
  competitors: string;
  frictionTags: string;
  useCaseTags: string;
  costBarrier: number;
  technicalComplexity: number;
  localizationGap: number;
  uvpResonance: number;
  governanceResonance: number;
  dvi: number;
  dviModelVersion: string;
  interpretation: string;
  assetPossession: number;
  assetWillingness: number;
  acScore: number;
  matrixQuadrant: string;
  likelihoodToTry: string;
  firstUsePathway: string;
  timeframe: string;
  adoptionBlockers: string;
  contactConsent: boolean;
  contactName: string;
  contactEmail: string;
  summary: string;
  conversationHistory: string;
}

/** Rate limiting record */
export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/** Rate limit check result */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/** API error response */
export interface APIError {
  error: string;
  code?: string;
}

/** API success response */
export interface APISuccess {
  success: boolean;
  message: string;
}

/** Incoming message from client (can have either parts or content) */
export interface IncomingMessage {
  role: 'user' | 'assistant' | 'system';
  parts?: MessagePart[];
  content?: string;
}
