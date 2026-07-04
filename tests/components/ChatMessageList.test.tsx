import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { ChatMessageList } from '@/components/ChatMessageList';
import { UIMessage } from '@/lib/types';
import { InterviewCore } from '@/lib/questions';

const ref = createRef<HTMLDivElement>();

const messages: UIMessage[] = [
  { id: 'ctx', role: 'system', parts: [{ type: 'text', text: 'FORM ANSWERS: secret context' }] },
  { id: 'q6', role: 'assistant', parts: [{ type: 'text', text: 'What is your main problem?' }] },
  { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Lower cost inference' }] },
];

const base = {
  messages,
  isLoading: false,
  isComplete: false,
  report: '',
  core: null as InterviewCore | null,
  submissionError: '',
  onRerate: vi.fn(),
  onStartNew: vi.fn(),
  onClearError: vi.fn(),
  messagesEndRef: ref,
};

describe('ChatMessageList', () => {
  it('renders visible messages and hides the system context', () => {
    render(<ChatMessageList {...base} />);
    expect(screen.getByText('What is your main problem?')).toBeInTheDocument();
    expect(screen.getByText('Lower cost inference')).toBeInTheDocument();
    expect(screen.queryByText(/secret context/)).not.toBeInTheDocument();
  });

  it('shows the completion summary when complete', () => {
    render(
      <ChatMessageList
        {...base}
        isComplete
        report="**Main friction:** cost."
        core={{ route: 'DD-Basic', dvi: 3.5, interpretation: 'Strong demand signal' } as unknown as InterviewCore}
      />
    );
    expect(screen.getByText(/Interview Complete/i)).toBeInTheDocument();
  });

  it('shows a submission error alert', () => {
    render(<ChatMessageList {...base} submissionError="Failed to submit" />);
    expect(screen.getByText('Failed to submit')).toBeInTheDocument();
  });
});
