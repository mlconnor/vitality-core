import { z } from 'zod';

export const SingleUseScopeEnum = z.enum(['Day', 'MealPeriod']);
export const SingleUseModeEnum = z.enum(['Replace', 'Supplement']);
export const SingleUseOccasionEnum = z.enum(['Holiday', 'SpecialEvent', 'Catering', 'Emergency', 'Test', 'Other']);
export const SingleUseStatusEnum = z.enum(['Draft', 'Active', 'Completed', 'Cancelled']);

export const SingleUseMenuFormSchema = z.object({
  siteId: z.string().trim().optional(),
  menuName: z.string().trim().min(1, 'Menu name is required'),
  serviceDate: z.string().trim().min(1, 'Service date is required'),
  scope: SingleUseScopeEnum,
  mealPeriodId: z.string().trim().optional(),
  mode: SingleUseModeEnum,
  occasion: SingleUseOccasionEnum.default('SpecialEvent'),
  baseCycleMenuId: z.string().trim().optional(),
  targetFoodCostPerMeal: z.number().finite().nonnegative().optional(),
  forecastedCovers: z.number().int().nonnegative().optional(),
  status: SingleUseStatusEnum.default('Draft'),
  createdBy: z.string().trim().optional(),
  createdDate: z.string().trim().optional(),
  approvedBy: z.string().trim().optional(),
  approvalDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  llmNotes: z.string().trim().optional(),
});

export type SingleUseMenuFormValues = z.input<typeof SingleUseMenuFormSchema>;

export interface SingleUseMenuRecord {
  singleUseMenuId: string;
  tenantId: string;
  siteId: string | null;
  menuName: string;
  serviceDate: string;
  scope: z.infer<typeof SingleUseScopeEnum>;
  mealPeriodId: string | null;
  mode: z.infer<typeof SingleUseModeEnum>;
  occasion: z.infer<typeof SingleUseOccasionEnum>;
  baseCycleMenuId: string | null;
  targetFoodCostPerMeal: number | null;
  forecastedCovers: number | null;
  status: z.infer<typeof SingleUseStatusEnum>;
  createdBy: string | null;
  createdDate: string | null;
  approvedBy: string | null;
  approvalDate: string | null;
  notes: string | null;
  llmNotes: string | null;
}

export function singleUseMenuToFormValues(m: Partial<SingleUseMenuRecord> | null | undefined): SingleUseMenuFormValues {
  return {
    siteId: m?.siteId ?? '',
    menuName: m?.menuName ?? '',
    serviceDate: m?.serviceDate ?? '',
    scope: (m?.scope as any) ?? 'Day',
    mealPeriodId: m?.mealPeriodId ?? '',
    mode: (m?.mode as any) ?? 'Supplement',
    occasion: (m?.occasion as any) ?? 'SpecialEvent',
    baseCycleMenuId: m?.baseCycleMenuId ?? '',
    targetFoodCostPerMeal: m?.targetFoodCostPerMeal ?? undefined,
    forecastedCovers: m?.forecastedCovers ?? undefined,
    status: (m?.status as any) ?? 'Draft',
    createdBy: m?.createdBy ?? '',
    createdDate: m?.createdDate ?? '',
    approvedBy: m?.approvedBy ?? '',
    approvalDate: m?.approvalDate ?? '',
    notes: m?.notes ?? '',
    llmNotes: m?.llmNotes ?? '',
  };
}

export function singleUseMenuValuesToCreateInput(values: SingleUseMenuFormValues): Record<string, unknown> {
  return {
    siteId: values.siteId || undefined,
    menuName: values.menuName,
    serviceDate: values.serviceDate,
    scope: values.scope,
    mealPeriodId: values.scope === 'MealPeriod' ? (values.mealPeriodId || undefined) : undefined,
    mode: values.mode,
    occasion: values.occasion ?? 'SpecialEvent',
    baseCycleMenuId: values.baseCycleMenuId || undefined,
    targetFoodCostPerMeal: values.targetFoodCostPerMeal,
    forecastedCovers: values.forecastedCovers,
    status: values.status ?? 'Draft',
    createdBy: values.createdBy || undefined,
    createdDate: values.createdDate || undefined,
    approvedBy: values.approvedBy || undefined,
    approvalDate: values.approvalDate || undefined,
    notes: values.notes || undefined,
    llmNotes: values.llmNotes || undefined,
  };
}

export function singleUseMenuValuesToUpdateData(values: SingleUseMenuFormValues): Record<string, unknown> {
  return singleUseMenuValuesToCreateInput(values);
}


