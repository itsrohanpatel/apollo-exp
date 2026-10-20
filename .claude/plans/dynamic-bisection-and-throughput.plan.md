# Plan: Dynamic Pre-Flight Bisection Tree & High-Throughput Harvest Engine

**Source Objective**: Upgrade the Apollo Lead Extractor to support completely autonomous, dynamic, zero-waste extraction for any lead pool size (100 to 50,000+ leads) with 0 credit burn, 0 data loss, and anti-ban protection.
**Complexity**: Large (Core Slicing Math + In-Tab Adaptive Tree + Storage Architecture + TDD Test Suite + Live API Verification).
**Status**: Fully Hardened via `/code-review` & `/ponytail-audit`. Ready for User Review & Approval.

---

## 1. Zero-Redundancy Fresh-Lead Architecture (Eliminating Re-Scraping & Overlap)

### The Problem Identified & Audited
In a naive implementation, if a cabinet has 500 leads:
1. The engine performs a broad sweep (Pages 1–5 desc + asc = 250 leads).
2. It sees total is 500 (> 250), so it pivots to seniorities (`founder`, `c_suite`, `vp`, `director`, etc.).
3. **The Flaw**: When querying `c_suite` or `vp`, Apollo returns the **exact same leads** that were already at the top of the broad sweep! Furthermore, sparse seniorities run ascending passes unconditionally, wasting duplicate calls.

### The Architectural Solution: 4 Rules of Fresh-Lead Extraction

```
                        DENSE CABINET (> 245 LEADS)
                                     │
                    ┌────────────────┴────────────────┐
          [WRONG: NAIVE APPROACH]           [OUR SOLUTION: ZERO-REDUNDANCY]
          1. Scrape 250 broad leads         1. SKIP broad sweep entirely!
          2. Pivot to seniorities           2. Directly execute Disjoint Seniority Partitions
          3. Re-scrape same C-suite/VPs     3. Every lead belongs to 1 seniority facet
             (40%+ WASTED CALLS)               (0% OVERLAP, 100% FRESH)
```

1. **Pre-Flight Disjoint Partitioning (Skip the Broad Sweep)**:
   - When the metadata probe detects a cabinet has $> 245$ leads, the engine **never runs a broad 250-lead sweep first**.
   - Instead, it immediately resolves the cabinet into disjoint sub-facets (`founder`, `c_suite`, `vp`, `director`, `manager`, `senior`, `entry`, etc.).
   - Since Apollo assigns each person to a primary seniority, these sub-cabinets are mutually exclusive. Leads are fetched **once and only once**.
2. **Conditional Bidirectional Sweep for Seniorities**:
   - Only execute `sort_ascending: true` (bottom-up pass) if `senCount > 125`. If a seniority has 10 leads, it completes on Page 1 descending; zero ascending requests are wasted.
3. **In-Flight Dynamic ID Exclusion**:
   - When pivoting across residual dense subsets, previously harvested IDs within that cabinet are passed in `person_ids_excluded: Array.from(cabinetHarvestedIds)`. Apollo suppresses them at the database level.
4. **Zero-Yield Stagnation Early Exit**:
   - If Page $N$ returns 25 records but **0 are fresh** (all 25 already exist in the central deduplication store), the engine immediately terminates that pass/sub-cabinet instead of blindly requesting Pages $N+1 \dots 5$.
5. **Strict Net-Fresh Counting Discipline**:
   - All progress bars, targets, and speed metrics count **Net Fresh Unique Leads** only.
   - Duplicate encounters are segregated into a secondary metric: `Duplicates Suppressed` / `Zero-Yield Bypasses`.

---

## 2. Issues & Solutions Matrix (From `/code-review` & `/ponytail-audit`)

