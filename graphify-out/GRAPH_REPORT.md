# Graph Report - apollo scraper  (2026-10-19)

## Corpus Check
- 129 files · ~339,666 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 6, .css 4, .zip 1)

## Summary
- 1210 nodes · 1844 edges · 92 communities (64 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- runner.go
- Time
- ApolloScraper.py
- sanitize_new_csv.mjs
- compare_csvs.mjs
- Apollo-Scraper-Extension/content.js
- PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)
- PersistentOrgCache
- test_company_scraper_live.mjs
- extension/background.js
- 2. Core Endpoints for Lead Scraping & Prospecting
- Manager
- extension_backup_pre_1249_restore/review.js
- 2. Complete Internal APIs Catalog
- Apollo Scraper Engine: Complete Methods & Workflows Guide
- extension/manifest.json
- apollo-contact-scraper(H@ck)/package.json
- CompanyEnrichmentEngine
- 2. The 6 Proven Bypass Methodologies
- injected.js
- scraper.js
- Apollo-Scraper-Extension/background.js
- Apollo Data Scraper
- ref_path
- Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)
- apollo-scraper/README.md
- extension_backup_pre_1249_restore/background.js
- comprehensive_data.test.mjs
- apollo-email-scraper/manifest.json
- review_station_server.mjs
- 🛠️ Tool Index & Run Guide
- Apollo.io Scraper Chrome Extension Architecture (Manifest V3)
- 📋 Apollo Free Data Scraper
- Apollo-Scraper-Extension/manifest.json
- 2. In-Depth Architectural Dissection of Market Tools
- parse_csv_proper.mjs
- extension_backup_pre_1249_restore/slicer_core.js
- 3. Feeding Enriched Leads into `lead-intelligence`
- 1. Key Technical Discoveries & Hard Limits
- ref_fs
- CabinetExclusionTracker
- DeduplicationStore
- SafetyCircuitBreaker
- Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation
- analyze_csv_breakdown.mjs
- Browser Tool Selection & Active Session Rule
- Live Empirical Test Report: Adaptive Micro-Slicing Harvester
- test_brackets.mjs
- Mandatory ECC Workflow & Skill Discovery Protocol
- AdaptivePacer
- SmartBatcher
- extension_backup_pre_1249_restore/manifest.json
- package.json
- Scripts Lifecycle & Tooling Discipline Rule
- TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)
- apollo-email-scraper/popup.js
- Apollo Web Scraper
- extension_backup_pre_1249_restore/injected.js
- extract_frames.mjs
- extract_hud_crop.mjs
- extension/content.js
- extension/popup.js
- ApolloLeadScraper
- Scrapollo
- apollo-search-scraper/README.md
- apolloscraperHck/README.md
- openvpn-go/README.md
- github.com/devsheke/scrapollo
- DeduplicationStore
- PersistentOrgCache
- Workflows
- PersistentOrgCache
- CabinetExclusionTracker
- CompanyEnrichmentEngine
- CompanyEnrichmentEngine
- flattenRecord
- AdaptivePacer
- SafetyCircuitBreaker
- verify_csv_reexport.mjs
- Apollo Scraper Architecture & Data Integrity Guardrails
- SmartBatcher
- export_scraped_csv.mjs
- extension_backup_pre_1249_restore/content.js
- extension_backup_pre_1249_restore/popup.js
- company_harvester.test.mjs
- review_station.test.mjs
- manifest_and_storage.test.mjs
- extract_steps.mjs

