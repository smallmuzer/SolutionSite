import { useState, useEffect, useRef } from "react";
import AnimatedSection from "./AnimatedSection";
import { useGlobalView } from "./ui-customizer-context";
import { ArrowRight, Code2, Database, Smartphone, Globe, Server, Cloud, GitBranch, Layers } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation, hasEmbeddedColor } from "./admin/LiveEditorContext";

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Frontend: Globe,
  Backend: Server,
  Mobile: Smartphone,
  Database: Database,
  DevOps: GitBranch,
  Cloud: Cloud,
  Language: Code2,
  General: Layers,
};

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: "#f43f5e", // Rose/Red
  Backend: "#10b981",  // Emerald
  Mobile: "#0ea5e9",   // Sky Blue
  Database: "#f59e0b", // Amber
  DevOps: "#8b5cf6",   // Violet
  Cloud: "#3b82f6",    // Blue
  Language: "#6366f1", // Indigo
  General: "#64748b",  // Slate
};

const LOCAL_LOGOS: Record<string, string> = {};

const extractColor = (htmlStr: string | null | undefined, fallback: string) => {
  if (!htmlStr) return fallback;
  const match = htmlStr.match(/color:\s*([^;>"']+)/i);
  return match ? match[1].trim() : fallback;
};

const LogoImg = ({ src, name, className }: { src: string; name: string; className?: string }) => {
  const [err, setErr] = useState(false);
  if (err) return <Layers className={`text-secondary/60 ${className}`} />;
  return (
    <img src={src} alt={name}
      className={`object-contain mix-blend-multiply dark:mix-blend-normal ${className || "w-full h-full"}`}
      onError={() => setErr(true)} />
  );
};

const ReadMoreText = ({ text, clampClass, textClass, section, field, id, onExpand }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string; onExpand?: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (!expanded) {
        setOverflows(el.scrollHeight > el.clientHeight + 6);
      }
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const t = setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener("resize", check); };
  }, [text, expanded]);

  return (
    <div className="relative">
      <div ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
          <EditableText section={section} field={field} id={id} value={text} />
        ) : text}
      </div>
      {(overflows || expanded) && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); onExpand?.(); }}
          className="text-[0.6875rem] font-bold text-secondary mt-1 hover:underline underline-offset-2"
        >
          Read {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
};

