import { useEffect, useState } from "react";
import { dbSelect } from "@/lib/api";

// Defaults mirror the exact values stored in app.db site_content table
const DEFAULT_CONTENT: Record<string, Record<string, string>> = {
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

interface NetworkCompany {
  id: string; name: string; subtitle: string; desc: string;
  href: string; flag: string; accent: string; is_visible: boolean;
}

const DEFAULT_NETWORK: NetworkCompany[] = [
  { id: "1", name: "Brilliant Systems Solutions", subtitle: "Private Limited", desc: "Our sister company delivering innovative IT solutions across the Maldives.", href: "https://bsyssolutions.com", flag: "🇲🇻", accent: "#3b82f6", is_visible: true },
  { id: "2", name: "BSS Bhutan", subtitle: "Technology Partner", desc: "Expanding world-class digital solutions across the Kingdom of Bhutan.", href: "#", flag: "🇧🇹", accent: "#10b981", is_visible: true },
];

export function useNetworkCompanies(): NetworkCompany[] {
  const [companies, setCompanies] = useState<NetworkCompany[]>(DEFAULT_NETWORK);

  useEffect(() => {
    const load = async () => {
      const { data } = await dbSelect<any>("site_content", { section_key: "our_network" }, { single: true });
      if (data?.content) {
        const c = data.content as any;
        if (Array.isArray(c?.companies) && c.companies.length > 0) setCompanies(c.companies);
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return companies.filter((c) => c.is_visible);
}

export function useSiteContent(section: string): Record<string, string> {
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT[section] || {});

  useEffect(() => {
    const load = async () => {
      const { data } = await dbSelect<any>("site_content", { section_key: section }, { single: true });
      if (data?.content && section !== "settings") {
        setContent({ ...(DEFAULT_CONTENT[section] || {}), ...(data.content as Record<string, string>) });
      }
    };
    load();
    const handler = () => load();
    window.addEventListener("ss:contentSaved", handler);
    return () => window.removeEventListener("ss:contentSaved", handler);
  }, [section]);

  return content;
}

export function useSiteSettings(): Record<string, any> {
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await dbSelect<any>("site_content", { section_key: "settings" }, { single: true });
      if (data?.content) setSettings(data.content);
    };
    load();
    const onSettings = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && typeof d === "object") setSettings(d);
      else load();
    };
    window.addEventListener("ss:siteSettings", onSettings);
    window.addEventListener("ss:contentSaved", load);
    return () => {
      window.removeEventListener("ss:siteSettings", onSettings);
      window.removeEventListener("ss:contentSaved", load);
    };
  }, []);

  return settings;
}
