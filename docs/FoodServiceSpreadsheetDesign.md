# Institutional Food Service Management Spreadsheet Design

## Overview

This document outlines the design for a comprehensive Google Sheets-based food service management system for commercial institutions such as colleges, schools, senior communities, hospitals, and workplace cafeterias. The system uses a single spreadsheet per customer/institution with multiple sheets representing key data domains.

The design is based on principles from *Foodservice Management: Principles and Practices* by Payne-Palacio & Theis, covering the complete operational cycle from menu planning through production, service, and inventory management.

---

## Sheet Architecture

The spreadsheet is organized into functional domains:

| Domain | Sheets |
|--------|--------|
| **Organization** | Sites, Stations, Employees |
| **Menu Planning** | Cycle_Menus, Menu_Items, Meal_Periods, Diet_Types |
| **Recipes** | Recipes, Ingredients, Recipe_Ingredients |
| **Diners** | Diners, Diet_Assignments, Meal_Orders |
| **Procurement** | Vendors, Product_Specifications, Purchase_Orders, PO_Line_Items |
| **Inventory** | Receiving, Inventory, Storeroom_Issues |
| **Production** | Production_Schedules, Forecasts, Leftover_Reports |
| **Reference** | Units_of_Measure, Food_Categories, Allergens |

---

## Sheet Specifications

### 1. SITES

**Purpose:** Defines the physical locations where food is prepared and/or served (e.g., Main Dining Hall, Satellite Kitchen, Patient Wing A).

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| site_id | Text | Yes | Unique identifier (e.g., SITE-001) | — |
| site_name | Text | Yes | Name of the site (e.g., "North Campus Dining Hall") | — |
| site_type | Dropdown | Yes | Type of site: Kitchen, Dining Hall, Satellite, Commissary, Cafeteria | — |
| address | Text | No | Physical address | — |
| capacity_seats | Number | No | Seating capacity for dining areas | — |
| has_production_kitchen | Checkbox | Yes | Whether this site has food production capabilities | — |
| storage_dry_sqft | Number | No | Square footage of dry storage | — |
| storage_refrigerated_sqft | Number | No | Square footage of refrigerated storage | — |
| storage_freezer_sqft | Number | No | Square footage of freezer storage | — |
| manager_name | Text | No | Name of site manager | — |
| phone | Text | No | Contact phone number | — |
| operating_hours | Text | No | Normal operating hours | — |
| status | Dropdown | Yes | Active, Inactive, Seasonal | — |
| notes | Text | No | Additional information | — |

---

### 2. STATIONS

**Purpose:** Defines service points within a site (e.g., Grill Station, Salad Bar, Tray Assembly Line). Stations are where food is assembled or served to customers.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| station_id | Text | Yes | Unique identifier (e.g., STN-001) | — |
| site_id | Dropdown | Yes | Which site this station belongs to | Sites.site_id |
| station_name | Text | Yes | Name of station (e.g., "Grill", "Salad Bar", "Trayline 1") | — |
| station_type | Dropdown | Yes | Grill, Steam Table, Cold Bar, Salad Bar, Trayline, Beverage, Dessert, À la Carte, Grab-and-Go | — |
| capacity_covers_per_hour | Number | No | Maximum customers/meals that can be served per hour | — |
| equipment_list | Text | No | Key equipment at this station | — |
| requires_temp_log | Checkbox | Yes | Whether temperature logging is required | — |
| service_style | Dropdown | Yes | Self-Service, Attended, Tray Service, Counter Service | — |
| status | Dropdown | Yes | Active, Inactive, Under Maintenance | — |
| notes | Text | No | Additional information | — |

---

### 3. EMPLOYEES

**Purpose:** Tracks food service staff for scheduling and assignment purposes.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| employee_id | Text | Yes | Unique identifier (e.g., EMP-001) | — |
| first_name | Text | Yes | Employee first name | — |
| last_name | Text | Yes | Employee last name | — |
| primary_site_id | Dropdown | Yes | Primary work location | Sites.site_id |
| job_title | Dropdown | Yes | Cook, Prep Cook, Server, Dishwasher, Supervisor, Manager, Dietitian, Receiving Clerk | — |
| hire_date | Date | Yes | Date of hire | — |
| hourly_rate | Currency | No | Hourly wage rate | — |
| certifications | Text | No | Food safety certifications (ServSafe, etc.) | — |
| certification_expiry | Date | No | When certifications expire | — |
| phone | Text | No | Contact phone | — |
| email | Text | No | Email address | — |
| status | Dropdown | Yes | Active, On Leave, Terminated | — |
| notes | Text | No | Additional information | — |

---

### 4. MEAL_PERIODS

