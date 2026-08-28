import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Star,
  Users,
  TrendingUp,
  Award,
  Plus,
  Trash2,
  Loader2,
  Search,
  Gift,
  Sparkles,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Phone,
  Mail,
  ShoppingBag,
  Clock,
  Wallet,
  Crown,
  Flame,
  Zap,
  Check,
  Edit,
  UserCheck,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomersFn, updateCustomerFn } from "@/api/customers";
import { getSettingsFn, updateSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty & Rewards Program — OneDesk360" }] }),
  component: LoyaltyPage,
});

export interface LoyaltyTier {
  tier: string;
  min: number;
  perks: string[];
  color: string;
}

export interface LoyaltyRules {
  earnRate: number; // Spend amount to earn 1 point (e.g. 10 means 1 point per $10)
  redemptionRate: number; // Value in currency per 100 points (e.g. 5 means 100 points = $5)
  minRedeemPoints: number; // Minimum points required before redemption is allowed
  welcomeBonusPoints: number; // Points awarded on new registration
}

const getDefaultTiers = (currencySymbol: string): LoyaltyTier[] => [
  {
    tier: "Bronze",
    min: 0,
    perks: [`1 pt per ${currencySymbol}10 spent`, "Welcome reward package"],
    color: "bg-amber-700",
  },
  {
    tier: "Silver",
    min: 500,
    perks: [`1.5x points multiplier`, "Free standard delivery", "Birthday gift coupon"],
    color: "bg-slate-400",
  },
  {
    tier: "Gold",
    min: 1500,
    perks: [`2x points multiplier`, "Exclusive seasonal discounts", "Priority customer queue"],
    color: "bg-amber-500",
  },
  {
    tier: "Platinum",
    min: 5000,
    perks: [`3x points multiplier`, "Dedicated VIP concierge", "Early sale access", "Free express delivery"],
    color: "bg-indigo-600",
  },
];

const defaultLoyaltyRules: LoyaltyRules = {
  earnRate: 10,
  redemptionRate: 5,
  minRedeemPoints: 50,
  welcomeBonusPoints: 100,
};

export function getCustomerTier(points: number, tiers: LoyaltyTier[]): {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  pointsToNext: number;
  progress: number;
} {
  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);
  if (sortedTiers.length === 0) {
    const fallback: LoyaltyTier = { tier: "Member", min: 0, perks: [], color: "bg-primary" };
    return { currentTier: fallback, nextTier: null, pointsToNext: 0, progress: 100 };
  }

  let currentTier = sortedTiers[0];
  let nextTier: LoyaltyTier | null = null;

  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    if (points >= sortedTiers[i].min) {
      currentTier = sortedTiers[i];
      nextTier = sortedTiers[i + 1] || null;
      break;
    }
  }

  if (!nextTier) {
    return { currentTier, nextTier: null, pointsToNext: 0, progress: 100 };
  }

  const range = nextTier.min - currentTier.min;
  const currentInRange = points - currentTier.min;
  const progress = Math.min(100, Math.max(0, Math.round((currentInRange / (range || 1)) * 100)));
  const pointsToNext = Math.max(0, nextTier.min - points);

  return { currentTier, nextTier, pointsToNext, progress };
}

// Elegant Tier Styling with Gradients and Glass Borders
function getTierVisuals(tierName: string, colorClass: string) {
  const lower = (tierName || "").toLowerCase();
  if (lower.includes("platinum") || lower.includes("diamond") || colorClass.includes("indigo") || colorClass.includes("purple")) {
    return {
      gradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
      badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      accent: "text-indigo-500 dark:text-indigo-400",
      icon: "💎",
      border: "border-indigo-500/30",
      glow: "shadow-[0_0_20px_rgba(99,102,241,0.12)]",
      fillBar: "bg-gradient-to-r from-indigo-500 to-purple-500",
    };
  }
  if (lower.includes("gold") || colorClass.includes("amber-500") || colorClass.includes("warning")) {
    return {
      gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      accent: "text-amber-500 dark:text-amber-400",
      icon: "🥇",
      border: "border-amber-500/30",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
      fillBar: "bg-gradient-to-r from-amber-500 to-yellow-400",
    };
  }
  if (lower.includes("silver") || colorClass.includes("slate")) {
    return {
      gradient: "from-slate-400/20 via-slate-300/10 to-transparent",
      badge: "bg-slate-400/15 text-slate-700 dark:text-slate-300 border-slate-400/30",
      accent: "text-slate-500 dark:text-slate-300",
      icon: "🥈",
      border: "border-slate-400/30",
      glow: "shadow-[0_0_15px_rgba(148,163,184,0.12)]",
      fillBar: "bg-gradient-to-r from-slate-400 to-slate-200",
    };
  }
  // Bronze / Default
  return {
    gradient: "from-amber-700/20 via-amber-800/10 to-transparent",
    badge: "bg-amber-700/15 text-amber-800 dark:text-amber-300 border-amber-700/30",
    accent: "text-amber-700 dark:text-amber-400",
    icon: "🥉",
    border: "border-amber-700/30",
    glow: "shadow-[0_0_15px_rgba(180,83,9,0.10)]",
    fillBar: "bg-gradient-to-r from-amber-700 to-amber-500",
  };
}

