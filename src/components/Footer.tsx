import React, { useState, useRef, useEffect } from "react";
import { Facebook, Twitter, Linkedin, Instagram, ExternalLink, Globe, PhoneCall, Plus, EyeOff } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import { openViber, ViberIcon, VIBER_COLOR } from "@/lib/viber";
import { useSiteContent, useNetworkCompanies, useSiteSettings, useSocialLinks } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation, hasEmbeddedColor } from "./admin/LiveEditorContext";

const BRAND_SVGS: Record<string, string> = {
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  whatsapp: `<svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.004 2.667A13.26 13.26 0 002.667 15.89a13.16 13.16 0 001.907 6.848L2.667 29.333l6.81-1.786a13.3 13.3 0 006.527 1.706h.006c7.32 0 13.323-5.953 13.323-13.27a13.19 13.19 0 00-3.9-9.41 13.24 13.24 0 00-9.43-3.906zm0 24.29a11.04 11.04 0 01-5.627-1.54l-.404-.24-4.184 1.097 1.117-4.08-.263-.418a10.96 10.96 0 01-1.683-5.886c0-6.075 4.946-11.02 11.044-11.02a10.96 10.96 0 017.8 3.23 10.95 10.95 0 013.23 7.8c0 6.08-4.953 11.027-11.03 11.027v.03zm6.05-8.26c-.332-.166-1.963-.969-2.268-1.08-.305-.11-.527-.165-.749.167-.222.332-.86 1.08-1.054 1.302-.194.222-.388.25-.72.083-.332-.166-1.402-.517-2.67-1.648-.988-.88-1.654-1.966-1.848-2.298-.194-.332-.02-.512.146-.677.149-.149.332-.388.498-.582.166-.194.222-.332.332-.555.111-.222.056-.416-.028-.582-.083-.166-.748-1.804-1.025-2.47-.27-.648-.544-.56-.748-.57-.194-.01-.416-.012-.638-.012a1.224 1.224 0 00-.887.416c-.305.332-1.164 1.136-1.164 2.77 0 1.635 1.192 3.214 1.358 3.436.166.222 2.346 3.58 5.685 5.02.794.343 1.414.548 1.898.701.797.253 1.523.217 2.096.132.64-.095 1.963-.803 2.24-1.578.277-.775.277-1.44.194-1.578-.083-.138-.305-.222-.637-.388z"/></svg>`,
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

const MobileReadMore = ({ text, clampClass, textClass, section, field, id }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (window.innerWidth >= 640) { setOverflows(false); return; }
      setOverflows(el.scrollHeight > el.clientHeight + 6);
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const t = setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener("resize", check); };
  }, [text]);
  return (
    <div>
      <div ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
          <EditableText section={section} field={field} id={id} value={text} />
        ) : text}
      </div>
      {overflows && !expanded && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
          className="sm:hidden text-secondary text-[0.6875rem] font-bold mt-0.5 hover:underline block">
          Read more
        </button>
      )}
      {expanded && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
          className="sm:hidden text-secondary text-[0.6875rem] font-bold mt-0.5 hover:underline block">
          Show less
        </button>
      )}
    </div>
  );
};

