/**
 * Demand Viability Index (DVI) computation.
 *
 * Base:  DVI    = (0.25·C) + (0.20·T) + (0.25·L) + (0.15·U) + (0.15·G)
 * AD:    DVI_AD = (0.35·C) + (0.10·T) + (0.25·L) + (0.15·U) + (0.15·G)
 *
 * For Advanced Demand (AD) respondents — who already use, train, or deploy AI —
 * Technical Complexity should not dominate, so its weight is reduced and
 * reallocated mainly to Cost Barrier. Governance Resonance (G) is weighted equally
 * across overlays so the collected ratings, not the weights, reveal whether AD
 * teams value governance more (methodology v2 / Scheme A). The overlay is derived from
 * the route; the DVI is always recomputed here so the stored value is
 * deterministic and auditable rather than dependent on the model's arithmetic.
 */

import { DVIScores, Overlay } from './types';

/**
 * Component weights per overlay. Each set must sum to 1.0.
 */
export const DVI_WEIGHTS: Record<Overlay, DVIScores> = {
  basic: {
    costBarrier: 0.25,
    technicalComplexity: 0.2,
    localizationGap: 0.25,
    uvpResonance: 0.15,
    governanceResonance: 0.15,
  },
  AD: {
    costBarrier: 0.35,
    technicalComplexity: 0.1,
    localizationGap: 0.25,
    uvpResonance: 0.15,
    governanceResonance: 0.15,
  },
};

/**
 * Scoring-model methodology version stamped on each stored record (Constitution
 * Principle 7). v1 = four-component model; v2 = five components incl. Governance
 * Resonance (G). Prior records keep v1 and are never recomputed.
 */
export const DVI_MODEL_VERSION = 'v2' as const;

/**
 * Valid range for an individual component score. Ratings are collected on a
 * 0.0–5.0 self-report scale, so 0 is valid — this makes the "Weak" DVI band
 * (0.00–1.49) reachable (it is not when the floor is 1.0).
 */
export const DVI_SCALE = { MIN: 0.0, MAX: 5.0 } as const;

/**
 * DVI interpretation band lower bounds (inclusive), per the docx 0.00–5.00 scale.
 */
export const DVI_BANDS = {
  STRONG: 3.5,
  MODERATE: 2.5,
  LIMITED: 1.5,
} as const;

/**
 * Clamps a raw score into the valid 1.0–5.0 range. A non-finite (unparseable)
 * score collapses to the scale minimum so it cannot silently inflate demand.
 */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return DVI_SCALE.MIN;
  return Math.min(DVI_SCALE.MAX, Math.max(DVI_SCALE.MIN, value));
}

/**
 * Computes the weighted DVI from the four component scores, rounded to two
 * decimals. Uses AD-adjusted weights when the overlay is 'AD'. Each component
 * is clamped to the valid range first.
 */
export function computeDVI(scores: DVIScores, overlay: Overlay = 'basic'): number {
  const w = DVI_WEIGHTS[overlay];
  const raw =
    w.costBarrier * clampScore(scores.costBarrier) +
    w.technicalComplexity * clampScore(scores.technicalComplexity) +
    w.localizationGap * clampScore(scores.localizationGap) +
    w.uvpResonance * clampScore(scores.uvpResonance) +
    w.governanceResonance * clampScore(scores.governanceResonance);

  return Math.round(raw * 100) / 100;
}

/**
 * Maps a DVI to its interpretation band (four bands, per the docx).
 */
export function interpretDVI(dvi: number): string {
  if (dvi >= DVI_BANDS.STRONG) return 'Strong demand signal';
  if (dvi >= DVI_BANDS.MODERATE) return 'Moderate demand signal';
  if (dvi >= DVI_BANDS.LIMITED) return 'Limited demand signal';
  return 'Weak demand signal';
}
