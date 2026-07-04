import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '@/components/ChatInput';

describe('ChatInput', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders input field and submit button', () => {
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('disables submit button when input is empty', () => {
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when input has content', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    const submitButton = screen.getByRole('button', { name: /send message/i });

    await user.type(input, 'Test message');
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith('Test message');
  });

  it('submits on Enter key press', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    await user.type(input, 'Test message');
    await user.keyboard('{Enter}');

    expect(mockOnSubmit).toHaveBeenCalledWith('Test message');
  });

  it('does not submit on Shift+Enter', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    await user.type(input, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('clears input on Escape key', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
    await user.type(input, 'Test message');
    expect(input.value).toBe('Test message');

    await user.keyboard('{Escape}');
    expect(input.value).toBe('');
  });

  it('shows character count', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    await user.type(input, 'Test');

    expect(screen.getByText('4/2000')).toBeInTheDocument();
  });

  it('shows error for messages that are too long', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
    const form = input.closest('form')!;
    
    // Remove maxLength temporarily to test validation
    input.removeAttribute('maxlength');
    
    const longMessage = 'a'.repeat(2001);
    fireEvent.change(input, { target: { value: longMessage } });
    
    // Trigger form submission directly since button will be disabled
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Message is too long/)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} disabled={true} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    expect(input).toBeDisabled();
  });

  it('disables submit button when loading', () => {
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
  });

  it('clears input after successful submission', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  describe('Character limit validation', () => {
    it('disables submit button when character limit is exceeded', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
      const submitButton = screen.getByRole('button', { name: /send message/i });

      // Remove maxLength to test the validation logic
      input.removeAttribute('maxlength');
      
      const longMessage = 'a'.repeat(2001);
      fireEvent.change(input, { target: { value: longMessage } });

      expect(submitButton).toBeDisabled();
    });

    it('shows character count at limit', () => {
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
      
      // Use fireEvent.change instead of userEvent.type for performance with large strings
      const maxMessage = 'a'.repeat(2000);
      fireEvent.change(input, { target: { value: maxMessage } });

      expect(screen.getByText('2000/2000')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByText('Waiting for response...')).toBeInTheDocument();
    });

    it('changes placeholder when loading', () => {
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByPlaceholderText('Waiting for response...')).toBeInTheDocument();
    });

    it('disables textarea when loading', () => {
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={true} />);

      const input = screen.getByPlaceholderText('Waiting for response...');
      expect(input).toBeDisabled();
    });

    it('shows spinner in submit button when loading', () => {
      const { container } = render(<ChatInput onSubmit={mockOnSubmit} isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('clears error message on Escape key', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
      const form = input.closest('form')!;
      
      // Trigger an error first
      input.removeAttribute('maxlength');
      const longMessage = 'a'.repeat(2001);
      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Message is too long/)).toBeInTheDocument();
      });

      // Clear with Escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText(/Message is too long/)).not.toBeInTheDocument();
      });
    });

    it('does not submit when input is only whitespace', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...');
      
      // Type whitespace directly
      fireEvent.change(input, { target: { value: '   ' } });
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on textarea', () => {
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...');
      expect(input).toHaveAttribute('aria-label', expect.stringContaining('Type your answer here'));
    });

    it('has proper aria-label on form', () => {
      const { container } = render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const form = container.querySelector('form');
      expect(form).toHaveAttribute('aria-label', 'Send message');
    });
  });

  describe('Error handling', () => {
    it('shows error alert when validation fails', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
      const form = input.closest('form')!;
      
      input.removeAttribute('maxlength');
      const longMessage = 'a'.repeat(2001);
      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
      const form = input.closest('form')!;
      
      // Trigger error
      input.removeAttribute('maxlength');
      const longMessage = 'a'.repeat(2001);
      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Message is too long/)).toBeInTheDocument();
      });

      // Start typing to clear error
      fireEvent.change(input, { target: { value: 'New message' } });

      await waitFor(() => {
        expect(screen.queryByText(/Message is too long/)).not.toBeInTheDocument();
      });
    });

    it('allows closing error alert', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSubmit={mockOnSubmit} isLoading={false} />);

      const input = screen.getByPlaceholderText('Type your answer...') as HTMLTextAreaElement;
      const form = input.closest('form')!;
      
      input.removeAttribute('maxlength');
      const longMessage = 'a'.repeat(2001);
      fireEvent.change(input, { target: { value: longMessage } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Message is too long/)).toBeInTheDocument();
      });

      // The error alert should have a close button
      const closeButton = await screen.findByRole('button', { name: /close alert/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Message is too long/)).not.toBeInTheDocument();
      });
    });
  });
});