import { useCurrency, getCurrencyDecimals } from "@/lib/currency";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import QRCode from "react-qr-code";

function formatMoney(val: any, currencyCode?: string): string {
  const dec = getCurrencyDecimals(currencyCode);
  return (Number(val) || 0).toFixed(dec);
}

const fmt = (val: any): string => (Number(val) || 0).toFixed(2);

function getWarrantyExpiry(saleDateStr: any, months: number = 12) {
  try {
    const d = new Date(saleDateStr || new Date());
    d.setMonth(d.getMonth() + Number(months || 12));
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return `${months} Months from purchase`;
  }
}

function BankDetailsDisplay({ data, className = "" }: { data: string; className?: string }) {
  if (!data) return null;
  try {
    if (data.trim().startsWith("{")) {
      const b = JSON.parse(data);
      if (!b.bankName && !b.accountNo && !b.ifscCode && !b.holderName && !b.iban && !b.swiftBic)
        return null;
      return (
        <div className={className}>
          {b.bankName && <div>Bank: {b.bankName}</div>}
          {b.holderName && <div>Name: {b.holderName}</div>}
          {(b.iban || b.accountNo) && <div>A/C / IBAN: {b.iban || b.accountNo}</div>}
          {(b.swiftBic || b.ifscCode) && <div>SWIFT / BIC / IFSC: {b.swiftBic || b.ifscCode}</div>}
        </div>
      );
    }
  } catch (e) {}
  return <div className={`whitespace-pre-wrap ${className}`}>{data}</div>;
}

