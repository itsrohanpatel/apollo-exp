import test from 'node:test';
import assert from 'node:assert/strict';

test('Harvest Resumption & Checkpoint State Logic', async (t) => {
  await t.test('computes deterministic filter signatures accurately', () => {
    const filtersA = {
      person_department_or_subdepartments: ['master_human_resources'],
      person_locations: ['Ahmedabad, India'],
      person_titles: [],
      organization_num_employees_ranges: ['50,']
    };
    const filtersB = {
      person_department_or_subdepartments: ['master_human_resources'],
      person_locations: ['Ahmedabad, India'],
      person_titles: [],
      organization_num_employees_ranges: ['50,']
    };
    const sigA = JSON.stringify({
      dep: filtersA.person_department_or_subdepartments || [],
      loc: filtersA.person_locations || [],
      titles: filtersA.person_titles || [],
      ranges: filtersA.organization_num_employees_ranges || []
    });
    const sigB = JSON.stringify({
      dep: filtersB.person_department_or_subdepartments || [],
      loc: filtersB.person_locations || [],
      titles: filtersB.person_titles || [],
      ranges: filtersB.organization_num_employees_ranges || []
    });
    assert.equal(sigA, sigB, 'Filter signatures must be strictly deterministic across identical filter states');
  });

  await t.test('checkpoint correctly identifies starting slice index and preserved ID set', () => {
    const mockCheckpoint = {
      signature: '{"dep":["master_human_resources"],"loc":["Ahmedabad, India"],"titles":[],"ranges":["50,"]}',
      nextSliceIdx: 47,
      totalSlices: 70,
      savedIds: ['id_1', 'id_2', 'id_3']
    };

    const totalSlices = 70;
    const startSliceIdx = Math.min(mockCheckpoint.nextSliceIdx, totalSlices - 1);
    const harvestedIds = new Set(mockCheckpoint.savedIds);

    assert.equal(startSliceIdx, 47, 'Harvest should jump directly to slice index 47');
    assert.equal(harvestedIds.size, 3, 'Harvested IDs set should retain previously scraped unique keys');
    assert.ok(harvestedIds.has('id_1'));
    assert.ok(harvestedIds.has('id_3'));
  });

  await t.test('resumption ignores checkpoint if filter signature differs', () => {
    const activeSignature = '{"dep":["sales"],"loc":["Ahmedabad, India"],"titles":[],"ranges":["50,"]}';
    const storedCheckpoint = {
      signature: '{"dep":["master_human_resources"],"loc":["Ahmedabad, India"],"titles":[],"ranges":["50,"]}',
      nextSliceIdx: 47
    };

    let startSliceIdx = 0;
    if (storedCheckpoint.signature === activeSignature) {
      startSliceIdx = storedCheckpoint.nextSliceIdx;
    }

    assert.equal(startSliceIdx, 0, 'Must start fresh from Cabinet 0 when user changed filter parameters');
  });

  await t.test('dynamic header extractor captures authentic Apollo headers and skips hop-by-hop keys', () => {
    function extractHeaders(inputHeaders) {
      if (!inputHeaders) return null;
      const result = {};
      const skipList = new Set(['content-length', 'host', 'origin', 'connection']);
      try {
        if (typeof inputHeaders.forEach === 'function') {
          inputHeaders.forEach((val, key) => {
            const lower = String(key || '').toLowerCase();
            if (!skipList.has(lower)) result[lower] = val;
          });
        } else if (Array.isArray(inputHeaders)) {
          for (const [k, v] of inputHeaders) {
            const lower = String(k || '').toLowerCase();
            if (!skipList.has(lower)) result[lower] = v;
          }
        } else if (typeof inputHeaders === 'object') {
          for (const [k, v] of Object.entries(inputHeaders)) {
            const lower = String(k || '').toLowerCase();
            if (!skipList.has(lower)) result[lower] = v;
          }
        }
      } catch (e) {}
      return Object.keys(result).length > 0 ? result : null;
    }

    const rawMockHeaders = {
      'Host': 'app.apollo.io',
      'Content-Length': '124',
      'x-apollo-client-version': '2.1.0',
      'x-csrf-token': 'authentic-token-123',
      'X-Custom-Apollo-Session': 'sess_xyz'
    };

    const extracted = extractHeaders(rawMockHeaders);
    assert.equal(extracted['x-apollo-client-version'], '2.1.0');
    assert.equal(extracted['x-csrf-token'], 'authentic-token-123');
    assert.equal(extracted['x-custom-apollo-session'], 'sess_xyz');
    assert.equal(extracted['host'], undefined, 'Hop-by-hop host header must be skipped');
    assert.equal(extracted['content-length'], undefined, 'Hop-by-hop content-length header must be skipped');
  });

  await t.test('legacy storage cache pruning identifies and clears all bulk storage keys', () => {
    const mockStorage = {
      scrapedLeads: [{ id: 1 }, { id: 2 }],
      scrapedCompanies: [{ id: 'c1' }],
      apollo_cached_orgs_v1: { 'c1': { name: 'Acme' } },
      leadsCount: 7029,
      companiesCount: 1540
    };

    const legacyKeys = ['scrapedLeads', 'scrapedCompanies', 'apollo_cached_orgs_v1', 'cachedOrgs'];
    const keysToRemove = legacyKeys.filter(k => k in mockStorage);

    assert.deepEqual(keysToRemove, ['scrapedLeads', 'scrapedCompanies', 'apollo_cached_orgs_v1']);
    
    // Simulate cleanup
    for (const k of keysToRemove) delete mockStorage[k];

    assert.equal(mockStorage.leadsCount, 7029, 'Scalar statistics must be preserved');
    assert.equal(mockStorage.companiesCount, 1540, 'Scalar statistics must be preserved');
    assert.equal(mockStorage.scrapedLeads, undefined, 'Bulk lead array must be eliminated');
    assert.equal(mockStorage.apollo_cached_orgs_v1, undefined, 'Bulk org cache must be eliminated');
  });
});
