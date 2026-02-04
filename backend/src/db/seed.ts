/**
 * Seed Data for Food Service Management Database
 * 
 * Initial reference data for the system. These values are derived from
 * industry standards and the textbook's recommendations.
 * 
 * Run this after creating/migrating the database to populate reference tables.
 */

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  unitsOfMeasure,
  foodCategories,
  allergens,
  foodCompositionSources,
  mealPeriods,
  dietTypes,
} from './schema';

/**
 * Seed all reference data tables
 */
export async function seedDatabase(db: BetterSQLite3Database) {
  console.log('Seeding database...');
  
  await seedUnitsOfMeasure(db);
  await seedFoodCategories(db);
  await seedAllergens(db);
  await seedFoodCompositionSources(db);
  await seedMealPeriods(db);
  await seedDietTypes(db);
  
  console.log('Database seeding complete!');
}

/**
 * Units of Measure (both culinary and commercial units)
 */
async function seedUnitsOfMeasure(db: BetterSQLite3Database) {
  console.log('  Seeding units of measure...');
  
  await db.insert(unitsOfMeasure).values([
    { unitId: 'UOM-LB', unitName: 'Pound', unitAbbreviation: 'lb', unitType: 'Weight', conversionToBase: 1.0, baseUnit: 'lb' },
    { unitId: 'UOM-OZ', unitName: 'Ounce', unitAbbreviation: 'oz', unitType: 'Weight', conversionToBase: 0.0625, baseUnit: 'lb' },
    { unitId: 'UOM-G', unitName: 'Gram', unitAbbreviation: 'g', unitType: 'Weight', conversionToBase: 0.00220462, baseUnit: 'lb' },
    { unitId: 'UOM-KG', unitName: 'Kilogram', unitAbbreviation: 'kg', unitType: 'Weight', conversionToBase: 2.20462, baseUnit: 'lb' },
    { unitId: 'UOM-GAL', unitName: 'Gallon', unitAbbreviation: 'gal', unitType: 'Volume', conversionToBase: 1.0, baseUnit: 'gal' },
    { unitId: 'UOM-QT', unitName: 'Quart', unitAbbreviation: 'qt', unitType: 'Volume', conversionToBase: 0.25, baseUnit: 'gal' },
    { unitId: 'UOM-PT', unitName: 'Pint', unitAbbreviation: 'pt', unitType: 'Volume', conversionToBase: 0.125, baseUnit: 'gal' },
    { unitId: 'UOM-CUP', unitName: 'Cup', unitAbbreviation: 'c', unitType: 'Volume', conversionToBase: 0.0625, baseUnit: 'gal' },
    { unitId: 'UOM-FLOZ', unitName: 'Fluid Ounce', unitAbbreviation: 'fl oz', unitType: 'Volume', conversionToBase: 0.0078125, baseUnit: 'gal' },
    { unitId: 'UOM-TBSP', unitName: 'Tablespoon', unitAbbreviation: 'Tbsp', unitType: 'Volume', conversionToBase: 0.00390625, baseUnit: 'gal' },
    { unitId: 'UOM-TSP', unitName: 'Teaspoon', unitAbbreviation: 'tsp', unitType: 'Volume', conversionToBase: 0.00130208, baseUnit: 'gal' },
    { unitId: 'UOM-ML', unitName: 'Milliliter', unitAbbreviation: 'ml', unitType: 'Volume', conversionToBase: 0.000264172, baseUnit: 'gal' },
    { unitId: 'UOM-L', unitName: 'Liter', unitAbbreviation: 'L', unitType: 'Volume', conversionToBase: 0.264172, baseUnit: 'gal' },
    { unitId: 'UOM-EA', unitName: 'Each', unitAbbreviation: 'ea', unitType: 'Each', conversionToBase: 1.0, baseUnit: 'ea' },
    { unitId: 'UOM-DZ', unitName: 'Dozen', unitAbbreviation: 'dz', unitType: 'Count', conversionToBase: 12.0, baseUnit: 'ea' },
    { unitId: 'UOM-CS', unitName: 'Case', unitAbbreviation: 'cs', unitType: 'Count', conversionToBase: null, baseUnit: null },
    { unitId: 'UOM-PKG', unitName: 'Package', unitAbbreviation: 'pkg', unitType: 'Count', conversionToBase: null, baseUnit: null },
    { unitId: 'UOM-CAN', unitName: 'Can', unitAbbreviation: 'can', unitType: 'Count', conversionToBase: null, baseUnit: null },
    { unitId: 'UOM-BAG', unitName: 'Bag', unitAbbreviation: 'bag', unitType: 'Count', conversionToBase: null, baseUnit: null },
    { unitId: 'UOM-BOX', unitName: 'Box', unitAbbreviation: 'box', unitType: 'Count', conversionToBase: null, baseUnit: null },
    { unitId: 'UOM-BTL', unitName: 'Bottle', unitAbbreviation: 'btl', unitType: 'Count', conversionToBase: null, baseUnit: null },
    { unitId: 'UOM-PORTION', unitName: 'Portion', unitAbbreviation: 'portion', unitType: 'Each', conversionToBase: 1.0, baseUnit: 'portion' },
    { unitId: 'UOM-PAN', unitName: 'Pan', unitAbbreviation: 'pan', unitType: 'Each', conversionToBase: 1.0, baseUnit: 'pan' },
  ]).onConflictDoNothing();
}

