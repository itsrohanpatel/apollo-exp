/**
 * Apollo Lead Extractor - Slicer Core Algorithm Library
 * Pure JS, zero external dependencies. Usable in Node tests, Chrome Extension MV3, and in-tab scripts.
 */

// 1. Universal Headcount Brackets
export const APOLLO_PAGE_SIZE = 30;
export const MAX_STANDARD_PAGES = 5;
export const MAX_TOP_DOWN_LEADS = APOLLO_PAGE_SIZE * MAX_STANDARD_PAGES; // 150
export const MAX_BIDIRECTIONAL_PAGES = 10;
export const MAX_BIDIRECTIONAL_LEADS = APOLLO_PAGE_SIZE * MAX_BIDIRECTIONAL_PAGES; // 300
export const MAX_MULTI_INTEGER_RANGE_LEADS = 240; // Safe threshold for multi-number brackets to prevent sweep collisions
export const ESTIMATED_SECONDS_PER_PAGE = 7; // Empirical real-world average: 4.74s latency + 2.07s dwell delay

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

export const ENTERPRISE_HEADCOUNT_TIERS = [
  '10001,15000',
  '15001,25000',
  '25001,50000',
  '50001,100000',
  '100001,1000000'
];

// Universal Subdepartments across all 14 official Apollo Master Departments
// Extracted from authentic Apollo production payloads and UI taxonomy
export const APOLLO_MASTER_SUBDEPARTMENTS = {
  master_human_resources: [
    { key: 'recruiting_talent_acquisition', label: 'Recruiting & Talent Acquisition', queryKey: 'recruiting_talent_acquisition' },
    { key: 'people_operations', label: 'People Operations', queryKey: 'people_operations' },
    { key: 'human_resources', label: 'Human Resources (General)', queryKey: 'human_resources' },
    { key: 'hr_business_partner', label: 'HR Business Partner', queryKey: 'hr_business_partner' },
    { key: 'compensation_benefits', label: 'Compensation & Benefits', queryKey: 'compensation_benefits' },
    { key: 'learning_development', label: 'Learning & Development', queryKey: 'learning_development' },
    { key: 'organizational_development', label: 'Organizational Development', queryKey: 'organizational_development' },
    { key: 'talent_management', label: 'Talent Management', queryKey: 'talent_management' },
    { key: 'employee_labor_relations', label: 'Employee & Labor Relations', queryKey: 'employee_labor_relations' },
    { key: 'human_resource_information_system', label: 'HRIS', queryKey: 'human_resource_information_system' },
    { key: 'workforce_mangement', label: 'Workforce Management', queryKey: 'workforce_mangement' },
    { key: 'culture_diversity_inclusion', label: 'Culture, Diversity & Inclusion', queryKey: 'culture_diversity_inclusion' },
    { key: 'health_safety', label: 'Health & Safety', queryKey: 'health_safety' }
  ],
  c_suite: [
    { key: 'executive', label: 'CEO & General Executive', queryKey: 'executive' },
    { key: 'finance_executive', label: 'Finance Executive (CFO)', queryKey: 'finance_executive' },
    { key: 'founder', label: 'Founder & Co-Founder', queryKey: 'founder' },
    { key: 'human_resources_executive', label: 'HR Executive (CHRO)', queryKey: 'human_resources_executive' },
    { key: 'information_technology_executive', label: 'IT Executive (CIO / CTO)', queryKey: 'information_technology_executive' },
    { key: 'legal_executive', label: 'Legal Executive (GC / CLO)', queryKey: 'legal_executive' },
    { key: 'marketing_executive', label: 'Marketing Executive (CMO)', queryKey: 'marketing_executive' },
    { key: 'medical_health_executive', label: 'Medical & Health Executive', queryKey: 'medical_health_executive' },
    { key: 'operations_executive', label: 'Operations Executive (COO)', queryKey: 'operations_executive' },
    { key: 'sales_executive', label: 'Sales Executive (CRO / VP Sales)', queryKey: 'sales_executive' }
  ],
  master_engineering_technical: [
    { key: 'artificial_intelligence_machine_learning', label: 'AI & Machine Learning', queryKey: 'artificial_intelligence_machine_learning' },
    { key: 'bioengineering', label: 'Bioengineering', queryKey: 'bioengineering' },
    { key: 'biometrics', label: 'Biometrics', queryKey: 'biometrics' },
    { key: 'business_intelligence', label: 'Business Intelligence', queryKey: 'business_intelligence' },
    { key: 'chemical_engineering', label: 'Chemical Engineering', queryKey: 'chemical_engineering' },
    { key: 'cloud_mobility', label: 'Cloud & Mobility', queryKey: 'cloud_mobility' },
    { key: 'data_science', label: 'Data Science', queryKey: 'data_science' },
    { key: 'devops', label: 'DevOps & SRE', queryKey: 'devops' },
    { key: 'digital_transformation', label: 'Digital Transformation', queryKey: 'digital_transformation' },
    { key: 'emerging_technology_innovation', label: 'Emerging Technology & Innovation', queryKey: 'emerging_technology_innovation' },
    { key: 'engineering_technical', label: 'Engineering & Technical', queryKey: 'engineering_technical' },
    { key: 'industrial_engineering', label: 'Industrial Engineering', queryKey: 'industrial_engineering' },
    { key: 'mechanic', label: 'Mechanic', queryKey: 'mechanic' },
    { key: 'mobile_development', label: 'Mobile Development', queryKey: 'mobile_development' },
    { key: 'project_management', label: 'Technical Project Management', queryKey: 'project_management' },
    { key: 'research_development', label: 'Research & Development (R&D)', queryKey: 'research_development' },
    { key: 'scrum_master_agile_coach', label: 'Scrum Master & Agile Coach', queryKey: 'scrum_master_agile_coach' },
    { key: 'software_development', label: 'Software Development', queryKey: 'software_development' },
    { key: 'support_technical_services', label: 'Support & Technical Services', queryKey: 'support_technical_services' },
    { key: 'technician', label: 'Technician', queryKey: 'technician' },
    { key: 'technology_operations', label: 'Technology Operations', queryKey: 'technology_operations' },
    { key: 'test_quality_assurance', label: 'Test & Quality Assurance', queryKey: 'test_quality_assurance' },
    { key: 'ui_ux', label: 'UI/UX Engineering', queryKey: 'ui_ux' },
    { key: 'web_development', label: 'Web Development', queryKey: 'web_development' }
  ],
  design: [
    { key: 'all_design', label: 'All Design', queryKey: 'all_design' },
    { key: 'product_ui_ux_design', label: 'Product & UI/UX Design', queryKey: 'product_ui_ux_design' },
    { key: 'graphic_design', label: 'Graphic & Visual Design', queryKey: 'graphic_design' }
  ],
  education: [
    { key: 'teacher', label: 'Teacher & Instructor', queryKey: 'teacher' },
    { key: 'principal', label: 'Principal & School Administrator', queryKey: 'principal' },
    { key: 'superintendent', label: 'Superintendent', queryKey: 'superintendent' },
    { key: 'professor', label: 'Professor & Faculty', queryKey: 'professor' }
  ],
  master_finance: [
    { key: 'accounting', label: 'Accounting', queryKey: 'accounting' },
    { key: 'finance', label: 'Finance (General)', queryKey: 'finance' },
    { key: 'financial_planning_analysis', label: 'Financial Planning & Analysis (FP&A)', queryKey: 'financial_planning_analysis' },
    { key: 'financial_reporting', label: 'Financial Reporting', queryKey: 'financial_reporting' },
    { key: 'financial_strategy', label: 'Financial Strategy', queryKey: 'financial_strategy' },
    { key: 'financial_systems', label: 'Financial Systems', queryKey: 'financial_systems' },
    { key: 'internal_audit_control', label: 'Internal Audit & Control', queryKey: 'internal_audit_control' },
    { key: 'investor_relations', label: 'Investor Relations', queryKey: 'investor_relations' },
    { key: 'mergers_acquisitions', label: 'Mergers & Acquisitions (M&A)', queryKey: 'mergers_acquisitions' },
    { key: 'real_estate_finance', label: 'Real Estate Finance', queryKey: 'real_estate_finance' },
    { key: 'financial_risk', label: 'Financial Risk', queryKey: 'financial_risk' },
    { key: 'shared_services', label: 'Shared Services', queryKey: 'shared_services' },
    { key: 'sourcing_procurement', label: 'Sourcing & Procurement', queryKey: 'sourcing_procurement' },
    { key: 'tax', label: 'Tax', queryKey: 'tax' }
  ],
  master_information_technology: [
    { key: 'application_development', label: 'Application Development', queryKey: 'application_development' },
    { key: 'business_service_management_itsm', label: 'IT Service Management (ITSM)', queryKey: 'business_service_management_itsm' },
    { key: 'collaboration_web_app', label: 'Collaboration & Web Apps', queryKey: 'collaboration_web_app' },
    { key: 'data_center', label: 'Data Center', queryKey: 'data_center' },
    { key: 'data_warehouse', label: 'Data Warehouse', queryKey: 'data_warehouse' },
    { key: 'database_administration', label: 'Database Administration (DBA)', queryKey: 'database_administration' },
    { key: 'ecommerce_development', label: 'eCommerce Development', queryKey: 'ecommerce_development' },
    { key: 'enterprise_architecture', label: 'Enterprise Architecture', queryKey: 'enterprise_architecture' },
    { key: 'help_desk_desktop_services', label: 'Help Desk & Desktop Support', queryKey: 'help_desk_desktop_services' },
    { key: 'hr_financial_erp_systems', label: 'HR & Financial ERP Systems', queryKey: 'hr_financial_erp_systems' },
    { key: 'information_security', label: 'Information Security & InfoSec', queryKey: 'information_security' },
    { key: 'information_technology', label: 'Information Technology (General)', queryKey: 'information_technology' },
    { key: 'infrastructure', label: 'Infrastructure & Cloud', queryKey: 'infrastructure' },
    { key: 'it_asset_management', label: 'IT Asset Management', queryKey: 'it_asset_management' },
    { key: 'it_audit_it_compliance', label: 'IT Audit & Compliance', queryKey: 'it_audit_it_compliance' },
    { key: 'it_operations', label: 'IT Operations', queryKey: 'it_operations' },
    { key: 'it_procurement', label: 'IT Procurement', queryKey: 'it_procurement' },
    { key: 'it_strategy', label: 'IT Strategy', queryKey: 'it_strategy' },
    { key: 'it_training', label: 'IT Training', queryKey: 'it_training' },
    { key: 'networking', label: 'Networking & Telecommunications', queryKey: 'networking' },
    { key: 'project_program_management', label: 'IT Project & Program Management', queryKey: 'project_program_management' },
    { key: 'quality_assurance', label: 'IT Quality Assurance', queryKey: 'quality_assurance' },
    { key: 'retail_store_systems', label: 'Retail & Store Systems', queryKey: 'retail_store_systems' },
    { key: 'servers', label: 'Servers & Systems', queryKey: 'servers' },
    { key: 'storage_disaster_recovery', label: 'Storage & Disaster Recovery', queryKey: 'storage_disaster_recovery' },
    { key: 'telecommunications', label: 'Telecommunications', queryKey: 'telecommunications' }
  ],
  master_legal: [
    { key: 'acquisitions', label: 'Acquisitions & Deals Legal', queryKey: 'acquisitions' },
    { key: 'compliance', label: 'Compliance & Regulatory', queryKey: 'compliance' },
    { key: 'contracts', label: 'Contracts & Commercial Agreements', queryKey: 'contracts' },
    { key: 'corporate_secretary', label: 'Corporate Secretary & Governance', queryKey: 'corporate_secretary' },
    { key: 'ediscovery', label: 'eDiscovery & Legal Tech', queryKey: 'ediscovery' },
    { key: 'ethics', label: 'Ethics & Standards', queryKey: 'ethics' },
    { key: 'governance', label: 'Corporate Governance', queryKey: 'governance' },
    { key: 'governmental_affairs_regulatory_law', label: 'Government Affairs & Regulatory Law', queryKey: 'governmental_affairs_regulatory_law' },
    { key: 'intellectual_property_patent', label: 'Intellectual Property & Patents', queryKey: 'intellectual_property_patent' },
    { key: 'labor_employment', label: 'Labor & Employment', queryKey: 'labor_employment' },
    { key: 'lawyer_attorney', label: 'Lawyer & Attorney', queryKey: 'lawyer_attorney' },
    { key: 'legal', label: 'Legal (General)', queryKey: 'legal' },
    { key: 'legal_counsel', label: 'In-House Legal Counsel', queryKey: 'legal_counsel' },
    { key: 'legal_operations', label: 'Legal Operations', queryKey: 'legal_operations' },
    { key: 'litigation', label: 'Litigation & Disputes', queryKey: 'litigation' }
  ],
  master_marketing: [
    { key: 'advertising', label: 'Advertising & Paid Media', queryKey: 'advertising' },
    { key: 'brand_management', label: 'Brand Management', queryKey: 'brand_management' },
    { key: 'content_marketing', label: 'Content Marketing', queryKey: 'content_marketing' },
    { key: 'customer_experience', label: 'Customer Experience (CX)', queryKey: 'customer_experience' },
    { key: 'customer_marketing', label: 'Customer Marketing', queryKey: 'customer_marketing' },
    { key: 'demand_generation', label: 'Demand Generation', queryKey: 'demand_generation' },
    { key: 'digital_marketing', label: 'Digital Marketing & Growth', queryKey: 'digital_marketing' },
    { key: 'ecommerce_marketing', label: 'eCommerce Marketing', queryKey: 'ecommerce_marketing' },
    { key: 'field_marketing', label: 'Field Marketing', queryKey: 'field_marketing' },
    { key: 'lead_generation', label: 'Lead Generation', queryKey: 'lead_generation' },
    { key: 'marketing', label: 'Marketing (General)', queryKey: 'marketing' },
    { key: 'marketing_analytics_insights', label: 'Marketing Analytics & Insights', queryKey: 'marketing_analytics_insights' },
    { key: 'marketing_communications', label: 'Marketing Communications & PR', queryKey: 'marketing_communications' },
    { key: 'marketing_operations', label: 'Marketing Operations (MOPs)', queryKey: 'marketing_operations' },
    { key: 'product_marketing', label: 'Product Marketing', queryKey: 'product_marketing' },
    { key: 'public_relations', label: 'Public Relations (PR)', queryKey: 'public_relations' },
    { key: 'search_engine_optimization_pay_per_click', label: 'SEO & PPC', queryKey: 'search_engine_optimization_pay_per_click' },
    { key: 'social_media_marketing', label: 'Social Media Marketing', queryKey: 'social_media_marketing' },
    { key: 'strategic_communications', label: 'Strategic Communications', queryKey: 'strategic_communications' },
    { key: 'technical_marketing', label: 'Technical Marketing', queryKey: 'technical_marketing' }
  ],
  medical_health: [
    { key: 'anesthesiology', label: 'Anesthesiology', queryKey: 'anesthesiology' },
    { key: 'chiropractics', label: 'Chiropractics', queryKey: 'chiropractics' },
    { key: 'clinical_systems', label: 'Clinical Systems', queryKey: 'clinical_systems' },
    { key: 'dentistry', label: 'Dentistry', queryKey: 'dentistry' },
    { key: 'dermatology', label: 'Dermatology', queryKey: 'dermatology' },
    { key: 'doctors_physicians', label: 'Doctors & Physicians', queryKey: 'doctors_physicians' },
    { key: 'epidemiology', label: 'Epidemiology', queryKey: 'epidemiology' },
    { key: 'first_responder', label: 'First Responder & Emergency', queryKey: 'first_responder' },
    { key: 'infectious_disease', label: 'Infectious Disease', queryKey: 'infectious_disease' },
    { key: 'medical_administration', label: 'Medical Administration', queryKey: 'medical_administration' },
    { key: 'medical_education_training', label: 'Medical Education & Training', queryKey: 'medical_education_training' },
    { key: 'medical_research', label: 'Medical Research & Clinical Trials', queryKey: 'medical_research' },
    { key: 'neurology', label: 'Neurology', queryKey: 'neurology' },
    { key: 'nursing', label: 'Nursing & Patient Care', queryKey: 'nursing' },
    { key: 'nutrition_dietetics', label: 'Nutrition & Dietetics', queryKey: 'nutrition_dietetics' },
    { key: 'obstetrics_gynecology', label: 'Obstetrics & Gynecology', queryKey: 'obstetrics_gynecology' },
    { key: 'oncology', label: 'Oncology', queryKey: 'oncology' },
    { key: 'opthalmology', label: 'Ophthalmology', queryKey: 'opthalmology' },
    { key: 'optometry', label: 'Optometry', queryKey: 'optometry' },
    { key: 'orthopedics', label: 'Orthopedics', queryKey: 'orthopedics' },
    { key: 'pathology', label: 'Pathology & Lab Diagnostics', queryKey: 'pathology' },
    { key: 'pediatrics', label: 'Pediatrics', queryKey: 'pediatrics' },
    { key: 'pharmacy', label: 'Pharmacy & Pharmacology', queryKey: 'pharmacy' },
    { key: 'physical_therapy', label: 'Physical Therapy & Rehab', queryKey: 'physical_therapy' },
    { key: 'psychiatry', label: 'Psychiatry', queryKey: 'psychiatry' },
    { key: 'psychology', label: 'Psychology', queryKey: 'psychology' },
    { key: 'public_health', label: 'Public Health', queryKey: 'public_health' },
    { key: 'radiology', label: 'Radiology & Imaging', queryKey: 'radiology' },
    { key: 'social_work', label: 'Medical Social Work', queryKey: 'social_work' }
  ],
  master_operations: [
    { key: 'call_center', label: 'Call Center & Support Operations', queryKey: 'call_center' },
    { key: 'construction', label: 'Construction Operations', queryKey: 'construction' },
    { key: 'corporate_strategy', label: 'Corporate Strategy', queryKey: 'corporate_strategy' },
    { key: 'customer_service_support', label: 'Customer Service & Support', queryKey: 'customer_service_support' },
    { key: 'enterprise_resource_planning', label: 'ERP Operations', queryKey: 'enterprise_resource_planning' },
    { key: 'facilities_management', label: 'Facilities Management', queryKey: 'facilities_management' },
    { key: 'leasing', label: 'Leasing Operations', queryKey: 'leasing' },
    { key: 'logistics', label: 'Logistics & Distribution', queryKey: 'logistics' },
    { key: 'office_operations', label: 'Office Operations', queryKey: 'office_operations' },
    { key: 'physical_security', label: 'Physical Security', queryKey: 'physical_security' },
    { key: 'project_development', label: 'Project Development', queryKey: 'project_development' },
    { key: 'quality_management', label: 'Quality Management & Six Sigma', queryKey: 'quality_management' },
    { key: 'real_estate', label: 'Real Estate Operations', queryKey: 'real_estate' },
    { key: 'safety', label: 'Workplace Safety & EHS', queryKey: 'safety' },
    { key: 'store_operations', label: 'Store Operations', queryKey: 'store_operations' },
    { key: 'supply_chain', label: 'Supply Chain & Procurement', queryKey: 'supply_chain' }
  ],
  master_sales: [
    { key: 'account_management', label: 'Account Management', queryKey: 'account_management' },
    { key: 'business_development', label: 'Business Development (BDR)', queryKey: 'business_development' },
    { key: 'channel_sales', label: 'Channel & Partner Sales', queryKey: 'channel_sales' },
    { key: 'customer_retention_development', label: 'Customer Retention & Expansion', queryKey: 'customer_retention_development' },
    { key: 'field_outside_sales', label: 'Field & Outside Sales', queryKey: 'field_outside_sales' },
    { key: 'inside_sales', label: 'Inside Sales & SDR', queryKey: 'inside_sales' },
    { key: 'partnerships', label: 'Partnerships & Alliances', queryKey: 'partnerships' },
    { key: 'revenue_operations', label: 'Revenue Operations (RevOps)', queryKey: 'revenue_operations' },
    { key: 'sales', label: 'Sales (General)', queryKey: 'sales' },
    { key: 'sales_enablement', label: 'Sales Enablement', queryKey: 'sales_enablement' },
    { key: 'sales_engineering', label: 'Sales Engineering (Solutions SE)', queryKey: 'sales_engineering' },
    { key: 'sales_operations', label: 'Sales Operations (SalesOps)', queryKey: 'sales_operations' },
    { key: 'sales_training', label: 'Sales Training & Coaching', queryKey: 'sales_training' }
  ],
  product_management: [
    { key: 'technical_product', label: 'Technical Product Management', queryKey: 'technical_product' },
    { key: 'growth_product', label: 'Growth Product Management', queryKey: 'growth_product' },
    { key: 'product_strategy', label: 'Product Strategy & Roadmapping', queryKey: 'product_strategy' },
    { key: 'product_operations', label: 'Product Operations', queryKey: 'product_operations' }
  ],
  consulting: [
    { key: 'management_consulting', label: 'Management & Strategy Consulting', queryKey: 'management_consulting' },
    { key: 'technical_consulting', label: 'Technical & Implementation Consulting', queryKey: 'technical_consulting' },
    { key: 'business_consulting', label: 'Business Transformation Consulting', queryKey: 'business_consulting' }
  ]
};

