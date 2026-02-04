-- ============================================================================
-- Food Service Management Database Schema
-- SQLite3 DDL Script (Multi-Tenant Architecture)
-- 
-- Based on principles from "Foodservice Management: Principles and Practices"
-- (13th Edition) by Payne-Palacio & Theis
--
-- This schema implements a comprehensive food service management system for
-- institutional operations (hospitals, nursing homes, schools) supporting:
--   - Menu Planning & Cycle Menus
--   - Recipe Standardization with costing and portion control
--   - Dietary Management (regular and therapeutic/modified diets)
--   - Procurement (vendor management, purchasing, receiving)
--   - Inventory Control (perpetual and physical inventory)
--   - Production Scheduling and Forecasting
--   - Service & Delivery (patient/diner meal orders, tray service)
--
-- MULTI-TENANT ARCHITECTURE:
-- This schema supports multiple independent organizations (tenants) with three
-- tenant isolation patterns:
--
--   1. UNIVERSAL (no tenant_id): Reference data shared across all tenants
--      - units_of_measure, food_categories, allergens
--
--   2. OPTIONAL TENANT (tenant_id nullable): System-wide + tenant-specific data
--      - NULL tenant_id = system/shared data accessible to all tenants
--      - Non-NULL tenant_id = tenant-specific data (private to that tenant)
--      - Applies to: meal_periods, diet_types, recipes, ingredients, 
--        product_specifications
--
--   3. REQUIRED TENANT (tenant_id NOT NULL): Operational data isolated per tenant
--      - All operational tables require tenant_id for data isolation
--      - Applies to: sites, employees, cycle_menus, diners, vendors, 
--        inventory, production_schedules, etc.
--
-- Query Pattern for Optional Tenant Tables:
--   SELECT * FROM recipes 
--   WHERE tenant_id IS NULL OR tenant_id = :current_tenant_id
--
-- Query Pattern for Required Tenant Tables:
--   SELECT * FROM sites WHERE tenant_id = :current_tenant_id
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- TENANT TABLE
-- Core table for multi-tenant support. All tenant-specific data references
-- this table. System-wide data uses NULL tenant_id.
-- ============================================================================

CREATE TABLE tenants (
    tenant_id TEXT PRIMARY KEY,             -- Unique identifier (e.g., 'TEN-001')
    tenant_name TEXT NOT NULL,              -- Organization name
    tenant_code TEXT NOT NULL UNIQUE,       -- Short code for display/URLs
    contact_name TEXT,                      -- Primary contact person
    contact_email TEXT,                     -- Contact email
    contact_phone TEXT,                     -- Contact phone
    address TEXT,                           -- Business address
    city TEXT,
    state TEXT,
    zip TEXT,
    country_code TEXT DEFAULT 'US',         -- ISO 3166-1 alpha-2 country code
    default_food_comp_source_id TEXT,       -- Preferred food composition database for nutrient lookups
    subscription_tier TEXT NOT NULL DEFAULT 'Standard' CHECK (subscription_tier IN (
        'Basic', 'Standard', 'Premium', 'Enterprise'
    )),                                     -- Service tier for feature access
    max_sites INTEGER DEFAULT 5,            -- Maximum allowed sites
    max_users INTEGER DEFAULT 50,           -- Maximum allowed users
    created_date DATE NOT NULL,             -- When tenant was created
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Suspended', 'Trial', 'Cancelled'
    )),
    notes TEXT
    -- Note: FK to food_composition_sources cannot be added here due to table creation order.
    -- Enforce via application logic or add constraint after food_composition_sources exists.
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_code ON tenants(tenant_code);
CREATE INDEX idx_tenants_country ON tenants(country_code);
CREATE INDEX idx_tenants_food_comp ON tenants(default_food_comp_source_id);

-- ============================================================================
-- REFERENCE TABLES
-- These foundational tables provide standardized lookup values used throughout
-- the system. They should be populated first as they are referenced by foreign
-- keys in other tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: units_of_measure
-- 
-- Defines standard units for measuring ingredients, yields, and portions.
-- Consistency in units is fundamental to recipe standardization. The textbook
-- states: "A recipe is standardized when it has been tested and adapted to the
-- requirements of the specific facility... ensuring consistency of each aspect
-- of quality every time a menu item is prepared."
--
-- The conversion_to_base field enables automatic unit conversions for recipe
-- scaling using the factor method and percentage method of recipe adjustment.
-- ----------------------------------------------------------------------------
CREATE TABLE units_of_measure (
    unit_id TEXT PRIMARY KEY,              -- Unique identifier (e.g., 'UOM-LB', 'UOM-CUP')
    unit_name TEXT NOT NULL,               -- Full name (e.g., 'Pound', 'Cup')
    unit_abbreviation TEXT NOT NULL,       -- Standard abbreviation (e.g., 'lb', 'c')
    unit_type TEXT NOT NULL CHECK (unit_type IN ('Weight', 'Volume', 'Count', 'Each')),  -- Category of unit
    conversion_to_base REAL,               -- Conversion factor to base unit for calculations
    base_unit TEXT                         -- The base unit for this type (e.g., 'lb' for weight)
);

-- ----------------------------------------------------------------------------
-- TABLE: food_categories
-- 
-- Classifies ingredients for organization, storage management, and inventory
-- control. The storage_type field connects to the three basic types of storage
-- described in the textbook: dry storage, refrigerated storage, and freezer
-- storage. Per the textbook: "Foods should be stored using the FIFO (first-in/
-- first-out) method" - categories help organize this process.
-- ----------------------------------------------------------------------------
CREATE TABLE food_categories (
    category_id TEXT PRIMARY KEY,          -- Unique identifier (e.g., 'CAT-DAIRY')
    category_name TEXT NOT NULL,           -- Descriptive name (e.g., 'Dairy & Eggs')
    storage_type TEXT NOT NULL CHECK (storage_type IN ('Dry', 'Refrigerated', 'Frozen')),  -- Storage requirement
    sort_order INTEGER NOT NULL            -- Display ordering for reports and interfaces
);

-- ----------------------------------------------------------------------------
-- TABLE: allergens
-- 
-- Tracks major food allergens for labeling, dietary management, and allergen
-- risk reduction programs. The textbook states: "90 percent of food allergies
-- are caused by eight common foods; collectively referred to as 'the big 8.'
-- These include milk, eggs, fish, shellfish, wheat, soy, peanuts, and tree
-- nuts." (Sesame was added as a major allergen in 2023.)
--
-- Supports Food Allergen Labeling and Consumer Protection Act (FALCPA)
-- compliance and enables building an Allergen Risk Reduction Program.
-- ----------------------------------------------------------------------------
CREATE TABLE allergens (
    allergen_id TEXT PRIMARY KEY,          -- Unique identifier (e.g., 'ALG-MILK')
    allergen_name TEXT NOT NULL,           -- Name of allergen (e.g., 'Milk')
    is_major_allergen INTEGER NOT NULL DEFAULT 1 CHECK (is_major_allergen IN (0, 1)),  -- 1 if FDA major allergen
    common_sources TEXT,                   -- Foods commonly containing this allergen
    cross_contact_risk TEXT                -- Cross-contamination risk information for kitchen safety
);

-- ----------------------------------------------------------------------------
-- TABLE: food_composition_sources
-- 
-- Registry of national and international food composition databases. Supports
-- international deployments where different regions use different official
-- nutrient databases (USDA FoodData Central, UK CoFID, Canadian CNF, etc.).
-- 
-- This enables:
--   - International deployment with region-appropriate nutrient sources
--   - Regulatory compliance using official national databases
--   - Cross-referencing ingredients across multiple databases
-- ----------------------------------------------------------------------------
CREATE TABLE food_composition_sources (
    source_id TEXT PRIMARY KEY,            -- Unique identifier (e.g., 'USDA-FDC', 'UK-COFID')
    source_name TEXT NOT NULL,             -- Full name of the database
    source_country TEXT,                   -- ISO 3166-1 alpha-2 country code, or 'INT' for international
    source_organization TEXT,              -- Maintaining organization
    source_url TEXT,                       -- Database URL for reference
    api_available INTEGER DEFAULT 0 CHECK (api_available IN (0, 1)),  -- 1 if API exists for lookups
    api_endpoint TEXT,                     -- API base URL if available
    data_version TEXT,                     -- Version/edition of the database
    last_updated DATE,                     -- When source data was last updated
    item_count INTEGER,                    -- Approximate number of food items
    notes TEXT
);

-- ============================================================================
-- ORGANIZATION TABLES
-- Define the physical and organizational structure of the foodservice operation.
-- The textbook describes various foodservice systems including conventional
-- kitchens, commissary (central production), satellite facilities, and
-- assembly/serve operations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: sites
-- 
-- Represents physical locations where food is prepared and/or served. Supports
-- multi-site operations common in healthcare systems and school districts. The
-- has_production_kitchen field distinguishes between production and satellite
-- locations. The textbook notes: "In planning, there should be a straight line
-- from the receiving dock to the storeroom and refrigerators."
-- ----------------------------------------------------------------------------
CREATE TABLE sites (
    site_id TEXT PRIMARY KEY,              -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    site_name TEXT NOT NULL,               -- Name of the location
    site_type TEXT NOT NULL CHECK (site_type IN (
        'Kitchen', 'Dining Hall', 'Satellite', 'Commissary', 'Cafeteria'
    )),                                    -- Type of facility
    address TEXT,                          -- Physical address
    capacity_seats INTEGER,                -- Seating capacity (for dining areas)
    has_production_kitchen INTEGER NOT NULL DEFAULT 0 CHECK (has_production_kitchen IN (0, 1)),  -- 1 if site has cooking capability
    storage_dry_sqft REAL,                 -- Dry storage capacity in square feet
    storage_refrigerated_sqft REAL,        -- Refrigerated storage capacity
    storage_freezer_sqft REAL,             -- Freezer storage capacity
    manager_name TEXT,                     -- Site manager name
    phone TEXT,                            -- Contact phone number
    operating_hours TEXT,                  -- Operating hours description
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Seasonal')),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: stations
-- 
-- Defines service points within a site (grill, salad bar, trayline, etc.).
-- Station types reflect service styles described in the textbook: self-service,
-- tray service, wait service. The requires_temp_log field supports HACCP
-- (Hazard Analysis and Critical Control Point) compliance. Healthcare facilities
-- typically include trayline stations for patient meal assembly.
-- ----------------------------------------------------------------------------
CREATE TABLE stations (
    station_id TEXT PRIMARY KEY,           -- Unique identifier
    site_id TEXT NOT NULL,                 -- Reference to parent site
    station_name TEXT NOT NULL,            -- Name of the station
    station_type TEXT NOT NULL CHECK (station_type IN (
        'Grill', 'Steam Table', 'Cold Bar', 'Salad Bar', 'Trayline', 
        'Beverage', 'Dessert', 'À la Carte', 'Grab-and-Go'
    )),                                    -- Type of service station
    capacity_covers_per_hour INTEGER,      -- Service capacity (customers per hour)
    equipment_list TEXT,                   -- Equipment assigned to this station
    requires_temp_log INTEGER NOT NULL DEFAULT 0 CHECK (requires_temp_log IN (0, 1)),  -- 1 if HACCP temp logging required
    service_style TEXT NOT NULL CHECK (service_style IN (
        'Self-Service', 'Attended', 'Tray Service', 'Counter Service'
    )),                                    -- How food is served at this station
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Inactive', 'Under Maintenance'
    )),
    notes TEXT,
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- TABLE: employees
-- 
-- Tracks food service staff for scheduling, certification tracking, and work
-- assignment. Job titles reflect the organizational hierarchy described in the
-- textbook's chapters on staffing. The certifications field tracks food safety
-- certifications (ServSafe, etc.) required by regulations. The textbook
-- emphasizes: "The foodservice manager plays a leadership role in the
-- prevention of foodborne illness" - trained staff are essential.
-- ----------------------------------------------------------------------------
CREATE TABLE employees (
    employee_id TEXT PRIMARY KEY,          -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    primary_site_id TEXT NOT NULL,         -- Main work location
    job_title TEXT NOT NULL CHECK (job_title IN (
        'Cook', 'Prep Cook', 'Server', 'Dishwasher', 'Supervisor', 
        'Manager', 'Dietitian', 'Receiving Clerk', 'Storeroom Clerk',
        'Tray Assembler', 'Cashier', 'Utility Worker'
    )),                                    -- Position/role
    hire_date DATE NOT NULL,
    hourly_rate REAL,                      -- Wage rate for labor costing
    certifications TEXT,                   -- Food safety and other certifications held
    certification_expiry DATE,             -- When certifications expire (for renewal tracking)
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'On Leave', 'Terminated'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (primary_site_id) REFERENCES sites(site_id)
);

