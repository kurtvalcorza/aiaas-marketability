import { describe, it, expect } from 'vitest';
import {
  bandForDvi,
  BAND_COLORS,
  VECTOR_LABELS,
  OVERLAY_LABELS,
} from '@/lib/dashboard-data';

describe('bandForDvi', () => {
  it.each([
    [0, 'Weak'],
    [1.49, 'Weak'],
    [1.5, 'Limited'],
    [2.49, 'Limited'],
    [2.5, 'Moderate'],
    [3.49, 'Moderate'],
    [3.5, 'Strong'],
    [5, 'Strong'],
  ])('maps DVI %s to %s', (dvi, expected) => {
    expect(bandForDvi(dvi as number)).toBe(expected);
  });

  it('has a colour for every band it can return', () => {
    for (const band of ['Weak', 'Limited', 'Moderate', 'Strong']) {
      expect(BAND_COLORS[band]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('code labels', () => {
  it('labels both segment vectors', () => {
    expect(VECTOR_LABELS.RR).toBeTruthy();
    expect(VECTOR_LABELS.DD).toBeTruthy();
  });

  it('labels both maturity overlays', () => {
    expect(OVERLAY_LABELS.basic).toBeTruthy();
    expect(OVERLAY_LABELS.AD).toBeTruthy();
  });
});
