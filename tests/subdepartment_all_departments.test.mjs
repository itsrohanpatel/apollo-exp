import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APOLLO_MASTER_SUBDEPARTMENTS,
  resolveAdaptiveExecutionTree
} from '../extension/slicer_core.js';

test('Apollo Full Department Taxonomy & Bisection Verification', async (t) => {
  const official14Departments = [
    'c_suite',
    'product_management',
    'master_engineering_technical',
    'design',
    'education',
    'master_finance',
    'master_human_resources',
    'master_information_technology',
    'master_legal',
    'master_marketing',
    'medical_health',
    'master_operations',
    'master_sales',
    'consulting'
  ];

  await t.test('All 14 official Apollo departments exist in APOLLO_MASTER_SUBDEPARTMENTS', () => {
    const existingKeys = Object.keys(APOLLO_MASTER_SUBDEPARTMENTS);
    assert.strictEqual(existingKeys.length, 14, 'Must have exactly 14 master departments');
    for (const dept of official14Departments) {
      assert.ok(existingKeys.includes(dept), `Missing department: ${dept}`);
      const subs = APOLLO_MASTER_SUBDEPARTMENTS[dept];
      assert.ok(Array.isArray(subs) && subs.length >= 3, `${dept} must have at least 3 subdepartments defined`);
      for (const sub of subs) {
        assert.ok(sub.key, `Subdepartment in ${dept} missing key`);
        assert.ok(sub.label, `Subdepartment in ${dept} missing label`);
        assert.ok(sub.queryKey, `Subdepartment in ${dept} missing queryKey`);
        assert.match(sub.queryKey, /^[a-z0-9_]+$/, `queryKey for ${sub.label} must be snake_case alphanumeric`);
      }
    }
  });

  await t.test('Bisection executes cleanly for non-HR departments (e.g. Sales, Marketing, Engineering)', async () => {
    for (const testDept of ['master_sales', 'master_marketing', 'master_engineering_technical', 'master_finance']) {
      const probeFn = async (params) => {
        const ranges = params.organization_num_employees_ranges;
        const sen = params.person_seniorities;
        const email = params.contact_email_status;
        const depts = params.person_department_or_subdepartments;

        // If subdepartment is probed, return <= 150 leads
        if (depts && depts.length > 0 && depts[0] !== testDept) {
          return 50;
        }
        if (email && email.includes('unavailable')) return 400; // > 300 leads -> triggers subdept bisection
        if (email) return 50;
        if (sen && sen.includes('entry')) return 500;
        if (sen) return 10;
        if (ranges && ranges.includes('1001,1001')) return 600;
        return 0;
      };

      const cabinets = await resolveAdaptiveExecutionTree(probeFn, {
        organization_num_employees_ranges: ['1001,1001'],
        person_seniorities: ['entry'],
        contact_email_status: ['unavailable'],
        person_department_or_subdepartments: [testDept]
      }, {
        maxLeadsPerCabinet: 150
      });

      assert.ok(cabinets.length > 1, `Must create subdepartment cabinets for ${testDept}`);
      const subCabinets = cabinets.filter(c => c.subdepartment);
      assert.ok(subCabinets.length > 0, `Must have subdepartment cabinets with valid subdepartment keys for ${testDept}`);
    }
  });
});
