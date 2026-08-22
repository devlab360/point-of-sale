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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsersFn, updateUserFn, deleteUserFn, createInvitationFn, createUserFn } from "@/api/users";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@tanstack/react-router";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { useAppFormatter } from "@/hooks/useAppFormatter";

const PERMISSION_GROUPS = [
  {
    group: "Sales & Checkout",
    permissions: [
      { id: "pos", label: "POS Terminal", desc: "Access sales register & checkout" },
      { id: "discounts", label: "Apply Discounts", desc: "Give manual cart discounts at POS" },
      { id: "returns", label: "Sales Returns", desc: "Process refunds & product returns" },
    ],
  },
  {
    group: "Store Operations",
    permissions: [
      { id: "inventory", label: "Inventory & Stock", desc: "Manage products, categories & stock" },
      { id: "customers", label: "Customer Mgmt", desc: "Manage customer profiles & loyalty" },
      { id: "expenses", label: "Store Expenses", desc: "Record & view store expenditure" },
    ],
  },
  {
    group: "Management",
    permissions: [
      {
        id: "reports",
        label: "Reports & Analytics",
        desc: "View sales, profit & business reports",
      },
      { id: "settings", label: "System Settings", desc: "Store configuration & store settings" },
      { id: "notifications", label: "Notifications", desc: "View and manage system notifications" },
    ],
  },
  {
    group: "Services & Verticals",
    permissions: [
      { id: "tables", label: "Table Management", desc: "Manage restaurant tables and dine-in" },
      { id: "kitchen", label: "Kitchen (KOT)", desc: "Manage kitchen order tickets" },
      { id: "appointments", label: "Appointments", desc: "Manage service appointments" },
    ],
  },
];

