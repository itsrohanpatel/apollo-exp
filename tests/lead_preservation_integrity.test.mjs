import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeduplicationStore, StandardModeDiagnosticLogger } from '../extension/slicer_core.js';

describe('Lead Preservation & Headcount Integrity', () => {
  it('preserves all 30 leads on a page even when organization estimated headcount exceeds bracket upper bound', () => {
    const dedupeStore = new DeduplicationStore();

    // Mock 30 leads returned by Apollo for a 13,13 search
    // In live data, Apollo returns contacts where organization.estimated_num_employees may be 14, 15, or 16
    const rawPeople = Array.from({ length: 30 }, (_, i) => ({
      id: `lead_${i + 1}`,
      name: `Person ${i + 1}`,
      title: 'Recruiter',
      organization: {
        id: `org_${i + 1}`,
        name: `Company ${i + 1}`,
        // Varied employee estimates: some at 13, some at 14, 15, 16
        estimated_num_employees: 13 + (i % 4)
      }
    }));

    // With client-side filtering removed:
    const people = rawPeople;
    let addedCount = 0;
    for (const person of people) {
      if (dedupeStore.add(person)) {
        addedCount++;
      }
    }

    assert.strictEqual(rawPeople.length, 30);
    assert.strictEqual(people.length, 30);
    assert.strictEqual(addedCount, 30, 'All 30 leads must be added to DeduplicationStore without discarding');
    assert.strictEqual(dedupeStore.size(), 30);
  });

  it('correctly tracks genuine duplicate leads across bidirectional passes without losing fresh leads', () => {
    const dedupeStore = new DeduplicationStore();

    // Pass 1: 30 unique leads
    const pass1Leads = Array.from({ length: 30 }, (_, i) => ({
      id: `lead_${i + 1}`,
      name: `Person ${i + 1}`,
      organization: { name: `Company ${i + 1}` }
    }));
    pass1Leads.forEach(p => dedupeStore.add(p));
    assert.strictEqual(dedupeStore.size(), 30);

    // Pass 2: 30 leads where 18 are overlaps from Pass 1, and 12 are fresh leads
    const pass2Leads = [
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `lead_${i + 1}`, // Overlap
        name: `Person ${i + 1}`,
        organization: { name: `Company ${i + 1}` }
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `lead_fresh_${i + 1}`, // Fresh
        name: `Fresh Person ${i + 1}`,
        organization: { name: `Fresh Company ${i + 1}` }
      }))
    ];

    let addedInPass2 = 0;
    let duplicatesInPass2 = 0;
    for (const person of pass2Leads) {
      if (dedupeStore.add(person)) {
        addedInPass2++;
      } else {
        duplicatesInPass2++;
      }
    }

    assert.strictEqual(addedInPass2, 12, 'Exactly 12 fresh leads should be added');
    assert.strictEqual(duplicatesInPass2, 18, 'Exactly 18 duplicates should be identified');
    assert.strictEqual(dedupeStore.size(), 42, 'Total unique leads must be 30 + 12 = 42');
  });

  it('diagnostic logger records 0 discrepancies when rawCount equals expectedCount (30/30)', () => {
    const logger = new StandardModeDiagnosticLogger();

    const trace = logger.recordPageTrace({
      sliceLabel: '14,14 entry',
      sliceIdx: 7,
      page: 3,
      passLabel: 'Pass 1 (A-Z)',
      expectedCount: 30,
      rawCount: 30,
      addedCount: 30,
      duplicatesFiltered: 0
    });

    assert.strictEqual(trace.isDiscrepancy, false);
    assert.strictEqual(trace.rawCount, 30);
    assert.strictEqual(trace.addedCount, 30);
    assert.strictEqual(trace.duplicatesFiltered, 0);
    assert.strictEqual(logger.getDiscrepanciesCount(), 0);
  });
});

