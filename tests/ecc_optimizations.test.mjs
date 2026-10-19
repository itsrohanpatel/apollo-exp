import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLeadICPScore,
  PersistentOrgCache,
  AdaptivePacer,
  buildChunkedUnionCSV,
  PREFERRED_PERSON_COLUMNS
} from '../extension/slicer_core.js';

test('ECC Lead Intelligence: Autonomous ICP Signal Scorer', async (t) => {
  await t.test('assigns high score (Tier 1) to C-suite/founder at funded company with verified email', () => {
    const lead = {
      title: 'Chief Executive Officer',
      seniority: 'c_suite',
      email: 'alex@scaleup.io',
      email_status: 'verified',
      phone: '+1 415-555-0199',
      linkedin_url: 'https://linkedin.com/in/alex-ceo',
      company_employees: 150,
      company_funding: '15.0M',
      company_revenue: '10.0M',
      company_technologies: 'AWS; Snowflake; React; PostgreSQL; HubSpot'
    };

    const scored = computeLeadICPScore(lead);

    assert.ok(typeof scored.icp_score === 'number');
    assert.ok(scored.icp_score >= 70, `Expected score >= 70, got ${scored.icp_score}`);
    assert.equal(scored.icp_tier, 'Tier 1 (High Priority)');
    assert.ok(scored.icp_reasons.includes('C-Suite'));
    assert.ok(scored.icp_reasons.includes('Verified Email'));
    assert.ok(scored.icp_reasons.includes('Scale'));
    assert.ok(scored.icp_reasons.includes('Funding'));
  });

  await t.test('assigns mid-range score (Tier 2) to Director/Manager with reachability at SME', () => {
    const lead = {
      title: 'Engineering Director',
      seniority: 'director',
      email: 'sarah@midcorp.com',
      email_status: 'verified',
      linkedin_url: 'https://linkedin.com/in/sarah-dir',
      company_employees: 80,
      company_funding: '',
      company_revenue: '',
      company_technologies: 'Git; Linux'
    };

    const scored = computeLeadICPScore(lead);

    assert.ok(scored.icp_score >= 45 && scored.icp_score < 70, `Expected 45 <= score < 70, got ${scored.icp_score}`);
    assert.equal(scored.icp_tier, 'Tier 2 (Qualified)');
    assert.ok(scored.icp_reasons.includes('Director'));
  });

  await t.test('assigns low score (Tier 3) to unrevealed intern / unknown profile', () => {
    const lead = {
      title: 'Marketing Intern',
      seniority: 'intern',
      email: '',
      email_status: 'unrevealed',
      phone: '',
      linkedin_url: '',
      company_employees: 5,
      company_funding: '',
      company_revenue: '',
      company_technologies: ''
    };

    const scored = computeLeadICPScore(lead);

    assert.ok(scored.icp_score < 45, `Expected score < 45, got ${scored.icp_score}`);
    assert.equal(scored.icp_tier, 'Tier 3 (Standard)');
  });

  await t.test('immutable and preserves all original lead attributes', () => {
    const original = { id: 'lead_1', title: 'VP Sales', existing_custom_attr: 'keep_me' };
    const scored = computeLeadICPScore(original);

    assert.equal(scored.existing_custom_attr, 'keep_me');
    assert.equal(scored.id, 'lead_1');
    assert.ok(scored.icp_score !== undefined);
    assert.notEqual(original, scored, 'Should return a new object (immutability)');
  });
});

