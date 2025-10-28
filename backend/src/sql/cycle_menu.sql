-- PostgreSQL DDL for the Food Management System (Menu Planning Module)

CREATE TABLE Organization (
    OrganizationID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
);

CREATE TABLE SystemUser (
    UserID SERIAL PRIMARY KEY, -- Internal app ID for efficiency
    ADObjectID VARCHAR(36) NOT NULL UNIQUE, -- AD’s objectGUID (or similar) to link to AD user
    Username VARCHAR(100) NOT NULL UNIQUE, -- AD’s sAMAccountName or userPrincipalName
    Email VARCHAR(255) NOT NULL UNIQUE, -- AD’s email address
    DisplayName VARCHAR(255), -- AD’s displayName for user-friendly display
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When user was first added to app
    ModifiedDate TIMESTAMP, -- Last update to user record
    LastLogin TIMESTAMP, -- Track last login time
    IsActive BOOLEAN DEFAULT TRUE, -- Soft delete or disable flag
    Roles JSONB -- Store app-specific roles (e.g., ["admin", "editor"])
    -- Add indexes for performance
    CONSTRAINT idx_adobjectid UNIQUE (ADObjectID),
    CONSTRAINT idx_username UNIQUE (Username),
    CONSTRAINT idx_email UNIQUE (Email)
);

CREATE TABLE SystemUserOrganization (
    UserID INTEGER NOT NULL REFERENCES SystemUser(UserID) ON DELETE CASCADE,
    OrganizationID INTEGER NOT NULL REFERENCES Organization(OrganizationID) ON DELETE CASCADE,
    Roles JSONB, -- e.g., ["admin", "chef"] for this organization
    AssignedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    AssignedBy INTEGER REFERENCES SystemUser(UserID),
    PRIMARY KEY (UserID, OrganizationID)
);

CREATE TABLE Roles (
    RoleID SERIAL PRIMARY KEY,
    RoleName VARCHAR(100) NOT NULL UNIQUE,
    Description TEXT, -- Optional: role description
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update UserRoles to reference Roles
CREATE TABLE UserRoles (
    UserRoleID SERIAL PRIMARY KEY,
    UserID INT NOT NULL REFERENCES SystemUser(UserID) ON DELETE CASCADE,
    RoleID INT NOT NULL REFERENCES Roles(RoleID) ON DELETE RESTRICT,
    AssignedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    AssignedBy INT REFERENCES SystemUser(UserID),
    UNIQUE (UserID, RoleID)
);

-- Site Table (e.g., university dining hall)
-- https://developer.fourth.com/en-gb/docs/menu-cycles-api/reference#operation/Location_GetCollection
-- think we should tie this into google places
CREATE TABLE Site (
    SiteID SERIAL PRIMARY KEY,
    OrganizationID INTEGER NOT NULL REFERENCES Organization(OrganizationID) ON DELETE RESTRICT,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    UnitCode VARCHAR(100) NOT NULL,
    UnitName VARCHAR(100) NOT NULL,
    TimeZone VARCHAR(100) NOT NULL,
    CurrencyCode VARCHAR(100) NOT NULL,
    ChefPreferences TEXT,
    Equipment VARCHAR(1000) NOT NULL, -- text? json?
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
    -- + address, site manager, other CRM
);

-- Station Table (e.g., grill station within a site)
CREATE TABLE Station (
    StationID SERIAL PRIMARY KEY,
    SiteID INTEGER NOT NULL REFERENCES Site(SiteID) ON DELETE CASCADE,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
);

-- {
--   "Ovens": ["Pizza Oven","Convection Oven","Combi Oven","Deck Oven","Rotisserie Oven","Tunnel Oven","Microwave Oven","Toaster Oven"],
--   "Cooking Appliances": ["Gas Range","Electric Range","Induction Cooktop","Flat-Top Grill","Charbroiler","Griddle","Salamander","Wok Range"],
--   "Fryers": ["Deep Fryer","Pressure Fryer","Air Fryer"],
--   "Steamers & Boilers": ["Convection Steamer","Pressure Steamer","Combi Steamer","Pasta Boiler","Steam Kettle"],
--   "Refrigeration": ["Walk-In Refrigerator","Reach-In Refrigerator","Undercounter Refrigerator","Blast Chiller","Prep Table Refrigerator"],
--   "Freezers": ["Walk-In Freezer","Reach-In Freezer","Undercounter Freezer","Ice Machine"],
--   "Preparation Equipment": ["Food Processor","Vegetable Slicer","Meat Slicer","Food Chopper","Mandoline","Salad Spinner","Meat Grinder","Dough Divider"],
--   "Mixers & Blenders": ["Stand Mixer","Planetary Mixer","Immersion Blender","Countertop Blender","Spiral Mixer"],
--   "Storage": ["Dry Storage Rack","Shelving Unit","Ingredient Bin","Dunnage Rack"],
--   "Cleaning & Sanitation": ["Dishwasher","Three-Compartment Sink","Sanitizing Station","Pot Washer"],
--   "Specialty Equipment": ["Smoker","Sous-Vide Machine","Pasta Maker","Vacuum Sealer","Charcuterie Curer","Tandoor Oven"],
--   "Serving & Holding": ["Warming Cabinet","Hot Holding Unit","Heat Lamp","Buffet Server","Soup Warmer"]
-- }

-- Create ENUM type for Equipment Category
CREATE TYPE EquipmentCategory AS ENUM (
    'Ovens', 'Cooking Appliances', 'Fryers', 'Steamers & Boilers', 
    'Refrigeration', 'Freezers', 'Preparation Equipment', 
    'Mixers & Blenders', 'Storage', 'Cleaning & Sanitation', 
    'Specialty Equipment', 'Serving & Holding'
);

-- Equipment Table
CREATE TABLE Equipment (
    EquipmentID SERIAL PRIMARY KEY,
    StationID INTEGER NOT NULL REFERENCES Station(StationID) ON DELETE CASCADE,
    EquipmentType VARCHAR(100) NOT NULL, -- e.g., Pizza Oven, Deep Fryer
    Category EquipmentCategory NOT NULL, -- From predefined list
    Quantity INTEGER NOT NULL CHECK (Quantity >= 0), -- Number of units
    Capacity VARCHAR(50), -- e.g., '12 pizzas/batch', '20 liters'
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('Working', 'Maintenance Needed', 'Out of Service')),
    Features TEXT, -- Comma-separated, e.g., 'Convection mode, Gas-fired'
    AcquisitionDate DATE, -- Optional; when equipment was added
    Notes TEXT, -- Free-form, e.g., 'Dedicated to gluten-free'
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP,
    CONSTRAINT valid_capacity CHECK (Capacity IS NULL OR TRIM(Capacity) <> '')
);

