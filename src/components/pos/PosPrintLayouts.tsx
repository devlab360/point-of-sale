import { useCurrency } from "@/lib/currency";

const fmt = (val: any): string => (Number(val) || 0).toFixed(2);

export function PosPrintLayouts({ state }: { state: any }) {
  const { printData, printFormat, settings } = state;
  const { currencySymbol } = useCurrency();

  if (!printData) return null;

  return (
    <>
      {printFormat === "thermal" && (
        <div className="hidden print:flex justify-center items-start fixed inset-0 z-[100] bg-white text-black text-[12px] font-mono leading-tight">
          <div className="w-[80mm] p-2">
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

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] mb-3 pb-3 border-b-2 border-black border-dashed">
              <div className="flex flex-col">
                <span className="font-bold text-gray-600">Receipt No:</span>
                <span className="font-black">{printData.id}</span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="font-bold text-gray-600">Date:</span>
                <span className="font-black">{printData.date}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="font-bold text-gray-600">Customer:</span>
                <span className="font-black">{printData.customer}</span>
              </div>
              <div className="flex flex-col col-span-2">
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
              {printData.cashTendered > 0 && (
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-400 border-dotted">
                  <span className="font-semibold text-gray-600">Cash Tendered:</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {fmt(printData.cashTendered)}
                  </span>
                </div>
              )}
              {printData.changeDue > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Change Due:</span>
                  <span className="font-bold">
                    {currencySymbol}
                    {fmt(printData.changeDue)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center text-[11px] mt-6 mb-2">
              <p className="font-black uppercase tracking-widest">*** Thank You ***</p>
              {printData.receiptFooter && (
                <p className="mt-1.5 font-semibold text-gray-800">{printData.receiptFooter}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {printFormat === "a4" && (
        <div className="hidden print:block fixed inset-0 z-[100] bg-white text-black p-8 font-sans text-sm">
          <div className="max-w-4xl mx-auto p-4 bg-white">
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
              <div className="flex items-center gap-4">
                {settings?.printStoreLogo && settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                  <h1 className="text-2xl font-black text-black tracking-tight">
                    {printData.storeName}
                  </h1>
                  <div className="text-gray-700 text-sm mt-1 max-w-[250px]">
                    {printData.storeAddress}
                  </div>
                  <div className="text-gray-700 text-sm">Phone: {printData.storePhone}</div>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black uppercase tracking-widest text-black/20 mb-2">
                  {settings?.enableGST ? "TAX INVOICE" : "INVOICE"}
                </h2>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-left inline-grid">
                  <span className="font-semibold text-gray-500 text-right">Invoice No:</span>
                  <span className="font-bold">{printData.id}</span>
                  <span className="font-semibold text-gray-500 text-right">Date:</span>
                  <span className="font-bold">{printData.date}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-2">
                Billed To:
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 inline-block min-w-[300px]">
                <div className="text-lg font-bold">{printData.customer}</div>
              </div>
            </div>

            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-3 py-2 text-left font-semibold w-12">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Item Description</th>
                  <th className="px-3 py-2 text-center font-semibold w-20">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold w-28">Rate</th>
                  <th className="px-3 py-2 text-right font-semibold w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 border-b-2 border-black">
                {printData.lines.map((l: any, i: number) => (
                  <tr key={i} className="even:bg-gray-50/50">
                    <td className="px-3 py-2.5 text-left text-gray-600">{i + 1}</td>
                    <td className="px-3 py-2.5 text-left font-medium">{l.product.name}</td>
                    <td className="px-3 py-2.5 text-center font-semibold">{l.qty}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(l.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{fmt(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-[1fr_350px] gap-12">
              <div className="text-sm text-gray-600">
                <div className="font-bold text-black uppercase tracking-wider text-xs mb-2">
                  Terms
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {printData.receiptFooter || "Thank you!"}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-black">
                      {currencySymbol}
                      {fmt(printData.subtotal)}
                    </span>
                  </div>
                  {printData.discountAmt > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-semibold">
                        -{currencySymbol}
                        {fmt(printData.discountAmt)}
                      </span>
                    </div>
                  )}
                  {settings?.enableGST ? (
                    <>
                      {printData.cgstAmt > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Total CGST:</span>
                          <span className="font-semibold text-black">
                            {currencySymbol}
                            {fmt(printData.cgstAmt)}
                          </span>
                        </div>
                      )}
                      {printData.sgstAmt > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Total SGST:</span>
                          <span className="font-semibold text-black">
                            {currencySymbol}
                            {fmt(printData.sgstAmt)}
                          </span>
                        </div>
                      )}
                      {printData.igstAmt > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Total IGST:</span>
                          <span className="font-semibold text-black">
                            {currencySymbol}
                            {fmt(printData.igstAmt)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    printData.taxAmt > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax:</span>
                        <span className="font-semibold text-black">
                          {currencySymbol}
                          {fmt(printData.taxAmt)}
                        </span>
                      </div>
                    )
                  )}
                  <div className="flex justify-between items-center border-t-2 border-black pt-3 mt-3">
                    <span className="font-black text-lg">Grand Total:</span>
                    <span className="font-black text-2xl">
                      {currencySymbol}
                      {fmt(printData.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
