import { z } from 'zod';

export const SiteTypeEnum = z.enum([
  'Kitchen',
  'Dining Hall',
  'Satellite',
  'Commissary',
  'Cafeteria',
]);

export const SiteStatusEnum = z.enum(['Active', 'Inactive', 'Seasonal']);

export const SiteFormSchema = z.object({
  siteName: z.string().trim().min(1, 'Site name is required'),
  siteType: SiteTypeEnum,

  address: z.string().trim().optional(),
  managerName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  operatingHours: z.string().trim().optional(),

  capacitySeats: z.number().int().nonnegative().optional(),
  hasProductionKitchen: z.boolean().default(false),

  storageDrySqft: z.number().finite().nonnegative().optional(),
  storageRefrigeratedSqft: z.number().finite().nonnegative().optional(),
  storageFreezerSqft: z.number().finite().nonnegative().optional(),

  status: SiteStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
  llmNotes: z.string().trim().optional(),
});

// For react-hook-form + zodResolver, the form type should match the *input* type
// (fields with defaults may still be undefined before parsing).
export type SiteFormValues = z.input<typeof SiteFormSchema>;
export type SiteFormParsedValues = z.output<typeof SiteFormSchema>;

export interface SiteRecord {
  siteId: string;
  tenantId: string;
  siteName: string;
  siteType: z.infer<typeof SiteTypeEnum>;
  address: string | null;
  capacitySeats: number | null;
  hasProductionKitchen: boolean;
  storageDrySqft: number | null;
  storageRefrigeratedSqft: number | null;
  storageFreezerSqft: number | null;
  managerName: string | null;
  phone: string | null;
  operatingHours: string | null;
  status: z.infer<typeof SiteStatusEnum>;
  notes: string | null;
  llmNotes: string | null;
}

export function siteToFormValues(site: Partial<SiteRecord> | null | undefined): SiteFormValues {
  return {
    siteName: site?.siteName ?? '',
    siteType: (site?.siteType as SiteFormValues['siteType']) ?? 'Kitchen',
    address: site?.address ?? '',
    managerName: site?.managerName ?? '',
    phone: site?.phone ?? '',
    operatingHours: site?.operatingHours ?? '',
    capacitySeats: site?.capacitySeats ?? undefined,
    hasProductionKitchen: site?.hasProductionKitchen ?? false,
    storageDrySqft: site?.storageDrySqft ?? undefined,
    storageRefrigeratedSqft: site?.storageRefrigeratedSqft ?? undefined,
    storageFreezerSqft: site?.storageFreezerSqft ?? undefined,
    status: (site?.status as SiteFormValues['status']) ?? 'Active',
    notes: site?.notes ?? '',
    llmNotes: site?.llmNotes ?? '',
  };
}

export function formValuesToCreateInput(values: SiteFormValues): Record<string, unknown> {
  // We rely on JSON serialization to drop `undefined` fields.
  return {
    siteName: values.siteName,
    siteType: values.siteType,
    address: values.address || undefined,
    managerName: values.managerName || undefined,
    phone: values.phone || undefined,
    operatingHours: values.operatingHours || undefined,
    capacitySeats: values.capacitySeats,
    hasProductionKitchen: values.hasProductionKitchen ?? false,
    storageDrySqft: values.storageDrySqft,
    storageRefrigeratedSqft: values.storageRefrigeratedSqft,
    storageFreezerSqft: values.storageFreezerSqft,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
    llmNotes: values.llmNotes || undefined,
  };
}

export function formValuesToUpdateData(values: SiteFormValues): Record<string, unknown> {
  return formValuesToCreateInput(values);
}


