import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Book, MessageCircle, Phone, Video } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help Center · NexisPOS" }] }),
  component: () => (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Help Center"
        description="Guides, FAQs, and ways to reach our support team."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Book, t: "Documentation", d: "Read step-by-step guides for every feature." },
          {
            icon: Video,
            t: "Video Tutorials",
            d: "Watch short walk-throughs of the POS workflow.",
          },
          { icon: MessageCircle, t: "Chat with us", d: "Average response time under 2 minutes." },
          { icon: Phone, t: "Call support", d: "Mon–Sun, 7am – 11pm local time." },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.t} className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 font-semibold">Frequently asked</h2>
        <div className="divide-y divide-border">
          {[
            "How do I configure a new printer?",
            "Can I run multiple registers at one store?",
            "How are taxes calculated on split tenders?",
            "Where can I export end-of-day reports?",
            "How do I issue a refund after a sale?",
          ].map((q) => (
            <details key={q} className="group py-3">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="mr-2 text-muted-foreground group-open:rotate-90 inline-block transition-transform">
                  ›
                </span>
                {q}
              </summary>
              <p className="mt-2 pl-5 text-sm text-muted-foreground">
                Detailed walkthroughs are available in the documentation. Reach out to support if
                you need help.
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  ),
});
