import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, RefreshCw, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sendVerificationOtpFn, verifyOtpFn } from "@/api/auth";
import {
  sendVerificationEmail,
  generateVerificationOtp,
  getTrialDaysFromEnv,
} from "@/lib/email-service";
import { toast } from "sonner";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: `Email Verification · ${appName} SaaS` }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user, settings } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Guard to ensure we only auto-send the OTP once per page load
  const hasSentRef = useRef(false);

  const trialDays = getTrialDaysFromEnv();

  const {
    errors: otpErrors,
    validate: validateOtp,
    clearError: clearOtpError,
  } = useFormValidation({
    otp: {
      required: "OTP verification code is required",
      minLength: { value: 6, message: "OTP must be 6 digits" },
    },
  });

  const handleSendOtp = async (force = false) => {
    const targetEmail = user?.email || settings?.email;
    if (!user?.id || !targetEmail) return;
    // Prevent sending if already sending or already sent (unless forced by Resend button)
    if (isSending) return;

    const sessionKey = `otp_sent_${user.id}`;
    if (!force && (hasSentRef.current || sessionStorage.getItem(sessionKey))) return;

    hasSentRef.current = true;
    sessionStorage.setItem(sessionKey, "true");
    setIsSending(true);
    const code = generateVerificationOtp();
    setGeneratedCode(code);
    await sendVerificationOtpFn({ data: { userId: user.id, code } });
    await sendVerificationEmail(targetEmail, code);
    setIsSending(false);
  };

  useEffect(() => {
    if (user?.emailVerified) {
      navigate({ to: "/" });
    } else if (user) {
      const sessionKey = `otp_sent_${user.id}`;
      if (!hasSentRef.current && !sessionStorage.getItem(sessionKey)) {
        handleSendOtp();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run if the user ID changes, not on every user object update

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const isValid = validateOtp({ otp });
    if (!isValid) return;

    setIsVerifying(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Sending verify OTP request...", { userId: user.id, otp, trialDays });

      const res = await verifyOtpFn({ data: { userId: user.id, otp, trialDays } });
      console.log("Verify OTP response:", res);

      if (res?.success) {
        toast.success("Email verified successfully! Welcome to OneDesk360.");
        // Reload window to update auth state across app
        window.location.href = "/";
      } else {
        toast.error(res?.error || "Invalid verification code. Please try again.");
        setOtp(""); // Clear OTP on error so user can type again easily
      }
    } catch (error: any) {
      console.error("Verification failed unexpectedly:", error);
      toast.error(
        error?.message || "Network or server error during verification. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-card p-6 sm:p-10 shadow-elevated">
        <div className="text-center pb-2">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Mail className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Verify Your Email
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
            Activate your account and start your{" "}
            <strong className="text-primary font-semibold">
              {trialDays}-Day Full Enterprise Trial
            </strong>
            .
          </p>
        </div>

        <div className="space-y-5 pt-4">
          <div className="rounded-2xl border border-border/80 p-3.5 bg-muted/20 text-center space-y-1">
            <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              Verification Code Sent To
            </div>
            <div className="font-bold text-sm text-foreground truncate">
              {user?.email || settings?.email}
            </div>
          </div>

          <form noValidate onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block text-center">
                Enter 6-Digit Verification Code
              </label>
              <Input
                type="text"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  clearOtpError("otp");
                }}
                maxLength={6}
                className={`text-center font-mono text-xl tracking-[0.5em] h-13 rounded-2xl ${
                  otpErrors.otp
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-primary/40 focus-visible:ring-primary"
                }`}
              />
              <FieldError message={otpErrors.otp} />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold gap-2 rounded-2xl shadow-soft"
              disabled={isVerifying}
            >
              {isVerifying && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isVerifying ? "Verifying Code..." : "Verify & Activate Store"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <span>Didn't receive code?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSendOtp(true)}
              disabled={isSending}
              className="h-8 text-xs font-bold text-primary rounded-xl hover:bg-primary/10"
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${isSending ? "animate-spin" : ""}`} /> Resend
              Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
