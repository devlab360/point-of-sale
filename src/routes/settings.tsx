import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Trash2,
  CreditCard,
  Loader2,
  QrCode,
  Landmark,
  Banknote,
  Lock,
  Key,
  ShieldCheck,
  MapPin,
  Plus,
  Pencil,
  X,
  Store,
  Warehouse,
  Receipt,
  Printer,
  Sparkles,
  Globe,
  Coins,
  FileText,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  HelpCircle,
  Building2,
  Sliders,
  Database,
  Eye,
  EyeOff,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettingsFn, updateSettingsFn, getAllSaasPlansFn } from "@/api/settings";
import { DEFAULT_PAYMENT_METHODS, PAYMENT_METHOD_ICONS, type PaymentMethodConfig } from "@/lib/payment-methods";
import { submitPaymentProofFn } from "@/api/subscription-payments";
import { updateUserFn } from "@/api/users";
import {
  getLocationsFn,
  createLocationFn,
  updateLocationFn,
  deleteLocationFn,
} from "@/api/locations";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckoutModal } from "@/components/CheckoutModal";
import { useAuth } from "@/contexts/AuthContext";
import { PersistStore } from "@/lib/session-store";
import { useRouter } from "@tanstack/react-router";
import { cn, getTrialDaysLeft, DEFAULT_PAYMENT_CONFIG } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { PosPrintLayouts } from "@/components/pos/PosPrintLayouts";
import { numberToWords } from "@/lib/number-to-words";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { PhoneInput } from "@/components/ui/phone-input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { BUSINESS_TEMPLATES } from "@/lib/business-templates";

const DATE_FORMATS = [
  { value: "dd MMM yyyy", label: "01 Jan 2024 (dd MMM yyyy)" },
  { value: "dd-MM-yyyy", label: "01-01-2024 (dd-MM-yyyy)" },
  { value: "MM/dd/yyyy", label: "01/01/2024 (MM/dd/yyyy)" },
  { value: "yyyy-MM-dd", label: "2024-01-01 (yyyy-MM-dd)" },
];

const TIME_ZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (BST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · OneDesk360" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: typeof search.tab === "string" ? search.tab : undefined,
    };
  },
  component: SettingsPage,
});

const defaultSettings: any = {
  id: "default",
  storeName: "",
  currencySymbol: "$",
  currencyCode: "USD",
  taxId: "",
  address: "",
  phone: "",
  email: "",
  standardRate: 0,
  reducedRate: 0,
  pricesIncludeTax: false,
  showTaxBreakdown: true,
  headerNote: "",
  footerNote: "",
  receiptDeclaration: "",
  emailReceiptDefault: true,
  printStoreLogo: true,
  enableGST: false,
  gstin: "",
  stateCode: "",
  businessType: "",
  bankDetails: "",
  upiId: "",
  termsAndConditions: "",
  privacyPolicy: "",
};

