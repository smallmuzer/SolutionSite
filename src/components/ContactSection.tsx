import React, { useState, useRef, Fragment, useEffect } from "react";
import AnimatedSection from "./AnimatedSection";
import * as LucideIcons from "lucide-react";
import { MapPin, Mail, Phone, Clock, Send, CheckCircle, Calendar, ChevronLeft, ChevronRight, X, Facebook, Twitter, Linkedin, Instagram, Hash } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, useSiteSettings, useSocialLinks } from "@/hooks/useSiteContent";
import { openViber, ViberIcon } from "@/lib/viber";
import { useDbQuery } from "@/hooks/useDbQuery";
import { COUNTRIES, detectCountry, validatePhone } from "@/lib/phone-utils";
import { EditableText, EditorToolbar, useLiveEditor, hasEmbeddedColor } from "./admin/LiveEditorContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ————————————————————————————————————————————————————————————————————————————————
const BRAND_SVGS: Record<string, string> = {
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
};

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
  const brandKey = trimmed.toLowerCase();
  if (BRAND_SVGS[brandKey]) {
    return (
      <div
        className={`flex items-center justify-center ${className || ""}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: BRAND_SVGS[brandKey] }}
      />
    );
  }
  if (brandKey === "viber") {
    return <ViberIcon size={size} className={className} />;
  }
  const Icon = (LucideIcons as any)[trimmed] || LucideIcons.HelpCircle;
  return <Icon size={size} className={className} />;
};



const ContactSection = () => {
  const content = useSiteContent("contact");
  const settings = useSiteSettings();
  const rawSocialLinks = useSocialLinks();
  const editor = useLiveEditor();
  const { data: servicesData } = useDbQuery<{ title: string }[]>("services", editor?.isEditMode ? {} : { is_visible: true }, { order: "sort_order" });
  const services = servicesData || [];
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", service: "", designation: "", message: "", website: "" });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  useEffect(() => {
    detectCountry().then(setSelectedCountry);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim() || !form.service || !form.designation.trim() || !form.phone.trim()) {
      toast.error("Please fill in all required fields");
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
          message: `${form.message.trim()}\nDesignation: ${form.designation.trim()}${form.service ? `\nService: ${form.service}` : ""}`,
        })
      });
      const json = await resp.json();
      const contactData = json.data;
      if (json.error) throw new Error(json.error.message);


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
    const isPaste = (e.nativeEvent as InputEvent).inputType === 'insertFromPaste' || Math.abs(val.length - form.phone.length) > 1;

    // Auto-detect pasted ISD code (e.g., +91 or 0091)
    if (val.startsWith("+") || val.startsWith("00")) {
      const normalizedVal = val.startsWith("00") ? "+" + val.slice(2) : val;
      // Check longest dial codes first to avoid partial matches (e.g. +1 vs +1242)
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
      const matchedCountry = sortedCountries.find(c => normalizedVal.replace(/\s+/g, '').startsWith(c.dial));

      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        // Remove the dial code and trim spaces only if it's a paste or has a space
        if (isPaste || val.includes(' ')) {
          val = normalizedVal.replace(/\s+/g, '').slice(matchedCountry.dial.length);
        }
      }
    }

    update("phone", val);
  };

  const handlePhoneBlur = () => {
    let val = form.phone;
    if (val.startsWith("+") || val.startsWith("00")) {
      const normalizedVal = val.startsWith("00") ? "+" + val.slice(2) : val;
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
      const matchedCountry = sortedCountries.find(c => normalizedVal.replace(/\s+/g, '').startsWith(c.dial));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        val = normalizedVal.replace(/\s+/g, '').slice(matchedCountry.dial.length);
        update("phone", val.trim());
      }
    }
  };

  const contactItems = [
    { icon: MapPin, label: "Office Address", value: content?.address || "Alia Building, 7th Floor, Gandhakoalhi Magu\nMalé, Maldives" },
    { icon: Mail, label: "Email", value: content?.email || "info@solutions.com.mv" },
  ];
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground text-[0.8125rem] focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all";
  const labelCls = "text-[0.6875rem] font-bold text-muted-foreground/90 mb-1 block uppercase tracking-wide";

  return (
    <section id="contact" className="py-6 section-alt relative overflow-hidden group/item">
      <EditorToolbar section="contact" canHide={false} />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-6">
          <div id="contact-header" className="text-secondary font-semibold text-sm uppercase tracking-widest inline-block mb-2" style={{ color: hasEmbeddedColor(content.badge) ? undefined : (content.badge_color || undefined) }}>
            <EditableText section="contact" field="badge" value={content.badge || "Reach Us"} colorField="badge_color" />
          </div>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-1 mb-2" style={{ color: hasEmbeddedColor(content.title) ? undefined : (content.title_color || undefined) }}>
            <span>
              <EditableText section="contact" field="title" value={content.title || "Get In"} colorField="title_color" />{" "}
              {(content.highlight !== undefined ? content.highlight : "Touch") && (
                <span className="gradient-text" style={{ color: hasEmbeddedColor(content.highlight) ? undefined : (content.highlight_color || undefined), background: content.highlight_color && !hasEmbeddedColor(content.highlight) ? "none" : undefined, WebkitTextFillColor: content.highlight_color && !hasEmbeddedColor(content.highlight) ? "initial" : undefined }}>
                  <EditableText section="contact" field="highlight" value={content.highlight !== undefined ? content.highlight : "Touch"} colorField="highlight_color" />
                </span>
              )}
            </span>
          </h2>
          <div className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]" style={{ color: hasEmbeddedColor(content.subtitle) ? undefined : (content.subtitle_color || undefined) }}>
            <EditableText section="contact" field="subtitle" value={content.subtitle || ""} colorField="subtitle_color" />
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-[5fr_6fr] gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          <AnimatedSection className="w-full h-full flex flex-col">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 flex-1 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
              <h3 className="font-heading font-semibold text-foreground text-[0.9375rem] mb-4">
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
                        let addr = String(content.address || "Alia Building, 7th Floor, Gandhakoalhi Magu\nMalé, Maldives");
                        addr = addr.replace(/\\n/g, '\n');
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
                      <EditableText section="contact" field="hours" value={String(content.hours || "Sunday - Thursday: 09:00 - 17:00\nFriday - Saturday: Closed").replace(/\\n/g, '\n')} />
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
                      const socialList = rawSocialLinks.map((link, i) => {
                        const isVisible = link.is_visible !== 0 && link.is_visible !== false;
                        return {
                          index: i + 1,
                          icon: link.icon,
                          href: link.url,
                          isVisible,
                          color: link.color
                        };
                      }).filter(s => s.isVisible || editor?.isEditMode);

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
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="w-full h-full flex flex-col">
            {submitted ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-8 text-center flex-1 flex flex-col items-center justify-center h-full min-h-[400px] transition-all duration-300">
                <CheckCircle size={40} className="text-secondary mx-auto mb-3" />
                <h3 className="font-heading font-bold text-[1.125rem] text-foreground mb-2">
                  <EditableText section="contact" field="label_thank_you" value={content.label_thank_you || "Thank You!"} />
                </h3>
                <p className="text-muted-foreground text-[0.8125rem]">
                  <EditableText section="contact" field="label_success_message" value={content.label_success_message || "We've received your message and will get back to you within 24 hours."} />
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", company: "", email: "", phone: "", service: "", designation: "", message: "", website: "" }); }}
                  className="mt-5 text-secondary font-medium text-[0.8125rem] hover:underline"
                >
                  <EditableText section="contact" field="label_send_another" value={content.label_send_another || "Send Another Message"} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 flex-1 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
                <h3 className="font-heading font-semibold text-foreground text-[0.9375rem] mb-3">
                  <EditableText section="contact" field="label_send_message" value={content.label_send_message || "Send a Message"} />
                </h3>
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_name" value={content.label_name || "Full Name *"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[9px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_name" value={content.placeholder_name || "Your name"} />)</div>}
                      </label>
                      <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_name || "Your name"} maxLength={100} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_company" value={content.label_company || "Company"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[9px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_company" value={content.placeholder_company || "Your company"} />)</div>}
                      </label>
                      <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_company || "Your company"} maxLength={100} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_email" value={content.label_email || "Email *"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[9px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_email" value={content.placeholder_email || "you@email.com"} />)</div>}
                      </label>
                      <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_email || "you@email.com"} maxLength={255} />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_phone" value={content.label_phone || "Phone *"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[9px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_phone" value={content.placeholder_phone || "Number"} />)</div>}
                      </label>
                      <div className="flex items-stretch">
                        <div className="relative w-auto shrink-0 h-[34px]">
                          <Select
                            value={selectedCountry.code}
                            onValueChange={(val) => {
                              const country = COUNTRIES.find(c => c.code === val);
                              if (country) setSelectedCountry(country);
                            }}
                          >
                            <SelectTrigger className={`${inputCls} !w-auto min-w-fit rounded-r-none border-r-0 !px-1.5 h-full !py-0 [&>svg]:opacity-50 [&>svg]:w-3 [&>svg]:h-3`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.flag} {c.dial}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <input type="tel" value={form.phone} onChange={handlePhoneChange} onBlur={handlePhoneBlur}
                          className={`${inputCls} rounded-l-none flex-1 h-[34px]`} placeholder={content.placeholder_phone || "Number"} maxLength={20} />
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_inquiry" value={content.label_inquiry || "Inquiry For *"} />
                      </label>
                      <div className="relative">
                        <Select value={form.service || undefined} onValueChange={(val) => update("service", val)}>
                          <SelectTrigger className={`${inputCls} hover:border-secondary transition-colors h-[34px]`}>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map(s => (
                              <SelectItem key={(s as any).id || s.title} value={s.title}>{s.title ? String(s.title).replace(/<[^>]*>?/gm, '') : ""}</SelectItem>
                            ))}
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>
                        <EditableText section="contact" field="label_designation" value={content.label_designation || "Designation *"} />
                        {editor?.isEditMode && <div className="inline-block ml-1 text-[9px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_designation" value={content.placeholder_designation || "Your designation"} />)</div>}
                      </label>
                      <input type="text" value={form.designation} onChange={(e) => update("designation", e.target.value)}
                        className={inputCls} placeholder={content.placeholder_designation || "Your designation"} maxLength={100} />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={labelCls}>
                      <EditableText section="contact" field="label_message" value={content.label_message || "Message *"} />
                      {editor?.isEditMode && <div className="inline-block ml-1 text-[9px] text-secondary/50 italic">(PH: <EditableText section="contact" field="placeholder_message" value={content.placeholder_message || "Tell us about your project..."} />)</div>}
                    </label>
                    <textarea
                      value={form.message} onChange={(e) => update("message", e.target.value)}
                      className={`${inputCls} resize-y min-h-[70px]`}
                      placeholder={content.placeholder_message || "Tell us about your project..."} maxLength={1000}
                    />
                  </div>
                </div>
                <div className="mt-auto pt-4 flex flex-col gap-3">
                  <button
                    type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-transparent border border-secondary text-secondary font-semibold rounded-lg hover:bg-secondary/10 transition-colors disabled:opacity-50 text-[0.8125rem]"
                  >
                    <Send size={15} /> {loading ? "Sending..." : <EditableText section="contact" field="cta_text" value={content.cta_text || "Send Message"} />}
                  </button>
                  <p className="text-muted-foreground text-[0.6875rem] text-center font-medium">
                    <EditableText section="contact" field="label_response_time" value={content.label_response_time || "We respond within 24 hours on business days."} />
                  </p>
                </div>
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

