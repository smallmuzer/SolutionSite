import { useState, useEffect, useRef } from "react";
import AnimatedSection from "./AnimatedSection";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Users, Building2, Map, X } from "lucide-react";
import { dbSelect } from "@/lib/api";
import { EditableText, EditorToolbar, SectionHeaderToolbar, useLiveEditor, useLiveEditorNavigation, hasEmbeddedColor } from "./admin/LiveEditorContext";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createCustomIcon = (isActive: boolean) =>
  L.divIcon({
    className: "custom-map-marker",
    html: `<div style="
      width:${isActive ? 20 : 14}px; height:${isActive ? 20 : 14}px;
      background:hsl(217,91%,60%); border:3px solid white; border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.3),0 0 20px rgba(59,130,246,0.4);
    "></div>`,
    iconSize: [isActive ? 20 : 14, isActive ? 20 : 14],
    iconAnchor: [isActive ? 10 : 7, isActive ? 10 : 7],
  });

interface LocationData {
  name: string; lat: number; lng: number;
  clients: string; description: string; flag: string; landmark: string;
}

// Default locations — always shown
const DEFAULT_LOCATIONS: LocationData[] = [
  { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, clients: "HQ — 40+ clients", description: "Our headquarters serving government and private sector clients across the Maldives.", flag: "🇲🇻", landmark: "🏝️ Overwater Villas" },
  { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, clients: "RCSC Bhutan", description: "Supporting the Royal Civil Service Commission with digital transformation.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
  { name: "Tamilnadu, India", lat: 9.9195, lng: 78.1193, clients: "Regional Support", description: "Our hub for technology development and regional support in Southern India.", flag: "🇮🇳", landmark: "🏛️ Madurai Meenatchi Amman Temple" },
];

const CLIENT_LOCATION_MAP: Record<string, Omit<LocationData, "clients">> = {
  "RCSC Bhutan": { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, description: "RCSC Bhutan digital transformation project.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
  "Flyme": { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, description: "Flyme airline digital solutions.", flag: "🇲🇻", landmark: "✈️ Velana Airport" },
  "Medianet": { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, description: "Medianet telecom solutions.", flag: "🇲🇻", landmark: "📡 Telecom Hub" },
};

function InvalidateSize() {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 300); return () => clearTimeout(t); }, [map]);
  return null;
}

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 8, { duration: 1.5 }); }, [lat, lng, map]);
  return null;
}

