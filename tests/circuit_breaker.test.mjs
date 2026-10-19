import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SafetyCircuitBreaker,
  shouldTriggerCooldown
} from '../extension/slicer_core.js';

describe('Safety Circuit Breaker & Anti-Ban Controls', () => {
  test('allows normal HTTP 200 responses to proceed', () => {
    const cb = new SafetyCircuitBreaker();
    const evaluation = cb.inspectResponse({ status: 200, statusText: 'OK' });
    
    assert.equal(evaluation.allowContinue, true);
    assert.equal(cb.isTripped(), false);
  });

  test('immediately trips and halts on HTTP 429 Too Many Requests', () => {
    const cb = new SafetyCircuitBreaker();
    const evaluation = cb.inspectResponse({ status: 429, statusText: 'Too Many Requests' });
    
    assert.equal(evaluation.allowContinue, false);
    assert.equal(evaluation.reason, 'RATE_LIMIT_429');
    assert.equal(cb.isTripped(), true);
  });

  test('immediately trips and halts on HTTP 403 Forbidden / Cloudflare challenge', () => {
    const cb = new SafetyCircuitBreaker();
    const evaluation = cb.inspectResponse({ status: 403, statusText: 'Forbidden' });
    
    assert.equal(evaluation.allowContinue, false);
    assert.equal(evaluation.reason, 'BLOCKED_403');
    assert.equal(cb.isTripped(), true);
  });

  test('trips when daily account volume threshold is exceeded', () => {
    const cb = new SafetyCircuitBreaker({ maxDailyLeads: 2500 });
    
    cb.recordLeadsHarvested(2400);
    assert.equal(cb.isTripped(), false);
    
    const status = cb.recordLeadsHarvested(150);
    assert.equal(status.tripped, true);
    assert.equal(status.reason, 'DAILY_LIMIT_EXCEEDED');
    assert.equal(cb.isTripped(), true);
  });

  test('shouldTriggerCooldown identifies when to pause for 45s batch rest', () => {
    // 25 leads per request: request 10 = 250 leads -> triggers cooldown
    assert.equal(shouldTriggerCooldown(10, 250), true);
    assert.equal(shouldTriggerCooldown(20, 500), true);
    assert.equal(shouldTriggerCooldown(5, 125), false);
    assert.equal(shouldTriggerCooldown(9, 225), false);
  });
});
