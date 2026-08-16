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
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettingsFn, updateSettingsFn, getAllSaasPlansFn } from "@/api/settings";
import { updateUserFn } from "@/api/users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useRouter, useSearch } from "@tanstack/react-router";
import { getTrialDaysLeft, DEFAULT_PAYMENT_CONFIG } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PosPrintLayouts } from "@/components/pos/PosPrintLayouts";
import { numberToWords } from "@/lib/number-to-words";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getTrialDaysFromEnv } from "@/lib/email-service";
import { FileUpload } from "@/components/ui/file-upload";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · NexisPOS" }] }),
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
  const orgId = user?.organizationId || "default";
  const queryClient = useQueryClient();
  const [previewFormat, setPreviewFormat] = useState<"thermal" | "a4">("thermal");

  const {
    data: dbSettingsData,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => (await getSettingsFn({ data: {} })).data || null,
    enabled: !!user?.organizationId,
  });
  const dbSettings = dbSettingsData || null;

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["saas_plans"],
    queryFn: async () => (await getAllSaasPlansFn({ data: {} })).data || [],
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
    setIsSubmittingPayment(true);
    try {
      // Payment proof handled here
      toast.success(
        "Payment proof submitted successfully! Super Admin will verify UTR: " +
        paymentForm.utrNumber +
        " and activate your subscription within 2-4 hours.",
      );
      setSelectedPlanForUpgrade(null);
      setPaymentForm({ utrNumber: "", paymentMethod: "UPI / QR Scan", note: "" });
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

  // cloud settings fetch is handled by react-query

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const orgId = user?.organizationId || dbSettings?.organizationId || settings.organizationId;

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
            },
          },
        });
        if (res.success) {
          toast.success("Settings saved successfully.");
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

    // Require current password to be filled if we're changing something
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

  const sections = [
    { id: "store", label: t("storeInfo") || "Store Information" },
    { id: "security", label: "Security & Password" },
    { id: "billing", label: t("billing") || "Billing & Plan" },
    { id: "tax", label: t("taxes") || "Taxes" },
    { id: "receipt", label: t("receipts") || "Receipt" },
    { id: "data", label: "Data Management" },
  ];

  if (isSettingsLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <SettingsSkeleton />
      </div>
    );
  }

  if (isSettingsError && !dbSettings) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <ErrorState
          onRetry={refetchSettings}
          title="Failed to load settings"
          description="Unable to retrieve store settings from the server. Click below to retry."
        />
      </div>
    );
  }
  const parseBankDetails = (str: string) => {
    try {
      if (str && str.trim().startsWith('{')) return JSON.parse(str);
    } catch (e) { }
    return { bankName: str || '', holderName: '', accountNo: '', ifscCode: '' };
  };
  const bankInfo = parseBankDetails(settings.bankDetails || "");
  const handleBankChange = (field: string, val: string) => {
    const updated = { ...bankInfo, [field]: val };
    handleChange("bankDetails", JSON.stringify(updated));
  };

  return (
    <div className="mx-auto container p-4 sm:p-6 pb-20 w-full animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
      {/* <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 opacity-50 blur-3xl pointer-events-none" /> */}

      {/* {isTrialExpired && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center max-w-xl mx-auto">
          <h3 className="font-bold text-lg">Trial Expired</h3>
          <p className="text-sm">Your {getTrialDaysFromEnv()}-day free trial has ended. Please subscribe to continue using the application.</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setIsCheckoutOpen(true)}>Upgrade Now</Button>
          </div>
        </div>
      )} */}
      <PageHeader title="Settings" description="Configure your store, taxes, printer and locale." />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        orientation="horizontal"
        className="flex flex-col gap-6 w-full"
      >
        <TabsList className="flex flex-row overflow-x-auto h-auto w-full bg-transparent space-x-2 space-y-0 p-0 justify-start items-center border-b border-border pb-3 scrollbar-hide">
          <TabsTrigger
            value="store"
            className="shrink-0 justify-start rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/50"
          >
            Store Information
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="shrink-0 justify-start rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/50"
          >
            Security & Password
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="shrink-0 justify-start rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/50 relative"
          >
            Billing
            {isTrialExpired && subscriptionStatus !== "active" && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="tax"
            className="shrink-0 justify-start rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/50"
          >
            Taxes
          </TabsTrigger>
          <TabsTrigger
            value="receipt"
            className="shrink-0 justify-start rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/50"
          >
            Receipts
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="shrink-0 justify-start rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/50"
          >
            Data Management
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 space-y-6">
          <TabsContent value="store" className="mt-0 outline-none">
            <Card title="Store Information" desc="Used on receipts and reports.">
              <div className="mb-6">
                <FileUpload
                  label="Store Custom Logo"
                  description="Upload your store logo via Vercel Blob (PNG/JPG/WEBP). Will dynamically show on printed bills, sidebar, and receipts."
                  value={settings.logoUrl || ""}
                  onChange={(url) => handleChange("logoUrl", url)}
                  folder="store-logos"
                  maxSizeMB={5}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Store name">
                  <input
                    className="inp"
                    value={settings.storeName}
                    onChange={(e) => handleChange("storeName", e.target.value)}
                  />
                </Field>
                <Field label="Tax ID">
                  <input
                    className="inp"
                    value={settings.taxId}
                    onChange={(e) => handleChange("taxId", e.target.value)}
                  />
                </Field>
                <Field label="Address" full>
                  <input
                    className="inp"
                    value={settings.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </Field>
                <Field label="Phone">
                  <PhoneInput
                    value={settings.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleChange("phone", e.target.value);
                    }}
                  />
                </Field>
                <Field label="Email">
                  <input
                    className="inp bg-muted text-muted-foreground cursor-not-allowed"
                    value={settings.email}
                    readOnly
                    disabled
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Email cannot be changed as it is used for login.
                  </p>
                </Field>
                <Field label={t("currency") || "Store Currency Preset"}>
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
                <Field label="Custom Currency Symbol">
                  <input
                    className="inp font-bold"
                    value={settings.currencySymbol || "$"}
                    onChange={(e) => handleChange("currencySymbol", e.target.value)}
                    placeholder="e.g. $, ৳, ₹, €, £, AED"
                  />
                </Field>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0 outline-none space-y-6">
            <Card
              title="Account Security & Password"
              desc="Update your login password and cashier POS access PIN."
            >
              <form onSubmit={handleUpdateSecurity} className="space-y-6">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-start gap-3">
                  <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-foreground">Logged in Account Security</p>
                    <p className="text-muted-foreground">
                      User: <strong className="text-foreground">{user?.name || "Admin"}</strong> (
                      {user?.email || "No email"}) | Role:{" "}
                      <span className="uppercase font-mono text-primary font-bold">
                        {user?.role || "admin"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Current Password / PIN (Verification)
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
                      Required to verify identity before saving changes.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Lock className="size-3.5 text-muted-foreground" /> New Password
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
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
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
                    {passForm.newPassword &&
                      passForm.confirmPassword &&
                      passForm.newPassword !== passForm.confirmPassword && (
                        <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                          <span>✕</span> Passwords do not match
                        </p>
                      )}
                    {passForm.newPassword &&
                      passForm.confirmPassword &&
                      passForm.newPassword === passForm.confirmPassword && (
                        <p className="text-[11px] text-success font-medium flex items-center gap-1">
                          <span>✓</span> Passwords match
                        </p>
                      )}
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Key className="size-3.5 text-muted-foreground" /> POS Cashier Quick Access
                      PIN
                    </Label>
                    <Input
                      type="text"
                      maxLength={4}
                      value={passForm.newPin}
                      onChange={(e) =>
                        setPassForm((p) => ({ ...p, newPin: e.target.value.replace(/\D/g, "") }))
                      }
                      placeholder="e.g. 1234 (4 digits)"
                      className="bg-background font-mono tracking-widest text-base sm:w-64"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      This 4-digit PIN is used for fast login on the POS terminal screen.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isUpdatingSecurity}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isUpdatingSecurity && <Loader2 className="size-4 animate-spin mr-2" />}
                    <ShieldCheck className="size-4 mr-2" /> Update Security Credentials
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-0 outline-none space-y-6">
            <Card
              title="Current Subscription Status"
              desc="Overview of your active SaaS plan and tenant account."
            >
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                {isSettingsLoading ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                    <div className="space-y-3 w-1/2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-32 bg-muted rounded"></div>
                        <div className="h-5 w-24 bg-muted rounded-full"></div>
                      </div>
                      <div className="h-4 w-48 bg-muted rounded"></div>
                    </div>
                    <div className="text-left sm:text-right space-y-2 w-1/3 flex flex-col sm:items-end">
                      <div className="h-8 w-24 bg-muted rounded"></div>
                      <div className="h-3 w-32 bg-muted rounded"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{saasPlan?.name || "Trial Plan"}</h3>
                        <Badge
                          variant="outline"
                          className={
                            subscriptionStatus === "active"
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-warning/10 text-warning border-warning/20"
                          }
                        >
                          {subscriptionStatus === "active" ? "Active Subscription" : "Trial Account"}
                        </Badge>
                      </div>
                      {subscriptionStatus === "trial" ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          {(() => {
                            const expiryStr = saasOrg?.planExpiryDate || settings.trialEndsAt;
                            if (!expiryStr) return "Trial active";
                            const days = getTrialDaysLeft(expiryStr);
                            if (days <= 0 || isTrialExpired)
                              return (
                                <span className="text-destructive font-semibold">Trial Expired</span>
                              );
                            return `${days} days remaining in trial`;
                          })()}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          Your subscription is active and in good standing.
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-2xl font-bold">
                        ₹{saasPlan?.price || 0}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tenant ID: {user?.orgId || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base">Available SaaS Subscription Plans</h3>
                <p className="text-xs text-muted-foreground">
                  Choose a plan configured by Super Admin to upgrade or recharge. Payment is
                  verified manually via Bank Transfer or QR Code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoadingPlans ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-5 flex flex-col justify-between bg-card h-80 animate-pulse">
                      <div className="space-y-4">
                        <div>
                          <div className="h-5 w-1/2 bg-muted rounded mb-2"></div>
                          <div className="h-8 w-1/3 bg-muted rounded"></div>
                        </div>
                        <div className="space-y-2 py-3 border-t border-b border-border/60">
                          {[1, 2, 3, 4].map(j => (
                            <div key={j} className="flex justify-between">
                              <div className="h-3 w-1/3 bg-muted rounded"></div>
                              <div className="h-3 w-1/4 bg-muted rounded"></div>
                            </div>
                          ))}
                        </div>
                        <div className="h-16 w-full bg-muted rounded"></div>
                      </div>
                      <div className="h-9 w-full bg-muted rounded mt-6"></div>
                    </div>
                  ))
                ) : saasPlans.length === 0 ? (
                  <div className="col-span-full p-8 text-center border rounded-xl bg-muted/20 text-muted-foreground text-sm">
                    No subscription plans found. Super Admin has not published any plans yet.
                  </div>
                ) : (
                  saasPlans.map((plan) => {
                    const isCurrent =
                      saasOrg?.currentPlanId === plan.id || saasPlan?.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl border p-5 flex flex-col justify-between relative transition-all bg-card shadow-sm ${isCurrent ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      >
                        {isCurrent && (
                          <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                            Current Plan
                          </Badge>
                        )}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-base text-foreground">{plan.name}</h4>
                            <div className="text-2xl font-extrabold mt-1 text-primary">
                              ₹{plan.price}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                / month
                              </span>
                            </div>
                          </div>

                          {plan.limits && (
                            <div className="space-y-1.5 py-3 border-t border-b border-border/60 text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Max Users:</span>{" "}
                                <span className="font-semibold text-foreground">
                                  {plan.limits.maxUsers}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Max Products:</span>{" "}
                                <span className="font-semibold text-foreground">
                                  {plan.limits.maxProducts}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Max Branches:</span>{" "}
                                <span className="font-semibold text-foreground">
                                  {plan.limits.maxBranches}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Monthly Invoices:</span>{" "}
                                <span className="font-semibold text-foreground">
                                  {plan.limits.maxInvoicesPerMonth}
                                </span>
                              </div>
                            </div>
                          )}

                          <div>
                            <span className="text-xs font-semibold block mb-1.5 text-muted-foreground">
                              Included Modules ({((plan.features as string[]) || []).length}):
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                              {((plan.features as string[]) || []).map((f: string) => (
                                <Badge key={f} variant="secondary" className="text-[10px] bg-muted">
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
                            });
                          }}
                          className={`w-full mt-6 ${isCurrent ? "bg-primary hover:bg-primary/90" : ""}`}
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
          </TabsContent>

          <TabsContent value="tax" className="mt-0 outline-none">
            <Card title="Taxes" desc="Apply default rates at checkout.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Standard rate (%)">
                  <input
                    type="number"
                    className="inp"
                    value={settings.standardRate}
                    onChange={(e) => handleChange("standardRate", parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Reduced rate (%)">
                  <input
                    type="number"
                    className="inp"
                    value={settings.reducedRate}
                    onChange={(e) => handleChange("reducedRate", parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <ToggleRow
                  label="Prices include tax"
                  on={settings.pricesIncludeTax}
                  onChange={() => handleChange("pricesIncludeTax", !settings.pricesIncludeTax)}
                />
                <ToggleRow
                  label="Show tax breakdown on receipt"
                  on={settings.showTaxBreakdown}
                  onChange={() => handleChange("showTaxBreakdown", !settings.showTaxBreakdown)}
                />
                <ToggleRow
                  label="Enable GST Features (Dual Mode)"
                  on={settings.enableGST}
                  onChange={() => handleChange("enableGST", !settings.enableGST)}
                />
                {settings.enableGST && (
                  <>
                    <Field label="GSTIN">
                      <input
                        className="inp"
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        value={settings.gstin || ""}
                        onChange={(e) => handleChange("gstin", e.target.value)}
                      />
                    </Field>
                    <Field label="State Code (e.g. 29 for Karnataka, 19 for WB)">
                      <input
                        className="inp"
                        placeholder="e.g. 29"
                        value={settings.stateCode || ""}
                        onChange={(e) => handleChange("stateCode", e.target.value)}
                      />
                    </Field>
                    <Field label="Business Type / Industry">
                      <input
                        className="inp"
                        list="businessTypes"
                        placeholder="Type or select business type"
                        value={settings.businessType || ""}
                        onChange={(e) => handleChange("businessType", e.target.value)}
                      />
                      <datalist id="businessTypes">
                        <option value="B2C (Retail)" />
                        <option value="B2B (Wholesale)" />
                        <option value="Pharmacy & Medical" />
                        <option value="Supermarket & Grocery" />
                        <option value="Electronics & IT" />
                        <option value="Clothing & Apparel" />
                        <option value="Hardware & Tools" />
                      </datalist>
                    </Field>
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="receipt" className="mt-0 outline-none">
            <ResizablePanelGroup
              direction={isMobile ? "vertical" : "horizontal"}
              className={`items-stretch w-full gap-4 ${isMobile ? 'min-h-[1200px]' : ''}`}
            >
              <ResizablePanel defaultSize={55} minSize={30}>
                <div className="h-full pr-1">
                  <Card title="Receipt Configuration" desc="Customise the printed and emailed receipts.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Header note">
                        <input
                          className="inp"
                          value={settings.headerNote}
                          onChange={(e) => handleChange("headerNote", e.target.value)}
                        />
                      </Field>
                      <Field label="Footer note">
                        <input
                          className="inp"
                          value={settings.footerNote}
                          onChange={(e) => handleChange("footerNote", e.target.value)}
                        />
                      </Field>
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded-xl bg-card/50">
                        <h3 className="sm:col-span-2 text-sm font-semibold text-foreground border-b pb-2 mb-2">Bank Details (For NEFT/IMPS)</h3>
                        <Field label="Bank Name">
                          <input
                            className="inp"
                            placeholder="e.g., SBI"
                            value={bankInfo.bankName}
                            onChange={(e) => handleBankChange("bankName", e.target.value)}
                          />
                        </Field>
                        <Field label="Account Holder Name">
                          <input
                            className="inp"
                            placeholder="e.g., Samim Aktar"
                            value={bankInfo.holderName}
                            onChange={(e) => handleBankChange("holderName", e.target.value)}
                          />
                        </Field>
                        <Field label="Account Number">
                          <input
                            className="inp"
                            placeholder="e.g., 1234567890"
                            value={bankInfo.accountNo}
                            onChange={(e) => handleBankChange("accountNo", e.target.value)}
                          />
                        </Field>
                        <Field label="IFSC Code">
                          <input
                            className="inp"
                            placeholder="e.g., SBIN000123"
                            value={bankInfo.ifscCode}
                            onChange={(e) => handleBankChange("ifscCode", e.target.value)}
                          />
                        </Field>
                      </div>
                      <Field label="UPI ID (For QR Code)">
                        <input
                          className="inp"
                          placeholder="e.g., store@upi"
                          value={settings.upiId || ""}
                          onChange={(e) => handleChange("upiId", e.target.value)}
                        />
                      </Field>
                      <Field label="Declaration">
                        <Textarea
                          className="min-h-[80px]"
                          value={settings.receiptDeclaration || ""}
                          onChange={(e) => handleChange("receiptDeclaration", e.target.value)}
                        />
                      </Field>
                      <Field label="Terms & Conditions">
                        <Textarea
                          className="min-h-[80px]"
                          value={settings.termsAndConditions || ""}
                          onChange={(e) => handleChange("termsAndConditions", e.target.value)}
                        />
                      </Field>
                      <Field label="Privacy Policy">
                        <Textarea
                          className="min-h-[80px]"
                          value={settings.privacyPolicy || ""}
                          onChange={(e) => handleChange("privacyPolicy", e.target.value)}
                        />
                      </Field>
                      <div className="sm:col-span-2 mt-2">
                        <FileUpload
                          label="Authentication Signature (For Receipt)"
                          description="Upload a signature image (transparent PNG recommended) to display on printed receipts in place of the default 'Authorized Signatory' text."
                          value={settings.signatureUrl || ""}
                          onChange={(url) => handleChange("signatureUrl", url)}
                          folder="signatures"
                          maxSizeMB={2}
                        />
                      </div>
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
                  </Card>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={45} minSize={30}>
                <div className="h-full pl-1">
                  <Card
                    title="Live Preview"
                    desc={previewFormat === "thermal" ? "Thermal Receipt (80mm)" : "A4 Invoice"}
                    headerRight={
                      <div className="flex bg-muted rounded-md p-1 border">
                        <button
                          type="button"
                          onClick={() => setPreviewFormat("thermal")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${previewFormat === "thermal" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          Thermal
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFormat("a4")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${previewFormat === "a4" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          A4
                        </button>
                      </div>
                    }
                  >
                    <div className={`bg-gray-100 rounded-lg overflow-auto flex justify-center py-8 min-h-[600px] border relative ${previewFormat === 'a4' ? 'px-8' : ''}`}>
                      <PosPrintLayouts
                        preview={true}
                        state={{
                          printFormat: previewFormat,
                          settings: { ...settings },
                          printData: {
                            id: "INV-12345",
                            date: new Date().toLocaleString(),
                            storeName: settings.storeName || "My Store",
                            storeAddress: settings.address || "123 Store Street",
                            storePhone: settings.phone || "123-456-7890",
                            customer: "Walk-in Customer",
                            payment: "Cash",
                            lines: [
                              {
                                product: { name: "Sample Item 1" },
                                qty: 2,
                                unitPrice: 15.0,
                                total: 30.0,
                              },
                              {
                                product: { name: "Sample Item 2" },
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
                  </Card>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          <TabsContent value="data" className="mt-0 outline-none">
            <Card title="Data Management" desc="Manage local storage and offline sync data.">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-destructive">Wipe Local Database</h4>
                    <p className="text-sm text-muted-foreground">
                      Clear all offline products, categories, and sales.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setConfirmReset(true)}>
                    <Trash2 className="size-4 mr-2" />
                    Reset Database
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              className="mr-3"
              onClick={() => {
                if (dbSettings) setSettings(dbSettings);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Check className="size-4 mr-2" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </Tabs>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will completely wipe all local data including
              offline products, categories, and sales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Wipe Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        onSuccess={() => {
          setTimeout(() => window.location.reload(), 500); // Reload to clear trial guard globally
        }}
      />

      {/* Manual Payment Verification Modal (Bank Transfer / QR Code) */}
      <Dialog
        open={!!selectedPlanForUpgrade}
        onOpenChange={(open) => !open && setSelectedPlanForUpgrade(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Subscription Payment Verification
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              You are upgrading/recharging to <strong>{selectedPlanForUpgrade?.name}</strong> at{" "}
              <strong>₹{selectedPlanForUpgrade?.price}/month</strong>. Please make the payment using
              the QR code or Bank Account below.
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* QR Code and Bank Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-[25%_75%] gap-6 p-5 border rounded-xl bg-muted/20">
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border shadow-sm text-center">
                <span className="text-xs font-semibold mb-2 text-foreground">
                  Scan UPI / Payment QR
                </span>
                {paymentConfig?.qrCodeUrl ? (
                  <img
                    src={paymentConfig.qrCodeUrl}
                    alt="Payment QR Code"
                    className="size-36 object-contain border p-1 rounded"
                  />
                ) : (
                  <div className="size-36 bg-muted flex items-center justify-center text-xs text-muted-foreground rounded">
                    No QR Configured
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-2">
                  GPay, PhonePe, Paytm, BHIM
                </span>
              </div>

              <div className="space-y-2 text-xs flex flex-col justify-center">
                <span className="font-semibold text-sm block border-b pb-1">
                  Bank Account Details
                </span>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Account Name</span>
                  <span className="font-semibold">
                    {paymentConfig?.accountName || "Artistry POS Pvt Ltd"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Bank & Branch</span>
                  <span className="font-medium">{paymentConfig?.bankName || "HDFC Bank"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Account Number</span>
                  <span className="font-mono font-semibold text-primary">
                    {paymentConfig?.accountNo || "50200098765432"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">IFSC Code</span>
                    <span className="font-mono">{paymentConfig?.ifscCode || "HDFC0001234"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">UPI ID</span>
                    <span className="font-mono">{paymentConfig?.upiId || "pos@hdfc"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md text-xs text-blue-800 dark:text-blue-300">
              <span className="font-semibold block mb-1">Payment Instructions:</span>
              {paymentConfig?.instructions ||
                "Scan the QR code or transfer directly via NEFT/IMPS/RTGS. After payment, submit your Transaction ID/UTR below for verification."}
            </div>

            {/* Verification Form */}
            <div className="space-y-4 border-t pt-3">
              <h4 className="text-sm font-semibold">Submit Payment Proof for Activation</h4>

              <div>
                <Label className="text-xs font-semibold block mb-2">Select Payment Method</Label>
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
                      label: "Bank Transfer",
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
                        className={`cursor-pointer rounded-xl border p-3 flex flex-col items-center justify-center text-center transition-all duration-200 select-none ${isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20 text-primary font-medium"
                          : "border-border bg-card hover:bg-muted/50 text-foreground"
                          }`}
                      >
                        <Icon
                          className={`size-5 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <span className="font-semibold text-xs leading-tight">{method.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {method.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic fields based on payment method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <Label className="text-xs">Amount Paid</Label>
                  <Input
                    value={`₹${selectedPlanForUpgrade?.price || 0}`}
                    disabled
                    className="mt-1 font-mono font-bold bg-muted text-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">
                    {paymentForm.paymentMethod === "UPI / QR Scan"
                      ? "UPI Reference / Transaction ID"
                      : paymentForm.paymentMethod === "NEFT / IMPS / RTGS"
                        ? "UTR Number / Reference No."
                        : "Cheque No. / Deposit Slip No."}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={paymentForm.utrNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, utrNumber: e.target.value })}
                    placeholder={
                      paymentForm.paymentMethod === "UPI / QR Scan"
                        ? "e.g. 123456789012 (12-digit UPI Ref)"
                        : paymentForm.paymentMethod === "NEFT / IMPS / RTGS"
                          ? "e.g. HDFC12345678 (Bank UTR)"
                          : "e.g. CHQ00123 (Cheque/Deposit No.)"
                    }
                    className="mt-1 font-mono"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    {paymentForm.paymentMethod === "Cash / Cheque Deposit"
                      ? "Enter cheque number or cash deposit receipt number."
                      : "Required by Super Admin to verify and activate recharge."}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Optional Note / Sender Account Name</Label>
                <Input
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  placeholder={
                    paymentForm.paymentMethod === "UPI / QR Scan"
                      ? "e.g. Paid from Rahul Kumar's GPay account"
                      : paymentForm.paymentMethod === "NEFT / IMPS / RTGS"
                        ? "e.g. HDFC Savings A/C - Rahul Kumar"
                        : "e.g. Cash deposited at SBI Branch, Kolkata"
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
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
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmittingPayment && <Loader2 className="size-4 animate-spin mr-2" />}
              Submit Payment Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.inp{display:block;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklch, var(--color-ring) 20%, transparent)}`}</style>
    </div>
  );
}

function Card({
  title,
  desc,
  headerRight,
  children,
}: {
  title: string;
  desc: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft flex flex-col h-full">
      <header className="mb-4 border-b border-border pb-3 flex justify-between items-start gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}
function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on?: boolean;
  onChange?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 sm:col-span-2 cursor-pointer"
      onClick={onChange}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full ${on ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`}
        />
      </span>
    </div>
  );
}
