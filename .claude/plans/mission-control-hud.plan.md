# Plan: Mission Control HUD & Live Intelligence Dashboard

**Objective**: Upgrade the floating on-page HUD into an interactive, high-fidelity **Mission Control Dashboard** that provides live scrape velocity (leads/min), dynamic ETA, real-time data quality metrics (% verified emails, phone capture rate), one-click in-page controls (`[▶ Start]`, `[⏹ Stop]`, `[📥 CSV]`), and an expandable dark glassmorphism drawer without interfering with Apollo UI.

**Architecture**: Pure Model-View-Controller telemetry architecture in `slicer_core.js` (pure calculation engine for velocity, ETA, and quality metrics) + DOM Renderer & Draggable Floating Widget in `content.js` + Test-Driven Development via `tests/hud_mission_control.test.mjs`.

---

## 1. Architectural Components & Features

### A. Real-Time Telemetry & Performance
1. **Rolling Velocity Tracker (`computeRollingVelocity`):**
   - Sliding window calculation over the last 60 seconds (or last 3 batches) to output accurate leads per minute (`⚡ 22 leads/min`).
2. **Dynamic ETA Predictor (`calculateETA`):**
   - Accurately projects remaining time to target (`⏱️ ETA: ~11 mins`), displaying `Calculating...` during the initial warmup window.
3. **Cabinet Micro-Progress Track:**
   - Displays real-time progress within the active cabinet: `[51,60] 38/54 (70%)`.

### B. Live Data Quality & ICP Intelligence
1. **Email Verification Ratio:**
   - Tracks incoming leads in real-time to display the percentage of verified emails: `📧 Verified: 84%`.
2. **Phone Number Capture Rate:**
   - Real-time percentage of contacts with phone numbers: `📞 Phones: 41%`.
3. **Decision Maker / C-Suite Ratio:**
   - Percentage of senior executives (Founder, C-Suite, VP, Director).

### C. Mission Control UX & Controls
1. **Direct In-Page Controls:**
   - **`[▶ Start]` Button:** Trigger the harvest directly on the Apollo page without needing to open the Chrome toolbar extension popup.
   - **`[⏹ Stop]` Button:** Instantly halts execution within 200ms.
   - **`[📥 CSV]` Quick Export:** Client-side 1-click export of current database contents.
2. **2-State Layout (Compact Pill vs. Expanded Drawer):**
   - **Compact Pill (Default):** Floating in bottom-right corner; shows indicator dot, lead count, velocity, and action buttons.
   - **Expanded Drawer (1 Click):** Slides open to show quality breakdown, active cabinet table, server latency meter, and ICP distribution.
3. **Draggable & Dockable Position:**
   - Users can drag the HUD to any corner of their screen so it never covers pagination or Apollo filters. Remembers position in `chrome.storage.local`.

---

## 2. Test-Driven Development (TDD) Plan

We will write `tests/hud_mission_control.test.mjs` first:
1. **Test `computeRollingVelocity`:**
   - Verifies correct calculations across varying timestamp intervals.
   - Verifies handling of 0 elapsed time and initial warmup gracefully.
2. **Test `calculateETA`:**
   - Verifies human-readable formatting (`< 1m`, `8m`, `1h 14m`).
   - Verifies handling when target is already reached or velocity is 0.
3. **Test `computeDataQualityMetrics`:**
   - Verifies verified email percentage calculation against raw Apollo items.
   - Verifies phone number detection (direct phone, mobile, sanitized strings).
   - Verifies executive seniority filtering (`c_suite`, `founder`, `vp`, `director`).
4. **Test `formatMissionControlState`:**
   - Verifies full state formatting for both Compact and Expanded modes.

---

## 3. Files to Create & Modify

| File | Action | Purpose |
| :--- | :--- | :--- |
| `tests/hud_mission_control.test.mjs` | **CREATE** | Full TDD unit test suite for velocity, ETA, data quality, and state formatting. |
| `extension/slicer_core.js` | **MODIFY** | Export pure telemetry functions: `computeRollingVelocity`, `calculateETA`, `computeDataQualityMetrics`, and `formatMissionControlState`. |
| `extension/content.js` | **MODIFY** | Upgrade DOM structure to 2-state glassmorphism widget (Compact + Drawer), add drag handler, wire direct `[▶ Start]` button, and live quality badges. |
| `extension/injected.js` | **MODIFY** | Stream raw item quality metadata and velocity timestamps in `APOLLO_HARVEST_PROGRESS`. |

---

## 4. Phase-by-Phase Execution

- **Phase 1 (RED):** Write failing test cases in `tests/hud_mission_control.test.mjs` defining exact contracts for velocity, ETA, and quality metrics.
- **Phase 2 (GREEN):** Implement mathematical logic in `extension/slicer_core.js` until all unit tests pass with 100% coverage.
- **Phase 3 (UI Implementation):** Implement the interactive floating widget in `extension/content.js` with sleek modern CSS, dragging, expandable drawer, and direct control buttons.
- **Phase 4 (Live Verification):** Reload extension in Chrome via CDP, run verification script on live Apollo tab, and confirm 0 errors on `chrome://extensions`.
