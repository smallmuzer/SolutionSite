/**
 * queryClient.ts — Singleton QueryClient instance.
 * Kept in a separate file to avoid the fast-refresh warning that occurs
 * when a file exports both a component and non-component values.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: 0 },
  },
});
