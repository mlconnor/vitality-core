/**
 * Diner Edit Page (rebuilt)
 *
 * Aligns with DB schema `diners` + respects backend business logic:
 * - `diner.update` does NOT allow diet fields (must use `diner.changeDiet`)
 * - `diner.create` requires an initial diet assignment
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
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
  HeartPulse,
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
import { useApiMutation, useApiQuery, useCreateMutation, useUpdateMutation, useDeleteDiners } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DinerFormSchema,
  dinerToFormValues,
  dinerValuesToCreateInput,
  dinerValuesToUpdateData,
  type DinerFormValues,
} from '../schemas/diner';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'diet', label: 'Diet Order', icon: HeartPulse },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'notes', label: 'Notes', icon: FileText },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'On Leave': { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Discharged: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
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

export function DinerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: diner, isLoading, error } = useApiQuery<any>(
    'diner.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const { data: sites } = useApiQuery<any[]>('site.list', {});
  const { data: dietTypes } = useApiQuery<any[]>('dietType.list', {});

  const createMutation = useCreateMutation<any>('diner');
  const updateMutation = useUpdateMutation<any>('diner');
  const deleteMutation = useDeleteDiners();
  const changeDietMutation = useApiMutation<any, any>('diner.changeDiet');

  const form = useForm<DinerFormValues>({
    resolver: zodResolver(DinerFormSchema),
    mode: 'onChange',
    defaultValues: dinerToFormValues(null),
  });

  React.useEffect(() => {
    if (diner) form.reset(dinerToFormValues(diner));
  }, [diner, form]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = values?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<DinerFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as DinerFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(dinerValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: dinerValuesToUpdateData(data as DinerFormValues) }),
    getRecordId: (record) => record?.dinerId ?? null,
    onCreated: (record) => {
      const newId = record?.dinerId;
      if (typeof newId === 'string' && newId.length > 0) navigate(`/diners/${newId}`, { replace: true });
      // If llmNotes was filled before create, persist it via update (create schema does not accept it).
      const current = form.getValues();
      if (current.llmNotes && typeof newId === 'string' && newId.length > 0) {
        void updateMutation.mutateAsync({ id: newId, data: { llmNotes: current.llmNotes } });
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
    const name = `${form.getValues('firstName') || ''} ${form.getValues('lastName') || ''}`.trim() || 'this diner';
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/diners');
    } catch (err) {
      console.error('Failed to delete diner:', err);
      alert('Failed to delete diner. They may have associated data.');
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
        <p className="text-muted-foreground">Failed to load diner</p>
        <Button variant="outline" onClick={() => navigate('/diners')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Diners
        </Button>
      </div>
    );
  }

  const fullName = [values?.firstName, values?.lastName].filter(Boolean).join(' ') || 'Diner';

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
                  navigate('/diners');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Diners
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
                    navigate('/diners');
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
                      Discharge
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDelete}
                      disabled={isNew}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Diner
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
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
                  {values?.dinerType && <span>{values.dinerType}</span>}
                  {values?.roomNumber && <span>Room {values.roomNumber}</span>}
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
                        layoutId="activeDinerTab"
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
            {(autosave.status === 'error' && autosave.lastError) && (
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
                          Basic Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Site" required>
                          <Controller
                            control={form.control}
                            name="siteId"
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

                        <FormField label="Diner Type" required>
                          <Controller
                            control={form.control}
                            name="dinerType"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Patient'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Patient">Patient</SelectItem>
                                  <SelectItem value="Student">Student</SelectItem>
                                  <SelectItem value="Resident">Resident</SelectItem>
                                  <SelectItem value="Staff">Staff</SelectItem>
                                  <SelectItem value="Visitor">Visitor</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Room Number" hint="Optional (healthcare)">
                          <Input {...form.register('roomNumber')} placeholder="e.g., 4B-12" className="bg-background/50" />
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
                                  <SelectItem value="Discharged">Discharged</SelectItem>
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
                          <Settings className="w-4 h-4 text-primary" />
                          Dates & Tracking
                        </CardTitle>
                        <CardDescription>Admission/enrollment and identifiers</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Admission Date" hint="YYYY-MM-DD (optional)">
                          <Input {...form.register('admissionDate')} placeholder="2026-02-04" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Expected Discharge Date" hint="YYYY-MM-DD (optional)">
                          <Input {...form.register('expectedDischargeDate')} placeholder="2026-02-10" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Meal Ticket Number" hint="Optional">
                          <Input {...form.register('mealTicketNumber')} placeholder="Optional" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Physician" hint="Optional (healthcare)">
                          <Input {...form.register('physician')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'diet' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <HeartPulse className="w-4 h-4 text-primary" />
                          Current Diet
                        </CardTitle>
                        <CardDescription>Primary diet + texture/liquid requirements</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Diet Type" required>
                          <Controller
                            control={form.control}
                            name="primaryDietTypeId"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select diet type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(dietTypes ?? []).map((d: any) => (
                                    <SelectItem key={d.dietTypeId} value={d.dietTypeId}>
                                      {d.dietTypeName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Texture Modification" hint="Optional">
                          <Controller
                            control={form.control}
                            name="textureModification"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Regular">Regular</SelectItem>
                                  <SelectItem value="Mechanical Soft">Mechanical Soft</SelectItem>
                                  <SelectItem value="Pureed">Pureed</SelectItem>
                                  <SelectItem value="Ground">Ground</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Liquid Consistency" hint="Optional">
                          <Controller
                            control={form.control}
                            name="liquidConsistency"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Regular">Regular</SelectItem>
                                  <SelectItem value="Thickened-Nectar">Thickened-Nectar</SelectItem>
                                  <SelectItem value="Thickened-Honey">Thickened-Honey</SelectItem>
                                  <SelectItem value="NPO">NPO</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        {!isNew && (
                          <div className="rounded-lg border border-border bg-background/30 p-3 text-xs text-muted-foreground">
                            Diet fields are saved via autosave on create. For existing diners, use “Change Diet” below (audit trail).
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Change Diet (Audit Trail)
                        </CardTitle>
                        <CardDescription>Creates a diet assignment record via `diner.changeDiet`</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Effective Date" hint="YYYY-MM-DD">
                          <Input id="dietEffectiveDate" placeholder="2026-02-04" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Ordered By" hint="Required for changeDiet">
                          <Input id="dietOrderedBy" placeholder="e.g., Dr. Smith" className="bg-background/50" />
                        </FormField>
                        <FormField label="Reason" hint="Optional">
                          <Input id="dietReason" placeholder="Optional" className="bg-background/50" />
                        </FormField>

                        <Button
                          variant="outline"
                          disabled={isNew || changeDietMutation.isPending}
                          onClick={() => {
                            const effectiveDate = (document.getElementById('dietEffectiveDate') as HTMLInputElement | null)?.value ?? '';
                            const orderedBy = (document.getElementById('dietOrderedBy') as HTMLInputElement | null)?.value ?? '';
                            const reason = (document.getElementById('dietReason') as HTMLInputElement | null)?.value ?? '';
                            if (!id || id === 'new') return;
                            return changeDietMutation.mutate(
                              {
                                dinerId: id,
                                dietTypeId: values?.primaryDietTypeId,
                                effectiveDate,
                                orderedBy,
                                reason: reason || undefined,
                                textureModification: values?.textureModification,
                                liquidConsistency: values?.liquidConsistency,
                              },
                              {
                                onSuccess: () => {
                                  // Force refresh to show updated primary diet fields
                                  window.location.reload();
                                },
                              }
                            );
                          }}
                        >
                          {changeDietMutation.isPending ? 'Applying…' : 'Apply Diet Change'}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Preferences & Restrictions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Allergies">
                          <Textarea {...form.register('allergies')} placeholder="e.g., Milk, Egg" className="bg-background/50 min-h-[90px]" />
                        </FormField>
                        <FormField label="Dislikes">
                          <Textarea {...form.register('dislikes')} placeholder="Foods to avoid" className="bg-background/50 min-h-[90px]" />
                        </FormField>
                        <FormField label="Preferences">
                          <Textarea {...form.register('preferences')} placeholder="Foods to prefer" className="bg-background/50 min-h-[90px]" />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Instructions
                        </CardTitle>
                        <CardDescription>Feeding assistance and special notes</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Feeding Assistance" hint="Optional">
                          <Controller
                            control={form.control}
                            name="feedingAssistance"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Independent">Independent</SelectItem>
                                  <SelectItem value="Setup">Setup</SelectItem>
                                  <SelectItem value="Feeding Assist">Feeding Assist</SelectItem>
                                  <SelectItem value="Tube Fed">Tube Fed</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>
                        <FormField label="Special Instructions">
                          <Textarea
                            {...form.register('specialInstructions')}
                            placeholder="Special feeding instructions..."
                            className="bg-background/50 min-h-[140px]"
                          />
                        </FormField>
                        <FormField label="Free/Reduced Status" hint="Optional (schools)">
                          <Controller
                            control={form.control}
                            name="freeReducedStatus"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Paid">Paid</SelectItem>
                                  <SelectItem value="Free">Free</SelectItem>
                                  <SelectItem value="Reduced">Reduced</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
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
                        <CardDescription>General notes + AI context for {fullName}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Notes">
                          <Textarea {...form.register('notes')} placeholder="Notes about this diner..." className="bg-background/50 min-h-[140px]" />
                        </FormField>
                        <FormField label="AI Context Notes" hint="Used by the AI agent during planning/service">
                          <Textarea
                            {...form.register('llmNotes')}
                            placeholder="Context for AI: preferences patterns, communication style, key constraints..."
                            className="bg-background/50 min-h-[140px]"
                          />
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

export default DinerEditPage;


