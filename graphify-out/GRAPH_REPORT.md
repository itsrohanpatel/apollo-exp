# Graph Report - apollo scraper  (2026-10-25)

## Corpus Check
- 96 files · ~128,073 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 808 nodes · 1099 edges · 67 communities (61 shown, 6 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d323c58`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_company_scraper_live.mjs
- ref_fs
- harvest_1000_leads.py
- test_injected_resolution.mjs
- compare_csvs.mjs
- SmartBatcher
- PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)
- PersistentOrgCache
- ref_http
- background.js
- 2. Core Endpoints for Lead Scraping & Prospecting
- DynamicBisectionTree
- HarvestManifest
- 2. Complete Internal APIs Catalog
- Apollo Scraper Engine: Complete Methods & Workflows Guide
- extension/manifest.json
- SafetyCircuitBreaker
- CompanyEnrichmentEngine
- 2. The 6 Proven Bypass Methodologies
- test_company_scraper_live.mjs
- Apollo.io Complete Network & API Surface Audit
- hud_mission_control.test.mjs
- ref_path
- Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)
- Comprehensive Multi-Step Implementation Plan
- ApolloHUD
- slicer_core.js
- ref_ws
- review_station_server.mjs
- 🛠️ Tool Index & Run Guide
- Apollo.io Scraper Chrome Extension Architecture (Manifest V3)
- 2. Multi-Step Implementation Plan
- Apollo Universal Lead Harvester (Chrome Extension)
- 2. In-Depth Architectural Dissection of Market Tools
- parse_csv_proper.mjs
- extract_hud_crop.mjs
- 3. Feeding Enriched Leads into `lead-intelligence`
- 1. Key Technical Discoveries & Hard Limits
- test_zero_loss_export.mjs
- ref_fs
- benchmark_org_enrich.mjs
- check_storage_exact.mjs
- clear_and_reload.mjs
- Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation
- analyze_csv_breakdown.mjs
- Browser Tool Selection & Active Session Rule
- Live Empirical Test Report: Adaptive Micro-Slicing Harvester
- test_brackets.mjs
- Mandatory ECC Workflow & Skill Discovery Protocol
- inspect_extension_state.mjs
- inspect_scraped_dataset.mjs
- reload_extension.mjs
- package.json
- Scripts Lifecycle & Tooling Discipline Rule
- TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)
- run_active_scrape.mjs
- test_live_scrape_verification.mjs
- trigger_and_monitor_scrape.mjs
- verify_each_cabinet.mjs
- inspect_review_dom.mjs
- content.js
- sanitizeCSVValue
- Workflows
- Apollo Scraper Architecture & Data Integrity Guardrails
- extract_steps.mjs

## God Nodes (most connected - your core abstractions)
1. `buildUnionCSV()` - 16 edges
2. `sanitizeCSVValue()` - 14 edges
3. `CompanyEnrichmentEngine` - 14 edges
4. `PersistentOrgCache` - 14 edges
5. `DeduplicationStore` - 12 edges
6. `AdaptivePacer` - 11 edges
7. `PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)` - 11 edges
8. `HarvestManifest` - 10 edges
9. `🛠️ Tool Index & Run Guide` - 10 edges
10. `ApolloHUD` - 9 edges

## Surprising Connections (you probably didn't know these)
- `2.1 Backend / Systems Architect (Codex Review)` --references--> `AdaptivePacer`  [INFERRED]
  .claude/plans/adaptive-density-probe-and-minimal-cabinets.plan.md → extension/slicer_core.js
- `Phase 3: Mission Control HUD Sync (`extension/content.js`)` --references--> `formatMissionControlState()`  [INFERRED]
  .claude/plans/adaptive-density-probe-and-minimal-cabinets.plan.md → extension/slicer_core.js
- `1.1 The Flaw: Static Multiplication vs. Reality` --references--> `generateMultiDimensionalPlan()`  [INFERRED]
  .claude/plans/adaptive-density-probe-and-minimal-cabinets.plan.md → extension/slicer_core.js
- `1. Overview & Problem Statement` --references--> `resolveAdaptiveExecutionTree()`  [INFERRED]
  .agents/plans/network-audit-stealth-enhancements.plan.md → extension/slicer_core.js
- `Phase 1: Slicer Core Modernization (`extension/slicer_core.js`)` --references--> `SmartBatcher`  [INFERRED]
  .claude/plans/adaptive-density-probe-and-minimal-cabinets.plan.md → extension/slicer_core.js

## Import Cycles
- None detected.

## Communities (67 total, 6 thin omitted)

### Community 0 - "test_company_scraper_live.mjs"
Cohesion: 0.53
Nodes (4): evalInPage(), getApolloTab(), main(), sendCDP()

### Community 1 - "ref_fs"
Cohesion: 0.22
Nodes (4): ffmpegPath, outDir, times, videoFile

### Community 2 - "harvest_1000_leads.py"
Cohesion: 0.27
Nodes (5): get_apollo_ws_url(), run_harvester(), eval_js(), main(), inspect_leads()

### Community 3 - "test_injected_resolution.mjs"
Cohesion: 0.40
Nodes (4): content, fnCode, results, sandbox

### Community 4 - "compare_csvs.mjs"
Cohesion: 0.05
Nodes (33): addedInNew, duplicateNewIds, missingInNew, newIdIdx, newIds, newPath, newRows, newStat (+25 more)

### Community 5 - "SmartBatcher"
Cohesion: 0.09
Nodes (17): 1.1 The Flaw: Static Multiplication vs. Reality, 1.2 The Solution: Dynamic On-Demand Density Sizing, 1. Executive Summary & Problem Framing, 2.1 Backend / Systems Architect (Codex Review), 2.2 Frontend & HUD / UX Architect (Antigravity Review), 2. Multi-Model Analysis & Architectural Review, 3. Mathematical Decision Matrix, 4. Phase-by-Phase Implementation Plan (+9 more)

### Community 6 - "PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)"
Cohesion: 0.06
Nodes (33): 10. Prospected / CRM Status, 1. Account Location, 1. Job Titles, 1. Physical UI Flow & URL Hash State Serialization, 2. Exhaustive Filter-by-Filter Engineering Breakdown, 2. Number of Employees (Headcount), 2. Seniority / Management Level, 3. Functions & Departments (+25 more)

### Community 7 - "PersistentOrgCache"
Cohesion: 0.06
Nodes (27): 1. Executive Summary & Objective, 2. ECC Skills Relevance & Mapping Matrix, 3. Detailed Architecture Specifications, 4. Step-by-Step TDD Implementation Plan, Added Data Fields (Non-Destructive), Architecture Optimization Roadmap & Implementation Plan, Architecture Specification, Architecture Specification (+19 more)

### Community 8 - "ref_http"
Cohesion: 0.25
Nodes (3): main(), httpGet(), main()

### Community 9 - "background.js"
Cohesion: 0.80
Nodes (4): getLeadCount(), openDB(), saveLeads(), updateBadge()

### Community 10 - "2. Core Endpoints for Lead Scraping & Prospecting"
Cohesion: 0.09
Nodes (21): 1. API Overview & Authentication, 2. Core Endpoints for Lead Scraping & Prospecting, 3. Rate Limits & Quotas, A. Net-New People Search (Discovery), Apollo.io Complete API Reference Documentation, B. People Match & Enrichment (Single), C. People Bulk Match (Multi-Prospect Enrichment), D. Company Search & Organization Enrichment (+13 more)

### Community 11 - "DynamicBisectionTree"
Cohesion: 0.10
Nodes (15): 1. Zero-Redundancy Fresh-Lead Architecture (Eliminating Re-Scraping & Overlap), 2. Issues & Solutions Matrix (From `/code-review` & `/ponytail-audit`), 3. Real-World Live API Verification Protocol (No Mock-Only Validation), 4. Implementation Phases (Step-by-Step TDD & Live Verification), 5. Verification Commands, Phase 1: TDD Test Suites (Failing First - RED), Phase 2: Core Algorithmic Library (`extension/slicer_core.js`), Phase 3: In-Tab Harvest Engine Integration (`extension/injected.js` & `content.js`) (+7 more)

### Community 13 - "2. Complete Internal APIs Catalog"
Cohesion: 0.11
Nodes (18): 1. Authentication & Security Pipeline, 1. People Search (`POST /api/v1/mixed_people/search`), 2. Company Search (`POST /api/v1/mixed_companies/search`), 2. Complete Internal APIs Catalog, 3. Person Reveal & Match (`POST /api/v1/people/match`), 3. The Scraping Engine Strategy, 4. Bulk Save to CRM / List (`POST /api/v1/contacts/bulk_create`), 5. Saved Lists & Labels (`GET /api/v1/labels`) (+10 more)

### Community 14 - "Apollo Scraper Engine: Complete Methods & Workflows Guide"
Cohesion: 0.11
Nodes (18): 🛡️ Anti-Ban Defense Architecture, Apollo Scraper Engine: Complete Methods & Workflows Guide, Concept & Philosophy, Concept & Philosophy, Concept & Philosophy, Concept & Philosophy, 📊 Executive Comparison Matrix, 🚀 Method 1: Continuous Headcount Partitioning (Recommended) (+10 more)

### Community 15 - "extension/manifest.json"
Cohesion: 0.11
Nodes (17): action, default_popup, default_title, background, service_worker, content_scripts, description, host_permissions (+9 more)

### Community 17 - "CompanyEnrichmentEngine"
Cohesion: 0.14
Nodes (10): 1. Ground Truth & Requirements, 2. Patterns to Mirror, 3. Files to Create / Modify, 4. Tasks & Execution Steps, Phase 1: TDD - Unit Tests (RED), Phase 2: Implementation (GREEN), Phase 3: Verification & Integration (IMPROVE), Phase 4: Cleanliness & Completion (+2 more)

### Community 18 - "2. The 6 Proven Bypass Methodologies"
Cohesion: 0.11
Nodes (17): 1. Anatomy of the 5-Page Wall, 2. The 6 Proven Bypass Methodologies, 3. Recommended Production Execution Matrix, Additional Sort Key Rotations:, Empirical Verification (Live Apollo API Test Results):, Granular Slicing Dimensions in Apollo:, Master Strategy: Bypassing Apollo's 5-Page (125-Lead) Freemium Limit, Method 1: Multi-Dimensional Matrix Slicing (The Gold Standard) (+9 more)

### Community 20 - "test_company_scraper_live.mjs"
Cohesion: 0.70
Nodes (4): connectCDP(), httpGet(), main(), sleep()

### Community 21 - "Apollo.io Complete Network & API Surface Audit"
Cohesion: 0.08
Nodes (25): 1. Dynamic CSRF Extraction (`SUCCESS`), 1. Executive Summary & New Discoveries, 1. `fvDeviceId` Device Fingerprint Test, 2. `apollo_tab_count` Concurrency Test, 2. Complete Inventory of Observed `/api/` Endpoints, 2. Zero-Credit Snippet Enrichment (`SUCCESS`), 3. Account Bootstrapped Data (`SUCCESS`), 3. Deep Dive: Core Search & Data Payloads (+17 more)

### Community 22 - "hud_mission_control.test.mjs"
Cohesion: 0.25
Nodes (12): 1. Architectural Components & Features, 2. Test-Driven Development (TDD) Plan, 3. Files to Create & Modify, 4. Phase-by-Phase Execution, A. Real-Time Telemetry & Performance, B. Live Data Quality & ICP Intelligence, C. Mission Control UX & Controls, Plan: Mission Control HUD & Live Intelligence Dashboard (+4 more)

### Community 23 - "ref_path"
Cohesion: 0.15
Nodes (10): ffmpegPath, outDir, times, videoFile, ffmpegPath, outDir, timestamps, videoFile (+2 more)

### Community 24 - "Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)"
Cohesion: 0.15
Nodes (12): 1. Requirements & Problem Restatement, 2. Patterns to Mirror, 3. Files to Create / Modify, 4. Implementation Tasks & Phases, 5. Anti-Ban & Safety Defense Matrix, 6. Acceptance Criteria, Phase 1: Test-Driven Development (TDD) Foundation, Phase 2: Core Algorithm Library (`extension/slicer_core.js`) (+4 more)

### Community 25 - "Comprehensive Multi-Step Implementation Plan"
Cohesion: 0.17
Nodes (11): Comprehensive Multi-Step Implementation Plan, Implementation Plan: Apollo Scraper Resumable Harvest, Robust CSV Export & Popup Performance Optimization (v3), Key Files Touched, Risks and Mitigation, Root Cause Analysis: The 3 Main Issues, Step 1: Fix Extension Popup Lag & Eliminate Storage Bloat, Step 2: In-Flight Checkpoint & Instant Resumption (Skip Cabinets 1–46), Step 3: Reliable `.csv` File Extension Export (+3 more)

### Community 27 - "slicer_core.js"
Cohesion: 0.05
Nodes (50): Step 5: Test-Driven Verification (TDD), RFC-4180, ALL_APOLLO_SENIORITIES, buildCabinetDrainPayload(), buildExclusionPayload(), buildHashForSlice(), CabinetExclusionTracker, calculateProbePacingDelay() (+42 more)

### Community 28 - "ref_ws"
Cohesion: 0.28
Nodes (4): httpGet(), main(), httpGet(), main()

### Community 29 - "review_station_server.mjs"
Cohesion: 0.18
Nodes (10): args, DATA_DIR, __dirname, EXTENSION_DIR, __filename, getSampleDataset(), MIME_TYPES, portIndex (+2 more)

### Community 30 - "🛠️ Tool Index & Run Guide"
Cohesion: 0.17
Nodes (11): 1. [`analyze_csv.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/analyze_csv.mjs), 2. [`inspect_live_apollo_data.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_live_apollo_data.mjs), 3. [`test_company_scraper_live.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_company_scraper_live.mjs), 4. [`test_zero_loss_export.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_zero_loss_export.mjs), 5. [`benchmark_org_enrich.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/benchmark_org_enrich.mjs), 6. [`reload_extension.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/reload_extension.mjs), 7. [`inspect_extension_state.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_extension_state.mjs) & [`inspect_runtime.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_runtime.py), 8. [`inspect_stored_leads.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_stored_leads.py) (+3 more)