**Purpose:** Defines the meal periods for the institution (Breakfast, Lunch, Dinner, Snacks). Different institutions may have different meal period structures.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| meal_period_id | Text | Yes | Unique identifier (e.g., MP-001) | — |
| meal_period_name | Text | Yes | Name (e.g., "Breakfast", "Lunch", "Dinner", "AM Snack", "PM Snack", "Bedtime Snack") | — |
| typical_start_time | Time | Yes | Standard start time for this meal | — |
| typical_end_time | Time | Yes | Standard end time for this meal | — |
| target_calories_min | Number | No | Minimum calorie target for this meal | — |
| target_calories_max | Number | No | Maximum calorie target for this meal | — |
| is_required | Checkbox | Yes | Whether this meal is required (vs. optional snack) | — |
| sort_order | Number | Yes | Display order (1=Breakfast, 2=Lunch, etc.) | — |
| notes | Text | No | Additional information | — |

---

### 5. DIET_TYPES

**Purpose:** Defines the diet types offered, including regular and therapeutic/modified diets. Based on the diet manual used by the institution.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| diet_type_id | Text | Yes | Unique identifier (e.g., DIET-001) | — |
| diet_type_name | Text | Yes | Name (e.g., "Regular", "Low Sodium", "Diabetic", "Renal", "Pureed", "Vegetarian") | — |
| diet_category | Dropdown | Yes | Regular, Therapeutic, Texture-Modified, Allergy, Religious, Lifestyle | — |
| description | Text | Yes | Detailed description of diet requirements | — |
| restrictions | Text | No | Foods/ingredients to avoid | — |
| required_modifications | Text | No | Required modifications to standard menu | — |
| calorie_target | Number | No | Target daily calories (if applicable) | — |
| sodium_limit_mg | Number | No | Sodium limit in mg (if applicable) | — |
| carb_limit_g | Number | No | Carbohydrate limit in grams (if applicable) | — |
| requires_dietitian_approval | Checkbox | Yes | Whether a dietitian must approve menu extensions | — |
| status | Dropdown | Yes | Active, Inactive | — |
| notes | Text | No | Additional information | — |

---

### 6. CYCLE_MENUS

**Purpose:** Defines the cycle menu structure—a planned set of menus that rotate at defined intervals. Most institutions use 3-8 week cycles that may vary by season.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| cycle_menu_id | Text | Yes | Unique identifier (e.g., CYC-001) | — |
| cycle_name | Text | Yes | Name (e.g., "Fall 2024 - 4 Week Cycle") | — |
| season | Dropdown | Yes | Spring, Summer, Fall, Winter, Year-Round | — |
| cycle_length_weeks | Number | Yes | Number of weeks in the cycle (typically 3-8) | — |
| start_date | Date | Yes | When this cycle becomes active | — |
| end_date | Date | No | When this cycle ends (null if ongoing) | — |
| site_id | Dropdown | No | If cycle is site-specific; blank = all sites | Sites.site_id |
| target_food_cost_per_meal | Currency | No | Budget target per meal | — |
| status | Dropdown | Yes | Draft, Active, Archived | — |
| approved_by | Text | No | Name of person who approved the cycle | — |
| approval_date | Date | No | Date of approval | — |
| notes | Text | No | Additional information | — |

---

### 7. MENU_ITEMS

**Purpose:** The detailed menu items for each day/meal of the cycle menu. This is the core planning document that drives production, purchasing, and service.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| menu_item_id | Text | Yes | Unique identifier (e.g., MI-001) | — |
| cycle_menu_id | Dropdown | Yes | Which cycle menu this belongs to | Cycle_Menus.cycle_menu_id |
| week_number | Number | Yes | Week number within the cycle (1, 2, 3, etc.) | — |
| day_of_week | Dropdown | Yes | Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday | — |
| meal_period_id | Dropdown | Yes | Which meal period | Meal_Periods.meal_period_id |
| menu_category | Dropdown | Yes | Entrée, Starch, Vegetable, Salad, Soup, Bread, Dessert, Beverage, Condiment | — |
| recipe_id | Dropdown | Yes | Link to the recipe | Recipes.recipe_id |
| diet_type_id | Dropdown | Yes | Which diet type (Regular is default) | Diet_Types.diet_type_id |
| station_id | Dropdown | No | Which station serves this item | Stations.station_id |
| portion_size | Text | Yes | Portion size (e.g., "4 oz", "1/2 cup", "1 each") | — |
| is_choice | Checkbox | Yes | If true, this is one of multiple choices | — |
| choice_group | Text | No | Groups choices together (e.g., "Entrée Choice A/B") | — |
| display_name | Text | No | Override name for menu printing | — |
| estimated_participation | Percent | No | Expected % of diners selecting this item | — |
| notes | Text | No | Additional information | — |

---

### 8. RECIPES

