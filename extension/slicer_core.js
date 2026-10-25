/**
 * Apollo Lead Extractor - Slicer Core Algorithm Library
 * Pure JS, zero external dependencies. Usable in Node tests, Chrome Extension MV3, and in-tab scripts.
 */

// 1. Universal Headcount Brackets
export const UNIVERSAL_PRIMARY_HEADCOUNT_BRACKETS = [
  ['1,10'],
  ['11,20'],
  ['21,50'],
  ['51,100'],
  ['101,200'],
  ['201,500'],
  ['501,1000'],
  ['1001,5000'],
  ['5001,10000'],
  ['10001'] // 10001+ Enterprise
];

export const UNIVERSAL_GRANULAR_HEADCOUNT_BRACKETS = [
  // Micro Small Business (1-20 exact integers & small spans)
  ['1,1'], ['2,2'], ['3,3'], ['4,4'], ['5,5'],
  ['6,10'], ['11,15'], ['16,20'],
  // Lower Mid-Market (21-100)
  ['21,30'], ['31,40'], ['41,50'], ['51,60'], ['61,70'], ['71,80'], ['81,90'], ['91,100'],
  // Upper Mid-Market (101-500)
  ['100,105'], ['106,110'], ['116,120'], ['121,150'], ['151,180'], ['181,200'],
  ['201,250'], ['251,300'], ['301,400'], ['401,500'],
  // Enterprise (501+)
  ['501,600'], ['601,750'], ['751,1000'],
  ['1001,2000'], ['2001,5000'], ['5001,10000'], ['10001']
];

export function generateUniversalHeadcountSlices(options = {}) {
  if (options.granular) {
    return [...UNIVERSAL_GRANULAR_HEADCOUNT_BRACKETS];
  }
  return [...UNIVERSAL_PRIMARY_HEADCOUNT_BRACKETS];
}

