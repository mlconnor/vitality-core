/**
 * Ingredient Edit Page (rebuilt)
 *
 * Aligns with DB schema `ingredients` and uses RHF + Zod + debounced autosave.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
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
  DollarSign,
  Warehouse,
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
import { useApiQuery, useCreateMutation, useUpdateMutation, useDeleteIngredients } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  IngredientFormSchema,
  IngredientStatusEnum,
  IngredientStorageTypeEnum,
  ingredientToFormValues,
  ingredientValuesToCreateInput,
  ingredientValuesToUpdateData,
  type IngredientFormValues,
} from '../schemas/ingredient';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'costing', label: 'Costing', icon: DollarSign },
  { id: 'storage', label: 'Storage', icon: Warehouse },
  { id: 'notes', label: 'Notes', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Discontinued: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  Seasonal: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
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

export function IngredientEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: ingredient, isLoading, error } = useApiQuery<any>(
    'ingredient.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const { data: categories } = useApiQuery<any[]>('foodCategory.list', {});
  const { data: units } = useApiQuery<any[]>('unit.list', {});
  const { data: vendors } = useApiQuery<any[]>('vendor.list', {});

  const createMutation = useCreateMutation<any>('ingredient');
  const updateMutation = useUpdateMutation<any>('ingredient');
  const deleteMutation = useDeleteIngredients();

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(IngredientFormSchema),
    mode: 'onChange',
    defaultValues: ingredientToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (ingredient) form.reset(ingredientToFormValues(ingredient));
  }, [ingredient, form]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = values?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<IngredientFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as IngredientFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(ingredientValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: ingredientValuesToUpdateData(data as IngredientFormValues) }),
    getRecordId: (record) => record?.ingredientId ?? null,
    onCreated: (record) => {
      const newId = record?.ingredientId;
      if (typeof newId === 'string' && newId.length > 0) navigate(`/ingredients/${newId}`, { replace: true });
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
      `Are you sure you want to permanently delete "${form.getValues('ingredientName') || 'this ingredient'}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/ingredients');
    } catch (err) {
      console.error('Failed to delete ingredient:', err);
      alert('Failed to delete ingredient. It may be used in recipes.');
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
        <p className="text-muted-foreground">Failed to load ingredient</p>
        <Button variant="outline" onClick={() => navigate('/ingredients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ingredients
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
                  navigate('/ingredients');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ingredients
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
                    navigate('/ingredients');
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
                      Delete Ingredient
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Input
                    {...form.register('ingredientName')}
                    placeholder="Ingredient Name"
                    className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {values?.storageType ?? ''}{values?.fdcId ? ` • FDC ${values.fdcId}` : ''}
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
                        layoutId="activeIngredientTab"
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
                          Classification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Food Category" required>
                          <Controller
                            control={form.control}
                            name="foodCategoryId"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(categories ?? []).map((c: any) => (
                                    <SelectItem key={c.categoryId} value={c.categoryId}>
                                      {c.categoryName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Storage Type" required>
                          <Controller
                            control={form.control}
                            name="storageType"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Dry'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select storage type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {IngredientStorageTypeEnum.options.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
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
                              <Select value={field.value ?? 'Active'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {IngredientStatusEnum.options.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="FDC ID" hint="Optional (USDA FoodData Central)">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('fdcId', { setValueAs: numberField })}
                            placeholder="Optional"
                            className="bg-background/50 font-mono"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Units
                        </CardTitle>
                        <CardDescription>How this ingredient is measured and purchased</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Common Unit" required hint="Used in recipes (e.g., lb, cup)">
                          <Controller
                            control={form.control}
                            name="commonUnit"
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(units ?? []).map((u: any) => (
                                    <SelectItem key={u.unitId} value={u.unitId}>
                                      {u.unitName} ({u.unitAbbreviation})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Purchase Unit" required hint="e.g., case, bag, each">
                          <Input {...form.register('purchaseUnit')} placeholder="case" className="bg-background/50" />
                        </FormField>

                        <FormField label="Preferred Vendor" hint="Optional">
                          <Controller
                            control={form.control}
                            name="preferredVendorId"
                            render={({ field }) => (
                              <Select value={field.value || '_none'} onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">None</SelectItem>
                                  {(vendors ?? []).map((v: any) => (
                                    <SelectItem key={v.vendorId} value={v.vendorId}>
                                      {v.vendorName}
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

                {activeTab === 'costing' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Cost Inputs
                        </CardTitle>
                        <CardDescription>Optional; can be derived by automation later</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Purchase Unit Cost" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('purchaseUnitCost', { setValueAs: numberField })}
                            placeholder="e.g., 54.99"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Units per Purchase Unit" hint="Optional (common units per purchase unit)">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('unitsPerPurchaseUnit', { setValueAs: numberField })}
                            placeholder="e.g., 40"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Cost per Common Unit" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('costPerUnit', { setValueAs: numberField })}
                            placeholder="Optional"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Yield Percent" hint="Optional (0.0–1.0)">
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            {...form.register('yieldPercent', { setValueAs: numberField })}
                            placeholder="e.g., 0.81"
                            className="bg-background/50 font-mono"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Flags
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border">
                          <input
                            type="checkbox"
                            checked={!!values?.isLocal}
                            onChange={(e) => form.setValue('isLocal', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                            className="rounded border-primary/50 text-primary focus:ring-primary"
                          />
                          <div>
                            <label className="text-sm font-medium">Locally Sourced</label>
                            <p className="text-xs text-muted-foreground">Mark for reporting/menus</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border">
                          <input
                            type="checkbox"
                            checked={!!values?.isOrganic}
                            onChange={(e) => form.setValue('isOrganic', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                            className="rounded border-primary/50 text-primary focus:ring-primary"
                          />
                          <div>
                            <label className="text-sm font-medium">Organic Certified</label>
                            <p className="text-xs text-muted-foreground">Mark for purchasing/reporting</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border">
                          <input
                            type="checkbox"
                            checked={!!values?.usdaCommodity}
                            onChange={(e) =>
                              form.setValue('usdaCommodity', e.target.checked, { shouldDirty: true, shouldValidate: true })
                            }
                            className="rounded border-primary/50 text-primary focus:ring-primary"
                          />
                          <div>
                            <label className="text-sm font-medium">USDA Commodity</label>
                            <p className="text-xs text-muted-foreground">Primarily for school nutrition programs</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'storage' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-primary" />
                          Inventory Parameters
                        </CardTitle>
                        <CardDescription>Optional par/reorder configuration</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Shelf Life (days)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('shelfLifeDays', { setValueAs: numberField })}
                            placeholder="e.g., 7"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Par Level" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('parLevel', { setValueAs: numberField })}
                            placeholder="Optional"
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Reorder Point" hint="Optional">
                          <Input
                            type="number"
                            inputMode="decimal"
                            {...form.register('reorderPoint', { setValueAs: numberField })}
                            placeholder="Optional"
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Allergen Flags
                        </CardTitle>
                        <CardDescription>Comma-separated allergen codes (optional)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Allergen Flags" hint="e.g., ALG-MILK,ALG-EGG">
                          <Input {...form.register('allergenFlags')} placeholder="Optional" className="bg-background/50 font-mono" />
                        </FormField>
                        <div className="text-xs text-muted-foreground">
                          Tip: allergen ids are in the reference table (`allergen.list`) if you want to standardize values.
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
                          <Textarea {...form.register('notes')} placeholder="Notes about this ingredient..." className="bg-background/50 min-h-[180px]" />
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

export default IngredientEditPage;


