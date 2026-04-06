import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, EyeOff, Check, X, RefreshCw, Upload } from "lucide-react";

interface Technology {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  icon: string | null;
  category: string;
  name_color: string;
  category_color: string;
  is_visible: boolean;
  sort_order: number;
}

const API = (q = "") => `/api/db/technologies${q ? `?${q}` : ""}`;
const patch = (id: string, body: any) =>
  fetch(API(`id=${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
const del = (id: string) =>
  fetch(API(`id=${id}`), { method: "DELETE" }).then(r => r.json());
const post = (body: any) =>
  fetch(API(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

async function uploadFile(file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  form.append("path", `uploads/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  return json?.data?.publicUrl || null;
}

const CATEGORIES = ["Frontend", "Backend", "Mobile", "Database", "DevOps", "Cloud", "Language", "General"];

const PRESET_COLORS = [
  "#3178C6", "#DD0031", "#4FC08D", "#F05032", "#FF9900",
  "#02569B", "#339933", "#FFCA28", "#2496ED", "#CC2927",
  "#512BD4", "#0175C2", "#61DAFB", "#3776AB", "#FF6358",
  "#E8E8E8", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
];

const inputCls = "w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-ring outline-none";
const textareaCls = `${inputCls} resize-y min-h-[70px]`;

type FormData = {
  name: string; description: string; image_url: string;
  icon: string; category: string;
  name_color: string; category_color: string;
};
const emptyForm: FormData = {
  name: "", description: "", image_url: "", icon: "",
  category: "General", name_color: "#3178C6", category_color: "#3178C6",
};

// ── Color Picker Field ────────────────────────────────────────────────────────
const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:ring-2 focus:ring-ring outline-none"
        placeholder="#3178C6"
        maxLength={7}
      />
      {/* Live preview badge */}
      <span
        className="shrink-0 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider border"
        style={{ background: `${value}20`, color: value, borderColor: `${value}40` }}
      >
        {label.split(" ")[0]}
      </span>
    </div>
    {/* Preset swatches */}
    <div className="flex flex-wrap gap-1.5 pt-1">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? "border-foreground shadow-md scale-110" : "border-transparent"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  </div>
);

