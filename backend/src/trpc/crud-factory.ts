/**
 * Generic CRUD Router Factory
 * 
 * Creates standard CRUD operations for any Drizzle table with ZERO boilerplate.
 * 
 * BEFORE (per entity):
 *   - 100+ lines of Zod schemas
 *   - 200+ lines of service methods
 *   - 150+ lines of router procedures
 *   = ~450 lines per entity × 30 entities = 13,500 lines
 * 
 * AFTER (per entity):
 *   - 10-20 lines of configuration
 *   = ~500 lines total for all 30 entities
 * 
 * The Drizzle schema IS the source of truth. Period.
 */

import { z } from 'zod';
import { eq, and, or, isNull, type SQL, getTableColumns } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
import { router, protectedProcedure, publicProcedure } from './index.js';
import { generateId, type IdPrefix } from '../lib/id.js';

/**
 * Configuration for a CRUD router
 */
export interface CrudConfig<TTable extends SQLiteTableWithColumns<any>> {
  /** The Drizzle table */
  table: TTable;
  
  /** ID field name (e.g., 'dinerId', 'recipeId') */
  idField: keyof TTable['$inferSelect'];
  
  /** ID prefix for generation (e.g., 'diner', 'recipe') */
  idPrefix: IdPrefix;
  
  /** Tenant field name if tenant-scoped (null for universal tables) */
  tenantField?: keyof TTable['$inferSelect'] | null;
  
  /** 
   * Tenant mode:
   * - 'required': All records must have tenantId (operational data)
   * - 'optional': Records can be system-wide (tenantId=null) or tenant-specific
   * - 'none': Universal data, no tenant filtering
   */
  tenantMode: 'required' | 'optional' | 'none';
  
  /** Fields to omit from create/update inputs (auto-managed) */
  omitFields?: (keyof TTable['$inferInsert'])[];
  
  /** Make it public (no auth required) - use for reference tables */
  public?: boolean;
  
  /** Custom hooks for business logic */
  hooks?: {
    beforeCreate?: (data: any, ctx: any) => Promise<any> | any;
    afterCreate?: (record: any, ctx: any) => Promise<void> | void;
    beforeUpdate?: (id: string, data: any, ctx: any) => Promise<any> | any;
    afterUpdate?: (record: any, ctx: any) => Promise<void> | void;
    beforeDelete?: (id: string, ctx: any) => Promise<void> | void;
    afterDelete?: (id: string, ctx: any) => Promise<void> | void;
  };
}

/**
 * Result type for createCrudRouter - includes both the router and individual procedures
 */
export interface CrudRouterResult<TTable extends SQLiteTableWithColumns<any>> {
  /** The complete router with all CRUD procedures */
  router: ReturnType<typeof router>;
  /** Individual procedures for cherry-picking */
  procedures: {
    list: any;
    getById: any;
    create: any;
    update: any;
    delete: any;
    bulkCreate: any;
    bulkDelete: any;
  };
  /** The generated schemas (useful for custom procedures) */
  schemas: {
    insert: any;
    update: any;
  };
}

/**
 * Create a complete CRUD router for any Drizzle table
 * 
 * Returns both the full router AND individual procedures, so you can:
 * - Use the full router for simple entities
 * - Cherry-pick procedures for entities that need custom operations
 * 
 * @example
 * // For a simple reference table (public, no tenant)
 * const { router: allergenRouter } = createCrudRouter({
 *   table: allergens,
 *   idField: 'allergenId',
 *   idPrefix: 'allergen',
 *   tenantMode: 'none',
 *   public: true,
 * });
 * 
 * @example
 * // Cherry-pick procedures for entities with custom operations
 * const { procedures: baseCrud } = createCrudRouter({
 *   table: diners,
 *   idField: 'dinerId',
 *   idPrefix: 'diner',
 *   tenantMode: 'required',
 *   omitFields: ['primaryDietTypeId', 'textureModification', 'liquidConsistency'],
 * });
 * 
 * export const dinerRouter = router({
 *   // Factory procedures
 *   getById: baseCrud.getById,
 *   update: baseCrud.update,
 *   delete: baseCrud.delete,
 *   
 *   // Custom procedures
 *   list: protectedProcedure.input(...).query(...),
 *   create: protectedProcedure.input(...).mutation(...),
 *   changeDiet: protectedProcedure.input(...).mutation(...),
 * });
 */