**Purpose:** Master list of standardized recipes. A standardized recipe ensures consistency in quality, portion size, and nutrient composition every time a menu item is prepared.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| recipe_id | Text | Yes | Unique identifier (e.g., RCP-001) | — |
| recipe_name | Text | Yes | Name of the recipe | — |
| recipe_code | Text | No | Internal code for computer systems | — |
| category | Dropdown | Yes | Entrée, Starch, Vegetable, Salad, Soup, Bread, Dessert, Sauce, Beverage | — |
| cuisine_type | Dropdown | No | American, Mexican, Asian, Italian, Mediterranean, etc. | — |
| yield_quantity | Number | Yes | Total yield (number of portions OR volume/weight) | — |
| yield_unit | Dropdown | Yes | Portions, Gallons, Pounds, Pans | Units_of_Measure.unit_id |
| portion_size | Text | Yes | Standard portion size (e.g., "6 oz", "1 cup") | — |
| portion_utensil | Text | No | Serving utensil (e.g., "#8 scoop", "4 oz ladle") | — |
| prep_time_minutes | Number | No | Preparation time in minutes | — |
| cook_time_minutes | Number | No | Cooking time in minutes | — |
| cooking_temp_f | Number | No | Cooking temperature in Fahrenheit | — |
| cooking_method | Dropdown | No | Bake, Roast, Grill, Steam, Sauté, Braise, Fry, No-Cook | — |
| equipment_required | Text | No | Major equipment needed (e.g., "Convection Oven, Steam Jacketed Kettle") | — |
| pan_size | Text | No | Pan size used (e.g., "12x20x2 full pan") | — |
| pans_per_batch | Number | No | Number of pans per batch | — |
| weight_per_pan | Text | No | Target weight per pan for consistency | — |
| food_cost_per_portion | Currency | No | Calculated cost per portion | — |
| calories_per_portion | Number | No | Calories per portion | — |
| protein_g | Number | No | Protein in grams per portion | — |
| carbs_g | Number | No | Carbohydrates in grams per portion | — |
| fat_g | Number | No | Fat in grams per portion | — |
| sodium_mg | Number | No | Sodium in mg per portion | — |
| fiber_g | Number | No | Fiber in grams per portion | — |
| allergens | Text | No | Contains allergens (comma-separated) | — |
| suitable_for_diets | Text | No | Diet types this recipe is suitable for | — |
| haccp_critical_limits | Text | No | Critical control points and limits | — |
| hold_temp_f | Number | No | Required holding temperature | — |
| max_hold_time_hours | Number | No | Maximum safe holding time | — |
| variations | Text | No | Recipe variations (e.g., "Low-Sodium version: omit salt") | — |
| source | Text | No | Recipe source (e.g., "Food for Fifty, p. 220") | — |
| date_standardized | Date | No | When recipe was last tested/standardized | — |
| status | Dropdown | Yes | Active, Draft, Archived, Seasonal | — |
| notes | Text | No | Preparation notes, tips | — |

---

### 9. INGREDIENTS

**Purpose:** Master list of ingredients/products used in recipes. Each ingredient should correspond to a specification for purchasing.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| ingredient_id | Text | Yes | Unique identifier (e.g., ING-001) | — |
| ingredient_name | Text | Yes | Name of ingredient | — |
| food_category_id | Dropdown | Yes | Category for grouping | Food_Categories.category_id |
| common_unit | Dropdown | Yes | Default unit of measure | Units_of_Measure.unit_id |
| purchase_unit | Text | Yes | How it's purchased (e.g., "50 lb bag", "case of 6/#10 cans") | — |
| purchase_unit_cost | Currency | No | Current cost per purchase unit | — |
| units_per_purchase_unit | Number | No | Conversion factor (e.g., 50 lbs in a 50 lb bag) | — |
| cost_per_unit | Currency | No | Calculated cost per common unit | — |
| yield_percent | Percent | No | EP yield from AP (e.g., 81% for potatoes) | — |
| storage_type | Dropdown | Yes | Dry, Refrigerated, Frozen | — |
| shelf_life_days | Number | No | Expected shelf life in days | — |
| par_level | Number | No | Minimum quantity to keep on hand | — |
| reorder_point | Number | No | Quantity at which to reorder | — |
| preferred_vendor_id | Dropdown | No | Primary vendor | Vendors.vendor_id |
| product_spec_id | Dropdown | No | Link to detailed specification | Product_Specifications.spec_id |
| allergen_flags | Text | No | Allergens contained (comma-separated) | — |
| is_local | Checkbox | No | Whether sourced locally | — |
| is_organic | Checkbox | No | Whether organic | — |
| usda_commodity | Checkbox | No | Whether a USDA commodity item (schools) | — |
| status | Dropdown | Yes | Active, Discontinued, Seasonal | — |
| notes | Text | No | Additional information | — |

