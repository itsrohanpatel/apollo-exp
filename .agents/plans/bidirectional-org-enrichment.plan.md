# Plan: Bidirectional People -> Company Background Enrichment Queue

**Objective**: Automatically enrich all harvested people leads with deep company attributes (Complete Tech Stack with 120+ tools, Total Funding & Stage, Annual Revenue, and Company Description) by asynchronously routing unique company IDs through the 0-credit `/api/v1/organizations/{id}` background queue, without slowing down people search harvesting.

**Complexity**: Medium  
**Principle Adherence**: ECC TDD-first (tests before code), immutability (new objects on enrichment updates), security/rate-limit safety (bounded concurrency, jitter delays, circuit breaker integration), and scripts lifecycle discipline.

---

## 1. Ground Truth & Requirements

1. **Direct Search vs. Deep Enrichment**:
   - **From Search API (`p.organization`)**: `estimated_num_employees`, `industries`, `keywords`, `phone`, `founded_year`, `domain`, `headcount_growth`.
   - **Exclusive to `/api/v1/organizations/{id}`**: `technology_names` / `technologies` (120+ tools), `total_funding_printed` / `total_funding`, `annual_revenue_printed` / `annual_revenue`, `short_description`, `latest_funding_stage`.
2. **Key Requirements**:
   - As people leads are ingested into `background.js`, their `company_id` / `organization_id` is evaluated.
   - If the company is already cached and enriched, the lead is enriched immediately upon ingestion.
   - If not yet enriched, the company ID is enqueued into `CompanyEnrichmentEngine` (deduplicated, bounded concurrency: 3-5 workers, 200ms delay between calls).
   - Once an organization's payload returns:
     - The company record in `state.companies` is updated.
     - All leads in `state.leads` associated with that company ID are immutably updated with `company_technologies`, `company_funding`, `company_revenue`, `company_description`, and any extra keywords.
     - Storage (`chrome.storage.local`) is updated.
   - UI controls:
     - Toggle in popup: "⚡ Deep Org Enrichment (Tech Stack + Funding + Revenue)" (default: enabled).
     - Live enrichment progress counter in Popup / HUD.
   - Testing:
     - Unit tests covering queueing, deduplication, batch execution, mock fetching, error handling, and lead merging.
     - 100% pass on `npm test`.
     - Live verification on the active Apollo session.

---

## 2. Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Deduplication & Queueing | `extension/slicer_core.js:150` | Class-based store with `Set` of IDs, bounded processing loop |
| Record Normalization | `extension/slicer_core.js:710` | Pure functional transformation with field fallback chains |
| Lead Merging | `extension/background.js:304` | Immutable record creation `state.leads.set(key, { ...person, ...enrichedFields })` |
| Test Suite | `tests/comprehensive_data.test.mjs` | `node:test` + `node:assert/strict` with realistic Apollo JSON fixtures |

---

## 3. Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `tests/company_enrichment_queue.test.mjs` | **CREATE** | Unit tests for queue deduplication, concurrent fetching, error recovery, and immutable lead merging |
| `extension/slicer_core.js` | **UPDATE** | Export `CompanyEnrichmentEngine` class and `mergeEnrichedCompanyToPerson` helper |
| `extension/background.js` | **UPDATE** | Integrate `CompanyEnrichmentEngine`, auto-enrich on ingestion, update `PREFERRED_PERSON_COLUMNS` |
| `extension/popup.html` | **UPDATE** | Add toggle for Deep Org Enrichment and live enrichment indicator |
| `extension/popup.js` | **UPDATE** | Handle toggle state, sync with `background.js`, display enrichment stats |
| `extension/content.js` | **UPDATE** | Display enrichment status in the floating HUD |

---

## 4. Tasks & Execution Steps

### Phase 1: TDD - Unit Tests (RED)
- Create `tests/company_enrichment_queue.test.mjs`.
- Write test cases:
  1. `CompanyEnrichmentEngine` deduplicates queued IDs and skips already enriched or pending IDs.
  2. Concurrent processing executes with bounded batches and delay between requests.
  3. `mergeEnrichedCompanyToPerson` immutably updates a person lead with `company_technologies`, `company_funding`, `company_revenue`, `company_description` without mutating the original object.
  4. Network failures or 429/403 responses trigger backoff / safe skipping without crashing the queue.
  5. Cache hit immediately enriches arriving person lead if company was already fetched.
- Run tests (`npm test`) -> Ensure tests fail before implementation (RED).

### Phase 2: Implementation (GREEN)
- In `extension/slicer_core.js`:
  - Implement `mergeEnrichedCompanyToPerson(person, enrichedOrg)`.
  - Implement `CompanyEnrichmentEngine` with pluggable fetcher, concurrency control, in-memory cache, and event callbacks (`onCompanyEnriched`, `onProgress`).
- In `extension/background.js`:
  - Instantiate `CompanyEnrichmentEngine`.
  - Connect `onCompanyEnriched` to immutably update all matching person leads in `state.leads`.
  - In `ADD_LEADS`:
    - Enrich instantly if company is already in cache.
    - Otherwise, enqueue `company_id`.
  - Add `company_description` to `PREFERRED_PERSON_COLUMNS`.
  - Add message listener actions for toggling enrichment and checking enrichment queue status.
- In `extension/popup.html` & `popup.js`:
  - Add deep enrichment toggle and live status.
- In `extension/content.js`:
  - Update floating HUD to show enrichment activity.

### Phase 3: Verification & Integration (IMPROVE)
- Run `npm test` -> Ensure all tests pass with 0 failures across all 8 suites.
- Reload extension into live Chrome using `scripts/reload_extension.mjs`.
- Test live enrichment against real Apollo companies on the active tab.
- Verify exported CSV contains `company_technologies`, `company_funding`, and `company_revenue`.

### Phase 4: Cleanliness & Completion
- Clean up any transient test scripts.
- Verify `scripts/` matches `scripts/README.md`.
- Report final outcome and mark goal complete.
