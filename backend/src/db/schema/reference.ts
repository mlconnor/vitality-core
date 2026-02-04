/**
 * Reference Tables Schema
 * 
 * These foundational tables provide standardized lookup values used throughout
 * the system. They should be populated first as they are referenced by foreign
 * keys in other tables.
 * 
 * UNIVERSAL (no tenant_id): Reference data shared across all tenants
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ============================================================================
// TABLE: units_of_measure
// 
// Defines standard units for measuring ingredients, yields, and portions.
// Consistency in units is fundamental to recipe standardization. The textbook
// states: "A recipe is standardized when it has been tested and adapted to the
// requirements of the specific facility... ensuring consistency of each aspect
// of quality every time a menu item is prepared."
//
// The conversion_to_base field enables automatic unit conversions for recipe
// scaling using the factor method and percentage method of recipe adjustment.
// ============================================================================
export const unitsOfMeasure = sqliteTable('units_of_measure', {
  /** Unique identifier (e.g., 'UOM-LB', 'UOM-CUP') */
  unitId: text('unit_id').primaryKey(),
  
  /** Full name (e.g., 'Pound', 'Cup') */
  unitName: text('unit_name').notNull(),
  
  /** Standard abbreviation (e.g., 'lb', 'c') */
  unitAbbreviation: text('unit_abbreviation').notNull(),
  
  /** Category of unit */
  unitType: text('unit_type', { 
    enum: ['Weight', 'Volume', 'Count', 'Each'] 
  }).notNull(),
  
  /** Conversion factor to base unit for calculations */
  conversionToBase: real('conversion_to_base'),
  
  /** The base unit for this type (e.g., 'lb' for weight) */
  baseUnit: text('base_unit'),
});

// ============================================================================
// TABLE: food_categories
// 
// Classifies ingredients for organization, storage management, and inventory
// control. The storage_type field connects to the three basic types of storage
// described in the textbook: dry storage, refrigerated storage, and freezer
// storage. Per the textbook: "Foods should be stored using the FIFO (first-in/
// first-out) method" - categories help organize this process.
// ============================================================================
export const foodCategories = sqliteTable('food_categories', {
  /** Unique identifier (e.g., 'CAT-DAIRY') */
  categoryId: text('category_id').primaryKey(),
  
  /** Descriptive name (e.g., 'Dairy & Eggs') */
  categoryName: text('category_name').notNull(),
  
  /** Storage requirement */
  storageType: text('storage_type', { 
    enum: ['Dry', 'Refrigerated', 'Frozen'] 
  }).notNull(),
  
  /** Display ordering for reports and interfaces */
  sortOrder: integer('sort_order').notNull(),
});

// ============================================================================
// TABLE: allergens
// 
// Tracks major food allergens for labeling, dietary management, and allergen
// risk reduction programs. The textbook states: "90 percent of food allergies
// are caused by eight common foods; collectively referred to as 'the big 8.'
// These include milk, eggs, fish, shellfish, wheat, soy, peanuts, and tree
// nuts." (Sesame was added as a major allergen in 2023.)
//
// Supports Food Allergen Labeling and Consumer Protection Act (FALCPA)
// compliance and enables building an Allergen Risk Reduction Program.
// ============================================================================
export const allergens = sqliteTable('allergens', {
  /** Unique identifier (e.g., 'ALG-MILK') */
  allergenId: text('allergen_id').primaryKey(),
  
  /** Name of allergen (e.g., 'Milk') */
  allergenName: text('allergen_name').notNull(),
  
  /** 1 if FDA major allergen */
  isMajorAllergen: integer('is_major_allergen', { mode: 'boolean' }).notNull().default(true),
  
  /** Foods commonly containing this allergen */
  commonSources: text('common_sources'),
  
  /** Cross-contamination risk information for kitchen safety */
  crossContactRisk: text('cross_contact_risk'),
});

// ============================================================================
// TABLE: food_composition_sources
// 
// Registry of national and international food composition databases. Supports
// international deployments where different regions use different official
// nutrient databases (USDA FoodData Central, UK CoFID, Canadian CNF, etc.).
// 
// This enables:
//   - International deployment with region-appropriate nutrient sources
//   - Regulatory compliance using official national databases
//   - Cross-referencing ingredients across multiple databases
// ============================================================================
export const foodCompositionSources = sqliteTable('food_composition_sources', {
  /** Unique identifier (e.g., 'USDA-FDC', 'UK-COFID') */
  sourceId: text('source_id').primaryKey(),
  
  /** Full name of the database */
  sourceName: text('source_name').notNull(),
  
  /** ISO 3166-1 alpha-2 country code, or 'INT' for international */
  sourceCountry: text('source_country'),
  
  /** Maintaining organization */
  sourceOrganization: text('source_organization'),
  
  /** Database URL for reference */
  sourceUrl: text('source_url'),
  
  /** 1 if API exists for lookups */
  apiAvailable: integer('api_available', { mode: 'boolean' }).default(false),
  
  /** API base URL if available */
  apiEndpoint: text('api_endpoint'),
  
  /** Version/edition of the database */
  dataVersion: text('data_version'),
  
  /** When source data was last updated */
  lastUpdated: text('last_updated'),
  
  /** Approximate number of food items */
  itemCount: integer('item_count'),
  
  notes: text('notes'),
}, (table) => [
  index('idx_food_comp_sources_country').on(table.sourceCountry),
]);

// Type exports for use in application code
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type NewUnitOfMeasure = typeof unitsOfMeasure.$inferInsert;
export type FoodCategory = typeof foodCategories.$inferSelect;
export type NewFoodCategory = typeof foodCategories.$inferInsert;
export type Allergen = typeof allergens.$inferSelect;
export type NewAllergen = typeof allergens.$inferInsert;
export type FoodCompositionSource = typeof foodCompositionSources.$inferSelect;
export type NewFoodCompositionSource = typeof foodCompositionSources.$inferInsert;

