import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from './Toast.jsx';

describe('Toast', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders the message', () => {
    render(
      <Toast message="Plan recalculated" onDismiss={() => {}} />
    );
    expect(screen.getByText('Plan recalculated')).toBeTruthy();
  });

  test('renders action button when actionLabel and onAction are provided', () => {
    render(
      <Toast
        message="Plan recalculated"
        actionLabel="Undo"
        onAction={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('Undo')).toBeTruthy();
  });

  test('does NOT render action button when actionLabel is omitted', () => {
    render(
      <Toast message="Plan recalculated" onDismiss={() => {}} />
    );
    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();
  });

  test('calls onAction and onDismiss when action button is clicked', () => {
    const onAction  = vi.fn();
    const onDismiss = vi.fn();
    render(
      <Toast
        message="Plan recalculated"
        actionLabel="Undo"
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText('Undo'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('auto-dismisses after 5 seconds', () => {
    // useFakeTimers MUST be called before render so setTimeout is intercepted
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Plan recalculated" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});