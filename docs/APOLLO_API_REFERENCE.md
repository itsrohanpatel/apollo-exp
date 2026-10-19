# Apollo.io Complete API Reference Documentation

This document compiles the complete official REST API reference for **Apollo.io (v1)**, including authentication, headers, core prospecting & enrichment endpoints, payload schemas, pagination, credit dynamics, and rate limiting.

---

## 1. API Overview & Authentication

- **Base URL:** `https://api.apollo.io/api/v1/`
- **Protocol:** HTTPS only
- **Data Format:** JSON (`application/json`)
- **Authentication Method:** Custom Header `x-api-key`
- **Bearer Token (Partners / OAuth 2.0):** `Authorization: Bearer <ACCESS_TOKEN>`

> [!WARNING]
> Passing API keys in query strings (`?api_key=...`) or within request bodies is deprecated and disabled on newer accounts. Always pass `x-api-key` in the HTTP headers.

### Standard Request Headers
```http
POST /api/v1/mixed_people/api_search HTTP/1.1
Host: api.apollo.io
Content-Type: application/json
Cache-Control: no-cache
x-api-key: your_apollo_api_key_here
```

---

## 2. Core Endpoints for Lead Scraping & Prospecting

### A. Net-New People Search (Discovery)
* **Endpoint:** `POST /api/v1/mixed_people/api_search`
* **Legacy Alternative (Deprecated):** `POST /api/v1/mixed_people/search` (returns 422 Unprocessable Entity on modern accounts)
* **Cost:** **0 Export Credits** (Returns profile discovery data, IDs, and company details without consuming contact reveal credits)
* **Max Results per Search:** 100 pages × up to 100 results per page = 10,000 max reachable per distinct query filter set.

#### Request Parameters (JSON Body)
| Field | Type | Description |
|---|---|---|
| `q_keywords` | string | Keyword search across person summary, notes, and headline |
| `person_titles[]` | array[string] | Target job titles (e.g., `["Founder", "VP of Sales"]`) |
| `person_seniorities[]` | array[string] | Seniorities: `owner`, `founder`, `c_suite`, `partner`, `vp`, `head`, `director`, `manager`, `senior`, `entry`, `intern` |
| `person_locations[]` | array[string] | Geographic locations (e.g., `["San Francisco, California, United States"]`) |
| `organization_ids[]` | array[string] | Apollo internal Organization IDs |
| `q_organization_domains` | string | Newline or space-separated list of domains |
| `organization_locations[]` | array[string] | Company headquarters locations |
| `organization_num_employees_ranges[]` | array[string] | Ranges like `["1,10"]`, `["11,50"]`, `["51,200"]`, `["201,500"]`, `["501,1000"]`, `["1001,5000"]`, `["5001,10000"]`, `["10001"]` |
| `revenue_range[min]` | integer | Minimum annual revenue in USD |
| `revenue_range[max]` | integer | Maximum annual revenue in USD |
| `contact_email_status[]` | array[string] | Filter by email status: `["verified"]`, `["extrapolated"]`, `["unverified"]` |
| `page` | integer | Page index (starts at `1`, max `100`) |
| `per_page` | integer | Results per page (default `25`, max `100`) |

#### Sample Request
```bash
curl --request POST \
  --url 'https://api.apollo.io/api/v1/mixed_people/api_search' \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: YOUR_API_KEY' \
  --data '{
    "person_titles": ["Founder", "CEO", "Co-Founder"],
    "person_locations": ["United States"],
    "organization_num_employees_ranges": ["11,50", "51,200"],
    "page": 1,
    "per_page": 25
  }'
```

#### Sample Response Body
```json
{
  "people": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "first_name": "Sarah",
      "last_name": "Connor",
      "name": "Sarah Connor",
      "linkedin_url": "https://www.linkedin.com/in/sarah-connor",
      "title": "Chief Executive Officer",
      "email_status": "verified",
      "photo_url": "https://media.licdn.com/dms/image/...",
      "twitter_url": "https://twitter.com/sarahc",
      "github_url": null,
      "facebook_url": null,
      "extrapolated_email_confidence": null,
      "headline": "CEO & Founder at Cyberdyne Tech",
      "city": "Austin",
      "state": "Texas",
      "country": "United States",
      "departments": ["executive", "management"],
      "subdepartments": ["c_suite"],
      "seniority": "c_suite",
      "functions": ["executive"],
      "organization": {
        "id": "5f1a2b3c4d5e6f7a8b9c0d10",
        "name": "Cyberdyne Tech",
        "website_url": "http://cyberdyne.example.com",
        "blog_url": null,
        "angellist_url": null,
        "linkedin_url": "https://www.linkedin.com/company/cyberdyne-tech",
        "twitter_url": "https://twitter.com/cyberdynetech",
        "facebook_url": null,
        "primary_phone": {
          "number": "+1 512-555-0199",
          "source": "Account HQ Phone"
        },
        "languages": [],
        "alexa_ranking": 45020,
        "phone": "+1 512-555-0199",
        "linkedin_uid": "12345678",
        "primary_domain": "cyberdyne.example.com",
        "industry": "Artificial Intelligence",
        "estimated_num_employees": 45,
        "raw_address": "Austin, TX, US",
        "city": "Austin",
        "state": "Texas",
        "country": "United States",
        "annual_revenue": 5000000,
        "annual_revenue_printed": "$5M",
        "technologies": ["AWS", "PostgreSQL", "Docker", "React", "Node.js"]
      },
      "employment_history": [
        {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
          "created_at": null,
          "current": true,
          "degree": null,
          "description": null,
          "emails": null,
          "end_date": null,
          "grade_level": null,
          "kind": null,
          "major": null,
          "organization_id": "5f1a2b3c4d5e6f7a8b9c0d10",
          "organization_name": "Cyberdyne Tech",
          "raw_address": null,
          "start_date": "2021-01-01",
          "title": "Chief Executive Officer",
          "updated_at": null
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_entries": 3480,
    "total_pages": 140
  }
}
```