### Community 31 - "Apollo.io Scraper Chrome Extension Architecture (Manifest V3)"
Cohesion: 0.18
Nodes (10): 1. System Architecture Overview, 2. Core Methodologies: Network Interception vs. DOM Scraping, 3. Manifest V3 File Blueprint, 4. Injected Network Sniffer (`injected.js`), 5. Content Script Bridge & Automation (`content.js`), 6. Background Service Worker (`background.js`), 7. CSV Conversion & Local Export Engine, Apollo.io Scraper Chrome Extension Architecture (Manifest V3) (+2 more)

### Community 32 - "2. Multi-Step Implementation Plan"
Cohesion: 0.25
Nodes (7): 1. Overview & Problem Statement, 2. Multi-Step Implementation Plan, Multi-Step Plan: Network-Audit Stealth & Pacing Enhancements, Step 1: Pre-Flight & Probe Pacing Engine in `extension/slicer_core.js`, Step 2: Session Clearance & CSRF Gatekeeper, Step 3: Companion Snippet Enrichment Merger, Step 4: Fullview Telemetry Isolation & In-Page Single-Tab Guard

### Community 33 - "Apollo Universal Lead Harvester (Chrome Extension)"
Cohesion: 0.33
Nodes (5): Apollo Universal Lead Harvester (Chrome Extension), 🧠 Core Features, 📁 Extension Folder Structure, 🚀 How to Install (Takes 30 Seconds), 🎯 How to Use

