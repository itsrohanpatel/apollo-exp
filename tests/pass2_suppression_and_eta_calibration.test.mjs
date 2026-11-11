import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APOLLO_PAGE_SIZE,
  MAX_TOP_DOWN_LEADS,
  MAX_BIDIRECTIONAL_LEADS,
  MAX_MULTI_INTEGER_RANGE_LEADS,
  ESTIMATED_SECONDS_PER_PAGE,
  resolveAdaptiveExecutionTree,
  HarvestTelemetryEstimator
} from '../extension/slicer_core.js';

test('Telemetry-Driven Efficiency & Accuracy Overhaul', async (t) => {

  await t.test('Core constants: 30 leads/page, 240 range ceiling, 7s/page duration', () => {
    assert.equal(APOLLO_PAGE_SIZE, 30);
    assert.equal(MAX_TOP_DOWN_LEADS, 150);
    assert.equal(MAX_BIDIRECTIONAL_LEADS, 300);
    assert.equal(MAX_MULTI_INTEGER_RANGE_LEADS, 240);
    assert.equal(ESTIMATED_SECONDS_PER_PAGE, 7);
  });

  await t.test('Multi-Integer vs Single-Integer Ceiling: 240 leads for ranges, 300 leads for single headcounts', async () => {
    // Scenario 1: Multi-integer bracket with 220 leads (<= 240) -> Approved as continuous range
    const mockProbe1 = async (filters) => 220;
    const units1 = await resolveAdaptiveExecutionTree(mockProbe1, {
      organization_num_employees_ranges: ['501,520']
    });
    assert.equal(units1.length, 1);
    assert.equal(units1[0].label, '501,520');
    assert.equal(units1[0].mode, 'Bidirectional');

    // Scenario 2: Multi-integer bracket with 300 leads (> 240) -> Bisects to prevent sweep collision!
    const densityMap2 = {
      '674,688': 300,
      '674,681': 150,
      '682,688': 150
    };
    const mockProbe2 = async (filters) => {
      const b = filters.organization_num_employees_ranges?.[0];
      return densityMap2[b] || 0;
    };
    const units2 = await resolveAdaptiveExecutionTree(mockProbe2, {
      organization_num_employees_ranges: ['674,688']
    });
    // Bisects into 2 sub-brackets of 150 leads each
    assert.equal(units2.length, 2);
    assert.equal(units2[0].label, '674,681');
    assert.equal(units2[1].label, '682,688');
    assert.equal(units2[0].total, 150);
    assert.equal(units2[1].total, 150);

    // Scenario 3: Single-integer headcount with 265 leads (e.g. 550,550 <= 300) -> NOT bisected, approved directly!
    const mockProbe3 = async (filters) => 265;
    const units3 = await resolveAdaptiveExecutionTree(mockProbe3, {
      organization_num_employees_ranges: ['550,550']
    });
    assert.equal(units3.length, 1);
    assert.equal(units3[0].label, '550,550');
    assert.equal(units3[0].mode, 'Bidirectional');
    assert.equal(units3[0].total, 265);

    // Scenario 4: Single-integer headcount with 433 leads (> 300) -> Pivots to seniority
    const mockProbe4 = async (filters) => {
      const sen = filters.person_seniorities?.[0];
      if (sen) return 40;
      return 433;
    };
    const units4 = await resolveAdaptiveExecutionTree(mockProbe4, {
      organization_num_employees_ranges: ['600,600']
    });
    assert.ok(units4.length > 1);
    assert.ok(units4.some(u => Array.isArray(u.seniority) ? u.seniority.includes('c_suite') : u.seniority === 'c_suite'));
  });

  await t.test('HarvestTelemetryEstimator defaults initial latency to realistic ~4500ms when configured', () => {
    const est = new HarvestTelemetryEstimator({ defaultLatencyMs: 4500, defaultPacingMs: 2500, enableCooldown: false });
    assert.equal(est.getAverageLatencyMs(), 4500);
    assert.equal(est.getAveragePacingMs(), 2500);

    // 10 pages without cooldowns: 10 * (4.5s + 2.5s) = 70s
    const etaSec = est.estimateRemainingSeconds(10, 0);
    assert.equal(etaSec, 70);
  });

  await t.test('HarvestTelemetryEstimator dynamic mode pacing and recordPacing tracking', () => {
    // Turbo Mode: low latency (~350ms), fast pacing (~120ms), no phantom cooldowns
    const turboEst = new HarvestTelemetryEstimator({ engineMode: 'turbo' });
    assert.equal(turboEst.getAverageLatencyMs(), 350);
    assert.equal(turboEst.getAveragePacingMs(), 120);

    // 10 pages in turbo: 10 * (0.35s + 0.12s) = 4.7s -> ~5s
    const turboEta = turboEst.estimateRemainingSeconds(10, 0);
    assert.ok(turboEta >= 4 && turboEta <= 6);

    // Dynamic pacing recording
    turboEst.recordPacing(150);
    turboEst.recordPacing(170);
    assert.equal(turboEst.getAveragePacingMs(), 160);

    // Standard Mode: realistic defaults
    const standardEst = new HarvestTelemetryEstimator({ engineMode: 'standard' });
    assert.equal(standardEst.enableCooldown, false);
    assert.equal(standardEst.getAveragePacingMs(), 2500);
  });
});
