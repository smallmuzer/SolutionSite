import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, EyeOff, Check, X, RefreshCw, Upload } from "lucide-react";
import {
  Briefcase, Code2, Smartphone, Palette, BarChart2, Database,
  Users, Globe, Shield, Headphones, PenTool, TrendingUp,
  Monitor, Cloud, Search, Megaphone, Lock, Server, Cpu,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CareerJob = Tables<"career_jobs">;

const API = (table: string, query = "") => `/api/db/${table}${query ? `?${query}` : ""}`;
const patch = (table: string, id: string, body: any) =>
  fetch(API(table, `id=${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
const del = (table: string, id: string) =>
  fetch(API(table, `id=${id}`), { method: "DELETE" }).then(r => r.json());
const post = (table: string, body: any) =>
  fetch(API(table), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

async function uploadFile(file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  form.append("path", `careers/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  return json?.data?.publicUrl || null;
}

const ICON_OPTIONS = [
  { name: "Briefcase",  Icon: Briefcase  },
  { name: "Code2",      Icon: Code2      },
  { name: "Smartphone", Icon: Smartphone },
  { name: "Palette",    Icon: Palette    },
  { name: "BarChart2",  Icon: BarChart2  },
  { name: "Database",   Icon: Database   },
  { name: "Users",      Icon: Users      },
  { name: "Globe",      Icon: Globe      },
  { name: "Shield",     Icon: Shield     },
  { name: "Headphones", Icon: Headphones },
  { name: "PenTool",    Icon: PenTool    },
  { name: "TrendingUp", Icon: TrendingUp },
  { name: "Monitor",    Icon: Monitor    },
  { name: "Cloud",      Icon: Cloud      },
  { name: "Search",     Icon: Search     },
  { name: "Megaphone",  Icon: Megaphone  },
  { name: "Lock",       Icon: Lock       },
  { name: "Server",     Icon: Server     },
  { name: "Cpu",        Icon: Cpu        },
];

const inputCls = "w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-ring outline-none";
const textareaCls = `${inputCls} resize-y min-h-[80px] max-h-52 overflow-y-auto`;

type FormData = { title: string; description: string; location: string; job_type: string; image_url: string; icon: string };
const emptyForm: FormData = { title: "", description: "", location: "Malé, Maldives", job_type: "Full-time", image_url: "", icon: "" };

// ── Icon Picker ───────────────────────────────────────────────────────────────
const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon Selection</label>
    <div className="flex flex-wrap gap-1.5 p-2 border border-border/60 rounded-lg bg-muted/10 max-h-28 overflow-y-auto">
      {ICON_OPTIONS.map(({ name, Icon }) => (
        <button key={name} type="button" title={name}
          onClick={() => onChange(value === name ? "" : name)}
          className={`p-2 rounded-lg transition-colors ${value === name ? "bg-secondary text-secondary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"}`}>
          <Icon size={16} />
        </button>
      ))}
    </div>
    {value && (
      <p className="text-[0.625rem] text-muted-foreground">Selected: <span className="font-semibold text-secondary">{value}</span></p>
    )}
  </div>
);

// ── Image Upload Field ────────────────────────────────────────────────────────
const ImageField = ({ value, onChange, uploading, setUploading }: {
  value: string; onChange: (v: string) => void;
  uploading: boolean; setUploading: (v: boolean) => void;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Image</label>
    <div className="flex gap-2">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="/assets/careers/image.jpg"
        className={inputCls}
      />
      <label className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${uploading ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary hover:bg-secondary/20"}`}>
        <Upload size={13} /> {uploading ? "..." : "Upload"}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            const url = await uploadFile(f).catch(() => null);
            setUploading(false);
            if (url) { onChange(url); toast.success("Image uploaded!"); }
            else toast.error("Upload failed.");
            e.target.value = "";
          }}
        />
      </label>
    </div>
    {value && (
      <img src={value} alt="preview" className="h-16 rounded-lg object-cover border border-border/50 mt-1"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
    )}
  </div>
);

// ── Job Form ──────────────────────────────────────────────────────────────────
const JobForm = ({ data, onChange, onSave, onCancel, saving, uploading, setUploading, isNew }: {
  data: FormData; onChange: (d: FormData) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; uploading: boolean; setUploading: (v: boolean) => void; isNew?: boolean;
}) => (
  <div className="space-y-3">
    <input value={data.title} onChange={e => onChange({ ...data, title: e.target.value })}
      placeholder="Job title e.g. Senior Developer" className={inputCls} />
    <div className="grid sm:grid-cols-2 gap-3">
      <input value={data.location} onChange={e => onChange({ ...data, location: e.target.value })}
        placeholder="e.g. Malé, Maldives" className={inputCls} />
      <select value={data.job_type} onChange={e => onChange({ ...data, job_type: e.target.value })} className={inputCls}>
        <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Remote</option><option>Internship</option>
      </select>
    </div>
    <textarea value={data.description} onChange={e => onChange({ ...data, description: e.target.value })}
      placeholder="Job description..." className={textareaCls} />
    <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-border/30">
      <ImageField value={data.image_url} onChange={v => onChange({ ...data, image_url: v })}
        uploading={uploading} setUploading={setUploading} />
      <IconPicker value={data.icon} onChange={v => onChange({ ...data, icon: v })} />
    </div>
    <div className="flex gap-2 pt-1">
      <button onClick={onSave} disabled={saving || uploading}
        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
        <Check size={14} /> {saving ? "Saving..." : isNew ? "Add Job" : "Save"}
      </button>
      <button onClick={onCancel} className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium">
        <X size={14} /> Cancel
      </button>
    </div>
  </div>
);

// ── Main Manager ──────────────────────────────────────────────────────────────
const CareersManager = () => {
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<FormData>({ ...emptyForm });
  const [newForm, setNewForm] = useState<FormData>({ ...emptyForm });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetch(API("career_jobs", "_order=sort_order&_asc=true")).then(r => r.json());
    if (res.data) setJobs(res.data);
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await patch("career_jobs", editingId, {
      title: editData.title, description: editData.description,
      location: editData.location, job_type: editData.job_type,
      image_url: editData.image_url || null, icon: editData.icon || null,
    });
    if (res.error) { toast.error("Failed to save."); }
    else { setJobs(prev => prev.map(j => j.id === editingId ? { ...j, ...editData } : j)); toast.success("Job updated!"); setEditingId(null); }
    setSaving(false);
  };

  const toggleVisible = async (id: string, current: boolean) => {
    await patch("career_jobs", id, { is_visible: !current });
    setJobs(prev => prev.map(j => j.id === id ? { ...j, is_visible: !current } : j));
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this job listing?")) return;
    const res = await del("career_jobs", id);
    if (res.error) { toast.error("Failed to delete."); return; }
    setJobs(prev => prev.filter(j => j.id !== id));
    toast.success("Job deleted.");
  };

  const addJob = async () => {
    if (!newForm.title || !newForm.description) { toast.error("Title and description required."); return; }
    setSaving(true);
    const maxOrder = jobs.length > 0 ? Math.max(...jobs.map(j => j.sort_order)) + 1 : 0;
    const res = await post("career_jobs", {
      title: newForm.title, description: newForm.description,
      location: newForm.location, job_type: newForm.job_type,
      image_url: newForm.image_url || null, icon: newForm.icon || null,
      sort_order: maxOrder,
    });
    if (res.error) { toast.error("Failed to add."); }
    else if (res.data) {
      setJobs(prev => [...prev, res.data]);
      setNewForm({ ...emptyForm });
      setAdding(false);
      toast.success("Job added!");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-muted-foreground text-center py-12">Loading jobs...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Career Listings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage job postings — set image or icon per listing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><RefreshCw size={14} /></button>
          <button onClick={() => { setAdding(true); setNewForm({ ...emptyForm }); }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} /> Add Job
          </button>
        </div>
      </div>

      {adding && (
        <div className="glass-card p-5 mb-4 border-2 border-secondary/30">
          <h3 className="font-heading font-semibold text-foreground mb-4">New Job Listing</h3>
          <JobForm data={newForm} onChange={setNewForm} onSave={addJob}
            onCancel={() => { setAdding(false); setNewForm({ ...emptyForm }); }}
            saving={saving} uploading={uploading} setUploading={setUploading} isNew />
        </div>
      )}

      <div className="space-y-3">
        {jobs.map(job => {
          const IconComp = ICON_OPTIONS.find(o => o.name === job.icon)?.Icon;
          return (
            <div key={job.id} className={`glass-card p-4 ${!job.is_visible ? "opacity-60" : ""}`}>
              {editingId === job.id ? (
                <JobForm data={editData} onChange={setEditData} onSave={saveEdit}
                  onCancel={() => setEditingId(null)}
                  saving={saving} uploading={uploading} setUploading={setUploading} />
              ) : (
                <div className="flex items-start gap-3">
                  {/* Preview thumbnail */}
                  <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-border/50 flex items-center justify-center bg-muted">
                    {job.image_url ? (
                      <img src={job.image_url} alt={job.title} className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : IconComp ? (
                      <IconComp size={20} className="text-secondary" />
                    ) : (
                      <Briefcase size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-foreground text-sm">{job.title}</h3>
                      <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{job.job_type}</span>
                      <span className="text-xs text-muted-foreground">{job.location}</span>
                      {job.image_url && <span className="text-[0.625rem] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">IMG</span>}
                      {job.icon && <span className="text-[0.625rem] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded font-bold uppercase">ICON</span>}
                      {!job.is_visible && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Hidden</span>}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{job.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => {
                      setEditingId(job.id);
                      setEditData({ title: job.title, description: job.description, location: job.location, job_type: job.job_type, image_url: job.image_url || "", icon: job.icon || "" });
                    }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 size={15} /></button>
                    <button onClick={() => toggleVisible(job.id, job.is_visible)}
                      className={`p-1.5 rounded-lg hover:bg-muted ${job.is_visible ? "text-secondary" : "text-muted-foreground"}`}>
                      {job.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button onClick={() => deleteJob(job.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {jobs.length === 0 && <p className="text-muted-foreground text-center py-12">No job listings yet.</p>}
      </div>
    </div>
  );
};

export default CareersManager;
