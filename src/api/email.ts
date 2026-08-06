import { createServerFn } from "@tanstack/react-start";
import nodemailer from "nodemailer";

export const sendEmailFn = createServerFn({ method: "POST" })
  .validator((data: { to: string; subject: string; html: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Process env might be populated by Node, or import.meta.env by Vite
      // Fallback for each variable to ensure it works across different environments
      const host = process.env.VITE_SMTP_HOST || (import.meta as any).env?.VITE_SMTP_HOST || "smtp.gmail.com";
      const portStr = process.env.VITE_SMTP_PORT || (import.meta as any).env?.VITE_SMTP_PORT || "587";
      const port = parseInt(portStr, 10);
      const user = process.env.VITE_SMTP_USER || (import.meta as any).env?.VITE_SMTP_USER;
      const pass = process.env.VITE_SMTP_PASS || (import.meta as any).env?.VITE_SMTP_PASS;
      const from = process.env.VITE_SMTP_FROM || (import.meta as any).env?.VITE_SMTP_FROM || user;

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

      const info = await transporter.sendMail({
        from,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });

      console.log("Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error("Email error:", error);
      return { success: false, error: error.message };
    }
  });
