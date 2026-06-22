import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";
import { ArrowUpRight, ArrowRight, Target, Users, Award, Globe } from "lucide-react";
import { useCardStyle, useGlobalView } from "./ui-customizer-context";
import * as LucideIcons from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditorNavigation, useLiveEditor, hasEmbeddedColor } from "./admin/LiveEditorContext";

function isHtmlIcon(icon: string): boolean {
  return !!icon && (icon.trim().startsWith("<") || icon.includes("class="));
}

const MobileReadMore = ({ text, clampClass, textClass, section, field }: { text: string; clampClass: string; textClass: string; section?: string; field?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (window.innerWidth >= 640) { setOverflows(false); return; }
      setOverflows(el.scrollHeight > el.clientHeight + 6);
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const t = setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener("resize", check); };
  }, [text]);
  return (
    <div>
      <div ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
          <EditableText section={section} field={field} value={text} />
        ) : text}
      </div>
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

const initialCardData = [
  { title: "Our Mission", key: "card_mission", imgKey: "card_mission_image", fallback: "", accent: "from-blue-600/65 to-indigo-900/80", Icon: Target, desc: "To deliver cutting-edge software solutions that empower businesses to thrive in the digital age." },
  { title: "Our Team", key: "card_team", imgKey: "card_team_image", fallback: "", accent: "from-violet-600/65 to-purple-900/80", Icon: Users, desc: "A dedicated team of experts committed to excellence, innovation, and client success." },
  { title: "Quality First", key: "card_quality", imgKey: "card_quality_image", fallback: "", accent: "from-cyan-600/65 to-blue-900/80", Icon: Award, desc: "Uncompromising standards ensuring robust, scalable, and secure applications." },
  { title: "Global Reach", key: "card_global", imgKey: "card_global_image", fallback: "", accent: "from-emerald-600/65 to-teal-900/80", Icon: Globe, desc: "Serving clients worldwide with world-class technology services and unparalleled support." },
];

