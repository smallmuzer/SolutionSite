import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Eye, EyeOff, Trash2, Plus, Edit2, Check, X, Save, Image,
  Star, Briefcase, Users, FileText, Phone, Globe, ChevronDown, ChevronUp,
  GripVertical, Home, Settings, Mail, MapPin, Building, Layers,
  Monitor, Smartphone, Code, Database, Cloud, Palette, BarChart, Shield,
  Search, Megaphone, Zap, Lock, HeartHandshake, Cpu, Wifi, Server,
  LineChart, PieChart, ShoppingCart, Truck, CreditCard, BookOpen,
  Headphones, Video, Camera, Printer, HardDrive, Terminal,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import ProductsManager from "./ProductsManager";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_LOCATIONS = [
  { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, clients: "HQ — 40+ clients", description: "Our headquarters serving government and private sector clients across the Maldives.", flag: "🇲🇻", landmark: "🏝️ Overwater Villas" },
  { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, clients: "RCSC Bhutan", description: "Supporting the Royal Civil Service Commission with digital transformation.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
  { name: "Tamilnadu, India", lat: 11.1271, lng: 78.6569, clients: "Regional Support", description: "Our hub for technology development and regional support in Southern India.", flag: "🇮🇳", landmark: "🏛️ Meenakshi Amman Temple" },
];

const CLIENT_LOCATION_MAP: Record<string, Omit<any, "clients">> = {
  "RCSC Bhutan": { name: "Thimphu, Bhutan", lat: 27.4728, lng: 89.6393, description: "RCSC Bhutan digital transformation project.", flag: "🇧🇹", landmark: "🏯 Tiger's Nest" },
  "Flyme": { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, description: "Flyme airline digital solutions.", flag: "🇲🇻", landmark: "✈️ Velana Airport" },
  "Medianet": { name: "Malé, Maldives", lat: 4.1755, lng: 73.5093, description: "Medianet telecom solutions.", flag: "🇲🇻", landmark: "📡 Telecom Hub" },
};

async function uploadFile(file: File, folder = "uploads"): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  form.append("path", `${folder}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  return json?.data?.publicUrl || null;
}

const ICON_OPTIONS = [
  // Core / Common
  { label: "Monitor", Icon: Monitor },
  { label: "Globe", Icon: Globe },
  { label: "Smartphone", Icon: Smartphone },
  { label: "Code", Icon: Code },
  { label: "Database", Icon: Database },
  { label: "Cloud", Icon: Cloud },
  { label: "Server", Icon: Server },
  { label: "Terminal", Icon: Terminal },
  { label: "Cpu", Icon: Cpu },
  { label: "HardDrive", Icon: HardDrive },
  { label: "Wifi", Icon: Wifi },
  // Business
  { label: "Briefcase", Icon: Briefcase },
  { label: "Users", Icon: Users },
  { label: "Building", Icon: Building },
  { label: "ShoppingCart", Icon: ShoppingCart },
  { label: "CreditCard", Icon: CreditCard },
  { label: "Truck", Icon: Truck },
  { label: "HeartHandshake", Icon: HeartHandshake },
  // Analytics / Marketing
  { label: "BarChart", Icon: BarChart },
  { label: "LineChart", Icon: LineChart },
  { label: "PieChart", Icon: PieChart },
  { label: "Search", Icon: Search },
  { label: "Megaphone", Icon: Megaphone },
  { label: "Zap", Icon: Zap },
  // Design / Media
  { label: "Palette", Icon: Palette },
  { label: "Camera", Icon: Camera },
  { label: "Video", Icon: Video },
  { label: "Printer", Icon: Printer },
  { label: "BookOpen", Icon: BookOpen },
  // Security / Support
  { label: "Shield", Icon: Shield },
  { label: "Lock", Icon: Lock },
  { label: "Headphones", Icon: Headphones },
  // Misc
  { label: "FileText", Icon: FileText },
  { label: "Phone", Icon: Phone },
  { label: "Mail", Icon: Mail },
  { label: "MapPin", Icon: MapPin },
  { label: "Home", Icon: Home },
  { label: "Settings", Icon: Settings },
  { label: "Star", Icon: Star },
  { label: "Layers", Icon: Layers },
];

function getIconComponent(label: string) {
  return ICON_OPTIONS.find(o => o.label === label)?.Icon ?? FileText;
}

type Service = any;
type ClientLogo = any;
type Testimonial = any;
type CareerJob = any;

// Helper for SQLite API calls
const dbFetch = async (table: string, options: { method?: string; body?: any; query?: Record<string, string> } = {}) => {
  try {
    let url = `/api/db/${table}`;
    if (options.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }
    const resp = await fetch(url, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = await resp.json();
    return { data: json.data, error: json.error };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
};

interface LocationData {
  name: string; lat: number; lng: number; clients: string;
  description: string; flag: string; landmark: string;
}

interface NetworkCompany {
  id: string;
  name: string;
  subtitle: string;
  desc: string;
  href: string;
  logo_url?: string;
  accent: string;
  is_visible: boolean;
  flag?: string;
}

const DEFAULT_NETWORK: NetworkCompany[] = [
  { id: "1", name: "Brilliant Systems Solutions", subtitle: "Private Limited", desc: "Our sister company delivering innovative IT solutions across the Maldives.", href: "https://bsyssolutions.com", logo_url: "/assets/clients/oblu.png", accent: "#3b82f6", is_visible: true },
  { id: "2", name: "BSS Bhutan", subtitle: "Technology Partner", desc: "Expanding world-class digital solutions across the Kingdom of Bhutan.", href: "#", logo_url: "/assets/clients/villa.png", accent: "#10b981", is_visible: true },
];

const DEFAULT_CONTENT: Record<string, Record<string, string>> = {
  hero: {
    title: "Leading IT Solutions Company in Maldives",
    subtitle: "Transform your business with cutting-edge technology solutions.",
    cta_text: "Get Started",
    hero_image: "/assets/hero_3d_glassy.png",
  },
  about: {
    title: "Driving Digital Transformation",
    description: "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company.",
    vision: "Our journey began out of the passion for a unique position in the industry.",
    card_mission: "Deliver innovative technology solutions that transform businesses.",
    card_mission_image: "/assets/about/mission.png",
    card_team: "Expert developers, designers, and consultants dedicated to your success.",
    card_team_image: "/assets/about/team.png",
    card_quality: "Every solution we build meets the highest standards of performance.",
    card_quality_image: "/assets/about/quality.png",
    card_global: "Serving clients across Maldives, Bhutan, and beyond.",
    card_global_image: "/assets/about/global.png",
  },
  clients: {
    badge: "Our Clients",
    title: "Trusted by",
    highlight: "Industry Leaders",
    description: "We're proud to have served over 300+ successful projects for leading companies across the Maldives and beyond.",
  },
  testimonials: {
    badge: "Testimonials",
    title: "What Our",
    highlight: "Clients Say",
  },
  careers: {
    badge: "Careers",
    title: "Join Our",
    highlight: "Team",
    description: "Be part of a dynamic team building cutting-edge technology solutions for clients worldwide.",
  },
  global_presence_header: {
    badge: "Global Presence",
    title: "Our",
    highlight: "Reach",
    description: "Serving clients across Maldives, Bhutan, and beyond.",
  },
  contact: {
    title: "Get In Touch",
    subtitle: "Ready to transform your business? Contact us today.",
    address: "Alia Building, 7th Floor\nGandhakoalhi Magu\nMalé, Maldives",
    email: "info@solutions.com.mv",
    phone: "+960 301-1355",
    landline: "+91-452 238 7388",
    hours: "Sun–Thu: 9AM–6PM\nSat: 9AM–1PM",
  },
  footer: {
    copyright: "© 2025 Systems Solutions Pvt Ltd. All rights reserved.",
    tagline: "Leading IT consulting and software development company.",
    facebook: "https://www.facebook.com/brilliantsystemssolutions/",
    twitter: "https://x.com/bsspl_india",
    linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
    instagram: "https://www.instagram.com/brilliantsystemssolutions",
  },
  services: {
    title: "Services & Solutions",
    subtitle: "Team up with the perfect digital partner for all your technical needs.",
  },
};

// â”€â”€â”€ Section Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SectionBlock = ({ title, iconLabel, children, defaultOpen = false }: {
  title: string; iconLabel: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(iconLabel);
  const Icon = getIconComponent(currentIcon);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="relative shrink-0" onClick={(e) => { e.stopPropagation(); setShowIconPicker(p => !p); }}>
          <Icon size={18} className="text-secondary cursor-pointer hover:opacity-70" />
          {showIconPicker && (
            <div className="absolute left-0 top-6 z-50 bg-popover border border-border rounded-lg p-2 shadow-xl grid grid-cols-5 gap-1 w-52">
              {ICON_OPTIONS.map(({ label, Icon: Ic }) => (
                <button key={label} type="button" title={label}
                  onClick={(e) => { e.stopPropagation(); setCurrentIcon(label); setShowIconPicker(false); }}
                  className={`p-1.5 rounded hover:bg-secondary/20 flex items-center justify-center ${currentIcon === label ? "bg-secondary/20 text-secondary" : "text-muted-foreground"
                    }`}>
                  <Ic size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="font-heading font-semibold text-foreground flex-1">{title}</span>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-border/50">{children}</div>}
    </div>
  );
};

const fieldCls = "w-full px-3 py-2 rounded-lg bg-transparent border border-border/60 text-foreground text-sm outline-none focus:border-secondary/70 focus:ring-1 focus:ring-secondary/30 transition-colors placeholder:text-muted-foreground/40";
const selectCls = `${fieldCls} cursor-pointer`;

const InlineField = ({ label, value, onChange, multiline = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className={`${fieldCls} resize-y`} placeholder={placeholder} />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className={fieldCls} placeholder={placeholder} />
    )}
  </div>
);

const RichField = ({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
    <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
  </div>
);

const MapPicker = ({ lat, lng, onPick }: { lat: number, lng: number, onPick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e: any) {
      if (onPick) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return (lat !== 0 || lng !== 0) ? <Marker position={[lat, lng]} /> : null;
};

const PageEditor = () => {
  const [activeTab, setActiveTab] = useState("hero");
  const [siteContent, setSiteContent] = useState<Record<string, Record<string, string>>>(DEFAULT_CONTENT);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<ClientLogo[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [careers, setCareers] = useState<CareerJob[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [network, setNetwork] = useState<NetworkCompany[]>(DEFAULT_NETWORK);
  const [heroStats, setHeroStats] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const [editingService, setEditingService] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<string | null>(null);
  const [editingCareer, setEditingCareer] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<number | null>(null);
  const [editingNetwork, setEditingNetwork] = useState<string | null>(null);
  const [editingHeroStat, setEditingHeroStat] = useState<string | null>(null);

  const [tempService, setTempService] = useState<Partial<Service>>({});
  const [tempClient, setTempClient] = useState<Partial<ClientLogo>>({});
  const [tempTestimonial, setTempTestimonial] = useState<Partial<Testimonial>>({});
  const [tempCareer, setTempCareer] = useState<Partial<CareerJob>>({});
  const [tempLocation, setTempLocation] = useState<Partial<LocationData>>({});
  const [tempNetwork, setTempNetwork] = useState<Partial<NetworkCompany>>({});
  const [tempHeroStat, setTempHeroStat] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  const SECTIONS = [
    { id: "hero", label: "Hero Section", icon: Home },
    { id: "about", label: "About Section", icon: FileText },
    { id: "products", label: "Our Products", icon: Briefcase },
    { id: "services", label: "Services Area", icon: Layers },
    { id: "clients", label: "Client Logos", icon: Users },
    { id: "testimonials", label: "Testimonials", icon: Star },
    { id: "careers", label: "Career Portal", icon: Globe },
    { id: "global_presence", label: "Global Presence", icon: MapPin },
    { id: "our_network", label: "Our Network", icon: Building },
    { id: "contact", label: "Contact Info", icon: Phone },
    { id: "footer", label: "Footer Settings", icon: Shield },
  ];

  const loadAll = async () => {
    const [contentRes, servicesRes, clientsRes, testimonialsRes, careersRes, heroStatsRes] = await Promise.all([
      fetch("/api/db/site_content").then(r => r.json()),
      fetch("/api/db/services?_order=sort_order").then(r => r.json()),
      fetch("/api/db/client_logos?_order=sort_order").then(r => r.json()),
      fetch("/api/db/testimonials?_order=created_at.desc").then(r => r.json()),
      fetch("/api/db/career_jobs?_order=sort_order").then(r => r.json()),
      fetch("/api/db/hero_stats?_order=sort_order").then(r => r.json()),
    ]);
    if (contentRes.data) {
      const map: Record<string, Record<string, string>> = {};
      let foundPresence = false;
      contentRes.data.forEach((row: any) => {
        if (row.section_key === "global_presence") {
          foundPresence = true;
          const c = row.content as any;
          const locs = Array.isArray(c.locations) && c.locations.length > 0 ? c.locations : [...DEFAULT_LOCATIONS];

          if (clientsRes.data) {
            for (const cl of clientsRes.data) {
              const mapped = CLIENT_LOCATION_MAP[cl.name];
              if (mapped && !locs.some((l: any) => l.name === mapped.name)) {
                locs.push({ ...mapped, clients: cl.name });
              }
            }
          }
          setLocations(locs);
        } else if (row.section_key === "our_network") {
          const c = row.content as any;
          if (Array.isArray(c.companies)) setNetwork(c.companies);
        } else if (row.section_key !== "settings" && row.section_key !== "security") {
          map[row.section_key] = row.content as Record<string, string>;
        }
      });

      if (!foundPresence) {
        const locs = [...DEFAULT_LOCATIONS];
        if (clientsRes.data) {
          for (const cl of clientsRes.data) {
            const mapped = CLIENT_LOCATION_MAP[cl.name];
            if (mapped && !locs.some((l: any) => l.name === (mapped as any).name)) {
              locs.push({
                ...mapped,
                clients: cl.name,
                name: (mapped as any).name,
                lat: (mapped as any).lat,
                lng: (mapped as any).lng,
                description: (mapped as any).description,
                flag: (mapped as any).flag,
                landmark: (mapped as any).landmark
              } as any);
            }
          }
        }
        setLocations(locs);
      }
      for (const [key, defaults] of Object.entries(DEFAULT_CONTENT)) {
        if (!map[key]) {
          map[key] = { ...defaults };
        } else {
          for (const [field, val] of Object.entries(defaults)) {
            if (!map[key][field]) map[key][field] = val;
          }
        }
      }
      setSiteContent(map);
    } else {
      setSiteContent({ ...DEFAULT_CONTENT });
    }
    if (servicesRes.data) setServices(servicesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (testimonialsRes.data) setTestimonials(testimonialsRes.data);
    if (careersRes.data) setCareers(careersRes.data);
    if (heroStatsRes.data) setHeroStats(heroStatsRes.data);
  };

  const upsertSection = async (key: string) => {
    setSaving(key);
    const { error } = await dbFetch("site_content", {
      method: "POST",
      body: { section_key: key, content: siteContent[key] }
    });
    setSaving(null);
    if (error) toast.error(`Failed to save ${key} section.`);
    else toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} section updated!`);
  };

  const updateContent = (section: string, field: string, value: string) => {
    setSiteContent((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [field]: value },
    }));
  };

  const saveNetwork = async () => {
    setSaving("network");
    await dbFetch("site_content", { method: "POST", body: { section_key: "our_network", content: { companies: network } } });
    setSaving(null);
    toast.success("Our Network saved!");
  };

  const saveLocations = async () => {
    setSaving("locations");
    await dbFetch("site_content", { method: "POST", body: { section_key: "global_presence", content: { locations } } });
    setSaving(null);
    toast.success("Global presence saved!");
  };

  const addLocation = () => {
    setLocations([...locations, { name: "New Location", lat: 0, lng: 0, clients: "", description: "", flag: "ðŸ³ï¸", landmark: "" }]);
    setEditingLocation(locations.length);
    setTempLocation({ name: "New Location", lat: 0, lng: 0, clients: "", description: "", flag: "ðŸ³ï¸", landmark: "" });
  };

  const deleteLocation = (idx: number) => setLocations(locations.filter((_, i) => i !== idx));

  const toggleVisibility = async (table: string, id: string, current: boolean, setter: Function) => {
    await dbFetch(table, { method: "PATCH", query: { id }, body: { is_visible: !current } });
    setter((prev: any[]) => prev.map((item: any) => item.id === id ? { ...item, is_visible: !current } : item));
  };

  const deleteItem = async (table: string, id: string, setter: Function) => {
    await dbFetch(table, { method: "DELETE", query: { id } });
    setter((prev: any[]) => prev.filter((item: any) => item.id !== id));
    toast.success("Deleted!");
  };

  const dragIdx = useRef<number | null>(null);

  const moveClient = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const updated = [...clients];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    updated.forEach((c, i) => { c.sort_order = i; });
    setClients([...updated]);
    for (const c of updated) {
      await dbFetch("client_logos", { method: "PATCH", query: { id: c.id }, body: { sort_order: c.sort_order } });
    }
    toast.success("Order saved!");
  };

  const addService = async () => {
    const { data } = await dbFetch("services", {
      method: "POST",
      body: { title: "New Service", description: "Description here", sort_order: services.length }
    });
    if (data) { setServices([...services, data]); setEditingService(data.id); setTempService(data); }
  };

  const addClient = async () => {
    const { data } = await dbFetch("client_logos", {
      method: "POST",
      body: { name: "New Client", logo_url: "", sort_order: clients.length }
    });
    if (data) { setClients([...clients, data]); setEditingClient(data.id); setTempClient(data); }
  };

  const addTestimonial = async () => {
    const { data } = await dbFetch("testimonials", {
      method: "POST",
      body: {
        name: "New Person", company: "Company", message: "Great service!", rating: 5,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=new${Date.now()}`,
      }
    });
    if (data) { setTestimonials([data, ...testimonials]); setEditingTestimonial(data.id); setTempTestimonial(data); }
  };

  const addCareer = async () => {
    const { data } = await dbFetch("career_jobs", {
      method: "POST",
      body: { title: "New Position", description: "", location: "Malé, Maldives", job_type: "Full-time", image_url: null, icon: "Briefcase", sort_order: careers.length }
    });
    if (data) { setCareers([...careers, data]); setEditingCareer(data.id); setTempCareer(data); }
  };

  const addHeroStat = async () => {
    const { data } = await dbFetch("hero_stats", {
      method: "POST",
      body: { count: "0", label: "New Stat", suffix: "+", color: "gradient", sort_order: heroStats.length }
    });
    if (data) { setHeroStats([...heroStats, data]); setEditingHeroStat(data.id); setTempHeroStat(data); }
  };

  const saveHeroStat = async () => {
    if (!editingHeroStat) return;
    await dbFetch("hero_stats", {
      method: "PATCH",
      query: { id: editingHeroStat },
      body: {
        count: tempHeroStat.count,
        label: tempHeroStat.label,
        suffix: tempHeroStat.suffix,
        color: tempHeroStat.color,
      }
    });
    setHeroStats((prev) => prev.map((s) => s.id === editingHeroStat ? { ...s, ...tempHeroStat } : s));
    setEditingHeroStat(null);
    toast.success("Stat updated!");
  };

  const saveService = async () => {
    if (!editingService) return;
    await dbFetch("services", {
      method: "PATCH",
      query: { id: editingService },
      body: {
        title: tempService.title,
        description: tempService.description,
        image_url: tempService.image_url,
        icon: tempService.icon,
      }
    });
    setServices((prev) => prev.map((s) => s.id === editingService ? { ...s, ...tempService } : s));
    setEditingService(null);
    toast.success("Service updated!");
  };

  const saveClient = async () => {
    if (!editingClient) return;
    await dbFetch("client_logos", {
      method: "PATCH",
      query: { id: editingClient },
      body: { name: tempClient.name, logo_url: tempClient.logo_url }
    });
    setClients((prev) => prev.map((c) => c.id === editingClient ? { ...c, ...tempClient } : c));
    setEditingClient(null);
    toast.success("Client updated!");
  };

  const saveTestimonial = async () => {
    if (!editingTestimonial) return;
    await dbFetch("testimonials", {
      method: "PATCH",
      query: { id: editingTestimonial },
      body: {
        name: tempTestimonial.name, company: tempTestimonial.company,
        message: tempTestimonial.message, rating: tempTestimonial.rating,
        avatar_url: tempTestimonial.avatar_url,
      }
    });
    setTestimonials((prev) => prev.map((t) => t.id === editingTestimonial ? { ...t, ...tempTestimonial } : t));
    setEditingTestimonial(null);
    toast.success("Testimonial updated!");
  };

  const saveCareer = async () => {
    if (!editingCareer) return;
    await dbFetch("career_jobs", {
      method: "PATCH",
      query: { id: editingCareer },
      body: {
        title: tempCareer.title, description: tempCareer.description,
        location: tempCareer.location, job_type: tempCareer.job_type,
        image_url: tempCareer.image_url || null, icon: tempCareer.icon || null,
      }
    });
    setCareers((prev) => prev.map((c) => c.id === editingCareer ? { ...c, ...tempCareer } : c));
    setEditingCareer(null);
    toast.success("Job updated!");
  };

  const saveLocationEdit = () => {
    if (editingLocation === null) return;
    const updated = [...locations];
    updated[editingLocation] = tempLocation as LocationData;
    setLocations(updated);
    setEditingLocation(null);
  };

  const MapPicker = ({ lat, lng, onPick }: { lat: number, lng: number, onPick: (lat: number, lng: number) => void }) => {
    useMapEvents({
      click(e) {
        onPick(e.latlng.lat, e.latlng.lng);
      },
    });
    return (
      <Marker position={[lat, lng]} />
    );
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case "hero":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Home size={20} className="text-secondary" /> Hero Section
            </h3>
            <div className="glass-card p-6 space-y-4">
              <InlineField label="Title" value={siteContent.hero?.title || ""} onChange={(v) => updateContent("hero", "title", v)} placeholder="e.g. Leading IT Solutions Company in Maldives" />
              <RichField label="Subtitle" value={siteContent.hero?.subtitle || ""} onChange={(v) => updateContent("hero", "subtitle", v)} placeholder="e.g. Transform your business with cutting-edge technology..." />
              <InlineField label="CTA Button Text" value={siteContent.hero?.cta_text || ""} onChange={(v) => updateContent("hero", "cta_text", v)} placeholder="e.g. Get Started" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gallery Images (Comma Separated)</label>
                <div className="flex gap-2">
                  <input value={siteContent.hero?.images || siteContent.hero?.hero_images || ""} onChange={(e) => updateContent("hero", "images", e.target.value)} className={fieldCls} placeholder="Example: /assets/h1.jpg, /assets/h2.jpg" />
                  <label className="shrink-0 px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-xs font-medium cursor-pointer hover:bg-secondary/20 flex items-center gap-1.5 transition-all shadow-sm active:scale-95">
                    <Plus size={14} />
                    Upload Multiple
                    <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                      const files = e.target.files; if (!files?.length) return;
                      const uploadedUrls: string[] = [];
                      for (let i = 0; i < files.length; i++) {
                        const url = await uploadFile(files[i], "hero-gallery");
                        if (url) uploadedUrls.push(url);
                      }
                      if (uploadedUrls.length > 0) {
                        const existing = siteContent.hero?.images || siteContent.hero?.hero_images || "";
                        const newValue = existing 
                          ? `${existing}, ${uploadedUrls.join(", ")}` 
                          : uploadedUrls.join(", ");
                        updateContent("hero", "images", newValue);
                        toast.success(`Successfully uploaded ${uploadedUrls.length} images!`);
                      }
                    }} />
                  </label>
                </div>
                <p className="text-[0.625rem] text-muted-foreground">Specify multiple image paths separated by commas or use the upload button.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Hero Image</label>
                <div className="flex gap-2">
                  <input value={siteContent.hero?.hero_image || ""} onChange={(e) => updateContent("hero", "hero_image", e.target.value)} className={fieldCls} placeholder="Example: /assets/hero_bg.jpg" />
                  <label className="shrink-0 px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-xs font-medium cursor-pointer hover:bg-secondary/20 flex items-center gap-1">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadFile(f, "hero");
                      if (url) updateContent("hero", "hero_image", url);
                    }} />
                  </label>
                </div>
                <p className="text-[0.625rem] text-muted-foreground">This image takes priority and will show up as the first slide.</p>
              </div>
              <div className="flex justify-end pt-2 border-b border-border/50 pb-6">
                <button onClick={() => upsertSection("hero")} disabled={saving === "hero"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-secondary/20 transition-all active:scale-95">
                  <Save size={16} /> {saving === "hero" ? "Saving..." : "Save Main Content"}
                </button>
              </div>

              {/* Hero Stats Management */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Hero Statistics ({heroStats.length})</span>
                  <button onClick={addHeroStat} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                    <Plus size={14} /> Add New Stat
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {heroStats.map((stat) => (
                    <div key={stat.id} className="border border-border/50 rounded-xl p-4 bg-muted/20">
                      {editingHeroStat === stat.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <InlineField label="Count/Value" value={tempHeroStat.count || ""} onChange={(v) => setTempHeroStat({ ...tempHeroStat, count: v })} />
                            <InlineField label="Suffix" value={tempHeroStat.suffix || ""} onChange={(v) => setTempHeroStat({ ...tempHeroStat, suffix: v })} />
                          </div>
                          <InlineField label="Label" value={tempHeroStat.label || ""} onChange={(v) => setTempHeroStat({ ...tempHeroStat, label: v })} />
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color Style</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {[
                                { value: "gradient", label: "Gradient", cls: "bg-gradient-to-r from-secondary to-blue-500" },
                                { value: "#3b82f6", label: "Blue", cls: "bg-blue-500" },
                                { value: "#10b981", label: "Emerald", cls: "bg-emerald-500" },
                                { value: "#f59e0b", label: "Amber", cls: "bg-amber-500" },
                                { value: "#8b5cf6", label: "Custom", cls: "bg-muted flex items-center justify-center" }
                              ].map((style) => {
                                const isSelected = tempHeroStat.color === style.value || (style.label === "Custom" && !["gradient", "#3b82f6", "#10b981", "#f59e0b"].includes(tempHeroStat.color));
                                return (
                                  <button
                                    key={style.value}
                                    type="button"
                                    onClick={() => setTempHeroStat({ ...tempHeroStat, color: style.value })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${
                                      isSelected
                                        ? "border-secondary bg-secondary/10 text-secondary shadow-sm"
                                        : "border-border/50 text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${style.cls}`}>
                                      {style.label === "Custom" && <Palette size={8} className="text-muted-foreground" />}
                                    </div>
                                    {style.label}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {/* Color Picker for Custom Color */}
                            {(!["gradient", "#3b82f6", "#10b981", "#f59e0b"].includes(tempHeroStat.color)) && (
                              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="space-y-1 flex-1">
                                  <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest">Pick Custom Color</span>
                                  <div className="flex gap-2">
                                    <input 
                                      type="color" 
                                      value={tempHeroStat.color.startsWith("#") ? tempHeroStat.color : "#3b82f6"} 
                                      onChange={(e) => setTempHeroStat({ ...tempHeroStat, color: e.target.value })}
                                      className="w-10 h-8 rounded border-border cursor-pointer p-0.5 bg-background shadow-sm"
                                    />
                                    <input 
                                      type="text" 
                                      value={tempHeroStat.color} 
                                      onChange={(e) => setTempHeroStat({ ...tempHeroStat, color: e.target.value })}
                                      className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono"
                                      placeholder="#HEX"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditingHeroStat(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={saveHeroStat} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold shadow-md"><Check size={16} /> Save Stat</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg bg-background border border-border/50 flex flex-col items-center justify-center shadow-sm shrink-0`}>
                            <span 
                              className={`text-sm font-black ${stat.color === 'gradient' ? 'gradient-text' : ''}`}
                              style={{ color: stat.color === 'gradient' ? undefined : stat.color }}
                            >
                              {stat.count}{stat.suffix}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground truncate">{stat.label}</div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: stat.color === 'gradient' ? 'linear-gradient(to right, #3b82f6, #10b981)' : stat.color }} />
                              <div className="text-[0.625rem] text-muted-foreground uppercase tracking-wider font-bold truncate max-w-[80px]">{stat.color === 'gradient' ? 'Gradient' : stat.color}</div>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingHeroStat(stat.id); setTempHeroStat(stat); }} className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => toggleVisibility("hero_stats", stat.id, stat.is_visible, setHeroStats)}
                              className={`p-2 rounded-lg hover:bg-muted ${stat.is_visible ? "text-secondary" : "text-muted-foreground"}`}>
                              {stat.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button onClick={() => deleteItem("hero_stats", stat.id, setHeroStats)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <FileText size={20} className="text-secondary" /> About Section
            </h3>
            <div className="glass-card p-6 space-y-4">
              <InlineField label="Title" value={siteContent.about?.title || ""} onChange={(v) => updateContent("about", "title", v)} placeholder="e.g. Driving Digital Transformation" />
              <RichField label="Description" value={siteContent.about?.description || ""} onChange={(v) => updateContent("about", "description", v)} placeholder="Describe your company history and expertise..." />
              <RichField label="Vision" value={siteContent.about?.vision || ""} onChange={(v) => updateContent("about", "vision", v)} placeholder="What is your long-term goal?" />
              <div className="grid sm:grid-cols-2 gap-4">
                {["card_mission", "card_team", "card_quality", "card_global"].map((key) => (
                  <RichField key={key} label={key.replace("card_", "Card: ")} value={siteContent.about?.[key] || ""} onChange={(v) => updateContent("about", key, v)} placeholder={`Detailed text for ${key.replace("card_", "")} card...`} />
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "card_mission_image", label: "Mission Image", folder: "about" },
                  { key: "card_team_image", label: "Team Image", folder: "about" },
                  { key: "card_quality_image", label: "Quality Image", folder: "about" },
                  { key: "card_global_image", label: "Global Image", folder: "about" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</label>
                    <div className="flex gap-2">
                      <input value={siteContent.about?.[f.key] || ""} onChange={(e) => updateContent("about", f.key, e.target.value)} className={fieldCls} placeholder="/assets/about/..." />
                      <label className="shrink-0 px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-xs font-medium cursor-pointer hover:bg-secondary/20 flex items-center gap-1">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const url = await uploadFile(file, f.folder);
                          if (url) updateContent("about", f.key, url);
                        }} />
                      </label>
                    </div>
                    {siteContent.about?.[f.key] && (
                      <img src={siteContent.about[f.key]} alt={f.label} className="h-16 rounded-lg object-cover border border-border/50 mt-1 shadow-sm" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => upsertSection("about")} disabled={saving === "about"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-secondary/20 transition-all active:scale-95">
                  <Save size={16} /> {saving === "about" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        );

      case "products":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Briefcase size={20} className="text-secondary" /> Our Products
            </h3>
            <div className="glass-card p-6">
              <ProductsManager />
            </div>
          </div>
        );

      case "services":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Layers size={20} className="text-secondary" /> Services Area
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="space-y-4">
                <InlineField label="Section Title" value={siteContent.services?.title || ""} onChange={(v) => updateContent("services", "title", v)} placeholder="e.g. Services & Solutions" />
                <RichField label="Section Subtitle" value={siteContent.services?.subtitle || ""} onChange={(v) => updateContent("services", "subtitle", v)} placeholder="e.g. Team up with the perfect digital partner for all your needs." />
                <div className="flex justify-end">
                  <button onClick={() => upsertSection("services")} disabled={saving === "services"}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold hover:bg-secondary hover:text-secondary-foreground transition-all">
                    <Save size={14} /> Save Header Info
                  </button>
                </div>
              </div>

              <div className="border-t border-border/50 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-foreground">Active Services ({services.length})</span>
                  <button onClick={addService} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                    <Plus size={14} /> Add New Service
                  </button>
                </div>
                <div className="grid gap-3">
                  {services.map((s) => (
                    <div key={s.id} className="border border-border/50 rounded-xl p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
                      {editingService === s.id ? (
                        <div className="space-y-3">
                          <InlineField label="Title" value={tempService.title || ""} onChange={(v) => setTempService({ ...tempService, title: v })} />
                          <RichField label="Description" value={tempService.description || ""} onChange={(v) => setTempService({ ...tempService, description: v })} />
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon Selection</label>
                            <div className="flex gap-1.5 flex-wrap mb-2 p-2 bg-background/50 rounded-lg border border-border/50 max-h-32 overflow-y-auto">
                              {ICON_OPTIONS.map(({ label, Icon: Ic }) => (
                                <button key={label} type="button" title={label}
                                  onClick={() => setTempService({ ...tempService, icon: label })}
                                  className={`p-2 rounded-lg border transition-all ${tempService.icon === label ? "bg-secondary text-secondary-foreground border-secondary shadow-sm" : "border-border/50 text-muted-foreground hover:bg-muted"
                                    }`}>
                                  <Ic size={14} />
                                </button>
                              ))}
                            </div>
                            {(() => {
                              const isHtml = tempService.icon?.trim().startsWith("<");
                              const IconComp = getIconComponent(tempService.icon || "FileText");
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <InlineField label="Icon Name/SVG Code" value={tempService.icon || ""} onChange={(v) => setTempService({ ...tempService, icon: v })} placeholder="e.g. Code  or  <svg>...</svg>  or  <i class='fa fa-desktop'></i>" />
                                  </div>
                                  <div className="mt-6 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-sm shrink-0" title="Icon Preview">
                                    {isHtml
                                      ? <span className="text-xl text-secondary" dangerouslySetInnerHTML={{ __html: tempService.icon! }} />
                                      : <IconComp size={20} className="text-secondary" />
                                    }
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service Image</label>
                            <div className="flex gap-2">
                              <input value={tempService.image_url || ""} onChange={(e) => setTempService({ ...tempService, image_url: e.target.value })} className={fieldCls} placeholder="/assets/services/..." />
                              <label className="shrink-0 px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-xs font-medium cursor-pointer hover:bg-secondary/20 flex items-center gap-1">
                                Upload
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  const url = await uploadFile(f, "services");
                                  if (url) setTempService((p) => ({ ...p, image_url: url }));
                                }} />
                              </label>
                            </div>
                            {tempService.image_url && <img src={tempService.image_url} alt="preview" className="h-14 rounded-lg object-cover mt-2 shadow-sm border border-border/50" />}
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditingService(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={saveService} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold shadow-md shadow-secondary/10"><Check size={16} /> Update Service</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 border border-secondary/20">
                            {s.icon && s.icon.trim().startsWith("<")
                              ? <span className="text-xl text-secondary" dangerouslySetInnerHTML={{ __html: s.icon }} />
                              : (() => { const Ic = getIconComponent(s.icon || "Layers"); return <Ic size={20} className="text-secondary" />; })()
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground">{s.title}</div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                              <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[0.625rem] text-muted-foreground max-w-[180px] truncate">
                                {s.icon || <span className="italic opacity-50">no icon</span>}
                              </span>
                              <span className="opacity-40">·</span>
                              <span className="truncate">{s.description?.replace(/<[^>]*>/g, "")}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingService(s.id); setTempService(s); }} className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => toggleVisibility("services", s.id, s.is_visible, setServices)}
                              className={`p-2 rounded-lg hover:bg-muted ${s.is_visible ? "text-secondary" : "text-muted-foreground"}`} title={s.is_visible ? "Visible" : "Hidden"}>
                              {s.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button onClick={() => deleteItem("services", s.id, setServices)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "clients":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Users size={20} className="text-secondary" /> Client Logos
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <InlineField label="Section Badge" value={siteContent.clients?.badge || ""} onChange={(v) => updateContent("clients", "badge", v)} />
                  <InlineField label="Display Title" value={siteContent.clients?.title || ""} onChange={(v) => updateContent("clients", "title", v)} />
                  <InlineField label="Highlight Word" value={siteContent.clients?.highlight || ""} onChange={(v) => updateContent("clients", "highlight", v)} />
                </div>
                <InlineField label="Section Description" value={siteContent.clients?.description || ""} onChange={(v) => updateContent("clients", "description", v)} multiline />
                <div className="flex justify-end border-b border-border/50 pb-6">
                  <button onClick={() => upsertSection("clients")} disabled={saving === "clients"}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold hover:bg-secondary hover:text-secondary-foreground transition-all">
                    <Save size={14} /> Save Header Info
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Partners ({clients.length})</span>
                  <button onClick={addClient} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                    <Plus size={14} /> Add New Client
                  </button>
                </div>
                <p className="text-[0.6875rem] text-muted-foreground italic font-medium">Reorder by dragging cards (Desktop only)</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {clients.map((c, idx) => (
                    <div
                      key={c.id}
                      draggable={editingClient !== c.id}
                      onDragStart={() => { dragIdx.current = idx; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIdx.current !== null) { moveClient(dragIdx.current, idx); dragIdx.current = null; } }}
                      onDragEnd={() => { dragIdx.current = null; }}
                      className={`border rounded-2xl transition-all duration-300 ${
                        editingClient === c.id 
                          ? 'border-secondary/50 bg-secondary/5 p-4 shadow-lg ring-1 ring-secondary/20' 
                          : 'border-border/50 bg-card hover:bg-muted/30 hover:border-secondary/30 p-2.5 shadow-sm'
                      } cursor-grab active:cursor-grabbing font-medium`}
                    >
                      {editingClient === c.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-secondary/10">
                            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                              <Image size={16} />
                            </div>
                            <span className="text-sm font-bold text-foreground">Edit Partner</span>
                          </div>
                          <div className="space-y-3">
                            <InlineField label="Partner Name" value={tempClient.name || ""} onChange={(v) => setTempClient({ ...tempClient, name: v })} />
                            <div className="space-y-1">
                              <label className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest px-1">Logo Asset Path</label>
                              <div className="flex gap-2">
                                <input value={tempClient.logo_url || ""} onChange={(e) => setTempClient({ ...tempClient, logo_url: e.target.value })} className={fieldCls} placeholder="/assets/clients/..." />
                                <label className="shrink-0 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold cursor-pointer hover:opacity-90 flex items-center gap-1.5 transition-all shadow-md shadow-secondary/10 active:scale-95">
                                  <Plus size={14} />
                                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                    const f = e.target.files?.[0]; if (!f) return;
                                    const url = await uploadFile(f, "clients");
                                    if (url) setTempClient((p) => ({ ...p, logo_url: url }));
                                  }} />
                                </label>
                              </div>
                            </div>
                            {tempClient.logo_url && (
                              <div className="bg-white rounded-xl p-4 border border-border/50 shadow-inner flex items-center justify-center min-h-[100px] mt-2 group/prev relative">
                                <img src={tempClient.logo_url} alt="preview" className="max-h-16 max-w-full object-contain transition-transform group-hover/prev:scale-110" />
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-muted text-[0.6rem] font-bold text-muted-foreground uppercase border border-border/50">Preview</div>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-secondary/10">
                            <button onClick={() => setEditingClient(null)} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg">Cancel</button>
                            <button onClick={saveClient} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold shadow-lg shadow-secondary/10 hover:shadow-secondary/20 transition-all active:scale-95"><Check size={14} /> Update Partner</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <GripVertical size={16} className="text-muted-foreground/20 shrink-0" />
                          <div className="w-14 h-14 rounded-xl bg-white border border-border/40 flex items-center justify-center p-2.5 shrink-0 shadow-sm relative group/logo">
                            <img src={c.logo_url || ""} alt={c.name} className="max-w-full max-h-full object-contain transition-transform group-hover/logo:scale-110" 
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100?text=Logo'; }} />
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="font-bold text-[0.9375rem] text-foreground truncate leading-tight mb-0.5">{c.name}</div>
                            <div className={`text-[0.625rem] font-black uppercase tracking-wider ${c.is_visible ? 'text-secondary/70' : 'text-muted-foreground/60'}`}>
                              {c.is_visible ? 'Public' : 'Hidden'}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 bg-muted/50 p-1 rounded-xl border border-border/30">
                            <button onClick={() => { setEditingClient(c.id); setTempClient(c); }} className="p-2 rounded-lg hover:bg-white text-secondary transition-all hover:shadow-sm" title="Edit"><Edit2 size={15} /></button>
                            <button onClick={() => toggleVisibility("client_logos", c.id, c.is_visible, setClients)}
                              className={`p-2 rounded-lg hover:bg-white transition-all hover:shadow-sm ${c.is_visible ? "text-secondary" : "text-muted-foreground"}`} title={c.is_visible ? "Hide" : "Show"}>
                              {c.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                            <button onClick={() => deleteItem("client_logos", c.id, setClients)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-all" title="Delete"><Trash2 size={15} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "testimonials":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Star size={20} className="text-secondary" /> Testimonials
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="space-y-4 border-b border-border/50 pb-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <InlineField label="Badge" value={siteContent.testimonials?.badge || ""} onChange={(v) => updateContent("testimonials", "badge", v)} />
                  <InlineField label="Header Title" value={siteContent.testimonials?.title || ""} onChange={(v) => updateContent("testimonials", "title", v)} />
                  <InlineField label="Highlight" value={siteContent.testimonials?.highlight || ""} onChange={(v) => updateContent("testimonials", "highlight", v)} />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => upsertSection("testimonials")} disabled={saving === "testimonials"}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold hover:bg-secondary hover:text-secondary-foreground transition-all">
                    <Save size={14} /> Save Header Info
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-foreground">Feedback Items ({testimonials.length})</span>
                  <button onClick={addTestimonial} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                    <Plus size={14} /> Add New Review
                  </button>
                </div>
                <div className="grid gap-3">
                  {testimonials.map((t) => (
                    <div key={t.id} className="border border-border/50 rounded-xl p-4 bg-muted/20">
                      {editingTestimonial === t.id ? (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <InlineField label="Name" value={tempTestimonial.name || ""} onChange={(v) => setTempTestimonial({ ...tempTestimonial, name: v })} />
                            <InlineField label="Company" value={tempTestimonial.company || ""} onChange={(v) => setTempTestimonial({ ...tempTestimonial, company: v })} />
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rating Selection</label>
                              <select value={tempTestimonial.rating || 5} onChange={(e) => setTempTestimonial({ ...tempTestimonial, rating: Number(e.target.value) })}
                                className={selectCls}>
                                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars Rating</option>)}
                              </select>
                            </div>
                          </div>
                          <InlineField label="Avatar Asset URL" value={tempTestimonial.avatar_url || ""} onChange={(v) => setTempTestimonial({ ...tempTestimonial, avatar_url: v })} />
                          <RichField label="Customer Message" value={tempTestimonial.message || ""} onChange={(v) => setTempTestimonial({ ...tempTestimonial, message: v })} />
                          <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditingTestimonial(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={saveTestimonial} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold shadow-md"><Check size={16} /> Save Review</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <img src={t.avatar_url || ""} alt={t.name} className="w-12 h-12 rounded-full bg-background border border-border/50 shrink-0 object-cover shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground">{t.name} <span className="text-muted-foreground font-normal ml-1">@ {t.company}</span></div>
                            <div className="text-xs text-muted-foreground italic">"{t.message?.replace(/<[^>]*>/g, "")}"</div>
                            <div className="flex gap-0.5 mt-1">
                              {[...Array(t.rating || 5)].map((_, i) => <Star key={i} size={10} className="fill-yellow-500 text-yellow-500" />)}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingTestimonial(t.id); setTempTestimonial(t); }} className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => toggleVisibility("testimonials", t.id, t.is_visible, setTestimonials)}
                              className={`p-2 rounded-lg hover:bg-muted ${t.is_visible ? "text-secondary" : "text-muted-foreground"}`}>
                              {t.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button onClick={() => deleteItem("testimonials", t.id, setTestimonials)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "careers":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Globe size={20} className="text-secondary" /> Career Portal
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="space-y-4 border-b border-border/50 pb-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <InlineField label="Badge Text" value={siteContent.careers?.badge || ""} onChange={(v) => updateContent("careers", "badge", v)} />
                  <InlineField label="Portal Title" value={siteContent.careers?.title || ""} onChange={(v) => updateContent("careers", "title", v)} />
                  <InlineField label="Highlight" value={siteContent.careers?.highlight || ""} onChange={(v) => updateContent("careers", "highlight", v)} />
                </div>
                <InlineField label="Short Intro" value={siteContent.careers?.description || ""} onChange={(v) => updateContent("careers", "description", v)} multiline />
                <div className="flex justify-end">
                  <button onClick={() => upsertSection("careers")} disabled={saving === "careers"}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold hover:bg-secondary hover:text-secondary-foreground transition-all">
                    <Save size={14} /> Save Header Info
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Open Positions ({careers.length})</span>
                  <button onClick={addCareer} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                    <Plus size={14} /> Post New Job
                  </button>
                </div>
                <div className="grid gap-3">
                  {careers.map((j) => {
                    const JobIconComp = getIconComponent(j.icon || "Briefcase");
                    return (
                    <div key={j.id} className="border border-border/50 rounded-xl p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
                      {editingCareer === j.id ? (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <InlineField label="Job Title" value={tempCareer.title || ""} onChange={(v) => setTempCareer({ ...tempCareer, title: v })} />
                            <InlineField label="Location" value={tempCareer.location || ""} onChange={(v) => setTempCareer({ ...tempCareer, location: v })} />
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Employment Type</label>
                              <select value={tempCareer.job_type || "Full-time"} onChange={(e) => setTempCareer({ ...tempCareer, job_type: e.target.value })} className={selectCls}>
                                <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Remote</option><option>Internship</option>
                              </select>
                            </div>
                          </div>
                          <RichField label="Detailed Description" value={tempCareer.description || ""} onChange={(v) => setTempCareer({ ...tempCareer, description: v })} />
                          {/* Icon Selection */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon Selection</label>
                            <div className="flex gap-1.5 flex-wrap mb-2 p-2 bg-background/50 rounded-lg border border-border/50 max-h-32 overflow-y-auto">
                              {ICON_OPTIONS.map(({ label, Icon: Ic }) => (
                                <button key={label} type="button" title={label}
                                  onClick={() => setTempCareer({ ...tempCareer, icon: label })}
                                  className={`p-2 rounded-lg border transition-all ${
                                    tempCareer.icon === label ? "bg-secondary text-secondary-foreground border-secondary shadow-sm" : "border-border/50 text-muted-foreground hover:bg-muted"
                                  }`}>
                                  <Ic size={14} />
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <InlineField label="Icon Name" value={tempCareer.icon || ""} onChange={(v) => setTempCareer({ ...tempCareer, icon: v })} placeholder="e.g. Code2, Briefcase, Users" />
                              </div>
                              <div className="mt-6 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-sm shrink-0" title="Icon Preview">
                                {(() => { const Ic = getIconComponent(tempCareer.icon || "Briefcase"); return <Ic size={20} className="text-secondary" />; })()}
                              </div>
                            </div>
                          </div>
                          {/* Job Image */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Image <span className="text-[0.6rem] normal-case text-muted-foreground/60">(shown in Image mode)</span></label>
                            <div className="flex gap-2">
                              <input value={tempCareer.image_url || ""} onChange={(e) => setTempCareer({ ...tempCareer, image_url: e.target.value })} className={fieldCls} placeholder="/assets/careers/..." />
                              <label className="shrink-0 px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-xs font-medium cursor-pointer hover:bg-secondary/20 flex items-center gap-1">
                                Upload
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  const url = await uploadFile(f, "careers");
                                  if (url) setTempCareer((p) => ({ ...p, image_url: url }));
                                }} />
                              </label>
                            </div>
                            {tempCareer.image_url && <img src={tempCareer.image_url} alt="preview" className="h-14 rounded-lg object-cover mt-2 shadow-sm border border-border/50" />}
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditingCareer(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={saveCareer} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold shadow-md shadow-secondary/10"><Check size={16} /> Save Job Post</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border/50 flex items-center justify-center bg-secondary/10">
                            {j.image_url ? (
                              <img src={j.image_url} alt={j.title} className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <JobIconComp size={18} className="text-secondary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground flex items-center gap-2">
                              {j.title}
                              {j.image_url && <span className="text-[0.5625rem] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">IMG</span>}
                              {j.icon && <span className="text-[0.5625rem] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded font-bold uppercase">{j.icon}</span>}
                            </div>
                            <div className="text-[0.6875rem] text-muted-foreground flex items-center gap-2 mt-1 uppercase font-bold tracking-tight">
                              <span className="flex items-center gap-1"><MapPin size={10} className="text-secondary" /> {j.location}</span>
                              <span className="px-1.5 py-0.5 rounded-sm bg-secondary/10 text-secondary">{j.job_type}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingCareer(j.id); setTempCareer(j); }} className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => toggleVisibility("career_jobs", j.id, j.is_visible, setCareers)}
                              className={`p-2 rounded-lg hover:bg-muted ${j.is_visible ? "text-secondary" : "text-muted-foreground"}`}>
                              {j.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button onClick={() => deleteItem("career_jobs", j.id, setCareers)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case "global_presence":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <MapPin size={20} className="text-secondary" /> Global Presence
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="space-y-4 border-b border-border/50 pb-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <InlineField label="Badge" value={siteContent.global_presence_header?.badge || ""} onChange={(v) => updateContent("global_presence_header", "badge", v)} />
                  <InlineField label="Section Title" value={siteContent.global_presence_header?.title || ""} onChange={(v) => updateContent("global_presence_header", "title", v)} />
                  <InlineField label="Highlight" value={siteContent.global_presence_header?.highlight || ""} onChange={(v) => updateContent("global_presence_header", "highlight", v)} />
                </div>
                <InlineField label="Headline Description" value={siteContent.global_presence_header?.description || ""} onChange={(v) => updateContent("global_presence_header", "description", v)} multiline />
                <div className="flex justify-end">
                  <button onClick={() => upsertSection("global_presence_header")} disabled={saving === "global_presence_header"}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-lg text-xs font-bold hover:bg-secondary hover:text-secondary-foreground transition-all">
                    <Save size={14} /> Save Header Info
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Operational Hubs ({locations.length})</span>
                  <button onClick={addLocation} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                    <Plus size={14} /> Add Hub
                  </button>
                </div>
                <div className="grid gap-3">
                  {locations.map((loc, idx) => (
                    <div key={`${loc.name}-${idx}`} className="border border-border/50 rounded-xl p-4 bg-muted/10">
                      {editingLocation === idx ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <InlineField label="Office Location Name" value={tempLocation.name || ""} onChange={(v) => setTempLocation({ ...tempLocation, name: v })} />
                            <InlineField label="Flag Emoji" value={tempLocation.flag || ""} onChange={(v) => setTempLocation({ ...tempLocation, flag: v })} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coordinates</label>
                              <div className="flex items-center gap-2">
                                <span className="text-[0.625rem] text-muted-foreground">Lat</span>
                                <input value={String(tempLocation.lat || 0)} onChange={(e) => setTempLocation({ ...tempLocation, lat: parseFloat(e.target.value) || 0 })} className={`${fieldCls} w-24`} />
                                <span className="text-[0.625rem] text-muted-foreground">Lng</span>
                                <input value={String(tempLocation.lng || 0)} onChange={(e) => setTempLocation({ ...tempLocation, lng: parseFloat(e.target.value) || 0 })} className={`${fieldCls} w-24`} />
                              </div>
                            </div>
                            <InlineField label="Primary Client/Reference" value={tempLocation.clients || ""} onChange={(v) => setTempLocation({ ...tempLocation, clients: v })} />
                          </div>
                          <InlineField label="Local Landmark" value={tempLocation.landmark || ""} onChange={(v) => setTempLocation({ ...tempLocation, landmark: v })} />
                          <RichField label="Brief Overview" value={tempLocation.description || ""} onChange={(v) => setTempLocation({ ...tempLocation, description: v })} />

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                              Interactive Pin Setting
                              <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[0.5625rem] font-bold">CLICK MAP TO ADJUST</span>
                            </label>
                            <div className="h-64 w-full rounded-xl overflow-hidden border border-border/80 shadow-inner relative z-10">
                              <MapContainer
                                center={[tempLocation.lat || 0, tempLocation.lng || 0]}
                                zoom={tempLocation.lat ? 6 : 2}
                                style={{ height: "100%", width: "100%" }}
                              >
                                <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
                                <MapPicker
                                  lat={tempLocation.lat || 0}
                                  lng={tempLocation.lng || 0}
                                  onPick={(lat, lng) => setTempLocation(p => ({ ...p, lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) }))}
                                />
                              </MapContainer>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditingLocation(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                            <button onClick={saveLocationEdit} className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold shadow-md"><Check size={18} /> Confirm Hub Details</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center text-2xl shadow-sm shrink-0">
                            {loc.flag}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-foreground">{loc.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Globe size={11} className="text-secondary/60" /> {loc.clients}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditingLocation(idx); setTempLocation(loc); }} className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => deleteLocation(idx)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={saveLocations} disabled={saving === "locations"}
                    className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold shadow-lg shadow-secondary/10 hover:opacity-90 active:scale-95 transition-all">
                    <Save size={18} /> {saving === "locations" ? "Persisting Hubs..." : "Save Global Data"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case "our_network":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Building size={20} className="text-secondary" /> Commercial Network
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Associated Entities ({network.length})</span>
                <button
                  onClick={() => {
                    const n: NetworkCompany = { id: Date.now().toString(), name: "New Affiliate", subtitle: "", desc: "", href: "#", flag: "🏢", accent: "#3b82f6", is_visible: true };
                    setNetwork([...network, n]);
                    setEditingNetwork(n.id);
                    setTempNetwork(n);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                  <Plus size={14} /> Add Company
                </button>
              </div>
              <div className="grid gap-4">
                {network.map((co) => (
                  <div key={co.id} className="border border-border/50 rounded-xl p-1 bg-muted/20">
                    {editingNetwork === co.id ? (
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <InlineField label="Company Name" value={tempNetwork.name || ""} onChange={(v) => setTempNetwork({ ...tempNetwork, name: v })} />
                          <InlineField label="Legal Descriptor / Subtitle" value={tempNetwork.subtitle || ""} onChange={(v) => setTempNetwork({ ...tempNetwork, subtitle: v })} />
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <InlineField label="Emoji Icon" value={tempNetwork.flag || ""} onChange={(v) => setTempNetwork({ ...tempNetwork, flag: v })} />
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Brand Logo URL</label>
                            <div className="flex gap-2">
                              <input value={(tempNetwork as any).logo_url || ""} onChange={(e) => setTempNetwork({ ...tempNetwork, logo_url: e.target.value })} className={fieldCls} placeholder="/assets/clients/..." />
                              <label className="shrink-0 px-3 py-2 bg-secondary/10 text-secondary rounded-lg text-xs font-bold cursor-pointer hover:bg-secondary/20 flex items-center gap-1.5 border border-secondary/20">
                                Upload Asset
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  const url = await uploadFile(f, "clients");
                                  if (url) setTempNetwork((p) => ({ ...p, logo_url: url }));
                                }} />
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <InlineField label="Brand Accent Color" value={tempNetwork.accent || ""} onChange={(v) => setTempNetwork({ ...tempNetwork, accent: v })} />
                          <InlineField label="External Website Link" value={tempNetwork.href || ""} onChange={(v) => setTempNetwork({ ...tempNetwork, href: v })} />
                        </div>
                        <InlineField label="Brief Portfolio Summary" value={tempNetwork.desc || ""} onChange={(v) => setTempNetwork({ ...tempNetwork, desc: v })} multiline />
                        <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => setEditingNetwork(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground italic">Cancel Changes</button>
                          <button onClick={() => {
                            setNetwork((prev) => prev.map((c) => c.id === editingNetwork ? { ...c, ...tempNetwork } as NetworkCompany : c));
                            setEditingNetwork(null);
                          }} className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold shadow-md shadow-secondary/10"><Check size={18} /> Update Network Entry</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-xl bg-background border border-border/60 flex items-center justify-center p-2 shadow-sm shrink-0">
                          {co.logo_url ? (
                            <img src={co.logo_url} alt={co.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-3xl">{co.flag}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg text-foreground flex items-center gap-2">
                            {co.name}
                            <div className="w-2 h-2 rounded-full" style={{ background: co.accent || "#3b82f6" }} />
                          </div>
                          <div className="text-xs font-bold text-secondary uppercase tracking-widest mt-0.5">{co.subtitle}</div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{co.desc}</div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => { setEditingNetwork(co.id); setTempNetwork(co); }} className="p-2.5 rounded-lg border border-border bg-background hover:bg-secondary/10 hover:text-secondary group transition-all" title="Edit Company"><Edit2 size={16} className="group-hover:scale-110 transition-transform" /></button>
                          <button
                            onClick={() => setNetwork((prev) => prev.map((c) => c.id === co.id ? { ...c, is_visible: !c.is_visible } : c))}
                            className={`p-2.5 rounded-lg border border-border bg-background transition-all ${co.is_visible ? "text-secondary hover:bg-secondary/5" : "text-muted-foreground hover:bg-muted"}`} title={co.is_visible ? "Currently Live" : "Hidden State"}>
                            {co.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                          <button onClick={() => setNetwork((prev) => prev.filter((c) => c.id !== co.id))} className="p-2.5 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive group transition-all" title="Remove Entry"><Trash2 size={16} className="group-hover:rotate-12 transition-transform" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={saveNetwork} disabled={saving === "network"}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <Save size={20} /> {saving === "network" ? "Synchronizing..." : "Persist Network Map"}
                </button>
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Phone size={20} className="text-secondary" /> Contact Channels
            </h3>
            <div className="glass-card p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <InlineField label="Main Header" value={siteContent.contact?.title || ""} onChange={(v) => updateContent("contact", "title", v)} />
                <InlineField label="Email Address" value={siteContent.contact?.email || ""} onChange={(v) => updateContent("contact", "email", v)} />
              </div>
              <RichField label="Supporting Text / Subtitle" value={siteContent.contact?.subtitle || ""} onChange={(v) => updateContent("contact", "subtitle", v)} />
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-4">
                  <InlineField label="Physical Office Address" value={siteContent.contact?.address || ""} onChange={(v) => updateContent("contact", "address", v)} multiline />
                  <InlineField label="Business Hours" value={siteContent.contact?.hours || ""} onChange={(v) => updateContent("contact", "hours", v)} multiline />
                </div>
                <div className="space-y-4">
                  <InlineField label="Mobile / WhatsApp" value={siteContent.contact?.phone || ""} onChange={(v) => updateContent("contact", "phone", v)} />
                  <InlineField label="Landline / Regional" value={siteContent.contact?.landline || ""} onChange={(v) => updateContent("contact", "landline", v)} />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-border/50">
                <button onClick={() => upsertSection("contact")} disabled={saving === "contact"}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold shadow-lg shadow-secondary/15 hover:opacity-95 transition-all">
                  <Save size={18} /> {saving === "contact" ? "Deploying Updates..." : "Save Contact Points"}
                </button>
              </div>
            </div>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-4 pt-2">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <Shield size={20} className="text-secondary" /> Footer Branding
            </h3>
            <div className="glass-card p-6 space-y-6">
              <div className="space-y-4">
                <InlineField label="Legal Copyright String" value={siteContent.footer?.copyright || ""} onChange={(v) => updateContent("footer", "copyright", v)} />
                <RichField label="Company Mission Tagline" value={siteContent.footer?.tagline || ""} onChange={(v) => updateContent("footer", "tagline", v)} />
              </div>
              <div className="flex justify-end pt-4 border-t border-border/50">
                <button onClick={() => upsertSection("footer")} disabled={saving === "footer"}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 transition-all">
                  <Save size={18} /> {saving === "footer" ? "Syncing Global Footer..." : "Set Global Footer Branding"}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 antialiased">
      {/* Sidebar Navigation */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <div className="px-4 py-2 border-b border-border/50 mb-2">
          <h2 className="text-xl font-heading font-black text-foreground tracking-tight">Website Editor</h2>
          <p className="text-[0.625rem] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Global Configuration</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
          {SECTIONS.map((s) => {
            const Ic = s.icon;
            const active = activeTab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 group ${active
                  ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20 scale-[1.02]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${active ? "bg-white/20" : "bg-secondary/10 group-hover:bg-secondary/20"}`}>
                  <Ic size={18} className={active ? "text-white" : "text-secondary"} />
                </div>
                {s.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar pb-10">
        <div className="glass-panel min-h-full p-1 border-none bg-transparent">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
};

export default PageEditor;
