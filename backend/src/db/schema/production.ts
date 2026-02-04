/**
 * Production Tables Schema
 * 
 * Implements production planning and scheduling from Chapter 8.
 * The textbook states: "Production planning and scheduling are vital to the
 * production of high-quality food and are important management responsibilities."
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { tenants, sites, stations, employees } from './tenants';
import { mealPeriods, menuItems, singleUseMenuItems } from './menu';
import { recipes } from './recipes';

// ============================================================================
// TABLE: production_schedules
// 
// Daily/shift production schedules that communicate work to production staff.
// The textbook states: "A production schedule is a detailed document used to
// communicate with/to the production staff the work that needs to be done for
// a specific period of time."
//
// Production schedules are the "rendered" output of the menu system:
//   - Generated from cycle_menus (recurring patterns)
//   - Overridden/supplemented by single_use_menus (holidays, events)
//   - Quantities adjusted based on forecasting
//
// Menu Source Linkage:
//   - cycleMenuItemId: Set when this production item was generated from a cycle menu
//   - singleUseMenuItemId: Set when this production item came from a single-use menu
//   - Both NULL: Manually created production item (ad-hoc)
//   - Only ONE should be set (enforced at application level)
//
// Production schedules should include (from textbook):
//   - Name of menu items to be prepared
//   - Quantities to prepare (number of portions, number of pans)
//   - Recipes to be followed (or recipe code)
//   - Specific instructions
//   - Standard portion sizes and variations for modified diets
//   - Target completion times
//
// The HACCP logging fields support food safety documentation.
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const productionSchedules = sqliteTable('production_schedules', {
  /** Unique identifier */
  scheduleId: text('schedule_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Date of production */
  productionDate: text('production_date').notNull(),
  
  /** Production location */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  shift: text('shift', { 
    enum: ['AM', 'PM', 'Night', 'All Day'] 
  }).notNull(),
  
  /** Target meal period */
  mealPeriodId: text('meal_period_id').notNull().references(() => mealPeriods.mealPeriodId),
  
  /** Recipe to produce */
  recipeId: text('recipe_id').notNull().references(() => recipes.recipeId),
  
  /** 
   * Source linkage: cycle menu item that generated this production record.
   * NULL if from single-use menu or manually created.
   */
  cycleMenuItemId: text('cycle_menu_item_id').references(() => menuItems.menuItemId),
  
  /** 
   * Source linkage: single-use menu item that generated this production record.
   * NULL if from cycle menu or manually created.
   */
  singleUseMenuItemId: text('single_use_menu_item_id').references(() => singleUseMenuItems.itemId),
  
  /** Predicted portions needed (from forecast) */
  forecastedPortions: integer('forecasted_portions').notNull(),
  
  /** Recipe scaling factor */
  batchMultiplier: real('batch_multiplier'),
  
  /** Actual output (filled after production) */
  actualPortionsProduced: integer('actual_portions_produced'),
  
  /** Assigned cook/preparer */
  assignedEmployeeId: text('assigned_employee_id').references(() => employees.employeeId),
  
  /** Target start time */
  startTimeTarget: text('start_time_target'),
  
  /** Target completion time */
  completionTimeTarget: text('completion_time_target').notNull(),
  
  /** Actual start (filled during production) */
  actualStartTime: text('actual_start_time'),
  
  /** Actual completion time */
  actualCompletionTime: text('actual_completion_time'),
  
  /** Production station */
  stationId: text('station_id').references(() => stations.stationId),
  
  /** Required equipment */
  equipmentNeeded: text('equipment_needed'),
  
  /** Special instructions */
  prepInstructions: text('prep_instructions'),
  
  /** HACCP temperature log */
  haccpTempLogged: real('haccp_temp_logged'),
  
  /** HACCP time log */
  haccpTimeLogged: text('haccp_time_logged'),
  
  /** Quality verification */
  qualityCheckPassed: integer('quality_check_passed', { mode: 'boolean' }),
  
  status: text('status', { 
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'] 
  }).notNull().default('Scheduled'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_prod_schedule_tenant').on(table.tenantId),
  index('idx_prod_schedule_date').on(table.productionDate),
  index('idx_prod_schedule_site').on(table.siteId),
  index('idx_prod_schedule_meal').on(table.mealPeriodId),
  index('idx_prod_schedule_recipe').on(table.recipeId),
  index('idx_prod_schedule_status').on(table.status),
  index('idx_prod_schedule_cycle_menu_item').on(table.cycleMenuItemId),
  index('idx_prod_schedule_single_use_item').on(table.singleUseMenuItemId),
]);

