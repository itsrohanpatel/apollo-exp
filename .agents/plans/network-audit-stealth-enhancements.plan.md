# Multi-Step Plan: Network-Audit Stealth & Pacing Enhancements

## 1. Overview & Problem Statement
From our live network audit of Apollo.io, several bot detection vectors were identified:
1. **Machine-Instant Density Probing**: The adaptive bisection engine (`resolveAdaptiveExecutionTree`) previously fired probe queries in rapid back-to-back succession with 0ms delay.
2. **Zero-Result Instant-Skip Signature**: When a probe returns 0 leads (`count === 0`), the loop immediately skipped to the next probe without any dwell time. Real users pause 1–2 seconds upon seeing "0 results".
3. **Session Replay Telemetry (`api.us1.fullview.io`)**: Apollo loads Fullview to track behavioral mouse/scroll telemetry.
4. **Cloudflare & CSRF Preflight Clearance**: Synthetic requests trip Turnstile unless authentic `cf_clearance` and `X-CSRF-TOKEN` are confirmed before running.
5. **Multi-Tab Concurrency**: Spawning parallel scraping tabs elevates `apollo_tab_count` and triggers session anomalies.

---

## 2. Multi-Step Implementation Plan

### Step 1: Pre-Flight & Probe Pacing Engine in `extension/slicer_core.js`
- Implement `calculateProbePacingDelay(options = {})`:
  - Default probe delay: 1,200ms – 2,400ms jitter.
  - Zero-result dwell delay: 900ms – 1,800ms when `isZeroResult: true` to emulate human reading/filter adjustment.
- Update `resolveAdaptiveExecutionTree(probeFn, basePayload, options)`:
  - Add optional `probePacingDelayFn` or delay integration.
  - When `count === 0`, `senCount === 0`, or `emailCount === 0`, trigger zero-result dwell pacing before advancing the queue.

### Step 2: Session Clearance & CSRF Gatekeeper
- Implement `validateSessionHealth(cookieString)`:
  - Validates `cf_clearance` and `X-CSRF-TOKEN` presence.
  - Returns `{ isHealthy: boolean, hasCsrf: boolean, hasClearance: boolean }`.
  - Enables the extension to gracefully pause if a session expires rather than burning rate limits.

### Step 3: Companion Snippet Enrichment Merger
- Implement `mergeSnippetEnrichment(contacts = [], snippetMap = {})`:
  - Merges rich organization data (`short_description`, `keywords`, `phone`, `annual_revenue_printed`) returned by `POST /api/v1/organizations/load_snippets` into the contact rows.
  - Yields 100% data fidelity with zero credit consumption.

### Step 4: Fullview Telemetry Isolation & In-Page Single-Tab Guard
- Update `extension/injected.js` and `extension/manifest.json`:
  - Suppress/ignore third-party telemetry calls to `api.us1.fullview.io` so automated actions do not upload robotic replay traces.
  - Enforce single-tab execution to preserve `apollo_tab_count`.

### Step 5: Test-Driven Verification (TDD)
- Add comprehensive test suites in `tests/slicer_core.test.mjs`:
  - Test probe pacing calculation (standard vs. zero-result dwell delay).
  - Test `resolveAdaptiveExecutionTree` pacing callbacks on zero-result cabinets.
  - Test `validateSessionHealth` with various cookie configurations.
  - Test `mergeSnippetEnrichment` data mapping.
- Execute `npm test` and ensure all suites pass with 100% pass rate.
