/**
 * Robust CSV parser that handles quoted cells, commas inside quotes, and line breaks.
 * @param {string} csvText Raw CSV string
 * @returns {{ headers: string[], rows: Array<Record<string, string>>, error?: string }}
 *   `error` is set when the file is structurally broken (an unterminated quote would
 *   otherwise silently swallow every following row into one cell)
 */
export const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return { headers: [], rows: [] };

  const lines = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  let lineNumber = 1;
  let quoteStartLine = 0;

  // Normalize line endings
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        if (insideQuotes) quoteStartLine = lineNumber;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== '')) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
    if (char === '\n') lineNumber++;
  }

  if (insideQuotes) {
    return {
      headers: [],
      rows: [],
      error: `Malformed CSV: the quoted value starting on line ${quoteStartLine} is never closed`,
    };
  }

  // Final cell
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  // Clean headers
  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h) =>
    h.toLowerCase().replace(/["']/g, '').trim()
  );

  const results = [];
  for (let r = 1; r < lines.length; r++) {
    const rowValues = lines[r];
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = rowValues[idx] !== undefined ? rowValues[idx] : '';
    });
    results.push(rowObj);
  }

  return { headers, rows: results };
};
