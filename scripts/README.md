# Scripts & Diagnostic Tooling Registry

This directory contains long-term operational, diagnostic, and benchmarking utilities for the Apollo Scraper project.

> **Scripts Discipline Rule**: 
> Every script in this directory must have a documented long-term purpose in this registry. Any one-off or exploratory scratch scripts must be placed in temporary scratch locations or cleaned up immediately after verification.

---

## 🛠️ Tool Index & Run Guide

### 1. [`analyze_csv.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/analyze_csv.mjs)
* **Purpose**: Performs deep audit of exported CSV files (fill rates, empty columns, partial columns, 100% filled columns).
* **When to Use**: Whenever a user exports a dataset and wants to check for missing data or verify data completeness.
* **Usage**:
  ```bash
  node scripts/analyze_csv.mjs
  ```

### 2. [`inspect_live_apollo_data.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_live_apollo_data.mjs)
* **Purpose**: Connects to the live Apollo browser session via Chrome DevTools Protocol (CDP port 9222) and probes live API responses across people search, company search, and `/api/v1/organizations/{id}` detail endpoints.
* **When to Use**: To reverse-engineer new Apollo properties, check live cookies/CSRF, or verify schema changes without UI clicks.
* **Usage**:
  ```bash
  node scripts/inspect_live_apollo_data.mjs
  ```

### 3. [`test_company_scraper_live.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_company_scraper_live.mjs)
* **Purpose**: End-to-end integration test against live Apollo company search. Verifies moving window execution, company headcount acquisition, and live deduplication.
* **When to Use**: Before major releases touching the company harvesting engine.
* **Usage**:
  ```bash
  node scripts/test_company_scraper_live.mjs
  ```

### 4. [`test_zero_loss_export.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_zero_loss_export.mjs)
* **Purpose**: Verifies that the CSV exporter computes the complete mathematical union across all ingested items and does not drop any sparse attributes.
* **When to Use**: To validate CSV export formats or after modifying normalizers.
* **Usage**:
  ```bash
  node scripts/test_zero_loss_export.mjs
  ```

### 5. [`benchmark_org_enrich.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/benchmark_org_enrich.mjs)
* **Purpose**: Benchmarks throughput, latency, and rate-limit safety of the background organization enrichment queue (`/api/v1/organizations/{id}`).
* **When to Use**: To tune concurrency parameters (`maxConcurrency`, batch rest pacing) for zero-credit entity enrichment.
* **Usage**:
  ```bash
  node scripts/benchmark_org_enrich.mjs
  ```

### 6. [`reload_extension.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/reload_extension.mjs)
* **Purpose**: Programmatically reloads the unpacked Chrome Extension in the active Chrome instance via CDP so code changes take effect immediately without manual browser clicks.
* **When to Use**: After modifying `extension/background.js`, `extension/content.js`, or `extension/manifest.json`.
* **Usage**:
  ```bash
  node scripts/reload_extension.mjs
  ```

### 7. [`inspect_extension_state.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_extension_state.mjs) & [`inspect_runtime.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_runtime.py)
* **Purpose**: Inspects the background service worker's `chrome.storage.local`, HUD state, leads count, and anti-ban circuit breaker status.
* **When to Use**: During long-running harvests to monitor progress and verify state synchronization.
* **Usage**:
  ```bash
  node scripts/inspect_extension_state.mjs
  ```

### 8. [`inspect_stored_leads.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_stored_leads.py)
* **Purpose**: Inspects stored leads directly from Chrome storage to check key distribution and schema validity.
* **Usage**:
  ```bash
  python scripts/inspect_stored_leads.py
  ```

### 9. [`harvest_1000_leads.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/harvest_1000_leads.py)
* **Purpose**: Reference CLI orchestrator script for running automated 1,000+ lead harvests via direct CDP automation.
* **Usage**:
  ```bash
  python scripts/harvest_1000_leads.py
  ```
