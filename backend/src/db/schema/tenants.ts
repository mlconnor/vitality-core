/**
 * Tenant and Organization Tables Schema
 * 
 * Define the physical and organizational structure of the foodservice operation.
 * The textbook describes various foodservice systems including conventional
 * kitchens, commissary (central production), satellite facilities, and
 * assembly/serve operations.
 * 
 * MULTI-TENANT ARCHITECTURE:
 * This schema supports multiple independent organizations (tenants) with three
 * tenant isolation patterns:
 *
 *   1. UNIVERSAL (no tenant_id): Reference data shared across all tenants
 *   2. OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
 *   3. REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ============================================================================
// TABLE: tenants
// 
// Core table for multi-tenant support. All tenant-specific data references
// this table. System-wide data uses NULL tenant_id.
// ============================================================================
export const tenants = sqliteTable('tenants', {
  /** Unique identifier (e.g., 'TEN-001') */
  tenantId: text('tenant_id').primaryKey(),
  
  /** Organization name */
  tenantName: text('tenant_name').notNull(),
  
  /** Short code for display/URLs */
  tenantCode: text('tenant_code').notNull().unique(),
  
  /** Primary contact person */
  contactName: text('contact_name'),
  
  /** Contact email */
  contactEmail: text('contact_email'),
  
  /** Contact phone */
  contactPhone: text('contact_phone'),
  
  /** Business address */
  address: text('address'),
  
  city: text('city'),
  
  state: text('state'),
  
  zip: text('zip'),
  
  /** ISO 3166-1 alpha-2 country code */
  countryCode: text('country_code').default('US'),
  
  /** Preferred food composition database for nutrient lookups */
  defaultFoodCompSourceId: text('default_food_comp_source_id'),
  
  /** Service tier for feature access */
  subscriptionTier: text('subscription_tier', { 
    enum: ['Basic', 'Standard', 'Premium', 'Enterprise'] 
  }).notNull().default('Standard'),
  
  /** 
   * Market segment classification per textbook Chapter 2.
   * Determines default ingredient specifications and purchasing patterns.
   * The textbook classifies foodservices into Commercial, Noncommercial/On-site,
   * and Military, with further subcategories within each.
   */
  segment: text('segment', { 
    enum: ['Healthcare', 'K-12 School', 'College/University', 
           'Business/Industrial', 'Correctional', 'Military',
           'Long-term Care', 'Commercial', 'Other'] 
  }).notNull().default('Other'),
  
  /** Maximum allowed sites */
  maxSites: integer('max_sites').default(5),
  
  /** Maximum allowed users */
  maxUsers: integer('max_users').default(50),
  
  /** When tenant was created */
  createdDate: text('created_date').notNull(),
  
  status: text('status', { 
    enum: ['Active', 'Suspended', 'Trial', 'Cancelled'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation: Tenant is the root level.
   * Include: company policies, brand voice, operational philosophy,
   * purchasing preferences, quality standards, etc.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_tenants_status').on(table.status),
  index('idx_tenants_code').on(table.tenantCode),
  index('idx_tenants_country').on(table.countryCode),
  index('idx_tenants_food_comp').on(table.defaultFoodCompSourceId),
  index('idx_tenants_segment').on(table.segment),
]);

// ============================================================================
// TABLE: sites
// 
// Represents physical locations where food is prepared and/or served. Supports
// multi-site operations common in healthcare systems and school districts. The
// has_production_kitchen field distinguishes between production and satellite
// locations. The textbook notes: "In planning, there should be a straight line
// from the receiving dock to the storeroom and refrigerators."
// ============================================================================
export const sites = sqliteTable('sites', {
  /** Unique identifier */
  siteId: text('site_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Name of the location */
  siteName: text('site_name').notNull(),
  
  /** Type of facility */
  siteType: text('site_type', { 
    enum: ['Kitchen', 'Dining Hall', 'Satellite', 'Commissary', 'Cafeteria'] 
  }).notNull(),
  
  /** Physical address */
  address: text('address'),
  
  /** Seating capacity (for dining areas) */
  capacitySeats: integer('capacity_seats'),
  
  /** 1 if site has cooking capability */
  hasProductionKitchen: integer('has_production_kitchen', { mode: 'boolean' }).notNull().default(false),
  
  /** Dry storage capacity in square feet */
  storageDrySqft: real('storage_dry_sqft'),
  
  /** Refrigerated storage capacity */
  storageRefrigeratedSqft: real('storage_refrigerated_sqft'),
  
  /** Freezer storage capacity */
  storageFreezerSqft: real('storage_freezer_sqft'),
  
  /** Site manager name */
  managerName: text('manager_name'),
  
  /** Contact phone number */
  phone: text('phone'),
  
  /** Operating hours description */
  operatingHours: text('operating_hours'),
  
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Seasonal'] 
  }).notNull().default('Active'),
  
  /** General notes about this site */
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation: Tenant → Site
   * Include: site-specific policies, local vendor preferences,
   * equipment capabilities, staffing notes, regional considerations.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_sites_tenant').on(table.tenantId),
  index('idx_sites_status').on(table.status),
]);

