import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateUniversalHeadcountSlices,
  DeduplicationStore,
  generateBidirectionalSortPlans,
  shouldSubdivideBracket
} from '../extension/slicer_core.js';

describe('Defect Resolution: 125-Lead Ceiling & Bidirectional Micro-Slicing', () => {
  test('shouldSubdivideBracket identifies when bracket has >250 leads requiring micro-splitting', () => {
    assert.equal(shouldSubdivideBracket(1150), true, '1,150 leads in 5-10 bracket must be subdivided');
    assert.equal(shouldSubdivideBracket(1055), true, '1,055 leads in 21-50 bracket must be subdivided');
    assert.equal(shouldSubdivideBracket(80), false, '80 leads in 10001+ fits within a single 5-page pass');
    assert.equal(shouldSubdivideBracket(200), false, '200 leads fits within bidirectional 250-lead window');
  });

  test('generateBidirectionalSortPlans creates descending and ascending passes when totalEntries > 125', () => {
    // Under 125 leads: only 1 pass needed (descending)
    const singlePass = generateBidirectionalSortPlans(100);
    assert.equal(singlePass.length, 1);
    assert.equal(singlePass[0].sort_ascending, false);

    // Over 125 leads: bidirectional sweep needed (descending top 125 + ascending bottom 125)
    const biPass = generateBidirectionalSortPlans(240);
    assert.equal(biPass.length, 2);
    assert.equal(biPass[0].sort_ascending, false, 'First pass is descending');
    assert.equal(biPass[1].sort_ascending, true, 'Second pass is ascending');
  });

  test('Bidirectional passes deduplicate correctly in DeduplicationStore', () => {
    const store = new DeduplicationStore();

    // Simulated Descending Pass (Top 25)
    for (let i = 1; i <= 25; i++) {
      store.add({ id: `lead_${i}`, name: `Person ${i}` });
    }
    assert.equal(store.size(), 25);

    // Simulated Ascending Pass (Bottom 25 from opposite end of 40-lead database)
    // Overlap on middle leads 16-25, new leads 26-40
    for (let i = 16; i <= 40; i++) {
      store.add({ id: `lead_${i}`, name: `Person ${i}` });
    }

    assert.equal(store.size(), 40, 'Store must seamlessly combine bidirectional pools with zero duplicates');
  });
});
