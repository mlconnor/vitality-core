import { z } from 'zod';

export const MealPeriodFormSchema = z.object({
  mealPeriodName: z.string().trim().min(1, 'Meal period name is required'),
  typicalStartTime: z.string().trim().min(1, 'Start time is required'),
  typicalEndTime: z.string().trim().min(1, 'End time is required'),
  targetCaloriesMin: z.number().int().nonnegative().optional(),
  targetCaloriesMax: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  notes: z.string().trim().optional(),
});

export type MealPeriodFormValues = z.input<typeof MealPeriodFormSchema>;

export interface MealPeriodRecord {
  mealPeriodId: string;
  tenantId: string | null;
  mealPeriodName: string;
  typicalStartTime: string;
  typicalEndTime: string;
  targetCaloriesMin: number | null;
  targetCaloriesMax: number | null;
  isRequired: boolean;
  sortOrder: number;
  notes: string | null;
}

export function mealPeriodToFormValues(mp: Partial<MealPeriodRecord> | null | undefined): MealPeriodFormValues {
  return {
    mealPeriodName: mp?.mealPeriodName ?? '',
    typicalStartTime: mp?.typicalStartTime ?? '',
    typicalEndTime: mp?.typicalEndTime ?? '',
    targetCaloriesMin: mp?.targetCaloriesMin ?? undefined,
    targetCaloriesMax: mp?.targetCaloriesMax ?? undefined,
    isRequired: mp?.isRequired ?? true,
    sortOrder: mp?.sortOrder ?? 0,
    notes: mp?.notes ?? '',
  };
}

export function mealPeriodValuesToCreateInput(values: MealPeriodFormValues): Record<string, unknown> {
  return {
    mealPeriodName: values.mealPeriodName,
    typicalStartTime: values.typicalStartTime,
    typicalEndTime: values.typicalEndTime,
    targetCaloriesMin: values.targetCaloriesMin,
    targetCaloriesMax: values.targetCaloriesMax,
    isRequired: values.isRequired ?? true,
    sortOrder: values.sortOrder,
    notes: values.notes || undefined,
  };
}

export function mealPeriodValuesToUpdateData(values: MealPeriodFormValues): Record<string, unknown> {
  return mealPeriodValuesToCreateInput(values);
}