// ============================================================================
// TABLE: stations
// 
// Defines service points within a site (grill, salad bar, trayline, etc.).
// Station types reflect service styles described in the textbook: self-service,
// tray service, wait service. The requires_temp_log field supports HACCP
// (Hazard Analysis and Critical Control Point) compliance. Healthcare facilities
// typically include trayline stations for patient meal assembly.
// ============================================================================
export const stations = sqliteTable('stations', {
  /** Unique identifier */
  stationId: text('station_id').primaryKey(),
  
  /** Reference to parent site */
  siteId: text('site_id').notNull().references(() => sites.siteId, { onDelete: 'cascade' }),
  
  /** Name of the station */
  stationName: text('station_name').notNull(),
  
  /** Type of service station */
  stationType: text('station_type', { 
    enum: ['Grill', 'Steam Table', 'Cold Bar', 'Salad Bar', 'Trayline', 
           'Beverage', 'Dessert', 'À la Carte', 'Grab-and-Go'] 
  }).notNull(),
  
  /** Service capacity (customers per hour) */
  capacityCoversPerHour: integer('capacity_covers_per_hour'),
  
  /** Equipment assigned to this station */
  equipmentList: text('equipment_list'),
  
  /** 1 if HACCP temp logging required */
  requiresTempLog: integer('requires_temp_log', { mode: 'boolean' }).notNull().default(false),
  
  /** How food is served at this station */
  serviceStyle: text('service_style', { 
    enum: ['Self-Service', 'Attended', 'Tray Service', 'Counter Service'] 
  }).notNull(),
  
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Under Maintenance'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation: Tenant → Site → Station
   * Include: station-specific procedures, equipment quirks,
   * menu restrictions, service style notes, popular items.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_stations_site_id').on(table.siteId),
  index('idx_stations_status').on(table.status),
]);

// ============================================================================
// TABLE: employees
// 
// Tracks food service staff for scheduling, certification tracking, and work
// assignment. Job titles reflect the organizational hierarchy described in the
// textbook's chapters on staffing. The certifications field tracks food safety
// certifications (ServSafe, etc.) required by regulations. The textbook
// emphasizes: "The foodservice manager plays a leadership role in the
// prevention of foodborne illness" - trained staff are essential.
// ============================================================================
export const employees = sqliteTable('employees', {
  /** Unique identifier */
  employeeId: text('employee_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  firstName: text('first_name').notNull(),
  
  lastName: text('last_name').notNull(),
  
  /** Main work location */
  primarySiteId: text('primary_site_id').notNull().references(() => sites.siteId),
  
  /** Position/role */
  jobTitle: text('job_title', { 
    enum: ['Cook', 'Prep Cook', 'Server', 'Dishwasher', 'Supervisor', 
           'Manager', 'Dietitian', 'Receiving Clerk', 'Storeroom Clerk',
           'Tray Assembler', 'Cashier', 'Utility Worker'] 
  }).notNull(),
  
  hireDate: text('hire_date').notNull(),
  
  /** Wage rate for labor costing */
  hourlyRate: real('hourly_rate'),
  
  /** Food safety and other certifications held */
  certifications: text('certifications'),
  
  /** When certifications expire (for renewal tracking) */
  certificationExpiry: text('certification_expiry'),
  
  phone: text('phone'),
  
  email: text('email'),
  
  status: text('status', { 
    enum: ['Active', 'On Leave', 'Terminated'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_employees_tenant').on(table.tenantId),
  index('idx_employees_site_id').on(table.primarySiteId),
  index('idx_employees_status').on(table.status),
  index('idx_employees_job_title').on(table.jobTitle),
]);

// Type exports for use in application code
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

