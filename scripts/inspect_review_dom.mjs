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

async function main() {
  const tabs = await httpGet('http://127.0.0.1:9222/json');
  const reviewTab = tabs.find(t => t.url && t.url.includes('review.html'));
  if (!reviewTab) {
    console.error('No review.html tab found');
    return;
  }

  const ws = new WebSocket(reviewTab.webSocketDebuggerUrl);
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            return {
              title: document.title,
              statTotalLeads: document.getElementById('statTotalLeads')?.innerText,
              statTotalCompanies: document.getElementById('statTotalCompanies')?.innerText,
              statFillRate: document.getElementById('statFillRate')?.innerText,
              statEnriched: document.getElementById('statEnriched')?.innerText,
              leadRowsCount: document.querySelectorAll('#leadsTableBody tr')?.length,
              statusBadge: document.getElementById('engineStatusBadge')?.innerText
            };
          })()
        `,
        returnByValue: true
      }
    }));
  });

  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id === 1) {
      console.log('Review Station Rendered DOM:', msg.result?.result?.value);
      ws.close();
    }
  });
}

main().catch(console.error);
