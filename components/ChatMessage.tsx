'use client';

/**
 * Individual chat message. When the assistant emits a [[RERATE:x]] directive,
 * renders an app-owned rating control so the respondent re-enters the value —
 * the number never comes from the model (FR: app owns the score).
 */

import { useState } from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from '@/lib/types';
import { getRespondentSummary, parseRerateRequest } from '@/lib/report-parser';
import { RerateComponent } from '@/lib/constants/parsing';
import { BARRIER_SCALE, USEFULNESS_SCALE } from '@/lib/questions';

interface ChatMessageProps {
  message: UIMessage;
  onRerate?: (component: RerateComponent, value: number) => void;
}

const COMPONENT_LABEL: Record<RerateComponent, string> = {
  cost: 'Cost Barrier',
  technical: 'Technical Complexity',
  localization: 'Localization Gap',
  uvp: 'AIaaS usefulness',
};

function rawText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

function RerateControl({
  component,
  onRerate,
}: {
  component: RerateComponent;
  onRerate?: (component: RerateComponent, value: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const labels = component === 'uvp' ? USEFULNESS_SCALE : BARRIER_SCALE;

  if (picked !== null) {
    return (
      <p className="mt-2 text-sm text-green-700">✓ Updated {COMPONENT_LABEL[component]} to {picked}.</p>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs text-gray-500">Set your new {COMPONENT_LABEL[component]} rating:</p>
      <div className="flex flex-wrap gap-2">
        {labels.map((lbl, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setPicked(i);
              onRerate?.(component, i);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:border-blue-400 transition"
          >
            {i} · {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatMessage({ message, onRerate }: ChatMessageProps) {
  const raw = rawText(message);
  const content = getRespondentSummary(raw);
  const rerate = parseRerateRequest(raw);
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      role="article"
      aria-label={`${isUser ? 'Your message' : 'Assistant message'}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div
        className={`p-4 rounded-2xl max-w-[80%] shadow-sm ${
          isUser
            ? 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm'
            : 'bg-white border border-blue-100 text-gray-800 rounded-tl-sm'
        }`}
      >
        {content && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {rerate && <RerateControl component={rerate} onRerate={onRerate} />}
      </div>
    </div>
  );
}
