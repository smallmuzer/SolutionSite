import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import AnimatedSection from "./AnimatedSection";
import type { Tables } from "@/integrations/supabase/types";
import { Play, LayoutGrid } from "lucide-react";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation } from "./admin/LiveEditorContext";

const SEED_CLIENTS = [
  { id: "cl-0", name: "aaa Hotels & Resorts", logo_url: "/assets/clients/aaa-1.png", is_visible: true, sort_order: 0 },
  { id: "cl-1", name: "Alia Investments", logo_url: "/assets/clients/Alia.png", is_visible: true, sort_order: 1 },
  { id: "cl-2", name: "Baglioni Resorts", logo_url: "/assets/clients/Baglioni.jpg", is_visible: true, sort_order: 2 },
  { id: "cl-3", name: "City Investments", logo_url: "/assets/clients/City-Investments.jpg", is_visible: true, sort_order: 3 },
  { id: "cl-4", name: "Cocoon Maldives", logo_url: "/assets/clients/Cocoon.jpg", is_visible: true, sort_order: 4 },
  { id: "cl-5", name: "Co Load", logo_url: "/assets/clients/Co-load-2.png", is_visible: true, sort_order: 5 },
  { id: "cl-6", name: "COLOURS OF OBLU", logo_url: "/assets/clients/Colors-of-OBLU-768x390.png", is_visible: true, sort_order: 6 },
  { id: "cl-7", name: "DAMAS", logo_url: "/assets/clients/DAMAS-768x397.jpg", is_visible: true, sort_order: 7 },
  { id: "cl-8", name: "Election Commission", logo_url: "/assets/clients/ECM.png", is_visible: true, sort_order: 8 },
  { id: "cl-9", name: "ELL Mobiles", logo_url: "/assets/clients/ELL-Mobiles-768x768.png", is_visible: true, sort_order: 9 },
  { id: "cl-10", name: "Ensis Fisheries", logo_url: "/assets/clients/Ensis-2.png", is_visible: true, sort_order: 10 },
  { id: "cl-11", name: "Fuel Supplies Maldives", logo_url: "/assets/clients/FSM-1.png", is_visible: true, sort_order: 11 },
  { id: "cl-12", name: "Fushifaru", logo_url: "/assets/clients/Fushifaru-1.png", is_visible: true, sort_order: 12 },
  { id: "cl-13", name: "Gage Maldives", logo_url: "/assets/clients/gage-logo-1.png", is_visible: true, sort_order: 13 },
  { id: "cl-14", name: "Happy Market", logo_url: "/assets/clients/Happy-Market.png", is_visible: true, sort_order: 14 },
  { id: "cl-15", name: "HDFC Bank", logo_url: "/assets/clients/HDFC.png", is_visible: true, sort_order: 15 },
  { id: "cl-16", name: "Horizon Fisheries", logo_url: "/assets/clients/Horizon-fisheries-1.png", is_visible: true, sort_order: 16 },
  { id: "cl-17", name: "ILAA Maldives", logo_url: "/assets/clients/Ilaa-Maldives-1-768x593.jpg", is_visible: true, sort_order: 17 },
  { id: "cl-18", name: "Island Beverages", logo_url: "/assets/clients/Island-Beverages.png", is_visible: true, sort_order: 18 },
  { id: "cl-19", name: "Island Breeze", logo_url: "/assets/clients/Island-Breeze-Maldives.png", is_visible: true, sort_order: 19 },
  { id: "cl-20", name: "Medianet", logo_url: "/assets/clients/Medianet.png", is_visible: true, sort_order: 20 },
  { id: "cl-21", name: "Medtech Maldives", logo_url: "/assets/clients/Medtech-Maldives.jpg", is_visible: true, sort_order: 21 },
  { id: "cl-22", name: "Mifco", logo_url: "/assets/clients/Mifco-2-768x309.png", is_visible: true, sort_order: 22 },
  { id: "cl-23", name: "Muni Enterprises", logo_url: "/assets/clients/Muni-1.png", is_visible: true, sort_order: 23 },
  { id: "cl-24", name: "OBLU Helengeli", logo_url: "/assets/clients/OBLU-Helengeli.png", is_visible: true, sort_order: 24 },
  { id: "cl-25", name: "Oblu Select", logo_url: "/assets/clients/Oblu-Select.png", is_visible: true, sort_order: 25 },
  { id: "cl-26", name: "OZEN Life Maadhoo", logo_url: "/assets/clients/OZEN-Life-Maadhoo-500x500.png", is_visible: true, sort_order: 26 },
  { id: "cl-27", name: "OZEN Reserve", logo_url: "/assets/clients/OZEN-Reserve-Bolifushi.png", is_visible: true, sort_order: 27 },
  { id: "cl-28", name: "Plaza Enterprises", logo_url: "/assets/clients/Plaza.png", is_visible: true, sort_order: 28 },
  { id: "cl-29", name: "RCSC Bhutan", logo_url: "/assets/clients/RCSC-Bhutan.png", is_visible: true, sort_order: 29 },
  { id: "cl-30", name: "SIMDI Group", logo_url: "/assets/clients/SIMDI-Group.png", is_visible: true, sort_order: 30 },
  { id: "cl-31", name: "TEP Construction", logo_url: "/assets/clients/TEP-Constuction.png", is_visible: true, sort_order: 31 },
  { id: "cl-32", name: "The Hawks", logo_url: "/assets/clients/The-Hawks.png", is_visible: true, sort_order: 32 },
  { id: "cl-33", name: "United Food", logo_url: "/assets/clients/United-Food-Suppliers.png", is_visible: true, sort_order: 33 },
  { id: "cl-34", name: "VARU by Atmosphere", logo_url: "/assets/clients/VARU-by-Atmosphere.jpg", is_visible: true, sort_order: 34 },
  { id: "cl-35", name: "Voyages Maldives", logo_url: "/assets/clients/voyage-Maldives.png", is_visible: true, sort_order: 35 },
  { id: "cl-36", name: "You & Me Maldives", logo_url: "/assets/clients/You-Me-Maldives-768x660.png", is_visible: true, sort_order: 36 },
  { id: "cl-37", name: "Villa Group", logo_url: "/assets/clients/Villagrouplogo-1.png", is_visible: true, sort_order: 37 },
  { id: "cl-38", name: "Fun Island", logo_url: "/assets/clients/Fun-Island.png", is_visible: true, sort_order: 38 },
  { id: "cl-39", name: "Maldives Stock Exchange", logo_url: "/assets/clients/Maldives-Stock-Exchange-300x67.jpg", is_visible: true, sort_order: 39 },
];

