import fs from 'fs';
import path from 'path';
import { parseCSV } from '../extension/slicer_core.js';

const candidatePaths = [
  path.resolve('data/apollo_universal_leads_2026-10-18.csv'),
  path.resolve('apollo_universal_leads_2026-10-18.csv'),
  path.resolve('data/apollo_universal_leads_2026-10-18new.csv')
];
const csvPath = candidatePaths.find(p => fs.existsSync(p));

if (!csvPath) {
  console.log('Skipping CSV parse test: sample CSV not found.');
  process.exit(0);
}

const content = fs.readFileSync(csvPath, 'utf8');

const allRows = parseCSV(content);
console.log('Parsed rows total:', allRows.length);
const header = allRows[0];
console.log('Header length:', header.length);
console.log('Header columns (first 10):', header.slice(0, 10));

const records = allRows.slice(1);
console.log('Total lead records:', records.length);

const ids = new Set();
const dupIds = [];
const idColIdx = 0;
const nameColIdx = header.findIndex(h => h.includes('full_name') || h === 'name');
const titleColIdx = header.findIndex(h => h.includes('title'));
const companyColIdx = header.findIndex(h => h.includes('company_name'));

console.log('Column indices:', { idColIdx, nameColIdx, titleColIdx, companyColIdx });

let validIdCount = 0;
for (const r of records) {
  const id = r[0]?.trim();
  if (id) {
    validIdCount++;
    if (ids.has(id)) {
      dupIds.push(id);
    } else {
      ids.add(id);
    }
  }
}

console.log('Records with ID:', validIdCount);
console.log('Unique IDs:', ids.size);
console.log('Duplicate IDs:', dupIds.length);
if (dupIds.length > 0) {
  console.log('First 5 duplicate IDs:', dupIds.slice(0, 5));
}
