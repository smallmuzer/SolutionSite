import React, { useState, useMemo, useEffect, useRef } from "react";
import AnimatedSection from "./AnimatedSection";
import { ChevronLeft, ChevronRight, Star, StarHalf, Edit2 } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useGlobalView } from "./ui-customizer-context";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor } from "./admin/LiveEditorContext";

const AVATAR_MAP: Record<string, string> = {};
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&color=fff&name=";

const CARDS_PER_PAGE = 6;

const MARQUEE_STYLE = `
@keyframes testimonials-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-50% - 0.375rem)); }
}
.animate-t-marquee {
  animation: testimonials-marquee 12s linear infinite;
}
.pause-marquee:hover .animate-t-marquee {
  animation-play-state: paused;
}
`;

const StarRating = ({ rating, id, editor }: { rating: number, id?: string, editor?: any }) => {
  const safeRating = Math.max(0, Math.min(5, rating || 5));
  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating % 1 >= 0.5;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editor?.isEditMode || !id) return;
    const newRating = window.prompt("Enter new rating (0-5) allowing decimals:", safeRating.toString());
    if (newRating !== null) {
      const parsed = parseFloat(newRating);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
        editor.onUpdate("testimonials", "rating", parsed, id);
      } else {
        alert("Please enter a valid number between 0 and 5.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-3 group/star">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const fillPercentage = Math.max(0, Math.min(1, safeRating - i));
          if (fillPercentage === 1) {
            return <Star key={i} size={12} className="text-amber-400 fill-amber-400" />;
          } else if (fillPercentage > 0) {
            return (
              <div key={i} className="relative inline-block" style={{ width: 12, height: 12 }}>
                <Star size={12} className="text-muted-foreground/30 absolute inset-0" />
                <Star size={12} className="text-amber-400 fill-amber-400 absolute inset-0" style={{ clipPath: `inset(0 ${100 - (fillPercentage * 100)}% 0 0)` }} />
              </div>
            );
          } else {
            return <Star key={i} size={12} className="text-muted-foreground/30" />;
          }
        })}
      </div>
      <span className="text-[11px] font-bold text-muted-foreground ml-0.5">{safeRating.toFixed(1)}</span>
      {editor?.isEditMode && id && (
        <button
          onClick={handleEdit}
          className="p-1 rounded-md opacity-0 group-hover/star:opacity-100 bg-secondary/10 hover:bg-secondary/20 text-secondary transition-all"
          title="Edit Star Rating"
        >
          <Edit2 size={12} />
        </button>
      )}
    </div>
  );
};

const ReadMoreText = ({ text, clampClass, textClass, section, field, id }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string }) => {
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
    <div className="relative text-left w-full group/rm">
      <div ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
          <EditableText section={section} field={field} id={id} value={text} />
        ) : text}
      </div>
      {overflows && !expanded && (
        <div className="absolute bottom-[1px] right-0 flex items-center justify-end pl-8 bg-gradient-to-r from-transparent via-card to-card">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="font-bold text-[10.5px] text-primary hover:underline bg-card pl-0.5 pr-1 whitespace-nowrap"
          >
            ... Read more
          </button>
        </div>
      )}
      {expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          className="font-bold text-[10.5px] text-primary hover:underline mt-1 block w-full text-left"
        >
          Read less
        </button>
      )}
    </div>
  );
};

