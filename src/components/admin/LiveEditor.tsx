import React, { Suspense, lazy, useState, useEffect, useRef } from "react";
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
const AboutSection       = lazy(() => import("@/components/AboutSection"));
const ServicesSection    = lazy(() => import("@/components/ServicesSection"));
const ProductsSection    = lazy(() => import("@/components/ProductsSection"));
const ClientsSection     = lazy(() => import("@/components/ClientsSection"));
const WorldMap           = lazy(() => import("@/components/WorldMap"));
const TestimonialsSection= lazy(() => import("@/components/TestimonialsSection"));
const CareersSection     = lazy(() => import("@/components/CareersSection"));
const TechnologiesSection = lazy(() => import("@/components/TechnologiesSection"));
const ContactSection     = lazy(() => import("@/components/ContactSection"));
const Footer             = lazy(() => import("@/components/Footer"));
const WhatsAppButton     = lazy(() => import("@/components/WhatsAppButton"));
const ScrollToTop        = lazy(() => import("@/components/ScrollToTop"));
const CookieConsent      = lazy(() => import("@/components/CookieConsent"));

const SkeletonSection = () => (
  <div className="w-full h-64 bg-muted/10 animate-pulse flex items-center justify-center">
    <LoadingSpinner size={24} />
  </div>
);

