import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { TypographyEditorModal, parseInlineStyles } from "./TypographyEditorModal";

// Re-export so components can import from one place
export { parseInlineStyles };

// Helper: returns true if the value has an inline color set via the Typography Editor
// Used by parent containers to avoid overriding embedded colors with a separate colorField
export function hasEmbeddedColor(value: string): boolean {
  if (!value) return false;
  return /\bcolor\s*:/.test(value);
}

interface LiveEditorContextType {
  isEditMode: boolean;
  activeElementId: string | null;
  setActiveElementId: (id: string | null) => void;
  onUpdate: (section: string, field: string, value: any, id?: string) => void;
  onHide: (section: string, id: string | undefined, currentVisibility: boolean) => void;
  onDelete: (section: string, id: string) => void;
  onAdd: (section: string) => void;
  onClone: (section: string, id: string) => void;
  onSave: (section: string, id?: string) => void;
  onPickImage: (section: string, field: string, id?: string) => void;
  onPickMultiImage: (section: string, field: string, id?: string) => void;
  onPickIcon: (section: string, field: string, id?: string) => void;
  onPickLink: (section: string, field: string, id?: string) => void;
  onPickColor: (section: string, field: string, id?: string) => void;
  onMove: (section: string, id: string, direction: "up" | "down" | "left" | "right") => void;
  onOpenCustomizer: () => void;
  handleSaveAll: () => void;
  handleDiscard: () => void;
  pendingChanges: Record<string, any>;
  openTypographyEditor: (section: string, field: string, currentValue: string, originalValue: string, id?: string, targetStyles?: Record<string, string>, colorField?: string) => void;
}

const LiveEditorContext = createContext<LiveEditorContextType | null>(null);

export const useLiveEditor = () => {
  const context = useContext(LiveEditorContext);
  return context;
};

export const LiveEditorProvider: React.FC<{
  children: React.ReactNode;
  onUpdate: any;
  onHide: any;
  onDelete: any;
  onAdd: any;
  onClone: any;
  onSave: any;
  onPickImage: any;
  onPickMultiImage: any;
  onPickIcon: any;
  onPickLink: any;
  onPickColor: any;
  onOpenCustomizer: any;
  handleSaveAll: any;
  handleDiscard: any;
  pendingChanges: Record<string, any>;
}> = ({
  children, onUpdate, onHide, onDelete, onAdd, onClone, onSave, onPickImage, onPickMultiImage, onPickIcon, onPickLink, onPickColor, onOpenCustomizer, handleSaveAll, handleDiscard, pendingChanges
}) => {
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [typoState, setTypoState] = useState<{
      isOpen: boolean;
      section: string;
      field: string;
      value: string;
      originalValue: string;
      id?: string;
      targetStyles?: Record<string, string>;
      colorField?: string;
    }>({
      isOpen: false,
      section: "",
      field: "",
      value: "",
      originalValue: "",
    });

    const openTypographyEditor = (section: string, field: string, value: string, originalValue: string, id?: string, targetStyles?: Record<string, string>, colorField?: string) => {
      setTypoState({
        isOpen: true,
        section,
        field,
        value,
        originalValue,
        id,
        targetStyles,
        colorField,
      });
    };

    return (
      <LiveEditorContext.Provider value={{
        isEditMode: true,
        activeElementId,
        setActiveElementId,
        onUpdate,
        onHide,
        onDelete,
        onAdd,
        onClone,
        onSave,
        onPickImage,
        onPickMultiImage,
        onPickIcon,
        onPickLink,
        onPickColor,
        onMove: (section, id, direction) => onUpdate(section, "reorder", direction, id),
        onOpenCustomizer,
        handleSaveAll,
        handleDiscard,
        pendingChanges,
        openTypographyEditor
      }}>
        <div className="live-editor-container">
          {children}
          <TypographyEditorModal
            isOpen={typoState.isOpen}
            section={typoState.section}
            field={typoState.field}
            initialValue={typoState.value}
            originalValue={typoState.originalValue}
            id={typoState.id}
            targetStyles={typoState.targetStyles}
            onClose={() => setTypoState(prev => ({ ...prev, isOpen: false }))}
            onSave={(sec, fld, val, itemId) => {
              onUpdate(sec, fld, val, itemId);
              // If the saved value has an inline color, sync the colorField too
              // so the parent element's style.color doesn't override the inline color
              if (typoState.colorField) {
                const colorMatch = val.match(/color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)/);
                const newColor = colorMatch ? colorMatch[1] : "";
                onUpdate(sec, typoState.colorField, newColor, itemId);
              }
            }}
            handleSaveAll={handleSaveAll}
            handleDiscard={handleDiscard}
            pendingChangesCount={Object.keys(pendingChanges || {}).length}
          />
        </div>
      </LiveEditorContext.Provider>
    );
  };

