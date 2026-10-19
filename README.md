# Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation

This repository contains the complete documentation, reverse-engineered internal APIs, and production-ready **Manifest V3 Chrome Extension** for extracting verified B2B leads and companies from [Apollo.io](https://app.apollo.io) at **zero export credit cost**.

---

## 📚 Complete Documentation & Plan Suite

All reverse-engineering analysis, official documentation, architectural designs, blueprints, and ECC integration patterns are located in the [`docs/`](file:///d:/Codinf%20projets/apollo%20scraper/docs) and [`.claude/plans/`](file:///d:/Codinf%20projets/apollo%20scraper/.claude/plans) folders:

| Documentation File | Description |
|---|---|
| [**`SCRAPING_METHODS_WORKFLOW_GUIDE.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/SCRAPING_METHODS_WORKFLOW_GUIDE.md) | **Complete Scraping Methods & Flowcharts:** Visual workflow diagrams, request lifecycles, API payload mutations, and comparative decision trees for all 4 scraping modes. |
| [**`universal-deep-harvest-engine.plan.md`**](file:///d:/Codinf%20projets/apollo%20scraper/.claude/plans/universal-deep-harvest-engine.plan.md) | **Master Plan & Blueprint (10,000+ Leads):** End-to-end ECC architectural plan detailing requirements, patterns to mirror, anti-ban defense matrix, task breakdown, and acceptance criteria. |
| [**`UNIVERSAL_DEEP_HARVEST_TDD_EVIDENCE.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/UNIVERSAL_DEEP_HARVEST_TDD_EVIDENCE.md) | **TDD Evidence & Verification Report:** Full test execution log (10/10 PASS) covering Headcount Range Partitioning, Deduplication Map, Human Pacing Jitter, HTTP 429 Circuit Breaker, and 45s Cooldown Triggers. |
| [**`BEYOND_5_PAGES_MASTER_STRATEGY.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/BEYOND_5_PAGES_MASTER_STRATEGY.md) | **Master Strategy to Bypass the 5-Page (125-Lead) Wall:** Complete architectural blueprint detailing 6 proven methodologies (Continuous Headcount Partitioning, Page-1 Dynamic ID Exclusion Window, Sorting Inversion, Account-First Pivot, Main-World Hooking, 0-Credit Client Assembly). |
| [**`MARKET_EXTENSIONS_AND_SCRAPERS_ANALYSIS.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/MARKET_EXTENSIONS_AND_SCRAPERS_ANALYSIS.md) | **Comparative Audit of 9 Open-Source Market Tools:** In-depth code review of 9 GitHub scrapers & extensions (Selenium, Puppeteer, Chrome MV3, Go CLI), their internal mechanics, vulnerabilities, and why they fail or degrade on modern Apollo. |
| [**`LESSONS_LEARNED_SCRAPING_1000_LEADS.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/LESSONS_LEARNED_SCRAPING_1000_LEADS.md) | **Empirical Lessons Scraping 1,000+ Leads:** Real-world testing findings on Apollo's strict 25 `per_page` hard validation limit, Cloudflare Turnstile velocity thresholds, latency dynamics, deduplication drift rates (3-6%), and anti-bot cool-down intervals. |
| [**`APOLLO_FILTERS_DEEP_DIVE.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/APOLLO_FILTERS_DEEP_DIVE.md) | **Exhaustive Free Filters Guide & Live ICP Tests:** Breaks down every single free filter for both People and Companies (30+ filters). Includes live verified tests for Ahmedabad HR Managers/CEOs (2,611 leads) and Ahmedabad 20+ employee companies (6,708 companies). |
| [**`APOLLO_INTERNAL_REVERSE_ENGINEERING.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/APOLLO_INTERNAL_REVERSE_ENGINEERING.md) | **Deep reverse-engineering of `app.apollo.io`:** Verified against live authenticated sessions. Detailed breakdown of CSRF token injection, session cookies, internal endpoints, full JSON schemas, and credit bypass logic. |
| [**`SCRAPER_EXTENSION_ARCHITECTURE.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/SCRAPER_EXTENSION_ARCHITECTURE.md) | **Chrome Extension Engineering Blueprint:** Manifest V3 design, why passive network interception beats DOM scraping, isolated vs. main execution worlds, deduplication algorithms, and safe auto-pagination. |
| [**`ECC_INTEGRATION_GUIDE.md`**](file:///d:/Codinf%20projets/apollo%20scraper/docs/ECC_INTEGRATION_GUIDE.md) | **Everything Claude Code (ECC) Pipeline:** Connects the scraper output into `data-scraper-agent` (batch Gemini Flash scoring, Notion/Sheets sync) and `lead-intelligence` (social graph ranking, warm intros, multi-channel outreach). |

---

## ⚡ Chrome Extension V2.1.0 Features

- **Universal 10,000+ Deep Harvest Engine:** Autonomously harvests beyond the 5-page ceiling on **any arbitrary search query** without altering your keywords, locations, or titles.
- **Continuous Mathematical Headcount Partitioning:** Partitions searches across contiguous employee brackets (`1,10`, `11,20`, ..., `10001+` and micro-ranges like `50,50`, `51,60`, `100,105`) so that every sub-query stays under 125 leads.
- **High-Density Cascades (>250 Leads):** Automatically triggers secondary cascades across Email Status (`verified`, `guessed`, `unavailable`), Seniority, and Departments when enterprise brackets exceed 250 leads.
- **2-Tier Floating HUD Layout:**
  - **Global Bar:** Top row strictly isolates total harvested items (`Total Leads: 1,701`) in monospace cyan font.
  - **Activity Subpanel:** Bottom row displays active bracket progress (`Bracket [2001,5000] (Slice 8/14) - Bottom-up 150 of 196 in cabinet`).
  - **Live Cooldown Countdown:** Real-time second-by-second countdown (`Anti-ban safety pause: 38s remaining...`).
  - **Race-Condition Locked:** Prevents background storage synchronization from overwriting live progress counters.
- **Single-Line CSV Sanitization & Security Protection:**
  - Embedded newlines (`\n`, `\r\n`) in company descriptions are sanitized to single spaces, guaranteeing **strictly 1 physical CSV line per record**.
  - Formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with single quotes (`'`).
- **100% Anti-Ban Protection (Zero Account Risk):**
  - **Human Pacing Jitter:** Randomized delay between 2,000ms and 3,800ms between requests.
  - **Batch Rest Pauses:** Automatic 40-second cool-down after every 250 leads (~10 requests) to evade Cloudflare Turnstile token refresh flags.
  - **Instant Circuit Breaker:** Stops execution immediately if Apollo returns HTTP 429 or 403, preserving all scraped data.
  - **Daily Volume Safety Governor:** Visual indicator warns when approaching 2,500 leads/day/account.
- **Zero Export Credit Consumption:** Pure client-side streaming Blob download—Apollo server export credits are never touched.
- **TDD Test Suite:** Verified with 79 native Node.js tests across 12 test suites (`npm test`).

---

## 🚀 How to Install & Use the Chrome Extension

### Step 1: Load into Chrome
1. Open Google Chrome (or Brave / Edge / Arc).
2. Navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** (or click the reload icon if already loaded).
5. Select the [`extension/`](file:///d:/Codinf%20projets/apollo%20scraper/extension) folder from this repository:
   ```text
   d:\Codinf projets\apollo scraper\extension
   ```
6. The **Apollo Universal Lead Harvester** icon will appear in your extensions toolbar. Pin it!

### Step 2: Extract Leads from Apollo.io
1. Go to [`https://app.apollo.io/#/people`](https://app.apollo.io/#/people) and apply your search filters (Titles, Locations, Headcount, etc.).
2. Click the extension icon in your toolbar:
   - Select your **Target Leads** (`250`, `500`, `1,000`, `2,500`, `10,000`).
   - Select your **Engine Mode** (`Headcount Partitioning` or `Page-1 Dynamic ID Exclusion`).
   - Click **"Start Deep Harvest"**.
3. Watch the real-time progress bar and on-page floating HUD stream leads into memory.
4. Click **"Export CSV"** to instantly download your clean leads file with 0 export credits used!

---

## 🧪 Running the Automated TDD Test Suite

```bash
node --test tests/*.test.mjs
```
