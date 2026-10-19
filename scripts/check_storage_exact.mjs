import http from 'http';
import WebSocket from 'ws';

function getApolloTab() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          const tab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
          if (!tab) reject(new Error('No active Apollo.io tab found'));
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
      } catch (err) {}
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
  const tab = await getApolloTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  // Also check the HUD element in page
  const hudInfo = await evaluate(ws, `(() => {
    const hud = document.getElementById('apollo-scraper-hud');
    const hudCount = document.getElementById('apollo-hud-count')?.innerText;
    const hudStatus = document.getElementById('apollo-hud-status')?.innerText;
    const hudBadge = document.getElementById('apollo-hud-badge')?.innerText;
    return { hudVisible: !!hud, hudCount, hudStatus, hudBadge };
  })()`);

  console.log('HUD Info:', hudInfo);

  // Now query background worker for exact scrapedLeads
  const tabs = await (await fetch('http://127.0.0.1:9222/json')).json();
  const bgTab = tabs.find(t => t.url && t.url.includes('chrome-extension://') && t.type === 'service_worker');
  if (bgTab) {
    const bgWs = new WebSocket(bgTab.webSocketDebuggerUrl);
    await new Promise(r => bgWs.on('open', r));
    const storageRes = await evaluate(bgWs, `new Promise((resolve) => {
      chrome.storage.local.get(['leadsCount', 'scrapedLeads', 'companiesCount'], (res) => {
        const leads = res.scrapedLeads || [];
        resolve({
          leadsCount: res.leadsCount || leads.length,
          companiesCount: res.companiesCount || 0,
          totalArrayLength: leads.length,
          sample: leads.slice(-5).map(l => ({
            name: l.full_name || l.name,
            title: l.title,
            company: l.company_name,
            company_domain: l.company_domain || l.organization_domain,
            company_employees: l.company_employees || l.organization_num_employees,
            location: l.location || l.city + ', ' + l.country,
            email_status: l.email_status,
            linkedin: l.linkedin_url
          }))
        });
      });
    })`);
    console.log('\n--- BACKGROUND STORAGE DATA ---');
    console.log('Total Stored Leads:', storageRes.leadsCount);
    console.log('Total Companies:', storageRes.companiesCount);
    console.log('\nRecent 5 Scraped Leads:');
    storageRes.sample.forEach((s, idx) => {
      console.log(`[${idx + 1}] ${s.name} - ${s.title}`);
      console.log(`    Company:   ${s.company} (${s.company_domain || 'N/A'}) [${s.company_employees || 'N/A'} emp]`);
      console.log(`    Location:  ${s.location}`);
      console.log(`    Email:     ${s.email_status}`);
      console.log(`    LinkedIn:  ${s.linkedin}`);
    });
    bgWs.close();
  }

  ws.close();
}

main().catch(console.error);
