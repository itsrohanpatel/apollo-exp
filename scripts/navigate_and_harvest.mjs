import http from 'http';
import WebSocket from 'ws';

const TARGET_URL = 'https://app.apollo.io/#/people?personDepartmentOrSubdepartments[]=master_human_resources&existFields[]=organization_domain&personLocations[]=Ahmedabad%2C%20India&organizationNumEmployeesRanges[]=50%2C&qNotOrganizationKeywordTags[]=staffing&qNotOrganizationKeywordTags[]=human&qNotOrganizationKeywordTags[]=hiring&qNotOrganizationKeywordTags[]=staff&excludedOrganizationKeywordFields[]=tags&excludedOrganizationKeywordFields[]=name&excludedOrganizationKeywordFields[]=social_media_description&page=1&recommendationConfigId=6acdb4b72dd2d30001a1bc91';

async function main() {
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const apolloTab = tabs.find(t => t.url && t.url.includes('apollo.io') && t.type === 'page');
  if (!apolloTab) {
    console.error('No Apollo tab found on port 9222');
    return;
  }

  console.log(`📡 Connecting to Apollo tab [${apolloTab.id}]...`);
  const ws = new WebSocket(apolloTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  function cdpSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const onMsg = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', onMsg);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  console.log('🌐 Navigating Apollo Tab to target search URL...');
  await cdpSend('Page.navigate', { url: TARGET_URL });

  // Wait 6 seconds for page to mount and extension to inject
  console.log('⏳ Waiting for Apollo single-page app and HUD to mount...');
  await new Promise(r => setTimeout(r, 6000));

  // Check HUD and Trigger harvest
  const hudCheck = await cdpSend('Runtime.evaluate', {
    expression: `(() => {
      const hud = document.getElementById('apollo-hud-widget');
      const actionBtn = document.getElementById('apollo-hud-action-btn');
      return {
        hudFound: !!hud,
        hudText: hud ? hud.innerText.replace(/\\n+/g, ' | ') : null,
        btnText: actionBtn ? actionBtn.innerText : null
      };
    })()`,
    returnByValue: true
  });
  console.log('🔍 HUD Mount Status:', hudCheck.result.value);

  // If HUD not injected via standard injection, manually inject content.js & injected.js
  if (!hudCheck.result.value.hudFound) {
    console.log('💉 Injecting content.js manually into tab...');
    // We can evaluate content.js script tags or trigger START_APOLLO_HARVEST
  }

  // Trigger harvest via window.postMessage
  console.log('🚀 Sending START_APOLLO_HARVEST postMessage (Target: 50,000, Cooldown: 10s)...');
  const triggerRes = await cdpSend('Runtime.evaluate', {
    expression: `(() => {
      window.postMessage({
        type: 'START_APOLLO_HARVEST',
        config: {
          targetLeads: 50000,
          method: 'infinite_drain',
          minDelay: 2000,
          maxDelay: 3800
        }
      }, '*');
      return { triggered: true };
    })()`,
    returnByValue: true
  });
  console.log('⚡ Trigger response:', triggerRes.result.value);

  // Poll progress for 40 seconds
  console.log('\n📊 Live Telemetry Progress:');
  console.log('====================================================');
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const state = await cdpSend('Runtime.evaluate', {
      expression: `(() => {
        const hud = document.getElementById('apollo-hud-widget');
        const badge = document.getElementById('apollo-hud-status-badge');
        const total = document.getElementById('apollo-hud-total-counter');
        const details = document.getElementById('apollo-hud-activity-details');
        return {
          badge: badge ? badge.innerText : 'WAITING',
          total: total ? total.innerText : '0',
          details: details ? details.innerText : 'Initializing...',
          hudText: hud ? hud.innerText.replace(/\\n+/g, ' | ') : 'No HUD'
        };
      })()`,
      returnByValue: true
    });

    const val = state.result.value;
    console.log(`[${new Date().toLocaleTimeString()}] [${val.badge}] Leads: ${val.total} | ${val.details}`);
  }

  ws.close();
}

main().catch(console.error);
