/**
 * Recipe Tables Schema
 * 
 * Implements the standardized recipe concept, which the textbook calls "the
 * most important control tool" in food production. "A recipe is standardized
 * when it has been tested and adapted to the requirements of the specific
 * facility and to the demands of its clientele."
 *
 * Benefits of standardized recipes (from textbook):
 *   1. Consistency - Same quality every time
 *   2. Nutritional accuracy - Essential in healthcare/schools
 *   3. Cost control - Known food costs
 *   4. Training tool - Communicates expectations to staff
 *   5. Forecasting aid - Supports purchasing calculations
 *   6. Production scheduling - Enables equipment planning
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants';
import { unitsOfMeasure, foodCategories, foodCompositionSources } from './reference';

// Forward reference for vendors - defined in procurement.ts
// Will be connected via migration or application logic

// ============================================================================
// TABLE: ingredients
// 
// Master list of ingredients/products used in recipes. Includes purchasing
// information, yield factors, and inventory parameters.
//
// NUTRIENT DATA STANDARD:
// USDA FoodData Central (FDC) serves as the base standard for nutritional
// data. The fdc_id column links directly to FDC for nutrient lookups.
// For international deployments, the ingredient_food_composition_refs table
// maps ingredients to other national databases (UK CoFID, Canadian CNF, etc.).
// This allows recipes to be database-agnostic while supporting localized
// nutrient reporting based on tenant's preferred food composition source.
//
// Yield Percent (AP vs EP): The textbook emphasizes: "Standardized recipes
// that include AP and EP (as purchased, and edible portion) weights of
// ingredients, yields, pan sizes, and portion size are invaluable aids."
//   - AP (As Purchased): Weight/quantity as received from vendor
//   - EP (Edible Portion): Usable portion after trimming/waste
//   - Example: Carrots have ~81% yield (19% lost to peeling/trimming)
//
// Inventory Levels: The textbook describes the mini-max system: "The maximum
// inventory level is equal to the safety stock plus the estimated usage."
//   - Par level: Target inventory to maintain
//   - Reorder point: Level at which to place new order
// 
// OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
// ============================================================================
export const ingredients = sqliteTable('ingredients', {
  /** Unique identifier */
  ingredientId: text('ingredient_id').primaryKey(),
  
  /** NULL = system-wide, value = tenant-specific */
  tenantId: text('tenant_id').references(() => tenants.tenantId),
  
  /** Name of ingredient */
  ingredientName: text('ingredient_name').notNull(),
  
  /** USDA FoodData Central ID (base standard for nutrient data) */
  fdcId: integer('fdc_id'),
  
  /** Reference to food_categories */
  foodCategoryId: text('food_category_id').notNull().references(() => foodCategories.categoryId),
  
  /** Standard unit for recipe use (e.g., 'lb', 'cup') */
  commonUnit: text('common_unit').notNull().references(() => unitsOfMeasure.unitId),
  
  /** Unit for purchasing (e.g., 'case', 'bag') */
  purchaseUnit: text('purchase_unit').notNull(),
  
  /** Cost per purchase unit */
  purchaseUnitCost: real('purchase_unit_cost'),
  
  /** How many common units per purchase unit */
  unitsPerPurchaseUnit: real('units_per_purchase_unit'),
  
  /** Calculated cost per common unit */
  costPerUnit: real('cost_per_unit'),
  
  /** EP yield from AP (e.g., 0.81 for 81%) */
  yieldPercent: real('yield_percent'),
  
  storageType: text('storage_type', { 
    enum: ['Dry', 'Refrigerated', 'Frozen'] 
  }).notNull(),
  
  /** Maximum storage time before quality degrades */
  shelfLifeDays: integer('shelf_life_days'),
  
  /** Target inventory level to maintain */
  parLevel: real('par_level'),
  
  /** Quantity at which to trigger reorder */
  reorderPoint: real('reorder_point'),
  
  /** Default vendor for this ingredient - FK to vendors table */
  preferredVendorId: text('preferred_vendor_id'),
  
  /** Comma-separated allergen codes (e.g., 'ALG-MILK,ALG-EGG') */
  allergenFlags: text('allergen_flags'),
  
  /** 1 if locally sourced */
  isLocal: integer('is_local', { mode: 'boolean' }).default(false),
  
  /** 1 if organic certified */
  isOrganic: integer('is_organic', { mode: 'boolean' }).default(false),
  
  /** 1 if USDA commodity (schools) */
  usdaCommodity: integer('usda_commodity', { mode: 'boolean' }).default(false),
  
  status: text('status', { 
    enum: ['Active', 'Discontinued', 'Seasonal'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_ingredients_tenant').on(table.tenantId),
  index('idx_ingredients_fdc').on(table.fdcId),
  index('idx_ingredients_category').on(table.foodCategoryId),
  index('idx_ingredients_vendor').on(table.preferredVendorId),
  index('idx_ingredients_storage').on(table.storageType),
  index('idx_ingredients_status').on(table.status),
]);

// ============================================================================
// TABLE: ingredient_food_composition_refs
// 
// Links ingredients to entries in external food composition databases (USDA,
// UK CoFID, Canadian CNF, etc.). An ingredient may have references in multiple
// databases, enabling international deployment and cross-validation.
//
// The is_primary flag indicates which database reference should be used for
// nutrient lookups for this ingredient. This allows:
//   - A UK hospital to use UK CoFID as primary
//   - A US school to use USDA FDC as primary
//   - Both to see alternative mappings for verification
// ============================================================================
export const ingredientFoodCompositionRefs = sqliteTable('ingredient_food_composition_refs', {
  /** Unique identifier */
  refId: text('ref_id').primaryKey(),
  
  /** Reference to ingredient */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId, { onDelete: 'cascade' }),
  
  /** Which food composition database */
  sourceId: text('source_id').notNull().references(() => foodCompositionSources.sourceId),
  
  /** ID in that database (FDC ID, CNF code, etc.) */
  externalId: text('external_id').notNull(),
  
  /** Name as it appears in source database */
  externalName: text('external_name'),
  
  /** Description from source database */
  externalDescription: text('external_description'),
  
  matchConfidence: text('match_confidence', { 
    enum: ['Exact', 'Close', 'Approximate', 'Manual Override'] 
  }).notNull().default('Exact'),
  
  /** 1 if preferred source for nutrients */
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  
  /** Who verified this mapping */
  verifiedBy: text('verified_by'),
  
  /** When mapping was verified */
  verifiedDate: text('verified_date'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_food_comp_refs_ingredient').on(table.ingredientId),
  index('idx_food_comp_refs_source').on(table.sourceId),
  index('idx_food_comp_refs_external').on(table.sourceId, table.externalId),
  index('idx_food_comp_refs_primary').on(table.isPrimary),
]);

// ============================================================================
// TABLE: recipes
// 
// Master list of standardized recipes. The textbook states: "A recipe is
// standardized when it has been tested and adapted to the requirements of
// the specific facility."
//
// Portion Control: The portion_utensil field (e.g., '#16 scoop') supports:
// "Portion control is used to contain costs and ensure nutrient composition
// of menu items."
//
// HACCP Fields: The haccp_critical_limits, hold_temp_f, and max_hold_time_hours
// fields support food safety documentation. "HACCP is based on assessment of
// hazards at each step in the flow of food through a foodservice operation."
// 
// OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
// ============================================================================
export const recipes = sqliteTable('recipes', {
  /** Unique identifier */
  recipeId: text('recipe_id').primaryKey(),
  
  /** NULL = system recipe, value = tenant-specific */
  tenantId: text('tenant_id').references(() => tenants.tenantId),
  
  /** Name of the recipe */
  recipeName: text('recipe_name').notNull(),
  
  /** Internal code (for POS systems, production sheets) */
  recipeCode: text('recipe_code'),
  
  /** Menu category classification */
  category: text('category', { 
    enum: ['Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread', 
           'Dessert', 'Sauce', 'Beverage', 'Breakfast', 'Appetizer', 'Condiment'] 
  }).notNull(),
  
  /** Cuisine classification (optional) */
  cuisineType: text('cuisine_type', { 
    enum: ['American', 'Mexican', 'Asian', 'Italian', 'Mediterranean', 
           'Indian', 'French', 'Southern', 'Cajun', 'Caribbean', 
           'Middle Eastern', 'Other'] 
  }),
  
  /** Total yield amount */
  yieldQuantity: real('yield_quantity').notNull(),
  
  /** Unit of yield (portions, pans, etc.) */
  yieldUnit: text('yield_unit').notNull().references(() => unitsOfMeasure.unitId),
  
  /** Standard portion size description */
  portionSize: text('portion_size').notNull(),
  
  /** Utensil for portioning (e.g., '#16 scoop', '4 oz ladle') */
  portionUtensil: text('portion_utensil'),
  
  /** Preparation time */
  prepTimeMinutes: integer('prep_time_minutes'),
  
  /** Cooking time */
  cookTimeMinutes: integer('cook_time_minutes'),
  
  /** Cooking temperature in Fahrenheit */
  cookingTempF: integer('cooking_temp_f'),
  
  /** Primary cooking method */
  cookingMethod: text('cooking_method', { 
    enum: ['Bake', 'Roast', 'Grill', 'Steam', 'Sauté', 'Braise', 
           'Fry', 'Deep Fry', 'Simmer', 'Boil', 'Poach', 'No-Cook'] 
  }),
  
  /** Equipment needed for preparation */
  equipmentRequired: text('equipment_required'),
  
  /** Pan size specification (e.g., 'Full hotel pan') */
  panSize: text('pan_size'),
  
  /** Number of pans per batch */
  pansPerBatch: integer('pans_per_batch'),
  
  /** Weight of filled pan (for production planning) */
  weightPerPan: text('weight_per_pan'),
  
  /** Calculated food cost per serving */
  foodCostPerPortion: real('food_cost_per_portion'),
  
  /** Nutritional: calories */
  caloriesPerPortion: integer('calories_per_portion'),
  
  /** Nutritional: protein grams */
  proteinG: real('protein_g'),
  
  /** Nutritional: carbohydrate grams */
  carbsG: real('carbs_g'),
  
  /** Nutritional: fat grams */
  fatG: real('fat_g'),
  
  /** Nutritional: sodium milligrams */
  sodiumMg: integer('sodium_mg'),
  
  /** Nutritional: fiber grams */
  fiberG: real('fiber_g'),
  
  /** Allergen warning information */
  allergens: text('allergens'),
  
  /** Comma-separated diet IDs this recipe works for */
  suitableForDiets: text('suitable_for_diets'),
  
  /** HACCP critical control point documentation */
  haccpCriticalLimits: text('haccp_critical_limits'),
  
  /** Safe holding temperature */
  holdTempF: integer('hold_temp_f'),
  
  /** Maximum safe holding time */
  maxHoldTimeHours: real('max_hold_time_hours'),
  
  /** Recipe variation notes */
  variations: text('variations'),
  
  /** Recipe source/origin */
  source: text('source'),
  
  /** When recipe was tested and standardized */
  dateStandardized: text('date_standardized'),
  
  status: text('status', { 
    enum: ['Active', 'Draft', 'Archived', 'Seasonal'] 
  }).notNull().default('Active'),
  
  notes: text('notes'),
  
  /** 
   * LLM context notes for AI agent operations.
   * Include: chef tips, common modifications, scaling advice,
   * equipment alternatives, troubleshooting guidance,
   * regional variations, pairing suggestions.
   */
  llmNotes: text('llm_notes'),
}, (table) => [
  index('idx_recipes_tenant').on(table.tenantId),
  index('idx_recipes_category').on(table.category),
  index('idx_recipes_status').on(table.status),
]);

// ============================================================================
// TABLE: recipe_ingredients
// 
// Links ingredients to recipes with quantities. Implements the ingredient list
// portion of standardized recipes.
//
// The is_ap_or_ep field is critical: determines whether quantity is before
// or after yield loss. The textbook emphasizes tracking both AP and EP.
//
// The calculated_cost field enables recipe costing: "The raw food cost is
// found by costing the standardized recipe for each menu item."
// ============================================================================
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  /** Unique identifier */
  recipeIngredientId: text('recipe_ingredient_id').primaryKey(),
  
  /** Reference to recipe */
  recipeId: text('recipe_id').notNull().references(() => recipes.recipeId, { onDelete: 'cascade' }),
  
  /** Reference to ingredient */
  ingredientId: text('ingredient_id').notNull().references(() => ingredients.ingredientId),
  
  /** Amount required */
  quantity: real('quantity').notNull(),
  
  /** Unit of measure for this quantity */
  unitId: text('unit_id').notNull().references(() => unitsOfMeasure.unitId),
  
  /** As Purchased or Edible Portion */
  isApOrEp: text('is_ap_or_ep', { 
    enum: ['AP', 'EP'] 
  }).notNull().default('EP'),
  
  /** Preparation notes (e.g., 'diced', 'minced', 'julienne') */
  prepInstruction: text('prep_instruction'),
  
  /** Order in ingredient list (often by use order) */
  sequenceOrder: integer('sequence_order'),
  
  /** 1 if optional ingredient */
  isOptional: integer('is_optional', { mode: 'boolean' }).default(false),
  
  /** Group heading (e.g., 'Sauce', 'Topping', 'Marinade') */
  ingredientGroup: text('ingredient_group'),
  
  /** Cost for this ingredient in recipe */
  calculatedCost: real('calculated_cost'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_recipe_ingredients_recipe').on(table.recipeId),
  index('idx_recipe_ingredients_ingredient').on(table.ingredientId),
]);

// Type exports for use in application code
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type IngredientFoodCompositionRef = typeof ingredientFoodCompositionRefs.$inferSelect;
export type NewIngredientFoodCompositionRef = typeof ingredientFoodCompositionRefs.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;

