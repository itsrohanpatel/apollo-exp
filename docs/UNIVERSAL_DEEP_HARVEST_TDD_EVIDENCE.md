# TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)

**Source Plan**: [`.claude/plans/universal-deep-harvest-engine.plan.md`](file:///d:/Codinf%20projets/apollo%20scraper/.claude/plans/universal-deep-harvest-engine.plan.md)  
**Execution Date**: 2026-10-17  
**Test Suite**: [`tests/slicer_engine.test.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/tests/slicer_engine.test.mjs), [`tests/circuit_breaker.test.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/tests/circuit_breaker.test.mjs)  
**Test Runner**: Node.js v22.14.0 native test runner (`node --test`)  
**Result**: **10 Passed, 0 Failed, 100% Coverage of Core Guarantees**

---

## 1. User Journeys & Core Guarantees

1. **User Journey 1: Universal Headcount Slicing**
   - *As a lead generator*, I want the extension to automatically partition my search into contiguous headcount ranges (e.g. `1,10`, `11,20`, ..., `10001+`), so that each query remains strictly $\le 125$ leads and bypasses the 5-page ceiling without modifying my search filters.
2. **User Journey 2: Micro-Range Subdivision**
   - *As an enterprise scraper*, I want dense headcount brackets to subdivide into micro-ranges (e.g. `100,105`, `106,110`), so that even high-density metropolitan searches never truncate results.
3. **User Journey 3: Zero Duplicate Leads Guarantee**
   - *As an outreach specialist*, I want incoming leads from overlapping slices to be deduplicated in real-time by Apollo Person ID or LinkedIn URL, so that my export contains 100% unique prospects.
4. **User Journey 4: Anti-Ban Pacing & Circuit Breaker Protection**
   - *As an account owner*, I want the scraper to enforce humanized random delay (2.0s–3.8s), 45-second batch cooldowns, and an immediate emergency stop if Apollo returns HTTP 429/403, so that my account is never flagged or banned.

---

## 2. Test Specification & Verification Matrix

| # | What is Guaranteed | Test Name | Test File | Result | Evidence Output |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | Continuous contiguous headcount coverage | `generates valid contiguous headcount brackets covering 1 to 10001+` | `tests/slicer_engine.test.mjs` | **PASS** | `ok 1 - generates valid contiguous headcount brackets` |
| **2** | Micro-range density breakdown | `subdivides high-volume brackets into micro-ranges when requested` | `tests/slicer_engine.test.mjs` | **PASS** | `ok 2 - subdivides high-volume brackets into micro-ranges` |
| **3** | Humanized jitter bounds enforcement | `generates safe humanized pacing delay within safe bounds (2000ms - 3800ms)` | `tests/slicer_engine.test.mjs` | **PASS** | `ok 3 - generates safe humanized pacing delay` |
| **4** | Real-time lead deduplication | `DeduplicationStore accurately tracks unique leads and rejects duplicates` | `tests/slicer_engine.test.mjs` | **PASS** | `ok 4 - DeduplicationStore accurately tracks unique leads` |
| **5** | Filter-agnostic exclusion injection | `buildExclusionPayload injects excluded_organization_ids and person_ids_excluded correctly` | `tests/slicer_engine.test.mjs` | **PASS** | `ok 5 - buildExclusionPayload injects excluded_organization_ids` |
| **6** | Healthy HTTP 200 pass-through | `allows normal HTTP 200 responses to proceed` | `tests/circuit_breaker.test.mjs` | **PASS** | `ok 1 - allows normal HTTP 200 responses to proceed` |
| **7** | Instant halt on HTTP 429 | `immediately trips and halts on HTTP 429 Too Many Requests` | `tests/circuit_breaker.test.mjs` | **PASS** | `ok 2 - immediately trips and halts on HTTP 429` |
| **8** | Instant halt on HTTP 403 / Cloudflare | `immediately trips and halts on HTTP 403 Forbidden / Cloudflare challenge` | `tests/circuit_breaker.test.mjs` | **PASS** | `ok 3 - immediately trips and halts on HTTP 403` |
| **9** | Daily volume threshold protection | `trips when daily account volume threshold is exceeded` | `tests/circuit_breaker.test.mjs` | **PASS** | `ok 4 - trips when daily account volume threshold is exceeded` |
| **10** | Batch cooldown interval identification | `shouldTriggerCooldown identifies when to pause for 45s batch rest` | `tests/circuit_breaker.test.mjs` | **PASS** | `ok 5 - shouldTriggerCooldown identifies when to pause` |

---

## 3. TDD Progression Summary

- **RED Phase Verified**: Tests executed with `Cannot find module 'extension/slicer_core.js'` (Exit Code 1).
- **GREEN Phase Verified**: Implemented `extension/slicer_core.js` and re-ran tests. 10/10 assertions passed in 309ms (Exit Code 0).
- **Production Extension Integration**: Upgraded `extension/injected.js`, `extension/content.js`, `extension/background.js`, `extension/popup.html`, `extension/popup.css`, and `extension/popup.js`.
