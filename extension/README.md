# Apollo Universal Lead Harvester (Chrome Extension)

Production-grade, authentic UI-driven Apollo.io lead extractor with adaptive micro-slicing, dynamic runtime bisection, and 29-column CSV export.

---

## 🚀 How to Install (Takes 30 Seconds)

1. Open your browser (**Google Chrome**, **Brave**, **Microsoft Edge**, or any Chromium browser).
2. Navigate to:
   ```text
   chrome://extensions/
   ```
3. Toggle on **Developer mode** in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select this `extension` folder.
6. The extension is now installed and active!

---

## 🎯 How to Use

1. Go to Apollo People Search:
   ```text
   https://app.apollo.io/#/people
   ```
2. Apply your desired search filters (e.g., Location, Department, Headcount, Email Status, etc.).
3. The **Mission Control** floating overlay will automatically appear in the bottom-right corner of Apollo.
4. Click **"🚀 Start AI Harvest"** to begin harvesting.
   - *Optional:* You can also click the extension icon in Chrome's toolbar to set a custom target limit (e.g. 5,000, 10,000, 50,000 leads).
5. Sit back and watch the live telemetry:
   - **Unique Leads:** Real-time count of unique deduplicated leads captured.
   - **Current Slice:** Current micro-cabinet headcount bracket and progress.
   - **Harvest Speed:** Live leads per minute throughput.
   - **Pacing Status:** Humanized randomized jitter delays to ensure account safety.
6. When finished (or upon clicking **"⬇ Stop & Export"**), your clean, deduplicated **29-column CSV** file will automatically download to your computer.

---

## 🧠 Core Features

- **Dynamic Runtime Cabinet Reduction:** Automatically detects if any headcount bracket exceeds Apollo's 250-lead pagination limit and bisects it into smaller sub-cabinets (e.g. `151,200` $\to$ `151,175` + `176,200`) so 100% of leads are reachable.
- **Strict Filter Preservation:** 100% preserves all user-selected search filters (Locations, Departments, Keywords, Email Status, Seniority).
- **Dual-Sort Capacity Boost:** Automatically executes Pass 1 (Company A-Z) and Pass 2 (Company Z-A) to bypass Apollo's 5-page ceiling and double harvest capacity per slice.
- **Zero Job Title Partitioning:** Never alters or slices by job titles, maintaining pure search fidelity.
- **29-Column Flat Schema:** Normalizes contact, company, phone, location, LinkedIn, revenue, and funding data into zero-nesting CSV ready for CRM import.
- **Zero External Dependencies:** 100% self-contained pure JavaScript MV3 extension. No Node.js, build step, or external servers required.

---

## 📁 Extension Folder Structure

```text
extension/
├── manifest.json       # Chrome Extension MV3 manifest
├── background.js       # Background service worker & IndexedDB persistence
├── content.js          # In-page orchestration & runtime bisection engine
├── injected.js         # Stealth main-world interceptor & router dispatcher
├── slicer_core.js      # Headcount bisection, pacing & normalization library
├── hud.js              # Floating Mission Control overlay component
├── hud.css             # Mission Control dark glassmorphic styling
├── popup.html          # Extension toolbar popup dashboard
├── popup.js            # Popup controller & database stats monitor
├── popup.css           # Popup styling
├── icons/              # Extension icons (16px, 48px, 128px)
└── README.md           # This guide
```
