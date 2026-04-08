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

const assetCache = new Map<string, AssetFile[]>();
const inflight = new Map<string, Promise<AssetFile[]>>();

function normaliseFolder(folder: string) {
  const cleaned = String(folder || "uploads").trim() || "uploads";
  if (cleaned === "technologies") return "Technology";
  if (cleaned === "technology") return "Technology";
  if (cleaned === "hero-gallery") return "hero";
  return cleaned;
}

export async function listProjectAssets(folder: string, opts: { force?: boolean } = {}) {
  const key = normaliseFolder(folder);
  if (!opts.force && assetCache.has(key)) {
    return assetCache.get(key) || [];
  }
  if (!opts.force && inflight.has(key)) {
    return inflight.get(key) || [];
  }

  const request = fetch(`/api/assets?folder=${encodeURIComponent(key)}`)
    .then(async (res) => {
      const json = await res.json() as AssetListResponse;
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to load project assets.");
      }
      const files = json.data?.files || [];
      assetCache.set(key, files);
      inflight.delete(key);
      return files;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, request);
  return request;
}

export function invalidateProjectAssets(folder?: string) {
  if (!folder) {
    assetCache.clear();
    inflight.clear();
    return;
  }
  assetCache.delete(normaliseFolder(folder));
  inflight.delete(normaliseFolder(folder));
}

export async function uploadProjectAsset(folder: string, file: File) {
  const targetFolder = normaliseFolder(folder);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const form = new FormData();
  form.append("file", file);
  form.append("path", `${targetFolder}/${safeName}`);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || json.error || "Upload failed.");
  }

  invalidateProjectAssets(targetFolder);
  return json.data?.publicUrl as string;
}
