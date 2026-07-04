import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useChatScroll } from '@/hooks/useChatScroll';
import * as utils from '@/lib/utils';

// Mock the utils module
vi.mock('@/lib/utils', () => ({
  smoothScrollToElement: vi.fn(),
  debounce: vi.fn((fn) => fn), // Simple mock that returns the function
}));

describe('useChatScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scroll immediately when not streaming', () => {
    const { result: refResult } = renderHook(() => useRef<HTMLDivElement>(null));
    const messagesEndRef = refResult.current;

    renderHook(() => useChatScroll(messagesEndRef, false));

    expect(utils.smoothScrollToElement).toHaveBeenCalledWith(null, 'smooth');
  });

  it('should use debounced scroll when streaming', () => {
    const { result: refResult } = renderHook(() => useRef<HTMLDivElement>(null));
    const messagesEndRef = refResult.current;

    renderHook(() => useChatScroll(messagesEndRef, true));

    // With our simple mock, debounce returns the function directly
    expect(utils.smoothScrollToElement).toHaveBeenCalled();
  });

  it('should use custom scroll behavior when provided', () => {
    const { result: refResult } = renderHook(() => useRef<HTMLDivElement>(null));
    const messagesEndRef = refResult.current;

    renderHook(() => useChatScroll(messagesEndRef, false, { behavior: 'auto' }));

    expect(utils.smoothScrollToElement).toHaveBeenCalledWith(null, 'auto');
  });

  it('should create debounced function with custom delay', () => {
    const { result: refResult } = renderHook(() => useRef<HTMLDivElement>(null));
    const messagesEndRef = refResult.current;

    renderHook(() => useChatScroll(messagesEndRef, true, { debounceMs: 200 }));

    expect(utils.debounce).toHaveBeenCalledWith(expect.any(Function), 200);
  });
});
