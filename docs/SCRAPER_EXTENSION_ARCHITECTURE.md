# Apollo.io Scraper Chrome Extension Architecture (Manifest V3)

This document specifies the technical architecture, data flows, and engineering design for building a production-grade, anti-detection Apollo.io Scraper Chrome Extension under Google Chrome's **Manifest V3 (MV3)** specifications.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER WINDOW (app.apollo.io)                  │
│                                                                             │
│  ┌────────────────────────┐                    ┌─────────────────────────┐  │
│  │   MAIN WORLD           │                    │   ISOLATED WORLD        │  │
│  │   (injected.js)        │                    │   (content.js)          │  │
│  │                        │                    │                         │  │
│  │  • Intercepts fetch()  │ window.postMessage │  • Receives raw lead    │  │
│  │    & XMLHttpRequest    │───────────────────>│    payloads             │  │
│  │  • Reads Apollo state  │                    │  • Interacts with DOM   │  │
│  │  • Sniffs API response │                    │  • Handles UI clicks    │  │
│  │    for mixed_people    │                    │  • Injects overlay HUD  │  │
│  └────────────────────────┘                    └────────────┬────────────┘  │
└─────────────────────────────────────────────────────────────┼───────────────┘
                                                              │
                                            chrome.runtime    │
                                            sendMessage       │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXTENSION BACKGROUND & STORAGE                        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  SERVICE WORKER (background.js)                                       │  │
│  │                                                                       │  │
│  │  • Aggregates leads across all navigated pages                        │  │
│  │  • Deduplicates records by Apollo ID / LinkedIn URL                   │  │
│  │  • Manages session state (scraping active, page count, delays)        │  │
│  │  • Persists to chrome.storage.local / IndexedDB                       │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                        Direct State   │ Port / Runtime
                        Sync           │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USER INTERFACE (UI)                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  POPUP / SIDE PANEL (popup.html + popup.js)                           │  │
│  │                                                                       │  │
│  │  • Start / Pause / Stop scraping controls                             │  │
│  │  • Real-time lead counter & live preview table                        │  │
│  │  • Delay & page limit configuration (Human Jitter: 6–12s)             │  │
│  │  • One-click export to CSV / JSON / Webhook                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Methodologies: Network Interception vs. DOM Scraping

| Dimension | DOM Scraping (Old Way) | Network Sniffing (Our Way) |
|---|---|---|
| **Resilience** | ⚠️ Fragile: Breaks on CSS/obfuscated class changes | ✅ Rock Solid: Binds directly to the API data contract |
| **Data Completeness** | ⚠️ Partial: Only captures what is rendered in HTML | ✅ Complete: Extracts hidden fields (revenue, tech stack, phone IDs, LinkedIn URLs) |
| **Performance** | ⚠️ Heavy: Repetitive DOM traversals and reflows | ✅ Instant: Pure in-memory JSON parsing (<1ms) |
| **Detection Risk** | ⚠️ Medium: Injected mutations can trigger detectors | ✅ Invisible: Read-only passive tapping of existing browser traffic |

### How Network Interception Works in Manifest V3
In Manifest V3, content scripts run in an `ISOLATED` world and cannot directly patch the webpage's native `window.fetch`. 
**The Solution:** Inject a lightweight script (`injected.js`) into the webpage’s `MAIN` execution world. This script wraps `window.fetch` and `XMLHttpRequest`, filters for calls containing `mixed_people/search` or `mixed_people/api_search`, extracts the payload, and dispatches a standard `window.postMessage` to `content.js`.

---

## 3. Manifest V3 File Blueprint