---

### B. People Match & Enrichment (Single)
* **Endpoint:** `POST /api/v1/people/match`
* **Cost:** **1 Export/Enrichment Credit** (when email/phone is successfully revealed)
* **Purpose:** Takes an Apollo person ID, LinkedIn URL, or Name + Company Domain, and returns verified contact details (including direct email and direct dial phone).

#### Request Parameters
```json
{
  "id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "reveal_personal_emails": true,
  "reveal_phone_number": false
}
```
*Or query without an ID using candidate identifiers:*
```json
{
  "first_name": "Sarah",
  "last_name": "Connor",
  "domain": "cyberdyne.example.com",
  "reveal_personal_emails": true
}
```

#### Enriched Response Body
```json
{
  "person": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "first_name": "Sarah",
    "last_name": "Connor",
    "name": "Sarah Connor",
    "linkedin_url": "https://www.linkedin.com/in/sarah-connor",
    "title": "Chief Executive Officer",
    "email": "sarah.connor@cyberdyne.example.com",
    "email_status": "verified",
    "email_confidence": 0.98,
    "personal_emails": [
      "sarah.c.personal@gmail.com"
    ],
    "phone_numbers": [
      {
        "raw_number": "+15125550143",
        "sanitized_number": "+15125550143",
        "type": "direct_dial",
        "position": 0,
        "status": "valid"
      }
    ],
    "organization": {
      "name": "Cyberdyne Tech",
      "primary_domain": "cyberdyne.example.com"
    }
  }
}
```

---

### C. People Bulk Match (Multi-Prospect Enrichment)
* **Endpoint:** `POST /api/v1/people/bulk_match`
* **Batch Size:** Up to **10 contacts per request**
* **Cost:** 1 credit per verified contact revealed.

#### Request Payload
```json
{
  "details": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "reveal_personal_emails": true
    },
    {
      "first_name": "John",
      "last_name": "Smith",
      "domain": "acme.com"
    }
  ]
}
```

#### Response Structure
Returns `matches` array corresponding to the input list.

---

### D. Company Search & Organization Enrichment
* **Company Search Endpoint:** `POST /api/v1/mixed_companies/search`
* **Organization Enrichment Endpoint:** `POST /api/v1/organizations/enrich`

#### Sample Organization Enrichment Request
```json
{
  "domain": "stripe.com"
}
```

#### Organization Response Fields
- `organization.name`, `primary_domain`, `website_url`
- `estimated_num_employees`, `industry`, `keywords`
- `technologies`: Array of software, cloud infrastructure, libraries detected on their website/DNS.
- `annual_revenue`: Estimated revenue in USD.
- `funding_events`: Seed, Series A/B/C/D rounds, amounts, dates, investors.
- `phone`, `street_address`, `city`, `state`, `country`, `postal_code`.

---

### E. Saved CRM Contacts Endpoint
* **Search Saved Contacts:** `POST /api/v1/contacts/search`
* **View Single Contact:** `GET /api/v1/contacts/{id}`
* **Create Contact:** `POST /api/v1/contacts`
* **Update Contact:** `PATCH /api/v1/contacts/{id}`

> [!NOTE]
> `/contacts/search` queries only records already saved in your Apollo team CRM/workspace, encapsulated under the `contacts` JSON array. Contrast this with `/mixed_people/api_search` which queries Apollo's 275M+ prospect database under `people`.

---

## 3. Rate Limits & Quotas

Apollo enforces fixed-window rate limits varying by subscription tier (Free, Basic, Professional, Custom/Enterprise).

| Endpoint Family | Free / Basic | Professional | Enterprise |
|---|---|---|---|
| Search (`mixed_people/api_search`) | 100 req / min<br>1,200 req / hr | 200 req / min<br>2,400 req / hr | Custom (Up to 600 req/min) |
| Match / Enrichment (`people/match`) | 50 req / min<br>600 req / hr | 100 req / min<br>1,200 req / hr | Custom |
| Bulk Match | 10 req / min | 30 req / min | 60+ req / min |

### Rate Limit Response (HTTP 429)
When throttled, Apollo returns HTTP status code `429`:
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your per-minute request limit. Please wait before retrying."
}
```
Response headers will include:
- `X-RateLimit-Limit`: Maximum requests permitted in window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: UTC epoch timestamp when the current window resets

### Exponential Backoff Recommendation
```python
import time, random, requests

def call_apollo_with_retry(url, headers, payload, max_retries=5):
    for attempt in range(max_retries):
        resp = requests.post(url, headers=headers, json=payload)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 429:
            sleep_duration = (2 ** attempt) + random.uniform(0.5, 2.0)
            time.sleep(sleep_duration)
        else:
            resp.raise_for_status()
    raise RuntimeError("Exceeded maximum retry attempts on Apollo API")
```
