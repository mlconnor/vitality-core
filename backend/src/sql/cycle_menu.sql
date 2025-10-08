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

-- these align with GS1. we may want to make this a table with a code instead of a gian table
-- these are all yet no values
CREATE TABLE Claims (
    DietTypeCodeVegan BOOLEAN, -- GS1: allergenFreeFromAnimalProducts or dietTypeCode=VEGETARIAN, DRIVE_COL: Vegan
    DietTypeCodeVegetarian BOOLEAN, -- GS1: dietTypeCode=VEGETARIAN, DRIVE_COL: Vegetarian
    dietTypeCodePlantBased BOOLEAN, -- GS1: dietTypeCode=PLANT_BASED, DRIVE_COL: Plant_Based
    CertificationTypeVegan BOOLEAN, -- GS1: certificationType=VEGAN
    CertificationTypeVegetarian BOOLEAN, -- GS1: certificationType=VEGETARIAN
    AllergenContainsMilk BOOLEAN, -- GS1: allergenContainsMilk, DRIVE_COL: Milk
    AllergenMayContainMilk BOOLEAN, -- GS1: allergenMayContainMilk
    AllergenContainsEgg BOOLEAN, -- GS1: allergenContainsEgg, DRIVE_COL: Eggs
    AllergenMayContainEgg BOOLEAN, -- GS1: allergenMayContainEgg
    AllergenContainsFish BOOLEAN, -- GS1: allergenContainsFish, DRIVE_COL: Fish
    AllergenMayContainFish BOOLEAN, -- GS1: allergenMayContainFish
    AllergenContainsCrustacean BOOLEAN, -- GS1: allergenContainsCrustacean, DRIVE_COL: Shellfish
    AllergenMayContainCrustacean BOOLEAN, -- GS1: allergenMayContainCrustacean
    AllergenContainsWheat BOOLEAN, -- GS1: allergenContainsWheat, DRIVE_COL: Wheat
    AllergenMayContainWheat BOOLEAN, -- GS1: allergenMayContainWheat
    AllergenContainsPeanut BOOLEAN, -- GS1: allergenContainsPeanut, DRIVE_COL: Peanuts
    AllergenMayContainPeanut BOOLEAN, -- GS1: allergenMayContainPeanut
    AllergenContainsTreeNuts BOOLEAN, -- GS1: allergenContainsTreeNuts, DRIVE_COL: Tree_Nuts
    AllergenMayContainTreeNuts BOOLEAN, -- GS1: allergenMayContainTreeNuts
    AllergenContainsSoybean BOOLEAN, -- GS1: allergenContainsSoybean, DRIVE_COL: Soy
    AllergenMayContainSoybean BOOLEAN, -- GS1: allergenMayContainSoybean
    AllergenContainsSesame BOOLEAN, -- GS1: allergenContainsSesame, DRIVE_COL: Sesame
    AllergenMayContainSesame BOOLEAN, -- GS1: allergenMayContainSesame
    AllergenContainsSulphites BOOLEAN, -- GS1: allergenContainsSulphites, DRIVE_COL: Sulphites
    AllergenMayContainSulphites BOOLEAN, -- GS1: allergenMayContainSulphites
    AllergenSulphiteConcentrationValue REAL, -- GS1: allergenSulphiteConcentrationValue
    AllergenContainsMustard BOOLEAN, -- GS1: allergenContainsMustard, DRIVE_COL: Mustard
    AllergenMayContainMustard BOOLEAN, -- GS1: allergenMayContainMustard
    AllergenContainsCelery BOOLEAN, -- GS1: allergenContainsCelery
    AllergenMayContainCelery BOOLEAN, -- GS1: allergenMayContainCelery
    AllergenContainsMollusc BOOLEAN, -- GS1: allergenContainsMollusc
    AllergenMayContainMollusc BOOLEAN, -- GS1: allergenMayContainMollusc
    AllergenContainsLupin BOOLEAN, -- GS1: allergenContainsLupin
    AllergenMayContainLupin BOOLEAN, -- GS1: allergenMayContainLupin
    AdditiveContainsMsg BOOLEAN, -- Custom: additiveContainsMSG, DRIVE_COL: MSG
    AdditiveMayContainMsg BOOLEAN, -- Custom: additiveMayContainMSG
    AllergenFreeFromGluten BOOLEAN, -- GS1: allergenFreeFromGluten, DRIVE_COL: Gluten (inverted logic)
    CertificationTypeGlutenFree BOOLEAN, -- GS1: certificationType=GLUTEN_FREE
    HasOrganicClaim BOOLEAN, -- GS1: hasOrganicClaim or certificationType=ORGANIC
    CertificationTypeOrganic BOOLEAN, -- GS1: certificationType=ORGANIC
    HasNonGmoClaim BOOLEAN, -- GS1: hasNonGMOClaim
    NutrientClaimLowSodium BOOLEAN, -- GS1: nutrientClaim=LOW_SODIUM
    NutrientClaimLowFat BOOLEAN, -- GS1: nutrientClaim=LOW_FAT
    NutrientClaimSugarFree BOOLEAN, -- GS1: nutrientClaim=SUGAR_FREE
    NutrientClaimLowCalorie BOOLEAN, -- GS1: nutrientClaim=LOW_CALORIE
    AdditiveFreeFromArtificialFlavors BOOLEAN, -- GS1: additiveFreeFromArtificialFlavors
    AdditiveFreeFromArtificialColors BOOLEAN, -- GS1: additiveFreeFromArtificialColors
    AdditiveFreeFromPreservatives BOOLEAN, -- GS1: additiveFreeFromPreservatives
    AllergenFreeFromLactose BOOLEAN, -- GS1: allergenFreeFromLactose
    NutrientClaimLowGlycemicIndex BOOLEAN, -- GS1: nutrientClaim=LOW_GLYCEMIC_INDEX
    IngredientFreeFromPalmOil BOOLEAN, -- GS1: ingredientFreeFromPalmOil
    CertificationTypeFairTrade BOOLEAN, -- GS1: certificationType=FAIR_TRADE
    CertificationTypeSustainable BOOLEAN, -- GS1: certificationType=SUSTAINABLE
    CertificationTypeHalal BOOLEAN, -- GS1: certificationType=HALAL, DRIVE_COL: Halal
    CertificationTypeKosher BOOLEAN, -- GS1: certificationType=KOSHER, DRIVE_COL: Kosher
    CertificationTypeKosherDairy BOOLEAN, -- GS1: certificationType=KOSHER_DAIRY, DRIVE_COL: Kosher_Dairy
    CertificationTypeKosherFish BOOLEAN, -- GS1: certificationType=KOSHER_FISH, DRIVE_COL: Kosher_Fish
    CertificationTypeKosherMeat BOOLEAN, -- GS1: certificationType=KOSHER_MEAT, DRIVE_COL: Kosher_Meat
    CertificationTypeKosherPareve BOOLEAN, -- GS1: certificationType=KOSHER_PAREVE, DRIVE_COL: Kosher_Pareve
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