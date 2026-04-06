import { useState, useEffect, useRef } from "react";
import { Menu, X, ExternalLink, Sun, Moon, LayoutDashboard, Settings } from "lucide-react";
import logo from "@/assets/logo.png";

const DEFAULT_NAV = [
  { label: "Home",     href: "#home" },
  { label: "About",    href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#products" },
  { label: "Portfolio",href: "#portfolio" },
  { label: "Careers",  href: "#careers" },
  { label: "Contact",  href: "#contact" },
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

async function fetchSettings(): Promise<Record<string, any>> {
  try {
    const res = await fetch("/api/db/site_content?section_key=settings&_single=1");
    const json = await res.json();
    return (json?.data?.content as Record<string, any>) ?? {};
  } catch {
    return {};
  }
}

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("#home");
  const [demoLink, setDemoLink] = useState("https://demo.hrmetrics.mv/");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("Systems Solutions");
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV);
  const { isDark, toggle } = useDarkMode();
  const [tourCompleted, setTourCompleted] = useState(() => localStorage.getItem("bss_tour_completed_v2") === "true");
  const mobileTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load settings from SQLite via REST API
  useEffect(() => {
    fetchSettings().then((c) => {
      if (c.demo_url)  setDemoLink(c.demo_url);
      if (c.site_logo) setLogoPath(c.site_logo);
      if (c.site_name) setSiteName(c.site_name);
      if (Array.isArray(c.nav_items) && c.nav_items.length > 0) setNavItems(c.nav_items);
    });

    // Live updates when admin saves settings
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d.demo_url)  setDemoLink(d.demo_url);
      if (d.site_logo) setLogoPath(d.site_logo);
      if (d.site_name) setSiteName(d.site_name);
      if (Array.isArray(d.nav_items) && d.nav_items.length > 0) setNavItems(d.nav_items);
    };
    window.addEventListener("ss:siteSettings", handler);
    return () => window.removeEventListener("ss:siteSettings", handler);
  }, []);

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
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${scrolled
      ? active ? "text-secondary bg-secondary/10" : "text-foreground hover:text-secondary hover:bg-muted"
      : active ? "text-secondary bg-white/20"    : "text-white font-semibold hover:text-white hover:bg-white/10"
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
      <div className="container-wide flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 lg:h-20">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2.5">
          <img
            src={resolvedLogo}
            alt={siteName}
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = logo; }}
          />
          <div className="flex flex-col leading-none">
            <span
              className="font-heading font-bold text-[1.3rem] leading-tight"
              style={{
                color: scrolled ? (isDark ? "#f1f5f9" : "#0f172a") : "#ffffff",
                textShadow: scrolled ? "none" : "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              {siteName.split(" ")[0] || "Systems"}
            </span>
            <span className="font-heading font-bold text-[1.3rem] leading-tight gradient-text">
              {siteName.split(" ").slice(1).join(" ") || "Solutions"}
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
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
            className="ml-2 px-4 py-2.5 border border-secondary text-secondary rounded-lg font-semibold text-sm hover:bg-secondary hover:text-secondary-foreground transition-all flex items-center gap-1.5"
          >
            <ExternalLink size={14} /> Get Access
          </a>

          <button onClick={toggle} className={`ml-1 ${iconBtn}`} title={isDark ? "Switch to light" : "Switch to dark"}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => scrollTo("#contact")}
            className="ml-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("ss:openCustomizer"))}
              title="User Experience Settings"
              className={`p-2.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all relative group ${!tourCompleted ? "animate-pulse shadow-[0_0_15px_rgba(var(--secondary),0.4)]" : ""}`}
            >
              <Settings size={17} className={`group-hover:animate-[spin_3s_linear_infinite_reverse] drop-shadow-[0_0_8px_rgba(var(--secondary),0.6)] ${!tourCompleted ? "animate-[spin_8s_linear_infinite]" : ""}`} />
              <span className={`absolute -inset-1 rounded-lg bg-secondary/20 blur transition-opacity ${!tourCompleted ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-100"}`} />
            </button>
            <a
              href="/admin/login"
              target="_blank" rel="noopener noreferrer"
              title="Admin Panel"
              className="p-2.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
            >
              <LayoutDashboard size={17} />
            </a>
          </div>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <button onClick={toggle} className={`p-2 rounded-lg ${scrolled ? "text-foreground" : "text-white"}`}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={mobileOpen ? closeMobile : openMobile} className={`p-2 rounded-lg ${scrolled ? "text-foreground" : "text-white"}`}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="lg:hidden bg-card/95 backdrop-blur-xl border-b border-border overflow-hidden"
          style={{
            opacity: mobileVisible ? 1 : 0,
            maxHeight: mobileVisible ? 540 : 0,
            transition: "opacity 0.25s ease, max-height 0.28s ease",
          }}
        >
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className={`text-left px-4 py-3 rounded-lg font-medium ${activeSection === item.href ? "text-secondary bg-secondary/10" : "text-foreground hover:bg-muted"}`}
              >
                {item.label}
              </button>
            ))}
            <a href={demoLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-secondary hover:bg-muted font-medium">
              <ExternalLink size={16} /> Get Access
            </a>
            <a href="/admin/login" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-secondary bg-secondary/10 hover:bg-secondary/20 font-medium">
              <LayoutDashboard size={16} /> Admin Panel
            </a>
            <button onClick={() => scrollTo("#contact")}
              className="mt-2 px-5 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold">
              Get Started
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
