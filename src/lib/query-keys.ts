import { QueryFilters, QueryKey } from "@tanstack/react-query";

export const queryKeys = {
  db: {
    all: (table: string) => [table] as QueryKey,
    list: (table: string, filters?: Record<string, unknown>) =>
      [table, "list", filters] as QueryKey,
    detail: (table: string, id: string) =>
      [table, "detail", id] as QueryKey,
    single: (table: string, filters: Record<string, unknown>) =>
      [table, "single", filters] as QueryKey,
  },
  siteContent: {
    all: ["siteContent"] as QueryKey,
    section: (section: string) => ["siteContent", section] as QueryKey,
  },
  assets: {
    folder: (folder: string) => ["assets", folder] as QueryKey,
  },
  auth: {
    session: ["auth", "session"] as QueryKey,
  },
  settings: {
    all: ["settings"] as QueryKey,
  },
} as const;

export function matchQueryKey(filters: QueryFilters, key: QueryKey): boolean {
  const filterKey = filters.queryKey;
  if (Array.isArray(filterKey)) {
    return filterKey.every((k, i) => k === key[i]);
  }
  return filterKey === key[0];
}