function LoyaltyPage() {
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const { formatAppCurrency } = useAppFormatter();

  // State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"points-desc" | "points-asc" | "spent-desc" | "name-asc">("points-desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Drawer / Sheet State for Customer Profile & Points Adjustment
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<"adjust" | "edit">("adjust");

  // Relative Adjust Points form
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjustAmount, setAdjustAmount] = useState<string>("100");
  const [adjustReason, setAdjustReason] = useState<string>("Promotion / Bonus Reward");
  const [adjustCustomReason, setAdjustCustomReason] = useState<string>("");

  // Edit Customer Profile & Exact Points form
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editCustomerPoints, setEditCustomerPoints] = useState<string>("0");
  const [editCustomerStatus, setEditCustomerStatus] = useState("active");
  const [editCustomerType, setEditCustomerType] = useState("retail");

  // Data Queries
  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => ((await getSettingsFn({ data: {} })) as any)?.data || {},
  });

  const currencySymbol = settingsData?.currencySymbol || "₹";

  const activeTiers: LoyaltyTier[] = useMemo(() => {
    if (
      settingsData?.loyaltyTiers &&
      Array.isArray(settingsData.loyaltyTiers) &&
      settingsData.loyaltyTiers.length > 0
    ) {
      return settingsData.loyaltyTiers;
    }
    return getDefaultTiers(currencySymbol);
  }, [settingsData?.loyaltyTiers, currencySymbol]);

  const activeRules: LoyaltyRules = useMemo(() => {
    return {
      ...defaultLoyaltyRules,
      ...(settingsData?.config?.loyaltyRules || {}),
    };
  }, [settingsData?.config?.loyaltyRules]);

  // Enhanced customers with tier calculations
  const customers = useMemo(() => {
    const raw = customersData || [];
    return raw.map((c: any) => {
      const points = Number(c.loyaltyPoints) || 0;
      const spent = parseFloat(c.totalSpent) || 0;
      const visits = Number(c.visits) || 0;
      const credit = parseFloat(c.credit) || 0;
      const walletBalance = parseFloat(c.walletBalance) || 0;
      const tierInfo = getCustomerTier(points, activeTiers);
      return {
        ...c,
        loyaltyPoints: points,
        totalSpent: spent,
        visits,
        credit,
        walletBalance,
        ...tierInfo,
      };
    });
  }, [customersData, activeTiers]);

  // Keep activeCustomer in sync with latest customer data
  useEffect(() => {
    if (activeCustomer) {
      const updated = customers.find((c) => c.id === activeCustomer.id);
      if (updated) {
        setActiveCustomer(updated);
      }
    }
  }, [customers]);

  // Key metrics
  const totalMembers = customers.length;
  const totalPoints = useMemo(() => customers.reduce((acc, c) => acc + c.loyaltyPoints, 0), [customers]);
  const avgLtv = useMemo(() => (totalMembers ? customers.reduce((acc, c) => acc + c.totalSpent, 0) / totalMembers : 0), [customers, totalMembers]);
  const totalRedemptionValue = useMemo(() => (totalPoints / 100) * (activeRules.redemptionRate || 5), [totalPoints, activeRules.redemptionRate]);
  const topMembers = useMemo(() => [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 5), [customers]);

  // Tier distribution counts
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeTiers.forEach((t) => (counts[t.tier] = 0));
    customers.forEach((c) => {
      const name = c.currentTier?.tier || "Bronze";
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [customers, activeTiers]);

  // Filtered and sorted customers for directory table
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const matchesQuery =
          searchQuery === "" ||
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTier =
          selectedTierFilter === "all" ||
          c.currentTier?.tier?.toLowerCase() === selectedTierFilter.toLowerCase();

        return matchesQuery && matchesTier;
      })
      .sort((a, b) => {
        if (sortBy === "points-desc") return b.loyaltyPoints - a.loyaltyPoints;
        if (sortBy === "points-asc") return a.loyaltyPoints - b.loyaltyPoints;
        if (sortBy === "spent-desc") return b.totalSpent - a.totalSpent;
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
        return 0;
      });
  }, [customers, searchQuery, selectedTierFilter, sortBy]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  // Form states for Configuration Drawer
  const [editTiers, setEditTiers] = useState<LoyaltyTier[]>([]);
  const [editRules, setEditRules] = useState<LoyaltyRules>(defaultLoyaltyRules);

  useEffect(() => {
    if (isConfigOpen) {
      setEditTiers(JSON.parse(JSON.stringify(activeTiers)));
      setEditRules(JSON.parse(JSON.stringify(activeRules)));
    }
  }, [isConfigOpen, activeTiers, activeRules]);

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { tiers: LoyaltyTier[]; rules: LoyaltyRules }) => {
      const currentConfig = settingsData?.config || {};
      return updateSettingsFn({
        data: {
          settings: {
            loyaltyTiers: payload.tiers,
            config: {
              ...currentConfig,
              loyaltyRules: payload.rules,
            },
          },
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Loyalty program settings saved successfully!");
        queryClient.invalidateQueries({ queryKey: ["settings", orgId] });
        setIsConfigOpen(false);
      } else {
        toast.error(res?.error || "Failed to update settings");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "An unexpected error occurred");
    },
  });

  // Mutation to update customer profile or points
  const updateCustomerMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: any;
    }) => {
      return updateCustomerFn({
        data: {
          id,
          updates,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Customer profile updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
      } else {
        toast.error(res?.error || "Failed to update customer");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update customer");
    },
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < editTiers.length; i++) {
      if (!editTiers[i].tier.trim()) {
        toast.error(`Tier #${i + 1} must have a valid name`);
        return;
      }
    }
    updateSettingsMutation.mutate({
      tiers: editTiers,
      rules: editRules,
    });
  };

  const handleOpenCustomerDrawer = (customer: any, initialTab: "adjust" | "edit" = "adjust") => {
    setActiveCustomer(customer);
    setDrawerActiveTab(initialTab);

    // Populate relative adjuster
    setAdjustType("add");
    setAdjustAmount("100");
    setAdjustReason("Promotion / Bonus Reward");
    setAdjustCustomReason("");

    // Populate direct edit fields
    setEditCustomerName(customer.name || "");
    setEditCustomerPhone(customer.phone || "");
    setEditCustomerEmail(customer.email || "");
    setEditCustomerPoints(String(customer.loyaltyPoints ?? 0));
    setEditCustomerStatus(customer.status || "active");
    setEditCustomerType(customer.type || "retail");

    setIsCustomerDrawerOpen(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    const qty = parseInt(adjustAmount, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid points amount greater than 0");
      return;
    }

    const currentPts = activeCustomer.loyaltyPoints || 0;
    const newPoints = adjustType === "add" ? currentPts + qty : Math.max(0, currentPts - qty);

    updateCustomerMutation.mutate({
      id: activeCustomer.id,
      updates: {
        loyaltyPoints: Math.max(0, newPoints),
      },
    });
  };

  const handleConfirmDirectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    if (!editCustomerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const pointsNum = parseInt(editCustomerPoints, 10);
    const validPoints = isNaN(pointsNum) ? activeCustomer.loyaltyPoints : Math.max(0, pointsNum);

    updateCustomerMutation.mutate({
      id: activeCustomer.id,
      updates: {
        name: editCustomerName.trim(),
        phone: editCustomerPhone.trim() || null,
        email: editCustomerEmail.trim() || null,
        loyaltyPoints: validPoints,
        status: editCustomerStatus,
        type: editCustomerType,
      },
    });
  };

  // Helper tier editing handlers
  const updateEditTier = (index: number, field: string, value: any) => {
    const updated = [...editTiers];
    updated[index] = { ...updated[index], [field]: value };
    setEditTiers(updated);
  };

  const removeEditTier = (index: number) => {
    if (editTiers.length <= 1) {
      toast.error("You must have at least one loyalty tier");
      return;
    }
    const updated = [...editTiers];
    updated.splice(index, 1);
    setEditTiers(updated);
  };

  const addEditTier = () => {
    const highestMin = editTiers.reduce((max, t) => Math.max(max, t.min), 0);
    setEditTiers([
      ...editTiers,
      {
        tier: "New Tier",
        min: highestMin + 1000,
        perks: ["Special discount", "Priority service"],
        color: "bg-primary",
      },
    ]);
  };

  const updatePerk = (tierIndex: number, perkIndex: number, value: string) => {
    const updated = [...editTiers];
    const newPerks = [...updated[tierIndex].perks];
    newPerks[perkIndex] = value;
    updated[tierIndex] = { ...updated[tierIndex], perks: newPerks };
    setEditTiers(updated);
  };

  const addPerk = (tierIndex: number) => {
    const updated = [...editTiers];
    updated[tierIndex] = { ...updated[tierIndex], perks: [...updated[tierIndex].perks, ""] };
    setEditTiers(updated);
  };

  const removePerk = (tierIndex: number, perkIndex: number) => {
    const updated = [...editTiers];
    const newPerks = [...updated[tierIndex].perks];
    newPerks.splice(perkIndex, 1);
    updated[tierIndex] = { ...updated[tierIndex], perks: newPerks };
    setEditTiers(updated);
  };

  return (
    <div className="page-container space-y-7 pb-16">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-500/10 p-6 sm:p-8 shadow-card">
        {/* Glow Spheres in background */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold tracking-wide backdrop-blur-md">
              <Sparkles className="size-3.5 animate-pulse text-amber-500" />
              <span>LOYALTY & REWARDS SYSTEM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Customer Retention & VIP Loyalty
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Reward your most frequent buyers, elevate customer lifetime value, and automate tier progression with point multipliers and custom VIP perks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (customers.length > 0) {
                  handleOpenCustomerDrawer(customers[0], "adjust");
                } else {
                  toast.error("No customers available to view or adjust");
                }
              }}
              className="gap-2 border-border/80 bg-background/80 hover:bg-muted/80 backdrop-blur shadow-sm text-xs font-bold rounded-xl"
            >
              <Coins className="size-4 text-warning" />
              Member Drawer
            </Button>
            <Button
              size="lg"
              onClick={() => setIsConfigOpen(true)}
              className="gap-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all text-xs font-bold rounded-xl"
            >
              <SlidersHorizontal className="size-4" />
              Configure Program & Tiers
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Enrolled Members */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Enrolled Members
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {totalMembers.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="inline-block size-2 rounded-full bg-success animate-ping" />
              <span>{tierCounts[activeTiers[activeTiers.length - 1]?.tier] || 0} in VIP tier</span>
            </div>
          </div>
        </div>

        {/* Points In Circulation */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Points in Circulation
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Star className="size-5 fill-amber-500/30" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-500">
              {totalPoints.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              ≈ {formatAppCurrency(totalRedemptionValue)} store credit value
            </div>
          </div>
        </div>

        {/* Average Customer LTV */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Average Customer LTV
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {formatAppCurrency(avgLtv)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Average spend per loyalty member
            </div>
          </div>
        </div>

        {/* Earning & Redemption Rule */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur p-5 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Earning & Redemption
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Gift className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              1 pt / {currencySymbol}{activeRules.earnRate}
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Redeem: 100 pts = {formatAppCurrency(activeRules.redemptionRate)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Tier Breakdown & VIP Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tier Cards Showcase */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Active Loyalty Tiers & Benefits
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers dynamically unlock elevated tiers and privileges as they collect points.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                className="gap-1.5 h-8 text-xs font-bold rounded-xl border-border/80"
              >
                <Edit className="size-3.5 text-primary" /> Edit Tiers
              </Button>
              <Badge variant="outline" className="font-bold text-xs py-1 px-3 w-fit bg-primary/5 border-primary/20 text-primary">
                {activeTiers.length} Configured Tiers
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTiers.map((t, idx) => {
              const count = tierCounts[t.tier] || 0;
              const percent = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
              const visuals = getTierVisuals(t.tier, t.color);

              return (
                <div
                  key={t.tier + idx}
                  className={`rounded-2xl border ${visuals.border} bg-gradient-to-br ${visuals.gradient} bg-card/60 backdrop-blur p-5 flex flex-col justify-between space-y-4 hover:-translate-y-0.5 transition-all duration-200 ${visuals.glow} group relative`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="grid size-12 place-items-center rounded-2xl bg-background/80 text-2xl border border-border/60 shadow-sm shrink-0">
                        {visuals.icon}
                      </div>
                      <div>
                        <div className="font-black text-base text-foreground flex items-center gap-2">
                          {t.tier} Tier
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold mt-0.5">
                          {count} {count === 1 ? "member" : "members"}{" "}
                          <span className="text-[11px] font-normal opacity-80">({percent}% share)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-background/80 border border-border/80 text-foreground shadow-xs">
                        {t.min}+ pts
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsConfigOpen(true)}
                        className="size-7 text-muted-foreground hover:text-primary rounded-lg"
                        title="Edit this tier"
                      >
                        <Edit className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Distribution Share Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>Enrollment Distribution</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${visuals.fillBar} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Perks List */}
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Privileges & Perks:
                    </span>
                    <div className="space-y-1">
                      {t.perks
                        .filter((p) => p && p.trim() !== "")
                        .map((perk, pIdx) => (
                          <div
                            key={pIdx}
                            className="text-xs text-foreground/90 flex items-center gap-2 font-medium"
                          >
                            <CheckCircle2 className="size-3.5 text-success shrink-0" />
                            <span className="truncate">{perk}</span>
                          </div>
                        ))}
                      {(!t.perks || t.perks.filter((p) => p.trim()).length === 0) && (
                        <span className="text-xs text-muted-foreground italic">
                          Standard tier rewards
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Loyalty Champions Podium / Hall of Fame */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Crown className="size-5 text-amber-500" />
                  Top Champions
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Top 5 loyalty point holders</p>
              </div>
              <Flame className="size-5 text-warning animate-bounce" />
            </div>

            {topMembers.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                No customer loyalty points recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topMembers.map((c, i) => {
                  const visuals = getTierVisuals(c.currentTier?.tier || "", c.currentTier?.color || "");
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleOpenCustomerDrawer(c, "adjust")}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/60 transition-all cursor-pointer group hover:scale-[1.01]"
                    >
                      {/* Rank Indicator */}
                      <div
                        className={`grid size-8 place-items-center rounded-xl text-xs font-black shrink-0 border ${
                          i === 0
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40"
                            : i === 1
                              ? "bg-slate-400/20 text-slate-700 dark:text-slate-200 border-slate-400/40"
                              : i === 2
                                ? "bg-amber-700/20 text-amber-800 dark:text-amber-300 border-amber-700/40"
                                : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </div>

                      {/* Customer Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {c.name}
                          </p>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${visuals.badge}`}
                          >
                            {c.currentTier?.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {c.phone || c.email || "Walk-in Member"} · {c.visits || 0} visits
                        </p>
                      </div>

                      {/* Points Display */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-warning block">
                          {c.loyaltyPoints?.toLocaleString()} pts
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {formatAppCurrency(c.totalSpent)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="size-3 text-warning" /> Auto points on every POS sale
            </span>
            <span className="text-primary font-bold">1 pt / {currencySymbol}{activeRules.earnRate}</span>
          </div>
        </div>
      </div>

      {/* Customer Loyalty Directory Table */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-card space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Member Loyalty Directory
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse customers, view live tier progression progress, and click any row to view, adjust points, or edit member details.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs rounded-xl bg-background/80"
              />
            </div>

            {/* Filter Pill Tabs */}
            <Select
              value={selectedTierFilter}
              onValueChange={(val) => {
                setSelectedTierFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 text-xs rounded-xl bg-background/80">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers ({customers.length})</SelectItem>
                {activeTiers.map((t) => (
                  <SelectItem key={t.tier} value={t.tier.toLowerCase()}>
                    {t.tier} ({tierCounts[t.tier] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(val: any) => setSortBy(val)}
            >
              <SelectTrigger className="h-9 w-40 text-xs rounded-xl bg-background/80">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points-desc">Highest Points</SelectItem>
                <SelectItem value="points-asc">Lowest Points</SelectItem>
                <SelectItem value="spent-desc">Highest Spend</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-2xl border border-border/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4 pl-5">Customer Member</th>
                <th className="p-4">Current Tier</th>
                <th className="p-4">Points Balance</th>
                <th className="p-4 min-w-[180px]">Tier Progression</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Visits</th>
                <th className="p-4 text-right pr-5">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isCustomersLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="size-7 animate-spin mx-auto mb-2 text-primary" />
                    Loading loyalty members...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No customers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const visuals = getTierVisuals(c.currentTier?.tier || "", c.currentTier?.color || "");
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenCustomerDrawer(c, "adjust")}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                    >
                      {/* Customer Info */}
                      <td className="p-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20 group-hover:scale-105 transition-transform shrink-0">
                            {c.name
                              ? c.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "CU"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {c.phone || c.email || "No contact info"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${visuals.badge}`}
                        >
                          <span>{visuals.icon}</span>
                          {c.currentTier?.tier}
                        </span>
                      </td>

                      {/* Points Balance */}
                      <td className="p-4">
                        <span className="font-black text-sm text-foreground">
                          {c.loyaltyPoints?.toLocaleString()}
                        </span>{" "}
                        <span className="text-[10px] text-muted-foreground">pts</span>
                        <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ≈ {formatAppCurrency((c.loyaltyPoints / 100) * activeRules.redemptionRate)} value
                        </span>
                      </td>

                      {/* Tier Progress */}
                      <td className="p-4">
                        {c.nextTier ? (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>To {c.nextTier.tier}</span>
                              <span className="text-primary font-bold">
                                {c.pointsToNext} pts needed
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${visuals.fillBar} transition-all duration-300`}
                                style={{ width: `${c.progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            <Sparkles className="size-3.5" />
                            Top Tier Champion
                          </div>
                        )}
                      </td>

                      {/* Total Spent */}
                      <td className="p-4 font-bold text-foreground">
                        {formatAppCurrency(c.totalSpent)}
                      </td>

                      {/* Visits */}
                      <td className="p-4 text-muted-foreground font-medium">{c.visits || 0} visits</td>

                      {/* Action: Drawer View / Adjust / Edit */}
                      <td className="p-4 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCustomerDrawer(c, "adjust")}
                            className="h-8 text-xs gap-1.5 rounded-xl border-border/80 shadow-xs hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Coins className="size-3.5 text-warning" />
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCustomerDrawer(c, "edit")}
                            className="h-8 text-xs gap-1 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <Edit className="size-3.5" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground font-medium">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredCustomers.length)} of {filteredCustomers.length}{" "}
              members
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs px-3 rounded-xl"
              >
                Previous
              </Button>
              <div className="flex items-center px-2 text-xs font-bold text-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs px-3 rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER 1: Luxury Customer Loyalty Profile, Points Adjuster & Edit Drawer */}
      <Sheet open={isCustomerDrawerOpen} onOpenChange={setIsCustomerDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl overflow-hidden"
        >
          {activeCustomer && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header Hero */}
              <SheetHeader className="bg-gradient-to-r from-primary/10 via-background to-amber-500/10 p-6 border-b border-border/80 pr-12 text-left shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-black text-xl shadow-md shrink-0">
                    {activeCustomer.name
                      ? activeCustomer.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "CU"}
                  </div>
                  <div>
                    <SheetTitle className="text-xl sm:text-2xl font-black text-foreground">
                      {activeCustomer.name}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1 font-medium">
                      {activeCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-primary" /> {activeCustomer.phone}
                        </span>
                      )}
                      {activeCustomer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3 text-info" /> {activeCustomer.email}
                        </span>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Current Loyalty Tier & Points Overview Card */}
                {(() => {
                  const visuals = getTierVisuals(
                    activeCustomer.currentTier?.tier || "",
                    activeCustomer.currentTier?.color || ""
                  );
                  return (
                    <div
                      className={`rounded-3xl border ${visuals.border} bg-gradient-to-br ${visuals.gradient} bg-card/80 p-5 shadow-sm space-y-4 ${visuals.glow}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Membership Status
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-sm font-black px-3 py-1 rounded-xl border ${visuals.badge} flex items-center gap-1.5`}
                            >
                              <span>{visuals.icon}</span>
                              {activeCustomer.currentTier?.tier} Tier Member
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Loyalty Points
                          </span>
                          <span className="text-2xl font-black text-warning">
                            {activeCustomer.loyaltyPoints?.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1 font-bold">pts</span>
                        </div>
                      </div>

                      {/* Tier Progress Bar */}
                      {activeCustomer.nextTier ? (
                        <div className="space-y-1.5 pt-2 border-t border-border/60">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">
                              Next Tier: <strong>{activeCustomer.nextTier.tier}</strong> ({activeCustomer.nextTier.min} pts)
                            </span>
                            <span className="text-primary font-bold">
                              {activeCustomer.pointsToNext} pts to upgrade
                            </span>
                          </div>
                          <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${visuals.fillBar} transition-all duration-300`}
                              style={{ width: `${activeCustomer.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
                          <Sparkles className="size-4" />
                          Top VIP Champion unlocked! All exclusive tier benefits active.
                        </div>
                      )}

                      {/* Active Tier Perks */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Unlocked Privileges & Perks:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeCustomer.currentTier?.perks?.map((perk: string, pIdx: number) => (
                            <div key={pIdx} className="text-xs text-foreground/90 flex items-center gap-2 font-medium">
                              <CheckCircle2 className="size-3.5 text-success shrink-0" />
                              <span className="truncate">{perk}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Lifetime Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/60">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <ShoppingBag className="size-3 text-primary" /> Total Spent
                    </div>
                    <div className="text-sm sm:text-base font-black text-foreground mt-1">
                      {formatAppCurrency(activeCustomer.totalSpent)}
                    </div>
                  </div>
                  <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/60">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Clock className="size-3 text-info" /> Store Visits
                    </div>
                    <div className="text-sm sm:text-base font-black text-foreground mt-1">
                      {activeCustomer.visits || 0}
                    </div>
                  </div>
                  <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/60">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Wallet className="size-3 text-success" /> Redeem Value
                    </div>
                    <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatAppCurrency((activeCustomer.loyaltyPoints / 100) * activeRules.redemptionRate)}
                    </div>
                  </div>
                </div>

                {/* Tabs: Adjust Points vs Edit Customer Profile & Points */}
                <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <Tabs value={drawerActiveTab} onValueChange={(val: any) => setDrawerActiveTab(val)} className="space-y-4">
                    <TabsList className="grid grid-cols-2 w-full rounded-xl">
                      <TabsTrigger value="adjust" className="text-xs font-bold rounded-lg flex items-center gap-1.5">
                        <Coins className="size-3.5 text-warning" />
                        Adjust Points (+ / -)
                      </TabsTrigger>
                      <TabsTrigger value="edit" className="text-xs font-bold rounded-lg flex items-center gap-1.5">
                        <Edit className="size-3.5 text-primary" />
                        Edit Member & Points
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB A: Quick Relative Adjust Points */}
                    <TabsContent value="adjust" className="space-y-4 pt-1">
                      <form onSubmit={handleConfirmAdjust} className="space-y-4">
                        {/* Credit or Debit Selection */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <Button
                            type="button"
                            variant={adjustType === "add" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAdjustType("add")}
                            className={`rounded-xl font-bold ${
                              adjustType === "add"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                                : ""
                            }`}
                          >
                            <ArrowUpRight className="size-4 mr-1.5" />
                            Credit (Add Points)
                          </Button>
                          <Button
                            type="button"
                            variant={adjustType === "deduct" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAdjustType("deduct")}
                            className={`rounded-xl font-bold ${
                              adjustType === "deduct"
                                ? "bg-destructive text-white hover:bg-destructive/90 shadow-md shadow-destructive/20"
                                : ""
                            }`}
                          >
                            <ArrowDownRight className="size-4 mr-1.5" />
                            Debit (Deduct Points)
                          </Button>
                        </div>

                        {/* Quick Amount Chips */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold">Points Amount</Label>
                            <div className="flex gap-1">
                              {[50, 100, 250, 500].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setAdjustAmount(amt.toString())}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/15 hover:text-primary transition-colors"
                                >
                                  +{amt}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            placeholder="e.g. 100"
                            className="rounded-xl"
                            required
                          />
                        </div>

                        {/* Reason Select */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Reason for Adjustment</Label>
                          <Select value={adjustReason} onValueChange={setAdjustReason}>
                            <SelectTrigger className="h-9 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Promotion / Bonus Reward">Promotion / Bonus Reward</SelectItem>
                              <SelectItem value="Goodwill Gesture / Customer Satisfaction">Goodwill Gesture / Customer Satisfaction</SelectItem>
                              <SelectItem value="Birthday / Anniversary Gift">Birthday / Anniversary Gift</SelectItem>
                              <SelectItem value="Return / Refund Points Deduction">Return / Refund Points Deduction</SelectItem>
                              <SelectItem value="Manual Balance Correction">Manual Balance Correction</SelectItem>
                              <SelectItem value="Other (Custom)">Other (Custom Reason)</SelectItem>
                            </SelectContent>
                          </Select>
                          {adjustReason === "Other (Custom)" && (
                            <Input
                              placeholder="Enter custom reason note..."
                              value={adjustCustomReason}
                              onChange={(e) => setAdjustCustomReason(e.target.value)}
                              className="mt-2 text-xs rounded-xl"
                              required
                            />
                          )}
                        </div>

                        {/* Resulting Balance Projection */}
                        {(() => {
                          const qty = parseInt(adjustAmount, 10) || 0;
                          const currentPts = activeCustomer.loyaltyPoints || 0;
                          const projected = adjustType === "add" ? currentPts + qty : Math.max(0, currentPts - qty);
                          const projectedTier = getCustomerTier(projected, activeTiers);
                          const projVisuals = getTierVisuals(projectedTier.currentTier.tier, projectedTier.currentTier.color);

                          return (
                            <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/80 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">New Point Balance Preview:</span>
                              <div className="text-right">
                                <span className="font-black text-foreground text-sm mr-2">
                                  {projected.toLocaleString()} pts
                                </span>
                                <Badge variant="outline" className={`text-[10px] font-bold ${projVisuals.badge}`}>
                                  {projVisuals.icon} {projectedTier.currentTier.tier} Tier
                                </Badge>
                              </div>
                            </div>
                          );
                        })()}

                        <Button
                          type="submit"
                          disabled={updateCustomerMutation.isPending}
                          className="w-full bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          {updateCustomerMutation.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          Confirm Point Adjustment
                        </Button>
                      </form>
                    </TabsContent>

                    {/* TAB B: Full Edit Member Details & Exact Point Balance */}
                    <TabsContent value="edit" className="space-y-4 pt-1">
                      <form onSubmit={handleConfirmDirectEdit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Customer Full Name *</Label>
                          <Input
                            value={editCustomerName}
                            onChange={(e) => setEditCustomerName(e.target.value)}
                            placeholder="e.g. Customer Name"
                            className="rounded-xl text-xs"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Mobile Phone</Label>
                            <Input
                              value={editCustomerPhone}
                              onChange={(e) => setEditCustomerPhone(e.target.value)}
                              placeholder="e.g. +91 98765 43210"
                              className="rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Email Address</Label>
                            <Input
                              type="email"
                              value={editCustomerEmail}
                              onChange={(e) => setEditCustomerEmail(e.target.value)}
                              placeholder="e.g. customer@example.com"
                              className="rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5 sm:col-span-1">
                            <Label className="text-xs font-bold">Exact Points Balance</Label>
                            <Input
                              type="number"
                              min="0"
                              value={editCustomerPoints}
                              onChange={(e) => setEditCustomerPoints(e.target.value)}
                              placeholder="0"
                              className="rounded-xl text-xs font-black text-warning"
                              required
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-1">
                            <Label className="text-xs font-bold">Customer Status</Label>
                            <Select value={editCustomerStatus} onValueChange={setEditCustomerStatus}>
                              <SelectTrigger className="h-9 text-xs rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active Regular</SelectItem>
                                <SelectItem value="vip">★ VIP Customer</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5 sm:col-span-1">
                            <Label className="text-xs font-bold">Account Type</Label>
                            <Select value={editCustomerType} onValueChange={setEditCustomerType}>
                              <SelectTrigger className="h-9 text-xs rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="Wholesale">Wholesale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Resulting Tier Preview from Direct Edit */}
                        {(() => {
                          const pts = parseInt(editCustomerPoints, 10) || 0;
                          const calculatedTier = getCustomerTier(pts, activeTiers);
                          const calcVisuals = getTierVisuals(calculatedTier.currentTier.tier, calculatedTier.currentTier.color);
                          return (
                            <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">Calculated Tier from Points:</span>
                              <Badge variant="outline" className={`text-[10px] font-bold ${calcVisuals.badge}`}>
                                {calcVisuals.icon} {calculatedTier.currentTier.tier} Tier
                              </Badge>
                            </div>
                          );
                        })()}

                        <Button
                          type="submit"
                          disabled={updateCustomerMutation.isPending}
                          className="w-full bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          {updateCustomerMutation.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          Save Customer Profile & Points
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Drawer Footer */}
              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setIsCustomerDrawerOpen(false)}
                >
                  Close Drawer
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* DRAWER 2: Configure Loyalty Program & Tiers Side Drawer */}
      <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl overflow-hidden"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-gradient-to-r from-primary/10 via-background to-amber-500/10 p-6 border-b border-border/80 pr-12 text-left shrink-0">
              <SheetTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 text-foreground">
                <SlidersHorizontal className="size-5 text-primary" />
                Configure Loyalty Program & Tiers
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Customize tier thresholds, member benefits, earning rate per purchase, and conversion discount values.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="tiers" className="space-y-5">
                <TabsList className="grid grid-cols-2 w-72 rounded-xl">
                  <TabsTrigger value="tiers" className="text-xs font-bold rounded-lg">Loyalty Tiers</TabsTrigger>
                  <TabsTrigger value="rules" className="text-xs font-bold rounded-lg">Earning & Rules</TabsTrigger>
                </TabsList>

                {/* TAB 1: Loyalty Tiers */}
                <TabsContent value="tiers" className="space-y-4 pt-2">
                  {editTiers.map((tier, i) => (
                    <div key={i} className="border border-border/80 rounded-2xl p-4 sm:p-5 bg-muted/20 relative space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" />
                          Tier #{i + 1}: {tier.tier}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs rounded-lg"
                          onClick={() => removeEditTier(i)}
                        >
                          <Trash2 className="size-3.5 mr-1" /> Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Tier Name</Label>
                          <Input
                            value={tier.tier}
                            onChange={(e) => updateEditTier(i, "tier", e.target.value)}
                            placeholder="e.g. Gold"
                            className="h-8 text-xs rounded-lg"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Min Points Threshold</Label>
                          <Input
                            type="number"
                            min="0"
                            value={tier.min}
                            onChange={(e) => updateEditTier(i, "min", parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs rounded-lg"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Color Theme</Label>
                          <Select
                            value={tier.color}
                            onValueChange={(val) => updateEditTier(i, "color", val)}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg">
                              <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bg-amber-700">Bronze (Brown)</SelectItem>
                              <SelectItem value="bg-slate-400">Silver (Slate)</SelectItem>
                              <SelectItem value="bg-amber-500">Gold (Amber)</SelectItem>
                              <SelectItem value="bg-indigo-600">Platinum (Indigo)</SelectItem>
                              <SelectItem value="bg-primary">Primary (Brand)</SelectItem>
                              <SelectItem value="bg-success">Emerald (Green)</SelectItem>
                              <SelectItem value="bg-destructive">Ruby (Red)</SelectItem>
                              <SelectItem value="bg-purple-500">Amethyst (Purple)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Tier Perks */}
                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                          Privileges & Perks
                        </Label>
                        <div className="space-y-2">
                          {tier.perks.map((perk, pIndex) => (
                            <div key={pIndex} className="flex gap-2 items-center">
                              <Input
                                value={perk}
                                onChange={(e) => updatePerk(i, pIndex, e.target.value)}
                                placeholder={`e.g. 1.5x points, Free express delivery`}
                                className="h-8 text-xs rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => removePerk(i, pIndex)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs w-full border-dashed rounded-lg"
                            onClick={() => addPerk(i)}
                          >
                            <Plus className="size-3 mr-1" /> Add Perk
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed py-6 text-xs font-bold gap-2 rounded-2xl"
                    onClick={addEditTier}
                  >
                    <Plus className="size-4" />
                    Add New Tier
                  </Button>
                </TabsContent>

                {/* TAB 2: Program Rules & Earning */}
                <TabsContent value="rules" className="space-y-4 pt-2">
                  <div className="border border-border/80 rounded-2xl p-5 bg-muted/20 space-y-4 shadow-sm">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="size-4 text-warning" />
                      Point Earning & Redemption Conversion Rules
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          Spend to Earn 1 Point ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={editRules.earnRate}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              earnRate: Math.max(1, parseFloat(e.target.value) || 1),
                            })
                          }
                          className="h-9 text-xs rounded-lg"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Customer earns 1 loyalty point for every {currencySymbol}{editRules.earnRate} spent.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          Value per 100 Points ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={editRules.redemptionRate}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              redemptionRate: Math.max(0.1, parseFloat(e.target.value) || 1),
                            })
                          }
                          className="h-9 text-xs rounded-lg"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          100 points can be redeemed for a {currencySymbol}{editRules.redemptionRate} discount.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          Minimum Points Required to Redeem
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={editRules.minRedeemPoints}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              minRedeemPoints: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="h-9 text-xs rounded-lg"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Minimum point threshold before customer can redeem on checkout.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          Welcome Bonus Points (New Customer)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={editRules.welcomeBonusPoints}
                          onChange={(e) =>
                            setEditRules({
                              ...editRules,
                              welcomeBonusPoints: Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="h-9 text-xs rounded-lg"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Awarded immediately upon customer account creation.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsConfigOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveConfig}
                disabled={updateSettingsMutation.isPending}
                className="bg-primary text-primary-foreground font-bold rounded-xl shadow-md"
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Save Program Settings
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
