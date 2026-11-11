/**
 * Apollo Universal Harvester - Popup Controller
 * Modernized quick launcher with tab sync, preset pills, and segmented export trays.
 */

document.addEventListener('DOMContentLoaded', () => {
  const leadsCountEl = document.getElementById('leadsCount');
  const companiesCountEl = document.getElementById('companiesCount');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const tabStatusBadge = document.getElementById('tabStatusBadge');

  const targetLeadsInput = document.getElementById('targetLeadsInput');
  const pillButtons = document.querySelectorAll('.pill-btn');

  const btnStartHarvest = document.getElementById('btnStartHarvest');
  const btnStopHarvest = document.getElementById('btnStopHarvest');

  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportCompanyCSV = document.getElementById('btnExportCompanyCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportCompanyJSON = document.getElementById('btnExportCompanyJSON');
  const btnExportDiagnostics = document.getElementById('btnExportDiagnostics');
  const btnClear = document.getElementById('btnClear');
  const previewContainer = document.getElementById('previewContainer');

  const segBtnTurbo = document.getElementById('segBtnTurbo');
  const segBtnStandard = document.getElementById('segBtnStandard');
  let currentEngineMode = 'turbo';

  function setEngineModeUI(mode) {
    currentEngineMode = mode === 'standard' ? 'standard' : 'turbo';
    if (segBtnTurbo && segBtnStandard) {
      if (currentEngineMode === 'turbo') {
        segBtnTurbo.classList.add('active');
        segBtnStandard.classList.remove('active');
      } else {
        segBtnStandard.classList.add('active');
        segBtnTurbo.classList.remove('active');
      }
    }
  }

  // Restore saved engine mode
  chrome.storage.local.get(['apollo_engine_mode'], (res) => {
    if (res && res.apollo_engine_mode) {
      setEngineModeUI(res.apollo_engine_mode);
    }
  });

  function applyEngineMode(mode) {
    setEngineModeUI(mode);
    chrome.storage.local.set({ apollo_engine_mode: currentEngineMode });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0] || !tabs[0].id) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_ENGINE_MODE', mode: currentEngineMode }, () => {
        if (chrome.runtime.lastError) {}
      });
    });
  }

  if (segBtnTurbo) segBtnTurbo.addEventListener('click', () => applyEngineMode('turbo'));
  if (segBtnStandard) segBtnStandard.addEventListener('click', () => applyEngineMode('standard'));

  // 2. Preset Pills
  pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pillButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      targetLeadsInput.value = btn.dataset.value;
    });
  });

  // 3. Query Background Stats & Active Apollo Tab
  function updateStats() {
    chrome.runtime.sendMessage({ type: 'GET_BACKGROUND_STATS' }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp && typeof resp.totalInDB === 'number') {
        leadsCountEl.innerText = resp.totalInDB.toLocaleString();
        if (resp.totalInDB > 0) {
          previewContainer.innerHTML = `<div style="color: #38bdf8; font-weight: 600; font-size: 11px;">✅ ${resp.totalInDB.toLocaleString()} unique leads stored in IndexedDB.</div>`;
        }
      }
    });

    // Check active tab connection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return;
      const activeTab = tabs[0];
      const isApollo = activeTab && activeTab.url && activeTab.url.includes('app.apollo.io');

      if (!isApollo) {
        if (tabStatusBadge) {
          tabStatusBadge.innerText = 'NO APOLLO TAB';
          tabStatusBadge.className = 'badge-tag tag-offline';
        }
        if (statusText) statusText.innerText = 'Open Apollo search tab';
        if (statusIndicator) statusIndicator.style.background = '#64748b';
        return;
      }

      if (tabStatusBadge) {
        tabStatusBadge.innerText = 'SYNCED';
        tabStatusBadge.className = 'badge-tag tag-online';
      }

      chrome.tabs.sendMessage(activeTab.id, { type: 'GET_STATUS' }, (resp) => {
        if (chrome.runtime.lastError) {
          if (statusText) statusText.innerText = 'Engine Ready (In-Page)';
          if (statusIndicator) statusIndicator.style.background = '#10b981';
          return;
        }

        if (resp) {
          if (resp.engineMode) {
            setEngineModeUI(resp.engineMode);
          }
          if (typeof resp.totalCompanies === 'number' && companiesCountEl) {
            companiesCountEl.innerText = resp.totalCompanies.toLocaleString();
          }
          if (resp.isHarvesting) {
            btnStartHarvest.style.display = 'none';
            btnStopHarvest.style.display = 'flex';
            statusText.innerText = 'Harvesting in active tab...';
            statusIndicator.style.background = '#38bdf8';
          } else {
            btnStartHarvest.style.display = 'flex';
            btnStopHarvest.style.display = 'none';
            statusText.innerText = 'Engine Online & Synced';
            statusIndicator.style.background = '#10b981';
          }
        }
      });
    });
  }

  // 4. Start Harvest
  btnStartHarvest.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return;
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url || !activeTab.url.includes('app.apollo.io')) {
        alert('Please navigate to an active Apollo.io search tab first!');
        return;
      }

      const limit = parseInt(targetLeadsInput.value, 10) || 50000;
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'START_HARVEST',
        config: { targetLeadLimit: limit, engineMode: currentEngineMode }
      }, (resp) => {
        if (chrome.runtime.lastError) {
          alert('Could not communicate with the Apollo tab.\n\nPlease refresh the Apollo page (press F5 or Ctrl+R) to connect the updated extension, then click Start again!');
          return;
        }
        btnStartHarvest.style.display = 'none';
        btnStopHarvest.style.display = 'flex';
        statusText.innerText = 'Harvesting in Mission Control HUD!';
      });
    });
  });

  // 5. Stop Harvest
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

  // 6. Export Handlers
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

  if (btnExportCSV) btnExportCSV.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_CSV' }));
  if (btnExportCompanyCSV) btnExportCompanyCSV.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_COMPANY_CSV' }));
  if (btnExportJSON) btnExportJSON.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_JSON' }));
  if (btnExportCompanyJSON) btnExportCompanyJSON.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_COMPANY_JSON' }));
  if (btnExportDiagnostics) btnExportDiagnostics.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_DIAGNOSTICS' }));

  // 7. Clear Database
  btnClear.addEventListener('click', () => {
    if (confirm('Clear all stored leads from extension database?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DB' }, () => {
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
