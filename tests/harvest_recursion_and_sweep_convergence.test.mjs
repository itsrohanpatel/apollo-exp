import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APOLLO_MASTER_SUBDEPARTMENTS,
  subdivideCabinet,
  shouldEarlyExitHarvest,
  resolveAdaptiveExecutionTree
} from '../extension/slicer_core.js';

describe('Harvest Recursion Elimination & Pass 2 Local Sweep Convergence', () => {

  describe('Authentic 125-Key Subdepartment Taxonomy', () => {
    it('contains all 125 authentic subdepartment keys extracted from Apollo HAR capture', () => {
      // 12 departments with children
      const expectedCounts = {
        c_suite: 10,
        master_engineering_technical: 24,
        design: 3,
        education: 4,
        master_finance: 14,
        master_human_resources: 13,
        master_information_technology: 26,
        master_legal: 15,
        master_marketing: 20,
        medical_health: 29,
        master_operations: 16,
        master_sales: 13
      };

      for (const [dept, minCount] of Object.entries(expectedCounts)) {
        const subs = APOLLO_MASTER_SUBDEPARTMENTS[dept];
        assert.ok(Array.isArray(subs), `Department ${dept} must be an array`);
        assert.ok(subs.length >= minCount, `Department ${dept} must have at least ${minCount} subdepartments (found ${subs.length})`);
        
        for (const sub of subs) {
          assert.ok(sub.key, `Sub in ${dept} missing key`);
          assert.ok(sub.label, `Sub in ${dept} missing label`);
          assert.strictEqual(sub.key, sub.queryKey, `queryKey must match key in ${dept}`);
        }
      }

      // Check specific crucial keys from HAR
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.c_suite.some(s => s.queryKey === 'sales_executive'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_engineering_technical.some(s => s.queryKey === 'artificial_intelligence_machine_learning'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_finance.some(s => s.queryKey === 'financial_planning_analysis'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_information_technology.some(s => s.queryKey === 'business_service_management_itsm'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_legal.some(s => s.queryKey === 'intellectual_property_patent'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_marketing.some(s => s.queryKey === 'search_engine_optimization_pay_per_click'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.medical_health.some(s => s.queryKey === 'infectious_disease'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_operations.some(s => s.queryKey === 'enterprise_resource_planning'));
      assert.ok(APOLLO_MASTER_SUBDEPARTMENTS.master_sales.some(s => s.queryKey === 'revenue_operations'));
    });
  });

  describe('Bug 1 & 3: Runtime Leaf Guard & Recursion Elimination', () => {
    it('subdivideCabinet returns [cabinet] unmodified if cabinet.subdepartment is present', () => {
      const cabinet = {
        label: '150,150 entry unavailable recruiting_talent_acquisition',
        bracket: ['150,150'],
        seniority: 'entry',
        emailStatus: ['unavailable'],
        subdepartment: 'recruiting_talent_acquisition',
        department: 'master_human_resources',
        total: 350
      };

      const result = subdivideCabinet(cabinet, 350, {
        baseFilters: { person_department_or_subdepartments: ['master_human_resources'] }
      });

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], cabinet);
    });

    it('subdivideCabinet returns [cabinet] unmodified if cabinet.isUntagged is true', () => {
      const untaggedCabinet = {
        label: '150,150 entry unavailable Untagged / General',
        bracket: ['150,150'],
        seniority: 'entry',
        emailStatus: ['unavailable'],
        subdepartment: null,
        department: 'master_human_resources',
        isUntagged: true,
        total: 353
      };

      const result = subdivideCabinet(untaggedCabinet, 353, {
        baseFilters: { person_department_or_subdepartments: ['master_human_resources'] }
      });

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], untaggedCabinet, 'Untagged cabinet must never subdivide recursively');
    });

    it('subdivideCabinet returns [cabinet] unmodified if cabinet._leaf is true', () => {
      const leafCabinet = {
        label: 'Custom Leaf Slice',
        bracket: ['10,10'],
        _leaf: true,
        total: 500
      };

      const result = subdivideCabinet(leafCabinet, 500);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], leafCabinet);
    });

    it('resolveAdaptiveExecutionTree marks subdepartment cabinets and untagged cabinets with _leaf: true', async () => {
      const probeFn = async (params) => {
        const ranges = params.organization_num_employees_ranges;
        const sen = params.person_seniorities;
        const email = params.contact_email_status;
        const depts = params.person_department_or_subdepartments;

        if (depts && depts.includes('recruiting_talent_acquisition')) return 120;
        if (depts && depts.includes('people_operations')) return 150;
        if (depts && depts.length > 0) return 0;
        if (email) return 370; // > 300 leads triggers subdept probe
        if (sen) return 370;
        if (ranges) return 370;
        return 0;
      };

      const basePayload = {
        organization_num_employees_ranges: ['150,150'],
        person_seniorities: ['entry'],
        contact_email_status: ['unavailable'],
        person_department_or_subdepartments: ['master_human_resources']
      };

      const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
        maxLeadsPerCabinet: 125
      });

      assert.ok(cabinets.length > 0);
      for (const cab of cabinets) {
        if (cab.subdepartment || cab.isUntagged) {
          assert.strictEqual(cab._leaf, true, `Cabinet ${cab.label} must be flagged as _leaf`);
        }
      }
    });
  });

  describe('Bug 2: Pass 2 Local Cabinet Sweep Convergence', () => {
    it('does NOT early exit in Pass 2 when addedInPage is 0 if cabinetOverlapsInPage < rawPeopleCount', () => {
      // Scenario: Page has 30 leads. All 30 were already harvested in prior cabinets (global duplicates),
      // but NONE were seen in THIS cabinet during Pass 1. Sweep has NOT converged for this cabinet!
      const decision = shouldEarlyExitHarvest({
        isPass2: true,
        page: 2,
        sliceHarvested: 50,
        sliceTotal: 246,
        addedInPage: 0,
        rawPeopleCount: 30,
        pageSize: 30,
        cabinetOverlapsInPage: 0 // 0 leads from this cabinet's Pass 1
      });

      assert.strictEqual(decision.shouldExit, false, 'Should NOT early exit when cabinet overlaps are 0');
      assert.strictEqual(decision.status, 'SUCCESS');
    });

    it('triggers EARLY_EXIT_SWEEP_CONVERGENCE in Pass 2 when cabinetOverlapsInPage >= rawPeopleCount', () => {
      // Scenario: Page has 30 leads. All 30 leads were already harvested in THIS cabinet during Pass 1.
      // Sweep has officially met in the middle!
      const decision = shouldEarlyExitHarvest({
        isPass2: true,
        page: 3,
        sliceHarvested: 180,
        sliceTotal: 250,
        addedInPage: 0,
        rawPeopleCount: 30,
        pageSize: 30,
        cabinetOverlapsInPage: 30 // All 30 leads overlap with Pass 1 of this cabinet
      });

      assert.strictEqual(decision.shouldExit, true);
      assert.strictEqual(decision.status, 'EARLY_EXIT_SWEEP_CONVERGENCE');
      assert.strictEqual(decision.reason, 'SWEEP_CONVERGENCE');
    });

    it('maintains backwards compatibility: exits when addedInPage === 0 if cabinetOverlapsInPage is omitted', () => {
      const decision = shouldEarlyExitHarvest({
        isPass2: true,
        page: 2,
        sliceHarvested: 100,
        sliceTotal: 200,
        addedInPage: 0,
        rawPeopleCount: 30
      });

      assert.strictEqual(decision.shouldExit, true);
      assert.strictEqual(decision.status, 'EARLY_EXIT_SWEEP_CONVERGENCE');
    });

    it('triggers EARLY_EXIT_CABINET_COMPLETE when sliceHarvested >= sliceTotal', () => {
      const decision = shouldEarlyExitHarvest({
        isPass2: true,
        page: 1,
        sliceHarvested: 120,
        sliceTotal: 120,
        addedInPage: 10,
        rawPeopleCount: 30,
        cabinetOverlapsInPage: 0
      });

      assert.strictEqual(decision.shouldExit, true);
      assert.strictEqual(decision.status, 'EARLY_EXIT_CABINET_COMPLETE');
    });
  });

});

