import fs from 'fs';
import readline from 'readline';

const csvPath = 'apollo_universal_leads_2026-10-18.csv';

async function analyzeCSV() {
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let header = null;
  const ids = new Set();
  const duplicateIds = new Map();
  const names = new Set();
  const duplicateNames = new Map();
  const scrapedTimes = [];
  const companies = new Map();
  const titles = new Map();
  const cities = new Map();

  for await (const line of rl) {
    if (!line.trim()) continue;
    lineCount++;
    if (lineCount === 1) {
      header = line.split(',');
      continue;
    }

    // Quick parse: id is first column
    const firstComma = line.indexOf(',');
    const id = firstComma !== -1 ? line.substring(0, firstComma).replace(/^[\uFEFF"]+|["\s]+$/g, '') : '';
    
    if (ids.has(id)) {
      duplicateIds.set(id, (duplicateIds.get(id) || 1) + 1);
    } else {
      ids.add(id);
    }
  }

  console.log('=== CSV ANALYSIS ===');
  console.log('Total lines (inc header):', lineCount);
  console.log('Total lead rows:', lineCount - 1);
  console.log('Unique IDs:', ids.size);
  console.log('Duplicate IDs count:', duplicateIds.size);
  if (duplicateIds.size > 0) {
    console.log('Sample duplicates:', Array.from(duplicateIds.entries()).slice(0, 5));
  }
}

analyzeCSV().catch(console.error);
