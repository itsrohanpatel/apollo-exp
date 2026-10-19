import fs from 'node:fs';
import path from 'node:path';
import { sanitizeCSVValue, buildUnionCSV, parseCSV } from '../extension/slicer_core.js';

const candidatePaths = [
  path.resolve('data/apollo_universal_leads_2026-10-18new.csv'),
  path.resolve('apollo_universal_leads_2026-10-18new.csv')
];
const newCsvPath = candidatePaths.find(p => fs.existsSync(p));

if (!newCsvPath) {
  console.log('No input CSV found at data/apollo_universal_leads_2026-10-18new.csv. Exiting cleanly.');
  process.exit(0);
}

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
