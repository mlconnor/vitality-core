import { z } from 'zod';

export const CycleMenuSeasonEnum = z.enum(['Spring', 'Summer', 'Fall', 'Winter', 'Year-Round']);
export const CycleMenuStatusEnum = z.enum(['Draft', 'Active', 'Archived']);

export const CycleMenuFormSchema = z.object({
  cycleName: z.string().trim().min(1, 'Cycle name is required'),
  season: CycleMenuSeasonEnum,
  cycleLengthWeeks: z.number().int().positive(),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: z.string().trim().optional(),
  siteId: z.string().trim().optional(),
  targetFoodCostPerMeal: z.number().finite().nonnegative().optional(),
  status: CycleMenuStatusEnum.default('Draft'),
  approvedBy: z.string().trim().optional(),
  approvalDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  llmNotes: z.string().trim().optional(),
});

export type CycleMenuFormValues = z.input<typeof CycleMenuFormSchema>;

export interface CycleMenuRecord {
  cycleMenuId: string;
  tenantId: string;
  cycleName: string;
  season: z.infer<typeof CycleMenuSeasonEnum>;
  cycleLengthWeeks: number;
  startDate: string;
  endDate: string | null;
  siteId: string | null;
  targetFoodCostPerMeal: number | null;
  status: z.infer<typeof CycleMenuStatusEnum>;
  approvedBy: string | null;
  approvalDate: string | null;
  notes: string | null;
  llmNotes: string | null;
}

export function cycleMenuToFormValues(cm: Partial<CycleMenuRecord> | null | undefined): CycleMenuFormValues {
  return {
    cycleName: cm?.cycleName ?? '',
    season: (cm?.season as any) ?? 'Year-Round',
    cycleLengthWeeks: cm?.cycleLengthWeeks ?? 4,
    startDate: cm?.startDate ?? '',
    endDate: cm?.endDate ?? '',
    siteId: cm?.siteId ?? '',
    targetFoodCostPerMeal: cm?.targetFoodCostPerMeal ?? undefined,
    status: (cm?.status as any) ?? 'Draft',
    approvedBy: cm?.approvedBy ?? '',
    approvalDate: cm?.approvalDate ?? '',
    notes: cm?.notes ?? '',
    llmNotes: cm?.llmNotes ?? '',
  };
}

export function cycleMenuValuesToCreateInput(values: CycleMenuFormValues): Record<string, unknown> {
  return {
    cycleName: values.cycleName,
    season: values.season,
    cycleLengthWeeks: values.cycleLengthWeeks,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    siteId: values.siteId || undefined,
    targetFoodCostPerMeal: values.targetFoodCostPerMeal,
    status: values.status ?? 'Draft',
    approvedBy: values.approvedBy || undefined,
    approvalDate: values.approvalDate || undefined,
    notes: values.notes || undefined,
    llmNotes: values.llmNotes || undefined,
  };
}

export function cycleMenuValuesToUpdateData(values: CycleMenuFormValues): Record<string, unknown> {
  return cycleMenuValuesToCreateInput(values);
}


