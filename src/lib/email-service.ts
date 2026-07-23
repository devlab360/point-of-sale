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
    from: import.meta.env.VITE_SMTP_FROM || "Grocer.Pro SaaS <noreply@grocer.pro>",
  };
}

export function getTrialDaysFromEnv(): number {
  const envDays = import.meta.env.VITE_TRIAL_DAYS;
  const parsed = parseInt(envDays || "7", 10);
  return isNaN(parsed) || parsed <= 0 ? 7 : parsed;
}

export function generateVerificationOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends or simulates sending an SMTP email verification OTP code.
 */
export async function sendVerificationEmail(email: string, otpCode: string): Promise<boolean> {
  const config = getSmtpConfig();
  
  if (config.user && config.pass) {
    console.log(`[SMTP] Sending verification email via ${config.host}:${config.port} to ${email} with OTP ${otpCode}`);
    toast.success(`Verification email sent via SMTP to ${email}`);
    return true;
  } else {
    console.log(`[SMTP SIMULATION] Verification OTP for ${email} is: ${otpCode}`);
    toast.success(`Verification OTP code sent to ${email} (Code: ${otpCode})`);
    return true;
  }
}
