/**
 * Apollo Lead Extractor - Content Script Bridge & Mission Control On-Page HUD
 * Bridges injected.js and the background service worker, renders an on-page draggable glassmorphism
 * floating HUD with real-time velocity, ETA, cabinet telemetry, data quality metrics, and direct controls.
 */

// 1. Inject injected.js into the webpage MAIN world
function injectSniffer() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}
injectSniffer();

// Dynamically load slicer_core pure math library if available
let slicerCore = null;
(async () => {
  try {
    slicerCore = await import(chrome.runtime.getURL('slicer_core.js'));
  } catch (e) {
    // Graceful fallback to inline mathematics
  }
})();

// Math fallbacks in case slicer_core import is pending
function fallbackVelocity(history, now = Date.now(), windowMs = 60000) {
  if (!Array.isArray(history) || history.length < 2) return 0;
  const cutoff = now - windowMs;
  const valid = history.filter(h => h && typeof h.ts === 'number' && h.ts >= cutoff);
  if (valid.length < 2) return 0;
  const oldest = valid[0];
  const newest = valid[valid.length - 1];
  const dtSec = (newest.ts - oldest.ts) / 1000;
  if (dtSec < 2) return 0;
  const dCount = Math.max(0, newest.count - oldest.count);
  return Math.round((dCount / dtSec) * 60);
}

