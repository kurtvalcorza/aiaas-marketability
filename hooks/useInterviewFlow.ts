'use client';

/**
 * Orchestrates the two-phase AIaaS DVI instrument: the structured form, then a
 * short chat (open-ended problem, contradiction reconciliation, AD follow-up,
 * summary). The app owns all structured data and computes the DVI; the model is
 * only used for the conversation and the summary prose.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { InterviewData, UIMessage } from '@/lib/types';
import { FormState, InterviewCore, buildFormContext, formToInterviewCore } from '@/lib/questions';
import { computeDVI, interpretDVI } from '@/lib/dvi';
import { sanitizeConversationHistory } from '@/lib/validation';
import { hasAcceptedConsent } from '@/lib/consent';
import {
  isInterviewComplete,
  getRespondentSummary,
  extractMainProblem,
  RERATE_FIELD,
} from '@/lib/report-parser';
import { RerateComponent } from '@/lib/constants/parsing';

const Q6 =
  "Thanks — that's the structured part done. In your own words, what's the main problem you're trying to solve with data, AI models, or AI services?";
const REQUEST_TIMEOUT_MS = 30000;

export type Phase = 'form' | 'chat';

export interface FlowState {
  phase: Phase;
  isComplete: boolean;
  /** Visible respondent summary (no component scores). */
  report: string;
  /** Structured core (route, DVI, interpretation) for the results card. */
  core: InterviewCore | null;
  submissionError: string;
  isSubmitting: boolean;
}

export function useInterviewFlow() {
  const coreRef = useRef<InterviewCore | null>(null);
  const [state, setState] = useState<FlowState>({
    phase: 'form',
    isComplete: false,
    report: '',
    core: null,
    submissionError: '',
    isSubmitting: false,
  });

  const hasSubmittedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/chat' }),
    messages: [],
    onError: (e) => console.error('Chat error:', e),
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /** Transition from the form to the chat phase, seeding the form context. */
  const startChat = useCallback(
    (form: FormState) => {
      const core = formToInterviewCore(form);
      coreRef.current = core;
      setMessages([
        { id: 'ctx', role: 'system', parts: [{ type: 'text', text: buildFormContext(form) }] },
        { id: 'q6', role: 'assistant', parts: [{ type: 'text', text: Q6 }] },
      ] as never);
      setState((s) => ({ ...s, phase: 'chat', core }));
    },
    [setMessages]
  );

  /** Apply a user-revised component rating (the app owns the number). */
  const rerate = useCallback(
    (component: RerateComponent, value: number) => {
      const core = coreRef.current;
      if (!core) return;
      const scores = { ...core.scores, [RERATE_FIELD[component]]: value };
      const dvi = computeDVI(scores, core.overlay);
      const updated: InterviewCore = { ...core, scores, dvi, interpretation: interpretDVI(dvi) };
      coreRef.current = updated;
      setState((s) => ({ ...s, core: updated }));
      sendMessage({ text: `I've updated my ${component} rating to ${value}.` });
    },
    [sendMessage]
  );

  const submitInterview = useCallback(
    async (conversation: UIMessage[], content: string): Promise<void> => {
      const core = coreRef.current;
      if (!core) return;

      const data: InterviewData = {
        ...core,
        mainProblem: extractMainProblem(content),
        summary: getRespondentSummary(content),
        timestamp: new Date().toISOString(),
        conversationHistory: sanitizeConversationHistory(conversation),
      };

      if (!hasAcceptedConsent()) {
        setState((s) => ({
          ...s,
          submissionError:
            'Interview complete! Your data was not saved per your privacy preference. ' +
            'You can still download your summary below.',
        }));
        return;
      }

      try {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || 'Failed to submit interview');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to submit interview';
        setState((s) => ({
          ...s,
          submissionError: `Warning: ${msg}. Your summary is still complete and can be downloaded below.`,
        }));
      }
    },
    []
  );

  // Detect chat completion and submit.
  useEffect(() => {
    if (state.phase !== 'chat' || hasSubmittedRef.current) return;
    const last = messages[messages.length - 1] as UIMessage | undefined;
    if (last?.role !== 'assistant') return;

    const textParts = last.parts.filter((p) => p.type === 'text');
    const lastPart = textParts[textParts.length - 1] as
      | { type: 'text'; text: string; state?: 'streaming' | 'done' }
      | undefined;
    if (lastPart?.state === 'streaming') return;

    const content = textParts.map((p) => p.text).join('');
    if (isInterviewComplete(content)) {
      hasSubmittedRef.current = true;
      setState((s) => ({ ...s, isComplete: true, report: getRespondentSummary(content) }));
      submitInterview(messages as UIMessage[], content);
    }
  }, [messages, state.phase, submitInterview]);

  /** Send a chat message with a stuck-request timeout. */
  const handleSendMessage = useCallback(
    async (text: string) => {
      setState((s) => ({ ...s, submissionError: '', isSubmitting: true }));
      timeoutRef.current = setTimeout(() => {
        setState((s) => ({
          ...s,
          submissionError: 'Request is taking longer than expected. Please try again.',
          isSubmitting: false,
        }));
      }, REQUEST_TIMEOUT_MS);
      try {
        await sendMessage({ text });
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setState((s) => ({ ...s, isSubmitting: false }));
      }
    },
    [sendMessage]
  );

  const clearError = useCallback(() => setState((s) => ({ ...s, submissionError: '' })), []);

  return {
    ...state,
    messages: messages as UIMessage[],
    status,
    error,
    startChat,
    rerate,
    handleSendMessage,
    clearError,
  };
}
