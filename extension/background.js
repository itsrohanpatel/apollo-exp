/**
 * Apollo Lead Extractor - Background Service Worker
 * Manages central lead store, deduplication, safe export, and multi-slice harvest orchestration.
 */

const state = {
  leads: new Map(),       // Keyed by lead ID / LinkedIn URL
  companies: new Map(),   // Keyed by company ID / domain
  isHarvesting: false,
  deepEnrichmentEnabled: true,
  enrichmentStats: {
    pending: 0,
    inFlight: 0,
    enriched: 0
  },
  harvestProgress: {
    harvestedCount: 0,
    targetLeads: 50000,
    currentSlice: 0,
    totalSlices: 0,
    status: 'Ready'
  },
  circuitBreaker: {
    tripped: false,
    reason: null
  },
  dailyHarvestedCount: 0,
  activeTabId: null
};

// Initialize from chrome.storage.local
chrome.storage.local.get(['scrapedLeads', 'scrapedCompanies', 'dailyHarvestedCount', 'deepEnrichmentEnabled', 'apollo_cached_orgs_v1'], (res) => {
  if (res.apollo_cached_orgs_v1 && typeof res.apollo_cached_orgs_v1 === 'object') {
    for (const [id, org] of Object.entries(res.apollo_cached_orgs_v1)) {
      if (org && (org.technologies || org.total_funding)) {
        enrichmentQueue.enrichedCache.set(id, org);
      }
    }
  }
  if (res.scrapedLeads && Array.isArray(res.scrapedLeads)) {
    res.scrapedLeads.forEach(l => state.leads.set(l.id || l.linkedin_url, l));
  }
  if (res.scrapedCompanies && Array.isArray(res.scrapedCompanies)) {
    res.scrapedCompanies.forEach(c => {
      state.companies.set(c.id || c.domain, c);
      if (c.id && (c.technologies || c.total_funding)) {
        enrichmentQueue.enrichedCache.set(c.id, c);
      }
    });
  }
  if (res.dailyHarvestedCount) {
    state.dailyHarvestedCount = res.dailyHarvestedCount;
  }
  if (typeof res.deepEnrichmentEnabled === 'boolean') {
    state.deepEnrichmentEnabled = res.deepEnrichmentEnabled;
  }
  updateEnrichmentStats();
  syncStorage();
});

function syncStorage() {
  chrome.storage.local.set({
    leadsCount: state.leads.size,
    companiesCount: state.companies.size,
    scrapedLeads: Array.from(state.leads.values()),
    scrapedCompanies: Array.from(state.companies.values()),
    isHarvesting: state.isHarvesting,
    deepEnrichmentEnabled: state.deepEnrichmentEnabled,
    enrichmentStats: state.enrichmentStats,
    harvestProgress: state.harvestProgress,
    circuitBreaker: state.circuitBreaker,
    dailyHarvestedCount: state.dailyHarvestedCount
  });
}

