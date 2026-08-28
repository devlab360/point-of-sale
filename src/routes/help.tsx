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
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getHelpArticlesFn, getFaqsFn, createSupportTicketFn, createReviewFn } from "@/api/support";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [activeTab, setActiveTab] = useState<"docs" | "videos" | "faqs">("docs");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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

      {/* Support Ticket Modal */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              Open Support Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit your inquiry or issue directly to our technical support team.
            </DialogDescription>
          </DialogHeader>

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
            className="space-y-3.5 py-2"
          >
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

            <DialogFooter className="gap-2 pt-2">
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              Rate Experience & Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Help us enhance your POS and retail workflows with your valuable feedback.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              reviewMutation.mutate({
                rating: reviewRating,
                comment: reviewComment.trim(),
              });
            }}
            className="space-y-3.5 py-2"
          >
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

            <DialogFooter className="gap-2 pt-2">
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
