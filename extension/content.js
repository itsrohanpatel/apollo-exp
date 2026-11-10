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
    resolveAdaptiveExecutionTree,
    resolveHarvestExecutionPlan,
    resolveExecutionBrackets,
    detectMaxEmployeesFromFilters,
    subdivideCabinet,
    DeduplicationStore,
    generatePacingDelay,
    buildChunkedUnionCSV,
    buildChunkedCleanOutreachCSV,
    normalizePersonComprehensive,
    normalizeCompanyComprehensive,
    PREFERRED_PERSON_COLUMNS,
    PREFERRED_COMPANY_COLUMNS,
    CLEAN_OUTREACH_COLUMNS_28,
    HarvestTelemetryEstimator,
    buildPreflightPlanCSV,
    buildHarvestAuditCSV,
    shouldEarlyExitHarvest
  } = slicerCore;
  const { ApolloHUD } = hudModule;

  console.log('[Apollo Extractor] Content Script Controller active.');

  let hud = null;
  let isHarvesting = false;
  let isPaused = false;
  let harvestAbort = false;
  let lastPreflightPlanCSV = null;
  let lastHarvestAuditCSV = null;
  let harvestPageAuditRecords = [];
  const dedupeStore = new DeduplicationStore();

  let activeBatchResolver = null;
  const activeProbeResolvers = new Map();

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
        resolver(event.data.total || 0);
      }
    }
  });

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
          resolve(e.data.leads || []);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'APOLLO_REQUEST_DOM_EXTRACTION' }, '*');
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve([]);
      }, 1500);
    });
  }

  async function probeDensity(filters, attempt = 1) {
    while (isPaused && !harvestAbort) {
      if (hud) hud.setStatus('⏸ Preflight Probing paused by operator');
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
      if (hud) hud.setStatus('⏸ Preflight Probing paused by operator');
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
        onStart: () => {
          runHarvest({ targetLeadLimit: 50000 });
        },
        onPause: () => { isPaused = true; },
        onResume: () => { isPaused = false; },
        onStopAndExport: () => {
          harvestAbort = true;
          exportCollectedLeads();
        },
        onExportPreflightPlan: () => {
          exportPreflightPlanCSV();
        },
        onExportHarvestAudit: () => {
          exportHarvestAuditCSV();
        },
        onExportCompanyCSV: () => {
          exportCompanyCSV();
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
    harvestPageAuditRecords = [];

    ensureHUD();
    hud.setPhase('preflight');
    hud.setHarvestState('running');
    hud.setStatus('⚡ Analyzing search parameters & probing density...');

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
    const preflightAuditLog = [];
    try {
      hud.setStatus('🔍 Probing search tree for 100% lead coverage...');
      cabinets = await resolveAdaptiveExecutionTree(probeDensity, baseFilters, {
        maxLeadsPerCabinet: 150,
        initialTotal,
        maxEmployees,
        decomposeEnterprise: true,
        auditLog: preflightAuditLog,
        sleepFn: sleepWithCountdown,
        isAborted: () => harvestAbort,
        isPaused: () => isPaused,
        probePacing: {
          minDelay: 800,
          maxDelay: 1600,
          zeroMinDelay: 500,
          zeroMaxDelay: 1000
        },
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
          }
        }
      });
    } catch (e) {
      console.warn('[Apollo Extractor] Adaptive tree resolution error, falling back to macro brackets:', e);
    }

    if (harvestAbort) {
      console.log('[Apollo Extractor] Preflight probing cancelled/stopped by operator.');
      if (hud) {
        hud.setHarvestState('idle');
        hud.setStatus('Preflight probing cancelled by operator.');
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

    // --- AUTO-EXPORT PREFLIGHT AUDIT & CABINET DESIGN CSV ---
    try {
      lastPreflightPlanCSV = buildPreflightPlanCSV(cabinets, preflightAuditLog, {
        currentHash,
        baseFilters,
        initialTotal
      });

      chrome.runtime.sendMessage({
        type: 'APOLLO_DOWNLOAD_CSV',
        csv: lastPreflightPlanCSV,
        filename: `apollo_preflight_plan_${totalSlices}_cabinets_${Date.now()}.csv`
      });

      if (hud && typeof hud.setPreflightPlanReady === 'function') {
        hud.setPreflightPlanReady(() => exportPreflightPlanCSV());
      }
    } catch (csvErr) {
      console.warn('[Apollo Extractor] Auto-export preflight plan error:', csvErr);
    }

    const telemetry = new HarvestTelemetryEstimator({
      defaultLatencyMs: 4500,
      defaultPacingMs: 2500,
      cooldownEveryN: 10,
      cooldownDurationMs: 45000,
      enableCooldown: true
    });

    const getEstimatedRemainingPages = (currIdx, currPage, isPass2 = false) => {
      let rem = isPass2 ? Math.max(0, 5 - currPage) : (Math.max(0, 5 - currPage) + 4);
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
    let currentLatencyMs = 4500;
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

    // --- INTERACTIVE REVIEW GATE ---
    // Pause execution, present plan metrics, and wait for operator confirmation to start live harvest
    if (hud && typeof hud.setPreflightReviewReady === 'function') {
      const totalExpectedLeads = cabinets.reduce((sum, c) => sum + (typeof c.total === 'number' ? c.total : 0), 0);
      const bisectionCount = preflightAuditLog.filter(p => p.type === 'BISECTION_SPLIT').length;

      await new Promise((resolveStart) => {
        let reviewDone = false;
        const finishReview = () => {
          if (!reviewDone) {
            reviewDone = true;
            resolveStart();
          }
        };
        hud.setPreflightReviewReady({
          totalSlices,
          totalLeads: totalExpectedLeads,
          currentEtaSeconds,
          bisectionCount,
          sliceList: cabinets,
          onStart: finishReview,
          onCancel: () => {
            harvestAbort = true;
            finishReview();
          },
          onExportCSV: () => exportPreflightPlanCSV()
        });
      });

      if (harvestAbort) {
        console.log('[Apollo Extractor] Harvest cancelled in preflight review gate.');
        if (hud) {
          hud.setHarvestState('idle');
          hud.setStatus('Harvest cancelled by operator.');
        }
        isHarvesting = false;
        return;
      }

      hud.setPhase('harvest');
      hud.setHarvestState('running');
      hud.setStatus(`⚡ Starting live harvest across ${totalSlices} cabinets...`);
    }

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
        let data = await waitPromise;
        const reqLatencyMs1 = Math.round(performance.now() - reqStart1);
        telemetry.recordRequest(reqLatencyMs1);

        const remPages1 = getEstimatedRemainingPages(i, page, false);
        currentEtaSeconds = telemetry.estimateRemainingSeconds(remPages1, cabinets.length - i);
        currentEta = HarvestTelemetryEstimator.formatETA(currentEtaSeconds);
        const spikeInfo1 = telemetry.getLatencySpikeStatus();
        currentLatencyMs = spikeInfo1.avgLatencyMs;
        currentIsSpike = spikeInfo1.isSpike;

        if (!data) {
          const domLeads = await extractDOMFallback();
          if (domLeads && domLeads.length > 0) {
            data = { people: domLeads };
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
            harvestPageAuditRecords.push({
              event: harvestPageAuditRecords.length + 1,
              sliceIdx: i + 1,
              totalSlices,
              sliceLabel,
              bracket: cabinet.bracket ? (Array.isArray(cabinet.bracket) ? cabinet.bracket.join(';') : String(cabinet.bracket)) : 'All',
              seniority: cabinet.seniority || 'All',
              emailStatus: cabinet.emailStatus ? (Array.isArray(cabinet.emailStatus) ? cabinet.emailStatus.join(';') : String(cabinet.emailStatus)) : 'All',
              passLabel: 'Pass 1 (A-Z)',
              sortDirection: 'Company Ascending (A-Z)',
              page: 1,
              sliceTotal: 0,
              rawLeadsCount: 0,
              freshLeadsCount: 0,
              duplicateLeadsCount: 0,
              sliceCumulative: 0,
              globalCumulative: dedupeStore.size(),
              latencyMs: reqLatencyMs1,
              pacingMs: 0,
              status: 'EMPTY_CABINET_SHORT_CIRCUIT',
              timestamp: new Date().toISOString()
            });
            wasEmpty = true;
            pass1Done = true;
            break;
          }

          // 2. Dynamic Runtime Cabinet Reduction
          // If total entries exceed 300 (max reachable with bidirectional sort), subdivide cabinet!
          // Strictly guarded: Leaves (subdepartments, untagged slices, already subdivided) must NEVER subdivide recursively.
          if (sliceTotal > 300 && !cabinet.subdepartment && !cabinet.isUntagged && !cabinet._hasSubdivided && !cabinet._leaf) {
            const subCabinets = subdivideCabinet(cabinet, sliceTotal, { baseFilters });
            if (subCabinets && subCabinets.length > 1) {
              subCabinets.forEach(sub => { sub._hasSubdivided = true; sub._leaf = true; });
              console.log(`[Apollo Extractor] ⚡ Cabinet [${sliceLabel}] has ${sliceTotal} leads (> 300 limit). Subdividing into ${subCabinets.length} sub-cabinets:`, subCabinets.map(s => s.label));
              cabinets.splice(i, 1, ...subCabinets);
              totalSlices = cabinets.length;
              hud.setStatus(`⚡ Subdivided [${sliceLabel}] (${sliceTotal} leads) into ${subCabinets.length} sub-cabinets...`);
              harvestPageAuditRecords.push({
                event: harvestPageAuditRecords.length + 1,
                sliceIdx: i + 1,
                totalSlices,
                sliceLabel,
                bracket: cabinet.bracket ? (Array.isArray(cabinet.bracket) ? cabinet.bracket.join(';') : String(cabinet.bracket)) : 'All',
                seniority: cabinet.seniority || 'All',
                emailStatus: cabinet.emailStatus ? (Array.isArray(cabinet.emailStatus) ? cabinet.emailStatus.join(';') : String(cabinet.emailStatus)) : 'All',
                passLabel: 'Pass 1 (A-Z)',
                sortDirection: 'Company Ascending (A-Z)',
                page: 1,
                sliceTotal,
                rawLeadsCount: 0,
                freshLeadsCount: 0,
                duplicateLeadsCount: 0,
                sliceCumulative: 0,
                globalCumulative: dedupeStore.size(),
                latencyMs: reqLatencyMs1,
                pacingMs: 0,
                status: `SUBDIVIDED_RUNTIME_INTO_${subCabinets.length}_SUBCABINETS`,
                timestamp: new Date().toISOString()
              });
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

        const people = (typeof maxEmployees === 'number' && maxEmployees > 0)
          ? rawPeople.filter(person => {
              const emp = person.organization?.estimated_num_employees
                ?? person.organization?.num_employees
                ?? person.organization?.number_of_employees
                ?? person.organization_num_employees;
              return !(typeof emp === 'number' && emp > maxEmployees);
            })
          : rawPeople;

        const outOfBoundsCount = Math.max(0, rawPeople.length - people.length);

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

        const delay = generatePacingDelay(2000, 3200);
        harvestPageAuditRecords.push({
          event: harvestPageAuditRecords.length + 1,
          sliceIdx: i + 1,
          totalSlices,
          sliceLabel,
          bracket: cabinet.bracket ? (Array.isArray(cabinet.bracket) ? cabinet.bracket.join(';') : String(cabinet.bracket)) : 'All',
          seniority: cabinet.seniority || 'All',
          emailStatus: cabinet.emailStatus ? (Array.isArray(cabinet.emailStatus) ? cabinet.emailStatus.join(';') : String(cabinet.emailStatus)) : 'All',
          passLabel: `Pass 1: A-Z (p${page})`,
          sortDirection: 'Company Ascending (A-Z)',
          page,
          sliceTotal: sliceTotal !== null ? sliceTotal : 'Unknown',
          rawLeadsCount: rawPeople.length,
          freshLeadsCount: addedInPage,
          duplicateLeadsCount: Math.max(0, people.length - addedInPage),
          outOfBoundsCount,
          sliceCumulative: sliceHarvested,
          globalCumulative: dedupeStore.size(),
          latencyMs: reqLatencyMs1,
          pacingMs: exitDecision1.shouldExit ? 0 : delay,
          status: exitDecision1.status,
          timestamp: new Date().toISOString()
        });

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
        await sleepWithCountdown(delay);
      }

      if (wasEmpty || wasSubdivided) {
        continue;
      }

      // --- DUAL-SORT CAPACITY BOOST (Pass 2: Z-A) ---
      const hasUncollectedLeads = sliceTotal === null || sliceHarvested < sliceTotal;
      const shouldRunPass2 = !pass1Exhausted && hasUncollectedLeads && (cabinet.mode === 'Bidirectional' || sliceHarvested >= 30 || (sliceTotal !== null && sliceTotal > 30));
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
          let data = await waitPromise;
          const reqLatencyMs2 = Math.round(performance.now() - reqStart2);
          telemetry.recordRequest(reqLatencyMs2);

          const remPages2 = getEstimatedRemainingPages(i, page, true);
          currentEtaSeconds = telemetry.estimateRemainingSeconds(remPages2, cabinets.length - i);
          currentEta = HarvestTelemetryEstimator.formatETA(currentEtaSeconds);
          const spikeInfo2 = telemetry.getLatencySpikeStatus();
          currentLatencyMs = spikeInfo2.avgLatencyMs;
          currentIsSpike = spikeInfo2.isSpike;

          if (!data) {
            const domLeads = await extractDOMFallback();
            if (domLeads && domLeads.length > 0) {
              data = { people: domLeads };
            } else {
              break;
            }
          }

          const rawPeople = data.people || [];
          const people = (typeof maxEmployees === 'number' && maxEmployees > 0)
            ? rawPeople.filter(person => {
                const emp = person.organization?.estimated_num_employees
                  ?? person.organization?.num_employees
                  ?? person.organization?.number_of_employees
                  ?? person.organization_num_employees;
                return !(typeof emp === 'number' && emp > maxEmployees);
              })
            : rawPeople;

          const outOfBoundsCount = Math.max(0, rawPeople.length - people.length);

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

          const delay = generatePacingDelay(2000, 3200);
          harvestPageAuditRecords.push({
            event: harvestPageAuditRecords.length + 1,
            sliceIdx: i + 1,
            totalSlices,
            sliceLabel,
            bracket: cabinet.bracket ? (Array.isArray(cabinet.bracket) ? cabinet.bracket.join(';') : String(cabinet.bracket)) : 'All',
            seniority: cabinet.seniority || 'All',
            emailStatus: cabinet.emailStatus ? (Array.isArray(cabinet.emailStatus) ? cabinet.emailStatus.join(';') : String(cabinet.emailStatus)) : 'All',
            passLabel: `Pass 2: Z-A (p${page})`,
            sortDirection: 'Company Descending (Z-A)',
            page,
            sliceTotal: sliceTotal !== null ? sliceTotal : 'Unknown',
            rawLeadsCount: rawPeople.length,
            freshLeadsCount: addedInPage,
            duplicateLeadsCount: Math.max(0, people.length - addedInPage),
            outOfBoundsCount,
            sliceCumulative: sliceHarvested,
            globalCumulative: dedupeStore.size(),
            latencyMs: reqLatencyMs2,
            pacingMs: exitDecision2.shouldExit ? 0 : delay,
            status: exitDecision2.status,
            timestamp: new Date().toISOString()
          });

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

          await sleepWithCountdown(delay);
        }
      }

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
        duplicatesFiltered: harvestPageAuditRecords.reduce((sum, r) => sum + (r.duplicateLeadsCount || 0), 0),
        duration: durationFormatted
      });
    }

    // Auto-trigger export of both leads and page audit CSV
    exportCollectedLeads();
    exportHarvestAuditCSV();
  }

  async function sleepWithCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    let remainingMs = ms;
    while (remainingMs > 0 && !harvestAbort) {
      while (isPaused && !harvestAbort) {
        if (hud) {
          const pauseMsg = hud.currentPhase === 'preflight'
            ? '⏸ Preflight Probing paused by operator'
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

  function exportPreflightPlanCSV() {
    if (!lastPreflightPlanCSV) {
      alert('No preflight plan CSV generated yet. Start an AI harvest to probe density and generate the plan!');
      return;
    }
    chrome.runtime.sendMessage({
      type: 'APOLLO_DOWNLOAD_CSV',
      csv: lastPreflightPlanCSV,
      filename: `apollo_preflight_plan_${Date.now()}.csv`
    });
  }

  function exportHarvestAuditCSV() {
    if (harvestPageAuditRecords.length === 0 && !lastHarvestAuditCSV) {
      alert('No harvest page events recorded yet.');
      return;
    }
    const totalExpectedInCabinets = cabinets && cabinets.length > 0
      ? cabinets.reduce((sum, c) => sum + (typeof c.total === 'number' ? c.total : 0), 0)
      : undefined;
    lastHarvestAuditCSV = buildHarvestAuditCSV(harvestPageAuditRecords, {
      totalHarvested: dedupeStore.size(),
      totalCabinets: cabinets ? cabinets.length : undefined,
      totalEstimatedLeads: totalExpectedInCabinets
    });
    chrome.runtime.sendMessage({
      type: 'APOLLO_DOWNLOAD_CSV',
      csv: lastHarvestAuditCSV,
      filename: `apollo_harvest_audit_${dedupeStore.size()}_leads_${Date.now()}.csv`
    });
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
    } else if (msg.type === 'EXPORT_PREFLIGHT_PLAN_CSV') {
      exportPreflightPlanCSV();
      sendResponse({ status: 'EXPORTING_PLAN' });
    } else if (msg.type === 'EXPORT_HARVEST_AUDIT_CSV') {
      exportHarvestAuditCSV();
      sendResponse({ status: 'EXPORTING_AUDIT' });
    } else if (msg.type === 'GET_STATUS') {
      sendResponse({
        isHarvesting,
        isPaused,
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
