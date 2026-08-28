import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { MessageCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support Inbox · Super Admin OneDesk360" }] }),
  component: SuperAdminSupportPage,
});

function SuperAdminSupportPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Support Inbox & Tickets</h2>
          <p className="text-sm text-muted-foreground">
            Manage inquiries, ticket resolutions, and merchant assistance
          </p>
        </div>

        <div className="rounded-xl border bg-card p-12 text-center">
          <MessageCircle className="size-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">Support Helpdesk Ready</h3>
          <p className="text-sm text-muted-foreground">
            Merchant support tickets and inquiries will appear here.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
