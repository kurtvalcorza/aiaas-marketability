import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterviewForm } from '@/components/InterviewForm';

describe('InterviewForm', () => {
  it('renders the routing question', () => {
    render(<InterviewForm onSubmit={vi.fn()} />);
    expect(screen.getByText(/Which best describes your team or organization/)).toBeInTheDocument();
  });

  it('blocks submit and lists required questions when empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<InterviewForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/questions still need an answer/)).toBeInTheDocument();
  });

  it('highlights each unanswered question inline after a failed submit', async () => {
    const user = userEvent.setup();
    render(<InterviewForm onSubmit={vi.fn()} />);

    // No inline errors before the respondent tries to submit.
    expect(screen.queryByText(/This question needs an answer/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // Every unanswered required question is now flagged inline...
    const inlineErrors = screen.getAllByText(/This question needs an answer/);
    expect(inlineErrors.length).toBeGreaterThan(1);

    // ...and the first required question's group is tied to its inline error text.
    const orgQuestion = document.getElementById('q-orgType');
    expect(orgQuestion).toHaveAttribute('aria-describedby', 'q-orgType-error');
    expect(document.getElementById('q-orgType-error')).toBeInTheDocument();
  });

  it('flags the work email input itself when consent is given but the email is blank', async () => {
    const user = userEvent.setup();
    render(<InterviewForm onSubmit={vi.fn()} />);

    // Agreeing to be contacted makes the work email required.
    await user.click(screen.getByText('Yes, I agree to be contacted'));
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // The error must land on the email input, not the (already-answered) consent question.
    const emailInput = document.getElementById('q-contactEmail');
    expect(emailInput).not.toBeNull();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/A work email is required/)).toBeInTheDocument();
  });

  it('reveals the primary-context follow-up only when work type is "both"', async () => {
    const user = userEvent.setup();
    render(<InterviewForm onSubmit={vi.fn()} />);
    expect(screen.queryByText(/PRIMARY context/)).not.toBeInTheDocument();
    await user.click(screen.getByText('Both research/data work and software development'));
    expect(screen.getByText(/PRIMARY context/)).toBeInTheDocument();
  });
});
