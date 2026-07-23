import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Briefcase, Building2, CheckCircle2, ChevronLeft, ChevronRight, Store, User } from "lucide-react";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { INDUSTRY_SEEDS } from "@/lib/industry-seeds";
import { sendVerificationEmail, generateVerificationOtp } from "@/lib/email-service";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      nextStep();
      return;
    }
    
    try {
      const orgId = uuidv4();
      const ownerId = uuidv4();
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Store setting tied to Org
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

      const verificationOtp = generateVerificationOtp();

      // Add Owner User
      await localDb.users.add({
        id: ownerId,
        orgId,
        name: formData.ownerName,
        email: formData.email,
        role: "admin",
        status: "pending_verification",
        lastActive: new Date().toISOString(),
        pin: "1234",
        emailVerified: false,
        emailVerificationToken: verificationOtp,
      });

      // Seed Industry Data
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

      localStorage.setItem("pos_auth_user", ownerId);
      localStorage.setItem("pos_org_id", orgId);
      
      await sendVerificationEmail(formData.email, verificationOtp);
      toast.success("Registration successful! Please verify your email to start your trial.");
      navigate({ to: "/verify-email" });
    } catch (err) {
      console.error("Registration submit error:", err);
      toast.error("Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Left Panel: Hero Image & Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between p-12 text-white lg:flex overflow-hidden">
        {/* Background Hero Image with Dark Gradient Overlay */}
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

        {/* Glassmorphism Feature Card */}
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

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input name="ownerName" value={formData.ownerName} onChange={handleChange} required className="pl-10" placeholder="e.g. Your Full Name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="e.g. you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label>Company / Store Name</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input name="companyName" value={formData.companyName} onChange={handleChange} required className="pl-10" placeholder="e.g. Store or Company Name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="e.g. +880 1700 000000" />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <SearchableSelect
                    options={INDUSTRIES.map(ind => ({ value: ind, label: ind }))}
                    value={formData.industry}
                    onChange={(val) => setFormData(p => ({ ...p, industry: val }))}
                    placeholder="Select your industry"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" className="w-full" onClick={prevStep}>
                  <ChevronLeft className="size-4 mr-2" /> Back
                </Button>
              )}
              <Button type="submit" className="w-full">
                {step === 2 ? "Start 7-Day Free Trial" : "Continue"} {step < 2 && <ChevronRight className="size-4 ml-2" />}
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