/**
 * Food Categories (aligned with standard foodservice classifications)
 */
async function seedFoodCategories(db: BetterSQLite3Database) {
  console.log('  Seeding food categories...');
  
  await db.insert(foodCategories).values([
    { categoryId: 'CAT-DAIRY', categoryName: 'Dairy & Eggs', storageType: 'Refrigerated', sortOrder: 1 },
    { categoryId: 'CAT-MEAT', categoryName: 'Meat & Poultry', storageType: 'Refrigerated', sortOrder: 2 },
    { categoryId: 'CAT-SEAFOOD', categoryName: 'Seafood', storageType: 'Refrigerated', sortOrder: 3 },
    { categoryId: 'CAT-PRODUCE', categoryName: 'Fresh Produce', storageType: 'Refrigerated', sortOrder: 4 },
    { categoryId: 'CAT-FROZEN', categoryName: 'Frozen Foods', storageType: 'Frozen', sortOrder: 5 },
    { categoryId: 'CAT-BAKERY', categoryName: 'Bakery & Bread', storageType: 'Dry', sortOrder: 6 },
    { categoryId: 'CAT-DRY', categoryName: 'Dry Goods & Staples', storageType: 'Dry', sortOrder: 7 },
    { categoryId: 'CAT-CANNED', categoryName: 'Canned Goods', storageType: 'Dry', sortOrder: 8 },
    { categoryId: 'CAT-CONDIMENTS', categoryName: 'Condiments & Sauces', storageType: 'Dry', sortOrder: 9 },
    { categoryId: 'CAT-SPICES', categoryName: 'Spices & Seasonings', storageType: 'Dry', sortOrder: 10 },
    { categoryId: 'CAT-BEVERAGE', categoryName: 'Beverages', storageType: 'Dry', sortOrder: 11 },
    { categoryId: 'CAT-PAPER', categoryName: 'Paper & Disposables', storageType: 'Dry', sortOrder: 12 },
    { categoryId: 'CAT-CLEANING', categoryName: 'Cleaning Supplies', storageType: 'Dry', sortOrder: 13 },
  ]).onConflictDoNothing();
}

/**
 * Allergens (FDA Major Food Allergens - "The Big 8" plus sesame added 2023)
 */
