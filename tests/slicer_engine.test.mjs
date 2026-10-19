import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateUniversalHeadcountSlices,
  generatePacingDelay,
  DeduplicationStore,
  buildExclusionPayload,
  parseApolloUrlHash,
  resolveHarvestExecutionPlan,
  shouldEngageCabinetDrain,
  CabinetExclusionTracker,
  buildCabinetDrainPayload
} from '../extension/slicer_core.js';

describe('Universal Headcount Slicer Engine', () => {
  test('generates valid contiguous headcount brackets covering 1 to 10001+', () => {
    const slices = generateUniversalHeadcountSlices();
    assert.ok(Array.isArray(slices), 'Slices must be an array');
    assert.ok(slices.length >= 10, 'Must have at least 10 primary brackets');

    // Check first slice starts at 1
    assert.deepEqual(slices[0], ['1,10'], 'First slice should be 1,10');
    // Check upper bound contains 10001
    const lastSlice = slices[slices.length - 1];
    assert.ok(lastSlice.includes('10001'), 'Last slice must cover 10001+ enterprise band');
  });

  test('subdivides high-volume brackets into micro-ranges when requested', () => {
    const granularSlices = generateUniversalHeadcountSlices({ granular: true });
    assert.ok(granularSlices.length > 20, 'Granular mode must generate 20+ fine-grained slices');
    
    // Check that micro ranges like 1,1 or 100,105 exist
    const hasMicroRanges = granularSlices.some(s => s[0] === '1,2' || s[0] === '1,1' || s[0] === '100,105');
    assert.ok(hasMicroRanges, 'Must contain micro-range slices');
  });

  test('generates safe humanized pacing delay within safe bounds (2000ms - 3800ms)', () => {
    for (let i = 0; i < 50; i++) {
      const delay = generatePacingDelay(2000, 3800);
      assert.ok(delay >= 2000, `Delay ${delay} must be >= minDelay 2000`);
      assert.ok(delay <= 3800, `Delay ${delay} must be <= maxDelay 3800`);
    }
  });

  test('DeduplicationStore accurately tracks unique leads and rejects duplicates', () => {
    const store = new DeduplicationStore();
    
    const lead1 = { id: 'lead_abc_1', name: 'Alice Smith', linkedin_url: 'https://linkedin.com/in/alice' };
    const lead2 = { id: 'lead_xyz_2', name: 'Bob Jones', linkedin_url: 'https://linkedin.com/in/bob' };
    const lead1Duplicate = { id: 'lead_abc_1', name: 'Alice Smith Updated', linkedin_url: 'https://linkedin.com/in/alice' };
    const leadWithoutId = { id: '', name: 'Charlie Brown', linkedin_url: 'https://linkedin.com/in/charlie' };
    const leadWithoutIdDup = { id: '', name: 'Charlie Brown', linkedin_url: 'https://linkedin.com/in/charlie' };

    assert.equal(store.add(lead1), true, 'Lead 1 should be added');
    assert.equal(store.add(lead2), true, 'Lead 2 should be added');
    assert.equal(store.add(lead1Duplicate), false, 'Duplicate Lead 1 must be rejected');
    assert.equal(store.add(leadWithoutId), true, 'Lead without ID should deduplicate via LinkedIn URL');
    assert.equal(store.add(leadWithoutIdDup), false, 'Duplicate without ID must be rejected');

    assert.equal(store.size(), 3, 'Store must contain exactly 3 unique leads');
    assert.deepEqual(store.getIds(), ['lead_abc_1', 'lead_xyz_2']);
  });

  test('buildExclusionPayload injects excluded_organization_ids and person_ids_excluded correctly', () => {
    const basePayload = {
      person_locations: ['Ahmedabad, Gujarat, India'],
      page: 1,
      per_page: 25
    };
    const orgIds = ['org_123', 'org_456'];
    const personIds = ['person_789'];

    const mutated = buildExclusionPayload(basePayload, orgIds, personIds);

    assert.equal(mutated.page, 1, 'Page should remain 1 in moving window mode');
    assert.deepEqual(mutated.organization_ids_excluded, orgIds);
    assert.deepEqual(mutated.person_ids_excluded, personIds);
    assert.deepEqual(mutated.person_locations, ['Ahmedabad, Gujarat, India'], 'Preserves original filters');
  });

  test('parseApolloUrlHash automatically extracts filters from active browser URL hash', () => {
    const rawUrl = 'https://app.apollo.io/#/people?page=2&personTitles[]=CEO&personTitles[]=Founder&personLocations[]=Ahmedabad%2C%20Gujarat%2C%20India&contactEmailStatus[]=verified&organizationNumEmployeesRanges[]=21%2C50';

    const parsed = parseApolloUrlHash(rawUrl);

    assert.deepEqual(parsed.person_titles, ['CEO', 'Founder']);
    assert.deepEqual(parsed.person_locations, ['Ahmedabad, Gujarat, India']);
    assert.deepEqual(parsed.contact_email_status, ['verified']);
    assert.deepEqual(parsed.organization_num_employees_ranges, ['21,50']);

    // Test new URL with c_suite department, exist_fields, and open range 5,
    const newUrl = 'https://app.apollo.io/#/people?personLocations[]=Ahmedabad%2C%20Gujarat%2C%20India&sortAscending=false&sortByField=%5Bnone%5D&contactEmailStatus[]=verified&personDepartmentOrSubdepartments[]=c_suite&organizationNumEmployeesRanges[]=5%2C&existFields[]=organization_domain&page=1&recommendationConfigId=6acdb4b72dd2d30001a1bc91';
    const parsedNew = parseApolloUrlHash(newUrl);
    assert.deepEqual(parsedNew.person_department_or_subdepartments, ['c_suite']);
    assert.deepEqual(parsedNew.exist_fields, ['organization_domain']);
    assert.deepEqual(parsedNew.organization_num_employees_ranges, ['5,']);

    // Test user exact URL with negative keywords and excluded fields
    const userUrl = 'https://app.apollo.io/#/people?organizationNumEmployeesRanges[]=50%2C&personLocations[]=Ahmedabad%2C%20India&existFields[]=organization_domain&personDepartmentOrSubdepartments[]=c_suite&qNotOrganizationKeywordTags[]=staffing&qNotOrganizationKeywordTags[]=human&qNotOrganizationKeywordTags[]=hiring&qNotOrganizationKeywordTags[]=staff&excludedOrganizationKeywordFields[]=tags&excludedOrganizationKeywordFields[]=name&excludedOrganizationKeywordFields[]=social_media_description&page=1&recommendationConfigId=6acdb4b72dd2d30001a1bc91';
    const parsedUser = parseApolloUrlHash(userUrl);
    assert.deepEqual(parsedUser.organization_num_employees_ranges, ['50,']);
    assert.deepEqual(parsedUser.person_locations, ['Ahmedabad, India']);
    assert.deepEqual(parsedUser.exist_fields, ['organization_domain']);
    assert.deepEqual(parsedUser.person_department_or_subdepartments, ['c_suite']);
    assert.deepEqual(parsedUser.q_not_organization_keyword_tags, ['staffing', 'human', 'hiring', 'staff']);
    assert.deepEqual(parsedUser.excluded_organization_keyword_fields, ['tags', 'name', 'social_media_description']);
    assert.equal(parsedUser.recommendation_config_id, '6acdb4b72dd2d30001a1bc91');
  });

  test('resolveHarvestExecutionPlan extracts user custom brackets, expands open range 5,, or defaults to 10 universal brackets', () => {
    // Case A: User has specific headcount brackets in their search
    const userSearchWithBrackets = {
      organization_num_employees_ranges: ['21,50', '51,100', '101,200']
    };
    const planA = resolveHarvestExecutionPlan(userSearchWithBrackets);
    assert.deepEqual(planA, [['21,50'], ['51,100'], ['101,200']], 'Should use exact user-defined brackets');

    // Case B: User has no headcount brackets in their search (e.g. all CEOs)
    const userSearchBroad = {
      person_titles: ['CEO']
    };
    const planB = resolveHarvestExecutionPlan(userSearchBroad);
    assert.equal(planB.length, 10, 'Should default to 10 universal brackets covering all companies');

    // Case C: User has an open-ended range like "5," (5+ employees)
    const userSearchOpenRange = {
      organization_num_employees_ranges: ['5,']
    };
    const planC = resolveHarvestExecutionPlan(userSearchOpenRange);
    assert.equal(planC.length, 10, 'Should expand open range 5, into 10 clean continuous sub-brackets');
    assert.deepEqual(planC[0], ['5,10'], 'First sub-bracket should start at 5 (5,10)');
    assert.deepEqual(planC[planC.length - 1], ['10001'], 'Last sub-bracket should be 10001+');

    // Case D: User has an open-ended range "50," (50+ employees) - must NOT include < 50 or 50,10!
    const userSearchOpenRange50 = {
      organization_num_employees_ranges: ['50,']
    };
    const planD = resolveHarvestExecutionPlan(userSearchOpenRange50);
    assert.equal(planD.length, 8, 'Should produce 8 brackets covering 50 to 10001+');
    assert.deepEqual(planD[0], ['50,50'], 'First sub-bracket must be 50,50');
    assert.deepEqual(planD[1], ['51,100'], 'Second sub-bracket must be 51,100');
    assert.deepEqual(planD[planD.length - 1], ['10001'], 'Last sub-bracket must be 10001+');
    // Ensure no brackets have min > max or max < 50
    for (const b of planD) {
      const parts = b[0].split(',').map(Number);
      if (parts.length === 2) {
        assert.ok(parts[0] <= parts[1], `Bracket ${b[0]} has min > max!`);
        assert.ok(parts[1] >= 50, `Bracket ${b[0]} has max < 50!`);
      }
    }
  });

  test('shouldEngageCabinetDrain detects when cabinet exceeds 5 pages (125 leads)', () => {
    // 50 leads total -> does not need cabinet drain (fits in 2 pages)
    assert.equal(shouldEngageCabinetDrain(50, 50), false);
    // 125 leads total -> fits in 5 pages exactly
    assert.equal(shouldEngageCabinetDrain(125, 125), false);
    // 1,107 leads total (like Ahmedabad 21-50 bracket) and 125 harvested -> engage drain
    assert.equal(shouldEngageCabinetDrain(1107, 125), true);
    // 669 leads total and 125 harvested -> engage drain
    assert.equal(shouldEngageCabinetDrain(669, 125), true);
    // 1,107 leads total, but already drained all 1107 -> do not engage drain
    assert.equal(shouldEngageCabinetDrain(1107, 1107), false);
  });

  test('CabinetExclusionTracker tracks IDs per cabinet and resets cleanly between brackets', () => {
    const tracker = new CabinetExclusionTracker();
    
    // Cabinet 1: 21,50
    tracker.addLead({ id: 'p_1', organization_id: 'org_1' });
    tracker.addLead({ id: 'p_2', organization: { id: 'org_2' } });
    tracker.addLead({ id: 'p_1' }); // duplicate in cabinet

    assert.equal(tracker.size(), 2);
    assert.deepEqual(tracker.getPersonIds(), ['p_1', 'p_2']);
    assert.deepEqual(tracker.getOrgIds(), ['org_1', 'org_2']);

    // Build payload for cabinet 1
    const base = { person_titles: ['CEO'] };
    const payload1 = buildCabinetDrainPayload(base, ['21,50'], tracker);
    assert.equal(payload1.page, 1);
    assert.deepEqual(payload1.organization_num_employees_ranges, ['21,50']);
    assert.deepEqual(payload1.person_ids_excluded, ['p_1', 'p_2']);
    assert.deepEqual(payload1.organization_ids_excluded, ['org_1', 'org_2']);

    // Reset for Cabinet 2: 51,100
    tracker.reset();
    assert.equal(tracker.size(), 0);
    assert.deepEqual(tracker.getPersonIds(), []);
    assert.deepEqual(tracker.getOrgIds(), []);

    // Add lead in cabinet 2
    tracker.addLead({ id: 'p_3', organization_id: 'org_3' });
    const payload2 = buildCabinetDrainPayload(base, ['51,100'], tracker);
    assert.deepEqual(payload2.organization_num_employees_ranges, ['51,100']);
    assert.deepEqual(payload2.person_ids_excluded, ['p_3']);
    // Notice: p_1 and p_2 are NOT in payload2! This keeps payload lean and fast!
    assert.ok(!payload2.person_ids_excluded.includes('p_1'));
  });
});

