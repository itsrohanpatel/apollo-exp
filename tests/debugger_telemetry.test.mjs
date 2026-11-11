import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StandardModeDiagnosticLogger } from '../extension/slicer_core.js';

describe('Standard Mode In-Flight Diagnostic Debugger Telemetry', () => {
  it('instantiates cleanly and starts with empty traces', () => {
    const logger = new StandardModeDiagnosticLogger();
    assert.strictEqual(logger.getDiscrepanciesCount(), 0);
    const report = logger.getReport();
    assert.strictEqual(report.totalPagesHarvested, 0);
    assert.strictEqual(report.totalDiscrepancies, 0);
    assert.deepStrictEqual(report.discrepancies, []);
    assert.deepStrictEqual(report.pageTraces, []);
    assert.ok(report.sessionStartTime);
  });

  it('records clean page traces without flagging discrepancies when expected equals raw', () => {
    const logger = new StandardModeDiagnosticLogger();
    const trace = logger.recordPageTrace({
      sliceLabel: '11,11 - manager',
      sliceIdx: 1,
      page: 1,
      passLabel: 'Pass 1 (A-Z)',
      urlHash: '#finder?page=1',
      source: 'DOM_FALLBACK',
      expectedCount: 30,
      rawCount: 30,
      addedCount: 30,
      duplicatesFiltered: 0
    });

    assert.ok(trace);
    assert.strictEqual(trace.isDiscrepancy, false);
    assert.strictEqual(logger.getDiscrepanciesCount(), 0);
    assert.strictEqual(logger.pageTraces.length, 1);
  });

  it('flags discrepancy and attaches DOM forensics when rawCount < expectedCount', () => {
    const logger = new StandardModeDiagnosticLogger();

    const mockForensics = {
      totalRowsInDOM: 29,
      scrollInfo: { scrollTop: 1200, scrollHeight: 2400, clientHeight: 800 },
      anomalyRowCount: 1,
      anomalyRows: [
        {
          index: 29,
          tag: 'TR',
          className: 'zp_table_row zp_restricted',
          textSnippet: 'Private Contact (Out of Network)',
          outerHTMLSnippet: '<tr class="zp_table_row zp_restricted"><td><span>Private Contact</span></td></tr>'
        }
      ]
    };

    const trace = logger.recordPageTrace({
      sliceLabel: '11,11 - entry',
      sliceIdx: 2,
      page: 2,
      passLabel: 'Pass 1 (A-Z)',
      urlHash: '#finder?page=2',
      source: 'DOM_FALLBACK',
      expectedCount: 30,
      rawCount: 29, // 29 instead of 30!
      addedCount: 29,
      duplicatesFiltered: 0,
      domForensics: mockForensics
    });

    assert.strictEqual(trace.isDiscrepancy, true);
    assert.strictEqual(logger.getDiscrepanciesCount(), 1);
    assert.strictEqual(logger.discrepancies.length, 1);
    assert.deepStrictEqual(trace.domForensics, mockForensics);

    const report = logger.getReport();
    assert.strictEqual(report.totalPagesHarvested, 1);
    assert.strictEqual(report.totalDiscrepancies, 1);
    assert.strictEqual(report.discrepancies[0].rawCount, 29);
    assert.strictEqual(report.discrepancies[0].expectedCount, 30);
    assert.strictEqual(report.discrepancies[0].domForensics.anomalyRowCount, 1);
  });

  it('does not flag discrepancy on terminal page where expectedCount < 30', () => {
    const logger = new StandardModeDiagnosticLogger();

    // Cabinet with 77 leads total: Page 1 = 30, Page 2 = 30, Page 3 = 17 leads
    const traceP3 = logger.recordPageTrace({
      sliceLabel: '11,11 - owner',
      sliceIdx: 3,
      page: 3,
      passLabel: 'Pass 1 (A-Z)',
      expectedCount: 17, // terminal expected count
      rawCount: 17,
      addedCount: 15,
      duplicatesFiltered: 2
    });

    assert.strictEqual(traceP3.isDiscrepancy, false);
    assert.strictEqual(logger.getDiscrepanciesCount(), 0);
  });

  it('correctly tracks deduplication count without false discrepancy', () => {
    const logger = new StandardModeDiagnosticLogger();

    // In a 290-lead cabinet, 3 duplicate leads filtered out: raw = 30, added = 27, dups = 3
    const trace = logger.recordPageTrace({
      sliceLabel: '11,11 - director',
      sliceIdx: 4,
      page: 4,
      passLabel: 'Pass 2 (Z-A)',
      expectedCount: 30,
      rawCount: 30,
      addedCount: 27,
      duplicatesFiltered: 3
    });

    assert.strictEqual(trace.isDiscrepancy, false);
    assert.strictEqual(trace.duplicatesFiltered, 3);
    assert.strictEqual(trace.addedCount, 27);
  });

  it('clears trace history when requested', () => {
    const logger = new StandardModeDiagnosticLogger();
    logger.recordPageTrace({ expectedCount: 30, rawCount: 28 });
    assert.strictEqual(logger.getDiscrepanciesCount(), 1);

    logger.clear();
    assert.strictEqual(logger.getDiscrepanciesCount(), 0);
    assert.strictEqual(logger.pageTraces.length, 0);
    assert.strictEqual(logger.preflight, null);
  });

  it('records preflight telemetry and exports in report with mathematical remainder pruning', () => {
    const logger = new StandardModeDiagnosticLogger();

    const mockPreflight = {
      startTime: '2026-11-11T12:00:00.000Z',
      durationMs: 4800,
      engineMode: 'standard',
      totalProbesExecuted: 21,
      probesPrunedByMath: 40,
      cabinetsPlanned: 7,
      totalPredictedLeads: 2110,
      cabinets: [
        { label: '[11,11] entry', total: 280, mode: 'Bidirectional', pagesNeeded: 10 },
        { label: '[11,11] [director+vp+head...]', total: 35, mode: 'Top-Down Only', pagesNeeded: 2 }
      ],
      auditLog: [
        { type: 'REMAINDER_PRUNE', label: '11,11', leadsCount: 35, decision: 'Remaining 35 <= 300 leads. Pruned 8 tail probes.' }
      ]
    };

    const recorded = logger.recordPreflightTelemetry(mockPreflight);
    assert.ok(recorded);
    assert.strictEqual(recorded.durationSec, 4.8);
    assert.strictEqual(recorded.probesPrunedByMath, 40);
    assert.strictEqual(recorded.totalProbesExecuted, 21);
    assert.strictEqual(recorded.totalPredictedLeads, 2110);
    assert.strictEqual(recorded.cabinets.length, 2);

    const report = logger.getReport();
    assert.ok(report.preflight);
    assert.strictEqual(report.preflight.durationSec, 4.8);
    assert.strictEqual(report.preflight.probesPrunedByMath, 40);
    assert.strictEqual(report.preflight.auditLog.length, 1);
  });
});

