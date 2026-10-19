#!/usr/bin/env node
/**
 * Apollo Universal Harvester — Standalone Review Station Dev Server
 *
 * Serves the review station UI (`extension/review.html`) and live API state
 * endpoint with zero external dependencies, allowing local browser testing,
 * headless scraping review, and telemetry inspection without unpacked extension loading.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const EXTENSION_DIR = path.join(ROOT_DIR, 'extension');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const DEFAULT_PORT = 3456;
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const PORT = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : DEFAULT_PORT;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

// Cached sample leads for API state
let cachedLeads = null;
function getSampleDataset() {
  if (cachedLeads) return cachedLeads;

  const candidateFiles = [
    path.join(DATA_DIR, 'page1_fresh_leads.json'),
    path.join(DATA_DIR, 'ahmedabad_1000_leads_clean.json')
  ];

  for (const file of candidateFiles) {
    if (fs.existsSync(file)) {
      try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (Array.isArray(raw)) {
          cachedLeads = raw;
          return cachedLeads;
        }
      } catch (e) {
        // Continue to next file
      }
    }
  }

  // Fallback to empty array
  return [];
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // Root redirect to review.html
  if (pathname === '/' || pathname === '/review') {
    pathname = '/review.html';
  }

  // API State Endpoint
  if (pathname === '/api/state') {
    const leads = getSampleDataset();
    const companies = [];
    const seenOrgs = new Set();

    leads.forEach(l => {
      const orgName = l.organization_name || l.company;
      if (orgName && !seenOrgs.has(orgName)) {
        seenOrgs.add(orgName);
        companies.push({
          id: l.organization_id || `org_${companies.length + 1}`,
          name: orgName,
          primary_domain: l.organization_primary_domain || '',
          industry: l.organization_industry || 'Technology',
          num_employees: l.organization_num_employees || '50-200',
          estimated_annual_revenue: l.organization_estimated_annual_revenue || '$10M-$50M',
          technologies: l.organization_technologies || 'React; Node.js; AWS'
        });
      }
    });

    const payload = {
      success: true,
      leads: leads,
      companies: companies,
      leadsCount: leads.length,
      companiesCount: companies.length,
      isHarvesting: false,
      harvestProgress: {
        harvestedCount: leads.length,
        targetLeads: 50000,
        currentSlice: 4,
        totalSlices: 24,
        status: 'Ready'
      },
      circuitBreaker: {
        tripped: false,
        reason: null
      },
      enrichmentStats: {
        pending: 0,
        inFlight: 0,
        enriched: companies.length
      },
      debugLogs: [
        { id: '1', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'INFO', message: 'Standalone dev server serving live dataset' },
        { id: '2', timestamp: new Date().toISOString(), type: 'INGEST', message: `Dataset hydrated with ${leads.length} leads and ${companies.length} companies` }
      ]
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(payload));
    return;
  }

  // Static File Serving from extension/
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(EXTENSION_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`\n===============================================================`);
    console.log(`🚀 Apollo Scraper — Universal Review & Debug Station`);
    console.log(`📡 URL: http://localhost:${PORT}/review.html`);
    console.log(`📊 State API: http://localhost:${PORT}/api/state`);
    console.log(`===============================================================\n`);
  });
}

export { server, PORT };
