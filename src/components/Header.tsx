import { useState, useEffect, useRef, useMemo } from "react";
import { Menu, X, Sun, Moon, ShieldCheck, Settings, Eye, EyeOff, Trash2, RotateCcw, ChevronLeft, ChevronRight, Plus } from "lucide-react";
const DEFAULT_LOGO = "/logo.png";
import { EditableText, EditorToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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
  const siteUrl = settings.site_url || "";

  const getFullLogoUrl = (path: string | null) => {
    if (!path || path === "src/assets/logo.png") return DEFAULT_LOGO;
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
    const cleanSiteUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return cleanSiteUrl ? `${cleanSiteUrl}${cleanPath}` : cleanPath;
  };
  const siteName = settings.site_name || "Systems Solutions";
  const pendingHiddenNavItems = editor?.pendingChanges?.["settings:nav_hidden_items"];
  const settingsContent = useSiteContent("settings");
  const hiddenNavItemsValue = String(pendingHiddenNavItems ?? settingsContent.nav_hidden_items ?? "");
  const hiddenNavItems = useMemo(
    () => hiddenNavItemsValue.split(",").filter(Boolean),
    [hiddenNavItemsValue]
  );

  const pendingDeletedNavItems = editor?.pendingChanges?.["settings:nav_deleted_items"];
  const deletedNavItemsValue = String(pendingDeletedNavItems ?? settingsContent.nav_deleted_items ?? "");
  const deletedNavItems = useMemo(
    () => deletedNavItemsValue.split(",").filter(Boolean),
    [deletedNavItemsValue]
  );

  const getBaseNavItems = () => {
    let rawNavItems = editor?.pendingChanges?.["settings:nav_items"] ?? settingsContent.nav_items;
    let custom = rawNavItems;
    if (typeof custom === 'string') {
      try { custom = JSON.parse(custom); } catch { custom = null; }
    }
    if (!Array.isArray(custom) || custom.length === 0) {
      custom = DEFAULT_NAV;
    }
    return custom as { label: string, href: string }[];
  };

  const customNavItems = useMemo(getBaseNavItems, [editor?.pendingChanges, settingsContent.nav_items, (settings as any).nav_items]);

  const navItems = customNavItems.map(item => {
    const key = `nav_link_${item.href.replace('#', '')}`;
    const labelKey = `nav_label_${item.href.replace('#', '')}`;
    const pendingKey = `settings:${key}`;
    const pendingLabelKey = `settings:${labelKey}`;
    const pendingVal = editor?.pendingChanges?.[pendingKey];
    const pendingLabelVal = editor?.pendingChanges?.[pendingLabelKey];

    let resolvedHref = pendingVal ?? settingsContent[key] ?? (settings as any)[key] ?? item.href;
    if (typeof resolvedHref === 'string') {
      resolvedHref = resolvedHref.trim();
      if (!resolvedHref.startsWith("#") && !resolvedHref.startsWith("http") && !resolvedHref.startsWith("/")) {
        resolvedHref = "#" + resolvedHref;
      }
    }

    return {
      ...item,
      resolvedHref,
      resolvedLabel: pendingLabelVal ?? settingsContent[labelKey] ?? (settings as any)[labelKey] ?? item.label
    };
  }).filter(item => {
    if (deletedNavItems.includes(item.href)) return false;
    return editor?.isEditMode || !hiddenNavItems.includes(item.href);
  });

  const toggleNavVisibility = async (href: string) => {
    const isHidden = hiddenNavItems.includes(href);
    const next = isHidden
      ? hiddenNavItems.filter((h: string) => h !== href)
      : [...hiddenNavItems, href];
    editor?.onUpdate("settings", "nav_hidden_items", next.join(","));
  };
  const careersSectionVisible = careersContent.section_visible !== false && careersContent.section_visible !== "false";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section via IntersectionObserver
  useEffect(() => {
    const ids = navItems.map((n) => n.resolvedHref.replace("#", ""));
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
    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (href.startsWith("#")) {
      setTimeout(() => {
        try {
          const el = document.querySelector(href);
          if (el) {
            // Try named scroll container first, then find the nearest scrollable ancestor
            let scrollContainer: Element | null = document.getElementById("admin-main-scroll");
            if (!scrollContainer && editor?.isEditMode) {
              // Walk up from the target element to find the scrollable parent (overflow-auto on <main>)
              let parent = el.parentElement;
              while (parent && parent !== document.documentElement) {
                const style = window.getComputedStyle(parent);
                if ((style.overflow === "auto" || style.overflow === "scroll" ||
                  style.overflowY === "auto" || style.overflowY === "scroll") &&
                  parent.scrollHeight > parent.clientHeight) {
                  scrollContainer = parent;
                  break;
                }
                parent = parent.parentElement;
              }
            }
            if (scrollContainer) {
              const y = el.getBoundingClientRect().top + scrollContainer.scrollTop - scrollContainer.getBoundingClientRect().top - 70;
              scrollContainer.scrollTo({ top: y, behavior: "smooth" });
            } else {
              const y = el.getBoundingClientRect().top + window.scrollY - 70;
              window.scrollTo({ top: y, behavior: "smooth" });
            }
          }
        } catch (e) {
          console.error("Invalid scroll target:", href);
        }
      }, 50);
    } else {
      navigate(href);
    }
  };

  const navBtn = (active: boolean) =>
    `nav-btn-wrapper px-3 py-1.5 rounded-lg text-[14px] font-semibold transition-colors relative whitespace-nowrap ${active ? "nav-btn-active text-secondary" : "text-foreground hover:text-secondary"
    }`;

  const iconBtn = "p-2.5 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors";
  const moveNavItem = (href: string, direction: 'left' | 'right') => {
    const base = [...customNavItems];
    const index = base.findIndex(i => i.href === href);
    if (index === -1) return;

    if (direction === 'left' && index > 0) {
      [base[index - 1], base[index]] = [base[index], base[index - 1]];
    } else if (direction === 'right' && index < base.length - 1) {
      [base[index], base[index + 1]] = [base[index + 1], base[index]];
    } else {
      return;
    }
    editor?.onUpdate("settings", "nav_items", base);
  };

  const deleteNavItem = (href: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      const base = customNavItems.filter(i => i.href !== href);
      editor?.onUpdate("settings", "nav_items", base);
      const nextDeleted = [...deletedNavItems, href];
      editor?.onUpdate("settings", "nav_deleted_items", nextDeleted.join(","));
    }
  };

  const addNavItem = () => {
    const id = Date.now();
    const next = [...customNavItems, { label: "New Menu", href: `#new-section-${id}` }];
    editor?.onUpdate("settings", "nav_items", next);
  };

  const renderMoveControls = (href: string, isAbsolute: boolean = true) => {
    if (!editor?.isEditMode) return null;
    const index = customNavItems.findIndex(i => i.href === href);
    const canMoveLeft = index > 0;
    const canMoveRight = index !== -1 && index < customNavItems.length - 1;

    const baseClass = "flex items-center gap-0.5 bg-secondary text-secondary-foreground rounded-[4px] shadow-2xl p-[2px] z-[150] pointer-events-auto";
    const className = isAbsolute
      ? `absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${baseClass}`
      : "flex items-center gap-0.5";

    return (
      <div className={className}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            moveNavItem(href, 'left');
          }}
          disabled={!canMoveLeft}
          className={`p-1 rounded-[2px] transition-colors text-white cursor-pointer ${!canMoveLeft ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'}`}
          title="Move Left"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            moveNavItem(href, 'right');
          }}
          disabled={!canMoveRight}
          className={`p-1 rounded-[2px] transition-colors text-white cursor-pointer ${!canMoveRight ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'}`}
          title="Move Right"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    );
  };

  const renderActionControls = (href: string) => {
    if (!editor?.isEditMode) return null;
    const isHidden = hiddenNavItems.includes(href);

    return (
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleNavVisibility(href);
          }}
          className="p-1 hover:bg-white/20 rounded-[2px] transition-colors text-white cursor-pointer"
          title={isHidden ? "Show Menu Item" : "Hide Menu Item"}
        >
          {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNavItem(href);
          }}
          className="p-1 hover:bg-red-500/80 rounded-[2px] transition-colors text-white cursor-pointer"
          title="Delete Menu Item"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  const renderNavControls = (href: string) => {
    return (
      <>
        {renderMoveControls(href, false)}
        {renderActionControls(href)}
      </>
    );
  };
  const activeNavToolbar = (href: string) => editor?.activeElementId === `header-nav:${href}`;

  // Resolve logo: prefer DB path, fallback to bundled asset
  const resolvedLogo = getFullLogoUrl(logoPath);

  return (
    <header
      style={{
        fontFamily: "var(--font-header, inherit)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: "all 0.3s ease",
        background: scrolled ? "hsl(var(--background)/0.85)" : "hsl(var(--background))",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled ? "0 4px 20px -5px rgba(0,0,0,0.1)" : "none",
        borderBottom: scrolled ? "1px solid hsl(var(--border)/0.5)" : "1px solid transparent",
      }}
    >
      <div className={`w-full flex items-center justify-between gap-2 px-3 sm:px-6 transition-all duration-300 ${editor?.isEditMode ? "h-[70px]" : "h-[60px] lg:h-[55px]"}`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative group/item flex items-center min-w-0 shrink">
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
            {/* Fix: Use a div instead of an 'a' tag in edit mode to prevent contentEditable and click event conflicts */}
            {(() => {
              const Wrapper = editor?.isEditMode ? "div" : "a";
              const target = settings.site_url || "#home";
              const props = editor?.isEditMode ? getNavProps(() => scrollTo(target)) : { href: target };
              return (
                <Wrapper {...props} className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink cursor-pointer  p-1 rounded-md transition-colors ">
                  <img
                    src={resolvedLogo}
                    alt={siteName}
                    className="shrink-0"
                    style={{ height: "42px", width: "auto", maxWidth: "200px", objectFit: "contain", objectPosition: "left center" }}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (target.getAttribute('data-error') !== 'true') {
                        target.setAttribute('data-error', 'true');
                        target.src = "https://placehold.co/200x60/transparent/666?text=Upload+Logo";
                      }
                    }}
                  />
                </Wrapper>
              );
            })()}
          </div>
          {editor?.isEditMode && (
            <button
              onClick={addNavItem}
              className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-[4px] text-[10px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
              title="Add a new menu item to the end"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span className="hidden sm:inline">Add Menu</span>
            </button>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center justify-end gap-1.5 flex-1 mx-4">
          {navItems.map((item) => (
            <div
              key={item.href}
              onPointerDown={() => editor?.setActiveElementId(`header-nav:${item.href}`)}
              className={`relative group inline-flex flex-col items-center justify-center ${hiddenNavItems.includes(item.href) ? "opacity-60" : ""}`}
            >
              {renderMoveControls(item.href)}
              <div
                onClick={(e) => {
                  if (editor?.isEditMode) {
                    e.preventDefault();
                  } else {
                    scrollTo(item.resolvedHref);
                  }
                }}
                onDoubleClick={(e) => {
                  if (editor?.isEditMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollTo(item.resolvedHref);
                  }
                }}
                className={navBtn(activeSection === item.resolvedHref) + " cursor-pointer inline-flex items-center justify-center"}
              >
                <EditableText
                  className="nav-text-element text-center"
                  section="settings"
                  field={`nav_label_${item.href.replace('#', '')}`}
                  linkField={`nav_link_${item.href.replace('#', '')}`}
                  value={item.resolvedLabel}
                  toolbarClassName="top-[110%] left-1/2 -translate-x-1/2 whitespace-nowrap"
                  toolbarVisibilityClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                  extraControls={renderActionControls(item.href)}
                  onDoubleClick={(e) => {
                    if (editor?.isEditMode) {
                      e.preventDefault();
                      e.stopPropagation();
                      scrollTo(item.resolvedHref);
                    }
                  }}
                />
                <span
                  className={`absolute bottom-0 left-2 right-2 h-0.5 bg-secondary rounded-full origin-center transition-all duration-200 ${activeSection === item.resolvedHref ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100"}`}
                />
              </div>
            </div>
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

          {/* <div className="flex items-center gap-1 ml-1">
            <a
              href="/admin/login"
              target="_blank" rel="noopener noreferrer"
              title="Admin Panel"
              className="p-2 rounded-lg border transition-all bg-secondary/15 border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              <ShieldCheck size={17} />
            </a>
          </div> */}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 xl:hidden shrink-0">
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
          className="xl:hidden fixed top-14 right-3 sm:right-4 w-[calc(100vw-1.5rem)] max-w-72 sm:max-w-80 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] overflow-hidden"
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

          <nav className="flex flex-col p-2 gap-1 max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <div
                key={item.href}
                onPointerDown={() => editor?.setActiveElementId(`header-nav:${item.href}`)}
                className={`relative group/item block ${hiddenNavItems.includes(item.href) ? "opacity-60" : ""}`}
              >
                <div
                  onClick={(e) => {
                    if (editor?.isEditMode) {
                      e.preventDefault();
                    } else {
                      scrollTo(item.resolvedHref);
                    }
                  }}
                  onDoubleClick={(e) => {
                    if (editor?.isEditMode) {
                      e.preventDefault();
                      e.stopPropagation();
                      scrollTo(item.resolvedHref);
                    }
                  }}
                  className={`nav-btn-wrapper w-full text-left px-3 py-2.5 ${editor?.isEditMode ? "pr-9" : ""} rounded-xl font-semibold text-sm transition-all flex items-center justify-between group cursor-pointer ${activeSection === item.resolvedHref
                    ? "nav-btn-active text-secondary"
                    : "text-foreground/80 hover:text-foreground"
                    }`}
                >
                  <EditableText
                    className="nav-text-element"
                    section="settings"
                    field={`nav_label_${item.href.replace('#', '')}`}
                    linkField={`nav_link_${item.href.replace('#', '')}`}
                    value={item.resolvedLabel}
                    toolbarClassName="-top-3 right-8"
                    toolbarVisibilityClassName={activeNavToolbar(item.href) ? "opacity-100" : "opacity-0"}
                    extraControls={renderNavControls(item.href)}
                    onDoubleClick={(e) => {
                      if (editor?.isEditMode) {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollTo(item.resolvedHref);
                      }
                    }}
                  />
                  {activeSection === item.resolvedHref && <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                </div>
              </div>
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
