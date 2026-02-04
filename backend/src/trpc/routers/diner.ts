/**
 * Diner tRPC Router
 * 
 * Hybrid router that combines:
 * - Factory procedures for simple CRUD (getById, update, delete)
 * - Custom procedures for rich filtering (list) and business logic (create, changeDiet, etc.)
 * 
 * IMPORTANT: Diet-related fields are OMITTED from factory update.
 * Diet changes must go through changeDiet() to maintain audit trail.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../index.js';
import { createCrudRouter } from '../crud-factory.js';
import { diners } from '../../db/schema/index.js';
import { createDinerService } from '../../services/diner.service.js';

// ============================================================================
// FACTORY CRUD (for simple operations)
// ============================================================================

/**
 * Base CRUD with diet fields omitted from update schema.
 * 
 * Users CANNOT change these fields via update:
 * - primaryDietTypeId
 * - textureModification  
 * - liquidConsistency
 * 
 * To change diet, use changeDiet() which maintains audit trail.
 */
const { procedures: baseCrud } = createCrudRouter({
  table: diners,
  idField: 'dinerId',
  idPrefix: 'diner',
  tenantField: 'tenantId',
  tenantMode: 'required',
  // Omit diet fields from update - diet changes must go through changeDiet()
  omitFields: [
    'primaryDietTypeId',
    'textureModification',
    'liquidConsistency',
  ],
});

// ============================================================================
// CUSTOM SCHEMAS (for domain operations)
// ============================================================================

const dinerTypeEnum = z.enum(['Patient', 'Student', 'Resident', 'Staff', 'Visitor']);
const statusEnum = z.enum(['Active', 'Discharged', 'On Leave']);
const textureEnum = z.enum(['Regular', 'Mechanical Soft', 'Pureed', 'Ground']);
const liquidEnum = z.enum(['Regular', 'Thickened-Nectar', 'Thickened-Honey', 'NPO']);
const feedingEnum = z.enum(['Independent', 'Setup', 'Feeding Assist', 'Tube Fed']);
const freeReducedEnum = z.enum(['Paid', 'Free', 'Reduced']);

const createDinerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  siteId: z.string().min(1, 'Site is required'),
  roomNumber: z.string().optional(),
  dinerType: dinerTypeEnum,
  admissionDate: z.string().optional(),
  expectedDischargeDate: z.string().optional(),
  primaryDietTypeId: z.string().min(1, 'Diet type is required'),
  textureModification: textureEnum.optional(),
  liquidConsistency: liquidEnum.optional(),
  allergies: z.string().optional(),
  dislikes: z.string().optional(),
  preferences: z.string().optional(),
  specialInstructions: z.string().optional(),
  feedingAssistance: feedingEnum.optional(),
  mealTicketNumber: z.string().optional(),
  freeReducedStatus: freeReducedEnum.optional(),
  physician: z.string().optional(),
  notes: z.string().optional(),
});

const listDinersSchema = z.object({
  siteId: z.string().optional(),
  status: statusEnum.optional(),
  dinerType: dinerTypeEnum.optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(500).default(100),
  offset: z.number().min(0).default(0),
});

const changeDietSchema = z.object({
  dinerId: z.string().min(1, 'Diner ID is required'),
  dietTypeId: z.string().min(1, 'Diet type is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  orderedBy: z.string().min(1, 'Ordered by is required'),
  reason: z.string().optional(),
  textureModification: textureEnum.optional(),
  liquidConsistency: liquidEnum.optional(),
  additionalRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// DINER ROUTER
// ============================================================================

export const dinerRouter = router({
  // -------------------------------------------------------------------------
  // FROM FACTORY (simple CRUD)
  // -------------------------------------------------------------------------
  
  /** Get a single diner by ID */
  getById: baseCrud.getById,
  
  /** Update diner (diet fields excluded - use changeDiet) */
  update: baseCrud.update,
  
  /** Delete a diner */
  delete: baseCrud.delete,
  
  /** Bulk create diners */
  bulkCreate: baseCrud.bulkCreate,
  
  /** Bulk delete diners */
  bulkDelete: baseCrud.bulkDelete,

  // -------------------------------------------------------------------------
  // CUSTOM (rich filtering / business logic)
  // -------------------------------------------------------------------------

  /**
   * List diners with rich filtering
   * 
   * Supports filtering by site, status, diner type, and search.
   * The factory list only supports limit/offset.
   */
  list: protectedProcedure
    .input(listDinersSchema)
    .query(async ({ ctx, input }) => {
      const service = createDinerService(ctx);
      return service.list(input);
    }),

  /**
   * Create a new diner with initial diet assignment
   * 
   * Unlike factory create, this also:
   * - Validates site belongs to tenant
   * - Validates diet type exists
   * - Creates initial diet assignment for audit trail
   */
  create: protectedProcedure
    .input(createDinerSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createDinerService(ctx);
      return service.create(input);
    }),

  /**
   * Change a diner's diet order
   * 
   * This is a key operation that:
   * - Closes the current diet assignment
   * - Creates a new assignment with audit trail
   * - Updates the diner's primary diet
   */
  changeDiet: protectedProcedure
    .input(changeDietSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createDinerService(ctx);
      return service.changeDiet(input);
    }),

  /**
   * Get diet assignment history for a diner
   */
  getDietHistory: protectedProcedure
    .input(z.object({ dinerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = createDinerService(ctx);
      return service.getDietHistory(input.dinerId);
    }),

  /**
   * Discharge a diner
   * 
   * This:
   * - Closes all open diet assignments
   * - Sets status to 'Discharged'
   */
  discharge: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = createDinerService(ctx);
      return service.discharge(input.id);
    }),

  /**
   * Get diner counts by status (for dashboards)
   */
  getCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const service = createDinerService(ctx);
      return service.getCountsByStatus();
    }),
});

// Export the router type for client-side inference
export type DinerRouter = typeof dinerRouter;
