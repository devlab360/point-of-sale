import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Store, User, Briefcase, CreditCard, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { INDUSTRY_SEEDS } from "@/lib/industry-seeds";

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
      
      await localDb.settings.add({
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

      // Add Owner User
      await localDb.users.add({
        id: ownerId,
        orgId,
        name: formData.ownerName,
        email: formData.email,
        role: "admin",
        status: "active",
        lastActive: new Date().toISOString(),
        pin: "1234" // Default pin for simulation
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
      
      toast.success("Registration successful! Welcome to your new store.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div>
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <Store className="size-8" />
            <span>Grocer.Pro SaaS</span>
          </div>
          <p className="mt-6 text-xl leading-relaxed text-primary-foreground/80 max-w-md">
            Join thousands of businesses managing their sales, inventory, and employees with our powerful point-of-sale platform.
          </p>
        </div>
        <div className="space-y-4 text-sm text-primary-foreground/60">
          <p>© 2026 Grocer.Pro Inc. All rights reserved.</p>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Follow the steps below to setup your store.</p>
          </div>

          {/* Stepper */}
          <div className="mb-8 flex items-center justify-between">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${step >= i ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                  {step > i ? <CheckCircle2 className="size-5" /> : i}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {i === 1 ? 'Account' : i === 2 ? 'Business' : 'Plan'}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input name="ownerName" value={formData.ownerName} onChange={handleChange} required className="pl-10" placeholder="John Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" />
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
                    <Input name="companyName" value={formData.companyName} onChange={handleChange} required className="pl-10" placeholder="My Awesome Store" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+1 234 567 890" />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="" disabled>Select your industry</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
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