-- ============================================================================
-- MENU PLANNING TABLES
-- Implements the menu planning framework described extensively in Chapter 5
-- of the textbook. The menu is the control document that drives all other
-- operations: purchasing, production schedules, staffing, and equipment use.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: meal_periods
-- 
-- Defines meal periods (Breakfast, Lunch, Dinner, Snacks) with nutritional
-- targets. Supports meal patterns including the standard three meals plus
-- snacks. The textbook notes that healthcare regulations often "mandate a
-- bedtime snack for all residents." Calorie targets support nutritional
-- planning for institutional feeding programs.
-- ----------------------------------------------------------------------------
CREATE TABLE meal_periods (
    meal_period_id TEXT PRIMARY KEY,       -- Unique identifier (e.g., 'MP-BRKFST')
    tenant_id TEXT,                        -- NULL = system-wide, value = tenant-specific
    meal_period_name TEXT NOT NULL,        -- Name (e.g., 'Breakfast', 'Lunch')
    typical_start_time TEXT NOT NULL,      -- Standard start time (SQLite stores time as TEXT)
    typical_end_time TEXT NOT NULL,        -- Standard end time
    target_calories_min INTEGER,           -- Minimum calorie target for this meal
    target_calories_max INTEGER,           -- Maximum calorie target for this meal
    is_required INTEGER NOT NULL DEFAULT 1 CHECK (is_required IN (0, 1)),  -- 1 for main meals, 0 for optional snacks
    sort_order INTEGER NOT NULL,           -- Display ordering throughout the day
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: diet_types
-- 
-- Defines regular and therapeutic/modified diets. Critical for healthcare
-- foodservice. The textbook states: "In many foodservice operations, especially
-- those affiliated with health care, the foodservice department is responsible
-- for ensuring that physician-ordered diets are provided."
--
-- Diet categories from the textbook:
--   - Regular: Standard diet with no restrictions
--   - Therapeutic: Medically prescribed (low sodium, cardiac, renal, diabetic)
--   - Texture-Modified: For dysphagia patients (pureed, mechanical soft)
--   - Allergy: Allergen avoidance (gluten-free)
--   - Religious: Halal, Kosher
--   - Lifestyle: Vegetarian, Vegan
--
-- The textbook notes: "Modified menu extensions are generated from the master
-- menu and a diet manual that defines the modified diets for a particular
-- facility."
-- ----------------------------------------------------------------------------
CREATE TABLE diet_types (
    diet_type_id TEXT PRIMARY KEY,         -- Unique identifier (e.g., 'DIET-REG', 'DIET-DIAB')
    tenant_id TEXT,                        -- NULL = system-wide, value = tenant-specific
    diet_type_name TEXT NOT NULL,          -- Name of diet (e.g., 'Regular', 'Diabetic/Carb Controlled')
    diet_category TEXT NOT NULL CHECK (diet_category IN (
        'Regular', 'Therapeutic', 'Texture-Modified', 'Allergy', 'Religious', 'Lifestyle'
    )),                                    -- Classification category
    description TEXT NOT NULL,             -- Detailed description of the diet
    restrictions TEXT,                     -- Foods/ingredients that must be avoided
    required_modifications TEXT,           -- Required substitutions or modifications
    calorie_target INTEGER,                -- Daily calorie target if applicable
    sodium_limit_mg INTEGER,               -- Daily sodium limit in mg (for low-sodium diets)
    carb_limit_g INTEGER,                  -- Carbohydrate limit per meal (for diabetic diets)
    requires_dietitian_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_dietitian_approval IN (0, 1)),  -- 1 if RD must approve
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: cycle_menus
-- 
-- Implements the cycle menu concept: "A cycle menu is a planned set of menus
-- that rotate at definite intervals of a few days to several weeks."
--
-- Advantages of cycle menus (from textbook):
--   - "After initial planning has been completed, time is freed for the
--     planner to review and revise menus"
--   - "Repetition of the same menu aids in standardizing preparation
--     procedures and in efficient use of equipment"
--   - "Forecasting and purchasing are simplified"
--   - "Employee workloads can be balanced and distributed evenly"
--
-- The season field addresses: "Many foodservices solve [seasonal variation]
-- by developing summer, fall, winter, and spring cycles."
--
-- Typical cycle lengths vary by setting:
--   - Hospitals: Shorter cycles (1-2 weeks) due to reduced patient stays
--   - Long-term care/Corrections: Longer cycles (3-8 weeks)
-- ----------------------------------------------------------------------------
CREATE TABLE cycle_menus (
    cycle_menu_id TEXT PRIMARY KEY,        -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    cycle_name TEXT NOT NULL,              -- Descriptive name (e.g., 'Spring 2026 4-Week Cycle')
    season TEXT NOT NULL CHECK (season IN (
        'Spring', 'Summer', 'Fall', 'Winter', 'Year-Round'
    )),                                    -- Seasonal applicability
    cycle_length_weeks INTEGER NOT NULL,   -- Number of weeks in the cycle
    start_date DATE NOT NULL,              -- When this cycle begins
    end_date DATE,                         -- When this cycle ends (NULL if ongoing)
    site_id TEXT,                          -- Site-specific menu (NULL = all sites)
    target_food_cost_per_meal REAL,        -- Budget target per meal
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Archived')),
    approved_by TEXT,                      -- Name of approving authority
    approval_date DATE,                    -- Date of approval
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

-- ============================================================================
-- RECIPE TABLES
-- Implements the standardized recipe concept, which the textbook calls "the
-- most important control tool" in food production. "A recipe is standardized
-- when it has been tested and adapted to the requirements of the specific
-- facility and to the demands of its clientele."
--
-- Benefits of standardized recipes (from textbook):
--   1. Consistency - Same quality every time
--   2. Nutritional accuracy - Essential in healthcare/schools
--   3. Cost control - Known food costs
--   4. Training tool - Communicates expectations to staff
--   5. Forecasting aid - Supports purchasing calculations
--   6. Production scheduling - Enables equipment planning
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: ingredients
-- 
-- Master list of ingredients/products used in recipes. Includes purchasing
-- information, yield factors, and inventory parameters.
--
-- NUTRIENT DATA STANDARD:
-- USDA FoodData Central (FDC) serves as the base standard for nutritional
-- data. The fdc_id column links directly to FDC for nutrient lookups.
-- For international deployments, the ingredient_food_composition_refs table
-- maps ingredients to other national databases (UK CoFID, Canadian CNF, etc.).
-- This allows recipes to be database-agnostic while supporting localized
-- nutrient reporting based on tenant's preferred food composition source.
--
-- Yield Percent (AP vs EP): The textbook emphasizes: "Standardized recipes
-- that include AP and EP (as purchased, and edible portion) weights of
-- ingredients, yields, pan sizes, and portion size are invaluable aids."
--   - AP (As Purchased): Weight/quantity as received from vendor
--   - EP (Edible Portion): Usable portion after trimming/waste
--   - Example: Carrots have ~81% yield (19% lost to peeling/trimming)
--
-- Inventory Levels: The textbook describes the mini-max system: "The maximum
-- inventory level is equal to the safety stock plus the estimated usage."
--   - Par level: Target inventory to maintain
--   - Reorder point: Level at which to place new order
-- ----------------------------------------------------------------------------
CREATE TABLE ingredients (
    ingredient_id TEXT PRIMARY KEY,        -- Unique identifier
    tenant_id TEXT,                        -- NULL = system-wide, value = tenant-specific
    ingredient_name TEXT NOT NULL,         -- Name of ingredient
    fdc_id INTEGER,                        -- USDA FoodData Central ID (base standard for nutrient data)
    food_category_id TEXT NOT NULL,        -- Reference to food_categories
    common_unit TEXT NOT NULL,             -- Standard unit for recipe use (e.g., 'lb', 'cup')
    purchase_unit TEXT NOT NULL,           -- Unit for purchasing (e.g., 'case', 'bag')
    purchase_unit_cost REAL,               -- Cost per purchase unit
    units_per_purchase_unit REAL,          -- How many common units per purchase unit
    cost_per_unit REAL,                    -- Calculated cost per common unit
    yield_percent REAL,                    -- EP yield from AP (e.g., 0.81 for 81%)
    storage_type TEXT NOT NULL CHECK (storage_type IN ('Dry', 'Refrigerated', 'Frozen')),
    shelf_life_days INTEGER,               -- Maximum storage time before quality degrades
    par_level REAL,                        -- Target inventory level to maintain
    reorder_point REAL,                    -- Quantity at which to trigger reorder
    preferred_vendor_id TEXT,              -- Default vendor for this ingredient
    product_spec_id TEXT,                  -- Link to detailed specifications
    allergen_flags TEXT,                   -- Comma-separated allergen codes (e.g., 'ALG-MILK,ALG-EGG')
    is_local INTEGER DEFAULT 0 CHECK (is_local IN (0, 1)),      -- 1 if locally sourced
    is_organic INTEGER DEFAULT 0 CHECK (is_organic IN (0, 1)),  -- 1 if organic certified
    usda_commodity INTEGER DEFAULT 0 CHECK (usda_commodity IN (0, 1)),  -- 1 if USDA commodity (schools)
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Discontinued', 'Seasonal'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (food_category_id) REFERENCES food_categories(category_id),
    FOREIGN KEY (common_unit) REFERENCES units_of_measure(unit_id),
    FOREIGN KEY (preferred_vendor_id) REFERENCES vendors(vendor_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: ingredient_food_composition_refs
-- 
-- Links ingredients to entries in external food composition databases (USDA,
-- UK CoFID, Canadian CNF, etc.). An ingredient may have references in multiple
-- databases, enabling international deployment and cross-validation.
--
-- The is_primary flag indicates which database reference should be used for
-- nutrient lookups for this ingredient. This allows:
--   - A UK hospital to use UK CoFID as primary
--   - A US school to use USDA FDC as primary
--   - Both to see alternative mappings for verification
-- ----------------------------------------------------------------------------
CREATE TABLE ingredient_food_composition_refs (
    ref_id TEXT PRIMARY KEY,               -- Unique identifier
    ingredient_id TEXT NOT NULL,           -- Reference to ingredient
    source_id TEXT NOT NULL,               -- Which food composition database
    external_id TEXT NOT NULL,             -- ID in that database (FDC ID, CNF code, etc.)
    external_name TEXT,                    -- Name as it appears in source database
    external_description TEXT,             -- Description from source database
    match_confidence TEXT NOT NULL DEFAULT 'Exact' CHECK (match_confidence IN (
        'Exact',                           -- Identical product
        'Close',                           -- Very similar, minor differences
        'Approximate',                     -- Similar category, nutrients may vary
        'Manual Override'                  -- Manually assigned despite differences
    )),
    is_primary INTEGER DEFAULT 0 CHECK (is_primary IN (0, 1)),  -- 1 if preferred source for nutrients
    verified_by TEXT,                      -- Who verified this mapping
    verified_date DATE,                    -- When mapping was verified
    notes TEXT,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES food_composition_sources(source_id),
    UNIQUE (ingredient_id, source_id)      -- One reference per source per ingredient
);

CREATE INDEX idx_food_comp_refs_ingredient ON ingredient_food_composition_refs(ingredient_id);
CREATE INDEX idx_food_comp_refs_source ON ingredient_food_composition_refs(source_id);
CREATE INDEX idx_food_comp_refs_external ON ingredient_food_composition_refs(source_id, external_id);
CREATE INDEX idx_food_comp_refs_primary ON ingredient_food_composition_refs(is_primary) WHERE is_primary = 1;

-- ----------------------------------------------------------------------------
-- TABLE: recipes
-- 
-- Master list of standardized recipes. The textbook states: "A recipe is
-- standardized when it has been tested and adapted to the requirements of
-- the specific facility."
--
-- Portion Control: The portion_utensil field (e.g., '#16 scoop') supports:
-- "Portion control is used to contain costs and ensure nutrient composition
-- of menu items."
--
-- HACCP Fields: The haccp_critical_limits, hold_temp_f, and max_hold_time_hours
-- fields support food safety documentation. "HACCP is based on assessment of
-- hazards at each step in the flow of food through a foodservice operation."
-- ----------------------------------------------------------------------------
CREATE TABLE recipes (
    recipe_id TEXT PRIMARY KEY,            -- Unique identifier
    tenant_id TEXT,                        -- NULL = system recipe, value = tenant-specific
    recipe_name TEXT NOT NULL,             -- Name of the recipe
    recipe_code TEXT,                      -- Internal code (for POS systems, production sheets)
    category TEXT NOT NULL CHECK (category IN (
        'Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread', 
        'Dessert', 'Sauce', 'Beverage', 'Breakfast', 'Appetizer', 'Condiment'
    )),                                    -- Menu category classification
    cuisine_type TEXT CHECK (cuisine_type IN (
        'American', 'Mexican', 'Asian', 'Italian', 'Mediterranean', 
        'Indian', 'French', 'Southern', 'Cajun', 'Caribbean', 
        'Middle Eastern', 'Other', NULL
    )),                                    -- Cuisine classification (optional)
    yield_quantity REAL NOT NULL,          -- Total yield amount
    yield_unit TEXT NOT NULL,              -- Unit of yield (portions, pans, etc.)
    portion_size TEXT NOT NULL,            -- Standard portion size description
    portion_utensil TEXT,                  -- Utensil for portioning (e.g., '#16 scoop', '4 oz ladle')
    prep_time_minutes INTEGER,             -- Preparation time
    cook_time_minutes INTEGER,             -- Cooking time
    cooking_temp_f INTEGER,                -- Cooking temperature in Fahrenheit
    cooking_method TEXT CHECK (cooking_method IN (
        'Bake', 'Roast', 'Grill', 'Steam', 'Sauté', 'Braise', 
        'Fry', 'Deep Fry', 'Simmer', 'Boil', 'Poach', 'No-Cook', NULL
    )),                                    -- Primary cooking method
    equipment_required TEXT,               -- Equipment needed for preparation
    pan_size TEXT,                         -- Pan size specification (e.g., 'Full hotel pan')
    pans_per_batch INTEGER,                -- Number of pans per batch
    weight_per_pan TEXT,                   -- Weight of filled pan (for production planning)
    food_cost_per_portion REAL,            -- Calculated food cost per serving
    calories_per_portion INTEGER,          -- Nutritional: calories
    protein_g REAL,                        -- Nutritional: protein grams
    carbs_g REAL,                          -- Nutritional: carbohydrate grams
    fat_g REAL,                            -- Nutritional: fat grams
    sodium_mg INTEGER,                     -- Nutritional: sodium milligrams
    fiber_g REAL,                          -- Nutritional: fiber grams
    allergens TEXT,                        -- Allergen warning information
    suitable_for_diets TEXT,               -- Comma-separated diet IDs this recipe works for
    haccp_critical_limits TEXT,            -- HACCP critical control point documentation
    hold_temp_f INTEGER,                   -- Safe holding temperature
    max_hold_time_hours REAL,              -- Maximum safe holding time
    variations TEXT,                       -- Recipe variation notes
    source TEXT,                           -- Recipe source/origin
    date_standardized DATE,                -- When recipe was tested and standardized
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Draft', 'Archived', 'Seasonal'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (yield_unit) REFERENCES units_of_measure(unit_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: recipe_ingredients
-- 
-- Links ingredients to recipes with quantities. Implements the ingredient list
-- portion of standardized recipes.
--
-- The is_ap_or_ep field is critical: determines whether quantity is before
-- or after yield loss. The textbook emphasizes tracking both AP and EP.
--
-- The calculated_cost field enables recipe costing: "The raw food cost is
-- found by costing the standardized recipe for each menu item."
-- ----------------------------------------------------------------------------
CREATE TABLE recipe_ingredients (
    recipe_ingredient_id TEXT PRIMARY KEY, -- Unique identifier
    recipe_id TEXT NOT NULL,               -- Reference to recipe
    ingredient_id TEXT NOT NULL,           -- Reference to ingredient
    quantity REAL NOT NULL,                -- Amount required
    unit_id TEXT NOT NULL,                 -- Unit of measure for this quantity
    is_ap_or_ep TEXT NOT NULL DEFAULT 'EP' CHECK (is_ap_or_ep IN ('AP', 'EP')),  -- As Purchased or Edible Portion
    prep_instruction TEXT,                 -- Preparation notes (e.g., 'diced', 'minced', 'julienne')
    sequence_order INTEGER,                -- Order in ingredient list (often by use order)
    is_optional INTEGER DEFAULT 0 CHECK (is_optional IN (0, 1)),  -- 1 if optional ingredient
    ingredient_group TEXT,                 -- Group heading (e.g., 'Sauce', 'Topping', 'Marinade')
    calculated_cost REAL,                  -- Cost for this ingredient in recipe
    notes TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    FOREIGN KEY (unit_id) REFERENCES units_of_measure(unit_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: menu_items
-- 
-- Places specific recipes on the cycle menu for particular days, meals, and
-- diet types. Implements the menu extension concept from the textbook:
-- "Modified menu extensions are generated from the master menu... A menu
-- extension should be planned for each day."
--
-- Choice Groups: The is_choice and choice_group fields support selective menus
-- where customers choose between options (e.g., "Chicken OR Fish for entrée").
--
-- Participation Rates: The estimated_participation field supports forecasting;
-- different menu items have different selection rates based on historical data.
-- ----------------------------------------------------------------------------
CREATE TABLE menu_items (
    menu_item_id TEXT PRIMARY KEY,         -- Unique identifier
    cycle_menu_id TEXT NOT NULL,           -- Reference to cycle menu
    week_number INTEGER NOT NULL,          -- Week within the cycle (1, 2, 3, etc.)
    day_of_week TEXT NOT NULL CHECK (day_of_week IN (
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    )),
    meal_period_id TEXT NOT NULL,          -- Reference to meal period
    menu_category TEXT NOT NULL CHECK (menu_category IN (
        'Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread', 
        'Dessert', 'Beverage', 'Condiment', 'Fruit', 'Milk'
    )),                                    -- Category for menu organization
    recipe_id TEXT NOT NULL,               -- Reference to recipe being served
    diet_type_id TEXT NOT NULL,            -- Which diet this menu item serves
    station_id TEXT,                       -- Service station (optional)
    portion_size TEXT NOT NULL,            -- Portion for this menu appearance
    is_choice INTEGER DEFAULT 0 CHECK (is_choice IN (0, 1)),  -- 1 if part of a choice group
    choice_group TEXT,                     -- Groups choices together (e.g., 'Entrée Choice')
    display_name TEXT,                     -- Override display name for menu (optional)
    estimated_participation REAL,          -- Expected selection rate (0.0-1.0) for forecasting
    notes TEXT,
    FOREIGN KEY (cycle_menu_id) REFERENCES cycle_menus(cycle_menu_id) ON DELETE CASCADE,
    FOREIGN KEY (meal_period_id) REFERENCES meal_periods(meal_period_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id),
    FOREIGN KEY (diet_type_id) REFERENCES diet_types(diet_type_id),
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

-- ============================================================================
-- DINER/CUSTOMER TABLES
-- Manages individuals being served, particularly important in healthcare
-- settings with individualized dietary requirements. The textbook describes
-- the complexity of "rapidly changing and increasingly complicated diet orders"
-- in healthcare foodservice.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: diners
-- 
-- Represents individuals being fed (patients, students, residents, staff).
--
-- Texture Modifications: For patients with swallowing difficulties (dysphagia):
--   - Regular: Normal textures
--   - Mechanical Soft: "Soft, moist foods requiring minimal chewing"
--   - Pureed: "All foods pureed to smooth consistency"
--   - Ground: Ground meats, soft vegetables
--
-- Liquid Consistency: For aspiration prevention:
--   - Regular: Normal thin liquids
--   - Thickened (Nectar/Honey): Thickened for safety
--   - NPO: Nothing by mouth (medical status)
--
-- The free_reduced_status field supports National School Lunch Program
-- compliance for school foodservice operations.
-- ----------------------------------------------------------------------------
CREATE TABLE diners (
    diner_id TEXT PRIMARY KEY,             -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    site_id TEXT NOT NULL,                 -- Location (hospital, school, etc.)
    room_number TEXT,                      -- Room/bed for delivery (healthcare)
    diner_type TEXT NOT NULL CHECK (diner_type IN (
        'Patient', 'Student', 'Resident', 'Staff', 'Visitor'
    )),                                    -- Type of customer
    admission_date DATE,                   -- When admitted/enrolled
    expected_discharge_date DATE,          -- Expected departure (healthcare)
    primary_diet_type_id TEXT NOT NULL,    -- Current diet order
    texture_modification TEXT CHECK (texture_modification IN (
        'Regular', 'Mechanical Soft', 'Pureed', 'Ground', NULL
    )),                                    -- Texture requirement for dysphagia
    liquid_consistency TEXT CHECK (liquid_consistency IN (
        'Regular', 'Thickened-Nectar', 'Thickened-Honey', 'NPO', NULL
    )),                                    -- Liquid thickness requirement
    allergies TEXT,                        -- Known food allergies
    dislikes TEXT,                         -- Food dislikes/preferences to avoid
    preferences TEXT,                      -- Food preferences to accommodate
    special_instructions TEXT,             -- Special feeding instructions
    feeding_assistance TEXT CHECK (feeding_assistance IN (
        'Independent', 'Setup', 'Feeding Assist', 'Tube Fed', NULL
    )),                                    -- Level of assistance needed
    meal_ticket_number TEXT,               -- Meal card/account number
    free_reduced_status TEXT CHECK (free_reduced_status IN (
        'Paid', 'Free', 'Reduced', NULL
    )),                                    -- School nutrition program status
    physician TEXT,                        -- Ordering physician (healthcare)
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Discharged', 'On Leave'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id),
    FOREIGN KEY (primary_diet_type_id) REFERENCES diet_types(diet_type_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: diet_assignments
-- 
-- Tracks diet order changes over time, creating an audit trail of dietary
-- modifications. Important for healthcare compliance and medical record-keeping.
-- Maintains history because diet orders change frequently during patient stays.
-- ----------------------------------------------------------------------------
CREATE TABLE diet_assignments (
    assignment_id TEXT PRIMARY KEY,        -- Unique identifier
    diner_id TEXT NOT NULL,                -- Reference to diner
    diet_type_id TEXT NOT NULL,            -- Assigned diet
    effective_date DATE NOT NULL,          -- When diet order takes effect
    end_date DATE,                         -- When diet order ends (NULL if current)
    ordered_by TEXT NOT NULL,              -- Physician or authority ordering
    reason TEXT,                           -- Reason for diet order/change
    texture_modification TEXT CHECK (texture_modification IN (
        'Regular', 'Mechanical Soft', 'Pureed', 'Ground', NULL
    )),
    liquid_consistency TEXT CHECK (liquid_consistency IN (
        'Regular', 'Thickened-Nectar', 'Thickened-Honey', 'NPO', NULL
    )),
    additional_restrictions TEXT,          -- Additional dietary restrictions beyond base diet
    created_date DATE NOT NULL,            -- Record creation date
    created_by TEXT NOT NULL,              -- Who entered the order
    notes TEXT,
    FOREIGN KEY (diner_id) REFERENCES diners(diner_id) ON DELETE CASCADE,
    FOREIGN KEY (diet_type_id) REFERENCES diet_types(diet_type_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: meal_orders
-- 
-- Individual meal orders/selections placed by or for diners. The textbook
-- describes: "Many hospitals today are converting their patient tray service
-- to hotel-style room service. This is in response to patient demand to eat
-- what they want, when they want it."
--
-- The tray_ticket_number supports trayline assembly where individual meal
-- trays are assembled and tracked for delivery.
-- ----------------------------------------------------------------------------
CREATE TABLE meal_orders (
    order_id TEXT PRIMARY KEY,             -- Unique identifier
    diner_id TEXT NOT NULL,                -- Who the order is for
    order_date DATE NOT NULL,              -- Date of the meal
    meal_period_id TEXT NOT NULL,          -- Which meal (breakfast, lunch, etc.)
    menu_item_id TEXT,                     -- Selected menu item (if from menu)
    recipe_id TEXT,                        -- Direct recipe reference (if off-menu request)
    quantity INTEGER NOT NULL DEFAULT 1,   -- Number of portions (usually 1)
    portion_size_override TEXT,            -- Modified portion if different from standard
    diet_type_id TEXT NOT NULL,            -- Diet type for this order
    modifications TEXT,                    -- Special modifications requested
    delivery_location TEXT,                -- Where to deliver (room, table, etc.)
    delivery_time TEXT,                    -- Requested delivery time
    status TEXT NOT NULL DEFAULT 'Ordered' CHECK (status IN (
        'Ordered', 'In Production', 'Delivered', 'Cancelled'
    )),
    tray_ticket_number TEXT,               -- Tray identification for trayline assembly
    order_taken_by TEXT,                   -- Who recorded the order
    order_timestamp TEXT NOT NULL,         -- When order was placed (ISO datetime)
    notes TEXT,
    FOREIGN KEY (diner_id) REFERENCES diners(diner_id),
    FOREIGN KEY (meal_period_id) REFERENCES meal_periods(meal_period_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id),
    FOREIGN KEY (diet_type_id) REFERENCES diet_types(diet_type_id)
);

-- ============================================================================
-- PROCUREMENT TABLES
-- Implements purchasing functions described in Chapter 6 of the textbook.
-- The textbook emphasizes: "Determine standards of quality for each food item
-- and write specifications." Good purchasing practices include systematic
-- ordering schedules, adequate flow of goods, and systematic receiving
-- procedures with inventory control.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: vendors
-- 
-- Supplier/vendor master list for procurement. Vendor types include:
--   - Broadline Distributor: Full-service distributors (Sysco, US Foods)
--   - Specialty vendors: Category-specific suppliers
--
-- The textbook emphasizes vendor evaluation: "Discrepancies must be noted...
-- this collective information will be of value when the foodservice begins
-- to prepare for the next bid period."
-- ----------------------------------------------------------------------------
CREATE TABLE vendors (
    vendor_id TEXT PRIMARY KEY,            -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    vendor_name TEXT NOT NULL,             -- Company name
    vendor_type TEXT NOT NULL CHECK (vendor_type IN (
        'Broadline Distributor', 'Produce', 'Dairy', 'Meat', 'Bakery', 
        'Seafood', 'Specialty', 'Beverage', 'Paper/Disposables', 'Equipment'
    )),                                    -- Type of vendor
    contact_name TEXT,                     -- Primary contact person
    phone TEXT NOT NULL,                   -- Contact phone
    email TEXT,                            -- Contact email
    address TEXT,                          -- Street address
    city TEXT,
    state TEXT,
    zip TEXT,
    delivery_days TEXT,                    -- Days vendor delivers (e.g., 'Mon, Wed, Fri')
    delivery_lead_time_days INTEGER,       -- Order lead time required
    minimum_order REAL,                    -- Minimum order amount
    payment_terms TEXT,                    -- Payment terms (e.g., 'Net 30')
    account_number TEXT,                   -- Customer account number with vendor
    contract_start_date DATE,              -- Contract period start
    contract_end_date DATE,                -- Contract period end
    performance_rating REAL CHECK (performance_rating >= 1 AND performance_rating <= 5),  -- 1-5 rating
    insurance_on_file INTEGER DEFAULT 0 CHECK (insurance_on_file IN (0, 1)),  -- 1 if insurance docs on file
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Inactive', 'Suspended', 'Prospective'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: product_specifications
-- 
-- Detailed specifications for products to be purchased. Specifications ensure
-- consistent quality across vendors and orders, support formal competitive
-- bid purchasing, and enable receiving clerks to verify deliveries against
-- defined standards.
-- ----------------------------------------------------------------------------
CREATE TABLE product_specifications (
    spec_id TEXT PRIMARY KEY,              -- Unique identifier
    tenant_id TEXT,                        -- NULL = system-wide, value = tenant-specific
    ingredient_id TEXT NOT NULL,           -- Link to ingredient this spec is for
    spec_name TEXT NOT NULL,               -- Specification name
    product_description TEXT NOT NULL,     -- Detailed description
    brand_acceptable TEXT,                 -- Acceptable brands (or 'Brand X or equal')
    usda_grade TEXT,                       -- Required USDA grade (e.g., 'Choice', 'Grade A')
    market_form TEXT NOT NULL CHECK (market_form IN (
        'Fresh', 'Frozen', 'Canned', 'Dried', 'Prepared'
    )),                                    -- Form of product
    size_count TEXT,                       -- Size/count specification
    pack_size TEXT NOT NULL,               -- Package size (e.g., '6/#10 cans', '40 lb case')
    unit_weight TEXT,                      -- Individual unit weight
    origin TEXT,                           -- Geographic origin requirements
    processing_requirements TEXT,          -- Processing specifications
    quality_indicators TEXT,               -- Quality markers to check on receipt
    temperature_requirements TEXT,         -- Temperature specifications for delivery
    estimated_price REAL,                  -- Expected price for budgeting
    effective_date DATE NOT NULL,          -- When spec takes effect
    created_by TEXT,                       -- Who wrote the specification
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN (
        'Active', 'Inactive', 'Under Review'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: purchase_orders
-- 
-- Header information for purchase orders. Tracks the complete lifecycle from
-- draft through submission, confirmation, and receipt.
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    po_number TEXT PRIMARY KEY,            -- Purchase order number
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    vendor_id TEXT NOT NULL,               -- Vendor being ordered from
    site_id TEXT NOT NULL,                 -- Delivery location
    order_date DATE NOT NULL,              -- Date order placed
    requested_delivery_date DATE NOT NULL, -- Requested delivery date
    actual_delivery_date DATE,             -- Actual delivery (filled on receipt)
    ordered_by TEXT NOT NULL,              -- Who placed the order
    subtotal REAL,                         -- Order subtotal
    tax REAL,                              -- Tax amount
    shipping REAL,                         -- Shipping charges
    total REAL,                            -- Order total
    payment_terms TEXT,                    -- Payment terms
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
        'Draft', 'Submitted', 'Confirmed', 'Partial', 'Received', 'Cancelled'
    )),
    delivery_instructions TEXT,            -- Special delivery instructions
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: po_line_items
-- 
-- Individual line items on purchase orders. Tracks both ordered and received
-- quantities to identify discrepancies for vendor follow-up.
-- ----------------------------------------------------------------------------
CREATE TABLE po_line_items (
    line_item_id TEXT PRIMARY KEY,         -- Unique identifier
    po_number TEXT NOT NULL,               -- Reference to PO header
    ingredient_id TEXT NOT NULL,           -- What is being ordered
    spec_id TEXT,                          -- Product specification (optional)
    quantity_ordered REAL NOT NULL,        -- Quantity ordered
    unit_of_measure TEXT NOT NULL,         -- Unit of order
    unit_price REAL NOT NULL,              -- Price per unit
    extended_price REAL NOT NULL,          -- Line total (qty × price)
    quantity_received REAL,                -- Quantity actually received (filled at receiving)
    variance REAL,                         -- Difference between ordered and received
    notes TEXT,
    FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    FOREIGN KEY (spec_id) REFERENCES product_specifications(spec_id),
    FOREIGN KEY (unit_of_measure) REFERENCES units_of_measure(unit_id)
);

-- ============================================================================
-- INVENTORY TABLES
-- Implements inventory control as described in Chapter 7 of the textbook.
-- The textbook describes two types of inventory:
--   - Perpetual Inventory: "A running record of the balance on hand for each
--     item in the storeroom"
--   - Physical Inventory: "An actual count of items in all storage areas...
--     taken periodically"
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: receiving
-- 
-- Documents receipt of deliveries. The textbook describes the receiving
-- process as five key steps:
--   1. Physically inspect the delivery and check against purchase order
--   2. Inspect the delivery against the invoice
--   3. Accept only if all quantities and quality specifications are met
--   4. Complete receiving records
--   5. Transfer goods to appropriate storage
--
-- Receiving Methods (from textbook):
--   - Invoice Method: "The receiving clerk checks delivered items against
--     the original purchase order and notes any deviations" - efficient
--     but requires careful evaluation
--   - Blind Method: "Quantities have been erased... clerk must quantify
--     each item by weighing, measuring, or counting" - more accurate
--     but labor-intensive
--
-- Temperature checks are critical: "Check temperatures of refrigerated
-- items on arrival"
-- ----------------------------------------------------------------------------
CREATE TABLE receiving (
    receiving_id TEXT PRIMARY KEY,         -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    po_number TEXT,                        -- Related purchase order (optional for non-PO deliveries)
    vendor_id TEXT NOT NULL,               -- Delivering vendor
    site_id TEXT NOT NULL,                 -- Receiving location
    delivery_date DATE NOT NULL,           -- Date of delivery
    delivery_time TEXT NOT NULL,           -- Time of delivery
    invoice_number TEXT NOT NULL,          -- Vendor invoice number
    invoice_amount REAL,                   -- Invoice total
    received_by TEXT NOT NULL,             -- Employee who received (FK to employees)
    receiving_method TEXT NOT NULL CHECK (receiving_method IN (
        'Invoice Method', 'Blind Method'
    )),                                    -- Which verification method was used
    temperature_check_passed INTEGER NOT NULL CHECK (temperature_check_passed IN (0, 1)),  -- 1 if temps OK
    refrigerated_temp_f REAL,              -- Logged refrigerated product temperature
    frozen_temp_f REAL,                    -- Logged frozen product temperature
    quality_acceptable INTEGER NOT NULL CHECK (quality_acceptable IN (0, 1)),  -- 1 if quality OK
    discrepancies TEXT,                    -- Description of any discrepancies found
    discrepancy_action TEXT CHECK (discrepancy_action IN (
        'Accepted', 'Rejected', 'Credit Requested', 'Returned', NULL
    )),                                    -- Action taken for discrepancies
    credit_memo_number TEXT,               -- Credit memo if issued
    transferred_to_storage_time TEXT,      -- When moved to storage
    status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN (
        'Received', 'Pending Review', 'Disputed'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id),
    FOREIGN KEY (received_by) REFERENCES employees(employee_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: inventory
-- 
-- Current inventory levels by storage location. Maintains the perpetual
-- inventory with fields for reconciling against physical counts.
--
-- The textbook states: "Perpetual inventory provides a continuing record
-- of food and supplies purchased, in storage, and used. Items received are
-- recorded from the invoices... Storeroom issues are recorded from the
-- requisitions and subtracted from the balance."
-- ----------------------------------------------------------------------------
CREATE TABLE inventory (
    inventory_id TEXT PRIMARY KEY,         -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    ingredient_id TEXT NOT NULL,           -- What is being stored
    site_id TEXT NOT NULL,                 -- Storage location
    storage_location TEXT NOT NULL CHECK (storage_location IN (
        'Dry Storage', 'Walk-in Cooler', 'Walk-in Freezer', 
        'Reach-in Cooler', 'Reach-in Freezer'
    )),                                    -- Type of storage
    bin_location TEXT,                     -- Specific bin/shelf location
    quantity_on_hand REAL NOT NULL,        -- Current quantity (perpetual inventory)
    unit_of_measure TEXT NOT NULL,         -- Unit of measurement
    unit_cost REAL,                        -- Cost per unit
    total_value REAL,                      -- Total value (qty × cost)
    last_received_date DATE,               -- Last receipt date
    expiration_date DATE,                  -- Product expiration
    lot_number TEXT,                       -- Lot/batch tracking for recalls
    last_physical_count_date DATE,         -- Last physical inventory date
    last_physical_count_qty REAL,          -- Quantity at last physical count
    variance_from_perpetual REAL,          -- Difference between perpetual and physical
    below_par_flag INTEGER DEFAULT 0 CHECK (below_par_flag IN (0, 1)),  -- 1 if below par level
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id),
    FOREIGN KEY (unit_of_measure) REFERENCES units_of_measure(unit_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: storeroom_issues
-- 
-- Tracks items issued from storeroom to production (requisitions). The
-- textbook describes: "Items received are recorded from the invoices...
-- Storeroom issues are recorded from the requisitions and subtracted from
-- the balance."
--
-- Enables tracking of ingredient usage for cost analysis and links to
-- production schedules for centralized ingredient assembly: "Centralized
-- ingredient assembly where accuracy in weights and measures is essential."
-- ----------------------------------------------------------------------------
CREATE TABLE storeroom_issues (
    issue_id TEXT PRIMARY KEY,             -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    requisition_number TEXT NOT NULL,      -- Requisition document number
    issue_date DATE NOT NULL,              -- Date of issue
    ingredient_id TEXT NOT NULL,           -- What was issued
    from_site_id TEXT NOT NULL,            -- Issuing storeroom
    to_site_id TEXT,                       -- Receiving location (if inter-site transfer)
    quantity_issued REAL NOT NULL,         -- Quantity issued
    unit_of_measure TEXT NOT NULL,         -- Unit
    unit_cost REAL,                        -- Cost per unit
    extended_cost REAL,                    -- Total cost of issue
    issued_by TEXT NOT NULL,               -- Employee who issued (FK to employees)
    received_by TEXT,                      -- Employee who received
    production_schedule_id TEXT,           -- Related production schedule (if applicable)
    meal_date DATE,                        -- Date items are being used for
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    FOREIGN KEY (from_site_id) REFERENCES sites(site_id),
    FOREIGN KEY (to_site_id) REFERENCES sites(site_id),
    FOREIGN KEY (issued_by) REFERENCES employees(employee_id),
    FOREIGN KEY (unit_of_measure) REFERENCES units_of_measure(unit_id),
    FOREIGN KEY (production_schedule_id) REFERENCES production_schedules(schedule_id)
);

-- ============================================================================
-- PRODUCTION TABLES
-- Implements production planning and scheduling from Chapter 8.
-- The textbook states: "Production planning and scheduling are vital to the
-- production of high-quality food and are important management responsibilities."
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: production_schedules
-- 
-- Daily/shift production schedules that communicate work to production staff.
-- The textbook states: "A production schedule is a detailed document used to
-- communicate with/to the production staff the work that needs to be done for
-- a specific period of time."
--
-- Production schedules should include (from textbook):
--   - Name of menu items to be prepared
--   - Quantities to prepare (number of portions, number of pans)
--   - Recipes to be followed (or recipe code)
--   - Specific instructions
--   - Standard portion sizes and variations for modified diets
--   - Target completion times
--
-- The HACCP logging fields support food safety documentation.
-- ----------------------------------------------------------------------------
CREATE TABLE production_schedules (
    schedule_id TEXT PRIMARY KEY,          -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    production_date DATE NOT NULL,         -- Date of production
    site_id TEXT NOT NULL,                 -- Production location
    shift TEXT NOT NULL CHECK (shift IN ('AM', 'PM', 'Night', 'All Day')),
    meal_period_id TEXT NOT NULL,          -- Target meal period
    recipe_id TEXT NOT NULL,               -- Recipe to produce
    forecasted_portions INTEGER NOT NULL,  -- Predicted portions needed (from forecast)
    batch_multiplier REAL,                 -- Recipe scaling factor
    actual_portions_produced INTEGER,      -- Actual output (filled after production)
    assigned_employee_id TEXT,             -- Assigned cook/preparer
    start_time_target TEXT,                -- Target start time
    completion_time_target TEXT NOT NULL,  -- Target completion time
    actual_start_time TEXT,                -- Actual start (filled during production)
    actual_completion_time TEXT,           -- Actual completion time
    station_id TEXT,                       -- Production station
    equipment_needed TEXT,                 -- Required equipment
    prep_instructions TEXT,                -- Special instructions
    haccp_temp_logged REAL,                -- HACCP temperature log
    haccp_time_logged TEXT,                -- HACCP time log
    quality_check_passed INTEGER CHECK (quality_check_passed IN (0, 1, NULL)),  -- Quality verification
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN (
        'Scheduled', 'In Progress', 'Completed', 'Cancelled'
    )),
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id),
    FOREIGN KEY (meal_period_id) REFERENCES meal_periods(meal_period_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id),
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: forecasts
-- 
-- Demand forecasting records for production planning. The textbook states:
-- "The goal of forecasting is to estimate future demand using past data.
-- Applied to foodservice, forecasting is a prediction of food needs for a day
-- or other specific time period."
--
-- Forecast Types:
--   - Census: Total customers/patients expected
--   - Menu Item: Specific item selection forecast
--   - Category: Category-level forecast (entrées, sides)
--
-- Forecast Methods (from textbook):
--   - Moving Average: Average of recent periods
--   - Exponential Smoothing: Weighted average emphasizing recent data
--   - Tally: "A simple count of menu items actually requested or selected"
--   - Management Estimate: Judgment-based adjustment
--
-- "Sound forecasting is vital to financial management; it facilitates
-- efficient scheduling of labor, use of equipment, and space."
-- ----------------------------------------------------------------------------
CREATE TABLE forecasts (
    forecast_id TEXT PRIMARY KEY,          -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    forecast_date DATE NOT NULL,           -- Date being forecasted
    site_id TEXT NOT NULL,                 -- Location
    meal_period_id TEXT NOT NULL,          -- Meal period
    recipe_id TEXT,                        -- Specific recipe (if item-level forecast)
    forecast_type TEXT NOT NULL CHECK (forecast_type IN (
        'Census', 'Menu Item', 'Category'
    )),                                    -- Level of forecast
    forecasted_count INTEGER NOT NULL,     -- Predicted count
    actual_count INTEGER,                  -- Actual result (filled after service)
    variance INTEGER,                      -- Difference (actual - forecast)
    variance_percent REAL,                 -- Percentage variance
    forecast_method TEXT CHECK (forecast_method IN (
        'Moving Average', 'Exponential Smoothing', 'Tally', 'Management Estimate', NULL
    )),                                    -- Method used to generate forecast
    adjustment_factors TEXT,               -- Factors that influenced forecast (weather, events, etc.)
    historical_average REAL,               -- Historical average for reference
    created_by TEXT,                       -- Who created forecast
    created_date DATE,                     -- When forecast was created
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id),
    FOREIGN KEY (meal_period_id) REFERENCES meal_periods(meal_period_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
);

-- ----------------------------------------------------------------------------
-- TABLE: leftover_reports
-- 
-- Tracks leftover food after service for waste reduction and forecast
-- improvement. The textbook emphasizes: "Reducing the amount of leftover
-- prepared foods is another step that can be taken to [control costs]."
--
-- This table enables:
--   - Analysis of forecasting accuracy
--   - Food waste tracking for sustainability reporting
--   - Identification of patterns in overproduction
--   - Cost control initiatives
-- ----------------------------------------------------------------------------
CREATE TABLE leftover_reports (
    leftover_id TEXT PRIMARY KEY,          -- Unique identifier
    tenant_id TEXT NOT NULL,               -- Owning tenant (required)
    report_date DATE NOT NULL,             -- Service date
    meal_period_id TEXT NOT NULL,          -- Meal period
    site_id TEXT NOT NULL,                 -- Location
    recipe_id TEXT NOT NULL,               -- Recipe with leftovers
    portions_produced INTEGER NOT NULL,    -- Portions made
    portions_served INTEGER NOT NULL,      -- Portions served
    portions_leftover INTEGER NOT NULL,    -- Portions remaining (produced - served)
    leftover_quality TEXT NOT NULL CHECK (leftover_quality IN (
        'Usable', 'Marginal', 'Waste'
    )),                                    -- Quality assessment
    disposition TEXT NOT NULL CHECK (disposition IN (
        'Repurposed', 'Refrigerated for Next Day', 'Frozen', 'Donated', 'Discarded'
    )),                                    -- What was done with leftovers
    weight_discarded_lbs REAL,             -- Weight discarded (for waste tracking)
    estimated_cost_lost REAL,              -- Financial impact of waste
    reason_for_excess TEXT CHECK (reason_for_excess IN (
        'Over-forecast', 'Over-production', 'Low Participation', 'Poor Quality', NULL
    )),                                    -- Root cause analysis
    reported_by TEXT NOT NULL,             -- Employee reporting (FK to employees)
    notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (meal_period_id) REFERENCES meal_periods(meal_period_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id),
    FOREIGN KEY (reported_by) REFERENCES employees(employee_id)
);

-- ============================================================================
-- INDEXES
-- Create indexes for frequently queried columns and foreign keys to improve
-- query performance on larger datasets.
-- ============================================================================

-- Sites
CREATE INDEX idx_sites_tenant ON sites(tenant_id);
CREATE INDEX idx_sites_status ON sites(status);

-- Stations
CREATE INDEX idx_stations_site_id ON stations(site_id);
CREATE INDEX idx_stations_status ON stations(status);

-- Employees
CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_site_id ON employees(primary_site_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_job_title ON employees(job_title);

-- Meal Periods
CREATE INDEX idx_meal_periods_tenant ON meal_periods(tenant_id);
CREATE INDEX idx_meal_periods_sort_order ON meal_periods(sort_order);

-- Diet Types
CREATE INDEX idx_diet_types_tenant ON diet_types(tenant_id);
CREATE INDEX idx_diet_types_category ON diet_types(diet_category);
CREATE INDEX idx_diet_types_status ON diet_types(status);

-- Cycle Menus
CREATE INDEX idx_cycle_menus_tenant ON cycle_menus(tenant_id);
CREATE INDEX idx_cycle_menus_status ON cycle_menus(status);
CREATE INDEX idx_cycle_menus_site_id ON cycle_menus(site_id);
CREATE INDEX idx_cycle_menus_dates ON cycle_menus(start_date, end_date);

-- Food Composition Sources
CREATE INDEX idx_food_comp_sources_country ON food_composition_sources(source_country);

-- Ingredients
CREATE INDEX idx_ingredients_tenant ON ingredients(tenant_id);
CREATE INDEX idx_ingredients_fdc ON ingredients(fdc_id);
CREATE INDEX idx_ingredients_category ON ingredients(food_category_id);
CREATE INDEX idx_ingredients_vendor ON ingredients(preferred_vendor_id);
CREATE INDEX idx_ingredients_storage ON ingredients(storage_type);
CREATE INDEX idx_ingredients_status ON ingredients(status);

-- Recipes
CREATE INDEX idx_recipes_tenant ON recipes(tenant_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_status ON recipes(status);

-- Recipe Ingredients
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

-- Menu Items
CREATE INDEX idx_menu_items_cycle ON menu_items(cycle_menu_id);
CREATE INDEX idx_menu_items_week_day ON menu_items(week_number, day_of_week);
CREATE INDEX idx_menu_items_meal_period ON menu_items(meal_period_id);
CREATE INDEX idx_menu_items_recipe ON menu_items(recipe_id);
CREATE INDEX idx_menu_items_diet ON menu_items(diet_type_id);

-- Diners
CREATE INDEX idx_diners_tenant ON diners(tenant_id);
CREATE INDEX idx_diners_site ON diners(site_id);
CREATE INDEX idx_diners_diet ON diners(primary_diet_type_id);
CREATE INDEX idx_diners_status ON diners(status);
CREATE INDEX idx_diners_type ON diners(diner_type);

-- Diet Assignments
CREATE INDEX idx_diet_assignments_diner ON diet_assignments(diner_id);
CREATE INDEX idx_diet_assignments_diet ON diet_assignments(diet_type_id);
CREATE INDEX idx_diet_assignments_dates ON diet_assignments(effective_date, end_date);

-- Meal Orders
CREATE INDEX idx_meal_orders_diner ON meal_orders(diner_id);
CREATE INDEX idx_meal_orders_date ON meal_orders(order_date);
CREATE INDEX idx_meal_orders_meal_period ON meal_orders(meal_period_id);
CREATE INDEX idx_meal_orders_status ON meal_orders(status);

-- Vendors
CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_status ON vendors(status);

-- Product Specifications
CREATE INDEX idx_product_specs_tenant ON product_specifications(tenant_id);
CREATE INDEX idx_product_specs_ingredient ON product_specifications(ingredient_id);
CREATE INDEX idx_product_specs_status ON product_specifications(status);

-- Purchase Orders
CREATE INDEX idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_site ON purchase_orders(site_id);
CREATE INDEX idx_po_dates ON purchase_orders(order_date, requested_delivery_date);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- PO Line Items
CREATE INDEX idx_po_line_items_po ON po_line_items(po_number);
CREATE INDEX idx_po_line_items_ingredient ON po_line_items(ingredient_id);

-- Receiving
CREATE INDEX idx_receiving_tenant ON receiving(tenant_id);
CREATE INDEX idx_receiving_po ON receiving(po_number);
CREATE INDEX idx_receiving_vendor ON receiving(vendor_id);
CREATE INDEX idx_receiving_site ON receiving(site_id);
CREATE INDEX idx_receiving_date ON receiving(delivery_date);
CREATE INDEX idx_receiving_status ON receiving(status);

-- Inventory
CREATE INDEX idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX idx_inventory_ingredient ON inventory(ingredient_id);
CREATE INDEX idx_inventory_site ON inventory(site_id);
CREATE INDEX idx_inventory_location ON inventory(storage_location);
CREATE INDEX idx_inventory_expiration ON inventory(expiration_date);
CREATE INDEX idx_inventory_below_par ON inventory(below_par_flag);

-- Storeroom Issues
CREATE INDEX idx_issues_tenant ON storeroom_issues(tenant_id);
CREATE INDEX idx_issues_ingredient ON storeroom_issues(ingredient_id);
CREATE INDEX idx_issues_from_site ON storeroom_issues(from_site_id);
CREATE INDEX idx_issues_date ON storeroom_issues(issue_date);
CREATE INDEX idx_issues_schedule ON storeroom_issues(production_schedule_id);

-- Production Schedules
CREATE INDEX idx_prod_schedule_tenant ON production_schedules(tenant_id);
CREATE INDEX idx_prod_schedule_date ON production_schedules(production_date);
CREATE INDEX idx_prod_schedule_site ON production_schedules(site_id);
CREATE INDEX idx_prod_schedule_meal ON production_schedules(meal_period_id);
CREATE INDEX idx_prod_schedule_recipe ON production_schedules(recipe_id);
CREATE INDEX idx_prod_schedule_status ON production_schedules(status);

-- Forecasts
CREATE INDEX idx_forecasts_tenant ON forecasts(tenant_id);
CREATE INDEX idx_forecasts_date ON forecasts(forecast_date);
CREATE INDEX idx_forecasts_site ON forecasts(site_id);
CREATE INDEX idx_forecasts_meal ON forecasts(meal_period_id);
CREATE INDEX idx_forecasts_recipe ON forecasts(recipe_id);

-- Leftover Reports
CREATE INDEX idx_leftovers_tenant ON leftover_reports(tenant_id);
CREATE INDEX idx_leftovers_date ON leftover_reports(report_date);
CREATE INDEX idx_leftovers_site ON leftover_reports(site_id);
CREATE INDEX idx_leftovers_recipe ON leftover_reports(recipe_id);
CREATE INDEX idx_leftovers_quality ON leftover_reports(leftover_quality);

-- ============================================================================
-- VIEWS
-- Common queries as views for convenience. Views provide pre-joined data
-- for reporting and common operational queries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VIEW: v_active_menu
-- Shows the current active cycle menu with all details joined together.
-- Useful for menu display, production planning, and dietary analysis.
-- ----------------------------------------------------------------------------
CREATE VIEW v_active_menu AS
SELECT 
    cm.tenant_id,
    cm.cycle_name,
    cm.season,
    mi.week_number,
    mi.day_of_week,
    mp.meal_period_name,
    mi.menu_category,
    r.recipe_name,
    mi.portion_size,
    dt.diet_type_name,
    s.station_name,
    mi.is_choice,
    mi.choice_group,
    mi.display_name,
    r.calories_per_portion,
    r.allergens
FROM menu_items mi
JOIN cycle_menus cm ON mi.cycle_menu_id = cm.cycle_menu_id
JOIN meal_periods mp ON mi.meal_period_id = mp.meal_period_id
JOIN recipes r ON mi.recipe_id = r.recipe_id
JOIN diet_types dt ON mi.diet_type_id = dt.diet_type_id
LEFT JOIN stations s ON mi.station_id = s.station_id
WHERE cm.status = 'Active'
ORDER BY mi.week_number, 
    CASE mi.day_of_week 
        WHEN 'Monday' THEN 1 
        WHEN 'Tuesday' THEN 2 
        WHEN 'Wednesday' THEN 3 
        WHEN 'Thursday' THEN 4 
        WHEN 'Friday' THEN 5 
        WHEN 'Saturday' THEN 6 
        WHEN 'Sunday' THEN 7 
    END,
    mp.sort_order,
    mi.menu_category;

-- ----------------------------------------------------------------------------
-- VIEW: v_recipe_costs
-- Calculates recipe costs from ingredient costs. Essential for menu pricing
-- and food cost control. The textbook states: "The raw food cost is found by
-- costing the standardized recipe for each menu item."
-- ----------------------------------------------------------------------------
CREATE VIEW v_recipe_costs AS
SELECT 
    r.tenant_id,
    r.recipe_id,
    r.recipe_name,
    r.yield_quantity,
    r.portion_size,
    COUNT(ri.ingredient_id) AS ingredient_count,
    SUM(ri.calculated_cost) AS total_recipe_cost,
    ROUND(SUM(ri.calculated_cost) / r.yield_quantity, 2) AS cost_per_portion
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
GROUP BY r.tenant_id, r.recipe_id, r.recipe_name, r.yield_quantity, r.portion_size;

-- ----------------------------------------------------------------------------
-- VIEW: v_inventory_status
-- Shows inventory with par level status and reorder alerts. Classifies
-- inventory as 'Out of Stock', 'Reorder Now', 'Below Par', or 'Adequate'.
-- ----------------------------------------------------------------------------
CREATE VIEW v_inventory_status AS
SELECT 
    i.tenant_id,
    i.inventory_id,
    ing.ingredient_name,
    ing.food_category_id,
    fc.category_name,
    s.site_name,
    i.storage_location,
    i.quantity_on_hand,
    i.unit_of_measure,
    ing.par_level,
    ing.reorder_point,
    i.expiration_date,
    CASE 
        WHEN i.quantity_on_hand <= 0 THEN 'Out of Stock'
        WHEN i.quantity_on_hand < ing.reorder_point THEN 'Reorder Now'
        WHEN i.quantity_on_hand < ing.par_level THEN 'Below Par'
        ELSE 'Adequate'
    END AS stock_status,
    i.total_value
FROM inventory i
JOIN ingredients ing ON i.ingredient_id = ing.ingredient_id
JOIN sites s ON i.site_id = s.site_id
LEFT JOIN food_categories fc ON ing.food_category_id = fc.category_id
ORDER BY 
    CASE 
        WHEN i.quantity_on_hand <= 0 THEN 1
        WHEN i.quantity_on_hand < ing.reorder_point THEN 2
        WHEN i.quantity_on_hand < ing.par_level THEN 3
        ELSE 4
    END,
    ing.ingredient_name;

-- ----------------------------------------------------------------------------
-- VIEW: v_active_diners
-- Shows all active diners with their current diet assignments. Useful for
-- trayline assembly and dietary compliance checking.
-- ----------------------------------------------------------------------------
CREATE VIEW v_active_diners AS
SELECT 
    d.tenant_id,
    d.diner_id,
    d.first_name,
    d.last_name,
    d.room_number,
    d.diner_type,
    s.site_name,
    dt.diet_type_name,
    d.texture_modification,
    d.liquid_consistency,
    d.allergies,
    d.feeding_assistance,
    d.special_instructions
FROM diners d
JOIN sites s ON d.site_id = s.site_id
JOIN diet_types dt ON d.primary_diet_type_id = dt.diet_type_id
WHERE d.status = 'Active'
ORDER BY s.site_name, d.last_name, d.first_name;

-- ----------------------------------------------------------------------------
-- VIEW: v_production_summary
-- Daily production summary by site and meal. Aggregates production schedules
-- to show items scheduled, forecasted/produced portions, and completion status.
-- ----------------------------------------------------------------------------
CREATE VIEW v_production_summary AS
SELECT 
    ps.tenant_id,
    ps.production_date,
    s.site_name,
    mp.meal_period_name,
    COUNT(ps.schedule_id) AS items_scheduled,
    SUM(ps.forecasted_portions) AS total_forecasted,
    SUM(ps.actual_portions_produced) AS total_produced,
    SUM(CASE WHEN ps.status = 'Completed' THEN 1 ELSE 0 END) AS items_completed,
    SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) AS items_in_progress,
    SUM(CASE WHEN ps.status = 'Scheduled' THEN 1 ELSE 0 END) AS items_pending
FROM production_schedules ps
JOIN sites s ON ps.site_id = s.site_id
JOIN meal_periods mp ON ps.meal_period_id = mp.meal_period_id
GROUP BY ps.tenant_id, ps.production_date, s.site_name, mp.meal_period_name
ORDER BY ps.production_date DESC, s.site_name, mp.sort_order;

-- ----------------------------------------------------------------------------
-- VIEW: v_forecast_accuracy
-- Shows forecast accuracy metrics for continuous improvement. Rates forecasts
-- as 'Excellent' (≤5%), 'Good' (≤10%), 'Fair' (≤20%), or 'Poor' (>20%).
-- ----------------------------------------------------------------------------
CREATE VIEW v_forecast_accuracy AS
SELECT 
    f.tenant_id,
    f.forecast_date,
    s.site_name,
    mp.meal_period_name,
    f.forecast_type,
    r.recipe_name,
    f.forecasted_count,
    f.actual_count,
    f.variance,
    f.variance_percent,
    f.forecast_method,
    CASE 
        WHEN ABS(f.variance_percent) <= 5 THEN 'Excellent'
        WHEN ABS(f.variance_percent) <= 10 THEN 'Good'
        WHEN ABS(f.variance_percent) <= 20 THEN 'Fair'
        ELSE 'Poor'
    END AS accuracy_rating
FROM forecasts f
JOIN sites s ON f.site_id = s.site_id
JOIN meal_periods mp ON f.meal_period_id = mp.meal_period_id
LEFT JOIN recipes r ON f.recipe_id = r.recipe_id
WHERE f.actual_count IS NOT NULL
ORDER BY f.forecast_date DESC;

-- ----------------------------------------------------------------------------
-- VIEW: v_waste_summary
-- Summarizes food waste for cost analysis and sustainability reporting.
-- Calculates waste percentages and aggregates cost impacts.
-- ----------------------------------------------------------------------------
CREATE VIEW v_waste_summary AS
SELECT 
    lr.tenant_id,
    lr.report_date,
    s.site_name,
    mp.meal_period_name,
    r.recipe_name,
    lr.portions_produced,
    lr.portions_served,
    lr.portions_leftover,
    ROUND(100.0 * lr.portions_leftover / lr.portions_produced, 1) AS waste_percent,
    lr.leftover_quality,
    lr.disposition,
    lr.weight_discarded_lbs,
    lr.estimated_cost_lost,
    lr.reason_for_excess
FROM leftover_reports lr
JOIN sites s ON lr.site_id = s.site_id
JOIN meal_periods mp ON lr.meal_period_id = mp.meal_period_id
JOIN recipes r ON lr.recipe_id = r.recipe_id
ORDER BY lr.report_date DESC, s.site_name;

-- ============================================================================
-- TRIGGERS
-- Automate calculations and enforce business rules for data integrity.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRIGGER: trg_inventory_below_par
-- Automatically updates the below_par_flag when inventory quantity changes.
-- Compares current quantity to par level and sets flag accordingly.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_inventory_below_par
AFTER UPDATE OF quantity_on_hand ON inventory
BEGIN
    UPDATE inventory 
    SET below_par_flag = CASE 
        WHEN NEW.quantity_on_hand < (SELECT par_level FROM ingredients WHERE ingredient_id = NEW.ingredient_id)
        THEN 1 ELSE 0 END
    WHERE inventory_id = NEW.inventory_id;
END;

-- ----------------------------------------------------------------------------
-- TRIGGER: trg_po_line_extended_price
-- Validates that extended price equals quantity × unit price on PO line items.
-- Ensures data integrity for purchase order costing.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_po_line_extended_price
BEFORE INSERT ON po_line_items
BEGIN
    SELECT RAISE(ABORT, 'Extended price must equal quantity_ordered * unit_price')
    WHERE NEW.extended_price != ROUND(NEW.quantity_ordered * NEW.unit_price, 2);
END;

-- ----------------------------------------------------------------------------
-- TRIGGER: trg_forecast_variance
-- Automatically calculates variance and variance_percent when actual_count
-- is updated on forecasts. Supports forecast accuracy analysis.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_forecast_variance
AFTER UPDATE OF actual_count ON forecasts
WHEN NEW.actual_count IS NOT NULL
BEGIN
    UPDATE forecasts 
    SET variance = NEW.actual_count - forecasted_count,
        variance_percent = ROUND(100.0 * (NEW.actual_count - forecasted_count) / forecasted_count, 2)
    WHERE forecast_id = NEW.forecast_id;
END;

-- ----------------------------------------------------------------------------
-- TRIGGER: trg_leftover_calc
-- Validates that portions_leftover equals portions_produced - portions_served.
-- Ensures data integrity on leftover reports.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_leftover_calc
BEFORE INSERT ON leftover_reports
BEGIN
    SELECT RAISE(ABORT, 'portions_leftover must equal portions_produced - portions_served')
    WHERE NEW.portions_leftover != (NEW.portions_produced - NEW.portions_served);
END;

-- ============================================================================
-- SEED DATA
-- Initial reference data for the system. These values are derived from
-- industry standards and the textbook's recommendations.
-- ============================================================================

-- Units of Measure (both culinary and commercial units)
INSERT INTO units_of_measure (unit_id, unit_name, unit_abbreviation, unit_type, conversion_to_base, base_unit) VALUES
('UOM-LB', 'Pound', 'lb', 'Weight', 1.0, 'lb'),
('UOM-OZ', 'Ounce', 'oz', 'Weight', 0.0625, 'lb'),
('UOM-G', 'Gram', 'g', 'Weight', 0.00220462, 'lb'),
('UOM-KG', 'Kilogram', 'kg', 'Weight', 2.20462, 'lb'),
('UOM-GAL', 'Gallon', 'gal', 'Volume', 1.0, 'gal'),
('UOM-QT', 'Quart', 'qt', 'Volume', 0.25, 'gal'),
('UOM-PT', 'Pint', 'pt', 'Volume', 0.125, 'gal'),
('UOM-CUP', 'Cup', 'c', 'Volume', 0.0625, 'gal'),
('UOM-FLOZ', 'Fluid Ounce', 'fl oz', 'Volume', 0.0078125, 'gal'),
('UOM-TBSP', 'Tablespoon', 'Tbsp', 'Volume', 0.00390625, 'gal'),
('UOM-TSP', 'Teaspoon', 'tsp', 'Volume', 0.00130208, 'gal'),
('UOM-ML', 'Milliliter', 'ml', 'Volume', 0.000264172, 'gal'),
('UOM-L', 'Liter', 'L', 'Volume', 0.264172, 'gal'),
('UOM-EA', 'Each', 'ea', 'Each', 1.0, 'ea'),
('UOM-DZ', 'Dozen', 'dz', 'Count', 12.0, 'ea'),
('UOM-CS', 'Case', 'cs', 'Count', NULL, NULL),
('UOM-PKG', 'Package', 'pkg', 'Count', NULL, NULL),
('UOM-CAN', 'Can', 'can', 'Count', NULL, NULL),
('UOM-BAG', 'Bag', 'bag', 'Count', NULL, NULL),
('UOM-BOX', 'Box', 'box', 'Count', NULL, NULL),
('UOM-BTL', 'Bottle', 'btl', 'Count', NULL, NULL),
('UOM-PORTION', 'Portion', 'portion', 'Each', 1.0, 'portion'),
('UOM-PAN', 'Pan', 'pan', 'Each', 1.0, 'pan');

-- Food Categories (aligned with standard foodservice classifications)
INSERT INTO food_categories (category_id, category_name, storage_type, sort_order) VALUES
('CAT-DAIRY', 'Dairy & Eggs', 'Refrigerated', 1),
('CAT-MEAT', 'Meat & Poultry', 'Refrigerated', 2),
('CAT-SEAFOOD', 'Seafood', 'Refrigerated', 3),
('CAT-PRODUCE', 'Fresh Produce', 'Refrigerated', 4),
('CAT-FROZEN', 'Frozen Foods', 'Frozen', 5),
('CAT-BAKERY', 'Bakery & Bread', 'Dry', 6),
('CAT-DRY', 'Dry Goods & Staples', 'Dry', 7),
('CAT-CANNED', 'Canned Goods', 'Dry', 8),
('CAT-CONDIMENTS', 'Condiments & Sauces', 'Dry', 9),
('CAT-SPICES', 'Spices & Seasonings', 'Dry', 10),
('CAT-BEVERAGE', 'Beverages', 'Dry', 11),
('CAT-PAPER', 'Paper & Disposables', 'Dry', 12),
('CAT-CLEANING', 'Cleaning Supplies', 'Dry', 13);

-- Allergens (FDA Major Food Allergens - "The Big 8" plus sesame added 2023)
INSERT INTO allergens (allergen_id, allergen_name, is_major_allergen, common_sources, cross_contact_risk) VALUES
('ALG-MILK', 'Milk', 1, 'Milk, cheese, butter, cream, yogurt, ice cream, whey, casein', 'Shared equipment, utensils'),
('ALG-EGG', 'Eggs', 1, 'Eggs, mayonnaise, meringue, some pasta, baked goods', 'Shared equipment, batter'),
('ALG-FISH', 'Fish', 1, 'All fish species, fish sauce, Caesar dressing, Worcestershire sauce', 'Shared fryers, grills'),
('ALG-SHELLFISH', 'Shellfish', 1, 'Shrimp, crab, lobster, scallops, clams, mussels, oysters', 'Shared fryers, shared cooking water'),
('ALG-TREENUTS', 'Tree Nuts', 1, 'Almonds, cashews, walnuts, pecans, pistachios, pine nuts, macadamia', 'Shared processing equipment, toppings'),
('ALG-PEANUTS', 'Peanuts', 1, 'Peanuts, peanut butter, peanut oil, some Asian sauces', 'Shared equipment, fryers'),
('ALG-WHEAT', 'Wheat', 1, 'Bread, pasta, flour, crackers, breaded items, soy sauce', 'Shared prep areas, fryers'),
('ALG-SOY', 'Soybeans', 1, 'Soy sauce, tofu, edamame, miso, tempeh, soy milk, vegetable oil', 'Shared fryers, Asian cooking'),
('ALG-SESAME', 'Sesame', 1, 'Sesame seeds, sesame oil, tahini, hummus, some bread', 'Shared prep areas, toppings'),
('ALG-GLUTEN', 'Gluten', 0, 'Wheat, barley, rye, some oats, malt', 'Shared water, fryers, prep areas'),
('ALG-SULFITES', 'Sulfites', 0, 'Wine, dried fruit, some processed foods', 'Not typically cross-contact');

-- Food Composition Sources (international nutrient databases)
INSERT INTO food_composition_sources (source_id, source_name, source_country, source_organization, source_url, api_available, api_endpoint, data_version, last_updated, item_count, notes) VALUES
('USDA-FDC', 'USDA FoodData Central', 'US', 'U.S. Department of Agriculture', 'https://fdc.nal.usda.gov/', 1, 'https://api.nal.usda.gov/fdc/v1/', 'FDC 2024', '2024-10-01', 400000, 'Primary US database, includes SR Legacy, Foundation, Branded, FNDDS'),
('USDA-SR-LEGACY', 'USDA SR Legacy', 'US', 'U.S. Department of Agriculture', 'https://fdc.nal.usda.gov/', 1, 'https://api.nal.usda.gov/fdc/v1/', 'SR Legacy April 2019', '2019-04-01', 7500, 'Standard Reference Legacy dataset, curated ~7,500 items'),
('USDA-FNDDS', 'USDA FNDDS', 'US', 'U.S. Department of Agriculture', 'https://fdc.nal.usda.gov/', 1, 'https://api.nal.usda.gov/fdc/v1/', 'FNDDS 2021-2023', '2023-01-01', 9000, 'Food and Nutrient Database for Dietary Studies'),
('CA-CNF', 'Canadian Nutrient File', 'CA', 'Health Canada', 'https://food-nutrition.canada.ca/cnf-fce/', 1, 'https://food-nutrition.canada.ca/api/canadian-nutrient-file/', 'CNF 2015', '2015-01-01', 6000, 'Official Canadian food composition database'),
('UK-COFID', 'Composition of Foods Integrated Dataset', 'GB', 'Public Health England', 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid', 0, NULL, 'CoFID 2021', '2021-03-01', 3000, 'McCance and Widdowson data'),
('UK-MW', 'McCance and Widdowson', 'GB', 'Royal Society of Chemistry', 'https://www.rsc.org/', 0, NULL, '8th Edition', '2021-01-01', 3000, 'The Composition of Foods, reference edition'),
('DE-BLS', 'Bundeslebensmittelschlüssel', 'DE', 'Max Rubner-Institut', 'https://www.blsdb.de/', 0, NULL, 'BLS 3.02', '2022-01-01', 15000, 'German Federal Food Key'),
('FR-CIQUAL', 'CIQUAL French Food Composition Table', 'FR', 'ANSES', 'https://ciqual.anses.fr/', 1, 'https://ciqual.anses.fr/api/', 'CIQUAL 2020', '2020-01-01', 3100, 'French national food composition database'),
('NL-NEVO', 'NEVO Dutch Food Composition Database', 'NL', 'RIVM', 'https://www.rivm.nl/en/dutch-food-composition-database', 0, NULL, 'NEVO 2021', '2021-01-01', 2100, 'Netherlands food composition data'),
('AU-AFCD', 'Australian Food Composition Database', 'AU', 'Food Standards Australia New Zealand', 'https://www.foodstandards.gov.au/science/monitoringnutrients/afcd', 0, NULL, 'AFCD Release 2', '2022-01-01', 5700, 'Australian and New Zealand foods'),
('JP-SFCT', 'Standard Tables of Food Composition in Japan', 'JP', 'MEXT', 'https://www.mext.go.jp/en/', 0, NULL, '8th Revised Edition', '2020-01-01', 2400, 'Japanese food composition tables'),
('INT-INFOODS', 'FAO/INFOODS', 'INT', 'Food and Agriculture Organization', 'https://www.fao.org/infoods/', 0, NULL, NULL, NULL, NULL, 'International network, guidelines and regional databases'),
('EU-EUROFIR', 'EuroFIR AISBL', 'INT', 'EuroFIR Association', 'https://www.eurofir.org/', 0, NULL, NULL, NULL, NULL, 'European Food Information Resource network, coordinates national DBs');

-- Meal Periods (standard institutional meal schedule)
INSERT INTO meal_periods (meal_period_id, meal_period_name, typical_start_time, typical_end_time, target_calories_min, target_calories_max, is_required, sort_order, notes) VALUES
('MP-BRKFST', 'Breakfast', '06:30', '09:00', 400, 600, 1, 1, 'Morning meal'),
('MP-AMSNACK', 'AM Snack', '10:00', '10:30', 100, 200, 0, 2, 'Mid-morning snack'),
('MP-LUNCH', 'Lunch', '11:30', '13:30', 550, 750, 1, 3, 'Midday meal'),
('MP-PMSNACK', 'PM Snack', '15:00', '15:30', 100, 200, 0, 4, 'Afternoon snack'),
('MP-DINNER', 'Dinner', '17:00', '19:00', 600, 850, 1, 5, 'Evening meal'),
('MP-HSSNACK', 'HS Snack', '20:00', '21:00', 150, 250, 0, 6, 'Bedtime snack - required in some care facilities');

-- Diet Types (Regular, Therapeutic, Texture-Modified, Allergy, Religious, Lifestyle)
INSERT INTO diet_types (diet_type_id, diet_type_name, diet_category, description, restrictions, required_modifications, calorie_target, sodium_limit_mg, carb_limit_g, requires_dietitian_approval, status, notes) VALUES
('DIET-REG', 'Regular', 'Regular', 'Standard diet with no restrictions', NULL, NULL, 2000, NULL, NULL, 0, 'Active', 'Default diet for most customers'),
('DIET-VEGAN', 'Vegan', 'Lifestyle', 'No animal products', 'Meat, poultry, fish, dairy, eggs, honey', 'Plant-based protein alternatives', 2000, NULL, NULL, 0, 'Active', NULL),
('DIET-VEGET', 'Vegetarian', 'Lifestyle', 'No meat or fish, dairy and eggs allowed', 'Meat, poultry, fish', 'Vegetable protein alternatives', 2000, NULL, NULL, 0, 'Active', NULL),
('DIET-GF', 'Gluten Free', 'Allergy', 'No gluten-containing grains', 'Wheat, barley, rye, some oats', 'Gluten-free alternatives for bread, pasta', 2000, NULL, NULL, 0, 'Active', NULL),
('DIET-LOWNA', 'Low Sodium', 'Therapeutic', 'Sodium restricted diet', 'Added salt, high-sodium foods', 'No added salt in cooking, low-sodium alternatives', 2000, 2000, NULL, 1, 'Active', 'Common for cardiac and renal patients'),
('DIET-DIAB', 'Diabetic/Carb Controlled', 'Therapeutic', 'Consistent carbohydrate diet', 'Concentrated sweets, excessive carbs', 'Consistent carb portions, sugar-free desserts', 2000, NULL, 60, 1, 'Active', 'Carb limit is per meal'),
('DIET-RENAL', 'Renal', 'Therapeutic', 'Kidney disease diet', 'High potassium, phosphorus, sodium foods', 'Modified protein, potassium, phosphorus', 2000, 2000, NULL, 1, 'Active', 'Requires RD supervision'),
('DIET-CARDIAC', 'Cardiac/Heart Healthy', 'Therapeutic', 'Heart healthy diet', 'High fat, high sodium, fried foods', 'Low saturated fat, low sodium', 2000, 2000, NULL, 1, 'Active', NULL),
('DIET-PUREED', 'Pureed', 'Texture-Modified', 'All foods pureed to smooth consistency', 'Any texture', 'All items pureed, proper consistency', 2000, NULL, NULL, 1, 'Active', 'For dysphagia'),
('DIET-MECHSOFT', 'Mechanical Soft', 'Texture-Modified', 'Soft, moist foods requiring minimal chewing', 'Tough meats, raw vegetables, hard foods', 'Ground or finely chopped proteins', 2000, NULL, NULL, 1, 'Active', 'For chewing difficulties'),
('DIET-CLRLIQ', 'Clear Liquid', 'Therapeutic', 'Clear liquids only', 'All solid foods, milk products', 'Broth, juice, gelatin, popsicles only', 500, NULL, NULL, 1, 'Active', 'Short-term pre/post procedure'),
('DIET-FULLLIQ', 'Full Liquid', 'Therapeutic', 'All liquids and foods liquid at room temperature', 'Solid foods', 'Include milk, cream soups, ice cream', 1200, NULL, NULL, 1, 'Active', 'Transition diet'),
('DIET-HALAL', 'Halal', 'Religious', 'Prepared according to Islamic law', 'Pork, alcohol, non-halal meat', 'Halal-certified meats only', 2000, NULL, NULL, 0, 'Active', NULL),
('DIET-KOSHER', 'Kosher', 'Religious', 'Prepared according to Jewish dietary law', 'Pork, shellfish, mixing meat/dairy', 'Kosher-certified products, separate prep', 2000, NULL, NULL, 0, 'Active', NULL);

-- ============================================================================
-- END OF DDL SCRIPT
-- ============================================================================
