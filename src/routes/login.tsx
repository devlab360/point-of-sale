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
    <div className="min-h-screen w-full flex bg-background overflow-hidden text-foreground">
      {/* Left Showcase Banner - Desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary p-12 flex-col justify-between overflow-hidden">
        {/* Subtle paper grain / soft radial field instead of orbs */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none [background-size:44px_44px] [background-image:linear-gradient(to_right,oklch(0.99 0.005 90/0.4)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.99 0.005 90/0.4)_1px,transparent_1px)]" />
        <div className="absolute -bottom-48 -left-32 size-[480px] rounded-full bg-foreground/5 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground">
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

        {/* Feature Hero Copy */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="font-display text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-primary-foreground">
            The warm, human way to run your shop.
          </h2>

          <p className="text-[15px] text-primary-foreground/85 leading-relaxed">
            Ring up sales, look after your stock, and keep your regulars happy — all from one
            friendly place built for how a real store actually works.
          </p>

          <ul className="space-y-3 pt-1">
            {[
              "Multi-branch inventory that just syncs",
              "Customer ledgers your team will actually use",
              "Instant, no-fuss thermal receipts",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
                  <CheckCircle2 className="size-3.5" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
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
        </div>
      </div>

      {/* Right Authentication Form Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 relative overflow-y-auto">
        <div className="w-full max-w-lg xl:max-w-xl space-y-8 py-6">
          {/* Header Icon & Title */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex lg:hidden size-13 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
              <Store className="size-6" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {mode === "forgot" ? "Reset Password" : "Welcome Back"}
            </h2>
            <p className="text-base text-muted-foreground">
              {mode === "forgot"
                ? "Enter your email to receive a password reset code"
                : "Sign in to access your store POS dashboard"}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-border bg-card p-7 sm:p-9 md:p-10 shadow-elevated space-y-6">
            {mode === "email" ? (
              <form noValidate onSubmit={handleEmailLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
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
                    className="h-11 rounded-lg text-sm sm:text-base px-3.5"
                  />
                  {loginErrors.email && <FieldError message={loginErrors.email} />}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs sm:text-sm font-semibold text-primary hover:underline"
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
                    className="h-11 rounded-lg text-sm sm:text-base px-3.5"
                  />
                  {loginErrors.password && <FieldError message={loginErrors.password} />}
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-11 sm:h-11.5 rounded-lg font-semibold gap-2 text-sm sm:text-base"
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
                  <form onSubmit={handleSendResetOtp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail" className="text-sm font-semibold text-foreground">
                        Registered Store Email
                      </Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail || email}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="owner@store.com"
                        className="h-11 rounded-lg text-sm sm:text-base px-3.5"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSendingOtp}
                      className="w-full h-11 sm:h-11.5 rounded-lg font-semibold gap-2 text-sm sm:text-base"
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
                        className="h-11 rounded-lg font-mono text-center text-lg tracking-widest"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">New Password</Label>
                      <PasswordInput
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <PasswordInput
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 rounded-lg"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isResetting}
                      className="w-full h-11 rounded-lg font-bold"
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