const AVAILABLE_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: AVAILABLE_PERMISSIONS.map((p) => p.id),
  manager: ["pos", "inventory", "reports", "customers", "expenses", "discounts", "returns", "notifications", "tables", "kitchen", "appointments"],
  cashier: ["pos", "customers", "discounts", "tables", "kitchen", "appointments"],
};

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Employees Â· NexisPOS" }] }),
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
    setInvitePermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  };

  const toggleInvitePermission = (permId: string) => {
    setInvitePermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const toggleEditPermission = (permId: string) => {
    setEditPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const openEditModal = (userItem: any) => {
    setEditItem(userItem);
    setEditRole(userItem.role || "cashier");
    setEditPermissions(
      userItem.permissions ||
      DEFAULT_ROLE_PERMISSIONS[userItem.role] ||
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
    exportToCSV(rawUsers, [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' }
    ], 'users');
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
        if (row['Name'] && row['Email']) {
          await createUserFn({
            data: {
              user: {
                id: uuidv4(),
                name: row['Name'],
                email: row['Email'],
                role: (row['Role'] as any) || 'cashier',
                status: (row['Status'] as any) || 'active',
                storeId: PersistStore.getOrgId() || "default",
                lastLogin: '',
                permissions: []
              }
            }
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
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Employees"
        description="Manage your team and approve new members."
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
        hideToolbar={rawUsers.length === 0}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Roles" },
                    ...uniqueRoles.map((r: any) => ({
                      value: String(r),
                      label: String(r).charAt(0).toUpperCase() + String(r).slice(1),
                    })),
                  ]}
                  value={draftFilters.role}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, role: val }))}
                  placeholder="Filter by Role"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Pending" },
                    { value: "suspended", label: "Suspended" },
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
        ) : users.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No employees found"
            description={
              search ? "Try adjusting your search." : "You haven't added any employees yet."
            }
            actionLabel="Invite Employee"
            onAction={() => setIsInviteOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[800px]">
                    <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Employee</th>
                        <th className="px-4 py-3 whitespace-nowrap">Role</th>
                        <th className="px-4 py-3 whitespace-nowrap">Permissions</th>
                        <th className="px-4 py-3 whitespace-nowrap">Last Active</th>
                        <th className="px-4 py-3 whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedUsers.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                                {e.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-semibold">{e.name}</div>
                                <div className="text-xs text-muted-foreground">{e.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className="capitalize">
                              <Shield className="mr-1 size-3" />
                              {e.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {(e.permissions || DEFAULT_ROLE_PERMISSIONS[e.role] || []).length ===
                                AVAILABLE_PERMISSIONS.length ? (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10 text-primary border-primary/20 text-[10px]"
                                >
                                  Full Access
                                </Badge>
                              ) : (
                                (e.permissions || DEFAULT_ROLE_PERMISSIONS[e.role] || [])
                                  .slice(0, 3)
                                  .map((p) => (
                                    <Badge
                                      key={p}
                                      variant="outline"
                                      className="text-[10px] uppercase font-mono"
                                    >
                                      {p}
                                    </Badge>
                                  ))
                              )}
                              {(e.permissions || DEFAULT_ROLE_PERMISSIONS[e.role] || []).length >
                                3 &&
                                (e.permissions || DEFAULT_ROLE_PERMISSIONS[e.role] || []).length !==
                                AVAILABLE_PERMISSIONS.length && (
                                  <span className="text-[10px] text-muted-foreground self-center">
                                    +
                                    {(e.permissions || DEFAULT_ROLE_PERMISSIONS[e.role] || [])
                                      .length - 3}{" "}
                                    more
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {e.lastActive ? formatAppDate(e.lastActive, "datetime") : "Never"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              className={
                                e.status === "active"
                                  ? "bg-success/10 text-success hover:bg-success/15"
                                  : e.status === "pending"
                                    ? "bg-warning/15 text-warning-foreground hover:bg-warning/20"
                                    : "bg-destructive/15 text-destructive hover:bg-destructive/20"
                              }
                            >
                              {e.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end items-center gap-2">
                              {e.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(e.id)}
                                  className="h-8"
                                  disabled={approvingId === e.id}
                                >
                                  {approvingId === e.id ? (
                                    <Loader2 className="size-4 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-4 mr-1" />
                                  )}
                                  Approve
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreVertical className="size-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditModal(e)}>
                                    <Edit2 className="mr-2 size-4" /> Edit & Permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    onClick={() => setDeleteId(e.id)}
                                  >
                                    <Trash2 className="mr-2 size-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={users.length}
                />
              </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Assign Primary Role (e.g. Manager, Chef, Mechanic)</Label>
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

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" /> Module Permissions
                </Label>
                <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20 max-h-[380px] overflow-y-auto">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.group} className="space-y-2">
                      <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                        {group.group}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((p) => {
                          const checked = invitePermissions.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleInvitePermission(p.id)}
                              className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${checked
                                ? "bg-primary/5 border-primary/40 text-foreground"
                                : "bg-card border-border/60 text-muted-foreground hover:border-border"
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => { }}
                                className="mt-0.5 size-4 rounded border-input text-primary accent-primary"
                              />
                              <div className="space-y-0.5 leading-none">
                                <p className="text-sm font-medium">{p.label}</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                  {p.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee & Permissions</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSaveEdit} className="space-y-4">
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
                <Label htmlFor="role">Role (e.g. Manager, Chef, Mechanic)</Label>
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

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-primary" /> Permissions
              </Label>
              <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20 max-h-[250px] overflow-y-auto">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.group} className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      {group.group}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.permissions.map((p) => {
                        const checked = editPermissions.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleEditPermission(p.id)}
                            className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-all ${checked
                              ? "bg-primary/5 border-primary/40 text-foreground"
                              : "bg-card border-border/60 text-muted-foreground hover:border-border"
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => { }}
                              className="mt-0.5 size-4 rounded border-input text-primary accent-primary"
                            />
                            <div className="space-y-0.5 leading-none">
                              <p className="text-sm font-medium">{p.label}</p>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {p.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
