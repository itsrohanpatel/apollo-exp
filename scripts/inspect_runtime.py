import asyncio
import json
import websockets
import urllib.request

async def eval_js(ws, expr, await_promise=False):
    msg = {'id': 1, 'method': 'Runtime.evaluate', 'params': {'expression': expr, 'awaitPromise': await_promise, 'returnByValue': True}}
    await ws.send(json.dumps(msg))
    while True:
        res = json.loads(await ws.recv())
        if res.get('id') == 1:
            return res.get('result', {}).get('result', {}).get('value')

async def main():
    tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json').read().decode())
    sw_tab = next((t for t in tabs if 'ffddakdnlbekmilieeochlnkekkafbfe' in t.get('url', '') and t.get('type') == 'service_worker'), None)
    if sw_tab:
        async with websockets.connect(sw_tab['webSocketDebuggerUrl'], max_size=10*1024*1024) as ws:
            storage = await eval_js(ws, "new Promise(resolve => chrome.storage.local.get(['leadsCount', 'status', 'progress'], resolve))", await_promise=True)
            print("EXTENSION STORAGE:")
            if storage:
                print("leadsCount:", storage.get('leadsCount'))
                print("status:", storage.get('status'))
                print("progress:", storage.get('progress'))

    # Apollo tab
    tab_uri = 'ws://127.0.0.1:9222/devtools/page/51174463FC2E17945D26EAE2D96BDBE9'
    async with websockets.connect(tab_uri) as ws:
        hud = await eval_js(ws, "document.getElementById('apollo-scraper-hud') ? document.getElementById('apollo-scraper-hud').innerText : 'NO HUD'")
        print("\nHUD TEXT:\n", hud)
        url = await eval_js(ws, "window.location.href")
        print("PAGE URL:", url)

if __name__ == '__main__':
    asyncio.run(main())

