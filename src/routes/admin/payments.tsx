import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getPendingPaymentsFn,
  approvePaymentFn,
  rejectPaymentFn,
} from "@/api/admin/subscription-payments";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Building2,
  DollarSign,
} from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Approvals · Super Admin OneDesk360" }] }),
  component: SuperAdminPaymentsPage,
});

function SuperAdminPaymentsPage() {
  const queryClient = useQueryClient();

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["subscription-payments"],
    queryFn: () => getPendingPaymentsFn({ data: {} }),
  });

  const payments = (paymentsData?.data as any[]) || [];

  const approveMutation = useMutation({
    mutationFn: (paymentId: string) => approvePaymentFn({ data: { paymentId } }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Payment approved & subscription activated!");
        queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
      } else {
        toast.error(res.error || "Approval failed");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (paymentId: string) => rejectPaymentFn({ data: { paymentId } }),
    onSuccess: () => {
      toast.success("Payment request rejected");
      queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
    },
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">Subscription Payment Approvals</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve offline bank transfers, UPI receipts, and subscription renewals
          </p>
        </div>

        {/* Payments Table */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center p-12">
              <Receipt className="size-10 mx-auto text-muted-foreground mb-3 opacity-40" />
              <h3 className="font-semibold text-lg">No Payments Pending Review</h3>
              <p className="text-sm text-muted-foreground">
                All subscription payment requests are processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase">
                  <TableRow>
                    <TableHead className="px-4 py-3">Tenant / Org</TableHead>
                    <TableHead className="px-4 py-3">Plan & Cycle</TableHead>
                    <TableHead className="px-4 py-3">Amount</TableHead>
                    <TableHead className="px-4 py-3">Tx Ref / Date</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="px-4 py-3 font-semibold">{p.organizationId}</TableCell>
                      <TableCell className="px-4 py-3 text-xs uppercase font-mono">
                        {p.planId} ({p.billingCycle})
                      </TableCell>
                      <TableCell className="px-4 py-3 font-bold">${p.amount}</TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {p.transactionRef || "N/A"} <br />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {p.status === "pending" && (
                          <Badge className="bg-warning/15 text-warning border-warning/30">
                            Pending Review
                          </Badge>
                        )}
                        {p.status === "approved" && (
                          <Badge className="bg-success/15 text-success border-success/30">
                            Approved
                          </Badge>
                        )}
                        {p.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right space-x-2">
                        {p.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-success-foreground"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(p.id)}
                            >
                              <CheckCircle2 className="size-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(p.id)}
                            >
                              <XCircle className="size-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
