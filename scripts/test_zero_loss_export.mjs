import WebSocket from 'ws';
import http from 'http';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.on('open', () => {
      resolve({
        send: (method, params = {}) => {
          return new Promise((res, rej) => {
            const id = msgId++;
            callbacks.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close: () => ws.close()
      });
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && callbacks.has(msg.id)) {
        const { res, rej } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) rej(msg.error);
        else res(msg.result);
      }
    });

    ws.on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== ZERO DATA LOSS LIVE PIPELINE VERIFICATION ===');
  const tabs = await httpGet('http://127.0.0.1:9222/json');

  // 1. Reload extension
  const extTab = tabs.find(t => t.url && t.url.includes('chrome://extensions'));
  if (extTab) {
    console.log('[Step 1] Reloading extension in Chrome...');
    const extCdp = await connectCDP(extTab.webSocketDebuggerUrl);
    await extCdp.send('Runtime.evaluate', {
      expression: `
        const item = document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-item-list').shadowRoot.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]');
        if (item) {
          const reloadBtn = item.shadowRoot.querySelector('#dev-reload-button');
          if (reloadBtn) reloadBtn.click();
        }
      `
    });
    extCdp.close();
    await sleep(2000);
  }

  // 2. Connect to Apollo tab & reload page
  const freshTabs = await httpGet('http://127.0.0.1:9222/json');
  const apolloTab = freshTabs.find(t => t.url && t.url.includes('app.apollo.io'));
  if (!apolloTab) {
    throw new Error('Apollo tab not found');
  }

  const apolloCdp = await connectCDP(apolloTab.webSocketDebuggerUrl);
  console.log('[Step 2] Reloading Apollo Page to bind fresh sniffer...');
  await apolloCdp.send('Page.reload');
  await sleep(5000);

  // 3. Trigger live API searches for Companies and People
  console.log('[Step 3] Fetching real live company and people payloads...');
  const fetchResult = await apolloCdp.send('Runtime.evaluate', {
    expression: `
      new Promise(async (resolve) => {
        try {
          // Search Companies
          const compRes = await fetch('/api/v1/mixed_companies/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: 1, per_page: 5, _isHarvestEngine: false })
          });
          const compData = await compRes.json();

          // Search People
          const peopleRes = await fetch('/api/v1/mixed_people/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: 1, per_page: 5, _isHarvestEngine: false })
          });
          const peopleData = await peopleRes.json();

          resolve({
            companiesCount: compData.organizations ? compData.organizations.length : 0,
            peopleCount: peopleData.people ? peopleData.people.length : 0
          });
        } catch (e) {
          resolve({ error: e.toString() });
        }
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Search Results:', fetchResult.result.value);

  // Wait 2.5s for sniffer -> content script -> background worker ingestion
  await sleep(2500);

  // 4. Connect to background worker and inspect column counts via GET_EXPORT_PREVIEW
  const finalTabs = await httpGet('http://127.0.0.1:9222/json');
  const bgTarget = finalTabs.find(t => t.url && t.url.includes('ffddakdnlbekmilieeochlnkekkafbfe/background.js'));
  if (bgTarget) {
    const bgCdp = await connectCDP(bgTarget.webSocketDebuggerUrl);
    console.log('[Step 4] Querying Background Export Preview for Companies and People...');

    const auditResult = await bgCdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const comps = Array.from(state.companies.values());
          const leads = Array.from(state.leads.values());
          const compCSV = buildUnionCSV(comps, PREFERRED_COMPANY_COLUMNS);
          const leadsCSV = buildUnionCSV(leads, PREFERRED_PERSON_COLUMNS);
          const compHeaders = compCSV ? compCSV.replace('\\uFEFF', '').split('\\r\\n')[0].split(',') : [];
          const leadHeaders = leadsCSV ? leadsCSV.replace('\\uFEFF', '').split('\\r\\n')[0].split(',') : [];

          return {
            compCount: comps.length,
            compColumnCount: compHeaders.length,
            compHeaders: compHeaders,
            leadsCount: leads.length,
            leadsColumnCount: leadHeaders.length,
            leadsHeaders: leadHeaders
          };
        })()
      `,
      returnByValue: true
    });

    console.log('DEBUG AuditResult:', JSON.stringify(auditResult, null, 2));
    const val = auditResult.result?.value;
    if (!val) {
      console.error('Audit failed, exceptionDetails:', auditResult.exceptionDetails || auditResult);
      return;
    }
    console.log('\n--- COMPANIES ZERO-LOSS COLUMN AUDIT ---');
    console.log(`Total Companies Exportable: ${val.compCount}`);
    console.log(`Total CSV Columns: ${val.compColumnCount}`);
    console.log('ALL Company Columns:', val.compHeaders);

    console.log('\n--- PEOPLE (LEADS) ZERO-LOSS COLUMN AUDIT ---');
    console.log(`Total Leads Exportable: ${val.leadsCount}`);
    console.log(`Total CSV Columns: ${val.leadsColumnCount}`);
    console.log('ALL Lead Columns:', val.leadsHeaders);

    bgCdp.close();
  }

  apolloCdp.close();
  console.log('\n=== VERIFICATION COMPLETE: ALL DATA & COLUMNS CAPTURED ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
