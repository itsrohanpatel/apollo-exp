# Implementation Plan: Repository Hardening, Privacy Remediation & Storage Optimization

> **Status:** Draft / Ready for Review  
> **Target Version:** 2.1.1  
> **Scope:** Security, Storage Quotas, Memory Optimization, Script Modernization, Test Expansion  

---

## 1. Executive Summary & Problem Breakdown

During a thorough architectural and code review (`/ponytail-review`), 7 concrete issues across security, scalability, performance, and code duplication were surfaced:

| # | Severity | Component | Issue Description | Expected Impact |
|---|---|---|---|---|
| 1 | **MUST FIX** | `scripts/last_scraped_leads.json` | 21,126 lines (2.3 MB) of live scraped personal leads (names, emails, LinkedIn URLs, company IDs) was pushed to GitHub. | Contact data publicly exposed in git repository. |
| 2 | **MUST FIX** | `extension/manifest.json` | Missing `"unlimitedStorage"` permission. Chrome limits extension local storage to 10 MB. | Harvester crashes and drops leads once a harvest crosses ~5,000 leads. |
| 3 | **MUST FIX** | `scripts/sanitize_new_csv.mjs` | Imports non-existent `sanitizeCSVValue` from `extension/slicer_core.js`. | Script crashes immediately with `SyntaxError` on execution. |
| 4 | **SHOULD FIX** | `extension/popup.js` | Popup calls `chrome.storage.local.get(['scrapedLeads', ...])` on every render cycle. | High latency, memory spikes, and UI stutter when holding 10,000–50,000 leads. |
| 5 | **SHOULD FIX** | `scripts/extract_frames.mjs` | Hardcodes local machine path (`C:/Users/rohan/.gemini/antigravity-ide/brain/...`). | Script breaks on any other development environment or Codespaces. |
| 6 | **SHOULD FIX** | `scripts/compare_csvs.mjs`, `sanitize_new_csv.mjs`, `parse_csv_proper.mjs` | Identical 40-line `parseCSV` state machine is copy-pasted across three scripts. | Code bloat; bug fixes in one script do not propagate to the others. |
| 7 | **NICE TO HAVE** | `extension/background.js` & `slicer_core.js` | `buildUnionCSV` is defined identically in both files (45 lines duplicated). | Maintenance hazard for CSV column ordering and escaping changes. |

---

## 2. Architecture & Design Principles

1. **Security & Privacy First:** Zero personal/scraped data stored in source control. Strict `.gitignore` boundaries.
2. **Formula Injection (DDE) Defense:** All CSV output fields starting with `=, +, -, @, \t, \r` must be sanitized with a leading `'` to prevent spreadsheet code execution.
3. **Strict Single-Line CSV Integrity:** Embedded newlines (`\r\n`, `\n`) in scraped company bios and headlines must be collapsed to single spaces so every record is guaranteed to occupy exactly one physical line.
4. **Memory Decoupling:** The popup UI must never load bulk data arrays. The background worker isolates a lightweight 5-item preview array (`previewLeads`, `previewCompanies`) for rendering.
5. **DRY & Test-Driven Development (TDD):** Shared utilities (`parseCSV`, `sanitizeCSVValue`, `buildUnionCSV`) exist in single authoritative modules and are covered by automated tests before release.

---

## 3. Step-by-Step Implementation Plan

### Phase 1: Security & Privacy Remediation (Data Removal & Gitignore)
**Goal:** Remove scraped contact dumps from git tracking and prevent future leaks.

1. **Untrack Scraped JSON:**
   - Execute: `git rm --cached scripts/last_scraped_leads.json`
   - Confirm file remains on local disk for offline analysis but is removed from Git index.
