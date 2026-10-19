# Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)

**Source Objective**: Build an autonomous, filter-agnostic Chrome Extension engine capable of harvesting 1,000 to 10,000+ Apollo leads without triggering 5-page/125-lead UI limits, without consuming export credits, and strictly preventing account/IP bans.
**Architecture Pattern**: Dynamic Binary Headcount Partitioning + Page-1 Dynamic ID Exclusion Window + Client-Side Memory Store.
**Complexity**: Large (Systemic Chrome Extension MV3 Engine + Anti-Ban Circuit Breaker + TDD Test Suite).

---

## 1. Requirements & Problem Restatement

1. **Bypass the 5-Page (125-Lead) Apollo Limit**:
   - Any single Apollo query is capped at 5 pages (25 leads/page = 125 leads).
   - Our engine must autonomously divide any user query into slices $\le 125$ leads, or use Page-1 dynamic exclusion so that 10,000 leads can be harvested smoothly.
2. **Filter Agnostic & Universal**:
   - Must NOT depend on hardcoded job titles or departments.
   - Must use universal mathematical dimensions: arbitrary continuous headcount brackets `[min, max]` (e.g. `100,105`, `106,110`) and dynamic organization/person ID exclusion (`excluded_organization_ids` / `person_ids_excluded`).
3. **100% Anti-Ban & Anti-Detection Architecture**:
   - **No rapid hammering**: Enforce humanized jitter intervals (2.0s – 3.8s between page fetches).
   - **Batch Cool-downs**: Automatic 45s pause every 250 leads (~10 requests) to evade Cloudflare Turnstile token refresh flags.
   - **Immediate Circuit Breaker**: Auto-halt if Apollo returns HTTP 429, 403, or a CAPTCHA challenge, preserving all harvested leads and alerting the user.
   - **Safe Daily Envelopes**: Built-in volume tracker warning if approaching recommended daily account limit (2,500 leads/day/account).
4. **Zero-Credit Client-Side Export**:
   - Never call Apollo's server-side export endpoint.
   - Normalize and store leads in extension memory; export via client-side Blob to CSV and JSON.
5. **Test-Driven Development (TDD)**:
   - Provide unit and integration test suite using Node.js native test runner (`node --test`) covering range splitting, deduplication, pacing, and circuit breakers.

---

## 2. Patterns to Mirror

| Category | Source File | Existing Pattern |
| :--- | :--- | :--- |
| **Network Injection** | `extension/injected.js` | Runs in `MAIN` execution world to intercept & issue authenticated in-session `fetch` calls. |
| **Content Script Bridge** | `extension/content.js` | Uses `window.postMessage` <-> `chrome.runtime.sendMessage` with floating DOM HUD. |
| **Central State Store** | `extension/background.js` | Normalizes person/company records, deduplicates by ID/LinkedIn, syncs to `chrome.storage.local`. |
| **Client-Side Export** | `extension/background.js:233-282` | `FileReader.readAsDataURL(blob)` -> `chrome.downloads.download`. |
| **Headcount Probing** | `scripts/test_custom_headcount.py` | Range arrays `["min,max"]` passed to `organization_num_employees_ranges`. |

---

## 3. Files to Create / Modify

| File | Action | Purpose |
| :--- | :--- | :--- |
| `tests/slicer_engine.test.mjs` | **CREATE** | TDD Unit test suite for Headcount Range Slicer, Pacing Generator, and Deduplication Map. |
| `tests/circuit_breaker.test.mjs` | **CREATE** | TDD Unit test suite for HTTP 429/Turnstile detector and session throttle limits. |
| `extension/slicer_core.js` | **CREATE** | Pure JavaScript algorithmic library for binary headcount splitting & query mutation. |
| `extension/injected.js` | **UPDATE** | Integrate autonomous Deep Harvest loop, query parameter sniffer, and in-tab safe fetch dispatcher. |
| `extension/content.js` | **UPDATE** | Bridge Deep Harvest messages between extension popup/background and injected script; update floating HUD with live slice indicators. |
| `extension/background.js` | **UPDATE** | Manage batch pauses, session state persistence, safety counters, and circuit breaker halts. |
| `extension/popup.html` | **UPDATE** | Add UI mode toggle (Standard vs. Universal Deep Harvest), target input, speed selector, and progress HUD. |
| `extension/popup.css` | **UPDATE** | Modern, responsive dark-mode styling for the deep harvest controls and progress metrics. |
| `extension/popup.js` | **UPDATE** | Event handlers for starting, pausing, stopping Deep Harvest, and live status polling. |

---

## 4. Implementation Tasks & Phases

