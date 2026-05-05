import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "./query-keys";

type AssetFile = {
  name: string;
  publicUrl: string;
};

type AssetListResponse = {
  data: {
    folder: string;
    files: AssetFile[];
  } | null;
  error: {
    message: string;
  } | null;
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate, private, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

async function fetchAssets(folder: string): Promise<AssetFile[]> {
  const timestamp = Date.now();
  const url = `/api/assets?folder=${encodeURIComponent(folder)}&_t=${timestamp}`;
  const response = await fetch(url, {
    headers: NO_CACHE_HEADERS,
  });
  const json = await response.json() as AssetListResponse;
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || "Failed to load project assets.");
  }
  return json.data?.files || [];
}

function normaliseFolder(folder: string) {
  return "uploads";
}

export async function listProjectAssets(folder: string, _opts?: { force?: boolean }) {
  return fetchAssets(normaliseFolder(folder));
}

export function useProjectAssets(folder: string, options?: { enabled?: boolean }) {
  const normalized = normaliseFolder(folder);
  
  return useQuery({
    queryKey: queryKeys.assets.folder(normalized),
    queryFn: () => fetchAssets(normalized),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false,
  });
}


export function invalidateProjectAssets(folder?: string) {
  
  if (!folder) {
    queryClient.invalidateQueries({ queryKey: ["assets"] });
    return;
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.assets.folder(normaliseFolder(folder)) });
}

export async function uploadProjectAsset(folder: string, file: File) {
  const targetFolder = normaliseFolder(folder);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const form = new FormData();
  form.append("path", `${targetFolder}/${safeName}`);
  form.append("file", file);

  const res = await fetch("/api/upload", { 
    method: "POST", 
    body: form,
    headers: NO_CACHE_HEADERS,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || json.error || "Upload failed.");
  }

  invalidateProjectAssets(targetFolder);
  return json.data?.publicUrl as string;
}
