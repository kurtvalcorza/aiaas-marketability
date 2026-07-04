/**
 * Demand Viability Index (DVI) computation.
 *
 * Base:  DVI    = (0.30·C) + (0.25·T) + (0.25·L) + (0.20·U)
 * AD:    DVI_AD = (0.40·C) + (0.10·T) + (0.30·L) + (0.20·U)
 *
 * For Advanced Demand (AD) respondents — who already use, train, or deploy AI —
 * Technical Complexity should not dominate, so its weight is reduced and
 * reallocated to Cost Barrier and Localization Gap. The overlay is derived from
 * the route; the DVI is always recomputed here so the stored value is
 * deterministic and auditable rather than dependent on the model's arithmetic.
 */

import { DVIScores, Overlay } from './types';

/**
 * Component weights per overlay. Each set must sum to 1.0.
 */
export const DVI_WEIGHTS: Record<Overlay, DVIScores> = {
  basic: {
    costBarrier: 0.3,
    technicalComplexity: 0.25,
    localizationGap: 0.25,
    uvpResonance: 0.2,
  },
  AD: {
    costBarrier: 0.4,
    technicalComplexity: 0.1,
    localizationGap: 0.3,
    uvpResonance: 0.2,
  },
};

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
    w.uvpResonance * clampScore(scores.uvpResonance);

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
