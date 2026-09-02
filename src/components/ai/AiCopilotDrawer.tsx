import { useState, useEffect, useMemo, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getSalesFn } from "@/api/sales";
import { getProductsFn } from "@/api/products";
import { getCustomersFn } from "@/api/customers";
import { getExpensesFn } from "@/api/expenses";
import { askAiCopilotFn } from "@/api/ai";
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import { useLanguage, type LanguageCode } from "@/contexts/LanguageContext";
import {
  Bot,
  Sparkles,
  Send,
  TrendingUp,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  CircleDollarSign,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { toast } from "sonner";

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

type LocalizedContent = {
  advisorTitle: string;
  liveBadge: string;
  advisorSubtitle: string;
  healthScore: string;
  netProfit: string;
  totalDue: string;
  clearChat: string;
  copiedToast: string;
  inputPlaceholder: string;
  analyzingText: string;
  welcomeText: string;
  welcomeCardTitle: string;
  tipText: string;
  categories: {
    id: string;
    label: string;
    prompts: string[];
  }[];
};

const I18N_AI: Partial<Record<LanguageCode, LocalizedContent>> & { en: LocalizedContent } = {
  en: {
    advisorTitle: "OneDesk360 AI Advisor",
    liveBadge: "Live",
    advisorSubtitle: "Realtime Store Analytics & Business Insights",
    healthScore: "Health Score",
    netProfit: "Net Profit",
    totalDue: "Total Due",
    clearChat: "Clear Chat History",
    copiedToast: "Copied to clipboard",
    inputPlaceholder: "Ask AI anything (e.g. What is today's profit?)...",
    analyzingText: "Analyzing store data...",
    welcomeText:
      "Hello! 👋 I am your **OneDesk360 AI Business Advisor**.\n\nI can analyze your store's profit & loss, identify dead stock, track due accounts, and provide actionable growth insights in real-time.",
    welcomeCardTitle: "Store Health Quick Overview",
    tipText: "💡 Tip: Click any suggested prompt below or type your question!",
    categories: [
      {
        id: "all",
        label: "⭐ Popular",
        prompts: [
          "What is my Business Health Score?",
          "Give me today's net profit and sales summary",
          "Which products are considered Dead Stock?",
          "Who are the top customers with overdue credit?",
        ],
      },
      {
        id: "financials",
        label: "💰 Financials",
        prompts: [
          "What is today's total revenue vs expenses?",
          "How can I improve my profit margin?",
          "Show me this month's expense breakdown",
        ],
      },
      {
        id: "inventory",
        label: "📦 Stock & Inventory",
        prompts: [
          "How can I liquidate my dead stock faster?",
          "What are my highest selling product lines?",
          "What is my total inventory capital value?",
        ],
      },
      {
        id: "customers",
        label: "👥 Customers & Due",
        prompts: [
          "List top 5 overdue customers and their contact info",
          "What are smart strategies to collect customer dues?",
          "Who are my most loyal and frequent buyers?",
        ],
      },
    ],
  },
  bn: {
    advisorTitle: "OneDesk360 AI অ্যাডভাইজার",
    liveBadge: "লাইভ",
    advisorSubtitle: "রিয়েল-টাইম স্টোর অ্যানালিটিক্স ও ব্যবসায়িক পরামর্শ",
    healthScore: "হেলথ স্কোর",
    netProfit: "নেট লাভ",
    totalDue: "মোট বাকি",
    clearChat: "চ্যাট হিস্ট্রি মুছুন",
    copiedToast: "ক্লিপবোর্ডে কপি করা হয়েছে",
    inputPlaceholder: "AI-কে যেকোনো প্রশ্ন করুন (যেমন: আজকের প্রফিট কত?)...",
    analyzingText: "স্টোরের ডেটা বিশ্লেষণ করা হচ্ছে...",
    welcomeText:
      "আসসালামু আলাইকুম / নমস্কার! 👋 আমি আপনার **OneDesk360 AI বিজনেস অ্যাডভাইজার**।\n\nআমি আপনার স্টোরের লাভ-ক্ষতি, ডেড স্টক, বাকি খাতা এবং ব্যবসায়িক অগ্রগতির রিয়েল-টাইম বিশ্লেষণ করতে পারি।",
    welcomeCardTitle: "স্টোর হেলথ ওভারভিউ",
    tipText: "💡 পরামর্শ: নিচের সাজেস্টেড প্রশ্নে ক্লিক করুন অথবা বাংলায় লিখে পাঠান!",
    categories: [
      {
        id: "all",
        label: "⭐ জনপ্রিয়",
        prompts: [
          "আমার Business Health Score কত?",
          "আজকের নেট প্রফিট ও বিক্রির সামারি দিন",
          "কোন পণ্যগুলো Dead Stock হয়ে আছে?",
          "কার কাছে সবচেয়ে বেশি বকেয়া (Due) রয়েছে?",
        ],
      },
      {
        id: "financials",
        label: "💰 আয়-ব্যয় ও লাভ",
        prompts: [
          "আজকের মোট বিক্রি এবং খরচ কত?",
          "Profit Margin কীভাবে বাড়ানো যায়?",
          "চলতি মাসের এক্সপেন্স ব্রেকডাউন দেখান",
        ],
      },
      {
        id: "inventory",
        label: "📦 স্টক ও ইনভেন্টরি",
        prompts: [
          "Dead Stock কমানোর কৌশল কী হতে পারে?",
          "সবচেয়ে বেশি বিক্রি হওয়া আইটেমগুলো কী?",
          "স্টক ভ্যালু ও ইনভেন্টরি ক্যাপিটাল কত?",
        ],
      },
      {
        id: "customers",
        label: "👥 কাস্টমার ও বাকি",
        prompts: [
          "টপ ৫ জন বকেয়া কাস্টমার তালিকা দিন",
          "বকেয়া আদায়ের স্মার্ট কৌশল কী?",
          "সবচেয়ে নিয়মিত বিশ্বস্ত কাস্টমার কারা?",
        ],
      },
    ],
  },
  hi: {
    advisorTitle: "OneDesk360 AI एडवाइजर",
    liveBadge: "लाइव",
    advisorSubtitle: "रीयल-टाइम स्टोर एनालिटिक्स और व्यावसायिक इनसाइट्स",
    healthScore: "हेल्थ स्कोर",
    netProfit: "शुद्ध लाभ",
    totalDue: "कुल बकाया",
    clearChat: "चैट इतिहास साफ़ करें",
    copiedToast: "क्लिपबोर्ड पर कॉपी किया गया",
    inputPlaceholder: "AI से कुछ भी पूछें (जैसे: आज का लाभ कितना है?)...",
    analyzingText: "स्टोर डेटा का विश्लेषण हो रहा है...",
    welcomeText:
      "नमस्ते! 👋 मैं आपका **OneDesk360 AI बिजनेस एडवाइजर** हूँ।\n\nमैं आपकी दुकान के लाभ-हानि, डेड स्टॉक, बकाया खातों और व्यावसायिक विकास का रीयल-टाइम विश्लेषण कर सकता हूँ।",
    welcomeCardTitle: "दुकान स्वास्थ्य सारांश",
    tipText: "💡 सुझाव: नीचे दिए गए किसी भी सुझाव पर क्लिक करें या हिंदी में टाइप करें!",
    categories: [
      {
        id: "all",
        label: "⭐ लोकप्रिय",
        prompts: [
          "मेरा Business Health Score कितना है?",
          "आज की शुद्ध कमाई और बिक्री का सारांश दें",
          "कौन से उत्पाद Dead Stock बन गए हैं?",
          "सबसे अधिक उधारी (Due) किस ग्राहक पर है?",
        ],
      },
      {
        id: "financials",
        label: "💰 वित्त और लाभ",
        prompts: [
          "आज की कुल बिक्री और खर्च कितना है?",
          "लाभ मार्जिन (Profit Margin) कैसे बढ़ाएं?",
          "इस महीने के खर्चों का विवरण दिखाएं",
        ],
      },
      {
        id: "inventory",
        label: "📦 स्टॉक और इन्वेंटरी",
        prompts: [
          "Dead Stock को जल्दी निकालने की रणनीति क्या है?",
          "सबसे ज्यादा बिकने वाले उत्पाद कौन से हैं?",
          "दुकान की कुल इन्वेंटरी पूंजी कितनी है?",
        ],
      },
      {
        id: "customers",
        label: "👥 ग्राहक और उधारी",
        prompts: [
          "शीर्ष 5 बकाया ग्राहकों की सूची दें",
          "उधारी वसूलने की सबसे स्मार्ट रणनीति क्या है?",
          "मेरे सबसे वफादार और नियमित ग्राहक कौन हैं?",
        ],
      },
    ],
  },
  ar: {
    advisorTitle: "مستشار OneDesk360 الذكي",
    liveBadge: "مباشر",
    advisorSubtitle: "تحليلات المتجر والرؤى التجارية الفورية",
    healthScore: "نقاط الصحة",
    netProfit: "صافي الربح",
    totalDue: "إجمالي الديون",
    clearChat: "مسح سجل المحادثة",
    copiedToast: "تم النسخ إلى الحافظة",
    inputPlaceholder: "اسأل الذكاء الاصطناعي أي شيء (مثال: ما هو ربح اليوم؟)...",
    analyzingText: "جاري تحليل بيانات المتجر...",
    welcomeText:
      "مرحباً بك! 👋 أنا **مستشارك التجاري الذكي OneDesk360 AI**.\n\nيمكنني تحليل أرباح وخسائر متجرك، وتحديد المخزون الراكد، وتتبع ديون العملاء وتقديم رؤى للنمو في الوقت الفعلي.",
    welcomeCardTitle: "نظرة عامة على صحة المتجر",
    tipText: "💡 نصيحة: اضغط على أي من الأسئلة المقترحة أدناه أو اكتب استفسارك بالعربية!",
    categories: [
      {
        id: "all",
        label: "⭐ شائعة",
        prompts: [
          "ما هي نقاط صحة أعمالي (Health Score)؟",
          "أعطني ملخص صافي أرباح ومبيعات اليوم",
          "ما هي المنتجات الراكدة (Dead Stock)؟",
          "من هم أكثر العملاء تأخراً في سداد الديون؟",
        ],
      },
      {
        id: "financials",
        label: "💰 المالية والأرباح",
        prompts: [
          "ما هو إجمالي مبيعات اليوم مقابل المصروفات؟",
          "كيف يمكنني تحسين هامش الربح؟",
          "اعرض تفاصيل مصروفات هذا الشهر",
        ],
      },
      {
        id: "inventory",
        label: "📦 المخزون والمستودع",
        prompts: [
          "كيف يمكن تصريف المخزون الراكد بسرعة؟",
          "ما هي المنتجات الأكثر مبيعاً في المتجر؟",
          "ما هي القيمة الإجمالية للمخزون الحالي؟",
        ],
      },
      {
        id: "customers",
        label: "👥 العملاء والديون",
        prompts: [
          "قائمة بأعلى 5 عملاء مدينين مع بيانات الاتصال",
          "ما هي أفضل الاستراتيجيات لتحصيل الديون؟",
          "من هم العملاء الأكثر ولاءً وتكراراً للشراء؟",
        ],
      },
    ],
  },
  zh: {
    advisorTitle: "OneDesk360 AI 商业顾问",
    liveBadge: "实时",
    advisorSubtitle: "实时店铺数据分析与经营增长洞察",
    healthScore: "健康评分",
    netProfit: "净利润",
    totalDue: "客户总欠款",
    clearChat: "清空对话记录",
    copiedToast: "已复制到剪贴板",
    inputPlaceholder: "向 AI 顾问提问（例如：今天的利润是多少？）...",
    analyzingText: "正在分析店铺实时数据...",
    welcomeText:
      "您好！👋 我是您的 **OneDesk360 AI 商业顾问**。\n\n我可以实时为您分析店铺的盈亏利润、呆滞库存、客户应收欠款并提供业务增长策略。",
    welcomeCardTitle: "店铺健康状态快速概览",
    tipText: "💡 提示：点击下方推荐问题或直接输入您想了解的内容！",
    categories: [
      {
        id: "all",
        label: "⭐ 常用推荐",
        prompts: [
          "我店铺的商业健康评分是多少？",
          "请给我今天净利润与销售额汇总",
          "有哪些商品属于呆滞死库存 (Dead Stock)？",
          "欠款金额最多的客户有哪些？",
        ],
      },
      {
        id: "financials",
        label: "💰 财务与利润",
        prompts: [
          "今天的总销售收入与支出是多少？",
          "如何有效提升店铺的利润率？",
          "请展示本月的各项费用支出明细",
        ],
      },
      {
        id: "inventory",
        label: "📦 库存与商品",
        prompts: [
          "有什么策略可以快速清理死库存？",
          "销量最高的前几款热卖单品是什么？",
          "当前库存占用的总资金是多少？",
        ],
      },
      {
        id: "customers",
        label: "👥 客户与欠款",
        prompts: [
          "列出欠款最高的前5名客户及联系方式",
          "有哪些高效收回客户欠款的催收建议？",
          "复购率最高的最忠诚客户是谁？",
        ],
      },
    ],
  },
};

const safeNum = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function AiCopilotDrawer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPos = pathname === "/pos" || pathname.startsWith("/pos/");

  const { formatCurrency, currencySymbol } = useCurrency();
  const { language } = useLanguage();
  const { formatAppDate } = useAppFormatter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const orgId = PersistStore.getOrgId() || "default";

  // Get active translation pack (fallback to English)
  const i18n = useMemo(() => I18N_AI[language as LanguageCode] || I18N_AI.en, [language]);

  const { data: salesData } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => {
      try {
        const res: any = await getSalesFn({ data: {} });
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const sales = Array.isArray(salesData) ? salesData : [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      try {
        const res: any = await getProductsFn({ data: {} });
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => {
      try {
        const res: any = await getCustomersFn({ data: {} });
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const customers = Array.isArray(customersData) ? customersData : [];

  const { data: expensesData } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => {
      try {
        const res: any = await getExpensesFn({ data: {} });
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const expenses = Array.isArray(expensesData) ? expensesData : [];

  // Key Shortcut Ctrl + J / Cmd + J & Custom Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "j" || e.key === "/")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    const handleOpenAi = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-ai-copilot", handleOpenAi);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-ai-copilot", handleOpenAi);
    };
  }, []);

  // Compute Metrics & Business Health Score (0-100)
  const healthAnalysis = useMemo(() => {
    const activeSales = sales.filter(
      (s: any) =>
        s &&
        s.status !== "void" &&
        s.status !== "cancelled" &&
        s.status !== "quotation" &&
        s.status !== "draft",
    );

    const totalSalesRev = activeSales.reduce(
      (sum, s: any) => sum + safeNum(s?.total ?? s?.grandTotal ?? s?.finalAmount),
      0,
    );
    const totalExp = expenses.reduce((sum, e: any) => sum + safeNum(e?.amount ?? e?.total), 0);

    let totalCogs = 0;
    activeSales.forEach((s: any) => {
      const items = s?.saleItems || s?.items || [];
      if (Array.isArray(items)) {
        items.forEach((i: any) => {
          const prod = products.find((p: any) => p.id === (i?.productId || i?.id));
          const unitCost = safeNum(i?.cost ?? prod?.cost ?? 0);
          const quantity = safeNum(i?.quantity ?? i?.qty ?? 1);
          totalCogs += unitCost * quantity;
        });
      }
    });

    const netProfit = safeNum(totalSalesRev - totalCogs - totalExp);
    const profitMargin = totalSalesRev > 0 ? (netProfit / totalSalesRev) * 100 : 0;

    // Dead Stock Calculation (Unsold products with positive stock)
    const soldProductIds = new Set(
      activeSales.flatMap((s: any) =>
        (s?.saleItems || s?.items || []).map((i: any) => i?.productId || i?.id).filter(Boolean),
      ),
    );
    const deadStockItems = products.filter(
      (p: any) => safeNum(p?.stock) > 0 && !soldProductIds.has(p.id),
    );
    const totalStockValue = products.reduce(
      (sum, p: any) => sum + safeNum(p?.stock) * safeNum(p?.cost),
      0,
    );
    const deadStockValue = deadStockItems.reduce(
      (sum, p: any) => sum + safeNum(p?.stock) * safeNum(p?.cost),
      0,
    );

    // Due Collection Health
    const totalDue = customers.reduce(
      (sum, c: any) => sum + safeNum(c?.credit ?? c?.due ?? c?.balance),
      0,
    );
    const overDueRatio = totalSalesRev > 0 ? (totalDue / totalSalesRev) * 100 : 0;

    // Score Calculation out of 100
    let score = 50;
    if (netProfit > 0) score += 20;
    if (profitMargin > 15) score += 15;
    if (deadStockValue < totalStockValue * 0.2) score += 10;
    if (overDueRatio < 30) score += 5;

    score = Math.min(100, Math.max(0, Math.round(score)));

    let grade = "B (Good)";
    let gradeColor = "text-primary border-primary/30 bg-primary/10";
    if (score >= 85) {
      grade = "A+ (Excellent)";
      gradeColor = "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    } else if (score >= 70) {
      grade = "A (Strong)";
      gradeColor = "text-blue-500 border-blue-500/30 bg-blue-500/10";
    } else if (score < 50) {
      grade = "C (Needs Attention)";
      gradeColor = "text-amber-500 border-amber-500/30 bg-amber-500/10";
    }

    return {
      score,
      grade,
      gradeColor,
      netProfit,
      profitMargin,
      totalSalesRev,
      totalExp,
      deadStockItems,
      deadStockValue,
      totalDue,
      topDueCustomers: customers
        .sort((a: any, b: any) => safeNum(b?.credit) - safeNum(a?.credit))
        .slice(0, 4),
    };
  }, [sales, products, customers, expenses]);

  // Initial welcome message (reactive to language selection)
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMessages([
      {
        id: "welcome-" + language,
        sender: "ai",
        text: i18n.welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        dataCard: {
          title: i18n.welcomeCardTitle,
          metrics: [
            {
              label: i18n.healthScore,
              value: `${safeNum(healthAnalysis.score)}/100 (${healthAnalysis.grade.split(" ")[0]})`,
              color: "text-primary font-black",
            },
            {
              label: i18n.netProfit,
              value: formatCurrency(safeNum(healthAnalysis.netProfit)),
              color: safeNum(healthAnalysis.netProfit) >= 0 ? "text-emerald-500" : "text-rose-500",
            },
            {
              label: i18n.totalDue,
              value: formatCurrency(safeNum(healthAnalysis.totalDue)),
              color: "text-amber-500",
            },
          ],
          alert: i18n.tipText,
        },
      },
    ]);
  }, [
    language,
    i18n,
    healthAnalysis.score,
    healthAnalysis.grade,
    healthAnalysis.netProfit,
    healthAnalysis.totalDue,
    formatCurrency,
  ]);

  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping, isOpen]);

  // Floating Button Drag Logic
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, hasMoved: false });

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = {
      startX: e.clientX - btnPos.x,
      startY: e.clientY - btnPos.y,
      hasMoved: false,
    };
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(i18n.copiedToast);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        sender: "ai",
        text: i18n.welcomeText,
        timestamp: formatAppDate(new Date(), "time"),
      },
    ]);
  };

  const processUserQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: queryText,
      timestamp: formatAppDate(new Date(), "time"),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsTyping(true);

    try {
      const context = {
        language: language || "en",
        currency: { symbol: currencySymbol },
        metrics: {
          totalSales: safeNum(healthAnalysis.totalSalesRev),
          netProfit: safeNum(healthAnalysis.netProfit),
          profitMarginPct: Math.round(safeNum(healthAnalysis.profitMargin)),
          totalExpenses: safeNum(healthAnalysis.totalExp),
          totalDue: safeNum(healthAnalysis.totalDue),
          deadStockValue: safeNum(healthAnalysis.deadStockValue),
          healthScore: safeNum(healthAnalysis.score),
        },
        deadStock: (healthAnalysis.deadStockItems || []).slice(0, 10).map((p: any) => ({
          name: p.name || "Product",
          stock: safeNum(p.stock),
          unit: p.unit || "pcs",
          value: safeNum(p.stock) * safeNum(p.cost),
        })),
        overdueCustomers: (healthAnalysis.topDueCustomers || []).map((c: any) => ({
          name: c.name || "Customer",
          phone: c.phone || "",
          due: safeNum(c.credit),
        })),
      };

      const res = await askAiCopilotFn({ data: { query: q, context } });

      if (res?.success && res.data) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: res.data.text || "Analyzed response based on real-time data.",
          timestamp: formatAppDate(new Date(), "time"),
          dataCard: res.data.dataCard,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error("Failed to get AI response");
      }
    } catch (err) {
      console.error("AI Copilot error:", err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "I am unable to connect to the AI model right now. Please ensure your Gemini API key is configured in settings or try again shortly.",
        timestamp: formatAppDate(new Date(), "time"),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper to render markdown bold / lists cleanly
  const renderFormattedText = (text: any) => {
    if (!text) return null;
    const str = typeof text === "string" ? text : String(text);
    const lines = str.split("\n");
    return lines.map((line, idx) => {
      // Bold handling
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formatted = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        return (
          <div key={idx} className="flex items-start gap-2 my-0.5 pl-1">
            <span className="text-primary font-bold">•</span>
            <span>{formatted}</span>
          </div>
        );
      }

      return (
        <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
          {formatted}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating AI Glow Trigger Button (Bottom Right) — Hidden on POS to avoid overlapping Cart / Checkout buttons */}
      {!isPos && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleClick}
          style={{
            transform: `translate(${btnPos.x}px, ${btnPos.y}px)`,
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
          className="hidden md:flex fixed bottom-6 right-6 z-50 group items-center gap-2.5 rounded-full bg-gradient-to-r from-[#B58D4C] via-[#CA9E59] to-[#D4AF37] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#B58D4C]/30 border border-white/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 select-none"
          title={`${i18n.advisorTitle} (Ctrl+J)`}
        >
          <div className="relative grid size-5.5 place-items-center rounded-full bg-white/20 backdrop-blur-xs">
            <Sparkles className="size-3 text-white animate-pulse" />
          </div>
          <span className="hidden sm:inline tracking-wide font-black text-xs">AI Copilot</span>
          <Badge
            variant="secondary"
            className="hidden sm:inline-flex text-[9px] font-mono font-bold bg-black/25 text-white border-0 px-1.5 py-0.5 rounded-md"
          >
            Ctrl+J
          </Badge>
        </button>
      )}

      {/* Modern AI Sheet Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-card/95 backdrop-blur-xl border-l border-border/80 shadow-2xl overflow-hidden"
        >
          {/* Top Brand & Header Bar */}
          <SheetHeader className="p-4 border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#B58D4C] to-[#916E34] text-white shadow-md shadow-[#B58D4C]/30 border border-white/20">
                <Bot className="size-5" />
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-sm sm:text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span>{i18n.advisorTitle}</span>
                  <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 border border-primary/30">
                    {i18n.liveBadge}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-[11px] font-medium text-muted-foreground">
                  {i18n.advisorSubtitle}
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                title={i18n.clearChat}
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Realtime Store Health Summary Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 border-b border-border/60 shrink-0 text-xs">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-card border border-border/80 shadow-2xs text-center">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <Activity className="size-3 text-primary" /> {i18n.healthScore}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-extrabold text-xs sm:text-sm text-foreground">
                  {safeNum(healthAnalysis.score)}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">/100</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-card border border-border/80 shadow-2xs text-center">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <CircleDollarSign className="size-3 text-emerald-500" /> {i18n.netProfit}
              </span>
              <span
                className={cn(
                  "font-extrabold text-xs sm:text-sm mt-0.5 truncate max-w-full",
                  safeNum(healthAnalysis.netProfit) >= 0 ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {formatCurrency(safeNum(healthAnalysis.netProfit))}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-card border border-border/80 shadow-2xs text-center">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="size-3 text-amber-500" /> {i18n.totalDue}
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-amber-500 mt-0.5 truncate max-w-full">
                {formatCurrency(safeNum(healthAnalysis.totalDue))}
              </span>
            </div>
          </div>

          {/* Quick Prompt Category Tabs */}
          <div className="p-3 border-b border-border/60 bg-card shrink-0 space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {i18n.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-1.5">
              {(i18n.categories.find((c) => c.id === activeCategory)?.prompts || []).map(
                (prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => processUserQuery(prompt)}
                    disabled={isTyping}
                    className="group flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/15 hover:border-primary/40 px-3 py-1 text-[11px] font-semibold text-foreground transition-all active:scale-95 disabled:opacity-50 text-left"
                  >
                    <Sparkles className="size-3 text-[#B58D4C] shrink-0 group-hover:rotate-12 transition-transform" />
                    <span>{prompt}</span>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5 max-w-[92%]",
                  m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                {/* Avatar Icon */}
                {m.sender === "ai" ? (
                  <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-[#B58D4C]/15 border border-[#B58D4C]/30 text-[#B58D4C] shadow-2xs mt-0.5">
                    <Bot className="size-4" />
                  </div>
                ) : (
                  <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-2xs mt-0.5 font-bold text-xs">
                    You
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0">
                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "group relative rounded-2xl px-4 py-3 text-xs shadow-xs leading-relaxed transition-all",
                      m.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                        : "bg-muted/50 border border-border/80 text-foreground rounded-tl-none",
                    )}
                  >
                    {renderFormattedText(m.text)}

                    {/* Copy Button on AI Message */}
                    {m.sender === "ai" && (
                      <button
                        onClick={() => copyToClipboard(m.text, m.id)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity size-6 rounded-md bg-card/80 border border-border/60 text-muted-foreground hover:text-foreground grid place-items-center shadow-2xs"
                        title={i18n.copiedToast}
                      >
                        {copiedId === m.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Structured AI Data Card */}
                  {m.dataCard && (
                    <div className="w-full rounded-2xl border border-border/90 bg-card p-3.5 shadow-sm space-y-2.5 text-xs animate-in fade-in-50 duration-300">
                      <div className="flex items-center justify-between border-b border-border/70 pb-2">
                        <h4 className="font-extrabold text-foreground flex items-center gap-2 text-xs">
                          <Sparkles className="size-3.5 text-[#B58D4C]" />
                          <span>{m.dataCard.title}</span>
                        </h4>
                      </div>

                      {/* KPI Metric Grid */}
                      {m.dataCard.metrics && Array.isArray(m.dataCard.metrics) && (
                        <div className="grid grid-cols-3 gap-2 py-1">
                          {m.dataCard.metrics.map((metric, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl bg-muted/40 border border-border/50 p-2 text-center"
                            >
                              <div className="text-[10px] font-semibold text-muted-foreground truncate">
                                {metric.label}
                              </div>
                              <div
                                className={cn(
                                  "font-black text-xs sm:text-sm mt-0.5 truncate",
                                  metric.color || "text-foreground",
                                )}
                              >
                                {metric.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Item Breakdown List */}
                      {m.dataCard.list && Array.isArray(m.dataCard.list) && (
                        <div className="space-y-1.5 pt-1">
                          {m.dataCard.list.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-muted/30 hover:bg-muted/50 p-2 rounded-xl border border-border/50 text-[11px] transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold text-foreground truncate">
                                  {item.label}
                                </div>
                                {item.subtext && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {item.subtext}
                                  </div>
                                )}
                              </div>
                              {item.badge && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0 font-bold bg-card"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Insight Alert Box */}
                      {m.dataCard.alert && (
                        <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-[11px] font-medium text-foreground flex items-start gap-2">
                          <Lightbulb className="size-4 text-[#B58D4C] shrink-0 mt-0.5" />
                          <span>{m.dataCard.alert}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-[9px] font-semibold text-muted-foreground/80 px-1">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Animated Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 mr-auto">
                <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-[#B58D4C]/15 border border-[#B58D4C]/30 text-[#B58D4C] shadow-2xs">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-muted/50 border border-border/80 text-xs flex gap-1.5 items-center">
                  <span className="size-2 bg-[#B58D4C] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-2 bg-[#B58D4C] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-2 bg-[#B58D4C] rounded-full animate-bounce" />
                  <span className="text-[11px] font-semibold text-muted-foreground ml-1.5">
                    {i18n.analyzingText}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Chat Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processUserQuery(inputQuery);
            }}
            className="p-3 border-t border-border/70 bg-card/90 backdrop-blur-md shrink-0 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={i18n.inputPlaceholder}
                disabled={isTyping}
                className="h-11 w-full rounded-xl border border-border/80 bg-muted/40 px-3.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-muted-foreground/60 pointer-events-none hidden sm:inline">
                ↵
              </span>
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={isTyping || !inputQuery.trim()}
              className="size-11 shrink-0 rounded-xl bg-gradient-to-r from-[#B58D4C] to-[#916E34] text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            >
              {isTyping ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
