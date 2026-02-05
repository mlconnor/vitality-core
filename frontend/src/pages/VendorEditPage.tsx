/**
 * Vendor Edit Page (rebuilt)
 *
 * Aligns with DB schema `vendors` and uses RHF + Zod + debounced autosave.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  Trash2,
  FileText,
  Settings,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  ShieldCheck,
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
import { useApiQuery, useCreateMutation, useUpdateMutation, useDeleteVendors } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  VendorFormSchema,
  VendorStatusEnum,
  VendorTypeEnum,
  vendorToFormValues,
  vendorValuesToCreateInput,
  vendorValuesToUpdateData,
  type VendorFormValues,
} from '../schemas/vendor';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'logistics', label: 'Logistics', icon: Truck },
  { id: 'contract', label: 'Contract', icon: DollarSign },
  { id: 'notes', label: 'Notes', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Inactive: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  Suspended: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  Prospective: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
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

export function VendorEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: vendor, isLoading, error } = useApiQuery<any>(
    'vendor.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const createMutation = useCreateMutation<any>('vendor');
  const updateMutation = useUpdateMutation<any>('vendor');
  const deleteMutation = useDeleteVendors();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(VendorFormSchema),
    mode: 'onChange',
    defaultValues: vendorToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (vendor) form.reset(vendorToFormValues(vendor));
  }, [vendor, form]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = values?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<VendorFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as VendorFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(vendorValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: vendorValuesToUpdateData(data as VendorFormValues) }),
    getRecordId: (record) => record?.vendorId ?? null,
    onCreated: (record) => {
      const newId = record?.vendorId;
      if (typeof newId === 'string' && newId.length > 0) navigate(`/vendors/${newId}`, { replace: true });
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
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${form.getValues('vendorName') || 'this vendor'}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/vendors');
    } catch (err) {
      console.error('Failed to delete vendor:', err);
      alert('Failed to delete vendor. They may have associated orders or products.');
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
        <p className="text-muted-foreground">Failed to load vendor</p>
        <Button variant="outline" onClick={() => navigate('/vendors')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vendors
        </Button>
      </div>
    );
  }

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
                  navigate('/vendors');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Vendors
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
                    navigate('/vendors');
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
                      Deactivate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDelete}
                      disabled={isNew}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Vendor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Input
                    {...form.register('vendorName')}
                    placeholder="Vendor Name"
                    className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {values?.vendorType && <span>{values.vendorType}</span>}
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
                        layoutId="activeVendorTab"
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
                {activeTab === 'details' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Vendor Type" required>
                          <Controller
                            control={form.control}
                            name="vendorType"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Broadline Distributor'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select vendor type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {VendorTypeEnum.options.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Contact Name">
                          <Input {...form.register('contactName')} placeholder="Optional" className="bg-background/50" />
                        </FormField>

                        <FormField label="Phone" required icon={Phone}>
                          <Input {...form.register('phone')} placeholder="Required" className="bg-background/50" />
                        </FormField>

                        <FormField label="Email" icon={Mail}>
                          <Input type="email" {...form.register('email')} placeholder="Optional" className="bg-background/50" />
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
                                  {VendorStatusEnum.options.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
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
                          <MapPin className="w-4 h-4 text-primary" />
                          Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Street Address">
                          <Input {...form.register('address')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField label="City">
                            <Input {...form.register('city')} placeholder="Optional" className="bg-background/50" />
                          </FormField>
                          <FormField label="State">
                            <Input {...form.register('state')} placeholder="Optional" className="bg-background/50" />
                          </FormField>
                          <FormField label="ZIP">
                            <Input {...form.register('zip')} placeholder="Optional" className="bg-background/50 font-mono" />
                          </FormField>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'logistics' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          Delivery
                        </CardTitle>
                        <CardDescription>Ordering cadence and lead time</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Delivery Days" hint="e.g., Mon, Wed, Fri">
                          <Input {...form.register('deliveryDays')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                        <FormField label="Delivery Lead Time (days)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('deliveryLeadTimeDays', { setValueAs: numberField })}
                            placeholder="e.g., 2"
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Minimum Order
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Minimum Order ($)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('minimumOrder', { setValueAs: numberField })}
                            placeholder="e.g., 250"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Payment Terms" hint="Optional">
                          <Input {...form.register('paymentTerms')} placeholder="e.g., Net 30" className="bg-background/50" />
                        </FormField>
                        <FormField label="Account Number" hint="Optional">
                          <Input {...form.register('accountNumber')} placeholder="Optional" className="bg-background/50 font-mono" />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'contract' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Contract Dates
                        </CardTitle>
                        <CardDescription>Optional tracking fields</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Contract Start Date" hint="YYYY-MM-DD (optional)">
                          <Input {...form.register('contractStartDate')} placeholder="2026-01-01" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Contract End Date" hint="YYYY-MM-DD (optional)">
                          <Input {...form.register('contractEndDate')} placeholder="2026-12-31" className="bg-background/50 font-mono" />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          Performance & Compliance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Performance Rating (0–5)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            {...form.register('performanceRating', { setValueAs: numberField })}
                            placeholder="e.g., 4.5"
                            className="bg-background/50"
                          />
                        </FormField>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border">
                          <input
                            type="checkbox"
                            checked={!!values?.insuranceOnFile}
                            onChange={(e) =>
                              form.setValue('insuranceOnFile', e.target.checked, { shouldDirty: true, shouldValidate: true })
                            }
                            className="rounded border-primary/50 text-primary focus:ring-primary"
                          />
                          <div>
                            <label className="text-sm font-medium">Insurance On File</label>
                            <p className="text-xs text-muted-foreground">Compliance tracking</p>
                          </div>
                        </div>
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
                        <FormField label="Notes">
                          <Textarea {...form.register('notes')} placeholder="Notes about this vendor..." className="bg-background/50 min-h-[180px]" />
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

export default VendorEditPage;


