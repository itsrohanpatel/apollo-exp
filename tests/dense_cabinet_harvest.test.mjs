import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decomposeHighDensityBracket,
  resolveExecutionBrackets,
  resolveDenseCabinetSeniorityPivots,
  filterActiveSeniorityFacets,
  subdivideCabinet,
  ENTERPRISE_HEADCOUNT_TIERS
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

  await t.test('ENTERPRISE_HEADCOUNT_TIERS defines valid sub-brackets covering 10001 to 1000000', () => {
    assert.equal(ENTERPRISE_HEADCOUNT_TIERS.length, 5);
    assert.equal(ENTERPRISE_HEADCOUNT_TIERS[0], '10001,15000');
    assert.equal(ENTERPRISE_HEADCOUNT_TIERS[1], '15001,25000');
    assert.equal(ENTERPRISE_HEADCOUNT_TIERS[2], '25001,50000');
    assert.equal(ENTERPRISE_HEADCOUNT_TIERS[3], '50001,100000');
    assert.equal(ENTERPRISE_HEADCOUNT_TIERS[4], '100001,1000000');
  });

  await t.test('subdivideCabinet bisects 10001,15000 (350 leads) into 10001,12500 and 12501,15000', () => {
    const cabinet = {
      label: '10001,15000',
      bracket: ['10001,15000'],
      seniority: null,
      emailStatus: null,
      mode: 'Bidirectional'
    };

    const subs = subdivideCabinet(cabinet, 350);
    assert.equal(subs.length, 2);
    assert.equal(subs[0].bracket[0], '10001,12500');
    assert.equal(subs[1].bracket[0], '12501,15000');
    assert.equal(subs[0].label, '10001,12500');
    assert.equal(subs[1].label, '12501,15000');
    assert.equal(subs[0].mode, 'Bidirectional');
    assert.equal(subs[1].mode, 'Bidirectional');
  });

  await t.test('subdivideCabinet decomposes 10001 (2000 leads) into 5 ENTERPRISE_HEADCOUNT_TIERS', () => {
    const cabinet = {
      label: '10001',
      bracket: ['10001'],
      seniority: null,
      emailStatus: null
    };

    const subs = subdivideCabinet(cabinet, 2000);
    assert.equal(subs.length, 5);
    assert.deepEqual(subs.map(s => s.bracket[0]), ENTERPRISE_HEADCOUNT_TIERS);
    assert.deepEqual(subs.map(s => s.label), ENTERPRISE_HEADCOUNT_TIERS);
    assert.ok(subs.every(s => s.mode === 'Bidirectional'));
  });

});
