import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";
import { ArrowUpRight, ArrowRight, Target, Users, Award, Globe } from "lucide-react";
import { useCardStyle, useGlobalView } from "./ui-customizer-context";
import * as LucideIcons from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditorNavigation } from "./admin/LiveEditorContext";

function isHtmlIcon(icon: string): boolean {
  return !!icon && (icon.trim().startsWith("<") || icon.includes("class="));
}

const MobileReadMore = ({ text, clampClass, textClass, section, field }: { text: string; clampClass: string; textClass: string; section?: string; field?: string }) => {
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

const cardData = [
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

  const resolveImg = (imgKey: string) => {
    const v = content[imgKey];
    return v && v.trim() ? v.trim() : "";
  };

  return (
    <section id="about" className="section-padding relative overflow-hidden group">
      <SectionHeaderToolbar section="about" />
      <div className="container-wide relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: text — live from DB */}
          <div>
            <AnimatedSection>
              <span className="text-secondary font-semibold text-sm uppercase tracking-widest">
                <EditableText section="about" field="badge" value="Who We Are" colorField="badge_color" />
              </span>
              <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-6">
                <EditableText section="about" field="title" value={content.title || "Driving Digital Transformation"} colorField="title_color" />
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4 text-[0.9375rem]">
                <EditableText section="about" field="description" value={content.description || "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company in the Digital Era!"} colorField="description_color" />
              </p>
              <p className="text-gray-500 leading-relaxed text-[0.9375rem]">
                <EditableText section="about" field="vision" value={content.vision || "Our journey began out of the passion for a unique position in the industry."} colorField="vision_color" />
              </p>
            </AnimatedSection>
          </div>


          {/* Right: cards — images fully live from DB */}
          <AnimatedSection delay={0.2}>
            {view === "grid" ? (
              <div className="grid grid-cols-2 gap-2">
                {cardData.map((card, idx) => {
                  const { Icon } = card;
                  const imgSrc = resolveImg(card.imgKey);
                  return (
                    <div
                      key={card.title}
                      className="glass-card relative rounded-xl overflow-hidden group/item cursor-default"
                      style={{
                        height: "clamp(120px, 16vw, 145px)",
                        animationDelay: `${idx * 0.6}s`,
                        animationDuration: `${4 + idx * 0.5}s`,
                      }}
                    >
                      <EditorToolbar section="about" imageField={card.imgKey} iconField={`card_icon_${idx}`} />
                      {useImg && (
                        <img
                          src={imgSrc}
                          alt={card.title}
                          key={imgSrc}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = card.fallback; }}
                        />
                      )}
                      {useImg && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} transition-opacity duration-300 opacity-70 group-hover/item:opacity-95`} />
                      )}
                      <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                        {!useImg && (
                          <div className="text-secondary mb-2">
                            {(() => {
                              const iconVal = content[`card_icon_${idx}`] || "";
                              if (isHtmlIcon(iconVal)) {
                                return <span className="text-[1.5rem]" dangerouslySetInnerHTML={{ __html: iconVal }} />;
                              }
                              const IconComp = (LucideIcons as any)[iconVal] || Icon;
                              return <IconComp size={24} />;
                            })()}
                          </div>
                        )}
                        <h3 className={`font-heading font-extrabold text-[0.9375rem] mb-1 drop-shadow leading-snug ${useImg ? "text-white" : "text-foreground"}`}>
                          <EditableText section="about" field={`card_title_${idx}`} value={card.title} />
                        </h3>
                        <MobileReadMore
                          section="about"
                          field={card.key}
                          text={content[card.key] || card.desc}
                          clampClass="line-clamp-2"
                          textClass={`text-[0.7rem] sm:text-[0.8125rem] font-semibold leading-relaxed drop-shadow ${useImg ? "text-white/80" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/item:opacity-100 transition-all duration-300 translate-y-1 group-hover/item:translate-y-0">
                        <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <ArrowUpRight size={14} className="text-white" />
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
            ) : (
              <div className="flex flex-col gap-3">
                {cardData.map((card) => {
                  const { Icon } = card;
                  const imgSrc = resolveImg(card.imgKey);
                  return (
                    <div key={card.title}
                      className="glass-card flex items-center gap-4 p-4 group/item hover:glow-effect transition-all duration-300 cursor-default relative overflow-hidden"
                    >
                      <EditorToolbar section="about" imageField={card.imgKey} />
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
                        <h3 className="font-heading font-extrabold text-foreground text-[0.9375rem] leading-snug">
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
