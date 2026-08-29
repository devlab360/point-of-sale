import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllPlansFn,
  getAllOrganizationsFn,
  createOrUpdatePlanFn,
  deletePlanFn,
} from "@/api/admin/super-admin";
import {
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  Users,
  Package,
  FileSpreadsheet,
  Check,
  Building2,
  Copy,
  Sliders,
  DollarSign,
  ShieldCheck,
  Store,
  ArrowRight,
  RefreshCw,
  Download,
  CheckCircle2,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "SaaS Plans · Super Admin OneDesk360" }] }),
  component: SuperAdminPlansPage,
});

const AVAILABLE_MODULES = [
  { id: "pos", name: "POS Terminal" },
  { id: "products", name: "Products & Barcodes" },
  { id: "inventory", name: "Stock Inventory" },
  { id: "sales", name: "Sales & Invoicing" },
  { id: "quotations", name: "Quotations" },
  { id: "purchases", name: "Purchases & POs" },
  { id: "suppliers", name: "Suppliers Directory" },
  { id: "customers", name: "Customers & CRM" },
  { id: "reports", name: "Analytics & Reports" },
  { id: "expenses", name: "Expense Tracking" },
  { id: "loyalty", name: "Loyalty Points" },
  { id: "promotions", name: "Promotions & Coupons" },
  { id: "whatsapp", name: "WhatsApp Notifications" },
  { id: "repairs", name: "Repair Tracking" },
  { id: "restaurant", name: "Restaurant Tables & KOT" },
  { id: "appointments", name: "Appointment Booking" },
  { id: "rentals", name: "Rentals Management" },
  { id: "ai", name: "AI Assistant" },
];

const defaultEditingPlan = {
  id: "",
  name: "",
  currency: "INR",
  price: 0,
  monthlyPrice: 0,
  yearlyPrice: 0,
  features: ["pos", "products", "inventory", "customers", "sales", "reports"],
  menus: ["pos", "products", "inventory", "sales", "customers", "reports"],
  limits: {
    maxUsers: 5,
    maxProducts: 2000,
    maxBranches: 2,
    maxInvoicesPerMonth: 5000,
    maxCustomers: 5000,
  },
  isTrialDefault: false,
};

