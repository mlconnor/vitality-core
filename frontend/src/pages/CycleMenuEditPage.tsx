/**
 * Cycle Menu Edit Page (rebuilt)
 *
 * Aligns with DB schema `cycle_menus` and uses RHF + Zod + debounced autosave.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarRange,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  FileText,
  Settings,
  DollarSign,
  Leaf,
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
import { useApiQuery, useCreateMutation, useUpdateMutation } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CycleMenuFormSchema,
  CycleMenuSeasonEnum,
  CycleMenuStatusEnum,
  cycleMenuToFormValues,
  cycleMenuValuesToCreateInput,
  cycleMenuValuesToUpdateData,
  type CycleMenuFormValues,
} from '../schemas/cycleMenu';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'targets', label: 'Targets', icon: DollarSign },
  { id: 'notes', label: 'Notes', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Draft: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Archived: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
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

export function CycleMenuEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: cycleMenu, isLoading, error } = useApiQuery<any>(
    'cycleMenu.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const { data: sites } = useApiQuery<any[]>('site.list', {});

  const createMutation = useCreateMutation<any>('cycleMenu');
  const updateMutation = useUpdateMutation<any>('cycleMenu');

  const form = useForm<CycleMenuFormValues>({
    resolver: zodResolver(CycleMenuFormSchema),
    mode: 'onChange',
    defaultValues: cycleMenuToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (cycleMenu) form.reset(cycleMenuToFormValues(cycleMenu));
  }, [cycleMenu, form]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = values?.status ?? 'Draft';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Draft;

  const autosave = useAutosaveEntityForm<CycleMenuFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as CycleMenuFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(cycleMenuValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: cycleMenuValuesToUpdateData(data as CycleMenuFormValues) }),
    getRecordId: (record) => record?.cycleMenuId ?? null,
    onCreated: (record) => {
      const newId = record?.cycleMenuId;
      if (typeof newId === 'string' && newId.length > 0) navigate(`/cycle-menus/${newId}`, { replace: true });
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
        <p className="text-muted-foreground">Failed to load cycle menu</p>
        <Button variant="outline" onClick={() => navigate('/cycle-menus')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cycle Menus
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
                  navigate('/cycle-menus');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cycle Menus
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
                    navigate('/cycle-menus');
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
                    <DropdownMenuItem className="text-destructive">
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <CalendarRange className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Input
                    {...form.register('cycleName')}
                    placeholder="Cycle Name"
                    className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {values?.season ?? ''}{values?.cycleLengthWeeks ? ` • ${values.cycleLengthWeeks} weeks` : ''}{values?.siteId ? ` • Site-scoped` : ' • All sites'}
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
                        layoutId="activeCycleMenuTab"
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
                          <Leaf className="w-4 h-4 text-primary" />
                          Cycle Setup
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Season" required>
                          <Controller
                            control={form.control}
                            name="season"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Year-Round'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select season" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CycleMenuSeasonEnum.options.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Cycle Length (weeks)" required>
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('cycleLengthWeeks', { setValueAs: numberField })}
                            className="bg-background/50"
                          />
                        </FormField>

                        <FormField label="Start Date" required hint="YYYY-MM-DD">
                          <Input {...form.register('startDate')} placeholder="2026-02-04" className="bg-background/50 font-mono" />
                        </FormField>

                        <FormField label="End Date" hint="YYYY-MM-DD (optional)">
                          <Input {...form.register('endDate')} placeholder="Optional" className="bg-background/50 font-mono" />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Scope & Approval
                        </CardTitle>
                        <CardDescription>Site scoping and approval tracking</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Site Scope" hint="Optional; leave blank for all sites">
                          <Controller
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || '')}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="All sites" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All sites</SelectItem>
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

                        <FormField label="Status" required>
                          <Controller
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Draft'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CycleMenuStatusEnum.options.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField label="Approved By" hint="Optional">
                            <Input {...form.register('approvedBy')} placeholder="Optional" className="bg-background/50" />
                          </FormField>
                          <FormField label="Approval Date" hint="YYYY-MM-DD (optional)">
                            <Input {...form.register('approvalDate')} placeholder="Optional" className="bg-background/50 font-mono" />
                          </FormField>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'targets' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Budget Target
                        </CardTitle>
                        <CardDescription>Optional target food cost per meal</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Target Food Cost per Meal ($)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('targetFoodCostPerMeal', { setValueAs: numberField })}
                            placeholder="e.g., 3.25"
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Notes">
                          <Textarea {...form.register('notes')} placeholder="Notes about this cycle..." className="bg-background/50 min-h-[160px]" />
                        </FormField>
                        <FormField label="AI Context Notes" hint="Used by AI menu planning/production">
                          <Textarea {...form.register('llmNotes')} placeholder="Context for AI..." className="bg-background/50 min-h-[160px]" />
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

export default CycleMenuEditPage;


