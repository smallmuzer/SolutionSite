import { useState, useEffect, useRef, useCallback } from "react";
import { X, Sun, Moon, Save, GripHorizontal, LayoutGrid, List, Image, Layers, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { applySettings, useSiteSettings } from "@/hooks/useSiteSettings";
import { UIPrefs, defaultPrefs } from "./ui-customizer-context";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const COOKIE_KEY = "bss-user-settings";

function getCookie(): UIPrefs | null {
  try {
    const m = document.cookie.split(";").find(c => c.trim().startsWith(COOKIE_KEY + "="));
    if (!m) return null;
    return JSON.parse(decodeURIComponent(m.trim().slice(COOKIE_KEY.length + 1)));
  } catch { return null; }
}

function setCookie(prefs: UIPrefs) {
  const val = encodeURIComponent(JSON.stringify(prefs));
  const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${val}; expires=${exp}; path=/; SameSite=Lax`;
  // keep localStorage in sync for applySettings
  localStorage.setItem(COOKIE_KEY, JSON.stringify(prefs));
}

function deleteCookie() {
  document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  localStorage.removeItem(COOKIE_KEY);
}

const fonts = [
  "Arial", "Courier New", "DM Sans", "Georgia", "Inter", "Lato",
  "Montserrat", "Nunito", "Open Sans", "Playfair Display", "Poppins",
  "Raleway", "Roboto", "Source Code Pro", "Space Grotesk",
  "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
];

const accentColors = ["#3b82f6", "#2db8a0", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981"];

const UICustomizer = () => {
  const settings = useSiteSettings();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);



  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<UIPrefs>(() => {
    const cookie = getCookie();
    // Cookie takes priority; fall back to DB settings merged with defaults
    return cookie ? { ...defaultPrefs, ...cookie } : { ...defaultPrefs };
  });
  const [draft, setDraft] = useState<UIPrefs>({ ...prefs });

  // When DB settings load, sync prefs: cookie overrides DB, DB overrides hardcoded defaults
  useEffect(() => {
    if (Object.keys(settings).length === 0) return;
    const cookie = getCookie();
    const dbPrefs: UIPrefs = {
      font_size: settings.font_size || defaultPrefs.font_size,
      font_style: settings.font_style || settings.default_font || defaultPrefs.font_style,
      theme: (settings.theme as any) || defaultPrefs.theme,
      accent_color: settings.accent_color || defaultPrefs.accent_color,
      global_view: (settings.global_view as any) || defaultPrefs.global_view,
      card_style: (settings.card_style as any) || defaultPrefs.card_style,
    };
    // Cookie wins over DB
    const merged = cookie ? { ...dbPrefs, ...cookie } : dbPrefs;
    setPrefs(merged);
    setDraft(merged);
    // Apply merged so website reflects cookie > DB immediately
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setPos({ x: 0, y: 0 });
      setDraft({ ...prefs });
    };
    window.addEventListener("ss:openCustomizer", handleOpen);
    return () => window.removeEventListener("ss:openCustomizer", handleOpen);
  }, [prefs]);

  useEffect(() => {
    const handleTheme = (e: Event) => {
      const theme = (e as CustomEvent<"light" | "dark">).detail;
      setPrefs(p => ({ ...p, theme }));
      setDraft(p => ({ ...p, theme }));
    };
    window.addEventListener("ss:themeChanged", handleTheme);
    return () => window.removeEventListener("ss:themeChanged", handleTheme);
  }, []);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onPD = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [pos]);

  const onPM = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({ x: origin.current.px + e.clientX - origin.current.mx, y: origin.current.py + e.clientY - origin.current.my });
  }, []);

  const onPU = useCallback(() => { dragging.current = false; }, []);

  const update = (p: Partial<UIPrefs>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    applySettings(next, true);
  };

  const save = () => {
    setPrefs(draft);
    setCookie(draft);
    toast.success("Settings saved!");
    setOpen(false);
  };

  const reset = async () => {
    setResetting(true);
    try {
      // Fetch fresh admin settings directly from DB
      const resp = await fetch("/api/db/site_content?section_key=settings&_single=1");
      const json = await resp.json();
      const dbContent = json?.data?.content || {};

      // Build admin defaults from fresh DB values
      const adminDefaults: UIPrefs = {
        font_size: dbContent.font_size || defaultPrefs.font_size,
        font_style: dbContent.font_style || dbContent.default_font || defaultPrefs.font_style,
        theme: dbContent.theme || defaultPrefs.theme,
        accent_color: dbContent.accent_color || defaultPrefs.accent_color,
        global_view: dbContent.global_view || defaultPrefs.global_view,
        card_style: dbContent.card_style || defaultPrefs.card_style,
      };

      // Delete user cookie so DB settings take full effect
      deleteCookie();

      // Update state and apply
      setDraft(adminDefaults);
      setPrefs(adminDefaults);

      // Invalidate React Query cache so useSiteSettings re-fetches
      queryClient.invalidateQueries({ queryKey: queryKeys.siteContent.all });

      // Apply with live=true so it uses adminDefaults directly (no cookie merge)
      applySettings(adminDefaults, true);

      toast.success("Reset to admin settings!");
    } catch {
      toast.error("Failed to fetch admin settings.");
    } finally {
      setResetting(false);
    }
  };

  const cancel = () => {
    setDraft({ ...prefs });
    applySettings(prefs);
    setOpen(false);
  };

  const isDark = draft.theme === "dark";
  const bg = isDark ? "#1a2236" : "#ffffff";
  const border = isDark ? "#2d3a52" : "#e2e8f0";
  const text = isDark ? "#e2e8f0" : "#1a202c";
  const muted = isDark ? "#8896b0" : "#64748b";
  const mutedBg = isDark ? "#232d42" : "#f8fafc";
  const accent = draft.accent_color;

  const S: Record<string, React.CSSProperties> = {
    panel: {
      position: "fixed",
      top: "50%",
      right: 12,
      transform: `translateY(calc(-50% + ${pos.y}px)) translateX(${-pos.x}px)`,
      zIndex: 99999,
      width: 248,
      background: bg,
      border: `1.5px solid ${border}`,
      borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.10)",
      overflow: "hidden",
      fontFamily: "system-ui,-apple-system,sans-serif",
    },
    handle: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "7px 10px", background: mutedBg,
      borderBottom: `1px solid ${border}`,
      cursor: "grab", userSelect: "none" as const,
    },
    body: {
      padding: "10px 10px", display: "flex", flexDirection: "column" as const,
      gap: 10, maxHeight: "60vh", overflowY: "auto" as const,
    },
    label: {
      fontSize: 9, fontWeight: 600, color: muted,
      textTransform: "uppercase" as const, letterSpacing: "0.07em",
      marginBottom: 4, display: "block",
    },
    row: { display: "flex", gap: 5 },
    footer: {
      display: "flex", gap: 5, padding: "8px 10px",
      borderTop: `1px solid ${border}`, background: mutedBg,
    },
  };

  const optBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: 4, padding: "5px 6px", borderRadius: 7,
    fontSize: 10, fontWeight: 600,
    border: `1.5px solid ${active ? accent : border}`,
    background: active ? accent : bg,
    color: active ? "#fff" : muted, cursor: "pointer",
  });

  const fontBtn = (active: boolean): React.CSSProperties => ({
    padding: "4px 6px", borderRadius: 5, fontSize: 9,
    border: `1.5px solid ${active ? accent : border}`,
    background: active ? accent : bg,
    color: active ? "#fff" : muted,
    cursor: "pointer", textAlign: "center",
  });

  if (!open) return null;

  return (
    <div style={S.panel}>
      <div style={S.handle} onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GripHorizontal size={11} color={muted} />
          <span style={{ fontSize: 11, fontWeight: 700, color: text }}>UI Settings</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); cancel(); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: muted }}
        >
          <X size={13} color={muted} />
        </button>
      </div>

      <div style={S.body}>
        {/* Theme */}
        <div>
          <span style={S.label}>Theme</span>
          <div style={S.row}>
            <button onClick={() => update({ theme: "light" })} style={optBtn(draft.theme === "light")}>
              <Sun size={11} /> Light
            </button>
            <button onClick={() => update({ theme: "dark" })} style={optBtn(draft.theme === "dark")}>
              <Moon size={11} /> Dark
            </button>
          </div>
        </div>

        {/* View */}
        <div>
          <span style={S.label}>View</span>
          <div style={S.row}>
            <button onClick={() => update({ global_view: "grid" })} style={optBtn(draft.global_view === "grid")}>
              <LayoutGrid size={11} /> Grid
            </button>
            <button onClick={() => update({ global_view: "list" })} style={optBtn(draft.global_view === "list")}>
              <List size={11} /> List
            </button>
          </div>
        </div>

        {/* Card Style */}
        <div>
          <span style={S.label}>Card Style</span>
          <div style={S.row}>
            <button onClick={() => update({ card_style: "icon" })} style={optBtn(draft.card_style === "icon")}>
              <Layers size={11} /> Icon
            </button>
            <button onClick={() => update({ card_style: "image" })} style={optBtn(draft.card_style === "image")}>
              <Image size={11} /> Image
            </button>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <span style={S.label}>Font Size</span>
          <div style={S.row}>
            {["x-small", "small", "medium", "large", "x-large"].map(sz => (
              <button key={sz} onClick={() => update({ font_size: sz })} style={fontBtn(draft.font_size === sz)}>
                {sz === "x-small" ? "XS" : sz === "small" ? "S" : sz === "medium" ? "M" : sz === "large" ? "L" : "XL"}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <span style={S.label}>Font</span>
          <select
            value={draft.font_style}
            onChange={e => update({ font_style: e.target.value })}
            style={{
              width: "100%", padding: "5px 8px", borderRadius: 7,
              border: `1.5px solid ${border}`, background: bg, color: text,
              fontSize: 11, outline: "none", cursor: "pointer",
            }}
          >
            {fonts.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Accent Color */}
        <div>
          <span style={S.label}>Accent</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {accentColors.map(c => (
              <button key={c} onClick={() => update({ accent_color: c })}
                style={{
                  width: 22, height: 22, borderRadius: "50%", background: c,
                  border: `2.5px solid ${draft.accent_color === c ? text : "transparent"}`,
                  cursor: "pointer", outline: "none",
                  transform: draft.accent_color === c ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
            <input type="color" value={draft.accent_color}
              onChange={e => update({ accent_color: e.target.value })}
              style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${border}`, cursor: "pointer", padding: 0 }}
            />
          </div>
        </div>
      </div>

      <div style={S.footer}>

        <button onClick={reset} disabled={resetting}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
            padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 500,
            background: "transparent", border: `1.5px solid ${border}`, color: muted, cursor: resetting ? "wait" : "pointer",
            opacity: resetting ? 0.6 : 1 }}>
          <RotateCcw size={10} style={{ animation: resetting ? "spin 1s linear infinite" : "none" }} /> {resetting ? "..." : "Reset"}
        </button>
        <button onClick={save}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: accent, border: "none", color: "#fff", cursor: "pointer" }}>
          <Save size={10} color="#fff" /> Save
        </button>
      </div>
    </div>
  );
};

export default UICustomizer;