function fallbackETA(current, target, rate) {
  if (current >= target) return 'Done';
  if (!rate || rate <= 0) return 'Estimating...';
  const remaining = Math.max(0, target - current);
  const totalMinutes = Math.ceil(remaining / rate);
  if (totalMinutes < 60) return `~${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

// 2. Create Floating HUD Widget
let hudElement = null;
let isHarvestRunning = false;
let harvestHistory = [];
let baseCountAtHarvestStart = 0;

function updateMonotonicCount(newCount) {
  const countEl = document.getElementById('apollo-hud-count');
  if (!countEl || newCount === undefined || newCount === null) return;
  const currentVal = parseInt((countEl.innerText || '0').replace(/,/g, ''), 10) || 0;
  const finalVal = Math.max(currentVal, Number(newCount));
  countEl.innerText = finalVal.toLocaleString();
}

function createFloatingHUD() {
  if (!chrome.runtime?.id) return;
  if (document.getElementById('apollo-scraper-hud')) return;
  if (!document.body) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createFloatingHUD);
    } else {
      setTimeout(createFloatingHUD, 50);
    }
    return;
  }

  const isCompanies = () => (window.location.hash || window.location.href).includes('/companies');

  hudElement = document.createElement('div');
  hudElement.id = 'apollo-scraper-hud';
  hudElement.innerHTML = `
    <div id="apollo-hud-container" style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(99, 102, 241, 0.35);
      box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 8px 12px -6px rgba(0, 0, 0, 0.5);
      border-radius: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      font-size: 13px;
      user-select: none;
      min-width: 320px;
      max-width: 420px;
      overflow: hidden;
      transition: box-shadow 0.25s ease, border-color 0.25s ease;
    ">
      <!-- Main Status Pill Header -->
      <div id="apollo-hud-header" style="
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: move;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      ">
        <span id="apollo-hud-drag-handle" style="color: #64748b; font-size: 14px; cursor: move;" title="Drag HUD">⠿</span>
        <div style="
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 12px #10b981;
          transition: background 0.3s ease, box-shadow 0.3s ease;
        " id="apollo-hud-indicator"></div>

        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 13px; color: #f1f5f9; letter-spacing: -0.2px;">Apollo Mission Control</strong>
            <span id="apollo-hud-status-badge" style="
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              background: rgba(16, 185, 129, 0.15);
              color: #34d399;
              padding: 1px 6px;
              border-radius: 4px;
              border: 1px solid rgba(16, 185, 129, 0.3);
            ">READY</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #94a3b8; margin-top: 3px;">
            <span><span id="apollo-hud-type-label">${isCompanies() ? 'Companies:' : 'Leads:'}</span> <strong id="apollo-hud-count" style="color: #38bdf8; font-size: 12px;">0</strong></span>
            <span id="apollo-hud-velocity-badge" style="color: #cbd5e1; font-weight: 600;">⚡ 0/min</span>
            <span id="apollo-hud-eta-badge" style="color: #a5b4fc; font-weight: 500;"></span>
          </div>
        </div>

        <!-- Pill Action Buttons -->
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="apollo-hud-start-btn" style="
            background: #10b981;
            border: none;
            color: white;
            padding: 5px 9px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: background 0.15s ease;
          " title="Start / Resume Universal Harvest">▶ Start</button>

          <button id="apollo-hud-reset-btn" style="
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #94a3b8;
            padding: 5px 7px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s ease;
          " title="Reset Checkpoint (Start from Cabinet 1)">↺</button>

          <button id="apollo-hud-stop-btn" style="
            display: none;
            background: #ef4444;
            border: none;
            color: white;
            padding: 5px 9px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s ease;
          " title="Stop Harvesting">⏹ Stop</button>

          <button id="apollo-hud-quick-export" style="
            background: #4f46e5;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: background 0.15s ease;
          " title="Export Current Leads to CSV">📥 CSV</button>

          <button id="apollo-hud-toggle-drawer" style="
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #cbd5e1;
            padding: 5px 8px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 600;
            transition: background 0.15s ease;
          " title="Expand / Collapse Telemetry Drawer">▼</button>
        </div>
      </div>

      <!-- Expandable Telemetry Drawer -->
      <div id="apollo-hud-drawer" style="
        display: none;
        padding: 14px 16px;
        background: rgba(10, 15, 30, 0.7);
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      ">
        <!-- Live Status Subheader -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Live Telemetry</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="apollo-hud-enrichment-chip" style="
              display: none;
              font-size: 10px;
              background: rgba(99, 102, 241, 0.2);
              color: #a5b4fc;
              padding: 2px 7px;
              border-radius: 4px;
              border: 1px solid rgba(99, 102, 241, 0.35);
              font-weight: 600;
            ">⚡ 0 orgs queued</span>
            <span id="apollo-hud-status-text" style="font-size: 11px; color: #94a3b8; font-weight: 500;">Ready</span>
          </div>
        </div>

        <!-- Cabinet Progress -->
        <div id="apollo-hud-cabinet-section" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span style="color: #cbd5e1;" id="apollo-hud-cabinet-label">Cabinet: [All Active Filters]</span>
            <span style="color: #38bdf8; font-weight: 600;" id="apollo-hud-cabinet-pct">0%</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 999px; overflow: hidden;">
            <div id="apollo-hud-cabinet-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4f46e5, #38bdf8); transition: width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Real-Time Data Quality Matrix -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Lead Quality & ICP Metrics</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 6px 8px; text-align: center;">
              <div style="font-size: 10px; color: #94a3b8;">📧 Verified</div>
              <div id="apollo-hud-quality-verified" style="font-size: 13px; font-weight: 700; color: #34d399; margin-top: 2px;">0%</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 6px 8px; text-align: center;">
              <div style="font-size: 10px; color: #94a3b8;">📞 Phones</div>
              <div id="apollo-hud-quality-phones" style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-top: 2px;">0%</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 6px 8px; text-align: center;">
              <div style="font-size: 10px; color: #94a3b8;">👔 Decision</div>
              <div id="apollo-hud-quality-dm" style="font-size: 13px; font-weight: 700; color: #f59e0b; margin-top: 2px;">0%</div>
            </div>
          </div>
        </div>

        <!-- Latency & Connection Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #64748b; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
          <span>Latency: <strong id="apollo-hud-latency" style="color: #94a3b8;">-- ms</strong></span>
          <span>Engine: <strong style="color: #a5b4fc;">Zero-Credit Drain</strong></span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(hudElement);

  const container = document.getElementById('apollo-hud-container');
  const header = document.getElementById('apollo-hud-header');
  const toggleBtn = document.getElementById('apollo-hud-toggle-drawer');
  const drawer = document.getElementById('apollo-hud-drawer');
  const startBtn = document.getElementById('apollo-hud-start-btn');
  const stopBtn = document.getElementById('apollo-hud-stop-btn');
  const exportBtn = document.getElementById('apollo-hud-quick-export');

  // Restore saved HUD position and drawer state
  chrome.storage.local.get(['apolloHudPosition', 'apolloHudDrawerOpen'], (res) => {
    if (res.apolloHudPosition && container) {
      const { top, left } = res.apolloHudPosition;
      if (typeof top === 'number' && typeof left === 'number') {
        container.style.bottom = 'auto';
        container.style.right = 'auto';
        container.style.top = `${Math.max(10, Math.min(window.innerHeight - 80, top))}px`;
        container.style.left = `${Math.max(10, Math.min(window.innerWidth - 340, left))}px`;
      }
    }
    if (res.apolloHudDrawerOpen && drawer && toggleBtn) {
      drawer.style.display = 'block';
      toggleBtn.innerText = '▲';
    }
  });

  // Drag functionality
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  header?.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    container.style.bottom = 'auto';
    container.style.right = 'auto';
    container.style.left = `${initialLeft}px`;
    container.style.top = `${initialTop}px`;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !container) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const newLeft = Math.max(10, Math.min(window.innerWidth - container.offsetWidth - 10, initialLeft + dx));
    const newTop = Math.max(10, Math.min(window.innerHeight - container.offsetHeight - 10, initialTop + dy));
    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging && container) {
      isDragging = false;
      const rect = container.getBoundingClientRect();
      chrome.storage.local.set({
        apolloHudPosition: { top: rect.top, left: rect.left }
      });
    }
  });

  // Drawer Toggle
  toggleBtn?.addEventListener('click', () => {
    if (!drawer) return;
    const isOpen = drawer.style.display !== 'none';
    drawer.style.display = isOpen ? 'none' : 'block';
    toggleBtn.innerText = isOpen ? '▼' : '▲';
    chrome.storage.local.set({ apolloHudDrawerOpen: !isOpen });
  });

  // Quick Export CSV
  exportBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'TRIGGER_EXPORT_CSV',
      entityType: isCompanies() ? 'companies' : 'people'
    });
  });

  // Direct Start button
  startBtn?.addEventListener('click', () => {
    const countEl = document.getElementById('apollo-hud-count');
    baseCountAtHarvestStart = parseInt((countEl?.innerText || '0').replace(/,/g, ''), 10) || 0;
    window.postMessage({
      type: 'APOLLO_START_UNIVERSAL_HARVEST',
      config: { targetLeads: 50000, method: 'infinite_drain' }
    }, window.location.origin);
    chrome.runtime.sendMessage({
      action: 'START_UNIVERSAL_HARVEST',
      config: { targetLeads: 50000, method: 'infinite_drain' }
    });
    setHarvestingVisualState(true);
  });

  // Reset Checkpoint button (Start fresh from Cabinet 1)
  const resetBtn = document.getElementById('apollo-hud-reset-btn');
  resetBtn?.addEventListener('click', () => {
    try {
      sessionStorage.removeItem('apollo_active_harvest_checkpoint');
      const startBtn = document.getElementById('apollo-hud-start-btn');
      if (startBtn) startBtn.innerText = '▶ Start';
      const statusTextEl = document.getElementById('apollo-hud-status-text');
      if (statusTextEl) statusTextEl.innerText = 'Checkpoint cleared (Starts from Cabinet 1)';
    } catch (e) {}
  });

  // Direct Stop button
  stopBtn?.addEventListener('click', () => {
    window.postMessage({ type: 'APOLLO_STOP_UNIVERSAL_HARVEST' }, window.location.origin);
    chrome.runtime.sendMessage({ action: 'STOP_UNIVERSAL_HARVEST' });
    setHarvestingVisualState(false);
  });

  // Sync count & label immediately from storage
  chrome.storage.local.get(['leadsCount', 'companiesCount'], (res) => {
    syncHUDFromStorage(res);
  });

  // Check if an active checkpoint is available to resume
  try {
    const rawCp = sessionStorage.getItem('apollo_active_harvest_checkpoint');
    if (rawCp) {
      const cp = JSON.parse(rawCp);
      if (cp && typeof cp.nextSliceIdx === 'number' && cp.nextSliceIdx > 0) {
        const startBtnEl = document.getElementById('apollo-hud-start-btn');
        if (startBtnEl) startBtnEl.innerText = `▶ Resume (${cp.nextSliceIdx + 1}/${cp.totalSlices || 70})`;
      }
    }
  } catch (e) {}

  // Hashchange listener to switch label immediately when switching tabs
  window.addEventListener('hashchange', () => {
    chrome.storage.local.get(['leadsCount', 'companiesCount'], (res) => {
      syncHUDFromStorage(res);
    });
  });

  // Periodic route checker for SPA transitions without native hashchange
  setInterval(() => {
    if (!chrome.runtime?.id) return;
    const comp = isCompanies();
    const typeLabelEl = document.getElementById('apollo-hud-type-label');
    const expected = comp ? 'Companies:' : 'Leads:';
    if (typeLabelEl && typeLabelEl.innerText !== expected) {
      typeLabelEl.innerText = expected;
      chrome.storage.local.get(['leadsCount', 'companiesCount'], (res) => {
        syncHUDFromStorage(res);
      });
    }
  }, 1000);
}

