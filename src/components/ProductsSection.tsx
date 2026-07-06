import { useEffect, useRef, useState } from "react";
import AnimatedSection from "./AnimatedSection";
import {
  ShoppingCart,
  PlayCircle,
  Tag,
  CheckCircle2,
  XCircle,
  List,
  LayoutGrid,
  Database,
  Users,
  Anchor,
  Building2,
  Plane,
  Star,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Cloud,
  Headphones,
  UserCheck,
  ArrowRight,
  CheckSquare,
  MousePointerClick
} from "lucide-react";

import { useDbQuery } from "@/hooks/useDbQuery";
import { useSiteContent } from "@/hooks/useSiteContent";
import {
  EditableText,
  EditorToolbar,
  SectionHeaderToolbar,
  useLiveEditor,
  useLiveEditorNavigation,
  hasEmbeddedColor,
} from "./admin/LiveEditorContext";
import { TypographyEditorModal, parseInlineStyles } from "./admin/TypographyEditorModal";

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDark(document.documentElement.classList.contains("dark"));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function adjustColorForDarkMode(color: string): string {
  if (!color || !color.startsWith("#")) return color;
  let hex = color.substring(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return color;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  let newL = Math.max(0.65, Math.min(0.85, l));
  if (l < 0.3) newL = 0.70;
  let newS = Math.max(0.70, Math.min(0.90, s));
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let rFinal, gFinal, bFinal;
  if (newS === 0) {
    rFinal = gFinal = bFinal = newL;
  } else {
    const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
    const p = 2 * newL - q;
    rFinal = hue2rgb(p, q, h + 1 / 3);
    gFinal = hue2rgb(p, q, h);
    bFinal = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    const hexVal = Math.round(x * 255).toString(16);
    return hexVal.length === 1 ? "0" + hexVal : hexVal;
  };
  return `#${toHex(rFinal)}${toHex(gFinal)}${toHex(bFinal)}`;
}

const PRODUCT_ICON_CONFIG: Record<
  string,
  { Icon: React.ElementType; bg: string }
> = {};

function getProductIcon(name: string) {
  return (
    PRODUCT_ICON_CONFIG[name] ?? {
      Icon: ShoppingCart,
      bg: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    }
  );
}

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  extra_text?: string;
  extra_color?: string;
  image_url: string;
  contact_url: string;
  demo_url?: string;
  more_info_label?: string;
  demo_label?: string;
  is_popular: boolean;
  is_visible: boolean;
  sort_order: number;
}

interface SectionHeader {
  badge?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  badge_color?: string;
  title_color?: string;
  highlight_color?: string;
  subtitle_color?: string;
}

const FALLBACK_PRODUCTS: Product[] = [];

const DEFAULT_HEADER: SectionHeader = {
  badge: "Our Solutions",
  title: "Premium",
  highlight: "Software Products",
  subtitle: "Explore our suite of enterprise-grade software solutions designed to transform your business operations."
};

const ReadMoreText = ({ text, clampClass, textClass, section, field, id, colorField, onExpand, themeColor }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string; colorField?: string; onExpand?: () => void; themeColor?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [dynamicFontSize, setDynamicFontSize] = useState<string | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (!expanded) {
        setOverflows(el.scrollHeight > el.clientHeight + 6);
      }

      const innerSpan = el.querySelector('span[style*="font-size"]');
      if (innerSpan) {
        setDynamicFontSize((innerSpan as HTMLElement).style.fontSize);
      } else {
        const compStyle = window.getComputedStyle(el);
        setDynamicFontSize(compStyle.fontSize);
      }
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    const t = setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); mo.disconnect(); clearTimeout(t); window.removeEventListener("resize", check); };
  }, [text, expanded]);

  return (
    <div className="relative">
      <div ref={ref} className={`${textClass} ${expanded ? "" : clampClass} [&>span.relative]:block`}>
        {section && field ? (
          <EditableText tag="div" section={section} field={field} id={id} value={text} colorField={colorField} toolbarClassName="top-1 right-1" />
        ) : text}
      </div>
      {(overflows || expanded) && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); onExpand?.(); }}
          className="font-bold mt-1 transition-opacity hover:opacity-80"
          style={{ color: themeColor || "#ff6600", fontSize: dynamicFontSize ? `calc(${dynamicFontSize} * 0.92)` : "11px" }}
        >
          Read {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
};

