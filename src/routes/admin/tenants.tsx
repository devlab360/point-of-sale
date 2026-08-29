import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getAllOrganizationsFn,
  updateOrganizationFn,
  createTenantUserFn,
  addTrialDaysFn,
  toggleOrgStatusFn,
  getAdminMenuGrantsFn,
  setAdminMenuGrantsFn,
  deleteOrganizationFn,
  resetTenantSyncKeyFn,
} from "@/api/admin/super-admin";
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
  RefreshCw,
  Key,
  Trash2,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  Building2,
  ScanBarcode,
  Package,
  Boxes,
  Wrench,
  ReceiptText,
  Truck,
  ShoppingCart,
  Users,
  Star,
  Wallet,
  BarChart3,
  MessageCircle,
  Download,
  AlertTriangle,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "Tenants & Stores · Super Admin OneDesk360" }] }),
  component: SuperAdminTenantsPage,
});

const ALL_SYSTEM_MODULES = [
  // Sales & POS
  { key: "pos", label: "POS Terminal (Billing)", icon: ScanBarcode, category: "Sales & POS" },
  { key: "sales", label: "Sales Invoices & Orders", icon: ReceiptText, category: "Sales & POS" },
  { key: "returns", label: "Sales Returns & Refunds", icon: ReceiptText, category: "Sales & POS" },
  { key: "quotations", label: "Quotations & Estimates", icon: ReceiptText, category: "Sales & POS" },
  { key: "delivery-challans", label: "Delivery Challans", icon: Truck, category: "Sales & POS" },

  // Catalog & Inventory
  { key: "products", label: "Product Catalog & Barcodes", icon: Package, category: "Catalog & Stock" },
  { key: "inventory", label: "Stock Inventory & Transfers", icon: Boxes, category: "Catalog & Stock" },
  { key: "services", label: "Services Catalog", icon: Wrench, category: "Catalog & Stock" },

  // Purchases & Vendors
  { key: "purchases", label: "Purchases & Purchase Orders", icon: ShoppingCart, category: "Procurement" },
  { key: "suppliers", label: "Suppliers & Vendors Directory", icon: Truck, category: "Procurement" },

  // Customers & Marketing
  { key: "customers", label: "Customer Directory & CRM", icon: Users, category: "Marketing & CRM" },
  { key: "coupons", label: "Coupons & Discounts", icon: Star, category: "Marketing & CRM" },
  { key: "gift-cards", label: "Gift Cards Management", icon: Star, category: "Marketing & CRM" },
  { key: "loyalty", label: "Loyalty Points & Rewards", icon: Star, category: "Marketing & CRM" },
  { key: "promotions", label: "Promotions & Deals", icon: Star, category: "Marketing & CRM" },
  { key: "whatsapp", label: "WhatsApp Marketing & Alerts", icon: MessageCircle, category: "Marketing & CRM" },

  // Finance & Accounts
  { key: "expenses", label: "Expense Management", icon: Wallet, category: "Finance & Accounts" },
  { key: "accounts", label: "Chart of Accounts & Ledger", icon: Wallet, category: "Finance & Accounts" },
  { key: "reports", label: "Financial & Sales Analytics", icon: BarChart3, category: "Finance & Accounts" },
  { key: "accounting-reports", label: "Accounting Reports (P&L, Balance Sheet)", icon: BarChart3, category: "Finance & Accounts" },

  // Verticals & Services
  { key: "repairs", label: "Repair Service Job Sheets", icon: Wrench, category: "Specialized Verticals" },
  { key: "rentals", label: "Equipment & Item Rentals", icon: Boxes, category: "Specialized Verticals" },
  { key: "subscriptions", label: "Recurring Subscriptions", icon: RefreshCw, category: "Specialized Verticals" },
  { key: "tables", label: "Restaurant Tables Management", icon: Store, category: "Specialized Verticals" },
  { key: "kitchen", label: "Kitchen Order Tickets (KOT)", icon: Store, category: "Specialized Verticals" },
  { key: "appointments", label: "Appointment Booking", icon: Calendar, category: "Specialized Verticals" },

  // Administration & Intelligence
  { key: "users", label: "Staff Users & Permissions", icon: Users, category: "Administration & AI" },
  { key: "ai", label: "AI Business Copilot", icon: Sparkles, category: "Administration & AI" },
];

function SuperAdminTenantsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "suspended">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "expiry">("newest");

  // Edit Tenant State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [selectedGrants, setSelectedGrants] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "subscription" | "modules" | "danger">("general");

  // Create Tenant State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
    storeName: "",
    ownerName: "",
    email: "",
    password: "",
    planId: "basic",
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["saas-organizations"],
    queryFn: () => getAllOrganizationsFn({ data: {} }),
  });

  const organizations = data?.data?.orgs || [];
  const plans = data?.data?.plans || [];

  const totalStores = organizations.length;
  const activeStores = organizations.filter((o: any) => o.status === "active").length;
  const trialStores = organizations.filter((o: any) => o.status === "trial").length;
  const suspendedStores = organizations.filter((o: any) => o.status === "suspended").length;

  // Fetch Grants for the editing tenant
  const openEditTenantModal = async (org: any) => {
    setEditingTenant({
      ...org,
      planExpiryDate: org.planExpiryDate ? org.planExpiryDate.split("T")[0] : "",
    });
    setActiveTab("general");
    setIsEditModalOpen(true);

    try {
      const res = await getAdminMenuGrantsFn({ data: { orgId: org.id } });
      if (res.success && Array.isArray(res.data)) {
        setSelectedGrants(res.data);
      } else {
        setSelectedGrants([]);
      }
    } catch {
      setSelectedGrants([]);
    }
  };

  const updateOrgMutation = useMutation({
    mutationFn: (org: any) => updateOrganizationFn({ data: org }),
    onSuccess: () => {
      toast.success("Tenant store updated successfully");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
    },
    onError: (err: any) => toast.error(err.message || "Update failed"),
  });

  const saveGrantsMutation = useMutation({
    mutationFn: ({ orgId, menuKeys }: { orgId: string; menuKeys: string[] }) =>
      setAdminMenuGrantsFn({ data: { orgId, menuKeys } }),
    onSuccess: () => {
      toast.success("Module access grants updated!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save grants"),
  });

  const createTenantMutation = useMutation({
    mutationFn: (tenant: any) => createTenantUserFn({ data: tenant }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Tenant store provisioned successfully!");
        setIsCreateModalOpen(false);
        setNewTenant({ storeName: "", ownerName: "", email: "", password: "", planId: "basic" });
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res.error || "Failed to create tenant");
      }
    },
    onError: (err: any) => toast.error(err.message || "Creation failed"),
  });

  const addTrialMutation = useMutation({
    mutationFn: ({ orgId, days }: { orgId: string; days: number }) =>
      addTrialDaysFn({ data: { orgId, days } }),
    onSuccess: (_, variables) => {
      toast.success(`Added +${variables.days} trial days`);
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      if (editingTenant) {
        refetch().then((res) => {
          const updated = res.data?.data?.orgs?.find((o: any) => o.id === editingTenant.id);
          if (updated) {
            setEditingTenant({
              ...updated,
              planExpiryDate: updated.planExpiryDate ? updated.planExpiryDate.split("T")[0] : "",
            });
          }
        });
      }
    },
  });

  const resetSyncKeyMutation = useMutation({
    mutationFn: (orgId: string) => resetTenantSyncKeyFn({ data: { orgId } }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Device sync key regenerated!");
        if (editingTenant) {
          setEditingTenant({ ...editingTenant, syncKey: res.syncKey });
        }
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      }
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => deleteOrganizationFn({ data: { orgId } }),
    onSuccess: () => {
      toast.success("Tenant store deleted permanently");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  const handleGrantToggle = (key: string) => {
    if (selectedGrants.includes(key)) {
      setSelectedGrants(selectedGrants.filter((k) => k !== key));
    } else {
      setSelectedGrants([...selectedGrants, key]);
    }
  };

  const handleSelectAllGrants = () => {
    setSelectedGrants(ALL_SYSTEM_MODULES.map((m) => m.key));
  };

  const handleClearAllGrants = () => {
    setSelectedGrants([]);
  };

  const filteredOrgs = organizations
    .filter((org: any) => {
      const matchesSearch =
        org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || org.status === statusFilter;
      const matchesPlan = planFilter === "all" || org.currentPlanId === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "expiry") {
        return new Date(a.planExpiryDate || 0).getTime() - new Date(b.planExpiryDate || 0).getTime();
      }
      return 0;
    });

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Top Header */}
        <PageHeader
          title="SaaS Tenant Stores & Organizations"
          description="Manage registered merchant stores, subscription states, trial extensions, and granular module permissions."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-1.5 h-9" disabled={isFetching}>
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  const exportRows = filteredOrgs.map((org: any) => ({
                    ID: org.id,
                    StoreName: org.name,
                    OwnerEmail: org.ownerEmail,
                    Status: org.status,
                    Plan: org.currentPlanId || "basic",
                    ExpiresOn: org.planExpiryDate ? new Date(org.planExpiryDate).toLocaleDateString() : "Lifetime",
                    CreatedAt: new Date(org.createdAt).toLocaleDateString(),
                  }));
                  exportToCSV("SaaS_Tenant_Stores", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-2 h-9 shadow-xs">
                <Plus className="size-4" />
                <span>Provision Tenant Store</span>
              </Button>
            </div>
          }
        />

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Registered Stores"
            value={String(totalStores)}
            hint="All multi-tenant businesses"
            icon={Store}
            accent="primary"
          />
          <StatCard
            label="Active Subscriptions"
            value={String(activeStores)}
            hint="Paid operational stores"
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Trial Period Stores"
            value={String(trialStores)}
            hint="Evaluation candidates"
            icon={Sparkles}
            accent="warning"
          />
          <StatCard
            label="Suspended / Expired"
            value={String(suspendedStores)}
            hint="Requires payment reactivation"
            icon={Ban}
            accent="destructive"
          />
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by store name, owner email, or Org ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-[130px] bg-background/50 text-xs">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({totalStores})</SelectItem>
                <SelectItem value="active">Active ({activeStores})</SelectItem>
                <SelectItem value="trial">Trial ({trialStores})</SelectItem>
                <SelectItem value="suspended">Suspended ({suspendedStores})</SelectItem>
              </SelectContent>
            </Select>

            {/* Plan Filter */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[130px] bg-background/50 text-xs">
                <SelectValue placeholder="Plan Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {plans.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[130px] bg-background/50 text-xs">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Store Name</SelectItem>
                <SelectItem value="expiry">Plan Expiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading tenant organizations…</p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center p-16 space-y-3">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Store className="size-6 opacity-40" />
              </div>
              <h3 className="font-bold text-base text-foreground">No Tenant Stores Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No stores match your current query. Try clearing filters or create a new store tenant.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                  <TableRow>
                    <TableHead className="px-4 py-3.5">Store & Organization</TableHead>
                    <TableHead className="px-4 py-3.5">SaaS Plan</TableHead>
                    <TableHead className="px-4 py-3.5">Status</TableHead>
                    <TableHead className="px-4 py-3.5">Plan Expiry Date</TableHead>
                    <TableHead className="px-4 py-3.5">Sync Key</TableHead>
                    <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org: any) => {
                    const plan = plans.find((p: any) => p.id === org.currentPlanId);
                    const isExpiringSoon =
                      org.planExpiryDate &&
                      new Date(org.planExpiryDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 &&
                      new Date(org.planExpiryDate).getTime() > Date.now();
                    const isExpired =
                      org.planExpiryDate && new Date(org.planExpiryDate).getTime() < Date.now();

                    return (
                      <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {org.name?.slice(0, 2)?.toUpperCase() || "ST"}
                            </div>
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-2">
                                <span>{org.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{org.ownerEmail}</div>
                              <div className="text-[10px] text-muted-foreground/70 font-mono">
                                ID: {org.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/40 uppercase">
                            {plan?.name || org.currentPlanId || "Basic"}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          {org.status === "active" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px]">
                              Active
                            </Badge>
                          )}
                          {org.status === "trial" && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold uppercase text-[10px]">
                              Trial
                            </Badge>
                          )}
                          {org.status === "suspended" && (
                            <Badge variant="destructive" className="font-bold uppercase text-[10px]">
                              Suspended
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-3.5 text-xs">
                          {org.planExpiryDate ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-foreground font-medium">
                                {new Date(org.planExpiryDate).toLocaleDateString()}
                              </span>
                              {isExpired ? (
                                <p className="text-[10px] font-bold text-destructive">Expired</p>
                              ) : isExpiringSoon ? (
                                <p className="text-[10px] font-bold text-amber-500">Expiring Soon</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unlimited / Lifetime</span>
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            {org.syncKey ? `${org.syncKey.slice(0, 10)}…` : "default-key"}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-3.5 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 font-semibold"
                            onClick={() => openEditTenantModal(org)}
                          >
                            <Edit3 className="size-3.5" /> Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Comprehensive Edit / Manage Tenant Drawer */}
        <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Store className="size-5 text-primary" />
                <span>Manage Tenant: {editingTenant?.name}</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Configure store profile, subscription plan, trial periods, and granular module grants.
              </SheetDescription>
            </SheetHeader>

            {editingTenant && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Navigation Tabs Header */}
                <div className="flex items-center gap-1.5 px-5 pt-3 pb-2 border-b bg-muted/20 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === "general"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    General Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("subscription")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === "subscription"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Plan & Subscription
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("modules")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                      activeTab === "modules"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Module Grants ({selectedGrants.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("danger")}
                    className={`px-3 py-1.5 rounded-lg transition-colors text-destructive hover:bg-destructive/10 ${
                      activeTab === "danger" ? "bg-destructive text-destructive-foreground shadow-xs" : ""
                    }`}
                  >
                    Danger Zone
                  </button>
                </div>

                {/* Scrollable Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Tab: General Info */}
                  {activeTab === "general" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-store-name">Store / Business Name</Label>
                          <Input
                            id="edit-store-name"
                            value={editingTenant.name || ""}
                            onChange={(e) =>
                              setEditingTenant({ ...editingTenant, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-owner-email">Owner Email</Label>
                          <Input
                            id="edit-owner-email"
                            type="email"
                            value={editingTenant.ownerEmail || ""}
                            onChange={(e) =>
                              setEditingTenant({ ...editingTenant, ownerEmail: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tenant Organization ID:</span>
                          <span className="font-mono font-bold text-foreground">{editingTenant.id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Device Sync Key:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-foreground">
                              {editingTenant.syncKey || "default-sync-key"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] px-2 gap-1"
                              disabled={resetSyncKeyMutation.isPending}
                              onClick={() => resetSyncKeyMutation.mutate(editingTenant.id)}
                            >
                              <RefreshCw className="size-3" /> Reset
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Subscription & Trial */}
                  {activeTab === "subscription" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-plan-id">Assigned SaaS Plan Tier</Label>
                          <Select
                            value={editingTenant.currentPlanId || "basic"}
                            onValueChange={(val) =>
                              setEditingTenant({ ...editingTenant, currentPlanId: val })
                            }
                          >
                            <SelectTrigger id="edit-plan-id">
                              <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} (₹{p.price || 0}/mo)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-status">Account Status</Label>
                          <Select
                            value={editingTenant.status || "active"}
                            onValueChange={(val) =>
                              setEditingTenant({ ...editingTenant, status: val })
                            }
                          >
                            <SelectTrigger id="edit-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-expiry">Plan Expiry Date</Label>
                          <Input
                            id="edit-expiry"
                            type="date"
                            value={editingTenant.planExpiryDate || ""}
                            onChange={(e) =>
                              setEditingTenant({ ...editingTenant, planExpiryDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-extra-users">Extra Purchased User Seats</Label>
                          <Input
                            id="edit-extra-users"
                            type="number"
                            min={0}
                            placeholder="0"
                            value={editingTenant.extraUsersQuota ?? 0}
                            onChange={(e) =>
                              setEditingTenant({
                                ...editingTenant,
                                extraUsersQuota: Number(e.target.value),
                              })
                            }
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Additional staff seats granted above the base plan limit.
                          </p>
                        </div>
                      </div>

                      {/* Quick Extension Buttons */}
                      <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                        <Label className="text-xs font-bold text-foreground">
                          Quick Trial Extension (+Days)
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1"
                            disabled={addTrialMutation.isPending}
                            onClick={() => addTrialMutation.mutate({ orgId: editingTenant.id, days: 7 })}
                          >
                            +7 Days Trial
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1"
                            disabled={addTrialMutation.isPending}
                            onClick={() => addTrialMutation.mutate({ orgId: editingTenant.id, days: 14 })}
                          >
                            +14 Days Trial
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1"
                            disabled={addTrialMutation.isPending}
                            onClick={() => addTrialMutation.mutate({ orgId: editingTenant.id, days: 30 })}
                          >
                            +30 Days Month
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Granular Module Grants */}
                  {activeTab === "modules" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            Granular Module & Menu Overrides
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Grant or revoke specific feature access beyond the standard SaaS plan limits.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={handleSelectAllGrants}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={handleClearAllGrants}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ALL_SYSTEM_MODULES.map((mod) => {
                          const isChecked = selectedGrants.includes(mod.key);
                          const Icon = mod.icon;
                          return (
                            <label
                              key={mod.key}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-primary/5 border-primary/40 text-foreground"
                                  : "bg-card border-border/70 text-muted-foreground hover:bg-muted/30"
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleGrantToggle(mod.key)}
                              />
                              <Icon className={`size-4 ${isChecked ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{mod.label}</p>
                                <p className="text-[10px] text-muted-foreground/80">{mod.category}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="w-full h-9 text-xs font-bold shadow-xs"
                        disabled={saveGrantsMutation.isPending}
                        onClick={() =>
                          saveGrantsMutation.mutate({
                            orgId: editingTenant.id,
                            menuKeys: selectedGrants,
                          })
                        }
                      >
                        {saveGrantsMutation.isPending ? "Saving Grants…" : "Save Module Grants"}
                      </Button>
                    </div>
                  )}

                  {/* Tab: Danger Zone */}
                  {activeTab === "danger" && (
                    <div className="space-y-4 p-4 rounded-2xl border border-destructive/30 bg-destructive/5">
                      <div>
                        <h4 className="text-sm font-bold text-destructive">Danger Zone</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Permanently delete this tenant store and all associated products, sales, and settings.
                        </p>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleteOrgMutation.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                `ARE YOU ABSOLUTELY SURE?\n\nThis will permanently delete "${editingTenant.name}" (${editingTenant.id}) and all its data!`,
                              )
                            ) {
                              deleteOrgMutation.mutate(editingTenant.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4 mr-1.5" />
                          {deleteOrgMutation.isPending ? "Deleting Tenant…" : "Delete Store Permanently"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Drawer Footer */}
                <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={updateOrgMutation.isPending}
                    onClick={() => {
                      updateOrgMutation.mutate({
                        orgId: editingTenant.id,
                        name: editingTenant.name,
                        ownerEmail: editingTenant.ownerEmail,
                        status: editingTenant.status,
                        currentPlanId: editingTenant.currentPlanId,
                        extraUsersQuota: Number(editingTenant.extraUsersQuota || 0),
                        planExpiryDate: editingTenant.planExpiryDate || undefined,
                      });
                    }}
                  >
                    {updateOrgMutation.isPending ? "Saving Changes…" : "Save All Changes"}
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Provision New Tenant Store Drawer */}
        <Sheet open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Provision New Tenant Store
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Create a new business store account with owner credentials and plan assignment.
              </SheetDescription>
            </SheetHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTenantMutation.mutate(newTenant);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-store-name">Store / Business Name</Label>
                  <Input
                    id="create-store-name"
                    required
                    value={newTenant.storeName}
                    onChange={(e) => setNewTenant({ ...newTenant, storeName: e.target.value })}
                    placeholder="e.g. Apex Hypermarket"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-owner-name">Owner Full Name</Label>
                  <Input
                    id="create-owner-name"
                    required
                    value={newTenant.ownerName}
                    onChange={(e) => setNewTenant({ ...newTenant, ownerName: e.target.value })}
                    placeholder="e.g. Alex Henderson"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-email">Owner Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    required
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    placeholder="e.g. alex@apexstore.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-password">Initial Password</Label>
                  <Input
                    id="create-password"
                    type="password"
                    required
                    value={newTenant.password}
                    onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-plan">Assign SaaS Plan Tier</Label>
                  <Select
                    value={newTenant.planId}
                    onValueChange={(val) => setNewTenant({ ...newTenant, planId: val })}
                  >
                    <SelectTrigger id="create-plan">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (₹{p.price || 0}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  {createTenantMutation.isPending ? "Creating Tenant…" : "Provision Store Now"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