async function seedAllergens(db: BetterSQLite3Database) {
  console.log('  Seeding allergens...');
  
  await db.insert(allergens).values([
    { 
      allergenId: 'ALG-MILK', 
      allergenName: 'Milk', 
      isMajorAllergen: true, 
      commonSources: 'Milk, cheese, butter, cream, yogurt, ice cream, whey, casein', 
      crossContactRisk: 'Shared equipment, utensils' 
    },
    { 
      allergenId: 'ALG-EGG', 
      allergenName: 'Eggs', 
      isMajorAllergen: true, 
      commonSources: 'Eggs, mayonnaise, meringue, some pasta, baked goods', 
      crossContactRisk: 'Shared equipment, batter' 
    },
    { 
      allergenId: 'ALG-FISH', 
      allergenName: 'Fish', 
      isMajorAllergen: true, 
      commonSources: 'All fish species, fish sauce, Caesar dressing, Worcestershire sauce', 
      crossContactRisk: 'Shared fryers, grills' 
    },
    { 
      allergenId: 'ALG-SHELLFISH', 
      allergenName: 'Shellfish', 
      isMajorAllergen: true, 
      commonSources: 'Shrimp, crab, lobster, scallops, clams, mussels, oysters', 
      crossContactRisk: 'Shared fryers, shared cooking water' 
    },
    { 
      allergenId: 'ALG-TREENUTS', 
      allergenName: 'Tree Nuts', 
      isMajorAllergen: true, 
      commonSources: 'Almonds, cashews, walnuts, pecans, pistachios, pine nuts, macadamia', 
      crossContactRisk: 'Shared processing equipment, toppings' 
    },
    { 
      allergenId: 'ALG-PEANUTS', 
      allergenName: 'Peanuts', 
      isMajorAllergen: true, 
      commonSources: 'Peanuts, peanut butter, peanut oil, some Asian sauces', 
      crossContactRisk: 'Shared equipment, fryers' 
    },
    { 
      allergenId: 'ALG-WHEAT', 
      allergenName: 'Wheat', 
      isMajorAllergen: true, 
      commonSources: 'Bread, pasta, flour, crackers, breaded items, soy sauce', 
      crossContactRisk: 'Shared prep areas, fryers' 
    },
    { 
      allergenId: 'ALG-SOY', 
      allergenName: 'Soybeans', 
      isMajorAllergen: true, 
      commonSources: 'Soy sauce, tofu, edamame, miso, tempeh, soy milk, vegetable oil', 
      crossContactRisk: 'Shared fryers, Asian cooking' 
    },
    { 
      allergenId: 'ALG-SESAME', 
      allergenName: 'Sesame', 
      isMajorAllergen: true, 
      commonSources: 'Sesame seeds, sesame oil, tahini, hummus, some bread', 
      crossContactRisk: 'Shared prep areas, toppings' 
    },
    { 
      allergenId: 'ALG-GLUTEN', 
      allergenName: 'Gluten', 
      isMajorAllergen: false, 
      commonSources: 'Wheat, barley, rye, some oats, malt', 
      crossContactRisk: 'Shared water, fryers, prep areas' 
    },
    { 
      allergenId: 'ALG-SULFITES', 
      allergenName: 'Sulfites', 
      isMajorAllergen: false, 
      commonSources: 'Wine, dried fruit, some processed foods', 
      crossContactRisk: 'Not typically cross-contact' 
    },
  ]).onConflictDoNothing();
}

/**
 * Food Composition Sources (international nutrient databases)
 */