### Phase 1: Test-Driven Development (TDD) Foundation
- **Task 1.1**: Write failing unit tests (`tests/slicer_engine.test.mjs`) for:
  - Binary headcount partitioning algorithm (dividing large spans into valid Apollo sub-ranges).
  - Deduplication key generator (guaranteeing 0 duplicate leads).
  - Pacing delay generator (verifying jitter boundaries).
- **Task 1.2**: Write failing unit tests (`tests/circuit_breaker.test.mjs`) for:
  - Error status classifier (200 OK vs 429 Rate Limited vs 403 Forbidden).
  - Batch cool-down trigger (firing after $N$ requests).
- **Task 1.3**: Validate RED test phase using `node --test tests/*.test.mjs`.

### Phase 2: Core Algorithm Library (`extension/slicer_core.js`)
- **Task 2.1**: Implement `generateHeadcountSlices(min, max, maxSpan)`:
  - Granular bracket generator for `1..10`, `11..20`, `21..50`, `51..100`, `101..200`, `201..500`, `501..1000`, `1001..5000`, `5001..10000`, `10001+`.
  - Sub-bracket generator for large bands (e.g. `100..105`, `106..110`, `116..120`).
- **Task 2.2**: Implement `createExclusionPayload(basePayload, collectedOrgIds, collectedPersonIds)`.
- **Task 2.3**: Validate GREEN test phase: all unit tests pass with 100% assertions.

### Phase 3: Engine Integration in Webpage Context (`injected.js` & `content.js`)
- **Task 3.1**: Enhance `injected.js` to remember the last intercepted search payload (`latestSearchPayload`).
- **Task 3.2**: Add `APOLLO_EXECUTE_UNIVERSAL_HARVEST` handler in `injected.js`:
  - Autonomous loop across headcount slices or Page-1 dynamic exclusion.
  - Safe pacing jitter between 2,000ms and 3,800ms.
  - Automatic halt on 429/403 status.
- **Task 3.3**: Update `content.js` to bridge commands and update on-page floating HUD.

### Phase 4: Extension UI & Background Service Worker Upgrade
- **Task 4.1**: Upgrade `extension/popup.html` and `popup.css`:
  - Mode switch: "Standard Quick Scrape" vs. "Universal Deep Harvest (10,000+ Leads)".
  - Target input (`100`, `500`, `1000`, `2500`, `10000`).
  - Method selector:
    - Mode 1: *Continuous Headcount Partitioning* (Recommended).
    - Mode 2: *Page-1 Dynamic Exclusion Window* (100% Filter-Agnostic).
  - Real-time progress bar, current slice indicator, and safety cooldown timer.
- **Task 4.2**: Upgrade `extension/background.js` and `popup.js`:
  - Message coordination, state persistence across tab reloads, and clean CSV/JSON downloads.

### Phase 5: Verification & Safety Audit
- **Task 5.1**: Run automated test suite: `node --test tests/*.test.mjs`.
- **Task 5.2**: Test in active Chrome browser on Apollo (`Page 51174463FC2E17945D26EAE2D96BDBE9`):
  - Verify popup loads cleanly.
  - Verify query sniffer captures active filters.
  - Verify safe harvest loop runs without errors or warnings.

---

## 5. Anti-Ban & Safety Defense Matrix

| Threat Vector | Root Cause | Built-in Extension Defense |
| :--- | :--- | :--- |
| **Cloudflare Turnstile Challenge** | Headless browser signature or burst traffic | **Browser Native**: Executes in real Chrome window with legitimate TLS/JA3 and mouse events. |
| **API Rate Limit (HTTP 429)** | Exceeding 40 requests/minute | **Human Pacing**: Strict 2.0s–3.8s randomized delay (~16 req/min max) + 45s batch rest every 250 leads. |
| **Account Daily Scrutiny** | 10k leads scraped in 20 minutes | **Pacing Governor**: Daily session volume meter with warning when exceeding 2,500 leads in a single account. |
| **Export Credit Depletion** | Triggering Apollo's server export | **Zero-Credit Architecture**: Data is captured directly from search response stream and converted into CSV via client-side Blob. |
| **Data Pollution / Duplicates** | Overlapping slices | **Bi-directional Deduplication**: In-memory Map keyed by `person.id` and `linkedin_url`. |

---

## 6. Acceptance Criteria

- [ ] Unit tests written before implementation (TDD RED phase).
- [ ] All unit tests pass with zero failures (TDD GREEN phase).
- [ ] Extension works with ANY Apollo search query without hardcoding titles or departments.
- [ ] Safe pacing (2.0s–3.8s) + 45s cooldowns enforced in code.
- [ ] Immediate circuit breaker stops on HTTP 429/403.
- [ ] Client-side CSV/JSON export produces clean 100% populated files with zero Apollo credits used.