const WorldMap = () => {
  const editor = useLiveEditor();
  const getNavProps = useLiveEditorNavigation();
  const [activeLocation, setActiveLocation] = useState<LocationData | null>(null);
  const { data: dbPresence } = useDbQuery<any[]>("global_presence", {}, { order: "sort_order", asc: true });
  const { data: clientsRes } = useDbQuery<any[]>("client_logos", { is_visible: true });
  const rawContent = useSiteContent("global_presence_header");
  const headerContent = { badge: "Global Presence", title: "Our", highlight: "Reach", description: "Serving clients across Maldives, Bhutan, and beyond.", ...rawContent };
  const [locations, setLocations] = useState<LocationData[]>(DEFAULT_LOCATIONS);
  const [showMap, setShowMap] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const detailTimer = useRef<ReturnType<typeof setTimeout>>();

  const uniqueLocations = locations.filter((loc, idx, arr) => arr.findIndex(l => ((l as any).id || l.name) === ((loc as any).id || loc.name)) === idx);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isMobile || editor?.isEditMode || uniqueLocations.length === 0) {
      if (trackRef.current) trackRef.current.style.transform = 'none';
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const el = trackRef.current;
    if (!el) return;

    const startAnimate = () => {
      const children = el.children;
      if (children.length === 0) return;
      const firstChild = children[0] as HTMLElement;
      const itemW = firstChild.offsetWidth + 16; // 16px gap for gap-4
      const totalW = uniqueLocations.length * itemW;

      cancelAnimationFrame(rafRef.current);
      const animate = () => {
        if (!pausedRef.current && totalW > 0) {
          posRef.current += 0.5; // sliding speed
          if (posRef.current >= totalW) posRef.current -= totalW;
          el.style.transform = `translateX(-${posRef.current}px)`;
        }
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    };

    const timer = setTimeout(startAnimate, 100);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [uniqueLocations, isMobile, editor?.isEditMode]);

  const handleMove = (id: string, direction: "up" | "down" | "left" | "right") => {
    const idx = locations.findIndex(l => ((l as any).id || l.name) === id);
    if (idx === -1) return;

    let step = 0;
    if (direction === "left" || direction === "up") step = -1;
    else if (direction === "right" || direction === "down") step = 1;

    const targetIdx = Math.max(0, Math.min(locations.length - 1, idx + step));
    if (targetIdx === idx) return;

    const newLocs = [...locations];
    const [moved] = newLocs.splice(idx, 1);
    newLocs.splice(targetIdx, 0, moved);

    setLocations(newLocs);
    newLocs.forEach((loc, index) => {
      if ((loc as any).id) {
        editor?.onUpdate("global_presence", "sort_order", index, (loc as any).id);
      }
    });
  };

  useEffect(() => {
    let locs: LocationData[] = [...DEFAULT_LOCATIONS];
    if (dbPresence && dbPresence.length > 0) {
      locs = [...dbPresence];
    }
    if (clientsRes && clientsRes.length > 0) {
      for (const cl of clientsRes) {
        const mapped = CLIENT_LOCATION_MAP[cl.name];
        if (mapped && !locs.some(l => l.name === mapped.name)) {
          locs.push({ ...mapped, clients: cl.name } as any);
        }
      }
    }
    setLocations(locs);
  }, [dbPresence, clientsRes]);

  const handleLocationClick = (loc: LocationData) => {
    if (activeLocation?.name === loc.name && showMap) {
      setShowMap(false);
      setTimeout(() => { setMapMounted(false); setActiveLocation(null); }, 400);
      return;
    }
    setActiveLocation(loc);
    clearTimeout(detailTimer.current);
    setDetailVisible(false);
    detailTimer.current = setTimeout(() => setDetailVisible(true), 20);
    if (!showMap) {
      setMapMounted(true);
      setTimeout(() => setShowMap(true), 10);
    }
  };

  const clearDetail = () => {
    setDetailVisible(false);
    setTimeout(() => setActiveLocation(null), 250);
  };

  if (!editor?.isEditMode && rawContent?.is_visible === false) return null;

  return (
    <section className="section-padding overflow-hidden relative group" id="global-reach" onDoubleClick={(e) => { if (editor?.isEditMode) { e.stopPropagation(); setMapMounted(true); setShowMap(true); } }}>
      <EditorToolbar section="global_reach" />
      <div className="container-wide">
        <AnimatedSection className="text-center mb-0">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest" style={{ color: hasEmbeddedColor(headerContent.badge) ? undefined : ((headerContent as any).badge_color || undefined) }}>
            <EditableText section="global_reach" field="badge" value={headerContent.badge || "Global Presence"} colorField="badge_color" />
          </span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-2 relative" style={{ color: hasEmbeddedColor(headerContent.title) ? undefined : ((headerContent as any).title_color || undefined) }}>
            <EditableText section="global_reach" field="title" value={headerContent.title || "Our"} colorField="title_color" />{" "}
            <span className="gradient-text" style={{ color: hasEmbeddedColor(headerContent.highlight) ? undefined : ((headerContent as any).highlight_color || undefined), background: (headerContent as any).highlight_color && !hasEmbeddedColor(headerContent.highlight) ? "none" : undefined, WebkitTextFillColor: (headerContent as any).highlight_color && !hasEmbeddedColor(headerContent.highlight) ? "initial" : undefined }}>
              <EditableText section="global_reach" field="highlight" value={headerContent.highlight || "Reach"} colorField="highlight_color" />
            </span>
            <SectionHeaderToolbar section="global_presence" isVisible={rawContent.is_visible !== false} className="absolute right-0 top-1/2 -translate-y-1/2 scale-90" />
          </h2>
          <div className="text-muted-foreground max-w-2xl mx-auto text-[0.9375rem]" style={{ color: hasEmbeddedColor(headerContent.description) ? undefined : ((headerContent as any).description_color || undefined) }}>
            <EditableText section="global_reach" field="description" value={headerContent.description || ""} colorField="description_color" />
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div 
              className={`relative ${isMobile && !editor?.isEditMode ? "overflow-hidden" : "overflow-x-auto custom-scrollbar"} pb-6 pt-12 w-full ${uniqueLocations.length <= 4 ? "md:justify-center" : "md:justify-start"}`}
              onMouseEnter={() => { pausedRef.current = true; }}
              onMouseLeave={() => { pausedRef.current = false; }}
              onTouchStart={() => { pausedRef.current = true; }}
              onTouchEnd={() => { pausedRef.current = false; }}
              style={isMobile && !editor?.isEditMode ? {
                  maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
              } : undefined}
            >
              <div 
                ref={trackRef}
                className={`flex gap-4 sm:gap-6 ${isMobile && !editor?.isEditMode ? "w-max" : "w-full snap-x snap-mandatory scroll-smooth"}`}
                style={{ willChange: isMobile && !editor?.isEditMode ? "transform" : "auto" }}
              >
              {(isMobile && !editor?.isEditMode ? [...uniqueLocations, ...uniqueLocations, ...uniqueLocations] : uniqueLocations).map((loc, index) => {
                const isActive = activeLocation?.name === loc.name;
                const currentFlag = editor?.pendingChanges?.[`global_presence:${(loc as any).id || loc.name}:flag`] ?? loc.flag;
                return (
                  <div
                    key={`${(loc as any).id || loc.name}-${index}`}
                    onPointerDown={() => editor?.setActiveElementId(`toolbar:global_presence:${loc.name}`)}
                    {...getNavProps(() => handleLocationClick(loc))}
                    className={`group group/item p-4 rounded-xl text-left cursor-pointer border relative transition-all duration-300 hover:shadow-xl hover:z-20 shrink-0 snap-start w-[280px] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] flex flex-col ${editor?.isEditMode ? "overflow-visible" : "overflow-hidden"}`}
                        style={{
                          border: isActive ? "1.5px solid hsl(var(--secondary)/0.7)" : "1px solid hsl(var(--border)/0.5)",
                          background: isActive
                            ? "linear-gradient(135deg, hsl(var(--secondary)/0.18), hsl(var(--secondary)/0.06))"
                            : "linear-gradient(135deg, hsl(var(--card)/0.90), hsl(var(--card)/0.60))",
                          backdropFilter: "blur(20px)",
                          transform: isActive ? "scale(1.02)" : "scale(1)",
                          boxShadow: isActive ? "0 6px 18px hsl(var(--secondary)/0.12)" : "0 3px 10px rgba(0,0,0,0.02)",
                          minHeight: 100,
                        }}
                      >
                    <div className="flex items-start justify-between mb-3"><EditorToolbar section="global_presence" id={(loc as any).id || loc.name} imageField="flag" canClone canDelete canMove moveDirections={["left", "right"]} className="absolute -top-9 right-2 scale-90" onMove={(dir) => handleMove((loc as any).id || loc.name, dir)} />
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl drop-shadow-sm flex items-center justify-center min-w-[32px] min-h-[24px]">
                          {currentFlag && (currentFlag.startsWith("/") || currentFlag.startsWith("http") || currentFlag.includes(".")) ? (
                            <img
                              src={currentFlag}
                              alt="flag"
                              className="w-8 h-5 object-cover rounded shadow-sm inline-block cursor-pointer hover:opacity-85 transition-opacity"
                              onDoubleClick={(e) => {
                                if (editor?.isEditMode) {
                                  e.stopPropagation();
                                  editor.onPickImage("global_presence", "flag", (loc as any).id || loc.name);
                                }
                              }}
                            />
                          ) : (
                            <EditableText section="global_presence" field="flag" id={(loc as any).id || loc.name} value={loc.flag} />
                          )}
                        </span>
                        <h3 className="font-heading font-bold text-foreground text-[0.9375rem] flex items-center gap-2"><MapPin size={14} className="text-secondary" /><EditableText section="global_presence" field="name" id={(loc as any).id || loc.name} value={loc.name.split(",")[0]} /></h3>
                      </div>
                      <button
                        className={`shrink-0 p-2 rounded-full transition-all duration-300 shadow-sm animate-glow ${isActive ? "bg-secondary text-white scale-110" : "bg-secondary/70 text-white hover:bg-secondary hover:scale-110"}`}
                        title="View on map"
                        {...getNavProps(() => handleLocationClick(loc))}
                      >
                        <MapPin size={16} />
                      </button>
                    </div>
                    <div className="text-muted-foreground text-[0.8125rem] leading-relaxed line-clamp-2 mb-2 flex-1">
                      <EditableText section="global_reach_locations" field="clients" id={(loc as any).id || loc.name} value={loc.clients} />
                    </div>
                    <div className="text-[0.6875rem] text-secondary/90 font-semibold flex items-center gap-1.5 mt-auto pt-2 border-t border-border/40">
                      <Building2 size={12} /> <EditableText section="global_reach_locations" field="landmark" id={(loc as any).id || loc.name} value={loc.landmark} />
                    </div>

                    {/* Admin-only: lat/lng coordinate editor */}
                    {editor?.isEditMode && (
                      <div className="mt-3 pt-2 border-t border-dashed border-secondary/20 text-[0.65rem] font-mono text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-secondary/70 font-bold shrink-0">Lat:</span>
                          <EditableText section="global_presence" field="lat" id={(loc as any).id || loc.name} value={String(loc.lat)} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-secondary/70 font-bold shrink-0">Lng:</span>
                          <EditableText section="global_presence" field="lng" id={(loc as any).id || loc.name} value={String(loc.lng)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* Map — with increased gap from cards */}
            {mapMounted && (
              <div
                className="rounded-xl overflow-hidden border border-border shadow-lg relative mt-8"
                style={{
                  maxHeight: showMap ? 260 : 0,
                  opacity: showMap ? 1 : 0,
                  transition: "max-height 0.4s ease, opacity 0.35s ease",
                }}
              >
                {showMap && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTimeout(detailTimer.current);
                      setDetailVisible(false);
                      setShowMap(false);
                      setTimeout(() => setActiveLocation(null), 350);
                    }}
                    className="absolute top-3 right-3 z-[1000] p-2 bg-background/80 backdrop-blur border border-border hover:bg-muted text-foreground rounded-full shadow-md transition-colors"
                    title="Close Map"
                  >
                    <X size={16} />
                  </button>
                )}
                <MapContainer
                  center={activeLocation ? [activeLocation.lat, activeLocation.lng] : [15, 70]}
                  zoom={activeLocation ? 7 : 3}
                  minZoom={2} maxZoom={18}
                  scrollWheelZoom={true}
                  style={{ height: "260px", width: "100%" }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <InvalidateSize />
                  {activeLocation && <FlyToLocation lat={activeLocation.lat} lng={activeLocation.lng} />}
                  {uniqueLocations.map((loc) => {
                    const currentFlag = editor?.pendingChanges?.[`global_presence:${(loc as any).id || loc.name}:flag`] ?? loc.flag;
                    return (
                    <Marker
                      key={loc.name}
                      position={[loc.lat, loc.lng]}
                      icon={createCustomIcon(activeLocation?.name === loc.name)}
                      draggable={editor?.isEditMode}
                      eventHandlers={{
                        click: () => handleLocationClick(loc),
                        dragend: (e) => {
                          const { lat, lng } = e.target.getLatLng();
                          setLocations((prev) =>
                            prev.map((l) => (l.name === loc.name ? { ...l, lat, lng } : l))
                          );
                          if (activeLocation?.name === loc.name) {
                            setActiveLocation((prev) => prev && { ...prev, lat, lng });
                          }
                        },
                      }}
                    >
                      <Popup>
                        <span className="text-3xl drop-shadow-sm flex items-center justify-center min-w-[32px] min-h-[24px]">
                          {currentFlag && (currentFlag.startsWith("/") || currentFlag.startsWith("http") || currentFlag.includes(".")) ? (
                            <img
                              src={currentFlag}
                              alt="flag"
                              className="w-8 h-5 object-cover rounded shadow-sm inline-block cursor-pointer hover:opacity-85 transition-opacity"
                              onDoubleClick={(e) => {
                                if (editor?.isEditMode) {
                                  e.stopPropagation();
                                  editor.onPickImage("global_presence", "flag", (loc as any).id || loc.name);
                                }
                              }}
                            />
                          ) : (
                            <EditableText section="global_presence" field="flag" id={(loc as any).id || loc.name} value={loc.flag} />
                          )}
                        </span>
                        <h3 className="font-heading font-bold text-foreground text-[0.9375rem] flex items-center gap-2"><MapPin size={14} className="text-secondary" /><EditableText section="global_presence" field="name" id={(loc as any).id || loc.name} value={loc.name.split(",")[0]} /></h3>
                      </Popup>
                    </Marker>
                  )})}
                </MapContainer>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default WorldMap;
