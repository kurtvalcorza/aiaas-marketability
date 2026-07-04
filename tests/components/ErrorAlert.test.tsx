import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorAlert } from '@/components/ErrorAlert';

describe('ErrorAlert', () => {
  it('renders error message', () => {
    render(<ErrorAlert message="Test error message" />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders with error severity by default', () => {
    render(<ErrorAlert message="Test error" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('renders with warning severity', () => {
    render(<ErrorAlert message="Test warning" severity="warning" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('renders with info severity', () => {
    render(<ErrorAlert message="Test info" severity="info" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('shows close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<ErrorAlert message="Test error" onClose={onClose} />);
    
    expect(screen.getByRole('button', { name: /close alert/i })).toBeInTheDocument();
  });

  it('does not show close button when onClose is not provided', () => {
    render(<ErrorAlert message="Test error" />);
    
    expect(screen.queryByRole('button', { name: /close alert/i })).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ErrorAlert message="Test error" onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close alert/i });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorAlert message="Test error" />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});