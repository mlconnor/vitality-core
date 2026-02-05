/**
 * Station Edit Page (rebuilt)
 *
 * Aligns 1:1 with DB schema `stations` and uses the same autosave pattern + L&F
 * as `SiteEditPage`.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  Trash2,
  Settings,
  FileText,
  Users,
  Thermometer,
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
import { useApiQuery, useCreateMutation, useUpdateMutation, useDeleteStations } from '../hooks/useApi';
import { useAutosaveEntityForm } from '../hooks/useAutosaveEntityForm';
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  StationFormSchema,
  stationToFormValues,
  stationValuesToCreateInput,
  stationValuesToUpdateData,
  type StationFormValues,
} from '../schemas/station';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'equipment', label: 'Equipment', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Inactive: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  'Under Maintenance': { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
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

export function StationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: station, isLoading, error } = useApiQuery<any>(
    'station.getById',
    { id: id! },
    { enabled: !isNew && !!id }
  );

  const { data: sites } = useApiQuery<any[]>('site.list', {});

  const createMutation = useCreateMutation<any>('station');
  const updateMutation = useUpdateMutation<any>('station');
  const deleteMutation = useDeleteStations();

  const form = useForm<StationFormValues>({
    resolver: zodResolver(StationFormSchema),
    mode: 'onChange',
    defaultValues: stationToFormValues(null),
  });

  const numberField = React.useCallback((val: unknown) => {
    if (val === '' || val == null) return undefined;
    const n = typeof val === 'number' ? val : Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  React.useEffect(() => {
    if (station) form.reset(stationToFormValues(station));
  }, [form, station]);

  const values = useWatch({ control: form.control });
  const { isDirty, isValid } = useFormState({ control: form.control });

  const statusValue = values?.status ?? 'Active';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Active;

  const autosave = useAutosaveEntityForm<StationFormValues, any>({
    id,
    isNew,
    values: (values ?? form.getValues()) as StationFormValues,
    isDirty,
    isValid,
    debounceMs: 800,
    create: async (vals) => createMutation.mutateAsync(stationValuesToCreateInput(vals)),
    update: async ({ id: recordId, data }) =>
      updateMutation.mutateAsync({ id: recordId, data: stationValuesToUpdateData(data as StationFormValues) }),
    getRecordId: (record) => record?.stationId ?? null,
    onCreated: (record) => {
      const newId = record?.stationId;
      if (typeof newId === 'string' && newId.length > 0) {
        navigate(`/stations/${newId}`, { replace: true });
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
      // For new items: validate first, show errors if invalid
      const valid = await form.trigger();
      if (!valid) return;
    }
    autosave.flush();
  }, [isNew, form, autosave]);

  // Handle delete action
  const handleDelete = React.useCallback(async () => {
    if (isNew || !id) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${form.getValues('stationName') || 'this station'}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync([id]);
      navigate('/stations');
    } catch (err) {
      console.error('Failed to delete station:', err);
      alert('Failed to delete station. It may have associated data.');
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
        <p className="text-muted-foreground">Failed to load station</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
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
                  navigate(-1);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
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
                    navigate(-1);
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
                      Delete Station
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <LayoutGrid className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Input
                    {...form.register('stationName')}
                    placeholder="Station Name"
                    className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 w-full h-auto px-0 py-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">{values?.stationType ?? ''}</div>
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
                        layoutId="activeStationTab"
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
                          <LayoutGrid className="w-4 h-4 text-primary" />
                          Station Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Site" icon={Users} required>
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

                        <FormField label="Station Type" required>
                          <Controller
                            control={form.control}
                            name="stationType"
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Grill">Grill</SelectItem>
                                  <SelectItem value="Steam Table">Steam Table</SelectItem>
                                  <SelectItem value="Cold Bar">Cold Bar</SelectItem>
                                  <SelectItem value="Salad Bar">Salad Bar</SelectItem>
                                  <SelectItem value="Trayline">Trayline</SelectItem>
                                  <SelectItem value="Beverage">Beverage</SelectItem>
                                  <SelectItem value="Dessert">Dessert</SelectItem>
                                  <SelectItem value="À la Carte">À la Carte</SelectItem>
                                  <SelectItem value="Grab-and-Go">Grab-and-Go</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>

                        <FormField label="Service Style" required>
                          <Controller
                            control={form.control}
                            name="serviceStyle"
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select style" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Self-Service">Self-Service</SelectItem>
                                  <SelectItem value="Attended">Attended</SelectItem>
                                  <SelectItem value="Tray Service">Tray Service</SelectItem>
                                  <SelectItem value="Counter Service">Counter Service</SelectItem>
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
                          <Users className="w-4 h-4 text-primary" />
                          Capacity & Compliance
                        </CardTitle>
                        <CardDescription>Operational estimates and HACCP requirements</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Capacity (covers/hr)" hint="Optional">
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register('capacityCoversPerHour', { setValueAs: numberField })}
                            placeholder="e.g., 50"
                            className="bg-background/50"
                          />
                        </FormField>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border">
                          <input
                            type="checkbox"
                            checked={!!values?.requiresTempLog}
                            onChange={(e) =>
                              form.setValue('requiresTempLog', e.target.checked, { shouldDirty: true, shouldValidate: true })
                            }
                            className="rounded border-primary/50 text-primary focus:ring-primary"
                          />
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <Thermometer className="w-4 h-4 text-amber-400" />
                              Requires Temperature Logging
                            </label>
                            <p className="text-xs text-muted-foreground">HACCP compliance requirement</p>
                          </div>
                        </div>

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
                                  <SelectItem value="Inactive">Inactive</SelectItem>
                                  <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'equipment' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Equipment List
                        </CardTitle>
                        <CardDescription>Tools and equipment assigned to this station</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          {...form.register('equipmentList')}
                          placeholder="e.g., Flat top grill, heat lamps, bain marie..."
                          className="bg-background/50 min-h-[260px] font-mono text-sm"
                        />
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
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
                            placeholder="Notes about this station..."
                            className="bg-background/50 min-h-[120px]"
                          />
                        </FormField>
                        <FormField label="AI Context Notes" hint="Information for the AI agent">
                          <Textarea
                            {...form.register('llmNotes')}
                            placeholder="Context for AI: capabilities, quirks, procedures..."
                            className="bg-background/50 min-h-[120px]"
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

export default StationEditPage;


