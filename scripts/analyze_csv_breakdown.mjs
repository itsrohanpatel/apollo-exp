import fs from 'fs';

const csvPath = 'apollo_universal_leads_2026-10-18.csv';
const content = fs.readFileSync(csvPath, 'utf8');

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
      if (char === '\r' && nextChar === '\n') i++;
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
const header = allRows[0];
const empIdx = header.findIndex(h => h.includes('company_employees') || h.includes('employees'));
const titleIdx = header.findIndex(h => h === 'title');
const cityIdx = header.findIndex(h => h === 'city');

console.log('Total lead rows:', allRows.length - 1);

const empCounts = new Map();
for (let i = 1; i < allRows.length; i++) {
  const emp = allRows[i][empIdx] || 'UNKNOWN';
  empCounts.set(emp, (empCounts.get(emp) || 0) + 1);
}

console.log('Employee count distribution (sample top 15):');
console.log(Array.from(empCounts.entries()).sort((a,b) => b[1] - a[1]).slice(0, 15));
