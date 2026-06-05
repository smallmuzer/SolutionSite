import React, { useState, useEffect, useRef } from "react";
import EmojiPicker from 'emoji-picker-react';
import {
  Bold, Italic, Underline, Strikethrough, Superscript, Subscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, Sparkles, Copy, Clipboard, Save, X, Maximize2, Minimize2,
  Undo2, Redo2, Link, Link2Off, Image, Smile, Table, Code, Grid,
  Minus, Palette, CheckSquare, List, ListOrdered, Type as TypeIcon,
  Paperclip, Mic, Folder, Outdent, Indent
} from "lucide-react";
import { toast } from "sonner";

interface TypographyEditorModalProps {
  isOpen: boolean;
  section: string;
  field: string;
  initialValue: string;
  originalValue: string;
  id?: string;
  targetStyles?: Record<string, string>;
  onClose: () => void;
  onSave: (section: string, field: string, value: string, id?: string) => void;
  handleSaveAll?: () => void;
  handleDiscard?: () => void;
  pendingChangesCount?: number;
  userRole?: string;
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

// ── RGB to Hex Helper ─────────────────────────────────────────────────────────
function rgbToHex(rgbStr: string): string {
  if (!rgbStr) return "";
  const str = rgbStr.toLowerCase().replace(/\s/g, '');
  if (str === 'transparent' || str === 'rgba(0,0,0,0)') return "";

  const match = str.match(/^rgba?\((\d+),(\d+),(\d+)/i);
  if (match) {
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return rgbStr;
}

// ── Parse Inline Styles Helper ────────────────────────────────────────────────
export function parseInlineStyles(html: string): { styles: ActiveStyles; innerHtml: string } {
  const trimmed = (html || "").trim();
  const parsed = { ...DEFAULT_STYLES };

  // ONLY strip the wrapper if it exactly matches what the editor creates: <div style="...">...</div>
  // This prevents stripping user's custom tags (e.g. <h1>) or classes.
  const match = trimmed.match(/^<div style="([^"]+)">([\s\S]*)<\/div>$/i);

  if (!match) {
    return { styles: parsed, innerHtml: trimmed };
  }

  const styleStr = match[1];
  const wrapperHtml = match[2];

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
    else if (key === "color") parsed.textColor = rgbToHex(val);
    else if (key === "background-color") parsed.bgColor = rgbToHex(val);
    else if (key === "padding-top") parsed.paddingTop = val;
    else if (key === "padding-right") parsed.paddingRight = val;
    else if (key === "padding-bottom") parsed.paddingBottom = val;
    else if (key === "padding-left") parsed.paddingLeft = val;
    else if (key === "margin-top") parsed.marginTop = val;
    else if (key === "margin-right") parsed.marginRight = val;
    else if (key === "margin-bottom") parsed.marginBottom = val;
    else if (key === "margin-left") parsed.marginLeft = val;
  });

  return { styles: parsed, innerHtml: wrapperHtml };
}

