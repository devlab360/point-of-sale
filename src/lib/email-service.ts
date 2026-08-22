import { toast } from "sonner";
import { sendEmailFn } from "@/api/email";

export function getTrialDaysFromEnv(): number {
  const envDays = import.meta.env.VITE_TRIAL_DAYS;
  const parsed = parseInt(envDays || "0", 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function generateVerificationOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends an email using the backend server function.
 */
export async function sendVerificationEmail(email: string, otpCode: string): Promise<boolean> {
  try {
    const result = await sendEmailFn({ data: { to: email, actionType: "VERIFY", otpCode } });
    if (!result.success) {
      if (result.error) {
        console.error("Backend email error:", result.error);
      }
      throw new Error("Failed to queue email");
    }

    toast.success(`Verification email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("[SMTP Error]:", error);
    toast.error("Failed to send verification email. Check console or credentials.");
    return false;
  }
}

/**
 * Sends a password reset OTP code email.
 */
export async function sendPasswordResetEmail(email: string, otpCode: string): Promise<boolean> {
  try {
    const result = await sendEmailFn({ data: { to: email, actionType: "RESET_PASSWORD", otpCode } });
    if (!result.success) throw new Error("Failed to queue email");

    toast.success(`Password reset OTP sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("[SMTP Error]:", error);
    toast.error("Failed to send password reset email.");
    return false;
  }
}
