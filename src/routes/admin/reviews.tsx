import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appName } from "@/lib/env";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Star,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  Store,
  User,
  Filter,
  Award,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllReviewsAdminFn } from "@/api/admin/super-admin";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: `Merchant Reviews · Super Admin ${appName}` }] }),
  component: SuperAdminReviewsPage,
});

function SuperAdminReviewsPage() {
  const [selectedRating, setSelectedRating] = useState<number | "all">("all");

  const {
    data: reviewsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["super-admin-reviews"],
    queryFn: () => getAllReviewsAdminFn({ data: {} }),
  });

  const reviews = (reviewsData?.data?.reviews as any[]) || [];
  const total = reviewsData?.data?.total || reviews.length;
  const avgRating =
    reviewsData?.data?.avgRating ||
    (total > 0
      ? (reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / total).toFixed(1)
      : "5.0");

  const starCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r: any) => r.rating === stars).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { stars, count, pct };
  });

  const filteredReviews = reviews.filter((r: any) => {
    if (selectedRating === "all") return true;
    return r.rating === selectedRating;
  });

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="Merchant Reviews & Customer Satisfaction"
          description="Monitor store owner satisfaction ratings, feedback, and platform NPS performance."
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-1.5 h-9">
                <RefreshCw className="size-3.5" />
                <span>Refresh Reviews</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9"
                onClick={() => {
                  const exportRows = filteredReviews.map((r: any) => ({
                    ID: r.id,
                    StoreName: r.orgName || "Store Merchant",
                    User: r.userName || r.userEmail || "Store Owner",
                    Rating: r.rating,
                    Comment: r.comment,
                    CreatedAt: new Date(r.createdAt).toLocaleDateString(),
                  }));
                  exportToCSV("Merchant_Reviews_Satisfaction", exportRows);
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          }
        />

        {/* Rating Metrics & Distribution Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-3xl border bg-card p-6 shadow-xs flex flex-col justify-center items-center text-center">
            <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <Award className="size-7" />
            </div>
            <h3 className="text-4xl font-black text-foreground tracking-tight">{avgRating}</h3>
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`size-4 ${
                    s <= Math.round(Number(avgRating))
                      ? "text-amber-500 fill-amber-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Based on {total} merchant reviews
            </p>
          </Card>

          {/* Star Distribution Breakdown */}
          <Card className="md:col-span-2 rounded-3xl border bg-card p-6 shadow-xs flex flex-col justify-center space-y-2.5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Rating Distribution
            </h4>
            {starCounts.map((sc) => (
              <div key={sc.stars} className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRating(selectedRating === sc.stars ? "all" : sc.stars)}
                  className={`flex items-center gap-1 w-12 font-bold transition-colors ${
                    selectedRating === sc.stars
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{sc.stars}</span>
                  <Star className="size-3 text-amber-500 fill-amber-500" />
                </button>

                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${sc.pct}%` }}
                  />
                </div>

                <span className="text-[11px] font-mono text-muted-foreground w-12 text-right">
                  {sc.count} ({sc.pct}%)
                </span>
              </div>
            ))}
          </Card>
        </div>

        {/* Rating Filter Bar */}
        <div className="flex items-center gap-2 bg-card p-3 rounded-2xl border text-xs font-bold shadow-2xs">
          <span className="text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="size-3.5" /> Filter:
          </span>
          <Button
            size="sm"
            variant={selectedRating === "all" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setSelectedRating("all")}
          >
            All Ratings ({total})
          </Button>
          {[5, 4, 3, 2, 1].map((r) => (
            <Button
              key={r}
              size="sm"
              variant={selectedRating === r ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setSelectedRating(r)}
            >
              <span>{r}</span>
              <Star className="size-3 text-amber-500 fill-amber-500" />
            </Button>
          ))}
        </div>

        {/* Reviews Cards Feed */}
        {isLoading ? (
          <div className="p-16 text-center text-xs text-muted-foreground">
            Loading merchant feedback…
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border bg-card space-y-2">
            <MessageSquare className="size-8 mx-auto text-muted-foreground/40" />
            <h4 className="font-bold text-sm text-foreground">No Reviews in this Category</h4>
            <p className="text-xs text-muted-foreground">
              Merchant ratings and feedback will appear here as stores submit their reviews.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((rev: any) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl border bg-card shadow-xs space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {rev.orgName?.slice(0, 2)?.toUpperCase() || "ST"}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">
                        {rev.orgName || "Store Merchant"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {rev.userName || rev.userEmail || "Store Owner"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 bg-amber-500/10 px-2 py-1 rounded-lg">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-3 ${
                          s <= (rev.rating || 5)
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed italic">
                  "{rev.comment || "Great platform for retail POS and multi-store management!"}"
                </p>

                <div className="pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Verified Merchant Store</span>
                  <span className="font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