### Community 34 - "2. In-Depth Architectural Dissection of Market Tools"
Cohesion: 0.20
Nodes (9): 1. `Apollo-Scraper-Extension` (Chrome Manifest V3), 1. Executive Summary & Comparison Matrix, 2. `apollo-email-scraper` (Chrome Extension), 2. In-Depth Architectural Dissection of Market Tools, 3. `apollo-search-scraper` (Python + Selenium), 3. Summary of Market Blindspots, 4. `apollo_scraper` (SeleniumBase UC Mode), 5. `apolloscraperHck` (Apify / Puppeteer-Extra Stealth) (+1 more)

### Community 35 - "parse_csv_proper.mjs"
Cohesion: 0.18
Nodes (10): allRows, candidatePaths, companyColIdx, content, csvPath, dupIds, ids, nameColIdx (+2 more)

### Community 36 - "extract_hud_crop.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, times, videoFile

### Community 37 - "3. Feeding Enriched Leads into `lead-intelligence`"
Cohesion: 0.22
Nodes (8): 1. The End-to-End Pipeline, 2. Ingesting Scraped Apollo Leads into `data-scraper-agent`, 3. Feeding Enriched Leads into `lead-intelligence`, Everything Claude Code (ECC) Integration Guide for Apollo Scraper, Ingestion Script: `enrich_apollo_leads.py`, Stage 1: Finding Missing Emails (Waterfall Enrichment), Stage 2: Warm Path Discovery, Stage 3: Personalized Multi-Channel Outreach

