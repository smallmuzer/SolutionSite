
export interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
  pattern?: RegExp;
}

export const COUNTRIES: Country[] = [
  { name: "Maldives", code: "MV", dial: "+960", flag: "🇲🇻", pattern: /^\d{7}$/ },
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳", pattern: /^\d{10}$/ },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰", pattern: /^\d{9}$/ },
  { name: "Bhutan", code: "BT", dial: "+975", flag: "🇧🇹", pattern: /^\d{8}$/ },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪", pattern: /^\d{9}$/ },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧", pattern: /^\d{10}$/ },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸", pattern: /^\d{10}$/ },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬", pattern: /^\d{8}$/ },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾", pattern: /^\d{9,10}$/ },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺", pattern: /^\d{9}$/ },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦", pattern: /^\d{8}$/ },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦", pattern: /^\d{9}$/ },
];

export const getCountryByCode = (code: string) => COUNTRIES.find(c => c.code === code) || COUNTRIES[0];

export const detectCountry = async (): Promise<Country> => {
  try {
    // Try to detect by timezone first (fast, no network)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Maldives")) return getCountryByCode("MV");
    if (tz.includes("Calcutta") || tz.includes("India")) return getCountryByCode("IN");
    if (tz.includes("Colombo")) return getCountryByCode("LK");
    if (tz.includes("Thimphu")) return getCountryByCode("BT");
    if (tz.includes("Dubai")) return getCountryByCode("AE");
    if (tz.includes("London")) return getCountryByCode("GB");
    if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago")) return getCountryByCode("US");
    if (tz.includes("Singapore")) return getCountryByCode("SG");

    // Fallback to IP detection
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data.country_code) {
      const found = COUNTRIES.find(c => c.code === data.country_code);
      if (found) return found;
    }
  } catch (e) {
    console.error("Country detection failed", e);
  }
  return COUNTRIES[0]; // Default to Maldives
};

export const validatePhone = (dial: string, number: string): boolean => {
  const country = COUNTRIES.find(c => c.dial === dial);
  if (!country) return number.length >= 7; // Basic fallback
  if (country.pattern) {
    const cleanNumber = number.replace(/\D/g, "");
    return country.pattern.test(cleanNumber);
  }
  return number.length >= 7;
};
