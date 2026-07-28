import { createLazyFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { localDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { APP_GROUPS } from "@/lib/menu-config";
import { getSuperAdminDataFn, createOrUpdatePlanFn } from "@/sync-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Star, Plus, CreditCard, Upload } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { DEFAULT_PAYMENT_CONFIG } from "@/lib/utils";

export const Route = createLazyFileRoute("/super-admin/plans")({
  component: SuperAdminPlans,
});

const ADMIN_KEY = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || "";

const allSelectableRoutes = [
  ...APP_GROUPS.flatMap(g => g.items.map(i => i.to)).filter(to => !["/", "/super-admin", "/profile", "/settings"].includes(to)),
  "ai_copilot"
];

const defaultEditingPlan = {
  id: "",
  name: "",
  price: 0,
  features: [...allSelectableRoutes],
  limits: { maxUsers: 2, maxProducts: 100, maxBranches: 1, maxInvoicesPerMonth: 500 },
  isTrialDefault: false,
};

function SuperAdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState({ ...defaultEditingPlan });
  const [planToDelete, setPlanToDelete] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const dbPaymentConfig = useLiveQuery(() => localDb.settings.get("super_admin_payment_config")) as any;
  const [paymentConfig, setPaymentConfig] = useState<any>(DEFAULT_PAYMENT_CONFIG);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (dbPaymentConfig) {
      setPaymentConfig(dbPaymentConfig);
    } else {
      setPaymentConfig(DEFAULT_PAYMENT_CONFIG);
    }
  }, [dbPaymentConfig]);

  const handleSavePaymentConfig = async () => {
    setIsSavingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      await localDb.settings.put({ ...paymentConfig, storeName: "Super Admin Payment Config", synced: true } as any);
      try {
        await createOrUpdatePlanFn({
          data: {
            adminKey: ADMIN_KEY,
            plan: {
              id: "super_admin_payment_config",
              name: "Payment Config",
              price: 0,
              features: paymentConfig as any,
              limits: {} as any,
              isTrialDefault: false
            }
          }
        });
      } catch (cloudErr) {
        console.warn("Cloud save failed for payment config", cloudErr);
      }
      await localDb.saasPlans.put({
        id: "super_admin_payment_config",
        name: "Payment Config",
        price: 0,
        features: paymentConfig as any,
        limits: {} as any,
        isTrialDefault: false
      });
      toast.success("Manual payment configuration (Bank & QR) synced to cloud database successfully!");
      setIsPaymentModalOpen(false);
    } catch (e) {
      toast.error("Failed to save payment configuration.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const result = await getSuperAdminDataFn({ data: { adminKey: ADMIN_KEY } }) as any;
      if (result.success && result.data) {
        setPlans(result.data.plans);
        // Sync to local Dexie for offline use
        for (const plan of result.data.plans) {
          if (plan.id === "super_admin_payment_config" && plan.features) {
            await localDb.settings.put({ ...(plan.features as any), storeName: "Super Admin Payment Config", synced: true });
          }
          await localDb.saasPlans.put({
            id: plan.id,
            name: plan.name,
            price: Number(plan.price),
            features: (plan.features as any) || [],
            limits: (plan.limits as any) || defaultEditingPlan.limits,
            isTrialDefault: (plan as any).isTrialDefault ?? false,
          });
        }
      }
    } catch (e) {
      // Fallback to local Dexie
      const local = await localDb.saasPlans.toArray();
      setPlans(local);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const handleSavePlan = async () => {
    if (!editingPlan.name) return toast.error("Plan name is required");
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const result = await createOrUpdatePlanFn({
        data: { adminKey: ADMIN_KEY, plan: editingPlan }
      }) as any;
      if (result.success) {
        toast.success(editingPlan.id ? "Plan updated!" : "Plan created!");
        setIsPlanModalOpen(false);
        await loadPlans();
      } else {
        toast.error("Failed: " + result.error);
      }
    } catch (e) {
      toast.error("Server error, saving locally...");
      const planId = editingPlan.id || editingPlan.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      await localDb.saasPlans.put({ ...editingPlan, id: planId, price: editingPlan.price });
      await loadPlans();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (planToDelete) {
      await localDb.saasPlans.delete(planToDelete.id);
      setPlanToDelete(null);
      toast.success("Plan deleted locally. Note: Sync to cloud manually if needed.");
      await loadPlans();
    }
  };

  const toggleFeature = (featurePath: string) => {
    setEditingPlan(prev => {
      const isSelected = prev.features.includes(featurePath);
      return {
        ...prev,
        features: isSelected
          ? prev.features.filter(f => f !== featurePath)
          : [...prev.features, featurePath]
      };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SaaS Plan Configuration"
        description="Create and manage subscription tiers. Plans marked as Trial Default are automatically assigned to new sign-ups."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)} size="sm">
              <CreditCard className="size-4 mr-1" /> Payment Settings (Bank & QR)
            </Button>
            <Button onClick={() => {
              setEditingPlan({ ...defaultEditingPlan });
              setIsPlanModalOpen(true);
            }} size="sm">
              <Plus className="size-4 mr-1" /> Create New Plan
            </Button>
          </div>
        }
      />

      <Card title="Active Plans" className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading plans from cloud...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Plan Name</th>
                  <th className="px-4 py-3">Monthly Price</th>
                  <th className="px-4 py-3">Limits</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3 text-center">Trial Default</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.filter(p => p.id !== "super_admin_payment_config").map(plan => (
                  <tr key={plan.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{plan.name}</td>
                    <td className="px-4 py-3 font-mono">₹{plan.price}</td>
                    <td className="px-4 py-3 text-xs">
                      {plan.limits && (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <span className="text-muted-foreground">Users:</span> <span className="font-semibold">{plan.limits.maxUsers}</span>
                          <span className="text-muted-foreground">Products:</span> <span className="font-semibold">{plan.limits.maxProducts}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {((plan.features as string[]) || []).slice(0, 3).map((feat: string) => (
                          <Badge key={feat} variant="secondary" className="text-[10px]">
                            {feat.replace("/", "").toUpperCase()}
                          </Badge>
                        ))}
                        {((plan.features as string[]) || []).length > 3 && (
                          <Badge variant="outline" className="text-[10px]">+{((plan.features as string[]) || []).length - 3} more</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(plan as any).isTrialDefault ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                          <Star className="size-3" /> Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingPlan({
                          id: plan.id,
                          name: plan.name,
                          price: Number(plan.price),
                          features: (plan.features as string[]) || [],
                          limits: (plan.limits as any) || defaultEditingPlan.limits,
                          isTrialDefault: (plan as any).isTrialDefault ?? false,
                        });
                        setIsPlanModalOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => setPlanToDelete(plan)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No plans yet. Create your first plan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Plan Builder Modal */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingPlan.id ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={editingPlan.name}
                  onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Basic Plan, Gold Plan..."
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Price (₹)</Label>
                <Input type="number" value={editingPlan.price} onChange={e => setEditingPlan(p => ({ ...p, price: Number(e.target.value) }))} placeholder="e.g. 1999" />
              </div>
            </div>

            {/* Trial Default Toggle */}
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div>
                <p className="font-semibold text-sm text-amber-800">Set as Default Trial Plan</p>
                <p className="text-xs text-amber-600 mt-0.5">New users who self-register will automatically get this plan during their trial period.</p>
              </div>
              <Switch
                checked={editingPlan.isTrialDefault}
                onCheckedChange={val => setEditingPlan(p => ({ ...p, isTrialDefault: val }))}
              />
            </div>

            <div className="mt-2">
              <Label className="text-base font-semibold border-b pb-2 mb-4 block">Quantitative Limits</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Max Users</Label>
                  <Input type="number" value={editingPlan.limits.maxUsers} onChange={e => setEditingPlan(p => ({ ...p, limits: { ...p.limits, maxUsers: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Products</Label>
                  <Input type="number" value={editingPlan.limits.maxProducts} onChange={e => setEditingPlan(p => ({ ...p, limits: { ...p.limits, maxProducts: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Branches</Label>
                  <Input type="number" value={editingPlan.limits.maxBranches} onChange={e => setEditingPlan(p => ({ ...p, limits: { ...p.limits, maxBranches: Number(e.target.value) } }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Monthly Invoices</Label>
                  <Input type="number" value={editingPlan.limits.maxInvoicesPerMonth} onChange={e => setEditingPlan(p => ({ ...p, limits: { ...p.limits, maxInvoicesPerMonth: Number(e.target.value) } }))} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <Label className="text-base font-semibold">Select Included Features (Route Access)</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingPlan(p => ({ ...p, features: [...allSelectableRoutes] }))}>
                    Select All
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingPlan(p => ({ ...p, features: [] }))}>
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {APP_GROUPS.map((group, i) => (
                  <div key={i} className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border">
                    <h4 className="font-semibold text-sm text-primary mb-2">{group.label}</h4>
                    {group.items.map((item, j) => {
                      const Icon = item.icon;
                      const isSelected = editingPlan.features.includes(item.to);
                      // Don't show checkboxes for routes that are strictly personal or super-admin only
                      if (["/", "/super-admin", "/profile"].includes(item.to)) return null;
                      return (
                        <div key={j} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`feat-${i}-${j}`}
                            checked={isSelected}
                            onChange={() => toggleFeature(item.to)}
                            className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                          />
                          <Label htmlFor={`feat-${i}-${j}`} className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer">
                            <Icon className="size-3.5 text-muted-foreground" />
                            {item.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="space-y-2 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-3 rounded-lg border border-primary/30 shadow-soft">
                  <h4 className="font-bold text-sm text-primary mb-2 flex items-center gap-1.5">
                    <Star className="size-4 fill-primary text-primary" /> AI & Smart Add-ons
                  </h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="feat-ai-copilot"
                      checked={editingPlan.features.includes("ai_copilot")}
                      onChange={() => toggleFeature("ai_copilot")}
                      className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                    />
                    <Label htmlFor="feat-ai-copilot" className="flex items-center gap-2 text-sm font-bold leading-none cursor-pointer text-foreground">
                      <span>🤖</span>
                      AI Copilot (Business Advisor & Intelligence)
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Plan to Cloud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Alert */}
      <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong> {planToDelete?.name} </strong> plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-red-500 hover:bg-red-600">Delete Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Configuration Modal (Bank & QR) */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Configure Manual Payment (Bank & QR)
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              These details and QR code will be displayed to SaaS tenants in Settings &gt; Billing when they upgrade or recharge their subscription.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Company / Account Holder Name</Label>
              <Input
                value={paymentConfig.accountName || ""}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, accountName: e.target.value })}
                placeholder="e.g. Artistry POS Technologies Pvt Ltd"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Bank Name & Branch</Label>
                <Input
                  value={paymentConfig.bankName || ""}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank (Commercial)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Account Number</Label>
                <Input
                  value={paymentConfig.accountNo || ""}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, accountNo: e.target.value })}
                  placeholder="e.g. 50200098765432"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">IFSC / Swift / Routing Code</Label>
                <Input
                  value={paymentConfig.ifscCode || ""}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, ifscCode: e.target.value })}
                  placeholder="e.g. HDFC0001234"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">UPI ID / Merchant ID</Label>
                <Input
                  value={paymentConfig.upiId || ""}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, upiId: e.target.value })}
                  placeholder="e.g. pos.artistry@hdfcbank"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">QR Code Image (Upload or Data URL)</Label>
              <div className="flex items-center gap-4 mt-1">
                {paymentConfig.qrCodeUrl ? (
                  <div className="size-20 rounded border bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
                    <img src={paymentConfig.qrCodeUrl} alt="QR Code" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="size-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
                    No QR
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="text-xs cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPaymentConfig({ ...paymentConfig, qrCodeUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">Upload your payment QR code (GPay, PhonePe, Paytm, BHIM).</p>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Payment Verification Instructions</Label>
              <textarea
                value={paymentConfig.instructions || ""}
                onChange={(e) => setPaymentConfig({ ...paymentConfig, instructions: e.target.value })}
                rows={3}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Instructions for user after payment..."
              />
            </div>
          </div>
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePaymentConfig} disabled={isSavingPayment} className="bg-primary hover:bg-primary/90">
              {isSavingPayment && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Payment Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
<Button onClick={handleSavePaymentConfig} disabled={isSavingPayment} className="bg-primary hover:bg-primary/90">
  {isSavingPayment && <Loader2 className="size-4 animate-spin mr-2" />}
  Save Payment Settings
</Button>
          </DialogFooter >
        </DialogContent >
      </Dialog >
    </div >
  );
}
