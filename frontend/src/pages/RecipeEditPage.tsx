/**
 * Recipe Edit Page (rebuilt)
 *
 * Aligns with backend `recipe` router schemas and uses RHF + Zod + debounced autosave.
 * Includes basic ingredient management via `recipe.addIngredient/removeIngredient`.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChefHat,
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
  Package,
  Flame,
  Plus,
  DollarSign,
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
import { useApiMutation, useApiQuery, useCreateMutation, useUpdateMutation, useDeleteRecipes } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CookingMethodEnum,
  CuisineTypeEnum,
  RecipeCategoryEnum,
  RecipeFormSchema,
  recipeToFormValues,
  recipeValuesToCreateInput,
  recipeValuesToUpdateData,
  type RecipeFormValues,
} from '../schemas/recipe';

const tabs = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'ingredients', label: 'Ingredients', icon: Package },
  { id: 'method', label: 'Method', icon: Flame },
  { id: 'haccp', label: 'HACCP', icon: AlertTriangle },
  { id: 'notes', label: 'Notes', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Draft: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Archived: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
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

export function RecipeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: recipe, isLoading, error } = useApiQuery<any>(
    'recipe.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const { data: ingredients } = useApiQuery<any[]>('ingredient.list', {});
  const { data: units } = useApiQuery<any[]>('unit.list', {});

  const createMutation = useCreateMutation<any>('recipe');
  const updateMutation = useUpdateMutation<any>('recipe');
  const deleteMutation = useDeleteRecipes();
  const addIngredientMutation = useApiMutation<any, any>('recipe.addIngredient');
  const removeIngredientMutation = useApiMutation<any, any>('recipe.removeIngredient');

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(RecipeFormSchema),
    mode: 'onChange',
    defaultValues: recipeToFormValues(null),
  });

  const [newIngredientId, setNewIngredientId] = useState<string>('');
  const [newUnitId, setNewUnitId] = useState<string>('');
  const [newQty, setNewQty] = useState<string>('1');
  const [newApEp, setNewApEp] = useState<'AP' | 'EP'>('EP');
  const [newPrep, setNewPrep] = useState<string>('');

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (recipe) {
      form.reset(recipeToFormValues(recipe));
      // seed default unit selection for add ingredient
      if (!newUnitId && Array.isArray(units) && units.length > 0) setNewUnitId(units[0].unitId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, form]);

  React.useEffect(() => {
    if (!newUnitId && Array.isArray(units) && units.length > 0) setNewUnitId(units[0].unitId);
  }, [newUnitId, units]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = recipe?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<RecipeFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as RecipeFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(recipeValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: recipeValuesToUpdateData(data as RecipeFormValues) }),
    getRecordId: (record) => record?.recipeId ?? null,
    onCreated: (record) => {
      const newId = record?.recipeId;
      if (typeof newId === 'string' && newId.length > 0) navigate(`/recipes/${newId}`, { replace: true });
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
      `Are you sure you want to permanently delete "${form.getValues('recipeName') || 'this recipe'}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/recipes');
    } catch (err) {
      console.error('Failed to delete recipe:', err);
      alert('Failed to delete recipe. It may be used in menus.');
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
        <p className="text-muted-foreground">Failed to load recipe</p>
        <Button variant="outline" onClick={() => navigate('/recipes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Recipes
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
                  navigate('/recipes');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Recipes
              </Button>

              <div className="flex items-center gap-2">
                {headerStatus && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={headerStatus.className}
                  >
                    {headerStatus.text}
                  </motion.span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
                    navigate('/recipes');
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
                      Delete Recipe
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Input
                    {...form.register('recipeName')}
                    placeholder="Recipe Name"
                    className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {values?.category ?? ''}{values?.cuisineType ? ` • ${values.cuisineType}` : ''}{values?.recipeCode ? ` • ${values.recipeCode}` : ''}
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
                        layoutId="activeRecipeTab"
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
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Classification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Category" required>
                          <Controller
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <Select value={field.value ?? 'Entrée'} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {RecipeCategoryEnum.options.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Cuisine Type" hint="Optional">
                          <Controller
                            control={form.control}
                            name="cuisineType"
                            render={({ field }) => (
                              <Select value={field.value || '_none'} onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">None</SelectItem>
                                  {CuisineTypeEnum.options.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Recipe Code" hint="Optional (internal code)">
                          <Input {...form.register('recipeCode')} placeholder="Optional" className="bg-background/50 font-mono" />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Yield & Portions
                        </CardTitle>
                        <CardDescription>Controls scaling and portioning</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField label="Yield Quantity" required>
                            <Input
                              type="number"
                              inputMode="decimal"
                              {...form.register('yieldQuantity', { setValueAs: numberField })}
                              className="bg-background/50"
                            />
                          </FormField>
                          <FormField label="Yield Unit" required hint="e.g., portions, pans">
                            <Input {...form.register('yieldUnit')} placeholder="portions" className="bg-background/50" />
                          </FormField>
                        </div>

                        <FormField label="Portion Size" required hint="e.g., 4 oz, 1 slice">
                          <Input {...form.register('portionSize')} placeholder="e.g., 1 cup" className="bg-background/50" />
                        </FormField>

                        <FormField label="Portion Utensil" hint="Optional (e.g., #16 scoop)">
                          <Input {...form.register('portionUtensil')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'ingredients' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          Ingredients
                        </CardTitle>
                        <CardDescription>Basic management; deeper tooling comes next</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(recipe?.ingredients ?? []).length === 0 && (
                          <div className="text-sm text-muted-foreground">No ingredients yet.</div>
                        )}

                        {(recipe?.ingredients ?? []).map((ri: any) => (
                          <div
                            key={ri.recipeIngredientId ?? `${ri.ingredientId}-${ri.sequenceOrder ?? ''}`}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/30 border border-border"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {ri.ingredientName ?? ri.ingredientId}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ri.quantity} {ri.unitId} {ri.isApOrEp ? `(${ri.isApOrEp})` : ''}{ri.prepInstruction ? ` • ${ri.prepInstruction}` : ''}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={!ri.recipeIngredientId || removeIngredientMutation.isPending}
                              onClick={() => {
                                if (!ri.recipeIngredientId) return;
                                if (!window.confirm('Remove this ingredient from the recipe?')) return;
                                removeIngredientMutation.mutate({ recipeIngredientId: ri.recipeIngredientId });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Plus className="w-4 h-4 text-primary" />
                          Add Ingredient
                        </CardTitle>
                        <CardDescription>Requires saved recipe first</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Ingredient" required>
                          <Select value={newIngredientId} onValueChange={setNewIngredientId} disabled={isNew}>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue placeholder={isNew ? 'Save recipe first' : 'Select ingredient'} />
                            </SelectTrigger>
                            <SelectContent>
                              {(ingredients ?? []).map((i: any) => (
                                <SelectItem key={i.ingredientId} value={i.ingredientId}>
                                  {i.ingredientName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField label="Quantity" required>
                            <Input value={newQty} onChange={(e) => setNewQty(e.target.value)} className="bg-background/50 font-mono" />
                          </FormField>
                          <FormField label="Unit" required>
                            <Select value={newUnitId} onValueChange={setNewUnitId} disabled={isNew}>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {(units ?? []).map((u: any) => (
                                  <SelectItem key={u.unitId} value={u.unitId}>
                                    {u.unitAbbreviation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField label="AP/EP" hint="Optional">
                            <Select value={newApEp} onValueChange={(v) => setNewApEp(v as any)} disabled={isNew}>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="EP" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EP">EP</SelectItem>
                                <SelectItem value="AP">AP</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormField>
                          <FormField label="Prep Instruction" hint="Optional">
                            <Input value={newPrep} onChange={(e) => setNewPrep(e.target.value)} className="bg-background/50" />
                          </FormField>
                        </div>

                        <Button
                          className="bg-primary hover:bg-primary/90"
                          disabled={isNew || addIngredientMutation.isPending || !id || id === 'new' || !newIngredientId || !newUnitId}
                          onClick={() => {
                            if (!id || id === 'new') return;
                            const qty = Number(newQty);
                            if (!Number.isFinite(qty) || qty <= 0) {
                              window.alert('Quantity must be a positive number.');
                              return;
                            }
                            addIngredientMutation.mutate(
                              {
                                recipeId: id,
                                ingredient: {
                                  ingredientId: newIngredientId,
                                  quantity: qty,
                                  unitId: newUnitId,
                                  isApOrEp: newApEp,
                                  prepInstruction: newPrep || undefined,
                                },
                              },
                              {
                                onSuccess: () => {
                                  setNewPrep('');
                                  setNewQty('1');
                                },
                              }
                            );
                          }}
                        >
                          Add Ingredient
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'method' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Flame className="w-4 h-4 text-primary" />
                          Cooking
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Cooking Method" hint="Optional">
                          <Controller
                            control={form.control}
                            name="cookingMethod"
                            render={({ field }) => (
                              <Select value={field.value || '_none'} onValueChange={(v) => field.onChange(v === '_none' ? undefined : v)}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">None</SelectItem>
                                  {CookingMethodEnum.options.map((m) => (
                                    <SelectItem key={m} value={m}>
                                      {m}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField label="Prep (min)" hint="Optional">
                            <Input
                              type="number"
                              inputMode="numeric"
                              {...form.register('prepTimeMinutes', { setValueAs: numberField })}
                              className="bg-background/50"
                            />
                          </FormField>
                          <FormField label="Cook (min)" hint="Optional">
                            <Input
                              type="number"
                              inputMode="numeric"
                              {...form.register('cookTimeMinutes', { setValueAs: numberField })}
                              className="bg-background/50"
                            />
                          </FormField>
                          <FormField label="Temp (°F)" hint="Optional">
                            <Input
                              type="number"
                              inputMode="numeric"
                              {...form.register('cookingTempF', { setValueAs: numberField })}
                              className="bg-background/50"
                            />
                          </FormField>
                        </div>

                        <FormField label="Equipment Required" hint="Optional">
                          <Textarea
                            {...form.register('equipmentRequired')}
                            placeholder="Optional"
                            className="bg-background/50 min-h-[120px] font-mono text-sm"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          Pan & Batch
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Pan Size" hint="Optional">
                          <Input {...form.register('panSize')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                        <FormField label="Pans per Batch" hint="Optional">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('pansPerBatch', { setValueAs: numberField })}
                            className="bg-background/50"
                          />
                        </FormField>
                        <FormField label="Weight per Pan" hint="Optional">
                          <Input {...form.register('weightPerPan')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'haccp' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-primary" />
                          Critical Limits
                        </CardTitle>
                        <CardDescription>Optional HACCP notes and targets</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="HACCP Critical Limits" hint="Optional">
                          <Textarea
                            {...form.register('haccpCriticalLimits')}
                            placeholder="Optional"
                            className="bg-background/50 min-h-[160px]"
                          />
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField label="Hold Temp (°F)" hint="Optional">
                            <Input
                              type="number"
                              inputMode="numeric"
                              {...form.register('holdTempF', { setValueAs: numberField })}
                              className="bg-background/50"
                            />
                          </FormField>
                          <FormField label="Max Hold (hours)" hint="Optional">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.25"
                              {...form.register('maxHoldTimeHours', { setValueAs: numberField })}
                              className="bg-background/50"
                            />
                          </FormField>
                        </div>
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
                          Variations & Source
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Variations" hint="Optional">
                          <Textarea {...form.register('variations')} placeholder="Optional" className="bg-background/50 min-h-[120px]" />
                        </FormField>
                        <FormField label="Source" hint="Optional">
                          <Input {...form.register('source')} placeholder="Optional" className="bg-background/50" />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Notes" hint="Optional">
                          <Textarea {...form.register('notes')} placeholder="Optional" className="bg-background/50 min-h-[200px]" />
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

export default RecipeEditPage;


