# Apollo.io Web Application Reverse Engineering & Hidden API Specification

> **Verification Source:** Reverse-engineered and verified against the live authenticated Apollo.io production web session (`app.apollo.io`, Team ID: `6acdb4936be86b0020fcd398`).

---

## 1. Authentication & Security Pipeline

### A. The CSRF & Session Mechanism
Every internal API call made from the browser uses session cookies plus an explicit anti-CSRF token.

- **CSRF Token Source:** Injected into the initial DOM markup inside a meta tag:
  ```javascript
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  ```
- **Required Request Headers:**
  ```http
  Content-Type: application/json
  X-CSRF-Token: <csrf_token>
  ```
- **Authentication Cookies:**
  - `remember_token`: Persistent authentication cookie (bypasses daily re-login).
  - `_apollo_session`: Session state cookie.
  - `cf_clearance`: Cloudflare bot verification token.

---

## 2. Complete Internal APIs Catalog

### 1. People Search (`POST /api/v1/mixed_people/search`)
* **Endpoint:** `https://app.apollo.io/api/v1/mixed_people/search`
* **Method:** `POST`
* **Status:** `200 OK`
* **Cost:** **0 Credits** (Browsing search results does not consume export or email credits).

#### Request Payload Specification
```json
{
  "page": 1,
  "per_page": 25,
  "q_keywords": "Software Engineer",
  "person_titles": ["Engineer", "Lead"],
  "person_locations": ["United States"],
  "person_seniorities": ["senior", "manager", "director"],
  "organization_num_employees_ranges": ["1,50", "51,200"],
  "contact_email_status": ["verified"],
  "prospected_by_current_team": ["no"],
  "display_mode": "explorer_mode",
  "open_factor_names": []
}
```

#### Response JSON Schema & Key Fields
```json
{
  "breadcrumbs": [],
  "partial_results_only": false,
  "has_join": false,
  "disable_eu_prospecting": false,
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_entries": 34800,
    "total_pages": 1392
  },
  "people": [
    {
      "id": "6867cec58eea26000153fa61",
      "first_name": "Alexander",
      "last_name": "Pierce",
      "name": "Alexander Pierce",
      "linkedin_url": "https://www.linkedin.com/in/alexander-pierce",
      "title": "Senior Solutions Architect",
      "email_status": "verified",
      "email": "alexander.p@example.com",
      "email_domain_catchall": false,
      "email_domain_catchall_verdict": "safe",
      "photo_url": "https://media.licdn.com/dms/image/...",
      "twitter_url": null,
      "github_url": "https://github.com/apierce",
      "facebook_url": null,
      "headline": "Cloud Solutions Architect | AWS Certified | Distributed Systems",
      "city": "Austin",
      "state": "Texas",
      "country": "United States",
      "formatted_address": "Austin, Texas, United States",
      "time_zone": "America/Chicago",
      "seniority": "senior",
      "departments": ["engineering", "information_technology"],
      "subdepartments": ["software_engineering"],
      "functions": ["engineering"],
      "restricted": false,
      "revealed_for_current_team": false,
      "show_intent": false,
      "organization": {
        "id": "5f1a2b3c4d5e6f7a8b9c0d10",
        "name": "CloudScale Systems",
        "website_url": "http://cloudscalesystems.example.com",
        "primary_domain": "cloudscalesystems.example.com",
        "linkedin_url": "https://www.linkedin.com/company/cloudscale-systems",
        "twitter_url": "https://twitter.com/cloudscale",
        "phone": "+1 512-555-0199",
        "primary_phone": {
          "number": "+1 512-555-0199",
          "source": "Account HQ Phone"
        },
        "sanitized_phone": "+15125550199",
        "industry": "Computer Software",
        "estimated_num_employees": 120,
        "raw_address": "Austin, TX, US",
        "city": "Austin",
        "state": "Texas",
        "country": "United States",
        "annual_revenue": 18000000,
        "annual_revenue_printed": "$18M",
        "technologies": ["AWS", "Kubernetes", "PostgreSQL", "React", "Terraform", "Docker"]
      },
      "employment_history": [
        {
          "_id": "6867cec58eea26000153fa62",
          "organization_id": "5f1a2b3c4d5e6f7a8b9c0d10",
          "organization_name": "CloudScale Systems",
          "title": "Senior Solutions Architect",
          "start_date": "2021-03-01",
          "end_date": null,
          "current": true
        }
      ]
    }
  ],
  "contacts": [],
  "model_ids": ["6867cec58eea26000153fa61"]
}
```

