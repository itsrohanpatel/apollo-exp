# Browser Tool Selection & Active Session Rule

## 1. Tool Selection Priority
- When metadata reports an active browser session (`Browser State: Page <ID> ... [ACTIVE]`), **ALWAYS use `browser_subagent`** to interact with, inspect, or automate the browser.
- **Do NOT use `chrome-devtools-mcp` tools** (`navigate_page`, `evaluate_script`, `list_network_requests`, etc.) when an active session is in `Browser State`, as `chrome-devtools-mcp` defaults to an isolated/blank CDP target (`about:blank`) that does not share the active user session or credentials.
- When you need to execute JavaScript or probe authenticated APIs within the page context, instruct `browser_subagent` to evaluate scripts directly in the active tab.

## 2. SPA Data Extraction Pattern
- For modern Single-Page Applications (SPAs) like Apollo.io, LinkedIn, or ZoomInfo:
  - Prefer **Passive In-Page Network Sniffing** over DOM scraping.
  - In Manifest V3 Chrome extensions, inject a script into the webpage's `MAIN` world (`web_accessible_resources`) to hook `window.fetch` and `XMLHttpRequest.prototype.send`.
  - Pass captured raw JSON responses to the content script via `window.postMessage`.
  - Assemble CSV/JSON downloads client-side via browser `Blob` / `URL.createObjectURL` to bypass server-side export limits without consuming export credits.
  - Extract CSRF tokens from `document.querySelector('meta[name="csrf-token"]')?.content` when in-page testing or active API calls are required.

## 3. SPA Scraping Guardrails & Anti-Bot Evasion
- **Respect Server Hard Caps:** On Apollo.io, `per_page` is hard-capped at 25 (`422 Unprocessable Entity` on larger values). Never send requests with `per_page > 25`.
- **Velocity Envelope:**
  - Execute requests strictly sequentially (no parallel page fetches on the same session).
  - Use randomized human jitter of 6.0s to 11.0s between consecutive page flips.
  - Apply an automatic 45-second cool-down resting period every 20 pages (500 leads) to avoid triggering Cloudflare Turnstile challenges.
- **Mandatory Deduplication:** Always deduplicate incoming records using unique entity keys (`id` or canonical LinkedIn URL) to protect against search relevance score drift (3–6% duplicate overlap across pages).

## 4. Bypassing Search Depth Limits via Multi-Dimensional Matrix Slicing
- **The Depth Limit Problem:** Modern B2B databases (e.g., Apollo.io, LinkedIn Sales Navigator) cap free or starter tiers at shallow search depths (e.g., 5 pages / 125 records maximum), after which they return empty results (`people: []`) or disable pagination controls.
- **The Mathematical Solution (Divide & Conquer):**
  - If any search query has $\le 125$ matching records, pages 1 to 5 yield **100% of all data** in that cohort without ever hitting the depth lock.
  - Partition broad ICPs across discrete, non-overlapping dimensions:
    1. **Headcount Brackets:** `1-10`, `11-20`, `21-50`, `51-100`, `101-200`, `201-500`, `501-1000`, `1001-5000`, `5001+`.
    2. **Title/Seniority Clusters:** CEOs $\rightarrow$ Founders $\rightarrow$ Managing Directors $\rightarrow$ HR Managers $\rightarrow$ VPs of People.
    3. **Sub-Geographies / Industrial Zones:** City districts, satellite hubs, or postal codes.
    4. **Industry Sub-Tags:** IT, Manufacturing, Pharma, Real Estate, Finance.
  - Iterate sequentially through each micro-slice and merge results into a master client-side map deduplicated by primary entity key (`person.id`).
- **Sorting Inversion Traversal:**
  - For queries with ~200 results, execute an **Ascending Sweep** (pages 1–5 yield records 1–125) followed by a **Descending Sweep** (pages 1–5 yield records 200 down to 76).
  - Merging both sweeps captures 100% of the audience without altering filter criteria.
- **Account-First Pivot:**
  - Query company search endpoints first (`/api/v1/mixed_companies/search`).
  - For each target company, query decision-makers by `organization_id`. Since mid-sized firms have only 1–5 key decision makers, **100% of matching contacts reside on Page 1**, completely bypassing the multi-page cap.

## 5. Anti-Pattern Catalog for Modern SPA Scrapers
- ❌ **Never scrape standard `<table>` or `tbody` tags:** Modern enterprise SPAs use virtualized CSS grids (`[role="grid"]`, `[role="row"]`). `document.querySelector('table')` will return `null`.
- ❌ **Never click UI "Access Email" or native "Export" buttons:** This consumes server-side user export credits and relies on ephemeral obfuscated CSS classes (`zp_*`) that break on weekly app deployments.
- ❌ **Never simulate DOM pagination clicks:** React state often disables the Next button or injects upgrade modals. Always hook the underlying network requests or dispatch in-page API calls via the session's CSRF token.
- ❌ **Never execute parallel bursts (`Promise.all`):** Rapid concurrent requests instantly trip Cloudflare Turnstile and IP rate limiters. Use sequential processing with randomized human jitter (1.5s–4.0s).