// 1. Universal Record Flattening & Normalization (Zero Data Loss)
function flattenRecord(obj, prefix = '', res = {}) {
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

function inferSeniority(title = '') {
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

function extractPastExperience(empHistory = []) {
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

const PREFERRED_PERSON_COLUMNS = [
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
  'company_description',
  'company_linkedin',
  'company_website',
  'scraped_at'
];

const PREFERRED_COMPANY_COLUMNS = [
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

// ECC Lead Intelligence: Signal-Based ICP Scorer
function computeLeadICPScore(lead) {
  if (!lead || typeof lead !== 'object') {
    return { icp_score: 0, icp_tier: 'Tier 3 (Standard)', icp_reasons: '' };
  }

  let score = 0;
  const reasons = [];

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

function normalizePerson(raw) {
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

// 2. Bidirectional People -> Company Enrichment Merger
function mergeEnrichedCompanyToPerson(person, enrichedOrg) {
  if (!person || typeof person !== 'object') return {};
  if (!enrichedOrg || typeof enrichedOrg !== 'object') return { ...person };

  const techVal = enrichedOrg.technologies || (Array.isArray(enrichedOrg.technology_names) ? enrichedOrg.technology_names.join('; ') : '') || '';
  const fundingVal = enrichedOrg.total_funding || enrichedOrg.total_funding_printed || '';
  const revenueVal = enrichedOrg.revenue || enrichedOrg.organization_revenue_printed || enrichedOrg.annual_revenue_printed || '';
  const descVal = enrichedOrg.short_description || enrichedOrg.description || '';

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

// 3. Asynchronous Automatic Company Enrichment Queue
const enrichmentQueue = {
  pendingIds: new Set(),
  inFlightIds: new Set(),
  enrichedCache: new Map(),
  maxConcurrency: 3,
  batchDelayMs: 200,
  isProcessing: false
};

function updateEnrichmentStats() {
  state.enrichmentStats = {
    pending: enrichmentQueue.pendingIds.size,
    inFlight: enrichmentQueue.inFlightIds.size,
    enriched: enrichmentQueue.enrichedCache.size
  };
}

function enqueueCompanyEnrichment(ids) {
  if (!state.deepEnrichmentEnabled) return;
  if (!Array.isArray(ids)) ids = [ids];
  ids.forEach(id => {
    if (typeof id === 'string') id = id.trim();
    if (id && !enrichmentQueue.enrichedCache.has(id) && !enrichmentQueue.inFlightIds.has(id)) {
      enrichmentQueue.pendingIds.add(id);
    }
  });

  updateEnrichmentStats();

  if (!enrichmentQueue.isProcessing && enrichmentQueue.pendingIds.size > 0) {
    processEnrichmentQueue();
  }
}

async function processEnrichmentQueue() {
  enrichmentQueue.isProcessing = true;

  try {
    while (enrichmentQueue.pendingIds.size > 0 && !state.circuitBreaker.tripped && state.deepEnrichmentEnabled) {
      const currentBatch = Array.from(enrichmentQueue.pendingIds).slice(0, enrichmentQueue.maxConcurrency);
      currentBatch.forEach(id => {
        enrichmentQueue.pendingIds.delete(id);
        enrichmentQueue.inFlightIds.add(id);
      });

      let updatedCount = 0;
      await Promise.all(currentBatch.map(async id => {
        try {
          const resp = await fetch(`https://app.apollo.io/api/v1/organizations/${id}`, {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          if (resp.status === 200) {
            const json = await resp.json();
            const org = json.organization;
            if (org) {
              const enriched = normalizeCompany(org);
              enrichmentQueue.enrichedCache.set(id, enriched);

              chrome.storage.local.get(['apollo_cached_orgs_v1'], (cacheRes) => {
                const orgMap = cacheRes?.apollo_cached_orgs_v1 || {};
                orgMap[id] = enriched;
                const keys = Object.keys(orgMap);
                if (keys.length > 5000) {
                  delete orgMap[keys[0]];
                }
                chrome.storage.local.set({ apollo_cached_orgs_v1: orgMap });
              });

              const compKey = enriched.id || enriched.domain || enriched.company_name;
              const existingComp = state.companies.get(compKey) || {};
              state.companies.set(compKey, { ...existingComp, ...enriched });

              // Immutably enrich all matching people leads in state.leads
              state.leads.forEach((person, personKey) => {
                if (person.company_id === id || person.organization_id === id) {
                  const updatedPerson = mergeEnrichedCompanyToPerson(person, enriched);
                  state.leads.set(personKey, updatedPerson);
                  updatedCount++;
                }
              });
            }
          } else if (resp.status === 429) {
            console.warn(`[Apollo Harvester] Rate limited (429) during org enrichment for ${id}`);
          }
        } catch (err) {
          console.warn(`[Apollo Harvester] Org enrichment network error for ${id}:`, err);
        } finally {
          enrichmentQueue.inFlightIds.delete(id);
        }
      }));

      updateEnrichmentStats();

      if (updatedCount > 0) {
        syncStorage();
      }

      if (enrichmentQueue.pendingIds.size > 0 && enrichmentQueue.batchDelayMs > 0) {
        await new Promise(r => setTimeout(r, enrichmentQueue.batchDelayMs));
      }
    }
  } finally {
    enrichmentQueue.isProcessing = false;
    updateEnrichmentStats();
    syncStorage();
  }
}

function normalizeCompany(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const employeesVal = raw.estimated_num_employees !== undefined && raw.estimated_num_employees !== null && raw.estimated_num_employees !== ''
    ? raw.estimated_num_employees
    : (raw.num_employees || raw.organization_num_employees || raw.employee_count || raw.organization_num_employees_range || '');

  const industryVal = raw.industry || (Array.isArray(raw.industries) ? raw.industries.join('; ') : '') || '';
  const techVal = Array.isArray(raw.technology_names) ? raw.technology_names.join('; ') : (Array.isArray(raw.technologies) ? raw.technologies.join('; ') : (raw.technologies || ''));
  const keywordsVal = Array.isArray(raw.keywords) ? raw.keywords.join('; ') : (raw.keywords || '');
  const fundingVal = raw.total_funding_printed || raw.total_funding || '';
  const revenueVal = raw.organization_revenue_printed || raw.annual_revenue_printed || raw.organization_revenue || raw.annual_revenue || '';

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
    industry: industryVal,
    keywords: keywordsVal,
    employees: employeesVal,
    revenue: revenueVal,
    founded_year: raw.founded_year || '',
    sic_codes: Array.isArray(raw.sic_codes) ? raw.sic_codes.join('; ') : (raw.sic_codes || ''),
    naics_codes: Array.isArray(raw.naics_codes) ? raw.naics_codes.join('; ') : (raw.naics_codes || ''),
    technologies: techVal,
    total_funding: fundingVal,
    latest_funding_round: raw.latest_funding_round_date || raw.latest_funding_stage_cd || raw.latest_funding_stage || '',
    short_description: raw.short_description || raw.description || '',
    scraped_at: new Date().toISOString()
  };

  const flattened = flattenRecord(raw);
  return { ...flattened, ...base };
}

function buildUnionCSV(items, preferredOrder = []) {
  if (!items || items.length === 0) return '';

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

  const rows = items.map(item => {
    return headers.map(header => {
      let val = item[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }

      if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

globalThis.state = state;
globalThis.buildUnionCSV = buildUnionCSV;
globalThis.PREFERRED_PERSON_COLUMNS = PREFERRED_PERSON_COLUMNS;
globalThis.PREFERRED_COMPANY_COLUMNS = PREFERRED_COMPANY_COLUMNS;

// 3. Central Message Router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.tab?.id) {
    state.activeTabId = sender.tab.id;
  }

  // A. Ingest items captured by sniffer
  if (request.action === 'INGEST_ITEMS') {
    const { dataType, items } = request;
    let newItemsCount = 0;

    if (dataType === 'people' || dataType === 'contacts') {
      const orgIdsToEnrich = [];
      items.forEach(item => {
        let norm = normalizePerson(item);
        const orgId = norm.company_id || norm.organization_id;

        // Instant cache enrichment if org was already fetched
        if (orgId && enrichmentQueue.enrichedCache.has(orgId)) {
          norm = mergeEnrichedCompanyToPerson(norm, enrichmentQueue.enrichedCache.get(orgId));
        } else if (orgId && state.deepEnrichmentEnabled) {
          const compKey = norm.company_id || norm.company_domain || norm.company_name;
          const cachedComp = state.companies.get(compKey);
          if (cachedComp && (cachedComp.technologies || cachedComp.total_funding)) {
            norm = mergeEnrichedCompanyToPerson(norm, cachedComp);
          } else {
            orgIdsToEnrich.push(orgId);
          }
        }

        const key = norm.id || norm.linkedin_url || `${norm.full_name}_${norm.company_name}`;
        if (key) {
          const existing = state.leads.get(key) || {};
          if (!state.leads.has(key)) {
            newItemsCount++;
            state.dailyHarvestedCount++;
          }
          state.leads.set(key, { ...existing, ...norm });
        }
      });
      syncStorage();
      if (orgIdsToEnrich.length > 0) {
        enqueueCompanyEnrichment(orgIdsToEnrich);
      }
      sendResponse({ success: true, count: newItemsCount, totalCount: state.leads.size, dataType: 'people' });
      return true;
    } else if (dataType === 'companies' || dataType === 'organizations') {
      const companyIdsToEnrich = [];
      items.forEach(item => {
        const norm = normalizeCompany(item);
        const key = norm.id || norm.domain || norm.company_name;
        if (key) {
          const existing = state.companies.get(key) || {};
          if (!state.companies.has(key)) {
            newItemsCount++;
            state.dailyHarvestedCount++;
          }
          state.companies.set(key, { ...existing, ...norm });
          if (norm.id && state.deepEnrichmentEnabled && (!norm.technologies || !norm.total_funding)) {
            companyIdsToEnrich.push(norm.id);
          }
        }
      });
      syncStorage();
      if (companyIdsToEnrich.length > 0) {
        enqueueCompanyEnrichment(companyIdsToEnrich);
      }
      sendResponse({ success: true, count: newItemsCount, totalCount: state.companies.size, dataType: 'companies' });
      return true;
    } else if (dataType === 'person_match') {
      items.forEach(item => {
        const norm = normalizePerson(item);
        const key = norm.id || norm.linkedin_url;
        if (key) {
          const existing = state.leads.get(key) || {};
          state.leads.set(key, { ...existing, ...norm });
        }
      });
      syncStorage();
      sendResponse({ success: true, count: 0, totalCount: state.leads.size });
      return true;
    }

    syncStorage();
    sendResponse({ totalCount: state.leads.size, newCount: newItemsCount });
    return true;
  }

  // B. Universal Deep Harvest Controls
  if (request.action === 'START_UNIVERSAL_HARVEST') {
    state.isHarvesting = true;
    state.circuitBreaker.tripped = false;
    state.circuitBreaker.reason = null;
    state.harvestProgress = {
      harvestedCount: state.leads.size,
      targetLeads: request.config?.targetLeads || 50000,
      currentSlice: 0,
      totalSlices: 0,
      status: 'Starting...'
    };
    syncStorage();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const targetTab = tabs[0] || (state.activeTabId ? { id: state.activeTabId } : null);
      if (targetTab && targetTab.id) {
        chrome.tabs.sendMessage(targetTab.id, {
          action: 'START_UNIVERSAL_HARVEST',
          config: request.config
        }, (res) => {
          sendResponse({ success: true, isHarvesting: true });
        });
      } else {
        sendResponse({ success: false, reason: 'No active Apollo tab found' });
      }
    });
    return true;
  }

  if (request.action === 'STOP_UNIVERSAL_HARVEST') {
    state.isHarvesting = false;
    state.harvestProgress.status = 'Stopped';
    syncStorage();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const targetTab = tabs[0] || (state.activeTabId ? { id: state.activeTabId } : null);
      if (targetTab && targetTab.id) {
        chrome.tabs.sendMessage(targetTab.id, { action: 'STOP_UNIVERSAL_HARVEST' });
      }
    });
    sendResponse({ success: true, isHarvesting: false });
    return true;
  }

  // C. Progress & Safety Status Handlers
  if (request.action === 'HARVEST_PROGRESS') {
    if (request.progress) {
      state.harvestProgress = {
        harvestedCount: request.progress.harvestedCount || state.leads.size,
        targetLeads: request.progress.targetLeads || state.harvestProgress.targetLeads,
        currentSlice: request.progress.currentSlice || state.harvestProgress.currentSlice,
        totalSlices: request.progress.totalSlices || state.harvestProgress.totalSlices,
        status: request.progress.status || 'Harvesting'
      };
      syncStorage();
    }
    return true;
  }

  if (request.action === 'HARVEST_HALTED') {
    state.isHarvesting = false;
    state.circuitBreaker.tripped = true;
    state.circuitBreaker.reason = request.reason || 'SECURITY_TRIGGERED';
    state.harvestProgress.status = `Halted (${request.reason})`;
    syncStorage();
    return true;
  }

  if (request.action === 'HARVEST_FINISHED') {
    state.isHarvesting = false;
    state.harvestProgress.status = 'Complete';
    syncStorage();
    return true;
  }

  // D. Clear Stored Data
  if (request.action === 'CLEAR_DATA') {
    state.leads.clear();
    state.companies.clear();
    state.isHarvesting = false;
    state.harvestProgress = {
      harvestedCount: 0,
      targetLeads: 50000,
      currentSlice: 0,
      totalSlices: 0,
      status: 'Ready'
    };
    syncStorage();
    sendResponse({ success: true, totalCount: 0 });
    return true;
  }

  // E. Export CSV (Client-Side Blob)
  if (request.action === 'TRIGGER_EXPORT_CSV') {
    exportToCSV(request.entityType);
    sendResponse({ success: true });
    return true;
  }

  // F. Export JSON (Client-Side Blob)
  if (request.action === 'TRIGGER_EXPORT_JSON') {
    exportToJSON(request.entityType);
    sendResponse({ success: true });
    return true;
  }

  // G. Get Export Preview (Columns & Sample)
  if (request.action === 'GET_EXPORT_PREVIEW') {
    const isCompanies = request.entityType === 'companies';
    const items = isCompanies ? Array.from(state.companies.values()) : Array.from(state.leads.values());
    const csvContent = buildUnionCSV(items, isCompanies ? PREFERRED_COMPANY_COLUMNS : PREFERRED_PERSON_COLUMNS);
    const headers = csvContent.replace('\uFEFF', '').split('\r\n')[0].split(',');
    sendResponse({
      success: true,
      count: items.length,
      columnCount: headers.length,
      headers: headers,
      sample: items[0] || null
    });
    return true;
  }

  // H. Toggle Deep Company Enrichment
  if (request.action === 'TOGGLE_DEEP_ENRICHMENT') {
    state.deepEnrichmentEnabled = !!request.enabled;
    syncStorage();
    if (state.deepEnrichmentEnabled && enrichmentQueue.pendingIds.size > 0 && !enrichmentQueue.isProcessing) {
      processEnrichmentQueue();
    }
    sendResponse({ success: true, deepEnrichmentEnabled: state.deepEnrichmentEnabled, stats: state.enrichmentStats });
    return true;
  }

  // I. Get Enrichment Status
  if (request.action === 'GET_ENRICHMENT_STATUS') {
    sendResponse({
      success: true,
      deepEnrichmentEnabled: state.deepEnrichmentEnabled,
      stats: state.enrichmentStats
    });
    return true;
  }
});

// ECC Data Throughput Accelerator: Chunked Memory-Streaming CSV Generator
function buildChunkedUnionCSV(items, preferredOrder = [], chunkSize = 2500) {
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

// 4. Client-Side Chunked Streaming CSV Exporter (0 Apollo Credits Used)
function exportToCSV(entityType) {
  const isCompanies = entityType === 'companies' || (!entityType && state.companies.size > state.leads.size);
  const items = isCompanies ? Array.from(state.companies.values()) : Array.from(state.leads.values());
  if (items.length === 0) return;

  const chunks = buildChunkedUnionCSV(items, isCompanies ? PREFERRED_COMPANY_COLUMNS : PREFERRED_PERSON_COLUMNS, 2500);
  const typeLabel = isCompanies ? 'companies' : 'leads';
  const filename = `apollo_universal_${typeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;

  const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
  const reader = new FileReader();
  reader.onloadend = function () {
    chrome.downloads.download({
      url: reader.result,
      filename: filename,
      saveAs: true
    });
  };
  reader.readAsDataURL(blob);
}

// 5. Client-Side JSON Exporter
function exportToJSON(entityType) {
  const isCompanies = entityType === 'companies' || (!entityType && state.companies.size > state.leads.size);
  const items = isCompanies ? Array.from(state.companies.values()) : Array.from(state.leads.values());
  if (items.length === 0) return;

  const jsonString = JSON.stringify(items, null, 2);
  const typeLabel = isCompanies ? 'companies' : 'leads';
  const filename = `apollo_universal_${typeLabel}_${new Date().toISOString().slice(0, 10)}.json`;

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const reader = new FileReader();
  reader.onloadend = function () {
    chrome.downloads.download({
      url: reader.result,
      filename: filename,
      saveAs: true
    });
  };
  reader.readAsDataURL(blob);
}
