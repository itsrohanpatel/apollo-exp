import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProbePacingDelay,
  validateSessionHealth,
  mergeSnippetEnrichment,
  resolveAdaptiveExecutionTree
} from '../extension/slicer_core.js';

describe('Stealth Pacing & Humanized Dwell Engine', () => {
  it('calculateProbePacingDelay generates safe normal probe delays within bounds', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateProbePacingDelay({ isZeroResult: false, minDelay: 1200, maxDelay: 2400 });
      assert.ok(delay >= 1200, `Delay ${delay} below min 1200`);
      assert.ok(delay <= 2400, `Delay ${delay} above max 2400`);
    }
  });

  it('calculateProbePacingDelay generates humanized dwell delay for zero-result probes', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateProbePacingDelay({ isZeroResult: true, zeroMinDelay: 900, zeroMaxDelay: 1800 });
      assert.ok(delay >= 900, `Delay ${delay} below zero min 900`);
      assert.ok(delay <= 1800, `Delay ${delay} above zero max 1800`);
    }
  });

  it('validateSessionHealth accurately assesses cookie clearance and CSRF presence', () => {
    const validCookie = 'remember_token=abc; X-CSRF-TOKEN=xyz123; cf_clearance=cf998877; _apollo_session=sess1';
    const health1 = validateSessionHealth(validCookie);
    assert.equal(health1.isHealthy, true);
    assert.equal(health1.hasCsrf, true);
    assert.equal(health1.hasClearance, true);
    assert.equal(health1.status, 'READY');

    const missingClearance = 'remember_token=abc; X-CSRF-TOKEN=xyz123; _apollo_session=sess1';
    const health2 = validateSessionHealth(missingClearance);
    assert.equal(health2.isHealthy, false);
    assert.equal(health2.hasClearance, false);
    assert.equal(health2.status, 'CLEARANCE_REQUIRED');

    const missingCsrf = 'remember_token=abc; cf_clearance=cf998877; _apollo_session=sess1';
    const health3 = validateSessionHealth(missingCsrf);
    assert.equal(health3.isHealthy, false);
    assert.equal(health3.hasCsrf, false);
    assert.equal(health3.status, 'CSRF_MISSING');
  });

  it('mergeSnippetEnrichment merges zero-credit organization snippets into contact records', () => {
    const contacts = [
      { id: 'c1', name: 'Alice Smith', organization_id: 'org1', organization: { name: 'Acme Corp' } },
      { id: 'c2', name: 'Bob Jones', organization_id: 'org2', organization: { name: 'Beta Ltd' } },
      { id: 'c3', name: 'Carol White', organization_id: null, organization: null }
    ];

    const snippetMap = {
      org1: {
        short_description: 'Leading provider of cloud widgets.',
        phone: '+1 555-0100',
        industry: 'Software',
        keywords: ['cloud', 'widgets', 'saas'],
        annual_revenue_printed: '$10M'
      }
    };

    const enriched = mergeSnippetEnrichment(contacts, snippetMap);
    assert.equal(enriched.length, 3);
    assert.equal(enriched[0].organization.short_description, 'Leading provider of cloud widgets.');
    assert.equal(enriched[0].organization.corporate_phone, '+1 555-0100');
    assert.deepEqual(enriched[0].organization.keywords, ['cloud', 'widgets', 'saas']);
    assert.equal(enriched[0].organization.annual_revenue_printed, '$10M');

    // org2 has no snippet, keeps original
    assert.equal(enriched[1].organization.name, 'Beta Ltd');
    assert.equal(enriched[1].organization.short_description, undefined);

    // immutability check
    assert.notEqual(enriched[0], contacts[0]);
  });

  it('resolveAdaptiveExecutionTree applies probe pacing and zero-result dwell pacing', async () => {
    const delays = [];
    const sleepFn = async (ms) => {
      delays.push(ms);
    };

    const progressEvents = [];
    const onProbeProgress = (evt) => {
      progressEvents.push(evt);
    };

    const density = {
      '1,10': 0,    // 0 results -> triggers ZERO_RESULT_DWELL
      '11,20': 150  // <= 250 -> 1 unit
    };

    const mockProbe = async (filters) => {
      const b = filters.organization_num_employees_ranges?.[0];
      return density[b] ?? 0;
    };

    const units = await resolveAdaptiveExecutionTree(mockProbe, {
      organization_num_employees_ranges: ['1,10', '11,20']
    }, {
      maxLeadsPerCabinet: 250,
      sleepFn,
      onProbeProgress
    });

    assert.equal(units.length, 1);
    assert.equal(units[0].total, 150);
    // Delays should have been called for zero-result dwell and probe spacing
    assert.ok(delays.length >= 1, `Expected pacing delays, got ${delays.length}`);
    const zeroDwellEvent = progressEvents.find(e => e.type === 'ZERO_RESULT_DWELL');
    assert.ok(zeroDwellEvent, 'Expected ZERO_RESULT_DWELL progress event');
    assert.equal(zeroDwellEvent.label, '1,10');
  });
});