---

### 10. RECIPE_INGREDIENTS

**Purpose:** Links ingredients to recipes with quantities. This is the core table for recipe costing, purchasing, and ingredient assembly.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| recipe_ingredient_id | Text | Yes | Unique identifier | — |
| recipe_id | Dropdown | Yes | Which recipe | Recipes.recipe_id |
| ingredient_id | Dropdown | Yes | Which ingredient | Ingredients.ingredient_id |
| quantity | Number | Yes | Amount needed | — |
| unit_id | Dropdown | Yes | Unit of measure for this quantity | Units_of_Measure.unit_id |
| is_ap_or_ep | Dropdown | Yes | AP (As Purchased) or EP (Edible Portion) | — |
| prep_instruction | Text | No | How to prepare (e.g., "diced", "julienne", "thawed") | — |
| sequence_order | Number | No | Order in recipe (for block arrangement) | — |
| is_optional | Checkbox | No | Whether ingredient is optional | — |
| ingredient_group | Text | No | For grouping in block format (e.g., "Sauce", "Filling") | — |
| calculated_cost | Currency | No | Calculated cost for this ingredient line | — |
| notes | Text | No | Additional information | — |

---

### 11. DINERS

**Purpose:** Tracks the individuals being fed—patients in hospitals, students in schools, residents in senior communities. Essential for selective menus, diet tracking, and meal ordering.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| diner_id | Text | Yes | Unique identifier (e.g., DNR-001) | — |
| first_name | Text | Yes | First name | — |
| last_name | Text | Yes | Last name | — |
| site_id | Dropdown | Yes | Primary dining location | Sites.site_id |
| room_number | Text | No | Room/bed number (hospitals, senior living) | — |
| diner_type | Dropdown | Yes | Patient, Student, Resident, Staff, Visitor | — |
| admission_date | Date | No | Date of admission/enrollment | — |
| expected_discharge_date | Date | No | Expected discharge (hospitals) | — |
| primary_diet_type_id | Dropdown | Yes | Primary diet assignment | Diet_Types.diet_type_id |
| texture_modification | Dropdown | No | Regular, Mechanical Soft, Pureed, Ground | — |
| liquid_consistency | Dropdown | No | Regular, Thickened-Nectar, Thickened-Honey, NPO | — |
| allergies | Text | No | Food allergies (comma-separated) | — |
| dislikes | Text | No | Foods the diner dislikes | — |
| preferences | Text | No | Food preferences | — |
| special_instructions | Text | No | Special feeding instructions | — |
| feeding_assistance | Dropdown | No | Independent, Setup, Feeding Assist, Tube Fed | — |
| meal_ticket_number | Text | No | Meal ticket/card number (schools) | — |
| free_reduced_status | Dropdown | No | Paid, Free, Reduced (schools USDA program) | — |
| physician | Text | No | Attending physician (hospitals) | — |
| status | Dropdown | Yes | Active, Discharged, On Leave | — |
| notes | Text | No | Additional information | — |

---

### 12. DIET_ASSIGNMENTS

**Purpose:** Tracks diet order changes over time. Physicians/dietitians may modify diet orders, and this provides an audit trail.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| assignment_id | Text | Yes | Unique identifier | — |
| diner_id | Dropdown | Yes | Which diner | Diners.diner_id |
| diet_type_id | Dropdown | Yes | Assigned diet type | Diet_Types.diet_type_id |
| effective_date | Date | Yes | When this diet assignment starts | — |
| end_date | Date | No | When this diet assignment ends (null if current) | — |
| ordered_by | Text | Yes | Physician/dietitian who ordered | — |
| reason | Text | No | Reason for diet change | — |
| texture_modification | Dropdown | No | Texture modification if any | — |
| liquid_consistency | Dropdown | No | Liquid consistency if any | — |
| additional_restrictions | Text | No | Any additional restrictions | — |
| created_date | Date | Yes | When this record was created | — |
| created_by | Text | Yes | Who created this record | — |
| notes | Text | No | Additional information | — |

---

### 13. MEAL_ORDERS

**Purpose:** Individual meal orders/selections. For selective menus, diners choose from options. For nonselective menus, orders are generated from the census.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| order_id | Text | Yes | Unique identifier | — |
| diner_id | Dropdown | Yes | Which diner | Diners.diner_id |
| order_date | Date | Yes | Date of the meal | — |
| meal_period_id | Dropdown | Yes | Which meal | Meal_Periods.meal_period_id |
| menu_item_id | Dropdown | No | Selected menu item (if selective) | Menu_Items.menu_item_id |
| recipe_id | Dropdown | No | Direct recipe link if no menu item | Recipes.recipe_id |
| quantity | Number | Yes | Number of portions ordered (usually 1) | — |
| portion_size_override | Text | No | If different from standard portion | — |
| diet_type_id | Dropdown | Yes | Diet type at time of order | Diet_Types.diet_type_id |
| modifications | Text | No | Special modifications requested | — |
| delivery_location | Text | No | Room/table for delivery | — |
| delivery_time | Time | No | Requested delivery time | — |
| status | Dropdown | Yes | Ordered, In Production, Delivered, Cancelled | — |
| tray_ticket_number | Text | No | Tray ticket reference | — |
| order_taken_by | Text | No | Who took the order | — |
| order_timestamp | DateTime | Yes | When order was placed | — |
| notes | Text | No | Additional information | — |

