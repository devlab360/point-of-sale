import { useCurrency } from "@/lib/currency";
import QRCode from "react-qr-code";

const fmt = (val: any): string => (Number(val) || 0).toFixed(2);

function BankDetailsDisplay({ data, className = "" }: { data: string, className?: string }) {
  if (!data) return null;
  try {
    if (data.trim().startsWith('{')) {
      const b = JSON.parse(data);
      if (!b.bankName && !b.accountNo && !b.ifscCode && !b.holderName) return null;
      return (
        <div className={className}>
          {b.bankName && <div>Bank: {b.bankName}</div>}
          {b.holderName && <div>Name: {b.holderName}</div>}
          {b.accountNo && <div>A/C No: {b.accountNo}</div>}
          {b.ifscCode && <div>IFSC: {b.ifscCode}</div>}
        </div>
      );
    }
  } catch (e) { }
  return <div className={`whitespace-pre-wrap ${className}`}>{data}</div>;
}

export function PosPrintLayouts({ state, preview = false }: { state: any, preview?: boolean }) {
  const { printData, printFormat, settings } = state;
  const { currencySymbol } = useCurrency();

  if (!printData) return null;

  return (
    <>
      {printFormat === "thermal" && (
        <div
          className={
            preview
              ? "flex justify-center items-start bg-white text-black text-[12px] font-mono leading-tight border shadow-lg max-h-[600px] overflow-auto scale-90 origin-top"
              : "hidden print:flex justify-center items-start fixed inset-0 z-[100] bg-white text-black text-[12px] font-mono leading-tight"
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
              {settings?.enableGST ? "Tax Invoice" : "Receipt"}
            </div>

            <div className="flex flex-col justify-start text-[11px] mb-3 pb-3 border-b-2 border-black border-dashed">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-600">Receipt No:</span>
                <span className="font-black text-right">{printData.id}</span>
              </div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-600">Date:</span>
                <span className="font-black text-right">{printData.date}</span>
              </div>
              <div className="flex flex-col mb-1 border-t border-gray-200 pt-2 mt-1">
                <span className="font-bold text-gray-600 text-[10px] uppercase">Bill To:</span>
                <span className="font-black text-[12px] uppercase">{printData.customerObj?.name || printData.customer}</span>
                {printData.customerObj?.phone && <span>Phone: {printData.customerObj.phone}</span>}
                {printData.customerObj?.email && <span>Email: {printData.customerObj.email}</span>}
                {printData.customerObj?.address && (
                  <span className="whitespace-pre-wrap">
                    {printData.customerObj.address}
                    {printData.customerObj.city ? `, ${printData.customerObj.city}` : ""}
                    {printData.customerObj.zipCode ? ` - ${printData.customerObj.zipCode}` : ""}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-start mt-2">
                <span className="font-bold text-gray-600">Payment Mode:</span>
                <span className="font-black uppercase">{printData.payment}</span>
              </div>
            </div>

            <table className="w-full mb-2">
              <thead>
                <tr className="text-left text-[11px] border-b-2 border-black border-dashed">
                  <th className="pb-1.5 font-bold w-[55%]">ITEM</th>
                  <th className="pb-1.5 text-center font-bold w-[15%]">QTY</th>
                  <th className="pb-1.5 text-right font-bold w-[30%]">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {printData.lines.map((l: any, i: number) => (
                  <tr
                    key={i}
                    className="align-top border-b border-gray-300 border-dotted last:border-0"
                  >
                    <td className="py-2 pr-1">
                      <div className="font-bold">{l.product.name}</div>
                      {l.selectedSerial && (
                        <div className="text-[9px] text-gray-600 mt-0.5">
                          SN: {l.selectedSerial}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center font-semibold">{l.qty}</td>
                    <td className="py-2 text-right font-bold">
                      {currencySymbol}
                      {fmt(l.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-[11px] pt-3 border-t-2 border-black border-dashed">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Subtotal:</span>
                <span className="font-bold">
                  {currencySymbol}
                  {fmt(printData.subtotal)}
                </span>
              </div>
              {printData.discountAmt > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Discount:</span>
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
                    <span className="font-semibold text-gray-600">Tax:</span>
                    <span className="font-bold">
                      {currencySymbol}
                      {fmt(printData.taxAmt)}
                    </span>
                  </div>
                )
              )}
              <div className="flex justify-between items-center text-[15px] border-t-2 border-black border-dashed pt-2 mt-2">
                <span className="font-black">TOTAL:</span>
                <span className="font-black">
                  {currencySymbol}
                  {fmt(printData.total)}
                </span>
              </div>
              {printData.payment === "cash" && printData.cashTendered != null && (
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-400 border-dotted">
                  <span className="font-semibold text-gray-600">Cash Tendered:</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {fmt(printData.cashTendered)}
                  </span>
                </div>
              )}
              {printData.payment === "cash" && printData.changeDue != null && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Change Due:</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {fmt(printData.changeDue)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 text-left">
              <span className="text-[10px] font-bold text-gray-600 uppercase">Amount in Words:</span>
              <p className="font-bold text-[11px] italic">{printData.amountInWords}</p>
            </div>

            {(printData.upiId || printData.bankDetails) && (
              <div className="border-t-2 border-black border-dashed mt-2 pt-4 pb-2">
                {printData.upiId && (
                  <div className="flex flex-col items-center justify-center mb-4">
                    <p className="text-[10px] font-bold uppercase mb-2">Scan & Pay</p>
                    <div className="p-1.5 bg-white border-2 border-black rounded-lg">
                      <QRCode
                        value={`upi://pay?pa=${printData.upiId}&pn=${encodeURIComponent(printData.storeName)}&am=${fmt(printData.total)}&cu=INR`}
                        size={120}
                        level="M"
                      />
                    </div>
                    <p className="text-[10px] font-medium mt-1">UPI: {printData.upiId}</p>
                  </div>
                )}
                {printData.bankDetails && (
                  <div className="text-left text-[10px]">
                    <span className="font-bold uppercase underline">Bank Details:</span>
                    <BankDetailsDisplay data={printData.bankDetails} className="mt-1 font-medium leading-relaxed" />
                  </div>
                )}
              </div>
            )}

            <div className="text-center text-[11px] mt-6 mb-2">
              <p className="font-black uppercase tracking-widest text-[14px]">*** Thank You ***</p>
              {printData.receiptDeclaration && (
                <p className="mt-3 text-[9px] text-gray-700 whitespace-pre-wrap text-justify border-t border-dashed border-gray-400 pt-2 font-medium">
                  {printData.receiptDeclaration}
                </p>
              )}
              {printData.receiptFooter && (
                <p className="mt-2 font-semibold text-gray-800">{printData.receiptFooter}</p>
              )}
            </div>

            <div className="mt-6 mb-4 pt-6 flex flex-col items-end border-t border-dashed border-gray-400">
              <span className="font-bold text-[10px] uppercase text-gray-800 border-t border-black px-2 pt-1">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      )}

      {printFormat === "a4" && (
        <div
          className={`${preview ? "block relative w-full h-full" : "hidden print:block fixed inset-0 z-[100]"
            } bg-white text-black font-sans text-sm`}
        >
          <div className="max-w-[794px] mx-auto bg-white min-h-[1123px] flex flex-col" style={{ padding: "32px 40px" }}>

            {/* ── TOP HEADER BAND ── */}
            <div className="w-full bg-black text-white text-center py-2.5 mb-6 tracking-[0.35em] text-xs font-bold uppercase">
              {settings?.enableGST ? "TAX INVOICE" : "INVOICE"}
            </div>

            {/* ── STORE INFO + INVOICE META ── */}
            <div className="flex justify-between items-start mb-6 pb-5 border-b-2 border-gray-200">
              <div className="flex items-center gap-4">
                {settings?.printStoreLogo && settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight leading-tight">{printData.storeName}</h1>
                  {printData.storeAddress && <div className="text-gray-600 text-xs mt-0.5">{printData.storeAddress}</div>}
                  {printData.storePhone && <div className="text-gray-600 text-xs">Phone: {printData.storePhone}</div>}
                  {settings?.email && <div className="text-gray-600 text-xs">{settings.email}</div>}
                  {settings?.enableGST && settings?.gstin && (
                    <div className="text-xs font-bold mt-1">GSTIN: {settings.gstin}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm text-right">
                  <span className="text-gray-500 text-right">Invoice No:</span>
                  <span className="font-bold text-black text-right">{printData.id}</span>
                  <span className="text-gray-500 text-right">Date:</span>
                  <span className="font-bold text-black text-right">{printData.date}</span>
                  {printData.payment && (
                    <>
                      <span className="text-gray-500 text-right">Payment:</span>
                      <span className="font-bold text-black text-right uppercase">{printData.payment}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── BILL TO ── */}
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bill To</div>
              <div className="font-bold text-base">{printData.customerObj?.name || printData.customer}</div>
              {printData.customerObj?.phone && <div className="text-xs text-gray-600">Phone: {printData.customerObj.phone}</div>}
              {printData.customerObj?.email && <div className="text-xs text-gray-600">Email: {printData.customerObj.email}</div>}
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
                  <th className="px-3 py-2.5 text-left font-semibold">Item Description</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-16">Qty</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-24">Rate</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {printData.lines.map((l: any, i: number) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{l.product.name}</td>
                    <td className="px-3 py-2 text-center">{l.qty}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(l.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{currencySymbol}{fmt(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-b-2 border-black" />

            {/* ── BOTTOM: QR+Bank (left) | Totals+Signature (right) ── */}
            <div className="mt-5 flex gap-8 items-start">
              {/* Left col */}
              <div className="flex-1 flex flex-col gap-4">
                {printData.upiId && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Scan & Pay</div>
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
                        <div className="text-gray-500 mt-0.5 text-[10px]">Scan to pay with any UPI app</div>
                      </div>
                    </div>
                  </div>
                )}
                {printData.bankDetails && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Bank Details</div>
                    <BankDetailsDisplay data={printData.bankDetails} className="text-xs text-gray-700 leading-5" />
                  </div>
                )}
                {printData.receiptFooter && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Note</div>
                    <div className="text-xs text-gray-600 whitespace-pre-wrap">{printData.receiptFooter}</div>
                  </div>
                )}
              </div>

              {/* Right col: Totals */}
              <div className="w-[240px] shrink-0">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">{currencySymbol}{fmt(printData.subtotal)}</span>
                  </div>
                  {printData.discountAmt > 0 && (
                    <div className="flex justify-between gap-4 text-green-700">
                      <span>Discount</span>
                      <span className="font-semibold">-{currencySymbol}{fmt(printData.discountAmt)}</span>
                    </div>
                  )}
                  {settings?.enableGST ? (
                    <>
                      {printData.cgstAmt > 0 && (
                        <div className="flex justify-between gap-4 text-gray-500">
                          <span>CGST</span>
                          <span className="font-semibold text-black">{currencySymbol}{fmt(printData.cgstAmt)}</span>
                        </div>
                      )}
                      {printData.sgstAmt > 0 && (
                        <div className="flex justify-between gap-4 text-gray-500">
                          <span>SGST</span>
                          <span className="font-semibold text-black">{currencySymbol}{fmt(printData.sgstAmt)}</span>
                        </div>
                      )}
                      {printData.igstAmt > 0 && (
                        <div className="flex justify-between gap-4 text-gray-500">
                          <span>IGST</span>
                          <span className="font-semibold text-black">{currencySymbol}{fmt(printData.igstAmt)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    printData.taxAmt > 0 && (
                      <div className="flex justify-between gap-4 text-gray-500">
                        <span>Tax</span>
                        <span className="font-semibold text-black">{currencySymbol}{fmt(printData.taxAmt)}</span>
                      </div>
                    )
                  )}
                  <div className="border-t-2 border-black pt-2 mt-1 flex justify-between gap-4 items-baseline">
                    <span className="font-black text-base">Grand Total</span>
                    <span className="font-black text-xl">{currencySymbol}{fmt(printData.total)}</span>
                  </div>
                  {printData.payment === "cash" && printData.cashTendered != null && (
                    <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-dashed border-gray-300">
                      <span className="text-gray-500">Cash Tendered</span>
                      <span className="font-semibold">{currencySymbol}{fmt(printData.cashTendered)}</span>
                    </div>
                  )}
                  {printData.payment === "cash" && printData.changeDue != null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Change Due</span>
                      <span className="font-semibold text-green-700">{currencySymbol}{fmt(printData.changeDue)}</span>
                    </div>
                  )}
                  {printData.amountInWords && (
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Amount in Words</div>
                      <div className="text-[11px] font-semibold italic text-gray-700 leading-tight">{printData.amountInWords}</div>
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div className="mt-10 pt-3 border-t border-dashed border-gray-400 text-center">
                  {settings?.signatureUrl ? (
                    <img src={settings.signatureUrl} alt="Signature" className="h-12 mx-auto mb-1 object-contain" />
                  ) : (
                    <div className="h-10" />
                  )}
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Authorized Signatory</div>
                </div>
              </div>
            </div>

            {/* ── DECLARATION ── */}
            {printData.receiptDeclaration && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Declaration</div>
                <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap">{printData.receiptDeclaration}</p>
              </div>
            )}

            {/* ── FOOTER ── */}
            <div className="mt-8 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400 tracking-wider">
              This is a computer generated Invoice
            </div>
          </div>
        </div>
      )}
    </>
  );
}

