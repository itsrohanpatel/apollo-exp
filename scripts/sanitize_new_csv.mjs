import fs from 'node:fs';
import path from 'node:path';
import { sanitizeCSVValue, buildUnionCSV } from '../extension/slicer_core.js';

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

const newCsvPath = path.resolve('apollo_universal_leads_2026-10-18new.csv');
const rawText = fs.readFileSync(newCsvPath, 'utf8').replace(/^\uFEFF/, '');

const rows = parseCSV(rawText);
const headers = rows[0];
const records = rows.slice(1);

console.log(`Input New CSV Records: ${records.length}`);
console.log(`Input New CSV Physical Lines: ${rawText.split('\n').length}`);

// Convert to objects
const objectRecords = records.map(row => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
});

// Build sanitized CSV
const sanitizedCSV = buildUnionCSV(objectRecords);
const sanitizedLines = sanitizedCSV.split('\n').filter(l => l.trim().length > 0);

console.log(`Sanitized New CSV Physical Lines: ${sanitizedLines.length}`);
console.log(`Expected (1 header + ${records.length} records): ${records.length + 1}`);

const sanitizedOutPath = path.resolve('apollo_universal_leads_2026-10-18new_sanitized.csv');
fs.writeFileSync(sanitizedOutPath, sanitizedCSV, 'utf8');

console.log(`Saved sanitized CSV to: ${sanitizedOutPath}`);
