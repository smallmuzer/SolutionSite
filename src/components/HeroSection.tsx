import { ArrowRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, hasEmbeddedColor } from "./admin/LiveEditorContext";

function useCountUp(end: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, end, duration]);
  return count;
}

const StatItem = ({ count, label, color, suffix, isVisible, inView, id }: {
  count: string,
  label: string,
  color: string,
  suffix: string,
  isVisible: boolean,
  inView: boolean,
  id?: string
}) => {
  const editor = useLiveEditor();
  const numericVal = parseInt(count);
  const isNumeric = !isNaN(numericVal) && String(numericVal) === count.trim();
  const animated = useCountUp(isNumeric ? numericVal : 0, 2000, inView && isNumeric);
  const isGradient = color === "gradient";
  const displayValue = !editor?.isEditMode && isNumeric ? String(animated) : count;

  return (
    <div className="flex flex-col items-center sm:items-start transition-transform hover:scale-110 duration-300 relative group/item px-1 sm:px-2">
      <EditorToolbar section="hero_stats" id={id} isVisible={isVisible} colorField="color" className="-top-8 right-1/2 translate-x-1/2" />
      <div className="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl">
        <span className={isGradient ? "gradient-text" : ""}>
          <EditableText section="hero_stats" field="count" id={id} value={displayValue} colorField="color" colorValue={isGradient ? undefined : color} hideColorPicker />
          {suffix && <EditableText section="hero_stats" field="suffix" id={id} value={suffix} colorField="color" colorValue={isGradient ? undefined : color} hideColorPicker />}
        </span>
      </div>
      <div className="text-white/50 text-[0.625rem] sm:text-xs tracking-wider uppercase font-bold mt-0.5 whitespace-nowrap">
        <EditableText section="hero_stats" field="label" id={id} value={label} />
      </div>
    </div>
  );
};