export function PosPrintLayouts({ state, preview = false }: { state: any; preview?: boolean }) {
  const { t } = useLanguage();
  const { printData, printFormat, settings } = state;
  const { currencySymbol: hookCurrencySymbol } = useCurrency();
  const { formatDateTime } = usePreferences();
  const currencySymbol = settings?.currencySymbol || hookCurrencySymbol || "$";

  if (!printData) return null;

  const formattedDate = (() => {
    if (!printData.date) return "";
    try {
      const d = new Date(printData.date);
      if (!isNaN(d.getTime())) {
        return formatDateTime(d);
      }
    } catch {}
    return String(printData.date);
  })();

  return (
    <>
      {printFormat === "thermal" && (
        <div
          className={
            preview
              ? "flex justify-center items-start bg-white text-black text-[12px] font-mono leading-tight border shadow-lg max-h-[600px] overflow-auto scale-90 origin-top"
              : "pos-print-thermal hidden print:flex justify-center items-start fixed inset-0 z-[100] bg-white text-black text-[12px] font-mono leading-tight"
          }
        >
          <div className="w-[80mm] p-3 rounded-3xl shrink-0">
            <div className="flex flex-col items-center text-center mb-4">
              {settings?.printStoreLogo && settings?.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  className="h-16 w-auto object-contain grayscale mb-2 contrast-200"
                />
              )}
              <h1 className="text-2xl font-black uppercase tracking-widest leading-none mb-1 text-center">
                {printData.storeName}
              </h1>
              <p className="text-[11px] text-gray-800">{printData.storeAddress}</p>
              <p className="text-[11px] text-gray-800">Phone: {printData.storePhone}</p>
              {settings?.enableGST && settings.gstin && (
                <p className="text-[11px] font-bold mt-0.5">GSTIN: {settings.gstin}</p>
              )}
              {printData.receiptHeader && (
                <p className="mt-1 text-[11px] font-semibold">{printData.receiptHeader}</p>
              )}
            </div>

            <div className="bg-black text-white text-center font-bold text-[13px] py-1.5 mb-3 uppercase tracking-[0.2em] w-full">
              {printData.status === "quotation"
                ? t("quotationEstimate", "Quotation / Estimate")
                : settings?.enableGST ||
                    printData.customerGstin ||
                    printData.customerType === "wholesale" ||
                    printData.customerType === "corporate"
                  ? t("taxInvoice", "Tax Invoice")
                  : t("receipt", "Receipt")}
            </div>

            <div className="flex flex-col justify-start text-[11px] mb-3 pb-3 border-b-2 border-black border-dashed">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-600">{t("receiptNo", "Receipt No:")}</span>
                <span className="font-black text-right">{printData.id}</span>
              </div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-600">{t("date", "Date:")}</span>
                <span className="font-black text-right">{formattedDate}</span>
              </div>
              <div className="flex flex-col mb-1 border-t border-gray-200 pt-2 mt-1">
                <span className="font-bold text-gray-600 text-[10px] uppercase">{t("billTo", "Bill To:")}</span>
                <span className="font-black text-[12px] uppercase">
                  {printData.customerObj?.name || printData.customer}
                </span>
                {printData.customerObj?.phone || printData.customerPhone ? (
                  <span>{t("phone", "Phone:")} {printData.customerObj?.phone || printData.customerPhone}</span>
                ) : null}
                {printData.customerObj?.email && <span>{t("email", "Email:")} {printData.customerObj.email}</span>}
                {printData.customerGstin && (
                  <span className="font-bold">GSTIN: {printData.customerGstin}</span>
                )}
                {(printData.customerObj?.address || printData.customerAddress) && (
                  <span className="whitespace-pre-wrap">
                    {printData.customerObj?.address || printData.customerAddress}
                    {printData.customerObj?.city ? `, ${printData.customerObj.city}` : ""}
                    {printData.customerObj?.zipCode ? ` - ${printData.customerObj.zipCode}` : ""}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-start mt-2">
                <span className="font-bold text-gray-600">{t("paymentMode", "Payment Mode:")}</span>
                <span className="font-black uppercase">
                  {printData.payment === "split" && printData.splitPayments?.length
                    ? printData.splitPayments.map((p: any) => p.method).join(" + ")
                    : printData.payment}
                </span>
              </div>
            </div>

            <table className="w-full mb-2">
              <thead>
                <tr className="text-left text-[11px] border-b-2 border-black border-dashed">
                  <th className="pb-1.5 font-bold w-[55%]">{t("pos.itemUpper", "ITEM")}</th>
                  <th className="pb-1.5 text-center font-bold w-[15%]">{t("pos.qtyUpper", "QTY")}</th>
                  <th className="pb-1.5 text-right font-bold w-[30%]">{t("pos.amountUpper", "AMOUNT")}</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {printData.lines.map((l: any, i: number) => {
                  const meta = l.product?.metadata || {};
                  return (
                    <tr
                      key={i}
                      className="align-top border-b border-gray-300 border-dotted last:border-0"
                    >
                      <td className="py-2 pr-1">
                        <div className="font-bold">{l.product.name}</div>
                        {l.selectedSerial && (
                          <div className="text-[9px] text-gray-600 mt-0.5 font-mono">
                            SN: {l.selectedSerial}
                          </div>
                        )}
                        {meta.hasWarranty && (
                          <div className="text-[9px] font-semibold text-gray-700 mt-0.5">
                            🛡️ {meta.warrantyMonths}M Warranty{" "}
                            {meta.guaranteeMonths ? `+ ${meta.guaranteeMonths}M Guarantee` : ""}
                          </div>
                        )}
                        {meta.isJewellery && (
                          <div className="text-[9px] text-gray-700 mt-0.5">
                            {meta.purityKarat || "22K"} | Net:{" "}
                            {Number(meta.netWeight || 0).toFixed(3)}g{" "}
                            {meta.makingChargeValue
                              ? `| MC: ${meta.makingChargeValue}${meta.makingChargeType === "percent" ? "%" : ""}`
                              : ""}
                          </div>
                        )}
                        {meta.isAutoPart && (
                          <div className="text-[9px] text-gray-700 mt-0.5 font-mono">
                            {meta.partNumber ? `MPN: ${meta.partNumber}` : ""}{" "}
                            {meta.oemNumber ? `| OEM: ${meta.oemNumber}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center font-semibold">
                        {Number(l.qty).toString()}{" "}
                        {state?.getUnitName
                          ? state.getUnitName(l.product.unit)
                          : !/^[0-9a-f]{8}-/i.test(l.product.unit || "")
                            ? l.product.unit
                            : ""}
                      </td>
                      <td className="py-2 text-right font-bold">
                        {currencySymbol}
                        {fmt(l.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="space-y-1 text-[11px] pt-3 border-t-2 border-black border-dashed">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">{t("subtotal", "Subtotal:")}</span>
                <span className="font-bold">
                  {currencySymbol}
                  {fmt(printData.subtotal)}
                </span>
              </div>
              {printData.discountAmt > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">{t("discount", "Discount:")}</span>
                  <span className="font-bold">
                    -{currencySymbol}
                    {fmt(printData.discountAmt)}
                  </span>
                </div>
              )}
              {settings?.enableGST ? (
                <>
                  {printData.cgstAmt > 0 && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">CGST:</span>
                      <span className="font-bold">
                        {currencySymbol}
                        {fmt(printData.cgstAmt)}
                      </span>
                    </div>
                  )}
                  {printData.sgstAmt > 0 && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">SGST:</span>
                      <span className="font-bold">
                        {currencySymbol}
                        {fmt(printData.sgstAmt)}
                      </span>
                    </div>
                  )}
                  {printData.igstAmt > 0 && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">IGST:</span>
                      <span className="font-bold">
                        {currencySymbol}
                        {fmt(printData.igstAmt)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                printData.taxAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">{t("tax", "Tax:")}</span>
                    <span className="font-bold">
                      {currencySymbol}
                      {fmt(printData.taxAmt)}
                    </span>
                  </div>
                )
              )}
              <div className="flex justify-between items-center text-[15px] border-t-2 border-black border-dashed pt-2 mt-2">
                <span className="font-black">{t("total", "TOTAL:")}</span>
                <span className="font-black">
                  {currencySymbol}
                  {fmt(printData.total)}
                </span>
              </div>
              {printData.payment === "cash" && printData.cashTendered != null && (
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-400 border-dotted">
                  <span className="font-semibold text-gray-600">{t("cashTendered", "Cash Tendered:")}</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {fmt(printData.cashTendered)}
                  </span>
                </div>
              )}
              {printData.payment === "cash" && printData.changeDue != null && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">{t("changeDue", "Change Due:")}</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {fmt(printData.changeDue)}
                  </span>
                </div>
              )}
              {printData.payment === "credit" && printData.advancePaid != null && (
                <>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">{t("advancePaid", "Advance Paid:")}</span>
                    <span className="font-bold">
                      {currencySymbol}
                      {fmt(printData.advancePaid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">{t("dueAmount", "Due Amount:")}</span>
                    <span className="font-bold">
                      {currencySymbol}
                      {fmt(printData.dueAmount)}
                    </span>
                  </div>
                </>
              )}
              {printData.payment === "split" &&
                printData.splitPayments &&
                printData.splitPayments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-400 border-dotted text-[11px]">
                    <div className="font-semibold text-gray-600 mb-1">{t("splitPaymentDetails", "Split Payment Details:")}</div>
                    {printData.splitPayments.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="uppercase">{p.method}</span>
                        <span className="font-bold">
                          {currencySymbol}
                          {fmt(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="mt-3 text-left">
              <span className="text-[10px] font-bold text-gray-600 uppercase">
                {t("amountInWords", "Amount in Words:")}
              </span>
              <p className="font-bold text-[11px] italic">{printData.amountInWords}</p>
            </div>

            {(printData.upiId || printData.bankDetails) && (
              <div className="border-t-2 border-black border-dashed mt-2 pt-4 pb-2">
                {printData.upiId && (
                  <div className="flex flex-col items-center justify-center mb-4">
                    <p className="text-[10px] font-bold uppercase mb-2">{t("scanAndPay", "Scan & Pay")}</p>
                    <div className="p-1.5 bg-white border-2 border-black rounded-lg">
                      <QRCode
                        value={`upi://pay?pa=${printData.upiId}&pn=${encodeURIComponent(printData.storeName)}&am=${fmt(printData.total)}&cu=INR`}
                        size={120}
                        level="M"
                      />
                    </div>
                    <p className="text-[10px] font-medium mt-1">UPI: {printData.upiId}</p>
                    <p className="text-[11px] font-bold mt-0.5">
                      {t("amount", "Amount")}: {currencySymbol}
                      {fmt(printData.total)}
                    </p>
                  </div>
                )}
                {printData.bankDetails && (
                  <div className="text-left text-[10px]">
                    <span className="font-bold uppercase underline">{t("bankDetails", "Bank Details:")}</span>
                    <BankDetailsDisplay
                      data={printData.bankDetails}
                      className="mt-1 font-medium leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 🛡️ Official Digital Warranty Certificate */}
            {printData.lines.some((l: any) => l.product?.metadata?.hasWarranty) && (
              <div className="mt-4 p-2.5 border-2 border-black border-dashed rounded-lg text-left text-[10px] space-y-1.5 bg-gray-50/50">
                <div className="font-black uppercase tracking-wider text-center border-b border-black pb-1 text-[11px]">
                  {t("officialWarrantyCertificate", "🛡️ Official Warranty Certificate")}
                </div>
                {printData.lines
                  .filter((l: any) => l.product?.metadata?.hasWarranty)
                  .map((l: any, idx: number) => {
                    const meta = l.product.metadata;
                    return (
                      <div
                        key={idx}
                        className="space-y-0.5 pt-0.5 border-b border-gray-300 border-dotted last:border-0 pb-1"
                      >
                        <div className="font-bold text-[11px]">{l.product.name}</div>
                        {l.selectedSerial && (
                          <div className="font-mono font-bold text-[10px]">
                            {t("serialImei", "Serial / IMEI:")} {l.selectedSerial}
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-gray-800">
                          <span>
                            {t("coverage", "Coverage:")} {meta.warrantyMonths || 12} Mos (
                            {meta.warrantyType || "Carry-In"})
                          </span>
                          <span className="font-bold">
                            {t("expires", "Expires:")} {getWarrantyExpiry(printData.date, meta.warrantyMonths || 12)}
                          </span>
                        </div>
                        {meta.guaranteeMonths > 0 && (
                          <div className="text-gray-700">
                            • {t("instantReplacementGuarantee", "Instant Replacement Guarantee:")} {meta.guaranteeMonths} Months
                          </div>
                        )}
                        {meta.warrantyPolicy && (
                          <div className="text-[9px] text-gray-600 italic">
                            {t("policy", "Policy:")} {meta.warrantyPolicy}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="text-center text-[11px] mt-6 mb-2">
              <p className="font-black uppercase tracking-widest text-[14px]">{t("thankYou", "*** Thank You ***")}</p>
              {printData.receiptDeclaration && (
                <p className="mt-3 text-[9px] text-gray-700 whitespace-pre-wrap text-justify border-t border-dashed border-gray-400 pt-2 font-medium">
                  {printData.receiptDeclaration}
                </p>
              )}
              {printData.termsAndConditions && (
                <div className="mt-2 text-[9px] text-gray-700 text-justify font-medium">
                  <span className="font-bold underline uppercase block mb-0.5 text-center">
                    {t("termsAndConditions", "Terms & Conditions")}
                  </span>
                  <p className="whitespace-pre-wrap">{printData.termsAndConditions}</p>
                </div>
              )}
              {printData.privacyPolicy && (
                <div className="mt-2 text-[9px] text-gray-700 text-justify font-medium">
                  <span className="font-bold underline uppercase block mb-0.5 text-center">
                    {t("privacyPolicy", "Privacy Policy")}
                  </span>
                  <p className="whitespace-pre-wrap">{printData.privacyPolicy}</p>
                </div>
              )}
              {printData.receiptFooter && (
                <p className="mt-2 font-semibold text-gray-800">{printData.receiptFooter}</p>
              )}
            </div>

            <div className="mt-6 pt-6 flex flex-col items-center">
              {settings?.signatureUrl ? (
                <img
                  src={settings.signatureUrl}
                  alt="Signature"
                  className="h-10 mb-1 object-contain grayscale"
                />
              ) : (
                <div className="h-8" />
              )}
              <span className="font-bold text-[10px] uppercase text-gray-800 border-t border-black px-2 pt-1  border-t border-dashed border-gray-400">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      )}

      {printFormat === "a4" && (
        <div
          className={`${
            preview
              ? "pos-print-a4 block relative w-full h-full"
              : "pos-print-a4 hidden print:block fixed inset-0 z-[100]"
          } bg-white text-black font-sans text-sm`}
        >
          <div
            className="max-w-[794px] mx-auto bg-white min-h-[1123px] flex flex-col"
            style={{ padding: "32px 40px" }}
          >
            {/* ── TOP HEADER BAND ── */}
            <div className="w-full bg-black text-white text-center py-2.5 mb-6 tracking-[0.35em] text-xs font-bold uppercase">
              {printData.status === "quotation"
                ? "Quotation / Estimate"
                : settings?.enableGST ||
                    printData.customerGstin ||
                    printData.customerType === "wholesale" ||
                    printData.customerType === "corporate"
                  ? "Tax Invoice"
                  : "Invoice"}
            </div>

            {/* ── STORE INFO + INVOICE META ── */}
            <div className="flex justify-between items-start mb-6 pb-5 border-b-2 border-gray-200">
              <div className="flex items-center gap-4">
                {settings?.printStoreLogo && settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight leading-tight">
                    {printData.storeName}
                  </h1>
                  {printData.storeAddress && (
                    <div className="text-gray-600 text-xs mt-0.5">{printData.storeAddress}</div>
                  )}
                  {printData.storePhone && (
                    <div className="text-gray-600 text-xs">Phone: {printData.storePhone}</div>
                  )}
                  {settings?.email && <div className="text-gray-600 text-xs">{settings.email}</div>}
                  {settings?.enableGST && settings?.gstin && (
                    <div className="text-xs font-bold mt-1">GSTIN: {settings.gstin}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm text-right">
                  <span className="text-gray-500 text-right">{t("invoiceNo", "Invoice No:")}</span>
                  <span className="font-bold text-black text-right">{printData.id}</span>
                  <span className="text-gray-500 text-right">{t("date", "Date:")}</span>
                  <span className="font-bold text-black text-right">{formattedDate}</span>
                  {printData.payment && (
                    <>
                      <span className="text-gray-500 text-right">{t("payment", "Payment:")}</span>
                      <span className="font-bold text-black text-right uppercase">
                        {printData.payment === "split" && printData.splitPayments?.length
                          ? printData.splitPayments.map((p: any) => p.method).join(" + ")
                          : printData.payment}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── BILL TO ── */}
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {t("billTo", "Bill To")}
              </div>
              <div className="font-bold text-base text-black mb-1">
                {printData.customerObj?.name || printData.customer}
              </div>
              {printData.customerGstin && (
                <div className="font-bold text-gray-800 text-xs">
                  GSTIN: {printData.customerGstin}
                </div>
              )}
              {printData.customerObj?.phone && (
                <div className="text-xs text-gray-600">{t("phone", "Phone:")} {printData.customerObj.phone}</div>
              )}
              {printData.customerObj?.email && (
                <div className="text-xs text-gray-600">{t("email", "Email:")} {printData.customerObj.email}</div>
              )}
              {printData.customerObj?.address && (
                <div className="text-xs text-gray-600">
                  {printData.customerObj.address}
                  {printData.customerObj.city ? `, ${printData.customerObj.city}` : ""}
                  {printData.customerObj.zipCode ? ` - ${printData.customerObj.zipCode}` : ""}
                </div>
              )}
            </div>

            {/* ── ITEMS TABLE ── */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white text-xs">
                  <th className="px-3 py-2.5 text-left font-semibold w-10">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold">{t("pos.itemDescription", "Item Description")}</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-16">{t("pos.qty", "Qty")}</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-24">{t("pos.rate", "Rate")}</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-28">{t("pos.amount", "Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {printData.lines.map((l: any, i: number) => {
                  const meta = l.product?.metadata || {};
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}
                    >
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-black">{l.product.name}</div>
                        {l.selectedSerial && (
                          <div className="text-[11px] text-gray-600 mt-0.5 font-mono">
                            SN: {l.selectedSerial}
                          </div>
                        )}
                        {meta.hasWarranty && (
                          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            🛡️ {meta.warrantyMonths} {t("monthsWarranty", "Months Warranty")}{" "}
                            {meta.guaranteeMonths ? `+ ${meta.guaranteeMonths}M Guarantee` : ""} (
                            {meta.warrantyType || "Carry-In"})
                          </div>
                        )}
                        {meta.isJewellery && (
                          <div className="text-[11px] text-amber-800 mt-0.5">
                            {t("purity", "Purity")}: {meta.purityKarat || "22K"} | {t("netGold", "Net Gold")}:{" "}
                            {Number(meta.netWeight || 0).toFixed(3)}g{" "}
                            {meta.makingChargeValue
                              ? `| ${t("makingCharge", "Making Charge")}: ${meta.makingChargeValue}${meta.makingChargeType === "percent" ? "%" : ""}`
                              : ""}
                          </div>
                        )}
                        {meta.isAutoPart && (
                          <div className="text-[11px] text-blue-800 mt-0.5 font-mono">
                            {meta.partNumber ? `Part No: ${meta.partNumber}` : ""}{" "}
                            {meta.oemNumber ? `| OEM Ref: ${meta.oemNumber}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {Number(l.qty).toString()}{" "}
                        {state?.getUnitName
                          ? state.getUnitName(l.product.unit)
                          : !/^[0-9a-f]{8}-/i.test(l.product.unit || "")
                            ? l.product.unit
                            : ""}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(l.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {currencySymbol}
                        {fmt(l.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-b-2 border-black" />

            {/* ── BOTTOM: QR+Bank (left) | Totals+Signature (right) ── */}
            <div className="mt-5 flex gap-8 items-start">
              {/* Left col */}
              <div className="flex-1 flex flex-col gap-4">
                {printData.upiId && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      {t("scanAndPay", "Scan & Pay")}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="border-2 border-gray-300 p-1.5 rounded shrink-0">
                        <QRCode
                          value={`upi://pay?pa=${printData.upiId}&pn=${encodeURIComponent(printData.storeName)}&am=${fmt(printData.total)}&cu=INR`}
                          size={72}
                          level="M"
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <div className="font-semibold text-black">UPI: {printData.upiId}</div>
                        <div className="text-gray-500 mt-0.5 text-[10px]">
                          {t("scanToPayWithUpi", "Scan to pay with any UPI app")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {printData.bankDetails && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      {t("bankDetails", "Bank Details")}
                    </div>
                    <BankDetailsDisplay
                      data={printData.bankDetails}
                      className="text-xs text-gray-700 leading-5"
                    />
                  </div>
                )}
                {printData.receiptFooter && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                      {t("note", "Note")}
                    </div>
                    <div className="text-xs text-gray-600 whitespace-pre-wrap">
                      {printData.receiptFooter}
                    </div>
                  </div>
                )}
              </div>

              {/* Right col: Totals */}
              <div className="w-[240px] shrink-0">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">{t("subtotal", "Subtotal")}</span>
                    <span className="font-semibold">
                      {currencySymbol}
                      {fmt(printData.subtotal)}
                    </span>
                  </div>
                  {printData.discountAmt > 0 && (
                    <div className="flex justify-between gap-4 text-green-700">
                      <span>{t("discount", "Discount")}</span>
                      <span className="font-semibold">
                        -{currencySymbol}
                        {fmt(printData.discountAmt)}
                      </span>
                    </div>
                  )}
                  {settings?.enableGST ? (
                    <>
                      {printData.cgstAmt > 0 && (
                        <div className="flex justify-between gap-4 text-gray-500">
                          <span>CGST</span>
                          <span className="font-semibold text-black">
                            {currencySymbol}
                            {fmt(printData.cgstAmt)}
                          </span>
                        </div>
                      )}
                      {printData.sgstAmt > 0 && (
                        <div className="flex justify-between gap-4 text-gray-500">
                          <span>SGST</span>
                          <span className="font-semibold text-black">
                            {currencySymbol}
                            {fmt(printData.sgstAmt)}
                          </span>
                        </div>
                      )}
                      {printData.igstAmt > 0 && (
                        <div className="flex justify-between gap-4 text-gray-500">
                          <span>IGST</span>
                          <span className="font-semibold text-black">
                            {currencySymbol}
                            {fmt(printData.igstAmt)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    printData.taxAmt > 0 && (
                      <div className="flex justify-between gap-4 text-gray-500">
                        <span>{t("tax", "Tax")}</span>
                        <span className="font-semibold text-black">
                          {currencySymbol}
                          {fmt(printData.taxAmt)}
                        </span>
                      </div>
                    )
                  )}
                  <div className="border-t-2 border-black pt-2 mt-1 flex justify-between gap-4 items-baseline">
                    <span className="font-black text-base">{t("grandTotal", "Grand Total")}</span>
                    <span className="font-black text-xl">
                      {currencySymbol}
                      {fmt(printData.total)}
                    </span>
                  </div>
                  {printData.payment === "cash" && printData.cashTendered != null && (
                    <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-dashed border-gray-300">
                      <span className="text-gray-500">{t("cashTendered", "Cash Tendered")}</span>
                      <span className="font-semibold">
                        {currencySymbol}
                        {fmt(printData.cashTendered)}
                      </span>
                    </div>
                  )}
                  {printData.payment === "cash" && printData.changeDue != null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">{t("changeDue", "Change Due")}</span>
                      <span className="font-semibold text-green-700">
                        {currencySymbol}
                        {fmt(printData.changeDue)}
                      </span>
                    </div>
                  )}
                  {printData.payment === "credit" && printData.advancePaid != null && (
                    <>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">{t("advancePaid", "Advance Paid")}</span>
                        <span className="font-semibold">
                          {currencySymbol}
                          {fmt(printData.advancePaid)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">{t("dueAmount", "Due Amount")}</span>
                        <span className="font-semibold text-red-600">
                          {currencySymbol}
                          {fmt(printData.dueAmount)}
                        </span>
                      </div>
                    </>
                  )}
                  {printData.payment === "split" &&
                    printData.splitPayments &&
                    printData.splitPayments.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-dashed border-gray-300">
                        <div className="text-gray-500 text-[11px] font-semibold mb-1">
                          {t("splitPaymentDetails", "Split Payment Details")}
                        </div>
                        {printData.splitPayments.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span className="text-gray-500 uppercase">{p.method}</span>
                            <span className="font-semibold">
                              {currencySymbol}
                              {fmt(p.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  {printData.amountInWords && (
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">
                        {t("amountInWords", "Amount in Words")}
                      </div>
                      <div className="text-[11px] font-semibold italic text-gray-700 leading-tight">
                        {printData.amountInWords}
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div className="mt-10 pt-3 border-t border-dashed border-gray-400 text-center">
                  {settings?.signatureUrl ? (
                    <img
                      src={settings.signatureUrl}
                      alt="Signature"
                      className="h-12 mx-auto mb-1 object-contain"
                    />
                  ) : (
                    <div className="h-10" />
                  )}
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {t("authorizedSignatory", "Authorized Signatory")}
                  </div>
                </div>
              </div>
            </div>

            {/* 🛡️ Official Digital Warranty Certificate (A4) */}
            {printData.lines.some((l: any) => l.product?.metadata?.hasWarranty) && (
              <div className="mt-6 p-4 border-2 border-black border-dashed rounded-xl bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between border-b border-black pb-1.5">
                  <span className="font-black text-sm uppercase tracking-wider">
                    {t("officialWarrantyCertificate", "🛡️ OFFICIAL DIGITAL WARRANTY & GUARANTEE CERTIFICATE")}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {t("storeVerificationId", "Store Verification ID:")} #{String(printData.id).slice(0, 10).toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {printData.lines
                    .filter((l: any) => l.product?.metadata?.hasWarranty)
                    .map((l: any, idx: number) => {
                      const meta = l.product.metadata;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-gray-200 bg-white space-y-1 text-xs"
                        >
                          <div className="font-bold text-black">{l.product.name}</div>
                          {l.selectedSerial && (
                            <div className="font-mono text-gray-700">
                              {t("registeredSn", "Registered SN:")}{" "}
                              <strong className="text-black">{l.selectedSerial}</strong>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-gray-600">
                            <span>
                              {t("warranty", "Warranty:")} {meta.warrantyMonths || 12} Mos (
                              {meta.warrantyType || "Carry-In"})
                            </span>
                            <span className="font-bold text-emerald-800">
                              {t("validTill", "Valid Till:")}{" "}
                              {getWarrantyExpiry(printData.date, meta.warrantyMonths || 12)}
                            </span>
                          </div>
                          {meta.guaranteeMonths > 0 && (
                            <div className="text-amber-800 font-medium">
                              • {t("instantReplacementGuarantee", "Instant Replacement Guarantee:")} {meta.guaranteeMonths} Months
                            </div>
                          )}
                          {meta.warrantyPolicy && (
                            <div className="text-[10px] text-gray-500 italic mt-0.5">
                              {t("policy", "Policy:")} {meta.warrantyPolicy}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ── DECLARATION ── */}
            {printData.receiptDeclaration && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {t("declaration", "Declaration")}
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {printData.receiptDeclaration}
                </p>
              </div>
            )}
            {printData.termsAndConditions && (
              <div className="mt-4 pt-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {t("termsAndConditions", "Terms & Conditions")}
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {printData.termsAndConditions}
                </p>
              </div>
            )}
            {printData.privacyPolicy && (
              <div className="mt-4 pt-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {t("privacyPolicy", "Privacy Policy")}
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {printData.privacyPolicy}
                </p>
              </div>
            )}

            {/* ── FOOTER ── */}
            <div className="mt-8 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400 tracking-wider">
              {t("computerGeneratedInvoice", "This is a computer generated Invoice")}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
