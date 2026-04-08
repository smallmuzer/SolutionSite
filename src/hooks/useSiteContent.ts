import { useEffect, useState, useCallback } from "react";
import { dbSelect } from "@/lib/api";

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CONTENT: Record<string, Record<string, any>> = {
  hero: {
    title: "Leading IT Solutions Company in Maldives",
    subtitle: "Transform your business with cutting-edge technology solutions.",
    cta_text: "Get Started",
    hero_image: "/assets/hero/hero_3d_glassy1.png",
  },
  about: {
    title: "Driving Digital Transformation",
    description: "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company in the Digital Era!",
    vision: "Our journey began out of the passion for a unique position in the industry.",
    card_mission: "Deliver innovative technology solutions that transform businesses.",
    card_team: "Expert developers, designers, and consultants dedicated to your success.",
    card_quality: "Every solution we build meets the highest standards of performance.",
    card_global: "Serving clients across Maldives, Bhutan, and beyond.",
    card_mission_image: "/assets/about/mission.png",
    card_team_image: "/assets/about/team.png",
    card_quality_image: "/assets/about/quality.png",
    card_global_image: "/assets/about/global.png",
  },
  services: {
    title: "Services & Solutions We Deliver",
    subtitle: "Team up with the perfect digital partner for all your technical needs to achieve your business goals, reduce costs and accelerate growth.",
  },
  contact: {
    title: "Get In Touch",
    subtitle: "Ready to transform your business? Contact us today.",
    address: "Alia Building, 7th Floor\nGandhakoalhi Magu\nMalé, Maldives",
    email: "info@solutions.com.mv",
    phone: "+960 301-1355",
    landline: "+91-452 238 7388",
    hours: "Sun–Thu: 9AM–6PM\nSat: 9AM–1PM",
    facebook: "https://www.facebook.com/brilliantsystemssolutions/",
    twitter: "https://x.com/bsspl_india",
    linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
    instagram: "https://www.instagram.com/brilliantsystemssolutions",
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} Systems Solutions Pvt Ltd. All rights reserved.`,
    tagline: "Leading IT consulting and software development company delivering cutting-edge technology solutions.",
    facebook: "https://www.facebook.com/brilliantsystemssolutions/",
    twitter: "https://x.com/bsspl_india",
    linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
    instagram: "https://www.instagram.com/brilliantsystemssolutions",
  },
  testimonials: { badge: "Testimonials", title: "What Our", highlight: "Clients Say" },
  careers: {
    badge: "Careers", title: "Join Our", highlight: "Team",
    description: "Be part of a dynamic team building cutting-edge technology solutions for clients worldwide.",
  },
  clients: {
    badge: "Our Clients", title: "Trusted by", highlight: "Industry Leaders",
    description: "We're proud to have served over 300+ successful projects for leading companies across the Maldives and beyond.",
  },
};

const DEFAULT_NETWORK = [
  { id: "1", name: "Brilliant Systems Solutions", subtitle: "Private Limited", desc: "Our sister company delivering innovative IT solutions across the Maldives.", href: "https://bsyssolutions.com", flag: "🇲🇻", accent: "#3b82f6", is_visible: true },
  { id: "2", name: "BSS Bhutan", subtitle: "Technology Partner", desc: "Expanding world-class digital solutions across the Kingdom of Bhutan.", href: "#", flag: "🇧🇹", accent: "#10b981", is_visible: true },
];

// ── Module-level shared store (single fetch for ALL sections) ─────────────────

type Listener = () => void;
const store: Record<string, Record<string, any>> = {};
const listeners = new Set<Listener>();
let fetchPromise: Promise<void> | null = null;
let fetched = false;

function notify() { listeners.forEach(fn => fn()); }

async function fetchAllContent() {
  if (fetched) return;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data } = await dbSelect<any[]>("site_content", {}, {});
      if (Array.isArray(data)) {
        data.forEach(row => {
          if (row.section_key && row.content) {
            store[row.section_key] = {
              ...(DEFAULT_CONTENT[row.section_key] || {}),
              ...(typeof row.content === "object" ? row.content : {}),
            };
          }
        });
        fetched = true;
        notify();
      }
    } catch {
      // silently fall back to defaults
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

function refetchAllContent() {
  fetched = false;
  fetchPromise = null;
  fetchAllContent();
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSiteContent(section: string): Record<string, any> {
  const getSnapshot = useCallback(() =>
    store[section] ?? DEFAULT_CONTENT[section] ?? {},
    [section]
  );

  const [content, setContent] = useState<Record<string, any>>(getSnapshot);

  useEffect(() => {
    const update = () => setContent({ ...(store[section] ?? DEFAULT_CONTENT[section] ?? {}) });
    listeners.add(update);
    fetchAllContent();

    const onSaved = () => { refetchAllContent(); };
    window.addEventListener("ss:contentSaved", onSaved);

    return () => {
      listeners.delete(update);
      window.removeEventListener("ss:contentSaved", onSaved);
    };
  }, [section]);

  return content;
}

export function useSiteSettings(): Record<string, any> {
  const [settings, setSettings] = useState<Record<string, any>>(
    () => store["settings"] ?? {}
  );

  useEffect(() => {
    const update = () => setSettings({ ...(store["settings"] ?? {}) });
    listeners.add(update);
    fetchAllContent();

    const onSettings = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && typeof d === "object") setSettings(d);
      else refetchAllContent();
    };
    window.addEventListener("ss:siteSettings", onSettings);
    window.addEventListener("ss:contentSaved", () => refetchAllContent());

    return () => {
      listeners.delete(update);
      window.removeEventListener("ss:siteSettings", onSettings);
    };
  }, []);

  return settings;
}

interface NetworkCompany {
  id: string; name: string; subtitle: string; desc: string;
  href: string; flag: string; accent: string; is_visible: boolean;
}

export function useNetworkCompanies(): NetworkCompany[] {
  const [companies, setCompanies] = useState<NetworkCompany[]>(DEFAULT_NETWORK);

  useEffect(() => {
    const update = () => {
      const c = store["our_network"];
      if (Array.isArray(c?.companies) && c.companies.length > 0) {
        setCompanies(c.companies);
      }
    };
    listeners.add(update);
    fetchAllContent();
    return () => { listeners.delete(update); };
  }, []);

  return companies.filter(c => c.is_visible);
}
