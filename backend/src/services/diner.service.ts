/**
 * Diner Service
 * 
 * Business logic for managing diners that goes beyond simple CRUD.
 * 
 * Simple CRUD operations (getById, update, delete) are handled by the
 * factory in the router. This service only contains:
 * - Create (with initial diet assignment)
 * - Diet change management with audit trail
 * - Custom queries (list with filtering, counts)
 * - Domain operations (discharge)
 */

import { eq, and, isNull, desc } from 'drizzle-orm';
import { 
  diners, 
  dietAssignments, 
  dietTypes,
  sites,
  type Diner, 
  type DietAssignment,
} from '../db/schema/index.js';
import type { ProtectedContext } from '../trpc/index.js';
import { generateId } from '../lib/id.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateDinerInput {
  firstName: string;
  lastName: string;
  siteId: string;
  roomNumber?: string;
  dinerType: 'Patient' | 'Student' | 'Resident' | 'Staff' | 'Visitor';
  admissionDate?: string;
  expectedDischargeDate?: string;
  primaryDietTypeId: string;
  textureModification?: 'Regular' | 'Mechanical Soft' | 'Pureed' | 'Ground';
  liquidConsistency?: 'Regular' | 'Thickened-Nectar' | 'Thickened-Honey' | 'NPO';
  allergies?: string;
  dislikes?: string;
  preferences?: string;
  specialInstructions?: string;
  feedingAssistance?: 'Independent' | 'Setup' | 'Feeding Assist' | 'Tube Fed';
  mealTicketNumber?: string;
  freeReducedStatus?: 'Paid' | 'Free' | 'Reduced';
  physician?: string;
  notes?: string;
}

export interface CreateDietAssignmentInput {
  dinerId: string;
  dietTypeId: string;
  effectiveDate: string;
  orderedBy: string;
  reason?: string;
  textureModification?: 'Regular' | 'Mechanical Soft' | 'Pureed' | 'Ground';
  liquidConsistency?: 'Regular' | 'Thickened-Nectar' | 'Thickened-Honey' | 'NPO';
  additionalRestrictions?: string;
  notes?: string;
}

