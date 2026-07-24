import { describe, it, expect } from 'vitest';
import { DVI_WEIGHTS, DVI_SCALE, DVI_BANDS, clampScore, computeDVI, interpretDVI } from '@/lib/dvi';

describe('DVI computation', () => {
  it('base and AD weight sets each sum to 1.0', () => {
    for (const overlay of ['basic', 'AD'] as const) {
      const w = DVI_WEIGHTS[overlay];
      expect(w.costBarrier + w.technicalComplexity + w.localizationGap + w.uvpResonance + w.governanceResonance).toBeCloseTo(1, 10);
    }
  });

  it('matches the Scheme A (v2) weights', () => {
    expect(DVI_WEIGHTS.basic).toEqual({ costBarrier: 0.25, technicalComplexity: 0.2, localizationGap: 0.25, uvpResonance: 0.15, governanceResonance: 0.15 });
    expect(DVI_WEIGHTS.AD).toEqual({ costBarrier: 0.35, technicalComplexity: 0.1, localizationGap: 0.25, uvpResonance: 0.15, governanceResonance: 0.15 });
  });

  describe('clampScore (0-5 scale)', () => {
    it('passes in-range values through, including 0', () => {
      expect(clampScore(0)).toBe(0);
      expect(clampScore(3.2)).toBe(3.2);
    });
    it('clamps out-of-range values to the 0-5 range', () => {
      expect(clampScore(-4)).toBe(DVI_SCALE.MIN);
      expect(clampScore(9)).toBe(DVI_SCALE.MAX);
      expect(DVI_SCALE.MIN).toBe(0);
    });
    it('collapses non-finite values to the minimum (0)', () => {
      expect(clampScore(NaN)).toBe(0);
      expect(clampScore(Infinity)).toBe(0);
    });
  });

  describe('computeDVI (Scheme A, five components)', () => {
    it('base worked example (C3/T5/L4/U5/G4 -> 4.10)', () => {
      expect(computeDVI({ costBarrier: 3, technicalComplexity: 5, localizationGap: 4, uvpResonance: 5, governanceResonance: 4 })).toBe(4.1);
    });
    it('AD worked example (C5/T2/L4/U5/G5 -> 4.45)', () => {
      expect(computeDVI({ costBarrier: 5, technicalComplexity: 2, localizationGap: 4, uvpResonance: 5, governanceResonance: 5 }, 'AD')).toBe(4.45);
    });
    it('all-zero ratings yield DVI 0 (now reachable); all-five yield 5', () => {
      const zero = { costBarrier: 0, technicalComplexity: 0, localizationGap: 0, uvpResonance: 0, governanceResonance: 0 };
      const five = { costBarrier: 5, technicalComplexity: 5, localizationGap: 5, uvpResonance: 5, governanceResonance: 5 };
      expect(computeDVI(zero)).toBe(0);
      expect(computeDVI(zero, 'AD')).toBe(0);
      expect(computeDVI(five)).toBe(5);
      expect(computeDVI(five, 'AD')).toBe(5);
    });
  });

  describe('interpretDVI (four bands, Weak now reachable)', () => {
    it('labels the bands', () => {
      expect(interpretDVI(0)).toBe('Weak demand signal');
      expect(interpretDVI(1.49)).toBe('Weak demand signal');
      expect(interpretDVI(1.5)).toBe('Limited demand signal');
      expect(interpretDVI(2.49)).toBe('Limited demand signal');
      expect(interpretDVI(2.5)).toBe('Moderate demand signal');
      expect(interpretDVI(3.49)).toBe('Moderate demand signal');
      expect(interpretDVI(DVI_BANDS.STRONG)).toBe('Strong demand signal');
      expect(interpretDVI(5)).toBe('Strong demand signal');
    });
  });
});
