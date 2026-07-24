import { describe, it, expect } from 'vitest';
import {
  AC_SCALE,
  MATRIX_CUT,
  QUADRANTS,
  clampAc,
  computeAcScore,
  classifyQuadrant,
} from '@/lib/matrix';

describe('clampAc', () => {
  it('keeps in-range values and clamps out-of-range ones', () => {
    expect(clampAc(0)).toBe(0);
    expect(clampAc(3.4)).toBe(3.4);
    expect(clampAc(5)).toBe(5);
    expect(clampAc(-1)).toBe(AC_SCALE.MIN);
    expect(clampAc(9)).toBe(AC_SCALE.MAX);
  });

  it('collapses a non-finite value to the minimum', () => {
    expect(clampAc(NaN)).toBe(0);
    expect(clampAc(Infinity)).toBe(0);
    expect(clampAc(-Infinity)).toBe(0);
  });
});

describe('computeAcScore', () => {
  it('is min-gated: the lower of possession and willingness wins', () => {
    expect(computeAcScore(4, 1)).toBe(1); // asset-rich but unwilling
    expect(computeAcScore(1, 4)).toBe(1); // willing but empty
    expect(computeAcScore(5, 5)).toBe(5);
    expect(computeAcScore(0, 5)).toBe(0);
  });

  it('clamps out-of-range inputs before taking the min', () => {
    expect(computeAcScore(9, 3)).toBe(3);
    expect(computeAcScore(-2, 4)).toBe(0);
  });

  it('treats a non-finite rating as the minimum', () => {
    expect(computeAcScore(NaN, 4)).toBe(0);
    expect(computeAcScore(3, Infinity)).toBe(0);
  });

  it('rounds to two decimals', () => {
    expect(computeAcScore(2.345, 5)).toBe(2.35);
  });
});

describe('classifyQuadrant', () => {
  it('uses an inclusive >= 2.5 cut on both axes', () => {
    // (2.5, 2.5) is high on both → Anchor
    expect(classifyQuadrant(MATRIX_CUT, MATRIX_CUT)).toBe('Anchor');
  });

  it('maps each corner of the demand × asset plane', () => {
    expect(classifyQuadrant(4, 4)).toBe('Anchor'); // demand high, asset high
    expect(classifyQuadrant(4, 1)).toBe('Consumer'); // demand high, asset low
    expect(classifyQuadrant(1, 4)).toBe('Contributor'); // demand low, asset high
    expect(classifyQuadrant(1, 1)).toBe('Peripheral'); // demand low, asset low
  });

  it('treats just below the cut as low', () => {
    expect(classifyQuadrant(2.49, 2.5)).toBe('Contributor'); // demand low, asset high
    expect(classifyQuadrant(2.5, 2.49)).toBe('Consumer'); // demand high, asset low
  });

  it('only ever returns a canonical quadrant label', () => {
    expect(QUADRANTS).toContain(classifyQuadrant(3, 3));
  });
});
