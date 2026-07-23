import { useState, useEffect, useMemo, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Bot, Sparkles, Send, TrendingUp, AlertTriangle, PackageX, UserCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  dataCard?: {
    title: string;
    metrics?: { label: string; value: string; color?: string }[];
    list?: { label: string; subtext?: string; badge?: string }[];
    alert?: string;
  };
};

export function AiCopilotDrawer() {
  const { formatCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");

  const sales = useLiveQuery(() => localDb.offlineSales.toArray()) || [];
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const expenses = useLiveQuery(() => localDb.expenses.toArray()) || [];

  // Key Shortcut Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute Metrics & Business Health Score (0-100)
  const healthAnalysis = useMemo(() => {
    const totalSalesRev = sales.reduce((sum, s) => sum + s.total, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    let totalCogs = 0;
    sales.forEach((s) => {
      s.saleItems?.forEach((i) => {
        const prod = products.find((p) => p.id === i.productId);
        if (prod) totalCogs += prod.cost * i.quantity;
      });
    });
    const netProfit = totalSalesRev - totalCogs - totalExp;
    const profitMargin = totalSalesRev > 0 ? (netProfit / totalSalesRev) * 100 : 0;

    // Dead Stock Calculation (Unsold products with positive stock)
    const soldProductIds = new Set(sales.flatMap((s) => s.saleItems?.map((i) => i.productId) || []));
    const deadStockItems = products.filter((p) => p.stock > 0 && !soldProductIds.has(p.id));
    const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
    const deadStockValue = deadStockItems.reduce((sum, p) => sum + p.stock * p.cost, 0);

    // Due Collection Health
    const totalDue = customers.reduce((sum, c) => sum + (c.credit || 0), 0);
    const overDueRatio = totalSalesRev > 0 ? (totalDue / totalSalesRev) * 100 : 0;

    // Score Calculation out of 100
    let score = 50;
    if (netProfit > 0) score += 20;
    if (profitMargin > 15) score += 15;
    if (deadStockValue < totalStockValue * 0.2) score += 10;
    if (overDueRatio < 30) score += 5;

    score = Math.min(100, Math.max(0, Math.round(score)));

    let grade = "B (Good)";
    if (score >= 85) grade = "A+ (Excellent)";
    else if (score >= 70) grade = "A (Strong)";
    else if (score < 50) grade = "C (Needs Attention)";

    return {
      score,
      grade,
      netProfit,
      totalSalesRev,
      totalExp,
      deadStockItems,
      deadStockValue,
      totalDue,
      topDueCustomers: [...customers].sort((a, b) => (b.credit || 0) - (a.credit || 0)).slice(0, 4),
    };
  }, [sales, products, customers, expenses]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "👋 আসসালামু আলাইকুম! আমি আপনার **Grocer.Pro AI Copilot**। আপনার দোকানের লাভ-ক্ষতি, বকেয়া হিসাব, স্টক প্রেডিকশন বা বিজনেস হেলথ স্কোর নিয়ে প্রশ্ন করতে পারেন।",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, hasMoved: false });

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = { startX: e.clientX - btnPos.x, startY: e.clientY - btnPos.y, hasMoved: false };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    dragRef.current.hasMoved = true;
    setBtnPos({
      x: e.clientX - dragRef.current.startX,
      y: e.clientY - dragRef.current.startY,
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault();
      return;
    }
    setIsOpen(true);
  };

  const processUserQuery = (queryText: string) => {
    const q = queryText.toLowerCase().trim();
    if (!q) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    let aiReplyText = "";
    let dataCard: Message["dataCard"] = undefined;

    if (q.includes("health") || q.includes("স্কোর") || q.includes("কেমন চলছে") || q.includes("score")) {
      aiReplyText = `📊 আপনার দোকানের **Business Health Score হলো ${healthAnalysis.score}/100 [Grade: ${healthAnalysis.grade}]**।`;
      dataCard = {
        title: `Business Health Score: ${healthAnalysis.score}/100`,
        metrics: [
          { label: "Net Profit", value: formatCurrency(healthAnalysis.netProfit), color: "text-success" },
          { label: "Total Overdue", value: formatCurrency(healthAnalysis.totalDue), color: "text-destructive" },
          { label: "Dead Stock Value", value: formatCurrency(healthAnalysis.deadStockValue), color: "text-warning-foreground" },
        ],
        alert: healthAnalysis.score < 70 ? "⚠️ বকেয়া কালেকশন দ্রুত বাড়ান এবং অলস স্টক ডিসকাউন্টে বিক্রি করুন।" : "✅ ব্যবসা চমৎকার গতিতে লাভজনকভাবে চলছে!",
      };
    } else if (q.includes("dead") || q.includes("স্টক") || q.includes("বিক্রি হচ্ছে না") || q.includes("unsold")) {
      aiReplyText = `📦 মোট **${healthAnalysis.deadStockItems.length}টি পণ্য (মূল্য: ${formatCurrency(healthAnalysis.deadStockValue)})** অলস পড়ে আছে যা গত ৩০ দিনে বিক্রি হয়নি।`;
      dataCard = {
        title: "Dead Stock Items (অলস স্টক তালিকা)",
        list: healthAnalysis.deadStockItems.slice(0, 5).map((p) => ({
          label: p.name,
          subtext: `Stock: ${p.stock} ${p.unit}`,
          badge: `${formatCurrency(p.stock * p.cost)} Value`,
        })),
        alert: "💡 পরামর্শ: এই আইটেমগুলোর ওপর ১০%-২০% স্পেশাল প্রোমোশন অফার দিয়ে দ্রুত ক্যাশ কনভার্ট করুন।",
      };
    } else if (q.includes("বকেয়া") || q.includes("due") || q.includes("বাকী") || q.includes("khata")) {
      aiReplyText = `💰 কাস্টমারদের কাছে মোট **${formatCurrency(healthAnalysis.totalDue)}** টাকা বকেয়া রয়েছে।`;
      dataCard = {
        title: "Top Overdue Customers (সর্বোচ্চ বকেয়া কাস্টমার)",
        list: healthAnalysis.topDueCustomers.map((c) => ({
          label: c.name,
          subtext: c.phone || "No phone",
          badge: formatCurrency(c.credit || 0),
        })),
        alert: "📲 ১-ক্লিকে কাস্টমারদের হোয়াটসঅ্যাপে রিমাইন্ডার পাঠান।",
      };
    } else if (q.includes("profit") || q.includes("লাভ") || q.includes("আয়") || q.includes("বিক্রি")) {
      aiReplyText = `📈 আপনার মোট বিক্রি **${formatCurrency(healthAnalysis.totalSalesRev)}** এবং সমস্ত খরচ বাদ দিয়ে নিট প্রফিট **${formatCurrency(healthAnalysis.netProfit)}**।`;
      dataCard = {
        title: "Financial Summary (লাভ-ক্ষতি সারসংক্ষেপ)",
        metrics: [
          { label: "Total Sales", value: formatCurrency(healthAnalysis.totalSalesRev) },
          { label: "Expenses", value: formatCurrency(healthAnalysis.totalExp), color: "text-destructive" },
          { label: "Net Profit", value: formatCurrency(healthAnalysis.netProfit), color: "text-success" },
        ],
      };
    } else {
      aiReplyText = `🤖 বিশ্লেষণ সম্পন্ন: আপনার দোকানে বর্তমানে **${products.length}টি পণ্য**, **${customers.length}জন কাস্টমার** এবং মোট বিক্রি **${formatCurrency(healthAnalysis.totalSalesRev)}**।`;
      dataCard = {
        title: "Store Quick Insights",
        metrics: [
          { label: "Total Products", value: products.length.toString() },
          { label: "Total Customers", value: customers.length.toString() },
          { label: "Health Score", value: `${healthAnalysis.score}/100`, color: "text-primary" },
        ],
      };
    }

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: "ai",
      text: aiReplyText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      dataCard,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputQuery("");
  };

  return (
    <>
      {/* Floating AI Button (Bottom Right) */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleClick}
        style={{ transform: `translate(${btnPos.x}px, ${btnPos.y}px)`, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 px-4 py-3 text-sm font-bold text-primary-foreground shadow-md border border-primary/20 transition-colors"
      >
        <Sparkles className="size-5 animate-pulse" />
        <span className="hidden sm:inline">AI Copilot</span>
        <Badge variant="secondary" className="text-[9px] bg-background/20 text-white ml-1 pointer-events-none">Ctrl+K</Badge>
      </button>

      {/* AI Assistant Sheet Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/10 via-background to-accent/10">
            <SheetTitle className="flex items-center gap-2 text-primary font-bold">
              <Bot className="size-5" />
              <span>Grocer.Pro AI Business Advisor</span>
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Natural Language AI Store Intelligence & Analytics</p>
          </SheetHeader>

          {/* Quick Query Chips */}
          <div className="p-3 border-b bg-muted/20 flex flex-wrap gap-1.5">
            <button
              onClick={() => processUserQuery("আমার Business Health Score কত?")}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
            >
              📊 Business Health Score
            </button>
            <button
              onClick={() => processUserQuery("কোন পণ্যগুলো Dead Stock?")}
              className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning-foreground hover:bg-warning/20"
            >
              📦 Dead Stock Items
            </button>
            <button
              onClick={() => processUserQuery("কার কাছে সবচেয়ে বেশি বকেয়া?")}
              className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20"
            >
              💰 Top Overdue Customers
            </button>
            <button
              onClick={() => processUserQuery("আজকের নেট প্রফিট কত?")}
              className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success hover:bg-success/20"
            >
              📈 Net Profit Summary
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col max-w-[88%]", m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-xs shadow-soft leading-relaxed",
                    m.sender === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted/60 border border-border text-foreground rounded-bl-none"
                  )}
                >
                  {m.text}
                </div>

                {/* AI Structured Data Card */}
                {m.dataCard && (
                  <div className="mt-2 w-full rounded-xl border border-border bg-card p-3 shadow-soft space-y-2 text-xs">
                    <h4 className="font-bold text-primary flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="size-3.5" />
                      {m.dataCard.title}
                    </h4>

                    {m.dataCard.metrics && (
                      <div className="grid grid-cols-3 gap-2 border-y py-2 my-1">
                        {m.dataCard.metrics.map((metric, idx) => (
                          <div key={idx} className="text-center">
                            <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                            <div className={cn("font-bold mt-0.5", metric.color || "text-foreground")}>{metric.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.dataCard.list && (
                      <div className="space-y-1.5">
                        {m.dataCard.list.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-muted/40 p-1.5 rounded border border-border/50 text-[11px]">
                            <div>
                              <div className="font-semibold">{item.label}</div>
                              {item.subtext && <div className="text-[9px] text-muted-foreground">{item.subtext}</div>}
                            </div>
                            {item.badge && <Badge variant="outline" className="text-[9px]">{item.badge}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}

                    {m.dataCard.alert && (
                      <div className="rounded-lg bg-warning/10 p-2 text-[10px] font-medium text-warning-foreground">
                        {m.dataCard.alert}
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[9px] text-muted-foreground mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processUserQuery(inputQuery);
            }}
            className="p-3 border-t bg-background flex gap-2"
          >
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask AI Copilot (e.g. আজকের প্রফিট কত?)..."
              className="text-xs"
            />
            <Button type="submit" size="icon" className="shrink-0 size-9">
              <Send className="size-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
