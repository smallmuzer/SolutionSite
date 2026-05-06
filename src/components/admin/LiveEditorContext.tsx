import React, { createContext, useContext, useState } from "react";
import { toast } from "sonner";

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
  onPickColor: (section: string, field: string, id?: string) => void;
  onMove: (section: string, id: string, direction: "up" | "down") => void;
  onOpenCustomizer: () => void;
  handleSaveAll: () => void;
  handleDiscard: () => void;
  pendingChanges: Record<string, any>;
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
      pendingChanges
    }}>
      <div className="live-editor-container">
        {children}
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
  hideColorPicker?: boolean;
}> = ({ section, field, value, id, className = "", tag: Tag = "span", colorField, hideColorPicker = false }) => {
  const editor = useLiveEditor();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const draftKey = id ? `${section}:${id}:${field}` : `${section}:${field}`;
  const displayValue = editor?.pendingChanges?.[draftKey] ?? value;

  const colorDraftKey = id ? `${section}:${id}:${colorField}` : `${section}:${colorField}`;
  const pendingColor = colorField ? editor?.pendingChanges?.[colorDraftKey] : undefined;

  if (!editor?.isEditMode) {
    return <Tag className={className} style={pendingColor ? { color: pendingColor } : undefined}>{displayValue}</Tag>;
  }

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      editor.onUpdate(section, field, localValue, id);
    }
  };

  return (
    <span className="relative inline-block group/edit">
      <Tag
        className={`${className} hover:outline hover:outline-1 hover:outline-secondary/30 cursor-text transition-all ${isEditing ? 'outline outline-2 outline-secondary ring-4 ring-secondary/10' : ''}`}
        style={pendingColor ? { color: pendingColor } : undefined}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onInput={(e) => setLocalValue(e.currentTarget.textContent || "")}
      >
        {displayValue}
      </Tag>
      
      {!isEditing && (
        <span className="absolute -top-6 left-0 flex items-center gap-1 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-card/90 backdrop-blur-sm border border-border/50 p-1 rounded-lg shadow-xl z-50 pointer-events-auto">
          {colorField && !hideColorPicker && (
            <button 
              onClick={(e) => { e.stopPropagation(); editor.onPickColor(section, colorField, id); }}
              className="p-1 hover:bg-secondary/10 rounded-md text-secondary transition-colors"
              title="Change Color"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </button>
          )}
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
  imageField?: string;
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
}> = ({ section, id, isVisible = true, canHide = true, canDelete = true, canClone = true, canAdd = false, canMove = false, imageField, multiImageField, iconField, linkField, linkField2, colorField, colorField2, className = "", group = "item", onMove, onToggle, onDelete }) => {
  const editor = useLiveEditor();
  if (!editor?.isEditMode) return null;

  const isSmall = className.includes("scale-75") || className.includes("scale-[0.75]") || className.includes("scale-50");
  const btnPadding = isSmall ? "p-1" : "p-1.5";

  const hoverClasses = !group 
    ? "opacity-100 scale-100" 
    : group === "item" 
      ? "group-hover/item:opacity-100 group-hover/item:scale-100" 
      : `group-hover/${group}:opacity-100 group-hover/${group}:scale-100`;

  return (
    <div className={`absolute z-[100] flex items-center gap-1 ${group ? "opacity-0" : "opacity-100"} ${hoverClasses} transition-all duration-300 bg-card/95 backdrop-blur-md border border-border/50 ${isSmall ? "p-1 rounded-lg" : "p-1.5 rounded-xl"} shadow-2xl scale-90 origin-top-right ${className || "top-2 right-2"}`}>
      {imageField && (
        <button onClick={() => editor.onPickImage(section, imageField, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
      )}

      {multiImageField && (
        <button onClick={() => editor.onPickMultiImage(section, multiImageField, id)} className={`${btnPadding} hover:bg-secondary/20 rounded-lg text-secondary transition-all active:scale-90`} title="Pick Multiple Images">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="14" height="14" rx="2" ry="2"/>
            <path d="M10 2h10a2 2 0 0 1 2 2v10" opacity="0.6"/>
            <path d="M6 10h6M6 14h6" strokeWidth="2" opacity="0.4"/>
          </svg>
        </button>
      )}
      
      {iconField && (
        <button onClick={() => editor.onPickIcon(section, iconField, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
        </button>
      )}

      {linkField && (
        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); editor.onPickLink(section, linkField, id); }} className={`${btnPadding} hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors`} title="URL Picker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>
      )}

      {linkField2 && (
        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); editor.onPickLink(section, linkField2, id); }} className={`${btnPadding} hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors`} title="URL Picker 2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>
      )}

      {colorField && (
        <button onClick={() => editor.onPickColor(section, colorField, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Color">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </button>
      )}

      {colorField2 && (
        <button onClick={() => editor.onPickColor(section, colorField2, id)} className={`${btnPadding} hover:bg-secondary/10 rounded-lg text-secondary transition-colors`} title="Pick Color 2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          )}
        </button>
      )}
      
      {canClone && id && (
        <button onClick={() => editor.onClone(section, id)} className={`${btnPadding} hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors`} title="Clone Item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      )}
      
      {canMove && id && (
        <div className="flex items-center gap-0.5 bg-background/50 rounded-lg p-0.5 border border-border/50">
          <button 
            onClick={(e) => { e.stopPropagation(); if (onMove) onMove("up"); else editor.onMove(section, id, "up"); }} 
            className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors" 
            title="Move Up"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onMove) onMove("down"); else editor.onMove(section, id, "down"); }} 
            className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors" 
            title="Move Down"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onMove) onMove("left"); else editor.onMove(section, id, "left"); }} 
            className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors" 
            title="Move Left"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onMove) onMove("right"); else editor.onMove(section, id, "right"); }} 
            className="p-0.5 hover:bg-secondary/10 rounded text-secondary transition-colors" 
            title="Move Right"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}

      {canAdd && (
        <button onClick={() => editor.onAdd(section)} className="p-1.5 bg-secondary/10 hover:bg-secondary/20 rounded-lg text-secondary transition-all shadow-sm scale-110" title="Add New Item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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

  return (
    <div className={`absolute z-[100] flex items-center gap-2 ${className}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); editor.onAdd(targetSection || section); }}
        className="p-2 bg-secondary text-secondary-foreground rounded-full shadow-xl border border-secondary/20 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 px-4"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span className="text-[0.625rem] font-bold uppercase tracking-widest">Add {section}</span>
      </button>
      
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          if (onToggle) onToggle();
          else editor.onHide(section, undefined, isVisible); 
        }}
        className={`p-2 rounded-full shadow-xl border border-border/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center ${isVisible ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}
        title={isVisible ? "Hide Section" : "Show Section"}
      >
        {isVisible ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        )}
      </button>
    </div>
  );
};