## God Nodes (most connected - your core abstractions)
1. `Time` - 19 edges
2. `Account` - 18 edges
3. `scrapePeopleRow()` - 16 edges
4. `Manager` - 15 edges
5. `Runner` - 15 edges
6. `RunnerOpt` - 15 edges
7. `setupEventListeners()` - 13 edges
8. `q()` - 13 edges
9. `Apollo Data Scraper` - 13 edges
10. `DeduplicationStore` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Verified URL Hash String for People Search` --references--> `Manager`  [INFERRED]
  docs/APOLLO_FILTERS_DEEP_DIVE.md → market_scrapers_and_extensions/scrapollo/internal/openvpn/openvpn.go
- `ScrapeLeads()` --references--> `Lead`  [EXTRACTED]
  market_scrapers_and_extensions/scrapollo/internal/actions/scrape.go → market_scrapers_and_extensions/scrapollo/internal/models/models.go
- `Runner` --references--> `FileFormat`  [EXTRACTED]
  market_scrapers_and_extensions/scrapollo/internal/runner/runner.go → market_scrapers_and_extensions/scrapollo/internal/io/io.go
- `New()` --calls--> `ReadRecords()`  [EXTRACTED]
  market_scrapers_and_extensions/scrapollo/internal/runner/runner.go → market_scrapers_and_extensions/scrapollo/internal/io/io.go
- `VpnManager()` --references--> `Manager`  [EXTRACTED]
  market_scrapers_and_extensions/scrapollo/internal/runner/runner.go → market_scrapers_and_extensions/scrapollo/internal/openvpn/openvpn.go

## Import Cycles
- None detected.

## Communities (92 total, 28 thin omitted)

### Community 0 - "runner.go"
Cohesion: 0.06
Nodes (30): CsvLeadWriter, JsonLeadWriter, LeadWriter, FileFormat, readJson(), ReadRecords(), saveJson(), SaveRecords() (+22 more)

### Community 1 - "Time"
Cohesion: 0.05
Nodes (27): PageData, GetPageData(), GoToPage(), GrabErrorSnapshot(), LocateList(), Annoyance, RemoveAnnoyance(), simpleClick() (+19 more)

### Community 2 - "ApolloScraper.py"
Cohesion: 0.08
Nodes (20): captcha_solving(), login(), scrape_apollo(), find_and_copy_email(), login_to_site(), main(), next_page(), split_name() (+12 more)

### Community 3 - "sanitize_new_csv.mjs"
Cohesion: 0.20
Nodes (8): newCsvPath, objectRecords, rawText, records, rows, sanitizedCSV, sanitizedLines, sanitizedOutPath

### Community 4 - "compare_csvs.mjs"
Cohesion: 0.12
Nodes (15): addedInNew, duplicateNewIds, missingInNew, newIdIdx, newIds, newPath, newRows, newStat (+7 more)

### Community 5 - "Apollo-Scraper-Extension/content.js"
Cohesion: 0.16
Nodes (34): detectIndustryFromRow(), emptyScore(), extractCompanyNameFromRow(), extractLocationFromCellText(), findCompanyOrgLinkInRow(), getAttr(), getCellByColIndex(), getCellTextByCol() (+26 more)

### Community 6 - "PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)"
Cohesion: 0.06
Nodes (33): 10. Prospected / CRM Status, 1. Account Location, 1. Job Titles, 1. Physical UI Flow & URL Hash State Serialization, 2. Exhaustive Filter-by-Filter Engineering Breakdown, 2. Number of Employees (Headcount), 2. Seniority / Management Level, 3. Functions & Departments (+25 more)

### Community 7 - "PersistentOrgCache"
Cohesion: 0.08
Nodes (23): 1. Executive Summary & Objective, 2. ECC Skills Relevance & Mapping Matrix, 3. Detailed Architecture Specifications, 4. Step-by-Step TDD Implementation Plan, Added Data Fields (Non-Destructive), Architecture Optimization Roadmap & Implementation Plan, Architecture Specification, Architecture Specification (+15 more)

### Community 8 - "test_company_scraper_live.mjs"
Cohesion: 0.06
Nodes (39): connectCDP(), httpGet(), main(), httpGet(), main(), connectCDP(), httpGet(), main() (+31 more)

### Community 9 - "extension/background.js"
Cohesion: 0.17
Nodes (17): buildChunkedUnionCSV(), computeLeadICPScore(), enqueueCompanyEnrichment(), enrichmentQueue, exportToCSV(), extractPastExperience(), flattenRecord(), inferSeniority() (+9 more)

### Community 10 - "2. Core Endpoints for Lead Scraping & Prospecting"
Cohesion: 0.09
Nodes (21): 1. API Overview & Authentication, 2. Core Endpoints for Lead Scraping & Prospecting, 3. Rate Limits & Quotas, A. Net-New People Search (Discovery), Apollo.io Complete API Reference Documentation, B. People Match & Enrichment (Single), C. People Bulk Match (Multi-Prospect Enrichment), D. Company Search & Organization Enrichment (+13 more)

### Community 11 - "Manager"
Cohesion: 0.20
Nodes (8): Manager, Restart(), Start(), Stop(), testCheckOpenVPNInstalled(), testEnvLookup(), TestOpenVPN(), TestOpenVPNRestart()

### Community 12 - "extension_backup_pre_1249_restore/review.js"
Cohesion: 0.17
Nodes (29): applyState(), calculateAuditMetrics(), calculateIcpScore(), closeLeadDrawer(), downloadFileBlob(), escapeHtml(), generateMockDataset(), initApp() (+21 more)

### Community 13 - "2. Complete Internal APIs Catalog"
Cohesion: 0.11
Nodes (18): 1. Authentication & Security Pipeline, 1. People Search (`POST /api/v1/mixed_people/search`), 2. Company Search (`POST /api/v1/mixed_companies/search`), 2. Complete Internal APIs Catalog, 3. Person Reveal & Match (`POST /api/v1/people/match`), 3. The Scraping Engine Strategy, 4. Bulk Save to CRM / List (`POST /api/v1/contacts/bulk_create`), 5. Saved Lists & Labels (`GET /api/v1/labels`) (+10 more)

### Community 14 - "Apollo Scraper Engine: Complete Methods & Workflows Guide"
Cohesion: 0.11
Nodes (18): 🛡️ Anti-Ban Defense Architecture, Apollo Scraper Engine: Complete Methods & Workflows Guide, Concept & Philosophy, Concept & Philosophy, Concept & Philosophy, Concept & Philosophy, 📊 Executive Comparison Matrix, 🚀 Method 1: Continuous Headcount Partitioning (Recommended) (+10 more)

### Community 15 - "extension/manifest.json"
Cohesion: 0.11
Nodes (17): action, default_popup, default_title, background, service_worker, content_scripts, description, host_permissions (+9 more)

### Community 16 - "apollo-contact-scraper(H@ck)/package.json"
Cohesion: 0.09
Nodes (21): fs, puppeteer, run(), { Actor, log, ProxyConfiguration }, fs, puppeteer, RecaptchaPlugin, dependencies (+13 more)

### Community 17 - "CompanyEnrichmentEngine"
Cohesion: 0.20
Nodes (9): 1. Ground Truth & Requirements, 2. Patterns to Mirror, 3. Files to Create / Modify, 4. Tasks & Execution Steps, Phase 1: TDD - Unit Tests (RED), Phase 2: Implementation (GREEN), Phase 3: Verification & Integration (IMPROVE), Phase 4: Cleanliness & Completion (+1 more)

### Community 18 - "2. The 6 Proven Bypass Methodologies"
Cohesion: 0.11
Nodes (17): 1. Anatomy of the 5-Page Wall, 2. The 6 Proven Bypass Methodologies, 3. Recommended Production Execution Matrix, Additional Sort Key Rotations:, Empirical Verification (Live Apollo API Test Results):, Granular Slicing Dimensions in Apollo:, Master Strategy: Bypassing Apollo's 5-Page (125-Lead) Freemium Limit, Method 1: Multi-Dimensional Matrix Slicing (The Gold Standard) (+9 more)

### Community 19 - "injected.js"
Cohesion: 0.21
Nodes (10): AdaptivePacer, decomposeHighDensityBracket(), expandOpenHeadcountRange(), getApolloHeaders(), getCookie(), isHighDensityBracket(), parseUrlHash(), processResponse() (+2 more)

### Community 20 - "scraper.js"
Cohesion: 0.14
Nodes (11): applyMode(), bg(), columns, COMPANY_COLUMNS, els, ensureContentInjected(), getColumns(), log() (+3 more)

### Community 21 - "Apollo-Scraper-Extension/background.js"
Cohesion: 0.19
Nodes (12): activeScrapes, broadcast(), csvEscape(), defaultSession(), ensureSession(), loadSession(), now(), saveSession() (+4 more)

### Community 22 - "Apollo Data Scraper"
Cohesion: 0.12
Nodes (16): 🙏 Acknowledgments, Apollo Data Scraper, ⚙️ Configuration, 🤝 Contributing, Default Settings, ⚠️ Disclaimer, ✨ Features, 📦 Files Structure (+8 more)

### Community 23 - "ref_path"
Cohesion: 0.15
Nodes (10): ffmpegPath, outDir, times, videoFile, ffmpegPath, outDir, times, videoFile (+2 more)

### Community 24 - "Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)"
Cohesion: 0.15
Nodes (12): 1. Requirements & Problem Restatement, 2. Patterns to Mirror, 3. Files to Create / Modify, 4. Implementation Tasks & Phases, 5. Anti-Ban & Safety Defense Matrix, 6. Acceptance Criteria, Phase 1: Test-Driven Development (TDD) Foundation, Phase 2: Core Algorithm Library (`extension/slicer_core.js`) (+4 more)

### Community 25 - "apollo-scraper/README.md"
Cohesion: 0.15
Nodes (12): Apollo.io Scraped Data Fields, Apollo Scraper, Best Practices, Flexible Data Export Options, Help & Support, How It Works, How to Authenticate, Integrate for Sales Outreach (+4 more)

### Community 26 - "extension_backup_pre_1249_restore/background.js"
Cohesion: 0.15
Nodes (20): buildChunkedUnionCSV(), buildUnionCSV(), computeLeadICPScore(), enqueueCompanyEnrichment(), enrichmentQueue, exportToCSV(), extractPastExperience(), flattenRecord() (+12 more)

### Community 27 - "comprehensive_data.test.mjs"
Cohesion: 0.20
Nodes (16): computeLeadICPScore(), extractPastExperience(), flattenRecord(), generateBidirectionalSortPlans(), generateUniversalHeadcountSlices(), inferSeniority(), mergeEnrichedCompanyToPerson(), normalizeCompany (+8 more)

### Community 28 - "apollo-email-scraper/manifest.json"
Cohesion: 0.17
Nodes (11): action, default_popup, description, icons, 128, 16, 48, manifest_version (+3 more)

### Community 29 - "review_station_server.mjs"
Cohesion: 0.18
Nodes (10): args, DATA_DIR, __dirname, EXTENSION_DIR, __filename, getSampleDataset(), MIME_TYPES, portIndex (+2 more)

### Community 30 - "🛠️ Tool Index & Run Guide"
Cohesion: 0.17
Nodes (11): 1. [`analyze_csv.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/analyze_csv.mjs), 2. [`inspect_live_apollo_data.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_live_apollo_data.mjs), 3. [`test_company_scraper_live.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_company_scraper_live.mjs), 4. [`test_zero_loss_export.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_zero_loss_export.mjs), 5. [`benchmark_org_enrich.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/benchmark_org_enrich.mjs), 6. [`reload_extension.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/reload_extension.mjs), 7. [`inspect_extension_state.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_extension_state.mjs) & [`inspect_runtime.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_runtime.py), 8. [`inspect_stored_leads.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_stored_leads.py) (+3 more)

