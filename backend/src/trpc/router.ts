/**
 * Main tRPC App Router
 * 
 * Combines all domain routers into a single app router.
 * This is the single entry point for all tRPC procedures.
 * 
 * The router structure maps to URL paths:
 *   trpc.auth.login       -> POST /trpc/auth.login
 *   trpc.diner.list       -> GET  /trpc/diner.list
 *   trpc.vendor.create    -> POST /trpc/vendor.create
 *   trpc.allergen.list    -> GET  /trpc/allergen.list (public)
 */

import { router } from './index.js';
import { authRouter } from './routers/auth.js';
import { dinerRouter } from './routers/diner.js';
import { recipeRouter } from './routers/recipe.js';
import { inventoryRouter } from './routers/inventory.js';
import { purchaseOrderRouter } from './routers/purchase-order.js';
import { treeRouter } from './routers/tree.js';

// Auto-generated CRUD routers (from entities.ts)
import {
  // Reference (public, read-only for most)
  allergenRouter,
  unitRouter,
  foodCategoryRouter,
  
  // Organization
  siteRouter,
  stationRouter,
  employeeRouter,
  
  // Menu Planning
  mealPeriodRouter,
  dietTypeRouter,
  cycleMenuRouter,
  menuItemRouter,
  
  // Recipes (ingredient uses factory, recipe has custom service)
  ingredientRouter,
  recipeIngredientRouter,
  
  // Procurement (PO has custom service, vendor/specs use factory)
  vendorRouter,
  productSpecRouter,
  poLineItemRouter,
  singleUseMenuRouter,
  singleUseMenuItemRouter,
  
  // Inventory (receiving/issues use factory, main inventory has custom service)
  receivingRouter,
  storeroomIssueRouter,
  
  // Production
  productionScheduleRouter,
  forecastRouter,
  leftoverReportRouter,
} from './routers/entities.js';

/**
 * Main application router
 * 
 * STRUCTURE:
 * - Custom routers: For entities with business logic (auth, diner)
 * - Auto-generated routers: For pure CRUD entities (everything else)
 * 
 * When you add a field to any Drizzle schema, the API automatically
 * updates - no router changes needed!
 */
export const appRouter = router({
  // ============================================================================
  // CUSTOM ROUTERS (with business logic)
  // ============================================================================
  auth: authRouter,
  tree: treeRouter,           // Entity tree for explorer panel
  diner: dinerRouter,         // Has diet change audit trail
  recipe: recipeRouter,       // Has scaling, costing, workflow
  inventory: inventoryRouter, // Has receiving, issuing, alerts
  purchaseOrder: purchaseOrderRouter, // Has line items, workflow
  
  // ============================================================================
  // AUTO-GENERATED CRUD ROUTERS
  // Each provides: list, getById, create, update, delete
  // ============================================================================
  
  // Reference tables (public read access)
  allergen: allergenRouter,
  unit: unitRouter,
  foodCategory: foodCategoryRouter,
  
  // Organization
  site: siteRouter,
  station: stationRouter,
  employee: employeeRouter,
  
  // Menu Planning
  mealPeriod: mealPeriodRouter,
  dietType: dietTypeRouter,
  cycleMenu: cycleMenuRouter,
  menuItem: menuItemRouter,
  singleUseMenu: singleUseMenuRouter,
  singleUseMenuItem: singleUseMenuItemRouter,
  
  // Recipes (recipe has custom router above)
  ingredient: ingredientRouter,
  recipeIngredient: recipeIngredientRouter,
  
  // Procurement (purchaseOrder has custom router above)
  vendor: vendorRouter,
  productSpec: productSpecRouter,
  poLineItem: poLineItemRouter,
  
  // Inventory (main inventory has custom router above)
  receiving: receivingRouter,
  storeroomIssue: storeroomIssueRouter,
  
  // Production
  productionSchedule: productionScheduleRouter,
  forecast: forecastRouter,
  leftoverReport: leftoverReportRouter,
});

/**
 * Export the router type for client-side type inference
 * 
 * The frontend imports this type to get full autocomplete:
 * 
 * ```typescript
 * // frontend/src/utils/trpc.ts
 * import type { AppRouter } from '../../backend/src/trpc/router';
 * import { createTRPCReact } from '@trpc/react-query';
 * 
 * export const trpc = createTRPCReact<AppRouter>();
 * ```
 */
export type AppRouter = typeof appRouter;

