import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Book, MessageCircle, Phone, Video, Star, Send, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getHelpArticlesFn, getFaqsFn, createSupportTicketFn, createReviewFn } from "@/api/support";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help Center — NexisPOS" }] }),
  component: HelpPage,
});

function HelpPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  // Chat form
  const [chatSubject, setChatSubject] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  
  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["help_articles"],
    queryFn: async () => (await getHelpArticlesFn({ data: {} })).data || [],
  });

  const { data: faqs = [], isLoading: loadingFaqs } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => (await getFaqsFn({ data: {} })).data || [],
  });

  const chatMutation = useMutation({
    mutationFn: async (data: any) => createSupportTicketFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Message sent to support team!");
        setIsChatOpen(false);
        setChatSubject("");
        setChatMessage("");
      } else toast.error(res.error);
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => createReviewFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Thank you for your feedback!");
        setIsReviewOpen(false);
        setReviewRating(5);
        setReviewComment("");
      } else toast.error(res.error);
    }
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage) return toast.error("Please enter a message");
    chatMutation.mutate({ subject: chatSubject, message: chatMessage });
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    reviewMutation.mutate({ rating: reviewRating, comment: reviewComment });
  };

  const [searchQuery, setSearchQuery] = useState("");

  const getEmbedVideoInfo = (url: string) => {
    if (!url) return { isEmbed: false, type: "none", src: "" };
    
    // YouTube (standard watch, shorts, share links, embed)
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return { isEmbed: true, type: "youtube", src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0` };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return { isEmbed: true, type: "vimeo", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    }

    // Direct MP4 / WebM / Blob video
    return { isEmbed: false, type: "direct", src: url };
  };

  const filteredDocs = articles
    .filter((a: any) => a.type !== 'video')
    .filter((a: any) => a.title?.toLowerCase().includes(searchQuery.toLowerCase()) || a.content?.toLowerCase().includes(searchQuery.toLowerCase()));
    
  const filteredVideos = articles
    .filter((a: any) => a.type === 'video')
    .filter((a: any) => a.title?.toLowerCase().includes(searchQuery.toLowerCase()) || a.content?.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredFaqs = faqs
    .filter((f: any) => f.question?.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer?.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderSmartContent = (content: string) => {
    if (!content) return null;
    if (content.startsWith("http") && /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(content)) {
      return <img src={content} alt="Help Document" className="mt-3 max-h-96 rounded-md border object-contain bg-white/50" />;
    }
    if (content.startsWith("http")) {
      return (
        <a href={content} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline">
          <Book className="w-4 h-4 mr-1.5" /> View Attached Document
        </a>
      );
    }
    return <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Help Center"
          description="Guides, FAQs, and ways to reach our support team."
        />
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Input 
            placeholder="Search docs, videos, faqs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button variant="outline" className="border-warning text-warning hover:bg-warning/10 w-full sm:w-auto" onClick={() => setIsReviewOpen(true)}>
            <Star className="w-4 h-4 mr-2 fill-current" /> Leave a Review
          </Button>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
          document.getElementById('docs-section')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Book className="size-5" />
          </div>
          <h3 className="mt-4 font-semibold">Documentation</h3>
          <p className="mt-1 text-sm text-muted-foreground">Read step-by-step guides for every feature.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
          document.getElementById('videos-section')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Video className="size-5" />
          </div>
          <h3 className="mt-4 font-semibold">Video Tutorials</h3>
          <p className="mt-1 text-sm text-muted-foreground">Watch short walk-throughs of the POS workflow.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setIsChatOpen(true)}>
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="size-5" />
          </div>
          <h3 className="mt-4 font-semibold">Chat with us</h3>
          <p className="mt-1 text-sm text-muted-foreground">Send a message to our support team.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft cursor-default">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Phone className="size-5" />
          </div>
          <h3 className="mt-4 font-semibold">Call support</h3>
          <p className="mt-1 text-sm text-muted-foreground">Mon–Sun, 7am – 11pm local time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Dynamic Documentation */}
        <div id="docs-section" className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Documentation</h2>
          </div>
          <div className="space-y-3">
            {loadingArticles ? (
               <div className="p-4 text-center text-muted-foreground animate-pulse">Loading docs...</div>
            ) : filteredDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">
                {searchQuery ? "No matching docs found." : "No documentation available yet."}
              </p>
            ) : (
              filteredDocs.map((doc: any) => (
                <div key={doc.id} className="p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-semibold text-primary">{doc.title}</h4>
                  {renderSmartContent(doc.content)}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Videos */}
        <div id="videos-section" className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Video Tutorials</h2>
          </div>
          <div className="space-y-4">
            {loadingArticles ? (
               <div className="p-4 text-center text-muted-foreground animate-pulse">Loading videos...</div>
            ) : filteredVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">
                {searchQuery ? "No matching videos found." : "No video tutorials available yet."}
              </p>
            ) : (
              filteredVideos.map((vid: any) => {
                const videoInfo = getEmbedVideoInfo(vid.content);
                return (
                  <div key={vid.id} className="p-4 border border-border/80 rounded-xl bg-card space-y-3 shadow-xs">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Video className="size-4 text-primary shrink-0" />
                      {vid.title}
                    </h4>
                    {videoInfo.isEmbed ? (
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black shadow-inner border border-border">
                        <iframe
                          src={videoInfo.src}
                          title={vid.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : videoInfo.src && videoInfo.src.startsWith("http") ? (
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black shadow-inner border border-border">
                        <video src={videoInfo.src} controls preload="metadata" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{vid.content}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dynamic FAQs */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 font-semibold text-lg">Frequently asked</h2>
        <div className="divide-y divide-border">
          {loadingFaqs ? (
             <div className="p-4 text-center text-muted-foreground animate-pulse">Loading FAQs...</div>
          ) : filteredFaqs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {searchQuery ? "No matching FAQs found." : "No FAQs available yet."}
            </p>
          ) : (
            filteredFaqs.map((q: any) => (
              <details key={q.id} className="group py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden flex items-center">
                  <span className="mr-3 text-primary group-open:rotate-90 inline-block transition-transform">
                    ▶
                  </span>
                  {q.question}
                </summary>
                <p className="mt-3 pl-6 text-sm text-muted-foreground whitespace-pre-wrap">
                  {q.answer}
                </p>
              </details>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>Send a message directly to our support team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendChat} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Subject (Optional)</Label>
              <Input placeholder="e.g. Printer Issue" value={chatSubject} onChange={(e) => setChatSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                placeholder="Describe your issue..." 
                rows={5} 
                value={chatMessage} 
                onChange={(e) => setChatMessage(e.target.value)} 
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChatOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={chatMutation.isPending}>
                {chatMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Message
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>Your feedback helps us improve the platform.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <Label className="text-lg">Rate your experience</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 ${star <= reviewRating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Feedback / Suggestions (Optional)</Label>
              <Textarea 
                placeholder="Tell us what you love or what could be better..." 
                rows={4} 
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)} 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={reviewMutation.isPending}>
                {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
