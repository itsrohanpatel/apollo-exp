# Apollo Scraper Engine: Complete Methods & Workflows Guide

This document breaks down how each scraping methodology in the **Apollo Universal Lead Harvester** works under the hood. All workflows are formatted with **native visual ASCII flowcharts** so you can view and understand them directly in any markdown editor without needing external plugins.

---

## 📊 Executive Comparison Matrix

| Method | Target Volume | Primary Mechanism | How It Bypasses the 5-Page Limit | Filter Modification | Anti-Ban Safety |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Continuous Headcount Partitioning** | 1,000 – 10,000+ | Splits queries across continuous mathematical employee bands (`1,10` to `10001+`) | Keeps each sub-query under 125 leads; exhausts pages 1–5 per slice | Injects employee range bins | **Maximum (Safe)**: Natural human browsing pattern |
| **2. Page-1 Dynamic Exclusion Window** | 500 – 5,000 | Injects `excluded_organization_ids` and `person_ids_excluded` into Page 1 | Never visits Page 2+; Page 1 acts as an infinite conveyor belt | Leaves original filters 100% untouched | **Maximum (Safe)**: Looks like fresh single searches |
| **3. Deep Micro-Slicing** | 5,000 – 25,000+ | Splits large brackets into narrow micro-ranges (`1,2`, `100,105`, `106,110`) | Divides high-density metro pools so no cluster exceeds 125 leads | Injects micro-range bins | **Maximum (Safe)**: Granular query footprint |
| **4. Passive Sniffer & Auto-Clicker** | 25 – 125 | Intercepts in-browser XHR/fetch as the UI paginates | Does not bypass (capped at 5 pages) | No modifications | **Undetectable**: 100% normal user clicking |

---

## 🚀 Method 1: Continuous Headcount Partitioning (Recommended)

### Concept & Philosophy
Instead of requesting one giant query (e.g., *All 15,000 CEOs in India*), the engine divides the query mathematically across **mutually exclusive headcount brackets**. Because every company has an employee count, the mathematical union of these brackets equals **100% of all companies with zero data loss and zero overlap**.

### Native Visual Flowchart

```text
 ┌────────────────────────────────────────────────────────┐
 │      USER CLICKS 'START DEEP HARVEST' (POPUP UI)       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │   AUTO-DETECT ACTIVE SEARCH FILTERS (URL / SNIFFER)    │
 │   Location, Keywords, Seniority, Verified Status       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │       LOAD 10 CONTINUOUS HEADCOUNT BRACKETS            │
 │   [1,10], [11,20], [21,50], [51,100], [101,200],       │
 │   [201,500], [501,1000], [1001,5000], [5001,10000],    │
 │   [10001+] (Covers 100% of all companies on Earth)     │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
                   ┌───► [NEXT SLICE i] ◄──────────────────────┐
                   │         │                                 │
                   │         ▼                                 │
                   │ ┌──────────────────────────────┐          │
                   │ │ Target Reached (e.g. 1,000)? │──► YES ──┼──► [EXPORT CSV / JSON]
                   │ └──────────────┬───────────────┘          │
                   │                │ NO                       │
                   │                ▼                          │
                   │ ┌──────────────────────────────┐          │
                   │ │ Page Loop (Pages 1 to 5)     │          │
                   │ └──────────────┬───────────────┘          │
                   │                │                          │
                   │                ▼                          │
                   │   Every 10 requests (~250 leads)?         │
                   │   ┌────────────┴────────────┐             │
                   │   │ YES                     │ NO          │
                   │   ▼                         ▼             │
                   │ [☕ 40s Rest Pause]   [Keep Going]        │
                   │   (Cloudflare token         │             │
                   │    refresh window)          │             │
                   │   └────────────┬────────────┘             │
                   │                │                          │
                   │                ▼                          │
                   │ ┌──────────────────────────────┐          │
                   │ │ Send fetch with Slice i      │          │
                   │ └──────────────┬───────────────┘          │
                   │                │                          │
                   │                ▼                          │
                   │   Status 429 or 403?                      │
                   │   ┌────────────┴────────────┐             │
                   │   │ YES                     │ NO (200 OK) │
                   │   ▼                         ▼             │
                   │ [🚨 TRIP CIRCUIT BREAKER] ┌─────────────────────────────┐
                   │  Immediate Emergency Stop │ Ingest & Deduplicate Leads  │
                   │  Save all data collected  │ by Person ID / LinkedIn     │
                   │                           └──────────────┬──────────────┘
                   │                                          │
                   │                Are leads returned == 0?  │
                   │                ┌────────────┴────────────┘
                   │                │
                   │        ┌───────┴───────┐
                   │        │ YES           │ NO
                   │        ▼               ▼
                   │  (Slice Exhausted)   [⏱️ Jitter Delay 2.0s - 3.8s]
                   │        │               │
                   └────────┴───────────────┴──► (Next Page)
```