const GridCard = ({
  t, editor, hideProfiles, draggedId,
  onDragStart, onDragEnd, onDragOver, onDrop, onMove
}: {
  t: any, editor: any, hideProfiles: boolean, draggedId: string | null,
  onDragStart: (e: React.DragEvent, id: string) => void,
  onDragEnd: () => void,
  onDragOver: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent, id: string) => void,
  onMove: (id: string, dir: "up" | "down" | "left" | "right") => void
}) => {
  const companies = useMemo(() => {
    if (!t.company_name) return [];
    return t.company_name.split(',').filter(Boolean).map((c: string) => c.replace(/<[^>]*>?/gm, '').trim());
  }, [t.company_name]);

  const isMarquee = !editor?.isEditMode && companies.length > 1;

  return (
    <div
      className={`glass-card p-3 flex flex-col pb-2 sm:pb-3 text-left hover:glow-effect transition-all duration-300 h-full group/item relative border border-border border-l-4 border-l-orange-400 rounded-xl ${editor?.isEditMode ? "pb-10" : "pb-[1px]"} ${!t.is_visible ? 'opacity-40 grayscale-[0.5]' : ''} ${draggedId === t.id ? "opacity-20 scale-95" : ""}`}
      draggable={!!editor?.isEditMode}
      onDragStart={(e) => onDragStart(e, t.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, t.id)}
    >
      <EditorToolbar
        section="testimonials"
        id={t.id}
        isVisible={t.is_visible}
        imageField="avatar_url"
        profileHidden={hideProfiles}
        onToggleProfile={() => editor?.onUpdate("testimonials", "hide_profiles", !hideProfiles)}
        className="-top-5 right-2"
      />
      {editor?.isEditMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); onMove(t.id, "up"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(t.id, "down"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Down">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(t.id, "left"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Left">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(t.id, "right"); }} className="p-1.5 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-lg" title="Move Right">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}
      <div className="relative z-10 flex flex-col w-full h-full">
        <div className="flex flex-col mb-2 w-full">
          <div className="flex justify-between items-start w-full">
            <div className="font-heading font-bold text-foreground text-[0.875rem] leading-none flex-1 pr-2 min-w-0 text-left pt-1">
              <EditableText section="testimonials" field="name" id={t.id} value={t.name || (editor?.isEditMode ? "Client Name" : "")} />
            </div>
            <div className="shrink-0">
              <StarRating rating={t.rating} id={t.id} editor={editor} />
            </div>
          </div>
          <div className="text-secondary text-[0.75rem] font-medium leading-none w-full text-left -mt-1.5">
            <EditableText section="testimonials" field="company" id={t.id} value={t.company || (editor?.isEditMode ? "Role / Position" : "")} />
          </div>
        </div>

        <div className="flex overflow-hidden mb-0.5 min-h-[1.25rem] w-full items-center relative pause-marquee">
          {editor?.isEditMode ? (
            <span className="text-[0.6rem] font-bold uppercase tracking-wider text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap max-w-full overflow-hidden text-ellipsis block min-w-[50px] min-h-[1.2rem]">
              <EditableText section="testimonials" field="company_name" id={t.id} value={t.company_name || "Company Name"} />
            </span>
          ) : companies.length > 0 ? (
            <div className={`flex flex-nowrap gap-1.5 w-max ${isMarquee ? 'animate-t-marquee' : ''}`}>
              {companies.map((c, i) => (
                <span key={i} className="text-[0.6rem] font-bold uppercase tracking-wider text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                  {c}
                </span>
              ))}
              {isMarquee && companies.map((c, i) => (
                <span key={`dup-${i}`} className="text-[0.6rem] font-bold uppercase tracking-wider text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap" aria-hidden="true">
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </div>


        <div className="flex gap-2 flex-1 w-full mt-0">
          <div className="text-primary text-3xl font-serif leading-none opacity-40 select-none mt-1">“</div>
          <div className="flex-1 pt-1">
            <ReadMoreText
              section="testimonials"
              field="message"
              id={t.id}
              text={(t.message || "").replace(/&nbsp;/g, ' ') || (editor?.isEditMode ? "Client testimonial message goes here." : "")}
              clampClass="line-clamp-3"
              textClass="text-muted-foreground text-[0.75rem] leading-relaxed min-h-[2rem]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TestimonialsSection = ({ searchTerm }: { searchTerm?: string }) => {
  const view = useGlobalView();
  const [currentPage, setCurrentPage] = useState(0);
  const userInteractedRef = useRef(false);
  const pausedRef = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile]);

  const headerContent = useSiteContent("testimonials");
  const editor = useLiveEditor();
  const { data: rawTestimonials, isLoading: isDataLoading } = useDbQuery<any[]>("testimonials", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order", asc: true });

  const [testimonialsState, setTestimonialsState] = useState<any[]>([]);
  useEffect(() => { if (rawTestimonials) setTestimonialsState(rawTestimonials); }, [rawTestimonials]);

  const [internalExternalData, setInternalExternalData] = useState<any[]>([]);
  const excelPathDraft = editor?.pendingChanges["testimonials:external_excel_path"];
  const excelPath = excelPathDraft !== undefined ? excelPathDraft : (headerContent?.external_excel_path || "");
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const handler = () => setRefetchTrigger(prev => prev + 1);
    window.addEventListener("ss:contentSaved", handler);
    return () => window.removeEventListener("ss:contentSaved", handler);
  }, []);

  useEffect(() => {
    if (!excelPath) {
      setInternalExternalData([]);
      return;
    }
    const fetchExternal = async () => {
      try {
        const res = await fetch("/api/read_external_excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: excelPath })
        });
        const json = await res.json();
        if (json.data) setInternalExternalData(json.data);
      } catch (err) {
        console.error("Failed to read external excel inside section", err);
      }
    };
    fetchExternal();
  }, [excelPath, refetchTrigger]);

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

    const sourceIdx = testimonialsState.findIndex(t => t.id === draggedId);
    const targetIdx = testimonialsState.findIndex(t => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newItems = [...testimonialsState];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);
    setTestimonialsState(newItems);

    newItems.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        editor.onUpdate("testimonials", "sort_order", idx, item.id);
      }
    });
    setDraggedId(null);
  };

  const handleMove = async (id: string, direction: "up" | "down" | "left" | "right") => {
    if (!editor?.isEditMode || !testimonialsState) return;
    const idx = testimonialsState.findIndex(t => t.id === id);
    if (idx === -1) return;

    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = -3; // Based on lg:grid-cols-3 layout
    else if (direction === "down") step = 3;

    const targetIdx = Math.max(0, Math.min(testimonialsState.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newItems = [...testimonialsState];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);
    setTestimonialsState(newItems);

    newItems.forEach((item, i) => {
      if (item.sort_order !== i) {
        editor.onUpdate("testimonials", "sort_order", i, item.id);
      }
    });
  };

  const header = {
    badge: headerContent.badge || "Testimonials",
    title: headerContent.title || "What Our",
    highlight: headerContent.highlight || "Clients Say",
  };

  const testimonials = useMemo(() => {
    let list = testimonialsState ? testimonialsState.map((t: any) => {
      return {
        ...t,
        name: editor?.pendingChanges[`testimonials:${t.id}:name`] ?? t.name,
        company: editor?.pendingChanges[`testimonials:${t.id}:company`] ?? t.company,
        company_name: editor?.pendingChanges[`testimonials:${t.id}:company_name`] ?? t.company_name,
        message: editor?.pendingChanges[`testimonials:${t.id}:message`] ?? t.message,
        rating: editor?.pendingChanges[`testimonials:${t.id}:rating`] ?? t.rating,
        is_visible: editor?.pendingChanges[`testimonials:${t.id}:is_visible`] ?? t.is_visible,
        avatar_url: editor?.pendingChanges[`testimonials:${t.id}:avatar_url`] ?? t.avatar_url,
        sort_order: editor?.pendingChanges[`testimonials:${t.id}:sort_order`] ?? t.sort_order,
      };
    }) : [];

    let externalFiltered = internalExternalData || [];
    if (!editor?.isEditMode) {
      externalFiltered = externalFiltered.filter((t: any) => t.is_visible === 1 || t.is_visible === true);
    }
    if (externalFiltered.length > 0) {
      list = [...list, ...externalFiltered];
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(t =>
        (t.name || "").toLowerCase().includes(lower) ||
        (t.company || "").toLowerCase().includes(lower) ||
        (t.company_name || "").toLowerCase().includes(lower) ||
        (t.message || "").toLowerCase().includes(lower)
      );
    }
    return list;
  }, [testimonialsState, editor?.pendingChanges, searchTerm, internalExternalData, editor?.isEditMode]);

  const hideProfilesDraft = editor?.pendingChanges["testimonials:hide_profiles"] ?? headerContent.hide_profiles;
  const hideProfiles = hideProfilesDraft === "true" || hideProfilesDraft === true;



  const currentCardsPerPage = isMobile ? 1 : CARDS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(testimonials.length / currentCardsPerPage));

  const goTo = (p: number, interaction = false) => {
    if (interaction) userInteractedRef.current = true;
    setCurrentPage(((p % totalPages) + totalPages) % totalPages);
  };

  const pageCards = testimonials.slice(currentPage * currentCardsPerPage, (currentPage + 1) * currentCardsPerPage);

  useEffect(() => {
    if (!isMobile || editor?.isEditMode || totalPages <= 1) return;
    const interval = setInterval(() => {
      if (!userInteractedRef.current && !pausedRef.current) {
        setCurrentPage(prev => (prev + 1) % totalPages);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isMobile, editor?.isEditMode, totalPages]);

  if (!editor?.isEditMode && headerContent?.is_visible === false) return null;

  if (isDataLoading) return (
    <section className="section-padding section-alt animate-pulse">
      <div className="container-wide">
        <div className="h-4 w-24 bg-muted mx-auto rounded mb-3" />
        <div className="h-10 w-64 bg-muted mx-auto rounded mb-14" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted/40 rounded-xl" />)}
        </div>
      </div>
    </section>
  );

  return (
    <section id="testimonials" className="section-padding section-alt relative group">
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_STYLE }} />
      <div className="container-wide">
        <AnimatedSection className="text-center mb-6">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: headerContent.badge_color || undefined }}>
            <EditableText section="testimonials" field="badge" value={header.badge || "Testimonials"} colorField="badge_color" />
          </span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-2 relative" style={{ color: headerContent.title_color || undefined }}>
            <span>
              <EditableText section="testimonials" field="title" value={header.title || "What Our"} colorField="title_color" />{" "}
              <span className="gradient-text" style={{ color: headerContent.highlight_color || undefined, background: headerContent.highlight_color ? "none" : undefined, WebkitTextFillColor: headerContent.highlight_color ? "initial" : undefined }}>
                <EditableText section="testimonials" field="highlight" value={header.highlight || "Clients Say"} colorField="highlight_color" />
              </span>
            </span>
            <SectionHeaderToolbar section="testimonials" isVisible={headerContent.is_visible !== false} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
          </h2>
        </AnimatedSection>

        {editor?.isEditMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch max-w-[85rem] mx-auto overflow-y-auto max-h-[80vh] p-2 custom-scrollbar">
            {testimonials.map((t) => (
              <GridCard
                key={t.id}
                t={t}
                editor={editor}
                hideProfiles={hideProfiles}
                draggedId={draggedId}
                onDragStart={handleDragStart}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMove={handleMove}
              />
            ))}
          </div>
        ) : (
          <div
            className="max-w-[85rem] mx-auto px-4 overflow-hidden"
            onMouseEnter={() => pausedRef.current = true}
            onMouseLeave={() => pausedRef.current = false}
            onTouchStart={() => pausedRef.current = true}
            onTouchEnd={() => pausedRef.current = false}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out w-full"
              style={{ transform: `translateX(-${currentPage * 100}%)` }}
            >
              {Array.from({ length: totalPages }).map((_, pageIdx) => (
                <div key={pageIdx} className="w-full flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch px-1">
                  {testimonials.slice(pageIdx * currentCardsPerPage, (pageIdx + 1) * currentCardsPerPage).map((t) => (
                    <div key={t.id} className="h-full">
                      <GridCard
                        t={t}
                        editor={editor}
                        hideProfiles={hideProfiles}
                        draggedId={draggedId}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggedId(null)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onMove={handleMove}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-6 mt-12">
                <button
                  onClick={() => goTo(currentPage - 1, true)}
                  className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all text-foreground shadow-sm group/nav"
                >
                  <ChevronLeft size={20} className="group-hover/nav:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex gap-2.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i, true)}
                      className={`h-1.5 rounded-full transition-all ${i === currentPage ? "w-8 bg-secondary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => goTo(currentPage + 1, true)}
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