export const TypographyEditorModal: React.FC<TypographyEditorModalProps> = ({
  isOpen, section, field, initialValue, originalValue, id, targetStyles, onClose, onSave,
  handleSaveAll, handleDiscard, pendingChangesCount = 0, userRole
}) => {
  const [editorHtml, setEditorHtml] = useState("");
  const [activeStyles, setActiveStyles] = useState<ActiveStyles>({ ...DEFAULT_STYLES });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [previewMode, setPreviewMode] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Rich Text Editor Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  // Helper to save the current selection
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  };

  // Helper to restore the saved selection
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  // Initialize and parse current content
  useEffect(() => {
    if (isOpen) {
      const { styles, innerHtml } = parseInlineStyles(initialValue);

      // Merge targetStyles if properties are empty/default
      if (targetStyles) {
        if (!styles.fontFamily) styles.fontFamily = targetStyles.fontFamily?.replace(/['"]/g, "") || "";
        if (!styles.fontSize) styles.fontSize = targetStyles.fontSize || "";
        if (!styles.fontWeight) styles.fontWeight = targetStyles.fontWeight || "";
        if (!styles.lineHeight) styles.lineHeight = targetStyles.lineHeight || "";
        if (!styles.letterSpacing) styles.letterSpacing = targetStyles.letterSpacing || "";
        if (!styles.textTransform || styles.textTransform === "none") styles.textTransform = targetStyles.textTransform !== "none" ? targetStyles.textTransform : "";
        if (!styles.textAlign || styles.textAlign === "start") styles.textAlign = targetStyles.textAlign !== "start" ? targetStyles.textAlign : "";
        if (!styles.textColor) styles.textColor = rgbToHex(targetStyles.textColor || "");
        // Do NOT populate bgColor from targetStyles because it pulls the computed DOM background (e.g. #ffffff)
        // and hardcodes it inline, ruining dark mode and transparent headers.
        // styles.bgColor = rgbToHex(targetStyles.bgColor || "");

        // Margins and paddings if empty (sometimes getComputedStyle returns 0px)
        if (!styles.paddingTop) styles.paddingTop = targetStyles.paddingTop || "";
        if (!styles.paddingRight) styles.paddingRight = targetStyles.paddingRight || "";
        if (!styles.paddingBottom) styles.paddingBottom = targetStyles.paddingBottom || "";
        if (!styles.paddingLeft) styles.paddingLeft = targetStyles.paddingLeft || "";

        if (!styles.marginTop) styles.marginTop = targetStyles.marginTop || "";
        if (!styles.marginRight) styles.marginRight = targetStyles.marginRight || "";
        if (!styles.marginBottom) styles.marginBottom = targetStyles.marginBottom || "";
        if (!styles.marginLeft) styles.marginLeft = targetStyles.marginLeft || "";
      }

      setActiveStyles(styles);
      setEditorHtml(innerHtml);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setUndoStack([]);
      setRedoStack([]);
      setViewMode("visual");
      setPreviewMode(false);
      savedSelectionRef.current = null;
      isInternalEditRef.current = false;

      // Auto center position
      const w = window.innerWidth;
      setPosition({ x: Math.max((w - 900) / 2, 50), y: 80 });
    }
  }, [isOpen, initialValue, targetStyles]);




  const isInternalEditRef = useRef(false);
  const isHtmlEditRef = useRef(false);
  useEffect(() => {
    if (editorRef.current && !isInternalEditRef.current) {
      editorRef.current.innerHTML = editorHtml;
    }
    isInternalEditRef.current = false;
  }, [editorHtml, isOpen, viewMode]);

  // Wrapper to update editorHtml from user typing (marks as internal so useEffect doesn't re-set DOM)
  const syncEditorState = () => {
    if (editorRef.current) {
      isInternalEditRef.current = true;
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  // Save current state for undo/redo
  const recordHistory = (html: string) => {
    undoStackRef.current = [...undoStackRef.current, html];
    redoStackRef.current = [];
    setUndoStack([...undoStackRef.current]);
    setRedoStack([]);
  };

  // Get current editor HTML directly from DOM (not state)
  const getEditorHtml = () => {
    return editorRef.current ? editorRef.current.innerHTML : editorHtml;
  };

  const handleUndo = () => {
    if (undoStackRef.current.length > 0) {
      const prev = undoStackRef.current[undoStackRef.current.length - 1];
      redoStackRef.current = [...redoStackRef.current, getEditorHtml()];
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      setEditorHtml(prev);
      setUndoStack([...undoStackRef.current]);
      setRedoStack([...redoStackRef.current]);
      if (editorRef.current) {
        editorRef.current.innerHTML = prev;
      }
    }
  };

  const handleRedo = () => {
    if (redoStackRef.current.length > 0) {
      const next = redoStackRef.current[redoStackRef.current.length - 1];
      undoStackRef.current = [...undoStackRef.current, getEditorHtml()];
      redoStackRef.current = redoStackRef.current.slice(0, -1);
      setEditorHtml(next);
      setUndoStack([...undoStackRef.current]);
      setRedoStack([...redoStackRef.current]);
      if (editorRef.current) {
        editorRef.current.innerHTML = next;
      }
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
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const getCurrentRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) return range;
    }
    return savedSelectionRef.current;
  };

  const closestEditableElement = (node: Node | null, selector: string) => {
    if (!node || !editorRef.current) return null;
    let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== editorRef.current) {
      if (el instanceof HTMLElement && el.matches(selector)) return el;
      el = el.parentNode;
    }
    return null;
  };

  const setCaretAtEnd = (element: Node) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    savedSelectionRef.current = range.cloneRange();
  };

  const insertListFallback = (tagName: "ul" | "ol") => {
    if (!editorRef.current) return;
    const range = getCurrentRange();
    const selectedText = range?.toString();
    const existingList = closestEditableElement(range?.commonAncestorContainer || null, "ul,ol");
    if (existingList) {
      const replacement = document.createElement(tagName);
      replacement.innerHTML = existingList.innerHTML;
      existingList.replaceWith(replacement);
      setCaretAtEnd(replacement);
      return;
    }

    const makeList = (source: string) => {
      const list = document.createElement(tagName);
      const lines = source
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        list.innerHTML = "<li><br></li>";
      } else {
        list.innerHTML = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
      }
      return list;
    };

    if (range && selectedText?.trim()) {
      const list = makeList(selectedText);
      range.deleteContents();
      range.insertNode(list);
      setCaretAtEnd(list);
      return;
    }

    const block = closestEditableElement(range?.commonAncestorContainer || null, "p,div,h1,h2,h3,h4,h5,h6,blockquote,li");
    if (block && block !== editorRef.current) {
      const list = makeList(block.innerText || block.textContent || "");
      block.replaceWith(list);
      setCaretAtEnd(list);
      return;
    }

    const list = makeList(editorRef.current.innerText.trim());
    editorRef.current.innerHTML = "";
    editorRef.current.appendChild(list);
    setCaretAtEnd(list);
  };

  const findEditableBlock = () => {
    const range = getCurrentRange();
    if (!range || !editorRef.current) return editorRef.current;
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|UL|OL)$/i.test(node.tagName)) {
        return node;
      }
      node = node.parentNode;
    }
    return editorRef.current;
  };

  const indentFallback = (direction: "in" | "out") => {
    if (!editorRef.current) return;
    const range = getCurrentRange();
    const selector = "li,p,div,h1,h2,h3,h4,h5,h6,blockquote";
    let targets: HTMLElement[] = [];

    if (range && !range.collapsed) {
      targets = Array.from(editorRef.current.querySelectorAll<HTMLElement>(selector))
        .filter((el) => range.intersectsNode(el));
    }

    if (targets.length === 0) {
      const block = findEditableBlock();
      if (block instanceof HTMLElement) targets = [block === editorRef.current ? editorRef.current : block];
    }

    targets.forEach((target) => {
      const current = parseInt(target.style.marginLeft || "0", 10) || 0;
      const next = direction === "in" ? current + 32 : Math.max(0, current - 32);
      target.style.marginLeft = next ? `${next}px` : "";
    });
  };

  const execCmd = (command: string, value: string = "") => {
    // Ensure editor has focus first
    if (editorRef.current) {
      editorRef.current.focus();
    }
    // Restore selection if it was lost
    restoreSelection();

    // Record current DOM state for undo (use ref, no re-render)
    const currentHtml = getEditorHtml();
    undoStackRef.current = [...undoStackRef.current, currentHtml];
    redoStackRef.current = [];

    if (command === "insertUnorderedList") insertListFallback("ul");
    else if (command === "insertOrderedList") insertListFallback("ol");
    else if (command === "indent") indentFallback("in");
    else if (command === "outdent") indentFallback("out");
    else document.execCommand(command, false, value);

    // Now sync React state from DOM (marked as internal so useEffect won't overwrite DOM)
    syncEditorState();
    saveSelection();
    setUndoStack([...undoStackRef.current]);
    setRedoStack([]);
  };

  const runToolbarCommand = (e: React.MouseEvent, command: string, value = "") => {
    e.preventDefault();
    e.stopPropagation();
    execCmd(command, value);
  };

  const clearFormatting = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    restoreSelection();

    const currentHtml = getEditorHtml();
    undoStackRef.current = [...undoStackRef.current, currentHtml];
    redoStackRef.current = [];

    document.execCommand("removeFormat", false, "");
    // Also strip remaining wrappers
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      editorRef.current.innerHTML = text;
    }
    syncEditorState();
    setUndoStack([...undoStackRef.current]);
    setRedoStack([]);
  };

  // ── Save/Publish Logic ──────────────────────────────────────────────────────
  const handleSave = () => {
    let serialized = editorHtml;

    if (viewMode === "visual") {
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
      serialized = cssText
        ? `<div style="${cssText}">${finalHtml}</div>`
        : finalHtml;
    } else {
      serialized = sanitizeHtml(editorHtml);
    }

    onSave(section, field, serialized, id);
    toast.success("Text style updated successfully!");
    onClose();
  };

  const handleRevert = () => {
    const { styles, innerHtml } = parseInlineStyles(initialValue);
    setActiveStyles(styles);
    setEditorHtml(innerHtml);
    setUndoStack([]);
    setRedoStack([]);
    if (editorRef.current) {
      editorRef.current.innerHTML = innerHtml;
    }
    toast.info("Changes reverted to original state.");
  };

  // ── View Mode Change ────────────────────────────────────────────────────────
  const handleViewModeChange = (newMode: "visual" | "html") => {
    if (newMode === viewMode) return;

    if (newMode === "html") {
      // Serialize current activeStyles into the HTML string
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
      const serialized = cssText ? `<div style="${cssText}">${editorHtml}</div>` : editorHtml;

      setEditorHtml(serialized);
      // Removed clearing of activeStyles here to keep sidebar in sync
    } else {
      // Parse styles back out of editorHtml
      const { styles, innerHtml } = parseInlineStyles(editorHtml);
      setEditorHtml(innerHtml);
      setActiveStyles(styles);
      isInternalEditRef.current = false;
    }
    setViewMode(newMode);
  };

  // Sync sidebar to HTML code mode when activeStyles changes via sidebar
  useEffect(() => {
    if (viewMode === "html" && !isHtmlEditRef.current) {
      const { innerHtml } = parseInlineStyles(editorHtml);
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
      const serialized = cssText ? `<div style="${cssText}">${innerHtml}</div>` : innerHtml;
      if (editorHtml !== serialized) {
        setEditorHtml(serialized);
      }
    }
    isHtmlEditRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyles]);

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
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const url = prompt("Enter link URL:", "https://");
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (url) execCmd("createLink", url);
  };

  const onEmojiClick = (emojiData: any) => {
    // Ensure editor has focus first
    if (editorRef.current) {
      editorRef.current.focus();
    }
    // Restore selection if it was lost
    restoreSelection();

    recordHistory(editorHtml);
    execCmd("insertHTML", emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const insertTable = () => {
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rows = parseInt(prompt("Enter number of rows:", "3") || "3", 10);
    const cols = parseInt(prompt("Enter number of columns:", "3") || "3", 10);
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
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
          width: "720px",
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
                            value={String(activeStyles[key] || "").replace(/px$/, '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActiveStyles(prev => ({ ...prev, [key]: /^\d+$/.test(val) ? `${val}px` : val }));
                            }}
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
                            value={String(activeStyles[key] || "").replace(/px$/, '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActiveStyles(prev => ({ ...prev, [key]: /^\d+$/.test(val) ? `${val}px` : val }));
                            }}
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
              {/* Rich Text Toolbar (Zoho Mail Style) */}
              <div
                className={`flex items-center flex-wrap gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/20 transition-all ${viewMode === "html" ? "opacity-40 pointer-events-none grayscale select-none" : "opacity-100"}`}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest("select") && !target.closest("input")) {
                    e.preventDefault();
                  }
                }}
              >

                {/* Attachment / Insert Group */}
                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5 relative">
                  <button
                    onClick={() => {
                      saveSelection();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                    className={`p-1 rounded text-foreground transition-colors ${showEmojiPicker ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
                    title="Insert Emoji"
                  >
                    <Smile size={14} />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl rounded-lg overflow-hidden border border-border">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width={300}
                        height={400}
                        theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light' as any}
                      />
                    </div>
                  )}
                </div>

                {/* Formatting Group */}
                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5">
                  <button onClick={() => execCmd("bold")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Bold"><Bold size={14} /></button>
                  <button onClick={() => execCmd("italic")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Italic"><Italic size={14} /></button>
                  <button onClick={() => execCmd("underline")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Underline"><Underline size={14} /></button>
                  <button onClick={() => execCmd("strikeThrough")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Strike Through"><Strikethrough size={14} /></button>
                </div>

                {/* Indent & Others */}
                <div className="flex items-center gap-0.5 border-r border-border/50 pr-1.5">
                  <button onMouseDown={(e) => runToolbarCommand(e, "outdent")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Decrease Indent"><Outdent size={14} /></button>
                  <button onMouseDown={(e) => runToolbarCommand(e, "indent")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Increase Indent"><Indent size={14} /></button>
                  <button onClick={() => execCmd("superscript")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Superscript"><Superscript size={14} /></button>
                  <button onClick={() => execCmd("subscript")} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Subscript"><Subscript size={14} /></button>
                </div>

                {/* Utilities */}
                <div className="flex items-center gap-0.5">
                  <button onClick={promptLink} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Insert Link"><Link size={14} /></button>
                  <button onClick={clearFormatting} className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Clear Formatting"><X size={14} /></button>
                  <button onClick={handleUndo} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Undo"><Undo2 size={14} /></button>
                  <button onClick={handleRedo} className="p-1 hover:bg-muted rounded text-foreground transition-colors" title="Redo"><Redo2 size={14} /></button>
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
                      onInput={() => {
                        syncEditorState();
                        saveSelection();
                      }}
                      onMouseUp={saveSelection}
                      onKeyUp={saveSelection}
                      onFocus={saveSelection}
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
                    onChange={(e) => {
                      const newHtml = e.target.value;
                      isHtmlEditRef.current = true;
                      setEditorHtml(newHtml);
                      const { styles } = parseInlineStyles(newHtml);
                      setActiveStyles(styles);
                    }}
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
                    onClick={() => handleViewModeChange("visual")}
                    className={`px-2 py-1 text-[10px] font-bold rounded-[4px] whitespace-nowrap transition-colors ${viewMode === "visual" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    Visual Editor
                  </button>
                  <button
                    onClick={() => handleViewModeChange("html")}
                    className={`px-2 py-1 text-[10px] font-bold rounded-[4px] whitespace-nowrap transition-colors ${viewMode === "html" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    HTML Code
                  </button>
                </div>

              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={userRole === "viewer"}
                  className={`px-4 py-1.5 active:scale-95 text-[11px] font-bold whitespace-nowrap rounded-lg shadow-sm border flex items-center transition-all ${userRole === "viewer" ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-border/50" : pendingChangesCount > 0 ? "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20" : "bg-secondary text-secondary-foreground border-secondary/20 hover:scale-[1.02]"}`}
                >
                  {pendingChangesCount > 0 ? "Apply" : "Apply & Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
