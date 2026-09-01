import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { getCustomersFn } from "@/api/customers";
import { getSalesFn } from "@/api/sales";
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import {
  Search,
  UserCheck,
  ShieldCheck,
  Printer,
  FileText,
  Loader2,
  Phone,
  CreditCard,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Customer Statement & Warranty Portal · OneDesk360" }] }),
  component: CustomerPortalPage,
});

function CustomerPortalPage() {
  const { formatDate } = usePreferences();
  const { formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLookup, setActiveLookup] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const orgId = PersistStore.getOrgId() || "default";

  const { data: customersData, isLoading: isCustLoading } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: {} })) as any)?.data || [],
  });
  const customers = customersData || [];

  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => ((await getSalesFn({ data: {} })) as any)?.data || [],
  });
  const sales = salesData || [];

  const foundCustomer = useMemo(() => {
    if (!activeLookup) return null;
    const lower = activeLookup.toLowerCase();
    return customers.find(
      (c: any) =>
        c.phone?.includes(activeLookup) ||
        c.name?.toLowerCase().includes(lower) ||
        c.id === activeLookup,
    );
  }, [customers, activeLookup]);

  const customerSales = useMemo(() => {
    if (!foundCustomer) return [];
    return sales.filter(
      (s: any) => s.customerId === foundCustomer.id || s.customerName === foundCustomer.name,
    );
  }, [sales, foundCustomer]);

  const warrantyItems = useMemo(() => {
    const items: { productName: string; serialNumber: string; date: string; invoiceId: string }[] =
      [];
    customerSales.forEach((sale: any) => {
      sale.saleItems?.forEach((item: any) => {
        if (item.serialNumber) {
          items.push({
            productName: item.productName || item.name,
            serialNumber: item.serialNumber,
            date: sale.date as string,
            invoiceId: sale.id,
          });
        }
      });
    });
    return items;
  }, [customerSales]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setActiveLookup(searchQuery.trim());
      setIsSearching(false);
    }, 200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="text-center space-y-2 py-6 max-w-2xl mx-auto">
        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-wider text-[11px] px-3 py-1">
          Self-Service Customer Portal
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Customer Statement & Warranty Lookup
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Enter customer phone number, client name, or select below to view Khata due balance,
          invoices, and verified IMEI warranty records.
        </p>
      </div>

      {/* Lookup Card */}
      <div className="max-w-3xl mx-auto rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer phone (e.g. +1 555...) or client name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 text-sm rounded-xl font-medium"
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="h-11 px-6 font-bold rounded-xl shadow-soft"
          >
            {isSearching && <Loader2 className="mr-2 size-4 animate-spin" />}
            Lookup Statement
          </Button>
        </form>

        {/* Quick select chip pills */}
        {customers.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Recent Clients:
            </span>
            <div className="flex flex-wrap gap-2">
              {customers.slice(0, 5).map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(c.phone || c.name);
                    setActiveLookup(c.phone || c.name);
                  }}
                  className="rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary px-2.5 py-1 text-xs font-semibold text-foreground border border-border/60 transition-colors"
                >
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statement Results */}
      {foundCustomer ? (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Customer KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/80 bg-card p-5 text-center shadow-soft">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">
                Customer Name & Phone
              </span>
              <p className="text-lg font-black mt-1 text-primary">{foundCustomer.name}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {foundCustomer.phone || "No phone recorded"}
              </p>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center shadow-soft">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">
                Outstanding Khata Due
              </span>
              <p className="text-2xl font-black text-destructive mt-1">
                {formatCurrency(Number(foundCustomer.credit) || 0)}
              </p>
            </div>

            <div className="rounded-xl border border-success/30 bg-success/5 p-5 text-center shadow-soft">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">
                Available Credit Limit
              </span>
              <p className="text-2xl font-black text-success mt-1">
                {formatCurrency(
                  Math.max(
                    0,
                    (Number(foundCustomer.creditLimit) || 5000) -
                      (Number(foundCustomer.credit) || 0),
                  ),
                )}
              </p>
            </div>
          </div>

          {/* Active Warranty IMEI List */}
          {warrantyItems.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="bg-muted/50 p-4 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">
                    Active Product Warranties & Serial Numbers ({warrantyItems.length})
                  </h3>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Product Name
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Serial / IMEI Number
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      Purchase Date
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                      Warranty Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {warrantyItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold text-sm text-foreground">
                        {item.productName}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {item.serialNumber}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-medium">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="bg-success/15 text-success border-success/25 text-[10px] font-black uppercase tracking-wider"
                        >
                          Active Warranty
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Past Invoices */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="bg-muted/50 p-4 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  Purchase Invoice History ({customerSales.length})
                </h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="font-semibold text-xs"
              >
                <Printer className="mr-1.5 size-3.5" /> Print Statement
              </Button>
            </div>

            {customerSales.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No past purchase invoices found for this customer.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Invoice #
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Date
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Payment Method
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                      Total Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {customerSales.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {(s.id || "").substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {formatDate(s.date)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground uppercase">
                        {s.paymentMethod || "CASH"}
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-foreground">
                        {formatCurrency(Number(s.total) || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      ) : activeLookup ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-soft max-w-3xl mx-auto">
          No customer found matching &ldquo;
          <strong className="text-foreground">{activeLookup}</strong>&rdquo;. Please verify the
          phone number or select a client from the suggestions.
        </div>
      ) : null}
    </div>
  );
}
