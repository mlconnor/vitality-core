/**
 * Site Edit Page
 * 
 * Edit page for sites (physical locations like Main Kitchen, East Wing, etc.)
 */

import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Users,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  Settings,
  FileText,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { TooltipProvider } from '../components/ui/tooltip';
import { useApiQuery, useCreateMutation, useUpdateMutation } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import {
  formValuesToCreateInput,
  formValuesToUpdateData,
  SiteFormSchema,
  siteToFormValues,
  type SiteFormValues,
} from '../schemas/site';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'operations', label: 'Operations', icon: Settings },
  { id: 'stations', label: 'Stations', icon: LayoutGrid },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Inactive: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
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

export function SiteEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: site, isLoading, error } = useApiQuery<any>(
    'site.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const createMutation = useCreateMutation<any>('site');
  const updateMutation = useUpdateMutation<any>('site');

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(SiteFormSchema),
    mode: 'onChange',
    defaultValues: siteToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (site) {
      form.reset(siteToFormValues(site));
    }
  }, [form, site]);

  const values = useWatch({ control: form.control });

  const statusValue = values?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<SiteFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as SiteFormValues,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    debounceMs: 800,
    create: async (vals) => {
      const payload = formValuesToCreateInput(vals);
      return await createMutation.mutateAsync(payload);
    },
    update: async ({ id: recordId, data }) => {
      const payload = formValuesToUpdateData(data as SiteFormValues);
      return await updateMutation.mutateAsync({ id: recordId, data: payload });
    },
    getRecordId: (record) => record?.siteId ?? null,
    onCreated: (record) => {
      const newId = record?.siteId;
      if (typeof newId === 'string' && newId.length > 0) {
        navigate(`/sites/${newId}`, { replace: true });
      }
      // Clear dirty state once we have a persisted record
      form.reset(form.getValues());
    },
    onSaved: () => {
      // Mark current values as the new baseline (clears dirty)
      form.reset(form.getValues());
    },
  });

  const headerStatus = useMemo(() => {
    if (autosave.status === 'saving') return { text: 'Saving…', className: 'text-xs text-muted-foreground mr-2' };
    if (autosave.status === 'saved') return { text: 'Saved', className: 'text-xs text-emerald-400 mr-2' };
    if (autosave.status === 'error') return { text: 'Error saving', className: 'text-xs text-destructive mr-2' };
    if (form.formState.isDirty) return { text: 'Unsaved changes', className: 'text-xs text-amber-400 mr-2' };
    return null;
  }, [autosave.status, form.formState.isDirty]);

  // Handle save/create action
  const handleSave = React.useCallback(async () => {
    if (isNew) {
      // For new items: validate first, show errors if invalid
      const valid = await form.trigger();
      if (!valid) return;
    }
    autosave.flush();
  }, [isNew, form, autosave]);

  // Handle deactivate action
  const handleDeactivate = React.useCallback(async () => {
    if (isNew || !id) return;
    try {
      await updateMutation.mutateAsync({ id, data: { status: 'Inactive' } });
      // Update form to reflect the change
      form.setValue('status', 'Inactive', { shouldDirty: false });
    } catch (err) {
      console.error('Failed to deactivate site:', err);
    }
  }, [isNew, id, updateMutation, form]);

  // Loading state (existing site only)
  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state (existing site only)
  if (!isNew && error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load site</p>
        <Button variant="outline" onClick={() => navigate('/sites')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sites
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
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
                onClick={() => navigate('/sites')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sites
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
                    if (form.formState.isDirty && !window.confirm('Discard unsaved changes?')) return;
                    navigate('/sites');
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={isNew ? !form.formState.isDirty : (!form.formState.isDirty || !form.formState.isValid)}
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
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDeactivate}
                      disabled={isNew || form.watch('status') === 'Inactive'}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {form.watch('status') === 'Inactive' ? 'Site Inactive' : 'Deactivate Site'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Controller
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        placeholder="Site Name"
                        className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full"
                      />
                    )}
                  />
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>
                    {statusValue}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {values?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {values.address}
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
                        layoutId="activeSiteTab"
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
                          <Building2 className="w-4 h-4 text-primary" />
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Site Type" icon={Building2} required>
                          <Controller
                            control={form.control}
                            name="siteType"
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select site type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Kitchen">Kitchen</SelectItem>
                                  <SelectItem value="Dining Hall">Dining Hall</SelectItem>
                                  <SelectItem value="Satellite">Satellite</SelectItem>
                                  <SelectItem value="Commissary">Commissary</SelectItem>
                                  <SelectItem value="Cafeteria">Cafeteria</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {form.formState.errors.siteType && (
                            <p className="text-xs text-destructive">{form.formState.errors.siteType.message as string}</p>
                          )}
                        </FormField>

                        <FormField label="Manager Name" icon={Users}>
                          <Input
                            {...form.register('managerName')}
                            placeholder="e.g., Jamie Rivera"
                            className="bg-background/50"
                          />
                        </FormField>

                        <FormField label="Phone" icon={Phone}>
                          <Input
                            {...form.register('phone')}
                            placeholder="(555) 123-4567"
                            className="bg-background/50"
                          />
                        </FormField>

                        <FormField label="Status" icon={FileText} required>
                          <Controller
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Active">Active</SelectItem>
                                  <SelectItem value="Inactive">Inactive</SelectItem>
                                  <SelectItem value="Seasonal">Seasonal</SelectItem>
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
                          Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Address" icon={MapPin}>
                          <Input
                            {...form.register('address')}
                            placeholder="123 Main Street"
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-card/50 border-border lg:col-span-2">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="General Notes">
                          <Textarea
                            {...form.register('notes')}
                            placeholder="Additional notes about this site..."
                            className="bg-background/50 min-h-[100px]"
                          />
                        </FormField>
                        
                        <FormField label="AI Context Notes" hint="Information for the AI agent when working with this site">
                          <Textarea
                            {...form.register('llmNotes')}
                            placeholder="Context for AI: Special considerations, preferences, constraints..."
                            className="bg-background/50 min-h-[100px]"
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {activeTab === 'operations' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          Operating Hours & Production
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Operating Hours" icon={Clock} hint="Freeform description (e.g., M–F 6am–8pm)">
                          <Textarea
                            {...form.register('operatingHours')}
                            placeholder="e.g., M–F 6:00am–8:00pm; Weekends 7:00am–2:00pm"
                            className="bg-background/50 min-h-[100px]"
                          />
                        </FormField>

                        <FormField label="Has Production Kitchen" icon={Building2} hint="Enable if this site can cook/produce food (not just serve).">
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={!!values?.hasProductionKitchen}
                              onChange={(e) => form.setValue('hasProductionKitchen', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                            />
                            Production kitchen on-site
                          </label>
                        </FormField>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Capacity & Storage
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Seating Capacity" icon={Users} hint="Dining seats at this site">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('capacitySeats', { setValueAs: numberField })}
                            placeholder="e.g., 120"
                            className="bg-background/50"
                          />
                        </FormField>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField label="Dry Storage (sqft)">
                            <Input
                              type="number"
                              inputMode="decimal"
                              {...form.register('storageDrySqft', { setValueAs: numberField })}
                              placeholder="e.g., 500"
                              className="bg-background/50"
                            />
                          </FormField>
                          <FormField label="Refrigerated (sqft)">
                            <Input
                              type="number"
                              inputMode="decimal"
                              {...form.register('storageRefrigeratedSqft', { setValueAs: numberField })}
                              placeholder="e.g., 200"
                              className="bg-background/50"
                            />
                          </FormField>
                          <FormField label="Freezer (sqft)">
                            <Input
                              type="number"
                              inputMode="decimal"
                              {...form.register('storageFreezerSqft', { setValueAs: numberField })}
                              placeholder="e.g., 120"
                              className="bg-background/50"
                            />
                          </FormField>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {activeTab === 'stations' && (
                  <Card className="bg-card/50 border-border">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-primary" />
                            Stations
                          </CardTitle>
                          <CardDescription>Service stations at this site</CardDescription>
                        </div>
                        <Button size="sm" className="bg-primary hover:bg-primary/90" disabled>
                          Add Station
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-muted-foreground">
                        <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No stations configured</p>
                        <p className="text-sm">Add stations to organize service areas</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

export default SiteEditPage;

