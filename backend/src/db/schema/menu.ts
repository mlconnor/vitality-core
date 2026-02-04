/**
 * Menu Planning Tables Schema
 * 
 * Implements the menu planning framework described extensively in Chapter 5
 * of the textbook. The menu is the control document that drives all other
 * operations: purchasing, production schedules, staffing, and equipment use.
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { tenants, sites, stations } from './tenants';

// ============================================================================
// TABLE: meal_periods
// 
// Defines meal periods (Breakfast, Lunch, Dinner, Snacks) with nutritional
// targets. Supports meal patterns including the standard three meals plus
// snacks. The textbook notes that healthcare regulations often "mandate a
// bedtime snack for all residents." Calorie targets support nutritional
// planning for institutional feeding programs.
// 
// OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
//   - NULL tenant_id = system/shared data accessible to all tenants
//   - Non-NULL tenant_id = tenant-specific data (private to that tenant)
// ============================================================================
export const mealPeriods = sqliteTable('meal_periods', {
  /** Unique identifier (e.g., 'MP-BRKFST') */
  mealPeriodId: text('meal_period_id').primaryKey(),
  
  /** NULL = system-wide, value = tenant-specific */
  tenantId: text('tenant_id').references(() => tenants.tenantId),
  
  /** Name (e.g., 'Breakfast', 'Lunch') */
  mealPeriodName: text('meal_period_name').notNull(),
  
  /** Standard start time (SQLite stores time as TEXT) */
  typicalStartTime: text('typical_start_time').notNull(),
  
  /** Standard end time */
  typicalEndTime: text('typical_end_time').notNull(),
  
  /** Minimum calorie target for this meal */
  targetCaloriesMin: integer('target_calories_min'),
  
  /** Maximum calorie target for this meal */
  targetCaloriesMax: integer('target_calories_max'),
  
  /** 1 for main meals, 0 for optional snacks */
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(true),
  
  /** Display ordering throughout the day */
  sortOrder: integer('sort_order').notNull(),
  
  notes: text('notes'),
}, (table) => [
  index('idx_meal_periods_tenant').on(table.tenantId),
  index('idx_meal_periods_sort_order').on(table.sortOrder),
]);