export interface ListDinersFilter {
  siteId?: string;
  status?: 'Active' | 'Discharged' | 'On Leave';
  dinerType?: 'Patient' | 'Student' | 'Resident' | 'Staff' | 'Visitor';
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class DinerService {
  constructor(private ctx: ProtectedContext) {}

  private get tenantId(): string {
    return this.ctx.tenant.tenantId;
  }

  /**
   * Verify diner exists and belongs to tenant
   * (Internal helper - not exposed as API)
   */
  private async verifyDinerExists(dinerId: string): Promise<Diner> {
    const result = await this.ctx.db
      .select()
      .from(diners)
      .where(and(
        eq(diners.dinerId, dinerId),
        eq(diners.tenantId, this.tenantId)
      ))
      .limit(1);

    if (!result.length) {
      throw new Error(`Diner ${dinerId} not found`);
    }

    return result[0];
  }

  /**
   * List diners with optional filtering
   * 
   * This is custom because the factory list doesn't support
   * filtering by site, status, diner type, or search.
   */
  async list(filter: ListDinersFilter = {}): Promise<Diner[]> {
    const { siteId, status, dinerType, limit = 100, offset = 0 } = filter;

    const conditions = [eq(diners.tenantId, this.tenantId)];
    
    if (siteId) {
      conditions.push(eq(diners.siteId, siteId));
    }
    if (status) {
      conditions.push(eq(diners.status, status));
    }
    if (dinerType) {
      conditions.push(eq(diners.dinerType, dinerType));
    }

    return this.ctx.db
      .select()
      .from(diners)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Create a new diner with initial diet assignment
   * 
   * This is custom because we need to:
   * 1. Validate site belongs to tenant
   * 2. Validate diet type exists
   * 3. Create initial diet assignment for audit trail
   */
  async create(input: CreateDinerInput): Promise<Diner> {
    // Validate site belongs to tenant
    const site = await this.ctx.db
      .select()
      .from(sites)
      .where(and(
        eq(sites.siteId, input.siteId),
        eq(sites.tenantId, this.tenantId)
      ))
      .limit(1);

    if (!site.length) {
      throw new Error(`Site ${input.siteId} not found or doesn't belong to your organization`);
    }

    // Validate diet type exists
    const diet = await this.ctx.db
      .select()
      .from(dietTypes)
      .where(eq(dietTypes.dietTypeId, input.primaryDietTypeId))
      .limit(1);

    if (!diet.length) {
      throw new Error(`Diet type ${input.primaryDietTypeId} not found`);
    }

    const dinerId = generateId('diner');
    const now = new Date().toISOString();

    const [newDiner] = await this.ctx.db
      .insert(diners)
      .values({
        dinerId,
        tenantId: this.tenantId,
        ...input,
        status: 'Active',
      })
      .returning();

    // Create initial diet assignment for audit trail
    await this.ctx.db.insert(dietAssignments).values({
      assignmentId: generateId('dietAssignment'),
      dinerId,
      dietTypeId: input.primaryDietTypeId,
      effectiveDate: input.admissionDate || now.split('T')[0],
      orderedBy: this.ctx.user.email,
      reason: 'Initial admission diet order',
      textureModification: input.textureModification,
      liquidConsistency: input.liquidConsistency,
      createdDate: now,
      createdBy: this.ctx.user.email,
    });

    return newDiner;
  }

  /**
   * Change a diner's diet with proper audit trail
   * 
   * This is the key domain operation - diet changes must:
   * 1. Close the current diet assignment
   * 2. Create a new assignment record
   * 3. Update the diner's primary diet
   */
  async changeDiet(input: CreateDietAssignmentInput): Promise<DietAssignment> {
    const { dinerId, dietTypeId, effectiveDate, orderedBy, reason, ...rest } = input;

    // Verify diner exists and belongs to tenant
    await this.verifyDinerExists(dinerId);

    // Validate diet type exists
    const diet = await this.ctx.db
      .select()
      .from(dietTypes)
      .where(eq(dietTypes.dietTypeId, dietTypeId))
      .limit(1);

    if (!diet.length) {
      throw new Error(`Diet type ${dietTypeId} not found`);
    }

    const now = new Date().toISOString();

    // Close current diet assignment(s)
    await this.ctx.db
      .update(dietAssignments)
      .set({ endDate: effectiveDate })
      .where(and(
        eq(dietAssignments.dinerId, dinerId),
        isNull(dietAssignments.endDate)
      ));

    // Create new diet assignment
    const [newAssignment] = await this.ctx.db
      .insert(dietAssignments)
      .values({
        assignmentId: generateId('dietAssignment'),
        dinerId,
        dietTypeId,
        effectiveDate,
        orderedBy,
        reason,
        ...rest,
        createdDate: now,
        createdBy: this.ctx.user.email,
      })
      .returning();

    // Update diner's primary diet and texture/liquid if provided
    const dinerUpdate: Record<string, string> = {
      primaryDietTypeId: dietTypeId,
    };
    if (rest.textureModification) {
      dinerUpdate.textureModification = rest.textureModification;
    }
    if (rest.liquidConsistency) {
      dinerUpdate.liquidConsistency = rest.liquidConsistency;
    }

    await this.ctx.db
      .update(diners)
      .set(dinerUpdate)
      .where(eq(diners.dinerId, dinerId));

    return newAssignment;
  }

  /**
   * Get diet assignment history for a diner
   */
  async getDietHistory(dinerId: string): Promise<DietAssignment[]> {
    // Verify diner belongs to tenant
    await this.verifyDinerExists(dinerId);

    return this.ctx.db
      .select()
      .from(dietAssignments)
      .where(eq(dietAssignments.dinerId, dinerId))
      .orderBy(desc(dietAssignments.effectiveDate));
  }

  /**
   * Discharge a diner
   * 
   * Domain operation that:
   * 1. Closes any open diet assignments
   * 2. Sets status to 'Discharged'
   */
  async discharge(dinerId: string): Promise<Diner> {
    // Verify diner exists and belongs to tenant
    await this.verifyDinerExists(dinerId);

    const now = new Date().toISOString().split('T')[0];

    // Close any open diet assignments
    await this.ctx.db
      .update(dietAssignments)
      .set({ endDate: now })
      .where(and(
        eq(dietAssignments.dinerId, dinerId),
        isNull(dietAssignments.endDate)
      ));

    // Update diner status
    const [updated] = await this.ctx.db
      .update(diners)
      .set({ status: 'Discharged' })
      .where(and(
        eq(diners.dinerId, dinerId),
        eq(diners.tenantId, this.tenantId)
      ))
      .returning();

    return updated;
  }

  /**
   * Get count of diners by status (for dashboard)
   */
  async getCountsByStatus(): Promise<Record<string, number>> {
    const result = await this.ctx.db
      .select()
      .from(diners)
      .where(eq(diners.tenantId, this.tenantId));

    const counts: Record<string, number> = {
      Active: 0,
      Discharged: 0,
      'On Leave': 0,
      total: result.length,
    };

    for (const diner of result) {
      counts[diner.status] = (counts[diner.status] || 0) + 1;
    }

    return counts;
  }
}

/**
 * Factory function to create a DinerService from tRPC context
 */
export function createDinerService(ctx: ProtectedContext): DinerService {
  return new DinerService(ctx);
}
