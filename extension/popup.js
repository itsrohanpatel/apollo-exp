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

  const tabBtnLeads = document.getElementById('tabBtnLeads');
  const tabBtnAudits = document.getElementById('tabBtnAudits');
  const tabPaneLeads = document.getElementById('tabPaneLeads');
  const tabPaneAudits = document.getElementById('tabPaneAudits');

  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportCompanyCSV = document.getElementById('btnExportCompanyCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportCompanyJSON = document.getElementById('btnExportCompanyJSON');
  const btnExportPreflightPlan = document.getElementById('btnExportPreflightPlan');
  const btnExportHarvestAudit = document.getElementById('btnExportHarvestAudit');
  const btnClear = document.getElementById('btnClear');
  const previewContainer = document.getElementById('previewContainer');

  // 1. Segmented Export Tabs
  if (tabBtnLeads && tabBtnAudits) {
    tabBtnLeads.addEventListener('click', () => {
      tabBtnLeads.classList.add('active');
      tabBtnAudits.classList.remove('active');
      tabPaneLeads.style.display = 'flex';
      tabPaneAudits.style.display = 'none';
    });

    tabBtnAudits.addEventListener('click', () => {
      tabBtnAudits.classList.add('active');
      tabBtnLeads.classList.remove('active');
      tabPaneLeads.style.display = 'none';
      tabPaneAudits.style.display = 'flex';
    });
  }

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
        config: { targetLeadLimit: limit }
      }, () => {
        if (chrome.runtime.lastError) return;
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
  if (btnExportPreflightPlan) btnExportPreflightPlan.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_PREFLIGHT_PLAN_CSV' }));
  if (btnExportHarvestAudit) btnExportHarvestAudit.addEventListener('click', () => sendTabMessage({ type: 'EXPORT_HARVEST_AUDIT_CSV' }));

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