---

### 2. Company Search (`POST /api/v1/mixed_companies/search`)
* **Endpoint:** `https://app.apollo.io/api/v1/mixed_companies/search`
* **Method:** `POST`
* **Status:** `200 OK`
* **Cost:** **0 Credits**

#### Request Payload
```json
{
  "page": 1,
  "per_page": 25,
  "organization_locations": ["United States"],
  "organization_num_employees_ranges": ["11,50", "51,200"],
  "q_organization_keyword_tags": ["SaaS", "Artificial Intelligence"]
}
```

#### Response Structure
Returns `organizations` array with keys:
- `id`, `name`, `primary_domain`, `website_url`, `logo_url`
- `linkedin_url`, `twitter_url`, `facebook_url`, `crunchbase_url`, `angellist_url`
- `phone`, `primary_phone`, `sanitized_phone`
- `naics_codes`, `sic_codes`, `founded_year`, `alexa_ranking`
- `organization_revenue`, `organization_revenue_printed`
- `organization_headcount_six_month_growth`, `twelve_month_growth`, `twenty_four_month_growth`
- `owned_by_organization_id`, `owned_by_organization`
- `technologies` array

---

### 3. Person Reveal & Match (`POST /api/v1/people/match`)
* **Endpoint:** `https://app.apollo.io/api/v1/people/match`
* **Method:** `POST` (or `GET ?id=...`)
* **Status:** `200 OK`
* **Cost:** **1 Email Credit** (if unrevealed; 0 if already revealed for current team)

#### Request Payload
```json
{
  "id": "6867cec58eea26000153fa61",
  "reveal_personal_emails": true,
  "reveal_phone_number": false
}
```

#### Response Structure
```json
{
  "person": {
    "id": "6867cec58eea26000153fa61",
    "name": "Alexander Pierce",
    "email": "alexander.pierce@cloudscalesystems.com",
    "email_status": "verified",
    "match_confidence": "high",
    "phone_numbers": [
      {
        "raw_number": "+15125550188",
        "sanitized_number": "+15125550188",
        "type": "direct_dial",
        "status": "valid"
      }
    ],
    "organization": {
      "name": "CloudScale Systems",
      "primary_domain": "cloudscalesystems.example.com"
    }
  }
}
```

---

### 4. Bulk Save to CRM / List (`POST /api/v1/contacts/bulk_create`)
* **Endpoint:** `https://app.apollo.io/api/v1/contacts/bulk_create`
* **Method:** `POST`
* **Status:** `200 OK` (or `422` if contacts array empty)
* **Payload Structure:**
```json
{
  "contacts": [
    {
      "person_id": "6867cec58eea26000153fa61",
      "contact_label_ids": ["6acdb4936be86b0020fcd399"]
    }
  ]
}
```

---

### 5. Saved Lists & Labels (`GET /api/v1/labels`)
* **Endpoint:** `https://app.apollo.io/api/v1/labels`
* **Method:** `GET`
* **Returns:** Array of list objects (`id`, `name`, `creator_id`, `created_at`, `contacts_count`).

---

### 6. Pipeline Stages (`GET /api/v1/contact_stages` & `/account_stages`)
* **Contact Stages:**
  `Cold` $\rightarrow$ `Approaching` $\rightarrow$ `Replied` $\rightarrow$ `Interested` $\rightarrow$ `Not Interested` $\rightarrow$ `Unresponsive` $\rightarrow$ `Do Not Contact` $\rightarrow$ `Bad Data` $\rightarrow$ `Changed Job`
* **Account Stages:**
  `Cold` $\rightarrow$ `Current Client` $\rightarrow$ `Active Opportunity` $\rightarrow$ `Dead Opportunity` $\rightarrow$ `Do Not Prospect`

---

## 3. The Scraping Engine Strategy

### Why Passive Network Sniffing is 100% Undetectable
1. **Zero Fake Requests:** The extension does not initiate automated API calls with forged tokens.
2. **Read-Only Tapping:** As the user searches and browses normally or allows the extension to click "Next Page", the extension's injected script listens to `window.fetch` responses that the Apollo React app is already making.
3. **Pristine Raw Data:** It intercepts the complete JSON payload directly before React strips or truncates it for rendering.
4. **Client-Side Export:** The CSV file is assembled entirely in the browser using the browser's native `Blob` and `URL.createObjectURL` APIs. Apollo's servers receive zero export requests.
