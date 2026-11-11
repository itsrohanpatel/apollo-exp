import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  coalescePartitionsIntoBins,
  resolveAdaptiveExecutionTree,
  buildPayloadForCabinet,
  buildHashForSlice,
  subdivideCabinet
} from '../extension/slicer_core.js';

describe('Sub-300 Bin Packing & Coalescence Engine', () => {

  describe('coalescePartitionsIntoBins (First-Fit Decreasing Packing)', () => {
    it('isolates dense items >= maxCapacity into individual standalone bins with isGrouped: false', () => {
      const items = [
        { key: 'entry', label: 'Entry Level', total: 286 },
        { key: 'intern', label: 'Intern', total: 15 },
        { key: 'founder', label: 'Founder', total: 10 }
      ];

      const bins = coalescePartitionsIntoBins(items, { maxBinCapacity: 260 });
      assert.strictEqual(bins.length, 2);

      // Standalone dense item
      const entryBin = bins.find(b => b.keys.includes('entry'));
      assert.ok(entryBin);
      assert.strictEqual(entryBin.isGrouped, false);
      assert.strictEqual(entryBin.total, 286);
      assert.deepStrictEqual(entryBin.keys, ['entry']);

      // Coalesced sparse items (15 + 10 = 25 <= 260)
      const groupedBin = bins.find(b => b.keys.includes('intern'));
      assert.ok(groupedBin);
      assert.strictEqual(groupedBin.isGrouped, true);
      assert.strictEqual(groupedBin.total, 25);
      assert.deepStrictEqual(groupedBin.keys, ['intern', 'founder']);
    });

    it('greedily packs multiple sparse items into bins without exceeding maxCapacity', () => {
      const items = [
        { key: 's1', label: 'Seniority 1', total: 100 },
        { key: 's2', label: 'Seniority 2', total: 90 },
        { key: 's3', label: 'Seniority 3', total: 80 },
        { key: 's4', label: 'Seniority 4', total: 70 },
        { key: 's5', label: 'Seniority 5', total: 60 }
      ];

      // Total is 400. With maxBinCapacity 260:
      // Bin 1: 100 + 90 + 70 = 260 (or 100 + 90 + 60 = 250, etc.)
      // Bin 2: remaining items
      const bins = coalescePartitionsIntoBins(items, 260);

      assert.strictEqual(bins.length, 2);
      for (const b of bins) {
        assert.ok(b.total <= 260, `Bin total ${b.total} must be <= 260`);
        assert.ok(b.isGrouped, 'Bin with multiple items must be marked isGrouped: true');
      }

      const allPackedKeys = bins.flatMap(b => b.keys);
      assert.strictEqual(allPackedKeys.length, 5);
      assert.strictEqual(bins.reduce((sum, b) => sum + b.total, 0), 400);
    });

    it('filters out 0 and negative count items and handles empty inputs gracefully', () => {
      const items = [
        { key: 'zero1', total: 0 },
        { key: 'zero2', total: -5 },
        { key: 'active', total: 50 }
      ];

      const bins = coalescePartitionsIntoBins(items, 260);
      assert.strictEqual(bins.length, 1);
      assert.strictEqual(bins[0].keys[0], 'active');
      assert.strictEqual(bins[0].isGrouped, false);

      assert.deepStrictEqual(coalescePartitionsIntoBins([]), []);
      assert.deepStrictEqual(coalescePartitionsIntoBins(null), []);
    });

    it('generates clean readable concatenated labels for coalesced items', () => {
      const items = [
        { key: 'director', label: 'Director', total: 30 },
        { key: 'head', label: 'Head', total: 20 },
        { key: 'vp', label: 'VP', total: 10 }
      ];

      const bins = coalescePartitionsIntoBins(items, 260);
      assert.strictEqual(bins.length, 1);
      assert.strictEqual(bins[0].label, 'Director+Head+VP');
      assert.strictEqual(bins[0].total, 60);
    });
  });

  describe('resolveAdaptiveExecutionTree with Coalescence', () => {
    it('coalesces sparse seniorities into grouped bins for dense headcount', async () => {
      // Mock search where headcount 11,11 has 400 leads total.
      // entry has 280 leads (standalone), manager has 50 leads, director has 40 leads, owner has 10 leads, others have 0.
      const mockCounts = {
        'ROOT': 400,
        '11,11': 400,
        '11,11 entry': 280,
        '11,11 manager': 50,
        '11,11 director': 40,
        '11,11 owner': 10
      };

      const probeFn = async (params) => {
        const ranges = params.organization_num_employees_ranges;
        const sen = params.person_seniorities;
        if (!ranges && !sen) return mockCounts['ROOT'];
        if (ranges && !sen) return mockCounts['11,11'];
        if (ranges && sen) {
          return mockCounts[`${ranges[0]} ${sen[0]}`] || 0;
        }
        return 0;
      };

      const basePayload = {
        organization_num_employees_ranges: ['11,11']
      };

      const auditLog = [];
      const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
        maxLeadsPerCabinet: 125,
        maxBidirectionalLeads: 300,
        coalesceBinCapacity: 260,
        auditLog
      });

      // Instead of 4 separate cabinets, sparse seniorities (manager 50 + director 40 + owner 10 = 100 <= 260)
      // are coalesced into 1 bin!
      // Total cabinets: 1 standalone (entry: 280) + 1 coalesced bin (100) = 2 cabinets!
      assert.strictEqual(cabinets.length, 2, 'Should produce exactly 2 cabinets (1 dense standalone + 1 coalesced bin)');

      const entryCab = cabinets.find(c => c.seniority === 'entry' || (Array.isArray(c.seniority) && c.seniority.includes('entry')));
      assert.ok(entryCab);
      assert.strictEqual(entryCab.total, 280);
      assert.strictEqual(entryCab.mode, 'Bidirectional');

      const coalescedCab = cabinets.find(c => c.isGrouped);
      assert.ok(coalescedCab, 'Should have a coalesced cabinet');
      assert.strictEqual(coalescedCab.total, 100);
      assert.ok(Array.isArray(coalescedCab.seniority));
      assert.strictEqual(coalescedCab.seniority.length, 3);
      assert.ok(coalescedCab.seniority.includes('manager'));
      assert.ok(coalescedCab.seniority.includes('director'));
      assert.ok(coalescedCab.seniority.includes('owner'));
      assert.strictEqual(coalescedCab.mode, 'Top-Down Only'); // 100 <= 125

      assert.ok(auditLog.some(e => e.type === 'SENIORITY_BIN_COALESCED'));
    });
  });

  describe('buildPayloadForCabinet with Coalesced Bins', () => {
    it('serializes array of seniorities into person_seniorities payload for Turbo mode', () => {
      const baseFilters = { person_locations: ['Bengaluru, India'] };
      const cabinet = {
        bracket: ['11,11'],
        seniority: ['founder', 'owner', 'director'],
        isGrouped: true
      };

      const payload = buildPayloadForCabinet(baseFilters, cabinet);
      assert.deepStrictEqual(payload.person_seniorities, ['founder', 'owner', 'director']);
      assert.deepStrictEqual(payload.organization_num_employees_ranges, ['11,11']);
      assert.deepStrictEqual(payload.person_locations, ['Bengaluru, India']);
    });

    it('serializes array of subdepartments into person_department_or_subdepartments payload', () => {
      const baseFilters = {};
      const cabinet = {
        bracket: ['11,11'],
        seniority: 'entry',
        subdepartment: ['recruiting_talent_acquisition', 'people_operations', 'compensation_benefits'],
        department: 'master_human_resources',
        isGrouped: true
      };

      const payload = buildPayloadForCabinet(baseFilters, cabinet);
      assert.deepStrictEqual(payload.person_department_or_subdepartments, [
        'recruiting_talent_acquisition',
        'people_operations',
        'compensation_benefits'
      ]);
    });
  });

  describe('buildHashForSlice with Coalesced Bins (Standard Mode)', () => {
    it('serializes array seniorities into multiple personSeniorities[] URL parameters', () => {
      const currentHash = '#/people?page=1&contactEmailStatus[]=unavailable';
      const cabinet = {
        bracket: ['11,11'],
        seniority: ['founder', 'partner', 'c_suite'],
        isGrouped: true
      };

      const newHash = buildHashForSlice(currentHash, cabinet);
      assert.ok(newHash.includes('organizationNumEmployeesRanges[]=11%2C11'));
      assert.ok(newHash.includes('personSeniorities[]=founder'));
      assert.ok(newHash.includes('personSeniorities[]=partner'));
      assert.ok(newHash.includes('personSeniorities[]=c_suite'));
      assert.ok(newHash.includes('contactEmailStatus[]=unavailable'));
    });

    it('serializes array subdepartments into multiple personDepartmentOrSubdepartments[] URL parameters', () => {
      const currentHash = '#/people?page=1';
      const cabinet = {
        bracket: ['11,11'],
        seniority: 'entry',
        subdepartment: ['sub_one', 'sub_two'],
        isGrouped: true
      };

      const newHash = buildHashForSlice(currentHash, cabinet);
      assert.ok(newHash.includes('personDepartmentOrSubdepartments[]=sub_one'));
      assert.ok(newHash.includes('personDepartmentOrSubdepartments[]=sub_two'));
      assert.ok(newHash.includes('personSeniorities[]=entry'));
    });
  });

  describe('subdivideCabinet Guard for Coalesced Bins', () => {
    it('does not re-subdivide a cabinet that is already a coalesced bin even if totalEntries > 300', () => {
      const cabinet = {
        label: '11,11 [founder+owner+vp]',
        bracket: ['11,11'],
        seniority: ['founder', 'owner', 'vp'],
        total: 310,
        isGrouped: true
      };

      const result = subdivideCabinet(cabinet, 310, { maxLeadsPerCabinet: 300 });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], cabinet);
    });
  });

  describe('Mathematical Remainder Pruning Engine', () => {
    it('skips tail seniority probes when remaining leads mathematically fit within 300 capacity', async () => {
      let probeCallCount = 0;
      const probedSeniorities = [];

      const mockProbeFn = async (payload) => {
        probeCallCount++;
        const ranges = payload.organization_num_employees_ranges || [];
        const seniorities = payload.person_seniorities || null;

        // Headcount 11 has 380 leads total
        if (!seniorities) {
          return 380;
        }

        const sen = seniorities[0];
        probedSeniorities.push(sen);

        if (sen === 'entry') return 250;
        if (sen === 'manager') return 70;
        if (sen === 'senior') return 35;
        // Remaining 8 seniorities have 25 leads combined (380 - 355 = 25)
        return 5;
      };

      const basePayload = {
        organization_num_employees_ranges: ['11,11']
      };

      const auditLog = [];
      const result = await resolveAdaptiveExecutionTree(mockProbeFn, basePayload, {
        detailed: true,
        auditLog,
        maxEmployees: 11,
        maxBidirectionalLeads: 300,
        remainderPruning: true
      });

      assert.ok(result.cabinets.length > 0);
      assert.strictEqual(result.probesPrunedByMath, 9); // exactly 9 tail probes pruned (senior through intern)!
      assert.ok(probedSeniorities.includes('entry'));
      assert.ok(probedSeniorities.includes('manager'));
      // Tail seniorities must NOT have been probed individually
      assert.ok(!probedSeniorities.includes('director'));
      assert.ok(!probedSeniorities.includes('vp'));
      assert.ok(!probedSeniorities.includes('head'));
      assert.ok(!probedSeniorities.includes('c_suite'));

      // Verify that audit log recorded the remainder prune event
      const pruneEvent = auditLog.find(a => a.type === 'REMAINDER_PRUNE');
      assert.ok(pruneEvent);
      assert.strictEqual(pruneEvent.leadsCount, 60);
      assert.ok(pruneEvent.decision.includes('Pruned 9 tail seniority probes'));

      // Verify that the created tail cabinet serializes into discrete individual seniority strings
      const tailCab = result.cabinets.find(c => Array.isArray(c.seniority) && c.seniority.includes('director'));
      assert.ok(tailCab, 'Tail cabinet with remainder-pruned seniorities must exist');
      assert.strictEqual(tailCab.total, 130);
      assert.ok(Array.isArray(tailCab.seniority), 'Tail cabinet seniority must be an array');
      assert.ok(tailCab.seniority.includes('senior'));
      assert.ok(tailCab.seniority.includes('director'));
      assert.ok(!tailCab.seniority.some(s => s.includes('+')), 'No seniority item should contain a plus sign');

      // Verify payload serialization for Apollo API
      const payload = buildPayloadForCabinet(basePayload, tailCab, {}, 1);
      assert.ok(Array.isArray(payload.person_seniorities));
      assert.ok(payload.person_seniorities.length >= 9);
      assert.ok(!payload.person_seniorities.some(s => s.includes('+')), 'Payload person_seniorities must not contain plus-joined strings');

      // Verify hash serialization for Apollo DOM navigation
      const hash = buildHashForSlice('#?findParams', tailCab);
      assert.ok(hash.includes('personSeniorities[]=senior'));
      assert.ok(hash.includes('personSeniorities[]=director'));
      assert.ok(!hash.includes('senior%2Bdirector'), 'URL hash must not contain encoded plus strings in personSeniorities');
    });
  });
});