function setHarvestingVisualState(running, statusText = '') {
  isHarvestRunning = running;
  const startBtn = document.getElementById('apollo-hud-start-btn');
  const stopBtn = document.getElementById('apollo-hud-stop-btn');
  const indicator = document.getElementById('apollo-hud-indicator');
  const statusBadge = document.getElementById('apollo-hud-status-badge');
  const statusTextEl = document.getElementById('apollo-hud-status-text');

  if (startBtn) startBtn.style.display = running ? 'none' : 'flex';
  if (stopBtn) stopBtn.style.display = running ? 'block' : 'none';

  if (indicator) {
    indicator.style.background = running ? '#f59e0b' : '#10b981';
    indicator.style.boxShadow = running ? '0 0 12px #f59e0b' : '0 0 12px #10b981';
  }

  if (statusBadge) {
    statusBadge.innerText = running ? 'RUNNING' : 'READY';
    statusBadge.style.color = running ? '#fbbf24' : '#34d399';
    statusBadge.style.background = running ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    statusBadge.style.borderColor = running ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)';
  }

  if (statusTextEl && statusText) {
    statusTextEl.innerText = statusText;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingHUD);
} else {
  createFloatingHUD();
}
window.addEventListener('load', createFloatingHUD);
setInterval(() => {
  if (!chrome.runtime?.id) return;
  if (!document.getElementById('apollo-scraper-hud') && document.body) {
    createFloatingHUD();
  }
}, 1500);

