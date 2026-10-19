import fs from 'fs';
import { sanitizeCSVValue, buildUnionCSV, PREFERRED_PERSON_COLUMNS } from '../extension/slicer_core.js';

const leads = JSON.parse(fs.readFileSync('scripts/last_scraped_leads.json', 'utf8'));

if (!fs.existsSync('exports')) {
  fs.mkdirSync('exports', { recursive: true });
}

const csvContent = buildUnionCSV(leads, PREFERRED_PERSON_COLUMNS);
const outputPath = 'exports/apollo_ahmedabad_hr_leads_268.csv';
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ Successfully exported ${leads.length} leads to ${outputPath}`);

// Check CSV statistics
const lines = csvContent.replace('\uFEFF', '').split('\r\n').filter(Boolean);
console.log(`📄 Total CSV Lines: ${lines.length} (1 Header + ${lines.length - 1} Records)`);
console.log(`📊 Columns Count: ${lines[0].split(',').length}`);
console.log(`🔒 Single-line integrity: ${lines.length - 1 === leads.length ? 'PERFECT MATCH' : 'MISMATCH'}`);
