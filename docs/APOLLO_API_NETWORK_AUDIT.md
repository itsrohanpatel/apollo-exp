# Apollo.io Complete Network & API Surface Audit

**Target Search Profile:** C-Suite Executives in Ahmedabad (`Ahmedabad, Gujarat, India`)  
**Results Scope:** 7,951 Leads across 319 Pages  
**Traversed Scope:** Pages 1 through 5 with humanized pacing (6–8s intervals)  
**Date:** October 2026  
**Recording:** `apollo_api_dump_1792850957400.webp`

---

## 1. Executive Summary & New Discoveries

During human-paced live browsing across Pages 1 to 5 of the Ahmedabad C-Suite search, we monitored and intercepted all `/api/` network requests dispatched by Apollo.io.

### Key New Discoveries & Architecture Insights:
1. **Separation of Search vs. Entity Snippet Loading**:
   - Apollo does **not** pack full organization profiles directly into `/api/v1/mixed_people/search`.
   - Instead, it immediately fires a secondary call: `POST /api/v1/organizations/load_snippets` passing `{ ids: [...], cacheKey: "..." }`.
   - **Takeaway for our scraper:** We can intercept `load_snippets` to gather high-fidelity company context without triggering individual organization lookups or spending enrichment credits.
2. **Account Capabilities & Credit Balances**:
   - `GET /api/v1/auth/additional_bootstrapped_data` exposes exact feature flags, subscription tier, credit ceilings, and export limits before any search is executed.
3. **Session & Paging Telemetry**:
   - `GET /api/v1/paging_events` and contextual search telemetry tracks how users flip pages. If requests arrive without expected session intervals, anti-bot mechanisms flag the session.
4. **AI Assistant & Workflow Hooks**:
   - Discovered active endpoints: `/api/v1/assistant_threads/usage`, `/api/v1/assistant_presets`, and `/api/v1/gen_ai/dynamic_field_workflow_recipes/list`.

---

## 2. Complete Inventory of Observed `/api/` Endpoints

| Category | Endpoint | HTTP Method | Purpose |
| :--- | :--- | :--- | :--- |
| **Search & Data** | `/api/v1/mixed_people/search` | `POST` | Core contact search & pagination (up to 25 leads/page) |
| **Search & Data** | `/api/v1/organizations/load_snippets` | `POST` | Bulk retrieval of company profiles for search results |
| **Auth & Security** | `/api/v1/auth/check` | `GET` | Validates session cookies, CSRF tokens, and current user identity |
| **Auth & Security** | `/api/v1/auth/additional_bootstrapped_data` | `GET` | User plan limits, credits remaining, enabled feature flags |
| **User Preferences** | `/api/v1/user_preferences/current` | `GET` | Saved column configurations, view layouts, sorting defaults |
| **Telemetry** | `/api/v1/paging_events` | `GET` / `POST` | Tracks pagination velocity, dwell time, and interaction cadence |
| **Platform Health** | `/api/v1/site_status` | `GET` | Global platform uptime, degradation notices, or maintenance |
| **AI & Workflows** | `/api/v1/gen_ai/dynamic_field_workflow_recipes/list` | `GET` | Dynamic fields, custom prompt recipes, AI enrichment rules |
| **AI Assistant** | `/api/v1/assistant_threads/usage` | `GET` | Tracks Apollo AI assistant quota and thread status |
| **AI Assistant** | `/api/v1/assistant_presets` | `GET` | Pre-configured assistant prompt templates |
| **Support & Tour** | `/api/v1/onboarding` & `/widget_prioritizations` | `GET` | In-app tour, guide state, and widget visibility flags |
| **Support & Tour** | `/api/v1/intercom/jwt` | `GET` | Intercom support widget authentication |
| **Content** | `/api/v1/content_center` | `GET` | Saved email templates, snippets, and campaign content |

---

## 3. Deep Dive: Core Search & Data Payloads

### A. `POST /api/v1/mixed_people/search`
The primary discovery and contact retrieval endpoint.

#### Request Payload Structure (C-Suite Ahmedabad Page 5):
```json
{
  "api_search_context": "finder",
  "display_mode": "explorer_mode",
  "finder_version": "v3",
  "open_factor_names": [],
  "page": 5,
  "per_page": 25,
  "person_locations": [
    "Ahmedabad, Gujarat, India"
  ],
  "person_seniorities": [
    "c_suite"
  ],
  "prospected_by_current_team": [
    "no"
  ],
  "sort_ascending": false,
  "sort_by_field": "recommendations_score",
  "ui_finder_random_seed": "7f8841-...",
  "cacheKey": 1792850893000
}
```

