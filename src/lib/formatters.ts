import { COUNTRIES } from "./countries";

export const COUNTRY_CODES = COUNTRIES.map((c) => ({
  code: c.phoneCode,
  iso: c.code,
  country: `${c.name} ${c.flag}`,
  flag: c.flag,
  name: c.name,
}));

export const TIMEZONES = [
  // UTC / GMT
  { value: "UTC", label: "(UTC+00:00) UTC Universal Standard" },
  { value: "Europe/London", label: "(GMT+00:00 / BST+01:00) London, United Kingdom 🇬🇧" },
  { value: "Europe/Dublin", label: "(GMT+00:00 / IST+01:00) Dublin, Ireland 🇮🇪" },
  { value: "Africa/Casablanca", label: "(GMT+01:00) Casablanca, Morocco 🇲🇦" },

  // Europe (CET/EET)
  { value: "Europe/Paris", label: "(CET+01:00 / CEST+02:00) Paris, France 🇫🇷" },
  { value: "Europe/Berlin", label: "(CET+01:00 / CEST+02:00) Berlin, Frankfurt, Germany 🇩🇪" },
  { value: "Europe/Rome", label: "(CET+01:00 / CEST+02:00) Rome, Milan, Italy 🇮🇹" },
  { value: "Europe/Madrid", label: "(CET+01:00 / CEST+02:00) Madrid, Barcelona, Spain 🇪🇸" },
  { value: "Europe/Amsterdam", label: "(CET+01:00 / CEST+02:00) Amsterdam, Netherlands 🇳🇱" },
  { value: "Europe/Brussels", label: "(CET+01:00 / CEST+02:00) Brussels, Belgium 🇧🇪" },
  { value: "Europe/Zurich", label: "(CET+01:00 / CEST+02:00) Zurich, Geneva, Switzerland 🇨🇭" },
  { value: "Europe/Vienna", label: "(CET+01:00 / CEST+02:00) Vienna, Austria 🇦🇹" },
  { value: "Europe/Stockholm", label: "(CET+01:00 / CEST+02:00) Stockholm, Sweden 🇸🇪" },
  { value: "Europe/Oslo", label: "(CET+01:00 / CEST+02:00) Oslo, Norway 🇳🇴" },
  { value: "Europe/Copenhagen", label: "(CET+01:00 / CEST+02:00) Copenhagen, Denmark 🇩🇰" },
  { value: "Europe/Warsaw", label: "(CET+01:00 / CEST+02:00) Warsaw, Poland 🇵🇱" },
  { value: "Europe/Prague", label: "(CET+01:00 / CEST+02:00) Prague, Czech Republic 🇨🇿" },
  { value: "Europe/Budapest", label: "(CET+01:00 / CEST+02:00) Budapest, Hungary 🇭🇺" },
  { value: "Europe/Helsinki", label: "(EET+02:00 / EEST+03:00) Helsinki, Finland 🇫🇮" },
  { value: "Europe/Athens", label: "(EET+02:00 / EEST+03:00) Athens, Greece 🇬🇷" },
  { value: "Europe/Bucharest", label: "(EET+02:00 / EEST+03:00) Bucharest, Romania 🇷🇴" },
  { value: "Europe/Kyiv", label: "(EET+02:00 / EEST+03:00) Kyiv, Ukraine 🇺🇦" },
  { value: "Europe/Istanbul", label: "(GMT+03:00) Istanbul, Turkey 🇹🇷" },
  { value: "Europe/Moscow", label: "(MSK+03:00) Moscow, Russia 🇷🇺" },

  // Middle East & Africa
  { value: "Asia/Riyadh", label: "(AST+03:00) Riyadh, Jeddah, Saudi Arabia 🇸🇦" },
  { value: "Asia/Dubai", label: "(GST+04:00) Dubai, Abu Dhabi, UAE 🇦🇪" },
  { value: "Asia/Qatar", label: "(AST+03:00) Doha, Qatar 🇶🇦" },
  { value: "Asia/Kuwait", label: "(AST+03:00) Kuwait City, Kuwait 🇰🇼" },
  { value: "Asia/Bahrain", label: "(AST+03:00) Manama, Bahrain 🇧🇭" },
  { value: "Asia/Muscat", label: "(GST+04:00) Muscat, Oman 🇴🇲" },
  { value: "Asia/Amman", label: "(GMT+03:00) Amman, Jordan 🇯🇴" },
  { value: "Asia/Jerusalem", label: "(GMT+02:00 / +03:00) Jerusalem, Tel Aviv, Israel 🇮🇱" },
  { value: "Africa/Cairo", label: "(EET+02:00 / +03:00) Cairo, Alexandria, Egypt 🇪🇬" },
  { value: "Africa/Johannesburg", label: "(SAST+02:00) Johannesburg, Cape Town, South Africa 🇿🇦" },
  { value: "Africa/Lagos", label: "(WAT+01:00) Lagos, Abuja, Nigeria 🇳🇬" },
  { value: "Africa/Nairobi", label: "(EAT+03:00) Nairobi, Kenya 🇰🇪" },
  { value: "Africa/Accra", label: "(GMT+00:00) Accra, Ghana 🇬🇭" },

  // South Asia
  { value: "Asia/Kolkata", label: "(IST+05:30) New Delhi, Mumbai, Bengaluru, India 🇮🇳" },
  { value: "Asia/Dhaka", label: "(BST+06:00) Dhaka, Chittagong, Bangladesh 🇧🇩" },
  { value: "Asia/Karachi", label: "(PKT+05:00) Karachi, Lahore, Pakistan 🇵🇰" },
  { value: "Asia/Colombo", label: "(IST+05:30) Colombo, Sri Lanka 🇱🇰" },
  { value: "Asia/Kathmandu", label: "(NPT+05:45) Kathmandu, Nepal 🇳🇵" },

  // East & Southeast Asia
  { value: "Asia/Singapore", label: "(SGT+08:00) Singapore 🇸🇬" },
  { value: "Asia/Kuala_Lumpur", label: "(MYT+08:00) Kuala Lumpur, Malaysia 🇲🇾" },
  { value: "Asia/Jakarta", label: "(WIB+07:00) Jakarta, Surabaya, Indonesia 🇮🇩" },
  { value: "Asia/Bangkok", label: "(ICT+07:00) Bangkok, Thailand 🇹🇭" },
  { value: "Asia/Ho_Chi_Minh", label: "(ICT+07:00) Ho Chi Minh City, Hanoi, Vietnam 🇻🇳" },
  { value: "Asia/Manila", label: "(PST+08:00) Manila, Cebu, Philippines 🇵🇭" },
  { value: "Asia/Shanghai", label: "(CST+08:00) Beijing, Shanghai, Guangzhou, China 🇨🇳" },
  { value: "Asia/Hong_Kong", label: "(HKT+08:00) Hong Kong 🇭🇰" },
  { value: "Asia/Taipei", label: "(CST+08:00) Taipei, Taiwan 🇹🇼" },
  { value: "Asia/Tokyo", label: "(JST+09:00) Tokyo, Osaka, Japan 🇯🇵" },
  { value: "Asia/Seoul", label: "(KST+09:00) Seoul, Busan, South Korea 🇰🇷" },

  // Oceania
  { value: "Australia/Sydney", label: "(AEST+10:00 / AEDT+11:00) Sydney, Melbourne, Australia 🇦🇺" },
  { value: "Australia/Brisbane", label: "(AEST+10:00) Brisbane, Australia 🇦🇺" },
  { value: "Australia/Perth", label: "(AWST+08:00) Perth, Australia 🇦🇺" },
  {
    value: "Pacific/Auckland",
    label: "(NZST+12:00 / NZDT+13:00) Auckland, Wellington, New Zealand 🇳🇿",
  },

  // Americas
  { value: "America/New_York", label: "(EST-05:00 / EDT-04:00) New York, Boston, Atlanta, USA 🇺🇸" },
  { value: "America/Chicago", label: "(CST-06:00 / CDT-05:00) Chicago, Dallas, Houston, USA 🇺🇸" },
  { value: "America/Denver", label: "(MST-07:00 / MDT-06:00) Denver, Salt Lake City, USA 🇺🇸" },
  {
    value: "America/Los_Angeles",
    label: "(PST-08:00 / PDT-07:00) Los Angeles, San Francisco, Seattle, USA 🇺🇸",
  },
  { value: "America/Toronto", label: "(EST-05:00 / EDT-04:00) Toronto, Montreal, Canada 🇨🇦" },
  { value: "America/Vancouver", label: "(PST-08:00 / PDT-07:00) Vancouver, Canada 🇨🇦" },
  { value: "America/Mexico_City", label: "(CST-06:00) Mexico City, Guadalajara, Mexico 🇲🇽" },
  { value: "America/Sao_Paulo", label: "(BRT-03:00) São Paulo, Rio de Janeiro, Brazil 🇧🇷" },
  { value: "America/Argentina/Buenos_Aires", label: "(ART-03:00) Buenos Aires, Argentina 🇦🇷" },
  { value: "America/Santiago", label: "(CLT-04:00 / -03:00) Santiago, Chile 🇨🇱" },
  { value: "America/Bogota", label: "(COT-05:00) Bogotá, Medellín, Colombia 🇨🇴" },
  { value: "America/Lima", label: "(PET-05:00) Lima, Peru 🇵🇪" },
];

export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 23/07/2026 - UK, EU, Commonwealth, Asia)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 07/23/2026 - US, Canada, Philippines)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-07-23 - ISO 8601, East Asia, Global IT)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (e.g. 23-07-2026)" },
  {
    value: "DD.MM.YYYY",
    label: "DD.MM.YYYY (e.g. 23.07.2026 - Germany, Austria, Switzerland, Nordics)",
  },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY (e.g. 23-Jul-2026 - Alphanumeric Standard)" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD (e.g. 2026/07/23 - Japan, Taiwan, South Africa)" },
];

export function formatDateCustom(
  dateInput: string | Date | number,
  formatPattern: string = "DD/MM/YYYY",
  timeZone?: string,
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