### Community 31 - "Apollo.io Scraper Chrome Extension Architecture (Manifest V3)"
Cohesion: 0.18
Nodes (10): 1. System Architecture Overview, 2. Core Methodologies: Network Interception vs. DOM Scraping, 3. Manifest V3 File Blueprint, 4. Injected Network Sniffer (`injected.js`), 5. Content Script Bridge & Automation (`content.js`), 6. Background Service Worker (`background.js`), 7. CSV Conversion & Local Export Engine, Apollo.io Scraper Chrome Extension Architecture (Manifest V3) (+2 more)

### Community 32 - "📋 Apollo Free Data Scraper"
Cohesion: 0.18
Nodes (9): 📋 Apollo Free Data Scraper, 🌟 Call for Contributors, 💼 Call for Sponsors, 📬 Contact, 👩‍💻 Development, ✨ Features, 🚀 Installation, 📜 License (+1 more)

### Community 33 - "Apollo-Scraper-Extension/manifest.json"
Cohesion: 0.18
Nodes (10): action, default_title, background, service_worker, description, host_permissions, manifest_version, name (+2 more)

### Community 34 - "2. In-Depth Architectural Dissection of Market Tools"
Cohesion: 0.20
Nodes (9): 1. `Apollo-Scraper-Extension` (Chrome Manifest V3), 1. Executive Summary & Comparison Matrix, 2. `apollo-email-scraper` (Chrome Extension), 2. In-Depth Architectural Dissection of Market Tools, 3. `apollo-search-scraper` (Python + Selenium), 3. Summary of Market Blindspots, 4. `apollo_scraper` (SeleniumBase UC Mode), 5. `apolloscraperHck` (Apify / Puppeteer-Extra Stealth) (+1 more)

