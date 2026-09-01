import { OptionItem } from "./common";

export const CUSTOMER_TYPES: OptionItem[] = [
  {
    value: "retail",
    label: "Retail / Individual",
    description: "Regular retail walk-in and individual consumer.",
  },
  {
    value: "wholesale",
    label: "Wholesale / B2B",
    description: "Bulk purchaser, wholesale distributor, trade pricing.",
  },
  {
    value: "dealer",
    label: "Dealer / Partner",
    description: "Authorized dealer, franchisee, commission partner.",
  },
  {
    value: "corporate",
    label: "Corporate Client",
    description: "Enterprise account, purchase orders, credit term invoicing.",
  },
  {
    value: "vip",
    label: "VIP / Elite",
    description: "High-value customer, priority discounts, loyalty multipliers.",
  },
];

export const CUSTOMER_STATUSES: OptionItem[] = [
  { value: "active", label: "Active", badge: "bg-success/15 text-success border-success/30" },
  { value: "inactive", label: "Inactive", badge: "bg-muted text-muted-foreground border-border" },
  {
    value: "blocked",
    label: "Blocked / Blacklisted",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
  },
];

export const LOYALTY_TIERS = [
  {
    id: "bronze",
    name: "Bronze",
    minPoints: 0,
    multiplier: 1.0,
    color: "text-amber-700 bg-amber-500/10 border-amber-700/30",
  },
  {
    id: "silver",
    name: "Silver",
    minPoints: 500,
    multiplier: 1.25,
    color: "text-slate-600 bg-slate-400/10 border-slate-500/30",
  },
  {
    id: "gold",
    name: "Gold",
    minPoints: 2000,
    multiplier: 1.5,
    color: "text-amber-500 bg-amber-400/15 border-amber-500/30",
  },
  {
    id: "platinum",
    name: "Platinum",
    minPoints: 5000,
    multiplier: 2.0,
    color: "text-cyan-500 bg-cyan-400/15 border-cyan-500/30",
  },
  {
    id: "diamond",
    name: "VIP Diamond",
    minPoints: 10000,
    multiplier: 2.5,
    color: "text-purple-500 bg-purple-400/15 border-purple-500/30",
  },
];
