export interface TaxSlabTemplate {
  name: string;
  rate: string;
  taxType: string;
  cgstRate?: string | null;
  sgstRate?: string | null;
  igstRate?: string | null;
  description?: string;
  isDefault?: boolean;
}

export const COUNTRY_TAX_TEMPLATES: Record<string, TaxSlabTemplate[]> = {
  // India (GST)
  IN: [
    {
      name: "Nil / Zero Rated (0%)",
      rate: "0",
      taxType: "gst",
      isDefault: true,
      description: "Exempt goods & services",
    },
    {
      name: "GST 5%",
      rate: "5",
      taxType: "gst",
      cgstRate: "2.50",
      sgstRate: "2.50",
      igstRate: "5",
      description: "Essential commodities",
    },
    {
      name: "GST 12%",
      rate: "12",
      taxType: "gst",
      cgstRate: "6",
      sgstRate: "6",
      igstRate: "12",
      description: "Standard goods",
    },
    {
      name: "GST 18%",
      rate: "18",
      taxType: "gst",
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "18",
      description: "Standard services & goods",
    },
    {
      name: "GST 28%",
      rate: "28",
      taxType: "gst",
      cgstRate: "14",
      sgstRate: "14",
      igstRate: "28",
      description: "Luxury & sin goods",
    },
  ],
  // United States (Sales Tax)
  US: [
    {
      name: "Tax Exempt (0%)",
      rate: "0",
      taxType: "exempt",
      isDefault: true,
      description: "Groceries & medical (State exempt)",
    },
    {
      name: "Standard State Tax (5%)",
      rate: "5",
      taxType: "sales_tax",
      isDefault: false,
      description: "Base state sales tax",
    },
    {
      name: "Standard Sales Tax (7.25%)",
      rate: "7.25",
      taxType: "sales_tax",
      isDefault: false,
      description: "California / state average",
    },
    {
      name: "Combined State + Local (8.875%)",
      rate: "8.875",
      taxType: "sales_tax",
      isDefault: false,
      description: "NYC / metropolitan rate",
    },
    {
      name: "High Metro Combined (10%)",
      rate: "10",
      taxType: "sales_tax",
      isDefault: false,
      description: "WA / IL high local sales tax",
    },
  ],
  // United Kingdom (VAT)
  GB: [
    {
      name: "Zero Rate VAT (0%)",
      rate: "0",
      taxType: "vat",
      isDefault: false,
      description: "Books, food, children's clothes",
    },
    {
      name: "Reduced Rate VAT (5%)",
      rate: "5",
      taxType: "vat",
      isDefault: false,
      description: "Domestic fuel & energy saving",
    },
    {
      name: "Standard VAT (20%)",
      rate: "20",
      taxType: "vat",
      isDefault: true,
      description: "Standard rate on most goods & services",
    },
  ],
  // UAE & Saudi Arabia (GCC VAT)
  AE: [
    {
      name: "Zero Rated (0%)",
      rate: "0",
      taxType: "vat",
      isDefault: false,
      description: "Exports, international transport, healthcare",
    },
    {
      name: "Standard UAE VAT (5%)",
      rate: "5",
      taxType: "vat",
      isDefault: true,
      description: "Standard rate across UAE",
    },
  ],
  SA: [
    {
      name: "Zero Rated (0%)",
      rate: "0",
      taxType: "vat",
      isDefault: false,
      description: "Exempt supplies & financial services",
    },
    {
      name: "Standard KSA VAT (15%)",
      rate: "15",
      taxType: "vat",
      isDefault: true,
      description: "Standard Saudi Arabia VAT",
    },
  ],
  // European Union (Standard VAT)
  EU: [
    {
      name: "EU Standard VAT (19%)",
      rate: "19",
      taxType: "vat",
      isDefault: true,
      description: "Germany / standard EU rate",
    },
    {
      name: "EU Standard VAT (21%)",
      rate: "21",
      taxType: "vat",
      isDefault: false,
      description: "Netherlands / Spain rate",
    },
    {
      name: "EU Reduced VAT (7%)",
      rate: "7",
      taxType: "vat",
      isDefault: false,
      description: "Reduced food & hospitality",
    },
  ],
  // Canada (GST / HST / PST)
  CA: [
    {
      name: "Federal GST (5%)",
      rate: "5",
      taxType: "sales_tax",
      isDefault: false,
      description: "Federal goods and services tax",
    },
    {
      name: "Ontario HST (13%)",
      rate: "13",
      taxType: "sales_tax",
      isDefault: true,
      description: "Harmonized sales tax",
    },
    {
      name: "BC GST + PST (12%)",
      rate: "12",
      taxType: "sales_tax",
      isDefault: false,
      description: "5% GST + 7% PST",
    },
  ],
  // Australia (GST)
  AU: [
    {
      name: "GST-Free (0%)",
      rate: "0",
      taxType: "gst",
      isDefault: false,
      description: "Fresh food, education & medical",
    },
    {
      name: "Standard GST (10%)",
      rate: "10",
      taxType: "gst",
      isDefault: true,
      description: "Standard Australian GST",
    },
  ],
  // Default Global Fallback
  DEFAULT: [
    {
      name: "Tax Exempt (0%)",
      rate: "0",
      taxType: "exempt",
      isDefault: true,
      description: "Zero tax / exempt items",
    },
    {
      name: "Standard Tax (5%)",
      rate: "5",
      taxType: "vat",
      isDefault: false,
      description: "Standard 5% tax",
    },
    {
      name: "Standard Tax (10%)",
      rate: "10",
      taxType: "vat",
      isDefault: false,
      description: "Standard 10% tax",
    },
    {
      name: "Standard Tax (15%)",
      rate: "15",
      taxType: "vat",
      isDefault: false,
      description: "Standard 15% tax",
    },
  ],
};
