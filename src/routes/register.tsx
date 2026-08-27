import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Store,
  User,
  Loader2,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { registerOrgFn, checkEmailAvailabilityFn } from "@/api/auth";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { INDUSTRY_SEEDS } from "@/lib/industry-seeds";
import { getTrialDaysFromEnv } from "@/lib/email-service";
import { validateEmail, validatePassword, sanitizeInput } from "@/lib/validation";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Start Free Trial · OneDesk360 SaaS" }] }),
  component: RegisterPage,
});

const INDUSTRIES = [
  "Super Market & Grocery",
  "Apparel & Fashion",
  "Electronics & Computers",
  "Hotel & Restaurant",
  "Salon & Beauty Spa",
  "Pharmacy & Healthcare",
  "Furniture & Home Decor",
  "Books, Toys & Gifts",
  "General Retail Store",
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
    plan: "monthly",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    const checkEmail = async () => {
      const cleanEmail = sanitizeInput(formData.email);
      if (!cleanEmail) {
        setEmailStatus("idle");
        setEmailMessage("");
        return;
      }

      const emailCheck = validateEmail(cleanEmail);
      if (!emailCheck.valid) {
        setEmailStatus("idle");
        return;
      }

      setEmailStatus("checking");
      try {
        const res = await checkEmailAvailabilityFn({ data: { email: cleanEmail } });
        if (res && "available" in res && !res.available) {
          setEmailStatus("taken");
          setEmailMessage("Email is already taken");
        } else {
          setEmailStatus("available");
          setEmailMessage("");
        }
      } catch {
        setEmailStatus("available");
        setEmailMessage("");
      }
    };

    const timer = setTimeout(() => {
      checkEmail();
    }, 400);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleNextStep = () => {
    const newErrors: Record<string, string> = {};
    const cleanName = sanitizeInput(formData.ownerName);
    const cleanEmail = sanitizeInput(formData.email);

    if (!cleanName) newErrors.ownerName = "Full Name is required";
    if (!cleanEmail) {
      newErrors.email = "Email is required";
    } else {
      const emailCheck = validateEmail(cleanEmail);
      if (!emailCheck.valid) newErrors.email = emailCheck.error || "Invalid email";
    }

    if (emailStatus === "taken") {
      newErrors.email = "Email is already taken";
    }

    const passCheck = validatePassword(formData.password);
    if (!passCheck.valid) {
      newErrors.password = passCheck.error || "Invalid password";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0 && emailStatus !== "checking") {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const cleanCompany = sanitizeInput(formData.companyName);

    if (!cleanCompany) newErrors.companyName = "Store Name is required";
    if (!formData.industry) newErrors.industry = "Please select your business type";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsRegistering(true);
    try {
      const orgId = uuidv4();
      const ownerId = uuidv4();
      const trialDays = getTrialDaysFromEnv();
      const trialEndsAt = Date.now() + trialDays * 24 * 60 * 60 * 1000;

      const industrySeed =
        INDUSTRY_SEEDS[formData.industry] || INDUSTRY_SEEDS["General Retail Store"];

      const res = await registerOrgFn({
        data: {
          orgId,
          ownerId,
          trialEndsAt,
          companyName: cleanCompany,
          email: sanitizeInput(formData.email),
          phone: formData.phone || undefined,
          ownerName: sanitizeInput(formData.ownerName),
          password: formData.password,
          assignedPlanId: "basic",
          seedData: industrySeed,
        },
      });

      if (!res?.success) {
        throw new Error(res?.error || "Registration failed.");
      }

      toast.success("Welcome to OneDesk360! Your 7-day trial store is ready.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden text-foreground">
      {/* Left Showcase Banner - Desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none [background-size:44px_44px] [background-image:linear-gradient(to_right,oklch(0.99 0.005 90/0.4)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.99 0.005 90/0.4)_1px,transparent_1px)]" />
        <div className="absolute -bottom-48 -left-32 size-[480px] rounded-full bg-foreground/5 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-primary-foreground">
              OneDesk360
            </h1>
            <p className="text-[11px] text-primary-foreground/75 font-medium uppercase tracking-wider">
              Own the counter
            </p>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="font-display text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-primary-foreground">
            Your shop, set up in minutes.
          </h2>

          <p className="text-[15px] text-primary-foreground/85 leading-relaxed">
            Start a free 7-day trial — no card needed. We pre-load your catalog so you can ring up
            today.
          </p>

          <div className="space-y-3 pt-1">
            {[
              "Pre-loaded product templates for your industry",
              "Unlimited invoices, staff logins & customer ledgers",
              "Instant thermal & WhatsApp receipts",
              "Automatic daily reports & stock alerts",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
                  <CheckCircle2 className="size-3.5" />
                </span>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-primary-foreground/70">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://devlab360.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-foreground transition-colors underline font-medium"
            >
              DevLab360
            </a>
          </p>
          <Link to="/login" className="hover:text-primary-foreground transition-colors underline font-medium">
            Sign In to Existing Store
          </Link>
        </div>
      </div>

      {/* Right Registration Wizard Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 relative overflow-y-auto">
        <div className="w-full max-w-lg xl:max-w-xl space-y-8 py-6">
          {/* Header Title & Step Indicator */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex lg:hidden size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Store className="size-7" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Create Your Store Account
            </h2>

            {/* Step Progress Bar */}
            <div className="flex items-center gap-2 pt-1">
              <div
                className={`h-2.5 flex-1 rounded-full transition-all ${
                  step >= 1 ? "bg-primary shadow-xs" : "bg-muted"
                }`}
              />
              <div
                className={`h-2.5 flex-1 rounded-full transition-all ${
                  step >= 2 ? "bg-primary shadow-xs" : "bg-muted"
                }`}
              />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Step {step} of 2 — {step === 1 ? "Account Credentials" : "Store Profile"}
            </p>
          </div>

          {/* Wizard Form Card */}
          <div className="rounded-2xl border border-border bg-card p-7 sm:p-9 md:p-10 shadow-elevated space-y-6">
            {step === 1 ? (
              /* Step 1: Owner Details & Credentials */
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="ownerName" className="text-sm font-bold text-foreground">
                    Owner / Admin Name
                  </Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="John Doe"
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-destructive mt-1">{errors.ownerName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-sm font-bold text-foreground">
                      Email Address
                    </Label>
                    {emailStatus === "checking" && (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        Checking availability…
                      </span>
                    )}
                    {emailStatus === "available" && (
                      <span className="text-xs font-bold text-success">
                        Available
                      </span>
                    )}
                    {emailStatus === "taken" && (
                      <span className="text-xs font-bold text-destructive">Taken</span>
                    )}
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="owner@store.com"
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-bold text-foreground">
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1">{errors.password}</p>
                  )}
                </div>

                <Button
                  onClick={handleNextStep}
                  className="w-full h-12 sm:h-13 rounded-2xl font-semibold gap-2 text-base mt-2"
                >
                  <span>Continue to Store Profile</span>
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            ) : (
              /* Step 2: Store Information & Industry */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-bold text-foreground">
                    Store / Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Apex Retail Supermarket"
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                  {errors.companyName && (
                    <p className="text-xs text-destructive mt-1">{errors.companyName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-bold text-foreground">
                    Phone / WhatsApp Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-bold text-foreground">
                    Select Business Type
                  </Label>
                  <SearchableSelect
                    options={INDUSTRIES.map((ind) => ({ label: ind, value: ind }))}
                    value={formData.industry}
                    onChange={(val) => setFormData({ ...formData, industry: val })}
                    placeholder="Choose industry..."
                  />
                  {errors.industry && (
                    <p className="text-xs text-destructive mt-1">{errors.industry}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-12 sm:h-13 rounded-2xl gap-1 px-5"
                  >
                    <ChevronLeft className="size-5" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={isRegistering}
                    className="flex-1 h-12 sm:h-13 rounded-2xl font-semibold gap-2 text-base"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        <span>Creating Store…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-5" />
                        <span>Start 7-Day Free Trial</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Link to Sign In */}
            <div className="border-t pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Already have a store account?{" "}
                <Link to="/login" className="font-bold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
