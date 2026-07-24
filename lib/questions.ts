/**
 * Declarative question bank for the AIaaS DVI form phase.
 *
 * The form collects routing, the four 0–5 component self-ratings, tag
 * selections, adoption intent, and contact consent. The open-ended problem
 * statement (Q6) and the summary are produced later in the chat phase.
 */

import { computeDVI, interpretDVI } from './dvi';
import { computeAcScore, classifyQuadrant } from './matrix';
import { toRoute } from './routes';
import { DVIScores, InterviewData, Overlay, Segment } from './types';

/** 0–5 barrier scale labels (Cost / Technical / Localization). */
export const BARRIER_SCALE = [
  'Not a barrier',
  'Very minor',
  'Minor',
  'Moderate',
  'Major',
  'Critical',
] as const;

/** 0–5 usefulness scale labels (UVP resonance). */
export const USEFULNESS_SCALE = [
  'Not useful',
  'Slightly',
  'Somewhat',
  'Moderately',
  'Very useful',
  'Extremely useful',
] as const;

/** 0–5 extent scale (asset possession). */
export const EXTENT_SCALE = ['None', 'Very little', 'A little', 'Some', 'A lot', 'Extensive'] as const;

/** 0–5 willingness scale (contribution). */
export const WILLINGNESS_SCALE = [
  'Not willing',
  'Slightly',
  'Somewhat',
  'Moderately',
  'Very willing',
  'Fully willing',
] as const;

export const ORG_TYPES = [
  'Government agency, university, or public research group',
  'Software development team, startup, or technical product team',
  'Private company or enterprise team',
  'Individual researcher, developer, or student',
  'Other',
] as const;

export const WORK_TYPES = [
  'Mainly research data, reports, datasets, or public-sector information',
  'Mainly building software applications, systems, or digital services',
  'Both research/data work and software development',
  'Not sure',
] as const;

export const AI_MATURITY = [
  'Yes, regularly',
  'Yes, but only occasionally or experimentally',
  'No, but we are interested',
  'No, and we currently have no AI capacity',
  'Not sure',
] as const;

export const NEED_OPTIONS = [
  'Localized datasets',
  'Pre-cleaned or documented datasets',
  'Pre-trained AI models',
  'Ready-to-use APIs',
  'Hosted inference services',
  'Model deployment support',
  'Fine-tuning or model training tools',
  'Model benchmarking or comparison',
  'Data cleaning or formatting support',
  'Secure or local AI infrastructure',
] as const;

export const COMPETITOR_OPTIONS = [
  'Kaggle',
  'HuggingFace',
  'Roboflow',
  'AWS',
  'Azure',
  'IBM',
  'Google Cloud / Vertex AI',
  'Open-source / GitHub repositories',
  'Internal tools',
  'None',
] as const;

export const FRICTION_OPTIONS = [
  'Too expensive',
  'Difficult to configure',
  'Requires AI or MLOps expertise',
  'Requires too much data cleaning',
  'Not enough Philippine or localized datasets',
  'Not enough local-language or local-domain models',
  'Data residency or sovereignty concerns',
  'Vendor lock-in',
  'Cloud egress or usage charges',
  'Unclear documentation',
  'Not suitable for public-sector or local use cases',
  'We have not tried any alternatives',
] as const;

export const COST_TAG_OPTIONS = [
  'Subscription fees',
  'API charges',
  'Cloud compute cost',
  'Inference cost',
  'Training / fine-tuning cost',
  'Data storage cost',
  'Cloud egress fees',
  'Enterprise licensing cost',
  'Unpredictable billing',
  'Budget / procurement constraints',
] as const;

export const TECH_TAG_OPTIONS = [
  'Lack of AI engineers',
  'Lack of MLOps expertise',
  'Difficulty deploying models',
  'Difficulty integrating APIs',
  'Difficulty cleaning or preparing data',
  'Difficulty choosing appropriate models',
  'Difficulty evaluating model performance',
  'Difficulty managing cloud services',
  'Difficulty maintaining models in production',
] as const;

export const LOCAL_TAG_OPTIONS = [
  'Lack of Philippine datasets',
  'Lack of regional / LGU-level datasets',
  'Lack of local-language models',
  'Lack of local-domain models',
  'Lack of public-sector-specific models',
  'Lack of Philippine benchmarks',
  'Foreign platforms do not fit our use case',
] as const;

/** Governance sub-factor tags (G). Evidence only — never feed the numeric score. */
export const GOV_TAG_OPTIONS = [
  'Data residency / on-shore hosting',
  'Data ownership & IP retention',
  'Public-sector / DOST alignment',
  'Avoiding vendor lock-in',
  'Auditability & transparency',
  'Local accountability / support',
] as const;

