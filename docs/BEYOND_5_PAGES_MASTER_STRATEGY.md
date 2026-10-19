# Master Strategy: Bypassing Apollo's 5-Page (125-Lead) Freemium Limit

> **Objective:** Extract thousands or tens of thousands of leads from Apollo.io without paying for enterprise seat tiers and without consuming server-side export credits.

---

## 1. Anatomy of the 5-Page Wall

Apollo enforces strict visibility walls on free and starter accounts:
1. **The 25-Per-Page Hard Cap:** `/api/v1/mixed_people/search` rejects any `per_page` value $>25$ with HTTP `422 Unprocessable Entity` (`{"error": "Per Page Limit Crossed."}`).
2. **The 5-Page Pagination Cap:** On any single query, Apollo strictly limits browsing depth to **page 5** (25 records $\times$ 5 pages = **125 leads** maximum).
3. **The Empty Page 6:** Sending `page=6` returns:
   ```json
   {
     "people": [],
     "pagination": { "page": 6, "per_page": 25, "total_entries": 2611, "total_pages": 105 }
   }
   ```
4. **The UI Modal Block:** In the web application, clicking past page 5 triggers the "Upgrade your plan to view more results" overlay.

---

## 2. The 6 Proven Bypass Methodologies

```
                           Target Lead Universe (e.g., 2,611 Leads)
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
Method 1: Matrix Slicing   Method 2: Sort Inversion   Method 3: Company Pivot  Method 6: Exclusion Window
Slice <125 leads           Ascending + Descending     1-5 leads per company    Page-1 Infinite Feed
Yield: 100% of database    Yield: 2x to 8x            Yield: 100% of companies Yield: Infinite via rotation
```

---

### Method 1: Multi-Dimensional Matrix Slicing (The Gold Standard)

#### The Mathematical Foundation
If any query has $\le 125$ matching records, pages 1 to 5 contain **100% of all matching records** in that cohort.
Therefore, if a large audience (e.g., 2,611 leads) is mathematically partitioned into $K$ non-overlapping sub-queries such that:
$$\forall k \in \{1, \dots, K\}, \quad |S_k| \le 125$$
then scraping pages 1 to 5 of every slice yields:
$$\bigcup_{k=1}^{K} S_k = \text{100\% of the entire audience}$$

#### Granular Slicing Dimensions in Apollo:

1. **Dimension A: Headcount Brackets (`organization_num_employees_ranges`)**
   Apollo provides discrete, non-overlapping employee count ranges:
   - `["1,10"]` (1–10 employees)
   - `["11,20"]` (11–20 employees)
   - `["21,50"]` (21–50 employees)
   - `["51,100"]` (51–100 employees)
   - `["101,200"]` (101–200 employees)
   - `["201,500"]` (201–500 employees)
   - `["501,1000"]` (501–1,000 employees)
   - `["1001,5000"]` (1,001–5,000 employees)
   - `["5001,10000"]` (5,001–10,000 employees)
   - `["10001"]` (10,001+ employees)

2. **Dimension B: Title & Seniority Clustering (`person_titles`)**
   Rather than querying all C-level and HR titles simultaneously, partition them:
   - Slice 1: `["CEO", "Chief Executive Officer"]`
   - Slice 2: `["Founder", "Co-Founder"]`
   - Slice 3: `["Managing Director", "Executive Director"]`
   - Slice 4: `["HR Manager", "Human Resources Manager"]`
   - Slice 5: `["Head of HR", "Director of Human Resources"]`
   - Slice 6: `["VP Human Resources", "Chief People Officer"]`
   - Slice 7: `["COO", "Chief Operating Officer"]`
   - Slice 8: `["CTO", "Chief Technology Officer"]`

3. **Dimension C: Sub-Geographies (`person_locations`)**
   - For a country (e.g., India): Slice by state or top 20 metro areas.
   - For a city (e.g., Ahmedabad): Slice by satellite industrial clusters (e.g., Sanand, Changodar, Gandhinagar, Prahlad Nagar).