### Community 35 - "parse_csv_proper.mjs"
Cohesion: 0.20
Nodes (8): allRows, companyColIdx, content, dupIds, ids, nameColIdx, records, titleColIdx

### Community 36 - "extension_backup_pre_1249_restore/slicer_core.js"
Cohesion: 0.12
Nodes (11): decomposeHighDensityBracket(), expandOpenHeadcountRange(), generateAdaptiveMicroBrackets(), isHighDensityBracket(), normalizeCompany, PREFERRED_COMPANY_COLUMNS, PREFERRED_PERSON_COLUMNS, resolveHarvestExecutionPlan() (+3 more)

### Community 37 - "3. Feeding Enriched Leads into `lead-intelligence`"
Cohesion: 0.22
Nodes (8): 1. The End-to-End Pipeline, 2. Ingesting Scraped Apollo Leads into `data-scraper-agent`, 3. Feeding Enriched Leads into `lead-intelligence`, Everything Claude Code (ECC) Integration Guide for Apollo Scraper, Ingestion Script: `enrich_apollo_leads.py`, Stage 1: Finding Missing Emails (Waterfall Enrichment), Stage 2: Warm Path Discovery, Stage 3: Personalized Multi-Channel Outreach

### Community 38 - "1. Key Technical Discoveries & Hard Limits"
Cohesion: 0.22
Nodes (8): 1. Key Technical Discoveries & Hard Limits, 2. Updated Extension Safeguards, Lesson 1: The Strict `per_page` Hard Limit (422 Error), Lesson 2: Cloudflare Turnstile & Velocity-Based Bot Detection, Lesson 3: Latency & Response Dynamics, Lesson 4: Record Deduplication & Pagination Drift, Lesson 5: Data Completeness on Verified Leads, Lessons Learned: Scraping Apollo.io at Scale (1,000+ Leads)

