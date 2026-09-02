import { createServerFn } from "@tanstack/react-start";
import nodemailer from "nodemailer";
import { appName } from "@/lib/env";

import { z } from "zod";

const emailSchema = z.object({
  to: z.string().email(),
  actionType: z.enum(["VERIFY", "RESET_PASSWORD"]),
  otpCode: z.string(),
});

export const sendEmailFn = createServerFn({ method: "POST" })
  .validator(emailSchema)
  .handler(async ({ data }) => {
    try {
      // Process env might be populated by Node, or import.meta.env by Vite
      // Fallback for each variable to ensure it works across different environments
      const host = process.env.SMTP_HOST || process.env.VITE_SMTP_HOST || "smtp.gmail.com";
      const portStr = process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || "587";
      const port = parseInt(portStr, 10);
      const user = process.env.SMTP_USER || process.env.VITE_SMTP_USER;
      const pass = process.env.SMTP_PASS || process.env.VITE_SMTP_PASS;
      const from = process.env.SMTP_FROM || process.env.VITE_SMTP_FROM || user;

      if (!user || !pass) {
        console.warn("SMTP credentials not found, skipping actual email send.");
        return { success: true };
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      let subject = "";
      let html = "";

      if (data.actionType === "VERIFY") {
        subject = `Your ${appName} Verification Code`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">${appName} SaaS</h2>
            <p style="font-size: 16px; color: #333;">Hello,</p>
            <p style="font-size: 16px; color: #333;">Your email verification code is:</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 0; color: #111827; font-size: 32px; letter-spacing: 4px;">${data.otpCode}</h1>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Please enter this code in the application to verify your email address. This code is valid for 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eaeaec; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request this email, you can safely ignore it.</p>
          </div>
        `;
      } else if (data.actionType === "RESET_PASSWORD") {
        subject = `Reset Your Password - ${appName} SaaS`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 10px;">
            <h2 style="color: #4f46e5; text-align: center;">${appName} SaaS</h2>
            <p style="font-size: 16px; color: #333;">Hello,</p>
            <p style="font-size: 16px; color: #333;">We received a request to reset your password. Your verification OTP code is:</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 0; color: #4f46e5; font-size: 32px; letter-spacing: 4px;">${data.otpCode}</h1>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Please enter this 6-digit OTP code on the login screen to reset your password. This code is valid for 10 minutes.</p>
            <hr style="border: none; border-top: 1px solid #eaeaec; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        `;
      }

      const info = await transporter.sendMail({
        from,
        to: data.to,
        subject,
        html,
      });

      console.log("Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error("Email error:", error);
      return { success: false, error: error.message };
    }
  });
