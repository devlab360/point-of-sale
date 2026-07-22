import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { ShieldAlert, CheckCircle2, Clock, Ban, Store } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin Control Center · Grocer.Pro SaaS" }] }),
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.email?.toLowerCase() === "superadmin@grocer.pro" || user?.email?.toLowerCase().includes("superadmin");

  if (!isSuperAdmin) {
    toast.error("Access Denied: Super Admin credentials required");
    navigate({ to: "/" });
    return null;
  }

  const { formatCurrency } = useCurrency();
  const rawSettings = useLiveQuery(() => localDb.settings.toArray()) || [];
  const rawUsers = useLiveQuery(() => localDb.users.toArray()) || [];

  const [search, setSearch] = useState("");

  const tenants = useMemo(() => {
    return rawSettings.map((s) => {
      const owner = rawUsers.find((u) => u.orgId === s.orgId && u.role === "admin");
      return {
        id: s.id,
        orgId: s.orgId || "default",
        storeName: s.storeName || "Primary Store",
        phone: s.phone || owner?.phone || "N/A",
        email: s.email || owner?.email || "admin@store.com",
        ownerName: owner?.name || "Store Owner",
        status: s.subscriptionStatus || "trial",
        trialEndsAt: s.trialEndsAt || new Date().toISOString(),
      };
    });
  }, [rawSettings, rawUsers]);

  const activePaidCount = tenants.filter((t) => t.status === "active").length;
  const totalSaasMrr = activePaidCount * 29;

  const activateTenant = async (orgId: string) => {
    const setting = rawSettings.find((s) => s.orgId === orgId || s.id === "default");
    if (setting) {
      await localDb.settings.update(setting.id, { subscriptionStatus: "active" });
      toast.success(`Subscription activated for ${setting.storeName}!`);
    }
  };

  const extendTrial = async (orgId: string) => {
    const setting = rawSettings.find((s) => s.orgId === orgId || s.id === "default");
    if (setting) {
      const newTrial = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await localDb.settings.update(setting.id, {
        trialEndsAt: newTrial,
        subscriptionStatus: "trial",
      });
      toast.success(`Trial extended by 7 days for ${setting.storeName}!`);
    }
  };

  const suspendTenant = async (orgId: string) => {
    const setting = rawSettings.find((s) => s.orgId === orgId || s.id === "default");
    if (setting) {
      await localDb.settings.update(setting.id, { subscriptionStatus: "suspended" });
      toast.success(`Store ${setting.storeName} has been suspended!`);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <DataPage
        title="Super Admin SaaS Control Center"
        description="Manage platform tenants, SaaS subscriptions, trials, and billing activations."
        hideToolbar={false}
        searchPlaceholder="Search store name, email or phone..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        {/* KPI Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Total SaaS Tenants</div>
            <div className="text-2xl font-bold text-primary mt-1">{tenants.length} Stores</div>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Active Paid Subscribers</div>
            <div className="text-2xl font-bold text-success mt-1">{activePaidCount} Stores</div>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-center">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Estimated Monthly SaaS Revenue</div>
            <div className="text-2xl font-bold text-warning-foreground mt-1">{formatCurrency(totalSaasMrr)}/mo</div>
          </div>
        </div>

        {/* Tenant Stores Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Store Name</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Trial Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Super Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-bold flex items-center gap-2">
                      <Store className="size-4 text-primary" />
                      <span>{t.storeName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Org ID: {t.orgId.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-xs">{t.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{t.email} · {t.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(t.trialEndsAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "active" ? (
                      <Badge className="bg-success/15 text-success border-success/30">Active Paid</Badge>
                    ) : t.status === "suspended" ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge className="bg-warning/15 text-warning-foreground border-warning/30">7-Day Trial</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10 text-xs h-7" onClick={() => activateTenant(t.orgId)}>
                        <CheckCircle2 className="mr-1 size-3" /> Activate Plan
                      </Button>
                      <Button size="sm" variant="outline" className="text-info border-info/30 hover:bg-info/10 text-xs h-7" onClick={() => extendTrial(t.orgId)}>
                        <Clock className="mr-1 size-3" /> +7 Days Trial
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-7" onClick={() => suspendTenant(t.orgId)}>
                        <Ban className="mr-1 size-3" /> Suspend
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
