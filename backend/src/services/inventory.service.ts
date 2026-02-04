/**
 * Inventory Service
 * 
 * Domain service for inventory management with business logic for:
 * - Stock movements (receive, issue, adjust)
 * - Par level monitoring and alerts
 * - Expiration tracking
 * - Physical inventory reconciliation
 * 
 * The textbook describes the perpetual inventory system: "A running record
 * of the balance on hand for each item in the storeroom."
 */

import { eq, and, sql, desc, lte, lt, gte } from 'drizzle-orm';
import { 
  inventory, 
  receiving, 
  storeroomIssues,
  type Inventory, 
  type Receiving,
  type StoreroomIssue 
} from '../db/schema/inventory.js';
import { ingredients, type Ingredient } from '../db/schema/recipes.js';
import { purchaseOrders, poLineItems } from '../db/schema/procurement.js';
import { sites } from '../db/schema/tenants.js';
import { unitsOfMeasure } from '../db/schema/reference.js';
import { generateId } from '../lib/id.js';
import type { TRPCContext } from '../trpc/context.js';

// ============================================================================
// Types
// ============================================================================

export interface ReceiveDeliveryInput {
  vendorId: string;
  siteId: string;
  poNumber?: string;
  invoiceNumber: string;
  deliveryDate: string;
  deliveryTime: string;
  receivingMethod: 'Invoice Method' | 'Blind Method';
  temperatureCheckPassed: boolean;
  refrigeratedTempF?: number;
  frozenTempF?: number;
  qualityAcceptable: boolean;
  discrepancies?: string;
  discrepancyAction?: 'Accepted' | 'Rejected' | 'Credit Requested' | 'Returned';
  items: ReceiveItemInput[];
  notes?: string;
}

export interface ReceiveItemInput {
  ingredientId: string;
  quantityReceived: number;
  unitOfMeasure: string;
  unitCost: number;
  expirationDate?: string;
  lotNumber?: string;
  poLineItemId?: string;
}

export interface IssueItemsInput {
  fromSiteId: string;
  toSiteId?: string;
  requisitionNumber: string;
  mealDate?: string;
  productionScheduleId?: string;
  items: IssueItemInput[];
}

export interface IssueItemInput {
  ingredientId: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface AdjustInventoryInput {
  ingredientId: string;
  siteId: string;
  newQuantity: number;
  reason: string;
}

export interface PhysicalCountInput {
  siteId: string;
  counts: {
    inventoryId: string;
    countedQuantity: number;
  }[];
}

export interface InventoryAlert {
  type: 'below_par' | 'expiring_soon' | 'expired';
  ingredientId: string;
  ingredientName: string;
  siteId: string;
  siteName: string;
  currentQuantity?: number;
  parLevel?: number;
  expirationDate?: string;
  daysUntilExpiration?: number;
}

export interface InventoryWithDetails extends Inventory {
  ingredient: Ingredient;
  site: { siteName: string };
  unit: { unitAbbreviation: string };
}

// ============================================================================
// Service Class
// ============================================================================

export class InventoryService {
  constructor(private ctx: TRPCContext) {}

  private get tenantId(): string {
    if (!this.ctx.tenant) {
      throw new Error('Tenant context required');
    }
    return this.ctx.tenant.tenantId;
  }

  // --------------------------------------------------------------------------
  // Inventory Queries
  // --------------------------------------------------------------------------