async function seedFoodCompositionSources(db: BetterSQLite3Database) {
  console.log('  Seeding food composition sources...');
  
  await db.insert(foodCompositionSources).values([
    { 
      sourceId: 'USDA-FDC', 
      sourceName: 'USDA FoodData Central', 
      sourceCountry: 'US', 
      sourceOrganization: 'U.S. Department of Agriculture', 
      sourceUrl: 'https://fdc.nal.usda.gov/', 
      apiAvailable: true, 
      apiEndpoint: 'https://api.nal.usda.gov/fdc/v1/', 
      dataVersion: 'FDC 2024', 
      lastUpdated: '2024-10-01', 
      itemCount: 400000, 
      notes: 'Primary US database, includes SR Legacy, Foundation, Branded, FNDDS' 
    },
    { 
      sourceId: 'USDA-SR-LEGACY', 
      sourceName: 'USDA SR Legacy', 
      sourceCountry: 'US', 
      sourceOrganization: 'U.S. Department of Agriculture', 
      sourceUrl: 'https://fdc.nal.usda.gov/', 
      apiAvailable: true, 
      apiEndpoint: 'https://api.nal.usda.gov/fdc/v1/', 
      dataVersion: 'SR Legacy April 2019', 
      lastUpdated: '2019-04-01', 
      itemCount: 7500, 
      notes: 'Standard Reference Legacy dataset, curated ~7,500 items' 
    },
    { 
      sourceId: 'USDA-FNDDS', 
      sourceName: 'USDA FNDDS', 
      sourceCountry: 'US', 
      sourceOrganization: 'U.S. Department of Agriculture', 
      sourceUrl: 'https://fdc.nal.usda.gov/', 
      apiAvailable: true, 
      apiEndpoint: 'https://api.nal.usda.gov/fdc/v1/', 
      dataVersion: 'FNDDS 2021-2023', 
      lastUpdated: '2023-01-01', 
      itemCount: 9000, 
      notes: 'Food and Nutrient Database for Dietary Studies' 
    },
    { 
      sourceId: 'CA-CNF', 
      sourceName: 'Canadian Nutrient File', 
      sourceCountry: 'CA', 
      sourceOrganization: 'Health Canada', 
      sourceUrl: 'https://food-nutrition.canada.ca/cnf-fce/', 
      apiAvailable: true, 
      apiEndpoint: 'https://food-nutrition.canada.ca/api/canadian-nutrient-file/', 
      dataVersion: 'CNF 2015', 
      lastUpdated: '2015-01-01', 
      itemCount: 6000, 
      notes: 'Official Canadian food composition database' 
    },
    { 
      sourceId: 'UK-COFID', 
      sourceName: 'Composition of Foods Integrated Dataset', 
      sourceCountry: 'GB', 
      sourceOrganization: 'Public Health England', 
      sourceUrl: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: 'CoFID 2021', 
      lastUpdated: '2021-03-01', 
      itemCount: 3000, 
      notes: 'McCance and Widdowson data' 
    },
    { 
      sourceId: 'UK-MW', 
      sourceName: 'McCance and Widdowson', 
      sourceCountry: 'GB', 
      sourceOrganization: 'Royal Society of Chemistry', 
      sourceUrl: 'https://www.rsc.org/', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: '8th Edition', 
      lastUpdated: '2021-01-01', 
      itemCount: 3000, 
      notes: 'The Composition of Foods, reference edition' 
    },
    { 
      sourceId: 'DE-BLS', 
      sourceName: 'Bundeslebensmittelschlüssel', 
      sourceCountry: 'DE', 
      sourceOrganization: 'Max Rubner-Institut', 
      sourceUrl: 'https://www.blsdb.de/', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: 'BLS 3.02', 
      lastUpdated: '2022-01-01', 
      itemCount: 15000, 
      notes: 'German Federal Food Key' 
    },
    { 
      sourceId: 'FR-CIQUAL', 
      sourceName: 'CIQUAL French Food Composition Table', 
      sourceCountry: 'FR', 
      sourceOrganization: 'ANSES', 
      sourceUrl: 'https://ciqual.anses.fr/', 
      apiAvailable: true, 
      apiEndpoint: 'https://ciqual.anses.fr/api/', 
      dataVersion: 'CIQUAL 2020', 
      lastUpdated: '2020-01-01', 
      itemCount: 3100, 
      notes: 'French national food composition database' 
    },
    { 
      sourceId: 'NL-NEVO', 
      sourceName: 'NEVO Dutch Food Composition Database', 
      sourceCountry: 'NL', 
      sourceOrganization: 'RIVM', 
      sourceUrl: 'https://www.rivm.nl/en/dutch-food-composition-database', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: 'NEVO 2021', 
      lastUpdated: '2021-01-01', 
      itemCount: 2100, 
      notes: 'Netherlands food composition data' 
    },
    { 
      sourceId: 'AU-AFCD', 
      sourceName: 'Australian Food Composition Database', 
      sourceCountry: 'AU', 
      sourceOrganization: 'Food Standards Australia New Zealand', 
      sourceUrl: 'https://www.foodstandards.gov.au/science/monitoringnutrients/afcd', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: 'AFCD Release 2', 
      lastUpdated: '2022-01-01', 
      itemCount: 5700, 
      notes: 'Australian and New Zealand foods' 
    },
    { 
      sourceId: 'JP-SFCT', 
      sourceName: 'Standard Tables of Food Composition in Japan', 
      sourceCountry: 'JP', 
      sourceOrganization: 'MEXT', 
      sourceUrl: 'https://www.mext.go.jp/en/', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: '8th Revised Edition', 
      lastUpdated: '2020-01-01', 
      itemCount: 2400, 
      notes: 'Japanese food composition tables' 
    },
    { 
      sourceId: 'INT-INFOODS', 
      sourceName: 'FAO/INFOODS', 
      sourceCountry: 'INT', 
      sourceOrganization: 'Food and Agriculture Organization', 
      sourceUrl: 'https://www.fao.org/infoods/', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: null, 
      lastUpdated: null, 
      itemCount: null, 
      notes: 'International network, guidelines and regional databases' 
    },
    { 
      sourceId: 'EU-EUROFIR', 
      sourceName: 'EuroFIR AISBL', 
      sourceCountry: 'INT', 
      sourceOrganization: 'EuroFIR Association', 
      sourceUrl: 'https://www.eurofir.org/', 
      apiAvailable: false, 
      apiEndpoint: null, 
      dataVersion: null, 
      lastUpdated: null, 
      itemCount: null, 
      notes: 'European Food Information Resource network, coordinates national DBs' 
    },
  ]).onConflictDoNothing();
}

