import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAdaptiveMicroBrackets,
  isHighDensityBracket,
  decomposeHighDensityBracket
} from '../extension/slicer_core.js';

test('Adaptive Micro-Slicing & 100% Pool Coverage Engine', async (t) => {

  await t.test('isHighDensityBracket correctly flags broad employee ranges', () => {
    assert.equal(isHighDensityBracket(['5,10']), true);
    assert.equal(isHighDensityBracket(['11,20']), true);
    assert.equal(isHighDensityBracket(['21,50']), true);
    assert.equal(isHighDensityBracket(['51,100']), true);
    assert.equal(isHighDensityBracket(['5,5']), false);
    assert.equal(isHighDensityBracket(['11,11']), false);
    assert.equal(isHighDensityBracket(['501,1000']), false);
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
    assert.ok(allMicroBrackets.some(b => b[0] === '1001,5000'));
    assert.ok(allMicroBrackets.some(b => b[0] === '10001'));

    // Count of total micro-brackets should be around 35 (6 + 10 + 6 + 5 + 2 + 2 + 1 + 1 + 1 + 1)
    assert.ok(allMicroBrackets.length >= 30, `Expected at least 30 micro-brackets, got ${allMicroBrackets.length}`);
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

});
