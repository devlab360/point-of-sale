export interface OptionItem<T = string> {
  value: T;
  label: string;
  badge?: string;
  description?: string;
}

export const GENDER_OPTIONS: OptionItem[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const STATUS_OPTIONS: OptionItem[] = [
  { value: "active", label: "Active", badge: "bg-success/15 text-success border-success/30" },
  { value: "inactive", label: "Inactive", badge: "bg-muted text-muted-foreground border-border" },
  { value: "pending", label: "Pending", badge: "bg-warning/15 text-warning border-warning/30" },
  { value: "suspended", label: "Suspended", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "archived", label: "Archived", badge: "bg-muted/60 text-muted-foreground border-border" },
];

export const DISCOUNT_TYPES: OptionItem[] = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount (Currency)" },
];

export const DATE_PERIOD_OPTIONS: OptionItem[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
];

export const BILLING_CYCLE_OPTIONS: OptionItem[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export const NOTIFICATION_TYPE_OPTIONS: OptionItem[] = [
  { value: "unread", label: "Unread Only" },
  { value: "warning", label: "Low Stock & Warnings" },
  { value: "success", label: "Payments & Invoices" },
  { value: "info", label: "Customer Dues & Khata" },
  { value: "system", label: "System Announcements" },
];

export const AUDIT_EVENT_TYPES: OptionItem[] = [
  { value: "sale", label: "Sales & Invoicing" },
  { value: "inventory", label: "Inventory Adjustments" },
  { value: "gift-card", label: "Gift Cards & Vouchers" },
  { value: "deletion", label: "Deletions & Tombstones" },
  { value: "auth", label: "Authentication & Logins" },
  { value: "settings", label: "Store Configuration" },
];

export const DATE_FORMAT_OPTIONS: OptionItem[] = [
  { value: "dd MMM yyyy", label: "01 Jan 2024 (dd MMM yyyy)" },
  { value: "dd-MM-yyyy", label: "01-01-2024 (dd-MM-yyyy)" },
  { value: "MM/dd/yyyy", label: "01/01/2024 (MM/dd/yyyy)" },
  { value: "yyyy-MM-dd", label: "2024-01-01 (yyyy-MM-dd)" },
];

export const TIME_ZONE_OPTIONS: OptionItem[] = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (BST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];
