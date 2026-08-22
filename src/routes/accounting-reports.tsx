import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAccountsFn } from "@/api/finance";
import { DataPage } from "@/components/layout/DataPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrency } from "@/lib/currency";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/accounting-reports")({
  head: () => ({ meta: [{ title: "Accounting Reports | NexisPOS" }] }),
  component: AccountingReportsPage,
});

function AccountingReportsPage() {
  const { formatCurrency } = useCurrency();
  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccountsFn(),
  });

  const accounts = data?.success ? data.data : [];

  // Categorize for Trial Balance
  let totalDebit = 0;
  let totalCredit = 0;

  const trialBalanceData = accounts.map((acc: any) => {
    let debit = 0;
    let credit = 0;
    const bal = Number(acc.balance) || 0;
    
    // Standard normal balances
    if (["Asset", "Expense"].includes(acc.type)) {
      if (bal >= 0) debit = bal;
      else credit = Math.abs(bal);
    } else {
      if (bal >= 0) credit = bal;
      else debit = Math.abs(bal);
    }
    
    totalDebit += debit;
    totalCredit += credit;
    
    return { ...acc, debit, credit };
  });

  // Categorize for Balance Sheet
  const assets = accounts.filter((a: any) => a.type === "Asset");
  const liabilities = accounts.filter((a: any) => a.type === "Liability");
  const equity = accounts.filter((a: any) => a.type === "Equity");
  
  const totalAssets = assets.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilities = liabilities.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalEquity = equity.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  if (error) {
    return (
      <DataPage title="Financial Reports" description="Generate Trial Balance and Balance Sheet" hideToolbar>
        <div className="text-red-500 flex flex-col items-center justify-center p-8">
          <AlertCircle className="size-8 mb-2 text-destructive" />
          Error loading reports data.
        </div>
      </DataPage>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 h-full flex flex-col">
      <DataPage title="Financial Reports" description="Generate Trial Balance and Balance Sheet" hideToolbar>
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="trial-balance" className="w-full mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trial-balance">
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance</CardTitle>
                <CardDescription>A statement of all debits and credits in a double-entry account book.</CardDescription>
              </CardHeader>
              <CardContent>
                {Math.abs(totalDebit - totalCredit) > 0.01 && (
                  <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2 font-medium">
                      Warning: Trial Balance does not match. Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground font-medium">
                      <tr>
                        <th className="p-3 border-b border-r">Account Code</th>
                        <th className="p-3 border-b border-r">Account Name</th>
                        <th className="p-3 border-b border-r">Type</th>
                        <th className="p-3 border-b border-r text-right w-40">Debit</th>
                        <th className="p-3 border-b text-right w-40">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trialBalanceData.map((acc: any) => (
                        <tr key={acc.id} className="hover:bg-muted/50">
                          <td className="p-3 border-r font-mono text-xs">{acc.code}</td>
                          <td className="p-3 border-r">{acc.name}</td>
                          <td className="p-3 border-r">{acc.type}</td>
                          <td className="p-3 border-r text-right font-medium">
                            {acc.debit > 0 ? formatCurrency(acc.debit) : "-"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {acc.credit > 0 ? formatCurrency(acc.credit) : "-"}
                          </td>
                        </tr>
                      ))}
                      {trialBalanceData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No accounts found
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold border-t-2">
                      <tr>
                        <td colSpan={3} className="p-3 border-r text-right uppercase tracking-wider">Grand Total</td>
                        <td className="p-3 border-r text-right text-primary">{formatCurrency(totalDebit)}</td>
                        <td className="p-3 text-right text-primary">{formatCurrency(totalCredit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="balance-sheet">
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>Statement of financial position at a specific moment in time.</CardDescription>
              </CardHeader>
              <CardContent>
                {!isBalanced && (
                  <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2 font-medium">
                      Warning: Balance Sheet does not balance! Difference: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Assets Side */}
                  <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                      <div className="bg-blue-50/50 p-4 border-b font-semibold uppercase tracking-wider flex justify-between text-blue-900">
                        <span>Assets</span>
                        <span>{formatCurrency(totalAssets)}</span>
                      </div>
                      <div className="p-0">
                        <table className="w-full text-sm">
                          <tbody className="divide-y">
                            {assets.map((acc: any) => (
                              <tr key={acc.id} className="hover:bg-muted/30">
                                <td className="p-3 pl-4">{acc.name}</td>
                                <td className="p-3 pr-4 text-right">{formatCurrency(Number(acc.balance) || 0)}</td>
                              </tr>
                            ))}
                            {assets.length === 0 && (
                              <tr>
                                <td colSpan={2} className="p-4 text-center text-muted-foreground">No assets found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  {/* Liabilities & Equity Side */}
                  <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                      <div className="bg-amber-50/50 p-4 border-b font-semibold uppercase tracking-wider flex justify-between text-amber-900">
                        <span>Liabilities</span>
                        <span>{formatCurrency(totalLiabilities)}</span>
                      </div>
                      <div className="p-0">
                        <table className="w-full text-sm">
                          <tbody className="divide-y">
                            {liabilities.map((acc: any) => (
                              <tr key={acc.id} className="hover:bg-muted/30">
                                <td className="p-3 pl-4">{acc.name}</td>
                                <td className="p-3 pr-4 text-right">{formatCurrency(Number(acc.balance) || 0)}</td>
                              </tr>
                            ))}
                            {liabilities.length === 0 && (
                              <tr>
                                <td colSpan={2} className="p-4 text-center text-muted-foreground">No liabilities found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                      <div className="bg-emerald-50/50 p-4 border-b font-semibold uppercase tracking-wider flex justify-between text-emerald-900">
                        <span>Equity</span>
                        <span>{formatCurrency(totalEquity)}</span>
                      </div>
                      <div className="p-0">
                        <table className="w-full text-sm">
                          <tbody className="divide-y">
                            {equity.map((acc: any) => (
                              <tr key={acc.id} className="hover:bg-muted/30">
                                <td className="p-3 pl-4">{acc.name}</td>
                                <td className="p-3 pr-4 text-right">{formatCurrency(Number(acc.balance) || 0)}</td>
                              </tr>
                            ))}
                            {equity.length === 0 && (
                              <tr>
                                <td colSpan={2} className="p-4 text-center text-muted-foreground">No equity found</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className={`rounded-lg border-2 p-4 flex justify-between font-bold uppercase tracking-wider shadow-sm transition-colors ${isBalanced ? 'border-primary bg-primary/5 text-primary' : 'border-destructive bg-destructive/5 text-destructive'}`}>
                      <span>Total Liabilities & Equity</span>
                      <span>{formatCurrency(totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      </DataPage>
    </div>
  );
}
