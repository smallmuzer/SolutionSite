import { createContext, useContext, useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "bss-user-settings";

export interface UIPrefs {
  font_size: string;
  font_style: string;
  theme: "light" | "dark" | "system";
  accent_color: string;
  global_view: "grid" | "list";
  card_style: "icon" | "image";
}

export const defaultPrefs: UIPrefs = {
  font_size: "medium",
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
    try {
      const s = localStorage.getItem(LOCAL_STORAGE_KEY);
      return s ? (JSON.parse(s) as UIPrefs).global_view ?? "grid" : "grid";
    } catch {
      return "grid";
    }
  });

  const [cardStyle, setCardStyle] = useState<"icon" | "image">(() => {
    try {
      const s = localStorage.getItem(LOCAL_STORAGE_KEY);
      return s ? (JSON.parse(s) as UIPrefs).card_style ?? "icon" : "icon";
    } catch {
      return "icon";
    }
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
