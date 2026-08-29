import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store,
  KeyRound,
  ArrowLeft,
  Loader2,
  Mail,
  CheckCircle2,
  Lock,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { generateVerificationOtp, sendPasswordResetEmail } from "@/lib/email-service";
import { resetPasswordFn, sendPasswordResetOtpFn } from "@/api/auth";
import { toast } from "sonner";
import { validateEmail, validatePassword, sanitizeInput } from "@/lib/validation";
import { checkRateLimit } from "@/lib/api-response";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In · OneDesk360 SaaS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"email" | "otp" | "forgot">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loginWithEmail, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const {
    errors: loginErrors,
    validate: validateLogin,
    clearError: clearLoginError,
  } = useFormValidation({
    email: { required: "Email is required", email: "Enter a valid email address" },
    password: {
      required: "Password is required",
      minLength: { value: 4, message: "Password must be at least 4 characters" },
    },
  });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email);

    const isValid = validateLogin({ email: cleanEmail, password });
    if (!isValid) return;

    const emailVal = validateEmail(cleanEmail);
    if (!emailVal.valid) {
      toast.error(emailVal.error);
      return;
    }
    const passVal = validatePassword(password);
    if (!passVal.valid) {
      toast.error(passVal.error);
      return;
    }

    const rateCheck = checkRateLimit(`login_${cleanEmail}`, 5, 60000);
    if (!rateCheck.allowed) {
      toast.error(`Too many login attempts. Please wait ${rateCheck.retryAfterSec} seconds.`);
      return;
    }

    setIsLoggingIn(true);
    try {
      await loginWithEmail(cleanEmail, password);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (targetEmail: string, label: string) => {
    setEmail(targetEmail);
    setPassword("password123");
    clearLoginError("email");
    clearLoginError("password");
    setIsLoggingIn(true);
    toast.loading(`Signing in to ${label}...`, { id: "quick-login" });
    try {
      await loginWithEmail(targetEmail, "password123");
      toast.success(`Welcome to ${label}`, { id: "quick-login" });
    } catch (err: any) {
      toast.error(err?.message || "Quick login failed", { id: "quick-login" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const QUICK_DEMO_GROUPS = [
    {
      group: "Core Roles",
      items: [
        { label: "🏪 Flagship Owner", email: "demo@onedesk360.com" },
        { label: "⚡ POS Cashier", email: "cashier@onedesk360.com" },
        { label: "🌐 Universal", email: "universal@onedesk360.com" },
      ],
    },
    {
      group: "Food & Dining",
      items: [
        { label: "🍽️ Restaurant (KOT)", email: "restaurant@onedesk360.com" },
        { label: "☕ Cafe & Bakery", email: "cafe@onedesk360.com" },
      ],
    },
    {
      group: "Personal Care",
      items: [
        { label: "✂️ Salon & Spa", email: "salon@onedesk360.com" },
        { label: "💈 Barber Shop", email: "barber@onedesk360.com" },
      ],
    },
    {
      group: "Tech & Repairs",
      items: [
        { label: "🔧 Auto & Electronics", email: "repair@onedesk360.com" },
        { label: "📱 Mobile & Gadgets", email: "mobilerepair@onedesk360.com" },
      ],
    },
    {
      group: "Retail & Trade",
      items: [
        { label: "🛒 Retail Apparel", email: "retail@onedesk360.com" },
        { label: "🥬 Supermarket", email: "grocery@onedesk360.com" },
        { label: "📦 Wholesale", email: "wholesale@onedesk360.com" },
        { label: "💊 Pharmacy", email: "pharmacy@onedesk360.com" },
      ],
    },
  ];

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = sanitizeInput(resetEmail || email);

    if (!targetEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    const emailVal = validateEmail(targetEmail);
    if (!emailVal.valid) {
      toast.error(emailVal.error);
      return;
    }

    const rateCheck = checkRateLimit(`otp_${targetEmail}`, 3, 60000);
    if (!rateCheck.allowed) {
      toast.error(`OTP request limit reached. Please wait ${rateCheck.retryAfterSec} seconds.`);
      return;
    }
    setIsSendingOtp(true);
    try {
      const otp = generateVerificationOtp();
      setGeneratedOtp(otp);

      await sendPasswordResetOtpFn({ data: { email: targetEmail, code: otp } });
      const success = await sendPasswordResetEmail(targetEmail, otp);

      if (success) {
        setForgotStep("verify");
        toast.success(`OTP code sent to ${targetEmail}.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (resetEmail.trim() || email.trim()).toLowerCase();

    if (!otpInput.trim()) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetPasswordFn({
        data: { email: targetEmail, newPassword, otp: otpInput.trim() },
      });
      if (!res?.success) {
        throw new Error(res?.error || "Failed to reset password.");
      }

      toast.success("Password updated successfully! Signing you in...");
      await loginWithEmail(targetEmail, newPassword);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsResetting(false);
    }
  };
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3 p-8 rounded-xl border border-border bg-card shadow-soft text-center max-w-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          <h3 className="font-semibold text-base">Signing you in...</h3>
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-full flex bg-background overflow-hidden text-foreground">
      {/* Left Showcase Banner - Desktop */}
      <div className="hidden lg:flex lg:w-1/2 h-full relative bg-primary p-8 xl:p-12 flex-col justify-between overflow-hidden">
        {/* Subtle paper grain / soft radial field instead of orbs */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none [background-size:44px_44px] [background-image:linear-gradient(to_right,oklch(0.99 0.005 90/0.4)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.99 0.005 90/0.4)_1px,transparent_1px)]" />
        <div className="absolute -bottom-48 -left-32 size-[480px] rounded-full bg-foreground/5 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground shadow-sm">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground">
              OneDesk360
            </h1>
            <p className="text-xs sm:text-sm text-primary-foreground/90 font-bold uppercase tracking-wider">
              Own the counter
            </p>
          </div>
        </div>

        {/* Feature Hero Copy */}
        <div className="relative z-10 space-y-4 xl:space-y-6 max-w-lg">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.15] font-bold tracking-tight text-primary-foreground">
            The warm, human way to run your shop.
          </h2>

          <p className="text-base sm:text-lg text-primary-foreground/90 leading-relaxed font-normal">
            Ring up sales, look after your stock, and keep your regulars happy — all from one
            friendly place built for how a real store actually works.
          </p>

          <ul className="space-y-3 pt-1">
            {[
              "Multi-branch inventory that just syncs",
              "Customer ledgers your team will actually use",
              "Instant, no-fuss thermal receipts",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-base sm:text-lg text-primary-foreground/95 font-medium">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-foreground/15 border border-primary-foreground/30 text-primary-foreground">
                  <CheckCircle2 className="size-4" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-sm text-primary-foreground/80">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://devlab360.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-foreground transition-colors underline font-semibold"
            >
              DevLab360
            </a>
          </p>
        </div>
      </div>

      {/* Right Authentication Form Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 relative overflow-y-auto">
        <div className="w-full max-w-lg xl:max-w-xl space-y-6 py-4 my-auto">
          {/* Header Icon & Title */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex lg:hidden size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Store className="size-7" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {mode === "forgot" ? "Reset Password" : "Welcome Back"}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              {mode === "forgot"
                ? "Enter your email to receive a password reset code"
                : "Sign in to access your store POS dashboard"}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-border bg-card p-7 sm:p-9 md:p-10 shadow-elevated space-y-5">
            {mode === "email" ? (
              <form noValidate onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base font-bold text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearLoginError("email");
                    }}
                    placeholder="owner@store.com"
                    className="h-12 sm:h-13 rounded-xl text-base px-4"
                  />
                  {loginErrors.email && <FieldError message={loginErrors.email} />}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm sm:text-base font-bold text-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-sm sm:text-base font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearLoginError("password");
                    }}
                    placeholder="••••••••"
                    className="h-12 sm:h-13 rounded-xl text-base px-4"
                  />
                  {loginErrors.password && <FieldError message={loginErrors.password} />}
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-12 sm:h-13 rounded-xl font-bold gap-2 text-base sm:text-lg shadow-sm mt-1"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      <span>Authenticating…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Store</span>
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </Button>

                {/* Development Mode Instant Quick Login Panel */}
                <div className="pt-2.5 border-t border-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span>⚡</span> 1-Click Dev / Demo Logins
                    </span>
                    <Link
                      to="/admin"
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground hover:underline"
                    >
                      🛡️ Super Admin Portal →
                    </Link>
                  </div>

                  <div className="space-y-2 max-h-36 sm:max-h-40 overflow-y-auto pr-1">
                    {QUICK_DEMO_GROUPS.map((grp) => (
                      <div key={grp.group} className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
                          {grp.group}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {grp.items.map((item) => (
                            <button
                              key={item.email}
                              type="button"
                              disabled={isLoggingIn}
                              onClick={() => handleQuickLogin(item.email, item.label)}
                              className="text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-border/70 bg-muted/25 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all text-left truncate active:scale-95 disabled:opacity-50 cursor-pointer"
                              title={`Instant 1-Click login as ${item.email}`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              /* Forgot Password Flow */
              <div className="space-y-4">
                {forgotStep === "request" ? (
                  <form onSubmit={handleSendResetOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail" className="text-sm sm:text-base font-bold text-foreground">
                        Registered Store Email
                      </Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail || email}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="owner@store.com"
                        className="h-12 sm:h-13 rounded-xl text-base px-4"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full h-12 sm:h-13 rounded-xl font-bold gap-2 text-base sm:text-lg"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          <span>Sending OTP…</span>
                        </>
                      ) : (
                        <>
                          <Mail className="size-5" />
                          <span>Send OTP Code</span>
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otpCode" className="text-sm sm:text-base font-bold text-foreground">
                        6-Digit OTP Code
                      </Label>
                      <Input
                        id="otpCode"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="h-13 rounded-xl font-mono text-center text-2xl tracking-widest font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm sm:text-base font-bold text-foreground">
                        New Password
                      </Label>
                      <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 sm:h-13 rounded-xl text-base px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-bold text-foreground">
                        Confirm Password
                      </Label>
                      <PasswordInput
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 sm:h-13 rounded-xl text-base px-4"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isResetting}
                      className="w-full h-12 sm:h-13 rounded-xl font-bold text-base sm:text-lg"
                    >
                      {isResetting ? "Updating Password..." : "Update Password & Sign In"}
                    </Button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode("email");
                    setForgotStep("request");
                  }}
                  className="flex items-center justify-center gap-2 w-full text-sm sm:text-base font-bold text-muted-foreground hover:text-foreground pt-1"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            )}

            {/* Link to Register */}
            <div className="border-t border-border/80 pt-3 text-center">
              <p className="text-sm sm:text-base text-muted-foreground">
                Don't have a store account yet?{" "}
                <Link to="/register" className="font-bold text-primary hover:underline ml-1">
                  Start 7-Day Free Trial
                </Link>
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center pt-0.5">
            <p className="text-xs sm:text-sm text-muted-foreground/80 font-medium">
              © {new Date().getFullYear()}{" "}
              <a
                href="https://devlab360.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
              >
                DevLab360
              </a>
              . All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
