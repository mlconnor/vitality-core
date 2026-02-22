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

// ============================================================================
// TABLE: order_guides
// 
// NOTE ON ORIGIN: The order guide concept is NOT described in the Payne-Palacio
// & Theis textbook. It comes from contemporary industry practice observed in
// distributor platforms (Sysco, US Foods) and foodservice management software
// (MealSuite, Grove Menus, etc.). In these systems, an order guide is a
// curated, vendor-specific catalog of products that a site regularly orders.
//
// An order guide represents the persistent, reusable "shopping list" for a
// specific site-vendor relationship. A site typically works with multiple
// distributors (e.g., Sysco for broadline, a local vendor for produce, a
// specialty vendor for bakery) and maintains a separate order guide for each.
// When placing a weekly order, the kitchen manager opens the relevant guide,
// reviews par levels and suggested quantities, adjusts as needed, and
// generates a purchase order.
//
// The vendor_id FK links to the vendors table, where distributors are
// represented with vendor_type = 'Broadline Distributor'. A single site may
// have multiple order guides — one per vendor relationship — supporting the
// common pattern of split purchasing across distributors.
//
// Relationship to other procurement tables:
//   - product_specifications: Internal quality standards (what quality we
//     expect). Order guide items may optionally reference a spec.
//   - site_ingredient_preferences: Quality resolution layer (which spec for
//     which site). Drives recipe costing; order guide adds vendor-specific
//     ordering details (SKU, contracted price, pack size).
//   - purchase_orders: Generated from order guide when an order is placed.
//     The order guide is the template; the PO is the transaction.
//
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const orderGuides = sqliteTable('order_guides', {
  /** Unique identifier for this order guide */
  orderGuideId: text('order_guide_id').primaryKey(),
  
  /** Owning tenant (required for data isolation) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** 
   * The site this order guide belongs to. Each physical location maintains
   * its own set of order guides reflecting local vendor relationships,
   * delivery schedules, and product preferences.
   */
  siteId: text('site_id').notNull().references(() => sites.siteId, { onDelete: 'cascade' }),
  
  /** 
   * The vendor/distributor this guide is for. Links to the vendors table
   * where distributors are tracked alongside all other supplier types.
   * A site will typically have one order guide per active vendor
   * relationship (e.g., one for Sysco, one for a local produce vendor).
   */
  vendorId: text('vendor_id').notNull().references(() => vendors.vendorId),
  
  /** 
   * Human-readable name for this order guide, typically reflecting the
   * vendor and optionally the ordering cadence or purpose.
   * Examples: "Sysco Weekly Order", "Farm Fresh Produce", "Bakery Standing Order"
   */
  guideName: text('guide_name').notNull(),
  
  /** Optional longer description of the guide's scope or purpose */
  description: text('description'),
  
  /** Date this order guide becomes active and orderable */
  effectiveDate: text('effective_date').notNull(),
  
  /** 
   * Date this order guide expires. NULL means the guide is current/ongoing
   * with no planned end date. Used when vendor contracts have defined terms.
   */
  endDate: text('end_date'),
  
  /** Lifecycle status of this order guide */
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Draft'] 
  }).notNull().default('Draft'),
  
  /** 
   * LLM-readable context for AI agent use. Aggregated with ancestor
   * llm_notes (tenant → site) to give agents full operational context
   * when helping with ordering decisions.
   */
  llmNotes: text('llm_notes'),
  
  /** Free-form notes for internal use */
  notes: text('notes'),
}, (table) => [
  index('idx_order_guides_tenant').on(table.tenantId),
  index('idx_order_guides_site').on(table.siteId),
  index('idx_order_guides_vendor').on(table.vendorId),
  index('idx_order_guides_status').on(table.status),
  index('idx_order_guides_site_vendor').on(table.siteId, table.vendorId),
]);