  /**
   * List inventory items with filters
   */
  async list(options: {
    siteId?: string;
    storageLocation?: Inventory['storageLocation'];
    belowPar?: boolean;
    expiringWithinDays?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<InventoryWithDetails[]> {
    const { siteId, storageLocation, belowPar, expiringWithinDays, search, limit = 50, offset = 0 } = options;

    const today = new Date().toISOString().split('T')[0];
    const expirationCutoff = expiringWithinDays 
      ? new Date(Date.now() + expiringWithinDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    const rows = await this.ctx.db
      .select({
        inventory: inventory,
        ingredient: ingredients,
        site: sites,
        unit: unitsOfMeasure,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.ingredientId))
      .innerJoin(sites, eq(inventory.siteId, sites.siteId))
      .innerJoin(unitsOfMeasure, eq(inventory.unitOfMeasure, unitsOfMeasure.unitId))
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          siteId ? eq(inventory.siteId, siteId) : undefined,
          storageLocation ? eq(inventory.storageLocation, storageLocation) : undefined,
          belowPar ? eq(inventory.belowParFlag, true) : undefined,
          expirationCutoff ? lte(inventory.expirationDate, expirationCutoff) : undefined,
          search ? sql`${ingredients.ingredientName} LIKE ${'%' + search + '%'}` : undefined
        )
      )
      .orderBy(ingredients.ingredientName)
      .limit(limit)
      .offset(offset);

    return rows.map(row => ({
      ...row.inventory,
      ingredient: row.ingredient,
      site: { siteName: row.site.siteName },
      unit: { unitAbbreviation: row.unit.unitAbbreviation },
    }));
  }

  /**
   * Get inventory levels for a specific ingredient across all sites
   */
  async getByIngredient(ingredientId: string): Promise<InventoryWithDetails[]> {
    const rows = await this.ctx.db
      .select({
        inventory: inventory,
        ingredient: ingredients,
        site: sites,
        unit: unitsOfMeasure,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.ingredientId))
      .innerJoin(sites, eq(inventory.siteId, sites.siteId))
      .innerJoin(unitsOfMeasure, eq(inventory.unitOfMeasure, unitsOfMeasure.unitId))
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          eq(inventory.ingredientId, ingredientId)
        )
      )
      .orderBy(sites.siteName);

    return rows.map(row => ({
      ...row.inventory,
      ingredient: row.ingredient,
      site: { siteName: row.site.siteName },
      unit: { unitAbbreviation: row.unit.unitAbbreviation },
    }));
  }

  // --------------------------------------------------------------------------
  // Receiving
  // --------------------------------------------------------------------------

  /**
   * Receive a delivery and update inventory
   * 
   * This implements the receiving process: "Physically inspect the delivery,
   * check against purchase order, complete receiving records, transfer goods
   * to appropriate storage."
   */
  async receiveDelivery(input: ReceiveDeliveryInput): Promise<Receiving> {
    const receivingId = generateId('receiving');

    // Create receiving record
    const [receivingRecord] = await this.ctx.db
      .insert(receiving)
      .values({
        receivingId,
        tenantId: this.tenantId,
        poNumber: input.poNumber,
        vendorId: input.vendorId,
        siteId: input.siteId,
        deliveryDate: input.deliveryDate,
        deliveryTime: input.deliveryTime,
        invoiceNumber: input.invoiceNumber,
        receivedBy: this.ctx.user.userId,
        receivingMethod: input.receivingMethod,
        temperatureCheckPassed: input.temperatureCheckPassed,
        refrigeratedTempF: input.refrigeratedTempF,
        frozenTempF: input.frozenTempF,
        qualityAcceptable: input.qualityAcceptable,
        discrepancies: input.discrepancies,
        discrepancyAction: input.discrepancyAction,
        status: 'Received',
        notes: input.notes,
      })
      .returning();

    // Process each received item
    let invoiceTotal = 0;
    for (const item of input.items) {
      invoiceTotal += item.quantityReceived * item.unitCost;
      await this.updateInventoryOnReceive(input.siteId, item);

      // Update PO line item if linked
      if (item.poLineItemId) {
        await this.ctx.db
          .update(poLineItems)
          .set({ 
            quantityReceived: sql`COALESCE(${poLineItems.quantityReceived}, 0) + ${item.quantityReceived}`,
            variance: sql`${poLineItems.quantityOrdered} - (COALESCE(${poLineItems.quantityReceived}, 0) + ${item.quantityReceived})`,
          })
          .where(eq(poLineItems.lineItemId, item.poLineItemId));
      }
    }

    // Update invoice amount
    await this.ctx.db
      .update(receiving)
      .set({ invoiceAmount: invoiceTotal })
      .where(eq(receiving.receivingId, receivingId));

    // Check if PO is fully received
    if (input.poNumber) {
      await this.checkPoComplete(input.poNumber);
    }

    return receivingRecord;
  }

