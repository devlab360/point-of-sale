import { OptionItem } from "./common";

export const BUSINESS_TYPE_OPTIONS: OptionItem[] = [
  { value: "UNIVERSAL", label: "Universal / General Retail", description: "All ERP & POS features enabled. Versatile for multi-category stores." },
  { value: "RETAIL", label: "Retail & Apparel", description: "Clothing, footwear, lifestyle, barcodes, variant sizes and colors." },
  { value: "GROCERY", label: "Supermarket & Grocery", description: "Fast barcode checkout, weighing scales, batch & expiry dates." },
  { value: "RESTAURANT", label: "Restaurant & Fine Dining", description: "Table reservations, dine-in ordering, Kitchen Order Tickets (KOT)." },
  { value: "CAFE", label: "Cafe & Quick Service", description: "Beverages, bakery items, takeaway billing, split checks." },
  { value: "SALON", label: "Salon & Spa", description: "Appointment scheduling, stylist assignments, service packages." },
  { value: "BARBER", label: "Barber Shop", description: "Walk-in queuing, barber services, tipping & commissions." },
  { value: "REPAIR_CENTER", label: "Electronics & Auto Repair", description: "Repair job cards, diagnostic logs, spare parts, technician jobs." },
  { value: "MOBILE_REPAIR", label: "Mobile Phone & Gadget Repair", description: "IMEI logging, repair tracking, warranty tags, pickup receipts." },
  { value: "WHOLESALE", label: "Wholesale & Distribution", description: "Bulk orders, quotation proposals, delivery challans, credit terms." },
  { value: "PHARMACY", label: "Pharmacy & Healthcare", description: "Drug batch numbers, expiry tracking, salt names, prescription notes." },
];

export const INDUSTRY_CATEGORIES = [
  "Retail & Trade",
  "Food & Beverage",
  "Personal Care & Wellness",
  "Repairs & Maintenance",
  "Wholesale & Logistics",
  "Healthcare & Pharma",
];
