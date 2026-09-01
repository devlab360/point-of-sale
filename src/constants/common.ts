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
  {
    value: "suspended",
    label: "Suspended",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
  },
  {
    value: "archived",
    label: "Archived",
    badge: "bg-muted/60 text-muted-foreground border-border",
  },
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
  { value: "dd MMM yyyy", label: "01 Jan 2026 (dd MMM yyyy)" },
  { value: "dd-MM-yyyy", label: "01-01-2026 (dd-MM-yyyy)" },
  { value: "dd/MM/yyyy", label: "01/01/2026 (dd/MM/yyyy)" },
  { value: "MM/dd/yyyy", label: "01/01/2026 (MM/dd/yyyy)" },
  { value: "yyyy-MM-dd", label: "2026-01-01 (yyyy-MM-dd - ISO)" },
  { value: "MMM dd, yyyy", label: "Jan 01, 2026 (MMM dd, yyyy)" },
];

export const TIME_FORMAT_OPTIONS: OptionItem[] = [
  { value: "12h", label: "12-Hour (hh:mm a - e.g. 02:30 PM)" },
  { value: "24h", label: "24-Hour (HH:mm - e.g. 14:30)" },
];

export const TIME_ZONE_OPTIONS: OptionItem[] = [
  { value: "UTC", label: "UTC (Coordinated Universal Time +0:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (India IST +5:30)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (Bangladesh BST +6:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UAE GST +4:00)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (Saudi Arabia AST +3:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (Singapore SGT +8:00)" },
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu (Nepal NPT +5:45)" },
  { value: "Asia/Colombo", label: "Asia/Colombo (Sri Lanka IST +5:30)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (Thailand ICT +7:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (Japan JST +9:00)" },
  { value: "America/New_York", label: "America/New_York (Eastern Time EST/EDT -5:00)" },
  { value: "America/Chicago", label: "America/Chicago (Central Time CST/CDT -6:00)" },
  { value: "America/Denver", label: "America/Denver (Mountain Time MST/MDT -7:00)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific Time PST/PDT -8:00)" },
  { value: "America/Toronto", label: "America/Toronto (Canada Eastern -5:00)" },
  { value: "Europe/London", label: "Europe/London (UK GMT/BST +0:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (Central Europe CET/CEST +1:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (Germany CET/CEST +1:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT +10:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (New Zealand NZST +12:00)" },
];
