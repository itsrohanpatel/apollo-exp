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

function evaluateInTab(ws, expression) {
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
      } catch (err) {
        // ignore
      }
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
  console.log('📡 Connecting to Chrome on port 9222...');
  const tab = await getApolloTab();
  console.log(`✅ Found Apollo Tab: ${tab.title}`);
  console.log(`🔗 URL: ${tab.url}\n`);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  // Check HUD and state
  const statusCheck = await evaluateInTab(ws, `(() => {
    const hud = document.getElementById('apollo-hud-widget');
    const totalEl = document.querySelector('[data-cy*="total-records"]') || 
                    document.querySelector('.total-records') || 
                    document.querySelector('[class*="totalRecords"]');
    return {
      hudVisible: !!hud,
      hudText: hud ? hud.innerText.replace(/\\n+/g, ' | ') : 'HUD not injected yet',
      totalFound: totalEl ? totalEl.innerText : 'Unknown'
    };
  })()`);

  console.log('🔍 Current Page State:', statusCheck);

  // Trigger Harvest via postMessage
  console.log('🚀 Triggering Universal Harvester with 10s debug cooldown...');
  const startResult = await evaluateInTab(ws, `(() => {
    window.postMessage({
      type: 'START_APOLLO_HARVEST',
      config: {
        targetLeads: 50000,
        method: 'infinite_drain',
        minDelay: 2000,
        maxDelay: 3800
      }
    }, '*');
    return { triggered: true, time: new Date().toISOString() };
  })()`);

  console.log('⚡ Trigger Event Dispatched:', startResult);

  // Poll progress every 3 seconds
  console.log('\n📊 Live Telemetry Stream (Press Ctrl+C to detach):');
  console.log('----------------------------------------------------');

  let lastStatus = '';
  const pollInterval = setInterval(async () => {
    try {
      const state = await evaluateInTab(ws, `(() => {
        const hud = document.getElementById('apollo-hud-widget');
        const badge = document.getElementById('apollo-hud-status-badge');
        const total = document.getElementById('apollo-hud-total-counter');
        const details = document.getElementById('apollo-hud-activity-details');
        return {
          badge: badge ? badge.innerText : null,
          total: total ? total.innerText : null,
          details: details ? details.innerText : null,
          hudText: hud ? hud.innerText.replace(/\\n+/g, ' | ') : null
        };
      })()`);

      const currentDesc = `[${state.badge || 'RUNNING'}] ${state.total || '0'} | ${state.details || ''}`;
      if (currentDesc !== lastStatus) {
        lastStatus = currentDesc;
        console.log(`[${new Date().toLocaleTimeString()}] ${currentDesc}`);
      }

      if (state.badge === 'FINISHED' || state.badge === 'HALTED') {
        console.log(`\n🏁 Scraping ended with status: ${state.badge}`);
        clearInterval(pollInterval);
        ws.close();
        process.exit(0);
      }
    } catch (e) {
      console.log('Telemetry poll error:', e.message);
    }
  }, 3000);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
