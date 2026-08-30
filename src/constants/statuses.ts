import { OptionItem } from "./common";

export const ORDER_STATUSES: OptionItem[] = [
  { value: "completed", label: "Completed", badge: "bg-success/15 text-success border-success/30" },
  { value: "pending", label: "Pending", badge: "bg-warning/15 text-warning border-warning/30" },
  { value: "draft", label: "Draft / Quotation", badge: "bg-muted text-muted-foreground border-border" },
  { value: "cancelled", label: "Cancelled", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "refunded", label: "Refunded / Returned", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
];

export const PAYMENT_STATUSES: OptionItem[] = [
  { value: "paid", label: "Fully Paid", badge: "bg-success/15 text-success border-success/30" },
  { value: "unpaid", label: "Unpaid / Credit", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "partial", label: "Partially Paid", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "overdue", label: "Overdue", badge: "bg-destructive/20 text-destructive border-destructive/40" },
  { value: "refunded", label: "Refunded", badge: "bg-muted text-muted-foreground border-border" },
];

export const REPAIR_STATUSES: OptionItem[] = [
  { value: "received", label: "Device Received", badge: "bg-info/15 text-info border-info/30" },
  { value: "diagnosing", label: "Under Diagnosis", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "in_progress", label: "Repair In Progress", badge: "bg-primary/15 text-primary border-primary/30" },
  { value: "waiting_parts", label: "Waiting for Spare Parts", badge: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  { value: "ready", label: "Ready for Pickup", badge: "bg-success/15 text-success border-success/30" },
  { value: "delivered", label: "Delivered & Closed", badge: "bg-emerald-600/15 text-emerald-600 border-emerald-600/30" },
  { value: "cancelled", label: "Cancelled / Returned Unfixed", badge: "bg-destructive/15 text-destructive border-destructive/30" },
];

export const RENTAL_STATUSES: OptionItem[] = [
  { value: "reserved", label: "Reserved / Booked", badge: "bg-info/15 text-info border-info/30" },
  { value: "active", label: "Active / Picked Up", badge: "bg-success/15 text-success border-success/30" },
  { value: "overdue", label: "Overdue Return", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "returned", label: "Returned & Inspected", badge: "bg-primary/15 text-primary border-primary/30" },
  { value: "cancelled", label: "Cancelled", badge: "bg-muted text-muted-foreground border-border" },
];

export const APPOINTMENT_STATUSES: OptionItem[] = [
  { value: "scheduled", label: "Scheduled (Upcoming)", badge: "bg-blue-500/15 text-blue-600 border-blue-500/25" },
  { value: "in-progress", label: "In Progress", badge: "bg-amber-500/15 text-amber-600 border-amber-500/25" },
  { value: "completed", label: "Completed", badge: "bg-success/15 text-success border-success/25" },
  { value: "cancelled", label: "Cancelled", badge: "bg-destructive/15 text-destructive border-destructive/25" },
];

export const SUBSCRIPTION_STATUSES: OptionItem[] = [
  { value: "active", label: "Active Plan", badge: "bg-success/15 text-success border-success/30" },
  { value: "trial", label: "Free Trial", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "expired", label: "Trial / Plan Expired", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "cancelled", label: "Cancelled", badge: "bg-muted text-muted-foreground border-border" },
  { value: "paused", label: "Paused", badge: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
];

export const TABLE_STATUSES: OptionItem[] = [
  { value: "available", label: "Available (Free)", badge: "bg-success/15 text-success border-success/30" },
  { value: "occupied", label: "Occupied (Dining)", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "reserved", label: "Reserved", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
];

export const RETURN_STATUSES: OptionItem[] = [
  { value: "approved", label: "Approved / Completed", badge: "bg-success/15 text-success border-success/30" },
  { value: "pending", label: "Pending Inspection", badge: "bg-warning/15 text-warning border-warning/30" },
  { value: "rejected", label: "Rejected", badge: "bg-destructive/15 text-destructive border-destructive/30" },
];

export const PURCHASE_STATUSES: OptionItem[] = [
  { value: "received", label: "Received (Full Inward)", badge: "bg-success/15 text-success border-success/30" },
  { value: "partial", label: "Partially Received", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "pending", label: "Pending Delivery", badge: "bg-warning/15 text-warning border-warning/30" },
  { value: "ordered", label: "PO Issued / Ordered", badge: "bg-info/15 text-info border-info/30" },
  { value: "cancelled", label: "Cancelled", badge: "bg-destructive/15 text-destructive border-destructive/30" },
];

export const QUOTATION_STATUSES: OptionItem[] = [
  { value: "draft", label: "Draft / Pending", badge: "bg-muted text-muted-foreground border-border" },
  { value: "sent", label: "Sent to Client", badge: "bg-info/15 text-info border-info/30" },
  { value: "converted", label: "Converted to Invoice", badge: "bg-success/15 text-success border-success/30" },
  { value: "expired", label: "Expired", badge: "bg-destructive/15 text-destructive border-destructive/30" },
];

export const CHALLAN_STATUSES: OptionItem[] = [
  { value: "draft", label: "Draft", badge: "bg-muted text-muted-foreground border-border" },
  { value: "dispatched", label: "Dispatched", badge: "bg-info/15 text-info border-info/30" },
  { value: "invoiced", label: "Invoiced", badge: "bg-success/15 text-success border-success/30" },
  { value: "delivered", label: "Delivered & Acknowledged", badge: "bg-emerald-600/15 text-emerald-600 border-emerald-600/30" },
  { value: "cancelled", label: "Cancelled", badge: "bg-destructive/15 text-destructive border-destructive/30" },
];

export const GIFT_CARD_STATUSES: OptionItem[] = [
  { value: "active", label: "Active", badge: "bg-success/15 text-success border-success/30" },
  { value: "expired", label: "Expired", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "used", label: "Used / Empty", badge: "bg-muted text-muted-foreground border-border" },
];

export const STOCK_STATUSES: OptionItem[] = [
  { value: "in-stock", label: "In Stock", badge: "bg-success/15 text-success border-success/30" },
  { value: "low", label: "Low Stock", badge: "bg-warning/15 text-warning border-warning/30" },
  { value: "out", label: "Out of Stock", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "expiring", label: "Expiring Soon", badge: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
];
