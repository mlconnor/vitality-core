import { z } from 'zod';

export const EmployeeJobTitleEnum = z.enum([
  'Cook',
  'Prep Cook',
  'Server',
  'Dishwasher',
  'Supervisor',
  'Manager',
  'Dietitian',
  'Receiving Clerk',
  'Storeroom Clerk',
  'Tray Assembler',
  'Cashier',
  'Utility Worker',
]);

export const EmployeeStatusEnum = z.enum(['Active', 'On Leave', 'Terminated']);

export const EmployeeFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  primarySiteId: z.string().trim().min(1, 'Primary site is required'),
  jobTitle: EmployeeJobTitleEnum,
  hireDate: z.string().trim().min(1, 'Hire date is required'),

  hourlyRate: z.number().finite().nonnegative().optional(),
  certifications: z.string().trim().optional(),
  certificationExpiry: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),

  status: EmployeeStatusEnum.default('Active'),
  notes: z.string().trim().optional(),
});

export type EmployeeFormValues = z.input<typeof EmployeeFormSchema>;

export interface EmployeeRecord {
  employeeId: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  primarySiteId: string;
  jobTitle: z.infer<typeof EmployeeJobTitleEnum>;
  hireDate: string;
  hourlyRate: number | null;
  certifications: string | null;
  certificationExpiry: string | null;
  phone: string | null;
  email: string | null;
  status: z.infer<typeof EmployeeStatusEnum>;
  notes: string | null;
}

export function employeeToFormValues(employee: Partial<EmployeeRecord> | null | undefined): EmployeeFormValues {
  return {
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    primarySiteId: employee?.primarySiteId ?? '',
    jobTitle: (employee?.jobTitle as any) ?? 'Cook',
    hireDate: employee?.hireDate ?? '',
    hourlyRate: employee?.hourlyRate ?? undefined,
    certifications: employee?.certifications ?? '',
    certificationExpiry: employee?.certificationExpiry ?? '',
    phone: employee?.phone ?? '',
    email: employee?.email ?? '',
    status: (employee?.status as any) ?? 'Active',
    notes: employee?.notes ?? '',
  };
}

export function employeeValuesToCreateInput(values: EmployeeFormValues): Record<string, unknown> {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    primarySiteId: values.primarySiteId,
    jobTitle: values.jobTitle,
    hireDate: values.hireDate,
    hourlyRate: values.hourlyRate,
    certifications: values.certifications || undefined,
    certificationExpiry: values.certificationExpiry || undefined,
    phone: values.phone || undefined,
    email: values.email || undefined,
    status: values.status ?? 'Active',
    notes: values.notes || undefined,
  };
}

export function employeeValuesToUpdateData(values: EmployeeFormValues): Record<string, unknown> {
  return employeeValuesToCreateInput(values);
}


