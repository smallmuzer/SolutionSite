import React, { useState, useRef, useEffect } from "react";
import { Facebook, Twitter, Linkedin, Instagram, ExternalLink, Globe, PhoneCall, Plus } from "lucide-react";
import { openViber, ViberIcon, VIBER_COLOR } from "@/lib/viber";
import { useSiteContent, useNetworkCompanies, useSiteSettings } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import { EditableText, EditorToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

const MobileReadMore = ({ text, clampClass, textClass, section, field, id }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
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
      <p ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
          <EditableText section={section} field={field} id={id} value={text} />
        ) : text}
      </p>
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
  const content = useSiteContent("footer");
  const contact = useSiteContent("contact");
  const associated = useNetworkCompanies();
  const settings = useSiteSettings();
  // Load logo + site name from settings (already in useSiteSettings)
  const logoPath = settings.site_logo || "";
  const siteName = settings.site_name || "Systems Solutions";

  const { data: servicesData } = useDbQuery<{ id: string; title: string; href?: string }[]>("services", { is_visible: true }, { order: "sort_order" });
  const editor = useLiveEditor();
  const getNavProps = useLiveEditorNavigation();
  
  const hiddenLinks = (content.hidden_links || "").split(",").filter(Boolean);
  const toggleLinkVisibility = (id: string) => {
    const next = hiddenLinks.includes(id) 
      ? hiddenLinks.filter(l => l !== id) 
      : [...hiddenLinks, id];
    editor?.onUpdate("footer", "hidden_links", next.join(","));
  };
  const socials = [
    { Icon: Facebook,   href: settings.social_facebook  || contact.facebook  || "https://www.facebook.com/brilliantsystemssolutions/" },
    { Icon: Twitter,    href: settings.social_twitter   || contact.twitter   || "https://x.com/bsspl_india" },
    { Icon: Linkedin,   href: settings.social_linkedin  || contact.linkedin  || "https://in.linkedin.com/company/brilliantsystemssolutions" },
    { Icon: Instagram,  href: settings.social_instagram || contact.instagram || "https://www.instagram.com/brilliantsystemssolutions" },
    { Icon: ViberIcon,  onClick: () => openViber(), color: VIBER_COLOR },
  ];

  return (
    <footer>
      {/* Associated Companies */}
      <div className="border-b border-border/50 relative">
        <div className="container-wide px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-10">
            <span className="text-secondary font-semibold text-sm uppercase tracking-widest">
              <EditableText section="footer" field="network_badge" value="Our Network" />
            </span>
            <h3 className="font-heading font-bold text-2xl mt-2 text-foreground">
              <EditableText section="footer" field="network_title" value="Associated Companies" />
            </h3>
            <p className="text-sm mt-2 max-w-md mx-auto text-muted-foreground">
              <EditableText section="footer" field="network_subtitle" value="Part of a growing family of technology companies across South Asia." />
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-0 w-full max-w-4xl mx-auto">
            {associated.map((co, idx) => (
              <React.Fragment key={co.id || co.name}>
                <a
                  href={co.href}
                  target={co.href !== "#" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group relative rounded-xl p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 flex-1 border border-border/40"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(ellipse at top left, ${co.accent}18 0%, transparent 65%)` }} />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-muted/50 overflow-hidden">
                      {(co as any).logo_url ? (
                        <img
                          src={(co as any).logo_url}
                          alt={co.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <span className="text-2xl">{co.flag || "🏢"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-heading font-bold text-[0.9375rem] leading-tight text-foreground line-clamp-1">
                          <EditableText section="network_companies" field="name" id={co.id} value={co.name} />
                        </h4>
                        {co.href !== "#" && <ExternalLink size={12} className="text-muted-foreground" />}
                      </div>
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider block" style={{ color: co.accent }}>
                        <EditableText section="network_companies" field="subtitle" id={co.id} value={co.subtitle} />
                      </span>
                      <MobileReadMore
                        section="network_companies" field="desc" id={co.id}
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
                {idx === 0 && associated.length > 1 && (
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
            ))}
          </div>
        </div>
      </div>

      {/* Main footer with AI 3D light-traveling background & reduced weight */}
      <div className="relative overflow-hidden" style={{ color: "#e2e8f0", backgroundColor: "#02040a" }}>

        {/* Footer section background image */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
          <img src="" alt="" className="w-full h-full object-cover" />
        </div>

        {/* Static dark overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 container-wide px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
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
                <div className="flex flex-col leading-none">
                  <span className="font-heading font-bold text-[0.9375rem] leading-tight" style={{ color: "#f1f5f9" }}>
                    <EditableText section="settings" field="site_name_part1" value={siteName.split(" ")[0] || "Systems"} />
                  </span>
                  <span className="font-heading font-bold text-[0.9375rem] leading-tight"
                    style={{ background: "linear-gradient(90deg,#60a5fa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    <EditableText section="settings" field="site_name_part2" value={siteName.split(" ").slice(1).join(" ") || "Solutions"} />
                  </span>
                </div>
              </div>
              <div className="text-sm leading-relaxed mb-5 relative" style={{ color: "#64748b" }}>
                <EditableText section="footer" field="tagline" value={content.tagline || "Leading IT consulting and software development company delivering cutting-edge technology solutions."} />
              </div>
              <div className="flex gap-2.5 relative">
                {socials.map((s, i) => {
                  const Icon = s.Icon as any;
                  return (
                    <a key={i} href={s.href || "#"} target={s.href ? "_blank" : undefined} rel="noopener noreferrer"
                      onClick={(e) => { if (s.onClick) { e.preventDefault(); s.onClick(); } }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                      style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = s.color || "#3b82f6"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                    >
                      <Icon size={15} />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Services */}
            <div {...getNavProps(() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" }))}>
              <h4 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2 group/h" style={{ color: "#f1f5f9" }}>
                <EditableText section="footer" field="label_services" value="Services" />
              </h4>
              <ul className="space-y-2.5">
                {(editor?.isEditMode ? (servicesData || []) : (servicesData || []).slice(0, 6)).map(s => {
                  const isLinkVisible = !hiddenLinks.includes(s.id);
                  if (!editor?.isEditMode && !isLinkVisible) return null;
                  
                  return (
                    <li key={s.id} className={`relative flex flex-col group/item ${!isLinkVisible ? 'opacity-40 grayscale-[0.5]' : ''}`}>
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
                      <a href={s.href || "#services"} className="text-sm transition-colors duration-150 w-fit" style={{ color: "#64748b" }}
                        onMouseEnter={e => ((e.target as HTMLElement).style.color = "#60a5fa")}
                        onMouseLeave={e => ((e.target as HTMLElement).style.color = "#64748b")}
                      >{s.title}</a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Company */}
            <div {...getNavProps(() => document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" }))}>
              <h4 className="font-heading font-semibold text-sm mb-4" style={{ color: "#f1f5f9" }}>
                <EditableText section="footer" field="label_company" value="Company" />
              </h4>
              <ul className="space-y-2.5">
                {[
                { label: "Who We Are",   href: "#about"        },
                  { label: "Our Services", href: "#services"     },
                  { label: "Technologies", href: "#technologies" },
                  { label: "Our Products", href: "#products"     },
                  { label: "Portfolio",    href: "#portfolio"    },
                  { label: "Testimonials", href: "#testimonials" },
                  { label: "Careers",      href: "#careers"      },
                  { label: "Contact Us",   href: "#contact"      },
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
                      <a href={s.href} className="text-sm transition-colors duration-150 w-fit" style={{ color: "#64748b" }}
                        onMouseEnter={e => ((e.target as HTMLElement).style.color = "#60a5fa")}
                        onMouseLeave={e => ((e.target as HTMLElement).style.color = "#64748b")}
                      >{s.label}</a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-heading font-semibold text-sm mb-4" style={{ color: "#f1f5f9" }}>Contact</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: "#64748b" }}>
                <li>{(contact.address as string)?.split("\n")[0] || "Alia Building, 7th Floor"}</li>
                <li>{(contact.address as string)?.split("\n")[1] || "Gandhakoalhi Magu, Malé"}</li>
                <li>
                  <a href={`mailto:${contact.email || "info@solutions.com.mv"}`} style={{ color: "#60a5fa" }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = "underline")}
                    onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = "none")}
                  >{contact.email || "info@solutions.com.mv"}</a>
                </li>
                <li>{contact.phone || "+960 301-1355"}</li>
                <li>{contact.landline || "+91-452 238 7388"}</li>
              </ul>
            </div>
          </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs relative"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)", color: "#475569", paddingTop: "1.5rem" }}>
              <span>
                <EditableText section="footer" field="copyright" value={content.copyright || `© ${new Date().getFullYear()} Systems Solutions Pvt Ltd. All rights reserved.`} />
              </span>
            <span style={{ color: "rgba(255,255,255,0.15)" }} className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <Globe size={12} />
              <span>Malé, Maldives</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