---

### 14. VENDORS

**Purpose:** Supplier/vendor master list for purchasing.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| vendor_id | Text | Yes | Unique identifier (e.g., VND-001) | — |
| vendor_name | Text | Yes | Company name | — |
| vendor_type | Dropdown | Yes | Broadline Distributor, Produce, Dairy, Meat, Bakery, Specialty | — |
| contact_name | Text | No | Primary contact person | — |
| phone | Text | Yes | Contact phone | — |
| email | Text | No | Contact email | — |
| address | Text | No | Street address | — |
| city | Text | No | City | — |
| state | Text | No | State | — |
| zip | Text | No | ZIP code | — |
| delivery_days | Text | No | Days they deliver (e.g., "Mon, Wed, Fri") | — |
| delivery_lead_time_days | Number | No | Required lead time for orders | — |
| minimum_order | Currency | No | Minimum order amount | — |
| payment_terms | Text | No | Payment terms (e.g., "Net 30") | — |
| account_number | Text | No | Your account number with vendor | — |
| contract_start_date | Date | No | Contract start date | — |
| contract_end_date | Date | No | Contract end date | — |
| performance_rating | Number | No | Internal rating (1-5) | — |
| insurance_on_file | Checkbox | No | Whether insurance certificate is on file | — |
| status | Dropdown | Yes | Active, Inactive, Suspended, Prospective | — |
| notes | Text | No | Additional information | — |

---

### 15. PRODUCT_SPECIFICATIONS

**Purpose:** Detailed specifications for products to be purchased. Specifications ensure that the quality and form of food received matches expectations.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| spec_id | Text | Yes | Unique identifier (e.g., SPEC-001) | — |
| ingredient_id | Dropdown | Yes | Which ingredient this spec is for | Ingredients.ingredient_id |
| spec_name | Text | Yes | Specification name | — |
| product_description | Text | Yes | Detailed description | — |
| brand_acceptable | Text | No | Acceptable brands ("Any" or specific list) | — |
| usda_grade | Text | No | Required USDA grade (e.g., "USDA Choice", "Grade A") | — |
| market_form | Dropdown | Yes | Fresh, Frozen, Canned, Dried, Prepared | — |
| size_count | Text | No | Size or count specification (e.g., "70 count", "5-6 oz portion") | — |
| pack_size | Text | Yes | Package size (e.g., "6/#10 cans", "40 lb case") | — |
| unit_weight | Text | No | Weight per unit | — |
| origin | Text | No | Required origin (e.g., "Product of USA") | — |
| processing_requirements | Text | No | Required processing (e.g., "IQF", "Skinless, boneless") | — |
| quality_indicators | Text | No | Quality standards to check at receiving | — |
| temperature_requirements | Text | No | Temperature requirements at delivery | — |
| estimated_price | Currency | No | Current estimated price | — |
| effective_date | Date | Yes | When this spec became effective | — |
| created_by | Text | No | Who created the spec | — |
| status | Dropdown | Yes | Active, Inactive, Under Review | — |
| notes | Text | No | Additional information | — |

---

### 16. PURCHASE_ORDERS

**Purpose:** Header information for purchase orders sent to vendors.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| po_number | Text | Yes | Unique PO number (e.g., PO-2024-0001) | — |
| vendor_id | Dropdown | Yes | Which vendor | Vendors.vendor_id |
| site_id | Dropdown | Yes | Delivery location | Sites.site_id |
| order_date | Date | Yes | Date order was placed | — |
| requested_delivery_date | Date | Yes | When delivery is needed | — |
| actual_delivery_date | Date | No | When actually delivered | — |
| ordered_by | Text | Yes | Who placed the order | — |
| subtotal | Currency | No | Subtotal before tax/fees | — |
| tax | Currency | No | Tax amount | — |
| shipping | Currency | No | Shipping/delivery fees | — |
| total | Currency | No | Total order amount | — |
| payment_terms | Text | No | Payment terms for this order | — |
| status | Dropdown | Yes | Draft, Submitted, Confirmed, Partial, Received, Cancelled | — |
| delivery_instructions | Text | No | Special delivery instructions | — |
| notes | Text | No | Additional information | — |

