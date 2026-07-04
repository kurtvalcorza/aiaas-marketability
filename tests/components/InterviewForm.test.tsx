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
    expect(screen.getByText(/Please answer the required questions/)).toBeInTheDocument();
  });

  it('reveals the primary-context follow-up only when work type is "both"', async () => {
    const user = userEvent.setup();
    render(<InterviewForm onSubmit={vi.fn()} />);
    expect(screen.queryByText(/PRIMARY context/)).not.toBeInTheDocument();
    await user.click(screen.getByText('Both research/data work and software development'));
    expect(screen.getByText(/PRIMARY context/)).toBeInTheDocument();
  });
});
