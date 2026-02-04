import { z } from 'zod';

export const DinerTypeEnum = z.enum(['Patient', 'Student', 'Resident', 'Staff', 'Visitor']);
export const DinerStatusEnum = z.enum(['Active', 'Discharged', 'On Leave']);
export const TextureEnum = z.enum(['Regular', 'Mechanical Soft', 'Pureed', 'Ground']);
export const LiquidEnum = z.enum(['Regular', 'Thickened-Nectar', 'Thickened-Honey', 'NPO']);
export const FeedingAssistanceEnum = z.enum(['Independent', 'Setup', 'Feeding Assist', 'Tube Fed']);
export const FreeReducedEnum = z.enum(['Paid', 'Free', 'Reduced']);

export const DinerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  siteId: z.string().trim().min(1, 'Site is required'),

  roomNumber: z.string().trim().optional(),
  dinerType: DinerTypeEnum,
  admissionDate: z.string().trim().optional(),
  expectedDischargeDate: z.string().trim().optional(),

  // Diet fields (required for create; for update, handled by changeDiet on backend)
  primaryDietTypeId: z.string().trim().min(1, 'Diet type is required'),
  textureModification: TextureEnum.optional(),
  liquidConsistency: LiquidEnum.optional(),

  allergies: z.string().trim().optional(),
  dislikes: z.string().trim().optional(),
  preferences: z.string().trim().optional(),
  specialInstructions: z.string().trim().optional(),
  feedingAssistance: FeedingAssistanceEnum.optional(),
  mealTicketNumber: z.string().trim().optional(),
  freeReducedStatus: FreeReducedEnum.optional(),
  physician: z.string().trim().optional(),

  status: DinerStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
  llmNotes: z.string().trim().optional(),
});

export type DinerFormValues = z.input<typeof DinerFormSchema>;

export interface DinerRecord {
  dinerId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  siteId: string;
  roomNumber: string | null;
  dinerType: z.infer<typeof DinerTypeEnum>;
  admissionDate: string | null;
  expectedDischargeDate: string | null;
  primaryDietTypeId: string;
  textureModification: z.infer<typeof TextureEnum> | null;
  liquidConsistency: z.infer<typeof LiquidEnum> | null;
  allergies: string | null;
  dislikes: string | null;
  preferences: string | null;
  specialInstructions: string | null;
  feedingAssistance: z.infer<typeof FeedingAssistanceEnum> | null;
  mealTicketNumber: string | null;
  freeReducedStatus: z.infer<typeof FreeReducedEnum> | null;
  physician: string | null;
  status: z.infer<typeof DinerStatusEnum>;
  notes: string | null;
  llmNotes: string | null;
}

export function dinerToFormValues(diner: Partial<DinerRecord> | null | undefined): DinerFormValues {
  return {
    firstName: diner?.firstName ?? '',
    lastName: diner?.lastName ?? '',
    siteId: diner?.siteId ?? '',
    roomNumber: diner?.roomNumber ?? '',
    dinerType: (diner?.dinerType as any) ?? 'Patient',
    admissionDate: diner?.admissionDate ?? '',
    expectedDischargeDate: diner?.expectedDischargeDate ?? '',
    primaryDietTypeId: diner?.primaryDietTypeId ?? '',
    textureModification: (diner?.textureModification as any) ?? undefined,
    liquidConsistency: (diner?.liquidConsistency as any) ?? undefined,
    allergies: diner?.allergies ?? '',
    dislikes: diner?.dislikes ?? '',
    preferences: diner?.preferences ?? '',
    specialInstructions: diner?.specialInstructions ?? '',
    feedingAssistance: (diner?.feedingAssistance as any) ?? undefined,
    mealTicketNumber: diner?.mealTicketNumber ?? '',
    freeReducedStatus: (diner?.freeReducedStatus as any) ?? undefined,
    physician: diner?.physician ?? '',
    status: (diner?.status as any) ?? 'Active',
    notes: diner?.notes ?? '',
    llmNotes: diner?.llmNotes ?? '',
  };
}

export function dinerValuesToCreateInput(values: DinerFormValues): Record<string, unknown> {
  // Must match backend `createDinerSchema` (llmNotes is not accepted there).
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    siteId: values.siteId,
    roomNumber: values.roomNumber || undefined,
    dinerType: values.dinerType,
    admissionDate: values.admissionDate || undefined,
    expectedDischargeDate: values.expectedDischargeDate || undefined,
    primaryDietTypeId: values.primaryDietTypeId,
    textureModification: values.textureModification,
    liquidConsistency: values.liquidConsistency,
    allergies: values.allergies || undefined,
    dislikes: values.dislikes || undefined,
    preferences: values.preferences || undefined,
    specialInstructions: values.specialInstructions || undefined,
    feedingAssistance: values.feedingAssistance,
    mealTicketNumber: values.mealTicketNumber || undefined,
    freeReducedStatus: values.freeReducedStatus,
    physician: values.physician || undefined,
    notes: values.notes || undefined,
  };
}

export function dinerValuesToUpdateData(values: DinerFormValues): Record<string, unknown> {
  // Diet fields are NOT allowed in diner.update (must use changeDiet).
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    siteId: values.siteId,
    roomNumber: values.roomNumber || undefined,
    dinerType: values.dinerType,
    admissionDate: values.admissionDate || undefined,
    expectedDischargeDate: values.expectedDischargeDate || undefined,
    allergies: values.allergies || undefined,
    dislikes: values.dislikes || undefined,
    preferences: values.preferences || undefined,
    specialInstructions: values.specialInstructions || undefined,
    feedingAssistance: values.feedingAssistance,
    mealTicketNumber: values.mealTicketNumber || undefined,
    freeReducedStatus: values.freeReducedStatus,
    physician: values.physician || undefined,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
    llmNotes: values.llmNotes || undefined,
  };
}


