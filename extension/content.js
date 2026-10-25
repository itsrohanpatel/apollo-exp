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
    subdivideCabinet,
    DeduplicationStore,
    generatePacingDelay,
    buildChunkedUnionCSV,
    normalizePersonComprehensive,
    PREFERRED_PERSON_COLUMNS
  } = slicerCore;
  const { ApolloHUD } = hudModule;

  console.log('[Apollo Extractor] Content Script Controller active.');

  let hud = null;
  let isHarvesting = false;
  let isPaused = false;
  let harvestAbort = false;
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

  function probeDensity(filters) {
    return new Promise((resolve) => {
      const requestId = 'probe_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const currentHash = window.location.hash || '';
      const basePayload = parseApolloUrlHash(currentHash);
      const fullPayload = {
        ...basePayload,
        ...filters,
        page: 1,
        per_page: 25
      };

      const timer = setTimeout(() => {
        if (activeProbeResolvers.has(requestId)) {
          activeProbeResolvers.delete(requestId);
          resolve(null);
        }
      }, 5000);

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

    ensureHUD();
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

    let cabinets = [];
    try {
      hud.setStatus('🔍 Probing search tree for 100% lead coverage...');
      cabinets = await resolveAdaptiveExecutionTree(probeDensity, baseFilters, {
        maxLeadsPerCabinet: 125,
        onProbeProgress: (p) => {
          if (p.type === 'BRACKET_PROBE') {
            hud.setStatus(`🔍 Probing [${p.label}]: ${p.total} leads found...`);
          } else if (p.type === 'SENIORITY_PROBE') {
            hud.setStatus(`🔍 Probing [${p.label}]: ${p.total} leads...`);
          } else if (p.type === 'EMAIL_PROBE') {
            hud.setStatus(`🔍 Probing [${p.label}]: ${p.total} leads...`);
          }
        }
      });
    } catch (e) {
      console.warn('[Apollo Extractor] Adaptive tree resolution error, falling back to macro brackets:', e);
    }

    const isOpenRange = (b) => typeof b === 'string' && (b.endsWith(',') || b.endsWith('+') || b.startsWith(','));
    if (!cabinets || cabinets.length === 0 || (cabinets.length === 1 && isOpenRange(cabinets[0].bracket?.[0]))) {
      const rawBrackets = resolveExecutionBrackets(baseFilters, { granular: true });
      cabinets = rawBrackets.map(b => ({
        label: Array.isArray(b) ? b[0] : String(b),
        bracket: Array.isArray(b) ? b : [String(b)],
        seniority: null,
        emailStatus: null,
        mode: 'Bidirectional'
      }));
    }

    let totalSlices = cabinets.length;
    hud.setStatus(`⚡ Resolved ${totalSlices} micro-cabinets. Starting harvest...`);
    hud.updateProgress({ totalSlices, sliceIdx: 1, totalLeads: dedupeStore.size() });

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

      hud.updateProgress({
        sliceIdx: i + 1,
        totalSlices,
        sliceLabel,
        passLabel: 'Pass 1 (A-Z)',
        sliceHarvested,
        totalLeads: dedupeStore.size()
      });

      // --- PASS 1: Company Ascending (A -> Z) ---
      let pass1Done = false;
      for (let page = 1; page <= 5; page++) {
        if (harvestAbort || dedupeStore.size() >= targetLeadLimit) break;
        while (isPaused && !harvestAbort) await new Promise(r => setTimeout(r, 500));

        hud.setStatus(`Scanning Pass 1 (A-Z) Page ${page}/5 for [${sliceLabel}]...`);
        const waitPromise = waitForBatch();

        if (page === 1) {
          const newHash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', true);
          window.postMessage({ type: 'APOLLO_NAVIGATE_HASH', hash: newHash }, '*');
          window.postMessage({
            type: 'APOLLO_SET_SORT',
            sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: true }
          }, '*');
        } else {
          window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: page }, '*');
        }

        let data = await waitPromise;
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
            wasEmpty = true;
            pass1Done = true;
            break;
          }

          // 2. Dynamic Runtime Cabinet Reduction
          // If total entries exceed 250 (max reachable with bidirectional sort), subdivide cabinet!
          if (sliceTotal > 250) {
            const subCabinets = subdivideCabinet(cabinet, sliceTotal, { baseFilters });
            if (subCabinets && subCabinets.length > 1) {
              console.log(`[Apollo Extractor] ⚡ Cabinet [${sliceLabel}] has ${sliceTotal} leads (> 250 limit). Subdividing into ${subCabinets.length} sub-cabinets:`, subCabinets.map(s => s.label));
              cabinets.splice(i, 1, ...subCabinets);
              totalSlices = cabinets.length;
              hud.setStatus(`⚡ Subdivided [${sliceLabel}] (${sliceTotal} leads) into ${subCabinets.length} sub-cabinets...`);
              hud.updateProgress({ totalSlices, sliceIdx: i + 1, totalLeads: dedupeStore.size() });
              wasSubdivided = true;
              i--;
              pass1Done = true;
              break;
            }
          }
        }

        const people = data.people || [];
        let addedInPage = 0;
        for (const person of people) {
          if (dedupeStore.add(person)) {
            addedInPage++;
            sliceHarvested++;
          }
        }

        hud.updateProgress({
          sliceIdx: i + 1,
          totalSlices,
          sliceLabel,
          passLabel: `Pass 1: A-Z (p${page})`,
          sliceHarvested,
          sliceTotal,
          totalLeads: dedupeStore.size()
        });

        // Store incrementally in background
        if (people.length > 0) {
          chrome.runtime.sendMessage({
            type: 'APOLLO_SAVE_BATCH',
            leads: people
          });
        }

        if (people.length < 25) {
          pass1Done = true;
          break;
        }

        // Pacing delay
        const delay = generatePacingDelay(2000, 3200);
        await sleepWithCountdown(delay);
      }

      if (wasEmpty || wasSubdivided) {
        continue;
      }

      // --- DUAL-SORT CAPACITY BOOST (Pass 2: Z-A) ---
      const hasUncollectedLeads = sliceTotal === null || sliceHarvested < sliceTotal;
      const shouldRunPass2 = hasUncollectedLeads && (cabinet.mode === 'Bidirectional' || sliceHarvested >= 25 || (sliceTotal !== null && sliceTotal > 25));
      if (!harvestAbort && shouldRunPass2 && dedupeStore.size() < targetLeadLimit) {
        hud.setStatus(`⚡ Capacity Boost: Executing Pass 2 (Z-A) for [${sliceLabel}]...`);
        hud.updateProgress({
          sliceIdx: i + 1,
          totalSlices,
          sliceLabel,
          passLabel: 'Pass 2 (Z-A)',
          sliceHarvested,
          sliceTotal,
          totalLeads: dedupeStore.size()
        });

        for (let page = 1; page <= 5; page++) {
          if (harvestAbort || dedupeStore.size() >= targetLeadLimit) break;
          while (isPaused && !harvestAbort) await new Promise(r => setTimeout(r, 500));

          hud.setStatus(`Scanning Pass 2 (Z-A) Page ${page}/5 for [${sliceLabel}]...`);
          const waitPromise = waitForBatch();

          if (page === 1) {
            const newHash = buildHashForSlice(currentHash, cabinet, 'sanitized_organization_name_unanalyzed', false);
            window.postMessage({ type: 'APOLLO_NAVIGATE_HASH', hash: newHash }, '*');
            window.postMessage({
              type: 'APOLLO_SET_SORT',
              sort: { sort_by_field: 'sanitized_organization_name_unanalyzed', sort_ascending: false }
            }, '*');
          } else {
            window.postMessage({ type: 'APOLLO_CLICK_PAGE', page: page }, '*');
          }

          let data = await waitPromise;
          if (!data) {
            const domLeads = await extractDOMFallback();
            if (domLeads && domLeads.length > 0) {
              data = { people: domLeads };
            } else {
              break;
            }
          }

          const people = data.people || [];
          let addedInPage = 0;
          for (const person of people) {
            if (dedupeStore.add(person)) {
              addedInPage++;
              sliceHarvested++;
            }
          }

          hud.updateProgress({
            sliceIdx: i + 1,
            totalSlices,
            sliceLabel,
            passLabel: `Pass 2: Z-A (p${page})`,
            sliceHarvested,
            sliceTotal,
            totalLeads: dedupeStore.size()
          });

          if (people.length > 0) {
            chrome.runtime.sendMessage({
              type: 'APOLLO_SAVE_BATCH',
              leads: people
            });
          }

          if (people.length < 25) break;

          const delay = generatePacingDelay(2000, 3200);
          await sleepWithCountdown(delay);
        }
      }

      await sleepWithCountdown(1500);
    }

    isHarvesting = false;
    hud.setHarvestState('completed');
    hud.setStatus(`✅ Harvest Finished! Captured ${dedupeStore.size()} unique leads.`);
    hud.updateProgress({ passLabel: 'Completed', sliceIdx: totalSlices, totalSlices });

    // Auto-trigger export
    exportCollectedLeads();
  }

  async function sleepWithCountdown(ms) {
    const totalSec = Math.ceil(ms / 1000);
    for (let s = totalSec; s >= 0; s--) {
      if (hud) hud.setPacingTimer(s);
      await new Promise(r => setTimeout(r, Math.min(ms, 1000)));
      ms -= 1000;
      if (ms <= 0) break;
    }
    if (hud) hud.setPacingTimer(0);
  }

  function exportCollectedLeads() {
    const allLeads = dedupeStore.getAll();
    if (allLeads.length === 0) {
      alert('No leads collected yet to export.');
      return;
    }

    // Normalize records into canonical 29-column schema (0 nested JSON, zero data loss)
    const normalizedLeads = allLeads.map(lead => {
      return typeof normalizePersonComprehensive === 'function'
        ? normalizePersonComprehensive(lead)
        : lead;
    });

    const csvContent = buildChunkedUnionCSV(normalizedLeads, PREFERRED_PERSON_COLUMNS);
    chrome.runtime.sendMessage({
      type: 'APOLLO_DOWNLOAD_CSV',
      csv: csvContent,
      filename: `apollo_leads_${allLeads.length}_${Date.now()}.csv`
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
    } else if (msg.type === 'EXPORT_CSV') {
      exportCollectedLeads();
      sendResponse({ status: 'EXPORTING' });
    } else if (msg.type === 'GET_STATUS') {
      sendResponse({
        isHarvesting,
        isPaused,
        totalHarvested: dedupeStore.size()
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