### Community 40 - "ref_fs"
Cohesion: 0.22
Nodes (3): allRows, content, viraj

### Community 41 - "CabinetExclusionTracker"
Cohesion: 0.20
Nodes (5): buildCabinetDrainPayload(), buildExclusionPayload(), CabinetExclusionTracker, generatePacingDelay(), shouldEngageCabinetDrain()

### Community 44 - "Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation"
Cohesion: 0.25
Nodes (7): Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation, ⚡ Chrome Extension V2.1.0 Features, 📚 Complete Documentation & Plan Suite, 🚀 How to Install & Use the Chrome Extension, 🧪 Running the Automated TDD Test Suite, Step 1: Load into Chrome, Step 2: Extract Leads from Apollo.io

### Community 45 - "analyze_csv_breakdown.mjs"
Cohesion: 0.25
Nodes (6): allRows, cityIdx, content, empCounts, empIdx, titleIdx

### Community 46 - "Browser Tool Selection & Active Session Rule"
Cohesion: 0.29
Nodes (6): 1. Tool Selection Priority, 2. SPA Data Extraction Pattern, 3. SPA Scraping Guardrails & Anti-Bot Evasion, 4. Bypassing Search Depth Limits via Multi-Dimensional Matrix Slicing, 5. Anti-Pattern Catalog for Modern SPA Scrapers, Browser Tool Selection & Active Session Rule

### Community 47 - "Live Empirical Test Report: Adaptive Micro-Slicing Harvester"
Cohesion: 0.29
Nodes (6): 1. Executive Summary & Test Verdict, 2. Headcount Micro-Decomposition Architecture, 3. Visual Verification Artifacts, Live Empirical Test Report: Adaptive Micro-Slicing Harvester, Milestone: 100% Extraction of Headcount 6 (`[6,6]` - 234 of 234 leads), Milestone: In-Progress Sweep of Cabinet 6 (`[6,6]`) Surpassing 428 Leads

### Community 48 - "test_brackets.mjs"
Cohesion: 0.43
Nodes (6): brackets, decomposeHighDensityBracket(), expandOpenHeadcountRange(), isHighDensityBracket(), resolveExecutionBrackets(), STANDARD_MACRO_INTERVALS

### Community 49 - "Mandatory ECC Workflow & Skill Discovery Protocol"
Cohesion: 0.33
Nodes (5): Mandatory ECC Workflow & Skill Discovery Protocol, Phase 1: ECC Capability & Skill Discovery (Pre-Flight), Phase 2: Plan & Architect, Phase 3: Test-Driven Development (TDD), Phase 4: Verification & Code Review Gate

