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
  if (!apolloTab) {
    console.error('No Apollo tab found on port 9222');
    return;
  }

  const ws = new WebSocket(apolloTab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

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

  const info = await evaluate(`
    (() => {
      // 1. Check URL
      const url = window.location.href;
      const hash = window.location.hash;

      // 2. Look for total count indicators in Apollo UI
      const totalButtons = Array.from(document.querySelectorAll('button, a, div, span'))
        .filter(el => /Total/i.test(el.innerText || ''))
        .map(el => el.innerText.trim().replace(/\\n+/g, ' '));

      // 3. Look for numbers like 11,xxx or 11.x K
      const numberMatches = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length === 0 && /(11[,.]?[0-9]*\s*k?|[0-9]{4,})/i.test(el.innerText || ''))
        .map(el => el.innerText.trim())
        .slice(0, 30);

      // 4. Check if there are tabs like "Total (11.2K)", "Net New (X)", "Saved (Y)"
      const tabHeaders = Array.from(document.querySelectorAll('[role="tab"], .tab, [class*="tab"]'))
        .map(el => el.innerText.trim().replace(/\\n+/g, ' '));

      return {
        url,
        hash,
        totalButtons,
        numberMatches: Array.from(new Set(numberMatches)),
        tabHeaders: Array.from(new Set(tabHeaders))
      };
    })()
  `);

  console.log('Diagnosis of Tab:');
  console.log(JSON.stringify(info, null, 2));

  // Now, let's test making a direct search call from page context to see what total Apollo actually returns!
  const apiTest = await evaluate(`
    (async () => {
      try {
        // Find apollo request headers
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        // Let's parse url hash filters
        const hash = window.location.hash || '';
        const paramsStr = hash.includes('?') ? hash.split('?')[1] : '';
        const searchParams = new URLSearchParams(paramsStr);
        
        // Get personDepartmentOrSubdepartments
        const depts = searchParams.getAll('personDepartmentOrSubdepartments[]');
        const locs = searchParams.getAll('personLocations[]');
        const empRanges = searchParams.getAll('organizationNumEmployeesRanges[]');
        const notOrgKw = searchParams.getAll('qNotOrganizationKeywordTags[]');
        const excludedFields = searchParams.getAll('excludedOrganizationKeywordFields[]');
        
        // Payload test: EXACT as Apollo sends it
        const payload = {
          finder_table_layout: 'people',
          page: 1,
          per_page: 25,
          person_department_or_subdepartments: depts,
          person_locations: locs,
          organization_num_employees_ranges: empRanges,
          q_not_organization_keyword_tags: notOrgKw,
          excluded_organization_keyword_fields: excludedFields
        };

        const res = await fetch('/api/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        return {
          status: res.status,
          total_entries: data.pagination?.total_entries,
          total_pages: data.pagination?.total_pages,
          people_count: data.people?.length,
          breadcrumbs: data.breadcrumbs,
          model_ids: data.model_ids?.length
        };
      } catch (err) {
        return { error: err.message };
      }
    })()
  `);

  console.log('\nDirect API Search Test:');
  console.log(JSON.stringify(apiTest, null, 2));

  ws.close();
}

main().catch(console.error);