const HeroSection = () => {
  const editor = useLiveEditor();
  const content = useSiteContent("hero");
  const rawImages = editor?.pendingChanges["hero:images"] ?? editor?.pendingChanges["hero:hero_images"] ?? ((content as any)?.images || (content as any)?.hero_images || "");
  const dbSlides = typeof rawImages === "string"
    ? rawImages.split(",").map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(rawImages) ? rawImages : [];
  const heroImg = editor?.pendingChanges["hero:hero_image"] ?? (content as any)?.hero_image;
  const allSlides = (() => {
    // If the user has explicitly selected images (dbSlides), show ONLY those selected images.
    if (dbSlides.length > 0) return dbSlides;
    // Otherwise fallback to the legacy single hero_image if available.
    if (heroImg?.trim()) return [heroImg.trim()];
    return [];
  })();
  const overlayImage = editor?.pendingChanges["hero:overlay_image"] ?? (content as any)?.overlay_image;
  const overlayVisibleStr = editor?.pendingChanges["hero:is_overlay_visible"] ?? (content as any)?.is_overlay_visible ?? "true";
  const overlayVisible = overlayVisibleStr !== "false" && overlayVisibleStr !== false;

  const [isDark, setIsDark] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (allSlides.length <= 1 || editor?.isEditMode) return;
    const t = setInterval(() => setBgIndex(i => (i + 1) % allSlides.length), 4000);
    return () => clearInterval(t);
  }, [allSlides.length, editor?.isEditMode]);

  const statsRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const fallback = setTimeout(() => setInView(true), 1000);
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); clearTimeout(fallback); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []);

  const [heroStats, setHeroStats] = useState<any[]>([]);
  const { data: heroStatsData } = useDbQuery<any[]>("hero_stats", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order" });

  useEffect(() => {
    if (heroStatsData) setHeroStats(heroStatsData);
  }, [heroStatsData]);

  const [isOverlayLoaded, setIsOverlayLoaded] = useState(false);

  if (!editor?.isEditMode && content?.is_visible === false) return null;

  return (
    <section id="home" className="relative flex flex-col min-h-[90vh] lg:min-h-[85vh] overflow-hidden bg-[#020617] group/hero">
      <SectionHeaderToolbar section="hero" isVisible={content.is_visible !== false} className="top-24 right-4 sm:top-28 sm:right-6 lg:top-24 lg:right-10" />
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#020617]" />
        {allSlides.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            crossOrigin="anonymous"
            loading="eager"
            {...({ fetchpriority: i === 0 ? "high" : "auto" } as any)}
            className="absolute inset-0 w-full h-full object-cover hero-parallax"
            style={{
              opacity: i === bgIndex ? 1 : 0,
              transform: i === bgIndex ? "scale(1.15)" : "scale(1)",
              transition: "opacity 2s ease-in-out, transform 10s linear",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(135deg, hsl(222 47% 4% / 0.9) 0%, hsl(222 47% 8% / 0.75) 50%, hsl(217 40% 12% / 0.6) 100%)"
              : "linear-gradient(135deg, hsl(220 60% 12% / 0.75) 0%, hsl(220 50% 22% / 0.65) 50%, hsl(217 60% 30% / 0.5) 100%)",
          }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.2) 100%)" }} />
      </div>

      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(217 91% 60% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(217 91% 60% / 0.4) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* SVG Overlay Spotlight (Increases visibility of multiplied images) */}
      {(overlayImage || editor?.isEditMode) && (
        <div className={`absolute top-24 sm:top-1/2 right-4 sm:right-[2%] lg:right-[5%] z-10 w-[40%] sm:w-[50%] lg:w-[40%] max-w-[180px] sm:max-w-[380px] aspect-square bg-white/80 rounded-full blur-[40px] sm:blur-[60px] pointer-events-none transition-opacity duration-500 translate-x-[10px] translate-y-[10px] sm:translate-y-[calc(-50%+10px)] ${(!overlayVisible && !editor?.isEditMode) || (overlayImage && !isOverlayLoaded) ? 'opacity-0' : 'opacity-100'}`} />
      )}

      {/* SVG Overlay Graphic (Visual Layer) */}
      {(overlayImage || editor?.isEditMode) && (
        <div className={`absolute top-24 sm:top-0 sm:bottom-0 sm:my-auto h-fit right-4 sm:right-[2%] lg:right-[5%] w-[40%] sm:w-[50%] lg:w-[40%] max-w-[180px] sm:max-w-[500px] z-20 mix-blend-multiply peer/overlay translate-x-[10px] translate-y-[10px] sm:translate-y-0 ${editor?.isEditMode ? 'pointer-events-auto' : 'pointer-events-none'} ${!overlayVisible && !editor?.isEditMode ? 'hidden' : ''}`}>
          <div className={`w-full transition-opacity duration-300 ${!overlayVisible ? 'opacity-30 grayscale' : 'opacity-100'}`}>
            {overlayImage ? (
              <img src={overlayImage} onLoad={() => setIsOverlayLoaded(true)} alt="Hero Overlay" loading="eager" {...({ fetchpriority: "high" } as any)} className="w-full h-auto object-contain animate-float pointer-events-none brightness-110 contrast-110" />
            ) : (
              editor?.isEditMode && (
                <div className="w-full aspect-video border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center pointer-events-auto hover:bg-white/10 transition-colors">
                  <p className="text-white/50 text-xs font-bold uppercase tracking-widest text-center px-4">Click Image Icon to Add SVG Overlay</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* SVG Overlay Toolbar (Interaction Layer) */}
      {editor?.isEditMode && (
        <div className={`absolute top-24 sm:top-0 sm:bottom-0 sm:my-auto h-fit right-4 sm:right-[2%] lg:right-[5%] w-[40%] sm:w-[50%] lg:w-[40%] max-w-[180px] sm:max-w-[500px] z-50 pointer-events-none translate-x-[10px] translate-y-[10px] sm:translate-y-0 opacity-100 transition-all duration-300`}>
          <div className={`pointer-events-auto absolute -top-12 right-0`}>
            <EditorToolbar
              section="hero"
              group=""
              imageField="overlay_image"
              isVisible={overlayVisible}
              canHide={true}
              canDelete={false}
              canClone={false}
              onToggle={() => {
                editor?.onUpdate("hero", "is_overlay_visible", overlayVisible ? "false" : "true");
              }}
              className="relative top-0 right-0"
            />
          </div>
        </div>
      )}

      <div className="container-wide relative z-30 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-28 sm:pt-32 pb-12">
        <div className="flex-1 flex flex-col justify-center max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-10 hero-fade-in w-fit" style={{ animationDelay: "0.1s" }}>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-white/90 text-sm font-medium" style={{ color: hasEmbeddedColor("Maldives' Leading IT Solutions Partner") ? undefined : (content.badge_color || undefined) }}>
              <EditableText section="hero" field="badge" value={content.badge || "Maldives' Leading IT Solutions Partner"} colorField="badge_color" />
            </span>
          </div>

          <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4.5rem] font-heading font-bold text-white leading-[1.1] mb-6 drop-shadow-2xl hero-fade-in" style={{ animationDelay: "0.2s", color: hasEmbeddedColor(content.title) ? undefined : (content.title_color || undefined) }}>
            <EditableText section="hero" field="title" value={content.title || "Transforming Business Across Maldives"} colorField="title_color" />
          </h1>

          <div className="text-lg sm:text-xl text-white/80 max-w-2xl mb-8 leading-relaxed drop-shadow hero-fade-in" style={{ animationDelay: "0.35s", color: hasEmbeddedColor(content.subtitle) ? undefined : (content.subtitle_color || undefined) }}>
            <EditableText section="hero" field="subtitle" value={content.subtitle || "Enterprise software, ERP, and digital transformation solutions for the hospitality, finance, and government sectors."} colorField="subtitle_color" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 hero-fade-in group/item relative" style={{ animationDelay: "0.5s" }}>
            <EditorToolbar section="hero" linkField="cta_url" className="-top-10 left-0" />
            <button
              onClick={() => scrollTo(content.cta_url || "#contact")}
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-secondary text-secondary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition-all glow-effect shadow-lg hover:scale-105 active:scale-95"
            >
              <EditableText section="hero" field="cta_text" value={content.cta_text || "Get Started"} />
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="group/item relative">
              <EditorToolbar section="hero" linkField="services_url" className="-top-10 left-0" />
              <button
                onClick={() => scrollTo(content.services_url || "#services")}
                className="inline-flex items-center justify-center px-8 py-3.5 border border-white/30 text-white font-semibold text-sm rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm w-full sm:w-auto hover:scale-105 active:scale-95"
              >
                <EditableText section="hero" field="services_text" value={content.services_text || "Our Services"} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="mt-6 sm:mt-10 lg:mt-12 hero-fade-in w-full" style={{ animationDelay: "0.7s" }}>
          <div className={`mx-auto w-full sm:w-fit ${content.stats_layout === "compact"
            ? "flex flex-row flex-nowrap items-center justify-between sm:justify-center gap-x-1 sm:gap-x-16 lg:gap-x-24"
            : "py-3 sm:py-5 px-4 sm:px-12 rounded-2xl sm:rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-row flex-nowrap items-center justify-between sm:justify-center gap-x-1 sm:gap-x-20 shadow-2xl"
            }`}>
            {heroStats.map(stat => (
              <StatItem
                key={stat.id}
                id={stat.id}
                count={stat.count}
                label={stat.label}
                color={stat.color}
                suffix={stat.suffix || "+"}
                isVisible={stat.is_visible}
                inView={inView}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator - hidden in edit mode to avoid overlapping with stats editor widgets */}
      {!editor?.isEditMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-bounce hidden sm:block">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
          </div>
        </div>
      )}

      {/* Slide dots */}
      {allSlides.length > 1 && (
        <div className="absolute bottom-8 right-8 flex gap-2">
          {allSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              className={`rounded-full transition-all duration-300 ${i === bgIndex ? "w-6 h-1.5 bg-secondary" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"}`}
            />
          ))}
        </div>
      )}

      <EditorToolbar
        section="hero"
        multiImageField="hero_images"
        canHide={false}
        className="top-24 left-4 sm:top-28 sm:left-6 lg:top-24 lg:left-10 !opacity-100 !scale-100 origin-top-left"
      />
    </section>
  );
};

export default HeroSection;
