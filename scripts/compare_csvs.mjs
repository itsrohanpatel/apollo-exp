import fs from 'node:fs';
import path from 'node:path';

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

const oldPath = path.resolve('apollo_universal_leads_2026-10-18.csv');
const newPath = path.resolve('apollo_universal_leads_2026-10-18new.csv');

console.log('--- FILE STATS ---');
const oldStat = fs.statSync(oldPath);
const newStat = fs.statSync(newPath);
console.log(`Old CSV (${path.basename(oldPath)}): ${(oldStat.size / (1024 * 1024)).toFixed(2)} MB`);
console.log(`New CSV (${path.basename(newPath)}): ${(newStat.size / (1024 * 1024)).toFixed(2)} MB`);

const oldText = fs.readFileSync(oldPath, 'utf8').replace(/^\uFEFF/, '');
const newText = fs.readFileSync(newPath, 'utf8').replace(/^\uFEFF/, '');

const oldPhysicalLines = oldText.split('\n').filter(l => l.trim().length > 0).length;
const newPhysicalLines = newText.split('\n').filter(l => l.trim().length > 0).length;

console.log(`Old CSV Physical Lines: ${oldPhysicalLines}`);
console.log(`New CSV Physical Lines: ${newPhysicalLines}`);

const oldRows = parseCSV(oldText);
const newRows = parseCSV(newText);

console.log(`Old CSV Logical Rows: ${oldRows.length} (1 header + ${oldRows.length - 1} records)`);
console.log(`New CSV Logical Rows: ${newRows.length} (1 header + ${newRows.length - 1} records)`);

const oldHeaders = oldRows[0];
const newHeaders = newRows[0];

console.log(`Old CSV Columns: ${oldHeaders.length}`);
console.log(`New CSV Columns: ${newHeaders.length}`);

// ID extraction and comparison
const oldIdIdx = oldHeaders.indexOf('id');
const newIdIdx = newHeaders.indexOf('id');

const oldIds = new Set();
for (let i = 1; i < oldRows.length; i++) {
  const id = oldRows[i][oldIdIdx];
  if (id) oldIds.add(id);
}

const newIds = new Set();
const duplicateNewIds = [];
for (let i = 1; i < newRows.length; i++) {
  const id = newRows[i][newIdIdx];
  if (id) {
    if (newIds.has(id)) {
      duplicateNewIds.push(id);
    }
    newIds.add(id);
  }
}

console.log(`\n--- RECORD ANALYSIS ---`);
console.log(`Old CSV Unique Lead IDs: ${oldIds.size}`);
console.log(`New CSV Unique Lead IDs: ${newIds.size}`);
console.log(`New CSV Duplicates: ${duplicateNewIds.length}`);

// Difference
const addedInNew = [];
for (const id of newIds) {
  if (!oldIds.has(id)) {
    addedInNew.push(id);
  }
}

const missingInNew = [];
for (const id of oldIds) {
  if (!newIds.has(id)) {
    missingInNew.push(id);
  }
}

console.log(`\n--- COMPARISON ---`);
console.log(`Leads present in both: ${newIds.size - addedInNew.length}`);
console.log(`Newly captured leads in New CSV: ${addedInNew.length}`);
console.log(`Leads in Old CSV not in New CSV: ${missingInNew.length}`);

// Check if new CSV has embedded newlines
let hasEmbeddedNewlines = false;
for (let i = 1; i < newRows.length; i++) {
  for (const field of newRows[i]) {
    if (field.includes('\n') || field.includes('\r')) {
      hasEmbeddedNewlines = true;
      break;
    }
  }
  if (hasEmbeddedNewlines) break;
}
console.log(`\nNew CSV contains unescaped embedded newlines in fields: ${hasEmbeddedNewlines}`);
if (newPhysicalLines === newRows.length) {
  console.log('✅ PERFECT: New CSV has strictly 1 physical line per record!');
} else {
  console.log(`⚠️ Note: Physical lines (${newPhysicalLines}) != logical rows (${newRows.length}). Difference: ${newPhysicalLines - newRows.length} multiline breaks.`);
}

// Sample of newly added leads if any
if (addedInNew.length > 0) {
  console.log(`\nSample of newly captured leads (first 5):`);
  const nameIdx = newHeaders.indexOf('full_name') !== -1 ? newHeaders.indexOf('full_name') : newHeaders.indexOf('name');
  const titleIdx = newHeaders.indexOf('headline') !== -1 ? newHeaders.indexOf('headline') : newHeaders.indexOf('title');
  const compIdx = newHeaders.indexOf('organization_name') !== -1 ? newHeaders.indexOf('organization_name') : newHeaders.indexOf('company');
  
  let count = 0;
  for (let i = 1; i < newRows.length && count < 5; i++) {
    const id = newRows[i][newIdIdx];
    if (addedInNew.includes(id)) {
      console.log(`- ${newRows[i][nameIdx]} | ${newRows[i][titleIdx]} | ${newRows[i][compIdx]}`);
      count++;
    }
  }
}