---

### 17. PO_LINE_ITEMS

**Purpose:** Individual line items on purchase orders.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| line_item_id | Text | Yes | Unique identifier | — |
| po_number | Dropdown | Yes | Which purchase order | Purchase_Orders.po_number |
| ingredient_id | Dropdown | Yes | Which ingredient | Ingredients.ingredient_id |
| spec_id | Dropdown | No | Product specification | Product_Specifications.spec_id |
| quantity_ordered | Number | Yes | Quantity ordered | — |
| unit_of_measure | Dropdown | Yes | Unit for this order | Units_of_Measure.unit_id |
| unit_price | Currency | Yes | Price per unit | — |
| extended_price | Currency | Yes | Calculated total (qty × price) | — |
| quantity_received | Number | No | Quantity actually received | — |
| variance | Number | No | Difference between ordered and received | — |
| notes | Text | No | Line item notes | — |

---

### 18. RECEIVING

**Purpose:** Documents receipt of deliveries. Receiving is the point at which the organization takes legal ownership and physical possession of items ordered.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| receiving_id | Text | Yes | Unique identifier (e.g., RCV-001) | — |
| po_number | Dropdown | No | Related purchase order (if any) | Purchase_Orders.po_number |
| vendor_id | Dropdown | Yes | Which vendor | Vendors.vendor_id |
| site_id | Dropdown | Yes | Receiving location | Sites.site_id |
| delivery_date | Date | Yes | Date received | — |
| delivery_time | Time | Yes | Time received | — |
| invoice_number | Text | Yes | Vendor invoice number | — |
| invoice_amount | Currency | No | Invoice total amount | — |
| received_by | Dropdown | Yes | Employee who received | Employees.employee_id |
| receiving_method | Dropdown | Yes | Invoice Method, Blind Method | — |
| temperature_check_passed | Checkbox | Yes | Whether temp check passed for refrigerated items | — |
| refrigerated_temp_f | Number | No | Temperature of refrigerated items at receipt | — |
| frozen_temp_f | Number | No | Temperature of frozen items at receipt | — |
| quality_acceptable | Checkbox | Yes | Whether quality met specifications | — |
| discrepancies | Text | No | Any discrepancies noted | — |
| discrepancy_action | Dropdown | No | Accepted, Rejected, Credit Requested, Returned | — |
| credit_memo_number | Text | No | Credit memo reference if applicable | — |
| transferred_to_storage_time | Time | No | Time items were put in storage | — |
| status | Dropdown | Yes | Received, Pending Review, Disputed | — |
| notes | Text | No | Additional information | — |

---

### 19. INVENTORY

**Purpose:** Current inventory levels by storage location. Supports both perpetual and physical inventory methods.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| inventory_id | Text | Yes | Unique identifier | — |
| ingredient_id | Dropdown | Yes | Which ingredient | Ingredients.ingredient_id |
| site_id | Dropdown | Yes | Which site | Sites.site_id |
| storage_location | Dropdown | Yes | Dry Storage, Walk-in Cooler, Walk-in Freezer, Reach-in Cooler, Reach-in Freezer | — |
| bin_location | Text | No | Shelf/bin location code | — |
| quantity_on_hand | Number | Yes | Current quantity | — |
| unit_of_measure | Dropdown | Yes | Unit of measure | Units_of_Measure.unit_id |
| unit_cost | Currency | No | Cost per unit (for valuation) | — |
| total_value | Currency | No | Calculated inventory value | — |
| last_received_date | Date | No | When last received | — |
| expiration_date | Date | No | Product expiration date | — |
| lot_number | Text | No | Lot/batch number for traceability | — |
| last_physical_count_date | Date | No | Date of last physical count | — |
| last_physical_count_qty | Number | No | Quantity at last physical count | — |
| variance_from_perpetual | Number | No | Difference between perpetual and physical | — |
| below_par_flag | Checkbox | No | Whether quantity is below par level | — |
| notes | Text | No | Additional information | — |

---

### 20. STOREROOM_ISSUES

**Purpose:** Tracks items issued from storeroom to production (requisitions). The storeroom issue process supports cost tracking and inventory control.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| issue_id | Text | Yes | Unique identifier (e.g., ISS-001) | — |
| requisition_number | Text | Yes | Requisition document number | — |
| issue_date | Date | Yes | Date of issue | — |
| ingredient_id | Dropdown | Yes | Which ingredient | Ingredients.ingredient_id |
| from_site_id | Dropdown | Yes | Issuing storeroom site | Sites.site_id |
| to_site_id | Dropdown | No | Receiving site (if different) | Sites.site_id |
| quantity_issued | Number | Yes | Quantity issued | — |
| unit_of_measure | Dropdown | Yes | Unit of measure | Units_of_Measure.unit_id |
| unit_cost | Currency | No | Cost per unit at time of issue | — |
| extended_cost | Currency | No | Total cost of issue | — |
| issued_by | Dropdown | Yes | Employee who issued | Employees.employee_id |
| received_by | Text | No | Person who received | — |
| production_schedule_id | Dropdown | No | Related production schedule | Production_Schedules.schedule_id |
| meal_date | Date | No | For which meal date | — |
| notes | Text | No | Additional information | — |

