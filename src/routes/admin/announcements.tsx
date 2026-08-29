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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getBroadcastAnnouncementsAdminFn,
  saveBroadcastAnnouncementAdminFn,
  toggleBroadcastAnnouncementAdminFn,
  deleteBroadcastAnnouncementAdminFn,
} from "@/api/admin/super-admin";
import {
  Megaphone,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  Store,
  Users,
  Eye,
  Radio,
  Download,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Broadcast Announcements · Super Admin OneDesk360" }] }),
  component: SuperAdminAnnouncementsPage,
});

function SuperAdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState<{
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "update";
    audience: "all" | "trial" | "active";
    active: boolean;
  }>({
    title: "",
    message: "",
    type: "info",
    audience: "all",
    active: true,
  });

  const { data: announcementsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["super-admin-broadcast-announcements"],
    queryFn: () => getBroadcastAnnouncementsAdminFn({ data: {} }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newAnnouncement) =>
      saveBroadcastAnnouncementAdminFn({ data }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Broadcast announcement published to merchant stores!");
        setIsCreateOpen(false);
        setNewAnnouncement({
          title: "",
          message: "",
          type: "info",
          audience: "all",
          active: true,
        });
        queryClient.invalidateQueries({ queryKey: ["super-admin-broadcast-announcements"] });
      } else {
        toast.error(res.error || "Failed to publish announcement");
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleBroadcastAnnouncementAdminFn({ data: { id, active } }),
    onSuccess: () => {
      toast.success("Broadcast visibility updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-broadcast-announcements"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBroadcastAnnouncementAdminFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["super-admin-broadcast-announcements"] });
    },
  });

  const announcements = (announcementsData?.data as any[]) || [];
  const activeCount = announcements.filter((a: any) => a.active).length;

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="Merchant Broadcasts & System Notices"
          description="Send live broadcast banners, maintenance alerts, and new feature notices across all store merchant dashboards."
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
                  const exportRows = announcements.map((a: any) => ({
                    ID: a.id,
                    Title: a.title,
                    Message: a.message,
                    Type: a.type,
                    Audience: a.audience,
                    Active: a.active ? "Yes" : "No",
                    CreatedAt: new Date(a.createdAt).toLocaleDateString(),
                  }));
                  exportToCSV("Merchant_Broadcast_Announcements", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="gap-1.5 h-9 shadow-xs"
              >
                <Plus className="size-4" />
                <span>New Broadcast Notice</span>
              </Button>
            </div>
          }
        />

        {/* Top StatCards KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Broadcasts Created"
            value={String(announcements.length)}
            hint="All recorded notices"
            icon={Megaphone}
            accent="primary"
          />
          <StatCard
            label="Live Active Broadcasts"
            value={String(activeCount)}
            hint={activeCount > 0 ? "Currently visible to merchants" : "No active banner"}
            icon={Radio}
            accent={activeCount > 0 ? "success" : "info"}
          />
          <StatCard
            label="Instant Cloud Broadcast"
            value="Realtime Sync"
            hint="Renders in merchant header banner"
            icon={Sparkles}
            accent="warning"
          />
        </div>

        {/* Announcements Catalog Table */}
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">
              Broadcast Announcements Directory
            </h3>
            <span className="text-xs text-muted-foreground">
              {announcements.length} records
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-xs text-muted-foreground">
              Loading broadcast announcements…
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <Megaphone className="size-8 mx-auto text-muted-foreground/40" />
              <h4 className="font-bold text-sm text-foreground">No Broadcast Announcements Yet</h4>
              <p className="text-xs text-muted-foreground">
                Create your first platform announcement to notify store merchants of updates or maintenance.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="mt-3 gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Create Announcement</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase">
                  <TableRow>
                    <TableHead className="px-4 py-3.5">Announcement Content</TableHead>
                    <TableHead className="px-4 py-3.5">Type</TableHead>
                    <TableHead className="px-4 py-3.5">Audience</TableHead>
                    <TableHead className="px-4 py-3.5">Active / Live</TableHead>
                    <TableHead className="px-4 py-3.5">Created Date</TableHead>
                    <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-4 py-3.5 max-w-md">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          {item.type === "warning" && <AlertCircle className="size-3.5 text-amber-500 shrink-0" />}
                          {item.type === "success" && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />}
                          {item.type === "info" && <Info className="size-3.5 text-blue-500 shrink-0" />}
                          {item.type === "update" && <Sparkles className="size-3.5 text-purple-500 shrink-0" />}
                          <span>{item.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.message}
                        </p>
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            item.type === "warning"
                              ? "text-amber-600 border-amber-500/30 bg-amber-500/10"
                              : item.type === "success"
                              ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              : item.type === "update"
                              ? "text-purple-600 border-purple-500/30 bg-purple-500/10"
                              : "text-blue-600 border-blue-500/30 bg-blue-500/10"
                          }`}
                        >
                          {item.type}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                          {item.audience === "all"
                            ? "All Merchants"
                            : item.audience === "trial"
                            ? "Trial Stores Only"
                            : "Active Paid Stores"}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: item.id, active: checked })
                            }
                          />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {item.active ? "Live" : "Hidden"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete announcement "${item.title}"?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Create Broadcast Announcement Drawer */}
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                New Broadcast Announcement
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Publish a high-visibility alert banner displayed on all merchant store admin dashboards.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newAnnouncement);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bc-title">Announcement Headline</Label>
                  <Input
                    id="bc-title"
                    required
                    value={newAnnouncement.title}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, title: e.target.value })
                    }
                    placeholder="e.g. Scheduled System Upgrade at 2:00 AM"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bc-type">Banner Alert Type</Label>
                  <Select
                    value={newAnnouncement.type}
                    onValueChange={(val: any) =>
                      setNewAnnouncement({ ...newAnnouncement, type: val })
                    }
                  >
                    <SelectTrigger id="bc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (Blue)</SelectItem>
                      <SelectItem value="warning">Warning / Maintenance (Amber)</SelectItem>
                      <SelectItem value="success">Success / Promo (Emerald)</SelectItem>
                      <SelectItem value="update">New Feature Update (Purple)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bc-audience">Target Audience</Label>
                  <Select
                    value={newAnnouncement.audience}
                    onValueChange={(val: any) =>
                      setNewAnnouncement({ ...newAnnouncement, audience: val })
                    }
                  >
                    <SelectTrigger id="bc-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores (Active + Trial)</SelectItem>
                      <SelectItem value="trial">Trial Stores Only (Upsell/Tips)</SelectItem>
                      <SelectItem value="active">Paid Active Stores Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bc-message">Announcement Message</Label>
                  <Textarea
                    id="bc-message"
                    required
                    rows={4}
                    value={newAnnouncement.message}
                    onChange={(e) =>
                      setNewAnnouncement({ ...newAnnouncement, message: e.target.value })
                    }
                    placeholder="Describe the update, maintenance window, or announcement in detail..."
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div>
                    <Label htmlFor="bc-active" className="text-xs font-bold text-foreground">
                      Make Active Immediately
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Show in top store banners right after saving.
                    </p>
                  </div>
                  <Switch
                    id="bc-active"
                    checked={newAnnouncement.active}
                    onCheckedChange={(checked) =>
                      setNewAnnouncement({ ...newAnnouncement, active: checked })
                    }
                  />
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Publishing…" : "Publish Announcement"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
