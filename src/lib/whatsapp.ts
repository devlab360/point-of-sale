/**
 * WhatsApp CRM Utility Helper
 * Formats invoice summaries and Khata due reminders for 1-click WhatsApp messaging worldwide.
 */

export function formatWhatsAppPhone(phone: string, defaultCallingCode: string = "+1"): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  // If starts with 00, replace with nothing (standard international prefix 00 -> country code)
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  // If local number without country code, prepend default calling code
  const codeDigits = defaultCallingCode.replace(/[^0-9]/g, "");
  if (cleaned.length <= 10 && !cleaned.startsWith(codeDigits)) {
    cleaned = `${codeDigits}${cleaned}`;
  }

  return cleaned;
}

export function sendWhatsAppInvoice(
  customerPhone: string,
  customerName: string,
  invoiceNo: string,
  totalAmount: number | string,
  currencySymbol: string = "$",
  items: { productName: string; quantity: number; price: number }[] = [],
  callingCode?: string,
) {
  const cleanPhone = formatWhatsAppPhone(customerPhone || "", callingCode);
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
  dueAmount: number | string,
  currencySymbol: string = "$",
  callingCode?: string,
) {
  const cleanPhone = formatWhatsAppPhone(customerPhone || "", callingCode);

  const message = `🔔 *PAYMENT REMINDER - KHATA STATEMENT*\n\nDear *${customerName}*,\nThis is a friendly reminder regarding your outstanding due balance of *${currencySymbol}${dueAmount}*.\n\nPlease arrange for settlement at your earliest convenience.\n\nThank you for your cooperation! 🙏`;

  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
}