/**
 * Meal Periods (standard institutional meal schedule)
 * 
 * Note: These are system-wide defaults (tenantId = null).
 * Tenants can create their own custom meal periods.
 */
async function seedMealPeriods(db: BetterSQLite3Database) {
  console.log('  Seeding meal periods...');
  
  await db.insert(mealPeriods).values([
    { 
      mealPeriodId: 'MP-BRKFST', 
      tenantId: null,
      mealPeriodName: 'Breakfast', 
      typicalStartTime: '06:30', 
      typicalEndTime: '09:00', 
      targetCaloriesMin: 400, 
      targetCaloriesMax: 600, 
      isRequired: true, 
      sortOrder: 1, 
      notes: 'Morning meal' 
    },
    { 
      mealPeriodId: 'MP-AMSNACK', 
      tenantId: null,
      mealPeriodName: 'AM Snack', 
      typicalStartTime: '10:00', 
      typicalEndTime: '10:30', 
      targetCaloriesMin: 100, 
      targetCaloriesMax: 200, 
      isRequired: false, 
      sortOrder: 2, 
      notes: 'Mid-morning snack' 
    },
    { 
      mealPeriodId: 'MP-LUNCH', 
      tenantId: null,
      mealPeriodName: 'Lunch', 
      typicalStartTime: '11:30', 
      typicalEndTime: '13:30', 
      targetCaloriesMin: 550, 
      targetCaloriesMax: 750, 
      isRequired: true, 
      sortOrder: 3, 
      notes: 'Midday meal' 
    },
    { 
      mealPeriodId: 'MP-PMSNACK', 
      tenantId: null,
      mealPeriodName: 'PM Snack', 
      typicalStartTime: '15:00', 
      typicalEndTime: '15:30', 
      targetCaloriesMin: 100, 
      targetCaloriesMax: 200, 
      isRequired: false, 
      sortOrder: 4, 
      notes: 'Afternoon snack' 
    },
    { 
      mealPeriodId: 'MP-DINNER', 
      tenantId: null,
      mealPeriodName: 'Dinner', 
      typicalStartTime: '17:00', 
      typicalEndTime: '19:00', 
      targetCaloriesMin: 600, 
      targetCaloriesMax: 850, 
      isRequired: true, 
      sortOrder: 5, 
      notes: 'Evening meal' 
    },
    { 
      mealPeriodId: 'MP-HSSNACK', 
      tenantId: null,
      mealPeriodName: 'HS Snack', 
      typicalStartTime: '20:00', 
      typicalEndTime: '21:00', 
      targetCaloriesMin: 150, 
      targetCaloriesMax: 250, 
      isRequired: false, 
      sortOrder: 6, 
      notes: 'Bedtime snack - required in some care facilities' 
    },
  ]).onConflictDoNothing();
}

