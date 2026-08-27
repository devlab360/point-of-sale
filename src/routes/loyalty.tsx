import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Star, Users, TrendingUp, Award, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomersFn } from "@/api/customers";
import { getSettingsFn, updateSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAppFormatter } from "@/hooks/useAppFormatter";
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

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty Program — OneDesk360" }] }),
  component: LoyaltyPage,
});

const getDefaultTiers = (currencySymbol: string) => [
  {
    tier: "Bronze",
    min: 0,
    perks: [`1 pt per ${currencySymbol}1`, "Birthday treat"],
    color: "bg-amber-700",
  },
  {
    tier: "Silver",
    min: 500,
    perks: [`1.5 pts per ${currencySymbol}1`, "Free delivery"],
    color: "bg-slate-400",
  },
  {
    tier: "Gold",
    min: 1500,
    perks: [`2 pts per ${currencySymbol}1`, "Exclusive offers", "Early access"],
    color: "bg-warning",
  },
  {
    tier: "Platinum",
    min: 5000,
    perks: [`3 pts per ${currencySymbol}1`, "Personal concierge", "Free shipping"],
    color: "bg-info",
  },
];

function LoyaltyPage() {
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const { formatAppCurrency } = useAppFormatter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => (await getSettingsFn({ data: {} })).data || {},
  });

  const rawCustomers = customersData || [];
  const customers = rawCustomers.map((c: any) => ({
    ...c,
    loyaltyPoints: c.loyaltyPoints || 0,
    totalSpent: parseFloat(c.totalSpent) || 0,
    visits: c.visits || 0,
  }));

  const currencySymbol = settingsData?.currencySymbol || "₹";

  const activeTiers =
    settingsData?.loyaltyTiers &&
    Array.isArray(settingsData.loyaltyTiers) &&
    settingsData.loyaltyTiers.length > 0
      ? settingsData.loyaltyTiers
      : getDefaultTiers(currencySymbol);

  const totalMembers = customers.length;
  const totalPoints = customers.reduce((acc, c) => acc + c.loyaltyPoints, 0);
  const avgLtv = totalMembers
    ? customers.reduce((acc, c) => acc + c.totalSpent, 0) / totalMembers
    : 0;
  const vipCount = customers.filter((c) => c.status === "vip").length;

  const top = [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 5);

  const [editTiers, setEditTiers] = useState<any[]>([]);

  useEffect(() => {
    if (isConfigOpen) {
      setEditTiers(JSON.parse(JSON.stringify(activeTiers)));
    }
  }, [isConfigOpen, activeTiers]);

  const updateMutation = useMutation({
    mutationFn: async (newTiers: any[]) => {
      return updateSettingsFn({ data: { settings: { loyaltyTiers: newTiers } } });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Loyalty tiers updated successfully");
        queryClient.invalidateQueries({ queryKey: ["settings", orgId] });
        setIsConfigOpen(false);
      } else {
        toast.error(res.error || "Failed to update tiers");
      }
    },
    onError: () => {
      toast.error("An error occurred");
    },
  });

  const handleSaveTiers = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(editTiers);
  };

  const updateEditTier = (index: number, field: string, value: any) => {
    const newTiers = [...editTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setEditTiers(newTiers);
  };

  const removeEditTier = (index: number) => {
    const newTiers = [...editTiers];
    newTiers.splice(index, 1);
    setEditTiers(newTiers);
  };

  const addEditTier = () => {
    setEditTiers([...editTiers, { tier: "New Tier", min: 0, perks: [""], color: "bg-primary" }]);
  };

  const updatePerk = (tierIndex: number, perkIndex: number, value: string) => {
    const newTiers = [...editTiers];
    const newPerks = [...newTiers[tierIndex].perks];
    newPerks[perkIndex] = value;
    newTiers[tierIndex] = { ...newTiers[tierIndex], perks: newPerks };
    setEditTiers(newTiers);
  };

  const addPerk = (tierIndex: number) => {
    const newTiers = [...editTiers];
    newTiers[tierIndex] = { ...newTiers[tierIndex], perks: [...newTiers[tierIndex].perks, ""] };
    setEditTiers(newTiers);
  };

  const removePerk = (tierIndex: number, perkIndex: number) => {
    const newTiers = [...editTiers];
    const newPerks = [...newTiers[tierIndex].perks];
    newPerks.splice(perkIndex, 1);
    newTiers[tierIndex] = { ...newTiers[tierIndex], perks: newPerks };
    setEditTiers(newTiers);
  };

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Loyalty Program"
        description="Reward repeat customers and grow basket size."
        actions={
          <Button size="sm" onClick={() => setIsConfigOpen(true)}>
            Configure Tiers
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={totalMembers.toString()} icon={Users} accent="primary" />
        <StatCard
          label="Points Issued"
          value={totalPoints.toLocaleString()}
          icon={Star}
          accent="warning"
        />
        <StatCard
          label="Avg LTV"
          value={formatAppCurrency(avgLtv)}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard label="VIP Customers" value={vipCount.toString()} icon={Award} accent="info" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">Active Loyalty Tiers & Benefits</h2>
            <span className="text-xs text-muted-foreground font-medium">
              {activeTiers.length} Tiers Configured
            </span>
          </div>
          <div className="space-y-3">
            {activeTiers.map((t: any) => (
              <div
                key={t.tier}
                className="flex items-center gap-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors p-3.5 card-interactive"
              >
                <div
                  className={`size-11 rounded-xl ${t.color}/20 grid place-items-center text-xl border border-primary/20 shrink-0`}
                >
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-foreground">{t.tier} Tier</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                    {t.perks.filter((p: string) => p.trim() !== "").join(" • ")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="number text-sm font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                    {t.min}+ pts
                  </span>
                </div>
              </div>
            ))}
            {activeTiers.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground border rounded-xl border-dashed border-border/80">
                No loyalty tiers configured yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-base font-bold text-foreground">Top Loyalty Members</h2>
          {top.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No customers enrolled yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {top.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={`grid size-6 place-items-center rounded-lg text-xs font-black shrink-0 ${
                      i === 0
                        ? "bg-amber-500/20 text-amber-500 font-black"
                        : i === 1
                          ? "bg-slate-400/20 text-slate-400 font-black"
                          : i === 2
                            ? "bg-amber-700/20 text-amber-700 font-black"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-black text-primary border border-primary/20 shrink-0">
                    {c.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="number text-xs font-black text-warning block">
                      {c.loyaltyPoints?.toLocaleString()} pts
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configure Loyalty Tiers</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 mt-4">
            {editTiers.map((tier, i) => (
              <div key={i} className="border rounded-xl p-4 bg-muted/20 relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tier Name</Label>
                    <Input
                      value={tier.tier}
                      onChange={(e) => updateEditTier(i, "tier", e.target.value)}
                      placeholder="e.g. Gold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min Points Required</Label>
                    <Input
                      type="number"
                      value={tier.min}
                      onChange={(e) => updateEditTier(i, "min", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color Theme</Label>
                    <Select
                      value={tier.color}
                      onValueChange={(val) => updateEditTier(i, "color", val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bg-amber-700">Bronze</SelectItem>
                        <SelectItem value="bg-slate-400">Silver</SelectItem>
                        <SelectItem value="bg-warning">Gold</SelectItem>
                        <SelectItem value="bg-info">Platinum / Blue</SelectItem>
                        <SelectItem value="bg-primary">Primary</SelectItem>
                        <SelectItem value="bg-success">Emerald / Green</SelectItem>
                        <SelectItem value="bg-destructive">Ruby / Red</SelectItem>
                        <SelectItem value="bg-purple-500">Amethyst / Purple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">
                    Tier Perks / Benefits
                  </Label>
                  <div className="space-y-2">
                    {tier.perks.map((perk: string, pIndex: number) => (
                      <div key={pIndex} className="flex gap-2 items-center">
                        <Input
                          value={perk}
                          onChange={(e) => updatePerk(i, pIndex, e.target.value)}
                          placeholder={`e.g. 1 point per ${currencySymbol}1 spent`}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removePerk(i, pIndex)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs w-full border-dashed"
                      onClick={() => addPerk(i)}
                    >
                      <Plus className="size-3 mr-1" /> Add Perk
                    </Button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeEditTier(i)}
                  >
                    <Trash2 className="size-4 mr-2" /> Remove Tier
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full border-dashed py-8" onClick={addEditTier}>
              <Plus className="size-4 mr-2" />
              Add New Tier
            </Button>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTiers} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Tiers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
