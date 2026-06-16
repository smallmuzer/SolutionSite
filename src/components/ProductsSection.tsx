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
} from "lucide-react";
import { useGlobalView } from "./ui-customizer-context";
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

const ReadMoreText = ({ text, clampClass, textClass, section, field, id, colorField, onExpand }: { text: string; clampClass: string; textClass: string; section?: string; field?: string; id?: string; colorField?: string; onExpand?: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (!expanded) {
        setOverflows(el.scrollHeight > el.clientHeight + 6);
      }
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const t = setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener("resize", check); };
  }, [text, expanded]);

  return (
    <div className="relative">
      <div ref={ref} className={`${textClass} ${expanded ? "" : clampClass}`}>
        {section && field ? (
          <EditableText section={section} field={field} id={id} value={text} colorField={colorField} />
        ) : text}
      </div>
      {(overflows || expanded) && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); onExpand?.(); }}
          className="text-[0.6875rem] font-bold text-secondary mt-1 hover:underline underline-offset-2"
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
  onDragOver?: any;
  onDrop?: any;
  onEditTypo?: any;
  onReadMore?: () => void;
}) => {
  const editor = useLiveEditor();
  const { Icon, bg } = getProductIcon(product.name);
  const badgeColor = product.extra_color || "#007600";

  return (
    <div
      className={`relative flex-shrink-0 bg-white dark:bg-[#11111f] rounded-2xl overflow-hidden group/item cursor-pointer border border-border/50 hover:border-blue-500/30 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-2 hover:outline hover:outline-2 hover:outline-secondary/50 ${!product.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === product.id ? "opacity-20 scale-95" : ""}`}
      style={{ width: 280 }}
      {...getNavProps(() => { })}
      draggable={editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, product.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, product.id) : undefined}
    >
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
              onMove("left");
            }}
            className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm"
            title="Move Left"
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove("right");
            }}
            className="p-1 bg-secondary/80 text-white rounded-full pointer-events-auto hover:scale-110 transition-transform shadow-sm"
            title="Move Right"
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
      {product.is_popular && (
        <div
          className={`absolute top-2 left-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[0.6875rem] font-black text-white shadow-lg ${product.name === "HR-Metrics"
            ? "bg-gradient-to-r from-pink-600 to-rose-700 ring-2 ring-white/30 animate-pulse"
            : "bg-[#CC0C39]"
            }`}
        >
          {product.name === "HR-Metrics" && (
            <Star size={10} fill="currentColor" className="animate-spin-slow" />
          )}
          {product.name === "HR-Metrics" ? "MOST POPULAR HR" : "Best Seller"}
        </div>
      )}

      {cardStyle === "image" ? (
        <div
          className="relative bg-[#f7f8f8] dark:bg-[#0f0f1a] overflow-hidden"
          style={{ height: 180 }}
        >
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-all duration-300" />
        </div>
      ) : (
        <div
          className="relative overflow-hidden flex items-center justify-center"
          style={{ height: 90, background: bg }}
        >
          <Icon size={36} className="text-white/90" />
          <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-all duration-300" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-[#007185] dark:text-[#4db8c8]">
          <EditableText
            section="products"
            field="tagline"
            id={product.id}
            value={product.tagline}
            colorField="tagline_color"
          />
        </span>
        <h3 className="font-bold text-[1rem] leading-snug text-gray-900 dark:text-white group-hover/item:text-[#C7511F] dark:group-hover/item:text-[#4db8c8] transition-colors">
          <EditableText
            section="products"
            field="name"
            id={product.id}
            value={product.name}
            colorField="name_color"
          />
        </h3>
        <ReadMoreText
          section="products"
          field="description"
          id={product.id}
          text={product.description}
          colorField="description_color"
          clampClass="line-clamp-2"
          textClass="text-[0.75rem] font-semibold text-gray-500 dark:text-gray-400 leading-relaxed"
          onExpand={onReadMore}
        />

        <div className="relative flex flex-col gap-2 mt-1 border-t border-gray-100 dark:border-white/5 pt-3 group/features">
          {editor?.isEditMode && (
            <div className="absolute -top-3 right-0 opacity-0 group-hover/features:opacity-100 transition-opacity flex gap-1 bg-card rounded-md shadow-sm border border-border/50 p-0.5 z-10">
              <button
                onClick={() => {
                  const draftKey = product.id
                    ? `products:${product.id}:extra_text`
                    : `products:extra_text`;
                  const current =
                    editor?.pendingChanges[draftKey] ?? product.extra_text;
                  editor.onUpdate(
                    "products",
                    "extra_text",
                    current ? `${current}, New Feature` : "New Feature",
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

            return features.map((feature, idx) => {
              const rawText = feature.trim();
              if (!rawText) return null;
              const isNegative = rawText.startsWith("!");
              const cleanText = isNegative
                ? rawText.substring(1).trim()
                : rawText;

              const { styles: parsedStyles, innerHtml } = parseInlineStyles(cleanText);
              const hasStyles = Object.values(parsedStyles).some(v => !!v);

              const fColor = isNegative ? "#ef4444" : fColorBase;

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

              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 py-0.5 group/badge hover:scale-[1.02] transition-transform"
                >
                  <span
                    style={inlineStyle}
                    className={`text-[0.6875rem] font-bold tracking-tight brightness-90 dark:brightness-125 uppercase inline-block rounded-sm ${editor?.isEditMode ? "cursor-text hover:outline hover:outline-1 hover:outline-secondary/30 px-1" : ""}`}
                    contentEditable={editor?.isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      if (!editor?.isEditMode) return;
                      const newVal = e.currentTarget.textContent || "";
                      const currentFeatures = extraText
                        ? (extraText.includes("|||")
                          ? extraText.split("|||")
                          : extraText.split(",")
                        ).map((s) => s.trim())
                        : [
                          "15 Days Free Trial",
                          "Cloud-based SaaS",
                          "24/7 Support",
                          "Custom Onboarding",
                        ];
                      currentFeatures[idx] = isNegative
                        ? `! ${newVal}`
                        : newVal;
                      editor.onUpdate(
                        "products",
                        "extra_text",
                        currentFeatures.join("|||"),
                        product.id,
                      );
                    }}
                    dangerouslySetInnerHTML={{ __html: hasStyles ? innerHtml : cleanText }}
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
                </div>
              );
            });
          })()}
        </div>
        <div className="flex items-center gap-2 mt-3 w-full">
          <div className="flex-1 relative group/btn">
            <button
              {...getNavProps(() => {
                const url = product.contact_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else {
                  onDemo();
                }
              })}
              className="w-full py-2.5 rounded-xl text-[0.8125rem] font-bold text-secondary border border-secondary transition-all duration-300 hover:bg-secondary/10 flex justify-center"
            >
              <EditableText
                section="products"
                field="more_info_label"
                id={product.id}
                value={product.more_info_label || "More Info"}
              />
            </button>
            {editor?.isEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.onPickLink("products", "contact_url", product.id);
                }}
                className="absolute -top-3 -right-2 p-1.5 bg-white dark:bg-black rounded-lg shadow-lg border border-border opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 text-blue-500"
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
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex-1 relative group/btn">
            <button
              {...getNavProps(() => {
                const url = product.demo_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else {
                  onDemo();
                }
              })}
              className="w-full py-2.5 rounded-xl text-[0.8125rem] font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-95 shadow-md flex justify-center group-hover/item:bg-blue-600"
              style={{ background: bg }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <PlayCircle size={15} />
                <EditableText
                  section="products"
                  field="demo_label"
                  id={product.id}
                  value={product.demo_label || "Demo"}
                />
              </span>
            </button>
            {editor?.isEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editor.onPickLink("products", "demo_url", product.id);
                }}
                className="absolute -top-3 -right-2 p-1.5 bg-white dark:bg-black rounded-lg shadow-lg border border-border opacity-0 group-hover/btn:opacity-100 transition-opacity z-20 text-blue-500"
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
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
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
  onDragOver?: any;
  onDrop?: any;
  onEditTypo?: any;
}) => {
  const editor = useLiveEditor();
  const { Icon, bg } = getProductIcon(product.name);

  return (
    <div
      className={`flex flex-col sm:flex-row gap-5 bg-white dark:bg-[#11111f] rounded-2xl border border-border/50 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.25)] hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group/item relative hover:outline hover:outline-2 hover:outline-secondary/50 ${!product.is_visible ? "opacity-50 grayscale" : ""} ${draggedId === product.id ? "opacity-20 scale-95" : ""}`}
      {...getNavProps(() => { })}
      draggable={editor?.isEditMode}
      onDragStart={onDragStart ? (e) => onDragStart(e, product.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, product.id) : undefined}
    >
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
        <span className="text-[0.625rem] font-semibold uppercase tracking-widest text-[#007185] dark:text-[#4db8c8]">
          <EditableText
            section="products"
            field="tagline"
            id={product.id}
            value={product.tagline}
          />
        </span>
        <h3 className="font-bold text-[1.0625rem] text-gray-900 dark:text-white group-hover:text-[#C7511F] dark:group-hover:text-[#4db8c8] transition-colors">
          <EditableText
            section="products"
            field="name"
            id={product.id}
            value={product.name}
          />
        </h3>
        <ReadMoreText
          section="products"
          field="description"
          id={product.id}
          text={product.description}
          clampClass="line-clamp-3"
          textClass="text-[0.8125rem] font-semibold text-gray-500 dark:text-gray-400 leading-relaxed"
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
                    editor.onUpdate(
                      "products",
                      "extra_text",
                      current ? `${current}, New Feature` : "New Feature",
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

              return features.map((feature, idx) => {
                const rawText = feature.trim();
                if (!rawText) return null;
                const isNegative = rawText.startsWith("!");
                const cleanText = isNegative
                  ? rawText.substring(1).trim()
                  : rawText;

                const { styles: parsedStyles, innerHtml } = parseInlineStyles(cleanText);
                const hasStyles = Object.values(parsedStyles).some(v => !!v);

                const fColor = isNegative ? "#ef4444" : fColorBase;

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

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 py-0.5 w-full max-w-sm group/badge hover:scale-[1.02] transition-transform"
                  >
                    <span
                      style={inlineStyle}
                      className={`text-[0.75rem] font-black tracking-widest uppercase brightness-90 dark:brightness-125 inline-block rounded-sm ${editor?.isEditMode ? "cursor-text hover:outline hover:outline-1 hover:outline-secondary/30 px-1" : ""}`}
                      contentEditable={editor?.isEditMode}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (!editor?.isEditMode) return;
                        const newVal = e.currentTarget.textContent || "";
                        const currentFeatures = extraText
                          ? (extraText.includes("|||")
                            ? extraText.split("|||")
                            : extraText.split(",")
                          ).map((s) => s.trim())
                          : [
                            "15 Days Free Trial",
                            "Cloud-based SaaS",
                            "24/7 Support",
                            "Custom Onboarding",
                          ];
                        currentFeatures[idx] = isNegative
                          ? `! ${newVal}`
                          : newVal;
                        editor.onUpdate(
                          "products",
                          "extra_text",
                          currentFeatures.join("|||"),
                          product.id,
                        );
                      }}
                      dangerouslySetInnerHTML={{ __html: hasStyles ? innerHtml : cleanText }}
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
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = product.contact_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else {
                  onDemo();
                }
              }}
              className="py-2.5 px-4 rounded-xl text-[0.8125rem] font-bold text-secondary border border-secondary transition-all duration-300 hover:bg-secondary/10 flex items-center"
            >
              <EditableText
                section="products"
                field="more_info_label"
                id={product.id}
                value={product.more_info_label || "More Info"}
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = product.demo_url;
                if (url && url.startsWith("http")) {
                  window.open(url, "_blank");
                } else {
                  onDemo();
                }
              }}
              className="py-2.5 px-4 rounded-xl text-[0.8125rem] font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-95 shadow-md flex items-center group-hover:bg-blue-600"
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
  );
};