  /**
   * Update inventory when receiving items
   */
  private async updateInventoryOnReceive(siteId: string, item: ReceiveItemInput): Promise<void> {
    // Get ingredient details for storage type
    const [ingredient] = await this.ctx.db
      .select()
      .from(ingredients)
      .where(eq(ingredients.ingredientId, item.ingredientId))
      .limit(1);

    if (!ingredient) {
      throw new Error(`Ingredient ${item.ingredientId} not found`);
    }

    // Map storage type to location
    const storageLocation = this.getDefaultStorageLocation(ingredient.storageType);

    // Check for existing inventory record
    const [existing] = await this.ctx.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          eq(inventory.ingredientId, item.ingredientId),
          eq(inventory.siteId, siteId),
          // Same lot/expiration should update same record
          item.lotNumber ? eq(inventory.lotNumber, item.lotNumber) : undefined
        )
      )
      .limit(1);

    const today = new Date().toISOString().split('T')[0];

    if (existing) {
      // Update existing inventory
      const newQty = existing.quantityOnHand + item.quantityReceived;
      const newValue = newQty * item.unitCost;
      
      await this.ctx.db
        .update(inventory)
        .set({
          quantityOnHand: newQty,
          unitCost: item.unitCost,
          totalValue: newValue,
          lastReceivedDate: today,
          expirationDate: item.expirationDate || existing.expirationDate,
          belowParFlag: ingredient.parLevel ? newQty < ingredient.parLevel : false,
        })
        .where(eq(inventory.inventoryId, existing.inventoryId));
    } else {
      // Create new inventory record
      const newValue = item.quantityReceived * item.unitCost;
      
      await this.ctx.db.insert(inventory).values({
        inventoryId: generateId('inventory'),
        tenantId: this.tenantId,
        ingredientId: item.ingredientId,
        siteId,
        storageLocation,
        quantityOnHand: item.quantityReceived,
        unitOfMeasure: item.unitOfMeasure,
        unitCost: item.unitCost,
        totalValue: newValue,
        lastReceivedDate: today,
        expirationDate: item.expirationDate,
        lotNumber: item.lotNumber,
        belowParFlag: ingredient.parLevel ? item.quantityReceived < ingredient.parLevel : false,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Issuing (Storeroom Requisitions)
  // --------------------------------------------------------------------------

  /**
   * Issue items from storeroom to production
   * 
   * "Items received are recorded from the invoices... Storeroom issues are
   * recorded from the requisitions and subtracted from the balance."
   */
  async issueItems(input: IssueItemsInput): Promise<StoreroomIssue[]> {
    const issues: StoreroomIssue[] = [];

    for (const item of input.items) {
      // Find inventory record with sufficient quantity (FIFO by expiration)
      const [invRecord] = await this.ctx.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.tenantId, this.tenantId),
            eq(inventory.ingredientId, item.ingredientId),
            eq(inventory.siteId, input.fromSiteId),
            gte(inventory.quantityOnHand, item.quantity)
          )
        )
        .orderBy(inventory.expirationDate) // FIFO
        .limit(1);

      if (!invRecord) {
        throw new Error(`Insufficient inventory for ingredient ${item.ingredientId}`);
      }

      // Create issue record
      const extendedCost = item.quantity * (invRecord.unitCost || 0);
      const [issue] = await this.ctx.db
        .insert(storeroomIssues)
        .values({
          issueId: generateId('storeroomIssue'),
          tenantId: this.tenantId,
          requisitionNumber: input.requisitionNumber,
          issueDate: new Date().toISOString().split('T')[0],
          ingredientId: item.ingredientId,
          fromSiteId: input.fromSiteId,
          toSiteId: input.toSiteId,
          quantityIssued: item.quantity,
          unitOfMeasure: item.unitOfMeasure,
          unitCost: invRecord.unitCost,
          extendedCost,
          issuedBy: this.ctx.user.userId,
          productionScheduleId: input.productionScheduleId,
          mealDate: input.mealDate,
        })
        .returning();

      issues.push(issue);

      // Update inventory
      const newQty = invRecord.quantityOnHand - item.quantity;
      await this.ctx.db
        .update(inventory)
        .set({
          quantityOnHand: newQty,
          totalValue: newQty * (invRecord.unitCost || 0),
          belowParFlag: invRecord.unitCost ? newQty < (invRecord.unitCost || 0) : false,
        })
        .where(eq(inventory.inventoryId, invRecord.inventoryId));

      // If transferring to another site, add to that site's inventory
      if (input.toSiteId) {
        await this.updateInventoryOnReceive(input.toSiteId, {
          ingredientId: item.ingredientId,
          quantityReceived: item.quantity,
          unitOfMeasure: item.unitOfMeasure,
          unitCost: invRecord.unitCost || 0,
          expirationDate: invRecord.expirationDate || undefined,
          lotNumber: invRecord.lotNumber || undefined,
        });
      }
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // Physical Inventory & Adjustments
  // --------------------------------------------------------------------------

  /**
   * Record physical inventory counts and calculate variances
   */
  async recordPhysicalCount(input: PhysicalCountInput): Promise<{ 
    processed: number; 
    variances: { inventoryId: string; variance: number }[];
  }> {
    const today = new Date().toISOString().split('T')[0];
    const variances: { inventoryId: string; variance: number }[] = [];

    for (const count of input.counts) {
      const [inv] = await this.ctx.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.inventoryId, count.inventoryId),
            eq(inventory.tenantId, this.tenantId)
          )
        )
        .limit(1);

      if (!inv) continue;

      const variance = count.countedQuantity - inv.quantityOnHand;
      
      await this.ctx.db
        .update(inventory)
        .set({
          quantityOnHand: count.countedQuantity,
          totalValue: count.countedQuantity * (inv.unitCost || 0),
          lastPhysicalCountDate: today,
          lastPhysicalCountQty: count.countedQuantity,
          varianceFromPerpetual: variance,
        })
        .where(eq(inventory.inventoryId, count.inventoryId));

      if (variance !== 0) {
        variances.push({ inventoryId: count.inventoryId, variance });
      }
    }

    return { processed: input.counts.length, variances };
  }

  /**
   * Manual inventory adjustment (with reason tracking)
   */
  async adjustInventory(input: AdjustInventoryInput): Promise<Inventory> {
    const [existing] = await this.ctx.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          eq(inventory.ingredientId, input.ingredientId),
          eq(inventory.siteId, input.siteId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Inventory record not found');
    }

    const variance = input.newQuantity - existing.quantityOnHand;
    
    const [updated] = await this.ctx.db
      .update(inventory)
      .set({
        quantityOnHand: input.newQuantity,
        totalValue: input.newQuantity * (existing.unitCost || 0),
        varianceFromPerpetual: variance,
        notes: `Adjusted: ${input.reason} (was ${existing.quantityOnHand}, now ${input.newQuantity})`,
      })
      .where(eq(inventory.inventoryId, existing.inventoryId))
      .returning();

    return updated;
  }

  // --------------------------------------------------------------------------
  // Alerts & Monitoring
  // --------------------------------------------------------------------------

  /**
   * Get inventory alerts (below par, expiring, expired)
   */
  async getAlerts(siteId?: string): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Below par items
    const belowPar = await this.ctx.db
      .select({
        inventory: inventory,
        ingredient: ingredients,
        site: sites,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.ingredientId))
      .innerJoin(sites, eq(inventory.siteId, sites.siteId))
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          eq(inventory.belowParFlag, true),
          siteId ? eq(inventory.siteId, siteId) : undefined
        )
      );

    for (const row of belowPar) {
      alerts.push({
        type: 'below_par',
        ingredientId: row.ingredient.ingredientId,
        ingredientName: row.ingredient.ingredientName,
        siteId: row.site.siteId,
        siteName: row.site.siteName,
        currentQuantity: row.inventory.quantityOnHand,
        parLevel: row.ingredient.parLevel || undefined,
      });
    }

    // Expiring soon (within 7 days)
    const expiringSoon = await this.ctx.db
      .select({
        inventory: inventory,
        ingredient: ingredients,
        site: sites,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.ingredientId))
      .innerJoin(sites, eq(inventory.siteId, sites.siteId))
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          lte(inventory.expirationDate, sevenDaysOut),
          gte(inventory.expirationDate, today),
          siteId ? eq(inventory.siteId, siteId) : undefined
        )
      );

    for (const row of expiringSoon) {
      const expDate = new Date(row.inventory.expirationDate!);
      const daysUntil = Math.ceil((expDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      alerts.push({
        type: 'expiring_soon',
        ingredientId: row.ingredient.ingredientId,
        ingredientName: row.ingredient.ingredientName,
        siteId: row.site.siteId,
        siteName: row.site.siteName,
        currentQuantity: row.inventory.quantityOnHand,
        expirationDate: row.inventory.expirationDate || undefined,
        daysUntilExpiration: daysUntil,
      });
    }

    // Already expired
    const expired = await this.ctx.db
      .select({
        inventory: inventory,
        ingredient: ingredients,
        site: sites,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.ingredientId))
      .innerJoin(sites, eq(inventory.siteId, sites.siteId))
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          lt(inventory.expirationDate, today),
          siteId ? eq(inventory.siteId, siteId) : undefined
        )
      );

    for (const row of expired) {
      alerts.push({
        type: 'expired',
        ingredientId: row.ingredient.ingredientId,
        ingredientName: row.ingredient.ingredientName,
        siteId: row.site.siteId,
        siteName: row.site.siteName,
        currentQuantity: row.inventory.quantityOnHand,
        expirationDate: row.inventory.expirationDate || undefined,
      });
    }

    return alerts;
  }

  /**
   * Get items that need reordering
   */
  async getReorderList(siteId?: string): Promise<{
    ingredientId: string;
    ingredientName: string;
    siteId: string;
    siteName: string;
    currentQuantity: number;
    parLevel: number;
    reorderPoint: number;
    suggestedQuantity: number;
    preferredVendorId?: string;
  }[]> {
    const rows = await this.ctx.db
      .select({
        inventory: inventory,
        ingredient: ingredients,
        site: sites,
      })
      .from(inventory)
      .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.ingredientId))
      .innerJoin(sites, eq(inventory.siteId, sites.siteId))
      .where(
        and(
          eq(inventory.tenantId, this.tenantId),
          eq(inventory.belowParFlag, true),
          siteId ? eq(inventory.siteId, siteId) : undefined
        )
      )
      .orderBy(ingredients.ingredientName);

    return rows
      .filter(row => row.ingredient.parLevel && row.ingredient.reorderPoint)
      .map(row => ({
        ingredientId: row.ingredient.ingredientId,
        ingredientName: row.ingredient.ingredientName,
        siteId: row.site.siteId,
        siteName: row.site.siteName,
        currentQuantity: row.inventory.quantityOnHand,
        parLevel: row.ingredient.parLevel!,
        reorderPoint: row.ingredient.reorderPoint!,
        suggestedQuantity: row.ingredient.parLevel! - row.inventory.quantityOnHand,
        preferredVendorId: row.ingredient.preferredVendorId || undefined,
      }));
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private getDefaultStorageLocation(storageType: string): Inventory['storageLocation'] {
    switch (storageType) {
      case 'Refrigerated':
        return 'Walk-in Cooler';
      case 'Frozen':
        return 'Walk-in Freezer';
      default:
        return 'Dry Storage';
    }
  }

  private async checkPoComplete(poNumber: string): Promise<void> {
    // Check if all line items are fully received
    const lines = await this.ctx.db
      .select()
      .from(poLineItems)
      .where(eq(poLineItems.poNumber, poNumber));

    const allReceived = lines.every(
      line => (line.quantityReceived || 0) >= line.quantityOrdered
    );

    const partiallyReceived = lines.some(
      line => (line.quantityReceived || 0) > 0
    );

    if (allReceived) {
      await this.ctx.db
        .update(purchaseOrders)
        .set({ status: 'Received', actualDeliveryDate: new Date().toISOString().split('T')[0] })
        .where(eq(purchaseOrders.poNumber, poNumber));
    } else if (partiallyReceived) {
      await this.ctx.db
        .update(purchaseOrders)
        .set({ status: 'Partial' })
        .where(eq(purchaseOrders.poNumber, poNumber));
    }
  }
}

