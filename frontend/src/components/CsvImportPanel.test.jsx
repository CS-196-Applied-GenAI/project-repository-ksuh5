import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CsvImportPanel from './CsvImportPanel.jsx';
import * as csvApi from '../api/csvApi.js';

vi.mock('../api/csvApi.js', () => ({
  importCsv: vi.fn(),
}));

vi.mock('../db/db.js', () => ({
  default: {
    plannedWorkouts: { bulkPut: vi.fn().mockResolvedValue(undefined) },
    workoutLogs:     { bulkPut: vi.fn().mockResolvedValue(undefined) },
  },
}));

// Helper: create a fake File object
function makeFile(name, content) {
  return new File([content], name, { type: 'text/csv' });
}

describe('CsvImportPanel', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('renders two file inputs', () => {
    render(<CsvImportPanel />);
    expect(screen.getByLabelText(/planned workouts csv/i)).toBeTruthy();
    expect(screen.getByLabelText(/workout logs csv/i)).toBeTruthy();
  });

  test('renders a submit button', () => {
    render(<CsvImportPanel />);
    expect(screen.getByRole('button', { name: /import csv/i })).toBeTruthy();
  });

  test('calls importCsv with correct strings when submitted', async () => {
    csvApi.importCsv.mockResolvedValue({
      plannedWorkouts: [],
      workoutLogs: [],
      errors: [],
    });

    render(<CsvImportPanel onImportComplete={() => {}} />);

    const plannedInput = screen.getByLabelText(/planned workouts csv/i);
    const logsInput    = screen.getByLabelText(/workout logs csv/i);

    fireEvent.change(plannedInput, {
      target: { files: [makeFile('planned.csv', 'id,date,type\nr1,2026-03-12,easy run')] },
    });
    fireEvent.change(logsInput, {
      target: { files: [makeFile('logs.csv', 'id,date,type\nl1,2026-03-12,easy run')] },
    });

    fireEvent.click(screen.getByRole('button', { name: /import csv/i }));

    await waitFor(() => {
      expect(csvApi.importCsv).toHaveBeenCalledTimes(1);
    });

    const [args] = csvApi.importCsv.mock.calls;
    expect(typeof args[0].plannedWorkoutsCsv).toBe('string');
    expect(typeof args[0].workoutLogsCsv).toBe('string');
  });

  test('renders error table when errors are returned', async () => {
    csvApi.importCsv.mockResolvedValue({
      plannedWorkouts: [],
      workoutLogs: [],
      errors: [
        { row: 2, message: 'Invalid date format' },
        { row: 5, message: 'Missing required field: type' },
      ],
    });

    render(<CsvImportPanel onImportComplete={() => {}} />);

    const plannedInput = screen.getByLabelText(/planned workouts csv/i);
    fireEvent.change(plannedInput, {
      target: { files: [makeFile('planned.csv', 'csv content')] },
    });

    fireEvent.click(screen.getByRole('button', { name: /import csv/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid date format')).toBeTruthy();
      expect(screen.getByText('Missing required field: type')).toBeTruthy();
    });
  });

  test('calls onImportComplete after successful import', async () => {
    csvApi.importCsv.mockResolvedValue({
      plannedWorkouts: [],
      workoutLogs: [],
      errors: [],
    });

    const onImportComplete = vi.fn();
    render(<CsvImportPanel onImportComplete={onImportComplete} />);

    const plannedInput = screen.getByLabelText(/planned workouts csv/i);
    fireEvent.change(plannedInput, {
      target: { files: [makeFile('planned.csv', 'csv content')] },
    });

    fireEvent.click(screen.getByRole('button', { name: /import csv/i }));

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledTimes(1);
    });
  });
});