// 2. Randomized Human Pacing Delay
export function generatePacingDelay(minDelay = 2000, maxDelay = 3800) {
  const min = Math.max(1000, minDelay);
  const max = Math.max(min, maxDelay);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 3. Central Deduplication Store
export class DeduplicationStore {
  constructor() {
    this.leadsMap = new Map();
    this.orgIds = new Set();
    this.personIds = new Set();
  }

  add(lead) {
    if (!lead || typeof lead !== 'object') return false;

    // Primary key: lead.id, fallback: lead.linkedin_url, fallback: lead.domain, fallback: fullName_company
    const key = lead.id || lead.linkedin_url || lead.domain || `${lead.name || lead.full_name || ''}_${lead.company_name || ''}`;
    if (!key || this.leadsMap.has(key)) {
      return false; // Duplicate rejected
    }

    this.leadsMap.set(key, lead);
    if (lead.id) this.personIds.add(lead.id);
    if (lead.organization_id || lead.organization?.id) {
      this.orgIds.add(lead.organization_id || lead.organization.id);
    }

    return true;
  }

  size() {
    return this.leadsMap.size;
  }

  getIds() {
    return Array.from(this.personIds);
  }

  getOrgIds() {
    return Array.from(this.orgIds);
  }

  getAll() {
    return Array.from(this.leadsMap.values());
  }

  clear() {
    this.leadsMap.clear();
    this.orgIds.clear();
    this.personIds.clear();
  }
}

// 4. Moving Window Exclusion Payload Builder
export function buildExclusionPayload(basePayload, excludedOrgIds = [], excludedPersonIds = []) {
  const payload = { ...basePayload };
  payload.page = 1; // Moving window always pulls Page 1

  if (Array.isArray(excludedOrgIds) && excludedOrgIds.length > 0) {
    // Apollo accepts either organization_ids_excluded or excluded_organization_ids
    payload.organization_ids_excluded = [...excludedOrgIds];
    payload.excluded_organization_ids = [...excludedOrgIds];
  }

  if (Array.isArray(excludedPersonIds) && excludedPersonIds.length > 0) {
    payload.person_ids_excluded = [...excludedPersonIds];
  }

  return payload;
}

// 5. Anti-Ban Safety Circuit Breaker
export class SafetyCircuitBreaker {
  constructor(options = {}) {
    this.maxDailyLeads = options.maxDailyLeads || 2500;
    this.totalHarvestedToday = 0;
    this.tripped = false;
    this.tripReason = null;
  }

  inspectResponse(res) {
    if (!res) {
      return { allowContinue: true };
    }

    if (res.status === 429) {
      this.tripped = true;
      this.tripReason = 'RATE_LIMIT_429';
      return { allowContinue: false, reason: 'RATE_LIMIT_429' };
    }

    if (res.status === 403) {
      this.tripped = true;
      this.tripReason = 'BLOCKED_403';
      return { allowContinue: false, reason: 'BLOCKED_403' };
    }

    return { allowContinue: !this.tripped, reason: this.tripReason };
  }

  recordLeadsHarvested(count) {
    this.totalHarvestedToday += count;
    if (this.totalHarvestedToday >= this.maxDailyLeads) {
      this.tripped = true;
      this.tripReason = 'DAILY_LIMIT_EXCEEDED';
      return { tripped: true, reason: 'DAILY_LIMIT_EXCEEDED', total: this.totalHarvestedToday };
    }
    return { tripped: false, total: this.totalHarvestedToday };
  }

  isTripped() {
    return this.tripped;
  }

  reset() {
    this.tripped = false;
    this.tripReason = null;
  }
}

// 6. Cool-Down Check (Every 10 requests / 250 leads)
export function shouldTriggerCooldown(requestCount, leadCount, cooldownEveryNRequests = 10) {
  if (requestCount > 0 && requestCount % cooldownEveryNRequests === 0) {
    return true;
  }
  return false;
}

// 6b. Smart Cool-Down Check & Duration Calculator
export function calculateSmartCooldownDuration(averageLatency = 500, hasRateLimitSignal = false, baseOptions = {}) {
  const {
    fastDuration = 18,
    normalDuration = 32,
    pressuredDuration = 55,
    rateLimitDuration = 65
  } = baseOptions;

  if (hasRateLimitSignal) {
    const jitter = Math.floor(Math.random() * 11) - 5;
    return Math.max(45, rateLimitDuration + jitter);
  }

  if (averageLatency >= 1400) {
    const jitter = Math.floor(Math.random() * 9) - 4;
    return Math.max(35, pressuredDuration + jitter);
  }

  if (averageLatency >= 750) {
    const jitter = Math.floor(Math.random() * 7) - 3;
    return Math.max(25, normalDuration + jitter);
  }

  const jitter = Math.floor(Math.random() * 5) - 2;
  return Math.max(12, fastDuration + jitter);
}

export function shouldTriggerSmartCooldown(stats, options = {}) {
  const {
    requestsSinceLastCooldown = 0,
    leadsSinceLastCooldown = 0,
    hasRateLimitSignal = false
  } = stats || {};

  if (hasRateLimitSignal) return true;

  const maxRequests = options.maxRequests || 10;
  const minLeads = options.minLeads !== undefined ? options.minLeads : 20;

  if (requestsSinceLastCooldown >= maxRequests) {
    if (leadsSinceLastCooldown < minLeads) {
      return requestsSinceLastCooldown >= (options.emptyCabinetMaxRequests || 20);
    }
    return true;
  }

  return false;
}

// 7. Apollo Entity Type Detector
export function detectApolloEntityType(urlOrHash = '') {
  if (typeof urlOrHash === 'string' && urlOrHash.includes('/companies')) {
    return 'companies';
  }
  return 'people';
}

export const STANDARD_MACRO_INTERVALS = [
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

export function expandOpenHeadcountRange(openRangeStr = '1,') {
  if (typeof openRangeStr !== 'string') return [['10001']];
  const trimmed = openRangeStr.trim();

  // Case 1: lower-bounded open range like "5,", "50,", "50+", "10001+" (lower+)
  if (trimmed.endsWith(',') || trimmed.endsWith('+')) {
    const lower = parseInt(trimmed.replace(/[,+]/g, ''), 10) || 1;
    const brackets = [];
    for (const interval of STANDARD_MACRO_INTERVALS) {
      if (interval.max < lower) {
        continue;
      }
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

  // Case 2: upper-bounded open range like ",50" (<= 50)
  if (trimmed.startsWith(',')) {
    const upper = parseInt(trimmed.replace(',', ''), 10) || 10000;
    const brackets = [];
    for (const interval of STANDARD_MACRO_INTERVALS) {
      if (interval.min > upper) {
        continue;
      }
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

// 8. Apollo URL Hash Filter Extractor (Auto-detects active filters from browser URL)
export function parseApolloUrlHash(urlOrHash = '') {
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
    if (combined.length > 0) {
      result[apiKey] = combined;
    }
  }

  for (const [paramKey, apiKey] of Object.entries(stringMappings)) {
    const val = params.get(paramKey);
    if (val) {
      result[apiKey] = val;
    }
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

// 8b. Apollo URL Hash Slice Builder
export function buildHashForSlice(currentHash, cabinetOrBracket, sortField = null, sortAsc = true) {
  const qIdx = currentHash.indexOf('?');
  const path = qIdx !== -1 ? currentHash.slice(0, qIdx) : '#/people';
  const rawQuery = qIdx !== -1 ? currentHash.slice(qIdx + 1) : '';

  const pairs = rawQuery.split('&').filter(Boolean);
  const filteredPairs = [];

  let bracketStr = null;
  let seniority = null;
  let emailStatus = null;
  let personTitles = null;

  if (typeof cabinetOrBracket === 'object' && cabinetOrBracket !== null) {
    bracketStr = Array.isArray(cabinetOrBracket.bracket) ? cabinetOrBracket.bracket[0] : (cabinetOrBracket.label || null);
    seniority = cabinetOrBracket.seniority || null;
    emailStatus = cabinetOrBracket.emailStatus || null;
  } else if (cabinetOrBracket) {
    bracketStr = String(cabinetOrBracket);
  }

  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    const key = eq !== -1 ? decodeURIComponent(pair.slice(0, eq)) : decodeURIComponent(pair);
    if (
      key !== 'page' &&
      key !== 'organizationNumEmployeesRanges[]' &&
      key !== 'organizationNumEmployeesRanges' &&
      key !== 'sortByField' &&
      key !== 'sortAscending' &&
      key !== '_t' &&
      (!seniority || (key !== 'personSeniorities[]' && key !== 'personSeniorities')) &&
      (!emailStatus || (key !== 'contactEmailStatus[]' && key !== 'contactEmailStatus'))
    ) {
      filteredPairs.push(pair);
    }
  }

  filteredPairs.push('page=1');
  if (bracketStr) {
    filteredPairs.push(`organizationNumEmployeesRanges[]=${encodeURIComponent(bracketStr)}`);
  }
  if (seniority) {
    filteredPairs.push(`personSeniorities[]=${encodeURIComponent(seniority)}`);
  }
  if (Array.isArray(emailStatus)) {
    for (const est of emailStatus) {
      filteredPairs.push(`contactEmailStatus[]=${encodeURIComponent(est)}`);
    }
  }
  if (sortField) {
    filteredPairs.push(`sortByField=${encodeURIComponent(sortField)}`);
    filteredPairs.push(`sortAscending=${String(sortAsc)}`);
  }
  filteredPairs.push(`_t=${Date.now()}`);

  return `${path}?${filteredPairs.join('&')}`;
}

// 9. Universal Execution Plan Resolver (Extracts active search brackets or defaults to 10 universal brackets)
export function resolveHarvestExecutionPlan(basePayload = {}) {
  const customRanges = basePayload.organization_num_employees_ranges;
  if (Array.isArray(customRanges) && customRanges.length > 0) {
    if (customRanges.length === 1 && typeof customRanges[0] === 'string' && (customRanges[0].endsWith(',') || customRanges[0].endsWith('+') || customRanges[0].startsWith(','))) {
      return expandOpenHeadcountRange(customRanges[0]);
    }
    return customRanges.map(r => Array.isArray(r) ? r : [r]);
  }
  return [...UNIVERSAL_PRIMARY_HEADCOUNT_BRACKETS];
}

// 9b. Micro-Bracket Execution Plan Resolver (Decomposes macro brackets into adaptive micro-cabinets)
export function resolveExecutionBrackets(basePayload = {}, options = {}) {
  const customRanges = basePayload.organization_num_employees_ranges;
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
            out.push(...decomposeHighDensityBracket(macro, options));
          } else {
            out.push([macro]);
          }
        }
      } else if (typeof str === 'string' && isHighDensityBracket([str])) {
        out.push(...decomposeHighDensityBracket(str, options));
      } else {
        out.push(Array.isArray(r) ? r : [r]);
      }
    }
    return out;
  }
  const universal = [];
  for (const b of UNIVERSAL_PRIMARY_HEADCOUNT_BRACKETS) {
    const macro = b[0];
    if (macro === '10001') {
      universal.push(['10001']);
    } else if (isHighDensityBracket([macro])) {
      universal.push(...decomposeHighDensityBracket(macro, options));
    } else {
      universal.push([macro]);
    }
  }
  return universal;
}

// 9. Cabinet Overflow Detector (Checks if cabinet has >125 leads and needs dynamic drain)
export function shouldEngageCabinetDrain(totalEntries, currentHarvestedInBracket, maxStandardPages = 5) {
  const maxStandardLeads = maxStandardPages * 25;
  if (totalEntries > maxStandardLeads && currentHarvestedInBracket < totalEntries) {
    return true;
  }
  return false;
}

// 10. Cabinet-Scoped Dynamic Exclusion Tracker
export class CabinetExclusionTracker {
  constructor() {
    this.personIds = new Set();
    this.orgIds = new Set();
  }

  addLead(lead) {
    if (!lead || typeof lead !== 'object') return false;
    if (lead.id) this.personIds.add(lead.id);
    if (lead.organization_id) this.orgIds.add(lead.organization_id);
    if (lead.organization?.id) this.orgIds.add(lead.organization.id);
    return true;
  }

  getPersonIds() {
    return Array.from(this.personIds);
  }

  getOrgIds() {
    return Array.from(this.orgIds);
  }

  size() {
    return this.personIds.size;
  }

  reset() {
    this.personIds.clear();
    this.orgIds.clear();
  }
}

// 11. Cabinet Drain Payload Builder (Page 1 + Bracket + Bracket-Scoped Exclusions)
export function buildCabinetDrainPayload(basePayload, bracket, cabinetTracker) {
  const payload = { ...basePayload };
  payload.page = 1;
  payload.per_page = 25;
  payload.organization_num_employees_ranges = bracket;

  const personIds = cabinetTracker.getPersonIds();
  const orgIds = cabinetTracker.getOrgIds();

  if (personIds.length > 0) {
    payload.person_ids_excluded = personIds;
  }
  if (orgIds.length > 0) {
    payload.organization_ids_excluded = orgIds;
    payload.excluded_organization_ids = orgIds;
  }

  return payload;
}

// 12. Bracket Subdivision Threshold Detector (Detects pools > 250 leads needing micro-slicing)
export function shouldSubdivideBracket(totalEntries) {
  return typeof totalEntries === 'number' && totalEntries > 250;
}

// 13. Bidirectional Sort Plan Generator (Enables 250-lead capture per bracket: top 125 + bottom 125)
export function generateBidirectionalSortPlans(totalEntries) {
  const plans = [{ sort_ascending: false, label: 'top' }];
  if (typeof totalEntries === 'number' && totalEntries > 125) {
    plans.push({ sort_ascending: true, label: 'bottom' });
  }
  return plans;
}

// 14. High-Density Bracket Detector
export function isHighDensityBracket(bracket) {
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

// 15. Decompose High-Density Bracket into Sub-250 Micro-Ranges
export function decomposeHighDensityBracket(bracketStr, options = {}) {
  if (typeof bracketStr !== 'string') return [[bracketStr]];
  const parts = bracketStr.split(',').map(s => parseInt(s.trim(), 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return [[bracketStr]];
  }

  const [min, max] = parts;
  if (min === max) {
    return [[`${min},${max}`]];
  }

  const isGranular = options.granular === true;
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
      const stepSize = isGranular ? 4 : 9; // Granular: steps of 5 (e.g. 51-55), default: steps of 10
      while (cur <= segEnd) {
        const next = Math.min(cur + stepSize, segEnd);
        steps.push([`${cur},${next}`]);
        cur = next + 1;
      }
    } else if (cur <= 200) {
      const segEnd = Math.min(200, max);
      if (isGranular) {
        // Granular: steps of 10 (101-110, 111-120 ... 191-200)
        while (cur <= segEnd) {
          const next = Math.min(cur + 9, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else {
        while (cur <= segEnd) {
          let next;
          if (cur <= 150) next = Math.min(150, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      }
    } else if (cur <= 500) {
      const segEnd = Math.min(500, max);
      const stepSize = isGranular ? 24 : 49; // Granular: steps of 25 (e.g. 201-225), default: steps of 50
      while (cur <= segEnd) {
        const next = Math.min(cur + stepSize, segEnd);
        steps.push([`${cur},${next}`]);
        cur = next + 1;
      }
    } else if (cur <= 1000) {
      const segEnd = Math.min(1000, max);
      if (isGranular) {
        // Granular: steps of 50 (501-550, 551-600 ... 951-1000)
        while (cur <= segEnd) {
          const next = Math.min(cur + 49, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else {
        while (cur <= segEnd) {
          let next;
          if (cur <= 750) next = Math.min(750, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      }
    } else if (cur <= 5000) {
      const segEnd = Math.min(5000, max);
      if (isGranular) {
        // Granular: steps of 250
        while (cur <= segEnd) {
          const next = Math.min(cur + 249, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else {
        while (cur <= segEnd) {
          let next;
          if (cur <= 2000) next = Math.min(2000, segEnd);
          else if (cur <= 3500) next = Math.min(3500, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      }
    } else if (cur <= 10000) {
      const segEnd = Math.min(10000, max);
      if (isGranular) {
        // Granular: steps of 500
        while (cur <= segEnd) {
          const next = Math.min(cur + 499, segEnd);
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      } else {
        while (cur <= segEnd) {
          let next;
          if (cur <= 7500) next = Math.min(7500, segEnd);
          else next = segEnd;
          steps.push([`${cur},${next}`]);
          cur = next + 1;
        }
      }
    } else {
      steps.push(['10001']);
      break;
    }
  }

  return steps.length > 0 ? steps : [[`${min},${max}`]];
}

// 16. Generate Complete Adaptive Micro-Brackets for Open Range or Universal Set
export function generateAdaptiveMicroBrackets(openRangeLowerStr = '5,', options = {}) {
  const macroBrackets = expandOpenHeadcountRange(openRangeLowerStr).map(b => b[0]);

  const microBrackets = [];
  for (const macro of macroBrackets) {
    if (macro === '10001') {
      microBrackets.push(['10001']);
    } else if (isHighDensityBracket([macro])) {
      const subSlices = decomposeHighDensityBracket(macro, options);
      microBrackets.push(...subSlices);
    } else {
      microBrackets.push([macro]);
    }
  }

  return microBrackets;
}

// 16b. Seniority Facet Filtering & Dense Cabinet Pivot Helpers
export const DEFAULT_SECONDARY_SENIORITIES = [
  'owner',
  'founder',
  'c_suite',
  'partner',
  'vp',
  'head',
  'director',
  'manager',
  'senior',
  'entry',
  'intern'
];

export function filterActiveSeniorityFacets(rawFacets) {
  if (!Array.isArray(rawFacets)) return [...DEFAULT_SECONDARY_SENIORITIES];
  return rawFacets
    .filter(f => f && typeof f === 'object' && f.value && (f.count === undefined || f.count > 0))
    .map(f => f.value);
}

export function resolveDenseCabinetSeniorityPivots(rawFacets) {
  if (Array.isArray(rawFacets) && rawFacets.length > 0) {
    const active = filterActiveSeniorityFacets(rawFacets);
    if (active.length > 0) return active;
  }
  return [...DEFAULT_SECONDARY_SENIORITIES];
}

// 17. SmartBatcher: Autonomous Adaptive Cabinet Sizer
export class SmartBatcher {
  constructor(options = {}) {
    this.maxLimit = options.maxLeadsPerCabinet || 245;
    this.probeFn = options.probeFn || null;
    this.secondaryDimensions = options.secondaryDimensions || [
      'founder',
      'c_suite',
      'owner',
      'partner',
      'vp',
      'director',
      'manager',
      'senior',
      'entry'
    ];
  }

  /**
   * Evaluates a single range and returns the execution decision
   */
  classifyBracket(totalEntries, min, max) {
    if (totalEntries === 0) {
      return { action: 'SKIP', reason: 'EMPTY_CABINET' };
    }
    if (totalEntries <= this.maxLimit) {
      return {
        action: 'EXECUTE_BIDIRECTIONAL',
        bracket: [`${min},${max}`],
        total: totalEntries,
        pagesNeeded: Math.ceil(totalEntries / 25)
      };
    }
    if (min < max) {
      const mid = Math.floor((min + max) / 2);
      return {
        action: 'BISECT',
        left: [min, mid],
        right: [mid + 1, max],
        total: totalEntries
      };
    }
    // Single integer headcount > 250: Pivot to secondary dimension
    return {
      action: 'PIVOT_SECONDARY',
      bracket: [`${min},${max}`],
      dimension: 'person_seniorities',
      slices: this.secondaryDimensions.map(s => ({
        bracket: [`${min},${max}`],
        seniority: [s]
      })),
      total: totalEntries
    };
  }

  /**
   * Autonomous resolver: dynamically probes and bisects/coalesces cabinets
   */
  async resolveOptimalPlan(initialRanges) {
    if (!this.probeFn) {
      throw new Error('probeFn required for live resolution');
    }

    const plan = [];
    const queue = initialRanges.map(r => {
      if (typeof r === 'string') {
        const parts = r.split(',').map(n => parseInt(n.trim(), 10));
        return [parts[0], parts[1] || parts[0]];
      }
      return r;
    });

    while (queue.length > 0) {
      const [min, max] = queue.shift();
      const rangeStr = min === max ? `${min},${min}` : `${min},${max}`;
      const total = await this.probeFn(rangeStr);

      const decision = this.classifyBracket(total, min, max);

      if (decision.action === 'SKIP') {
        continue;
      } else if (decision.action === 'EXECUTE_BIDIRECTIONAL') {
        plan.push(decision);
      } else if (decision.action === 'BISECT') {
        queue.unshift(decision.right);
        queue.unshift(decision.left);
      } else if (decision.action === 'PIVOT_SECONDARY') {
        plan.push(decision);
      }
    }

    return plan;
  }

  /**
   * Autonomous pre-flight density resolver for 100% lead coverage with minimal API calls
   */
  async resolveAdaptiveTree(basePayload = {}, options = {}) {
    return resolveAdaptiveExecutionTree(this.probeFn, basePayload, {
      maxLeadsPerCabinet: this.maxLimit,
      ...options
    });
  }

  /**
   * Static Offline Coalescence (Greedy Bin-Packing):
   * Groups adjacent known micro-brackets into optimal combined ranges <= maxLimit
   */
  coalesceRanges(knownDensityMap) {
    const coalesced = [];
    let currentGroup = null;

    for (const item of knownDensityMap) {
      if (item.total === 0) continue;

      if (!currentGroup) {
        currentGroup = { min: item.min, max: item.max, total: item.total };
      } else if (currentGroup.total + item.total <= this.maxLimit && currentGroup.max + 1 === item.min) {
        // Coalesce contiguous range
        currentGroup.max = item.max;
        currentGroup.total += item.total;
      } else {
        coalesced.push({
          bracket: [`${currentGroup.min},${currentGroup.max}`],
          total: currentGroup.total
        });
        currentGroup = { min: item.min, max: item.max, total: item.total };
      }
    }

    if (currentGroup) {
      coalesced.push({
        bracket: [`${currentGroup.min},${currentGroup.max}`],
        total: currentGroup.total
      });
    }

    return coalesced;
  }
}

/**
 * Dynamic Runtime Cabinet Subdivider
 * Splits an overflowing cabinet (> 250 leads) into smaller reachable sub-cabinets.
 * Slicing hierarchy (Strictly Zero Job Titles):
 *  1. Headcount Bisection (if min < max)
 *  2. Seniorities (if min === max and seniority is null)
 *  3. Email Status (if min === max, seniority is set, and emailStatus is null)
 */
export function subdivideCabinet(cabinet = {}, totalEntries = 0, options = {}) {
  const maxLimit = options.maxLeadsPerCabinet || 250;
  if (!totalEntries || totalEntries <= maxLimit) {
    return [cabinet];
  }

  const rawBracket = Array.isArray(cabinet.bracket) && cabinet.bracket.length > 0
    ? cabinet.bracket[0]
    : (cabinet.label || '');

  let min = null;
  let max = null;

  if (typeof rawBracket === 'string') {
    if (rawBracket === '10001') {
      min = 10001;
      max = 10001;
    } else if (rawBracket.includes(',')) {
      const parts = rawBracket.split(',').map(n => parseInt(n.trim(), 10));
      min = parts[0];
      max = parts[1] !== undefined ? parts[1] : parts[0];
    } else {
      const parsed = parseInt(rawBracket.trim(), 10);
      if (!isNaN(parsed)) {
        min = parsed;
        max = parsed;
      }
    }
  }

  // Level 1: Headcount Bisection (if span has min < max)
  if (typeof min === 'number' && typeof max === 'number' && min < max) {
    const mid = Math.floor((min + max) / 2);
    const leftBracket = `${min},${mid}`;
    const rightBracket = `${mid + 1},${max}`;

    const left = {
      ...cabinet,
      label: cabinet.seniority ? `${leftBracket} ${cabinet.seniority}` : leftBracket,
      bracket: [leftBracket],
      total: null,
      mode: 'Bidirectional'
    };

    const right = {
      ...cabinet,
      label: cabinet.seniority ? `${rightBracket} ${cabinet.seniority}` : rightBracket,
      bracket: [rightBracket],
      total: null,
      mode: 'Bidirectional'
    };

    return [left, right];
  }

  const baseFilters = options.baseFilters || {};
  const userSeniorities = Array.isArray(baseFilters.person_seniorities) && baseFilters.person_seniorities.length > 0
    ? baseFilters.person_seniorities
    : null;
  const userEmailStatuses = Array.isArray(baseFilters.contact_email_status) && baseFilters.contact_email_status.length > 0
    ? baseFilters.contact_email_status
    : null;

  // Level 2: Seniority Partitioning (if single integer headcount and no seniority set)
  // Strictly respects user-selected seniorities; never expands if user specified a single seniority
  if (!cabinet.seniority && (!userSeniorities || userSeniorities.length > 1)) {
    const seniorities = userSeniorities || (Array.isArray(options.seniorities) && options.seniorities.length > 0
      ? options.seniorities
      : [
          'founder',
          'owner',
          'c_suite',
          'partner',
          'vp',
          'head',
          'director',
          'manager',
          'senior',
          'entry',
          'intern'
        ]);

    const bracketArr = [rawBracket || '10001'];
    return seniorities.map(sen => ({
      ...cabinet,
      label: `${rawBracket || 'Headcount'} ${sen}`,
      bracket: bracketArr,
      seniority: sen,
      total: null,
      mode: 'Bidirectional'
    }));
  }

  const effectiveSeniority = cabinet.seniority || (userSeniorities && userSeniorities.length === 1 ? userSeniorities[0] : null);

  // Level 3: Email Status Partitioning (if single integer, seniority already set, and emailStatus null)
  // Strictly respects user-selected email statuses; never expands if user specified a single status
  if (!cabinet.emailStatus && (!userEmailStatuses || userEmailStatuses.length > 1)) {
    const defaultPartitions = [
      { key: 'verified', values: ['verified'] },
      { key: 'guessed', values: ['guessed'] },
      { key: 'unavailable', values: ['unavailable'] }
    ];

    const activePartitions = userEmailStatuses
      ? defaultPartitions.filter(p => p.values.some(v => userEmailStatuses.includes(v)))
      : defaultPartitions;

    if (activePartitions.length > 1) {
      return activePartitions.map(ep => ({
        ...cabinet,
        label: effectiveSeniority ? `${rawBracket} ${effectiveSeniority} ${ep.key}` : `${cabinet.label || rawBracket} ${ep.key}`,
        seniority: effectiveSeniority,
        emailStatus: ep.values,
        total: null,
        mode: 'Bidirectional'
      }));
    }
  }

  // Fallback: Leaf granularity reached (preserves all user criteria)
  return [cabinet];
}

/**
 * Coalesce Sparse Ranges (Standalone Function)
 * Optimal bin-packing of adjacent contiguous micro-ranges into <= maxLimit cabinets
 */
export function coalesceSparseRanges(knownDensityMap = [], maxLimit = 245) {
  const coalesced = [];
  let currentGroup = null;

  for (const item of knownDensityMap) {
    if (!item || item.total === 0) continue;

    if (!currentGroup) {
      currentGroup = { min: item.min, max: item.max, total: item.total };
    } else if (currentGroup.total + item.total <= maxLimit && currentGroup.max + 1 === item.min) {
      currentGroup.max = item.max;
      currentGroup.total += item.total;
    } else {
      coalesced.push({
        bracket: [`${currentGroup.min},${currentGroup.max}`],
        min: currentGroup.min,
        max: currentGroup.max,
        total: currentGroup.total
      });
      currentGroup = { min: item.min, max: item.max, total: item.total };
    }
  }

  if (currentGroup) {
    coalesced.push({
      bracket: [`${currentGroup.min},${currentGroup.max}`],
      min: currentGroup.min,
      max: currentGroup.max,
      total: currentGroup.total
    });
  }

  return coalesced;
}

/**
 * Dynamic Pre-Flight Bisection Tree
 * Recursively probes density and partitions search space into <= 245 lead cabinets.
 * For dense ranges (> 245), completely skips broad sweeps and generates disjoint seniority partitions.
 */
export class DynamicBisectionTree {
  constructor(options = {}) {
    this.maxLimit = options.maxLeadsPerCabinet || 245;
    this.maxDepth = options.maxDepth || 10;
    this.probeFn = options.probeFn || null;
    this.seniorities = options.seniorities || [
      'founder',
      'c_suite',
      'vp',
      'director',
      'manager',
      'senior',
      'entry'
    ];
    this.cache = new Map();
  }

  async probe(min, max, extraPayload = {}) {
    const rangeStr = min === max ? `${min},${min}` : `${min},${max}`;
    if (this.cache.has(rangeStr)) {
      return this.cache.get(rangeStr);
    }
    if (!this.probeFn) {
      throw new Error('probeFn required for DynamicBisectionTree');
    }
    const result = await this.probeFn(rangeStr, extraPayload);
    const total = typeof result === 'object' && result !== null && typeof result.total === 'number'
      ? result.total
      : Number(result) || 0;
    this.cache.set(rangeStr, total);
    return total;
  }

  async bisect(min, max, currentDepth = 0) {
    const total = await this.probe(min, max);

    if (total === 0) {
      return [];
    }

    if (total <= this.maxLimit) {
      return [{
        type: 'HEADCOUNT',
        min,
        max,
        total,
        bracket: [`${min},${max}`],
        action: 'EXECUTE_BIDIRECTIONAL',
        skipBroadSweep: false,
        pagesNeeded: Math.ceil(total / 25)
      }];
    }

    // Dense: total > maxLimit
    if (min < max && currentDepth < this.maxDepth) {
      const mid = Math.floor((min + max) / 2);
      const left = await this.bisect(min, mid, currentDepth + 1);
      const right = await this.bisect(mid + 1, max, currentDepth + 1);
      return [...left, ...right];
    }

    // Cannot bisect headcount further (min === max or maxDepth reached)
    // ZERO-REDUNDANCY FRESH-LEAD ARCHITECTURE:
    // Skip broad sweep entirely! Generate disjoint seniority partitions.
    return this.seniorities.map(s => ({
      type: 'SENIORITY',
      min,
      max,
      bracket: [`${min},${max}`],
      seniority: [s],
      total,
      action: 'EXECUTE_SENIORITY',
      skipBroadSweep: true
    }));
  }

  async buildExecutionPlan(initialRanges = []) {
    const plan = [];
    const parsedRanges = initialRanges.map(r => {
      if (typeof r === 'string') {
        const parts = r.split(',').map(n => parseInt(n.trim(), 10));
        return [parts[0], parts[1] || parts[0]];
      }
      if (Array.isArray(r)) {
        if (typeof r[0] === 'string' && r[0].includes(',')) {
          const parts = r[0].split(',').map(n => parseInt(n.trim(), 10));
          return [parts[0], parts[1] || parts[0]];
        }
        return [r[0], r[1] !== undefined ? r[1] : r[0]];
      }
      return [1, 10];
    });

    for (const [min, max] of parsedRanges) {
      const slices = await this.bisect(min, max, 0);
      plan.push(...slices);
    }

    return plan;
  }
}

/**
 * Harvest Manifest: Crash-Resistant State Machine & Resumable Checkpoint Engine
 */
export class HarvestManifest {
  constructor(options = {}) {
    this.jobId = null;
    this.searchParams = {};
    this.slices = [];
    this.status = 'IDLE'; // IDLE, PENDING, IN_PROGRESS, COMPLETED, FAILED
    this.createdAt = null;
    this.updatedAt = null;
  }

  create(jobId, searchParams = {}, plan = []) {
    this.jobId = jobId || `job_${Date.now()}`;
    this.searchParams = { ...searchParams };
    this.slices = plan.map((slice, index) => ({
      id: slice.id || `slice_${index + 1}`,
      type: slice.type || 'HEADCOUNT',
      bracket: slice.bracket || [],
      seniority: slice.seniority || null,
      total: slice.total || 0,
      skipBroadSweep: slice.skipBroadSweep || false,
      status: 'PENDING', // PENDING, IN_PROGRESS, COMPLETED, FAILED, SKIPPED
      harvested: 0,
      netFresh: 0,
      duplicates: 0,
      error: null
    }));
    this.status = 'PENDING';
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    return this;
  }

  updateSlice(sliceId, updates = {}) {
    const slice = this.slices.find(s => s.id === sliceId);
    if (!slice) return false;

    Object.assign(slice, updates);
    this.updatedAt = new Date().toISOString();

    if (this.slices.some(s => s.status === 'IN_PROGRESS')) {
      this.status = 'IN_PROGRESS';
    }

    if (this.isComplete()) {
      this.status = 'COMPLETED';
    }

    return true;
  }

  getPendingSlices() {
    return this.slices.filter(s => s.status === 'PENDING' || s.status === 'FAILED');
  }

  isComplete() {
    return this.slices.length > 0 && this.slices.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');
  }

  getProgress() {
    const totalSlices = this.slices.length;
    const completedSlices = this.slices.filter(s => s.status === 'COMPLETED' || s.status === 'SKIPPED').length;
    let netFreshTotal = 0;
    let duplicatesTotal = 0;
    let harvestedTotal = 0;

    for (const slice of this.slices) {
      netFreshTotal += slice.netFresh || 0;
      duplicatesTotal += slice.duplicates || 0;
      harvestedTotal += slice.harvested || 0;
    }

    const percentComplete = totalSlices > 0 ? Math.round((completedSlices / totalSlices) * 100) : 0;

    return {
      totalSlices,
      completedSlices,
      harvestedTotal,
      netFreshTotal,
      duplicatesTotal,
      percentComplete
    };
  }

  serialize() {
    return JSON.stringify({
      jobId: this.jobId,
      searchParams: this.searchParams,
      slices: this.slices,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
  }

  deserialize(data) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    if (!obj || typeof obj !== 'object') return false;

    this.jobId = obj.jobId || null;
    this.searchParams = obj.searchParams || {};
    this.slices = Array.isArray(obj.slices) ? obj.slices : [];
    this.status = obj.status || 'IDLE';
    this.createdAt = obj.createdAt || null;
    this.updatedAt = obj.updatedAt || null;
    return true;
  }
}

/**
 * 12. Universal Record Flattening & Normalization (Zero Data Loss)
 */

export function flattenRecord(obj, prefix = '', res = {}) {
  if (!obj || typeof obj !== 'object') return res;

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key;

    if (val === null || val === undefined) {
      res[fullKey] = '';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        res[fullKey] = '';
      } else if (typeof val[0] === 'object' && val[0] !== null) {
        res[fullKey] = JSON.stringify(val);
      } else {
        res[fullKey] = val.join('; ');
      }
    } else if (typeof val === 'object') {
      flattenRecord(val, fullKey, res);
    } else {
      res[fullKey] = val;
    }
  }

  return res;
}

export function inferSeniority(title = '') {
  if (!title || typeof title !== 'string') return 'individual_contributor';
  const t = title.toLowerCase();
  if (/founder|co-founder|owner|co-owner|proprietor|partner/.test(t)) return 'founder';
  if (/\b(vp|vice president|evp|svp)\b/.test(t)) return 'vp';
  if (/\b(ceo|cto|cfo|coo|cmo|cro|cio|cpo|chief|president|co-chair|chair)\b/.test(t)) return 'c_suite';
  if (/\b(head of|head)\b/.test(t)) return 'head';
  if (/\b(director)\b/.test(t)) return 'director';
  if (/\b(manager|lead|principal)\b/.test(t)) return 'manager';
  if (/\b(senior|sr)\b/.test(t)) return 'senior';
  if (/\b(intern|trainee)\b/.test(t)) return 'intern';
  return 'individual_contributor';
}

export function extractPastExperience(empHistory = []) {
  if (!Array.isArray(empHistory)) return { past_companies: '', past_titles: '' };
  const companies = [];
  const titles = [];
  empHistory.forEach(e => {
    if (e && e.organization_name && !companies.includes(e.organization_name)) companies.push(e.organization_name);
    if (e && e.title && !titles.includes(e.title)) titles.push(e.title);
  });
  return {
    past_companies: companies.join('; '),
    past_titles: titles.join('; ')
  };
}

export const PREFERRED_PERSON_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'full_name',
  'name',
  'title',
  'seniority',
  'icp_score',
  'icp_tier',
  'icp_reasons',
  'headline',
  'photo_url',
  'past_companies',
  'past_titles',
  'email',
  'extrapolated_email',
  'email_status',
  'phone',
  'linkedin_url',
  'twitter_url',
  'github_url',
  'facebook_url',
  'city',
  'state',
  'country',
  'postal_code',
  'formatted_address',
  'time_zone',
  'company_name',
  'company_domain',
  'company_phone',
  'company_employees',
  'company_industry',
  'company_technologies',
  'company_keywords',
  'company_funding',
  'company_revenue',
  'company_linkedin',
  'company_website',
  'scraped_at'
];

export const PREFERRED_COMPANY_COLUMNS = [
  'id',
  'company_name',
  'name',
  'domain',
  'primary_domain',
  'website_url',
  'phone',
  'sanitized_phone',
  'primary_phone_number',
  'estimated_num_employees',
  'employees',
  'organization_revenue_printed',
  'organization_revenue',
  'revenue',
  'industry',
  'keywords',
  'technologies',
  'street_address',
  'city',
  'state',
  'country',
  'postal_code',
  'raw_address',
  'founded_year',
  'sic_codes',
  'naics_codes',
  'linkedin_url',
  'twitter_url',
  'facebook_url',
  'angellist_url',
  'crunchbase_url',
  'alexa_ranking',
  'total_funding',
  'latest_funding_round',
  'short_description',
  'scraped_at'
];

export function synthesizeProbableEmail(firstName = '', lastName = '', domain = '') {
  const f = (firstName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const l = (lastName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const d = (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  if (!f || !l || !d || !d.includes('.')) return '';
  return `${f}.${l}@${d}`;
}

export function normalizePersonComprehensive(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const org = raw.organization || {};
  const exp = extractPastExperience(raw.employment_history);

  const employeesVal = org.estimated_num_employees !== undefined && org.estimated_num_employees !== null && org.estimated_num_employees !== ''
    ? org.estimated_num_employees
    : (org.number_of_employees || org.num_employees || org.organization_num_employees || org.employee_count || org.organization_num_employees_range || '');

  const industryVal = org.industry || (Array.isArray(org.industries) ? org.industries.join('; ') : '') || '';

  const techVal = Array.isArray(org.technology_names)
    ? org.technology_names.join('; ')
    : (Array.isArray(org.technologies) ? org.technologies.join('; ') : (org.technologies || ''));

  const keywordsVal = Array.isArray(org.keywords) ? org.keywords.join('; ') : (org.keywords || '');

  const fundingVal = org.total_funding_printed || org.total_funding || '';

  const cleanOrgDomain = org.primary_domain || org.website_url || '';
  const isEmailLocked = !raw.email || raw.email.includes('email_not_unlocked');
  const extrapolated = !isEmailLocked ? raw.email : (raw.extrapolated_email || synthesizeProbableEmail(raw.first_name, raw.last_name, cleanOrgDomain));

  const base = {
    id: raw.id || '',
    first_name: raw.first_name || '',
    last_name: raw.last_name || '',
    full_name: raw.name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
    title: raw.title || '',
    seniority: raw.seniority || inferSeniority(raw.title || ''),
    headline: raw.headline || '',
    photo_url: raw.photo_url || '',
    past_companies: exp.past_companies,
    past_titles: exp.past_titles,
    email: raw.email || '',
    extrapolated_email: extrapolated,
    email_status: raw.email_status || (raw.email ? 'verified' : 'unrevealed'),
    phone: raw.phone_numbers?.[0]?.raw_number || org.phone || org.primary_phone?.number || '',
    linkedin_url: raw.linkedin_url || '',
    twitter_url: raw.twitter_url || '',
    github_url: raw.github_url || '',
    facebook_url: raw.facebook_url || '',
    city: raw.city || '',
    state: raw.state || '',
    country: raw.country || '',
    postal_code: raw.postal_code || '',
    formatted_address: raw.formatted_address || '',
    time_zone: raw.time_zone || '',
    company_id: org.id || raw.organization_id || '',
    company_name: org.name || '',
    company_domain: org.primary_domain || org.website_url || '',
    company_phone: org.phone || org.primary_phone?.number || org.sanitized_phone || '',
    company_employees: employeesVal,
    company_revenue: org.organization_revenue_printed || org.annual_revenue_printed || org.annual_revenue || '',
    company_industry: industryVal,
    company_technologies: techVal,
    company_keywords: keywordsVal,
    company_funding: fundingVal,
    company_linkedin: org.linkedin_url || '',
    company_website: org.website_url || '',
    scraped_at: new Date().toISOString()
  };

  const flattened = flattenRecord(raw);
  const full = { ...flattened, ...base };
  return computeLeadICPScore(full);
}

export function normalizeCompanyComprehensive(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const employeesVal = raw.estimated_num_employees !== undefined && raw.estimated_num_employees !== null && raw.estimated_num_employees !== ''
    ? raw.estimated_num_employees
    : (raw.num_employees || raw.organization_num_employees || raw.employee_count || raw.organization_num_employees_range || '');

  const base = {
    id: raw.id || '',
    company_name: raw.name || '',
    domain: raw.primary_domain || raw.website_url || '',
    website_url: raw.website_url || '',
    linkedin_url: raw.linkedin_url || '',
    twitter_url: raw.twitter_url || '',
    facebook_url: raw.facebook_url || '',
    phone: raw.primary_phone?.number || raw.phone || raw.sanitized_phone || '',
    street_address: raw.street_address || raw.raw_address || '',
    city: raw.city || '',
    state: raw.state || '',
    postal_code: raw.postal_code || '',
    country: raw.country || '',
    industry: raw.industry || '',
    keywords: Array.isArray(raw.keywords) ? raw.keywords.join('; ') : (raw.keywords || ''),
    employees: employeesVal,
    revenue: raw.organization_revenue_printed || raw.annual_revenue_printed || raw.organization_revenue || raw.annual_revenue || '',
    founded_year: raw.founded_year || '',
    sic_codes: Array.isArray(raw.sic_codes) ? raw.sic_codes.join('; ') : (raw.sic_codes || ''),
    naics_codes: Array.isArray(raw.naics_codes) ? raw.naics_codes.join('; ') : (raw.naics_codes || ''),
    technologies: Array.isArray(raw.technology_names) ? raw.technology_names.join('; ') : (Array.isArray(raw.technologies) ? raw.technologies.join('; ') : (raw.technologies || '')),
    total_funding: raw.total_funding_printed || raw.total_funding || '',
    latest_funding_round: raw.latest_funding_round_date || raw.latest_funding_stage_cd || raw.latest_funding_stage || '',
    short_description: raw.short_description || '',
    scraped_at: new Date().toISOString()
  };

  const flattened = flattenRecord(raw);
  return { ...flattened, ...base };
}

export const normalizeCompany = normalizeCompanyComprehensive;

/**
 * 13. CSV Value Sanitizer & Formula Injection Defense
 * Collapses embedded newlines to guarantee 1 physical line per record
 * and prefixes formula trigger characters (=, +, -, @, \t, \r) with a single quote.
 */
export function sanitizeCSVValue(val, options = {}) {
  const singleLine = options.singleLine !== false;
  const escapeFormulas = options.escapeFormulas !== false;

  if (val === null || val === undefined) return '';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);

  // 1. Formula injection protection (DDE / Excel CSV Injection):
  if (escapeFormulas && /^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // 2. Single-line mode: strip outer newlines and collapse inner newlines to spaces
  if (singleLine) {
    str = str.replace(/^[\r\n]+|[\r\n]+$/g, '').replace(/[\r\n]+/g, ' ');
  }

  return str;
}

/**
 * Streaming RFC 4180 CSV parser respecting quotes and multiline cells
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/^\uFEFF/, '');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function buildUnionCSV(items, preferredOrder = []) {
  if (!items || items.length === 0) return '';

  const headerSet = new Set();
  
  // 1. Add preferred columns first if they exist in at least one item
  preferredOrder.forEach(col => {
    if (items.some(it => it && it[col] !== undefined && it[col] !== '')) {
      headerSet.add(col);
    }
  });

  // 2. Add all remaining columns found across any item
  items.forEach(it => {
    if (it && typeof it === 'object') {
      Object.keys(it).forEach(k => {
        if (k !== '_raw') {
          headerSet.add(k);
        }
      });
    }
  });

  const headers = Array.from(headerSet);

  const rows = items.map(item => {
    return headers.map(header => {
      let val = item[header];
      val = sanitizeCSVValue(val, { singleLine: true, escapeFormulas: true });

      if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}


// 14. Bidirectional People -> Company Enrichment Merger
export function mergeEnrichedCompanyToPerson(person, enrichedOrg) {
  if (!person || typeof person !== 'object') return {};
  if (!enrichedOrg || typeof enrichedOrg !== 'object') return { ...person };

  const techVal = enrichedOrg.technologies || (Array.isArray(enrichedOrg.technology_names) ? enrichedOrg.technology_names.join('; ') : '') || '';
  const fundingVal = enrichedOrg.total_funding || enrichedOrg.total_funding_printed || '';
  const revenueVal = enrichedOrg.revenue || enrichedOrg.organization_revenue_printed || enrichedOrg.annual_revenue_printed || '';
  const descVal = enrichedOrg.short_description || enrichedOrg.description || '';

  // Merge keywords cleanly without duplicates
  let mergedKeywords = person.company_keywords || '';
  if (enrichedOrg.keywords) {
    const orgKwList = (Array.isArray(enrichedOrg.keywords) ? enrichedOrg.keywords : String(enrichedOrg.keywords).split('; ')).map(k => String(k).trim()).filter(Boolean);
    const existingKwList = (mergedKeywords ? mergedKeywords.split('; ') : []).map(k => String(k).trim()).filter(Boolean);
    const combinedSet = new Set([...existingKwList, ...orgKwList]);
    mergedKeywords = Array.from(combinedSet).join('; ');
  }

  const employeesVal = (person.company_employees !== undefined && person.company_employees !== null && person.company_employees !== '')
    ? person.company_employees
    : (enrichedOrg.employees || enrichedOrg.estimated_num_employees || '');

  const industryVal = (person.company_industry !== undefined && person.company_industry !== null && person.company_industry !== '')
    ? person.company_industry
    : (enrichedOrg.industry || (Array.isArray(enrichedOrg.industries) ? enrichedOrg.industries.join('; ') : '') || '');

  const merged = {
    ...person,
    company_technologies: techVal || person.company_technologies || '',
    company_funding: fundingVal || person.company_funding || '',
    company_revenue: revenueVal || person.company_revenue || '',
    company_description: descVal || person.company_description || '',
    company_employees: employeesVal,
    company_industry: industryVal,
    company_keywords: mergedKeywords
  };

  return computeLeadICPScore(merged);
}

// 15. Asynchronous Bounded Company Enrichment Engine
export class CompanyEnrichmentEngine {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3;
    this.batchDelayMs = options.batchDelayMs !== undefined ? options.batchDelayMs : 200;
    this.fetcher = options.fetcher || this.defaultFetcher.bind(this);
    this.onCompanyEnriched = options.onCompanyEnriched || null;
    this.onProgress = options.onProgress || null;
    this.circuitBreaker = options.circuitBreaker || null;

    this.pendingIds = new Set();
    this.inFlightIds = new Set();
    this.enrichedCache = new Map(); // id -> normalizedOrg
    this.isProcessing = false;
  }

  async defaultFetcher(orgId) {
    const resp = await fetch(`https://app.apollo.io/api/v1/organizations/${orgId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    if (!resp.ok) {
      const err = new Error(`HTTP ${resp.status} ${resp.statusText}`);
      err.status = resp.status;
      throw err;
    }
    const json = await resp.json();
    return json.organization || json;
  }

  enqueue(ids) {
    if (!ids) return;
    const idArray = Array.isArray(ids) ? ids : [ids];
    idArray.forEach(id => {
      if (typeof id === 'string') id = id.trim();
      if (id && !this.enrichedCache.has(id) && !this.inFlightIds.has(id)) {
        this.pendingIds.add(id);
      }
    });

    if (this.onProgress) {
      this.onProgress(this.getStatus());
    }
  }

  sortPendingByLeverage(leads) {
    if (!leads) return;
    const countMap = new Map();
    const leadsList = leads instanceof Map ? leads.values() : (Array.isArray(leads) ? leads : []);
    for (const lead of leadsList) {
      const orgId = lead?.company_id || lead?.organization_id || lead?.organization?.id;
      if (orgId) {
        countMap.set(orgId, (countMap.get(orgId) || 0) + 1);
      }
    }

    const sorted = Array.from(this.pendingIds).sort((a, b) => {
      const countA = countMap.get(a) || 0;
      const countB = countMap.get(b) || 0;
      return countB - countA;
    });

    this.pendingIds = new Set(sorted);
  }

  isEnriched(id) {
    return this.enrichedCache.has(id);
  }

  getEnriched(id) {
    return this.enrichedCache.get(id) || null;
  }

  getStatus() {
    return {
      pending: this.pendingIds.size,
      inFlight: this.inFlightIds.size,
      enriched: this.enrichedCache.size
    };
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.pendingIds.size > 0) {
        if (this.circuitBreaker && typeof this.circuitBreaker.isTripped === 'function' && this.circuitBreaker.isTripped()) {
          break;
        }

        const batch = Array.from(this.pendingIds).slice(0, this.concurrency);
        batch.forEach(id => {
          this.pendingIds.delete(id);
          this.inFlightIds.add(id);
        });

        await Promise.all(batch.map(async id => {
          try {
            const rawOrg = await this.fetcher(id);
            if (rawOrg) {
              const enriched = typeof normalizeCompanyComprehensive === 'function'
                ? normalizeCompanyComprehensive(rawOrg)
                : rawOrg;
              this.enrichedCache.set(id, enriched);
              if (this.onCompanyEnriched) {
                this.onCompanyEnriched(enriched);
              }
            }
          } catch (err) {
            // Log warning, do not crash queue
            if (this.circuitBreaker && err.status === 429 && typeof this.circuitBreaker.recordRateLimit === 'function') {
              this.circuitBreaker.recordRateLimit();
            }
          } finally {
            this.inFlightIds.delete(id);
          }
        }));

        if (this.onProgress) {
          this.onProgress(this.getStatus());
        }

        if (this.pendingIds.size > 0 && this.batchDelayMs > 0) {
          await new Promise(r => setTimeout(r, this.batchDelayMs));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

/**
 * Lead Leverage Sorter: Sorts pending organization IDs descending by count of harvested employees attached
 */
export function sortOrgsByLeadLeverage(pendingOrgIds, leads) {
  if (!pendingOrgIds) return [];
  const countMap = new Map();
  const leadsList = leads instanceof Map ? leads.values() : (Array.isArray(leads) ? leads : []);
  for (const lead of leadsList) {
    const orgId = lead?.company_id || lead?.organization_id || lead?.organization?.id;
    if (orgId) {
      countMap.set(orgId, (countMap.get(orgId) || 0) + 1);
    }
  }

  const ids = Array.from(pendingOrgIds);
  return ids.sort((a, b) => {
    const countA = countMap.get(a) || 0;
    const countB = countMap.get(b) || 0;
    return countB - countA;
  });
}

/**
 * IndexedDBStorage Adapter for High-Throughput Safe Offloading
 * Offloads bulk leads and companies in batches without chrome.storage quota limits
 */
export class IndexedDBStorage {
  constructor(options = {}) {
    this.dbName = options.dbName || 'ApolloLeadExtractorDB';
    this.version = options.version || 1;
    this.db = null;
  }

  async openDB() {
    if (this.db) return this.db;
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('leads')) {
          db.createObjectStore('leads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('companies')) {
          db.createObjectStore('companies', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('manifests')) {
          db.createObjectStore('manifests', { keyPath: 'jobId' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  async putBatch(storeName, items = []) {
    const db = await this.openDB();
    if (!db || !items || items.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      let count = 0;

      for (const item of items) {
        if (!item) continue;
        const record = { ...item };
        if (!record.id) {
          record.id = record.primary_domain || record.domain || record.name || `item_${Date.now()}_${Math.random()}`;
        }
        store.put(record);
        count++;
      }

      tx.oncomplete = () => resolve(count);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getAll(storeName) {
    const db = await this.openDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async count(storeName) {
    const db = await this.openDB();
    if (!db) return 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async clear(storeName) {
    const db = await this.openDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

// 16. ECC Lead Intelligence: Autonomous Signal-Based ICP Scorer
export function computeLeadICPScore(lead) {
  if (!lead || typeof lead !== 'object') {
    return { icp_score: 0, icp_tier: 'Tier 3 (Standard)', icp_reasons: '' };
  }

  let score = 0;
  const reasons = [];

  // A. Seniority Alignment (Max 35 points)
  const sen = (lead.seniority || inferSeniority(lead.title || '')).toLowerCase();
  const title = (lead.title || '').toLowerCase();

  if (/\b(founder|co-founder|owner|proprietor|partner)\b/.test(title) || sen === 'founder') {
    score += 35;
    reasons.push('Founder (+35)');
  } else if (/\b(ceo|cto|cfo|coo|cmo|cro|cio|cpo|chief|president)\b/.test(title) || sen === 'c_suite') {
    score += 30;
    reasons.push('C-Suite (+30)');
  } else if (/\b(vp|vice president|evp|svp)\b/.test(title) || sen === 'vp') {
    score += 25;
    reasons.push('VP (+25)');
  } else if (/\b(director|head)\b/.test(title) || sen === 'director' || sen === 'head') {
    score += 20;
    reasons.push('Director/Head (+20)');
  } else if (/\b(manager|lead|principal)\b/.test(title) || sen === 'manager') {
    score += 10;
    reasons.push('Manager/Lead (+10)');
  } else if (/\b(senior|sr)\b/.test(title) || sen === 'senior') {
    score += 5;
    reasons.push('Senior (+5)');
  }

  // B. Reachability & Contact Quality (Max 25 points)
  const email = lead.email || '';
  const emailStatus = lead.email_status || '';
  if (email && (emailStatus === 'verified' || !emailStatus || emailStatus !== 'unrevealed')) {
    score += 15;
    reasons.push('Verified Email (+15)');
  } else if (email) {
    score += 8;
    reasons.push('Email Available (+8)');
  }

  const phone = lead.phone || lead.company_phone || '';
  if (phone) {
    score += 5;
    reasons.push('Direct/Org Phone (+5)');
  }

  const linkedin = lead.linkedin_url || '';
  if (linkedin && linkedin.includes('linkedin.com/in/')) {
    score += 5;
    reasons.push('LinkedIn Profile (+5)');
  }

  // C. Company Scale & Market Fit (Max 25 points)
  let emp = parseInt(lead.company_employees || lead.employees, 10);
  if (isNaN(emp) && typeof (lead.company_employees || lead.employees) === 'string') {
    const rangeMatch = (lead.company_employees || lead.employees).match(/(\d+)/);
    if (rangeMatch) emp = parseInt(rangeMatch[1], 10);
  }

  if (!isNaN(emp) && emp > 0) {
    if (emp >= 20 && emp <= 500) {
      score += 15;
      reasons.push('Growth Stage Scale (20-500 emp) (+15)');
    } else if (emp > 500 && emp <= 5000) {
      score += 10;
      reasons.push('Mid-Market Scale (501-5000 emp) (+10)');
    } else if (emp >= 1 && emp < 20) {
      score += 10;
      reasons.push('Small Business Scale (1-20 emp) (+10)');
    }
  }

  const funding = String(lead.company_funding || lead.total_funding || '');
  if (funding && !funding.startsWith('0') && !funding.toLowerCase().includes('none')) {
    score += 10;
    reasons.push('Funded Venture / Funding (+10)');
  }

  const revenue = String(lead.company_revenue || lead.revenue || '');
  if (revenue && !revenue.startsWith('0') && !revenue.toLowerCase().includes('none')) {
    score += 5;
    reasons.push('Generating Revenue (+5)');
  }

  // D. Tech Stack & Modern Tooling Relevance (Max 15 points)
  const techStr = String(lead.company_technologies || lead.technologies || '').toLowerCase();
  if (techStr) {
    const highValueTools = ['aws', 'react', 'node', 'python', 'kubernetes', 'docker', 'snowflake', 'salesforce', 'hubspot', 'postgresql', 'gcp', 'azure'];
    const matched = highValueTools.filter(tool => techStr.includes(tool));
    if (matched.length > 0) {
      const techScore = Math.min(15, matched.length * 5);
      score += techScore;
      reasons.push(`High-Value Tech (${matched.slice(0, 3).join(', ')}) (+${techScore})`);
    }
  }

  const normalizedScore = Math.min(100, score);
  let tier = 'Tier 3 (Standard)';
  if (normalizedScore >= 70) {
    tier = 'Tier 1 (High Priority)';
  } else if (normalizedScore >= 45) {
    tier = 'Tier 2 (Qualified)';
  }

  return {
    ...lead,
    icp_score: normalizedScore,
    icp_tier: tier,
    icp_reasons: reasons.join('; ')
  };
}

// 17. ECC Content-Hash Cache Pattern: Persistent Cross-Session Org Cache
export class PersistentOrgCache {
  constructor(options = {}) {
    this.maxCapacity = options.maxCapacity || 5000;
    this.ttlMs = options.ttlMs || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.storageKey = options.storageKey || 'apollo_cached_orgs_v1';
    this.storage = options.storage || (typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null);
    this.l1Map = new Map(); // id -> { data, ts }
    this.domainIndex = new Map(); // domain -> id
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    if (this.storage) {
      await new Promise(resolve => {
        this.storage.get([this.storageKey], res => {
          const stored = res?.[this.storageKey];
          if (stored && typeof stored === 'object') {
            const now = Date.now();
            for (const [id, entry] of Object.entries(stored)) {
              if (entry && entry.data && (!entry.ts || now - entry.ts < this.ttlMs)) {
                this.l1Map.set(id, entry);
                const domain = entry.data.primary_domain || entry.data.domain;
                if (domain) this.domainIndex.set(domain, id);
              }
            }
          }
          resolve();
        });
      });
    }
    this.isInitialized = true;
  }

  get(id) {
    if (!id) return null;
    const entry = this.l1Map.get(id);
    if (!entry) return null;
    if (this.ttlMs && Date.now() - entry.ts > this.ttlMs) {
      this.l1Map.delete(id);
      return null;
    }
    return entry.data;
  }

  getByDomain(domain) {
    if (!domain) return null;
    const id = this.domainIndex.get(domain);
    return id ? this.get(id) : null;
  }

  set(id, data) {
    if (!id || !data) return;
    if (this.l1Map.size >= this.maxCapacity && !this.l1Map.has(id)) {
      const oldestKey = this.l1Map.keys().next().value;
      if (oldestKey) {
        const oldEntry = this.l1Map.get(oldestKey);
        const oldDomain = oldEntry?.data?.primary_domain || oldEntry?.data?.domain;
        if (oldDomain) this.domainIndex.delete(oldDomain);
        this.l1Map.delete(oldestKey);
      }
    }
    const entry = { data, ts: Date.now() };
    this.l1Map.set(id, entry);
    const domain = data.primary_domain || data.domain;
    if (domain) this.domainIndex.set(domain, id);
  }

  size() {
    return this.l1Map.size;
  }

  clear() {
    this.l1Map.clear();
    this.domainIndex.clear();
    if (this.storage) {
      this.storage.set({ [this.storageKey]: {} });
    }
  }

  async flush() {
    if (!this.storage) return;
    const exportObj = {};
    for (const [id, entry] of this.l1Map.entries()) {
      exportObj[id] = entry;
    }
    await new Promise(resolve => {
      this.storage.set({ [this.storageKey]: exportObj }, resolve);
    });
  }
}

// 18. ECC Latency-Critical Systems: Adaptive Server Pressure Pacer
export class AdaptivePacer {
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

// 19. ECC Data Throughput Accelerator: Chunked Memory-Streaming CSV Generator
export function buildChunkedUnionCSV(items, preferredOrder = [], chunkSize = 2500) {
  if (!items || items.length === 0) return [''];

  const headerSet = new Set();

  preferredOrder.forEach(col => {
    if (items.some(it => it && it[col] !== undefined && it[col] !== '')) {
      headerSet.add(col);
    }
  });

  items.forEach(it => {
    if (it && typeof it === 'object') {
      Object.keys(it).forEach(k => {
        if (k !== '_raw') {
          headerSet.add(k);
        }
      });
    }
  });

  const headers = Array.from(headerSet);
  const headerLine = '\uFEFF' + headers.join(',') + '\r\n';
  const chunks = [headerLine];

  const size = Math.max(1, chunkSize);
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const rowLines = slice.map(item => {
      return headers.map(header => {
        let val = item[header];
        if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = String(val);
        }

        // Collapse multiline text and escape formula injection characters
        val = val.replace(/[\r\n]+/g, ' ').trim();
        if (/^[=+\-@\t\r]/.test(val)) {
          val = "'" + val;
        }

        if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    }).join('\r\n');

    chunks.push(i + size < items.length ? rowLines + '\r\n' : rowLines);
  }

  return chunks;
}

// 20. Mission Control HUD: Rolling Velocity Tracker
export function computeRollingVelocity(history = [], now = Date.now(), windowMs = 60000) {
  if (!Array.isArray(history) || history.length < 2) return 0;
  const filtered = history.filter(pt => pt && typeof pt.count === 'number' && typeof pt.ts === 'number' && (now - pt.ts) <= windowMs);
  if (filtered.length < 2) return 0;

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const deltaCount = last.count - first.count;
  const deltaSec = (last.ts - first.ts) / 1000;

  if (deltaSec < 2 || deltaCount <= 0) return 0;
  return Math.round((deltaCount / deltaSec) * 60);
}

// 21. Mission Control HUD: Dynamic ETA Predictor
export function calculateETA(currentCount = 0, targetCount = 0, leadsPerMinute = 0) {
  if (currentCount >= targetCount) return 'Complete';
  if (!leadsPerMinute || leadsPerMinute <= 0) return 'Calculating...';

  const remaining = targetCount - currentCount;
  const minutes = remaining / leadsPerMinute;

  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `~${Math.round(minutes)}m`;

  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `~${hrs}h ${mins}m`;
}

// 22. Mission Control HUD: Live Data Quality & ICP Intelligence
export function computeDataQualityMetrics(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total: 0,
      verifiedEmails: 0,
      verifiedEmailPct: 0,
      phoneCount: 0,
      phonePct: 0,
      decisionMakerCount: 0,
      decisionMakerPct: 0
    };
  }

  const total = items.length;
  let verifiedEmails = 0;
  let phoneCount = 0;
  let decisionMakerCount = 0;

  const DM_SENIORITIES = new Set(['founder', 'c_suite', 'partner', 'vp', 'director', 'owner', 'head']);

  for (const item of items) {
    if (!item) continue;
    // Verified email
    if (item.email_status === 'verified' || (typeof item.extrapolated_email_confidence === 'number' && item.extrapolated_email_confidence > 0.8)) {
      verifiedEmails++;
    }
    // Phone coverage
    const hasSanitizedPhone = typeof item.sanitized_phone === 'string' && item.sanitized_phone.trim().length > 0;
    const hasPhoneArr = Array.isArray(item.phone_numbers) && item.phone_numbers.length > 0;
    const hasCorpPhone = typeof item.corporate_phone === 'string' && item.corporate_phone.trim().length > 0;
    if (hasSanitizedPhone || hasPhoneArr || hasCorpPhone) {
      phoneCount++;
    }
    // Decision maker
    if (typeof item.seniority === 'string' && DM_SENIORITIES.has(item.seniority.toLowerCase().trim())) {
      decisionMakerCount++;
    }
  }

  return {
    total,
    verifiedEmails,
    verifiedEmailPct: Math.round((verifiedEmails / total) * 100),
    phoneCount,
    phonePct: Math.round((phoneCount / total) * 100),
    decisionMakerCount,
    decisionMakerPct: Math.round((decisionMakerCount / total) * 100)
  };
}

// 23. Mission Control HUD: State Formatting Controller
export function formatMissionControlState(state = {}) {
  const {
    isHarvestingActive = false,
    harvestedCount = 0,
    targetLeads = 0,
    velocity = 0,
    cooldownRemaining = null,
    sliceLabel = null,
    currentSlice = 0,
    totalSlices = 0,
    sliceHarvested = 0,
    sliceTotal = 0,
    quality = null,
    circuitBreakerTripped = false
  } = state;

  const isCooldown = cooldownRemaining !== null && cooldownRemaining > 0;
  let statusBadge = 'READY';
  let indicatorColor = '#10b981'; // green

  if (circuitBreakerTripped) {
    statusBadge = 'HALTED';
    indicatorColor = '#ef4444'; // red
  } else if (isCooldown) {
    statusBadge = `COOLDOWN (${cooldownRemaining}s)`;
    indicatorColor = '#38bdf8'; // blue
  } else if (isHarvestingActive) {
    statusBadge = 'RUNNING';
    indicatorColor = '#f59e0b'; // amber
  }

  const totalCountDisplay = Number(harvestedCount).toLocaleString();
  const velocityStr = velocity > 0 ? `⚡ ${velocity}/min` : '⚡ Calculating...';
  const etaStr = targetLeads > 0 ? `⏱️ ${calculateETA(harvestedCount, targetLeads, velocity)}` : '';

  let cabinetStr = '';
  if (sliceLabel) {
    const sliceIndexPart = totalSlices > 0 ? ` (Slice ${currentSlice}/${totalSlices})` : '';
    cabinetStr = `[${sliceLabel}]${sliceIndexPart}`;
  }

  const cabinetProgressPct = (sliceTotal && sliceTotal > 0)
    ? Math.min(100, Math.round((sliceHarvested / sliceTotal) * 100))
    : 0;

  const q = quality || { verifiedEmailPct: 0, phonePct: 0, decisionMakerPct: 0 };
  const formattedQuality = {
    verifiedStr: `${q.verifiedEmailPct || 0}%`,
    phoneStr: `${q.phonePct || 0}%`,
    decisionMakerStr: `${q.decisionMakerPct || 0}%`
  };

  return {
    statusBadge,
    indicatorColor,
    isCooldown,
    totalCountDisplay,
    velocityStr,
    etaStr,
    cabinetStr,
    cabinetProgressPct,
    quality: formattedQuality
  };
}

// 24. Multi-Dimensional Bisection Engine Constants & Generator
export const ALL_APOLLO_SENIORITIES = [
  'founder', 'owner', 'c_suite', 'partner', 'vp', 'head', 'director', 'intern', 'senior', 'manager', 'entry'
];

export const EMAIL_STATUS_PARTITIONS = [
  { key: 'verified', values: ['verified'] },
  { key: 'guessed', values: ['guessed'] },
  { key: 'unavailable', values: ['unavailable'] }
];

export function generateMultiDimensionalPlan(basePayload = {}, options = {}) {
  const rawBrackets = resolveExecutionBrackets(basePayload, options);
  const planUnits = [];

  for (const bracketArr of rawBrackets) {
    const bracketStr = Array.isArray(bracketArr) ? bracketArr[0] : String(bracketArr);
    
    // Sparse micro-brackets can be queried in a single unit
    if (bracketStr === '50,50' || options.isSparse) {
      planUnits.push({
        label: bracketStr,
        bracket: [bracketStr],
        seniority: null,
        emailStatus: null,
        keyword: null
      });
      continue;
    }

    const seniorities = Array.isArray(options.seniorities) && options.seniorities.length > 0
      ? options.seniorities
      : (Array.isArray(basePayload.person_seniorities) && basePayload.person_seniorities.length > 0
          ? basePayload.person_seniorities
          : ALL_APOLLO_SENIORITIES);

    for (const sen of seniorities) {
      // Low volume seniorities (C-Suite, VP, Director, Head, Partner, Intern, Founder, Owner)
      if (!['entry', 'manager', 'senior'].includes(sen)) {
        planUnits.push({
          label: `${bracketStr} ${sen}`,
          bracket: [bracketStr],
          seniority: sen,
          emailStatus: null,
          keyword: null
        });
        continue;
      }

      // Senior: 2-way email split (verified vs unverified)
      if (sen === 'senior') {
        planUnits.push({
          label: `${bracketStr} senior verified`,
          bracket: [bracketStr],
          seniority: 'senior',
          emailStatus: ['verified'],
          keyword: null
        });
        planUnits.push({
          label: `${bracketStr} senior unverified`,
          bracket: [bracketStr],
          seniority: 'senior',
          emailStatus: ['guessed', 'unavailable'],
          keyword: null
        });
        continue;
      }

      // Dense seniorities (entry & manager): 3-way email status decomposition
      for (const est of EMAIL_STATUS_PARTITIONS) {
        planUnits.push({
          label: `${bracketStr} ${sen} ${est.key}`,
          bracket: [bracketStr],
          seniority: sen,
          emailStatus: est.values,
          keyword: null
        });
      }
    }
  }

  return planUnits;
}

/**
 * 25. Adaptive Dynamic Cabin Engine:
 * Autonomous Pre-Flight Density Probing, Minimal API Calls & Recursive Bisection.
 * Dynamically resolves only non-empty, reachable units (<= 250 leads each).
 */
export async function resolveAdaptiveExecutionTree(probeFn, basePayload = {}, options = {}) {
  if (typeof probeFn !== 'function') {
    throw new Error('probeFn must be an async function returning total_entries count');
  }

  const maxLimit = options.maxLeadsPerCabinet !== undefined ? options.maxLeadsPerCabinet : 125;
  const isCompanies = options.isCompanies || false;
  const onProbeProgress = options.onProbeProgress || null;
  const sleepFn = typeof options.sleepFn === 'function' ? options.sleepFn : null;
  const probePacing = options.probePacing || {};
  const optimalUnits = [];

  let startingBrackets = [];
  const customRanges = basePayload.organization_num_employees_ranges;
  if (Array.isArray(customRanges) && customRanges.length > 0) {
    for (const r of customRanges) {
      const str = Array.isArray(r) ? r[0] : (typeof r === 'string' ? r : String(r));
      if (typeof str === 'string' && (str.endsWith(',') || str.endsWith('+') || str.startsWith(','))) {
        const expanded = expandOpenHeadcountRange(str);
        for (const item of expanded) {
          const macro = item[0];
          if (macro === '10001') {
            startingBrackets.push({ min: 10001, max: 10001, label: '10001' });
          } else {
            const parts = macro.split(',').map(n => parseInt(n.trim(), 10));
            startingBrackets.push({ min: parts[0], max: parts[1] || parts[0], label: macro });
          }
        }
      } else if (typeof str === 'string') {
        if (str === '10001') {
          startingBrackets.push({ min: 10001, max: 10001, label: '10001' });
        } else {
          const parts = str.split(',').map(n => parseInt(n.trim(), 10));
          startingBrackets.push({ min: parts[0], max: parts[1] || parts[0], label: str });
        }
      }
    }
  }

  if (startingBrackets.length === 0) {
    startingBrackets = [
      { min: 1, max: 10, label: '1,10' },
      { min: 11, max: 20, label: '11,20' },
      { min: 21, max: 50, label: '21,50' },
      { min: 51, max: 100, label: '51,100' },
      { min: 101, max: 200, label: '101,200' },
      { min: 201, max: 500, label: '201,500' },
      { min: 501, max: 1000, label: '501,1000' },
      { min: 1001, max: 5000, label: '1001,5000' },
      { min: 5001, max: 10000, label: '5001,10000' },
      { min: 10001, max: 10001, label: '10001' }
    ];
  }

  // Short-Circuit Check: If search has an overall range filter, probe the whole search root first
  if (customRanges && customRanges.length === 1) {
    const rootTotal = await probeFn({ organization_num_employees_ranges: customRanges });
    if (onProbeProgress) onProbeProgress({ type: 'ROOT_PROBE', total: rootTotal });
    if (rootTotal === 0) {
      if (sleepFn) {
        const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
        if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: 'ROOT', delayMs });
        await sleepFn(delayMs);
      }
      return [];
    }
    if (rootTotal === null || rootTotal === undefined) {
      // Probing is blocked (e.g. Cloudflare Turnstile). Immediately return starting brackets in Bidirectional mode!
      return startingBrackets.map(b => ({
        label: b.label,
        bracket: [b.label],
        seniority: null,
        emailStatus: null,
        keyword: null,
        total: null,
        pagesNeeded: 5,
        mode: 'Bidirectional'
      }));
    }
    if (typeof rootTotal === 'number' && rootTotal > 0 && rootTotal <= maxLimit) {
      const singleLabel = Array.isArray(customRanges[0]) ? customRanges[0][0] : String(customRanges[0]);
      return [{
        label: `${singleLabel} (All Matching)`,
        bracket: [singleLabel],
        seniority: null,
        emailStatus: null,
        keyword: null,
        total: rootTotal,
        pagesNeeded: Math.ceil(rootTotal / 25),
        mode: rootTotal <= 125 ? 'Top-Down Only' : 'Bidirectional'
      }];
    }
  }

  const queue = [...startingBrackets];

  while (queue.length > 0) {
    const item = queue.shift();
    const count = await probeFn({ organization_num_employees_ranges: [item.label] });
    if (onProbeProgress) onProbeProgress({ type: 'BRACKET_PROBE', label: item.label, total: count });

    if (count === 0) {
      if (sleepFn) {
        const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
        if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: item.label, delayMs });
        await sleepFn(delayMs);
      }
      continue;
    }

    if (count === null || count === undefined) {
      // Probe unavailable / Cloudflare protected - add all remaining brackets as executable in Bidirectional mode
      optimalUnits.push({
        label: item.label,
        bracket: [item.label],
        seniority: null,
        emailStatus: null,
        keyword: null,
        total: null,
        pagesNeeded: 5,
        mode: 'Bidirectional'
      });
      while (queue.length > 0) {
        const rem = queue.shift();
        optimalUnits.push({
          label: rem.label,
          bracket: [rem.label],
          seniority: null,
          emailStatus: null,
          keyword: null,
          total: null,
          pagesNeeded: 5,
          mode: 'Bidirectional'
        });
      }
      break;
    }

    if (sleepFn) {
      const delayMs = calculateProbePacingDelay({ isZeroResult: false, ...probePacing });
      await sleepFn(delayMs);
    }

    if (typeof count === 'number' && count <= maxLimit) {
      optimalUnits.push({
        label: item.label,
        bracket: [item.label],
        seniority: null,
        emailStatus: null,
        keyword: null,
        total: count,
        pagesNeeded: Math.ceil(count / 25),
        mode: count <= 125 ? 'Top-Down Only' : 'Bidirectional'
      });
      continue;
    }

    // Bisect headcount whenever min < max
    if (item.min < item.max) {
      const mid = Math.floor((item.min + item.max) / 2);
      const left = { min: item.min, max: mid, label: `${item.min},${mid}` };
      const right = { min: mid + 1, max: item.max, label: `${mid + 1},${item.max}` };
      queue.unshift(right);
      queue.unshift(left);
      continue;
    }

    if (isCompanies) {
      if (item.min < item.max) {
        const mid = Math.floor((item.min + item.max) / 2);
        const left = { min: item.min, max: mid, label: `${item.min},${mid}` };
        const right = { min: mid + 1, max: item.max, label: `${mid + 1},${item.max}` };
        queue.unshift(right);
        queue.unshift(left);
      } else {
        optimalUnits.push({
          label: item.label,
          bracket: [item.label],
          seniority: null,
          emailStatus: null,
          keyword: null,
          total: count,
          pagesNeeded: Math.min(10, Math.ceil(count / 25)),
          mode: 'Bidirectional'
        });
      }
      continue;
    }

    // Single integer headcount or tight span < 5 exceeding maxLimit: Pivot to Seniorities
    const seniorities = Array.isArray(basePayload.person_seniorities) && basePayload.person_seniorities.length > 0
      ? basePayload.person_seniorities
      : ALL_APOLLO_SENIORITIES;

    for (const sen of seniorities) {
      const senCount = await probeFn({
        organization_num_employees_ranges: [item.label],
        person_seniorities: [sen]
      });
      if (onProbeProgress) onProbeProgress({ type: 'SENIORITY_PROBE', label: `${item.label} ${sen}`, total: senCount });

      if (senCount === 0) {
        if (sleepFn) {
          const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
          if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: `${item.label} ${sen}`, delayMs });
          await sleepFn(delayMs);
        }
        continue;
      }

      if (sleepFn) {
        const delayMs = calculateProbePacingDelay({ isZeroResult: false, ...probePacing });
        await sleepFn(delayMs);
      }

      if (senCount <= maxLimit) {
        optimalUnits.push({
          label: `${item.label} ${sen}`,
          bracket: [item.label],
          seniority: sen,
          emailStatus: null,
          keyword: null,
          total: senCount,
          pagesNeeded: Math.ceil(senCount / 25),
          mode: senCount <= 125 ? 'Top-Down Only' : 'Bidirectional'
        });
        continue;
      }

      // If dense seniority still exceeds maxLimit: Pivot to Email Status (respecting any user-pinned status)
      const userEmailStatus = basePayload.contact_email_status || null;
      const activeEmailPartitions = userEmailStatus && userEmailStatus.length > 0
        ? EMAIL_STATUS_PARTITIONS.filter(p => p.values.some(v => userEmailStatus.includes(v)))
        : EMAIL_STATUS_PARTITIONS;

      for (const emailPartition of activeEmailPartitions) {
        const emailCount = await probeFn({
          organization_num_employees_ranges: [item.label],
          person_seniorities: [sen],
          contact_email_status: emailPartition.values
        });
        if (onProbeProgress) onProbeProgress({ type: 'EMAIL_PROBE', label: `${item.label} ${sen} ${emailPartition.key}`, total: emailCount });

        if (emailCount === 0) {
          if (sleepFn) {
            const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
            if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: `${item.label} ${sen} ${emailPartition.key}`, delayMs });
            await sleepFn(delayMs);
          }
          continue;
        }

        if (sleepFn) {
          const delayMs = calculateProbePacingDelay({ isZeroResult: false, ...probePacing });
          await sleepFn(delayMs);
        }

        optimalUnits.push({
          label: `${item.label} ${sen} ${emailPartition.key}`,
          bracket: [item.label],
          seniority: sen,
          emailStatus: emailPartition.values,
          keyword: null,
          total: emailCount,
          pagesNeeded: Math.min(10, Math.ceil(emailCount / 25)),
          mode: emailCount <= 125 ? 'Top-Down Only' : 'Bidirectional'
        });
      }
    }
  }

  return optimalUnits;
}

// 25. Pre-flight Probe Pacing & Humanized Dwell Calculator
export function calculateProbePacingDelay(options = {}) {
  const {
    isZeroResult = false,
    minDelay = 1200,
    maxDelay = 2400,
    zeroMinDelay = 900,
    zeroMaxDelay = 1800
  } = options;

  if (isZeroResult) {
    const min = Math.max(200, zeroMinDelay);
    const max = Math.max(min, zeroMaxDelay);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const min = Math.max(300, minDelay);
  const max = Math.max(min, maxDelay);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 26. Pre-flight Session Clearance & CSRF Validator
export function validateSessionHealth(cookieString = '') {
  const hasCsrf = typeof cookieString === 'string' && /X-CSRF-TOKEN=/i.test(cookieString);
  const hasClearance = typeof cookieString === 'string' && /cf_clearance=/i.test(cookieString);
  const isHealthy = hasCsrf && hasClearance;

  return {
    isHealthy,
    hasCsrf,
    hasClearance,
    status: isHealthy ? 'READY' : (!hasClearance ? 'CLEARANCE_REQUIRED' : 'CSRF_MISSING')
  };
}

// 27. Companion Organization Snippet Merger
export function mergeSnippetEnrichment(contacts = [], snippetMap = {}) {
  if (!Array.isArray(contacts)) return [];
  const safeMap = snippetMap && typeof snippetMap === 'object' ? snippetMap : {};

  return contacts.map(c => {
    if (!c || typeof c !== 'object') return c;
    const orgId = c.organization_id || c.organization?.id;
    const snippet = orgId ? safeMap[orgId] : null;

    if (!snippet) {
      return { ...c };
    }

    return {
      ...c,
      organization: {
        ...(c.organization || {}),
        short_description: snippet.short_description !== undefined ? snippet.short_description : c.organization?.short_description,
        corporate_phone: snippet.phone !== undefined ? snippet.phone : c.organization?.corporate_phone,
        keywords: Array.isArray(snippet.keywords) ? snippet.keywords : c.organization?.keywords,
        industry: snippet.industry !== undefined ? snippet.industry : c.organization?.industry,
        annual_revenue_printed: snippet.annual_revenue_printed !== undefined ? snippet.annual_revenue_printed : c.organization?.annual_revenue_printed,
        total_funding_printed: snippet.total_funding_printed !== undefined ? snippet.total_funding_printed : c.organization?.total_funding_printed
      }
    };
  });
}


