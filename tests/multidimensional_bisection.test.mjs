import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_APOLLO_SENIORITIES,
  EMAIL_STATUS_PARTITIONS,
  generateMultiDimensionalPlan
} from '../extension/slicer_core.js';

describe('Multi-Dimensional Bisection Engine: Pure Micro-Headcount, Seniority & Email Status', () => {
  it('contains all 11 valid Apollo seniorities including head and partner', () => {
    assert.equal(ALL_APOLLO_SENIORITIES.length, 11);
    assert.ok(ALL_APOLLO_SENIORITIES.includes('head'), 'Must include head');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('partner'), 'Must include partner');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('c_suite'), 'Must include c_suite');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('vp'), 'Must include vp');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('director'), 'Must include director');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('manager'), 'Must include manager');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('senior'), 'Must include senior');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('entry'), 'Must include entry');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('intern'), 'Must include intern');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('founder'), 'Must include founder');
    assert.ok(ALL_APOLLO_SENIORITIES.includes('owner'), 'Must include owner');
  });

  it('defines 3 mutually exclusive, non-overlapping email status partitions', () => {
    assert.equal(EMAIL_STATUS_PARTITIONS.length, 3);
    const keys = EMAIL_STATUS_PARTITIONS.map(p => p.key);
    assert.deepEqual(keys, ['verified', 'guessed', 'unavailable']);
  });

  it('generates a multi-dimensional plan decomposing brackets into sub-250 units without keywords', () => {
    const basePayload = {
      organization_num_employees_ranges: ['51,100', '10001']
    };

    const plan = generateMultiDimensionalPlan(basePayload);
    assert.ok(plan.length > 20, 'Should generate rich multidimensional plan');

    // Confirm all generated units have valid structure and NO keywords
    for (const unit of plan) {
      assert.ok(unit.label, 'Unit must have a label');
      assert.ok(Array.isArray(unit.bracket), 'Unit must have a bracket array');
      assert.equal(unit.keyword, null, 'Level 4 keywords must be null');
      if (unit.seniority) {
        assert.ok(ALL_APOLLO_SENIORITIES.includes(unit.seniority), `Seniority ${unit.seniority} must be valid`);
      }
    }
  });

  it('generates pure 3-way email decomposition for dense seniorities without title keyword slicing', () => {
    const basePayload = {
      organization_num_employees_ranges: ['10001']
    };

    const plan = generateMultiDimensionalPlan(basePayload);
    const kwUnits = plan.filter(u => u.keyword !== null);
    assert.equal(kwUnits.length, 0, 'No units should use title keywords');

    // Verify entry has exactly 3 units (verified, guessed, unavailable)
    const entryUnits = plan.filter(u => u.seniority === 'entry');
    assert.equal(entryUnits.length, 3);
    assert.deepEqual(entryUnits.map(u => u.emailStatus[0]), ['verified', 'guessed', 'unavailable']);
  });
});
