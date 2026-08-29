import { OptionItem } from "./common";

export const PAYMENT_METHOD_OPTIONS: OptionItem[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Debit / Credit Card" },
  { value: "upi", label: "UPI / QR Code" },
  { value: "bank_transfer", label: "Bank Transfer (NEFT/IMPS/Wire)" },
  { value: "cheque", label: "Cheque" },
  { value: "credit", label: "Khata (Store Credit / Due)" },
  { value: "gift_card", label: "Gift Card" },
  { value: "loyalty_points", label: "Loyalty Points" },
  { value: "split", label: "Split Tender" },
];

export const TAX_RATE_OPTIONS: OptionItem<number>[] = [
  { value: 0, label: "0% (Exempt / Nil Rated)" },
  { value: 5, label: "5% (Standard Low)" },
  { value: 12, label: "12% (Standard Medium)" },
  { value: 18, label: "18% (Standard High)" },
  { value: 28, label: "28% (Luxury / Surcharge)" },
];

export const EXPENSE_CATEGORIES: OptionItem[] = [
  { value: "rent", label: "Rent & Lease" },
  { value: "utilities", label: "Electricity, Water & Utilities" },
  { value: "salaries", label: "Staff Salaries & Wages" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "inventory", label: "Inventory & Raw Materials" },
  { value: "maintenance", label: "Equipment Repair & Maintenance" },
  { value: "transport", label: "Logistics, Delivery & Fuel" },
  { value: "software", label: "Software & IT Subscriptions" },
  { value: "taxes", label: "Taxes, GST & Government Fees" },
  { value: "packaging", label: "Packaging & Bags" },
  { value: "miscellaneous", label: "Miscellaneous / Other Overhead" },
];

export const ACCOUNT_TYPES: OptionItem[] = [
  { value: "asset", label: "Asset (Cash, Receivables, Stock, Fixed Assets)" },
  { value: "liability", label: "Liability (Payables, Loans, Taxes Due)" },
  { value: "equity", label: "Owner's Equity & Capital" },
  { value: "income", label: "Operating Revenue & Sales Income" },
  { value: "expense", label: "Operating & Overhead Expenses" },
];

export const VOUCHER_TYPES: OptionItem[] = [
  { value: "payment", label: "Payment Voucher (Cash/Bank Outflow)" },
  { value: "receipt", label: "Receipt Voucher (Cash/Bank Inflow)" },
  { value: "journal", label: "Journal Voucher (General Debit/Credit)" },
  { value: "contra", label: "Contra Voucher (Bank/Cash Transfer)" },
];

export const REFUND_METHODS: OptionItem[] = [
  { value: "cash", label: "Cash / Original Payment Method" },
  { value: "wallet", label: "Store Wallet Credit" },
  { value: "bank_transfer", label: "Bank Transfer" },
];
