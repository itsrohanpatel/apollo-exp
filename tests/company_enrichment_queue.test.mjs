import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CompanyEnrichmentEngine,
  mergeEnrichedCompanyToPerson
} from '../extension/slicer_core.js';

test('Bidirectional People -> Company Background Enrichment Queue', async (t) => {
  await t.test('mergeEnrichedCompanyToPerson immutably enriches person lead with org tech, funding, revenue, and description', () => {
    const originalPerson = Object.freeze({
      id: 'person_123',
      name: 'Rohan Sharma',
      company_id: 'org_abc',
      company_name: 'TechFlow Inc',
      company_employees: 45,
      company_industry: 'Information Technology',
      company_technologies: '',
      company_funding: '',
      company_revenue: '',
      company_keywords: 'saas; cloud'
    });

    const enrichedOrg = Object.freeze({
      id: 'org_abc',
      company_name: 'TechFlow Inc',
      technologies: 'AWS; React; PostgreSQL; Docker; Stripe',
      total_funding: '$12,500,000',
      revenue: '$5.2M',
      short_description: 'Next-generation cloud orchestration platform for enterprise teams.',
      keywords: 'saas; devops; kubernetes'
    });

    const enrichedPerson = mergeEnrichedCompanyToPerson(originalPerson, enrichedOrg);

    // Assert immutability: returns new object
    assert.notEqual(enrichedPerson, originalPerson, 'Must return a new object instance');

    // Assert enriched fields
    assert.equal(enrichedPerson.company_technologies, 'AWS; React; PostgreSQL; Docker; Stripe');
    assert.equal(enrichedPerson.company_funding, '$12,500,000');
    assert.equal(enrichedPerson.company_revenue, '$5.2M');
    assert.equal(enrichedPerson.company_description, 'Next-generation cloud orchestration platform for enterprise teams.');

    // Existing fields preserved
    assert.equal(enrichedPerson.name, 'Rohan Sharma');
    assert.equal(enrichedPerson.company_employees, 45);
    assert.equal(enrichedPerson.company_industry, 'Information Technology');

    // Keywords merged cleanly without duplicate entries
    const kwList = enrichedPerson.company_keywords.split('; ').map(s => s.trim());
    assert.ok(kwList.includes('saas'));
    assert.ok(kwList.includes('cloud'));
    assert.ok(kwList.includes('devops'));
    assert.ok(kwList.includes('kubernetes'));
  });

  await t.test('CompanyEnrichmentEngine deduplicates enqueued IDs and ignores duplicates and already enriched orgs', async () => {
    const fetchedIds = [];
    const mockFetcher = async (id) => {
      fetchedIds.push(id);
      return {
        id,
        name: `Company ${id}`,
        technologies: 'Node.js; Redis',
        total_funding: '$2M'
      };
    };

    const engine = new CompanyEnrichmentEngine({
      concurrency: 2,
      batchDelayMs: 10,
      fetcher: mockFetcher
    });

    // Enqueue duplicates and whitespace/empty
    engine.enqueue(['org_1', 'org_2', 'org_1', '', null, 'org_2', 'org_3']);
    assert.equal(engine.getStatus().pending, 3, 'Pending queue should only contain 3 unique valid IDs');

    await engine.processQueue();

    assert.equal(fetchedIds.length, 3, 'Fetcher should be called exactly once per unique ID');
    assert.deepEqual(fetchedIds.sort(), ['org_1', 'org_2', 'org_3']);
    assert.equal(engine.getStatus().enriched, 3, 'Enriched count should be 3');
    assert.equal(engine.getStatus().pending, 0, 'Pending queue should be 0');

    // Re-enqueuing already enriched IDs should be ignored
    engine.enqueue(['org_1', 'org_4']);
    assert.equal(engine.getStatus().pending, 1, 'Only non-enriched org_4 should be enqueued');
  });

  await t.test('CompanyEnrichmentEngine concurrency respects batch limits and invokes onCompanyEnriched callback', async () => {
    let peakConcurrency = 0;
    let currentInFlight = 0;
    const enrichedEvents = [];

    const mockFetcher = async (id) => {
      currentInFlight++;
      peakConcurrency = Math.max(peakConcurrency, currentInFlight);
      await new Promise(r => setTimeout(r, 20));
      currentInFlight--;
      return {
        id,
        name: `Org ${id}`,
        technologies: 'React; TypeScript'
      };
    };

    const engine = new CompanyEnrichmentEngine({
      concurrency: 2,
      batchDelayMs: 5,
      fetcher: mockFetcher,
      onCompanyEnriched: (org) => {
        enrichedEvents.push(org.id);
      }
    });

    engine.enqueue(['c1', 'c2', 'c3', 'c4', 'c5']);
    await engine.processQueue();

    assert.ok(peakConcurrency <= 2, `Peak concurrency (${peakConcurrency}) must not exceed limit (2)`);
    assert.equal(enrichedEvents.length, 5, 'Callback should fire for each enriched company');
    assert.deepEqual(enrichedEvents.sort(), ['c1', 'c2', 'c3', 'c4', 'c5']);
  });

  await t.test('CompanyEnrichmentEngine gracefully handles 429 rate limit or network errors without crashing', async () => {
    let callCount = 0;
    const mockFetcher = async (id) => {
      callCount++;
      if (id === 'org_fail') {
        const err = new Error('HTTP 429 Too Many Requests');
        err.status = 429;
        throw err;
      }
      return { id, name: 'Success Org' };
    };

    const engine = new CompanyEnrichmentEngine({
      concurrency: 1,
      batchDelayMs: 5,
      fetcher: mockFetcher
    });

    engine.enqueue(['org_fail', 'org_ok']);
    await engine.processQueue();

    // The failed ID should be handled, engine should finish without throwing unhandled rejection
    assert.equal(engine.getStatus().enriched, 1, 'Only successful org should be counted in enriched cache');
    assert.equal(engine.getStatus().pending, 0, 'Pending queue should clear');
  });

  await t.test('Instant enrichment from cache: getEnriched returns cached org if already processed', async () => {
    const engine = new CompanyEnrichmentEngine({
      fetcher: async (id) => ({ id, name: 'FastCo', technologies: 'GraphQL' })
    });

    engine.enqueue('fast_1');
    await engine.processQueue();

    const cached = engine.getEnriched('fast_1');
    assert.ok(cached, 'Cached org should be retrieved');
    assert.equal(cached.technologies, 'GraphQL');
    assert.equal(engine.isEnriched('fast_1'), true);
    assert.equal(engine.isEnriched('unknown_id'), false);
  });
});
