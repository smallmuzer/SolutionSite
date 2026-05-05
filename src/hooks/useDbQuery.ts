import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbSelect, dbInsert, dbUpdate, dbDelete, dbBatch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const DEFAULT_STALE_TIME = 30 * 60 * 1000; // 30 minutes
const DEFAULT_GC_TIME = 60 * 60 * 1000;    // 60 minutes

export interface UseDbQueryOptions<T = unknown> {
  order?: string;
  asc?: boolean;
  single?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

export function useDbQuery<T = unknown[]>(
  table: string,
  filters: Record<string, unknown> = {},
  options: UseDbQueryOptions<T> = {}
) {
  const {
    order,
    asc = true,
    single = false,
    enabled = true,
    staleTime = DEFAULT_STALE_TIME,
    gcTime = DEFAULT_GC_TIME,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
  } = options;

  // Include ALL selection options in the query key to prevent cache collisions
  const queryKey = [table, "list", filters, { order, asc, single }];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const result = await dbSelect<T>(table, filters, { order, asc, single });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnMount,
    refetchOnWindowFocus,
    retry: 0,
  });
}

// ── Batch hook: one API call, populates individual table caches ──────────────────

export interface BatchTableSpec {
  table: string;
  filter?: Record<string, unknown>;
  order?: string;
  asc?: boolean;
}

export function useBatchQuery(specs: BatchTableSpec[], options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["batch", specs.map(s => s.table).join(",")],
    queryFn: async () => {
      const result = await dbBatch(specs);
      if (result.error) throw new Error(result.error.message);
      // Populate individual table caches with fresh timestamp so
      // useDbQuery calls in section components hit cache and never refetch
      if (result.data) {
        const now = Date.now();
        for (const { table, filter = {}, order, asc = true } of specs) {
          const tableData = (result.data as Record<string, unknown>)[table];
          if (tableData && (tableData as any).data !== undefined) {
            const key = [table, "list", filter, { order, asc, single: false }];
            queryClient.setQueryData(key, (tableData as any).data, { updatedAt: now });
          }
        }
      }
      return result.data;
    },
    enabled,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  });
}

export function useDbQuerySingle<T = unknown>(
  table: string,
  filters: Record<string, unknown>,
  options: Omit<UseDbQueryOptions<T>, "single"> = {}
) {
  return useDbQuery<T>(table, filters, { ...options, single: true });
}

export interface UseTableMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useTableMutation(table: string, options: UseTableMutationOptions = {}) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [table] });
  };

  const insert = useMutation({
    mutationFn: (data: unknown) => dbInsert(table, data),
    onSuccess: () => {
      invalidate();
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });

  const update = useMutation({
    mutationFn: ({ filters, data }: { filters: Record<string, unknown>; data: unknown }) =>
      dbUpdate(table, filters, data),
    onSuccess: () => {
      invalidate();
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });

  const remove = useMutation({
    mutationFn: (filters: Record<string, unknown>) => dbDelete(table, filters),
    onSuccess: () => {
      invalidate();
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      options.onError?.(error);
    },
  });

  return { insert, update, remove };
}
