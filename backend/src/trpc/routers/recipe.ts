/**
 * Recipe Router
 * 
 * tRPC router for recipe management operations.
 */

import { z } from 'zod';
import { and, eq, inArray, isNull, not } from 'drizzle-orm';
import { router, protectedProcedure } from '../index.js';
import { RecipeService } from '../../services/recipe.service.js';
import { recipes } from '../../db/schema/recipes.js';

// Schema for recipe categories
const recipeCategorySchema = z.enum([
  'Entrée', 'Starch', 'Vegetable', 'Salad', 'Soup', 'Bread',
  'Dessert', 'Sauce', 'Beverage', 'Breakfast', 'Appetizer', 'Condiment'
]);

const cuisineTypeSchema = z.enum([
  'American', 'Mexican', 'Asian', 'Italian', 'Mediterranean',
  'Indian', 'French', 'Southern', 'Cajun', 'Caribbean',
  'Middle Eastern', 'Other'
]).nullable();

const cookingMethodSchema = z.enum([
  'Bake', 'Roast', 'Grill', 'Steam', 'Sauté', 'Braise',
  'Fry', 'Deep Fry', 'Simmer', 'Boil', 'Poach', 'No-Cook'
]).nullable();

const recipeStatusSchema = z.enum(['Active', 'Draft', 'Archived', 'Seasonal']);

// Input schemas
const createRecipeSchema = z.object({
  recipeName: z.string().min(1).max(200),
  recipeCode: z.string().max(50).optional(),
  category: recipeCategorySchema,
  cuisineType: cuisineTypeSchema.optional(),
  yieldQuantity: z.number().positive(),
  yieldUnit: z.string(),
  portionSize: z.string(),
  portionUtensil: z.string().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
  cookTimeMinutes: z.number().int().positive().optional(),
  cookingTempF: z.number().int().positive().optional(),
  cookingMethod: cookingMethodSchema.optional(),
  equipmentRequired: z.string().optional(),
  panSize: z.string().optional(),
  pansPerBatch: z.number().int().positive().optional(),
  weightPerPan: z.string().optional(),
  haccpCriticalLimits: z.string().optional(),
  holdTempF: z.number().int().optional(),
  maxHoldTimeHours: z.number().positive().optional(),
  variations: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

const updateRecipeSchema = createRecipeSchema.partial();

const recipeIngredientSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unitId: z.string(),
  isApOrEp: z.enum(['AP', 'EP']).optional(),
  prepInstruction: z.string().optional(),
  sequenceOrder: z.number().int().optional(),
  isOptional: z.boolean().optional(),
  ingredientGroup: z.string().optional(),
  notes: z.string().optional(),
});

export const recipeRouter = router({
  // --------------------------------------------------------------------------
  // Basic CRUD
  // --------------------------------------------------------------------------

  /**
   * List recipes (system-wide + tenant-specific)
   */
  list: protectedProcedure
    .input(z.object({
      category: recipeCategorySchema.optional(),
      status: recipeStatusSchema.optional(),
      search: z.string().optional(),
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.list(input ?? {});
    }),

  /**
   * Get recipe with full ingredient details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.getById(input.id);
    }),

  /**
   * Create new recipe
   */
  create: protectedProcedure
    .input(createRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.create(input);
    }),

  /**
   * Update recipe
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateRecipeSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.update(input.id, input.data);
    }),

  /**
   * Delete a recipe (tenant-owned only; cannot delete system recipes)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenant?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      // Only allow deleting tenant-specific recipes owned by this tenant
      const deleted = await ctx.db
        .delete(recipes)
        .where(
          and(
            eq(recipes.recipeId, input.id),
            not(isNull(recipes.tenantId)),
            eq(recipes.tenantId, tenantId)
          )
        )
        .returning();

      if (!deleted[0]) {
        throw new Error('Recipe not found or access denied');
      }

      return { success: true, id: input.id };
    }),

  /**
   * Bulk delete recipes (tenant-owned only; cannot delete system recipes)
   */
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenant?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      const deleted = await ctx.db
        .delete(recipes)
        .where(
          and(
            inArray(recipes.recipeId, input.ids),
            not(isNull(recipes.tenantId)),
            eq(recipes.tenantId, tenantId)
          )
        )
        .returning({ recipeId: recipes.recipeId });

      return { success: true, deletedIds: deleted.map(d => d.recipeId) };
    }),

  // --------------------------------------------------------------------------
  // Ingredient Management
  // --------------------------------------------------------------------------

  /**
   * Add ingredient to recipe
   */
  addIngredient: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      ingredient: recipeIngredientSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.addIngredient(input.recipeId, input.ingredient);
    }),

  /**
   * Update ingredient in recipe
   */
  updateIngredient: protectedProcedure
    .input(z.object({
      recipeIngredientId: z.string(),
      data: recipeIngredientSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.updateIngredient(input.recipeIngredientId, input.data);
    }),

  /**
   * Remove ingredient from recipe
   */
  removeIngredient: protectedProcedure
    .input(z.object({ recipeIngredientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      await service.removeIngredient(input.recipeIngredientId);
      return { success: true };
    }),

  // --------------------------------------------------------------------------
  // Recipe Scaling & Costing
  // --------------------------------------------------------------------------

  /**
   * Scale recipe to target yield
   */
  scale: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      targetYield: z.number().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.scaleRecipe(input.recipeId, input.targetYield);
    }),

  /**
   * Calculate recipe cost breakdown
   */
  calculateCost: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.calculateCost(input.recipeId);
    }),

  // --------------------------------------------------------------------------
  // Workflow Operations
  // --------------------------------------------------------------------------

  /**
   * Mark recipe as standardized (tested and approved)
   */
  standardize: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.standardize(input.recipeId);
    }),

  /**
   * Archive a recipe
   */
  archive: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.archive(input.recipeId);
    }),

  /**
   * Clone a recipe for modification
   */
  clone: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      newName: z.string().min(1).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new RecipeService(ctx);
      return service.clone(input.recipeId, input.newName);
    }),
});

