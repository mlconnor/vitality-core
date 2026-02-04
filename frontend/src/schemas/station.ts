import { z } from 'zod';

export const StationTypeEnum = z.enum([
  'Grill',
  'Steam Table',
  'Cold Bar',
  'Salad Bar',
  'Trayline',
  'Beverage',
  'Dessert',
  'À la Carte',
  'Grab-and-Go',
]);

export const StationServiceStyleEnum = z.enum([
  'Self-Service',
  'Attended',
  'Tray Service',
  'Counter Service',
]);

export const StationStatusEnum = z.enum(['Active', 'Inactive', 'Under Maintenance']);

export const StationFormSchema = z.object({
  siteId: z.string().trim().min(1, 'Site is required'),
  stationName: z.string().trim().min(1, 'Station name is required'),
  stationType: StationTypeEnum,
  serviceStyle: StationServiceStyleEnum,
  capacityCoversPerHour: z.number().int().nonnegative().optional(),
  equipmentList: z.string().trim().optional(),
  requiresTempLog: z.boolean().default(false),
  status: StationStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
  llmNotes: z.string().trim().optional(),
});

export type StationFormValues = z.input<typeof StationFormSchema>;

export interface StationRecord {
  stationId: string;
  siteId: string;
  stationName: string;
  stationType: z.infer<typeof StationTypeEnum>;
  serviceStyle: z.infer<typeof StationServiceStyleEnum>;
  capacityCoversPerHour: number | null;
  equipmentList: string | null;
  requiresTempLog: boolean;
  status: z.infer<typeof StationStatusEnum>;
  notes: string | null;
  llmNotes: string | null;
}

export function stationToFormValues(station: Partial<StationRecord> | null | undefined): StationFormValues {
  return {
    siteId: station?.siteId ?? '',
    stationName: station?.stationName ?? '',
    stationType: (station?.stationType as any) ?? 'Grill',
    serviceStyle: (station?.serviceStyle as any) ?? 'Self-Service',
    capacityCoversPerHour: station?.capacityCoversPerHour ?? undefined,
    equipmentList: station?.equipmentList ?? '',
    requiresTempLog: station?.requiresTempLog ?? false,
    status: (station?.status as any) ?? 'Active',
    notes: station?.notes ?? '',
    llmNotes: station?.llmNotes ?? '',
  };
}

export function stationValuesToCreateInput(values: StationFormValues): Record<string, unknown> {
  return {
    siteId: values.siteId,
    stationName: values.stationName,
    stationType: values.stationType,
    serviceStyle: values.serviceStyle,
    capacityCoversPerHour: values.capacityCoversPerHour,
    equipmentList: values.equipmentList || undefined,
    requiresTempLog: values.requiresTempLog ?? false,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
    llmNotes: values.llmNotes || undefined,
  };
}

export function stationValuesToUpdateData(values: StationFormValues): Record<string, unknown> {
  return stationValuesToCreateInput(values);
}