const ProductCard = ({
  product,
  onDemo,
  cardStyle,
  getNavProps,
  onMove,
  draggedId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEditTypo,
  onReadMore,
}: {
  product: Product;
  onDemo: () => void;
  cardStyle: "icon" | "image";
  getNavProps: any;
  onMove?: (dir: "up" | "down" | "left" | "right") => void;
  draggedId?: string | null;
  onDragStart?: any;
  onDragEnd?: any;
  onDragOver?: any;
  onDrop?: any;
  onEditTypo?: any;
  onReadMore?: () => void;
}) => {
  const editor = useLiveEditor();
  const isDark = useIsDarkMode();
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const { Icon, bg } = getProductIcon(product.name);
  const badgeColor = product.extra_color || "#007600";
  const draftKeyTheme = product.id ? `products:${product.id}:extra_color` : `products:extra_color`;
  const themeColorRaw = editor?.pendingChanges[draftKeyTheme] ?? product.extra_color ?? "#ff6600";
  const themeColor = themeColorRaw.split(",")[0].trim() || "#ff6600";
  const displayColor = isDark ? adjustColorForDarkMode(themeColor) : themeColor;

  return (
    <div
      className={`relative flex flex-col flex-shrink-0 bg-white dark:bg-gradient-to-br dark:from-[#131326] dark:to-[#0a0a14] rounded-[24px] overflow-hidden group/item shadow-sm border-[0.5px] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] transition-[box-shadow,transform] duration-300 transform-gpu ${!product.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === product.id ? "opacity-20 scale-95" : ""}`}
      style={{ width: 320, contain: "paint", willChange: "transform", borderColor: isDark ? "rgba(100,100,150,0.25)" : "rgba(226, 232, 240, 1)" }}
      draggable={editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, product.id) : undefined}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, product.id) : undefined}
    >
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none" style={{ transform: "translateZ(0)" }}>
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <pattern id={`dots-${product.id}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill={displayColor} opacity="0.6" />
          </pattern>
          <rect width="40" height="40" fill={`url(#dots-${product.id})`} />
        </svg>
      </div>
      <div className="absolute top-0 left-0 w-24 h-24 rounded-br-[64px] opacity-10 pointer-events-none" style={{ backgroundColor: displayColor }} />

      <EditorToolbar
        section="products"
        id={product.id}
        isVisible={product.is_visible}
        imageField="image_url"
        colorField="extra_color"
      />
      {editor?.isEditMode && onMove && (
        <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onMove("left"); }}
            className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm"
            title="Move Left"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove("right"); }}
            className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm"
            title="Move Right"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
      {(product.is_popular || product.name === "HR-Metrics" || product.name === "BSOL") && (
        <div className={`absolute top-4 right-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[0.65rem] font-bold text-white shadow-sm tracking-wide`} style={{ backgroundColor: displayColor }}>
          {product.name === "HR-Metrics" ? "Most Popular" : "Best Seller"}
        </div>
      )}

      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3 flex flex-col relative z-10 w-full flex-1">
        {/* Top Section: Image and Headers */}
        <div className="flex flex-row items-center gap-3">
          <div className="w-[72px] h-[72px] shrink-0 relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[1.25px] opacity-35 pointer-events-none" style={{ borderColor: displayColor }} />
            <div className="w-[60px] h-[60px] rounded-full relative">
              {cardStyle === "image" ? (
                <div className="w-full h-full rounded-full overflow-hidden shadow-sm">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" loading="lazy" />
                </div>
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center shadow-sm" style={{ background: bg }}>
                  <Icon size={28} className="text-white/90" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col flex-1 justify-center">
            <h3 className="font-bold text-left text-[1.1rem] leading-tight" style={{ color: displayColor }}>
              <EditableText section="products" field="name" id={product.id} value={product.name} colorField="name_color" />
            </h3>
            <span className="text-[0.55rem] text-left font-extrabold uppercase tracking-[0.1em] mt-0.5 opacity-90" style={{ color: displayColor }}>
              <EditableText section="products" field="tagline" id={product.id} value={product.tagline} colorField="tagline_color" />
            </span>
          </div>
        </div>

        {/* Description & Read More */}
        <div className="mt-3">
          <ReadMoreText
            section="products"
            field="description"
            id={product.id}
            text={product.description}
            colorField="description_color"
            clampClass="line-clamp-2"
            textClass="text-[0.75rem] text-left font-medium text-slate-600 dark:text-slate-400 leading-relaxed"
            onExpand={onReadMore}
            themeColor={displayColor}
          />
        </div>

        {/* Features Box */}
        <div className="mt-3 rounded-xl p-2.5 flex flex-col gap-1.5 relative z-10 group/features mb-auto">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-xl overflow-hidden" style={{ backgroundColor: displayColor }} />
          {editor?.isEditMode && (
            <div className="absolute -top-3 right-0 opacity-0 group-hover/features:opacity-100 transition-opacity flex gap-1 bg-card rounded-md shadow-sm border border-border/50 p-0.5 z-10">
              <button
                onClick={() => {
                  const draftKey = product.id ? `products:${product.id}:extra_text` : `products:extra_text`;
                  const current = editor?.pendingChanges[draftKey] ?? product.extra_text;
                  const currentFeatures = current ? (current.includes("|||") ? current.split("|||") : current.split(",")) : [];
                  editor.onUpdate("products", "extra_text", [...currentFeatures, "New Feature"].join("|||"), product.id);
                }}
                className="p-1 hover:bg-secondary/10 text-secondary rounded"
                title="Add Feature"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
          {(() => {
            const draftKey = product.id ? `products:${product.id}:extra_text` : `products:extra_text`;
            const extraText = editor?.pendingChanges[draftKey] ?? product.extra_text;
            const features = extraText ? extraText.includes("|||") ? extraText.split("|||") : extraText.split(",") : [
              "15 Days Free Trial",
              "Cloud-based SaaS",
              "24/7 Support",
              "Custom Onboarding",
            ];

            const maxFeatures = 5;
            const hasMore = features.length > maxFeatures;
            const visibleFeatures = featuresExpanded || editor?.isEditMode ? features : features.slice(0, maxFeatures);

            return (
              <>
                {visibleFeatures.map((feature, idx) => {
                  const rawText = feature.trim();
                  if (!rawText) return null;
                  const isNegative = rawText.startsWith("!");
                  const cleanText = isNegative ? rawText.substring(1).trim() : rawText;

                  const { styles: parsedStyles, innerHtml } = parseInlineStyles(cleanText);
                  const hasStyles = Object.values(parsedStyles).some(v => !!v);

                  const fColor = isNegative ? "#ef4444" : displayColor;
                  const inlineStyle: React.CSSProperties = { color: fColor };
                  if (hasStyles) {
                    if (parsedStyles.fontFamily) inlineStyle.fontFamily = parsedStyles.fontFamily;
                    if (parsedStyles.fontSize) inlineStyle.fontSize = parsedStyles.fontSize;
                    if (parsedStyles.fontWeight) inlineStyle.fontWeight = parsedStyles.fontWeight as any;
                    if (parsedStyles.lineHeight) inlineStyle.lineHeight = parsedStyles.lineHeight;
                    if (parsedStyles.letterSpacing) inlineStyle.letterSpacing = parsedStyles.letterSpacing;
                    if (parsedStyles.textTransform) inlineStyle.textTransform = parsedStyles.textTransform as any;
                    if (parsedStyles.textAlign) inlineStyle.textAlign = parsedStyles.textAlign as any;
                    if (parsedStyles.textColor) inlineStyle.color = parsedStyles.textColor;
                    if (parsedStyles.bgColor) inlineStyle.backgroundColor = parsedStyles.bgColor;
                    if (parsedStyles.paddingTop) inlineStyle.paddingTop = parsedStyles.paddingTop;
                    if (parsedStyles.paddingRight) inlineStyle.paddingRight = parsedStyles.paddingRight;
                    if (parsedStyles.paddingBottom) inlineStyle.paddingBottom = parsedStyles.paddingBottom;
                    if (parsedStyles.paddingLeft) inlineStyle.paddingLeft = parsedStyles.paddingLeft;
                    if (parsedStyles.marginTop) inlineStyle.marginTop = parsedStyles.marginTop;
                    if (parsedStyles.marginRight) inlineStyle.marginRight = parsedStyles.marginRight;
                    if (parsedStyles.marginBottom) inlineStyle.marginBottom = parsedStyles.marginBottom;
                    if (parsedStyles.marginLeft) inlineStyle.marginLeft = parsedStyles.marginLeft;
                  }
                  const displayHtml = hasStyles ? innerHtml.replace(/(?<!-)\bcolor:\s*[^;"]+;?/gi, "") : cleanText;

                  return (
                    <div key={idx} className="flex items-center gap-2 py-0.5 group/badge relative">
                      <span
                        style={inlineStyle}
                        className={`text-[0.65rem] font-medium tracking-wide uppercase ${editor?.isEditMode ? "cursor-text hover:outline hover:outline-1 hover:outline-secondary/30 px-1" : ""}`}
                        contentEditable={editor?.isEditMode}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          if (!editor?.isEditMode) return;
                          const newVal = e.currentTarget.textContent || "";
                          const currentFeatures = [...features];
                          currentFeatures[idx] = isNegative ? `! ${newVal}` : newVal;
                          editor.onUpdate("products", "extra_text", currentFeatures.join("|||"), product.id);
                        }}
                        dangerouslySetInnerHTML={{ __html: displayHtml }}
                      />
                      {editor?.isEditMode && (
                        <div
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const target = e.currentTarget.previousElementSibling as HTMLElement;
                            let targetStyles: Record<string, string> | undefined = undefined;
                            if (target) {
                              const comp = window.getComputedStyle(target);
                              targetStyles = {
                                fontFamily: comp.fontFamily,
                                fontSize: comp.fontSize,
                                fontWeight: comp.fontWeight,
                                textColor: comp.color,
                              };
                            }
                            onEditTypo?.({ id: product.id, idx, value: cleanText, isNegative, extra_text: extraText, targetStyles });
                          }}
                          className="ml-auto p-0.5 hover:bg-secondary/20 rounded-[2px] transition-colors flex items-center justify-center cursor-pointer bg-secondary/10 text-secondary shrink-0 opacity-0 group-hover/badge:opacity-100"
                          title="Edit Text Style"
                        >
                          <span className="font-serif font-bold text-[10px] leading-none px-1 py-0.5">A</span>
                        </div>
                      )}
                      {editor?.isEditMode && (
                        <button
                          onClick={() => {
                            const currentFeatures = extraText ? (extraText.includes("|||") ? extraText.split("|||") : extraText.split(",")).map((s) => s.trim()) : [];
                            currentFeatures.splice(idx, 1);
                            editor.onUpdate("products", "extra_text", currentFeatures.join("|||"), product.id);
                          }}
                          className="ml-1 opacity-0 group-hover/badge:opacity-100 p-0.5 text-destructive hover:bg-destructive/10 rounded transition-all"
                          title="Remove Feature"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {!editor?.isEditMode && hasMore && idx === visibleFeatures.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFeaturesExpanded(!featuresExpanded); }}
                          className="ml-auto p-0.5 hover:bg-secondary/10 rounded-full transition-all shrink-0 border"
                          style={{ color: displayColor, borderColor: displayColor }}
                          title={featuresExpanded ? "Collapse" : "Expand"}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            {featuresExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-2 w-full shrink-0">
          <div className="flex-1 relative group/btn">
            <button
              {...getNavProps((e?: React.MouseEvent) => {
                e?.stopPropagation();
                const url = product.contact_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else if (url && url.startsWith("#")) {
                  document.querySelector(url)?.scrollIntoView({ behavior: "smooth" });
                } else {
                  onDemo();
                }
              })}
              className="w-full py-2 rounded-[8px] text-[10px] font-bold border transition-all flex justify-center bg-white dark:bg-transparent hover:opacity-80"
              style={{ color: displayColor, borderColor: displayColor }}
            >
              <EditableText section="products" field="more_info_label" id={product.id} value={product.more_info_label || "More Info"} />
            </button>
            {editor?.isEditMode && (
              <button
                onClick={(e) => { e.stopPropagation(); editor.onPickLink("products", "contact_url", product.id); }}
                className="absolute -top-3 -right-2 p-1 bg-white dark:bg-black rounded-lg shadow-md border border-border opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 text-blue-500"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              </button>
            )}
          </div>

          <div className="flex-1 relative group/btn">
            <button
              {...getNavProps((e?: React.MouseEvent) => {
                e?.stopPropagation();
                const url = product.demo_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else if (url && url.startsWith("#")) {
                  document.querySelector(url)?.scrollIntoView({ behavior: "smooth" });
                } else {
                  onDemo();
                }
              })}
              className="w-full py-2 rounded-[8px] text-[10px] font-bold text-white transition-all shadow-sm flex justify-center gap-1.5 items-center hover:opacity-90"
              style={{ backgroundColor: displayColor }}
            >
              <PlayCircle size={15} strokeWidth={2.5} />
              <EditableText section="products" field="demo_label" id={product.id} value={product.demo_label || "Demo"} />
            </button>
            {editor?.isEditMode && (
              <button
                onClick={(e) => { e.stopPropagation(); editor.onPickLink("products", "demo_url", product.id); }}
                className="absolute -top-3 -right-2 p-1 bg-white dark:bg-black rounded-lg shadow-md border border-border opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 text-blue-500"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCardList = ({
  product,
  onDemo,
  cardStyle,
  getNavProps,
  onMove,
  draggedId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onEditTypo,
}: {
  product: Product;
  onDemo: () => void;
  cardStyle: "icon" | "image";
  getNavProps: any;
  onMove?: (dir: "up" | "down" | "left" | "right") => void;
  draggedId?: string | null;
  onDragStart?: any;
  onDragEnd?: any;
  onDragOver?: any;
  onDrop?: any;
  onEditTypo?: any;
}) => {
  const editor = useLiveEditor();
  const isDark = useIsDarkMode();
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const { Icon, bg } = getProductIcon(product.name);

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gradient-to-br dark:from-[#131326] dark:to-[#0a0a14] rounded-2xl border-[0.5px] overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.25)] hover:border-blue-500 transition-all duration-300 hover:ring-2 hover:ring-secondary/50 group/item relative ${!product.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === product.id ? "opacity-20 scale-95" : ""}`}
      style={{ borderColor: isDark ? "rgba(100,100,150,0.25)" : "rgba(59, 130, 246, 0.3)" }}
      {...getNavProps((e?: React.MouseEvent) => {
        e?.stopPropagation();
        const url = product.contact_url || product.demo_url;
        if (url && url.startsWith("http")) window.open(url, "_blank");
        else if (url && url.startsWith("#")) document.querySelector(url)?.scrollIntoView({ behavior: "smooth" });
        else onDemo();
      })}
      draggable={editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, product.id) : undefined}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, product.id) : undefined}
    >
      <div className="h-3 w-full glossy-blue-header shrink-0" />
      <div className="flex flex-col sm:flex-row gap-5 flex-1 relative">
        <EditorToolbar
          section="products"
          id={product.id}
          isVisible={product.is_visible}
          imageField="image_url"
        />
        {editor?.isEditMode && onMove && (
          <div className="absolute top-2 left-2 z-30 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove("up");
              }}
              className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm"
              title="Move Up"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove("down");
              }}
              className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm"
              title="Move Down"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        )}
        {cardStyle === "image" ? (
          <div
            className="relative sm:w-48 shrink-0 bg-[#f7f8f8] dark:bg-[#0f0f1a] overflow-hidden"
            style={{ minHeight: 140 }}
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="sm:w-24 shrink-0 flex items-center justify-center"
            style={{ background: bg, minHeight: 100 }}
          >
            <Icon size={32} className="text-white/90" />
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col gap-2">
          {product.is_popular && (
            <span
              className={`self-start text-[0.625rem] font-bold text-white px-2 py-0.5 rounded-sm ${product.name === "HR-Metrics"
                ? "bg-gradient-to-r from-pink-600 to-rose-700 ring-2 ring-white/30 animate-pulse"
                : "bg-[#CC0C39]"
                }`}
            >
              {product.name === "HR-Metrics" ? "MOST POPULAR HR" : "Best Seller"}
            </span>
          )}
          <h3 className="font-bold text-[1.0625rem] text-gray-900 dark:text-white group-hover:text-[#C7511F] dark:group-hover:text-[#4db8c8] transition-colors">
            <EditableText
              section="products"
              field="name"
              id={product.id}
              value={product.name}
            />
          </h3>
          <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-[#007185] dark:text-[#4db8c8]">
            <EditableText
              section="products"
              field="tagline"
              id={product.id}
              value={product.tagline}
            />
          </span>
          <ReadMoreText
            section="products"
            field="description"
            id={product.id}
            text={product.description}
            clampClass="line-clamp-3"
            textClass="text-[0.8125rem] font-semibold text-muted-foreground leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-3 mt-auto pt-2">
            <div className="relative flex flex-col gap-2 mb-4 w-full group/features">
              {editor?.isEditMode && (
                <div className="absolute -top-3 right-0 opacity-0 group-hover/features:opacity-100 transition-opacity flex gap-1 bg-card rounded-md shadow-sm border border-border/50 p-0.5 z-10">
                  <button
                    onClick={() => {
                      const draftKey = product.id
                        ? `products:${product.id}:extra_text`
                        : `products:extra_text`;
                      const current =
                        editor?.pendingChanges[draftKey] ?? product.extra_text;
                      const currentFeatures = current ? (current.includes("|||") ? current.split("|||") : current.split(",")) : [];
                      editor.onUpdate(
                        "products",
                        "extra_text",
                        [...currentFeatures, "New Feature"].join("|||"),
                        product.id,
                      );
                    }}
                    className="p-1 hover:bg-secondary/10 text-secondary rounded"
                    title="Add Feature"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() =>
                      editor.onPickColor("products", "extra_color", product.id)
                    }
                    className="p-1 hover:bg-secondary/10 text-secondary rounded"
                    title="Pick Features Color"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </button>
                </div>
              )}
              {(() => {
                const draftKey = product.id
                  ? `products:${product.id}:extra_text`
                  : `products:extra_text`;
                const extraText =
                  editor?.pendingChanges[draftKey] ?? product.extra_text;
                const features = extraText
                  ? extraText.includes("|||")
                    ? extraText.split("|||")
                    : extraText.split(",")
                  : [
                    "15 Days Free Trial",
                    "Cloud-based SaaS",
                    "24/7 Support",
                    "Custom Onboarding",
                  ];

                const colorDraftKey = product.id
                  ? `products:${product.id}:extra_color`
                  : `products:extra_color`;
                const extraColor =
                  editor?.pendingChanges[colorDraftKey] ?? product.extra_color;
                const fColors = extraColor
                  ? extraColor.split(",").map((c) => c.trim())
                  : ["#16a34a"];
                const fColorBase = fColors[0] || "#16a34a";
                const displayColor = isDark ? adjustColorForDarkMode(fColorBase) : fColorBase;

                const maxFeatures = 5;
                const hasMore = features.length > maxFeatures;
                const visibleFeatures = featuresExpanded || editor?.isEditMode ? features : features.slice(0, maxFeatures);

                return (
                  <>
                    {visibleFeatures.map((feature, idx) => {
                      const rawText = feature.trim();
                      if (!rawText) return null;
                      const isNegative = rawText.startsWith("!");
                      const cleanText = isNegative
                        ? rawText.substring(1).trim()
                        : rawText;

                      const { styles: parsedStyles, innerHtml } = parseInlineStyles(cleanText);
                      const hasStyles = Object.values(parsedStyles).some(v => !!v);

                      const fColor = isNegative ? "#ef4444" : displayColor;

                      const inlineStyle: React.CSSProperties = { color: fColor };
                      if (hasStyles) {
                        if (parsedStyles.fontFamily) inlineStyle.fontFamily = parsedStyles.fontFamily;
                        if (parsedStyles.fontSize) inlineStyle.fontSize = parsedStyles.fontSize;
                        if (parsedStyles.fontWeight) inlineStyle.fontWeight = parsedStyles.fontWeight as any;
                        if (parsedStyles.lineHeight) inlineStyle.lineHeight = parsedStyles.lineHeight;
                        if (parsedStyles.letterSpacing) inlineStyle.letterSpacing = parsedStyles.letterSpacing;
                        if (parsedStyles.textTransform) inlineStyle.textTransform = parsedStyles.textTransform as any;
                        if (parsedStyles.textAlign) inlineStyle.textAlign = parsedStyles.textAlign as any;
                        if (parsedStyles.bgColor) inlineStyle.backgroundColor = parsedStyles.bgColor;
                        if (parsedStyles.paddingTop) inlineStyle.paddingTop = parsedStyles.paddingTop;
                        if (parsedStyles.paddingRight) inlineStyle.paddingRight = parsedStyles.paddingRight;
                        if (parsedStyles.paddingBottom) inlineStyle.paddingBottom = parsedStyles.paddingBottom;
                        if (parsedStyles.paddingLeft) inlineStyle.paddingLeft = parsedStyles.paddingLeft;
                        if (parsedStyles.marginTop) inlineStyle.marginTop = parsedStyles.marginTop;
                        if (parsedStyles.marginRight) inlineStyle.marginRight = parsedStyles.marginRight;
                        if (parsedStyles.marginBottom) inlineStyle.marginBottom = parsedStyles.marginBottom;
                        if (parsedStyles.marginLeft) inlineStyle.marginLeft = parsedStyles.marginLeft;
                      }
                      const displayHtml = hasStyles ? innerHtml.replace(/(?<!-)\bcolor:\s*[^;"]+;?/gi, "") : cleanText;

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 py-0.5 w-full max-w-sm group/badge hover:scale-[1.02] transition-transform"
                        >
                          <span
                            style={inlineStyle}
                            className={`text-[0.75rem] font-medium tracking-widest uppercase brightness-90 dark:brightness-125 inline-block rounded-sm ${editor?.isEditMode ? "cursor-text hover:outline hover:outline-1 hover:outline-secondary/30 px-1" : ""}`}
                            contentEditable={editor?.isEditMode}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              if (!editor?.isEditMode) return;
                              const newVal = e.currentTarget.textContent || "";
                              const currentFeatures = [...features];
                              currentFeatures[idx] = isNegative ? `! ${newVal}` : newVal;
                              editor.onUpdate("products", "extra_text", currentFeatures.join("|||"), product.id);
                            }}
                            dangerouslySetInnerHTML={{ __html: displayHtml }}
                          />
                          {editor?.isEditMode && (
                            <div
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const target = e.currentTarget.previousElementSibling as HTMLElement;
                                let targetStyles: Record<string, string> | undefined = undefined;
                                if (target) {
                                  const comp = window.getComputedStyle(target);
                                  targetStyles = {
                                    fontFamily: comp.fontFamily,
                                    fontSize: comp.fontSize,
                                    fontWeight: comp.fontWeight,
                                    lineHeight: comp.lineHeight,
                                    letterSpacing: comp.letterSpacing,
                                    textTransform: comp.textTransform,
                                    textAlign: comp.textAlign,
                                    textColor: comp.color,
                                    bgColor: comp.backgroundColor,
                                    paddingTop: comp.paddingTop,
                                    paddingRight: comp.paddingRight,
                                    paddingBottom: comp.paddingBottom,
                                    paddingLeft: comp.paddingLeft,
                                    marginTop: comp.marginTop,
                                    marginRight: comp.marginRight,
                                    marginBottom: comp.marginBottom,
                                    marginLeft: comp.marginLeft
                                  };
                                }
                                onEditTypo?.({
                                  id: product.id,
                                  idx,
                                  value: cleanText,
                                  isNegative,
                                  extra_text: extraText,
                                  targetStyles,
                                });
                              }}
                              className="ml-1 p-0.5 hover:bg-secondary/20 rounded-[2px] transition-colors flex items-center justify-center cursor-pointer bg-secondary/10 text-secondary shrink-0 opacity-0 group-hover/badge:opacity-100"
                              title="Edit Text Style"
                            >
                              <span className="font-serif font-bold text-[10px] leading-none px-1 py-0.5">
                                A
                              </span>
                            </div>
                          )}
                          {editor?.isEditMode && (
                            <button
                              onClick={() => {
                                const currentFeatures = extraText
                                  ? (extraText.includes("|||")
                                    ? extraText.split("|||")
                                    : extraText.split(",")
                                  ).map((s) => s.trim())
                                  : [];
                                currentFeatures.splice(idx, 1);
                                editor.onUpdate(
                                  "products",
                                  "extra_text",
                                  currentFeatures.join("|||"),
                                  product.id,
                                );
                              }}
                              className="ml-auto opacity-0 group-hover/badge:opacity-100 p-0.5 text-destructive hover:bg-destructive/10 rounded transition-all"
                              title="Remove Feature"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {!editor?.isEditMode && hasMore && idx === visibleFeatures.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setFeaturesExpanded(!featuresExpanded); }}
                              className="ml-auto p-0.5 hover:bg-secondary/10 rounded-full transition-all shrink-0 border"
                              style={{ color: displayColor, borderColor: displayColor }}
                              title={featuresExpanded ? "Collapse" : "Expand"}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                {featuresExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                {...getNavProps((e?: React.MouseEvent) => {
                  e?.stopPropagation();
                  const url = product.contact_url;
                  if (url && url.startsWith("http")) {
                    window.open(url, "_blank");
                  } else if (url && url.startsWith("#")) {
                    document.querySelector(url)?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    onDemo();
                  }
                })}
                className="py-2.5 px-4 rounded-xl text-[10px] font-bold text-secondary border border-secondary transition-all duration-300 hover:bg-secondary/10 flex items-center"
              >
                <EditableText
                  section="products"
                  field="more_info_label"
                  id={product.id}
                  value={product.more_info_label || "More Info"}
                />
              </button>
              <button
                {...getNavProps((e?: React.MouseEvent) => {
                  e?.stopPropagation();
                  const url = product.demo_url;
                  if (url && url.startsWith("http")) {
                    window.open(url, "_blank");
                  } else if (url && url.startsWith("#")) {
                    document.querySelector(url)?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    onDemo();
                  }
                })}
                className="py-2.5 px-4 rounded-xl text-[10px] font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-95 shadow-md flex items-center group-hover:bg-blue-600"
                style={{ background: bg }}
              >
                <span className="flex items-center gap-1.5">
                  <PlayCircle size={15} />
                  <EditableText
                    section="products"
                    field="demo_label"
                    id={product.id}
                    value={product.demo_label || "Demo"}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-3 w-full glossy-blue-header shrink-0 rotate-180 mt-auto" />
    </div>
  );
};

const ProductsSection = () => {
  const globalView = "grid";
  const cardStyle = "image" as const;
  const [isMobileProducts, setIsMobileProducts] = useState(false);
  const [mobilePage, setMobilePage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const userInteractedRef = useRef<boolean>(false);
  const swiperRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPauseHint, setShowPauseHint] = useState(false);
  const getNavProps = useLiveEditorNavigation();
  const SPEED = 50; // Pixels per second for smooth scrolling
  const GAP = 24;
  const CARD_W = 300;

  const editor = useLiveEditor();
  const { data: dbProducts } = useDbQuery<Product[]>(
    "products",
    editor?.isEditMode ? {} : { is_visible: true },
    { order: "sort_order" },
  );

  const [productsState, setProductsState] = useState<Product[]>([]);
  useEffect(() => {
    if (dbProducts) setProductsState(dbProducts);
  }, [dbProducts]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [typoFeature, setTypoFeature] = useState<{
    id: string;
    idx: number;
    value: string;
    isNegative: boolean;
    extra_text?: string;
    targetStyles?: Record<string, string>;
  } | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!editor?.isEditMode) return;
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!editor?.isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!editor?.isEditMode || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const sourceIdx = productsState.findIndex((t) => t.id === draggedId);
    const targetIdx = productsState.findIndex((t) => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newItems = [...productsState];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);
    setProductsState(newItems);

    newItems.forEach((item, idx) => {
      if (item.sort_order !== idx) {
        editor.onUpdate("products", "sort_order", idx, item.id);
      }
    });
    setDraggedId(null);
  };

  const handleMove = async (
    id: string,
    direction: "up" | "down" | "left" | "right",
  ) => {
    if (!editor?.isEditMode || !productsState) return;
    const idx = productsState.findIndex((t) => t.id === id);
    if (idx === -1) return;

    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = -1;
    else if (direction === "down") step = 1;

    const targetIdx = Math.max(
      0,
      Math.min(productsState.length - 1, idx + step),
    );
    if (targetIdx === idx) return;

    const newItems = [...productsState];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);
    setProductsState(newItems);

    newItems.forEach((item, i) => {
      if (item.sort_order !== i) {
        editor.onUpdate("products", "sort_order", i, item.id);
      }
    });
  };

  const content = useSiteContent("our_products");

  const products = productsState.length > 0 ? productsState : FALLBACK_PRODUCTS;
  const header = {
    ...DEFAULT_HEADER,
    ...(content || {}),
  };

  const sectionRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setIsInView(entries.some(entry => entry.isIntersecting)),
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    if (trackRef.current) observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [globalView]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileProducts(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMobilePage(0);
  }, [products.length, globalView]);

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.autoplay) {
      if (isInView && isPlaying) {
        swiperRef.current.slideToLoop(0, 0);
        setTimeout(() => {
          if (swiperRef.current && swiperRef.current.autoplay && isPlaying) {
            swiperRef.current.slideNext();
            swiperRef.current.autoplay.start();
          }
        }, 100);
      } else {
        swiperRef.current.autoplay.stop();
        if (!isInView) swiperRef.current.slideToLoop(0, 0);
      }
    }
  }, [isInView, isPlaying]);

  useEffect(() => {
    if (globalView !== "grid" || isMobileProducts || products.length === 0 || editor?.isEditMode || !isInView)
      return;
    const el = trackRef.current;
    if (!el) return;

    el.scrollLeft = 0;
    const itemW = CARD_W + GAP;
    const totalW = products.length * itemW;

    let lastTime: number | null = null;
    let currentScroll = 0;

    const animate = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      if (isPlaying && !userInteractedRef.current && !pausedRef.current && dt < 100) {
        currentScroll += (SPEED * dt) / 1000;
        if (currentScroll >= totalW) {
          currentScroll -= totalW;
        }
        el.scrollLeft = currentScroll;
      } else {
        // Sync internal scroll tracker with the physical scrollbar position 
        // while the user is interacting or paused, so it resumes smoothly
        currentScroll = el.scrollLeft;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [products, globalView, isMobileProducts, editor?.isEditMode, isInView, isPlaying]);

  const scrollToContact = () =>
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });


  const tripled = [...products, ...products, ...products];
  const mobileCardsPerPage = 1;
  const mobileTotalPages = Math.max(1, Math.ceil(products.length / mobileCardsPerPage));
  const mobileProducts = products.slice(mobilePage * mobileCardsPerPage, (mobilePage + 1) * mobileCardsPerPage);

  const goToMobilePage = (page: number, interaction = false) => {
    if (interaction) userInteractedRef.current = true;
    setMobilePage(((page % mobileTotalPages) + mobileTotalPages) % mobileTotalPages);
  };

  useEffect(() => {
    if (!isMobileProducts || globalView !== "grid" || editor?.isEditMode || mobileTotalPages <= 1 || !isInView) {
      setMobilePage(0);
      return;
    }
    const interval = setInterval(() => {
      if (!userInteractedRef.current && !pausedRef.current) {
        setMobilePage(prev => (prev + 1) % mobileTotalPages);
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [isMobileProducts, globalView, editor?.isEditMode, mobileTotalPages, isInView]);

  if (!editor?.isEditMode && content?.is_visible === false) return null;
  if (!dbProducts && !products.length) return null;

  return (
    <section
      id="products"
      className="pt-10 pb-6 md:pt-16 md:pb-8 relative overflow-hidden bg-background"
    >
      <EditorToolbar section="products" canAdd />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-0 relative group">
          <div className="inline-flex items-center gap-2 mb-3">
            <span
              className="text-secondary font-bold text-sm uppercase tracking-widest"
              style={{ color: hasEmbeddedColor(header.badge) ? undefined : (header.badge_color || undefined) }}
            >
              <EditableText
                section="our_products"
                field="badge"
                value={header.badge || DEFAULT_HEADER.badge}
                colorField="badge_color"
              />
            </span>
          </div>
          <h2
            className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-1 mb-2 relative"
            style={{ color: hasEmbeddedColor(header.title) ? undefined : (header.title_color || undefined) }}
          >
            <span>
              <EditableText
                section="our_products"
                field="title"
                value={header.title || DEFAULT_HEADER.title || ""}
                colorField="title_color"
              />{" "}
              <span
                className="gradient-text"
                style={{
                  color: header.highlight_color || undefined,
                  background: header.highlight_color ? "none" : undefined,
                  WebkitTextFillColor: header.highlight_color
                    ? "initial"
                    : undefined,
                }}
              >
                <EditableText
                  section="our_products"
                  field="highlight"
                  value={header.highlight || DEFAULT_HEADER.highlight || ""}
                  colorField="highlight_color"
                />
              </span>
            </span>
            <SectionHeaderToolbar
              section="our_products"
              targetSection="products"
              isVisible={content.is_visible !== false}
              className="absolute right-0 top-1/2 -translate-y-1/2 scale-90"
            />
          </h2>
          <div
            className="text-muted-foreground max-w-2xl mx-auto text-[0.9375rem]"
            style={{ color: hasEmbeddedColor(header.subtitle) ? undefined : (header.subtitle_color || undefined) }}
          >
            <EditableText
              section="our_products"
              field="subtitle"
              value={header.subtitle || DEFAULT_HEADER.subtitle || ""}
              colorField="subtitle_color"
            />
          </div>
        </AnimatedSection>

        {globalView === "grid" && !editor?.isEditMode ? (
          <div
            ref={sectionRef}
            className="w-full relative px-2 sm:px-8 pt-0 pb-2 overflow-visible"
            onMouseEnter={() => {
              if (swiperRef.current?.autoplay && !swiperRef.current.autoplay.running && isPlaying) {
                swiperRef.current.autoplay.start();
              }
            }}
            onMouseLeave={() => {
              if (swiperRef.current?.autoplay && !swiperRef.current.autoplay.running && isPlaying) {
                swiperRef.current.autoplay.start();
              }
            }}
            onTouchStart={() => {
              if (swiperRef.current?.autoplay && !swiperRef.current.autoplay.running && isPlaying) {
                swiperRef.current.autoplay.start();
              }
            }}
            onTouchEnd={() => {
              setTimeout(() => {
                if (swiperRef.current?.autoplay && !swiperRef.current.autoplay.running && isPlaying) {
                  swiperRef.current.autoplay.start();
                }
              }, 2500);
            }}
          >
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                swiper.autoplay.stop();
              }}
              key={`swiper-${products.length}-${isMobileProducts}`}
              effect={isMobileProducts ? 'slide' : 'coverflow'}
              spaceBetween={isMobileProducts ? 30 : 0}
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              loop={products.length > 0}
              coverflowEffect={{
                rotate: 20,
                stretch: 0,
                depth: 150,
                modifier: 1,
                slideShadows: false,
              }}
              pagination={{ clickable: true, dynamicBullets: true }}
              navigation={{
                nextEl: '.products-button-next',
                prevEl: '.products-button-prev',
              }}
              speed={400}
              autoplay={{
                delay: 1200,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
              }}
              onClick={(swiper) => {
                if (swiper.autoplay && swiper.autoplay.running) {
                  swiper.autoplay.stop();
                }
              }}
              modules={[EffectCoverflow, Pagination, Navigation, Autoplay]}
              className="w-full max-w-7xl mx-auto !pb-4 products-swiper !px-4 md:!px-12"
            >
              {(products.length > 0 && products.length < 6 ? [...products, ...products, ...products] : products).map((product, idx) => (
                <SwiperSlide key={`${product.id}-${idx}`} className="h-auto">
                  <div className="h-full w-full py-2 transition-transform duration-300 hover:-translate-y-2 flex justify-center">
                    <div className="w-full max-w-[400px] flex justify-center">
                      <ProductCard
                        product={product}
                        onDemo={scrollToContact}
                        cardStyle={cardStyle}
                        getNavProps={getNavProps}
                        draggedId={null}
                        onEditTypo={setTypoFeature}
                        onReadMore={() => {
                          userInteractedRef.current = true;
                          if (swiperRef.current?.autoplay) {
                            swiperRef.current.autoplay.stop();
                          }
                        }}
                      />
                    </div>
                  </div>
                </SwiperSlide>
              ))}

              {/* Custom Navigation Arrows */}
              <div className="products-button-prev absolute top-1/2 left-2 md:-left-4 -translate-y-1/2 z-50 cursor-pointer text-secondary w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-card border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all">
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
              <div className="products-button-next absolute top-1/2 right-2 md:-right-4 -translate-y-1/2 z-50 cursor-pointer text-secondary w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-card border border-border rounded-full shadow-lg flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
            </Swiper>

            <style dangerouslySetInnerHTML={{
              __html: `
              .products-swiper .swiper-pagination { bottom: 0 !important; }
              .products-swiper .swiper-pagination-bullet { background: var(--secondary); opacity: 0.3; }
              .products-swiper .swiper-pagination-bullet-active { opacity: 1; }
              .products-button-prev.swiper-button-disabled,
              .products-button-next.swiper-button-disabled { opacity: 0.35; cursor: auto; pointer-events: none; }
            `}} />

            {/* Play/Pause toggle — matching testimonials section */}
            <div className="flex justify-center mt-6 z-20 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(p => {
                    const newIsPlaying = !p;
                    if (swiperRef.current?.autoplay) {
                      if (newIsPlaying) swiperRef.current.autoplay.start();
                      else swiperRef.current.autoplay.stop();
                    }
                    return newIsPlaying;
                  });
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold border border-border bg-card text-primary hover:bg-secondary/10 shadow-md transition-all"
                title={isPlaying ? "Pause Auto Slide" : "Resume Auto Slide"}
              >
                {isPlaying ? (
                  <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> Pause Auto Slide</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> Resume Auto Slide</>
                )}
              </button>
            </div>
          </div>
        ) : globalView === "grid" ? (
          <div
            ref={trackRef}
            className="relative overflow-x-auto custom-scrollbar pb-4"
            onMouseEnter={() => {
              pausedRef.current = true;
            }}
            onMouseLeave={() => {
              pausedRef.current = false;
              userInteractedRef.current = false;
            }}
            onWheel={() => { userInteractedRef.current = true; }}
            onTouchStart={() => { userInteractedRef.current = true; }}
            onTouchEnd={() => {
              // Resume after a delay on touch devices where mouseleave doesn't fire
              setTimeout(() => { userInteractedRef.current = false; }, 2500);
            }}
            onMouseDown={() => { userInteractedRef.current = true; }}
            onKeyDown={() => { userInteractedRef.current = true; }}
          >
            <div
              className="flex w-max"
              style={{
                gap: GAP,
                paddingBottom: 12,
                paddingTop: 4,
              }}
            >
              {(editor?.isEditMode ? products : tripled).map((product, i) => (
                <ProductCard
                  key={`${product.id}-${i}`}
                  product={product}
                  onDemo={scrollToContact}
                  cardStyle={cardStyle}
                  getNavProps={getNavProps}
                  onMove={
                    editor?.isEditMode
                      ? (dir) => handleMove(product.id, dir)
                      : undefined
                  }
                  draggedId={draggedId}
                  onDragStart={handleDragStart}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onEditTypo={setTypoFeature}
                />
              ))}
            </div>
            {/* Play/Pause toggle — matching testimonials section */}
            <div className="flex justify-center mt-6 z-20 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(p => !p);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold border border-border bg-card text-primary hover:bg-secondary/10 shadow-md transition-all"
                title={isPlaying ? "Pause Auto Slide" : "Resume Auto Slide"}
              >
                {isPlaying ? (
                  <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg> Pause Auto Slide</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> Resume Auto Slide</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {products.map((product) => (
              <AnimatedSection key={product.id}>
                <ProductCardList
                  product={product}
                  onDemo={scrollToContact}
                  cardStyle={cardStyle}
                  getNavProps={getNavProps}
                  onMove={
                    editor?.isEditMode
                      ? (dir) => handleMove(product.id, dir)
                      : undefined
                  }
                  draggedId={draggedId}
                  onDragStart={handleDragStart}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onEditTypo={setTypoFeature}
                />
              </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection className="text-center mt-0">
          <div className="text-xs text-muted-foreground">
            {globalView === "grid" && <EditableText section="our_products" field="hover_hint" value={content.hover_hint || "Click on the product to pause · "} />}
            <button
              onClick={scrollToContact}
              className="text-secondary underline underline-offset-2 hover:opacity-80"
            >
              <EditableText section="our_products" field="contact_us" value={content.contact_us || "Contact us"} />
            </button>{" "}
            <EditableText section="our_products" field="demo_text" value={content.demo_text || "for a personalised demo"} />
          </div>
        </AnimatedSection>
      </div>

      {typoFeature && (
        <TypographyEditorModal
          isOpen={!!typoFeature}
          section="products"
          field="extra_text_badge"
          initialValue={typoFeature.value}
          originalValue={typoFeature.value}
          targetStyles={typoFeature.targetStyles}
          onClose={() => setTypoFeature(null)}
          onSave={(_, __, val) => {
            const currentFeatures = typoFeature.extra_text
              ? (typoFeature.extra_text.includes("|||")
                ? typoFeature.extra_text.split("|||")
                : typoFeature.extra_text.split(",")
              ).map((s) => s.trim())
              : [
                "15 Days Free Trial",
                "Cloud-based SaaS",
                "24/7 Support",
                "Custom Onboarding",
              ];

            currentFeatures[typoFeature.idx] = typoFeature.isNegative
              ? `! ${val}`
              : val;
            if (editor?.onUpdate) {
              editor.onUpdate(
                "products",
                "extra_text",
                currentFeatures.join("|||"),
                typoFeature.id,
              );
            }
            setTypoFeature(null);
          }}
        />
      )}
    </section>
  );
};

export default ProductsSection;
