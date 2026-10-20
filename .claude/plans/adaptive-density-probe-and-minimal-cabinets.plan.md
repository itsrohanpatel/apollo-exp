# Multi-Plan / Multi-Workflow Specification: Adaptive Dynamic Cabin Engine
**Autonomous Pre-Flight Density Probing, Minimal API Calls, Zero-Waste Bisection & Maximum Lead Yield**

---

## 1. Executive Summary & Problem Framing

### 1.1 The Flaw: Static Multiplication vs. Reality
In the current implementation, passing an open-ended employee filter (such as `50,`) triggers static bracket expansion into **70 micro-headcount intervals** (`51-60`, `61-70`, `71-80` ... `10001`). 

For every single one of those 70 brackets, `generateMultiDimensionalPlan()` statically multiplies:
- 8 standard seniorities = 8 units
- 1 senior 2-way email split = 2 units
- 2 dense seniorities (`manager`, `entry`) × 3 email status partitions = 6 units
- **Total: 70 brackets × 16 combinations = 1,105 cabinets.**

When executed on targeted queries—such as **C-Suite in Ahmedabad** (which has only ~300 total matching people across the entire city)—the scraper blindly queues **1,050+ cabinets**, resulting in 1,000+ empty HTTP requests, triggering Cloudflare velocity tripwires, and taking 45+ minutes for a task that could finish in **15 seconds**.

### 1.2 The Solution: Dynamic On-Demand Density Sizing
The Apollo API returns the exact matching pool size (`pagination.total_entries`) in any request within ~250ms. By executing **fast pre-flight probes** (`page: 1, per_page: 1`), the system can classify every search and cabinet dynamically:

```
[ Active Apollo Search ]
           │
           ▼
[ Pre-Flight Query Probe ]
           │
  ┌────────┴────────┐
  ▼                 ▼
Total ≤ 250      Total > 250
  │                 │
  ▼                 ▼
[ 1 Single Unit ] [ Macro-Brackets Probe ]
  p1-5 desc/asc      ├── total == 0   ──► SKIP (0 calls)
  (Done in 15s)      ├── total ≤ 250  ──► EXECUTE (1 unit)
                     └── total > 250  ──► BISECT ONLY THIS BRACKET
                                                │
                                                ▼
                                         [ Seniority Pivot ]
                                         (Only if integer headcount > 250)
```

---

## 2. Multi-Model Analysis & Architectural Review

### 2.1 Backend / Systems Architect (Codex Review)
1. **Rate Limit & Cloudflare Preservation:**
   - Pre-flight probes must be lightweight (`per_page: 1`, minimal payload).
   - Probing must share the same `AdaptivePacer` as standard harvesting to ensure rolling velocity counters stay below Cloudflare's bot shield thresholds (2.0s–3.8s baseline, 60s resting cooldown after 20 heavy requests).
2. **Idempotent Queue Management:**
   - The queue operates as a dynamic FIFO stack: `queue.push(bracket)`.
   - If `bracket.total > 250` and `min < max`, bisect into `[min, mid]` and `[mid+1, max]` and push back onto the queue.
   - If `min === max` and `total > 250`, pivot to seniorities.
   - Skipped cabinets (`total === 0`) are logged into a skip-set and never touched again.

### 2.2 Frontend & HUD / UX Architect (Antigravity Review)
1. **Dynamic Cabinet Count in HUD:**
   - Because the final cabinet count is resolved dynamically, the HUD must not display a misleading static `Slice 1/1050`.
   - Instead, the HUD header should display:
     - **Planning Phase:** `⚡ Analyzing Search Density...`
     - **Execution Phase:** `Cabinet: [51-100] (Unit 2/4) • 84% Pool Yield`
2. **Progressive Cabinet Counter:**
   - Active units are numbered on the fly (`Current: 3 / Discovered: 5`).
   - If a heavy cabinet bisects, the total count increments cleanly without jumping or flickering.

---

## 3. Mathematical Decision Matrix

| Condition | Action | Next State | Number of API Calls |
|---|---|---|---|
| `Total Entries == 0` | `SKIP` | Next cabinet in queue | **0 harvest calls** (1 probe only) |
| `Total Entries <= 125` | `EXECUTE_UNIDIRECTIONAL` | Page 1 to N descending | **Math.ceil(Total / 25) calls** (max 5) |
| `125 < Total Entries <= 250` | `EXECUTE_BIDIRECTIONAL` | P1–5 descending + P1–5 ascending | **5 to 10 calls max** |
| `Total Entries > 250` AND `min < max` | `BISECT_HEADCOUNT` | Split into `[min, mid]` and `[mid+1, max]` | **2 probes**, recurse |
| `Total Entries > 250` AND `min == max` | `PIVOT_SENIORITIES` | Split into 11 Apollo seniorities | **Probe active seniorities** |
| Seniority Total `> 250` (`entry` or `manager`) | `PIVOT_EMAIL_STATUS` | Split into `verified`, `guessed`, `unavailable` | **3 units max** (no keywords) |

