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
      function getCookie(name) {
        try {
          const match = document.cookie.match(new RegExp('(^|;\\\\s*)(' + name + ')=([^;]*)'));
          return match ? decodeURIComponent(match[3]) : null;
        } catch (e) {
          return null;
        }
      }

      function getHeaders() {
        const headers = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        };
        const csrf = getCookie('X-CSRF-TOKEN') || getCookie('csrf_token') || getCookie('X-CSRF-Token');
        if (csrf) headers['x-csrf-token'] = csrf;
        const token = getCookie('_leadgen_remember_token') || getCookie('remember_token');
        if (token) headers['X-Leadgen-Remember-Token'] = token;
        return headers;
      }

      // 1. Let's inspect the active filters displayed in Apollo UI
      // In Apollo, there is often a breadcrumbs/filter bar or state
      const searchUrl = window.location.href;
      
      // 2. Test call with the user's exact URL filters
      const payload1 = {
        page: 1,
        per_page: 25,
        person_department_or_subdepartments: ['master_human_resources'],
        person_locations: ['Ahmedabad, India'],
        organization_num_employees_ranges: ['50,'],
        q_not_organization_keyword_tags: ['staffing', 'human', 'hiring', 'staff'],
        excluded_organization_keyword_fields: ['tags', 'name', 'social_media_description']
      };

      const res1 = await fetch('https://app.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload1)
      });
      const data1 = res1.ok ? await res1.json() : { status: res1.status, text: await res1.text() };

      // 3. Test call WITHOUT q_not_organization_keyword_tags
      const payload2 = {
        page: 1,
        per_page: 25,
        person_department_or_subdepartments: ['master_human_resources'],
        person_locations: ['Ahmedabad, India'],
        organization_num_employees_ranges: ['50,']
      };

      const res2 = await fetch('https://app.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload2)
      });
      const data2 = res2.ok ? await res2.json() : { status: res2.status };

      // 4. Test call WITHOUT employee ranges (just Ahmedabad HR)
      const payload3 = {
        page: 1,
        per_page: 25,
        person_department_or_subdepartments: ['master_human_resources'],
        person_locations: ['Ahmedabad, India']
      };

      const res3 = await fetch('https://app.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload3)
      });
      const data3 = res3.ok ? await res3.json() : { status: res3.status };

      // 5. Test call with organization_locations instead of person_locations
      const payload4 = {
        page: 1,
        per_page: 25,
        person_department_or_subdepartments: ['master_human_resources'],
        organization_locations: ['Ahmedabad, India']
      };

      const res4 = await fetch('https://app.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload4)
      });
      const data4 = res4.ok ? await res4.json() : { status: res4.status };

      return {
        url: searchUrl,
        query1_exact_total: data1.pagination?.total_entries ?? data1.total_entries,
        query1_sample: data1.people?.[0]?.name,
        query2_no_kw_total: data2.pagination?.total_entries ?? data2.total_entries,
        query3_no_emp_total: data3.pagination?.total_entries ?? data3.total_entries,
        query4_org_loc_total: data4.pagination?.total_entries ?? data4.total_entries,
        query1_raw_status: res1.status
      };
    })()
  `);

  console.log('API Filter Analysis:', JSON.stringify(res, null, 2));
  ws.close();
}

main().catch(console.error);
