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

    if (trimmed.endsWith(',')) {
      const lower = parseInt(trimmed.replace(',', ''), 10) || 1;
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

  function resolveExecutionBrackets(basePayload = {}) {
    const customRanges = basePayload.organization_num_employees_ranges;
    if (Array.isArray(customRanges) && customRanges.length > 0) {
      if (customRanges.length === 1 && typeof customRanges[0] === 'string' && (customRanges[0].endsWith(',') || customRanges[0].startsWith(','))) {
        return expandOpenHeadcountRange(customRanges[0]);
      }
      return customRanges.map(r => Array.isArray(r) ? r : [r]);
    }
    return [...UNIVERSAL_HEADCOUNT_BRACKETS];
  }

  let latestSearchPayload = null;
  let isHarvestingActive = false;
  let harvestAbort = false;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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

  function getApolloHeaders() {
    const headers = {
      'Content-Type': 'application/json',
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
      const vals = params.getAll(paramKey);
      if (vals.length > 0) result[apiKey] = vals;
    }

    for (const [paramKey, apiKey] of Object.entries(stringMappings)) {
      const val = params.get(paramKey);
      if (val) result[apiKey] = val;
    }

    const revMin = params.get('revenueRange[min]');
    const revMax = params.get('revenueRange[max]');
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
    const parts = str.split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [min, max] = parts;
      if (min === max) return false;
      return max <= 500 && (max - min) >= 4;
    }
    return false;
  }

  // Helper: decompose broad range into sub-250 micro ranges
  function decomposeHighDensityBracket(bracketStr) {
    const parts = bracketStr.split(',').map(s => parseInt(s.trim(), 10));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      return [[bracketStr]];
    }

    const [min, max] = parts;

    // Small business <= 20: exact single integers (e.g. 5,5, 6,6, ...)
    if (max <= 20) {
      const singleIntegers = [];
      for (let i = min; i <= max; i++) {
        singleIntegers.push([`${i},${i}`]);
      }
      return singleIntegers;
    }

    // Lower mid-market 21-50: 5-step micro ranges
    if (min >= 21 && max <= 50) {
      const steps = [];
      let cur = min;
      while (cur <= max) {
        const next = Math.min(cur + 4, max);
        steps.push([`${cur},${next}`]);
        cur = next + 1;
      }
      return steps;
    }

    // Upper mid-market 51-100: 10-step micro ranges
    if (min >= 51 && max <= 100) {
      const steps = [];
      let cur = min;
      while (cur <= max) {
        const next = Math.min(cur + 9, max);
        steps.push([`${cur},${next}`]);
        cur = next + 1;
      }
      return steps;
    }

    // 101-200: split into 101-150 and 151-200
    if (min >= 101 && max <= 200) {
      return [['101,150'], ['151,200']];
    }

    // 201-500: split into 201-350 and 351-500
    if (min >= 201 && max <= 500) {
      return [['201,350'], ['351,500']];
    }

    return [[`${min},${max}`]];
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

    if (trimmed.endsWith(',')) {
      const lower = parseInt(trimmed.replace(',', ''), 10) || 1;
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

  // Helper to extract active brackets or decompose into adaptive micro-brackets
  function resolveExecutionBrackets(basePayload) {
    const customRanges = basePayload?.organization_num_employees_ranges;
    if (Array.isArray(customRanges) && customRanges.length > 0) {
      if (customRanges.length === 1 && typeof customRanges[0] === 'string' && (customRanges[0].endsWith(',') || customRanges[0].startsWith(','))) {
        const macroBrackets = expandOpenHeadcountRange(customRanges[0]);

        const micro = [];
        for (const macroItem of macroBrackets) {
          const macro = macroItem[0];
          if (macro === '10001') {
            micro.push(['10001']);
          } else if (isHighDensityBracket([macro])) {
            micro.push(...decomposeHighDensityBracket(macro));
          } else {
            micro.push([macro]);
          }
        }
        return micro;
      }

      const out = [];
      for (const r of customRanges) {
        const str = Array.isArray(r) ? r[0] : r;
        if (typeof str === 'string' && isHighDensityBracket([str])) {
          out.push(...decomposeHighDensityBracket(str));
        } else {
          out.push(Array.isArray(r) ? r : [r]);
        }
      }
      return out;
    }
    return UNIVERSAL_HEADCOUNT_BRACKETS;
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
    const harvestedIds = new Set();
    const harvestedOrgIds = new Set();

    const reportProgress = (status, currentSlice = 0, totalSlices = 0) => {
      window.postMessage({
        type: 'APOLLO_HARVEST_PROGRESS',
        entityType: entityType,
        harvestedCount: harvestedIds.size,
        targetLeads: targetLeads,
        currentSlice: currentSlice,
        totalSlices: totalSlices,
        status: status
      }, '*');
    };

    try {
      if (method === 'dynamic_exclusion') {
        // Method A: Dynamic Page-1 Exclusion Window (Single cabinet / legacy)
        reportProgress(`Harvesting Page-1 Dynamic Window (${entityType})...`, 1, 1);

        while (harvestedIds.size < targetLeads && !harvestAbort) {
          requestCount++;

          // Anti-ban batch cooldown (every 10 requests / 250 records)
          if (requestCount > 1 && requestCount % 10 === 0) {
            reportProgress('Taking anti-ban cooldown pause (40s)...');
            await sleep(40000);
            if (harvestAbort) break;
          }

          const payload = {
            ...base,
            _isHarvestEngine: true,
            page: 1,
            per_page: 25,
            organization_ids_excluded: Array.from(harvestedOrgIds),
            excluded_organization_ids: Array.from(harvestedOrgIds)
          };
          if (!isCompanies) {
            payload.person_ids_excluded = Array.from(harvestedIds);
          }

          const tFetchStart = Date.now();
          const res = await rawFetch(searchEndpoint, {
            method: 'POST',
            headers: getApolloHeaders(),
            body: JSON.stringify(payload)
          });
          pacer.recordRoundTrip(Date.now() - tFetchStart);

          if (res.status === 429 || res.status === 403) {
            console.error(`[Apollo Extractor] Circuit breaker tripped! Status ${res.status}`);
            window.postMessage({
              type: 'APOLLO_HARVEST_HALTED',
              reason: res.status === 429 ? 'RATE_LIMIT_429' : 'BLOCKED_403'
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
            if (requestCount > 1 && requestCount % 10 === 0) {
              reportProgress('Taking anti-ban cooldown pause (40s)...', sliceIdx + 1, totalSlices);
              await sleep(40000);
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

            if (res.status === 429 || res.status === 403) {
              window.postMessage({
                type: 'APOLLO_HARVEST_HALTED',
                reason: res.status === 429 ? 'RATE_LIMIT_429' : 'BLOCKED_403'
              }, '*');
              harvestAbort = true;
              break;
            }

            if (res.status !== 200) break;

            const data = await res.json();
            const items = isCompanies ? (data.organizations || []) : (data.people || []);
            if (items.length === 0) break;

            for (const item of items) {
              const id = item.id || (isCompanies ? (item.primary_domain || item.name) : null);
              if (id) harvestedIds.add(id);
            }

            processResponse(searchEndpoint, data);
            reportProgress(`Harvesting [${bracket[0]}] Page ${page}`, sliceIdx + 1, totalSlices);

            if (items.length < 25) break;

            await sleep(pacer.computeNextDelay());
          }
        }

      } else {
        // Method C: UNIVERSAL INFINITE DRAIN (DEFAULT - Extracts 100% of all matching leads)
        // Combines continuous headcount partitioning with cabinet-scoped dynamic exclusion
        const brackets = granular ? GRANULAR_HEADCOUNT_BRACKETS : resolveExecutionBrackets(urlFilters);
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
              if (requestCount > 1 && requestCount % 10 === 0) {
                reportProgress('Taking anti-ban cooldown pause (40s)...', sliceIdx + 1, totalSlices);
                await sleep(40000);
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

              if (res.status === 429 || res.status === 403) {
                window.postMessage({
                  type: 'APOLLO_HARVEST_HALTED',
                  reason: res.status === 429 ? 'RATE_LIMIT_429' : 'BLOCKED_403'
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

              processResponse(searchEndpoint, data);
              const totalStr = cabinetTotalEntries ? ` of ${cabinetTotalEntries}` : '';
              reportProgress(`[${bracketLabel}] ${sortLabel} Harvested ${cabinetHarvestedIds.size}${totalStr}`, sliceIdx + 1, totalSlices);

              // If fewer than 25 returned or no new unique records, break this pass
              if (items.length < 25 || newInPage === 0) break;

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
