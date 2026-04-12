import { useState, useEffect, useRef } from "react";
import { Menu, X, ExternalLink, Sun, Moon, ShieldCheck, Settings } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const DEFAULT_NAV = [
  { label: "Home",         href: "#home" },
  { label: "Modern",       href: "#products" },
  { label: "Popular",      href: "#portfolio" },
  { label: "Trending",     href: "#services" },
];

interface NavItem { label: string; href: string; }

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem("bss-user-settings");
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.theme === "dark") return true;
        if (prefs.theme === "light") return false;
      }
    } catch {}
    const cached = localStorage.getItem("bss-theme");
    if (cached === "dark") return true;
    if (cached === "light") return false;
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
    localStorage.setItem("bss-theme", theme);
    try {
      const stored = localStorage.getItem("bss-user-settings");
      const prefs = stored ? JSON.parse(stored) : {};
      prefs.theme = theme;
      localStorage.setItem("bss-user-settings", JSON.stringify(prefs));
    } catch {}
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
  const [tourCompleted, setTourCompleted] = useState(() => localStorage.getItem("bss_tour_completed_v2") === "true");
  const mobileTimer = useRef<ReturnType<typeof setTimeout>>();

  const demoLink = settings.demo_url || "https://demo.hrmetrics.com.mv/";
  const logoPath = settings.site_logo || null;
  const siteName = settings.site_name || "Systems Solutions";
  const navItems = Array.isArray(settings.nav_items) && settings.nav_items.length > 0 ? settings.nav_items : DEFAULT_NAV;
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
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-80px 0px -20% 0px" }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [navItems]);

  // Tour completion monitor
  useEffect(() => {
    const check = () => setTourCompleted(localStorage.getItem("bss_tour_completed_v2") === "true");
    const interval = setInterval(check, 1000);
    window.addEventListener("storage", check);
    window.addEventListener("bss:tourCompleted", check);
    return () => { clearInterval(interval); window.removeEventListener("storage", check); window.removeEventListener("bss:tourCompleted", check); };
  }, []);

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
    setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const navBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-[14px] font-semibold transition-colors relative whitespace-nowrap ${scrolled
      ? active ? "text-secondary bg-secondary/10" : "text-foreground hover:text-secondary hover:bg-muted"
      : active ? "text-secondary bg-white/20"    : "text-white hover:text-white hover:bg-white/10"
    }`;

  const iconBtn = scrolled
    ? "p-2.5 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
    : "p-2.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors";

  // Resolve logo: prefer DB path, fallback to bundled asset
  const resolvedLogo = logoPath && logoPath !== "src/assets/logo.png" ? logoPath : logo;

  return (
    <header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        transition: "background 0.3s ease, box-shadow 0.3s ease",
        ...(scrolled
          ? { background: "hsl(var(--card)/0.92)", backdropFilter: "blur(20px)", boxShadow: "0 1px 24px rgba(0,0,0,0.10)", borderBottom: "1px solid hsl(var(--border)/0.5)" }
          : { background: "transparent" }),
      }}
    >
      <div className="w-full flex items-center justify-between px-4 sm:px-6 h-12 lg:h-14">
        {/* Logo */}
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
                color: scrolled ? (isDark ? "#f1f5f9" : "#0f172a") : "#ffffff",
                textShadow: scrolled ? "none" : "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              {siteName.split(" ")[0]}
            </span>
            <span
              className="font-heading font-bold text-lg sm:text-xl leading-tight"
              style={{
                background: "linear-gradient(90deg,#60a5fa,#818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                filter: scrolled ? "none" : "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
              }}
            >
              {siteName.split(" ").slice(1).join(" ") || "Solutions"}
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center justify-center gap-1.5 flex-1 mx-4">
          {navItems.filter(item => !(item.href === '#careers' && !careersSectionVisible)).map((item) => (
            <button key={item.href} onClick={() => scrollTo(item.href)} className={navBtn(activeSection === item.href)}>
              {item.label}
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


          <a
            href={demoLink}
            target="_blank" rel="noopener noreferrer"
            className="ml-1 px-2 py-1.5 border border-secondary text-secondary rounded-lg font-semibold text-xs hover:bg-secondary hover:text-secondary-foreground transition-all inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <ExternalLink size={12} /> Get Access
          </a>

          <button onClick={toggle} className={`ml-1 ${iconBtn}`} title={isDark ? "Switch to light" : "Switch to dark"}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => scrollTo("#contact")}
            className="ml-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg font-semibold text-xs hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            Get Started
          </button>

          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("ss:openCustomizer"))}
              title="User Experience Settings"
              className={`p-2 rounded-lg border transition-all relative group ${
                scrolled
                  ? "bg-secondary/15 border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  : "bg-black/60 border-white/40 text-white hover:bg-black/80 backdrop-blur-md shadow-lg"
              } ${!tourCompleted ? "animate-pulse shadow-[0_0_15px_rgba(var(--secondary),0.4)]" : ""}`}
            >
              <Settings size={17} className={`group-hover:animate-[spin_3s_linear_infinite_reverse] ${!tourCompleted ? "animate-[spin_8s_linear_infinite]" : ""}`} />
              <span className={`absolute -inset-1 rounded-lg bg-secondary/20 blur transition-opacity ${!tourCompleted ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-100"}`} />
            </button>
            <a
              href="/admin/login"
              target="_blank" rel="noopener noreferrer"
              title="Admin Panel"
              className={`p-2 rounded-lg border transition-all ${
                scrolled
                  ? "bg-secondary/15 border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  : "bg-black/60 border-white/40 text-white hover:bg-black/80 backdrop-blur-md shadow-lg"
              }`}
            >
              <ShieldCheck size={17} />
            </a>
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 xl:hidden">
          <button onClick={toggle} className={`p-1.5 rounded-lg ${scrolled ? "text-foreground" : "text-white"}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={mobileOpen ? closeMobile : openMobile} className={`p-1.5 rounded-lg ${scrolled ? "text-foreground" : "text-white"}`}>
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
                onClick={() => scrollTo(item.href)}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-between group ${
                  activeSection === item.href 
                    ? "text-secondary bg-secondary/10" 
                    : "text-foreground/80 hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
                {activeSection === item.href && <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
              </button>
            ))}
            
            <div className="h-px bg-border my-1 mx-2" />
            
            <a href={demoLink} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-secondary hover:bg-secondary/10 font-bold text-sm transition-all">
              <ExternalLink size={14} /> Get Access
            </a>
            
            <a href="/admin/login" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-muted font-semibold text-sm transition-all">
              <ShieldCheck size={14} /> Admin Panel
            </a>

            <button onClick={() => scrollTo("#contact")}
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
