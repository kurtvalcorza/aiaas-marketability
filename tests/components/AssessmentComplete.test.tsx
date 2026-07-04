import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssessmentComplete } from '@/components/AssessmentComplete';
import { InterviewCore } from '@/lib/questions';

const report = `## Your AIaaS Demand Summary

**Main friction:** Cloud cost and data residency.
**How the AIaaS platform could help:** A localized secure inference tier would help.
**Possible adoption step:** Piloting one project.`;

const core = { route: 'RR-AD', dvi: 4.5, interpretation: 'Strong demand signal' } as unknown as InterviewCore;

describe('AssessmentComplete', () => {
  const onStartNew = vi.fn();
  let mockOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onStartNew.mockClear();
    mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the completion message and buttons', () => {
    render(<AssessmentComplete report={report} core={core} onStartNew={onStartNew} />);
    expect(screen.getByText('Interview Complete!')).toBeInTheDocument();
    expect(screen.getByText(/Thank you for taking part in the AIaaS demand study/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start a new interview/i })).toBeInTheDocument();
  });

  it('shows the DVI and interpretation but not component scores', () => {
    render(<AssessmentComplete report={report} core={core} onStartNew={onStartNew} />);
    expect(screen.getByText('4.50')).toBeInTheDocument();
    expect(screen.getByText('Strong demand signal')).toBeInTheDocument();
    expect(screen.getByText(/Advanced Demand/)).toBeInTheDocument();
    expect(screen.queryByText(/Cost \(C\)/)).not.toBeInTheDocument();
  });

  it('omits the card when there is no core', () => {
    render(<AssessmentComplete report={report} core={null} onStartNew={onStartNew} />);
    expect(screen.queryByText('4.50')).not.toBeInTheDocument();
    expect(screen.getByText('Interview Complete!')).toBeInTheDocument();
  });

  it('opens a printable summary including the DVI line', async () => {
    const user = userEvent.setup();
    const win = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn() };
    mockOpen.mockReturnValue(win);
    render(<AssessmentComplete report={report} core={core} onStartNew={onStartNew} />);
    await user.click(screen.getByRole('button', { name: /View summary/i }));
    const html = win.document.write.mock.calls[0][0];
    expect(html).toContain('AIaaS Demand Summary');
    expect(html).toContain('4.50');
    expect(html).toContain('window.print()');
  });

  it('calls onStartNew', async () => {
    const user = userEvent.setup();
    render(<AssessmentComplete report={report} core={core} onStartNew={onStartNew} />);
    await user.click(screen.getByRole('button', { name: /Start a new interview/i }));
    expect(onStartNew).toHaveBeenCalledTimes(1);
  });
});