-- MenuCycle Table (reusable 5-week template, date-agnostic)
CREATE TABLE MenuCycle (
    MenuCycleID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    DurationWeeks INTEGER NOT NULL CHECK (DurationWeeks > 0),
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser (UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
    IsActive BOOLEAN DEFAULT TRUE,                             -- so we can create the menu cycle without making it available
    SegmentID INTEGER REFERENCES Segment(SegmentID) ON DELETE SET NULL, -- should cascade?
);

-- ServingDays Table (M-S)
-- seems like we need to indicate the segments that are relevant
CREATE TABLE ServingDays (
    ServingDaysID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
);


-- Menu Table (specific menu instance, linked to MenuCycle)
-- I think Sodexo is calling Menus meal periods: See DRIVE Familiarization Deck Universities V3 2: Page 10
-- https://developer.fourth.com/en-gb/docs/menu-cycles-api/reference#operation/Recipe_GetCollection
CREATE TABLE Menu (
    MenuID SERIAL PRIMARY KEY,
    MenuCycleID INTEGER REFERENCES MenuCycle(MenuCycleID) ON DELETE SET NULL,
    SiteID INTEGER REFERENCES Site(SiteID), -- null for a cycle menu
    Name VARCHAR(100) NOT NULL,
    CycleDayOffset INTEGER NOT NULL CHECK (CycleDayOffset >= 0), -- 0-34 for a 5 week cycle
    AttachedToCycle BOOLEAN DEFAULT FALSE,  -- when attached, changes to the Cycle Menu will cascade
    StartDate DATE,                         -- null while attached to a MenuCycle. YYYY-MM-DD
    EndDate DATE,                           -- null while attached to a MenuCycle. YYYY-MM-DD
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_end_date CHECK (EndDate >= StartDate OR EndDate IS NULL)
    -- think this may need a start day offet, and end day offset from MenuCycle
);

-- Meal Table (e.g., lunch on a specific date, linked to Menu)
-- I think Sodexo calls Meals "Meal Periods".
CREATE TABLE Meal (
    MealID SERIAL PRIMARY KEY,
    MenuID INTEGER NOT NULL REFERENCES Menu(MenuID) ON DELETE CASCADE,
    "Date" DATE NOT NULL,
    MealPeriodID INTEGER NOT NULL REFERENCES MealPeriod(MealPeriodID),
    Name VARCHAR(100) NOT NULL,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
);

-- meal periods can be read by anyone but are filtered by 
-- site if you are trying to assign
CREATE TABLE MealPeriod (
    MealPeriodID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL, -- e.g. Lunch, Dinner, All Day, etc.
    Day VARCHAR(100) NOT NULL, -- e.g. Monday, Tuesday, etc.
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    isAllDay BOOLEAN DEFAULT FALSE,
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
);

-- Recipe Table (preparation details for items)
CREATE TABLE Recipe (
    RecipeID SERIAL PRIMARY KEY,
    OrganizationID INTEGER REFERENCES Organization(OrganizationID) ON DELETE SET NULL,
    Name VARCHAR(100) NOT NULL,
    Instructions TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
    + should we map this to the standard recipe schema?
    + what about nutrition?
);

-- CycleMenu -> Menu -> Meal (with MealPeriod) -> Item -> Recipe -> Nutrition

-- Item Table (e.g., burger, linked to Recipe)
-- there is currently a link table between item and meal
-- where i had a meal_id in the item. need to understand
-- the value of have the link table as it makes query
-- and reporting much more complex.
CREATE TABLE Item (
    ItemID SERIAL PRIMARY KEY,
    MenuCycleID INTEGER REFERENCES MenuCycle(MenuCycleID), -- can be null for a non cycle menu.
    MealID INTEGER NOT NULL REFERENCES Meal(MealID),       -- not sure if we should cascade?
    RecipeID INTEGER NOT NULL REFERENCES Recipe(RecipeID), -- not sure if we should cascade?
    Component TEXT DEFAULT '',                             -- e.g. Appetizer, Entree, Vegetable, Dessert, etc.
    Portion TEXT DEFAULT '',
    Source TEXT NOT NULL,                                  -- CycleMenu, Chef, AI
    Note TEXT DEFAULT '',
    SelectGroup TEXT DEFAULT '',                           -- e.g. Appetizer, Entree, Vegetable, Dessert, etc.
    DietaryRestrictions TEXT DEFAULT '[]',
    UsagePerGuest REAL NOT NULL DEFAULT 0,                 -- for example 0.5 if half of the guests will have it
    Quantity REAL NOT NULL CHECK (Quantity >= 0),          -- here you have the ability to set a specific value.
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
);

CREATE TABLE DietaryRestriction (
    DietaryRestrictionID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'Regular', 'CCD', 'Dysphagia'
    DisplayName VARCHAR(100),           -- e.g., 'Consistent Carbohydrate'
    Color VARCHAR(7),                   -- e.g., '#E3F2FD'
    Category VARCHAR(50),               -- e.g., 'metabolic', 'mechanical'
    Description TEXT,                   -- e.g., 'Controls carbohydrate intake'
    Segments VARCHAR(255)               -- e.g., 'Healthcare,Seniors'
);

-- link table between DietaryRestriction and Segment
CREATE TABLE DietaryRestriction_Segment (
    DietaryRestrictionID INTEGER NOT NULL REFERENCES DietaryRestriction(DietaryRestrictionID) ON DELETE CASCADE,
    SegmentID INTEGER NOT NULL REFERENCES Segment(SegmentID) ON DELETE CASCADE,
    PRIMARY KEY (DietaryRestrictionID, SegmentID)
);

-- link table between Segment and Site
CREATE TABLE Segment_Site (
    SegmentID INTEGER NOT NULL REFERENCES Segment(SegmentID) ON DELETE CASCADE,
    SiteID INTEGER NOT NULL REFERENCES Site(SiteID) ON DELETE CASCADE,
    PRIMARY KEY (SegmentID, SiteID)
);

CREATE TABLE Segment (
    SegmentID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'Healthcare', 'Seniors'
    Description TEXT,
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP
)

CREATE TABLE Meal_DietaryRestriction (
    MealID INTEGER NOT NULL REFERENCES Meal(MealID) ON DELETE CASCADE,
    DietaryRestrictionID INTEGER NOT NULL REFERENCES DietaryRestriction(DietaryRestrictionID) ON DELETE CASCADE,
    GuestCount INTEGER NOT NULL CHECK (GuestCount >= 0),  -- e.g., 10 for Regular
    PRIMARY KEY (MealID, DietaryRestrictionID)
);

-- Event Table (e.g., game day)
CREATE TABLE Event (
    EventID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    StartDate DATE,
    EndDate DATE
);

-- Customer Table (e.g., students, patients)
CREATE TABLE Customer (
    CustomerID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(255) UNIQUE
);

-- Order Table (customer orders, linked to Meal and Customer)
CREATE TABLE "Order" (
    OrderID SERIAL PRIMARY KEY,
    CustomerID INTEGER NOT NULL REFERENCES Customer(CustomerID) ON DELETE CASCADE,
    MealID INTEGER NOT NULL REFERENCES Meal(MealID) ON DELETE CASCADE,
    OrderDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(50)  -- e.g., 'Placed', 'Delivered'
);

-- Junction Tables

-- Site_Menu (many-to-many Menu-Site, with customizations)
-- This ties a menu to a site and enables customizations.
-- I really think the customization model is problematic
-- for reporting and adds complexity. Copy Pasta seems like
-- a better approach but doesn't leave room for updating later.
CREATE TABLE Site_Menu (
    SiteID INTEGER NOT NULL REFERENCES Site(SiteID) ON DELETE CASCADE,
    MenuID INTEGER NOT NULL REFERENCES Menu(MenuID) ON DELETE CASCADE,
    CustomizationDetails JSONB,  -- e.g., {"MealID": 101, "OriginalItemID": 201, "NewItemID": 203}
    CustomizedBy INTEGER REFERENCES SystemUser(UserID),
    CustomizedDate TIMESTAMP,
    PRIMARY KEY (SiteID, MenuID)
);

-- Meal_Item (many-to-many Meal-Item)
CREATE TABLE Meal_Item (
    MealID INTEGER NOT NULL REFERENCES Meal(MealID) ON DELETE CASCADE,
    ItemID INTEGER NOT NULL REFERENCES Item(ItemID) ON DELETE CASCADE,
    Quantity INTEGER NOT NULL CHECK (Quantity > 0),
    PRIMARY KEY (MealID, ItemID)
);

-- Meal_Station (many-to-many Meal-Station)
CREATE TABLE Meal_Station (
    MealID INTEGER NOT NULL REFERENCES Meal(MealID) ON DELETE CASCADE,
    StationID INTEGER NOT NULL REFERENCES Station(StationID) ON DELETE CASCADE,
    Details TEXT,  -- e.g., preparation notes
    PRIMARY KEY (MealID, StationID)
);


-- Menu_Event (many-to-many Menu-Event)
CREATE TABLE Menu_Event (
    MenuID INTEGER NOT NULL REFERENCES Menu(MenuID) ON DELETE CASCADE,
    EventID INTEGER NOT NULL REFERENCES Event(EventID) ON DELETE CASCADE,
    ImpactNotes TEXT,
    PRIMARY KEY (MenuID, EventID)
);

-- Customer_DietaryRestriction (many-to-many Customer-DietaryRestriction)
CREATE TABLE Customer_DietaryRestriction (
    CustomerID INTEGER NOT NULL REFERENCES Customer(CustomerID) ON DELETE CASCADE,
    DietaryRestrictionID INTEGER NOT NULL REFERENCES DietaryRestriction(DietaryRestrictionID) ON DELETE CASCADE,
    PRIMARY KEY (CustomerID, DietaryRestrictionID)
);

-- link table between Recipe and Nutrients
CREATE TABLE Recipe_Nutrients (
    RecipeID INTEGER NOT NULL REFERENCES Recipe(RecipeID) ON DELETE CASCADE,
    NutrientID INTEGER NOT NULL REFERENCES Nutrients(NutrientID) ON DELETE CASCADE,
    PRIMARY KEY (RecipeID, NutrientID)
);

-- this is a reproduction of the USDA Food Data Central nutrition table
-- denormalized for simplicity and performance
CREATE TABLE Nutrients (
    RecipeId INTEGER, -- Foreign key referencing ItemID from drive table
    EnergyKcal REAL, -- fdc_id:1008, nutrient_nbr: 208, Energy in kilocalories, DRIVE_COL: Kcal_kcal
    EnergyKj REAL, -- fdc_id:1062, nutrient_nbr: 268, Energy in kilojoules
    ProteinG REAL, -- fdc_id:1003, nutrient_nbr: 203, Total protein in grams, DRIVE_COL: PRO_g
    TotalLipidFatG REAL, -- fdc_id:1004, nutrient_nbr: 204, Total lipid (fat) in grams, DRIVE_COL: FAT_g
    CarbohydrateByDifferenceG REAL, -- fdc_id:1005, nutrient_nbr: 205, Carbohydrate by difference in grams, DRIVE_COL: CHO_g
    FiberTotalDietaryG REAL, -- fdc_id:1079, nutrient_nbr: 291, Total dietary fiber in grams, DRIVE_COL: TDFB_g
    FiberSolubleG REAL, -- fdc_id:1082, nutrient_nbr: 295, Soluble dietary fiber in grams
    FiberInsolubleG REAL, -- fdc_id:1084, nutrient_nbr: 297, Insoluble dietary fiber in grams
    TotalSugarsG REAL, -- fdc_id:2000, nutrient_nbr: 269, Total sugars in grams, DRIVE_COL: SUGR_g
    SugarsAddedG REAL, -- fdc_id:1235, nutrient_nbr: 539, Added sugars in grams, DRIVE_COL: addsgr_g
    CalciumMg REAL, -- fdc_id:1087, nutrient_nbr: 301, Calcium in milligrams, DRIVE_COL: CA_mg
    IronMg REAL, -- fdc_id:1089, nutrient_nbr: 303, Iron in milligrams, DRIVE_COL: FE_mg
    MagnesiumMg REAL, -- fdc_id:1090, nutrient_nbr: 304, Magnesium in milligrams, DRIVE_COL: MG_mg
    PhosphorusMg REAL, -- fdc_id:1091, nutrient_nbr: 305, Phosphorus in milligrams, DRIVE_COL: P_mg
    PotassiumMg REAL, -- fdc_id:1092, nutrient_nbr: 306, Potassium in milligrams, DRIVE_COL: K_mg
    SodiumMg REAL, -- fdc_id:1093, nutrient_nbr: 307, Sodium in milligrams, DRIVE_COL: NA_mg
    ZincMg REAL, -- fdc_id:1095, nutrient_nbr: 309, Zinc in milligrams, DRIVE_COL: ZN_mg
    CopperMg REAL, -- fdc_id:1098, nutrient_nbr: 312, Copper in milligrams, DRIVE_COL: CU_mg
    ManganeseMg REAL, -- fdc_id:1101, nutrient_nbr: 315, Manganese in milligrams, DRIVE_COL: MN_mg
    SeleniumUg REAL, -- fdc_id:1103, nutrient_nbr: 317, Selenium in micrograms, DRIVE_COL: SE_mcg
    VitaminARaeUg REAL, -- fdc_id:1106, nutrient_nbr: 320, Vitamin A in Retinol Activity Equivalents (micrograms), DRIVE_COL: VITA_mcg
    VitaminEAlphaTocopherolMg REAL, -- fdc_id:1109, nutrient_nbr: 323, Vitamin E as alpha-tocopherol in milligrams, DRIVE_COL: VITE_mg
    VitaminDD2D3Ug REAL, -- fdc_id:1114, nutrient_nbr: 328, Vitamin D (D2 + D3) in micrograms, DRIVE_COL: VITD_mcg
    VitaminCMg REAL, -- fdc_id:1162, nutrient_nbr: 401, Total ascorbic acid (Vitamin C) in milligrams, DRIVE_COL: VITC_mg
    ThiaminMg REAL, -- fdc_id:1165, nutrient_nbr: 404, Thiamin (Vitamin B1) in milligrams, DRIVE_COL: VITB1_mg
    RiboflavinMg REAL, -- fdc_id:1166, nutrient_nbr: 405, Riboflavin (Vitamin B2) in milligrams, DRIVE_COL: VITB2_mg
    NiacinMg REAL, -- fdc_id:1167, nutrient_nbr: 406, Niacin in milligrams, DRIVE_COL: NIA_mg
    PantothenicAcidMg REAL, -- fdc_id:1170, nutrient_nbr: 410, Pantothenic acid in milligrams, DRIVE_COL: Pantac_mg
    VitaminB6Mg REAL, -- fdc_id:1175, nutrient_nbr: 415, Vitamin B6 in milligrams, DRIVE_COL: VITB6_mg
    FolateTotalUg REAL, -- fdc_id:1177, nutrient_nbr: 417, Total folate in micrograms, DRIVE_COL: FOL_mcg
    VitaminB12Ug REAL, -- fdc_id:1178, nutrient_nbr: 418, Vitamin B12 in micrograms, DRIVE_COL: VITB12_mcg
    CholineTotalMg REAL, -- fdc_id:1180, nutrient_nbr: 421, Total choline in milligrams, DRIVE_COL: CHOLN_mg
    VitaminKPhylloquinoneUg REAL, -- fdc_id:1185, nutrient_nbr: 430, Vitamin K (phylloquinone) in micrograms, DRIVE_COL: VITK_mcg
    CholesterolMg REAL, -- fdc_id:1253, nutrient_nbr: 601, Cholesterol in milligrams, DRIVE_COL: CHOL_mg
    FattyAcidsTotalSaturatedG REAL, -- fdc_id:1258, nutrient_nbr: 606, Total saturated fatty acids in grams, DRIVE_COL: SFAT_g
    FattyAcidsTotalMonounsaturatedG REAL, -- fdc_id:1292, nutrient_nbr: 645, Total monounsaturated fatty acids in grams, DRIVE_COL: MUFAT_g
    FattyAcidsTotalPolyunsaturatedG REAL, -- fdc_id:1293, nutrient_nbr: 646, Total polyunsaturated fatty acids in grams, DRIVE_COL: PUFAT_g
    FattyAcidsTotalTransG REAL, -- fdc_id:1257, nutrient_nbr: 605, Total trans fatty acids in grams, DRIVE_COL: FATRN_g
    Sfa16_0G REAL, -- fdc_id:1265, nutrient_nbr: 613, Palmitic acid (16:0) in grams
    Sfa18_0G REAL, -- fdc_id:1266, nutrient_nbr: 614, Stearic acid (18:0) in grams
    Mufa18_1G REAL, -- fdc_id:1268, nutrient_nbr: 617, Oleic acid (18:1) in grams
    Pufa18_2G REAL, -- fdc_id:1269, nutrient_nbr: 618, Linoleic acid (18:2) in grams, DRIVE_COL: LIN_AC_g
    Pufa18_3G REAL, -- fdc_id:1270, nutrient_nbr: 619, Linolenic acid (18:3) in grams
    Pufa20_5N3EpaG REAL, -- fdc_id:1278, nutrient_nbr: 629, Eicosapentaenoic acid (EPA, 20:5 n-3) in grams
    Pufa22_6N3DhaG REAL, -- fdc_id:1272, nutrient_nbr: 621, Docosahexaenoic acid (DHA, 22:6 n-3) in grams
    WaterG REAL, -- fdc_id:1051, nutrient_nbr: 255, Water in grams
    PRIMARY KEY (recipeId),
    FOREIGN KEY (recipeId) REFERENCES drive(ItemID)
);

CREATE TABLE Supplier (
    SupplierID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    ContactInfo TEXT,  -- e.g., email, phone
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE UnitOrderGuide (
    OrderGuideID SERIAL PRIMARY KEY,
    SiteID INTEGER NOT NULL REFERENCES Site(SiteID) ON DELETE CASCADE,
    GuideDate DATE NOT NULL,  -- e.g., for the week starting October 6, 2025
    GeneratedBy INTEGER REFERENCES SystemUser(UserID),  -- e.g., automated from menu forecasts
    GeneratedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(50) DEFAULT 'Draft'  -- e.g., 'Draft', 'Submitted', 'Ordered'
);

CREATE TABLE UnitOrderGuideItem (
    OrderGuideItemID SERIAL PRIMARY KEY,
    OrderGuideID INTEGER NOT NULL REFERENCES UnitOrderGuide(OrderGuideID) ON DELETE CASCADE,
    ItemID INTEGER NOT NULL REFERENCES Item(ItemID) ON DELETE CASCADE,
    SupplierID INTEGER REFERENCES Supplier(SupplierID),
    SuggestedQuantity REAL NOT NULL CHECK (SuggestedQuantity >= 0),  -- e.g., calculated from Meal_Item quantities and diet counts
    ParLevel REAL DEFAULT 0 CHECK (ParLevel >= 0),  -- minimum stock threshold for reordering
    UnitPrice DECIMAL(10,2) DEFAULT 0,  -- price per unit from supplier
    TotalCost DECIMAL(10,2) GENERATED ALWAYS AS (SuggestedQuantity * UnitPrice) STORED,  -- auto-calculated
    Notes TEXT,  -- e.g., "For CCD diet compliance"
    PRIMARY KEY (OrderGuideID, ItemID)
);

-- ====================================================================
-- NORMALIZED CLAIMS TABLES
-- ====================================================================

-- ClaimType: Defines all possible claims that can be made about recipes
-- This is a lookup table that standardizes claim definitions
CREATE TABLE ClaimType (
    ClaimTypeID SERIAL PRIMARY KEY,
    Standard VARCHAR(50) NOT NULL, -- e.g., 'GS1', 'FDA', 'Custom', 'USDA'
    ClaimCode VARCHAR(100) NOT NULL, -- e.g., 'dietTypeCodeVegan', 'allergenContainsMilk'
    ClaimCategory VARCHAR(50), -- e.g., 'Allergen', 'Diet', 'Certification', 'Nutrient', 'Additive'
    ClaimName VARCHAR(200) NOT NULL, -- e.g., 'Vegan Diet Type', 'Contains Milk'
    Note TEXT, -- Human-readable description of what this claim means
    DataType VARCHAR(20) DEFAULT 'BOOLEAN' CHECK (DataType IN ('BOOLEAN', 'TEXT', 'NUMERIC', 'DATE')), -- Type of value expected
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP,
    UNIQUE (Standard, ClaimCode)
);

-- RecipeClaim: Stores actual claim values for each recipe
-- This replaces the old Claims table with a flexible key-value structure
CREATE TABLE RecipeClaim (
    RecipeClaimID SERIAL PRIMARY KEY,
    RecipeID INTEGER NOT NULL REFERENCES Recipe(RecipeID) ON DELETE CASCADE,
    ClaimTypeID INTEGER NOT NULL REFERENCES ClaimType(ClaimTypeID) ON DELETE RESTRICT,
    ClaimValue TEXT NOT NULL, -- Stores 'Yes', 'No', or other values as text
    Note TEXT, -- Optional notes or context about this specific claim
    VerifiedDate DATE, -- When was this claim verified/confirmed
    VerifiedBy INTEGER REFERENCES SystemUser(UserID), -- Who verified this claim
    Source VARCHAR(100), -- e.g., 'Supplier', 'Lab Test', 'Recipe Analysis', 'Manual Entry'
    ExpirationDate DATE, -- For certifications that expire
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP,
    UNIQUE (RecipeID, ClaimTypeID)
);

-- Index for performance when querying claims by recipe
CREATE INDEX idx_recipe_claim_recipe ON RecipeClaim(RecipeID);
CREATE INDEX idx_recipe_claim_type ON RecipeClaim(ClaimTypeID);
CREATE INDEX idx_recipe_claim_value ON RecipeClaim(ClaimValue);

-- Index for filtering by claim category
CREATE INDEX idx_claim_type_category ON ClaimType(ClaimCategory);
CREATE INDEX idx_claim_type_standard ON ClaimType(Standard);

-- ====================================================================
-- SEED DATA: ClaimType - Migration from denormalized Claims table
-- ====================================================================

-- Diet Type Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'dietTypeCodeVegan', 'Diet', 'Vegan Diet Type', 'GS1: allergenFreeFromAnimalProducts or dietTypeCode=VEGETARIAN. Sodexo DRIVE column: Vegan', 'BOOLEAN'),
('GS1', 'dietTypeCodeVegetarian', 'Diet', 'Vegetarian Diet Type', 'GS1: dietTypeCode=VEGETARIAN. Sodexo DRIVE column: Vegetarian', 'BOOLEAN'),
('GS1', 'dietTypeCodePlantBased', 'Diet', 'Plant-Based Diet Type', 'GS1: dietTypeCode=PLANT_BASED. Sodexo DRIVE column: Plant_Based', 'BOOLEAN');

-- Certification Claims - Diet
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'certificationTypeVegan', 'Certification', 'Vegan Certification', 'GS1: certificationType=VEGAN. Third-party vegan certification', 'BOOLEAN'),
('GS1', 'certificationTypeVegetarian', 'Certification', 'Vegetarian Certification', 'GS1: certificationType=VEGETARIAN. Third-party vegetarian certification', 'BOOLEAN');

