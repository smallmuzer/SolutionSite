import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSiteSettingsData, SHARED_QUERY_OPTIONS } from "./useSiteContent";

const FONT_MAP: Record<string, string> = {
  "Arial": "Arial, Helvetica, sans-serif",
  "Courier New": "'Courier New', Courier, monospace",
  "DM Sans": "'DM Sans', sans-serif",
  "Georgia": "Georgia, 'Times New Roman', serif",
  "Inter": "'Inter', sans-serif",
  "Lato": "'Lato', sans-serif",
  "Montserrat": "'Montserrat', sans-serif",
  "Nunito": "'Nunito', sans-serif",
  "Open Sans": "'Open Sans', sans-serif",
  "Playfair Display": "'Playfair Display', serif",
  "Poppins": "'Poppins', sans-serif",
  "Raleway": "'Raleway', sans-serif",
  "Roboto": "'Roboto', sans-serif",
  "Source Code Pro": "'Source Code Pro', monospace",
  "Space Grotesk": "'Space Grotesk', sans-serif",
  "Tahoma": "Tahoma, Geneva, sans-serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  "Trebuchet MS": "'Trebuchet MS', sans-serif",
  "Verdana": "Verdana, Geneva, sans-serif",
};

const FONT_SIZE_MAP: Record<string, string> = {
  "x-small": "13px", "small": "14.5px", "medium": "16px", "large": "18px", "x-large": "20px",
};

function hasCookieConsent(): boolean {
  try {
    const consent = localStorage.getItem("ss_cookie_consent");
    if (consent) {
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

export function saveThemePref(theme: string) {
  if (hasCookieConsent()) {
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `bss-theme=${theme}; expires=${exp}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `bss-theme=${theme}; path=/; SameSite=Lax`;
    try {
      sessionStorage.setItem("bss-theme", theme);
    } catch { /* ignore */ }
  }
}

export function getThemePref(): string | null {
  try {
    const m = document.cookie.split(";").find(c => c.trim().startsWith("bss-theme="));
    if (m) return decodeURIComponent(m.trim().slice("bss-theme=".length + 1));
    const sess = sessionStorage.getItem("bss-theme");
    if (sess) return sess;
  } catch { /* ignore */ }
  return null;
}

export function saveUserSettings(prefs: Record<string, any>) {
  const serialized = JSON.stringify(prefs);
  if (hasCookieConsent()) {
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `bss-user-settings=${encodeURIComponent(serialized)}; expires=${exp}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `bss-user-settings=${encodeURIComponent(serialized)}; path=/; SameSite=Lax`;
    try {
      sessionStorage.setItem("bss-user-settings", serialized);
    } catch { /* ignore */ }
  }
}

export function getUserSettings(): Record<string, any> | null {
  try {
    const m = document.cookie.split(";").find(c => c.trim().startsWith("bss-user-settings="));
    if (m) return JSON.parse(decodeURIComponent(m.trim().slice("bss-user-settings=".length + 1)));
    const sess = sessionStorage.getItem("bss-user-settings");
    if (sess) return JSON.parse(sess);
  } catch { /* ignore */ }
  return null;
}

export function applySettings(dbSettings: Record<string, any>, live = false) {
  let userPrefs: any = {};
  if (!live) {
    userPrefs = getUserSettings() || {};
    const storedTheme = getThemePref();
    if (storedTheme) {
      userPrefs.theme = storedTheme;
    }
  }
  const s = { ...dbSettings, ...userPrefs };

  const theme = s.theme || "light";
  if (theme === "dark") document.documentElement.classList.add("dark");
  else if (theme === "light") document.documentElement.classList.remove("dark");
  else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  const sizeVal = FONT_SIZE_MAP[s.font_size || "small"] || "14.5px";
  document.documentElement.style.setProperty("font-size", sizeVal, "important");
  document.documentElement.style.fontSize = sizeVal;

  const fontFamily = FONT_MAP[s.font_style] || FONT_MAP[s.default_font] || s.font_style || "";
  if (fontFamily) {
    document.documentElement.style.setProperty("--font-body", fontFamily);
    document.body.style.setProperty("font-family", fontFamily, "important");
    document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => (h as HTMLElement).style.fontFamily = fontFamily);
  }

  if (s.accent_color) {
    const hexToHSL = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, sv = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        sv = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(sv * 100)}% ${Math.round(l * 100)}%`;
    };
    const hsl = hexToHSL(s.accent_color);
    document.documentElement.style.setProperty("--secondary", hsl);
    document.documentElement.style.setProperty("--accent", hsl);
    document.documentElement.style.setProperty("--ring", hsl);
  }

  if (s.enable_cinematic) document.body.classList.add("cinematic-mode");
  else document.body.classList.remove("cinematic-mode");
  if (s.cinematic_asset) {
    document.documentElement.style.setProperty("--cinematic-asset", `url('${s.cinematic_asset}')`);
  }

  // Dispatch with DB values so context always reflects DB settings
  window.dispatchEvent(new CustomEvent("ss:globalView", { detail: s.global_view || "grid" }));
  window.dispatchEvent(new CustomEvent("ss:cardStyle", { detail: s.card_style || "icon" }));
  window.dispatchEvent(new CustomEvent("ss:siteSettings", { detail: {
    site_name: s.site_name || "",
    site_logo: s.site_logo || "",
    demo_url: s.demo_url || "",
    whatsapp_number: s.whatsapp_number || "",
    viber_number: s.viber_number || "",
    nav_items: s.nav_items || [],
  }}));
}

function applySecurity(sec: Record<string, any>) {
  document.body.style.userSelect = sec.anti_scraping ? "none" : "";
  (document.body.style as any).webkitUserSelect = sec.anti_scraping ? "none" : "";
  document.oncontextmenu = sec.right_click ? (e) => e.preventDefault() : null;
}

/**
 * useSiteSettings hook
 * 1. Fetches settings and security data via React Query (cached)
 * 2. Applies side-effects (fonts, themes, anti-scraping)
 * 3. Returns the settings object (fixes "settings is undefined" error)
 */
export function useSiteSettings() {
  const settings = useSiteSettingsData();
  // Read security from the already-cached site_content (no extra API call)
  const { data: allContent = {} } = useQuery(SHARED_QUERY_OPTIONS);
  const securityContent = (allContent as any)["security"];

  useEffect(() => {
    if (Object.keys(settings).length > 0) applySettings(settings);
  }, [settings]);

  useEffect(() => {
    if (securityContent) applySecurity(securityContent);
  }, [securityContent]);

  // Immediately apply any locally stored/session customized settings to prevent layout flashes on initial mount
  useEffect(() => {
    const storedTheme = getThemePref();
    if (storedTheme) {
      if (storedTheme === "dark") document.documentElement.classList.add("dark");
      else if (storedTheme === "light") document.documentElement.classList.remove("dark");
    }
    const storedPrefs = getUserSettings();
    if (storedPrefs) {
      applySettings(storedPrefs);
    }
  }, []);

  return settings;
}
