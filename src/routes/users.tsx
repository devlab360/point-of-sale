import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PersistStore } from "@/lib/session-store";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Shield,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  Copy,
  Link as LinkIcon,
  Award,
  Target,
  Percent,
  KeyRound,
  Check,
  X,
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
import { useRouter } from "@tanstack/react-router";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { APP_GROUPS } from "@/lib/menu-config";

const allSelectableUserRoutes = [
  ...APP_GROUPS.flatMap((g) => g.items.map((i) => i.to)).filter(
    (to) => !["/", "/super-admin", "/profile"].includes(to),
  ),
  "ai_copilot",
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: allSelectableUserRoutes,
  manager: allSelectableUserRoutes.filter((r) => !["/users", "/settings"].includes(r)),
  cashier: ["/pos", "/customers", "/sales", "/tables", "/kitchen", "/appointments"],
};

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Employees · OneDesk360" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAuth();
  const orgId = user?.orgId || "default";
  const queryClient = useQueryClient();
  const { formatAppDate } = useAppFormatter();

  const {
    data: rawUsersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users", orgId],
    queryFn: async () => (await getUsersFn({ data: {} })).data || [],
    staleTime: 0, // Always refetch to show newly invited/registered employees instantly
  });
  const rawUsers = rawUsersData || [];
  const uniqueRoles = useMemo(
    () => Array.from(new Set(rawUsers.map((u: any) => u.role))).sort(),
    [rawUsers],
  );
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [inviteRole, setInviteRole] = useState("cashier");
  const [invitePermissions, setInvitePermissions] = useState<string[]>(
    DEFAULT_ROLE_PERMISSIONS.cashier,
  );
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [editItem, setEditItem] = useState<any | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<string>("cashier");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("Unauthorized. Admin access required.");
      router.navigate({ to: "/" });
    }
  }, [user, router]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({ role: "", status: "" });
  const [draftFilters, setDraftFilters] = useState({ role: "", status: "" });
  const activeFilterCount = (filters.role ? 1 : 0) + (filters.status ? 1 : 0);

  const handleResetFilters = () => {
    setFilters({ role: "", status: "" });
    setDraftFilters({ role: "", status: "" });
  };

  const users = useMemo(() => {
    let filtered = rawUsers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower) ||
          u.role.toLowerCase().includes(lower),
      );
    }
    if (filters.role) {
      filtered = filtered.filter((u) => u.role === filters.role);
    }
    if (filters.status) {
      filtered = filtered.filter((u) => u.status === filters.status);
    }
    return filtered;
  }, [rawUsers, debouncedSearch, filters.role, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(users.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [users.length, page]);

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleRoleChangeForInvite = (role: string) => {
    setInviteRole(role);
    setInvitePermissions(DEFAULT_ROLE_PERMISSIONS[role.toLowerCase()] || []);
  };

  const toggleInvitePermission = (permId: string) => {
    setInvitePermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const selectAllInvitePermissions = () => {
    setInvitePermissions([...allSelectableUserRoutes]);
  };

  const deselectAllInvitePermissions = () => {
    setInvitePermissions([]);
  };

  const selectGroupInvitePermissions = (items: { to: string }[]) => {
    const itemRoutes = items.map((i) => i.to);
    setInvitePermissions((prev) => Array.from(new Set([...prev, ...itemRoutes])));
  };

  const deselectGroupInvitePermissions = (items: { to: string }[]) => {
    const itemRoutes = items.map((i) => i.to);
    setInvitePermissions((prev) => prev.filter((p) => !itemRoutes.includes(p)));
  };

  const toggleEditPermission = (permId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const selectAllEditPermissions = () => {
    setEditPermissions([...allSelectableUserRoutes]);
  };

  const deselectAllEditPermissions = () => {
    setEditPermissions([]);
  };

  const selectGroupEditPermissions = (items: { to: string }[]) => {
    const itemRoutes = items.map((i) => i.to);
    setEditPermissions((prev) => Array.from(new Set([...prev, ...itemRoutes])));
  };

  const deselectGroupEditPermissions = (items: { to: string }[]) => {
    const itemRoutes = items.map((i) => i.to);
    setEditPermissions((prev) => prev.filter((p) => !itemRoutes.includes(p)));
  };

  const openEditModal = (userItem: any) => {
    setEditItem(userItem);
    setEditRole(userItem.role || "cashier");
    setEditPermissions(
      userItem.permissions ||
        DEFAULT_ROLE_PERMISSIONS[userItem.role?.toLowerCase()] ||
        DEFAULT_ROLE_PERMISSIONS.cashier,
    );
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await createInvitationFn({
        data: {
          invitation: {
            token,
            role: inviteRole,
            permissions: invitePermissions,
            expiresAt,
          },
        },
      });
      if (!res.success) throw new Error(res.error);

      const link = `${window.location.origin}/invite/${token}`;
      setGeneratedLink(link);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invite link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      rawUsers,
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
      ],
      "users",
    );
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in the CSV");
        return;
      }

      let count = 0;
      for (const row of data) {
        if (row["Name"] && row["Email"]) {
          await createUserFn({
            data: {
              user: {
                id: uuidv4(),
                name: row["Name"],
                email: row["Email"],
                role: (row["Role"] as any) || "cashier",
                status: (row["Status"] as any) || "active",
                storeId: PersistStore.getOrgId() || "default",
                lastLogin: "",
                permissions: [],
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Successfully imported ${count} users`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id);
      const res = await updateUserFn({ data: { id, updates: { status: "active" } } });
      if (res.success) {
        toast.success("Employee approved successfully");
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else throw new Error(res.error);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve employee");
    } finally {
      setApprovingId(null);
    }
  };

  const {
    errors: userErrors,
    validate: validateUser,
    clearError: clearUserError,
    clearAll: clearUserAll,
  } = useFormValidation({
    name: {
      required: "Name is required",
      minLength: { value: 2, message: "Name must be at least 2 characters" },
    },
    commissionRate: {
      required: "Commission rate is required",
      positive: "Commission rate must be a positive number",
    },
    monthlyTarget: {
      required: "Monthly target is required",
      positive: "Monthly target must be a positive number",
    },
  });

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const name = (formData.get("name") as string)?.trim();
      const status = formData.get("status") as string;
      const commissionRateStr = (formData.get("commissionRate") as string)?.trim();
      const monthlyTargetStr = (formData.get("monthlyTarget") as string)?.trim();

      const isValid = validateUser({
        name,
        commissionRate: commissionRateStr,
        monthlyTarget: monthlyTargetStr,
      });
      if (!isValid) return;

      const commissionRate = parseFloat(commissionRateStr) || 0;
      const monthlyTarget = parseFloat(monthlyTargetStr) || 0;

      const res = await updateUserFn({
        data: {
          id: editItem.id,
          updates: {
            name,
            role: editRole,
            status,
            permissions: editPermissions,
            commissionRate,
            monthlyTarget,
          },
        },
      });
      if (res.success) {
        toast.success("Employee updated successfully");
        setEditItem(null);
        clearUserAll();
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else throw new Error(res.error);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        const res = await deleteUserFn({ data: { id: deleteId } });
        if (res.success) {
          toast.success("Employee deleted");
          setDeleteId(null);
          queryClient.invalidateQueries({ queryKey: ["users"] });
        } else throw new Error(res.error);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete employee");
      }
    }
  };

  return (
    <div>
      <DataPage
        title="Employees & Access Control"
        description="Manage team staff, assign granular role permissions, and approve new member signups."
        primaryAction={{
          label: "Invite Employee",
          onClick: () => {
            setIsInviteOpen(true);
            setGeneratedLink("");
          },
        }}
        searchPlaceholder="Search by name, email, or role..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Filter by Role</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Roles" },
                    { value: "admin", label: "Admin" },
                    { value: "cashier", label: "Cashier" },
                    { value: "manager", label: "Manager" },
                    { value: "accountant", label: "Accountant" },
                    { value: "stock_manager", label: "Stock Manager" },
                  ]}
                  value={draftFilters.role}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, role: val }))}
                  placeholder="Filter by Role"
                />
              </div>
              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Pending Approval" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full"
                onClick={() => {
                  setFilters(draftFilters);
                  close();
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        {isUsersLoading ? (
          <TableSkeleton columns={6} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isUsersError ? (
          <ErrorState onRetry={refetchUsers} />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Access Permissions</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center">
                          <EmptyState
                            icon={Shield}
                            title="No employees found"
                            description={
                              search
                                ? "Try adjusting your search query."
                                : "You haven't added any team members yet."
                            }
                            actionLabel="Invite Employee"
                            onAction={() => setIsInviteOpen(true)}
                            className="border-none bg-transparent my-0 py-8 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
                                {e.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-foreground text-xs sm:text-sm">
                                  {e.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-medium">
                                  {e.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant="secondary"
                              className="capitalize text-xs font-bold py-0.5"
                            >
                              <Shield className="mr-1 size-3 text-primary" />
                              {e.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {(
                                e.permissions ||
                                DEFAULT_ROLE_PERMISSIONS[e.role?.toLowerCase()] ||
                                []
                              ).length >= allSelectableUserRoutes.length ? (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold"
                                >
                                  Full Access
                                </Badge>
                              ) : (
                                (
                                  e.permissions ||
                                  DEFAULT_ROLE_PERMISSIONS[e.role?.toLowerCase()] ||
                                  []
                                )
                                  .slice(0, 3)
                                  .map((p: string) => (
                                    <Badge
                                      key={p}
                                      variant="outline"
                                      className="text-[10px] uppercase font-mono bg-muted/30"
                                    >
                                      {p.replace(/^\//, "").replace(/-/g, " ")}
                                    </Badge>
                                  ))
                              )}
                              {(
                                e.permissions ||
                                DEFAULT_ROLE_PERMISSIONS[e.role?.toLowerCase()] ||
                                []
                              ).length > 3 &&
                                (
                                  e.permissions ||
                                  DEFAULT_ROLE_PERMISSIONS[e.role?.toLowerCase()] ||
                                  []
                                ).length < allSelectableUserRoutes.length && (
                                  <span className="text-[10px] text-muted-foreground font-semibold self-center">
                                    +
                                    {(
                                      e.permissions ||
                                      DEFAULT_ROLE_PERMISSIONS[e.role?.toLowerCase()] ||
                                      []
                                    ).length - 3}{" "}
                                    more
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                            {e.lastActive ? formatAppDate(e.lastActive, "datetime") : "Never"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              className={
                                e.status === "active"
                                  ? "bg-success/12 text-success hover:bg-success/20 border-success/20 text-[10px] font-bold"
                                  : e.status === "pending"
                                    ? "bg-warning/15 text-warning-foreground hover:bg-warning/20 border-warning/20 text-[10px] font-bold"
                                    : "bg-destructive/12 text-destructive hover:bg-destructive/20 border-destructive/20 text-[10px] font-bold"
                              }
                            >
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end items-center gap-1.5">
                              {e.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(e.id)}
                                  className="h-8 font-bold text-xs"
                                  disabled={approvingId === e.id}
                                >
                                  {approvingId === e.id ? (
                                    <Loader2 className="size-3.5 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-3.5 mr-1" />
                                  )}
                                  Approve
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                    <MoreVertical className="size-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem
                                    onClick={() => openEditModal(e)}
                                    className="text-xs font-semibold"
                                  >
                                    <Edit2 className="mr-2 size-3.5" /> Edit & Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive text-xs font-semibold"
                                    onClick={() => setDeleteId(e.id)}
                                  >
                                    <Trash2 className="mr-2 size-3.5" /> Delete Employee
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {paginatedUsers.length === 0 ? (
                  <EmptyState
                    icon={Shield}
                    title="No employees found"
                    description={
                      search
                        ? "Try adjusting your search query."
                        : "You haven't added any team members yet."
                    }
                    actionLabel="Invite Employee"
                    onAction={() => setIsInviteOpen(true)}
                    className="border-none bg-transparent my-0 py-6 shadow-none"
                  />
                ) : (
                  paginatedUsers.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
                          {e.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {e.name}
                            </p>
                            <Badge
                              className={`text-[9px] font-bold py-0 ${
                                e.status === "active"
                                  ? "bg-success/12 text-success"
                                  : e.status === "pending"
                                    ? "bg-warning/15 text-warning-foreground"
                                    : "bg-destructive/12 text-destructive"
                              }`}
                            >
                              {e.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{e.email}</p>
                          <p className="text-[10px] text-primary capitalize font-bold mt-0.5">
                            Role: {e.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pl-2">
                        {e.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(e.id)}
                            className="h-7 px-2 text-[11px] font-bold"
                            disabled={approvingId === e.id}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg"
                          onClick={() => openEditModal(e)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-destructive"
                          onClick={() => setDeleteId(e.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {filteredUsers.length > 0 && (
                <div className="border-t border-border/60 p-2 sm:p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={filteredUsers.length}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DataPage>

      <Dialog
        open={isInviteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsInviteOpen(false);
            setGeneratedLink("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <form onSubmit={handleGenerateInvite} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="role">
                  Assign Primary Role (e.g. Manager, Cashier, Chef, Accountant)
                </Label>
                <Input
                  id="role"
                  placeholder="Enter custom role name..."
                  value={inviteRole}
                  onChange={(e) => {
                    const r = e.target.value;
                    setInviteRole(r);
                    if (DEFAULT_ROLE_PERMISSIONS[r.toLowerCase()]) {
                      setInvitePermissions(DEFAULT_ROLE_PERMISSIONS[r.toLowerCase()]);
                    }
                  }}
                />
              </div>

              {/* Module Permissions Matrix Grouped by APP_GROUPS */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <KeyRound className="size-4 text-primary" /> Module Permissions
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Select which store menus and modules this employee is permitted to access.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={selectAllInvitePermissions}
                      className="h-7 text-xs"
                    >
                      <Check className="size-3 mr-1 text-primary" /> Select All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={deselectAllInvitePermissions}
                      className="h-7 text-xs"
                    >
                      <X className="size-3 mr-1 text-destructive" /> Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {APP_GROUPS.map((group, groupIdx) => {
                    const selectableItems = group.items.filter(
                      (item) => !["/", "/super-admin", "/profile"].includes(item.to),
                    );
                    if (selectableItems.length === 0) return null;

                    const allGroupSelected = selectableItems.every(
                      (item) =>
                        invitePermissions.includes(item.to) ||
                        invitePermissions.includes(item.menuKey || ""),
                    );

                    return (
                      <div
                        key={groupIdx}
                        className="bg-card p-3 rounded-xl border border-border/80 shadow-sm space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <h4 className="font-bold text-[11px] uppercase tracking-wider text-primary">
                            {group.label}
                          </h4>
                          <button
                            type="button"
                            onClick={() =>
                              allGroupSelected
                                ? deselectGroupInvitePermissions(selectableItems)
                                : selectGroupInvitePermissions(selectableItems)
                            }
                            className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium cursor-pointer"
                          >
                            {allGroupSelected ? "Deselect Group" : "Select Group"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                          {selectableItems.map((item, itemIdx) => {
                            const isChecked =
                              invitePermissions.includes(item.to) ||
                              invitePermissions.includes(item.menuKey || "") ||
                              (item.to === "/pos" && invitePermissions.includes("pos"));
                            return (
                              <div
                                key={itemIdx}
                                onClick={() => toggleInvitePermission(item.to)}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                  isChecked
                                    ? "bg-primary/5 border-primary/40 text-foreground"
                                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="size-4 rounded border-input text-primary accent-primary pointer-events-none"
                                  />
                                  <span>{item.label}</span>
                                </div>
                                <span className="font-mono text-[10px] text-muted-foreground/80 lowercase">
                                  {item.to}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Generate a unique invitation link to send to your employee. They will register their
                credentials and PIN, after which you can approve their account.
              </p>
              <DialogFooter>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <LinkIcon className="size-4 mr-2" /> Generate Link
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted border border-border flex items-center gap-3">
                <code className="text-sm flex-1 break-all">{generatedLink}</code>
                <Button size="icon" variant="outline" onClick={copyLink} className="shrink-0">
                  {isCopied ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Send this link to your employee. Once they complete registration, you will need to
                approve their account.
              </p>
              <Button className="w-full" onClick={() => setIsInviteOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            clearUserAll();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee & Permissions</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSaveEdit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Employee Full Name"
                defaultValue={editItem?.name}
                className={
                  userErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
                }
                onChange={() => clearUserError("name")}
              />
              <FieldError message={userErrors.name} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role (e.g. Manager, Cashier, Chef, Accountant)</Label>
                <Input
                  id="role"
                  placeholder="Enter custom role name..."
                  value={editRole}
                  onChange={(e) => {
                    const r = e.target.value;
                    setEditRole(r);
                    if (DEFAULT_ROLE_PERMISSIONS[r.toLowerCase()]) {
                      setEditPermissions(DEFAULT_ROLE_PERMISSIONS[r.toLowerCase()]);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Account Status</Label>
                <Select name="status" defaultValue={editItem?.status || "active"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Approved)</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salesman Commission & Target Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="commissionRate">
                  Sales Commission (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={editItem?.commissionRate || 2.5}
                  placeholder="e.g. 2.5"
                  className={
                    userErrors.commissionRate
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                  onChange={() => clearUserError("commissionRate")}
                />
                <FieldError message={userErrors.commissionRate} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthlyTarget">
                  Monthly Sales Target <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monthlyTarget"
                  name="monthlyTarget"
                  type="number"
                  min="0"
                  defaultValue={editItem?.monthlyTarget || 10000}
                  placeholder="e.g. 10000"
                  className={
                    userErrors.monthlyTarget
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                  onChange={() => clearUserError("monthlyTarget")}
                />
                <FieldError message={userErrors.monthlyTarget} />
              </div>
            </div>

            {/* Module Permissions Matrix Grouped by APP_GROUPS */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                <div>
                  <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound className="size-4 text-primary" /> Module Permissions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Customize the specific menu modules this employee can access.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={selectAllEditPermissions}
                    className="h-7 text-xs"
                  >
                    <Check className="size-3 mr-1 text-primary" /> Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={deselectAllEditPermissions}
                    className="h-7 text-xs"
                  >
                    <X className="size-3 mr-1 text-destructive" /> Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                {APP_GROUPS.map((group, groupIdx) => {
                  const selectableItems = group.items.filter(
                    (item) => !["/", "/super-admin", "/profile"].includes(item.to),
                  );
                  if (selectableItems.length === 0) return null;

                  const allGroupSelected = selectableItems.every(
                    (item) =>
                      editPermissions.includes(item.to) ||
                      editPermissions.includes(item.menuKey || ""),
                  );

                  return (
                    <div
                      key={groupIdx}
                      className="bg-card p-3 rounded-xl border border-border/80 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <h4 className="font-bold text-[11px] uppercase tracking-wider text-primary">
                          {group.label}
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            allGroupSelected
                              ? deselectGroupEditPermissions(selectableItems)
                              : selectGroupEditPermissions(selectableItems)
                          }
                          className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium cursor-pointer"
                        >
                          {allGroupSelected ? "Deselect Group" : "Select Group"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                        {selectableItems.map((item, itemIdx) => {
                          const isChecked =
                            editPermissions.includes(item.to) ||
                            editPermissions.includes(item.menuKey || "") ||
                            (item.to === "/pos" && editPermissions.includes("pos"));
                          return (
                            <div
                              key={itemIdx}
                              onClick={() => toggleEditPermission(item.to)}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-primary/5 border-primary/40 text-foreground"
                                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="size-4 rounded border-input text-primary accent-primary pointer-events-none"
                                />
                                <span>{item.label}</span>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground/80 lowercase">
                                {item.to}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Employee & Permissions
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
