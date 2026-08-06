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
    const subject = "Your NexisPOS Verification Code";
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">NexisPOS SaaS</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">Your email verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="margin: 0; color: #111827; font-size: 32px; letter-spacing: 4px;">${otpCode}</h1>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Please enter this code in the application to verify your email address. This code is valid for 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eaeaec; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request this email, you can safely ignore it.</p>
      </div>
    `;

    const result = await sendEmailFn({ data: { to: email, subject, html: body } });
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
    const subject = "Reset Your Password - NexisPOS SaaS";
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">NexisPOS SaaS</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">We received a request to reset your password. Your verification OTP code is:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="margin: 0; color: #4f46e5; font-size: 32px; letter-spacing: 4px;">${otpCode}</h1>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Please enter this 6-digit OTP code on the login screen to reset your password. This code is valid for 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eaeaec; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    const result = await sendEmailFn({ data: { to: email, subject, html: body } });
    if (!result.success) throw new Error("Failed to queue email");

    toast.success(`Password reset OTP sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("[SMTP Error]:", error);
    toast.error("Failed to send password reset email.");
    return false;
  }
}