const TechnologiesSection = () => {
  const view = useGlobalView();
  const editor = useLiveEditor();
  const { data: dbTechs, isLoading } = useDbQuery<Technology[]>("technologies", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order", asc: true });
  const [techs, setTechs] = useState<Technology[]>([]);
  useEffect(() => { if (dbTechs) setTechs(dbTechs); }, [dbTechs]);
  const content = useSiteContent("technologies");

  // Mobile slideshow state — hooks must be called unconditionally
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePage, setMobilePage] = useState(0);
  const userInteractedRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  // Hook must be called unconditionally — before any early returns
  const getNavProps = useLiveEditorNavigation();
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
    if (!editor?.isEditMode || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const sourceIdx = techs.findIndex(t => t.id === draggedId);
    const targetIdx = techs.findIndex(t => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newTechs = [...techs];
    const [moved] = newTechs.splice(sourceIdx, 1);
    newTechs.splice(targetIdx, 0, moved);
    setTechs(newTechs);

    // Update all sort_orders
    newTechs.forEach((tech, idx) => {
      if (tech.sort_order !== idx) {
        editor.onUpdate("technologies", "sort_order", idx, tech.id);
      }
    });

    setDraggedId(null);
  };

  const handleMove = async (id: string, direction: "up" | "down" | "left" | "right") => {
    if (!editor?.isEditMode || !techs) return;
    const idx = techs.findIndex(t => t.id === id);
    if (idx === -1) return;

    // Determine step: Left/Right = 1, Top/Bottom = approx one row (5)
    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = -5;
    else if (direction === "down") step = 5;

    const targetIdx = Math.max(0, Math.min(techs.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newTechs = [...techs];
    const [moved] = newTechs.splice(idx, 1);
    newTechs.splice(targetIdx, 0, moved);
    setTechs(newTechs);

    newTechs.forEach((tech, i) => {
      if (tech.sort_order !== i) {
        editor.onUpdate("technologies", "sort_order", i, tech.id);
      }
    });
  };

  const header = {
    badge: content.badge || "Our Stack",
    title: content.title || "Technologies",
    highlight: content.highlight || "We Use",
    description: content.description || "cutting-edge technologies..."
  };

  // Mobile pagination — 5 cards per page
  const mobileCardsPerPage = 6;
  const mobileTotalPages = Math.max(1, Math.ceil(techs.length / mobileCardsPerPage));
  const mobileTechs = techs.slice(mobilePage * mobileCardsPerPage, (mobilePage + 1) * mobileCardsPerPage);

  const goToMobilePage = (page: number, interaction = false) => {
    if (interaction) userInteractedRef.current = true;
    setMobilePage(((page % mobileTotalPages) + mobileTotalPages) % mobileTotalPages);
  };

  useEffect(() => {
    if (!isMobile || editor?.isEditMode || mobileTotalPages <= 1) return;
    const interval = setInterval(() => {
      if (!userInteractedRef.current && !pausedRef.current) {
        setMobilePage(prev => (prev + 1) % mobileTotalPages);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isMobile, editor?.isEditMode, mobileTotalPages]);

  if (!editor?.isEditMode && content?.is_visible === false) return null;

  if (isLoading) return (
    <section id="technologies" className="section-padding section-alt relative overflow-hidden">
      <div className="container-wide relative z-10 animate-pulse">
        <div className="text-center mb-6">
          <div className="h-6 w-32 bg-secondary/20 mx-auto rounded-full mb-4" />
          <div className="h-12 w-3/4 max-w-sm bg-muted mx-auto rounded-lg mb-5" />
          <div className="h-5 w-2/3 max-w-lg bg-muted/60 mx-auto rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div key={i} className="h-28 bg-muted/30 border border-muted/50 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );

  // Always render the section so the header is visible, even if empty.
  const scrollToContact = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="technologies" className="section-padding section-alt relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 mb-4 shadow-sm backdrop-blur-sm">
            <span className="text-secondary font-semibold text-xs uppercase tracking-widest" style={{ color: hasEmbeddedColor(content.badge) ? undefined : (content.badge_color || undefined) }}>
              <EditableText section="technologies" field="badge" value={header.badge || "Our Stack"} colorField="badge_color" />
            </span>
          </div>
          <h2 className="text-4xl sm:text-[2.5rem] lg:text-[3rem] font-heading font-bold text-foreground mt-1 mb-2 tracking-tight relative" style={{ color: hasEmbeddedColor(content.title) ? undefined : (content.title_color || undefined) }}>
            <span>
              <EditableText section="technologies" field="title" value={header.title || "Technologies"} colorField="title_color" />{" "}
              <span className="gradient-text" style={{ color: hasEmbeddedColor(content.highlight) ? undefined : (content.highlight_color || undefined), background: content.highlight_color && !hasEmbeddedColor(content.highlight) ? "none" : undefined, WebkitTextFillColor: content.highlight_color && !hasEmbeddedColor(content.highlight) ? "initial" : undefined }}>
                <EditableText section="technologies" field="highlight" value={header.highlight || "We Use"} colorField="highlight_color" />
              </span>
            </span>
            <SectionHeaderToolbar section="technologies" isVisible={content.is_visible !== false} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
          </h2>
          <div className="text-muted-foreground max-w-2xl mx-auto text-[1rem] sm:text-[1.05rem] leading-relaxed" style={{ color: hasEmbeddedColor(content.description) ? undefined : (content.description_color || undefined) }}>
            <EditableText section="technologies" field="description" value={header.description || ""} colorField="description_color" />
          </div>
        </AnimatedSection>

        {!techs || techs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/5">
            <p className="text-sm">No technologies added yet.</p>
            {editor?.isEditMode && <p className="text-xs mt-1">Add technologies from the Admin Dashboard.</p>}
          </div>
        ) : isMobile && !editor?.isEditMode ? (
          <div
            className="flex flex-col gap-4 mx-auto w-full overflow-hidden"
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
            onTouchStart={() => { pausedRef.current = true; }}
            onTouchEnd={() => { pausedRef.current = false; }}
          >
            <div 
              className="flex items-start transition-transform duration-500 ease-in-out w-full"
              style={{ transform: `translateX(-${mobilePage * 100}%)` }}
            >
              {Array.from({ length: mobileTotalPages }).map((_, pageIdx) => (
                <div key={pageIdx} className="w-full flex-shrink-0 grid grid-cols-2 gap-3 px-1">
                  {techs.slice(pageIdx * mobileCardsPerPage, (pageIdx + 1) * mobileCardsPerPage).map((tech) => {
                const logoSrc = tech.image_url?.trim() || LOCAL_LOGOS[tech.name] || null;
                const rawNameColor = tech.name_color || "#3178C6";
                const nameColor = extractColor(tech.name, rawNameColor);
                const catColor = extractColor(tech.category, tech.category_color || nameColor);
                const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
                return (
                  <div key={tech.id}
                    className="relative group/item cursor-pointer transition-all h-full"
                    {...getNavProps(scrollToContact)}
                  >
                    <div className="absolute -inset-0.5 rounded-xl blur opacity-0 group-hover/item:opacity-40 transition duration-500" style={{ backgroundColor: nameColor }} />
                    <div
                      className="relative h-full glass-card flex flex-col p-3 gap-2.5 border border-border/40 hover:border-transparent transition-all duration-300 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-sm group-hover/item:shadow-md"
                      style={{ ['--card-color' as string]: nameColor }}
                    >
                      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" style={{ outline: `2px solid color-mix(in srgb, ${nameColor} 50%, transparent)`, outlineOffset: '-1px', backgroundColor: `color-mix(in srgb, ${nameColor} 8%, transparent)` }} />
                      
                      <div className="flex flex-row items-center gap-2.5 min-w-0 relative z-[1]">
                        <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center p-1.5 shadow-sm relative z-[1]"
                          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${nameColor} 15%, transparent), color-mix(in srgb, ${nameColor} 5%, transparent))`, border: `1px solid color-mix(in srgb, ${nameColor} 25%, transparent)` }}>
                          {logoSrc ? <LogoImg src={logoSrc} name={tech.name} className="w-full h-full drop-shadow-sm" /> : <CatIcon size={18} className="text-secondary drop-shadow" />}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <h3 className="font-heading font-bold text-[0.8rem] leading-tight min-w-0 break-words" style={{ color: nameColor, fontWeight: 700 }}>
                            <EditableText section="technologies" field="name" id={tech.id} value={tech.name} />
                          </h3>
                          <span className="w-fit text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap"
                            style={{ background: `color-mix(in srgb, ${catColor} 15%, transparent)`, color: catColor, borderColor: `color-mix(in srgb, ${catColor} 40%, transparent)` }}>
                            <EditableText section="technologies" field="category" id={tech.id} value={tech.category} />
                          </span>
                        </div>
                      </div>

                      <div className="relative z-[1] w-full">
                        <ReadMoreText
                          text={tech.description}
                          clampClass="line-clamp-2"
                          textClass="text-[0.65rem] text-muted-foreground leading-relaxed"
                          section="technologies"
                          field="description"
                          id={tech.id}
                          onExpand={() => { userInteractedRef.current = true; }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
                </div>
              ))}
            </div>
            {mobileTotalPages > 1 && (
              <div className="flex items-center justify-center gap-5 mt-2">
                <button onClick={() => goToMobilePage(mobilePage - 1, true)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 transition-all text-foreground shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: mobileTotalPages }).map((_, i) => (
                    <button key={i} onClick={() => goToMobilePage(i, true)} className={`h-1.5 rounded-full transition-all ${i === mobilePage ? "w-6 bg-secondary" : "w-1.5 bg-muted-foreground/30"}`} />
                  ))}
                </div>
                <button onClick={() => goToMobilePage(mobilePage + 1, true)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 transition-all text-foreground shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="flex flex-wrap justify-center gap-4">
            {techs.map((tech, i) => {
              const logoSrc = tech.image_url?.trim() || LOCAL_LOGOS[tech.name] || null;
              const rawNameColor = tech.name_color || "#3178C6";
              const nameColor = extractColor(tech.name, rawNameColor);
              const catColor = extractColor(tech.category, tech.category_color || nameColor);
              const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
              return (
                <AnimatedSection key={tech.id} delay={i * 0.04} className="w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-10.66px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-12.8px)]">
                  <div
                    className={`relative group/item cursor-pointer h-full transition-all ${draggedId === tech.id ? 'opacity-20 scale-95' : ''} ${!tech.is_visible ? 'opacity-40 grayscale-[0.5]' : ''}`}
                    {...getNavProps(scrollToContact)}
                    draggable={editor?.isEditMode}
                    onDragStart={(e) => handleDragStart(e, tech.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tech.id)}
                  >
                    <EditorToolbar
                      section="technologies" id={tech.id} isVisible={tech.is_visible} imageField="image_url" iconField="icon"
                      className="-top-2.5 -right-2.5 shadow-xl"
                      canMove={false}
                    />

                    {editor?.isEditMode && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none">
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "up"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Up (Prev Row)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "down"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Down (Next Row)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "left"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Left">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "right"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Right">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      </div>
                    )}

                    <div className="absolute -inset-0.5 rounded-xl blur opacity-0 group-hover/item:opacity-40 transition duration-500" style={{ backgroundColor: nameColor }} />
                    <div
                      className={`relative h-full glass-card flex flex-col p-4 ${editor?.isEditMode ? "pb-11" : ""} gap-2.5 group-hover/item:-translate-y-1 shadow-sm group-hover/item:shadow-md border border-border/40 hover:border-transparent transition-all duration-300 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden`}
                      style={{ ['--card-color' as string]: nameColor }}
                    >
                      {/* Dynamic hover outline + background tint */}
                      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" style={{ outline: `2px solid color-mix(in srgb, ${nameColor} 50%, transparent)`, outlineOffset: '-1px', backgroundColor: `color-mix(in srgb, ${nameColor} 8%, transparent)` }} />
                      <div className="flex flex-row items-center justify-between gap-2 min-w-0 relative z-[1]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center p-1.5 shadow-sm transform group-hover/item:scale-110 transition-transform duration-300 ease-out"
                            style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${nameColor} 15%, transparent), color-mix(in srgb, ${nameColor} 5%, transparent))`, border: `1px solid color-mix(in srgb, ${nameColor} 25%, transparent)` }}>
                            {logoSrc ? <LogoImg src={logoSrc} name={tech.name} className="w-full h-full drop-shadow-sm" /> : <CatIcon size={18} className="text-secondary drop-shadow" />}
                          </div>
                          <h3 className="font-heading font-bold text-[1rem] leading-tight group-hover/item:text-shadow-sm transition-colors min-w-0 break-words" style={{ color: nameColor, fontWeight: 700 }}>
                            <EditableText section="technologies" field="name" id={tech.id} value={tech.name} />
                          </h3>
                        </div>
                        <span className="w-fit shrink-0 text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap"
                          style={{ background: `color-mix(in srgb, ${catColor} 15%, transparent)`, color: catColor, borderColor: `color-mix(in srgb, ${catColor} 40%, transparent)` }}>
                          <EditableText section="technologies" field="category" id={tech.id} value={tech.category} />
                        </span>
                      </div>
                      <div className="relative z-[1] w-full mt-auto">
                        <ReadMoreText
                          text={tech.description}
                          clampClass="line-clamp-3"
                          textClass="text-[0.75rem] text-muted-foreground leading-relaxed"
                          section="technologies"
                          field="description"
                          id={tech.id}
                        />
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-4xl mx-auto">
            {techs.map((tech, i) => {
              const logoSrc = tech.image_url?.trim() || LOCAL_LOGOS[tech.name] || null;
              const rawNameColor = tech.name_color || "#3178C6";
              const nameColor = extractColor(tech.name, rawNameColor);
              const catColor = extractColor(tech.category, tech.category_color || nameColor);
              const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
              return (
                <AnimatedSection key={tech.id} delay={i * 0.03}>
                  <div
                    className={`relative group/item cursor-pointer transition-all ${draggedId === tech.id ? 'opacity-20 scale-95' : ''} ${!tech.is_visible ? 'opacity-40 grayscale-[0.5]' : ''}`}
                    {...getNavProps(scrollToContact)}
                    draggable={editor?.isEditMode}
                    onDragStart={(e) => handleDragStart(e, tech.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tech.id)}
                  >
                    <EditorToolbar
                      section="technologies" id={tech.id} isVisible={tech.is_visible} imageField="image_url" iconField="icon"
                      className="-top-2 -right-2 shadow-xl"
                      canMove={false}
                    />

                    {editor?.isEditMode && (
                      <div className="absolute bottom-4 sm:bottom-5 right-2 sm:right-4 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "up"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Up">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "down"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Down">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "left"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Left">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "right"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Right">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      </div>
                    )}
                    <div className="absolute -inset-[1px] rounded-xl blur-sm opacity-0 group-hover/item:opacity-30 transition duration-500" style={{ backgroundColor: nameColor }} />
                    <div className={`relative glass-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-4 sm:px-5 py-4 ${editor?.isEditMode ? "pb-11 sm:pb-4 sm:pr-32" : ""} border border-border/40 hover:border-transparent transition-all duration-300 rounded-xl bg-card/60 backdrop-blur-sm shadow-sm group-hover/item:shadow-md overflow-hidden`}>
                      {/* Dynamic hover outline + background tint */}
                      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" style={{ outline: `2px solid color-mix(in srgb, ${nameColor} 50%, transparent)`, outlineOffset: '-1px', backgroundColor: `color-mix(in srgb, ${nameColor} 8%, transparent)` }} />
                      <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center p-2.5 shadow-inner transform group-hover/item:rotate-3 transition-transform duration-300 relative z-[1]"
                        style={{ background: `linear-gradient(to bottom right, color-mix(in srgb, ${nameColor} 20%, transparent), color-mix(in srgb, ${nameColor} 5%, transparent))`, border: `1px solid color-mix(in srgb, ${nameColor} 25%, transparent)` }}>
                        {logoSrc ? <LogoImg src={logoSrc} name={tech.name} className="w-full h-full drop-shadow-sm" /> : <CatIcon size={24} className="text-secondary" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 relative z-[1]">
                        <div className="sm:w-1/3 min-w-0 flex flex-col gap-1.5 items-start">
                          <h3 className="font-heading font-bold text-[1.05rem] sm:text-[1.1rem] min-w-0 break-words" style={{ color: nameColor, fontWeight: 700 }}>
                            <EditableText section="technologies" field="name" id={tech.id} value={tech.name} />
                          </h3>
                          <span className="w-fit text-[0.65rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block border whitespace-nowrap"
                            style={{ background: `color-mix(in srgb, ${catColor} 15%, transparent)`, color: catColor, borderColor: `color-mix(in srgb, ${catColor} 40%, transparent)` }}>
                            <EditableText section="technologies" field="category" id={tech.id} value={tech.category} />
                          </span>
                        </div>
                        <div className="relative z-[1] flex-1 mt-1 sm:mt-0 w-full">
                          <ReadMoreText
                            text={tech.description}
                            clampClass="line-clamp-2 sm:line-clamp-1"
                            textClass="text-[0.85rem] text-muted-foreground leading-relaxed"
                            section="technologies"
                            field="description"
                            id={tech.id}
                          />
                        </div>
                      </div>
                      <div className="hidden sm:flex shrink-0 ml-2 w-8 h-8 rounded-full items-center justify-center transition-colors border border-transparent relative z-[1]" style={{ backgroundColor: `color-mix(in srgb, ${nameColor} 8%, transparent)` }}>
                        <ArrowRight size={16} className="text-secondary/70 group-hover/item:text-secondary group-hover/item:translate-x-0.5 transition-all" />
                      </div>
                    </div>
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

export default TechnologiesSection;
