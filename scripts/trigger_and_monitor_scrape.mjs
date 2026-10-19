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

  // Check initial HUD state
  const initial = await evaluate(ws, `(() => {
    const hud = document.getElementById('apollo-scraper-hud');
    const hudCount = document.getElementById('apollo-hud-count');
    const hudStatus = document.getElementById('apollo-hud-status');
    const hudBadge = document.getElementById('apollo-hud-badge');
    return {
      hudVisible: !!hud,
      count: hudCount ? hudCount.innerText : null,
      status: hudStatus ? hudStatus.innerText : null,
      badge: hudBadge ? hudBadge.innerText : null,
      fullText: hud ? hud.innerText.replace(/\\n+/g, ' | ') : 'HUD not injected'
    };
  })()`);

  console.log('Initial HUD State:', initial);

  // Trigger harvest via window.postMessage
  console.log('\n🚀 Triggering Universal Harvester with 10s debug cooldown...');
  const triggerRes = await evaluate(ws, `(() => {
    window.postMessage({
      type: 'APOLLO_START_UNIVERSAL_HARVEST',
      config: {
        targetLeads: 50000,
        method: 'infinite_drain',
        minDelay: 2000,
        maxDelay: 3800
      }
    }, '*');
    return { dispatched: true, timestamp: new Date().toISOString() };
  })()`);
  console.log('⚡ Harvest Dispatch:', triggerRes);

  console.log('\n📊 Streaming Scraping Telemetry (10s anti-ban cooldown enabled):');
  console.log('================================================================');

  let lastLine = '';
  let finishedCount = 0;

  const interval = setInterval(async () => {
    try {
      const state = await evaluate(ws, `(() => {
        const hud = document.getElementById('apollo-scraper-hud');
        const hudCount = document.getElementById('apollo-hud-count');
        const hudStatus = document.getElementById('apollo-hud-status');
        const hudBadge = document.getElementById('apollo-hud-badge');
        return {
          count: hudCount ? hudCount.innerText : '0',
          status: hudStatus ? hudStatus.innerText : '',
          badge: hudBadge ? hudBadge.innerText : 'UNKNOWN'
        };
      })()`);

      const currentLine = `[${state.badge}] Leads: ${state.count} | ${state.status}`;
      if (currentLine !== lastLine) {
        lastLine = currentLine;
        console.log(`[${new Date().toLocaleTimeString()}] ${currentLine}`);
      }

      if (state.badge === 'FINISHED' || state.badge === 'HALTED' || state.status.includes('completed') || state.status.includes('Finished')) {
        finishedCount++;
        if (finishedCount >= 2) {
          console.log(`\n🎉 Scraping run concluded: [${state.badge}] Total Leads: ${state.count}`);
          clearInterval(interval);
          ws.close();
          process.exit(0);
        }
      } else {
        finishedCount = 0;
      }
    } catch (e) {
      console.log('Telemetry error:', e.message);
    }
  }, 2000);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
