import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProbePacingDelay,
  validateSessionHealth,
  mergeSnippetEnrichment,
  resolveAdaptiveExecutionTree,
  HarvestTelemetryEstimator,
  calculateETA
} from '../extension/slicer_core.js';
import { ApolloHUD } from '../extension/hud.js';

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

  it('HarvestTelemetryEstimator computes average latency and detects network latency spikes', () => {
    const est = new HarvestTelemetryEstimator({ defaultPacingMs: 2000 });
    assert.equal(est.getAverageLatencyMs(), 400); // default

    est.recordRequest(350, 2000);
    est.recordRequest(450, 2100);
    assert.equal(est.getAverageLatencyMs(), 400);
    assert.equal(est.getLatencySpikeStatus().isSpike, false);

    // Spiking latency (e.g. Apollo / Cloudflare slowdown)
    est.recordRequest(1800, 2500);
    const spike = est.getLatencySpikeStatus();
    assert.equal(spike.isSpike, true);
    assert.equal(spike.lastLatencyMs, 1800);
  });

  it('HarvestTelemetryEstimator computes accurate remaining seconds including cooldown rest intervals', () => {
    const est = new HarvestTelemetryEstimator({
      defaultPacingMs: 2500,
      cooldownEveryN: 10,
      cooldownDurationMs: 45000,
      enableCooldown: true
    });

    // 12 pages (e.g. 275 leads across 2 sub-cabinets)
    // 12 pages @ (400ms latency + 2500ms pacing = 2.9s) = 34.8s
    // 1 cooldown rest @ 45s = 45s
    // 2 cabinets transition = 1.0s
    // Total approx 81s (~1m 21s)
    const etaSec = est.estimateRemainingSeconds(12, 2);
    assert.ok(etaSec >= 75 && etaSec <= 90, `Expected ~81s, got ${etaSec}s`);
    assert.equal(HarvestTelemetryEstimator.formatETA(etaSec), `~1m ${etaSec - 60}s`);
  });

  it('calculateETA seamlessly accepts rich telemetry options with latency and cooldowns', () => {
    // Zero pages remaining
    assert.equal(calculateETA(500, 500, 25, { remainingPages: 0 }), 'Complete');

    // Rich telemetry estimate for 10 pages with 400ms latency and 2.5s pacing
    const richETA = calculateETA(100, 350, 25, {
      remainingPages: 10,
      latencyMs: 400,
      pacingMs: 2500,
      cooldownEveryN: 10,
      cooldownDurationMs: 45000,
      requestsCompleted: 0
    });
    // (10 * 2.9s) + 45s = 74s -> ~1m
    assert.equal(richETA, '~1m');

    // Backward compatibility: works identically with standard 3-param calls
    assert.equal(calculateETA(50, 1000, 0), 'Calculating...');
    assert.equal(calculateETA(90, 100, 60), '< 1m');
  });

  it('ApolloHUD formatETA and countdown logic keeps live ETA active and ticking down', () => {
    const hud = new ApolloHUD();
    assert.equal(hud.formatETA(0), 'Complete');
    assert.equal(hud.formatETA(45), '< 1m (45s)');
    assert.equal(hud.formatETA(90), '~1m 30s');
    assert.equal(hud.formatETA(3660), '~1h 1m');

    // Test remainingSeconds tracking and decrement
    hud.updateProgress({ etaSeconds: 85 });
    assert.equal(hud.remainingSeconds, 85);

    // Simulate pacing second tick
    hud.setPacingTimer(2);
    // Even in Node without DOM, hud.remainingSeconds is decremented cleanly
    assert.equal(hud.remainingSeconds, 84);
  });
});