| # | Audit Finding & File Location | Severity | Concrete Solution | Implementation Phase |
| :--- | :--- | :--- | :--- | :--- |
| **I1** | **Unconditional Double-Sweep on Sparse Seniority** ([`injected.js:1084`](file:///d:/Codinf%20projets/apollo%20scraper/extension/injected.js#L1084)): Sparse seniorities ran ascending pass unconditionally, re-fetching duplicate leads. | **HIGH (Bug)** | Check `senTotalEntries > 125` before scheduling ascending pass (`senSortAsc = true`). | **Phase 3** |
| **I2** | **Company Slicing Truncation** ([`injected.js:1049`](file:///d:/Codinf%20projets/apollo%20scraper/extension/injected.js#L1049)): `!isCompanies` check blocked dense pivoting for company searches, losing records over 250. | **HIGH (Bug)** | Use Dynamic Headcount Bisection across both entities; headcount bisects universally for both people and companies. | **Phase 2 & 3** |
| **I3** | **Storage Write Rate-Limit Lockup** ([`background.js:62-80`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js#L62-L80)): Calling `chrome.storage.local.set` with 20k leads on every page causes quota lockups. | **CRITICAL (Scale)** | Offload bulk lead objects to `IndexedDB` in 100-record chunks. Keep only scalar counters in `storage.local` with 3s debouncing. | **Phase 4** |
| **I4** | **FIFO Enrichment Queue Inefficiency** ([`background.js:501`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js#L501)): Single-person companies prioritized equally with 50-person companies. | **MEDIUM (Perf)** | Implement **Lead Leverage Sorting**: sort pending org IDs descending by count of harvested employees attached. | **Phase 4** |
| **I5** | **Wildcard PostMessage Security** ([`injected.js:218`](file:///d:/Codinf%20projets/apollo%20scraper/extension/injected.js#L218)): Using `*` for internal extension message bus. | **HIGH (Security)** | Restrict target origin to `'https://app.apollo.io'` and validate origin and internal token in `content.js`. | **Phase 3** |
| **I6** | **In-Tab Memory Growth** ([`injected.js:683`](file:///d:/Codinf%20projets/apollo%20scraper/extension/injected.js#L683)): Accumulating full arrays of 50k IDs in DOM context. | **MEDIUM (Scale)** | Use compact FNV-1a 32-bit hash set in tab context; full records stored in background IndexedDB. | **Phase 3** |

---

## 3. Real-World Live API Verification Protocol (No Mock-Only Validation)

To guarantee that the solution is 100% production-ready for Apollo's live platform:
1. **Live Metadata Probe Validation**:
   - Query live `https://app.apollo.io/api/v1/mixed_people/search_metadata_mode` on the active Chrome tab (CDP port 9222).
   - Verify parsing of live `pipeline_total` and facet arrays (`organization_num_employees_ranges`, `person_seniorities`).
2. **Live Bisection Accuracy Test**:
   - Run the dynamic tree against the active search query (`Ahmedabad, India`, `HR`, `50+ employees` with 11,500+ leads).
   - Prove that every generated cabinet returns live lead counts strictly between 1 and 245 leads.
3. **Live Fresh-Lead & Zero-Loss Verification**:
   - Execute extraction for dense live cabinets.
   - Verify that 0 requests are wasted on broad passes for cabinets $> 245$.
   - Verify that 100% of landed leads in `IndexedDB` are unique, with verified CSV export generation.

---

## 4. Implementation Phases (Step-by-Step TDD & Live Verification)

### Phase 1: TDD Test Suites (Failing First - RED)
- **Task 1.1**: Create `tests/dynamic_bisection.test.mjs`:
  - Unit tests for `DynamicBisectionTree`, sparse coalescing, depth limits, and disjoint seniority partitions.
  - Verify zero broad sweep execution when cabinet $> 245$.
- **Task 1.2**: Create `tests/manifest_checkpoint.test.mjs`:
  - Unit tests for manifest creation, state transitions (`PENDING` $\to$ `COMPLETED`), and resume logic.
- **Task 1.3**: Validate tests fail (`node --test tests/dynamic_bisection.test.mjs`).

### Phase 2: Core Algorithmic Library (`extension/slicer_core.js`)
- **Task 2.1**: Implement `DynamicBisectionTree` with asynchronous `probeFn`, in-memory probe cache, and recursive midpoint splitting.
- **Task 2.2**: Implement disjoint partition logic that skips broad sweeps for dense ranges.
- **Task 2.3**: Implement `coalesceSparseRanges()` to collapse consecutive small brackets into $\le 245$-lead buckets.
- **Task 2.4**: Run tests to verify all tests pass (`node --test tests/dynamic_bisection.test.mjs`) - GREEN.

### Phase 3: In-Tab Harvest Engine Integration (`extension/injected.js` & `content.js`)
- **Task 3.1**: Create `probeMetadataRange(min, max, basePayload)` calling live `mixed_people/search_metadata_mode`.
- **Task 3.2**: Replace static bracket looping in `runUniversalHarvest` with pre-flight `tree.buildExecutionPlan()`.
- **Task 3.3**: Fix Seniority Double-Sweep (Issue I1): only run ascending pass if `senCount > 125`.
- **Task 3.4**: Fix Company Search Truncation (Issue I2): enable dynamic headcount bisection for company mode.
- **Task 3.5**: Tighten PostMessage security (Issue I5): explicit `targetOrigin` and origin validation.
- **Task 3.6**: Connect manifest status reporting so each slice completion is recorded in real time.

### Phase 4: Storage Hardening & Leverage Queue (`extension/background.js`)
- **Task 4.1**: Implement `IndexedDBStorage` adapter to batch append leads in 100-item chunks (Issue I3).
- **Task 4.2**: Update `syncStorage()` to debounce updates to `chrome.storage.local` (3s interval, counters and preview only).
- **Task 4.3**: Update `processEnrichmentQueue()` with Lead Leverage Sorting (Issue I4).
- **Task 4.4**: Enforce Net-Fresh lead counts in telemetry and state.

### Phase 5: Live API Verification & HUD Audit (Real-World Ready)
- **Task 5.1**: Clean reload extension via CDP (Port 9222).
- **Task 5.2**: Execute Live Metadata Probe script against active Apollo session to verify live bisection of the 11,500+ lead search.
- **Task 5.3**: Run live extraction of 1 dense cabinet and verify 0 duplicate fetches, zero broad sweep waste, and 100% fresh extraction into IndexedDB.
- **Task 5.4**: Run full automated test suite (`npm test`).

---

## 5. Verification Commands

```bash
# 1. Run all unit tests
npm test

# 2. Run new bisection & manifest tests
node --test tests/dynamic_bisection.test.mjs
node --test tests/manifest_checkpoint.test.mjs

# 3. Reload Chrome extension on CDP 9222
node scratch/clean_reload.mjs

# 4. Live API verification against active Apollo tab
node scratch/verify_live_bisection.mjs
```