### Community 38 - "1. Key Technical Discoveries & Hard Limits"
Cohesion: 0.22
Nodes (8): 1. Key Technical Discoveries & Hard Limits, 2. Updated Extension Safeguards, Lesson 1: The Strict `per_page` Hard Limit (422 Error), Lesson 2: Cloudflare Turnstile & Velocity-Based Bot Detection, Lesson 3: Latency & Response Dynamics, Lesson 4: Record Deduplication & Pagination Drift, Lesson 5: Data Completeness on Verified Leads, Lessons Learned: Scraping Apollo.io at Scale (1,000+ Leads)

### Community 39 - "test_zero_loss_export.mjs"
Cohesion: 0.70
Nodes (4): connectCDP(), httpGet(), main(), sleep()

### Community 40 - "ref_fs"
Cohesion: 0.40
Nodes (3): allRows, content, viraj

### Community 41 - "benchmark_org_enrich.mjs"
Cohesion: 0.83
Nodes (3): connectCDP(), httpGet(), main()

### Community 42 - "check_storage_exact.mjs"
Cohesion: 0.83
Nodes (3): evaluate(), getApolloTab(), main()

### Community 43 - "clear_and_reload.mjs"
Cohesion: 0.83
Nodes (3): connectCDP(), httpGet(), main()

