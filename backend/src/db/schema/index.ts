/**
 * Food Service Management Database Schema
 * 
 * Based on principles from "Foodservice Management: Principles and Practices"
 * (13th Edition) by Payne-Palacio & Theis
 *
 * This schema implements a comprehensive food service management system for
 * institutional operations (hospitals, nursing homes, schools) supporting:
 *   - Menu Planning & Cycle Menus
 *   - Recipe Standardization with costing and portion control
 *   - Dietary Management (regular and therapeutic/modified diets)
 *   - Procurement (vendor management, purchasing, receiving)
 *   - Inventory Control (perpetual and physical inventory)
 *   - Production Scheduling and Forecasting
 *   - Service & Delivery (patient/diner meal orders, tray service)
 *
 * MULTI-TENANT ARCHITECTURE:
 * This schema supports multiple independent organizations (tenants) with three
 * tenant isolation patterns:
 *
 *   1. UNIVERSAL (no tenant_id): Reference data shared across all tenants
 *      - units_of_measure, food_categories, allergens
 *
 *   2. OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
 *      - NULL tenant_id = system/shared data accessible to all tenants
 *      - Non-NULL tenant_id = tenant-specific data (private to that tenant)
 *      - Applies to: meal_periods, diet_types, recipes, ingredients, 
 *        product_specifications
 *
 *   3. REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
 *      - All operational tables require tenant_id for data isolation
 *      - Applies to: sites, employees, cycle_menus, diners, vendors, 
 *        inventory, production_schedules, etc.
 *
 * Query Pattern for Optional Tenant Tables:
 *   SELECT * FROM recipes 
 *   WHERE tenant_id IS NULL OR tenant_id = :current_tenant_id
 *
 * Query Pattern for Required Tenant Tables:
 *   SELECT * FROM sites WHERE tenant_id = :current_tenant_id
 */

// ============================================================================
// Reference Tables (Universal - no tenant_id)
// ============================================================================
export {
  unitsOfMeasure,
  foodCategories,
  allergens,
  foodCompositionSources,
  // Types
  type UnitOfMeasure,
  type NewUnitOfMeasure,
  type FoodCategory,
  type NewFoodCategory,
  type Allergen,
  type NewAllergen,
  type FoodCompositionSource,
  type NewFoodCompositionSource,
} from './reference';

// ============================================================================
// Tenant and Organization Tables
// ============================================================================
export {
  tenants,
  sites,
  stations,
  employees,
  // Types
  type Tenant,
  type NewTenant,
  type Site,
  type NewSite,
  type Station,
  type NewStation,
  type Employee,
  type NewEmployee,
} from './tenants';

// ============================================================================
// Menu Planning Tables
// ============================================================================
export {
  mealPeriods,
  dietTypes,
  cycleMenus,
  menuItems,
  menuPatterns,
  singleUseMenus,
  singleUseMenuItems,
  // Types
  type MealPeriod,
  type NewMealPeriod,
  type DietType,
  type NewDietType,
  type CycleMenu,
  type NewCycleMenu,
  type MenuItem,
  type NewMenuItem,
  type MenuPattern,
  type NewMenuPattern,
  type SingleUseMenu,
  type NewSingleUseMenu,
  type SingleUseMenuItem,
  type NewSingleUseMenuItem,
} from './menu';

// ============================================================================
// Recipe Tables
// ============================================================================
export {
  ingredients,
  ingredientFoodCompositionRefs,
  recipes,
  recipeIngredients,
  // Types
  type Ingredient,
  type NewIngredient,
  type IngredientFoodCompositionRef,
  type NewIngredientFoodCompositionRef,
  type Recipe,
  type NewRecipe,
  type RecipeIngredient,
  type NewRecipeIngredient,
} from './recipes';

// ============================================================================
// Diner/Customer Tables
// ============================================================================
export {
  diners,
  dietAssignments,
  mealOrders,
  // Types
  type Diner,
  type NewDiner,
  type DietAssignment,
  type NewDietAssignment,
  type MealOrder,
  type NewMealOrder,
} from './diners';

// ============================================================================
// Procurement Tables
// ============================================================================
export {
  vendors,
  productSpecifications,
  segmentIngredientDefaults,
  siteIngredientPreferences,
  purchaseOrders,
  poLineItems,
  // Types
  type Vendor,
  type NewVendor,
  type ProductSpecification,
  type NewProductSpecification,
  type SegmentIngredientDefault,
  type NewSegmentIngredientDefault,
  type SiteIngredientPreference,
  type NewSiteIngredientPreference,
  type PurchaseOrder,
  type NewPurchaseOrder,
  type PoLineItem,
  type NewPoLineItem,
} from './procurement';

// ============================================================================
// Inventory Tables
// ============================================================================
export {
  receiving,
  inventory,
  storeroomIssues,
  // Types
  type Receiving,
  type NewReceiving,
  type Inventory,
  type NewInventory,
  type StoreroomIssue,
  type NewStoreroomIssue,
} from './inventory';

// ============================================================================
// Production Tables
// ============================================================================
export {
  productionSchedules,
  forecasts,
  leftoverReports,
  // Types
  type ProductionSchedule,
  type NewProductionSchedule,
  type Forecast,
  type NewForecast,
  type LeftoverReport,
  type NewLeftoverReport,
} from './production';

