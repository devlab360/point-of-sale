import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PersistStore } from "@/lib/session-store";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  UserCheck,
  Plus,
  Search,
  Check,
  CheckCircle2,
  Copy,
  Users,
  ShieldAlert,
  UserPlus,
  Crown,
  Briefcase,
  CreditCard,
  LayoutGrid,
  Table as TableIcon,
  Mail,
  Percent,
  Target,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsersFn,
  updateUserFn,
  deleteUserFn,
  createInvitationFn,
  createUserFn,
} from "@/api/users";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { APP_GROUPS } from "@/lib/menu-config";
import { useCurrency } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";

const allSelectableUserRoutes = [
  ...APP_GROUPS.flatMap((g) => g.items.map((i) => i.to)).filter(
    (to) => !["/", "/super-admin", "/profile"].includes(to)
  ),
  "ai_copilot",
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: allSelectableUserRoutes,
  manager: allSelectableUserRoutes.filter((r) => !["/users", "/settings"].includes(r)),
  cashier: ["/pos", "/customers", "/sales", "/tables", "/kitchen", "/appointments"],
};

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Employees & Access Control · OneDesk360" }] }),
  component: UsersPage,
});

function getRoleVisuals(role: string) {
  const r = (role || "").toLowerCase();
  if (r === "admin") {
    return {
      label: "Administrator",
      badge: "bg-primary/10 text-primary border-primary/20",
    };
  }
  if (r === "manager") {
    return {
      label: "Manager",
      badge: "bg-info/10 text-info border-info/20",
    };
  }
  return {
    label: "POS Cashier",
    badge: "bg-success/15 text-success border-success/30",
  };
}

const PERMISSION_ROUTE_META: Record<string, { group: string; label: string; icon: any }> = (() => {
  const map: Record<string, { group: string; label: string; icon: any }> = {};
  for (const group of APP_GROUPS) {
    for (const item of group.items) {
      map[item.to] = { group: group.label, label: item.label, icon: item.icon };
      for (const sub of item.children || []) {
        map[sub.to] = { group: group.label, label: sub.label, icon: item.icon };
      }
    }
  }
  map["ai_copilot"] = { group: "ADMINISTRATION", label: "AI Business Copilot", icon: Sparkles };
  return map;
})();

const PERMISSION_GROUP_ORDER: string[] = APP_GROUPS.map((g) => g.label);

const ROLE_OPTIONS = [
  {
    value: "admin",
    label: "Administrator",
    icon: Crown,
    desc: "Full module access, staff management & store settings.",
  },
  {
    value: "manager",
    label: "Manager",
    icon: Briefcase,
    desc: "Catalog, inventory, sales, purchases, finance & reports.",
  },
  {
    value: "cashier",
    label: "POS Cashier",
    icon: CreditCard,
    desc: "POS billing, customers, tables, kitchen & appointments.",
  },
];

