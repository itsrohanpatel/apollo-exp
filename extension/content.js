/**
 * Apollo Lead Extractor - Content Script Controller
 * Coordinates HUD, Main-World Injected Engine, Slicer Core, and Background Worker.
 */

(async function () {
  console.log('[Apollo Extractor] Content Script Controller initializing...');

  let slicerCore;
  let hudModule;
  try {
    slicerCore = await import(chrome.runtime.getURL('slicer_core.js'));
    hudModule = await import(chrome.runtime.getURL('hud.js'));
  } catch (err) {
    console.error('[Apollo Extractor] Failed to dynamically import dependencies:', err);
    return;
  }

  const {
    parseApolloUrlHash,
    buildHashForSlice,
    buildPayloadForCabinet,
    resolveAdaptiveExecutionTree,
    resolveHarvestExecutionPlan,
    resolveExecutionBrackets,
    detectMaxEmployeesFromFilters,
    subdivideCabinet,
    DeduplicationStore,
    StandardModeDiagnosticLogger,
    generatePacingDelay,
    buildChunkedUnionCSV,
    buildChunkedCleanOutreachCSV,
    normalizePersonComprehensive,
    normalizeCompanyComprehensive,
    PREFERRED_PERSON_COLUMNS,
    PREFERRED_COMPANY_COLUMNS,
    CLEAN_OUTREACH_COLUMNS_28,
    HarvestTelemetryEstimator,
    shouldEarlyExitHarvest,
    DynamicTokenBucketPacer,
    BoundedConcurrencyPool
  } = slicerCore;
  const { ApolloHUD } = hudModule;

  console.log('[Apollo Extractor] Content Script Controller active.');

  let hud = null;
  let isHarvesting = false;
  let isPaused = false;
  let harvestAbort = false;
  let engineMode = 'turbo'; // 'turbo' | 'standard'
  let totalDuplicatesFiltered = 0;
  const dedupeStore = new DeduplicationStore();
  const diagnosticLogger = new StandardModeDiagnosticLogger();
  const pacer = new DynamicTokenBucketPacer();
  const concurrencyPool = new BoundedConcurrencyPool(3);

  let activeBatchResolver = null;
  const activeProbeResolvers = new Map();
  const activeDirectSearchResolvers = new Map();

  // 1. Inject Main-World Script (`injected.js`)
  function injectMainWorldScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
      console.log('[Apollo Extractor] Injected main-world script successfully');
    } catch (e) {
      console.error('[Apollo Extractor] Failed to inject main-world script:', e);
    }
  }

  // 2. Inject CSS Stylesheet
  function injectStyles(file) {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = chrome.runtime.getURL(file);
      (document.head || document.documentElement).appendChild(link);
    } catch (e) {}
  }

  injectStyles('hud.css');
  injectMainWorldScript();

  // 3. Listen to messages from Main-World (`injected.js`)
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'APOLLO_NATIVE_SEARCH_RESPONSE') {
      const searchData = event.data.data;
      if (activeBatchResolver) {
        const r = activeBatchResolver;
        activeBatchResolver = null;
        r(searchData);
      }
    }

    if (event.data.type === 'APOLLO_PROBE_DENSITY_RESULT') {
      const resolver = activeProbeResolvers.get(event.data.requestId);
      if (resolver) {
        activeProbeResolvers.delete(event.data.requestId);
        resolver(event.data.success ? (typeof event.data.total === 'number' ? event.data.total : 0) : null);
      }
    }

    if (event.data.type === 'APOLLO_DIRECT_SEARCH_PAGE_RESULT') {
      const resolver = activeDirectSearchResolvers.get(event.data.requestId);
      if (resolver) {
        activeDirectSearchResolvers.delete(event.data.requestId);
        resolver(event.data);
      }
    }
  });

  // Restore stored engine mode
  try {
    chrome.storage.local.get(['apollo_engine_mode'], (res) => {
      if (res && res.apollo_engine_mode) {
        engineMode = res.apollo_engine_mode;
        if (hud) hud.setEngineMode(engineMode);
      }
    });
  } catch (e) {}

  function fetchDirectSearchPage(payload, page = 1, sort = null, timeoutMs = 12000) {
    return new Promise((resolve) => {
      const requestId = 'direct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const timer = setTimeout(() => {
        if (activeDirectSearchResolvers.has(requestId)) {
          activeDirectSearchResolvers.delete(requestId);
          resolve({ success: false, error: 'TIMEOUT', status: 0 });
        }
      }, timeoutMs);

      activeDirectSearchResolvers.set(requestId, (res) => {
        clearTimeout(timer);
        resolve(res);
      });

      window.postMessage({
        type: 'APOLLO_DIRECT_SEARCH_PAGE',
        requestId,
        payload,
        page,
        sort
      }, '*');
    });
  }

  function waitForBatch(timeoutMs = 12000) {
    return new Promise((resolve) => {
      activeBatchResolver = resolve;
      setTimeout(() => {
        if (activeBatchResolver === resolve) {
          activeBatchResolver = null;
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  function extractDOMFallback() {
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.data?.type === 'APOLLO_DOM_LEADS_RESULT') {
          window.removeEventListener('message', handler);
          resolve({
            leads: e.data.leads || [],
            forensics: e.data.forensics || null
          });
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'APOLLO_REQUEST_DOM_EXTRACTION' }, '*');
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({ leads: [], forensics: null });
      }, 1500);
    });
  }

  function fetchDOMForensics() {
    return new Promise((resolve) => {
      const requestId = 'forensics_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const handler = (e) => {
        if (e.data?.type === 'APOLLO_DOM_FORENSICS_RESULT' && e.data.requestId === requestId) {
          window.removeEventListener('message', handler);
          resolve(e.data.forensics || null);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'APOLLO_CAPTURE_DOM_FORENSICS', requestId }, '*');
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 1000);
    });
  }

  async function probeDensity(filters, attempt = 1) {
    while (isPaused && !harvestAbort) {
      if (hud) hud.setStatus('⏸ Density Probing paused by operator');
      await new Promise(r => setTimeout(r, 200));
    }
    if (harvestAbort) return null;

    const result = await new Promise((resolve) => {
      const requestId = 'probe_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const currentHash = window.location.hash || '';
      const basePayload = parseApolloUrlHash(currentHash);
      const fullPayload = {
        ...basePayload,
        ...filters,
        page: 1,
        per_page: 30,
        display_mode: 'metadata_mode',
        open_factor_names: [],
        num_fetch_result: 30
      };
      if (basePayload.organization_linkedin_urls) {
        fullPayload.organization_linkedin_urls = basePayload.organization_linkedin_urls;
        fullPayload.q_organization_linkedin_urls = basePayload.organization_linkedin_urls;
      }
      if (basePayload.person_linkedin_urls) {
        fullPayload.person_linkedin_urls = basePayload.person_linkedin_urls;
        fullPayload.q_person_linkedin_urls = basePayload.person_linkedin_urls;
      }
      if (basePayload.person_not_linkedin_urls) {
        fullPayload.person_not_linkedin_urls = basePayload.person_not_linkedin_urls;
      }

      const timer = setTimeout(() => {
        if (activeProbeResolvers.has(requestId)) {
          activeProbeResolvers.delete(requestId);
          resolve(null);
        }
      }, 12000);

      activeProbeResolvers.set(requestId, (total) => {
        clearTimeout(timer);
        resolve(total);
      });

      window.postMessage({
        type: 'APOLLO_PROBE_DENSITY',
        requestId,
        payload: fullPayload
      }, '*');
    });

    while (isPaused && !harvestAbort) {
      if (hud) hud.setStatus('⏸ Density Probing paused by operator');
      await new Promise(r => setTimeout(r, 200));
    }
    if (harvestAbort) return null;

    if (result === null && attempt < 2 && !harvestAbort) {
      console.warn('[Apollo Extractor] Density probe timed out or failed. Retrying once with 1500ms jitter...');
      await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 500)));
      return probeDensity(filters, attempt + 1);
    }

    return result;
  }

  // 4. Initialize HUD
  function ensureHUD() {
    if (!hud) {
      hud = new ApolloHUD({
        engineMode,
        onEngineModeChange: (mode) => {
          engineMode = mode;
          try {
            chrome.storage.local.set({ apollo_engine_mode: mode });
          } catch (e) {}
        },
        onStart: () => {
          runHarvest({ targetLeadLimit: 50000, engineMode });
        },
        onPause: () => { isPaused = true; },
        onResume: () => { isPaused = false; },
        onStopAndExport: () => {
          harvestAbort = true;
          exportCollectedLeads();
        },
        onExportCompanyCSV: () => {
          exportCompanyCSV();
        },
        onExportDiagnostics: () => {
          exportDiagnosticReport();
        }
      });
    }
    return hud;
  }

  // 5. Execute Autonomous Harvest Flow with Adaptive Bisection AI
  async function runHarvest(config = {}) {
    if (isHarvesting) return;
    isHarvesting = true;
    harvestAbort = false;
    isPaused = false;
    totalDuplicatesFiltered = 0;
    diagnosticLogger.clear();
    if (hud) hud.updateDiscrepancy(0);

    if (config.engineMode) {
      engineMode = config.engineMode;
      if (hud) hud.setEngineMode(engineMode);
    }

    try {
      ensureHUD();
      hud.setPhase('probing');
      hud.setHarvestState('running');
      hud.setStatus(engineMode === 'turbo'
        ? '⚡ Turbo Probing search tree with concurrent worker pool...'
        : '🔍 Probing search tree for 100% lead coverage...');

    // Guarantee entire search starts in authentic Company A -> Z sort order
    window.postMessage({
      type: 'APOLLO_SET_SORT',
      sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: true }
    }, '*');

    const currentHash = window.location.hash || '';
    const baseFilters = parseApolloUrlHash(currentHash);
    const targetLeadLimit = config.targetLeadLimit || 10000;
    const maxEmployees = detectMaxEmployeesFromFilters(baseFilters, config);

    if (typeof maxEmployees === 'number' && maxEmployees > 0) {
      console.log(`[Apollo Extractor] Enforcing max employee constraint: ≤ ${maxEmployees} employees.`);
      hud.setStatus(`⚡ Headcount constraint active: max ${maxEmployees} employees.`);
    }

    // Extract current visible total leads from DOM if present
    let initialTotal = null;
    try {
      const totalEl = document.querySelector('[data-cy="finder-total-records"]');
      if (totalEl) {
        const n = parseInt(totalEl.innerText.replace(/,/g, '').trim(), 10);
        if (!isNaN(n)) initialTotal = n;
      }
      if (initialTotal === null) {
        const textMatch = document.body.innerText.match(/\d+\s*(?:to|-)\s*\d+\s*of\s*([\d,]+)/i);
        if (textMatch && textMatch[1]) {
          const n = parseInt(textMatch[1].replace(/,/g, '').trim(), 10);
          if (!isNaN(n)) initialTotal = n;
        }
      }
    } catch (e) {}

    let cabinets = [];
    try {
      const preflightStartTime = Date.now();
      const auditLog = [];

      // Concurrency ceiling of 4 for preflight metadata probing
      const probeConcurrencyPool = new BoundedConcurrencyPool(4);
      const activeProbeFn = (filters, attempt) => probeConcurrencyPool.run(() => probeDensity(filters, attempt));

      const activeProbePacing = engineMode === 'turbo'
        ? { minDelay: 80, maxDelay: 180, zeroMinDelay: 40, zeroMaxDelay: 80 }
        : { minDelay: 250, maxDelay: 400, zeroMinDelay: 100, zeroMaxDelay: 200 };

      const treeResult = await resolveAdaptiveExecutionTree(activeProbeFn, baseFilters, {
        maxLeadsPerCabinet: 150,
        initialTotal,
        maxEmployees,
        decomposeEnterprise: true,
        remainderPruning: true,
        detailed: true,
        auditLog,
        sleepFn: sleepWithCountdown,
        isAborted: () => harvestAbort,
        isPaused: () => isPaused,
        probePacing: activeProbePacing,
        onProbeProgress: (p) => {
          if (isPaused) return;
          if (p.type === 'BRACKET_PROBE') {
            hud.setStatus(`🔍 Probing [${p.label}]: ${p.total} leads found...`);
          } else if (p.type === 'SENIORITY_PROBE') {
            hud.setStatus(`🔍 Probing [${p.label}]: ${p.total} leads...`);
          } else if (p.type === 'EMAIL_PROBE') {
            hud.setStatus(`🔍 Probing [${p.label}]: ${p.total} leads...`);
          } else if (p.type === 'ZERO_RESULT_DWELL') {
            hud.setStatus(`⚡ [${p.label}] has 0 leads. Stealth dwell...`);
          } else if (p.type === 'REMAINDER_PRUNE') {
            hud.setStatus(`⚡ Pruned tail seniorities [${p.label}] (${p.skippedCount} probes saved)...`);
          }
        }
      });

      cabinets = Array.isArray(treeResult) ? treeResult : (treeResult?.cabinets || []);
      const probesPrunedByMath = treeResult?.probesPrunedByMath || 0;
      const preflightDurationMs = Date.now() - preflightStartTime;

      diagnosticLogger.recordPreflightTelemetry({
        startTime: new Date(preflightStartTime).toISOString(),
        durationMs: preflightDurationMs,
        engineMode,
        totalProbesExecuted: auditLog.filter(a => a.type && a.type.includes('PROBE')).length,
        probesPrunedByMath,
        cabinetsPlanned: cabinets.length,
        totalPredictedLeads: cabinets.reduce((sum, c) => sum + (typeof c.total === 'number' ? c.total : 0), 0),
        cabinets,
        auditLog
      });
    } catch (e) {
      console.warn('[Apollo Extractor] Adaptive tree resolution error, falling back to macro brackets:', e);
    }

    if (harvestAbort) {
      console.log('[Apollo Extractor] Density probing cancelled/stopped by operator.');
      if (hud) {
        hud.setHarvestState('idle');
        hud.setStatus('Density probing cancelled by operator.');
      }
      isHarvesting = false;
      return;
    }

    const isOpenRange = (b) => typeof b === 'string' && (b.endsWith(',') || b.endsWith('+') || b.startsWith(','));
    if (!cabinets || (cabinets.length === 0 && !(typeof maxEmployees === 'number' && maxEmployees > 0)) || (cabinets.length === 1 && isOpenRange(cabinets[0].bracket?.[0]))) {
      if (typeof initialTotal === 'number' && initialTotal <= 300) {
        cabinets = [{
          label: 'All Matching Leads',
          bracket: null,
          seniority: null,
          emailStatus: null,
          total: initialTotal,
          pagesNeeded: Math.min(5, Math.ceil(initialTotal / 30)),
          mode: initialTotal <= 150 ? 'Top-Down Only' : 'Bidirectional'
        }];
      } else {
        const rawBrackets = resolveExecutionBrackets(baseFilters, { granular: true, maxEmployees });
        cabinets = rawBrackets.map(b => ({
          label: Array.isArray(b) ? b[0] : String(b),
          bracket: Array.isArray(b) ? b : [String(b)],
          seniority: null,
          emailStatus: null,
          mode: 'Bidirectional'
        }));
      }
    }

    let totalSlices = cabinets.length;

    const telemetry = new HarvestTelemetryEstimator({
      engineMode,
      defaultLatencyMs: engineMode === 'turbo' ? 350 : 1800,
      defaultPacingMs: engineMode === 'turbo' ? 120 : 2750,
      enableCooldown: false
    });

    const getEstimatedRemainingPages = (currIdx, currPage, isPass2 = false) => {
      const currCab = cabinets[currIdx];
      let remCurr = 0;
      if (currCab) {
        const cabTotal = (typeof currCab.total === 'number' && currCab.total > 0) ? currCab.total : null;
        if (cabTotal !== null) {
          const totalPagesNeeded = Math.min(10, Math.ceil(cabTotal / 30));
          remCurr = Math.max(0, totalPagesNeeded - currPage);
        } else {
          remCurr = isPass2 ? Math.max(0, 5 - currPage) : (Math.max(0, 5 - currPage) + 4);
        }
      }

      let rem = remCurr;
      for (let j = currIdx + 1; j < cabinets.length; j++) {
        const c = cabinets[j];
        if (typeof c.total === 'number' && c.total > 0) {
          rem += Math.min(10, Math.ceil(c.total / 30));
        } else {
          rem += (c.mode === 'Bidirectional' ? 8 : 5);
        }
      }
      return rem;
    };

    const initialRemPages = getEstimatedRemainingPages(0, 0, false);
    let currentEtaSeconds = telemetry.estimateRemainingSeconds(initialRemPages, totalSlices);
    let currentEta = HarvestTelemetryEstimator.formatETA(currentEtaSeconds);
    let currentLatencyMs = engineMode === 'turbo' ? 350 : 1800;
    let currentIsSpike = false;

    hud.updateProgress({
      totalSlices,
      sliceIdx: 1,
      totalLeads: dedupeStore.size(),
      eta: currentEta,
      etaSeconds: currentEtaSeconds,
      latencyMs: currentLatencyMs,
      isLatencySpike: currentIsSpike
    });

    hud.setPhase('harvest');
    hud.setHarvestState('running');
    hud.setStatus(`⚡ Starting live harvest across ${totalSlices} cabinets...`);

    for (let i = 0; i < cabinets.length; i++) {
      if (harvestAbort || dedupeStore.size() >= targetLeadLimit) break;

      while (isPaused && !harvestAbort) {
        await new Promise(r => setTimeout(r, 500));
      }

      const cabinet = cabinets[i];
      const sliceLabel = cabinet.label || (cabinet.bracket ? `Headcount: ${cabinet.bracket[0]}` : `Slice ${i + 1}`);
      let sliceTotal = cabinet.total || null;
      let sliceHarvested = 0;
      let wasSubdivided = false;
      let wasEmpty = false;
      const cabinetSeenIds = new Set();

      hud.updateProgress({
        sliceIdx: i + 1,
        totalSlices,
        sliceLabel,
        passLabel: 'Pass 1 (A-Z)',
        sliceHarvested,
        totalLeads: dedupeStore.size(),
        eta: currentEta,
        etaSeconds: currentEtaSeconds,
        latencyMs: currentLatencyMs,
        isLatencySpike: currentIsSpike
      });

      // --- PASS 1: Company Ascending (A -> Z) ---
      // Pre-Cabinet Sort Guard: Force sort_ascending: true before Pass 1 to prevent reverse-bleed from prior cabinets
      window.postMessage({
        type: 'APOLLO_SET_SORT',
        sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: true }
      }, '*');

      let pass1Done = false;
      let pass1Exhausted = false;
      for (let page = 1; page <= 5; page++) {
        if (harvestAbort || dedupeStore.size() >= targetLeadLimit) break;
        while (isPaused && !harvestAbort) await new Promise(r => setTimeout(r, 500));

        hud.setStatus(`Scanning Pass 1 (A-Z) Page ${page}/5 for [${sliceLabel}]...`);
        hud.updateProgress({
          sliceIdx: i + 1,
          totalSlices,
          sliceLabel,
          passLabel: `Pass 1: A-Z (p${page})`,
          sliceHarvested,
          sliceTotal,
          totalLeads: dedupeStore.size(),
          eta: currentEta,
          etaSeconds: currentEtaSeconds,
          latencyMs: currentLatencyMs,
          isLatencySpike: currentIsSpike
        });

        let data = null;
        let lastHeaders1 = null;

        if (engineMode === 'turbo') {
          const reqStart1 = performance.now();
          const sortParam = { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: true };
          const payload1 = buildPayloadForCabinet(baseFilters, cabinet, sortParam, page);
          const directRes = await fetchDirectSearchPage(payload1, page, sortParam);
          const reqLatencyMs1 = Math.round(performance.now() - reqStart1);
          telemetry.recordRequest(reqLatencyMs1);

          if (directRes && directRes.success && directRes.data) {
            data = directRes.data;
            lastHeaders1 = directRes.headers || null;
          } else {
            console.warn(`[Apollo Extractor] Turbo direct fetch failed on Pass 1 p${page} (${directRes?.error || 'Unknown'}). Falling back to standard DOM navigation...`);
            const waitPromise = waitForBatch();
            if (page === 1) {
              const newHash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', true);
              window.postMessage({
                type: 'APOLLO_NAVIGATE_HASH',
                hash: newHash,
                sort: sortParam,
                resetPage1: true
              }, '*');
              window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: 1 }, '*');
            } else {
              window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: page }, '*');
            }
            data = await waitPromise;
          }
        } else {
          const waitPromise = waitForBatch();
          if (page === 1) {
            const newHash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', true);
            window.postMessage({
              type: 'APOLLO_NAVIGATE_HASH',
              hash: newHash,
              sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: true },
              resetPage1: true
            }, '*');
            window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: 1 }, '*');
          } else {
            window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: page }, '*');
          }

          const reqStart1 = performance.now();
          data = await waitPromise;
          const reqLatencyMs1 = Math.round(performance.now() - reqStart1);
          telemetry.recordRequest(reqLatencyMs1);
        }

        const remPages1 = getEstimatedRemainingPages(i, page, false);
        currentEtaSeconds = telemetry.estimateRemainingSeconds(remPages1, cabinets.length - i);
        currentEta = HarvestTelemetryEstimator.formatETA(currentEtaSeconds);
        const spikeInfo1 = telemetry.getLatencySpikeStatus();
        currentLatencyMs = spikeInfo1.avgLatencyMs;
        currentIsSpike = spikeInfo1.isSpike;

        let usedDomFallback1 = false;
        let domForensics1 = null;
        if (!data) {
          const domRes = await extractDOMFallback();
          const domLeads = domRes.leads || [];
          domForensics1 = domRes.forensics || null;
          if (domLeads && domLeads.length > 0) {
            data = { people: domLeads };
            usedDomFallback1 = true;
          } else {
            console.warn(`[Apollo Extractor] Timeout on page ${page}. Continuing.`);
            break;
          }
        }

        if (data.pagination?.total_entries !== undefined) {
          sliceTotal = data.pagination.total_entries;
        }

        if (page === 1 && typeof sliceTotal === 'number') {
          // 1. Short-circuit empty cabinet immediately
          if (sliceTotal === 0) {
            hud.setStatus(`⚡ Cabinet [${sliceLabel}] has 0 leads. Advancing to next...`);
            wasEmpty = true;
            pass1Done = true;
            break;
          }

          // 2. Dynamic Runtime Cabinet Reduction
          // If total entries exceed 300 (max reachable with bidirectional sort), subdivide cabinet!
          // Bounded recursion: Stop if depth >= 6 or leaf criteria reached (subdepartment, untagged, coalesced bin, preflight)
          if (sliceTotal > 300 && !cabinet.subdepartment && !cabinet.isUntagged && !cabinet._leaf && !cabinet.isGrouped && !cabinet._preflight && (cabinet._subdivisionDepth || 0) < 6) {
            const currentDepth = (cabinet._subdivisionDepth || 0) + 1;
            const subCabinets = subdivideCabinet(cabinet, sliceTotal, { baseFilters });
            if (subCabinets && subCabinets.length > 1) {
              subCabinets.forEach(sub => {
                sub._subdivisionDepth = currentDepth;
                if (currentDepth >= 6 || sub.subdepartment || sub.isUntagged || sub.isGrouped) {
                  sub._leaf = true;
                }
              });
              console.log(`[Apollo Extractor] ⚡ Cabinet [${sliceLabel}] has ${sliceTotal} leads (> 300 limit). Subdividing into ${subCabinets.length} sub-cabinets at depth ${currentDepth}:`, subCabinets.map(s => s.label));
              cabinets.splice(i, 1, ...subCabinets);
              totalSlices = cabinets.length;
              hud.setStatus(`⚡ Subdivided [${sliceLabel}] (${sliceTotal} leads) into ${subCabinets.length} sub-cabinets...`);
              hud.updateProgress({
                totalSlices,
                sliceIdx: i + 1,
                totalLeads: dedupeStore.size(),
                eta: currentEta,
                etaSeconds: currentEtaSeconds,
                latencyMs: currentLatencyMs,
                isLatencySpike: currentIsSpike
              });
              wasSubdivided = true;
              i--;
              pass1Done = true;
              break;
            }
          }
        }

        const rawPeople = data.people || [];
        if (rawPeople.length < 30) {
          pass1Exhausted = true;
        }

        const people = rawPeople;

        let cabinetOverlapsInPage = 0;
        let addedInPage = 0;
        for (const person of people) {
          const id = person.id || person._id || person.email || person.name;
          if (id && cabinetSeenIds.has(id)) {
            cabinetOverlapsInPage++;
          } else if (id) {
            cabinetSeenIds.add(id);
          }
          if (dedupeStore.add(person)) {
            addedInPage++;
            sliceHarvested++;
          }
        }

        const exitDecision1 = shouldEarlyExitHarvest({
          isPass2: false,
          page,
          sliceHarvested,
          sliceTotal,
          addedInPage,
          rawPeopleCount: rawPeople.length,
          cabinetOverlapsInPage
        });

        const delay = engineMode === 'turbo'
          ? pacer.calculateDelay({
              remainingQuota: lastHeaders1?.remainingQuota,
              status: lastHeaders1 ? 200 : 200,
              retryAfterSeconds: lastHeaders1?.retryAfterSeconds
            })
          : generatePacingDelay(2000, 3200);
        totalDuplicatesFiltered += Math.max(0, people.length - addedInPage);

        const expectedCount1 = (typeof sliceTotal === 'number' && sliceTotal > 0)
          ? Math.min(30, Math.max(0, sliceTotal - (page - 1) * 30))
          : 30;

        let pageForensics1 = domForensics1;
        if (rawPeople.length < expectedCount1 && !pageForensics1 && engineMode === 'standard') {
          pageForensics1 = await fetchDOMForensics();
        }

        const trace1 = diagnosticLogger.recordPageTrace({
          sliceLabel,
          sliceIdx: i + 1,
          page,
          passLabel: 'Pass 1 (A-Z)',
          urlHash: window.location.hash || '',
          source: (engineMode === 'turbo' && !usedDomFallback1) ? 'NETWORK' : 'DOM_FALLBACK',
          expectedCount: expectedCount1,
          rawCount: rawPeople.length,
          addedCount: addedInPage,
          duplicatesFiltered: Math.max(0, people.length - addedInPage),
          domForensics: pageForensics1
        });

        if (trace1 && trace1.isDiscrepancy) {
          console.warn(`[Apollo Diagnostic] ⚠️ Discrepancy on [${sliceLabel}] Pass 1 p${page}: raw ${trace1.rawCount} < expected ${trace1.expectedCount}`);
          if (hud) hud.updateDiscrepancy(diagnosticLogger.getDiscrepanciesCount());
        }

        hud.updateProgress({
          sliceIdx: i + 1,
          totalSlices,
          sliceLabel,
          passLabel: `Pass 1: A-Z (p${page})`,
          sliceHarvested,
          sliceTotal,
          totalLeads: dedupeStore.size(),
          eta: currentEta,
          etaSeconds: currentEtaSeconds,
          latencyMs: currentLatencyMs,
          isLatencySpike: currentIsSpike
        });

        // Store incrementally in background
        if (people.length > 0) {
          chrome.runtime.sendMessage({
            type: 'APOLLO_SAVE_BATCH',
            leads: people
          });
        }

        if (exitDecision1.shouldExit) {
          pass1Done = true;
          if (hud && typeof hud.flashEarlyExit === 'function') {
            hud.flashEarlyExit(exitDecision1.status === 'EARLY_EXIT_CABINET_COMPLETE' ? 'Target Reached (Cabinet Complete)' : 'Sweep Convergence');
          }
          break;
        }

        // Pacing delay
        telemetry.recordPacing(delay);
        await sleepWithCountdown(delay);
      }

      if (wasEmpty || wasSubdivided) {
        continue;
      }

      // --- DUAL-SORT CAPACITY BOOST (Pass 2: Z-A) ---
      // Auto-skipping Z-A disabled: every non-empty cabinet executes Pass 2 (Z-A) to capture the opposite end of the alphabet.
      // If all leads on Z-A were already collected in Pass 1, sweep convergence will early-exit safely after verifying page 1.
      const shouldRunPass2 = sliceHarvested > 0 || (typeof sliceTotal === 'number' && sliceTotal > 0);
      if (!harvestAbort && shouldRunPass2 && dedupeStore.size() < targetLeadLimit) {
        hud.setStatus(`⚡ Capacity Boost: Executing Pass 2 (Z-A) for [${sliceLabel}]...`);
        hud.updateProgress({
          sliceIdx: i + 1,
          totalSlices,
          sliceLabel,
          passLabel: 'Pass 2 (Z-A)',
          sliceHarvested,
          sliceTotal,
          totalLeads: dedupeStore.size(),
          eta: currentEta,
          etaSeconds: currentEtaSeconds,
          latencyMs: currentLatencyMs,
          isLatencySpike: currentIsSpike
        });

        // Pre-Cabinet Sort Guard: Force sort_ascending: false before Pass 2
        window.postMessage({
          type: 'APOLLO_SET_SORT',
          sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: false }
        }, '*');

        for (let page = 1; page <= 5; page++) {
          if (harvestAbort || dedupeStore.size() >= targetLeadLimit) break;
          while (isPaused && !harvestAbort) await new Promise(r => setTimeout(r, 500));

          hud.setStatus(`Scanning Pass 2 (Z-A) Page ${page}/5 for [${sliceLabel}]...`);
          hud.updateProgress({
            sliceIdx: i + 1,
            totalSlices,
            sliceLabel,
            passLabel: `Pass 2: Z-A (p${page})`,
            sliceHarvested,
            sliceTotal,
            totalLeads: dedupeStore.size(),
            eta: currentEta,
            etaSeconds: currentEtaSeconds,
            latencyMs: currentLatencyMs,
            isLatencySpike: currentIsSpike
          });
          let data = null;
          let lastHeaders2 = null;

          if (engineMode === 'turbo') {
            const reqStart2 = performance.now();
            const sortParam = { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: false };
            const payload2 = buildPayloadForCabinet(baseFilters, cabinet, sortParam, page);
            const directRes = await fetchDirectSearchPage(payload2, page, sortParam);
            const reqLatencyMs2 = Math.round(performance.now() - reqStart2);
            telemetry.recordRequest(reqLatencyMs2);

            if (directRes && directRes.success && directRes.data) {
              data = directRes.data;
              lastHeaders2 = directRes.headers || null;
            } else {
              console.warn(`[Apollo Extractor] Turbo direct fetch failed on Pass 2 p${page} (${directRes?.error || 'Unknown'}). Falling back to standard DOM navigation...`);
              const waitPromise = waitForBatch();
              if (page === 1) {
                const newHash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', false);
                window.postMessage({
                  type: 'APOLLO_NAVIGATE_HASH',
                  hash: newHash,
                  sort: sortParam,
                  resetPage1: true
                }, '*');
                window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: 1 }, '*');
              } else {
                window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: page }, '*');
              }
              data = await waitPromise;
            }
          } else {
            const waitPromise = waitForBatch();
            if (page === 1) {
              const newHash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', false);
              window.postMessage({
                type: 'APOLLO_NAVIGATE_HASH',
                hash: newHash,
                sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: false },
                resetPage1: true
              }, '*');
              window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: 1 }, '*');
            } else {
              window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: page }, '*');
            }

            const reqStart2 = performance.now();
            data = await waitPromise;
            const reqLatencyMs2 = Math.round(performance.now() - reqStart2);
            telemetry.recordRequest(reqLatencyMs2);
          }

          const remPages2 = getEstimatedRemainingPages(i, page, true);
          currentEtaSeconds = telemetry.estimateRemainingSeconds(remPages2, cabinets.length - i);
          currentEta = HarvestTelemetryEstimator.formatETA(currentEtaSeconds);
          const spikeInfo2 = telemetry.getLatencySpikeStatus();
          currentLatencyMs = spikeInfo2.avgLatencyMs;
          currentIsSpike = spikeInfo2.isSpike;

          let usedDomFallback2 = false;
          let domForensics2 = null;
          if (!data) {
            const domRes = await extractDOMFallback();
            const domLeads = domRes.leads || [];
            domForensics2 = domRes.forensics || null;
            if (domLeads && domLeads.length > 0) {
              data = { people: domLeads };
              usedDomFallback2 = true;
            } else {
              break;
            }
          }

          const rawPeople = data.people || [];
          const people = rawPeople;

          let cabinetOverlapsInPage = 0;
          let addedInPage = 0;
          for (const person of people) {
            const id = person.id || person._id || person.email || person.name;
            if (id && cabinetSeenIds.has(id)) {
              cabinetOverlapsInPage++;
            } else if (id) {
              cabinetSeenIds.add(id);
            }
            if (dedupeStore.add(person)) {
              addedInPage++;
              sliceHarvested++;
            }
          }

          const exitDecision2 = shouldEarlyExitHarvest({
            isPass2: true,
            page,
            sliceHarvested,
            sliceTotal,
            addedInPage,
            rawPeopleCount: rawPeople.length,
            cabinetOverlapsInPage
          });

          const delay = engineMode === 'turbo'
          ? pacer.calculateDelay({
              remainingQuota: lastHeaders2?.remainingQuota,
              status: lastHeaders2 ? 200 : 200,
              retryAfterSeconds: lastHeaders2?.retryAfterSeconds
            })
          : generatePacingDelay(2000, 3200);
          totalDuplicatesFiltered += Math.max(0, people.length - addedInPage);

        const expectedCount2 = (typeof sliceTotal === 'number' && sliceTotal > 0)
          ? Math.min(30, Math.max(0, sliceTotal - (page - 1) * 30))
          : 30;

        let pageForensics2 = domForensics2;
        if (rawPeople.length < expectedCount2 && !pageForensics2 && engineMode === 'standard') {
          pageForensics2 = await fetchDOMForensics();
        }

        const trace2 = diagnosticLogger.recordPageTrace({
          sliceLabel,
          sliceIdx: i + 1,
          page,
          passLabel: 'Pass 2 (Z-A)',
          urlHash: window.location.hash || '',
          source: (engineMode === 'turbo' && !usedDomFallback2) ? 'NETWORK' : 'DOM_FALLBACK',
          expectedCount: expectedCount2,
          rawCount: rawPeople.length,
          addedCount: addedInPage,
          duplicatesFiltered: Math.max(0, people.length - addedInPage),
          domForensics: pageForensics2
        });

        if (trace2 && trace2.isDiscrepancy) {
          console.warn(`[Apollo Diagnostic] ⚠️ Discrepancy on [${sliceLabel}] Pass 2 p${page}: raw ${trace2.rawCount} < expected ${trace2.expectedCount}`);
          if (hud) hud.updateDiscrepancy(diagnosticLogger.getDiscrepanciesCount());
        }

          hud.updateProgress({
            sliceIdx: i + 1,
            totalSlices,
            sliceLabel,
            passLabel: `Pass 2: Z-A (p${page})`,
            sliceHarvested,
            sliceTotal,
            totalLeads: dedupeStore.size(),
            eta: currentEta,
            etaSeconds: currentEtaSeconds,
            latencyMs: currentLatencyMs,
            isLatencySpike: currentIsSpike
          });

          if (people.length > 0) {
            chrome.runtime.sendMessage({
              type: 'APOLLO_SAVE_BATCH',
              leads: people
            });
          }

          if (exitDecision2.shouldExit) {
            if (hud && typeof hud.flashEarlyExit === 'function') {
              hud.flashEarlyExit(exitDecision2.status === 'EARLY_EXIT_SWEEP_CONVERGENCE' ? 'Sweep Converged (All Seen)' : 'Zero Fresh Leads');
            }
            break;
          }

          telemetry.recordPacing(delay);
          await sleepWithCountdown(delay);
        }
      }

      telemetry.recordPacing(1500);
      await sleepWithCountdown(1500);
    }

    isHarvesting = false;
    hud.setHarvestState('completed');
    hud.setStatus(`✅ Harvest Finished! Captured ${dedupeStore.size()} unique leads.`);
    hud.updateProgress({ passLabel: 'Completed', sliceIdx: totalSlices, totalSlices, eta: 'Complete', etaSeconds: 0 });

    // Display celebratory completion scorecard
    const harvestStart = hud?.startTime || Date.now();
    const elapsedMinutes = Math.max(0.1, (Date.now() - harvestStart) / 60000);
    const avgSpeed = Math.round(dedupeStore.size() / elapsedMinutes);
    const totalExpectedInCabinets = cabinets.reduce((sum, c) => sum + (typeof c.total === 'number' ? c.total : 0), 0);
    const eff = totalExpectedInCabinets > 0
      ? `${Math.min(100, (dedupeStore.size() / totalExpectedInCabinets * 100)).toFixed(1)}%`
      : '100%';
    const durationFormatted = HarvestTelemetryEstimator.formatETA(Math.round((Date.now() - harvestStart) / 1000));

    if (hud && typeof hud.showCompletionScorecard === 'function') {
      hud.showCompletionScorecard({
        totalHarvested: dedupeStore.size(),
        efficiency: eff,
        speed: `${avgSpeed}/m`,
        duplicatesFiltered: totalDuplicatesFiltered,
        duration: durationFormatted
      });
    }

    // Auto-trigger clean outreach leads export
    exportCollectedLeads();
  } catch (err) {
    console.error('[Apollo Extractor] Unhandled error during harvest execution:', err);
    if (hud) {
      hud.setHarvestState('idle');
      hud.setStatus(`⚠️ Error: ${err.message || 'Harvest failed'}`);
    }
  } finally {
    isHarvesting = false;
  }
}

  async function sleepWithCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    let remainingMs = ms;
    while (remainingMs > 0 && !harvestAbort) {
      while (isPaused && !harvestAbort) {
        if (hud) {
          const pauseMsg = hud.currentPhase === 'probing'
            ? '⏸ Density Probing paused by operator'
            : '⏸ Harvest paused by operator';
          hud.setStatus(pauseMsg);
        }
        await new Promise(r => setTimeout(r, 200));
      }
      if (harvestAbort) break;
      const tick = Math.min(remainingMs, 200);
      await new Promise(r => setTimeout(r, tick));
      remainingMs -= tick;
      if (hud) {
        const currentSec = Math.ceil(remainingMs / 1000);
        hud.setPacingTimer(currentSec, totalSec);
      }
    }
    if (hud) hud.setPacingTimer(0, totalSec);
  }

  function exportCompanyCSV() {
    const allLeads = dedupeStore.getAll();
    const orgMap = new Map();
    for (const lead of allLeads) {
      const org = lead.organization;
      if (org && (org.id || org.name)) {
        const key = org.id || org.name;
        if (!orgMap.has(key)) orgMap.set(key, org);
      }
    }
    const companies = Array.from(orgMap.values());
    if (companies.length === 0) {
      alert('No company records found in collected leads.');
      return;
    }
    const normalized = companies.map(c => typeof normalizeCompanyComprehensive === 'function' ? normalizeCompanyComprehensive(c) : c);
    const csvContent = buildChunkedUnionCSV(normalized, PREFERRED_COMPANY_COLUMNS);
    chrome.runtime.sendMessage({
      type: 'APOLLO_DOWNLOAD_CSV',
      csv: csvContent,
      filename: `apollo_companies_${companies.length}_${Date.now()}.csv`
    });
  }

  function exportCollectedLeads() {
    const allLeads = dedupeStore.getAll();
    if (allLeads.length === 0) {
      alert('No leads collected yet to export.');
      return;
    }

    const isCompany = allLeads[0]?._entityType === 'companies';
    let csvContent;
    if (isCompany) {
      const normalizedLeads = allLeads.map(lead => {
        return typeof normalizeCompanyComprehensive === 'function'
          ? normalizeCompanyComprehensive(lead)
          : lead;
      });
      csvContent = buildChunkedUnionCSV(normalizedLeads, PREFERRED_COMPANY_COLUMNS);
    } else {
      const normalizedLeads = allLeads.map(lead => {
        return typeof normalizePersonComprehensive === 'function'
          ? normalizePersonComprehensive(lead)
          : lead;
      });
      // Default to clean 28-column outreach schema (0 clutter, 100% CRM ready)
      csvContent = typeof buildChunkedCleanOutreachCSV === 'function'
        ? buildChunkedCleanOutreachCSV(normalizedLeads)
        : buildChunkedUnionCSV(normalizedLeads, PREFERRED_PERSON_COLUMNS);
    }
    const prefix = isCompany ? 'apollo_companies' : 'apollo_leads';
    chrome.runtime.sendMessage({
      type: 'APOLLO_DOWNLOAD_CSV',
      csv: csvContent,
      filename: `${prefix}_${allLeads.length}_${Date.now()}.csv`
    });
  }

  function exportCollectedJSON() {
    const allLeads = dedupeStore.getAll();
    if (allLeads.length === 0) {
      alert('No leads collected yet to export.');
      return;
    }
    const isCompany = allLeads[0]?._entityType === 'companies';
    const prefix = isCompany ? 'apollo_companies' : 'apollo_leads';
    const jsonStr = JSON.stringify(allLeads, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}_${allLeads.length}_${Date.now()}.json`;
    (document.body || document.documentElement).appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportDiagnosticReport() {
    const report = diagnosticLogger.getReport();
    report.engineMode = engineMode;
    report.totalDuplicatesFiltered = totalDuplicatesFiltered;
    report.totalUniqueHarvested = dedupeStore.size();
    if (report.preflight && report.preflight.totalPredictedLeads > 0) {
      report.preflightFidelity = {
        totalPredictedLeads: report.preflight.totalPredictedLeads,
        totalUniqueHarvested: dedupeStore.size(),
        difference: dedupeStore.size() - report.preflight.totalPredictedLeads,
        preservationPct: `${((dedupeStore.size() / report.preflight.totalPredictedLeads) * 100).toFixed(1)}%`
      };
    }
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apollo-diagnostics-${Date.now()}.json`;
    (document.body || document.documentElement).appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // 6. External Message Listener (from Popup / Background)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_HARVEST') {
      runHarvest(msg.config || {});
      sendResponse({ status: 'STARTED' });
    } else if (msg.type === 'STOP_HARVEST') {
      harvestAbort = true;
      sendResponse({ status: 'STOPPING' });
    } else if (msg.type === 'EXPORT_CSV' || msg.type === 'EXPORT_COMPANY_CSV') {
      exportCollectedLeads();
      sendResponse({ status: 'EXPORTING' });
    } else if (msg.type === 'EXPORT_JSON' || msg.type === 'EXPORT_COMPANY_JSON') {
      exportCollectedJSON();
      sendResponse({ status: 'EXPORTING_JSON' });
    } else if (msg.type === 'EXPORT_DIAGNOSTICS') {
      exportDiagnosticReport();
      sendResponse({ status: 'EXPORTING_DIAGNOSTICS' });
    } else if (msg.type === 'SET_ENGINE_MODE') {
      engineMode = msg.mode === 'standard' ? 'standard' : 'turbo';
      if (hud) hud.setEngineMode(engineMode);
      try {
        chrome.storage.local.set({ apollo_engine_mode: engineMode });
      } catch (e) {}
      sendResponse({ status: 'OK', engineMode });
    } else if (msg.type === 'GET_STATUS') {
      sendResponse({
        isHarvesting,
        isPaused,
        engineMode,
        totalHarvested: dedupeStore.size(),
        totalCompanies: dedupeStore.orgIds?.size || 0
      });
    }
    return true;
  });

  // Initialize HUD immediately on load
  function mountWhenReady() {
    if (document.body || document.documentElement) {
      ensureHUD();
    } else {
      window.addEventListener('DOMContentLoaded', () => ensureHUD(), { once: true });
    }
  }
  mountWhenReady();

})();