// Harvest Early Exit & Redundancy Short-Circuit Evaluator
export function shouldEarlyExitHarvest({
  isPass2 = false,
  page = 1,
  sliceHarvested = 0,
  sliceTotal = null,
  addedInPage = 0,
  rawPeopleCount = 0,
  pageSize = APOLLO_PAGE_SIZE,
  cabinetOverlapsInPage = undefined
} = {}) {
  // 1. If sliceTotal is known and all available leads have been harvested, complete cabinet immediately
  if (typeof sliceTotal === 'number' && sliceTotal > 0 && sliceHarvested >= sliceTotal) {
    return {
      shouldExit: true,
      status: 'EARLY_EXIT_CABINET_COMPLETE',
      reason: 'FULL_HARVEST_REACHED'
    };
  }

  // 2. In Pass 2 (Z-A): if sweep has converged with Pass 1 (A-Z)
  // True sweep convergence occurs when the leads returned on this page were ALREADY harvested
  // in THIS specific cabinet (Pass 1). If cabinetOverlapsInPage is tracked: exit only when all
  // returned leads on this page were already seen in this cabinet.
  // Backwards-compatibility: If cabinetOverlapsInPage is undefined, fallback to addedInPage === 0.
  if (isPass2) {
    const isConverged = typeof cabinetOverlapsInPage === 'number'
      ? (rawPeopleCount > 0 && cabinetOverlapsInPage >= rawPeopleCount)
      : (addedInPage === 0);
    if (isConverged) {
      return {
        shouldExit: true,
        status: 'EARLY_EXIT_SWEEP_CONVERGENCE',
        reason: 'SWEEP_CONVERGENCE'
      };
    }
  }

  // 3. In Pass 1 (A-Z): if page > 1 and 0 fresh leads added, check if Apollo repeated prior page
  if (!isPass2 && page > 1 && addedInPage === 0) {
    const isRepeated = typeof cabinetOverlapsInPage === 'number'
      ? (rawPeopleCount > 0 && cabinetOverlapsInPage >= rawPeopleCount)
      : true;
    if (isRepeated) {
      return {
        shouldExit: true,
        status: 'EARLY_EXIT_ZERO_FRESH',
        reason: 'ZERO_FRESH_ON_PAGINATION'
      };
    }
  }

  // 4. Natural last page of cabinet (less than full page of leads returned)
  if (rawPeopleCount < pageSize) {
    return {
      shouldExit: true,
      status: 'LAST_PAGE_OF_CABINET',
      reason: 'SHORT_PAGE'
    };
  }

  return {
    shouldExit: false,
    status: 'SUCCESS',
    reason: null
  };
}

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

// 3b. Standard Mode Diagnostic Logger
export class StandardModeDiagnosticLogger {
  constructor() {
    this.sessionStartTime = new Date().toISOString();
    this.pageTraces = [];
    this.discrepancies = [];
    this.preflight = null;
  }

  recordPreflightTelemetry(data) {
    if (!data || typeof data !== 'object') return null;
    this.preflight = {
      startTime: data.startTime || new Date().toISOString(),
      durationMs: data.durationMs || 0,
      durationSec: Number(((data.durationMs || 0) / 1000).toFixed(1)),
      engineMode: data.engineMode || 'standard',
      totalProbesExecuted: data.totalProbesExecuted || 0,
      probesPrunedByMath: data.probesPrunedByMath || 0,
      cabinetsPlanned: data.cabinetsPlanned || (Array.isArray(data.cabinets) ? data.cabinets.length : 0),
      totalPredictedLeads: data.totalPredictedLeads || (Array.isArray(data.cabinets) ? data.cabinets.reduce((s, c) => s + (c.total || 0), 0) : 0),
      cabinets: Array.isArray(data.cabinets) ? data.cabinets.map(c => ({
        label: c.label || 'Cabinet',
        total: c.total !== undefined ? c.total : null,
        mode: c.mode || 'Bidirectional',
        pagesNeeded: c.pagesNeeded || 5
      })) : [],
      auditLog: Array.isArray(data.auditLog) ? data.auditLog : []
    };
    return this.preflight;
  }

  recordPageTrace(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const isDiscrepancy = typeof entry.expectedCount === 'number' && entry.rawCount < entry.expectedCount;
    const trace = {
      timestamp: new Date().toISOString(),
      sliceLabel: entry.sliceLabel || 'Unknown',
      sliceIdx: entry.sliceIdx || 1,
      page: entry.page || 1,
      pass: entry.passLabel || 'Pass 1 (A-Z)',
      urlHash: entry.urlHash || '',
      source: entry.source || 'NETWORK',
      expectedCount: entry.expectedCount !== undefined ? entry.expectedCount : 30,
      rawCount: entry.rawCount || 0,
      addedCount: entry.addedCount || 0,
      duplicatesFiltered: entry.duplicatesFiltered || 0,
      isDiscrepancy,
      domForensics: entry.domForensics || null
    };
    this.pageTraces.push(trace);
    if (isDiscrepancy) {
      this.discrepancies.push(trace);
    }
    return trace;
  }

