/**
 * Development Seed Data
 * 
 * Creates sample tenant, sites, employees, and diners for development/testing.
 * This supplements the reference data seeding.
 * 
 * Run with: npx tsx src/db/seed-dev.ts
 */

import { db } from './index.js';
import { 
  tenants, 
  sites, 
  stations,
  employees, 
  diners,
  dietAssignments,
} from './schema/index.js';
import { inventory } from './schema/inventory.js';
import { purchaseOrders, poLineItems, vendors } from './schema/procurement.js';
import { productionSchedules } from './schema/production.js';
import { recipes } from './schema/recipes.js';
import { cycleMenus, menuItems, singleUseMenus, singleUseMenuItems } from './schema/menu.js';
import { generateId } from '../lib/id.js';

async function seedDevData() {
  console.log('Seeding development data...\n');

  // ============================================================================
  // Create a demo tenant
  // ============================================================================
  console.log('Creating demo tenant...');
  
  const tenantId = 'TEN-DEMO001';
  await db.insert(tenants).values({
    tenantId,
    tenantName: 'Sunny Meadows Healthcare',
    tenantCode: 'SUNNY',
    contactName: 'Jane Smith',
    contactEmail: 'admin@sunnymeadows.example.com',
    contactPhone: '555-123-4567',
    address: '123 Healthcare Drive',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    countryCode: 'US',
    subscriptionTier: 'Standard',
    maxSites: 5,
    maxUsers: 50,
    createdDate: new Date().toISOString(),
    status: 'Active',
  }).onConflictDoNothing();

  // ============================================================================
  // Create sites
  // ============================================================================
  console.log('Creating sites...');

  const mainKitchenId = 'SITE-MAIN001';
  const nursingWingId = 'SITE-NURS001';

  await db.insert(sites).values([
    {
      siteId: mainKitchenId,
      tenantId,
      siteName: 'Main Kitchen',
      siteType: 'Kitchen',
      address: '123 Healthcare Drive, Building A',
      capacitySeats: 120,
      hasProductionKitchen: true,
      storageDrySqft: 400,
      storageRefrigeratedSqft: 200,
      storageFreezerSqft: 150,
      managerName: 'Chef Maria Garcia',
      phone: '555-123-4568',
      operatingHours: '5:00 AM - 8:00 PM',
      status: 'Active',
    },
    {
      siteId: nursingWingId,
      tenantId,
      siteName: 'East Nursing Wing',
      siteType: 'Satellite',
      address: '123 Healthcare Drive, Building B',
      capacitySeats: 40,
      hasProductionKitchen: false,
      managerName: 'Nurse Director Tom Johnson',
      phone: '555-123-4569',
      operatingHours: '6:00 AM - 9:00 PM',
      status: 'Active',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create employees
  // ============================================================================
  console.log('Creating employees...');

  await db.insert(employees).values([
    {
      employeeId: 'EMP-ADMIN001',
      tenantId,
      firstName: 'Jane',
      lastName: 'Smith',
      primarySiteId: mainKitchenId,
      jobTitle: 'Manager',
      hireDate: '2020-01-15',
      hourlyRate: 35.00,
      certifications: 'ServSafe Manager, RD',
      phone: '555-111-0001',
      email: 'jane.smith@sunnymeadows.example.com',
      status: 'Active',
    },
    {
      employeeId: 'EMP-CHEF001',
      tenantId,
      firstName: 'Maria',
      lastName: 'Garcia',
      primarySiteId: mainKitchenId,
      jobTitle: 'Cook',
      hireDate: '2019-06-01',
      hourlyRate: 22.00,
      certifications: 'ServSafe Handler, Culinary Certificate',
      phone: '555-111-0002',
      email: 'maria.garcia@sunnymeadows.example.com',
      status: 'Active',
    },
    {
      employeeId: 'EMP-DIET001',
      tenantId,
      firstName: 'Sarah',
      lastName: 'Chen',
      primarySiteId: mainKitchenId,
      jobTitle: 'Dietitian',
      hireDate: '2021-03-10',
      hourlyRate: 40.00,
      certifications: 'RD, CDN',
      phone: '555-111-0003',
      email: 'sarah.chen@sunnymeadows.example.com',
      status: 'Active',
    },
    {
      employeeId: 'EMP-STAFF001',
      tenantId,
      firstName: 'Mike',
      lastName: 'Johnson',
      primarySiteId: mainKitchenId,
      jobTitle: 'Server',
      hireDate: '2022-08-15',
      hourlyRate: 16.00,
      certifications: 'ServSafe Handler',
      phone: '555-111-0004',
      email: 'mike.johnson@sunnymeadows.example.com',
      status: 'Active',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create sample diners
  // ============================================================================
  console.log('Creating sample diners...');

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const sampleDiners = [
    {
      dinerId: 'DNR-TEST001',
      firstName: 'Robert',
      lastName: 'Williams',
      roomNumber: '101-A',
      dinerType: 'Resident' as const,
      admissionDate: '2025-06-15',
      primaryDietTypeId: 'DIET-REG',
      textureModification: 'Regular' as const,
      liquidConsistency: 'Regular' as const,
      feedingAssistance: 'Independent' as const,
      physician: 'Dr. Anderson',
    },
    {
      dinerId: 'DNR-TEST002',
      firstName: 'Margaret',
      lastName: 'Davis',
      roomNumber: '102-B',
      dinerType: 'Resident' as const,
      admissionDate: '2025-09-01',
      primaryDietTypeId: 'DIET-DIAB',
      textureModification: 'Regular' as const,
      liquidConsistency: 'Regular' as const,
      allergies: 'Shellfish',
      dislikes: 'Liver, Brussels sprouts',
      preferences: 'Prefers chicken over beef',
      feedingAssistance: 'Setup' as const,
      physician: 'Dr. Martinez',
    },
    {
      dinerId: 'DNR-TEST003',
      firstName: 'James',
      lastName: 'Wilson',
      roomNumber: '103-A',
      dinerType: 'Resident' as const,
      admissionDate: '2025-11-10',
      primaryDietTypeId: 'DIET-CARDIAC',
      textureModification: 'Mechanical Soft' as const,
      liquidConsistency: 'Thickened-Nectar' as const,
      allergies: 'Tree nuts, Peanuts',
      specialInstructions: 'Needs extra time for meals',
      feedingAssistance: 'Feeding Assist' as const,
      physician: 'Dr. Chen',
    },
    {
      dinerId: 'DNR-TEST004',
      firstName: 'Patricia',
      lastName: 'Brown',
      roomNumber: '201-A',
      dinerType: 'Resident' as const,
      admissionDate: '2026-01-05',
      primaryDietTypeId: 'DIET-RENAL',
      textureModification: 'Pureed' as const,
      liquidConsistency: 'Thickened-Honey' as const,
      allergies: 'Milk, Eggs',
      dislikes: 'Fish',
      feedingAssistance: 'Feeding Assist' as const,
      physician: 'Dr. Anderson',
    },
    {
      dinerId: 'DNR-TEST005',
      firstName: 'William',
      lastName: 'Taylor',
      roomNumber: '202-B',
      dinerType: 'Resident' as const,
      admissionDate: '2025-12-20',
      primaryDietTypeId: 'DIET-REG',
      textureModification: 'Regular' as const,
      liquidConsistency: 'Regular' as const,
      preferences: 'Likes spicy food',
      feedingAssistance: 'Independent' as const,
      physician: 'Dr. Martinez',
    },
  ];

  for (const diner of sampleDiners) {
    await db.insert(diners).values({
      ...diner,
      tenantId,
      siteId: nursingWingId,
      status: 'Active',
    }).onConflictDoNothing();

    // Create initial diet assignment
    await db.insert(dietAssignments).values({
      assignmentId: generateId('dietAssignment'),
      dinerId: diner.dinerId,
      dietTypeId: diner.primaryDietTypeId,
      effectiveDate: diner.admissionDate,
      orderedBy: diner.physician,
      reason: 'Initial admission diet order',
      textureModification: diner.textureModification,
      liquidConsistency: diner.liquidConsistency,
      createdDate: now,
      createdBy: 'system-seed',
    }).onConflictDoNothing();
  }

  // ============================================================================
  // Create stations
  // ============================================================================
  console.log('Creating stations...');

  await db.insert(stations).values([
    {
      stationId: 'STN-MAIN-PROD',
      siteId: mainKitchenId,
      stationName: 'Production Kitchen',
      stationType: 'Production',
      serviceStyle: 'Back of House',
      requiresTempLog: true,
      capacityCoversPerHour: 200,
      equipmentList: 'Combi ovens, tilt skillets, steam kettles, blast chiller',
      status: 'Active',
    },
    {
      stationId: 'STN-MAIN-TRAY1',
      siteId: mainKitchenId,
      stationName: 'Trayline A',
      stationType: 'Trayline',
      serviceStyle: 'Assembly Line',
      requiresTempLog: true,
      capacityCoversPerHour: 120,
      equipmentList: 'Trayline conveyor, hot wells, cold wells, plate dispensers',
      status: 'Active',
    },
    {
      stationId: 'STN-MAIN-TRAY2',
      siteId: mainKitchenId,
      stationName: 'Trayline B',
      stationType: 'Trayline',
      serviceStyle: 'Assembly Line',
      requiresTempLog: true,
      capacityCoversPerHour: 120,
      equipmentList: 'Trayline conveyor, hot wells, cold wells, plate dispensers',
      status: 'Active',
    },
    {
      stationId: 'STN-MAIN-CAFE',
      siteId: mainKitchenId,
      stationName: 'Resident Café',
      stationType: 'Café',
      serviceStyle: 'Counter Service',
      requiresTempLog: true,
      capacityCoversPerHour: 60,
      equipmentList: 'Display case, sandwich unit, beverage station',
      status: 'Active',
    },
    {
      stationId: 'STN-MAIN-SALAD',
      siteId: mainKitchenId,
      stationName: 'Salad & Cold Prep',
      stationType: 'Salad Bar',
      serviceStyle: 'Self-Service',
      requiresTempLog: true,
      capacityCoversPerHour: 80,
      equipmentList: 'Refrigerated salad bar, prep tables, slicer',
      status: 'Active',
    },
    {
      stationId: 'STN-NURS-RETHERM',
      siteId: nursingWingId,
      stationName: 'Retherm Kitchen',
      stationType: 'Retherm',
      serviceStyle: 'Back of House',
      requiresTempLog: true,
      capacityCoversPerHour: 60,
      equipmentList: 'Retherm ovens, holding cabinets',
      status: 'Active',
    },
    {
      stationId: 'STN-NURS-TRAY',
      siteId: nursingWingId,
      stationName: 'Trayline',
      stationType: 'Trayline',
      serviceStyle: 'Assembly Line',
      requiresTempLog: true,
      capacityCoversPerHour: 40,
      equipmentList: 'Small trayline, hot wells, cold wells',
      status: 'Active',
    },
    {
      stationId: 'STN-NURS-DINING',
      siteId: nursingWingId,
      stationName: 'Dining Room Service',
      stationType: 'Dining Room',
      serviceStyle: 'Table Service',
      requiresTempLog: false,
      capacityCoversPerHour: 40,
      equipmentList: 'Service carts, beverage station',
      status: 'Active',
    },
  ] as any[]).onConflictDoNothing();

  // ============================================================================
  // Create vendors
  // ============================================================================
  console.log('Creating vendors...');

  await db.insert(vendors).values([
    {
      vendorId: 'VND-SYSCO001',
      tenantId,
      vendorName: 'Sysco Foods',
      vendorType: 'Broadline Distributor',
      contactName: 'John Reynolds',
      phone: '555-800-1234',
      email: 'jreynolds@sysco.example.com',
      address: '1000 Distribution Way',
      city: 'Springfield',
      state: 'IL',
      zip: '62702',
      deliveryDays: 'Mon, Wed, Fri',
      deliveryLeadTimeDays: 2,
      minimumOrder: 250.00,
      paymentTerms: 'Net 30',
      accountNumber: 'SYS-SMH-4521',
      performanceRating: 4.5,
      status: 'Active',
    },
    {
      vendorId: 'VND-USFOODS001',
      tenantId,
      vendorName: 'US Foods',
      vendorType: 'Broadline Distributor',
      contactName: 'Sarah Mitchell',
      phone: '555-800-5678',
      email: 'smitchell@usfoods.example.com',
      address: '2000 Foodservice Blvd',
      city: 'Springfield',
      state: 'IL',
      zip: '62703',
      deliveryDays: 'Tue, Thu',
      deliveryLeadTimeDays: 2,
      minimumOrder: 200.00,
      paymentTerms: 'Net 30',
      accountNumber: 'USF-SMH-7892',
      performanceRating: 4.2,
      status: 'Active',
    },
    {
      vendorId: 'VND-PRODUCE001',
      tenantId,
      vendorName: 'Fresh Farms Produce',
      vendorType: 'Produce',
      contactName: 'Miguel Santos',
      phone: '555-321-9876',
      email: 'msantos@freshfarms.example.com',
      address: '500 Farmers Market Rd',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      deliveryDays: 'Mon, Wed, Fri',
      deliveryLeadTimeDays: 1,
      minimumOrder: 100.00,
      paymentTerms: 'Net 15',
      performanceRating: 4.8,
      status: 'Active',
    },
    {
      vendorId: 'VND-DAIRY001',
      tenantId,
      vendorName: 'Prairie Dairy Co',
      vendorType: 'Dairy',
      contactName: 'Linda Olsen',
      phone: '555-444-3333',
      email: 'lolsen@prairiedairy.example.com',
      address: '300 Creamery Lane',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
      deliveryDays: 'Tue, Thu, Sat',
      deliveryLeadTimeDays: 1,
      minimumOrder: 75.00,
      paymentTerms: 'Net 15',
      performanceRating: 4.6,
      status: 'Active',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create inventory items
  // ============================================================================
  console.log('Creating inventory items...');

  await db.insert(inventory).values([
    // Main Kitchen inventory
    {
      inventoryId: 'INV-MAIN-001',
      tenantId,
      ingredientId: 'ING-C37s47hmov', // Chicken Breast
      siteId: mainKitchenId,
      storageLocation: 'Walk-in Cooler',
      quantityOnHand: 45.0,
      unitOfMeasure: 'UOM-LB',
      unitCost: 4.50,
      totalValue: 202.50,
      lastReceivedDate: '2026-01-28',
      expirationDate: '2026-02-10',
      lotNumber: 'LOT-2026-0128-A',
      belowParFlag: false,
    },
    {
      inventoryId: 'INV-MAIN-002',
      tenantId,
      ingredientId: 'ING-FxHQ5v1MMj', // Ground Beef
      siteId: mainKitchenId,
      storageLocation: 'Walk-in Freezer',
      quantityOnHand: 80.0,
      unitOfMeasure: 'UOM-LB',
      unitCost: 5.25,
      totalValue: 420.00,
      lastReceivedDate: '2026-01-25',
      expirationDate: '2026-04-01',
      lotNumber: 'LOT-2026-0125-B',
      belowParFlag: false,
    },
    {
      inventoryId: 'INV-MAIN-003',
      tenantId,
      ingredientId: 'ING-x0Np5FWYAl', // Russet Potatoes
      siteId: mainKitchenId,
      storageLocation: 'Dry Storage',
      quantityOnHand: 150.0,
      unitOfMeasure: 'UOM-LB',
      unitCost: 0.85,
      totalValue: 127.50,
      lastReceivedDate: '2026-01-30',
      expirationDate: '2026-03-15',
      belowParFlag: false,
    },
    // East Wing inventory
    {
      inventoryId: 'INV-NURS-001',
      tenantId,
      ingredientId: 'ING-C37s47hmov', // Chicken Breast
      siteId: nursingWingId,
      storageLocation: 'Reach-in Cooler',
      quantityOnHand: 12.0,
      unitOfMeasure: 'UOM-LB',
      unitCost: 4.50,
      totalValue: 54.00,
      lastReceivedDate: '2026-01-29',
      expirationDate: '2026-02-08',
      lotNumber: 'LOT-2026-0129-C',
      belowParFlag: true, // Low stock!
    },
    {
      inventoryId: 'INV-NURS-002',
      tenantId,
      ingredientId: 'ING-x0Np5FWYAl', // Russet Potatoes
      siteId: nursingWingId,
      storageLocation: 'Dry Storage',
      quantityOnHand: 25.0,
      unitOfMeasure: 'UOM-LB',
      unitCost: 0.85,
      totalValue: 21.25,
      lastReceivedDate: '2026-01-30',
      expirationDate: '2026-03-15',
      belowParFlag: false,
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create purchase orders
  // ============================================================================
  console.log('Creating purchase orders...');

  await db.insert(purchaseOrders).values([
    {
      poNumber: 'PO-2026-0001',
      tenantId,
      vendorId: 'VND-SYSCO001',
      siteId: mainKitchenId,
      orderDate: '2026-01-28',
      requestedDeliveryDate: '2026-02-03',
      orderedBy: 'EMP-CHEF001',
      subtotal: 1250.00,
      tax: 0,
      shipping: 0,
      total: 1250.00,
      paymentTerms: 'Net 30',
      status: 'Confirmed',
      notes: 'Weekly protein order',
    },
    {
      poNumber: 'PO-2026-0002',
      tenantId,
      vendorId: 'VND-PRODUCE001',
      siteId: mainKitchenId,
      orderDate: '2026-01-30',
      requestedDeliveryDate: '2026-02-03',
      orderedBy: 'EMP-CHEF001',
      subtotal: 425.00,
      tax: 0,
      shipping: 0,
      total: 425.00,
      paymentTerms: 'Net 15',
      status: 'Submitted',
      notes: 'Fresh produce for week of 2/3',
    },
    {
      poNumber: 'PO-2026-0003',
      tenantId,
      vendorId: 'VND-DAIRY001',
      siteId: nursingWingId,
      orderDate: '2026-02-01',
      requestedDeliveryDate: '2026-02-04',
      orderedBy: 'EMP-ADMIN001',
      subtotal: 185.00,
      tax: 0,
      shipping: 0,
      total: 185.00,
      paymentTerms: 'Net 15',
      status: 'Draft',
      notes: 'East wing dairy replenishment',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create recipes
  // ============================================================================
  console.log('Creating recipes...');

  await db.insert(recipes).values([
    {
      recipeId: 'RCP-CHICKEN-001',
      tenantId,
      recipeName: 'Roasted Chicken Breast',
      recipeCode: 'CHK-RST-01',
      category: 'Entrée',
      cuisineType: 'American',
      yieldQuantity: 50,
      yieldUnit: 'UOM-PORTION',
      portionSize: '4 oz cooked',
      portionUtensil: 'Tongs',
      prepTimeMinutes: 15,
      cookTimeMinutes: 25,
      cookingTempF: 375,
      cookingMethod: 'Roast',
      instructions: '1. Season chicken breasts with salt, pepper, and herbs.\n2. Place on sheet pans.\n3. Roast at 375°F for 25 minutes until internal temp reaches 165°F.\n4. Rest 5 minutes before slicing.',
      haccpCriticalPoints: 'Internal temp must reach 165°F',
      holdingInstructions: 'Hold at 140°F or above',
      status: 'Active',
    },
    {
      recipeId: 'RCP-POTATO-001',
      tenantId,
      recipeName: 'Creamy Mashed Potatoes',
      recipeCode: 'POT-MSH-01',
      category: 'Starch',
      cuisineType: 'American',
      yieldQuantity: 50,
      yieldUnit: 'UOM-PORTION',
      portionSize: '1/2 cup',
      portionUtensil: '#8 scoop',
      prepTimeMinutes: 20,
      cookTimeMinutes: 30,
      cookingTempF: 212,
      cookingMethod: 'Boil',
      instructions: '1. Peel and cube potatoes.\n2. Boil until fork tender (about 20-25 min).\n3. Drain well.\n4. Add warm butter and cream.\n5. Mash until smooth, season with salt and pepper.',
      holdingInstructions: 'Hold at 140°F, add cream to refresh if needed',
      status: 'Active',
    },
    {
      recipeId: 'RCP-MEATLOAF-001',
      tenantId,
      recipeName: 'Classic Meatloaf',
      recipeCode: 'MLF-CLS-01',
      category: 'Entrée',
      cuisineType: 'American',
      yieldQuantity: 48,
      yieldUnit: 'UOM-PORTION',
      portionSize: '5 oz slice',
      portionUtensil: 'Spatula',
      prepTimeMinutes: 30,
      cookTimeMinutes: 60,
      cookingTempF: 350,
      cookingMethod: 'Bake',
      instructions: '1. Mix ground beef with eggs, breadcrumbs, onions, and seasonings.\n2. Shape into loaves in hotel pans.\n3. Top with glaze.\n4. Bake at 350°F for 60 minutes until internal temp reaches 160°F.\n5. Rest 10 minutes before slicing.',
      haccpCriticalPoints: 'Internal temp must reach 160°F',
      holdingInstructions: 'Hold at 140°F or above',
      status: 'Active',
    },
    {
      recipeId: 'RCP-SCRAMBLED-001',
      tenantId,
      recipeName: 'Scrambled Eggs',
      recipeCode: 'EGG-SCR-01',
      category: 'Breakfast',
      cuisineType: 'American',
      yieldQuantity: 50,
      yieldUnit: 'UOM-PORTION',
      portionSize: '2 eggs equivalent',
      portionUtensil: '#6 spoodle',
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      cookingTempF: 325,
      cookingMethod: 'Sauté',
      instructions: '1. Crack eggs into mixing bowl, add milk, salt, pepper.\n2. Whisk until combined.\n3. Cook in tilt skillet over medium heat.\n4. Stir gently until set but still moist.',
      haccpCriticalPoints: 'Cook to 145°F, hold at 135°F or above',
      holdingInstructions: 'Hold at 135°F, do not hold more than 30 minutes',
      status: 'Active',
    },
    {
      recipeId: 'RCP-GREENBEANS-001',
      tenantId,
      recipeName: 'Seasoned Green Beans',
      recipeCode: 'VEG-GRB-01',
      category: 'Vegetable',
      cuisineType: 'American',
      yieldQuantity: 50,
      yieldUnit: 'UOM-PORTION',
      portionSize: '1/2 cup',
      portionUtensil: '#8 spoodle',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      cookingTempF: 212,
      cookingMethod: 'Steam',
      instructions: '1. Trim green beans.\n2. Steam until tender-crisp (12-15 min).\n3. Toss with butter, garlic, salt and pepper.',
      holdingInstructions: 'Hold at 140°F',
      status: 'Active',
    },
  ] as any[]).onConflictDoNothing();

  // ============================================================================
  // Create cycle menus
  // ============================================================================
  console.log('Creating cycle menus...');

  await db.insert(cycleMenus).values([
    {
      cycleMenuId: 'MENU-WINTER-2026',
      tenantId,
      cycleName: 'Winter 2026 Menu',
      season: 'Winter',
      cycleLengthWeeks: 4,
      startDate: '2026-01-06',
      endDate: '2026-03-31',
      siteId: mainKitchenId,
      targetFoodCostPerMeal: 4.50,
      status: 'Active',
      approvedBy: 'Sarah Chen, RD',
      approvalDate: '2025-12-15',
      notes: 'Winter comfort food focus with hearty soups and roasted proteins',
      llmNotes: 'Winter menu emphasizes warm, comforting dishes. Higher protein portions due to cold weather. Include seasonal vegetables like squash, root vegetables. Soup available at every lunch and dinner.',
    },
    {
      cycleMenuId: 'MENU-SPRING-2026',
      tenantId,
      cycleName: 'Spring 2026 Menu',
      season: 'Spring',
      cycleLengthWeeks: 4,
      startDate: '2026-04-01',
      endDate: null, // Ongoing
      siteId: mainKitchenId,
      targetFoodCostPerMeal: 4.25,
      status: 'Draft',
      notes: 'Spring menu with lighter fare and fresh vegetables',
      llmNotes: 'Spring menu transitions to lighter dishes. Fresh asparagus, peas, and spring greens featured. Lighter proteins like fish and chicken. Reduce heavy cream-based sauces.',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create menu items (sample week 1 of winter menu)
  // ============================================================================
  console.log('Creating menu items...');

  await db.insert(menuItems).values([
    // Monday Lunch
    {
      menuItemId: 'MI-W1-MON-L-ENT1',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      mealPeriodId: 'MP-LUNCH',
      menuCategory: 'Entrée',
      recipeId: 'RCP-CHICKEN-001',
      dietTypeId: 'DIET-REG',
      portionSize: '4 oz',
      isChoice: true,
      choiceGroup: 'Entrée',
      estimatedParticipation: 0.55,
    },
    {
      menuItemId: 'MI-W1-MON-L-ENT2',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      mealPeriodId: 'MP-LUNCH',
      menuCategory: 'Entrée',
      recipeId: 'RCP-MEATLOAF-001',
      dietTypeId: 'DIET-REG',
      portionSize: '5 oz slice',
      isChoice: true,
      choiceGroup: 'Entrée',
      estimatedParticipation: 0.35,
    },
    {
      menuItemId: 'MI-W1-MON-L-STARCH',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      mealPeriodId: 'MP-LUNCH',
      menuCategory: 'Starch',
      recipeId: 'RCP-POTATO-001',
      dietTypeId: 'DIET-REG',
      portionSize: '1/2 cup',
      isChoice: false,
      estimatedParticipation: 0.80,
    },
    {
      menuItemId: 'MI-W1-MON-L-VEG',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      mealPeriodId: 'MP-LUNCH',
      menuCategory: 'Vegetable',
      recipeId: 'RCP-GREENBEANS-001',
      dietTypeId: 'DIET-REG',
      portionSize: '1/2 cup',
      isChoice: false,
      estimatedParticipation: 0.65,
    },
    // Monday Dinner
    {
      menuItemId: 'MI-W1-MON-D-ENT1',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Entrée',
      recipeId: 'RCP-MEATLOAF-001',
      dietTypeId: 'DIET-REG',
      portionSize: '5 oz slice',
      isChoice: false,
      estimatedParticipation: 0.70,
    },
    {
      menuItemId: 'MI-W1-MON-D-STARCH',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Starch',
      recipeId: 'RCP-POTATO-001',
      dietTypeId: 'DIET-REG',
      portionSize: '1/2 cup',
      isChoice: false,
      estimatedParticipation: 0.75,
    },
    // Tuesday Breakfast
    {
      menuItemId: 'MI-W1-TUE-B-ENT',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Tuesday',
      mealPeriodId: 'MP-BRKFST',
      menuCategory: 'Entrée',
      recipeId: 'RCP-SCRAMBLED-001',
      dietTypeId: 'DIET-REG',
      portionSize: '2 eggs equivalent',
      isChoice: false,
      estimatedParticipation: 0.85,
    },
    // Tuesday Lunch
    {
      menuItemId: 'MI-W1-TUE-L-ENT1',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Tuesday',
      mealPeriodId: 'MP-LUNCH',
      menuCategory: 'Entrée',
      recipeId: 'RCP-CHICKEN-001',
      dietTypeId: 'DIET-REG',
      portionSize: '4 oz',
      isChoice: false,
      estimatedParticipation: 0.65,
    },
    {
      menuItemId: 'MI-W1-TUE-L-VEG',
      cycleMenuId: 'MENU-WINTER-2026',
      weekNumber: 1,
      dayOfWeek: 'Tuesday',
      mealPeriodId: 'MP-LUNCH',
      menuCategory: 'Vegetable',
      recipeId: 'RCP-GREENBEANS-001',
      dietTypeId: 'DIET-REG',
      portionSize: '1/2 cup',
      isChoice: false,
      estimatedParticipation: 0.60,
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create single-use menus (holidays and special events)
  // ============================================================================
  console.log('Creating single-use menus...');

  await db.insert(singleUseMenus).values([
    {
      singleUseMenuId: 'SUM-VDAY-2026',
      tenantId,
      siteId: mainKitchenId,
      menuName: "Valentine's Day Dinner 2026",
      serviceDate: '2026-02-14',
      scope: 'MealPeriod',
      mealPeriodId: 'MP-DINNER',
      mode: 'Replace',
      occasion: 'Holiday',
      baseCycleMenuId: 'MENU-WINTER-2026',
      targetFoodCostPerMeal: 6.50,
      forecastedCovers: 95,
      status: 'Active',
      createdBy: 'EMP-DIET001',
      createdDate: '2026-01-20',
      approvedBy: 'Sarah Chen, RD',
      approvalDate: '2026-01-25',
      notes: 'Special romantic dinner menu with heart-shaped desserts',
      llmNotes: "Valentine's Day dinner featuring red and pink themed dishes. Heart-shaped presentations where possible. Special dessert with strawberries and chocolate. Expect higher attendance than usual.",
    },
    {
      singleUseMenuId: 'SUM-SUPERBOWL-2026',
      tenantId,
      siteId: mainKitchenId,
      menuName: 'Super Bowl Sunday 2026',
      serviceDate: '2026-02-08',
      scope: 'MealPeriod',
      mealPeriodId: 'MP-DINNER',
      mode: 'Supplement',
      occasion: 'SpecialEvent',
      baseCycleMenuId: 'MENU-WINTER-2026',
      targetFoodCostPerMeal: 5.00,
      forecastedCovers: 85,
      status: 'Active',
      createdBy: 'EMP-CHEF001',
      createdDate: '2026-01-28',
      notes: 'Adding game day favorites alongside regular menu',
      llmNotes: 'Super Bowl party additions to regular dinner. Adding wings, sliders, and nachos. Big screen TV viewing in dining room. Expect casual atmosphere.',
    },
    {
      singleUseMenuId: 'SUM-EASTER-2026',
      tenantId,
      siteId: mainKitchenId,
      menuName: 'Easter Sunday Brunch 2026',
      serviceDate: '2026-04-05',
      scope: 'Day',
      mode: 'Replace',
      occasion: 'Holiday',
      targetFoodCostPerMeal: 7.00,
      forecastedCovers: 120,
      status: 'Draft',
      createdBy: 'EMP-DIET001',
      createdDate: '2026-02-01',
      notes: 'Special Easter brunch replacing regular meals. Family visitors expected.',
      llmNotes: 'Easter celebration with special brunch service from 10am-2pm replacing breakfast and lunch. Ham as centerpiece. Spring vegetables. Families invited. Prepare for 30% more covers than usual.',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create single-use menu items
  // ============================================================================
  console.log('Creating single-use menu items...');

  await db.insert(singleUseMenuItems).values([
    // Valentine's Day Dinner items
    {
      itemId: 'SUMI-VDAY-ENT1',
      singleUseMenuId: 'SUM-VDAY-2026',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Entrée',
      recipeId: 'RCP-CHICKEN-001', // Using existing recipe as placeholder
      dietTypeId: 'DIET-REG',
      portionSize: '6 oz',
      displayName: 'Herb-Crusted Chicken with Rosemary Cream',
      isChoice: true,
      choiceGroup: 'Entrée',
      estimatedParticipation: 0.45,
      notes: 'Garnish with fresh rosemary sprig',
    },
    {
      itemId: 'SUMI-VDAY-STARCH',
      singleUseMenuId: 'SUM-VDAY-2026',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Starch',
      recipeId: 'RCP-POTATO-001',
      dietTypeId: 'DIET-REG',
      portionSize: '1/2 cup',
      displayName: 'Garlic Parmesan Mashed Potatoes',
      isChoice: false,
      estimatedParticipation: 0.80,
    },
    {
      itemId: 'SUMI-VDAY-VEG',
      singleUseMenuId: 'SUM-VDAY-2026',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Vegetable',
      recipeId: 'RCP-GREENBEANS-001',
      dietTypeId: 'DIET-REG',
      portionSize: '1/2 cup',
      displayName: 'Roasted Asparagus with Lemon',
      isChoice: false,
      estimatedParticipation: 0.70,
      notes: 'Tie asparagus in bundles with chive ribbon',
    },
    // Super Bowl additions (Supplement mode - these ADD to cycle menu)
    {
      itemId: 'SUMI-SB-WINGS',
      singleUseMenuId: 'SUM-SUPERBOWL-2026',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Entrée',
      recipeId: 'RCP-CHICKEN-001', // Placeholder
      dietTypeId: 'DIET-REG',
      portionSize: '6 pieces',
      displayName: 'Buffalo Wings',
      isChoice: true,
      choiceGroup: 'Game Day Specials',
      estimatedParticipation: 0.40,
      notes: 'Serve with celery and ranch/blue cheese',
    },
    {
      itemId: 'SUMI-SB-NACHOS',
      singleUseMenuId: 'SUM-SUPERBOWL-2026',
      mealPeriodId: 'MP-DINNER',
      menuCategory: 'Entrée',
      recipeId: 'RCP-MEATLOAF-001', // Placeholder
      dietTypeId: 'DIET-REG',
      portionSize: '1 plate',
      displayName: 'Loaded Nachos',
      isChoice: true,
      choiceGroup: 'Game Day Specials',
      estimatedParticipation: 0.30,
      notes: 'Beef, cheese, jalapeños, sour cream, guacamole',
    },
  ]).onConflictDoNothing();

  // ============================================================================
  // Create production schedules
  // ============================================================================
  console.log('Creating production schedules...');

  const tomorrow = '2026-02-04';
  const dayAfter = '2026-02-05';

  await db.insert(productionSchedules).values([
    {
      scheduleId: 'PROD-2026-0204-001',
      tenantId,
      productionDate: tomorrow,
      siteId: mainKitchenId,
      shift: 'AM',
      mealPeriodId: 'MP-LUNCH',
      recipeId: 'RCP-CHICKEN-001', // Will need to match actual recipe IDs
      forecastedPortions: 85,
      batchMultiplier: 1.5,
      assignedEmployeeId: 'EMP-CHEF001',
      startTimeTarget: '08:00',
      completionTimeTarget: '11:00',
      stationId: 'STN-MAIN-PROD',
      equipmentNeeded: 'Combi oven, sheet pans',
      prepInstructions: 'Season and roast chicken breasts. Hold at 165°F until service.',
      status: 'Scheduled',
    },
    {
      scheduleId: 'PROD-2026-0204-002',
      tenantId,
      productionDate: tomorrow,
      siteId: mainKitchenId,
      shift: 'AM',
      mealPeriodId: 'MP-LUNCH',
      recipeId: 'RCP-POTATO-001', // Will need to match actual recipe IDs
      forecastedPortions: 100,
      batchMultiplier: 2.0,
      assignedEmployeeId: 'EMP-CHEF001',
      startTimeTarget: '09:00',
      completionTimeTarget: '11:00',
      stationId: 'STN-MAIN-PROD',
      equipmentNeeded: 'Steam kettle, mixer',
      prepInstructions: 'Prepare mashed potatoes. Add butter and cream. Season to taste.',
      status: 'Scheduled',
    },
    {
      scheduleId: 'PROD-2026-0204-003',
      tenantId,
      productionDate: tomorrow,
      siteId: mainKitchenId,
      shift: 'AM',
      mealPeriodId: 'MP-DINNER',
      recipeId: 'RCP-MEATLOAF-001',
      forecastedPortions: 70,
      batchMultiplier: 1.2,
      assignedEmployeeId: 'EMP-STAFF001',
      startTimeTarget: '13:00',
      completionTimeTarget: '16:00',
      stationId: 'STN-MAIN-PROD',
      equipmentNeeded: 'Mixer, hotel pans, combi oven',
      prepInstructions: 'Mix ground beef with seasonings. Shape into loaves. Bake until 160°F internal.',
      status: 'Scheduled',
    },
    {
      scheduleId: 'PROD-2026-0205-001',
      tenantId,
      productionDate: dayAfter,
      siteId: mainKitchenId,
      shift: 'AM',
      mealPeriodId: 'MP-BRKFST',
      recipeId: 'RCP-SCRAMBLED-001',
      forecastedPortions: 90,
      batchMultiplier: 1.0,
      assignedEmployeeId: 'EMP-CHEF001',
      startTimeTarget: '05:30',
      completionTimeTarget: '07:00',
      stationId: 'STN-MAIN-PROD',
      equipmentNeeded: 'Tilt skillet',
      prepInstructions: 'Scramble eggs in batches. Hold at 145°F.',
      status: 'Scheduled',
    },
  ]).onConflictDoNothing();

  console.log('\n✅ Development data seeding complete!');
  console.log('\n📋 Summary:');
  console.log('   Tenant:    Sunny Meadows Healthcare (code: SUNNY)');
  console.log('   Sites:     2 (Main Kitchen, East Nursing Wing)');
  console.log('   Stations:  8 (5 at Main, 3 at East Wing)');
  console.log('   Employees: 4 (Manager, Cook, Dietitian, Server)');
  console.log('   Diners:    5 sample residents');
  console.log('   Vendors:   4 (Sysco, US Foods, Produce, Dairy)');
  console.log('   Recipes:   5 standardized recipes');
  console.log('   Cycle Menus: 2 (Winter active, Spring draft)');
  console.log('   Menu Items: 10 sample items for Week 1');
  console.log('   Single-Use Menus: 3 (Valentine\'s, Super Bowl, Easter)');
  console.log('   Inventory: 5 items across both sites');
  console.log('   POs:       3 purchase orders');
  console.log('   Production: 4 scheduled items');
  console.log('\n🔑 To get a dev token, call:');
  console.log('   POST /trpc/auth.devToken');
  console.log('   Body: { "tenantId": "TEN-DEMO001", "role": "admin" }');
  console.log('\n🔐 Or login with:');
  console.log('   POST /trpc/auth.login');
  console.log('   Body: { "tenantCode": "SUNNY", "email": "jane.smith@sunnymeadows.example.com" }');
}

// Run if called directly
seedDevData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });

