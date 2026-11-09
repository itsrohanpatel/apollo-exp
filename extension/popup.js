/**
 * Apollo Lead Extractor - Popup Controller
 * Sleek, reactive launcher connecting popup UI with active Apollo tab & background DB.
 */

document.addEventListener('DOMContentLoaded', () => {
  const leadsCountEl = document.getElementById('leadsCount');
  const companiesCountEl = document.getElementById('companiesCount');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  const targetLeadsInput = document.getElementById('targetLeadsInput');
  const pillButtons = document.querySelectorAll('.pill-btn');

  const btnStartHarvest = document.getElementById('btnStartHarvest');
  const btnStopHarvest = document.getElementById('btnStopHarvest');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportCompanyCSV = document.getElementById('btnExportCompanyCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportCompanyJSON = document.getElementById('btnExportCompanyJSON');
  const btnExportPreflightPlan = document.getElementById('btnExportPreflightPlan');
  const btnExportHarvestAudit = document.getElementById('btnExportHarvestAudit');
  const btnClear = document.getElementById('btnClear');
  const previewContainer = document.getElementById('previewContainer');

  // 1. Pill Presets
  pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pillButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      targetLeadsInput.value = btn.dataset.value;
    });
  });

  // 2. Query Background Stats
  function updateStats() {
    chrome.runtime.sendMessage({ type: 'GET_BACKGROUND_STATS' }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp && typeof resp.totalInDB === 'number') {
        leadsCountEl.innerText = resp.totalInDB.toLocaleString();
        if (resp.totalInDB > 0) {
          previewContainer.innerHTML = `<div style="color: #38bdf8; font-weight: 600; font-size: 12px; padding: 6px 0;">✅ ${resp.totalInDB.toLocaleString()} unique leads stored in IndexedDB.</div>`;
        }
      }
    });

    // Check active tab harvest state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return;
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (resp) => {
          if (chrome.runtime.lastError) return;
          if (resp) {
            if (typeof resp.totalCompanies === 'number' && companiesCountEl) {
              companiesCountEl.innerText = resp.totalCompanies.toLocaleString();
            }
            if (resp.isHarvesting) {
              btnStartHarvest.style.display = 'none';
              btnStopHarvest.style.display = 'flex';
              statusText.innerText = 'Harvesting via Authentic UI...';
              statusIndicator.style.background = '#38bdf8';
            } else {
              btnStartHarvest.style.display = 'flex';
              btnStopHarvest.style.display = 'none';
              statusText.innerText = 'Engine Ready (UI Driven)';
              statusIndicator.style.background = '#10b981';
            }
          }
        });
      }
    });
  }

  // 3. Start Harvest
  btnStartHarvest.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return;
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url || !activeTab.url.includes('app.apollo.io')) {
        alert('Please open an active Apollo search tab first!');
        return;
      }

      const limit = parseInt(targetLeadsInput.value, 10) || 50000;
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'START_HARVEST',
        config: { targetLeadLimit: limit }
      }, (resp) => {
        if (chrome.runtime.lastError) return;
        btnStartHarvest.style.display = 'none';
        btnStopHarvest.style.display = 'flex';
        statusText.innerText = 'Harvest active in Mission Control HUD!';
      });
    });
  });

  // 4. Stop Harvest
  btnStopHarvest.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return;
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_HARVEST' }, () => {
          if (chrome.runtime.lastError) return;
          btnStartHarvest.style.display = 'flex';
          btnStopHarvest.style.display = 'none';
          statusText.innerText = 'Harvest stopped.';
        });
      }
    });
  });

  // 5. Export Handlers
  function sendTabMessage(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return;
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, msg, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    });
  }

  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_CSV' }));
  }
  if (btnExportCompanyCSV) {
    btnExportCompanyCSV.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_COMPANY_CSV' }));
  }
  if (btnExportJSON) {
    btnExportJSON.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_JSON' }));
  }
  if (btnExportCompanyJSON) {
    btnExportCompanyJSON.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_COMPANY_JSON' }));
  }
  if (btnExportPreflightPlan) {
    btnExportPreflightPlan.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_PREFLIGHT_PLAN_CSV' }));
  }
  if (btnExportHarvestAudit) {
    btnExportHarvestAudit.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_HARVEST_AUDIT_CSV' }));
  }

  // 6. Clear Data
  btnClear.addEventListener('click', () => {
    if (confirm('Clear all stored leads from extension database?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DB' }, (resp) => {
        if (chrome.runtime.lastError) return;
        updateStats();
        previewContainer.innerHTML = '<div class="empty-state">Database cleared. Ready for fresh harvest!</div>';
      });
    }
  });

  // Refresh stats periodically while popup is open
  updateStats();
  setInterval(updateStats, 2000);
});
