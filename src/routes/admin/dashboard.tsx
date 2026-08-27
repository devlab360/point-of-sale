import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllOrganizationsFn, getAllPlansFn } from "@/api/admin/super-admin";
import { getPendingPaymentsFn } from "@/api/admin/subscription-payments";
import {
  Store,
  CreditCard,
  Activity,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Layers,
  Receipt,
  Star,
  RefreshCw,
  Sparkles,
  DollarSign,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Super Admin OneDesk360" }] }),
  component: SuperAdminDashboardPage,
});

const monthlyGrowthData = [
  { month: "Jan", tenants: 4, revenue: 14500, activeTrials: 3 },
  { month: "Feb", tenants: 9, revenue: 29800, activeTrials: 5 },
  { month: "Mar", tenants: 16, revenue: 52000, activeTrials: 7 },
  { month: "Apr", tenants: 25, revenue: 86400, activeTrials: 9 },
  { month: "May", tenants: 36, revenue: 128000, activeTrials: 12 },
  { month: "Jun", tenants: 48, revenue: 174500, activeTrials: 14 },
  { month: "Jul", tenants: 62, revenue: 226000, activeTrials: 18 },
  { month: "Aug", tenants: 79, revenue: 289500, activeTrials: 22 },
];

function SuperAdminDashboardPage() {
  const {
    data: orgData,
    isLoading: isOrgLoading,
    refetch,
  } = useQuery({
    queryKey: ["saas-organizations"],
    queryFn: () => getAllOrganizationsFn({ data: {} }),
  });

  const { data: plansData } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => getAllPlansFn({ data: {} }),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ["payments-dashboard"],
    queryFn: () => getPendingPaymentsFn({ data: {} }),
  });

  const organizations = orgData?.data?.orgs || [];
  const plans = (plansData?.data as any[]) || [];
  const payments = (paymentsData?.data as any[]) || [];

  const totalTenants = organizations.length;
  const activeTenants = organizations.filter((o: any) => o.status === "active").length;
  const trialTenants = organizations.filter((o: any) => o.status === "trial").length;
  const pendingPayments = payments.filter((p: any) => p.status === "pending");

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold font-mono">
                SAAS V3.0
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">Platform Overview</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time multi-tenant health, metrics, and subscription approvals
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="size-4" />
            <span>Refresh Data</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Stores / Tenants
                  </p>
                  <h3 className="text-2xl font-bold mt-1">{isOrgLoading ? "..." : totalTenants}</h3>
                </div>
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Store className="size-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <span className="text-emerald-500 font-bold flex items-center">
                  <ArrowUpRight className="size-3" /> +14%
                </span>{" "}
                vs last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Subscribers</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {isOrgLoading ? "..." : activeTenants}
                  </h3>
                </div>
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="size-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="font-semibold text-foreground">{trialTenants}</span> on active
                trial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                  <h3 className="text-2xl font-bold mt-1">{pendingPayments.length}</h3>
                </div>
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Receipt className="size-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Manual bank transfers awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">SaaS Pricing Tiers</p>
                  <h3 className="text-2xl font-bold mt-1">{plans.length}</h3>
                </div>
                <div className="size-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Layers className="size-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Active plan configurations</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Platform Growth & Revenue</CardTitle>
              <CardDescription>Monthly subscriber growth and MRR performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyGrowthData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Management</CardTitle>
              <CardDescription>Jump straight to administrative actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/admin/tenants" className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Store className="size-4" /> Manage Tenants
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>

              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/admin/plans" className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Layers className="size-4" /> Edit SaaS Tiers
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>

              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/admin/payments" className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Receipt className="size-4" /> Verify Payments
                  </span>
                  {pendingPayments.length > 0 && (
                    <Badge variant="destructive" className="ml-auto mr-2">
                      {pendingPayments.length}
                    </Badge>
                  )}
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>

              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/admin/users" className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Activity className="size-4" /> Super Admin Users
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
