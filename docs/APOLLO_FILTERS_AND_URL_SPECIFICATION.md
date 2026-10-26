# Apollo.io Complete Filter Architecture & URL Serialization Specification

> **Verification Method:** Verified through live browser automation, DOM inspection, and hash mutation tests on production Apollo.io (`app.apollo.io`) in October 2026.
> **Scope:** Full mapping from a **clean blank search** to all 50+ individual filter controls, their browser URL hash encoding, and their corresponding internal backend JSON API payloads.

---

## 1. Clean Blank Search: Initial URL & Base State

When navigating to Apollo.io with zero active filters, the React/Vue Single-Page Application (SPA) initializes into a default clean state.

### A. Blank People Search (`#/people`)
```text
https://app.apollo.io/#/people?page=1&sortAscending=false&sortByField=recommendations_score&recommendationConfigId=6acdb4b72dd2d30001a1bc91
```

#### Base Parameters Breakdown:
| Parameter | Default Value | Description |
|---|---|---|
| `page` | `1` | 1-based pagination index. |
| `sortAscending` | `false` | Sort order (`false` = descending, highest relevance/score first). |
| `sortByField` | `recommendations_score` | Default ranking algorithm (`recommendations_score`, `[none]`, or specific fields). |
| `recommendationConfigId` | `6acdb4b72dd2...` | Internal user/team recommendation configuration ID. |

### B. Blank Company Search (`#/companies`)
```text
https://app.apollo.io/#/companies?page=1&sortAscending=false&sortByField=recommendations_score
```

---

## 2. URL Hash Serialization Architecture

Apollo does **not** send search state through standard HTTP query strings (`?` before `#`). Instead, it uses **URL hash query serialization** (`window.location.hash`):
1. **Hash Root:** Always starts with `#/people?` or `#/companies?`.
2. **Array Notation:** Arrays can be serialized as either standard brackets (`key[]=val1&key[]=val2`) or indexed brackets (`key[0]=val1&key[1]=val2`).
3. **Range Notation:**
   - **Predefined Brackets (Employees, Revenue):** Formatted as comma-separated strings inside arrays: `key[]=min%2Cmax` (e.g. `1%2C50` or `50%2C`).
   - **Numeric Min/Max (Tenure, Days in Role):** Formatted with explicit sub-keys: `key[min]=180&key[max]=365`.
4. **Reactive Two-Way Binding:** Setting `window.location.hash` in the browser causes the Apollo frontend router to immediately parse the parameters, create filter chips in the UI, and dispatch the background API search.

---

## 3. Comprehensive Master Filter Mapping Table

The table below catalogs every filter category available in Apollo.io, its UI behavior, URL hash query parameter, value format, and exact JSON payload key sent to `/api/v1/mixed_people/search` or `/api/v1/mixed_companies/search`.

