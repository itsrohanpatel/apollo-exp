import asyncio
import json
import urllib.request
import websockets
import os
import csv
import sys
import time

CDP_LIST_URL = "http://127.0.0.1:9222/json/list"
OUTPUT_DIR = r"d:\Codinf projets\apollo scraper\data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_apollo_ws_url():
    req = urllib.request.urlopen(CDP_LIST_URL)
    tabs = json.loads(req.read().decode('utf-8'))
    for tab in tabs:
        url = tab.get('url', '')
        if 'apollo.io' in url and tab.get('type') == 'page':
            return tab.get('webSocketDebuggerUrl')
    raise RuntimeError("No active Apollo tab found in Chrome!")

HARVEST_JS = """
(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    // Master deduplicated Map by person.id
    const leadsMap = new Map();
    
    // ICP Query Slices (Granular combinations under 125 leads each)
    const basePayload = {
        "person_locations": ["Ahmedabad, Gujarat, India"],
        "contact_email_status": ["verified"],
        "sort_ascending": false,
        "sort_by_field": "[none]"
    };

    const titleGroups = [
        ["CEO", "Chief Executive Officer"],
        ["Founder", "Co-Founder"],
        ["Managing Director", "Executive Director"],
        ["HR Manager", "Human Resources Manager"],
        ["Head of HR", "Head of Human Resources"],
        ["VP Human Resources", "Director Human Resources"],
        ["COO", "Chief Operating Officer"],
        ["CTO", "Chief Technology Officer"],
        ["Partner", "Managing Partner"]
    ];

    const employeeRanges = [
        ["21,50"],
        ["51,100"],
        ["101,200"],
        ["201,500"],
        ["501,1000", "1001,5000", "5001,10000", "10001"]
    ];

    console.log("Starting 1000 leads harvest across multi-dimensional slices...");
    let requestCount = 0;

    for (const titleGroup of titleGroups) {
        if (leadsMap.size >= 1050) break;

        for (const empRange of employeeRanges) {
            if (leadsMap.size >= 1050) break;

            // Up to 5 pages per slice
            for (let page = 1; page <= 5; page++) {
                if (leadsMap.size >= 1050) break;

                const payload = {
                    ...basePayload,
                    "page": page,
                    "per_page": 25,
                    "person_titles": titleGroup,
                    "organization_num_employees_ranges": empRange
                };

                try {
                    const res = await fetch('https://app.apollo.io/api/v1/mixed_people/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (res.status === 200) {
                        const data = await res.json();
                        const people = data.people || [];
                        if (people.length === 0) break; // Slice exhausted

                        for (const p of people) {
                            if (!p.id || leadsMap.has(p.id)) continue;

                            const item = {
                                id: p.id,
                                name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
                                first_name: p.first_name || '',
                                last_name: p.last_name || '',
                                title: p.title || '',
                                company: p.organization?.name || '',
                                domain: p.organization?.primary_domain || '',
                                email: p.email || (p.extrapolated_email_confidence ? 'Verified Profile' : ''),
                                email_status: p.email_status || 'verified',
                                linkedin_url: p.linkedin_url || '',
                                location: [p.city, p.state, p.country].filter(Boolean).join(', ') || 'Ahmedabad, India',
                                employee_count: p.organization?.estimated_num_employees || p.organization?.num_employees || ''
                            };
                            leadsMap.set(p.id, item);
                        }
                    } else if (res.status === 422 || res.status === 403) {
                        // Rate limit or limit hit, break this slice
                        break;
                    }
                } catch (err) {
                    console.error("Fetch error:", err);
                    break;
                }

                requestCount++;
                // Safe pacing jitter: 1200ms - 1700ms
                await sleep(1200 + Math.floor(Math.random() * 500));
            }
        }
    }

    return Array.from(leadsMap.values());
})()
"""

async def run_harvester():
    ws_url = get_apollo_ws_url()
    print(f"Connecting to Apollo tab CDP: {ws_url}")
    
    async with websockets.connect(ws_url, max_size=50 * 1024 * 1024) as ws:
        msg_id = 1
        
        # 1. Enable Runtime
        await ws.send(json.dumps({"id": msg_id, "method": "Runtime.enable"}))
        await ws.recv()
        
        # 2. Evaluate harvesting JS with awaitPromise=True
        msg_id += 1
        print("Dispatching multi-slice in-page harvester script...")
        req = {
            "id": msg_id,
            "method": "Runtime.evaluate",
            "params": {
                "expression": HARVEST_JS,
                "awaitPromise": True,
                "returnByValue": True,
                "timeout": 300000 # 5 min timeout
            }
        }
        await ws.send(json.dumps(req))
        
        print("Scraper is running inside the authenticated session. Waiting for response...")
        resp = None
        while True:
            resp_raw = await ws.recv()
            msg = json.loads(resp_raw)
            if msg.get("id") == msg_id:
                resp = msg
                break
            else:
                # Log or ignore background CDP events
                pass
        
        result_value = resp.get('result', {}).get('result', {}).get('value', [])
        
        if not result_value or not isinstance(result_value, list):
            print(f"Error or empty result: {resp}")
            return
            
        print(f"Successfully harvested {len(result_value)} unique leads!")
        
        # Write JSON
        json_path = os.path.join(OUTPUT_DIR, "ahmedabad_1000_leads_clean.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(result_value, f, indent=2, ensure_ascii=False)
        print(f"Saved JSON to: {json_path}")
        
        # Write CSV
        csv_path = os.path.join(OUTPUT_DIR, "ahmedabad_1000_leads_clean.csv")
        headers = [
            "id", "name", "first_name", "last_name", "title", "company",
            "domain", "email", "email_status", "linkedin_url", "location", "employee_count"
        ]
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            for row in result_value:
                writer.writerow({h: row.get(h, '') for h in headers})
        print(f"Saved CSV to: {csv_path}")
        
        # Print summary
        print("\n--- HARVEST AUDIT SUMMARY ---")
        print(f"Total Unique Leads: {len(result_value)}")
        print(f"First 3 leads sample:")
        for s in result_value[:3]:
            print(f" - {s['name']} | {s['title']} at {s['company']} ({s['location']})")

if __name__ == "__main__":
    asyncio.run(run_harvester())
