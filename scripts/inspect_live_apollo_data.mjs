import WebSocket from 'ws';

async function getApolloTab() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const tabs = await res.json();
  const apolloTab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
  if (!apolloTab) throw new Error('No Apollo page tab found on 9222');
  return apolloTab;
}

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(ws, expression) {
  const res = await sendCDP(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (res.exceptionDetails) {
    throw new Error(JSON.stringify(res.exceptionDetails));
  }
  return res.result?.value;
}

async function main() {
  const tab = await getApolloTab();
  console.log(`Connecting to Apollo tab: ${tab.title} (${tab.url})`);

  const ws = new WebSocket(tab.webSocketDebuggerUrl, { maxPayload: 50 * 1024 * 1024 });
  await new Promise(res => ws.on('open', res));

  const probeScript = `
    (async () => {
      const results = {};
      
      // 1. Check CSRF / Auth tokens available in page
      results.auth = {
        hasCookies: document.cookie.length > 0,
        hasCsrfToken: !!(window.__APOLLO_CSRF_TOKEN__ || document.querySelector('meta[name="csrf-token"]')?.content)
      };

      // 2. Fetch Live People Search Sample
      try {
        const peopleRes = await fetch('/api/v1/mixed_people/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            per_page: 2,
            person_locations: ['United States']
          })
        });
        if (peopleRes.ok) {
          const peopleJson = await peopleRes.json();
          results.people_search = {
            total_entries: peopleJson.total_entries || peopleJson.pagination?.total_entries,
            sample_person_keys: peopleJson.people?.[0] ? Object.keys(peopleJson.people[0]) : [],
            sample_person: peopleJson.people?.[0] || null,
            contacts_sample: peopleJson.contacts?.[0] || null
          };
        } else {
          results.people_search = { error: peopleRes.status, text: await peopleRes.text() };
        }
      } catch (e) {
        results.people_search = { error: e.message };
      }

      // 3. Fetch Live Company Search Sample
      try {
        const compRes = await fetch('/api/v1/mixed_companies/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            per_page: 2,
            organization_locations: ['United States']
          })
        });
        if (compRes.ok) {
          const compJson = await compRes.json();
          const org = compJson.organizations?.[0] || null;
          results.company_search = {
            total_entries: compJson.total_entries || compJson.pagination?.total_entries,
            sample_org_keys: org ? Object.keys(org) : [],
            sample_org: org
          };

          // 4. If we have an org ID, fetch detailed /api/v1/organizations/{id}
          if (org && org.id) {
            try {
              const enrichRes = await fetch('/api/v1/organizations/' + org.id);
              if (enrichRes.ok) {
                const enrichJson = await enrichRes.json();
                results.company_detailed = {
                  keys: enrichJson.organization ? Object.keys(enrichJson.organization) : Object.keys(enrichJson),
                  data: enrichJson.organization || enrichJson
                };
              } else {
                results.company_detailed = { status: enrichRes.status };
              }
            } catch (err) {
              results.company_detailed = { error: err.message };
            }
          }
        } else {
          results.company_search = { error: compRes.status, text: await compRes.text() };
        }
      } catch (e) {
        results.company_search = { error: e.message };
      }

      // 5. Check if person detail endpoint exists for people[0]
      const samplePersonId = results.people_search?.sample_person?.id;
      if (samplePersonId) {
        try {
          const pRes = await fetch('/api/v1/people/' + samplePersonId);
          results.person_detailed_endpoint = {
            status: pRes.status,
            data: pRes.ok ? await pRes.json() : null
          };
        } catch (e) {
          results.person_detailed_endpoint = { error: e.message };
        }
      }

      return results;
    })()
  `;

  console.log('Evaluating live data extraction probe in Apollo session...');
  const probeData = await evalInPage(ws, probeScript);
  ws.close();

  // Save the complete output for inspection
  import('fs').then(fs => {
    fs.default.writeFileSync('data/live_apollo_data_probe.json', JSON.stringify(probeData, null, 2));
    console.log('Saved raw probe data to data/live_apollo_data_probe.json');
  });

  return probeData;
}

main().catch(console.error);