// 3. Listen for Messages from injected.js (Webpage Context)
window.addEventListener('message', (event) => {
  if (!chrome.runtime?.id) return;
  if (event.origin !== 'https://app.apollo.io' && event.origin !== window.location.origin) return;
  if (event.source !== window || !event.data || typeof event.data !== 'object') {
    return;
  }

  // A. Ingest captured leads
  if (event.data.type === 'APOLLO_SCRAPER_DATA') {
    const { dataType, items, pagination } = event.data;
    chrome.runtime.sendMessage({
      action: 'INGEST_ITEMS',
      dataType: dataType,
      items: items,
      pagination: pagination
    }, (response) => {
      if (response && response.totalCount !== undefined) {
        const countEl = document.getElementById('apollo-hud-count');
        const typeLabelEl = document.getElementById('apollo-hud-type-label');
        const isComp = (window.location.hash || window.location.href).includes('/companies') || dataType === 'companies' || dataType === 'organizations';
        if (typeLabelEl) typeLabelEl.innerText = isComp ? 'Companies:' : 'Leads:';
        updateMonotonicCount(response.totalCount);
      }
    });
  }

  // B. Harvest Progress updates with rich telemetry
  if (event.data.type === 'APOLLO_HARVEST_PROGRESS') {
    const {
      harvestedCount = 0,
      targetLeads = 50000,
      currentSlice = 0,
      totalSlices = 0,
      sliceHarvested = 0,
      sliceTotal = null,
      sliceLabel = '',
      status = '',
      cooldownRemaining = null,
      latency = 0,
      harvestHistory: incomingHistory = [],
      qualitySummary = null
    } = event.data;

    setHarvestingVisualState(true, status);

    const countEl = document.getElementById('apollo-hud-count');
    const velocityEl = document.getElementById('apollo-hud-velocity-badge');
    const etaEl = document.getElementById('apollo-hud-eta-badge');
    const indicator = document.getElementById('apollo-hud-indicator');
    const statusBadge = document.getElementById('apollo-hud-status-badge');
    const statusTextEl = document.getElementById('apollo-hud-status-text');
    const latencyEl = document.getElementById('apollo-hud-latency');
    const cabinetLabelEl = document.getElementById('apollo-hud-cabinet-label');
    const cabinetPctEl = document.getElementById('apollo-hud-cabinet-pct');
    const cabinetBarEl = document.getElementById('apollo-hud-cabinet-bar');
    const verifiedEl = document.getElementById('apollo-hud-quality-verified');
    const phonesEl = document.getElementById('apollo-hud-quality-phones');
    const dmEl = document.getElementById('apollo-hud-quality-dm');

    updateMonotonicCount(baseCountAtHarvestStart + harvestedCount);
    if (statusTextEl && status) statusTextEl.innerText = status;
    if (latencyEl && latency) latencyEl.innerText = `${Math.round(latency)} ms`;

    // Calculate rolling velocity & ETA
    const hist = (Array.isArray(incomingHistory) && incomingHistory.length > 0)
      ? incomingHistory
      : harvestHistory;
    
    if (Array.isArray(incomingHistory) && incomingHistory.length > 0) {
      harvestHistory = incomingHistory;
    } else {
      harvestHistory.push({ count: harvestedCount, ts: Date.now() });
      if (harvestHistory.length > 60) harvestHistory.shift();
    }

    const velocity = slicerCore
      ? slicerCore.computeRollingVelocity(hist)
      : fallbackVelocity(hist);

    const etaStr = slicerCore
      ? slicerCore.calculateETA(harvestedCount, targetLeads, velocity)
      : fallbackETA(harvestedCount, targetLeads, velocity);

    if (velocityEl) {
      velocityEl.innerText = velocity > 0 ? `⚡ ${velocity}/min` : '⚡ Calculating...';
    }
    if (etaEl && targetLeads > 0) {
      etaEl.innerText = `⏱️ ${etaStr}`;
    }

    // Cooldown badge styling
    if (cooldownRemaining && indicator && statusBadge) {
      indicator.style.background = '#38bdf8';
      indicator.style.boxShadow = '0 0 12px #38bdf8';
      statusBadge.innerText = `COOLDOWN (${cooldownRemaining}s)`;
      statusBadge.style.color = '#38bdf8';
      statusBadge.style.background = 'rgba(56, 189, 248, 0.15)';
      statusBadge.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    }

    // Cabinet progress update
    if (sliceLabel && cabinetLabelEl) {
      const sliceIdxStr = totalSlices > 0 ? ` (${currentSlice}/${totalSlices})` : '';
      cabinetLabelEl.innerText = `Cabinet: [${sliceLabel}]${sliceIdxStr}`;
    }
    if (sliceTotal && sliceTotal > 0 && cabinetPctEl && cabinetBarEl) {
      const pct = Math.min(100, Math.round((sliceHarvested / sliceTotal) * 100));
      cabinetPctEl.innerText = `${pct}% (${sliceHarvested}/${sliceTotal})`;
      cabinetBarEl.style.width = `${pct}%`;
    }

    // Quality metrics update
    if (qualitySummary && qualitySummary.total > 0) {
      const vPct = Math.round((qualitySummary.verified / qualitySummary.total) * 100);
      const pPct = Math.round((qualitySummary.phones / qualitySummary.total) * 100);
      const dmPct = Math.round((qualitySummary.dm / qualitySummary.total) * 100);
      if (verifiedEl) verifiedEl.innerText = `${vPct}%`;
      if (phonesEl) phonesEl.innerText = `${pPct}%`;
      if (dmEl) dmEl.innerText = `${dmPct}%`;
    }

    // Forward to background / popup
    chrome.runtime.sendMessage({
      action: 'HARVEST_PROGRESS',
      progress: event.data
    });
  }

  // C. Harvest Halted (Circuit breaker tripped or 403)
  if (event.data.type === 'APOLLO_HARVEST_HALTED') {
    setHarvestingVisualState(false, `Paused (${event.data.reason || 'Circuit Breaker'})`);
    const indicator = document.getElementById('apollo-hud-indicator');
    const statusBadge = document.getElementById('apollo-hud-status-badge');

    if (indicator) {
      indicator.style.background = '#ef4444';
      indicator.style.boxShadow = '0 0 12px #ef4444';
    }
    if (statusBadge) {
      statusBadge.innerText = 'PAUSED';
      statusBadge.style.color = '#ef4444';
      statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
      statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }

    chrome.runtime.sendMessage({
      action: 'HARVEST_HALTED',
      reason: event.data.reason
    });
  }

  // D. Harvest Finished
  if (event.data.type === 'APOLLO_HARVEST_FINISHED') {
    setHarvestingVisualState(false, 'Complete');
    const countEl = document.getElementById('apollo-hud-count');
    const statusBadge = document.getElementById('apollo-hud-status-badge');
    const etaEl = document.getElementById('apollo-hud-eta-badge');

    if (statusBadge) {
      statusBadge.innerText = 'COMPLETE';
      statusBadge.style.color = '#34d399';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }
    if (etaEl) etaEl.innerText = '⏱️ Done';
    if (event.data.totalHarvested !== undefined) {
      updateMonotonicCount(baseCountAtHarvestStart + event.data.totalHarvested);
    }

    chrome.runtime.sendMessage({
      action: 'HARVEST_FINISHED',
      totalHarvested: event.data.totalHarvested
    });
  }
});

