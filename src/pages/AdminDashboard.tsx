import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/api";
import { toast } from "sonner";
import {
  LayoutDashboard, MessageSquare, FileText, Shield, Globe, LogOut, Eye, EyeOff, Trash2, ChevronLeft, Menu, X, PanelLeftClose, PanelLeft, Settings, RefreshCw, Mail, Activity, Send, PhoneCall, Save, Bot, Sun, Moon, Star, Plus,
  ChevronRight, Calendar as CalendarIcon, Clock, User, Briefcase, LayoutGrid, List, Search, ChevronDown, Image, Type, BotMessageSquare
} from "lucide-react";
import { openViber, ViberIcon } from "@/lib/viber";
import * as LucideIcons from "lucide-react";

const DynamicSocialIcon = ({ name, size = 15, className }: { name: string; size?: number; className?: string }) => {
  if (!name) return <LucideIcons.Globe size={size} className={className} />;
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith("<svg")) {
    return (
      <div 
        className={`flex items-center justify-center ${className || ""}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  if (trimmed.toLowerCase() === "viber") {
    return <ViberIcon size={size} className={className} />;
  }
  const Icon = (LucideIcons as any)[trimmed] || LucideIcons.HelpCircle;
  return <Icon size={size} className={className} />;
};
import type { Tables } from "@/integrations/supabase/types";
import SEOManager from "@/components/admin/SEOManager";
import SecurityPanel from "@/components/admin/SecurityPanel";
import PageEditor from "@/components/admin/PageEditor";
import LiveEditor from "@/components/admin/LiveEditor";
import { useUndoAction } from "@/hooks/useUndoAction";
import LoadingSpinner from "@/components/LoadingSpinner";
import { applySettings, saveThemePref, saveUserSettings, getUserSettings } from "@/hooks/useSiteSettings";

const formatDate = (value: string | Date): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const tt = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}-${mon}-${year} ${String(hours).padStart(2, "0")}:${minutes} ${tt}`;
};

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const toggle = () => {
    const next = !isDark;
    const theme = next ? "dark" : "light";
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    saveThemePref(theme);
    window.dispatchEvent(new CustomEvent("ss:themeChanged", { detail: theme }));
    setIsDark(next);
    // Keep uxDraft in sync so Settings page Visual Theme buttons reflect the change
    window.dispatchEvent(new CustomEvent("ss:adminThemeChanged", { detail: theme }));
  };
  return { isDark, toggle };
}

type Tab = "dashboard" | "inbox" | "website" | "sitehealth" | "settings" | "chat" | "appointments";

const AVAILABLE_FONTS: { label: string; value: string }[] = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Nunito", value: "'Nunito', sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Raleway", value: "'Raleway', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Source Code Pro", value: "'Source Code Pro', monospace" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

interface SiteSettings {
  site_name: string; site_logo: string; whatsapp_number: string; viber_number: string;
  contact_email: string; contact_from_email: string;
  smtp_host: string; smtp_port: string; smtp_user: string; smtp_pass: string;
  ai_model: string; demo_url: string; db_connection: string;
  social_linkedin: string; social_twitter: string; social_facebook: string; social_instagram: string;
  landline: string; enable_cinematic: boolean; cinematic_asset: string;
  font_size: string; theme: string; font_style: string; enable_animations: boolean;
  gemini_api_key: string; openai_api_key: string; system_prompt: string;
  accent_color: string; global_view: string; card_style: string;
  bot_api_url: string; bot_api_token: string;
  hr_email: string;
  social_count?: string;
  [key: string]: any;
}

const AppointmentsCalendar = ({
  appointments,
  submissions = [],
  applications = [],
  onAppointmentUpdated,
  onAppointmentCreated,
  onAppointmentDeleted,
}: {
  appointments: any[];
  submissions?: any[];
  applications?: any[];
  onAppointmentUpdated?: (updated: any) => void;
  onAppointmentCreated?: (created: any) => void;
  onAppointmentDeleted?: (id: string) => void;
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [appointmentMeta, setAppointmentMeta] = useState<any | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [apptMetaLoading, setApptMetaLoading] = useState(false);
  const [apptSaving, setApptSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    reference_type: "manual",
    reference_id: "",
    name: "",
    email: "",
    title: "",
    description: "",
    notes: "",
    appointment_date: "",
  });

  const toLocalDatetime = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const openCreateModalForDate = (day: number) => {
    const targetDate = new Date(year, month, day, 9, 0);
    setNewAppointment((prev) => ({ ...prev, appointment_date: toLocalDatetime(targetDate) }));
    setShowCreateModal(true);
    setModalPosition({ x: 0, y: 0 });
  };

  const handlePopupPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePopupPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    setModalPosition((prev) => ({
      x: prev.x + (e.clientX - dragStart.x),
      y: prev.y + (e.clientY - dragStart.y),
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePopupPointerUp = () => {
    setDragStart(null);
  };

  const resetNewAppointment = () => {
    setNewAppointment({
      reference_type: "manual",
      reference_id: "",
      name: "",
      email: "",
      title: "",
      description: "",
      notes: "",
      appointment_date: "",
    });
  };

  useEffect(() => {
    if (!showCreateModal) resetNewAppointment();
  }, [showCreateModal]);

  useEffect(() => {
    if (!newAppointment.reference_id) return;
    if (newAppointment.reference_type === "contact") {
      const selected = submissions.find((item: any) => item.id === newAppointment.reference_id);
      if (selected) {
        setNewAppointment((prev) => ({
          ...prev,
          name: selected.full_name || selected.name || prev.name,
          email: selected.email || prev.email,
        }));
      }
    }
    if (newAppointment.reference_type === "application") {
      const selected = applications.find((item: any) => item.id === newAppointment.reference_id);
      if (selected) {
        setNewAppointment((prev) => ({
          ...prev,
          name: selected.applicant_name || prev.name,
          email: selected.email || prev.email,
        }));
      }
    }
  }, [newAppointment.reference_id, newAppointment.reference_type, submissions, applications]);

  const normalizeAppointmentDate = (value: string) => {
    if (!value || !value.trim()) return "";
    const candidate = value.trim();
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString();
  };

  const createAppointment = async () => {
    const trimmedName = newAppointment.name.trim();
    const trimmedEmail = newAppointment.email.trim();
    const trimmedTitle = newAppointment.title.trim();
    const trimmedDate = newAppointment.appointment_date.trim();
    const appointmentDate = normalizeAppointmentDate(trimmedDate);

    if (!trimmedName || !trimmedEmail || !trimmedTitle || !appointmentDate) {
      toast.error("Name, email, title and appointment date are required.");
      return;
    }

    setCreateLoading(true);
    try {
      const url = new URL(`/api/db/appointments`, window.location.origin);
      const resp = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_type: newAppointment.reference_type,
          reference_id: newAppointment.reference_id || "",
          name: trimmedName,
          email: trimmedEmail,
          title: trimmedTitle,
          description: newAppointment.description.trim(),
          notes: newAppointment.notes.trim() || null,
          appointment_date: appointmentDate,
          created_at: new Date().toISOString(),
        }),
      });
      const json = await resp.json();
      if (!json?.data) throw new Error(json?.error?.message || "Failed to create appointment.");
      onAppointmentCreated?.(json.data);
      setShowCreateModal(false);
      toast.success("Appointment created successfully.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create appointment.");
    } finally {
      setCreateLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayAppts = (day: number) => {
    return appointments
      .filter((a) => {
        if (!a?.appointment_date) return false;
        const d = new Date(a.appointment_date);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      })
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  };

  const loadAppointmentReference = async (appt: any) => {
    setApptMetaLoading(true);
    setAppointmentMeta(null);
    try {
      if (!appt) return;
      if (appt.reference_type === "contact") {
        const refId = String(appt.reference_id || "");
        const url = new URL(`/api/db/contact_submissions`, window.location.origin);
        url.searchParams.set("id", refId);
        url.searchParams.set("_single", "1");
        const resp = await fetch(url.toString());
        const json = await resp.json();
        if (json?.data) {
          setAppointmentMeta(json.data);
        } else if (refId.endsWith("_2")) {
          const fallbackId = refId.slice(0, -2);
          const fallbackUrl = new URL(`/api/db/contact_submissions`, window.location.origin);
          fallbackUrl.searchParams.set("id", fallbackId);
          fallbackUrl.searchParams.set("_single", "1");
          const fallbackResp = await fetch(fallbackUrl.toString());
          const fallbackJson = await fallbackResp.json();
          setAppointmentMeta(fallbackJson?.data || null);
        }
      }
      if (appt.reference_type === "application") {
        const url = new URL(`/api/db/job_applications`, window.location.origin);
        url.searchParams.set("id", String(appt.reference_id));
        url.searchParams.set("_single", "1");
        const resp = await fetch(url.toString());
        const json = await resp.json();
        setAppointmentMeta(json?.data || null);
      }
    } catch (e) {
      setAppointmentMeta(null);
    }
    setApptMetaLoading(false);
  };

  useEffect(() => {
    if (!selectedAppt) {
      setAppointmentMeta(null);
      setAppointmentNotes("");
      return;
    }
    setAppointmentNotes(selectedAppt.notes || "");
    loadAppointmentReference(selectedAppt);
  }, [selectedAppt]);

  const closeModal = () => setSelectedAppt(null);

  const saveAppointmentNotes = async () => {
    if (!selectedAppt) return;
    const trimmedNotes = appointmentNotes.trim();
    setApptSaving(true);
    try {
      if (trimmedNotes.length === 0) {
        throw new Error("Enter notes before saving or use delete to remove existing notes.");
      }
      const url = new URL(`/api/db/appointments`, window.location.origin);
      url.searchParams.set("id", selectedAppt.id);
      const resp = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmedNotes }),
      });
      const json = await resp.json();
      if (!json?.data) throw new Error(json?.error?.message || "Save failed.");
      setSelectedAppt(json.data);
      onAppointmentUpdated?.(json.data);
      toast.success("Appointment notes saved.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save appointment notes.");
    }
    setApptSaving(false);
  };

  const deleteAppointmentNote = async () => {
    if (!selectedAppt) return;
    setApptSaving(true);
    try {
      const url = new URL(`/api/db/appointments`, window.location.origin);
      url.searchParams.set("id", selectedAppt.id);
      const resp = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: null }),
      });
      const json = await resp.json();
      if (!json?.data) throw new Error(json?.error?.message || "Delete failed.");
      setSelectedAppt(json.data);
      setAppointmentNotes("");
      onAppointmentUpdated?.(json.data);
      toast.success("Appointment note deleted.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete note.");
    }
    setApptSaving(false);
  };

  const hasExistingNote = Boolean(selectedAppt?.notes?.trim());
  const trimmedNotes = appointmentNotes.trim();
  const canSaveNotes = trimmedNotes.length > 0;
  const appointmentStatus = appointmentMeta?.status || appointmentMeta?.is_read !== undefined ? (appointmentMeta.is_read ? "Responded" : "New") : "Unknown";
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="glass-card flex flex-col items-stretch overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row justify-between w-full items-center px-4 sm:px-6 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handlePrev} className="p-2 bg-background border border-border shadow-sm hover:bg-muted text-foreground rounded-lg transition-colors flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-xl font-heading font-black text-foreground flex items-center gap-2">
            <CalendarIcon size={20} className="text-secondary" /> {monthName}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/15">
            <Plus size={16} /> New Appointment
          </button>
          <button onClick={handleNext} className="p-2 bg-background border border-border shadow-sm hover:bg-muted text-foreground rounded-lg transition-colors flex items-center justify-center">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="w-full p-3 sm:p-5 lg:p-6 bg-background grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-7 border-t border-l border-border/60 rounded-xl overflow-hidden shadow-2xl bg-card/30">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-muted/40 p-2 text-center text-[0.65rem] font-bold uppercase text-muted-foreground/80 tracking-widest border-r border-b border-border/60">
                {d}
              </div>
            ))}
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="bg-muted/5 border-r border-b border-border/60 min-h-[120px] sm:min-h-[140px]" />;
              const dayAppts = getDayAppts(day);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              return (
                <div key={`day-${day}`}
                  onClick={() => openCreateModalForDate(day)}
                  className={`group relative bg-card hover:bg-muted/10 border-r border-b border-border/60 min-h-[120px] sm:min-h-[140px] transition-all cursor-pointer`}
                >
                  <div className="flex justify-end p-2 pb-1">
                    <span className={`flex items-center justify-center w-6 h-6 text-[0.7rem] font-bold rounded-full transition-colors ${isToday ? 'bg-secondary text-white shadow-md shadow-secondary/20' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>
                      {day}
                    </span>
                  </div>
                  <div className="px-1 pb-1 space-y-1 max-h-[85px] sm:max-h-[105px] overflow-y-auto custom-scrollbar">
                    {dayAppts.map((a) => (
                      <button
                        type="button"
                        key={a.id || `${day}-${a.title}-${a.email}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedAppt(a); }}
                        className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-[4px] transition-all hover:brightness-95 active:scale-[0.98] border-l-2 truncate ${a.reference_type === 'contact'
                            ? 'bg-blue-500/10 text-blue-700 border-blue-500/50'
                            : 'bg-green-500/10 text-green-700 border-green-500/50'
                          }`}
                      >
                        <span className="text-[0.6rem] font-bold opacity-70 shrink-0">
                          {new Date(a.appointment_date).toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(' ', '').toLowerCase()}
                        </span>
                        <span className="text-[0.65rem] font-bold truncate">{a.name}</span>
                      </button>
                    ))}
                    {dayAppts.length === 0 && (
                      <div className="absolute inset-x-0 bottom-0 top-10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                        <Plus size={14} className="text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar for Unscheduled items */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 h-full">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} className="text-secondary" /> Recent Submissions
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {[...submissions, ...applications]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 10)
                .map((s) => {
                  const isScheduled = appointments.some(a => a.reference_id === s.id || (a.reference_id && a.reference_id.startsWith(s.id)));
                  const isApp = 'applicant_name' in s;
                  return (
                    <div key={s.id} className={`p-3 rounded-xl border transition-all ${isScheduled ? 'bg-background/50 border-secondary/40 opacity-70' : 'bg-background border-secondary/20 shadow-sm hover:border-secondary/40'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[0.625rem] font-bold uppercase px-1.5 py-0.5 rounded ${isApp ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {isApp ? 'Job' : 'Inquiry'}
                        </span>
                        {!isScheduled && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                      </div>
                      <div className="text-xs font-bold text-foreground truncate">{isApp ? s.applicant_name : (s.full_name || s.name || s.email)}</div>
                      <div className="text-[0.625rem] text-muted-foreground mt-1 flex items-center justify-between">
                        <span>{formatDate(s.created_at)}</span>
                        {!isScheduled && (
                          <button onClick={() => {
                            setNewAppointment({
                              reference_type: isApp ? "application" : "contact",
                              reference_id: s.id,
                              name: isApp ? s.applicant_name : (s.full_name || s.name),
                              email: s.email,
                              title: isApp ? `Interview: ${s.job_id || "General"}` : "Follow-up",
                              description: "",
                              notes: "",
                              appointment_date: toLocalDatetime(new Date()),
                            });
                            setShowCreateModal(true);
                          }} className="text-secondary hover:underline font-bold">Schedule</button>
                        )}
                        {isScheduled && <span className="text-muted-foreground italic">Scheduled</span>}
                      </div>
                    </div>
                  );
                })}
              {submissions.length === 0 && applications.length === 0 && (
                <p className="text-[0.6875rem] text-muted-foreground text-center py-8 italic">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedAppt && (
        <div className="fixed inset-0 z-50 p-4" onClick={closeModal} onPointerMove={handlePopupPointerMove} onPointerUp={handlePopupPointerUp}>
          <div className="absolute w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in duration-150" style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${modalPosition.x}px), calc(-50% + ${modalPosition.y}px))` }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex flex-col gap-1 cursor-grab" onPointerDown={handlePopupPointerDown}>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${selectedAppt.reference_type === 'application' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                    {selectedAppt.reference_type === 'application' ? <Briefcase size={10} /> : <User size={10} />}
                    {selectedAppt.reference_type === 'application' ? 'Job' : 'Contact'}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{selectedAppt.title || selectedAppt.name || 'Appointment'}</h3>
                </div>
                <p className="text-[0.65rem] text-muted-foreground">{formatDate(selectedAppt.appointment_date)}</p>
              </div>
              <button onClick={closeModal} onPointerDown={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X size={16} /></button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto max-h-[70vh] divide-y divide-border">
              {/* Core details */}
              <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Name</p>
                  <p className="text-foreground font-semibold">{selectedAppt.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Email</p>
                  <a href={`mailto:${selectedAppt.email}`} className="text-secondary hover:underline font-semibold truncate block">{selectedAppt.email || '—'}</a>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Date</p>
                  <p className="text-foreground font-semibold">{formatDate(selectedAppt.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Time</p>
                  <p className="text-foreground font-semibold">{formatDate(selectedAppt.appointment_date)}</p>
                </div>
                {selectedAppt.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground font-medium mb-0.5">Description</p>
                    <p className="text-foreground leading-relaxed">{selectedAppt.description}</p>
                  </div>
                )}
              </div>

              {/* Associated submission */}
              <div className="px-4 py-3">
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {selectedAppt.reference_type === 'application' ? 'Application Info' : 'Contact Submission'}
                </p>
                {apptMetaLoading ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : appointmentMeta ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {selectedAppt.reference_type === 'contact' ? (
                      <>
                        <div><span className="text-muted-foreground">Name: </span><span className="text-foreground font-medium">{appointmentMeta.full_name || appointmentMeta.name || '—'}</span></div>
                        <div><span className="text-muted-foreground">Phone: </span><span className="text-foreground font-medium">{appointmentMeta.phone || '—'}</span></div>
                        <div><span className="text-muted-foreground">Company: </span><span className="text-foreground font-medium">{appointmentMeta.company_name || '—'}</span></div>
                        {appointmentMeta.message && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-1">Message:</p>
                            <p className="bg-muted/50 rounded-lg px-3 py-2 text-foreground leading-relaxed line-clamp-3">{appointmentMeta.message}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div><span className="text-muted-foreground">Applicant: </span><span className="text-foreground font-medium">{appointmentMeta.applicant_name || '—'}</span></div>
                        <div><span className="text-muted-foreground">Phone: </span><span className="text-foreground font-medium">{appointmentMeta.phone || '—'}</span></div>
                        <div><span className="text-muted-foreground">Job: </span><span className="text-foreground font-medium">{appointmentMeta.job_id || '—'}</span></div>
                        {appointmentMeta.cover_letter && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-1">Cover Letter:</p>
                            <p className="bg-muted/50 rounded-lg px-3 py-2 text-foreground leading-relaxed line-clamp-3">{appointmentMeta.cover_letter}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No linked submission found.</p>
                )}
              </div>

              {/* Notes */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Notes</p>
                  {hasExistingNote && (
                    <button type="button" onClick={deleteAppointmentNote} disabled={apptSaving}
                      className="text-[0.625rem] text-destructive hover:underline disabled:opacity-50">
                      Delete
                    </button>
                  )}
                </div>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none focus:ring-2 focus:ring-ring transition"
                  placeholder="Add a note for this appointment..."
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/20">
              <button type="button"
                onClick={async () => {
                  if (!confirm("Delete this appointment?")) return;
                  const url = new URL(`/api/db/appointments`, window.location.origin);
                  url.searchParams.set("id", selectedAppt.id);
                  await fetch(url.toString(), { method: "DELETE" });
                  onAppointmentDeleted?.(selectedAppt.id);
                  closeModal();
                  toast.success("Appointment deleted.");
                }}
                className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1.5">
                <Trash2 size={13} /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeModal}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                  Close
                </button>
                <button type="button" onClick={saveAppointmentNotes} disabled={!canSaveNotes || apptSaving}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {apptSaving ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 p-4  " onClick={() => setShowCreateModal(false)} onPointerMove={handlePopupPointerMove} onPointerUp={handlePopupPointerUp}>
          <div className="absolute w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in duration-150" style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${modalPosition.x}px), calc(-50% + ${modalPosition.y}px))` }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex flex-col gap-1 cursor-grab" onPointerDown={handlePopupPointerDown}>
                <h3 className="text-sm font-semibold text-foreground">New Appointment</h3>
                {newAppointment.appointment_date && (
                  <p className="text-[0.65rem] text-muted-foreground">{formatDate(newAppointment.appointment_date)}</p>
                )}
              </div>
              <button onClick={() => setShowCreateModal(false)} onPointerDown={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X size={16} /></button>
            </div>

            {/* Form body */}
            <div className="overflow-y-auto max-h-[70vh] px-4 py-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Name *</label>
                  <input value={newAppointment.name} onChange={(e) => setNewAppointment((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Client name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Email *</label>
                  <input type="email" value={newAppointment.email} onChange={(e) => setNewAppointment((p) => ({ ...p, email: e.target.value }))}
                    placeholder="client@example.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Date & Time *</label>
                  <input type="datetime-local" value={newAppointment.appointment_date} onChange={(e) => setNewAppointment((p) => ({ ...p, appointment_date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Reference</label>
                  <select value={newAppointment.reference_type} onChange={(e) => setNewAppointment((p) => ({ ...p, reference_type: e.target.value, reference_id: "" }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring">
                    <option value="manual">Manual</option>
                    <option value="contact">Contact</option>
                    <option value="application">Job Application</option>
                  </select>
                </div>
              </div>
              {newAppointment.reference_type !== "manual" && (
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Link to {newAppointment.reference_type === "contact" ? "Contact" : "Application"}</label>
                  <select value={newAppointment.reference_id} onChange={(e) => setNewAppointment((p) => ({ ...p, reference_id: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Choose one</option>
                    {newAppointment.reference_type === "contact" ? submissions.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.full_name || item.name || item.email}</option>
                    )) : applications.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.applicant_name || item.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Title *</label>
                <input value={newAppointment.title} onChange={(e) => setNewAppointment((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Meeting purpose"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                <textarea value={newAppointment.description} onChange={(e) => setNewAppointment((p) => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Brief description"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none resize-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Notes (optional)</label>
                <textarea value={newAppointment.notes} onChange={(e) => setNewAppointment((p) => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Internal notes"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none resize-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
              <button type="button" onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="button" onClick={createAppointment} disabled={createLoading}
                className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {createLoading ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({ contacts: 0, appointments: 0, jobs: 0, visitors: 0 });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptsLoading, setApptsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");
  const [inboxSubTab, setInboxSubTab] = useState("contacts");
  const [siteHealthSubTab, setSiteHealthSubTab] = useState("seo");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingSub, setReplyingSub] = useState<string | null>(null);
  const [replyingApp, setReplyingApp] = useState<string | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [subReplies, setSubReplies] = useState<Record<string, any[]>>({});
  const [appReplies, setAppReplies] = useState<Record<string, any[]>>({});
  // Inbox filters & pagination
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [subDateFilter, setSubDateFilter] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [appDateFilter, setAppDateFilter] = useState("");
  const [appPage, setAppPage] = useState(1);
  const PAGE_SIZE = 10;
  const [savingSettings, setSavingSettings] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeChannel, setActiveChannel] = useState<"website" | "whatsapp" | "viber">("website");
  const [integrationStatus, setIntegrationStatus] = useState<any>({ whatsapp: "loading", bot: "loading", email: "loading" });
  const { executeWithUndo } = useUndoAction();
  const [activePickerIdx, setActivePickerIdx] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_name: "Systems Solutions",
    site_logo: "/assets/uploads/Logo.png",
    whatsapp_number: "9603011355",
    viber_number: "9489477144",
    contact_email: "info@solutions.com.mv",
    contact_from_email: "devteam.bss@gmail.com",
    hr_email: "", smtp_host: "", smtp_port: "", smtp_user: "", smtp_pass: "",
    bot_api_url: "", bot_api_token: "", ai_model: "gemini-1.5-flash",
    demo_url: "https://demo.hrmetrics.mv/", db_connection: "sqlite://server/app.db",
    social_linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
    social_twitter: "https://x.com/bsspl_india",
    social_facebook: "https://www.facebook.com/brilliantsystemssolutions/",
    social_instagram: "https://www.instagram.com/brilliantsystemssolutions",
    landline: "+91-452 238 7388", enable_cinematic: false,
    cinematic_asset: "/assets/uploads/modern_hero_glass_1775323942548.webp",
    font_size: "medium", theme: "light", font_style: "'Inter', sans-serif",
    enable_animations: true, gemini_api_key: "", openai_api_key: "",
    system_prompt: "", accent_color: "#3b82f6", global_view: "grid", card_style: "glass",
  });

  const [uxDraft, setUxDraft] = useState<any>({
    font_style: "'Inter', sans-serif", font_size: "medium", accent_color: "#3b82f6",
    global_view: "grid", card_style: "icon", theme: "light"
  });

  const dbFetch = useCallback(async (table: string, options: { method?: string; body?: any; query?: Record<string, string> } = {}) => {
    try {
      const url = new URL(`/api/db/${table}`, window.location.origin);
      if (options.query) {
        Object.entries(options.query).forEach(([key, value]) => {
          if (typeof value === "string") url.searchParams.set(key, value);
        });
      }
      // Add cache-busting timestamp
      url.searchParams.set("_t", Date.now().toString());
      const resp = await fetch(url.toString(), {
        method: options.method || "GET",
        headers: { "Content-Type": "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const json = await resp.json();
      return { data: json.data, error: json.error };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: subData } = await dbFetch("contact_submissions", { query: { _order: "created_at", _asc: "false" } });
    if (subData) setSubmissions(subData);
    setLoading(false);
  }, [dbFetch]);

  const loadSettings = useCallback(async () => {
    const { data } = await dbFetch("site_content", { query: { section_key: "settings", _single: "1" } });
    if (data?.content) {
      const c = data.content as any;
      setSiteSettings((prev) => ({ ...prev, ...c }));

      // 1. Get User Overrides from LocalStorage first
      let localPrefs: any = {};
      try {
        const stored = getUserSettings();
        if (stored) localPrefs = stored;
      } catch { /* ignore */ }

      // 2. Sync UX draft prioritizing Local Overrides > DB Settings
      setUxDraft({
        font_style: localPrefs.font_style || c.font_style || "'Inter', sans-serif",
        font_size: localPrefs.font_size || c.font_size || "medium",
        accent_color: localPrefs.accent_color || c.accent_color || "#3b82f6",
        global_view: localPrefs.global_view || c.global_view || "grid",
        card_style: localPrefs.card_style || c.card_style || "icon",
        theme: localPrefs.theme || c.theme || (document.documentElement.classList.contains("dark") ? "dark" : "light"),
      });
    }
  }, [dbFetch]);

  const loadChatHistory = useCallback(async () => {
    setChatLoading(true);
    try {
      const resp = await fetch("/api/chat/history?limit=80");
      const json = await resp.json();
      if (!json.error && json.data) setChatHistory(json.data);
    } catch { /* ignore */ }
    setChatLoading(false);
  }, []);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    const { data } = await dbFetch("job_applications", { query: { _order: "created_at", _asc: "false" } });
    if (data) setApplications(data);
    setAppsLoading(false);
  }, [dbFetch]);

  const loadAppointments = useCallback(async () => {
    setApptsLoading(true);
    try {
      const { data } = await dbFetch("appointments", { query: { _order: "appointment_date", _asc: "true" } });
      if (data) setAppointments(data);
    } catch { /* ignore */ }
    setApptsLoading(false);
  }, [dbFetch]);

  const loadIntegrationStatus = useCallback(async () => {
    try {
      const resp = await fetch("/api/health/integrations");
      const json = await resp.json();
      if (json?.data) setIntegrationStatus(json.data);
    } catch { /* ignore */ }
  }, []);

  const applyUX = (prefs: any) => {
    applySettings(prefs);
  };

  const esRef = useRef<EventSource | null>(null);

  const startSSE = useCallback(() => {
    if (esRef.current) return; // already connected
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.addEventListener("chat", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setChatHistory((prev) => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [data, ...prev].slice(0, 200);
      });
    });
    es.addEventListener("submission", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setSubmissions((prev) => {
        if (prev.some(s => s.id === data.id)) return prev;
        return [data, ...prev];
      });
    });
    es.addEventListener("application", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setApplications((prev) => {
        if (prev.some(a => a.id === data.id)) return prev;
        return [data, ...prev];
      });
    });
    es.addEventListener("appointment", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      setAppointments((prev) => {
        if (prev.some(a => a.id === data.id)) return prev;
        return [...prev, data].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
      });
    });
  }, []);

  useEffect(() => {
    const cleanup = () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSidebarOpen(false);
    if (t === "website") setCollapsed(true);
    else setCollapsed(false);
  };

  // Auto-collapse sidebar on Edit Website
  useEffect(() => {
    if (tab === "website") setCollapsed(true);
    else setCollapsed(false);
  }, [tab]);

  useEffect(() => {
    if (activeTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail) setTab(e.detail as Tab);
    };
    window.addEventListener("ss:switchToTab", handler);
    return () => window.removeEventListener("ss:switchToTab", handler);
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await auth.getSession();
    if (!session) { navigate("/admin/login", { replace: true }); return; }
    const rolesRes = await fetch(`/api/db/users?id=${session.user.id}&userrole=admin&_single=1`).then(r => r.json());
    if (!rolesRes.data) { navigate("/admin/login", { replace: true }); return; }
    setAuthChecking(false);
    startSSE();
    loadData();
    loadSettings();
    loadChatHistory();
    loadApplications();
    loadAppointments();
    loadIntegrationStatus();
  }, [navigate, startSSE, loadData, loadSettings, loadChatHistory, loadApplications, loadAppointments, loadIntegrationStatus]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const saveSettings = async () => {
    setSavingSettings(true);

    // Save UX + all settings to DB as global defaults for all visitors
    const finalSettings = { ...siteSettings, ...uxDraft };
    setSiteSettings(finalSettings);

    saveUserSettings(uxDraft);

    await dbFetch("site_content", {
      method: "POST",
      body: { section_key: "settings", content: finalSettings }
    });

    // Notify all components that DB settings changed
    // applySettings will merge cookie on top, so user prefs are preserved
    window.dispatchEvent(new CustomEvent("ss:contentSaved"));

    setSavingSettings(false);
    toast.success("Settings saved! User cookie preferences are preserved.");
  };

  // Sync uxDraft.theme when sidebar sun/moon toggle is used
  useEffect(() => {
    const handler = (e: Event) => {
      const theme = (e as CustomEvent<string>).detail;
      setUxDraft((p: any) => ({ ...p, theme }));
      setSiteSettings((p) => ({ ...p, theme }));
    };
    window.addEventListener("ss:adminThemeChanged", handler);
    return () => window.removeEventListener("ss:adminThemeChanged", handler);
  }, []);

  // Real-time Preview: Apply UX changes immediately to the Admin Panel as they are drafted
  useEffect(() => {
    if (tab === "settings") {
      applySettings(uxDraft, true);
    }
  }, [uxDraft, tab]);



  const updateApplicationStatus = async (id: string, status: string, message?: string) => {
    if (message) setReplyingApp(id);
    try {
      const resp = await fetch(`/api/applications/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, message }),
      });
      if (resp.ok) {
        if (message) {
          toast.success("Reply sent!");
          await loadAppReplies(id);
        } else {
          toast.success("Application updated!");
          await loadApplications(); // Force refresh the main list
        }
      } else {
        toast.error("Failed to update application.");
      }
    } catch {
      toast.error("Network error updating application.");
    } finally {
      if (message) setReplyingApp(null);
    }
  };

  const loadSubmissionReplies = async (id: string) => {
    try {
      const resp = await fetch(`/api/submissions/${id}/replies`);
      const json = await resp.json();
      if (json.data) setSubReplies(p => ({ ...p, [id]: json.data }));
    } catch { /* ignore */ }
  };

  const loadAppReplies = async (id: string) => {
    try {
      const resp = await fetch(`/api/applications/${id}/replies`);
      const json = await resp.json();
      if (json.data) setAppReplies((p: any) => ({ ...(p || {}), [id]: json.data }));
    } catch { /* ignore */ }
  };

  const toggleCardCollapse = (id: string, type: "sub" | "app") => {
    const isOpening = !collapsedCards[id];
    setCollapsedCards(p => ({ ...p, [id]: !p[id] }));

    if (isOpening) {
      // Reload replies whenever expanding to keep data fresh
      if (type === "sub") {
        loadSubmissionReplies(id);
      } else {
        // Strip app- prefix for loading data
        const rawId = id.startsWith("app-") ? id.replace("app-", "") : id;
        loadAppReplies(rawId);
      }
    }
  };

  const sendSubmissionReply = async (id: string) => {
    const message = replyTexts[id]?.trim();
    if (!message) return;
    setReplyingSub(id);
    try {
      const resp = await fetch(`/api/submissions/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sender: "admin" }),
      });
      if (resp.ok) {
        toast.success("Reply sent!");
        setReplyTexts(p => ({ ...p, [id]: "" }));
        await loadSubmissionReplies(id);
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: true, status: "responded" } : s));
      } else {
        toast.error("Failed to send reply.");
      }
    } catch {
      toast.error("Network error.");
    }
    setReplyingSub(null);
  };

  // SSE moved to useEffect above

  const handleLogout = async () => {
    setLoggingOut(true);
    await auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const toggleRead = async (id: string, current: boolean) => {
    await dbFetch("contact_submissions", {
      method: "PATCH",
      query: { id },
      body: { is_read: !current }
    });
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, is_read: !current } : s));
  };

  const deleteSubmission = async (id: string) => {
    const item = submissions.find((s) => s.id === id);
    if (!item) return;
    const safeUndoId = `del-sub-${String(id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    executeWithUndo({
      id: safeUndoId,
      label: "Submission deleted",
      action: async () => {
        await dbFetch("contact_submissions", { method: "DELETE", query: { id } });
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      },
      undoFn: async () => {
        const { data } = await dbFetch("contact_submissions", {
          method: "POST",
          body: {
            id: String(item.id),
            full_name: String(item.full_name || ""),
            email: String(item.email || ""),
            message: String(item.message || ""),
            company_name: String(item.company_name || ""),
            phone: String(item.phone || ""),
            is_read: item.is_read,
          }
        });
        if (data) setSubmissions((prev) => [data, ...prev]);
      },
    });
  };



  const filteredSubmissions = submissions.filter((s) => {
    const term = subSearch.trim().toLowerCase();
    const haystack = `${s.full_name || s.name || ""} ${s.email || ""} ${s.company_name || ""} ${s.phone || ""} ${s.message || ""}`.toLowerCase();
    if (term && !haystack.includes(term)) return false;
    if (subStatusFilter !== "all") {
      if (subStatusFilter === "read" && !s.is_read) return false;
      if (subStatusFilter === "unread" && s.is_read) return false;
      if (subStatusFilter !== "read" && subStatusFilter !== "unread" && s.status !== subStatusFilter) return false;
    }
    if (subDateFilter) {
      const filterDate = new Date(subDateFilter);
      const createdDate = new Date(s.created_at);
      if (createdDate.toDateString() !== filterDate.toDateString()) return false;
    }
    return true;
  });
  const totalSubPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const displayedSubmissions = filteredSubmissions.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE);

  const filteredApplications = applications.filter((app) => {
    const term = appSearch.trim().toLowerCase();
    const haystack = `${app.applicant_name || ""} ${app.email || ""} ${app.phone || ""} ${app.job_id || ""} ${app.cover_letter || ""}`.toLowerCase();
    if (term && !haystack.includes(term)) return false;
    if (appStatusFilter !== "all" && app.status !== appStatusFilter) return false;
    if (appDateFilter) {
      const filterDate = new Date(appDateFilter);
      const createdDate = new Date(app.created_at);
      if (createdDate.toDateString() !== filterDate.toDateString()) return false;
    }
    return true;
  });
  const totalAppPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const displayedApplications = filteredApplications.slice((appPage - 1) * PAGE_SIZE, appPage * PAGE_SIZE);

  useEffect(() => {
    if (subPage > totalSubPages) setSubPage(totalSubPages);
  }, [subPage, totalSubPages]);

  useEffect(() => {
    if (appPage > totalAppPages) setAppPage(totalAppPages);
  }, [appPage, totalAppPages]);

  useEffect(() => {
    setSubPage(1);
  }, [subSearch, subStatusFilter, subDateFilter]);

  useEffect(() => {
    setAppPage(1);
  }, [appSearch, appStatusFilter, appDateFilter]);

  const sideItems: { key: Tab; icon: any; label: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { key: "inbox", icon: MessageSquare, label: "Inbox" },
    { key: "chat", icon: BotMessageSquare, label: "Live Chat" },
    { key: "appointments", icon: CalendarIcon, label: "Appointments" },
    { key: "website", icon: FileText, label: "Edit Website" },
    { key: "sitehealth", icon: Shield, label: "Site Health" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  const unreadCount = submissions.filter((s) => !s.is_read).length;
  const inboxBadge = unreadCount + applications.filter((a: any) => a.status === "applied").length;

  if (authChecking || loggingOut) return <LoadingSpinner message={loggingOut ? "Signing out..." : "Verifying access..."} />;

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col shrink-0 transition-all duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-16" : "lg:w-64"} w-64`}>
        <div className={`border-b border-border flex items-center ${collapsed ? "lg:justify-center lg:p-3 p-5" : "justify-between p-5"}`}>
          {!collapsed && <h2 className="font-heading font-black text-foreground text-lg tracking-tight">Admin Panel</h2>}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg text-muted-foreground hover:bg-muted"><X size={20} /></button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? "lg:p-1.5 p-3" : "p-3"}`}>
          {sideItems.map((item) => (
            <button key={item.key} onClick={() => switchTab(item.key)} title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-colors ${collapsed ? "lg:justify-center lg:px-0 lg:py-3 gap-3 px-4 py-3" : "gap-3 px-4 py-3"
                } ${tab === item.key ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <item.icon size={18} className="shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
              {item.key === "inbox" && inboxBadge > 0 && !collapsed && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{inboxBadge}</span>
              )}
            </button>
          ))}
          <button onClick={toggleDark} title={isDark ? "Light Mode" : "Dark Mode"} className={`w-full flex items-center rounded-xl text-sm transition-colors ${collapsed ? "lg:justify-center lg:px-0 lg:py-3 gap-3 px-4 py-3" : "gap-3 px-4 py-3"
            } ${isDark ? "text-yellow-400 hover:bg-yellow-400/10" : "text-slate-600 hover:bg-slate-100"}`}>
            {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </nav>
        <div className={`border-t border-border space-y-1 ${collapsed ? "lg:p-1.5 p-3" : "p-3"}`}>
          <a href="/" title={collapsed ? "Back to site" : undefined} className={`flex items-center rounded-xl text-sm text-muted-foreground hover:bg-muted ${collapsed ? "lg:justify-center lg:px-0 lg:py-3 gap-3 px-4 py-3" : "gap-3 px-4 py-3"
            }`}>
            <ChevronLeft size={18} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Back to site</span>
          </a>
          <button onClick={handleLogout} title={collapsed ? "Logout" : undefined} className={`w-full flex items-center rounded-xl text-sm text-destructive hover:bg-destructive/10 ${collapsed ? "lg:justify-center lg:px-0 lg:py-3 gap-3 px-4 py-3" : "gap-3 px-4 py-3"
            }`}>
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-foreground hover:bg-muted"><Menu size={20} /></button>
          <h2 className="font-heading font-semibold text-foreground text-sm capitalize">{tab === "sitehealth" ? "Site Health" : tab.replace("_", " ")}</h2>
        </header>

        <main className="flex-1 p-4 sm:px-4 sm:py-6 lg:px-2 lg:py-8 overflow-auto">
          {loading && tab !== "website" && tab !== "sitehealth" && tab !== "settings" ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {tab === "dashboard" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Dashboard</h1>
                    <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted">
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    {[
                      { label: "Total Submissions", value: submissions.length, color: "text-secondary" },
                      { label: "Unread", value: unreadCount, color: "text-destructive" },
                    ].map((s) => (
                      <div key={s.label} className="glass-card p-6">
                        <div className={`text-3xl font-heading font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-muted-foreground text-sm mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="glass-card p-5 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">Live Website Preview</h3>
                        <p className="text-muted-foreground text-sm mt-1">View your website as visitors see it</p>
                      </div>
                      <a href="/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                        <Eye size={14} /> View Live Site
                      </a>
                    </div>
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-3">Recent Submissions</h3>
                  {submissions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">No submissions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {submissions.slice(0, 5).map((s) => (
                        <div key={s.id} className={`glass-card p-4 ${!s.is_read ? "border-l-4 border-l-secondary" : ""}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold text-foreground text-sm">{s.full_name}</span>
                              <span className="text-muted-foreground text-xs ml-2">{s.email}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                          </div>
                          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{s.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "inbox" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Inbox</h1>
                    <button onClick={() => { loadData(); loadApplications(); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted">
                      <RefreshCw size={13} /> Refresh
                    </button>
                  </div>
                  {/* Sub-tabs */}
                  <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    <div className="flex gap-1 bg-muted/40 rounded-xl p-1 shrink-0">
                      <button onClick={() => setInboxSubTab("contacts")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${inboxSubTab === "contacts" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                        📩 Contact Submissions {unreadCount > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[0.625rem] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                      </button>
                      <button onClick={() => setInboxSubTab("applications")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${inboxSubTab === "applications" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                        💼 Job Applications {applications.filter((a: any) => a.status === "applied").length > 0 && <span className="ml-1 bg-blue-500 text-white text-[0.625rem] px-1.5 py-0.5 rounded-full">{applications.filter((a: any) => a.status === "applied").length}</span>}
                      </button>
                    </div>
                  </div>

                  {/* CONTACTS */}
                  {inboxSubTab === "contacts" && (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-3 items-end mb-4">
                        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-3">
                          <input value={subSearch}
                            onChange={(e) => setSubSearch(e.target.value)}
                            placeholder="Search submissions..."
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                          <select value={subStatusFilter} onChange={(e) => setSubStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring">
                            <option value="all">All statuses</option>
                            <option value="read">Read</option>
                            <option value="unread">Unread</option>
                            <option value="new">New</option>
                            <option value="responded">Responded</option>
                          </select>
                          <input type="date" value={subDateFilter}
                            onChange={(e) => setSubDateFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                      </div>
                      {displayedSubmissions.map((s) => {
                        const isExpanded = collapsedCards[s.id] === true;
                        const replies = subReplies[s.id] || [];
                        return (
                          <div key={s.id} className={`glass-card overflow-hidden transition-all ${!s.is_read ? "border-l-4 border-l-secondary" : ""}`}>
                            {/* Card Header — always visible */}
                            <div className="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                              onClick={() => toggleCardCollapse(s.id, "sub")}>
                              <div className="flex items-center gap-3 min-w-0">
                                <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                <div className="min-w-0">
                                  <span className="font-semibold text-foreground text-sm">{s.full_name || s.name || s.email}</span>
                                  {s.company_name && <span className="text-muted-foreground text-xs ml-2">({s.company_name})</span>}
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.email}{s.phone ? ` · ${s.phone}` : ""}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                                <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(s.created_at)}</span>
                                <button onClick={() => toggleRead(s.id, s.is_read)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title={s.is_read ? "Mark unread" : "Mark read"}>
                                  {s.is_read ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button onClick={() => deleteSubmission(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Expanded body */}
                            {isExpanded && (
                              <div className="border-t border-border/50 px-5 pb-5">
                                {/* Original message */}
                                <div className="pt-4 flex justify-start">
                                  <div className="max-w-[85%] bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground border border-border/40">
                                    <div className="text-[0.625rem] text-muted-foreground font-bold uppercase mb-1">{s.full_name || s.email}</div>
                                    {s.message}
                                    <div className="text-[0.625rem] text-muted-foreground mt-1.5 opacity-60">{formatDate(s.created_at)}</div>
                                  </div>
                                </div>

                                {/* Admin replies in chat style */}
                                {replies.map((r: any) => (
                                  <div key={r.id} className={`flex mt-3 ${r.sender === "admin" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm border ${r.sender === "admin"
                                      ? "bg-secondary text-secondary-foreground border-secondary/20 rounded-tr-sm"
                                      : "bg-muted/50 text-foreground border-border/40 rounded-tl-sm"
                                      }`}>
                                      <div className="text-[0.625rem] font-bold uppercase opacity-70 mb-1">{r.sender === "admin" ? "You (Admin)" : r.sender}</div>
                                      {r.message}
                                      <div className="text-[0.625rem] opacity-50 mt-1.5">{formatDate(r.created_at)}</div>
                                    </div>
                                  </div>
                                ))}

                                {/* Reply input */}
                                <div className="mt-4 space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      value={replyTexts[s.id] || ""}
                                      onChange={(e) => setReplyTexts(p => ({ ...p, [s.id]: e.target.value }))}
                                      onKeyDown={(e) => { if (e.key === "Enter") sendSubmissionReply(s.id); }}
                                      placeholder="Type a reply (sends email)..."
                                      className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                                    />
                                    <button onClick={() => sendSubmissionReply(s.id)}
                                      disabled={replyingSub === s.id || !replyTexts[s.id]?.trim()}
                                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                                      <Send size={14} /> {replyingSub === s.id ? "Sending..." : "Reply"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {displayedSubmissions.length === 0 && <p className="text-muted-foreground text-center py-12">No submissions match the selected filters.</p>}
                      {filteredSubmissions.length > PAGE_SIZE && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-muted-foreground">
                          <button onClick={() => setSubPage((prev) => Math.max(1, prev - 1))}
                            disabled={subPage === 1}
                            className="px-3 py-2 rounded-lg bg-background border border-border text-sm disabled:opacity-50">
                            Previous
                          </button>
                          <span>Page {subPage} of {totalSubPages}</span>
                          <button onClick={() => setSubPage((prev) => Math.min(totalSubPages, prev + 1))}
                            disabled={subPage === totalSubPages}
                            className="px-3 py-2 rounded-lg bg-background border border-border text-sm disabled:opacity-50">
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* APPLICATIONS */}
                  {inboxSubTab === "applications" && (
                    <div className="space-y-3">
                      {appsLoading ? <div className="text-muted-foreground">Loading...</div> : (
                        filteredApplications.length === 0
                          ? <p className="text-muted-foreground text-center py-12">No applications match the selected filters.</p>
                          : <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3 items-end mb-4">
                              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-3">
                                <input value={appSearch}
                                  onChange={(e) => setAppSearch(e.target.value)}
                                  placeholder="Search applications..."
                                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring"
                                />
                                <select value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring">
                                  <option value="all">All statuses</option>
                                  <option value="applied">Applied</option>
                                  <option value="in_review">In Review</option>
                                  <option value="selected">Selected</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                                <input type="date" value={appDateFilter}
                                  onChange={(e) => setAppDateFilter(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>

                            </div>
                            {displayedApplications.map((app) => {
                              const isExpanded = collapsedCards[`app-${app.id}`] === true;
                              const replies = (appReplies as any)?.[app.id] || [];
                              return (
                                <div key={app.id} className="glass-card overflow-hidden">
                                  {/* Header */}
                                  <div className="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                                    onClick={() => toggleCardCollapse(`app-${app.id}`, "app")}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                      <div className="min-w-0">
                                        <div className="font-semibold text-foreground text-sm">{app.applicant_name}</div>
                                        <div className="text-xs text-muted-foreground">{app.email}{app.phone ? ` · ${app.phone}` : ""}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">Applied for: <span className="text-foreground font-medium">{app.job_id || "General"}</span></div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${app.status === "selected" ? "bg-green-100 text-green-700" :
                                        app.status === "rejected" ? "bg-red-100 text-red-700" :
                                          app.status === "in_review" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                                        }`}>{app.status}</span>
                                      <select value={app.status} onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                                        className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground">
                                        {["applied", "in_review", "selected", "rejected"].map(s => (
                                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => {
                                          if (!confirm("Delete this application?")) return;
                                          dbFetch("job_applications", { method: "DELETE", query: { id: app.id } })
                                            .then(() => setApplications(prev => prev.filter(a => a.id !== app.id)));
                                          toast.success("Application deleted.");
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                                        title="Delete application"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded body */}
                                  {isExpanded && (
                                    <div className="border-t border-border/50 px-5 pb-5">
                                      {app.cover_letter && (
                                        <div className="pt-4 flex justify-start">
                                          <div className="max-w-[85%] bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground border border-border/40">
                                            <div className="text-[0.625rem] text-muted-foreground font-bold uppercase mb-1">{app.applicant_name}</div>
                                            {app.cover_letter}
                                            <div className="text-[0.625rem] text-muted-foreground mt-1.5 opacity-60">{formatDate(app.created_at)}</div>
                                          </div>
                                        </div>
                                      )}
                                      {replies.map((r: any) => (
                                        <div key={r.id} className={`flex mt-3 ${r.sender === "admin" ? "justify-end" : "justify-start"}`}>
                                          <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm border ${r.sender === "admin"
                                            ? "bg-secondary text-secondary-foreground border-secondary/20 rounded-tr-sm"
                                            : "bg-muted/50 text-foreground border-border/40 rounded-tl-sm"
                                            }`}>
                                            <div className="text-[0.625rem] font-bold uppercase opacity-70 mb-1">{r.sender === "admin" ? "You (Admin)" : r.sender}</div>
                                            {r.message}
                                            <div className="text-[0.625rem] opacity-50 mt-1.5">{formatDate(r.created_at)}</div>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="mt-4 space-y-2">
                                        <div className="flex gap-2">
                                          <input placeholder="Reply to applicant (sends email)..."
                                            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-ring outline-none"
                                            value={replyTexts[app.id] || ""}
                                            onChange={(e) => setReplyTexts(p => ({ ...p, [app.id]: e.target.value }))}
                                            disabled={replyingApp === app.id}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && replyTexts[app.id]?.trim() && replyingApp !== app.id) {
                                                e.preventDefault();
                                                updateApplicationStatus(app.id, app.status, replyTexts[app.id]);
                                                setReplyTexts(p => ({ ...p, [app.id]: "" }));
                                              }
                                            }}
                                          />
                                          <button
                                            onClick={() => {
                                              updateApplicationStatus(app.id, app.status, replyTexts[app.id]);
                                              setReplyTexts(p => ({ ...p, [app.id]: "" }));
                                            }}
                                            disabled={replyingApp === app.id || !replyTexts[app.id]?.trim()}
                                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                                            <Send size={14} /> {replyingApp === app.id ? "Sending..." : "Send"}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {filteredApplications.length > PAGE_SIZE && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-muted-foreground">
                                <button onClick={() => setAppPage((prev) => Math.max(1, prev - 1))}
                                  disabled={appPage === 1}
                                  className="px-3 py-2 rounded-lg bg-background border border-border text-sm disabled:opacity-50">
                                  Previous
                                </button>
                                <span>Page {appPage} of {totalAppPages}</span>
                                <button onClick={() => setAppPage((prev) => Math.min(totalAppPages, prev + 1))}
                                  disabled={appPage === totalAppPages}
                                  className="px-3 py-2 rounded-lg bg-background border border-border text-sm disabled:opacity-50">
                                  Next
                                </button>
                              </div>
                            )}
                          </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === "website" && <LiveEditor key="live-editor" />}
              {tab === "sitehealth" && (
                <div>
                  <h1 className="text-3xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-4">Site Health</h1>
                  <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    <div className="flex gap-1 bg-muted/40 rounded-xl p-1 shrink-0">
                      <button onClick={() => setSiteHealthSubTab("seo")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${siteHealthSubTab === "seo" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                        🔍 SEO Meta Manager
                      </button>
                      <button onClick={() => setSiteHealthSubTab("security")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${siteHealthSubTab === "security" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                        🛡️ Security Headers
                      </button>
                    </div>
                  </div>
                  {siteHealthSubTab === "seo" && <SEOManager key="seo-manager" />}
                  {siteHealthSubTab === "security" && <SecurityPanel key="security-panel" />}
                </div>
              )}

              {tab === "settings" && (
                <div className="w-full">
                  <div className="w-full space-y-6">
                    <div className="space-y-2">
                      <h1 className="text-3xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent mb-1">Site Settings</h1>
                      <p className="text-muted-foreground text-sm">These settings affect the live website for all visitors in real-time.</p>
                    </div>
                    <div className="glass-card w-full p-6 lg:p-8">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* --- CONSOLIDATED IDENTITY & INFRASTRUCTURE --- */}
                        <div className="lg:col-span-2 space-y-6">
                          <h3 className="text-[0.6875rem] font-black text-secondary uppercase tracking-[0.2em] border-b border-border/50 pb-2 mb-6">Core Identity & Communication</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Left Side: Identity */}
                            <div className="space-y-4">
                              <div>
                                <label className="text-[0.6875rem] font-bold text-muted-foreground/80 mb-1.5 block uppercase tracking-tight">Enterprise Brand Name</label>
                                <input value={siteSettings.site_name}
                                  onChange={(e) => setSiteSettings(p => ({ ...p, site_name: e.target.value }))}
                                  placeholder="e.g. Systems Solutions"
                                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-foreground text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all shadow-sm" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[0.625rem] font-bold text-muted-foreground/80 mb-1 block uppercase">WhatsApp Business</label>
                                  <input value={siteSettings.whatsapp_number}
                                    onChange={(e) => setSiteSettings(p => ({ ...p, whatsapp_number: e.target.value }))}
                                    placeholder="960xxxxxxx"
                                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/60 text-sm outline-none focus:border-secondary" />
                                </div>
                                <div>
                                  <label className="text-[0.625rem] font-bold text-muted-foreground/80 mb-1 block uppercase">Viber Channel</label>
                                  <input value={siteSettings.viber_number || ""}
                                    onChange={(e) => setSiteSettings(p => ({ ...p, viber_number: e.target.value }))}
                                    placeholder="948xxxxxxx"
                                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/60 text-sm outline-none focus:border-secondary" />
                                </div>
                              </div>
                              <div>
                                <label className="text-[0.6875rem] font-bold text-muted-foreground/80 mb-1.5 block uppercase tracking-tight">Primary Contact Inbox</label>
                                <input type="email" value={siteSettings.contact_email}
                                  onChange={(e) => setSiteSettings(p => ({ ...p, contact_email: e.target.value }))}
                                  placeholder="info@solutions.com.mv"
                                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm outline-none focus:border-secondary" />
                              </div>
                            </div>

                            {/* Right Side: SMTP / Infrastructure */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[0.625rem] font-bold text-muted-foreground/80 mb-1 block uppercase">From Email Alias</label>
                                  <input type="email" value={siteSettings.contact_from_email}
                                    onChange={(e) => setSiteSettings(p => ({ ...p, contact_from_email: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/60 text-sm outline-none" />
                                </div>
                                <div>
                                  <label className="text-[0.625rem] font-bold text-muted-foreground/80 mb-1 block uppercase">Internal HR Node</label>
                                  <input type="email" value={siteSettings.hr_email}
                                    onChange={(e) => setSiteSettings(p => ({ ...p, hr_email: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border/60 text-sm outline-none" />
                                </div>
                              </div>

                              <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[0.625rem] font-black text-secondary uppercase tracking-[0.15em]">SMTP Gateway</span>
                                  {siteSettings.smtp_host ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : null}
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                  <div className="col-span-3">
                                    <input value={siteSettings.smtp_host} onChange={(e) => setSiteSettings(p => ({ ...p, smtp_host: e.target.value }))} placeholder="Host" className="w-full px-2 py-1.5 rounded-lg bg-background border border-border/60 text-[0.6875rem] outline-none" />
                                  </div>
                                  <div className="col-span-2">
                                    <input value={siteSettings.smtp_port} onChange={(e) => setSiteSettings(p => ({ ...p, smtp_port: e.target.value }))} placeholder="Port" className="w-full px-2 py-1.5 rounded-lg bg-background border border-border/60 text-[0.6875rem] outline-none" />
                                  </div>
                                </div>
                                <input value={siteSettings.smtp_user} onChange={(e) => setSiteSettings(p => ({ ...p, smtp_user: e.target.value }))} placeholder="Username" className="w-full px-2 py-1.5 rounded-lg bg-background border border-border/60 text-[0.6875rem] outline-none" />
                                <input type="password" value={siteSettings.smtp_pass} onChange={(e) => setSiteSettings(p => ({ ...p, smtp_pass: e.target.value }))} placeholder="Password" className="w-full px-2 py-1.5 rounded-lg bg-background border border-border/60 text-[0.6875rem] outline-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* --- AI & BOT --- */}
                        <div className="space-y-4">
                          <h3 className="text-[0.6875rem] font-bold text-secondary uppercase tracking-widest border-b border-border/50 pb-1">AI & Chat Bot</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">AI Model</label>
                              <input value={siteSettings.ai_model}
                                onChange={(e) => setSiteSettings(p => ({ ...p, ai_model: e.target.value }))}
                                placeholder="gemini-1.5-flash"
                                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">API Choice</label>
                              <select
                                value={siteSettings.gemini_api_key ? "gemini" : "openai"}
                                onChange={(e) => {
                                  // Simple visual toggle for now, doesn't force a switch if keys are missing
                                  const val = e.target.value;
                                  if (val === "openai" && !siteSettings.openai_api_key) {
                                    toast.error("Please provide OpenAI API key first.");
                                  } else if (val === "gemini" && !siteSettings.gemini_api_key) {
                                    toast.error("Please provide Google Gemini API key first.");
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none">
                                <option value="gemini">Google Gemini</option>
                                <option value="openai">OpenAI</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">Google Gemini API Key</label>
                            <input type="password" value={siteSettings.gemini_api_key || ""}
                              onChange={(e) => setSiteSettings(p => ({ ...p, gemini_api_key: e.target.value }))}
                              placeholder="AIzaSy..."
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                          </div>
                          <div>
                            <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">OpenAI API Key (Alternative)</label>
                            <input type="password" value={siteSettings.openai_api_key || ""}
                              onChange={(e) => setSiteSettings(p => ({ ...p, openai_api_key: e.target.value }))}
                              placeholder="sk-..."
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">Bot API Endpoint URL</label>
                              <input value={siteSettings.bot_api_url || ""}
                                onChange={(e) => setSiteSettings(p => ({ ...p, bot_api_url: e.target.value }))}
                                placeholder="https://api.custombot.com"
                                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                            </div>
                            <div>
                              <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">External Bot API Token</label>
                              <input type="password" value={siteSettings.bot_api_token || ""}
                                onChange={(e) => setSiteSettings(p => ({ ...p, bot_api_token: e.target.value }))}
                                placeholder="Token key..."
                                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[0.6875rem] font-medium text-muted-foreground mb-1 block">AI System Persona / Prompt</label>
                            <textarea value={siteSettings.system_prompt || ""}
                              onChange={(e) => setSiteSettings(p => ({ ...p, system_prompt: e.target.value }))}
                              placeholder="You are a helpful assistant for BSS..."
                              rows={3}
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none resize-none" />
                          </div>
                        </div>

                        {/* --- RESOURCES & LINKS --- */}
                        <div className="col-span-full mt-4 pt-8 border-t border-border/50">
                          <h3 className="text-[0.6875rem] font-bold text-secondary uppercase tracking-widest border-b border-border/50 pb-1 mb-6">Resources & Social Links</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Branding */}
                            <div className="space-y-4">
                              <div>
                                <label className="text-[0.625rem] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Site Logo Path</label>
                                <div className="flex gap-2">
                                  <input value={siteSettings.site_logo || ""} onChange={(e) => setSiteSettings(p => ({ ...p, site_logo: e.target.value }))} className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs outline-none focus:ring-1 focus:ring-secondary/30" placeholder="/assets/logo.png" />
                                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center p-1 border border-border shrink-0">
                                    <img src={siteSettings.site_logo || "/logo.png"} alt="Logo" className="max-w-full max-h-full object-contain" />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="text-[0.625rem] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Demo / Portal URL</label>
                                <input value={(siteSettings as any).demo_url || ""} onChange={(e) => setSiteSettings(p => ({ ...p, demo_url: e.target.value }))} className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs outline-none focus:ring-1 focus:ring-secondary/30" placeholder="https://demo.bss.com" />
                              </div>
                              <div>
                                <label className="text-[0.625rem] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Landline / Office Phone</label>
                                <input value={(siteSettings as any).landline || ""} onChange={(e) => setSiteSettings(p => ({ ...p, landline: e.target.value }))} className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs outline-none" placeholder="+960 xxx xxxx" />
                              </div>
                            </div>

                            {/* Manage Social Links Section */}
                            <div className="space-y-4 col-span-full md:col-span-1 lg:col-span-2 bg-muted/20 p-5 rounded-2xl border border-border/50">
                              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-4">
                                <div>
                                  <span className="text-[0.6875rem] font-bold text-foreground uppercase tracking-wider block">Manage Social Links</span>
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest block mt-0.5">Configure icon brands, individual target links, and toggle visibility on the live site</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextCount = parseInt(siteSettings.social_count || "4", 10) + 1;
                                    setSiteSettings(p => ({
                                      ...p,
                                      social_count: nextCount.toString(),
                                      [`social_icon_${nextCount}`]: "Globe",
                                      [`social_href_${nextCount}`]: "",
                                      [`social_visible_${nextCount}`]: "true"
                                    }));
                                    toast.success("New social media row added! Set its brand and URL.");
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105"
                                >
                                  <Plus size={10} /> Add Link
                                </button>
                              </div>
                              
                              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {Array.from({ length: parseInt(siteSettings.social_count || "4", 10) }).map((_, idx) => {
                                  const i = idx + 1;
                                  const iconKey = `social_icon_${i}`;
                                  const hrefKey = `social_href_${i}`;
                                  const visibleKey = `social_visible_${i}`;
                                  
                                  const icon = siteSettings[iconKey] || (
                                    i === 1 ? "Facebook" :
                                    i === 2 ? "Twitter" :
                                    i === 3 ? "Linkedin" :
                                    i === 4 ? "Instagram" : "Globe"
                                  );
                                  
                                  const href = siteSettings[hrefKey] || (
                                    i === 1 ? (siteSettings.social_facebook || "https://www.facebook.com/brilliantsystemssolutions/") :
                                    i === 2 ? (siteSettings.social_twitter || "https://x.com/bsspl_india") :
                                    i === 3 ? (siteSettings.social_linkedin || "https://in.linkedin.com/company/brilliantsystemssolutions") :
                                    i === 4 ? (siteSettings.social_instagram || "https://www.instagram.com/brilliantsystemssolutions") : ""
                                  );
                                  
                                  const isVisible = siteSettings[visibleKey] !== "false" && siteSettings[visibleKey] !== false;
                                  
                                  return (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-background p-4 rounded-xl border border-border/45 shadow-sm relative group/item">
                                      {/* Icon Live Preview */}
                                      <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-inner shrink-0 sm:mb-[2px]" title="Live Icon Preview">
                                        <DynamicSocialIcon name={icon} size={18} />
                                      </div>

                                      {/* Icon / SVG Code Input */}
                                      <div className="flex-1 min-w-[200px] relative">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Brand Icon (Lucide name or paste raw &lt;svg&gt; code)</label>
                                        <div className="flex items-center gap-1.5">
                                          <textarea
                                            rows={1}
                                            value={icon}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setSiteSettings(p => ({ ...p, [iconKey]: val }));
                                            }}
                                            placeholder="e.g. Facebook or <svg ...>...</svg>"
                                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs outline-none focus:ring-1 focus:ring-secondary/35 font-mono resize-y min-h-[34px] custom-scrollbar"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActivePickerIdx(activePickerIdx === i ? null : i);
                                              setPickerSearch("");
                                            }}
                                            className={`px-2.5 py-1 bg-secondary/10 hover:bg-secondary border border-secondary/20 hover:border-transparent text-secondary hover:text-white rounded-lg text-[10px] font-bold h-[34px] flex items-center justify-center gap-1 transition-all shrink-0 ${activePickerIdx === i ? 'bg-secondary text-white' : ''}`}
                                            title="Choose dynamic Lucide icon"
                                          >
                                            <Search size={10} /> Choose
                                          </button>

                                          {activePickerIdx === i && (
                                            <div className="absolute left-0 right-0 sm:w-[320px] bg-popover border border-border rounded-2xl p-4 shadow-2xl z-50 mt-1" style={{ top: '100%' }}>
                                              <div className="flex items-center justify-between mb-3 border-b border-border pb-1.5">
                                                <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Choose Brand Graphic</span>
                                                <button
                                                  type="button"
                                                  onClick={() => setActivePickerIdx(null)}
                                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>

                                              {/* Section 1: Popular Brand Presets */}
                                              <div className="mb-4">
                                                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-2">Popular Brand Presets</span>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                  {[
                                                    { name: "Facebook", value: "Facebook" },
                                                    { name: "Twitter / X", value: "Twitter" },
                                                    { name: "LinkedIn", value: "Linkedin" },
                                                    { name: "Instagram", value: "Instagram" },
                                                    { name: "YouTube", value: "Youtube" },
                                                    { name: "GitHub", value: "Github" },
                                                    { name: "Viber", value: "Viber" },
                                                    { name: "Website", value: "Globe" },
                                                    { name: "Email", value: "Mail" },
                                                    { name: "Phone", value: "Phone" },
                                                    { 
                                                      name: "WhatsApp", 
                                                      value: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-whatsapp"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` 
                                                    },
                                                    {
                                                      name: "Telegram",
                                                      value: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-telegram"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
                                                    },
                                                    {
                                                      name: "TikTok",
                                                      value: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tiktok"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`
                                                    },
                                                    {
                                                      name: "Discord",
                                                      value: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-discord"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M7.5 16.5c2 1.5 7 1.5 9 0M12 2a10 10 0 0 0-10 10c0 4.4 2.8 8.1 6.8 9.4l.2-1.4c-.6-.2-1.2-.5-1.8-.9l1-1.6c.6.4 1.3.7 2 .8M12 22a10 10 0 0 0 10-10c0-4.4-2.8-8.1-6.8-9.4l-.2 1.4c.6.2 1.2.5 1.8.9l-1 1.6c-.6-.4-1.3-.7-2-.8"/></svg>`
                                                    },
                                                    {
                                                      name: "Snapchat",
                                                      value: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snapchat"><path d="M12 3c-1.2 0-2.4.5-3.2 1.3C8 5.1 7.5 6.3 7.5 7.5c0 1.2-.5 2.4-1.3 3.2-.8.8-2 1.3-3.2 1.3H2.5l.8 1.6c.4.8.8 1.6.8 2.4 0 .8-.4 1.6-.8 2.4l-.8 1.6h.5c1.2 0 2.4-.5 3.2-1.3.8-.8 1.3-2 1.3-3.2V15c0-1.2.5-2.4 1.3-3.2.8-.8 2-1.3 3.2-1.3s2.4.5 3.2 1.3c.8.8 1.3 2 1.3 3.2v.5c0 1.2.5 2.4 1.3 3.2.8.8 2 1.3 3.2 1.3h.5l-.8-1.6c-.4-.8-.8-1.6-.8-2.4 0-.8.4-1.6.8-2.4l.8-1.6h-.5c-1.2 0-2.4-.5-3.2-1.3-.8-.8-1.3-2-1.3-3.2 0-1.2-.5-2.4-1.3-3.2-.8-.8-2-1.3-3.2-1.3z"/></svg>`
                                                    }
                                                  ].map(bp => (
                                                    <button
                                                      key={bp.name}
                                                      type="button"
                                                      onClick={() => {
                                                        setSiteSettings(p => ({ ...p, [iconKey]: bp.value }));
                                                        setActivePickerIdx(null);
                                                      }}
                                                      className="p-1.5 rounded-lg bg-muted/40 hover:bg-secondary/20 hover:text-secondary border border-border/20 flex flex-col items-center justify-center gap-1 transition-all group"
                                                      title={bp.name}
                                                    >
                                                      <div className="text-foreground group-hover:text-secondary">
                                                        <DynamicSocialIcon name={bp.value} size={14} />
                                                      </div>
                                                      <span className="text-[7.5px] font-bold text-muted-foreground truncate max-w-full leading-none">{bp.name}</span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>

                                              {/* Section 2: Full Catalog Search */}
                                              <div>
                                                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-2">Search 1000+ Other Icons</span>
                                                <input
                                                  type="text"
                                                  value={pickerSearch}
                                                  onChange={(e) => setPickerSearch(e.target.value)}
                                                  placeholder="Type to search (e.g. globe, cloud)..."
                                                  className="w-full px-2.5 py-1.5 bg-muted border border-border text-[11px] rounded-lg mb-2.5 outline-none focus:ring-1 focus:ring-secondary/35 text-foreground"
                                                  autoFocus
                                                />
                                                <div className="grid grid-cols-6 gap-1 max-h-[120px] overflow-y-auto custom-scrollbar p-0.5">
                                                  {Object.keys(LucideIcons)
                                                    .filter(k => /^[A-Z]/.test(k) && k !== "Icon" && k !== "createLucideIcon")
                                                    .filter(name => name.toLowerCase().includes(pickerSearch.toLowerCase()))
                                                    .slice(0, 36)
                                                    .map(iconName => {
                                                      const IconComp = (LucideIcons as any)[iconName];
                                                      return (
                                                        <button
                                                          key={iconName}
                                                          type="button"
                                                          onClick={() => {
                                                            setSiteSettings(p => ({ ...p, [iconKey]: iconName }));
                                                            setActivePickerIdx(null);
                                                          }}
                                                          className={`p-1.5 rounded bg-muted/30 hover:bg-secondary/20 hover:text-secondary flex items-center justify-center border border-border/10 transition-all ${icon === iconName ? 'bg-secondary/20 text-secondary border-secondary/30 font-bold' : 'text-muted-foreground'}`}
                                                          title={iconName}
                                                        >
                                                          <IconComp size={13} />
                                                        </button>
                                                      );
                                                    })}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* URL Input */}
                                      <div className="flex-[1.5] min-w-[150px]">
                                        <input 
                                          type="text"
                                          value={href}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setSiteSettings(p => {
                                              const next = { ...p, [hrefKey]: val };
                                              if (i === 1) next.social_facebook = val;
                                              else if (i === 2) next.social_twitter = val;
                                              else if (i === 3) next.social_linkedin = val;
                                              else if (i === 4) next.social_instagram = val;
                                              return next;
                                            });
                                          }}
                                          placeholder="https://..."
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs outline-none focus:ring-1 focus:ring-secondary/35 font-mono h-[34px]"
                                        />
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-1.5 shrink-0 sm:mb-[2px]">
                                        {/* Toggle Visibility */}
                                        <button
                                          type="button"
                                          onClick={() => setSiteSettings(p => ({ ...p, [visibleKey]: isVisible ? "false" : "true" }))}
                                          className={`p-1.5 rounded-lg hover:scale-105 active:scale-95 transition-all border ${isVisible ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-muted text-muted-foreground border-border/40'}`}
                                          title={isVisible ? "Visible on site" : "Hidden on site"}
                                        >
                                          {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                                        </button>
                                        
                                        {/* Delete Social Links */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!confirm("Are you sure you want to delete this social link row?")) return;
                                            const count = parseInt(siteSettings.social_count || "4", 10);
                                            const nextSettings = { ...siteSettings };
                                            
                                            // 1. Pre-resolve all current values so shifting doesn't run into fallback re-assignment problems
                                            const resolvedList = Array.from({ length: count }).map((_, idx) => {
                                              const idxPlus = idx + 1;
                                              return {
                                                icon: siteSettings[`social_icon_${idxPlus}`] || (
                                                  idxPlus === 1 ? "Facebook" :
                                                  idxPlus === 2 ? "Twitter" :
                                                  idxPlus === 3 ? "Linkedin" :
                                                  idxPlus === 4 ? "Instagram" : "Globe"
                                                ),
                                                href: siteSettings[`social_href_${idxPlus}`] || (
                                                  idxPlus === 1 ? (siteSettings.social_facebook || "https://www.facebook.com/brilliantsystemssolutions/") :
                                                  idxPlus === 2 ? (siteSettings.social_twitter || "https://x.com/bsspl_india") :
                                                  idxPlus === 3 ? (siteSettings.social_linkedin || "https://in.linkedin.com/company/brilliantsystemssolutions") :
                                                  idxPlus === 4 ? (siteSettings.social_instagram || "https://www.instagram.com/brilliantsystemssolutions") : ""
                                                ),
                                                visible: siteSettings[`social_visible_${idxPlus}`] !== "false" && siteSettings[`social_visible_${idxPlus}`] !== false
                                              };
                                            });

                                            // 2. Remove the deleted item at index i - 1
                                            resolvedList.splice(i - 1, 1);

                                            // 3. Clear all old dynamic social settings keys
                                            for (let j = 1; j <= count; j++) {
                                              delete nextSettings[`social_icon_${j}`];
                                              delete nextSettings[`social_href_${j}`];
                                              delete nextSettings[`social_visible_${j}`];
                                            }

                                            // 4. Populate remaining shifted list items
                                            resolvedList.forEach((item, idx) => {
                                              const idxPlus = idx + 1;
                                              nextSettings[`social_icon_${idxPlus}`] = item.icon;
                                              nextSettings[`social_href_${idxPlus}`] = item.href;
                                              nextSettings[`social_visible_${idxPlus}`] = item.visible ? "true" : "false";
                                            });

                                            // 5. Decrement social count
                                            nextSettings.social_count = Math.max(0, count - 1).toString();
                                            setSiteSettings(nextSettings);
                                            toast.success("Social link removed successfully!");
                                          }}
                                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:scale-105 active:scale-95 transition-all"
                                          title="Delete Social Link"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Accent Color only */}
                          </div>
                        </div>
                      </div> {/* End Grid */}

                      {/* --- USER EXPERIENCE (Hierarchical) --- */}
                      <div className="mt-8 pt-8 border-t border-border/50 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-inner">
                              <Settings size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Admin & Portal Preference</h3>
                              <p className="text-[0.625rem] text-muted-foreground font-medium uppercase tracking-widest opacity-60 mt-0.5">Control your workspace and site-wide defaults</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 bg-muted/20 p-5 rounded-3xl border border-border/40">
                          {/* Theme */}
                          <div>
                            <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2 block px-1">Visual Theme</label>
                            <div className="flex gap-1 p-1 bg-background border border-border rounded-xl">
                              {["light", "dark"].map(t => (
                                <button key={t} onClick={() => {
                                  const theme = t;
                                  setUxDraft((p: any) => ({ ...p, theme }));
                                  setSiteSettings(p => ({ ...p, theme }));
                                  // Apply DOM + persist immediately
                                  if (theme === "dark") document.documentElement.classList.add("dark");
                                  else document.documentElement.classList.remove("dark");
                                  saveThemePref(theme);
                                  try {
                                    const prefs = getUserSettings() || {};
                                    prefs.theme = theme as any;
                                    saveUserSettings(prefs);
                                  } catch { /* ignore */ }
                                  window.dispatchEvent(new CustomEvent("ss:themeChanged", { detail: theme }));
                                }}
                                  className={`flex-1 py-1.5 rounded-lg text-[0.625rem] font-bold uppercase transition-all ${uxDraft.theme === t ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Font Family */}
                          <div className="xl:col-span-1">
                            <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2 block px-1">Typography</label>
                            <select value={uxDraft.font_style} onChange={(e) => setUxDraft(p => ({ ...p, font_style: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs outline-none focus:ring-2 focus:ring-secondary/20">
                              {AVAILABLE_FONTS.map(f => (
                                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Text Size */}
                          <div>
                            <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2 block px-1">Text Size</label>
                            <div className="flex gap-1 p-1 bg-background border border-border rounded-xl">
                              {["xs", "sm", "md", "lg", "xl"].map((size, i) => {
                                const vals = ["x-small", "small", "medium", "large", "x-large"];
                                return (
                                  <button key={size} onClick={() => setUxDraft(p => ({ ...p, font_size: vals[i] }))}
                                    className={`flex-1 py-1.5 rounded-lg text-[0.625rem] font-bold uppercase tracking-tighter transition-all ${uxDraft.font_size === vals[i] ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}>
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Image/Icon Mode */}
                          <div>
                            <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2 block px-1">Display Mode</label>
                            <div className="flex gap-1 p-1 bg-background border border-border rounded-xl">
                              <button onClick={() => setUxDraft(p => ({ ...p, card_style: "icon" }))}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[0.625rem] font-bold border-0 transition-all ${uxDraft.card_style === "icon" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                                  }`}>
                                <Type size={10} /> Icon
                              </button>
                              <button onClick={() => setUxDraft(p => ({ ...p, card_style: "image" }))}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[0.625rem] font-bold border-0 transition-all ${uxDraft.card_style === "image" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                                  }`}>
                                <Image size={10} /> Image
                              </button>
                            </div>
                          </div>

                          {/* Brand Accent */}
                          <div>
                            <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2 block px-1">Brand Accent</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={uxDraft.accent_color} onChange={(e) => setUxDraft(p => ({ ...p, accent_color: e.target.value }))}
                                className="w-8 h-8 rounded-lg bg-background border border-border cursor-pointer p-0.5" />
                              <div className="flex gap-1 flex-wrap">
                                {["#3b82f6", "#2db8a0", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981"].map(c => (
                                  <button key={c} onClick={() => setUxDraft(p => ({ ...p, accent_color: c }))}
                                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${uxDraft.accent_color === c ? 'border-foreground shadow-md' : 'border-transparent'}`}
                                    style={{ background: c }} />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* View Strategy */}
                          <div>
                            <label className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2 block px-1">View Layout</label>
                            <div className="flex gap-1">
                              <button onClick={() => setUxDraft(p => ({ ...p, global_view: "grid" }))}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[0.625rem] font-bold border transition-all ${uxDraft.global_view === "grid" ? "border-secondary bg-secondary/5 text-secondary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                                <LayoutGrid size={11} /> Grid
                              </button>
                              <button onClick={() => setUxDraft(p => ({ ...p, global_view: "list" }))}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[0.625rem] font-bold border transition-all ${uxDraft.global_view === "list" ? "border-secondary bg-secondary/5 text-secondary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                                <List size={11} /> List
                              </button>
                            </div>
                          </div>


                        </div>
                      </div>

                      <div className="flex justify-center gap-3 mt-8">
                        <button onClick={() => {
                          const defaults = {
                            font_style: "'Inter', sans-serif", font_size: "small", accent_color: "#3b82f6",
                            global_view: "grid", card_style: "icon", theme: "light"
                          };
                          setUxDraft(defaults);
                          setSiteSettings(p => ({ ...p, ...defaults }));
                          localStorage.removeItem("bss-user-settings");
                          toast.success("Preferences reset to default. Click Save to apply globally.");
                        }}
                          className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-foreground hover:bg-muted border border-border rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95">
                          <RefreshCw size={13} /> Reset
                        </button>
                        <button onClick={saveSettings} disabled={savingSettings}
                          className="flex items-center gap-2 px-6 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 shadow-lg shadow-secondary/20 transition-all active:scale-95 group">
                          <Save size={13} className="group-hover:rotate-12 transition-transform" /> {savingSettings ? "Propagating..." : "Save All Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "chat" && (
                <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
                  <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                    <div>
                      <h1 className="text-3xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Live Chat Sessions</h1>
                      <p className="text-xs text-muted-foreground mt-0.5">Real-time status of all digital conversations</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/40 border-none text-xs focus:ring-2 focus:ring-secondary/30 outline-none"
                        />
                      </div>
                      <button onClick={loadChatHistory} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all font-bold">
                        <RefreshCw size={12} className={chatLoading ? "animate-spin" : ""} /> Sync
                      </button>
                    </div>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-20">
                    {(() => {
                      // Group by session_id
                      const sessions: Record<string, any[]> = {};
                      for (const m of chatHistory) {
                        const sid = m.session_id || "unknown";
                        if (!sessions[sid]) sessions[sid] = [];
                        sessions[sid].push(m);
                      }

                      const sessionEntries = Object.entries(sessions)
                        .map(([sid, msgs]) => ({
                          sid,
                          msgs: msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
                          lastTime: Math.max(...msgs.map(m => new Date(m.timestamp).getTime())),
                          ip: msgs[0]?.ip_address || "Unknown IP"
                        }))
                        .sort((a, b) => b.lastTime - a.lastTime)
                        .filter(s => {
                          if (!chatSearchQuery.trim()) return true;
                          const q = chatSearchQuery.toLowerCase();
                          return (
                            s.sid.toLowerCase().includes(q) ||
                            s.ip.toLowerCase().includes(q) ||
                            s.msgs.some(m => (m.content || "").toLowerCase().includes(q))
                          );
                        });

                      if (sessionEntries.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-20">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                              <BotMessageSquare size={32} />
                            </div>
                            <p className="text-sm font-medium">No activity matching your search.</p>
                          </div>
                        );
                      }

                      return sessionEntries.map((session) => {
                        const msgs = session.msgs;
                        const isExpanded = collapsedCards[`chat-${session.sid}`];
                        const lastDate = msgs.length ? new Date(msgs[msgs.length - 1].timestamp) : new Date();
                        const sessionStatus = msgs[0]?.session_status || "active";
                        const isClosed = sessionStatus === "closed";

                        return (
                          <div key={session.sid} className={`glass-card overflow-hidden transition-all duration-300 transform shadow-sm border ${isClosed ? "border-border/30 opacity-60" : "border-secondary/20 bg-card"}`}>
                            {/* Session Header */}
                            <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-4 cursor-pointer hover:bg-muted/10 transition-colors"
                              onClick={() => {
                                setCollapsedCards(p => ({ ...p, [`chat-${session.sid}`]: !p[`chat-${session.sid}`] }));
                              }}>
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${isClosed ? "bg-muted/30 border-border/30" : "bg-secondary/10 border-secondary/20"}`}>
                                  <BotMessageSquare size={20} className={isClosed ? "text-muted-foreground" : "text-secondary"} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
                                    Chat Session
                                    <span className="text-[0.5625rem] px-1.5 py-0.5 rounded-sm bg-secondary/10 text-secondary uppercase font-black tracking-widest">{msgs.length} msgs</span>
                                    <span className={`text-[0.5625rem] px-1.5 py-0.5 rounded-sm uppercase font-black tracking-widest ${isClosed ? "bg-muted text-muted-foreground" : "bg-green-500/10 text-green-600"}`}>
                                      {isClosed ? "Closed" : "Active"}
                                    </span>
                                  </div>
                                  <div className="text-[0.6875rem] sm:text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5 font-mono">
                                    <span>{formatDate(lastDate)}</span>
                                    <span className="text-border/50">-</span>
                                    <span className="text-foreground/80 font-semibold">{session.ip}</span>
                                    <span className="text-border/50">-</span>
                                    <span className="opacity-60">{session.sid.slice(0, 12)}...</span>
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2 ml-2">
                                {!isClosed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetch("/api/chat/close", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ session_id: session.sid })
                                      }).then(() => loadChatHistory());
                                    }}
                                    className="px-2 py-1 rounded-lg text-[0.625rem] font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                  >
                                    Close
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!confirm("Delete this chat session?")) return;
                                    Promise.all([
                                      dbFetch("chat_messages", { method: "DELETE", query: { id: session.sid } }),
                                      dbFetch("chat_threads", { method: "DELETE", query: { message_id: session.sid } }),
                                    ]).then(() => loadChatHistory());
                                  }}
                                  className="px-2 py-1 rounded-lg text-[0.625rem] font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                  title="Delete session"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <div className="w-8 h-8 rounded-full bg-background border border-border/50 shadow-sm flex items-center justify-center">
                                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </div>
                            </div>

                            {/* Expanded Session Chat History */}
                            {isExpanded && (
                              <div className="border-t border-border/50 bg-muted/10 px-0 pb-0">
                                <div className="p-4 sm:p-6 space-y-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                  {msgs.map((m, idx, arr) => {
                                    const isOut = m.direction === "outbound" || m.direction === "bot";
                                    const prevMsg = idx > 0 ? arr[idx - 1] : null;
                                    const showAvatar = !prevMsg || (prevMsg.direction !== m.direction);

                                    return (
                                      <div key={m.id || idx} className={`flex ${isOut ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isOut ? "items-end" : "items-start"}`}>
                                          {showAvatar && (
                                            <div className="flex items-center gap-2 mb-1.5 px-1">
                                              {!isOut && <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[0.625rem] font-bold shadow-sm">U</div>}
                                              <span className="text-[0.625rem] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">
                                                {isOut ? (m.direction === "bot" ? "AI System" : "Admin (You)") : "Visitor"}
                                              </span>
                                              {isOut && <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center shadow-sm"><Bot size={10} className="text-secondary" /></div>}
                                            </div>
                                          )}

                                          <div className={`group relative px-4 py-3 sm:px-5 sm:py-4 rounded-3xl text-sm shadow-md transition-all ${isOut
                                            ? "bg-secondary text-secondary-foreground border border-secondary/20 rounded-tr-sm"
                                            : "bg-card text-foreground border border-border/60 rounded-tl-sm"
                                            }`}>
                                            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                            <div className={`text-[0.5625rem] mt-2 font-mono flex items-center justify-between ${isOut ? "text-secondary-foreground/60" : "text-muted-foreground"}`}>
                                              <span>{formatDate(m.timestamp)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Admin Reply Input — only for active sessions */}
                                {!isClosed && (
                                  <div className="p-4 border-t border-border/50 bg-background/50">
                                    <div className="flex gap-2">
                                      <input
                                        placeholder="Type an admin reply..."
                                        value={replyTexts[session.sid] || ""}
                                        onChange={(e) => setReplyTexts(p => ({ ...p, [session.sid]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && replyTexts[session.sid]?.trim()) {
                                            const msg = replyTexts[session.sid];
                                            setReplyTexts(p => ({ ...p, [session.sid]: "" }));
                                            fetch("/api/chat/send", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ message: msg, session_id: session.sid, from: "admin" })
                                            }).then(() => loadChatHistory());
                                          }
                                        }}
                                        className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs outline-none"
                                      />
                                      <button
                                        onClick={() => {
                                          const msg = replyTexts[session.sid];
                                          setReplyTexts(p => ({ ...p, [session.sid]: "" }));
                                          fetch("/api/chat/send", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ message: msg, session_id: session.sid, from: "admin" })
                                          }).then(() => loadChatHistory());
                                        }}
                                        disabled={!replyTexts[session.sid]?.trim()}
                                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-bold disabled:opacity-50"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {isClosed && (
                                  <div className="p-3 border-t border-border/50 bg-muted/20 text-center text-[0.6875rem] text-muted-foreground italic">
                                    Session closed · No further replies
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}





              {tab === "appointments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-heading font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Appointments Calendar</h1>
                    <button onClick={loadAppointments} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted">
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>
                  {apptsLoading ? <div className="text-muted-foreground">Loading...</div> : (
                    <div className="animate-in fade-in duration-500">
                      <AppointmentsCalendar
                        appointments={appointments}
                        submissions={submissions}
                        applications={applications}
                        onAppointmentUpdated={(updated) => setAppointments((prev) => prev.map((appt) => appt.id === updated.id ? updated : appt))}
                        onAppointmentCreated={(created) => setAppointments((prev) => [...prev, created].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()))}
                        onAppointmentDeleted={(id) => setAppointments((prev) => prev.filter((a) => a.id !== id))}
                      />
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

