import { ArrowUpRight, ArrowRight, Monitor, Globe, Smartphone, Database, Users, BarChart2, Search, Megaphone, Palette as PaletteIcon, Briefcase, Cloud, Shield, Code, Server, Terminal, Cpu, HardDrive, Wifi, Building, ShoppingCart, CreditCard, Truck, HeartHandshake, LineChart, PieChart, Zap, Camera, Video, Printer, BookOpen, Lock, Headphones, Star, Mail, MapPin, Home, Settings, Layers, Phone, FileText } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useDbQuery } from "@/hooks/useDbQuery";
import type { Tables } from "@/integrations/supabase/types";
import { useGlobalView, useCardStyle } from "./ui-customizer-context";

type Service = Tables<"services">;

const SERVICE_THEMES: Record<string, { img: string; accent: string }> = {
  default:    { img: "/assets/services/software.png", accent: "from-blue-700/70 to-indigo-900/85" },
  software:   { img: "/assets/services/software.png", accent: "from-violet-700/70 to-purple-900/85" },
  web:        { img: "/assets/services/web.png",      accent: "from-cyan-700/70 to-blue-900/85" },
  mobile:     { img: "/assets/services/mobile.png",   accent: "from-emerald-700/70 to-teal-900/85" },
  erp:        { img: "/assets/services/erp.png",      accent: "from-orange-700/70 to-red-900/85" },
  hr:         { img: "/assets/services/hr.png",       accent: "from-pink-700/70 to-rose-900/85" },
  consulting: { img: "/assets/services/consulting.png", accent: "from-amber-700/70 to-yellow-900/85" },
  seo:        { img: "/assets/services/seo.png",      accent: "from-lime-700/70 to-green-900/85" },
  marketing:  { img: "/assets/services/seo.png",      accent: "from-fuchsia-700/70 to-purple-900/85" },
  design:     { img: "/assets/services/design.png",   accent: "from-sky-700/70 to-blue-900/85" },
  cloud:      { img: "/assets/services/software.png", accent: "from-indigo-700/70 to-blue-900/85" },
};

const ICON_MAP: Record<string, React.ElementType> = {
  Monitor, Globe, Smartphone, Database, Users, BarChart2, Search,
  Megaphone, PaletteIcon, Palette: PaletteIcon, Briefcase, Cloud, Shield, Code,
  Server, Terminal, Cpu, HardDrive, Wifi, Building, ShoppingCart,
  CreditCard, Truck, HeartHandshake, LineChart, PieChart, Zap,
  Camera, Video, Printer, BookOpen, Lock, Headphones, Star, Mail,
  MapPin, Home, Settings, Layers, Phone, FileText,
  BarChart: BarChart2,
};

function getTheme(service: Service) {
  const t = service.title.toLowerCase();
  let theme = SERVICE_THEMES.default;
  for (const key of Object.keys(SERVICE_THEMES)) {
    if (key !== "default" && t.includes(key)) { theme = SERVICE_THEMES[key]; break; }
  }
  const img = (service.image_url && service.image_url.trim()) ? service.image_url.trim() : theme.img;
  return { img, accent: theme.accent };
}

function isHtmlIcon(icon: string): boolean {
  return !!icon && (icon.trim().startsWith("<") || icon.includes("class="));
}

function getIcon(service: Service): React.ElementType {
  if (service.icon && !isHtmlIcon(service.icon) && ICON_MAP[service.icon]) return ICON_MAP[service.icon];
  const t = service.title.toLowerCase();
  if (t.includes("web"))        return Globe;
  if (t.includes("mobile"))     return Smartphone;
  if (t.includes("erp"))        return Database;
  if (t.includes("hr"))         return Users;
  if (t.includes("consulting")) return Briefcase;
  if (t.includes("seo") || t.includes("marketing")) return Search;
  if (t.includes("design"))     return PaletteIcon;
  if (t.includes("cloud"))      return Cloud;
  if (t.includes("security"))   return Shield;
  return Monitor;
}

