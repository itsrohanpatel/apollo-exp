/**
 * Apollo Lead Extractor - Injected Network Sniffer & Autonomous Harvest Engine
 * Runs in the webpage's MAIN execution world to intercept Apollo's API responses
 * and execute autonomous anti-ban harvesting directly within the authenticated session.
 */
(function () {
  console.log('[Apollo Extractor] Universal Harvest Engine initialized in MAIN world');

  const TARGET_ENDPOINTS = [
    '/api/v1/mixed_people/search',
    '/api/v1/mixed_people/api_search',
    '/api/v1/mixed_companies/search',
    '/api/v1/contacts/search',
    '/api/v1/people/match'
  ];

  // Universal continuous headcount brackets (covers 1 to 10001+)
  const UNIVERSAL_HEADCOUNT_BRACKETS = [
    ['1,10'],
    ['11,20'],
    ['21,50'],
    ['51,100'],
    ['101,200'],
    ['201,500'],
    ['501,1000'],
    ['1001,5000'],
    ['5001,10000'],
    ['10001']
  ];

  // Granular micro-brackets for high density searches
  const GRANULAR_HEADCOUNT_BRACKETS = [
    ['1,2'], ['3,5'], ['6,10'],
    ['11,15'], ['16,20'], ['21,30'], ['31,40'], ['41,50'],
    ['51,60'], ['61,70'], ['71,80'], ['81,90'], ['91,100'],
    ['100,105'], ['106,110'], ['116,120'], ['121,150'], ['151,180'], ['181,200'],
    ['201,250'], ['251,300'], ['301,400'], ['401,500'],
    ['501,600'], ['601,750'], ['751,1000'],
    ['1001,2000'], ['2001,5000'], ['5001,10000'], ['10001']
  ];

  let latestSearchPayload = null;
  let isHarvestingActive = false;
  let harvestAbort = false;

  const sleep = (ms) => new Promise(r => {
    const step = 200;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += step;
      if (harvestAbort || elapsed >= ms) {
        clearInterval(interval);
        r();
      }
    }, step);
  });
  const getJitter = (min = 2000, max = 3800) => Math.floor(Math.random() * (max - min + 1)) + min;

  // ECC Latency-Critical Systems: Adaptive Server Pressure Pacer
  class AdaptivePacer {
    constructor(options = {}) {
      this.baseMin = options.baseMin || 2000;
      this.baseMax = options.baseMax || 3800;
      this.historyWindow = options.historyWindow || 4;
      this.latencies = [];
    }

    recordRoundTrip(ms) {
      if (typeof ms === 'number' && ms > 0) {
        this.latencies.push(ms);
        if (this.latencies.length > this.historyWindow) {
          this.latencies.shift();
        }
      }
    }

    getAverageLatency() {
      if (this.latencies.length === 0) return 500;
      const sum = this.latencies.reduce((a, b) => a + b, 0);
      return Math.round(sum / this.latencies.length);
    }

    isServerPressured() {
      return this.getAverageLatency() >= 1500;
    }

    computeNextDelay() {
      const avg = this.getAverageLatency();
      let min = this.baseMin;
      let max = this.baseMax;

      if (avg >= 1500) {
        min = Math.round(this.baseMin * 1.8);
        max = Math.round(this.baseMax * 1.8);
      } else if (avg >= 800) {
        min = Math.round(this.baseMin * 1.2);
        max = Math.round(this.baseMax * 1.2);
      }

      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  function getCookie(name) {
    try {
      const parts = document.cookie.split(';');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith(name + '=')) {
          return decodeURIComponent(trimmed.slice(name.length + 1));
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function getApolloHeaders(isCompanies = null) {
    const isComp = isCompanies !== null ? isCompanies : (window.location.hash || window.location.href).includes('/companies');
    const headers = {
      'content-type': 'application/json',
      'x-referer-host': 'app.apollo.io',
      'x-referer-path': isComp ? '/companies' : '/people',
      'x-accept-language': 'en',
      'X-Requested-With': 'XMLHttpRequest'
    };
    const csrf = getCookie('X-CSRF-TOKEN');
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }
    return headers;
  }

  // Auto-extract filters from browser URL hash
  function parseUrlHash(urlOrHash = '') {
    const result = {
      sort_ascending: false,
      sort_by_field: "[none]"
    };
    if (!urlOrHash || typeof urlOrHash !== 'string') return result;
    const qIndex = urlOrHash.indexOf('?');
    if (qIndex === -1) return result;

    const queryString = urlOrHash.slice(qIndex + 1);
    const params = new URLSearchParams(queryString);

    const arrayMappings = {
      'personTitles[]': 'person_titles',
      'personLocations[]': 'person_locations',
      'organizationLocations[]': 'organization_locations',
      'contactEmailStatus[]': 'contact_email_status',
      'organizationNumEmployeesRanges[]': 'organization_num_employees_ranges',
      'personSeniorities[]': 'person_seniorities',
      'organizationIndustryTagIds[]': 'organization_industry_tag_ids',
      'personDepartmentOrSubdepartments[]': 'person_department_or_subdepartments',
      'existFields[]': 'exist_fields',
      'qOrganizationKeywordTags[]': 'q_organization_keyword_tags',
      'qNotOrganizationKeywordTags[]': 'q_not_organization_keyword_tags',
      'excludedOrganizationKeywordFields[]': 'excluded_organization_keyword_fields',
      'personNotTitles[]': 'person_not_titles',
      'personNotLocations[]': 'person_not_locations',
      'organizationNotLocations[]': 'organization_not_locations',
      'notOrganizationIndustryTagIds[]': 'not_organization_industry_tag_ids',
      'personNotSeniorities[]': 'person_not_seniorities',
      'currentlyUsingAnyOfTechnologyUids[]': 'currently_using_any_of_technology_uids',
      'latestFundingStageCd[]': 'latest_funding_stage_cd'
    };

    const stringMappings = {
      'qKeywords': 'q_keywords',
      'qOrganizationName': 'q_organization_name',
      'personName': 'person_name',
      'recommendationConfigId': 'recommendation_config_id'
    };

    for (const [paramKey, apiKey] of Object.entries(arrayMappings)) {
      const baseKey = paramKey.replace('[]', '');
      const valsWithBrackets = params.getAll(paramKey);
      const valsWithout = params.getAll(baseKey);
      const combined = [...valsWithBrackets, ...valsWithout];
      if (combined.length > 0) result[apiKey] = combined;
    }

    for (const [paramKey, apiKey] of Object.entries(stringMappings)) {
      const val = params.get(paramKey);
      if (val) result[apiKey] = val;
    }

    const sortBy = params.get('sortByField');
    if (sortBy) result.sort_by_field = sortBy;
    const sortAsc = params.get('sortAscending');
    if (sortAsc !== null) result.sort_ascending = sortAsc === 'true';

    const revMin = params.get('revenueRange[min]') || params.get('revenueRange.min');
    const revMax = params.get('revenueRange[max]') || params.get('revenueRange.max');
    if (revMin || revMax) {
      result.revenue_range = {};
      if (revMin) result.revenue_range.min = parseInt(revMin, 10);
      if (revMax) result.revenue_range.max = parseInt(revMax, 10);
    }

    return result;
  }

  function processResponse(url, data) {
    if (!data || typeof data !== 'object') return;

    if (url.includes('/mixed_people/search') || url.includes('/mixed_people/api_search')) {
      const people = data.people || [];
      if (people.length > 0) {
        window.postMessage({
          type: 'APOLLO_SCRAPER_DATA',
          dataType: 'people',
          url: url,
          items: people,
          pagination: data.pagination
        }, '*');
      }
    } else if (url.includes('/mixed_companies/search')) {
      const orgs = data.organizations || [];
      if (orgs.length > 0) {
        window.postMessage({
          type: 'APOLLO_SCRAPER_DATA',
          dataType: 'companies',
          url: url,
          items: orgs,
          pagination: data.pagination
        }, '*');
      }
    } else if (url.includes('/people/match')) {
      if (data.person) {
        window.postMessage({
          type: 'APOLLO_SCRAPER_DATA',
          dataType: 'person_match',
          url: url,
          items: [data.person]
        }, '*');
      }
    } else if (url.includes('/contacts/search')) {
      const contacts = data.contacts || [];
      if (contacts.length > 0) {
        window.postMessage({
          type: 'APOLLO_SCRAPER_DATA',
          dataType: 'contacts',
          url: url,
          items: contacts,
          pagination: data.pagination
        }, '*');
      }
    }
  }

  // 1. Monkey-patch window.fetch
  const rawFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    // Sniff outgoing search payload
    if (url.includes('/mixed_people/search') && args[1] && args[1].body) {
      try {
        const bodyObj = typeof args[1].body === 'string' ? JSON.parse(args[1].body) : args[1].body;
        // Only save user-initiated searches, not our internal harvest requests
        if (!bodyObj._isHarvestEngine) {
          latestSearchPayload = { ...bodyObj };
          window.postMessage({
            type: 'APOLLO_SEARCH_FILTER_CAPTURED',
            payload: latestSearchPayload
          }, '*');
        }
      } catch (e) {}
    }

    const response = await rawFetch.apply(this, args);

    if (TARGET_ENDPOINTS.some(endpoint => url.includes(endpoint))) {
      try {
        const clone = response.clone();
        clone.json().then(data => {
          processResponse(url, data);
        }).catch(() => {});
      } catch (e) {}
    }

    return response;
  };

  // 2. Monkey-patch XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._targetUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      if (this._targetUrl && TARGET_ENDPOINTS.some(endpoint => this._targetUrl.includes(endpoint))) {
        try {
          const data = JSON.parse(this.responseText);
          processResponse(this._targetUrl, data);
        } catch (e) {}
      }
    });
    return originalSend.apply(this, args);
  };

  // Helper: check if a bracket is broad/high-density
  function isHighDensityBracket(bracket) {
    if (!bracket || !bracket[0]) return false;
    const str = bracket[0];
    if (['1,10', '11,20', '21,50', '51,100', '101,200', '201,500', '501,1000', '1001,5000', '5001,10000'].includes(str)) return true;
    const parts = str.split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [min, max] = parts;
      if (min === max) return false;
      return (max - min) >= 4;
    }
    return false;
  }

  // Helper: decompose broad range into sub-250 micro ranges
  function decomposeHighDensityBracket(bracketStr) {
    if (typeof bracketStr !== 'string') return [[bracketStr]];
    const parts = bracketStr.split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      return [[bracketStr]];
    }

    const [min, max] = parts;
    if (min === max) {
      return [[`${min},${max}`]];
    }

    const steps = [];
    let cur = min;

    while (cur <= max) {
      if (cur <= 20) {
        const segEnd = Math.min(20, max);
        for (let i = cur; i <= segEnd; i++) {
          steps.push([`${i},${i}`]);
        }
        cur = segEnd + 1;
      } else if (cur <= 50) {
        const segEnd = Math.min(50, max);
        while (cur <= segEnd) {
          const next = Math.min(cur + 4, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else if (cur <= 100) {
        const segEnd = Math.min(100, max);
        while (cur <= segEnd) {
          const next = Math.min(cur + 9, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else if (cur <= 200) {
        const segEnd = Math.min(200, max);
        while (cur <= segEnd) {
          let next;
          if (cur <= 150) next = Math.min(150, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else if (cur <= 500) {
        const segEnd = Math.min(500, max);
        while (cur <= segEnd) {
          const next = Math.min(cur + 49, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else if (cur <= 1000) {
        const segEnd = Math.min(1000, max);
        while (cur <= segEnd) {
          let next;
          if (cur <= 750) next = Math.min(750, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else if (cur <= 5000) {
        const segEnd = Math.min(5000, max);
        while (cur <= segEnd) {
          let next;
          if (cur <= 2000) next = Math.min(2000, segEnd);
          else if (cur <= 3500) next = Math.min(3500, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else if (cur <= 10000) {
        const segEnd = Math.min(10000, max);
        while (cur <= segEnd) {
          let next;
          if (cur <= 7500) next = Math.min(7500, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else {
        steps.push(['10001']);
        break;
      }
    }

    return steps.length > 0 ? steps : [[`${min},${max}`]];
  }

  const STANDARD_MACRO_INTERVALS = [
    { min: 1, max: 10, label: '1,10' },
    { min: 11, max: 20, label: '11,20' },
    { min: 21, max: 50, label: '21,50' },
    { min: 51, max: 100, label: '51,100' },
    { min: 101, max: 200, label: '101,200' },
    { min: 201, max: 500, label: '201,500' },
    { min: 501, max: 1000, label: '501,1000' },
    { min: 1001, max: 5000, label: '1001,5000' },
    { min: 5001, max: 10000, label: '5001,10000' },
    { min: 10001, max: Infinity, label: '10001' }
  ];

  function expandOpenHeadcountRange(openRangeStr = '1,') {
    if (typeof openRangeStr !== 'string') return [['10001']];
    const trimmed = openRangeStr.trim();

    if (trimmed.endsWith(',') || trimmed.endsWith('+')) {
      const lower = parseInt(trimmed.replace(/[,+]/g, ''), 10) || 1;
      const brackets = [];
      for (const interval of STANDARD_MACRO_INTERVALS) {
        if (interval.max < lower) continue;
        if (interval.max === Infinity) {
          brackets.push(['10001']);
        } else if (lower >= interval.min && lower <= interval.max) {
          brackets.push([`${lower},${interval.max}`]);
        } else if (interval.min > lower) {
          brackets.push([`${interval.min},${interval.max}`]);
        }
      }
      return brackets.length > 0 ? brackets : [['10001']];
    }

    if (trimmed.startsWith(',')) {
      const upper = parseInt(trimmed.replace(',', ''), 10) || 10000;
      const brackets = [];
      for (const interval of STANDARD_MACRO_INTERVALS) {
        if (interval.min > upper) continue;
        if (interval.max <= upper) {
          brackets.push([interval.label]);
        } else if (interval.min <= upper && interval.max > upper) {
          brackets.push([`${interval.min},${upper}`]);
        }
      }
      return brackets.length > 0 ? brackets : [['1,10']];
    }

    return [[trimmed]];
  }

  // Generate Complete Adaptive Micro-Brackets for Open Range or Universal Set
  function generateAdaptiveMicroBrackets(openRangeLowerStr = '5,') {
    const macroBrackets = expandOpenHeadcountRange(openRangeLowerStr).map(b => b[0]);
    const microBrackets = [];
    for (const macro of macroBrackets) {
      if (macro === '10001') {
        microBrackets.push(['10001']);
      } else if (isHighDensityBracket([macro])) {
        microBrackets.push(...decomposeHighDensityBracket(macro));
      } else {
        microBrackets.push([macro]);
      }
    }
    return microBrackets;
  }

  // Helper to extract active brackets or decompose into adaptive micro-brackets
  function resolveExecutionBrackets(basePayload) {
    const customRanges = basePayload?.organization_num_employees_ranges;
    if (Array.isArray(customRanges) && customRanges.length > 0) {
      const out = [];
      for (const r of customRanges) {
        const str = Array.isArray(r) ? r[0] : (typeof r === 'string' ? r : String(r));
        if (typeof str === 'string' && (str.endsWith(',') || str.endsWith('+') || str.startsWith(','))) {
          const expanded = expandOpenHeadcountRange(str);
          for (const item of expanded) {
            const macro = item[0];
            if (macro === '10001') {
              out.push(['10001']);
            } else if (isHighDensityBracket([macro])) {
              out.push(...decomposeHighDensityBracket(macro));
            } else {
              out.push([macro]);
            }
          }
        } else if (typeof str === 'string' && isHighDensityBracket([str])) {
          out.push(...decomposeHighDensityBracket(str));
        } else {
          out.push(Array.isArray(r) ? r : [r]);
        }
      }
      return out;
    }
    const universal = [];
    for (const b of UNIVERSAL_HEADCOUNT_BRACKETS) {
      const macro = b[0];
      if (macro === '10001') {
        universal.push(['10001']);
      } else if (isHighDensityBracket([macro])) {
        universal.push(...decomposeHighDensityBracket(macro));
      } else {
        universal.push([macro]);
      }
    }
    return universal;
  }

  // 3. Autonomous Universal Deep Harvester
  async function runUniversalHarvest(config) {
    if (isHarvestingActive) return;
    isHarvestingActive = true;
    harvestAbort = false;

    const {
      targetLeads = 50000,
      method = 'infinite_drain', // DEFAULT: Universal Infinite Drain (100% extraction)
      granular = false,
      minDelay = 2000,
      maxDelay = 3800
    } = config;

    const pacer = new AdaptivePacer({ baseMin: minDelay, baseMax: maxDelay });

    console.log(`[Apollo Extractor] Starting Universal Harvest: Target=${targetLeads}, Method=${method}`);

    // Detect if scraping Companies or People
    const isCompanies = (window.location.hash || window.location.href).includes('/companies');
    const entityType = isCompanies ? 'companies' : 'people';
    const searchEndpoint = isCompanies
      ? 'https://app.apollo.io/api/v1/mixed_companies/search'
      : 'https://app.apollo.io/api/v1/mixed_people/search';

    // 1. Prioritize active URL filters over stale intercepted payload
    const FILTER_KEYS = [
      'person_titles',
      'person_locations',
      'organization_locations',
      'contact_email_status',
      'organization_num_employees_ranges',
      'person_seniorities',
      'organization_industry_tag_ids',
      'person_department_or_subdepartments',
      'exist_fields',
      'q_keywords',
      'q_organization_name',
      'person_name',
      'q_organization_keyword_tags',
      'q_not_organization_keyword_tags',
      'excluded_organization_keyword_fields',
      'person_not_titles',
      'person_not_locations',
      'organization_not_locations',
      'not_organization_industry_tag_ids',
      'person_not_seniorities',
      'revenue_range',
      'currently_using_any_of_technology_uids',
      'latest_funding_stage_cd',
      'recommendation_config_id'
    ];

    let urlFilters = parseUrlHash(window.location.hash || window.location.href);
    const hasUrlFilters = Object.keys(urlFilters).some(k => FILTER_KEYS.includes(k));

    let base = {};
    if (hasUrlFilters) {
      base = {
        ...urlFilters,
        sort_ascending: urlFilters.sort_ascending ?? false,
        sort_by_field: urlFilters.sort_by_field ?? "[none]"
      };
      if (latestSearchPayload) {
        if (latestSearchPayload.search_session_id) base.search_session_id = latestSearchPayload.search_session_id;
        if (latestSearchPayload.context) base.context = latestSearchPayload.context;
        if (latestSearchPayload.finder_version) base.finder_version = latestSearchPayload.finder_version;
      }
    } else if (latestSearchPayload) {
      base = { ...latestSearchPayload };
    } else {
      base = {
        ...urlFilters,
        page: 1,
        per_page: 25,
        sort_ascending: false,
        sort_by_field: "[none]"
      };
    }

    // When scraping companies, prune person-specific filter keys
    if (isCompanies) {
      delete base.person_titles;
      delete base.person_locations;
      delete base.contact_email_status;
      delete base.person_seniorities;
      delete base.person_department_or_subdepartments;
      delete base.person_name;
    }

    // Clean ephemeral pagination and exclusion fields from base template
    delete base.page;
    delete base.per_page;
    delete base.organization_num_employees_ranges;
    delete base.organization_ids_excluded;
    delete base.excluded_organization_ids;
    delete base.person_ids_excluded;

    let requestCount = 0;
    let requestsSinceLastCooldown = 0;
    let leadsSinceLastCooldown = 0;
    const harvestedIds = new Set();
    const harvestedOrgIds = new Set();

    const reportProgress = (status, currentSlice = 0, totalSlices = 0, cooldownRemaining = null) => {
      window.postMessage({
        type: 'APOLLO_HARVEST_PROGRESS',
        entityType: entityType,
        harvestedCount: harvestedIds.size,
        targetLeads: targetLeads,
        currentSlice: currentSlice,
        totalSlices: totalSlices,
        status: status,
        cooldownRemaining: cooldownRemaining
      }, '*');
    };

    const executeSmartCooldown = async (sliceIdx = 0, totalSlices = 0, isRateLimit = false) => {
      const avgLatency = pacer ? pacer.getAverageLatency() : 500;
      let durationSeconds = 30;

      if (isRateLimit) {
        durationSeconds = 60 + Math.floor(Math.random() * 15); // 60s - 75s on 429
      } else if (avgLatency >= 1400) {
        durationSeconds = 50 + Math.floor(Math.random() * 10); // 50s - 60s under server pressure
      } else if (avgLatency >= 750) {
        durationSeconds = 30 + Math.floor(Math.random() * 8);  // 30s - 38s normal
      } else {
        durationSeconds = 18 + Math.floor(Math.random() * 6);  // 18s - 24s fast server
      }

      console.log(`[Apollo Extractor] Smart Cooldown initiated: ${durationSeconds}s (latency: ${avgLatency}ms, rateLimit: ${isRateLimit})`);

      for (let remaining = durationSeconds; remaining > 0; remaining--) {
        if (harvestAbort) break;
        const statusMsg = isRateLimit
          ? `Rate limit backoff: ${remaining}s remaining...`
          : `Anti-ban cooldown: ${remaining}s remaining...`;
        reportProgress(statusMsg, sliceIdx + 1, totalSlices, remaining);
        await sleep(1000);
      }

      requestsSinceLastCooldown = 0;
      leadsSinceLastCooldown = 0;
    };

    const checkAndTriggerCooldown = async (sliceIdx = 0, totalSlices = 0) => {
      requestsSinceLastCooldown++;
      const threshold = leadsSinceLastCooldown >= 20 ? 10 : 20;
      if (requestsSinceLastCooldown > 1 && requestsSinceLastCooldown % threshold === 0) {
        await executeSmartCooldown(sliceIdx, totalSlices, false);
        return true;
      }
      return false;
    };

    try {
      if (method === 'dynamic_exclusion') {
        // Method A: Dynamic Page-1 Exclusion Window (Single cabinet / legacy)
        reportProgress(`Harvesting Page-1 Dynamic Window (${entityType})...`, 1, 1);

        while (harvestedIds.size < targetLeads && !harvestAbort) {
          requestCount++;
          if (await checkAndTriggerCooldown(0, 1)) {
            if (harvestAbort) break;
          }

          const payload = {
            ...base,
            _isHarvestEngine: true,
            page: 1,
            per_page: 25
          };
          if (urlFilters.organization_num_employees_ranges) {
            payload.organization_num_employees_ranges = urlFilters.organization_num_employees_ranges;
          }
          if (isCompanies) {
            payload.organization_ids_excluded = Array.from(harvestedOrgIds);
            payload.excluded_organization_ids = Array.from(harvestedOrgIds);
          } else {
            payload.person_ids_excluded = Array.from(harvestedIds);
          }

          const tFetchStart = Date.now();
          const res = await rawFetch(searchEndpoint, {
            method: 'POST',
            headers: getApolloHeaders(),
            body: JSON.stringify(payload)
          });
          pacer.recordRoundTrip(Date.now() - tFetchStart);

          if (res.status === 429) {
            console.warn('[Apollo Extractor] 429 Rate Limit encountered. Triggering smart backoff cooldown...');
            await executeSmartCooldown(0, 1, true);
            if (harvestAbort) break;
            continue;
          }

          if (res.status === 403) {
            console.error(`[Apollo Extractor] Circuit breaker tripped! Status ${res.status}`);
            window.postMessage({
              type: 'APOLLO_HARVEST_HALTED',
              reason: 'BLOCKED_403'
            }, '*');
            break;
          }

          if (res.status !== 200) {
            console.warn(`[Apollo Extractor] Request returned ${res.status}. Stopping.`);
            break;
          }

          const data = await res.json();
          const items = isCompanies ? (data.organizations || []) : (data.people || []);
          if (items.length === 0) {
            reportProgress(`All available ${entityType} exhausted for this search.`);
            break;
          }

          let newItemsInBatch = 0;
          for (const item of items) {
            const id = item.id || (isCompanies ? (item.primary_domain || item.name) : null);
            if (id && !harvestedIds.has(id)) {
              harvestedIds.add(id);
              if (item.organization_id) harvestedOrgIds.add(item.organization_id);
              if (item.organization?.id) harvestedOrgIds.add(item.organization.id);
              if (isCompanies && item.id) harvestedOrgIds.add(item.id);
              newItemsInBatch++;
            }
          }

          processResponse(searchEndpoint, data);
          reportProgress(`Harvested ${harvestedIds.size} ${entityType}...`);

          if (newItemsInBatch === 0) {
            console.log('[Apollo Extractor] Moving window reached stagnation. Terminating.');
            break;
          }

          await sleep(pacer.computeNextDelay());
        }

      } else if (method === 'headcount_matrix') {
        // Method B: Standard Headcount Slicing (Pages 1 to 5 only)
        const brackets = resolveExecutionBrackets(urlFilters);
        const totalSlices = brackets.length;

        for (let sliceIdx = 0; sliceIdx < totalSlices; sliceIdx++) {
          if (harvestedIds.size >= targetLeads || harvestAbort) break;

          const bracket = brackets[sliceIdx];
          reportProgress(`Scanning slice ${bracket[0]}...`, sliceIdx + 1, totalSlices);

          for (let page = 1; page <= 5; page++) {
            if (harvestedIds.size >= targetLeads || harvestAbort) break;

            requestCount++;
            if (await checkAndTriggerCooldown(sliceIdx, totalSlices)) {
              if (harvestAbort) break;
            }

            const payload = {
              ...base,
              _isHarvestEngine: true,
              page: page,
              per_page: 25,
              organization_num_employees_ranges: bracket
            };

            const tFetchStart = Date.now();
            const res = await rawFetch(searchEndpoint, {
              method: 'POST',
              headers: getApolloHeaders(),
              body: JSON.stringify(payload)
            });
            pacer.recordRoundTrip(Date.now() - tFetchStart);

            if (res.status === 429) {
              console.warn('[Apollo Extractor] 429 Rate Limit encountered. Triggering smart backoff cooldown...');
              await executeSmartCooldown(sliceIdx, totalSlices, true);
              if (harvestAbort) break;
              page--;
              continue;
            }

            if (res.status === 403) {
              window.postMessage({
                type: 'APOLLO_HARVEST_HALTED',
                reason: 'BLOCKED_403'
              }, '*');
              harvestAbort = true;
              break;
            }

            if (res.status !== 200) break;

            const data = await res.json();
            const items = isCompanies ? (data.organizations || []) : (data.people || []);
            if (items.length === 0) break;

            let newInSlicePage = 0;
            for (const item of items) {
              const id = item.id || (isCompanies ? (item.primary_domain || item.name) : null);
              if (id && !harvestedIds.has(id)) {
                harvestedIds.add(id);
                newInSlicePage++;
              }
            }
            leadsSinceLastCooldown += newInSlicePage;

            processResponse(searchEndpoint, data);
            reportProgress(`Harvesting [${bracket[0]}] Page ${page}`, sliceIdx + 1, totalSlices);

            if (items.length < 25) break;

            await sleep(pacer.computeNextDelay());
          }
        }

      } else {
        // Method C: UNIVERSAL INFINITE DRAIN (DEFAULT - Extracts 100% of all matching leads)
        // Combines continuous headcount partitioning with cabinet-scoped dynamic exclusion
        const brackets = granular
          ? (urlFilters.organization_num_employees_ranges
              ? generateAdaptiveMicroBrackets(urlFilters.organization_num_employees_ranges[0])
              : GRANULAR_HEADCOUNT_BRACKETS)
          : resolveExecutionBrackets(urlFilters);
        const totalSlices = brackets.length;

        for (let sliceIdx = 0; sliceIdx < totalSlices; sliceIdx++) {
          if (harvestedIds.size >= targetLeads || harvestAbort) break;

          const bracket = brackets[sliceIdx];
          const bracketLabel = bracket[0];
          const cabinetHarvestedIds = new Set();
          const cabinetHarvestedOrgIds = new Set();
          let cabinetTotalEntries = null;

          reportProgress(`Analyzing cabinet [${bracketLabel}]...`, sliceIdx + 1, totalSlices);

          // Bidirectional Slices: Pass 1 (descending - top 125 leads) and Pass 2 (ascending - bottom 125 leads if > 125 total)
          const sortPasses = [false]; // false = descending

          for (const sortAsc of sortPasses) {
            if (harvestedIds.size >= targetLeads || harvestAbort) break;

            const sortLabel = sortAsc ? 'Bottom-up' : 'Top-down';

            for (let page = 1; page <= 5; page++) {
              if (harvestedIds.size >= targetLeads || harvestAbort) break;

              requestCount++;
              if (await checkAndTriggerCooldown(sliceIdx, totalSlices)) {
                if (harvestAbort) break;
              }

              const payload = {
                ...base,
                _isHarvestEngine: true,
                page: page,
                per_page: 25,
                sort_ascending: sortAsc,
                organization_num_employees_ranges: bracket
              };

              const tFetchStart = Date.now();
              const res = await rawFetch(searchEndpoint, {
                method: 'POST',
                headers: getApolloHeaders(),
                body: JSON.stringify(payload)
              });
              pacer.recordRoundTrip(Date.now() - tFetchStart);

              if (res.status === 429) {
                console.warn('[Apollo Extractor] 429 Rate Limit encountered. Triggering smart backoff cooldown...');
                await executeSmartCooldown(sliceIdx, totalSlices, true);
                if (harvestAbort) break;
                page--;
                continue;
              }

              if (res.status === 403) {
                window.postMessage({
                  type: 'APOLLO_HARVEST_HALTED',
                  reason: 'BLOCKED_403'
                }, '*');
                harvestAbort = true;
                break;
              }

              if (res.status !== 200) break;

              let data = null;
              try {
                data = await res.json();
              } catch (e) {
                console.warn('[Apollo Extractor] Response body not valid JSON:', e);
                break;
              }
              if (cabinetTotalEntries === null && data.pagination && data.pagination.total_entries !== undefined) {
                cabinetTotalEntries = data.pagination.total_entries;
                // If cabinet has > 125 records and we haven't scheduled ascending pass yet, add it!
                if (cabinetTotalEntries > 125 && sortPasses.length === 1) {
                  sortPasses.push(true); // true = ascending pass
                }
              }

              const items = isCompanies ? (data.organizations || []) : (data.people || []);
              if (items.length === 0) break;

              let newInPage = 0;
              for (const item of items) {
                const id = item.id || (isCompanies ? (item.primary_domain || item.name) : null);
                if (id && !harvestedIds.has(id)) {
                  harvestedIds.add(id);
                  cabinetHarvestedIds.add(id);
                  newInPage++;
                }
                if (item.organization_id) cabinetHarvestedOrgIds.add(item.organization_id);
                if (item.organization?.id) cabinetHarvestedOrgIds.add(item.organization.id);
                if (isCompanies && item.id) cabinetHarvestedOrgIds.add(item.id);
              }

              leadsSinceLastCooldown += newInPage;
              processResponse(searchEndpoint, data);
              const totalStr = cabinetTotalEntries ? ` of ${cabinetTotalEntries}` : '';
              reportProgress(`[${bracketLabel}] ${sortLabel} Harvested ${cabinetHarvestedIds.size}${totalStr}`, sliceIdx + 1, totalSlices);

              // If fewer than 25 returned or no new unique records, break this pass
              if (items.length < 25 || newInPage === 0) break;

              await sleep(pacer.computeNextDelay());
            }
          }

          // Seniority Pivot for Indivisible Enterprise Band (10001+)
          if (!isCompanies && bracketLabel === '10001' && cabinetTotalEntries > 250 && harvestedIds.size < targetLeads && !harvestAbort) {
            const SENIORITIES = ['founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior', 'entry'];
            for (const sen of SENIORITIES) {
              if (harvestedIds.size >= targetLeads || harvestAbort) break;
              reportProgress(`[10001+] Pivoting Seniority: ${sen}...`, sliceIdx + 1, totalSlices);

              for (let page = 1; page <= 5; page++) {
                if (harvestedIds.size >= targetLeads || harvestAbort) break;
                requestCount++;
                if (await checkAndTriggerCooldown(sliceIdx, totalSlices)) {
                  if (harvestAbort) break;
                }

                const senPayload = {
                  ...base,
                  _isHarvestEngine: true,
                  page: page,
                  per_page: 25,
                  organization_num_employees_ranges: ['10001'],
                  person_seniorities: [sen]
                };

                const tSenStart = Date.now();
                const senRes = await rawFetch(searchEndpoint, {
                  method: 'POST',
                  headers: getApolloHeaders(),
                  body: JSON.stringify(senPayload)
                });
                pacer.recordRoundTrip(Date.now() - tSenStart);

                if (senRes.status === 429) {
                  console.warn('[Apollo Extractor] 429 Rate Limit encountered. Triggering smart backoff cooldown...');
                  await executeSmartCooldown(sliceIdx, totalSlices, true);
                  if (harvestAbort) break;
                  page--;
                  continue;
                }

                if (senRes.status === 403) {
                  window.postMessage({
                    type: 'APOLLO_HARVEST_HALTED',
                    reason: 'BLOCKED_403'
                  }, '*');
                  harvestAbort = true;
                  break;
                }
                if (senRes.status !== 200) break;

                let senData = null;
                try { senData = await senRes.json(); } catch (e) { break; }
                const senItems = senData.people || [];
                if (senItems.length === 0) break;

                let newInSen = 0;
                for (const item of senItems) {
                  if (item.id && !harvestedIds.has(item.id)) {
                    harvestedIds.add(item.id);
                    cabinetHarvestedIds.add(item.id);
                    newInSen++;
                  }
                  if (item.organization_id) cabinetHarvestedOrgIds.add(item.organization_id);
                  if (item.organization?.id) cabinetHarvestedOrgIds.add(item.organization.id);
                }

                leadsSinceLastCooldown += newInSen;
                processResponse(searchEndpoint, senData);
                reportProgress(`[10001+] ${sen} Harvested ${cabinetHarvestedIds.size} of ${cabinetTotalEntries}`, sliceIdx + 1, totalSlices);
                if (senItems.length < 25 || newInSen === 0) break;

                await sleep(pacer.computeNextDelay());
              }
            }
          }

          // Cabinet-Scoped Dynamic Exclusion for any dense bracket with remaining unharvested leads
          if (cabinetTotalEntries && cabinetTotalEntries > 250 && cabinetHarvestedIds.size < cabinetTotalEntries && harvestedIds.size < targetLeads && !harvestAbort) {
            reportProgress(`[${bracketLabel}] Deep draining remaining leads (${cabinetHarvestedIds.size} of ${cabinetTotalEntries})...`, sliceIdx + 1, totalSlices);

            let dynamicStagnation = 0;

            while (cabinetHarvestedIds.size < cabinetTotalEntries && harvestedIds.size < targetLeads && !harvestAbort) {
              requestCount++;
              if (await checkAndTriggerCooldown(sliceIdx, totalSlices)) {
                if (harvestAbort) break;
              }

              const drainPayload = {
                ...base,
                _isHarvestEngine: true,
                page: 1,
                per_page: 25,
                organization_num_employees_ranges: bracket
              };

              if (isCompanies) {
                drainPayload.organization_ids_excluded = Array.from(cabinetHarvestedOrgIds);
                drainPayload.excluded_organization_ids = Array.from(cabinetHarvestedOrgIds);
              } else {
                drainPayload.person_ids_excluded = Array.from(cabinetHarvestedIds);
              }

              const tDrainStart = Date.now();
              const drainRes = await rawFetch(searchEndpoint, {
                method: 'POST',
                headers: getApolloHeaders(),
                body: JSON.stringify(drainPayload)
              });
              pacer.recordRoundTrip(Date.now() - tDrainStart);

              if (drainRes.status === 429) {
                console.warn('[Apollo Extractor] 429 Rate Limit encountered. Triggering smart backoff cooldown...');
                await executeSmartCooldown(sliceIdx, totalSlices, true);
                if (harvestAbort) break;
                continue;
              }

              if (drainRes.status === 403) {
                window.postMessage({
                  type: 'APOLLO_HARVEST_HALTED',
                  reason: 'BLOCKED_403'
                }, '*');
                harvestAbort = true;
                break;
              }

              if (drainRes.status !== 200) break;

              let drainData = null;
              try { drainData = await drainRes.json(); } catch (e) { break; }

              const drainItems = isCompanies ? (drainData.organizations || []) : (drainData.people || []);
              if (drainItems.length === 0) break;

              let newInDrain = 0;
              for (const item of drainItems) {
                const id = item.id || (isCompanies ? (item.primary_domain || item.name) : null);
                if (id && !harvestedIds.has(id)) {
                  harvestedIds.add(id);
                  cabinetHarvestedIds.add(id);
                  newInDrain++;
                }
                if (item.organization_id) cabinetHarvestedOrgIds.add(item.organization_id);
                if (item.organization?.id) cabinetHarvestedOrgIds.add(item.organization.id);
                if (isCompanies && item.id) cabinetHarvestedOrgIds.add(item.id);
              }

              leadsSinceLastCooldown += newInDrain;
              processResponse(searchEndpoint, drainData);
              reportProgress(`[${bracketLabel}] Deep Drain Harvested ${cabinetHarvestedIds.size} of ${cabinetTotalEntries}`, sliceIdx + 1, totalSlices);

              if (newInDrain === 0) {
                dynamicStagnation++;
                if (dynamicStagnation >= 2) break;
              } else {
                dynamicStagnation = 0;
              }

              if (cabinetHarvestedIds.size >= 450) break; // Apollo exclusion limit safety ceiling per bracket

              await sleep(pacer.computeNextDelay());
            }
          }

          // Clean up cabinet memory: cabinetHarvestedIds & cabinetHarvestedOrgIds reset automatically
        }
      }
    } catch (err) {
      console.error('[Apollo Extractor] Error in harvest loop:', err);
    } finally {
      isHarvestingActive = false;
      const itemLabel = isCompanies ? 'companies' : 'leads';
      const finalMsg = harvestAbort ? 'Harvest stopped by user' : `Harvest complete (${harvestedIds.size} ${itemLabel})`;
      reportProgress(finalMsg);
      window.postMessage({
        type: 'APOLLO_HARVEST_FINISHED',
        entityType: entityType,
        totalHarvested: harvestedIds.size
      }, '*');
    }
  }

  // 4. Message Listener for Commands from Content Script
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === 'APOLLO_START_UNIVERSAL_HARVEST') {
      runUniversalHarvest(event.data.config || {});
    } else if (event.data.type === 'APOLLO_STOP_UNIVERSAL_HARVEST') {
      harvestAbort = true;
      isHarvestingActive = false;
      console.log('[Apollo Extractor] Harvest cancellation received');
    }
  });

})();