/**
 * Diet Types (Regular, Therapeutic, Texture-Modified, Allergy, Religious, Lifestyle)
 * 
 * Note: These are system-wide defaults (tenantId = null).
 * Tenants can create their own custom diet types.
 */
async function seedDietTypes(db: BetterSQLite3Database) {
  console.log('  Seeding diet types...');
  
  await db.insert(dietTypes).values([
    { 
      dietTypeId: 'DIET-REG', 
      tenantId: null,
      dietTypeName: 'Regular', 
      dietCategory: 'Regular', 
      description: 'Standard diet with no restrictions', 
      restrictions: null, 
      requiredModifications: null, 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: false, 
      status: 'Active', 
      notes: 'Default diet for most customers' 
    },
    { 
      dietTypeId: 'DIET-VEGAN', 
      tenantId: null,
      dietTypeName: 'Vegan', 
      dietCategory: 'Lifestyle', 
      description: 'No animal products', 
      restrictions: 'Meat, poultry, fish, dairy, eggs, honey', 
      requiredModifications: 'Plant-based protein alternatives', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: false, 
      status: 'Active', 
      notes: null 
    },
    { 
      dietTypeId: 'DIET-VEGET', 
      tenantId: null,
      dietTypeName: 'Vegetarian', 
      dietCategory: 'Lifestyle', 
      description: 'No meat or fish, dairy and eggs allowed', 
      restrictions: 'Meat, poultry, fish', 
      requiredModifications: 'Vegetable protein alternatives', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: false, 
      status: 'Active', 
      notes: null 
    },
    { 
      dietTypeId: 'DIET-GF', 
      tenantId: null,
      dietTypeName: 'Gluten Free', 
      dietCategory: 'Allergy', 
      description: 'No gluten-containing grains', 
      restrictions: 'Wheat, barley, rye, some oats', 
      requiredModifications: 'Gluten-free alternatives for bread, pasta', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: false, 
      status: 'Active', 
      notes: null 
    },
    { 
      dietTypeId: 'DIET-LOWNA', 
      tenantId: null,
      dietTypeName: 'Low Sodium', 
      dietCategory: 'Therapeutic', 
      description: 'Sodium restricted diet', 
      restrictions: 'Added salt, high-sodium foods', 
      requiredModifications: 'No added salt in cooking, low-sodium alternatives', 
      calorieTarget: 2000, 
      sodiumLimitMg: 2000, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'Common for cardiac and renal patients' 
    },
    { 
      dietTypeId: 'DIET-DIAB', 
      tenantId: null,
      dietTypeName: 'Diabetic/Carb Controlled', 
      dietCategory: 'Therapeutic', 
      description: 'Consistent carbohydrate diet', 
      restrictions: 'Concentrated sweets, excessive carbs', 
      requiredModifications: 'Consistent carb portions, sugar-free desserts', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: 60, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'Carb limit is per meal' 
    },
    { 
      dietTypeId: 'DIET-RENAL', 
      tenantId: null,
      dietTypeName: 'Renal', 
      dietCategory: 'Therapeutic', 
      description: 'Kidney disease diet', 
      restrictions: 'High potassium, phosphorus, sodium foods', 
      requiredModifications: 'Modified protein, potassium, phosphorus', 
      calorieTarget: 2000, 
      sodiumLimitMg: 2000, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'Requires RD supervision' 
    },
    { 
      dietTypeId: 'DIET-CARDIAC', 
      tenantId: null,
      dietTypeName: 'Cardiac/Heart Healthy', 
      dietCategory: 'Therapeutic', 
      description: 'Heart healthy diet', 
      restrictions: 'High fat, high sodium, fried foods', 
      requiredModifications: 'Low saturated fat, low sodium', 
      calorieTarget: 2000, 
      sodiumLimitMg: 2000, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: null 
    },
    { 
      dietTypeId: 'DIET-PUREED', 
      tenantId: null,
      dietTypeName: 'Pureed', 
      dietCategory: 'Texture-Modified', 
      description: 'All foods pureed to smooth consistency', 
      restrictions: 'Any texture', 
      requiredModifications: 'All items pureed, proper consistency', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'For dysphagia' 
    },
    { 
      dietTypeId: 'DIET-MECHSOFT', 
      tenantId: null,
      dietTypeName: 'Mechanical Soft', 
      dietCategory: 'Texture-Modified', 
      description: 'Soft, moist foods requiring minimal chewing', 
      restrictions: 'Tough meats, raw vegetables, hard foods', 
      requiredModifications: 'Ground or finely chopped proteins', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'For chewing difficulties' 
    },
    { 
      dietTypeId: 'DIET-CLRLIQ', 
      tenantId: null,
      dietTypeName: 'Clear Liquid', 
      dietCategory: 'Therapeutic', 
      description: 'Clear liquids only', 
      restrictions: 'All solid foods, milk products', 
      requiredModifications: 'Broth, juice, gelatin, popsicles only', 
      calorieTarget: 500, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'Short-term pre/post procedure' 
    },
    { 
      dietTypeId: 'DIET-FULLLIQ', 
      tenantId: null,
      dietTypeName: 'Full Liquid', 
      dietCategory: 'Therapeutic', 
      description: 'All liquids and foods liquid at room temperature', 
      restrictions: 'Solid foods', 
      requiredModifications: 'Include milk, cream soups, ice cream', 
      calorieTarget: 1200, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: true, 
      status: 'Active', 
      notes: 'Transition diet' 
    },
    { 
      dietTypeId: 'DIET-HALAL', 
      tenantId: null,
      dietTypeName: 'Halal', 
      dietCategory: 'Religious', 
      description: 'Prepared according to Islamic law', 
      restrictions: 'Pork, alcohol, non-halal meat', 
      requiredModifications: 'Halal-certified meats only', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: false, 
      status: 'Active', 
      notes: null 
    },
    { 
      dietTypeId: 'DIET-KOSHER', 
      tenantId: null,
      dietTypeName: 'Kosher', 
      dietCategory: 'Religious', 
      description: 'Prepared according to Jewish dietary law', 
      restrictions: 'Pork, shellfish, mixing meat/dairy', 
      requiredModifications: 'Kosher-certified products, separate prep', 
      calorieTarget: 2000, 
      sodiumLimitMg: null, 
      carbLimitG: null, 
      requiresDietitianApproval: false, 
      status: 'Active', 
      notes: null 
    },
  ]).onConflictDoNothing();
}

// Export individual seed functions for selective seeding
export {
  seedUnitsOfMeasure,
  seedFoodCategories,
  seedAllergens,
  seedFoodCompositionSources,
  seedMealPeriods,
  seedDietTypes,
};