  getDiscrepanciesCount() {
    return this.discrepancies.length;
  }

  getReport() {
    return {
      sessionStartTime: this.sessionStartTime,
      reportGeneratedAt: new Date().toISOString(),
      preflight: this.preflight,
      totalPagesHarvested: this.pageTraces.length,
      totalDiscrepancies: this.discrepancies.length,
      discrepancies: this.discrepancies,
      pageTraces: this.pageTraces
    };
  }

  clear() {
    this.pageTraces = [];
    this.discrepancies = [];
    this.preflight = null;
    this.sessionStartTime = new Date().toISOString();
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
    'latestFundingStageCd[]': 'latest_funding_stage_cd',

    // --- EXPANDED FILTERS ---
    // Target Work URLs / Company Domains & LinkedIn URLs
    'organizationDomains[]': 'organization_domains',
    'qOrganizationDomains[]': 'organization_domains',
    'organizationNotDomains[]': 'organization_not_domains',
    'qNotOrganizationDomains[]': 'organization_not_domains',
    'organizationLinkedinUrls[]': 'organization_linkedin_urls',
    'qOrganizationLinkedinUrls[]': 'organization_linkedin_urls',
    'organizationNotLinkedinUrls[]': 'organization_not_linkedin_urls',
    'personLinkedinUrls[]': 'person_linkedin_urls',
    'qPersonLinkedinUrls[]': 'person_linkedin_urls',
    'personNotLinkedinUrls[]': 'person_not_linkedin_urls',

    // Department Exclusions
    'personNotDepartmentOrSubdepartments[]': 'person_not_department_or_subdepartments',
    'personNotDepartments[]': 'person_not_department_or_subdepartments',

    // Specific Company / Account IDs (Inclusion & Exclusion)
    'organizationIds[]': 'organization_ids',
    'organizationNotIds[]': 'organization_not_ids',

    // Modern Technologies (By Name & UIDs) & Exclusions
    'organizationTechnologyNames[]': 'organization_technology_names',
    'organizationNotTechnologyNames[]': 'organization_not_technology_names',
    'currentlyUsingAllOfTechnologyUids[]': 'currently_using_all_of_technology_uids',
    'currentlyUsingNoneOfTechnologyUids[]': 'currently_using_none_of_technology_uids',

    // Modern Funding Stages
    'organizationLatestFundingStageRanges[]': 'organization_latest_funding_stage_ranges',

    // Revenue Ranges (Bracket string format, e.g. 1000000%2C10000000)
    'organizationRevenueRanges[]': 'organization_revenue_ranges',

    // Job Change & Hiring Postings
    'organizationJobPostingTitles[]': 'organization_job_posting_titles',
    'organizationJobPostingLocations[]': 'organization_job_posting_locations',
    'organizationHeadcountGrowthRanges[]': 'organization_headcount_growth_ranges',

    // Buying Intent Signals
    'organizationIntentTopicIds[]': 'organization_intent_topic_ids',
    'organizationIntentStrength[]': 'organization_intent_strength',

    // Education, Degrees & Majors
    'personEducations[]': 'person_educations',
    'personDegreeTypes[]': 'person_degree_types',
    'personDegreeNames[]': 'person_degree_names',
    'personMajorNames[]': 'person_major_names',

    // Lookalikes & Market Segments
    'organizationLookalikeOrgIds[]': 'organization_lookalike_org_ids',
    'marketSegments[]': 'market_segments',

    // Phone & Email Status Filters
    'contactPhoneStatus[]': 'contact_phone_status',
    'contactPhoneStatusV2[]': 'contact_phone_status_v2',
    'contactDirectPhoneStatus[]': 'contact_direct_phone_status',
    'contactMobilePhoneStatus[]': 'contact_mobile_phone_status',
    'emailStatus[]': 'contact_email_status',
    'contactEmailStatusV2[]': 'contact_email_status_v2',

    // CRM / Saved Status Filters
    'prospectedByCurrentTeam[]': 'prospected_by_current_team',
    'contactStageIds[]': 'contact_stage_ids',
    'contactStages[]': 'contact_stages',
    'accountStages[]': 'account_stages',
    'ownerIds[]': 'owner_ids',
    'labelIds[]': 'label_ids',
    'sequenceIds[]': 'sequence_ids',
    'accountTier[]': 'account_tier'
  };

  const stringMappings = {
    'qKeywords': 'q_keywords',
    'qNotKeywords': 'q_not_keywords',
    'qOrganizationName': 'q_organization_name',
    'personName': 'person_name',
    'recommendationConfigId': 'recommendation_config_id',
    'personaId': 'persona_id',
    'jobChange': 'job_change',
    'salesforceRecordId': 'salesforce_record_id',
    'hubspotRecordId': 'hubspot_record_id'
  };

  for (const [paramKey, apiKey] of Object.entries(arrayMappings)) {
    const baseKey = paramKey.replace('[]', '');
    const valsWithBrackets = params.getAll(paramKey);
    const valsWithout = params.getAll(baseKey);
    
    // Also capture indexed array parameters like personTitles[0], personTitles[1]
    const indexedVals = [];
    const escapedBase = baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const indexedRegex = new RegExp('^' + escapedBase + '\\[\\d+\\]$');
    for (const [k, v] of params.entries()) {
      if (indexedRegex.test(k)) {
        indexedVals.push(v);
      }
    }

    const combined = [...valsWithBrackets, ...valsWithout, ...indexedVals];
    if (combined.length > 0) {
      let cleaned = Array.from(new Set(combined));
      if (
        apiKey === 'organization_linkedin_urls' ||
        apiKey === 'organization_not_linkedin_urls' ||
        apiKey === 'person_linkedin_urls' ||
        apiKey === 'person_not_linkedin_urls'
      ) {
        cleaned = cleaned.map(u => typeof u === 'string' ? u.trim().replace(/\s+href$/i, '') : u).filter(Boolean);
      }
      result[apiKey] = cleaned;
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

  // Sub-Property Nested Ranges (e.g. personDaysInCurrentTitleRange[max]=90)
  const nestedRangeMappings = {
    'personDaysInCurrentTitleRange': 'person_days_in_current_title_range',
    'personDaysInCurrentCompanyRange': 'person_days_in_current_company_range',
    'personTotalYearsExperience': 'person_total_years_experience',
    'lastActivityDate': 'last_activity_date',
    'revenueRange': 'revenue_range',
    'organizationFoundedYearRange': 'organization_founded_year_range',
    'organizationOpenPositionsCountRange': 'organization_open_positions_count_range',
    'organizationLatestFundingAmountRange': 'organization_latest_funding_amount_range',
    'organizationTotalFundingAmountRange': 'organization_total_funding_amount_range',
    'organizationNumEmployeesRange': 'organization_num_employees_range',
    'organizationNumEmployeesRanges': 'organization_num_employees_range'
  };

  for (const [urlPrefix, apiKey] of Object.entries(nestedRangeMappings)) {
    const minVal = params.get(urlPrefix + '[min]') || params.get(urlPrefix + '.min');
    const maxVal = params.get(urlPrefix + '[max]') || params.get(urlPrefix + '.max');
    if (minVal !== null || maxVal !== null) {
      result[apiKey] = result[apiKey] || {};
      if (minVal !== null) result[apiKey].min = isNaN(minVal) ? minVal : Number(minVal);
      if (maxVal !== null) result[apiKey].max = isNaN(maxVal) ? maxVal : Number(maxVal);
    }
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

  let brackets = null;
  let seniority = null;
  let emailStatus = null;
  let personTitles = null;
  let subdepartment = null;
  let department = null;

  if (typeof cabinetOrBracket === 'object' && cabinetOrBracket !== null) {
    if (Array.isArray(cabinetOrBracket.bracket)) {
      brackets = cabinetOrBracket.bracket;
    } else if (cabinetOrBracket.bracket) {
      brackets = [cabinetOrBracket.bracket];
    }
    seniority = cabinetOrBracket.seniority || null;
    emailStatus = cabinetOrBracket.emailStatus || null;
    subdepartment = cabinetOrBracket.subdepartment || null;
    department = cabinetOrBracket.department || null;
  } else if (cabinetOrBracket) {
    brackets = [String(cabinetOrBracket)];
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
      (!emailStatus || (key !== 'contactEmailStatus[]' && key !== 'contactEmailStatus')) &&
      (!subdepartment || (key !== 'personDepartmentOrSubdepartments[]' && key !== 'personDepartmentOrSubdepartments')) &&
      (!department || (key !== 'personDepartmentOrSubdepartments[]' && key !== 'personDepartmentOrSubdepartments'))
    ) {
      filteredPairs.push(pair);
    }
  }

  filteredPairs.push('page=1');
  if (Array.isArray(brackets)) {
    for (const b of brackets) {
      filteredPairs.push(`organizationNumEmployeesRanges[]=${encodeURIComponent(b)}`);
    }
  }
  if (seniority) {
    const raw = Array.isArray(seniority) ? seniority : [seniority];
    const items = raw.flatMap(s => typeof s === 'string' && s.includes('+') ? s.split('+') : s);
    for (const sen of items) {
      filteredPairs.push(`personSeniorities[]=${encodeURIComponent(sen)}`);
    }
  }
  if (Array.isArray(emailStatus)) {
    for (const est of emailStatus) {
      filteredPairs.push(`contactEmailStatus[]=${encodeURIComponent(est)}`);
    }
  }
  if (Array.isArray(subdepartment)) {
    for (const sub of subdepartment) {
      filteredPairs.push(`personDepartmentOrSubdepartments[]=${encodeURIComponent(sub)}`);
    }
  } else if (subdepartment) {
    filteredPairs.push(`personDepartmentOrSubdepartments[]=${encodeURIComponent(subdepartment)}`);
  } else if (Array.isArray(department)) {
    for (const d of department) {
      filteredPairs.push(`personDepartmentOrSubdepartments[]=${encodeURIComponent(d)}`);
    }
  } else if (department) {
    filteredPairs.push(`personDepartmentOrSubdepartments[]=${encodeURIComponent(department)}`);
  }
  if (sortField) {
    filteredPairs.push(`sortByField=${encodeURIComponent(sortField)}`);
    filteredPairs.push(`sortAscending=${String(sortAsc)}`);
  }
  filteredPairs.push(`_t=${Date.now()}`);

  return `${path}?${filteredPairs.join('&')}`;
}

// 8b-2. Direct API Payload Builder for Turbo & In-Page Engine
/**
 * Merges base search filters with cabinet-specific partition criteria (headcount bracket,
 * seniority, subdepartment/department, email status, keywords) and sorting/pagination parameters into
 * a clean, authentic payload for Apollo's /api/v1/mixed_people/search or mixed_companies/search API.
 *
 * @param {Object} baseFilters - Baseline filters parsed from Apollo URL hash
 * @param {Object} cabinet - Target cabinet slice (bracket, seniority, subdepartment, emailStatus, etc.)
 * @param {Object|null} sortParam - Sort options ({ sort_by_field, sort_ascending })
 * @param {number} page - 1-based page number (1 to 5)
 * @returns {Object} JSON payload ready for direct POST
 */
export function buildPayloadForCabinet(baseFilters = {}, cabinet = {}, sortParam = null, page = 1) {
  const base = (baseFilters && typeof baseFilters === 'object') ? baseFilters : {};
  const cab = (cabinet && typeof cabinet === 'object') ? cabinet : {};

  const payload = {
    ...base,
    ...(cab.filters || {})
  };

  // 1. Headcount Bracket
  if (cab.bracket !== undefined && cab.bracket !== null) {
    payload.organization_num_employees_ranges = Array.isArray(cab.bracket)
      ? cab.bracket.map(String)
      : [String(cab.bracket)];
  }

  // 2. Seniority
  if (cab.seniority !== undefined && cab.seniority !== null) {
    const raw = Array.isArray(cab.seniority) ? cab.seniority : [cab.seniority];
    payload.person_seniorities = raw.flatMap(s => typeof s === 'string' && s.includes('+') ? s.split('+') : s);
  }

  // 3. Sub-Department / Department
  if (cab.subdepartment !== undefined && cab.subdepartment !== null) {
    payload.person_department_or_subdepartments = Array.isArray(cab.subdepartment)
      ? cab.subdepartment
      : [cab.subdepartment];
  } else if (cab.department !== undefined && cab.department !== null) {
    payload.person_department_or_subdepartments = Array.isArray(cab.department)
      ? cab.department
      : [cab.department];
  }

  // 4. Contact Email Status
  if (cab.emailStatus !== undefined && cab.emailStatus !== null) {
    payload.contact_email_status = Array.isArray(cab.emailStatus)
      ? cab.emailStatus
      : [cab.emailStatus];
  }

  // 5. Keyword search override if specified in cabinet
  if (typeof cab.keyword === 'string' && cab.keyword.trim().length > 0) {
    payload.q_keywords = cab.keyword.trim();
  }

  // 6. Target Work URLs & LinkedIn URLs preservation from base
  if (base.organization_linkedin_urls) {
    payload.organization_linkedin_urls = base.organization_linkedin_urls;
    payload.q_organization_linkedin_urls = base.organization_linkedin_urls;
  }
  if (base.person_linkedin_urls) {
    payload.person_linkedin_urls = base.person_linkedin_urls;
    payload.q_person_linkedin_urls = base.person_linkedin_urls;
  }
  if (base.person_not_linkedin_urls) {
    payload.person_not_linkedin_urls = base.person_not_linkedin_urls;
  }

  // 7. Sort Options
  if (sortParam && typeof sortParam === 'object') {
    if (sortParam.sort_by_field) {
      payload.sort_by_field = sortParam.sort_by_field;
    }
    if (sortParam.sort_ascending !== undefined) {
      payload.sort_ascending = sortParam.sort_ascending;
    }
  }

  // 8. Pagination (Authentic Apollo Page Size)
  payload.page = typeof page === 'number' && page > 0 ? page : 1;
  payload.per_page = 30;

  // Clean runtime/internal markers so Apollo's API never complains
  delete payload._hasSubdivided;
  delete payload._leaf;
  delete payload._subdivisionDepth;
  delete payload.isUntagged;
  delete payload.total;
  delete payload.pagesNeeded;
  delete payload.mode;
  delete payload.label;

  return payload;
}

// 8c. Max Employee Detector (Extracts explicit or inferred upper employee limit from filters/options)
export function detectMaxEmployeesFromFilters(basePayload = {}, options = {}) {
  const opts = (options && typeof options === 'object') ? options : {};
  const payload = (basePayload && typeof basePayload === 'object') ? basePayload : {};

  if (typeof opts.maxEmployees === 'number' && Number.isFinite(opts.maxEmployees) && opts.maxEmployees > 0) {
    return opts.maxEmployees;
  }
  if (typeof payload.max_employees === 'number' && Number.isFinite(payload.max_employees) && payload.max_employees > 0) {
    return payload.max_employees;
  }
  if (payload.organization_num_employees_range && typeof payload.organization_num_employees_range.max === 'number' && Number.isFinite(payload.organization_num_employees_range.max) && payload.organization_num_employees_range.max > 0) {
    return payload.organization_num_employees_range.max;
  }

  const ranges = payload.organization_num_employees_ranges;
  if (Array.isArray(ranges) && ranges.length > 0) {
    let maxFound = -Infinity;
    let hasOpenUpperBound = false;

    for (const r of ranges) {
      const str = Array.isArray(r) ? r[0] : (typeof r === 'string' ? r : (r != null ? String(r) : ''));
      if (typeof str !== 'string' || !str) continue;
      const trimmed = str.trim();

      // Lower+ open range like "50,", "50+", or "10001"
      if (trimmed.endsWith(',') || trimmed.endsWith('+') || trimmed === '10001') {
        hasOpenUpperBound = true;
        break;
      }

      // Upper-bounded open range like ",50"
      if (trimmed.startsWith(',')) {
        const u = parseInt(trimmed.replace(',', ''), 10);
        if (!isNaN(u) && u > maxFound) maxFound = u;
      } else if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(s => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[1])) {
          if (parts[1] > maxFound) maxFound = parts[1];
        } else if (parts.length === 2 && isNaN(parts[1])) {
          hasOpenUpperBound = true;
          break;
        }
      } else {
        const u = parseInt(trimmed, 10);
        if (!isNaN(u) && u > maxFound) maxFound = u;
      }
    }

    if (!hasOpenUpperBound && maxFound > 0 && maxFound !== -Infinity) {
      return maxFound;
    }
  }

