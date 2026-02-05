/**
 * Employee Edit Page (rebuilt)
 *
 * Aligns with DB schema `employees` and uses RHF + Zod + debounced autosave.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  Trash2,
  FileText,
  Building2,
  Award,
  DollarSign,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { TooltipProvider } from '../components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useApiQuery, useCreateMutation, useUpdateMutation, useDeleteEmployees } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  EmployeeFormSchema,
  EmployeeJobTitleEnum,
  employeeToFormValues,
  employeeValuesToCreateInput,
  employeeValuesToUpdateData,
  type EmployeeFormValues,
} from '../schemas/employee';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'employment', label: 'Employment', icon: Building2 },
  { id: 'certs', label: 'Certifications', icon: Award },
  { id: 'notes', label: 'Notes', icon: FileText },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'On Leave': { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Terminated: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

interface FormFieldProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function FormField({ label, icon: Icon, required, children, hint }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        {Icon && <Icon className="w-4 h-4 text-primary/60" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const { data: employee, isLoading, error } = useApiQuery<any>(
    'employee.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const { data: sites } = useApiQuery<any[]>('site.list', {});

  const createMutation = useCreateMutation<any>('employee');
  const updateMutation = useUpdateMutation<any>('employee');
  const deleteMutation = useDeleteEmployees();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(EmployeeFormSchema),
    mode: 'onChange',
    defaultValues: employeeToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (employee) form.reset(employeeToFormValues(employee));
  }, [employee, form]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = values?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<EmployeeFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as EmployeeFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(employeeValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: employeeValuesToUpdateData(data as EmployeeFormValues) }),
    getRecordId: (record) => record?.employeeId ?? null,
    onCreated: (record) => {
      const newId = record?.employeeId;
      if (typeof newId === 'string' && newId.length > 0) {
        navigate(`/employees/${newId}`, { replace: true });
      }
      form.reset(form.getValues());
    },
    onSaved: () => form.reset(form.getValues()),
  });

  const headerStatus = useMemo(() => {
    if (autosave.status === 'saving') return { text: 'Saving…', className: 'text-xs text-muted-foreground mr-2' };
    if (autosave.status === 'saved') return { text: 'Saved', className: 'text-xs text-emerald-400 mr-2' };
    if (autosave.status === 'error') return { text: 'Error saving', className: 'text-xs text-destructive mr-2' };
    if (isDirty) return { text: 'Unsaved changes', className: 'text-xs text-amber-400 mr-2' };
    return null;
  }, [autosave.status, isDirty]);

  // Handle save/create action
  const handleSave = React.useCallback(async () => {
    if (isNew) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    autosave.flush();
  }, [isNew, form, autosave]);

  // Handle delete action
  const handleDelete = React.useCallback(async () => {
    if (isNew || !id) return;
    const name = `${form.getValues('firstName') || ''} ${form.getValues('lastName') || ''}`.trim() || 'this employee';
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/employees');
    } catch (err) {
      console.error('Failed to delete employee:', err);
      alert('Failed to delete employee. They may have associated data.');
    }
  }, [isNew, id, deleteMutation, form, navigate]);

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load employee</p>
        <Button variant="outline" onClick={() => navigate('/employees')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    );
  }

  const fullName = [values?.firstName, values?.lastName].filter(Boolean).join(' ');

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isDirty && !window.confirm('Discard unsaved changes?')) return;
                  navigate('/employees');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Employees
              </Button>

              <div className="flex items-center gap-2">
                {headerStatus && (
                  <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={headerStatus.className}>
                    {headerStatus.text}
                  </motion.span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
                    navigate('/employees');
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>

                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={isNew ? !isDirty : (!isDirty || !isValid)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isNew ? 'Create' : 'Save'}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={isNew}>
                      <Archive className="w-4 h-4 mr-2" />
                      Terminate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDelete}
                      disabled={isNew}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Employee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center gap-3 w-full">
                    <Input
                      {...form.register('firstName')}
                      placeholder="First name"
                      className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-1/2 h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                    />
                    <Input
                      {...form.register('lastName')}
                      placeholder="Last name"
                      className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-1/2 h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                    />
                  </div>
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {values?.jobTitle && <span>{values.jobTitle}</span>}
                  {values?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {values.phone}
                    </span>
                  )}
                  {values?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {values.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6">
            <nav className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
                      flex items-center gap-2
                      ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeEmployeeTab"
                        className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.header>

        <ScrollArea className="flex-grow">
          <div className="p-6">
            {autosave.status === 'error' && autosave.lastError && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {autosave.lastError.message}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'profile' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Phone" icon={Phone}>
                          <Input {...form.register('phone')} placeholder="(555) 123-4567" className="bg-background/50" />
                        </FormField>
                        <FormField label="Email" icon={Mail}>
                          <Input type="email" {...form.register('email')} placeholder="name@example.com" className="bg-background/50" />
                        </FormField>
                        <FormField label="Status" required>
                          <Controller
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Active'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Active">Active</SelectItem>
                                  <SelectItem value="On Leave">On Leave</SelectItem>
                                  <SelectItem value="Terminated">Terminated</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Primary Site
                        </CardTitle>
                        <CardDescription>Where this employee primarily works</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Site" required>
                          <Controller
                            control={form.control}
                            name="primarySiteId"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select site" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(sites ?? []).map((s: any) => (
                                    <SelectItem key={s.siteId} value={s.siteId}>
                                      {s.siteName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'employment' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Role & Dates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Job Title" required>
                          <Controller
                            control={form.control}
                            name="jobTitle"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Cook'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select job title" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EmployeeJobTitleEnum.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Hire Date" required hint="YYYY-MM-DD">
                          <Input {...form.register('hireDate')} placeholder="2026-02-04" className="bg-background/50 font-mono" />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Compensation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Hourly Rate" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('hourlyRate', { setValueAs: numberField })}
                            placeholder="e.g., 18.50"
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'certs' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" />
                          Certifications
                        </CardTitle>
                        <CardDescription>Food safety and other certifications</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Certifications" hint="Comma-separated or freeform">
                          <Textarea
                            {...form.register('certifications')}
                            placeholder="e.g., ServSafe Manager, CPR"
                            className="bg-background/50 min-h-[120px]"
                          />
                        </FormField>
                        <FormField label="Certification Expiry" hint="YYYY-MM-DD or freeform">
                          <Input {...form.register('certificationExpiry')} placeholder="2027-01-15" className="bg-background/50 font-mono" />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="grid grid-cols-1 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="General Notes" hint={fullName ? `Notes about ${fullName}` : undefined}>
                          <Textarea {...form.register('notes')} placeholder="Notes about this employee..." className="bg-background/50 min-h-[160px]" />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

export default EmployeeEditPage;


