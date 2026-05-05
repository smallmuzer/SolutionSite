import { useEffect, useState } from "react";
import AnimatedSection from "./AnimatedSection";
import {
  Briefcase, MapPin, Clock,
  Code2, Smartphone, Palette, BarChart2, Database,
  Users, Globe, Shield, Headphones, PenTool, TrendingUp,
  Monitor, Cloud, Search, Megaphone, Lock, Server, Cpu,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useGlobalView, useCardStyle } from "./ui-customizer-context";
import { toast } from "sonner";
import { dbInsert } from "@/lib/api";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

type CareerJob = Tables<"career_jobs">;

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase, Code2, Smartphone, Palette, BarChart2, Database,
  Users, Globe, Shield, Headphones, PenTool, TrendingUp,
  Monitor, Cloud, Search, Megaphone, Lock, Server, Cpu,
};

const JOB_ICONS: Array<{ keys: string[]; icon: string; bg: string; fg: string }> = [
  { keys: ["full stack", "backend", "frontend", "developer", "engineer", "software"], icon: "Code2",      bg: "#1e40af", fg: "#93c5fd" },
  { keys: ["mobile", "android", "ios", "flutter", "react native"],                    icon: "Smartphone", bg: "#065f46", fg: "#6ee7b7" },
  { keys: ["ui", "ux", "design", "designer", "figma"],                                icon: "Palette",    bg: "#831843", fg: "#f9a8d4" },
  { keys: ["seo", "marketing", "digital", "content", "social"],                       icon: "TrendingUp", bg: "#365314", fg: "#bef264" },
  { keys: ["data", "analyst", "analytics", "bi", "report"],                           icon: "BarChart2",  bg: "#78350f", fg: "#fcd34d" },
  { keys: ["erp", "database", "sql", "dba"],                                          icon: "Database",   bg: "#7c2d12", fg: "#fdba74" },
  { keys: ["hr", "human resource", "payroll", "recruit"],                             icon: "Users",      bg: "#4c1d95", fg: "#c4b5fd" },
  { keys: ["network", "infrastructure", "cloud", "devops", "system"],                 icon: "Globe",      bg: "#164e63", fg: "#67e8f9" },
  { keys: ["security", "cyber", "pen test"],                                          icon: "Shield",     bg: "#7f1d1d", fg: "#fca5a5" },
  { keys: ["support", "helpdesk", "customer"],                                        icon: "Headphones", bg: "#134e4a", fg: "#5eead4" },
  { keys: ["business", "sales", "executive", "manager", "account"],                  icon: "Briefcase",  bg: "#713f12", fg: "#fde68a" },
  { keys: ["writer", "copywriter", "editor", "documentation"],                       icon: "PenTool",    bg: "#581c87", fg: "#e9d5ff" },
];

function getJobMeta(job: CareerJob): { Icon: React.ElementType; bg: string; fg: string } {
  if (job.icon && ICON_MAP[job.icon]) {
    const entry = JOB_ICONS.find(e => e.icon === job.icon);
    return { Icon: ICON_MAP[job.icon], bg: entry?.bg || "#1e3a5f", fg: entry?.fg || "#93c5fd" };
  }
  const t = job.title.toLowerCase();
  for (const entry of JOB_ICONS) {
    if (entry.keys.some(k => t.includes(k))) {
      return { Icon: ICON_MAP[entry.icon] || Briefcase, bg: entry.bg, fg: entry.fg };
    }
  }
  return { Icon: Briefcase, bg: "#1e3a5f", fg: "#93c5fd" };
}