### Community 52 - "extension_backup_pre_1249_restore/manifest.json"
Cohesion: 0.11
Nodes (18): action, default_popup, default_title, background, service_worker, content_scripts, description, host_permissions (+10 more)

### Community 53 - "package.json"
Cohesion: 0.33
Nodes (5): name, scripts, test, type, version

### Community 54 - "Scripts Lifecycle & Tooling Discipline Rule"
Cohesion: 0.40
Nodes (4): 1. Explicit Purpose Declaration, 2. Temporary / Scratch Scripts Cleanup, 3. Permanent Long-Term Tooling Registry, Scripts Lifecycle & Tooling Discipline Rule

### Community 55 - "TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)"
Cohesion: 0.40
Nodes (4): 1. User Journeys & Core Guarantees, 2. Test Specification & Verification Matrix, 3. TDD Progression Summary, TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)

### Community 57 - "Apollo Web Scraper"
Cohesion: 0.40
Nodes (4): Apollo Web Scraper, Features, How to Use, Setup & Installation

### Community 58 - "extension_backup_pre_1249_restore/injected.js"
Cohesion: 0.21
Nodes (10): AdaptivePacer, decomposeHighDensityBracket(), expandOpenHeadcountRange(), getApolloHeaders(), getCookie(), isHighDensityBracket(), parseUrlHash(), processResponse() (+2 more)

### Community 59 - "extract_frames.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, timestamps, videoFile

### Community 60 - "extract_hud_crop.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, times, videoFile

### Community 71 - "DeduplicationStore"
Cohesion: 0.18
Nodes (4): buildChunkedUnionCSV(), buildUnionCSV(), DeduplicationStore, parseApolloUrlHash()

### Community 73 - "Workflows"
Cohesion: 0.29
Nodes (6): 1. Launching Local Review Station, 2. Programmatic Lead Inspection & ICP Scoring, 3. Dry-Run Slicer Simulation, 4. Running Validation Tests, Apollo Review, Telemetry & Debug Station Skill, Workflows

### Community 78 - "flattenRecord"
Cohesion: 0.33
Nodes (7): computeLeadICPScore(), extractPastExperience(), flattenRecord(), inferSeniority(), mergeEnrichedCompanyToPerson(), normalizeCompanyComprehensive(), normalizePersonComprehensive()

### Community 81 - "verify_csv_reexport.mjs"
Cohesion: 0.18
Nodes (9): allRows, dataRows, newLines, objectRecords, originalCsvPath, rawText, reExportedCSV, reParsedData (+1 more)

### Community 82 - "Apollo Scraper Architecture & Data Integrity Guardrails"
Cohesion: 0.40
Nodes (4): 1. Apollo Entity Architecture, 2. Chrome Extension Service Worker (MV3) Restrictions, 3. Zero-Data-Loss Normalization & Export, Apollo Scraper Architecture & Data Integrity Guardrails

### Community 84 - "export_scraped_csv.mjs"
Cohesion: 0.22
Nodes (6): buildChunkedUnionCSV(), buildUnionCSV(), PREFERRED_PERSON_COLUMNS, csvContent, leads, lines

### Community 88 - "company_harvester.test.mjs"
Cohesion: 0.39
Nodes (6): decomposeHighDensityBracket(), detectApolloEntityType(), expandOpenHeadcountRange(), generateAdaptiveMicroBrackets(), isHighDensityBracket(), resolveHarvestExecutionPlan()

### Community 89 - "review_station.test.mjs"
Cohesion: 0.29
Nodes (4): __dirname, EXTENSION_DIR, __filename, ROOT_DIR

### Community 91 - "extract_steps.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, times, videoFile

## Knowledge Gaps
- **1 isolated node(s):** `github.com/devsheke/scrapollo`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 561 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Manager` connect `Manager` to `runner.go`, `Time`, `PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `github.com/devsheke/scrapollo` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `runner.go` be split into smaller, more focused modules?**
  _Cohesion score 0.05909351692484223 - nodes in this community are weakly interconnected._
- **Why does `Verified URL Hash String for People Search` connect `PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)` to `Manager`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `Time` be split into smaller, more focused modules?**
  _Cohesion score 0.054773082942097026 - nodes in this community are weakly interconnected._
- **Should `ApolloScraper.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `compare_csvs.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._