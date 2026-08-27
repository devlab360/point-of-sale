/**
 * WhatsApp CRM Utility Helper
 * Formats invoice summaries and Khata due reminders for 1-click WhatsApp messaging.
 */

export function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("01")) {
    cleaned = "88" + cleaned; // Default Bangladesh country code
  }
  return cleaned;
}

export function sendWhatsAppInvoice(
  customerPhone: string,
  customerName: string,
  invoiceNo: string,
  totalAmount: number,
  currencySymbol: string,
  items: { productName: string; quantity: number; price: number }[],
) {
  const cleanPhone = formatWhatsAppPhone(customerPhone || "");
  const itemListText = items
    .map(
      (item) =>
        `• ${item.productName} (x${item.quantity}) - ${currencySymbol}${item.price * item.quantity}`,
    )
    .join("\n");

  const message = `🧾 *INVOICE ACKNOWLEDGEMENT - OneDesk360*\n\nDear *${customerName}*,\nThank you for shopping with us!\n\n*Invoice No:* #${invoiceNo}\n*Date:* ${new Date().toLocaleDateString()}\n\n*Purchased Items:*\n${itemListText}\n\n*Total Paid:* *${currencySymbol}${totalAmount}*\n\nThank you for your business! 🙏`;

  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
}

export function sendWhatsAppDueReminder(
  customerPhone: string,
  customerName: string,
  dueAmount: number,
  currencySymbol: string,
) {
  const cleanPhone = formatWhatsAppPhone(customerPhone || "");

  const message = `🔔 *PAYMENT REMINDER - KHATA STATEMENT*\n\nDear *${customerName}*,\nThis is a friendly reminder regarding your outstanding due balance of *${currencySymbol}${dueAmount}*.\n\nPlease arrange for settlement at your earliest convenience.\n\nThank you for your cooperation! 🙏`;

  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
}