const Footer = () => {
  const editor = useLiveEditor();
  const getNavProps = useLiveEditorNavigation();
  const content = useSiteContent("footer");
  const contact = useSiteContent("contact");
  const associatedContent = useSiteContent("our_network");

  const isNetworkVisibleDraft = editor?.pendingChanges["our_network:is_visible"] ?? associatedContent.is_visible;
  const isNetworkVisible = isNetworkVisibleDraft !== false;

  const { data: rawCompaniesData } = useDbQuery<{ id: string; name: string; subtitle: string; desc: string; href?: string; logo_url?: string; flag?: string; accent?: string; is_visible?: boolean }[]>(
    "our_network",
    editor?.isEditMode ? {} : { is_visible: true },
    { order: "sort_order" }
  );
  const rawCompanies = rawCompaniesData || [
    { id: "1", name: "Brilliant Systems Solutions", subtitle: "Private Limited", desc: "Our sister company delivering innovative IT solutions across the Maldives.", href: "https://bsyssolutions.com", logo_url: "/logo.png", accent: "#3b82f6", is_visible: true },
    { id: "2", name: "BSS Bhutan", subtitle: "Technology Partner", desc: "Expanding world-class digital solutions across the Kingdom of Bhutan.", href: "#", logo_url: "/assets/uploads/bhutan_partner.png", accent: "#10b981", is_visible: true },
  ];

  const associated = editor?.isEditMode
    ? rawCompanies
    : rawCompanies.filter((c: any) => {
      const isCoVisibleDraft = editor?.pendingChanges[`our_network:${c.id}:is_visible`] ?? c.is_visible;
      return isCoVisibleDraft !== false;
    });

  const handleNetworkMove = (id: string, direction: "up" | "down" | "left" | "right") => {
    if (!editor?.isEditMode) return;
    const idx = associated.findIndex(c => c.id === id);
    if (idx === -1) return;
    const step = (direction === "left" || direction === "up") ? -1 : 1;
    const targetIdx = Math.max(0, Math.min(associated.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newItems = [...associated];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);

    newItems.forEach((item, index) => {
      if (item.id) {
        editor.onUpdate("our_network", "sort_order", index, item.id);
      }
    });
  };

  const settings = useSiteSettings();
  // Load logo + site name from settings (already in useSiteSettings)
  const logoPath = settings.site_logo || "";
  const siteName = settings.site_name || "Systems Solutions";

  const { data: servicesData } = useDbQuery<{ id: string; title: string; href?: string; is_visible?: boolean }[]>(
    "services",
    editor?.isEditMode ? {} : { is_visible: true },
    { order: "sort_order" }
  );

  const hiddenLinksDraft = editor?.pendingChanges["footer:hidden_links"] ?? content.hidden_links;
  const hiddenLinks = (hiddenLinksDraft || "").split(",").filter(Boolean);
  const toggleLinkVisibility = (id: string) => {
    const next = hiddenLinks.includes(id)
      ? hiddenLinks.filter(l => l !== id)
      : [...hiddenLinks, id];
    editor?.onUpdate("footer", "hidden_links", next.join(","));
  };
  const footerBgImage = editor?.pendingChanges["footer:bg_image_url"] ?? content.bg_image_url ?? "";
  const rawSocialLinks = useSocialLinks();
  const socialList = rawSocialLinks.map((link, i) => {
    const isVisible = link.is_visible !== 0 && link.is_visible !== false;
    return {
      index: i + 1,
      id: link.id,
      icon: link.icon,
      href: link.url,
      isVisible,
      color: link.color
    };
  });

  const addressIdsDraft = editor?.pendingChanges["footer:address_ids"] ?? content.address_ids;
  let addressIds: string[] = ["1", "2"];
  if (addressIdsDraft) {
    try { addressIds = typeof addressIdsDraft === "string" ? JSON.parse(addressIdsDraft) : addressIdsDraft; } catch (e) { }
  }

  const handleAddAddress = () => {
    if (!editor?.isEditMode) return;
    const next = [...addressIds, Date.now().toString()];
    editor.onUpdate("footer", "address_ids", JSON.stringify(next));
  };

  const handleDeleteAddress = (id: string) => {
    if (!editor?.isEditMode) return;
    if (confirm("Delete this address?")) {
      const next = addressIds.filter(a => a !== id);
      editor.onUpdate("footer", "address_ids", JSON.stringify(next));
    }
  };

  return (
    <footer>
      {/* Associated Companies */}
      {(isNetworkVisible || editor?.isEditMode) && (
        <div className={`border-b border-border/50 relative group/sect ${!isNetworkVisible ? 'opacity-50 border-dashed border-2' : ''}`}>
          <div className="container-wide px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center mb-0">
              <span className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: hasEmbeddedColor(content.network_badge) ? undefined : (content.network_badge_color || undefined) }}>
                <EditableText section="footer" field="network_badge" value={content.network_badge || "Our Network"} colorField="network_badge_color" />
              </span>
              <h3 className="font-heading font-bold text-2xl mt-2 text-foreground relative" style={{ color: hasEmbeddedColor(content.network_title) ? undefined : (content.network_title_color || undefined) }}>
                <span className="inline-flex items-center gap-2 flex-wrap justify-center">
                  <span>
                    <EditableText section="footer" field="network_title" value={content.network_title || "Associated"} colorField="network_title_color" />{" "}
                    {(content.network_highlight !== undefined ? content.network_highlight : "Companies") && (
                      <span className="gradient-text" style={{ color: hasEmbeddedColor(content.network_highlight) ? undefined : (content.network_highlight_color || undefined), background: content.network_highlight_color && !hasEmbeddedColor(content.network_highlight) ? "none" : undefined, WebkitTextFillColor: content.network_highlight_color && !hasEmbeddedColor(content.network_highlight) ? "initial" : undefined }}>
                        <EditableText section="footer" field="network_highlight" value={content.network_highlight !== undefined ? content.network_highlight : "Companies"} colorField="network_highlight_color" />
                      </span>
                    )}
                  </span>
                  {!isNetworkVisible && editor?.isEditMode && (
                    <span className="text-amber-500" title="Section Hidden"><EyeOff size={18} /></span>
                  )}
                </span>
                <SectionHeaderToolbar section="our_network" targetSection="our_network" isVisible={isNetworkVisible} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
              </h3>
              <div className="text-sm mt-2 max-w-md mx-auto text-muted-foreground" style={{ color: hasEmbeddedColor(content.network_subtitle) ? undefined : (content.network_subtitle_color || undefined) }}>
                <EditableText section="footer" field="network_subtitle" value={content.network_subtitle || "Part of a growing family of technology companies across South Asia."} colorField="network_subtitle_color" />
              </div>
            </div>

            <div className={`flex flex-col sm:flex-row sm:overflow-x-auto items-center sm:items-stretch gap-0 w-full mx-auto pt-6 pb-6 sm:snap-x sm:custom-scrollbar max-w-7xl px-2 ${associated.length <= 3 ? "md:justify-center" : "md:justify-start"}`}>
              {associated.map((co, idx) => {
                const isCoVisibleDraft = editor?.pendingChanges[`our_network:${co.id}:is_visible`] ?? co.is_visible;
                const isVisible = isCoVisibleDraft !== false;
                const logoDraft = editor?.pendingChanges[`our_network:${co.id}:logo_url`] ?? (co as any).logo_url;
                const hrefDraft = editor?.pendingChanges[`our_network:${co.id}:href`] ?? co.href;

                return (
                  <React.Fragment key={co.id || co.name}>
                    <a
                      href={hrefDraft}
                      target={hrefDraft !== "#" ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (editor?.isEditMode) {
                          e.preventDefault();
                        }
                      }}
                      onPointerDown={() => editor?.setActiveElementId(`toolbar:our_network:${co.id}`)}
                      onDoubleClick={() => {
                        if (editor?.isEditMode && hrefDraft && hrefDraft !== "#") {
                          window.open(hrefDraft, "_blank");
                        }
                      }}
                      className={`group relative rounded-xl p-4 overflow-visible transition-all duration-300 hover:-translate-y-0.5 shrink-0 sm:snap-center w-full sm:w-[320px] flex flex-col justify-center border border-border/40 group/item relative ${!isVisible ? 'opacity-40 grayscale-[0.5] border-dashed border-2' : ''}`}
                    >
                      <EditorToolbar
                        section="our_network"
                        id={co.id}
                        isVisible={isVisible}
                        imageField="logo_url"
                        linkField="href"
                        className="-top-4 right-2 scale-75"
                        group="item"
                        canClone={false}
                        canMove={true}
                        moveDirections={["left", "right"]}
                        onMove={(dir) => handleNetworkMove(co.id || "", dir)}
                      />
                      {!isVisible && editor?.isEditMode && (
                        <div className="absolute top-2 left-2 bg-amber-500/90 text-white rounded-full p-1 shadow-md flex items-center gap-1.5 z-20 text-[8px] font-bold px-2 pointer-events-none uppercase tracking-widest border border-amber-400/20">
                          <EyeOff size={10} />
                          <span>Hidden</span>
                        </div>
                      )}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
                        style={{ background: `radial-gradient(ellipse at top left, ${co.accent}18 0%, transparent 65%)` }} />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-white overflow-hidden border border-border/50 shadow-inner">
                            {logoDraft ? (
                              <img
                                key={logoDraft}
                                src={logoDraft}
                                alt={co.name}
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              co.flag && (co.flag.startsWith("/") || co.flag.startsWith("http") || co.flag.includes(".")) ? (
                                <img src={co.flag} alt="flag" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl">{co.flag || "🏢"}</span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-heading font-bold text-[0.9375rem] leading-tight text-foreground">
                              <EditableText section="our_network" field="name" id={co.id} value={co.name} />
                            </h4>
                            {co.href !== "#" && <ExternalLink size={12} className="text-muted-foreground shrink-0" />}
                          </div>
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider block" style={{ color: co.accent }}>
                            <EditableText section="our_network" field="subtitle" id={co.id} value={co.subtitle} />
                          </span>
                          <MobileReadMore
                            section="our_network" field="desc" id={co.id}
                            text={co.desc}
                            clampClass="line-clamp-2"
                            textClass="text-[0.8125rem] mt-1 leading-snug text-muted-foreground"
                          />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity rounded-b-2xl"
                        style={{ background: `linear-gradient(90deg, transparent, ${co.accent}80, transparent)` }} />
                    </a>

                    {/* Handshake connector */}
                    {idx < associated.length - 1 && (
                      <div className="flex items-center justify-center shrink-0 z-10 my-[-1px] sm:my-0 sm:mx-[-1px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex flex-col sm:flex-row items-center gap-0">
                            <div className="w-px h-4 sm:w-4 sm:h-px bg-border/60" />
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted border border-border/50 shadow-sm z-10 my-0.5 sm:my-0 sm:mx-0.5" title="Partnership">
                              <span style={{ fontSize: 16 }}>🤝</span>
                            </div>
                            <div className="w-px h-4 sm:w-4 sm:h-px bg-border/60" />
                          </div>
                          <span className="text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground hidden sm:block">Partners</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main footer with AI 3D light-traveling background & reduced weight */}
      <div className="relative overflow-hidden group/footer" style={{ color: "#e2e8f0", backgroundColor: "#02040a" }}>
        {editor?.isEditMode && (
          <EditorToolbar
            section="footer"
            imageField="bg_image_url"
            className="top-4 right-4 z-50"
            canHide={false}
            canDelete={false}
            canClone={false}
            group=""
          />
        )}

        {/* Footer section background image */}
        {footerBgImage && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-15">
            <img src={footerBgImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Static dark overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 container-wide px-5 sm:px-6 lg:px-8 pt-6 pb-4 lg:pt-8">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-4 gap-y-6 sm:gap-x-8 lg:gap-10">

            {/* Brand */}
            <div className="col-span-2 lg:col-span-3 flex flex-col items-start text-left">
              <div className="flex items-center justify-start gap-2.5 mb-4 relative group/item w-full sm:w-max">
                {editor?.isEditMode && (
                  <EditorToolbar
                    section="settings"
                    imageField="site_logo"
                    className="absolute -top-2 -right-6 z-[60] scale-[0.80]"
                    canHide={false}
                    canDelete={false}
                    canClone={false}
                  />
                )}
                {logoPath ? (
                  <div className="flex items-center justify-start shrink-0 bg-white/90 p-1.5 rounded-md" style={{ height: 60, width: "auto", maxWidth: 220 ,backgroundColor: "transparent"}}>
                    <img src={logoPath} alt={siteName}
                      className="h-full w-auto object-contain object-left"
                      onError={(e) => { 
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.getAttribute('data-error') !== 'true') {
                          target.setAttribute('data-error', 'true');
                          target.src = "https://placehold.co/200x60/transparent/666?text=Upload+Logo";
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ width: 45, height: 45, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>S</span>
                  </div>
                )}
              </div>
              <div className="text-sm leading-relaxed mb-5 relative text-left w-full" style={{ color: "#94a3b8" }}>
                <EditableText section="footer" field="tagline" value={content.tagline || "Leading IT consulting and software development company delivering cutting-edge technology solutions."} />
              </div>
              <div className="flex flex-wrap items-center justify-start gap-2.5 relative w-full">
                {socialList.map((s) => {
                  if (!editor?.isEditMode && !s.isVisible) return null;
                  const iconColor = s.color || "#3b82f6";
                  const isViber = s.id === "sl-5";
                  const isWhatsApp = s.id === "sl-6";
                  const waLink = `https://wa.me/${(settings.whatsapp_number || "").replace(/[^0-9]/g, "")}`;
                  const finalHref = isViber ? "#" : (isWhatsApp ? waLink : (s.href || "#"));

                  return (
                    <div key={s.index} className={`relative group/soc ${!s.isVisible ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-1">
                        {!s.isVisible && editor?.isEditMode && (
                          <span className="text-amber-500 shrink-0 absolute -top-1 -left-1 bg-black/80 rounded-full p-0.5" title="Hidden (Managed in Settings page)"><EyeOff size={10} /></span>
                        )}
                        <a href={finalHref}
                          target={(!isViber && s.href) || isWhatsApp ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (isViber) {
                              e.preventDefault();
                              openViber(settings.viber_number);
                            }
                          }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ background: "rgba(255,255,255,0.07)", color: iconColor }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = iconColor;
                            (e.currentTarget as HTMLElement).style.color = "#fff";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                            (e.currentTarget as HTMLElement).style.color = iconColor;
                          }}
                        >
                          <DynamicSocialIcon name={s.icon} size={15} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Services */}
            <div className="col-span-1 lg:col-span-2 flex flex-col items-start text-left w-full" {...getNavProps(() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" }))}>
              <h4 className="font-heading font-semibold text-sm mb-4 flex items-center justify-start gap-2 group/h w-full" style={{ color: "#f1f5f9" }}>
                <EditableText section="footer" field="label_services" value={content.label_services || "Services"} />
              </h4>
              <ul className="space-y-2.5 flex flex-col items-start w-full">
                {(servicesData || [])
                  .filter(s => editor?.isEditMode || (!hiddenLinks.includes(s.id) && s.is_visible !== false))
                  .map(s => {
                    const isLinkVisible = !hiddenLinks.includes(s.id);
                    const isGloballyVisible = s.is_visible !== false;

                    return (
                      <li key={s.id} className={`relative flex flex-col group/item ${(!isLinkVisible || !isGloballyVisible) ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                        {editor?.isEditMode && (
                          <EditorToolbar
                            section="services"
                            id={s.id}
                            isVisible={isLinkVisible}
                            className="top-0 -left-6 scale-75"
                            group="item"
                            canDelete={false}
                            canClone={false}
                            onToggle={() => toggleLinkVisibility(s.id)}
                          />
                        )}
                        <div className="flex items-center gap-1.5">
                          {(!isLinkVisible || !isGloballyVisible) && editor?.isEditMode && (
                            <span className="text-amber-500 shrink-0" title={!isGloballyVisible ? "Service hidden globally" : "Link Hidden"}><EyeOff size={11} /></span>
                          )}
                          <a href={s.href || "#services"} className="text-[0.8125rem] transition-colors duration-150 w-fit line-clamp-2" style={{ color: "#94a3b8" }}
                            onMouseEnter={e => ((e.target as HTMLElement).style.color = "#60a5fa")}
                            onMouseLeave={e => ((e.target as HTMLElement).style.color = "#94a3b8")}
                          >
                            {s.title ? String(s.title).replace(/<[^>]*>?/gm, '') : ""}
                          </a>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Company */}
            <div className="col-span-1 lg:col-span-2 flex flex-col items-start text-left w-full" {...getNavProps(() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" }))}>
              <h4 className="font-heading font-semibold text-sm mb-4 flex items-center justify-start gap-2 group/h w-full" style={{ color: "#f1f5f9" }}>
                <EditableText section="footer" field="label_company" value={content.label_company || "Company"} />
              </h4>
              <ul className="space-y-2.5 flex flex-col items-start w-full">
                {[
                  { label: "Who We Are", href: "#about" },
                  { label: "Our Services", href: "#services" },
                  { label: "Technologies", href: "#technologies" },
                  { label: "Our Products", href: "#products" },
                  { label: "Portfolio", href: "#portfolio" },
                  { label: "Testimonials", href: "#testimonials" },
                  { label: "Careers", href: "#careers" },
                  { label: "Contact Us", href: "#contact" },
                ].map((s, i) => {
                  const isLinkVisible = !hiddenLinks.includes(s.label);
                  if (!editor?.isEditMode && !isLinkVisible) return null;

                  return (
                    <li key={s.label} className={`relative flex flex-col group/item ${!isLinkVisible ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                      {editor?.isEditMode && (
                        <EditorToolbar
                          section="footer"
                          isVisible={isLinkVisible}
                          className="top-0 -left-6 scale-75"
                          group="item"
                          canDelete={false}
                          canClone={false}
                          onToggle={() => toggleLinkVisibility(s.label)}
                        />
                      )}
                      <div className="flex items-center gap-1.5">
                        {!isLinkVisible && editor?.isEditMode && (
                          <span className="text-amber-500 shrink-0" title="Link Hidden"><EyeOff size={11} /></span>
                        )}
                        <a href={s.href} className="text-[0.8125rem] transition-colors duration-150 w-fit" style={{ color: "#94a3b8" }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.color = "#60a5fa")}
                          onMouseLeave={e => ((e.target as HTMLElement).style.color = "#94a3b8")}
                        >{s.label}</a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Contact */}
            <div className="col-span-2 lg:col-span-5 relative group/contact text-left">
              <h4 className="font-heading font-semibold text-sm mb-4 flex items-center justify-start gap-2" style={{ color: "#f1f5f9" }}>
                <span><EditableText section="footer" field="label_contact" value={content.label_contact || "Contact"} /></span>
                {editor?.isEditMode && (
                  <button onClick={handleAddAddress} className="text-secondary hover:text-white bg-secondary/20 p-1 rounded transition-colors ml-auto" title="Add Address">
                    <Plus size={14} />
                  </button>
                )}
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 gap-y-10 text-sm" style={{ color: "#94a3b8" }}>
                {addressIds.map((id, index) => {
                  const isId1 = id === "1";
                  const isId2 = id === "2";

                  // Field names
                  const labelField = isId1 ? "label_address1" : isId2 ? "label_address2" : `label_address_${id}`;
                  const addressField = isId1 ? "address" : isId2 ? "address2" : `address_${id}`;
                  const emailField = isId1 ? "email" : isId2 ? "email2" : `email_${id}`;
                  const phoneField = isId1 ? "phone" : isId2 ? "phone2" : `phone_${id}`;
                  const landlineField = isId1 ? "landline" : isId2 ? "landline2" : `landline_${id}`;
                  const linkField = isId1 ? "website_link" : isId2 ? "website_link2" : `website_link_${id}`;

                  // Default values
                  const defaultLabel = isId1 ? "Systems Solutions" : isId2 ? "Brilliant Systems Solutions" : "New Company";
                  const defaultAddr = isId1 ? "Alia Building, 7th Floor\nGandhakoalhi Magu, Malé" : isId2 ? "H.Brilliant Building, 2nd Floor\nMale', Maldives" : "New Address\nCity, Country";
                  const defaultEmail = isId1 ? "info@solutions.com.mv" : isId2 ? "info@bsyssolutions.com" : "info@company.com";
                  const defaultPhone = isId1 ? "+960 301-1355" : isId2 ? "+960 777-1234" : "+960 000-0000";
                  const defaultLandline = isId1 ? "+91-452 238 7388" : isId2 ? "+960 333-1234" : "+91-000 000 0000";
                  const defaultLink = isId1 ? "www.solutions.com.mv" : isId2 ? "www.bsyssolutions.com" : "www.company.com";

                  return (
                    <li key={id} className="relative group/addr">
                      {editor?.isEditMode && (
                        <div className="absolute -left-7 top-1 opacity-0 group-hover/addr:opacity-100 transition-opacity">
                          <button onClick={() => handleDeleteAddress(id)} className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 rounded" title="Delete Address">
                            <LucideIcons.Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      <div className="font-semibold text-slate-300 mb-3">
                        <a href={`https://${(contact[linkField] || defaultLink).replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors inline-block" title="Visit website" onClick={(e) => { if (editor?.isEditMode) e.preventDefault(); }}>
                          <EditableText section="footer" field={labelField} value={content[labelField] || defaultLabel} />
                        </a>
                        {editor?.isEditMode && (
                          <div className="text-[10px] text-slate-500 font-normal mt-1 block">
                            Link: <EditableText section="contact" field={linkField} value={contact[linkField] || defaultLink} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 mt-1">
                        {/* Address */}
                        <div className="whitespace-pre-line text-xs leading-relaxed">
                          <EditableText section="contact" field={addressField} value={String(contact[addressField] || defaultAddr).replace(/\\n/g, '\n')} />
                        </div>

                        {/* Contact Details */}
                        <div className="flex flex-col gap-2 text-xs w-full">
                          <div className="flex items-center justify-start gap-2 hover:text-blue-400 transition-colors group/link">
                            <LucideIcons.Mail size={12} className="opacity-60 group-hover/link:opacity-100 transition-opacity shrink-0" />
                            <a href={`mailto:${contact[emailField] || defaultEmail}`} className="hover:underline truncate">
                              <EditableText section="contact" field={emailField} value={contact[emailField] || defaultEmail} />
                            </a>
                          </div>
                          <div className="flex items-center justify-start gap-2">
                            <LucideIcons.Smartphone size={12} className="opacity-60 shrink-0" />
                            <EditableText section="contact" field={phoneField} value={contact[phoneField] || defaultPhone} />
                          </div>
                          <div className="flex items-center justify-start gap-2">
                            <LucideIcons.PhoneCall size={12} className="opacity-60 shrink-0" />
                            <EditableText section="contact" field={landlineField} value={contact[landlineField] || defaultLandline} />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs relative"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8", paddingTop: "1.5rem" }}>
            <span>
              <EditableText section="footer" field="copyright" value={content.copyright || `© ${new Date().getFullYear()} Systems Solutions Pvt Ltd. All rights reserved.`} />
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)" }} className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <Globe size={12} />
              <span>
                <EditableText section="footer" field="location" value={content.location || "Malé, Maldives"} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
