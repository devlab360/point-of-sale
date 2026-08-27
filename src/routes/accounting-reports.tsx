import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAccountsFn } from "@/api/finance";
import { DataPage } from "@/components/layout/DataPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrency } from "@/lib/currency";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/accounting-reports")({
  head: () => ({ meta: [{ title: "Accounting Reports | OneDesk360" }] }),
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
  const totalLiabilities = liabilities.reduce(
    (sum: number, a: any) => sum + (Number(a.balance) || 0),
    0,
  );
  const totalEquity = equity.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  if (error) {
    return (
      <DataPage
        title="Financial Reports"
        description="Generate Trial Balance and Balance Sheet"
        hideToolbar
      >
        <div className="text-destructive flex flex-col items-center justify-center p-8">
          <AlertCircle className="size-8 mb-2 text-destructive" />
          Error loading reports data.
        </div>
      </DataPage>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <DataPage
        title="Financial Reports"
        description="Generate Trial Balance and Balance Sheet"
        hideToolbar
      >
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="trial-balance" className="w-full mt-2">
            <TabsList className="mb-4 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger
                value="trial-balance"
                className="font-bold text-xs rounded-lg data-[state=active]:shadow-soft"
              >
                Trial Balance
              </TabsTrigger>
              <TabsTrigger
                value="balance-sheet"
                className="font-bold text-xs rounded-lg data-[state=active]:shadow-soft"
              >
                Balance Sheet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trial-balance">
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Trial Balance</CardTitle>
                  <CardDescription className="text-xs">
                    Double-entry ledger statement verifying total debits equal total credits.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Math.abs(totalDebit - totalCredit) > 0.01 && (
                    <Alert variant="destructive" className="mb-4 rounded-xl border-destructive/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="ml-2 font-medium text-xs">
                        Warning: Trial Balance has an unadjusted discrepancy of{" "}
                        {formatCurrency(Math.abs(totalDebit - totalCredit))}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded-xl border border-border/80 overflow-x-auto bg-card">
                    <Table className="min-w-[650px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="p-3 border-r border-border/60">Code</TableHead>
                          <TableHead className="p-3 border-r border-border/60">Account Name</TableHead>
                          <TableHead className="p-3 border-r border-border/60">Type</TableHead>
                          <TableHead className="p-3 border-r border-border/60 text-right w-40">Debit</TableHead>
                          <TableHead className="p-3 text-right w-40">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalanceData.map((acc: any) => (
                          <TableRow key={acc.id}>
                            <TableCell className="p-3 border-r border-border/60 font-mono text-xs font-semibold text-muted-foreground">
                              {acc.code}
                            </TableCell>
                            <TableCell className="p-3 border-r border-border/60 font-bold text-foreground">
                              {acc.name}
                            </TableCell>
                            <TableCell className="p-3 border-r border-border/60">
                              <span className="capitalize text-xs text-muted-foreground">
                                {acc.type}
                              </span>
                            </TableCell>
                            <TableCell className="number p-3 border-r border-border/60 text-right font-black text-xs">
                              {acc.debit > 0 ? formatCurrency(acc.debit) : "-"}
                            </TableCell>
                            <TableCell className="number p-3 text-right font-black text-xs">
                              {acc.credit > 0 ? formatCurrency(acc.credit) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {trialBalanceData.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="p-8 text-center text-muted-foreground text-xs"
                            >
                              No ledger accounts recorded.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <tfoot className="bg-muted/30 font-black border-t-2 border-border/80 text-sm">
                        <tr>
                          <td
                            colSpan={3}
                            className="p-3 border-r border-border/60 text-right uppercase tracking-wider text-xs"
                          >
                            Grand Total
                          </td>
                          <td className="number p-3 border-r border-border/60 text-right text-primary">
                            {formatCurrency(totalDebit)}
                          </td>
                          <td className="number p-3 text-right text-primary">
                            {formatCurrency(totalCredit)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balance-sheet">
              <Card className="rounded-2xl border-border/80 shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Balance Sheet Statement</CardTitle>
                  <CardDescription className="text-xs">
                    Summary of enterprise financial health: Assets = Liabilities + Owner Equity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isBalanced && (
                    <Alert variant="destructive" className="mb-4 rounded-xl border-destructive/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="ml-2 font-medium text-xs">
                        Warning: Balance Sheet discrepancy detected:{" "}
                        {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid md:grid-cols-2 gap-6 items-start">
                    {/* Assets Side */}
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <div className="bg-primary/10 p-3.5 border-b border-border/60 font-bold uppercase tracking-wider flex justify-between text-xs text-primary">
                          <span>Total Assets</span>
                          <span className="font-mono font-black">
                            {formatCurrency(totalAssets)}
                          </span>
                        </div>
                        <div className="p-0">
                          <Table className="text-xs">
                            <TableBody>
                              {assets.map((acc: any) => (
                                <TableRow key={acc.id}>
                                  <TableCell className="p-3 pl-4 font-semibold text-foreground">
                                    {acc.name}
                                  </TableCell>
                                  <TableCell className="number p-3 pr-4 text-right font-black">
                                    {formatCurrency(Number(acc.balance) || 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {assets.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="p-4 text-center text-muted-foreground text-xs"
                                  >
                                    No asset accounts found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities and Equity Side */}
                    <div className="space-y-4">
                      {/* Liabilities */}
                      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <div className="bg-destructive/10 p-3.5 border-b border-border/60 font-bold uppercase tracking-wider flex justify-between text-xs text-destructive">
                          <span>Liabilities</span>
                          <span className="font-mono font-black">
                            {formatCurrency(totalLiabilities)}
                          </span>
                        </div>
                        <div className="p-0">
                          <Table className="text-xs">
                            <TableBody>
                              {liabilities.map((acc: any) => (
                                <TableRow key={acc.id}>
                                  <TableCell className="p-3 pl-4 font-semibold text-foreground">
                                    {acc.name}
                                  </TableCell>
                                  <TableCell className="number p-3 pr-4 text-right font-black">
                                    {formatCurrency(Number(acc.balance) || 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {liabilities.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="p-4 text-center text-muted-foreground text-xs"
                                  >
                                    No liability accounts found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Equity */}
                      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                        <div className="bg-success/10 p-3.5 border-b border-border/60 font-bold uppercase tracking-wider flex justify-between text-xs text-success">
                          <span>Equity & Capital</span>
                          <span className="font-mono font-black">
                            {formatCurrency(totalEquity)}
                          </span>
                        </div>
                        <div className="p-0">
                          <Table className="text-xs">
                            <TableBody>
                              {equity.map((acc: any) => (
                                <TableRow key={acc.id}>
                                  <TableCell className="p-3 pl-4 font-semibold text-foreground">
                                    {acc.name}
                                  </TableCell>
                                  <TableCell className="number p-3 pr-4 text-right font-black">
                                    {formatCurrency(Number(acc.balance) || 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {equity.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={2}
                                    className="p-4 text-center text-muted-foreground text-xs"
                                  >
                                    No equity accounts found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Total Liabilities & Equity Summary */}
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 flex justify-between items-center text-xs font-bold text-foreground">
                        <span>Total Liabilities & Equity:</span>
                        <span className="font-mono font-black text-sm text-primary">
                          {formatCurrency(totalLiabilitiesAndEquity)}
                        </span>
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
