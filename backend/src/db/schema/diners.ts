/**
 * Diner/Customer Tables Schema
 * 
 * Manages individuals being served, particularly important in healthcare
 * settings with individualized dietary requirements. The textbook describes
 * the complexity of "rapidly changing and increasingly complicated diet orders"
 * in healthcare foodservice.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants, sites } from './tenants';
import { mealPeriods, dietTypes, menuItems } from './menu';
import { recipes } from './recipes';

// ============================================================================
// TABLE: diners
// 
// Represents individuals being fed (patients, students, residents, staff).
//
// Texture Modifications: For patients with swallowing difficulties (dysphagia):
//   - Regular: Normal textures
//   - Mechanical Soft: "Soft, moist foods requiring minimal chewing"
//   - Pureed: "All foods pureed to smooth consistency"
//   - Ground: Ground meats, soft vegetables
//
// Liquid Consistency: For aspiration prevention:
//   - Regular: Normal thin liquids
//   - Thickened (Nectar/Honey): Thickened for safety
//   - NPO: Nothing by mouth (medical status)
//
// The free_reduced_status field supports National School Lunch Program
// compliance for school foodservice operations.
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const diners = sqliteTable('diners', {
  /** Unique identifier */
  dinerId: text('diner_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  firstName: text('first_name').notNull(),
  
  lastName: text('last_name').notNull(),
  
  /** Location (hospital, school, etc.) */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  /** Room/bed for delivery (healthcare) */
  roomNumber: text('room_number'),
  
  /** Type of customer */
  dinerType: text('diner_type', { 
    enum: ['Patient', 'Student', 'Resident', 'Staff', 'Visitor'] 
  }).notNull(),
  
  /** When admitted/enrolled */
  admissionDate: text('admission_date'),
  
  /** Expected departure (healthcare) */
  expectedDischargeDate: text('expected_discharge_date'),
  
  /** Current diet order */
  primaryDietTypeId: text('primary_diet_type_id').notNull().references(() => dietTypes.dietTypeId),
  
  /** Texture requirement for dysphagia */
  textureModification: text('texture_modification', { 
    enum: ['Regular', 'Mechanical Soft', 'Pureed', 'Ground'] 
  }),
  
  /** Liquid thickness requirement */
  liquidConsistency: text('liquid_consistency', { 
    enum: ['Regular', 'Thickened-Nectar', 'Thickened-Honey', 'NPO'] 
  }),
  
  /** Known food allergies */
  allergies: text('allergies'),
  
  /** Food dislikes/preferences to avoid */
  dislikes: text('dislikes'),
  
  /** Food preferences to accommodate */
  preferences: text('preferences'),
  
  /** Special feeding instructions */
  specialInstructions: text('special_instructions'),
  
  /** Level of assistance needed */
  feedingAssistance: text('feeding_assistance', { 
    enum: ['Independent', 'Setup', 'Feeding Assist', 'Tube Fed'] 
  }),
  
  /** Meal card/account number */
  mealTicketNumber: text('meal_ticket_number'),
  
  /** School nutrition program status */
  freeReducedStatus: text('free_reduced_status', { 
    enum: ['Paid', 'Free', 'Reduced'] 
  }),
  
  /** Ordering physician (healthcare) */
  physician: text('physician'),
  
  status: text('status', { 
    enum: ['Active', 'Discharged', 'On Leave'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation: operates within Tenant → Site context.
   * Include: personality traits, communication preferences,
   * family involvement notes, feeding assistance details,
   * historical preferences patterns.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_diners_tenant').on(table.tenantId),
  index('idx_diners_site').on(table.siteId),
  index('idx_diners_diet').on(table.primaryDietTypeId),
  index('idx_diners_status').on(table.status),
  index('idx_diners_type').on(table.dinerType),
]);

// ============================================================================
// TABLE: diet_assignments
// 
// Tracks diet order changes over time, creating an audit trail of dietary
// modifications. Important for healthcare compliance and medical record-keeping.
// Maintains history because diet orders change frequently during patient stays.
// ============================================================================
export const dietAssignments = sqliteTable('diet_assignments', {
  /** Unique identifier */
  assignmentId: text('assignment_id').primaryKey(),
  
  /** Reference to diner */
  dinerId: text('diner_id').notNull().references(() => diners.dinerId, { onDelete: 'cascade' }),
  
  /** Assigned diet */
  dietTypeId: text('diet_type_id').notNull().references(() => dietTypes.dietTypeId),
  
  /** When diet order takes effect */
  effectiveDate: text('effective_date').notNull(),
  
  /** When diet order ends (NULL if current) */
  endDate: text('end_date'),
  
  /** Physician or authority ordering */
  orderedBy: text('ordered_by').notNull(),
  
  /** Reason for diet order/change */
  reason: text('reason'),
  
  textureModification: text('texture_modification', { 
    enum: ['Regular', 'Mechanical Soft', 'Pureed', 'Ground'] 
  }),
  
  liquidConsistency: text('liquid_consistency', { 
    enum: ['Regular', 'Thickened-Nectar', 'Thickened-Honey', 'NPO'] 
  }),
  
  /** Additional dietary restrictions beyond base diet */
  additionalRestrictions: text('additional_restrictions'),
  
  /** Record creation date */
  createdDate: text('created_date').notNull(),
  
  /** Who entered the order */
  createdBy: text('created_by').notNull(),
  
  notes: text('notes'),
}, (table) => [
  index('idx_diet_assignments_diner').on(table.dinerId),
  index('idx_diet_assignments_diet').on(table.dietTypeId),
  index('idx_diet_assignments_dates').on(table.effectiveDate, table.endDate),
]);

// ============================================================================
// TABLE: meal_orders
// 
// Individual meal orders/selections placed by or for diners. The textbook
// describes: "Many hospitals today are converting their patient tray service
// to hotel-style room service. This is in response to patient demand to eat
// what they want, when they want it."
//
// The tray_ticket_number supports trayline assembly where individual meal
// trays are assembled and tracked for delivery.
// ============================================================================
export const mealOrders = sqliteTable('meal_orders', {
  /** Unique identifier */
  orderId: text('order_id').primaryKey(),
  
  /** Who the order is for */
  dinerId: text('diner_id').notNull().references(() => diners.dinerId),
  
  /** Date of the meal */
  orderDate: text('order_date').notNull(),
  
  /** Which meal (breakfast, lunch, etc.) */
  mealPeriodId: text('meal_period_id').notNull().references(() => mealPeriods.mealPeriodId),
  
  /** Selected menu item (if from menu) */
  menuItemId: text('menu_item_id').references(() => menuItems.menuItemId),
  
  /** Direct recipe reference (if off-menu request) */
  recipeId: text('recipe_id').references(() => recipes.recipeId),
  
  /** Number of portions (usually 1) */
  quantity: integer('quantity').notNull().default(1),
  
  /** Modified portion if different from standard */
  portionSizeOverride: text('portion_size_override'),
  
  /** Diet type for this order */
  dietTypeId: text('diet_type_id').notNull().references(() => dietTypes.dietTypeId),
  
  /** Special modifications requested */
  modifications: text('modifications'),
  
  /** Where to deliver (room, table, etc.) */
  deliveryLocation: text('delivery_location'),
  
  /** Requested delivery time */
  deliveryTime: text('delivery_time'),
  
  status: text('status', { 
    enum: ['Ordered', 'In Production', 'Delivered', 'Cancelled'] 
  }).notNull().default('Ordered'),
  
  /** Tray identification for trayline assembly */
  trayTicketNumber: text('tray_ticket_number'),
  
  /** Who recorded the order */
  orderTakenBy: text('order_taken_by'),
  
  /** When order was placed (ISO datetime) */
  orderTimestamp: text('order_timestamp').notNull(),
  
  notes: text('notes'),
}, (table) => [
  index('idx_meal_orders_diner').on(table.dinerId),
  index('idx_meal_orders_date').on(table.orderDate),
  index('idx_meal_orders_meal_period').on(table.mealPeriodId),
  index('idx_meal_orders_status').on(table.status),
]);

// Type exports for use in application code
export type Diner = typeof diners.$inferSelect;
export type NewDiner = typeof diners.$inferInsert;
export type DietAssignment = typeof dietAssignments.$inferSelect;
export type NewDietAssignment = typeof dietAssignments.$inferInsert;
export type MealOrder = typeof mealOrders.$inferSelect;
export type NewMealOrder = typeof mealOrders.$inferInsert;

