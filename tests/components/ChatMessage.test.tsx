import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessage } from '@/components/ChatMessage';
import { UIMessage } from '@/lib/types';

const msg = (text: string, role: 'user' | 'assistant' = 'assistant'): UIMessage => ({
  id: '1',
  role,
  parts: [{ type: 'text', text }],
});

describe('ChatMessage', () => {
  it('renders assistant content', () => {
    render(<ChatMessage message={msg('Hello there, what is your main problem?')} />);
    expect(screen.getByText(/Hello there, what is your main problem/)).toBeInTheDocument();
  });

  it('hides the fields block and marker in the final report', () => {
    const report = `## Your AIaaS Demand Summary\n\n**Main friction:** cost.\n\n###FIELDS###\nMain Problem: secret detail\n\n###INTERVIEW_COMPLETE###`;
    render(<ChatMessage message={msg(report)} />);
    expect(screen.getByText(/Main friction/)).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
    expect(screen.queryByText(/###INTERVIEW_COMPLETE###/)).not.toBeInTheDocument();
  });

  it('renders a re-rate control and reports the chosen value', async () => {
    const user = userEvent.setup();
    const onRerate = vi.fn();
    render(<ChatMessage message={msg('You rated Cost 0 but flagged billing. [[RERATE:cost]]')} onRerate={onRerate} />);
    expect(screen.getByText(/Set your new Cost Barrier rating/)).toBeInTheDocument();
    expect(screen.queryByText(/\[\[RERATE/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /3 · Moderate/ }));
    expect(onRerate).toHaveBeenCalledWith('cost', 3);
    expect(screen.getByText(/Updated Cost Barrier to 3/)).toBeInTheDocument();
  });
});
