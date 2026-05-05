import { useEffect, useState } from "react";
import { FolderOpen, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { listProjectAssets, uploadProjectAsset } from "@/lib/assets";

type AssetFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  folder: string;
  placeholder?: string;
  previewClassName?: string;
  inputClassName?: string;
};

const defaultInputClassName = "w-full px-3 py-2 rounded-lg bg-transparent border border-border/60 text-foreground text-sm outline-none focus:border-secondary/70 focus:ring-1 focus:ring-secondary/30 transition-colors";
const defaultPreviewClassName = "h-14 rounded-lg object-cover mt-2 shadow-sm border border-border/50";

export default function AssetField({
  label,
  value,
  onChange,
  folder,
  placeholder,
  previewClassName = defaultPreviewClassName,
  inputClassName = defaultInputClassName,
}: AssetFieldProps) {
  const [files, setFiles] = useState<{ name: string; publicUrl: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadFiles = async (force = false) => {
    setLoading(true);
    try {
      const nextFiles = await listProjectAssets("uploads", { force });
      setFiles(nextFiles);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load project files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pickerOpen) {
      void loadFiles();
    }
  }, [pickerOpen, folder]);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadProjectAsset("uploads", file);
      onChange(publicUrl);
      setPickerOpen(true);
      await loadFiles(true);
      toast.success("Asset uploaded.");
    } catch (error: any) {
      toast.error(error?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `/assets/${folder}/...`}
        className={inputClassName}
      />
      <div className="flex flex-wrap gap-2">
        <label className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${uploading ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary hover:bg-secondary/20"}`}>
          <Upload size={13} /> {uploading ? "Uploading..." : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              await handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <FolderOpen size={13} /> {pickerOpen ? "Hide Files" : "Pick Existing"}
        </button>
        {pickerOpen && (
          <button
            type="button"
            onClick={() => void loadFiles(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        )}
      </div>
      {pickerOpen && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading files from `/public/assets/{folder}`...</p>
          ) : files.length ? (
            <select
              value={files.some((file) => file.publicUrl === value) ? value : ""}
              onChange={(e) => e.target.value && onChange(e.target.value)}
              className={inputClassName}
            >
              <option value="">Select from project folder</option>
              {files.map((file) => (
                <option key={file.publicUrl} value={file.publicUrl}>
                  {file.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted-foreground">No files found in `/public/assets/{folder}` yet.</p>
          )}
        </div>
      )}
      {value ? (
        <img
          src={value}
          alt="preview"
          className={previewClassName}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
