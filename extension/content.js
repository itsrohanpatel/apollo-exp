/**
 * Apollo Lead Extractor - Content Script Bridge & On-Page HUD
 * Bridges injected.js and the background service worker, renders an on-page floating status widget,
 * and controls autonomous harvesting.
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

// 2. Create Floating HUD Widget
let hudElement = null;

function createFloatingHUD() {
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
    <div style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(99, 102, 241, 0.35);
      box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      border-radius: 14px;
      padding: 12px 18px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 14px;
      user-select: none;
      transition: all 0.25s ease;
      min-width: 280px;
    ">
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 12px #10b981;
        transition: background 0.3s ease, box-shadow 0.3s ease;
      " id="apollo-hud-indicator"></div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 8px;">
          <span>Apollo Extractor</span>
          <span style="font-size: 10px; background: rgba(99, 102, 241, 0.25); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(99, 102, 241, 0.35);">Universal Engine</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 3px; display: flex; justify-content: space-between;">
          <span><span id="apollo-hud-type-label">${isCompanies() ? 'Companies:' : 'Leads:'}</span> <strong id="apollo-hud-count" style="color: #38bdf8; font-size: 12px;">0</strong></span>
          <span id="apollo-hud-status" style="color: #cbd5e1; font-weight: 500;">Ready</span>
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button id="apollo-hud-stop-btn" style="
          display: none;
          background: #ef4444;
          border: none;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
        ">Stop</button>
        <button id="apollo-hud-quick-export" style="
          background: #4f46e5;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: background 0.15s ease;
        ">CSV</button>
      </div>
    </div>
  `;

  document.body.appendChild(hudElement);

  // Sync count & label immediately from storage
  chrome.storage.local.get(['leadsCount', 'companiesCount'], (res) => {
    syncHUDFromStorage(res);
  });

  document.getElementById('apollo-hud-quick-export')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'TRIGGER_EXPORT_CSV',
      entityType: isCompanies() ? 'companies' : 'people'
    });
  });

  document.getElementById('apollo-hud-stop-btn')?.addEventListener('click', () => {
    window.postMessage({ type: 'APOLLO_STOP_UNIVERSAL_HARVEST' }, '*');
    chrome.runtime.sendMessage({ action: 'STOP_UNIVERSAL_HARVEST' });
  });

  // Hashchange listener to switch label immediately when switching tabs
  window.addEventListener('hashchange', () => {
    chrome.storage.local.get(['leadsCount', 'companiesCount'], (res) => {
      syncHUDFromStorage(res);
    });
  });

  // Periodic route checker for SPA transitions without native hashchange
  setInterval(() => {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingHUD);
} else {
  createFloatingHUD();
}

// 3. Listen for Messages from injected.js (Webpage Context)
window.addEventListener('message', (event) => {
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
        if (countEl) countEl.innerText = response.totalCount;
      }
    });
  }

  // B. Harvest Progress updates
  if (event.data.type === 'APOLLO_HARVEST_PROGRESS') {
    const { harvestedCount, targetLeads, currentSlice, totalSlices, status } = event.data;
    const countEl = document.getElementById('apollo-hud-count');
    const statusEl = document.getElementById('apollo-hud-status');
    const indicator = document.getElementById('apollo-hud-indicator');
    const stopBtn = document.getElementById('apollo-hud-stop-btn');
    const typeLabelEl = document.getElementById('apollo-hud-type-label');

    const isComp = (window.location.hash || window.location.href).includes('/companies');
    if (typeLabelEl) typeLabelEl.innerText = isComp ? 'Companies:' : 'Leads:';
    if (countEl && harvestedCount !== undefined) countEl.innerText = harvestedCount;
    if (statusEl && status) statusEl.innerText = status;
    if (indicator) {
      if (event.data.cooldownRemaining) {
        indicator.style.background = '#38bdf8';
        indicator.style.boxShadow = '0 0 12px #38bdf8';
      } else {
        indicator.style.background = '#f59e0b';
        indicator.style.boxShadow = '0 0 12px #f59e0b';
      }
    }
    if (stopBtn) stopBtn.style.display = 'block';

    // Forward to background / popup
    chrome.runtime.sendMessage({
      action: 'HARVEST_PROGRESS',
      progress: event.data
    });
  }

  // C. Harvest Halted (Circuit breaker tripped)
  if (event.data.type === 'APOLLO_HARVEST_HALTED') {
    const indicator = document.getElementById('apollo-hud-indicator');
    const statusEl = document.getElementById('apollo-hud-status');
    const stopBtn = document.getElementById('apollo-hud-stop-btn');

    if (indicator) {
      indicator.style.background = '#ef4444';
      indicator.style.boxShadow = '0 0 12px #ef4444';
    }
    if (statusEl) statusEl.innerText = `Paused (${event.data.reason})`;
    if (stopBtn) stopBtn.style.display = 'none';

    chrome.runtime.sendMessage({
      action: 'HARVEST_HALTED',
      reason: event.data.reason
    });
  }

  // D. Harvest Finished
  if (event.data.type === 'APOLLO_HARVEST_FINISHED') {
    const indicator = document.getElementById('apollo-hud-indicator');
    const statusEl = document.getElementById('apollo-hud-status');
    const stopBtn = document.getElementById('apollo-hud-stop-btn');

    if (indicator) {
      indicator.style.background = '#10b981';
      indicator.style.boxShadow = '0 0 12px #10b981';
    }
    if (statusEl) statusEl.innerText = 'Complete';
    if (stopBtn) stopBtn.style.display = 'none';

    chrome.runtime.sendMessage({
      action: 'HARVEST_FINISHED',
      totalHarvested: event.data.totalHarvested
    });
  }
});

// 4. Update HUD count from Storage
function syncHUDFromStorage(data) {
  if (!data) return;
  const isComp = (window.location.hash || window.location.href).includes('/companies');
  const typeLabelEl = document.getElementById('apollo-hud-type-label');
  const countEl = document.getElementById('apollo-hud-count');
  const statusEl = document.getElementById('apollo-hud-status');
  if (typeLabelEl) typeLabelEl.innerText = isComp ? 'Companies:' : 'Leads:';
  if (countEl) {
    if (isComp && data.companiesCount !== undefined) {
      countEl.innerText = data.companiesCount;
    } else if (!isComp && data.leadsCount !== undefined) {
      countEl.innerText = data.leadsCount;
    }
  }
  if (statusEl && data.enrichmentStats && data.enrichmentStats.pending > 0) {
    statusEl.innerText = `Enriching ${data.enrichmentStats.pending}...`;
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
    window.postMessage({
      type: 'APOLLO_START_UNIVERSAL_HARVEST',
      config: request.config || {}
    }, '*');
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'STOP_UNIVERSAL_HARVEST') {
    window.postMessage({ type: 'APOLLO_STOP_UNIVERSAL_HARVEST' }, '*');
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
});
