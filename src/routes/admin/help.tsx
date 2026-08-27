import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/admin/help")({
  head: () => ({ meta: [{ title: "Help Center · Super Admin OneDesk360" }] }),
  component: SuperAdminHelpPage,
});

function SuperAdminHelpPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Help Center & Documentation</h2>
          <p className="text-sm text-muted-foreground">
            Manage onboarding articles, video tutorials, and merchant documentation
          </p>
        </div>

        <div className="rounded-xl border bg-card p-12 text-center">
          <BookOpen className="size-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">Help Center Portal</h3>
          <p className="text-sm text-muted-foreground">Published help center documentation and videos.</p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
