import { useEffect, useRef, useState } from "react";
import AnimatedSection from "./AnimatedSection";
import { ShoppingCart, PlayCircle, Tag, CheckCircle2, XCircle, List, LayoutGrid, Database, Users, Anchor, Building2, Plane, Star, Plus } from "lucide-react";
import { useGlobalView } from "./ui-customizer-context";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

const PRODUCT_ICON_CONFIG: Record<string, { Icon: React.ElementType; bg: string }> = {};

function getProductIcon(name: string) {
  return PRODUCT_ICON_CONFIG[name] ?? { Icon: ShoppingCart, bg: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" };
}

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  extra_text?: string;
  extra_color?: string;
  image_url: string;
  contact_url: string;
  demo_url?: string;
  more_info_label?: string;
  demo_label?: string;
  is_popular: boolean;
  is_visible: boolean;
  sort_order: number;
}

interface SectionHeader {
  badge?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
}

const FALLBACK_PRODUCTS: Product[] = [];

const DEFAULT_HEADER: SectionHeader = {};

const ProductCard = ({ product, onDemo, cardStyle, getNavProps, onMove, draggedId, onDragStart, onDragOver, onDrop }: { product: Product; onDemo: () => void; cardStyle: "icon" | "image"; getNavProps: any; onMove?: (dir: "up" | "down" | "left" | "right") => void; draggedId?: string | null; onDragStart?: any; onDragOver?: any; onDrop?: any }) => {
  const editor = useLiveEditor();
  const [expanded, setExpanded] = useState(false);
  const { Icon, bg } = getProductIcon(product.name);
  const badgeColor = product.extra_color || "#007600";

  return (
    <div
      className={`relative flex-shrink-0 bg-white dark:bg-[#11111f] rounded-2xl overflow-hidden group/item cursor-pointer border border-border/50 hover:border-blue-500/30 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-2 hover:outline hover:outline-2 hover:outline-secondary/50 ${!product.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === product.id ? "opacity-20 scale-95" : ""}`}
      style={{ width: 280 }}
      {...getNavProps(() => {})}
      draggable={editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, product.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, product.id) : undefined}
    >
      <EditorToolbar 
        section="products" 
        id={product.id} 
        isVisible={product.is_visible} 
        imageField="image_url" 
      />
      {editor?.isEditMode && onMove && (
        <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); onMove("left"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Left">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove("right"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Right">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
      {product.is_popular && (
        <div className={`absolute top-2 left-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[0.6875rem] font-black text-white shadow-lg ${product.name === "HR-Metrics"
          ? "bg-gradient-to-r from-pink-600 to-rose-700 ring-2 ring-white/30 animate-pulse"
          : "bg-[#CC0C39]"
          }`}>
          {product.name === "HR-Metrics" && <Star size={10} fill="currentColor" className="animate-spin-slow" />}
          {product.name === "HR-Metrics" ? "MOST POPULAR HR" : "Best Seller"}
        </div>
      )}

      {cardStyle === "image" ? (
        <div className="relative bg-[#f7f8f8] dark:bg-[#0f0f1a] overflow-hidden" style={{ height: 180 }}>
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-all duration-300" />
        </div>
      ) : (
        <div className="relative overflow-hidden flex items-center justify-center" style={{ height: 90, background: bg }}>
          <Icon size={36} className="text-white/90" />
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-all duration-300" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-[#007185] dark:text-[#4db8c8]">
          <EditableText section="products" field="tagline" id={product.id} value={product.tagline} colorField="tagline_color" />
        </span>
        <h3 className="font-bold text-[1rem] leading-snug text-gray-900 dark:text-white group-hover/item:text-[#C7511F] dark:group-hover/item:text-[#4db8c8] transition-colors">
          <EditableText section="products" field="name" id={product.id} value={product.name} colorField="name_color" />
        </h3>
        <div className="relative">
          <p className={`text-[0.75rem] font-semibold text-gray-500 dark:text-gray-400 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            <EditableText section="products" field="description" id={product.id} value={product.description} colorField="description_color" />
          </p>
          {product.description.length > 80 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[0.6875rem] font-bold text-secondary mt-1 hover:underline underline-offset-2"
            >
              Read {expanded ? "Less" : "More"}
            </button>
          )}
        </div>

        <div className="relative flex flex-col gap-2 mt-1 border-t border-gray-100 dark:border-white/5 pt-3 group/features">
          {editor?.isEditMode && (
            <div className="absolute -top-3 right-0 opacity-0 group-hover/features:opacity-100 transition-opacity flex gap-1 bg-card rounded-md shadow-sm border border-border/50 p-0.5 z-10">
              <button 
                onClick={() => {
                  const draftKey = product.id ? `products:${product.id}:extra_text` : `products:extra_text`;
                  const current = editor?.pendingChanges[draftKey] ?? product.extra_text;
                  editor.onUpdate("products", "extra_text", current ? `${current}, New Feature` : "New Feature", product.id);
                }}
                className="p-1 hover:bg-secondary/10 text-secondary rounded" title="Add Feature"
              >
                <Plus size={12} />
              </button>
              <button 
                onClick={() => editor.onPickColor("products", "extra_color", product.id)}
                className="p-1 hover:bg-secondary/10 text-secondary rounded" title="Pick Features Color"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </button>
            </div>
          )}
          {(() => {
            const draftKey = product.id ? `products:${product.id}:extra_text` : `products:extra_text`;
            const extraText = editor?.pendingChanges[draftKey] ?? product.extra_text;
            const features = extraText ? extraText.split(",") : ["15 Days Free Trial", "Cloud-based SaaS", "24/7 Support", "Custom Onboarding"];
            
            const colorDraftKey = product.id ? `products:${product.id}:extra_color` : `products:extra_color`;
            const extraColor = editor?.pendingChanges[colorDraftKey] ?? product.extra_color;
            const fColors = extraColor ? extraColor.split(",").map(c => c.trim()) : ["#16a34a"];
            const fColorBase = fColors[0] || "#16a34a";

            return features.map((feature, idx) => {
              const rawText = feature.trim();
              if (!rawText) return null;
              const isNegative = rawText.startsWith("!");
              const cleanText = isNegative ? rawText.substring(1).trim() : rawText;
              const fColor = isNegative ? "#ef4444" : fColorBase;

              return (
                <div key={idx} className="flex items-center gap-1.5 py-0.5 group/badge hover:scale-[1.02] transition-transform">
                  <span 
                    style={{ color: fColor }} 
                    className={`text-[0.6875rem] font-bold tracking-tight brightness-90 dark:brightness-125 uppercase ${editor?.isEditMode ? 'cursor-text hover:outline hover:outline-1 hover:outline-secondary/30 px-1' : ''}`}
                    contentEditable={editor?.isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      if (!editor?.isEditMode) return;
                      const newVal = e.currentTarget.textContent || "";
                      const currentFeatures = extraText ? extraText.split(",").map(s => s.trim()) : ["15 Days Free Trial", "Cloud-based SaaS", "24/7 Support", "Custom Onboarding"];
                      currentFeatures[idx] = isNegative ? `! ${newVal}` : newVal;
                      editor.onUpdate("products", "extra_text", currentFeatures.join(", "), product.id);
                    }}
                  >
                    {cleanText}
                  </span>
                  {editor?.isEditMode && (
                    <button
                      onClick={() => {
                        const currentFeatures = extraText ? extraText.split(",").map(s => s.trim()) : [];
                        currentFeatures.splice(idx, 1);
                        editor.onUpdate("products", "extra_text", currentFeatures.join(", "), product.id);
                      }}
                      className="ml-auto opacity-0 group-hover/badge:opacity-100 p-0.5 text-destructive hover:bg-destructive/10 rounded transition-all"
                      title="Remove Feature"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              );
            });
          })()}
        </div>
      <div className="flex items-center gap-2 mt-3 w-full">
        <div className="flex-1 relative group/btn">
          <button
            {...getNavProps(() => {
              const url = product.contact_url;
              if (url && url.startsWith("http")) {
                window.open(url, "_blank");
              } else {
                onDemo();
              }
            })}
            className="w-full py-2.5 rounded-xl text-[0.8125rem] font-bold text-secondary border border-secondary transition-all duration-300 hover:bg-secondary/10 flex justify-center"
          >
            <EditableText section="products" field="more_info_label" id={product.id} value={product.more_info_label || "More Info"} />
          </button>
          {editor?.isEditMode && (
            <button 
              onClick={(e) => { e.stopPropagation(); editor.onPickLink("products", "contact_url", product.id); }}
              className="absolute -top-3 -right-2 p-1.5 bg-white dark:bg-black rounded-lg shadow-lg border border-border opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 text-blue-500"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
          )}
        </div>

        <div className="flex-1 relative group/btn">
          <button
            {...getNavProps(() => {
              const url = product.demo_url;
              if (url && url.startsWith("http")) {
                window.open(url, "_blank");
              } else {
                onDemo();
              }
            })}
            className="w-full py-2.5 rounded-xl text-[0.8125rem] font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-95 shadow-md flex justify-center group-hover/item:bg-blue-600"
            style={{ background: bg }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <PlayCircle size={15} /> 
              <EditableText section="products" field="demo_label" id={product.id} value={product.demo_label || "Demo"} />
            </span>
          </button>
          {editor?.isEditMode && (
            <button 
              onClick={(e) => { e.stopPropagation(); editor.onPickLink("products", "demo_url", product.id); }}
              className="absolute -top-3 -right-2 p-1.5 bg-white dark:bg-black rounded-lg shadow-lg border border-border opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 text-blue-500"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

const ProductCardList = ({ product, onDemo, cardStyle, getNavProps, onMove, draggedId, onDragStart, onDragOver, onDrop }: { product: Product; onDemo: () => void; cardStyle: "icon" | "image"; getNavProps: any; onMove?: (dir: "up" | "down" | "left" | "right") => void; draggedId?: string | null; onDragStart?: any; onDragOver?: any; onDrop?: any }) => {
  const editor = useLiveEditor();
  const { Icon, bg } = getProductIcon(product.name);

  return (
    <div 
      className={`flex flex-col sm:flex-row gap-5 bg-white dark:bg-[#11111f] rounded-2xl border border-border/50 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.25)] hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group/item relative hover:outline hover:outline-2 hover:outline-secondary/50 ${!product.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === product.id ? "opacity-20 scale-95" : ""}`}
      {...getNavProps(() => {})}
      draggable={editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, product.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, product.id) : undefined}
    >
      <EditorToolbar 
        section="products" 
        id={product.id} 
        isVisible={product.is_visible} 
        imageField="image_url" 
      />
      {editor?.isEditMode && onMove && (
        <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); onMove("up"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Up">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove("down"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Down">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      )}
      {cardStyle === "image" ? (
        <div className="relative sm:w-48 shrink-0 bg-[#f7f8f8] dark:bg-[#0f0f1a] overflow-hidden" style={{ minHeight: 140 }}>
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="sm:w-24 shrink-0 flex items-center justify-center" style={{ background: bg, minHeight: 100 }}>
          <Icon size={32} className="text-white/90" />
        </div>
      )}

      <div className="flex-1 p-4 flex flex-col gap-2">
        {product.is_popular && (
          <span className={`self-start text-[0.625rem] font-bold text-white px-2 py-0.5 rounded-sm ${product.name === "HR-Metrics"
            ? "bg-gradient-to-r from-pink-600 to-rose-700 ring-2 ring-white/30 animate-pulse"
            : "bg-[#CC0C39]"
            }`}>
            {product.name === "HR-Metrics" ? "MOST POPULAR HR" : "Best Seller"}
          </span>
        )}
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-[#007185] dark:text-[#4db8c8]">
          <EditableText section="products" field="tagline" id={product.id} value={product.tagline} />
        </span>
        <h3 className="font-extrabold text-[1.0625rem] text-gray-900 dark:text-white group-hover:text-[#C7511F] dark:group-hover:text-[#4db8c8] transition-colors">
          <EditableText section="products" field="name" id={product.id} value={product.name} />
        </h3>
        <p className="text-[0.8125rem] font-semibold text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
          <EditableText section="products" field="description" id={product.id} value={product.description} />
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-auto pt-2">
          <div className="relative flex flex-col gap-2 mb-4 w-full group/features">
            {editor?.isEditMode && (
              <div className="absolute -top-3 right-0 opacity-0 group-hover/features:opacity-100 transition-opacity flex gap-1 bg-card rounded-md shadow-sm border border-border/50 p-0.5 z-10">
                <button 
                  onClick={() => {
                    const draftKey = product.id ? `products:${product.id}:extra_text` : `products:extra_text`;
                    const current = editor?.pendingChanges[draftKey] ?? product.extra_text;
                    editor.onUpdate("products", "extra_text", current ? `${current}, New Feature` : "New Feature", product.id);
                  }}
                  className="p-1 hover:bg-secondary/10 text-secondary rounded" title="Add Feature"
                >
                  <Plus size={12} />
                </button>
                <button 
                  onClick={() => editor.onPickColor("products", "extra_color", product.id)}
                  className="p-1 hover:bg-secondary/10 text-secondary rounded" title="Pick Features Color"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </button>
              </div>
            )}
            {(() => {
              const draftKey = product.id ? `products:${product.id}:extra_text` : `products:extra_text`;
              const extraText = editor?.pendingChanges[draftKey] ?? product.extra_text;
              const features = extraText ? extraText.split(",") : ["15 Days Free Trial", "Cloud-based SaaS", "24/7 Support", "Custom Onboarding"];
              
              const colorDraftKey = product.id ? `products:${product.id}:extra_color` : `products:extra_color`;
              const extraColor = editor?.pendingChanges[colorDraftKey] ?? product.extra_color;
              const fColors = extraColor ? extraColor.split(",").map(c => c.trim()) : ["#16a34a"];
              const fColorBase = fColors[0] || "#16a34a";

              return features.map((feature, idx) => {
                const rawText = feature.trim();
                if (!rawText) return null;
                const isNegative = rawText.startsWith("!");
                const cleanText = isNegative ? rawText.substring(1).trim() : rawText;
                const fColor = isNegative ? "#ef4444" : fColorBase;

                return (
                  <div key={idx} className="flex items-center gap-2 py-0.5 w-full max-w-sm">
                    <span 
                      style={{ color: fColor }} 
                      className={`text-[0.75rem] font-black tracking-widest uppercase brightness-90 dark:brightness-125 ${editor?.isEditMode ? 'cursor-text hover:outline hover:outline-1 hover:outline-secondary/30 px-1' : ''}`}
                      contentEditable={editor?.isEditMode}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (!editor?.isEditMode) return;
                        const newVal = e.currentTarget.textContent || "";
                        const currentFeatures = extraText ? extraText.split(",").map(s => s.trim()) : ["15 Days Free Trial", "Cloud-based SaaS", "24/7 Support", "Custom Onboarding"];
                        currentFeatures[idx] = isNegative ? `! ${newVal}` : newVal;
                        editor.onUpdate("products", "extra_text", currentFeatures.join(", "), product.id);
                      }}
                    >
                      {cleanText}
                    </span>
                    {editor?.isEditMode && (
                      <button
                        onClick={() => {
                          const currentFeatures = extraText ? extraText.split(",").map(s => s.trim()) : [];
                          currentFeatures.splice(idx, 1);
                          editor.onUpdate("products", "extra_text", currentFeatures.join(", "), product.id);
                        }}
                        className="ml-auto opacity-0 group-hover/badge:opacity-100 p-0.5 text-destructive hover:bg-destructive/10 rounded transition-all"
                        title="Remove Feature"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = product.contact_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else {
                  onDemo();
                }
              }}
              className="py-2.5 px-4 rounded-xl text-[0.8125rem] font-bold text-secondary border border-secondary transition-all duration-300 hover:bg-secondary/10 flex items-center"
            >
              <EditableText section="products" field="more_info_label" id={product.id} value={product.more_info_label || "More Info"} />
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                const url = product.demo_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else {
                  onDemo();
                }
              }}
              className="py-2.5 px-4 rounded-xl text-[0.8125rem] font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-95 shadow-md flex items-center group-hover:bg-blue-600"
              style={{ background: bg }}
            >
              <span className="flex items-center gap-1.5">
                <PlayCircle size={15} /> 
                <EditableText section="products" field="demo_label" id={product.id} value={product.demo_label || "Demo"} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductsSection = () => {
  const globalView = useGlobalView();
  const cardStyle = "image" as const;
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const getNavProps = useLiveEditorNavigation();
  const SPEED = 0.45;
  const GAP = 24;
  const CARD_W = 280;

  const editor = useLiveEditor();
  const { data: dbProducts } = useDbQuery<Product[]>("products",
    editor?.isEditMode ? {} : { is_visible: true },
    { order: "sort_order" }
  );
  
  const [productsState, setProductsState] = useState<Product[]>([]);
  useEffect(() => { if (dbProducts) setProductsState(dbProducts); }, [dbProducts]);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!editor?.isEditMode) return;
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!editor?.isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!editor?.isEditMode || !draggedId || draggedId === targetId) return;

    const sourceIdx = productsState.findIndex(t => t.id === draggedId);
    const targetIdx = productsState.findIndex(t => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newItems = [...productsState];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);

    newItems.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        editor.onUpdate("products", "sort_order", idx, item.id);
      }
    });
    setDraggedId(null);
  };

  const handleMove = async (id: string, direction: "up" | "down" | "left" | "right") => {
    if (!editor?.isEditMode || !productsState) return;
    const idx = productsState.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = -1;
    else if (direction === "down") step = 1;

    const targetIdx = Math.max(0, Math.min(productsState.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newItems = [...productsState];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);
    setProductsState(newItems);

    newItems.forEach((item, i) => {
      if (item.sort_order !== i) {
        editor.onUpdate("products", "sort_order", i, item.id);
      }
    });
  };

  const content = useSiteContent("our_products");

  const products = productsState.length > 0 ? productsState : FALLBACK_PRODUCTS;
  const header = {
    ...DEFAULT_HEADER,
    ...(content.header || {})
  };

  useEffect(() => {
    if (globalView !== "grid" || products.length === 0 || editor?.isEditMode) return;
    const el = trackRef.current;
    if (!el) return;
    const itemW = CARD_W + GAP;
    const totalW = products.length * itemW;
    const animate = () => {
      if (!pausedRef.current) {
        posRef.current += SPEED;
        if (posRef.current >= totalW) posRef.current -= totalW;
        if (el) el.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [products, globalView]);

  const scrollToContact = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });

  if (!dbProducts && !products.length) return null;

  const tripled = [...products, ...products, ...products];

  return (
    <section id="products" className="section-padding relative overflow-hidden bg-background">
      <EditorToolbar section="products" canAdd />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-6 relative group">
          <SectionHeaderToolbar section="our_products" targetSection="products" />
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-secondary font-bold text-sm uppercase tracking-widest">
              <EditableText section="our_products" field="badge" value={header.badge || DEFAULT_HEADER.badge} colorField="badge_color" />
            </span>
          </div>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-0 mb-2">
            <EditableText section="our_products" field="title" value={header.title || DEFAULT_HEADER.title || ""} colorField="title_color" />{" "}
            <span className="gradient-text">
                <EditableText section="our_products" field="highlight" value={header.highlight || DEFAULT_HEADER.highlight || ""} colorField="highlight_color" />
            </span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]">
            <EditableText section="our_products" field="subtitle" value={header.subtitle || DEFAULT_HEADER.subtitle || ""} colorField="subtitle_color" />
          </p>
        </AnimatedSection>



        {globalView === "grid" ? (
          <div
            className={`relative ${editor?.isEditMode ? "overflow-x-auto custom-scrollbar pb-4" : "overflow-hidden"}`}
            style={editor?.isEditMode ? undefined : { maskImage: "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)" }}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
          >
            <div ref={trackRef} className="flex" style={{ gap: GAP, willChange: "transform", paddingBottom: 12, paddingTop: 4, transform: editor?.isEditMode ? 'none' : undefined }}>
              {(editor?.isEditMode ? products : tripled).map((product, i) => (
                <ProductCard key={`${product.id}-${i}`} product={product} onDemo={scrollToContact} cardStyle={cardStyle} getNavProps={getNavProps} onMove={editor?.isEditMode ? (dir) => handleMove(product.id, dir) : undefined} draggedId={draggedId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {products.map((product) => (
              <AnimatedSection key={product.id}>
                <ProductCardList product={product} onDemo={scrollToContact} cardStyle={cardStyle} getNavProps={getNavProps} onMove={editor?.isEditMode ? (dir) => handleMove(product.id, dir) : undefined} draggedId={draggedId} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
              </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            {globalView === "grid" && "Hover over any product to pause · "}
            <button onClick={scrollToContact} className="text-secondary underline underline-offset-2 hover:opacity-80">
              Contact us
            </button>{" "}
            for a personalised demo
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default ProductsSection;
