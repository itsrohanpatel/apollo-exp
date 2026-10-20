import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decomposeHighDensityBracket,
  resolveExecutionBrackets,
  resolveDenseCabinetSeniorityPivots,
  filterActiveSeniorityFacets
} from '../extension/slicer_core.js';

test('Dense Cabinet Harvest & Ultra-Granular Slicing Engine', async (t) => {

  await t.test('decomposeHighDensityBracket with granular:true generates sub-250 micro brackets', () => {
    // 51-100 decomposed into 5-headcount micro steps
    const slices51_100 = decomposeHighDensityBracket('51,100', { granular: true });
    assert.equal(slices51_100.length, 10);
    assert.deepEqual(slices51_100[0], ['51,55']);
    assert.deepEqual(slices51_100[9], ['96,100']);

    // 101-200 decomposed into 10-headcount micro steps (prevents monster 828+ lead cabinets!)
    const slices101_200 = decomposeHighDensityBracket('101,200', { granular: true });
    assert.equal(slices101_200.length, 10);
    assert.deepEqual(slices101_200[0], ['101,110']);
    assert.deepEqual(slices101_200[4], ['141,150']);
    assert.deepEqual(slices101_200[9], ['191,200']);

    // 201-500 decomposed into 25-headcount micro steps
    const slices201_500 = decomposeHighDensityBracket('201,500', { granular: true });
    assert.equal(slices201_500.length, 12);
    assert.deepEqual(slices201_500[0], ['201,225']);
    assert.deepEqual(slices201_500[1], ['226,250']);
    assert.deepEqual(slices201_500[11], ['476,500']);

    // 501-1000 decomposed into 50-headcount micro steps
    const slices501_1000 = decomposeHighDensityBracket('501,1000', { granular: true });
    assert.equal(slices501_1000.length, 10);
    assert.deepEqual(slices501_1000[0], ['501,550']);
    assert.deepEqual(slices501_1000[9], ['951,1000']);
  });

  await t.test('resolveExecutionBrackets with granular:true expands 50, into 50+ fine-grained cabinets', () => {
    const brackets = resolveExecutionBrackets({ organization_num_employees_ranges: ['50,'] }, { granular: true });
    // Instead of only 22 wide brackets, granular mode produces over 50 fine-grained brackets
    assert.ok(brackets.length >= 50, `Expected >= 50 granular brackets, got ${brackets.length}`);
    assert.ok(brackets.some(b => b[0] === '101,110'), 'Should contain 101,110 micro-bracket');
    assert.ok(brackets.some(b => b[0] === '141,150'), 'Should contain 141,150 micro-bracket');
    assert.ok(brackets.some(b => b[0] === '201,225'), 'Should contain 201,225 micro-bracket');
    assert.ok(brackets.some(b => b[0] === '10001'), 'Should contain 10001 enterprise bracket');
  });

  await t.test('filterActiveSeniorityFacets extracts only seniorities with count > 0 from metadata mode', () => {
    const rawFacets = [
      { value: 'owner', count: 0 },
      { value: 'founder', count: 0 },
      { value: 'c_suite', count: 1 },
      { value: 'partner', count: 18 },
      { value: 'vp', count: 4 },
      { value: 'head', count: 36 },
      { value: 'director', count: 3 },
      { value: 'manager', count: 223 },
      { value: 'senior', count: 72 },
      { value: 'entry', count: 538 },
      { value: 'intern', count: 39 }
    ];

    const active = filterActiveSeniorityFacets(rawFacets);
    assert.deepEqual(active, [
      'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior', 'entry', 'intern'
    ]);
    assert.ok(!active.includes('owner'), 'owner with 0 count should be skipped');
    assert.ok(!active.includes('founder'), 'founder with 0 count should be skipped');
  });

  await t.test('resolveDenseCabinetSeniorityPivots falls back to default seniorities if facets unavailable', () => {
    const pivots = resolveDenseCabinetSeniorityPivots(null);
    assert.ok(pivots.includes('founder'));
    assert.ok(pivots.includes('manager'));
    assert.ok(pivots.includes('entry'));
    assert.ok(pivots.length >= 9);
  });

});