-- Allergen - Contains Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'allergenContainsMilk', 'Allergen', 'Contains Milk', 'Product contains milk or milk derivatives. Sodexo DRIVE column: Milk', 'BOOLEAN'),
('GS1', 'allergenContainsEgg', 'Allergen', 'Contains Egg', 'Product contains eggs or egg derivatives. Sodexo DRIVE column: Eggs', 'BOOLEAN'),
('GS1', 'allergenContainsFish', 'Allergen', 'Contains Fish', 'Product contains fish or fish derivatives. Sodexo DRIVE column: Fish', 'BOOLEAN'),
('GS1', 'allergenContainsCrustacean', 'Allergen', 'Contains Crustacean', 'Product contains crustacean shellfish. Sodexo DRIVE column: Shellfish', 'BOOLEAN'),
('GS1', 'allergenContainsWheat', 'Allergen', 'Contains Wheat', 'Product contains wheat. Sodexo DRIVE column: Wheat', 'BOOLEAN'),
('GS1', 'allergenContainsPeanut', 'Allergen', 'Contains Peanut', 'Product contains peanuts. Sodexo DRIVE column: Peanuts', 'BOOLEAN'),
('GS1', 'allergenContainsTreeNuts', 'Allergen', 'Contains Tree Nuts', 'Product contains tree nuts. Sodexo DRIVE column: Tree_Nuts', 'BOOLEAN'),
('GS1', 'allergenContainsSoybean', 'Allergen', 'Contains Soybean', 'Product contains soy or soy derivatives. Sodexo DRIVE column: Soy', 'BOOLEAN'),
('GS1', 'allergenContainsSesame', 'Allergen', 'Contains Sesame', 'Product contains sesame seeds. Sodexo DRIVE column: Sesame', 'BOOLEAN'),
('GS1', 'allergenContainsSulphites', 'Allergen', 'Contains Sulphites', 'Product contains sulphites/sulfites. Sodexo DRIVE column: Sulphites', 'BOOLEAN'),
('GS1', 'allergenContainsMustard', 'Allergen', 'Contains Mustard', 'Product contains mustard. Sodexo DRIVE column: Mustard', 'BOOLEAN'),
('GS1', 'allergenContainsCelery', 'Allergen', 'Contains Celery', 'Product contains celery. EU allergen requirement', 'BOOLEAN'),
('GS1', 'allergenContainsMollusc', 'Allergen', 'Contains Mollusc', 'Product contains molluscs (clams, oysters, etc.). EU allergen requirement', 'BOOLEAN'),
('GS1', 'allergenContainsLupin', 'Allergen', 'Contains Lupin', 'Product contains lupin (legume). EU allergen requirement', 'BOOLEAN');

