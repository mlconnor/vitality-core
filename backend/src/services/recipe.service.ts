/**
 * Recipe Service
 * 
 * Domain service for recipe management with business logic for:
 * - Recipe costing (ingredient cost rollup)
 * - Scaling (adjust yields while maintaining ratios)
 * - Nutrition calculation (aggregate from ingredients)
 * - Diet compatibility analysis
 * 
 * As the textbook states: "A recipe is standardized when it has been tested
 * and adapted to the requirements of the specific facility."
 */

import { eq, and, sql, desc, isNull, or } from 'drizzle-orm';
import { 
  recipes, 
  recipeIngredients, 
  ingredients,
  type Recipe, 
  type RecipeIngredient,
  type Ingredient 
} from '../db/schema/recipes.js';
import { unitsOfMeasure } from '../db/schema/reference.js';
import { generateId } from '../lib/id.js';
import type { TRPCContext } from '../trpc/context.js';

// ============================================================================
// Types
// ============================================================================

export interface CreateRecipeInput {
  recipeName: string;
  recipeCode?: string;
  category: Recipe['category'];
  cuisineType?: Recipe['cuisineType'];
  yieldQuantity: number;
  yieldUnit: string;
  portionSize: string;
  portionUtensil?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  cookingTempF?: number;
  cookingMethod?: Recipe['cookingMethod'];
  equipmentRequired?: string;
  panSize?: string;
  pansPerBatch?: number;
  weightPerPan?: string;
  haccpCriticalLimits?: string;
  holdTempF?: number;
  maxHoldTimeHours?: number;
  variations?: string;
  source?: string;
  notes?: string;
}

export interface RecipeIngredientInput {
  ingredientId: string;
  quantity: number;
  unitId: string;
  isApOrEp?: 'AP' | 'EP';
  prepInstruction?: string;
  sequenceOrder?: number;
  isOptional?: boolean;
  ingredientGroup?: string;
  notes?: string;
}

export interface ScaledRecipe {
  originalYield: number;
  targetYield: number;
  scaleFactor: number;
  ingredients: ScaledIngredient[];
}

export interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  originalQuantity: number;
  scaledQuantity: number;
  unitId: string;
  unitAbbreviation: string;
  prepInstruction?: string;
  ingredientGroup?: string;
  estimatedCost?: number;
}

export interface RecipeCost {
  recipeId: string;
  recipeName: string;
  totalCost: number;
  costPerPortion: number;
  yield: number;
  ingredientCosts: IngredientCostLine[];
  costingDate: string;
}

export interface IngredientCostLine {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitId: string;
  unitCost: number;
  lineCost: number;
  yieldAdjusted: boolean;
}

export interface RecipeNutrition {
  recipeId: string;
  recipeName: string;
  perPortion: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    sodiumMg: number;
    fiberG: number;
  };
  allergens: string[];
  suitableForDiets: string[];
}

export interface RecipeWithDetails extends Recipe {
  ingredients: (RecipeIngredient & { 
    ingredient: Ingredient;
    unit: { unitAbbreviation: string };
  })[];
}

// ============================================================================
// Service Class
// ============================================================================

export class RecipeService {
  constructor(private ctx: TRPCContext) {}

  private get tenantId(): string {
    if (!this.ctx.tenant) {
      throw new Error('Tenant context required');
    }
    return this.ctx.tenant.tenantId;
  }

  // --------------------------------------------------------------------------
  // Basic CRUD (with tenant-aware queries)
  // --------------------------------------------------------------------------