export function createCrudRouter<TTable extends SQLiteTableWithColumns<any>>(
  config: CrudConfig<TTable>
): CrudRouterResult<TTable> {
  const {
    table,
    idField,
    idPrefix,
    tenantField = 'tenantId' as any,
    tenantMode,
    omitFields = [],
    public: isPublic = false,
    hooks = {},
  } = config;

  // Auto-generate Zod schemas from Drizzle table
  // This gives us full validation derived from the DB schema!
  const baseInsertSchema = createInsertSchema(table);
  
  // Get actual column names from the table to know what we CAN omit
  const tableColumns = Object.keys(getTableColumns(table));
  
  // Only omit fields that actually exist in this table
  const fieldsToOmit = [idField, tenantField, ...omitFields]
    .filter((field): field is string => 
      field != null && tableColumns.includes(field as string)
    );
  
  // Build omit object only for fields that exist
  const omitObj: Record<string, true> = {};
  for (const field of fieldsToOmit) {
    omitObj[field] = true;
  }
  
  // Create insert schema with auto-managed fields removed
  const insertSchema = Object.keys(omitObj).length > 0 
    ? (baseInsertSchema as any).omit(omitObj)
    : baseInsertSchema;
    
  const updateSchema = insertSchema.partial();

  // Choose procedure type based on public flag
  const procedure = isPublic ? publicProcedure : protectedProcedure;

  // Build individual procedures so they can be cherry-picked
  const list = procedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { limit = 100, offset = 0 } = input || {};
      
      let query = ctx.db.select().from(table);
      
      // Apply tenant filtering based on mode
      if (tenantMode === 'required' && tenantField) {
        query = query.where(eq((table as any)[tenantField], ctx.tenant!.tenantId)) as any;
      } else if (tenantMode === 'optional' && tenantField) {
        // Show system-wide (null) + tenant-specific
        query = query.where(
          or(
            isNull((table as any)[tenantField]),
            eq((table as any)[tenantField], ctx.tenant?.tenantId)
          )
        ) as any;
      }
      // tenantMode === 'none' - no filtering
      
      return query.limit(limit).offset(offset);
    });

  const getById = procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conditions: SQL[] = [eq((table as any)[idField], input.id)];
      
      // Add tenant check for required/optional modes
      if (tenantMode === 'required' && tenantField) {
        conditions.push(eq((table as any)[tenantField], ctx.tenant!.tenantId));
      } else if (tenantMode === 'optional' && tenantField) {
        conditions.push(
          or(
            isNull((table as any)[tenantField]),
            eq((table as any)[tenantField], ctx.tenant?.tenantId)
          )!
        );
      }
      
      const result = await ctx.db
        .select()
        .from(table)
        .where(and(...conditions))
        .limit(1);
      
      return result[0] || null;
    });

  const create = procedure
    .input(insertSchema)
    .mutation(async ({ ctx, input }) => {
      let data = { ...(input as Record<string, unknown>) } as any;
      
      // Run beforeCreate hook
      if (hooks.beforeCreate) {
        data = await hooks.beforeCreate(data, ctx);
      }
      
      // Add auto-managed fields
      data[idField] = generateId(idPrefix);
      if (tenantField && tenantMode !== 'none') {
        data[tenantField] = ctx.tenant?.tenantId || null;
      }
      
      const [record] = await ctx.db.insert(table).values(data).returning();
      
      // Run afterCreate hook
      if (hooks.afterCreate) {
        await hooks.afterCreate(record, ctx);
      }
      
      return record;
    });

  const update = procedure
    .input(z.object({
      id: z.string(),
      data: updateSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      let data = { ...input.data } as any;
      
      // Run beforeUpdate hook
      if (hooks.beforeUpdate) {
        data = await hooks.beforeUpdate(input.id, data, ctx);
      }
      
      const conditions: SQL[] = [eq((table as any)[idField], input.id)];
      
      // Add tenant check
      if (tenantMode === 'required' && tenantField) {
        conditions.push(eq((table as any)[tenantField], ctx.tenant!.tenantId));
      }
      
      const [record] = await ctx.db
        .update(table)
        .set(data)
        .where(and(...conditions))
        .returning();
      
      if (!record) {
        throw new Error('Record not found or access denied');
      }
      
      // Run afterUpdate hook
      if (hooks.afterUpdate) {
        await hooks.afterUpdate(record, ctx);
      }
      
      return record;
    });

  const del = procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Run beforeDelete hook
      if (hooks.beforeDelete) {
        await hooks.beforeDelete(input.id, ctx);
      }
      
      const conditions: SQL[] = [eq((table as any)[idField], input.id)];
      
      if (tenantMode === 'required' && tenantField) {
        conditions.push(eq((table as any)[tenantField], ctx.tenant!.tenantId));
      }
      
      const [deleted] = await ctx.db
        .delete(table)
        .where(and(...conditions))
        .returning();
      
      if (!deleted) {
        throw new Error('Record not found or access denied');
      }
      
      // Run afterDelete hook
      if (hooks.afterDelete) {
        await hooks.afterDelete(input.id, ctx);
      }
      
      return { success: true, id: input.id };
    });

  const bulkCreate = procedure
      .input(z.object({
        rows: z.array(z.record(z.string(), z.any())).min(1).max(500),
        options: z.object({
          stopOnError: z.boolean().default(false),
          skipInvalidRows: z.boolean().default(true),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { rows, options } = input;
        const { stopOnError = false, skipInvalidRows = true } = options ?? {};
        
        const results: { row: number; success: boolean; id?: string; error?: string }[] = [];
        let successful = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 1;

          try {
            // Validate against the insert schema
            const parseResult = insertSchema.safeParse(row);
            if (!parseResult.success) {
              const errors = parseResult.error.issues.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; ');
              
              if (stopOnError) throw new Error(errors);
              if (!skipInvalidRows) throw new Error(`Row ${rowNum}: ${errors}`);
              
              results.push({ row: rowNum, success: false, error: errors });
              failed++;
              continue;
            }

            let data = { ...parseResult.data } as any;
            
            // Run beforeCreate hook if exists
            if (hooks.beforeCreate) {
              data = await hooks.beforeCreate(data, ctx);
            }
            
            // Add auto-managed fields
            data[idField] = generateId(idPrefix);
            if (tenantField && tenantMode !== 'none') {
              data[tenantField] = ctx.tenant?.tenantId || null;
            }
            
            const [record] = await ctx.db.insert(table).values(data).returning();
            
            // Run afterCreate hook if exists
            if (hooks.afterCreate) {
              await hooks.afterCreate(record, ctx);
            }
            
            results.push({ row: rowNum, success: true, id: (record as any)[idField] });
            successful++;
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.push({ row: rowNum, success: false, error: errorMessage });
            failed++;
            
            if (stopOnError) {
              return { total: rows.length, successful, failed, results };
            }
          }
        }

        return { total: rows.length, successful, failed, results };
      });

  const bulkDelete = procedure
      .input(z.object({
        ids: z.array(z.string()).min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { id: string; success: boolean; error?: string }[] = [];
        let successful = 0;
        let failed = 0;

        for (const id of input.ids) {
          try {
            const conditions: SQL[] = [eq((table as any)[idField], id)];
            
            if (tenantMode === 'required' && tenantField) {
              conditions.push(eq((table as any)[tenantField], ctx.tenant!.tenantId));
            }
            
            const [deleted] = await ctx.db
              .delete(table)
              .where(and(...conditions))
              .returning();
            
            if (deleted) {
              results.push({ id, success: true });
              successful++;
            } else {
              results.push({ id, success: false, error: 'Not found or access denied' });
              failed++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.push({ id, success: false, error: errorMessage });
            failed++;
          }
        }

        return { total: input.ids.length, successful, failed, results };
      });

  // Build the complete router
  const crudRouter = router({
    list,
    getById,
    create,
    update,
    delete: del,
    bulkCreate,
    bulkDelete,
  });

  // Return both the router and individual procedures for flexibility
  return {
    router: crudRouter,
    procedures: {
      list,
      getById,
      create,
      update,
      delete: del,
      bulkCreate,
      bulkDelete,
    },
    schemas: {
      insert: insertSchema,
      update: updateSchema,
    },
  };
}

/**
 * Type helper to extract the router type
 */
export type CrudRouter<TTable extends SQLiteTableWithColumns<any>> = ReturnType<typeof createCrudRouter<TTable>>['router'];

