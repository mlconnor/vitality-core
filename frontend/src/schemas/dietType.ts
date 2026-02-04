import { z } from 'zod';

export const DietCategoryEnum = z.enum([
  'Regular',
  'Therapeutic',
  'Texture-Modified',
  'Allergy',
  'Religious',
  'Lifestyle',
]);

export const DietStatusEnum = z.enum(['Active', 'Inactive']);

export const DietTypeFormSchema = z.object({
  dietTypeName: z.string().trim().min(1, 'Diet name is required'),
  dietCategory: DietCategoryEnum,
  description: z.string().trim().min(1, 'Description is required'),
  restrictions: z.string().trim().optional(),
  requiredModifications: z.string().trim().optional(),
  calorieTarget: z.number().int().nonnegative().optional(),
  sodiumLimitMg: z.number().int().nonnegative().optional(),
  carbLimitG: z.number().int().nonnegative().optional(),
  requiresDietitianApproval: z.boolean().default(false),
  status: DietStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
});

export type DietTypeFormValues = z.input<typeof DietTypeFormSchema>;

export interface DietTypeRecord {
  dietTypeId: string;
  tenantId: string | null;
  dietTypeName: string;
  dietCategory: z.infer<typeof DietCategoryEnum>;
  description: string;
  restrictions: string | null;
  requiredModifications: string | null;
  calorieTarget: number | null;
  sodiumLimitMg: number | null;
  carbLimitG: number | null;
  requiresDietitianApproval: boolean;
  status: z.infer<typeof DietStatusEnum>;
  notes: string | null;
}

export function dietTypeToFormValues(diet: Partial<DietTypeRecord> | null | undefined): DietTypeFormValues {
  return {
    dietTypeName: diet?.dietTypeName ?? '',
    dietCategory: (diet?.dietCategory as any) ?? 'Regular',
    description: diet?.description ?? '',
    restrictions: diet?.restrictions ?? '',
    requiredModifications: diet?.requiredModifications ?? '',
    calorieTarget: diet?.calorieTarget ?? undefined,
    sodiumLimitMg: diet?.sodiumLimitMg ?? undefined,
    carbLimitG: diet?.carbLimitG ?? undefined,
    requiresDietitianApproval: diet?.requiresDietitianApproval ?? false,
    status: (diet?.status as any) ?? 'Active',
    notes: diet?.notes ?? '',
  };
}

export function dietTypeValuesToCreateInput(values: DietTypeFormValues): Record<string, unknown> {
  return {
    dietTypeName: values.dietTypeName,
    dietCategory: values.dietCategory,
    description: values.description,
    restrictions: values.restrictions || undefined,
    requiredModifications: values.requiredModifications || undefined,
    calorieTarget: values.calorieTarget,
    sodiumLimitMg: values.sodiumLimitMg,
    carbLimitG: values.carbLimitG,
    requiresDietitianApproval: values.requiresDietitianApproval ?? false,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
  };
}

export function dietTypeValuesToUpdateData(values: DietTypeFormValues): Record<string, unknown> {
  return dietTypeValuesToCreateInput(values);
}


