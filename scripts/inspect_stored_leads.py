import urllib.request
import json
import asyncio
import websockets

async def inspect_leads():
    req = urllib.request.urlopen('http://127.0.0.1:9222/json/list')
    tabs = json.loads(req.read().decode('utf-8'))
    ws_url = None
    for tab in tabs:
        if 'ffddakdnlbekmilieeochlnkekkafbfe' in tab.get('url', ''):
            ws_url = tab.get('webSocketDebuggerUrl')
            break

    if not ws_url:
        print("Extension background not found, checking tabs...")
        for tab in tabs:
            if 'apollo.io' in tab.get('url', '') and tab.get('type') == 'page':
                ws_url = tab.get('webSocketDebuggerUrl')
                break

    async with websockets.connect(ws_url) as ws:
        expr = """
        (() => {
            return new Promise((resolve) => {
                chrome.storage.local.get(['leadsCount', 'scrapedLeads'], (res) => {
                    const leads = res.scrapedLeads || [];
                    // Group leads by company employee count or employee range if available
                    const empCounts = {};
                    for (const l of leads) {
                        const emp = l.employees || l.organization_num_employees || 'unknown';
                        empCounts[emp] = (empCounts[emp] || 0) + 1;
                    }
                    resolve({
                        totalStored: res.leadsCount,
                        leadsArrayLength: leads.length,
                        topEmpCounts: Object.entries(empCounts).slice(0, 25)
                    });
                });
            });
        })()
        """
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Runtime.evaluate',
            'params': {'expression': expr, 'awaitPromise': True, 'returnByValue': True}
        }))
        res = json.loads(await ws.recv())
        print(json.dumps(res.get('result', {}).get('result', {}).get('value'), indent=2))

asyncio.run(inspect_leads())