-- Allergen - May Contain Claims (Cross-contamination)
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'allergenMayContainMilk', 'Allergen', 'May Contain Milk', 'Product may contain traces of milk. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainEgg', 'Allergen', 'May Contain Egg', 'Product may contain traces of egg. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainFish', 'Allergen', 'May Contain Fish', 'Product may contain traces of fish. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainCrustacean', 'Allergen', 'May Contain Crustacean', 'Product may contain traces of crustacean. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainWheat', 'Allergen', 'May Contain Wheat', 'Product may contain traces of wheat. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainPeanut', 'Allergen', 'May Contain Peanut', 'Product may contain traces of peanuts. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainTreeNuts', 'Allergen', 'May Contain Tree Nuts', 'Product may contain traces of tree nuts. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainSoybean', 'Allergen', 'May Contain Soybean', 'Product may contain traces of soy. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainSesame', 'Allergen', 'May Contain Sesame', 'Product may contain traces of sesame. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainSulphites', 'Allergen', 'May Contain Sulphites', 'Product may contain traces of sulphites. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainMustard', 'Allergen', 'May Contain Mustard', 'Product may contain traces of mustard. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainCelery', 'Allergen', 'May Contain Celery', 'Product may contain traces of celery. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainMollusc', 'Allergen', 'May Contain Mollusc', 'Product may contain traces of molluscs. Cross-contamination warning', 'BOOLEAN'),
('GS1', 'allergenMayContainLupin', 'Allergen', 'May Contain Lupin', 'Product may contain traces of lupin. Cross-contamination warning', 'BOOLEAN');

-- Allergen - Sulphite Concentration (Numeric value)
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'allergenSulphiteConcentrationValue', 'Allergen', 'Sulphite Concentration', 'Concentration level of sulphites in ppm. Required when sulphite level >10ppm', 'NUMERIC');

-- Additive Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('Custom', 'additiveContainsMsg', 'Additive', 'Contains MSG', 'Product contains monosodium glutamate. Sodexo DRIVE column: MSG', 'BOOLEAN'),
('Custom', 'additiveMayContainMsg', 'Additive', 'May Contain MSG', 'Product may contain traces of MSG. Cross-contamination warning', 'BOOLEAN');

-- Allergen Free Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'allergenFreeFromGluten', 'Allergen', 'Gluten Free', 'Product is free from gluten. Sodexo DRIVE column: Gluten (inverted logic)', 'BOOLEAN'),
('GS1', 'certificationTypeGlutenFree', 'Certification', 'Gluten Free Certification', 'GS1: certificationType=GLUTEN_FREE. Third-party gluten-free certification', 'BOOLEAN'),
('GS1', 'allergenFreeFromLactose', 'Allergen', 'Lactose Free', 'Product is free from lactose', 'BOOLEAN');

-- Organic Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'hasOrganicClaim', 'Certification', 'Organic Claim', 'Product has an organic claim', 'BOOLEAN'),
('GS1', 'certificationTypeOrganic', 'Certification', 'Organic Certification', 'GS1: certificationType=ORGANIC. USDA or other organic certification', 'BOOLEAN');

-- GMO Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'hasNonGmoClaim', 'Certification', 'Non-GMO Claim', 'Product is non-GMO. Non-GMO Project or similar', 'BOOLEAN');

-- Nutrient Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'nutrientClaimLowSodium', 'Nutrient', 'Low Sodium', 'GS1: nutrientClaim=LOW_SODIUM. FDA: ≤140mg per serving', 'BOOLEAN'),
('GS1', 'nutrientClaimLowFat', 'Nutrient', 'Low Fat', 'GS1: nutrientClaim=LOW_FAT. FDA: ≤3g per serving', 'BOOLEAN'),
('GS1', 'nutrientClaimSugarFree', 'Nutrient', 'Sugar Free', 'GS1: nutrientClaim=SUGAR_FREE. FDA: <0.5g per serving', 'BOOLEAN'),
('GS1', 'nutrientClaimLowCalorie', 'Nutrient', 'Low Calorie', 'GS1: nutrientClaim=LOW_CALORIE. FDA: ≤40 calories per serving', 'BOOLEAN'),
('GS1', 'nutrientClaimLowGlycemicIndex', 'Nutrient', 'Low Glycemic Index', 'GS1: nutrientClaim=LOW_GLYCEMIC_INDEX. GI ≤55', 'BOOLEAN');

