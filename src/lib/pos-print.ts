/**
 * POS Print Utility — Popup Window Approach
 * Generates self-contained HTML and prints via a new browser window.
 * Does NOT depend on Tailwind CSS or React rendering.
 */

const fmt = (val: any): string => (Number(val) || 0).toFixed(2);

function esc(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parses bankDetails (JSON string or plain text) into formatted HTML */
function parseBankDetails(data: any, isThermal = false): string {
  if (!data) return "";
  const str = String(data).trim();
  if (str.startsWith("{")) {
    try {
      const b = JSON.parse(str);
      if (!b.bankName && !b.accountNo && !b.ifscCode && !b.holderName) return "";

      if (isThermal) {
        return `
          <div style="font-size:10px;line-height:1.4;margin-top:2px;">
            ${b.bankName ? `<div><strong>Bank:</strong> ${esc(b.bankName)}</div>` : ""}
            ${b.holderName ? `<div><strong>Name:</strong> ${esc(b.holderName)}</div>` : ""}
            ${b.accountNo ? `<div><strong>A/C No:</strong> ${esc(b.accountNo)}</div>` : ""}
            ${b.ifscCode ? `<div><strong>IFSC:</strong> ${esc(b.ifscCode)}</div>` : ""}
          </div>
        `;
      }

      return `
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:4px;">
          ${b.bankName ? `<tr><td style="color:#6b7280;padding:2px 8px 2px 0;width:80px;">Bank:</td><td style="font-weight:600;padding:2px 0;color:#111827;">${esc(b.bankName)}</td></tr>` : ""}
          ${b.holderName ? `<tr><td style="color:#6b7280;padding:2px 8px 2px 0;width:80px;">A/C Name:</td><td style="font-weight:600;padding:2px 0;color:#111827;">${esc(b.holderName)}</td></tr>` : ""}
          ${b.accountNo ? `<tr><td style="color:#6b7280;padding:2px 8px 2px 0;width:80px;">A/C No:</td><td style="font-weight:600;padding:2px 0;color:#111827;">${esc(b.accountNo)}</td></tr>` : ""}
          ${b.ifscCode ? `<tr><td style="color:#6b7280;padding:2px 8px 2px 0;width:80px;">IFSC Code:</td><td style="font-weight:600;padding:2px 0;color:#111827;">${esc(b.ifscCode)}</td></tr>` : ""}
        </table>
      `;
    } catch (_) {}
  }
  // Plain text fallback
  return `<div style="font-size:${isThermal ? "10px" : "12px"};white-space:pre-wrap;line-height:1.4;">${esc(str)}</div>`;
}

function openPrintPopup(html: string, width = 520) {
  const win = window.open(
    "",
    "_blank",
    `width=${width},height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no`
  );
  if (!win) {
    alert(
      "Pop-ups are blocked!\n\nPlease allow pop-ups for this site in your browser settings to enable printing."
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch (_) {}
  };

  try {
    win.onafterprint = () => {
      try {
        win.close();
      } catch (_) {}
    };
  } catch (_) {}

  // Fast trigger immediately after render
  if (win.document.readyState === "complete") {
    setTimeout(triggerPrint, 30);
  } else {
    win.onload = triggerPrint;
    setTimeout(triggerPrint, 60);
  }
}

/* ══════════════════════════════════════════════════════════════
   THERMAL RECEIPT (Exact 80mm width standard)
══════════════════════════════════════════════════════════════ */
export function printThermalReceipt(
  printData: any,
  settings: any,
  currencySymbol: string
) {
  if (!printData) return;

  const lines: any[] = Array.isArray(printData.lines) ? printData.lines : [];
  const sym = esc(currencySymbol);

  const invoiceLabel =
    printData.status === "quotation"
      ? "Quotation / Estimate"
      : settings?.enableGST ||
        printData.customerGstin ||
        printData.customerType === "wholesale" ||
        printData.customerType === "corporate"
      ? "Tax Invoice"
      : "Receipt";

  const paymentLabel =
    printData.payment === "split" && printData.splitPayments?.length
      ? (printData.splitPayments as any[]).map((p: any) => String(p.method).toUpperCase()).join(" + ")
      : String(printData.payment || "").toUpperCase();

  /* 3-Column Items (Item 55%, Qty 15%, Amount 30%) */
  const itemRows = lines.length
    ? lines
      .map(
        (l: any) => `
        <tr style="border-bottom:1px dotted #ccc;vertical-align:top;">
          <td style="padding:4px 2px 4px 0;width:55%;">
            <div style="font-weight:700;font-size:11px;line-height:1.2;">${esc(l.product?.name)}</div>
            ${l.variantName ? `<div style="font-size:9px;color:#555;">${esc(l.variantName)}</div>` : ""}
            ${l.selectedSerial ? `<div style="font-size:9px;color:#555;">SN: ${esc(l.selectedSerial)}</div>` : ""}
          </td>
          <td style="padding:4px 2px;text-align:center;font-weight:600;font-size:11px;width:15%;">
            ${Number(l.qty)}
          </td>
          <td style="padding:4px 0 4px 2px;text-align:right;font-weight:700;font-size:11px;width:30%;white-space:nowrap;">
            ${sym}${fmt(l.total)}
          </td>
        </tr>`
      )
      .join("")
    : `<tr><td colspan="3" style="padding:10px;text-align:center;color:#999;font-size:11px;">No items</td></tr>`;

  /* Split payment rows */
  const splitRows =
    printData.payment === "split" && printData.splitPayments?.length
      ? (printData.splitPayments as any[])
        .filter((p: any) => p.amount > 0)
        .map(
          (p: any) =>
            `<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:1px;">
                <span style="text-transform:uppercase;color:#555;">${esc(p.method)}</span>
                <span style="font-weight:700;">${sym}${fmt(p.amount)}</span>
              </div>`
        )
        .join("")
      : "";

  const bankDetailsHtml = parseBankDetails(printData.bankDetails, true);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(invoiceLabel)} – ${esc(printData.id)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    html, body{
      font-family:'Courier New',Courier,monospace;
      font-size:11px;
      background:#fff;
      color:#000;
      line-height:1.25;
      width:100%;
      margin:0;
      padding:0;
    }
    .receipt-container{
      width:80mm;
      max-width:80mm;
      margin:0 auto;
      padding:10px 8px 24px;
      box-sizing:border-box;
    }
    .divider{border:none;border-top:2px dashed #000;margin:6px 0;}
    .divider-thin{border:none;border-top:1px dotted #888;margin:5px 0;}
    table{width:100%;border-collapse:collapse;}
    @media print{
      @page{size:80mm auto;margin:0;}
      html, body{width:80mm;margin:0 auto;background:#fff;}
      .receipt-container{width:80mm !important;max-width:80mm !important;margin:0 auto !important;padding:4px 6px 14px;}
    }
  </style>
</head>
<body>
<div class="receipt-container">

  <!-- STORE LOGO -->
  ${settings?.printStoreLogo && settings?.logoUrl
      ? `<div style="text-align:center;margin-bottom:6px;">
           <img src="${esc(settings.logoUrl)}" alt="Logo" style="max-height:50px;max-width:140px;object-fit:contain;filter:grayscale(1) contrast(200%);">
         </div>`
      : ""
    }

  <!-- STORE HEADER -->
  <div style="text-align:center;margin-bottom:8px;">
    <div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;line-height:1.15;">${esc(printData.storeName)}</div>
    ${printData.storeAddress ? `<div style="font-size:10px;color:#333;margin-top:2px;">${esc(printData.storeAddress)}</div>` : ""}
    ${printData.storePhone ? `<div style="font-size:10px;color:#333;">Phone: ${esc(printData.storePhone)}</div>` : ""}
    ${settings?.email ? `<div style="font-size:10px;color:#333;">Email: ${esc(settings.email)}</div>` : ""}
    ${settings?.enableGST && settings?.gstin ? `<div style="font-size:10px;font-weight:700;margin-top:2px;">GSTIN: ${esc(settings.gstin)}</div>` : ""}
    ${printData.receiptHeader ? `<div style="font-size:10px;font-weight:600;margin-top:4px;font-style:italic;">${esc(printData.receiptHeader)}</div>` : ""}
  </div>

  <!-- BADGE -->
  <div style="background:#000;color:#fff;text-align:center;font-weight:900;font-size:11px;padding:4px 2px;margin-bottom:6px;letter-spacing:0.2em;text-transform:uppercase;">
    ${esc(invoiceLabel)}
  </div>

  <!-- RECEIPT META -->
  <div style="font-size:11px;margin-bottom:3px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:1px;">
      <span style="color:#555;font-weight:600;">Receipt No:</span>
      <span style="font-weight:900;">${esc(printData.id)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:1px;">
      <span style="color:#555;font-weight:600;">Date:</span>
      <span style="font-weight:700;">${esc(printData.date)}</span>
    </div>
    <div style="border-top:1px solid #ddd;padding-top:4px;margin-top:3px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#777;margin-bottom:1px;">Bill To:</div>
      <div style="font-weight:900;font-size:12px;text-transform:uppercase;">${esc(printData.customerObj?.name || printData.customer || "Walk-in Customer")}</div>
      ${printData.customerObj?.phone || printData.customerPhone ? `<div style="font-size:10px;color:#333;">Phone: ${esc(printData.customerObj?.phone || printData.customerPhone)}</div>` : ""}
      ${printData.customerObj?.email ? `<div style="font-size:10px;color:#333;">Email: ${esc(printData.customerObj.email)}</div>` : ""}
      ${printData.customerGstin ? `<div style="font-size:10px;font-weight:700;">GSTIN: ${esc(printData.customerGstin)}</div>` : ""}
      ${printData.customerObj?.address ? `<div style="font-size:10px;color:#333;">${esc(printData.customerObj.address)}${printData.customerObj.city ? ", " + esc(printData.customerObj.city) : ""}${printData.customerObj.zipCode ? " - " + esc(printData.customerObj.zipCode) : ""}</div>` : ""}
    </div>
    ${printData.payment ? `
    <div style="display:flex;justify-content:space-between;margin-top:3px;">
      <span style="color:#555;font-weight:600;">Payment Mode:</span>
      <span style="font-weight:900;text-transform:uppercase;">${paymentLabel}</span>
    </div>` : ""}
  </div>

  <hr class="divider">

  <!-- ITEMS TABLE -->
  <table style="margin-bottom:2px;">
    <thead>
      <tr style="border-bottom:2px dashed #000;font-size:10px;">
        <th style="padding-bottom:3px;text-align:left;font-weight:700;width:55%;">ITEM</th>
        <th style="padding-bottom:3px;text-align:center;font-weight:700;width:15%;">QTY</th>
        <th style="padding-bottom:3px;text-align:right;font-weight:700;width:30%;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="divider">

  <!-- TOTALS -->
  <div style="font-size:11px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
      <span style="color:#555;font-weight:600;">Subtotal:</span>
      <span style="font-weight:700;">${sym}${fmt(printData.subtotal)}</span>
    </div>
    ${printData.discountAmt > 0 ? `
    <div style="display:flex;justify-content:space-between;margin-bottom:2px;color:#16a34a;">
      <span>Discount:</span>
      <span style="font-weight:700;">-${sym}${fmt(printData.discountAmt)}</span>
    </div>` : ""}
    ${settings?.enableGST
      ? [
        printData.cgstAmt > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:1px;"><span style="color:#555;">CGST:</span><span style="font-weight:700;">${sym}${fmt(printData.cgstAmt)}</span></div>` : "",
        printData.sgstAmt > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:1px;"><span style="color:#555;">SGST:</span><span style="font-weight:700;">${sym}${fmt(printData.sgstAmt)}</span></div>` : "",
        printData.igstAmt > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:1px;"><span style="color:#555;">IGST:</span><span style="font-weight:700;">${sym}${fmt(printData.igstAmt)}</span></div>` : "",
      ].join("")
      : printData.taxAmt > 0
        ? `<div style="display:flex;justify-content:space-between;margin-bottom:1px;"><span style="color:#555;">Tax:</span><span style="font-weight:700;">${sym}${fmt(printData.taxAmt)}</span></div>`
        : ""
    }
  </div>

  <!-- GRAND TOTAL -->
  <div style="border-top:2px dashed #000;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;align-items:baseline;">
    <span style="font-size:14px;font-weight:900;">TOTAL:</span>
    <span style="font-size:18px;font-weight:900;">${sym}${fmt(printData.total)}</span>
  </div>

  ${printData.payment === "cash" && printData.cashTendered != null ? `
  <hr class="divider-thin">
  <div style="font-size:10px;">
    <div style="display:flex;justify-content:space-between;">
      <span style="color:#555;">Cash Tendered:</span>
      <span style="font-weight:700;">${sym}${fmt(printData.cashTendered)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:1px;">
      <span style="color:#555;">Change Due:</span>
      <span style="font-weight:700;color:#16a34a;">${sym}${fmt(printData.changeDue)}</span>
    </div>
  </div>` : ""}

  ${printData.payment === "credit" && printData.advancePaid != null ? `
  <hr class="divider-thin">
  <div style="font-size:10px;">
    <div style="display:flex;justify-content:space-between;">
      <span style="color:#555;">Advance Paid:</span>
      <span style="font-weight:700;">${sym}${fmt(printData.advancePaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:1px;">
      <span style="color:#dc2626;font-weight:700;">Due Amount:</span>
      <span style="font-weight:900;color:#dc2626;">${sym}${fmt(printData.dueAmount)}</span>
    </div>
  </div>` : ""}

  ${splitRows ? `
  <hr class="divider-thin">
  <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#777;margin-bottom:2px;">Split Payment Details:</div>
  ${splitRows}` : ""}

  ${printData.amountInWords ? `
  <div style="margin-top:6px;font-size:9px;color:#444;">
    <span style="font-weight:700;text-transform:uppercase;">Amount in Words:</span>
    <div style="font-size:10px;font-weight:700;font-style:italic;">${esc(printData.amountInWords)}</div>
  </div>` : ""}

  ${(printData.upiId || bankDetailsHtml) ? `<hr class="divider">` : ""}

  ${printData.upiId ? `
  <div style="text-align:center;margin-bottom:6px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#555;margin-bottom:3px;">SCAN &amp; PAY</div>
    <div style="display:inline-block;border:2px solid #000;padding:4px;border-radius:4px;background:#fff;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${encodeURIComponent(printData.upiId)}&pn=${encodeURIComponent(printData.storeName || "")}&am=${fmt(printData.total)}&cu=INR" alt="UPI QR" style="width:100px;height:100px;display:block;">
    </div>
    <div style="font-size:10px;font-weight:700;margin-top:2px;">UPI: ${esc(printData.upiId)}</div>
    <div style="font-size:9px;color:#555;">Scan to pay with any UPI app</div>
  </div>` : ""}

  ${bankDetailsHtml ? `
  <div style="margin-bottom:4px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#555;margin-bottom:2px;">BANK DETAILS:</div>
    ${bankDetailsHtml}
  </div>` : ""}

  <hr class="divider">

  <!-- THANK YOU & NOTES -->
  <div style="text-align:center;margin:6px 0;">
    <div style="font-size:13px;font-weight:900;letter-spacing:0.12em;">*** THANK YOU ***</div>
    ${printData.receiptFooter ? `<div style="font-size:10px;color:#444;margin-top:3px;">${esc(printData.receiptFooter)}</div>` : ""}
  </div>

  ${printData.receiptDeclaration ? `
  <div style="font-size:8px;color:#555;white-space:pre-wrap;text-align:justify;line-height:1.3;border-top:1px dashed #aaa;padding-top:4px;margin-top:4px;">
    ${esc(printData.receiptDeclaration)}
  </div>` : ""}

  ${printData.termsAndConditions ? `
  <div style="font-size:8px;color:#555;white-space:pre-wrap;line-height:1.3;margin-top:4px;">
    <div style="font-weight:700;text-transform:uppercase;text-align:center;margin-bottom:1px;">Terms &amp; Conditions</div>
    ${esc(printData.termsAndConditions)}
  </div>` : ""}

  <!-- SIGNATURE (Compact, properly aligned at bottom) -->
  <div style="margin-top:14px;padding-top:6px;text-align:center;">
    ${settings?.signatureUrl ? `<img src="${esc(settings.signatureUrl)}" alt="Signature" style="max-height:32px;max-width:120px;object-fit:contain;margin:0 auto 2px;display:block;">` : `<div style="height:20px;"></div>`}
    <div style="border-top:1px dashed #000;padding-top:2px;display:inline-block;min-width:130px;">
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Authorized Signatory</span>
    </div>
  </div>

</div>
</body>
</html>`;

  openPrintPopup(html, 360);
}

/* ══════════════════════════════════════════════════════════════
   A4 INVOICE  (Pixel-Perfect Modern Professional Layout)
══════════════════════════════════════════════════════════════ */
export function printA4Invoice(
  printData: any,
  settings: any,
  currencySymbol: string
) {
  if (!printData) return;

  const lines: any[] = Array.isArray(printData.lines) ? printData.lines : [];
  const sym = esc(currencySymbol);

  const invoiceLabel =
    printData.status === "quotation"
      ? "Quotation / Estimate"
      : settings?.enableGST ||
        printData.customerGstin ||
        printData.customerType === "wholesale" ||
        printData.customerType === "corporate"
      ? "Tax Invoice"
      : "Invoice";

  const paymentLabel =
    printData.payment === "split" && printData.splitPayments?.length
      ? (printData.splitPayments as any[]).map((p: any) => String(p.method).toUpperCase()).join(" + ")
      : String(printData.payment || "").toUpperCase();

  /* Items rows */
  const itemRows = lines.length
    ? lines
      .map(
        (l: any, i: number) => `
        <tr style="background:${i % 2 === 1 ? "#fafafa" : "#ffffff"};border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;">${i + 1}</td>
          <td style="padding:10px 12px;">
            <div style="font-size:13px;font-weight:600;color:#111827;">${esc(l.product?.name)}</div>
            ${l.variantName ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${esc(l.variantName)}</div>` : ""}
            ${l.selectedSerial ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">SN: ${esc(l.selectedSerial)}</div>` : ""}
          </td>
          <td style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;">${Number(l.qty)}</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;color:#374151;">${sym}${fmt(l.unitPrice)}</td>
          ${settings?.enableGST ? `<td style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;">${l.product?.gstRate || 0}%</td>` : ""}
          <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:700;color:#111827;">${sym}${fmt(l.total)}</td>
        </tr>`
      )
      .join("")
    : `<tr><td colspan="${settings?.enableGST ? 6 : 5}" style="padding:32px;text-align:center;color:#9ca3af;font-size:13px;">No items in invoice</td></tr>`;

  /* Totals table row helper with fixed width alignment */
  const totalRow = (label: string, value: string, textStyle = "", labelStyle = "") =>
    `<tr>
      <td style="padding:5px 0;color:#6b7280;font-size:13px;text-align:left;white-space:nowrap;${labelStyle}">${label}</td>
      <td style="padding:5px 0;text-align:right;font-weight:600;font-size:13px;white-space:nowrap;${textStyle}">${value}</td>
    </tr>`;

  const bankDetailsHtml = parseBankDetails(printData.bankDetails, false);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(invoiceLabel)} – ${esc(printData.id)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      font-size:13px;
      background:#fff;
      color:#111827;
      line-height:1.4;
      -webkit-print-color-adjust:exact !important;
      print-color-adjust:exact !important;
    }
    .page{max-width:800px;margin:0 auto;padding:32px 36px;min-height:1120px;display:flex;flex-direction:column;}
    table{width:100%;border-collapse:collapse;}
    @media print{
      @page{size:A4;margin:8mm 10mm;}
      body{margin:0;background:#fff;}
      .page{max-width:100%;padding:0;min-height:auto;}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- TOP BRANDING HEADER -->
  <div style="background:#000;color:#fff;text-align:center;padding:9px 16px;letter-spacing:0.35em;font-size:12px;font-weight:800;text-transform:uppercase;margin-bottom:24px;border-radius:2px;">
    ${esc(invoiceLabel)}
  </div>

  <!-- STORE & INVOICE META -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;padding-bottom:18px;border-bottom:2px solid #e5e7eb;">

    <!-- Left: Store Info -->
    <div style="display:flex;align-items:flex-start;gap:16px;max-width:55%;">
      ${settings?.printStoreLogo && settings?.logoUrl
      ? `<img src="${esc(settings.logoUrl)}" alt="Logo" style="height:64px;max-width:140px;object-fit:contain;flex-shrink:0;border-radius:4px;">`
      : ""}
      <div>
        <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.01em;line-height:1.15;color:#000;">
          ${esc(printData.storeName)}
        </h1>
        ${printData.storeAddress ? `<div style="font-size:12px;color:#4b5563;margin-top:4px;line-height:1.3;">${esc(printData.storeAddress)}</div>` : ""}
        ${printData.storePhone ? `<div style="font-size:12px;color:#4b5563;margin-top:2px;">Phone: <strong>${esc(printData.storePhone)}</strong></div>` : ""}
        ${settings?.email ? `<div style="font-size:12px;color:#4b5563;">Email: ${esc(settings.email)}</div>` : ""}
        ${settings?.enableGST && settings?.gstin ? `<div style="font-size:12px;font-weight:700;color:#111827;margin-top:4px;">GSTIN: <span style="font-family:monospace;font-size:13px;">${esc(settings.gstin)}</span></div>` : ""}
      </div>
    </div>

    <!-- Right: Invoice Meta (Clean 2-column key-value table without text wrapping) -->
    <div style="margin-left:auto;flex-shrink:0;">
      <table style="width:auto;border-collapse:collapse;font-size:13px;margin-left:auto;">
        <tr>
          <td style="color:#6b7280;padding:4px 20px 4px 0;text-align:left;white-space:nowrap;font-weight:500;">Invoice No:</td>
          <td style="font-weight:800;padding:4px 0;text-align:right;color:#000;font-size:14px;font-family:monospace;white-space:nowrap;">${esc(printData.id)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;padding:4px 20px 4px 0;text-align:left;white-space:nowrap;font-weight:500;">Date:</td>
          <td style="font-weight:700;padding:4px 0;text-align:right;color:#111827;white-space:nowrap;">${esc(printData.date)}</td>
        </tr>
        ${printData.payment ? `
        <tr>
          <td style="color:#6b7280;padding:4px 20px 4px 0;text-align:left;white-space:nowrap;font-weight:500;">Payment Mode:</td>
          <td style="font-weight:700;padding:4px 0;text-align:right;text-transform:uppercase;color:#111827;white-space:nowrap;">${paymentLabel}</td>
        </tr>` : ""}
      </table>
    </div>
  </div>

  <!-- BILL TO SECTION -->
  <div style="margin-bottom:20px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;margin-bottom:4px;">BILL TO</div>
    <div style="font-size:15px;font-weight:800;color:#111827;">${esc(printData.customerObj?.name || printData.customer || "Walk-in Customer")}</div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:3px;font-size:12px;color:#4b5563;">
      ${printData.customerGstin ? `<div>GSTIN: <strong>${esc(printData.customerGstin)}</strong></div>` : ""}
      ${printData.customerObj?.phone ? `<div>Phone: <strong>${esc(printData.customerObj.phone)}</strong></div>` : ""}
      ${printData.customerObj?.email ? `<div>Email: ${esc(printData.customerObj.email)}</div>` : ""}
    </div>
    ${printData.customerObj?.address ? `<div style="font-size:12px;color:#6b7280;margin-top:3px;">Address: ${esc(printData.customerObj.address)}${printData.customerObj.city ? ", " + esc(printData.customerObj.city) : ""}${printData.customerObj.zipCode ? " – " + esc(printData.customerObj.zipCode) : ""}</div>` : ""}
  </div>

  <!-- ITEMS TABLE -->
  <table style="margin-bottom:0;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;">
    <thead>
      <tr style="background:#000;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">
        <th style="padding:10px 12px;text-align:center;width:44px;">#</th>
        <th style="padding:10px 12px;text-align:left;">Item Description</th>
        <th style="padding:10px 12px;text-align:center;width:70px;">Qty</th>
        <th style="padding:10px 12px;text-align:right;width:100px;">Rate</th>
        ${settings?.enableGST ? `<th style="padding:10px 12px;text-align:center;width:70px;">GST%</th>` : ""}
        <th style="padding:10px 12px;text-align:right;width:120px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- BOTTOM SECTION (2-Column Balanced Grid) -->
  <div style="display:flex;gap:28px;align-items:flex-start;margin-top:18px;flex:1;">

    <!-- LEFT COLUMN: Payment / QR / Bank / Note -->
    <div style="flex:1;display:flex;flex-direction:column;gap:14px;">

      <!-- Scan & Pay QR (if UPI present) -->
      ${printData.upiId ? `
      <div style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:4px;background:#fcfcfc;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:8px;">Scan &amp; Pay</div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="border:1px solid #d1d5db;padding:4px;border-radius:4px;background:#fff;display:inline-block;flex-shrink:0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=84x84&data=upi://pay?pa=${encodeURIComponent(printData.upiId)}&pn=${encodeURIComponent(printData.storeName || "")}&am=${fmt(printData.total)}&cu=INR" alt="UPI QR" style="width:84px;height:84px;display:block;">
          </div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#111827;">UPI: ${esc(printData.upiId)}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Scan with any UPI app</div>
            <div style="font-size:12px;font-weight:700;color:#000;margin-top:3px;">Amount: ${sym}${fmt(printData.total)}</div>
          </div>
        </div>
      </div>` : ""}

      <!-- Formatted Bank Details -->
      ${bankDetailsHtml ? `
      <div style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:4px;background:#fcfcfc;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:4px;">Bank Account Details</div>
        ${bankDetailsHtml}
      </div>` : ""}

      <!-- Footer Note -->
      ${printData.receiptFooter ? `
      <div style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:4px;background:#fcfcfc;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:4px;">Note</div>
        <div style="font-size:12px;color:#4b5563;white-space:pre-wrap;line-height:1.5;">${esc(printData.receiptFooter)}</div>
      </div>` : ""}
    </div>

    <!-- RIGHT COLUMN: Calculation Summary & Signature -->
    <div style="width:280px;flex-shrink:0;">

      <!-- Summary Table -->
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        ${totalRow("Subtotal", `${sym}${fmt(printData.subtotal)}`)}
        ${printData.discountAmt > 0 ? totalRow("Discount", `-${sym}${fmt(printData.discountAmt)}`, "color:#16a34a;") : ""}
        ${settings?.enableGST
          ? [
            printData.cgstAmt > 0 ? totalRow("CGST", `${sym}${fmt(printData.cgstAmt)}`) : "",
            printData.sgstAmt > 0 ? totalRow("SGST", `${sym}${fmt(printData.sgstAmt)}`) : "",
            printData.igstAmt > 0 ? totalRow("IGST", `${sym}${fmt(printData.igstAmt)}`) : "",
          ].join("")
          : printData.taxAmt > 0
            ? totalRow("Tax", `${sym}${fmt(printData.taxAmt)}`)
            : ""
        }
      </table>

      <!-- GRAND TOTAL HIGHLIGHT BOX -->
      <div style="background:#000;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-top:8px;border-radius:3px;">
        <span style="font-size:14px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;">Grand Total</span>
        <span style="font-size:22px;font-weight:900;">${sym}${fmt(printData.total)}</span>
      </div>

      <!-- Additional Payment Breakdown (Cash/Credit/Split) -->
      ${printData.payment === "cash" && printData.cashTendered != null ? `
      <table style="width:100%;font-size:12px;margin-top:8px;border-collapse:collapse;">
        ${totalRow("Cash Tendered", `${sym}${fmt(printData.cashTendered)}`)}
        ${totalRow("Change Due", `${sym}${fmt(printData.changeDue)}`, "color:#16a34a;font-weight:700;")}
      </table>` : ""}

      ${printData.payment === "credit" && printData.advancePaid != null ? `
      <table style="width:100%;font-size:12px;margin-top:8px;border-collapse:collapse;">
        ${totalRow("Advance Paid", `${sym}${fmt(printData.advancePaid)}`)}
        ${totalRow("Due Amount", `${sym}${fmt(printData.dueAmount)}`, "color:#dc2626;font-weight:800;")}
      </table>` : ""}

      ${printData.payment === "split" && printData.splitPayments?.length ? `
      <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #d1d5db;">
        <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;">Split Payment Breakdown</div>
        ${(printData.splitPayments as any[]).filter((p: any) => p.amount > 0).map((p: any) => `
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span style="text-transform:uppercase;color:#6b7280;">${esc(p.method)}:</span>
          <span style="font-weight:600;">${sym}${fmt(p.amount)}</span>
        </div>`).join("")}
      </div>` : ""}

      <!-- Amount in Words -->
      ${printData.amountInWords ? `
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;text-align:right;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:2px;">Amount in Words</div>
        <div style="font-size:11px;font-weight:600;font-style:italic;color:#374151;line-height:1.3;">${esc(printData.amountInWords)}</div>
      </div>` : ""}

      <!-- SIGNATURE SECTION -->
      <div style="margin-top:28px;padding-top:10px;text-align:center;">
        ${settings?.signatureUrl
          ? `<img src="${esc(settings.signatureUrl)}" alt="Signature" style="max-height:48px;max-width:160px;object-fit:contain;display:block;margin:0 auto 4px;">`
          : `<div style="height:36px;"></div>`
        }
        <div style="border-top:1px solid #111827;padding-top:4px;display:inline-block;min-width:170px;">
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#111827;">Authorized Signatory</span>
        </div>
      </div>

    </div>
  </div>

  <!-- DECLARATION & TERMS FOOTER -->
  ${printData.receiptDeclaration ? `
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px;">Declaration</div>
    <p style="font-size:10.5px;color:#6b7280;line-height:1.5;white-space:pre-wrap;text-align:justify;">${esc(printData.receiptDeclaration)}</p>
  </div>` : ""}

  ${printData.termsAndConditions ? `
  <div style="margin-top:10px;">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px;">Terms &amp; Conditions</div>
    <p style="font-size:10.5px;color:#6b7280;line-height:1.5;white-space:pre-wrap;">${esc(printData.termsAndConditions)}</p>
  </div>` : ""}

  ${printData.privacyPolicy ? `
  <div style="margin-top:10px;">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px;">Privacy Policy</div>
    <p style="font-size:10.5px;color:#6b7280;line-height:1.5;white-space:pre-wrap;">${esc(printData.privacyPolicy)}</p>
  </div>` : ""}

  <!-- SYSTEM GENERATED WATERMARK -->
  <div style="margin-top:auto;padding-top:14px;border-top:1px solid #f3f4f6;text-align:center;font-size:9.5px;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">
    This is a computer generated ${esc(invoiceLabel)}
  </div>

</div>
</body>
</html>`;

  openPrintPopup(html, 960);
}