| Filter Category | Sub-Control / Mode | URL Hash Query Parameter | Value Format / Sample | JSON Payload Key (API) |
|---|---|---|---|---|
| **Job Titles** | Included Titles | `personTitles[]` | `personTitles[]=CEO&personTitles[]=CTO` | `person_titles` |
| | Excluded Titles | `personNotTitles[]` | `personNotTitles[]=Intern` | `person_not_titles` |
| | Exact Match Mode | `personTitles[]` (quoted) | `personTitles[]=%22Software%20Engineer%22` | `person_titles` (exact) |
| **Management Level** | Seniority Multi-Select | `personSeniorities[]` | `personSeniorities[]=c_suite&personSeniorities[]=founder` | `person_seniorities` |
| **Department / Function** | Master Depts & Subdepts | `personDepartmentOrSubdepartments[]` | `personDepartmentOrSubdepartments[]=engineering` | `person_department_or_subdepartments` |
| **Geography (Person)** | Included Person Locations | `personLocations[]` | `personLocations[]=India&personLocations[]=United%20States` | `person_locations` |
| | Excluded Person Locations | `personNotLocations[]` | `personNotLocations[]=Russia` | `person_not_locations` |
| **Geography (Company HQ)** | Included Company HQ | `organizationLocations[]` | `organizationLocations[]=California%2C%20US` | `organization_locations` |
| | Excluded Company HQ | `organizationNotLocations[]` | `organizationNotLocations[]=Texas%2C%20US` | `organization_not_locations` |
| **# Employees (Headcount)** | Predefined Size Brackets | `organizationNumEmployeesRanges[]` | `organizationNumEmployeesRanges[]=1%2C10&organizationNumEmployeesRanges[]=51%2C100` | `organization_num_employees_ranges` |
| | Custom Minimum | `organizationNumEmployeesRanges[]` | `organizationNumEmployeesRanges[]=50%2C` | `organization_num_employees_ranges` |
| **# Employees by Dept** | Department Headcount | `organizationNumDepartmentEmployeesRanges[<dept>][]` | `organizationNumDepartmentEmployeesRanges[engineering][]=11%2C50` | `organization_num_department_employees_ranges` |
| **Email Status** | Deliverability Status | `contactEmailStatus[]` | `contactEmailStatus[]=verified` | `contact_email_status` |
| **Keywords (General)** | Free-Text Boolean Search | `qKeywords` | `qKeywords=SaaS%20AND%20B2B` | `q_keywords` |
| | Excluded Keywords | `qNotKeywords` | `qNotKeywords=Agency` | `q_not_keywords` |
| **Industry & Keywords** | Included Industry Tags | `qOrganizationKeywordTags[]` | `qOrganizationKeywordTags[]=Information%20Technology` | `q_organization_keyword_tags` |
| | Excluded Industry Tags | `qNotOrganizationKeywordTags[]` | `qNotOrganizationKeywordTags[]=Staffing` | `q_not_organization_keyword_tags` |
| **Company Name / Domain** | Included Accounts | `organizationIds[]` | `organizationIds[]=64a8...` | `organization_ids` |
| | Excluded Accounts | `organizationNotIds[]` | `organizationNotIds[]=64b2...` | `organization_not_ids` |
| **Company Lookalikes** | Similar Companies | `organizationLookalikeOrgIds[]` | `organizationLookalikeOrgIds[]=5e1...` | `organization_lookalike_org_ids` |
| **Technologies** | Included Tech Stack | `organizationTechnologyNames[]` | `organizationTechnologyNames[]=React&organizationTechnologyNames[]=AWS` | `organization_technology_names` |
| | Excluded Tech Stack | `organizationNotTechnologyNames[]` | `organizationNotTechnologyNames[]=Wordpress` | `organization_not_technology_names` |
| **Revenue** | Annual Revenue Brackets | `organizationRevenueRanges[]` | `organizationRevenueRanges[]=1000000%2C10000000` | `organization_revenue_ranges` |
| **Funding Stage** | Latest Funding Round | `organizationLatestFundingStageRanges[]` | `organizationLatestFundingStageRanges[]=series_a&organizationLatestFundingStageRanges[]=seed` | `organization_latest_funding_stage_ranges` |
| **Time in Current Role** | Days in Position (Min) | `personDaysInCurrentTitleRange[min]` | `personDaysInCurrentTitleRange[min]=90` | `person_days_in_current_title_range[min]` |
| | Days in Position (Max) | `personDaysInCurrentTitleRange[max]` | `personDaysInCurrentTitleRange[max]=365` | `person_days_in_current_title_range[max]` |
| **Total Experience** | Total Career Years (Min) | `personTotalYearsExperience[min]` | `personTotalYearsExperience[min]=5` | `person_total_years_experience[min]` |
| | Total Career Years (Max) | `personTotalYearsExperience[max]` | `personTotalYearsExperience[max]=20` | `person_total_years_experience[max]` |
| **Job Change Signals** | Recent Promotion / Move | `jobChange` | `jobChange=recent_promotion` | `job_change` |
| **Job Postings** | Currently Hiring For | `organizationJobPostingTitles[]` | `organizationJobPostingTitles[]=DevOps` | `organization_job_posting_titles` |
| **Buying Intent** | Intent Topic IDs | `organizationIntentTopicIds[]` | `organizationIntentTopicIds[]=61e0...` | `organization_intent_topic_ids` |
| | Intent Strength | `organizationIntentStrength[]` | `organizationIntentStrength[]=high&organizationIntentStrength[]=medium` | `organization_intent_strength` |
| **Education** | Schools / Universities | `personEducations[]` | `personEducations[]=Stanford%20University` | `person_educations` |
| | Degree | `personDegreeTypes[]` | `personDegreeTypes[]=bachelors` | `person_degree_types` |
| **Market Segments** | Company Segment Scale | `marketSegments[]` | `marketSegments[]=enterprise&marketSegments[]=mid_market` | `market_segments` |
| **CRM / Outreach Status** | Prospected Status | `prospectedByCurrentTeam[]` | `prospectedByCurrentTeam[]=no` | `prospected_by_current_team` |
| | Contact Stage | `contactStageIds[]` | `contactStageIds[]=cold` | `contact_stage_ids` |
| **Persona** | Saved Target Persona ID | `personaId` | `personaId=64c1...` | `persona_id` |