-- Additive Free Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'additiveFreeFromArtificialFlavors', 'Additive', 'No Artificial Flavors', 'Free from artificial flavors. No synthetic flavoring substances', 'BOOLEAN'),
('GS1', 'additiveFreeFromArtificialColors', 'Additive', 'No Artificial Colors', 'Free from artificial colors. No synthetic food dyes', 'BOOLEAN'),
('GS1', 'additiveFreeFromPreservatives', 'Additive', 'No Preservatives', 'Free from preservatives. No chemical preservatives', 'BOOLEAN');

-- Ingredient Claims
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'ingredientFreeFromPalmOil', 'Ingredient', 'Palm Oil Free', 'Product does not contain palm oil. Sustainability claim', 'BOOLEAN');

-- Sustainability/Ethical Certifications
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'certificationTypeFairTrade', 'Certification', 'Fair Trade Certification', 'GS1: certificationType=FAIR_TRADE. Fair Trade certified', 'BOOLEAN'),
('GS1', 'certificationTypeSustainable', 'Certification', 'Sustainable Certification', 'GS1: certificationType=SUSTAINABLE. Sustainability certification', 'BOOLEAN');

-- Religious/Cultural Certifications
INSERT INTO ClaimType (Standard, ClaimCode, ClaimCategory, ClaimName, Note, DataType) VALUES
('GS1', 'certificationTypeHalal', 'Certification', 'Halal Certification', 'GS1: certificationType=HALAL. Sodexo DRIVE column: Halal', 'BOOLEAN'),
('GS1', 'certificationTypeKosher', 'Certification', 'Kosher Certification', 'GS1: certificationType=KOSHER. Sodexo DRIVE column: Kosher', 'BOOLEAN'),
('GS1', 'certificationTypeKosherDairy', 'Certification', 'Kosher Dairy', 'GS1: certificationType=KOSHER_DAIRY. Sodexo DRIVE column: Kosher_Dairy', 'BOOLEAN'),
('GS1', 'certificationTypeKosherFish', 'Certification', 'Kosher Fish', 'GS1: certificationType=KOSHER_FISH. Sodexo DRIVE column: Kosher_Fish', 'BOOLEAN'),
('GS1', 'certificationTypeKosherMeat', 'Certification', 'Kosher Meat', 'GS1: certificationType=KOSHER_MEAT. Sodexo DRIVE column: Kosher_Meat', 'BOOLEAN'),
('GS1', 'certificationTypeKosherPareve', 'Certification', 'Kosher Pareve', 'GS1: certificationType=KOSHER_PAREVE. Sodexo DRIVE column: Kosher_Pareve', 'BOOLEAN');

-- ====================================================================
-- DENORMALIZED NUTRIENT TABLE
-- ====================================================================

-- Nutrient: Standardized nutrient definitions from USDA FoodData Central
-- This table provides a comprehensive lookup of all nutrients with mappings to Sodexo DRIVE columns
CREATE TABLE Nutrient (
    NutrientID SERIAL PRIMARY KEY,
    Standard VARCHAR(50) NOT NULL, -- e.g., 'FDC' for USDA FoodData Central
    NutrientName VARCHAR(200) NOT NULL, -- e.g., 'Energy', 'Protein', 'Calcium, Ca'
    Unit VARCHAR(20) NOT NULL, -- e.g., 'KCAL', 'G', 'MG', 'UG', 'IU'
    NutrientNumber VARCHAR(20), -- USDA nutrient_nbr, e.g., '208', '203', '301'
    Rank REAL NOT NULL, -- Sort order for display purposes
    Note TEXT, -- Mappings to Sodexo DRIVE columns and additional context
    CreatedBy INTEGER REFERENCES SystemUser(UserID),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastModifiedBy INTEGER REFERENCES SystemUser(UserID),
    LastModifiedDate TIMESTAMP,
    UNIQUE (Standard, NutrientNumber)
);

-- Index for performance when querying nutrients
CREATE INDEX idx_nutrient_standard ON nutrient(Standard);
CREATE INDEX idx_nutrient_number ON nutrient(NutrientNumber);
CREATE INDEX idx_nutrient_rank ON nutrient(Rank);

-- ====================================================================
-- SEED DATA: Nutrient - USDA FoodData Central Nutrients
-- ====================================================================

-- Proximates
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Proximates', 'G', '951', 50.0, NULL),
('FDC', 'Water', 'G', '255', 100.0, NULL),
('FDC', 'Solids', 'G', '201', 200.0, NULL),
('FDC', 'Energy (Atwater General Factors)', 'KCAL', '957', 280.0, NULL),
('FDC', 'Energy (Atwater Specific Factors)', 'KCAL', '958', 290.0, NULL),
('FDC', 'Energy', 'KCAL', '208', 300.0, 'Maps to DRIVE Kcal_kcal'),
('FDC', 'Energy', 'kJ', '268', 400.0, NULL),
('FDC', 'Nitrogen', 'G', '202', 500.0, NULL),
('FDC', 'Protein', 'G', '203', 600.0, 'Maps to DRIVE PRO_g'),
('FDC', 'Adjusted Protein', 'G', '257', 700.0, NULL),
('FDC', 'Total lipid (fat)', 'G', '204', 800.0, 'Maps to DRIVE FAT_g'),
('FDC', 'Total fat (NLEA)', 'G', '298', 900.0, NULL),
('FDC', 'Ash', 'G', '207', 1000.0, NULL),
('FDC', 'Carbohydrates', 'G', '956', 1100.0, NULL),
('FDC', 'Carbohydrate, by difference', 'G', '205', 1110.0, 'Maps to DRIVE CHO_g'),
('FDC', 'Carbohydrate, by summation', 'G', '205.2', 1120.0, NULL),
('FDC', 'Fiber, total dietary', 'G', '291', 1200.0, 'Maps to DRIVE TDFB_g'),
('FDC', 'Fiber, soluble', 'G', '295', 1240.0, NULL),
('FDC', 'Fiber, insoluble', 'G', '297', 1260.0, NULL),
('FDC', 'Total dietary fiber (AOAC 2011.25)', 'G', '293', 1300.0, NULL),
('FDC', 'High Molecular Weight Dietary Fiber (HMWDF)', 'G', '293.3', 1305, NULL),
('FDC', 'Low Molecular Weight Dietary Fiber (LMWDF)', 'G', '293.4', 1306, NULL),
('FDC', 'Insoluble dietary fiber (IDF)', 'G', '293.1', 1310.0, NULL),
('FDC', 'Soluble dietary fiber (SDFP+SDFS)', 'G', '293.2', 1320.0, NULL),
('FDC', 'Soluble dietary fiber (SDFP)', 'G', '954', 1324.0, NULL),
('FDC', 'Soluble dietary fiber (SDFS)', 'G', '953', 1326.0, NULL),
('FDC', 'Beta-glucan', 'G', NULL, 1327.0, NULL),
('FDC', 'Sugars, Total', 'G', '269.3', 1500.0, NULL),
('FDC', 'Total Sugars', 'G', '269', 1510.0, 'Maps to DRIVE SUGR_g'),
('FDC', 'Sugars, intrinsic', 'G', '549', 1520.0, NULL),
('FDC', 'Sugars, added', 'G', '539', 1540.0, 'Maps to DRIVE addsgr_g'),
('FDC', 'Sucrose', 'G', '210', 1600.0, NULL),
('FDC', 'Glucose', 'G', '211', 1700.0, NULL),
('FDC', 'Fructose', 'G', '212', 1800.0, NULL),
('FDC', 'Lactose', 'G', '213', 1900.0, NULL),
('FDC', 'Maltose', 'G', '214', 2000.0, NULL),
('FDC', 'Galactose', 'G', '287', 2100.0, NULL),
('FDC', 'Starch', 'G', '209', 2200.0, NULL),
('FDC', 'Oligosaccharides', 'MG', NULL, 2250.0, NULL),
('FDC', 'Raffinose', 'G', '288', 2300.0, NULL),
('FDC', 'Stachyose', 'G', '289', 2400.0, NULL),
('FDC', 'Verbascose', 'G', NULL, 2450.0, NULL),
('FDC', 'Mannitol', 'G', '260', 2500.0, NULL),
('FDC', 'Sorbitol', 'G', '261', 2600.0, NULL),
('FDC', 'Xylitol', 'G', '290', 2700.0, NULL),
('FDC', 'Inositol', 'MG', '422', 2800.0, NULL),
('FDC', 'Organic acids', 'G', '229', 2850.0, NULL),
('FDC', 'Acetic acid', 'MG', '230', 2900.0, NULL),
('FDC', 'Aconitic acid', 'MG', '231', 3000.0, NULL),
('FDC', 'Benzoic acid', 'MG', '232', 3100.0, NULL),
('FDC', 'Chelidonic acid', 'MG', '233', 3200.0, NULL),
('FDC', 'Chlorogenic acid', 'MG', '234', 3300.0, NULL),
('FDC', 'Cinnamic acid', 'MG', '235', 3400.0, NULL),
('FDC', 'Citric acid', 'MG', '236', 3500.0, NULL),
('FDC', 'Fumaric acid', 'MG', '237', 3600.0, NULL),
('FDC', 'Galacturonic acid', 'MG', '238', 3700.0, NULL),
('FDC', 'Gallic acid', 'MG', '239', 3800.0, NULL),
('FDC', 'Glycolic acid', 'MG', '240', 3900.0, NULL),
('FDC', 'Isocitric acid', 'MG', '241', 4000.0, NULL),
('FDC', 'Lactic acid', 'MG', '242', 4100.0, NULL),
('FDC', 'Malic acid', 'MG', '243', 4200.0, NULL),
('FDC', 'Oxaloacetic acid', 'MG', '244', 4300.0, NULL),
('FDC', 'Oxalic acid', 'MG', '245', 4400.0, NULL),
('FDC', 'Phytic acid', 'MG', '246', 4500.0, NULL),
('FDC', 'Pyruvic acid', 'MG', '247', 4600.0, NULL),
('FDC', 'Quinic acid', 'MG', '248', 4700.0, NULL),
('FDC', 'Salicylic acid', 'MG', '249', 4800.0, NULL),
('FDC', 'Succinic acid', 'MG', '250', 4900.0, NULL),
('FDC', 'Tartaric acid', 'MG', '251', 5000.0, NULL),
('FDC', 'Ursolic acid', 'MG', '252', 5100.0, NULL);

