/**
 * Programmatically triggers a browser download of a text file.
 * @param {string} filename - The name of the file to download (e.g. 'planned_workouts.csv')
 * @param {string} text     - The text content of the file
 */
export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const a         = document.createElement('a');
  a.href          = url;
  a.download      = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}