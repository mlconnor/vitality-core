/**
 * Auto-Generated CRUD Routers for All Entities
 * 
 * This single file replaces ~10,000+ lines of boilerplate.
 * 
 * Each entity is defined in ~5-10 lines. When you add/change a field
 * in your Drizzle schema, the API automatically updates - no other
 * changes needed!
 * 
 * For entities with ACTUAL business logic (like Diners with diet
 * change audit trails), use custom services instead.
 */

import { createCrudRouter } from '../crud-factory.js';
import {
  // Reference tables (universal, no tenant)
  allergens,
  unitsOfMeasure,
  foodCategories,
  foodCompositionSources,
  
  // Menu planning (optional tenant)
  mealPeriods,
  dietTypes,
  
  // Organization (required tenant)
  tenants,
  sites,
  stations,
  employees,
  
  // Procurement (required tenant)
  vendors,
  productSpecifications,
  purchaseOrders,
  poLineItems,
  singleUseMenus,
  singleUseMenuItems,
  
  // Inventory (required tenant)
  receiving,
  inventory,
  storeroomIssues,
  
  // Recipes (optional tenant - can be system-wide)
  ingredients,
  recipes,
  recipeIngredients,
  
  // Menu (required tenant)
  cycleMenus,
  menuItems,
  
  // Production (required tenant)
  productionSchedules,
  forecasts,
  leftoverReports,
} from '../../db/schema/index.js';

// ============================================================================
// REFERENCE TABLES (Universal - no tenant, public read)
// These are read-only for most users, admin-only writes
// ============================================================================

export const allergenRouter = createCrudRouter({
  table: allergens,
  idField: 'allergenId',
  idPrefix: 'ingredient', // Using existing prefix for simplicity
  tenantMode: 'none',
  public: true,
}).router;

export const unitRouter = createCrudRouter({
  table: unitsOfMeasure,
  idField: 'unitId',
  idPrefix: 'ingredient',
  tenantMode: 'none',
  public: true,
}).router;

export const foodCategoryRouter = createCrudRouter({
  table: foodCategories,
  idField: 'categoryId',
  idPrefix: 'ingredient',
  tenantMode: 'none',
  public: true,
}).router;

// ============================================================================
// ORGANIZATION (Required tenant)
// ============================================================================

export const siteRouter = createCrudRouter({
  table: sites,
  idField: 'siteId',
  idPrefix: 'site',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

export const stationRouter = createCrudRouter({
  table: stations,
  idField: 'stationId',
  idPrefix: 'station',
  tenantMode: 'none', // Stations link to sites, not directly to tenant
}).router;

export const employeeRouter = createCrudRouter({
  table: employees,
  idField: 'employeeId',
  idPrefix: 'employee',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

// ============================================================================
// MENU PLANNING (Optional tenant - system-wide + tenant-specific)
// ============================================================================

export const mealPeriodRouter = createCrudRouter({
  table: mealPeriods,
  idField: 'mealPeriodId',
  idPrefix: 'mealPeriod',
  tenantField: 'tenantId',
  tenantMode: 'optional',
}).router;

export const dietTypeRouter = createCrudRouter({
  table: dietTypes,
  idField: 'dietTypeId',
  idPrefix: 'dietType',
  tenantField: 'tenantId',
  tenantMode: 'optional',
}).router;

export const cycleMenuRouter = createCrudRouter({
  table: cycleMenus,
  idField: 'cycleMenuId',
  idPrefix: 'cycleMenu',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

export const menuItemRouter = createCrudRouter({
  table: menuItems,
  idField: 'menuItemId',
  idPrefix: 'menuItem',
  tenantMode: 'none', // Links to cycleMenu which has tenant
}).router;

// ============================================================================
// RECIPES (Optional tenant - system recipes + tenant-specific)
// ============================================================================

export const ingredientRouter = createCrudRouter({
  table: ingredients,
  idField: 'ingredientId',
  idPrefix: 'ingredient',
  tenantField: 'tenantId',
  tenantMode: 'optional',
}).router;

// NOTE: recipeRouter is a custom router in routers/recipe.ts
// It has business logic for scaling, costing, workflow

export const recipeIngredientRouter = createCrudRouter({
  table: recipeIngredients,
  idField: 'recipeIngredientId',
  idPrefix: 'recipeIngredient',
  tenantMode: 'none', // Links to recipe which has tenant
}).router;

// ============================================================================
// PROCUREMENT (Required tenant)
// ============================================================================

export const vendorRouter = createCrudRouter({
  table: vendors,
  idField: 'vendorId',
  idPrefix: 'vendor',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

export const productSpecRouter = createCrudRouter({
  table: productSpecifications,
  idField: 'specId',
  idPrefix: 'productSpec',
  tenantField: 'tenantId',
  tenantMode: 'optional',
}).router;

// NOTE: purchaseOrderRouter is a custom router in routers/purchase-order.ts
// It has business logic for line items, workflow, auto-generation

export const poLineItemRouter = createCrudRouter({
  table: poLineItems,
  idField: 'lineItemId',
  idPrefix: 'poLineItem',
  tenantMode: 'none', // Links to PO which has tenant
}).router;

// ============================================================================
// SINGLE-USE MENUS (Required tenant)
// ============================================================================

export const singleUseMenuRouter = createCrudRouter({
  table: singleUseMenus,
  idField: 'singleUseMenuId',
  idPrefix: 'singleUseMenu',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

export const singleUseMenuItemRouter = createCrudRouter({
  table: singleUseMenuItems,
  idField: 'itemId',
  idPrefix: 'singleUseMenuItem',
  tenantMode: 'none', // Links to singleUseMenu which has tenant
}).router;

// ============================================================================
// INVENTORY (Required tenant)
// ============================================================================

export const receivingRouter = createCrudRouter({
  table: receiving,
  idField: 'receivingId',
  idPrefix: 'receiving',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

// NOTE: inventoryRouter is a custom router in routers/inventory.ts
// It has business logic for receiving, issuing, alerts, physical counts

export const storeroomIssueRouter = createCrudRouter({
  table: storeroomIssues,
  idField: 'issueId',
  idPrefix: 'storeroomIssue',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

// ============================================================================
// PRODUCTION (Required tenant)
// ============================================================================

export const productionScheduleRouter = createCrudRouter({
  table: productionSchedules,
  idField: 'scheduleId',
  idPrefix: 'productionSchedule',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

export const forecastRouter = createCrudRouter({
  table: forecasts,
  idField: 'forecastId',
  idPrefix: 'forecast',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

export const leftoverReportRouter = createCrudRouter({
  table: leftoverReports,
  idField: 'leftoverId',
  idPrefix: 'leftoverReport',
  tenantField: 'tenantId',
  tenantMode: 'required',
}).router;