-- Minerals
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Minerals', 'MG', '300', 5200.0, NULL),
('FDC', 'Calcium, Ca', 'MG', '301', 5300.0, 'Maps to DRIVE CA_mg'),
('FDC', 'Calcium, intrinsic', 'MG', '561', 5320.0, NULL),
('FDC', 'Calcium, added', 'MG', '551', 5340.0, NULL),
('FDC', 'Iron, Fe', 'MG', '303', 5400.0, 'Maps to DRIVE FE_mg'),
('FDC', 'Iron, intrinsic', 'MG', '563', 5420.0, NULL),
('FDC', 'Iron, added', 'MG', '553', 5440.0, NULL),
('FDC', 'Magnesium, Mg', 'MG', '304', 5500.0, 'Maps to DRIVE MG_mg'),
('FDC', 'Phosphorus, P', 'MG', '305', 5600.0, 'Maps to DRIVE P_mg'),
('FDC', 'Potassium, K', 'MG', '306', 5700.0, 'Maps to DRIVE K_mg'),
('FDC', 'Sodium, Na', 'MG', '307', 5800.0, 'Maps to DRIVE NA_mg'),
('FDC', 'Zinc, Zn', 'MG', '309', 5900.0, 'Maps to DRIVE ZN_mg'),
('FDC', 'Copper, Cu', 'MG', '312', 6000.0, 'Maps to DRIVE CU_mg'),
('FDC', 'Manganese, Mn', 'MG', '315', 6100.0, 'Maps to DRIVE MN_mg'),
('FDC', 'Iodine, I', 'UG', '314', 6150.0, 'Maps to DRIVE I_mcg'),
('FDC', 'Selenium, Se', 'UG', '317', 6200.0, 'Maps to DRIVE SE_mcg'),
('FDC', 'Fluoride, F', 'UG', '313', 6240.0, NULL),
('FDC', 'Sulfur, S', 'MG', '308', 6241.0, NULL),
('FDC', 'Nickel, Ni', 'UG', '371', 6242.0, NULL),
('FDC', 'Molybdenum, Mo', 'UG', '316', 6243.0, 'Maps to DRIVE MO_mcg'),
('FDC', 'Cobalt, Co', 'UG', '311', 6244.0, NULL),
('FDC', 'Boron, B', 'UG', '354', 6245.0, NULL),
('FDC', 'Fluoride - DO NOT USE; use 313', 'UG', '374', 6250.0, NULL);

-- Vitamins and Other Components
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Vitamins and Other Components', 'G', '952', 6250.0, NULL),
('FDC', 'Vitamin C, total ascorbic acid', 'MG', '401', 6300.0, 'Maps to DRIVE VITC_mg'),
('FDC', 'Vitamin C, intrinsic', 'MG', '581', 6320.0, NULL),
('FDC', 'Vitamin C, added', 'MG', '571', 6340.0, NULL),
('FDC', 'Thiamin', 'MG', '404', 6400.0, 'Maps to DRIVE VITB1_mg'),
('FDC', 'Thiamin, intrinsic', 'MG', '584', 6420.0, NULL),
('FDC', 'Thiamin, added', 'MG', '574', 6440.0, NULL),
('FDC', 'Riboflavin', 'MG', '405', 6500.0, 'Maps to DRIVE VITB2_mg'),
('FDC', 'Riboflavin, intrinsic', 'MG', '585', 6520.0, NULL),
('FDC', 'Riboflavin, added', 'MG', '575', 6540.0, NULL),
('FDC', 'Niacin', 'MG', '406', 6600.0, 'Maps to DRIVE NIA_mg'),
('FDC', 'Niacin, intrinsic', 'MG', '586', 6620.0, NULL),
('FDC', 'Niacin, added', 'MG', '576', 6640.0, NULL),
('FDC', 'Pantothenic acid', 'MG', '410', 6700.0, 'Maps to DRIVE Pantac_mg'),
('FDC', 'Vitamin B-6', 'MG', '415', 6800.0, 'Maps to DRIVE VITB6_mg'),
('FDC', 'Biotin', 'UG', '416', 6850.0, 'Maps to DRIVE BIO_mcg'),
('FDC', 'Folate, total', 'UG', '417', 6900.0, 'Maps to DRIVE FOL_mcg'),
('FDC', 'Folic acid', 'UG', '431', 7000.0, NULL),
('FDC', 'Folate, food', 'UG', '432', 7100.0, NULL),
('FDC', 'Folate, DFE', 'UG', '435', 7200.0, NULL),
('FDC', 'Choline, total', 'MG', '421', 7220.0, 'Maps to DRIVE CHOLN_mg'),
('FDC', 'Choline, free', 'MG', '450', 7230.0, NULL),
('FDC', 'Choline, from phosphocholine', 'MG', '451', 7240.0, NULL),
('FDC', 'Choline, from phosphotidyl choline', 'MG', '452', 7250.0, NULL),
('FDC', 'Choline, from glycerophosphocholine', 'MG', '453', 7260.0, NULL),
('FDC', 'Choline, from sphingomyelin', 'MG', '455', 7270.0, NULL),
('FDC', 'Betaine', 'MG', '454', 7290.0, NULL),
('FDC', 'Vitamin B-12', 'UG', '418', 7300.0, 'Maps to DRIVE VITB12_mcg'),
('FDC', 'Vitamin B-12, intrinsic', 'UG', '588', 7320.0, NULL),
('FDC', 'Vitamin B-12, added', 'UG', '578', 7340.0, NULL),
('FDC', 'Vitamin A, RAE', 'UG', '320', 7420.0, 'Maps to DRIVE VITA_mcg'),
('FDC', 'Retinol', 'UG', '319', 7430.0, NULL),
('FDC', 'Vitamin A', 'UG', '960', 7430, NULL),
('FDC', 'Carotene, beta', 'UG', '321', 7440.0, NULL),
('FDC', 'cis-beta-Carotene', 'UG', '321.1', 7442.0, NULL),
('FDC', 'trans-beta-Carotene', 'UG', '321.2', 7444.0, NULL),
('FDC', 'Carotene, alpha', 'UG', '322', 7450.0, NULL),
('FDC', 'Carotene, gamma', 'UG', '332', 7455.0, NULL),
('FDC', 'Cryptoxanthin, beta', 'UG', '334', 7460.0, NULL),
('FDC', 'Cryptoxanthin, alpha', 'UG', '335', 7461.0, NULL),
('FDC', 'Vitamin A, IU', 'IU', '318', 7500.0, 'Maps to DRIVE VITA_IU'),
('FDC', 'Vitamin A, RE', 'MCG_RE', '392', 7500.0, NULL),
('FDC', 'Other carotenoids', 'UG', '955', 7510.0, NULL),
('FDC', 'Lycopene', 'UG', '337', 7530.0, NULL),
('FDC', 'cis-Lycopene', 'UG', '337.1', 7532.0, NULL),
('FDC', 'trans-Lycopene', 'UG', '337.2', 7534.0, NULL),
('FDC', 'Lutein + zeaxanthin', 'UG', '338', 7560.0, NULL),
('FDC', 'cis-Lutein/Zeaxanthin', 'UG', '338.3', 7561.0, NULL),
('FDC', 'Lutein', 'UG', '338.1', 7562.0, NULL),
('FDC', 'Zeaxanthin', 'UG', '338.2', 7564.0, NULL),
('FDC', 'Phytoene', 'UG', '330', 7570.0, NULL),
('FDC', 'Phytofluene', 'UG', '331', 7580.0, NULL),
('FDC', 'Carotene', 'MCG_RE', '393', 7600.0, NULL),
('FDC', 'Vitamin E', 'MG_ATE', '394', 7800.0, NULL),
('FDC', 'Vitamin E', 'MG', '959', 7810, 'Maps to DRIVE VITE_mg'),
('FDC', 'Tocopherols and tocotrienols', 'MG', '323.99', 7900.0, NULL),
('FDC', 'Total Tocopherols', 'MG', NULL, 7901.0, NULL),
('FDC', 'Total Tocotrienols', 'MG', NULL, 7902.0, NULL),
('FDC', 'Vitamin E (alpha-tocopherol)', 'MG', '323', 7905.0, NULL),
('FDC', 'Vitamin E, added', 'MG', '573', 7920.0, NULL),
('FDC', 'Vitamin E, intrinsic', 'MG', '583', 7930.0, NULL),
('FDC', 'Tocopherol, beta', 'MG', '341', 8000.0, NULL),
('FDC', 'Tocopherol, gamma', 'MG', '342', 8100.0, NULL),
('FDC', 'Tocopherol, delta', 'MG', '343', 8200.0, NULL),
('FDC', 'Tocotrienol, alpha', 'MG', '344', 8300.0, NULL),
('FDC', 'Tocotrienol, beta', 'MG', '345', 8400.0, NULL),
('FDC', 'Tocotrienol, gamma', 'MG', '346', 8500.0, NULL),
('FDC', 'Tocotrienol, delta', 'MG', '347', 8600.0, NULL),
('FDC', 'Vitamin D (D2 + D3), International Units', 'IU', '324', 8650.0, 'Maps to DRIVE VITD_IU'),
('FDC', 'Vitamin D (D2 + D3)', 'UG', '328', 8700.0, 'Maps to DRIVE VITD_mcg'),
('FDC', 'Vitamin D2 (ergocalciferol)', 'UG', '325', 8710.0, NULL),
('FDC', 'Vitamin D3 (cholecalciferol)', 'UG', '326', 8720.0, NULL),
('FDC', '25-hydroxycholecalciferol', 'UG', '327', 8730.0, NULL),
('FDC', 'Vitamin D4', 'UG', NULL, 8730.0, NULL),
('FDC', '25-hydroxyergocalciferol', 'UG', '329', 8740.0, NULL),
('FDC', 'Vitamin K (phylloquinone)', 'UG', '430', 8800.0, 'Maps to DRIVE VITK_mcg'),
('FDC', 'Vitamin K (Dihydrophylloquinone)', 'UG', '429', 8900.0, NULL),
('FDC', 'Vitamin K (Menaquinone-4)', 'UG', '428', 8950.0, NULL),
('FDC', 'Specific Gravity', 'SP_GR', '227', 8955, NULL),
('FDC', 'Glutathione', 'MG', '961', 9000, NULL);

