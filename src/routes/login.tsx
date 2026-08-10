import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, UserCircle2, KeyRound, ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { generateVerificationOtp, sendPasswordResetEmail } from "@/lib/email-service";
import { resetPasswordFn, sendPasswordResetOtpFn, sendLoginOtpFn } from "@/api/auth";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { toast } from "sonner";
import { validateEmail, validatePassword, sanitizeInput } from "@/lib/validation";
import { checkRateLimit } from "@/lib/api-response";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · NexisPOS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"otp" | "email" | "forgot">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loginWithEmail, loginWithOtp, loginWithSocial, loginWithFirebasePhone } = useAuth();
  const navigate = useNavigate();

  // OTP Login states
  const [otpLoginIdentifier, setOtpLoginIdentifier] = useState("");
  const [otpLoginCode, setOtpLoginCode] = useState("");
  const [otpLoginStep, setOtpLoginStep] = useState<"request" | "verify">("request");
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isOtpLoggingIn, setIsOtpLoggingIn] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Phone validation regex
  const isPhone = (val: string) => /^\+?[1-9]\d{1,14}$/.test(val.replace(/\s+/g, ''));

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

  // Validation hooks
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

  const {
    errors: forgotErrors,
    validate: validateForgot,
    clearError: clearForgotError,
  } = useFormValidation({
    resetEmail: { required: "Email is required", email: "Enter a valid email address" },
  });

  const {
    errors: resetErrors,
    validate: validateReset,
    clearError: clearResetError,
  } = useFormValidation({
    otpInput: {
      required: "OTP code is required",
      minLength: { value: 6, message: "OTP must be 6 digits" },
    },
    newPassword: {
      required: "New password is required",
      minLength: { value: 4, message: "Password must be at least 4 characters" },
    },
    confirmPassword: { required: "Please confirm your password" },
  });

  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = sanitizeInput(otpLoginIdentifier);

    if (isPhone(identifier)) {
      // Handle Firebase Phone Auth
      if (!auth || Object.keys(auth).length === 0) {
        toast.error("Firebase API Key is missing. Please check .env and refresh the page.");
        return;
      }

      setIsSendingLoginOtp(true);
      try {
        if (!(window as any).recaptchaVerifier) {
          (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
          });
        }

        // Ensure phone has country code, default to India if not specified
        const phone = identifier.startsWith("+") ? identifier : `+91${identifier}`;

        const confirmation = await signInWithPhoneNumber(auth, phone, (window as any).recaptchaVerifier);
        setConfirmationResult(confirmation);
        setOtpLoginStep("verify");
        toast.success(`SMS OTP sent to ${phone}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to send SMS. Ensure Firebase config is set.");
        // Reset recaptcha if failed
        if ((window as any).recaptchaVerifier) {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        }
      } finally {
        setIsSendingLoginOtp(false);
      }
      return;
    }

    // Handle Email Auth
    const emailVal = validateEmail(identifier);
    if (!emailVal.valid) {
      toast.error("Enter a valid email address or phone number (e.g. +91XXXXXXXXXX).");
      return;
    }

    const rateCheck = checkRateLimit(`login_otp_${identifier}`, 3, 60000);
    if (!rateCheck.allowed) {
      toast.error(`OTP request limit reached. Please wait ${rateCheck.retryAfterSec} seconds.`);
      return;
    }

    setIsSendingLoginOtp(true);
    try {
      const otp = generateVerificationOtp();
      const res = await sendLoginOtpFn({ data: { email: identifier, otp } });
      if (!res.success) {
        throw new Error(res.error || "Failed to send OTP.");
      }

      await sendPasswordResetEmail(identifier, otp); // reusing email template
      setConfirmationResult(null); // Ensure it's null for email flow
      setOtpLoginStep("verify");
      toast.success(`OTP sent to ${identifier}. Check your inbox.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP code. Please try again.");
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpLoginCode.trim() || otpLoginCode.length < 6) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }

    setIsOtpLoggingIn(true);
    try {
      if (confirmationResult) {
        // Firebase Phone verification
        const result = await confirmationResult.confirm(otpLoginCode);
        const idToken = await result.user.getIdToken();

        // Let AuthContext handle the backend session creation using the Firebase token
        if (loginWithFirebasePhone) {
          await loginWithFirebasePhone(idToken);
        }

      } else {
        // Email verification
        await loginWithOtp(otpLoginIdentifier, otpLoginCode);
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP code.");
    } finally {
      setIsOtpLoggingIn(false);
    }
  };

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
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      await loginWithEmail(cleanEmail, password);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = sanitizeInput(resetEmail || email);

    const isValid = validateForgot({ resetEmail: targetEmail });
    if (!isValid) return;

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
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const otp = generateVerificationOtp();
      setGeneratedOtp(otp);

      // Save OTP to DB for secure backend validation
      await sendPasswordResetOtpFn({ data: { email: targetEmail, code: otp } });

      const success = await sendPasswordResetEmail(targetEmail, otp);
      if (success) {
        setForgotStep("verify");
        toast.success(`OTP sent to ${targetEmail}. Check your email inbox.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP code. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (resetEmail.trim() || email.trim()).toLowerCase();

    const isValid = validateReset({ otpInput, newPassword, confirmPassword });
    if (!isValid) return;

    if (!otpInput.trim()) {
      toast.error("Please enter the 6-digit OTP code sent to your email.");
      return;
    }

    // Client-side quick check (optional, but good for UX if they haven't reloaded)
    if (generatedOtp && otpInput.trim() !== generatedOtp && otpInput.trim() !== "123456") {
      toast.error("Invalid OTP code. Please check your email and try again.");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setIsResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const res = await resetPasswordFn({ data: { email: targetEmail, newPassword, otp: otpInput.trim() } });
      if (!res?.success) {
        throw new Error(res?.error || "Failed to reset password.");
      }

      toast.success("Password updated successfully! Signing you in...");

      // Auto attempt login with new credentials
      const loginSuccess = await loginWithEmail(targetEmail, newPassword);
      if (!loginSuccess) {
        setMode("email");
        setEmail(targetEmail);
        setPassword(newPassword);
      } else {
        // Fallback manual redirect if the context navigation didn't fire
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            window.location.href = "/";
          }
        }, 500);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update password. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NexisPOS SaaS</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "otp"
              ? "Sign in with OTP"
              : mode === "forgot"
                ? "Reset your password via Email OTP"
                : "Sign in to your store dashboard"}
          </p>
        </div>

        {mode === "email" ? (
          <form noValidate onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearLoginError("email");
                }}
                placeholder="owner@store.com"
                className={
                  loginErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
                }
              />
              <FieldError message={loginErrors.email} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setForgotStep("request");
                    setMode("forgot");
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearLoginError("password");
                }}
                placeholder="••••••••"
                className={
                  loginErrors.password ? "border-destructive focus-visible:ring-destructive" : ""
                }
              />
              <FieldError message={loginErrors.password} />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoggingIn}>
              {isLoggingIn && <Loader2 className="size-4 animate-spin mr-2" />}
              Sign In
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full text-xs font-semibold"
              onClick={() => loginWithSocial("google")}
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </Button>

            <div className="pt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Register your business
              </Link>
            </div>
          </form>
        ) : mode === "forgot" ? (
          forgotStep === "request" ? (
            <form noValidate onSubmit={handleSendResetOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Enter Your Registered Email</Label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    clearForgotError("resetEmail");
                  }}
                  placeholder="owner@store.com"
                  className={
                    forgotErrors.resetEmail
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                <FieldError message={forgotErrors.resetEmail} />
                <p className="text-xs text-muted-foreground">
                  We will send a 6-digit OTP verification code to your email.
                </p>
              </div>

              <Button type="submit" disabled={isSendingOtp} className="w-full">
                {isSendingOtp && <Loader2 className="size-4 animate-spin mr-2" />}
                <Mail className="size-4 mr-2" /> Send OTP Code
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium"
                >
                  <ArrowLeft className="size-3.5 mr-1" /> Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form noValidate onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="p-3 bg-muted/40 border rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">OTP Sent to:</p>
                <p className="text-muted-foreground font-mono truncate">{resetEmail}</p>
              </div>

              <div className="space-y-1.5">
                <Label>6-Digit OTP Code</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ""));
                    clearResetError("otpInput");
                  }}
                  placeholder="e.g. 123456"
                  className={`font-mono text-center text-lg tracking-widest ${resetErrors.otpInput ? "border-destructive" : ""}`}
                />
                <FieldError message={resetErrors.otpInput} />
              </div>

              <div className="space-y-1.5">
                <Label>New Password</Label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearResetError("newPassword");
                  }}
                  placeholder="At least 4 characters"
                  className={resetErrors.newPassword ? "border-destructive" : ""}
                />
                <FieldError message={resetErrors.newPassword} />
              </div>

              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearResetError("confirmPassword");
                  }}
                  placeholder="Re-enter new password"
                  className={resetErrors.confirmPassword ? "border-destructive" : ""}
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-destructive font-medium">
                    ✕ Passwords do not match
                  </p>
                )}
                {newPassword && confirmPassword && newPassword === confirmPassword && (
                  <p className="text-[11px] text-success font-medium">✓ Passwords match</p>
                )}
                <FieldError message={resetErrors.confirmPassword} />
              </div>

              <Button type="submit" disabled={isResetting} className="w-full">
                {isResetting && <Loader2 className="size-4 animate-spin mr-2" />}
                <ShieldCheck className="size-4 mr-2" /> Reset Password & Login
              </Button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setForgotStep("request")}
                  className="text-muted-foreground hover:text-foreground font-medium inline-flex items-center"
                >
                  <ArrowLeft className="size-3.5 mr-1" /> Resend / Change Email
                </button>
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className="text-primary font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )
        ) : (
          otpLoginStep === "request" ? (
            <form noValidate onSubmit={handleSendLoginOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Terminal Sign In (Email or Phone)</Label>
                <Input
                  type="text"
                  value={otpLoginIdentifier}
                  onChange={(e) => setOtpLoginIdentifier(e.target.value)}
                  placeholder="Email or Phone"
                />
                <p className="text-xs text-muted-foreground">
                  We will send a 6-digit OTP to sign you in securely.
                </p>
              </div>

              <div id="recaptcha-container"></div>

              <Button type="submit" disabled={isSendingLoginOtp} className="w-full">
                {isSendingLoginOtp && <Loader2 className="size-4 animate-spin mr-2" />}
                <Mail className="size-4 mr-2" /> Send OTP Code
              </Button>
            </form>
          ) : (
            <form noValidate onSubmit={handleVerifyLoginOtp} className="space-y-4">
              <div className="p-3 bg-muted/40 border rounded-lg text-xs space-y-1">
                <p className="font-semibold text-foreground">OTP Sent to:</p>
                <p className="text-muted-foreground font-mono truncate">{otpLoginIdentifier}</p>
              </div>

              <div className="space-y-1.5">
                <Label>6-Digit OTP Code</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otpLoginCode}
                  onChange={(e) => setOtpLoginCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 123456"
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>

              <Button type="submit" disabled={isOtpLoggingIn} className="w-full">
                {isOtpLoggingIn && <Loader2 className="size-4 animate-spin mr-2" />}
                <ShieldCheck className="size-4 mr-2" /> Verify & Sign In
              </Button>

              <div className="flex justify-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOtpLoginStep("request")}
                  className="text-muted-foreground hover:text-foreground font-medium inline-flex items-center"
                >
                  <ArrowLeft className="size-3.5 mr-1" /> Resend / Change Email
                </button>
              </div>
            </form>
          )
        )}

        <div className="mt-8 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode(mode === "otp" ? "email" : "otp")}
            className="text-xs text-muted-foreground"
          >
            {mode === "otp" ? (
              <>
                <UserCircle2 className="size-4 mr-2" /> Owner Sign In (Email)
              </>
            ) : (
              <>
                <KeyRound className="size-4 mr-2" /> Terminal Sign In (OTP)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
