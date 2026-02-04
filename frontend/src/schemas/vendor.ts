import { z } from 'zod';

export const VendorTypeEnum = z.enum([
  'Broadline Distributor',
  'Produce',
  'Dairy',
  'Meat',
  'Bakery',
  'Seafood',
  'Specialty',
  'Beverage',
  'Paper/Disposables',
  'Equipment',
]);

export const VendorStatusEnum = z.enum(['Active', 'Inactive', 'Suspended', 'Prospective']);

export const VendorFormSchema = z.object({
  vendorName: z.string().trim().min(1, 'Vendor name is required'),
  vendorType: VendorTypeEnum,
  contactName: z.string().trim().optional(),
  phone: z.string().trim().min(1, 'Phone is required'),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zip: z.string().trim().optional(),
  deliveryDays: z.string().trim().optional(),
  deliveryLeadTimeDays: z.number().int().nonnegative().optional(),
  minimumOrder: z.number().finite().nonnegative().optional(),
  paymentTerms: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  contractStartDate: z.string().trim().optional(),
  contractEndDate: z.string().trim().optional(),
  performanceRating: z.number().finite().min(0).max(5).optional(),
  insuranceOnFile: z.boolean().default(false),
  status: VendorStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
});

export type VendorFormValues = z.input<typeof VendorFormSchema>;

export interface VendorRecord {
  vendorId: string;
  tenantId: string;
  vendorName: string;
  vendorType: z.infer<typeof VendorTypeEnum>;
  contactName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  deliveryDays: string | null;
  deliveryLeadTimeDays: number | null;
  minimumOrder: number | null;
  paymentTerms: string | null;
  accountNumber: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  performanceRating: number | null;
  insuranceOnFile: boolean | null;
  status: z.infer<typeof VendorStatusEnum>;
  notes: string | null;
}

export function vendorToFormValues(v: Partial<VendorRecord> | null | undefined): VendorFormValues {
  return {
    vendorName: v?.vendorName ?? '',
    vendorType: (v?.vendorType as any) ?? 'Broadline Distributor',
    contactName: v?.contactName ?? '',
    phone: v?.phone ?? '',
    email: v?.email ?? '',
    address: v?.address ?? '',
    city: v?.city ?? '',
    state: v?.state ?? '',
    zip: v?.zip ?? '',
    deliveryDays: v?.deliveryDays ?? '',
    deliveryLeadTimeDays: v?.deliveryLeadTimeDays ?? undefined,
    minimumOrder: v?.minimumOrder ?? undefined,
    paymentTerms: v?.paymentTerms ?? '',
    accountNumber: v?.accountNumber ?? '',
    contractStartDate: v?.contractStartDate ?? '',
    contractEndDate: v?.contractEndDate ?? '',
    performanceRating: v?.performanceRating ?? undefined,
    insuranceOnFile: v?.insuranceOnFile ?? false,
    status: (v?.status as any) ?? 'Active',
    notes: v?.notes ?? '',
  };
}

export function vendorValuesToCreateInput(values: VendorFormValues): Record<string, unknown> {
  return {
    vendorName: values.vendorName,
    vendorType: values.vendorType,
    contactName: values.contactName || undefined,
    phone: values.phone,
    email: values.email || undefined,
    address: values.address || undefined,
    city: values.city || undefined,
    state: values.state || undefined,
    zip: values.zip || undefined,
    deliveryDays: values.deliveryDays || undefined,
    deliveryLeadTimeDays: values.deliveryLeadTimeDays,
    minimumOrder: values.minimumOrder,
    paymentTerms: values.paymentTerms || undefined,
    accountNumber: values.accountNumber || undefined,
    contractStartDate: values.contractStartDate || undefined,
    contractEndDate: values.contractEndDate || undefined,
    performanceRating: values.performanceRating,
    insuranceOnFile: values.insuranceOnFile ?? false,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
  };
}

export function vendorValuesToUpdateData(values: VendorFormValues): Record<string, unknown> {
  return vendorValuesToCreateInput(values);
}


