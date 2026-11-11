import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APOLLO_MASTER_SUBDEPARTMENTS,
  resolveAdaptiveExecutionTree,
  buildHashForSlice
} from '../extension/slicer_core.js';

test('Apollo Subdepartment Taxonomy & Probe Resilience', async (t) => {

  await t.test('Taxonomy: Human Resources contains 13 authentic Apollo production keys from live payloads', () => {
    const hrSubdepts = APOLLO_MASTER_SUBDEPARTMENTS.master_human_resources;
    assert.ok(Array.isArray(hrSubdepts), 'master_human_resources must be an array');
    assert.strictEqual(hrSubdepts.length, 13, 'master_human_resources must have 13 authentic subdepartments');

    const expectedKeys = [
      'recruiting_talent_acquisition',
      'people_operations',
      'human_resources',
      'hr_business_partner',
      'compensation_benefits',
      'learning_development',
      'organizational_development',
      'talent_management',
      'employee_labor_relations',
      'human_resource_information_system',
      'workforce_mangement',
      'culture_diversity_inclusion',
      'health_safety'
    ];

    const actualQueryKeys = hrSubdepts.map(s => s.queryKey);
    assert.deepStrictEqual(actualQueryKeys.sort(), expectedKeys.sort(), 'HR subdepartments must match authentic HAR keys');

    // Specific critical regressions prevention
    const comp = hrSubdepts.find(s => s.key === 'compensation_benefits' || s.queryKey === 'compensation_benefits');
    assert.strictEqual(comp?.queryKey, 'compensation_benefits', 'Compensation queryKey must be compensation_benefits without _and_');

    const recruit = hrSubdepts.find(s => s.queryKey === 'recruiting_talent_acquisition');
    assert.ok(recruit, 'recruiting_talent_acquisition must exist');

    const empRel = hrSubdepts.find(s => s.queryKey === 'employee_labor_relations');
    assert.ok(empRel, 'employee_labor_relations must exist');

    const hris = hrSubdepts.find(s => s.queryKey === 'human_resource_information_system');
    assert.ok(hris, 'human_resource_information_system must exist');

    const genHr = hrSubdepts.find(s => s.queryKey === 'human_resources');
    assert.ok(genHr, 'human_resources (General) must exist');

    const wfm = hrSubdepts.find(s => s.queryKey === 'workforce_mangement');
    assert.ok(wfm, 'workforce_mangement must exist (Apollo exact spelling)');

    const dei = hrSubdepts.find(s => s.queryKey === 'culture_diversity_inclusion');
    assert.ok(dei, 'culture_diversity_inclusion must exist');

    const ehs = hrSubdepts.find(s => s.queryKey === 'health_safety');
    assert.ok(ehs, 'health_safety must exist');
  });

  await t.test('Bisection Ceiling: Buckets with 151 to 300 leads do NOT pivot to sub-departments and use Bidirectional sweep', async () => {
    // Scenario matching live user log: 210,210 entry unavailable with 167 leads
    const probeFn = async (params) => {
      const ranges = params.organization_num_employees_ranges;
      const sen = params.person_seniorities;
      const email = params.contact_email_status;
      const depts = params.person_department_or_subdepartments;

      if (!ranges && !sen && !email && !depts) return 458; // root
      if (depts && depts.length > 0 && depts[0] !== 'master_human_resources') {
        throw new Error('Should not probe subdepartments when email leads <= 300!');
      }
      if (email && email.includes('unavailable')) return 167; // 167 leads <= 300 leads
      if (email) return 60;
      if (sen && sen.includes('entry')) return 387; // Exceeds 300 -> Pivots to email status
      if (sen) return 10;
      if (ranges && ranges.includes('210,210')) return 458;
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['210,210'],
      person_seniorities: ['entry'],
      contact_email_status: ['unavailable'],
      person_department_or_subdepartments: ['master_human_resources']
    };

    const auditLog = [];
    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 150,
      auditLog,
      detailed: true
    });

    const unavailableCabinet = result.cabinets.find(c =>
      c.label.includes('210,210') && c.label.includes('unavailable')
    );

    assert.ok(unavailableCabinet, 'Should create cabinet for 210,210 entry unavailable');
    assert.strictEqual(unavailableCabinet.mode, 'Bidirectional', 'Must be Bidirectional mode for 167 leads');
    assert.strictEqual(unavailableCabinet.total, 167, 'Total must be 167 leads');
    assert.strictEqual(unavailableCabinet.pagesNeeded, 6, 'Math.ceil(167 / 30) = 6 pages');

    // Verify audit log has no SUBDEPARTMENT_PIVOT for 167 leads
    const subdeptPivot = result.auditLog.find(a => a.type === 'SUBDEPARTMENT_PIVOT' && a.leadsCount === 167);
    assert.strictEqual(subdeptPivot, undefined, 'Must not pivot to subdepartments when leads <= 250');
  });

  await t.test('Sub-Department Pivot (> 250 Leads): Preserves untagged leads and avoids 0-lead cabinet drops', async () => {
    // Scenario: single headcount integer 150,150 entry unavailable with 400 leads (> 250)
    const probeFn = async (params) => {
      const depts = params.person_department_or_subdepartments;
      if (depts && depts.length > 0 && depts[0] !== 'master_human_resources') {
        const sub = depts[0];
        if (sub === 'compensation_benefits') return 120;
        if (sub === 'talent_management') return 180;
        return 0; // Other subdepartments have 0 leads
      }
      return 400; // All other probes return 400 leads
    };

    const basePayload = {
      organization_num_employees_ranges: ['150,150'],
      person_seniorities: ['entry'],
      contact_email_status: ['unavailable'],
      person_department_or_subdepartments: ['master_human_resources']
    };

    const auditLog = [];
    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      auditLog,
      detailed: true
    });

    // Subtotal = 120 + 180 = 300 leads. Untagged = 400 - 300 = 100 leads.
    const compCabinet = result.cabinets.find(c => c.subdepartment === 'compensation_benefits');
    assert.ok(compCabinet, 'Must create compensation_benefits cabinet');
    assert.strictEqual(compCabinet.total, 120);

    const talentCabinet = result.cabinets.find(c => c.subdepartment === 'talent_management');
    assert.ok(talentCabinet, 'Must create talent_management cabinet');
    assert.strictEqual(talentCabinet.total, 180);

    // Untagged leads must be preserved in a base cabinet!
    const untaggedCabinet = result.cabinets.find(c => c.isUntagged || (c.label && (c.label.includes('Untagged') || c.label.includes('General'))));
    assert.ok(untaggedCabinet, 'Must create cabinet for untagged 100 leads');
    assert.strictEqual(untaggedCabinet.total, 100, 'Untagged cabinet must represent exactly 100 remaining leads');
  });

  await t.test('Sub-Department Pivot Fallback: If ALL subdepartments return 0, does NOT drop the bucket', async () => {
    // Scenario: single headcount integer 150,150 entry unavailable with 300 leads (> 250)
    // but none of the subdepartments return any leads (e.g. all 0)
    const probeFn = async (params) => {
      const depts = params.person_department_or_subdepartments;
      if (depts && depts.length > 0 && depts[0] !== 'master_human_resources') {
        return 0; // All subdepartments return 0
      }
      return 300;
    };

    const basePayload = {
      organization_num_employees_ranges: ['150,150'],
      person_seniorities: ['entry'],
      contact_email_status: ['unavailable'],
      person_department_or_subdepartments: ['master_human_resources']
    };

    const auditLog = [];
    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      auditLog,
      detailed: true
    });

    // Must NOT return empty cabinets! Must fall back to base email partition
    assert.ok(result.cabinets.length > 0, 'Cabinets must not be empty when all subdepartments return 0');
    const fallbackCab = result.cabinets[0];
    assert.strictEqual(fallbackCab.total, 300);
    assert.strictEqual(fallbackCab.mode, 'Bidirectional');
  });

  await t.test('Non-Blocking Probe Failure: Single bracket timeout isolates failure without aborting queue', async () => {
    // Scenario: Headcount range [201,238] which splits into [201,219] and [220,238].
    // Then [220,238] splits into [220,229] and [230,238].
    // When [220,229] returns null (timeout), only [220,229] should fallback, and [230,238] must still be probed!
    const probeFn = async (params) => {
      const range = params.organization_num_employees_ranges?.[0];
      if (!range) return 450; // Root exceeds 300
      if (range === '201,238') return 450; // Splits into [201,219] and [220,238]
      if (range === '201,219') return 50; // Under limit -> Cabinet
      if (range === '220,238') return 350; // Splits into [220,229] and [230,238]
      if (range === '220,229') return null; // TIMEOUT / Network Blip!
      if (range === '230,238') return 75; // Under limit -> Cabinet
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['201,238']
    };

    const auditLog = [];
    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      auditLog,
      detailed: true
    });

    // 201,219 should succeed
    const cab1 = result.cabinets.find(c => c.label === '201,219');
    assert.ok(cab1, 'Bracket 201,219 must be present');
    assert.strictEqual(cab1.total, 50);

    // 220,229 should be isolated fallback
    const cab2 = result.cabinets.find(c => c.label === '220,229');
    assert.ok(cab2, 'Bracket 220,229 must be present as fallback');
    assert.strictEqual(cab2.total, null);
    assert.strictEqual(cab2.mode, 'Bidirectional');

    // 230,238 MUST STILL BE PROCESSED and not dumped/skipped!
    const cab3 = result.cabinets.find(c => c.label === '230,238');
    assert.ok(cab3, 'Bracket 230,238 MUST be probed and present in cabinets!');
    assert.strictEqual(cab3.total, 75, 'Bracket 230,238 should have its probed total 75');
  });

});
