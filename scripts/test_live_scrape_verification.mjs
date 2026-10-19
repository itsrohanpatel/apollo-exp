import http from 'http';
import WebSocket from 'ws';

const CDP_URL = 'http://127.0.0.1:9222/json';

function getApolloTab() {
  return new Promise((resolve, reject) => {
    http.get(CDP_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          const tab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
          if (!tab) reject(new Error('No active Apollo.io tab found on port 9222'));
          else resolve(tab);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function evaluate(ws, expression) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (msg) => {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.id === id) {
          ws.off('message', handler);
          if (parsed.error) reject(parsed.error);
          else resolve(parsed.result?.result?.value);
        }
      } catch (err) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: {
        expression,
        returnByValue: true,
        awaitPromise: true
      }
    }));
  });
}

async function main() {
  console.log('📡 Connecting to Chrome CDP on port 9222...');
  const tab = await getApolloTab();
  console.log(`✅ Attached to Apollo Tab: ${tab.title}`);
  console.log(`🔗 URL: ${tab.url}\n`);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  // 1. Check initial storage & HUD state
  const initial = await evaluate(ws, `
    (async () => {
      const hudCount = document.getElementById('apollo-hud-count')?.innerText || '0';
      const hudStatus = document.getElementById('apollo-hud-status')?.innerText || 'Idle';
      const hudBadge = document.getElementById('apollo-hud-badge')?.innerText || 'UNKNOWN';

      return new Promise(resolve => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['scrapedLeads', 'scraped_leads'], (res) => {
            const list = res?.scrapedLeads || res?.scraped_leads || [];
            resolve({
              hudCount,
              hudStatus,
              hudBadge,
              storageCount: list.length,
              storageSample: list.slice(-3)
            });
          });
        } else {
          resolve({ hudCount, hudStatus, hudBadge, storageCount: -1, storageSample: [] });
        }
      });
    })()
  `);

  console.log(`📊 Initial Storage Leads: ${initial.storageCount} leads`);
  console.log(`📌 HUD Initial State: [${initial.hudBadge}] ${initial.hudCount} leads | ${initial.hudStatus}\n`);

  // 2. Start harvest targeting fresh leads
  console.log('🚀 Triggering Live Harvester for 150 leads...');
  await evaluate(ws, `
    (() => {
      window.postMessage({
        type: 'APOLLO_START_UNIVERSAL_HARVEST',
        config: {
          targetLeads: 150,
          method: 'infinite_drain',
          minDelay: 2000,
          maxDelay: 3200
        }
      }, '*');
    })()
  `);

  // 3. Monitor live scraping progress
  console.log('⏳ Streaming real-time harvest telemetry...\n');
  let previousLine = '';
  const startTime = Date.now();

  while (Date.now() - startTime < 45000) {
    await new Promise(r => setTimeout(r, 2000));

    const state = await evaluate(ws, `
      (async () => {
        const hudCount = document.getElementById('apollo-hud-count')?.innerText || '0';
        const hudStatus = document.getElementById('apollo-hud-status')?.innerText || '';
        const hudBadge = document.getElementById('apollo-hud-badge')?.innerText || 'UNKNOWN';

        return new Promise(resolve => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['scraped_leads'], (res) => {
              const list = res?.scraped_leads || [];
              resolve({
                hudCount,
                hudStatus,
                hudBadge,
                storageCount: list.length,
                latestLead: list.length > 0 ? list[list.length - 1] : null
              });
            });
          } else {
            resolve({ hudCount, hudStatus, hudBadge, storageCount: -1, latestLead: null });
          }
        });
      })()
    `);

    const currentLine = `[${state.hudBadge}] Storage: ${state.storageCount} leads | HUD: ${state.hudCount} | ${state.hudStatus}`;
    if (currentLine !== previousLine) {
      previousLine = currentLine;
      const ts = new Date().toLocaleTimeString();
      console.log(`[${ts}] ${currentLine}`);
      if (state.latestLead) {
        console.log(`      ↳ Latest: ${state.latestLead.name} (${state.latestLead.title}) @ ${state.latestLead.company} | ${state.latestLead.email || 'No email'} | ${state.latestLead.linkedin_url || 'No LinkedIn'}`);
      }
    }

    if (state.hudBadge === 'FINISHED' || state.storageCount >= initial.storageCount + 50 || state.hudStatus.includes('finished') || state.hudStatus.includes('completed')) {
      console.log('\n🎉 Reached milestone or completed bracket sweep!');
      break;
    }
  }

  // 4. Inspect Newly Saved Leads from storage
  const finalLeads = await evaluate(ws, `
    (async () => {
      return new Promise(resolve => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['scrapedLeads', 'scraped_leads'], (res) => {
            const list = res?.scrapedLeads || res?.scraped_leads || [];
            resolve(list);
          });
        } else {
          resolve([]);
        }
      });
    })()
  `);

  console.log('\n================================================================================');
  console.log(`FINAL SCRAPE VERIFICATION REPORT:`);
  console.log(`Total Leads Stored in Database: ${finalLeads.length} leads`);
  console.log(`New Leads Gained in this Test: +${finalLeads.length - initial.storageCount} leads`);
  console.log('================================================================================\n');

  console.log('Recent 5 Stored Leads Details:');
  finalLeads.slice(-5).forEach((lead, i) => {
    console.log(`[${i + 1}] ${lead.name} - ${lead.title}`);
    console.log(`    Company:  ${lead.company} (${lead.company_domain || 'domain N/A'}) [${lead.employees || 'N/A'} emp]`);
    console.log(`    Email:    ${lead.email || 'N/A'} (Status: ${lead.email_status || 'N/A'})`);
    console.log(`    LinkedIn: ${lead.linkedin_url || 'N/A'}`);
    console.log(`    Location: ${lead.location || 'N/A'}`);
    console.log('--------------------------------------------------------------------------------');
  });

  // Stop harvester gracefully if still running
  await evaluate(ws, `
    (() => {
      window.postMessage({ type: 'APOLLO_STOP_HARVEST' }, '*');
    })()
  `);

  ws.close();
  console.log('✅ Harvester stopped safely.');
}

main().catch(console.error);
