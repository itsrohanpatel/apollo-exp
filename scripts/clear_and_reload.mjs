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
  const extTab = tabs.find(t => t.url && t.url.includes('chrome://extensions'));
  if (!extTab) {
    console.log('chrome://extensions tab not found');
    return;
  }

  const cdp = await connectCDP(extTab.webSocketDebuggerUrl);

  // 1. First find the item and click errors button if present
  const info = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const list = manager?.shadowRoot?.querySelector('extensions-item-list');
        const item = list?.shadowRoot?.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]');
        if (!item) return { found: false };

        const errorsBtn = item.shadowRoot.querySelector('#errors-button');
        if (errorsBtn) errorsBtn.click();

        return { found: true, hadErrorsBtn: !!errorsBtn };
      })()
    `,
    returnByValue: true
  });
  console.log('Item info:', info.result.value);

  await new Promise(r => setTimeout(r, 1200));

  // 2. Click clear all buttons inside extensions-error-page
  const clearRes = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const viewManager = manager?.shadowRoot?.querySelector('#viewManager');
        const errorPage = manager?.shadowRoot?.querySelector('extensions-error-page') || viewManager?.querySelector('extensions-error-page');
        if (!errorPage || !errorPage.shadowRoot) return { cleared: false, reason: 'no errorPage' };

        const allButtons = Array.from(errorPage.shadowRoot.querySelectorAll('cr-button, button'));
        const clearBtn = allButtons.find(b => b.innerText.toLowerCase().includes('clear') || b.id === 'clear-all');
        if (clearBtn) {
          clearBtn.click();
        }

        const backBtn = errorPage.shadowRoot.querySelector('#closeButton') || errorPage.shadowRoot.querySelector('cr-icon-button');
        if (backBtn) {
          backBtn.click();
        }

        return {
          cleared: !!clearBtn,
          buttonTexts: allButtons.map(b => b.innerText + ' (' + b.id + ')')
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Clear result:', clearRes.result.value);

  await new Promise(r => setTimeout(r, 1000));

  // 3. Now reload extension
  const reloadRes = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const list = manager?.shadowRoot?.querySelector('extensions-item-list');
        const item = list?.shadowRoot?.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]');
        if (!item) return { found: false };

        const reloadBtn = item.shadowRoot.querySelector('#dev-reload-button');
        if (reloadBtn) reloadBtn.click();

        return { reloaded: !!reloadBtn };
      })()
    `,
    returnByValue: true
  });
  console.log('Reload result:', reloadRes.result.value);

  await new Promise(r => setTimeout(r, 2000));

  // 4. Final check if any errors appear on fresh reload
  const finalCheck = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const list = manager?.shadowRoot?.querySelector('extensions-item-list');
        const item = list?.shadowRoot?.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]');
        if (!item) return { found: false };

        const errorsBtn = item.shadowRoot.querySelector('#errors-button');
        return {
          hasErrorsNow: !!errorsBtn
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Fresh reload errors status:', finalCheck.result.value);

  cdp.close();
}

main().catch(console.error);
