import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';

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
  const bgTarget = tabs.find(t => t.url && t.url.includes('chrome-extension://') && (t.type === 'service_worker' || t.type === 'page' || t.type === 'background_page'));
  if (!bgTarget) {
    console.error('Extension page or service worker not found on 9222!');
    return;
  }

  const cdp = await connectCDP(bgTarget.webSocketDebuggerUrl);
  const data = await cdp.send('Runtime.evaluate', {
    expression: `
      new Promise(resolve => {
        chrome.storage.local.get(null, items => {
          resolve({
            leadCount: items.leadCount,
            scrapedLeads: items.scrapedLeads || [],
            companiesCount: items.companiesCount,
            scrapedCompanies: items.scrapedCompanies || [],
            harvestProgress: items.harvestProgress
          });
        });
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  const res = data.result.value;
  console.log('================================================================');
  console.log(`📋 HARVEST REPORT: Apollo Human Resources - Ahmedabad, India`);
  console.log('================================================================');
  console.log(`👤 Total Scraped Leads: ${res.scrapedLeads.length} (Counter: ${res.leadCount})`);
  console.log(`🏢 Total Companies: ${res.scrapedCompanies.length} (Counter: ${res.companiesCount})`);
  console.log(`⚡ Harvest Progress Status:`, res.harvestProgress?.status);

  if (res.scrapedLeads.length > 0) {
    console.log('\n🔍 Quality & Filter Audit:');
    let emailCount = 0;
    let linkedinCount = 0;
    let phoneCount = 0;
    const titles = {};
    const locations = {};
    const orgs = new Set();
    const excludedKeywordViolations = [];

    const negativeKeywords = ['staffing', 'human', 'hiring', 'staff'];

    res.scrapedLeads.forEach(lead => {
      if (lead.email) emailCount++;
      if (lead.linkedin_url) linkedinCount++;
      if (lead.phone || lead.sanitized_phone) phoneCount++;

      const orgName = lead.organization_name || lead.company || '';
      if (orgName) orgs.add(orgName);

      const title = lead.title || 'Unknown Title';
      titles[title] = (titles[title] || 0) + 1;

      const loc = `${lead.city || ''}, ${lead.country || ''}`.trim();
      locations[loc] = (locations[loc] || 0) + 1;

      // Check if any negative keyword leaked in org name or tags
      for (const kw of negativeKeywords) {
        if (orgName.toLowerCase().includes(kw)) {
          // Note: Apollo URL excluded tags, name, social_media_description for organization keywords
          excludedKeywordViolations.push({ lead: lead.name, org: orgName, matchedKeyword: kw });
        }
      }
    });

    console.log(`- Email Fill Rate: ${emailCount}/${res.scrapedLeads.length} (${((emailCount / res.scrapedLeads.length) * 100).toFixed(1)}%)`);
    console.log(`- LinkedIn Fill Rate: ${linkedinCount}/${res.scrapedLeads.length} (${((linkedinCount / res.scrapedLeads.length) * 100).toFixed(1)}%)`);
    console.log(`- Unique Organizations: ${orgs.size}`);
    console.log(`- Negative Org Keyword Flags in Company Name: ${excludedKeywordViolations.length}`);

    console.log('\nTop 8 Job Titles:');
    Object.entries(titles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([t, count]) => console.log(`  • ${t}: ${count}`));

    console.log('\nTop 5 Locations:');
    Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([l, count]) => console.log(`  • ${l || 'Unspecified'}: ${count}`));

    console.log('\nSample Leads:');
    res.scrapedLeads.slice(0, 3).forEach((lead, i) => {
      console.log(`  [${i + 1}] ${lead.name} | ${lead.title} @ ${lead.organization_name || lead.company}`);
      console.log(`      Email: ${lead.email || 'N/A'} | LinkedIn: ${lead.linkedin_url || 'N/A'}`);
    });

    // Save full JSON snapshot
    fs.writeFileSync('scripts/last_scraped_leads.json', JSON.stringify(res.scrapedLeads, null, 2));
    console.log('\n💾 Exported full leads JSON snapshot to scripts/last_scraped_leads.json');
  }

  cdp.close();
}

main().catch(console.error);
