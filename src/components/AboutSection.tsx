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
      <div className="container-wide relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: text — live from DB */}
          <div>
            <AnimatedSection>
              <span className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: hasEmbeddedColor(content.badge) ? undefined : (content.badge_color || undefined) }}>
                <EditableText section="about" field="badge" value={content.badge || "Who We Are"} colorField="badge_color" />
              </span>
              <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-2 mb-4 relative" style={{ color: hasEmbeddedColor(content.title) ? undefined : (content.title_color || undefined) }}>
                <span>
                  <EditableText section="about" field="title" value={content.title || "Driving Digital Transformation"} colorField="title_color" />
                </span>
                <SectionHeaderToolbar section="about" isVisible={content.is_visible !== false} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
              </h2>
              <div className="text-muted-foreground leading-relaxed mb-4 text-[0.9375rem]" style={{ color: hasEmbeddedColor(content.description) ? undefined : (content.description_color || undefined) }}>
                <EditableText section="about" field="description" value={content.description || "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company in the Digital Era!"} colorField="description_color" />
              </div>
              <div className="text-muted-foreground leading-relaxed text-[0.9375rem]" style={{ color: hasEmbeddedColor(content.vision) ? undefined : (content.vision_color || undefined) }}>
                <EditableText section="about" field="vision" value={content.vision || "Our journey began out of the passion for a unique position in the industry."} colorField="vision_color" />
              </div>
            </AnimatedSection>
          </div>


          {/* Right: cards with center logo badge */}
          <AnimatedSection delay={0.2} className="h-full flex flex-col">
            {view === "grid" ? (
              <div className="relative flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-3 flex-1">
                {cardData.map((card, idx) => {
                  const { Icon } = card;
                  const imgSrc = resolveImg(card.imgKey);
                  const isVisible = content[`card_visible_${card.key}`] !== false;
                  if (!editor?.isEditMode && !isVisible) return null;

                  return (
                    <div
                      key={card.key}
                      className={`glass-card relative rounded-xl overflow-hidden group/item cursor-pointer border border-border/40 hover:glow-effect transition-all duration-300 hover:outline hover:outline-2 hover:outline-secondary/50 flex flex-col h-full ${draggedKey === card.key ? "opacity-20 scale-95" : ""} ${!isVisible ? "opacity-50 grayscale" : ""}`}
                      style={{ animationDelay: `${idx * 0.6}s`, animationDuration: `${4 + idx * 0.5}s` }}
                      draggable={editor?.isEditMode}
                      onDragStart={(e) => handleDragStart(e, card.key)}
                      onDragEnd={() => setDraggedKey(null)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, card.key)}
                    >
                      <EditorToolbar
                        section="about"
                        imageField={card.imgKey}
                        iconField={`card_icon_${card.key}`}
                        visibilityField={`card_visible_${card.key}`}
                        isVisible={isVisible}
                        onToggle={() => editor?.onUpdate("about", `card_visible_${card.key}`, !isVisible)}
                      />
                      {editor?.isEditMode && (
                        <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                          <button onClick={(e) => { e.stopPropagation(); handleMove(card.key, "left"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Left">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleMove(card.key, "right"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Right">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                          </button>
                        </div>
                      )}
                      {useImg && (
                        <img src={imgSrc} alt={card.title} key={imgSrc}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110"
                          loading="lazy" decoding="async"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = card.fallback; }}
                        />
                      )}
                      {useImg && <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} transition-opacity duration-300 opacity-70 group-hover/item:opacity-95`} />}
                      <div className="relative z-10 px-4 pt-[38px] sm:pt-[46px] pb-[18px] flex-1 flex flex-col justify-end gap-1.5 pointer-events-none">
                        {!useImg && (
                          <div className="text-secondary -mt-1.5 mb-1">
                            {(() => {
                              const iconVal = content[`card_icon_${card.key}`] || "";
                              if (isHtmlIcon(iconVal)) return <span className="text-[1.5rem]" dangerouslySetInnerHTML={{ __html: iconVal }} />;
                              const IconComp = (LucideIcons as any)[iconVal] || Icon;
                              return <IconComp size={24} />;
                            })()}
                          </div>
                        )}
                        <h3 className={`font-heading font-bold text-base leading-snug pointer-events-auto ${useImg ? "text-white" : "text-foreground"}`}>
                          <EditableText section="about" field={`card_title_${card.key}`} value={card.title} />
                        </h3>
                        <div className="pointer-events-auto">
                          <MobileReadMore
                            section="about" field={card.key}
                            text={content[card.key] || card.desc}
                            clampClass="line-clamp-3"
                            textClass={`text-[0.85rem] leading-relaxed ${useImg ? "text-white/80" : "text-muted-foreground"}`}
                          />
                        </div>
                      </div>
                      {useImg && (
                        <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 pointer-events-none"
                          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 55%)" }} />
                      )}
                    </div>
                  );
                })}
                </div>
                {/* Center logo badge at the intersection of the 4 cards */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                  <div className="relative">
                    <div className="absolute -inset-1.5 rounded-full border border-secondary/40 animate-pulse" style={{ animationDuration: "2s" }} />
                    <div
                      className="w-10 h-10 rounded-full bg-card border-2 border-secondary/50 shadow-lg flex items-center justify-center overflow-hidden"
                      style={{ boxShadow: "0 0 12px 3px hsl(var(--secondary) / 0.2)" }}
                    >
                      <img
                        src="/favicon.ico"
                        alt="Logo"
                        className="w-6 h-6 object-contain"
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
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cardData.map((card) => {
                  const { Icon } = card;
                  const imgSrc = resolveImg(card.imgKey);
                  const isVisible = content[`card_visible_${card.key}`] !== false;
                  
                  if (!editor?.isEditMode && !isVisible) return null;

                  return (
                    <div key={card.title}
                      className={`glass-card flex items-center gap-4 p-4 group/item hover:glow-effect transition-all duration-300 cursor-pointer relative overflow-hidden border border-border/40 hover:outline hover:outline-2 hover:outline-secondary/50 ${draggedKey === card.key ? "opacity-20 scale-95" : ""} ${!isVisible ? "opacity-50 grayscale" : ""}`}
                      draggable={editor?.isEditMode}
                      onDragStart={(e) => handleDragStart(e, card.key)}
                      onDragEnd={() => setDraggedKey(null)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, card.key)}
                    >
                      <EditorToolbar 
                        section="about" 
                        imageField={card.imgKey} 
                        visibilityField={`card_visible_${card.key}`}
                        isVisible={isVisible}
                        onToggle={() => editor?.onUpdate("about", `card_visible_${card.key}`, !isVisible)}
                      />
                      {editor?.isEditMode && (
                        <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                          <button onClick={(e) => { e.stopPropagation(); handleMove(card.key, "up"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Up">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleMove(card.key, "down"); }} className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm" title="Move Down">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                          </button>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-secondary/[0.03] to-transparent group-hover:from-secondary/[0.07] transition-all pointer-events-none rounded-xl" />
                      <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                        {useImg ? (
                          <>
                            <img
                              src={imgSrc}
                              alt={card.title}
                              key={imgSrc}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = card.fallback; }}
                            />
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-70`} />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
                            <Icon size={22} className="text-secondary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <h3 className="font-heading font-bold text-foreground text-[0.9375rem] leading-snug">
                          <EditableText section="about" field={`card_title_${card.key}`} value={card.title} />
                        </h3>
                        <MobileReadMore
                          section="about"
                          field={card.key}
                          text={content[card.key] || card.desc}
                          clampClass="line-clamp-1"
                          textClass="text-muted-foreground text-[0.7rem] sm:text-[0.8125rem] font-semibold mt-0.5"
                        />
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all shrink-0 relative z-10" />
                    </div>
                  );
                })}
              </div>
            )}
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
