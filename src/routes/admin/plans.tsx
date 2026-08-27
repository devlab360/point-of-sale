import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getAllPlansFn, createOrUpdatePlanFn, deletePlanFn } from "@/api/admin/super-admin";
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
} from "lucide-react";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "SaaS Plans · Super Admin OneDesk360" }] }),
  component: SuperAdminPlansPage,
});

const defaultEditingPlan = {
  id: "",
  name: "",
  price: 0,
  features: ["pos", "products", "inventory", "customers", "sales", "reports"],
  limits: {
    maxUsers: 5,
    maxProducts: 2000,
    maxBranches: 2,
    maxInvoicesPerMonth: 5000,
  },
  isTrialDefault: false,
};

function SuperAdminPlansPage() {
  const queryClient = useQueryClient();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState({ ...defaultEditingPlan });

  const { data: plansData, isLoading } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => getAllPlansFn({ data: {} }),
  });

  const plans = (plansData?.data as any[]) || [];

  const savePlanMutation = useMutation({
    mutationFn: (planData: any) => createOrUpdatePlanFn({ data: planData }),
    onSuccess: () => {
      toast.success("SaaS Plan saved successfully");
      setIsPlanModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["saas-plans"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save plan"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => deletePlanFn({ data: { planId } }),
    onSuccess: () => {
      toast.success("SaaS Plan deleted");
      queryClient.invalidateQueries({ queryKey: ["saas-plans"] });
    },
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">SaaS Tier Architecture & Pricing</h2>
            <p className="text-sm text-muted-foreground">
              Configure plan pricing, user/product resource limits, and trial defaults
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingPlan({ ...defaultEditingPlan });
              setIsPlanModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            <span>Create New Plan Tier</span>
          </Button>
        </div>

        {/* Plan Cards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan: any) => (
              <div
                key={plan.id}
                className="relative rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all"
              >
                {plan.isTrialDefault && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-amber-500 text-white font-bold gap-1">
                      <Sparkles className="size-3" /> Default Trial
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-foreground">{plan.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs uppercase">
                      {plan.id}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">${plan.price || 0}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                  </div>

                  <div className="mt-6 space-y-2 border-t pt-4 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="size-3.5" /> Max Staff Users:
                      </span>
                      <span className="font-bold">{plan.limits?.maxUsers || "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Package className="size-3.5" /> Max Products:
                      </span>
                      <span className="font-bold">{plan.limits?.maxProducts || "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FileSpreadsheet className="size-3.5" /> Monthly Invoices:
                      </span>
                      <span className="font-bold">
                        {plan.limits?.maxInvoicesPerMonth || "Unlimited"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingPlan({
                        id: plan.id,
                        name: plan.name,
                        price: Number(plan.price || 0),
                        features: plan.features || [],
                        limits: plan.limits || defaultEditingPlan.limits,
                        isTrialDefault: Boolean(plan.isTrialDefault),
                      });
                      setIsPlanModalOpen(true);
                    }}
                  >
                    <Edit3 className="size-3.5 mr-1" /> Edit Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) {
                        deletePlanMutation.mutate(plan.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Plan Dialog */}
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPlan.id ? "Edit SaaS Plan" : "Create New SaaS Plan"}
              </DialogTitle>
              <DialogDescription>
                Define pricing structure, feature access, and account limits.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePlanMutation.mutate(editingPlan);
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input
                  id="plan-name"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="Professional Tier"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-price">Monthly Price ($ USD)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editingPlan.price}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={editingPlan.limits?.maxUsers}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        limits: { ...editingPlan.limits, maxUsers: parseInt(e.target.value) || 1 },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxProducts">Max Products</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    value={editingPlan.limits?.maxProducts}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          maxProducts: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="trial-default" className="text-xs">
                  Default Trial Plan
                </Label>
                <Switch
                  id="trial-default"
                  checked={editingPlan.isTrialDefault}
                  onCheckedChange={(checked) =>
                    setEditingPlan({ ...editingPlan, isTrialDefault: checked })
                  }
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savePlanMutation.isPending}>
                  {savePlanMutation.isPending ? "Saving..." : "Save Plan Tier"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
