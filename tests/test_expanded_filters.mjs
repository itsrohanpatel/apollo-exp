import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApolloUrlHash } from '../extension/slicer_core.js';

test('parseApolloUrlHash parses all expanded Apollo filters', () => {
  const hash = '#/people?page=1&sortAscending=false&sortByField=recommendations_score' +
    '&personDepartmentOrSubdepartments[]=master_human_resources' +
    '&personLocations[]=India' +
    '&organizationNumEmployeesRanges[]=50%2C' +
    '&contactEmailStatus[]=verified' +
    '&personDaysInCurrentTitleRange[max]=90' +
    '&personDaysInCurrentTitleRange[min]=10' +
    '&organizationDomains[]=apple.com&organizationDomains[]=google.com' +
    '&personTotalYearsExperience[min]=5&personTotalYearsExperience[max]=15' +
    '&organizationTechnologyNames[]=React&organizationTechnologyNames[]=AWS' +
    '&organizationNotTechnologyNames[]=Wordpress' +
    '&organizationRevenueRanges[]=1000000%2C10000000' +
    '&jobChange=recent_promotion' +
    '&organizationJobPostingTitles[]=DevOps' +
    '&organizationIntentTopicIds[]=intent_123' +
    '&personEducations[]=Stanford' +
    '&personDegreeTypes[]=bachelors' +
    '&contactStages[]=customer' +
    '&organizationIds[]=org_1&organizationNotIds[]=org_2';

  const parsed = parseApolloUrlHash(hash);

  assert.equal(parsed.sort_ascending, false);
  assert.equal(parsed.sort_by_field, 'recommendations_score');
  assert.deepEqual(parsed.person_department_or_subdepartments, ['master_human_resources']);
  assert.deepEqual(parsed.person_locations, ['India']);
  assert.deepEqual(parsed.organization_num_employees_ranges, ['50,']);
  assert.deepEqual(parsed.contact_email_status, ['verified']);
  
  // New filters
  assert.deepEqual(parsed.person_days_in_current_title_range, { min: 10, max: 90 });
  assert.deepEqual(parsed.organization_domains, ['apple.com', 'google.com']);
  assert.deepEqual(parsed.person_total_years_experience, { min: 5, max: 15 });
  assert.deepEqual(parsed.organization_technology_names, ['React', 'AWS']);
  assert.deepEqual(parsed.organization_not_technology_names, ['Wordpress']);
  assert.deepEqual(parsed.organization_revenue_ranges, ['1000000,10000000']);
  assert.equal(parsed.job_change, 'recent_promotion');
  assert.deepEqual(parsed.organization_job_posting_titles, ['DevOps']);
  assert.deepEqual(parsed.organization_intent_topic_ids, ['intent_123']);
  assert.deepEqual(parsed.person_educations, ['Stanford']);
  assert.deepEqual(parsed.person_degree_types, ['bachelors']);
  assert.deepEqual(parsed.contact_stages, ['customer']);
  assert.deepEqual(parsed.organization_ids, ['org_1']);
  assert.deepEqual(parsed.organization_not_ids, ['org_2']);
});

test('parseApolloUrlHash parses indexed array parameters', () => {
  const hash = '#/people?personTitles[0]=CEO&personTitles[1]=CTO&organizationDomains[0]=stripe.com';
  const parsed = parseApolloUrlHash(hash);
  assert.deepEqual(parsed.person_titles, ['CEO', 'CTO']);
  assert.deepEqual(parsed.organization_domains, ['stripe.com']);
});

test('parseApolloUrlHash parses organizationLinkedinUrls and sanitizes trailing href', () => {
  const url = 'https://app.apollo.io/#/people?page=1&personDepartmentOrSubdepartments[]=c_suite&organizationLinkedinUrls[]=WTKIOOjFBxlSRAgjstHMsdrjNNpUFJoSkU%20href&organizationLinkedinUrls[]=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2Fred-envelope-consulting%2F&organizationLinkedinUrls[]=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2Fneathire%2F';
  const parsed = parseApolloUrlHash(url);
  assert.deepEqual(parsed.person_department_or_subdepartments, ['c_suite']);
  assert.deepEqual(parsed.organization_linkedin_urls, [
    'WTKIOOjFBxlSRAgjstHMsdrjNNpUFJoSkU',
    'https://www.linkedin.com/company/red-envelope-consulting/',
    'https://www.linkedin.com/company/neathire/'
  ]);
});

