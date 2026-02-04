import { z } from 'zod';

export const RecipeCategoryEnum = z.enum([
  'Entrée',
  'Starch',
  'Vegetable',
  'Salad',
  'Soup',
  'Bread',
  'Dessert',
  'Sauce',
  'Beverage',
  'Breakfast',
  'Appetizer',
  'Condiment',
]);

export const CuisineTypeEnum = z.enum([
  'American',
  'Mexican',
  'Asian',
  'Italian',
  'Mediterranean',
  'Indian',
  'French',
  'Southern',
  'Cajun',
  'Caribbean',
  'Middle Eastern',
  'Other',
]);

export const CookingMethodEnum = z.enum([
  'Bake',
  'Roast',
  'Grill',
  'Steam',
  'Sauté',
  'Braise',
  'Fry',
  'Deep Fry',
  'Simmer',
  'Boil',
  'Poach',
  'No-Cook',
]);

export const RecipeFormSchema = z.object({
  recipeName: z.string().trim().min(1, 'Recipe name is required'),
  recipeCode: z.string().trim().optional(),
  category: RecipeCategoryEnum,
  cuisineType: CuisineTypeEnum.optional(),

  yieldQuantity: z.number().finite().positive(),
  yieldUnit: z.string().trim().min(1, 'Yield unit is required'),
  portionSize: z.string().trim().min(1, 'Portion size is required'),
  portionUtensil: z.string().trim().optional(),

  prepTimeMinutes: z.number().int().positive().optional(),
  cookTimeMinutes: z.number().int().positive().optional(),
  cookingTempF: z.number().int().positive().optional(),
  cookingMethod: CookingMethodEnum.optional(),

  equipmentRequired: z.string().trim().optional(),
  panSize: z.string().trim().optional(),
  pansPerBatch: z.number().int().positive().optional(),
  weightPerPan: z.string().trim().optional(),

  haccpCriticalLimits: z.string().trim().optional(),
  holdTempF: z.number().int().positive().optional(),
  maxHoldTimeHours: z.number().finite().positive().optional(),

  variations: z.string().trim().optional(),
  source: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type RecipeFormValues = z.input<typeof RecipeFormSchema>;

export interface RecipeRecord {
  recipeId: string;
  tenantId: string | null;
  recipeName: string;
  recipeCode: string | null;
  category: z.infer<typeof RecipeCategoryEnum>;
  cuisineType: z.infer<typeof CuisineTypeEnum> | null;
  yieldQuantity: number;
  yieldUnit: string;
  portionSize: string;
  portionUtensil: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  cookingTempF: number | null;
  cookingMethod: z.infer<typeof CookingMethodEnum> | null;
  equipmentRequired: string | null;
  panSize: string | null;
  pansPerBatch: number | null;
  weightPerPan: string | null;
  haccpCriticalLimits: string | null;
  holdTempF: number | null;
  maxHoldTimeHours: number | null;
  variations: string | null;
  source: string | null;
  notes: string | null;
}

export function recipeToFormValues(r: Partial<RecipeRecord> | null | undefined): RecipeFormValues {
  return {
    recipeName: r?.recipeName ?? '',
    recipeCode: r?.recipeCode ?? '',
    category: (r?.category as any) ?? 'Entrée',
    cuisineType: (r?.cuisineType as any) ?? undefined,
    yieldQuantity: r?.yieldQuantity ?? 1,
    yieldUnit: r?.yieldUnit ?? '',
    portionSize: r?.portionSize ?? '',
    portionUtensil: r?.portionUtensil ?? '',
    prepTimeMinutes: r?.prepTimeMinutes ?? undefined,
    cookTimeMinutes: r?.cookTimeMinutes ?? undefined,
    cookingTempF: r?.cookingTempF ?? undefined,
    cookingMethod: (r?.cookingMethod as any) ?? undefined,
    equipmentRequired: r?.equipmentRequired ?? '',
    panSize: r?.panSize ?? '',
    pansPerBatch: r?.pansPerBatch ?? undefined,
    weightPerPan: r?.weightPerPan ?? '',
    haccpCriticalLimits: r?.haccpCriticalLimits ?? '',
    holdTempF: r?.holdTempF ?? undefined,
    maxHoldTimeHours: r?.maxHoldTimeHours ?? undefined,
    variations: r?.variations ?? '',
    source: r?.source ?? '',
    notes: r?.notes ?? '',
  };
}

// Helper to convert "_none" placeholder to undefined
function noneToUndefined<T>(val: T | '_none' | undefined): T | undefined {
  return val === '_none' ? undefined : val;
}

export function recipeValuesToCreateInput(values: RecipeFormValues): Record<string, unknown> {
  return {
    recipeName: values.recipeName,
    recipeCode: values.recipeCode || undefined,
    category: values.category,
    cuisineType: noneToUndefined(values.cuisineType),
    yieldQuantity: values.yieldQuantity,
    yieldUnit: values.yieldUnit,
    portionSize: values.portionSize,
    portionUtensil: values.portionUtensil || undefined,
    prepTimeMinutes: values.prepTimeMinutes,
    cookTimeMinutes: values.cookTimeMinutes,
    cookingTempF: values.cookingTempF,
    cookingMethod: noneToUndefined(values.cookingMethod),
    equipmentRequired: values.equipmentRequired || undefined,
    panSize: values.panSize || undefined,
    pansPerBatch: values.pansPerBatch,
    weightPerPan: values.weightPerPan || undefined,
    haccpCriticalLimits: values.haccpCriticalLimits || undefined,
    holdTempF: values.holdTempF,
    maxHoldTimeHours: values.maxHoldTimeHours,
    variations: values.variations || undefined,
    source: values.source || undefined,
    notes: values.notes || undefined,
  };
}

export function recipeValuesToUpdateData(values: RecipeFormValues): Record<string, unknown> {
  return recipeValuesToCreateInput(values);
}