  /**
   * List recipes accessible to tenant (system-wide + tenant-specific)
   */
  async list(options: {
    category?: Recipe['category'];
    status?: Recipe['status'];
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Recipe[]> {
    const { category, status, search, limit = 50, offset = 0 } = options;

    let query = this.ctx.db
      .select()
      .from(recipes)
      .where(
        and(
          // System-wide (null tenant) OR tenant-specific
          or(
            isNull(recipes.tenantId),
            eq(recipes.tenantId, this.tenantId)
          ),
          category ? eq(recipes.category, category) : undefined,
          status ? eq(recipes.status, status) : undefined,
          search ? sql`${recipes.recipeName} LIKE ${'%' + search + '%'}` : undefined
        )
      )
      .orderBy(recipes.recipeName)
      .limit(limit)
      .offset(offset);

    return query;
  }

  /**
   * Get recipe by ID with full ingredient details
   */
  async getById(recipeId: string): Promise<RecipeWithDetails | null> {
    const [recipe] = await this.ctx.db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.recipeId, recipeId),
          or(
            isNull(recipes.tenantId),
            eq(recipes.tenantId, this.tenantId)
          )
        )
      )
      .limit(1);

    if (!recipe) return null;

    // Get ingredients with their details
    const ingredientRows = await this.ctx.db
      .select({
        recipeIngredient: recipeIngredients,
        ingredient: ingredients,
        unit: unitsOfMeasure,
      })
      .from(recipeIngredients)
      .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.ingredientId))
      .innerJoin(unitsOfMeasure, eq(recipeIngredients.unitId, unitsOfMeasure.unitId))
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(recipeIngredients.sequenceOrder);

    const recipeIngredientsList = ingredientRows.map((row: typeof ingredientRows[number]) => ({
      ...row.recipeIngredient,
      ingredient: row.ingredient,
      unit: { unitAbbreviation: row.unit.unitAbbreviation },
    }));

    return {
      ...recipe,
      ingredients: recipeIngredientsList,
    };
  }

  /**
   * Create a new recipe (tenant-specific)
   */
  async create(input: CreateRecipeInput): Promise<Recipe> {
    const recipeId = generateId('recipe');

    const [newRecipe] = await this.ctx.db
      .insert(recipes)
      .values({
        recipeId,
        tenantId: this.tenantId,
        ...input,
        status: 'Draft',
        dateStandardized: null,
      })
      .returning();

    return newRecipe;
  }

  /**
   * Update recipe details
   */
  async update(recipeId: string, input: Partial<CreateRecipeInput>): Promise<Recipe> {
    // Verify ownership (can only update tenant-specific recipes)
    await this.verifyRecipeOwnership(recipeId);

    const [updated] = await this.ctx.db
      .update(recipes)
      .set(input)
      .where(eq(recipes.recipeId, recipeId))
      .returning();

    return updated;
  }

  // --------------------------------------------------------------------------
  // Ingredient Management
  // --------------------------------------------------------------------------

  /**
   * Add ingredient to recipe
   */
  async addIngredient(recipeId: string, input: RecipeIngredientInput): Promise<RecipeIngredient> {
    await this.verifyRecipeOwnership(recipeId);

    // Get current max sequence
    const maxSeq = await this.ctx.db
      .select({ max: sql<number>`MAX(${recipeIngredients.sequenceOrder})` })
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));

    const nextSeq = (maxSeq[0]?.max || 0) + 1;

    const [newIngredient] = await this.ctx.db
      .insert(recipeIngredients)
      .values({
        recipeIngredientId: generateId('recipeIngredient'),
        recipeId,
        sequenceOrder: input.sequenceOrder ?? nextSeq,
        isApOrEp: input.isApOrEp ?? 'EP',
        isOptional: input.isOptional ?? false,
        ...input,
      })
      .returning();

    // Recalculate cost after ingredient change
    await this.recalculateCost(recipeId);

    return newIngredient;
  }

  /**
   * Update ingredient quantity or details
   */
  async updateIngredient(
    recipeIngredientId: string, 
    input: Partial<RecipeIngredientInput>
  ): Promise<RecipeIngredient> {
    // Get the recipe ID first
    const [existing] = await this.ctx.db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeIngredientId, recipeIngredientId))
      .limit(1);

    if (!existing) {
      throw new Error('Recipe ingredient not found');
    }

    await this.verifyRecipeOwnership(existing.recipeId);

    const [updated] = await this.ctx.db
      .update(recipeIngredients)
      .set(input)
      .where(eq(recipeIngredients.recipeIngredientId, recipeIngredientId))
      .returning();

    // Recalculate cost
    await this.recalculateCost(existing.recipeId);

    return updated;
  }

  /**
   * Remove ingredient from recipe
   */
  async removeIngredient(recipeIngredientId: string): Promise<void> {
    const [existing] = await this.ctx.db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeIngredientId, recipeIngredientId))
      .limit(1);

    if (!existing) return;

    await this.verifyRecipeOwnership(existing.recipeId);

    await this.ctx.db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.recipeIngredientId, recipeIngredientId));

    // Recalculate cost
    await this.recalculateCost(existing.recipeId);
  }

  // --------------------------------------------------------------------------
  // Recipe Scaling
  // --------------------------------------------------------------------------

  /**
   * Scale recipe to target yield
   * 
   * The textbook emphasizes proper scaling: "Recipes may be adjusted to 
   * produce either larger or smaller yields using a recipe adjustment factor."
   */
  async scaleRecipe(recipeId: string, targetYield: number): Promise<ScaledRecipe> {
    const recipe = await this.getById(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const scaleFactor = targetYield / recipe.yieldQuantity;

    const scaledIngredients: ScaledIngredient[] = recipe.ingredients.map(ri => {
      const scaledQty = ri.quantity * scaleFactor;
      
      // Calculate cost if available
      let estimatedCost: number | undefined;
      if (ri.ingredient.costPerUnit) {
        // Adjust for yield if AP measurement
        const effectiveQty = ri.isApOrEp === 'AP' && ri.ingredient.yieldPercent
          ? scaledQty / ri.ingredient.yieldPercent
          : scaledQty;
        estimatedCost = effectiveQty * ri.ingredient.costPerUnit;
      }

      return {
        ingredientId: ri.ingredientId,
        ingredientName: ri.ingredient.ingredientName,
        originalQuantity: ri.quantity,
        scaledQuantity: scaledQty,
        unitId: ri.unitId,
        unitAbbreviation: ri.unit.unitAbbreviation,
        prepInstruction: ri.prepInstruction ?? undefined,
        ingredientGroup: ri.ingredientGroup ?? undefined,
        estimatedCost,
      };
    });

    return {
      originalYield: recipe.yieldQuantity,
      targetYield,
      scaleFactor,
      ingredients: scaledIngredients,
    };
  }

  // --------------------------------------------------------------------------
  // Recipe Costing
  // --------------------------------------------------------------------------

  /**
   * Calculate full recipe cost breakdown
   * 
   * "The raw food cost is found by costing the standardized recipe for each
   * menu item." - from textbook
   */
  async calculateCost(recipeId: string): Promise<RecipeCost> {
    const recipe = await this.getById(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const ingredientCosts: IngredientCostLine[] = [];
    let totalCost = 0;

    for (const ri of recipe.ingredients) {
      const unitCost = ri.ingredient.costPerUnit || 0;
      let effectiveQty = ri.quantity;
      let yieldAdjusted = false;

      // If measured as AP, adjust for yield loss
      if (ri.isApOrEp === 'AP' && ri.ingredient.yieldPercent) {
        effectiveQty = ri.quantity / ri.ingredient.yieldPercent;
        yieldAdjusted = true;
      }

      const lineCost = effectiveQty * unitCost;
      totalCost += lineCost;

      ingredientCosts.push({
        ingredientId: ri.ingredientId,
        ingredientName: ri.ingredient.ingredientName,
        quantity: ri.quantity,
        unitId: ri.unitId,
        unitCost,
        lineCost,
        yieldAdjusted,
      });
    }

    const costPerPortion = recipe.yieldQuantity > 0 
      ? totalCost / recipe.yieldQuantity 
      : 0;

    return {
      recipeId,
      recipeName: recipe.recipeName,
      totalCost,
      costPerPortion,
      yield: recipe.yieldQuantity,
      ingredientCosts,
      costingDate: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Recalculate and update stored cost on recipe
   */
  private async recalculateCost(recipeId: string): Promise<void> {
    try {
      const cost = await this.calculateCost(recipeId);
      
      await this.ctx.db
        .update(recipes)
        .set({ foodCostPerPortion: cost.costPerPortion })
        .where(eq(recipes.recipeId, recipeId));
    } catch {
      // Cost calculation may fail if ingredients don't have costs
      // That's OK - leave the stored cost as-is
    }
  }

  // --------------------------------------------------------------------------
  // Standardization Workflow
  // --------------------------------------------------------------------------

  /**
   * Mark recipe as standardized (tested and approved)
   */
  async standardize(recipeId: string): Promise<Recipe> {
    await this.verifyRecipeOwnership(recipeId);

    const [updated] = await this.ctx.db
      .update(recipes)
      .set({
        status: 'Active',
        dateStandardized: new Date().toISOString().split('T')[0],
      })
      .where(eq(recipes.recipeId, recipeId))
      .returning();

    return updated;
  }

  /**
   * Archive a recipe (soft delete)
   */
  async archive(recipeId: string): Promise<Recipe> {
    await this.verifyRecipeOwnership(recipeId);

    const [updated] = await this.ctx.db
      .update(recipes)
      .set({ status: 'Archived' })
      .where(eq(recipes.recipeId, recipeId))
      .returning();

    return updated;
  }

  /**
   * Clone a recipe (create copy for modification)
   */
  async clone(recipeId: string, newName: string): Promise<Recipe> {
    const original = await this.getById(recipeId);
    if (!original) {
      throw new Error('Recipe not found');
    }

    // Create new recipe
    const newRecipeId = generateId('recipe');
    const [newRecipe] = await this.ctx.db
      .insert(recipes)
      .values({
        recipeId: newRecipeId,
        tenantId: this.tenantId,
        recipeName: newName,
        recipeCode: null, // New code needed
        category: original.category,
        cuisineType: original.cuisineType,
        yieldQuantity: original.yieldQuantity,
        yieldUnit: original.yieldUnit,
        portionSize: original.portionSize,
        portionUtensil: original.portionUtensil,
        prepTimeMinutes: original.prepTimeMinutes,
        cookTimeMinutes: original.cookTimeMinutes,
        cookingTempF: original.cookingTempF,
        cookingMethod: original.cookingMethod,
        equipmentRequired: original.equipmentRequired,
        panSize: original.panSize,
        pansPerBatch: original.pansPerBatch,
        weightPerPan: original.weightPerPan,
        haccpCriticalLimits: original.haccpCriticalLimits,
        holdTempF: original.holdTempF,
        maxHoldTimeHours: original.maxHoldTimeHours,
        variations: original.variations,
        source: `Cloned from: ${original.recipeName}`,
        status: 'Draft',
        dateStandardized: null,
        notes: original.notes,
      })
      .returning();

    // Copy ingredients
    for (const ri of original.ingredients) {
      await this.ctx.db.insert(recipeIngredients).values({
        recipeIngredientId: generateId('recipeIngredient'),
        recipeId: newRecipeId,
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
        unitId: ri.unitId,
        isApOrEp: ri.isApOrEp,
        prepInstruction: ri.prepInstruction,
        sequenceOrder: ri.sequenceOrder,
        isOptional: ri.isOptional,
        ingredientGroup: ri.ingredientGroup,
        notes: ri.notes,
      });
    }

    return newRecipe;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Verify recipe belongs to tenant (for modification operations)
   */
  private async verifyRecipeOwnership(recipeId: string): Promise<void> {
    const [recipe] = await this.ctx.db
      .select({ tenantId: recipes.tenantId })
      .from(recipes)
      .where(eq(recipes.recipeId, recipeId))
      .limit(1);

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Can only modify tenant-specific recipes, not system-wide
    if (recipe.tenantId === null) {
      throw new Error('Cannot modify system recipe - clone it first');
    }

    if (recipe.tenantId !== this.tenantId) {
      throw new Error('Recipe not found');
    }
  }
}

