import http from 'http';
import WebSocket from 'ws';

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
  const apolloTab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
  const ws = new WebSocket(apolloTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  const evaluate = (expression) => {
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
        } catch (e) {}
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true }
      }));
    });
  };

  const res = await evaluate(`
    (async () => {
      try {
        const testA = await (await fetch('/api/v1/mixed_people/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            per_page: 25,
            person_department_or_subdepartments: ['master_human_resources'],
            person_locations: ['Ahmedabad, India'],
            organization_num_employees_ranges: ['50,'],
            q_not_organization_keyword_tags: ['staffing', 'human', 'hiring', 'staff'],
            excluded_organization_keyword_fields: ['tags', 'name', 'social_media_description']
          })
        })).json();

        const testB = await (await fetch('/api/v1/mixed_people/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            per_page: 25,
            person_department_or_subdepartments: ['master_human_resources'],
            person_locations: ['Ahmedabad, India']
          })
        })).json();

        // Test C: What is the current search URL on Apollo and what does Apollo show?
        const totalText = document.body.innerText.match(/([0-9,.]+)\s*(Total|records|results|Net New)/i)?.[0];

        return {
          testA_total: testA.pagination?.total_entries ?? testA.total_entries,
          testB_total: testB.pagination?.total_entries ?? testB.total_entries,
          totalText,
          currentUrl: window.location.href
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()
  `);

  console.log('Result:', JSON.stringify(res, null, 2));
  ws.close();
}

main().catch(console.error);
