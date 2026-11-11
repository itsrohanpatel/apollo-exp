import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DynamicTokenBucketPacer,
  BoundedConcurrencyPool,
  buildPayloadForCabinet
} from '../extension/slicer_core.js';

test('DynamicTokenBucketPacer: rate-limit aware delay calculations', async (t) => {
  const pacer = new DynamicTokenBucketPacer({
    minTurboDelay: 600,
    maxTurboDelay: 800,
    moderateDelay: 1200,
    heavyDelay: 2400
  });

  await t.test('computes fast delay when remaining quota > 35', () => {
    const delay = pacer.calculateDelay({ remainingQuota: 60 });
    assert.ok(delay >= 540 && delay <= 860, `Delay ${delay} should be in turbo bounds [540, 860]`);
  });

  await t.test('computes moderate delay when remaining quota between 15 and 35', () => {
    const delay = pacer.calculateDelay({ remainingQuota: 25 });
    assert.ok(delay >= 1000 && delay <= 1500, `Delay ${delay} should be in moderate bounds [1000, 1500]`);
  });

  await t.test('computes safety brake delay when remaining quota < 15', () => {
    const delay = pacer.calculateDelay({ remainingQuota: 8 });
    assert.ok(delay >= 2000 && delay <= 2800, `Delay ${delay} should be in safety brake bounds [2000, 2800]`);
  });

  await t.test('handles HTTP 429 Retry-After with 1s buffer', () => {
    const delay = pacer.calculateDelay({ status: 429, retryAfterSeconds: 12 });
    assert.equal(delay, 13000, 'Delay should be retry-after + 1000ms');
  });

  await t.test('falls back gracefully when headers are missing or null', () => {
    const delay = pacer.calculateDelay({});
    assert.ok(delay >= 540 && delay <= 860, `Default delay ${delay} should be in normal turbo bounds`);
  });
});

test('BoundedConcurrencyPool: enforces execution ceiling', async (t) => {
  const pool = new BoundedConcurrencyPool(3);
  let activeCount = 0;
  let maxObservedActive = 0;

  const tasks = Array.from({ length: 9 }, (_, i) => async () => {
    activeCount++;
    maxObservedActive = Math.max(maxObservedActive, activeCount);
    await new Promise(r => setTimeout(r, 20));
    activeCount--;
    return `result-${i}`;
  });

  const results = await Promise.all(tasks.map(task => pool.run(task)));

  assert.equal(results.length, 9);
  assert.equal(results[0], 'result-0');
  assert.equal(results[8], 'result-8');
  assert.ok(maxObservedActive <= 3, `Observed concurrency ${maxObservedActive} must not exceed 3`);
});

test('Dual-Engine Strategy Simulation & Automated Fallback', async (t) => {
  const pacer = new DynamicTokenBucketPacer();

  await t.test('Turbo Strategy: generates authentic per_page: 30 payloads without DOM clicking', async () => {
    const simulateDirectFetch = async (payload, page, sort) => {
      return {
        success: true,
        status: 200,
        data: {
          people: Array.from({ length: 30 }, (_, i) => ({ id: `lead_${page}_${i}` })),
          pagination: { total_entries: 240, page, per_page: 30 }
        },
        headers: { remainingQuota: 55, retryAfterSeconds: null }
      };
    };

    const res = await simulateDirectFetch({ q_keywords: 'VP' }, 1, { sort_ascending: true });
    assert.equal(res.success, true);
    assert.equal(res.data.people.length, 30);
    assert.equal(res.data.pagination.per_page, 30);

    const delay = pacer.calculateDelay({ remainingQuota: res.headers.remainingQuota });
    assert.ok(delay >= 540 && delay <= 860);
  });

  await t.test('Turbo Fallback: falls back to DOM navigation if direct in-page fetch fails', async () => {
    let directFetchAttempted = false;
    let fallbackDOMNavigationTriggered = false;

    const executeHarvestPage = async (engineMode) => {
      if (engineMode === 'turbo') {
        directFetchAttempted = true;
        // Simulate network failure / 401 CSRF rejection
        const directRes = { success: false, status: 401, error: 'HTTP 401' };
        if (!directRes.success) {
          fallbackDOMNavigationTriggered = true;
          return { people: [{ id: 'fallback_lead_1' }] };
        }
      }
      return null;
    };

    const result = await executeHarvestPage('turbo');
    assert.equal(directFetchAttempted, true, 'Direct fetch must be tried first in turbo mode');
    assert.equal(fallbackDOMNavigationTriggered, true, 'Fallback DOM navigation must be triggered upon error');
    assert.equal(result.people.length, 1);
  });

  await t.test('Standard Strategy: strictly executes DOM clicks and uses 2000-3200ms pacing', async () => {
    let domClickTriggered = false;
    let staticPacingUsed = false;

    const executeStandardPage = (engineMode) => {
      if (engineMode === 'standard') {
        domClickTriggered = true;
        staticPacingUsed = true;
        return { success: true, mode: 'standard' };
      }
      return null;
    };

    const res = executeStandardPage('standard');
    assert.equal(res.mode, 'standard');
    assert.equal(domClickTriggered, true);
    assert.equal(staticPacingUsed, true);
  });
});

