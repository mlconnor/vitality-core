/**
 * Inventory Tables Schema
 * 
 * Implements inventory control as described in Chapter 7 of the textbook.
 * The textbook describes two types of inventory:
 *   - Perpetual Inventory: "A running record of the balance on hand for each
 *     item in the storeroom"
 *   - Physical Inventory: "An actual count of items in all storage areas...
 *     taken periodically"
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { tenants, sites, employees } from './tenants';
import { ingredients } from './recipes';
import { purchaseOrders, vendors } from './procurement';
import { unitsOfMeasure } from './reference';

// Forward reference for production_schedules - defined in production.ts
// The FK will be connected via migration or application logic

// ============================================================================
// TABLE: receiving
// 
// Documents receipt of deliveries. The textbook describes the receiving
// process as five key steps:
//   1. Physically inspect the delivery and check against purchase order
//   2. Inspect the delivery against the invoice
//   3. Accept only if all quantities and quality specifications are met
//   4. Complete receiving records
//   5. Transfer goods to appropriate storage
//
// Receiving Methods (from textbook):
//   - Invoice Method: "The receiving clerk checks delivered items against
//     the original purchase order and notes any deviations" - efficient
//     but requires careful evaluation
//   - Blind Method: "Quantities have been erased... clerk must quantify
//     each item by weighing, measuring, or counting" - more accurate
//     but labor-intensive
//
// Temperature checks are critical: "Check temperatures of refrigerated
// items on arrival"
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const receiving = sqliteTable('receiving', {
  /** Unique identifier */
  receivingId: text('receiving_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Related purchase order (optional for non-PO deliveries) */
  poNumber: text('po_number').references(() => purchaseOrders.poNumber),
  
  /** Delivering vendor */
  vendorId: text('vendor_id').notNull().references(() => vendors.vendorId),
  
  /** Receiving location */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  /** Date of delivery */
  deliveryDate: text('delivery_date').notNull(),
  
  /** Time of delivery */
  deliveryTime: text('delivery_time').notNull(),
  
  /** Vendor invoice number */
  invoiceNumber: text('invoice_number').notNull(),
  
  /** Invoice total */
  invoiceAmount: real('invoice_amount'),
  
  /** Employee who received (FK to employees) */
  receivedBy: text('received_by').notNull().references(() => employees.employeeId),
  
  /** Which verification method was used */
  receivingMethod: text('receiving_method', { 
    enum: ['Invoice Method', 'Blind Method'] 
  }).notNull(),
  
  /** 1 if temps OK */
  temperatureCheckPassed: integer('temperature_check_passed', { mode: 'boolean' }).notNull(),
  
  /** Logged refrigerated product temperature */
  refrigeratedTempF: real('refrigerated_temp_f'),
  
  /** Logged frozen product temperature */
  frozenTempF: real('frozen_temp_f'),
  
  /** 1 if quality OK */
  qualityAcceptable: integer('quality_acceptable', { mode: 'boolean' }).notNull(),
  
  /** Description of any discrepancies found */
  discrepancies: text('discrepancies'),
  
  /** Action taken for discrepancies */
  discrepancyAction: text('discrepancy_action', { 
    enum: ['Accepted', 'Rejected', 'Credit Requested', 'Returned'] 
  }),
  
  /** Credit memo if issued */
  creditMemoNumber: text('credit_memo_number'),
  
  /** When moved to storage */
  transferredToStorageTime: text('transferred_to_storage_time'),
  
  status: text('status', { 
    enum: ['Received', 'Pending Review', 'Disputed'] 
  }).notNull().default('Received'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_receiving_tenant').on(table.tenantId),
  index('idx_receiving_po').on(table.poNumber),
  index('idx_receiving_vendor').on(table.vendorId),
  index('idx_receiving_site').on(table.siteId),
  index('idx_receiving_date').on(table.deliveryDate),
  index('idx_receiving_status').on(table.status),
]);

