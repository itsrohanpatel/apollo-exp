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

async function reload() {
  const tabs = await httpGet('http://127.0.0.1:9222/json');
  let extTab = tabs.find(t => t.url && t.url.includes('chrome://extensions'));
  if (!extTab) {
    console.log('Opening chrome://extensions tab...');
    await new Promise((resolve, reject) => {
      const req = http.request('http://127.0.0.1:9222/json/new?chrome://extensions', { method: 'PUT' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({});
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    await new Promise(r => setTimeout(r, 1500));
    const updatedTabs = await httpGet('http://127.0.0.1:9222/json');
    extTab = updatedTabs.find(t => t.url && t.url.includes('chrome://extensions'));
  }
  if (!extTab) {
    console.error('Failed to open or find chrome://extensions tab');
    return;
  }

  const cdp = await connectCDP(extTab.webSocketDebuggerUrl);
  const res = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const list = manager ? manager.shadowRoot.querySelector('extensions-item-list') : null;
        const item = list ? list.shadowRoot.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]') : null;
        if (!item) return { found: false };

        const reloadBtn = item.shadowRoot.querySelector('#dev-reload-button');
        if (reloadBtn) reloadBtn.click();

        const errorsBtn = item.shadowRoot.querySelector('#errors-button');
        if (errorsBtn) {
          errorsBtn.click();
        }

        return {
          found: true,
          reloaded: !!reloadBtn,
          hadErrors: !!errorsBtn
        };
      })()
    `,
    returnByValue: true
  });

  // Wait 1s and click clear all on error page
  await new Promise(r => setTimeout(r, 1000));
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const viewManager = manager?.shadowRoot?.querySelector('#viewManager');
        const errorPage = manager?.shadowRoot?.querySelector('extensions-error-page') || viewManager?.querySelector('extensions-error-page');
        const clearBtn = errorPage?.shadowRoot?.querySelector('#clear-all');
        if (clearBtn) clearBtn.click();
        const backBtn = errorPage?.shadowRoot?.querySelector('#closeButton') || errorPage?.shadowRoot?.querySelector('cr-icon-button[id="closeButton"]');
        if (backBtn) backBtn.click();
      })()
    `
  });

  // Re-check after 1s
  await new Promise(r => setTimeout(r, 1000));
  const finalCheck = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const item = document.querySelector('extensions-manager').shadowRoot.querySelector('extensions-item-list').shadowRoot.querySelector('extensions-item[id="ffddakdnlbekmilieeochlnkekkafbfe"]');
        const errorsBtn = item ? item.shadowRoot.querySelector('#errors-button') : null;
        return {
          currentErrorsPresent: !!errorsBtn
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Final Error Status:', finalCheck.result.value);

  console.log('Reload Result:', res.result.value);

  // Wait 1s for error page to open
  await new Promise(r => setTimeout(r, 1000));

  const errRes = await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const manager = document.querySelector('extensions-manager');
        const viewManager = manager?.shadowRoot?.querySelector('#viewManager');
        const errorPage = manager?.shadowRoot?.querySelector('extensions-error-page') || viewManager?.querySelector('extensions-error-page');
        if (!errorPage || !errorPage.shadowRoot) return 'No errorPage found';
        const errorItems = Array.from(errorPage.shadowRoot.querySelectorAll('.error-item, .error-message, [class*="error"]')).map(e => e.innerText);
        return {
          text: errorPage.shadowRoot.innerText,
          errorItems: errorItems
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Error Page Result:', errRes.result.value);
  cdp.close();
}

reload().catch(console.error);
