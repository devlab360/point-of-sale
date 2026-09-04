import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { appName } from "@/lib/env";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAllOrganizationsFn,
  getAllPlansFn,
  getAllSupportTicketsAdminFn,
  getAllReviewsAdminFn,
  addTrialDaysFn,
  createTenantUserFn,
} from "@/api/admin/super-admin";
import {
  getPendingPaymentsFn,
  approvePaymentFn,
  rejectPaymentFn,
} from "@/api/admin/subscription-payments";
import { toast } from "sonner";
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
  CheckCircle2,
  XCircle,
  Plus,
  Users,
  Wallet,
  Building2,
  ExternalLink,
  MessageCircle,
  Check,
  Server,
  Zap,
  Shield,
  Calendar,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: `Super Admin Dashboard · ${appName}` }] }),
  component: SuperAdminDashboardPage,
});

const monthlyGrowthData = [
  { month: "Jan", tenants: 12, revenue: 14500, stores: 12 },
  { month: "Feb", tenants: 24, revenue: 29800, stores: 24 },
  { month: "Mar", tenants: 42, revenue: 52000, stores: 42 },
  { month: "Apr", tenants: 68, revenue: 86400, stores: 68 },
  { month: "May", tenants: 95, revenue: 128000, stores: 95 },
  { month: "Jun", tenants: 130, revenue: 174500, stores: 130 },
  { month: "Jul", tenants: 175, revenue: 226000, stores: 175 },
  { month: "Aug", tenants: 230, revenue: 289500, stores: 230 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

function SuperAdminDashboardPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [chartMetric, setChartMetric] = useState<"revenue" | "growth">("revenue");
  const [activeTab, setActiveTab] = useState<"pending" | "recent" | "expiring" | "support">(
    "pending",
  );
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [quickExtendOrg, setQuickExtendOrg] = useState<any | null>(null);
  const [extendDays, setExtendDays] = useState("14");

  const [newStore, setNewStore] = useState({
    storeName: "",
    ownerName: "",
    email: "",
    password: "",
    planId: "basic",
  });

  // Queries
  const {
    data: orgData,
    isLoading: isOrgLoading,
    refetch: refetchOrgs,
    isFetching,
  } = useQuery({
    queryKey: ["saas-organizations"],
    queryFn: () => getAllOrganizationsFn({ data: {} }),
  });

  const { data: plansData } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: () => getAllPlansFn({ data: {} }),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ["subscription-payments"],
    queryFn: () => getPendingPaymentsFn({ data: {} }),
  });

  const { data: ticketsData } = useQuery({
    queryKey: ["super-admin-support-tickets"],
    queryFn: () => getAllSupportTicketsAdminFn({ data: {} }),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["super-admin-reviews"],
    queryFn: () => getAllReviewsAdminFn({ data: {} }),
  });

  // Mutations
  const approvePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => approvePaymentFn({ data: { paymentId } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("admin.paymentApproved", "Payment approved & store subscription extended!"));
        queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res.error || t("failedToApprovePayment", "Failed to approve payment"));
      }
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: (paymentId: string) => rejectPaymentFn({ data: { paymentId, notes: "Admin rejected" } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("admin.paymentRejected", "Payment rejected"));
        queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
      } else {
        toast.error(res.error || t("failedToRejectPayment", "Failed to reject payment"));
      }
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: (data: any) => createTenantUserFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("admin.tenantProvisioned", "New tenant store provisioned successfully!"));
        setIsCreateStoreOpen(false);
        setNewStore({ storeName: "", ownerName: "", email: "", password: "", planId: "basic" });
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res.error || t("failedToProvisionStore", "Failed to provision store"));
      }
    },
  });

  const addTrialMutation = useMutation({
    mutationFn: (data: { orgId: string; days: number }) => addTrialDaysFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("admin.trialExtended", "Trial / Subscription period extended successfully!"));
        setQuickExtendOrg(null);
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res.error || t("failedToExtendTrial", "Failed to extend trial"));
      }
    },
  });

  const organizations = orgData?.data?.orgs || [];
  const plans = (plansData?.data as any[]) || [];
  const payments = (paymentsData?.data as any[]) || [];
  const tickets = (ticketsData?.data as any[]) || [];
  const reviews = (reviewsData?.data?.reviews as any[]) || [];

  const totalTenants = organizations.length;
  const activeTenants = organizations.filter((o: any) => o.status === "active").length;
  const trialTenants = organizations.filter((o: any) => o.status === "trial").length;
  const suspendedTenants = organizations.filter((o: any) => o.status === "suspended").length;
  const pendingPayments = payments.filter((p: any) => p.status === "pending");
  const openTickets = tickets.filter((t: any) => t.status === "open" || t.status === "in-progress");

  // Approximate MRR calculation
  const calculatedMRR = organizations
    .filter((o: any) => o.status === "active")
    .reduce((acc: number, org: any) => {
      const plan = plans.find((p: any) => p.id === org.currentPlanId);
      const price = Number(plan?.monthlyPrice || plan?.price || 499);
      return acc + price;
    }, 0);

  const avgReviewScore =
    reviews.length > 0
      ? (
          reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviews.length
        ).toFixed(1)
      : "5.0";

  // Plan distribution for donut chart
  const planDistribution = plans
    .map((plan: any) => {
      const count = organizations.filter((o: any) => o.currentPlanId === plan.id).length;
      return { name: plan.name, count, price: plan.price || 0 };
    })
    .filter((p) => p.count > 0);

  // Expiring soon stores (within next 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const expiringSoonTenants = organizations.filter((org: any) => {
    if (!org.planExpiryDate) return false;
    const expiry = new Date(org.planExpiryDate);
    return expiry <= sevenDaysFromNow;
  });

  const recentTenants = [...organizations].slice(0, 6);

  const handleRefreshAll = () => {
    refetchOrgs();
    queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
    queryClient.invalidateQueries({ queryKey: ["saas-plans"] });
    queryClient.invalidateQueries({ queryKey: ["super-admin-support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["super-admin-reviews"] });
  };

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Page Header with Quick Actions */}
        <PageHeader
          title={t("admin.dashboardTitle", "Super Admin Executive Dashboard")}
          description={t("admin.dashboardDesc", "Multi-tenant cloud platform analytics, MRR velocity, live payment verification, and infrastructure status.")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={handleRefreshAll}
                disabled={isFetching}
              >
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span>{t("refreshLiveData", "Refresh Live Data")}</span>
              </Button>

              <Button
                size="sm"
                className="gap-1.5 h-9 shadow-xs"
                onClick={() => setIsCreateStoreOpen(true)}
              >
                <Plus className="size-4" />
                <span>{t("provisionNewStore", "Provision New Store")}</span>
              </Button>
            </div>
          }
        />

        {/* Primary Executive Metric Cards (6 KPI Cards) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label={t("monthlyRecurringRev", "Monthly Recurring Rev")}
            value={`₹${calculatedMRR.toLocaleString("en-IN")}`}
            hint={`ARR: ₹${(calculatedMRR * 12).toLocaleString("en-IN")}`}
            icon={Wallet}
            accent="primary"
          />
          <StatCard
            label={t("totalMerchantStores", "Total Merchant Stores")}
            value={String(totalTenants)}
            hint={`${activeTenants} ${t("active", "active")}, ${trialTenants} ${t("trial", "trial")}`}
            icon={Store}
            accent="success"
          />
          <StatCard
            label={t("trialRegistrations", "Trial Registrations")}
            value={String(trialTenants)}
            hint={`${totalTenants > 0 ? Math.round((trialTenants / totalTenants) * 100) : 0}% of network`}
            icon={Sparkles}
            accent="warning"
          />
          <StatCard
            label={t("pendingApprovals", "Pending Approvals")}
            value={String(pendingPayments.length)}
            hint={pendingPayments.length > 0 ? t("requiresReview", "Requires review") : t("allCleared", "All cleared")}
            icon={Receipt}
            accent={pendingPayments.length > 0 ? "destructive" : "info"}
          />
          <StatCard
            label={t("supportInquiries", "Support Inquiries")}
            value={String(openTickets.length)}
            hint={`${tickets.length} ${t("totalSubmitted", "total submitted")}`}
            icon={MessageCircle}
            accent="info"
          />
          <StatCard
            label={t("satisfactionRating", "Satisfaction Rating")}
            value={`${avgReviewScore} ★`}
            hint={`${t("from", "From")} ${reviews.length} ${t("merchantReviews", "merchant reviews")}`}
            icon={Star}
            accent="warning"
          />
        </div>

        {/* Operational Quick Shortcut Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/admin/payments"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Receipt className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {t("paymentApprovals", "Payment Approvals")}
                </p>
                <p className="text-[10px] text-muted-foreground">{t("verifyBankUpi", "Verify offline bank & UPI")}</p>
              </div>
            </div>
            {pendingPayments.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                {pendingPayments.length}
              </Badge>
            )}
          </Link>

          <Link
            to="/admin/tenants"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Store className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {t("tenantDirectory", "Tenant Directory")}
                </p>
                <p className="text-[10px] text-muted-foreground">{totalTenants} {t("totalRegistered", "total registered")}</p>
              </div>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/plans"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <Layers className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  SaaS Pricing Plans
                </p>
                <p className="text-[10px] text-muted-foreground">{plans.length} active tiers</p>
              </div>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/support"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <MessageCircle className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Support Inbox
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {openTickets.length} open tickets
                </p>
              </div>
            </div>
            {openTickets.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                {openTickets.length}
              </Badge>
            )}
          </Link>
        </div>

        {/* Visual Analytics & Infrastructure Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Growth & Revenue Area Chart (2 Cols) */}
          <Card className="lg:col-span-2 rounded-2xl border border-border/80 bg-card shadow-soft p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Platform Growth & Revenue Velocity
                </h3>
                <p className="text-xs text-muted-foreground">
                  Monthly recurring revenue and store provisioning trend
                </p>
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
                <Button
                  size="sm"
                  variant={chartMetric === "revenue" ? "default" : "ghost"}
                  className="h-7 text-xs font-bold rounded-lg"
                  onClick={() => setChartMetric("revenue")}
                >
                  MRR Revenue
                </Button>
                <Button
                  size="sm"
                  variant={chartMetric === "growth" ? "default" : "ghost"}
                  className="h-7 text-xs font-bold rounded-lg"
                  onClick={() => setChartMetric("growth")}
                >
                  Store Count
                </Button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyGrowthData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => (chartMetric === "revenue" ? `₹${v / 1000}k` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    }}
                    formatter={(val: any) =>
                      chartMetric === "revenue"
                        ? [`₹${Number(val).toLocaleString("en-IN")}`, "Monthly Revenue"]
                        : [`${val} stores`, "Total Registered Stores"]
                    }
                  />
                  {chartMetric === "revenue" ? (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#mrrGrad)"
                    />
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="stores"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#growthGrad)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* SaaS Plan Distribution & System Health (1 Col) */}
          <div className="space-y-6">
            {/* SaaS Plan Distribution Donut */}
            <Card className="rounded-2xl border border-border/80 bg-card shadow-soft p-5">
              <h3 className="font-display text-base font-bold text-foreground mb-1">
                SaaS Plan Distribution
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Active stores by subscription tier
              </p>

              {planDistribution.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                  No active store subscriptions assigned yet.
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="count"
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "10px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    {planDistribution.map((plan, idx) => (
                      <div key={plan.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-semibold text-foreground truncate max-w-[80px]">
                            {plan.name}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-muted-foreground">
                          {plan.count} stores
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Platform Infrastructure Health */}
            <Card className="rounded-2xl border border-border/80 bg-card shadow-soft p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-foreground">{t("infrastructureStatus", "Infrastructure Status")}</h4>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 bg-emerald-500/10 font-bold border-emerald-500/20"
                >
                  99.99% {t("operational", "Operational")}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground">{t("edgeSsrRuntime", "Edge SSR Runtime")}</span>
                  <span className="font-semibold text-foreground">Nitro Cloudflare</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground">{t("primaryDatabase", "Primary Database")}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    PostgreSQL ({t("healthy", "Healthy")})
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-muted-foreground">{t("syncPwaEngine", "Sync & PWA Engine")}</span>
                  <span className="font-semibold text-foreground">ServiceWorker v1.3</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Multi-Tabbed Operations & Activity Decision Center */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden">
          {/* Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/30 p-3 sm:px-5">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "pending"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Receipt className="size-3.5" />
                <span>{t("pendingApprovals", "Pending Approvals")}</span>
                {pendingPayments.length > 0 && (
                  <Badge
                    variant="destructive"
                    className={`h-4 px-1 text-[9px] font-black ${
                      activeTab === "pending" ? "bg-white text-primary" : ""
                    }`}
                  >
                    {pendingPayments.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("recent")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "recent"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Store className="size-3.5" />
                <span>{t("recentStores", "Recent Stores")} ({recentTenants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("expiring")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "expiring"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <AlertTriangle className="size-3.5 text-amber-500" />
                <span>{t("expiringSoon", "Expiring Soon")}</span>
                {expiringSoonTenants.length > 0 && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] font-bold text-amber-500 border-amber-500/30"
                  >
                    {expiringSoonTenants.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("support")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "support"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <MessageCircle className="size-3.5" />
                <span>{t("recentInquiries", "Recent Inquiries")} ({tickets.slice(0, 5).length})</span>
              </button>
            </div>

            <Link
              to={
                activeTab === "pending"
                  ? "/admin/payments"
                  : activeTab === "support"
                    ? "/admin/support"
                    : "/admin/tenants"
              }
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mt-2 sm:mt-0"
            >
              <span>{t("viewFullModule", "View Full Module")}</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {/* Tab 1: Pending Approvals Table */}
          {activeTab === "pending" && (
            <div>
              {pendingPayments.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
                  <h4 className="text-sm font-bold text-foreground">{t("zeroPendingApprovals", "Zero Pending Approvals")}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t("zeroPendingApprovalsDesc", "All merchant offline bank & UPI payments have been verified and processed.")}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase">
                    <TableRow>
                      <TableHead>{t("admin.tenantStore", "Tenant Store")}</TableHead>
                      <TableHead>{t("admin.planUpgrade", "Plan Upgrade")}</TableHead>
                      <TableHead>{t("admin.amount", "Amount")}</TableHead>
                      <TableHead>{t("admin.utrReference", "UTR / Reference")}</TableHead>
                      <TableHead>{t("admin.submittedDate", "Submitted Date")}</TableHead>
                      <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((p: any) => (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-bold text-xs text-foreground">
                            {p.organizationName || p.organizationId}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{p.userEmail}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {p.planName || p.planId}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-xs">
                          ₹{p.amount || 0}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground">
                          {p.referenceNumber || p.utrNumber || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(p.id)}
                            >
                              <Check className="size-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              disabled={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(p.id)}
                            >
                              <XCircle className="size-3" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Tab 2: Recent Stores Table */}
          {activeTab === "recent" && (
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase">
                <TableRow>
                  <TableHead>{t("admin.storeName", "Store Name")}</TableHead>
                  <TableHead>{t("admin.ownerEmail", "Owner Email")}</TableHead>
                  <TableHead>{t("admin.assignedPlan", "Assigned Plan")}</TableHead>
                  <TableHead>{t("common.status", "Status")}</TableHead>
                  <TableHead>{t("admin.expiresOn", "Expires On")}</TableHead>
                  <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTenants.map((org: any) => (
                  <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-bold text-xs text-foreground">{org.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{org.id}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {org.ownerEmail || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {org.currentPlanId || "basic"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          org.status === "active"
                            ? "default"
                            : org.status === "trial"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px] font-bold uppercase"
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {org.planExpiryDate
                        ? new Date(org.planExpiryDate).toLocaleDateString()
                        : "Lifetime / No Expiry"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to="/admin/tenants">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1"
                        >
                          <Eye className="size-3" /> Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Tab 3: Expiring Soon Stores */}
          {activeTab === "expiring" && (
            <div>
              {expiringSoonTenants.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
                  <h4 className="text-sm font-bold text-foreground">
                    No Subscriptions Expiring Soon
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    All active merchant stores are well within their billing period.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase">
                    <TableRow>
                      <TableHead>{t("admin.storeName", "Store Name")}</TableHead>
                      <TableHead>{t("admin.ownerEmail", "Owner Email")}</TableHead>
                      <TableHead>{t("admin.currentTier", "Current Tier")}</TableHead>
                      <TableHead>{t("admin.expirationDate", "Expiration Date")}</TableHead>
                      <TableHead className="text-right">{t("admin.quickExtendAction", "Quick Extend Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringSoonTenants.map((org: any) => (
                      <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-bold text-xs text-foreground">{org.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {org.id}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {org.ownerEmail}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">
                            {org.currentPlanId || "trial"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-amber-500">
                          {new Date(org.planExpiryDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => setQuickExtendOrg(org)}
                          >
                            <Sparkles className="size-3" /> Add Trial Days
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Tab 4: Recent Support Inquiries */}
          {activeTab === "support" && (
            <div>
              {tickets.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <MessageCircle className="size-8 mx-auto text-muted-foreground/40" />
                  <h4 className="text-sm font-bold text-foreground">{t("noSupportTicketsYet", "No Support Tickets Yet")}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t("merchantSupportInquiriesDesc", "Merchant support inquiries will appear here automatically.")}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase">
                    <TableRow>
                      <TableHead>{t("admin.storeOrg", "Store Org")}</TableHead>
                      <TableHead>{t("admin.subject", "Subject")}</TableHead>
                      <TableHead>{t("common.status", "Status")}</TableHead>
                      <TableHead>{t("admin.createdDate", "Created Date")}</TableHead>
                      <TableHead className="text-right">{t("common.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.slice(0, 6).map((ticket: any) => (
                      <TableRow key={ticket.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-bold text-xs text-foreground">
                            {ticket.orgName || ticket.organizationId}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {ticket.userName || ticket.orgEmail}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium max-w-xs truncate">
                          {ticket.subject || "Support Inquiry"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ticket.status === "resolved"
                                ? "default"
                                : ticket.status === "in-progress"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px] font-bold capitalize"
                          >
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to="/admin/support">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs font-semibold gap-1"
                            >
                              View Ticket
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </div>

        {/* Quick Provision New Tenant Store Drawer */}
        <Sheet open={isCreateStoreOpen} onOpenChange={setIsCreateStoreOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Provision New Tenant Store
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Instantly provision a new merchant POS account with store credentials and assigned
                SaaS tier.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTenantMutation.mutate(newStore);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="q-storeName">{t("storeCompanyName", "Store / Company Name")}</Label>
                  <Input
                    id="q-storeName"
                    required
                    value={newStore.storeName}
                    onChange={(e) => setNewStore({ ...newStore, storeName: e.target.value })}
                    placeholder={t("storeNamePlaceholder", "e.g. Apex Supermarket")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="q-ownerName">{t("ownerFullName", "Owner Full Name")}</Label>
                  <Input
                    id="q-ownerName"
                    required
                    value={newStore.ownerName}
                    onChange={(e) => setNewStore({ ...newStore, ownerName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="q-email">{t("ownerEmail", "Owner Email")}</Label>
                  <Input
                    id="q-email"
                    type="email"
                    required
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    placeholder="owner@apexstore.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="q-password">{t("initialPassword", "Initial Password")}</Label>
                  <Input
                    id="q-password"
                    type="password"
                    required
                    value={newStore.password}
                    onChange={(e) => setNewStore({ ...newStore, password: e.target.value })}
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="q-plan">{t("assignSaasPlanTier", "Assign SaaS Plan Tier")}</Label>
                  <Select
                    value={newStore.planId}
                    onValueChange={(val) => setNewStore({ ...newStore, planId: val })}
                  >
                    <SelectTrigger id="q-plan">
                      <SelectValue placeholder={t("selectPlanTier", "Select plan tier")} />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (₹{p.price || 0}/{t("mo", "mo")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateStoreOpen(false)}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={createTenantMutation.isPending}>
                  {createTenantMutation.isPending ? t("provisioning", "Provisioning…") : t("provisionStoreNow", "Provision Store Now")}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Quick Extend Trial Drawer */}
        <Sheet open={!!quickExtendOrg} onOpenChange={(open) => !open && setQuickExtendOrg(null)}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                {t("extendTrialSubscription", "Extend Trial / Subscription")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("addBonusTrialDaysTo", "Add bonus trial days to")} {quickExtendOrg?.name || t("merchantStore", "Merchant Store")}.
              </SheetDescription>
            </SheetHeader>

            {quickExtendOrg && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTrialMutation.mutate({
                    orgId: quickExtendOrg.id,
                    days: Number(extendDays) || 14,
                  });
                }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("storeOrganization", "Store Organization:")}</span>
                      <span className="font-bold text-foreground">{quickExtendOrg.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("currentExpiry", "Current Expiry:")}</span>
                      <span className="font-mono text-foreground">
                        {quickExtendOrg.planExpiryDate
                          ? new Date(quickExtendOrg.planExpiryDate).toLocaleDateString()
                          : t("noExpiryLifetime", "No Expiry / Lifetime")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ext-days">{t("daysToAdd", "Days to Add")}</Label>
                    <Select value={extendDays} onValueChange={setExtendDays}>
                      <SelectTrigger id="ext-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">+7 {t("daysExtension", "Days Extension")}</SelectItem>
                        <SelectItem value="14">+14 {t("daysExtensionRecommended", "Days Extension (Recommended)")}</SelectItem>
                        <SelectItem value="30">+30 {t("daysOneMonth", "Days (1 Month)")}</SelectItem>
                        <SelectItem value="60">+60 {t("daysTwoMonths", "Days (2 Months)")}</SelectItem>
                        <SelectItem value="90">+90 {t("daysQuarterly", "Days (Quarterly)")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setQuickExtendOrg(null)}>
                    {t("cancel", "Cancel")}
                  </Button>
                  <Button type="submit" disabled={addTrialMutation.isPending}>
                    {addTrialMutation.isPending ? t("addingDays", "Adding Days…") : t("confirmExtension", "Confirm Extension")}
                  </Button>
                </SheetFooter>
              </form>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
