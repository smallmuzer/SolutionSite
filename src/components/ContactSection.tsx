import React, { useState, useRef, Fragment, useEffect } from "react";
import AnimatedSection from "./AnimatedSection";
import * as LucideIcons from "lucide-react";
import { MapPin, Mail, Phone, Clock, Send, CheckCircle, Calendar, ChevronLeft, ChevronRight, X, Facebook, Twitter, Linkedin, Instagram, Hash } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, useSiteSettings } from "@/hooks/useSiteContent";
import { openViber, ViberIcon } from "@/lib/viber";
import { useDbQuery } from "@/hooks/useDbQuery";
import { COUNTRIES, detectCountry, validatePhone } from "@/lib/phone-utils";
import { EditableText, EditorToolbar, useLiveEditor } from "./admin/LiveEditorContext";

// ————————————————————————————————————————————————————————————————————————————————
const DynamicSocialIcon = ({ name, size = 15, className }: { name: string; size?: number; className?: string }) => {
  if (!name) return <LucideIcons.Globe size={size} className={className} />;
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith("<svg")) {
    return (
      <div 
        className={`flex items-center justify-center ${className || ""}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  if (trimmed.toLowerCase() === "viber") {
    return <ViberIcon size={size} className={className} />;
  }
  const Icon = (LucideIcons as any)[trimmed] || LucideIcons.HelpCircle;
  return <Icon size={size} className={className} />;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function DateTimePicker({ label, value, onChange, minDate }: {
  label: string; value: string; onChange: (v: string) => void; minDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = value ? new Date(value) : null;
  const [view, setView] = useState(() => { const d = parsed || new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [time, setTime] = useState(() => {
    if (parsed) return { h: parsed.getHours(), min: parsed.getMinutes() };
    return { h: new Date().getHours(), min: 0 };
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const minDay = new Date(minDate); minDay.setHours(0,0,0,0);

  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const selectDay = (d: number) => {
    const dt = new Date(view.y, view.m, d, time.h, time.min);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    onChange(localStr);
  };

  const applyTime = (h: number, min: number) => {
    setTime({ h, min });
    if (parsed) {
      const dt = new Date(parsed);
      dt.setHours(h, min);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      onChange(localStr);
    }
  };

  const fmt = (v: string) => {
    if (!v) return "";
    const d = new Date(v);
    return `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}  ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <label className="text-[0.75rem] font-medium text-foreground mb-1 block">{label}</label>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-[0.8125rem] outline-none transition-all focus:ring-2 focus:ring-ring flex items-center gap-2 hover:border-secondary"
      >
        <Calendar size={14} className="text-secondary shrink-0" />
        <span className={fmt(value) ? "text-foreground" : "text-muted-foreground"}>
          {fmt(value) || "Select date & time"}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border border-border bg-card shadow-xl" style={{ minWidth: 260, left: 0 }}>
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <button type="button" onClick={() => setView(v => { const d = new Date(v.y, v.m-1); return { y: d.getFullYear(), m: d.getMonth() }; })}
              className="p-1 rounded hover:bg-muted text-muted-foreground"><ChevronLeft size={14} /></button>
            <span className="text-[0.8125rem] font-semibold text-foreground">{MONTHS[view.m]} {view.y}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setView(v => { const d = new Date(v.y, v.m+1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                className="p-1 rounded hover:bg-muted text-muted-foreground"><ChevronRight size={14} /></button>
              <button type="button" onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-1">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 px-2 pb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[0.625rem] font-semibold text-muted-foreground py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 px-2 pb-2">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const cellDate = new Date(view.y, view.m, d);
              const isDisabled = cellDate < minDay;
              const isSelected = parsed && parsed.getDate() === d && parsed.getMonth() === view.m && parsed.getFullYear() === view.y;
              const isToday = cellDate.toDateString() === today.toDateString();
              return (
                <button key={d} type="button" disabled={isDisabled} onClick={() => selectDay(d)}
                  className={`text-[0.75rem] rounded-lg py-1 mx-0.5 my-0.5 transition-colors ${
                    isSelected ? "bg-secondary text-secondary-foreground font-bold" :
                    isToday ? "border border-secondary text-secondary font-semibold" :
                    isDisabled ? "text-muted-foreground/40 cursor-not-allowed" :
                    "hover:bg-secondary/10 text-foreground"
                  }`}
                >{d}</button>
              );
            })}
          </div>

          <div className="border-t border-border px-3 py-2 flex items-center gap-2">
            <Clock size={13} className="text-secondary shrink-0" />
            <span className="text-[0.6875rem] text-muted-foreground">Time</span>
            <select value={time.h} onChange={e => applyTime(Number(e.target.value), time.min)}
              className="ml-auto text-[0.75rem] bg-background border border-border rounded px-1 py-0.5 text-foreground outline-none">
              {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}</option>)}
            </select>
            <span className="text-muted-foreground text-[0.75rem]">:</span>
            <select value={time.min} onChange={e => applyTime(time.h, Number(e.target.value))}
              className="text-[0.75rem] bg-background border border-border rounded px-1 py-0.5 text-foreground outline-none">
              {[0,15,30,45].map(m=><option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
            </select>
            <button type="button" onClick={() => setOpen(false)}
              className="ml-2 px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-[0.6875rem] font-semibold">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

const ContactSection = () => {
  const content = useSiteContent("contact");
  const settings = useSiteSettings();
  const editor = useLiveEditor();
  const { data: servicesData } = useDbQuery<{ title: string }[]>("services", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order" });
  const services = servicesData || [];
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  const toLocalISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const nowDate  = new Date();
  const nowLocal = toLocalISO(nowDate);

  const normalizeAppointmentDate = (value: string) => {
    if (!value || !value.trim()) return "";
    const candidate = value.trim();
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) return "";
    // If the input doesn't have a timezone indicator, it's already in local time from our picker.
    // We want to keep it as a local-looking string for the DB or convert to ISO correctly.
    // For consistency with AdminDashboard, we convert to full ISO with Z.
    return parsed.toISOString();
  };

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", service: "", message: "", date1: "", date2: "", website: "" });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  useEffect(() => {
    detectCountry().then(setSelectedCountry);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (form.phone.trim() && !validatePhone(selectedCountry.dial, form.phone)) {
      toast.error(`Please enter a valid phone number for ${selectedCountry.name}.`);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/db/contact_submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          full_name: form.name.trim(),
          company_name: form.company.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() ? `${selectedCountry.dial} ${form.phone.trim()}` : null,
          is_read: 0,
          status: "new",
          website: form.website || null,
          message: `${form.message.trim()}${form.service ? `\nService: ${form.service}` : ""}${form.date1 ? `\nPreferred Date 1: ${form.date1}` : ""}${form.date2 ? `\nPreferred Date 2: ${form.date2}` : ""}`,
        })
      });
      const json = await resp.json();
      const contactData = json.data;
      if (json.error) throw new Error(json.error.message);
      
      if (contactData) {
        const contactId = contactData.id;
        const apptTitle = form.service ? `Inquiry: ${form.service}` : "General Inquiry";
        const apptDesc  = form.message.slice(0, 100) + (form.message.length > 100 ? "..." : "");
        const date1 = normalizeAppointmentDate(form.date1);
        const date2 = normalizeAppointmentDate(form.date2);

        // Always create an entry for the calendar on the day of submission if no dates are picked
        // OR if Date 1 is picked, use that.
        const effectiveDate1 = date1 || new Date().toISOString();
        
        await fetch("/api/db/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            reference_type: "contact",
            reference_id: contactId,
            name: form.name.trim(),
            email: form.email.trim(),
            title: apptTitle + (date1 ? " (Choice 1)" : ""),
            description: apptDesc,
            appointment_date: effectiveDate1,
            created_at: new Date().toISOString()
          })
        });

        if (date2) {
          await fetch("/api/db/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              reference_type: "contact",
              reference_id: contactId + "_2",
              name: form.name.trim(),
              email: form.email.trim(),
              title: apptTitle + " (Choice 2)",
              description: apptDesc,
              appointment_date: date2,
              created_at: new Date().toISOString()
            })
          });
        }
      }

      setLoading(false);
      setSubmitted(true);
      toast.success("Message sent! We'll get back to you shortly.");
    } catch (err: any) {
      setLoading(false);
      toast.error(err?.message || "Something went wrong. Please try again.");
    }
  };

  const update = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const contactItems = [
    { icon: MapPin, label: "Office Address",  value: content?.address || "Alia Building, 7th Floor\nGandhakoalhi Magu\nMalé, Maldives" },
    { icon: Mail,   label: "Email",           value: content?.email   || "info@solutions.com.mv" },
  ];
  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-[0.875rem] focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all";
  const labelCls = "text-[0.75rem] font-medium text-foreground mb-1 block";

  return (
    <section id="contact" className="py-10 section-alt relative overflow-hidden group/item">
      <EditorToolbar section="contact" canHide={false} />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-14">
          <span id="contact-header" className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: content.badge_color || undefined }}>
            <EditableText section="contact" field="badge" value="Reach Us" colorField="badge_color" />
          </span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4" style={{ color: content.title_color || undefined }}>
            <EditableText section="contact" field="title" value={content.title || "Get In Touch"} colorField="title_color" />
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]" style={{ color: content.subtitle_color || undefined }}>
            <EditableText section="contact" field="subtitle" value={content.subtitle || ""} colorField="subtitle_color" />
          </p>
        </AnimatedSection>

        <div className="flex flex-col lg:flex-row gap-20 max-w-6xl mx-auto items-stretch">
          <AnimatedSection className="w-full lg:w-1/2 flex flex-col">
            <div className="glass-card p-4 sm:p-6 flex-1 flex flex-col">
              <h3 className="font-heading font-semibold text-foreground text-[1rem] mb-4">
                <EditableText section="contact" field="label_office_info" value="Office Information" />
              </h3>
              <div className="space-y-4 flex-1">
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_address" value="Office Address" />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="address" value={content.address || "Alia Building, 7th Floor\nGandhakoalhi Magu\nMalé, Maldives"} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_email" value="Email" />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="email" value={content.email || "info@solutions.com.mv"} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_phone_side" value="Phone" />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="phone" value={content.phone || "+960 301 1355"} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Hash size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_landline" value="Landline" />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="landline" value={content.landline || "+960 301 1355"} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_hours" value="Business Hours" />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="hours" value={content.hours || "Sunday - Thursday: 09:00 - 17:00\nFriday - Saturday: Closed"} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[0.75rem] font-semibold text-foreground uppercase tracking-wider">Follow Us</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(() => {
                      const socialCount = parseInt(settings?.social_count || "5", 10);
                      const socialList = [];
                      for (let i = 1; i <= socialCount; i++) {
                        const iconKey = `social_icon_${i}`;
                        const hrefKey = `social_href_${i}`;
                        const visibleKey = `social_visible_${i}`;
                        
                        const icon = settings[iconKey] ?? (
                          i === 1 ? "Facebook" :
                          i === 2 ? "Twitter" :
                          i === 3 ? "Linkedin" :
                          i === 4 ? "Instagram" :
                          i === 5 ? "Viber" : "Globe"
                        );
                        
                        const href = settings[hrefKey] ?? (
                          i === 1 ? (settings.social_facebook || "https://www.facebook.com/brilliantsystemssolutions/") :
                          i === 2 ? (settings.social_twitter || "https://x.com/bsspl_india") :
                          i === 3 ? (settings.social_linkedin || "https://in.linkedin.com/company/brilliantsystemssolutions") :
                          i === 4 ? (settings.social_instagram || "https://www.instagram.com/brilliantsystemssolutions") :
                          i === 5 ? "viber://chat?number=" : "#"
                        );
                        
                        const isVisible = settings[visibleKey] !== "false" && settings[visibleKey] !== false;
                        
                        if (isVisible) {
                          socialList.push({ index: i, icon, href });
                        }
                      }
                      return socialList.map((s) => {
                        const isViber = s.icon?.trim().toLowerCase() === "viber";
                        const viberNumber = settings.viber_number || "9489477144";
                        const dynamicHref = isViber ? `viber://chat?number=${viberNumber.replace("+", "")}` : (s.href || "#");
                        return (
                          <a key={s.index} href={dynamicHref} target={isViber ? undefined : (s.href ? "_blank" : undefined)} rel="noopener noreferrer"
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isViber ? 'bg-[#7360f2]/10 text-[#7360f2] hover:bg-[#7360f2] hover:text-white' : 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-white'}`}
                            onClick={isViber ? (e) => { e.preventDefault(); openViber(viberNumber); } : undefined}
                          >
                            <DynamicSocialIcon name={s.icon} size={15} />
                          </a>
                        );
                      });
                    })()}
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => openViber(settings.viber_number || "9489477144")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/10 hover:bg-secondary/10 transition-all group shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#7360f2] flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform shrink-0">
                    <ViberIcon size={26} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-[0.8125rem] font-bold text-foreground leading-tight">Chat on Viber</div>
                    <div className="text-[0.625rem] text-[#f97316] dark:text-[#fb923c] font-bold tracking-tight mt-0.5">Official Business Channel</div>
                  </div>
                </button>
                <p className="text-muted-foreground text-[0.625rem] text-center">We respond within 24 hours on business days.</p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="w-full lg:w-1/2 flex flex-col">
            {submitted ? (
              <div className="glass-card p-12 text-center flex-1 flex flex-col items-center justify-center min-h-[500px]">
                <CheckCircle size={48} className="text-secondary mx-auto mb-4" />
                <h3 className="font-heading font-bold text-[1.125rem] text-foreground mb-2">Thank You!</h3>
                <p className="text-muted-foreground text-[0.875rem]">We've received your message and will get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", company: "", email: "", phone: "", service: "", message: "", date1: "", date2: "", website: "" }); }}
                  className="mt-6 text-secondary font-medium text-[0.8125rem] hover:underline"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="glass-card p-4 sm:p-6 flex-1 flex flex-col">
                <h3 className="font-heading font-semibold text-foreground text-[1rem] mb-4">Send a Message</h3>
                <div className="space-y-3 flex-1">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_name" value={content.label_name || "Full Name *"} />
                        {editor?.isEditMode && <span className="ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_name" value={content.placeholder_name || "Your name"} />)</span>}
                      </label>
                      <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_name || "Your name"} maxLength={100} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_company" value={content.label_company || "Company"} />
                        {editor?.isEditMode && <span className="ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_company" value={content.placeholder_company || "Your company"} />)</span>}
                      </label>
                      <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_company || "Your company"} maxLength={100} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_email" value={content.label_email || "Email *"} />
                        {editor?.isEditMode && <span className="ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_email" value={content.placeholder_email || "you@email.com"} />)</span>}
                      </label>
                      <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_email || "you@email.com"} maxLength={255} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_phone" value={content.label_phone || "Phone"} />
                      </label>
                      <div className="flex items-stretch">
                        <div className="relative w-24 shrink-0">
                          <select 
                            value={selectedCountry.code} 
                            onChange={(e) => {
                              const country = COUNTRIES.find(c => c.code === e.target.value);
                              if (country) setSelectedCountry(country);
                            }}
                            className={`${inputCls} appearance-none rounded-r-none border-r-0 bg-no-repeat pr-7 px-2 text-[0.75rem] h-full`}
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l4 4 4-4"/></svg>
                          </div>
                        </div>
                        <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)}
                          className={`${inputCls} rounded-l-none flex-1`} placeholder={content.placeholder_phone || "Number"} maxLength={20} />
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-1 gap-4">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_inquiry" value={content.label_inquiry || "Inquiry For *"} />
                      </label>
                      <div className="relative">
                        <select value={form.service} onChange={(e) => update("service", e.target.value)}
                          className={`${inputCls} appearance-none bg-no-repeat pr-10 hover:border-secondary transition-colors`}>
                          <option value="">Select a service</option>
                          {services.map(s => <option key={(s as any).id || s.title} value={s.title}>{s.title}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l4 4 4-4"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <DateTimePicker label="Preferred Date 1" value={form.date1} minDate={nowDate}
                      onChange={(v) => update("date1", v)} />
                    <DateTimePicker label="Preferred Date 2" value={form.date2} minDate={nowDate}
                      onChange={(v) => update("date2", v)} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className={labelCls}>
                      <EditableText section="contact" field="label_message" value={content.label_message || "Message *"} />
                      {editor?.isEditMode && <span className="ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_message" value={content.placeholder_message || "Tell us about your project..."} />)</span>}
                    </label>
                    <textarea
                      value={form.message} onChange={(e) => update("message", e.target.value)}
                      className={`${inputCls} resize-none flex-1`} style={{ minHeight: 80 }}
                      placeholder={content.placeholder_message || "Tell us about your project..."} maxLength={1000}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-secondary text-secondary font-semibold rounded-lg hover:bg-secondary/10 transition-colors disabled:opacity-50 mt-5 text-[0.875rem]"
                >
                  <Send size={15} /> {loading ? "Sending..." : <EditableText section="contact" field="cta_text" value={content.cta_text || "Send Message"} />}
                </button>
                {/* Honeypot field — hidden from real users, catches bots */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                />
              </form>
            )}
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;

