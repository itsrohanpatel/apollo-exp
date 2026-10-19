import http from 'http';
import WebSocket from 'ws';

async function check() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const apolloTab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
  if (!apolloTab) {
    console.error('No apollo tab found');
    return;
  }

  const ws = new WebSocket(apolloTab.webSocketDebuggerUrl);
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 10,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const hud = document.getElementById('apollo-scraper-hud');
          const hudCount = document.getElementById('apollo-hud-count');
          const hudStatus = document.getElementById('apollo-hud-status');
          const hudBadge = document.getElementById('apollo-hud-badge');
          return {
            title: document.title,
            readyState: document.readyState,
            hudFound: !!hud,
            hudCount: hudCount ? hudCount.innerText : null,
            hudStatus: hudStatus ? hudStatus.innerText : null,
            hudBadge: hudBadge ? hudBadge.innerText : null,
            href: window.location.href,
            hasContentScriptContext: typeof chrome !== 'undefined' && !!chrome.runtime
          };
        })()`,
        returnByValue: true
      }
    }));
  });

  ws.on('message', m => {
    const data = JSON.parse(m);
    if (data.id === 10) {
      console.log('Tab Status:', data.result?.result?.value);
      ws.close();
    }
  });
}

check();
