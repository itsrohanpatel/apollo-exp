# Graph Report - apollo scraper  (2026-10-20)

## Corpus Check
- 80 files · ~117,390 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 676 nodes · 894 edges · 46 communities (42 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b5cbe282`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_company_scraper_live.mjs
- ref_fs
- harvest_1000_leads.py
- test_injected_resolution.mjs
- compare_csvs.mjs
- PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)
- PersistentOrgCache
- test_company_scraper_live.mjs
- extension/background.js
- 2. Core Endpoints for Lead Scraping & Prospecting
- 2. Complete Internal APIs Catalog
- Apollo Scraper Engine: Complete Methods & Workflows Guide
- extension/manifest.json
- CompanyEnrichmentEngine
- 2. The 6 Proven Bypass Methodologies
- injected.js
- ref_path
- Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)
- slicer_core.js
- review_station_server.mjs
- 🛠️ Tool Index & Run Guide
- Apollo.io Scraper Chrome Extension Architecture (Manifest V3)
- 2. In-Depth Architectural Dissection of Market Tools
- parse_csv_proper.mjs
- 3. Feeding Enriched Leads into `lead-intelligence`
- 1. Key Technical Discoveries & Hard Limits
- ref_fs
- SafetyCircuitBreaker
- Apollo.io Scraper Chrome Extension & Reverse Engineering Documentation
- analyze_csv_breakdown.mjs
- Browser Tool Selection & Active Session Rule
- Live Empirical Test Report: Adaptive Micro-Slicing Harvester
- test_brackets.mjs
- Mandatory ECC Workflow & Skill Discovery Protocol
- AdaptivePacer
- package.json
- Scripts Lifecycle & Tooling Discipline Rule
- TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)
- extract_frames.mjs
- extract_hud_crop.mjs
- extension/content.js
- sanitizeCSVValue
- Workflows
- Apollo Scraper Architecture & Data Integrity Guardrails
- extract_steps.mjs

## God Nodes (most connected - your core abstractions)
1. `sanitizeCSVValue()` - 14 edges
2. `PersistentOrgCache` - 14 edges
3. `CompanyEnrichmentEngine` - 13 edges
4. `DeduplicationStore` - 11 edges
5. `PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)` - 11 edges
6. `runUniversalHarvest()` - 10 edges
7. `🛠️ Tool Index & Run Guide` - 10 edges
8. `CabinetExclusionTracker` - 8 edges
9. `Apollo.io Scraper Chrome Extension Architecture (Manifest V3)` - 8 edges
10. `Apollo Scraper Engine: Complete Methods & Workflows Guide` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Problem in Codebase` --references--> `exportToCSV()`  [INFERRED]
  .agents/plans/ecc-architecture-optimizations.plan.md → extension/background.js
- `1. Executive Summary & Problem Breakdown` --references--> `sanitizeCSVValue()`  [INFERRED]
  .agents/plans/repository-hardening-and-fix-plan.md → extension/slicer_core.js
- `2. Architecture & Design Principles` --references--> `sanitizeCSVValue()`  [INFERRED]
  .agents/plans/repository-hardening-and-fix-plan.md → extension/slicer_core.js
- `Phase 3: CSV Security & Formula Injection Sanitization` --references--> `sanitizeCSVValue()`  [INFERRED]
  .agents/plans/repository-hardening-and-fix-plan.md → extension/slicer_core.js
- `1. Executive Summary & Problem Breakdown` --references--> `sanitizeCSVValue()`  [INFERRED]
  .claude/plans/repository-hardening-and-fix-plan.md → extension/slicer_core.js

## Import Cycles
- None detected.

## Communities (46 total, 4 thin omitted)

### Community 0 - "test_company_scraper_live.mjs"
Cohesion: 0.29
Nodes (8): evalInPage(), getApolloTab(), main(), sendCDP(), connectCDP(), httpGet(), main(), sleep()

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

### Community 6 - "PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)"
Cohesion: 0.06
Nodes (33): 10. Prospected / CRM Status, 1. Account Location, 1. Job Titles, 1. Physical UI Flow & URL Hash State Serialization, 2. Exhaustive Filter-by-Filter Engineering Breakdown, 2. Number of Employees (Headcount), 2. Seniority / Management Level, 3. Functions & Departments (+25 more)

