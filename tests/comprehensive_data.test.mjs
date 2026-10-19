import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenRecord,
  inferSeniority,
  extractPastExperience,
  normalizePersonComprehensive,
  normalizeCompanyComprehensive,
  buildUnionCSV,
  PREFERRED_PERSON_COLUMNS,
  PREFERRED_COMPANY_COLUMNS
} from '../extension/slicer_core.js';

test('Comprehensive Zero-Data-Loss Normalization & Union CSV Suite', async (t) => {
  await t.test('flattenRecord correctly handles primitives, nested objects, and arrays', () => {
    const raw = {
      id: '123',
      title: 'VP Engineering',
      emptyField: null,
      tags: ['SaaS', 'B2B', 'AI'],
      emptyList: [],
      org: {
        name: 'Acme Corp',
        address: {
          city: 'San Francisco',
          zip: '94105'
        }
      },
      phone_numbers: [
        { type: 'work', number: '+1 555-0100' },
        { type: 'mobile', number: '+1 555-0200' }
      ]
    };

    const flat = flattenRecord(raw);

    assert.equal(flat.id, '123');
    assert.equal(flat.title, 'VP Engineering');
    assert.equal(flat.emptyField, '');
    assert.equal(flat.tags, 'SaaS; B2B; AI');
    assert.equal(flat.emptyList, '');
    assert.equal(flat.org_name, 'Acme Corp');
    assert.equal(flat.org_address_city, 'San Francisco');
    assert.equal(flat.org_address_zip, '94105');
    assert.ok(flat.phone_numbers.includes('+1 555-0100'));
  });

  await t.test('normalizePersonComprehensive captures all Apollo person and organization fields without dropping any', () => {
    const apolloPersonSample = {
      id: 'p_101',
      first_name: 'Alex',
      last_name: 'Rivera',
      name: 'Alex Rivera',
      linkedin_url: 'https://linkedin.com/in/alexrivera',
      title: 'Chief Technology Officer',
      headline: 'CTO at CloudScale',
      seniority: 'c_suite',
      email: 'alex@cloudscale.io',
      email_status: 'verified',
      time_zone: 'America/Los_Angeles',
      formatted_address: '100 Market St, San Francisco, CA',
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      postal_code: '94105',
      extrapolated_email_confidence: 0.98,
      email_domain_catchall: false,
      revealed_for_current_team: true,
      employment_history: [{ title: 'VP Eng', company_name: 'PriorCorp' }],
      organization_id: 'org_505',
      organization: {
        id: 'org_505',
        name: 'CloudScale Inc',
        website_url: 'https://cloudscale.io',
        primary_domain: 'cloudscale.io',
        phone: '+1 415-555-0199',
        primary_phone: { number: '+1 415-555-0199' },
        founded_year: 2018,
        estimated_num_employees: 120,
        annual_revenue_printed: '25.0M',
        annual_revenue: 25000000,
        industry: 'Computer Software',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
        sic_codes: ['7371', '7372'],
        naics_codes: ['541511'],
        alexa_ranking: 15420,
        organization_headcount_six_month_growth: 0.15
      }
    };

    const norm = normalizePersonComprehensive(apolloPersonSample);

    // Standard convenience columns
    assert.equal(norm.id, 'p_101');
    assert.equal(norm.full_name, 'Alex Rivera');
    assert.equal(norm.email, 'alex@cloudscale.io');
    assert.equal(norm.company_name, 'CloudScale Inc');
    assert.equal(norm.company_domain, 'cloudscale.io');
    assert.equal(norm.company_revenue, '25.0M');
    assert.equal(norm.company_employees, 120);

    // Every raw and nested column is preserved
    assert.equal(norm.extrapolated_email_confidence, 0.98);
    assert.equal(norm.email_domain_catchall, false);
    assert.equal(norm.revealed_for_current_team, true);
    assert.equal(norm.organization_alexa_ranking, 15420);
    assert.equal(norm.organization_sic_codes, '7371; 7372');
    assert.equal(norm.organization_naics_codes, '541511');
    assert.equal(norm.organization_technologies, 'React; Node.js; PostgreSQL; Docker');
    assert.equal(norm.organization_organization_headcount_six_month_growth, 0.15);
    assert.ok(norm.employment_history.includes('PriorCorp'));
  });

  await t.test('normalizeCompanyComprehensive captures all Apollo organization fields without dropping any', () => {
    const apolloOrgSample = {
      id: 'org_808',
      name: 'Apex Robotics',
      primary_domain: 'apexrobotics.ai',
      website_url: 'https://apexrobotics.ai',
      linkedin_url: 'https://linkedin.com/company/apex-robotics',
      twitter_url: 'https://twitter.com/apexrobotics',
      facebook_url: 'https://facebook.com/apexrobotics',
      angellist_url: 'https://angel.co/company/apexrobotics',
      crunchbase_url: 'https://crunchbase.com/organization/apexrobotics',
      phone: '+1 617-555-8800',
      primary_phone: {
        number: '+1 617-555-8800',
        sanitized_number: '+16175558800'
      },
      sanitized_phone: '+16175558800',
      founded_year: 2021,
      estimated_num_employees: 45,
      organization_num_employees_range: '21-50',
      organization_revenue_printed: '12.5M',
      organization_revenue: 12500000,
      industry: 'Industrial Automation',
      keywords: ['Robotics', 'Computer Vision', 'Embedded AI'],
      technologies: ['C++', 'ROS2', 'PyTorch', 'NVIDIA Jetson'],
      sic_codes: ['3569', '3625'],
      naics_codes: ['333249'],
      alexa_ranking: 45012,
      total_funding_printed: '8.2M',
      latest_funding_round_date: '2023-09-15',
      latest_funding_stage_cd: 'series_a',
      short_description: 'Autonomous robotics for smart manufacturing warehouses.',
      owned_by_organization_name: 'Apex Industrial Holdings',
      intent_strength: 'high',
      show_intent: true,
      has_intent_signal_account: true,
      organization_headcount_six_month_growth: 0.28,
      organization_headcount_twelve_month_growth: 0.55
    };

    const norm = normalizeCompanyComprehensive(apolloOrgSample);

    assert.equal(norm.id, 'org_808');
    assert.equal(norm.company_name, 'Apex Robotics');
    assert.equal(norm.domain, 'apexrobotics.ai');
    assert.equal(norm.revenue, '12.5M');
    assert.equal(norm.employees, 45);
    assert.equal(norm.keywords, 'Robotics; Computer Vision; Embedded AI');
    assert.equal(norm.technologies, 'C++; ROS2; PyTorch; NVIDIA Jetson');
    assert.equal(norm.sic_codes, '3569; 3625');
    assert.equal(norm.naics_codes, '333249');
    assert.equal(norm.alexa_ranking, 45012);
    assert.equal(norm.total_funding, '8.2M');
    assert.equal(norm.latest_funding_round, '2023-09-15');
    assert.equal(norm.intent_strength, 'high');
    assert.equal(norm.primary_phone_sanitized_number, '+16175558800');
    assert.equal(norm.owned_by_organization_name, 'Apex Industrial Holdings');
    assert.equal(norm.organization_headcount_twelve_month_growth, 0.55);
  });

  await t.test('buildUnionCSV includes columns that appear only in sparse subset of records', () => {
    const item1 = {
      id: '1',
      name: 'Alice',
      title: 'CEO',
      custom_metric_a: 'Alpha'
    };
    const item2 = {
      id: '2',
      name: 'Bob',
      title: 'CTO',
      special_patent_number: 'US-998877'
    };

    const csv = buildUnionCSV([item1, item2], ['id', 'name', 'title']);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    const headerLine = lines[0];
    const headers = headerLine.split(',');

    // Both unique keys must exist in the header line
    assert.ok(headers.includes('custom_metric_a'), 'custom_metric_a must be in CSV headers');
    assert.ok(headers.includes('special_patent_number'), 'special_patent_number must be in CSV headers');
    assert.equal(headers[0], 'id');
    assert.equal(headers[1], 'name');
    assert.equal(headers[2], 'title');

    // Values in row 1
    const row1 = lines[1];
    assert.ok(row1.includes('Alpha'));

    // Values in row 2
    const row2 = lines[2];
    assert.ok(row2.includes('US-998877'));
  });

  await t.test('normalizeCompanyComprehensive resolves exact employee headcount from estimated_num_employees, num_employees, or range', () => {
    // 1. Full enriched organization with exact headcount (like Flash Moving Service: 3)
    const enrichedOrg1 = {
      id: '663fa37b89d7f800017aa572',
      name: 'Flash Moving Service',
      estimated_num_employees: 3,
      city: 'Tracy',
      state: 'California',
      country: 'United States',
      raw_address: 'Tracy, California, United States',
      technology_names: ['CloudFlare', 'Google Analytics', 'WordPress']
    };
    const norm1 = normalizeCompanyComprehensive(enrichedOrg1);
    assert.equal(norm1.employees, 3);
    assert.equal(norm1.city, 'Tracy');
    assert.equal(norm1.state, 'California');
    assert.equal(norm1.technologies, 'CloudFlare; Google Analytics; WordPress');

    // 2. Organization with employee count under num_employees
    const enrichedOrg2 = {
      id: 'org_2',
      name: 'Beta Co',
      num_employees: 8
    };
    const norm2 = normalizeCompanyComprehensive(enrichedOrg2);
    assert.equal(norm2.employees, 8);

    // 3. Lightweight search stub before enrichment with range fallback
    const stubOrg = {
      id: 'org_3',
      name: 'Gamma LLC',
      organization_num_employees_range: '1,10'
    };
    const norm3 = normalizeCompanyComprehensive(stubOrg);
    assert.equal(norm3.employees, '1,10');
  });

  await t.test('inferSeniority accurately resolves seniority level from job titles', () => {
    assert.equal(inferSeniority('Founder & CEO'), 'founder');
    assert.equal(inferSeniority('Co-Founder, Chief Product Officer'), 'founder');
    assert.equal(inferSeniority('Vice President of Sales'), 'vp');
    assert.equal(inferSeniority('Chief Technology Officer'), 'c_suite');
    assert.equal(inferSeniority('Head of Engineering'), 'head');
    assert.equal(inferSeniority('Director of Marketing'), 'director');
    assert.equal(inferSeniority('Engineering Manager'), 'manager');
    assert.equal(inferSeniority('Senior Software Architect'), 'senior');
    assert.equal(inferSeniority('Software Engineer'), 'individual_contributor');
    assert.equal(inferSeniority('Marketing Intern'), 'intern');
  });

  await t.test('extractPastExperience extracts past companies and titles from employment_history', () => {
    const history = [
      { organization_name: 'Gates Foundation', title: 'Co-chair' },
      { organization_name: 'Breakthrough Energy', title: 'Founder' },
      { organization_name: 'Microsoft', title: 'Co-founder' },
      { organization_name: 'Microsoft', title: 'CEO' } // duplicate company should not duplicate name
    ];
    const exp = extractPastExperience(history);
    assert.equal(exp.past_companies, 'Gates Foundation; Breakthrough Energy; Microsoft');
    assert.equal(exp.past_titles, 'Co-chair; Founder; Co-founder; CEO');
  });

  await t.test('normalizePersonComprehensive populates past experience, seniority, and rich company fallback data', () => {
    const raw = {
      id: 'p_999',
      title: 'Head of Sales',
      photo_url: 'https://media.licdn.com/photo123.jpg',
      employment_history: [
        { organization_name: 'Acme', title: 'Sales Rep' },
        { organization_name: 'Beta Corp', title: 'Senior Account Exec' }
      ],
      organization: {
        id: 'org_999',
        name: 'Target Inc',
        number_of_employees: 45, // Apollo search uses number_of_employees
        industries: ['SaaS', 'Fintech'], // Array of industries
        technology_names: ['React', 'Postgres', 'AWS'],
        keywords: ['payments', 'b2b'],
        total_funding_printed: '$15M',
        annual_revenue_printed: '$5M - $10M'
      }
    };

    const norm = normalizePersonComprehensive(raw);
    assert.equal(norm.seniority, 'head');
    assert.equal(norm.photo_url, 'https://media.licdn.com/photo123.jpg');
    assert.equal(norm.past_companies, 'Acme; Beta Corp');
    assert.equal(norm.past_titles, 'Sales Rep; Senior Account Exec');
    assert.equal(norm.company_employees, 45);
    assert.equal(norm.company_industry, 'SaaS; Fintech');
    assert.equal(norm.company_technologies, 'React; Postgres; AWS');
    assert.equal(norm.company_keywords, 'payments; b2b');
    assert.equal(norm.company_funding, '$15M');
    assert.equal(norm.company_revenue, '$5M - $10M');
  });

  await t.test('buildUnionCSV RFC 4180 escaping and UTF-8 BOM support', () => {
    const item = {
      id: '99',
      company_name: 'Böhm & Müller, Inc.',
      short_description: 'We do "smart" automation,\nscalable and fast.'
    };

    const csv = buildUnionCSV([item]);
    assert.ok(csv.startsWith('\uFEFF'), 'Must contain UTF-8 BOM');
    assert.ok(csv.includes('"Böhm & Müller, Inc."'), 'Commas must trigger quote wrapping');
    assert.ok(csv.includes('""smart""'), 'Internal quotes must be escaped with double quotes');
  });
});
