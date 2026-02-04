import { z } from 'zod';

export const IngredientStorageTypeEnum = z.enum(['Dry', 'Refrigerated', 'Frozen']);
export const IngredientStatusEnum = z.enum(['Active', 'Discontinued', 'Seasonal']);

export const IngredientFormSchema = z.object({
  ingredientName: z.string().trim().min(1, 'Ingredient name is required'),
  fdcId: z.number().int().nonnegative().optional(),
  foodCategoryId: z.string().trim().min(1, 'Food category is required'),
  commonUnit: z.string().trim().min(1, 'Common unit is required'),
  purchaseUnit: z.string().trim().min(1, 'Purchase unit is required'),

  purchaseUnitCost: z.number().finite().nonnegative().optional(),
  unitsPerPurchaseUnit: z.number().finite().positive().optional(),
  costPerUnit: z.number().finite().nonnegative().optional(),
  yieldPercent: z.number().finite().min(0).max(1).optional(),

  storageType: IngredientStorageTypeEnum,
  shelfLifeDays: z.number().int().nonnegative().optional(),
  parLevel: z.number().finite().nonnegative().optional(),
  reorderPoint: z.number().finite().nonnegative().optional(),

  preferredVendorId: z.string().trim().optional(),
  allergenFlags: z.string().trim().optional(),

  isLocal: z.boolean().default(false),
  isOrganic: z.boolean().default(false),
  usdaCommodity: z.boolean().default(false),

  status: IngredientStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
});

export type IngredientFormValues = z.input<typeof IngredientFormSchema>;

export interface IngredientRecord {
  ingredientId: string;
  tenantId: string | null;
  ingredientName: string;
  fdcId: number | null;
  foodCategoryId: string;
  commonUnit: string;
  purchaseUnit: string;
  purchaseUnitCost: number | null;
  unitsPerPurchaseUnit: number | null;
  costPerUnit: number | null;
  yieldPercent: number | null;
  storageType: z.infer<typeof IngredientStorageTypeEnum>;
  shelfLifeDays: number | null;
  parLevel: number | null;
  reorderPoint: number | null;
  preferredVendorId: string | null;
  allergenFlags: string | null;
  isLocal: boolean | null;
  isOrganic: boolean | null;
  usdaCommodity: boolean | null;
  status: z.infer<typeof IngredientStatusEnum>;
  notes: string | null;
}

export function ingredientToFormValues(i: Partial<IngredientRecord> | null | undefined): IngredientFormValues {
  return {
    ingredientName: i?.ingredientName ?? '',
    fdcId: i?.fdcId ?? undefined,
    foodCategoryId: i?.foodCategoryId ?? '',
    commonUnit: i?.commonUnit ?? '',
    purchaseUnit: i?.purchaseUnit ?? '',
    purchaseUnitCost: i?.purchaseUnitCost ?? undefined,
    unitsPerPurchaseUnit: i?.unitsPerPurchaseUnit ?? undefined,
    costPerUnit: i?.costPerUnit ?? undefined,
    yieldPercent: i?.yieldPercent ?? undefined,
    storageType: (i?.storageType as any) ?? 'Dry',
    shelfLifeDays: i?.shelfLifeDays ?? undefined,
    parLevel: i?.parLevel ?? undefined,
    reorderPoint: i?.reorderPoint ?? undefined,
    preferredVendorId: i?.preferredVendorId ?? '',
    allergenFlags: i?.allergenFlags ?? '',
    isLocal: i?.isLocal ?? false,
    isOrganic: i?.isOrganic ?? false,
    usdaCommodity: i?.usdaCommodity ?? false,
    status: (i?.status as any) ?? 'Active',
    notes: i?.notes ?? '',
  };
}

// Helper to convert "_none" placeholder to undefined
function noneToUndefined(val: string | undefined): string | undefined {
  return val === '_none' || !val ? undefined : val;
}

export function ingredientValuesToCreateInput(values: IngredientFormValues): Record<string, unknown> {
  return {
    ingredientName: values.ingredientName,
    fdcId: values.fdcId,
    foodCategoryId: values.foodCategoryId,
    commonUnit: values.commonUnit,
    purchaseUnit: values.purchaseUnit,
    purchaseUnitCost: values.purchaseUnitCost,
    unitsPerPurchaseUnit: values.unitsPerPurchaseUnit,
    costPerUnit: values.costPerUnit,
    yieldPercent: values.yieldPercent,
    storageType: values.storageType,
    shelfLifeDays: values.shelfLifeDays,
    parLevel: values.parLevel,
    reorderPoint: values.reorderPoint,
    preferredVendorId: noneToUndefined(values.preferredVendorId),
    allergenFlags: values.allergenFlags || undefined,
    isLocal: values.isLocal ?? false,
    isOrganic: values.isOrganic ?? false,
    usdaCommodity: values.usdaCommodity ?? false,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
  };
}

export function ingredientValuesToUpdateData(values: IngredientFormValues): Record<string, unknown> {
  return ingredientValuesToCreateInput(values);
}