/** Asset-type tags (supply axis). Evidence only — never feed the AC score. */
export const ASSET_TAG_OPTIONS = [
  'Localized datasets we built',
  'Trained or fine-tuned models',
  'Annotated or benchmark data',
  'Technical documentation',
  'Code, pipelines, or tools',
  'Nothing shareable yet',
] as const;

export const FEATURE_OPTIONS = [
  'Localized datasets',
  'Pre-cleaned and documented datasets',
  'Local / Philippine-relevant AI models',
  'Ready-to-use APIs',
  'Hosted model inference',
  'Fine-tune or train your own models on subsidized compute',
  'Model / dataset discovery and reuse',
  'Model benchmarking',
  'Secure or local inference option',
  'Lower-cost alternative to commercial platforms',
  'Support for public-interest / academic / research use',
  'Developer templates or starter integrations',
] as const;

export const LIKELIHOOD_OPTIONS = [
  'Not likely',
  'Slightly likely',
  'Somewhat likely',
  'Moderately likely',
  'Very likely',
  'Extremely likely',
] as const;

export const FIRST_USE_OPTIONS = [
  'Explore datasets',
  'Explore models',
  'Use a ready-to-use API',
  'Test hosted inference',
  'Benchmark models',
  'Fine-tune or train a model',
  'Contribute a dataset or model',
  'Integrate the AIaaS platform into an application',
  'Use the AIaaS platform for research or prototyping',
  'Not sure',
  'Unlikely to use it',
] as const;

export const TIMEFRAME_OPTIONS = [
  'Immediately',
  'Within 1–3 months',
  'Within 4–6 months',
  'Within 7–12 months',
  'More than 12 months',
  'Not sure',
  'Unlikely to try it',
] as const;

export const BLOCKER_OPTIONS = [
  'No relevant datasets',
  'No relevant models',
  'Insufficient documentation',
  'Unclear licensing',
  'Security concerns',
  'Privacy concerns',
  'Lack of technical support',
  'Lack of API / integration support',
  'Lack of internal approval',
  'Preference for existing platforms',
  'Procurement or policy constraints',
  'No clear use case',
  'None / no major blockers',
] as const;

// --- Advanced Demand block ---
export const AI_WORK_OPTIONS = [
  'Use AI tools or APIs',
  'Build AI-enabled applications',
  'Train AI models',
  'Fine-tune AI models',
  'Deploy AI models',
  'Manage model inference',
  'Maintain AI systems in production',
  'Build datasets for AI',
  'Benchmark or evaluate models',
] as const;

export const AD_PAIN_OPTIONS = [
  'Compute cost',
  'API or inference cost',
  'Vendor lock-in',
  'Cloud egress fees',
  'Data residency or sovereignty concerns',
  'Lack of localized model weights',
  'Lack of localized datasets',
  'Compliance or procurement constraints',
  'Difficulty scaling usage affordably',
  'Difficulty adapting foreign models to local context',
] as const;

/**
 * Raw form state as collected by the UI.
 */
export interface FormState {
  orgType: string;
  workType: string;
  primaryContext: string; // asked only when workType is "both" / "not sure"
  aiMaturity: string;
  needTags: string[];
  competitors: string[];
  frictionTags: string[];
  costRating: number;
  costTags: string[];
  techRating: number;
  techTags: string[];
  locRating: number;
  locTags: string[];
  uvpRating: number;
  featureTags: string[];
  govRating: number;
  govTags: string[];
  assetPossession: number;
  assetWillingness: number;
  assetTags: string[];
  likelihood: string;
  firstUse: string;
  timeframe: string;
  blockers: string[];
  // Advanced Demand (only when overlay === 'AD')
  aiWork: string[];
  adPain: string[];
  // Contact
  contactAnswered: boolean;
  contactConsent: boolean;
  contactName: string;
  contactEmail: string;
}

/** A fresh, empty form state. */
export function emptyForm(): FormState {
  return {
    orgType: '', workType: '', primaryContext: '', aiMaturity: '',
    needTags: [], competitors: [], frictionTags: [],
    costRating: -1, costTags: [], techRating: -1, techTags: [],
    locRating: -1, locTags: [], uvpRating: -1, featureTags: [],
    govRating: -1, govTags: [],
    assetPossession: -1, assetWillingness: -1, assetTags: [],
    likelihood: '', firstUse: '', timeframe: '', blockers: [],
    aiWork: [], adPain: [],
    contactAnswered: false, contactConsent: false, contactName: '', contactEmail: '',
  };
}

/** Derives the segment vector from the work-type answers. */
export function deriveSegment(form: FormState): Segment {
  const w = form.workType;
  if (w === WORK_TYPES[0]) return 'RR';
  if (w === WORK_TYPES[1]) return 'DD';
  // "both" or "not sure" -> use the primary-context follow-up
  return form.primaryContext === WORK_TYPES[1] || /software|develop/i.test(form.primaryContext)
    ? 'DD'
    : 'RR';
}