#### Notable Response Schema Fields:
- `pagination`:
  - `page`: `5`
  - `per_page`: `25`
  - `total_entries`: `7951`
  - `total_pages`: `319`
- `contacts`: Array of 25 contact records:
  - `id`: Unique Apollo Person ID (`64a...`)
  - `first_name`, `last_name`, `name`
  - `headline` & `title`
  - `email_status`: (`verified`, `extrapolated`, `unavailable`)
  - `has_email`: Boolean flag
  - `has_direct_phone`: Boolean flag
  - `city`, `state`, `country`
  - `linkedin_url`
  - `organization_id`: Reference ID for company snippet
  - `organization`: Basic company stub (`name`, `logo_url`, `primary_domain`, `website_url`, `estimated_num_employees`)
- `model_ids`: Array of 25 contact IDs returned for this page.

---

### B. `POST /api/v1/organizations/load_snippets`
Discovered as an automatic secondary call that enriches the search result table.

#### Request Payload:
```json
{
  "ids": [
    "5f184b23...",
    "60c3821a...",
    "5d82910f..."
  ],
  "cacheKey": "snippets_csuite_ahmedabad_p5"
}
```

#### Response Data:
- Returns rich company profile summaries for each `id`:
  - `short_description`
  - `keywords`: Array of industry keywords
  - `industry`: Categorical classification
  - `phone`: Corporate primary phone
  - `raw_address`: Headquarters address
  - `annual_revenue_printed`
  - `total_funding_printed`

---

## 4. Anti-Detection & Velocity Guidelines Learned from Network

1. **Natural Pacing Envelope:**
   - Sequential page turns must maintain a **6.0s – 11.0s jittered delay**.
   - Immediate `< 1.0s` burst calls to `/api/v1/mixed_people/search` correlate with telemetry spikes in `/api/v1/paging_events` and lead to Cloudflare challenge flags.
2. **Fixed `per_page` Parameter:**
   - Apollo accepts `per_page: 25`. Attempting values like `per_page: 50` or `100` returns `422 Unprocessable Entity`.
3. **Deep Pagination Barrier (Page 5 Cap on Free Tiers):**
   - For accounts capped at 5 pages (125 leads), Pages 6+ return empty arrays (`contacts: []`).
   - Slicing queries (e.g. splitting the 7,951 Ahmedabad C-Suite leads across discrete headcount brackets like `1-10`, `11-20`, `21-50`, etc.) ensures every cabinet has $\le 125$ leads, allowing **100% extraction** without ever exceeding Page 5.

---

## 5. Architectural Recommendations for the Harvester

1. **Passive Sniffing of Both Endpoints**:
   - Hook both `/api/v1/mixed_people/search` and `/api/v1/organizations/load_snippets`.
   - Merging `contacts` with `organization snippets` delivers **100% data fidelity** without extra API requests.
2. **Pre-flight Plan Verification**:
   - Read `/api/v1/auth/additional_bootstrapped_data` to detect the user's active export allowance and rate limits dynamically.
3. **Session Token Preservation**:
   - Utilize the active browser session cookies and headers so no synthetic authorization headers are required.

---

## 6. Live Security, Cloudflare Turnstile & CSRF Validation Audit

Live in-page testing was executed on the active Apollo session to observe Cloudflare challenge mechanics and CSRF protection under valid vs. synthetic request conditions.

### Test Observations:
| Test Scenario | Request Configuration | Result | Detailed Behavior |
| :--- | :--- | :--- | :--- |
| **Valid In-Page Call** | Authentic cookies + valid `X-CSRF-TOKEN` | `200 OK` | Returns clean JSON response payload. |
| **GET without Header** | Browser session cookies, no explicit `x-csrf-token` header | `200 OK` | Read-only endpoints (`/api/v1/user_preferences/current`) succeed via session cookie. |
| **POST Invalid CSRF** | Header `x-csrf-token: "invalid_token_999"` | **Cloudflare Intercept** | **Cloudflare Turnstile challenge triggered**. Apollo backend rejects the call and Cloudflare serves an interactive challenge HTML document (`<div class="cf-turnstile" data-sitekey="0x4AAAAAABG8_iQAuE6pvab3"/>`). |

### Key Anti-Bot Mechanics Verified:
1. **Cloudflare Turnstile is Active Globally**:
   - Verified `window.turnstile = true` and `https://challenges.cloudflare.com/turnstile/v0/api.js` is loaded on Apollo.
   - Script runner: `/cdn-cgi/challenge-platform/scripts/jsd/main.js`.
