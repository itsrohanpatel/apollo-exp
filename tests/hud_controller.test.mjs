import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Controller helper function to test HUD state transformation and race condition guard.
 */
export function formatHUDProgress(data) {
  const {
    harvestedCount = 0,
    currentSlice = 0,
    totalSlices = 0,
    status = '',
    sliceLabel = null,
    sliceHarvested = null,
    sliceTotal = null,
    passLabel = null,
    cooldownRemaining = null
  } = data;

  const totalDisplay = Number(harvestedCount).toLocaleString();

  let badge = passLabel ? passLabel.toUpperCase() : 'RUNNING';
  let badgeColor = '#f59e0b';
  let sliceInfo = '';
  let detailInfo = '';

  if (cooldownRemaining !== null && cooldownRemaining > 0) {
    badge = `Cooldown (${cooldownRemaining}s)`;
    badgeColor = '#f59e0b';
    sliceInfo = `Anti-ban protection active`;
    detailInfo = `Cooldown pause: ${cooldownRemaining}s remaining...`;
  } else if (sliceLabel) {
    const sliceIndexStr = totalSlices > 0 ? ` [Slice ${currentSlice}/${totalSlices}]` : '';
    sliceInfo = `Bracket [${sliceLabel}]${sliceIndexStr}`;
    
    if (sliceHarvested !== null) {
      const passStr = passLabel ? `${passLabel}: ` : '';
      const totalStr = sliceTotal !== null ? ` of ${sliceTotal}` : '';
      detailInfo = `${passStr}${sliceHarvested}${totalStr} leads`;
    } else {
      detailInfo = status || 'Processing...';
    }
  } else {
    sliceInfo = status || 'Harvesting...';
    detailInfo = '';
  }

  return {
    totalDisplay,
    badge,
    badgeColor,
    sliceInfo,
    detailInfo
  };
}

export function shouldApplyStorageUpdate(isHarvestActive) {
  // During active harvesting, injected.js is the authoritative source;
  // storage changes must NOT overwrite HUD state to prevent race-condition jitter.
  return !isHarvestActive;
}

test('formatHUDProgress cleanly separates global lead count from slice details', () => {
  const progress = {
    harvestedCount: 1701,
    currentSlice: 8,
    totalSlices: 14,
    sliceLabel: '2001,5000',
    passLabel: 'Bottom-up',
    sliceHarvested: 150,
    sliceTotal: 196,
    status: '[2001,5000] Bottom-up Harvested 150 of 196'
  };

  const formatted = formatHUDProgress(progress);

  // Global total must be 1,701 and NOT contain 2001, 150, or 196
  assert.equal(formatted.totalDisplay, '1,701');
  assert.equal(formatted.badge, 'BOTTOM-UP');
  assert.equal(formatted.sliceInfo, 'Bracket [2001,5000] [Slice 8/14]');
  assert.equal(formatted.detailInfo, 'Bottom-up: 150 of 196 leads');
  assert.ok(!formatted.totalDisplay.includes('150'));
  assert.ok(!formatted.totalDisplay.includes('2001'));
});

test('formatHUDProgress handles anti-ban cooldown countdown seamlessly', () => {
  const cooldownEvent = {
    harvestedCount: 1701,
    currentSlice: 8,
    totalSlices: 14,
    sliceLabel: '2001,5000',
    cooldownRemaining: 38
  };

  const formatted = formatHUDProgress(cooldownEvent);

  assert.equal(formatted.totalDisplay, '1,701');
  assert.equal(formatted.badge, 'Cooldown (38s)');
  assert.ok(formatted.detailInfo.includes('38s remaining'));
});

test('shouldApplyStorageUpdate blocks storage sync during active harvesting', () => {
  assert.equal(shouldApplyStorageUpdate(true), false);
  assert.equal(shouldApplyStorageUpdate(false), true);
});
