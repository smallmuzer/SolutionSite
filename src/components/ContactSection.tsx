import React, { useState, useRef, Fragment, useEffect } from "react";
import AnimatedSection from "./AnimatedSection";
import * as LucideIcons from "lucide-react";
import { MapPin, Mail, Phone, Clock, Send, CheckCircle, Calendar, ChevronLeft, ChevronRight, X, Facebook, Twitter, Linkedin, Instagram, Hash } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, useSiteSettings } from "@/hooks/useSiteContent";
import { openViber, ViberIcon } from "@/lib/viber";
import { useDbQuery } from "@/hooks/useDbQuery";
import { COUNTRIES, detectCountry, validatePhone } from "@/lib/phone-utils";
import { EditableText, EditorToolbar, useLiveEditor, hasEmbeddedColor } from "./admin/LiveEditorContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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



const ContactSection = () => {
  const content = useSiteContent("contact");
  const settings = useSiteSettings();
  const editor = useLiveEditor();
  const { data: servicesData } = useDbQuery<{ title: string }[]>("services", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order" });
  const services = servicesData || [];
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toLocalISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const nowDate = new Date();
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
        const apptDesc = form.message.slice(0, 100) + (form.message.length > 100 ? "..." : "");
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Auto-detect pasted ISD code (e.g., +91 or 0091)
    if (val.startsWith("+") || val.startsWith("00")) {
      const normalizedVal = val.startsWith("00") ? "+" + val.slice(2) : val;
      // Check longest dial codes first to avoid partial matches (e.g. +1 vs +1242)
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
      const matchedCountry = sortedCountries.find(c => normalizedVal.replace(/\s+/g, '').startsWith(c.dial));
      
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        // Remove the dial code and trim spaces
        val = normalizedVal.replace(/\s+/g, '').slice(matchedCountry.dial.length);
      }
    }
    
    update("phone", val);
  };

  const contactItems = [
    { icon: MapPin, label: "Office Address", value: content?.address || "Alia Building, 7th Floor, Gandhakoalhi Magu\nMalé, Maldives" },
    { icon: Mail, label: "Email", value: content?.email || "info@solutions.com.mv" },
  ];
  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-[0.875rem] focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all";
  const labelCls = "text-[0.75rem] font-medium text-foreground mb-1 block";

  return (
    <section id="contact" className="py-10 section-alt relative overflow-hidden group/item">
      <EditorToolbar section="contact" canHide={false} />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-14">
          <div id="contact-header" className="text-secondary font-semibold text-sm uppercase tracking-widest inline-block" style={{ color: hasEmbeddedColor(content.badge) ? undefined : (content.badge_color || undefined) }}>
            <EditableText section="contact" field="badge" value={content.badge || "Reach Us"} colorField="badge_color" />
          </div>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4" style={{ color: hasEmbeddedColor(content.title) ? undefined : (content.title_color || undefined) }}>
            <EditableText section="contact" field="title" value={content.title || "Get In Touch"} colorField="title_color" />
          </h2>
          <div className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]" style={{ color: hasEmbeddedColor(content.subtitle) ? undefined : (content.subtitle_color || undefined) }}>
            <EditableText section="contact" field="subtitle" value={content.subtitle || ""} colorField="subtitle_color" />
          </div>
        </AnimatedSection>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          <AnimatedSection className="w-full lg:w-[48%] flex flex-col">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 sm:p-6 flex-1 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
              <h3 className="font-heading font-semibold text-foreground text-[1rem] mb-4">
                <EditableText section="contact" field="label_office_info" value={content.label_office_info || "Office Information"} />
              </h3>
              <div className="space-y-4 flex-1">
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_address" value={content.label_address || "Office Address"} />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="address" value={(() => {
                        let addr = content.address || "Alia Building, 7th Floor, Gandhakoalhi Magu\nMalé, Maldives";
                        // If it has 3 lines due to legacy DB state, forcefully convert to 2 lines
                        if (addr.includes('\n')) {
                          const lines = addr.split('\n');
                          if (lines.length >= 3) {
                            return `${lines[0]}, ${lines[1]}\n${lines.slice(2).join(' ')}`;
                          }
                        }
                        return addr;
                      })()} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-secondary" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-[12.5px]">
                      <EditableText section="contact" field="label_email" value={content.label_email || "Email"} />
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
                      <EditableText section="contact" field="label_phone_side" value={content.label_phone_side || "Phone"} />
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
                      <EditableText section="contact" field="label_landline" value={content.label_landline || "Landline"} />
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
                      <EditableText section="contact" field="label_hours" value={content.label_hours || "Business Hours"} />
                    </div>
                    <div className="text-muted-foreground text-[12.5px] whitespace-pre-line mt-0.5">
                      <EditableText section="contact" field="hours" value={content.hours || "Sunday - Thursday: 09:00 - 17:00\nFriday - Saturday: Closed"} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                  <div className="text-[0.8125rem] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-[0.15em] inline-block">
                    <EditableText section="contact" field="label_follow_us" value={content.label_follow_us || "Follow Us"} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const socialCount = parseInt(settings?.social_count || "6", 10);
                      const socialList = [];
                      for (let i = 1; i <= socialCount; i++) {
                        const iconKey = `social_icon_${i}`;
                        const hrefKey = `social_href_${i}`;
                        const visibleKey = `social_visible_${i}`;
                        const colorKey = `social_color_${i}`;

                        const icon = settings[iconKey] ?? (
                          i === 1 ? "Facebook" :
                            i === 2 ? "Twitter" :
                              i === 3 ? "Linkedin" :
                                i === 4 ? "Instagram" :
                                  i === 5 ? "Viber" :
                                    i === 6 ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-whatsapp"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` : "Globe"
                        );

                        const iconName = typeof icon === 'string' ? icon.toLowerCase() : "";
                        const isWhatsApp = iconName.includes("whatsapp");
                        const isFacebook = iconName === "facebook";
                        const isTwitter = iconName === "twitter";
                        const isLinkedin = iconName === "linkedin";
                        const isInstagram = iconName === "instagram";
                        const isViber = iconName === "viber";

                        const fallbackHref = isFacebook ? (settings.social_facebook || "https://www.facebook.com/brilliantsystemssolutions/") :
                          isTwitter ? (settings.social_twitter || "https://x.com/bsspl_india") :
                            isLinkedin ? (settings.social_linkedin || "https://in.linkedin.com/company/brilliantsystemssolutions") :
                              isInstagram ? (settings.social_instagram || "https://www.instagram.com/brilliantsystemssolutions") :
                                isViber ? "viber://chat?number=" :
                                  isWhatsApp ? `https://wa.me/${(settings.whatsapp_number || "9603011355").replace("+", "")}` : "#";

                        let href = settings[hrefKey] ?? fallbackHref;
                        if (isWhatsApp && href.startsWith("viber://")) href = fallbackHref;
                        if (isViber && href.startsWith("https://wa.me/")) href = fallbackHref;

                        const isVisible = settings[visibleKey] !== "false" && settings[visibleKey] !== false;

                        const fallbackColor = isFacebook ? "#1877F2" :
                          isTwitter ? "#1DA1F2" :
                            isLinkedin ? "#0A66C2" :
                              isInstagram ? "#E4405F" :
                                isViber ? "#7360f2" :
                                  isWhatsApp ? "#25D366" : "#3b82f6";

                        const color = settings[colorKey] ?? fallbackColor;

                        if (isVisible || editor?.isEditMode) {
                          socialList.push({ index: i, icon, href, color, isVisible });
                        }
                      }
                      return socialList.map((s) => {
                        const dynamicHref = s.href || "#";
                        const iconColor = s.color || "#3b82f6";
                        return (
                          <div key={s.index} className={`relative group/soc ${!s.isVisible ? 'opacity-40' : ''}`}>
                            {!s.isVisible && editor?.isEditMode && (
                              <span className="text-amber-500 shrink-0 absolute -top-1.5 -right-1.5 bg-black/80 rounded-full p-0.5 z-10" title="Hidden (Managed in Settings page)">
                                <LucideIcons.EyeOff size={10} />
                              </span>
                            )}
                            <a href={dynamicHref} target={s.href ? "_blank" : undefined} rel="noopener noreferrer"
                              className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all border"
                              style={{ backgroundColor: `${iconColor}14`, color: iconColor, borderColor: `${iconColor}26` }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = iconColor;
                                e.currentTarget.style.color = "#ffffff";
                                e.currentTarget.style.borderColor = iconColor;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = `${iconColor}14`;
                                e.currentTarget.style.color = iconColor;
                                e.currentTarget.style.borderColor = `${iconColor}26`;
                              }}
                            >
                              <DynamicSocialIcon name={s.icon} size={15} />
                            </a>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="pt-3">
                  <p className="text-muted-foreground text-[0.6875rem] text-center font-medium">
                    <EditableText section="contact" field="label_response_time" value={content.label_response_time || "We respond within 24 hours on business days."} />
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="w-full lg:w-[52%] flex flex-col">
            {submitted ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-12 text-center flex-1 flex flex-col items-center justify-center min-h-[500px] transition-all duration-300">
                <CheckCircle size={48} className="text-secondary mx-auto mb-4" />
                <h3 className="font-heading font-bold text-[1.125rem] text-foreground mb-2">
                  <EditableText section="contact" field="label_thank_you" value={content.label_thank_you || "Thank You!"} />
                </h3>
                <p className="text-muted-foreground text-[0.875rem]">
                  <EditableText section="contact" field="label_success_message" value={content.label_success_message || "We've received your message and will get back to you within 24 hours."} />
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", company: "", email: "", phone: "", service: "", message: "", date1: "", date2: "", website: "" }); }}
                  className="mt-6 text-secondary font-medium text-[0.8125rem] hover:underline"
                >
                  <EditableText section="contact" field="label_send_another" value={content.label_send_another || "Send Another Message"} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 sm:p-6 flex-1 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
                <h3 className="font-heading font-semibold text-foreground text-[1rem] mb-4">
                  <EditableText section="contact" field="label_send_message" value={content.label_send_message || "Send a Message"} />
                </h3>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_name" value={content.label_name || "Full Name *"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_name" value={content.placeholder_name || "Your name"} />)</div>}
                      </label>
                      <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_name || "Your name"} maxLength={100} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_company" value={content.label_company || "Company"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_company" value={content.placeholder_company || "Your company"} />)</div>}
                      </label>
                      <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_company || "Your company"} maxLength={100} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_email" value={content.label_email || "Email *"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_email" value={content.placeholder_email || "you@email.com"} />)</div>}
                      </label>
                      <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_email || "you@email.com"} maxLength={255} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_phone" value={content.label_phone || "Phone"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_phone" value={content.placeholder_phone || "Number"} />)</div>}
                      </label>
                      <div className="flex items-stretch">
                        <div className="relative w-24 shrink-0 h-[42px]">
                          <Select
                            value={selectedCountry.code}
                            onValueChange={(val) => {
                              const country = COUNTRIES.find(c => c.code === val);
                              if (country) setSelectedCountry(country);
                            }}
                          >
                            <SelectTrigger className={`${inputCls} rounded-r-none border-r-0 px-2 h-full !py-0 [&>svg]:opacity-50 [&>svg]:w-3 [&>svg]:h-3`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.flag} {c.dial}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <input type="tel" value={form.phone} onChange={handlePhoneChange}
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
                        <Select value={form.service || undefined} onValueChange={(val) => update("service", val)}>
                          <SelectTrigger className={`${inputCls} hover:border-secondary transition-colors`}>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map(s => (
                              <SelectItem key={(s as any).id || s.title} value={s.title}>{s.title}</SelectItem>
                            ))}
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={labelCls}>
                      <EditableText section="contact" field="label_message" value={content.label_message || "Message *"} />
                      {editor?.isEditMode && <div className="inline-block ml-1 text-[10px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_message" value={content.placeholder_message || "Tell us about your project..."} />)</div>}
                    </label>
                    <textarea
                      value={form.message} onChange={(e) => update("message", e.target.value)}
                      className={`${inputCls} resize-y min-h-[90px]`}
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

