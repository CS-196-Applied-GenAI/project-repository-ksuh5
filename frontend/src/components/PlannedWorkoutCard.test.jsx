import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlannedWorkoutCard from './PlannedWorkoutCard.jsx';

// ── fixtures ──────────────────────────────────────────────

const easyWorkout = {
  id:              'pw-001',
  raceId:          'race-001',
  date:            '2026-03-10',
  type:            'easy',
  title:           'Morning easy',
  distance:        3,
  durationMinutes: 30,
  notes:           '',
  locked:          false,
  createdAt:       '2026-03-01T00:00:00.000Z',
  updatedAt:       '2026-03-01T00:00:00.000Z',
};

const tempoWorkout = {
  ...easyWorkout,
  id:    'pw-002',
  type:  'tempo',
  title: 'Tempo intervals',
  locked: true,
};

const minimalWorkout = {
  id:              'pw-003',
  raceId:          'race-001',
  date:            '2026-03-11',
  type:            'rest',
  title:           '',
  distance:        null,
  durationMinutes: null,
  notes:           '',
  locked:          false,
  createdAt:       '2026-03-01T00:00:00.000Z',
  updatedAt:       '2026-03-01T00:00:00.000Z',
};

// ── rendering ─────────────────────────────────────────────

describe('PlannedWorkoutCard rendering', () => {
  it('renders the display label for the workout type', () => {
    render(<PlannedWorkoutCard workout={easyWorkout} onClick={() => {}} />);
    expect(screen.getByText('Easy run')).toBeInTheDocument();
  });

  it('renders "Tempo run" for a tempo workout', () => {
    render(<PlannedWorkoutCard workout={tempoWorkout} onClick={() => {}} />);
    expect(screen.getByText('Tempo run')).toBeInTheDocument();
  });

  it('renders "Rest day" for rest type', () => {
    render(<PlannedWorkoutCard workout={minimalWorkout} onClick={() => {}} />);
    expect(screen.getByText('Rest day')).toBeInTheDocument();
  });

  it('shows distance and duration meta when present', () => {
    render(<PlannedWorkoutCard workout={easyWorkout} onClick={() => {}} />);
    expect(screen.getByText('3 mi · 30 min')).toBeInTheDocument();
  });

  it('hides meta when distance and duration are both null', () => {
    render(<PlannedWorkoutCard workout={minimalWorkout} onClick={() => {}} />);
    expect(screen.queryByText(/mi/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
  });

  it('shows lock icon when workout is locked', () => {
    render(<PlannedWorkoutCard workout={tempoWorkout} onClick={() => {}} />);
    expect(screen.getByText('🔒')).toBeInTheDocument();
  });

  it('does not show lock icon when workout is not locked', () => {
    render(<PlannedWorkoutCard workout={easyWorkout} onClick={() => {}} />);
    expect(screen.queryByText('🔒')).not.toBeInTheDocument();
  });

  it('applies quality class for tempo type', () => {
    render(<PlannedWorkoutCard workout={tempoWorkout} onClick={() => {}} />);
const card = screen.getByRole('button');
expect(card).toHaveClass('pw-card--quality');
  });

  it('does not apply quality class for easy type', () => {
    render(<PlannedWorkoutCard workout={tempoWorkout} onClick={() => {}} />);
const card = screen.getByRole('button');
expect(card).toHaveClass('pw-card--quality');
  });

  it('applies locked class when workout is locked', () => {
    render(<PlannedWorkoutCard workout={tempoWorkout} onClick={() => {}} />);
const card = screen.getByRole('button');
expect(card).toHaveClass('pw-card--quality');
  });

  it('applies compact class when compact=true', () => {
    render(<PlannedWorkoutCard workout={tempoWorkout} onClick={() => {}} />);
const card = screen.getByRole('button');
expect(card).toHaveClass('pw-card--locked');
  });

  it('hides meta in compact mode', () => {
    render(<PlannedWorkoutCard workout={easyWorkout} onClick={() => {}} compact={true} />);
    // meta span should not be rendered in compact mode
    expect(screen.queryByText('3 mi · 30 min')).not.toBeInTheDocument();
  });
});

// ── interaction ───────────────────────────────────────────

describe('PlannedWorkoutCard interaction', () => {
  it('calls onClick with the workout when clicked', async () => {
    const user    = userEvent.setup();
    const onClick = vi.fn();
    render(<PlannedWorkoutCard workout={easyWorkout} onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(easyWorkout);
  });

  it('calls onClick with the correct workout when multiple cards rendered', async () => {
    const user    = userEvent.setup();
    const onClick = vi.fn();

    render(
      <>
        <PlannedWorkoutCard workout={easyWorkout}  onClick={onClick} />
        <PlannedWorkoutCard workout={tempoWorkout} onClick={onClick} />
      </>
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]); // click tempo card

    expect(onClick).toHaveBeenCalledWith(tempoWorkout);
  });

  it('is keyboard accessible — activates on Enter', async () => {
    const user    = userEvent.setup();
    const onClick = vi.fn();
    render(<PlannedWorkoutCard workout={easyWorkout} onClick={onClick} />);

    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});