import test from 'node:test';
import assert from 'node:assert';
import { resolveAdaptiveExecutionTree } from '../extension/slicer_core.js';

test('Continuous Range & 30 Leads/Page Bidirectional Threshold (300 Leads)', async (t) => {
  await t.test('Case 1: [700, 700] with 171 leads is approved as 1 Bidirectional cabinet without seniority probes', async () => {
    const probesMade = [];
    const probeFn = async (filters) => {
      probesMade.push(filters);
      const ranges = filters.organization_num_employees_ranges;
      if (ranges && ranges[0] === '700,700') {
        return 171;
      }
      return 171;
    };

    const basePayload = {
      organization_num_employees_ranges: ['700,700']
    };

    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, { detailed: true });
    const { cabinets, auditLog } = result;

    // Verify exactly 1 cabinet was created
    assert.strictEqual(cabinets.length, 1, 'Must create exactly 1 cabinet for [700, 700]');
    const cab = cabinets[0];
    assert.strictEqual(cab.bracket[0], '700,700');
    assert.strictEqual(cab.total, 171);
    assert.strictEqual(cab.mode, 'Bidirectional');
    assert.strictEqual(cab.seniority, null, 'Must NOT pivot to seniorities');
    assert.strictEqual(cab.emailStatus, null, 'Must NOT pivot to email status');
    assert.strictEqual(cab.pagesNeeded, 6, 'Pages needed for 171 leads at 30/page must be 6 (ceil(171/30))');

    // Verify zero seniority probes were executed
    const seniorityProbes = probesMade.filter(p => p.person_seniorities);
    assert.strictEqual(seniorityProbes.length, 0, 'Zero seniority probes must be made for 171 leads in single integer');

    // Check audit log
    const approvalLog = auditLog.find(l => l.bracket === '700,700' && l.type === 'BRACKET_PROBE');
    assert.ok(approvalLog);
    assert.ok(approvalLog.decision.includes('Within safe limit (171 <= 300 leads)'));
  });

  await t.test('Case 2: Multi-number range [501, 516] with 180 leads is approved directly as 1 Bidirectional cabinet', async () => {
    const probesMade = [];
    const probeFn = async (filters) => {
      probesMade.push(filters);
      const ranges = filters.organization_num_employees_ranges;
      if (ranges && ranges[0] === '501,516') return 180;
      return 0;
    };

    const basePayload = {
      organization_num_employees_ranges: ['501,516']
    };

    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, { detailed: true });
    const { cabinets } = result;

    assert.strictEqual(cabinets.length, 1, 'Must approve [501, 516] as a single cabinet without bisection');
    assert.strictEqual(cabinets[0].bracket[0], '501,516');
    assert.strictEqual(cabinets[0].total, 180);
    assert.strictEqual(cabinets[0].mode, 'Bidirectional');
    assert.strictEqual(cabinets[0].pagesNeeded, 6, 'ceil(180/30) = 6 pages');
  });

  await t.test('Case 3: Dense multi-number range [201, 400] with 350 leads bisects because 350 > 300', async () => {
    const probesMade = [];
    const probeFn = async (filters) => {
      probesMade.push(filters);
      const ranges = filters.organization_num_employees_ranges;
      if (ranges && ranges[0] === '201,400') return 350;
      if (ranges && ranges[0] === '201,300') return 180;
      if (ranges && ranges[0] === '301,400') return 170;
      return 50;
    };

    const basePayload = {
      organization_num_employees_ranges: ['201,400']
    };

    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, { detailed: true });
    const { cabinets } = result;

    // Both [201, 300] (180 leads) and [301, 400] (170 leads) <= 300, so each approved as 1 Bidirectional cabinet
    assert.strictEqual(cabinets.length, 2, 'Must bisect [201, 400] into 2 cabinets');
    assert.strictEqual(cabinets[0].bracket[0], '201,300');
    assert.strictEqual(cabinets[0].total, 180);
    assert.strictEqual(cabinets[0].mode, 'Bidirectional');
    assert.strictEqual(cabinets[0].pagesNeeded, 6);

    assert.strictEqual(cabinets[1].bracket[0], '301,400');
    assert.strictEqual(cabinets[1].total, 170);
    assert.strictEqual(cabinets[1].mode, 'Bidirectional');
    assert.strictEqual(cabinets[1].pagesNeeded, 6);
  });

  await t.test('Case 4: [700, 700] with 350 leads correctly pivots to Seniorities because 350 > 300', async () => {
    const probesMade = [];
    const probeFn = async (filters) => {
      probesMade.push(filters);
      if (filters.person_seniorities) {
        if (filters.person_seniorities[0] === 'manager') return 120;
        if (filters.person_seniorities[0] === 'senior') return 100;
        return 0;
      }
      return 350;
    };

    const basePayload = {
      organization_num_employees_ranges: ['700,700']
    };

    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, { detailed: true });
    const { cabinets, auditLog } = result;

    assert.ok(cabinets.length >= 1, 'Must pivot and create seniority cabinets');
    const seniorCab = cabinets.find(c => c.seniority === 'senior' || (Array.isArray(c.seniority) && c.seniority.includes('senior')));
    const managerCab = cabinets.find(c => c.seniority === 'manager' || (Array.isArray(c.seniority) && c.seniority.includes('manager')));
    assert.ok(seniorCab, 'Senior cabinet or coalesced bin must exist');
    assert.ok(managerCab, 'Manager cabinet or coalesced bin must exist');
    const totalSeniorityLeads = cabinets.reduce((sum, c) => sum + c.total, 0);
    assert.strictEqual(totalSeniorityLeads, 220);

    const pivotLog = auditLog.find(l => l.type === 'SENIORITY_PIVOT');
    assert.ok(pivotLog, 'Audit log must record SENIORITY_PIVOT');
    assert.ok(pivotLog.decision.includes('350 > 300 leads'), `Decision was: ${pivotLog.decision}`);
  });

  await t.test('Case 5: Seniority [700, 700 manager] with 220 leads is approved as Bidirectional without Email Status pivot', async () => {
    const probesMade = [];
    const probeFn = async (filters) => {
      probesMade.push(filters);
      if (filters.contact_email_status) {
        return 50;
      }
      if (filters.person_seniorities) {
        if (filters.person_seniorities[0] === 'manager') return 220;
        return 0;
      }
      return 400;
    };

    const basePayload = {
      organization_num_employees_ranges: ['700,700']
    };

    const result = await resolveAdaptiveExecutionTree(probeFn, basePayload, { detailed: true });
    const { cabinets } = result;

    const managerCab = cabinets.find(c => c.seniority === 'manager');
    assert.ok(managerCab, 'Must have manager cabinet');
    assert.strictEqual(managerCab.total, 220);
    assert.strictEqual(managerCab.mode, 'Bidirectional');
    assert.strictEqual(managerCab.pagesNeeded, 8, 'ceil(220/30) = 8 pages');
    assert.strictEqual(managerCab.emailStatus, null, 'Must NOT pivot to email status when <= 300 leads');

    // Verify zero email status probes were executed for manager
    const emailProbes = probesMade.filter(p => p.contact_email_status);
    assert.strictEqual(emailProbes.length, 0, 'Zero email status probes must be made for 220-lead seniority');
  });
});