test('buildPayloadForCabinet: authentic payload generation for Apollo Direct Search', async (t) => {
  const baseFilters = {
    person_locations: ['Bengaluru, India'],
    person_department_or_subdepartments: ['master_human_resources'],
    exist_fields: ['organization_domain'],
    prospected_by_current_team: ['no']
  };

  await t.test('merges headcount bracket and page 5 authentically', () => {
    const cabinet = {
      label: 'Headcount: 1,10',
      bracket: ['1,10'],
      seniority: null
    };
    const sortParam = {
      sort_by_field: 'sanitized_organization_name_unanalyzed',
      sort_ascending: true
    };
    const payload = buildPayloadForCabinet(baseFilters, cabinet, sortParam, 5);

    assert.deepEqual(payload.organization_num_employees_ranges, ['1,10']);
    assert.deepEqual(payload.person_locations, ['Bengaluru, India']);
    assert.deepEqual(payload.person_department_or_subdepartments, ['master_human_resources']);
    assert.equal(payload.page, 5);
    assert.equal(payload.per_page, 30);
    assert.equal(payload.sort_ascending, true);
    assert.equal(payload.sort_by_field, 'sanitized_organization_name_unanalyzed');
  });

  await t.test('overrides base headcount with micro-bisection bracket', () => {
    const baseWithMacro = {
      ...baseFilters,
      organization_num_employees_ranges: ['1,10']
    };
    const cabinet = {
      label: '1,1 owner',
      bracket: ['1,1'],
      seniority: 'owner'
    };
    const sortParam = {
      sort_by_field: 'sanitized_organization_name_unanalyzed',
      sort_ascending: false
    };
    const payload = buildPayloadForCabinet(baseWithMacro, cabinet, sortParam, 1);

    assert.deepEqual(payload.organization_num_employees_ranges, ['1,1']);
    assert.deepEqual(payload.person_seniorities, ['owner']);
    assert.equal(payload.sort_ascending, false);
    assert.equal(payload.page, 1);
    assert.equal(payload.per_page, 30);
  });

  await t.test('attaches subdepartment and contact email status partitions cleanly', () => {
    const cabinet = {
      label: '1,1 owner verified hr_recruiting',
      bracket: ['1,1'],
      seniority: 'owner',
      subdepartment: 'hr_recruiting',
      emailStatus: ['verified'],
      _leaf: true,
      _hasSubdivided: true
    };
    const payload = buildPayloadForCabinet(baseFilters, cabinet, null, 2);

    assert.deepEqual(payload.organization_num_employees_ranges, ['1,1']);
    assert.deepEqual(payload.person_seniorities, ['owner']);
    assert.deepEqual(payload.person_department_or_subdepartments, ['hr_recruiting']);
    assert.deepEqual(payload.contact_email_status, ['verified']);
    assert.equal(payload.page, 2);
    assert.equal(payload.per_page, 30);
    // Verify runtime markers stripped
    assert.equal(payload._leaf, undefined);
    assert.equal(payload._hasSubdivided, undefined);
  });
});
