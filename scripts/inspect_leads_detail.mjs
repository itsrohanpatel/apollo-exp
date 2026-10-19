import WebSocket from 'ws';

async function main() {
  const tabs = await (await fetch('http://127.0.0.1:9222/json')).json();
  const bgTab = tabs.find(t => t.url && t.url.includes('chrome-extension://') && t.type === 'service_worker');
  const ws = new WebSocket(bgTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  const res = await new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    ws.on('message', (msg) => {
      const parsed = JSON.parse(msg.toString());
      if (parsed.id === id) resolve(parsed.result?.result?.value);
    });
    ws.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: {
        expression: `new Promise((resolve) => {
          chrome.storage.local.get(['scrapedLeads'], (res) => {
            const leads = res.scrapedLeads || [];
            const sample = leads.slice(-5).map(l => ({
              name: l.full_name || l.name,
              title: l.title,
              company: l.company_name,
              employees: l.company_employees,
              city: l.city,
              country: l.country,
              email_status: l.email_status,
              linkedin: l.linkedin_url
            }));
            resolve({ total: leads.length, sample });
          });
        })`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  });

  console.log('Stored Leads Sample:', JSON.stringify(res, null, 2));
  ws.close();
}

main().catch(console.error);
