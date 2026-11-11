import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DynamicBisectionTree, coalesceSparseRanges } from '../extension/slicer_core.js';

describe('DynamicBisectionTree: Pre-Flight Adaptive Slicer & Zero-Redundancy Partitioner', () => {
  it('probes and classifies cabinet <= 245 as direct bidirectional execution', async () => {
    const mockProbe = async (rangeStr) => {
      if (rangeStr === '50,100') return 180;
      return 0;
    };

    const tree = new DynamicBisectionTree({
      maxLeadsPerCabinet: 245,
      probeFn: mockProbe
    });

    const plan = await tree.buildExecutionPlan([[50, 100]]);
    assert.equal(plan.length, 1);
    assert.equal(plan[0].type, 'HEADCOUNT');
    assert.deepEqual(plan[0].bracket, ['50,100']);
    assert.equal(plan[0].total, 180);
    assert.equal(plan[0].action, 'EXECUTE_BIDIRECTIONAL');
    assert.equal(plan[0].skipBroadSweep, false);
  });

  it('skips empty cabinets (total === 0) with zero wasted requests', async () => {
    const mockProbe = async () => 0;
    const tree = new DynamicBisectionTree({
      maxLeadsPerCabinet: 245,
      probeFn: mockProbe
    });

    const plan = await tree.buildExecutionPlan([[1, 10]]);
    assert.equal(plan.length, 0);
  });

  it('bisects dense range > 245 into smaller sub-ranges recursively until <= 245', async () => {
    // Range 10-20 has 600 leads
    // 10-15 has 320 leads -> 10-12 has 150 (<= 245), 13-15 has 170 (<= 245)
    // 16-20 has 280 leads -> 16-18 has 140 (<= 245), 19-20 has 140 (<= 245)
    const mockDensity = {
      '10,20': 600,
      '10,15': 320,
      '16,20': 280,
      '10,12': 150,
      '13,15': 170,
      '16,18': 140,
      '19,20': 140
    };

    const tree = new DynamicBisectionTree({
      maxLeadsPerCabinet: 245,
      probeFn: async (rangeStr) => mockDensity[rangeStr] || 0
    });

    const plan = await tree.buildExecutionPlan([[10, 20]]);
    assert.equal(plan.length, 4);
    assert.deepEqual(plan.map(p => p.bracket[0]), ['10,12', '13,15', '16,18', '19,20']);
    for (const item of plan) {
      assert.ok(item.total <= 245);
      assert.equal(item.action, 'EXECUTE_BIDIRECTIONAL');
    }
  });

  it('CRITICAL ZERO-REDUNDANCY: skips broad sweep entirely when single integer exceeds 245 leads and generates disjoint seniority partitions', async () => {
    // Single integer headcount 50,50 has 1,200 leads
    const mockDensity = {
      '50,50': 1200
    };

    const seniorities = ['founder', 'c_suite', 'vp', 'director', 'manager', 'senior', 'entry'];
    const tree = new DynamicBisectionTree({
      maxLeadsPerCabinet: 245,
      seniorities,
      probeFn: async (rangeStr) => mockDensity[rangeStr] || 0
    });

    const plan = await tree.buildExecutionPlan([[50, 50]]);

    // Must NEVER run a broad sweep of 250 leads for a cabinet > 245!
    assert.ok(plan.length === seniorities.length);
    for (const slice of plan) {
      assert.equal(slice.type, 'SENIORITY');
      assert.deepEqual(slice.bracket, ['50,50']);
      assert.ok(seniorities.includes(slice.seniority[0]));
      assert.equal(slice.skipBroadSweep, true, 'Dense cabinet must set skipBroadSweep: true to prevent duplicate scraping');
      assert.equal(slice.action, 'EXECUTE_SENIORITY');
    }
  });

  it('caches probe results in memory to eliminate duplicate network calls', async () => {
    let callCount = 0;
    const mockProbe = async (rangeStr) => {
      callCount++;
      return 150;
    };

    const tree = new DynamicBisectionTree({
      maxLeadsPerCabinet: 245,
      probeFn: mockProbe
    });

    const total1 = await tree.probe(20, 30);
    const total2 = await tree.probe(20, 30);

    assert.equal(total1, 150);
    assert.equal(total2, 150);
    assert.equal(callCount, 1, 'Probe cache should prevent duplicate probe calls');
  });

  it('respects maxDepth safety guard to prevent infinite recursion on degenerate inputs', async () => {
    // Degenerate case where range won't reduce count
    const tree = new DynamicBisectionTree({
      maxLeadsPerCabinet: 245,
      maxDepth: 3,
      probeFn: async () => 1000 // always returns 1000
    });

    // Should not throw or hang
    const plan = await tree.buildExecutionPlan([[1, 100]]);
    assert.ok(plan.length > 0);
  });
});

describe('coalesceSparseRanges: Optimal Bin-Packing of Adjacent Sparse Brackets', () => {
  it('coalesces adjacent contiguous micro-ranges into consolidated <= 245 cabinets', () => {
    const input = [
      { min: 501, max: 550, total: 40 },
      { min: 551, max: 600, total: 60 },
      { min: 601, max: 700, total: 80 }, // 40 + 60 + 80 = 180 (<= 245)
      { min: 701, max: 800, total: 100 }  // 180 + 100 = 280 (> 245, should start new group)
    ];

    const coalesced = coalesceSparseRanges(input, 245);
    assert.equal(coalesced.length, 2);
    assert.deepEqual(coalesced[0].bracket, ['501,700']);
    assert.equal(coalesced[0].total, 180);
    assert.deepEqual(coalesced[1].bracket, ['701,800']);
    assert.equal(coalesced[1].total, 100);
  });

  it('does not coalesce non-contiguous ranges', () => {
    const input = [
      { min: 10, max: 20, total: 50 },
      { min: 50, max: 60, total: 50 } // Gap between 20 and 50
    ];

    const coalesced = coalesceSparseRanges(input, 245);
    assert.equal(coalesced.length, 2);
    assert.deepEqual(coalesced[0].bracket, ['10,20']);
    assert.deepEqual(coalesced[1].bracket, ['50,60']);
  });
});
