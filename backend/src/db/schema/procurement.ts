/**
 * Procurement Tables Schema
 * 
 * Implements purchasing functions described in Chapter 6 of the textbook.
 * The textbook emphasizes: "Determine standards of quality for each food item
 * and write specifications." Good purchasing practices include systematic
 * ordering schedules, adequate flow of goods, and systematic receiving
 * procedures with inventory control.
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { tenants, sites } from './tenants';
import { ingredients } from './recipes';
import { unitsOfMeasure } from './reference';

// ============================================================================
// TABLE: vendors
// 
// Supplier/vendor master list for procurement. Vendor types include:
//   - Broadline Distributor: Full-service distributors (Sysco, US Foods)
//   - Specialty vendors: Category-specific suppliers
//
// The textbook emphasizes vendor evaluation: "Discrepancies must be noted...
// this collective information will be of value when the foodservice begins
// to prepare for the next bid period."
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const vendors = sqliteTable('vendors', {
  /** Unique identifier */
  vendorId: text('vendor_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Company name */
  vendorName: text('vendor_name').notNull(),
  
  /** Type of vendor */
  vendorType: text('vendor_type', { 
    enum: ['Broadline Distributor', 'Produce', 'Dairy', 'Meat', 'Bakery', 
           'Seafood', 'Specialty', 'Beverage', 'Paper/Disposables', 'Equipment'] 
  }).notNull(),
  
  /** Primary contact person */
  contactName: text('contact_name'),
  
  /** Contact phone */
  phone: text('phone').notNull(),
  
  /** Contact email */
  email: text('email'),
  
  /** Street address */
  address: text('address'),
  
  city: text('city'),
  
  state: text('state'),
  
  zip: text('zip'),
  
  /** Days vendor delivers (e.g., 'Mon, Wed, Fri') */
  deliveryDays: text('delivery_days'),
  
  /** Order lead time required */
  deliveryLeadTimeDays: integer('delivery_lead_time_days'),
  
  /** Minimum order amount */
  minimumOrder: real('minimum_order'),
  
  /** Payment terms (e.g., 'Net 30') */
  paymentTerms: text('payment_terms'),
  
  /** Customer account number with vendor */
  accountNumber: text('account_number'),
  
  /** Contract period start */
  contractStartDate: text('contract_start_date'),
  
  /** Contract period end */
  contractEndDate: text('contract_end_date'),
  
  /** 1-5 rating */
  performanceRating: real('performance_rating'),
  
  /** 1 if insurance docs on file */
  insuranceOnFile: integer('insurance_on_file', { mode: 'boolean' }).default(false),
  
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Suspended', 'Prospective'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_vendors_tenant').on(table.tenantId),
  index('idx_vendors_type').on(table.vendorType),
  index('idx_vendors_status').on(table.status),
]);

// ============================================================================
// TABLE: product_specifications
// 
// Detailed specifications for products to be purchased. Specifications ensure
// consistent quality across vendors and orders, support formal competitive
// bid purchasing, and enable receiving clerks to verify deliveries against
// defined standards.
// 
// OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
// ============================================================================
export const productSpecifications = sqliteTable('product_specifications', {
  /** Unique identifier */
  specId: text('spec_id').primaryKey(),
  
  /** NULL = system-wide, value = tenant-specific */
  tenantId: text('tenant_id').references(() => tenants.tenantId),
  
  /** Link to ingredient this spec is for */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Specification name */
  specName: text('spec_name').notNull(),
  
  /** Detailed description */
  productDescription: text('product_description').notNull(),
  
  /** Acceptable brands (or 'Brand X or equal') */
  brandAcceptable: text('brand_acceptable'),
  
  /** Required USDA grade (e.g., 'Choice', 'Grade A') */
  usdaGrade: text('usda_grade'),
  
  /** Form of product */
  marketForm: text('market_form', { 
    enum: ['Fresh', 'Frozen', 'Canned', 'Dried', 'Prepared'] 
  }).notNull(),
  
  /** Size/count specification */
  sizeCount: text('size_count'),
  
  /** Package size (e.g., '6/#10 cans', '40 lb case') */
  packSize: text('pack_size').notNull(),
  
  /** Individual unit weight */
  unitWeight: text('unit_weight'),
  
  /** Geographic origin requirements */
  origin: text('origin'),
  
  /** Processing specifications */
  processingRequirements: text('processing_requirements'),
  
  /** Quality markers to check on receipt */
  qualityIndicators: text('quality_indicators'),
  
  /** Temperature specifications for delivery */
  temperatureRequirements: text('temperature_requirements'),
  
  /** Expected price for budgeting */
  estimatedPrice: real('estimated_price'),
  
  /** When spec takes effect */
  effectiveDate: text('effective_date').notNull(),
  
  /** Who wrote the specification */
  createdBy: text('created_by'),
  
  /** 
   * 1 if this is the global default spec for this ingredient.
   * Used as fallback when no segment or site preference exists.
   */
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Under Review'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_product_specs_tenant').on(table.tenantId),
  index('idx_product_specs_ingredient').on(table.ingredientId),
  index('idx_product_specs_status').on(table.status),
  index('idx_product_specs_default').on(table.isDefault),
]);

