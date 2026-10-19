import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartBatcher } from '../extension/slicer_core.js';

describe('SmartBatcher: Autonomous Adaptive Cabinet Sizer Engine', () => {
  it('correctly classifies empty cabinets to SKIP', () => {
    const batcher = new SmartBatcher({ maxLeadsPerCabinet: 245 });
    const decision = batcher.classifyBracket(0, 5, 10);
    assert.equal(decision.action, 'SKIP');
  });

  it('correctly classifies cabinets <= maxLimit to EXECUTE_BIDIRECTIONAL', () => {
    const batcher = new SmartBatcher({ maxLeadsPerCabinet: 245 });
    const decision = batcher.classifyBracket(194, 13, 14);
    assert.equal(decision.action, 'EXECUTE_BIDIRECTIONAL');
    assert.deepEqual(decision.bracket, ['13,14']);
    assert.equal(decision.total, 194);
    assert.equal(decision.pagesNeeded, 8); // 8 pages total (4 desc + 4 asc)
  });

  it('correctly classifies cabinets > maxLimit to BISECT when min < max', () => {
    const batcher = new SmartBatcher({ maxLeadsPerCabinet: 245 });
    const decision = batcher.classifyBracket(685, 5, 7);
    assert.equal(decision.action, 'BISECT');
    assert.deepEqual(decision.left, [5, 6]);
    assert.deepEqual(decision.right, [7, 7]);
  });

  it('pivots to secondary dimension when single integer bracket exceeds maxLimit', () => {
    const batcher = new SmartBatcher({ maxLeadsPerCabinet: 245 });
    const decision = batcher.classifyBracket(1200, 5, 5);
    assert.equal(decision.action, 'PIVOT_SECONDARY');
    assert.equal(decision.dimension, 'person_seniorities');
    assert.ok(decision.slices.length > 0);
    assert.deepEqual(decision.slices[0].bracket, ['5,5']);
    assert.deepEqual(decision.slices[0].seniority, ['founder']);
  });

  it('coalesces adjacent sparse ranges into optimal consolidated cabinets', () => {
    const batcher = new SmartBatcher({ maxLeadsPerCabinet: 245 });
    const knownDensityMap = [
      { min: 11, max: 11, total: 80 },
      { min: 12, max: 12, total: 70 },
      { min: 13, max: 13, total: 50 }, // 80 + 70 + 50 = 200 (<= 245)
      { min: 14, max: 14, total: 90 }, // 200 + 90 = 290 (> 245, should start new group)
      { min: 15, max: 15, total: 110 }
    ];

    const coalesced = batcher.coalesceRanges(knownDensityMap);
    assert.equal(coalesced.length, 2);
    assert.deepEqual(coalesced[0].bracket, ['11,13']);
    assert.equal(coalesced[0].total, 200);
    assert.deepEqual(coalesced[1].bracket, ['14,15']);
    assert.equal(coalesced[1].total, 200);
  });

  it('resolves optimal plan dynamically using simulated density probe function', async () => {
    // Simulated density map:
    // 5-10: 1152 leads (too big)
    // 5-7: 685 (too big), 8-10: 467 (too big)
    // 5,5: 252 (too big -> pivots to seniority), 6,6: 234 (fits), 7,7: 199 (fits)
    // 8,8: 175 (fits), 9,9: 154 (fits), 10,10: 138 (fits)
    const mockDensity = {
      '5,10': 1152,
      '5,7': 685,
      '8,10': 467,
      '5,6': 486,
      '7,7': 199,
      '5,5': 252,
      '6,6': 234,
      '8,9': 329,
      '10,10': 138,
      '8,8': 175,
      '9,9': 154
    };

    const probeFn = async (rangeStr) => mockDensity[rangeStr] || 0;
    const batcher = new SmartBatcher({ maxLeadsPerCabinet: 245, probeFn });

    const plan = await batcher.resolveOptimalPlan([[5, 10]]);

    // Every resolved cabinet must either fit in <= 245 or pivot to secondary dimensions
    for (const item of plan) {
      if (item.action === 'EXECUTE_BIDIRECTIONAL') {
        assert.ok(item.total <= 245, `Bracket ${item.bracket[0]} exceeded limit with ${item.total}`);
      } else if (item.action === 'PIVOT_SECONDARY') {
        assert.equal(item.bracket[0], '5,5');
      }
    }

    assert.ok(plan.length >= 6);
  });
});
