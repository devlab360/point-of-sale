import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Search, UserCheck, ShieldCheck, Printer, FileText } from "lucide-react";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Customer & Client Portal · Grocer.Pro" }] }),
  component: CustomerPortalPage,
});

function CustomerPortalPage() {
  const { formatCurrency } = useCurrency();
  const [searchPhone, setSearchPhone] = useState("");
  const [activeLookup, setActiveLookup] = useState("");

  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const sales = useLiveQuery(() => localDb.offlineSales.toArray()) || [];

  const foundCustomer = useMemo(() => {
    if (!activeLookup) return null;
    return customers.find(
      (c) => c.phone?.includes(activeLookup) || c.name.toLowerCase().includes(activeLookup.toLowerCase())
    );
  }, [customers, activeLookup]);

  const customerSales = useMemo(() => {
    if (!foundCustomer) return [];
    return sales.filter((s) => s.customerId === foundCustomer.id || s.customerName === foundCustomer.name);
  }, [sales, foundCustomer]);

  const warrantyItems = useMemo(() => {
    const items: { productName: string; serialNumber: string; date: string }[] = [];
    customerSales.forEach((sale) => {
      sale.saleItems?.forEach((item) => {
        if (item.serialNumber) {
          items.push({
            productName: item.productName,
            serialNumber: item.serialNumber,
            date: sale.date,
          });
        }
      });
    });
    return items;
  }, [customerSales]);

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2 py-4">
        <Badge className="bg-primary/10 text-primary border-primary/20">Self-Service Portal</Badge>
        <h1 className="text-3xl font-extrabold text-foreground">Customer Statement & Warranty Lookup</h1>
        <p className="text-sm text-muted-foreground">Enter your phone number to check Khata due balance, invoices & warranty IMEIs.</p>
      </div>

      {/* Search Input Box */}
      <Card className="border-primary/20 shadow-soft">
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveLookup(searchPhone.trim());
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter customer phone number (e.g. +880 1711...)"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="pl-9 h-11 text-sm"
              />
            </div>
            <Button type="submit" className="h-11 px-6 font-bold">
              Check Statement
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Statement Results */}
      {foundCustomer ? (
        <div className="space-y-6">
          {/* Customer KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card">
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium">Customer Name</div>
                <div className="text-lg font-bold mt-1 text-primary">{foundCustomer.name}</div>
                <div className="text-xs text-muted-foreground">{foundCustomer.phone}</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium">Outstanding Khata Due</div>
                <div className="text-2xl font-extrabold text-destructive mt-1">{formatCurrency(foundCustomer.credit || 0)}</div>
              </CardContent>
            </Card>
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium">Available Credit Limit</div>
                <div className="text-2xl font-extrabold text-success mt-1">
                  {formatCurrency(Math.max(0, (foundCustomer.creditLimit || 5000) - (foundCustomer.credit || 0)))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Warranty IMEI List */}
          {warrantyItems.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-primary">
                  <ShieldCheck className="size-5" />
                  <span>Active Warranty Products & IMEIs</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-2.5 text-left">Product Name</th>
                        <th className="p-2.5 text-left">Serial / IMEI Number</th>
                        <th className="p-2.5 text-right">Purchase Date</th>
                        <th className="p-2.5 text-center">Warranty Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {warrantyItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-foreground">{item.productName}</td>
                          <td className="p-2.5 font-mono text-xs font-bold text-primary">{item.serialNumber}</td>
                          <td className="p-2.5 text-right text-muted-foreground">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="p-2.5 text-center">
                            <Badge className="bg-success/15 text-success border-success/30">Active Warranty</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Invoices */}
          <Card className="border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <span>Sales Invoice History ({customerSales.length})</span>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1 size-3.5" /> Print Statement
              </Button>
            </CardHeader>
            <CardContent>
              {customerSales.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">No purchase invoices found for this customer.</div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Payment</th>
                        <th className="p-2.5 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customerSales.map((s) => (
                        <tr key={s.id}>
                          <td className="p-2.5 font-mono font-bold text-primary">{s.id.substring(0, 8).toUpperCase()}</td>
                          <td className="p-2.5 text-muted-foreground">{new Date(s.date).toLocaleDateString()}</td>
                          <td className="p-2.5 uppercase font-medium">{s.paymentMethod}</td>
                          <td className="p-2.5 text-right font-bold text-sm">{formatCurrency(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeLookup ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No customer found matching "<strong>{activeLookup}</strong>". Please verify phone number.
        </Card>
      ) : null}
    </div>
  );
}
