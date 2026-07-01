import React, { useState, useMemo, useEffect, useRef } from "react";
import AnimatedSection from "./AnimatedSection";
import { ChevronLeft, ChevronRight, Star, StarHalf, Edit2, FileSpreadsheet, Heart } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useGlobalView } from "./ui-customizer-context";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor } from "./admin/LiveEditorContext";
// @ts-ignore
import HTMLFlipBook from "react-pageflip";

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
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
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

const ReadMoreText = ({ text, clampClass, textClass, section, field, id, onExpandedChange }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string; onExpandedChange?: (expanded: boolean) => void }) => {
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
    <div className="relative text-left w-full group/rm flex flex-col">
      <div
        ref={ref}
        className={`${textClass} ${expanded ? "" : clampClass} [&>span.relative]:block`}
        style={!expanded ? { maxHeight: '58px', overflow: 'hidden' } : {}}
      >
        {section && field ? (
          <EditableText tag="div" section={section} field={field} id={id} value={text} toolbarClassName="top-1 right-1" />
        ) : text}
      </div>
      {overflows && !expanded && (
        <div className="absolute bottom-0 right-0 flex items-center justify-end pl-8 bg-gradient-to-r from-transparent via-card to-card z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); onExpandedChange?.(true); }}
            className="font-bold text-[10.5px] text-primary hover:underline bg-card pl-1 pr-1 whitespace-nowrap"
          >
            ... Read more
          </button>
        </div>
      )}
      {expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false); onExpandedChange?.(false); }}
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
  onDragStart, onDragEnd, onDragOver, onDrop, onMove, onReadMoreToggle
}: {
  t: any, editor: any, hideProfiles: boolean, draggedId: string | null,
  onDragStart: (e: React.DragEvent, id: string) => void,
  onDragEnd: () => void,
  onDragOver: (e: React.DragEvent) => void,
  onDrop: (e: React.DragEvent, id: string) => void,
  onMove: (id: string, dir: "up" | "down" | "left" | "right") => void,
  onReadMoreToggle?: (id: string, expanded: boolean) => void
}) => {
  const companies = useMemo(() => {
    if (!t.company_name) return [];
    return t.company_name.split(',').filter(Boolean).map((c: string) => c.replace(/<[^>]*>?/gm, '').trim());
  }, [t.company_name]);

  const isMarquee = !editor?.isEditMode && companies.length > 1;

  const isExternalAndEdit = editor?.isEditMode && t.isExternalData;
  const borderClasses = isExternalAndEdit
    ? "border border-green-400 dark:border-green-500"
    : "border border-border border-l-4 border-l-orange-400";

  return (
    <div
      className={`glass-card w-full p-3 flex flex-col pb-2 sm:pb-3 text-left hover:glow-effect transition-all duration-300 h-full group/item relative ${borderClasses} rounded-xl ${editor?.isEditMode ? "pb-10" : "pb-[1px]"} ${!t.is_visible ? 'opacity-40 grayscale-[0.5]' : ''} ${draggedId === t.id ? "opacity-20 scale-95" : ""}`}
      draggable={!!editor?.isEditMode}
      onDragStart={(e) => onDragStart(e, t.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, t.id)}
    >
      {isExternalAndEdit && (
        <div className="absolute top-1.5 right-1.5 text-green-500 bg-green-500/10 p-1 rounded-md z-10 pointer-events-none" title="Sourced from External Excel">
          <FileSpreadsheet size={14} strokeWidth={2.5} />
        </div>
      )}
      <EditorToolbar
        section="testimonials"
        id={t.id}
        isVisible={t.is_visible}
        imageField="avatar_url"
        // profileHidden={hideProfiles}
        // onToggleProfile={() => editor?.onUpdate("testimonials", "hide_profiles", !hideProfiles)}
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
          <div className="flex-1 pt-1 pb-3">
            <ReadMoreText
              section="testimonials"
              field="message"
              id={t.id}
              text={(t.message || "").replace(/&nbsp;/g, ' ') || (editor?.isEditMode ? "Client testimonial message goes here." : "")}
              clampClass="line-clamp-2"
              textClass="text-muted-foreground text-[0.75rem] leading-relaxed min-h-[2rem]"
              onExpandedChange={(expanded) => onReadMoreToggle?.(t.id, expanded)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TestimonialsSection = ({ searchTerm, hideAddButton, hideEyeIcon }: { searchTerm?: string, hideAddButton?: boolean, hideEyeIcon?: boolean }) => {
  const view = useGlobalView();
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
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

  const headerContent = useSiteContent("testimonials");
  const editor = useLiveEditor();
  const { data: rawTestimonials, isLoading: isDataLoading } = useDbQuery<any[]>("testimonials", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order", asc: true });

  const [internalExternalData, setInternalExternalData] = useState<any[]>([]);
  const [testimonialsState, setTestimonialsState] = useState<any[]>([]);

  useEffect(() => {
    let combined = [...(rawTestimonials || [])];
    let externalFiltered = internalExternalData || [];
    if (!editor?.isEditMode) {
      externalFiltered = externalFiltered.filter((t: any) => t.is_visible === 1 || t.is_visible === true);
    }
    if (externalFiltered.length > 0) {
      combined = [...combined, ...externalFiltered.map((t: any) => ({ ...t, isExternalData: true }))];
    }
    combined.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setTestimonialsState(combined);
  }, [rawTestimonials, internalExternalData, editor?.isEditMode]);

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
    }).filter((t: any) => !editor?.pendingChanges[`testimonials:${t.id}:_delete`]) : [];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(t =>
        (t.name || "").toLowerCase().includes(lower) ||
        (t.company || "").toLowerCase().includes(lower) ||
        (t.company_name || "").toLowerCase().includes(lower) ||
        (t.message || "").toLowerCase().includes(lower)
      );
    }

    list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return list;
  }, [testimonialsState, editor?.pendingChanges, searchTerm]);

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
  const [expandedBookTestimonials, setExpandedBookTestimonials] = useState<Set<string>>(new Set());

  const handleBookReadMoreToggle = (id: string, expanded: boolean) => {
    setExpandedBookTestimonials(prev => {
      const next = new Set(prev);
      if (expanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

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


  const hideProfilesDraft = editor?.pendingChanges["testimonials:hide_profiles"] ?? headerContent.hide_profiles;
  const hideProfiles = hideProfilesDraft === "true" || hideProfilesDraft === true;



  const GAP = 24;
  const CARD_W = 350;

  const numCards = testimonials.length;
  // Pages map to columns: 3 cards per page vertically.
  const cardsPerPage = 3;

  const pages = [];
  for (let i = 0; i < numCards; i += cardsPerPage) {
    pages.push(testimonials.slice(i, i + cardsPerPage));
  }

  // if pages is odd, we could push an empty page to make the back cover or right page blank, but pageflip handles it.

  const bookRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPauseHint, setShowPauseHint] = useState(false);
  const slideshowRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalPages = pages.length + 2; // cover + pages + back cover

  const goNext = () => bookRef.current?.pageFlip()?.flipNext();
  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();

  // Auto-slideshow effect
  useEffect(() => {
    if (isPlaying && pages.length > 0) {
      slideshowRef.current = setInterval(() => {
        const flipbook = bookRef.current?.pageFlip();
        if (!flipbook) return;
        const currentPage = flipbook.getCurrentPageIndex();
        const total = flipbook.getPageCount();
        if (currentPage >= total - 2) {
          flipbook.flip(0);
        } else {
          flipbook.flipNext();
        }
      }, 4000);
    }
    return () => { if (slideshowRef.current) clearInterval(slideshowRef.current); };
  }, [isPlaying, pages.length]);

  const handleBookClick = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setShowPauseHint(true);
      setTimeout(() => setShowPauseHint(false), 2000);
    }
  };

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
            <SectionHeaderToolbar section="testimonials" hideAddButton={hideAddButton} hideEyeIcon={hideEyeIcon} isVisible={headerContent.is_visible !== false} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
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
          <div className="max-w-[1250px] mx-auto w-full relative group/book px-8 md:px-0" onClick={handleBookClick}>
            {pages.length > 0 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-1 md:left-[-3.5rem] top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 shadow-lg opacity-100 md:opacity-0 group-hover/book:opacity-100 transition-all text-primary hover:scale-105">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-1 md:right-[-3.5rem] top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 shadow-lg opacity-100 md:opacity-0 group-hover/book:opacity-100 transition-all text-primary hover:scale-105">
                  <ChevronRight size={24} />
                </button>

                {/* Pause hint toast */}
                {showPauseHint && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className="bg-black/70 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 animate-fade-in">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                      Slideshow paused — click to resume
                    </div>
                  </div>
                )}


                {/* Ultra-Premium Diary Cover Wrapper */}
                <div className="w-full relative shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] rounded-md md:rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 border-t border-white/20 border-b-[4px] border-b-black/30 border-r-[3px] border-r-black/20 p-2 md:p-4 pb-3 md:pb-5 pr-3 md:pr-6 mx-auto z-10">

                  {/* Diary Stitching Effect (Debossed groove + bright theme-colored thread) */}
                  <div className="absolute top-1 left-1 bottom-1.5 right-1.5 md:top-2 md:left-2 md:bottom-2.5 md:right-3 border-[2px] border-dashed rounded-sm md:rounded-lg pointer-events-none z-0 opacity-90 border-secondary/90 dark:border-white/70" style={{ outline: '2px solid rgba(0,0,0,0.15)', outlineOffset: '-2px', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.5)' }} />

                  {/* Classic Diary Ribbon Bookmark */}
                  <div className="absolute left-[65%] -bottom-4 md:-bottom-6 w-4 md:w-6 h-12 md:h-16 bg-red-600/90 shadow-[0_4px_6px_rgba(0,0,0,0.3)] z-0 origin-top rotate-[-2deg]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }} />

                  <div className="w-full relative aspect-[625/600] md:aspect-[1250/560] rounded-sm bg-gradient-to-r from-[#e5e2da] via-[#faf8f5] to-[#e5e2da] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.3),_inset_0_2px_15px_rgba(0,0,0,0.1)] z-10 p-[3px] md:p-[6px]">
                    {/* Bulk page stack effect on margins */}
                    {/* Left stack lines */}
                    <div className="absolute left-[1px] top-1 bottom-1 w-[2px] md:w-[5px] pointer-events-none z-0 opacity-80 border-r border-[#d4d1c9]/40 dark:border-slate-800"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
                      }} />
                    {/* Right stack lines */}
                    <div className="absolute right-[1px] top-1 bottom-1 w-[2px] md:w-[5px] pointer-events-none z-0 opacity-80 border-l border-[#d4d1c9]/40 dark:border-slate-800"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(270deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
                      }} />
                    {/* Bottom stack lines */}
                    <div className="absolute bottom-[1px] left-1 right-1 h-[2px] md:h-[5px] pointer-events-none z-0 opacity-80 border-t border-[#d4d1c9]/40 dark:border-slate-800"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
                      }} />


                    {/* Realistic Deep Spine Fold */}
                    {!isMobile && (
                      <>
                        {/* Broad deep shadow for page curvature */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[60px] -ml-[30px] pointer-events-none z-50 bg-gradient-to-r from-transparent via-black/30 to-transparent mix-blend-multiply dark:mix-blend-normal" />
                        {/* Crisp dark center crease (narrower so pages look closer) */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[3px] -ml-[1.5px] pointer-events-none z-50 bg-black/80 shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                        {/* Page curvature highlights to enhance 3D depth */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[20px] -ml-[35px] pointer-events-none z-50 bg-gradient-to-r from-transparent to-white/20 mix-blend-overlay" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-[20px] ml-[15px] pointer-events-none z-50 bg-gradient-to-l from-transparent to-white/20 mix-blend-overlay" />
                      </>
                    )}

                    {/* @ts-ignore */}
                    <HTMLFlipBook
                      width={625}
                      height={550}
                      size="stretch"
                      minWidth={300}
                      maxWidth={625}
                      minHeight={400}
                      maxHeight={800}
                      maxShadowOpacity={0.5}
                      showCover={false}
                      mobileScrollSupport={true}
                      usePortrait={isMobile}
                      flippingTime={600}
                      className="test-flipbook mx-auto bg-card"
                      ref={bookRef}
                    >
                      {[
                        /* Premium Welcome Cover Page */
                        <div key="cover-page" className="bg-gradient-to-r from-card via-card to-card/95 shadow-[inset_-20px_0_40px_-10px_rgba(0,0,0,0.03)] dark:shadow-[inset_-20px_0_40px_-10px_rgba(0,0,0,0.4)] border-r-[3px] border-r-[#e5e7eb] dark:border-r-[#1f2937] border-b-[3px] border-b-[#d1d5db] dark:border-b-[#111827] overflow-hidden page-turn-item relative flex flex-col items-center justify-center p-3 md:p-6">
                          <div className="absolute inset-3 md:inset-5 border border-orange-400/40 rounded-[2rem] flex flex-col items-center justify-center text-center p-4 pb-8 overflow-hidden">
                            {/* Halftone Dot Patterns */}
                            <div className="absolute top-0 right-0 w-48 h-48 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1.5px, transparent 1.5px)', backgroundSize: '10px 10px', WebkitMaskImage: 'radial-gradient(circle at top right, black 20%, transparent 70%)' }} />
                            <div className="absolute bottom-0 left-0 w-48 h-48 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1.5px, transparent 1.5px)', backgroundSize: '10px 10px', WebkitMaskImage: 'radial-gradient(circle at bottom left, black 20%, transparent 70%)' }} />

                            <div className="mt-auto flex flex-col items-center justify-center w-full relative z-10">
                              <h2 className="text-5xl md:text-6xl text-orange-500 font-serif italic mb-3" style={{ fontFamily: 'cursive' }}>Welcome</h2>
                              <h3 className="text-[10px] md:text-xs font-bold tracking-[0.2em] text-primary uppercase mb-8">To Our Client Feedback Book</h3>

                              <div className="flex items-center gap-4 mb-10 w-full justify-center">
                                <div className="h-px bg-amber-400/50 w-12 md:w-16"></div>
                                <Star className="text-amber-500 fill-amber-500 w-5 h-5" />
                                <div className="h-px bg-amber-400/50 w-12 md:w-16"></div>
                              </div>

                              <div className="w-14 h-14 md:w-16 md:h-16 bg-orange-500 rounded-xl flex items-center justify-center mb-8 relative shadow-md">
                                <span className="text-white text-4xl md:text-5xl font-serif font-bold leading-none mt-2">“</span>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 rotate-45"></div>
                              </div>

                              <h4 className="text-base md:text-lg font-bold text-primary mb-3">We value your feedback!</h4>
                              <p className="text-[11px] md:text-xs text-muted-foreground max-w-[220px] md:max-w-[260px] leading-relaxed">
                                These testimonials reflect our commitment to delivering the best solutions and support to our valued clients.
                              </p>
                            </div>

                            <div className="flex items-center gap-4 w-full justify-center mt-auto mb-2">
                              <div className="h-px bg-red-400/50 w-10 md:w-12"></div>
                              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                              <div className="h-px bg-red-400/50 w-10 md:w-12"></div>
                            </div>
                          </div>
                          {/* Elegant Page Number */}
                          <div className="hidden">1</div>
                        </div>,

                        ...pages.map((pageCards, pIdx) => {
                          const isPageExpanded = pageCards.some((t) => expandedBookTestimonials.has(t.id));

                          return (
                          <div key={`page-${pIdx}`} className="bg-gradient-to-r from-card via-card to-card/95 shadow-[inset_-20px_0_40px_-10px_rgba(0,0,0,0.03)] dark:shadow-[inset_-20px_0_40px_-10px_rgba(0,0,0,0.4)] border-r-[3px] border-r-[#e5e7eb] dark:border-r-[#1f2937] border-b-[3px] border-b-[#d1d5db] dark:border-b-[#111827] page-turn-item relative">
                            <div className={`w-full h-full ${isPageExpanded ? "overflow-y-auto no-scrollbar" : "overflow-hidden"} flex flex-col relative pt-3 md:pt-5`}>
                              <div className="flex flex-col gap-3 px-3 md:px-5 w-full shrink-0 relative z-10">
                                {pageCards.map((t, rIdx) => (
                                  <div key={`${t.id}-${rIdx}`} className="overflow-hidden w-full">
                                    <GridCard
                                      t={t}
                                      editor={editor}
                                      hideProfiles={hideProfiles}
                                      draggedId={null}
                                      onDragStart={() => { }}
                                      onDragEnd={() => { }}
                                      onDragOver={() => { }}
                                      onDrop={() => { }}
                                      onMove={() => { }}
                                      onReadMoreToggle={handleBookReadMoreToggle}
                                    />
                                  </div>
                                ))}
                              </div>
                              {/* Elegant Page Number — inside flex so it's never clipped */}
                              <div className="shrink-0 w-full text-center text-[10px] md:text-[11px] text-primary font-bold font-serif pointer-events-none select-none py-2 md:py-3 mt-auto">
                                {pIdx + 1}
                              </div>
                            </div>
                          </div>
                          );
                        }),

                        /* Premium Thank You Back Cover Page */
                        <div key="back-cover" className="bg-gradient-to-r from-card via-card to-card/95 shadow-[inset_-20px_0_40px_-10px_rgba(0,0,0,0.03)] dark:shadow-[inset_-20px_0_40px_-10px_rgba(0,0,0,0.4)] border-r-[3px] border-r-[#e5e7eb] dark:border-r-[#1f2937] border-b-[3px] border-b-[#d1d5db] dark:border-b-[#111827] overflow-hidden page-turn-item relative flex flex-col items-center justify-center p-3 md:p-6">
                          <div className="absolute inset-3 md:inset-5 border border-orange-400/40 rounded-[2rem] flex flex-col items-center justify-center text-center p-4 pb-8 overflow-hidden">

                            {/* Halftone Dot Patterns */}
                            <div className="absolute top-0 right-0 w-48 h-48 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1.5px, transparent 1.5px)', backgroundSize: '10px 10px', WebkitMaskImage: 'radial-gradient(circle at top right, black 20%, transparent 70%)' }} />
                            <div className="absolute bottom-0 left-0 w-48 h-48 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f97316 1.5px, transparent 1.5px)', backgroundSize: '10px 10px', WebkitMaskImage: 'radial-gradient(circle at bottom left, black 20%, transparent 70%)' }} />

                            <div className="my-auto flex flex-col items-center justify-center w-full relative z-10 pt-4">
                              <h2 className="text-5xl md:text-6xl text-orange-500 font-serif italic mb-3" style={{ fontFamily: 'cursive' }}>Thank You!</h2>
                              <h3 className="text-[10px] md:text-xs font-bold tracking-[0.15em] text-primary uppercase mb-8">For Sharing Your Feedback</h3>

                              <div className="flex items-center gap-4 mb-10 w-full justify-center">
                                <div className="h-px bg-amber-400/50 w-12 md:w-16"></div>
                                <Star className="text-amber-500 fill-amber-500 w-5 h-5" />
                                <div className="h-px bg-amber-400/50 w-12 md:w-16"></div>
                              </div>

                              <div className="mb-8">
                                <svg className="w-14 h-14 md:w-16 md:h-16 text-red-500" fill="currentColor" viewBox="0 0 24 24" stroke="none"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                              </div>

                              <p className="text-xs md:text-sm font-bold text-primary max-w-[250px] leading-relaxed mb-4">
                                Your feedback inspires us to improve and deliver even better solutions.
                              </p>
                              <p className="text-xs md:text-sm font-bold text-primary max-w-[250px] leading-relaxed">
                                We truly appreciate your time and valuable feedback!
                              </p>
                            </div>

                          </div>
                          {/* Elegant Page Number */}
                          <div className="hidden">
                            {pages.length + 2}
                          </div>
                        </div>
                      ]}
                    </HTMLFlipBook>
                  </div>
                </div>

                {/* Play/Pause toggle — sits neatly below the book */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(p => !p); }}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold border border-border bg-card text-primary hover:bg-secondary/10 shadow-md transition-all"
                    title={isPlaying ? "Pause Auto Page Turn" : "Resume Auto Page Turn"}
                  >
                    {isPlaying ? (
                      <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> Pause Auto Page Turn</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> Resume Auto Page Turn</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
