/**
 * Purchase Order Service
 * 
 * Domain service for procurement management with business logic for:
 * - PO creation with line items
 * - Status workflow (Draft → Submitted → Confirmed → Received)
 * - Auto-generation from reorder lists
 * - Vendor performance tracking
 * 
 * "Good purchasing practices include systematic ordering schedules, adequate 
 * flow of goods, and systematic receiving procedures with inventory control."
 */

import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { 
  purchaseOrders, 
  poLineItems, 
  vendors,
  productSpecifications,
  type PurchaseOrder, 
  type PoLineItem,
  type Vendor 
} from '../db/schema/procurement.js';
import { ingredients, type Ingredient } from '../db/schema/recipes.js';
import { sites } from '../db/schema/tenants.js';
import { unitsOfMeasure } from '../db/schema/reference.js';
import { generateId } from '../lib/id.js';
import type { TRPCContext } from '../trpc/context.js';

// ============================================================================
// Types
// ============================================================================

export interface CreatePurchaseOrderInput {
  vendorId: string;
  siteId: string;
  requestedDeliveryDate: string;
  paymentTerms?: string;
  deliveryInstructions?: string;
  notes?: string;
  lineItems: CreateLineItemInput[];
}

export interface CreateLineItemInput {
  ingredientId: string;
  specId?: string;
  quantityOrdered: number;
  unitOfMeasure: string;
  unitPrice: number;
  notes?: string;
}

export interface UpdateLineItemInput {
  quantityOrdered?: number;
  unitPrice?: number;
  notes?: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  vendor: Vendor;
  site: { siteName: string };
  lineItems: (PoLineItem & { 
    ingredient: Ingredient;
    unit: { unitAbbreviation: string };
  })[];
}

export interface GeneratePOInput {
  vendorId: string;
  siteId: string;
  requestedDeliveryDate: string;
  items: {
    ingredientId: string;
    quantity: number;
    unitOfMeasure: string;
  }[];
}

// ============================================================================
// Service Class
// ============================================================================

export class PurchaseOrderService {
  constructor(private ctx: TRPCContext) {}

