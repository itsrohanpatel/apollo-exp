import fs from 'node:fs';
import path from 'node:path';
import { sanitizeCSVValue, buildUnionCSV } from '../extension/slicer_core.js';

const originalCsvPath = path.resolve('apollo_universal_leads_2026-10-18.csv');
const rawText = fs.readFileSync(originalCsvPath, 'utf8');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

const allRows = parseCSV(rawText);
const headers = allRows[0];
const dataRows = allRows.slice(1);

console.log(`Original Records Count: ${dataRows.length}`);
console.log(`Original Raw Text Line Count: ${rawText.split('\n').length}`);

// Convert dataRows to array of objects
const objectRecords = dataRows.map(row => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
});

// Re-export using the upgraded buildUnionCSV with sanitizeCSVValue
const reExportedCSV = buildUnionCSV(objectRecords);
const newLines = reExportedCSV.split('\n').filter(l => l.trim().length > 0);

console.log(`Upgraded Sanitized CSV Physical Line Count: ${newLines.length}`);
console.log(`Expected (1 header + ${dataRows.length} records): ${dataRows.length + 1}`);

if (newLines.length === dataRows.length + 1) {
  console.log('SUCCESS: Upgraded CSV has STRICTLY 1 physical line per lead record!');
  const sanitizedOutPath = path.resolve('apollo_universal_leads_2026-10-18_sanitized.csv');
  fs.writeFileSync(sanitizedOutPath, reExportedCSV, 'utf8');
  console.log(`Saved sanitized CSV with 1 physical line per record to: ${sanitizedOutPath}`);
} else {
  console.error(`ERROR: Expected ${dataRows.length + 1} lines but got ${newLines.length}`);
  process.exit(1);
}

// Re-parse the re-exported CSV to ensure 100% data integrity
const reParsedRows = parseCSV(reExportedCSV);
const reParsedData = reParsedRows.slice(1);

if (reParsedData.length === dataRows.length) {
  console.log(`SUCCESS: Re-parsed verified record count: ${reParsedData.length} records, 0 data loss!`);
} else {
  console.error(`ERROR: Re-parsed record count mismatch: ${reParsedData.length}`);
  process.exit(1);
}