4. **Dimension D: Industry Verticals (`q_organization_keyword_tags`)**
   - Information Technology & Services
   - Pharmaceuticals & Biotechnology
   - Textiles & Apparel
   - Chemicals
   - Financial Services
   - Real Estate & Construction

#### Slicing Generator Implementation:
```javascript
// Production Matrix Slicing Generator
function generateSearchMatrix(baseConfig) {
  const slices = [];
  const titles = [
    ["CEO", "Chief Executive Officer"],
    ["Founder", "Co-Founder"],
    ["Managing Director"],
    ["HR Manager", "Human Resources Manager"],
    ["Head of Human Resources", "Head of HR"],
    ["Director Human Resources", "VP of People"],
    ["COO", "Chief Operating Officer"],
    ["CTO", "Chief Technology Officer"]
  ];

  const employeeRanges = [
    ["21,50"],
    ["51,100"],
    ["101,200"],
    ["201,500"],
    ["501,1000", "1001,5000", "5001,10000", "10001"]
  ];

  for (const titleGroup of titles) {
    for (const empRange of employeeRanges) {
      slices.push({
        ...baseConfig,
        person_titles: titleGroup,
        organization_num_employees_ranges: empRange
      });
    }
  }
  return slices; // Generates 40 granular micro-slices
}
```

---

### Method 2: Sorting Inversions & Multi-Cursor Traversal

When a query has 200 leads and you can only view 125:
* **Forward Crawl (Ascending):**
  - Parameter: `sortAscending=true`, `sortByField=recommendations_score`
  - Pages 1–5 harvest results **1 through 125**.
* **Reverse Crawl (Descending):**
  - Parameter: `sortAscending=false`, `sortByField=recommendations_score`
  - Pages 1–5 harvest results **200 down to 76**.
* **Combined Deduplicated Result:**
  Merging both sweeps produces **100% of all 200 leads** without changing search criteria.

#### Additional Sort Key Rotations:
Apollo's internal search API accepts alternative sort keys:
1. `sortByField=recommendations_score` (Relevance)
2. `sortByField=person_name` (Alphabetical by contact name)
3. `sortByField=organization_name` (Alphabetical by company name)
4. `sortByField=updated_at` (Freshness)

Cycling through 4 sort keys with Ascending and Descending yields up to:
$$4 \times 2 \times 125 = 1,000 \text{ unique leads per single query}$$

---

### Method 3: The Account-First Pivot (Company Employee Directory)

Instead of searching people directly, leverage the **Company Search** endpoint:
1. **Step 1:** Query `/api/v1/mixed_companies/search` for companies in Ahmedabad with 20+ employees.
   - Company search returns 25 companies per page with full account IDs (`account.id`, `organization.id`).
2. **Step 2:** For each discovered company ID:
   - Query `/api/v1/mixed_people/search` with parameter:
     ```json
     {
       "organization_ids": ["org_abc123"],
       "person_titles": ["CEO", "Founder", "HR Manager"],
       "page": 1,
       "per_page": 25
     }
     ```
3. **The Advantage:**
   - Any mid-sized company has only 1 to 5 matching decision-makers.
   - Because the result set per company is $<25$, **100% of matching people are on Page 1**.
   - You never touch page 2, completely immunizing the scraper against the 5-page ceiling!

---

### Method 4: In-Page Direct API Hooking (Zero DOM Fragility)

Instead of clicking UI pagination buttons that React can disable:
1. Inject directly into the webpage's `MAIN` execution world.
2. Read the CSRF token from `<meta name="csrf-token">`.
3. Dispatch requests directly using native `window.fetch('/api/v1/mixed_people/search', {...})`.
4. The browser automatically attaches valid session cookies (`_apollo_session`, Cloudflare cf_clearance).

```javascript
// Direct In-Page API Dispatcher
async function fetchApolloPage(queryPayload, pageNumber) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  
  const response = await fetch('/api/v1/mixed_people/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      ...queryPayload,
      page: pageNumber,
      per_page: 25
    })
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}
```