### Community 7 - "PersistentOrgCache"
Cohesion: 0.07
Nodes (24): 1. Executive Summary & Objective, 2. ECC Skills Relevance & Mapping Matrix, 3. Detailed Architecture Specifications, 4. Step-by-Step TDD Implementation Plan, Added Data Fields (Non-Destructive), Architecture Optimization Roadmap & Implementation Plan, Architecture Specification, Architecture Specification (+16 more)

### Community 8 - "test_company_scraper_live.mjs"
Cohesion: 0.05
Nodes (43): connectCDP(), httpGet(), main(), evaluate(), getApolloTab(), main(), connectCDP(), httpGet() (+35 more)

### Community 9 - "extension/background.js"
Cohesion: 0.18
Nodes (16): buildChunkedUnionCSV(), computeLeadICPScore(), enqueueCompanyEnrichment(), enrichmentQueue, exportToCSV(), extractPastExperience(), flattenRecord(), inferSeniority() (+8 more)

### Community 10 - "2. Core Endpoints for Lead Scraping & Prospecting"
Cohesion: 0.09
Nodes (21): 1. API Overview & Authentication, 2. Core Endpoints for Lead Scraping & Prospecting, 3. Rate Limits & Quotas, A. Net-New People Search (Discovery), Apollo.io Complete API Reference Documentation, B. People Match & Enrichment (Single), C. People Bulk Match (Multi-Prospect Enrichment), D. Company Search & Organization Enrichment (+13 more)

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

### Community 19 - "injected.js"
Cohesion: 0.23
Nodes (11): AdaptivePacer, decomposeHighDensityBracket(), expandOpenHeadcountRange(), generateAdaptiveMicroBrackets(), getApolloHeaders(), getCookie(), isHighDensityBracket(), parseUrlHash() (+3 more)

### Community 23 - "ref_path"
Cohesion: 0.22
Nodes (6): ffmpegPath, outDir, times, videoFile, ffmpegPath, videoFile

### Community 24 - "Plan: Universal Deep Harvest Engine (10,000+ Leads, Anti-Ban & 0-Credit)"
Cohesion: 0.15
Nodes (12): 1. Requirements & Problem Restatement, 2. Patterns to Mirror, 3. Files to Create / Modify, 4. Implementation Tasks & Phases, 5. Anti-Ban & Safety Defense Matrix, 6. Acceptance Criteria, Phase 1: Test-Driven Development (TDD) Foundation, Phase 2: Core Algorithm Library (`extension/slicer_core.js`) (+4 more)

### Community 27 - "slicer_core.js"
Cohesion: 0.06
Nodes (41): RFC-4180, buildCabinetDrainPayload(), buildChunkedUnionCSV(), buildExclusionPayload(), buildUnionCSV(), CabinetExclusionTracker, calculateSmartCooldownDuration(), computeLeadICPScore() (+33 more)

### Community 29 - "review_station_server.mjs"
Cohesion: 0.18
Nodes (10): args, DATA_DIR, __dirname, EXTENSION_DIR, __filename, getSampleDataset(), MIME_TYPES, portIndex (+2 more)

