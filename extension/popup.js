document.addEventListener('DOMContentLoaded', () => {
  const leadsCountEl = document.getElementById('leadsCount');
  const companiesCountEl = document.getElementById('companiesCount');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  const progressSection = document.getElementById('progressSection');
  const progressSliceLabel = document.getElementById('progressSliceLabel');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressSubtext = document.getElementById('progressSubtext');

  const targetLeadsInput = document.getElementById('targetLeadsInput');
  const strategySelect = document.getElementById('strategySelect');
  const pillButtons = document.querySelectorAll('.pill-btn');
  const deepEnrichmentToggle = document.getElementById('deepEnrichmentToggle');
  const enrichmentStatusRow = document.getElementById('enrichmentStatusRow');
  const enrichmentPendingCount = document.getElementById('enrichmentPendingCount');
  const enrichmentEnrichedCount = document.getElementById('enrichmentEnrichedCount');

  const btnStartHarvest = document.getElementById('btnStartHarvest');
  const btnStopHarvest = document.getElementById('btnStopHarvest');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportCompanyCSV = document.getElementById('btnExportCompanyCSV');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportCompanyJSON = document.getElementById('btnExportCompanyJSON');
  const btnClear = document.getElementById('btnClear');
  const previewContainer = document.getElementById('previewContainer');

  if (deepEnrichmentToggle) {
    deepEnrichmentToggle.addEventListener('change', () => {
      chrome.runtime.sendMessage({
        action: 'TOGGLE_DEEP_ENRICHMENT',
        enabled: deepEnrichmentToggle.checked
      });
    });
  }

  function renderState() {
    chrome.storage.local.get([
      'leadsCount',
      'companiesCount',
      'isHarvesting',
      'harvestProgress',
      'circuitBreaker',
      'previewLeads',
      'previewCompanies',
      'deepEnrichmentEnabled',
      'enrichmentStats'
    ], (data) => {
      if (!data) data = {};
      const leadsCount = data.leadsCount || 0;
      const companiesCount = data.companiesCount || 0;
      const previewLeads = data.previewLeads || [];
      const previewCompanies = data.previewCompanies || [];
      leadsCountEl.innerText = leadsCount.toLocaleString();
      companiesCountEl.innerText = companiesCount.toLocaleString();

      if (deepEnrichmentToggle) {
        deepEnrichmentToggle.checked = data.deepEnrichmentEnabled !== false;
      }
      const enrichStats = data.enrichmentStats || {};
      if (enrichmentStatusRow) {
        if (enrichStats.pending > 0 || enrichStats.enriched > 0) {
          enrichmentStatusRow.style.display = 'block';
          if (enrichmentPendingCount) enrichmentPendingCount.innerText = enrichStats.pending || 0;
          if (enrichmentEnrichedCount) enrichmentEnrichedCount.innerText = enrichStats.enriched || 0;
        } else {
          enrichmentStatusRow.style.display = 'none';
        }
      }

      const isHarvesting = !!data.isHarvesting;
      const progress = data.harvestProgress || {};
      const cb = data.circuitBreaker || {};

      if (isHarvesting) {
        statusIndicator.classList.add('active');
        statusText.innerText = progress.status || 'Harvesting...';
        btnStartHarvest.style.display = 'none';
        btnStopHarvest.style.display = 'inline-flex';
        progressSection.style.display = 'flex';

        // Calculate progress percentage
        const currentCount = progress.entityType === 'companies' ? companiesCount : leadsCount;
        const target = progress.targetLeads || parseInt(targetLeadsInput.value, 10) || 50000;
        const pct = target >= 50000 ? Math.min(100, Math.round((currentCount / (progress.totalSlices ? progress.totalSlices * 100 : 1000)) * 100)) : Math.min(100, Math.round((currentCount / target) * 100));

        progressPercent.innerText = target >= 50000 ? `${currentCount} Items` : `${pct}%`;
        progressBarFill.style.width = `${Math.min(100, pct)}%`;

        if (progress.totalSlices > 0) {
          progressSliceLabel.innerText = `Slice ${progress.currentSlice || 1} of ${progress.totalSlices}`;
        } else {
          progressSliceLabel.innerText = `${currentCount} / ${target >= 50000 ? 'ALL' : target} Items`;
        }
        progressSubtext.innerText = progress.status || 'Pacing: 2.0s–3.8s jitter + 40s cooldowns';

      } else {
        statusIndicator.classList.remove('active');
        btnStartHarvest.style.display = 'inline-flex';
        btnStopHarvest.style.display = 'none';

        if (cb.tripped) {
          statusIndicator.style.background = '#ef4444';
          statusIndicator.style.boxShadow = '0 0 10px #ef4444';
          statusText.innerText = `Halted: ${cb.reason}`;
        } else {
          statusIndicator.style.background = '#10b981';
          statusIndicator.style.boxShadow = '0 0 10px #10b981';
          statusText.innerText = 'Anti-Ban Engine Ready';
          progressSection.style.display = 'none';
        }
      }

      // Render Preview (isolated 5-item preview avoids holding multi-megabyte lead dumps in memory)
      if (companiesCount > leadsCount && previewCompanies.length > 0) {
        previewContainer.innerHTML = previewCompanies.map(c => `
          <div class="preview-row">
            <div class="preview-name">${escapeHTML(c.company_name || 'Unnamed Company')}</div>
            <div class="preview-details">
              ${c.domain ? escapeHTML(c.domain) + ' • ' : ''}
              ${c.industry ? escapeHTML(c.industry) + ' • ' : ''}
              ${c.employees ? escapeHTML(c.employees) + ' emp' : ''}
              ${c.revenue ? ' • <span style="color:#10b981;">' + escapeHTML(c.revenue) + '</span>' : ''}
            </div>
          </div>
        `).join('');
      } else if (previewLeads.length > 0) {
        previewContainer.innerHTML = previewLeads.map(lead => {
          const tierColor = lead.icp_tier === 'Tier 1' ? '#4f46e5' : (lead.icp_tier === 'Tier 2' ? '#0284c7' : '#64748b');
          const tierBadge = lead.icp_score !== undefined
            ? `<span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:999px; background:${tierColor}; color:#fff; margin-left:6px;">${escapeHTML(lead.icp_tier || 'Score')}: ${lead.icp_score}</span>`
            : '';
          return `
            <div class="preview-row">
              <div class="preview-name" style="display:flex; align-items:center; justify-content:space-between;">
                <span>${escapeHTML(lead.full_name || 'Unnamed Lead')}</span>
                ${tierBadge}
              </div>
              <div class="preview-details">
                ${lead.title ? escapeHTML(lead.title) + ' • ' : ''}
                ${escapeHTML(lead.company_name || 'No Company')}
                ${lead.email ? ' • <span style="color:#10b981;">' + escapeHTML(lead.email) + '</span>' : ''}
                ${lead.company_technologies ? ' • <span style="color:#a855f7;">' + escapeHTML(lead.company_technologies.split('; ').slice(0, 2).join(', ')) + '</span>' : ''}
                ${lead.company_funding ? ' • <span style="color:#f59e0b;">' + escapeHTML(lead.company_funding) + '</span>' : ''}
              </div>
            </div>
          `;
        }).join('');
      } else {
        previewContainer.innerHTML = `<div class="empty-state">No items captured yet. Set filters on Apollo and click "Start Deep Harvest"!</div>`;
      }
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Pill Preset Buttons
  pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pillButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      targetLeadsInput.value = btn.dataset.value;
    });
  });

  targetLeadsInput.addEventListener('input', () => {
    const val = targetLeadsInput.value;
    pillButtons.forEach(b => {
      if (b.dataset.value === val) b.classList.add('active');
      else b.classList.remove('active');
    });
  });

  // Initial render & listener
  renderState();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      renderState();
    }
  });

  // Start Harvest
  btnStartHarvest.addEventListener('click', () => {
    const target = parseInt(targetLeadsInput.value, 10) || 50000;
    const strat = strategySelect.value;

    const config = {
      targetLeads: target,
      method: strat || 'infinite_drain',
      granular: strat === 'granular_headcount',
      minDelay: 2000,
      maxDelay: 3800
    };

    chrome.runtime.sendMessage({
      action: 'START_UNIVERSAL_HARVEST',
      config: config
    }, () => {
      renderState();
    });
  });

  // Stop Harvest
  btnStopHarvest.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_UNIVERSAL_HARVEST' }, () => {
      renderState();
    });
  });

  // Export Leads CSV
  btnExportCSV?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'TRIGGER_EXPORT_CSV', entityType: 'people' });
  });

  // Export Companies CSV
  btnExportCompanyCSV?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'TRIGGER_EXPORT_CSV', entityType: 'companies' });
  });

  // Export Leads JSON
  btnExportJSON?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'TRIGGER_EXPORT_JSON', entityType: 'people' });
  });

  // Export Companies JSON
  btnExportCompanyJSON?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'TRIGGER_EXPORT_JSON', entityType: 'companies' });
  });

  // Clear Data
  btnClear.addEventListener('click', () => {
    if (confirm('Clear all captured leads & companies and reset counters?')) {
      chrome.runtime.sendMessage({ action: 'CLEAR_DATA' }, () => {
        renderState();
      });
    }
  });
});
