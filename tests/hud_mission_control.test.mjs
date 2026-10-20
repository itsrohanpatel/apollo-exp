import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRollingVelocity,
  calculateETA,
  computeDataQualityMetrics,
  formatMissionControlState
} from '../extension/slicer_core.js';

test('Mission Control HUD: Rolling Velocity Tracker', async (t) => {
  await t.test('returns 0 velocity during initial warmup or with insufficient history', () => {
    assert.equal(computeRollingVelocity([]), 0);
    assert.equal(computeRollingVelocity([{ count: 25, ts: Date.now() }]), 0);
  });

  await t.test('calculates accurate leads per minute over a sliding window', () => {
    const now = 100000;
    const history = [
      { count: 10, ts: now - 30000 }, // 30s ago: 10 leads
      { count: 25, ts: now - 15000 }, // 15s ago: 25 leads
      { count: 40, ts: now }          // now: 40 leads (30 leads gained in 30 seconds -> 60 leads/min)
    ];

    const velocity = computeRollingVelocity(history, now);
    assert.equal(velocity, 60);
  });

  await t.test('prunes history points older than the window (e.g. 60s)', () => {
    const now = 200000;
    const history = [
      { count: 5, ts: now - 120000 }, // 2m ago (should be pruned)
      { count: 100, ts: now - 60000 }, // 60s ago
      { count: 120, ts: now }          // now (20 leads in 60s -> 20 leads/min)
    ];

    const velocity = computeRollingVelocity(history, now, 60000);
    assert.equal(velocity, 20);
  });
});

test('Mission Control HUD: Dynamic ETA Predictor', async (t) => {
  await t.test('returns "Complete" when target is already reached or exceeded', () => {
    assert.equal(calculateETA(500, 500, 25), 'Complete');
    assert.equal(calculateETA(600, 500, 25), 'Complete');
  });

  await t.test('returns "Calculating..." when velocity is 0 or unmeasured', () => {
    assert.equal(calculateETA(50, 1000, 0), 'Calculating...');
    assert.equal(calculateETA(50, 1000, -5), 'Calculating...');
  });

  await t.test('formats sub-minute times as "< 1m"', () => {
    // 10 leads remaining at 60 leads/min = 10 seconds
    assert.equal(calculateETA(90, 100, 60), '< 1m');
  });

  await t.test('formats minute durations cleanly', () => {
    // 300 leads remaining at 20 leads/min = 15 minutes
    assert.equal(calculateETA(200, 500, 20), '~15m');
  });

  await t.test('formats hour and minute durations', () => {
    // 1500 leads remaining at 20 leads/min = 75 minutes = 1h 15m
    assert.equal(calculateETA(500, 2000, 20), '~1h 15m');
  });
});

test('Mission Control HUD: Live Data Quality & ICP Intelligence', async (t) => {
  const sampleItems = [
    {
      id: 'p1',
      first_name: 'Alice',
      email_status: 'verified',
      sanitized_phone: '+1 555-0100',
      seniority: 'c_suite'
    },
    {
      id: 'p2',
      first_name: 'Bob',
      email_status: 'verified',
      phone_numbers: ['+1 555-0101'],
      seniority: 'founder'
    },
    {
      id: 'p3',
      first_name: 'Charlie',
      email_status: 'guessed',
      seniority: 'manager'
    },
    {
      id: 'p4',
      first_name: 'Diana',
      email_status: 'unavailable',
      corporate_phone: '+1 555-0102',
      seniority: 'director'
    }
  ];

  await t.test('computes exact verification, phone, and decision-maker percentages', () => {
    const metrics = computeDataQualityMetrics(sampleItems);
    assert.equal(metrics.total, 4);
    assert.equal(metrics.verifiedEmails, 2);
    assert.equal(metrics.verifiedEmailPct, 50); // 2/4 = 50%
    assert.equal(metrics.phoneCount, 3);        // 3/4 = 75%
    assert.equal(metrics.phonePct, 75);
    assert.equal(metrics.decisionMakerCount, 3); // c_suite, founder, director = 3/4 = 75%
    assert.equal(metrics.decisionMakerPct, 75);
  });

  await t.test('handles empty or missing items array gracefully', () => {
    const emptyMetrics = computeDataQualityMetrics([]);
    assert.equal(emptyMetrics.total, 0);
    assert.equal(emptyMetrics.verifiedEmailPct, 0);
    assert.equal(emptyMetrics.phonePct, 0);
    assert.equal(emptyMetrics.decisionMakerPct, 0);
  });
});

test('Mission Control HUD: State Formatting & Layout Controller', async (t) => {
  await t.test('formats complete Mission Control state with velocity, ETA, and progress', () => {
    const rawState = {
      isHarvestingActive: true,
      harvestedCount: 450,
      targetLeads: 1000,
      velocity: 30,
      sliceLabel: '51,100',
      currentSlice: 3,
      totalSlices: 10,
      sliceHarvested: 75,
      sliceTotal: 100,
      quality: {
        verifiedEmailPct: 82,
        phonePct: 45,
        decisionMakerPct: 60
      }
    };

    const formatted = formatMissionControlState(rawState);
    assert.equal(formatted.statusBadge, 'RUNNING');
    assert.equal(formatted.totalCountDisplay, '450');
    assert.equal(formatted.velocityStr, '⚡ 30/min');
    assert.equal(formatted.etaStr, '⏱️ ~18m');
    assert.equal(formatted.cabinetStr, '[51,100] (Slice 3/10)');
    assert.equal(formatted.cabinetProgressPct, 75);
    assert.equal(formatted.quality.verifiedStr, '82%');
    assert.equal(formatted.quality.phoneStr, '45%');
    assert.equal(formatted.quality.decisionMakerStr, '60%');
  });

  await t.test('formats cooldown state correctly with countdown indicator', () => {
    const cooldownState = {
      isHarvestingActive: true,
      cooldownRemaining: 22,
      harvestedCount: 450,
      targetLeads: 1000
    };

    const formatted = formatMissionControlState(cooldownState);
    assert.equal(formatted.statusBadge, 'COOLDOWN (22s)');
    assert.equal(formatted.isCooldown, true);
    assert.equal(formatted.indicatorColor, '#38bdf8'); // sky blue
  });
});
