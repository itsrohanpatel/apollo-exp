# Apollo Scraper Architecture & Data Integrity Guardrails

## 1. Apollo Entity Architecture
- **Lightweight Search vs. Full Details**:
  - `/api/v1/mixed_companies/search` returns preview stubs lacking exact employee headcount, technologies, and full locations.
  - Always route companies through the asynchronous background enrichment queue (`/api/v1/organizations/{id}`) with bounded concurrency (default: 5) to acquire `estimated_num_employees`, full location, technologies, and rich descriptions with zero credit cost.
- **Headcount Property Hierarchy**:
  - Always resolve company employee counts with this fallback cascade:
    `raw.estimated_num_employees || raw.num_employees || raw.organization_num_employees || raw.employee_count || raw.organization_num_employees_range || ''`

## 2. Chrome Extension Service Worker (MV3) Restrictions
- **No Dynamic `import()`**: Never invoke `import('...')` inside `background.js` as it throws `TypeError: import() is disallowed on ServiceWorkerGlobalScope`.
- Embed or statically bundle all normalizers and CSV formatters directly into the service worker.

## 3. Zero-Data-Loss Normalization & Export
- **Recursive Flattening**: Flatten nested JSON objects with hierarchical prefixes (e.g., `org_name`, `org_address_city`), while serializing complex array structures.
- **Mathematical Union CSV**: Always compute the full union of keys across all items so no sparse or newly discovered Apollo columns are omitted.
- **RFC 4180 & UTF-8**: Always prefix `\uFEFF` (BOM) for Excel compatibility and apply standard RFC 4180 quotation rules.

## 4. Dynamic Cabinet Slicing & Filter Invariants
- **Strict Ban on Job Titles (`personTitles[]`)**:
  - NEVER inject, filter by, or slice cabinets using job titles or keyword strings. Title slicing causes arbitrary lead omission and breaks the integrity of the target persona.
- **Strict User Filter Preservation**:
  - When bisecting or partitioning high-density cabinets (> 250 leads), NEVER alter, broaden, or strip user-specified filter criteria (such as `personLocations[]`, `q_organization_keyword_tags[]`, or `personDepartmentOrSubdepartments[]`). Pinned criteria are immutable.
- **Adaptive Dimensional Bisection Progression**:
  1. *Micro-Headcount Bisection*: Bisect employee ranges $[min, mid]$ and $[mid+1, max]$ down to single-integer brackets.
  2. *Native Seniority Partitioning*: If a single-integer bracket exceeds 250 leads, pivot across Apollo's 11 native seniorities (`c_suite`, `vp`, `director`, `manager`, `senior`, `entry`, etc.) ONLY if seniority is not already pinned by the user.
  3. *Email Status Partitioning*: If a single-integer bracket with pinned/exhausted seniority exceeds 250 leads, pivot across native email statuses (`verified`, `guessed`, `unavailable`) ONLY if email status is not already pinned by the user.
  4. *Bidirectional Company Sort*: Harvest up to 250 leads per slice using A-Z ascending (`sanitized_organization_name_unanalyzed`) and Z-A descending sorting to bypass Apollo's 5-page (125-lead) pagination limit.

## 5. Extension Portability & Packaging
- **Self-Contained Standalone Directory**:
  - All functional modules (`slicer_core.js`, `content.js`, `background.js`, `hud.js`, `storage.js`, `export_manager.js`, manifest, and styles) must reside inside `extension/`.
  - The extension folder must remain 100% shareable and immediately runnable as an unpacked extension without relying on external repository scripts.
