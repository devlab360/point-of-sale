import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  head: () => ({ meta: [{ title: "Email Verification · NexisPOS SaaS" }] }),
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
        toast.success("Email verified successfully! Welcome to NexisPOS.");
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
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-elevated border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="text-xs mt-1">
            Complete email verification to activate your{" "}
            <strong className="text-primary">{trialDays}-Day Free Trial</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="rounded-xl border p-3 bg-muted/30 text-center space-y-1">
            <div className="text-xs text-muted-foreground font-medium">
              Verification Code Sent To
            </div>
            <div className="font-semibold text-sm text-foreground">
              {user?.email || settings?.email}
            </div>
          </div>

          <form noValidate onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                <span>Enter 6-Digit OTP Code</span>
              </label>
              <Input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  clearOtpError("otp");
                }}
                maxLength={6}
                className={`text-center font-mono text-lg tracking-widest h-12 ${otpErrors.otp ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <FieldError message={otpErrors.otp} />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold gap-2"
              disabled={isVerifying}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              {isVerifying ? "Verifying..." : "Verify & Start Trial"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Didn't receive code?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSendOtp(true)}
              disabled={isSending}
              className="h-7 text-xs text-primary"
            >
              <RefreshCw className={`mr-1 size-3 ${isSending ? "animate-spin" : ""}`} /> Resend Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