### Community 30 - "🛠️ Tool Index & Run Guide"
Cohesion: 0.17
Nodes (11): 1. [`analyze_csv.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/analyze_csv.mjs), 2. [`inspect_live_apollo_data.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_live_apollo_data.mjs), 3. [`test_company_scraper_live.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_company_scraper_live.mjs), 4. [`test_zero_loss_export.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/test_zero_loss_export.mjs), 5. [`benchmark_org_enrich.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/benchmark_org_enrich.mjs), 6. [`reload_extension.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/reload_extension.mjs), 7. [`inspect_extension_state.mjs`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_extension_state.mjs) & [`inspect_runtime.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_runtime.py), 8. [`inspect_stored_leads.py`](file:///d:/Codinf%20projets/apollo%20scraper/scripts/inspect_stored_leads.py) (+3 more)

### Community 31 - "Apollo.io Scraper Chrome Extension Architecture (Manifest V3)"
Cohesion: 0.18
Nodes (10): 1. System Architecture Overview, 2. Core Methodologies: Network Interception vs. DOM Scraping, 3. Manifest V3 File Blueprint, 4. Injected Network Sniffer (`injected.js`), 5. Content Script Bridge & Automation (`content.js`), 6. Background Service Worker (`background.js`), 7. CSV Conversion & Local Export Engine, Apollo.io Scraper Chrome Extension Architecture (Manifest V3) (+2 more)

### Community 34 - "2. In-Depth Architectural Dissection of Market Tools"
Cohesion: 0.20
Nodes (9): 1. `Apollo-Scraper-Extension` (Chrome Manifest V3), 1. Executive Summary & Comparison Matrix, 2. `apollo-email-scraper` (Chrome Extension), 2. In-Depth Architectural Dissection of Market Tools, 3. `apollo-search-scraper` (Python + Selenium), 3. Summary of Market Blindspots, 4. `apollo_scraper` (SeleniumBase UC Mode), 5. `apolloscraperHck` (Apify / Puppeteer-Extra Stealth) (+1 more)

### Community 35 - "parse_csv_proper.mjs"
Cohesion: 0.18
Nodes (10): allRows, candidatePaths, companyColIdx, content, csvPath, dupIds, ids, nameColIdx (+2 more)

### Community 37 - "3. Feeding Enriched Leads into `lead-intelligence`"
Cohesion: 0.22
Nodes (8): 1. The End-to-End Pipeline, 2. Ingesting Scraped Apollo Leads into `data-scraper-agent`, 3. Feeding Enriched Leads into `lead-intelligence`, Everything Claude Code (ECC) Integration Guide for Apollo Scraper, Ingestion Script: `enrich_apollo_leads.py`, Stage 1: Finding Missing Emails (Waterfall Enrichment), Stage 2: Warm Path Discovery, Stage 3: Personalized Multi-Channel Outreach

### Community 38 - "1. Key Technical Discoveries & Hard Limits"
Cohesion: 0.22
Nodes (8): 1. Key Technical Discoveries & Hard Limits, 2. Updated Extension Safeguards, Lesson 1: The Strict `per_page` Hard Limit (422 Error), Lesson 2: Cloudflare Turnstile & Velocity-Based Bot Detection, Lesson 3: Latency & Response Dynamics, Lesson 4: Record Deduplication & Pagination Drift, Lesson 5: Data Completeness on Verified Leads, Lessons Learned: Scraping Apollo.io at Scale (1,000+ Leads)

### Community 40 - "ref_fs"
Cohesion: 0.40
Nodes (3): allRows, content, viraj

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

### Community 53 - "package.json"
Cohesion: 0.33
Nodes (5): name, scripts, test, type, version

### Community 54 - "Scripts Lifecycle & Tooling Discipline Rule"
Cohesion: 0.40
Nodes (4): 1. Explicit Purpose Declaration, 2. Temporary / Scratch Scripts Cleanup, 3. Permanent Long-Term Tooling Registry, Scripts Lifecycle & Tooling Discipline Rule

### Community 55 - "TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)"
Cohesion: 0.40
Nodes (4): 1. User Journeys & Core Guarantees, 2. Test Specification & Verification Matrix, 3. TDD Progression Summary, TDD Evidence Report: Universal Deep Harvest Engine (10,000+ Leads)

### Community 59 - "extract_frames.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, timestamps, videoFile

### Community 60 - "extract_hud_crop.mjs"
Cohesion: 0.40
Nodes (4): ffmpegPath, outDir, times, videoFile

### Community 62 - "sanitizeCSVValue"
Cohesion: 0.08
Nodes (30): 1. Executive Summary & Problem Breakdown, 2. Architecture & Design Principles, 3. Step-by-Step Implementation Plan, 4. Key Files to Modify, 5. Risks and Mitigations, 6. Execution Command Sequence, Implementation Plan: Repository Hardening, Privacy Remediation & Storage Optimization, Phase 1: Security & Privacy Remediation (Data Removal & Gitignore) (+22 more)

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 363 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sanitizeCSVValue()` connect `sanitizeCSVValue` to `slicer_core.js`, `compare_csvs.mjs`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `sanitizeCSVValue()` (e.g. with `1. Executive Summary & Problem Breakdown` and `2. Architecture & Design Principles`) actually correct?**
  _`sanitizeCSVValue()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compare_csvs.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._
- **Why does `PersistentOrgCache` connect `PersistentOrgCache` to `slicer_core.js`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `PersistentOrgCache` (e.g. with `2. ECC Skills Relevance & Mapping Matrix` and `Architecture Specification`) actually correct?**
  _`PersistentOrgCache` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `PART A: PEOPLE / EMPLOYEE FILTERS (`#/people`)` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._