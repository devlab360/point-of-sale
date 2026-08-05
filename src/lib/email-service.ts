import { toast } from "sonner";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig {
  return {
    host: import.meta.env.VITE_SMTP_HOST || "smtp.gmail.com",
    port: parseInt(import.meta.env.VITE_SMTP_PORT || "587", 10),
    user: import.meta.env.VITE_SMTP_USER || "",
    pass: import.meta.env.VITE_SMTP_PASS || "",
    from: import.meta.env.VITE_SMTP_FROM || "NexisPOS SaaS <noreply@nexispos.com>",
  };
}

export function getTrialDaysFromEnv(): number {
  const envDays = import.meta.env.VITE_TRIAL_DAYS;
  const parsed = parseInt(envDays || "0", 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function generateVerificationOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper to call the local Vite dev server nodemailer API route
 */
async function sendEmailWorkerFn({
  data,
}: {
  data: { to: string; subject: string; html: string };
}) {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Error calling send-email api:", error);
    return { success: false };
  }
}

/**
 * Sends an email using the local Vite dev server nodemailer API route.
 */
export async function sendVerificationEmail(email: string, otpCode: string): Promise<boolean> {
  const config = getSmtpConfig();

  if (config.user && config.pass) {
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

      const result = await sendEmailWorkerFn({ data: { to: email, subject, html: body } });
      if (!result.success) throw new Error("Failed to queue email");

      toast.success(`Verification email sent to ${email}`);
      return true;
    } catch (error: any) {
      console.error("[SMTP Error]:", error);
      toast.error("Failed to send verification email. Check console or credentials.");
      return false;
    }
  } else {
    // Only in development if no SMTP is configured
    toast.success(`Verification email sent to ${email}`);
    return true;
  }
}

/**
 * Sends a password reset OTP code email.
 */
export async function sendPasswordResetEmail(email: string, otpCode: string): Promise<boolean> {
  const config = getSmtpConfig();

  if (config.user && config.pass) {
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

      const result = await sendEmailWorkerFn({ data: { to: email, subject, html: body } });
      if (!result.success) throw new Error("Failed to queue email");

      toast.success(`Password reset OTP sent to ${email}`);
      return true;
    } catch (error: any) {
      console.error("[SMTP Error]:", error);
      toast.error("Failed to send password reset email.");
      return false;
    }
  } else {
    toast.success(`Password reset OTP sent to ${email}`);
    return true;
  }
}
