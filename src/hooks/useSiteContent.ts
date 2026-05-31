import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dbSelect } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const DEFAULT_CONTENT: Record<string, Record<string, any>> = {};

const DEFAULT_NETWORK: any[] = [];

const CONTENT_STALE_TIME = 30 * 60 * 1000; // match global default
const CONTENT_GC_TIME = 60 * 60 * 1000;

async function fetchSiteContent() {
  const result = await dbSelect<any[]>("site_content", {}, {});
  if (result.error || !Array.isArray(result.data)) {
    // Return null so React Query keeps the existing cached (seed) data
    throw new Error(result.error?.message || "Failed to fetch site content");
  }

  const content: Record<string, Record<string, any>> = {};
  result.data.forEach(row => {
    if (row.section_key && row.content) {
      let parsed = row.content;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
      }
      content[row.section_key] = typeof parsed === "object" ? parsed : {};
    }
  });
  return content;
}

export const SHARED_QUERY_OPTIONS = {
  queryKey: queryKeys.siteContent.all,
  queryFn: fetchSiteContent,
  staleTime: 5000, // Reduce staleTime for more reactive UI
  gcTime: CONTENT_GC_TIME,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 0,
} as const;

export function useSiteContent(section: string): Record<string, any> {
  const { data: content = {} } = useQuery(SHARED_QUERY_OPTIONS);
  return content[section] ?? DEFAULT_CONTENT[section] ?? {};
}

export const SETTINGS_QUERY_OPTIONS = {
  queryKey: ["siteSettings"],
  queryFn: async () => {
    const result = await dbSelect<any>("site_settings", { id: "settings", _single: "1" } as any, {});
    if (result.error) throw new Error(result.error.message || "Failed to fetch settings");
    return result.data || {};
  },
  staleTime: 5000,
  gcTime: CONTENT_GC_TIME,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 0,
} as const;

export function useSiteSettingsData(): Record<string, any> {
  const { data = {} } = useQuery(SETTINGS_QUERY_OPTIONS);
  return data;
}

// Alias for backward compatibility
export const useSiteSettings = useSiteSettingsData;

export const SOCIAL_LINKS_QUERY_OPTIONS = {
  queryKey: ["socialLinks"],
  queryFn: async () => {
    const result = await dbSelect<any>("social_links", {}, { sort_order: "ASC" });
    if (result.error) throw new Error(result.error.message || "Failed to fetch social links");
    return result.data || [];
  },
  staleTime: 5000,
  gcTime: CONTENT_GC_TIME,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 0,
} as const;

export function useSocialLinks(): any[] {
  const { data = [] } = useQuery(SOCIAL_LINKS_QUERY_OPTIONS);
  return data;
}

export function useInvalidateContent() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.siteContent.all });
    queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    queryClient.invalidateQueries({ queryKey: ["socialLinks"] });
  }, [queryClient]);
}

export function useContentSync() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateContent();
  useEffect(() => {
    const onSaved = () => {
      invalidate();
      queryClient.invalidateQueries(); // Invalidate EVERYTHING to be sure
    };
    window.addEventListener("ss:contentSaved", onSaved);
    window.addEventListener("ss:siteSettings", onSaved);
    return () => {
      window.removeEventListener("ss:contentSaved", onSaved);
      window.removeEventListener("ss:siteSettings", onSaved);
    };
  }, [invalidate, queryClient]);
}

export function useNetworkCompanies(): { id: string; name: string; subtitle: string; desc: string; href: string; flag: string; accent: string; is_visible: boolean }[] {
  const { data } = useQuery({
    queryKey: ["our_network", "list"],
    queryFn: async () => {
      const res = await dbSelect<any[]>("our_network", {}, { order: "sort_order", asc: true });
      return res.data || [];
    },
    staleTime: 5000,
  });

  if (Array.isArray(data) && data.length > 0) {
    return data.filter(c => c.is_visible);
  }
  return DEFAULT_NETWORK.filter(c => c.is_visible);
}
