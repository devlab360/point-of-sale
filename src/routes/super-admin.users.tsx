import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { localDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSuperAdminDataFn, updateOrganizationFn, createTenantUserFn } from "@/sync-api";
import { Store, Search, CheckCircle2, Clock, Ban, Plus, Loader2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/super-admin/users")({
  component: SuperAdminUsers,
});

const ADMIN_KEY = import.meta.env.VITE_SUPER_ADMIN_PASSWORD || "admin123";

function SuperAdminUsers() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({
    storeName: "",
    ownerName: "",
    email: "",
    password: "",
    planId: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getSuperAdminDataFn({ data: { adminKey: ADMIN_KEY } }) as any;
      if (result.success && result.data) {
        // Filter out the default org, only show real tenants
        const realOrgs = result.data.organizations.filter((o: any) => o.id !== "default");
        setOrganizations(realOrgs);
        setPlans(result.data.plans);

        // Sync orgs to local Dexie
        for (const org of result.data.organizations) {
          await localDb.saasOrganizations.put({
            id: org.id,
            name: org.name,
            ownerEmail: org.ownerEmail,
            status: org.status,
            currentPlanId: org.currentPlanId,
            planExpiryDate: org.planExpiryDate,
            syncKey: org.syncKey,
            isOnline: org.isOnline ?? true,
          });
        }
        for (const plan of result.data.plans) {
          await localDb.saasPlans.put({
            id: plan.id,
            name: plan.name,
            price: Number(plan.price),
            features: (plan.features as string[]) || [],
            limits: (plan.limits as any) || {},
          });
        }
      }
    } catch (e) {
      toast.error("Could not connect to cloud. Showing local data.");
      const orgs = await localDb.saasOrganizations.toArray();
      setOrganizations(orgs.filter(o => o.id !== "default"));
      const localPlans = await localDb.saasPlans.toArray();
      setPlans(localPlans);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredOrgs = organizations.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.name?.toLowerCase().includes(q) || o.ownerEmail?.toLowerCase().includes(q);
  });

  const activePaidSubscribers = organizations.filter(o => o.status === "active").length;
  const estimatedRevenue = organizations.reduce((acc, org) => {
    if (org.status === "active") {
      const plan = plans.find(p => p.id === org.currentPlanId);
      return acc + (Number(plan?.price) || 0);
    }
    return acc;
  }, 0);

  const handleToggleSuspend = async (org: any) => {
    const newStatus = org.status === "suspended" ? "active" : "suspended";
    try {
      const result = await updateOrganizationFn({ data: { adminKey: ADMIN_KEY, orgId: org.id, updates: { status: newStatus } } }) as any;
      await localDb.saasOrganizations.update(org.id, { status: newStatus });
      toast.success(`Tenant ${newStatus === "suspended" ? "suspended" : "activated"}`);
      await loadData();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleAddTrialDays = async (org: any) => {
    const currentExpiry = new Date(org.planExpiryDate || Date.now());
    const newExpiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await updateOrganizationFn({ data: { adminKey: ADMIN_KEY, orgId: org.id, updates: { planExpiryDate: newExpiry } } }) as any;
      await localDb.saasOrganizations.update(org.id, { planExpiryDate: newExpiry });
      toast.success("Added 7 days trial!");
      await loadData();
    } catch (e) {
      toast.error("Failed");
    }
  };

  const handleEditTenantSubmit = async () => {
    if (!editingTenant?.name || !editingTenant?.ownerEmail) return toast.error("Fill required fields");
    try {
      await updateOrganizationFn({
        data: {
          adminKey: ADMIN_KEY,
          orgId: editingTenant.id,
          updates: {
            name: editingTenant.name,
            ownerEmail: editingTenant.ownerEmail,
            status: editingTenant.status,
            currentPlanId: editingTenant.currentPlanId,
          }
        }
      }) as any;
      await localDb.saasOrganizations.update(editingTenant.id, {
        name: editingTenant.name,
        ownerEmail: editingTenant.ownerEmail,
        status: editingTenant.status,
        currentPlanId: editingTenant.currentPlanId,
      });
      toast.success("Tenant updated!");
      setIsEditModalOpen(false);
      await loadData();
    } catch (e) {
      toast.error("Failed to update tenant");
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenant.storeName || !newTenant.email || !newTenant.password || !newTenant.planId) {
      return toast.error("Please fill in all required fields");
    }
    setIsCreating(true);
    try {
      const result = await createTenantUserFn({ data: { adminKey: ADMIN_KEY, ...newTenant } }) as any;
      if (result.success) {
        toast.success(`Store "${newTenant.storeName}" created successfully!`);
        setIsCreateModalOpen(false);
        setNewTenant({ storeName: "", ownerName: "", email: "", password: "", planId: "" });
        await loadData();
      } else {
        toast.error("Failed: " + result.error);
      }
    } catch (e) {
      toast.error("Server error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">SaaS Tenants</h2>
          <p className="text-sm text-muted-foreground">All registered stores loaded from cloud database</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="size-4 mr-2" /> Create Store (Admin)
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Search store name or email..."
            className="pl-9 h-12 bg-white rounded-xl border-gray-200 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">TOTAL TENANTS</div>
          <div className="text-2xl font-bold text-emerald-600">{organizations.length} Stores</div>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">ACTIVE PAID</div>
          <div className="text-2xl font-bold text-emerald-600">{activePaidSubscribers} Stores</div>
        </div>
        <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">EST. MONTHLY REVENUE</div>
          <div className="text-2xl font-bold text-gray-900">₹{estimatedRevenue.toFixed(0)}/mo</div>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading all tenants from cloud...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase text-muted-foreground bg-gray-50/50 border-b border-gray-100 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">STORE NAME</th>
                  <th className="px-6 py-4">OWNER EMAIL</th>
                  <th className="px-6 py-4">PLAN</th>
                  <th className="px-6 py-4">TRIAL EXPIRY</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrgs.map(org => {
                  const plan = plans.find(p => p.id === org.currentPlanId);
                  const expiryDate = org.planExpiryDate ? new Date(org.planExpiryDate).toLocaleDateString() : "N/A";
                  return (
                    <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Store className="size-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{org.name}</span>
                            <span className="text-[11px] text-muted-foreground">ID: {org.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{org.ownerEmail}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs font-medium">{plan?.name || org.currentPlanId || "—"}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{expiryDate}</td>
                      <td className="px-6 py-4">
                        {org.status === "active" && <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-full">Active</Badge>}
                        {org.status === "suspended" && <Badge variant="destructive" className="rounded-full border-none">Suspended</Badge>}
                        {org.status === "trial" && <Badge className="bg-blue-100 text-blue-700 border-none rounded-full">Trial</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-full h-8 text-xs" onClick={() => handleAddTrialDays(org)}>
                          <Clock className="size-3.5 mr-1" /> +7 Days
                        </Button>
                        <Button size="sm" variant="outline" className={org.status === "suspended" ? "border-green-200 text-green-600" : "border-red-200 text-red-600"} onClick={() => handleToggleSuspend(org)}>
                          <Ban className="size-3.5 mr-1" /> {org.status === "suspended" ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs underline" onClick={() => { setEditingTenant({ ...org }); setIsEditModalOpen(true); }}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrgs.length === 0 && !isLoading && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No tenants found. New sign-ups will appear here automatically.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-5" /> Create New Store (Admin)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Store / Business Name <span className="text-red-500">*</span></Label>
              <Input value={newTenant.storeName} onChange={e => setNewTenant(p => ({ ...p, storeName: e.target.value }))} placeholder="e.g. Samim Grocery Store" />
            </div>
            <div className="space-y-2">
              <Label>Owner Full Name</Label>
              <Input value={newTenant.ownerName} onChange={e => setNewTenant(p => ({ ...p, ownerName: e.target.value }))} placeholder="e.g. Samim Aktar" />
            </div>
            <div className="space-y-2">
              <Label>Owner Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={newTenant.email} onChange={e => setNewTenant(p => ({ ...p, email: e.target.value }))} placeholder="owner@store.com" />
            </div>
            <div className="space-y-2">
              <Label>Login Password / PIN <span className="text-red-500">*</span></Label>
              <PasswordInput value={newTenant.password} onChange={e => setNewTenant(p => ({ ...p, password: e.target.value }))} placeholder="Set a password for this store" />
            </div>
            <div className="space-y-2">
              <Label>Assign Plan <span className="text-red-500">*</span></Label>
              <Select value={newTenant.planId} onValueChange={val => setNewTenant(p => ({ ...p, planId: val }))}>
                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ₹{p.price}/mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTenant} disabled={isCreating}>
              {isCreating && <Loader2 className="size-4 animate-spin mr-2" />}
              Create Store & User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Tenant</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={editingTenant?.name || ""} onChange={e => setEditingTenant((p: any) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Owner Email</Label>
              <Input type="email" value={editingTenant?.ownerEmail || ""} onChange={e => setEditingTenant((p: any) => ({ ...p, ownerEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select value={editingTenant?.currentPlanId || ""} onValueChange={val => setEditingTenant((p: any) => ({ ...p, currentPlanId: val }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.price})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingTenant?.status || "active"} onValueChange={val => setEditingTenant((p: any) => ({ ...p, status: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTenantSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
