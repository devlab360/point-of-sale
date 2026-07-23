export const COUNTRY_CODES = [
  { code: "+880", country: "Bangladesh 🇧🇩", flag: "🇧🇩" },
  { code: "+1", country: "United States / Canada 🇺🇸 🇨🇦", flag: "🇺🇸" },
  { code: "+91", country: "India 🇮🇳", flag: "🇮🇳" },
  { code: "+966", country: "Saudi Arabia 🇸🇦", flag: "🇸🇦" },
  { code: "+971", country: "United Arab Emirates 🇦🇪", flag: "🇦🇪" },
  { code: "+86", country: "China 🇨🇳", flag: "🇨🇳" },
  { code: "+44", country: "United Kingdom 🇬🇧", flag: "🇬🇧" },
  { code: "+61", country: "Australia 🇦🇺", flag: "🇦🇺" },
  { code: "+65", country: "Singapore 🇸🇬", flag: "🇸🇬" },
  { code: "+60", country: "Malaysia 🇲🇾", flag: "🇲🇾" },
];

export const TIMEZONES = [
  { value: "Asia/Dhaka", label: "(GMT+06:00) Dhaka, Bangladesh" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) New Delhi, Mumbai, India" },
  { value: "Asia/Riyadh", label: "(GMT+03:00) Riyadh, Saudi Arabia" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Dubai, UAE" },
  { value: "Asia/Shanghai", label: "(GMT+08:00) Beijing, Shanghai, China" },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "(GMT+00:00) London, UK" },
  { value: "UTC", label: "(UTC+00:00) UTC Universal Standard" },
];

export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 23/07/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 07/23/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-07-23)" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY (e.g. 23-Jul-2026)" },
];

export function formatDateCustom(
  dateInput: string | Date | number,
  formatPattern: string = "DD/MM/YYYY",
  timeZone?: string
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  const monthShort = d.toLocaleString("en-US", { month: "short" });

  if (formatPattern === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  } else if (formatPattern === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  } else if (formatPattern === "DD-MMM-YYYY") {
    return `${day}-${monthShort}-${year}`;
  }
  return `${day}/${month}/${year}`;
}