const ServicesSection = () => {
  const cardStyle = useCardStyle();
  const view      = useGlobalView();
  const content   = useSiteContent("services");
  const scrollTo  = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });

  const { data: services, isLoading } = useDbQuery<Service[]>("services", 
    { is_visible: true }, 
    { order: "sort_order" }
  );

  if (isLoading) return (
    <section id="services" className="section-padding section-alt relative overflow-hidden">
      <div className="container-wide relative z-10 animate-pulse">
        <div className="text-center mb-8">
          <div className="h-4 w-24 bg-muted/60 mx-auto rounded mb-3" />
          <div className="h-10 w-64 bg-muted mx-auto rounded mb-4" />
          <div className="h-4 w-96 bg-muted/60 mx-auto rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-40 bg-muted/40 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );

  if (!services || services.length === 0) return null;

  return (
    <section id="services" className="section-padding section-alt relative overflow-hidden">
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-8">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest">Our Services</span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4">
            {content.title?.includes("&") ? (
              <>{content.title.split("&")[0]}&{" "}<span className="gradient-text">{content.title.split("& ")[1]}</span></>
            ) : (
              content.title || <><span className="gradient-text">Solutions</span> We Deliver</>
            )}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-[0.9375rem]">{content.subtitle}</p>
        </AnimatedSection>

        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {services.map((service, i) => {
              const theme  = getTheme(service);
              const Icon   = getIcon(service);
              const useImg = cardStyle === "image";
              const htmlIcon = service.icon && isHtmlIcon(service.icon);
              return (
                <AnimatedSection key={service.id} delay={i * 0.05}>
                  <div
                    className="glass-card flex flex-col relative rounded-xl overflow-hidden group cursor-pointer border border-border/40 hover:glow-effect transition-all duration-300"
                    style={{ minHeight: useImg ? "190px" : "120px" }}
                    onClick={scrollTo}
                  >
                    {useImg ? (
                      <>
                        <div className="relative h-[110px] w-full overflow-hidden shrink-0">
                          <img
                            src={theme.img}
                            alt={service.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/services/software.png"; }}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent`} />
                          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                            <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <ArrowUpRight size={10} className="text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="relative flex-1 w-full px-3 pt-2.5 pb-4 flex flex-col bg-card dark:bg-card/40 z-10 border-t border-border/50">
                           <h3 className="font-heading font-extrabold text-[0.9375rem] text-foreground mb-0.5 leading-snug group-hover:text-secondary transition-colors line-clamp-1">
                            {service.title}
                          </h3>
                          <p className="text-[0.75rem] text-muted-foreground leading-snug line-clamp-2">
                            {service.description}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="relative flex-1 w-full px-3 pt-2.5 pb-4 flex flex-col justify-end bg-card dark:bg-card/20">
                         {htmlIcon
                          ? <span className="text-secondary text-[1.4rem] mb-1.5" dangerouslySetInnerHTML={{ __html: service.icon! }} />
                          : <Icon size={20} className="text-secondary mb-1.5" />
                          }
                         <h3 className="font-heading font-extrabold text-[0.875rem] text-foreground mb-0.5 leading-snug group-hover:text-secondary transition-colors line-clamp-1">
                          {service.title}
                        </h3>
                        <p className="text-[0.75rem] text-muted-foreground leading-snug line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    )}
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
            {services.map((service, i) => {
              const theme  = getTheme(service);
              const Icon   = getIcon(service);
              const useImg = cardStyle === "image";
              const htmlIcon = service.icon && isHtmlIcon(service.icon);
              return (
                <AnimatedSection key={service.id} delay={i * 0.03}>
                  <div
                    className="glass-card flex items-center gap-4 p-4 group hover:glow-effect transition-all duration-300 cursor-pointer relative overflow-hidden"
                    onClick={scrollTo}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/[0.03] to-transparent group-hover:from-secondary/[0.07] transition-all pointer-events-none rounded-xl" />
                    <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                      {useImg ? (
                        <>
                          <img
                            src={theme.img}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/services/software.png"; }}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent} opacity-70`} />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
                          {htmlIcon
                            ? <span className="text-secondary text-xl" dangerouslySetInnerHTML={{ __html: service.icon! }} />
                            : <Icon size={22} className="text-secondary" />
                          }
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <h3 className="font-heading font-bold text-foreground text-[0.9375rem] leading-snug">{service.title}</h3>
                      <p className="text-muted-foreground text-[0.8125rem] mt-0.5 line-clamp-1">{service.description}</p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all shrink-0 relative z-10" />
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesSection;
