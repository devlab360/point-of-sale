import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
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
} from "@/api/admin/super-admin";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Super Admin Personnel · OneDesk360" }] }),
  component: SuperAdminUsersPage,
});

function SuperAdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAdminAuth();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });

  const { data: usersData, isLoading: isUsersLoading, refetch: refetchUsers, isFetching: isUsersFetching } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: () => getSuperAdminUsersFn({ data: {} }),
  });

  const { data: sessionsData, isLoading: isSessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["super-admin-sessions"],
    queryFn: () => getSuperAdminSessionsFn({ data: {} }),
  });

  const users = (usersData?.data as any[]) || [];
  const sessions = (sessionsData?.data as any[]) || [];

  const activeSessionsCount = sessions.filter((s: any) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now()).length;

  const createUserMutation = useMutation({
    mutationFn: (data: any) => createSuperAdminUserFn({ data }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("New Super Administrator provisioned!");
        setIsAddUserModalOpen(false);
        setNewUser({ name: "", email: "", password: "" });
        queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      } else {
        toast.error(res.error || "Failed to create user");
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to create user"),
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
              <Button onClick={() => setIsAddUserModalOpen(true)} size="sm" className="gap-2 h-9 shadow-xs">
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

        {/* Super Admin Personnel List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <span>Platform Administrators ({users.length})</span>
            </h3>
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
            {isUsersLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                    <TableRow>
                      <TableHead className="px-4 py-3.5">Administrator</TableHead>
                      <TableHead className="px-4 py-3.5">Privilege Level</TableHead>
                      <TableHead className="px-4 py-3.5">Status</TableHead>
                      <TableHead className="px-4 py-3.5">Last Active</TableHead>
                      <TableHead className="px-4 py-3.5">Joined</TableHead>
                      <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((admin: any) => {
                      const isSelf = admin.email === currentUser?.email || admin.id === currentUser?.id;
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
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{admin.email}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <Badge className="bg-primary/15 text-primary border-primary/30 font-bold uppercase text-[10px]">
                              Super Admin (Root)
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px]">
                              Active
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                            {admin.lastActive ? new Date(admin.lastActive).toLocaleString() : "Just now"}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                            {admin.joined ? new Date(admin.joined).toLocaleDateString() : "System Initial"}
                          </TableCell>

                          <TableCell className="px-4 py-3.5 text-right">
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
                <span>Active Server Login Sessions ({sessions.length})</span>
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
              <div className="p-8 text-center text-xs text-muted-foreground">No active sessions.</div>
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
                    {sessions.map((sess: any) => {
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
                              <Badge variant="destructive" className="font-bold uppercase text-[10px]">Revoked</Badge>
                            ) : isExpired ? (
                              <Badge variant="secondary" className="font-bold uppercase text-[10px]">Expired</Badge>
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
            className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">Add Super Administrator</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Grant full, unrestricted access to manage all multi-tenant stores, SaaS tiers, and payment verifications.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate(newUser);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating Admin…" : "Create Administrator"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
