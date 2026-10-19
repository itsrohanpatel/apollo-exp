import fs from 'fs';

const content = fs.readFileSync('apollo_universal_leads_2026-10-18.csv', 'utf8');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') { currentField += '"'; i++; }
      else { insideQuotes = !insideQuotes; }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField); currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField); currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) rows.push(currentRow);
      currentRow = [];
    } else { currentField += char; }
  }
  if (currentField || currentRow.length > 0) { currentRow.push(currentField); rows.push(currentRow); }
  return rows;
}

const allRows = parseCSV(content);
const header = allRows[0];
const viraj = allRows.find(r => r[3] && r[3].includes('Viraj Desai'));
if (viraj) {
  console.log('Viraj found:');
  header.forEach((h, idx) => {
    if (viraj[idx]) {
      console.log(`${h}: ${String(viraj[idx]).slice(0, 100)}`);
    }
  });
}