// ── Tech Form ─────────────────────────────────────────────────────────────────
const TechForm = ({ data, onChange, onSave, onCancel, saving, isNew }: {
  data: FormData; onChange: (d: FormData) => void;
  onSave: () => void; onCancel: () => void;
  saving: boolean; isNew?: boolean;
}) => {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-4">
      {/* Name + Category */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Technology Name</label>
          <input value={data.name} onChange={e => onChange({ ...data, name: e.target.value })}
            placeholder="e.g. React" className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category / Method</label>
          <select value={data.category} onChange={e => onChange({ ...data, category: e.target.value })} className={inputCls}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
        <textarea value={data.description} onChange={e => onChange({ ...data, description: e.target.value })}
          placeholder="Brief description..." className={textareaCls} />
      </div>

      {/* Color pickers */}
      <div className="grid sm:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-xl border border-border/50">
        <ColorField
          label="Name Color"
          value={data.name_color}
          onChange={v => onChange({ ...data, name_color: v })}
        />
        <ColorField
          label="Category Color"
          value={data.category_color}
          onChange={v => onChange({ ...data, category_color: v })}
        />
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-3 p-3 bg-muted/10 rounded-xl border border-border/40">
        <span className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">Preview:</span>
        <span className="font-heading font-extrabold text-sm" style={{ color: data.name_color }}>
          {data.name || "Tech Name"}
        </span>
        <span
          className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${data.category_color}20`, color: data.category_color, border: `1px solid ${data.category_color}40` }}
        >
          {data.category}
        </span>
      </div>

      {/* Image upload */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logo / Image URL</label>
        <div className="flex gap-2">
          <input value={data.image_url} onChange={e => onChange({ ...data, image_url: e.target.value })}
            placeholder="/assets/technologies/react.png or CDN URL" className={inputCls} />
          <label className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${uploading ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary hover:bg-secondary/20"}`}>
            <Upload size={13} /> {uploading ? "..." : "Upload"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading}
              onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                setUploading(true);
                const url = await uploadFile(f).catch(() => null);
                setUploading(false);
                if (url) { onChange({ ...data, image_url: url }); toast.success("Uploaded!"); }
                else toast.error("Upload failed.");
                e.target.value = "";
              }} />
          </label>
        </div>
        {data.image_url && (
          <img src={data.image_url} alt="preview"
            className="h-10 w-10 rounded-lg object-contain border border-border/50 mt-1 bg-muted/30 p-1"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving || uploading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
          <Check size={14} /> {saving ? "Saving..." : isNew ? "Add Technology" : "Save Changes"}
        </button>
        <button onClick={onCancel} className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
};

// ── Main Manager ──────────────────────────────────────────────────────────────
const TechnologiesManager = () => {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<FormData>({ ...emptyForm });
  const [newForm, setNewForm] = useState<FormData>({ ...emptyForm });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetch(API("_order=sort_order&_asc=true")).then(r => r.json());
    if (res.data) setTechs(res.data);
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await patch(editingId, {
      name: editData.name, description: editData.description,
      image_url: editData.image_url || null, icon: editData.icon || null,
      category: editData.category,
      name_color: editData.name_color,
      category_color: editData.category_color,
    });
    if (res.error) toast.error("Failed to save.");
    else {
      setTechs(prev => prev.map(t => t.id === editingId ? { ...t, ...editData } : t));
      toast.success("Updated!");
      setEditingId(null);
    }
    setSaving(false);
  };

  const toggleVisible = async (id: string, current: boolean) => {
    await patch(id, { is_visible: !current });
    setTechs(prev => prev.map(t => t.id === id ? { ...t, is_visible: !current } : t));
  };

  const deleteTech = async (id: string) => {
    if (!confirm("Delete this technology?")) return;
    const res = await del(id);
    if (res.error) { toast.error("Failed to delete."); return; }
    setTechs(prev => prev.filter(t => t.id !== id));
    toast.success("Deleted.");
  };

  const addTech = async () => {
    if (!newForm.name) { toast.error("Name is required."); return; }
    setSaving(true);
    const maxOrder = techs.length > 0 ? Math.max(...techs.map(t => t.sort_order)) + 1 : 0;
    const res = await post({
      name: newForm.name, description: newForm.description,
      image_url: newForm.image_url || null, icon: newForm.icon || null,
      category: newForm.category, sort_order: maxOrder,
      name_color: newForm.name_color,
      category_color: newForm.category_color,
    });
    if (res.error) toast.error("Failed to add.");
    else if (res.data) {
      setTechs(prev => [...prev, res.data]);
      setNewForm({ ...emptyForm });
      setAdding(false);
      toast.success("Technology added!");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-muted-foreground text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Our Technologies</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage tech stack — set name color, category color, and logo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><RefreshCw size={14} /></button>
          <button onClick={() => { setAdding(true); setNewForm({ ...emptyForm }); }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            <Plus size={16} /> Add Technology
          </button>
        </div>
      </div>

      {adding && (
        <div className="glass-card p-5 mb-4 border-2 border-secondary/30">
          <h3 className="font-heading font-semibold text-foreground mb-4">New Technology</h3>
          <TechForm data={newForm} onChange={setNewForm} onSave={addTech}
            onCancel={() => { setAdding(false); setNewForm({ ...emptyForm }); }}
            saving={saving} isNew />
        </div>
      )}

      <div className="space-y-2">
        {techs.map(tech => (
          <div key={tech.id} className={`glass-card p-4 ${!tech.is_visible ? "opacity-60" : ""}`}>
            {editingId === tech.id ? (
              <TechForm data={editData} onChange={setEditData} onSave={saveEdit}
                onCancel={() => setEditingId(null)} saving={saving} />
            ) : (
              <div className="flex items-center gap-3">
                {/* Logo preview */}
                <div
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center p-1.5 border border-border/50"
                  style={{ background: `${tech.name_color || "#3178C6"}18` }}
                >
                  {tech.image_url ? (
                    <img src={tech.image_url} alt={tech.name}
                      className="w-full h-full object-contain"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="text-xs font-bold" style={{ color: tech.name_color || "#3178C6" }}>
                      {tech.name.slice(0, 2)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="font-heading font-semibold text-sm"
                      style={{ color: tech.name_color || undefined }}
                    >
                      {tech.name}
                    </h3>
                    <span
                      className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: `${tech.category_color || "#3178C6"}20`,
                        color: tech.category_color || "#3178C6",
                        border: `1px solid ${tech.category_color || "#3178C6"}40`,
                      }}
                    >
                      {tech.category}
                    </span>
                    {/* Color dots */}
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: tech.name_color || "#3178C6" }} title={`Name: ${tech.name_color}`} />
                      <span className="w-3 h-3 rounded-full border border-border/50" style={{ background: tech.category_color || "#3178C6" }} title={`Category: ${tech.category_color}`} />
                    </span>
                    {!tech.is_visible && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Hidden</span>}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{tech.description}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingId(tech.id);
                      setEditData({
                        name: tech.name, description: tech.description,
                        image_url: tech.image_url || "", icon: tech.icon || "",
                        category: tech.category,
                        name_color: tech.name_color || "#3178C6",
                        category_color: tech.category_color || "#3178C6",
                      });
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => toggleVisible(tech.id, tech.is_visible)}
                    className={`p-1.5 rounded-lg hover:bg-muted ${tech.is_visible ? "text-secondary" : "text-muted-foreground"}`}>
                    {tech.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => deleteTech(tech.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {techs.length === 0 && <p className="text-muted-foreground text-center py-12">No technologies yet.</p>}
      </div>
    </div>
  );
};

export default TechnologiesManager;
