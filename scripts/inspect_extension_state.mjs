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

async function main() {
  const tabs = await httpGet('http://127.0.0.1:9222/json');
  const bgTarget = tabs.find(t => t.url && t.url.includes('ffddakdnlbekmilieeochlnkekkafbfe/background.js'));
  if (!bgTarget) {
    console.error('Extension background service worker not found!');
    return;
  }

  const cdp = await connectCDP(bgTarget.webSocketDebuggerUrl);
  const res = await cdp.send('Runtime.evaluate', {
    expression: `
      new Promise(resolve => {
        chrome.storage.local.get(null, items => {
          resolve({
            leadsCount: items.leadsCount,
            companiesCount: items.companiesCount,
            isHarvesting: items.isHarvesting,
            status: items.harvestProgress?.status,
            sampleCompany: items.scrapedCompanies?.[0] || null
          });
        });
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Background Storage State:', JSON.stringify(res.result.value, null, 2));
  cdp.close();
}

main().catch(console.error);
