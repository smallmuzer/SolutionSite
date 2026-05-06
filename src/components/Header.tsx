import { useState, useEffect, useRef } from "react";
import { Menu, X, ExternalLink, Sun, Moon, ShieldCheck, Settings } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { EditableText, EditorToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

const DEFAULT_NAV = [
  { label: "Who We Are", href: "#about" },
  { label: "What We Do", href: "#services" },
  { label: "Our Products", href: "#products" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Global Presence", href: "#global-reach" },
  { label: "Careers", href: "#careers" },
  { label: "Reach Us", href: "#contact" },
];

interface NavItem { label: string; href: string; }

import { saveThemePref } from "@/hooks/useSiteSettings";

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const toggle = () => {
    const next = !isDark;
    const theme = next ? "dark" : "light";
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    saveThemePref(theme);
    window.dispatchEvent(new CustomEvent("ss:themeChanged", { detail: theme }));
    setIsDark(next);
  };
  return { isDark, toggle };
}

import { useSiteContent, useSiteSettingsData as useSiteSettings } from "@/hooks/useSiteContent";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("#home");
  const settings = useSiteSettings();
  const careersContent = useSiteContent("careers");
  const { isDark, toggle } = useDarkMode();
  const getNavProps = useLiveEditorNavigation();
  const editor = useLiveEditor();

  const mobileTimer = useRef<ReturnType<typeof setTimeout>>();

  const demoLink = settings.demo_url || "https://demo.hrmetrics.com.mv/";
  const logoPath = settings.site_logo || null;
  const siteName = settings.site_name || "Systems Solutions";
  const navItems = DEFAULT_NAV;
  const careersSectionVisible = careersContent.section_visible !== false && careersContent.section_visible !== "false";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section via IntersectionObserver
  useEffect(() => {
    const ids = navItems.map((n) => n.href.replace("#", ""));
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => ratios.set(e.target.id, e.intersectionRatio));
        let maxRatio = 0, activeId = ids[0];
        ratios.forEach((ratio, id) => { if (ratio > maxRatio) { maxRatio = ratio; activeId = id; } });
        if (maxRatio > 0.1) setActiveSection(`#${activeId}`);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-70px 0px -20% 0px" }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [navItems]);



  const openMobile = () => {
    setMobileOpen(true);
    clearTimeout(mobileTimer.current);
    setTimeout(() => setMobileVisible(true), 10);
  };
  const closeMobile = () => {
    setMobileVisible(false);
    mobileTimer.current = setTimeout(() => setMobileOpen(false), 280);
  };
  const scrollTo = (href: string) => {
    closeMobile();
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 50);
  };

  const navBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-[14px] font-semibold transition-colors relative whitespace-nowrap ${active ? "text-secondary bg-secondary/10" : "text-foreground hover:text-secondary hover:bg-muted"
    }`;

  const iconBtn = "p-2.5 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors";

  // Resolve logo: prefer DB path, fallback to bundled asset
  const resolvedLogo = logoPath && logoPath !== "src/assets/logo.png" ? logoPath : logo;

  return (
    <header
      style={{
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50,
        transition: "all 0.3s ease",
        background: scrolled ? "hsl(var(--background)/0.85)" : "hsl(var(--background))",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? "0 4px 20px -5px rgba(0,0,0,0.1)" : "none",
        borderBottom: scrolled ? "1px solid hsl(var(--border)/0.5)" : "1px solid transparent",
      }}
    >
      <div className="w-full flex items-center justify-between px-4 sm:px-6 h-[60px] lg:h-[55px]">
        {/* Logo */}
        <div className="relative group/logo flex items-center shrink-0">
          {editor?.isEditMode && (
            <EditorToolbar
              section="settings"
              imageField="site_logo"
              className="absolute -bottom-2.5 -left-1.5 z-[60] scale-[0.70]"
              canHide={false}
              canDelete={false}
              canClone={false}
            />
          )}
          <a href="#home" className="flex items-center gap-2.5 shrink-0">
            <img
              src={resolvedLogo}
              alt={siteName}
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = logo; }}
            />
            <div className="flex items-center gap-1.5 leading-none overflow-hidden select-none whitespace-nowrap">
              <span
                className="font-heading font-bold text-lg sm:text-xl leading-tight"
                style={{
                  color: isDark ? "#f1f5f9" : "#0f172a",
                  textShadow: "none",
                }}
              >
                <EditableText section="settings" field="site_name_part1" value={siteName.split(" ")[0]} />
              </span>
              <span
                className="font-heading font-bold text-lg sm:text-xl leading-tight"
                style={{
                  background: "linear-gradient(90deg,#60a5fa,#818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                }}
              >
                <EditableText section="settings" field="site_name_part2" value={siteName.split(" ").slice(1).join(" ") || "Solutions"} />
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center justify-end gap-1.5 flex-1 mx-4">
          {navItems.filter(item => !(item.href === '#careers' && !careersSectionVisible)).map((item) => (
            <button key={item.href} {...getNavProps(() => scrollTo(item.href))} className={navBtn(activeSection === item.href)}>
              <EditableText section="settings" field={`nav_label_${item.href.replace('#', '')}`} value={item.label} />
              <span
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-secondary rounded-full"
                style={{
                  opacity: activeSection === item.href ? 1 : 0,
                  transform: activeSection === item.href ? "scaleX(1)" : "scaleX(0)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                  transformOrigin: "center",
                }}
              />
            </button>
          ))}

          <button onClick={toggle} className={`ml-1 ${iconBtn}`} title={isDark ? "Switch to light" : "Switch to dark"}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            {...getNavProps(() => scrollTo("#contact"))}
            className="ml-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-semibold text-xs hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            Get Started
          </button>

          {editor?.isEditMode && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-border/50 pl-2 animate-in slide-in-from-right-2 duration-500">
               <button 
                  onClick={editor.onOpenCustomizer}
                  className="p-1.5 hover:bg-secondary/10 rounded-lg text-muted-foreground hover:text-secondary transition-all group relative"
                  title="UI Style Settings"
                >
                  <Settings size={16} className="group-hover:rotate-90 transition-transform duration-700 ease-in-out" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full border-2 border-background animate-bounce" />
                </button>

                {Object.keys(editor.pendingChanges).length > 0 && (
                  <button 
                    onClick={editor.handleSaveAll}
                    className="relative px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-[0_0_20px_rgba(var(--secondary),0.5)] group overflow-hidden"
                  >
                    <span className="relative z-10">Save {Object.keys(editor.pendingChanges).length}</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="absolute inset-0 animate-pulse bg-secondary/50 blur-lg -z-10" />
                  </button>
                )}
            </div>
          )}

          <div className="flex items-center gap-1 ml-1">
            <a
              href="/admin/login"
              target="_blank" rel="noopener noreferrer"
              title="Admin Panel"
              className="p-2 rounded-lg border transition-all bg-secondary/15 border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              <ShieldCheck size={17} />
            </a>
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 xl:hidden">
          <button onClick={toggle} className="p-1.5 rounded-lg text-foreground hover:bg-muted transition-colors">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={mobileOpen ? closeMobile : openMobile} className="p-1.5 rounded-lg text-foreground hover:bg-muted transition-colors">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu - Compact Right Popup */}
      {mobileOpen && (
        <div
          className="xl:hidden fixed top-14 right-4 w-64 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] overflow-hidden"
          style={{
            opacity: mobileVisible ? 1 : 0,
            transform: mobileVisible ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.95)",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: mobileVisible ? "auto" : "none",
          }}
        >
          <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Navigation</span>
            <button onClick={closeMobile} className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground">
              <X size={14} />
            </button>
          </div>

          <nav className="flex flex-col p-2 gap-1 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {navItems.filter(item => !(item.href === '#careers' && !careersSectionVisible)).map((item) => (
              <button
                key={item.href}
                {...getNavProps(() => scrollTo(item.href))}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-between group ${activeSection === item.href
                    ? "text-secondary bg-secondary/10"
                    : "text-foreground/80 hover:text-foreground hover:bg-muted"
                  }`}
              >
                <EditableText section="settings" field={`nav_label_${item.href.replace('#', '')}`} value={item.label} />
                {activeSection === item.href && <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
              </button>
            ))}

            {editor?.isEditMode && (
              <div className="mt-4 px-3 flex flex-col gap-2">
                <div className="h-px bg-border w-full mb-2" />
                <button 
                  onClick={editor.onOpenCustomizer}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl text-sm font-bold text-foreground"
                >
                  <span>UI Customizer</span>
                  <Settings size={18} />
                </button>
                {Object.keys(editor.pendingChanges).length > 0 && (
                  <button 
                    onClick={editor.handleSaveAll}
                    className="w-full py-4 bg-secondary text-secondary-foreground rounded-xl font-black uppercase tracking-widest shadow-lg shadow-secondary/20 animate-pulse"
                  >
                    Save {Object.keys(editor.pendingChanges).length} Changes
                  </button>
                )}
              </div>
            )}

            <div className="h-px bg-border my-1 mx-2" />


            <a href="/admin/login" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-muted font-semibold text-sm transition-all">
              <ShieldCheck size={14} /> Admin Panel
            </a>

            <button {...getNavProps(() => scrollTo("#contact"))}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold text-xs shadow-sm mt-1 hover:opacity-90 transition-opacity">
              Get Started
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
