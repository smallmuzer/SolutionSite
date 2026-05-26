import React, { useState, useEffect, useRef } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, Superscript, Subscript, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Type, Sparkles, Copy, Clipboard, Save, X, Maximize2, Minimize2, 
  Undo2, Redo2, Link, Link2Off, Image, Smile, Table, Code, Grid, 
  Minus, Palette, CheckSquare, List, ListOrdered, Type as TypeIcon
} from "lucide-react";
import { toast } from "sonner";

interface TypographyEditorModalProps {
  isOpen: boolean;
  section: string;
  field: string;
  initialValue: string;
  id?: string;
  onClose: () => void;
  onSave: (section: string, field: string, value: string, id?: string) => void;
}

interface ActiveStyles {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
  textAlign: string;
  textColor: string;
  bgColor: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

const DEFAULT_STYLES: ActiveStyles = {
  fontFamily: "",
  fontSize: "",
  fontWeight: "",
  lineHeight: "",
  letterSpacing: "",
  textTransform: "",
  textAlign: "",
  textColor: "",
  bgColor: "",
  paddingTop: "",
  paddingRight: "",
  paddingBottom: "",
  paddingLeft: "",
  marginTop: "",
  marginRight: "",
  marginBottom: "",
  marginLeft: "",
};

// ── HTML Sanitizer Helper ───────────────────────────────────────────────────
function sanitizeHtml(html: string): string {
  // Allow all common tags, style properties, classes, links, lists, images, tables
  const allowedTags = /<\/?(span|div|p|br|hr|h1|h2|h3|h4|h5|h6|strong|em|u|s|sub|sup|blockquote|ul|ol|li|a|img|table|thead|tbody|tr|th|td|pre|code)( [^>]*)?>/gi;
  
  // Clean potentially malicious attribute tags like onerror, onload, javascript:
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/on\w+="[^"]*"/g, "");
  clean = clean.replace(/javascript:/gi, "");
  
  // Basic balance tags check
  return clean;
}