export const EditableText: React.FC<{
  section: string;
  field: string;
  value: string;
  id?: string;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
  colorField?: string;
  colorValue?: string;
  linkField?: string;
  hideColorPicker?: boolean;
  extraControls?: React.ReactNode;
  toolbarClassName?: string;
  toolbarVisibilityClassName?: string;
  style?: React.CSSProperties;
  onDoubleClick?: (e: React.MouseEvent) => void;
}> = ({
  section,
  field,
  value,
  id,
  className = "",
  tag: Tag = "span",
  colorField,
  colorValue,
  linkField,
  hideColorPicker = false,
  extraControls,
  toolbarClassName = "top-0 right-0",
  toolbarVisibilityClassName = "opacity-0 group-hover/edit:opacity-100",
  style = {},
  onDoubleClick
}) => {
    const editor = useLiveEditor();
    const [isEditing, setIsEditing] = useState(false);

    const draftKey = id ? `${section}:${id}:${field}` : `${section}:${field}`;
    const displayValue = editor?.pendingChanges?.[draftKey] ?? value;

    const [localValue, setLocalValue] = useState(displayValue);

    useEffect(() => {
      if (!isEditing) {
        setLocalValue(displayValue);
      }
    }, [displayValue, isEditing]);

    const colorDraftKey = id ? `${section}:${id}:${colorField}` : `${section}:${colorField}`;
    const pendingColor = colorField ? editor?.pendingChanges?.[colorDraftKey] : undefined;
    const finalColor = pendingColor ?? colorValue;

    if (!editor?.isEditMode) {
      // Extract inline styles from the saved <div style="..."> wrapper and apply them
      // directly to the Tag element to prevent layout issues (e.g., nested <div> inside <span>)
      const { styles: parsedStyles, innerHtml } = parseInlineStyles(displayValue);
      const hasStyles = Object.values(parsedStyles).some(v => !!v);

      const inlineStyle: React.CSSProperties = {};
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
      if (finalColor && !parsedStyles.textColor) inlineStyle.color = finalColor;

      const mergedStyle = { ...style, ...inlineStyle };
      // If the user specifically set a text color in the Typography Editor, 
      // we must remove any background gradient text-clip so the custom color shows!
      if (inlineStyle.color) {
        delete mergedStyle.WebkitTextFillColor;
        delete mergedStyle.WebkitBackgroundClip;
        delete mergedStyle.background;
        delete mergedStyle.backgroundImage;
      }
      return <Tag className={className} style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined} dangerouslySetInnerHTML={{ __html: hasStyles ? innerHtml : displayValue }} />;
    }

    const handleBlur = () => {
      setIsEditing(false);
      if (localValue !== value) {
        editor.onUpdate(section, field, localValue, id);
      }
    };

    return (
      <span className="relative group/edit">
        <Tag
          className={`${className} hover:outline hover:outline-1 hover:outline-secondary/30 cursor-text transition-all ${isEditing ? 'outline outline-2 outline-secondary ring-4 ring-secondary/10 px-1 rounded animate-pulse' : ''}`}
          style={isEditing ? {
            background: 'rgba(var(--background), 0.1)',
            WebkitTextFillColor: 'initial',
            WebkitBackgroundClip: 'border-box',
            ...style
          } : { ...(finalColor ? { color: finalColor } : {}), ...style }}
          contentEditable
          spellCheck={false}
          suppressContentEditableWarning
          onFocus={() => setIsEditing(true)}
          onBlur={handleBlur}
          onInput={(e) => setLocalValue(e.currentTarget.innerHTML || "")}
          onDoubleClick={onDoubleClick ? (e) => {
            // Blur the contentEditable and clear text selection before navigating
            (e.currentTarget as HTMLElement).blur();
            window.getSelection()?.removeAllRanges();
            onDoubleClick(e);
          } : undefined}
          dangerouslySetInnerHTML={{ __html: displayValue }}
        />

        {!isEditing && (
          <span
            className={`absolute ${toolbarClassName} flex items-center ${toolbarVisibilityClassName} transition-all bg-secondary text-secondary-foreground shadow-2xl rounded-[4px] z-[150] pointer-events-auto`}
            style={{ WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial', backgroundClip: 'initial', padding: '2px' }}
          >
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const target = e.currentTarget.closest('.group\\/edit')?.firstElementChild as HTMLElement;
                let targetStyles: Record<string, string> | undefined = undefined;
                if (target) {
                  const comp = window.getComputedStyle(target);

                  let realBg = comp.backgroundColor;
                  let currentElem: HTMLElement | null = target;
                  while (currentElem) {
                    const bg = window.getComputedStyle(currentElem).backgroundColor;
                    const rgbaMatch = bg.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/);
                    const alpha = rgbaMatch ? parseFloat(rgbaMatch[1]) : 1;

                    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && alpha > 0.2) {
                      realBg = bg;
                      break;
                    }
                    currentElem = currentElem.parentElement;
                  }

                  // Detect if element uses gradient-text / bg-clip-text
                  // In that case, getComputedStyle().color returns transparent which is useless
                  let detectedColor = comp.color;
                  const textFillColor = (comp as any).webkitTextFillColor || comp.getPropertyValue('-webkit-text-fill-color');
                  const isGradientText = textFillColor === 'transparent' ||
                    target.closest('.gradient-text') !== null ||
                    comp.getPropertyValue('background-clip') === 'text' ||
                    comp.getPropertyValue('-webkit-background-clip') === 'text';

                  if (isGradientText && colorValue) {
                    // Use the database color value instead of the transparent computed color
                    detectedColor = colorValue;
                  } else if (isGradientText) {
                    // No colorValue available — try to extract from the gradient background
                    // Check the target first, then the closest .gradient-text ancestor
                    let bgImg = comp.backgroundImage;
                    const gradientParent = target.closest('.gradient-text') as HTMLElement | null;
                    if (gradientParent && (!bgImg || bgImg === 'none')) {
                      bgImg = window.getComputedStyle(gradientParent).backgroundImage;
                    }
                    const gradientColorMatch = bgImg?.match(/rgb[a]?\([^)]+\)/);
                    if (gradientColorMatch) {
                      detectedColor = gradientColorMatch[0];
                    } else {
                      // Last resort: use the --secondary CSS variable color
                      const rootStyle = getComputedStyle(document.documentElement);
                      const secondaryHsl = rootStyle.getPropertyValue('--secondary').trim();
                      if (secondaryHsl) {
                        detectedColor = `hsl(${secondaryHsl})`;
                      }
                    }
                  }

                  targetStyles = {
                    fontFamily: comp.fontFamily,
                    fontSize: comp.fontSize,
                    fontWeight: comp.fontWeight,
                    lineHeight: comp.lineHeight,
                    letterSpacing: comp.letterSpacing,
                    textTransform: comp.textTransform,
                    textAlign: comp.textAlign,
                    textColor: detectedColor,
                    bgColor: realBg,
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
                editor.openTypographyEditor(section, field, displayValue, value, id, targetStyles, colorField);
              }}
              className="px-1 py-0.5 hover:bg-white/20 rounded-[2px] transition-colors flex items-center justify-center cursor-pointer [@media(hover:none)]:hidden"
              title="Edit Text Style"
            >
              <span className="font-serif font-extrabold text-[12px] leading-none text-white pr-[1px]">A</span>
            </span>
            {/* Color picker icon removed: Typography editor (A icon) handles text color now */}
            {linkField && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); editor.onPickLink(section, linkField, id); }}
                className="p-1 hover:bg-white/20 rounded-[2px] transition-colors text-white cursor-pointer"
                title="Change Link Target"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              </span>
            )}
            {extraControls}
          </span>
        )}
      </span>
    );
  };

