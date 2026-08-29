import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Globe,
  Store,
  KeyRound,
  Layers,
  Activity,
  Server,
  Cpu,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Super Admin Command Center · OneDesk360 Cloud POS" },
      {
        name: "description",
        content: "Master root portal for multi-tenant store provisioning, pricing plans, and global governance.",
      },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { loginWithEmail, isLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: any) {
      toast.error(err?.message || "Super Admin authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setEmail("admin@superadmin.com");
    setPassword("superadmin_password");
    setLoading(true);
    toast.loading("Authenticating Super Admin Root Authority...", { id: "sa-login" });
    try {
      await loginWithEmail("admin@superadmin.com", "superadmin_password");
      toast.success("Welcome, Super Administrator", { id: "sa-login" });
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed", { id: "sa-login" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4 py-8 lg:py-12 selection:bg-primary/20 selection:text-primary overflow-hidden">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 size-[550px] rounded-full bg-primary/12 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 size-[500px] rounded-full bg-indigo-500/10 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 size-[500px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Executive Platform Hero & Architecture Badges (Visible on lg screens) */}
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-between space-y-8 pr-2">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold font-mono uppercase tracking-wider shadow-2xs">
              <ShieldCheck className="size-3.5" />
              <span>Root Governance Portal</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-foreground font-display leading-tight">
              Executive Cloud POS Control Plane
            </h1>

            <p className="text-xs xl:text-sm text-muted-foreground leading-relaxed">
              Global tenant store orchestrator, multi-industry catalog engine, SaaS subscription plans, and real-time ledger velocity.
            </p>
          </div>

          {/* Core Telemetry Highlights */}
          <div className="space-y-2.5 pt-2">
            {[
              {
                icon: Layers,
                title: "11 Industry Profiles",
                desc: "Restaurant, Salon, Repair, Retail, Grocery, Wholesale, Pharmacy",
              },
              {
                icon: Server,
                title: "Multi-Tenant Isolation",
                desc: "Zero cross-store data leakage with strict tenant boundaries",
              },
              {
                icon: Cpu,
                title: "Offline-First Engine",
                desc: "Continuous local IndexedDB billing with cloud reconciliation",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs transition-all hover:bg-card/90"
                >
                  <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick link to Store Portal */}
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
            >
              <Store className="size-4" />
              <span>Looking for Tenant Store Sign In?</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right Side: High-Security Super Admin Login Card */}
        <div className="lg:col-span-7 w-full max-w-md mx-auto space-y-4">
          {/* Mobile Top Header (hidden on lg) */}
          <div className="lg:hidden text-center space-y-2 pb-2">
            <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 ring-4 ring-primary/10">
              <Shield className="size-8 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-display">
              OneDesk360 Super Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Master control plane for multi-tenant store provisioning
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-foreground/5 space-y-6 relative overflow-hidden">
            {/* Top Security Banner */}
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black uppercase tracking-wider text-foreground">
                    Root Authentication
                  </h2>
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-mono font-extrabold uppercase px-2.5 py-0.5">
                    Level 0
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Sign in to master multi-tenant administration</p>
              </div>
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Lock className="size-5" />
              </div>
            </div>

            {/* Quick 1-Click Master Login Hero Button */}
            <div className="bg-primary/8 border border-primary/25 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <Zap className="size-4 fill-primary/20 text-primary" />
                  <span>Development & Demo Quick Sign In</span>
                </span>
                <span className="text-xs font-mono text-muted-foreground uppercase font-bold">Instant</span>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={loading || isLoading}
                onClick={handleQuickLogin}
                className="w-full h-12 rounded-xl bg-card hover:bg-primary/10 border-primary/30 text-primary font-black gap-2 text-sm shadow-xs hover:border-primary transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="size-4 text-amber-500 animate-pulse" />
                <span>⚡ 1-Click Super Admin Root Sign In</span>
              </Button>
            </div>

            {/* Manual Credential Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground flex items-center gap-1.5" htmlFor="sa-email">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>Master Administrator Email</span>
                </Label>
                <Input
                  id="sa-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@superadmin.com"
                  className="h-12 rounded-xl bg-background/80 text-sm font-medium border-border/80 focus:border-primary px-3.5"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-1.5" htmlFor="sa-password">
                    <Lock className="size-4 text-muted-foreground" />
                    <span>Master Password</span>
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="sa-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-12 rounded-xl bg-background/80 pr-11 text-sm font-medium border-border/80 focus:border-primary px-3.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || isLoading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-extrabold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all gap-2 text-sm sm:text-base mt-2 cursor-pointer"
              >
                {loading ? "Authenticating Root Authority…" : "Sign In to Super Admin"}
                <ArrowRight className="size-5" />
              </Button>
            </form>

            {/* Mobile Link to Store Login */}
            <div className="lg:hidden border-t border-border/70 pt-3 text-center">
              <Link to="/login" className="text-sm font-bold text-primary hover:underline">
                ← Return to Store Sign In
              </Link>
            </div>
          </div>

          {/* Security Footnote */}
          <div className="text-center space-y-1 text-[11px] text-muted-foreground pt-1">
            <p className="flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Secured with JWT HTTP-only Root Tokens & Rate-Limit Shield</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