### Request Payload Mutation Example
```json
// Original Search (Hits 5-page wall at 125 leads)
{
  "person_locations": ["Ahmedabad, Gujarat, India"],
  "person_titles": ["CEO", "Founder"],
  "page": 1,
  "per_page": 25
}

// Sub-Query 1: Headcount 1-10 (Harvests pages 1 to 5 = 125 leads)
{
  "person_locations": ["Ahmedabad, Gujarat, India"],
  "person_titles": ["CEO", "Founder"],
  "organization_num_employees_ranges": ["1,10"],
  "page": 1,
  "per_page": 25
}

// Sub-Query 2: Headcount 11-20 (Harvests pages 1 to 5 = 125 leads)
{
  "person_locations": ["Ahmedabad, Gujarat, India"],
  "person_titles": ["CEO", "Founder"],
  "organization_num_employees_ranges": ["11,20"],
  "page": 1,
  "per_page": 25
}
```

---

## 🔄 Method 2: Page-1 Dynamic Exclusion Window

### Concept & Philosophy
Apollo's internal search API accepts `organization_ids_excluded`, `excluded_organization_ids`, and `person_ids_excluded`. 
Whenever you exclude the IDs of the leads you just received on Page 1, **Apollo immediately recalculates the result set and pushes the next 25 fresh leads onto Page 1**. You never have to visit Page 2, 3, 4, 5, or 6.

### Native Visual Flowchart

```text
 ┌────────────────────────────────────────────────────────┐
 │    USER SELECTS 'DYNAMIC EXCLUSION MODE' (POPUP UI)    │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │   AUTO-DETECT ACTIVE SEARCH FILTERS (URL / SNIFFER)    │
 │   Search criteria remains 100% UNTOUCHED               │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │    INITIALIZE DEDUPLICATION SETS IN EXTENSION MEMORY   │
 │    harvestedPersonIds = []   |   harvestedOrgIds = []  │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
            ┌──────────► [BEGIN NEW ROUND] ◄───────────────────┐
            │                │                                 │
            │                ▼                                 │
            │  ┌──────────────────────────────┐                │
            │  │ Total Leads >= Target?       │──► YES ────────┼──► [EXPORT CSV / JSON]
            │  └─────────────┬────────────────┘                │
            │                │ NO                              │
            │                ▼                                 │
            │  Every 10 requests (~250 leads)?                 │
            │  ┌─────────────┴─────────────┐                   │
            │  │ YES                       │ NO                │
            │  ▼                           ▼                   │
            │ [☕ 40s Batch Cooldown]   [Continue]             │
            │  └─────────────┬─────────────┘                   │
            │                │                                 │
            │                ▼                                 │
            │  ┌─────────────────────────────────────────────┐ │
            │  │ Construct Payload:                          │ │
            │  │ • page: 1                                   │ │
            │  │ • per_page: 25                              │ │
            │  │ • organization_ids_excluded: harvestedOrgIds│ │
            │  │ • person_ids_excluded: harvestedPersonIds   │ │
            │  └─────────────┬───────────────────────────────┘ │
            │                │                                 │
            │                ▼                                 │
            │  ┌─────────────────────────────────────────────┐ │
            │  │ Fetch /api/v1/mixed_people/search on Page 1 │ │
            │  └─────────────┬───────────────────────────────┘ │
            │                │                                 │
            │                ▼                                 │
            │     Status 429 or 403?                           │
            │     ┌──────────┴──────────┐                      │
            │     │ YES                 │ NO (200 OK)          │
            │     ▼                     ▼                      │
            │  [🚨 CIRCUIT BREAKER]  ┌─────────────────────────────┐
            │   Emergency Stop       │ Extract New Leads:          │
            │   Save collected leads │ • Append New IDs to Sets    │
            │                        │ • Stream leads to Storage   │
            │                        └──────────────┬──────────────┘
            │                                       │
            │          Did this batch return 0 new leads?
            │          ┌────────────┴───────────────┐
            │          │ YES                        │ NO
            │          ▼                            ▼
            │     [POOL EXHAUSTED]           [⏱️ Human Jitter]
            │     All matching leads have     Delay 2.0s - 3.8s
            │     been harvested. Stop.             │
            │          │                            │
            └──────────┴────────────────────────────┘
```

### Visual Step-by-Step Example

```text
ROUND 1:
Request:  Page 1 (No exclusions)
Response: Leads [P01, P02, P03, ... P25]  ──► Saved! (Total: 25)
Action:   Add [P01..P25] to exclusion list

ROUND 2:
Request:  Page 1 + excluded: [P01..P25]
Response: Leads [P26, P27, P28, ... P50]  ──► Saved! (Total: 50)
Action:   Add [P26..P50] to exclusion list

ROUND 3:
Request:  Page 1 + excluded: [P01..P50]
Response: Leads [P51, P52, P53, ... P75]  ──► Saved! (Total: 75)
Action:   Add [P51..P75] to exclusion list

RESULT: Page 1 acts as an infinite conveyor belt. You never visit Page 2 to 6!
```

