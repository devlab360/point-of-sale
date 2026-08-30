import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Book,
  Phone,
  Video,
  Star,
  Send,
  Loader2,
  Search,
  HelpCircle,
  LifeBuoy,
  FileText,
  ChevronDown,
  Headphones,
  Mail,
  ThumbsUp,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getHelpArticlesFn, getFaqsFn, createSupportTicketFn, createReviewFn } from "@/api/support";
import { getSalesFn } from "@/api/sales";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Knowledge Center · OneDesk360" }] }),
  component: HelpPage,
});

function HelpPage() {
  const [activeTab, setActiveTab] = useState<"docs" | "videos" | "faqs" | "warranty">("docs");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [serialSearchQuery, setSerialSearchQuery] = useState("");

  // Chat form
  const [chatSubject, setChatSubject] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatPriority, setChatPriority] = useState("normal");

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["help_articles"],
    queryFn: async () => ((await getHelpArticlesFn({ data: {} })) as any).data || [],
  });

  const { data: faqs = [], isLoading: loadingFaqs } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => ((await getFaqsFn({ data: {} })) as any).data || [],
  });

  const { data: allSales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["salesForWarranty"],
    queryFn: async () => ((await getSalesFn({ data: { pageSize: 500 } })) as any).data || [],
    enabled: activeTab === "warranty",
  });

  const chatMutation = useMutation({
    mutationFn: async (data: any) => createSupportTicketFn({ data }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Support ticket logged successfully! Our team will respond shortly.");
        setIsChatOpen(false);
        setChatSubject("");
        setChatMessage("");
      } else toast.error(res.error || "Failed to submit ticket");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => createReviewFn({ data }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success("Thank you for your rating & feedback!");
        setIsReviewOpen(false);
        setReviewRating(5);
        setReviewComment("");
      } else toast.error(res.error || "Failed to submit review");
    },
  });

  const filteredDocs = articles
    .filter((a: any) => a.type !== "video")
    .filter(
      (a: any) =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredVideos = articles
    .filter((a: any) => a.type === "video")
    .filter(
      (a: any) =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredFaqs = faqs.filter(
    (f: any) =>
      f.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Help & Knowledge Center"
        description="Search setup manuals, watch video walkthroughs, browse FAQs, or open a technical support ticket."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReviewOpen(true)}
              className="gap-1.5"
            >
              <Star className="size-4 text-warning fill-warning" /> Rate App
            </Button>
            <Button
              size="sm"
              onClick={() => setIsChatOpen(true)}
              className="gap-1.5"
            >
              <Headphones className="size-4" /> Support Ticket
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("docs")}
          className="cursor-pointer transition-all hover:scale-[1.02]"
        >
          <StatCard
            label="Documentation Guides"
            value={`${filteredDocs.length} Guides`}
            hint="Step-by-step manuals"
            icon={Book}
            accent="primary"
          />
        </div>
        <div
          onClick={() => setActiveTab("videos")}
          className="cursor-pointer transition-all hover:scale-[1.02]"
        >
          <StatCard
            label="Video Tutorials"
            value={`${filteredVideos.length} Masterclasses`}
            hint="Hands-on walkthroughs"
            icon={Video}
            accent="info"
          />
        </div>
        <div
          onClick={() => setActiveTab("faqs")}
          className="cursor-pointer transition-all hover:scale-[1.02]"
        >
          <StatCard
            label="Frequently Asked Questions"
            value={`${filteredFaqs.length} Answers`}
            hint="Immediate solutions"
            icon={HelpCircle}
            accent="warning"
          />
        </div>
        <div
          onClick={() => setIsChatOpen(true)}
          className="cursor-pointer transition-all hover:scale-[1.02]"
        >
          <StatCard
            label="Technical Support"
            value="24/7 Available"
            hint="Direct engineer escalation"
            icon={Headphones}
            accent="success"
          />
        </div>
      </div>

      {/* Search Bar & Tab Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, setup tutorials, FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border/80 bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab("docs")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "docs"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Documentation ({filteredDocs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "videos"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Video Guides ({filteredVideos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "faqs"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            FAQs ({filteredFaqs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("warranty")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "warranty"
                ? "bg-card text-foreground shadow-sm font-bold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            Warranty Check
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "docs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc: any) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      {doc.category || "General"}
                    </Badge>
                    <Book className="size-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {doc.content}
                  </p>
                </div>
                <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Help Manual</span>
                  <span className="font-semibold text-primary">Read Guide →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "videos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredVideos.map((vid: any) => (
            <div
              key={vid.id}
              className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-soft flex flex-col justify-between group"
            >
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    Video
                  </Badge>
                  <Video className="size-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {vid.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {vid.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "faqs" && (
        <div className="space-y-3">
          {filteredFaqs.map((faq: any) => {
            const isOpen = expandedFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left font-bold text-sm text-foreground gap-4"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <p className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🛡️ Warranty & Guarantee Verification Lookup */}
      {activeTab === "warranty" && (
        <div className="space-y-6">
          {/* Search Card */}
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-6 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/25 grid place-items-center text-primary shadow-xs">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Digital Warranty & Guarantee Verification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Look up product purchase dates, registered serials/IMEIs, and live warranty coverage status.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Enter Serial Number (SN-xxx), IMEI, or Invoice ID (e.g. INV-2026-001)..."
                value={serialSearchQuery}
                onChange={(e) => setSerialSearchQuery(e.target.value)}
                className="pl-10 h-12 text-sm sm:text-base font-medium rounded-2xl bg-card border-border/80 shadow-xs"
                autoFocus
              />
            </div>
          </div>

          {/* Results List */}
          {loadingSales ? (
            <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" /> Searching warranty records...
            </div>
          ) : (
            (() => {
              const q = serialSearchQuery.toLowerCase().trim();
              const matchedWarrantyItems: any[] = [];

              (allSales || []).forEach((sale: any) => {
                const lines = Array.isArray(sale.lines) ? sale.lines : [];
                lines.forEach((l: any) => {
                  const meta = l.product?.metadata || {};
                  const serial = l.selectedSerial || "";
                  const invId = sale.invoiceNumber || sale.id || "";
                  const prodName = l.product?.name || "";

                  const matchQuery =
                    !q ||
                    serial.toLowerCase().includes(q) ||
                    invId.toLowerCase().includes(q) ||
                    prodName.toLowerCase().includes(q);

                  if (matchQuery && (meta.hasWarranty || serial || l.product?.hasSerial)) {
                    const saleDate = new Date(sale.createdAt || sale.date || new Date());
                    const warrantyMonths = Number(meta.warrantyMonths || 12);
                    const guaranteeMonths = Number(meta.guaranteeMonths || 0);

                    const warrantyExpiryDate = new Date(saleDate);
                    warrantyExpiryDate.setMonth(warrantyExpiryDate.getMonth() + warrantyMonths);

                    const guaranteeExpiryDate = new Date(saleDate);
                    guaranteeExpiryDate.setMonth(guaranteeExpiryDate.getMonth() + guaranteeMonths);

                    const now = new Date();
                    const isWarrantyValid = warrantyExpiryDate.getTime() > now.getTime();
                    const isGuaranteeValid = guaranteeMonths > 0 && guaranteeExpiryDate.getTime() > now.getTime();

                    const daysRemaining = Math.max(
                      0,
                      Math.ceil((warrantyExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    );

                    matchedWarrantyItems.push({
                      sale,
                      line: l,
                      meta,
                      serial,
                      saleDate,
                      warrantyMonths,
                      guaranteeMonths,
                      warrantyExpiryDate,
                      guaranteeExpiryDate,
                      isWarrantyValid,
                      isGuaranteeValid,
                      daysRemaining,
                    });
                  }
                });
              });

              if (matchedWarrantyItems.length === 0) {
                return (
                  <div className="p-12 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10 space-y-2">
                    <ShieldCheck className="size-10 text-muted-foreground/40 mx-auto" />
                    <h4 className="font-bold text-sm text-foreground">
                      {serialSearchQuery ? "No Warranty Record Found" : "Search to Verify Warranty"}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {serialSearchQuery
                        ? `No serialized sale matched "${serialSearchQuery}". Check if the serial or invoice number is typed correctly.`
                        : "Type any product serial number, customer mobile, or receipt number above to check warranty validity."}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedWarrantyItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl border border-border/80 bg-card p-5 shadow-soft space-y-3.5 hover:border-primary/40 transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-foreground">
                            {item.line.product.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Invoice: <strong className="text-foreground">#{String(item.sale.invoiceNumber || item.sale.id).slice(0, 12)}</strong>
                            {" • "}
                            Sold on: {item.saleDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            item.isWarrantyValid
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                              : "bg-destructive/10 text-destructive border-destructive/30 font-bold"
                          }
                        >
                          {item.isWarrantyValid ? `Active (${item.daysRemaining}d left)` : "Expired"}
                        </Badge>
                      </div>

                      {/* Specs Body */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Serial / IMEI No.
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {item.serial || "Standard Sku Sale"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Customer
                          </span>
                          <span className="font-semibold text-foreground truncate block">
                            {item.sale.customer?.name || item.sale.customerName || "Walk-in Customer"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Warranty Period
                          </span>
                          <span className="font-bold text-foreground">
                            {item.warrantyMonths} Months ({item.meta.warrantyType || "Carry-In"})
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Valid Until
                          </span>
                          <span className={`font-bold ${item.isWarrantyValid ? "text-emerald-600" : "text-destructive"}`}>
                            {item.warrantyExpiryDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>

                      {item.guaranteeMonths > 0 && (
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                          <span>Replacement Guarantee: {item.guaranteeMonths} Months</span>
                          <span className="font-bold">{item.isGuaranteeValid ? "Active ✓" : "Guarantee Expired"}</span>
                        </div>
                      )}

                      {item.meta.warrantyPolicy && (
                        <p className="text-[11px] text-muted-foreground italic">
                          Policy: {item.meta.warrantyPolicy}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Support Ticket Modal */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                Open Support Ticket
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Submit your inquiry or issue directly to our technical support team.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatSubject.trim() || !chatMessage.trim()) return;
                chatMutation.mutate({
                  subject: chatSubject.trim(),
                  message: chatMessage.trim(),
                  priority: chatPriority,
                });
              }}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inquiry Subject *</Label>
                  <Input
                    value={chatSubject}
                    onChange={(e) => setChatSubject(e.target.value)}
                    placeholder="e.g. Receipt printer alignment issue"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <select
                    value={chatPriority}
                    onChange={(e) => setChatPriority(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="low">Low - General Question</option>
                    <option value="normal">Normal - Operational Inquiry</option>
                    <option value="urgent">Urgent - Register Blocked</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Detailed Description *</Label>
                  <Textarea
                    rows={4}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Describe what happened and any steps to reproduce..."
                    required
                  />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChatOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={chatMutation.isPending}
                >
                  {chatMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                  Submit Ticket
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Review Modal */}
      <Sheet open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                Rate Experience & Feedback
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Help us enhance your POS and retail workflows with your valuable feedback.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reviewMutation.mutate({
                  rating: reviewRating,
                  comment: reviewComment.trim(),
                });
              }}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Rating</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`size-6 ${
                            star <= reviewRating
                              ? "text-warning fill-warning"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Comments & Feedback</Label>
                  <Textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="What features or improvements would you love to see?"
                  />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReviewOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                  Submit Feedback
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