  return null;
}

// 9. Universal Execution Plan Resolver (Extracts active search brackets or defaults to 10 universal brackets)
export function resolveHarvestExecutionPlan(basePayload = {}, options = {}) {
  const maxEmp = detectMaxEmployeesFromFilters(basePayload, options);
  let plans = [];
  const customRanges = basePayload?.organization_num_employees_ranges;
  if (Array.isArray(customRanges) && customRanges.length > 0) {
    for (const r of customRanges) {
      const str = Array.isArray(r) ? r[0] : (typeof r === 'string' ? r : (r != null ? String(r) : ''));
      if (typeof str === 'string' && (str.endsWith(',') || str.endsWith('+') || str.startsWith(','))) {
        plans.push(...expandOpenHeadcountRange(str));
      } else {
        plans.push(Array.isArray(r) ? r : [str]);
      }
    }
  } else {
    plans = [...UNIVERSAL_PRIMARY_HEADCOUNT_BRACKETS];
  }

  if (typeof maxEmp === 'number' && maxEmp > 0) {
    const filtered = [];
    for (const p of plans) {
      const str = Array.isArray(p) ? String(p[0]) : String(p);
      if (str === '10001') {
        if (maxEmp >= 10001) filtered.push(['10001']);
        continue;
      }
      const parts = str.split(',').map(n => parseInt(n.trim(), 10));
      if (!isNaN(parts[0]) && parts[0] <= maxEmp) {
        if (parts[1] !== undefined && !isNaN(parts[1]) && parts[1] > maxEmp) {
          filtered.push([`${parts[0]},${maxEmp}`]);
        } else {
          filtered.push(Array.isArray(p) ? p : [str]);
        }
      }
    }
    return filtered;
  }

  return plans;
}

