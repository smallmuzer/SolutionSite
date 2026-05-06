import { ArrowUpRight, ArrowRight, Monitor, Globe, Smartphone, Database, Users, BarChart2, Search, Megaphone, Palette as PaletteIcon, Briefcase, Cloud, Shield, Code, Server, Terminal, Cpu, HardDrive, Wifi, Building, ShoppingCart, CreditCard, Truck, HeartHandshake, LineChart, PieChart, Zap, Camera, Video, Printer, BookOpen, Lock, Headphones, Star, Mail, MapPin, Home, Settings, Layers, Phone, FileText } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import type { Tables } from "@/integrations/supabase/types";
import { useGlobalView, useCardStyle } from "./ui-customizer-context";
import { useState, useRef, useEffect } from "react";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

const MobileReadMore = ({ text, clampClass, textClass, section, field, id }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (window.innerWidth >= 640) { setOverflows(false); return; }
      setOverflows(el.scrollHeight > el.clientHeight + 2);
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const t = setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener("resize", check); };
  }, [text]);

  return (
    <div>
      <p ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
            <EditableText section={section} field={field} value={text} />
        ) : text}
      </p>
      {overflows && !expanded && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
          className="sm:hidden text-secondary text-[0.6875rem] font-bold mt-0.5 hover:underline block">
          Read more
        </button>
      )}
      {expanded && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
          className="sm:hidden text-secondary text-[0.6875rem] font-bold mt-0.5 hover:underline block">
          Show less
        </button>
      )}
    </div>
  );
};

type Service = Tables<"services">;

const SERVICE_THEMES: Record<string, { img: string; accent: string }> = {
  default: { img: "", accent: "from-blue-700/70 to-indigo-900/85" },
  software: { img: "", accent: "from-violet-700/70 to-purple-900/85" },
  mobile: { img: "", accent: "from-emerald-700/70 to-teal-900/85" },
  cloud: { img: "", accent: "from-sky-700/70 to-blue-900/85" },
  database: { img: "", accent: "from-amber-700/70 to-orange-900/85" },
  security: { img: "", accent: "from-rose-700/70 to-red-900/85" },
};

const ICON_MAP: Record<string, React.ElementType> = {
  Monitor, Globe, Smartphone, Database, Users, BarChart2, Search,
  Megaphone, PaletteIcon, Palette: PaletteIcon, Briefcase, Cloud, Shield, Code,
  Server, Terminal, Cpu, HardDrive, Wifi, Building, ShoppingCart,
  CreditCard, Truck, HeartHandshake, LineChart, PieChart, Zap,
  Camera, Video, Printer, BookOpen, Lock, Headphones, Star, Mail,
  MapPin, Home, Settings, Layers, Phone, FileText,
  BarChart: BarChart2,
};

function getTheme(service: Service) {
  const t = service.title.toLowerCase();
  let theme = SERVICE_THEMES.default;
  for (const key of Object.keys(SERVICE_THEMES)) {
    if (key !== "default" && t.includes(key)) { theme = SERVICE_THEMES[key]; break; }
  }
  const img = (service.image_url && service.image_url.trim()) ? service.image_url.trim() : "";
  return { img, accent: theme.accent };
}

function isHtmlIcon(icon: string): boolean {
  return !!icon && (icon.trim().startsWith("<") || icon.includes("class="));
}

function getIcon(service: Service): React.ElementType {
  if (service.icon && !isHtmlIcon(service.icon) && ICON_MAP[service.icon]) return ICON_MAP[service.icon];
  const t = service.title.toLowerCase();
  if (t.includes("web")) return Globe;
  if (t.includes("mobile")) return Smartphone;
  if (t.includes("erp")) return Database;
  if (t.includes("hr")) return Users;
  if (t.includes("consulting")) return Briefcase;
  if (t.includes("seo") || t.includes("marketing")) return Search;
  if (t.includes("design")) return PaletteIcon;
  if (t.includes("cloud")) return Cloud;
  if (t.includes("security")) return Shield;
  return Monitor;
}

