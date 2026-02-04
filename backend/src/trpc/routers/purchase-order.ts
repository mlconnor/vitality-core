/**
 * Purchase Order Router
 * 
 * tRPC router for procurement operations.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../index.js';
import { PurchaseOrderService } from '../../services/purchase-order.service.js';

// Schemas
const poStatusSchema = z.enum(['Draft', 'Submitted', 'Confirmed', 'Partial', 'Received', 'Cancelled']);

const createLineItemSchema = z.object({
  ingredientId: z.string(),
  specId: z.string().optional(),
  quantityOrdered: z.number().positive(),
  unitOfMeasure: z.string(),
  unitPrice: z.number().min(0),
  notes: z.string().optional(),
});

const updateLineItemSchema = z.object({
  quantityOrdered: z.number().positive().optional(),
  unitPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const purchaseOrderRouter = router({
  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * List purchase orders with filters
   */
  list: protectedProcedure
    .input(z.object({
      vendorId: z.string().optional(),
      siteId: z.string().optional(),
      status: poStatusSchema.optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.list(input ?? {});
    }),

  /**
   * Get purchase order with full details
   */
  getById: protectedProcedure
    .input(z.object({ poNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.getById(input.poNumber);
    }),

  /**
   * Get pending orders for a vendor
   */
  getPendingByVendor: protectedProcedure
    .input(z.object({ vendorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.getPendingByVendor(input.vendorId);
    }),

  // --------------------------------------------------------------------------
  // Create & Modify
  // --------------------------------------------------------------------------

  /**
   * Create new purchase order with line items
   */
  create: protectedProcedure
    .input(z.object({
      vendorId: z.string(),
      siteId: z.string(),
      requestedDeliveryDate: z.string(),
      paymentTerms: z.string().optional(),
      deliveryInstructions: z.string().optional(),
      notes: z.string().optional(),
      lineItems: z.array(createLineItemSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.create(input);
    }),

  /**
   * Add line item to draft PO
   */
  addLineItem: protectedProcedure
    .input(z.object({
      poNumber: z.string(),
      lineItem: createLineItemSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.addLineItem(input.poNumber, input.lineItem);
    }),

  /**
   * Update line item
   */
  updateLineItem: protectedProcedure
    .input(z.object({
      lineItemId: z.string(),
      data: updateLineItemSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.updateLineItem(input.lineItemId, input.data);
    }),

  /**
   * Remove line item
   */
  removeLineItem: protectedProcedure
    .input(z.object({ lineItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      await service.removeLineItem(input.lineItemId);
      return { success: true };
    }),

  // --------------------------------------------------------------------------
  // Workflow
  // --------------------------------------------------------------------------

  /**
   * Submit PO to vendor
   */
  submit: protectedProcedure
    .input(z.object({ poNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.submit(input.poNumber);
    }),

  /**
   * Mark PO as confirmed by vendor
   */
  confirm: protectedProcedure
    .input(z.object({ poNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.confirm(input.poNumber);
    }),

  /**
   * Cancel PO
   */
  cancel: protectedProcedure
    .input(z.object({
      poNumber: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.cancel(input.poNumber, input.reason);
    }),

  // --------------------------------------------------------------------------
  // Auto-Generation
  // --------------------------------------------------------------------------

  /**
   * Generate PO from reorder list
   */
  generateFromReorderList: protectedProcedure
    .input(z.object({
      vendorId: z.string(),
      siteId: z.string(),
      requestedDeliveryDate: z.string(),
      items: z.array(z.object({
        ingredientId: z.string(),
        quantity: z.number().positive(),
        unitOfMeasure: z.string(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new PurchaseOrderService(ctx);
      return service.generateFromReorderList(input);
    }),
});

