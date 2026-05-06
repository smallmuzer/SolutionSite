import { useState, useEffect } from "react";
import AnimatedSection from "./AnimatedSection";
import { useGlobalView } from "./ui-customizer-context";
import { ArrowRight, Code2, Database, Smartphone, Globe, Server, Cloud, GitBranch, Layers } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

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

const LOCAL_LOGOS: Record<string, string> = {};

const LogoImg = ({ src, name, size = 24 }: { src: string; name: string; size?: number }) => {
  const [err, setErr] = useState(false);
  if (err) return <Layers size={size * 0.7} className="text-secondary/60" />;
  return (
    <img src={src} alt={name} width={size} height={size}
      className="object-contain" style={{ width: size, height: size }}
      onError={() => setErr(true)} />
  );
};

const TechnologiesSection = () => {
  const view = useGlobalView();
  const editor = useLiveEditor();
  const { data: dbTechs, isLoading } = useDbQuery<Technology[]>("technologies", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order", asc: true });
  const [techs, setTechs] = useState<Technology[]>([]);
  useEffect(() => { if (dbTechs) setTechs(dbTechs); }, [dbTechs]);
  const content = useSiteContent("technologies");
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
    if (!editor?.isEditMode || !draggedId || draggedId === targetId) return;

    const sourceIdx = techs.findIndex(t => t.id === draggedId);
    const targetIdx = techs.findIndex(t => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newTechs = [...techs];
    const [moved] = newTechs.splice(sourceIdx, 1);
    newTechs.splice(targetIdx, 0, moved);

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

  if (isLoading) return (
    <section id="technologies" className="section-padding section-alt relative overflow-hidden">
      <div className="container-wide relative z-10 animate-pulse">
        <div className="text-center mb-12">
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

  if (!techs || techs.length === 0) return null;
  const scrollToContact = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="technologies" className="section-padding section-alt relative overflow-hidden group">
      <SectionHeaderToolbar section="technologies" isVisible={header.is_visible !== false} />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-12 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 mb-4 shadow-sm backdrop-blur-sm">
            <span className="text-secondary font-semibold text-xs uppercase tracking-widest" style={{ color: content.badge_color || undefined }}>
              <EditableText section="technologies" field="badge" value={header.badge || "Our Stack"} colorField="badge_color" />
            </span>
          </div>
          <h2 className="text-4xl sm:text-[2.5rem] lg:text-[3rem] font-heading font-extrabold text-foreground mt-2 mb-5 tracking-tight" style={{ color: content.title_color || undefined }}>
            <EditableText section="technologies" field="title" value={header.title || "Technologies"} colorField="title_color" />{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary" style={{ color: content.highlight_color || undefined, background: content.highlight_color ? "none" : undefined, WebkitTextFillColor: content.highlight_color ? "initial" : undefined }}>
              <EditableText section="technologies" field="highlight" value={header.highlight || "We Use"} colorField="highlight_color" />
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-[1rem] sm:text-[1.05rem] leading-relaxed" style={{ color: content.description_color || undefined }}>
            <EditableText section="technologies" field="description" value={header.description || ""} colorField="description_color" />
          </p>
        </AnimatedSection>

        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {techs.map((tech, i) => {
              const logoSrc = tech.image_url?.trim() || LOCAL_LOGOS[tech.name] || null;
              const nameColor = tech.name_color || "#3178C6";
              const catColor = tech.category_color || nameColor;
              const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
              return (
                <AnimatedSection key={tech.id} delay={i * 0.04}>
                  <div 
                    className={`relative group/item cursor-pointer h-full transition-all ${draggedId === tech.id ? 'opacity-20 scale-95' : ''}`} 
                    {...getNavProps(scrollToContact)}
                    draggable={editor?.isEditMode}
                    onDragStart={(e) => handleDragStart(e, tech.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tech.id)}
                  >
                    <EditorToolbar 
                      section="technologies" id={tech.id} isVisible={tech.is_visible} imageField="image_url" iconField="icon" 
                      className="-top-2.5 -right-2.5 shadow-xl" 
                      canMove={false}
                    />
                    
                    {editor?.isEditMode && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none">
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "up"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Up (Prev Row)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "down"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Down (Next Row)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "left"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Left">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "right"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Right">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>
                    )}

                    <div className="absolute -inset-0.5 rounded-xl blur opacity-0 group-hover/item:opacity-40 transition duration-500" style={{ backgroundColor: nameColor }} />
                    <div className="relative h-full glass-card flex flex-col p-4 gap-2.5 group-hover/item:-translate-y-1 shadow-sm group-hover/item:shadow-md border border-border/40 hover:border-transparent transition-all duration-300 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden hover:outline hover:outline-2 hover:outline-secondary/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center p-1.5 shadow-sm transform group-hover/item:scale-110 transition-transform duration-300 ease-out"
                            style={{ background: `linear-gradient(135deg, ${nameColor}15, ${nameColor}05)`, border: `1px solid ${nameColor}25` }}>
                            {logoSrc ? <LogoImg src={logoSrc} name={tech.name} size={22} /> : <CatIcon size={18} className="text-secondary drop-shadow" />}
                          </div>
                          <h3 className="font-heading font-extrabold text-[1rem] leading-tight group-hover/item:text-shadow-sm transition-colors" style={{ color: nameColor }}>
                            <EditableText section="technologies" field="name" id={tech.id} value={tech.name} />
                          </h3>
                        </div>
                        <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap mt-1"
                          style={{ background: `${catColor}10`, color: catColor, borderColor: `${catColor}30` }}>
                          <EditableText section="technologies" field="category" id={tech.id} value={tech.category} />
                        </span>
                      </div>
                      <p className="text-[0.75rem] text-muted-foreground leading-relaxed line-clamp-3 mt-auto">
                        <EditableText section="technologies" field="description" id={tech.id} value={tech.description} />
                      </p>
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
              const nameColor = tech.name_color || "#3178C6";
              const catColor = tech.category_color || nameColor;
              const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
              return (
                <AnimatedSection key={tech.id} delay={i * 0.03}>
                  <div 
                    className={`relative group/item cursor-pointer transition-all ${draggedId === tech.id ? 'opacity-20 scale-95' : ''} ${!tech.is_visible ? 'opacity-40 grayscale-[0.5]' : ''}`} 
                    {...getNavProps(scrollToContact)}
                    draggable={editor?.isEditMode}
                    onDragStart={(e) => handleDragStart(e, tech.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tech.id)}
                  >
                    <EditorToolbar 
                      section="technologies" id={tech.id} isVisible={tech.is_visible} imageField="image_url" iconField="icon" 
                      className="-top-2 -right-2 shadow-xl" 
                      canMove={false}
                    />
                    
                    {editor?.isEditMode && (
                      <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "up"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Up">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "down"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Down">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "left"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Left">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleMove(tech.id, "right"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Right">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>
                    )}
                    <div className="absolute -inset-[1px] rounded-xl blur-sm opacity-0 group-hover/item:opacity-30 transition duration-500" style={{ backgroundColor: nameColor }} />
                    <div className="relative glass-card flex flex-col xs:flex-row xs:items-center gap-4 xs:gap-5 px-5 py-4 border border-border/40 hover:border-transparent transition-all duration-300 rounded-xl bg-card/60 backdrop-blur-sm shadow-sm group-hover/item:shadow-md">
                      <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center p-2.5 shadow-inner transform group-hover/item:rotate-3 transition-transform duration-300"
                        style={{ background: `linear-gradient(to bottom right, ${nameColor}20, ${nameColor}05)`, border: `1px solid ${nameColor}25` }}>
                        {logoSrc ? <LogoImg src={logoSrc} name={tech.name} size={28} /> : <CatIcon size={24} className="text-secondary" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <div className="sm:w-1/3 flex flex-col gap-1.5 items-start">
                          <h3 className="font-heading font-bold text-[1.1rem]" style={{ color: nameColor }}>
                            <EditableText section="technologies" field="name" id={tech.id} value={tech.name} />
                          </h3>
                          <span className="text-[0.65rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block border whitespace-nowrap"
                            style={{ background: `${catColor}10`, color: catColor, borderColor: `${catColor}25` }}>
                            <EditableText section="technologies" field="category" id={tech.id} value={tech.category} />
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[0.85rem] mt-1 sm:mt-0 flex-1 line-clamp-2 sm:line-clamp-1 leading-relaxed">
                          <EditableText section="technologies" field="description" id={tech.id} value={tech.description} />
                        </p>
                      </div>
                      <div className="hidden xs:flex shrink-0 ml-2 w-8 h-8 rounded-full items-center justify-center bg-secondary/5 group-hover/item:bg-secondary/15 transition-colors border border-transparent group-hover/item:border-secondary/20">
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