// 4. Update HUD count from Storage
function syncHUDFromStorage(data) {
  if (!chrome.runtime?.id || !data) return;
  const isComp = (window.location.hash || window.location.href).includes('/companies');
  const typeLabelEl = document.getElementById('apollo-hud-type-label');
  const countEl = document.getElementById('apollo-hud-count');
  const statusTextEl = document.getElementById('apollo-hud-status-text');

  if (typeLabelEl) typeLabelEl.innerText = isComp ? 'Companies:' : 'Leads:';
  if (countEl) {
    if (isComp && data.companiesCount !== undefined) {
      updateMonotonicCount(data.companiesCount);
    } else if (!isComp && data.leadsCount !== undefined) {
      updateMonotonicCount(data.leadsCount);
    }
  }
  const enrichmentChip = document.getElementById('apollo-hud-enrichment-chip');
  const pending = data.enrichmentStats?.pending || 0;

  if (enrichmentChip) {
    if (pending > 0) {
      enrichmentChip.style.display = 'inline-flex';
      enrichmentChip.innerText = isHarvestRunning
        ? `📦 ${pending} orgs queued`
        : `⚡ Enriching ${pending} orgs...`;
    } else {
      enrichmentChip.style.display = 'none';
    }
  }

  // CRITICAL: NEVER overwrite statusTextEl if harvesting is active!
  if (!isHarvestRunning && statusTextEl) {
    if (pending > 0) {
      statusTextEl.innerText = `Enriching ${pending} orgs in background...`;
    } else if (statusTextEl.innerText.startsWith('Enriching')) {
      statusTextEl.innerText = 'Ready';
    }
  }
}