/** Derives the AI-maturity overlay. AD when the team confirms any active AI use. */
export function deriveOverlay(form: FormState): Overlay {
  return form.aiMaturity === AI_MATURITY[0] || form.aiMaturity === AI_MATURITY[1] ? 'AD' : 'basic';
}

/** True when the AD block should be shown/required. */
export function isAdvancedDemand(form: FormState): boolean {
  return deriveOverlay(form) === 'AD';
}

/** The structured part of InterviewData that the form owns (chat adds the rest). */
export type InterviewCore = Omit<
  InterviewData,
  'mainProblem' | 'summary' | 'timestamp' | 'conversationHistory'
>;

/**
 * Builds the context string handed to the chat LLM so it can reconcile
 * rating-vs-tag contradictions and write the summary — without re-asking the form.
 */
export function buildFormContext(form: FormState): string {
  const segment = deriveSegment(form);
  const overlay = deriveOverlay(form);
  const list = (arr: string[]) => (arr.length ? arr.join(', ') : 'none');
  const lines = [
    'FORM ANSWERS (already collected — do NOT re-ask any of these):',
    `Route: ${toRoute(segment, overlay)} (${overlay === 'AD' ? 'Advanced Demand' : 'Basic'}).`,
    `Organization: ${form.orgType}. Work: ${form.workType}. AI maturity: ${form.aiMaturity}.`,
    `Cost rating: ${form.costRating}/5. Cost issues ticked: ${list(form.costTags)}.`,
    `Technical rating: ${form.techRating}/5. Technical barriers ticked: ${list(form.techTags)}.`,
    `Localization rating: ${form.locRating}/5. Localization gaps ticked: ${list(form.locTags)}.`,
    `UVP usefulness rating: ${form.uvpRating}/5. Valued features: ${list(form.featureTags)}.`,
    `Governance resonance rating: ${form.govRating}/5. Governance factors ticked: ${list(form.govTags)}.`,
    `Asset possession rating: ${form.assetPossession}/5. Contribution willingness rating: ${form.assetWillingness}/5. Asset types: ${list(form.assetTags)}.`,
    `Competitors tried: ${list(form.competitors)}. General friction: ${list(form.frictionTags)}.`,
    `Needs: ${list(form.needTags)}. Likelihood: ${form.likelihood}. First use: ${form.firstUse}. Timeframe: ${form.timeframe}. Blockers: ${list(form.blockers)}.`,
  ];
  if (overlay === 'AD') {
    lines.push(`AD — current AI work: ${list(form.aiWork)}. Remaining pain: ${list(form.adPain)}.`);
  }
  return lines.join('\n');
}

/**
 * Maps a completed form to the structured part of InterviewData (everything
 * except mainProblem and summary, which come from the chat phase). The DVI is
 * computed here deterministically from the four self-ratings.
 */
export function formToInterviewCore(form: FormState): InterviewCore {
  const segment = deriveSegment(form);
  const overlay = deriveOverlay(form);
  const scores: DVIScores = {
    costBarrier: form.costRating,
    technicalComplexity: form.techRating,
    localizationGap: form.locRating,
    uvpResonance: form.uvpRating,
    governanceResonance: form.govRating,
  };
  const dvi = computeDVI(scores, overlay);

  // Asset & Contribution axis (supply side) — computed independently of the DVI.
  const asset = { possession: form.assetPossession, willingness: form.assetWillingness };
  const acScore = computeAcScore(asset.possession, asset.willingness);
  const quadrant = classifyQuadrant(dvi, acScore);

  // Component sub-friction and AD pain are merged into the friction tag list.
  const friction = dedupe([
    ...form.frictionTags,
    ...form.costTags,
    ...form.techTags,
    ...form.locTags,
    ...form.govTags,
    ...form.assetTags,
    ...(overlay === 'AD' ? form.adPain : []),
  ]);

  return {
    segment,
    overlay,
    route: toRoute(segment, overlay),
    organizationType: form.orgType,
    currentWorkType: form.workType,
    aiMaturity: form.aiMaturity,
    aiWork: overlay === 'AD' ? form.aiWork.join('; ') : '',
    needTags: dedupe(form.needTags),
    competitors: form.competitors.join('; '),
    frictionTags: friction,
    useCaseTags: dedupe(form.featureTags),
    scores,
    dvi,
    interpretation: interpretDVI(dvi),
    asset,
    acScore,
    quadrant,
    likelihoodToTry: form.likelihood,
    firstUsePathway: form.firstUse,
    timeframe: form.timeframe,
    adoptionBlockers: form.blockers.join('; '),
    contactConsent: form.contactConsent,
    contactName: form.contactConsent ? form.contactName.trim() : '',
    contactEmail: form.contactConsent ? form.contactEmail.trim() : '',
  };
}

function dedupe(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const key = t.trim().toLowerCase();
    if (t.trim() && !seen.has(key)) {
      seen.add(key);
      out.push(t.trim());
    }
  }
  return out;
}
