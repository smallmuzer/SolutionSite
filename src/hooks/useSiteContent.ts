import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dbSelect } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

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

const CONTENT_STALE_TIME = 10 * 60 * 1000;
const CONTENT_GC_TIME = 30 * 60 * 1000;

async function fetchSiteContent() {
  const result = await dbSelect<any[]>("site_content", {}, {});
  if (result.error || !Array.isArray(result.data)) {
    return {};
  }
  
  const content: Record<string, Record<string, any>> = {};
  result.data.forEach(row => {
    if (row.section_key && row.content) {
      content[row.section_key] = {
        ...(DEFAULT_CONTENT[row.section_key] || {}),
        ...(typeof row.content === "object" ? row.content : {}),
      };
    }
  });
  return content;
}

export function useSiteContent(section: string): Record<string, any> {
  const { data: content = {} } = useQuery({
    queryKey: queryKeys.siteContent.all,
    queryFn: fetchSiteContent,
    staleTime: CONTENT_STALE_TIME,
    gcTime: CONTENT_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return content[section] ?? DEFAULT_CONTENT[section] ?? {};
}

export function useSiteSettingsData(): Record<string, any> {
  const { data: content = {} } = useQuery({
    queryKey: queryKeys.siteContent.all,
    queryFn: fetchSiteContent,
    staleTime: CONTENT_STALE_TIME,
    gcTime: CONTENT_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return content["settings"] ?? {};
}

// Alias for backward compatibility
export const useSiteSettings = useSiteSettingsData;

export function useInvalidateContent() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.siteContent.all });
  }, [queryClient]);
}

export function useContentSync() {
  const invalidate = useInvalidateContent();
  useEffect(() => {
    const onSaved = () => invalidate();
    window.addEventListener("ss:contentSaved", onSaved);
    window.addEventListener("ss:siteSettings", onSaved);
    return () => {
      window.removeEventListener("ss:contentSaved", onSaved);
      window.removeEventListener("ss:siteSettings", onSaved);
    };
  }, [invalidate]);
}

export function useNetworkCompanies(): { id: string; name: string; subtitle: string; desc: string; href: string; flag: string; accent: string; is_visible: boolean }[] {
  const { data: content = {} } = useQuery({
    queryKey: queryKeys.siteContent.all,
    queryFn: fetchSiteContent,
    staleTime: CONTENT_STALE_TIME,
    gcTime: CONTENT_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const network = content["our_network"]?.companies;
  if (Array.isArray(network) && network.length > 0) {
    return network.filter((c: { is_visible: boolean }) => c.is_visible);
  }
  return DEFAULT_NETWORK.filter(c => c.is_visible);
}