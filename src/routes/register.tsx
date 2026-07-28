import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, ChevronLeft, ChevronRight, Store, User, Loader2 } from "lucide-react";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { INDUSTRY_SEEDS } from "@/lib/industry-seeds";
import { getTrialDaysFromEnv } from "@/lib/email-service";
import { getTrialPlanFn } from "@/sync-api";
import { validateEmail, validateMobile, validatePassword, validateStrongPassword, sanitizeInput } from "@/lib/validation";
import { SessionStore, PersistStore } from "@/lib/session-store";
import { PhoneInput } from "@/components/ui/phone-input";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register · Grocer.Pro SaaS" }] }),
  component: RegisterPage,
});

const INDUSTRIES = [
  "Saloon & Spa", "Grocery Shop", "Hotel & Restaurant",
  "Beauty and Cosmetics", "Super Market", "Hyper Market",
  "Home Decor & Furniture", "Apparel", "Electronics", "Books & Toys"
];

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ownerName: "",
    email: "",
    password: "",
    companyName: "",
    phone: "",
    industry: "",
    plan: "monthly"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const cleanName = sanitizeInput(formData.ownerName);
    const cleanEmail = sanitizeInput(formData.email);

    if (!cleanName) {
      newErrors.ownerName = "Full Name is required";
    }

    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.valid) {
      newErrors.email = emailCheck.error || "Invalid email address";
    }

    const passCheck = validateStrongPassword(formData.password);
    if (!passCheck.valid) {
      newErrors.password = passCheck.error || "Password is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const cleanCompany = sanitizeInput(formData.companyName);

    if (!cleanCompany) {
      newErrors.companyName = "Company / Store Name is required";
    }

    const phoneCheck = validateMobile(formData.phone);
    if (!phoneCheck.valid) {
      newErrors.phone = phoneCheck.error || "Enter a valid phone number";
    }

    if (!formData.industry) {
      newErrors.industry = "Please select your business industry";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }
    return true;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setErrors({});
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsRegistering(true);
    try {
      const orgId = uuidv4();
      const ownerId = uuidv4();
      const trialDays = getTrialDaysFromEnv();
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      const seedData = INDUSTRY_SEEDS[formData.industry];

      await localDb.settings.put({
        id: "default",
        orgId,
        trialEndsAt,
        subscriptionStatus: "trial",
        currencySymbol: "$",
        currencyCode: "USD",
        storeName: formData.companyName,
        taxId: "",
        address: "",
        phone: formData.phone,
        email: formData.email,
        standardRate: 0,
        reducedRate: 0,
        pricesIncludeTax: false,
        showTaxBreakdown: true,
        headerNote: seedData?.settings.headerNote || `Welcome to ${formData.companyName}`,
        footerNote: "Thank you for your business!",
        emailReceiptDefault: true,
        printStoreLogo: true,
      });

      let assignedPlanId = "basic";
      let assignedPlanName = "Basic Plan (Trial)";
      try {
        const trialPlanResult = await getTrialPlanFn({ data: {} });
        if (trialPlanResult.success && trialPlanResult.plan) {
          assignedPlanId = trialPlanResult.plan.id;
          assignedPlanName = trialPlanResult.plan.name;
          await localDb.saasPlans.put({
            id: trialPlanResult.plan.id,
            name: trialPlanResult.plan.name,
            price: Number(trialPlanResult.plan.price),
            features: (trialPlanResult.plan.features as string[]) || [],
            limits: (trialPlanResult.plan.limits as any) || { maxUsers: 2, maxProducts: 100, maxBranches: 1, maxInvoicesPerMonth: 500 },
          });
        }
      } catch (e) {
        console.warn("Using default basic trial plan");
      }

      await localDb.saasOrganizations.put({
        id: orgId,
        name: formData.companyName,
        ownerEmail: formData.email,
        status: "trial",
        currentPlanId: assignedPlanId,
        planExpiryDate: trialEndsAt,
        isOnline: true,
        synced: false
      });

      await localDb.users.put({
        id: ownerId,
        orgId,
        name: formData.ownerName,
        email: formData.email,
        role: "admin",
        status: "pending_verification",
        lastActive: new Date().toISOString(),
        pin: formData.password,
        emailVerified: false,
        synced: false
      });

      if (seedData) {
        if (seedData.categories.length > 0) {
          const mappedCats = seedData.categories.map(c => ({ ...c, orgId }));
          await localDb.categories.bulkAdd(mappedCats);
        }
        if (seedData.units.length > 0) {
          const mappedUnits = seedData.units.map(u => ({ ...u, orgId }));
          await localDb.units.bulkAdd(mappedUnits);
        }
      }

      SessionStore.setAuthUser(ownerId);
      PersistStore.setOrgId(orgId);

      toast.success("Registration successful! Redirecting to email verification...");
      setTimeout(() => {
        window.location.href = "/verify-email";
      }, 500);
    } catch (err) {
      console.error("Registration submit error:", err);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Left Panel: Hero Image & Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 text-white lg:flex overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1556742049-0a6754099a6d?auto=format&fit=crop&q=80&w=1600')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40 backdrop-blur-[2px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 font-bold text-2xl tracking-tight">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-lg">
              <Store className="size-6" />
            </div>
            <span className="text-white drop-shadow-md">Grocer.Pro SaaS</span>
          </div>

          <div className="mt-12 space-y-4 max-w-md">
            <span className="rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-md">
              ⚡ World-Class POS + ERP Platform
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-white drop-shadow">
              Transform your retail & wholesale business with AI Intelligence.
            </h2>
            <p className="text-sm leading-relaxed text-white/80">
              Join 10,000+ modern retailers managing POS sales, inventory, double-entry accounting, repair job sheets & WhatsApp CRM in one unified platform.
            </p>
          </div>
        </div>

        <div className="relative z-10 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl space-y-3 max-w-md">
          <div className="flex items-center gap-1 text-warning">
            {"★".repeat(5)}
          </div>
          <p className="text-xs italic text-white/90">
            "Grocer.Pro doubled our checkout speed and simplified customer khata balance reminders over WhatsApp. Essential for modern retail!"
          </p>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
            <span className="font-bold text-white">Supermarket Chain Owner</span>
            <span className="text-white/70">Verified Customer</span>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/60">
          © 2026 Grocer.Pro Inc. All rights reserved.
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Follow the steps below to setup your store.</p>
          </div>

          {/* Stepper */}
          <div className="mb-8 flex items-center justify-between px-12">
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`flex size-9 items-center justify-center rounded-full border-2 text-xs font-semibold ${step >= i ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                  {step > i ? <CheckCircle2 className="size-5" /> : i}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {i === 1 ? 'Account Setup' : 'Store Details'}
                </span>
              </div>
            ))}
          </div>

          <form noValidate onSubmit={step === 2 ? handleSubmit : handleNext} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      className={`pl-10 ${errors.ownerName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="e.g. Your Full Name"
                    />
                  </div>
                  {errors.ownerName && <p className="text-xs font-semibold text-destructive mt-1">{errors.ownerName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="e.g. you@example.com"
                  />
                  {errors.email && <p className="text-xs font-semibold text-destructive mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="••••••••"
                  />
                  {errors.password && <p className="text-xs font-semibold text-destructive mt-1">{errors.password}</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-1.5">
                  <Label>Company / Store Name</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={`pl-10 ${errors.companyName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="e.g. Store or Company Name"
                    />
                  </div>
                  {errors.companyName && <p className="text-xs font-semibold text-destructive mt-1">{errors.companyName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <PhoneInput
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="e.g. 1700 000000"
                  />
                  {errors.phone && <p className="text-xs font-semibold text-destructive mt-1">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <SearchableSelect
                    options={INDUSTRIES.map(ind => ({ value: ind, label: ind }))}
                    value={formData.industry}
                    onChange={(val) => {
                      setFormData(p => ({ ...p, industry: val }));
                      if (errors.industry) setErrors(e => ({ ...e, industry: "" }));
                    }}
                    placeholder="Select your industry"
                  />
                  {errors.industry && <p className="text-xs font-semibold text-destructive mt-1">{errors.industry}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" className="w-full" onClick={prevStep}>
                  <ChevronLeft className="size-4 mr-2" /> Back
                </Button>
              )}
              <Button type="submit" className="w-full" disabled={isRegistering}>
                {isRegistering
                  ? <><Loader2 className="size-4 animate-spin mr-2" /> Processing...</>
                  : <>{step === 2 ? `Start ${getTrialDaysFromEnv()}-Day Free Trial` : "Continue"} {step < 2 && <ChevronRight className="size-4 ml-2" />}</>
                }
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
