import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getAllOrganizationsFn,
  updateOrganizationFn,
  createTenantUserFn,
  addTrialDaysFn,
  toggleOrgStatusFn,
  getAdminMenuGrantsFn,
  setAdminMenuGrantsFn,
} from "@/api/admin/super-admin";
import { APP_GROUPS } from "@/lib/menu-config";
import {
  Store,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  Plus,
  Loader2,
  Shield,
  Edit3,
  Calendar,
  Layers,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "Tenants & Stores · Super Admin OneDesk360" }] }),
  component: SuperAdminTenantsPage,
});

function SuperAdminTenantsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "suspended">("all");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    storeName: "",
    ownerName: "",
    email: "",
    password: "",
    planId: "basic",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["saas-organizations"],
    queryFn: () => getAllOrganizationsFn({ data: {} }),
  });

  const organizations = data?.data?.orgs || [];
  const plans = data?.data?.plans || [];

  const updateOrgMutation = useMutation({
    mutationFn: (org: any) => updateOrganizationFn({ data: org }),
    onSuccess: () => {
      toast.success("Tenant updated successfully");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
    },
    onError: (err: any) => toast.error(err.message || "Update failed"),
  });

  const createTenantMutation = useMutation({
    mutationFn: (tenant: any) => createTenantUserFn({ data: tenant }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Tenant store created successfully!");
        setIsCreateModalOpen(false);
        setNewTenant({ storeName: "", ownerName: "", email: "", password: "", planId: "basic" });
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res.error || "Failed to create tenant");
      }
    },
    onError: (err: any) => toast.error(err.message || "Creation failed"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ orgId, status }: { orgId: string; status: "active" | "suspended" | "trial" }) =>
      toggleOrgStatusFn({ data: { orgId, status } }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
    },
  });

  const addTrialMutation = useMutation({
    mutationFn: ({ orgId, days }: { orgId: string; days: number }) =>
      addTrialDaysFn({ data: { orgId, days } }),
    onSuccess: () => {
      toast.success("Added 7 extra trial days");
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
    },
  });

  const filteredOrgs = organizations.filter((org: any) => {
    const matchesSearch =
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || org.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">SaaS Tenant Stores</h2>
            <p className="text-sm text-muted-foreground">
              Manage registered business stores, subscription status, and plan allocations
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span>Create Tenant Store</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search store name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tenants Table */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center p-12">
              <Store className="size-10 mx-auto text-muted-foreground mb-3 opacity-40" />
              <h3 className="font-semibold text-lg">No Tenant Stores Found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Store & Owner</th>
                    <th className="px-4 py-3">Current Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Plan Expiry</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrgs.map((org: any) => {
                    const plan = plans.find((p: any) => p.id === org.currentPlanId);
                    return (
                      <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{org.name}</div>
                          <div className="text-xs text-muted-foreground">{org.ownerEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {plan?.name || org.currentPlanId || "Basic"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {org.status === "active" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              Active
                            </Badge>
                          )}
                          {org.status === "trial" && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              Trial
                            </Badge>
                          )}
                          {org.status === "suspended" && (
                            <Badge variant="destructive">Suspended</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {org.planExpiryDate
                            ? new Date(org.planExpiryDate).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTenant(org);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit3 className="size-3.5 mr-1" /> Edit
                          </Button>
                          {org.status !== "suspended" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                toggleStatusMutation.mutate({ orgId: org.id, status: "suspended" })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() =>
                                toggleStatusMutation.mutate({ orgId: org.id, status: "active" })
                              }
                            >
                              Activate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Tenant Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Provision New Tenant Store</DialogTitle>
              <DialogDescription>
                Create a new business store account with owner credentials and plan assignment.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTenantMutation.mutate(newTenant);
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="storeName">Store / Company Name</Label>
                <Input
                  id="storeName"
                  required
                  value={newTenant.storeName}
                  onChange={(e) => setNewTenant({ ...newTenant, storeName: e.target.value })}
                  placeholder="Apex Supermarket"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  required
                  value={newTenant.ownerName}
                  onChange={(e) => setNewTenant({ ...newTenant, ownerName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Owner Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                  placeholder="owner@apexstore.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Initial Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={newTenant.password}
                  onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan">Assign SaaS Plan</Label>
                <Select
                  value={newTenant.planId}
                  onValueChange={(val) => setNewTenant({ ...newTenant, planId: val })}
                >
                  <SelectTrigger id="plan">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (${p.price}/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  {createTenantMutation.isPending ? "Creating..." : "Create Tenant"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
