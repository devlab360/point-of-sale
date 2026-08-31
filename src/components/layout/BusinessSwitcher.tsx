import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  getMyOrganizationsFn,
  switchOrganizationFn,
  createBusinessFn,
  getActiveSessionFn,
  deleteOrganizationFn,
} from "@/api/organizations";
import { getLocationsFn } from "@/api/locations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, ChevronsUpDown, Check, Plus, Loader2, Store, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PersistStore } from "@/lib/session-store";
import { SessionStore } from "@/lib/session-store";

const INDUSTRIES = [
  "Super Market & Grocery",
  "Apparel & Fashion",
  "Electronics & Computers",
  "Hotel & Restaurant",
  "Salon & Beauty Spa",
  "Pharmacy & Healthcare",
  "Furniture & Home Decor",
  "Books, Toys & Gifts",
  "General Retail Store",
];

export function BusinessSwitcher() {
  const { user, settings, refetchOrgData } = useAuth() as any;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const { data: orgsData, isLoading } = useQuery({
    queryKey: ["my-organizations", user?.email],
    queryFn: async () => {
      const res = await getMyOrganizationsFn({ data: {} });
      if (res && res.success) return (res as any).data || [];
      return [];
    },
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });

  const { data: sessionData } = useQuery({
    queryKey: ["active-session"],
    queryFn: async () => {
      const res = await getActiveSessionFn({ data: {} });
      if (res && res.success) return (res as any).data || null;
      return null;
    },
    enabled: Boolean(user),
    staleTime: 30 * 1000,
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches", sessionData?.orgId],
    queryFn: async () => {
      const res = await getLocationsFn({ data: {} });
      if (res && (res as any).success) return (res as any).data || [];
      return [];
    },
    enabled: Boolean(sessionData?.orgId),
    staleTime: 60 * 1000,
  });

  const orgs: any[] = orgsData || [];
  const branches: any[] = branchesData || [];
  const activeOrgId = sessionData?.orgId || PersistStore.getOrgId();
  const activeBranchId = sessionData?.branchId;
  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const orgName = settings?.storeName || activeOrg?.name || "ONEDESK360";

  const switchMutation = useMutation({
    mutationFn: (payload: { orgId: string; branchId?: string }) =>
      switchOrganizationFn({ data: payload }),
    onSuccess: async (res: any, vars) => {
      if (res && res.success) {
        toast.success(res.message || "Switched business");
        PersistStore.setOrgId(vars?.orgId || "");
        queryClient.clear();
        await refetchOrgData?.();
        window.location.href = "/";
      } else {
        toast.error(res?.error || "Failed to switch business");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to switch"),
  });

  const createMutation = useMutation({
    mutationFn: () => createBusinessFn({ data: { name, industryType: industry } }),
    onSuccess: async (res: any) => {
      if (res && res.success) {
        toast.success("Business created successfully");
        setCreateOpen(false);
        setName("");
        setIndustry("");
        switchMutation.mutate({ orgId: res.orgId });
      } else {
        toast.error(res?.error || "Failed to create business");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create business"),
  });

  const deleteMutation = useMutation({
    mutationFn: (orgId: string) => deleteOrganizationFn({ data: { orgId, confirmDelete: true } }),
    onSuccess: async (res: any) => {
      if (res && res.success) {
        toast.success(res.message || "Organization deleted");
        queryClient.invalidateQueries({ queryKey: ["my-organizations"] });
        queryClient.invalidateQueries({ queryKey: ["active-session"] });
        await refetchOrgData?.();
        window.location.href = "/";
      } else {
        toast.error(res?.error || "Failed to delete organization");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete organization"),
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSwitchOrg = (orgId: string) => {
    if (orgId === activeOrgId) return;
    switchMutation.mutate({ orgId });
  };

  const handleSwitchBranch = (branchId: string) => {
    if (!activeOrgId) return;
    switchMutation.mutate({ orgId: activeOrgId, branchId });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-xl border border-border/70 bg-card/70 px-2.5 text-sm font-semibold text-foreground hover:bg-card shadow-xs"
          title="Switch business or branch"
        >
          <Building2 className="size-4 text-primary shrink-0" />
          <span className="max-w-[140px] truncate">{orgName}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start" sideOffset={8}>
        <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your Businesses
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">Loading...</div>
          )}
          {!isLoading && orgs.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              No businesses found
            </div>
          )}
          {orgs.map((org) => {
            const isActive = org.id === activeOrgId;
            const canDelete = org.role === "owner" && orgs.length > 1;
            const isDeleting = deleteConfirm === org.id;
            return (
              <div key={org.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitchOrg(org.id)}
                  className={cn(
                    "flex-1 flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                    isActive && "bg-accent/60",
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Store className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{org.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {org.industryType || "Business"} · {org.branches?.length || 0} branches
                    </div>
                  </div>
                  {isActive && <Check className="size-4 text-primary shrink-0" />}
                </button>
                {canDelete && !isActive && (
                  <button
                    type="button"
                    onClick={() => isDeleting ? deleteMutation.mutate(org.id) : setDeleteConfirm(org.id)}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      isDeleting ? "bg-destructive/10 text-destructive" : "hover:bg-destructive/10 text-muted-foreground"
                    )}
                    disabled={deleteMutation.isPending}
                    title={isDeleting ? "Confirm delete" : "Delete business"}
                  >
                    {isDeleting ? (
                      deleteMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 border-t border-border pt-2">
          <div className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Branches
          </div>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {branches.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">No branches for this business</div>
            )}
            {branches.map((b) => {
              const isActive = b.id === activeBranchId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSwitchBranch(b.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                    isActive && "bg-accent/60 font-medium",
                  )}
                >
                  <span className="truncate">{b.name}</span>
                  {isActive ? (
                    <Check className="size-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="text-muted-foreground/60">Switch</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 border-t border-border pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setCreateOpen((v) => !v)}
          >
            <Plus className="size-3.5" /> Add Business
          </Button>
          {createOpen && (
            <div className="mt-2 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Business Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Retail Store"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Industry Type</Label>
                <SearchableSelect
                  options={INDUSTRIES.map((o) => ({ value: o, label: o }))}
                  value={industry}
                  onChange={setIndustry}
                  placeholder="Choose industry..."
                />
              </div>
              <Button
                size="sm"
                className="w-full gap-1.5"
                disabled={!name.trim() || !industry || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Create Business
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
