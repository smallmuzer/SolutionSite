import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, Plus, Download, Upload, Eye, EyeOff, Trash2, Edit2, RefreshCw, X, Star, StarHalf, FileDown, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { dbSelect, dbInsert, dbUpdate, dbDelete } from "@/lib/api";
import { LiveEditorProvider } from "@/components/admin/LiveEditorContext";
import TestimonialsSection from "@/components/TestimonialsSection";

const formatDate = (value: string | Date): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

export default function TestimonialsManager({ userRole }: { userRole: string }) {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const [externalExcelPath, setExternalExcelPath] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleSaveAll = async () => {
    if (userRole === "viewer") return;

    const excelAppends = testimonials
      .filter(t => t.id.startsWith("tst-imp-"))
      .map(t => {
        const edits: any = {};
        for (const [k, v] of Object.entries(pendingChanges)) {
          if (k.startsWith(`testimonials:${t.id}:`)) {
            edits[k.split(':').pop() as string] = v;
          }
        }
        return { ...t, ...edits };
      });

    const entries = Object.entries(pendingChanges).filter(([k]) => k !== "testimonials:has_imports");
    if (entries.length === 0 && excelAppends.length === 0) {
      toast.info("No changes to save");
      return;
    }
    setSaving(true);
    const grouped: Record<string, any> = {};
    const excelUpdates: { index: number; data: any }[] = [];

    const excelPathDraft = pendingChanges["testimonials:external_excel_path"];
    const excelPath = excelPathDraft !== undefined ? excelPathDraft : externalExcelPath;

    for (const [key, value] of entries) {
      const parts = key.split(':');
      if (parts.length === 3) {
        const [s, id, f] = parts;
        if (id.startsWith("tst-ext-")) {
          const index = parseInt(id.replace("tst-ext-", ""), 10);
          let updateObj = excelUpdates.find(u => u.index === index);
          if (!updateObj) {
            updateObj = { index, data: {} };
            excelUpdates.push(updateObj);
          }
          updateObj.data[f] = value;
        } else {
          if (!grouped[id]) grouped[id] = {};
          grouped[id][f] = value;
        }
      } else if (parts.length === 2) {
        const [s, f] = parts;
        if (!grouped["header"]) grouped["header"] = {};
        grouped["header"][f] = value;
      }
    }
    try {
      if (excelUpdates.length > 0 || excelAppends.length > 0) {
        if (!excelPath) {
          throw new Error("Cannot save Excel edits: External Excel Path is not set.");
        }
        const excelRes = await fetch("/api/write_external_excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: excelPath, updates: excelUpdates, appends: excelAppends })
        });
        const excelJson = await excelRes.json();
        if (excelJson.error) {
          throw new Error(`Excel Save Failed: ${excelJson.error}`);
        }
      }

      for (const [id, data] of Object.entries(grouped)) {
        if (id === "header") {
          const existing = await dbSelect<any>("site_content", { section_key: "testimonials" }, { single: true });
          const mergedContent = { ...(existing.data?.content || {}), ...data };
          await dbUpdate("site_content", { section_key: "testimonials" }, { content: mergedContent });
        } else {
          await dbUpdate("testimonials", { id }, data);
        }
      }
      toast.success("Changes saved successfully!");
      setPendingChanges({});
      loadData();
      window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (userRole === "viewer") return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => setDraggedId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || userRole === "viewer") return;

    const items = [...testimonials];
    const sourceIdx = items.findIndex(t => t.id === draggedId);
    const targetIdx = items.findIndex(t => t.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [movedItem] = items.splice(sourceIdx, 1);
      items.splice(targetIdx, 0, movedItem);
      setTestimonials(items);

      for (let i = 0; i < items.length; i++) {
        if (items[i].sort_order !== i) {
          items[i].sort_order = i;
          await dbUpdate("testimonials", { id: items[i].id }, { sort_order: i });
        }
      }
      window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    }
    setDraggedId(null);
  };

  const handleMove = async (id: string, direction: "up" | "down" | "left" | "right") => {
    if (userRole === "viewer") return;
    const items = [...testimonials];
    const idx = items.findIndex(t => t.id === id);
    if (idx === -1) return;

    let step = 0;
    if (direction === "left") step = -1;
    else if (direction === "right") step = 1;
    else if (direction === "up") step = -3;
    else if (direction === "down") step = 3;

    const targetIdx = Math.max(0, Math.min(items.length - 1, idx + step));
    if (targetIdx === idx) return;

    const [moved] = items.splice(idx, 1);
    items.splice(targetIdx, 0, moved);
    setTestimonials(items);

    for (let i = 0; i < items.length; i++) {
      if (items[i].sort_order !== i) {
        items[i].sort_order = i;
        await dbUpdate("testimonials", { id: items[i].id }, { sort_order: i });
      }
    }
    window.dispatchEvent(new CustomEvent("ss:contentSaved"));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [{ data }, { data: contentData }] = await Promise.all([
      dbSelect<any[]>("testimonials", {}, { order: "sort_order", asc: true }),
      dbSelect<any>("site_content", { section_key: "testimonials" }, { single: true })
    ]);
    if (data) setTestimonials(data);
    if (contentData?.content?.external_excel_path) {
      setExternalExcelPath(contentData.content.external_excel_path);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);



  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  const handleAdd = async () => {
    if (userRole === "viewer") return;
    const body = {
      id: `tst-${Date.now()}`,
      name: "New Client",
      company: "Designation",
      company_name: "Company Name",
      message: "Testimonial message here...",
      avatar_url: "",
      rating: 5,
      is_visible: 1,
      sort_order: testimonials.length
    };
    await dbInsert("testimonials", body);
    loadData();
    window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    toast.success("New testimonial added! Scroll down to edit.");
  };

  const handleSave = async () => {
    if (userRole === "viewer") return;
    const body = { ...formData, id: editingId || `tst-${Date.now()}` };
    const res = editingId
      ? await dbUpdate("testimonials", { id: editingId }, body)
      : await dbInsert("testimonials", body);
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Saved successfully");
      setIsModalOpen(false);
      loadData();
      window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole === "viewer") return;
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    const res = await dbDelete("testimonials", { id });
    if (res.error) toast.error(res.error.message);
    else {
      toast.success("Deleted successfully");
      loadData();
      window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    }
  };

  const toggleVisibility = async (t: any) => {
    if (userRole === "viewer") return;
    const next = t.is_visible ? 0 : 1;
    await dbUpdate("testimonials", { id: t.id }, { is_visible: next });
    loadData();
    window.dispatchEvent(new CustomEvent("ss:contentSaved"));
  };

  const exportExcel = () => {
    const data = testimonials.map(t => ({
      Name: t.name || "",
      Designation: t.company || "",
      "Company Name": t.company_name || "",
      Message: t.message || "",
      Rating: parseFloat(t.rating || 5),
      Visible: t.is_visible ? "Yes" : "No",
      Date: formatDate(t.created_at)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Testimonials");
    XLSX.writeFile(wb, "testimonials.xlsx");
  };

  const downloadTemplate = () => {
    const data = [{
      Name: "John Doe",
      Designation: "CEO",
      "Company Name": "Acme Corp",
      Message: "This is a great product!",
      Rating: 4.5,
      Visible: "Yes"
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "testimonials_template.xlsx");
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole === "viewer") return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!rows || rows.length === 0) throw new Error("File is empty");

        const newItems = rows.map((row, i) => ({
          id: `tst-imp-${Date.now()}-${i}`,
          name: row["Name"] || "",
          company: row["Designation"] || "",
          company_name: row["Company Name"] || "",
          message: row["Message"] || "",
          rating: parseFloat(row["Rating"]) || 5,
          is_visible: String(row["Visible"]).toLowerCase() === "no" ? 0 : 1,
          sort_order: testimonials.length + i,
          isExternalData: true
        }));

        setTestimonials(prev => [...prev, ...newItems]);
        setPendingChanges(prev => ({ ...prev, "testimonials:has_imports": true }));
        toast.success(`Imported ${newItems.length} testimonials. Click Save Changes to append them to the Excel file.`);
        // We do not call dbInsert or loadData to ensure they are not saved to the database.
        // window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      } catch (err: any) {
        toast.error("Failed to import: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };



  if (loading) return <div className="p-4 flex items-center justify-center text-muted-foreground">Loading testimonials...</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Testimonials Manager</h1>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4 bg-muted/20 p-2 rounded-xl border border-border/50 shadow-sm justify-end items-center">
        <div className="flex items-center flex-1 max-w-sm relative gap-2">
          <input
            type="text"
            placeholder="Testimonials excel path... (e.g. C:\Shared\file.xlsx)"
            value={pendingChanges["testimonials:external_excel_path"] ?? externalExcelPath}
            onChange={(e) => {
              setPendingChanges(prev => ({ ...prev, "testimonials:external_excel_path": e.target.value }));
            }}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition-all h-[28px]"
          />
        </div>
        <div className="flex items-center flex-1 max-w-sm relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search testimonials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-xs outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/30 transition-all h-[28px]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button disabled={userRole === "viewer"} onClick={downloadTemplate} className="px-2 py-1 bg-background border border-border rounded-md text-xs font-semibold hover:bg-muted transition flex items-center justify-center gap-1 shrink-0 h-[28px] shadow-sm">
            <FileDown size={13} /> Template
          </button>
          <button disabled={userRole === "viewer"} onClick={exportExcel} className="px-2 py-1 bg-background border border-border rounded-md text-xs font-semibold hover:bg-muted transition flex items-center justify-center gap-1 shrink-0 h-[28px] shadow-sm">
            <Download size={13} /> Export XLSX
          </button>
          <label className="px-2 py-1 bg-background border border-border rounded-md text-xs font-semibold hover:bg-muted transition flex items-center justify-center gap-1 shrink-0 h-[28px] shadow-sm cursor-pointer disabled:opacity-50">
            <Upload size={13} /> Import XLSX
            <input type="file" accept=".xlsx" className="hidden" onChange={importExcel} disabled={userRole === "viewer"} />
          </label>
          <button disabled={userRole === "viewer"} onClick={handleAdd} className="px-2 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-md text-xs font-bold hover:bg-secondary/20 transition flex items-center justify-center gap-1 shrink-0 h-[28px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={13} /> Add New
          </button>
          <button disabled={userRole === "viewer" || saving} onClick={handleSaveAll} className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-bold hover:bg-green-700 transition flex items-center justify-center gap-1.5 shrink-0 h-[28px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Check size={14} /> {saving ? "Saving..." : Object.keys(pendingChanges).length > 0 ? `Save (${Object.keys(pendingChanges).length})` : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border mt-4 overflow-hidden relative min-h-[60vh] max-h-[85vh] overflow-y-auto">
        <LiveEditorProvider
          userRole={userRole}
          pendingChanges={pendingChanges}
          onUpdate={(section: string, field: string, value: any, id?: string) => {
            const key = id ? `${section}:${id}:${field}` : `${section}:${field}`;
            setPendingChanges(prev => ({ ...prev, [key]: value }));
          }}
          onHide={(section: string, id: string | undefined, currentVisibility: boolean) => {
            if (id) {
              const key = `${section}:${id}:is_visible`;
              setPendingChanges(prev => ({ ...prev, [key]: currentVisibility ? 0 : 1 }));
            } else {
              const key = `${section}:is_visible`;
              setPendingChanges(prev => ({ ...prev, [key]: currentVisibility ? 0 : 1 }));
            }
          }}
          onDelete={async (section: string, id: string) => {
            if (!confirm("Are you sure you want to delete this?")) return;
            if (id.startsWith("tst-ext-")) {
              const index = parseInt(id.replace("tst-ext-", ""), 10);
              const excelRes = await fetch("/api/write_external_excel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: externalExcelPath, deletes: [index] })
              });
              const excelJson = await excelRes.json();
              if (excelJson.error) {
                toast.error(`Excel Delete Failed: ${excelJson.error}`);
                return;
              }
              toast.success("Deleted from Excel successfully");
            } else {
              await dbDelete(section, { id });
            }
            loadData();
            window.dispatchEvent(new CustomEvent("ss:contentSaved"));
          }}
          onAdd={() => { }}
          onClone={() => { }}
          onSave={handleSaveAll}
          onPickImage={(section: string, field: string, id?: string) => {
            const url = prompt("Enter image URL:");
            if (url) {
              const key = id ? `${section}:${id}:${field}` : `${section}:${field}`;
              setPendingChanges(prev => ({ ...prev, [key]: url }));
            }
          }}
          onPickMultiImage={() => { }}
          onPickIcon={() => { }}
          onPickLink={() => { }}
          onPickColor={() => { }}
          onOpenCustomizer={() => { }}
          handleSaveAll={handleSaveAll}
          handleDiscard={() => setPendingChanges({})}
        >
          <TestimonialsSection searchTerm={searchTerm} hideAddButton={true} hideEyeIcon={true} />
        </LiveEditorProvider>
      </div>
    </div>
  );
}
