/**
 * Purchase Order Edit Page (rebuilt)
 *
 * Purchase orders use a domain router (no generic update):
 * - `purchaseOrder.getById` uses `{ poNumber }`
 * - Modifications happen via `addLineItem/removeLineItem/updateLineItem`
 * - Workflow via `submit/confirm/cancel`
 *
 * This screen supports:
 * - Create (requires at least 1 line item)
 * - View existing with line items
 * - Add/remove line items (draft POs)
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  Save,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MoreHorizontal,
  Archive,
  FileText,
  Settings,
  Plus,
  Trash2,
  Truck,
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
import { useApiMutation, useApiQuery } from '../hooks/useApi';

const tabs = [
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'lineItems', label: 'Line Items', icon: ClipboardList },
  { id: 'notes', label: 'Notes', icon: Settings },
] as const;

type TabId = typeof tabs[number]['id'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  Draft: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Submitted: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  Confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Partial: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Received: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  Cancelled: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
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

export function PurchaseOrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const poNumber = id!;

  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: po, isLoading, error } = useApiQuery<any>(
    'purchaseOrder.getById',
    { poNumber },
    { enabled: !isNew && !!poNumber }
  );

  const { data: vendors } = useApiQuery<any[]>('vendor.list', {});
  const { data: sites } = useApiQuery<any[]>('site.list', {});
  const { data: ingredients } = useApiQuery<any[]>('ingredient.list', {});
  const { data: units } = useApiQuery<any[]>('unit.list', {});

  const createMutation = useApiMutation<any, any>('purchaseOrder.create');
  const addLineItemMutation = useApiMutation<any, any>('purchaseOrder.addLineItem');
  const removeLineItemMutation = useApiMutation<any, any>('purchaseOrder.removeLineItem');
  const submitMutation = useApiMutation<any, any>('purchaseOrder.submit');
  const cancelMutation = useApiMutation<any, any>('purchaseOrder.cancel');

  // Create form state (minimal)
  const [vendorId, setVendorId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [notes, setNotes] = useState('');

  const [liIngredientId, setLiIngredientId] = useState('');
  const [liUnitId, setLiUnitId] = useState('');
  const [liQty, setLiQty] = useState('1');
  const [liUnitPrice, setLiUnitPrice] = useState('0');
  const [liNotes, setLiNotes] = useState('');

  React.useEffect(() => {
    if (!liUnitId && Array.isArray(units) && units.length > 0) setLiUnitId(units[0].unitId);
  }, [liUnitId, units]);

  const statusValue = po?.status ?? 'Draft';
  const statusStyle = statusConfig[statusValue] ?? statusConfig.Draft;

  const headerStatus = useMemo(() => {
    const anyPending =
      createMutation.isPending ||
      addLineItemMutation.isPending ||
      removeLineItemMutation.isPending ||
      submitMutation.isPending ||
      cancelMutation.isPending;
    if (anyPending) return { text: 'Working…', className: 'text-xs text-muted-foreground mr-2' };
    if (createMutation.isError || addLineItemMutation.isError || removeLineItemMutation.isError || submitMutation.isError || cancelMutation.isError) {
      return { text: 'Error', className: 'text-xs text-destructive mr-2' };
    }
    return null;
  }, [addLineItemMutation.isError, addLineItemMutation.isPending, cancelMutation.isError, cancelMutation.isPending, createMutation.isError, createMutation.isPending, removeLineItemMutation.isError, removeLineItemMutation.isPending, submitMutation.isError, submitMutation.isPending]);

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
        <p className="text-muted-foreground">Failed to load purchase order</p>
        <Button variant="outline" onClick={() => navigate('/purchase-orders')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  const canMutateLines = !isNew && statusValue === 'Draft';

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
                onClick={() => navigate('/purchase-orders')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Purchase Orders
              </Button>

              <div className="flex items-center gap-2">
                {headerStatus && (
                  <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={headerStatus.className}>
                    {headerStatus.text}
                  </motion.span>
                )}

                {!isNew && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    disabled={statusValue !== 'Draft' || submitMutation.isPending}
                    onClick={() => submitMutation.mutate({ poNumber })}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Submit
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isNew && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          const reason = window.prompt('Cancel reason (optional):') ?? undefined;
                          cancelMutation.mutate({ poNumber, reason: reason || undefined });
                        }}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Cancel PO
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="text-xl font-semibold truncate">{isNew ? 'New Purchase Order' : poNumber}</div>
                  <Badge className={`${statusStyle.bg} ${statusStyle.color} border`}>{statusValue}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {po?.vendorName ? `Vendor: ${po.vendorName}` : ''}
                  {po?.requestedDeliveryDate ? ` • Deliver: ${po.requestedDeliveryDate}` : ''}
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
                        layoutId="activePurchaseOrderTab"
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
                          Header
                        </CardTitle>
                        <CardDescription>{isNew ? 'Fill required fields to create' : 'Read-only (header updates not yet supported)'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Vendor" required>
                          {isNew ? (
                            <Select value={vendorId} onValueChange={setVendorId}>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                              <SelectContent>
                                {(vendors ?? []).map((v: any) => (
                                  <SelectItem key={v.vendorId} value={v.vendorId}>
                                    {v.vendorName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={po?.vendorName ?? ''} readOnly className="bg-background/50" />
                          )}
                        </FormField>

                        <FormField label="Site" required>
                          {isNew ? (
                            <Select value={siteId} onValueChange={setSiteId}>
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
                          ) : (
                            <Input value={po?.siteName ?? po?.siteId ?? ''} readOnly className="bg-background/50" />
                          )}
                        </FormField>

                        <FormField label="Requested Delivery Date" required hint="YYYY-MM-DD">
                          {isNew ? (
                            <Input value={requestedDeliveryDate} onChange={(e) => setRequestedDeliveryDate(e.target.value)} className="bg-background/50 font-mono" />
                          ) : (
                            <Input value={po?.requestedDeliveryDate ?? ''} readOnly className="bg-background/50 font-mono" />
                          )}
                        </FormField>

                        <FormField label="Payment Terms" hint="Optional">
                          <Input
                            value={isNew ? paymentTerms : (po?.paymentTerms ?? '')}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            readOnly={!isNew}
                            className="bg-background/50"
                          />
                        </FormField>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          Delivery
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Delivery Instructions" hint="Optional">
                          <Textarea
                            value={isNew ? deliveryInstructions : (po?.deliveryInstructions ?? '')}
                            onChange={(e) => setDeliveryInstructions(e.target.value)}
                            readOnly={!isNew}
                            className="bg-background/50 min-h-[120px]"
                          />
                        </FormField>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'lineItems' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-primary" />
                          Line Items
                        </CardTitle>
                        <CardDescription>{canMutateLines ? 'Draft items editable' : 'Items locked once submitted'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(po?.lineItems ?? []).length === 0 && <div className="text-sm text-muted-foreground">No line items.</div>}
                        {(po?.lineItems ?? []).map((li: any) => (
                          <div key={li.lineItemId} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/30 border border-border">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{li.ingredientName ?? li.ingredientId}</div>
                              <div className="text-xs text-muted-foreground">
                                {li.quantityOrdered} {li.unitOfMeasure} @ ${li.unitPrice}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={!canMutateLines || removeLineItemMutation.isPending}
                              onClick={() => {
                                if (!window.confirm('Remove this line item?')) return;
                                removeLineItemMutation.mutate({ lineItemId: li.lineItemId });
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
                          {isNew ? 'Initial Line Item' : 'Add Line Item'}
                        </CardTitle>
                        <CardDescription>{isNew ? 'Required to create PO' : 'Draft POs only'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Ingredient" required>
                          <Select value={liIngredientId} onValueChange={setLiIngredientId}>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue placeholder="Select ingredient" />
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
                          <FormField label="Qty" required>
                            <Input value={liQty} onChange={(e) => setLiQty(e.target.value)} className="bg-background/50 font-mono" />
                          </FormField>
                          <FormField label="Unit" required>
                            <Select value={liUnitId} onValueChange={setLiUnitId}>
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

                        <FormField label="Unit Price" required>
                          <Input value={liUnitPrice} onChange={(e) => setLiUnitPrice(e.target.value)} className="bg-background/50 font-mono" />
                        </FormField>

                        <FormField label="Notes" hint="Optional">
                          <Input value={liNotes} onChange={(e) => setLiNotes(e.target.value)} className="bg-background/50" />
                        </FormField>

                        {isNew ? (
                          <Button
                            className="bg-primary hover:bg-primary/90"
                            disabled={createMutation.isPending || !vendorId || !siteId || !requestedDeliveryDate || !liIngredientId || !liUnitId}
                            onClick={() => {
                              const q = Number(liQty);
                              const p = Number(liUnitPrice);
                              if (!Number.isFinite(q) || q <= 0) return window.alert('Quantity must be positive.');
                              if (!Number.isFinite(p) || p < 0) return window.alert('Unit price must be non-negative.');
                              createMutation.mutate(
                                {
                                  vendorId,
                                  siteId,
                                  requestedDeliveryDate,
                                  paymentTerms: paymentTerms || undefined,
                                  deliveryInstructions: deliveryInstructions || undefined,
                                  notes: notes || undefined,
                                  lineItems: [
                                    {
                                      ingredientId: liIngredientId,
                                      quantityOrdered: q,
                                      unitOfMeasure: liUnitId,
                                      unitPrice: p,
                                      notes: liNotes || undefined,
                                    },
                                  ],
                                },
                                {
                                  onSuccess: (created: any) => {
                                    const newPo = created?.poNumber ?? created?.po?.poNumber ?? created?.id;
                                    if (typeof newPo === 'string' && newPo.length > 0) {
                                      navigate(`/purchase-orders/${newPo}`, { replace: true });
                                    } else {
                                      navigate('/purchase-orders');
                                    }
                                  },
                                }
                              );
                            }}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Create Purchase Order
                          </Button>
                        ) : (
                          <Button
                            className="bg-primary hover:bg-primary/90"
                            disabled={!canMutateLines || addLineItemMutation.isPending || !liIngredientId || !liUnitId}
                            onClick={() => {
                              const q = Number(liQty);
                              const p = Number(liUnitPrice);
                              if (!Number.isFinite(q) || q <= 0) return window.alert('Quantity must be positive.');
                              if (!Number.isFinite(p) || p < 0) return window.alert('Unit price must be non-negative.');
                              addLineItemMutation.mutate({
                                poNumber,
                                lineItem: {
                                  ingredientId: liIngredientId,
                                  quantityOrdered: q,
                                  unitOfMeasure: liUnitId,
                                  unitPrice: p,
                                  notes: liNotes || undefined,
                                },
                              });
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Line Item
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          Notes
                        </CardTitle>
                        <CardDescription>{isNew ? 'Saved on create' : 'Read-only (updates not yet supported)'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField label="Notes" hint="Optional">
                          <Textarea
                            value={isNew ? notes : (po?.notes ?? '')}
                            onChange={(e) => setNotes(e.target.value)}
                            readOnly={!isNew}
                            className="bg-background/50 min-h-[180px]"
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

export default PurchaseOrderEditPage;


