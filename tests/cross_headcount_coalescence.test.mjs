import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveAdaptiveExecutionTree,
  buildPayloadForCabinet,
  buildHashForSlice
} from '../extension/slicer_core.js';

describe('Cross-Headcount Sparse Seniority Coalescence', () => {

  it('preserves headcounts with <= 300 leads intact without seniority breakdown', async () => {
    // 11,11 has 400 leads (> 300) -> decomposed
    // 12,12 has 150 leads (<= 300) -> stays 100% INTACT
    const mockCounts = {
      'ROOT': 550,
      '11,12': 550,
      '11,11': 400,
      '12,12': 150,
      // 11,11 seniorities
      '11,11 entry': 298,
      '11,11 director': 20,
      '11,11 vp': 5
    };

    const probeFn = async (params) => {
      const ranges = params.organization_num_employees_ranges;
      const sen = params.person_seniorities;
      if (!ranges && !sen) return mockCounts['ROOT'];
      if (ranges && !sen) return mockCounts[ranges[0]] || 0;
      if (ranges && sen) {
        return mockCounts[`${ranges[0]} ${sen[0]}`] || 0;
      }
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['11,12']
    };

    const auditLog = [];
    const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      maxBidirectionalLeads: 300,
      auditLog
    });

    // 12,12 must be present intact as 1 cabinet with seniority: null
    const intact12 = cabinets.find(c => Array.isArray(c.bracket) && c.bracket.includes('12,12') && c.seniority === null);
    assert.ok(intact12, '12,12 must remain whole and intact with seniority: null');
    assert.strictEqual(intact12.total, 150);

    // 11,11 dense entry must be present standalone (298 leads)
    const entry11 = cabinets.find(c => Array.isArray(c.bracket) && c.bracket.includes('11,11') && c.seniority === 'entry');
    assert.ok(entry11, '11,11 entry must be present as standalone cabinet');
    assert.strictEqual(entry11.total, 298);

    // 11,11 sparse seniorities (director 20 + vp 5 = 25) must coalesce
    const coalesced11 = cabinets.find(c => c.isGrouped);
    assert.ok(coalesced11, 'Sparse seniorities must coalesce');
    assert.strictEqual(coalesced11.total, 25);
    assert.deepStrictEqual(coalesced11.bracket, ['11,11']);
  });

  it('coalesces sparse seniorities across continuous macro span 11,15 when all integers exceed 300', async () => {
    // All 5 integers exceed 300 leads
    const mockCounts = {
      'ROOT': 2117,
      '11,15': 2117,
      '11,13': 1200,
      '14,15': 917,
      '11,12': 800,
      '11,11': 461,
      '12,12': 460,
      '13,13': 445,
      '14,14': 411,
      '15,15': 340
    };

    const senioritiesPerInt = {
      entry: 280,
      director: 3,
      vp: 1,
      founder: 2
    };

    const probeFn = async (params) => {
      const ranges = params.organization_num_employees_ranges;
      const sen = params.person_seniorities;
      if (!ranges && !sen) return mockCounts['ROOT'];
      if (ranges && !sen) return mockCounts[ranges[0]] || 0;
      if (ranges && sen) {
        return senioritiesPerInt[sen[0]] || 0;
      }
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['11,15']
    };

    const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      maxBidirectionalLeads: 300
    });

    // Sparse seniorities (director: 5 * 3 = 15, vp: 5 * 1 = 5, founder: 5 * 2 = 10 -> total 30 leads)
    // must be coalesced under macro bracket ['11,15']!
    const macroBin = cabinets.find(c => c.isGrouped && Array.isArray(c.bracket) && c.bracket[0] === '11,15');
    assert.ok(macroBin, 'Must produce a macro-headcount coalesced cabinet with bracket [11,15]');
    assert.strictEqual(macroBin.total, 30);
    assert.deepStrictEqual(macroBin.seniority, ['director', 'founder', 'vp']);
    assert.strictEqual(macroBin.mode, 'Top-Down Only'); // 30 <= 125
  });

  it('coalesces sparse seniorities across disjoint decomposed headcounts when one is kept intact', async () => {
    // 11,11 (400 > 300) -> decomposed
    // 12,12 (200 <= 300) -> intact
    // 13,13 (400 > 300) -> decomposed
    const mockCounts = {
      'ROOT': 1000,
      '11,13': 1000,
      '11,12': 600,
      '11,11': 400,
      '12,12': 200,
      '13,13': 400,
      '11,11 director': 5,
      '11,11 vp': 2,
      '11,11 entry': 280,
      '13,13 director': 6,
      '13,13 vp': 3,
      '13,13 entry': 280
    };

    const probeFn = async (params) => {
      const ranges = params.organization_num_employees_ranges;
      const sen = params.person_seniorities;
      if (!ranges && !sen) return mockCounts['ROOT'];
      if (ranges && !sen) return mockCounts[ranges[0]] || 0;
      if (ranges && sen) {
        return mockCounts[`${ranges[0]} ${sen[0]}`] || 0;
      }
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['11,13']
    };

    const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      maxBidirectionalLeads: 300
    });

    // 12,12 is intact
    const intact12 = cabinets.find(c => c.bracket.length === 1 && c.bracket[0] === '12,12' && c.seniority === null);
    assert.ok(intact12, '12,12 must be intact');
    assert.strictEqual(intact12.total, 200);

    // Coalesced sparse seniorities across decomposed headcounts ['11,11', '13,13']
    // director: 5 + 6 = 11, vp: 2 + 3 = 5 -> total 16 leads
    const disjointBin = cabinets.find(c => c.isGrouped);
    assert.ok(disjointBin, 'Must produce a coalesced bin');
    assert.deepStrictEqual(disjointBin.bracket, ['11,11', '13,13']);
    assert.strictEqual(disjointBin.total, 16);
    assert.deepStrictEqual(disjointBin.seniority, ['director', 'vp']);
  });

  it('buildHashForSlice serializes multi-bracket arrays correctly into URL query params (Standard mode)', () => {
    const currentHash = '#/people?page=1&contactEmailStatus[]=unavailable';
    const cabinet = {
      label: '[11,11+13,13] [director+vp]',
      bracket: ['11,11', '13,13'],
      seniority: ['director', 'vp'],
      isGrouped: true
    };

    const hash = buildHashForSlice(currentHash, cabinet);
    assert.ok(hash.includes('organizationNumEmployeesRanges[]=11%2C11'));
    assert.ok(hash.includes('organizationNumEmployeesRanges[]=13%2C13'));
    assert.ok(hash.includes('personSeniorities[]=director'));
    assert.ok(hash.includes('personSeniorities[]=vp'));
    assert.ok(hash.includes('contactEmailStatus[]=unavailable'));
  });

  it('buildPayloadForCabinet maps multi-bracket arrays to organization_num_employees_ranges (Turbo mode)', () => {
    const baseFilters = { person_locations: ['Bengaluru, India'] };
    const cabinet = {
      bracket: ['11,11', '13,13', '14,14'],
      seniority: ['founder', 'owner', 'director'],
      isGrouped: true
    };

    const payload = buildPayloadForCabinet(baseFilters, cabinet);
    assert.deepStrictEqual(payload.organization_num_employees_ranges, ['11,11', '13,13', '14,14']);
    assert.deepStrictEqual(payload.person_seniorities, ['founder', 'owner', 'director']);
    assert.deepStrictEqual(payload.person_locations, ['Bengaluru, India']);
  });

  it('bin-packs headcounts across multiple integers for a single seniority (e.g. manager) when total exceeds 300', async () => {
    // 5 headcounts all exceeding 300 total leads
    const mockCounts = {
      'ROOT': 2000,
      '11,15': 2000,
      '11,13': 1200,
      '14,15': 800,
      '11,12': 800,
      '11,11': 450,
      '12,12': 450,
      '13,13': 400,
      '14,14': 400,
      '15,15': 400,
      // manager counts across all 5 headcounts (total = 108 + 87 + 63 + 60 + 66 = 384 > 300)
      '11,11 manager': 108,
      '12,12 manager': 87,
      '13,13 manager': 63,
      '14,14 manager': 60,
      '15,15 manager': 66
    };

    const probeFn = async (params) => {
      const ranges = params.organization_num_employees_ranges;
      const sen = params.person_seniorities;
      if (!ranges && !sen) return mockCounts['ROOT'];
      if (ranges && !sen) return mockCounts[ranges[0]] || 0;
      if (ranges && sen) {
        return mockCounts[`${ranges[0]} ${sen[0]}`] || 0;
      }
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['11,15'],
      person_seniorities: ['manager']
    };

    const cabinets = await resolveAdaptiveExecutionTree(probeFn, basePayload, {
      maxLeadsPerCabinet: 125,
      maxBidirectionalLeads: 300
    });

    // Instead of 5 individual cabinets, manager must be packed into exactly 2 multi-headcount cabinets!
    assert.strictEqual(cabinets.length, 2, 'Manager must be coalesced into exactly 2 cabinets');

    // Bin 1: 108 + 87 + 66 = 261 <= 300
    const bin1 = cabinets.find(c => c.total === 261);
    assert.ok(bin1, 'Must have a bin with 261 leads');
    assert.strictEqual(bin1.seniority, 'manager');
    assert.strictEqual(bin1.isGrouped, true);
    assert.deepStrictEqual(bin1.bracket.sort(), ['11,11', '12,12', '15,15']);

    // Bin 2: 63 + 60 = 123 <= 300
    const bin2 = cabinets.find(c => c.total === 123);
    assert.ok(bin2, 'Must have a bin with 123 leads');
    assert.strictEqual(bin2.seniority, 'manager');
    assert.strictEqual(bin2.isGrouped, true);
    assert.deepStrictEqual(bin2.bracket.sort(), ['13,13', '14,14']);
  });

});

