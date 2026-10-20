# Implementation Plan: Apollo Scraper Resumable Harvest, Robust CSV Export & Popup Performance Optimization (v3)

**Date:** 2026-10-20  
**Status:** DRAFT (Updated with Popup Lag Fix — Awaiting Approval)  
**Target Goal:** Eliminate cabinet replay/redundant cooldowns, provide instant resumption from pending cabinets, guarantee reliable CSV filename extensions, fix extension popup opening lag, and handle background API HTML errors gracefully.

---

### Task Type
- [x] Fullstack (Extension Popup UI + Frontend HUD + Injected Slicer Engine + Background Worker)

---

### Root Cause Analysis: The 3 Main Issues

1. **Why the Extension Popup is Laggy When Clicked:**
   - **Root Cause #1 (Full Storage Deserialization):** In [`extension/popup.js:L40-L50`](file:///d:/Codinf%20projets/apollo%20scraper/extension/popup.js#L40-L50), opening the popup calls `chrome.storage.local.get(['leadsCount', ...])`. Because `chrome.storage.local` has accumulated large background snapshots and cached organization objects (`apollo_cached_orgs_v1`), Chromium must deserialize the entire JSON key-value store from disk into memory before firing the popup's render callback, causing a noticeable 1–2 second freeze.
   - **Root Cause #2 (Repeated Un-debounced Re-renders):** In [`extension/popup.js:L185-L189`](file:///d:/Codinf%20projets/apollo%20scraper/extension/popup.js#L185-L189), `chrome.storage.onChanged` fires on every single telemetry ping, triggering `renderState()` and full DOM re-parsing without any requestAnimationFrame or throttle.
   - **Root Cause #3 (Legacy Fallback Array in Storage):** In [`extension/background.js:L153-L165`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js#L153-L165), previous versions saved large lead dumps directly in `chrome.storage.local`.
2. **Why Cloudflare Wasn't Visible on the Page:**
   - The Cloudflare response was returned inside a background `fetch()` network stream to `/api/v1/mixed_people/search`, **not on the web page**. Apollo handles background API errors invisibly, causing the loop to exit without any prompt on your screen.
3. **Why CSV Download Missing Extension:**
   - Multi-megabyte Data URIs (~28.5 MB) cause Chrome's download manager on Windows to drop the suggested filename and default to saving as the raw download UUID (`05c3c2fb-0ce1-4366-aab3-05745122488b`) without `.csv`.

---

### Comprehensive Multi-Step Implementation Plan

#### Step 1: Fix Extension Popup Lag & Eliminate Storage Bloat
1. **Direct Background Query via Message Port ([`extension/popup.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/popup.js)):**
   - Instead of reading the entire disk-backed `chrome.storage.local` store, `popup.js` will send an instant memory query:  
     `chrome.runtime.sendMessage({ action: 'GET_POPUP_STATE' }, (state) => { ... })`.
   - The background service worker responds in < 5 milliseconds directly from in-memory `state` scalars (leads count, companies count, status, enrichment stats, 5-lead preview).
   - This completely bypasses the disk read and JSON deserialization bottleneck, making the popup open instantly.
2. **Throttle Storage Change Updates:**
   - Wrap `renderState()` in `requestAnimationFrame()` with a 250ms throttle so rapid background pings do not lock up the popup UI thread.
3. **Clean Up Legacy Bloat from `chrome.storage.local` ([`extension/background.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js)):**
   - Clean out legacy full-array keys (`scrapedLeads`, `scrapedCompanies`, `apollo_cached_orgs_v1`) from `chrome.storage.local` to keep the extension storage footprint lean (< 50 KB). All bulk data remains safely in IndexedDB and CSV exports.

#### Step 2: In-Flight Checkpoint & Instant Resumption (Skip Cabinets 1–46)
1. In [`extension/injected.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/injected.js):
   - Save the active cabinet index (e.g. 47) and completed cabinet IDs in `sessionStorage` alongside a hash of active search filters.
   - When restarting or resuming, it detects the checkpoint, confirms filters match, and **jumps directly to Cabinet 47**, completely skipping Cabinets 1–46 (0s delay, 0 redundant anti-ban cooldowns).
   - Pre-loads all previously collected lead IDs so deduplication remains 100% airtight.

#### Step 3: Reliable `.csv` File Extension Export
1. In [`extension/content.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/content.js) and [`background.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js):
   - Replace the 28 MB `data:` URL download with a client-side Blob ObjectURL click in the page context.
   - Generates `<a download="apollo_leads_YYYY-MM-DD.csv">` directly, guaranteeing Windows and Excel always recognize the file as a valid `.csv`.

#### Step 4: Network/API Error Auto-Retry & Clear Telemetry
1. When Apollo returns non-JSON or a temporary 429/503/Cloudflare challenge:
   - Instead of terminating the scraper silently, the engine automatically pauses for a 15-second backoff and retries the cabinet.
   - Displays real-time status on the HUD: `"⚠️ Temporary API slowdown — retrying in 15s..."`.

#### Step 5: Verification & Automated Test Suite
1. Run `npm test` across all 110 automated tests.
2. Add regression tests in `tests/harvest_resumption.test.mjs` verifying:
   - Checkpoint resumption skips already finished slices.
   - `GET_POPUP_STATE` responds in memory without storage serialization lag.

---

### Key Files Touched

| File | Operation | Description |
| :--- | :--- | :--- |
| [`extension/popup.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/popup.js) | Modify | Instant in-memory state query via `GET_POPUP_STATE`, throttled UI rendering |
| [`extension/background.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js) | Modify | Add `GET_POPUP_STATE` handler, clean legacy storage keys, ObjectURL CSV streaming |
| [`extension/injected.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/injected.js) | Modify | Checkpoint resumption jump (skip 1–46), non-JSON auto-retry |
| [`extension/content.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/content.js) | Modify | Reliable DOM anchor Blob CSV download, HUD Resume vs Restart UX |
| [`tests/harvest_resumption.test.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/tests/harvest_resumption.test.mjs) | Create | Unit test suite for checkpoint resumption & popup state response |

---

### Risks and Mitigation

| Risk | Mitigation |
| :--- | :--- |
| Popup opened while background worker is sleeping | `GET_POPUP_STATE` wakes the MV3 worker instantly; fallback to `chrome.storage.local` if response exceeds 150ms. |
| User changes search filters | Filter hash mismatch automatically resets checkpoint and begins clean from Cabinet 1. |
| CSV download memory usage | ObjectURL is revoked immediately after click to prevent DOM memory leaks. |