// ============================================================================
// TABLE: segment_ingredient_defaults
// 
// Defines default product specifications by market segment. This implements
// the textbook principle that different segments have different purchasing
// patterns and quality requirements:
//   - Schools use USDA commodity foods and have tight budgets
//   - Hospitals require higher quality for patient satisfaction
//   - Long-term care facilities balance quality with Medicare constraints
//
// Resolution order for ingredient → specification:
//   1. site_ingredient_preferences (site-specific override)
//   2. segment_ingredient_defaults (segment default - this table)
//   3. product_specifications.is_default = true (global fallback)
//
// UNIVERSAL (no tenant_id): Shared defaults across all tenants in a segment
// ============================================================================
export const segmentIngredientDefaults = sqliteTable('segment_ingredient_defaults', {
  /** Unique identifier */
  defaultId: text('default_id').primaryKey(),
  
  /** Market segment this default applies to */
  segment: text('segment', { 
    enum: ['Healthcare', 'K-12 School', 'College/University', 
           'Business/Industrial', 'Correctional', 'Military',
           'Long-term Care', 'Commercial', 'Other'] 
  }).notNull(),
  
  /** The generic ingredient */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Default specification for this segment */
  specId: text('spec_id').notNull().references(() => productSpecifications.specId),
  
  /** 1 if this is a USDA commodity item (primarily for schools) */
  isUsdaCommodity: integer('is_usda_commodity', { mode: 'boolean' }).default(false),
  
  /** Priority when multiple defaults exist for same segment+ingredient */
  priority: integer('priority').notNull().default(0),
  
  /** LLM-friendly explanation of why this spec is the segment default */
  rationale: text('rationale'),
  
  /** Effective date for this default */
  effectiveDate: text('effective_date').notNull(),
  
  /** End date (NULL = current/ongoing) */
  endDate: text('end_date'),
  
  status: text('status', { 
    enum: ['Active', 'Inactive'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_segment_defaults_segment').on(table.segment),
  index('idx_segment_defaults_ingredient').on(table.ingredientId),
  index('idx_segment_defaults_spec').on(table.specId),
  index('idx_segment_defaults_dates').on(table.effectiveDate, table.endDate),
  index('idx_segment_defaults_status').on(table.status),
]);

// ============================================================================
// TABLE: site_ingredient_preferences
// 
// Maps ingredients to preferred product specifications at the site level.
// This implements the textbook principle that "quality is determined at a
// central point and is uniform throughout the system." Recipes remain
// abstract (using generic ingredients), while this table resolves the
// specific quality/grade/specification at purchasing time.
//
// Example: A hospital site prefers "Grade A Fresh Chicken Breast" while
// a school site prefers "Choice Frozen IQF Chicken" - same ingredient,
// different specifications based on organizational policy.
//
// Benefits:
//   - One recipe serves multiple segments (hospital, school, etc.)
//   - Quality decisions centralized at site/organization level
//   - Easy to update specifications without touching recipes
//   - Supports costing at actual purchased quality level
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const siteIngredientPreferences = sqliteTable('site_ingredient_preferences', {
  /** Unique identifier */
  preferenceId: text('preference_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Site this preference applies to */
  siteId: text('site_id').notNull().references(() => sites.siteId, { onDelete: 'cascade' }),
  
  /** The generic ingredient */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Preferred specification for this site */
  specId: text('spec_id').notNull().references(() => productSpecifications.specId),
  
  /** Preferred vendor for this ingredient at this site */
  preferredVendorId: text('preferred_vendor_id').references(() => vendors.vendorId),
  
  /** Priority when multiple preferences exist (higher = preferred) */
  priority: integer('priority').notNull().default(0),
  
  /** Effective date for this preference */
  effectiveDate: text('effective_date').notNull(),
  
  /** End date (NULL = current/ongoing) */
  endDate: text('end_date'),
  
  /** LLM-friendly description of why this spec is preferred */
  rationale: text('rationale'),
  
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Pending Approval'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_site_ingredient_prefs_tenant').on(table.tenantId),
  index('idx_site_ingredient_prefs_site').on(table.siteId),
  index('idx_site_ingredient_prefs_ingredient').on(table.ingredientId),
  index('idx_site_ingredient_prefs_spec').on(table.specId),
  index('idx_site_ingredient_prefs_vendor').on(table.preferredVendorId),
  index('idx_site_ingredient_prefs_dates').on(table.effectiveDate, table.endDate),
  index('idx_site_ingredient_prefs_status').on(table.status),
]);

// ============================================================================
// TABLE: purchase_orders
// 
// Header information for purchase orders. Tracks the complete lifecycle from
// draft through submission, confirmation, and receipt.
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const purchaseOrders = sqliteTable('purchase_orders', {
  /** Purchase order number */
  poNumber: text('po_number').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Vendor being ordered from */
  vendorId: text('vendor_id').notNull().references(() => vendors.vendorId),
  
  /** Delivery location */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  /** Date order placed */
  orderDate: text('order_date').notNull(),
  
  /** Requested delivery date */
  requestedDeliveryDate: text('requested_delivery_date').notNull(),
  
  /** Actual delivery (filled on receipt) */
  actualDeliveryDate: text('actual_delivery_date'),
  
  /** Who placed the order */
  orderedBy: text('ordered_by').notNull(),
  
  /** Order subtotal */
  subtotal: real('subtotal'),
  
  /** Tax amount */
  tax: real('tax'),
  
  /** Shipping charges */
  shipping: real('shipping'),
  
  /** Order total */
  total: real('total'),
  
  /** Payment terms */
  paymentTerms: text('payment_terms'),
  
  status: text('status', { 
    enum: ['Draft', 'Submitted', 'Confirmed', 'Partial', 'Received', 'Cancelled'] 
  }).notNull().default('Draft'),
  
  /** Special delivery instructions */
  deliveryInstructions: text('delivery_instructions'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_po_tenant').on(table.tenantId),
  index('idx_po_vendor').on(table.vendorId),
  index('idx_po_site').on(table.siteId),
  index('idx_po_dates').on(table.orderDate, table.requestedDeliveryDate),
  index('idx_po_status').on(table.status),
]);

// ============================================================================
// TABLE: po_line_items
// 
// Individual line items on purchase orders. Tracks both ordered and received
// quantities to identify discrepancies for vendor follow-up.
// ============================================================================
export const poLineItems = sqliteTable('po_line_items', {
  /** Unique identifier */
  lineItemId: text('line_item_id').primaryKey(),
  
  /** Reference to PO header */
  poNumber: text('po_number').notNull().references(() => purchaseOrders.poNumber, { onDelete: 'cascade' }),
  
  /** What is being ordered */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Product specification (optional) */
  specId: text('spec_id').references(() => productSpecifications.specId),
  
  /** Quantity ordered */
  quantityOrdered: real('quantity_ordered').notNull(),
  
  /** Unit of order */
  unitOfMeasure: text('unit_of_measure').notNull().references(() => unitsOfMeasure.unitId),
  
  /** Price per unit */
  unitPrice: real('unit_price').notNull(),
  
  /** Line total (qty × price) */
  extendedPrice: real('extended_price').notNull(),
  
  /** Quantity actually received (filled at receiving) */
  quantityReceived: real('quantity_received'),
  
  /** Difference between ordered and received */
  variance: real('variance'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_po_line_items_po').on(table.poNumber),
  index('idx_po_line_items_ingredient').on(table.ingredientId),
]);

// Type exports for use in application code
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type ProductSpecification = typeof productSpecifications.$inferSelect;
export type NewProductSpecification = typeof productSpecifications.$inferInsert;
export type SegmentIngredientDefault = typeof segmentIngredientDefaults.$inferSelect;
export type NewSegmentIngredientDefault = typeof segmentIngredientDefaults.$inferInsert;
export type SiteIngredientPreference = typeof siteIngredientPreferences.$inferSelect;
export type NewSiteIngredientPreference = typeof siteIngredientPreferences.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PoLineItem = typeof poLineItems.$inferSelect;
export type NewPoLineItem = typeof poLineItems.$inferInsert;

