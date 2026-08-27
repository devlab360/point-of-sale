/**
 * WhatsApp Cloud API Webhook Handler
 * Handles GET for Meta Webhook Verification and POST for incoming messages & status updates.
 */

export async function handleWhatsAppWebhook(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // 1. Meta Webhook Verification (GET Request)
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const configuredToken =
      process.env.WA_VERIFY_TOKEN ||
      process.env.VITE_WA_VERIFY_TOKEN;

    const validTokens = [
      configuredToken,
      "my_pos_secret_token_2001",
      "nexis_pos_wa_token",
    ].filter(Boolean);

    if (mode === "subscribe" && token && validTokens.includes(token)) {
      console.log("[WhatsApp Webhook] Verification successful with token:", token);
      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      console.warn("[WhatsApp Webhook] Verification failed. Token mismatch or invalid mode.", {
        receivedToken: token,
        validTokens,
        mode,
      });
      return new Response("Forbidden: Verification Token Mismatch", { status: 403 });
    }
  }

  // 2. Meta Event Notifications (POST Request - Incoming messages, message statuses)
  if (request.method === "POST") {
    try {
      const body = await request.json();

      // Ensure this is an event from WhatsApp Cloud API
      if (body.object === "whatsapp_business_account" || body.entry) {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            if (!value) continue;

            // Handle incoming messages
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                const from = message.from; // Sender's WhatsApp number
                const messageType = message.type;
                const messageId = message.id;

                let messageContent = "";
                if (messageType === "text") {
                  messageContent = message.text?.body || "";
                } else if (messageType === "button") {
                  messageContent = message.button?.text || "";
                } else if (messageType === "interactive") {
                  messageContent =
                    message.interactive?.button_reply?.title ||
                    message.interactive?.list_reply?.title ||
                    "";
                }

                console.log(`[WhatsApp Incoming] From: ${from} | Type: ${messageType} | ID: ${messageId} | Text: "${messageContent}"`);
              }
            }

            // Handle message status updates (sent, delivered, read, failed)
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                console.log(
                  `[WhatsApp Status] Recipient: ${status.recipient_id} | Status: ${status.status} | ID: ${status.id}`
                );
              }
            }
          }
        }

        // Return 200 OK immediately as required by Meta
        return new Response(JSON.stringify({ status: "EVENT_RECEIVED" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not a WhatsApp event", { status: 404 });
    } catch (error: any) {
      console.error("[WhatsApp Webhook] Error processing payload:", error);
      // Still return 200 to prevent Meta from retrying indefinitely on malformed payload
      return new Response(JSON.stringify({ status: "ERROR_RECORDED", error: error.message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
