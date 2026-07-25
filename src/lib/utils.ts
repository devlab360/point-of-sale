import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTrialDaysLeft(expiryDateStr?: string | null): number {
  if (!expiryDateStr) return 0;
  const expiry = new Date(expiryDateStr);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export const DEFAULT_PAYMENT_CONFIG = {
  id: "super_admin_payment_config",
  accountName: "Artistry POS Technologies Pvt Ltd",
  bankName: "HDFC Bank (Commercial Branch)",
  accountNo: "50200098765432",
  ifscCode: "HDFC0001234",
  upiId: "pos.artistry@hdfcbank",
  qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=pos.artistry@hdfcbank&pn=ArtistryPOS&cu=INR",
  instructions: "Scan the QR code using GPay, PhonePe, Paytm or transfer directly via NEFT/IMPS/RTGS. After payment, submit your Transaction ID/UTR below for verification."
};