// ============================================================================
// TABLE: inventory
// 
// Current inventory levels by storage location. Maintains the perpetual
// inventory with fields for reconciling against physical counts.
//
// The textbook states: "Perpetual inventory provides a continuing record
// of food and supplies purchased, in storage, and used. Items received are
// recorded from the invoices... Storeroom issues are recorded from the
// requisitions and subtracted from the balance."
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const inventory = sqliteTable('inventory', {
  /** Unique identifier */
  inventoryId: text('inventory_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** What is being stored */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Storage location */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  /** Type of storage */
  storageLocation: text('storage_location', { 
    enum: ['Dry Storage', 'Walk-in Cooler', 'Walk-in Freezer', 
           'Reach-in Cooler', 'Reach-in Freezer'] 
  }).notNull(),
  
  /** Specific bin/shelf location */
  binLocation: text('bin_location'),
  
  /** Current quantity (perpetual inventory) */
  quantityOnHand: real('quantity_on_hand').notNull(),
  
  /** Unit of measurement */
  unitOfMeasure: text('unit_of_measure').notNull().references(() => unitsOfMeasure.unitId),
  
  /** Cost per unit */
  unitCost: real('unit_cost'),
  
  /** Total value (qty × cost) */
  totalValue: real('total_value'),
  
  /** Last receipt date */
  lastReceivedDate: text('last_received_date'),
  
  /** Product expiration */
  expirationDate: text('expiration_date'),
  
  /** Lot/batch tracking for recalls */
  lotNumber: text('lot_number'),
  
  /** Last physical inventory date */
  lastPhysicalCountDate: text('last_physical_count_date'),
  
  /** Quantity at last physical count */
  lastPhysicalCountQty: real('last_physical_count_qty'),
  
  /** Difference between perpetual and physical */
  varianceFromPerpetual: real('variance_from_perpetual'),
  
  /** 1 if below par level */
  belowParFlag: integer('below_par_flag', { mode: 'boolean' }).default(false),
  
  notes: text('notes'),
}, (table) => [
  index('idx_inventory_tenant').on(table.tenantId),
  index('idx_inventory_ingredient').on(table.ingredientId),
  index('idx_inventory_site').on(table.siteId),
  index('idx_inventory_location').on(table.storageLocation),
  index('idx_inventory_expiration').on(table.expirationDate),
  index('idx_inventory_below_par').on(table.belowParFlag),
]);

// ============================================================================
// TABLE: storeroom_issues
// 
// Tracks items issued from storeroom to production (requisitions). The
// textbook describes: "Items received are recorded from the invoices...
// Storeroom issues are recorded from the requisitions and subtracted from
// the balance."
//
// Enables tracking of ingredient usage for cost analysis and links to
// production schedules for centralized ingredient assembly: "Centralized
// ingredient assembly where accuracy in weights and measures is essential."
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const storeroomIssues = sqliteTable('storeroom_issues', {
  /** Unique identifier */
  issueId: text('issue_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Requisition document number */
  requisitionNumber: text('requisition_number').notNull(),
  
  /** Date of issue */
  issueDate: text('issue_date').notNull(),
  
  /** What was issued */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Issuing storeroom */
  fromSiteId: text('from_site_id').notNull().references(() => sites.siteId),
  
  /** Receiving location (if inter-site transfer) */
  toSiteId: text('to_site_id').references(() => sites.siteId),
  
  /** Quantity issued */
  quantityIssued: real('quantity_issued').notNull(),
  
  /** Unit */
  unitOfMeasure: text('unit_of_measure').notNull().references(() => unitsOfMeasure.unitId),
  
  /** Cost per unit */
  unitCost: real('unit_cost'),
  
  /** Total cost of issue */
  extendedCost: real('extended_cost'),
  
  /** Employee who issued (FK to employees) */
  issuedBy: text('issued_by').notNull().references(() => employees.employeeId),
  
  /** Employee who received */
  receivedBy: text('received_by'),
  
  /** Related production schedule (if applicable) - FK to production_schedules */
  productionScheduleId: text('production_schedule_id'),
  
  /** Date items are being used for */
  mealDate: text('meal_date'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_issues_tenant').on(table.tenantId),
  index('idx_issues_ingredient').on(table.ingredientId),
  index('idx_issues_from_site').on(table.fromSiteId),
  index('idx_issues_date').on(table.issueDate),
  index('idx_issues_schedule').on(table.productionScheduleId),
]);

// Type exports for use in application code
export type Receiving = typeof receiving.$inferSelect;
export type NewReceiving = typeof receiving.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type StoreroomIssue = typeof storeroomIssues.$inferSelect;
export type NewStoreroomIssue = typeof storeroomIssues.$inferInsert;