2. **Harden `.gitignore`:**
   - Add explicit pattern to [.gitignore](file:///d:/Codinf%20projets/apollo%20scraper/.gitignore):
     ```gitignore
     # Local Scraped JSON & Data Dumps
     scripts/*.json
     scripts/last_scraped_leads.json
     data/*.json
     *.json.gz
     ```
3. **Commit & Push Security Fix:**
   - Commit: `fix(security): untrack scraped leads json and update gitignore`
   - Push to `origin main`.

---

### Phase 2: Chrome Extension Storage Quota Hardening
**Goal:** Prevent Chrome's 10MB quota crashes during 10,000+ lead scrapes.

1. **Update Manifest Permissions:**
   - File: [`extension/manifest.json`](file:///d:/Codinf%20projets/apollo%20scraper/extension/manifest.json#L11-L15)
   - Add `"unlimitedStorage"` to permissions array:
     ```json
     "permissions": [
       "storage",
       "unlimitedStorage",
       "activeTab",
       "downloads"
     ],
     ```
2. **Bump Extension Version:**
   - Update version from `2.0.0` to `2.1.1` in `manifest.json`.

---

### Phase 3: CSV Security & Formula Injection Sanitization
**Goal:** Implement `sanitizeCSVValue`, integrate it into `buildUnionCSV`, and fix `scripts/sanitize_new_csv.mjs`.

1. **Implement `sanitizeCSVValue` in [`extension/slicer_core.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/slicer_core.js):**
   ```javascript
   export function sanitizeCSVValue(val, options = { singleLine: true, escapeFormulas: true }) {
     if (val === null || val === undefined) return '';
     let str = typeof val === 'object' ? JSON.stringify(val) : String(val);

     // 1. Single-line mode: collapse newlines to a single space
     if (options.singleLine) {
       str = str.replace(/[\r\n]+/g, ' ').trim();
     }

     // 2. Formula injection protection (DDE / Excel CSV Injection):
     // Prefix dangerous trigger characters (=, +, -, @, \t, \r) with a single quote '
     if (options.escapeFormulas && /^[=+\-@\t\r]/.test(str)) {
       str = "'" + str;
     }

     return str;
   }
   ```
2. **Wire `sanitizeCSVValue` into `buildUnionCSV` in [`extension/slicer_core.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/slicer_core.js):**
   ```javascript
   const rows = items.map(item => {
     return headers.map(header => {
       let val = item[header];
       val = sanitizeCSVValue(val, { singleLine: true, escapeFormulas: true });

       if (val.includes('"') || val.includes(',')) {
         val = `"${val.replace(/"/g, '""')}"`;
       }
       return val;
     }).join(',');
   });
   ```
3. **Fix `scripts/sanitize_new_csv.mjs`:**
   - Resolve import: now imports working `sanitizeCSVValue` and `buildUnionCSV` from `../extension/slicer_core.js`.
   - Correct input path to point to `data/apollo_universal_leads_2026-10-18new.csv` (or relative path fallback if missing).

---

### Phase 4: Popup Performance & Memory Optimization
**Goal:** Reduce popup memory footprint from ~20MB to ~5KB by eliminating bulk data reads on render.

1. **Background Service Worker (`extension/background.js`):**
   - Update `syncStorage()` to maintain isolated preview arrays:
     ```javascript
     function syncStorage() {
       const recentLeads = Array.from(state.leads.values()).slice(-5).reverse();
       const recentCompanies = Array.from(state.companies.values()).slice(-5).reverse();

       chrome.storage.local.set({
         leadsCount: state.leads.size,
         companiesCount: state.companies.size,
         previewLeads: recentLeads,
         previewCompanies: recentCompanies,
         scrapedLeads: Array.from(state.leads.values()),
         scrapedCompanies: Array.from(state.companies.values()),
         isHarvesting: state.isHarvesting,
         deepEnrichmentEnabled: state.deepEnrichmentEnabled,
         enrichmentStats: state.enrichmentStats,
         harvestProgress: state.harvestProgress,
         circuitBreaker: state.circuitBreaker,
         dailyHarvestedCount: state.dailyHarvestedCount
       });
     }
     ```
2. **Popup Controller (`extension/popup.js`):**
   - Update `renderState()` to fetch `previewLeads` and `previewCompanies` instead of `scrapedLeads` and `scrapedCompanies`:
     ```javascript
     chrome.storage.local.get([
       'leadsCount',
       'companiesCount',
       'isHarvesting',
       'harvestProgress',
       'circuitBreaker',
       'previewLeads',
       'previewCompanies',
       'deepEnrichmentEnabled',
       'enrichmentStats'
     ], (data) => {
       const leadsCount = data.leadsCount || 0;
       const companiesCount = data.companiesCount || 0;
       const leads = data.previewLeads || [];
       const companies = data.previewCompanies || [];
       // render preview table with 5 items max without holding full dataset
     ```

---

### Phase 5: Script Modernization, Parser Deduplication & Cleanup
**Goal:** Consolidate duplicate CSV parsing logic and prune scratch scripts with hardcoded paths.

1. **Export `parseCSV` from [`extension/slicer_core.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/slicer_core.js):**
   - Export standard RFC 4180 streaming state-machine parser.
2. **Refactor Scripts to Use Shared `parseCSV`:**
   - Update [`scripts/compare_csvs.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/compare_csvs.mjs) and [`scripts/sanitize_new_csv.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/sanitize_new_csv.mjs) to import `parseCSV` from `../extension/slicer_core.js`.
   - Remove duplicate copy-pasted implementations (-80 lines).
3. **Prune / Fix One-Off Video Scratch Scripts:**
   - Either delete or move unregistered scratch scripts (`extract_frames.mjs`, `extract_hud_crop.mjs`, `extract_steps.mjs`, `crop_hud.mjs`, `inspect_video.mjs`) to `scratch/` or replace absolute machine paths with safe fallback guards if video file is missing.

---

### Phase 6: TDD Test Expansion & Verification
**Goal:** Add unit tests validating new sanitization, formula escaping, and storage boundaries.

1. **Add Unit Tests in [`tests/comprehensive_data.test.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/tests/comprehensive_data.test.mjs):**
   - Test: `sanitizeCSVValue escapes formula injection triggers (=, +, -, @, \t, \r) with leading single quote`
   - Test: `sanitizeCSVValue collapses multiline text into single physical line`
   - Test: `buildUnionCSV applies sanitizeCSVValue across all fields while preserving valid quotes and commas`
2. **Execute Full Test Suite:**
   - Run `npm test` and verify that all 15 test suites and 67+ tests pass with zero regressions.
3. **Verify Git Cleanliness:**
   - Run `git status` and verify clean working tree.

---

## 4. Key Files to Modify

| File | Change | Expected Diff |
|---|---|---|
| [.gitignore](file:///d:/Codinf%20projets/apollo%20scraper/.gitignore) | Add `scripts/*.json` | +3 lines |
| [`extension/manifest.json`](file:///d:/Codinf%20projets/apollo%20scraper/extension/manifest.json) | Add `"unlimitedStorage"` | +1 line |
| [`extension/slicer_core.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/slicer_core.js) | Export `sanitizeCSVValue`, `parseCSV`, wire into `buildUnionCSV` | +35 lines |
| [`extension/background.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/background.js) | Add `previewLeads`/`previewCompanies` to `syncStorage()`, import `buildUnionCSV` | +8 lines, -45 lines |
| [`extension/popup.js`](file:///d:/Codinf%20projets/apollo%20scraper/extension/popup.js) | Read `previewLeads`/`previewCompanies` instead of full datasets | +4 lines, -6 lines |
| [`scripts/sanitize_new_csv.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/sanitize_new_csv.mjs) | Fix import and use shared `parseCSV` | -40 lines |
| [`scripts/compare_csvs.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/compare_csvs.mjs) | Use shared `parseCSV` | -40 lines |
| [`tests/comprehensive_data.test.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/tests/comprehensive_data.test.mjs) | Add formula injection & sanitization test cases | +25 lines |

---

## 5. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| Existing stored leads in user's Chrome profile might not have `previewLeads` key | Medium | Low | Fallback in `popup.js`: `data.previewLeads \|\| (data.scrapedLeads && data.scrapedLeads.slice(-5)) \|\| []`. |
| Formula escaping (`'=1+1`) might display visible `'` in non-spreadsheet viewers | Low | Low | Standard industry practice (OWASP CSV Injection defense); prevents spreadsheet malware execution. |
| Large git history if `last_scraped_leads.json` remains in commit `88fc6f3` | High | Medium | File was committed in the very first commit. Can either `git rm` in commit #2 or amend commit #1 before sharing widely. |

---

## 6. Execution Command Sequence

```bash
# 1. Untrack lead dump & update gitignore
git rm --cached scripts/last_scraped_leads.json
# (Edit .gitignore)

# 2. Apply code edits to manifest, slicer_core, background, popup, scripts

# 3. Run test suites to verify 100% pass
npm test

# 4. Commit and push hardened version
git add .
git commit -m "fix: harden storage quotas, sanitize csv formula injection, optimize popup memory, and untrack scraped data"
git push origin main
```
