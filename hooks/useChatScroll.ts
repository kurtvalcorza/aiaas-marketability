/**
 * Custom hook for managing chat scroll behavior
 * 
 * Handles smooth scrolling to the bottom of the chat with debouncing for streaming updates.
 * Automatically scrolls immediately when streaming completes, and debounces during streaming.
 * 
 * @param messagesEndRef - Ref to the element at the bottom of the chat
 * @param isStreaming - Whether the chat is currently streaming
 * @param options - Optional configuration for scroll behavior and debounce timing
 * 
 * @example
 * ```tsx
 * const messagesEndRef = useRef<HTMLDivElement>(null);
 * useChatScroll(messagesEndRef, status === 'loading');
 * 
 * return (
 *   <div>
 *     {messages.map(m => <ChatMessage key={m.id} message={m} />)}
 *     <div ref={messagesEndRef} />
 *   </div>
 * );
 * ```
 */

import { useEffect, useCallback, useMemo, RefObject } from 'react';
import { debounce, smoothScrollToElement } from '@/lib/utils';

export interface ScrollOptions {
  /** Scroll behavior: 'smooth' or 'auto' */
  behavior?: ScrollBehavior;
  /** Debounce delay in milliseconds for streaming updates */
  debounceMs?: number;
}

export function useChatScroll(
  messagesEndRef: RefObject<HTMLDivElement | null>,
  isStreaming: boolean,
  options: ScrollOptions = {}
): void {
  const { behavior = 'smooth', debounceMs = 100 } = options;

  const scrollToBottom = useCallback(() => {
    smoothScrollToElement(messagesEndRef.current, behavior);
  }, [messagesEndRef, behavior]);

  const debouncedScroll = useMemo(
    () => debounce(scrollToBottom, debounceMs),
    [scrollToBottom, debounceMs]
  );

  useEffect(() => {
    if (isStreaming) {
      debouncedScroll();
    } else {
      scrollToBottom();
    }
  }, [isStreaming, scrollToBottom, debouncedScroll]);
}