---

## 4. Phase-by-Phase Implementation Plan

### Phase 1: Slicer Core Modernization (`extension/slicer_core.js`)
- [ ] Export `DynamicCabinProbeEngine` extending `SmartBatcher`.
- [ ] Implement `resolveAdaptiveExecutionTree(probeFn, basePayload, options)`:
  - Step 1: Probe entire search root. If `<= 250`, return single root cabinet.
  - Step 2: If `> 250`, expand root into macro brackets (`51-100`, `101-200`, `201-500`, `501-1000`, `1001-5000`, `5001-10000`, `10001`).
  - Step 3: Probe each macro bracket. Bisect only the brackets that exceed 250 leads.
  - Step 4: Pivot to seniorities and email status only on stubborn single-integer chunks exceeding 250.
- [ ] Guarantee **zero keyword dependencies** and **zero industry tag dependencies**.

### Phase 2: In-Page Harvest Engine Integration (`extension/injected.js`)
- [ ] In `startHarvest()`, replace the static `generateMultiDimensionalPlan()` call with the async `resolveAdaptiveExecutionTree()`.
- [ ] Define the live probe function:
  ```javascript
  async function probeCabinet(subFilters) {
    const payload = { ...base, ...subFilters, page: 1, per_page: 1 };
    const res = await rawFetch(searchEndpoint, { method: 'POST', headers: getApolloHeaders(), body: JSON.stringify(payload) });
    const json = await res.json();
    return json.pagination?.total_entries || 0;
  }
  ```
- [ ] Integrate pacing: add 300ms–600ms micro-delay between probe requests to maintain smooth network flow.
- [ ] Update `sessionStorage` checkpoint format to persist both discovered plan and completed unit IDs.

### Phase 3: Mission Control HUD Sync (`extension/content.js`)
- [ ] Update `formatMissionControlState()` to render dynamic cabinet progress (`Unit ${current} of ${activeQueueTotal}`).
- [ ] Add probe phase telemetry indicator: `[Probing Density]` badge when evaluating initial ranges.
- [ ] Ensure ETA calculation accounts for dynamic queue expansion without sudden spikes.

### Phase 4: Automated Testing (`tests/smart_batcher.test.mjs`)
- [ ] Write mock probe tests for small searches (Total = 180 leads → asserts exactly 1 unit created).
- [ ] Write mock probe tests for medium searches (51-100 = 180 leads, 101-200 = 420 leads → asserts 51-100 stays 1 unit, 101-200 bisects).
- [ ] Write mock probe tests for large enterprise searches (10001 = 1,400 leads → asserts integer pivots to seniorities).
- [ ] Verify test suite green status (`npm test`).

### Phase 5: Browser CDP Verification & Real-World Validation
- [ ] Reload Chrome extension via CDP service worker reload.
- [ ] Test Query 1: Targeted C-Suite Search (`personDepartmentOrSubdepartments[]=c_suite`).
  - Expected: Pre-flight check detects ~300 leads → schedules **2 to 3 units** (Done in <25s).
- [ ] Test Query 2: Full HR Search (`personDepartmentOrSubdepartments[]=master_human_resources`).
  - Expected: Sparse brackets skip or stay single units; dense pools bisect; harvests ~11.9K leads with minimal calls.
- [ ] Verify CSV export deduplication and line count integrity.

---

## 5. Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Probe Request Volume on cold start | Medium | Cache probe results in memory during session; never re-probe identical filter sets. |
| Cloudflare Challenge during probing | High | Enforce minimum 400ms delay between probes; pause and notify if `x-apollo-challenge` is detected. |
| Apollo pagination drift during bisection | Low | Client-side `Set(id)` deduplication ensures that boundary records between bisected brackets are never duplicated. |

---

## 6. Stop-Loss & Validation Gates

1. **Gate 1 (Math & Unit Tests):** `npm test` must pass 100% green with new adaptive probe test suite before touching Chrome extension files.
2. **Gate 2 (Targeted Search Verification):** Running the C-Suite search must generate **≤ 5 units total**. If it generates > 10 units, execution halts immediately for parameter inspection.
3. **Gate 3 (Lead Yield):** Verification that no reachable leads are left behind by checking that every leaf cabinet has `total_entries <= 250`.