const ProductsSection = () => {
  const globalView = useGlobalView();
  const cardStyle = "image" as const;
  const [isMobileProducts, setIsMobileProducts] = useState(false);
  const [mobilePage, setMobilePage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const userInteractedRef = useRef<boolean>(false);
  const getNavProps = useLiveEditorNavigation();
  const SPEED = 0.45;
  const GAP = 24;
  const CARD_W = 280;

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
    if (!editor?.isEditMode || !draggedId || draggedId === targetId) return;

    const sourceIdx = productsState.findIndex((t) => t.id === draggedId);
    const targetIdx = productsState.findIndex((t) => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newItems = [...productsState];
    const [moved] = newItems.splice(sourceIdx, 1);
    newItems.splice(targetIdx, 0, moved);

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
    if (globalView !== "grid" || isMobileProducts || products.length === 0 || editor?.isEditMode)
      return;
    const el = trackRef.current;
    if (!el) return;
    const itemW = CARD_W + GAP;
    const totalW = products.length * itemW;
    const animate = () => {
      if (!pausedRef.current) {
        posRef.current += SPEED;
        if (posRef.current >= totalW) posRef.current -= totalW;
        if (el) el.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [products, globalView, isMobileProducts, editor?.isEditMode]);

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
    if (!isMobileProducts || globalView !== "grid" || editor?.isEditMode || mobileTotalPages <= 1) return;
    const interval = setInterval(() => {
      if (!userInteractedRef.current && !pausedRef.current) {
        setMobilePage(prev => (prev + 1) % mobileTotalPages);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isMobileProducts, globalView, editor?.isEditMode, mobileTotalPages]);

  if (!editor?.isEditMode && content?.is_visible === false) return null;
  if (!dbProducts && !products.length) return null;

  return (
    <section
      id="products"
      className="section-padding relative overflow-hidden bg-background"
    >
      <EditorToolbar section="products" canAdd />
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center  mb-4 relative group">
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
            className="text-gray-500 max-w-2xl mx-auto text-[0.9375rem]"
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

        {globalView === "grid" && isMobileProducts && !editor?.isEditMode ? (
          <div 
            className="max-w-3xl mx-auto px-1 overflow-hidden"
            onMouseEnter={() => pausedRef.current = true}
            onMouseLeave={() => pausedRef.current = false}
            onTouchStart={() => pausedRef.current = true}
            onTouchEnd={() => pausedRef.current = false}
          >
            <div 
              className="flex transition-transform duration-500 ease-in-out w-full"
              style={{ transform: `translateX(-${mobilePage * 100}%)` }}
            >
              {Array.from({ length: mobileTotalPages }).map((_, pageIdx) => (
                <div key={pageIdx} className="w-full flex-shrink-0 grid grid-cols-1 gap-4 items-stretch px-1">
                  {products.slice(pageIdx * mobileCardsPerPage, (pageIdx + 1) * mobileCardsPerPage).map((product) => (
                    <div key={product.id} className="flex justify-center">
                      <ProductCard
                        product={product}
                        onDemo={scrollToContact}
                        cardStyle={cardStyle}
                        getNavProps={getNavProps}
                        draggedId={draggedId}
                        onEditTypo={setTypoFeature}
                        onReadMore={() => { userInteractedRef.current = true; }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {mobileTotalPages > 1 && (
              <div className="flex items-center justify-center gap-5 mt-8">
                <button
                  onClick={() => goToMobilePage(mobilePage - 1, true)}
                  className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all text-foreground shadow-sm group/nav"
                  aria-label="Previous products"
                >
                  <ChevronLeft size={19} className="group-hover/nav:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex gap-2.5">
                  {Array.from({ length: mobileTotalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToMobilePage(i, true)}
                      className={`h-1.5 rounded-full transition-all ${i === mobilePage ? "w-8 bg-secondary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                      aria-label={`Go to products page ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => goToMobilePage(mobilePage + 1, true)}
                  className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-all text-foreground shadow-sm group/nav"
                  aria-label="Next products"
                >
                  <ChevronRight size={19} className="group-hover/nav:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        ) : globalView === "grid" ? (
          <div
            className={`relative ${editor?.isEditMode ? "overflow-x-auto custom-scrollbar pb-4" : "overflow-hidden"}`}
            style={
              editor?.isEditMode
                ? undefined
                : {
                  maskImage:
                    "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
                }
            }
            onMouseEnter={() => {
              pausedRef.current = true;
            }}
            onMouseLeave={() => {
              pausedRef.current = false;
            }}
          >
            <div
              ref={trackRef}
              className="flex"
              style={{
                gap: GAP,
                willChange: "transform",
                paddingBottom: 12,
                paddingTop: 4,
                transform: editor?.isEditMode ? "none" : undefined,
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
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onEditTypo={setTypoFeature}
                />
              ))}
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
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onEditTypo={setTypoFeature}
                />
              </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection className="text-center mt-8">
          <div className="text-xs text-muted-foreground">
            {globalView === "grid" && <EditableText section="products" field="hover_hint" value={content.hover_hint || "Hover over any product to pause · "} />}
            <button
              onClick={scrollToContact}
              className="text-secondary underline underline-offset-2 hover:opacity-80"
            >
              <EditableText section="products" field="contact_us" value={content.contact_us || "Contact us"} />
            </button>{" "}
            <EditableText section="products" field="demo_text" value={content.demo_text || "for a personalised demo"} />
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