### Community 44 - "Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation"
Cohesion: 0.25
Nodes (7): Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation, ⚡ Chrome Extension V2.2.0 Features (Production-Ready), 📚 Complete Documentation & Plan Suite, 🚀 How to Install & Use the Chrome Extension, 🧪 Running the Automated TDD Test Suite, Step 1: Load into Chrome, Step 2: Extract Leads from Apollo.io

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

### Community 50 - "inspect_extension_state.mjs"
Cohesion: 0.83
Nodes (3): connectCDP(), httpGet(), main()

### Community 51 - "inspect_scraped_dataset.mjs"
Cohesion: 0.83
Nodes (3): connectCDP(), httpGet(), main()

### Community 52 - "reload_extension.mjs"
Cohesion: 0.83
Nodes (3): connectCDP(), httpGet(), reload()

### Community 53 - "package.json"
Cohesion: 0.33
Nodes (5): name, scripts, test, type, version

### Community 54 - "Scripts Lifecycle & Tooling Discipline Rule"
Cohesion: 0.40
Nodes (4): 1. Explicit Purpose Declaration, 2. Temporary / Scratch Scripts Cleanup, 3. Permanent Long-Term Tooling Registry, Scripts Lifecycle & Tooling Discipline Rule

### Community 55 - "TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)"
Cohesion: 0.40
Nodes (4): 1. User Journeys & Core Guarantees, 2. Test Specification & Verification Matrix, 3. TDD Progression Summary, TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)

### Community 56 - "run_active_scrape.mjs"
Cohesion: 0.83
Nodes (3): evaluateInTab(), getApolloTab(), main()

### Community 57 - "test_live_scrape_verification.mjs"
Cohesion: 0.83
Nodes (3): evaluate(), getApolloTab(), main()

### Community 58 - "trigger_and_monitor_scrape.mjs"
Cohesion: 0.83
Nodes (3): evaluate(), getApolloTab(), main()

### Community 59 - "verify_each_cabinet.mjs"
Cohesion: 0.83
Nodes (3): evaluate(), getApolloTab(), main()

### Community 61 - "content.js"
Cohesion: 0.33
Nodes (8): ensureHUD(), exportCollectedLeads(), extractDOMFallback(), mountWhenReady(), probeDensity(), runHarvest(), sleepWithCountdown(), waitForBatch()

### Community 62 - "sanitizeCSVValue"
Cohesion: 0.09
Nodes (31): 1. Executive Summary & Problem Breakdown, 2. Architecture & Design Principles, 3. Step-by-Step Implementation Plan, 4. Key Files to Modify, 5. Risks and Mitigations, 6. Execution Command Sequence, Implementation Plan: Repository Hardening, Privacy Remediation & Storage Optimization, Phase 1: Security & Privacy Remediation (Data Removal & Gitignore) (+23 more)

### Community 73 - "Workflows"
Cohesion: 0.29
Nodes (6): 1. Launching Local Review Station, 2. Programmatic Lead Inspection & ICP Scoring, 3. Dry-Run Slicer Simulation, 4. Running Validation Tests, Apollo Review, Telemetry & Debug Station Skill, Workflows

### Community 82 - "Apollo Scraper Architecture & Data Integrity Guardrails"
Cohesion: 0.40
Nodes (4): 1. Apollo Entity Architecture, 2. Chrome Extension Service Worker (MV3) Restrictions, 3. Zero-Data-Loss Normalization & Export, Apollo Scraper Architecture & Data Integrity Guardrails

### Community 91 - "extract_steps.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, times, videoFile

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 433 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildUnionCSV()` connect `sanitizeCSVValue` to `slicer_core.js`, `compare_csvs.mjs`, `PersistentOrgCache`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `buildUnionCSV()` (e.g. with `Phase 1: Unit Tests First (RED)` and `1. Executive Summary & Problem Breakdown`) actually correct?**
  _`buildUnionCSV()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compare_csvs.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._
- **Why does `AdaptivePacer` connect `PersistentOrgCache` to `slicer_core.js`, `SmartBatcher`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `SmartBatcher` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Why does `sanitizeCSVValue()` connect `sanitizeCSVValue` to `slicer_core.js`, `compare_csvs.mjs`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._