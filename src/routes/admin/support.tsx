import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Store,
  User,
  ArrowRight,
  ShieldAlert,
  Download,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
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
import { toast } from "sonner";
import {
  getAllSupportTicketsAdminFn,
  updateSupportTicketStatusAdminFn,
} from "@/api/admin/super-admin";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support Inbox · Super Admin OneDesk360" }] }),
  component: SuperAdminSupportPage,
});

function SuperAdminSupportPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in-progress" | "resolved" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { data: ticketsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["super-admin-support-tickets"],
    queryFn: () => getAllSupportTicketsAdminFn({ data: {} }),
  });

  const tickets = (ticketsData?.data as any[]) || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      updateSupportTicketStatusAdminFn({ data: { ticketId, status } }),
    onSuccess: (_, variables) => {
      toast.success(`Ticket marked as ${variables.status}`);
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: variables.status });
      }
      queryClient.invalidateQueries({ queryKey: ["super-admin-support-tickets"] });
    },
  });

  const openTicketsCount = tickets.filter((t: any) => t.status === "open").length;
  const inProgressCount = tickets.filter((t: any) => t.status === "in-progress").length;
  const resolvedCount = tickets.filter((t: any) => t.status === "resolved").length;
  const closedCount = tickets.filter((t: any) => t.status === "closed").length;

  const filteredTickets = tickets
    .filter((t: any) => {
      if (statusFilter === "all") return true;
      return t.status === statusFilter;
    })
    .filter((t: any) => {
      const q = searchQuery.toLowerCase();
      return (
        t.subject?.toLowerCase().includes(q) ||
        t.message?.toLowerCase().includes(q) ||
        t.orgName?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.orgEmail?.toLowerCase().includes(q)
      );
    });

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="Support Inbox & Merchant Helpdesk"
          description="Review merchant support tickets, technical inquiries, and resolution workflows across all stores."
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
                  const exportRows = filteredTickets.map((t: any) => ({
                    ID: t.id,
                    StoreName: t.orgName || t.organizationId,
                    Submitter: t.userName || t.orgEmail || "Store Owner",
                    Subject: t.subject,
                    Message: t.message,
                    Status: t.status,
                    CreatedAt: new Date(t.createdAt).toLocaleDateString(),
                  }));
                  exportToCSV("Merchant_Support_Tickets", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          }
        />

        {/* Top Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Support Inquiries"
            value={String(tickets.length)}
            hint="Submitted merchant tickets"
            icon={MessageCircle}
            accent="primary"
          />
          <StatCard
            label="Open Unresolved"
            value={String(openTicketsCount)}
            hint={openTicketsCount > 0 ? "Awaiting response" : "All cleared"}
            icon={AlertCircle}
            accent={openTicketsCount > 0 ? "destructive" : "info"}
          />
          <StatCard
            label="In Progress"
            value={String(inProgressCount)}
            hint="Being actively worked on"
            icon={Clock}
            accent="warning"
          />
          <StatCard
            label="Resolved / Closed"
            value={String(resolvedCount + closedCount)}
            hint="Completed resolutions"
            icon={CheckCircle2}
            accent="success"
          />
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-xl border text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Tickets ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("open")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === "open" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Open</span>
              {openTicketsCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 font-black">
                  {openTicketsCount}
                </Badge>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in-progress")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "in-progress" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "resolved" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("closed")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "closed" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Closed ({closedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search subject, store, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 text-xs"
            />
          </div>
        </div>

        {/* Tickets Table */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading support tickets…</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-16 space-y-3">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <MessageCircle className="size-6 opacity-40" />
              </div>
              <h3 className="font-bold text-base text-foreground">No Support Tickets Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active tickets match your criteria. All customer inquiries are handled.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                <TableRow>
                  <TableHead className="px-4 py-3.5">Store & Sender</TableHead>
                  <TableHead className="px-4 py-3.5">Subject & Inquiry</TableHead>
                  <TableHead className="px-4 py-3.5">Submitted Date</TableHead>
                  <TableHead className="px-4 py-3.5">Status</TableHead>
                  <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket: any) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-4 py-3.5">
                      <div className="font-bold text-foreground">
                        {ticket.orgName || ticket.organizationId}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{ticket.userName || ticket.orgEmail || "Store Owner"}</div>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 max-w-md">
                      <div className="font-bold text-xs text-foreground truncate">
                        {ticket.subject || "Support Inquiry"}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {ticket.message}
                      </p>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="px-4 py-3.5">
                      <Badge
                        variant={
                          ticket.status === "resolved"
                            ? "default"
                            : ticket.status === "in-progress"
                            ? "secondary"
                            : ticket.status === "closed"
                            ? "outline"
                            : "destructive"
                        }
                        className="text-[10px] font-bold uppercase"
                      >
                        {ticket.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold gap-1"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        View & Respond
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Ticket Detail & Status Drawer */}
        <Sheet open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Ticket Details: {selectedTicket?.subject || "Support Inquiry"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Review message from {selectedTicket?.orgName || "Merchant Store"} and update ticket state.
              </SheetDescription>
            </SheetHeader>

            {selectedTicket && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Store Organization:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {selectedTicket.orgName || selectedTicket.organizationId}
                        </span>
                        <Link to="/admin/tenants">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 gap-1">
                            <Store className="size-3" /> View Store
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitter:</span>
                      <span className="text-foreground font-medium">{selectedTicket.userName || selectedTicket.orgEmail || "Store Owner"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Received Date:</span>
                      <span className="font-mono text-foreground">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Current State:</span>
                      <Badge
                        variant={
                          selectedTicket.status === "resolved"
                            ? "default"
                            : selectedTicket.status === "in-progress"
                            ? "secondary"
                            : selectedTicket.status === "closed"
                            ? "outline"
                            : "destructive"
                        }
                        className="text-[10px] font-bold uppercase"
                      >
                        {selectedTicket.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-foreground">Inquiry Message</p>
                    <div className="p-3.5 rounded-xl border bg-card text-xs text-foreground whitespace-pre-wrap leading-relaxed shadow-2xs">
                      {selectedTicket.message}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-bold text-foreground">Update Resolution Status</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedTicket.status === "in-progress" ? "default" : "outline"}
                        className="h-9 text-xs font-semibold"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            ticketId: selectedTicket.id,
                            status: "in-progress",
                          })
                        }
                      >
                        In Progress
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedTicket.status === "resolved" ? "default" : "outline"}
                        className="h-9 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            ticketId: selectedTicket.id,
                            status: "resolved",
                          })
                        }
                      >
                        Mark Resolved
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedTicket.status === "closed" ? "default" : "outline"}
                        className="h-9 text-xs font-semibold text-muted-foreground"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            ticketId: selectedTicket.id,
                            status: "closed",
                          })
                        }
                      >
                        Close Ticket
                      </Button>
                    </div>
                  </div>
                </div>

                <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end shrink-0">
                  <Button type="button" variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                    Close Drawer
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
