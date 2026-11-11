import test from 'node:test';
import assert from 'node:assert/strict';
import { ApolloHUD } from '../extension/hud.js';

test('Metadata Preflight & Probe Flow', async (t) => {

  await t.test('Metadata Probe Payload: formats display_mode: metadata_mode and per_page: 30', () => {
    // Test payload generation logic
    const basePayload = {
      exist_fields: ['organization_domain'],
      person_locations: ['Mumbai, India'],
      organization_num_employees_ranges: ['210,210']
    };
    const filters = {
      person_seniorities: ['entry'],
      person_department_or_subdepartments: ['compensation_benefits']
    };

    // Helper matching content.js fullPayload assembly
    const assembleProbePayload = (base, f) => ({
      ...base,
      ...f,
      page: 1,
      per_page: 30,
      display_mode: 'metadata_mode',
      open_factor_names: [],
      num_fetch_result: 25
    });

    const payload = assembleProbePayload(basePayload, filters);
    assert.strictEqual(payload.display_mode, 'metadata_mode', 'Must specify metadata_mode');
    assert.strictEqual(payload.per_page, 30, 'Must specify per_page: 30 for metadata queries');
    assert.strictEqual(payload.page, 1);
    assert.deepStrictEqual(payload.person_department_or_subdepartments, ['compensation_benefits']);
    assert.deepStrictEqual(payload.organization_num_employees_ranges, ['210,210']);
  });

  await t.test('Response Total Parsing: extracts pipeline_total first with fallback to total_entries', () => {
    const extractTotal = (data) => {
      return (typeof data.pipeline_total === 'number')
        ? data.pipeline_total
        : (data.total_entries || data.pagination?.total_entries || 0);
    };

    // Case 1: Pure metadata_mode response
    const metaResponse = {
      breadcrumbs: [{ label: '# Employees', value: '210,210' }],
      pipeline_total: 459,
      faceting: {},
      num_fetch_result: 5
    };
    assert.strictEqual(extractTotal(metaResponse), 459, 'Must extract pipeline_total 459');

    // Case 2: Zero result metadata_mode response
    const zeroMetaResponse = {
      pipeline_total: 0
    };
    assert.strictEqual(extractTotal(zeroMetaResponse), 0, 'Must extract pipeline_total 0');

    // Case 3: Standard search response fallback
    const standardResponse = {
      contacts: [{ id: '1' }],
      total_entries: 125,
      pagination: { total_entries: 125 }
    };
    assert.strictEqual(extractTotal(standardResponse), 125, 'Must fallback to total_entries 125');

    // Case 4: Pagination-only fallback
    const paginationOnly = {
      pagination: { total_entries: 75 }
    };
    assert.strictEqual(extractTotal(paginationOnly), 75, 'Must fallback to pagination.total_entries 75');
  });

  await t.test('Clean Direct Start in ApolloHUD: triggers onStart callback immediately without intermediate review gate', () => {
    // Mock minimal DOM environment
    const mockElements = {};
    const createMockElement = (id) => {
      const el = {
        id,
        style: {},
        innerText: '',
        className: '',
        classList: {
          add: () => {},
          remove: () => {}
        },
        listeners: {},
        addEventListener(event, fn) {
          this.listeners[event] = fn;
        },
        querySelector(selector) {
          const matchId = selector.replace('#', '');
          return mockElements[matchId] || createMockElement(matchId);
        }
      };
      mockElements[id] = el;
      return el;
    };

    const container = createMockElement('apollo-mission-control-hud');
    const startBtn = createMockElement('apollo-hud-start-btn');

    container.querySelector = (selector) => {
      const matchId = selector.replace('#', '');
      return mockElements[matchId] || null;
    };

    let started = false;
    const hud = new ApolloHUD({
      onStart: () => { started = true; }
    });
    hud.container = container;
    hud.bindEvents();

    assert.strictEqual(started, false);
    startBtn.listeners['click']();
    assert.strictEqual(started, true, 'Clicking Start Harvest must execute onStart immediately');
  });

});
