/**
 * seedCache.ts
 * Pre-populates React Query cache with fallback/seed data before first render.
 * - Components get data instantly (no loading flash, no skeleton)
 * - API still fetches once in background to get fresh data
 * - If API fails, seed data remains as fallback
 * - Query keys must exactly match those used in useDbQuery / useSiteContent
 */

import type { QueryClient } from "@tanstack/react-query";

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_SITE_CONTENT: Record<string, Record<string, any>> = {
  hero: {
    title: "Leading IT Solutions Company in Maldives",
    subtitle: "Transform your business with cutting-edge technology solutions.",
    cta_text: "Get Started",
    hero_image: "/assets/hero/hero_3d_glassy1.png",
  },
  about: {
    title: "Driving Digital Transformation",
    description: "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company in the Digital Era!",
    vision: "Our journey began out of the passion for a unique position in the industry.",
    card_mission: "Deliver innovative technology solutions that transform businesses.",
    card_team: "Expert developers, designers, and consultants dedicated to your success.",
    card_quality: "Every solution we build meets the highest standards of performance.",
    card_global: "Serving clients across Maldives, Bhutan, and beyond.",
    card_mission_image: "/assets/about/mission.png",
    card_team_image: "/assets/about/team.png",
    card_quality_image: "/assets/about/quality.png",
    card_global_image: "/assets/about/global.png",
  },
  services: {
    title: "Services & Solutions We Deliver",
    subtitle: "Team up with the perfect digital partner for all your technical needs to achieve your business goals, reduce costs and accelerate growth.",
  },
  contact: {
    title: "Get In Touch",
    subtitle: "Ready to transform your business? Contact us today.",
    address: "Alia Building, 7th Floor\nGandhakoalhi Magu\nMalé, Maldives",
    email: "info@solutions.com.mv",
    phone: "+960 301-1355",
    landline: "+91-452 238 7388",
    hours: "Sun–Thu: 9AM–6PM\nSat: 9AM–1PM",
    facebook: "https://www.facebook.com/brilliantsystemssolutions/",
    twitter: "https://x.com/bsspl_india",
    linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
    instagram: "https://www.instagram.com/brilliantsystemssolutions",
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} Systems Solutions Pvt Ltd. All rights reserved.`,
    tagline: "Leading IT consulting and software development company delivering cutting-edge technology solutions.",
    facebook: "https://www.facebook.com/brilliantsystemssolutions/",
    twitter: "https://x.com/bsspl_india",
    linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
    instagram: "https://www.instagram.com/brilliantsystemssolutions",
  },
  testimonials: { badge: "Testimonials", title: "What Our", highlight: "Clients Say" },
  careers: {
    badge: "Careers", title: "Join Our", highlight: "Team",
    description: "Be part of a dynamic team building cutting-edge technology solutions for clients worldwide.",
  },
  clients: {
    badge: "Our Clients", title: "Trusted by", highlight: "Industry Leaders",
    description: "We're proud to have served over 300+ successful projects for leading companies across the Maldives and beyond.",
  },
  settings: {},
};

const SEED_CLIENTS = [
  { id: "cl-0",  name: "aaa Hotels & Resorts",              logo_url: "/assets/clients/aaa-1.png",                  is_visible: true, sort_order: 0  },
  { id: "cl-1",  name: "Alia Investments",                  logo_url: "/assets/clients/Alia.png",                   is_visible: true, sort_order: 1  },
  { id: "cl-2",  name: "Baglioni Resorts",                  logo_url: "/assets/clients/Baglioni.jpg",               is_visible: true, sort_order: 2  },
  { id: "cl-3",  name: "City Investments",                  logo_url: "/assets/clients/City-Investments.jpg",       is_visible: true, sort_order: 3  },
  { id: "cl-4",  name: "Cocoon Maldives",                   logo_url: "/assets/clients/Cocoon.jpg",                 is_visible: true, sort_order: 4  },
  { id: "cl-5",  name: "Co Load",                           logo_url: "/assets/clients/Co-load-2.png",              is_visible: true, sort_order: 5  },
  { id: "cl-6",  name: "COLOURS OF OBLU",                   logo_url: "/assets/clients/Colors-of-OBLU-768x390.png", is_visible: true, sort_order: 6  },
  { id: "cl-7",  name: "DAMAS",                             logo_url: "/assets/clients/DAMAS-768x397.jpg",          is_visible: true, sort_order: 7  },
  { id: "cl-8",  name: "Election Commission of Maldives",   logo_url: "/assets/clients/ECM.png",                    is_visible: true, sort_order: 8  },
  { id: "cl-9",  name: "ELL Mobiles",                       logo_url: "/assets/clients/ELL-Mobiles-768x768.png",    is_visible: true, sort_order: 9  },
  { id: "cl-10", name: "Ensis Fisheries",                   logo_url: "/assets/clients/Ensis-2.png",                is_visible: true, sort_order: 10 },
  { id: "cl-11", name: "Fuel Supplies Maldives",            logo_url: "/assets/clients/FSM-1.png",                  is_visible: true, sort_order: 11 },
  { id: "cl-12", name: "Fushifaru",                         logo_url: "/assets/clients/Fushifaru-1.png",            is_visible: true, sort_order: 12 },
  { id: "cl-13", name: "Gage Maldives",                     logo_url: "/assets/clients/gage-logo-1.png",            is_visible: true, sort_order: 13 },
  { id: "cl-14", name: "Happy Market",                      logo_url: "/assets/clients/Happy-Market.png",           is_visible: true, sort_order: 14 },
  { id: "cl-15", name: "HDFC",                              logo_url: "/assets/clients/HDFC.png",                   is_visible: true, sort_order: 15 },
  { id: "cl-16", name: "Horizon Fisheries",                 logo_url: "/assets/clients/Horizon-fisheries-1.png",    is_visible: true, sort_order: 16 },
  { id: "cl-17", name: "ILAA Maldives",                     logo_url: "/assets/clients/Ilaa-Maldives-1-768x593.jpg",is_visible: true, sort_order: 17 },
  { id: "cl-18", name: "Island Beverages",                  logo_url: "/assets/clients/Island-Beverages.png",       is_visible: true, sort_order: 18 },
  { id: "cl-19", name: "Island Breeze Maldives",            logo_url: "/assets/clients/Island-Breeze-Maldives.png", is_visible: true, sort_order: 19 },
  { id: "cl-20", name: "Medianet",                          logo_url: "/assets/clients/Medianet_Maldives.jpg",      is_visible: true, sort_order: 20 },
  { id: "cl-21", name: "Medtech Maldives",                  logo_url: "/assets/clients/Medtech-Maldives.jpg",       is_visible: true, sort_order: 21 },
  { id: "cl-22", name: "Mifco",                             logo_url: "/assets/clients/Mifco-2-768x309.png",        is_visible: true, sort_order: 22 },
  { id: "cl-23", name: "Muni Enterprises",                  logo_url: "/assets/clients/Muni-1.png",                 is_visible: true, sort_order: 23 },
  { id: "cl-24", name: "OBLU Helengeli",                    logo_url: "/assets/clients/OBLU-Helengeli.png",         is_visible: true, sort_order: 24 },
  { id: "cl-25", name: "Oblu Select",                       logo_url: "/assets/clients/Oblu-Select.png",            is_visible: true, sort_order: 25 },
  { id: "cl-26", name: "OZEN Life Maadhoo",                 logo_url: "/assets/clients/OZEN-Life-Maadhoo-500x500.png", is_visible: true, sort_order: 26 },
  { id: "cl-27", name: "OZEN Reserve Bolifushi",            logo_url: "/assets/clients/OZEN-Reserve-Bolifushi.png", is_visible: true, sort_order: 27 },
  { id: "cl-28", name: "Plaza Enterprises",                 logo_url: "/assets/clients/Plaza.png",                  is_visible: true, sort_order: 28 },
  { id: "cl-29", name: "RCSC, Bhutan",                      logo_url: "/assets/clients/RCSC.jpg",                   is_visible: true, sort_order: 29 },
  { id: "cl-30", name: "SIMDI Group",                       logo_url: "/assets/clients/SIMDI-Group.png",            is_visible: true, sort_order: 30 },
  { id: "cl-31", name: "TEP Construction",                  logo_url: "/assets/clients/TEP-Constuction.png",        is_visible: true, sort_order: 31 },
  { id: "cl-32", name: "The Hawks",                         logo_url: "/assets/clients/The-Hawks.png",              is_visible: true, sort_order: 32 },
  { id: "cl-33", name: "United Food Suppliers",             logo_url: "/assets/clients/United-Food-Suppliers.png",  is_visible: true, sort_order: 33 },
  { id: "cl-34", name: "VARU by Atmosphere",                logo_url: "/assets/clients/VARU-by-Atmosphere.jpg",     is_visible: true, sort_order: 34 },
  { id: "cl-35", name: "Voyages Maldives",                  logo_url: "/assets/clients/voyage-Maldives.png",        is_visible: true, sort_order: 35 },
  { id: "cl-36", name: "You & Me Maldives",                 logo_url: "/assets/clients/You-Me-Maldives-768x660.png",is_visible: true, sort_order: 36 },
  { id: "cl-37", name: "Villa Shipping and Trading Company",logo_url: "/assets/clients/Villagrouplogo-1.png",       is_visible: true, sort_order: 37 },
];

const SEED_SERVICES = [
  { id: "s-1", title: "Software Development", description: "Custom enterprise software solutions.", image_url: "/assets/services/software.png", icon: "Monitor", is_visible: true, sort_order: 1 },
  { id: "s-2", title: "Web Development",       description: "Modern, responsive web applications.",  image_url: "/assets/services/web.png",      icon: "Globe",   is_visible: true, sort_order: 2 },
  { id: "s-3", title: "Mobile Development",    description: "iOS and Android mobile apps.",          image_url: "/assets/services/mobile.png",   icon: "Smartphone", is_visible: true, sort_order: 3 },
  { id: "s-4", title: "ERP Solutions",         description: "End-to-end ERP implementations.",      image_url: "/assets/services/erp.png",      icon: "Database", is_visible: true, sort_order: 4 },
  { id: "s-5", title: "HR & Payroll",          description: "Complete HR management systems.",       image_url: "/assets/services/hr.png",       icon: "Users",   is_visible: true, sort_order: 5 },
  { id: "s-6", title: "IT Consulting",         description: "Strategic technology consulting.",      image_url: "/assets/services/consulting.png", icon: "Briefcase", is_visible: true, sort_order: 6 },
];

const SEED_PRODUCTS = [
  { id: "p-1", name: "BSOL",       tagline: "Integrated ERP & CRM Ecosystem",  description: "BSOL seamlessly unifies your financial operations, inventory control, and customer relationships.", image_url: "/assets/products/bsol.jpg",       contact_url: "#contact", is_popular: false, is_visible: true, sort_order: 1 },
  { id: "p-2", name: "HR-Metrics", tagline: "Modern Human Capital Hub",         description: "Revolutionize your workforce management with agile task boards and HR processes.",                   image_url: "/assets/products/hr-metrics.jpg", contact_url: "#contact", is_popular: true,  is_visible: true, sort_order: 2 },
  { id: "p-3", name: "GoBoat",     tagline: "Marine & Resort Management",       description: "Complete boat charter and resort activity management platform.",                                      image_url: "/assets/products/goboat.jpg",     contact_url: "#contact", is_popular: false, is_visible: true, sort_order: 3 },
  { id: "p-4", name: "PromisePro", tagline: "Project & Contract Management",    description: "End-to-end project delivery and contract lifecycle management.",                                     image_url: "/assets/products/promisepro.jpg", contact_url: "#contact", is_popular: false, is_visible: true, sort_order: 4 },
  { id: "p-5", name: "Travel",     tagline: "Travel & Tourism Platform",        description: "Complete travel agency and tour operator management system.",                                         image_url: "/assets/products/travel.jpg",     contact_url: "#contact", is_popular: false, is_visible: true, sort_order: 5 },
];

const SEED_TECHNOLOGIES = [
  { id: "t-1",  name: "React",       description: "Modern UI library for building interactive interfaces.", image_url: "/assets/Technology/React.png",      icon: null, category: "Frontend", name_color: "#61DAFB", category_color: "#61DAFB", is_visible: true, sort_order: 1  },
  { id: "t-2",  name: "Angular",     description: "Enterprise-grade frontend framework.",                  image_url: "/assets/Technology/angular.jpg",     icon: null, category: "Frontend", name_color: "#DD0031", category_color: "#DD0031", is_visible: true, sort_order: 2  },
  { id: "t-3",  name: "TypeScript",  description: "Typed superset of JavaScript.",                        image_url: "/assets/Technology/ts.png",          icon: null, category: "Language", name_color: "#3178C6", category_color: "#3178C6", is_visible: true, sort_order: 3  },
  { id: "t-4",  name: ".NET",        description: "Microsoft's cross-platform development framework.",     image_url: "/assets/Technology/dotnet.png",      icon: null, category: "Backend",  name_color: "#512BD4", category_color: "#512BD4", is_visible: true, sort_order: 4  },
  { id: "t-5",  name: "Node.js",     description: "JavaScript runtime for server-side development.",      image_url: "/assets/Technology/nodejs.png",      icon: null, category: "Backend",  name_color: "#339933", category_color: "#339933", is_visible: true, sort_order: 5  },
  { id: "t-6",  name: "Flutter",     description: "Google's UI toolkit for cross-platform apps.",         image_url: "/assets/Technology/flutter.png",     icon: null, category: "Mobile",   name_color: "#02569B", category_color: "#02569B", is_visible: true, sort_order: 6  },
  { id: "t-7",  name: "SQL Server",  description: "Microsoft's enterprise relational database.",          image_url: "/assets/Technology/sqlserveer.png",  icon: null, category: "Database", name_color: "#CC2927", category_color: "#CC2927", is_visible: true, sort_order: 7  },
  { id: "t-8",  name: "AWS",         description: "Amazon Web Services cloud platform.",                  image_url: "/assets/Technology/aws.png",         icon: null, category: "Cloud",    name_color: "#FF9900", category_color: "#FF9900", is_visible: true, sort_order: 8  },
  { id: "t-9",  name: "Docker",      description: "Container platform for consistent deployments.",       image_url: "/assets/Technology/docker.png",      icon: null, category: "DevOps",   name_color: "#2496ED", category_color: "#2496ED", is_visible: true, sort_order: 9  },
  { id: "t-10", name: "Python",      description: "Versatile language for AI, data, and automation.",     image_url: "/assets/Technology/python.png",      icon: null, category: "Language", name_color: "#3776AB", category_color: "#3776AB", is_visible: true, sort_order: 10 },
  { id: "t-11", name: "Firebase",    description: "Google's app development platform.",                   image_url: "/assets/Technology/firebase.png",    icon: null, category: "Cloud",    name_color: "#FFCA28", category_color: "#FFCA28", is_visible: true, sort_order: 11 },
  { id: "t-12", name: "Git",         description: "Distributed version control system.",                  image_url: "/assets/Technology/git.png",         icon: null, category: "DevOps",   name_color: "#F05032", category_color: "#F05032", is_visible: true, sort_order: 12 },
];

const SEED_HERO_STATS = [
  { id: "hs-1", count: "300", suffix: "+", label: "Projects Delivered", color: "gradient",  is_visible: true, sort_order: 1 },
  { id: "hs-2", count: "15",  suffix: "+", label: "Years Experience",   color: "#60a5fa",   is_visible: true, sort_order: 2 },
  { id: "hs-3", count: "50",  suffix: "+", label: "Expert Team",        color: "#a78bfa",   is_visible: true, sort_order: 3 },
  { id: "hs-4", count: "98",  suffix: "%", label: "Client Satisfaction",color: "#34d399",   is_visible: true, sort_order: 4 },
];

const SEED_TESTIMONIALS = [
  { id: "tm-1", name: "Ahmed Rasheed",  company: "Maldives Tourism",    message: "Systems Solutions transformed our digital infrastructure. Their ERP solution streamlined our operations significantly.", avatar_url: "/assets/testimonials/ahmed.jpg",  rating: 5, is_visible: true },
  { id: "tm-2", name: "Fatima Ibrahim", company: "Island Beverages",    message: "The HR-Metrics platform has revolutionized how we manage our workforce. Exceptional support team.", avatar_url: "/assets/testimonials/fatima.jpg", rating: 5, is_visible: true },
  { id: "tm-3", name: "Dorji Tshering", company: "RCSC Bhutan",         message: "Outstanding web development services. They delivered beyond our expectations on time and within budget.", avatar_url: "/assets/testimonials/dorji.jpg",  rating: 5, is_visible: true },
];

// ── Query key builders (must match useDbQuery exactly) ────────────────────────

function dbListKey(table: string, filters: Record<string, unknown>, opts: { order?: string; asc?: boolean; single?: boolean }) {
  return [table, "list", filters, opts];
}

// ── Main seed function ────────────────────────────────────────────────────────
// Sets updatedAt far in the past so React Query treats seed as stale and
// fires exactly ONE background fetch per query on page load — not zero,
// not many. The real data replaces seed silently in the background.

export function seedQueryCache(queryClient: QueryClient) {
  // Use a past timestamp so queries are stale → fire once on mount, then
  // stay fresh for staleTime (30 min). This prevents the "250 requests" issue
  // where stale seed triggers repeated refetches.
  const updatedAt = Date.now() - 31 * 60 * 1000; // 31 min ago = stale immediately

  queryClient.setQueryData(["siteContent"], SEED_SITE_CONTENT, { updatedAt });

  queryClient.setQueryData(
    dbListKey("client_logos", { is_visible: true }, { order: "sort_order", asc: true, single: false }),
    SEED_CLIENTS, { updatedAt }
  );
  queryClient.setQueryData(
    dbListKey("services", { is_visible: true }, { order: "sort_order", asc: true, single: false }),
    SEED_SERVICES, { updatedAt }
  );
  queryClient.setQueryData(
    dbListKey("products", { is_visible: true }, { order: "sort_order", asc: true, single: false }),
    SEED_PRODUCTS, { updatedAt }
  );
  queryClient.setQueryData(
    dbListKey("technologies", { is_visible: true }, { order: "sort_order", asc: true, single: false }),
    SEED_TECHNOLOGIES, { updatedAt }
  );
  queryClient.setQueryData(
    dbListKey("hero_stats", { is_visible: true }, { order: "sort_order", asc: true, single: false }),
    SEED_HERO_STATS, { updatedAt }
  );
  queryClient.setQueryData(
    dbListKey("testimonials", { is_visible: true }, { order: "created_at", asc: false, single: false }),
    SEED_TESTIMONIALS, { updatedAt }
  );
  queryClient.setQueryData(
    dbListKey("career_jobs", { is_visible: true }, { order: "sort_order", asc: true, single: false }),
    [], { updatedAt }
  );
}