### `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Apollo Lead Scraper Pro",
  "version": "1.0.0",
  "description": "High-speed, zero-credit lead scraper and exporter for Apollo.io",
  "permissions": [
    "storage",
    "activeTab",
    "downloads"
  ],
  "host_permissions": [
    "https://app.apollo.io/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://app.apollo.io/*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["injected.js"],
      "matches": ["https://app.apollo.io/*"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

---

## 4. Injected Network Sniffer (`injected.js`)

This file runs in the `MAIN` world of `app.apollo.io`:

```javascript
(function () {
  const TARGET_ENDPOINTS = [
    '/api/v1/mixed_people/search',
    '/api/v1/mixed_people/api_search',
    '/api/v1/contacts/search',
    '/api/v1/people/match'
  ];

  // 1. Monkey-patch window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

    const isMatch = TARGET_ENDPOINTS.some(endpoint => url.includes(endpoint));
    if (isMatch) {
      try {
        const clone = response.clone();
        clone.json().then(data => {
          window.postMessage({
            type: 'APOLLO_SCRAPER_RAW_DATA',
            url: url,
            payload: data
          }, '*');
        }).catch(() => {});
      } catch (err) {
        console.error('[Apollo Scraper] Error reading response clone:', err);
      }
    }
    return response;
  };

  // 2. Monkey-patch XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      if (this._url && TARGET_ENDPOINTS.some(endpoint => this._url.includes(endpoint))) {
        try {
          const data = JSON.parse(this.responseText);
          window.postMessage({
            type: 'APOLLO_SCRAPER_RAW_DATA',
            url: this._url,
            payload: data
          }, '*');
        } catch (e) {}
      }
    });
    return originalSend.apply(this, args);
  };
})();
```

---

## 5. Content Script Bridge & Automation (`content.js`)

```javascript
// Inject injected.js into the page's MAIN world
function injectScript(filePath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filePath);
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}
injectScript('injected.js');

// Listen for messages from injected.js
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.type !== 'APOLLO_SCRAPER_RAW_DATA') {
    return;
  }

  const { payload } = event.data;
  const records = payload.people || payload.contacts || [];

  if (records.length > 0) {
    chrome.runtime.sendMessage({
      action: 'NEW_LEADS_CAPTURED',
      leads: records,
      pagination: payload.pagination
    });
  }
});

// Auto-pagination trigger: safely click Apollo's Next Page button
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_NEXT_PAGE') {
    const nextBtn = document.querySelector('button[aria-label="Next"], button:has(i.fa-arrow-right), .pagination-next-btn');
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        nextBtn.click();
        sendResponse({ success: true });
      }, 500);
    } else {
      sendResponse({ success: false, reason: 'Next button disabled or not found' });
    }
    return true;
  }
});
```

---

## 6. Background Service Worker (`background.js`)

Manages the persistent list of scraped leads, deduplication, and auto-pagination sequence:

```javascript
let state = {
  isScraping: false,
  currentPage: 1,
  maxPages: 10,
  minDelay: 6000,
  maxDelay: 10000,
  leads: new Map() // Keyed by lead ID for instant deduplication
};

// Listen for leads from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'NEW_LEADS_CAPTURED') {
    const incoming = message.leads || [];
    let newCount = 0;

    incoming.forEach(lead => {
      const normalized = normalizeLead(lead);
      if (normalized.id && !state.leads.has(normalized.id)) {
        state.leads.set(normalized.id, normalized);
        newCount++;
      }
    });

    // Save to storage
    chrome.storage.local.set({
      leadCount: state.leads.size,
      scrapedLeads: Array.from(state.leads.values())
    });

    // If auto-scraping is active, trigger next page after randomized delay
    if (state.isScraping && state.currentPage < state.maxPages) {
      state.currentPage++;
      const randomDelay = Math.floor(Math.random() * (state.maxDelay - state.minDelay + 1)) + state.minDelay;
      
      setTimeout(() => {
        if (state.isScraping && sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, { action: 'TRIGGER_NEXT_PAGE' });
        }
      }, randomDelay);
    } else if (state.isScraping && state.currentPage >= state.maxPages) {
      state.isScraping = false;
      chrome.storage.local.set({ isScraping: false });
    }
  }
});

function normalizeLead(lead) {
  return {
    id: lead.id,
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    full_name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    title: lead.title || '',
    seniority: lead.seniority || '',
    headline: lead.headline || '',
    email: lead.email || '',
    email_status: lead.email_status || (lead.email ? 'available' : 'unrevealed'),
    phone: lead.organization?.phone || lead.phone_numbers?.[0]?.raw_number || '',
    linkedin_url: lead.linkedin_url || '',
    twitter_url: lead.twitter_url || '',
    city: lead.city || '',
    state: lead.state || '',
    country: lead.country || '',
    company_name: lead.organization?.name || '',
    company_domain: lead.organization?.primary_domain || lead.organization?.website_url || '',
    company_linkedin: lead.organization?.linkedin_url || '',
    company_employees: lead.organization?.estimated_num_employees || '',
    company_revenue: lead.organization?.annual_revenue_printed || lead.organization?.annual_revenue || '',
    industry: lead.organization?.industry || '',
    technologies: (lead.organization?.technologies || []).join('; ')
  };
}
```

---

## 7. CSV Conversion & Local Export Engine

Generating a valid CSV client-side with proper RFC 4180 escaping:

```javascript
function convertToCSV(items) {
  if (!items || items.length === 0) return '';
  
  const headers = Object.keys(items[0]);
  const rows = items.map(item => {
    return headers.map(header => {
      let val = item[header] === null || item[header] === undefined ? '' : String(item[header]);
      // Escape quotes and wrap in quotes if containing comma, newline, or quote
      if (val.includes('"') || val.includes(',') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

function triggerDownload(csvContent, filename = 'apollo_leads_export.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```
