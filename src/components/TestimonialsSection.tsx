import { useState, useMemo } from "react";
import AnimatedSection from "./AnimatedSection";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useGlobalView } from "./ui-customizer-context";

const AVATAR_MAP: Record<string, string> = {
  "Ahmed Rasheed":  "/assets/testimonials/ahmed.jpg",
  "Fatima Ibrahim": "/assets/testimonials/fatima.jpg",
  "Fatima Zahir":   "/assets/testimonials/fatima.jpg",
  "Dorji Tshering": "/assets/testimonials/dorji.jpg",
  "Dorji Wangchuk": "/assets/testimonials/dorji.jpg",
};

const CARDS_PER_PAGE = 3;

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5 mb-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
      />
    ))}
  </div>
);

const TestimonialsSection = () => {
  const view = useGlobalView();
  const [currentPage, setCurrentPage] = useState(0);

  const { data: headerContent, isLoading: isHeaderLoading } = useDbQuery<any>("site_content", { section_key: "testimonials" }, { single: true });
  const { data: rawTestimonials, isLoading: isDataLoading } = useDbQuery<any[]>("testimonials", { is_visible: true }, { order: "created_at", asc: false });

  const header = {
    badge: headerContent?.content?.badge || "Testimonials",
    title: headerContent?.content?.title || "What Our",
    highlight: headerContent?.content?.highlight || "Clients Say",
  };

  const testimonials = useMemo(() => {
    if (!rawTestimonials) return [];
    return rawTestimonials.map((t: any) => ({
      id: t.id, name: t.name, company: t.company, rating: t.rating ?? 5,
      message: t.message,
      avatar_url: AVATAR_MAP[t.name] || t.avatar_url || "/assets/testimonials/ahmed.jpg",
    }));
  }, [rawTestimonials]);

  if (isHeaderLoading || isDataLoading) return (
     <section className="section-padding section-alt animate-pulse">
        <div className="container-wide">
          <div className="h-4 w-24 bg-muted mx-auto rounded mb-3" />
          <div className="h-10 w-64 bg-muted mx-auto rounded mb-14" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-muted/40 rounded-xl" />)}
          </div>
        </div>
     </section>
  );

  const totalPages = Math.ceil(testimonials.length / CARDS_PER_PAGE);
  const goTo = (p: number) => setCurrentPage(((p % totalPages) + totalPages) % totalPages);
  const pageCards = testimonials.slice(currentPage * CARDS_PER_PAGE, (currentPage + 1) * CARDS_PER_PAGE);

  const GridCard = ({ t }: { t: typeof testimonials[0] }) => (
    <div className="glass-card p-5 sm:p-7 flex flex-col items-center text-center hover:glow-effect transition-all duration-300 h-full">
      <div className="w-20 h-20 rounded-full border-4 border-secondary/25 shadow-xl overflow-hidden bg-muted mb-4 shrink-0">
        <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
      </div>
      <div className="font-heading font-bold text-foreground text-[0.9375rem] mb-0.5">{t.name}</div>
      <div className="text-secondary text-[0.8125rem] font-medium mb-2">{t.company}</div>
      <StarRating rating={t.rating} />
      <p className="text-muted-foreground text-[0.875rem] leading-relaxed flex-1">{t.message}</p>
    </div>
  );

  const ListCard = ({ t }: { t: typeof testimonials[0] }) => (
    <div className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center hover:glow-effect transition-all duration-300">
      <div className="flex flex-col items-center shrink-0 sm:w-28">
        <div className="w-[72px] h-[72px] rounded-full border-4 border-secondary/20 shadow-xl overflow-hidden bg-muted">
          <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" />
        </div>
        <div className="font-heading font-semibold text-foreground text-[0.875rem] text-center mt-2">{t.name}</div>
        <div className="text-secondary text-[0.75rem] text-center font-medium">{t.company}</div>
        <StarRating rating={t.rating} />
      </div>
      <div className="flex-1">
        <p className="text-muted-foreground text-[0.875rem] leading-relaxed">{t.message}</p>
      </div>
    </div>
  );

  return (
    <section className="section-padding section-alt">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-14">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest">{header.badge}</span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4">
            {header.title} <span className="gradient-text">{header.highlight}</span>
          </h2>
        </AnimatedSection>

        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.id} delay={i * 0.08}>
                <GridCard t={t} />
              </AnimatedSection>
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col gap-5">
              {pageCards.map((t: any) => (
                <ListCard key={t.id} t={t} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => goTo(currentPage - 1)}
                  className="p-2 rounded-full bg-muted hover:bg-secondary/20 transition-colors text-foreground"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentPage ? "bg-secondary scale-125" : "bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => goTo(currentPage + 1)}
                  className="p-2 rounded-full bg-muted hover:bg-secondary/20 transition-colors text-foreground"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
