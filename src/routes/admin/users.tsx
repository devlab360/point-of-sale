import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Users,
  Shield,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Mail,
  User,
  Loader2,
  Clock,
  Laptop,
  ShieldAlert,
  RefreshCw,
  Download,
  Key,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import {
  getSuperAdminUsersFn,
  createSuperAdminUserFn,
  deleteSuperAdminUserFn,
  getSuperAdminSessionsFn,
  revokeSuperAdminSessionFn,
  updateSuperAdminUserPermissionsFn,
} from "@/api/admin/super-admin";
import { SUPER_ADMIN_MODULES } from "@/lib/admin/super-admin-permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Super Admin Personnel · OneDesk360" }] }),
  component: SuperAdminUsersPage,
});

function SuperAdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAdminAuth();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    adminPermissions: [] as string[],
  });
  const [newUserFullAccess, setNewUserFullAccess] = useState(true);

  // Permissions editing state
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<any>(null);
  const [editingPerms, setEditingPerms] = useState<string[]>([]);
  const [editPermFullAccess, setEditPermFullAccess] = useState(true);

  const {
    data: usersData,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
    isFetching: isUsersFetching,
  } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: () => getSuperAdminUsersFn({ data: {} }),
  });

  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["super-admin-sessions"],
    queryFn: () => getSuperAdminSessionsFn({ data: {} }),
  });

  const users = (usersData?.data as any[]) || [];
  const sessions = (sessionsData?.data as any[]) || [];

  const [filterQuery, setFilterQuery] = useState("");
  const [filterEntity, setFilterEntity] = useState<"admins" | "sessions">("admins");
  const [adminAccessFilter, setAdminAccessFilter] = useState<"all" | "full" | "restricted">("all");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<
    "all" | "live" | "expired" | "revoked"
  >("all");

  const filteredUsers = useMemo(() => {
    const q = filterEntity === "admins" ? filterQuery.trim().toLowerCase() : "";
    return users.filter((u: any) => {
      const matchesSearch =
        !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const perms: string[] | null = u.adminPermissions;
      const isFullAccess = !perms || perms.length === 0;
      const matchesAccess =
        adminAccessFilter === "all" ||
        (adminAccessFilter === "full" && isFullAccess) ||
        (adminAccessFilter === "restricted" && !isFullAccess);
      return matchesSearch && matchesAccess;
    });
  }, [users, filterQuery, filterEntity, adminAccessFilter]);

  const filteredSessions = useMemo(() => {
    const q = filterEntity === "sessions" ? filterQuery.trim().toLowerCase() : "";
    return sessions.filter((s: any) => {
      const matchesSearch =
        !q ||
        s.userName?.toLowerCase().includes(q) ||
        s.userEmail?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q);
      const isRevoked = Boolean(s.revokedAt);
      const isExpired = new Date(s.expiresAt).getTime() < Date.now();
      const status = isRevoked ? "revoked" : isExpired ? "expired" : "live";
      const matchesStatus = sessionStatusFilter === "all" || status === sessionStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, filterQuery, filterEntity, sessionStatusFilter]);

  const liveSessionCount = useMemo(
    () =>
      sessions.filter((s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now())
        .length,
    [sessions],
  );
  const revokedSessionCount = useMemo(
    () => sessions.filter((s: any) => Boolean(s.revokedAt)).length,
    [sessions],
  );

  const activeSessionsCount = sessions.filter(
    (s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now(),
  ).length;

  const createUserMutation = useMutation({
    mutationFn: (data: any) => createSuperAdminUserFn({ data }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("New Super Administrator provisioned!");
        setIsAddUserModalOpen(false);
        setNewUser({ name: "", email: "", password: "", adminPermissions: [] });
        setNewUserFullAccess(true);
        queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      } else {
        toast.error(res.error || "Failed to create user");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to create user"),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: (data: { userId: string; adminPermissions: string[] | null }) =>
      updateSuperAdminUserPermissionsFn({ data }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Module permissions updated!");
        setEditingPermissionsUser(null);
        queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      } else {
        toast.error(res.error || "Failed to update permissions");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to update permissions"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteSuperAdminUserFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Super Admin account removed");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => revokeSuperAdminSessionFn({ data: { sessionId } }),
    onSuccess: () => {
      toast.success("Admin session revoked");
      queryClient.invalidateQueries({ queryKey: ["super-admin-sessions"] });
    },
  });

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="Super Admin Personnel & Active Sessions"
          description="Manage master platform personnel with root administrative authority and inspect active login sessions."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  refetchUsers();
                  refetchSessions();
                }}
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                disabled={isUsersFetching}
              >
                <RefreshCw className={`size-3.5 ${isUsersFetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  const exportRows = users.map((u: any) => ({
                    ID: u.id,
                    Name: u.name,
                    Email: u.email,
                    Role: "Super Administrator",
                    Joined: u.joined ? new Date(u.joined).toLocaleDateString() : "System",
                  }));
                  exportToCSV("Super_Admin_Personnel", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export Staff CSV</span>
              </Button>
              <Button
                onClick={() => setIsAddUserModalOpen(true)}
                size="sm"
                className="gap-2 h-9 shadow-xs"
              >
                <Plus className="size-4" />
                <span>Add Super Admin</span>
              </Button>
            </div>
          }
        />

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Super Administrators"
            value={String(users.length)}
            hint="Root administrative accounts"
            icon={Shield}
            accent="primary"
          />
          <StatCard
            label="Active Login Sessions"
            value={String(activeSessionsCount)}
            hint={`${sessions.length} total recorded`}
            icon={Laptop}
            accent="success"
          />
          <StatCard
            label="Session Security"
            value="Argon2 Encrypted"
            hint="Cryptographic JWT Session Engine"
            icon={ShieldCheck}
            accent="info"
          />
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search administrator or session..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Select value={filterEntity} onValueChange={(v) => setFilterEntity(v as any)}>
              <SelectTrigger className="w-[150px] bg-background/50 text-xs">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admins">Admins</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
              </SelectContent>
            </Select>

            {filterEntity === "admins" && (
              <Select
                value={adminAccessFilter}
                onValueChange={(v) => setAdminAccessFilter(v as any)}
              >
                <SelectTrigger className="w-[160px] bg-background/50 text-xs">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Access ({users.length})</SelectItem>
                  <SelectItem value="full">
                    Full Access (
                    {
                      users.filter(
                        (u: any) => !u.adminPermissions || u.adminPermissions.length === 0,
                      ).length
                    }
                    )
                  </SelectItem>
                  <SelectItem value="restricted">
                    Restricted (
                    {
                      users.filter((u: any) => u.adminPermissions && u.adminPermissions.length > 0)
                        .length
                    }
                    )
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {filterEntity === "sessions" && (
              <Select
                value={sessionStatusFilter}
                onValueChange={(v) => setSessionStatusFilter(v as any)}
              >
                <SelectTrigger className="w-[160px] bg-background/50 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses ({sessions.length})</SelectItem>
                  <SelectItem value="live">Live Valid ({liveSessionCount})</SelectItem>
                  <SelectItem value="expired">
                    Expired ({sessions.length - liveSessionCount - revokedSessionCount})
                  </SelectItem>
                  <SelectItem value="revoked">Revoked ({revokedSessionCount})</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Super Admin Personnel Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <span>Platform Administrators ({filteredUsers.length})</span>
            </h3>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
            {isUsersLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No administrators match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                    <TableRow>
                      <TableHead className="px-4 py-3.5">Administrator</TableHead>
                      <TableHead className="px-4 py-3.5">Module Permissions</TableHead>
                      <TableHead className="px-4 py-3.5">Status</TableHead>
                      <TableHead className="px-4 py-3.5">Last Active</TableHead>
                      <TableHead className="px-4 py-3.5">Joined</TableHead>
                      <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((admin: any) => {
                      const isSelf =
                        admin.email === currentUser?.email || admin.id === currentUser?.id;
                      return (
                        <TableRow key={admin.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                {admin.name?.slice(0, 2)?.toUpperCase() || "SA"}
                              </div>
                              <div>
                                <div className="font-bold text-foreground flex items-center gap-2">
                                  <span>{admin.name}</span>
                                  {isSelf && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0 font-bold"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{admin.email}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            {(() => {
                              const perms: string[] | null = admin.adminPermissions;
                              const isFullAccess = !perms || perms.length === 0;
                              return (
                                <div className="flex flex-wrap gap-1 max-w-[260px]">
                                  {isFullAccess ? (
                                    <Badge className="bg-primary/15 text-primary border-primary/30 font-bold uppercase text-[10px]">
                                      ⚡ Full Access
                                    </Badge>
                                  ) : (
                                    perms.map((key) => {
                                      const mod = SUPER_ADMIN_MODULES.find((m) => m.key === key);
                                      return (
                                        <Badge
                                          key={key}
                                          variant="secondary"
                                          className="text-[9px] font-semibold uppercase"
                                        >
                                          {mod?.label || key}
                                        </Badge>
                                      );
                                    })
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px]">
                              Active
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                            {admin.lastActive
                              ? new Date(admin.lastActive).toLocaleString()
                              : "Just now"}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                            {admin.joined
                              ? new Date(admin.joined).toLocaleDateString()
                              : "System Initial"}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              {!isSelf && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 font-semibold text-xs gap-1.5"
                                  onClick={() => {
                                    const perms: string[] | null = admin.adminPermissions;
                                    const isFullAccess = !perms || perms.length === 0;
                                    setEditingPermissionsUser(admin);
                                    setEditPermFullAccess(isFullAccess);
                                    setEditingPerms(isFullAccess ? [] : [...perms]);
                                  }}
                                >
                                  <Key className="size-3.5" /> Permissions
                                </Button>
                              )}
                              {!isSelf && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:bg-destructive/10 h-8 font-semibold"
                                  disabled={deleteUserMutation.isPending}
                                  onClick={() => {
                                    if (confirm(`Remove administrator "${admin.name}"?`)) {
                                      deleteUserMutation.mutate(admin.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="size-3.5 mr-1" /> Remove
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Active Super Admin Sessions Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Laptop className="size-4 text-indigo-500" />
                <span>Active Server Login Sessions ({filteredSessions.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Cryptographically signed 24-hour JWT auth tokens stored in database
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
            {isSessionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No active sessions.
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No sessions match your search or filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                    <TableRow>
                      <TableHead className="px-4 py-3.5">Session User</TableHead>
                      <TableHead className="px-4 py-3.5">Session ID</TableHead>
                      <TableHead className="px-4 py-3.5">Login Created</TableHead>
                      <TableHead className="px-4 py-3.5">Token Expiry</TableHead>
                      <TableHead className="px-4 py-3.5">Status</TableHead>
                      <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((sess: any) => {
                      const isRevoked = Boolean(sess.revokedAt);
                      const isExpired = new Date(sess.expiresAt).getTime() < Date.now();
                      return (
                        <TableRow key={sess.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="px-4 py-3.5">
                            <span className="font-bold text-xs text-foreground">
                              {sess.userName || "Super Admin"}
                            </span>
                            <p className="text-[10px] text-muted-foreground">{sess.userEmail}</p>
                          </TableCell>

                          <TableCell className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {sess.id?.slice(0, 12)}…
                          </TableCell>

                          <TableCell className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {new Date(sess.createdAt).toLocaleString()}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                            {new Date(sess.expiresAt).toLocaleString()}
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            {isRevoked ? (
                              <Badge
                                variant="destructive"
                                className="font-bold uppercase text-[10px]"
                              >
                                Revoked
                              </Badge>
                            ) : isExpired ? (
                              <Badge
                                variant="secondary"
                                className="font-bold uppercase text-[10px]"
                              >
                                Expired
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px]">
                                Live Valid
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-right">
                            {!isRevoked && !isExpired && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10 font-semibold"
                                disabled={revokeSessionMutation.isPending}
                                onClick={() => revokeSessionMutation.mutate(sess.id)}
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Add Super Admin Drawer */}
        <Sheet open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Add Super Administrator
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Provision a new super admin user and define which platform modules they can access.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate({
                  ...newUser,
                  adminPermissions: newUserFullAccess ? undefined : newUser.adminPermissions,
                });
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-name">Full Name</Label>
                    <Input
                      id="admin-name"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Alex Morgan"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">Email Address</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="alex@superadmin.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-password">Master Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••••••"
                  />
                </div>

                {/* Module Permissions Checklist */}
                <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Module Access Permissions
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Define which super admin modules this user can access.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        id="new-full-access"
                        checked={newUserFullAccess}
                        onCheckedChange={(v) => setNewUserFullAccess(!!v)}
                      />
                      <span className="text-xs font-bold text-primary">Full Access</span>
                    </label>
                  </div>

                  {!newUserFullAccess && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {SUPER_ADMIN_MODULES.map((mod) => {
                        const isChecked = newUser.adminPermissions.includes(mod.key);
                        return (
                          <label
                            key={mod.key}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none text-xs ${
                              isChecked
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/70 bg-card hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(v) => {
                                setNewUser({
                                  ...newUser,
                                  adminPermissions: v
                                    ? [...newUser.adminPermissions, mod.key]
                                    : newUser.adminPermissions.filter((k) => k !== mod.key),
                                });
                              }}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <p
                                className={`font-bold truncate ${isChecked ? "text-primary" : "text-foreground"}`}
                              >
                                {mod.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {mod.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating Admin…" : "Create Administrator"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Edit Permissions Drawer */}
        <Sheet
          open={!!editingPermissionsUser}
          onOpenChange={(open) => !open && setEditingPermissionsUser(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Module Permissions — {editingPermissionsUser?.name}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Define which super admin panel modules {editingPermissionsUser?.email} can access.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Access Level</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Toggle Full Access to grant all modules, or select specific modules below.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      id="edit-full-access"
                      checked={editPermFullAccess}
                      onCheckedChange={(v) => {
                        setEditPermFullAccess(!!v);
                        if (v) setEditingPerms([]);
                      }}
                    />
                    <span className="text-xs font-bold text-primary">
                      Full Access (No Restrictions)
                    </span>
                  </label>
                </div>

                {!editPermFullAccess && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {SUPER_ADMIN_MODULES.map((mod) => {
                      const isChecked = editingPerms.includes(mod.key);
                      return (
                        <label
                          key={mod.key}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none text-xs ${
                            isChecked
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/70 bg-card hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(v) => {
                              setEditingPerms(
                                v
                                  ? [...editingPerms, mod.key]
                                  : editingPerms.filter((k) => k !== mod.key),
                              );
                            }}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <p
                              className={`font-bold truncate ${isChecked ? "text-primary" : "text-foreground"}`}
                            >
                              {mod.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {mod.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {!editPermFullAccess && editingPerms.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>No modules selected. The user will effectively have no access.</span>
                </div>
              )}
            </div>

            <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPermissionsUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updatePermissionsMutation.isPending}
                onClick={() => {
                  updatePermissionsMutation.mutate({
                    userId: editingPermissionsUser.id,
                    adminPermissions: editPermFullAccess ? null : editingPerms,
                  });
                }}
              >
                {updatePermissionsMutation.isPending ? "Saving…" : "Save Permissions"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
