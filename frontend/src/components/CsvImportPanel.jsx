import { useState, useRef } from 'react';
import { importCsv } from '../api/csvApi.js';
import db from '../db/db.js';

/**
 * CsvImportPanel
 *
 * Renders two file inputs (one for planned workouts, one for workout logs).
 * On submit, calls POST /csv/import, bulk-upserts results into Dexie,
 * and shows an error table for any rows that failed to parse.
 *
 * Props:
 *   onImportComplete {() => void}  — called after a successful import (triggers reload)
 */
export default function CsvImportPanel({ onImportComplete }) {
  const [plannedFile,  setPlannedFile]  = useState(null);
  const [logsFile,     setLogsFile]     = useState(null);
  const [importing,    setImporting]    = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [successMsg,   setSuccessMsg]   = useState('');
  const [errorMsg,     setErrorMsg]     = useState('');

  const plannedInputRef = useRef(null);
  const logsInputRef    = useRef(null);

  function handlePlannedFileChange(e) {
    setPlannedFile(e.target.files[0] ?? null);
    setSuccessMsg('');
    setErrorMsg('');
    setImportErrors([]);
  }

  function handleLogsFileChange(e) {
    setLogsFile(e.target.files[0] ?? null);
    setSuccessMsg('');
    setErrorMsg('');
    setImportErrors([]);
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result);
      reader.onerror = ()  => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!plannedFile && !logsFile) {
      setErrorMsg('Please select at least one CSV file to import.');
      return;
    }

    setImporting(true);
    setImportErrors([]);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const plannedCsvText = plannedFile ? await readFileAsText(plannedFile) : '';
      const logsCsvText    = logsFile    ? await readFileAsText(logsFile)    : '';

      const result = await importCsv({
        plannedWorkoutsCsv: plannedCsvText,
        workoutLogsCsv:     logsCsvText,
      });

      // Bulk-upsert successfully parsed items into Dexie
      if (result.plannedWorkouts.length > 0) {
        await db.plannedWorkouts.bulkPut(result.plannedWorkouts);
      }
      if (result.workoutLogs.length > 0) {
        await db.workoutLogs.bulkPut(result.workoutLogs);
      }

      // Show partial or full success message
      const imported = result.plannedWorkouts.length + result.workoutLogs.length;
      setSuccessMsg(
        `Imported ${imported} record${imported !== 1 ? 's' : ''}` +
        (result.errors.length > 0 ? ` (${result.errors.length} row${result.errors.length !== 1 ? 's' : ''} failed)` : ' ✓')
      );

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
      }

      // Reset file inputs
      setPlannedFile(null);
      setLogsFile(null);
      if (plannedInputRef.current) plannedInputRef.current.value = '';
      if (logsInputRef.current)    logsInputRef.current.value    = '';

      onImportComplete?.();
    } catch (err) {
      setErrorMsg(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="csv-import-panel">
      <form onSubmit={handleSubmit}>
        <div className="csv-import-panel__field">
          <label htmlFor="planned-csv-input">Planned workouts CSV</label>
          <input
            id="planned-csv-input"
            ref={plannedInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handlePlannedFileChange}
          />
        </div>

        <div className="csv-import-panel__field">
          <label htmlFor="logs-csv-input">Workout logs CSV</label>
          <input
            id="logs-csv-input"
            ref={logsInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleLogsFileChange}
          />
        </div>

        <button
          type="submit"
          className="btn-import btn-grey"
          disabled={importing || (!plannedFile && !logsFile)}
        >
          {importing ? 'Importing…' : '⬆ Import CSV'}
        </button>
      </form>

      {successMsg && (
        <p className="csv-import-panel__success">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="csv-import-panel__error">{errorMsg}</p>
      )}

      {importErrors.length > 0 && (
        <ImportErrorTable errors={importErrors} />
      )}
    </div>
  );
}

/**
 * ImportErrorTable
 * Renders a table of row-level parse errors returned by the backend.
 */
function ImportErrorTable({ errors }) {
  return (
    <div className="import-error-table">
      <h4 className="import-error-table__title">
        ⚠ {errors.length} row{errors.length !== 1 ? 's' : ''} failed to import
      </h4>
      <table>
        <thead>
          <tr>
            <th>Row</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((err, i) => (
            <tr key={i}>
              <td>{err.row ?? '—'}</td>
              <td>{err.message ?? String(err)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}