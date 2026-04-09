import { ArrowRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";

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

const StatItem = ({ count, label, color, suffix, inView }: { 
  count: string,
  label: string, 
  color: string, 
  suffix: string, 
  inView: boolean
}) => {
  const numericVal = parseInt(count);
  const isNumeric = !isNaN(numericVal) && String(numericVal) === count.trim();
  const animated = useCountUp(isNumeric ? numericVal : 0, 2000, inView && isNumeric);
  const isGradient = color === "gradient";
  const displayVal = isNumeric ? `${animated}${suffix}` : count;
  
  return (
    <div className="flex flex-col transition-transform hover:scale-105 duration-300">
      <div 
        className="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl"
        style={{ color: isGradient ? undefined : color }}
      >
        <span className={isGradient ? "gradient-text" : ""}>{displayVal}</span>
      </div>
      <div className="text-white/50 text-[0.625rem] sm:text-xs tracking-wider uppercase font-bold mt-0.5 whitespace-nowrap">
        {label}
      </div>
    </div>
  );
};

const HERO_SLIDES = [
  "/assets/hero/hero_3d_glassy1.png",
  "/assets/hero/bg.jpg",
  "/assets/hero/bg-dark.jpg",
];

const HeroSection = () => {
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
    return imgs.length > 0 ? imgs : HERO_SLIDES;
  })();
  const [isDark, setIsDark] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  // Draggable stats panel
  const [statsPos, setStatsPos] = useState({ x: 0, y: 0 });
  const statsDragging = useRef(false);
  const statsOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const onStatsPointerDown = (e: React.PointerEvent) => {
    statsDragging.current = true;
    statsOrigin.current = { mx: e.clientX, my: e.clientY, px: statsPos.x, py: statsPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onStatsPointerMove = (e: React.PointerEvent) => {
    if (!statsDragging.current) return;
    setStatsPos({
      x: statsOrigin.current.px + e.clientX - statsOrigin.current.mx,
      y: statsOrigin.current.py + e.clientY - statsOrigin.current.my,
    });
  };
  const onStatsPointerUp = () => { statsDragging.current = false; };

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const t = setInterval(() => setBgIndex(i => (i + 1) % allSlides.length), 4000);
    return () => clearInterval(t);
  }, [allSlides.length]);

  const statsRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    // Fallback: always show stats after 1s even if IntersectionObserver doesn't fire
    const fallback = setTimeout(() => setInView(true), 1000);
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); clearTimeout(fallback); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []);

  const [heroStats, setHeroStats] = useState<any[]>([]);
  const { data: heroStatsData } = useDbQuery<any[]>("hero_stats", { is_visible: true }, { order: "sort_order" });
  useEffect(() => {
    if (heroStatsData) setHeroStats(heroStatsData);
  }, [heroStatsData]);

  return (
    <section id="home" className="relative flex items-start overflow-hidden min-h-[100vh] h-[100vh] bg-[#020617]">
      {/* Background images — CSS-only parallax, no JS animation loop */}
      <div className="absolute inset-0 z-0">
        {/* Base Solid Overlay to prevent flicker/empty screen */}
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
              transition: "opacity 0.8s ease-in-out",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(0)",
              imageRendering: "auto",
            }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.filter = "none"; }}
          />
        ))}

        {/* Cinematic Overlays */}
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

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(217 91% 60% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(217 91% 60% / 0.4) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container-wide relative z-10 px-4 sm:px-6 lg:px-8 pt-[12dvh] sm:pt-[15dvh] pb-12 flex flex-col h-full">
        <div className="max-w-4xl flex-1">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-6 hero-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-white/90 text-sm font-medium">Maldives' Leading IT Solutions Partner</span>
          </div>

          <h1 className="text-[2.15rem] sm:text-[2.75rem] lg:text-[4rem] font-heading font-bold text-white leading-tight mb-4 drop-shadow-lg hero-fade-in" style={{ animationDelay: "0.2s" }}>
            {content.title?.includes("Maldives") ? (
              <>
                {content.title.split("Maldives")[0]}
                <span className="gradient-text">Maldives</span>
              </>
            ) : (
              <span>{content.title || "Transforming Business Across Maldives"}</span>
            )}
          </h1>

          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mb-6 leading-relaxed drop-shadow hero-fade-in" style={{ animationDelay: "0.35s" }}>
            {content.subtitle || "Enterprise software, ERP, and digital transformation solutions for the hospitality, finance, and government sectors."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 hero-fade-in" style={{ animationDelay: "0.5s" }}>
            <button
              onClick={() => scrollTo("#contact")}
              className="group inline-flex items-center justify-center gap-2 px-7 py-3 bg-secondary text-secondary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity glow-effect shadow-lg"
            >
              {content.cta_text || "Get Started"}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => scrollTo("#services")}
              className="inline-flex items-center justify-center px-7 py-3 border border-white/30 text-white font-semibold text-sm rounded-xl hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              Our Services
            </button>
          </div>
        </div>

        {/* Stats — absolutely pinned to bottom, draggable if content overlaps */}
        <div 
          ref={statsRef}
          onPointerDown={onStatsPointerDown}
          onPointerMove={onStatsPointerMove}
          onPointerUp={onStatsPointerUp}
          className="absolute left-0 right-0 flex justify-center px-4 cursor-grab active:cursor-grabbing select-none"
          style={{ bottom: `calc(2.5rem + ${-statsPos.y}px)`, transform: `translateX(${statsPos.x}px)` }}
        >
          <div className={`${
            content.stats_layout === "compact"
              ? "flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 lg:gap-x-16 gap-y-4"
              : "p-4 sm:p-6 px-6 sm:px-10 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-14 gap-y-4"
          }`}>
          {heroStats.map(stat => (
            <StatItem 
              key={stat.id}
              count={stat.count}
              label={stat.label}
              color={stat.color}
              suffix={stat.suffix || "+"}
              inView={inView}
            />
          ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
        </div>
      </div>

      {/* Slide dots — only shown when multiple images */}
      {allSlides.length > 1 && (
        <div className="absolute bottom-8 right-8 flex gap-1.5">
          {allSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              className={`rounded-full transition-all duration-300 ${i === bgIndex ? "w-5 h-1.5 bg-secondary" : "w-1.5 h-1.5 bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroSection;