-- Lipids
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Lipids', 'G', '950', 9600.0, NULL),
('FDC', 'Fatty acids, total saturated', 'G', '606', 9700.0, 'Maps to DRIVE SFAT_g'),
('FDC', 'SFA 4:0', 'G', '607', 9800.0, NULL),
('FDC', 'SFA 5:0', 'G', '632', 9850.0, NULL),
('FDC', 'SFA 6:0', 'G', '608', 9900.0, NULL),
('FDC', 'SFA 7:0', 'G', '633', 9950.0, NULL),
('FDC', 'SFA 8:0', 'G', '609', 10000.0, NULL),
('FDC', 'SFA 9:0', 'G', '634', 10050.0, NULL),
('FDC', 'SFA 10:0', 'G', '610', 10100.0, NULL),
('FDC', 'SFA 11:0', 'G', '699', 10200.0, NULL),
('FDC', 'SFA 12:0', 'G', '611', 10300.0, NULL),
('FDC', 'SFA 13:0', 'G', '696', 10400.0, NULL),
('FDC', 'SFA 14:0', 'G', '612', 10500.0, NULL),
('FDC', 'SFA 15:0', 'G', '652', 10600.0, NULL),
('FDC', 'SFA 16:0', 'G', '613', 10700.0, NULL),
('FDC', 'SFA 17:0', 'G', '653', 10800.0, NULL),
('FDC', 'SFA 18:0', 'G', '614', 10900.0, NULL),
('FDC', 'SFA 19:0', 'G', '686', 11000.0, NULL),
('FDC', 'SFA 20:0', 'G', '615', 11100.0, NULL),
('FDC', 'SFA 21:0', 'G', '681', 11150.0, NULL),
('FDC', 'SFA 22:0', 'G', '624', 11200.0, NULL),
('FDC', 'SFA 23:0', 'G', '682', 11250.0, NULL),
('FDC', 'SFA 24:0', 'G', '654', 11300.0, NULL),
('FDC', 'Fatty acids, total monounsaturated', 'G', '645', 11400.0, 'Maps to DRIVE MUFAT_g'),
('FDC', 'MUFA 12:1', 'G', '635', 11450.0, NULL),
('FDC', 'MUFA 14:1', 'G', '625', 11500.0, NULL),
('FDC', 'MUFA 14:1 c', 'G', '822', 11501.0, NULL),
('FDC', 'MUFA 15:1', 'G', '697', 11600.0, NULL),
('FDC', 'MUFA 16:1', 'G', '626', 11700.0, NULL),
('FDC', 'MUFA 16:1 c', 'G', '673', 11800.0, NULL),
('FDC', 'MUFA 17:1', 'G', '687', 12000.0, NULL),
('FDC', 'MUFA 17:1 c', 'G', '825', 12001.0, NULL),
('FDC', 'MUFA 18:1', 'G', '617', 12100.0, NULL),
('FDC', 'MUFA 18:1 c', 'G', '674', 12200.0, NULL),
('FDC', 'MUFA 18:1-11 c (18:1c n-7)', 'G', '860', 12210.0, NULL),
('FDC', 'MUFA 18:1-11 t (18:1t n-7)', 'G', '859', 12310.0, NULL),
('FDC', 'MUFA 20:1', 'G', '628', 12400.0, NULL),
('FDC', 'MUFA 20:1 c', 'G', '829', 12401.0, NULL),
('FDC', 'MUFA 22:1', 'G', '630', 12500.0, NULL),
('FDC', 'MUFA 22:1 c', 'G', '676', 12600.0, NULL),
('FDC', 'MUFA 22:1 n-9', 'G', '676.1', 12601.0, NULL),
('FDC', 'MUFA 22:1 n-11', 'G', '676.2', 12602.0, NULL),
('FDC', 'MUFA 24:1 c', 'G', '671', 12800.0, NULL),
('FDC', 'Fatty acids, total polyunsaturated', 'G', '646', 12900.0, 'Maps to DRIVE PUFAT_g'),
('FDC', 'PUFA 16:2', 'G', '688', 13000.0, NULL),
('FDC', 'PUFA 18:2', 'G', '618', 13100.0, 'Maps to DRIVE LIN_AC_g'),
('FDC', 'PUFA 18:2 c', 'G', '831', 13150.0, NULL),
('FDC', 'PUFA 18:2 n-6 c,c', 'G', '675', 13200.0, NULL),
('FDC', 'PUFA 18:2 CLAs', 'G', '670', 13300.0, NULL),
('FDC', 'PUFA 18:2 i', 'G', '666', 13350.0, NULL),
('FDC', 'PUFA 18:2 c,t', 'G', '668', 13400.0, NULL),
('FDC', 'PUFA 18:2 t,c', 'G', '667', 13500.0, NULL),
('FDC', 'PUFA 18:3', 'G', '619', 13900.0, NULL),
('FDC', 'PUFA 18:3 c', 'G', '833', 13910.0, NULL),
('FDC', 'PUFA 18:3 n-3 c,c,c (ALA)', 'G', '851', 14000.0, NULL),
('FDC', 'PUFA 18:3 n-6 c,c,c', 'G', '685', 14100.0, NULL),
('FDC', 'PUFA 18:3i', 'G', '856', 14200.0, NULL),
('FDC', 'PUFA 18:4', 'G', '627', 14250.0, NULL),
('FDC', 'PUFA 20:2 c', 'G', '840', 14250.0, NULL),
('FDC', 'PUFA 20:2 n-6 c,c', 'G', '672', 14300.0, NULL),
('FDC', 'PUFA 20:3', 'G', '689', 14400.0, NULL),
('FDC', 'PUFA 20:3 c', 'G', '835', 14450.0, NULL),
('FDC', 'PUFA 20:3 n-3', 'G', '852', 14500.0, NULL),
('FDC', 'PUFA 20:3 n-6', 'G', '853', 14600.0, NULL),
('FDC', 'PUFA 20:3 n-9', 'G', '861', 14650.0, NULL),
('FDC', 'PUFA 22:3', 'G', '683', 14675.0, NULL),
('FDC', 'PUFA 20:4', 'G', '620', 14700.0, NULL),
('FDC', 'PUFA 20:4c', 'G', '836', 14750.0, NULL),
('FDC', 'PUFA 20:4 n-3', 'G', '854', 14800.0, NULL),
('FDC', 'PUFA 20:4 n-6', 'G', '855', 14900.0, NULL),
('FDC', 'PUFA 20:5c', 'G', '837', 14950.0, NULL),
('FDC', 'PUFA 20:5 n-3 (EPA)', 'G', '629', 15000.0, NULL),
('FDC', 'PUFA 22:2', 'G', '698', 15100.0, NULL),
('FDC', 'PUFA 21:5', 'G', '857', 15100.0, NULL),
('FDC', 'PUFA 22:5 c', 'G', '838', 15150.0, NULL),
('FDC', 'PUFA 22:4', 'G', '858', 15160.0, NULL),
('FDC', 'PUFA 22:5 n-3 (DPA)', 'G', '631', 15200.0, NULL),
('FDC', 'PUFA 22:6 c', 'G', '839', 15250.0, NULL),
('FDC', 'PUFA 22:6 n-3 (DHA)', 'G', '621', 15300.0, NULL),
('FDC', 'Fatty acids, total trans', 'G', '605', 15400.0, 'Maps to DRIVE FATRN_g'),
('FDC', 'Fatty acids, total trans-monoenoic', 'G', '693', 15500.0, NULL),
('FDC', 'TFA 14:1 t', 'G', '821', 15510.0, NULL),
('FDC', 'TFA 16:1 t', 'G', '662', 15520.0, NULL),
('FDC', 'TFA 18:1 t', 'G', '663', 15521.0, NULL),
('FDC', 'TFA 17:1 t', 'G', '826', 15525.0, NULL),
('FDC', 'TFA 20:1 t', 'G', '830', 15540.0, NULL),
('FDC', 'TFA 22:1 t', 'G', '664', 15550.0, NULL),
('FDC', 'Fatty acids, total trans-dienoic', 'G', '694', 15601.0, NULL),
('FDC', 'TFA 18:2 t not further defined', 'G', '665', 15610.0, NULL),
('FDC', 'TFA 18:2 t', 'G', '832', 15611.0, NULL),
('FDC', 'TFA 18:2 t,t', 'G', '669', 15615.0, NULL),
('FDC', 'Fatty acids, total trans-polyenoic', 'G', '695', 15619.0, NULL),
('FDC', 'TFA 18:3 t', 'G', '834', 15660.0, NULL),
('FDC', 'Cholesterol', 'MG', '601', 15700.0, 'Maps to DRIVE CHOL_mg'),
('FDC', 'Phytosterols', 'MG', '636', 15800.0, NULL),
('FDC', 'Stigmastadiene', 'MG', NULL, 15801.0, NULL),
('FDC', 'Stigmasterol', 'MG', '638', 15900.0, NULL),
('FDC', 'Campesterol', 'MG', '639', 16000.0, NULL),
('FDC', 'Brassicasterol', 'MG', '640', 16100.0, NULL),
('FDC', 'Beta-sitosterol', 'MG', '641', 16200.0, NULL),
('FDC', 'Ergosta-7-enol', 'MG', NULL, 16210.0, NULL),
('FDC', 'Ergosta-7,22-dienol', 'MG', NULL, 16211.0, NULL),
('FDC', 'Ergosta-5,7-dienol', 'MG', NULL, 16211.0, NULL),
('FDC', 'Ergosterol', 'MG', '637', 16220.0, NULL),
('FDC', 'Campestanol', 'MG', '642', 16221.0, NULL),
('FDC', 'Beta-sitostanol', 'MG', '647', 16222.0, NULL),
('FDC', 'Delta-7-avenasterol', 'MG', '648', 16223.0, NULL),
('FDC', 'Delta-5-avenasterol', 'MG', '649', 16224.0, NULL),
('FDC', 'Alpha-spinasterol', 'MG', '650', 16225.0, NULL),
('FDC', 'Delta-7-Stigmastenol', 'MG', NULL, 16226.0, NULL),
('FDC', 'Phytosterols, other', 'MG', '651', 16227.0, NULL);

