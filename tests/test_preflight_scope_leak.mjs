import assert from 'node:assert';
import { resolveAdaptiveExecutionTree } from '../extension/slicer_core.js';

console.log('🧪 Starting Preflight Headcount Scope-Leak & Leaf Immunity Regression Test...');

// Mock probe function replicating the 11-20 Bangalore HR dataset
const mockProbeFn = async (payload) => {
  const hc = payload.organization_num_employees_ranges ? payload.organization_num_employees_ranges[0] : null;
  const sen = payload.person_seniorities ? payload.person_seniorities[0] : null;
  const emailStatus = payload.contact_email_status ? payload.contact_email_status[0] : null;
  const subdept = payload.person_department_or_subdepartments ? payload.person_department_or_subdepartments[0] : null;

  // Bracket level probe: 11,20 macro bracket has 6,000 leads
  if (hc === '11,20' && !sen) return 6000;
  if (hc === '11,15' && !sen) return 3100;
  if (hc === '16,20' && !sen) return 2900;
  if (hc === '11,13' && !sen) return 1900;
  if (hc === '14,15' && !sen) return 1200;
  if (hc === '16,18' && !sen) return 1750;
  if (hc === '19,20' && !sen) return 1150;
  if (hc === '11,12' && !sen) return 1250;
  if (hc === '16,17' && !sen) return 1300;

  // Single headcounts
  if (!sen && !emailStatus) {
    if (hc === '18,18') return 451;
    return 600; // All other single headcounts exceed 300
  }

  // Headcount 18 breakdown
  if (hc === '18,18') {
    if (sen === 'manager') return 80;
    // Tail seniorities remainder sum to 85, so 451 - 80 - 85 = 286 for entry
    if (sen === 'entry') return 286;
    return 10;
  }

  // All other single headcounts (11..17, 19..20)
  if (sen === 'manager') return 100;
  if (sen === 'entry' && !emailStatus) return 400; // Exceeds 300, forces email status pivot!

  // Email status probes for entry
  if (sen === 'entry' && emailStatus) {
    if (emailStatus === 'verified') return 60;
    if (emailStatus === 'guessed') return 80;
    if (emailStatus === 'unavailable') {
      if (hc === '13,13') return 350; // Triggers subdepartment
      return 260; // Fits within 300
    }
  }

  if (sen === 'entry' && subdept) {
    return 50;
  }

  return 10;
};

const result = await resolveAdaptiveExecutionTree(mockProbeFn, {
  organization_num_employees_ranges: ['11,20'],
  person_department_or_subdepartments: ['master_human_resources']
}, {
  detailed: true,
  coalescePartitions: true,
  coalesceBinCapacity: 300
});

const cabinets = result.cabinets;
console.log(`✅ Generated ${cabinets.length} total cabinets.`);

// 1. Assert NO cabinet has bracket: ['11,20']
const broadCabinets = cabinets.filter(c => c.bracket && c.bracket.includes('11,20'));
assert.strictEqual(broadCabinets.length, 0, `❌ ERROR: Found broad parent range ['11,20'] in cabinets: ${broadCabinets.map(c => c.label).join(', ')}`);
console.log('✅ Assertion Passed: Zero cabinets leaked broad parent bracket ["11,20"].');

// 2. Find entry cabinet for headcount 18
const entry18Cabinet = cabinets.find(c => c.label.includes('18,18 entry') || (c.bracket && c.bracket.includes('18,18') && c.seniority === 'entry'));
assert.ok(entry18Cabinet, '❌ ERROR: Could not find 18,18 entry cabinet!');
assert.deepStrictEqual(entry18Cabinet.bracket, ['18,18'], `❌ ERROR: 18,18 entry had unexpected bracket: ${JSON.stringify(entry18Cabinet.bracket)}`);
assert.strictEqual(entry18Cabinet.total, 286, `❌ ERROR: 18,18 entry had unexpected total: ${entry18Cabinet.total}`);
assert.strictEqual(entry18Cabinet._leaf, true, '❌ ERROR: 18,18 entry must have _leaf: true');
assert.strictEqual(entry18Cabinet._preflight, true, '❌ ERROR: 18,18 entry must have _preflight: true');
console.log(`✅ Assertion Passed: Cabinet [${entry18Cabinet.label}] has strict bracket ["18,18"], total: ${entry18Cabinet.total}, _leaf: true, _preflight: true.`);

// 3. Assert all cabinets have _preflight: true and granular units have _leaf: true
cabinets.forEach((c, idx) => {
  assert.strictEqual(c._preflight, true, `❌ Cabinet #${idx + 1} [${c.label}] missing _preflight flag`);
  if (c.bracket && (c.bracket.length > 1 || c.seniority || c.emailStatus || c.subdepartment)) {
    assert.strictEqual(c._leaf, true, `❌ Granular cabinet #${idx + 1} [${c.label}] missing _leaf flag`);
  }
});
console.log('✅ Assertion Passed: All preflight cabinets have _preflight: true and _leaf protection.');

console.log('🎉 ALL REGRESSION TESTS PASSED SUCCESSFULLY!');
