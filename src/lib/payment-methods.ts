export type PaymentMethodType = "cash" | "card" | "digital" | "credit" | "other";

export interface PaymentMethodConfig {
  id: string;
  label: string;
  icon?: string;
  enabled: boolean;
  isDefault?: boolean;
  type?: PaymentMethodType;
  notes?: string;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "cash",
    label: "Cash",
    icon: "banknote",
    enabled: true,
    isDefault: true,
    type: "cash",
  },
  {
    id: "card",
    label: "Card",
    icon: "credit-card",
    enabled: true,
    isDefault: true,
    type: "card",
  },
  {
    id: "upi",
    label: "UPI / QR",
    icon: "smartphone",
    enabled: true,
    isDefault: true,
    type: "digital",
  },
  {
    id: "split",
    label: "Split",
    icon: "users",
    enabled: true,
    isDefault: true,
    type: "other",
  },
  {
    id: "credit",
    label: "Credit",
    icon: "receipt",
    enabled: true,
    isDefault: true,
    type: "credit",
  },
];

export const PAYMENT_METHOD_ICONS = [
  { id: "banknote", label: "Banknote / Cash" },
  { id: "credit-card", label: "Credit / Debit Card" },
  { id: "smartphone", label: "Mobile Wallet / Phone" },
  { id: "landmark", label: "Bank / Wire Transfer" },
  { id: "wallet", label: "Digital Wallet" },
  { id: "qr-code", label: "QR Code Scan" },
  { id: "receipt", label: "Receipt / Khata" },
  { id: "coins", label: "Coins / Tokens" },
  { id: "users", label: "Split / Multiple" },
];
