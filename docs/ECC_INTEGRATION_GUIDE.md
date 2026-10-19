# Everything Claude Code (ECC) Integration Guide for Apollo Scraper

This guide explains how to connect the data collected by your Apollo Scraper Chrome Extension into the **Everything Claude Code (ECC)** agent ecosystem—specifically leveraging the `lead-intelligence` and `data-scraper-agent` skills to score, enrich, and convert raw leads into automated outreach pipelines.

---

## 1. The End-to-End Pipeline

```
┌──────────────────────────┐
│  Apollo Chrome Extension │
│  (Extracts Leads at 0    │
│   export credit cost)    │
└────────────┬─────────────┘
             │ Exports CSV / JSON
             │ (or POST Webhook)
             ▼
┌──────────────────────────┐
│  data-scraper-agent      │
│  (ECC Free AI Pipeline)  │
│  • Deduplication         │
│  • Gemini Flash Batching │
│  • Storage: Notion/Sheet │
└────────────┬─────────────┘
             │ High-Score Leads
             ▼
┌──────────────────────────┐
│  lead-intelligence       │
│  (ECC Social & Outreach) │
│  • Warm Intro Discovery  │
│  • Voice Profiling       │
│  • Multi-Channel Drafts  │
└──────────────────────────┘
```

---

## 2. Ingesting Scraped Apollo Leads into `data-scraper-agent`

The `data-scraper-agent` pattern automates:
1. **Rule-based filtering:** Filter out leads that don't match strict criteria (e.g., student, intern, non-English speaking, irrelevant industry).
2. **AI Batch Scoring:** Scores leads (0–100) using Google Gemini Flash (Free Tier: 1,500 requests/day, 1M tokens/day) with batches of 5 leads per call.
3. **Database Sync:** Pushes approved leads to Notion, Google Sheets, or Supabase.

### Ingestion Script: `enrich_apollo_leads.py`
Place this script in your pipeline to process the Chrome extension's export:

```python
import json
import csv
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

def load_scraped_csv(filepath):
    leads = []
    with open(filepath, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads.append(row)
    return leads

def score_lead_batch(batch, target_ideal_profile):
    """
    Batches 5 leads into a single Gemini Flash call.
    Consumes minimal tokens and stays within free tier limits.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = f"""
You are an expert B2B sales development AI.
Analyze these {len(batch)} prospect profiles and evaluate their fit against the Ideal Customer Profile (ICP).

# Ideal Customer Profile (ICP)
{target_ideal_profile}

# Prospects
{json.dumps(batch, indent=2)}

# Output Requirements
Return a pure JSON object:
{{
  "evaluations": [
    {{
      "id": "<prospect_id>",
      "score": <0 to 100>,
      "fit_tier": "<Tier 1 (High) | Tier 2 (Medium) | Tier 3 (Low)>",
      "pain_point": "<1-sentence suspected pain point>",
      "outreach_hook": "<1-sentence personalized opening line referencing their tech or company>"
    }}
  ]
}}
"""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}
    }

    resp = requests.post(url, json=payload, timeout=30)
    if resp.status_code == 200:
        raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw_text).get("evaluations", [])
    else:
        print(f"Gemini API Error: {resp.status_code} - {resp.text}")
        return []

def run_enrichment(csv_path, output_path, icp_description):
    leads = load_scraped_csv(csv_path)
    print(f"Loaded {len(leads)} leads from {csv_path}")

    results = []
    batch_size = 5

    for i in range(0, len(leads), batch_size):
        batch = leads[i : i + batch_size]
        print(f"Scoring batch {i // batch_size + 1}/{(len(leads) + batch_size - 1) // batch_size}...")
        
        evaluations = score_lead_batch(batch, icp_description)
        eval_map = {e["id"]: e for e in evaluations if "id" in e}

        for lead in batch:
            eval_data = eval_map.get(lead["id"], {})
            enriched_lead = {**lead, **eval_data}
            results.append(enriched_lead)

        time.sleep(2.0) # Respect rate limits

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    print(f"Successfully saved enriched leads to {output_path}")

if __name__ == "__main__":
    # Example usage
    ICP = "B2B SaaS companies with 10-200 employees using AWS or React, targeting Founders, CTOs, and Heads of Engineering."
    run_enrichment("apollo_leads_export.csv", "apollo_leads_enriched.csv", ICP)
```

---

## 3. Feeding Enriched Leads into `lead-intelligence`

Once leads are scored $\ge 80$, the ECC `lead-intelligence` skill activates to execute the outreach sequence:

### Stage 1: Finding Missing Emails (Waterfall Enrichment)
If an Apollo lead has `email: ""` (unrevealed):
1. **Domain + Pattern Match:**
   Apollo provides `first_name`, `last_name`, and `company_domain`.
   Common patterns:
   - `{first}.{last}@{domain}` (e.g. `sarah.connor@cyberdyne.com`)
   - `{first}@{domain}` (e.g. `sarah@cyberdyne.com`)
   - `{f}{last}@{domain}` (e.g. `sconnor@cyberdyne.com`)
2. **External Fallback APIs:**
   You can query free tiers or credits on Hunter.io, Anymail Finder, Dropcontact, or Snov.io using the Apollo-extracted company domain.

### Stage 2: Warm Path Discovery
The `lead-intelligence` skill maps mutuals on LinkedIn and X:
- Direct Mutual: Check if you both follow common industry leaders.
- Portfolio overlap: Check if your investors or advisors overlap.
- Event overlap: Mention mutual industry conferences.

### Stage 3: Personalized Multi-Channel Outreach
Using `brand-voice` in ECC:
1. **Cold Email:** Short, value-first, referencing their current technologies (extracted by Apollo!) and team size.
2. **LinkedIn Connection:** Under 250 characters, personalized to their role and company stage.
3. **X DM:** High-signal builder outreach.