// ============================================================================
// TABLE: forecasts
// 
// Demand forecasting records for production planning. The textbook states:
// "The goal of forecasting is to estimate future demand using past data.
// Applied to foodservice, forecasting is a prediction of food needs for a day
// or other specific time period."
//
// Forecast Types:
//   - Census: Total customers/patients expected
//   - Menu Item: Specific item selection forecast
//   - Category: Category-level forecast (entrées, sides)
//
// Forecast Methods (from textbook):
//   - Moving Average: Average of recent periods
//   - Exponential Smoothing: Weighted average emphasizing recent data
//   - Tally: "A simple count of menu items actually requested or selected"
//   - Management Estimate: Judgment-based adjustment
//
// "Sound forecasting is vital to financial management; it facilitates
// efficient scheduling of labor, use of equipment, and space."
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const forecasts = sqliteTable('forecasts', {
  /** Unique identifier */
  forecastId: text('forecast_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Date being forecasted */
  forecastDate: text('forecast_date').notNull(),
  
  /** Location */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  /** Meal period */
  mealPeriodId: text('meal_period_id').notNull().references(() => mealPeriods.mealPeriodId),
  
  /** Specific recipe (if item-level forecast) */
  recipeId: text('recipe_id').references(() => recipes.recipeId),
  
  /** Level of forecast */
  forecastType: text('forecast_type', { 
    enum: ['Census', 'Menu Item', 'Category'] 
  }).notNull(),
  
  /** Predicted count */
  forecastedCount: integer('forecasted_count').notNull(),
  
  /** Actual result (filled after service) */
  actualCount: integer('actual_count'),
  
  /** Difference (actual - forecast) */
  variance: integer('variance'),
  
  /** Percentage variance */
  variancePercent: real('variance_percent'),
  
  /** Method used to generate forecast */
  forecastMethod: text('forecast_method', { 
    enum: ['Moving Average', 'Exponential Smoothing', 'Tally', 'Management Estimate'] 
  }),
  
  /** Factors that influenced forecast (weather, events, etc.) */
  adjustmentFactors: text('adjustment_factors'),
  
  /** Historical average for reference */
  historicalAverage: real('historical_average'),
  
  /** Who created forecast */
  createdBy: text('created_by'),
  
  /** When forecast was created */
  createdDate: text('created_date'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_forecasts_tenant').on(table.tenantId),
  index('idx_forecasts_date').on(table.forecastDate),
  index('idx_forecasts_site').on(table.siteId),
  index('idx_forecasts_meal').on(table.mealPeriodId),
  index('idx_forecasts_recipe').on(table.recipeId),
]);

// ============================================================================
// TABLE: leftover_reports
// 
// Tracks leftover food after service for waste reduction and forecast
// improvement. The textbook emphasizes: "Reducing the amount of leftover
// prepared foods is another step that can be taken to [control costs]."
//
// This table enables:
//   - Analysis of forecasting accuracy
//   - Food waste tracking for sustainability reporting
//   - Identification of patterns in overproduction
//   - Cost control initiatives
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const leftoverReports = sqliteTable('leftover_reports', {
  /** Unique identifier */
  leftoverId: text('leftover_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Service date */
  reportDate: text('report_date').notNull(),
  
  /** Meal period */
  mealPeriodId: text('meal_period_id').notNull().references(() => mealPeriods.mealPeriodId),
  
  /** Location */
  siteId: text('site_id').notNull().references(() => sites.siteId),
  
  /** Recipe with leftovers */
  recipeId: text('recipe_id').notNull().references(() => recipes.recipeId),
  
  /** Portions made */
  portionsProduced: integer('portions_produced').notNull(),
  
  /** Portions served */
  portionsServed: integer('portions_served').notNull(),
  
  /** Portions remaining (produced - served) */
  portionsLeftover: integer('portions_leftover').notNull(),
  
  /** Quality assessment */
  leftoverQuality: text('leftover_quality', { 
    enum: ['Usable', 'Marginal', 'Waste'] 
  }).notNull(),
  
  /** What was done with leftovers */
  disposition: text('disposition', { 
    enum: ['Repurposed', 'Refrigerated for Next Day', 'Frozen', 'Donated', 'Discarded'] 
  }).notNull(),
  
  /** Weight discarded (for waste tracking) */
  weightDiscardedLbs: real('weight_discarded_lbs'),
  
  /** Financial impact of waste */
  estimatedCostLost: real('estimated_cost_lost'),
  
  /** Root cause analysis */
  reasonForExcess: text('reason_for_excess', { 
    enum: ['Over-forecast', 'Over-production', 'Low Participation', 'Poor Quality'] 
  }),
  
  /** Employee reporting (FK to employees) */
  reportedBy: text('reported_by').notNull().references(() => employees.employeeId),
  
  notes: text('notes'),
}, (table) => [
  index('idx_leftovers_tenant').on(table.tenantId),
  index('idx_leftovers_date').on(table.reportDate),
  index('idx_leftovers_site').on(table.siteId),
  index('idx_leftovers_recipe').on(table.recipeId),
  index('idx_leftovers_quality').on(table.leftoverQuality),
]);

// Type exports for use in application code
export type ProductionSchedule = typeof productionSchedules.$inferSelect;
export type NewProductionSchedule = typeof productionSchedules.$inferInsert;
export type Forecast = typeof forecasts.$inferSelect;
export type NewForecast = typeof forecasts.$inferInsert;
export type LeftoverReport = typeof leftoverReports.$inferSelect;
export type NewLeftoverReport = typeof leftoverReports.$inferInsert;