// 9b. Micro-Bracket Execution Plan Resolver (Decomposes macro brackets into adaptive micro-cabinets)
export function resolveExecutionBrackets(basePayload = {}, options = {}) {
  const maxEmp = detectMaxEmployeesFromFilters(basePayload, options);
  const customRanges = basePayload?.organization_num_employees_ranges;
  let raw = [];
  if (Array.isArray(customRanges) && customRanges.length > 0) {
    const out = [];
    for (const r of customRanges) {
      const str = Array.isArray(r) ? r[0] : (typeof r === 'string' ? r : (r != null ? String(r) : ''));
      if (typeof str === 'string' && (str.endsWith(',') || str.endsWith('+') || str.startsWith(','))) {
        const expanded = expandOpenHeadcountRange(str);
        for (const item of expanded) {
          const macro = item[0];
          if (macro === '10001') {
            if (options.decomposeEnterprise) {
              out.push(...ENTERPRISE_HEADCOUNT_TIERS.map(t => [t]));
            } else {
              out.push(['10001']);
            }
          } else if (isHighDensityBracket([macro])) {
            out.push(...decomposeHighDensityBracket(macro, options));
          } else {
            out.push([macro]);
          }
        }
      } else if (typeof str === 'string' && isHighDensityBracket([str])) {
        out.push(...decomposeHighDensityBracket(str, options));
      } else {
        out.push(Array.isArray(r) ? r : [str]);
      }
    }
    raw = out;
  } else {
    const universal = [];
    for (const b of UNIVERSAL_PRIMARY_HEADCOUNT_BRACKETS) {
      const macro = b[0];
      if (macro === '10001') {
        if (options.decomposeEnterprise) {
          universal.push(...ENTERPRISE_HEADCOUNT_TIERS.map(t => [t]));
        } else {
          universal.push(['10001']);
        }
      } else if (isHighDensityBracket([macro])) {
        universal.push(...decomposeHighDensityBracket(macro, options));
      } else {
        universal.push([macro]);
      }
    }
    raw = universal;
  }

  if (typeof maxEmp === 'number' && maxEmp > 0) {
    const filtered = [];
    for (const b of raw) {
      const str = Array.isArray(b) ? String(b[0]) : String(b);
      if (str === '10001') {
        if (maxEmp >= 10001) filtered.push(['10001']);
        continue;
      }
      const parts = str.split(',').map(n => parseInt(n.trim(), 10));
      if (!isNaN(parts[0]) && parts[0] <= maxEmp) {
        if (parts[1] !== undefined && !isNaN(parts[1]) && parts[1] > maxEmp) {
          filtered.push([`${parts[0]},${maxEmp}`]);
        } else {
          filtered.push(Array.isArray(b) ? b : [str]);
        }
      }
    }
    return filtered;
  }

  return raw;
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

// 12. Bracket Subdivision Threshold Detector (Detects pools > 300 leads needing micro-slicing)
export function shouldSubdivideBracket(totalEntries) {
  return typeof totalEntries === 'number' && totalEntries > MAX_BIDIRECTIONAL_LEADS;
}

// 13. Bidirectional Sort Plan Generator (Enables 300-lead capture per bracket: top 150 + bottom 150)
export function generateBidirectionalSortPlans(totalEntries) {
  const plans = [{ sort_ascending: false, label: 'top' }];
  if (typeof totalEntries === 'number' && totalEntries > MAX_TOP_DOWN_LEADS) {
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
        pagesNeeded: Math.ceil(totalEntries / APOLLO_PAGE_SIZE)
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
  const maxLimit = options.maxLeadsPerCabinet || MAX_BIDIRECTIONAL_LEADS;
  if (!totalEntries || totalEntries <= maxLimit) {
    return [cabinet];
  }

  // Leaf granularity guard: Never re-subdivide cabinets that already represent subdepartments,
  // untagged slices, grouped coalesced bins, or have been explicitly marked as leaf units.
  if (cabinet.subdepartment || cabinet.isUntagged || cabinet._leaf || cabinet.isGrouped || cabinet._preflight) {
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

  // Level 0: Enterprise Headcount Expansion (if macro 10001 / 10001+ exceeds limit)
  if ((rawBracket === '10001' || rawBracket === '10001,' || rawBracket === '10001+' || rawBracket === '10001,10001' || (min === 10001 && max === 10001 && !rawBracket.includes(','))) && totalEntries > maxLimit) {
    return ENTERPRISE_HEADCOUNT_TIERS.map(bracket => ({
      ...cabinet,
      label: cabinet.seniority ? `${bracket} ${cabinet.seniority}` : bracket,
      bracket: [bracket],
      total: null,
      mode: 'Bidirectional'
    }));
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

  // Level 4: Sub-Department / Functional Partitioning
  // Triggered when single-integer headcount, seniority, and email status are already set, but totalEntries > maxLimit
  const userDepts = Array.isArray(baseFilters.person_department_or_subdepartments) && baseFilters.person_department_or_subdepartments.length > 0
    ? baseFilters.person_department_or_subdepartments
    : (Array.isArray(baseFilters.personDepartmentOrSubdepartments) ? baseFilters.personDepartmentOrSubdepartments : []);

  if (cabinet.emailStatus && !cabinet.subdepartment && totalEntries > maxLimit) {
    // A. Check if user selected a master department (e.g. master_human_resources, master_sales)
    const masterDeptKey = userDepts.find(d => APOLLO_MASTER_SUBDEPARTMENTS[d]);
    if (masterDeptKey && APOLLO_MASTER_SUBDEPARTMENTS[masterDeptKey]) {
      const subs = APOLLO_MASTER_SUBDEPARTMENTS[masterDeptKey];
      // Check if user already pinned a specific subdepartment
      const userPinnedSub = userDepts.find(d => subs.some(s => s.queryKey === d));
      if (!userPinnedSub) {
        return subs.map(sub => ({
          ...cabinet,
          label: `${cabinet.label} ${sub.label}`,
          subdepartment: sub.queryKey,
          department: masterDeptKey,
          total: null,
          mode: 'Bidirectional'
        }));
      }
    } else if (userDepts.length === 0) {
      // B. If user did NOT select any department at all, subdivide across 14 master departments!
      const masterKeys = Object.keys(APOLLO_MASTER_SUBDEPARTMENTS);
      return masterKeys.map(mKey => ({
        ...cabinet,
        label: `${cabinet.label} ${mKey.replace('master_', '').replace(/_/g, ' ')}`,
        department: mKey,
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
        pagesNeeded: Math.ceil(total / APOLLO_PAGE_SIZE)
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
  'email',
  'extrapolated_email',
  'email_status',
  'phone',
  'linkedin_url',
  'twitter_url',
  'city',
  'state',
  'country',
  'time_zone',
  'company_name',
  'company_domain',
  'company_website',
  'company_linkedin',
  'company_employees',
  'company_industry',
  'company_keywords',
  'company_phone',
  'company_founded_year',
  'company_technologies',
  'company_funding',
  'company_revenue',
  'photo_url',
  'past_companies',
  'past_titles',
  'github_url',
  'facebook_url',
  'postal_code',
  'formatted_address',
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
    company_website: org.website_url || '',
    company_linkedin: org.linkedin_url || '',
    company_employees: employeesVal,
    company_industry: industryVal,
    company_keywords: keywordsVal,
    company_phone: org.phone || org.primary_phone?.number || org.sanitized_phone || '',
    company_founded_year: org.founded_year || raw.organization_founded_year || '',
    company_revenue: org.organization_revenue_printed || org.annual_revenue_printed || org.annual_revenue || '',
    company_technologies: techVal,
    company_funding: fundingVal,
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


// 18b. Clean 28-Column Outreach Standard Schema
export const CLEAN_OUTREACH_COLUMNS_28 = [
  { header: 'First Name', key: 'first_name' },
  { header: 'Last Name', key: 'last_name' },
  { header: 'Full Name', key: 'full_name' },
  { header: 'Job Title', key: 'title' },
  { header: 'Seniority', key: 'seniority' },
  { header: 'Email', key: 'email' },
  { header: 'Email Status', key: 'email_status' },
  { header: 'Extrapolated Email', key: 'extrapolated_email' },
  { header: 'Phone', key: 'phone' },
  { header: 'LinkedIn URL', key: 'linkedin_url' },
  { header: 'Headline', key: 'headline' },
  { header: 'City', key: 'city' },
  { header: 'State', key: 'state' },
  { header: 'Country', key: 'country' },
  { header: 'Time Zone', key: 'time_zone' },
  { header: 'Company Name', key: 'company_name' },
  { header: 'Company Domain', key: 'company_domain' },
  { header: 'Company Website', key: 'company_website' },
  { header: 'Company LinkedIn', key: 'company_linkedin' },
  { header: 'Company Employees', key: 'company_employees' },
  { header: 'Company Industry', key: 'company_industry' },
  { header: 'Company Keywords', key: 'company_keywords' },
  { header: 'Company Phone', key: 'company_phone' },
  { header: 'Company Founded Year', key: 'company_founded_year' },
  { header: 'ICP Tier', key: 'icp_tier' },
  { header: 'ICP Score', key: 'icp_score' },
  { header: 'Apollo Lead ID', key: 'id' },
  { header: 'Apollo Org ID', key: 'company_id' }
];

export function buildChunkedCleanOutreachCSV(items = [], chunkSize = 2500) {
  if (!items || items.length === 0) return [''];

  const headers = CLEAN_OUTREACH_COLUMNS_28.map(c => c.header);
  const headerLine = '\uFEFF' + headers.join(',') + '\r\n';
  const chunks = [headerLine];

  const size = Math.max(1, chunkSize);
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const rowLines = slice.map(item => {
      return CLEAN_OUTREACH_COLUMNS_28.map(col => {
        let val = '';
        if (col.key === 'email') {
          const rawEmail = item.email || '';
          const isLocked = !rawEmail || rawEmail.includes('email_not_unlocked');
          val = !isLocked ? rawEmail : (item.extrapolated_email || '');
        } else if (col.key === 'phone') {
          val = item.phone || item.company_phone || item.organization_phone || '';
        } else if (col.key === 'company_keywords') {
          val = item.company_keywords || item.keywords || item.organization_keywords || '';
        } else if (col.key === 'full_name') {
          val = item.full_name || item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim();
        } else if (col.key === 'company_name') {
          val = item.company_name || item.organization_name || '';
        } else if (col.key === 'company_domain') {
          val = item.company_domain || item.organization_domain || item.organization_primary_domain || '';
        } else if (col.key === 'company_website') {
          val = item.company_website || item.organization_website_url || '';
        } else if (col.key === 'company_linkedin') {
          val = item.company_linkedin || item.organization_linkedin_url || '';
        } else if (col.key === 'company_employees') {
          val = item.company_employees || item.organization_estimated_num_employees || '';
        } else if (col.key === 'company_industry') {
          val = item.company_industry || item.organization_industries || '';
        } else if (col.key === 'company_phone') {
          val = item.company_phone || item.organization_phone || '';
        } else if (col.key === 'company_founded_year') {
          val = item.company_founded_year || item.organization_founded_year || item.account_founded_year || '';
        } else if (col.key === 'company_id') {
          val = item.company_id || item.organization_id || '';
        } else {
          val = item[col.key];
        }

        if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = String(val);
        }

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

// 21. Mission Control HUD & Telemetry: Adaptive Harvest Telemetry Estimator
export class HarvestTelemetryEstimator {
  constructor(options = {}) {
    this.engineMode = options.engineMode || 'standard';
    const isTurbo = this.engineMode === 'turbo';
    this.defaultLatencyMs = typeof options.defaultLatencyMs === 'number'
      ? options.defaultLatencyMs
      : (isTurbo ? 350 : 400);
    this.defaultPacingMs = typeof options.defaultPacingMs === 'number'
      ? options.defaultPacingMs
      : (isTurbo ? 120 : (options.defaultPacingMs || 2500));
    this.cooldownEveryN = options.cooldownEveryN || 10;
    this.cooldownDurationMs = options.cooldownDurationMs || 45000;
    this.enableCooldown = options.enableCooldown !== undefined
      ? (options.enableCooldown === true)
      : false;

    this.latencySamples = []; // Rolling buffer of measured API roundtrip ms
    this.maxSamples = options.maxSamples || 25;
    this.pacingSamples = [];
    this.requestsCompleted = 0;
    this.preflightTimeMs = options.preflightTimeMs || 0;
    this.startTime = Date.now();
  }

  recordRequest(latencyMs, pacingMs = null) {
    if (typeof latencyMs === 'number' && latencyMs >= 0) {
      this.latencySamples.push(latencyMs);
      if (this.latencySamples.length > this.maxSamples) {
        this.latencySamples.shift();
      }
    }
    if (typeof pacingMs === 'number' && pacingMs >= 0) {
      this.pacingSamples.push(pacingMs);
      if (this.pacingSamples.length > this.maxSamples) {
        this.pacingSamples.shift();
      }
    }
    this.requestsCompleted++;
  }

  recordPacing(pacingMs) {
    if (typeof pacingMs === 'number' && pacingMs >= 0) {
      this.pacingSamples.push(pacingMs);
      if (this.pacingSamples.length > this.maxSamples) {
        this.pacingSamples.shift();
      }
    }
  }

  getAverageLatencyMs() {
    if (this.latencySamples.length === 0) return this.defaultLatencyMs; // Baseline Cloudflare/Apollo RTT default
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencySamples.length);
  }

  getAveragePacingMs() {
    if (this.pacingSamples.length === 0) return this.defaultPacingMs;
    const sum = this.pacingSamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.pacingSamples.length);
  }

  getLatencySpikeStatus(thresholdMs = 1500) {
    const avg = this.getAverageLatencyMs();
    const last = this.latencySamples.length > 0 ? this.latencySamples[this.latencySamples.length - 1] : avg;
    return {
      avgLatencyMs: avg,
      lastLatencyMs: last,
      isSpike: last >= thresholdMs || avg >= 1200
    };
  }

  estimateRemainingSeconds(remainingPages = 0, remainingCabinets = 0) {
    const pages = Math.max(0, parseInt(remainingPages, 10) || 0);
    if (pages === 0) return 0;

    const avgLatencyMs = this.getAverageLatencyMs();
    const avgPacingMs = this.getAveragePacingMs();
    const perRequestMs = avgLatencyMs + avgPacingMs;

    // Remaining cooldown breaks
    let cooldownTotalMs = 0;
    if (this.enableCooldown && this.cooldownEveryN > 0 && this.cooldownDurationMs > 0) {
      const requestsUntilNext = this.cooldownEveryN - (this.requestsCompleted % this.cooldownEveryN);
      let futureCooldowns = 0;
      if (pages >= requestsUntilNext) {
        futureCooldowns = 1 + Math.floor((pages - requestsUntilNext) / this.cooldownEveryN);
      }
      cooldownTotalMs = futureCooldowns * this.cooldownDurationMs;
    }

    // Hash change / cabinet initialization buffer
    const transitionMs = Math.max(0, remainingCabinets) * (this.engineMode === 'turbo' ? 50 : 500);

    const totalEstimatedMs = (pages * perRequestMs) + cooldownTotalMs + transitionMs;
    return Math.max(1, Math.round(totalEstimatedMs / 1000));
  }

  static formatETA(seconds) {
    if (typeof seconds !== 'number' || seconds <= 0) return 'Complete';
    if (seconds < 60) return `< 1m (${seconds}s)`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `~${hrs}h ${mins}m`;
    }
    return `~${mins}m ${secs > 0 ? secs + 's' : ''}`.trim();
  }
}

// 21b. Mission Control HUD: Dynamic ETA Predictor
export function calculateETA(currentCount = 0, targetCount = 0, leadsPerMinute = 0, options = {}) {
  if (currentCount >= targetCount && targetCount > 0) return 'Complete';

  // If telemetry options provided, use rich network-aware calculation
  if (options && typeof options.remainingPages === 'number' && options.remainingPages > 0) {
    const pages = options.remainingPages;
    const latencyMs = typeof options.latencyMs === 'number' ? options.latencyMs : 400;
    const pacingMs = typeof options.pacingMs === 'number' ? options.pacingMs : 2500;
    const cooldownMs = options.enableCooldown !== false && options.cooldownDurationMs ? options.cooldownDurationMs : 45000;
    const cooldownEveryN = options.cooldownEveryN || 10;
    const reqCompleted = options.requestsCompleted || 0;

    const reqUntilNext = cooldownEveryN - (reqCompleted % cooldownEveryN);
    let futureCooldowns = 0;
    if (pages >= reqUntilNext) {
      futureCooldowns = 1 + Math.floor((pages - reqUntilNext) / cooldownEveryN);
    }

    const totalSeconds = Math.round(((pages * (latencyMs + pacingMs)) + (futureCooldowns * cooldownMs)) / 1000);
    if (totalSeconds < 60) return '< 1m';
    if (totalSeconds < 3600) return `~${Math.round(totalSeconds / 60)}m`;
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.round((totalSeconds % 3600) / 60);
    return `~${hrs}h ${mins}m`;
  }

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

export const HIGH_DENSITY_SENIORITY_ORDER = [
  'entry', 'manager', 'senior', 'director', 'vp', 'head', 'c_suite', 'founder', 'partner', 'owner', 'intern'
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
 * 24b. Dynamic Bin-Packing Coalescence Engine (First-Fit Decreasing)
 * Groups sparse partition items (seniorities, subdepartments) into aggregate
 * cabinets whose cumulative lead count is <= maxBinCapacity (default 300 leads).
 *
 * @param {Array<Object>} items - Array of partition objects { key, total, label, ... }
 * @param {Object} options - { maxBinCapacity = 300, keyField = 'key', labelField = 'label', countField = 'total' }
 * @returns {Array<Object>} Coalesced bins { keys: Array<string>, total: number, label: string, isGrouped: boolean, items: Array }
 */
export function coalescePartitionsIntoBins(items = [], options = {}) {
  const maxCapacity = typeof options === 'number'
    ? options
    : (options && options.maxBinCapacity !== undefined ? options.maxBinCapacity : 300);
  const opts = typeof options === 'object' && options !== null ? options : {};
  const keyField = opts.keyField || 'key';
  const labelField = opts.labelField || 'label';
  const countField = opts.countField || 'total';

  const validItems = (Array.isArray(items) ? items : []).filter(it => it && typeof it[countField] === 'number' && it[countField] > 0);
  if (validItems.length === 0) return [];

  const standalone = [];
  const packable = [];

  for (const it of validItems) {
    if (it[countField] >= maxCapacity) {
      standalone.push(it);
    } else {
      packable.push(it);
    }
  }

  // Sort packable items descending (First-Fit Decreasing)
  packable.sort((a, b) => b[countField] - a[countField]);

  const bins = [];
  for (const it of packable) {
    let placed = false;
    for (const bin of bins) {
      if (bin.total + it[countField] <= maxCapacity) {
        bin.items.push(it);
        bin.total += it[countField];
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({
        items: [it],
        total: it[countField]
      });
    }
  }

  const result = [];

  // 1. Standalone items first (preserving their high density)
  for (const s of standalone) {
    result.push({
      items: [s],
      keys: [s[keyField]],
      total: s[countField],
      label: s[labelField] || String(s[keyField]),
      isGrouped: false
    });
  }

  // 2. Coalesced bins
  for (const b of bins) {
    const keys = b.items.map(it => it[keyField]);
    const labels = b.items.map(it => it[labelField] || it[keyField]);
    let label;
    if (labels.length === 1) {
      label = labels[0];
    } else if (labels.length <= 3) {
      label = labels.join('+');
    } else {
      label = `${labels.length} Grouped (${labels[0]}+${labels[1]}+...)`;
    }

    result.push({
      items: b.items,
      keys,
      total: b.total,
      label,
      isGrouped: keys.length > 1
    });
  }

  return result;
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

  const maxLimit = options.maxLeadsPerCabinet !== undefined ? options.maxLeadsPerCabinet : MAX_TOP_DOWN_LEADS;
  const bidirectionalLimit = options.maxBidirectionalLeads !== undefined ? options.maxBidirectionalLeads : MAX_BIDIRECTIONAL_LEADS;
  const maxMultiIntegerLimit = options.maxMultiIntegerLeads !== undefined ? options.maxMultiIntegerLeads : Math.min(bidirectionalLimit, MAX_MULTI_INTEGER_RANGE_LEADS);
  const isCompanies = options.isCompanies || false;
  const onProbeProgress = options.onProbeProgress || null;
  const sleepFn = typeof options.sleepFn === 'function' ? options.sleepFn : null;
  const probePacing = options.probePacing || {};
  const isAborted = typeof options.isAborted === 'function' ? options.isAborted : () => false;
  const isPaused = typeof options.isPaused === 'function' ? options.isPaused : () => false;
  const checkPause = typeof options.checkPause === 'function' ? options.checkPause : null;
  const optimalUnits = [];
  const auditLog = Array.isArray(options.auditLog) ? options.auditLog : [];
  let probesPrunedByMath = 0;

  const checkPauseAndAbort = async () => {
    if (checkPause) {
      await checkPause();
    } else if (isPaused) {
      while (isPaused() && !isAborted()) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
    return isAborted();
  };

  const logAudit = (entry) => {
    auditLog.push({
      step: auditLog.length + 1,
      timestamp: new Date().toISOString(),
      type: entry.type || 'PROBE',
      label: entry.label || '',
      bracket: entry.bracket ? (Array.isArray(entry.bracket) ? entry.bracket.join(',') : String(entry.bracket)) : (entry.label || ''),
      seniority: entry.seniority || 'All',
      emailStatus: entry.emailStatus ? (Array.isArray(entry.emailStatus) ? entry.emailStatus.join(',') : String(entry.emailStatus)) : 'All',
      leadsCount: entry.leadsCount !== undefined ? entry.leadsCount : null,
      decision: entry.decision || '',
      mode: entry.mode || null,
      pagesNeeded: entry.pagesNeeded || null
    });
  };

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

  const maxEmp = detectMaxEmployeesFromFilters(basePayload, options);
  if (typeof maxEmp === 'number' && maxEmp > 0) {
    startingBrackets = startingBrackets
      .filter(b => b.min <= maxEmp)
      .map(b => {
        if (b.max > maxEmp) {
          const newMax = maxEmp;
          return { min: b.min, max: newMax, label: `${b.min},${newMax}` };
        }
        return b;
      });

    if (startingBrackets.length === 0) {
      return options.detailed ? { cabinets: [], auditLog } : [];
    }
  }

  // Short-Circuit Check: If search has <= maxLimit * 2 leads, execute as 1 single cabinet!
  let rootTotal = options.initialTotal !== undefined ? options.initialTotal : null;
  if (rootTotal === null && (!customRanges || customRanges.length <= 1)) {
    if (await checkPauseAndAbort()) return options.detailed ? { cabinets: [], auditLog, aborted: true } : [];
    rootTotal = await probeFn(customRanges && customRanges.length === 1 ? { organization_num_employees_ranges: customRanges } : {});
    if (await checkPauseAndAbort()) return options.detailed ? { cabinets: [], auditLog, aborted: true } : [];
    if (onProbeProgress) onProbeProgress({ type: 'ROOT_PROBE', total: rootTotal });
  }

  if (rootTotal === 0) {
    logAudit({
      type: 'ROOT_PROBE',
      label: 'ROOT_SEARCH',
      leadsCount: 0,
      decision: 'Root search has 0 total leads. Preflight ended (0 matching results).'
    });
    if (sleepFn) {
      const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
      if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: 'ROOT', delayMs });
      await sleepFn(delayMs);
    }
    return options.detailed ? { cabinets: [], auditLog } : [];
  }

  if (typeof rootTotal === 'number' && rootTotal > 0 && (rootTotal <= maxLimit || (options.initialTotal !== undefined && rootTotal <= bidirectionalLimit))) {
    let singleLabel = customRanges && customRanges.length === 1 ? (Array.isArray(customRanges[0]) ? customRanges[0][0] : String(customRanges[0])) : 'All Matching Leads';
    let bracket = customRanges && customRanges.length === 1 ? (Array.isArray(customRanges[0]) ? customRanges[0] : [String(customRanges[0])]) : null;

    if (typeof maxEmp === 'number' && maxEmp > 0) {
      if (bracket && bracket[0]) {
        const str = String(bracket[0]);
        if (str === '10001') {
          if (maxEmp < 10001) return options.detailed ? { cabinets: [], auditLog } : [];
        } else {
          const parts = str.split(',').map(n => parseInt(n.trim(), 10));
          if (!isNaN(parts[0])) {
            if (parts[0] > maxEmp) {
              return options.detailed ? { cabinets: [], auditLog } : [];
            }
            if (parts[1] !== undefined && !isNaN(parts[1]) && parts[1] > maxEmp) {
              bracket = [`${parts[0]},${maxEmp}`];
              singleLabel = `${parts[0]},${maxEmp}`;
            }
          }
        }
      } else if (!bracket && startingBrackets.length > 0) {
        bracket = [`${startingBrackets[0].min},${maxEmp}`];
        singleLabel = `${startingBrackets[0].min},${maxEmp}`;
      } else if (!bracket && startingBrackets.length === 0) {
        return options.detailed ? { cabinets: [], auditLog } : [];
      }
    }

    const singleCabinet = {
      label: singleLabel.includes('All Matching') ? singleLabel : `${singleLabel} (All Matching)`,
      bracket,
      seniority: null,
      emailStatus: null,
      keyword: null,
      total: rootTotal,
      pagesNeeded: Math.min(5, Math.ceil(rootTotal / APOLLO_PAGE_SIZE)),
      mode: rootTotal <= MAX_TOP_DOWN_LEADS ? 'Top-Down Only' : 'Bidirectional'
    };

    logAudit({
      type: 'ROOT_PROBE',
      label: singleCabinet.label,
      bracket: bracket ? bracket[0] : 'All',
      leadsCount: rootTotal,
      decision: `Total leads (${rootTotal}) <= ${options.initialTotal !== undefined ? bidirectionalLimit : maxLimit}. Short-circuiting directly to 1 unified cabinet.`,
      mode: singleCabinet.mode,
      pagesNeeded: singleCabinet.pagesNeeded
    });

    return options.detailed ? { cabinets: [singleCabinet], auditLog } : [singleCabinet];
  }

  if (rootTotal === null || rootTotal === undefined) {
    if (customRanges && customRanges.length === 1) {
      // Probing is blocked (e.g. Cloudflare Turnstile). Immediately return starting brackets in Bidirectional mode!
      const fallbackCabinets = startingBrackets.map(b => ({
        label: b.label,
        bracket: [b.label],
        seniority: null,
        emailStatus: null,
        keyword: null,
        total: null,
        pagesNeeded: 5,
        mode: 'Bidirectional'
      }));
      fallbackCabinets.forEach(b => {
        logAudit({
          type: 'FALLBACK_CABINET',
          label: b.label,
          bracket: b.label,
          leadsCount: null,
          decision: 'Root search probe blocked/unverified. Queued starting bracket as fallback Bidirectional cabinet.',
          mode: 'Bidirectional',
          pagesNeeded: 5
        });
      });
      return options.detailed ? { cabinets: fallbackCabinets, auditLog } : fallbackCabinets;
    }
  }

  const decomposedPools = new Map();
  const queue = startingBrackets.map(b => ({
    ...b,
    parentRange: b.label,
    parentMin: b.min,
    parentMax: b.max
  }));

  while (queue.length > 0) {
    if (await checkPauseAndAbort()) break;
    const item = queue.shift();
    const count = await probeFn({ organization_num_employees_ranges: [item.label] });
    if (await checkPauseAndAbort()) break;
    if (onProbeProgress) onProbeProgress({ type: 'BRACKET_PROBE', label: item.label, total: count });

    if (count === 0) {
      logAudit({
        type: 'BRACKET_PROBE',
        label: item.label,
        bracket: item.label,
        leadsCount: 0,
        decision: '0 leads found. Excluded cabinet and applied stealth dwell delay.'
      });
      if (sleepFn) {
        const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
        if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: item.label, delayMs });
        await sleepFn(delayMs);
      }
      continue;
    }

    if (count === null || count === undefined) {
      // Probe unavailable or timed out - isolate failure to this bracket as fallback without aborting remaining queue
      logAudit({
        type: 'BRACKET_PROBE',
        label: item.label,
        bracket: item.label,
        leadsCount: null,
        decision: 'Probe timed out or unverified. Isolated failure: accepted as fallback Bidirectional cabinet.',
        mode: 'Bidirectional',
        pagesNeeded: 5
      });
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
      continue;
    }

    if (sleepFn) {
      const delayMs = calculateProbePacingDelay({ isZeroResult: false, ...probePacing });
      await sleepFn(delayMs);
    }

    // Single-integer headcounts have full 300-lead capacity via Bidirectional sweep
    // Multi-integer continuous ranges cap at 240 leads to prevent sweep collisions across wide number brackets
    const isSingleInteger = item.min === item.max;
    const effectiveCeiling = isSingleInteger ? bidirectionalLimit : maxMultiIntegerLimit;

    if (typeof count === 'number' && count <= effectiveCeiling) {
      const mode = count <= maxLimit ? 'Top-Down Only' : 'Bidirectional';
      const pagesNeeded = Math.min(10, Math.ceil(count / APOLLO_PAGE_SIZE));
      logAudit({
        type: 'BRACKET_PROBE',
        label: item.label,
        bracket: item.label,
        leadsCount: count,
        decision: `Within safe limit (${count} <= ${effectiveCeiling} leads). Approved as cabinet [${item.label}].`,
        mode,
        pagesNeeded
      });
      optimalUnits.push({
        label: item.label,
        bracket: [item.label],
        seniority: null,
        emailStatus: null,
        keyword: null,
        total: count,
        pagesNeeded,
        mode
      });

      if (item.min === item.max) {
        const poolKey = item.parentRange || item.label;
        if (!decomposedPools.has(poolKey)) {
          decomposedPools.set(poolKey, {
            parentRange: poolKey,
            parentMin: item.parentMin !== undefined ? item.parentMin : item.min,
            parentMax: item.parentMax !== undefined ? item.parentMax : item.max,
            intactHeadcounts: new Set(),
            decomposedHeadcounts: new Set(),
            seniorityMap: new Map()
          });
        }
        decomposedPools.get(poolKey).intactHeadcounts.add(item.label);
      }
      continue;
    }

    // Bisect headcount whenever min < max and density exceeds effectiveCeiling
    if (item.min < item.max) {
      const mid = Math.floor((item.min + item.max) / 2);
      const left = {
        min: item.min,
        max: mid,
        label: `${item.min},${mid}`,
        parentRange: item.parentRange || item.label,
        parentMin: item.parentMin !== undefined ? item.parentMin : item.min,
        parentMax: item.parentMax !== undefined ? item.parentMax : item.max
      };
      const right = {
        min: mid + 1,
        max: item.max,
        label: `${mid + 1},${item.max}`,
        parentRange: item.parentRange || item.label,
        parentMin: item.parentMin !== undefined ? item.parentMin : item.min,
        parentMax: item.parentMax !== undefined ? item.parentMax : item.max
      };
      logAudit({
        type: 'BISECTION_SPLIT',
        label: item.label,
        bracket: item.label,
        leadsCount: count,
        decision: `Density ceiling exceeded (${count} > ${effectiveCeiling} leads). Bisected range into [${left.label}] and [${right.label}].`
      });
      queue.unshift(right);
      queue.unshift(left);
      continue;
    }

    // Enterprise decomposition: if item is 10001 and density exceeds maxLimit,
    // decompose into enterprise micro-tiers if decomposeEnterprise option is true or if user has locked single seniority/department
    const hasSingleSeniorityOrDept = (Array.isArray(basePayload.person_seniorities) && basePayload.person_seniorities.length === 1) ||
      (Array.isArray(basePayload.personDepartmentOrSubdepartments) && basePayload.personDepartmentOrSubdepartments.length > 0) ||
      (Array.isArray(basePayload.person_department_or_subdepartments) && basePayload.person_department_or_subdepartments.length > 0);

    if ((item.label === '10001' || item.label === '10001+' || (item.min === 10001 && item.max === 10001)) && (options.decomposeEnterprise || hasSingleSeniorityOrDept)) {
      const enterpriseItems = ENTERPRISE_HEADCOUNT_TIERS.map(tier => {
        const parts = tier.split(',').map(n => parseInt(n.trim(), 10));
        return { min: parts[0], max: parts[1], label: tier };
      });
      logAudit({
        type: 'ENTERPRISE_DECOMPOSITION',
        label: item.label,
        bracket: item.label,
        leadsCount: count,
        decision: `Enterprise 10001+ exceeds limit (${count} leads). Decomposed into 5 enterprise tiers: ${ENTERPRISE_HEADCOUNT_TIERS.join(', ')}.`
      });
      for (let i = enterpriseItems.length - 1; i >= 0; i--) {
        queue.unshift(enterpriseItems[i]);
      }
      continue;
    }

    if (isCompanies) {
      if (item.min < item.max) {
        const mid = Math.floor((item.min + item.max) / 2);
        const left = { min: item.min, max: mid, label: `${item.min},${mid}` };
        const right = { min: mid + 1, max: item.max, label: `${mid + 1},${item.max}` };
        logAudit({
          type: 'BISECTION_SPLIT',
          label: item.label,
          bracket: item.label,
          leadsCount: count,
          decision: `Company density ceiling exceeded (${count} > ${maxLimit} companies). Bisected into [${left.label}] and [${right.label}].`
        });
        queue.unshift(right);
        queue.unshift(left);
      } else {
        const pagesNeeded = Math.min(10, Math.ceil(count / APOLLO_PAGE_SIZE));
        logAudit({
          type: 'COMPANY_DENSE_CABINET',
          label: item.label,
          bracket: item.label,
          leadsCount: count,
          decision: `Company search dense single tier (${count} companies). Approved as Bidirectional cabinet (A-Z + Z-A).`,
          mode: 'Bidirectional',
          pagesNeeded
        });
        optimalUnits.push({
          label: item.label,
          bracket: [item.label],
          seniority: null,
          emailStatus: null,
          keyword: null,
          total: count,
          pagesNeeded,
          mode: 'Bidirectional'
        });
      }
      continue;
    }

    // Single integer headcount or tight span < 5 exceeding maxLimit: Pivot to Seniorities
    const seniorities = Array.isArray(basePayload.person_seniorities) && basePayload.person_seniorities.length > 0
      ? basePayload.person_seniorities
      : HIGH_DENSITY_SENIORITY_ORDER;

    logAudit({
      type: 'SENIORITY_PIVOT',
      label: item.label,
      bracket: item.label,
      leadsCount: count,
      decision: `Single headcount density ceiling exceeded (${count} > ${bidirectionalLimit} leads). Pivoting to ${seniorities.length} Apollo seniorities.`
    });

    const poolKey = item.parentRange || item.label;
    if (!decomposedPools.has(poolKey)) {
      decomposedPools.set(poolKey, {
        parentRange: poolKey,
        parentMin: item.parentMin !== undefined ? item.parentMin : item.min,
        parentMax: item.parentMax !== undefined ? item.parentMax : item.max,
        intactHeadcounts: new Set(),
        decomposedHeadcounts: new Set(),
        seniorityMap: new Map()
      });
    }
    const pool = decomposedPools.get(poolKey);
    pool.decomposedHeadcounts.add(item.label);

    let accountedFor = 0;
    for (let senIdx = 0; senIdx < seniorities.length; senIdx++) {
      const sen = seniorities[senIdx];

      // Mathematical Remainder Pruning:
      // If we've probed at least 2 seniorities, and remaining leads <= effectiveCap:
      const effectiveCap = options.coalesceBinCapacity || bidirectionalLimit;
      if (options.remainderPruning && typeof count === 'number' && count > 0 && senIdx >= 2 && (!basePayload.person_seniorities || basePayload.person_seniorities.length === 0)) {
        const remainingLeads = Math.max(0, count - accountedFor);
        const unprobedSeniorities = seniorities.slice(senIdx);

        if (unprobedSeniorities.length > 1 && remainingLeads <= effectiveCap) {
          const skippedCount = unprobedSeniorities.length;
          probesPrunedByMath += skippedCount;

          if (remainingLeads > 0) {
            const prunedCompositeKey = unprobedSeniorities.join('+');
            if (!pool.seniorityMap.has(prunedCompositeKey)) {
              pool.seniorityMap.set(prunedCompositeKey, new Map());
            }
            pool.seniorityMap.get(prunedCompositeKey).set(item.label, remainingLeads);

            logAudit({
              type: 'REMAINDER_PRUNE',
              label: `${item.label} [${prunedCompositeKey}]`,
              bracket: item.label,
              seniority: prunedCompositeKey,
              leadsCount: remainingLeads,
              decision: `Mathematical remainder pruning: Remaining ${remainingLeads} <= ${effectiveCap} leads. Pruned ${skippedCount} tail seniority probes (${unprobedSeniorities.join(', ')}).`
            });

            if (onProbeProgress) {
              onProbeProgress({
                type: 'REMAINDER_PRUNE',
                label: `${item.label} [${prunedCompositeKey}]`,
                skippedCount,
                remainingLeads
              });
            }
          } else {
            logAudit({
              type: 'REMAINDER_PRUNE',
              label: `${item.label} Tail Seniorities`,
              bracket: item.label,
              seniority: unprobedSeniorities.join(','),
              leadsCount: 0,
              decision: `Mathematical remainder pruning: 100% of bracket leads accounted for (${accountedFor}/${count}). Pruned ${skippedCount} tail seniority probes.`
            });
          }
          break; // Exit seniority loop for this headcount!
        }
      }

      if (await checkPauseAndAbort()) break;
      const senCount = await probeFn({
        organization_num_employees_ranges: [item.label],
        person_seniorities: [sen]
      });
      if (await checkPauseAndAbort()) break;
      if (onProbeProgress) onProbeProgress({ type: 'SENIORITY_PROBE', label: `${item.label} ${sen}`, total: senCount });

      if (typeof senCount === 'number') {
        accountedFor += senCount;
      }

      if (senCount === 0) {
        logAudit({
          type: 'SENIORITY_PROBE',
          label: `${item.label} ${sen}`,
          bracket: item.label,
          seniority: sen,
          leadsCount: 0,
          decision: '0 leads found for seniority. Excluded cabinet and applied stealth dwell delay.'
        });
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

      // Seniority slices have 300-lead capacity via Bidirectional sweep.
      // Collect non-dense seniorities into cross-headcount pool.
      if (typeof senCount === 'number' && senCount <= bidirectionalLimit) {
        if (!pool.seniorityMap.has(sen)) {
          pool.seniorityMap.set(sen, new Map());
        }
        pool.seniorityMap.get(sen).set(item.label, senCount);
        continue;
      }

      // If dense seniority still exceeds maxLimit: Pivot to Email Status (respecting any user-pinned status)
      const userEmailStatus = basePayload.contact_email_status || null;
      const activeEmailPartitions = userEmailStatus && userEmailStatus.length > 0
        ? EMAIL_STATUS_PARTITIONS.filter(p => p.values.some(v => userEmailStatus.includes(v)))
        : EMAIL_STATUS_PARTITIONS;

      logAudit({
        type: 'EMAIL_STATUS_PIVOT',
        label: `${item.label} ${sen}`,
        bracket: item.label,
        seniority: sen,
        leadsCount: senCount,
        decision: `Seniority density ceiling exceeded (${senCount} > ${bidirectionalLimit} leads). Pivoting to ${activeEmailPartitions.length} email status partitions.`
      });

      for (const emailPartition of activeEmailPartitions) {
        if (await checkPauseAndAbort()) break;
        const emailCount = await probeFn({
          organization_num_employees_ranges: [item.label],
          person_seniorities: [sen],
          contact_email_status: emailPartition.values
        });
        if (await checkPauseAndAbort()) break;
        if (onProbeProgress) onProbeProgress({ type: 'EMAIL_PROBE', label: `${item.label} ${sen} ${emailPartition.key}`, total: emailCount });

        if (emailCount === 0) {
          logAudit({
            type: 'EMAIL_PROBE',
            label: `${item.label} ${sen} ${emailPartition.key}`,
            bracket: item.label,
            seniority: sen,
            emailStatus: emailPartition.key,
            leadsCount: 0,
            decision: '0 leads found for email partition. Excluded cabinet and applied stealth dwell delay.'
          });
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

        // Level 4: Sub-Department / Functional Pivot only if email partition exceeds 300 leads (bidirectional capacity)
        if (typeof emailCount === 'number' && emailCount > bidirectionalLimit) {
          const userDepts = Array.isArray(basePayload.person_department_or_subdepartments) && basePayload.person_department_or_subdepartments.length > 0
            ? basePayload.person_department_or_subdepartments
            : (Array.isArray(basePayload.personDepartmentOrSubdepartments) ? basePayload.personDepartmentOrSubdepartments : []);

          const masterDeptKey = userDepts.find(d => APOLLO_MASTER_SUBDEPARTMENTS[d]);
          const availableSubdepts = masterDeptKey ? APOLLO_MASTER_SUBDEPARTMENTS[masterDeptKey] : null;

          if (availableSubdepts && availableSubdepts.length > 1) {
            logAudit({
              type: 'SUBDEPARTMENT_PIVOT',
              label: `${item.label} ${sen} ${emailPartition.key}`,
              bracket: item.label,
              seniority: sen,
              emailStatus: emailPartition.key,
              leadsCount: emailCount,
              decision: `Email partition density ceiling exceeded (${emailCount} > ${bidirectionalLimit} leads). Pivoting to ${availableSubdepts.length} sub-departments under ${masterDeptKey}.`
            });

            let subTotal = 0;
            const probedSubdepts = [];

            for (const sub of availableSubdepts) {
              if (await checkPauseAndAbort()) break;
              const subCount = await probeFn({
                organization_num_employees_ranges: [item.label],
                person_seniorities: [sen],
                contact_email_status: emailPartition.values,
                person_department_or_subdepartments: [sub.queryKey]
              });
              if (await checkPauseAndAbort()) break;
              if (onProbeProgress) onProbeProgress({ type: 'SUBDEPARTMENT_PROBE', label: `${item.label} ${sen} ${emailPartition.key} ${sub.label}`, total: subCount });

              if (subCount === 0) {
                logAudit({
                  type: 'SUBDEPARTMENT_PROBE',
                  label: `${item.label} ${sen} ${emailPartition.key} ${sub.label}`,
                  bracket: item.label,
                  seniority: sen,
                  emailStatus: emailPartition.key,
                  leadsCount: 0,
                  decision: '0 leads found for subdepartment. Excluded cabinet and applied stealth dwell delay.'
                });
                if (sleepFn) {
                  const delayMs = calculateProbePacingDelay({ isZeroResult: true, ...probePacing });
                  if (onProbeProgress) onProbeProgress({ type: 'ZERO_RESULT_DWELL', label: sub.label, delayMs });
                  await sleepFn(delayMs);
                }
                continue;
              }

              if (sleepFn) {
                const delayMs = calculateProbePacingDelay({ isZeroResult: false, ...probePacing });
                await sleepFn(delayMs);
              }

              subTotal += (typeof subCount === 'number' ? subCount : 0);
              probedSubdepts.push({
                key: sub.queryKey,
                label: sub.label,
                total: subCount
              });
            }

            if (probedSubdepts.length > 0) {
              const targetCapacity = Math.min(260, bidirectionalLimit - 40 > 0 ? bidirectionalLimit - 40 : bidirectionalLimit);
              const subBins = (options.coalescePartitions !== false)
                ? coalescePartitionsIntoBins(probedSubdepts, { maxBinCapacity: targetCapacity })
                : probedSubdepts.map(s => ({ items: [s], keys: [s.key], total: s.total, label: s.label, isGrouped: false }));

              for (const bin of subBins) {
                const subMode = bin.total <= maxLimit ? 'Top-Down Only' : 'Bidirectional';
                const subPages = Math.min(10, Math.ceil(bin.total / APOLLO_PAGE_SIZE));

                if (bin.isGrouped) {
                  logAudit({
                    type: 'SUBDEPARTMENT_BIN_COALESCED',
                    label: `${item.label} ${sen} ${emailPartition.key} [${bin.items.map(i => i.label).join('+')}]`,
                    bracket: item.label,
                    seniority: sen,
                    emailStatus: emailPartition.key,
                    leadsCount: bin.total,
                    decision: `Coalesced ${bin.keys.length} sparse subdepartments (${bin.items.map(i => i.label).join(', ')}) into single bin (${bin.total} leads <= ${targetCapacity}).`,
                    mode: subMode,
                    pagesNeeded: subPages
                  });
                  optimalUnits.push({
                    label: `${item.label} ${sen} ${emailPartition.key} [${bin.items.map(i => i.label).join('+')}]`,
                    bracket: [item.label],
                    seniority: sen,
                    emailStatus: emailPartition.values,
                    subdepartment: bin.keys,
                    department: masterDeptKey,
                    isGrouped: true,
                    _leaf: true,
                    keyword: null,
                    total: bin.total,
                    pagesNeeded: subPages,
                    mode: subMode
                  });
                } else {
                  const single = bin.items[0];
                  logAudit({
                    type: 'SUBDEPARTMENT_PROBE',
                    label: `${item.label} ${sen} ${emailPartition.key} ${single.label}`,
                    bracket: item.label,
                    seniority: sen,
                    emailStatus: emailPartition.key,
                    leadsCount: single.total,
                    decision: `Approved as sub-department cabinet [${item.label} ${sen} ${emailPartition.key} ${single.label}].`,
                    mode: subMode,
                    pagesNeeded: subPages
                  });
                  optimalUnits.push({
                    label: `${item.label} ${sen} ${emailPartition.key} ${single.label}`,
                    bracket: [item.label],
                    seniority: sen,
                    emailStatus: emailPartition.values,
                    subdepartment: single.key,
                    department: masterDeptKey,
                    _leaf: true,
                    keyword: null,
                    total: single.total,
                    pagesNeeded: subPages,
                    mode: subMode
                  });
                }
              }

              const untaggedCount = emailCount - subTotal;
              if (untaggedCount > 0) {
                const untaggedMode = untaggedCount <= maxLimit ? 'Top-Down Only' : 'Bidirectional';
                const untaggedPages = Math.min(10, Math.ceil(untaggedCount / APOLLO_PAGE_SIZE));
                logAudit({
                  type: 'SUBDEPARTMENT_PROBE',
                  label: `${item.label} ${sen} ${emailPartition.key} Untagged / General`,
                  bracket: item.label,
                  seniority: sen,
                  emailStatus: emailPartition.key,
                  leadsCount: untaggedCount,
                  decision: `Preserved untagged / unclassified leads (${untaggedCount} leads) in base cabinet.`,
                  mode: untaggedMode,
                  pagesNeeded: untaggedPages
                });
                optimalUnits.push({
                  label: `${item.label} ${sen} ${emailPartition.key} Untagged / General`,
                  bracket: [item.label],
                  seniority: sen,
                  emailStatus: emailPartition.values,
                  subdepartment: null,
                  department: masterDeptKey,
                  isUntagged: true,
                  _leaf: true,
                  keyword: null,
                  total: untaggedCount,
                  pagesNeeded: untaggedPages,
                  mode: untaggedMode
                });
              }
              continue;
            }
            // If all subdepartments returned 0, fall through to base email partition cabinet to prevent dropped leads
          }
        }

        const mode = emailCount <= maxLimit ? 'Top-Down Only' : 'Bidirectional';
        const pagesNeeded = Math.min(10, Math.ceil(emailCount / APOLLO_PAGE_SIZE));
        logAudit({
          type: 'EMAIL_PROBE',
          label: `${item.label} ${sen} ${emailPartition.key}`,
          bracket: item.label,
          seniority: sen,
          emailStatus: emailPartition.key,
          leadsCount: emailCount,
          decision: `Approved as email-partitioned cabinet [${item.label} ${sen} ${emailPartition.key}].`,
          mode,
          pagesNeeded
        });
        optimalUnits.push({
          label: `${item.label} ${sen} ${emailPartition.key}`,
          bracket: [item.label],
          seniority: sen,
          emailStatus: emailPartition.values,
          keyword: null,
          total: emailCount,
          pagesNeeded,
          mode
        });
      }
    }

  }

  // Process cross-headcount seniority pools
  for (const pool of decomposedPools.values()) {
    if (pool.decomposedHeadcounts.size === 0) continue;

    const targetCapacity = options.coalesceBinCapacity || bidirectionalLimit;
    const allDecomposed = Array.from(pool.decomposedHeadcounts).sort((a, b) => {
      const pa = parseInt(a.split(',')[0], 10);
      const pb = parseInt(b.split(',')[0], 10);
      return pa - pb;
    });
    const allDecomposedKey = allDecomposed.join(',');
    const canUseParentRange = pool.intactHeadcounts.size === 0 && pool.parentMin !== pool.parentMax;

    // Group seniorities that have totalForSen <= targetCapacity by their exact contributing headcounts!
    const senioritiesByHcKey = new Map();

    for (const [sen, countsByHeadcount] of pool.seniorityMap.entries()) {
      const activeHcEntries = Array.from(countsByHeadcount.entries()).filter(([_, c]) => c > 0);
      if (activeHcEntries.length === 0) continue;

      const totalForSen = activeHcEntries.reduce((sum, [_, c]) => sum + c, 0);

      if (totalForSen <= targetCapacity && options.coalescePartitions !== false) {
        // Collect contributing headcounts sorted ascending
        const contributingHeadcounts = activeHcEntries.map(([hc]) => hc).sort((a, b) => {
          const pa = parseInt(a.split(',')[0], 10);
          const pb = parseInt(b.split(',')[0], 10);
          return pa - pb;
        });
        const hcKey = contributingHeadcounts.join(',');

        if (!senioritiesByHcKey.has(hcKey)) {
          senioritiesByHcKey.set(hcKey, {
            headcounts: contributingHeadcounts,
            seniorities: []
          });
        }
        senioritiesByHcKey.get(hcKey).seniorities.push({ sen, total: totalForSen });
      } else {
        // Exceeds targetCapacity: pack individual headcount integers for this seniority into sub-300 multi-headcount bins!
        const hcItems = activeHcEntries.map(([hc, hcCount]) => ({
          key: hc,
          label: hc,
          total: hcCount
        }));

        const hcBins = (options.coalescePartitions !== false)
          ? coalescePartitionsIntoBins(hcItems, { maxBinCapacity: targetCapacity })
          : hcItems.map(item => ({ items: [item], keys: [item.key], total: item.total, label: item.label, isGrouped: false }));

        const flattenedSen = (typeof sen === 'string' && sen.includes('+'))
          ? sen.split('+')
          : (Array.isArray(sen) ? sen.flatMap(s => typeof s === 'string' && s.includes('+') ? s.split('+') : s) : sen);
        const isMultiSeniority = Array.isArray(flattenedSen) ? flattenedSen.length > 1 : false;
        const senLabel = isMultiSeniority ? `[${flattenedSen.join('+')}]` : (Array.isArray(flattenedSen) ? flattenedSen[0] : flattenedSen);

        for (const bin of hcBins) {
          const mode = bin.total <= maxLimit ? 'Top-Down Only' : 'Bidirectional';
          const pagesNeeded = Math.min(10, Math.ceil(bin.total / APOLLO_PAGE_SIZE));
          const hcLabel = bin.isGrouped ? `[${bin.keys.join('+')}]` : bin.keys[0];
          const binLabel = `${hcLabel} ${senLabel}`;

          logAudit({
            type: bin.isGrouped ? 'CROSS_HEADCOUNT_BIN_COALESCED' : 'SENIORITY_PROBE',
            label: binLabel,
            bracket: bin.keys.join(','),
            seniority: isMultiSeniority ? flattenedSen.join(',') : (Array.isArray(flattenedSen) ? flattenedSen[0] : flattenedSen),
            leadsCount: bin.total,
            decision: bin.isGrouped
              ? `Coalesced ${bin.keys.length} headcounts [${bin.keys.join(',')}] for seniority ${senLabel} into single bin (${bin.total} leads <= ${targetCapacity}).`
              : `Approved single-headcount cabinet [${binLabel}] (${bin.total} leads).`,
            mode,
            pagesNeeded
          });

          optimalUnits.push({
            label: binLabel,
            bracket: bin.keys,
            seniority: isMultiSeniority ? flattenedSen : (Array.isArray(flattenedSen) ? flattenedSen[0] : flattenedSen),
            emailStatus: null,
            keyword: null,
            total: bin.total,
            pagesNeeded,
            mode,
            isGrouped: bin.isGrouped || isMultiSeniority,
            _leaf: true,
            _preflight: true
          });
        }
      }
    }

    // Process seniorities grouped by their exact contributing headcounts
    for (const [hcKey, group] of senioritiesByHcKey.entries()) {
      const { headcounts, seniorities } = group;
      const spansAllDecomposed = canUseParentRange && hcKey === allDecomposedKey;
      const bracket = spansAllDecomposed ? [pool.parentRange] : headcounts;
      const bracketLabel = bracket.length === 1
        ? bracket[0]
        : (spansAllDecomposed ? pool.parentRange : `[${headcounts.join('+')}]`);

      const pooledItems = seniorities.map(s => ({
        key: s.sen,
        label: s.sen,
        total: s.total
      }));

      const bins = (options.coalescePartitions !== false)
        ? coalescePartitionsIntoBins(pooledItems, { maxBinCapacity: targetCapacity })
        : pooledItems.map(s => ({ items: [s], keys: [s.key], total: s.total, label: s.label, isGrouped: false }));

      for (const bin of bins) {
        const mode = bin.total <= maxLimit ? 'Top-Down Only' : 'Bidirectional';
        const pagesNeeded = Math.min(10, Math.ceil(bin.total / APOLLO_PAGE_SIZE));
        const flattenedSeniorities = (bin.isGrouped ? bin.keys : [bin.keys[0]])
          .flatMap(k => typeof k === 'string' && k.includes('+') ? k.split('+') : k);
        const isMultiSeniority = bin.isGrouped || flattenedSeniorities.length > 1;
        const binLabel = isMultiSeniority ? `${bracketLabel} [${flattenedSeniorities.join('+')}]` : `${bracketLabel} ${flattenedSeniorities[0]}`;

        const isCrossHeadcount = headcounts.length > 1 || spansAllDecomposed;
        logAudit({
          type: isMultiSeniority ? (isCrossHeadcount ? 'CROSS_HEADCOUNT_BIN_COALESCED' : 'SENIORITY_BIN_COALESCED') : 'SENIORITY_PROBE',
          label: binLabel,
          bracket: bracket.join(','),
          seniority: flattenedSeniorities.join(','),
          leadsCount: bin.total,
          decision: isMultiSeniority
            ? (isCrossHeadcount
                ? `Coalesced ${flattenedSeniorities.length} sparse seniorities across [${bracket.join(',')}] (${flattenedSeniorities.join(', ')}) into single bin (${bin.total} leads <= ${targetCapacity}).`
                : `Coalesced ${flattenedSeniorities.length} sparse seniorities (${flattenedSeniorities.join(', ')}) into single bin (${bin.total} leads <= ${targetCapacity}).`)
            : (isCrossHeadcount
                ? `Approved cross-headcount cabinet [${binLabel}] (${bin.total} leads).`
                : `Approved single-headcount cabinet [${binLabel}] (${bin.total} leads).`),
          mode,
          pagesNeeded
        });

        optimalUnits.push({
          label: binLabel,
          bracket,
          seniority: isMultiSeniority ? flattenedSeniorities : flattenedSeniorities[0],
          emailStatus: null,
          keyword: null,
          total: bin.total,
          pagesNeeded,
          mode,
          isGrouped: bin.isGrouped || isMultiSeniority || isCrossHeadcount,
          _leaf: true,
          _preflight: true
        });
      }
    }
  }

  // Ensure all units emitted by preflight have preflight tags and leaf protection where granular
  for (const u of optimalUnits) {
    u._preflight = true;
    if (u.bracket && (u.bracket.length > 1 || u.seniority || u.emailStatus || u.subdepartment)) {
      u._leaf = true;
    }
  }

  return options.detailed ? { cabinets: optimalUnits, auditLog, aborted: isAborted(), probesPrunedByMath } : optimalUnits;
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

// 28. Turbo Engine Helpers: Dynamic Token Bucket Pacer & Concurrency Pool

export class DynamicTokenBucketPacer {
  constructor(options = {}) {
    this.minTurboDelay = typeof options.minTurboDelay === 'number' ? options.minTurboDelay : 600;
    this.maxTurboDelay = typeof options.maxTurboDelay === 'number' ? options.maxTurboDelay : 800;
    this.moderateDelay = typeof options.moderateDelay === 'number' ? options.moderateDelay : 1200;
    this.heavyDelay = typeof options.heavyDelay === 'number' ? options.heavyDelay : 2400;
  }

  calculateDelay({ remainingQuota = null, status = 200, retryAfterSeconds = null } = {}) {
    // 1. Rate Limit Triggered (HTTP 429)
    if (status === 429) {
      const waitSec = typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0 ? retryAfterSeconds : 15;
      return (waitSec * 1000) + 1000; // Exact Retry-After + 1s safety buffer
    }

    // 2. Heavy throttle: remaining quota < 15
    if (typeof remainingQuota === 'number' && remainingQuota < 15) {
      const jitter = Math.floor(Math.random() * 800); // 2000 - 2800ms
      return Math.max(2000, 2000 + jitter);
    }

    // 3. Moderate throttle: remaining quota 15 - 35
    if (typeof remainingQuota === 'number' && remainingQuota <= 35) {
      const jitter = Math.floor(Math.random() * 500); // 1000 - 1500ms
      return Math.max(1000, 1000 + jitter);
    }

    // 4. Turbo normal speed: remaining quota > 35 or unknown/unprovided
    // Uniform randomized jitter between minTurboDelay and maxTurboDelay (default 600 - 800ms)
    const baseMin = this.minTurboDelay;
    const baseMax = this.maxTurboDelay;
    return Math.floor(baseMin + Math.random() * (baseMax - baseMin));
  }
}

export class BoundedConcurrencyPool {
  constructor(concurrency = 3) {
    this.concurrency = Math.max(1, concurrency);
    this.activeCount = 0;
    this.queue = [];
  }

  async run(taskFn) {
    if (typeof taskFn !== 'function') return null;

    if (this.activeCount >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.activeCount++;
    try {
      return await taskFn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

/**
 * Computes non-colliding inline styles for floating HUD positioning.
 * Guarantees that top and bottom are mutually exclusive, and left and right
 * are mutually exclusive to prevent 100vh vertical stretching in position: fixed.
 */
export function computeHudInlineStyles(pos) {
  if (!pos || typeof pos !== 'object') return {};
  const styles = {};
  if (pos.top !== undefined) {
    styles.top = `${pos.top}px`;
    styles.bottom = 'auto';
  } else if (pos.bottom !== undefined) {
    styles.bottom = `${pos.bottom}px`;
    styles.top = 'auto';
  }

  if (pos.left !== undefined) {
    styles.left = `${pos.left}px`;
    styles.right = 'auto';
  } else if (pos.right !== undefined) {
    styles.right = `${pos.right}px`;
    styles.left = 'auto';
  }
  return styles;
}
