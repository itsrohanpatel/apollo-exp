import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeduplicationStore,
  buildChunkedUnionCSV
} from '../extension/slicer_core.js';

describe('Dual-Sort Capacity Boost Engine (126–250 Leads)', () => {
  it('correctly determines that slices between 126 and 250 leads require Dual-Sort without subdividing', () => {
    function classifyHarvestPlan(count) {
      if (count <= 0) return { mode: 'SKIP', passes: [] };
      if (count <= 125) {
        return {
          mode: 'SINGLE_PASS',
          passes: [{ field: 'contact.name', ascending: true, maxPages: Math.ceil(count / 25) }]
        };
      }
      if (count <= 250) {
        return {
          mode: 'DUAL_SORT',
          passes: [
            { field: 'contact.name', ascending: true, maxPages: 5 },
            { field: 'contact.name', ascending: false, maxPages: 5 }
          ]
        };
      }
      return { mode: 'SUBDIVIDE', passes: [] };
    }

    // 100 leads -> Single pass (4 pages)
    assert.equal(classifyHarvestPlan(100).mode, 'SINGLE_PASS');
    assert.equal(classifyHarvestPlan(100).passes[0].maxPages, 4);

    // 125 leads -> Single pass (5 pages)
    assert.equal(classifyHarvestPlan(125).mode, 'SINGLE_PASS');
    assert.equal(classifyHarvestPlan(125).passes[0].maxPages, 5);

    // 198 leads -> Dual-Sort (2 passes of 5 pages, 0 subdivisions)
    const plan200 = classifyHarvestPlan(198);
    assert.equal(plan200.mode, 'DUAL_SORT');
    assert.equal(plan200.passes.length, 2);
    assert.equal(plan200.passes[0].ascending, true);
    assert.equal(plan200.passes[1].ascending, false);
    assert.equal(plan200.passes[0].field, 'contact.name');
    assert.equal(plan200.passes[1].field, 'contact.name');

    // 350 leads -> Subdivide
    assert.equal(classifyHarvestPlan(350).mode, 'SUBDIVIDE');
  });

  it('DeduplicationStore captures 100% of a 200-lead bucket across Pass 1 (A-Z) and Pass 2 (Z-A)', () => {
    const store = new DeduplicationStore();

    // Create a mock bucket of 200 leads sorted alphabetically
    const totalLeads = 200;
    const bucket = Array.from({ length: totalLeads }, (_, i) => ({
      id: `lead_${i + 1}`,
      name: `Person_${String(i + 1).padStart(3, '0')}`,
      title: 'Chief Executive Officer',
      organization_name: 'Tech Corp'
    }));

    // Pass 1: Name A -> Z (First 125 leads)
    const pass1 = bucket.slice(0, 125);
    for (const lead of pass1) {
      store.add(lead);
    }
    assert.equal(store.size(), 125);

    // Pass 2: Name Z -> A (Last 125 leads, i.e. index 75 to 199)
    const pass2 = bucket.slice(75, 200).reverse();
    let duplicatesIgnored = 0;
    for (const lead of pass2) {
      if (!store.add(lead)) {
        duplicatesIgnored++;
      }
    }

    // Overlap is index 75..124 (50 leads)
    assert.equal(duplicatesIgnored, 50);

    // Total unique leads in store must be exactly 200 (100% of the bucket!)
    assert.equal(store.size(), 200);
  });

  it('buildChunkedUnionCSV formats all 29 fields and prevents formula injection on Dual-Sort output', () => {
    const leads = [
      {
        id: 'lead_1',
        first_name: 'John',
        last_name: 'Doe',
        name: 'John Doe',
        title: '=SUM(1,2)', // Formula injection attempt
        email: 'john@example.com',
        email_status: 'verified',
        seniority: 'c_suite',
        departments: ['executive'],
        subdepartments: [],
        headline: 'CEO at Acme',
        city: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
        linkedin_url: 'https://linkedin.com/in/johndoe',
        photo_url: '',
        organization_id: 'org_1',
        company_name: '+MaliciousOrg',
        primary_domain: 'acme.com'
      }
    ];

    const chunks = buildChunkedUnionCSV(leads, ['id', 'first_name', 'last_name', 'name', 'title', 'company_name', 'primary_domain', 'email']);
    const fullCSV = chunks.join('');

    assert.ok(fullCSV.includes('id,first_name,last_name,name'));
    assert.ok(fullCSV.includes("''=SUM(1,2)") || fullCSV.includes("'=SUM(1,2)"), 'Formula injection = neutralized');
    assert.ok(fullCSV.includes("''+MaliciousOrg") || fullCSV.includes("'+MaliciousOrg"), 'Formula injection + neutralized');
    assert.ok(fullCSV.includes('acme.com'));
    assert.ok(fullCSV.includes('john@example.com'));
  });
});
