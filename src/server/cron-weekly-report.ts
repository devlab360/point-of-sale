/**
 * Server-side Scheduled Weekly Report Cron Endpoint
 * Route: /api/cron/weekly-report
 */
import { db } from "@/db";
import { users, sales, settings } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
import { callAiChat } from "@/lib/ai-client";

const formatPhone = (phone: string) => {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    cleaned = "880" + cleaned.substring(1);
  }
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
};

async function sendDirectWhatsAppMessage(phone: string, text: string) {
  const token = process.env.WA_ACCESS_TOKEN || process.env.VITE_WA_ACCESS_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID || process.env.VITE_WA_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    throw new Error("WhatsApp credentials missing in environment variables");
  }

  const formattedPhone = formatPhone(phone);
  const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData.error?.message || "Failed to send WhatsApp message");
  }

  return resData;
}

export async function handleWeeklyReportCron(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret =
      url.searchParams.get("secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (cronSecret && providedSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // 1. Fetch all store settings / users with phone numbers
    const allSettings = await db.select().from(settings);
    const allUsers = await db.select().from(users).where(eq(users.role, "admin"));

    const targets: { orgId: string; phone: string; name: string }[] = [];

    // Prioritize user phone or settings phone
    for (const u of allUsers) {
      if (u.phone && u.phone.trim().length >= 10) {
        targets.push({
          orgId: u.organizationId || "default",
          phone: u.phone,
          name: u.name || "Store Owner",
        });
      }
    }

    for (const s of allSettings) {
      if (s.phone && !targets.some((t) => t.orgId === s.organizationId)) {
        targets.push({
          orgId: s.organizationId || "default",
          phone: s.phone,
          name: s.storeName || "Store Owner",
        });
      }
    }

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin phone numbers found for weekly report dispatch." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const target of targets) {
      try {
        // Fetch last 7 days sales for this org
        const weeklySales = await db
          .select()
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, target.orgId),
              gte(sales.date, sevenDaysAgoISO)
            )
          );

        const totalRevenue = weeklySales.reduce(
          (sum, s) => sum + (Number(s.total) || 0),
          0
        );
        const totalOrders = weeklySales.length;

        // Generate AI Insight
        const systemPrompt = `You are an expert AI Retail Advisor for a retail business. Write a concise, motivating weekly performance summary in Bengali & English for the store owner. Use a few emojis.`;
        const userMessage = `Store Owner: ${target.name}\nTotal Weekly Revenue: ${totalRevenue}\nTotal Weekly Orders: ${totalOrders}\nTime Period: Last 7 Days`;

        let summaryText = "";
        try {
          summaryText = await callAiChat({
            systemPrompt,
            userMessage,
            temperature: 0.5,
          });
        } catch {
          summaryText = `📊 *Weekly Sales Report (Last 7 Days)* 📊\n\n👤 Store Owner: ${target.name}\n💰 Total Revenue: ${totalRevenue}\n📦 Total Orders: ${totalOrders}\n\nKeep up the great work! 🚀`;
        }

        // Send via WhatsApp
        const waResponse = await sendDirectWhatsAppMessage(target.phone, summaryText);

        results.push({
          orgId: target.orgId,
          phone: target.phone,
          status: "SENT",
          revenue: totalRevenue,
          orders: totalOrders,
          waId: waResponse?.messages?.[0]?.id,
        });
      } catch (err: any) {
        results.push({
          orgId: target.orgId,
          phone: target.phone,
          status: "FAILED",
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        dispatchedCount: results.filter((r) => r.status === "SENT").length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[handleWeeklyReportCron Error]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
