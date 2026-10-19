import fs from 'fs';

const csvPath = 'apollo_universal_leads_2026-10-18.csv';
const content = fs.readFileSync(csvPath, 'utf8');

// Parse CSV taking quotes and newlines inside quotes into account
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
        i++; // skip escaped quote
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
