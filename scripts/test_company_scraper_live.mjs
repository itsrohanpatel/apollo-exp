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
  const tabs = await httpGet('http://127.0.0.1:9222/json');
  
  // 1. Reload extension
  const extTab = tabs.find(t => t.url && t.url.includes('chrome://extensions'));
  if (extTab && extTab.webSocketDebuggerUrl) {
    console.log('[1/4] Reloading extension via chrome://extensions...');
    const extCdp = await connectCDP(extTab.webSocketDebuggerUrl);
    await extCdp.send('Runtime.evaluate', {
      expression: `
        const devMode = document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-toolbar').shadowRoot.querySelector('#devMode');
        const item = document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-item-list').shadowRoot.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]');
        if (item) {
          const reloadBtn = item.shadowRoot.querySelector('#dev-reload-button');
          if (reloadBtn) reloadBtn.click();
        }
      `
    });
    extCdp.close();
    console.log('Extension reloaded successfully!');
    await sleep(1500);
  }

  // 2. Navigate Apollo tab to Companies section
  const apolloTab = tabs.find(t => t.url && t.url.includes('app.apollo.io'));
  if (!apolloTab || !apolloTab.webSocketDebuggerUrl) {
    throw new Error('Apollo tab not found');
  }

  console.log('[2/4] Connecting to Apollo Tab...');
  const apolloCdp = await connectCDP(apolloTab.webSocketDebuggerUrl);

  const targetUrl = 'https://app.apollo.io/#/companies?page=1&organizationLocations[]=United+States&organizationNumEmployeesRanges[]=1%2C10';
  console.log(`Navigating to: ${targetUrl}`);
  await apolloCdp.send('Page.navigate', { url: targetUrl });
  await sleep(4000);

  // 3. Inspect HUD in Apollo tab
  console.log('[3/4] Inspecting HUD state on Apollo Companies page...');
  const hudCheck = await apolloCdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const hud = document.getElementById('apollo-scraper-hud');
        const typeLabel = document.getElementById('apollo-hud-type-label')?.innerText;
        const count = document.getElementById('apollo-hud-count')?.innerText;
        const status = document.getElementById('apollo-hud-status')?.innerText;
        return {
          hudPresent: !!hud,
          typeLabel: typeLabel,
          count: count,
          status: status,
          hash: window.location.hash
        };
      })()
    `,
    returnByValue: true
  });
  console.log('HUD Check Result:', hudCheck.result.value);

  // 4. Start a targeted test harvest for companies (Target = 50 companies)
  console.log('[4/4] Triggering Test Company Harvest (50 companies)...');
  const harvestTrigger = await apolloCdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        window.postMessage({
          type: 'APOLLO_START_UNIVERSAL_HARVEST',
          config: {
            targetLeads: 50,
            method: 'infinite_drain',
            minDelay: 1500,
            maxDelay: 2500
          }
        }, '*');
        return 'HARVEST_TRIGGERED';
      })()
    `,
    returnByValue: true
  });
  console.log('Trigger status:', harvestTrigger.result.value);

  // Poll progress for 20 seconds
  for (let i = 1; i <= 6; i++) {
    await sleep(3500);
    const progress = await apolloCdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          return new Promise(resolve => {
            chrome.storage.local.get(['companiesCount', 'scrapedCompanies', 'harvestProgress'], res => {
              const comps = res.scrapedCompanies || [];
              resolve({
                companiesCount: res.companiesCount || comps.length,
                status: res.harvestProgress?.status,
                recentSample: comps.slice(-2).map(c => ({
                  name: c.company_name,
                  domain: c.domain,
                  phone: c.phone,
                  revenue: c.revenue,
                  employees: c.employees
                }))
              });
            });
          });
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log(`Poll #${i}:`, JSON.stringify(progress.result.value));
    if (progress.result.value.companiesCount >= 50) {
      console.log('Target reached successfully!');
      break;
    }
  }

  // 5. Stop harvest if still running
  await apolloCdp.send('Runtime.evaluate', {
    expression: `window.postMessage({ type: 'APOLLO_STOP_UNIVERSAL_HARVEST' }, '*');`
  });

  // 6. Capture screenshot of Apollo with Companies HUD
  const screenshot = await apolloCdp.send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('fs');
  fs.writeFileSync('apollo_companies_live_harvest.png', Buffer.from(screenshot.data, 'base64'));
  console.log('Saved screenshot to apollo_companies_live_harvest.png');

  apolloCdp.close();
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
