import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Super Admin Login · OneDesk360 Cloud POS" }] }),
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
    setLoading(true);
    await loginWithEmail(email, password);
    setLoading(false);
  };

  const handleQuickLogin = async () => {
    setEmail("admin@superadmin.com");
    setPassword("superadmin_password");
    setLoading(true);
    await loginWithEmail("admin@superadmin.com", "superadmin_password");
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 selection:bg-primary/20 selection:text-primary overflow-hidden">
      {/* Background ambient gradient mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 size-[500px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute top-1/2 -right-32 size-[450px] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 size-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2.5">
          <div className="relative mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 ring-4 ring-primary/15 transition-transform hover:scale-105">
            <Shield className="size-8 stroke-[2.2]" />
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 ring-2 ring-background flex items-center justify-center">
              <KeyRound className="size-3 text-white" />
            </div>
          </div>

          <div className="pt-1 flex flex-col items-center">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight font-display">
                OneDesk360
              </h1>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-mono font-black uppercase px-2 py-0.5 shadow-2xs">
                Super Admin
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center font-medium">
              Multi-Tenant Cloud POS & Retail Ecosystem Management
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-7 sm:p-8 shadow-xl shadow-foreground/5 space-y-5">
          <div className="flex items-center justify-between border-b pb-3.5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-foreground">Root Authentication</h2>
              <p className="text-[11px] text-muted-foreground">Sign in with master administrator credentials</p>
            </div>
            <div className="size-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Lock className="size-4" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="sa-email">
                <Mail className="size-3.5 text-muted-foreground" />
                <span>Super Admin Email</span>
              </Label>
              <Input
                id="sa-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@superadmin.com"
                className="h-10 rounded-xl bg-background/60 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="sa-password">
                  <Lock className="size-3.5 text-muted-foreground" />
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
                  className="h-10 rounded-xl bg-background/60 pr-10 text-xs font-medium"
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
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all gap-2 text-xs"
            >
              {loading ? "Authenticating Root Authority…" : "Sign In to Super Admin"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {/* Quick Demo Helper */}
          <div className="pt-2 border-t text-center">
            <button
              type="button"
              disabled={loading || isLoading}
              onClick={handleQuickLogin}
              className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>⚡ 1-Click Sign In as Super Admin</span>
            </button>
          </div>
        </div>

        {/* Security Footnote */}
        <div className="text-center space-y-1.5 text-[11px] text-muted-foreground">
          <p className="flex items-center justify-center gap-1 font-medium">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Secured with Multi-Tenant Guard & JWT Session Encryption</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
