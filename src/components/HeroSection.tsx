import { ArrowRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor } from "./admin/LiveEditorContext";

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
  const numericVal = parseInt(count);
  const isNumeric = !isNaN(numericVal) && String(numericVal) === count.trim();
  const animated = useCountUp(isNumeric ? numericVal : 0, 2000, inView && isNumeric);
  const isGradient = color === "gradient";

  return (
    <div className="flex flex-col transition-transform hover:scale-110 duration-300 relative group/item px-2">
      <EditorToolbar section="hero_stats" id={id} isVisible={isVisible} colorField="count_color" className="-top-8 right-1/2 translate-x-1/2" />
      <div className="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl">
        <span className={isGradient ? "gradient-text" : ""}>
          <EditableText section="hero_stats" field="count" id={id} value={count} colorField="count_color" hideColorPicker />
          {suffix && <EditableText section="hero_stats" field="suffix" id={id} value={suffix} colorField="count_color" hideColorPicker />}
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
  const rawImages = (content as any)?.images || (content as any)?.hero_images || "";
  const dbSlides = typeof rawImages === "string"
    ? rawImages.split(",").map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(rawImages) ? rawImages : [];
  const heroImg = (content as any)?.hero_image;
  const allSlides = (() => {
    let imgs = [...dbSlides];
    if (heroImg?.trim()) {
      imgs = imgs.filter(u => u !== heroImg.trim());
      imgs.unshift(heroImg.trim());
    }
    return imgs;
  })();
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

  return (
    <section id="home" className="relative flex flex-col min-h-screen overflow-hidden bg-[#020617] group/hero">
      <SectionHeaderToolbar section="hero" className="top-24 right-4 sm:top-28 sm:right-6 lg:top-24 lg:right-10" />
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#020617]" />
        {allSlides.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            crossOrigin="anonymous"
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

      <div className="container-wide relative z-10 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-32 sm:pt-40 pb-20">
        <div className="flex-1 flex flex-col justify-center max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-10 hero-fade-in w-fit" style={{ animationDelay: "0.1s" }}>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-white/90 text-sm font-medium" style={{ color: content.badge_color || undefined }}>
              <EditableText section="hero" field="badge" value="Maldives' Leading IT Solutions Partner" colorField="badge_color" />
            </span>
          </div>

          <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4.5rem] font-heading font-bold text-white leading-[1.1] mb-6 drop-shadow-2xl hero-fade-in" style={{ animationDelay: "0.2s", color: content.title_color || undefined }}>
            <EditableText section="hero" field="title" value={content.title || "Transforming Business Across Maldives"} colorField="title_color" />
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mb-8 leading-relaxed drop-shadow hero-fade-in" style={{ animationDelay: "0.35s", color: content.subtitle_color || undefined }}>
            <EditableText section="hero" field="subtitle" value={content.subtitle || "Enterprise software, ERP, and digital transformation solutions for the hospitality, finance, and government sectors."} colorField="subtitle_color" />
          </p>

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
        <div ref={statsRef} className="mt-12 sm:mt-24 lg:mt-32 hero-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className={`${content.stats_layout === "compact"
            ? "flex flex-wrap items-center justify-center gap-x-12 sm:gap-x-16 lg:gap-x-24 gap-y-6"
            : "p-6 sm:p-8 px-8 sm:px-12 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-center gap-x-12 sm:gap-x-20 gap-y-6 shadow-2xl"
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
        className="top-24 right-4 sm:top-28 sm:right-6 lg:top-24 lg:right-10 !opacity-100 !scale-100"
      />
    </section>
  );
};

export default HeroSection;
