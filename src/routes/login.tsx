import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  Sparkles,
  Lock,
  Smartphone,
  ArrowRight,
  TrendingUp,
  Zap,
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
  const { loginWithEmail } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden text-foreground">
      {/* Left Showcase Banner - Desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/95 via-primary/80 to-primary/60 p-12 flex-col justify-between overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full border border-white/10 animate-spin-slow pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-xl">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">OneDesk360</h1>
            <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
              Enterprise Cloud Commerce
            </p>
          </div>
        </div>

        {/* Feature Hero Copy */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
            <Sparkles className="size-3.5 text-amber-300" />
            <span>Next-Gen Point of Sale Platform</span>
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white leading-tight">
            Manage Sales, Stock, & Customers in One Unified Portal.
          </h2>

          <p className="text-sm text-white/85 leading-relaxed">
            Multi-branch inventory control, real-time Khatabook customer ledgers, instant thermal
            receipts, and automated financial analytics tailored for your business.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <TrendingUp className="size-5 text-emerald-300" />
                <span>99.9%</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Platform Uptime SLA</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Zap className="size-5 text-amber-300" />
                <span>Real-Time</span>
              </div>
              <p className="text-xs text-white/70 mt-1">Multi-Store Sync</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/70">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://devlab360.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors underline font-medium"
            >
              DevLab360
            </a>
          </p>
        </div>
      </div>

      {/* Right Authentication Form Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 relative overflow-y-auto">
        <div className="w-full max-w-lg xl:max-w-xl space-y-8 py-6">
          {/* Header Icon & Title */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex lg:hidden size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Store className="size-7" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {mode === "forgot" ? "Reset Password" : "Welcome Back"}
            </h2>
            <p className="text-base text-muted-foreground">
              {mode === "forgot"
                ? "Enter your email to receive a password reset code"
                : "Sign in to access your store POS dashboard"}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 md:p-12 shadow-md space-y-7">
            {mode === "email" ? (
              <form noValidate onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-bold text-foreground">
                    Store Email Address
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
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                  {loginErrors.email && <FieldError message={loginErrors.email} />}
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-bold text-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs sm:text-sm font-bold text-primary hover:underline"
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
                    className="h-12 sm:h-13 rounded-2xl text-base px-4"
                  />
                  {loginErrors.password && <FieldError message={loginErrors.password} />}
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-12 sm:h-13 rounded-2xl font-extrabold gap-2 text-base shadow-md transition-all hover:scale-[1.01]"
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
              </form>
            ) : (
              /* Forgot Password Flow */
              <div className="space-y-6">
                {forgotStep === "request" ? (
                  <form onSubmit={handleSendResetOtp} className="space-y-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="resetEmail" className="text-sm font-bold text-foreground">
                        Registered Store Email
                      </Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail || email}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="owner@store.com"
                        className="h-12 sm:h-13 rounded-2xl text-base px-4"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full h-12 sm:h-13 rounded-2xl font-extrabold gap-2 text-base"
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
                    <div className="space-y-1.5">
                      <Label htmlFor="otpCode">6-Digit OTP Code</Label>
                      <Input
                        id="otpCode"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="h-11 rounded-xl font-mono text-center text-lg tracking-widest"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">New Password</Label>
                      <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <PasswordInput
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isResetting}
                      className="w-full h-11 rounded-xl font-bold"
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
                  className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-muted-foreground hover:text-foreground pt-2"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            )}

            {/* Link to Register */}
            <div className="border-t pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Don't have a store account yet?{" "}
                <Link to="/register" className="font-bold text-primary hover:underline">
                  Start 7-Day Free Trial
                </Link>
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-muted-foreground/70 font-medium">
              © {new Date().getFullYear()}{" "}
              <a
                href="https://devlab360.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-muted-foreground hover:text-primary transition-colors underline decoration-dotted"
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
