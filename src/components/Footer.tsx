import React, { useState, useRef, useEffect } from "react";
import { Facebook, Twitter, Linkedin, Instagram, ExternalLink, Globe, PhoneCall, Plus, EyeOff } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import { openViber, ViberIcon, VIBER_COLOR } from "@/lib/viber";
import { useSiteContent, useNetworkCompanies, useSiteSettings, useSocialLinks } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation, hasEmbeddedColor } from "./admin/LiveEditorContext";

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

const MobileReadMore = ({ text, clampClass, textClass, section, field, id }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (window.innerWidth >= 640) { setOverflows(false); return; }
      setOverflows(el.scrollHeight > el.clientHeight + 2);
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
            <div className="text-center mb-10">
              <span className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: hasEmbeddedColor(content.network_badge) ? undefined : (content.network_badge_color || undefined) }}>
                <EditableText section="footer" field="network_badge" value={content.network_badge || "Our Network"} colorField="network_badge_color" />
              </span>
              <h3 className="font-heading font-bold text-2xl mt-2 text-foreground relative" style={{ color: hasEmbeddedColor(content.network_title) ? undefined : (content.network_title_color || undefined) }}>
                <span className="inline-flex items-center gap-2">
                  <EditableText section="footer" field="network_title" value={content.network_title || "Associated Companies"} colorField="network_title_color" />
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

            <div className="flex flex-col sm:flex-row items-stretch gap-0 w-full max-w-4xl mx-auto">
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
                      className={`group relative rounded-xl p-4 overflow-visible transition-all duration-300 hover:-translate-y-0.5 flex-1 border border-border/40 group/item relative ${!isVisible ? 'opacity-40 grayscale-[0.5] border-dashed border-2' : ''}`}
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
                            <h4 className="font-heading font-bold text-[0.9375rem] leading-tight text-foreground line-clamp-1">
                              <EditableText section="our_network" field="name" id={co.id} value={co.name} />
                            </h4>
                            {co.href !== "#" && <ExternalLink size={12} className="text-muted-foreground" />}
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

                    {/* Handshake connector — use Unicode directly, not encoded */}
                    {idx < associated.length - 1 && (
                      <div className="flex items-center justify-center shrink-0 z-10" style={{ width: 48, margin: "0 -1px" }}>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-px h-6 bg-border/50 sm:hidden" />
                          <div className="hidden sm:flex items-center gap-0">
                            <div className="w-3 h-px bg-border/60" />
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted border border-border/50" title="Partnership">
                              <span style={{ fontSize: 16 }}>🤝</span>
                            </div>
                            <div className="w-3 h-px bg-border/60" />
                          </div>
                          <span className="hidden sm:block text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">Partners</span>
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
        <div className="relative z-10 container-wide px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2.5 mb-4">
                {logoPath ? (
                  <img src={logoPath} alt={siteName}
                    style={{ width: 38, height: 38, borderRadius: 10, objectFit: "contain", flexShrink: 0 }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>S</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5 leading-none">
                  <span className="font-heading font-bold text-[1rem] leading-tight" style={{ color: "#f1f5f9" }}>
                    <EditableText section="settings" field="site_name_part1" value={siteName.split(" ")[0] || "Systems"} />
                  </span>
                  <span className="font-heading font-bold text-[1rem] leading-tight"
                    style={{ background: "linear-gradient(90deg,#60a5fa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    <EditableText section="settings" field="site_name_part2" value={siteName.split(" ").slice(1).join(" ") || "Solutions"} />
                  </span>
                </div>
              </div>
              <div className="text-sm leading-relaxed mb-5 relative" style={{ color: "#94a3b8" }}>
                <EditableText section="footer" field="tagline" value={content.tagline || "Leading IT consulting and software development company delivering cutting-edge technology solutions."} />
              </div>
              <div className="flex flex-wrap items-center gap-2.5 relative">
                {socialList.map((s) => {
                  if (!editor?.isEditMode && !s.isVisible) return null;
                  const iconColor = s.color || "#3b82f6";

                  return (
                    <div key={s.index} className={`relative group/soc ${!s.isVisible ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-1">
                        {!s.isVisible && editor?.isEditMode && (
                          <span className="text-amber-500 shrink-0 absolute -top-1 -left-1 bg-black/80 rounded-full p-0.5" title="Hidden (Managed in Settings page)"><EyeOff size={10} /></span>
                        )}
                        <a href={s.href || "#"}
                          target={s.href ? "_blank" : undefined}
                          rel="noopener noreferrer"
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
            <div className="lg:col-span-2" {...getNavProps(() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" }))}>
              <h4 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2 group/h" style={{ color: "#f1f5f9" }}>
                <EditableText section="footer" field="label_services" value={content.label_services || "Services"} />
              </h4>
              <ul className="space-y-2.5">
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
                          <a href={s.href || "#services"} className="text-sm transition-colors duration-150 w-fit" style={{ color: "#94a3b8" }}
                            onMouseEnter={e => ((e.target as HTMLElement).style.color = "#60a5fa")}
                            onMouseLeave={e => ((e.target as HTMLElement).style.color = "#94a3b8")}
                          >{s.title}</a>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Company */}
            <div className="lg:col-span-2" {...getNavProps(() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" }))}>
              <h4 className="font-heading font-semibold text-sm mb-4" style={{ color: "#f1f5f9" }}>
                <EditableText section="footer" field="label_company" value={content.label_company || "Company"} />
              </h4>
              <ul className="space-y-2.5">
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
                        <a href={s.href} className="text-sm transition-colors duration-150 w-fit" style={{ color: "#94a3b8" }}
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
            <div className="sm:col-span-2 lg:col-span-5 relative group/contact">
              <h4 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "#f1f5f9" }}>
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
                        <div className="flex flex-col gap-2 text-xs">
                          <div className="flex items-center gap-2 hover:text-blue-400 transition-colors group/link">
                            <LucideIcons.Mail size={12} className="opacity-60 group-hover/link:opacity-100 transition-opacity shrink-0" />
                            <a href={`mailto:${contact[emailField] || defaultEmail}`} className="hover:underline truncate">
                              <EditableText section="contact" field={emailField} value={contact[emailField] || defaultEmail} />
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <LucideIcons.Smartphone size={12} className="opacity-60 shrink-0" />
                            <EditableText section="contact" field={phoneField} value={contact[phoneField] || defaultPhone} />
                          </div>
                          <div className="flex items-center gap-2">
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
