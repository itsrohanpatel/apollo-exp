import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldEarlyExitHarvest } from '../extension/slicer_core.js';

describe('Harvest Early-Exit & Redundancy Short-Circuit Engine', () => {
  describe('Pass 1 (Top-Down A-Z)', () => {
    it('short-circuits immediately on Page 1 if sliceHarvested reaches or exceeds sliceTotal', () => {
      // Example from audit: [110,110 intern] has sliceTotal 26. Page 1 returns 26 leads.
      const result = shouldEarlyExitHarvest({
        isPass2: false,
        page: 1,
        sliceHarvested: 26,
        sliceTotal: 26,
        addedInPage: 26,
        rawPeopleCount: 26
      });

      assert.strictEqual(result.shouldExit, true);
      assert.strictEqual(result.status, 'EARLY_EXIT_CABINET_COMPLETE');
      assert.strictEqual(result.reason, 'FULL_HARVEST_REACHED');
    });

    it('does not exit on Page 1 if sliceHarvested is less than sliceTotal and full page received', () => {
      const result = shouldEarlyExitHarvest({
        isPass2: false,
        page: 1,
        sliceHarvested: 30,
        sliceTotal: 80,
        addedInPage: 30,
        rawPeopleCount: 30
      });

      assert.strictEqual(result.shouldExit, false);
      assert.strictEqual(result.status, 'SUCCESS');
    });

    it('exits on Page 1 if rawPeopleCount < 25 (natural last page of cabinet)', () => {
      const result = shouldEarlyExitHarvest({
        isPass2: false,
        page: 1,
        sliceHarvested: 12,
        sliceTotal: 25,
        addedInPage: 12,
        rawPeopleCount: 12
      });

      assert.strictEqual(result.shouldExit, true);
      assert.strictEqual(result.status, 'LAST_PAGE_OF_CABINET');
    });

    it('short-circuits on Page 2+ if addedInPage === 0 (Apollo repeated Page 1 duplicates)', () => {
      // Example from audit: [190,190 senior] returns Page 1 (30 leads). Page 2 also returns 30 duplicates (0 added).
      const result = shouldEarlyExitHarvest({
        isPass2: false,
        page: 2,
        sliceHarvested: 30,
        sliceTotal: 45,
        addedInPage: 0,
        rawPeopleCount: 30
      });

      assert.strictEqual(result.shouldExit, true);
      assert.strictEqual(result.status, 'EARLY_EXIT_ZERO_FRESH');
      assert.strictEqual(result.reason, 'ZERO_FRESH_ON_PAGINATION');
    });
  });

  describe('Pass 2 (Bottom-Up Z-A)', () => {
    it('short-circuits immediately in Pass 2 when addedInPage === 0 (sweep convergence met)', () => {
      // Example from audit: Pass 2 Page 1 starts at Z and fetches 30 duplicates already collected in Pass 1
      const result = shouldEarlyExitHarvest({
        isPass2: true,
        page: 1,
        sliceHarvested: 150,
        sliceTotal: 152,
        addedInPage: 0,
        rawPeopleCount: 30
      });

      assert.strictEqual(result.shouldExit, true);
      assert.strictEqual(result.status, 'EARLY_EXIT_SWEEP_CONVERGENCE');
      assert.strictEqual(result.reason, 'SWEEP_CONVERGENCE');
    });

    it('continues in Pass 2 if fresh leads were discovered from the reverse end', () => {
      const result = shouldEarlyExitHarvest({
        isPass2: true,
        page: 1,
        sliceHarvested: 155,
        sliceTotal: 180,
        addedInPage: 30,
        rawPeopleCount: 30
      });

      assert.strictEqual(result.shouldExit, false);
      assert.strictEqual(result.status, 'SUCCESS');
    });

    it('stops in Pass 2 on rawPeopleCount < 25 (end of reverse results)', () => {
      const result = shouldEarlyExitHarvest({
        isPass2: true,
        page: 2,
        sliceHarvested: 177,
        sliceTotal: 180,
        addedInPage: 5,
        rawPeopleCount: 5
      });

      assert.strictEqual(result.shouldExit, true);
      assert.strictEqual(result.status, 'LAST_PAGE_OF_CABINET');
    });
  });
});
