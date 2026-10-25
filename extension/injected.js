/**
 * Apollo Lead Extractor - Authentic Main-World Execution Engine
 * Hooks Apollo's native network responses, drives UI hash navigation,
 * performs authentic DOM pagination, and dismisses search limit modals.
 */

(function () {
  console.log('[Apollo Extractor] Main-world Engine initialized.');

  let activeSortConfig = null;

  // 1. Transparent Network Interceptor (XHR + Fetch)
  function installNetworkSniffer() {
    // A. Intercept XMLHttpRequest (Used by Apollo Axios client)
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._url = typeof url === 'string' ? url : (url?.toString() || '');
      this._method = method;
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (body, ...rest) {
      if (this._url && this._url.includes('/api/v1/mixed_people/search') && activeSortConfig && typeof body === 'string') {
        try {
          const payload = JSON.parse(body);
          payload.sort_by_field = activeSortConfig.sort_by_field;
          payload.sort_ascending = activeSortConfig.sort_ascending;
          body = JSON.stringify(payload);
        } catch (e) {}
      }

      this.addEventListener('load', function () {
        try {
          if (this._url && this._url.includes('/api/v1/mixed_people/search')) {
            if (this.status === 200 && this.responseText) {
              const data = JSON.parse(this.responseText);
              if (Array.isArray(data.people)) {
                window.postMessage({
                  type: 'APOLLO_NATIVE_SEARCH_RESPONSE',
                  data: data,
                  timestamp: Date.now()
                }, '*');
              }
            }
          }
        } catch (e) {}
      });
      return originalSend.apply(this, [body, ...rest]);
    };

    // B. Intercept window.fetch as well (Complete coverage)
    const originalFetch = window.fetch;
    window.fetch = async function (resource, init, ...rest) {
      const url = typeof resource === 'string' ? resource : (resource?.url || '');
      if (url.includes('/api/v1/mixed_people/search') && activeSortConfig && init && typeof init.body === 'string') {
        try {
          const payload = JSON.parse(init.body);
          payload.sort_by_field = activeSortConfig.sort_by_field;
          payload.sort_ascending = activeSortConfig.sort_ascending;
          init.body = JSON.stringify(payload);
        } catch (e) {}
      }

      const response = await originalFetch.apply(this, [resource, init, ...rest]);
      try {
        if (url.includes('/api/v1/mixed_people/search')) {
          if (response.status === 200) {
            const clone = response.clone();
            clone.json().then(data => {
              if (Array.isArray(data.people)) {
                window.postMessage({
                  type: 'APOLLO_NATIVE_SEARCH_RESPONSE',
                  data: data,
                  timestamp: Date.now()
                }, '*');
              }
            }).catch(() => {});
          }
        }
      } catch (e) {}
      return response;
    };
  }

  installNetworkSniffer();

  // 2. Auto-Dismiss Search Limit & Upgrade Modals
  function dismissApolloModals() {
    try {
      const modals = document.querySelectorAll('.zp_pTR_n, .zp_FpEc5, [role="dialog"]');
      for (const modal of modals) {
        const txt = (modal.innerText || '').toLowerCase();
        if (txt.includes('search limit') || txt.includes('upgrade now') || txt.includes('reach your limit')) {
          const closeBtn = modal.querySelector('button, [class*="close"], svg, i');
          if (closeBtn) {
            console.log('[Apollo Extractor] Auto-dismissed search limit modal');
            closeBtn.click();
          }
        }
      }
    } catch (e) {}
  }

  setInterval(dismissApolloModals, 1000);

  // 3. Fallback DOM Extractor (If network response ever missed)
  function extractLeadsFromDOM() {
    const leads = [];
    try {
      const rows = document.querySelectorAll('[role="row"], table tbody tr, .zp_table_row, [data-cy="finder-table-row"]');
      for (const row of rows) {
        const nameLink = row.querySelector('a[href*="/people/"]');
        if (!nameLink) continue;

        const name = (nameLink.innerText || '').trim();
        const href = nameLink.getAttribute('href') || '';
        const idMatch = href.match(/\/people\/([a-zA-Z0-9_-]+)/);
        const id = idMatch ? idMatch[1] : `dom_${name.replace(/\s+/g, '_')}`;

        const companyLink = row.querySelector('a[href*="/companies/"], a[href*="/accounts/"]');
        const companyName = companyLink ? (companyLink.innerText || '').trim() : '';

        const titleEl = row.querySelector('.zp_job_title, [class*="title"], td:nth-child(3)');
        const title = titleEl ? (titleEl.innerText || '').trim() : '';

        if (name) {
          leads.push({
            id,
            name,
            title,
            organization: { name: companyName }
          });
        }
      }
    } catch (e) {}
    return leads;
  }

  // 3. Authentic UI Sort Driver
  async function setApolloUISort(direction = 'ascending') {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    try {
      const sortBtn = document.querySelector('button[data-cy="people-finder-sort-button"]');
      let dialog = document.querySelector('div[data-open="true"][role="dialog"]');
      if (!dialog) {
        if (sortBtn) sortBtn.click();
        await sleep(500);
        dialog = document.querySelector('div[data-open="true"][role="dialog"]');
      }
      if (!dialog) return false;

      // Field = Company (contact.account)
      const fieldCombo = dialog.querySelector('div[data-name="sortField"]');
      if (fieldCombo && !fieldCombo.innerText.includes('Company')) {
        fieldCombo.click();
        await sleep(300);
        const compOpt = document.querySelector('[data-value="contact.account"]');
        if (compOpt) compOpt.click();
        await sleep(300);
      }

      // Direction
      const orderCombo = dialog.querySelector('div[data-name="sortOrder"]');
      const targetText = direction === 'ascending' ? 'Ascending' : 'Descending';
      if (orderCombo && !orderCombo.innerText.includes(targetText)) {
        orderCombo.click();
        await sleep(300);
        const orderOpt = document.querySelector('[data-value="' + direction + '"]');
        if (orderOpt) orderOpt.click();
        await sleep(300);
      }

      const applyBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Apply');
      if (applyBtn && applyBtn.getAttribute('aria-disabled') !== 'true') {
        applyBtn.click();
        await sleep(600);
        return true;
      } else {
        // Sort is already active! Close dialog and trigger page 1 fetch
        if (sortBtn) sortBtn.click();
        await sleep(300);
        const p1 = Array.from(document.querySelectorAll('.zp_rJq0p, .zp_EVN8k')).find(e => e.innerText?.trim() === '1');
        if (p1) p1.click();
        return true;
      }
    } catch (e) {
      console.warn('[Apollo Extractor] UI Sort error:', e);
    }
    return false;
  }

  // 4. Action Listener from Content Script
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    // A. Command: Navigate URL Hash
    if (event.data.type === 'APOLLO_NAVIGATE_HASH') {
      const hash = event.data.hash;
      if (hash) {
        const oldUrl = window.location.href;
        window.location.hash = hash;
        const newUrl = window.location.href;
        window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: oldUrl, newURL: newUrl }));
        window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
      }
    }

    // A2. Command: Set Active Search Sorting
    if (event.data.type === 'APOLLO_SET_SORT') {
      activeSortConfig = event.data.sort || null;
      console.log('[Apollo Extractor] Active sort parameter set:', activeSortConfig);
    }

    // B. Command: Click Pagination Link
    if (event.data.type === 'APOLLO_CLICK_PAGE') {
      const targetPage = String(event.data.page);
      let clicked = false;

      // Hard Limit: Never click beyond page 5
      if (parseInt(targetPage, 10) > 5) {
        console.warn('[Apollo Extractor] Page > 5 blocked to avoid paywall.');
        window.postMessage({ type: 'APOLLO_PAGE_CLICKED', success: false, page: targetPage, reason: 'CEILING_LIMIT' }, '*');
        return;
      }

      // Modern selectors: .zp_rJq0p, .zp_EVN8k, button[role="button"], a[role="button"], .zp_x2Vvy
      const links = Array.from(document.querySelectorAll('.zp_rJq0p, .zp_EVN8k, a.zp_x2Vvy, button.zp_x2Vvy, a[role="button"], button[role="button"], [aria-label*="Page"]'));
      const target = links.find(a => (a.innerText || '').trim() === targetPage);

      if (target) {
        target.click();
        clicked = true;
      } else {
        const pageSelect = document.querySelector('select[name="items"]');
        if (pageSelect) {
          pageSelect.value = targetPage;
          pageSelect.dispatchEvent(new Event('change', { bubbles: true }));
          clicked = true;
        }
      }

      window.postMessage({
        type: 'APOLLO_PAGE_CLICKED',
        success: clicked,
        page: targetPage
      }, '*');
    }

    // C. Command: Extract DOM fallback
    if (event.data.type === 'APOLLO_REQUEST_DOM_EXTRACTION') {
      const domLeads = extractLeadsFromDOM();
      window.postMessage({
        type: 'APOLLO_DOM_LEADS_RESULT',
        leads: domLeads
      }, '*');
    }

    // D. Command: In-page Density Probe
    if (event.data.type === 'APOLLO_PROBE_DENSITY') {
      const { requestId, payload } = event.data;
      const getCookie = (name) => {
        const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? v[2] : null;
      };
      const csrf = getCookie('X-CSRF-TOKEN') || '';

      fetch('/api/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf
        },
        body: JSON.stringify(payload)
      })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => {
        const total = data.total_entries || data.pagination?.total_entries || 0;
        window.postMessage({
          type: 'APOLLO_PROBE_DENSITY_RESULT',
          requestId,
          total,
          success: true
        }, '*');
      })
      .catch(err => {
        window.postMessage({
          type: 'APOLLO_PROBE_DENSITY_RESULT',
          requestId,
          total: null,
          error: err.message,
          success: false
        }, '*');
      });
    }
  });

})();
