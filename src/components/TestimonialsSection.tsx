import { useState, useMemo } from "react";
import AnimatedSection from "./AnimatedSection";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useGlobalView } from "./ui-customizer-context";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor } from "./admin/LiveEditorContext";

const AVATAR_MAP: Record<string, string> = {};
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&color=fff&name=";

const CARDS_PER_PAGE = 4;

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

  const headerContent = useSiteContent("testimonials");
  const editor = useLiveEditor();
  const { data: rawTestimonials, isLoading: isDataLoading } = useDbQuery<any[]>("testimonials", editor?.isEditMode ? {} : { is_visible: true }, { order: "created_at", asc: false });

  const header = {
    badge: headerContent.badge || "Testimonials",
    title: headerContent.title || "What Our",
    highlight: headerContent.highlight || "Clients Say",
  };

  const testimonials = useMemo(() => {
    return rawTestimonials ? rawTestimonials.map((t: any) => ({
      id: t.id, name: t.name, company: t.company, rating: t.rating ?? 5,
      message: t.message,
      avatar_url: t.avatar_url || "",
      is_visible: t.is_visible,
    })) : [];
  }, [rawTestimonials]);

  if (isDataLoading) return (
    <section className="section-padding section-alt animate-pulse">
      <div className="container-wide">
        <div className="h-4 w-24 bg-muted mx-auto rounded mb-3" />
        <div className="h-10 w-64 bg-muted mx-auto rounded mb-14" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted/40 rounded-xl" />)}
        </div>
      </div>
    </section>
  );

  const totalPages = Math.ceil(testimonials.length / CARDS_PER_PAGE);
  const goTo = (p: number) => setCurrentPage(((p % totalPages) + totalPages) % totalPages);
  const pageCards = testimonials.slice(currentPage * CARDS_PER_PAGE, (currentPage + 1) * CARDS_PER_PAGE);

  const GridCard = ({ t }: { t: typeof testimonials[0] }) => (
    <div className={`glass-card p-5 sm:p-7 flex flex-col items-center text-center hover:glow-effect transition-all duration-300 h-full group/item relative ${!t.is_visible ? 'opacity-40 grayscale-[0.5]' : ''}`}>
      <EditorToolbar section="testimonials" id={t.id} isVisible={t.is_visible} imageField="avatar_url" />
      <div className="w-20 h-20 rounded-full border-4 border-secondary/25 shadow-xl overflow-hidden bg-muted mb-4 shrink-0">
        <img src={t.avatar_url || `${DEFAULT_AVATAR}${encodeURIComponent(t.name)}`} alt={t.name} className="w-full h-full object-cover" />
      </div>
      <div className="font-heading font-bold text-foreground text-[0.9375rem] mb-0.5">
        <EditableText section="testimonials" field="name" id={t.id} value={t.name} />
      </div>
      <div className="text-secondary text-[0.8125rem] font-medium mb-2">
        <EditableText section="testimonials" field="company" id={t.id} value={t.company} />
      </div>
      <StarRating rating={t.rating} />
      <p className="text-muted-foreground text-[0.875rem] leading-relaxed flex-1">
        <EditableText section="testimonials" field="message" id={t.id} value={t.message} />
      </p>
    </div>
  );

  const ListCard = ({ t }: { t: typeof testimonials[0] }) => (
    <div className={`glass-card p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center hover:glow-effect transition-all duration-300 group/item relative ${!t.is_visible ? 'opacity-40 grayscale-[0.5]' : ''}`}>
      <EditorToolbar section="testimonials" id={t.id} isVisible={t.is_visible} />
      <div className="flex flex-col items-center shrink-0 sm:w-28">
        <div className="w-[72px] h-[72px] rounded-full border-4 border-secondary/20 shadow-xl overflow-hidden bg-muted">
          <img src={t.avatar_url || `${DEFAULT_AVATAR}${encodeURIComponent(t.name)}`} alt={t.name} className="w-full h-full object-cover" />
        </div>
        <div className="font-heading font-semibold text-foreground text-[0.875rem] text-center mt-2">
          <EditableText section="testimonials" field="name" id={t.id} value={t.name} />
        </div>
        <div className="text-secondary text-[0.75rem] text-center font-medium">
          <EditableText section="testimonials" field="company" id={t.id} value={t.company} />
        </div>
        <StarRating rating={t.rating} />
      </div>
      <div className="flex-1">
        <p className="text-muted-foreground text-[0.875rem] leading-relaxed">
          <EditableText section="testimonials" field="message" id={t.id} value={t.message} />
        </p>
      </div>
    </div>
  );

  return (
    <section id="testimonials" className="section-padding section-alt relative group">
      <SectionHeaderToolbar section="testimonials" isVisible={headerContent.is_visible !== false} />
      <div className="container-wide">
        <AnimatedSection className="text-center mb-14">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest">
            <EditableText section="testimonials" field="badge" value={header.badge || "Testimonials"} />
          </span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4">
            <EditableText section="testimonials" field="title" value={header.title || "What Our"} />{" "}
            <span className="gradient-text">
              <EditableText section="testimonials" field="highlight" value={header.highlight || "Clients Say"} />
            </span>
          </h2>
        </AnimatedSection>

        {editor?.isEditMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch max-w-[90rem] mx-auto overflow-y-auto max-h-[80vh] p-2 custom-scrollbar">
            {testimonials.map((t) => (
              <GridCard key={t.id} t={t} />
            ))}
          </div>
        ) : (
          <div className="max-w-[90rem] mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch transition-all duration-500">
              {pageCards.map((t, i) => (
                <AnimatedSection key={t.id} delay={i * 0.08} className="h-full">
                  <GridCard t={t} />
                </AnimatedSection>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-6 mt-12">
                <button
                  onClick={() => goTo(currentPage - 1)}
                  className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all text-foreground shadow-sm group/nav"
                >
                  <ChevronLeft size={20} className="group-hover/nav:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex gap-2.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`h-1.5 rounded-full transition-all ${i === currentPage ? "w-8 bg-secondary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => goTo(currentPage + 1)}
                  className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all text-foreground shadow-sm group/nav"
                >
                  <ChevronRight size={20} className="group-hover/nav:translate-x-0.5 transition-transform" />
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
