import { createLazyFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Shield, Users, CreditCard, Activity } from "lucide-react";
import { StatCard } from "@/components/layout/StatCard";
import { Card } from "@/components/ui/card";
import { localDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createLazyFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const organizations = useLiveQuery(() => localDb.saasOrganizations.toArray()) || [];
  const plans = useLiveQuery(() => localDb.saasPlans.toArray()) || [];
  const sessions = useLiveQuery(() => localDb.saasSessions.toArray()) || [];

  const liveUsers = sessions.filter(s => s.status === "live").length;
  const mrr = organizations.reduce((acc, org) => {
    const plan = plans.find(p => p.id === org.currentPlanId);
    return acc + (plan?.price || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        description="Manage your SaaS tenants, subscriptions, and monitor active sessions."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tenants" value={organizations.length.toString()} delta={0} icon={Users} accent="primary" />
        <StatCard label="Live Sessions" value={liveUsers.toString()} delta={0} icon={Activity} accent="success" />
        <StatCard label="Monthly MRR" value={"₹" + mrr.toLocaleString()} delta={0} icon={CreditCard} accent="warning" />
        <StatCard label="System Status" value="Healthy" delta={0} icon={Shield} accent="info" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card title="Recent Activity" className="p-4">
          <div className="space-y-4">
            {sessions.slice(0, 10).reverse().map(session => (
              <div key={session.id} className="flex flex-col border-b border-border pb-2 last:border-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold">{organizations.find(o => o.id === session.orgId)?.name || "Unknown Org"}</span>
                  <Badge variant="outline" className={session.status === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                    {session.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>In: {formatTime(session.loginAt)}</span>
                  {session.logoutAt && <span>Out: {formatTime(session.logoutAt)}</span>}
                </div>
              </div>
            ))}
            {sessions.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No recent sessions.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