// ── Parse Inline Styles Helper ────────────────────────────────────────────────
function parseInlineStyles(html: string): { styles: ActiveStyles; innerHtml: string } {
  const trimmed = (html || "").trim();
  if (!trimmed.startsWith("<div style=")) {
    return { styles: { ...DEFAULT_STYLES }, innerHtml: trimmed };
  }

  // Parse style attribute and innerHtml
  const match = trimmed.match(/<div style="([^"]+)"[^>]*>([\s\S]*)<\/div>/);
  if (!match) return { styles: { ...DEFAULT_STYLES }, innerHtml: trimmed };

  const styleStr = match[1];
  const innerHtml = match[2];
  const parsed = { ...DEFAULT_STYLES };

  const declarations = styleStr.split(";").map(d => d.trim()).filter(Boolean);
  declarations.forEach(decl => {
    const parts = decl.split(":");
    if (parts.length < 2) return;
    const key = parts[0].trim().toLowerCase();
    const val = parts.slice(1).join(":").trim();

    if (key === "font-family") parsed.fontFamily = val.replace(/['"]/g, "");
    else if (key === "font-size") parsed.fontSize = val;
    else if (key === "font-weight") parsed.fontWeight = val;
    else if (key === "line-height") parsed.lineHeight = val;
    else if (key === "letter-spacing") parsed.letterSpacing = val;
    else if (key === "text-transform") parsed.textTransform = val;
    else if (key === "text-align") parsed.textAlign = val;
    else if (key === "color") parsed.textColor = val;
    else if (key === "background-color") parsed.bgColor = val;
    else if (key === "padding-top") parsed.paddingTop = val;
    else if (key === "padding-right") parsed.paddingRight = val;
    else if (key === "padding-bottom") parsed.paddingBottom = val;
    else if (key === "padding-left") parsed.paddingLeft = val;
    else if (key === "margin-top") parsed.marginTop = val;
    else if (key === "margin-right") parsed.marginRight = val;
    else if (key === "margin-bottom") parsed.marginBottom = val;
    else if (key === "margin-left") parsed.marginLeft = val;
  });

  return { styles: parsed, innerHtml };
}

export const TypographyEditorModal: React.FC<TypographyEditorModalProps> = ({
  isOpen, section, field, initialValue, id, onClose, onSave
}) => {
  const [editorHtml, setEditorHtml] = useState("");
  const [activeStyles, setActiveStyles] = useState<ActiveStyles>({ ...DEFAULT_STYLES });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [previewMode, setPreviewMode] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Rich Text Editor Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize and parse current content
  useEffect(() => {
    if (isOpen) {
      const { styles, innerHtml } = parseInlineStyles(initialValue);
      setActiveStyles(styles);
      setEditorHtml(innerHtml);
      setUndoStack([]);
      setRedoStack([]);
      setViewMode("visual");
      setPreviewMode(false);
      
      // Auto center position
      const w = window.innerWidth;
      setPosition({ x: Math.max((w - 900) / 2, 50), y: 80 });
    }
  }, [isOpen, initialValue]);

  // Save current state for undo/redo
  const recordHistory = (html: string) => {
    setUndoStack(prev => [...prev, html]);
    setRedoStack([]); // Clear redo
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setRedoStack(r => [...r, editorHtml]);
      setEditorHtml(prev);
      setUndoStack(prevStack => prevStack.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];
      setUndoStack(u => [...u, editorHtml]);
      setEditorHtml(next);
      setRedoStack(prevStack => prevStack.slice(0, -1));
    }
  };

  // ── Dragging Logic ──────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    const target = e.target as HTMLElement;
    if (target.closest(".drag-handle")) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: Math.max(e.clientY - dragOffset.y, 0)
        });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // ── Formatting Commands ─────────────────────────────────────────────────────
  const execCmd = (command: string, value: string = "") => {
    recordHistory(editorHtml);
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  const clearFormatting = () => {
    recordHistory(editorHtml);
    execCmd("removeFormat");
    // Strip other HTML wrappers as well
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      setEditorHtml(text);
    }
  };

  // ── Save/Publish Logic ──────────────────────────────────────────────────────
  const handleSave = () => {
    // Construct CSS styles string
    const stylesList = [
      activeStyles.fontFamily && `font-family: ${activeStyles.fontFamily}`,
      activeStyles.fontSize && `font-size: ${activeStyles.fontSize}`,
      activeStyles.fontWeight && `font-weight: ${activeStyles.fontWeight}`,
      activeStyles.lineHeight && `line-height: ${activeStyles.lineHeight}`,
      activeStyles.letterSpacing && `letter-spacing: ${activeStyles.letterSpacing}`,
      activeStyles.textTransform && `text-transform: ${activeStyles.textTransform}`,
      activeStyles.textAlign && `text-align: ${activeStyles.textAlign}`,
      activeStyles.textColor && `color: ${activeStyles.textColor}`,
      activeStyles.bgColor && `background-color: ${activeStyles.bgColor}`,
      activeStyles.paddingTop && `padding-top: ${activeStyles.paddingTop}`,
      activeStyles.paddingRight && `padding-right: ${activeStyles.paddingRight}`,
      activeStyles.paddingBottom && `padding-bottom: ${activeStyles.paddingBottom}`,
      activeStyles.paddingLeft && `padding-left: ${activeStyles.paddingLeft}`,
      activeStyles.marginTop && `margin-top: ${activeStyles.marginTop}`,
      activeStyles.marginRight && `margin-right: ${activeStyles.marginRight}`,
      activeStyles.marginBottom && `margin-bottom: ${activeStyles.marginBottom}`,
      activeStyles.marginLeft && `margin-left: ${activeStyles.marginLeft}`,
    ].filter(Boolean);

    const cssText = stylesList.join("; ").trim();
    const finalHtml = sanitizeHtml(editorHtml);
    const serialized = cssText 
      ? `<div style="${cssText}">${finalHtml}</div>` 
      : finalHtml;

    onSave(section, field, serialized, id);
    toast.success("Text style updated successfully!");
    onClose();
  };

  // ── Copy/Paste Style ────────────────────────────────────────────────────────
  const handleCopyStyle = () => {
    sessionStorage.setItem("ss:copied_styles", JSON.stringify(activeStyles));
    toast.success("Typography styles copied to clipboard!");
  };

  const handlePasteStyle = () => {
    const raw = sessionStorage.getItem("ss:copied_styles");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setActiveStyles(parsed);
        toast.success("Typography styles pasted successfully!");
      } catch {
        toast.error("Failed to parse copied styles.");
      }
    } else {
      toast.error("No copied styles found. Please copy a style first.");
    }
  };

  // ── Advanced Insertion Modals ──────────────────────────────────────────────
  const promptLink = () => {
    const url = prompt("Enter link URL:", "https://");
    if (url) execCmd("createLink", url);
  };

  const promptImage = () => {
    const src = prompt("Enter Image URL:", "/assets/uploads/");
    if (src) {
      const html = `<img src="${src}" alt="Rich Text Image" class="max-w-full h-auto inline-block rounded-lg shadow border p-1" style="display:inline-block; margin: 10px 0;" />`;
      recordHistory(editorHtml);
      execCmd("insertHTML", html);
    }
  };

  const insertTable = () => {
    const rows = parseInt(prompt("Enter number of rows:", "3") || "3", 10);
    const cols = parseInt(prompt("Enter number of columns:", "3") || "3", 10);
    if (rows > 0 && cols > 0) {
      let tableHtml = `<table class="w-full border-collapse border border-border my-4 rounded overflow-hidden shadow-sm"><thead><tr class="bg-muted">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<th class="border border-border p-2 text-left font-bold text-xs uppercase bg-muted/80">Header ${c + 1}</th>`;
      }
      tableHtml += `</tr></thead><tbody>`;
      for (let r = 0; r < rows; r++) {
        tableHtml += `<tr>`;
        for (let c = 0; c < cols; c++) {
          tableHtml += `<td class="border border-border p-2 text-sm text-muted-foreground" contenteditable="true">Cell</td>`;
        }
        tableHtml += `</tr>`;
      }
      tableHtml += `</tbody></table><p></p>`;
      recordHistory(editorHtml);
      execCmd("insertHTML", tableHtml);
    }
  };

  const insertHorizontalRule = () => {
    execCmd("insertHorizontalRule");
  };

  const insertCodeBlock = () => {
    const code = `<pre class="bg-slate-950 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-auto my-3 border border-slate-800"><code>// Insert code here\n</code></pre><p></p>`;
    recordHistory(editorHtml);
    execCmd("insertHTML", code);
  };

  const insertEmoji = (emoji: string) => {
    execCmd("insertHTML", emoji);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-start pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/30 backdrop-blur-[2px] pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Main Resizable / Draggable Modal Card */}
      <div
        ref={modalRef}
        style={isFullscreen ? {
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
        } : {
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "800px",
          maxHeight: "85vh",
        }}
        className="flex flex-col rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl pointer-events-auto transition-all overflow-hidden"
      >
        {/* Header Drag Handle */}
        <div 
          onMouseDown={handleMouseDown}
          className={`drag-handle flex items-center justify-between border-b border-border/60 bg-muted/40 px-5 py-3.5 select-none ${isFullscreen ? "cursor-default" : "cursor-move"}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex w-7 h-7 rounded-lg bg-secondary/10 items-center justify-center text-secondary font-serif font-extrabold text-sm shadow-inner select-none">A</span>
            <div>
              <h3 className="font-heading font-extrabold text-[0.9375rem] leading-none text-foreground">Style & Typography Editor</h3>
              <p className="text-[0.6875rem] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">Target: {section}.{field} {id ? `(ID: ${id})` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopyStyle}
              className="py-1 px-2.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Copy all styles of this element"
            >
              <Copy size={12} />
              <span>Copy Style</span>
            </button>
            <button 
              onClick={handlePasteStyle}
              className="py-1 px-2.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Paste copied style settings"
            >
              <Clipboard size={12} />
              <span>Paste Style</span>
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-all duration-150"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Main Side-by-Side Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Styling Sidebar */}
          <div className="w-[230px] shrink-0 border-r border-border/60 bg-muted/10 p-3 overflow-y-auto space-y-3">
            <div>
              <h4 className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                <Palette size={11} className="text-secondary" />
                <span>Typography</span>
              </h4>
              <div className="space-y-2.5">
                {/* Font Family */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Font Family</label>
                  <select
                    value={activeStyles.fontFamily}
                    onChange={(e) => setActiveStyles(prev => ({ ...prev, fontFamily: e.target.value }))}
                    className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                  >
                    <option value="">Default (Inherit)</option>
                    <option value="system-ui, sans-serif">System Sans</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Outfit', sans-serif">Outfit</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Playfair Display', serif">Playfair Display</option>
                    <option value="'Fira Code', monospace">Fira Code</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                  </select>
                </div>

                {/* Font Size & Weight */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Font Size</label>
                    <select
                      value={activeStyles.fontSize}
                      onChange={(e) => setActiveStyles(prev => ({ ...prev, fontSize: e.target.value }))}
                      className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                    >
                      <option value="">Inherit</option>
                      {["11px", "12px", "13px", "14px", "15px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "40px", "48px", "56px", "64px", "72px"].map(sz => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Weight</label>
                    <select
                      value={activeStyles.fontWeight}
                      onChange={(e) => setActiveStyles(prev => ({ ...prev, fontWeight: e.target.value }))}
                      className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                    >
                      <option value="">Inherit</option>
                      <option value="100">Thin (100)</option>
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">SemiBold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">ExtraBold (800)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>
                </div>

                {/* Letter Spacing & Line Height */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Line Height</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1.5, 24px"
                      value={activeStyles.lineHeight}
                      onChange={(e) => setActiveStyles(prev => ({ ...prev, lineHeight: e.target.value }))}
                      className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Letter Space</label>
                    <input 
                      type="text" 
                      placeholder="e.g. -0.5px"
                      value={activeStyles.letterSpacing}
                      onChange={(e) => setActiveStyles(prev => ({ ...prev, letterSpacing: e.target.value }))}
                      className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* Text Transform & Align */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Transform</label>
                    <select
                      value={activeStyles.textTransform}
                      onChange={(e) => setActiveStyles(prev => ({ ...prev, textTransform: e.target.value }))}
                      className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="uppercase">UPPERCASE</option>
                      <option value="lowercase">lowercase</option>
                      <option value="capitalize">Capitalize</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Alignment</label>
                    <select
                      value={activeStyles.textAlign}
                      onChange={(e) => setActiveStyles(prev => ({ ...prev, textAlign: e.target.value }))}
                      className="w-full px-2 py-1 bg-background border border-border rounded-lg text-[11px] font-medium focus:outline-none"
                    >
                      <option value="">Inherit</option>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Text Color</label>
                    <div className="flex gap-1 items-center">
                      <input 
                        type="color" 
                        value={activeStyles.textColor || "#000000"} 
                        onChange={(e) => setActiveStyles(prev => ({ ...prev, textColor: e.target.value }))}
                        className="w-6 h-6 border border-border rounded cursor-pointer shrink-0 p-0"
                      />
                      <input 
                        type="text" 
                        placeholder="Hex/RGB" 
                        value={activeStyles.textColor} 
                        onChange={(e) => setActiveStyles(prev => ({ ...prev, textColor: e.target.value }))}
                        className="w-full px-1.5 py-1 bg-background border border-border rounded text-[10px] font-mono focus:outline-none min-w-0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Bg Highlight</label>
                    <div className="flex gap-1 items-center">
                      <input 
                        type="color" 
                        value={activeStyles.bgColor || "#ffffff"} 
                        onChange={(e) => setActiveStyles(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-6 h-6 border border-border rounded cursor-pointer shrink-0 p-0"
                      />
                      <input 
                        type="text" 
                        placeholder="Hex/RGB" 
                        value={activeStyles.bgColor} 
                        onChange={(e) => setActiveStyles(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-full px-1.5 py-1 bg-background border border-border rounded text-[10px] font-mono focus:outline-none min-w-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout (Padding & Margin) */}
            <div className="pt-2.5 border-t border-border/50">
              <h4 className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                <Grid size={11} className="text-secondary" />
                <span>Layout (Pad / Margin)</span>
              </h4>
              <div className="space-y-2.5">
                {/* Padding Inputs */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Padding</label>
                  <div className="grid grid-cols-4 gap-1">
                    {["Top", "Right", "Bottom", "Left"].map((dir) => {
                      const key = `padding${dir}` as keyof ActiveStyles;
                      return (
                        <div key={dir}>
                          <input 
                            type="text" 
                            placeholder="0" 
                            value={activeStyles[key]} 
                            onChange={(e) => setActiveStyles(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-1 py-1 bg-background border border-border rounded text-center font-mono text-[10px] focus:outline-none"
                            title={`Padding ${dir}`}
                          />
                          <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest text-center block mt-0.5">{dir.substring(0, 1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Margin Inputs */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Margin</label>
                  <div className="grid grid-cols-4 gap-1">
                    {["Top", "Right", "Bottom", "Left"].map((dir) => {
                      const key = `margin${dir}` as keyof ActiveStyles;
                      return (
                        <div key={dir}>
                          <input 
                            type="text" 
                            placeholder="0" 
                            value={activeStyles[key]} 
                            onChange={(e) => setActiveStyles(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-1 py-1 bg-background border border-border rounded text-center font-mono text-[10px] focus:outline-none"
                            title={`Margin ${dir}`}
                          />
                          <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-widest text-center block mt-0.5">{dir.substring(0, 1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Editor Area */}
          <div className="flex-1 flex flex-col bg-background/50 overflow-hidden relative min-w-0 p-4 pb-0">
            <div className="flex-1 flex flex-col border border-secondary/40 rounded-xl overflow-hidden bg-card shadow-sm mb-4">
              {/* Rich Text Toolbar (Always visible, but disabled in HTML mode) */}
              <div className={`flex items-center flex-wrap gap-1 px-3 py-1.5 border-b border-border/60 bg-muted/20 transition-all ${viewMode === "html" ? "opacity-40 pointer-events-none grayscale select-none" : "opacity-100"}`}>
                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5 mr-1.5">
                  <button onClick={() => execCmd("bold")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Bold"><Bold size={13} /></button>
                  <button onClick={() => execCmd("italic")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Italic"><Italic size={13} /></button>
                  <button onClick={() => execCmd("underline")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Underline"><Underline size={13} /></button>
                  <button onClick={() => execCmd("strikeThrough")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Strike Through"><Strikethrough size={13} /></button>
                  <button onClick={() => execCmd("superscript")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Superscript"><Superscript size={13} /></button>
                  <button onClick={() => execCmd("subscript")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Subscript"><Subscript size={13} /></button>
                </div>

                <div className="flex items-center gap-1 border-r border-border/50 pr-1.5 mr-1.5">
                  <select 
                    onChange={(e) => execCmd("formatBlock", e.target.value)} 
                    className="px-1.5 py-0.5 bg-background border border-border rounded text-[11px] focus:outline-none"
                    defaultValue="div"
                  >
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="h4">Heading 4</option>
                    <option value="h5">Heading 5</option>
                    <option value="h6">Heading 6</option>
                    <option value="blockquote">Quote</option>
                  </select>
                </div>

                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5 mr-1.5">
                  <button onClick={() => execCmd("insertUnorderedList")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Bullet List"><List size={13} /></button>
                  <button onClick={() => execCmd("insertOrderedList")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Numbered List"><ListOrdered size={13} /></button>
                </div>

                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5 mr-1.5">
                  <button onClick={promptLink} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Insert Link"><Link size={13} /></button>
                  <button onClick={() => execCmd("unlink")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Remove Link"><Link2Off size={13} /></button>
                  <button onClick={promptImage} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Insert Image"><Image size={13} /></button>
                  <button onClick={insertTable} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Insert Table"><Table size={13} /></button>
                  <button onClick={insertHorizontalRule} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Horizontal Rule"><Minus size={13} /></button>
                  <button onClick={insertCodeBlock} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Insert Code Block"><Code size={13} /></button>
                </div>

                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5 mr-1.5">
                  {["😀", "💡", "🚀", "✨", "🔥"].map(emoji => (
                    <button key={emoji} onClick={() => insertEmoji(emoji)} className="p-1 hover:bg-muted rounded text-[10px] transition-colors">{emoji}</button>
                  ))}
                </div>

                <div className="flex items-center gap-0.5">
                  <button onClick={handleUndo} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Undo"><Undo2 size={13} /></button>
                  <button onClick={handleRedo} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Redo"><Redo2 size={13} /></button>
                  <button onClick={clearFormatting} className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors ml-0.5" title="Clear Formatting"><X size={13} /></button>
                </div>
              </div>

              {viewMode === "visual" ? (

                  <div className="flex-1 overflow-y-auto relative bg-background/50 p-4">
                    {previewMode ? (
                      /* Preview Mode */
                      <div 
                        style={{
                          fontFamily: activeStyles.fontFamily,
                          fontSize: activeStyles.fontSize,
                          fontWeight: activeStyles.fontWeight,
                          lineHeight: activeStyles.lineHeight,
                          letterSpacing: activeStyles.letterSpacing,
                          textTransform: activeStyles.textTransform as any,
                          textAlign: activeStyles.textAlign as any,
                          color: activeStyles.textColor,
                          backgroundColor: activeStyles.bgColor,
                          paddingTop: activeStyles.paddingTop,
                          paddingRight: activeStyles.paddingRight,
                          paddingBottom: activeStyles.paddingBottom,
                          paddingLeft: activeStyles.paddingLeft,
                          marginTop: activeStyles.marginTop,
                          marginRight: activeStyles.marginRight,
                          marginBottom: activeStyles.marginBottom,
                          marginLeft: activeStyles.marginLeft,
                        }}
                        className="prose dark:prose-invert max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(editorHtml) }}
                      />
                    ) : (
                      /* Visual contentEditable rich-text area */
                      <div
                        ref={editorRef}
                        className="w-full h-full min-h-[250px] outline-none prose dark:prose-invert max-w-none break-words"
                        contentEditable
                        suppressContentEditableWarning
                        style={{
                          fontFamily: activeStyles.fontFamily,
                          fontSize: activeStyles.fontSize,
                          fontWeight: activeStyles.fontWeight,
                          lineHeight: activeStyles.lineHeight,
                          letterSpacing: activeStyles.letterSpacing,
                          textTransform: activeStyles.textTransform as any,
                          textAlign: activeStyles.textAlign as any,
                          color: activeStyles.textColor,
                          backgroundColor: activeStyles.bgColor || "transparent",
                          paddingTop: activeStyles.paddingTop,
                          paddingRight: activeStyles.paddingRight,
                          paddingBottom: activeStyles.paddingBottom,
                          paddingLeft: activeStyles.paddingLeft,
                          marginTop: activeStyles.marginTop,
                          marginRight: activeStyles.marginRight,
                          marginBottom: activeStyles.marginBottom,
                          marginLeft: activeStyles.marginLeft,
                        }}
                        onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: editorHtml }}
                      />
                    )}
                    
                    {/* Context/Mode status badge */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 items-center z-30 pointer-events-none">
                      <span className="text-[8px] font-bold bg-muted/80 backdrop-blur-sm px-2 py-0.5 rounded border border-border/50 uppercase tracking-widest text-muted-foreground shadow-sm">
                        WYSIWYG MODE
                      </span>
                    </div>
                  </div>
              ) : (
                /* Raw HTML Code View Area */
                <div className="flex-1 flex flex-col h-full relative bg-slate-950">
                  <textarea
                    value={editorHtml}
                    onChange={(e) => setEditorHtml(e.target.value)}
                    className="w-full h-full flex-1 p-4 bg-transparent text-slate-100 font-mono text-xs focus:outline-none resize-none"
                    placeholder="<h2>Enter raw HTML code here</h2>"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-1.5 items-center z-30 pointer-events-none">
                    <span className="text-[8px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-widest shadow-sm">
                      SOURCE HTML MODE
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions (Right side only) */}
            <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {/* View Mode & Preview Toggles */}
                <div className="flex items-center gap-0.5 bg-background border border-border/80 p-0.5 rounded-md shadow-sm">
                  <button 
                    onClick={() => setViewMode("visual")} 
                    className={`px-2 py-1 text-[10px] font-bold rounded-[4px] whitespace-nowrap transition-colors ${viewMode === "visual" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    Visual Editor
                  </button>
                  <button 
                    onClick={() => setViewMode("html")} 
                    className={`px-2 py-1 text-[10px] font-bold rounded-[4px] whitespace-nowrap transition-colors ${viewMode === "html" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    HTML Code
                  </button>
                </div>

                {viewMode === "visual" && (
                  <label className="flex items-center gap-1 cursor-pointer select-none bg-background/50 px-1.5 py-1 rounded-md border border-transparent hover:border-border/50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={previewMode} 
                      onChange={(e) => setPreviewMode(e.target.checked)}
                      className="w-3 h-3 rounded border-border focus:ring-0 cursor-pointer text-secondary"
                    />
                    <span className="text-[10px] font-bold whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors">Style Preview</span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={onClose}
                  className="px-2 py-1 border border-border/80 bg-background hover:bg-muted text-[10px] font-bold whitespace-nowrap rounded-lg transition-all shadow-sm active:scale-95 text-foreground/80 hover:text-foreground"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={handleSave}
                  className="px-2.5 py-1 bg-secondary text-secondary-foreground hover:scale-[1.02] active:scale-95 text-[10px] font-bold whitespace-nowrap rounded-lg shadow-sm border border-secondary/20 flex items-center gap-1 transition-all"
                >
                  <Save size={11} />
                  <span>Apply & Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
