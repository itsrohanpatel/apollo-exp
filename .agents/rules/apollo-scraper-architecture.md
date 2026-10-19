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
