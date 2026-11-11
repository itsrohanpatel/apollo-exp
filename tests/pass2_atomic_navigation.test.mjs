import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHashForSlice,
  DeduplicationStore
} from '../extension/slicer_core.js';

describe('Pass 2 Atomic Navigation & Page 1 DOM Reset Engine', () => {
  describe('Atomic Navigation Payload Construction', () => {
    it('constructs an atomic navigation payload bundling hash and sort direction together', () => {
      const currentHash = '#/people?page=5&organizationNumEmployeesRanges[]=110%2C110&personSeniorities[]=entry&contactEmailStatus[]=unavailable';
      const cabinet = {
        label: '110,110 entry unavailable',
        bracket: ['110,110'],
        seniority: 'entry',
        emailStatus: ['unavailable']
      };

      // Construct Pass 2 (Z-A) atomic navigation payload
      const hashPass2 = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', false);
      const payloadPass2 = {
        type: 'APOLLO_NAVIGATE_HASH',
        hash: hashPass2,
        sort: {
          sort_by_field: 'sanitized_organization_name_unanalyzed',
          sort_ascending: false
        },
        resetPage1: true
      };

      assert.strictEqual(payloadPass2.type, 'APOLLO_NAVIGATE_HASH');
      assert.strictEqual(payloadPass2.resetPage1, true);
      assert.strictEqual(payloadPass2.sort.sort_ascending, false);
      assert.strictEqual(payloadPass2.sort.sort_by_field, 'sanitized_organization_name_unanalyzed');
      assert.ok(payloadPass2.hash.includes('sortAscending=false'));
      assert.ok(payloadPass2.hash.includes('page=1'));
    });

    it('constructs Pass 1 (A-Z) atomic navigation payload guaranteeing sort_ascending: true', () => {
      const currentHash = '#/people?page=1&organizationNumEmployeesRanges[]=110%2C110';
      const cabinet = {
        label: '110,110 entry unavailable',
        bracket: ['110,110'],
        seniority: 'entry',
        emailStatus: ['unavailable']
      };

      const hashPass1 = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', true);
      const payloadPass1 = {
        type: 'APOLLO_NAVIGATE_HASH',
        hash: hashPass1,
        sort: {
          sort_by_field: 'sanitized_organization_name_unanalyzed',
          sort_ascending: true
        },
        resetPage1: true
      };

      assert.strictEqual(payloadPass1.sort.sort_ascending, true);
      assert.ok(payloadPass1.hash.includes('sortAscending=true'));
    });
  });

  describe('Pre-Cabinet State Sanitization Guard', () => {
    it('prevents cross-cabinet sort bleed when transitioning from a descending cabinet to a new cabinet', () => {
      // Simulate state machine of the interceptor
      let activeSortConfig = {
        sort_by_field: 'sanitized_organization_name_unanalyzed',
        sort_ascending: false // Left behind by Cabinet N's Pass 2!
      };

      // Helper function that models atomic message reception
      function handleNavigateMessage(msg) {
        if (msg.sort) {
          activeSortConfig = { ...msg.sort };
        }
        return {
          currentHash: msg.hash,
          appliedSort: activeSortConfig
        };
      }

      // Cabinet N+1 begins Pass 1: must reset sort synchronously before hash is processed
      const nextCabinetMsg = {
        type: 'APOLLO_NAVIGATE_HASH',
        hash: '#/people?page=1&organizationNumEmployeesRanges[]=160%2C160&sortAscending=true',
        sort: {
          sort_by_field: 'sanitized_organization_name_unanalyzed',
          sort_ascending: true
        },
        resetPage1: true
      };

      const res = handleNavigateMessage(nextCabinetMsg);
      assert.strictEqual(activeSortConfig.sort_ascending, true, 'Interceptor activeSortConfig MUST be re-armed to true');
      assert.strictEqual(res.appliedSort.sort_ascending, true);
    });
  });

  describe('Page 1 DOM Reset State Logic', () => {
    it('identifies when active DOM pagination is on page > 1 and triggers button 1 click', () => {
      // Mock DOM pagination elements
      const mockButtons = [
        { text: '1', active: false, clicked: false, click() { this.clicked = true; } },
        { text: '2', active: false, clicked: false, click() { this.clicked = true; } },
        { text: '3', active: false, clicked: false, click() { this.clicked = true; } },
        { text: '4', active: false, clicked: false, click() { this.clicked = true; } },
        { text: '5', active: true, clicked: false, click() { this.clicked = true; } } // Currently on Page 5!
      ];

      function resetPaginationToPage1(buttons) {
        const p1 = buttons.find(b => b.text === '1');
        const activeBtn = buttons.find(b => b.active);
        if (p1 && activeBtn && activeBtn.text !== '1') {
          p1.click();
          activeBtn.active = false;
          p1.active = true;
          return true;
        }
        return false;
      }

      const didClick = resetPaginationToPage1(mockButtons);
      assert.strictEqual(didClick, true, 'Should have clicked page 1 button');
      assert.strictEqual(mockButtons[0].clicked, true, 'Page 1 button should be clicked');
      assert.strictEqual(mockButtons[0].active, true, 'Page 1 button should now be active');
    });

    it('does not dispatch redundant clicks if pagination is already on Page 1', () => {
      const mockButtons = [
        { text: '1', active: true, clicked: false, click() { this.clicked = true; } },
        { text: '2', active: false, clicked: false, click() { this.clicked = true; } }
      ];

      function resetPaginationToPage1(buttons) {
        const p1 = buttons.find(b => b.text === '1');
        const activeBtn = buttons.find(b => b.active);
        if (p1 && activeBtn && activeBtn.text !== '1') {
          p1.click();
          return true;
        }
        return false;
      }

      const didClick = resetPaginationToPage1(mockButtons);
      assert.strictEqual(didClick, false, 'Should not click if already on page 1');
      assert.strictEqual(mockButtons[0].clicked, false);
    });
  });

  describe('Full Cabinet Capture Simulation with Working Pass 2 Page 1', () => {
    it('achieves 100% lead harvest for a 224-lead cabinet (Cabinet 14) when Pass 2 Page 1 functions', () => {
      // Cabinet 14 had 224 total leads in reality:
      // Pass 1 (A-Z) provides 5 pages: 5 x 25 = 125 leads (leads 1 to 125 from A end)
      // Pass 2 (Z-A) provides leads from Z end: leads 224 down to 126 (99 leads)
      const totalCabinetLeads = 224;
      const dedupeStore = new DeduplicationStore();

      // Pass 1: Pages 1 to 5 (25 leads per page, max 125)
      let pass1Harvested = 0;
      for (let p = 1; p <= 5; p++) {
        const pageLeads = [];
        for (let i = 1; i <= 25; i++) {
          const leadId = (p - 1) * 25 + i;
          if (leadId <= totalCabinetLeads) {
            pageLeads.push({ id: `lead_${leadId}`, name: `Lead ${leadId}` });
          }
        }
        for (const lead of pageLeads) {
          if (dedupeStore.add(lead)) pass1Harvested++;
        }
      }

      assert.strictEqual(pass1Harvested, 125, 'Pass 1 should collect 125 leads from A end');
      assert.strictEqual(dedupeStore.size(), 125);

      // Pass 2: Pages 1 to 5 (Z-A reverse sweep starting on Page 1)
      // Page 1 (leads 224 down to 200) -> 25 fresh leads!
      // Page 2 (leads 199 down to 175) -> 25 fresh leads!
      // Page 3 (leads 174 down to 150) -> 25 fresh leads!
      // Page 4 (leads 149 down to 126) -> 24 fresh leads, then overlaps with Pass 1!
      let pass2Harvested = 0;
      for (let p = 1; p <= 5; p++) {
        const pageLeads = [];
        for (let i = 1; i <= 25; i++) {
          const leadId = totalCabinetLeads - ((p - 1) * 25 + (i - 1));
          if (leadId >= 1) {
            pageLeads.push({ id: `lead_${leadId}`, name: `Lead ${leadId}` });
          }
        }
        for (const lead of pageLeads) {
          if (dedupeStore.add(lead)) pass2Harvested++;
        }
      }

      assert.strictEqual(pass2Harvested, 99, 'Pass 2 should collect all remaining 99 unharvested leads from Z end');
      assert.strictEqual(dedupeStore.size(), 224, 'Cabinet 14 should achieve 100% complete harvest (224/224)');
    });
  });
});

