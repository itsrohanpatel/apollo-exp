import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectApolloEntityType,
  parseApolloUrlHash,
  DeduplicationStore,
  generateBidirectionalSortPlans,
  resolveHarvestExecutionPlan,
  isHighDensityBracket,
  decomposeHighDensityBracket
} from '../extension/slicer_core.js';

test('Apollo Company Harvester Core Engine', async (t) => {
  await t.test('detectApolloEntityType accurately distinguishes companies vs people URLs', () => {
    assert.equal(detectApolloEntityType('https://app.apollo.io/#/companies?page=1'), 'companies');
    assert.equal(detectApolloEntityType('https://app.apollo.io/#/companies'), 'companies');
    assert.equal(detectApolloEntityType('#/companies?organizationLocations[]=United+States'), 'companies');
    assert.equal(detectApolloEntityType('https://app.apollo.io/#/people?page=1'), 'people');
    assert.equal(detectApolloEntityType(''), 'people');
  });

  await t.test('parseApolloUrlHash extracts company-specific filters (keywords, locations, revenue, technologies)', () => {
    const companyHash = '#/companies?page=1' +
      '&organizationLocations[]=United+States' +
      '&organizationLocations[]=California%2C+US' +
      '&organizationNumEmployeesRanges[]=11%2C50' +
      '&organizationIndustryTagIds[]=5567e07d7369641775080000' +
      '&qOrganizationKeywordTags[]=artificial+intelligence' +
      '&qOrganizationKeywordTags[]=saas' +
      '&qOrganizationName=Acme' +
      '&revenueRange[min]=1000000' +
      '&revenueRange[max]=50000000' +
      '&currentlyUsingAnyOfTechnologyUids[]=salesforce' +
      '&latestFundingStageCd[]=series_a';

    const parsed = parseApolloUrlHash(companyHash);

    assert.deepEqual(parsed.organization_locations, ['United States', 'California, US']);
    assert.deepEqual(parsed.organization_num_employees_ranges, ['11,50']);
    assert.deepEqual(parsed.organization_industry_tag_ids, ['5567e07d7369641775080000']);
    assert.deepEqual(parsed.q_organization_keyword_tags, ['artificial intelligence', 'saas']);
    assert.equal(parsed.q_organization_name, 'Acme');
    assert.deepEqual(parsed.revenue_range, { min: 1000000, max: 50000000 });
    assert.deepEqual(parsed.currently_using_any_of_technology_uids, ['salesforce']);
    assert.deepEqual(parsed.latest_funding_stage_cd, ['series_a']);
  });

  await t.test('DeduplicationStore deduplicates company records by ID, domain, and company_name', () => {
    const store = new DeduplicationStore();

    const comp1 = {
      id: 'org_123',
      company_name: 'Stripe, Inc.',
      domain: 'stripe.com',
      employees: '5001,10000'
    };
    const comp1Dup = {
      id: 'org_123',
      company_name: 'Stripe',
      domain: 'stripe.com'
    };
    const comp2 = {
      company_name: 'OpenAI LLC',
      domain: 'openai.com',
      employees: '1001,5000'
    };
    const comp2Dup = {
      company_name: 'OpenAI LLC',
      domain: 'openai.com'
    };

    assert.equal(store.add(comp1), true);
    assert.equal(store.add(comp1Dup), false); // Rejected by ID
    assert.equal(store.add(comp2), true);
    assert.equal(store.add(comp2Dup), false); // Rejected by domain
    assert.equal(store.size(), 2);
  });

  await t.test('Company execution plan supports headcount decomposition and bidirectional sweeps', () => {
    const customCompanyPayload = {
      organization_num_employees_ranges: ['5,']
    };
    const slices = resolveHarvestExecutionPlan(customCompanyPayload);
    assert.equal(slices.length, 10);
    assert.deepEqual(slices[0], ['5,10']);
    assert.deepEqual(slices[9], ['10001']);

    // High density company pool > 125 triggers bidirectional sweep
    const plans = generateBidirectionalSortPlans(450);
    assert.equal(plans.length, 2);
    assert.equal(plans[0].sort_ascending, false);
    assert.equal(plans[1].sort_ascending, true);
  });
});