-- Amino Acids
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Amino acids', 'G', '500', 16250.0, NULL),
('FDC', 'Ergothioneine', 'MG', NULL, 16255.0, NULL),
('FDC', 'Tryptophan', 'G', '501', 16300.0, NULL),
('FDC', 'Threonine', 'G', '502', 16400.0, NULL),
('FDC', 'Isoleucine', 'G', '503', 16500.0, NULL),
('FDC', 'Leucine', 'G', '504', 16600.0, NULL),
('FDC', 'Lysine', 'G', '505', 16700.0, NULL),
('FDC', 'Methionine', 'G', '506', 16800.0, NULL),
('FDC', 'Cystine', 'G', '507', 16900.0, NULL),
('FDC', 'Phenylalanine and tyrosine (aromatic  AA)', 'G', '523', 16950.0, NULL),
('FDC', 'Phenylalanine', 'G', '508', 17000.0, NULL),
('FDC', 'Tyrosine', 'G', '509', 17100.0, NULL),
('FDC', 'Valine', 'G', '510', 17200.0, NULL),
('FDC', 'Arginine', 'G', '511', 17300.0, NULL),
('FDC', 'Histidine', 'G', '512', 17400.0, NULL),
('FDC', 'Alanine', 'G', '513', 17500.0, NULL),
('FDC', 'Aspartic acid', 'G', '514', 17600.0, NULL),
('FDC', 'Glutamic acid', 'G', '515', 17700.0, NULL),
('FDC', 'Glycine', 'G', '516', 17800.0, NULL),
('FDC', 'Proline', 'G', '517', 17900.0, NULL),
('FDC', 'Serine', 'G', '518', 18000.0, NULL),
('FDC', 'Hydroxyproline', 'G', '521', 18100.0, NULL),
('FDC', 'Cysteine', 'G', '526', 18150.0, NULL);

-- Other Components
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Alcohol, ethyl', 'G', '221', 18200.0, NULL),
('FDC', 'Caffeine', 'MG', '262', 18300.0, NULL),
('FDC', 'Theobromine', 'MG', '263', 18400.0, NULL);

-- Phytochemicals - Isoflavones
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Isoflavones', 'MG', '713', 19000.0, NULL),
('FDC', 'Daidzein', 'MG', '710', 19100.0, NULL),
('FDC', 'Genistein', 'MG', '711', 19200.0, NULL),
('FDC', 'Glycitein', 'MG', '712', 19300.0, NULL),
('FDC', 'Daidzin', 'MG', '717', 19310.0, NULL),
('FDC', 'Genistin', 'MG', '718', 19320.0, NULL),
('FDC', 'Glycitin', 'MG', '719', 19330.0, NULL);

-- Phytochemicals - Anthocyanidins & Flavonoids
INSERT INTO nutrient (Standard, NutrientName, Unit, NutrientNumber, Rank, Note) VALUES
('FDC', 'Anthocyanidins', 'MG', '730', 19400.0, NULL),
('FDC', 'Cyanidin', 'MG', '731', 19500.0, NULL),
('FDC', 'Proanthocyanidin (dimer-A linkage)', 'MG', '732', 19510.0, NULL),
('FDC', 'Proanthocyanidin monomers', 'MG', '733', 19520.0, NULL),
('FDC', 'Proanthocyanidin dimers', 'MG', '734', 19530.0, NULL),
('FDC', 'Proanthocyanidin trimers', 'MG', '735', 19540.0, NULL),
('FDC', 'Proanthocyanidin 4-6mers', 'MG', '736', 19550.0, NULL),
('FDC', 'Proanthocyanidin 7-10mers', 'MG', '737', 19560.0, NULL),
('FDC', 'Proanthocyanidin polymers (>10mers)', 'MG', '738', 19570.0, NULL),
('FDC', 'Delphinidin', 'MG', '741', 19600.0, NULL),
('FDC', 'Malvidin', 'MG', '742', 19700.0, NULL),
('FDC', 'Pelargonidin', 'MG', '743', 19800.0, NULL),
('FDC', 'Peonidin', 'MG', '745', 19900.0, NULL),
('FDC', 'Petunidin', 'MG', '746', 20000.0, NULL),
('FDC', 'Flavans, total', 'MG', '747', 20100.0, NULL),
('FDC', 'Catechins, total', 'MG', '748', 20200.0, NULL),
('FDC', 'Catechin', 'MG', '749', 20300.0, NULL),
('FDC', 'Epigallocatechin', 'MG', '750', 20400.0, NULL),
('FDC', 'Epicatechin', 'MG', '751', 20500.0, NULL),
('FDC', 'Epicatechin-3-gallate', 'MG', '752', 20600.0, NULL),
('FDC', 'Epigallocatechin-3-gallate', 'MG', '753', 20700.0, NULL),
('FDC', 'Procyanidins, total', 'MG', '754', 20800.0, NULL),
('FDC', 'Theaflavins', 'MG', '755', 20900.0, NULL),
('FDC', 'Thearubigins', 'MG', '756', 21000.0, NULL),
('FDC', 'Theogallin', 'MG', '790', 21100.0, NULL),
('FDC', 'Flavanones, total', 'MG', '757', 21200.0, NULL),
('FDC', 'Eriodictyol', 'MG', '758', 21300.0, NULL),
('FDC', 'Hesperetin', 'MG', '759', 21400.0, NULL),
('FDC', 'Isosakuranetin', 'MG', '760', 21500.0, NULL),
('FDC', 'Liquiritigenin', 'MG', '761', 21600.0, NULL),
('FDC', 'Naringenin', 'MG', '762', 21700.0, NULL),
('FDC', 'Flavones, total', 'MG', '768', 21800.0, NULL),
('FDC', 'Apigenin', 'MG', '770', 21900.0, NULL),
('FDC', 'Chrysoeriol', 'MG', '771', 22000.0, NULL),
('FDC', 'Diosmetin', 'MG', '772', 22100.0, NULL),
('FDC', 'Luteolin', 'MG', '773', 22200.0, NULL),
('FDC', 'Nobiletin', 'MG', '781', 22300.0, NULL),
('FDC', 'Sinensetin', 'MG', '782', 22400.0, NULL),
('FDC', 'Tangeretin', 'MG', '783', 22500.0, NULL),
('FDC', 'Flavonols, total', 'MG', '784', 22600.0, NULL),
('FDC', 'Isorhamnetin', 'MG', '785', 22700.0, NULL),
('FDC', 'Kaempferol', 'MG', '786', 22800.0, NULL),
('FDC', 'Limocitrin', 'MG', '787', 22900.0, NULL),
('FDC', 'Myricetin', 'MG', '788', 23000.0, NULL),
('FDC', 'Quercetin', 'MG', '789', 23100.0, NULL);