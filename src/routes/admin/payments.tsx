import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getPendingPaymentsFn,
  approvePaymentFn,
  rejectPaymentFn,
} from "@/api/admin/subscription-payments";
import {
  getSuperAdminPaymentConfigFn,
  saveSuperAdminPaymentConfigFn,
} from "@/api/admin/super-admin";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Building2,
  DollarSign,
  QrCode,
  Settings,
  Search,
  RefreshCw,
  CreditCard,
  Sparkles,
  Download,
  Wallet,
  Eye,
  AlertCircle,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payment Approvals · Super Admin OneDesk360" }] }),
  component: SuperAdminPaymentsPage,
});

function SuperAdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">(
    "pending",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Config Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<any>(null);

  const [paymentConfig, setPaymentConfig] = useState({
    accountName: "",
    bankName: "",
    accountNo: "",
    ifscCode: "",
    upiId: "",
    qrCodeUrl: "",
    instructions: "",
  });

  const {
    data: paymentsData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["subscription-payments"],
    queryFn: () => getPendingPaymentsFn({ data: {} }),
  });

  const { data: configData } = useQuery({
    queryKey: ["super-admin-payment-config"],
    queryFn: () => getSuperAdminPaymentConfigFn({ data: {} }),
  });

  const payments = (paymentsData?.data as any[]) || [];

  const approveMutation = useMutation({
    mutationFn: (paymentId: string) => approvePaymentFn({ data: { paymentId } }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Payment approved & subscription activated for tenant store!");
        setSelectedPaymentDetail(null);
        queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
        queryClient.invalidateQueries({ queryKey: ["saas-organizations"] });
      } else {
        toast.error(res.error || "Approval failed");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (paymentId: string) => rejectPaymentFn({ data: { paymentId } }),
    onSuccess: () => {
      toast.success("Payment request marked as rejected");
      setSelectedPaymentDetail(null);
      queryClient.invalidateQueries({ queryKey: ["subscription-payments"] });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: (cfg: any) => saveSuperAdminPaymentConfigFn({ data: cfg }),
    onSuccess: () => {
      toast.success("Super Admin payment details updated!");
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-admin-payment-config"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update payment settings"),
  });

  const openConfigModal = () => {
    if (configData?.data) {
      setPaymentConfig({
        accountName: configData.data.accountName || "",
        bankName: configData.data.bankName || "",
        accountNo: configData.data.accountNo || "",
        ifscCode: configData.data.ifscCode || "",
        upiId: configData.data.upiId || "",
        qrCodeUrl: configData.data.qrCodeUrl || "",
        instructions: configData.data.instructions || "",
      });
    }
    setIsConfigModalOpen(true);
  };

  const filteredPayments = payments
    .filter((p: any) => {
      if (activeTab === "pending") return p.status === "pending";
      if (activeTab === "approved") return p.status === "approved";
      if (activeTab === "rejected") return p.status === "rejected";
      return true;
    })
    .filter((p: any) => {
      const q = searchQuery.toLowerCase();
      return (
        p.organizationId?.toLowerCase().includes(q) ||
        p.organizationName?.toLowerCase().includes(q) ||
        p.userEmail?.toLowerCase().includes(q) ||
        p.utrNumber?.toLowerCase().includes(q) ||
        p.planId?.toLowerCase().includes(q)
      );
    });

  const pendingCount = payments.filter((p: any) => p.status === "pending").length;
  const approvedCount = payments.filter((p: any) => p.status === "approved").length;
  const rejectedCount = payments.filter((p: any) => p.status === "rejected").length;

  const totalApprovedVolume = payments
    .filter((p: any) => p.status === "approved")
    .reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="Subscription Payments & Gateway Setup"
          description="Review offline bank transfers, UPI receipts, and configure payment instructions for tenant stores."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                disabled={isFetching}
              >
                <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  const exportRows = filteredPayments.map((p: any) => ({
                    ID: p.id,
                    StoreOrg: p.organizationName || p.organizationId,
                    OwnerEmail: p.userEmail,
                    Plan: p.planName || p.planId,
                    Amount: p.amount || 0,
                    UTR_Reference: p.referenceNumber || p.utrNumber || "",
                    PaymentMethod: p.paymentMethod || "Bank/UPI",
                    Status: p.status,
                    SubmittedAt: new Date(p.createdAt).toLocaleDateString(),
                  }));
                  exportToCSV("SaaS_Subscription_Payments", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button onClick={openConfigModal} size="sm" className="gap-2 h-9 shadow-xs">
                <QrCode className="size-4" />
                <span>Configure Bank & UPI QR</span>
              </Button>
            </div>
          }
        />

        {/* Top Metric Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Verified Payment Volume"
            value={`₹${totalApprovedVolume.toLocaleString("en-IN")}`}
            hint={`${approvedCount} total transactions`}
            icon={Wallet}
            accent="primary"
          />
          <StatCard
            label="Pending Review"
            value={String(pendingCount)}
            hint={pendingCount > 0 ? "Requires verification" : "All cleared"}
            icon={Receipt}
            accent={pendingCount > 0 ? "destructive" : "info"}
          />
          <StatCard
            label="Approved Subscriptions"
            value={String(approvedCount)}
            hint="Activated store plans"
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Rejected Inquiries"
            value={String(rejectedCount)}
            hint="Invalid reference proofs"
            icon={XCircle}
            accent="destructive"
          />
        </div>

        {/* Status Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "pending"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-black">
                  {pendingCount}
                </Badge>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("approved")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "approved"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rejected")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "rejected"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rejected ({rejectedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Records ({payments.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by Org ID, Store or UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 text-xs"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading payment records…</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center p-16 space-y-3">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Receipt className="size-6 opacity-40" />
              </div>
              <h3 className="font-bold text-base text-foreground">No Payment Requests Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No records matching your current filter. All subscriptions are up to date.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                  <TableRow>
                    <TableHead className="px-4 py-3.5">Tenant Organization</TableHead>
                    <TableHead className="px-4 py-3.5">Plan & Billing Cycle</TableHead>
                    <TableHead className="px-4 py-3.5">Amount</TableHead>
                    <TableHead className="px-4 py-3.5">Payment Method & UTR</TableHead>
                    <TableHead className="px-4 py-3.5">Submission Date</TableHead>
                    <TableHead className="px-4 py-3.5">Status</TableHead>
                    <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-4 py-3.5">
                        <div className="font-bold text-foreground">
                          {p.organizationName || p.organizationId}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{p.userEmail}</div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <Badge variant="outline" className="font-mono text-xs font-bold uppercase">
                          {p.planName || p.planId} ({p.billingCycle || "monthly"})
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 font-black text-foreground">
                        ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground font-mono">
                            {p.referenceNumber || p.utrNumber || p.transactionRef || "N/A"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.paymentMethod || "Bank / UPI Transfer"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        {p.status === "pending" && (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold uppercase text-[10px]">
                            Pending Review
                          </Badge>
                        )}
                        {p.status === "approved" && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold uppercase text-[10px]">
                            Approved
                          </Badge>
                        )}
                        {p.status === "rejected" && (
                          <Badge variant="destructive" className="font-bold uppercase text-[10px]">
                            Rejected
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-right space-x-2">
                        {p.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(p.id)}
                            >
                              <CheckCircle2 className="size-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                              disabled={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(p.id)}
                            >
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs font-semibold gap-1"
                            onClick={() => setSelectedPaymentDetail(p)}
                          >
                            <Eye className="size-3.5" /> View Proof
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* View Payment Proof & Details Drawer */}
        <Sheet
          open={!!selectedPaymentDetail}
          onOpenChange={(open) => !open && setSelectedPaymentDetail(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Payment Verification Details
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Receipt and UTR transfer reference verification
              </SheetDescription>
            </SheetHeader>

            {selectedPaymentDetail && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Store Organization:</span>
                      <span className="font-bold text-foreground">
                        {selectedPaymentDetail.organizationName ||
                          selectedPaymentDetail.organizationId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner Email:</span>
                      <span className="text-foreground">{selectedPaymentDetail.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan Tier:</span>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {selectedPaymentDetail.planName || selectedPaymentDetail.planId}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-black text-sm text-foreground">
                        ₹{Number(selectedPaymentDetail.amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UTR / Transaction Ref:</span>
                      <span className="font-mono font-bold text-foreground">
                        {selectedPaymentDetail.referenceNumber ||
                          selectedPaymentDetail.utrNumber ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          selectedPaymentDetail.status === "approved"
                            ? "default"
                            : selectedPaymentDetail.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px] font-bold uppercase"
                      >
                        {selectedPaymentDetail.status}
                      </Badge>
                    </div>
                  </div>

                  {selectedPaymentDetail.note && (
                    <div className="space-y-1">
                      <span className="font-bold text-foreground">Merchant Note:</span>
                      <p className="p-3 rounded-lg border bg-card text-muted-foreground leading-relaxed">
                        {selectedPaymentDetail.note}
                      </p>
                    </div>
                  )}
                </div>

                <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedPaymentDetail(null)}
                  >
                    Close
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Super Admin Bank & UPI QR Configurator Drawer */}
        <Sheet open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <QrCode className="size-5 text-primary" />
                <span>Super Admin Payment & UPI QR Setup</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Configure your official bank and UPI QR details shown to tenant store merchants when
                upgrading plans.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveConfigMutation.mutate(paymentConfig);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-bank-name">Bank Name</Label>
                    <Input
                      id="cfg-bank-name"
                      value={paymentConfig.bankName}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, bankName: e.target.value })
                      }
                      placeholder="HDFC Bank / State Bank of India"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-acc-name">Account Holder Name</Label>
                    <Input
                      id="cfg-acc-name"
                      value={paymentConfig.accountName}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, accountName: e.target.value })
                      }
                      placeholder="OneDesk360 Cloud Technologies"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-acc-no">Bank Account Number</Label>
                    <Input
                      id="cfg-acc-no"
                      value={paymentConfig.accountNo}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, accountNo: e.target.value })
                      }
                      placeholder="50200012345678"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-ifsc">IFSC / Routing Code</Label>
                    <Input
                      id="cfg-ifsc"
                      value={paymentConfig.ifscCode}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, ifscCode: e.target.value })
                      }
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-upi">UPI VPA Address</Label>
                    <Input
                      id="cfg-upi"
                      value={paymentConfig.upiId}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, upiId: e.target.value })
                      }
                      placeholder="onedesk360@okaxis"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cfg-qr">UPI QR Code Image URL</Label>
                    <Input
                      id="cfg-qr"
                      value={paymentConfig.qrCodeUrl}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, qrCodeUrl: e.target.value })
                      }
                      placeholder="https://example.com/upi-qr.png"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cfg-instructions">Payment Submission Instructions</Label>
                  <Textarea
                    id="cfg-instructions"
                    rows={3}
                    value={paymentConfig.instructions}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, instructions: e.target.value })
                    }
                    placeholder="Scan the QR code or transfer to the account above and submit your 12-digit UTR for immediate verification."
                  />
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveConfigMutation.isPending}>
                  {saveConfigMutation.isPending ? "Saving Details…" : "Save Payment Details"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
