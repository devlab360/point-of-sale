import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appName } from "@/lib/env";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  BookOpen,
  Video,
  FileText,
  Plus,
  Trash2,
  HelpCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Loader2,
  Sparkles,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import {
  getHelpArticlesAdminFn,
  createHelpArticleAdminFn,
  deleteHelpArticleAdminFn,
  createFaqAdminFn,
  deleteFaqAdminFn,
} from "@/api/admin/super-admin";
import { exportToCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/admin/help")({
  head: () => ({ meta: [{ title: `Help Center · Super Admin ${appName}` }] }),
  component: SuperAdminHelpPage,
});

function SuperAdminHelpPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"articles" | "faqs">("articles");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: "",
    type: "doc" as "doc" | "video",
    content: "",
  });

  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  const {
    data: helpData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["super-admin-help"],
    queryFn: () => getHelpArticlesAdminFn({ data: {} }),
  });

  const articles = (helpData?.data?.articles as any[]) || [];
  const faqs = (helpData?.data?.faqs as any[]) || [];

  const videoArticlesCount = articles.filter((a: any) => a.type === "video").length;
  const docArticlesCount = articles.filter((a: any) => a.type !== "video").length;

  const createArticleMutation = useMutation({
    mutationFn: (data: any) => createHelpArticleAdminFn({ data }),
    onSuccess: () => {
      toast.success("Help article published!");
      setIsArticleModalOpen(false);
      setNewArticle({ title: "", type: "doc", content: "" });
      queryClient.invalidateQueries({ queryKey: ["super-admin-help"] });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => deleteHelpArticleAdminFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Article deleted");
      queryClient.invalidateQueries({ queryKey: ["super-admin-help"] });
    },
  });

  const createFaqMutation = useMutation({
    mutationFn: (data: any) => createFaqAdminFn({ data }),
    onSuccess: () => {
      toast.success("FAQ published!");
      setIsFaqModalOpen(false);
      setNewFaq({ question: "", answer: "" });
      queryClient.invalidateQueries({ queryKey: ["super-admin-help"] });
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => deleteFaqAdminFn({ data: { id } }),
    onSuccess: () => {
      toast.success("FAQ deleted");
      queryClient.invalidateQueries({ queryKey: ["super-admin-help"] });
    },
  });

  const filteredArticles = articles.filter(
    (a) =>
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SuperAdminLayout>
      <div className="page-container space-y-6">
        {/* Header */}
        <PageHeader
          title="Help Center, Guides & Merchant FAQs"
          description="Create and publish documentation guides, video tutorials, and interactive answers for merchant stores."
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
                  if (activeTab === "articles") {
                    const exportRows = articles.map((a: any) => ({
                      ID: a.id,
                      Title: a.title,
                      Type: a.type,
                      Content: a.content,
                      PublishedAt: new Date(a.createdAt).toLocaleDateString(),
                    }));
                    exportToCSV("Merchant_Help_Articles", exportRows);
                  } else {
                    const exportRows = faqs.map((f: any) => ({
                      ID: f.id,
                      Question: f.question,
                      Answer: f.answer,
                      PublishedAt: new Date(f.createdAt).toLocaleDateString(),
                    }));
                    exportToCSV("Merchant_FAQs", exportRows);
                  }
                }}
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
              {activeTab === "articles" ? (
                <Button
                  onClick={() => setIsArticleModalOpen(true)}
                  size="sm"
                  className="gap-2 h-9 shadow-xs"
                >
                  <Plus className="size-4" />
                  <span>New Guide / Video</span>
                </Button>
              ) : (
                <Button
                  onClick={() => setIsFaqModalOpen(true)}
                  size="sm"
                  className="gap-2 h-9 shadow-xs"
                >
                  <Plus className="size-4" />
                  <span>New FAQ Entry</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Documentation Guides"
            value={String(docArticlesCount)}
            hint="Step-by-step written articles"
            icon={FileText}
            accent="primary"
          />
          <StatCard
            label="Video Tutorials"
            value={String(videoArticlesCount)}
            hint="Visual onboarding videos"
            icon={Video}
            accent="info"
          />
          <StatCard
            label="Merchant FAQs"
            value={String(faqs.length)}
            hint="Instant merchant answers"
            icon={HelpCircle}
            accent="success"
          />
        </div>

        {/* Tab & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("articles")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "articles"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5" />
              <span>Articles & Videos ({articles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("faqs")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "faqs"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="size-3.5" />
              <span>Merchant FAQs ({faqs.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search guides or FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 text-xs"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Loading documentation…</p>
          </div>
        ) : activeTab === "articles" ? (
          filteredArticles.length === 0 ? (
            <div className="p-16 text-center rounded-2xl border bg-card space-y-3">
              <BookOpen className="size-8 mx-auto text-muted-foreground/40" />
              <h4 className="font-bold text-sm text-foreground">No Help Articles Found</h4>
              <p className="text-xs text-muted-foreground">
                Publish documentation guides or video tutorials to assist store staff.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map((art: any) => (
                <div
                  key={art.id}
                  className="p-5 rounded-2xl border bg-card shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={art.type === "video" ? "default" : "secondary"}
                        className="text-[10px] gap-1 font-bold"
                      >
                        {art.type === "video" ? (
                          <Video className="size-3" />
                        ) : (
                          <FileText className="size-3" />
                        )}
                        {art.type === "video" ? "Video Tutorial" : "Documentation"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(art.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground">{art.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {art.content}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete article "${art.title}"?`)) {
                          deleteArticleMutation.mutate(art.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredFaqs.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border bg-card space-y-3">
            <HelpCircle className="size-8 mx-auto text-muted-foreground/40" />
            <h4 className="font-bold text-sm text-foreground">No FAQs Configured</h4>
            <p className="text-xs text-muted-foreground">
              Add frequently asked questions for quick answers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq: any) => (
              <div
                key={faq.id}
                className="p-4 rounded-2xl border bg-card shadow-xs flex items-start justify-between gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <HelpCircle className="size-4 text-primary shrink-0" />
                    <span>{faq.question}</span>
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">{faq.answer}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => {
                    if (confirm(`Delete FAQ "${faq.question}"?`)) {
                      deleteFaqMutation.mutate(faq.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Create Article Drawer */}
        <Sheet open={isArticleModalOpen} onOpenChange={setIsArticleModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                New Help Article or Video
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Publish a guide or tutorial for all registered store merchants.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createArticleMutation.mutate(newArticle);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="art-title">Article Title</Label>
                  <Input
                    id="art-title"
                    required
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                    placeholder="e.g. Setting Up Receipt Printers"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="art-type">Content Format</Label>
                  <Select
                    value={newArticle.type}
                    onValueChange={(val: any) => setNewArticle({ ...newArticle, type: val })}
                  >
                    <SelectTrigger id="art-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doc">Text Documentation Guide</SelectItem>
                      <SelectItem value="video">Embedded Video Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="art-content">
                    {newArticle.type === "video"
                      ? "Video URL (YouTube/Vimeo)"
                      : "Guide Markdown Content"}
                  </Label>
                  <Textarea
                    id="art-content"
                    rows={6}
                    required
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    placeholder={
                      newArticle.type === "video"
                        ? "https://www.youtube.com/watch?v=..."
                        : "Describe the step-by-step instructions..."
                    }
                  />
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsArticleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createArticleMutation.isPending}>
                  {createArticleMutation.isPending ? "Publishing…" : "Publish Guide"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Create FAQ Drawer */}
        <Sheet open={isFaqModalOpen} onOpenChange={setIsFaqModalOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
          >
            <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Add New Merchant FAQ
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Provide instant answers for commonly encountered issues.
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createFaqMutation.mutate(newFaq);
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="faq-q">Question</Label>
                  <Input
                    id="faq-q"
                    required
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    placeholder="e.g. How do I enable multi-currency billing?"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="faq-a">Answer</Label>
                  <Textarea
                    id="faq-a"
                    rows={5}
                    required
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    placeholder="Go to Settings > Store Profile > Currency and select your target currency..."
                  />
                </div>
              </div>

              <SheetFooter className="p-5 border-t bg-muted/20 flex sm:justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsFaqModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFaqMutation.isPending}>
                  {createFaqMutation.isPending ? "Saving FAQ…" : "Save FAQ Entry"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
}