test('ECC Content-Hash Cache Pattern: PersistentOrgCache', async (t) => {
  await t.test('synchronous L1 cache hit with L2 async storage backing', async () => {
    const storageStore = {};
    const mockStorage = {
      get: (keys, cb) => {
        const res = {};
        keys.forEach(k => { res[k] = storageStore[k]; });
        cb(res);
      },
      set: (items, cb) => {
        Object.assign(storageStore, items);
        if (cb) cb();
      }
    };

    const cache = new PersistentOrgCache({ storage: mockStorage, maxCapacity: 100 });
    await cache.init();

    // Cache miss
    assert.equal(cache.get('org_123'), null);

    // Set item
    const orgData = { id: 'org_123', name: 'Stripe', primary_domain: 'stripe.com', technologies: 'Ruby; AWS' };
    cache.set('org_123', orgData);

    // Instant L1 hit
    assert.deepEqual(cache.get('org_123'), orgData);
    assert.deepEqual(cache.getByDomain('stripe.com'), orgData);

    // Persisted to L2 storage
    await cache.flush();
    assert.ok(storageStore['apollo_cached_orgs_v1']);
    assert.ok(storageStore['apollo_cached_orgs_v1']['org_123']);

    // Rehydrate fresh instance from L2 storage
    const cache2 = new PersistentOrgCache({ storage: mockStorage, maxCapacity: 100 });
    await cache2.init();
    assert.deepEqual(cache2.get('org_123'), orgData);
  });

  await t.test('evicts oldest entries when capacity exceeds maxCapacity', () => {
    const cache = new PersistentOrgCache({ maxCapacity: 3 });
    cache.set('o1', { id: 'o1', name: 'Org 1' });
    cache.set('o2', { id: 'o2', name: 'Org 2' });
    cache.set('o3', { id: 'o3', name: 'Org 3' });
    assert.equal(cache.size(), 3);

    // Adding 4th triggers eviction of o1
    cache.set('o4', { id: 'o4', name: 'Org 4' });
    assert.equal(cache.size(), 3);
    assert.equal(cache.get('o1'), null, 'Oldest entry o1 should have been evicted');
    assert.ok(cache.get('o4') !== null);
  });
});

test('ECC Latency-Critical Systems: AdaptivePacer', async (t) => {
  await t.test('modulates jitter delay based on observed response latency', () => {
    const pacer = new AdaptivePacer({ baseMin: 2000, baseMax: 3000 });

    // Under normal server latency (< 800ms)
    pacer.recordRoundTrip(350);
    pacer.recordRoundTrip(400);
    const fastDelay = pacer.computeNextDelay();
    assert.ok(fastDelay >= 2000 && fastDelay <= 3500, `Expected normal delay, got ${fastDelay}`);

    // Under high server pressure (>= 1500ms)
    pacer.recordRoundTrip(2200);
    pacer.recordRoundTrip(2500);
    pacer.recordRoundTrip(2100);
    pacer.recordRoundTrip(2400);
    const pressureDelay = pacer.computeNextDelay();
    assert.ok(pressureDelay >= 3600 && pressureDelay <= 6500, `Expected backed-off delay, got ${pressureDelay}`);
    assert.equal(pacer.isServerPressured(), true);
  });
});

test('ECC Data Throughput Accelerator: Chunked Memory-Streaming CSV Exporter', async (t) => {
  await t.test('produces identical CSV headers and escaped content to standard union CSV', () => {
    const items = [
      { id: '1', full_name: 'Alice Smith', email: 'alice@a.com', company_name: 'Alpha, Inc.', icp_score: 85 },
      { id: '2', full_name: 'Bob "The Builder"', email: 'bob@b.com', company_name: 'Beta LLC', icp_score: 40 },
      { id: '3', full_name: 'Charlie', email: '', company_name: 'Gamma Corp', sparse_field: 'present' }
    ];

    const chunks = buildChunkedUnionCSV(items, ['id', 'full_name', 'email', 'company_name', 'icp_score'], 2);
    assert.ok(Array.isArray(chunks), 'Should return an array of string chunks for composite Blob');
    assert.ok(chunks.length >= 2, 'Should divide 3 items into multiple chunks with chunkSize=2');

    const fullOutput = chunks.join('');
    assert.ok(fullOutput.startsWith('\uFEFF'), 'Includes UTF-8 BOM');
    assert.ok(fullOutput.includes('id,full_name,email,company_name,icp_score,sparse_field'));
    assert.ok(fullOutput.includes('"Alpha, Inc."'));
    assert.ok(fullOutput.includes('"Bob ""The Builder"""'));
    assert.ok(fullOutput.includes('present'));
  });
});
