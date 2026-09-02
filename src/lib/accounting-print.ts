export interface AccountingPrintData {
  reportType: "trial-balance" | "balance-sheet" | "pnl" | "ledger";
  storeName?: string;
  periodLabel?: string;
  currencySymbol?: string;
  data: any;
}
import { appName } from "@/lib/env";

export function printAccountingStatement(params: AccountingPrintData) {
  if (typeof document === "undefined") return;

  const {
    reportType,
    storeName = `${appName} Store`,
    periodLabel = "All Time",
    currencySymbol = "$",
    data,
  } = params;

  const formatCurr = (val: number | string) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const currentDate = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let reportTitle = "Financial Statement";
  let contentHtml = "";

  if (reportType === "trial-balance") {
    reportTitle = "TRIAL BALANCE STATEMENT";
    const accounts = data.accounts || [];
    const totalDebit = data.totalDebit || 0;
    const totalCredit = data.totalCredit || 0;
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    contentHtml = `
      <div class="statement-info-box ${isBalanced ? "balanced" : "discrepancy"}">
        <strong>Double-Entry Status:</strong> ${
          isBalanced
            ? "BALANCED (Total Debits equal Total Credits)"
            : `DISCREPANCY: ${formatCurr(Math.abs(totalDebit - totalCredit))}`
        }
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 15%;">Account Code</th>
            <th style="width: 40%;">Account Title</th>
            <th style="width: 15%;">Category</th>
            <th style="width: 15%; text-align: right;">Debit (+)</th>
            <th style="width: 15%; text-align: right;">Credit (-)</th>
          </tr>
        </thead>
        <tbody>
          ${accounts
            .map(
              (acc: any) => `
            <tr>
              <td class="font-mono"><strong>${acc.code || "-"}</strong></td>
              <td><strong>${acc.name || ""}</strong></td>
              <td class="capitalize">${acc.type || ""}</td>
              <td class="text-right font-mono">${acc.debit > 0 ? formatCurr(acc.debit) : "-"}</td>
              <td class="text-right font-mono">${acc.credit > 0 ? formatCurr(acc.credit) : "-"}</td>
            </tr>
          `,
            )
            .join("")}
          ${
            accounts.length === 0
              ? `<tr><td colspan="5" style="text-align: center; padding: 20px;">No ledger accounts found.</td></tr>`
              : ""
          }
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3" class="text-right uppercase">Grand Statement Total:</td>
            <td class="text-right font-mono">${formatCurr(totalDebit)}</td>
            <td class="text-right font-mono">${formatCurr(totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  } else if (reportType === "balance-sheet") {
    reportTitle = "BALANCE SHEET STATEMENT";
    const assets = data.assets || [];
    const liabilities = data.liabilities || [];
    const equity = data.equity || [];
    const totalAssets = data.totalAssets || 0;
    const totalLiabilities = data.totalLiabilities || 0;
    const totalEquity = data.totalEquity || 0;
    const totalLiabilitiesAndEquity = data.totalLiabilitiesAndEquity || 0;
    const isBalanced = data.isBalanced ?? Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    contentHtml = `
      <div class="statement-info-box ${isBalanced ? "balanced" : "discrepancy"}">
        <strong>Accounting Equation:</strong> Assets (${formatCurr(
          totalAssets,
        )}) = Total Liabilities (${formatCurr(totalLiabilities)}) + Owner's Equity (${formatCurr(
          totalEquity,
        )})
      </div>

      <div class="grid-2col">
        <!-- Assets Side -->
        <div class="col-section">
          <div class="section-header">1. Enterprise Assets</div>
          <table class="report-table">
            <thead>
              <tr>
                <th>Account</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${assets
                .map(
                  (a: any) => `
                <tr>
                  <td><span class="font-mono text-muted">[${a.code}]</span> ${a.name}</td>
                  <td class="text-right font-mono"><strong>${formatCurr(a.balance)}</strong></td>
                </tr>
              `,
                )
                .join("")}
              ${assets.length === 0 ? `<tr><td colspan="2" class="text-center">No assets recorded</td></tr>` : ""}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total Enterprise Assets:</td>
                <td class="text-right font-mono">${formatCurr(totalAssets)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Liabilities & Equity Side -->
        <div class="col-section">
          <div class="section-header">2. Liabilities & Obligations</div>
          <table class="report-table">
            <thead>
              <tr>
                <th>Account</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${liabilities
                .map(
                  (a: any) => `
                <tr>
                  <td><span class="font-mono text-muted">[${a.code}]</span> ${a.name}</td>
                  <td class="text-right font-mono"><strong>${formatCurr(a.balance)}</strong></td>
                </tr>
              `,
                )
                .join("")}
              ${liabilities.length === 0 ? `<tr><td colspan="2" class="text-center">No liabilities recorded</td></tr>` : ""}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td>Total Liabilities:</td>
                <td class="text-right font-mono">${formatCurr(totalLiabilities)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="section-header" style="margin-top: 15px;">3. Owner's Equity & Capital</div>
          <table class="report-table">
            <thead>
              <tr>
                <th>Account</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${equity
                .map(
                  (a: any) => `
                <tr>
                  <td><span class="font-mono text-muted">[${a.code}]</span> ${a.name}</td>
                  <td class="text-right font-mono"><strong>${formatCurr(a.balance)}</strong></td>
                </tr>
              `,
                )
                .join("")}
              ${equity.length === 0 ? `<tr><td colspan="2" class="text-center">No equity recorded</td></tr>` : ""}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td>Total Equity:</td>
                <td class="text-right font-mono">${formatCurr(totalEquity)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Liabilities & Equity:</td>
                <td class="text-right font-mono">${formatCurr(totalLiabilitiesAndEquity)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (reportType === "pnl") {
    reportTitle = "PROFIT & LOSS (INCOME) STATEMENT";
    const grossRevenue = data.grossRevenue || 0;
    const costOfGoodsSold = data.costOfGoodsSold || 0;
    const grossProfit = data.grossProfit || 0;
    const otherExpenses = data.otherExpenses || [];
    const totalOtherExpenses = data.totalOtherExpenses || 0;
    const netOperatingProfit = data.netOperatingProfit || 0;
    const netMarginPct = data.netMarginPct || 0;
    const incomeAccounts = data.incomeAccounts || [];

    contentHtml = `
      <div class="pnl-summary-cards">
        <div class="summary-card">
          <div class="summary-label">Gross Revenue</div>
          <div class="summary-value">${formatCurr(grossRevenue)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Cost of Goods (COGS)</div>
          <div class="summary-value" style="color: #b91c1c;">-${formatCurr(costOfGoodsSold)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Gross Trading Profit</div>
          <div class="summary-value">${formatCurr(grossProfit)}</div>
        </div>
        <div class="summary-card highlight">
          <div class="summary-label">Net Operating Income</div>
          <div class="summary-value">${formatCurr(netOperatingProfit)} (${netMarginPct.toFixed(1)}%)</div>
        </div>
      </div>

      <div class="section-header">1. Operating Revenue & Income</div>
      <table class="report-table">
        <tbody>
          <tr>
            <td><strong>Gross Point-of-Sale Trading Revenue</strong></td>
            <td class="text-right font-mono"><strong>${formatCurr(grossRevenue)}</strong></td>
          </tr>
          ${incomeAccounts
            .map(
              (a: any) => `
            <tr>
              <td><span class="font-mono text-muted">[${a.code}]</span> ${a.name}</td>
              <td class="text-right font-mono">${formatCurr(a.balance)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div class="section-header" style="margin-top: 15px;">2. Cost of Sales (COGS)</div>
      <table class="report-table">
        <tbody>
          <tr>
            <td><strong>Cost of Goods Sold (Procurement & Purchases)</strong></td>
            <td class="text-right font-mono" style="color: #b91c1c;">- ${formatCurr(costOfGoodsSold)}</td>
          </tr>
          <tr class="subtotal-row">
            <td><strong>Gross Trading Profit (Revenue - COGS)</strong></td>
            <td class="text-right font-mono"><strong>${formatCurr(grossProfit)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="section-header" style="margin-top: 15px;">3. Operating Expenses & Overheads</div>
      <table class="report-table">
        <tbody>
          ${otherExpenses
            .map(
              (a: any) => `
            <tr>
              <td><span class="font-mono text-muted">[${a.code}]</span> ${a.name}</td>
              <td class="text-right font-mono" style="color: #b91c1c;">- ${formatCurr(a.balance)}</td>
            </tr>
          `,
            )
            .join("")}
          ${
            otherExpenses.length === 0
              ? `<tr><td>General Operating Expenses</td><td class="text-right font-mono" style="color: #b91c1c;">- ${formatCurr(
                  totalOtherExpenses,
                )}</td></tr>`
              : ""
          }
          <tr class="total-row">
            <td><strong>NET OPERATING PROFIT / (LOSS)</strong></td>
            <td class="text-right font-mono" style="font-size: 14px;"><strong>${formatCurr(
              netOperatingProfit,
            )}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  } else if (reportType === "ledger") {
    reportTitle = "GENERAL LEDGER JOURNAL AUDIT";
    const ledgerRows = data.ledgerRows || [];

    contentHtml = `
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 12%;">Voucher #</th>
            <th style="width: 18%;">Date & Time</th>
            <th style="width: 10%;">Type</th>
            <th style="width: 20%;">Debit (+)</th>
            <th style="width: 20%;">Credit (-)</th>
            <th style="width: 20%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${ledgerRows
            .map(
              (v: any) => `
            <tr>
              <td class="font-mono"><strong>${v.voucherNo || "-"}</strong></td>
              <td>${new Date(v.date).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              <td class="uppercase"><span class="type-pill">${v.type || "Journal"}</span></td>
              <td><strong>${v.debitAccountName || "-"}</strong></td>
              <td><strong>${v.creditAccountName || "-"}</strong></td>
              <td class="text-right font-mono"><strong>${formatCurr(v.amount)}</strong></td>
            </tr>
            ${
              v.narration
                ? `<tr><td colspan="6" style="padding-left: 20px; font-size: 10px; color: #64748b; font-style: italic;">Narration: ${v.narration}</td></tr>`
                : ""
            }
          `,
            )
            .join("")}
          ${
            ledgerRows.length === 0
              ? `<tr><td colspan="6" style="text-align: center; padding: 20px;">No journal vouchers match the selected criteria.</td></tr>`
              : ""
          }
        </tbody>
      </table>
    `;
  }

  const htmlDoc = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${reportTitle} - ${storeName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          padding: 10px;
        }
        .header-container {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .store-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .report-subtitle {
          font-size: 14px;
          font-weight: 800;
          color: #b58d4c;
          margin-top: 2px;
          letter-spacing: 0.3px;
        }
        .meta-box {
          text-align: right;
          font-size: 10px;
          color: #475569;
        }
        .meta-box strong {
          color: #0f172a;
        }
        .statement-info-box {
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 11px;
        }
        .statement-info-box.balanced {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .statement-info-box.discrepancy {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        .section-header {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #334155;
          background-color: #f1f5f9;
          padding: 6px 10px;
          border-left: 3px solid #b58d4c;
          margin-bottom: 6px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 11px;
        }
        .report-table th {
          background-color: #f8fafc;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9.5px;
          letter-spacing: 0.4px;
          padding: 6px 8px;
          border-bottom: 1.5px solid #cbd5e1;
          text-align: left;
        }
        .report-table td {
          padding: 5.5px 8px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        .total-row td {
          background-color: #f8fafc;
          font-weight: 900;
          border-top: 1.5px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          font-size: 12px;
        }
        .subtotal-row td {
          background-color: #f1f5f9;
          font-weight: 800;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .text-muted { color: #64748b; }
        .capitalize { text-transform: capitalize; }
        .uppercase { text-transform: uppercase; }
        .grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .pnl-summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }
        .summary-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px;
          background: #f8fafc;
        }
        .summary-card.highlight {
          background: #eff6ff;
          border-color: #bfdbfe;
        }
        .summary-label {
          font-size: 9.5px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }
        .summary-value {
          font-size: 13px;
          font-weight: 900;
          font-family: ui-monospace, monospace;
          margin-top: 3px;
        }
        .type-pill {
          background: #e2e8f0;
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
        }
        .statement-footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 9.5px;
          color: #64748b;
        }
        .signoff-box {
          display: flex;
          gap: 40px;
          margin-top: 25px;
        }
        .signoff-line {
          border-top: 1px dashed #64748b;
          width: 150px;
          text-align: center;
          padding-top: 4px;
          font-size: 9px;
          font-weight: 600;
          color: #334155;
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div>
          <div class="store-title">${storeName}</div>
          <div class="report-subtitle">${reportTitle}</div>
        </div>
        <div class="meta-box">
          <div><strong>Period:</strong> ${periodLabel}</div>
          <div><strong>Generated:</strong> ${currentDate}</div>
          <div><strong>Standard:</strong> Double-Entry GAAP</div>
        </div>
      </div>

      ${contentHtml}

      <div class="signoff-box">
        <div class="signoff-line">Prepared By (Accountant)</div>
        <div class="signoff-line">Approved By (Auditor / Owner)</div>
      </div>

      <div class="statement-footer">
        <div>${appName} Cloud POS & Enterprise Accounting Engine</div>
        <div>Page 1 of 1</div>
      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(htmlDoc);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }, 200);
}
