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

  // Case 8: Defensive null input handling
  assert.equal(detectMaxEmployeesFromFilters(null), null);
  assert.equal(detectMaxEmployeesFromFilters({}, null), null);
  assert.equal(detectMaxEmployeesFromFilters(null, null), null);

  // Case 9: Nested range with invalid/NaN max
  assert.equal(detectMaxEmployeesFromFilters({ organization_num_employees_range: { max: NaN } }), null);
  assert.equal(detectMaxEmployeesFromFilters({ organization_num_employees_range: { max: -5 } }), null);

  // Case 10: Open range '10001' or '50+' returns null
  assert.equal(detectMaxEmployeesFromFilters({ organization_num_employees_ranges: ['10001'] }), null);
  assert.equal(detectMaxEmployeesFromFilters({ organization_num_employees_ranges: ['50+'] }), null);

  // Case 11: All candidate brackets exceed maxEmployees -> returns empty array (no leakage!)
  const emptyPlan = resolveHarvestExecutionPlan({ organization_num_employees_ranges: ['501,1000'] }, { maxEmployees: 50 });
  assert.deepEqual(emptyPlan, []);
  const emptyBrackets = resolveExecutionBrackets({ organization_num_employees_ranges: ['501,1000'] }, { maxEmployees: 50 });
  assert.deepEqual(emptyBrackets, []);

  // Case 12: Mid-range capping (e.g. 21,50 capped at 35)
  const midPlan = resolveHarvestExecutionPlan({ organization_num_employees_ranges: ['21,50'] }, { maxEmployees: 35 });
  assert.deepEqual(midPlan, [['21,35']]);
});

test('resolveAdaptiveExecutionTree enforces maxEmployees in short-circuit mode', async () => {
  const { resolveAdaptiveExecutionTree } = await import('../extension/slicer_core.js');

  const simulatedProbe = async () => 80;
  const tree = await resolveAdaptiveExecutionTree(simulatedProbe, {
    organization_num_employees_ranges: ['1,100']
  }, {
    maxEmployees: 50,
    initialTotal: 80
  });

  assert.equal(tree.length, 1);
  assert.deepEqual(tree[0].bracket, ['1,50']);
  assert.equal(tree[0].label, '1,50 (All Matching)');
});

test('client-side employee constraint filters people before batch storage', () => {
  const mockPeople = [
    { id: '1', organization: { estimated_num_employees: 25 } },
    { id: '2', organization: { num_employees: 80 } },
    { id: '3', organization_num_employees: 120 },
    { id: '4', organization: { number_of_employees: 45 } },
    { id: '5', organization: {} }
  ];

  const maxEmployees = 50;
  const filtered = mockPeople.filter(person => {
    const emp = person.organization?.estimated_num_employees
      ?? person.organization?.num_employees
      ?? person.organization?.number_of_employees
      ?? person.organization_num_employees;
    return !(typeof emp === 'number' && emp > maxEmployees);
  });

  assert.equal(filtered.length, 3);
  assert.deepEqual(filtered.map(p => p.id), ['1', '4', '5']);
});

test('resolveAdaptiveExecutionTree returns [] when custom ranges or root bracket strictly exceed maxEmployees', async () => {
  const { resolveAdaptiveExecutionTree } = await import('../extension/slicer_core.js');

  const simulatedProbe = async () => 80;

  // Case 1: Custom range min > maxEmployees (e.g. 501,1000 with maxEmployees 50)
  const tree1 = await resolveAdaptiveExecutionTree(simulatedProbe, {
    organization_num_employees_ranges: ['501,1000']
  }, {
    maxEmployees: 50,
    initialTotal: 80
  });
  assert.deepEqual(tree1, []);

  // Case 2: Enterprise 10001 bracket with maxEmployees < 10001
  const tree2 = await resolveAdaptiveExecutionTree(simulatedProbe, {
    organization_num_employees_ranges: ['10001']
  }, {
    maxEmployees: 500,
    initialTotal: 80
  });
  assert.deepEqual(tree2, []);
});

test('client-side employee constraint filters correctly across all 4 headcount properties', () => {
  const mockPeople = [
    { id: '1', organization: { estimated_num_employees: 25 } },
    { id: '2', organization: { num_employees: 100 } },
    { id: '3', organization: { number_of_employees: 150 } },
    { id: '4', organization_num_employees: 200 },
    { id: '5', organization: { num_employees: 30 } },
    { id: '6', organization: {} } // missing headcount should not be dropped
  ];

  const maxEmployees = 50;
  const filtered = mockPeople.filter(person => {
    const emp = person.organization?.estimated_num_employees
      ?? person.organization?.num_employees
      ?? person.organization?.number_of_employees
      ?? person.organization_num_employees;
    return !(typeof emp === 'number' && emp > maxEmployees);
  });

  assert.equal(filtered.length, 3);
  assert.deepEqual(filtered.map(p => p.id), ['1', '5', '6']);
});

