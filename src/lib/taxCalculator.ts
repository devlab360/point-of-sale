export interface TaxCalculationParams {
  price: number;
  quantity: number;
  discountAmt?: number; // Total discount amount for this line item
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  taxInclusive: boolean;
  storeStateCode?: string;
  customerStateCode?: string;
  taxType?: "gst" | "vat" | "flat"; // defaults to "gst"
  cgstRate?: number; // optional explicit CGST split percentage
  sgstRate?: number; // optional explicit SGST split percentage
  igstRate?: number; // optional explicit IGST split percentage (inter-state)
}

export interface TaxCalculationResult {
  taxableValue: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  totalTaxAmt: number;
  totalAmount: number; // Includes tax
}

export function calculateItemTax(params: TaxCalculationParams): TaxCalculationResult {
  const {
    price,
    quantity,
    discountAmt = 0,
    gstRate,
    taxInclusive,
    storeStateCode,
    customerStateCode,
    taxType = "gst",
    cgstRate,
    sgstRate,
    igstRate,
  } = params;

  // 1. Calculate Gross Total (before discount and tax)
  const grossTotal = price * quantity;

  // 2. Net amount before any tax extraction (after discount)
  // Ensure we don't go below 0
  const netAmount = Math.max(0, grossTotal - discountAmt);

  let taxableValue = netAmount;
  let totalTaxAmt = 0;

  if (gstRate > 0) {
    if (taxInclusive) {
      // Formula: Taxable Value = Net Amount / (1 + (GST% / 100))
      taxableValue = netAmount / (1 + gstRate / 100);
      totalTaxAmt = netAmount - taxableValue;
    } else {
      // Formula: Tax = Taxable Value * (GST% / 100)
      totalTaxAmt = taxableValue * (gstRate / 100);
    }
  }

  // 3. Determine Tax Split (CGST/SGST vs IGST)
  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;

  // Rule: If customer state is empty/unknown, assume Intra-State (CGST + SGST)
  // If store state is not set, we can't reliably do IGST, so default to Intra-State
  const isInterState = storeStateCode && customerStateCode && storeStateCode !== customerStateCode;

  if (taxType === "vat" || taxType === "flat") {
    // Flat / VAT-style tax: charge a single rate, no CGST/SGST/IGST split
    cgstAmt = 0;
    sgstAmt = 0;
    igstAmt = 0;
  } else if (isInterState) {
    // Inter-state: IGST only. Use explicit igst rate if provided, else the full rate.
    if (igstRate !== undefined && igstRate > 0) {
      igstAmt = taxableValue * (igstRate / 100);
    } else {
      igstAmt = totalTaxAmt;
    }
  } else {
    // Intra-state: CGST + SGST. Use explicit split rates if provided, else split evenly.
    if (cgstRate !== undefined && sgstRate !== undefined && cgstRate + sgstRate > 0) {
      cgstAmt = taxableValue * (cgstRate / 100);
      sgstAmt = taxableValue * (sgstRate / 100);
    } else {
      cgstAmt = totalTaxAmt / 2;
      sgstAmt = totalTaxAmt / 2;
    }
  }

  return {
    taxableValue: Number(taxableValue.toFixed(4)), // Keep precision high for intermediate math, round for UI later
    cgstAmt: Number(cgstAmt.toFixed(4)),
    sgstAmt: Number(sgstAmt.toFixed(4)),
    igstAmt: Number(igstAmt.toFixed(4)),
    totalTaxAmt: Number(totalTaxAmt.toFixed(4)),
    totalAmount: Number((taxableValue + totalTaxAmt).toFixed(4)),
  };
}
