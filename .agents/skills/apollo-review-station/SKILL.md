---
name: apollo-review-station
description: Inspect, audit, simulate, and debug Apollo scraped leads and telemetry using the Review & Debug Station
---

# Apollo Review, Telemetry & Debug Station Skill

Use this skill when:
- Reviewing, filtering, or auditing harvested leads and companies
- Debugging extraction failures, circuit breaker trips, or pacing delays
- Simulating headcount brackets and dry-running Apollo query partitioning without credit burn
- Validating data quality, fill rates, and formula-safe CSV exports

## Workflows

### 1. Launching Local Review Station
Run the zero-dependency dev server:
```bash
node scripts/review_station_server.mjs --port 3456
```
- Access UI: `http://localhost:3456/review.html`
- Access State API: `http://localhost:3456/api/state`

### 2. Programmatic Lead Inspection & ICP Scoring
```javascript
import { calculateIcpScore, calculateAuditMetrics } from './extension/review.js';

// Calculate ICP Score & Explainable Signals
const lead = leads[0];
const icp = calculateIcpScore(lead);
console.log(`Lead: ${lead.name} | Score: ${icp.score} | Tier: ${icp.tier}`);

// Run Full Dataset Audit
const audit = calculateAuditMetrics(leads);
console.log(`Quality Index: ${audit.overallScore}% (${audit.healthRating})`);
console.log(`Verified Email Fill Rate: ${audit.fillRates.email}%`);
console.log(`Direct Phone Fill Rate: ${audit.fillRates.phone}%`);
console.log(`Deduplication Efficiency: ${audit.dedupRate}%`);
```

### 3. Dry-Run Slicer Simulation
```javascript
import { runSlicerSimulationLogic } from './extension/review.js';

const plan = runSlicerSimulationLogic(50000, 'infinite_drain');
console.log(`Total Partitions: ${plan.totalSlices}`);
console.log(`Estimated API Calls: ${plan.estRequests}`);
console.log(`Estimated Duration: ~${plan.estMinutes} minutes`);
```

### 4. Running Validation Tests
```bash
node --test tests/review_station.test.mjs
```
```bash
node --test tests/*.test.mjs
```