---

## 4. Deep-Dive: Specific Filter Value Dictionaries

### A. Seniority Levels (`personSeniorities[]`)
Apollo classifies contacts into 11 discrete seniority tiers:
- `owner`: Business owners, sole proprietors
- `founder`: Founders, co-founders
- `c_suite`: C-Level officers (CEO, CTO, CMO, CFO, COO, CIO)
- `partner`: Managing partners, general partners
- `vp`: Vice Presidents (SVP, EVP, VP)
- `head`: Heads of departments (Head of People, Head of Sales)
- `director`: Directors, Managing Directors
- `manager`: Team managers, leads, supervisors
- `senior`: Senior engineers, specialists, associates
- `entry`: Entry-level, junior personnel
- `intern`: Apprentices, student interns

### B. Company Headcount Brackets (`organizationNumEmployeesRanges[]`)
Apollo indexes companies strictly by discrete range strings:
- `"1,10"`: 1 – 10 employees
- `"11,20"`: 11 – 20 employees
- `"21,50"`: 21 – 50 employees
- `"51,100"`: 51 – 100 employees
- `"101,200"`: 101 – 200 employees
- `"201,500"`: 201 – 500 employees
- `"501,1000"`: 501 – 1,000 employees
- `"1001,5000"`: 1,001 – 5,000 employees
- `"5001,10000"`: 5,001 – 10,000 employees
- `"10001"`: 10,001+ employees
- `"50,"`: Open-ended minimum (50+ employees)

### C. Email Verification Status (`contactEmailStatus[]`)
- `verified`: Confirmed via live SMTP handshake
- `extrapolated`: Generated via company email domain pattern
- `unverified`: Scraped contact without MX verification
- `unavailable`: No known email record

### D. Revenue Brackets (`organizationRevenueRanges[]`)
- `"0,1000000"`: Under $1M
- `"1000000,10000000"`: $1M – $10M
- `"10000000,50000000"`: $10M – $50M
- `"50000000,100000000"`: $50M – $100M
- `"100000000,500000000"`: $100M – $500M
- `"500000000,1000000000"`: $500M – $1B
- `"1000000000,"`: $1B+

---

## 5. End-to-End Real World Scenario

### User Scenario:
Target HR Leaders in India, companies with 50+ employees, verified emails, in their role for under 90 days.

### Generated URL:
```text
https://app.apollo.io/#/people?page=1&sortAscending=false&sortByField=recommendations_score&personDepartmentOrSubdepartments[]=master_human_resources&personLocations[]=India&organizationNumEmployeesRanges[]=50%2C&contactEmailStatus[]=verified&personDaysInCurrentTitleRange[max]=90&recommendationConfigId=6acdb4b72dd2d30001a1bc91
```

### Corresponding Background API Request (`POST /api/v1/mixed_people/search`):
```json
{
  "api_search_context": "finder",
  "display_mode": "explorer_mode",
  "page": 1,
  "per_page": 25,
  "sort_ascending": false,
  "sort_by_field": "recommendations_score",
  "person_department_or_subdepartments": [
    "master_human_resources"
  ],
  "person_locations": [
    "India"
  ],
  "organization_num_employees_ranges": [
    "50,"
  ],
  "contact_email_status": [
    "verified"
  ],
  "person_days_in_current_title_range": {
    "max": 90
  },
  "recommendation_config_id": "6acdb4b72dd2d30001a1bc91"
}
```

---

## 6. Key Developer Takeaways & URL Rules