---

### 21. PRODUCTION_SCHEDULES

**Purpose:** Daily/shift production schedules that communicate to production staff what needs to be prepared. This is the operational bridge between menu planning and actual food production.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| schedule_id | Text | Yes | Unique identifier | — |
| production_date | Date | Yes | Date of production | — |
| site_id | Dropdown | Yes | Production site | Sites.site_id |
| shift | Dropdown | Yes | AM, PM, Night, All Day | — |
| meal_period_id | Dropdown | Yes | Which meal being produced for | Meal_Periods.meal_period_id |
| recipe_id | Dropdown | Yes | Which recipe to produce | Recipes.recipe_id |
| forecasted_portions | Number | Yes | Number of portions to produce | — |
| batch_multiplier | Number | No | Recipe multiplier for this batch | — |
| actual_portions_produced | Number | No | Actual portions made | — |
| assigned_employee_id | Dropdown | No | Who is assigned to produce | Employees.employee_id |
| start_time_target | Time | No | Target start time | — |
| completion_time_target | Time | Yes | Target completion time | — |
| actual_start_time | Time | No | Actual start time | — |
| actual_completion_time | Time | No | Actual completion time | — |
| station_id | Dropdown | No | Which station | Stations.station_id |
| equipment_needed | Text | No | Equipment to be used | — |
| prep_instructions | Text | No | Special instructions | — |
| haccp_temp_logged | Number | No | Final cooking temp logged | — |
| haccp_time_logged | Time | No | Time temp was logged | — |
| quality_check_passed | Checkbox | No | Whether quality check passed | — |
| status | Dropdown | Yes | Scheduled, In Progress, Completed, Cancelled | — |
| notes | Text | No | Additional information | — |

---

### 22. FORECASTS

**Purpose:** Demand forecasting records for production planning. Based on historical data and adjusted for factors like weather, holidays, and special events.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| forecast_id | Text | Yes | Unique identifier | — |
| forecast_date | Date | Yes | Date being forecasted | — |
| site_id | Dropdown | Yes | Which site | Sites.site_id |
| meal_period_id | Dropdown | Yes | Which meal | Meal_Periods.meal_period_id |
| recipe_id | Dropdown | No | Specific recipe (for item-level forecasts) | Recipes.recipe_id |
| forecast_type | Dropdown | Yes | Census, Menu Item, Category | — |
| forecasted_count | Number | Yes | Forecasted quantity | — |
| actual_count | Number | No | Actual served (entered after service) | — |
| variance | Number | No | Difference (actual - forecast) | — |
| variance_percent | Percent | No | Variance as percentage | — |
| forecast_method | Dropdown | No | Moving Average, Exponential Smoothing, Tally, Management Estimate | — |
| adjustment_factors | Text | No | Factors considered (weather, holiday, etc.) | — |
| historical_average | Number | No | Average from historical data | — |
| created_by | Text | No | Who created forecast | — |
| created_date | Date | No | When forecast was created | — |
| notes | Text | No | Additional information | — |

---

### 23. LEFTOVER_REPORTS

**Purpose:** Tracks leftover food after service for waste reduction, forecasting improvement, and cost control.

| Column | Type | Required | Description | Linked To |
|--------|------|----------|-------------|-----------|
| leftover_id | Text | Yes | Unique identifier | — |
| report_date | Date | Yes | Date of meal | — |
| meal_period_id | Dropdown | Yes | Which meal | Meal_Periods.meal_period_id |
| site_id | Dropdown | Yes | Which site | Sites.site_id |
| recipe_id | Dropdown | Yes | Which recipe | Recipes.recipe_id |
| portions_produced | Number | Yes | How many portions were made | — |
| portions_served | Number | Yes | How many were served | — |
| portions_leftover | Number | Yes | How many remain | — |
| leftover_quality | Dropdown | Yes | Usable, Marginal, Waste | — |
| disposition | Dropdown | Yes | Repurposed, Refrigerated for Next Day, Frozen, Donated, Discarded | — |
| weight_discarded_lbs | Number | No | Weight of food discarded | — |
| estimated_cost_lost | Currency | No | Estimated cost of waste | — |
| reason_for_excess | Dropdown | No | Over-forecast, Over-production, Low Participation, Poor Quality | — |
| reported_by | Dropdown | Yes | Who reported | Employees.employee_id |
| notes | Text | No | Additional information | — |

