import { createContext, useContext, useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "bss-user-settings";

function readStoredPrefs(): Partial<UIPrefs> {
  try {
    // Cookie takes priority over localStorage
    const m = document.cookie.split(";").find(c => c.trim().startsWith(LOCAL_STORAGE_KEY + "="));
    if (m) return JSON.parse(decodeURIComponent(m.trim().slice(LOCAL_STORAGE_KEY.length + 1)));
    const s = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch { }
  return {};
}

export interface UIPrefs {
  font_size: string;
  font_style: string;
  theme: "light" | "dark" | "system";
  accent_color: string;
  global_view: "grid" | "list";
  card_style: "icon" | "image";
}

export const defaultPrefs: UIPrefs = {
  font_size: "small",
  font_style: "'Inter', sans-serif",
  theme: "light",
  accent_color: "#3b82f6",
  global_view: "grid",
  card_style: "icon",
};

const ViewCtx = createContext<"grid" | "list">("grid");
export const useGlobalView = () => useContext(ViewCtx);

const CardStyleCtx = createContext<"icon" | "image">("icon");
export const useCardStyle = () => useContext(CardStyleCtx);

export function GlobalViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<"grid" | "list">(() => {
    const p = readStoredPrefs();
    return (p.global_view as "grid" | "list") ?? "grid";
  });

  const [cardStyle, setCardStyle] = useState<"icon" | "image">(() => {
    const p = readStoredPrefs();
    return (p.card_style as "icon" | "image") ?? "icon";
  });

  useEffect(() => {
    const hv = (e: Event) => setView((e as CustomEvent<"grid" | "list">).detail);
    const hc = (e: Event) => setCardStyle((e as CustomEvent<"icon" | "image">).detail);

    window.addEventListener("ss:globalView", hv);
    window.addEventListener("ss:cardStyle", hc);

    return () => {
      window.removeEventListener("ss:globalView", hv);
      window.removeEventListener("ss:cardStyle", hc);
    };
  }, []);

  return (
    <ViewCtx.Provider value={view}>
      <CardStyleCtx.Provider value={cardStyle}>{children}</CardStyleCtx.Provider>
    </ViewCtx.Provider>
  );
}
