import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConsent } from '@/hooks/useConsent';
import * as consentLib from '@/lib/consent';

// Mock the consent library
vi.mock('@/lib/consent', () => ({
  setConsent: vi.fn(),
  hasConsentChoice: vi.fn(),
  hasAcceptedConsent: vi.fn(),
}));

describe('useConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with showBanner=true when no choice exists', () => {
    vi.mocked(consentLib.hasConsentChoice).mockReturnValue(false);
    
    const { result } = renderHook(() => useConsent());
    
    expect(result.current[0].showBanner).toBe(true);
    expect(result.current[0].hasAccepted).toBe(null);
  });

  it('should initialize with showBanner=false when choice exists (accepted)', () => {
    vi.mocked(consentLib.hasConsentChoice).mockReturnValue(true);
    vi.mocked(consentLib.hasAcceptedConsent).mockReturnValue(true);
    
    const { result } = renderHook(() => useConsent());
    
    expect(result.current[0].showBanner).toBe(false);
    expect(result.current[0].hasAccepted).toBe(true);
  });

  it('should initialize with showBanner=false when choice exists (declined)', () => {
    vi.mocked(consentLib.hasConsentChoice).mockReturnValue(true);
    vi.mocked(consentLib.hasAcceptedConsent).mockReturnValue(false);
    
    const { result } = renderHook(() => useConsent());
    
    expect(result.current[0].showBanner).toBe(false);
    expect(result.current[0].hasAccepted).toBe(false);
  });

  it('should accept consent and hide banner', () => {
    vi.mocked(consentLib.hasConsentChoice).mockReturnValue(false);
    
    const { result } = renderHook(() => useConsent());
    
    act(() => {
      result.current[1].accept();
    });
    
    expect(consentLib.setConsent).toHaveBeenCalledWith(true);
    expect(result.current[0].showBanner).toBe(false);
    expect(result.current[0].hasAccepted).toBe(true);
  });

  it('should decline consent and hide banner', () => {
    vi.mocked(consentLib.hasConsentChoice).mockReturnValue(false);
    
    const { result } = renderHook(() => useConsent());
    
    act(() => {
      result.current[1].decline();
    });
    
    expect(consentLib.setConsent).toHaveBeenCalledWith(false);
    expect(result.current[0].showBanner).toBe(false);
    expect(result.current[0].hasAccepted).toBe(false);
  });

  it('should persist choice to localStorage via setConsent', () => {
    vi.mocked(consentLib.hasConsentChoice).mockReturnValue(false);
    
    const { result } = renderHook(() => useConsent());
    
    act(() => {
      result.current[1].accept();
    });
    
    expect(consentLib.setConsent).toHaveBeenCalledTimes(1);
    expect(consentLib.setConsent).toHaveBeenCalledWith(true);
  });
});