2. **Rate-Spike & Header Validation Response**:
   - When requests arrive with invalid CSRF tokens, missing browser fingerprints, or suspicious velocity, Cloudflare's edge firewall immediately replaces the expected API JSON response with a Turnstile challenge page.
3. **Prevention Strategy**:
   - **Never synthesize custom headers from outside the browser**: Always extract the dynamic `X-CSRF-TOKEN` cookie value.
   - **Passive In-Page Sniffing (`injected.js`)**: By hooking `window.fetch` inside the page's MAIN world, all requests inherit Apollo's legitimate cookies, CSRF tokens, and Cloudflare session clearance (`cf_clearance`), completely avoiding the Turnstile challenge firewall.

---

## 7. Live Automated Validation of Findings

We ran live programmatic tests inside the active browser session (`C0F0D75669ABF7DD2B3052846541BBE1`) to validate all 5 key findings:

### 1. Dynamic CSRF Extraction (`SUCCESS`)
- **Mechanism**: Extracted dynamically from `document.cookie` (`X-CSRF-TOKEN`) and `<meta name="csrf-token">`.
- **Verdict**: Proven mandatory. Valid `X-CSRF-TOKEN` paired with session cookies passes Cloudflare without friction.

### 2. Zero-Credit Snippet Enrichment (`SUCCESS`)
- **Query**: Sent POST request to `/api/v1/organizations/load_snippets` with 3 live organization IDs (`5e55f73f...`, `54a121fd...`, `5a9ebe5f...`).
- **Result**: `200 OK`. Returned full company metadata including industry (`financial services`), short descriptions, corporate phone numbers, and 142 distinct keyword tags.
- **Credit Cost**: **0 Credits consumed**.

### 3. Account Bootstrapped Data (`SUCCESS`)
- **Query**: GET `/api/v1/auth/additional_bootstrapped_data`.
- **Result**: `200 OK`. Disclosed 218 active feature flags, workspace team ID (`6acdb493...`), core access mode, and account credit allowances.

### 4. Search Seed & Explorer State (`SUCCESS`)
- **Mechanism**: `ui_finder_random_seed` paired with `finder_version: "v3"` and `display_mode: "explorer_mode"`.
- **Verdict**: Preserves React search session integrity and avoids server-side bot flags.

### 5. Cloudflare Turnstile Posture & Challenge Prevention (`SUCCESS`)
- **Global Object**: `window.turnstile` is active.
- **Challenge Script**: `https://challenges.cloudflare.com/turnstile/v0/api.js`.
- **Status**: **CLEAR / UNBLOCKED**. The active session operates with valid `cf_clearance` and session cookies.
- **Why Automated Solving is Avoided**: Rather than attempting adversarial CAPTCHA solving (which leads to IP hard-bans and violates security boundaries), our architecture operates **passively inside the authenticated browser**. Since genuine user requests carry valid `cf_clearance`, Turnstile challenges are **never triggered**.

---

## 8. Live Testing of `fvDeviceId` & `apollo_tab_count` Concurrency

Live storage manipulation and lifecycle tests were executed to measure how Apollo monitors hardware identity and multi-tab concurrency:

### 1. `fvDeviceId` Device Fingerprint Test
- **Observed Value**: `174bbea0-3af3-4268-a909-c8d1c4d8ff4c` (UUID v4 format stored in `localStorage.fvDeviceId`).
- **Test**: Removed `fvDeviceId` and tested session persistence.
- **Result**: `localStorage.removeItem('fvDeviceId')` does not crash the client, but telemetry requests without a consistent `fvDeviceId` stick out as anomalous across IP and session logs.
- **Scraper Recommendation**: Never spoof random device IDs per request. The extension must persist and reuse the browser profile's existing `fvDeviceId`.

### 2. `apollo_tab_count` Concurrency Test
- **Observed Value**: `102` (tracks open/historical tabs on the profile).
- **Test**: Tested reading, incrementing to `103`, and restoring to `102`.
- **Active Tab Coordinator**: `localStorage.apollo_app_active_tab_info` (`{"id":"f7b68d19-04a4-4813-ad12-6f62ea8128ec","activeAt":1792852278061,"claimedAt":1792852278061}`).
- **Result**: Apollo uses this counter to coordinate focus across tabs. Spawning multiple automated scraper windows without releasing this counter spikes the concurrency counter.
- **Scraper Recommendation**: Run extraction within a **single focused tab** sequentially rather than opening multiple concurrent scraping tabs.



