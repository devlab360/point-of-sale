import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appName } from "@/lib/env";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";
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

import { SYSTEM_MODULES as ALL_SYSTEM_MODULES } from "@/constants";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: `Tenants & Stores · Super Admin ${appName}` }] }),
  component: SuperAdminTenantsPage,
});

function SuperAdminTenantsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial" | "suspended">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "expiry">("newest");

  // Edit Tenant State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [selectedGrants, setSelectedGrants] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "subscription" | "modules" | "danger">(
    "general",
  );

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
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("admin.tenantUpdatedToast", "Tenant store updated successfully"));
        setIsEditModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res?.error || t("admin.updateFailedToast", "Update failed"));
      }
    },
    onError: (err: any) => toast.error(err.message || t("admin.updateFailedToast", "Update failed")),
  });

  const saveGrantsMutation = useMutation({
    mutationFn: ({ orgId, menuKeys }: { orgId: string; menuKeys: string[] }) =>
      setAdminMenuGrantsFn({ data: { orgId, menuKeys } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("admin.moduleGrantsUpdatedToast", "Module access grants updated!"));
      } else {
        toast.error(res?.error || t("admin.saveGrantsFailedToast", "Failed to save grants"));
      }
    },
    onError: (err: any) => toast.error(err.message || t("admin.saveGrantsFailedToast", "Failed to save grants")),
  });

  const createTenantMutation = useMutation({
    mutationFn: (tenant: any) => createTenantUserFn({ data: tenant }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("admin.tenantProvisionedToast", "Tenant store provisioned successfully!"));
        setIsCreateModalOpen(false);
        setNewTenant({ storeName: "", ownerName: "", email: "", password: "", planId: "basic" });
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res?.error || t("admin.createTenantFailedToast", "Failed to create tenant"));
      }
    },
    onError: (err: any) => toast.error(err.message || t("admin.createTenantFailedToast", "Creation failed")),
  });

  const addTrialMutation = useMutation({
    mutationFn: ({ orgId, days }: { orgId: string; days: number }) =>
      addTrialDaysFn({ data: { orgId, days } }),
    onSuccess: (res: any, variables) => {
      if (res?.success) {
        toast.success(`${t("admin.addedDaysToast", "Added +")}${variables.days} ${t("admin.trialDaysToast", "trial days")}`);
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
        if (editingTenant) {
          refetch().then((r: any) => {
            const updated = r.data?.data?.orgs?.find((o: any) => o.id === editingTenant.id);
            if (updated) {
              setEditingTenant({
                ...updated,
                planExpiryDate: updated.planExpiryDate ? updated.planExpiryDate.split("T")[0] : "",
              });
            }
          });
        }
      } else {
        toast.error(res?.error || t("admin.addTrialDaysFailedToast", "Failed to add trial days"));
      }
    },
  });

  const resetSyncKeyMutation = useMutation({
    mutationFn: (orgId: string) => resetTenantSyncKeyFn({ data: { orgId } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("admin.syncKeyRegeneratedToast", "Device sync key regenerated!"));
        if (editingTenant) {
          setEditingTenant({ ...editingTenant, syncKey: res.syncKey });
        }
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res?.error || t("admin.resetSyncKeyFailedToast", "Failed to reset sync key"));
      }
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => deleteOrganizationFn({ data: { orgId } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(t("admin.tenantDeletedToast", "Tenant store deleted permanently"));
        setIsEditModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res?.error || t("admin.deleteFailedToast", "Delete failed"));
      }
    },
    onError: (err: any) => toast.error(err.message || t("admin.deleteFailedToast", "Delete failed")),
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
      if (sortBy === "newest")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest")
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "expiry") {
        return (
          new Date(a.planExpiryDate || 0).getTime() - new Date(b.planExpiryDate || 0).getTime()
        );
      }
      return 0;
    });

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Top Header */}
        <PageHeader
          title={t("admin.tenantsTitle", "Tenant Stores & Client Organizations")}
          description={t("admin.tenantsDesc", "Provision tenant stores, configure plan quotas, extend evaluation trials, and manage granular feature overrides.")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                disabled={isFetching}
              >
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span>{t("common.refresh", "Refresh")}</span>
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
                    ExpiresOn: org.planExpiryDate
                      ? new Date(org.planExpiryDate).toLocaleDateString()
                      : "Lifetime",
                    CreatedAt: new Date(org.createdAt).toLocaleDateString(),
                  }));
                  exportToCSV("SaaS_Tenant_Stores", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>{t("common.exportCsv", "Export CSV")}</span>
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="gap-2 h-9 shadow-xs"
              >
                <Plus className="size-4" />
                <span>{t("admin.provisionTenantStore", "Provision Tenant Store")}</span>
              </Button>
            </div>
          }
        />

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label={t("admin.totalRegisteredStores", "Total Registered Stores")}
            value={String(totalStores)}
            hint={t("admin.allMultiTenantBusinesses", "All multi-tenant businesses")}
            icon={Store}
            accent="primary"
          />
          <StatCard
            label={t("admin.activeSubscriptions", "Active Subscriptions")}
            value={String(activeStores)}
            hint={t("admin.paidOperationalStores", "Paid operational stores")}
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label={t("admin.trialPeriodStores", "Trial Period Stores")}
            value={String(trialStores)}
            hint={t("admin.evaluationCandidates", "Evaluation candidates")}
            icon={Sparkles}
            accent="warning"
          />
          <StatCard
            label={t("admin.suspendedExpired", "Suspended / Expired")}
            value={String(suspendedStores)}
            hint={t("admin.requiresPaymentReactivation", "Requires payment reactivation")}
            icon={Ban}
            accent="destructive"
          />
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchTenantsPlaceholder", "Search by store name, owner email, or Org ID...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-[130px] bg-background/50 text-xs">
                <SelectValue placeholder={t("admin.statusFilter", "Status Filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allStatuses", "All Statuses")} ({totalStores})</SelectItem>
                <SelectItem value="active">{t("common.active", "Active")} ({activeStores})</SelectItem>
                <SelectItem value="trial">{t("admin.trial", "Trial")} ({trialStores})</SelectItem>
                <SelectItem value="suspended">{t("admin.suspended", "Suspended")} ({suspendedStores})</SelectItem>
              </SelectContent>
            </Select>

            {/* Plan Filter */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[130px] bg-background/50 text-xs">
                <SelectValue placeholder={t("admin.planFilter", "Plan Filter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allPlans", "All Plans")}</SelectItem>
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
                <SelectValue placeholder={t("admin.sortOrder", "Sort Order")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("admin.newestFirst", "Newest First")}</SelectItem>
                <SelectItem value="oldest">{t("admin.oldestFirst", "Oldest First")}</SelectItem>
                <SelectItem value="name">{t("admin.storeNameSort", "Store Name")}</SelectItem>
                <SelectItem value="expiry">{t("admin.planExpirySort", "Plan Expiry")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                {t("admin.loadingTenants", "Loading tenant organizations…")}
              </p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center p-16 space-y-3">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Store className="size-6 opacity-40" />
              </div>
              <h3 className="font-bold text-base text-foreground">{t("admin.noTenantsFound", "No Tenant Stores Found")}</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {t("admin.noTenantsDesc", "No stores match your current query. Try clearing filters or create a new store tenant.")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                  <TableRow>
                    <TableHead className="px-4 py-3.5">{t("admin.storeAndOrg", "Store & Organization")}</TableHead>
                    <TableHead className="px-4 py-3.5">{t("admin.saasPlan", "SaaS Plan")}</TableHead>
                    <TableHead className="px-4 py-3.5">{t("common.status", "Status")}</TableHead>
                    <TableHead className="px-4 py-3.5">{t("admin.planExpiryDate", "Plan Expiry Date")}</TableHead>
                    <TableHead className="px-4 py-3.5">{t("admin.syncKey", "Sync Key")}</TableHead>
                    <TableHead className="px-4 py-3.5 text-right">{t("common.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org: any) => {
                    const plan = plans.find((p: any) => p.id === org.currentPlanId);
                    const isExpiringSoon =
                      org.planExpiryDate &&
                      new Date(org.planExpiryDate).getTime() - Date.now() <
                        3 * 24 * 60 * 60 * 1000 &&
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
                          <Badge
                            variant="outline"
                            className="font-mono text-xs font-bold bg-muted/40 uppercase"
                          >
                            {plan?.name || org.currentPlanId || "Basic"}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-4 py-3.5">
                          {org.status === "active" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px]">
                              {t("common.active", "Active")}
                            </Badge>
                          )}
                          {org.status === "trial" && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold uppercase text-[10px]">
                              {t("admin.trial", "Trial")}
                            </Badge>
                          )}
                          {org.status === "suspended" && (
                            <Badge
                              variant="destructive"
                              className="font-bold uppercase text-[10px]"
                            >
                              {t("admin.suspended", "Suspended")}
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
                                <p className="text-[10px] font-bold text-destructive">{t("admin.expired", "Expired")}</p>
                              ) : isExpiringSoon ? (
                                <p className="text-[10px] font-bold text-amber-500">
                                  {t("admin.expiringSoon", "Expiring Soon")}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{t("admin.unlimitedLifetime", "Unlimited / Lifetime")}</span>
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
                            <Edit3 className="size-3.5" /> {t("admin.manage", "Manage")}
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
                <span>{t("admin.manageTenant", "Manage Tenant:")} {editingTenant?.name}</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("admin.manageTenantDesc", "Configure store profile, subscription plan, trial periods, and granular module grants.")}
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
                    {t("admin.generalInfo", "General Info")}
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
                    {t("admin.planSubscriptionTab", "Plan & Subscription")}
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
                    <span>{t("admin.moduleGrants", "Module Grants")} ({selectedGrants.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("danger")}
                    className={`px-3 py-1.5 rounded-lg transition-colors text-destructive hover:bg-destructive/10 ${
                      activeTab === "danger"
                        ? "bg-destructive text-destructive-foreground shadow-xs"
                        : ""
                    }`}
                  >
                    {t("admin.dangerZone", "Danger Zone")}
                  </button>
                </div>

                {/* Scrollable Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Tab: General Info */}
                  {activeTab === "general" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-store-name">{t("admin.storeBusinessName", "Store / Business Name")}</Label>
                          <Input
                            id="edit-store-name"
                            value={editingTenant.name || ""}
                            onChange={(e) =>
                              setEditingTenant({ ...editingTenant, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-owner-email">{t("admin.ownerEmail", "Owner Email")}</Label>
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
                          <span className="text-muted-foreground">{t("admin.tenantOrganizationId", "Tenant Organization ID:")}</span>
                          <span className="font-mono font-bold text-foreground">
                            {editingTenant.id}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t("admin.deviceSyncKey", "Device Sync Key:")}</span>
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
                              <RefreshCw className="size-3" /> {t("admin.reset", "Reset")}
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
                          <Label htmlFor="edit-plan-id">{t("admin.assignedPlanTier", "Assigned SaaS Plan Tier")}</Label>
                          <Select
                            value={editingTenant.currentPlanId || "basic"}
                            onValueChange={(val) =>
                              setEditingTenant({ ...editingTenant, currentPlanId: val })
                            }
                          >
                            <SelectTrigger id="edit-plan-id">
                              <SelectValue placeholder={t("admin.selectPlan", "Select plan")} />
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
                          <Label htmlFor="edit-status">{t("admin.accountStatus", "Account Status")}</Label>
                          <Select
                            value={editingTenant.status || "active"}
                            onValueChange={(val) =>
                              setEditingTenant({ ...editingTenant, status: val })
                            }
                          >
                            <SelectTrigger id="edit-status">
                              <SelectValue placeholder={t("admin.selectStatus", "Select status")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">{t("common.active", "Active")}</SelectItem>
                              <SelectItem value="trial">{t("admin.trial", "Trial")}</SelectItem>
                              <SelectItem value="suspended">{t("admin.suspended", "Suspended")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-expiry">{t("admin.planExpiryDate", "Plan Expiry Date")}</Label>
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
                          <Label htmlFor="edit-extra-users">{t("admin.extraPurchasedSeats", "Extra Purchased User Seats")}</Label>
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
                            {t("admin.extraSeatsDesc", "Additional staff seats granted above the base plan limit.")}
                          </p>
                        </div>
                      </div>

                      {/* Quick Extension Buttons */}
                      <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                        <Label className="text-xs font-bold text-foreground">
                          {t("admin.quickTrialExtension", "Quick Trial Extension (+Days)")}
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1"
                            disabled={addTrialMutation.isPending}
                            onClick={() =>
                              addTrialMutation.mutate({ orgId: editingTenant.id, days: 7 })
                            }
                          >
                            +7 {t("admin.daysTrial", "Days Trial")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1"
                            disabled={addTrialMutation.isPending}
                            onClick={() =>
                              addTrialMutation.mutate({ orgId: editingTenant.id, days: 14 })
                            }
                          >
                            +14 {t("admin.daysTrial", "Days Trial")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold gap-1"
                            disabled={addTrialMutation.isPending}
                            onClick={() =>
                              addTrialMutation.mutate({ orgId: editingTenant.id, days: 30 })
                            }
                          >
                            +30 {t("admin.daysMonth", "Days Month")}
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
                            {t("admin.granularModuleOverrides", "Granular Module & Menu Overrides")}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {t("admin.moduleOverridesDesc", "Grant or revoke specific feature access beyond the standard SaaS plan limits.")}
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
                            {t("admin.selectAll", "Select All")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive"
                            onClick={handleClearAllGrants}
                          >
                            {t("common.clear", "Clear")}
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
                              <Icon
                                className={`size-4 ${isChecked ? "text-primary" : "text-muted-foreground"}`}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{mod.label}</p>
                                <p className="text-[10px] text-muted-foreground/80">
                                  {mod.category}
                                </p>
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
                        {saveGrantsMutation.isPending ? t("admin.savingGrants", "Saving Grants…") : t("admin.saveModuleGrants", "Save Module Grants")}
                      </Button>
                    </div>
                  )}

                  {/* Tab: Danger Zone */}
                  {activeTab === "danger" && (
                    <div className="space-y-4 p-4 rounded-2xl border border-destructive/30 bg-destructive/5">
                      <div>
                        <h4 className="text-sm font-bold text-destructive">{t("admin.dangerZone", "Danger Zone")}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin.dangerZoneTenantDesc", "Permanently delete this tenant store and all associated products, sales, and settings.")}
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
                          {deleteOrgMutation.isPending
                            ? t("admin.deletingTenant", "Deleting Tenant…")
                            : t("admin.deleteStorePermanently", "Delete Store Permanently")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Drawer Footer */}
                <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    {t("common.cancel", "Cancel")}
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
                    {updateOrgMutation.isPending ? t("admin.savingChanges", "Saving Changes…") : t("admin.saveAllChanges", "Save All Changes")}
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
                {t("admin.provisionNewTenantStore", "Provision New Tenant Store")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("admin.provisionTenantDesc", "Create a new business store account with owner credentials and plan assignment.")}
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
                  <Label htmlFor="create-store-name">{t("admin.storeBusinessName", "Store / Business Name")}</Label>
                  <Input
                    id="create-store-name"
                    required
                    value={newTenant.storeName}
                    onChange={(e) => setNewTenant({ ...newTenant, storeName: e.target.value })}
                    placeholder={t("admin.storeNamePlaceholder", "e.g. Apex Hypermarket")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-owner-name">{t("admin.ownerFullName", "Owner Full Name")}</Label>
                  <Input
                    id="create-owner-name"
                    required
                    value={newTenant.ownerName}
                    onChange={(e) => setNewTenant({ ...newTenant, ownerName: e.target.value })}
                    placeholder={t("admin.ownerNamePlaceholder", "e.g. Alex Henderson")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-email">{t("admin.ownerEmail", "Owner Email")}</Label>
                  <Input
                    id="create-email"
                    type="email"
                    required
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    placeholder={t("admin.ownerEmailPlaceholder", "e.g. alex@apexstore.com")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-password">{t("admin.initialPassword", "Initial Password")}</Label>
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
                  <Label htmlFor="create-plan">{t("admin.assignSaasPlanTier", "Assign SaaS Plan Tier")}</Label>
                  <Select
                    value={newTenant.planId}
                    onValueChange={(val) => setNewTenant({ ...newTenant, planId: val })}
                  >
                    <SelectTrigger id="create-plan">
                      <SelectValue placeholder={t("admin.selectPlan", "Select plan")} />
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
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  {createTenantMutation.isPending ? t("admin.creatingTenant", "Creating Tenant…") : t("admin.provisionStoreNow", "Provision Store Now")}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