function RoleSelectCards({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {ROLE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border p-3 text-left transition-all ${
              active
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-border/70 bg-card hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`grid size-8 place-items-center rounded-lg ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span className={`text-xs font-bold ${active ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </span>
              {active && <Check className="ml-auto size-4 text-primary" />}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

function UsersPage() {
  const { user: currentUser } = useAuth();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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

  // Direct User Add Form
  const [directName, setDirectName] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [directPassword, setDirectPassword] = useState("");
  const [directRole, setDirectRole] = useState("cashier");

  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError, refetch: refetchUsers } = useQuery({
    queryKey: ["users", orgId],
    queryFn: async () => {
      const res = (await getUsersFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const users: any[] = usersData || [];

  const totalEmployees = users.length;
  const adminCount = useMemo(() => users.filter((u) => u.role === "admin").length, [users]);
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
          u.role?.toLowerCase().includes(lower)
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
    setEditPermissions(Array.isArray(u.permissions) ? u.permissions : DEFAULT_ROLE_PERMISSIONS[u.role || "cashier"] || []);
  };

  const handleRoleChangeInEdit = (newRole: string) => {
    setEditRole(newRole);
    setEditPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || []);
  };

  const togglePermission = (routePath: string) => {
    setEditPermissions((prev) =>
      prev.includes(routePath) ? prev.filter((p) => p !== routePath) : [...prev, routePath]
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

  const handleSelectAllPermissions = () => setEditPermissions([...allSelectableUserRoutes]);
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
        description="Manage staff permissions, cashier authorizations, commission structures, and role-based access control."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGeneratedLink("");
                setIsInviteOpen(true);
              }}
              className="gap-1.5"
            >
              <UserPlus className="size-4" /> Invite Link
            </Button>
            <Button
              size="sm"
              onClick={() => setIsDirectAddOpen(true)}
              className="gap-1.5"
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
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
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
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isUsersLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
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
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedUsers.map((u: any) => {
                const roleVisuals = getRoleVisuals(u.role);
                const isActive = u.status === "active";
                const permsCount = Array.isArray(u.permissions) ? u.permissions.length : 0;

                return (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                            {u.name?.slice(0, 2).toUpperCase() || "US"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                              {u.name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>

                        <Badge variant="outline" className={`text-[10px] font-bold ${roleVisuals.badge}`}>
                          {roleVisuals.label}
                        </Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Commission Rate:</span>
                          <span className="font-semibold text-foreground">{u.commissionRate ? `${u.commissionRate}%` : "0%"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Allowed Routes:</span>
                          <span className="font-semibold text-foreground">{permsCount} permissions</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${
                          isActive
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {u.status}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(u)}
                          className="h-8 text-xs font-semibold"
                        >
                          <Edit2 className="size-3.5 mr-1" /> Access
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(u.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredUsers.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
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
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Assigned Role</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u: any) => {
                    const roleVisuals = getRoleVisuals(u.role);
                    const isActive = u.status === "active";
                    const permsCount = Array.isArray(u.permissions) ? u.permissions.length : 0;

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-foreground">{u.name}</span>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${roleVisuals.badge}`}>
                            {roleVisuals.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.commissionRate ? `${u.commissionRate}%` : "0%"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {permsCount} routes enabled
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              isActive
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(u)}
                              className="h-8 text-xs font-semibold"
                            >
                              <Edit2 className="size-3.5 mr-1" /> Permissions
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(u.id)}
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredUsers.length > 0 && (
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

      {/* Edit Staff Permissions Drawer */}
      <Sheet open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          {editItem && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Shield className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-lg font-bold text-foreground truncate">
                        Edit Staff Access — {editItem.name}
                      </SheetTitle>
                      <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                        Configure role, commission, sales target, and granular module access for this employee.
                      </SheetDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] font-bold ${getRoleVisuals(editItem.role).badge}`}>
                      {getRoleVisuals(editItem.role).label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        editItem.status === "active"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {editItem.status}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Staff Profile */}
                  <section className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                      Staff Profile
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Full Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Email Address</Label>
                        <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                      </div>
                    </div>
                  </section>

                  {/* Role & Sales Terms */}
                  <section className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                      Role & Sales Terms
                    </p>
                    <RoleSelectCards value={editRole} onChange={handleRoleChangeInEdit} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Commission Rate (%)</Label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="e.g. 5"
                            value={editCommission}
                            onChange={(e) => setEditCommission(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Monthly Sales Target</Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            placeholder="e.g. 50000"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Account Status</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending Approval</SelectItem>
                            <SelectItem value="inactive">Inactive / Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  {/* Module Access */}
                  <section className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                        Module Access
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {editPermissions.length} / {allSelectableUserRoutes.length} enabled
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={handleSelectAllPermissions}
                        >
                          <Check className="size-3.5" /> Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={handleClearPermissions}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {PERMISSION_GROUP_ORDER.map((groupLabel) => {
                        const groupRoutes = allSelectableUserRoutes.filter(
                          (r) => (PERMISSION_ROUTE_META[r]?.group || "OTHER") === groupLabel
                        );
                        if (groupRoutes.length === 0) return null;
                        const groupAllOn = groupRoutes.every((r) => editPermissions.includes(r));

                        return (
                          <div
                            key={groupLabel}
                            className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                {groupLabel}
                              </p>
                              <button
                                type="button"
                                onClick={() => togglePermissionGroup(groupRoutes, groupAllOn)}
                                className="text-[11px] font-bold text-primary hover:underline"
                              >
                                {groupAllOn ? "Deselect All" : "Select All"}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {groupRoutes.map((route) => {
                                const meta = PERMISSION_ROUTE_META[route];
                                const label = meta?.label || route.replace(/^\//, "") || route;
                                const Icon = meta?.icon || Shield;
                                const isChecked = editPermissions.includes(route);
                                return (
                                  <button
                                    key={route}
                                    type="button"
                                    onClick={() => togglePermission(route)}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                                      isChecked
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-muted/20 border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                    }`}
                                  >
                                    <span
                                      className={`grid size-6 shrink-0 place-items-center rounded-md ${
                                        isChecked
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted/60 text-muted-foreground"
                                      }`}
                                    >
                                      <Icon className="size-3.5" />
                                    </span>
                                    <span className="truncate">{label}</span>
                                    {isChecked && <Check className="ml-auto size-3.5 shrink-0" />}
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

                <SheetFooter className="p-5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
                  <div className="text-xs text-muted-foreground mr-auto font-medium">
                    Applying{" "}
                    <span className="font-bold text-foreground">{editPermissions.length}</span> module
                    grants on save.
                  </div>
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm">
                    {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                    Save Permissions
                  </Button>
                </SheetFooter>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Direct Add Employee Sheet */}
      <Sheet open={isDirectAddOpen} onOpenChange={setIsDirectAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    Register New Employee
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    Create a new user account with login credentials directly.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form onSubmit={handleCreateDirectUser} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input
                      value={directName}
                      onChange={(e) => setDirectName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email Address *</Label>
                    <Input
                      type="email"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      placeholder="e.g. staff@business.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Temporary Password *</Label>
                  <Input
                    type="password"
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Assigned Role</Label>
                  <RoleSelectCards value={directRole} onChange={setDirectRole} />
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground mb-1">
                    Default Access Grants
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {getRoleVisuals(directRole).label}:
                    </span>{" "}
                    <span className="font-semibold">
                      {(DEFAULT_ROLE_PERMISSIONS[directRole] || []).length}
                    </span>{" "}
                    modules enabled by default. Fine-tune individual access anytime from the Access
                    drawer after creation.
                  </p>
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDirectAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Create Account
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite Staff Sheet */}
      <Sheet open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    Generate Staff Invite Link
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    Send a secure one-click registration link to onboard employees.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form onSubmit={handleGenerateInvite} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Staff Email Address *</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. employee@company.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Assigned Role</Label>
                  <RoleSelectCards value={inviteRole} onChange={setInviteRole} />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-end gap-2 shrink-0">
                {generatedLink ? (
                  <div className="w-full p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Onboarding Link:
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={generatedLink}
                        className="font-mono text-xs h-8 bg-background"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                          toast.success("Link copied!");
                        }}
                        className="h-8 px-3"
                      >
                        {copiedLink ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
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
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isGenerating}
                    >
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

      {/* Delete Confirmation */}
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
                  Are you sure you want to delete this staff member? Their POS shift history will remain intact.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