  private get tenantId(): string {
    if (!this.ctx.tenant) {
      throw new Error('Tenant context required');
    }
    return this.ctx.tenant.tenantId;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * List purchase orders with filters
   */
  async list(options: {
    vendorId?: string;
    siteId?: string;
    status?: PurchaseOrder['status'];
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PurchaseOrder[]> {
    const { vendorId, siteId, status, fromDate, toDate, limit = 50, offset = 0 } = options;

    return this.ctx.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, this.tenantId),
          vendorId ? eq(purchaseOrders.vendorId, vendorId) : undefined,
          siteId ? eq(purchaseOrders.siteId, siteId) : undefined,
          status ? eq(purchaseOrders.status, status) : undefined,
          fromDate ? sql`${purchaseOrders.orderDate} >= ${fromDate}` : undefined,
          toDate ? sql`${purchaseOrders.orderDate} <= ${toDate}` : undefined
        )
      )
      .orderBy(desc(purchaseOrders.orderDate))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get purchase order with full details
   */
  async getById(poNumber: string): Promise<PurchaseOrderWithDetails | null> {
    const [po] = await this.ctx.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.poNumber, poNumber),
          eq(purchaseOrders.tenantId, this.tenantId)
        )
      )
      .limit(1);

    if (!po) return null;

    // Get vendor
    const [vendor] = await this.ctx.db
      .select()
      .from(vendors)
      .where(eq(vendors.vendorId, po.vendorId))
      .limit(1);

    // Get site
    const [site] = await this.ctx.db
      .select()
      .from(sites)
      .where(eq(sites.siteId, po.siteId))
      .limit(1);

    // Get line items with details
    const lineItemRows = await this.ctx.db
      .select({
        lineItem: poLineItems,
        ingredient: ingredients,
        unit: unitsOfMeasure,
      })
      .from(poLineItems)
      .innerJoin(ingredients, eq(poLineItems.ingredientId, ingredients.ingredientId))
      .innerJoin(unitsOfMeasure, eq(poLineItems.unitOfMeasure, unitsOfMeasure.unitId))
      .where(eq(poLineItems.poNumber, poNumber));

    const lineItems = lineItemRows.map(row => ({
      ...row.lineItem,
      ingredient: row.ingredient,
      unit: { unitAbbreviation: row.unit.unitAbbreviation },
    }));

    return {
      ...po,
      vendor,
      site: { siteName: site.siteName },
      lineItems,
    };
  }

  // --------------------------------------------------------------------------
  // Create & Modify
  // --------------------------------------------------------------------------

  /**
   * Create a new purchase order with line items
   */
  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderWithDetails> {
    // Validate vendor belongs to tenant
    const [vendor] = await this.ctx.db
      .select()
      .from(vendors)
      .where(
        and(
          eq(vendors.vendorId, input.vendorId),
          eq(vendors.tenantId, this.tenantId)
        )
      )
      .limit(1);

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Validate site belongs to tenant
    const [site] = await this.ctx.db
      .select()
      .from(sites)
      .where(
        and(
          eq(sites.siteId, input.siteId),
          eq(sites.tenantId, this.tenantId)
        )
      )
      .limit(1);

    if (!site) {
      throw new Error('Site not found');
    }

    const poNumber = generateId('purchaseOrder');
    const orderDate = new Date().toISOString().split('T')[0];

    // Calculate totals
    const subtotal = input.lineItems.reduce(
      (sum, item) => sum + (item.quantityOrdered * item.unitPrice), 
      0
    );

    // Create PO header
    const [newPO] = await this.ctx.db
      .insert(purchaseOrders)
      .values({
        poNumber,
        tenantId: this.tenantId,
        vendorId: input.vendorId,
        siteId: input.siteId,
        orderDate,
        requestedDeliveryDate: input.requestedDeliveryDate,
        orderedBy: this.ctx.user.email,
        subtotal,
        total: subtotal, // Tax/shipping added later
        paymentTerms: input.paymentTerms || vendor.paymentTerms,
        deliveryInstructions: input.deliveryInstructions,
        status: 'Draft',
        notes: input.notes,
      })
      .returning();

    // Create line items
    for (const item of input.lineItems) {
      await this.ctx.db.insert(poLineItems).values({
        lineItemId: generateId('poLineItem'),
        poNumber,
        ingredientId: item.ingredientId,
        specId: item.specId,
        quantityOrdered: item.quantityOrdered,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        extendedPrice: item.quantityOrdered * item.unitPrice,
        notes: item.notes,
      });
    }

    return this.getById(poNumber) as Promise<PurchaseOrderWithDetails>;
  }

  /**
   * Add line item to existing draft PO
   */
  async addLineItem(poNumber: string, input: CreateLineItemInput): Promise<PoLineItem> {
    await this.verifyPOEditable(poNumber);

    const [newLine] = await this.ctx.db
      .insert(poLineItems)
      .values({
        lineItemId: generateId('poLineItem'),
        poNumber,
        ingredientId: input.ingredientId,
        specId: input.specId,
        quantityOrdered: input.quantityOrdered,
        unitOfMeasure: input.unitOfMeasure,
        unitPrice: input.unitPrice,
        extendedPrice: input.quantityOrdered * input.unitPrice,
        notes: input.notes,
      })
      .returning();

    await this.recalculateTotals(poNumber);
    return newLine;
  }

  /**
   * Update line item quantity or price
   */
  async updateLineItem(lineItemId: string, input: UpdateLineItemInput): Promise<PoLineItem> {
    const [existing] = await this.ctx.db
      .select()
      .from(poLineItems)
      .where(eq(poLineItems.lineItemId, lineItemId))
      .limit(1);

    if (!existing) {
      throw new Error('Line item not found');
    }

    await this.verifyPOEditable(existing.poNumber);

    const quantity = input.quantityOrdered ?? existing.quantityOrdered;
    const price = input.unitPrice ?? existing.unitPrice;

    const [updated] = await this.ctx.db
      .update(poLineItems)
      .set({
        ...input,
        extendedPrice: quantity * price,
      })
      .where(eq(poLineItems.lineItemId, lineItemId))
      .returning();

    await this.recalculateTotals(existing.poNumber);
    return updated;
  }

  /**
   * Remove line item
   */
  async removeLineItem(lineItemId: string): Promise<void> {
    const [existing] = await this.ctx.db
      .select()
      .from(poLineItems)
      .where(eq(poLineItems.lineItemId, lineItemId))
      .limit(1);

    if (!existing) return;

    await this.verifyPOEditable(existing.poNumber);

    await this.ctx.db
      .delete(poLineItems)
      .where(eq(poLineItems.lineItemId, lineItemId));

    await this.recalculateTotals(existing.poNumber);
  }

  // --------------------------------------------------------------------------
  // Workflow
  // --------------------------------------------------------------------------

  /**
   * Submit PO to vendor (Draft → Submitted)
   */
  async submit(poNumber: string): Promise<PurchaseOrder> {
    const po = await this.verifyPOExists(poNumber);

    if (po.status !== 'Draft') {
      throw new Error('Can only submit Draft orders');
    }

    // Verify has line items
    const lines = await this.ctx.db
      .select()
      .from(poLineItems)
      .where(eq(poLineItems.poNumber, poNumber))
      .limit(1);

    if (!lines.length) {
      throw new Error('Cannot submit PO with no line items');
    }

    const [updated] = await this.ctx.db
      .update(purchaseOrders)
      .set({ status: 'Submitted' })
      .where(eq(purchaseOrders.poNumber, poNumber))
      .returning();

    return updated;
  }

  /**
   * Mark as confirmed by vendor (Submitted → Confirmed)
   */
  async confirm(poNumber: string): Promise<PurchaseOrder> {
    const po = await this.verifyPOExists(poNumber);

    if (po.status !== 'Submitted') {
      throw new Error('Can only confirm Submitted orders');
    }

    const [updated] = await this.ctx.db
      .update(purchaseOrders)
      .set({ status: 'Confirmed' })
      .where(eq(purchaseOrders.poNumber, poNumber))
      .returning();

    return updated;
  }

  /**
   * Cancel PO (any status except Received)
   */
  async cancel(poNumber: string, reason?: string): Promise<PurchaseOrder> {
    const po = await this.verifyPOExists(poNumber);

    if (po.status === 'Received') {
      throw new Error('Cannot cancel Received orders');
    }

    const [updated] = await this.ctx.db
      .update(purchaseOrders)
      .set({ 
        status: 'Cancelled',
        notes: reason ? `${po.notes || ''}\n\nCancelled: ${reason}`.trim() : po.notes,
      })
      .where(eq(purchaseOrders.poNumber, poNumber))
      .returning();

    return updated;
  }

  // --------------------------------------------------------------------------
  // Auto-Generation
  // --------------------------------------------------------------------------

  /**
   * Generate PO from reorder list
   * 
   * Groups items by preferred vendor and creates draft POs
   */
  async generateFromReorderList(input: GeneratePOInput): Promise<PurchaseOrderWithDetails> {
    // Get ingredient details and pricing
    const ingredientIds = input.items.map(i => i.ingredientId);
    const ingredientRows = await this.ctx.db
      .select()
      .from(ingredients)
      .where(inArray(ingredients.ingredientId, ingredientIds));

    const ingredientMap = new Map(ingredientRows.map(i => [i.ingredientId, i]));

    // Build line items with pricing
    const lineItems: CreateLineItemInput[] = input.items.map(item => {
      const ing = ingredientMap.get(item.ingredientId);
      return {
        ingredientId: item.ingredientId,
        quantityOrdered: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: ing?.purchaseUnitCost || 0,
      };
    });

    return this.create({
      vendorId: input.vendorId,
      siteId: input.siteId,
      requestedDeliveryDate: input.requestedDeliveryDate,
      lineItems,
    });
  }

  /**
   * Get pending orders for a vendor (for vendor portal)
   */
  async getPendingByVendor(vendorId: string): Promise<PurchaseOrder[]> {
    return this.ctx.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, this.tenantId),
          eq(purchaseOrders.vendorId, vendorId),
          inArray(purchaseOrders.status, ['Submitted', 'Confirmed'])
        )
      )
      .orderBy(purchaseOrders.requestedDeliveryDate);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async verifyPOExists(poNumber: string): Promise<PurchaseOrder> {
    const [po] = await this.ctx.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.poNumber, poNumber),
          eq(purchaseOrders.tenantId, this.tenantId)
        )
      )
      .limit(1);

    if (!po) {
      throw new Error('Purchase order not found');
    }

    return po;
  }

  private async verifyPOEditable(poNumber: string): Promise<void> {
    const po = await this.verifyPOExists(poNumber);

    if (po.status !== 'Draft') {
      throw new Error('Can only edit Draft orders');
    }
  }

  private async recalculateTotals(poNumber: string): Promise<void> {
    const lines = await this.ctx.db
      .select()
      .from(poLineItems)
      .where(eq(poLineItems.poNumber, poNumber));

    const subtotal = lines.reduce((sum: number, line) => sum + line.extendedPrice, 0);

    await this.ctx.db
      .update(purchaseOrders)
      .set({ subtotal, total: subtotal })
      .where(eq(purchaseOrders.poNumber, poNumber));
  }
}

