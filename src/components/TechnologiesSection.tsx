import { useEffect, useState } from "react";
import AnimatedSection from "./AnimatedSection";
import { useGlobalView } from "./UICustomizer";
import { ArrowRight, Code2, Database, Smartphone, Globe, Server, Cloud, GitBranch, Layers } from "lucide-react";

interface Technology {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  icon: string | null;
  category: string;
  name_color: string;
  category_color: string;
  is_visible: boolean;
  sort_order: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Frontend: Globe,
  Backend:  Server,
  Mobile:   Smartphone,
  Database: Database,
  DevOps:   GitBranch,
  Cloud:    Cloud,
  Language: Code2,
  General:  Layers,
};

const FALLBACK_LOGOS: Record<string, string> = {
  ".NET":       "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/dotnet.svg",
  "SQL Server": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftsqlserver.svg",
  "Vue.js":     "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/vuedotjs.svg",
  "Firebase":   "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/firebase.svg",
  "Node.js":    "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nodedotjs.svg",
  "Cordova":    "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apachecordova.svg",
  "Kendo UI":   "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/progress.svg",
  "Git":        "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/git.svg",
  "Flutter":    "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/flutter.svg",
  "Angular":    "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/angular.svg",
  "TypeScript": "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/typescript.svg",
  "Dart":       "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/dart.svg",
  "React":      "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/react.svg",
  "Python":     "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/python.svg",
  "Docker":     "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/docker.svg",
  "AWS":        "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazonwebservices.svg",
};

const LogoImg = ({ src, name, size = 24 }: { src: string; name: string; size?: number }) => {
  const [err, setErr] = useState(false);
  const CatIcon = Layers;
  if (err) return <CatIcon size={size * 0.7} className="text-secondary/60" />;
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
};

const TechnologiesSection = () => {
  const view = useGlobalView();
  const [techs, setTechs] = useState<Technology[]>([]);
  const [header, setHeader] = useState({
    badge: "Our Stack",
    title: "Technologies",
    highlight: "We Use",
    description: "We leverage cutting-edge technologies to build robust, scalable, and future-proof solutions for our clients.",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [techRes, contentRes] = await Promise.all([
        fetch("/api/db/technologies?is_visible=1&_order=sort_order&_asc=true").then(r => r.json()),
        fetch("/api/db/site_content?section_key=technologies&_single=1").then(r => r.json()),
      ]);
      if (techRes.data?.length > 0) setTechs(techRes.data);
      if (contentRes.data?.content) setHeader(h => ({ ...h, ...contentRes.data.content }));
      setLoaded(true);
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (!loaded) return (
    <section id="technologies" className="section-padding relative overflow-hidden">
      <div className="container-wide relative z-10 animate-pulse">
        <div className="text-center mb-8">
          <div className="h-4 w-24 bg-muted/60 mx-auto rounded mb-3" />
          <div className="h-10 w-64 bg-muted mx-auto rounded mb-4" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-20 bg-muted/40 rounded-xl" />)}
        </div>
      </div>
    </section>
  );

  if (techs.length === 0) return null;

  const scrollToContact = () => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="technologies" className="section-padding section-alt relative overflow-hidden">
      <div className="container-wide relative z-10">
        <AnimatedSection className="text-center mb-8">
          <span className="text-secondary font-semibold text-sm uppercase tracking-widest">{header.badge}</span>
          <h2 className="text-3xl sm:text-[2.15rem] lg:text-[2.75rem] font-heading font-bold text-foreground mt-3 mb-4">
            {header.title} <span className="gradient-text">{header.highlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-[0.9375rem]">{header.description}</p>
        </AnimatedSection>

        {view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {techs.map((tech, i) => {
              const logoSrc = tech.image_url?.trim() || FALLBACK_LOGOS[tech.name] || null;
              const nameColor = tech.name_color || "#3178C6";
              const catColor = tech.category_color || nameColor;
              const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
              return (
                <AnimatedSection key={tech.id} delay={i * 0.04}>
                  <div
                    className="glass-card flex flex-col p-4 gap-3 group cursor-pointer border border-border/40 hover:border-secondary/40 hover:shadow-lg transition-all duration-300 rounded-xl"
                    onClick={scrollToContact}
                  >
                    {/* Logo + category row */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center p-1.5 border border-border/50"
                        style={{ background: `${nameColor}18` }}
                      >
                        {logoSrc ? (
                          <LogoImg src={logoSrc} name={tech.name} size={24} />
                        ) : (
                          <CatIcon size={18} className="text-secondary" />
                        )}
                      </div>
                      <span
                        className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: `${catColor}18`, color: catColor }}
                      >
                        {tech.category}
                      </span>
                    </div>
                    {/* Name */}
                    <h3
                      className="font-heading font-extrabold text-[0.875rem] leading-snug"
                      style={{ color: nameColor }}
                    >
                      {tech.name}
                    </h3>
                    {/* Description */}
                    <p className="text-[0.7rem] text-muted-foreground leading-relaxed line-clamp-2 mt-auto">
                      {tech.description}
                    </p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-w-3xl mx-auto">
            {techs.map((tech, i) => {
              const logoSrc = tech.image_url?.trim() || FALLBACK_LOGOS[tech.name] || null;
              const nameColor = tech.name_color || "#3178C6";
              const catColor = tech.category_color || nameColor;
              const CatIcon = CATEGORY_ICONS[tech.category] || Layers;
              return (
                <AnimatedSection key={tech.id} delay={i * 0.03}>
                  <div
                    className="glass-card flex items-center gap-4 px-4 py-3 group hover:border-secondary/40 hover:shadow-md transition-all duration-300 cursor-pointer rounded-xl"
                    onClick={scrollToContact}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center p-2 border border-border/50"
                      style={{ background: `${nameColor}18` }}
                    >
                      {logoSrc ? (
                        <LogoImg src={logoSrc} name={tech.name} size={24} />
                      ) : (
                        <CatIcon size={20} className="text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className="font-heading font-bold text-[0.9375rem]"
                          style={{ color: nameColor }}
                        >
                          {tech.name}
                        </h3>
                        <span
                          className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${catColor}18`, color: catColor }}
                        >
                          {tech.category}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[0.8125rem] mt-0.5 line-clamp-1">{tech.description}</p>
                    </div>
                    <ArrowRight size={15} className="text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all shrink-0" />
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

export default TechnologiesSection;
