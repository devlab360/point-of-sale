import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PersistStore } from "@/lib/session-store";
import { appName } from "@/lib/env";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Shield,
  Edit2,
  Trash2,
  Loader2,
  Plus,
  Search,
  Check,
  CheckCircle2,
  Users,
  ShieldAlert,
  UserPlus,
  Crown,
  Briefcase,
  CreditCard,
  LayoutGrid,
  Table as TableIcon,
  Building2,
  Mail,
  Percent,
  Target,
  Sparkles,
  Layers,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUsersFn,
  updateUserFn,
  deleteUserFn,
  createInvitationFn,
  createUserFn,
} from "@/api/users";
import { getLocationsFn } from "@/api/locations";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  SYSTEM_MODULES,
  MODULE_CATEGORIES,
  ROLE_OPTIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_SELECTABLE_ROUTES,
  getRoleVisuals,
} from "@/constants";
import { hasPermissionForRoute } from "@/lib/menu-config";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: `Employees & Access Control · ${appName}` }] }),
  component: UsersPage,
});

function RoleSelectCards({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {ROLE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-2xl border p-4 text-left transition-all relative ${
              active
                ? "border-primary bg-primary/10 shadow-sm ring-1.5 ring-primary/50"
                : "border-border/70 bg-card hover:bg-muted/30 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid size-9.5 place-items-center rounded-xl transition-colors shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground"
                }`}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <span
                  className={`text-xs font-bold block truncate ${active ? "text-primary" : "text-foreground"}`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize block">
                  {opt.value} role
                </span>
              </div>
              {active && <Check className="ml-auto size-4 text-primary shrink-0 font-bold" />}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

function UsersPage() {
  const { user: currentUser, saasPlan, settings } = useAuth();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: orgData } = useQuery({
    queryKey: ["orgData", orgId],
    queryFn: async () => {
      const res = await import("@/api/auth").then((m) => m.getOrgDataFn({ data: { orgId } }));
      return res.success ? res : null;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
  const ownerEmail = orgData?.org?.ownerEmail?.toLowerCase();

  const { data: locationsRes } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationsFn(),
  });
  const locations: any[] = locationsRes?.data || [];

  const applicableModules = useMemo(() => {
    return SYSTEM_MODULES.filter((mod) => {
      const perm = hasPermissionForRoute(
        { role: "admin" },
        mod.defaultRoute,
        false,
        saasPlan,
        settings?.businessType,
      );
      return perm.allowed;
    });
  }, [saasPlan, settings?.businessType]);

  const applicableRoutes = useMemo(
    () => applicableModules.map((m) => m.defaultRoute),
    [applicableModules],
  );

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modals & Drawers
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDirectAddOpen, setIsDirectAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");

  // Edit / Permission Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("cashier");
  const [editStatus, setEditStatus] = useState("active");
  const [editCommission, setEditCommission] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editLocationIds, setEditLocationIds] = useState<string[]>([]);
  const [editAllBranches, setEditAllBranches] = useState(false);

  // Direct User Add Form
  const [directName, setDirectName] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [directPassword, setDirectPassword] = useState("");
  const [directRole, setDirectRole] = useState("cashier");
  const [directLocationIds, setDirectLocationIds] = useState<string[]>([]);
  const [directAllBranches, setDirectAllBranches] = useState(false);

  const {
    data: usersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users", orgId],
    queryFn: async () => {
      const res = (await getUsersFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const users: any[] = usersData || [];

  const totalEmployees = users.length;
  const adminCount = useMemo(
    () => users.filter((u) => u.role === "admin" || u.role === "manager").length,
    [users],
  );
  const cashierCount = useMemo(() => users.filter((u) => u.role === "cashier").length, [users]);
  const pendingCount = useMemo(() => users.filter((u) => u.status !== "active").length, [users]);

  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? users : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(lower) ||
          u.email?.toLowerCase().includes(lower) ||
          u.role?.toLowerCase().includes(lower),
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((u) => u.status === statusFilter);
    }
    return list;
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const openEditModal = (u: any) => {
    setEditItem(u);
    setEditName(u.name || "");
    setEditEmail(u.email || "");
    setEditRole(u.role || "cashier");
    setEditStatus(u.status || "active");
    setEditCommission(u.commissionRate ? String(u.commissionRate) : "");
    setEditTarget(u.monthlyTarget ? String(u.monthlyTarget) : "");
    const initialPerms = Array.isArray(u.permissions)
      ? u.permissions
      : DEFAULT_ROLE_PERMISSIONS[u.role || "cashier"] || [];
    setEditPermissions(initialPerms.filter((r) => applicableRoutes.includes(r)));
    const locIds = Array.isArray(u.locationIds) ? u.locationIds : [];
    setEditLocationIds(locIds);
    setEditAllBranches(locIds.length === 0 && locations.length > 0); // if no specific branches but org has branches, treat as all
  };

  const toggleLocation = (setter: (updater: (prev: string[]) => string[]) => void, id: string) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRoleChangeInEdit = (newRole: string) => {
    setEditRole(newRole);
    const defaults = DEFAULT_ROLE_PERMISSIONS[newRole] || [];
    setEditPermissions(defaults.filter((r) => applicableRoutes.includes(r)));
  };

  const togglePermission = (routePath: string) => {
    setEditPermissions((prev) =>
      prev.includes(routePath) ? prev.filter((p) => p !== routePath) : [...prev, routePath],
    );
  };

  const togglePermissionGroup = (routes: string[], groupAllOn: boolean) => {
    setEditPermissions((prev) => {
      const next = new Set(prev);
      for (const r of routes) {
        if (groupAllOn) {
          next.delete(r);
        } else {
          next.add(r);
        }
      }
      return Array.from(next);
    });
  };

  const handleSelectAllPermissions = () => setEditPermissions([...applicableRoutes]);
  const handleClearPermissions = () => setEditPermissions([]);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Email address is required");
      return;
    }
    setIsGenerating(true);
    try {
      const res = (await createInvitationFn({
        data: {
          invitation: {
            email: inviteEmail.trim().toLowerCase(),
            role: inviteRole,
          },
        },
      })) as any;

      if (res?.success) {
        const link = `${window.location.origin}/register?token=${res.data?.token || uuidv4()}&email=${encodeURIComponent(inviteEmail)}`;
        setGeneratedLink(link);
        toast.success("Invitation link generated!");
      } else throw new Error(res?.error || "Failed to generate invite");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate invite");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateDirectUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directName.trim() || !directEmail.trim() || !directPassword.trim()) {
      toast.error("All fields are required");
      return;
    }
    setIsSaving(true);
    try {
      const res = (await createUserFn({
        data: {
          user: {
            name: directName.trim(),
            email: directEmail.trim().toLowerCase(),
            password: directPassword,
            role: directRole,
            permissions: DEFAULT_ROLE_PERMISSIONS[directRole] || [],
            locationIds: directAllBranches ? [] : directLocationIds,
          },
        },
      })) as any;

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["users", orgId] });
        toast.success(`Account for ${directName} created successfully!`);
        setIsDirectAddOpen(false);
        setDirectName("");
        setDirectEmail("");
        setDirectPassword("");
        setDirectLocationIds([]);
        setDirectAllBranches(false);
      } else throw new Error(res?.error || "Failed to create user");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create staff account");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setIsSaving(true);
    try {
      const res = (await updateUserFn({
        data: {
          id: editItem.id,
          updates: {
            name: editName.trim(),
            role: editRole,
            status: editStatus,
            commissionRate: editCommission ? Number(editCommission) : 0,
            monthlyTarget: editTarget ? Number(editTarget) : 0,
            permissions: editPermissions,
            locationIds: editAllBranches ? [] : editLocationIds,
          },
        },
      })) as any;

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["users", orgId] });
        toast.success("Staff profile and access permissions updated");
        setEditItem(null);
      } else throw new Error(res?.error || "Failed to update profile");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = (await deleteUserFn({ data: { id: deleteId } })) as any;
        if (res?.success) {
          toast.success("Staff member removed");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["users", orgId] });
        } else throw new Error(res?.error || "Failed to delete");
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete staff member");
      }
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Employees & Access Control"
        description="Manage staff authorizations, cashier permissions, sales commission rates, and granular module access."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGeneratedLink("");
                setIsInviteOpen(true);
              }}
              className="gap-1.5 font-bold h-9 rounded-xl"
            >
              <UserPlus className="size-4" /> Invite Link
            </Button>
            <Button
              size="sm"
              onClick={() => setIsDirectAddOpen(true)}
              className="gap-1.5 font-bold h-9 rounded-xl shadow-xs"
            >
              <Plus className="size-4" /> Add Employee
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Staff Members"
          value={String(totalEmployees)}
          hint="Registered accounts"
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="POS Cashiers"
          value={String(cashierCount)}
          hint="Terminal register operators"
          icon={CreditCard}
          accent="success"
        />
        <StatCard
          label="Managers & Admins"
          value={String(adminCount)}
          hint="Elevated privileges"
          icon={Crown}
          accent="info"
        />
        <StatCard
          label="Pending / Inactive"
          value={String(pendingCount)}
          hint="Awaiting activation"
          icon={ShieldAlert}
          accent="warning"
        />
      </div>

      {/* Main Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search staff name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9.5 text-sm rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9.5 w-36 text-xs rounded-xl font-medium">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="cashier">POS Cashier</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9.5 w-32 text-xs rounded-xl font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-xl border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`grid size-8.5 place-items-center rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-card text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid size-8.5 place-items-center rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isUsersLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={6} />
          ) : (
            <TableSkeleton columns={6} rows={6} />
          )
        ) : isUsersError ? (
          <ErrorState onRetry={refetchUsers} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff members found"
            description={
              search ? "Try adjusting your search criteria." : "No employee accounts found."
            }
            actionLabel="Add Employee"
            onAction={() => setIsDirectAddOpen(true)}
          />
        ) : viewMode === "grid" ? (
          /* Grid View — 3 Columns for Balanced Layout */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedUsers.map((u: any) => {
                const roleVisuals = getRoleVisuals(u.role);
                const isActive = u.status === "active";
                const permsCount = Array.isArray(u.permissions) ? u.permissions.length : 0;

                return (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Member Identity Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary border border-primary/30 font-black text-sm shrink-0 shadow-xs">
                            {u.name?.slice(0, 2).toUpperCase() || "OD"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                              {u.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Mail className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{u.email}</span>
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold shrink-0 py-1 px-2.5 rounded-lg ${roleVisuals.badge}`}
                        >
                          {roleVisuals.label}
                        </Badge>
                      </div>

                      {/* 3-Column Mini KPI Metrics Badge Box */}
                      <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
                            Commission
                          </span>
                          <span className="text-xs font-black font-mono text-foreground block">
                            {u.commissionRate ? `${u.commissionRate}%` : "0%"}
                          </span>
                        </div>
                        <div className="space-y-0.5 border-x border-border/50 px-2.5">
                          <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
                            Target
                          </span>
                          <span className="text-xs font-black font-mono text-foreground truncate block">
                            {u.monthlyTarget ? formatCurrency(u.monthlyTarget) : "None"}
                          </span>
                        </div>
                        <div className="space-y-0.5 pl-1">
                          <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
                            Modules
                          </span>
                          <span className="text-xs font-black font-mono text-primary truncate block">
                            {permsCount} active
                          </span>
                        </div>
                      </div>

                      {(u.locationIds || []).length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3" /> Branches
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(u.locationIds || []).map((bid: string) => {
                              const loc = locations.find((l) => l.id === bid);
                              return loc ? (
                                <Badge
                                  key={bid}
                                  variant="outline"
                                  className="text-[10px] font-bold px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                                >
                                  {loc.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full ${
                            isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                          }`}
                        />
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-black uppercase py-0.5 px-2 ${
                            isActive
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {u.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(u)}
                          className="h-8.5 px-3 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary rounded-xl shadow-2xs"
                          disabled={u.email?.toLowerCase() === ownerEmail}
                          title={
                            u.email?.toLowerCase() === ownerEmail
                              ? "Owner cannot modify their own access"
                              : undefined
                          }
                        >
                          <Shield className="size-3.5" /> Access
                        </Button>
                        {u.email?.toLowerCase() !== ownerEmail ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(u.id)}
                            className="size-8.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : (
                          <span
                            className="size-8.5 px-3 pt-2.5 rounded-xl text-muted-foreground/50"
                            title="Owner cannot be deleted"
                          >
                            <Trash2 className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredUsers.length > pageSize && (
              <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-card">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredUsers.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px] text-xs">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold">Staff Member</TableHead>
                    <TableHead className="font-bold">Assigned Role</TableHead>
                    <TableHead className="font-bold">Commission</TableHead>
                    <TableHead className="font-bold">Sales Target</TableHead>
                    <TableHead className="font-bold">Permissions</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {paginatedUsers.map((u: any) => {
                    const roleVisuals = getRoleVisuals(u.role);
                    const isActive = u.status === "active";
                    const permsCount = Array.isArray(u.permissions) ? u.permissions.length : 0;

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid size-8.5 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0 border border-primary/20">
                              {u.name?.slice(0, 2).toUpperCase() || "OD"}
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{u.name}</span>
                              <div className="text-[11px] text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${roleVisuals.badge}`}
                          >
                            {roleVisuals.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold">
                          {u.commissionRate ? `${u.commissionRate}%` : "0%"}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-muted-foreground">
                          {u.monthlyTarget ? formatCurrency(u.monthlyTarget) : "-"}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 text-[11px]">
                            {permsCount} routes
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-black uppercase ${
                              isActive
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(u)}
                              className="h-8 text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10 rounded-xl"
                              disabled={u.email?.toLowerCase() === ownerEmail}
                              title={
                                u.email?.toLowerCase() === ownerEmail
                                  ? "Owner cannot modify their own access"
                                  : undefined
                              }
                            >
                              <Shield className="size-3.5" /> Permissions
                            </Button>
                            {u.email?.toLowerCase() !== ownerEmail ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(u.id)}
                                className="size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : (
                              <span
                                className="size-8 rounded-xl text-muted-foreground/50"
                                title="Owner cannot be deleted"
                              >
                                <Trash2 className="size-3.5" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredUsers.length > pageSize && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredUsers.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Staff Permissions Drawer — Expanded to 5XL for Ultimate Luxury Spacing */}
      <Sheet open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl"
        >
          {editItem && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="bg-muted/40 p-5 sm:p-6 border-b border-border/80 pr-12 text-left shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary border border-primary/30 shadow-xs">
                      <Shield className="size-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-lg sm:text-xl font-black text-foreground truncate flex items-center gap-2">
                        <span>Staff Access Control</span>
                        <span className="text-primary font-medium text-sm">/</span>
                        <span className="text-primary truncate">{editItem.name}</span>
                      </SheetTitle>
                      <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                        Configure assigned role, sales commission, and granular module permissions.
                      </SheetDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold py-1 px-2.5 rounded-lg ${getRoleVisuals(editRole).badge}`}
                    >
                      {getRoleVisuals(editRole).label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs font-black uppercase py-1 px-2.5 rounded-lg ${
                        editStatus === "active"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {editStatus}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              <form
                onSubmit={handleSaveEdit}
                className="flex-1 flex flex-col justify-between overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {/* 1. Staff Profile Details */}
                  <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
                        <Users className="size-3.5 text-primary" /> Staff Member Profile
                      </p>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        ID: {editItem.id?.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Full Name *</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Email Address *</Label>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  {/* 2. Role & Financial Terms */}
                  <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
                      <Crown className="size-3.5 text-primary" /> Assigned Role & Performance Terms
                    </p>
                    <RoleSelectCards value={editRole} onChange={handleRoleChangeInEdit} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                          Commission Rate (%)
                        </Label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="e.g. 5.0"
                            value={editCommission}
                            onChange={(e) => setEditCommission(e.target.value)}
                            className="pl-9 h-10 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                          Monthly Sales Target
                        </Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 50000"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="pl-9 h-10 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Account Status</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active (Full Login)</SelectItem>
                            <SelectItem value="pending">Pending Approval</SelectItem>
                            <SelectItem value="inactive">Inactive / Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  {/* 3. Branch Assignment */}
                  <section className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
                        <Building2 className="size-3.5 text-primary" /> Branch Assignment
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select one or more branches this staff member can work at. The first
                        selected branch is treated as their default branch.
                      </p>
                    </div>
                    {locations.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No branches configured yet. Add branches under Settings → Locations to
                        assign staff.
                      </p>
                    ) : (
                      <>
                        <label
                          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer mb-2
                          {editAllBranches
                            ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1.5 ring-primary/50'
                            : 'border-border/70 bg-muted/30 hover:bg-muted/50 text-muted-foreground'}"
                        >
                          <input
                            type="checkbox"
                            checked={editAllBranches}
                            onChange={(e) => {
                              setEditAllBranches(e.target.checked);
                              if (e.target.checked) setEditLocationIds([]);
                            }}
                            className="size-4 accent-primary"
                          />
                          <span className="flex items-center gap-2">
                            <Building2 className="size-4" />
                            <span>All Branches</span>
                            <span className="text-[9px] font-black uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                              All
                            </span>
                          </span>
                        </label>
                        {!editAllBranches && (
                          <div className="flex flex-wrap gap-2">
                            {locations.map((loc) => {
                              const active = editLocationIds.includes(loc.id);
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => toggleLocation(setEditLocationIds, loc.id)}
                                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                    active
                                      ? "border-primary bg-primary/10 text-primary shadow-xs ring-1.5 ring-primary/50"
                                      : "border-border/70 bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                                  }`}
                                >
                                  {active && <Check className="size-3.5 shrink-0" />}
                                  {loc.name}
                                  {loc.isHeadOffice && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      HQ
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                    {(editAllBranches || editLocationIds.length > 0) && (
                      <p className="text-[11px] text-muted-foreground">
                        {editAllBranches
                          ? "Access: All branches"
                          : `Assigned branches: ${editLocationIds.length}`}
                      </p>
                    )}
                  </section>

                  {/* 4. Granular Module Permission Matrix */}
                  <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/60">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-foreground flex items-center gap-2">
                          <Layers className="size-3.5 text-primary" /> Granular Module Authorization
                          Matrix
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Toggle specific business capabilities and route access for this staff
                          member.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary font-mono font-bold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                          {editPermissions.filter((r) => applicableRoutes.includes(r)).length} /{" "}
                          {applicableRoutes.length} enabled
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold gap-1 rounded-xl"
                          onClick={handleSelectAllPermissions}
                        >
                          <Check className="size-3.5" /> Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 font-bold rounded-xl"
                          onClick={handleClearPermissions}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {MODULE_CATEGORIES.map((category) => {
                        const categoryModules = applicableModules.filter(
                          (m) => m.category === category,
                        );
                        if (categoryModules.length === 0) return null;

                        const categoryRoutes = categoryModules.map((m) => m.defaultRoute);
                        const categoryAllOn = categoryRoutes.every((r) =>
                          editPermissions.includes(r),
                        );
                        const activeCount = categoryRoutes.filter((r) =>
                          editPermissions.includes(r),
                        ).length;

                        return (
                          <div
                            key={category}
                            className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                  {category}
                                </p>
                                <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                  {activeCount}/{categoryModules.length}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePermissionGroup(categoryRoutes, categoryAllOn)}
                                className="text-xs font-bold text-primary hover:underline"
                              >
                                {categoryAllOn ? "Deselect All" : "Select All"}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {categoryModules.map((mod) => {
                                const Icon = mod.icon;
                                const isChecked = editPermissions.includes(mod.defaultRoute);

                                return (
                                  <button
                                    key={mod.id}
                                    type="button"
                                    onClick={() => togglePermission(mod.defaultRoute)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all relative ${
                                      isChecked
                                        ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/30"
                                        : "bg-muted/20 border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                    }`}
                                  >
                                    <span
                                      className={`grid size-7.5 shrink-0 place-items-center rounded-lg transition-colors ${
                                        isChecked
                                          ? "bg-primary text-primary-foreground shadow-xs"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      <Icon className="size-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <span
                                        className={`text-xs font-bold block truncate ${isChecked ? "text-primary" : "text-foreground"}`}
                                      >
                                        {mod.label}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground truncate block font-mono">
                                        {mod.defaultRoute}
                                      </span>
                                    </div>
                                    {isChecked && (
                                      <Check className="ml-auto size-4 shrink-0 text-primary font-bold" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <SheetFooter className="p-5 sm:p-6 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="text-xs text-muted-foreground font-medium">
                    Applying{" "}
                    <span className="font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      {editPermissions.filter((r) => applicableRoutes.includes(r)).length}
                    </span>{" "}
                    module grants on save.
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditItem(null)}
                      className="font-bold rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="font-bold rounded-xl shadow-sm"
                    >
                      {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                      Save Permissions
                    </Button>
                  </div>
                </SheetFooter>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Direct Add Employee Sheet — Expanded to 3XL / 4XL */}
      <Sheet open={isDirectAddOpen} onOpenChange={setIsDirectAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 sm:p-6 border-b border-border/80 pr-12 text-left shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary border border-primary/30 shadow-xs">
                  <UserPlus className="size-6 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-lg sm:text-xl font-black text-foreground">
                    Register New Employee
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    Create an active user profile with initial role and direct login credentials.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form
              onSubmit={handleCreateDirectUser}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Full Name *</Label>
                    <Input
                      value={directName}
                      onChange={(e) => setDirectName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Email Address *</Label>
                    <Input
                      type="email"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      placeholder="e.g. staff@business.com"
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Temporary Password *</Label>
                  <Input
                    type="password"
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    placeholder="Min. 8 characters (Upper, Lower, Number, Special)"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-foreground">Assigned Role Scope</Label>
                  <RoleSelectCards value={directRole} onChange={setDirectRole} />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-4 text-primary" /> Assign Branches
                  </Label>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Select one or more branches this employee can work at. The first is the default.
                  </p>
                  {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No branches configured yet. Add branches under Settings → Locations.
                    </p>
                  ) : (
                    <>
                      <label
                        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer mb-2
                        {directAllBranches
                          ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1.5 ring-primary/50'
                          : 'border-border/70 bg-muted/30 hover:bg-muted/50 text-muted-foreground'}"
                      >
                        <input
                          type="checkbox"
                          checked={directAllBranches}
                          onChange={(e) => {
                            setDirectAllBranches(e.target.checked);
                            if (e.target.checked) setDirectLocationIds([]);
                          }}
                          className="size-4 accent-primary"
                        />
                        <span className="flex items-center gap-2">
                          <Building2 className="size-4" />
                          <span>All Branches</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                            All
                          </span>
                        </span>
                      </label>
                      {!directAllBranches && (
                        <div className="flex flex-wrap gap-2">
                          {locations.map((loc) => {
                            const active = directLocationIds.includes(loc.id);
                            return (
                              <button
                                key={loc.id}
                                type="button"
                                onClick={() => toggleLocation(setDirectLocationIds, loc.id)}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                  active
                                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1.5 ring-primary/50"
                                    : "border-border/70 bg-muted/30 hover:bg-muted/50 text-muted-foreground"
                                }`}
                              >
                                {active && <Check className="size-3.5 shrink-0" />}
                                {loc.name}
                                {loc.isHeadOffice && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    HQ
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {(directAllBranches || directLocationIds.length > 0) && (
                    <p className="text-[11px] text-muted-foreground">
                      {directAllBranches
                        ? "Access: All branches"
                        : `Assigned branches: ${directLocationIds.length}`}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Initial Module Grants
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {getRoleVisuals(directRole).label}:
                    </span>{" "}
                    receives{" "}
                    <span className="font-mono font-bold text-primary">
                      {(DEFAULT_ROLE_PERMISSIONS[directRole] || []).length}
                    </span>{" "}
                    default module grants. Fine-tune granular permissions anytime using the Access
                    drawer.
                  </p>
                </div>
              </div>

              <SheetFooter className="p-5 sm:p-6 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDirectAddOpen(false)}
                  className="font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-bold rounded-xl shadow-sm"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Create Account
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite Staff Sheet — Expanded to 3XL / 4XL */}
      <Sheet open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 sm:p-6 border-b border-border/80 pr-12 text-left shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary border border-primary/30 shadow-xs">
                  <Mail className="size-6 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-lg sm:text-xl font-black text-foreground">
                    Generate Staff Onboarding Invite
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    Generate a secure one-time registration link to onboard staff members.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form
              onSubmit={handleGenerateInvite}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Staff Email Address *</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. employee@company.com"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-foreground">Assigned Role</Label>
                  <RoleSelectCards value={inviteRole} onChange={setInviteRole} />
                </div>
              </div>

              <SheetFooter className="p-5 sm:p-6 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-end gap-2 shrink-0">
                {generatedLink ? (
                  <div className="w-full p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2.5">
                    <span className="text-xs font-bold text-foreground block">
                      Generated Onboarding Link:
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={generatedLink}
                        className="font-mono text-xs h-9 bg-background rounded-xl"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                          toast.success("Link copied to clipboard!");
                        }}
                        className="h-9 px-4 font-bold rounded-xl"
                      >
                        {copiedLink ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs font-bold rounded-xl"
                      onClick={() => setIsInviteOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                      className="font-bold rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isGenerating} className="font-bold rounded-xl">
                      {isGenerating && <Loader2 className="size-4 animate-spin mr-2" />}
                      Generate Link
                    </Button>
                  </>
                )}
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Remove Employee Account
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete this staff member? Their POS sales and shift
                  records will remain intact.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="font-bold rounded-xl"
            >
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
