import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAdaptiveExecutionTree
} from '../extension/slicer_core.js';
import { ApolloHUD } from '../extension/hud.js';

test('Preflight Pause & Abort Controls', async (t) => {

  await t.test('resolveAdaptiveExecutionTree pauses when isPaused returns true and resumes when false', async () => {
    let paused = true;
    let probeCallCount = 0;
    const probeLog = [];

    const mockProbeFn = async (filters) => {
      probeCallCount++;
      const range = filters.organization_num_employees_ranges ? filters.organization_num_employees_ranges[0] : 'root';
      probeLog.push({ range, time: Date.now() });
      // Return 200 leads to trigger bisection
      return 200;
    };

    let executionDone = false;
    const executionPromise = resolveAdaptiveExecutionTree(mockProbeFn, {
      organization_num_employees_ranges: ['1,10']
    }, {
      isPaused: () => paused,
      isAborted: () => false,
      maxLeadsPerCabinet: 150,
      maxBidirectionalLeads: 300,
      maxMultiIntegerLeads: 240
    }).then(res => {
      executionDone = true;
      return res;
    });

    // Wait 250ms while paused - no probes or only initial check before pause
    await new Promise(r => setTimeout(r, 250));
    assert.equal(executionDone, false, 'Execution must not complete while paused');
    const callsWhilePaused = probeCallCount;

    // Unpause
    paused = false;
    const result = await executionPromise;

    assert.equal(executionDone, true, 'Execution completes after resuming');
    assert.ok(probeCallCount > callsWhilePaused, 'Probing resumed and executed remaining items');
    assert.ok(result.length > 0, 'Cabinets were returned successfully');
  });

  await t.test('resolveAdaptiveExecutionTree halts immediately when isAborted returns true', async () => {
    let aborted = false;
    let probeCallCount = 0;

    const mockProbeFn = async (filters) => {
      probeCallCount++;
      // After first probe, abort
      if (probeCallCount >= 2) {
        aborted = true;
      }
      return 500; // Large number to keep queue full
    };

    const result = await resolveAdaptiveExecutionTree(mockProbeFn, {
      organization_num_employees_ranges: ['1,100']
    }, {
      isPaused: () => false,
      isAborted: () => aborted,
      maxLeadsPerCabinet: 150,
      maxBidirectionalLeads: 300
    });

    assert.equal(aborted, true, 'Abort condition was triggered');
    // Because abort stopped the queue, probeCallCount should be small (<= 4) instead of traversing all sub-ranges
    assert.ok(probeCallCount <= 4, `Expected probeCallCount <= 4 due to early abort, got ${probeCallCount}`);
  });

  await t.test('ApolloHUD tracks probing phase and displays probing-specific pause/resume labels', () => {
    // Mock minimal DOM for HUD
    const listeners = {};
    const elements = {};
    const createElement = (tag, id) => {
      const el = {
        tagName: tag.toUpperCase(),
        id,
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        addEventListener: (event, handler) => {
          listeners[id + ':' + event] = handler;
        },
        querySelector: (sel) => elements[sel.replace('#', '')] || null,
        querySelectorAll: () => []
      };
      elements[id] = el;
      return el;
    };

    // Instantiate ApolloHUD
    let pauseToggled = false;
    let resumeToggled = false;

    const hud = new ApolloHUD({
      onPause: () => { pauseToggled = true; },
      onResume: () => { resumeToggled = true; }
    });

    hud.setPhase('probing');
    assert.equal(hud.currentPhase, 'probing');

    // Simulate pause action
    hud.setHarvestState('running');
    hud.togglePause();
    assert.equal(hud.isPaused, true);
    assert.equal(pauseToggled, true);
    assert.equal(hud.statusText, '⏸ Density Probing paused by operator');

    // Simulate resume action
    hud.togglePause();
    assert.equal(hud.isPaused, false);
    assert.equal(resumeToggled, true);
    assert.equal(hud.statusText, '▶ Resuming Density Probing...');
  });
});

