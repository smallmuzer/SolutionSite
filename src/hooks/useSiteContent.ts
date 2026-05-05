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

export function useSiteSettingsData(): Record<string, any> {
  const { data: content = {} } = useQuery(SHARED_QUERY_OPTIONS);
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
  const { data: content = {} } = useQuery(SHARED_QUERY_OPTIONS);

  const network = content["our_network"]?.companies;
  if (Array.isArray(network) && network.length > 0) {
    return network.filter((c: { is_visible: boolean }) => c.is_visible);
  }
  return DEFAULT_NETWORK.filter(c => c.is_visible);
}
