import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, EyeOff, Check, X, Save, Star } from "lucide-react";
import AssetField from "./AssetField";
import { dbDelete, dbInsert, dbSelect, dbUpdate } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  image_url: string;
  extra_text?: string;
  extra_color?: string;
  contact_url: string;
  is_popular: boolean;
  is_visible: boolean;
  sort_order: number;
}

interface SectionHeader {
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
}

const DEFAULT_HEADER: SectionHeader = {
  badge: "Our Products",
  title: "Powerful Software",
  highlight: "Solutions",
  subtitle: "Purpose-built products that solve real business challenges - from ERP to resort management, each crafted for the industries we know best.",
};

const fieldCls = "w-full px-3 py-2 rounded-lg bg-transparent border border-border/60 text-foreground text-sm outline-none focus:border-secondary/70 focus:ring-1 focus:ring-secondary/30 transition-colors";

const InlineField = ({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className={`${fieldCls} resize-y`} />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
    )}
  </div>
);

const ProductsManager = () => {
  const [header, setHeader] = useState<SectionHeader>(DEFAULT_HEADER);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [temp, setTemp] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [tempBadges, setTempBadges] = useState<{ text: string; color: string }[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const hJson = await dbSelect<any>("site_content", { section_key: "our_products" }, { single: true });
      if (hJson.data?.content?.header) {
        setHeader({ ...DEFAULT_HEADER, ...hJson.data.content.header });
      }
      const json = await dbSelect<Product[]>("products", {}, { order: "sort_order", asc: true });
      if (json.data && json.data.length > 0) setProducts(json.data as Product[]);
    } catch {
      toast.error("Failed to load products.");
    }
    setLoading(false);
  };

  const saveHeader = async () => {
    setSavingHeader(true);
    await dbInsert("site_content", { section_key: "our_products", content: { header } });
    setSavingHeader(false);
    toast.success("Products section header saved!");
  };

  const addProduct = async () => {
    const newProduct = {
      name: "New Product",
      tagline: "Product tagline",
      description: "Describe your product here.",
      image_url: "/assets/products/bsol.jpg",
      extra_text: "15 Days Free Trial,Cloud-based SaaS,24/7 Support",
      extra_color: "#16a34a,#2563eb,#9333ea",
      contact_url: "#contact",
      is_popular: false,
      is_visible: true,
      sort_order: products.length,
    };
    const json = await dbInsert<Product>("products", newProduct);
    if (json.error || !json.data) { toast.error("Failed to add product."); return; }
    const data = json.data as Product;
    setProducts(prev => [...prev, data]);
    setEditing(data.id);
    setTemp(data);
    syncBadgesFromTemp(data);
  };

  const syncBadgesFromTemp = (product: Partial<Product>) => {
    const texts = (product.extra_text || "").split(",").map(t => t.trim()).filter(Boolean);
    const colors = (product.extra_color || "").split(",").map(c => c.trim()).filter(Boolean);
    setTempBadges(texts.map((t, i) => ({ text: t, color: colors[i] || colors[0] || "#22c55e" })));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const extra_text = tempBadges.map(b => b.text).join(",");
    const extra_color = tempBadges.map(b => b.color).join(",");
    const patch: Partial<Product> = {
      name: temp.name, tagline: temp.tagline, description: temp.description,
      image_url: temp.image_url, contact_url: temp.contact_url,
      is_popular: temp.is_popular, is_visible: temp.is_visible,
      extra_text, extra_color,
    };
    try {
      const json = await dbUpdate("products", { id: editing }, patch);
      if (json.error) throw new Error(json.error.message);
      setProducts(prev => prev.map(p => p.id === editing ? { ...p, ...patch } as Product : p));
      toast.success("Product saved!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save.");
    }
    setEditing(null);
    setSaving(false);
  };

  const toggleVisible = async (id: string) => {
    const p = products.find(p => p.id === id);
    if (!p) return;
    await dbUpdate("products", { id }, { is_visible: !p.is_visible });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_visible: !p.is_visible } : p));
  };

  const togglePopular = async (id: string) => {
    const p = products.find(p => p.id === id);
    if (!p) return;
    await dbUpdate("products", { id }, { is_popular: !p.is_popular });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_popular: !p.is_popular } : p));
  };

  const deleteProduct = async (id: string) => {
    await dbDelete("products", { id });
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success("Deleted!");
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading products...</div>;
  }

  return (
    <div className="space-y-4 pt-4">

      {/* Section Header */}
      <div className="border border-border/50 rounded-lg p-4 bg-background/50 space-y-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Section Header</span>
        <div className="grid sm:grid-cols-2 gap-3">
          <InlineField label="Badge Text" value={header.badge} onChange={(v) => setHeader({ ...header, badge: v })} />
          <InlineField label="Highlight Word" value={header.highlight} onChange={(v) => setHeader({ ...header, highlight: v })} />
        </div>
        <InlineField label="Section Title" value={header.title} onChange={(v) => setHeader({ ...header, title: v })} />
        <InlineField label="Subtitle / Description" value={header.subtitle} onChange={(v) => setHeader({ ...header, subtitle: v })} multiline />
        <div className="flex justify-end">
          <button onClick={saveHeader} disabled={savingHeader}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
            <Save size={12} /> {savingHeader ? "Saving..." : "Save Header"}
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Products ({products.length})</span>
        <button onClick={addProduct}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-xs font-medium hover:bg-secondary/20">
          <Plus size={12} /> Add Product
        </button>
      </div>

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="border border-border/50 rounded-lg p-3 bg-background/50">
            {editing === p.id ? (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <InlineField label="Product Name" value={temp.name || ""} onChange={(v) => setTemp({ ...temp, name: v })} />
                  <InlineField label="Tagline" value={temp.tagline || ""} onChange={(v) => setTemp({ ...temp, tagline: v })} />
                </div>
                <InlineField label="Description" value={temp.description || ""} onChange={(v) => setTemp({ ...temp, description: v })} multiline />

                {/* Badges */}
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest">Product Feature Perks / Badges</label>
                    <button onClick={() => setTempBadges([...tempBadges, { text: "New Perk", color: "#22c55e" }])}
                      className="text-[0.625rem] font-bold text-secondary uppercase hover:underline">
                      + Add Perk
                    </button>
                  </div>
                  {tempBadges.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-border/60 rounded-lg text-muted-foreground text-[0.625rem] uppercase font-bold tracking-wider">
                      No badges added yet
                    </div>
                  )}
                  <div className="space-y-2">
                    {tempBadges.map((badge, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <button
                          onClick={() => {
                            const list = [...tempBadges];
                            const isNeg = badge.text.startsWith("!");
                            list[idx] = { text: isNeg ? badge.text.substring(1) : "!" + badge.text, color: isNeg ? "#22c55e" : "#ef4444" };
                            setTempBadges(list);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all shrink-0 ${badge.text.startsWith("!") ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"}`}>
                          {badge.text.startsWith("!") ? <X size={12} /> : <Check size={12} />}
                        </button>
                        <input
                          value={badge.text.startsWith("!") ? badge.text.substring(1) : badge.text}
                          onChange={(e) => {
                            const list = [...tempBadges];
                            list[idx] = { ...list[idx], text: (badge.text.startsWith("!") ? "!" : "") + e.target.value };
                            setTempBadges(list);
                          }}
                          placeholder="Feature name..."
                          className="flex-[3] px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:border-secondary/50 outline-none" />
                        <div className="flex-1 relative flex items-center">
                          <input
                            type="color"
                            value={badge.color.startsWith("#") ? badge.color : "#22c55e"}
                            onChange={(e) => { const list = [...tempBadges]; list[idx] = { ...list[idx], color: e.target.value }; setTempBadges(list); }}
                            className="absolute inset-y-0 right-0 w-8 h-full bg-transparent border-0 p-0 cursor-pointer opacity-0" />
                          <input
                            value={badge.color}
                            onChange={(e) => { const list = [...tempBadges]; list[idx] = { ...list[idx], color: e.target.value }; setTempBadges(list); }}
                            className="w-full pl-2 pr-7 py-1.5 rounded-lg bg-background border border-border text-[0.625rem] font-mono outline-none"
                            placeholder="#000000" />
                          <div className="absolute right-1.5 w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: badge.color }} />
                        </div>
                        <button onClick={() => setTempBadges(tempBadges.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[0.5625rem] text-muted-foreground uppercase tracking-widest px-1">
                    <span className="text-secondary font-black">Note:</span> Toggle left button to switch Tick / X.
                  </p>
                </div>

                <InlineField label="Contact / Link URL" value={temp.contact_url || ""} onChange={(v) => setTemp({ ...temp, contact_url: v })} />

                {/* Image */}
                <AssetField
                  label="Product Image"
                  value={temp.image_url || ""}
                  onChange={(image_url) => setTemp({ ...temp, image_url })}
                  folder="products"
                  placeholder="/assets/products/..."
                  previewClassName="w-20 h-14 object-cover rounded-lg border border-border"
                />

                <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer w-fit">
                  <input type="checkbox" checked={!!temp.is_popular} onChange={(e) => setTemp({ ...temp, is_popular: e.target.checked })} />
                  <Star size={11} className="text-amber-500" /> Mark as Most Popular
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs">
                    <X size={12} />
                  </button>
                  <button onClick={saveEdit} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs">
                    <Check size={12} /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-12 h-10 object-cover rounded-lg border border-border shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{p.name}</span>
                    {p.is_popular && <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-semibold">Popular</span>}
                    {!p.is_visible && <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Hidden</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{p.tagline}</div>
                  {p.extra_text && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.extra_text.split(",").map((t, i) => {
                        const colors = (p.extra_color || "").split(",");
                        const color = colors[i]?.trim() || colors[0]?.trim() || "#16a34a";
                        const isNeg = t.trim().startsWith("!");
                        const label = isNeg ? t.trim().substring(1) : t.trim();
                        return label ? (
                          <span key={i} className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-sm uppercase"
                            style={{ color, background: color + "18", border: `1px solid ${color}44` }}>
                            {isNeg ? "✗" : "✓"} {label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => togglePopular(p.id)} title="Toggle Most Popular"
                    className={`p-1.5 rounded hover:bg-muted ${p.is_popular ? "text-amber-500" : "text-muted-foreground"}`}>
                    <Star size={13} fill={p.is_popular ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => { setEditing(p.id); setTemp(p); syncBadgesFromTemp(p); }}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => toggleVisible(p.id)}
                    className={`p-1.5 rounded hover:bg-muted ${p.is_visible ? "text-secondary" : "text-muted-foreground"}`}>
                    {p.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductsManager;