export const useLiveEditorNavigation = () => {
  const editor = useLiveEditor();
  const isEdit = editor?.isEditMode;

  return (handler: () => void) => {
    return {
      onClick: (e: React.MouseEvent) => {
        if (isEdit) {
          e.preventDefault();
          e.stopPropagation();
          handler();
          return;
        }
        handler();
      },
      onDoubleClick: (e: React.MouseEvent) => {
        if (isEdit) {
          e.preventDefault();
          e.stopPropagation();
          handler();
        }
      }
    };
  };
};

export const EditorToolbar: React.FC<{
  section: string;
  id?: string;
  isVisible?: boolean;
  canHide?: boolean;
  canDelete?: boolean;
  canClone?: boolean;
  canAdd?: boolean;
  canMove?: boolean;
  moveDirections?: ("up" | "down" | "left" | "right")[];
  imageField?: string;
  imageField2?: string;
  multiImageField?: string;
  iconField?: string;
  linkField?: string;
  linkField2?: string;
  colorField?: string;
  colorField2?: string;
  className?: string;
  group?: string;
  onMove?: (direction: "up" | "down" | "left" | "right") => void;
  onToggle?: () => void;
  onDelete?: () => void;
}> = ({ section, id, isVisible = true, canHide = true, canDelete = true, canClone = true, canAdd = false, canMove = false, moveDirections = ["up", "down", "left", "right"], imageField, imageField2, multiImageField, iconField, linkField, linkField2, colorField, colorField2, className = "", group = "item", onMove, onToggle, onDelete }) => {
  const editor = useLiveEditor();
  if (!editor?.isEditMode) return null;

  const isSmall = className.includes("scale-75") || className.includes("scale-[0.75]") || className.includes("scale-50");
  const btnPadding = isSmall ? "p-1" : "p-1.5";

  const toolbarKey = `toolbar:${section}:${id || "__section"}`;
  const isTouchActive = editor.activeElementId === toolbarKey;
  const hoverClasses = !group
    ? "opacity-100 scale-100"
    : group === "item"
      ? "group-hover/item:opacity-100 group-hover/item:scale-100"
      : `group-hover/${group}:opacity-100 group-hover/${group}:scale-100`;

  return (
    <div className={`absolute z-[100] flex items-center gap-3 ${group && !isTouchActive ? "opacity-0" : "opacity-100"} ${isTouchActive ? "scale-100" : "scale-90"} ${hoverClasses} transition-all duration-300 bg-card/95 backdrop-blur-md border border-border/50 ${isSmall ? "p-1 rounded-lg" : "p-1.5 rounded-xl"} shadow-2xl origin-top-right ${className || "top-2 right-2"}`}>
      {imageField && (
        <button onClick={() => editor.onPickImage(section, imageField, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
        </button>
      )}

      {imageField2 && (
        <button onClick={() => editor.onPickImage(section, imageField2, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Secondary Image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
        </button>
      )}

      {multiImageField && (
        <button onClick={() => editor.onPickMultiImage(section, multiImageField, id)} className={`${btnPadding} hover:bg-secondary/20 rounded-lg text-secondary transition-all active:scale-90`} title="Pick Multiple Images">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="14" height="14" rx="2" ry="2" />
            <path d="M10 2h10a2 2 0 0 1 2 2v10" opacity="0.6" />
            <path d="M6 10h6M6 14h6" strokeWidth="2" opacity="0.4" />
          </svg>
        </button>
      )}

      {iconField && (
        <button onClick={() => editor.onPickIcon(section, iconField, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /></svg>
        </button>
      )}

      {linkField && (
        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); editor.onPickLink(section, linkField, id); }} className={`${btnPadding} hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors`} title="URL Picker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
      )}

      {linkField2 && (
        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); editor.onPickLink(section, linkField2, id); }} className={`${btnPadding} hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors`} title="URL Picker 2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
      )}

      {colorField && (
        <button onClick={() => editor.onPickColor(section, colorField, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Color">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
        </button>
      )}

      {colorField2 && (
        <button onClick={() => editor.onPickColor(section, colorField2, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Color 2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
        </button>
      )}

      {canHide && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) onToggle();
            else editor.onHide(section, id, isVisible);
          }}
          className={`${btnPadding} rounded-lg transition-colors ${isVisible ? "hover:bg-amber-500/10 text-amber-500" : "bg-amber-500 text-white"}`}
          title={isVisible ? "Hide Item" : "Show Item"}
        >
          {isVisible ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          )}
        </button>
      )}

      {canClone && id && (
        <button onClick={() => editor.onClone(section, id)} className={`${btnPadding} hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors`} title="Clone Item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        </button>
      )}

      {canDelete && (id || onDelete) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onDelete) onDelete();
            else editor.onDelete(section, id);
          }}
          className={`${btnPadding} hover:bg-destructive/10 rounded-lg text-destructive transition-colors`}
          title="Delete Item"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
        </button>
      )}

      {canMove && id && (
        <div className="flex items-center gap-0.5 bg-background/50 rounded-lg p-0.5 border border-border/50">
          {moveDirections.includes("up") && (
            <button
              onClick={(e) => { e.stopPropagation(); if (onMove) onMove("up"); else editor.onMove(section, id, "up"); }}
              className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors"
              title="Move Up"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
            </button>
          )}
          {moveDirections.includes("down") && (
            <button
              onClick={(e) => { e.stopPropagation(); if (onMove) onMove("down"); else editor.onMove(section, id, "down"); }}
              className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors"
              title="Move Down"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          )}
          {moveDirections.includes("left") && (
            <button
              onClick={(e) => { e.stopPropagation(); if (onMove) onMove("left"); else editor.onMove(section, id, "left"); }}
              className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors"
              title="Move Left"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          {moveDirections.includes("right") && (
            <button
              onClick={(e) => { e.stopPropagation(); if (onMove) onMove("right"); else editor.onMove(section, id, "right"); }}
              className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors"
              title="Move Right"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
        </div>
      )}

      {canAdd && (
        <button onClick={() => editor.onAdd(section)} className="p-1.5 bg-secondary/10 hover:bg-secondary/20 rounded-lg text-secondary transition-all shadow-sm scale-110" title="Add New Item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      )}
    </div>
  );
};

export const SectionHeaderToolbar: React.FC<{
  section: string;
  targetSection?: string;
  isVisible?: boolean;
  className?: string;
  onToggle?: () => void;
}> = ({ section, targetSection, isVisible = true, className = "top-0 right-0", onToggle }) => {
  const editor = useLiveEditor();
  if (!editor?.isEditMode) return null;

  const isAbsolute = !className.includes("relative") && !className.includes("static") && !className.includes("inline-");

  return (
    <div className={`${isAbsolute ? "absolute" : ""} z-[100] flex items-center gap-2 ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); editor.onAdd(targetSection || section); }}
        className="py-1.5 px-3 bg-secondary text-secondary-foreground rounded-lg shadow-xl border border-secondary/20 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        <span>Add {section === 'our_network' ? 'Network' : section === 'our_products' ? 'Product' : section === 'client_logos' ? 'Client' : section === 'career_jobs' ? 'Job' : section === 'global_presence' ? 'Location' : section.charAt(0).toUpperCase() + section.slice(1)}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onToggle) onToggle();
          else editor.onHide(section, undefined, isVisible);
        }}
        className={`p-1.5 rounded-lg shadow-xl border border-border/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${isVisible ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}
        title={isVisible ? "Hide Section" : "Show Section"}
      >
        {isVisible ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
        )}
      </button>
    </div>
  );
};