const JobCard = ({ job, onApply, useImg, getNavProps, delay = 0 }: { job: CareerJob; onApply: () => void; useImg: boolean; getNavProps: any; delay?: number }) => {
  const { Icon, bg, fg } = getJobMeta(job);
  const [isExpanded, setIsExpanded] = useState(false);

  const getThemedImg = () => {
    return (job.image_url && job.image_url.trim()) ? job.image_url.trim() : "";
  };

  const imgSrc = getThemedImg();
  const isLongDescription = (job.description || "").length > 190;

  return (
    <div
      className="glass-card relative flex flex-col h-full group/item hover:shadow-xl transition-all duration-300 overflow-hidden hover-float animate-float border border-secondary/30 hover:outline hover:outline-2 hover:outline-secondary/50"
      style={{ animationDelay: `${delay}s`, minHeight: useImg ? "280px" : "180px", height: isExpanded ? "auto" : "100%" }}
      {...getNavProps(onApply)}
    >
      <EditorToolbar section="career_jobs" id={job.id} isVisible={job.is_visible} />
      {useImg ? (
        <>
          <div className={`relative ${isExpanded ? "h-24" : "h-[30%]"} w-full overflow-hidden shrink-0 transition-all duration-500`}>
            <img src={imgSrc} alt={job.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/item:scale-110"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/uploads/white_dev_1775409804566.png"; }} />
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
          </div>
          <div className="relative flex-1 w-full px-4 pt-3 pb-4 flex flex-col bg-white dark:bg-[#1e1e2e] z-10">
            <h3 className="font-heading font-extrabold text-[0.9375rem] text-slate-900 dark:text-white mb-1 leading-tight tracking-tight">
                <EditableText section="career_jobs" field="title" id={job.id} value={job.title} />
            </h3>
            <div className="relative flex-1 mb-2">
              <p className={`text-slate-600 dark:text-slate-300 text-[0.7rem] font-medium leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}>
                <EditableText section="career_jobs" field="description" id={job.id} value={job.description} />
              </p>
              {isLongDescription && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-secondary text-[0.625rem] font-extrabold mt-0.5 hover:underline focus:outline-none flex items-center gap-1">
                  {isExpanded ? "Show Less" : "Read More..."}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 mt-auto">
              <span className="flex items-center gap-1 text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider"><MapPin size={10} className="text-secondary" /> {job.location}</span>
              <span className="flex items-center gap-1 text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider"><Clock size={10} className="text-secondary" /> {job.job_type}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onApply(); }}
              className="px-4 py-2 bg-secondary text-white rounded-lg font-extrabold text-[0.75rem] hover:brightness-110 active:scale-[0.98] transition-all w-full shadow-md shadow-secondary/15 shrink-0">
              Apply Now
            </button>
          </div>
        </>
      ) : (
        <div className="relative z-10 p-4 h-full flex flex-col bg-white dark:bg-[#1e1e2e]">
          <div className="flex items-start justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Icon size={18} className="text-secondary" />
            </div>
          </div>
          <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-[0.9375rem] mb-1.5">
            <EditableText section="career_jobs" field="title" id={job.id} value={job.title} />
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
            <span className="flex items-center gap-1 text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider"><MapPin size={10} className="text-secondary" /> {job.location}</span>
            <span className="flex items-center gap-1 text-[0.6rem] text-slate-400 font-bold uppercase tracking-wider"><Clock size={10} className="text-secondary" /> {job.job_type}</span>
          </div>
          <div className="relative mb-3 flex-1 overflow-visible">
            <p className={`text-slate-600 dark:text-slate-300 text-[0.7rem] font-medium leading-relaxed ${isExpanded ? "" : "line-clamp-4"}`}>
              <EditableText section="career_jobs" field="description" id={job.id} value={job.description} />
            </p>
            {isLongDescription && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-secondary text-[0.6rem] font-extrabold mt-1 hover:underline focus:outline-none">
                {isExpanded ? "Show Less" : "Read More..."}
              </button>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onApply(); }}
            className="px-4 py-2 bg-secondary text-white rounded-lg font-extrabold text-[0.75rem] hover:brightness-110 active:scale-[0.98] transition-all w-full shadow-md shadow-secondary/15 mt-auto">
            Apply Now
          </button>
        </div>
      )}
    </div>
  );
};

const JobRow = ({ job, onApply, useImg, getNavProps }: { job: CareerJob; onApply: () => void; useImg: boolean; getNavProps: any }) => {
  const { Icon, bg, fg } = getJobMeta(job);
  const fallbackImg = "";
  const imgSrc = (job.image_url && job.image_url.trim()) ? job.image_url.trim() : fallbackImg;

  return (
    <div className="glass-card flex items-center gap-0 overflow-hidden hover:shadow-lg transition-all duration-300 group/item hover-float relative hover:outline hover:outline-2 hover:outline-secondary/50" {...getNavProps(onApply)}>
      <EditorToolbar section="career_jobs" id={job.id} isVisible={job.is_visible} />
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: 120, alignSelf: "stretch" }}>
        {useImg ? (
          <>
            <img src={imgSrc} alt={job.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImg; }} />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: bg, minHeight: 90 }}>
            <Icon size={28} style={{ color: fg }} />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white dark:bg-[#11111f]">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-extrabold text-foreground text-[1rem] mb-1">
            <EditableText section="career_jobs" field="title" id={job.id} value={job.title} />
          </h3>
          <p className="text-muted-foreground text-[0.8125rem] line-clamp-2">
            <EditableText section="career_jobs" field="description" id={job.id} value={job.description} />
          </p>
          <div className="flex gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground font-medium"><MapPin size={13} className="text-secondary" /> {job.location}</span>
            <span className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground font-medium"><Clock size={13} className="text-secondary" /> {job.job_type}</span>
          </div>
        </div>
        <button onClick={() => onApply()}
          className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-white rounded-xl font-bold text-[0.875rem] hover:opacity-90 transition-opacity shrink-0 shadow-md">
          <Briefcase size={15} /> Apply Now
        </button>
      </div>
    </div>
  );
};

const CareersSection = () => {
  const view = useGlobalView();
  const cardStyle = useCardStyle();
  const useImg = cardStyle === "image";
  const getNavProps = useLiveEditorNavigation();

  const editor = useLiveEditor();
  const { data: jobs = [] } = useDbQuery<CareerJob[]>("career_jobs", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order", asc: true });
  const content = useSiteContent("careers");
  
  const header = {
    badge: content.badge || "Careers",
    title: content.title || "Join Our",
    highlight: content.highlight || "Team",
    description: content.description || "Be part of a dynamic team building cutting-edge technology solutions for clients worldwide."
  };

  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CareerJob | null>(null);
  const [applyForm, setApplyForm] = useState({ name: "", email: "", phone: "", cover: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(0);
  const CARDS_PER_PAGE = 4;
  const totalPages = Math.ceil(jobs.length / CARDS_PER_PAGE);
  const goTo = (p: number) => setCurrentPage(((p % totalPages) + totalPages) % totalPages);
  const pageJobs = jobs.slice(currentPage * CARDS_PER_PAGE, (currentPage + 1) * CARDS_PER_PAGE);
  
  const sectionVisible = content.section_visible !== false && content.section_visible !== "false";

  if (!sectionVisible) return null;

  if (jobs.length === 0) {
    return (
      <section id="careers" className="section-padding relative overflow-hidden">
        <div className="container-wide relative z-10 animate-pulse">
          <div className="text-center mb-14">
            <div className="h-4 w-24 bg-muted/60 mx-auto rounded mb-3" />
            <div className="h-10 w-64 bg-muted mx-auto rounded mb-4" />
            <div className="h-4 w-96 bg-muted/60 mx-auto rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted/30 rounded-2xl" />)}
          </div>
        </div>
      </section>
    );
  }

  const openApply = (job: CareerJob) => { setSelectedJob(job); setShowModal(true); };

  const submitApplication = async () => {
    if (!applyForm.name.trim()) { toast.error("Full Name is required."); return; }
    if (!applyForm.email.trim()) { toast.error("Email Address is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applyForm.email)) { toast.error("Please enter a valid email address."); return; }
    setSubmitting(true);
    try {
      const json = await dbInsert<any>("job_applications", {
        applicant_name: applyForm.name.trim(), email: applyForm.email.trim(),
        phone: applyForm.phone.trim() || null, cover_letter: applyForm.cover.trim() || null,
        job_id: selectedJob?.title || "General", status: "new", website: applyForm.website || null,
      });
      if (json.error) throw new Error(json.error.message);
      if (json.data) {
        await dbInsert("appointments", {
          id: crypto.randomUUID(), reference_type: "application", reference_id: json.data.id,
          name: applyForm.name.trim(), email: applyForm.email.trim(),
          title: `Job App: ${selectedJob?.title || "General"}`,
          description: applyForm.cover?.slice(0, 100) || "Candidate applied.",
          appointment_date: new Date().toISOString(), created_at: new Date().toISOString(),
        });
      }
      toast.success("Application submitted successfully!");
      setShowModal(false);
      setApplyForm({ name: "", email: "", phone: "", cover: "", website: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="careers" className="section-padding relative overflow-hidden group">
      <SectionHeaderToolbar section="careers" targetSection="career_jobs" />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-14">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest">
            <EditableText section="careers" field="badge" value={header.badge || "Careers"} />
          </span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4">
            <EditableText section="careers" field="title" value={header.title || "Join Our"} />{" "}
            <span className="gradient-text">
              <EditableText section="careers" field="highlight" value={header.highlight || "Team"} />
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-4 text-[0.9375rem]">
            <EditableText section="careers" field="description" value={header.description || ""} />
          </p>
        </AnimatedSection>

        {editor?.isEditMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch max-w-[90rem] mx-auto overflow-y-auto max-h-[80vh] p-2 custom-scrollbar">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={() => openApply(job)} useImg={useImg} getNavProps={getNavProps} />
            ))}
          </div>
        ) : (
          <div className="max-w-[90rem] mx-auto px-4">
            <div className={`flex flex-wrap justify-center gap-6 items-stretch transition-all duration-500 ${view === 'grid' ? '' : 'flex-col max-w-3xl mx-auto'}`}>
              {(jobs.length > CARDS_PER_PAGE ? pageJobs : jobs).map((job, i) => (
                <AnimatedSection 
                  key={job.id} 
                  delay={i * 0.08} 
                  className={`h-full ${view === 'grid' ? 'w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] max-w-sm' : 'w-full'}`}
                >
                  {view === "grid" ? (
                    <JobCard job={job} onApply={() => openApply(job)} useImg={useImg} getNavProps={getNavProps} />
                  ) : (
                    <JobRow job={job} onApply={() => openApply(job)} useImg={useImg} getNavProps={getNavProps} />
                  )}
                </AnimatedSection>
              ))}
            </div>

            {jobs.length > CARDS_PER_PAGE && (
              <div className="flex items-center justify-center gap-6 mt-12">
                <button
                  onClick={() => goTo(currentPage - 1)}
                  className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all text-foreground shadow-sm group/nav"
                >
                  <Briefcase size={20} className="group-hover/nav:scale-110 transition-transform" />
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
                  <Briefcase size={20} className="group-hover/nav:scale-110 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-heading font-semibold text-lg text-foreground">Apply for {selectedJob?.title}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  <EditableText section="careers" field="label_name" value={content.label_name || "Full Name *"} />
                </label>
                <input className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" value={applyForm.name} onChange={e => setApplyForm(f => ({ ...f, name: e.target.value }))} placeholder={content.placeholder_name || "Your name"} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  <EditableText section="careers" field="label_email" value={content.label_email || "Email *"} />
                </label>
                <input className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" value={applyForm.email} onChange={e => setApplyForm(f => ({ ...f, email: e.target.value }))} placeholder={content.placeholder_email || "you@email.com"} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  <EditableText section="careers" field="label_phone" value={content.label_phone || "Phone"} />
                </label>
                <input className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" value={applyForm.phone} onChange={e => setApplyForm(f => ({ ...f, phone: e.target.value }))} placeholder={content.placeholder_phone || "Number"} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  <EditableText section="careers" field="label_position" value={content.label_position || "Position"} />
                </label>
                <input className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" value={selectedJob?.title || ""} readOnly />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                <EditableText section="careers" field="label_message" value={content.label_message || "Cover Letter / Notes"} />
              </label>
              <textarea className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none" rows={3} value={applyForm.cover} onChange={e => setApplyForm(f => ({ ...f, cover: e.target.value }))} placeholder={content.placeholder_message || "Tell us about yourself..."} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={submitApplication} disabled={submitting || !applyForm.name || !applyForm.email}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold disabled:opacity-50">
                {submitting ? "Submitting..." : <EditableText section="careers" field="cta_submit" value={content.cta_submit || "Submit"} />}
              </button>
            </div>
            <input type="text" name="website" value={applyForm.website} onChange={e => setApplyForm(f => ({ ...f, website: e.target.value }))}
              tabIndex={-1} autoComplete="off" aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          </div>
        </div>
      )}
    </section>
  );
};

export default CareersSection;