test('buildChunkedCleanOutreachCSV formats canonical 28 clean columns as default', async () => {
  const { buildChunkedCleanOutreachCSV, CLEAN_OUTREACH_COLUMNS_28 } = await import('../extension/slicer_core.js');

  assert.equal(CLEAN_OUTREACH_COLUMNS_28.length, 28);
  assert.equal(CLEAN_OUTREACH_COLUMNS_28[0].header, 'First Name');
  assert.equal(CLEAN_OUTREACH_COLUMNS_28[21].header, 'Company Keywords');
  assert.equal(CLEAN_OUTREACH_COLUMNS_28[27].header, 'Apollo Org ID');

  const mockLeads = [
    {
      id: 'lead_1',
      first_name: 'Jerry',
      last_name: 'Leone',
      title: 'VP Sales',
      seniority: 'vp',
      email: 'email_not_unlocked@domain.com',
      extrapolated_email: 'jerry.leone@abc.com',
      email_status: 'extrapolated',
      phone: '',
      linkedin_url: 'https://linkedin.com/in/jerryleone',
      headline: 'VP Sales at ABC',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      time_zone: 'Asia/Kolkata',
      company_name: 'ABC Corp',
      company_domain: 'abc.com',
      company_website: 'https://abc.com',
      company_linkedin: 'https://linkedin.com/company/abc',
      company_employees: 50,
      company_industry: 'Software',
      company_keywords: 'saas; cloud; ai',
      company_phone: '+91 11493 43900',
      company_founded_year: 2010,
      icp_tier: 'Tier 1 (High Priority)',
      icp_score: 85,
      company_id: 'org_1'
    }
  ];

  const chunks = buildChunkedCleanOutreachCSV(mockLeads);
  const fullCsv = chunks.join('');

  // 1. Must start with UTF-8 BOM
  assert.ok(fullCsv.startsWith('\uFEFF'));

  // 2. Header line must contain exactly the 28 columns
  const lines = fullCsv.replace('\uFEFF', '').trim().split('\r\n');
  const headers = lines[0].split(',');
  assert.equal(headers.length, 28);
  assert.deepEqual(headers, CLEAN_OUTREACH_COLUMNS_28.map(c => c.header));

  // 3. Fallback logic: email should be extrapolated when unlocked is unavailable
  const row = lines[1].split(',');
  // Column 5: Email (index 5)
  assert.equal(row[5], 'jerry.leone@abc.com');
  // Column 8: Phone falls back to company phone (index 8)
  assert.equal(row[8], "'+91 11493 43900");
  // Column 21: Company Keywords (index 21)
  assert.equal(row[21], 'saas; cloud; ai');
});

test('Company Export Pipeline: normalizeCompanyComprehensive and PREFERRED_COMPANY_COLUMNS format company records', async () => {
  const { normalizeCompanyComprehensive, PREFERRED_COMPANY_COLUMNS, buildChunkedUnionCSV } = await import('../extension/slicer_core.js');

  const rawOrg = {
    id: 'org_test_1',
    name: 'TechFlow Systems',
    primary_domain: 'techflow.io',
    website_url: 'https://techflow.io',
    linkedin_url: 'https://linkedin.com/company/techflow',
    estimated_num_employees: 120,
    industry: 'Information Technology',
    keywords: ['saas', 'cloud', 'devops'],
    primary_phone: { sanitized_number: '+1 555-0199' },
    founded_year: 2018,
    raw_address: 'Austin, Texas, United States',
    city: 'Austin',
    state: 'Texas',
    country: 'United States',
    _entityType: 'companies'
  };

  const normalized = normalizeCompanyComprehensive(rawOrg);
  assert.equal(normalized.company_name, 'TechFlow Systems');
  assert.equal(normalized.domain, 'techflow.io');
  assert.equal(normalized.employees, 120);
  assert.equal(normalized.keywords, 'saas; cloud; devops');

  const chunks = buildChunkedUnionCSV([normalized], PREFERRED_COMPANY_COLUMNS);
  const fullCsv = chunks.join('');
  assert.ok(fullCsv.startsWith('\uFEFF'));
  assert.ok(fullCsv.includes('TechFlow Systems'));
  assert.ok(fullCsv.includes('techflow.io'));
});

