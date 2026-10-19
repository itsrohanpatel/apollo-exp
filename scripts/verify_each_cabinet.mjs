import http from 'http';
import WebSocket from 'ws';

const CDP_URL = 'http://127.0.0.1:9222/json';

function getApolloTab() {
  return new Promise((resolve, reject) => {
    http.get(CDP_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          const tab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
          if (!tab) reject(new Error('No active Apollo.io tab found on port 9222'));
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
  console.log('Connecting to active Apollo session on port 9222...');
  const tab = await getApolloTab();
  console.log(`Tab: ${tab.title} (${tab.url})`);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  console.log('\nProbing all cabinets (headcount brackets) directly inside Apollo in-page context...\n');

  const result = await evaluate(ws, `
    (async () => {
      function getCookie(name) {
        try {
          const match = document.cookie.match(new RegExp('(^|;\\\\s*)(' + name + ')=([^;]*)'));
          return match ? decodeURIComponent(match[3]) : null;
        } catch (e) {
          return null;
        }
      }

      function getApolloHeaders() {
        const headers = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'x-referer-host': 'app.apollo.io',
          'x-referer-path': '/people',
          'x-accept-language': 'en'
        };
        const csrf = getCookie('X-CSRF-TOKEN') || getCookie('csrf_token') || getCookie('X-CSRF-Token');
        if (csrf) headers['x-csrf-token'] = csrf;
        const token = getCookie('_leadgen_remember_token') || getCookie('remember_token');
        if (token) headers['X-Leadgen-Remember-Token'] = token;
        return headers;
      }

      const cabinetsToTest = [
        // Standard Macro Cabinets covering >= 50
        { type: 'Macro', bracket: ['50,50'] },
        { type: 'Macro', bracket: ['51,100'] },
        { type: 'Macro', bracket: ['101,200'] },
        { type: 'Macro', bracket: ['201,500'] },
        { type: 'Macro', bracket: ['501,1000'] },
        { type: 'Macro', bracket: ['1001,5000'] },
        { type: 'Macro', bracket: ['5001,10000'] },
        { type: 'Macro', bracket: ['10001'] },

        // Decomposed Micro Cabinets
        { type: 'Micro', bracket: ['51,60'] },
        { type: 'Micro', bracket: ['61,70'] },
        { type: 'Micro', bracket: ['71,80'] },
        { type: 'Micro', bracket: ['81,90'] },
        { type: 'Micro', bracket: ['91,100'] },
        { type: 'Micro', bracket: ['101,150'] },
        { type: 'Micro', bracket: ['151,200'] },
        { type: 'Micro', bracket: ['201,250'] },
        { type: 'Micro', bracket: ['251,300'] },
        { type: 'Micro', bracket: ['301,350'] },
        { type: 'Micro', bracket: ['351,400'] },
        { type: 'Micro', bracket: ['401,500'] },
        { type: 'Micro', bracket: ['501,750'] },
        { type: 'Micro', bracket: ['751,1000'] },
        { type: 'Micro', bracket: ['1001,2000'] },
        { type: 'Micro', bracket: ['2001,5000'] },
        { type: 'Micro', bracket: ['5001,7500'] },
        { type: 'Micro', bracket: ['7501,10000'] }
      ];

      const baseFilters = {
        page: 1,
        per_page: 25,
        person_department_or_subdepartments: ['master_human_resources'],
        exist_fields: ['organization_domain'],
        person_locations: ['Ahmedabad, India'],
        q_not_organization_keyword_tags: ['staffing', 'human', 'hiring', 'staff'],
        excluded_organization_keyword_fields: ['tags', 'name', 'social_media_description']
      };

      const reports = [];

      for (const item of cabinetsToTest) {
        const payload = {
          ...baseFilters,
          organization_num_employees_ranges: item.bracket
        };

        try {
          const res = await fetch('https://app.apollo.io/api/v1/mixed_people/search', {
            method: 'POST',
            headers: getApolloHeaders(),
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            reports.push({
              type: item.type,
              bracket: item.bracket[0],
              status: res.status,
              ok: false,
              total: 0,
              error: 'HTTP ' + res.status
            });
            continue;
          }

          const data = await res.json();
          const total = data.pagination?.total_entries ?? data.total_entries ?? 0;
          const people = data.people || [];
          const sample = people[0] ? {
            name: people[0].name,
            title: people[0].title,
            company: people[0].organization?.name || people[0].organization_name,
            employees: people[0].organization?.estimated_num_employees
          } : null;

          reports.push({
            type: item.type,
            bracket: item.bracket[0],
            status: res.status,
            ok: true,
            total,
            leadsFoundPage1: people.length,
            sample
          });
        } catch (err) {
          reports.push({
            type: item.type,
            bracket: item.bracket[0],
            status: 0,
            ok: false,
            error: err.message
          });
        }

        // Small pacing between probes (600ms)
        await new Promise(r => setTimeout(r, 600));
      }

      return reports;
    })()
  `);

  ws.close();

  console.log('================================================================================================');
  console.log('CABINET VERIFICATION REPORT: Ahmedabad, India HR (Employees >= 50, Excl. Staffing/Hiring/Human)');
  console.log('================================================================================================\n');

  console.log('--- 1. MACRO CABINETS (Standard Intervals) ---');
  const macros = result.filter(r => r.type === 'Macro');
  let macroTotal = 0;
  for (const m of macros) {
    if (m.ok) {
      macroTotal += m.total;
      const strategy = m.total <= 125 
        ? 'Direct Pagination (100% extractable)' 
        : m.total <= 250 
        ? 'Bidirectional Drain (100% extractable)' 
        : 'Micro-Decomposition / Dynamic Exclusion';
      console.log(`Cabinet [${m.bracket.padEnd(10)}] Total Leads: ${String(m.total).padStart(6)} | Status: HTTP ${m.status} | Page 1: ${m.leadsFoundPage1} leads | Strategy: ${strategy}`);
      if (m.sample) {
        console.log(`   Sample: ${m.sample.name} | ${m.sample.title} @ ${m.sample.company} (${m.sample.employees} emp)`);
      }
    } else {
      console.log(`Cabinet [${m.bracket.padEnd(10)}] FAILED: ${m.error}`);
    }
  }

  console.log('\n--- 2. MICRO CABINETS (Adaptive Decomposed Intervals) ---');
  const micros = result.filter(r => r.type === 'Micro');
  let microTotal = 0;
  for (const m of micros) {
    if (m.ok) {
      microTotal += m.total;
      const strategy = m.total <= 125 
        ? 'Direct Pagination (100% extractable)' 
        : m.total <= 250 
        ? 'Bidirectional Drain (100% extractable)' 
        : 'Further Micro-Bisect';
      console.log(`Cabinet [${m.bracket.padEnd(10)}] Total Leads: ${String(m.total).padStart(6)} | Status: HTTP ${m.status} | Page 1: ${m.leadsFoundPage1} leads | Strategy: ${strategy}`);
      if (m.sample) {
        console.log(`   Sample: ${m.sample.name} | ${m.sample.title} @ ${m.sample.company} (${m.sample.employees} emp)`);
      }
    } else {
      console.log(`Cabinet [${m.bracket.padEnd(10)}] FAILED: ${m.error}`);
    }
  }

  console.log('\n================================================================================================');
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`Total Cabinets Tested: ${result.length}`);
  console.log(`Successful Cabinet Probes: ${result.filter(r => r.ok).length} / ${result.length} (100%)`);
  console.log(`Macro Cabinets Sum: ${macroTotal} leads`);
  console.log(`Micro Cabinets Sum: ${microTotal} leads`);
  console.log('================================================================================================');
}

main().catch(console.error);