// ============================================================================
// TABLE: diet_types
// 
// Defines regular and therapeutic/modified diets. Critical for healthcare
// foodservice. The textbook states: "In many foodservice operations, especially
// those affiliated with health care, the foodservice department is responsible
// for ensuring that physician-ordered diets are provided."
//
// Diet categories from the textbook:
//   - Regular: Standard diet with no restrictions
//   - Therapeutic: Medically prescribed (low sodium, cardiac, renal, diabetic)
//   - Texture-Modified: For dysphagia patients (pureed, mechanical soft)
//   - Allergy: Allergen avoidance (gluten-free)
//   - Religious: Halal, Kosher
//   - Lifestyle: Vegetarian, Vegan
//
// The textbook notes: "Modified menu extensions are generated from the master
// menu and a diet manual that defines the modified diets for a particular
// facility."
// 
// OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
// ============================================================================
export const dietTypes = sqliteTable('diet_types', {
  /** Unique identifier (e.g., 'DIET-REG', 'DIET-DIAB') */
  dietTypeId: text('diet_type_id').primaryKey(),
  
  /** NULL = system-wide, value = tenant-specific */
  tenantId: text('tenant_id').references(() => tenants.tenantId),
  
  /** Name of diet (e.g., 'Regular', 'Diabetic/Carb Controlled') */
  dietTypeName: text('diet_type_name').notNull(),
  
  /** Classification category */
  dietCategory: text('diet_category', { 
    enum: ['Regular', 'Therapeutic', 'Texture-Modified', 'Allergy', 'Religious', 'Lifestyle'] 
  }).notNull(),
  
  /** Detailed description of the diet */
  description: text('description').notNull(),
  
  /** Foods/ingredients that must be avoided */
  restrictions: text('restrictions'),
  
  /** Required substitutions or modifications */
  requiredModifications: text('required_modifications'),
  
  /** Daily calorie target if applicable */
  calorieTarget: integer('calorie_target'),
  
  /** Daily sodium limit in mg (for low-sodium diets) */
  sodiumLimitMg: integer('sodium_limit_mg'),
  
  /** Carbohydrate limit per meal (for diabetic diets) */
  carbLimitG: integer('carb_limit_g'),
  
  /** 1 if RD must approve */
  requiresDietitianApproval: integer('requires_dietitian_approval', { mode: 'boolean' }).notNull().default(false),
  
  status: text('status', { 
    enum: ['Active', 'Inactive'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_diet_types_tenant').on(table.tenantId),
  index('idx_diet_types_category').on(table.dietCategory),
  index('idx_diet_types_status').on(table.status),
]);

// ============================================================================
// TABLE: cycle_menus
// 
// Implements the cycle menu concept: "A cycle menu is a planned set of menus
// that rotate at definite intervals of a few days to several weeks."
//
// Advantages of cycle menus (from textbook):
//   - "After initial planning has been completed, time is freed for the
//     planner to review and revise menus"
//   - "Repetition of the same menu aids in standardizing preparation
//     procedures and in efficient use of equipment"
//   - "Forecasting and purchasing are simplified"
//   - "Employee workloads can be balanced and distributed evenly"
//
// The season field addresses: "Many foodservices solve [seasonal variation]
// by developing summer, fall, winter, and spring cycles."
//
// Typical cycle lengths vary by setting:
//   - Hospitals: Shorter cycles (1-2 weeks) due to reduced patient stays
//   - Long-term care/Corrections: Longer cycles (3-8 weeks)
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const cycleMenus = sqliteTable('cycle_menus', {
  /** Unique identifier */
  cycleMenuId: text('cycle_menu_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Descriptive name (e.g., 'Spring 2026 4-Week Cycle') */
  cycleName: text('cycle_name').notNull(),
  
  /** Seasonal applicability */
  season: text('season', { 
    enum: ['Spring', 'Summer', 'Fall', 'Winter', 'Year-Round'] 
  }).notNull(),
  
  /** Number of weeks in the cycle */
  cycleLengthWeeks: integer('cycle_length_weeks').notNull(),
  
  /** When this cycle begins */
  startDate: text('start_date').notNull(),
  
  /** When this cycle ends (NULL if ongoing) */
  endDate: text('end_date'),
  
  /** Site-specific menu (NULL = all sites) */
  siteId: text('site_id').references(() => sites.siteId),
  
  /** Budget target per meal */
  targetFoodCostPerMeal: real('target_food_cost_per_meal'),
  
  status: text('status', { 
    enum: ['Draft', 'Active', 'Archived'] 
  }).notNull().default('Draft'),
  
  /** Name of approving authority */
  approvedBy: text('approved_by'),
  
  /** Date of approval */
  approvalDate: text('approval_date'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation: Tenant → Site → Cycle Menu
   * Include: seasonal themes, cost targets, variety goals,
   * nutritional focus areas, cuisine balance requirements.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_cycle_menus_tenant').on(table.tenantId),
  index('idx_cycle_menus_status').on(table.status),
  index('idx_cycle_menus_site_id').on(table.siteId),
  index('idx_cycle_menus_dates').on(table.startDate, table.endDate),
]);

// Forward declaration for recipes - will be imported from recipes.ts
// This is needed because menu_items references recipes, but we want to avoid circular imports
// The actual foreign key constraint will be added via raw SQL migration if needed

// ============================================================================
// TABLE: menu_items
// 
// Places specific recipes on the cycle menu for particular days, meals, and
// diet types. Implements the menu extension concept from the textbook:
// "Modified menu extensions are generated from the master menu... A menu
// extension should be planned for each day."
//
// Choice Groups: The is_choice and choice_group fields support selective menus
// where customers choose between options (e.g., "Chicken OR Fish for entrée").
//
// Participation Rates: The estimated_participation field supports forecasting;
// different menu items have different selection rates based on historical data.
// 
// Note: recipe_id foreign key is defined but references recipes table from recipes.ts
// ============================================================================
export const menuItems = sqliteTable('menu_items', {
  /** Unique identifier */
  menuItemId: text('menu_item_id').primaryKey(),
  
  /** Reference to cycle menu */
  cycleMenuId: text('cycle_menu_id').notNull().references(() => cycleMenus.cycleMenuId, { onDelete: 'cascade' }),
  
  /** Week within the cycle (1, 2, 3, etc.) */
  weekNumber: integer('week_number').notNull(),
  
  dayOfWeek: text('day_of_week', { 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] 
  }).notNull(),
  
  /** Reference to meal period */
  mealPeriodId: text('meal_period_id').notNull().references(() => mealPeriods.mealPeriodId),
  
  /** Category for menu organization */
  menuCategory: text('menu_category', { 
    enum: ['Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread', 
           'Dessert', 'Beverage', 'Condiment', 'Fruit', 'Milk'] 
  }).notNull(),
  
  /** Reference to recipe being served - FK added via migration due to circular dependency */
  recipeId: text('recipe_id').notNull(),
  
  /** Which diet this menu item serves */
  dietTypeId: text('diet_type_id').notNull().references(() => dietTypes.dietTypeId),
  
  /** Service station (optional) */
  stationId: text('station_id').references(() => stations.stationId),
  
  /** Portion for this menu appearance */
  portionSize: text('portion_size').notNull(),
  
  /** 1 if part of a choice group */
  isChoice: integer('is_choice', { mode: 'boolean' }).default(false),
  
  /** Groups choices together (e.g., 'Entrée Choice') */
  choiceGroup: text('choice_group'),
  
  /** Override display name for menu (optional) */
  displayName: text('display_name'),
  
  /** Expected selection rate (0.0-1.0) for forecasting */
  estimatedParticipation: real('estimated_participation'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation: Tenant → Site → Cycle Menu → Menu Item
   * Include: item-specific service notes, popular pairings,
   * garnish suggestions, presentation guidance.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_menu_items_cycle').on(table.cycleMenuId),
  index('idx_menu_items_week_day').on(table.weekNumber, table.dayOfWeek),
  index('idx_menu_items_meal_period').on(table.mealPeriodId),
  index('idx_menu_items_recipe').on(table.recipeId),
  index('idx_menu_items_diet').on(table.dietTypeId),
]);

// ============================================================================
// TABLE: menu_patterns
// 
// Defines the menu pattern for a cycle menu or site: the number of choices
// offered in each menu category by meal period and day. The textbook defines
// menu pattern as: "an outline of food to be included in each meal and the
// extent of choice at each meal."
//
// This supports the selective/semiselective/nonselective menu concepts:
//   - Selective: "two or more food choices in each menu category"
//   - Semiselective: "one or more food choices in at least one menu category"
//   - Nonselective: "only one item per menu category"
//
// Example from textbook: "a long-term care facility may offer two entrées
// and two dessert selections at lunch and dinner, but no choice in the
// vegetable and salad categories."
//
// The ruleDescription field supports LLM-based menu planning by providing
// natural language context for the rule (e.g., "Chef prefers 3 soup options
// on weekdays to accommodate variety seekers").
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const menuPatterns = sqliteTable('menu_patterns', {
  /** Unique identifier */
  patternId: text('pattern_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Optional: pattern applies to specific cycle menu */
  cycleMenuId: text('cycle_menu_id').references(() => cycleMenus.cycleMenuId, { onDelete: 'cascade' }),
  
  /** Optional: pattern applies to specific site (if no cycleMenuId) */
  siteId: text('site_id').references(() => sites.siteId),
  
  /** Which meal this pattern applies to (NULL = all meals) */
  mealPeriodId: text('meal_period_id').references(() => mealPeriods.mealPeriodId),
  
  /** Which category this pattern governs */
  menuCategory: text('menu_category', { 
    enum: ['Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread', 
           'Dessert', 'Beverage', 'Condiment', 'Fruit', 'Milk'] 
  }).notNull(),
  
  /** Day pattern this rule applies to */
  dayPattern: text('day_pattern', { 
    enum: ['Daily', 'Weekday', 'Weekend', 'Monday', 'Tuesday', 'Wednesday', 
           'Thursday', 'Friday', 'Saturday', 'Sunday'] 
  }).notNull().default('Daily'),
  
  /** Minimum items required in this category */
  minChoices: integer('min_choices').notNull().default(1),
  
  /** Maximum items allowed (NULL = same as min, i.e., exact count) */
  maxChoices: integer('max_choices'),
  
  /** LLM-friendly natural language description of the pattern/rationale */
  ruleDescription: text('rule_description'),
  
  /** Priority for conflict resolution (higher = takes precedence) */
  priority: integer('priority').notNull().default(0),
  
  status: text('status', { 
    enum: ['Active', 'Inactive'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_menu_patterns_tenant').on(table.tenantId),
  index('idx_menu_patterns_cycle').on(table.cycleMenuId),
  index('idx_menu_patterns_site').on(table.siteId),
  index('idx_menu_patterns_meal').on(table.mealPeriodId),
  index('idx_menu_patterns_category').on(table.menuCategory),
]);

// ============================================================================
// TABLE: single_use_menus
// 
// Implements the single-use menu concept from the textbook: "A single-use menu
// is a menu that is planned for a certain day or event and is not repeated
// in exactly the same form. This type of menu is often used for special
// functions, holidays, or catering events."
//
// Single-use menus can either REPLACE the cycle menu for a specific scope
// (entire day or specific meal period) or SUPPLEMENT it (add items to the
// existing cycle menu offerings).
//
// Workflow:
//   1. Manager views schedule, sees cycle menu for upcoming dates
//   2. Needs special menu for holiday/event → creates single-use menu
//   3. Sets scope (Day or MealPeriod) and mode (Replace or Supplement)
//   4. Adds menu items specific to that occasion
//   5. Production system resolves final menu by checking for single-use menus
// 
// REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
// ============================================================================
export const singleUseMenus = sqliteTable('single_use_menus', {
  /** Unique identifier */
  singleUseMenuId: text('single_use_menu_id').primaryKey(),
  
  /** Owning tenant (required) */
  tenantId: text('tenant_id').notNull().references(() => tenants.tenantId),
  
  /** Which site (NULL = all sites for this tenant) */
  siteId: text('site_id').references(() => sites.siteId),
  
  /** Descriptive name (e.g., "Thanksgiving 2026", "Board Meeting Lunch") */
  menuName: text('menu_name').notNull(),
  
  /** The calendar date this menu applies to (YYYY-MM-DD) */
  serviceDate: text('service_date').notNull(),
  
  /** 
   * Scope: How much of the day does this menu affect?
   * - 'Day': Applies to all meals on this date
   * - 'MealPeriod': Applies to a specific meal only
   */
  scope: text('scope', { 
    enum: ['Day', 'MealPeriod'] 
  }).notNull(),
  
  /** Required when scope = 'MealPeriod' */
  mealPeriodId: text('meal_period_id').references(() => mealPeriods.mealPeriodId),
  
  /** 
   * Mode: How does this interact with the cycle menu?
   * - 'Replace': Completely replaces cycle menu for this scope
   * - 'Supplement': Adds to cycle menu (cycle items + these items)
   */
  mode: text('mode', { 
    enum: ['Replace', 'Supplement'] 
  }).notNull(),
  
  /** Why this menu exists */
  occasion: text('occasion', { 
    enum: ['Holiday', 'SpecialEvent', 'Catering', 'Emergency', 'Test', 'Other'] 
  }).notNull().default('SpecialEvent'),
  
  /** Optional: link to the cycle menu this is based on (for reference/cloning) */
  baseCycleMenuId: text('base_cycle_menu_id').references(() => cycleMenus.cycleMenuId),
  
  /** Budget target per meal for this special menu */
  targetFoodCostPerMeal: real('target_food_cost_per_meal'),
  
  /** Forecasted headcount for this date (overrides normal forecasting) */
  forecastedCovers: integer('forecasted_covers'),
  
  status: text('status', { 
    enum: ['Draft', 'Active', 'Completed', 'Cancelled'] 
  }).notNull().default('Draft'),
  
  /** Planning and approval tracking */
  createdBy: text('created_by'),
  createdDate: text('created_date'),
  approvedBy: text('approved_by'),
  approvalDate: text('approval_date'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Part of hierarchical context aggregation.
   * Include: event details, theme, dietary considerations,
   * special service requirements, historical notes from past events.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_single_use_menus_tenant').on(table.tenantId),
  index('idx_single_use_menus_date').on(table.serviceDate),
  index('idx_single_use_menus_site_date').on(table.siteId, table.serviceDate),
  index('idx_single_use_menus_status').on(table.status),
]);

// ============================================================================
// TABLE: single_use_menu_items
// 
// Items for a single-use menu. Similar structure to menu_items but:
// - No weekNumber (it's for a specific date, not a rotating cycle)
// - References single_use_menu instead of cycle_menu
//
// When the parent single-use menu scope = 'Day', each item must specify
// which meal period it belongs to. When scope = 'MealPeriod', items
// inherit the meal period from the parent.
// ============================================================================
export const singleUseMenuItems = sqliteTable('single_use_menu_items', {
  /** Unique identifier */
  itemId: text('item_id').primaryKey(),
  
  /** Reference to single-use menu */
  singleUseMenuId: text('single_use_menu_id').notNull()
    .references(() => singleUseMenus.singleUseMenuId, { onDelete: 'cascade' }),
  
  /** Which meal this item is for (required when parent scope = 'Day') */
  mealPeriodId: text('meal_period_id').notNull()
    .references(() => mealPeriods.mealPeriodId),
  
  /** Category for menu organization */
  menuCategory: text('menu_category', { 
    enum: ['Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread', 
           'Dessert', 'Beverage', 'Condiment', 'Fruit', 'Milk'] 
  }).notNull(),
  
  /** Reference to recipe being served */
  recipeId: text('recipe_id').notNull(),
  
  /** Which diet this menu item serves */
  dietTypeId: text('diet_type_id').notNull().references(() => dietTypes.dietTypeId),
  
  /** Service station (optional) */
  stationId: text('station_id').references(() => stations.stationId),
  
  /** Portion for this menu appearance */
  portionSize: text('portion_size').notNull(),
  
  /** 1 if part of a choice group */
  isChoice: integer('is_choice', { mode: 'boolean' }).default(false),
  
  /** Groups choices together (e.g., 'Entrée Choice') */
  choiceGroup: text('choice_group'),
  
  /** Override display name for menu (optional) */
  displayName: text('display_name'),
  
  /** Expected selection rate (0.0-1.0) for forecasting */
  estimatedParticipation: real('estimated_participation'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Include: item-specific service notes, presentation guidance,
   * special preparation notes for this occasion.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_single_use_menu_items_menu').on(table.singleUseMenuId),
  index('idx_single_use_menu_items_meal').on(table.mealPeriodId),
  index('idx_single_use_menu_items_recipe').on(table.recipeId),
  index('idx_single_use_menu_items_diet').on(table.dietTypeId),
]);

// Type exports for use in application code
export type MealPeriod = typeof mealPeriods.$inferSelect;
export type NewMealPeriod = typeof mealPeriods.$inferInsert;
export type DietType = typeof dietTypes.$inferSelect;
export type NewDietType = typeof dietTypes.$inferInsert;
export type CycleMenu = typeof cycleMenus.$inferSelect;
export type NewCycleMenu = typeof cycleMenus.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type MenuPattern = typeof menuPatterns.$inferSelect;
export type NewMenuPattern = typeof menuPatterns.$inferInsert;
export type SingleUseMenu = typeof singleUseMenus.$inferSelect;
export type NewSingleUseMenu = typeof singleUseMenus.$inferInsert;
export type SingleUseMenuItem = typeof singleUseMenuItems.$inferSelect;
export type NewSingleUseMenuItem = typeof singleUseMenuItems.$inferInsert;

