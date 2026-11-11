import fs from 'node:fs';
import assert from 'node:assert';
import { resolveAdaptiveExecutionTree } from '../extension/slicer_core.js';

console.log('🧪 Starting Replay of User Diagnostic JSON Probes...');

const diagPath = 'C:/Users/rohan/.gemini/antigravity/brain/4928fe2f-33e8-4abf-9507-2f4a695a05bc/.user_uploaded/media_1794391172503_9b2312c3.json';
if (!fs.existsSync(diagPath)) {
  console.log('ℹ️ Local diagnostic file not present, skipping replay test.');
  process.exit(0);
}
const rawData = JSON.parse(fs.readFileSync(diagPath, 'utf8'));
const logs = rawData.preflight?.auditLog || rawData.auditLog || [];

// Build lookup table of probed payloads from the audit log
const probeMap = new Map();

function makeKeyFromAudit(l) {
  const hc = l.bracket || '';
  const sen = (!l.seniority || l.seniority === 'All') ? '' : l.seniority;
  const email = (!l.emailStatus || l.emailStatus === 'All') ? '' : l.emailStatus;
  const sub = l.subdepartment || '';
  return `${hc}__${sen}__${email}__${sub}`;
}

function makeKeyFromPayload(p) {
  const hc = (p.organization_num_employees_ranges || []).join(',');
  const sen = (p.person_seniorities || []).join(',');
  let email = '';
  if (p.contact_email_status) {
    if (p.contact_email_status.includes('verified')) email = 'verified';
    else if (p.contact_email_status.includes('guessed')) email = 'guessed';
    else if (p.contact_email_status.includes('unavailable')) email = 'unavailable';
  }
  const sub = (p.person_department_or_subdepartments || []).find(s => s !== 'master_human_resources') || '';
  return `${hc}__${sen}__${email}__${sub}`;
}

logs.forEach(l => {
  const count = l.leadsCount;
  if (count !== null && count !== undefined) {
    const key = makeKeyFromAudit(l);
    probeMap.set(key, count);
  }
});

// Explicit probe values for seniorities that were collected directly into seniorityMap without separate audit step
probeMap.set('18,18__entry____', 286);
probeMap.set('18,18__manager____', 80);
probeMap.set('11,11__manager____', 135);
probeMap.set('19,19__manager____', 135);
probeMap.set('12,12__manager____', 125);
probeMap.set('20,20__manager____', 125);
probeMap.set('13,13__manager____', 113);
probeMap.set('16,16__manager____', 114);
probeMap.set('14,14__manager____', 96);
probeMap.set('15,15__manager____', 96);
probeMap.set('17,17__manager____', 97);

console.log(`Loaded ${probeMap.size} probed keys from diagnostic audit log.`);

const replayProbeFn = async (payload) => {
  const key = makeKeyFromPayload(payload);
  if (probeMap.has(key)) return probeMap.get(key);

  const hc = (payload.organization_num_employees_ranges || []).join(',');
  const sen = (payload.person_seniorities || []).join(',');
  let email = '';
  if (payload.contact_email_status) {
    if (payload.contact_email_status.includes('verified')) email = 'verified';
    else if (payload.contact_email_status.includes('guessed')) email = 'guessed';
    else if (payload.contact_email_status.includes('unavailable')) email = 'unavailable';
  }
  const prefix = `${hc}__${sen}__${email}__`;
  for (let [k, count] of probeMap.entries()) {
    if (k.startsWith(prefix)) return count;
  }
  console.log('MISSING PROBE:', key, payload);
  return 0;
};

const result = await resolveAdaptiveExecutionTree(replayProbeFn, {
  organization_num_employees_ranges: ['11,20'],
  person_department_or_subdepartments: ['master_human_resources']
}, {
  detailed: true,
  coalescePartitions: true,
  coalesceBinCapacity: 300
});

const cabinets = result.cabinets;
console.log(`✅ Generated ${cabinets.length} total cabinets.`);

cabinets.forEach((c, idx) => {
  console.log(`#${idx + 1}: ${c.label} | bracket: ${JSON.stringify(c.bracket)} | total: ${c.total} | leaf: ${c._leaf} | preflight: ${c._preflight}`);
});

// Assertions
const broad = cabinets.filter(c => c.bracket && c.bracket.includes('11,20'));
assert.strictEqual(broad.length, 0, 'No cabinet should have bracket 11,20!');

const entry18 = cabinets.find(c => c.label.includes('18,18 entry') || (c.bracket && c.bracket.includes('18,18') && c.seniority === 'entry'));
assert.ok(entry18, 'Cabinet for 18,18 entry must exist!');
assert.deepStrictEqual(entry18.bracket, ['18,18']);
assert.strictEqual(entry18._leaf, true);
assert.strictEqual(entry18._preflight, true);

console.log('🎉 Diagnostic Replay Test PASSED with flying colors!');