type ClientLogo = Tables<"client_logos">;

const ClientLogoImage = ({ client }: { client: ClientLogo }) => {
  const clientName = client?.name || "";
  
  const seedClient = useMemo(() => {
    return SEED_CLIENTS.find(s => 
      s.id === client?.id || 
      s.name === clientName || 
      (s.name && clientName && s.name.includes(clientName)) || 
      (clientName && s.name && clientName.includes(s.name))
    );
  }, [client?.id, clientName]);

  const primarySrc = client?.logo_url || seedClient?.logo_url || "";
  const [imgSrc, setImgSrc] = useState<string>(primarySrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(primarySrc);
    setHasError(false);
  }, [primarySrc]);

  if (hasError || !imgSrc) {
    const initials = clientName
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map(n => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary/10 text-secondary font-extrabold text-[0.65rem] sm:text-[0.75rem] rounded-md tracking-wider select-none">
        {initials || "•"}
      </div>
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt={clientName} 
      className="w-full h-full min-w-0 min-h-0 object-contain" 
      onError={() => {
        if (seedClient?.logo_url && imgSrc !== seedClient.logo_url) {
          setImgSrc(seedClient.logo_url);
        } else {
          setHasError(true);
        }
      }}
    />
  );
};

function computeGlobePositions(count: number, isMobile: boolean = false): { cx: number; cy: number }[] {
  if (count === 0) return [];
  const pos: { cx: number; cy: number }[] = [];
  const R_INNER = 22, R_OUTER = 34;

  if (count <= 7) {
    const r = isMobile ? 30 : (count <= 3 ? R_OUTER : 28);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
      pos.push({ cx: 50 + r * Math.cos(a), cy: 50 + r * Math.sin(a) });
    }
  } else {
    const inner = Math.max(3, Math.round(count * 0.36)), outer = count - inner;
    for (let i = 0; i < inner; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / inner;
      pos.push({ cx: 50 + R_INNER * Math.cos(a), cy: 50 + R_INNER * Math.sin(a) });
    }
    const stagger = Math.PI / outer;
    for (let i = 0; i < outer; i++) {
      const a = -Math.PI / 2 + stagger + (i * 2 * Math.PI) / outer;
      pos.push({ cx: 50 + R_OUTER * Math.cos(a), cy: 50 + R_OUTER * Math.sin(a) });
    }
  }

  if (isMobile && count <= 5) return pos;

  const CARD_W_PCT = (66 / 580) * 100;
  const CARD_H_PCT = (54 / 580) * 100;
  const EXTRA_GAP_PCT = 1.25;
  const MIN_X = 18;
  const MAX_X = 82;
  const MIN_Y = 18;
  const MAX_Y = 82;

  for (let pass = 0; pass < 12; pass++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j].cx - pos[i].cx;
        const dy = pos[j].cy - pos[i].cy;
        const overlapX = CARD_W_PCT + EXTRA_GAP_PCT - Math.abs(dx);
        const overlapY = CARD_H_PCT + EXTRA_GAP_PCT - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        const distance = Math.hypot(dx, dy) || 1;
        const push = (Math.max(overlapX, overlapY) + 0.2) / 2;
        const ux = dx / distance;
        const uy = dy / distance;

        pos[i].cx = Math.min(MAX_X, Math.max(MIN_X, pos[i].cx - ux * push));
        pos[i].cy = Math.min(MAX_Y, Math.max(MIN_Y, pos[i].cy - uy * push));
        pos[j].cx = Math.min(MAX_X, Math.max(MIN_X, pos[j].cx + ux * push));
        pos[j].cy = Math.min(MAX_Y, Math.max(MIN_Y, pos[j].cy + uy * push));
      }
    }
  }

  return pos;
}

