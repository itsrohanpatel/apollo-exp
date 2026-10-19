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
  const cdp = await connectCDP(bgTarget.webSocketDebuggerUrl);

  const res = await cdp.send('Runtime.evaluate', {
    expression: `
      (async () => {
        const testIds = [
          "663fa37b89d7f800017aa572", // Flash Moving Service
          "5fcb4752650b7b000115a7b0", // The Marketing Millennials
          "6340020c785d52008b8d242b", // Egger & Co
          "5da3e2a5f29793000114cac2", // Black Women Empowered Incorporated
          "5ed4da721ad1410001a653e6"  // Conscience VC
        ];

        const t0 = performance.now();
        const results = await Promise.all(testIds.map(async id => {
          const r = await fetch('https://app.apollo.io/api/v1/organizations/' + id, {
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
          });
          const j = await r.json();
          return {
            id: id,
            name: j.organization?.name,
            estimated_num_employees: j.organization?.estimated_num_employees,
            city: j.organization?.city,
            state: j.organization?.state,
            country: j.organization?.country,
            keywords: j.organization?.keywords?.slice(0, 3)
          };
        }));
        const t1 = performance.now();

        return {
          elapsedMs: Math.round(t1 - t0),
          results: results
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Parallel Org Fetch Result:', JSON.stringify(res.result.value, null, 2));
  cdp.close();
}

main().catch(console.error);