const ServicesSection = () => {
  const cardStyle = useCardStyle();
  const view = useGlobalView();
  const editor = useLiveEditor();
  const content = useSiteContent("services");
  const getNavProps = useLiveEditorNavigation();
  const scrollTo = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });

  const { data: dbServices, isLoading } = useDbQuery<Service[]>("services",
    {}, // Load all for live editor unhiding
    { order: "sort_order" }
  );

  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => { if (dbServices) setServices(dbServices); }, [dbServices]);

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

    const sourceIdx = services.findIndex(t => t.id === draggedId);
    const targetIdx = services.findIndex(t => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newItems = [...services];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);

    newItems.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        editor.onUpdate("services", "sort_order", idx, item.id);
      }
    });
    setDraggedId(null);
  };

  const handleMove = async (id: string, direction: "up" | "down" | "left" | "right") => {
    if (!editor?.isEditMode || !services) return;
    const idx = services.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = view === "grid" ? -3 : -1;
    else if (direction === "down") step = view === "grid" ? 3 : 1;

    const targetIdx = Math.max(0, Math.min(services.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newItems = [...services];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);
    setServices(newItems);

    newItems.forEach((item, i) => {
      if (item.sort_order !== i) {
        editor.onUpdate("services", "sort_order", i, item.id);
      }
    });
  };

  if (isLoading) return (
    <section id="services" className="section-padding section-alt relative overflow-hidden">
      <div className="container-wide relative z-10 animate-pulse">
        <div className="text-center mb-8">
          <div className="h-4 w-24 bg-muted/60 mx-auto rounded mb-3" />
          <div className="h-10 w-64 bg-muted mx-auto rounded mb-4" />
          <div className="h-4 w-96 bg-muted/60 mx-auto rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 bg-muted/40 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );

  if (!services || services.length === 0) return null;

  return (
    <section id="services" className="section-padding section-alt relative overflow-hidden group/services">
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-10 relative group">
          <SectionHeaderToolbar section="services" />
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-secondary font-bold text-sm uppercase tracking-widest" style={{ color: content.badge_color || undefined }}>
              <EditableText section="services" field="badge" value="What We Do" colorField="badge_color" />
            </span>
          </div>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-0 mb-2" style={{ color: content.title_color || undefined }}>
            <EditableText section="services" field="title" value={content.title || "Solutions"} colorField="title_color" />{" "}
            <span className="gradient-text" style={{ color: content.highlight_color || undefined, background: content.highlight_color ? "none" : undefined, WebkitTextFillColor: content.highlight_color ? "initial" : undefined }}>
                <EditableText section="services" field="highlight" value={content.highlight || "We Deliver"} colorField="highlight_color" />
            </span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]" style={{ color: content.subtitle_color || undefined }}>
            <EditableText section="services" field="subtitle" value={content.subtitle || ""} colorField="subtitle_color" />
          </p>
        </AnimatedSection>


        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {services.filter(s => s.is_visible || editor?.isEditMode).map((service, i) => {
              const theme = getTheme(service);
              const Icon = getIcon(service);
              const useImg = cardStyle === "image";
              const htmlIcon = service.icon && isHtmlIcon(service.icon);
              return (
                <AnimatedSection key={service.id} delay={i * 0.05}>
                  <div
                    className={`glass-card flex flex-col relative rounded-xl overflow-hidden group/item cursor-pointer border border-border/40 hover:glow-effect transition-all duration-300 hover:outline hover:outline-2 hover:outline-secondary/50 ${!service.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === service.id ? "opacity-20 scale-95" : ""}`}
                    style={{ minHeight: useImg ? "190px" : "120px" }}
                    {...getNavProps(scrollTo)}
                    draggable={editor?.isEditMode}
                    onDragStart={(e) => handleDragStart(e, service.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, service.id)}
                  >
                    <EditorToolbar section="services" id={service.id} isVisible={service.is_visible} imageField="image_url" iconField="icon" />
                    
                    {editor?.isEditMode && (
                      <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                        <button onClick={(e) => { e.stopPropagation(); handleMove(service.id, "left"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Left">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(service.id, "right"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Right">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>
                    )}
                    {useImg ? (
                      <>
                        <div className="relative h-[110px] w-full overflow-hidden shrink-0">
                          <img
                            src={theme.img}
                            alt={service.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/uploads/softwaredevelopemnt_1775027454431.jpg"; }}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent`} />
                          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                            <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <ArrowUpRight size={10} className="text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="relative flex-1 w-full px-3 pt-2.5 pb-4 flex flex-col bg-card dark:bg-card/40 z-10 border-t border-border/50">
                          <h3 className="font-heading font-extrabold text-[0.9375rem] text-foreground mb-0.5 leading-snug group-hover:text-secondary transition-colors line-clamp-1">
                            <EditableText section="services" field="title" id={service.id} value={service.title} />
                          </h3>
                          <MobileReadMore
                            section="services"
                            field="description"
                            id={service.id}
                            text={service.description}
                            clampClass="line-clamp-2"
                            textClass="text-[0.75rem] text-muted-foreground leading-snug"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="relative flex-1 w-full px-3 pt-2.5 pb-4 flex flex-col justify-end bg-card dark:bg-card/20">
                        {htmlIcon
                          ? <span className="text-secondary text-[1.4rem] mb-1.5" dangerouslySetInnerHTML={{ __html: service.icon! }} />
                          : <Icon size={20} className="text-secondary mb-1.5" />
                        }
                        <h3 className="font-heading font-extrabold text-[0.875rem] text-foreground mb-0.5 leading-snug group-hover:text-secondary transition-colors line-clamp-1">
                          <EditableText section="services" field="title" id={service.id} value={service.title} />
                        </h3>
                        <MobileReadMore
                          section="services"
                          field="description"
                          id={service.id}
                          text={service.description}
                          clampClass="line-clamp-2"
                          textClass="text-[0.75rem] text-muted-foreground leading-snug"
                        />
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
            {services.filter(s => s.is_visible || editor?.isEditMode).map((service, i) => {
              const theme = getTheme(service);
              const Icon = getIcon(service);
              const useImg = cardStyle === "image";
              const htmlIcon = service.icon && isHtmlIcon(service.icon);
              return (
                <AnimatedSection key={service.id} delay={i * 0.03}>
                    <div
                      className={`glass-card flex items-center gap-4 p-4 group/item hover:glow-effect transition-all duration-300 cursor-pointer relative overflow-hidden ${!service.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === service.id ? "opacity-20 scale-95" : ""}`}
                      {...getNavProps(scrollTo)}
                      draggable={editor?.isEditMode}
                      onDragStart={(e) => handleDragStart(e, service.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, service.id)}
                    >
                      <EditorToolbar section="services" id={service.id} isVisible={service.is_visible} imageField="image_url" iconField="icon" />
                      {editor?.isEditMode && (
                        <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                          <button onClick={(e) => { e.stopPropagation(); handleMove(service.id, "up"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Up">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleMove(service.id, "down"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Down">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                        </div>
                      )}
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/[0.03] to-transparent group-hover:from-secondary/[0.07] transition-all pointer-events-none rounded-xl" />
                    <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                      {useImg ? (
                        <>
                          <img
                            src={theme.img}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/uploads/softwaredevelopemnt_1775027454431.jpg"; }}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent} opacity-70`} />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
                          {htmlIcon
                            ? <span className="text-secondary text-xl" dangerouslySetInnerHTML={{ __html: service.icon! }} />
                            : <Icon size={22} className="text-secondary" />
                          }
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <h3 className="font-heading font-bold text-foreground text-[0.9375rem] leading-snug">
                        <EditableText section="services" field="title" id={service.id} value={service.title} />
                      </h3>
                      <p className="text-muted-foreground text-[0.8125rem] mt-0.5 line-clamp-1">
                        <EditableText section="services" field="description" id={service.id} value={service.description} />
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all shrink-0 relative z-10" />
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesSection;
