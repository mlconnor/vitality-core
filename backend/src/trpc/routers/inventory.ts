/**
 * Inventory Router
 * 
 * tRPC router for inventory management operations.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../index.js';
import { InventoryService } from '../../services/inventory.service.js';

// Schemas
const storageLocationSchema = z.enum([
  'Dry Storage', 'Walk-in Cooler', 'Walk-in Freezer',
  'Reach-in Cooler', 'Reach-in Freezer'
]);

const discrepancyActionSchema = z.enum([
  'Accepted', 'Rejected', 'Credit Requested', 'Returned'
]);

const receiveItemSchema = z.object({
  ingredientId: z.string(),
  quantityReceived: z.number().positive(),
  unitOfMeasure: z.string(),
  unitCost: z.number().min(0),
  expirationDate: z.string().optional(),
  lotNumber: z.string().optional(),
  poLineItemId: z.string().optional(),
});

const issueItemSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unitOfMeasure: z.string(),
});

export const inventoryRouter = router({
  // --------------------------------------------------------------------------
  // Inventory Queries
  // --------------------------------------------------------------------------

  /**
   * List inventory items with filters
   */
  list: protectedProcedure
    .input(z.object({
      siteId: z.string().optional(),
      storageLocation: storageLocationSchema.optional(),
      belowPar: z.boolean().optional(),
      expiringWithinDays: z.number().int().positive().optional(),
      search: z.string().optional(),
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.list(input ?? {});
    }),

  /**
   * Get inventory levels for a specific ingredient across sites
   */
  getByIngredient: protectedProcedure
    .input(z.object({ ingredientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.getByIngredient(input.ingredientId);
    }),

  // --------------------------------------------------------------------------
  // Receiving
  // --------------------------------------------------------------------------

  /**
   * Receive a delivery and update inventory
   */
  receiveDelivery: protectedProcedure
    .input(z.object({
      vendorId: z.string(),
      siteId: z.string(),
      poNumber: z.string().optional(),
      invoiceNumber: z.string(),
      deliveryDate: z.string(),
      deliveryTime: z.string(),
      receivingMethod: z.enum(['Invoice Method', 'Blind Method']),
      temperatureCheckPassed: z.boolean(),
      refrigeratedTempF: z.number().optional(),
      frozenTempF: z.number().optional(),
      qualityAcceptable: z.boolean(),
      discrepancies: z.string().optional(),
      discrepancyAction: discrepancyActionSchema.optional(),
      items: z.array(receiveItemSchema).min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.receiveDelivery(input);
    }),

  // --------------------------------------------------------------------------
  // Issuing (Storeroom Requisitions)
  // --------------------------------------------------------------------------

  /**
   * Issue items from storeroom to production
   */
  issueItems: protectedProcedure
    .input(z.object({
      fromSiteId: z.string(),
      toSiteId: z.string().optional(),
      requisitionNumber: z.string(),
      mealDate: z.string().optional(),
      productionScheduleId: z.string().optional(),
      items: z.array(issueItemSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.issueItems(input);
    }),

  // --------------------------------------------------------------------------
  // Physical Inventory & Adjustments
  // --------------------------------------------------------------------------

  /**
   * Record physical inventory counts
   */
  recordPhysicalCount: protectedProcedure
    .input(z.object({
      siteId: z.string(),
      counts: z.array(z.object({
        inventoryId: z.string(),
        countedQuantity: z.number().min(0),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.recordPhysicalCount(input);
    }),

  /**
   * Manual inventory adjustment
   */
  adjust: protectedProcedure
    .input(z.object({
      ingredientId: z.string(),
      siteId: z.string(),
      newQuantity: z.number().min(0),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.adjustInventory(input);
    }),

  // --------------------------------------------------------------------------
  // Alerts & Monitoring
  // --------------------------------------------------------------------------

  /**
   * Get inventory alerts (below par, expiring, expired)
   */
  getAlerts: protectedProcedure
    .input(z.object({ siteId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.getAlerts(input?.siteId);
    }),

  /**
   * Get items that need reordering
   */
  getReorderList: protectedProcedure
    .input(z.object({ siteId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const service = new InventoryService(ctx);
      return service.getReorderList(input?.siteId);
    }),
});

