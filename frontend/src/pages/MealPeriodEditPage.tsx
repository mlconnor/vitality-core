/**
 * Meal Period Edit Page (rebuilt)
 *
 * Aligns with DB schema `meal_periods` and uses RHF + Zod + debounced autosave.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
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
import { useApiQuery, useCreateMutation, useUpdateMutation, useDeleteMealPeriods } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MealPeriodFormSchema,
  mealPeriodToFormValues,
  mealPeriodValuesToCreateInput,
  mealPeriodValuesToUpdateData,
  type MealPeriodFormValues,
} from '../schemas/mealPeriod';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'notes', label: 'Notes', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const requiredConfig: Record<string, { color: string; bg: string }> = {
  Required: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Optional: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
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

export function MealPeriodEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: mp, isLoading, error } = useApiQuery<any>(
    'mealPeriod.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const createMutation = useCreateMutation<any>('mealPeriod');
  const updateMutation = useUpdateMutation<any>('mealPeriod');
  const deleteMutation = useDeleteMealPeriods();

  const form = useForm<MealPeriodFormValues>({
    resolver: zodResolver(MealPeriodFormSchema),
    mode: 'onChange',
    defaultValues: mealPeriodToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (mp) form.reset(mealPeriodToFormValues(mp));
  }, [mp, form]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const requiredLabel = values?.isRequired ? 'Required' : 'Optional';
  const requiredStyle = requiredConfig[requiredLabel];

  const autosave = useAutosaveEntityForm<MealPeriodFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as MealPeriodFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(mealPeriodValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: mealPeriodValuesToUpdateData(data as MealPeriodFormValues) }),
    getRecordId: (record) => record?.mealPeriodId ?? null,
    onCreated: (record) => {
      const newId = record?.mealPeriodId;
      if (typeof newId === 'string' && newId.length > 0) navigate(`/meal-periods/${newId}`, { replace: true });
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
      `Are you sure you want to permanently delete "${form.getValues('mealPeriodName') || 'this meal period'}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/meal-periods');
    } catch (err) {
      console.error('Failed to delete meal period:', err);
      alert('Failed to delete meal period. It may be used in menus.');
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
        <p className="text-muted-foreground">Failed to load meal period</p>
        <Button variant="outline" onClick={() => navigate('/meal-periods')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meal Periods
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
                  navigate('/meal-periods');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Meal Periods
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
                    navigate('/meal-periods');
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
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDelete}
                      disabled={isNew}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Meal Period
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Input
                    {...form.register('mealPeriodName')}
                    placeholder="Meal Period Name"
                    className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <Badge className={`${requiredStyle.bg} ${requiredStyle.color} border`}>{requiredLabel}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {(values?.typicalStartTime && values?.typicalEndTime) ? `${values.typicalStartTime}–${values.typicalEndTime}` : ''}
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
                        layoutId="activeMealPeriodTab"
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
                          <Clock className="w-4 h-4 text-primary" />
                          Times
                        </CardTitle>
                        <CardDescription>Stored as text (e.g., 07:00, 12:30)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Typical Start Time" required hint="e.g., 07:00">
                          <Input {...form.register('typicalStartTime')} placeholder="07:00" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Typical End Time" required hint="e.g., 09:30">
                          <Input {...form.register('typicalEndTime')} placeholder="09:30" className="bg-background/50 font-mono" />
                        </FormField>
                        <FormField label="Sort Order" required hint="Display ordering across the day">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('sortOrder', { setValueAs: numberField })}
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Targets
                        </CardTitle>
                        <CardDescription>Optional calorie targets for planning</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Target Calories (min)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('targetCaloriesMin', { setValueAs: numberField })}
                            placeholder="e.g., 350"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Target Calories (max)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('targetCaloriesMax', { setValueAs: numberField })}
                            placeholder="e.g., 650"
                            className="bg-background/50"
                          />
                        </FormField>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border">
                          <input
                            type="checkbox"
                            checked={!!values?.isRequired}
                            onChange={(e) =>
                              form.setValue('isRequired', e.target.checked, { shouldDirty: true, shouldValidate: true })
                            }
                            className="rounded border-primary/50 text-primary focus:ring-primary"
                          />
                          <div>
                            <label className="text-sm font-medium">Required Meal Period</label>
                            <p className="text-xs text-muted-foreground">Main meal vs optional snacks</p>
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
                          <Textarea {...form.register('notes')} placeholder="Notes about this meal period..." className="bg-background/50 min-h-[180px]" />
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

export default MealPeriodEditPage;


