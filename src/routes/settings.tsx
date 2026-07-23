import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react";
import { localDb, type LocalSetting } from "@/lib/db";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
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
import { differenceInDays } from "date-fns";
import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { SearchableSelect } from "@/components/ui/searchable-select";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Grocer.Pro" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: typeof search.tab === "string" ? search.tab : undefined,
    };
  },
  component: SettingsPage,
});

const defaultSettings: LocalSetting = {
  id: "default",
  storeName: "Grocer.Pro Downtown",
  currencySymbol: "$",
  currencyCode: "USD",
  taxId: "US-84-2918471",
  address: "142 Market Street, San Francisco, CA 94103",
  phone: "+1 415 555 0188",
  email: "hello@grocer.pro",
  standardRate: 8.00,
  reducedRate: 3.00,
  pricesIncludeTax: false,
  showTaxBreakdown: true,
  headerNote: "Thank you for shopping with us!",
  footerNote: "Returns accepted within 14 days.",
  emailReceiptDefault: true,
  printStoreLogo: true,
};

function SettingsPage() {
  const dbSettings = useLiveQuery(() => localDb.settings.get("default"));
  const [settings, setSettings] = useState(defaultSettings);
  const [confirmReset, setConfirmReset] = useState(false);

  const { user, isTrialExpired, subscriptionStatus } = useAuth();
  const search = Route.useSearch();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState(isTrialExpired ? "billing" : (search.tab || "store"));
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("Unauthorized. Admin access required.");
      router.navigate({ to: "/" });
    }
  }, [user, router]);

  useEffect(() => {
    if (dbSettings) {
      setSettings(dbSettings);
    }
  }, [dbSettings]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await localDb.settings.put({ ...settings, id: "default" });
      toast.success("Settings saved successfully.");
    } catch (error) {
      console.error("Settings save error:", error);
      toast.error("Failed to save settings.");
    }
  };

  const handleResetData = async () => {
    try {
      await localDb.delete();
      toast.success("Database wiped successfully. Please refresh the page.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error("Failed to delete database.");
    } finally {
      setConfirmReset(false);
    }
  };


  const sections = [
    { id: "store", label: t("storeInfo") || "Store Information" },
    { id: "billing", label: t("billing") || "Billing & Plan" },
    { id: "tax", label: t("taxes") || "Taxes" },
    { id: "receipt", label: t("receipts") || "Receipt" },
    { id: "data", label: "Data Management" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {isTrialExpired && (
        <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Trial Expired</h3>
            <p className="text-sm">Your 7-day free trial has ended. Please subscribe to continue using the application.</p>
          </div>
          <Button onClick={() => setIsCheckoutOpen(true)} variant="destructive">Subscribe Now</Button>
        </div>
      )}
      <PageHeader title="Settings" description="Configure your store, taxes, printer and locale." />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 flex flex-col lg:flex-row gap-6">
        <TabsList className="flex flex-col h-auto w-full lg:w-[220px] items-stretch justify-start bg-transparent p-0 space-y-1">
          {sections.map((s) => (
            <TabsTrigger
              key={s.id}
              value={s.id}
              className="justify-start px-3 py-2 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent data-[state=active]:border-border"
            >
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="flex-1 space-y-6">
          <TabsContent value="store" className="mt-0 outline-none">
            <Card title="Store Information" desc="Used on receipts and reports.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Store name">
                  <input className="inp" value={settings.storeName} onChange={(e) => handleChange("storeName", e.target.value)} />
                </Field>
                <Field label="Tax ID">
                  <input className="inp" value={settings.taxId} onChange={(e) => handleChange("taxId", e.target.value)} />
                </Field>
                <Field label="Address" full>
                  <input className="inp" value={settings.address} onChange={(e) => handleChange("address", e.target.value)} />
                </Field>
                <Field label="Phone">
                  <input className="inp" value={settings.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                </Field>
                <Field label="Email">
                  <input className="inp" value={settings.email} onChange={(e) => handleChange("email", e.target.value)} />
                </Field>
                <Field label={t("currency") || "Store Currency Preset"}>
                  <SearchableSelect 
                    value={settings.currencySymbol || "$"} 
                    onChange={(val) => {
                      const opt = CURRENCY_OPTIONS.find(o => o.symbol === val);
                      handleChange("currencySymbol", val);
                      if (opt) handleChange("currencyCode", opt.code);
                    }}
                    options={CURRENCY_OPTIONS.map((c) => ({
                      value: c.symbol,
                      label: c.label
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

          <TabsContent value="billing" className="mt-0 outline-none">
            <Card title="Subscription Plan" desc="Manage your SaaS subscription and billing.">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">Pro Plan (Monthly)</h3>
                    {subscriptionStatus === "trial" ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {settings.trialEndsAt ? (() => {
                          const days = differenceInDays(new Date(settings.trialEndsAt), new Date());
                          if (days < 0) return <span className="text-destructive font-semibold">Trial Expired</span>;
                          return `${days} days remaining in trial`;
                        })() : "Trial active"}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Active Subscription</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-bold">$29.00<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <div className="text-sm mt-1">
                      {subscriptionStatus === "trial" ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Trial</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-4">
                  {subscriptionStatus === "trial" ? (
                    <Button onClick={() => setIsCheckoutOpen(true)} className="bg-primary">Upgrade to Pro</Button>
                  ) : (
                    <>
                      <Button variant="default">Update Payment Method</Button>
                      <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Cancel Subscription</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="mt-0 outline-none">
            <Card title="Taxes" desc="Apply default rates at checkout.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Standard rate (%)">
                  <input type="number" className="inp" value={settings.standardRate} onChange={(e) => handleChange("standardRate", parseFloat(e.target.value) || 0)} />
                </Field>
                <Field label="Reduced rate (%)">
                  <input type="number" className="inp" value={settings.reducedRate} onChange={(e) => handleChange("reducedRate", parseFloat(e.target.value) || 0)} />
                </Field>
                <ToggleRow label="Prices include tax" on={settings.pricesIncludeTax} onChange={() => handleChange("pricesIncludeTax", !settings.pricesIncludeTax)} />
                <ToggleRow label="Show tax breakdown on receipt" on={settings.showTaxBreakdown} onChange={() => handleChange("showTaxBreakdown", !settings.showTaxBreakdown)} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="receipt" className="mt-0 outline-none">
            <Card title="Receipt" desc="Customise the printed and emailed receipts.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Header note">
                  <input className="inp" value={settings.headerNote} onChange={(e) => handleChange("headerNote", e.target.value)} />
                </Field>
                <Field label="Footer note">
                  <input className="inp" value={settings.footerNote} onChange={(e) => handleChange("footerNote", e.target.value)} />
                </Field>
                <ToggleRow label="Email receipt by default" on={settings.emailReceiptDefault} onChange={() => handleChange("emailReceiptDefault", !settings.emailReceiptDefault)} />
                <ToggleRow label="Print store logo" on={settings.printStoreLogo} onChange={() => handleChange("printStoreLogo", !settings.printStoreLogo)} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-0 outline-none">
            <Card title="Data Management" desc="Manage local storage and offline sync data.">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-destructive">Wipe Local Database</h4>
                    <p className="text-sm text-muted-foreground">Clear all offline products, categories, and sales.</p>
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
            <Button variant="outline" className="mr-3" onClick={() => { if(dbSettings) setSettings(dbSettings) }}>Cancel</Button>
            <Button onClick={handleSave}><Check className="size-4 mr-2" /> Save changes</Button>
          </div>
        </div>
      </Tabs>
      
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will completely wipe all local data including offline products, categories, and sales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

      <style>{`.inp{display:block;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklch, var(--color-ring) 20%, transparent)}`}</style>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <header className="mb-4 border-b border-border pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </header>
      {children}
    </section>
  );
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function ToggleRow({ label, on, onChange }: { label: string; on?: boolean; onChange?: () => void }) {
  return (
    <div 
      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 sm:col-span-2 cursor-pointer"
      onClick={onChange}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={`relative h-5 w-9 rounded-full ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`} />
      </span>
    </div>
  );
}
