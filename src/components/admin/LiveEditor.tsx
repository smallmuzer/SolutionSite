import React, { Suspense, lazy, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LiveEditorProvider, useLiveEditor } from "./LiveEditorContext";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import UICustomizer from "@/components/UICustomizer";
import ScrollProgress from "@/components/ScrollProgress";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useBatchQuery } from "@/hooks/useDbQuery";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import * as LucideIcons from "lucide-react";

// Lazy load sections
const AboutSection = lazy(() => import("@/components/AboutSection"));
const ServicesSection = lazy(() => import("@/components/ServicesSection"));
const ProductsSection = lazy(() => import("@/components/ProductsSection"));
const ClientsSection = lazy(() => import("@/components/ClientsSection"));
const WorldMap = lazy(() => import("@/components/WorldMap"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));

const TechnologiesSection = lazy(() => import("@/components/TechnologiesSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));
const Footer = lazy(() => import("@/components/Footer"));
const WhatsAppButton = lazy(() => import("@/components/WhatsAppButton"));
const ScrollToTop = lazy(() => import("@/components/ScrollToTop"));
const CookieConsent = lazy(() => import("@/components/CookieConsent"));

const SkeletonSection = () => null;

const LiveEditor = ({ userRole }: { userRole?: string }) => {
  const { data: settings } = useSiteSettings();
  const queryClient = useQueryClient();

  useBatchQuery([
    { table: "client_logos", order: "sort_order" },
    { table: "services", order: "sort_order" },
    { table: "technologies", order: "sort_order" },
    { table: "products", order: "sort_order" },

    { table: "hero_stats", order: "sort_order" },
    { table: "global_presence", order: "sort_order" },
    { table: "our_network", order: "sort_order" },
    { table: "career_jobs", order: "sort_order" },
    { table: "testimonials", order: "sort_order" },
  ]);

  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [discardKey, setDiscardKey] = useState(0);
  const [pickerConfig, setPickerConfig] = useState<{
    type: "image" | "icon" | "link" | "color";
    section: string;
    field: string;
    id?: string;
    multi?: boolean;
  } | null>(null);

  const handleUpdate = (section: string, field: string, value: any, id?: string) => {
    const key = id ? `${section}:${id}:${field}` : `${section}:${field}`;
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    if (userRole === "viewer") {
      toast.error("Viewers are not permitted to modify data.");
      return;
    }
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) {
      toast.info("No changes to save");
      return;
    }

    const toastId = toast.loading("Saving all changes...");
    try {
      // 1. Process Excel edits / deletions in testimonials
      const excelUpdates: { index: number; data: any }[] = [];
      const excelDeletes: number[] = [];
      let excelPath = "";

      const hasExcelChanges = Object.keys(pendingChanges).some(k => k.startsWith("testimonials:tst-ext-"));
      if (hasExcelChanges) {
        try {
          const resp = await fetch("/api/db/site_content?section_key=testimonials&_single=1");
          const json = await resp.json();
          excelPath = json.data?.content?.external_excel_path || "";
        } catch (e) {
          console.error("Failed to fetch excel path", e);
        }

        if (excelPath) {
          for (const [key, value] of entries) {
            if (key.startsWith("testimonials:tst-ext-")) {
              const parts = key.split(':');
              if (parts.length === 3) {
                const [_, id, f] = parts;
                const index = parseInt(id.replace("tst-ext-", ""), 10);
                if (f === "_delete") {
                  excelDeletes.push(index);
                } else {
                  let updateObj = excelUpdates.find(u => u.index === index);
                  if (!updateObj) {
                    updateObj = { index, data: {} };
                    excelUpdates.push(updateObj);
                  }
                  updateObj.data[f] = value;
                }
              }
            }
          }

          if (excelUpdates.length > 0 || excelDeletes.length > 0) {
            const excelRes = await fetch("/api/write_external_excel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: excelPath, updates: excelUpdates, deletes: excelDeletes })
            });
            const excelJson = await excelRes.json();
            if (excelJson.error) {
              throw new Error(`Excel Save Failed: ${excelJson.error}`);
            }
          }
        }
      }

      // Filter out external excel changes from db grouped changes
      const dbEntries = entries.filter(([key]) => !key.startsWith("testimonials:tst-ext-"));

      // Group changes by section and id to minimize requests
      const grouped: Record<string, any> = {};
      for (const [key, value] of dbEntries) {
        const parts = key.split(':');
        if (parts.length === 3) { // section:id:field
          const [s, id, f] = parts;
          const gKey = `${s}:${id}`;
          if (!grouped[gKey]) grouped[gKey] = { section: s, id, data: {} };
          grouped[gKey].data[f] = value;
        } else { // section:field
          const [s, f] = parts;
          if (!grouped[s]) grouped[s] = { section: s, data: {} };
          grouped[s].data[f] = value;
        }
      }

      for (const g of Object.values(grouped)) {
        const dbSec = g.section === "clients" ? "client_logos" : g.section;
        const entityTables = new Set(["client_logos", "services", "technologies", "products", "hero_stats", "global_presence", "our_network", "career_jobs", "testimonials", "social_links"]);
        const isEntity = entityTables.has(dbSec) && g.id;
        let finalData = g.data;
        if (!finalData || Object.keys(finalData).length === 0) continue;

        if (isEntity) {
          if (finalData._delete) {
            if (!g.id.startsWith("temp_")) {
              await fetch(`/api/db/${dbSec}?id=${g.id}`, { method: "DELETE" });
            }
            continue;
          }

          if (finalData._clone) {
            const cloneData = { ...finalData._clone };
            Object.keys(finalData).forEach(k => {
              if (k !== '_clone') cloneData[k] = finalData[k];
            });
            await fetch(`/api/db/${dbSec}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cloneData)
            });
            continue;
          }
        }
        if (g.section === "settings" || g.section === "site_settings") {
          const siteSettingsFields = new Set([
            "site_name", "site_logo", "site_url", "whatsapp_number", "viber_number",
            "contact_email", "contact_phone", "hr_email", "google_analytics_id",
            "microsoft_clarity_id", "contact_from_email", "smtp_host", "smtp_port",
            "smtp_user", "smtp_pass", "chatbot_enabled", "chatbot_script_url",
            "chatbot_api_key", "chatbot_title", "chatbot_subtitle", "chatbot_accent",
            "chatbot_accent2", "chatbot_bot_bubble", "chatbot_user_color",
            "chatbot_position", "chatbot_btn_size", "theme", "font_style", "font_size",
            "card_style", "accent_color", "global_view"
          ]);
          const settingsData: Record<string, any> = {};
          const contentData: Record<string, any> = {};
          for (const [k, v] of Object.entries(finalData)) {
            if (siteSettingsFields.has(k)) settingsData[k] = v;
            else contentData[k] = v;
          }

          if (Object.keys(settingsData).length > 0) {
            const resp = await fetch(`/api/db/site_settings?id=settings`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(settingsData)
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error.message);
          }

          if (Object.keys(contentData).length > 0) {
            try {
              const getResp = await fetch(`/api/db/site_content?section_key=settings&_single=1`);
              const getData = await getResp.json();
              let existingContent = getData?.data?.content || {};
              if (typeof existingContent === "string") {
                try { existingContent = JSON.parse(existingContent); } catch { existingContent = {}; }
              }
              const finalContentData = { ...existingContent, ...contentData };
              const resp2 = await fetch(`/api/db/site_content`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section_key: "settings", content: finalContentData })
              });
              const json2 = await resp2.json();
              if (json2.error) throw new Error(json2.error.message);
            } catch (e) {
              console.error("Failed to save settings content", e);
            }
          }
          continue; // Skip the default save logic for this section
        }

        if (!isEntity) {
          try {
            const getResp = await fetch(`/api/db/site_content?section_key=${g.section}&_single=1`);
            const getData = await getResp.json();
            if (getData.data && getData.data.content) {
              let existingContent = getData.data.content;
              if (typeof existingContent === "string") {
                try { existingContent = JSON.parse(existingContent); } catch { existingContent = {}; }
              }
              finalData = { ...existingContent, ...g.data };
            }
          } catch (e) {
            console.error("Failed to fetch existing content", e);
          }
        }

        const endpoint = isEntity ? `/api/db/${dbSec}?id=${g.id}` : `/api/db/site_content`;
        const method = isEntity ? "PATCH" : "POST";
        const body = isEntity ? finalData : { section_key: g.section, content: finalData };

        const resp = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);
      }

      window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      await queryClient.invalidateQueries();
      setPendingChanges({});
      toast.success("All changes saved successfully", { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to save changes: ${err.message}`, { id: toastId });
    }
  };

  const handleDiscard = () => {
    toast("Discard unsaved changes?", {
      description: "This action cannot be undone.",
      action: {
        label: "Discard",
        onClick: () => {
          setPendingChanges({});
          setDiscardKey(prev => prev + 1);
          window.dispatchEvent(new CustomEvent("ss:discardChanges"));
          toast.success("Changes discarded successfully");
        }
      },
      cancel: {
        label: "Cancel",
        onClick: () => {}
      }
    });
  };

  const handleHide = (section: string, id: string | undefined, currentVisibility: boolean) => {
    const nextVisibility = !currentVisibility;
    handleUpdate(section, "is_visible", nextVisibility, id);
    toast.success("Visibility change queued. Click 'Save All Changes' to apply.");
  };

  const handleDelete = async (section: string, id: string) => {
    if (!confirm("Are you sure you want to mark this item for deletion? It will be removed when you click 'Save All Changes'.")) return;
    try {
      if (id.startsWith("temp_")) {
        setPendingChanges(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (k.startsWith(`${section}:${id}:`)) delete next[k];
          });
          return next;
        });
      } else {
        setPendingChanges(prev => ({ ...prev, [`${section}:${id}:_delete`]: true }));
      }
      toast.success(`Item queued for deletion. Click 'Save All Changes' to apply.`);
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  let nextSortOrder = 9999;

  const handleAdd = async (section: string) => {
    if (section === "hero") {
      handlePickMultiImage("hero", "hero_images");
      return;
    }
    try {
      const uiSection = section === "client_logos" ? "clients" : section;
      const defaults: any = { is_visible: true, sort_order: nextSortOrder++ };
      if (uiSection === "hero_stats") { defaults.count = "00"; defaults.label = "Label"; defaults.suffix = "+"; }
      else if (uiSection === "services") { defaults.title = "New Service"; defaults.description = "Service description"; defaults.badge = "Service"; }
      else if (uiSection === "global_presence") { defaults.name = "New Location, Country"; defaults.lat = 4.1755; defaults.lng = 73.5093; defaults.clients = "New Clients details"; defaults.description = "New location active operations and technical details."; defaults.flag = "📍"; defaults.landmark = "New Landmark"; }
      else if (uiSection === "our_network") { defaults.name = "New Partner Company"; defaults.subtitle = "Technology Affiliate"; defaults.desc = "Brief description of the partner company, services, and strategic alignment."; defaults.href = "https://"; defaults.logo_url = "/assets/clients/oblu.png"; defaults.accent = "#3b82f6"; defaults.flag = "🏢"; }
      else if (uiSection === "products") { defaults.name = "New Product"; defaults.description = "Product description"; defaults.tagline = "Premium"; defaults.extra_text = "Feature 1, Feature 2, Feature 3, Feature 4"; }
      else if (uiSection === "clients") { defaults.name = "New Client"; defaults.logo_url = ""; }
      else if (uiSection === "technologies") { defaults.name = "New Technology"; defaults.description = "Brief description of the tech stack."; defaults.category = "General"; }
      else if (uiSection === "testimonials") { defaults.name = "New Client"; defaults.company = "Role / Position"; defaults.company_name = "Company Name"; defaults.message = "Client testimonial message goes here."; defaults.rating = 5; }
      else { defaults.title = "New Item"; defaults.name = "New Item"; }

      const newId = `temp_${Date.now()}`;
      setPendingChanges(prev => ({ ...prev, [`${uiSection}:${newId}:_clone`]: defaults }));
      toast.success(`Added new item to ${uiSection} (Draft). Click 'Save All Changes' to apply.`);
    } catch (err: any) {
      toast.error(`Failed to add: ${err.message}`);
    }
  };

  const handleClone = async (section: string, id: string) => {
    try {
      const dbSection = section === "clients" ? "client_logos" : section;
      let itemToClone;
      if (id.startsWith("temp_")) {
        itemToClone = { ...pendingChanges[`${section}:${id}:_clone`] };
        for (const [k, v] of Object.entries(pendingChanges)) {
          if (k.startsWith(`${section}:${id}:`) && !k.endsWith(":_clone") && !k.endsWith(":_delete")) {
            const field = k.split(":")[2];
            if (field) itemToClone[field] = v;
          }
        }
      } else {
        const getResp = await fetch(`/api/db/${dbSection}?id=${id}&_single=1`);
        const getData = await getResp.json();
        if (getData.error) throw new Error(getData.error.message);
        itemToClone = getData.data;
      }

      const newItem = { ...itemToClone };
      delete newItem.id;
      delete newItem.created_at;
      newItem.sort_order = (newItem.sort_order || 0) + 0.01;
      if (newItem.title) newItem.title += " (Clone)";
      if (newItem.name) newItem.name += " (Clone)";

      const newId = `temp_${Date.now()}`;
      setPendingChanges(prev => ({ ...prev, [`${section}:${newId}:_clone`]: newItem }));
      toast.success(`Cloned item in ${section} (Draft). Click 'Save All Changes' to apply.`);
    } catch (err: any) {
      toast.error(`Failed to clone: ${err.message}`);
    }
  };

  const handleSave = (section: string, id?: string) => {
    toast.success(`Changes for ${section}${id ? ` item ${id}` : ""} saved successfully!`);
  };

  const handlePickImage = (section: string, field: string, id?: string) => {
    setPickerConfig({ type: "image", section, field, id, multi: false });
  };

  const handlePickMultiImage = (section: string, field: string, id?: string) => {
    setPickerConfig({ type: "image", section, field, id, multi: true });
  };

  const handlePickIcon = (section: string, field: string, id?: string) => {
    setPickerConfig({ type: "icon", section, field, id, multi: false });
  };

  const handlePickLink = (section: string, field: string, id?: string) => {
    setPickerConfig({ type: "link", section, field, id, multi: false });
  };

  const handlePickColor = (section: string, field: string, id?: string) => {
    setPickerConfig({ type: "color", section, field, id, multi: false });
  };

  const handleOpenCustomizer = () => {
    window.dispatchEvent(new CustomEvent("ss:openCustomizer"));
  };

  return (
    <LiveEditorProvider
      userRole={userRole}
      onUpdate={handleUpdate}
      onHide={handleHide}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onClone={handleClone}
      onSave={handleSave}
      onPickImage={handlePickImage}
      onPickMultiImage={handlePickMultiImage}
      onPickIcon={handlePickIcon}
      onPickLink={handlePickLink}
      onPickColor={handlePickColor}
      onOpenCustomizer={handleOpenCustomizer}
      handleSaveAll={handleSaveAll}
      handleDiscard={handleDiscard}
      pendingChanges={pendingChanges}
    >
      <div className="relative min-h-screen bg-background pb-10 pointer-events-auto">

        <div key={discardKey} className="pointer-events-auto relative">
          <Header />
          <HeroSection />
          <Suspense fallback={<SkeletonSection />}>
            <AboutSection />
            <ServicesSection />
            <ProductsSection />
            <ClientsSection />
            <TestimonialsSection />
            <WorldMap />
            <TechnologiesSection />

            <ContactSection />
            <Footer />
            <WhatsAppButton />
            <ScrollToTop />
            <CookieConsent />
          </Suspense>
        </div>
      </div>

      {Object.keys(pendingChanges).length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] flex gap-3 animate-in fade-in slide-in-from-bottom-5">
          <button
            onClick={handleDiscard}
            className="px-4 py-2.5 bg-background text-foreground border border-border/80 rounded-xl font-bold text-sm shadow-xl hover:bg-muted transition-all active:scale-95"
          >
            Discard
          </button>
          <button
            onClick={handleSaveAll}
            disabled={userRole === "viewer"}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all ${userRole === "viewer" ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "bg-secondary text-secondary-foreground shadow-secondary/20 hover:opacity-90 hover:scale-105 active:scale-95"}`}
          >
            <LucideIcons.Save size={16} /> Save Changes ({Object.keys(pendingChanges).length})
          </button>
        </div>
      )}
      {pickerConfig && (
        <PickerModal
          config={pickerConfig}
          onClose={() => setPickerConfig(null)}
          onSelect={(value) => {
            const finalValue = Array.isArray(value) ? value.join(",") : value;
            handleUpdate(pickerConfig.section, pickerConfig.field, finalValue, pickerConfig.id);
            setPickerConfig(null);
          }}
        />
      )}
      <UICustomizer />
    </LiveEditorProvider>
  );
};

const PickerModal = ({ config, onClose, onSelect }: {
  config: { type: "image" | "icon" | "link" | "color"; section: string; field: string; id?: string; multi?: boolean };
  onClose: () => void;
  onSelect: (val: string | string[]) => void;
}) => {
  const editor = useLiveEditor();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [currentAssets, setCurrentAssets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"manage" | "pick">(config.multi ? "manage" : "pick");
  const [manualValue, setManualValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualPathChange = (val: string) => {
    setManualValue(val);
    if (config.multi) {
      const assets = val.split(",").map(s => s.trim()).filter(Boolean);
      setCurrentAssets(assets);
      setSelected(assets);
    } else {
      setSelected(val ? [val] : []);
    }
  };

  const syncAssets = (next: string[]) => {
    setSelected(next);
    setCurrentAssets(next);
    setManualValue(next.join(","));
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    toast.info(`Uploading ${files.length} images...`);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `uploads/${file.name}`);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.data?.publicUrl) {
          const bustUrl = json.data.publicUrl.split("?")[0] + "?v=" + Date.now();
          uploadedUrls.push(bustUrl);
        }
      } catch (err) { console.error(err); }
    }

    if (uploadedUrls.length > 0) {
      syncAssets([...currentAssets, ...uploadedUrls]);
      toast.success(`Added ${uploadedUrls.length} images`);
    }
    e.target.value = "";
  };

  useEffect(() => {
    // For single pick, try to load current value into manual field
    if (!config.multi) {
      const pendingKey = config.id
        ? `${config.section}:${config.id}:${config.field}`
        : `${config.section}:${config.field}`;

      const pendingValue = editor?.pendingChanges[pendingKey];
      if (pendingValue !== undefined) {
        setManualValue(pendingValue);
        setSelected(pendingValue ? [pendingValue] : []);
        return;
      }

      let table = config.section;
      if (table === "clients") table = "client_logos";

      const url = config.id
        ? `/api/db/${table}?id=${config.id}&_single=1`
        : `/api/db/site_content?section_key=${config.section}&_single=1`;

      fetch(url)
        .then(r => r.json())
        .then(json => {
          if (json.data) {
            let val;
            if (!config.id && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch { /* ignore */ }
              }
              val = contentObj[config.field];
            } else {
              val = json.data[config.field];
            }

            if (val !== undefined) {
              setManualValue(val);
              setSelected(val ? [val] : []);
            }
          }
        });
    }
  }, [config.id, config.section, config.field, config.multi, editor?.pendingChanges]);


  useEffect(() => {
    if (config.multi) {
      const pendingKey = config.id
        ? `${config.section}:${config.id}:${config.field}`
        : `${config.section}:${config.field}`;

      const pendingValue = editor?.pendingChanges[pendingKey];
      if (pendingValue !== undefined) {
        const val = pendingValue;
        const assets = typeof val === "string" ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
        setCurrentAssets(assets);
        setSelected(assets);
        setManualValue(val);
        if (assets.length === 0) setViewMode("pick");
        return;
      }

      let table = config.section;
      if (table === "clients") table = "client_logos";

      const url = config.id
        ? `/api/db/${table}?id=${config.id}&_single=1`
        : `/api/db/site_content?section_key=${config.section}&_single=1`;

      fetch(url)
        .then(r => r.json())
        .then(json => {
          if (json.data) {
            let val;
            if (!config.id && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch { /* ignore */ }
              }
              val = contentObj[config.field];
            } else {
              val = json.data[config.field];
            }

            if (val !== undefined) {
              const assets = typeof val === "string" ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
              setCurrentAssets(assets);
              setSelected(assets);
              setManualValue(val);
              if (assets.length === 0) setViewMode("pick");
            }
          }
        });
    }
  }, [config.id, config.section, config.field, config.multi, editor?.pendingChanges]);


  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-card border border-border/60 shadow-xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            {config.type === "image" ? (
              <><LucideIcons.Image size={18} /> Pick Image</>
            ) : config.type === "icon" ? (
              <><LucideIcons.Zap size={18} /> Pick Icon</>
            ) : config.type === "color" ? (
              <><LucideIcons.Palette size={18} /> Pick Color</>
            ) : (
              <><LucideIcons.Target size={18} /> Pick Link / Target</>
            )}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="p-3 border-b border-border/50 bg-muted/10 space-y-2">
          {config.type !== "image" && (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder={`Search ${config.type}s...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-1.5 outline-none focus:border-secondary transition-all text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Manual {config.type === "icon" ? "SVG Code" : config.type === "color" ? "HEX Color" : "Asset Path"}</p>
            <div className="flex gap-2">
              {config.type === "icon" ? (
                <textarea
                  value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  placeholder="Paste <svg> code here..."
                  className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-1.5 outline-none focus:border-secondary transition-all text-[11px] font-mono min-h-[60px]"
                />
              ) : config.type === "color" ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="color"
                    value={manualValue.startsWith("#") ? manualValue : "#3b82f6"}
                    onChange={e => setManualValue(e.target.value)}
                    className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={manualValue}
                    onChange={e => setManualValue(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-1.5 outline-none focus:border-secondary transition-all text-xs font-mono"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={manualValue}
                    onChange={e => handleManualPathChange(e.target.value)}
                    placeholder={config.type === "image" ? (config.multi ? "Enter comma separated paths: /img1.jpg, /img2.jpg" : "/assets/uploads/image.jpg") : "Target Link"}
                    className="w-full bg-background border border-border/60 rounded-lg px-3 py-1.5 outline-none focus:border-secondary transition-all text-xs font-mono shadow-inner"
                  />
                  {config.multi && (
                    <p className="text-[9px] text-muted-foreground px-1 italic">Type or paste multiple image URLs separated by commas to update the list below.</p>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.jpg,.jpeg,.png,.svg,.webp,.ico"
                className="hidden"
                onChange={handleLocalUpload}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {config.multi && (
            <div className="mb-4 space-y-3">

              <div className="flex flex-wrap gap-2 border-b border-border/50 pb-4">
                {currentAssets.map((asset, idx) => (
                  <div key={asset + idx} className="group relative h-[100px] w-fit min-w-[100px] max-w-[180px] rounded-lg overflow-hidden border border-border/40 bg-muted/10 shadow-sm flex items-center justify-center">
                    <img src={asset} alt="" className="h-full w-auto object-contain bg-black/5" />
                    <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-emerald-500/90 text-white text-[8px] font-black uppercase rounded shadow-sm backdrop-blur-sm">Live</div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => window.open(asset, "_blank")}
                        className="p-1 bg-blue-500 text-white rounded hover:scale-110 transition-transform"
                        title="View Full Image"
                      >
                        <LucideIcons.Eye size={10} />
                      </button>
                      <button
                        onClick={() => {
                          syncAssets(currentAssets.filter((_, i) => i !== idx));
                        }}
                        className="p-1 bg-white/20 text-white rounded hover:bg-white/30 transition-all"
                        title="Remove from selection"
                      >
                        <LucideIcons.X size={10} />
                      </button>
                      <button
                        onClick={() => {
                          if (idx > 0) {
                            const next = [...currentAssets];
                            [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                            syncAssets(next);
                          }
                        }}
                        className="p-1 bg-secondary text-secondary-foreground rounded hover:scale-110 transition-transform"
                        title="Move Up"
                      >
                        <LucideIcons.ChevronLeft size={10} />
                      </button>
                      <button
                        onClick={() => {
                          if (idx < currentAssets.length - 1) {
                            const next = [...currentAssets];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            syncAssets(next);
                          }
                        }}
                        className="p-1 bg-secondary text-secondary-foreground rounded hover:scale-110 transition-transform"
                        title="Move Down"
                      >
                        <LucideIcons.ChevronRight size={10} />
                      </button>
                    </div>
                  </div>
                ))}
                {currentAssets.length === 0 && (
                  <div className="col-span-full py-6 text-center border border-dashed border-border/60 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">No images in gallery yet. Upload or browse to add some.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">
              {config.type === "image" ? "Upload & Preview" : "Browse All Assets"}
            </p>
            {config.type === "image" ? (
              <ImageGrid
                section={config.section}
                onSelect={(v) => {
                  if (config.multi) {
                    if (Array.isArray(v)) {
                      const next = [...selected, ...v.filter(url => !selected.includes(url))];
                      syncAssets(next);
                    } else {
                      const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
                      syncAssets(next);
                    }
                  } else {
                    const val = Array.isArray(v) ? v[0] : v;
                    setManualValue(val);
                    setSelected([val]);
                  }
                }}
                search={search}
                multi={config.multi}
                selected={selected}
              />
            ) : config.type === "icon" ? (
              <IconGrid onSelect={(v) => { setManualValue(v); }} search={search} />
            ) : config.type === "color" ? (
              <ColorGrid onSelect={(v) => { setManualValue(v); }} search={search} />
            ) : (
              <LinkPicker onSelect={(v) => { setManualValue(v); }} search={search} />
            )}
          </>
        </div>

        {!config.multi ? (
          <div className="p-3 border-t border-border/50 flex items-center justify-between bg-muted/10">
            <span className="text-[10px] font-medium text-muted-foreground">{manualValue ? "Selection ready" : "No selection"}</span>
            <button
              onClick={() => onSelect(manualValue)}
              disabled={!manualValue || editor?.userRole === "viewer"}
              className="px-5 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-[11px] font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Changes
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-border/50 flex items-center justify-between bg-muted/10">
            <span className="text-[10px] font-medium text-muted-foreground">{selected.length} items selected</span>
            <button
              onClick={() => onSelect(selected)}
              disabled={selected.length === 0 || editor?.userRole === "viewer"}
              className="px-5 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-[11px] font-bold hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


const ImageGrid = ({ section, onSelect, search, multi, selected }: {
  section: string;
  onSelect: (v: string | string[]) => void;
  search: string;
  multi?: boolean;
  selected?: string[];
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(selected && selected.length > 0 ? selected[0] : null);
  const folder = "uploads";

  useEffect(() => {
    setUploadedUrl(selected && selected.length > 0 ? selected[0] : null);
  }, [selected]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `${folder}/${file.name}`);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        const bustUrl = json.data.publicUrl.split("?")[0] + "?v=" + Date.now();
        newUrls.push(bustUrl);
      } catch (err: any) {
        toast.error(`Upload failed for ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    e.target.value = "";

    if (newUrls.length > 0) {
      toast.success(`${newUrls.length} image(s) uploaded successfully`);
      if (multi) {
        onSelect(newUrls);
      } else {
        setUploadedUrl(newUrls[newUrls.length - 1]);
        onSelect(newUrls[newUrls.length - 1]);
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 items-center">
      <label className="group relative h-[120px] w-full flex flex-col items-center justify-center border border-dashed border-border/80 bg-muted/5 rounded-xl hover:border-secondary hover:bg-secondary/10 cursor-pointer transition-all shadow-sm">
        <input type="file" className="hidden" accept="image/*,.jpg,.jpeg,.png,.svg,.webp,.ico" multiple={multi} onChange={handleUpload} disabled={uploading} />
        {uploading ? (
          <LoadingSpinner />
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/70 group-hover:text-secondary mb-2 transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 group-hover:text-secondary transition-colors text-center px-2">Upload Image</span>
          </>
        )}
      </label>

      {uploadedUrl && !multi ? (
        <div
          onClick={() => onSelect(uploadedUrl)}
          className="group relative h-[120px] w-full bg-muted/20 rounded-xl overflow-hidden border border-secondary/30 ring-2 ring-secondary/50 ring-offset-2 ring-offset-background cursor-pointer flex items-center justify-center shadow-md transition-all hover:ring-secondary"
        >
          <img src={uploadedUrl} alt="Uploaded Image" className="h-full w-auto max-w-full object-contain transition-transform group-hover:scale-105" />

          <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-emerald-500/90 text-white text-[8px] font-black uppercase rounded shadow-sm backdrop-blur-sm">
            Selected
          </div>

          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(uploadedUrl, "_blank");
              }}
              className="p-1 bg-blue-500 text-white rounded hover:scale-110 transition-transform"
              title="View Full Image"
            >
              <LucideIcons.Eye size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadedUrl(null);
                onSelect("");
              }}
              className="p-1 bg-destructive text-white rounded hover:scale-110 transition-transform"
              title="Clear Image Selection"
            >
              <LucideIcons.Trash2 size={12} />
            </button>
          </div>

          <div className="absolute inset-0 rounded-xl pointer-events-none" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 border border-dashed border-border/40 rounded-xl bg-muted/5 h-[120px] shadow-inner w-full">
          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider text-center">No Image Selected</span>
        </div>
      )}
    </div>
  );
};

const ALL_ICONS = ["Database", "Users", "Anchor", "Building2", "Plane", "Star", "Target", "Award", "Globe", "Cloud", "Cpu", "Code", "Server", "Shield", "Zap", "Layout", "Smartphone", "Search", "Mail", "Phone", "MapPin", "ChevronRight", "ArrowRight", "Play", "Pause", "Check", "X", "Info", "AlertCircle", "Facebook", "Twitter", "Linkedin", "Instagram", "Github", "Youtube", "Viber"];

const LinkPicker = ({ onSelect, search }: { onSelect: (v: string) => void; search: string }) => {
  const PRESETS = [
    { label: "Home / Top", value: "#home" },
    { label: "About Us", value: "#about" },
    { label: "Services", value: "#services" },
    { label: "Products", value: "#products" },
    { label: "Our Clients", value: "#portfolio" },
    { label: "Testimonials", value: "#testimonials" },
    { label: "Global Presence", value: "#global-reach" },
    { label: "Technologies", value: "#technologies" },
    { label: "Careers", value: "#careers" },
    { label: "Contact Us", value: "#contact" },
    { label: "Viber Chat", value: "viber" },
  ];

  const filtered = PRESETS.filter(p => p.label.toLowerCase().includes(search.toLowerCase()) || p.value.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {filtered.map(p => (
        <button
          key={p.value}
          onClick={() => onSelect(p.value)}
          className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/10 hover:bg-blue-500/10 hover:border-blue-500 transition-all group text-left shadow-sm"
        >
          <div>
            <p className="text-[11px] font-bold text-foreground">{p.label}</p>
            <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{p.value}</p>
          </div>
          <LucideIcons.ChevronRight size={12} className="text-muted-foreground group-hover:text-blue-500" />
        </button>
      ))}
    </div>
  );
};

const IconGrid = ({ onSelect, search }: { onSelect: (v: string) => void; search: string }) => {
  const filtered = ALL_ICONS.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {filtered.map(name => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className="flex flex-col items-center justify-center p-2 rounded-lg border border-border/40 bg-muted/10 hover:bg-secondary/10 hover:border-secondary transition-all group shadow-sm"
        >
          <div className="text-muted-foreground group-hover:text-secondary mb-1 transition-colors">
            <LucideIcon name={name} size={18} />
          </div>
          <span className="text-[9px] font-bold text-muted-foreground truncate w-full text-center">{name}</span>
        </button>
      ))}
    </div>
  );
};

const ColorGrid = ({ onSelect, search }: { onSelect: (v: string) => void; search: string }) => {
  const PRESETS = [
    { name: "Secondary", value: "hsl(var(--secondary))" },
    { name: "Primary", value: "hsl(var(--primary))" },
    { name: "Green", value: "#16a34a" },
    { name: "Blue", value: "#2563eb" },
    { name: "Purple", value: "#9333ea" },
    { name: "Orange", value: "#ea580c" },
    { name: "Red", value: "#dc2626" },
    { name: "Pink", value: "#db2777" },
    { name: "Emerald", value: "#10b981" },
    { name: "Sky", value: "#0ea5e9" },
    { name: "Indigo", value: "#4f46e5" },
    { name: "Slate", value: "#475569" },
    { name: "Gold", value: "#ca8a04" },
  ];

  const filtered = PRESETS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.value.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {filtered.map(p => (
        <button
          key={p.value}
          onClick={() => onSelect(p.value)}
          className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-secondary/10 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg shadow-sm border border-white/20" style={{ background: p.value }} />
          <span className="text-[0.6875rem] font-bold text-muted-foreground truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );
};

const LucideIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon size={size} />;
};

export default LiveEditor;