const StaticGlobe = ({ clients, getNavProps }: { clients: ClientLogo[]; getNavProps: any }) => {
  const bgRef = useRef<HTMLCanvasElement>(null), fgRef = useRef<HTMLCanvasElement>(null), containerRef = useRef<HTMLDivElement>(null), rafRef = useRef<number>(0), zoomRef = useRef(1), targetZoomRef = useRef(1), zoomRafRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const SIZE = 580;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const slotCount = isMobile ? 5 : 14;

  const positions = useMemo(() => computeGlobePositions(Math.min(clients.length, slotCount), isMobile), [clients.length, slotCount, isMobile]);

  const [slotIndices, setSlotIndices] = useState<number[]>([]);

  useEffect(() => {
    setSlotIndices(Array.from({ length: slotCount }, (_, i) => i % Math.max(clients.length, 1)));
  }, [slotCount, clients.length]);

  const slotMs = isMobile ? 2200 : 3000;

  useEffect(() => {
    if (clients.length === 0 || slotCount === 0 || slotIndices.length === 0) return;

    if (isMobile) {
      const id = setInterval(() => {
        setSlotIndices(prev => {
          const next = [...prev];
          for (let i = 0; i < slotCount; i++) {
            next[i] = (next[i] + slotCount) % clients.length;
          }
          return next;
        });
      }, slotMs);
      return () => clearInterval(id);
    } else {
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const intervals: ReturnType<typeof setInterval>[] = [];
      for (let slotIdx = 0; slotIdx < slotCount; slotIdx++) {
        const delay = Math.round((slotIdx / slotCount) * slotMs);
        const t = setTimeout(() => {
          const id = setInterval(() => {
            setSlotIndices(prev => {
              if (prev.length < slotCount) return prev;
              const next = [...prev];
              next[slotIdx] = (next[slotIdx] + slotCount) % clients.length;
              return next;
            });
          }, slotMs);
          intervals.push(id);
        }, delay);
        timeouts.push(t);
      }
      return () => {
        timeouts.forEach(t => clearTimeout(t));
        intervals.forEach(id => clearInterval(id));
      };
    }
  }, [clients.length, slotCount, isMobile, slotIndices.length, slotMs]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (isMobile) return;
    e.preventDefault();
    targetZoomRef.current = Math.max(0.7, Math.min(1.8, targetZoomRef.current + (e.deltaY > 0 ? -0.15 : 0.15)));
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    targetZoomRef.current = 1;
  }, [isMobile]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isMobile) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => { el.removeEventListener("wheel", handleWheel); el.removeEventListener("mouseleave", handleMouseLeave); };
  }, [handleWheel, handleMouseLeave, isMobile]);

  useEffect(() => {
    if (isMobile) {
      setZoom(1);
      targetZoomRef.current = 1;
      zoomRef.current = 1;
      return;
    }
    let running = true;
    const step = () => {
      if (!running) return;
      const d = targetZoomRef.current - zoomRef.current;
      zoomRef.current += d * 0.2;
      if (Math.abs(d) > 0.001) setZoom(zoomRef.current);
      zoomRafRef.current = requestAnimationFrame(step);
    };
    step();
    return () => { running = false; cancelAnimationFrame(zoomRafRef.current); };
  }, [isMobile]);

  useEffect(() => {
    const bg = bgRef.current, fg = fgRef.current;
    if (!bg || !fg) return;
    const bgCtx = bg.getContext("2d"), fgCtx = fg.getContext("2d");
    if (!bgCtx || !fgCtx) return;
    const cx = SIZE / 2, cy = SIZE / 2, R = SIZE * 0.43;
    let offset = 0;
    const runDraw = () => {
      cancelAnimationFrame(rafRef.current);
      const dark = document.documentElement.classList.contains("dark");
      const lineC = dark ? "rgba(96,165,250,0.65)" : "rgba(59,130,246,0.22)", borderC = dark ? "rgba(96,165,250,0.85)" : "rgba(59,130,246,0.28)", longC = dark ? "rgba(96,165,250,0.60)" : "rgba(59,130,246,0.18)", ringC = dark ? "rgba(147,197,253,0.65)" : "rgba(59,130,246,0.20)";
      bgCtx.clearRect(0, 0, SIZE, SIZE);
      bgCtx.lineWidth = 0.6; bgCtx.strokeStyle = lineC;
      for (let lat = -75; lat <= 75; lat += 25) {
        const y = cy + R * Math.sin((lat * Math.PI) / 180), r = R * Math.cos((lat * Math.PI) / 180);
        bgCtx.beginPath(); bgCtx.ellipse(cx, y, r, r * 0.16, 0, 0, Math.PI * 2); bgCtx.stroke();
      }
      bgCtx.beginPath(); bgCtx.arc(cx, cy, R, 0, Math.PI * 2); bgCtx.strokeStyle = borderC; bgCtx.lineWidth = 1.5; bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.arc(cx, cy, R * 0.30, 0, Math.PI * 2); bgCtx.strokeStyle = ringC; bgCtx.lineWidth = 1; bgCtx.stroke();
      const draw = () => {
        fgCtx.clearRect(0, 0, SIZE, SIZE); fgCtx.lineWidth = 0.8; fgCtx.strokeStyle = longC; fgCtx.save(); fgCtx.beginPath(); fgCtx.arc(cx, cy, R - 0.5, 0, Math.PI * 2); fgCtx.clip();
        for (let i = 0; i < 6; i++) { const rx = R * Math.abs(Math.cos(offset + (i * Math.PI) / 6)); fgCtx.beginPath(); fgCtx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2); fgCtx.stroke(); }
        fgCtx.restore(); offset += 0.01047; rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    };
    runDraw();
    const obs = new MutationObserver(runDraw);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { cancelAnimationFrame(rafRef.current); obs.disconnect(); };
  }, []);

  return (
    <div className="mx-auto" style={{
      width: isMobile ? "100%" : `${SIZE}px`,
      maxWidth: isMobile ? "min(420px, 88vw)" : "100%",
      aspectRatio: "1/1",
      position: "relative",
      overflow: "visible"
    }}>
      <div ref={containerRef} className="relative select-none group" style={{ width: "100%", height: "100%", zIndex: 1, transform: `scale(${zoom}) translateZ(0)`, transformOrigin: "center center", willChange: "transform" }}>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none opacity-20 dark:opacity-40" style={{ width: "86%", height: "86%" }}>
          <div style={{ display: "flex", width: "300%", height: "100%", animation: "globeMapScroll 60s linear infinite" }}>
            {[0, 1, 2].map(k => (
              <img
                key={k}
                src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg"
                alt=""
                style={{ width: "33.333%", height: "100%", objectFit: "cover", flexShrink: 0, filter: "invert(0.5) sepia(1) hue-rotate(180deg) saturate(3)" }}
                onLoad={(e) => (e.currentTarget.parentElement!.parentElement!.style.opacity = isMobile ? "0.3" : "0.2")}
              />
            ))}
          </div>
        </div>

        <canvas ref={bgRef} width={SIZE} height={SIZE} className="absolute inset-0 w-full h-full object-contain" />
        <canvas ref={fgRef} width={SIZE} height={SIZE} className="absolute inset-0 w-full h-full object-contain" />

        <button
          {...getNavProps(() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" }))}
          className="absolute z-20 flex flex-col items-center justify-center transition-transform hover:scale-105"
          style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "60%", borderRadius: "50%", background: "transparent", cursor: "pointer", border: "none", gap: 2 }}
        >
          <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: "0.18em", color: "hsl(var(--secondary))", lineHeight: 1, opacity: 0.85 }}>JOIN</span>
          <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, letterSpacing: "0.06em", color: "hsl(var(--secondary))", textShadow: "0 0 12px hsl(var(--secondary)/0.6)", lineHeight: 1.1 }}>Here</span>
          <span className="blink-hint" style={{ fontSize: isMobile ? 8 : 9, fontWeight: 700, color: "hsl(var(--secondary))", marginTop: 4, letterSpacing: "0.1em", opacity: 0.9 }}>↓ Get in touch</span>
        </button>
        {positions.map((pos, slotIdx) => {
          const client = clients[slotIndices[slotIdx] ?? slotIdx % clients.length];
          if (!client || !pos) return null;
          return (
            <div key={slotIdx} className="absolute z-10 pointer-events-auto hover:z-30 cursor-default" style={{ left: `${pos.cx}%`, top: `${pos.cy}%`, transform: "translate(-50%,-50%)", transition: "opacity 0.6s ease" }}>
              <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-300 dark:border-white/30 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:scale-110 transition-all duration-200 bg-white dark:bg-[hsl(222,47%,13%)]" style={{ width: isMobile ? 54 : 66, height: isMobile ? 44 : 54, padding: "4px 4px" }}>
                <div className={`${isMobile ? "w-8 h-5" : "w-10 h-6"} flex items-center justify-center`}><ClientLogoImage client={client} /></div>
                <span className={`${isMobile ? "text-[0.35rem]" : "text-[0.4rem]"} text-foreground text-center font-bold leading-tight line-clamp-1 w-full px-0.5`}>{client.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const COLS = 2, GAP = 10, CARD_W = 96, CARD_H = 80, VISIBLE_H = 520, SPEED_PX = 0.4;
const GRID_W = COLS * CARD_W + (COLS - 1) * GAP;

const IMG_MAX_H = 44; // px — image area max height; leaves room for name

const ClientCard = ({
  client, getNavProps, onMove, draggedId, onDragStart, onDragOver, onDrop, flexible = false
}: {
  client: ClientLogo;
  getNavProps: any;
  onMove?: (dir: "up" | "down" | "left" | "right") => void;
  draggedId?: string | null;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  flexible?: boolean; // true = fill grid cell, false = fixed 96x80 for slideshow
}) => {
  const editor = useLiveEditor();
  return (
    <div
      className={`flex flex-col items-center rounded-lg border border-white/60 dark:border-white/20 backdrop-blur-sm bg-white/70 dark:bg-card/85 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl hover:z-10 group/item relative ${
        !client.is_visible ? 'opacity-50 grayscale' : ''
      } ${draggedId === client.id ? 'opacity-20 scale-95' : ''}`}
      style={flexible
        ? { width: '100%', minHeight: 100, overflow: 'visible', paddingTop: editor?.isEditMode ? 18 : 6 }
        : { width: CARD_W, height: CARD_H, overflow: 'visible' }
      }
      {...getNavProps(() => {})}
      draggable={!!editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, client.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, client.id) : undefined}
    >
      {/* Action toolbar — top edge centered, shows on hover only (grid mode only) */}
      {flexible && (
        <EditorToolbar
          section="clients"
          id={client.id}
          isVisible={client.is_visible}
          imageField="logo_url"
          className="-top-3 left-1/2 -translate-x-1/2"
          group="item"
        />
      )}

      {/* Logo image — constrained max height so name always shows */}
      <div style={{
        width: '100%',
        height: flexible ? 56 : IMG_MAX_H,
        maxHeight: flexible ? 56 : IMG_MAX_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: flexible ? '4px 8px 2px 8px' : '6px 6px 2px 6px',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <div className="max-h-full max-w-full w-full h-full flex items-center justify-center transition-transform duration-300 group-hover/item:scale-110">
          <ClientLogoImage client={client} />
        </div>
      </div>

      {/* Company name — always at bottom, zero extra margin */}
      <span style={{
        fontSize: flexible ? 10 : 9,
        lineHeight: 1.2,
        textAlign: 'center',
        fontWeight: 700,
        color: 'hsl(var(--foreground))',
        width: '100%',
        padding: flexible ? '2px 6px 6px 6px' : '0 4px 4px 4px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        flexShrink: 0,
        marginTop: 'auto',
      }}>
        <EditableText section="clients" field="name" id={client.id} value={client.name} />
      </span>

      {/* 4-directional move buttons — centered in card (grid mode only) */}
      {editor?.isEditMode && onMove && flexible && (
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" style={{ borderRadius: 'inherit' }}>
          <div className="flex flex-col items-center gap-0.5 pointer-events-auto">
            <button
              onClick={(e) => { e.stopPropagation(); onMove('up'); }}
              className="p-0.5 bg-secondary/90 text-white rounded-full hover:scale-110 transition-transform shadow"
              title="Move Up"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onMove('left'); }}
                className="p-0.5 bg-secondary/90 text-white rounded-full hover:scale-110 transition-transform shadow"
                title="Move Left"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="w-2 h-2 rounded-full bg-secondary/40" />
              <button
                onClick={(e) => { e.stopPropagation(); onMove('right'); }}
                className="p-0.5 bg-secondary/90 text-white rounded-full hover:scale-110 transition-transform shadow"
                title="Move Right"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onMove('down'); }}
              className="p-0.5 bg-secondary/90 text-white rounded-full hover:scale-110 transition-transform shadow"
              title="Move Down"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const GridSlideshow = ({
  clients, getNavProps, startOffset = 0, reverse = false,
  onMove, draggedId, onDragStart, onDragOver, onDrop
}: {
  clients: ClientLogo[];
  getNavProps: any;
  startOffset?: number;
  reverse?: boolean;
  onMove?: (id: string, dir: "up" | "down" | "left" | "right") => void;
  draggedId?: string | null;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
}) => {
  const total = clients.length, stripRef = useRef<HTMLDivElement>(null), rafRef = useRef<number>(0), posRef = useRef<number>(0);
  const ordered = total === 0 ? [] : Array.from({ length: total }, (_, k) => clients[(startOffset + k) % total]), doubled = [...ordered, ...ordered, ...ordered];
  const stripH = Math.ceil(total / COLS) * (CARD_H + GAP);
  useEffect(() => {
    if (total === 0) return; const el = stripRef.current; if (!el) return; if (reverse) posRef.current = stripH;
    const animate = () => { if (reverse) { posRef.current -= SPEED_PX; if (posRef.current <= 0) posRef.current += stripH; } else { posRef.current += SPEED_PX; if (posRef.current >= stripH) posRef.current -= stripH; } el.style.transform = `translateY(-${posRef.current}px)`; rafRef.current = requestAnimationFrame(animate); };
    rafRef.current = requestAnimationFrame(animate); return () => cancelAnimationFrame(rafRef.current);
  }, [total, stripH, reverse]);
  if (total === 0) return null;
  return (
    <div style={{ width: GRID_W, height: VISIBLE_H, overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 48, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)" }} />
      <div ref={stripRef} style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CARD_W}px)`, gap: GAP, width: GRID_W }}>
        {doubled.map((client, k) => (
          <ClientCard
            key={`${client.id}-${k}`}
            client={client}
            getNavProps={getNavProps}
            onMove={onMove ? (dir) => onMove(client.id, dir) : undefined}
            draggedId={draggedId}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
};

const ClientsSection = () => {
  const editor = useLiveEditor();
  const getNavProps = useLiveEditorNavigation();
  const isEdit = editor?.isEditMode;
  const [showAll, setShowAll] = useState(false);

  // Default to grid view in admin edit mode
  useEffect(() => { if (isEdit) setShowAll(true); }, [isEdit]);
  const { data: dbClients } = useDbQuery<ClientLogo[]>("client_logos", isEdit ? {} : { is_visible: true }, { order: "sort_order" });
  const content = useSiteContent("clients");

  const rawClients = (dbClients && dbClients.length > 0) ? dbClients : (SEED_CLIENTS as ClientLogo[]);

  // Local sorted state for move/drag
  const [clientsState, setClientsState] = useState<ClientLogo[]>([]);
  useEffect(() => { setClientsState(rawClients); }, [dbClients]);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEdit) return;
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!isEdit || !draggedId || draggedId === targetId) return;
    const sourceIdx = clientsState.findIndex(c => c.id === draggedId);
    const targetIdx = clientsState.findIndex(c => c.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    const newItems = [...clientsState];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);
    setClientsState(newItems);
    newItems.forEach((item, idx) => { editor?.onUpdate("client_logos", "sort_order", idx, item.id); });
    setDraggedId(null);
  };

  const handleMove = (id: string, direction: "up" | "down" | "left" | "right") => {
    if (!isEdit) return;
    const idx = clientsState.findIndex(c => c.id === id);
    if (idx === -1) return;
    
    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = -6;
    else if (direction === "down") step = 6;

    const targetIdx = Math.max(0, Math.min(clientsState.length - 1, idx + step));
    if (targetIdx === idx) return;
    
    const newItems = [...clientsState];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);
    setClientsState(newItems);
    newItems.forEach((item, i) => { editor?.onUpdate("client_logos", "sort_order", i, item.id); });
  };

  const clients = isEdit ? clientsState : rawClients;
  const effectiveShowAll = showAll;
  const header = {
    badge: content.badge || "Portfolio (Our Clients)",
    title: content.title || "Trusted by",
    highlight: content.highlight || "Industry Leaders",
    description: content.description || "We're proud to have served over 300+ successful projects..."
  };

  return (
    <section id="portfolio" className="section-padding relative group" style={{ overflowX: "clip", overflowY: "visible" }}>
      <div className="container-wide">
        <AnimatedSection className="text-center mb-8 relative group">
          <SectionHeaderToolbar section="clients" targetSection="client_logos" className="top-0 left-4" />
          <div className="absolute right-0 top-0 sm:top-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex p-2 sm:px-4 sm:py-2 rounded-full bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-all duration-300 animate-glow shadow-lg shadow-secondary/20 z-20 items-center gap-2"
              title={showAll || isEdit ? "Switch to Grid View" : "Show All Clients (Grid)"}
            >
              {showAll ? <Play size={16} className="fill-secondary" /> : <LayoutGrid size={16} />}
              <span className="text-[0.75rem] font-bold uppercase tracking-wider hidden sm:inline">
                {showAll ? "Play Animation" : "View All"}
              </span>
            </button>
          </div>
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest">
            <EditableText section="clients" field="badge" value={header.badge || "Portfolio (Our Clients)"} colorField="badge_color" />
          </span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-1 mb-2 flex items-center justify-center flex-wrap gap-4">
            <span>
              <EditableText section="clients" field="title" value={header.title || "Trusted by"} colorField="title_color" />{" "}
              <span className="gradient-text">
                <EditableText section="clients" field="highlight" value={header.highlight || "Industry Leaders"} colorField="highlight_color" />
              </span>
            </span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]">
            <EditableText section="clients" field="description" value={header.description || ""} colorField="description_color" />
          </p>
        </AnimatedSection>
        <AnimatedSection>
          {effectiveShowAll ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ paddingTop: isEdit ? 16 : 0 }}>
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  getNavProps={getNavProps}
                  flexible={true}
                  onMove={isEdit ? (dir) => handleMove(client.id, dir) : undefined}
                  draggedId={draggedId}
                  onDragStart={isEdit ? handleDragStart : undefined}
                  onDragOver={isEdit ? handleDragOver : undefined}
                  onDrop={isEdit ? handleDrop : undefined}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center justify-center" style={{ gap: 48, overflow: "visible" }}>
                <div style={{ position: "relative", zIndex: 0, flexShrink: 0 }}>
                  <GridSlideshow clients={clients} getNavProps={getNavProps} startOffset={0} reverse={false} onMove={isEdit ? handleMove : undefined} draggedId={draggedId} onDragStart={isEdit ? handleDragStart : undefined} onDragOver={isEdit ? handleDragOver : undefined} onDrop={isEdit ? handleDrop : undefined} />
                </div>
                <div style={{ position: "relative", zIndex: 1, flexShrink: 0, overflow: "visible" }}>
                  <StaticGlobe clients={clients} getNavProps={getNavProps} />
                </div>
                <div style={{ position: "relative", zIndex: 0, flexShrink: 0 }}>
                  <GridSlideshow clients={clients} getNavProps={getNavProps} startOffset={Math.ceil(clients.length / 2)} reverse={true} onMove={isEdit ? handleMove : undefined} draggedId={draggedId} onDragStart={isEdit ? handleDragStart : undefined} onDragOver={isEdit ? handleDragOver : undefined} onDrop={isEdit ? handleDrop : undefined} />
                </div>
              </div>
              <div className="flex sm:hidden flex-col items-center gap-10">
                <StaticGlobe clients={clients} getNavProps={getNavProps} />
                <GridSlideshow clients={clients} getNavProps={getNavProps} startOffset={0} onMove={isEdit ? handleMove : undefined} draggedId={draggedId} onDragStart={isEdit ? handleDragStart : undefined} onDragOver={isEdit ? handleDragOver : undefined} onDrop={isEdit ? handleDrop : undefined} />
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-8 text-center bg-muted/20 py-2 px-4 rounded-full w-fit mx-auto">{clients.length} clients across Maldives, Bhutan &amp; beyond</p>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default ClientsSection;