---

## Reference Sheets

### 24. UNITS_OF_MEASURE

**Purpose:** Standard units of measure for consistency across all sheets.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| unit_id | Text | Yes | Unique identifier (e.g., UOM-001) |
| unit_name | Text | Yes | Full name (e.g., "Pound", "Ounce", "Cup") |
| unit_abbreviation | Text | Yes | Standard abbreviation (e.g., "lb", "oz", "c") |
| unit_type | Dropdown | Yes | Weight, Volume, Count, Each |
| conversion_to_base | Number | No | Conversion factor to base unit |
| base_unit | Text | No | Base unit for conversions |

---

### 25. FOOD_CATEGORIES

**Purpose:** Food category classifications for grouping ingredients and organizing storage/inventory.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| category_id | Text | Yes | Unique identifier |
| category_name | Text | Yes | Name (e.g., "Dairy", "Produce", "Meat", "Dry Goods") |
| storage_type | Dropdown | Yes | Default storage type: Dry, Refrigerated, Frozen |
| sort_order | Number | Yes | Display order |

---

### 26. ALLERGENS

**Purpose:** Reference list of major food allergens for labeling and diet management.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| allergen_id | Text | Yes | Unique identifier |
| allergen_name | Text | Yes | Name (e.g., "Milk", "Eggs", "Fish", "Shellfish", "Tree Nuts", "Peanuts", "Wheat", "Soybeans", "Sesame") |
| is_major_allergen | Checkbox | Yes | Whether it's one of the major allergens |
| common_sources | Text | No | Common foods containing this allergen |
| cross_contact_risk | Text | No | Notes on cross-contact risks |

---

## Implementation Notes

### Data Validation (Dropdowns)

Each dropdown column should be implemented using Google Sheets **Data Validation** with values from the linked sheet. For example:

- `Sites.site_id` dropdown → pulls from Sites sheet, site_id column
- `Recipes.recipe_id` dropdown → pulls from Recipes sheet, recipe_id column

### Formulas and Automation

Key calculated fields can use formulas:

1. **Recipe Cost**: Sum of (ingredient quantity × ingredient unit cost) in Recipe_Ingredients
2. **Inventory Value**: quantity_on_hand × unit_cost
3. **PO Extended Price**: quantity_ordered × unit_price
4. **Forecast Variance**: actual_count - forecasted_count
5. **Below Par Flag**: =IF(quantity_on_hand < par_level, TRUE, FALSE)

### Recommended Add-ons

Consider using Google Sheets add-ons for:
- **Form-based data entry** (Google Forms linked to sheets)
- **Barcode scanning** for receiving and inventory
- **Automated notifications** for low inventory, expiring items
- **Reporting dashboards** for management metrics

### HACCP Integration

The system supports HACCP documentation through:
- Temperature logging fields in Receiving
- Critical limits stored in Recipes
- Temperature logging in Production_Schedules
- Time-temperature documentation throughout the food flow

---

## Relationships Diagram

```
Sites ─────────────────────────────────────────────────┐
  │                                                    │
  ├── Stations                                         │
  ├── Employees (primary_site)                         │
  ├── Diners                                           │
  ├── Inventory                                        │
  ├── Receiving                                        │
  ├── Production_Schedules                             │
  ├── Forecasts                                        │
  └── Leftover_Reports                                 │
                                                       │
Cycle_Menus ──── Menu_Items ───┬── Recipes ────────────┤
                               │      │                │
                               │      └── Recipe_Ingredients ── Ingredients
                               │                               │
                               │                               ├── Product_Specifications
                               │                               └── Vendors
Meal_Periods ──────────────────┤
                               │
Diet_Types ────────────────────┼── Diners ── Diet_Assignments
                               │      │
                               │      └── Meal_Orders
                               │
Vendors ── Purchase_Orders ── PO_Line_Items ── Ingredients
               │
               └── Receiving ── Inventory ── Storeroom_Issues
```

---

## Getting Started Checklist

1. **Create Reference Sheets First**
   - Units_of_Measure
   - Food_Categories
   - Allergens

2. **Set Up Organization**
   - Sites
   - Stations
   - Employees
   - Meal_Periods
   - Diet_Types

3. **Build Recipe Database**
   - Ingredients
   - Recipes
   - Recipe_Ingredients

4. **Create Cycle Menu**
   - Cycle_Menus
   - Menu_Items

5. **Establish Procurement**
   - Vendors
   - Product_Specifications

6. **Begin Operations**
   - Diners (if applicable)
   - Purchase_Orders
   - Receiving
   - Inventory
   - Production_Schedules

---

*This design is based on principles from "Foodservice Management: Principles and Practices" (13th Edition) by Payne-Palacio & Theis, adapted for spreadsheet implementation.*

