export interface TaxCalculationParams {
  price: number;
  quantity: number;
  discountAmt?: number; // Total discount amount for this line item
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  taxInclusive: boolean;
  storeStateCode?: string;
  customerStateCode?: string;
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
  const isInterState =
    storeStateCode &&
    customerStateCode &&
    storeStateCode !== customerStateCode;

  if (isInterState) {
    igstAmt = totalTaxAmt;
  } else {
    cgstAmt = totalTaxAmt / 2;
    sgstAmt = totalTaxAmt / 2;
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