const LiveEditor = () => {
  const { data: settings } = useSiteSettings();
  
  useBatchQuery([
    { table: "client_logos",  order: "sort_order" },
    { table: "services",      order: "sort_order" },
    { table: "technologies",  order: "sort_order" },
    { table: "products",      order: "sort_order" },
    { table: "career_jobs",   order: "sort_order" },
    { table: "hero_stats",    order: "sort_order" },
    { table: "testimonials",  order: "created_at", asc: false },
  ]);

  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
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
    const entries = Object.entries(pendingChanges);
    if (entries.length === 0) {
      toast.info("No changes to save");
      return;
    }

    const toastId = toast.loading("Saving all changes...");
    try {
        // Group changes by section and id to minimize requests
        const grouped: Record<string, any> = {};
        const networkChanges: Record<string, Record<string, any>> = {}; // id -> { field: value }
        let networkVisibilityChange: boolean | undefined = undefined;
        const presenceChanges: Record<string, Record<string, any>> = {}; // locationName -> { field: value }

        for (const [key, value] of entries) {
            const parts = key.split(':');
            if (parts[0] === "our_network") {
                if (parts.length === 3) {
                    const [_, id, f] = parts;
                    if (!networkChanges[id]) networkChanges[id] = {};
                    networkChanges[id][f] = value;
                } else if (parts.length === 2 && parts[1] === "is_visible") {
                    networkVisibilityChange = value;
                }
            } else if (parts[0] === "global_presence") {
                if (parts.length === 3) {
                    const [_, id, f] = parts;
                    if (!presenceChanges[id]) presenceChanges[id] = {};
                    presenceChanges[id][f] = value;
                }
            } else {
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
        }

        // Process our_network changes specially
        if (Object.keys(networkChanges).length > 0 || networkVisibilityChange !== undefined) {
            const getResp = await fetch("/api/db/site_content");
            const getData = await getResp.json();
            const row = getData.data?.find((r: any) => r.section_key === "our_network");
            let companies = [];
            let is_visible = true;
            if (row) {
                let parsed = row.content;
                if (typeof parsed === "string") {
                    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
                }
                companies = Array.isArray(parsed.companies) ? parsed.companies : [];
                is_visible = parsed.is_visible !== false;
            }
            
            // Apply updates
            companies = companies.map((c: any) => {
                const changes = networkChanges[c.id];
                if (changes) {
                    return { ...c, ...changes };
                }
                return c;
            });

            if (networkVisibilityChange !== undefined) {
                is_visible = networkVisibilityChange;
            }

            // Save back
            const resp = await fetch("/api/db/site_content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section_key: "our_network", content: { companies, is_visible } })
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error.message);
        }

        // Process global_presence changes specially
        if (Object.keys(presenceChanges).length > 0) {
            const getResp = await fetch("/api/db/site_content");
            const getData = await getResp.json();
            const row = getData.data?.find((r: any) => r.section_key === "global_presence");
            let locations = [];
            if (row) {
                let parsed = row.content;
                if (typeof parsed === "string") {
                    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
                }
                locations = Array.isArray(parsed.locations) ? parsed.locations : [];
            }
            if (locations.length === 0) {
                locations = [
                    { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, clients: "HQ — 40+ clients", description: "Our headquarters serving government and private sector clients across the Maldives.", flag: "🇲🇻", landmark: "🏝️ Overwater Villas" },
                    { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, clients: "RCSC Bhutan", description: "Supporting the Royal Civil Service Commission with digital transformation.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
                    { name: "Tamilnadu, India", lat: 9.9195, lng: 78.1193, clients: "Regional Support", description: "Our hub for technology development and regional support in Southern India.", flag: "🇮🇳", landmark: "🏛️ Madurai Meenatchi Amman Temple" },
                ];
            }
            
            // Apply updates
            locations = locations.map((loc: any) => {
                const changes = presenceChanges[loc.name];
                if (changes) {
                    const nextLoc = { ...loc, ...changes };
                    if (nextLoc.lat !== undefined) nextLoc.lat = parseFloat(nextLoc.lat) || 0;
                    if (nextLoc.lng !== undefined) nextLoc.lng = parseFloat(nextLoc.lng) || 0;
                    return nextLoc;
                }
                return loc;
            });

            // Save back
            const resp = await fetch("/api/db/site_content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ section_key: "global_presence", content: { locations } })
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error.message);
        }

        for (const g of Object.values(grouped)) {
            const dbSec = g.section === "clients" ? "client_logos" : g.section;
            let endpoint = g.id ? `/api/db/${dbSec}?id=${g.id}` : `/api/db/site_content`;
            let method = g.id ? "PATCH" : "POST";
            let body = g.id ? g.data : { section_key: g.section, content: g.data };

            const resp = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const json = await resp.json();
            if (json.error) throw new Error(json.error.message);
        }

        setPendingChanges({});
        toast.success("All changes saved successfully", { id: toastId });
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    } catch (err: any) {
        toast.error(`Failed to save changes: ${err.message}`, { id: toastId });
    }
  };

  const handleDiscard = () => {
    if (confirm("Are you sure you want to discard all unsaved changes?")) {
        setPendingChanges({});
        toast.info("Changes discarded");
    }
  };

  const handleHide = (section: string, id: string | undefined, currentVisibility: boolean) => {
    const nextVisibility = !currentVisibility;
    handleUpdate(section, "is_visible", nextVisibility, id);
    toast.success("Visibility change queued. Click 'Save All Changes' to apply.");
  };

  const handleDelete = async (section: string, id: string) => {
    if (section === "global_presence") {
      if (!confirm("Are you sure you want to delete this location?")) return;
      try {
        const getResp = await fetch("/api/db/site_content");
        const getData = await getResp.json();
        const row = getData.data?.find((r: any) => r.section_key === "global_presence");
        let locations = [];
        if (row) {
          let parsed = row.content;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
          }
          locations = Array.isArray(parsed.locations) ? parsed.locations : [];
        }
        if (locations.length === 0) {
          locations = [
            { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, clients: "HQ — 40+ clients", description: "Our headquarters serving government and private sector clients across the Maldives.", flag: "🇲🇻", landmark: "🏝️ Overwater Villas" },
            { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, clients: "RCSC Bhutan", description: "Supporting the Royal Civil Service Commission with digital transformation.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
            { name: "Tamilnadu, India", lat: 9.9195, lng: 78.1193, clients: "Regional Support", description: "Our hub for technology development and regional support in Southern India.", flag: "🇮🇳", landmark: "🏛️ Madurai Meenatchi Amman Temple" },
          ];
        }

        locations = locations.filter((l: any) => l.name !== id);

        const resp = await fetch("/api/db/site_content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_key: "global_presence", content: { locations } })
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);

        toast.success("Location deleted successfully");
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      } catch (err: any) {
        toast.error(`Failed to delete location: ${err.message}`);
      }
      return;
    }
    if (section === "our_network") {
      if (!confirm("Are you sure you want to delete this company?")) return;
      try {
        const getResp = await fetch("/api/db/site_content");
        const getData = await getResp.json();
        const row = getData.data?.find((r: any) => r.section_key === "our_network");
        let companies = [];
        let is_visible = true;
        if (row) {
          let parsed = row.content;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
          }
          companies = Array.isArray(parsed.companies) ? parsed.companies : [];
          is_visible = parsed.is_visible !== false;
        }

        companies = companies.filter((c: any) => c.id !== id);

        const resp = await fetch("/api/db/site_content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_key: "our_network", content: { companies, is_visible } })
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);

        toast.success("Company removed from network");
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      } catch (err: any) {
        toast.error(`Failed to delete: ${err.message}`);
      }
      return;
    }
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
        const dbSection = section === "clients" ? "client_logos" : section;
        // Fetch the item first to see if it has associated images
        const getResp = await fetch(`/api/db/${dbSection}?id=${id}&_single=1`);
        const getData = await getResp.json();
        const item = getData.data;

        // Delete from DB
        const resp = await fetch(`/api/db/${dbSection}?id=${id}`, {
            method: "DELETE"
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);

        // If deletion was successful, try to delete associated images if they are in /assets/uploads/
        if (item) {
          const imageFields = ["image_url", "logo_url", "avatar_url", "hero_image"];
          for (const field of imageFields) {
            const url = item[field];
            if (url && typeof url === "string" && url.includes("/assets/uploads/")) {
              const filename = url.split("/").pop();
              if (filename) {
                await fetch(`/api/assets?filename=${filename}`, { method: "DELETE" }).catch(() => {});
              }
            }
          }
          // Handle multi-image fields (like hero_images)
          const multiImageFields = ["hero_images", "images"];
          for (const field of multiImageFields) {
            const urls = item[field];
            if (urls && typeof urls === "string") {
              const paths = urls.split(",").map(u => u.trim());
              for (const path of paths) {
                if (path.includes("/assets/uploads/")) {
                  const filename = path.split("/").pop();
                  if (filename) {
                    await fetch(`/api/assets?filename=${filename}`, { method: "DELETE" }).catch(() => {});
                  }
                }
              }
            }
          }
        }

        toast.success(`Deleted from ${section} and cleaned up assets`);
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    } catch (err: any) {
        toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleAdd = async (section: string) => {
    if (section === "hero") {
      handlePickMultiImage("hero", "hero_images");
      return;
    }
    if (section === "global_presence") {
      try {
        const getResp = await fetch("/api/db/site_content");
        const getData = await getResp.json();
        const row = getData.data?.find((r: any) => r.section_key === "global_presence");
        let locations = [];
        if (row) {
          let parsed = row.content;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
          }
          locations = Array.isArray(parsed.locations) ? parsed.locations : [];
        }
        if (locations.length === 0) {
          locations = [
            { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, clients: "HQ — 40+ clients", description: "Our headquarters serving government and private sector clients across the Maldives.", flag: "🇲🇻", landmark: "🏝️ Overwater Villas" },
            { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, clients: "RCSC Bhutan", description: "Supporting the Royal Civil Service Commission with digital transformation.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
            { name: "Tamilnadu, India", lat: 9.9195, lng: 78.1193, clients: "Regional Support", description: "Our hub for technology development and regional support in Southern India.", flag: "🇮🇳", landmark: "🏛️ Madurai Meenatchi Amman Temple" },
          ];
        }

        const newLoc = {
          name: `New Location ${locations.length + 1}, Country`,
          lat: 4.1755,
          lng: 73.5093,
          clients: "New Clients details",
          description: "New location active operations and technical details.",
          flag: "📍",
          landmark: "New Landmark",
          is_visible: true
        };
        locations.push(newLoc);

        const resp = await fetch("/api/db/site_content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_key: "global_presence", content: { locations } })
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);

        toast.success("Added new location successfully!");
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      } catch (err: any) {
        toast.error(`Failed to add location: ${err.message}`);
      }
      return;
    }
    if (section === "our_network") {
      try {
        const getResp = await fetch("/api/db/site_content");
        const getData = await getResp.json();
        const row = getData.data?.find((r: any) => r.section_key === "our_network");
        let companies = [];
        let is_visible = true;
        if (row) {
          let parsed = row.content;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
          }
          companies = Array.isArray(parsed.companies) ? parsed.companies : [];
          is_visible = parsed.is_visible !== false;
        }

        const newCompany = {
          id: Date.now().toString(),
          name: "New Partner Company",
          subtitle: "Technology Affiliate",
          desc: "Brief description of the partner company, services, and strategic alignment.",
          href: "https://",
          logo_url: "/assets/clients/oblu.png",
          accent: "#3b82f6",
          is_visible: true,
          flag: "🏢"
        };
        companies.push(newCompany);

        const resp = await fetch("/api/db/site_content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_key: "our_network", content: { companies, is_visible } })
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);

        toast.success("Added new company to network!");
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      } catch (err: any) {
        toast.error(`Failed to add company: ${err.message}`);
      }
      return;
    }
    try {
        const defaults: any = { is_visible: true, sort_order: 0 };
        if (section === "hero_stats") { defaults.count = "00"; defaults.label = "Label"; defaults.suffix = "+"; }
        else if (section === "services") { defaults.title = "New Service"; defaults.description = "Service description"; defaults.badge = "Service"; }
        else if (section === "products") { defaults.name = "New Product"; defaults.description = "Product description"; defaults.tagline = "Premium"; defaults.extra_text = "Feature 1, Feature 2, Feature 3, Feature 4"; }
        else if (section === "client_logos") { defaults.name = "New Client"; defaults.logo_url = ""; }
        else if (section === "technologies") { defaults.name = "New Technology"; defaults.description = "Brief description of the tech stack."; defaults.category = "General"; }
        else { defaults.title = "New Item"; defaults.name = "New Item"; }

        const resp = await fetch(`/api/db/${section}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(defaults)
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);
        toast.success(`Added new item to ${section}`);
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
    } catch (err: any) {
        toast.error(`Failed to add: ${err.message}`);
    }
  };

  const handleClone = async (section: string, id: string) => {
    if (section === "global_presence") {
      try {
        const getResp = await fetch("/api/db/site_content");
        const getData = await getResp.json();
        const row = getData.data?.find((r: any) => r.section_key === "global_presence");
        let locations = [];
        if (row) {
          let parsed = row.content;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
          }
          locations = Array.isArray(parsed.locations) ? parsed.locations : [];
        }
        if (locations.length === 0) {
          locations = [
            { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, clients: "HQ — 40+ clients", description: "Our headquarters serving government and private sector clients across the Maldives.", flag: "🇲🇻", landmark: "🏝️ Overwater Villas" },
            { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, clients: "RCSC Bhutan", description: "Supporting the Royal Civil Service Commission with digital transformation.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
            { name: "Tamilnadu, India", lat: 9.9195, lng: 78.1193, clients: "Regional Support", description: "Our hub for technology development and regional support in Southern India.", flag: "🇮🇳", landmark: "🏛️ Madurai Meenatchi Amman Temple" },
          ];
        }

        const itemToClone = locations.find((l: any) => l.name === id);
        if (!itemToClone) throw new Error("Location not found");

        const clonedName = `${itemToClone.name.split(',')[0]} (Clone), ${itemToClone.name.split(',')[1] || ''}`;
        const cloned = {
          ...itemToClone,
          name: clonedName,
        };
        locations.push(cloned);

        const resp = await fetch("/api/db/site_content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_key: "global_presence", content: { locations } })
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);

        toast.success("Cloned location successfully!");
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
      } catch (err: any) {
        toast.error(`Failed to clone location: ${err.message}`);
      }
      return;
    }
    try {
        const getResp = await fetch(`/api/db/${section}?id=${id}&_single=1`);
        const getData = await getResp.json();
        if (getData.error) throw new Error(getData.error.message);

        const newItem = { ...getData.data };
        delete newItem.id;
        delete newItem.created_at;
        newItem.sort_order = (newItem.sort_order || 0) + 1;
        if (newItem.title) newItem.title += " (Clone)";
        if (newItem.name) newItem.name += " (Clone)";

        const resp = await fetch(`/api/db/${section}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newItem)
        });
        const json = await resp.json();
        if (json.error) throw new Error(json.error.message);
        toast.success(`Cloned item in ${section}`);
        window.dispatchEvent(new CustomEvent("ss:contentSaved"));
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

        <div className="pointer-events-auto relative">
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
                <CareersSection />
                <ContactSection />
                <Footer />
                <WhatsAppButton />
                <ScrollToTop />
                <CookieConsent />
            </Suspense>
        </div>
      </div>
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
        if (json.data?.publicUrl) uploadedUrls.push(json.data.publicUrl);
      } catch (err) { console.error(err); }
    }

    if (uploadedUrls.length > 0) {
      syncAssets([...currentAssets, ...uploadedUrls]);
      toast.success(`Added ${uploadedUrls.length} images`);
    }
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

      let url = config.id 
        ? `/api/db/${table}?id=${config.id}&_single=1`
        : `/api/db/site_content?section_key=${config.section}&_single=1`;
      
      if (config.section === "our_network") {
        url = `/api/db/site_content?section_key=our_network&_single=1`;
      }
      if (config.section === "global_presence") {
        url = `/api/db/site_content?section_key=global_presence&_single=1`;
      }
      
      fetch(url)
        .then(r => r.json())
        .then(json => {
          if (config.section === "our_network") {
            let companies = [];
            if (json.data && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch {}
              }
              companies = Array.isArray(contentObj.companies) ? contentObj.companies : [];
            }
            const co = companies.find((c: any) => c.id === config.id);
            if (co && co[config.field]) {
              setManualValue(co[config.field]);
              setSelected(co[config.field] ? [co[config.field]] : []);
            }
            return;
          }
          if (config.section === "global_presence") {
            let locations = [];
            if (json.data && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch {}
              }
              locations = Array.isArray(contentObj.locations) ? contentObj.locations : [];
            }
            const loc = locations.find((l: any) => l.name === config.id);
            if (loc && loc[config.field]) {
              setManualValue(loc[config.field]);
              setSelected(loc[config.field] ? [loc[config.field]] : []);
            }
            return;
          }

          if (json.data) {
            let val;
            if (!config.id && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch {}
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

      let url = config.id 
        ? `/api/db/${table}?id=${config.id}&_single=1`
        : `/api/db/site_content?section_key=${config.section}&_single=1`;

      if (config.section === "our_network") {
        url = `/api/db/site_content?section_key=our_network&_single=1`;
      }
      if (config.section === "global_presence") {
        url = `/api/db/site_content?section_key=global_presence&_single=1`;
      }

      fetch(url)
        .then(r => r.json())
        .then(json => {
          if (config.section === "our_network") {
            let companies = [];
            if (json.data && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch {}
              }
              companies = Array.isArray(contentObj.companies) ? contentObj.companies : [];
            }
            const co = companies.find((c: any) => c.id === config.id);
            if (co && co[config.field]) {
              const val = co[config.field];
              const assets = typeof val === "string" ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
              setCurrentAssets(assets);
              setSelected(assets);
              setManualValue(val);
              if (assets.length === 0) setViewMode("pick");
            }
            return;
          }
          if (config.section === "global_presence") {
            let locations = [];
            if (json.data && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch {}
              }
              locations = Array.isArray(contentObj.locations) ? contentObj.locations : [];
            }
            const loc = locations.find((l: any) => l.name === config.id);
            if (loc && loc[config.field]) {
              const val = loc[config.field];
              const assets = typeof val === "string" ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
              setCurrentAssets(assets);
              setSelected(assets);
              setManualValue(val);
              if (assets.length === 0) setViewMode("pick");
            }
            return;
          }

          if (json.data) {
            let val;
            if (!config.id && json.data.content) {
              let contentObj = json.data.content;
              if (typeof contentObj === "string") {
                try { contentObj = JSON.parse(contentObj); } catch {}
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          {config.type !== "image" && (
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text" 
                placeholder={`Search ${config.type}s...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2 outline-none focus:border-secondary transition-all text-sm"
              />
            </div>
          )}
          
          <div className="space-y-1.5">
            <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest px-1">Manual {config.type === "icon" ? "SVG Code" : config.type === "color" ? "HEX Color" : "Asset Path"}</p>
            <div className="flex gap-2">
              {config.type === "icon" ? (
                <textarea 
                  value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  placeholder="Paste <svg> code here..."
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2 outline-none focus:border-secondary transition-all text-xs font-mono min-h-[80px]"
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
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 outline-none focus:border-secondary transition-all text-xs font-mono"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2">
                  <input 
                    type="text" 
                    value={manualValue}
                    onChange={e => handleManualPathChange(e.target.value)}
                    placeholder={config.type === "image" ? (config.multi ? "Enter comma separated paths: /img1.jpg, /img2.jpg" : "/assets/uploads/image.jpg") : "Target Link"}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-all text-xs font-mono shadow-inner"
                  />
                  {config.multi && (
                    <p className="text-[10px] text-muted-foreground px-1 italic">Type or paste multiple image URLs separated by commas to update the list below.</p>
                  )}
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                accept="image/*"
                className="hidden" 
                onChange={handleLocalUpload}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {config.multi && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between bg-secondary/5 p-3 rounded-xl border border-secondary/20">
                <div>
                  <p className="text-[0.625rem] font-black text-secondary uppercase tracking-widest">Gallery Content</p>
                  <p className="text-xs text-muted-foreground">{currentAssets.length} images active</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode(viewMode === "manage" ? "pick" : "manage")}
                    className="px-4 py-2 bg-muted text-foreground rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-muted/80 transition-all border border-border"
                  >
                    {viewMode === "manage" ? <><LucideIcons.Search size={16} /> Browse Server</> : <><LucideIcons.LayoutGrid size={16} /> Manage Gallery</>}
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                  >
                    <LucideIcons.Plus size={16} /> Upload New
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-border pb-6">
                {currentAssets.map((asset, idx) => (
                  <div key={asset + idx} className="group relative aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted/20 shadow-sm">
                    <img src={asset} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-black uppercase rounded-sm shadow-sm backdrop-blur-sm">Live</div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => window.open(asset, "_blank")}
                        className="p-1.5 bg-blue-500 text-white rounded-lg hover:scale-110 transition-transform" 
                        title="View Full Image"
                      >
                        <LucideIcons.Eye size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          syncAssets(currentAssets.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all" 
                        title="Remove from selection"
                      >
                        <LucideIcons.X size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          if (idx > 0) {
                            const next = [...currentAssets];
                            [next[idx], next[idx-1]] = [next[idx-1], next[idx]];
                            syncAssets(next);
                          }
                        }}
                        className="p-1.5 bg-secondary text-secondary-foreground rounded-lg hover:scale-110 transition-transform" 
                        title="Move Up"
                      >
                        <LucideIcons.ChevronLeft size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          if (idx < currentAssets.length - 1) {
                            const next = [...currentAssets];
                            [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
                            syncAssets(next);
                          }
                        }}
                        className="p-1.5 bg-secondary text-secondary-foreground rounded-lg hover:scale-110 transition-transform" 
                        title="Move Down"
                      >
                        <LucideIcons.ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {currentAssets.length === 0 && (
                  <div className="col-span-full py-8 text-center border-2 border-dashed border-border rounded-xl">
                    <p className="text-sm text-muted-foreground">No images in gallery yet. Upload or browse to add some.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(viewMode === "pick" || !config.multi) && (
            <>
              <p className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-4">Browse All Assets</p>
              {config.type === "image" ? (
                <ImageGrid 
                  section={config.section} 
                  onSelect={(v) => {
                    if (config.multi) {
                      const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
                      syncAssets(next);
                    } else {
                      setManualValue(v);
                      setSelected([v]);
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
          )}
        </div>

        {!config.multi ? (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">{manualValue ? "Selection ready" : "No selection"}</span>
            <button 
              onClick={() => onSelect(manualValue)}
              disabled={!manualValue}
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              Apply Changes
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">{selected.length} items selected</span>
            <button 
              onClick={() => onSelect(selected)}
              disabled={selected.length === 0}
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
  onSelect: (v: string) => void; 
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
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
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
      
      toast.success("Image uploaded successfully");
      setUploadedUrl(json.data.publicUrl);
      onSelect(json.data.publicUrl); // Auto select uploaded image
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="group relative aspect-video flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl hover:border-secondary hover:bg-secondary/5 cursor-pointer transition-all min-h-[120px]">
        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
        {uploading ? (
          <LoadingSpinner size={24} />
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-secondary mb-2 transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-secondary transition-colors">Upload New Image</span>
          </>
        )}
      </label>

      {uploadedUrl ? (
        <div 
          onClick={() => onSelect(uploadedUrl)}
          className="group relative aspect-video bg-muted rounded-xl overflow-hidden border border-secondary ring-2 ring-secondary/50 ring-inset cursor-pointer min-h-[120px]"
        >
          <img src={uploadedUrl} alt="Uploaded Image" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-black uppercase rounded-sm shadow-sm backdrop-blur-sm">
            Selected
          </div>
          
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(uploadedUrl, "_blank");
              }}
              className="p-1.5 bg-blue-500 text-white rounded-lg hover:scale-110 transition-transform" 
              title="View Full Image"
            >
              <LucideIcons.Eye size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setUploadedUrl(null);
                onSelect("");
              }}
              className="p-1.5 bg-destructive text-white rounded-lg hover:scale-110 transition-transform" 
              title="Clear Image Selection"
            >
              <LucideIcons.Trash2 size={14} />
            </button>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 backdrop-blur-sm truncate">
            <p className="text-[0.625rem] text-white font-medium truncate font-mono">{uploadedUrl}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl bg-muted/5 min-h-[120px]">
          <LucideIcons.Image size={24} className="text-muted-foreground/40 mb-1" />
          <span className="text-[0.6875rem] font-bold text-muted-foreground/60 uppercase tracking-wider">No Image Selected</span>
        </div>
      )}
    </div>
  );
};

const ALL_ICONS = ["Database", "Users", "Anchor", "Building2", "Plane", "Star", "Target", "Award", "Globe", "Cloud", "Cpu", "Code", "Server", "Shield", "Zap", "Layout", "Smartphone", "Search", "Mail", "Phone", "MapPin", "ChevronRight", "ArrowRight", "Play", "Pause", "Check", "X", "Info", "AlertCircle", "Facebook", "Twitter", "Linkedin", "Instagram", "Github", "Youtube", "Viber"];

const LinkPicker = ({ onSelect, search }: { onSelect: (v: string) => void; search: string }) => {
  const PRESETS = [
    { label: "Home / Top", value: "#" },
    { label: "Hero Section", value: "#hero" },
    { label: "About Us", value: "#about" },
    { label: "Services", value: "#services" },
    { label: "Products", value: "#products" },
    { label: "Our Clients", value: "#clients" },
    { label: "Testimonials", value: "#testimonials" },
    { label: "Network Map", value: "#map" },
    { label: "Technologies", value: "#technologies" },
    { label: "Careers", value: "#careers" },
    { label: "Contact Us", value: "#contact" },
    { label: "Viber Chat", value: "viber" },
  ];

  const filtered = PRESETS.filter(p => p.label.toLowerCase().includes(search.toLowerCase()) || p.value.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {filtered.map(p => (
        <button 
          key={p.value}
          onClick={() => onSelect(p.value)}
          className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-blue-500/10 hover:border-blue-500 transition-all group text-left"
        >
          <div>
            <p className="text-[0.8125rem] font-bold text-foreground">{p.label}</p>
            <p className="text-[0.625rem] text-muted-foreground font-mono">{p.value}</p>
          </div>
          <LucideIcons.ChevronRight size={14} className="text-muted-foreground group-hover:text-blue-500" />
        </button>
      ))}
    </div>
  );
};

const IconGrid = ({ onSelect, search }: { onSelect: (v: string) => void; search: string }) => {
  const filtered = ALL_ICONS.filter(i => i.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
      {filtered.map(name => (
        <button 
          key={name}
          onClick={() => onSelect(name)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-secondary/10 hover:border-secondary transition-all group"
        >
          <div className="text-muted-foreground group-hover:text-secondary mb-2 transition-colors">
            <LucideIcon name={name} size={24} />
          </div>
          <span className="text-[0.625rem] font-bold text-muted-foreground truncate w-full text-center">{name}</span>
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