test('parseApolloUrlHash parses all newly added Apollo filters', () => {
  const url = 'https://app.apollo.io/#/people?personLinkedinUrls[]=https%3A%2F%2Fwww.linkedin.com%2Fin%2Ftest-user%2F%20href' +
    '&personNotDepartmentOrSubdepartments[]=sales' +
    '&organizationNotDomains[]=spam.com' +
    '&contactPhoneStatus[]=verified' +
    '&contactMobilePhoneStatus[]=true' +
    '&currentlyUsingAllOfTechnologyUids[]=tech_123' +
    '&currentlyUsingNoneOfTechnologyUids[]=tech_456' +
    '&personDaysInCurrentCompanyRange[min]=365&personDaysInCurrentCompanyRange[max]=730' +
    '&organizationFoundedYearRange[min]=2015&organizationFoundedYearRange[max]=2022' +
    '&organizationOpenPositionsCountRange[min]=5' +
    '&organizationHeadcountGrowthRanges[]=growth_20' +
    '&organizationJobPostingLocations[]=New%20York' +
    '&personDegreeNames[]=Computer%20Science' +
    '&salesforceRecordId=sf_999';

  const parsed = parseApolloUrlHash(url);
  assert.deepEqual(parsed.person_linkedin_urls, ['https://www.linkedin.com/in/test-user/']);
  assert.deepEqual(parsed.person_not_department_or_subdepartments, ['sales']);
  assert.deepEqual(parsed.organization_not_domains, ['spam.com']);
  assert.deepEqual(parsed.contact_phone_status, ['verified']);
  assert.deepEqual(parsed.contact_mobile_phone_status, ['true']);
  assert.deepEqual(parsed.currently_using_all_of_technology_uids, ['tech_123']);
  assert.deepEqual(parsed.currently_using_none_of_technology_uids, ['tech_456']);
  assert.deepEqual(parsed.person_days_in_current_company_range, { min: 365, max: 730 });
  assert.deepEqual(parsed.organization_founded_year_range, { min: 2015, max: 2022 });
  assert.deepEqual(parsed.organization_open_positions_count_range, { min: 5 });
  assert.deepEqual(parsed.organization_headcount_growth_ranges, ['growth_20']);
  assert.deepEqual(parsed.organization_job_posting_locations, ['New York']);
  assert.deepEqual(parsed.person_degree_names, ['Computer Science']);
  assert.equal(parsed.salesforce_record_id, 'sf_999');
});

test('parseApolloUrlHash parses personLinkedinUrls and personNotLinkedinUrls with href sanitization', () => {
  const url = 'https://app.apollo.io/#/people?personLinkedinUrls[]=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fjohn-doe%2F%20href&personLinkedinUrls[]=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fjane-smith%2F&personNotLinkedinUrls[]=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fex-employee%2F%20HREF';
  const parsed = parseApolloUrlHash(url);
  assert.deepEqual(parsed.person_linkedin_urls, [
    'https://www.linkedin.com/in/john-doe/',
    'https://www.linkedin.com/in/jane-smith/'
  ]);
  assert.deepEqual(parsed.person_not_linkedin_urls, [
    'https://www.linkedin.com/in/ex-employee/'
  ]);
});
test('detectMaxEmployeesFromFilters extracts finite max employee limits', async () => {
  const { detectMaxEmployeesFromFilters, resolveExecutionBrackets, resolveHarvestExecutionPlan } = await import('../extension/slicer_core.js');

  // Case 1: Predefined brackets up to 50
  const max1 = detectMaxEmployeesFromFilters({ organization_num_employees_ranges: ['1,10', '11,20', '21,50'] });
  assert.equal(max1, 50);

  // Case 2: Custom range up to 100
  const max2 = detectMaxEmployeesFromFilters({ organization_num_employees_ranges: ['1,100'] });
  assert.equal(max2, 100);

  // Case 3: Upper-bounded open range ,50
  const max3 = detectMaxEmployeesFromFilters({ organization_num_employees_ranges: [',50'] });
  assert.equal(max3, 50);

  // Case 4: Nested range mapping { max: 200 }
  const max4 = detectMaxEmployeesFromFilters({ organization_num_employees_range: { min: 10, max: 200 } });
  assert.equal(max4, 200);

  // Case 5: Lower+ open range 50, (unbounded)
  const max5 = detectMaxEmployeesFromFilters({ organization_num_employees_ranges: ['50,'] });
  assert.equal(max5, null);

  // Case 6: resolveExecutionBrackets strictly caps brackets at maxEmployees = 50
  const brackets = resolveExecutionBrackets({ organization_num_employees_ranges: ['1,10', '11,20', '21,50'] });
  assert.ok(brackets.length > 0);
  for (const b of brackets) {
    const parts = b[0].split(',').map(Number);
    assert.ok(parts[0] <= 50, `Bracket min ${parts[0]} must be <= 50`);
    if (parts[1] !== undefined) {
      assert.ok(parts[1] <= 50, `Bracket max ${parts[1]} must be <= 50`);
    }
  }

  // Case 7: resolveHarvestExecutionPlan with universal fallback capped at 100
  const plans = resolveHarvestExecutionPlan({}, { maxEmployees: 100 });
  assert.deepEqual(plans, [
    ['1,10'],
    ['11,20'],
    ['21,50'],
    ['51,100']
  ]);
});
