import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APOLLO_MASTER_SUBDEPARTMENTS,
  subdivideCabinet,
  buildHashForSlice,
  resolveAdaptiveExecutionTree
} from '../extension/slicer_core.js';

describe('Level 4: Sub-Department & Universal Functional Bisection Ladder', () => {
  describe('Taxonomy Coverage across all 14 Apollo Departments', () => {
    it('defines rich subdepartments for all 14 official Apollo departments', () => {
      const expectedDepartments = [
        'master_human_resources',
        'master_sales',
        'master_marketing',
        'master_engineering_technical',
        'master_finance',
        'master_operations',
        'master_information_technology',
        'c_suite',
        'master_legal',
        'product_management',
        'design',
        'consulting',
        'medical_health',
        'education'
      ];

      for (const dept of expectedDepartments) {
        assert.ok(Array.isArray(APOLLO_MASTER_SUBDEPARTMENTS[dept]), `Missing subdepartments for ${dept}`);
        assert.ok(APOLLO_MASTER_SUBDEPARTMENTS[dept].length >= 2, `${dept} should have at least 2 subdepartments`);
        for (const sub of APOLLO_MASTER_SUBDEPARTMENTS[dept]) {
          assert.ok(sub.key, 'Subdepartment missing key');
          assert.ok(sub.label, 'Subdepartment missing label');
          assert.ok(sub.queryKey, 'Subdepartment missing queryKey');
        }
      }
    });
  });

  describe('subdivideCabinet: Level 4 Sub-Department Subdivision', () => {
    it('subdivides single-integer headcount with fixed seniority & emailStatus into subdepartments when totalEntries > 250', () => {
      // The real scenario from Mumbai run: [150,150 entry unavailable] had 496 leads
      const cabinet = {
        label: '150,150 entry unavailable',
        bracket: ['150,150'],
        seniority: 'entry',
        emailStatus: ['unavailable'],
        total: 496,
        mode: 'Bidirectional'
      };

      const options = {
        baseFilters: {
          person_department_or_subdepartments: ['master_human_resources']
        }
      };

      const result = subdivideCabinet(cabinet, 496, options);

      assert.ok(Array.isArray(result), 'Result should be an array of sub-cabinets');
      assert.strictEqual(result.length, APOLLO_MASTER_SUBDEPARTMENTS.master_human_resources.length);
      
      const first = result[0];
      assert.strictEqual(first.bracket[0], '150,150');
      assert.strictEqual(first.seniority, 'entry');
      assert.deepStrictEqual(first.emailStatus, ['unavailable']);
      assert.strictEqual(first.subdepartment, APOLLO_MASTER_SUBDEPARTMENTS.master_human_resources[0].queryKey);
      assert.ok(first.label.includes('150,150'));
      assert.ok(first.label.includes('entry'));
      assert.ok(first.label.includes('unavailable'));
      assert.ok(first.label.includes(APOLLO_MASTER_SUBDEPARTMENTS.master_human_resources[0].label));
    });

    it('subdivides into 14 master departments when no department filter was selected by user', () => {
      // Search with NO department selected, single headcount > 250 leads
      const cabinet = {
        label: '150,150 entry unavailable',
        bracket: ['150,150'],
        seniority: 'entry',
        emailStatus: ['unavailable'],
        total: 500,
        mode: 'Bidirectional'
      };

      const options = {
        baseFilters: {} // No department selected
      };

      const result = subdivideCabinet(cabinet, 500, options);

      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 14, 'Should subdivide across 14 master departments');
      assert.ok(result.some(c => c.department === 'master_sales'));
      assert.ok(result.some(c => c.department === 'master_human_resources'));
    });

    it('strictly respects user-pinned sub-department and never overrides user selection', () => {
      const cabinet = {
        label: '150,150 entry unavailable recruiting',
        bracket: ['150,150'],
        seniority: 'entry',
        emailStatus: ['unavailable'],
        subdepartment: 'recruiting',
        total: 350,
        mode: 'Bidirectional'
      };

      const options = {
        baseFilters: {
          person_department_or_subdepartments: ['recruiting']
        }
      };

      // User explicitly pinned recruiting; do not subdivide into other subdepartments
      const result = subdivideCabinet(cabinet, 350, options);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].subdepartment, 'recruiting');
    });
  });

  describe('buildHashForSlice: Sub-Department URL Hash Generation', () => {
    it('appends personDepartmentOrSubdepartments[] accurately when cabinet has a subdepartment', () => {
      const currentHash = '#/people?page=1&personDepartmentOrSubdepartments[]=master_human_resources';
      const cabinet = {
        bracket: ['150,150'],
        seniority: 'entry',
        emailStatus: ['unavailable'],
        subdepartment: 'recruiting'
      };

      const hash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', true);

      assert.ok(hash.includes('organizationNumEmployeesRanges[]=150%2C150'));
      assert.ok(hash.includes('personSeniorities[]=entry'));
      assert.ok(hash.includes('contactEmailStatus[]=unavailable'));
      assert.ok(hash.includes('personDepartmentOrSubdepartments[]=recruiting'));
    });
  });

  describe('resolveAdaptiveExecutionTree: Preflight Sub-Department Probing', () => {
    it('pivots dense email partition > 300 leads into sub-department probes and cabinets', async () => {
      const mockCounts = {
        'ROOT': 450,
        '150,150': 450,
        '150,150 entry': 450,
        '150,150 entry unavailable': 450,
        // Sub-departments of HR
        '150,150 entry unavailable recruiting': 95,
        '150,150 entry unavailable recruiting_talent_acquisition': 95,
        '150,150 entry unavailable hr_operations': 80,
        '150,150 entry unavailable people_operations': 80,
        '150,150 entry unavailable compensation_and_benefits': 50,
        '150,150 entry unavailable compensation_benefits': 50,
        '150,150 entry unavailable talent_management': 40,
        '150,150 entry unavailable employee_relations': 20,
        '150,150 entry unavailable employee_labor_relations': 20,
        '150,150 entry unavailable hris_analytics': 10,
        '150,150 entry unavailable human_resource_information_system': 10,
        '150,150 entry unavailable human_resources_executive': 5,
        '150,150 entry unavailable human_resources': 5,
        '150,150 entry unavailable hr_business_partner': 5,
        '150,150 entry unavailable learning_development': 5,
        '150,150 entry unavailable organizational_development': 5,
        '150,150 entry unavailable workforce_mangement': 5
      };

      const probeFn = async (params) => {
        const ranges = params.organization_num_employees_ranges;
        const sen = params.person_seniorities;
        const email = params.contact_email_status;
        const depts = params.person_department_or_subdepartments;

        if (!ranges && !sen && !email && !depts) return mockCounts['ROOT'];
        if (depts && depts.length > 0 && depts[0] !== 'master_human_resources') {
          return mockCounts[`150,150 entry unavailable ${depts[0]}`] || 0;
        }
        if (email) return mockCounts['150,150 entry unavailable'];
        if (sen) return mockCounts['150,150 entry'];
        if (ranges) return mockCounts['150,150'];
        return 0;
      };

      const basePayload = {
        organization_num_employees_ranges: ['150,150'],
        person_seniorities: ['entry'],
        contact_email_status: ['unavailable'],
        person_department_or_subdepartments: ['master_human_resources']
      };

      const auditLog = [];
      const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
        maxLeadsPerCabinet: 125,
        auditLog
      });

      assert.ok(cabinets.length > 1, 'Should resolve into multiple sub-department cabinets');
      assert.ok(cabinets.some(c => (Array.isArray(c.subdepartment) ? c.subdepartment.some(s => s.includes('recruiting')) : c.subdepartment === 'recruiting') || c.label.toLowerCase().includes('recruiting')), 'Should have recruiting cabinet');
      assert.ok(cabinets.every(c => c.total <= 300), 'Every cabinet should be <= 300 leads (bidirectional sweep limit)');
      assert.ok(auditLog.some(e => e.type === 'SUBDEPARTMENT_PIVOT' || e.type === 'SUBDEPARTMENT_PROBE' || e.type === 'SUBDEPARTMENT_BIN_COALESCED'));
    });
  });
});
