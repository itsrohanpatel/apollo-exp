import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAdaptiveMicroBrackets,
  isHighDensityBracket,
  decomposeHighDensityBracket,
  expandOpenHeadcountRange,
  resolveHarvestExecutionPlan,
  resolveExecutionBrackets,
  parseApolloUrlHash,
  buildChunkedUnionCSV,
  calculateSmartCooldownDuration,
  shouldTriggerSmartCooldown
} from '../extension/slicer_core.js';

test('Adaptive Micro-Slicing & 100% Pool Coverage Engine', async (t) => {

  await t.test('isHighDensityBracket correctly flags broad employee ranges', () => {
    assert.equal(isHighDensityBracket(['5,10']), true);
    assert.equal(isHighDensityBracket(['11,20']), true);
    assert.equal(isHighDensityBracket(['21,50']), true);
    assert.equal(isHighDensityBracket(['51,100']), true);
    assert.equal(isHighDensityBracket(['501,1000']), true);
    assert.equal(isHighDensityBracket(['1001,5000']), true);
    assert.equal(isHighDensityBracket(['5,5']), false);
    assert.equal(isHighDensityBracket(['11,11']), false);
  });

  await t.test('decomposeHighDensityBracket breaks broad ranges into sub-250 micro-ranges', () => {
    // 5-10 decomposed into 6 single-integers
    const slices5_10 = decomposeHighDensityBracket('5,10');
    assert.deepEqual(slices5_10, [
      ['5,5'], ['6,6'], ['7,7'], ['8,8'], ['9,9'], ['10,10']
    ]);

    // 11-20 decomposed into 10 single-integers
    const slices11_20 = decomposeHighDensityBracket('11,20');
    assert.equal(slices11_20.length, 10);
    assert.deepEqual(slices11_20[0], ['11,11']);
    assert.deepEqual(slices11_20[9], ['20,20']);

    // 21-50 decomposed into 5-headcount steps
    const slices21_50 = decomposeHighDensityBracket('21,50');
    assert.deepEqual(slices21_50, [
      ['21,25'], ['26,30'], ['31,35'], ['36,40'], ['41,45'], ['46,50']
    ]);

    // 51-100 decomposed into 10-headcount steps
    const slices51_100 = decomposeHighDensityBracket('51,100');
    assert.deepEqual(slices51_100, [
      ['51,60'], ['61,70'], ['71,80'], ['81,90'], ['91,100']
    ]);

    // 1001-5000 decomposed into micro steps
    const slices1001_5000 = decomposeHighDensityBracket('1001,5000');
    assert.deepEqual(slices1001_5000, [
      ['1001,2000'], ['2001,3500'], ['3501,5000']
    ]);
  });

  await t.test('decomposes arbitrary multi-interval ranges seamlessly (e.g. 50,200 and 10,50)', () => {
    const dec50_200 = decomposeHighDensityBracket('50,200');
    // Overlaps 50 (from 21-50), 51-100, and 101-200
    assert.ok(dec50_200.some(b => b[0] === '50,50'));
    assert.ok(dec50_200.some(b => b[0] === '51,60'));
    assert.ok(dec50_200.some(b => b[0] === '91,100'));
    assert.ok(dec50_200.some(b => b[0] === '101,150'));
    assert.ok(dec50_200.some(b => b[0] === '151,200'));

    const dec10_50 = decomposeHighDensityBracket('10,50');
    assert.ok(dec10_50.some(b => b[0] === '10,10'));
    assert.ok(dec10_50.some(b => b[0] === '20,20'));
    assert.ok(dec10_50.some(b => b[0] === '21,25'));
    assert.ok(dec10_50.some(b => b[0] === '46,50'));
  });

  await t.test('expandOpenHeadcountRange supports + suffix and , suffix interchangeably', () => {
    const fromComma = expandOpenHeadcountRange('50,');
    const fromPlus = expandOpenHeadcountRange('50+');
    assert.deepEqual(fromComma, fromPlus);

    const entPlus = expandOpenHeadcountRange('10001+');
    assert.deepEqual(entPlus, [['10001']]);
  });

  await t.test('resolveExecutionBrackets decomposes multiple custom ranges into micro-brackets', () => {
    const plan = resolveExecutionBrackets({
      organization_num_employees_ranges: ['1,10', '50,']
    });
    // 1-10 is decomposed into 10 single integers
    assert.ok(plan.some(b => b[0] === '1,1'));
    assert.ok(plan.some(b => b[0] === '10,10'));
    // 50, is expanded and decomposed into micro ranges
    assert.ok(plan.some(b => b[0] === '50,50'));
    assert.ok(plan.some(b => b[0] === '51,60'));
    assert.ok(plan.some(b => b[0] === '10001'));
  });

  await t.test('generateAdaptiveMicroBrackets generates contiguous sub-brackets covering open range 5,', () => {
    const allMicroBrackets = generateAdaptiveMicroBrackets('5,');
    
    // Verify it contains atomic ranges
    assert.ok(allMicroBrackets.some(b => b[0] === '5,5'));
    assert.ok(allMicroBrackets.some(b => b[0] === '10,10'));
    assert.ok(allMicroBrackets.some(b => b[0] === '11,11'));
    assert.ok(allMicroBrackets.some(b => b[0] === '20,20'));
    assert.ok(allMicroBrackets.some(b => b[0] === '21,25'));
    assert.ok(allMicroBrackets.some(b => b[0] === '46,50'));
    assert.ok(allMicroBrackets.some(b => b[0] === '51,60'));
    assert.ok(allMicroBrackets.some(b => b[0] === '1001,2000'));
    assert.ok(allMicroBrackets.some(b => b[0] === '10001'));

    // Count of total micro-brackets should be at least 35
    assert.ok(allMicroBrackets.length >= 35, `Expected at least 35 micro-brackets, got ${allMicroBrackets.length}`);
  });

  await t.test('generateAdaptiveMicroBrackets accurately expands 50, with NO brackets under 50', () => {
    const brackets50 = generateAdaptiveMicroBrackets('50,');
    
    assert.ok(brackets50.some(b => b[0] === '50,50'), 'Should contain 50,50');
    assert.ok(brackets50.some(b => b[0] === '51,60'), 'Should contain 51,60');
    assert.ok(brackets50.some(b => b[0] === '10001'), 'Should contain 10001');

    // MUST NOT contain any brackets strictly under 50
    for (const b of brackets50) {
      const parts = b[0].split(',').map(Number);
      if (parts.length === 2) {
        assert.ok(parts[0] <= parts[1], `Bracket ${b[0]} has min > max!`);
        assert.ok(parts[1] >= 50, `Bracket ${b[0]} has max < 50!`);
      }
    }
  });

  await t.test('decomposes broad enterprise and upper-market brackets (501-1000, 1001-5000, 5001-10000)', () => {
    const dec501 = decomposeHighDensityBracket('501,1000');
    assert.deepEqual(dec501, [['501,750'], ['751,1000']]);

    const dec1001 = decomposeHighDensityBracket('1001,5000');
    assert.deepEqual(dec1001, [['1001,2000'], ['2001,3500'], ['3501,5000']]);

    const dec5001 = decomposeHighDensityBracket('5001,10000');
    assert.deepEqual(dec5001, [['5001,7500'], ['7501,10000']]);
  });

  await t.test('parseApolloUrlHash parses parameters with and without brackets and sort fields', () => {
    const url1 = 'https://app.apollo.io/#/people?personLocations=Ahmedabad%2C%20India&organizationNumEmployeesRanges=50%2C&sortByField=person_name&sortAscending=true';
    const res1 = parseApolloUrlHash(url1);
    assert.deepEqual(res1.person_locations, ['Ahmedabad, India']);
    assert.deepEqual(res1.organization_num_employees_ranges, ['50,']);
    assert.equal(res1.sort_by_field, 'person_name');
    assert.equal(res1.sort_ascending, true);

    const url2 = 'https://app.apollo.io/#/people?personLocations[]=San%20Francisco&personLocations[]=New%20York';
    const res2 = parseApolloUrlHash(url2);
    assert.deepEqual(res2.person_locations, ['San Francisco', 'New York']);
  });

  await t.test('buildChunkedUnionCSV escapes formula injection and normalizes newlines', () => {
    const items = [
      { id: '1', title: '=HYPERLINK("http://evil.com","Click")', company_name: 'Acme Corp\r\nInc' },
      { id: '2', title: '+cmd|/C calc', company_name: '-1234' }
    ];
    const chunks = buildChunkedUnionCSV(items, ['id', 'title', 'company_name']);
    const fullCSV = chunks.join('');
    // Both formulas must be prefixed with single quote
    assert.ok(fullCSV.includes("''=HYPERLINK") || fullCSV.includes("'=HYPERLINK"));
    assert.ok(fullCSV.includes("'+cmd") || fullCSV.includes("''+cmd"));
    // Newline inside company name should be converted to space
    assert.ok(fullCSV.includes('Acme Corp Inc'));
  });

  await t.test('calculateSmartCooldownDuration dynamically modulates pause duration', () => {
    // Fast server latency (<750ms) -> 12s to 25s
    const fastDur = calculateSmartCooldownDuration(400, false);
    assert.ok(fastDur >= 12 && fastDur <= 25, `Fast duration ${fastDur} out of range`);

    // Normal server latency (750ms - 1400ms) -> 25s to 40s
    const normalDur = calculateSmartCooldownDuration(1000, false);
    assert.ok(normalDur >= 25 && normalDur <= 40, `Normal duration ${normalDur} out of range`);

    // Pressured server latency (>=1400ms) -> 35s to 65s
    const pressuredDur = calculateSmartCooldownDuration(1800, false);
    assert.ok(pressuredDur >= 35 && pressuredDur <= 65, `Pressured duration ${pressuredDur} out of range`);

    // Explicit 429 rate limit signal -> 45s to 75s
    const rateLimitDur = calculateSmartCooldownDuration(400, true);
    assert.ok(rateLimitDur >= 45 && rateLimitDur <= 75, `Rate limit duration ${rateLimitDur} out of range`);
  });

  await t.test('shouldTriggerSmartCooldown balances request density and empty probe cabinets', () => {
    // 429 signal immediately triggers cooldown regardless of request count
    assert.equal(shouldTriggerSmartCooldown({ hasRateLimitSignal: true }), true);

    // Active extraction (>= 20 leads found in 10 requests) -> triggers at 10 requests
    assert.equal(shouldTriggerSmartCooldown({ requestsSinceLastCooldown: 9, leadsSinceLastCooldown: 50 }), false);
    assert.equal(shouldTriggerSmartCooldown({ requestsSinceLastCooldown: 10, leadsSinceLastCooldown: 50 }), true);

    // Empty cabinet probes (< 20 leads found in 10 requests) -> defers cooldown to 20 requests
    assert.equal(shouldTriggerSmartCooldown({ requestsSinceLastCooldown: 10, leadsSinceLastCooldown: 0 }), false);
    assert.equal(shouldTriggerSmartCooldown({ requestsSinceLastCooldown: 15, leadsSinceLastCooldown: 5 }), false);
    assert.equal(shouldTriggerSmartCooldown({ requestsSinceLastCooldown: 20, leadsSinceLastCooldown: 5 }), true);
  });
});