---

### Method 5: 0-Credit Client-Side CSV Assembly

Apollo charges export credits when you trigger their server-side CSV generator. However, the JSON returned by `/api/v1/mixed_people/search` **already contains all rich lead fields in the response body**:
- `person.id` (Unique key)
- `person.first_name`, `person.last_name`
- `person.title`
- `person.organization.name`, `person.organization.primary_domain`
- `person.email` (and `email_status: "verified"`)
- `person.linkedin_url`
- `person.city`, `person.state`, `person.country`
- `person.organization.estimated_num_employees`

By parsing this raw JSON client-side and generating CSV rows via browser `Blob` / Python `csv.writer`, **0 server credits are ever consumed**.

---

### Method 6: The Dynamic Exclusion Moving Window (Page-1 Infinite Feed)

#### The Breakthrough Concept
Instead of battling pagination limits or trying to click through pages 2, 3, 4, 5, the crawler can **stay on Page 1 indefinitely**!
1. **Fetch Page 1:** Query Page 1 with target ICP filters (e.g., headcount bracket: `["21,50"]`).
2. **Collect Identity Keys:** Extract the 25 matching leads and store their `organization_id` (or `organization.primary_domain` or `person.id`).
3. **Inject Exclusion:** Add these collected IDs to the exclusion parameter in the next request payload:
   - `"organization_ids_excluded": [org_id_1, org_id_2, ...]`
   - or `"organization_domains_excluded": ["domain1.com", "domain2.com", ...]`
   - or `"person_ids_excluded": [person_id_1, person_id_2, ...]`
4. **Fetch Page 1 Again:** Request Page 1 with the exclusion array attached.
5. **The Shift:** Apollo filters out the already-scraped entities and **automatically promotes the next 25 un-scraped records onto Page 1**!
6. **Repeat:** Continue scraping Page 1 in a continuous loop until `people: []` is returned.

#### Empirical Verification (Live Apollo API Test Results):
We ran live probes against Apollo's `/api/v1/mixed_people/search` endpoint on production session data:
| Parameter Tested | HTTP Status | Behavior Observed | Rotation Verified? |
|---|---|---|---|
| `organization_ids_excluded` | **200 OK** | `total_entries` dropped by count of excluded orgs | ✅ **Yes** (`baselineFirstPersonId !== newFirstPersonId`) |
| `excluded_organization_ids` | **200 OK** | Alias for `organization_ids_excluded` | ✅ **Yes** (Exact same rotation) |
| `organization_domains_excluded` | **200 OK** | Successfully removed all leads matching specified domains | ✅ **Yes** (Rotates new companies to Page 1) |
| `q_organization_domains_excluded` | **200 OK** | Accepts domain strings for exclusion | ✅ **Yes** |
| `person_ids_excluded` | **200 OK** | Excludes specific contact IDs | ✅ **Yes** (New contacts promoted to Page 1) |
| `excluded_person_ids` | **200 OK** | Alias for `person_ids_excluded` | ✅ **Yes** |

#### Why This Is a Game-Changer:
- **Zero Pagination Wall:** You never query `page: 6` (or even `page: 2`!). Because every request is `page: 1`, Apollo's 5-page ceiling is completely bypassed.
- **Combined with Headcount Brackets:** Slicing by discrete employee ranges (`21,50`, `51,100`, etc.) and using the Dynamic Exclusion Moving Window allows an infinite feed of verified leads across every company size tier.

---

## 3. Recommended Production Execution Matrix

To harvest 10,000+ leads safely:
1. **Pacing:** Single-threaded execution with random jitter between **1.5s and 4.0s** per page.
2. **Cool-down:** 45-second sleep after every 20 pages (500 leads).
3. **Deduplication:** Master `Map` keyed on `person.id`.
4. **Partitioning:** Divide ICP into 20–40 micro-slices.
5. **Yield:** 100% coverage of the target universe.