function SettingsPage() {
  const { user, isTrialExpired, subscriptionStatus, saasOrg, saasPlan } = useAuth();
  const orgId = user?.organizationId || user?.orgId || PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const [previewFormat, setPreviewFormat] = useState<"thermal" | "a4">("thermal");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const {
    data: dbSettingsData,
    isLoading: isSettingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => {
      try {
        const res = await getSettingsFn({ data: {} });
        return (res as any)?.data || null;
      } catch {
        return null;
      }
    },
  });
  const dbSettings = dbSettingsData || null;

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["saas_plans"],
    queryFn: async () => {
      try {
        const res = await getAllSaasPlansFn({ data: {} });
        return (res as any)?.data || [];
      } catch {
        return [];
      }
    },
  });
  const rawSaasPlans: any[] = plansData || [];
  const saasPlans = rawSaasPlans.filter((p) => p.id !== "super_admin_payment_config");
  const cloudPaymentConfigPlan = rawSaasPlans.find((p) => p.id === "super_admin_payment_config");
  const localPaymentConfig = null;
  const paymentConfig =
    (cloudPaymentConfigPlan?.features as any) || localPaymentConfig || DEFAULT_PAYMENT_CONFIG;
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    utrNumber: "",
    paymentMethod: "UPI / QR Scan",
    note: "",
    billingCycle: "monthly",
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [confirmReset, setConfirmReset] = useState(false);
  const search = Route.useSearch();
  const router = useRouter();
  const { t } = useLanguage();

  const handlePaymentProofSubmit = async () => {
    if (!paymentForm.utrNumber.trim()) {
      return toast.error("Please enter Transaction ID / UTR Number");
    }
    if (!selectedPlanForUpgrade) {
      return toast.error("Please select a plan first");
    }
    setIsSubmittingPayment(true);
    try {
      const res = await submitPaymentProofFn({
        data: {
          planId: selectedPlanForUpgrade.id,
          utrNumber: paymentForm.utrNumber,
          paymentMethod: paymentForm.paymentMethod,
          note: paymentForm.note,
          amount:
            paymentForm.billingCycle === "yearly"
              ? selectedPlanForUpgrade.yearlyPrice
                ? Number(selectedPlanForUpgrade.yearlyPrice)
                : Number(selectedPlanForUpgrade.price) * 12
              : selectedPlanForUpgrade.monthlyPrice
                ? Number(selectedPlanForUpgrade.monthlyPrice)
                : Number(selectedPlanForUpgrade.price),
          billingCycle: paymentForm.billingCycle as any,
        },
      });
      if (res.success) {
        toast.success(
          "Payment proof submitted successfully! Super Admin will verify UTR: " +
          paymentForm.utrNumber +
          " and activate your subscription within 2-4 hours.",
        );
        setSelectedPlanForUpgrade(null);
        setPaymentForm({
          utrNumber: "",
          paymentMethod: "UPI / QR Scan",
          note: "",
          billingCycle: "monthly",
        });
      } else {
        toast.error("Error: " + res.error);
      }
    } catch (e) {
      toast.error("Error submitting payment proof. Please try again.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const [activeTab, setActiveTab] = useState(isTrialExpired ? "billing" : search.tab || "store");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("Unauthorized. Admin access required.");
      router.navigate({ to: "/" });
    }
  }, [user, router]);

  useEffect(() => {
    if (dbSettings) {
      const merged = { ...defaultSettings, ...dbSettings };
      setSettings((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        return merged;
      });
    } else if (user) {
      setSettings((prev) => {
        if (prev.storeName || prev.email) return prev;
        return {
          ...defaultSettings,
          email: user.email || "",
          storeName: user.name || "",
        };
      });
    }
  }, [dbSettings, user?.id, user?.email, user?.name]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const orgId =
        user?.organizationId ||
        dbSettings?.organizationId ||
        settings.organizationId ||
        PersistStore.getOrgId() ||
        "default";

      if (orgId) {
        const res = await updateSettingsFn({
          data: {
            settings: {
              storeName: settings.storeName,
              taxId: settings.taxId,
              address: settings.address,
              phone: settings.phone,
              email: settings.email,
              currencySymbol: settings.currencySymbol,
              currencyCode: settings.currencyCode,
              logoUrl: settings.logoUrl,
              headerNote: settings.headerNote,
              footerNote: settings.footerNote,
              receiptDeclaration: settings.receiptDeclaration,
              bankDetails: settings.bankDetails,
              upiId: settings.upiId,
              termsAndConditions: settings.termsAndConditions,
              privacyPolicy: settings.privacyPolicy,
              emailReceiptDefault: settings.emailReceiptDefault,
              printStoreLogo: settings.printStoreLogo,
              signatureUrl: settings.signatureUrl,
              standardRate: settings.standardRate?.toString() || "0",
              reducedRate: settings.reducedRate?.toString() || "0",
              pricesIncludeTax: settings.pricesIncludeTax,
              showTaxBreakdown: settings.showTaxBreakdown,
              enableGST: settings.enableGST,
              gstin: settings.gstin,
              stateCode: settings.stateCode,
              businessType: settings.businessType,
              timeZone: settings.timeZone,
              dateFormat: settings.dateFormat,
              config: settings.config,
            },
          },
        });
        if (res.success) {
          toast.success("Settings saved successfully to cloud.");
          queryClient.invalidateQueries({ queryKey: ["settings"] });
        } else {
          toast.error("Cloud sync failed: " + res.error);
        }
      } else {
        toast.error("No valid organization ID found.");
      }
    } catch (error) {
      console.error("Settings save error:", error);
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    try {
      toast.success("This feature is disabled as local DB is removed.");
    } catch (err) {
      toast.error("Failed to reset.");
    } finally {
      setConfirmReset(false);
    }
  };

  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    newPin: user?.pin || "",
  });
  const [showPin, setShowPin] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);

  useEffect(() => {
    if (user?.pin && !passForm.newPin) {
      setPassForm((p) => ({ ...p, newPin: user.pin || "" }));
    }
  }, [user]);

  const {
    errors: secErrors,
    validate: validateSec,
    clearError: clearSecError,
    clearAll: clearSecAll,
  } = useFormValidation({
    newPassword: { minLength: { value: 4, message: "Password must be at least 4 characters" } },
    confirmPassword: {},
  });

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("No active user found.");
      return;
    }

    if (!passForm.currentPassword.trim()) {
      toast.error("Please enter your current password / PIN to verify identity.");
      return;
    }

    if (user.pin && passForm.currentPassword) {
      if (user.pin !== passForm.currentPassword) {
        toast.error("Current password / PIN is incorrect.");
        return;
      }
    }

    if (passForm.newPassword) {
      const isValid = validateSec({
        newPassword: passForm.newPassword,
        confirmPassword: passForm.confirmPassword,
      });
      if (!isValid) return;
      if (passForm.newPassword !== passForm.confirmPassword) {
        toast.error("New password and confirm password do not match.");
        return;
      }
    }

    if (passForm.newPin && !/^\d{4}$/.test(passForm.newPin)) {
      toast.error("Cashier PIN must be a 4-digit number (e.g. 1234).");
      return;
    }

    if (!passForm.newPassword && passForm.newPin === user.pin) {
      toast.info("No changes made to password or PIN.");
      return;
    }

    setIsUpdatingSecurity(true);
    try {
      const updatedPin = passForm.newPassword || passForm.newPin || user.pin;

      const res = await updateUserFn({
        data: { id: user.id, updates: { pin: updatedPin } },
      });

      if (!res.success) {
        throw new Error(res.error || "Server function failed");
      }

      toast.success("Security credentials updated successfully!");
      setPassForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        newPin: updatedPin || "",
      });
      clearSecAll();
    } catch (err) {
      console.error("Security update error:", err);
      toast.error("Failed to update password. Please try again.");
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  const parseBankDetails = (str: string) => {
    try {
      if (str && str.trim().startsWith("{")) return JSON.parse(str);
    } catch (e) { }
    return { bankName: str || "", holderName: "", accountNo: "", ifscCode: "" };
  };
  const bankInfo = parseBankDetails(settings.bankDetails || "");
  const handleBankChange = (field: string, val: string) => {
    const updated = { ...bankInfo, [field]: val };
    handleChange("bankDetails", JSON.stringify(updated));
  };

  const hasChanges = useMemo(() => {
    if (!dbSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(dbSettings);
  }, [settings, dbSettings]);

  // Payment Methods Management State & Handlers
  const [showAddPaymentMethodDialog, setShowAddPaymentMethodDialog] = useState(false);
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<string | null>(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState<PaymentMethodConfig>({
    id: "",
    label: "",
    icon: "smartphone",
    type: "digital",
    enabled: true,
    notes: "",
  });

  const paymentMethodsList: PaymentMethodConfig[] = useMemo(() => {
    const customList = settings.config?.paymentMethods;
    if (Array.isArray(customList) && customList.length > 0) {
      return customList;
    }
    return DEFAULT_PAYMENT_METHODS;
  }, [settings.config?.paymentMethods]);

  const handleTogglePaymentMethod = async (id: string, enabled: boolean) => {
    const currentList = Array.isArray(settings.config?.paymentMethods)
      ? [...settings.config.paymentMethods]
      : [...DEFAULT_PAYMENT_METHODS];
    const idx = currentList.findIndex((m) => m.id === id);
    if (idx >= 0) {
      currentList[idx] = { ...currentList[idx], enabled };
    } else {
      const def = DEFAULT_PAYMENT_METHODS.find((m) => m.id === id);
      if (def) currentList.push({ ...def, enabled });
    }
    const newConfig = { ...(settings.config || {}), paymentMethods: currentList };
    handleChange("config", newConfig);

    // Auto-persist to DB
    const orgId = user?.organizationId || dbSettings?.organizationId || settings.organizationId || PersistStore.getOrgId() || "default";
    if (orgId) {
      updateSettingsFn({
        data: {
          settings: {
            ...settings,
            config: newConfig,
          },
        },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      });
    }
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethodForm.label.trim()) {
      toast.error("Please enter a payment method name");
      return;
    }
    const currentList = Array.isArray(settings.config?.paymentMethods)
      ? [...settings.config.paymentMethods]
      : [...DEFAULT_PAYMENT_METHODS];
    const generatedId =
      paymentMethodForm.id ||
      paymentMethodForm.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (editingPaymentMethodId) {
      const idx = currentList.findIndex((m) => m.id === editingPaymentMethodId);
      if (idx >= 0) {
        currentList[idx] = {
          ...currentList[idx],
          label: paymentMethodForm.label.trim(),
          icon: paymentMethodForm.icon || "smartphone",
          type: paymentMethodForm.type || "digital",
          notes: paymentMethodForm.notes || "",
          enabled: paymentMethodForm.enabled !== false,
        };
      }
    } else {
      if (currentList.some((m) => m.id === generatedId)) {
        toast.error("A payment method with this name already exists");
        return;
      }
      currentList.push({
        id: generatedId,
        label: paymentMethodForm.label.trim(),
        icon: paymentMethodForm.icon || "smartphone",
        type: paymentMethodForm.type || "digital",
        enabled: true,
        isDefault: false,
        notes: paymentMethodForm.notes || "",
      });
    }

    const newConfig = { ...(settings.config || {}), paymentMethods: currentList };
    handleChange("config", newConfig);
    setShowAddPaymentMethodDialog(false);
    setEditingPaymentMethodId(null);
    toast.success(editingPaymentMethodId ? "Payment method updated" : "Payment method added to checkout");

    // Auto-persist to DB
    const orgId = user?.organizationId || dbSettings?.organizationId || settings.organizationId || PersistStore.getOrgId() || "default";
    if (orgId) {
      updateSettingsFn({
        data: {
          settings: {
            ...settings,
            config: newConfig,
          },
        },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      });
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    const currentList = (
      Array.isArray(settings.config?.paymentMethods)
        ? settings.config.paymentMethods
        : DEFAULT_PAYMENT_METHODS
    ).filter((m: any) => m.id !== id);
    const newConfig = { ...(settings.config || {}), paymentMethods: currentList };
    handleChange("config", newConfig);
    toast.success("Payment method removed");

    // Auto-persist to DB
    const orgId = user?.organizationId || dbSettings?.organizationId || settings.organizationId || PersistStore.getOrgId() || "default";
    if (orgId) {
      updateSettingsFn({
        data: {
          settings: {
            ...settings,
            config: newConfig,
          },
        },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      });
    }
  };

  const navItems = [
    {
      id: "store",
      label: "Store Profile",
      description: "Branding, address & contact",
      icon: Store,
      badge: null,
    },
    {
      id: "security",
      label: "Security & PIN",
      description: "Password & cashier terminal PIN",
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: "billing",
      label: "Billing & Plans",
      description: "Subscription tier & payments",
      icon: CreditCard,
      badge: isTrialExpired && subscriptionStatus !== "active" ? "Trial Expired" : null,
      badgeVariant: isTrialExpired ? "destructive" : "default",
    },
    {
      id: "paymentMethods",
      label: "Payment Methods",
      description: "Default & custom checkout options",
      icon: Banknote,
      badge: `${paymentMethodsList.filter((m) => m.enabled !== false).length} Active`,
    },
    {
      id: "tax",
      label: "Taxes & Compliance",
      description: "VAT, GST rates & pricing mode",
      icon: Receipt,
      badge: settings.enableGST ? "GST ON" : null,
    },
    {
      id: "receipt",
      label: "Receipt Studio",
      description: "Thermal & A4 invoice customizer",
      icon: Printer,
      badge: "Live",
    },
    {
      id: "locations",
      label: "Multi-Location",
      description: "Store branches & warehouses",
      icon: MapPin,
      badge: null,
    },
    {
      id: "data",
      label: "Data & Storage",
      description: "Offline cache & database sync",
      icon: Database,
      badge: null,
    },
  ];

  if (isSettingsLoading) {
    return (
      <div className="page-container">
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="page-container pb-32 animate-in fade-in duration-300">
      {/* Top Header */}
      <PageHeader
        title="Settings & Preferences"
        description="Manage your business profile, receipt design, taxation, team security, and billing."
        actions={
          <div className="flex items-center gap-2.5">
            {hasChanges && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold py-1 px-2.5 gap-1.5 animate-pulse hidden sm:flex">
                <span className="size-1.5 rounded-full bg-primary" /> Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (dbSettings) setSettings(dbSettings);
                toast.info("Reverted to last saved settings");
              }}
              disabled={!hasChanges || isSaving}
              className="text-xs font-semibold h-9 px-3"
            >
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="font-bold text-xs shadow-soft min-w-[130px] h-9"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="size-3.5 mr-1.5" />
              )}
              Save Settings
            </Button>
          </div>
        }
      />

      {/* Main Settings Grid: Navigation Sidebar + Content Panels */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Sidebar for Desktop / Responsive Horizontal Pills on Mobile */}
        <div className="lg:col-span-3">
          {/* Desktop Navigation Card */}
          <div className="hidden lg:flex flex-col rounded-2xl border border-border/80 bg-card p-2 shadow-card sticky top-20 space-y-1">
            <div className="px-3 py-2 border-b border-border/50 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Settings Menu
              </span>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group relative ${isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "hover:bg-muted/70 text-foreground"
                    }`}
                >
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-card border border-border/50"
                      }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate block">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${isActive
                              ? "bg-white/25 text-white"
                              : item.badgeVariant === "destructive"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] truncate block mt-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"
                        }`}
                    >
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Organization Info Footer Card */}
            <div className="mt-4 pt-3 border-t border-border/60 px-3 py-2 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tenant Code</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(user?.orgId || orgId, "tenant")}
                  className="flex items-center gap-1 text-[10px] font-mono font-bold text-primary hover:underline"
                >
                  {copiedKey === "tenant" ? (
                    <>
                      <CheckCircle2 className="size-3 text-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> {user?.orgId || orgId}
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="size-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold text-foreground">
                  {settings.storeName || user?.name || "OneDesk360 Store"}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Horizontal Pill Scrollable Tabs */}
          <div className="lg:hidden flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-soft"
                      : "bg-card text-foreground border-border/80 hover:bg-muted"
                    }`}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] px-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: Store Profile & Branding */}
          {activeTab === "store" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Store Identity Live Preview Banner */}
              <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-2xl border-2 border-primary/20 bg-muted/50 p-1 shadow-inner flex items-center justify-center shrink-0 overflow-hidden">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Store Logo"
                        className="size-full object-contain"
                      />
                    ) : (
                      <Store className="size-8 text-muted-foreground/60" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-foreground tracking-tight">
                        {settings.storeName || "Your Store Name"}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {settings.businessType || "Universal Retail"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {settings.address || "Add physical address to show on customer receipts"}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5 font-medium">
                      <span>Phone: {settings.phone || "Not set"}</span>
                      <span>•</span>
                      <span>Currency: {settings.currencySymbol} ({settings.currencyCode})</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs font-semibold py-1 px-3">
                  <CheckCircle2 className="size-3.5 mr-1" /> Active Store
                </Badge>
              </div>

              {/* Branding and Basic Details */}
              <SettingsCard
                icon={Store}
                title="Store Branding & Contact Information"
                desc="Your brand details and registered contact info appear on printed receipts, digital invoices, and customer tickets."
              >
                <div className="space-y-6">
                  <FileUpload
                    label="Store Brand Logo"
                    description="Upload your high-resolution store logo (PNG, JPG, or WEBP). Will automatically render on thermal receipts, A4 invoices, and email summaries."
                    value={settings.logoUrl || ""}
                    onChange={(url) => handleChange("logoUrl", url)}
                    folder="store-logos"
                    maxSizeMB={5}
                  />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Store Name" description="The public brand or trading name of your business.">
                      <Input
                        value={settings.storeName}
                        onChange={(e) => handleChange("storeName", e.target.value)}
                        placeholder="e.g. Apex Supermarket & Grocery"
                        className="font-semibold"
                      />
                    </Field>

                    <Field label="Tax Registration ID / VAT / GSTIN" description="Printed on receipt header for statutory compliance.">
                      <Input
                        value={settings.taxId}
                        onChange={(e) => handleChange("taxId", e.target.value)}
                        placeholder="e.g. VAT-89472910 or GSTIN29ABCDE"
                      />
                    </Field>

                    <Field label="Physical Store Address" full description="Complete street address, city, state, and postal code.">
                      <Input
                        value={settings.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        placeholder="e.g. 120 Commercial Avenue, Metro Square, 560001"
                      />
                    </Field>

                    <Field label="Store Customer Support Phone" description="Printed on receipts for customer inquiries and returns.">
                      <PhoneInput
                        value={settings.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleChange("phone", e.target.value);
                        }}
                      />
                    </Field>

                    <Field label="Registered Account Email (Read-Only)" description="Primary authentication login email.">
                      <Input
                        value={settings.email}
                        readOnly
                        disabled
                        className="bg-muted/60 text-muted-foreground cursor-not-allowed font-medium"
                      />
                    </Field>

                    <Field label="Business Industry & Template" description="Enables industry-tailored navigation items and POS layouts.">
                      <SearchableSelect
                        value={settings.businessType || "UNIVERSAL"}
                        onChange={(val) => handleChange("businessType", val)}
                        options={Object.values(BUSINESS_TEMPLATES).map((tmpl) => ({
                          value: tmpl.type,
                          label: tmpl.label,
                        }))}
                      />
                    </Field>
                  </div>
                </div>
              </SettingsCard>

              {/* Regional Localization & Currency */}
              <SettingsCard
                icon={Globe}
                title="Regional Localization & Currency"
                desc="Configure currency display symbol, accounting timezone, and date presentation format."
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label={t("currency") || "Currency Preset"} description="Quick select standard world currencies.">
                    <SearchableSelect
                      value={settings.currencySymbol || "$"}
                      onChange={(val) => {
                        const opt = CURRENCY_OPTIONS.find((o) => o.symbol === val);
                        handleChange("currencySymbol", val);
                        if (opt) handleChange("currencyCode", opt.code);
                      }}
                      options={CURRENCY_OPTIONS.map((c) => ({
                        value: c.symbol,
                        label: c.label,
                      }))}
                    />
                  </Field>

                  <Field label="Custom Currency Symbol" description="Symbol rendered beside all price figures in POS.">
                    <Input
                      className="font-bold text-base"
                      value={settings.currencySymbol || "$"}
                      onChange={(e) => handleChange("currencySymbol", e.target.value)}
                      placeholder="e.g. $, ₹, ৳, €, £, AED"
                    />
                  </Field>

                  <Field label="Operational Time Zone" description="Determines timestamps on invoices and sales reports.">
                    <SearchableSelect
                      value={settings.timeZone || "UTC"}
                      onChange={(val) => handleChange("timeZone", val)}
                      options={TIME_ZONES}
                      placeholder="Select Time Zone"
                    />
                  </Field>

                  <Field label="Display Date Format" description="Format used across sales reports, invoices, and logs.">
                    <SearchableSelect
                      value={settings.dateFormat || "dd MMM yyyy"}
                      onChange={(val) => handleChange("dateFormat", val)}
                      options={DATE_FORMATS}
                    />
                  </Field>
                </div>
              </SettingsCard>
            </div>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SettingsCard
                icon={ShieldCheck}
                title="Account Security & Access Credentials"
                desc="Update your master account login password and quick cashier POS terminal PIN."
              >
                <form onSubmit={handleUpdateSecurity} className="space-y-6">
                  {/* Account Summary Banner */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-soft">
                        {user?.name?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {user?.name || "Admin"} ({user?.email})
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Logged in Role: <span className="uppercase font-bold text-primary">{user?.role || "admin"}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-card text-xs font-semibold">
                      Security Active
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold">
                        Current Password / PIN (Verification Required) <span className="text-destructive">*</span>
                      </Label>
                      <PasswordInput
                        value={passForm.currentPassword}
                        onChange={(e) =>
                          setPassForm((p) => ({ ...p, currentPassword: e.target.value }))
                        }
                        placeholder="Enter your current password or 4-digit PIN"
                        className="bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Required to verify identity before saving any security credential changes.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Lock className="size-3.5 text-muted-foreground" /> New Password (Optional)
                      </Label>
                      <PasswordInput
                        value={passForm.newPassword}
                        onChange={(e) => {
                          setPassForm((p) => ({ ...p, newPassword: e.target.value }));
                          clearSecError("newPassword");
                        }}
                        placeholder="At least 4 characters"
                        className={`bg-background ${secErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      <FieldError message={secErrors.newPassword} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Lock className="size-3.5 text-muted-foreground" /> Confirm New Password
                      </Label>
                      <PasswordInput
                        value={passForm.confirmPassword}
                        onChange={(e) => {
                          setPassForm((p) => ({ ...p, confirmPassword: e.target.value }));
                          clearSecError("confirmPassword");
                        }}
                        placeholder="Re-enter new password"
                        className={`bg-background ${secErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {passForm.newPassword && passForm.confirmPassword && (
                        <p className={`text-[11px] font-medium flex items-center gap-1 mt-1 ${passForm.newPassword === passForm.confirmPassword ? "text-success" : "text-destructive"}`}>
                          {passForm.newPassword === passForm.confirmPassword ? (
                            <>
                              <CheckCircle2 className="size-3" /> Passwords match
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3" /> Passwords do not match
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {/* POS Terminal 4-digit PIN Box */}
                    <div className="sm:col-span-2 pt-4 border-t border-border/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-muted/20">
                        <div>
                          <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                            <Key className="size-4 text-primary" /> POS Cashier Quick Access PIN
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            4-digit numeric code used for fast cashier switching on the POS checkout screen.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showPin ? "text" : "password"}
                            maxLength={4}
                            value={passForm.newPin}
                            onChange={(e) =>
                              setPassForm((p) => ({ ...p, newPin: e.target.value.replace(/\D/g, "") }))
                            }
                            placeholder="1234"
                            className="w-28 font-mono text-center tracking-widest text-lg font-bold bg-background h-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPin(!showPin)}
                            className="h-10 px-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-border/60">
                    <Button
                      type="submit"
                      disabled={isUpdatingSecurity}
                      className="font-bold text-xs shadow-soft"
                    >
                      {isUpdatingSecurity ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <ShieldCheck className="size-4 mr-2" />
                      )}
                      Update Security Credentials
                    </Button>
                  </div>
                </form>
              </SettingsCard>
            </div>
          )}

          {/* TAB 3: Billing & Subscription */}
          {activeTab === "billing" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Current Active Plan Card */}
              <SettingsCard
                icon={CreditCard}
                title="Current Subscription Status"
                desc="Overview of your active SaaS plan tier, limits, and tenant status."
              >
                <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-foreground tracking-tight">
                          {saasPlan?.name || "Trial Plan"}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            subscriptionStatus === "active"
                              ? "bg-success/15 text-success border-success/30 font-bold"
                              : "bg-warning/15 text-warning border-warning/30 font-bold"
                          }
                        >
                          {subscriptionStatus === "active"
                            ? "Active Subscription"
                            : "Trial Account"}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {subscriptionStatus === "trial" ? (
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-warning" />
                            {(() => {
                              const expiryStr = saasOrg?.planExpiryDate || settings.trialEndsAt;
                              if (!expiryStr) return "Trial active";
                              const days = getTrialDaysLeft(expiryStr);
                              if (days <= 0 || isTrialExpired)
                                return (
                                  <span className="text-destructive font-bold">
                                    Trial Expired • Please upgrade to continue
                                  </span>
                                );
                              return <span className="font-semibold text-foreground">{days} days remaining in trial</span>;
                            })()}
                          </div>
                        ) : (
                          <span className="text-success font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5" /> All modules unlocked & active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                      <div className="text-2xl font-black text-primary">
                        ₹{saasPlan?.price || 0}
                        <span className="text-xs font-normal text-muted-foreground"> / month</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        Tenant ID: {user?.orgId || orgId}
                      </p>
                    </div>
                  </div>
                </div>
              </SettingsCard>

              {/* Available SaaS Plans Catalog */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-foreground tracking-tight">Available Subscription Plans</h3>
                    <p className="text-xs text-muted-foreground">
                      Upgrade or renew your plan. Submissions are verified manually via UPI QR or Bank Transfer.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {isLoadingPlans ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border p-5 flex flex-col justify-between bg-card h-80 animate-pulse"
                      >
                        <div className="space-y-3">
                          <div className="h-5 w-1/2 bg-muted rounded"></div>
                          <div className="h-8 w-1/3 bg-muted rounded"></div>
                          <div className="h-20 w-full bg-muted/60 rounded"></div>
                        </div>
                      </div>
                    ))
                  ) : saasPlans.length === 0 ? (
                    <div className="col-span-full p-8 text-center border rounded-2xl bg-muted/20 text-muted-foreground text-sm">
                      No public subscription plans available right now.
                    </div>
                  ) : (
                    saasPlans.map((plan) => {
                      const isCurrent =
                        saasOrg?.currentPlanId === plan.id || saasPlan?.id === plan.id;
                      return (
                        <div
                          key={plan.id}
                          className={`rounded-2xl border p-5 flex flex-col justify-between relative transition-all bg-card shadow-card hover:shadow-card-hover ${isCurrent
                              ? "border-primary ring-2 ring-primary/20 bg-gradient-to-b from-primary/5 to-card"
                              : "border-border/80 hover:border-primary/40"
                            }`}
                        >
                          {isCurrent && (
                            <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-bold">
                              Current Plan
                            </Badge>
                          )}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-extrabold text-base text-foreground">{plan.name}</h4>
                              <div className="text-2xl font-black mt-1 text-primary">
                                ₹{plan.price}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                  / month
                                </span>
                              </div>
                            </div>

                            {plan.limits && (
                              <div className="space-y-2 py-3 border-t border-b border-border/60 text-xs">
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Max Users:</span>
                                  <span className="font-bold text-foreground">{plan.limits.maxUsers}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Max Products:</span>
                                  <span className="font-bold text-foreground">{plan.limits.maxProducts}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Max Branches:</span>
                                  <span className="font-bold text-foreground">{plan.limits.maxBranches}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Invoices/Month:</span>
                                  <span className="font-bold text-foreground">{plan.limits.maxInvoicesPerMonth}</span>
                                </div>
                              </div>
                            )}

                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 text-muted-foreground">
                                Features & Modules ({((plan.features as string[]) || []).length}):
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                {((plan.features as string[]) || []).map((f: string) => (
                                  <Badge key={f} variant="secondary" className="text-[10px] bg-muted/80">
                                    {f.replace("/", "").toUpperCase() || "CORE"}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              setSelectedPlanForUpgrade(plan);
                              setPaymentForm({
                                utrNumber: "",
                                paymentMethod: "UPI / QR Scan",
                                note: "",
                                billingCycle: "monthly",
                              });
                            }}
                            className={`w-full mt-6 font-bold text-xs shadow-soft ${isCurrent ? "bg-primary hover:bg-primary/90" : ""}`}
                            variant={isCurrent ? "default" : "outline"}
                          >
                            {isCurrent ? "Renew / Recharge Plan" : "Upgrade to " + plan.name}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Payment Methods Management */}
          {activeTab === "paymentMethods" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SettingsCard
                icon={Banknote}
                title="POS Checkout Payment Methods"
                desc="Configure available payment methods in the checkout terminal. Standard options (Cash, Card, UPI, Split, Credit) are always ready to use, and you can add custom localized options like bKash, Nagad, Bank Wire, or Gift Vouchers."
                headerRight={
                  <Button
                    onClick={() => {
                      setEditingPaymentMethodId(null);
                      setPaymentMethodForm({
                        id: "",
                        label: "",
                        icon: "smartphone",
                        type: "digital",
                        enabled: true,
                        notes: "",
                      });
                      setShowAddPaymentMethodDialog(true);
                    }}
                    size="sm"
                    className="font-bold text-xs gap-1.5 shadow-soft h-9 cursor-pointer"
                  >
                    <Plus className="size-4" /> Add Payment Method
                  </Button>
                }
              >
                <div className="space-y-6">
                  {/* Default Standard System Methods */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-border/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-primary" />
                        Standard System Methods
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Always included in checkout
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {paymentMethodsList
                        .filter((m) => m.isDefault)
                        .map((method) => {
                          const Icon = getPaymentMethodIconComponent(method.icon || method.id);
                          return (
                            <div
                              key={method.id}
                              className={cn(
                                "flex items-center justify-between p-3.5 rounded-2xl border transition-all bg-card shadow-xs",
                                method.enabled
                                  ? "border-border/80 hover:border-primary/40"
                                  : "opacity-60 bg-muted/20 border-dashed border-border/60",
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                  <Icon className="size-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground truncate">
                                      {method.label}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] font-mono uppercase bg-muted/80 text-muted-foreground"
                                    >
                                      System
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground capitalize">
                                    Type: {method.type || "standard"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span
                                  className={cn(
                                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                    method.enabled
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                      : "bg-muted text-muted-foreground border-border/60",
                                  )}
                                >
                                  {method.enabled ? "Active" : "Disabled"}
                                </span>
                                <span
                                  onClick={() =>
                                    handleTogglePaymentMethod(method.id, method.enabled === false)
                                  }
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${method.enabled !== false ? "bg-primary" : "bg-muted-foreground/25"}`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${method.enabled !== false ? "translate-x-5" : "translate-x-0"}`}
                                  />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Custom Merchant Payment Methods */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between pb-1 border-b border-border/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" />
                        Custom & Local Payment Methods
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {paymentMethodsList.filter((m) => !m.isDefault).length} custom methods added
                      </span>
                    </div>

                    {paymentMethodsList.filter((m) => !m.isDefault).length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10 space-y-2">
                        <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto">
                          <Plus className="size-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          No custom payment methods added
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Need localized methods like bKash, Nagad, Rocket, Bank Wire, or Store Voucher? Click &quot;Add Payment Method&quot; above.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {paymentMethodsList
                          .filter((m) => !m.isDefault)
                          .map((method) => {
                            const Icon = getPaymentMethodIconComponent(method.icon || method.id);
                            return (
                              <div
                                key={method.id}
                                className={cn(
                                  "flex items-center justify-between p-3.5 rounded-2xl border transition-all bg-card shadow-xs",
                                  method.enabled
                                    ? "border-border/80 hover:border-primary/40"
                                    : "opacity-60 bg-muted/20 border-dashed border-border/60",
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                                    <Icon className="size-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-foreground truncate">
                                        {method.label}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] font-mono uppercase bg-primary/5 text-primary border-primary/20"
                                      >
                                        Custom
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {method.notes || `Type: ${method.type || "custom"}`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    onClick={() =>
                                      handleTogglePaymentMethod(method.id, method.enabled === false)
                                    }
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${method.enabled !== false ? "bg-primary" : "bg-muted-foreground/25"}`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${method.enabled !== false ? "translate-x-5" : "translate-x-0"}`}
                                    />
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditingPaymentMethodId(method.id);
                                      setPaymentMethodForm(method);
                                      setShowAddPaymentMethodDialog(true);
                                    }}
                                    className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                    title="Edit Payment Method"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePaymentMethod(method.id)}
                                    className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="Delete Payment Method"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </SettingsCard>
            </div>
          )}

          {/* TAB 4: Taxes & Compliance */}
          {activeTab === "tax" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SettingsCard
                icon={Receipt}
                title="Tax Configuration & Rates"
                desc="Configure baseline tax percentages applied to transactions, and set whether product shelf prices are tax-inclusive."
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Standard Tax Rate (%)" description="Default VAT / GST percentage applied to general items.">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="font-bold text-base"
                        value={settings.standardRate}
                        onChange={(e) => handleChange("standardRate", parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 5 or 18"
                      />
                    </Field>

                    <Field label="Reduced / Concession Rate (%)" description="Lower tax bracket for essential foodstuffs, books, or medicines.">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="font-bold text-base"
                        value={settings.reducedRate}
                        onChange={(e) => handleChange("reducedRate", parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 0 or 5"
                      />
                    </Field>

                    <ToggleRow
                      label="Prices Include Tax (Tax-Inclusive Mode)"
                      description="When enabled, entered shelf prices already include tax. When off, tax is added during cart calculation."
                      on={settings.pricesIncludeTax}
                      onChange={() => handleChange("pricesIncludeTax", !settings.pricesIncludeTax)}
                    />

                    <ToggleRow
                      label="Show Tax Breakdown on Receipts"
                      description="Prints itemized CGST / SGST / VAT line items on customer bill tickets."
                      on={settings.showTaxBreakdown}
                      onChange={() => handleChange("showTaxBreakdown", !settings.showTaxBreakdown)}
                    />

                    <ToggleRow
                      label="Enable Dual Mode GST / VAT Compliance"
                      description="Activates state jurisdiction codes, GSTIN reporting, and HSN tax invoice layouts."
                      on={settings.enableGST}
                      onChange={() => handleChange("enableGST", !settings.enableGST)}
                    />

                    {settings.enableGST && (
                      <>
                        <Field label="GSTIN / VAT Identification Number" description="15-character statutory tax registration number.">
                          <Input
                            placeholder="e.g. 29ABCDE1234F1Z5"
                            value={settings.gstin || ""}
                            onChange={(e) => handleChange("gstin", e.target.value)}
                            className="font-mono"
                          />
                        </Field>
                        <Field label="State / Jurisdiction Code" description="e.g. 29 for Karnataka, 19 for West Bengal.">
                          <Input
                            placeholder="e.g. 29"
                            value={settings.stateCode || ""}
                            onChange={(e) => handleChange("stateCode", e.target.value)}
                            className="font-mono"
                          />
                        </Field>
                      </>
                    )}
                  </div>

                  {/* Interactive Tax Calculation Visualizer */}
                  <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-card to-primary/10 p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-xs font-black text-primary uppercase tracking-wider">
                          Tax Simulator Sample ({settings.currencySymbol || "$"}100 Item)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {settings.pricesIncludeTax
                          ? `Tax-Inclusive: Shelf Price ${settings.currencySymbol || "$"}100.00 → Base: ${settings.currencySymbol || "$"}${(100 / (1 + (Number(settings.standardRate) || 0) / 100)).toFixed(2)}, Tax (${settings.standardRate}%): ${settings.currencySymbol || "$"}${(100 - 100 / (1 + (Number(settings.standardRate) || 0) / 100)).toFixed(2)}`
                          : `Tax-Exclusive: Shelf Price ${settings.currencySymbol || "$"}100.00 + Tax (${settings.standardRate}%): ${settings.currencySymbol || "$"}${((100 * (Number(settings.standardRate) || 0)) / 100).toFixed(2)} → Total: ${settings.currencySymbol || "$"}${(100 + (100 * (Number(settings.standardRate) || 0)) / 100).toFixed(2)}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-card border-primary/40 text-primary text-xs font-black shrink-0 py-1 px-3">
                      {settings.standardRate}% Rate Active
                    </Badge>
                  </div>
                </div>
              </SettingsCard>
            </div>
          )}

          {/* TAB 5: Receipt Studio & Invoice Customizer */}
          {activeTab === "receipt" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <ResizablePanelGroup
                direction={isMobile ? "vertical" : "horizontal"}
                className={`items-stretch w-full gap-5 ${isMobile ? "min-h-[1200px]" : ""}`}
              >
                {/* Left Panel: Form Settings */}
                <ResizablePanel defaultSize={55} minSize={35}>
                  <div className="h-full pr-1">
                    <SettingsCard
                      icon={Printer}
                      title="Receipt & Invoice Template"
                      desc="Customise header/footer notes, bank settlement info, signature, and printed terms."
                    >
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <Field label="Header Greeting Note" description="Printed right below your store logo.">
                            <Input
                              value={settings.headerNote}
                              onChange={(e) => handleChange("headerNote", e.target.value)}
                              placeholder="e.g. Thanks for shopping with us!"
                            />
                          </Field>

                          <Field label="Footer Thank You Note" description="Printed at the bottom of the receipt.">
                            <Input
                              value={settings.footerNote}
                              onChange={(e) => handleChange("footerNote", e.target.value)}
                              placeholder="e.g. Goods once sold cannot be returned."
                            />
                          </Field>
                        </div>

                        {/* Bank Details Container */}
                        <div className="border border-border/80 p-4 sm:p-5 rounded-2xl bg-muted/20 space-y-4">
                          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                Bank Wire & Settlement Info
                              </h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Printed on corporate A4 invoices for direct bank transfer payments.
                              </p>
                            </div>
                            <Landmark className="size-4 text-primary" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Bank Name">
                              <Input
                                placeholder="e.g. State Bank of India"
                                value={bankInfo.bankName}
                                onChange={(e) => handleBankChange("bankName", e.target.value)}
                              />
                            </Field>
                            <Field label="Account Holder Name">
                              <Input
                                placeholder="e.g. Acme Retail Pvt Ltd"
                                value={bankInfo.holderName}
                                onChange={(e) => handleBankChange("holderName", e.target.value)}
                              />
                            </Field>
                            <Field label="Account Number">
                              <Input
                                placeholder="e.g. 10023456789012"
                                value={bankInfo.accountNo}
                                onChange={(e) => handleBankChange("accountNo", e.target.value)}
                                className="font-mono"
                              />
                            </Field>
                            <Field label="IFSC / Routing / SWIFT Code">
                              <Input
                                placeholder="e.g. SBIN0001234"
                                value={bankInfo.ifscCode}
                                onChange={(e) => handleBankChange("ifscCode", e.target.value)}
                                className="font-mono"
                              />
                            </Field>
                          </div>
                        </div>

                        <Field label="UPI Handle / Payment Address" full description="Generates a scannable payment QR on thermal bill slips.">
                          <Input
                            placeholder="e.g. storename@okaxis"
                            value={settings.upiId || ""}
                            onChange={(e) => handleChange("upiId", e.target.value)}
                            className="font-mono"
                          />
                        </Field>

                        <Field label="Invoice Declaration Statement" full>
                          <Textarea
                            className="min-h-[70px] text-xs"
                            placeholder="e.g. We declare that this invoice shows the actual price of goods described."
                            value={settings.receiptDeclaration || ""}
                            onChange={(e) => handleChange("receiptDeclaration", e.target.value)}
                          />
                        </Field>

                        <Field label="Terms & Conditions (A4 Invoices)" full>
                          <Textarea
                            className="min-h-[70px] text-xs"
                            placeholder="e.g. Warranty valid with original purchase invoice only."
                            value={settings.termsAndConditions || ""}
                            onChange={(e) => handleChange("termsAndConditions", e.target.value)}
                          />
                        </Field>

                        <FileUpload
                          label="Authentication Signature (For Receipt)"
                          description="Upload signature image (transparent PNG recommended) to display on printed receipts."
                          value={settings.signatureUrl || ""}
                          onChange={(url) => handleChange("signatureUrl", url)}
                          folder="signatures"
                          maxSizeMB={2}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <ToggleRow
                            label="Email receipt by default"
                            on={settings.emailReceiptDefault}
                            onChange={() =>
                              handleChange("emailReceiptDefault", !settings.emailReceiptDefault)
                            }
                          />
                          <ToggleRow
                            label="Print store logo"
                            on={settings.printStoreLogo}
                            onChange={() => handleChange("printStoreLogo", !settings.printStoreLogo)}
                          />
                        </div>
                      </div>
                    </SettingsCard>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Live Receipt Preview */}
                <ResizablePanel defaultSize={45} minSize={35}>
                  <div className="h-full pl-1">
                    <SettingsCard
                      icon={Eye}
                      title="Live Visual Studio"
                      desc={previewFormat === "thermal" ? "Thermal Slip (80mm)" : "Standard A4 Invoice"}
                      headerRight={
                        <div className="flex bg-muted/80 rounded-xl p-1 border border-border/60">
                          <button
                            type="button"
                            onClick={() => setPreviewFormat("thermal")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${previewFormat === "thermal"
                                ? "bg-card shadow-soft text-primary"
                                : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            80mm Thermal
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewFormat("a4")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${previewFormat === "a4"
                                ? "bg-card shadow-soft text-primary"
                                : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            A4 Invoice
                          </button>
                        </div>
                      }
                    >
                      <div className="rounded-2xl border border-border/80 bg-neutral-100 dark:bg-neutral-900/50 p-4 sm:p-6 overflow-auto flex justify-center min-h-[620px] max-h-[800px] shadow-inner">
                        <div className="shadow-2xl rounded-sm">
                          <PosPrintLayouts
                            preview={true}
                            state={{
                              printFormat: previewFormat,
                              settings: { ...settings },
                              printData: {
                                id: "INV-10294",
                                date: new Date().toLocaleString(),
                                storeName: settings.storeName || "Apex Supermarket",
                                storeAddress: settings.address || "120 Commercial Avenue, City",
                                storePhone: settings.phone || "+1 (555) 019-2834",
                                customer: "Walk-in Customer",
                                payment: "Cash",
                                lines: [
                                  {
                                    product: { name: "Premium Arabica Coffee Beans" },
                                    qty: 2,
                                    unitPrice: 15.0,
                                    total: 30.0,
                                  },
                                  {
                                    product: { name: "Organic Almond Milk 1L" },
                                    qty: 1,
                                    unitPrice: 20.0,
                                    total: 20.0,
                                  },
                                ],
                                subtotal: 50.0,
                                discountAmt: 5.0,
                                taxAmt: 2.5,
                                cgstAmt: 1.25,
                                sgstAmt: 1.25,
                                igstAmt: 0,
                                total: 47.5,
                                cashTendered: 50.0,
                                changeDue: 2.5,
                                receiptHeader: settings.headerNote,
                                receiptFooter: settings.footerNote,
                                receiptDeclaration: settings.receiptDeclaration,
                                termsAndConditions: settings.termsAndConditions,
                                privacyPolicy: settings.privacyPolicy,
                                bankDetails: settings.bankDetails,
                                upiId: settings.upiId,
                                amountInWords: numberToWords(47.5),
                                signatureUrl: settings.signatureUrl,
                              },
                            }}
                          />
                        </div>
                      </div>
                    </SettingsCard>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}

          {/* TAB 6: Multi-Location */}
          {activeTab === "locations" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <LocationsTab />
            </div>
          )}

          {/* TAB 7: Data & Diagnostics */}
          {activeTab === "data" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <SettingsCard
                icon={Database}
                title="Data & Storage Diagnostics"
                desc="Manage local storage caches, cloud sync state, and database maintenance."
              >
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Cloud Sync Status</span>
                      <p className="text-sm font-bold text-success flex items-center gap-1.5">
                        <CheckCircle2 className="size-4" /> Real-time Cloud Connected
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">Active Tenant Org</span>
                      <p className="text-sm font-mono font-bold text-foreground">
                        {user?.orgId || orgId}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-destructive/20 bg-destructive/5 rounded-2xl gap-4">
                    <div>
                      <h4 className="font-bold text-destructive text-sm">Wipe Local Database Cache</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Clear offline product catalog, cache caches, and temporary sales drafts.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmReset(true)} className="font-bold text-xs shadow-soft shrink-0">
                      <Trash2 className="size-3.5 mr-1.5" /> Reset Cache
                    </Button>
                  </div>
                </div>
              </SettingsCard>
            </div>
          )}
        </div>
      </div>

      {/* Floating Unsaved Changes Bottom Banner */}
      {hasChanges && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3.5 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl px-5 py-3 shadow-2xl ring-2 ring-primary/20">
            <span className="flex size-2.5 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-black text-foreground">You have unsaved changes</span>
            <div className="h-4 w-px bg-border/80 mx-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (dbSettings) setSettings(dbSettings);
                toast.info("Changes discarded");
              }}
              className="h-8 text-xs font-semibold"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 text-xs font-bold shadow-soft min-w-[110px]"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="size-3.5 mr-1" />
              )}
              Save Now
            </Button>
          </div>
        </div>
      )}

      {/* Wipe Database Modal */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Local Data Cache?</AlertDialogTitle>
            <AlertDialogDescription>
              This will safely clear temporary offline cache and reload your settings from the cloud database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        onSuccess={() => {
          setTimeout(() => window.location.reload(), 500);
        }}
      />

      {/* Manual Payment Verification Modal */}
      <Dialog
        open={!!selectedPlanForUpgrade}
        onOpenChange={(open) => !open && setSelectedPlanForUpgrade(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Subscription Payment Verification
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Upgrading/renewing <strong>{selectedPlanForUpgrade?.name}</strong> at{" "}
              <strong>
                ₹
                {paymentForm.billingCycle === "yearly"
                  ? selectedPlanForUpgrade?.yearlyPrice || selectedPlanForUpgrade?.price * 12
                  : selectedPlanForUpgrade?.monthlyPrice || selectedPlanForUpgrade?.price}
                /{paymentForm.billingCycle === "yearly" ? "year" : "month"}
              </strong>
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex gap-4 items-center mb-2">
              <span className="text-xs font-bold">Billing Cycle:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={paymentForm.billingCycle === "monthly" ? "default" : "outline"}
                  onClick={() => setPaymentForm({ ...paymentForm, billingCycle: "monthly" })}
                  className="h-8 text-xs font-semibold"
                >
                  Monthly
                </Button>
                <Button
                  size="sm"
                  variant={paymentForm.billingCycle === "yearly" ? "default" : "outline"}
                  onClick={() => setPaymentForm({ ...paymentForm, billingCycle: "yearly" })}
                  className="h-8 text-xs font-semibold"
                >
                  Yearly (Save 20%)
                </Button>
              </div>
            </div>

            {/* QR Code and Bank Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-[30%_70%] gap-5 p-4 border border-border/80 rounded-2xl bg-muted/20">
              <div className="flex flex-col items-center justify-center p-3 bg-card rounded-xl border shadow-soft text-center">
                <span className="text-xs font-bold mb-2 text-foreground">
                  Scan QR
                </span>
                {paymentConfig?.qrCodeUrl ? (
                  <img
                    src={paymentConfig.qrCodeUrl}
                    alt="Payment QR Code"
                    className="size-32 object-contain border p-1 rounded-lg"
                  />
                ) : (
                  <div className="size-32 bg-muted flex items-center justify-center text-xs text-muted-foreground rounded-lg">
                    No QR Configured
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-2">
                  UPI, GPay, PhonePe
                </span>
              </div>

              <div className="space-y-2.5 text-xs flex flex-col justify-center">
                <span className="font-bold text-xs uppercase tracking-wider block border-b pb-1">
                  Bank Account Information
                </span>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Beneficiary Name</span>
                  <span className="font-bold">
                    {paymentConfig?.accountName || "OneDesk360 Pvt Ltd"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Bank Name</span>
                  <span className="font-semibold">{paymentConfig?.bankName || "HDFC Bank"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Account Number</span>
                  <span className="font-mono font-bold text-primary">
                    {paymentConfig?.accountNo || "50200098765432"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">IFSC Code</span>
                    <span className="font-mono font-bold">{paymentConfig?.ifscCode || "HDFC0001234"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">UPI ID</span>
                    <span className="font-mono font-bold">{paymentConfig?.upiId || "pos@hdfc"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-info/10 border border-info/25 rounded-xl text-xs text-info flex items-start gap-2">
              <HelpCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                {paymentConfig?.instructions ||
                  "Scan the QR code or transfer directly via NEFT/IMPS. Submit your Transaction UTR below for immediate super admin verification."}
              </span>
            </div>

            {/* Verification Form */}
            <div className="space-y-4 border-t pt-3">
              <div>
                <Label className="text-xs font-bold block mb-2">Select Payment Method</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "UPI / QR Scan",
                      label: "UPI / QR Scan",
                      desc: "GPay, PhonePe, Paytm",
                      icon: QrCode,
                    },
                    {
                      id: "NEFT / IMPS / RTGS",
                      label: "Bank Wire Transfer",
                      desc: "NEFT, IMPS, RTGS",
                      icon: Landmark,
                    },
                    {
                      id: "Cash / Cheque Deposit",
                      label: "Cash / Cheque",
                      desc: "Direct Deposit",
                      icon: Banknote,
                    },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentForm.paymentMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method.id })}
                        className={`cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all select-none ${isSelected
                            ? "border-primary bg-primary/10 shadow-soft ring-2 ring-primary/20 text-primary font-bold"
                            : "border-border/80 bg-card hover:bg-muted/50 text-foreground"
                          }`}
                      >
                        <Icon
                          className={`size-4 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="font-bold text-xs">{method.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {method.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold">Amount Paid</Label>
                  <Input
                    value={`₹${paymentForm.billingCycle === "yearly" ? selectedPlanForUpgrade?.yearlyPrice || selectedPlanForUpgrade?.price * 12 : selectedPlanForUpgrade?.monthlyPrice || selectedPlanForUpgrade?.price}`}
                    disabled
                    className="mt-1 font-mono font-bold bg-muted text-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-bold">
                    {paymentForm.paymentMethod === "UPI / QR Scan"
                      ? "UPI Reference / Transaction ID"
                      : paymentForm.paymentMethod === "NEFT / IMPS / RTGS"
                        ? "UTR Number / Reference No."
                        : "Cheque No. / Deposit Slip No."}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={paymentForm.utrNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, utrNumber: e.target.value })}
                    placeholder={
                      paymentForm.paymentMethod === "UPI / QR Scan"
                        ? "123456789012 (12-digit UPI Ref)"
                        : paymentForm.paymentMethod === "NEFT / IMPS / RTGS"
                          ? "HDFC12345678 (Bank UTR)"
                          : "CHQ00123 (Cheque/Deposit No.)"
                    }
                    className="mt-1 font-mono font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Sender Note / Bank Account Name (Optional)</Label>
                <Input
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  placeholder="e.g. Paid from Rahul's GPay account"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              variant="outline"
              onClick={() => setSelectedPlanForUpgrade(null)}
              disabled={isSubmittingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentProofSubmit}
              disabled={isSubmittingPayment || !paymentForm.utrNumber.trim()}
              className="font-bold text-xs shadow-soft"
            >
              {isSubmittingPayment && <Loader2 className="size-4 animate-spin mr-2" />}
              Submit Payment Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Custom Payment Method Slide-out Drawer */}
      <Sheet
        open={showAddPaymentMethodDialog}
        onOpenChange={(open) => {
          setShowAddPaymentMethodDialog(open);
          if (!open) setEditingPaymentMethodId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl sm:w-[580px] md:w-[650px] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto"
        >
          <div className="space-y-6">
            <SheetHeader className="text-left pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 shadow-soft">
                  <Banknote className="size-6" />
                </div>
                <div>
                  <SheetTitle className="font-extrabold text-lg text-foreground">
                    {editingPaymentMethodId ? "Edit Payment Method" : "Add Custom Payment Method"}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    Configure a digital wallet, bank transfer, or custom checkout option for your POS terminal.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form id="payment-method-drawer-form" onSubmit={handleSavePaymentMethod} className="space-y-5 pt-1">
              {/* Quick Fill Presets (Only when adding new) */}
              {!editingPaymentMethodId && (
                <div className="space-y-2 bg-muted/20 p-3.5 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    ⚡ Quick Presets (1-Click Fill)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "bKash", icon: "smartphone", type: "digital" },
                      { label: "Nagad", icon: "smartphone", type: "digital" },
                      { label: "Rocket", icon: "smartphone", type: "digital" },
                      { label: "Bank Transfer", icon: "landmark", type: "other" },
                      { label: "Cheque", icon: "receipt", type: "other" },
                      { label: "PayPal", icon: "wallet", type: "digital" },
                      { label: "Zelle", icon: "smartphone", type: "digital" },
                      { label: "Gift Voucher", icon: "coins", type: "other" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setPaymentMethodForm({
                            ...paymentMethodForm,
                            label: preset.label,
                            icon: preset.icon,
                            type: preset.type as any,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border/80 bg-background text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Payment Method Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={paymentMethodForm.label}
                  onChange={(e) =>
                    setPaymentMethodForm({ ...paymentMethodForm, label: e.target.value })
                  }
                  placeholder="e.g. bKash Personal, Nagad Merchant, HDFC Wire"
                  className="font-semibold text-sm h-11 rounded-xl"
                  required
                  autoFocus
                />
              </div>

              {/* Visual Icon Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Select Icon</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_METHOD_ICONS.map((opt) => {
                    const Icon = getPaymentMethodIconComponent(opt.id);
                    const isSelected = (paymentMethodForm.icon || "smartphone") === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setPaymentMethodForm({ ...paymentMethodForm, icon: opt.id })
                        }
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs font-medium cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary font-bold shadow-xs"
                            : "border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-muted/30",
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span className="truncate text-xs">{opt.label.split(" / ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Payment Category</Label>
                  <select
                    value={paymentMethodForm.type || "digital"}
                    onChange={(e) =>
                      setPaymentMethodForm({
                        ...paymentMethodForm,
                        type: e.target.value as any,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-border/80 bg-card px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="digital">Mobile / Digital Wallet</option>
                    <option value="cash">Cash / Direct Physical</option>
                    <option value="card">Card / Terminal Swipe</option>
                    <option value="credit">Credit / Customer Ledger</option>
                    <option value="other">Bank Wire / Other Mode</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Account / Merchant Info (Optional)</Label>
                  <Input
                    value={paymentMethodForm.notes || ""}
                    onChange={(e) =>
                      setPaymentMethodForm({ ...paymentMethodForm, notes: e.target.value })
                    }
                    placeholder="e.g. Wallet No: 017XXXXXXXX / Swift Code"
                    className="text-xs h-11 rounded-xl"
                  />
                </div>
              </div>
            </form>
          </div>

          <SheetFooter className="pt-4 border-t border-border/60 gap-2 sm:gap-0 mt-6 flex flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddPaymentMethodDialog(false);
                setEditingPaymentMethodId(null);
              }}
              className="text-xs font-semibold h-10 flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="payment-method-drawer-form"
              className="font-bold text-xs shadow-soft min-w-[130px] h-10 flex-1 sm:flex-initial"
            >
              {editingPaymentMethodId ? "Update Method" : "Add to Checkout"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getPaymentMethodIconComponent(iconName?: string) {
  switch (iconName?.toLowerCase()) {
    case "banknote":
    case "cash":
      return Banknote;
    case "credit-card":
    case "card":
      return CreditCard;
    case "smartphone":
    case "upi":
    case "qr":
    case "mobile":
      return Smartphone;
    case "users":
    case "split":
      return Users;
    case "receipt":
    case "credit":
    case "invoice":
      return Receipt;
    case "landmark":
    case "bank":
      return Landmark;
    case "wallet":
      return Wallet;
    case "qr-code":
    case "qrcode":
      return QrCode;
    case "coins":
      return Coins;
    default:
      return CreditCard;
  }
}

function LocationsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", type: "store" });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: locationsRes, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationsFn(),
  });
  const locations: any[] = locationsRes?.data || [];

  const openAdd = () => {
    setEditingLocation(null);
    setFormData({ name: "", type: "store" });
    setShowForm(true);
  };

  const openEdit = (loc: any) => {
    setEditingLocation(loc);
    setFormData({ name: loc.name, type: loc.type || "store" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Location name is required.");
    setIsSaving(true);
    try {
      if (editingLocation) {
        const res = await updateLocationFn({ data: { id: editingLocation.id, updates: formData } });
        if (!res.success) throw new Error((res as any).error);
        toast.success("Location updated!");
      } else {
        const res = await createLocationFn({ data: { location: formData } });
        if (!res.success) throw new Error((res as any).error);
        toast.success("Location created!");
      }
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save location.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await deleteLocationFn({ data: { id } });
      if (!res.success) throw new Error((res as any).error);
      toast.success("Location deleted.");
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete location.");
    } finally {
      setDeletingId(null);
    }
  };

  const typeIcon = (type: string) =>
    type === "warehouse" ? (
      <Warehouse className="size-4 text-primary" />
    ) : (
      <Store className="size-4 text-primary" />
    );

  return (
    <SettingsCard
      icon={MapPin}
      title="Store & Warehouse Locations"
      desc="Manage your physical store branches, secondary outlets, and fulfillment warehouses."
      headerRight={
        <Button onClick={openAdd} size="sm" className="font-bold text-xs shadow-soft gap-1.5 h-8">
          <Plus className="size-3.5" />
          Add Location
        </Button>
      }
    >
      <div className="space-y-4">
        {showForm && (
          <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-card space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-foreground">{editingLocation ? "Edit Branch Location" : "New Branch Location"}</h4>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loc-name" className="text-xs font-bold">
                  Location Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loc-name"
                  placeholder="e.g. Downtown Flagship Store"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Facility Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">
                      <div className="flex items-center gap-2">
                        <Store className="size-3.5 text-muted-foreground" />
                        Retail Store
                      </div>
                    </SelectItem>
                    <SelectItem value="warehouse">
                      <div className="flex items-center gap-2">
                        <Warehouse className="size-3.5 text-muted-foreground" />
                        Warehouse
                      </div>
                    </SelectItem>
                    <SelectItem value="outlet">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Outlet
                      </div>
                    </SelectItem>
                    <SelectItem value="kiosk">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Kiosk
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="font-bold text-xs shadow-soft">
                {isSaving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                {editingLocation ? "Update" : "Create"} Location
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border/80 overflow-hidden shadow-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading branch locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <MapPin className="size-6 text-muted-foreground" />
              </div>
              <p className="text-foreground font-bold text-sm">No branch locations added yet</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Add your store outlets or warehouses to start tracking multi-branch inventory.
              </p>
              <Button onClick={openAdd} variant="outline" size="sm" className="mt-2 font-bold text-xs gap-1.5">
                <Plus className="size-3.5" /> Add First Location
              </Button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Branch / Facility</th>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {typeIcon(loc.type)}
                        </div>
                        <span className="font-bold text-foreground text-xs">{loc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground font-medium">
                      {loc.type || "store"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${loc.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${loc.status === "active" ? "bg-success" : "bg-muted-foreground"}`}
                        />
                        {loc.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-muted"
                          onClick={() => openEdit(loc)}
                        >
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(loc.id)}
                          disabled={deletingId === loc.id}
                        >
                          {deletingId === loc.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  desc,
  headerRight,
  children,
}: {
  icon?: any;
  title: string;
  desc: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-card flex flex-col h-full transition-all">
      <header className="mb-6 border-b border-border/60 pb-4 flex justify-between items-start gap-4">
        <div className="flex items-start gap-3.5">
          {Icon && (
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-soft">
              <Icon className="size-5" />
            </div>
          )}
          <div>
            <h2 className="text-base font-black text-foreground tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Field({
  label,
  full,
  description,
  children,
}: {
  label: string;
  full?: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label className="block text-xs font-bold text-foreground">
        {label}
      </label>
      {children}
      {description && <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description?: string;
  on?: boolean;
  onChange?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 sm:col-span-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-muted/20 shadow-soft select-none"
      onClick={onChange}
    >
      <div className="space-y-0.5 pr-4">
        <span className="text-xs sm:text-sm font-bold text-foreground block">{label}</span>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${on ? "bg-primary" : "bg-muted-foreground/25"}`}
      >
        <span
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${on ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </div>
  );
}