chrome.storage.local.get(['leadsCount', 'companiesCount', 'enrichmentStats'], (res) => {
  syncHUDFromStorage(res);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    chrome.storage.local.get(['leadsCount', 'companiesCount', 'enrichmentStats'], (res) => {
      syncHUDFromStorage(res);
    });
  }
});

// 5. Chrome Runtime Message Listener (From Popup & Background)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_UNIVERSAL_HARVEST') {
    const countEl = document.getElementById('apollo-hud-count');
    baseCountAtHarvestStart = parseInt((countEl?.innerText || '0').replace(/,/g, ''), 10) || 0;
    window.postMessage({
      type: 'APOLLO_START_UNIVERSAL_HARVEST',
      config: request.config || {}
    }, window.location.origin);
    setHarvestingVisualState(true);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'STOP_UNIVERSAL_HARVEST') {
    window.postMessage({ type: 'APOLLO_STOP_UNIVERSAL_HARVEST' }, window.location.origin);
    setHarvestingVisualState(false);
    sendResponse({ success: true });
    return true;
  }

  // Standard Next-Page Auto-Clicker
  if (request.action === 'CLICK_NEXT_PAGE') {
    const selectors = [
      'button[aria-label="Next"]',
      'button[aria-label="next page"]',
      '.pagination-next-btn',
      'button:has(i[class*="arrow-right"])',
      'button:has(i[class*="chevron-right"])'
    ];

    let nextBtn = null;
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && !el.disabled && el.offsetParent !== null) {
          nextBtn = el;
          break;
        }
      } catch (e) {}
    }

    if (nextBtn) {
      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        nextBtn.click();
        sendResponse({ success: true });
      }, 700);
    } else {
      const allButtons = Array.from(document.querySelectorAll('button'));
      nextBtn = allButtons.find(b => {
        const text = b.innerText.trim().toLowerCase();
        return (text === 'next' || text === '>' || text === '→') && !b.disabled;
      });
      if (nextBtn) {
        nextBtn.click();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, reason: 'Next button not found' });
      }
    }
    return true;
  }

  // Reliable Blob ObjectURL CSV Downloader (Guarantees .csv extension in Windows)
  if (request.action === 'DOWNLOAD_CSV_CHUNKS') {
    try {
      const chunks = request.chunks || [];
      const filename = request.filename || `apollo_leads_${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 1500);
      sendResponse({ success: true });
    } catch (err) {
      console.error('[Apollo Content] CSV download error:', err);
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
});
