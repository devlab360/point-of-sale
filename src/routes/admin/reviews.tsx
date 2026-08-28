import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Star } from "lucide-react";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Merchant Reviews · Super Admin OneDesk360" }] }),
  component: SuperAdminReviewsPage,
});

function SuperAdminReviewsPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Merchant Reviews & Feedback</h2>
          <p className="text-sm text-muted-foreground">
            Platform feedback and store owner satisfaction ratings
          </p>
        </div>

        <div className="rounded-xl border bg-card p-12 text-center">
          <Star className="size-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <h3 className="font-semibold text-lg">Merchant Feedback Portal</h3>
          <p className="text-sm text-muted-foreground">
            Tenant ratings and feature feedback will be listed here.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