// ============================================================================
// TABLE: order_guide_items
// 
// NOTE ON ORIGIN: Like order_guides, this table is based on contemporary
// industry practice from distributor ordering platforms and foodservice
// management software, not the textbook.
//
// Each row represents a specific vendor product on an order guide — the
// actual SKU a kitchen manager sees when placing an order. This captures
// vendor-specific data that does not belong in the internal quality
// specification layer (product_specifications):
//   - Vendor item/SKU numbers (the distributor's own product code)
//   - Contracted or quoted pricing tied to a vendor + item + time period
//   - Site-specific par levels and suggested order quantities
//   - Compliance and dietary flags relevant to senior care / healthcare
//   - Substitute and replacement item tracking
//
// An order guide item may optionally link to:
//   - ingredients: Our internal generic ingredient (e.g., "chicken breast").
//     This connects vendor products back to recipes and inventory.
//   - product_specifications: Our internal quality spec. This connects
//     the vendor product to the quality standard it satisfies.
//
// These links are optional because some order guide items may not map to
// an internal ingredient (e.g., cleaning supplies, disposables) or may
// not have a formal spec written yet.
//
// Standing orders: Items like milk and bread that are automatically ordered
// on a recurring schedule (as described in the textbook as "standing order"
// purchasing) are flagged with is_standing_order = true and a fixed
// standing_order_qty, so they can be auto-included in generated POs.
// ============================================================================
export const orderGuideItems = sqliteTable('order_guide_items', {
  /** Unique identifier for this order guide line item */
  itemId: text('item_id').primaryKey(),
  
  /** 
   * The order guide this item belongs to. Cascade-deletes when the
   * parent guide is removed.
   */
  orderGuideId: text('order_guide_id').notNull().references(() => orderGuides.orderGuideId, { onDelete: 'cascade' }),
  
  /** 
   * Optional link to our internal ingredient. When set, connects this
   * vendor product to recipe usage, inventory tracking, and cost
   * analysis. NULL for non-food items (supplies, disposables, etc.)
   * that don't appear in recipes.
   */
  ingredientId: text('ingredient_id').references(() => ingredients.ingredientId),
  
  /** 
   * Optional link to our internal product specification. When set,
   * indicates which quality standard this vendor product satisfies.
   * Useful for verifying that ordered products meet the site's
   * quality requirements defined in product_specifications.
   */
  specId: text('spec_id').references(() => productSpecifications.specId),
  
  /** 
   * The vendor/distributor's own product code or SKU number.
   * This is the identifier used when placing orders through the
   * vendor's system (e.g., Sysco item number "1516236").
   * Must be unique within an order guide.
   */
  vendorItemNumber: text('vendor_item_number').notNull(),
  
  /** 
   * Full product name or description as it appears in the vendor's
   * catalog. Should be detailed enough for unambiguous identification.
   * Example: "Chicken Breast Boneless Skinless 4 oz IQF"
   */
  productDescription: text('product_description').notNull(),
  
  /** 
   * Brand or manufacturer name. Often a preferred or contracted brand.
   * Examples: "Tyson", "Sysco Classic", "House of Raeford"
   */
  brand: text('brand'),
  
  /** 
   * Broad commodity grouping for organizing the order guide into
   * logical sections, matching how distributors categorize products.
   */
  category: text('category', { 
    enum: ['Proteins', 'Dairy', 'Produce', 'Frozen', 'Dry Goods', 
           'Bakery', 'Beverages', 'Seafood', 'Deli', 
           'Paper/Disposables', 'Cleaning/Chemical', 'Supplies', 'Other'] 
  }),
  
  /** 
   * More specific grouping within the category for finer organization.
   * Free-text to allow vendor-specific taxonomy.
   * Examples: "Poultry > Chicken", "Dairy > Cheese > Shredded"
   */
  subcategory: text('subcategory'),
  
  /** 
   * How the product is packaged for sale. Describes the complete
   * shipping/ordering unit.
   * Examples: "4/5 lb bags", "6/#10 cans", "Case of 96/2 oz portions",
   *           "40 lb case", "1/2 gal container"
   */
  packSize: text('pack_size').notNull(),
  
  /** 
   * Unit of measure for ordering and pricing. References the shared
   * units_of_measure table (e.g., CS for case, LB for pound, EA for each).
   */
  unitOfMeasure: text('unit_of_measure').notNull().references(() => unitsOfMeasure.unitId),
  
  /** 
   * Current or contracted price per unit of measure. May reflect
   * negotiated pricing, group purchasing organization (GPO) rates,
   * or volume discount tiers. Updated when vendor pricing changes.
   */
  contractPrice: real('contract_price'),
  
  /** Date the current contract_price took effect (ISO 8601 date string) */
  priceEffectiveDate: text('price_effective_date'),
  
  /** 
   * Date the current contract_price expires. NULL means pricing is
   * open-ended or subject to market fluctuation.
   */
  priceEndDate: text('price_end_date'),
  
  /** 
   * Site-specific target stock level for this vendor product.
   * When inventory drops below par, the item should be included
   * in the next order. Expressed in the item's unit_of_measure.
   * Overrides the generic par_level on the ingredients table because
   * a site may stock the same ingredient from multiple vendors.
   */
  parLevel: real('par_level'),
  
  /** 
   * Default order quantity to pre-populate when generating a purchase
   * order from this guide. Kitchen managers adjust as needed based on
   * current inventory and upcoming menu requirements.
   */
  suggestedOrderQty: real('suggested_order_qty'),
  
  /** 
   * Comma-separated compliance and dietary suitability flags relevant
   * to senior care and healthcare foodservice. Used to filter order
   * guide items by dietary program requirements.
   * Examples: "gluten-free,low-sodium,IDDSI-7,kosher,halal"
   */
  complianceFlags: text('compliance_flags'),
  
  /** 
   * Comma-separated allergen codes identifying allergens present in
   * this product. Uses the same allergen code format as the
   * ingredients.allergen_flags field (e.g., "ALG-MILK,ALG-EGG,ALG-SOY").
   */
  allergenFlags: text('allergen_flags'),
  
  /** 
   * Self-referencing FK to another item on any order guide that can
   * serve as a substitute when this item is unavailable or when a
   * lower-cost alternative is desired. Supports the common distributor
   * practice of suggesting compliant swaps.
   */
  substituteItemId: text('substitute_item_id').references(() => orderGuideItems.itemId),
  
  /** 
   * Whether this item is on a standing (automatic recurring) order.
   * Standing orders are common for daily-delivery staples like milk
   * and bread, as described in the textbook's purchasing methods.
   * When true, this item is auto-included in generated POs at the
   * standing_order_qty.
   */
  isStandingOrder: integer('is_standing_order', { mode: 'boolean' }).default(false),
  
  /** 
   * Fixed quantity for standing orders. Only meaningful when
   * is_standing_order = true. Represents the recurring quantity
   * delivered on each scheduled delivery.
   */
  standingOrderQty: real('standing_order_qty'),
  
  /** 
   * Number of business days between placing an order and expected
   * delivery for this specific item. May differ from the vendor-level
   * delivery_lead_time_days for special-order or long-lead items.
   */
  leadTimeDays: integer('lead_time_days'),
  
  /** 
   * Whether this item qualifies for group purchasing organization (GPO)
   * rebates or volume discount programs. Helps buyers prioritize
   * contracted items for cost savings.
   */
  isRebateEligible: integer('is_rebate_eligible', { mode: 'boolean' }).default(false),
  
  /** 
   * Whether the vendor has discontinued this product. Discontinued
   * items remain on the guide for historical reference and to prompt
   * the buyer to select a replacement.
   */
  isDiscontinued: integer('is_discontinued', { mode: 'boolean' }).default(false),
  
  /** 
   * Self-referencing FK to the item that replaces this one if it has
   * been discontinued. Enables automatic swap suggestions when
   * generating POs from guides with discontinued items.
   */
  replacementItemId: text('replacement_item_id').references(() => orderGuideItems.itemId),
  
  /** 
   * URL to a product photo or thumbnail. Used in digital order guide
   * views for quick visual identification of products.
   */
  imageUrl: text('image_url'),
  
  /** 
   * Display position within the order guide. Lower numbers appear first.
   * Allows custom sorting beyond the default category grouping,
   * reflecting the buyer's preferred ordering workflow.
   */
  sortOrder: integer('sort_order').default(0),
  
  /** Lifecycle status of this line item */
  status: text('status', { 
    enum: ['Active', 'Inactive', 'Discontinued'] 
  }).notNull().default('Active'),
  
  /** 
   * Site-specific or buyer-specific notes for this item.
   * Examples: "Approved for puree diets", "Use only for heart-healthy menu",
   *           "Seasonal — available Sept through March"
   */
  customNotes: text('custom_notes'),
}, (table) => [
  index('idx_og_items_guide').on(table.orderGuideId),
  index('idx_og_items_ingredient').on(table.ingredientId),
  index('idx_og_items_spec').on(table.specId),
  index('idx_og_items_vendor_item').on(table.vendorItemNumber),
  index('idx_og_items_category').on(table.category),
  index('idx_og_items_status').on(table.status),
  index('idx_og_items_discontinued').on(table.isDiscontinued),
  index('idx_og_items_standing').on(table.isStandingOrder),
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
export type OrderGuide = typeof orderGuides.$inferSelect;
export type NewOrderGuide = typeof orderGuides.$inferInsert;
export type OrderGuideItem = typeof orderGuideItems.$inferSelect;
export type NewOrderGuideItem = typeof orderGuideItems.$inferInsert;