1. **Hash Routing:** Never strip the `#` tag. Standard query string parameters before the `#` are ignored by Apollo's router.
2. **URL Length Limits:** Browsers start truncating URLs past ~2,000 to 4,000 characters. If querying hundreds of excluded keywords, prefer sending POST requests directly to `/api/v1/mixed_people/search` rather than relying on massive URL hashes.
3. **Array Encoding:** Apollo accepts both unindexed `personTitles[]` and indexed `personTitles[0]`. Unindexed is preferred for readability.
4. **Instant Reactivity:** Writing to `window.location.hash` triggers Apollo's hashchange listener, automatically updating the UI components and refreshing data without requiring a full page reload.

---

## 7. Work URLs & Company Domain Targeting

When targeting specific companies by their website, work URLs, or domain names:

### A. URL Hash Encoding
- **Primary Parameter:** `organizationDomains[]` (also accepted as `qOrganizationDomains[]`).
- **Bulk Domain Lists:** When pasting 10 or 100 company websites, Apollo repeats the parameter for each domain.
- **Example URL:**
```text
https://app.apollo.io/#/people?organizationDomains[]=apple.com&organizationDomains[]=google.com&contactEmailStatus[]=verified
```

### B. Contact Work Email & Direct Presence Flags
To ensure contacts have verified business/work emails rather than personal or missing emails:
- `contactEmailStatus[]=verified` (Deliverable work email)
- `existFields[]=email` (Must possess an email address)
- `existFields[]=phone` (Must possess a direct or corporate phone)

---

## 8. Saved Contacts (`#/contacts`) & Saved Accounts (`#/accounts`) Specifications

While `#/people` and `#/companies` search the **entire global database**, `#/contacts` and `#/accounts` operate on **saved CRM records** (leads already added to your team workspace).

### A. Saved Contacts View (`#/contacts`)
- **Clean / Blank URL:**
  ```text
  https://app.apollo.io/#/contacts
  ```
- **Primary CRM Filter Parameters:**
  | Filter | URL Hash Parameter | Example / Values |
  |---|---|---|
  | **Contact Stage** | `contactStages[]` | `contactStages[]=lead&contactStages[]=customer` (`cold`, `approaching`, `replied`, `unresponsive`, `customer`) |
  | **Owner / Rep** | `ownerIds[]` | `ownerIds[]=6acdb49...` |
  | **Lists / Labels** | `labelIds[]` | `labelIds[]=65a0b1...` |
  | **Email Sequences** | `sequenceIds[]` | `sequenceIds[]=64a9e2...` |
  | **Email Status** | `contactEmailStatus[]` | `contactEmailStatus[]=verified` |
  | **Last Activity** | `lastActivityDate[min]`, `[max]` | `lastActivityDate[min]=2026-09-01` |

- **Sample Filtered URL:**
  ```text
  https://app.apollo.io/#/contacts?contactStages[]=customer&contactEmailStatus[]=verified
  ```

---

### B. Saved Accounts View (`#/accounts`)
- **Clean / Blank URL:**
  ```text
  https://app.apollo.io/#/accounts
  ```
- **Primary CRM Filter Parameters:**
  | Filter | URL Hash Parameter | Example / Values |
  |---|---|---|
  | **Account Stage** | `accountStages[]` | `accountStages[]=customer&accountStages[]=target` (`cold`, `approaching`, `client`, `lost`) |
  | **Account Owner** | `ownerIds[]` | `ownerIds[]=6acdb49...` |
  | **Account Lists** | `labelIds[]` | `labelIds[]=65b8c3...` |
  | **Annual Revenue** | `organizationRevenueRanges[]` | `organizationRevenueRanges[]=10000000%2C50000000` |
  | **Installed Tech** | `organizationTechnologyNames[]` | `organizationTechnologyNames[]=HubSpot` |
  | **Headcount** | `organizationNumEmployeesRanges[]` | `organizationNumEmployeesRanges[]=51%2C100` |
  | **Account Tier** | `accountTier[]` | `accountTier[]=tier_1` |

- **Sample Filtered URL:**
  ```text
  https://app.apollo.io/#/accounts?accountStages[]=customer&organizationNumEmployeesRanges[]=51%2C100
  ```

