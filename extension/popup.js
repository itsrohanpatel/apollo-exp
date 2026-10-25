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
      if (resp && typeof resp.totalInDB === 'number') {
        leadsCountEl.innerText = resp.totalInDB.toLocaleString();
        if (resp.totalInDB > 0) {
          previewContainer.innerHTML = `<div style="color: #38bdf8; font-weight: 600; font-size: 12px; padding: 6px 0;">✅ ${resp.totalInDB.toLocaleString()} unique leads stored in IndexedDB.</div>`;
        }
      }
    });

    // Check active tab harvest state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (resp) => {
          if (resp && resp.isHarvesting) {
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
        });
      }
    });
  }

  // 3. Start Harvest
  btnStartHarvest.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
        btnStartHarvest.style.display = 'none';
        btnStopHarvest.style.display = 'flex';
        statusText.innerText = 'Harvest active in Mission Control HUD!';
      });
    });
  });

  // 4. Stop Harvest
  btnStopHarvest.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_HARVEST' }, () => {
          btnStartHarvest.style.display = 'flex';
          btnStopHarvest.style.display = 'none';
          statusText.innerText = 'Harvest stopped.';
        });
      }
    });
  });

  // 5. Export CSV
  btnExportCSV.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'EXPORT_CSV' });
      }
    });
  });

  // 6. Clear Data
  btnClear.addEventListener('click', () => {
    if (confirm('Clear all stored leads from extension database?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_DB' }, () => {
        updateStats();
        previewContainer.innerHTML = '<div class="empty-state">Database cleared. Ready for fresh harvest!</div>';
      });
    }
  });

  // Refresh stats periodically while popup is open
  updateStats();
  setInterval(updateStats, 2000);
});
