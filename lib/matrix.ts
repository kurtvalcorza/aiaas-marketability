/**
 * Demand × Asset matrix — the supply / participation axis, INDEPENDENT of the DVI.
 *
 * The DVI (lib/dvi.ts) measures demand ("would you use it"). This module measures
 * the other side of a platform ecosystem: an Asset & Contribution (AC) score =
 * min(Possession, Willingness), so a respondent scores high only if they both
 * HOLD reusable AI assets AND would CONTRIBUTE them. Plotted against the DVI it
 * yields a four-quadrant classification (Anchor / Consumer / Contributor /
 * Peripheral) that distinguishes ecosystem anchors from pure consumers.
 *
 * This module MUST NOT import lib/dvi.ts — the two axes are independent by design
 * (spec FR-207): asset answers never affect the DVI, and the DVI never affects AC.
 */

/** Valid range for an asset self-rating; 0 is valid (0 = none / would not share). */
export const AC_SCALE = { MIN: 0.0, MAX: 5.0 } as const;

/** Inclusive high/low cut on each axis (aligned to the DVI Limited→Moderate boundary). */
export const MATRIX_CUT = 2.5;

export type Quadrant = 'Anchor' | 'Consumer' | 'Contributor' | 'Peripheral';

/** Canonical quadrant list — the single source of truth for labels (FR-208). */
export const QUADRANTS: readonly Quadrant[] = ['Anchor', 'Consumer', 'Contributor', 'Peripheral'];

/** Clamps a raw self-rating into [0,5]; a non-finite value collapses to the minimum. */
export function clampAc(value: number): number {
  if (!Number.isFinite(value)) return AC_SCALE.MIN;
  return Math.min(AC_SCALE.MAX, Math.max(AC_SCALE.MIN, value));
}

/**
 * Asset & Contribution score = min(Possession, Willingness), each clamped to
 * [0,5], rounded to two decimals. Min-gated: an organization supplies content
 * only if it both has assets AND will share them, so asset-rich-but-unwilling
 * (or willing-but-empty) correctly scores low.
 */
export function computeAcScore(possession: number, willingness: number): number {
  const ac = Math.min(clampAc(possession), clampAc(willingness));
  return Math.round(ac * 100) / 100;
}

/**
 * Classifies a respondent into a demand × asset quadrant from (DVI, AC) using a
 * `>= 2.5` inclusive cut on each axis.
 */
export function classifyQuadrant(dvi: number, ac: number): Quadrant {
  const demandHigh = dvi >= MATRIX_CUT;
  const assetHigh = ac >= MATRIX_CUT;
  if (demandHigh) return assetHigh ? 'Anchor' : 'Consumer';
  return assetHigh ? 'Contributor' : 'Peripheral';
}
