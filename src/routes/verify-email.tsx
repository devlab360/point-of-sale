import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { localDb } from "@/lib/db";
import { sendVerificationEmail, generateVerificationOtp, getTrialDaysFromEnv } from "@/lib/email-service";
import { toast } from "sonner";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Email Verification · Grocer.Pro SaaS" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Guard to ensure we only auto-send the OTP once per page load
  const hasSentRef = useRef(false);

  const trialDays = getTrialDaysFromEnv();

  const { errors: otpErrors, validate: validateOtp, clearError: clearOtpError } = useFormValidation({
    otp: { required: "OTP verification code is required", minLength: { value: 6, message: "OTP must be 6 digits" } }
  });

  const handleSendOtp = async (force = false) => {
    if (!user?.email) return;
    // Prevent sending if already sending or already sent (unless forced by Resend button)
    if (isSending) return;
    if (!force && hasSentRef.current) return;

    hasSentRef.current = true;
    setIsSending(true);
    const code = generateVerificationOtp();
    setGeneratedCode(code);
    await localDb.users.update(user.id, { emailVerificationToken: code });
    await sendVerificationEmail(user.email, code);
    setIsSending(false);
  };

  useEffect(() => {
    if (user?.emailVerified) {
      navigate({ to: "/" });
    } else if (user && !hasSentRef.current) {
      handleSendOtp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run if the user ID changes, not on every user object update


  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const isValid = validateOtp({ otp });
    if (!isValid) return;

    setIsVerifying(true);

    const currentUser = await localDb.users.get(user.id);
    const validToken = currentUser?.emailVerificationToken || generatedCode;

    if (otp.trim() === validToken.trim()) {
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      await localDb.users.update(user.id, {
        emailVerified: true,
        status: "active",
        synced: false,
      });

      if (user.orgId) {
        const setting = await localDb.settings.where("orgId").equals(user.orgId).first();
        if (setting) {
          await localDb.settings.update(setting.id, {
            trialEndsAt,
            subscriptionStatus: "trial",
            trialDays,
            synced: false,
          });
        }

        // Also update SaaS Organizations so Super Admin sees the exact expiry
        const org = await localDb.saasOrganizations.get(user.orgId);
        if (org) {
          await localDb.saasOrganizations.update(org.id, {
            planExpiryDate: trialEndsAt,
            synced: false,
          });
        } else {
          // Backward compatibility for users created before saasOrganizations table existed
          await localDb.saasOrganizations.add({
            id: user.orgId,
            name: setting?.storeName || "My Shop",
            ownerEmail: user.email,
            status: "trial",
            currentPlanId: "basic",
            planExpiryDate: trialEndsAt,
            isOnline: true,
            synced: false,
          });
        }
      }

      toast.success(`Email verified successfully! Your ${trialDays}-Day Free Trial has started.`);
      setTimeout(() => {
        window.location.href = "/";
      }, 600);
    } else {
      toast.error("Invalid verification code. Please check your email and try again.");
    }
    setIsVerifying(false);
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
            Complete email verification to activate your <strong className="text-primary">{trialDays}-Day Free Trial</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="rounded-xl border p-3 bg-muted/30 text-center space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Verification Code Sent To</div>
            <div className="font-semibold text-sm text-foreground">{user?.email || "owner@store.com"}</div>
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
                onChange={(e) => { setOtp(e.target.value); clearOtpError("otp"); }}
                maxLength={6}
                className={`text-center font-mono text-lg tracking-widest h-12 ${otpErrors.otp ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <FieldError message={otpErrors.otp} />
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold gap-2" disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify & Start Trial"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Didn't receive code?</span>
            <Button variant="ghost" size="sm" onClick={() => handleSendOtp(true)} disabled={isSending} className="h-7 text-xs text-primary">
              <RefreshCw className={`mr-1 size-3 ${isSending ? "animate-spin" : ""}`} /> Resend Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
