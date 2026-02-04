/**
 * Inventory Detail Page (rebuilt)
 *
 * Note: inventory is managed through domain operations (receive/issue/adjust),
 * not generic CRUD. This page treats `:id` as an `ingredientId` and shows
 * inventory levels across sites plus manual adjustment tooling.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes,
  Save,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  FileText,
  Settings,
  Warehouse,
  MinusCircle,
  PlusCircle,
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
import { useApiMutation, useApiQuery } from '../hooks/useApi';

const tabs = [
  { id: 'levels', label: 'Levels', icon: Warehouse },
  { id: 'adjust', label: 'Adjust', icon: Settings },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
] as const;

type TabId = typeof tabs[number]['id'];

const badgeConfig: Record<string, { color: string; bg: string }> = {
  OK: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'Below Par': { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
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

export function InventoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const ingredientId = id!;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('levels');

  const { data: ingredient, isLoading: ingredientLoading, error: ingredientError } = useApiQuery<any>(
    'ingredient.getById',
    { id: ingredientId },
    { enabled: !!ingredientId }
  );

  const { data: levels, isLoading: levelsLoading, error: levelsError } = useApiQuery<any[]>(
    'inventory.getByIngredient',
    { ingredientId },
    { enabled: !!ingredientId }
  );

  const { data: sites } = useApiQuery<any[]>('site.list', {});

  const [adjustSiteId, setAdjustSiteId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const adjustMutation = useApiMutation<any, { ingredientId: string; siteId: string; newQuantity: number; reason: string }>(
    'inventory.adjust'
  );

  const alertsQuery = useApiQuery<any>('inventory.getAlerts', {}, {});

  const headerStatus = useMemo(() => {
    if (adjustMutation.isPending) return { text: 'Applying…', className: 'text-xs text-muted-foreground mr-2' };
    if (adjustMutation.isError) return { text: 'Error', className: 'text-xs text-destructive mr-2' };
    if (adjustMutation.isSuccess) return { text: 'Applied', className: 'text-xs text-emerald-400 mr-2' };
    return null;
  }, [adjustMutation.isError, adjustMutation.isPending, adjustMutation.isSuccess]);

  const isLoading = ingredientLoading || levelsLoading;
  const error = ingredientError || levelsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load inventory</p>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  const belowPar = (levels ?? []).some((l: any) => l?.belowParFlag);
  const badgeLabel = belowPar ? 'Below Par' : 'OK';
  const badgeStyle = badgeConfig[badgeLabel] ?? badgeConfig.OK;

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
                onClick={() => navigate('/inventory')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Inventory
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
                    setAdjustQty('');
                    setAdjustReason('');
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset
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
                      Archive (not implemented)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Boxes className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-xl font-semibold truncate">{ingredient?.ingredientName ?? ingredientId}</div>
                  <Badge className={`${badgeStyle.bg} ${badgeStyle.color} border`}>{badgeLabel}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {ingredient?.storageType ? `${ingredient.storageType} storage` : ''}{ingredient?.foodCategoryId ? ` • ${ingredient.foodCategoryId}` : ''}
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
                        layoutId="activeInventoryTab"
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
            {adjustMutation.isError && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {(adjustMutation.error as any)?.message ?? 'Failed to adjust inventory'}
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
                {activeTab === 'levels' && (
                  <div className="grid grid-cols-1 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-primary" />
                          Levels by Site
                        </CardTitle>
                        <CardDescription>Perpetual inventory snapshot</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(levels ?? []).length === 0 && <div className="text-sm text-muted-foreground">No inventory records found.</div>}
                        {(levels ?? []).map((l: any) => (
                          <div key={l.inventoryId} className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{l.siteName ?? l.siteId}</div>
                              <div className="text-xs text-muted-foreground">
                                {l.storageLocation} • {l.quantityOnHand} {l.unitOfMeasure}
                              </div>
                            </div>
                            {l.belowParFlag ? (
                              <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-400 border">Below par</Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 border">OK</Badge>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'adjust' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          Manual Adjustment
                        </CardTitle>
                        <CardDescription>Use sparingly; prefer receiving/issuing flows</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Site" required>
                          <Select value={adjustSiteId} onValueChange={setAdjustSiteId}>
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
                        </FormField>

                        <FormField label="New Quantity" required hint="Sets absolute quantity on hand">
                          <Input
                            value={adjustQty}
                            onChange={(e) => setAdjustQty(e.target.value)}
                            placeholder="e.g., 12.5"
                            className="bg-background/50 font-mono"
                          />
                        </FormField>

                        <FormField label="Reason" required>
                          <Textarea
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Why are you adjusting this inventory level?"
                            className="bg-background/50 min-h-[120px]"
                          />
                        </FormField>

                        <Button
                          className="bg-primary hover:bg-primary/90"
                          disabled={adjustMutation.isPending || !adjustSiteId || !adjustQty || !adjustReason.trim()}
                          onClick={() => {
                            const n = Number(adjustQty);
                            if (!Number.isFinite(n) || n < 0) {
                              window.alert('New quantity must be a non-negative number.');
                              return;
                            }
                            adjustMutation.mutate({
                              ingredientId,
                              siteId: adjustSiteId,
                              newQuantity: n,
                              reason: adjustReason.trim(),
                            });
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Apply Adjustment
                        </Button>

                        <div className="text-xs text-muted-foreground">
                          Tip: adjustments will affect variance vs physical counts and may impact reorder signals.
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Quick Actions
                        </CardTitle>
                        <CardDescription>Convenience controls</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button
                          variant="outline"
                          disabled={!adjustQty}
                          onClick={() => {
                            const n = Number(adjustQty);
                            if (!Number.isFinite(n)) return;
                            setAdjustQty(String(Math.max(0, n - 1)));
                          }}
                        >
                          <MinusCircle className="w-4 h-4 mr-2" />
                          Decrement by 1
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!adjustQty}
                          onClick={() => {
                            const n = Number(adjustQty);
                            if (!Number.isFinite(n)) return;
                            setAdjustQty(String(n + 1));
                          }}
                        >
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Increment by 1
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'alerts' && (
                  <div className="grid grid-cols-1 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-primary" />
                          Alerts
                        </CardTitle>
                        <CardDescription>Cross-inventory alerts (below par, expiring, expired)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(alertsQuery.data?.belowPar ?? []).length === 0 &&
                          (alertsQuery.data?.expiring ?? []).length === 0 &&
                          (alertsQuery.data?.expired ?? []).length === 0 && (
                            <div className="text-sm text-muted-foreground">No alerts.</div>
                          )}
                        {((alertsQuery.data?.belowPar ?? []) as any[]).slice(0, 10).map((a) => (
                          <div key={`bp-${a.inventoryId}`} className="text-sm">
                            <span className="text-amber-400">Below par</span> — {a.ingredientName} @ {a.siteName}
                          </div>
                        ))}
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

export default InventoryEditPage;