function SuperAdminPlansPage() {
  const queryClient = useQueryClient();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState({ ...defaultEditingPlan });

  const { data: plansData, isLoading: isPlansLoading, refetch: refetchPlans, isFetching } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => getAllPlansFn({ data: {} }),
  });

  const { data: orgsData, isLoading: isOrgsLoading, refetch: refetchOrgs } = useQuery({
    queryKey: ["saas-organizations"],
    queryFn: () => getAllOrganizationsFn({ data: {} }),
  });

  const plans = (plansData?.data as any[]) || [];
  const organizations = orgsData?.data?.orgs || [];
  const isLoading = isPlansLoading || isOrgsLoading;

  const totalPaidStores = organizations.filter((o: any) => o.status === "active").length;
  const totalTrialStores = organizations.filter((o: any) => o.status === "trial").length;
  const defaultTrialPlan = plans.find((p: any) => p.isTrialDefault)?.name || "Basic";

  const savePlanMutation = useMutation({
    mutationFn: (planData: any) => createOrUpdatePlanFn({ data: planData }),
    onSuccess: () => {
      toast.success("SaaS Plan Tier saved successfully");
      setIsPlanModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["saas-plans"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save plan"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => deletePlanFn({ data: { planId } }),
    onSuccess: () => {
      toast.success("SaaS Plan tier deleted");
      queryClient.invalidateQueries({ queryKey: ["saas-plans"] });
    },
  });

  const handleToggleModule = (moduleId: string) => {
    const current = editingPlan.features || [];
    if (current.includes(moduleId)) {
      setEditingPlan({
        ...editingPlan,
        features: current.filter((m) => m !== moduleId),
        menus: (editingPlan.menus || []).filter((m) => m !== moduleId),
      });
    } else {
      setEditingPlan({
        ...editingPlan,
        features: [...current, moduleId],
        menus: [...(editingPlan.menus || []), moduleId],
      });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="SaaS Plan Architecture & Pricing"
          description="Define pricing tiers, resource quotas (users, products, invoices), and package module access for merchant stores."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  refetchPlans();
                  refetchOrgs();
                }}
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                disabled={isFetching}
              >
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  const exportRows = plans.map((p: any) => ({
                    ID: p.id,
                    Name: p.name,
                    Price_Monthly: p.monthlyPrice || p.price || 0,
                    Price_Yearly: p.yearlyPrice || 0,
                    MaxUsers: p.limits?.maxUsers || "Unlimited",
                    MaxProducts: p.limits?.maxProducts || "Unlimited",
                    MaxBranches: p.limits?.maxBranches || 1,
                    SubscribedStores: organizations.filter((o: any) => o.currentPlanId === p.id).length,
                    IsTrialDefault: p.isTrialDefault ? "Yes" : "No",
                  }));
                  exportToCSV("SaaS_Pricing_Plans", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button
                onClick={() => {
                  setEditingPlan({ ...defaultEditingPlan });
                  setIsPlanModalOpen(true);
                }}
                size="sm"
                className="gap-2 h-9 shadow-xs"
              >
                <Plus className="size-4" />
                <span>Create New Plan Tier</span>
              </Button>
            </div>
          }
        />

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Configured Tiers"
            value={String(plans.length)}
            hint="Active monetization tiers"
            icon={Layers}
            accent="primary"
          />
          <StatCard
            label="Paid Subscribed Stores"
            value={String(totalPaidStores)}
            hint="Active paying merchants"
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Trial Period Stores"
            value={String(totalTrialStores)}
            hint="Active evaluations"
            icon={Sparkles}
            accent="warning"
          />
          <StatCard
            label="Default Trial Tier"
            value={defaultTrialPlan}
            hint="Assigned on sign-up"
            icon={ShieldCheck}
            accent="info"
          />
        </div>

        {/* Plan Cards Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Loading SaaS plans…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any) => {
              const monthly = Number(plan.monthlyPrice || plan.price || 0);
              const yearly = Number(plan.yearlyPrice || (monthly * 10)); // 2 months free
              const currencySymbol = plan.currency === "USD" ? "$" : plan.currency === "EUR" ? "€" : "₹";

              const subscribedStores = organizations.filter((o: any) => o.currentPlanId === plan.id);
              const activeCount = subscribedStores.filter((o: any) => o.status === "active").length;
              const trialCount = subscribedStores.filter((o: any) => o.status === "trial").length;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border bg-card p-6 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-all ${
                    plan.isTrialDefault ? "border-amber-500/40 bg-amber-500/2" : ""
                  }`}
                >
                  {plan.isTrialDefault && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-amber-500 text-amber-950 font-black gap-1 text-[11px] shadow-sm">
                        <Sparkles className="size-3" /> Default Trial Tier
                      </Badge>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-foreground">{plan.name}</h3>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">
                        {plan.id}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-foreground">
                        {currencySymbol}{monthly}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/ month</span>
                    </div>
                    {yearly > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        {currencySymbol}{yearly} / billed yearly
                      </p>
                    )}

                    {/* Subscribed Stores Counter */}
                    <div className="mt-4 p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <Store className="size-4 text-primary" />
                        <span>{subscribedStores.length} Stores</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeCount} active · {trialCount} trial
                      </span>
                    </div>

                    {/* Resource Quotas */}
                    <div className="mt-4 space-y-2 border-t pt-4 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Users className="size-3.5 text-primary" /> Max Staff Users:
                        </span>
                        <span className="font-bold text-foreground">
                          {plan.limits?.maxUsers || "Unlimited"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Package className="size-3.5 text-primary" /> Max Products:
                        </span>
                        <span className="font-bold text-foreground">
                          {plan.limits?.maxProducts || "Unlimited"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-primary" /> Max Branches:
                        </span>
                        <span className="font-bold text-foreground">
                          {plan.limits?.maxBranches || 1}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <FileSpreadsheet className="size-3.5 text-primary" /> Monthly Invoices:
                        </span>
                        <span className="font-bold text-foreground">
                          {plan.limits?.maxInvoicesPerMonth || "Unlimited"}
                        </span>
                      </div>
                    </div>

                    {/* Included Modules list */}
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Included Modules ({plan.features.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {plan.features.slice(0, 6).map((feat: string) => (
                            <Badge key={feat} variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                              {feat}
                            </Badge>
                          ))}
                          {plan.features.length > 6 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              +{plan.features.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs font-semibold gap-1"
                      onClick={() => {
                        setEditingPlan({
                          ...plan,
                          monthlyPrice: plan.monthlyPrice || plan.price || 0,
                          limits: plan.limits || {
                            maxUsers: 5,
                            maxProducts: 2000,
                            maxBranches: 2,
                            maxInvoicesPerMonth: 5000,
                            maxCustomers: 5000,
                          },
                        });
                        setIsPlanModalOpen(true);
                      }}
                    >
                      <Edit3 className="size-3.5" /> Edit Tier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      disabled={deletePlanMutation.isPending || subscribedStores.length > 0}
                      title={subscribedStores.length > 0 ? "Cannot delete tier with active subscribers" : ""}
                      onClick={() => {
                        if (confirm(`Delete plan tier "${plan.name}"?`)) {
                          deletePlanMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit Plan Drawer */}
        <Sheet open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Layers className="size-5 text-primary" />
                <span>{editingPlan.id ? `Edit Plan Tier: ${editingPlan.name}` : "Create New SaaS Plan"}</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Set monthly/yearly pricing, quota ceilings, and bundled features.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePlanMutation.mutate(editingPlan);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-id">Plan Unique Identifier (ID)</Label>
                    <Input
                      id="plan-id"
                      required
                      disabled={Boolean(editingPlan.id && plans.some((p) => p.id === editingPlan.id))}
                      value={editingPlan.id}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          id: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                        })
                      }
                      placeholder="e.g. enterprise-plus"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-name">Display Plan Name</Label>
                    <Input
                      id="plan-name"
                      required
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      placeholder="e.g. Enterprise Plus"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-curr">Currency</Label>
                    <Select
                      value={editingPlan.currency || "INR"}
                      onValueChange={(val) => setEditingPlan({ ...editingPlan, currency: val })}
                    >
                      <SelectTrigger id="plan-curr">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-mprice">Monthly Price</Label>
                    <Input
                      id="plan-mprice"
                      type="number"
                      min={0}
                      value={editingPlan.monthlyPrice || editingPlan.price || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          monthlyPrice: Number(e.target.value),
                          price: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan-yprice">Yearly Price</Label>
                    <Input
                      id="plan-yprice"
                      type="number"
                      min={0}
                      value={editingPlan.yearlyPrice || 0}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, yearlyPrice: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                {/* Resource Limits */}
                <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sliders className="size-3.5 text-primary" />
                    <span>Quota Limits & Ceilings</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label htmlFor="lim-users">Max Users (Staff)</Label>
                      <Input
                        id="lim-users"
                        type="number"
                        min={1}
                        value={editingPlan.limits?.maxUsers || 5}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: { ...editingPlan.limits, maxUsers: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lim-products">Max Products</Label>
                      <Input
                        id="lim-products"
                        type="number"
                        min={100}
                        value={editingPlan.limits?.maxProducts || 2000}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: { ...editingPlan.limits, maxProducts: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lim-branches">Max Store Branches</Label>
                      <Input
                        id="lim-branches"
                        type="number"
                        min={1}
                        value={editingPlan.limits?.maxBranches || 1}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: { ...editingPlan.limits, maxBranches: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lim-invoices">Monthly Invoice Limit</Label>
                      <Input
                        id="lim-invoices"
                        type="number"
                        min={100}
                        value={editingPlan.limits?.maxInvoicesPerMonth || 5000}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            limits: {
                              ...editingPlan.limits,
                              maxInvoicesPerMonth: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Module Checklist */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Bundled System Features</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AVAILABLE_MODULES.map((mod) => {
                      const isChecked = editingPlan.features?.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-primary/10 border-primary/40 font-semibold text-foreground"
                              : "bg-card border-border/70 text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleModule(mod.id)}
                          />
                          <span className="truncate">{mod.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Default Trial Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div>
                    <Label htmlFor="default-trial" className="text-xs font-bold text-foreground">
                      Set as Default Trial Tier
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically provision new merchant store sign-ups on this plan tier.
                    </p>
                  </div>
                  <Switch
                    id="default-trial"
                    checked={editingPlan.isTrialDefault}
                    onCheckedChange={(val) => setEditingPlan({ ...editingPlan, isTrialDefault: val })}
                  />
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savePlanMutation.isPending}>
                  {savePlanMutation.isPending ? "Saving Plan…" : "Save Plan Tier"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