const AboutSection = () => {
  const content = useSiteContent("about");
  const cardStyle = useCardStyle();
  const view = useGlobalView();
  const getNavProps = useLiveEditorNavigation();
  const useImg = cardStyle === "image";
  const editor = useLiveEditor();

  const resolveImg = (imgKey: string) => {
    const v = editor?.pendingChanges[`about:${imgKey}`] ?? content[imgKey];
    return v && v.trim() ? v.trim() : "";
  };

  const [cardsState, setCardsState] = useState(initialCardData);

  useEffect(() => {
    const orderStr = content.card_order;
    if (orderStr) {
      try {
        const orderArr = JSON.parse(orderStr);
        if (Array.isArray(orderArr) && orderArr.length === initialCardData.length) {
          const reordered = orderArr.map((k: string) => initialCardData.find(c => c.key === k)).filter(Boolean);
          if (reordered.length === initialCardData.length) {
            setCardsState(reordered as typeof initialCardData);
            return;
          }
        }
      } catch (e) { /* ignore */ }
    }
    setCardsState(initialCardData);
  }, [content.card_order]);

  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, key: string) => {
    if (!editor?.isEditMode) return;
    setDraggedKey(key);
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!editor?.isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const saveOrder = (newItems: typeof initialCardData) => {
    const orderKeys = newItems.map(c => c.key);
    editor?.onUpdate("about", "card_order", JSON.stringify(orderKeys));
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!editor?.isEditMode || !draggedKey || draggedKey === targetKey) {
      setDraggedKey(null);
      return;
    }

    const sourceIdx = cardsState.findIndex(c => c.key === draggedKey);
    const targetIdx = cardsState.findIndex(c => c.key === targetKey);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newItems = [...cardsState];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);

    setCardsState(newItems);
    saveOrder(newItems);
    setDraggedKey(null);
  };

  const handleMove = (key: string, direction: "up" | "down" | "left" | "right") => {
    if (!editor?.isEditMode) return;
    const idx = cardsState.findIndex(c => c.key === key);
    if (idx === -1) return;

    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = view === "grid" ? -2 : -1;
    else if (direction === "down") step = view === "grid" ? 2 : 1;

    const targetIdx = Math.max(0, Math.min(cardsState.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newItems = [...cardsState];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);

    setCardsState(newItems);
    saveOrder(newItems);
  };

  const cardData = cardsState;

  if (!editor?.isEditMode && content?.is_visible === false) return null;

  return (
    <section id="about" className="section-padding relative overflow-hidden group">
      <div className="container-wide max-w-[1400px] 2xl:max-w-[1500px] relative z-10">
        <div className="flex flex-col gap-0">
          {/* Top Row: Text and Main Image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-4 items-center">
            {/* Left: text — live from DB */}
            <div className="relative z-10">
              <AnimatedSection>
                <span className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: hasEmbeddedColor(content.badge) ? undefined : (content.badge_color || undefined) }}>
                  <EditableText section="about" field="badge" value={content.badge || "Who We Are"} colorField="badge_color" />
                </span>
                <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-2 mb-10 relative" style={{ color: hasEmbeddedColor(content.title) ? undefined : (content.title_color || undefined) }}>
                  <span>
                    <EditableText section="about" field="title" value={content.title || "Driving Digital "} colorField="title_color" />{" "}
                    {(content.highlight !== undefined ? content.highlight : "Transformation") && (
                      <span className="gradient-text" style={{ color: hasEmbeddedColor(content.highlight) ? undefined : (content.highlight_color || undefined), background: content.highlight_color && !hasEmbeddedColor(content.highlight) ? "none" : undefined, WebkitTextFillColor: content.highlight_color && !hasEmbeddedColor(content.highlight) ? "initial" : undefined }}>
                        <EditableText section="about" field="highlight" value={content.highlight !== undefined ? content.highlight : "Transformation"} colorField="highlight_color" />
                      </span>
                    )}
                  </span>
                  <SectionHeaderToolbar section="about" isVisible={content.is_visible !== false} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
                </h2>
                <div className="text-muted-foreground leading-relaxed mb-2 text-[0.9375rem]" style={{ color: hasEmbeddedColor(content.description) ? undefined : (content.description_color || undefined) }}>
                  <EditableText section="about" field="description" value={content.description || "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company in the Digital Era!"} colorField="description_color" />
                </div>
                <div className="text-muted-foreground leading-relaxed text-[0.9375rem]" style={{ color: hasEmbeddedColor(content.vision) ? undefined : (content.vision_color || undefined) }}>
                  <EditableText section="about" field="vision" value={content.vision || "Our journey began out of the passion for a unique position in the industry."} colorField="vision_color" />
                </div>
              </AnimatedSection>
            </div>

            {/* Right: Main Image */}
            <AnimatedSection delay={0.2} className="h-full w-full flex lg:justify-end">
              <div className="relative w-full ml-auto h-[280px] sm:h-[320px] lg:h-[360px] rounded-2xl overflow-hidden group">
                <img
                  src={resolveImg("about_main_img") || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"}
                  alt="About Us"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"; }}
                />

                <EditorToolbar section="about" imageField="about_main_img" className="absolute z-50 top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </div>
            </AnimatedSection>
          </div>

          {/* Bottom Row: 4 cards row */}
          <AnimatedSection delay={0.4} className="relative z-20">
            {/* Center logo badge */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="relative">
                <div className="absolute -inset-1.5 rounded-full border border-secondary/40 animate-pulse" style={{ animationDuration: "2s" }} />
                <div
                  className="w-12 h-12 rounded-full bg-card border-2 border-secondary/50 shadow-lg flex items-center justify-center overflow-hidden"
                  style={{ boxShadow: "0 0 12px 3px hsl(var(--secondary) / 0.2)" }}
                >
                  <img
                    src="/favicon.ico"
                    alt="Logo"
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = "none";
                      const fb = img.nextElementSibling as HTMLElement | null;
                      if (fb) fb.style.display = "flex";
                    }}
                  />
                  <span className="text-secondary font-bold text-xs hidden">S</span>
                </div>
              </div>
            </div>
            
            {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 pt-5">
                {cardData.map((card, idx) => {
                  const { Icon } = card;
                  const isVisible = content[`card_visible_${card.key}`] !== false;
                  if (!editor?.isEditMode && !isVisible) return null;

                  return (
                    <div
                      key={card.key}
                      className={`glass-card border border-border/40 relative rounded-2xl p-4 lg:p-5 group/item cursor-pointer flex flex-col gap-2 transition-all duration-300 hover:glow-effect hover:outline hover:outline-2 hover:outline-secondary/50 ${draggedKey === card.key ? "opacity-20 scale-95" : ""} ${!isVisible ? "opacity-50 grayscale" : ""}`}
                      draggable={editor?.isEditMode}
                      onDragStart={(e) => handleDragStart(e, card.key)}
                      onDragEnd={() => setDraggedKey(null)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, card.key)}
                    >
                      <EditorToolbar
                        section="about"
                        iconField={`card_icon_${card.key}`}
                        visibilityField={`card_visible_${card.key}`}
                        isVisible={isVisible}
                        onToggle={() => editor?.onUpdate("about", `card_visible_${card.key}`, !isVisible)}
                        className="-top-4 -right-2"
                      />
                      {editor?.isEditMode && (
                        <div className="absolute -top-4 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                          <button onClick={(e) => { e.stopPropagation(); handleMove(card.key, "left"); }} className="p-1.5 bg-secondary/10 text-secondary rounded-full pointer-events-auto hover:bg-secondary hover:text-white transition-colors shadow-sm" title="Move Left">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleMove(card.key, "right"); }} className="p-1.5 bg-secondary/10 text-secondary rounded-full pointer-events-auto hover:bg-secondary hover:text-white transition-colors shadow-sm" title="Move Right">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                          </button>
                        </div>
                      )}
                      
                      <div className="text-secondary">
                        {(() => {
                          const iconVal = content[`card_icon_${card.key}`] || "";
                          if (isHtmlIcon(iconVal)) return <span className="text-[2rem]" dangerouslySetInnerHTML={{ __html: iconVal }} />;
                          const IconComp = (LucideIcons as any)[iconVal] || Icon;
                          return <IconComp size={26} strokeWidth={1.5} />;
                        })()}
                      </div>
                      
                      <div>
                        <h3 className="font-heading font-bold text-base text-foreground leading-snug mb-1">
                          <EditableText section="about" field={`card_title_${card.key}`} value={card.title} />
                        </h3>
                        <div className="pointer-events-auto text-muted-foreground">
                          <MobileReadMore
                            section="about" field={card.key}
                            text={content[card.key] || card.desc}
                            clampClass="line-clamp-3"
                            textClass="text-[0.8rem] leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