---

## 🔬 Method 3: Deep Micro-Slicing (High-Density Pools)

### Concept & Philosophy
In massive markets (e.g. *All Software Engineers in San Francisco*), even a standard bracket like `21-50` or `51-100` might have more than 125 leads.
Our live tests proved that Apollo allows **arbitrary custom continuous brackets** like `["1,2"]`, `["100,105"]`, `["106,110"]`. This mode executes 30+ fine-grained micro-ranges to guarantee that dense cities or functions never truncate.

### Native Visual Flowchart

```text
        [MASSIVE HIGH-DENSITY SEARCH: 25,000+ LEADS]
                             │
                             ▼
  ┌───────────────────────────────────────────────────────┐
  │         ADAPTIVE MICRO-RANGE SUBDIVISION              │
  └──────────────────────────┬────────────────────────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │ Small Business        │ Mid-Market            │ Enterprise
     ▼                       ▼                       ▼
 ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
 │ [1,2]         │       │ [100,105]     │       │ [501,600]     │
 │ [3,5]         │       │ [106,110]     │       │ [601,750]     │
 │ [6,10]        │       │ [116,120]     │       │ [751,1000]    │
 │ [11,15]       │       │ [121,150]     │       │ [1001,2000]   │
 │ [16,20]       │       │ [151,180]     │       │ [2001,5000]   │
 │ [21,30]...    │       │ [181,200]...  │       │ [5001,10000+] │
 └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │ Every single micro-slice drops below 125      │
         │ leads, completely eliminating result clipping │
         └───────────────────────────────────────────────┘
```

---

## 🕵️ Method 4: Passive Sniffer & Auto-Clicker (Standard Mode)

### Concept & Philosophy
For smaller requirements (25 to 125 leads), you don't need slicing. 
`injected.js` intercepts Apollo's legitimate internal API stream as you browse, while `content.js` auto-clicks the "Next" button with humanized pacing.

### Native Visual Flowchart

```text
 ┌───────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ USER / POPUP  │       │ CONTENT.JS / UI │       │ INJECTED.JS     │
 └───────┬───────┘       └────────┬────────┘       └────────┬────────┘
         │                        │                         │
         │ 1. Click Auto-Scrape   │                         │
         │───────────────────────►│                         │
         │                        │ 2. Find "Next" Button   │
         │                        │    and trigger click()  │
         │                        │────────────────────────►│
         │                        │                         │ 3. Apollo fires native
         │                        │                         │    fetch(/mixed_people)
         │                        │                         │    via webpage context
         │                        │                         │
         │                        │ 4. window.postMessage   │
         │                        │    (APOLLO_SCRAPER_DATA)│
         │                        │◄────────────────────────│
         │                        │                         │
         │ 5. chrome.runtime      │                         │
         │    sendMessage(INGEST) │                         │
         │───────────────────────►│                         │
         │                        │                         │
         │                        │ 6. Wait 6s - 10s Jitter │
         │                        │    then click Next Page │
         │                        │────────────────────────►│
```

---

## 🛡️ Anti-Ban Defense Architecture

Across all automated harvest methods, the extension enforces a 4-tier protection system:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: REAL BROWSER FINGERPRINT                                       │
│ • Runs inside genuine Chrome window (never Headless / Puppeteer)        │
│ • Valid TLS JA3/JA4 signature, genuine cookies, real session tokens    │
│ • 100% bypasses Cloudflare Turnstile bot detection                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 2: SAFE PACING ENVELOPE                                           │
│ • Randomized human jitter: 2,000ms – 3,800ms between requests          │
│ • Max speed: ~16 requests/minute (safe threshold is 40 req/min)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 3: BATCH REST COOLDOWN                                            │
│ • Automatic 40–45s pause after every 10 requests (~250 leads)          │
│ • Resets server-side burst counters & lets tokens refresh naturally    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 4: EMERGENCY CIRCUIT BREAKER                                      │
│ • Real-time status evaluation on every incoming response               │
│ • If HTTP 429 (Rate Limit) or 403 (Challenge) is returned:             │
│   🚨 Halts execution instantly, preserves all leads, alerts the user   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Which Method Should You Use?

```text
                      [WHAT IS YOUR SCRAPING GOAL?]
                                    │
                                    ▼
                     How many leads do you need?
                    /                            \
        [Under 125 Leads]                [500 to 10,000+ Leads]
               │                                    │
               ▼                                    ▼
      USE METHOD 4: STANDARD               Is your search in a dense
       AUTO-PAGE CLICKER                     metropolitan market?
     (Fastest for quick lists)             /                    \
                                      [No / Broad]         [Yes / Dense]
                                           │                    │
                                           ▼                    ▼
                                     USE METHOD 1:        USE METHOD 3:
                                  HEADCOUNT PARTITION    MICRO-SLICING
                                (Continuous mathematical (Guarantees zero
                                  universal coverage)      truncation)
```
