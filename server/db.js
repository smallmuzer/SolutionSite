import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = join(__dirname, "app.db");

const db = new Database(DB_PATH, { timeout: 5000 });
// Use DELETE mode instead of WAL so all changes are in the main file
db.pragma("journal_mode = DELETE");
db.pragma("foreign_keys = ON");

// â”€â”€ Create tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    rating INTEGER NOT NULL DEFAULT 5,
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS career_jobs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    job_type TEXT NOT NULL DEFAULT 'Full-time',
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS seo_settings (
    id TEXT PRIMARY KEY,
    page_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS site_content (
    id TEXT PRIMARY KEY,
    section_key TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS client_logos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_submissions (
    id TEXT PRIMARY KEY,
    name TEXT,
    full_name TEXT,
    company_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    is_read INTEGER NOT NULL DEFAULT 0,
    website TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    userrole TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    extra_text TEXT,
    extra_color TEXT,
    contact_url TEXT NOT NULL DEFAULT '#contact',
    is_popular INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Master Chat Table (Sessions/Sessions info)
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    ip_address TEXT,
    channel TEXT NOT NULL DEFAULT 'website',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Detail Chat Table (Individual Messages/History)
  CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL, -- FK to chat_messages.id
    direction TEXT NOT NULL,  -- inbound | outbound | bot
    content TEXT NOT NULL,
    sender TEXT,
    timestamp TEXT NOT NULL,
    meta TEXT,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    applicant_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    job_id TEXT,
    resume_url TEXT,
    cover_letter TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    website TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS application_replies (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    sender TEXT NOT NULL, -- admin | applicant
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS submission_replies (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES contact_submissions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    reference_type TEXT NOT NULL, -- 'contact' OR 'application'
    reference_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    title TEXT,
    description TEXT,
    notes TEXT,
    appointment_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hero_stats (
    id TEXT PRIMARY KEY,
    count TEXT NOT NULL,
    suffix TEXT NOT NULL DEFAULT '+',
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'gradient',
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS technologies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    icon TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    name_color TEXT NOT NULL DEFAULT '#3178C6',
    category_color TEXT NOT NULL DEFAULT '#3178C6',
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

try {
  // Drop user_roles table if it exists
  db.exec("DROP TABLE IF EXISTS user_roles;");

  // Add extra_text / extra_color to products if missing
  const prodCols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  if (!prodCols.includes("extra_text")) db.exec("ALTER TABLE products ADD COLUMN extra_text TEXT;");
  if (!prodCols.includes("extra_color")) db.exec("ALTER TABLE products ADD COLUMN extra_color TEXT;");

  // Services table: add icon column, remove accent_color column
  const svcCols = db.prepare("PRAGMA table_info(services)").all().map(c => c.name);
  if (!svcCols.includes("icon")) db.exec("ALTER TABLE services ADD COLUMN icon TEXT;");
  if (svcCols.includes("accent_color")) {
    // SQLite doesn't support DROP COLUMN before 3.35 — recreate table without it
    db.exec(`
      CREATE TABLE services_new (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        icon TEXT,
        is_visible INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO services_new (id, title, description, image_url, icon, is_visible, sort_order, created_at, updated_at)
        SELECT id, title, description, image_url, icon, is_visible, sort_order, created_at, updated_at FROM services;
      DROP TABLE services;
      ALTER TABLE services_new RENAME TO services;
    `);
    console.log("[db] Migration: removed accent_color from services, kept icon column.");
  }

  // Seed badge data for existing products that have no extra_text/extra_color
  const defaultBadgeText = '15 Days Free Trial,Cloud-based SaaS,24/7 Support,Custom Onboarding';
  const defaultBadgeColor = '#16a34a,#2563eb,#9333ea,#ea580c';
  db.prepare("UPDATE products SET extra_text=?, extra_color=? WHERE (extra_text IS NULL OR extra_text='') AND (extra_color IS NULL OR extra_color='')").run(defaultBadgeText, defaultBadgeColor);

  // Seed icon values for existing services that have no icon set
  const iconSeeds = [
    { title_like: "%Software%",   icon: "Code"       },
    { title_like: "%Web%",        icon: "Globe"      },
    { title_like: "%Mobile%",     icon: "Smartphone" },
    { title_like: "%ERP%",        icon: "Database"   },
    { title_like: "%HR%",         icon: "Users"      },
    { title_like: "%Consulting%", icon: "Briefcase"  },
    { title_like: "%SEO%",        icon: "Search"     },
    { title_like: "%Design%",     icon: "Palette"    },
    { title_like: "%Cloud%",      icon: "Cloud"      },
    { title_like: "%Security%",   icon: "Shield"     },
    { title_like: "%Marketing%",  icon: "Megaphone"  },
  ];
  for (const seed of iconSeeds) {
    db.prepare("UPDATE services SET icon = ? WHERE (icon IS NULL OR icon = '') AND title LIKE ?").run(seed.icon, seed.title_like);
  }

  // Add image_url and icon columns to career_jobs if missing
  const jobCols = db.prepare("PRAGMA table_info(career_jobs)").all().map(c => c.name);
  if (!jobCols.includes("image_url")) db.exec("ALTER TABLE career_jobs ADD COLUMN image_url TEXT;");
  if (!jobCols.includes("icon")) db.exec("ALTER TABLE career_jobs ADD COLUMN icon TEXT;");

  // Seed default icons for existing jobs that have no icon set
  const jobIconSeeds = [
    { title_like: "%Developer%",   icon: "Code2"      },
    { title_like: "%Engineer%",    icon: "Code2"      },
    { title_like: "%Software%",    icon: "Code2"      },
    { title_like: "%Mobile%",      icon: "Smartphone" },
    { title_like: "%Design%",      icon: "Palette"    },
    { title_like: "%UI%",          icon: "Palette"    },
    { title_like: "%UX%",          icon: "Palette"    },
    { title_like: "%HR%",          icon: "Users"      },
    { title_like: "%Payroll%",     icon: "Users"      },
    { title_like: "%Marketing%",   icon: "TrendingUp" },
    { title_like: "%SEO%",         icon: "Search"     },
    { title_like: "%Data%",        icon: "BarChart2"  },
    { title_like: "%Analyst%",     icon: "BarChart2"  },
    { title_like: "%Business%",    icon: "Briefcase"  },
    { title_like: "%Sales%",       icon: "Briefcase"  },
    { title_like: "%Executive%",   icon: "Briefcase"  },
    { title_like: "%Manager%",     icon: "Briefcase"  },
    { title_like: "%Cloud%",       icon: "Cloud"      },
    { title_like: "%DevOps%",      icon: "Server"     },
    { title_like: "%Security%",    icon: "Shield"     },
    { title_like: "%Support%",     icon: "Headphones" },
  ];
  for (const seed of jobIconSeeds) {
    db.prepare("UPDATE career_jobs SET icon=? WHERE (icon IS NULL OR icon='') AND title LIKE ?").run(seed.icon, seed.title_like);
  }
  // Final fallback: any job still without icon gets Briefcase
  db.prepare("UPDATE career_jobs SET icon='Briefcase' WHERE icon IS NULL OR icon=''").run();

  const subCols = db.prepare("PRAGMA table_info(contact_submissions)").all().map(c => c.name);
  if (!subCols.includes("status")) db.exec("ALTER TABLE contact_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'new';");
  if (!subCols.includes("website")) db.exec("ALTER TABLE contact_submissions ADD COLUMN website TEXT;");

  // Add missing columns to job_applications
  const appCols = db.prepare("PRAGMA table_info(job_applications)").all().map(c => c.name);
  if (!appCols.includes("website")) db.exec("ALTER TABLE job_applications ADD COLUMN website TEXT;");
  if (!appCols.includes("status")) db.exec("ALTER TABLE job_applications ADD COLUMN status TEXT NOT NULL DEFAULT 'new';");
  const apptCols = db.prepare("PRAGMA table_info(appointments)").all().map(c => c.name);
  if (!apptCols.includes("notes")) db.exec("ALTER TABLE appointments ADD COLUMN notes TEXT;");

  // Cleanup Duplicate Client Logos
  const logos = db.prepare("SELECT name, COUNT(*) as c FROM client_logos GROUP BY name HAVING c > 1").all();
  if (logos.length > 0) {
    console.log(`[db] Found ${logos.length} duplicate client logo entries. Cleaning...`);
    for (const l of logos) {
      const ids = db.prepare("SELECT id FROM client_logos WHERE name = ? ORDER BY created_at DESC").all(l.name);
      // Keep only the most recent one
      const toDelete = ids.slice(1).map(x => x.id);
      db.prepare(`DELETE FROM client_logos WHERE id IN (${toDelete.map(() => "?").join(",")})`).run(...toDelete);
    }
  }

  // Swap Chat tables if they are still using old schema (approximate check)
  const chatMsgCols = db.prepare("PRAGMA table_info(chat_messages)").all().map(c => c.name);
  if (chatMsgCols.includes("thread_id")) {
    console.log("[db] Migration: Refactoring Chat tables to Master/Detail structure...");
    db.exec(`
      CREATE TABLE chat_messages_new (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        ip_address TEXT,
        channel TEXT NOT NULL DEFAULT 'website',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE chat_threads_new (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        content TEXT NOT NULL,
        sender TEXT,
        timestamp TEXT NOT NULL,
        meta TEXT,
        FOREIGN KEY (message_id) REFERENCES chat_messages_new(id) ON DELETE CASCADE
      );
    `);

    // Attempt basic data migration (one thread per old message for now as a baseline)
    const oldMsgs = db.prepare("SELECT * FROM chat_messages").all();
    for (const m of oldMsgs) {
      const sessId = m.thread_id || randomUUID();
      db.prepare("INSERT OR IGNORE INTO chat_messages_new (id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?)")
        .run(sessId, sessId, m.created_at, m.created_at);
      db.prepare("INSERT INTO chat_threads_new (id, message_id, direction, content, timestamp, meta) VALUES (?, ?, ?, ?, ?, ?)")
        .run(m.id, sessId, m.direction, m.message, m.created_at, m.meta);
    }

    db.exec(`
      DROP TABLE chat_messages;
      DROP TABLE chat_threads;
      ALTER TABLE chat_messages_new RENAME TO chat_messages;
      ALTER TABLE chat_threads_new RENAME TO chat_threads;
    `);
  }

  // Technologies: add name_color and category_color columns if missing
  const techCols = db.prepare("PRAGMA table_info(technologies)").all().map(c => c.name);
  if (!techCols.includes("name_color")) db.exec("ALTER TABLE technologies ADD COLUMN name_color TEXT NOT NULL DEFAULT '#3178C6';");
  if (!techCols.includes("category_color")) db.exec("ALTER TABLE technologies ADD COLUMN category_color TEXT NOT NULL DEFAULT '#3178C6';");
  // Seed brand colors for existing rows that have default color
  const techColorSeeds = [
    { name: ".NET",       name_color: "#512BD4", category_color: "#512BD4" },
    { name: "SQL Server", name_color: "#CC2927", category_color: "#CC2927" },
    { name: "Vue.js",     name_color: "#4FC08D", category_color: "#4FC08D" },
    { name: "Firebase",   name_color: "#FFCA28", category_color: "#FFCA28" },
    { name: "Node.js",    name_color: "#339933", category_color: "#339933" },
    { name: "Cordova",    name_color: "#E8E8E8", category_color: "#E8E8E8" },
    { name: "Kendo UI",   name_color: "#FF6358", category_color: "#FF6358" },
    { name: "Git",        name_color: "#F05032", category_color: "#F05032" },
    { name: "Flutter",    name_color: "#02569B", category_color: "#02569B" },
    { name: "Angular",    name_color: "#DD0031", category_color: "#DD0031" },
    { name: "TypeScript", name_color: "#3178C6", category_color: "#3178C6" },
    { name: "Dart",       name_color: "#0175C2", category_color: "#0175C2" },
    { name: "React",      name_color: "#61DAFB", category_color: "#61DAFB" },
    { name: "Python",     name_color: "#3776AB", category_color: "#3776AB" },
    { name: "Docker",     name_color: "#2496ED", category_color: "#2496ED" },
    { name: "AWS",        name_color: "#FF9900", category_color: "#FF9900" },
  ];
  for (const s of techColorSeeds) {
    db.prepare("UPDATE technologies SET name_color=?, category_color=? WHERE name=? AND (name_color='#3178C6' OR name_color IS NULL)").run(s.name_color, s.category_color, s.name);
  }

  // Hero Stats: add suffix column if missing
  const heroStatsCols = db.prepare("PRAGMA table_info(hero_stats)").all().map(c => c.name);
  if (!heroStatsCols.includes("suffix")) {
    db.exec("ALTER TABLE hero_stats ADD COLUMN suffix TEXT NOT NULL DEFAULT '+';");
    db.prepare("UPDATE hero_stats SET suffix='%' WHERE sort_order = 2").run();
    console.log('[db] Migration: added suffix column to hero_stats.');
  }

  // Hero Stats: clean duplicates and seed correctly
  const heroStatsRows = db.prepare("SELECT COUNT(*) as c FROM hero_stats").get().c;
  const heroStatsDupes = db.prepare("SELECT sort_order, COUNT(*) as c FROM hero_stats GROUP BY sort_order HAVING c > 1").all();
  if (heroStatsRows === 0 || heroStatsDupes.length > 0) {
    db.prepare("DELETE FROM hero_stats").run();
    const heroRow = db.prepare("SELECT content FROM site_content WHERE section_key = 'hero'").get();
    const hc = heroRow ? JSON.parse(heroRow.content) : {};
    const cleanStats = [
      { id: 'hs-1', count: hc.stats_projects_count    || '300', suffix: '+', label: hc.stats_projects_label    || 'Projects Completed',  color: 'gradient', is_visible: 1, sort_order: 0 },
      { id: 'hs-2', count: hc.stats_clients_count     || '50',  suffix: '+', label: hc.stats_clients_label     || 'Happy Clients',       color: 'gradient', is_visible: 1, sort_order: 1 },
      { id: 'hs-3', count: hc.stats_satisfaction_count || '100', suffix: '%', label: hc.stats_satisfaction_label || 'Client Satisfaction', color: 'gradient', is_visible: 1, sort_order: 2 },
    ];
    const ins = db.prepare('INSERT INTO hero_stats (id,count,suffix,label,color,is_visible,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
    const now = new Date().toISOString();
    cleanStats.forEach(s => ins.run(s.id, s.count, s.suffix, s.label, s.color, s.is_visible, s.sort_order, now, now));
    console.log('[db] Seeded/fixed hero_stats: 3 rows.');
  }

} catch (e) { console.error("[db] Migration error:", e.message); }

// â”€â”€ Seed data (only if tables are empty) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const t0 = new Date().toISOString();

function seedIfEmpty(table, rows) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  if (count > 0) return;
  const keys = Object.keys(rows[0]);
  const placeholders = keys.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`);
  const insertMany = db.transaction((items) => {
    for (const item of items) stmt.run(Object.values(item));
  });
  insertMany(rows);
  console.log(`[db] Seeded ${rows.length} rows into ${table}`);
}

seedIfEmpty("services", [
  { id: "svc-1", title: "Software Development", description: "Custom enterprise software built to your exact specifications â€” scalable, secure, and maintainable.", image_url: "/assets/services/software.png", is_visible: 1, sort_order: 0, created_at: t0, updated_at: t0 },
  { id: "svc-2", title: "Web Development", description: "Modern, responsive websites and web applications using the latest frameworks and best practices.", image_url: "/assets/services/web.png", is_visible: 1, sort_order: 1, created_at: t0, updated_at: t0 },
  { id: "svc-3", title: "Mobile App Development", description: "Native and cross-platform mobile apps for iOS and Android that deliver exceptional user experiences.", image_url: "/assets/services/mobile.png", is_visible: 1, sort_order: 2, created_at: t0, updated_at: t0 },
  { id: "svc-4", title: "ERP Solutions", description: "End-to-end ERP implementation and integration â€” finance, inventory, procurement, and operations unified.", image_url: "/assets/services/erp.png", is_visible: 1, sort_order: 3, created_at: t0, updated_at: t0 },
  { id: "svc-5", title: "HR & Payroll Systems", description: "Streamline hiring, attendance, payroll, and performance management with our HR platform.", image_url: "/assets/services/hr.png", is_visible: 1, sort_order: 4, created_at: t0, updated_at: t0 },
  { id: "svc-6", title: "IT Consulting", description: "Strategic technology consulting to align your IT infrastructure with your business goals.", image_url: "/assets/services/consulting.png", is_visible: 1, sort_order: 5, created_at: t0, updated_at: t0 },
  { id: "svc-7", title: "SEO & Digital Marketing", description: "Data-driven SEO strategies and digital marketing campaigns that grow your online presence.", image_url: "/assets/services/seo.png", is_visible: 1, sort_order: 6, created_at: t0, updated_at: t0 },
  { id: "svc-8", title: "UI/UX Design", description: "Beautiful, intuitive interfaces designed with your users in mind â€” from wireframes to pixel-perfect delivery.", image_url: "/assets/services/design.png", is_visible: 1, sort_order: 7, created_at: t0, updated_at: t0 },
  { id: "svc-9", title: "Cloud & Infrastructure", description: "Cloud migration, DevOps pipelines, and managed infrastructure to keep your systems fast and reliable.", image_url: "/assets/services/software.png", is_visible: 1, sort_order: 8, created_at: t0, updated_at: t0 },
]);

seedIfEmpty("testimonials", [
  { id: "tst-1", name: "Ahmed Rasheed", company: "Villa Group", message: "Systems Solutions transformed our operations with their ERP system. The team was professional, responsive, and delivered exactly what we needed.", avatar_url: "/assets/testimonials/ahmed.jpg", rating: 5, is_visible: 1, created_at: t0, updated_at: t0 },
  { id: "tst-2", name: "Fatima Zahir", company: "OBLU Resorts", message: "Their web development team built us a stunning booking platform. Traffic and conversions have increased significantly since launch.", avatar_url: "/assets/testimonials/fatima.jpg", rating: 5, is_visible: 1, created_at: t0, updated_at: t0 },
  { id: "tst-3", name: "Dorji Wangchuk", company: "RCSC Bhutan", message: "Excellent consulting services. They understood our requirements perfectly and delivered a robust HR system on time and within budget.", avatar_url: "/assets/testimonials/dorji.jpg", rating: 5, is_visible: 1, created_at: t0, updated_at: t0 },
]);

seedIfEmpty("products", [
  { id: "prd-1", name: "BSOL", tagline: "ERP with CRM Combined", description: "Unify your entire business â€” finance, inventory, procurement, sales pipeline, and customer relationships â€” in one powerful platform.", image_url: "/assets/products/bsol.jpg", contact_url: "#contact", is_popular: 0, is_visible: 1, sort_order: 0, created_at: t0, updated_at: t0 },
  { id: "prd-2", name: "HR-Metrics", tagline: "HR with Task Management", description: "From hiring to payroll, attendance to performance reviews â€” HR-Metrics streamlines every HR workflow while keeping your teams aligned.", image_url: "/assets/products/hr-metrics.jpg", contact_url: "#contact", is_popular: 1, is_visible: 1, sort_order: 1, created_at: t0, updated_at: t0 },
  { id: "prd-3", name: "GoBoat", tagline: "Complete Boat Management Software", description: "Purpose-built for the marine industry. GoBoat handles vessel scheduling, crew management, maintenance logs, and charter bookings.", image_url: "/assets/products/goboat.jpg", contact_url: "#contact", is_popular: 0, is_visible: 1, sort_order: 2, created_at: t0, updated_at: t0 },
  { id: "prd-4", name: "PromisePro", tagline: "Resort Booking & Management", description: "Delight guests from first click to checkout. PromisePro powers online reservations, room management, housekeeping, and guest communications.", image_url: "/assets/products/promisepro.jpg", contact_url: "#contact", is_popular: 0, is_visible: 1, sort_order: 3, created_at: t0, updated_at: t0 },
  { id: "prd-5", name: "Travel", tagline: "End-to-End Travel Booking Platform", description: "A full-featured travel booking engine for agencies and operators. Manage flights, hotels, packages, visa processing, and customer itineraries.", image_url: "/assets/products/travel.jpg", contact_url: "#contact", is_popular: 0, is_visible: 1, sort_order: 4, created_at: t0, updated_at: t0 },
]);

seedIfEmpty("career_jobs", [
  { id: "job-1", title: "Senior Full Stack Developer", description: "We are looking for an experienced Full Stack Developer proficient in React, Node.js, and cloud technologies to join our growing team.", location: "MalÃ©, Maldives", job_type: "Full-time", is_visible: 1, sort_order: 0, created_at: t0, updated_at: t0 },
  { id: "job-2", title: "UI/UX Designer", description: "Creative designer with strong Figma skills and a portfolio of web/mobile projects. You will work closely with our development team.", location: "MalÃ©, Maldives", job_type: "Full-time", is_visible: 1, sort_order: 1, created_at: t0, updated_at: t0 },
  { id: "job-3", title: "Business Development Executive", description: "Drive growth by identifying new business opportunities, building client relationships, and closing deals across the Maldives and Bhutan.", location: "MalÃ©, Maldives", job_type: "Full-time", is_visible: 1, sort_order: 2, created_at: t0, updated_at: t0 },
]);

seedIfEmpty("seo_settings", [
  { id: "seo-1", page_key: "home", title: "Systems Solutions - Leading IT Company in Maldives", description: "Transform your business with cutting-edge technology solutions. Software development, ERP, mobile apps, and IT consulting.", keywords: "IT solutions, Maldives, software development, ERP, web development", og_image: "", updated_at: t0, updated_by: null },
]);


seedIfEmpty("client_logos", [
  { id: "cl-0", name: "aaa Hotels & Resorts", logo_url: "/assets/clients/aaa-1.png", is_visible: 1, sort_order: 0, created_at: t0, updated_at: t0 },
  { id: "cl-1", name: "Alia Investments", logo_url: "/assets/clients/Alia.png", is_visible: 1, sort_order: 1, created_at: t0, updated_at: t0 },
  { id: "cl-2", name: "Baglioni Resorts", logo_url: "/assets/clients/Baglioni.jpg", is_visible: 1, sort_order: 2, created_at: t0, updated_at: t0 },
  { id: "cl-3", name: "City Investments", logo_url: "/assets/clients/City-Investments.jpg", is_visible: 1, sort_order: 3, created_at: t0, updated_at: t0 },
  { id: "cl-4", name: "Cocoon Maldives", logo_url: "/assets/clients/Cocoon.jpg", is_visible: 1, sort_order: 4, created_at: t0, updated_at: t0 },
  { id: "cl-5", name: "Co Load", logo_url: "/assets/clients/Co-load-2.png", is_visible: 1, sort_order: 5, created_at: t0, updated_at: t0 },
  { id: "cl-6", name: "COLOURS OF OBLU", logo_url: "/assets/clients/Colors-of-OBLU-768x390.png", is_visible: 1, sort_order: 6, created_at: t0, updated_at: t0 },
  { id: "cl-7", name: "DAMAS", logo_url: "/assets/clients/DAMAS-768x397.jpg", is_visible: 1, sort_order: 7, created_at: t0, updated_at: t0 },
  { id: "cl-8", name: "Election Commission of Maldives", logo_url: "/assets/clients/ecm.png", is_visible: 1, sort_order: 8, created_at: t0, updated_at: t0 },
  { id: "cl-9", name: "ELL Mobiles", logo_url: "/assets/clients/ELL-Mobiles-768x768.png", is_visible: 1, sort_order: 9, created_at: t0, updated_at: t0 },
  { id: "cl-10", name: "Ensis Fisheries", logo_url: "/assets/clients/Ensis-2.png", is_visible: 1, sort_order: 10, created_at: t0, updated_at: t0 },
  { id: "cl-11", name: "Fuel Supplies Maldives", logo_url: "/assets/clients/FSM-1.png", is_visible: 1, sort_order: 11, created_at: t0, updated_at: t0 },
  { id: "cl-12", name: "Fushifaru", logo_url: "/assets/clients/Fushifaru-1.png", is_visible: 1, sort_order: 12, created_at: t0, updated_at: t0 },
  { id: "cl-13", name: "Gage Maldives", logo_url: "/assets/clients/gage-logo-1.png", is_visible: 1, sort_order: 13, created_at: t0, updated_at: t0 },
  { id: "cl-14", name: "Happy Market", logo_url: "/assets/clients/Happy-Market.png", is_visible: 1, sort_order: 14, created_at: t0, updated_at: t0 },
  { id: "cl-15", name: "HDFC", logo_url: "/assets/clients/HDFC.png", is_visible: 1, sort_order: 15, created_at: t0, updated_at: t0 },
  { id: "cl-16", name: "Horizon Fisheries", logo_url: "/assets/clients/Horizon-fisheries-1.png", is_visible: 1, sort_order: 16, created_at: t0, updated_at: t0 },
  { id: "cl-17", name: "ILAA Maldives", logo_url: "/assets/clients/Ilaa-Maldives-1-768x593.jpg", is_visible: 1, sort_order: 17, created_at: t0, updated_at: t0 },
  { id: "cl-18", name: "Island Beverages", logo_url: "/assets/clients/Island-Beverages.png", is_visible: 1, sort_order: 18, created_at: t0, updated_at: t0 },
  { id: "cl-19", name: "Island Breeze Maldives", logo_url: "/assets/clients/Island-Breeze-Maldives.png", is_visible: 1, sort_order: 19, created_at: t0, updated_at: t0 },
  { id: "cl-20", name: "Medianet", logo_url: "/assets/clients/Medianet_Maldives.jpg", is_visible: 1, sort_order: 20, created_at: t0, updated_at: t0 },
  { id: "cl-21", name: "Medtech Maldives", logo_url: "/assets/clients/Medtech-Maldives.jpg", is_visible: 1, sort_order: 21, created_at: t0, updated_at: t0 },
  { id: "cl-22", name: "Mifco", logo_url: "/assets/clients/Mifco-2-768x309.png", is_visible: 1, sort_order: 22, created_at: t0, updated_at: t0 },
  { id: "cl-23", name: "Muni Enterprises", logo_url: "/assets/clients/Muni-1.png", is_visible: 1, sort_order: 23, created_at: t0, updated_at: t0 },
  { id: "cl-24", name: "OBLU Helengeli", logo_url: "/assets/clients/OBLU-Helengeli.png", is_visible: 1, sort_order: 24, created_at: t0, updated_at: t0 },
  { id: "cl-25", name: "Oblu Select", logo_url: "/assets/clients/Oblu-Select.png", is_visible: 1, sort_order: 25, created_at: t0, updated_at: t0 },
  { id: "cl-26", name: "OZEN Life Maadhoo", logo_url: "/assets/clients/OZEN-Life-Maadhoo-500x500.png", is_visible: 1, sort_order: 26, created_at: t0, updated_at: t0 },
  { id: "cl-27", name: "OZEN Reserve Bolifushi", logo_url: "/assets/clients/OZEN-Reserve-Bolifushi.png", is_visible: 1, sort_order: 27, created_at: t0, updated_at: t0 },
  { id: "cl-28", name: "Plaza Enterprises", logo_url: "/assets/clients/Plaza.png", is_visible: 1, sort_order: 28, created_at: t0, updated_at: t0 },
  { id: "cl-29", name: "RCSC, Bhutan", logo_url: "/assets/clients/RCSC.jpg", is_visible: 1, sort_order: 29, created_at: t0, updated_at: t0 },
  { id: "cl-30", name: "SIMDI Group", logo_url: "/assets/clients/SIMDI-Group.png", is_visible: 1, sort_order: 30, created_at: t0, updated_at: t0 },
  { id: "cl-31", name: "TEP Construction", logo_url: "/assets/clients/TEP-Constuction.png", is_visible: 1, sort_order: 31, created_at: t0, updated_at: t0 },
  { id: "cl-32", name: "The Hawks", logo_url: "/assets/clients/The-Hawks.png", is_visible: 1, sort_order: 32, created_at: t0, updated_at: t0 },
  { id: "cl-33", name: "United Food Suppliers", logo_url: "/assets/clients/United-Food-Suppliers.png", is_visible: 1, sort_order: 33, created_at: t0, updated_at: t0 },
  { id: "cl-34", name: "VARU by Atmosphere", logo_url: "/assets/clients/VARU-by-Atmosphere.jpg", is_visible: 1, sort_order: 34, created_at: t0, updated_at: t0 },
  { id: "cl-35", name: "Voyages Maldives", logo_url: "/assets/clients/voyage-Maldives.png", is_visible: 1, sort_order: 35, created_at: t0, updated_at: t0 },
  { id: "cl-36", name: "You & Me Maldives", logo_url: "/assets/clients/You-Me-Maldives-768x660.png", is_visible: 1, sort_order: 36, created_at: t0, updated_at: t0 },
  { id: "cl-37", name: "Villa Shipping and Trading Company", logo_url: "/assets/clients/Villagrouplogo-1.png", is_visible: 1, sort_order: 37, created_at: t0, updated_at: t0 }
]);

// Fix bad site_logo value stored as src/assets/logo.png → /logo.png
try {
  const settingsRow = db.prepare("SELECT id, content FROM site_content WHERE section_key = 'settings'").get();
  if (settingsRow) {
    const c = JSON.parse(settingsRow.content);
    let dirty = false;
    if (!c.site_logo || c.site_logo === 'src/assets/logo.png' || c.site_logo === 'src/assets/logo1.png') {
      c.site_logo = '/logo.png';
      dirty = true;
    }
    if (!Array.isArray(c.nav_items) || c.nav_items.length === 0) {
      c.nav_items = [
        { label: 'Home',         href: '#home' },
        { label: 'About',        href: '#about' },
        { label: 'Services',     href: '#services' },
        { label: 'Products',     href: '#products' },
        { label: 'Portfolio',    href: '#portfolio' },
        { label: 'Technologies', href: '#technologies' },
        { label: 'Careers',      href: '#careers' },
        { label: 'Contact',      href: '#contact' },
      ];
      dirty = true;
    }
    // Patch existing nav_items to add Technologies if missing
    if (Array.isArray(c.nav_items) && !c.nav_items.some(n => n.href === '#technologies')) {
      const careersIdx = c.nav_items.findIndex(n => n.href === '#careers');
      const insertAt = careersIdx >= 0 ? careersIdx : c.nav_items.length;
      c.nav_items.splice(insertAt, 0, { label: 'Technologies', href: '#technologies' });
      dirty = true;
    }
    if (dirty) {
      db.prepare("UPDATE site_content SET content = ?, updated_at = ? WHERE id = ?")
        .run(JSON.stringify(c), t0, settingsRow.id);
      console.log('[db] Patched settings: fixed site_logo + added nav_items');
    }
  }
} catch (e) { console.error('[db] settings patch error:', e.message); }

// Seed missing site_content rows
const siteContentSeeds = [
  { section_key: "services",     content: JSON.stringify({ title: "Services & Solutions We Deliver", subtitle: "Team up with the perfect digital partner for all your technical needs to achieve your business goals, reduce costs and accelerate growth." }) },
  { section_key: "testimonials", content: JSON.stringify({ badge: "Testimonials", title: "What Our", highlight: "Clients Say" }) },
  { section_key: "careers",      content: JSON.stringify({ badge: "Careers", title: "Join Our", highlight: "Team", description: "Be part of a dynamic team building cutting-edge technology solutions for clients worldwide." }) },
  { section_key: "technologies",  content: JSON.stringify({ badge: "Our Stack", title: "Technologies", highlight: "We Use", description: "We leverage cutting-edge technologies to build robust, scalable, and future-proof solutions for our clients." }) },
  { section_key: "our_network",  content: JSON.stringify({ companies: [
    { id: "1", name: "Brilliant Systems Solutions", subtitle: "Private Limited", desc: "Our sister company delivering innovative IT solutions across the Maldives.", href: "https://bsyssolutions.com", flag: "🇲🇻", accent: "#3b82f6", is_visible: true },
    { id: "2", name: "BSS Bhutan", subtitle: "Technology Partner", desc: "Expanding world-class digital solutions across the Kingdom of Bhutan.", href: "#", flag: "🇧🇹", accent: "#10b981", is_visible: true },
  ]}) },
];
for (const seed of siteContentSeeds) {
  const exists = db.prepare("SELECT id FROM site_content WHERE section_key = ?").get(seed.section_key);
  if (!exists) {
    db.prepare("INSERT INTO site_content (id, section_key, content, created_at, updated_at) VALUES (?,?,?,?,?)")
      .run(randomUUID(), seed.section_key, seed.content, t0, t0);
    console.log(`[db] Seeded site_content: ${seed.section_key}`);
  }
}

seedIfEmpty("technologies", [
  { id: "tech-1",  name: ".NET",        description: "Microsoft's powerful framework for building enterprise-grade web, desktop, and cloud applications.",          image_url: "/assets/technologies/dotnet.png",      category: "Backend",  name_color: "#512BD4", category_color: "#512BD4", is_visible: 1, sort_order: 0,  created_at: t0, updated_at: t0 },
  { id: "tech-2",  name: "SQL Server",  description: "Microsoft's relational database management system for secure, scalable data storage and analytics.",       image_url: "/assets/technologies/sqlserver.png",   category: "Database", name_color: "#CC2927", category_color: "#CC2927", is_visible: 1, sort_order: 1,  created_at: t0, updated_at: t0 },
  { id: "tech-3",  name: "Vue.js",      description: "Progressive JavaScript framework for building modern, reactive user interfaces and single-page apps.",      image_url: "/assets/technologies/vuejs.png",       category: "Frontend", name_color: "#4FC08D", category_color: "#4FC08D", is_visible: 1, sort_order: 2,  created_at: t0, updated_at: t0 },
  { id: "tech-4",  name: "Firebase",    description: "Google's platform for real-time databases, authentication, hosting, and serverless cloud functions.",       image_url: "/assets/technologies/firebase.png",    category: "Backend",  name_color: "#FFCA28", category_color: "#FFCA28", is_visible: 1, sort_order: 3,  created_at: t0, updated_at: t0 },
  { id: "tech-5",  name: "Node.js",     description: "Fast, event-driven JavaScript runtime for building scalable server-side and network applications.",         image_url: "/assets/technologies/nodejs.png",      category: "Backend",  name_color: "#339933", category_color: "#339933", is_visible: 1, sort_order: 4,  created_at: t0, updated_at: t0 },
  { id: "tech-6",  name: "Cordova",     description: "Open-source framework for building cross-platform mobile apps using HTML, CSS, and JavaScript.",           image_url: "/assets/technologies/cordova.png",     category: "Mobile",   name_color: "#4CC2E4", category_color: "#4CC2E4", is_visible: 1, sort_order: 5,  created_at: t0, updated_at: t0 },
  { id: "tech-7",  name: "Kendo UI",    description: "Comprehensive UI component library for building rich, data-driven web applications with ease.",             image_url: "/assets/technologies/kendoui.png",     category: "Frontend", name_color: "#FF6358", category_color: "#FF6358", is_visible: 1, sort_order: 6,  created_at: t0, updated_at: t0 },
  { id: "tech-8",  name: "Git",         description: "Industry-standard distributed version control system for tracking code changes and team collaboration.",    image_url: "/assets/technologies/git.png",         category: "DevOps",   name_color: "#F05032", category_color: "#F05032", is_visible: 1, sort_order: 7,  created_at: t0, updated_at: t0 },
  { id: "tech-9",  name: "Flutter",     description: "Google's UI toolkit for crafting natively compiled, beautiful apps for mobile, web, and desktop.",         image_url: "/assets/technologies/flutter.png",     category: "Mobile",   name_color: "#02569B", category_color: "#02569B", is_visible: 1, sort_order: 8,  created_at: t0, updated_at: t0 },
  { id: "tech-10", name: "Angular",     description: "TypeScript-based web application framework by Google for building scalable enterprise front-ends.",         image_url: "/assets/technologies/angular.png",     category: "Frontend", name_color: "#DD0031", category_color: "#DD0031", is_visible: 1, sort_order: 9,  created_at: t0, updated_at: t0 },
  { id: "tech-11", name: "TypeScript",  description: "Strongly typed superset of JavaScript that compiles to plain JS, enabling safer and more scalable code.",  image_url: "/assets/technologies/typescript.png",  category: "Language", name_color: "#3178C6", category_color: "#3178C6", is_visible: 1, sort_order: 10, created_at: t0, updated_at: t0 },
  { id: "tech-12", name: "Dart",        description: "Client-optimized language by Google, powering Flutter apps with fast performance and expressive syntax.",   image_url: "/assets/technologies/dart.png",        category: "Language", name_color: "#0175C2", category_color: "#0175C2", is_visible: 1, sort_order: 11, created_at: t0, updated_at: t0 },
  { id: "tech-13", name: "React",       description: "Facebook's declarative JavaScript library for building fast, component-based user interfaces.",              image_url: "/assets/technologies/react.png",       category: "Frontend", name_color: "#61DAFB", category_color: "#61DAFB", is_visible: 1, sort_order: 12, created_at: t0, updated_at: t0 },
  { id: "tech-14", name: "Python",      description: "Versatile, high-level programming language widely used for AI, data science, automation, and web backends.", image_url: "/assets/technologies/python.png",      category: "Language", name_color: "#3776AB", category_color: "#3776AB", is_visible: 1, sort_order: 13, created_at: t0, updated_at: t0 },
  { id: "tech-15", name: "Docker",      description: "Platform for containerizing applications to ensure consistent environments across development and production.", image_url: "/assets/technologies/docker.png",      category: "DevOps",   name_color: "#2496ED", category_color: "#2496ED", is_visible: 1, sort_order: 14, created_at: t0, updated_at: t0 },
  { id: "tech-16", name: "AWS",         description: "Amazon Web Services — the world's most comprehensive cloud platform for hosting, storage, and AI services.",  image_url: "/assets/technologies/aws.png",         category: "Cloud",    name_color: "#FF9900", category_color: "#FF9900", is_visible: 1, sort_order: 15, created_at: t0, updated_at: t0 },
]);

seedIfEmpty("users", [
  { id: "admin-local", email: "admin@solutions.com.mv", password: "Admin@1234", userrole: "admin", created_at: t0, updated_at: t0 }
]);

seedIfEmpty("contact_submissions", [
  { id: "76ef6c3f-9a27-4f53-9b1f-b45a93679dad", name: "Test User", full_name: "Test User", company_name: null, email: "test@example.com", phone: null, message: "This is a test message to verify fallback email logic.", is_read: 0, created_at: "2026-03-27T17:29:59.131Z" },
  { id: "da929a3d-48e1-4a8a-8bc0-42a0a7bce35c", name: "sdfasd", full_name: "sdfasd", company_name: null, email: "prasannaprobite@gmail.com", phone: null, message: "sdfsadf\nService: Mobile App Development\nPreferred Date 1: 2026-03-29T16:16\nPreferred Date 2: 2026-03-29T16:16", is_read: 0, created_at: "2026-03-29T11:10:48.662Z" },
  { id: "9355deea-6986-480f-b0c9-e0d332ceb9ef", name: "sdfasdf", full_name: "sdfasdf", company_name: null, email: "asdfasd@gmail.com", phone: null, message: "sadfasdf\nPreferred Date 1: 2026-03-29T18:02\nPreferred Date 2: 2026-03-29T18:02", is_read: 0, created_at: "2026-03-29T12:43:16.084Z" },
  { id: "db90838e-87c5-4094-bcb2-93f642ee32ca", name: "test", full_name: "test", company_name: null, email: "prasannaprobiz@gmail.com", phone: null, message: "some text \nPreferred Date 1: 2026-03-30T13:05\nPreferred Date 2: 2026-03-31T13:05", is_read: 0, created_at: "2026-03-29T13:06:43.030Z" },
]);

seedIfEmpty("submission_replies", [
  { id: "ee96a078-e457-4c1f-b692-c3f0f078cfb0", submission_id: "76ef6c3f-9a27-4f53-9b1f-b45a93679dad", sender: "admin", message: "hi", created_at: "2026-03-27T17:31:30.213Z" },
  { id: "ecaadd14-2714-4a65-bd4e-cf0ab62fc8f1", submission_id: "76ef6c3f-9a27-4f53-9b1f-b45a93679dad", sender: "admin", message: "hi too", created_at: "2026-03-28T18:27:07.307Z" },
  { id: "ece67f7c-39c1-4b32-a4e0-fbc69d19fb4e", submission_id: "76ef6c3f-9a27-4f53-9b1f-b45a93679dad", sender: "admin", message: "gfafdgsdfgd", created_at: "2026-03-29T08:22:05.414Z" },
  { id: "d6727686-b94c-4f30-8814-9bd0acf8ed3f", submission_id: "76ef6c3f-9a27-4f53-9b1f-b45a93679dad", sender: "admin", message: "ok", created_at: "2026-03-29T11:21:23.488Z" },
  { id: "ce0a7b7e-330f-470e-8442-8e4e9b8f76c0", submission_id: "9355deea-6986-480f-b0c9-e0d332ceb9ef", sender: "admin", message: "sdfsdfa", created_at: "2026-03-29T12:58:49.132Z" },
  { id: "6cd8e354-84ed-4e44-b815-006ff75df19a", submission_id: "db90838e-87c5-4094-bcb2-93f642ee32ca", sender: "admin", message: "we will contact you", created_at: "2026-03-29T13:07:10.089Z" },
]);

seedIfEmpty("job_applications", [
  { id: "77fa2ecb-4142-40d0-a85b-7eb7d986472c", applicant_name: "sdfs", email: "prasanna", phone: "8144078979", job_id: "UI/UX Designer", resume_url: null, cover_letter: "rfe ertger ertg ertg er e", status: "applied", created_at: "2026-03-27T18:56:10.208Z", updated_at: "2026-03-29T10:04:09.544Z" },
  { id: "29e0f65a-9ebd-4ad4-af08-9bf3b7caccd1", applicant_name: "bite web", email: "prasannaprobite@gmail.com", phone: "797987987", job_id: "UI/UX Designer", resume_url: null, cover_letter: "sdafsadf", status: "applied", created_at: "2026-03-29T13:08:33.411Z", updated_at: "2026-03-29T14:04:07.455Z" },
]);

seedIfEmpty("application_replies", [
  { id: "03aa6664-2843-4269-aed9-025a0ed33379", application_id: "77fa2ecb-4142-40d0-a85b-7eb7d986472c", sender: "admin", message: "your interview postponded", created_at: "2026-03-27T18:58:15.177Z" },
  { id: "3ffe66f5-6f12-4556-a339-cafce2c8e6fa", application_id: "77fa2ecb-4142-40d0-a85b-7eb7d986472c", sender: "admin", message: "ghjgh", created_at: "2026-03-29T08:22:27.255Z" },
  { id: "2212bd07-6314-4d41-b2e0-fbc83999e4f8", application_id: "77fa2ecb-4142-40d0-a85b-7eb7d986472c", sender: "admin", message: "dfsfsd", created_at: "2026-03-29T08:25:09.592Z" },
  { id: "607cb47a-4ccf-4462-9c70-788cb1a3aa81", application_id: "77fa2ecb-4142-40d0-a85b-7eb7d986472c", sender: "admin", message: "fsg", created_at: "2026-03-29T10:04:04.383Z" },
  { id: "de572f60-4d80-44b8-a34f-81e9da3a66e8", application_id: "77fa2ecb-4142-40d0-a85b-7eb7d986472c", sender: "admin", message: "fd", created_at: "2026-03-29T10:04:09.544Z" },
  { id: "38911841-7b02-4e28-8f27-17a2581184fb", application_id: "29e0f65a-9ebd-4ad4-af08-9bf3b7caccd1", sender: "admin", message: "hi today message", created_at: "2026-03-29T14:04:07.455Z" },
]);

seedIfEmpty("chat_messages", [
  { id: "51c04f28-ff6e-44a3-8c9f-adc330bb306a", session_id: "51c04f28-ff6e-44a3-8c9f-adc330bb306a", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T12:56:49.634Z", updated_at: "2026-03-27T12:56:49.634Z" },
  { id: "web-1774632662986-gzawmdmea2l", session_id: "web-1774632662986-gzawmdmea2l", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T17:39:25.660Z", updated_at: "2026-03-27T17:39:25.660Z" },
  { id: "dc079433-4cc6-4383-88b7-3084e6f48f5a", session_id: "dc079433-4cc6-4383-88b7-3084e6f48f5a", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T18:16:30.535Z", updated_at: "2026-03-27T18:16:30.535Z" },
  { id: "e9cc080c-f720-421a-aa0e-9aa9a71dce42", session_id: "e9cc080c-f720-421a-aa0e-9aa9a71dce42", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T18:16:59.504Z", updated_at: "2026-03-27T18:16:59.504Z" },
  { id: "79640c5e-d812-4e7b-8a90-200c2582ecdc", session_id: "79640c5e-d812-4e7b-8a90-200c2582ecdc", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T19:08:55.000Z", updated_at: "2026-03-27T19:08:55.000Z" },
  { id: "f9e89b66-a374-412e-99dc-546460676e53", session_id: "f9e89b66-a374-412e-99dc-546460676e53", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T20:39:48.714Z", updated_at: "2026-03-27T20:39:48.714Z" },
  { id: "web-1774645453453-wirv0gokrcm", session_id: "web-1774645453453-wirv0gokrcm", ip_address: null, channel: "website", status: "active", created_at: "2026-03-27T21:05:40.162Z", updated_at: "2026-03-27T21:05:40.162Z" },
  { id: "web-1774690438058-bsru4rrcul", session_id: "web-1774690438058-bsru4rrcul", ip_address: null, channel: "website", status: "active", created_at: "2026-03-28T09:37:05.813Z", updated_at: "2026-03-28T09:37:05.813Z" },
  { id: "0a15a614-34e0-4bda-aac1-cc2b391051cf", session_id: "0a15a614-34e0-4bda-aac1-cc2b391051cf", ip_address: null, channel: "website", status: "active", created_at: "2026-03-28T18:38:52.554Z", updated_at: "2026-03-28T18:38:52.554Z" },
  { id: "a5f7f500-5324-4980-bcf6-10f89d16f53c", session_id: "a5f7f500-5324-4980-bcf6-10f89d16f53c", ip_address: null, channel: "website", status: "active", created_at: "2026-03-28T18:39:00.427Z", updated_at: "2026-03-28T18:39:00.427Z" },
  { id: "863e8efd-f305-42e3-a208-2c1cd8710631", session_id: "863e8efd-f305-42e3-a208-2c1cd8710631", ip_address: null, channel: "website", status: "active", created_at: "2026-03-28T18:43:42.374Z", updated_at: "2026-03-28T18:43:42.374Z" },
  { id: "7aaf0829-ef3a-4617-96e5-a2820e6c65d5", session_id: "7aaf0829-ef3a-4617-96e5-a2820e6c65d5", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T07:01:45.492Z", updated_at: "2026-03-29T07:01:45.492Z" },
  { id: "c88ea8d2-fe1a-49c7-9f6b-32172186ed14", session_id: "c88ea8d2-fe1a-49c7-9f6b-32172186ed14", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T07:02:00.238Z", updated_at: "2026-03-29T07:02:00.238Z" },
  { id: "74c97e6e-d04f-4730-a9a0-06ba5f51d143", session_id: "74c97e6e-d04f-4730-a9a0-06ba5f51d143", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T08:19:54.293Z", updated_at: "2026-03-29T08:19:54.293Z" },
  { id: "ae9effd4-5f0d-405b-8baa-f83a03e4bbc9", session_id: "ae9effd4-5f0d-405b-8baa-f83a03e4bbc9", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T08:21:23.553Z", updated_at: "2026-03-29T08:21:23.553Z" },
  { id: "web-1774772661927-2st2r4tht0h", session_id: "web-1774772661927-2st2r4tht0h", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T08:32:11.427Z", updated_at: "2026-03-29T08:32:11.427Z" },
  { id: "web-1774783217385-cpq82kztwk", session_id: "web-1774783217385-cpq82kztwk", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T11:21:57.086Z", updated_at: "2026-03-29T11:21:57.086Z" },
  { id: "web-1774785579630-srkzhsglf3", session_id: "web-1774785579630-srkzhsglf3", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T12:04:32.232Z", updated_at: "2026-03-29T12:04:32.232Z" },
  { id: "8542107b-2b33-41d2-924f-35e14089a124", session_id: "8542107b-2b33-41d2-924f-35e14089a124", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T12:49:41.983Z", updated_at: "2026-03-29T12:49:41.983Z" },
  { id: "web-1774788222165-kvnb8vwdllj", session_id: "web-1774788222165-kvnb8vwdllj", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T12:49:58.000Z", updated_at: "2026-03-29T12:49:58.000Z" },
  { id: "web-1774788620634-6dalfr9vfzi", session_id: "web-1774788620634-6dalfr9vfzi", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T12:50:25.688Z", updated_at: "2026-03-29T12:50:25.688Z" },
  { id: "web-1774796985032-xcgh2p5e47p", session_id: "web-1774796985032-xcgh2p5e47p", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T15:15:32.625Z", updated_at: "2026-03-29T15:15:32.625Z" },
  { id: "5dfab308-5caa-412a-9dfc-884aca735074", session_id: "5dfab308-5caa-412a-9dfc-884aca735074", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T15:15:43.114Z", updated_at: "2026-03-29T15:15:43.114Z" },
  { id: "7de47730-fba6-487d-8f8d-9fe98cfcf884", session_id: "7de47730-fba6-487d-8f8d-9fe98cfcf884", ip_address: null, channel: "website", status: "active", created_at: "2026-03-29T15:17:11.113Z", updated_at: "2026-03-29T15:17:11.113Z" },
]);

seedIfEmpty("chat_threads", [
  { id: "93df5303-836b-48ec-af6f-7326156047e0", message_id: "51c04f28-ff6e-44a3-8c9f-adc330bb306a", direction: "outbound", content: "hi", sender: null, timestamp: "2026-03-27T12:56:49.634Z", meta: null },
  { id: "e3d52285-c9fa-45b7-8bea-60cb07e9c4ca", message_id: "51c04f28-ff6e-44a3-8c9f-adc330bb306a", direction: "bot", content: "Thank you for your message! I understand you're asking about: \"hi\".\n\nOur team will get back to you shortly. For immediate assistance:\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355", sender: null, timestamp: "2026-03-27T12:56:49.636Z", meta: '{"source":"fallback"}' },
  { id: "0748d761-387b-4dd4-abed-c4e935ed6ab7", message_id: "web-1774632662986-gzawmdmea2l", direction: "outbound", content: "ERP Demo- price plan", sender: null, timestamp: "2026-03-27T17:39:25.660Z", meta: null },
  { id: "6351a23b-516a-41ed-b8a0-10049c9259ee", message_id: "web-1774632662986-gzawmdmea2l", direction: "bot", content: "**BSOL** is our flagship ERP + CRM platform:\n\n✅ Finance & Accounting\n✅ Inventory & Warehouse Management\n✅ Procurement & Purchase Orders\n✅ Sales Pipeline & CRM\n✅ Multi-branch & Multi-currency\n✅ Real-time Dashboards & Reports\n\n🎯 **15 Days Free Trial** available!\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-27T17:39:25.674Z", meta: '{"source":"faq"}' },
  { id: "c9e8f173-37e3-405e-83c4-232896c29c66", message_id: "web-1774632662986-gzawmdmea2l", direction: "outbound", content: "office timing?", sender: null, timestamp: "2026-03-27T17:39:43.755Z", meta: null },
  { id: "26d62cd5-48cc-4f1f-9c10-6ebf197c8818", message_id: "web-1774632662986-gzawmdmea2l", direction: "bot", content: "📞 **Contact Brilliant System Solutions:**\n\n📧 Email: prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355\n📱 Viber: 9489477144\n📞 Landline: +91-452 238 7388\n\n🏢 Malé, Maldives: Alia Building, 7th Floor\n🇮🇳 Tamilnadu, India: Regional Office\n\n⏰ Sun–Thu: 9AM–6PM | Sat: 9AM–1PM", sender: null, timestamp: "2026-03-27T17:39:43.757Z", meta: '{"source":"faq"}' },
  { id: "5bbcbcae-9578-435e-a6f2-02cedb0d9409", message_id: "web-1774632662986-gzawmdmea2l", direction: "outbound", content: "how to create a invoice", sender: null, timestamp: "2026-03-27T17:40:05.665Z", meta: null },
  { id: "2daee270-ab87-4488-a126-506a0a6c1f24", message_id: "web-1774632662986-gzawmdmea2l", direction: "bot", content: "Great question! For detailed technical guidance, I recommend checking official documentation or a search engine.\n\nFor anything related to our products or services, I'm here to help:\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-27T17:40:05.666Z", meta: '{"source":"faq"}' },
  { id: "7b321e43-89bc-4338-a968-0c0e6d522d9f", message_id: "web-1774632662986-gzawmdmea2l", direction: "outbound", content: "bye", sender: null, timestamp: "2026-03-27T17:40:23.193Z", meta: null },
  { id: "5b8fe68c-f299-4e5c-a5f3-db59a195e928", message_id: "web-1774632662986-gzawmdmea2l", direction: "bot", content: "Goodbye! 👋 Feel free to reach out anytime. Have a great day!", sender: null, timestamp: "2026-03-27T17:40:23.194Z", meta: '{"source":"faq"}' },
  { id: "81f2e975-26cb-48c6-a4d0-224980fd28b1", message_id: "web-1774632662986-gzawmdmea2l", direction: "outbound", content: "which number of customers have in bsol product?", sender: null, timestamp: "2026-03-27T17:40:56.186Z", meta: null },
  { id: "7b48ab93-d3ee-4bea-be27-b7836be7330a", message_id: "web-1774632662986-gzawmdmea2l", direction: "bot", content: "**BSOL** is our flagship ERP + CRM platform:\n\n✅ Finance & Accounting\n✅ Inventory & Warehouse Management\n✅ Procurement & Purchase Orders\n✅ Sales Pipeline & CRM\n✅ Multi-branch & Multi-currency\n✅ Real-time Dashboards & Reports\n\n🎯 **15 Days Free Trial** available!\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-27T17:40:56.186Z", meta: '{"source":"faq"}' },
  { id: "6f65742d-95a1-4f05-91ad-9fd2057bdfae", message_id: "dc079433-4cc6-4383-88b7-3084e6f48f5a", direction: "outbound", content: "ok wil do it", sender: null, timestamp: "2026-03-27T18:16:30.535Z", meta: null },
  { id: "bfa39c1d-38db-49f3-a17a-b3b14ffc790a", message_id: "dc079433-4cc6-4383-88b7-3084e6f48f5a", direction: "bot", content: "Thanks for your message! 🙏\n\nI understand you're asking about: \"ok wil do it\"\n\nLet me connect you with our team for the best answer:\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355\n📞 +91-452 238 7388\n\n⏰ We respond within 24 hours on business days.", sender: null, timestamp: "2026-03-27T18:16:30.550Z", meta: '{"source":"fallback"}' },
  { id: "c8ff392f-c050-40b7-bb0a-4e68a001ce20", message_id: "e9cc080c-f720-421a-aa0e-9aa9a71dce42", direction: "outbound", content: "hi", sender: null, timestamp: "2026-03-27T18:16:59.504Z", meta: null },
  { id: "38f3f537-fea1-411b-bee5-3ca0a2a32589", message_id: "e9cc080c-f720-421a-aa0e-9aa9a71dce42", direction: "bot", content: "Hello! 👋 Welcome to Brilliant System Solutions!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?", sender: null, timestamp: "2026-03-27T18:16:59.506Z", meta: '{"source":"faq"}' },
  { id: "908b5920-771d-4c39-b7dd-471c465e2b96", message_id: "79640c5e-d812-4e7b-8a90-200c2582ecdc", direction: "outbound", content: "hi", sender: null, timestamp: "2026-03-27T19:08:55.000Z", meta: null },
  { id: "a4544652-3a9e-4e78-83e9-29e04b1d9665", message_id: "79640c5e-d812-4e7b-8a90-200c2582ecdc", direction: "bot", content: "Hello! 👋 Welcome to Brilliant System Solutions!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?", sender: null, timestamp: "2026-03-27T19:08:55.006Z", meta: '{"source":"faq"}' },
  { id: "9fb578de-9d4d-432c-8b64-3c917ee5871f", message_id: "f9e89b66-a374-412e-99dc-546460676e53", direction: "outbound", content: "hi", sender: null, timestamp: "2026-03-27T20:39:48.714Z", meta: null },
  { id: "4e6ea46f-fd55-4e6c-849c-889521d441b8", message_id: "f9e89b66-a374-412e-99dc-546460676e53", direction: "bot", content: "Hello! 👋 Welcome to Brilliant System Solutions!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?", sender: null, timestamp: "2026-03-27T20:39:48.720Z", meta: '{"source":"faq"}' },
  { id: "969a6b75-4fe5-4e9b-83f7-54b316f7750e", message_id: "web-1774645453453-wirv0gokrcm", direction: "inbound", content: "HR Software - your login credentials give me", sender: null, timestamp: "2026-03-27T21:05:40.162Z", meta: null },
  { id: "5ba71680-d82a-4cc1-af0c-3329fcc9d63b", message_id: "web-1774645453453-wirv0gokrcm", direction: "bot", content: "**HR-Metrics** is our complete HR & Payroll platform:\n\n✅ Employee Onboarding & Management\n✅ Payroll Processing (auto tax, deductions)\n✅ Attendance & Leave Tracking\n✅ Performance Reviews & KPIs\n✅ Task Management & OKRs\n✅ Cloud-based SaaS — access anywhere\n✅ 24/7 Support\n\n🎯 **15 Days Free Trial** — no credit card needed!\n🔗 Demo: https://demo.hrmetrics.mv/\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9603011355\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-27T21:05:40.166Z", meta: '{"source":"faq"}' },
  { id: "1c920927-40dc-4575-95a7-fc251c5ba9a8", message_id: "web-1774690438058-bsru4rrcul", direction: "inbound", content: "ERP Demo - licience period", sender: null, timestamp: "2026-03-28T09:37:05.813Z", meta: null },
  { id: "5b40c807-3838-4962-babf-62c5af5c1674", message_id: "web-1774690438058-bsru4rrcul", direction: "bot", content: "**BSOL** is our flagship ERP + CRM platform:\n\n✅ Finance & Accounting\n✅ Inventory & Warehouse Management\n✅ Procurement & Purchase Orders\n✅ Sales Pipeline & CRM\n✅ Multi-branch & Multi-currency\n✅ Real-time Dashboards & Reports\n\n🎯 **15 Days Free Trial** available!\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9489477144\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-28T09:37:05.869Z", meta: '{"source":"faq"}' },
  { id: "1c921867-b55b-4c94-a0ae-68598d9cbcf5", message_id: "0a15a614-34e0-4bda-aac1-cc2b391051cf", direction: "inbound", content: "hiu", sender: null, timestamp: "2026-03-28T18:38:52.554Z", meta: null },
  { id: "a2301839-50f1-46f6-88e0-b6a71f976ebd", message_id: "a5f7f500-5324-4980-bcf6-10f89d16f53c", direction: "inbound", content: "fdas", sender: null, timestamp: "2026-03-28T18:39:00.427Z", meta: null },
  { id: "5d727f5b-8f65-4da3-8cfe-f53e8527163a", message_id: "863e8efd-f305-42e3-a208-2c1cd8710631", direction: "inbound", content: "sdfgasf", sender: null, timestamp: "2026-03-28T18:43:42.374Z", meta: null },
  { id: "3e2af2ad-4a31-4b0f-8b7b-f1e40bb337a7", message_id: "7aaf0829-ef3a-4617-96e5-a2820e6c65d5", direction: "inbound", content: "hdj", sender: null, timestamp: "2026-03-29T07:01:45.492Z", meta: null },
  { id: "a2543d4e-67d1-4339-ab58-1e3ef803f043", message_id: "c88ea8d2-fe1a-49c7-9f6b-32172186ed14", direction: "inbound", content: "878877", sender: null, timestamp: "2026-03-29T07:02:00.238Z", meta: null },
  { id: "46c7872f-246b-4d3c-928a-1b4f1c25202c", message_id: "74c97e6e-d04f-4730-a9a0-06ba5f51d143", direction: "outbound", content: "hfj", sender: null, timestamp: "2026-03-29T08:19:54.293Z", meta: null },
  { id: "d720d9d4-a587-40a3-b8cb-d61f427886d9", message_id: "ae9effd4-5f0d-405b-8baa-f83a03e4bbc9", direction: "outbound", content: "jh", sender: null, timestamp: "2026-03-29T08:21:23.553Z", meta: null },
  { id: "df33b4cf-bc04-4fb9-9bc4-288c5d15d196", message_id: "web-1774772661927-2st2r4tht0h", direction: "inbound", content: "ds", sender: null, timestamp: "2026-03-29T08:32:11.427Z", meta: null },
  { id: "dc13dad2-41b6-49d1-9633-1c78ea5d5950", message_id: "web-1774772661927-2st2r4tht0h", direction: "inbound", content: "hi", sender: null, timestamp: "2026-03-29T08:32:18.407Z", meta: null },
  { id: "06b99354-f649-49d6-8d43-edd7fca57e73", message_id: "web-1774783217385-cpq82kztwk", direction: "inbound", content: "Hello! Which AI model are you using?", sender: null, timestamp: "2026-03-29T11:21:57.086Z", meta: null },
  { id: "6811a8d6-d3a5-4e47-bc15-1547afa67538", message_id: "web-1774783217385-cpq82kztwk", direction: "bot", content: "Hello! 👋 Welcome to Brilliant System Solutions!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?", sender: null, timestamp: "2026-03-29T11:21:57.101Z", meta: '{"source":"faq"}' },
  { id: "c141420d-21ea-4b7b-8af7-c6e034363454", message_id: "web-1774785579630-srkzhsglf3", direction: "inbound", content: "hi", sender: null, timestamp: "2026-03-29T12:04:32.232Z", meta: null },
  { id: "9de91aa5-7b8c-4129-b0e6-6ed860a273d9", message_id: "8542107b-2b33-41d2-924f-35e14089a124", direction: "outbound", content: "hi", sender: null, timestamp: "2026-03-29T12:49:41.983Z", meta: null },
  { id: "e371acb9-0c99-4a93-bee9-05f3995eeb36", message_id: "web-1774788222165-kvnb8vwdllj", direction: "inbound", content: "bx", sender: null, timestamp: "2026-03-29T12:49:58.000Z", meta: null },
  { id: "4273ad1b-977f-4fd7-ae14-cfb94f220dca", message_id: "web-1774788222165-kvnb8vwdllj", direction: "bot", content: "I'd love to help! Could you tell me more about what you're looking for?\n\nFor example:\n• \"Tell me about HR software\"\n• \"What is the price of BSOL?\"\n• \"I need a demo\"\n• \"Contact information\"\n\nOr reach us directly:\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9489477144\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-29T12:49:58.207Z", meta: '{"source":"fallback"}' },
  { id: "0edf58b6-282f-4b3c-8c27-38e491ae23b6", message_id: "web-1774788620634-6dalfr9vfzi", direction: "inbound", content: "hi", sender: null, timestamp: "2026-03-29T12:50:25.688Z", meta: null },
  { id: "10da3233-7e21-4d74-a912-1d2b46db7436", message_id: "web-1774788620634-6dalfr9vfzi", direction: "inbound", content: "fg", sender: null, timestamp: "2026-03-29T12:50:37.678Z", meta: null },
  { id: "bb781ede-4583-4785-87db-8fd31374345f", message_id: "web-1774788620634-6dalfr9vfzi", direction: "bot", content: "I'd love to help! Could you tell me more about what you're looking for?\n\nFor example:\n• \"Tell me about HR software\"\n• \"What is the price of BSOL?\"\n• \"I need a demo\"\n• \"Contact information\"\n\nOr reach us directly:\n\n📧 prasannaprobiz@gmail.com\n📱 WhatsApp: 9489477144\n📞 +91-452 238 7388", sender: null, timestamp: "2026-03-29T12:50:37.681Z", meta: '{"source":"fallback"}' },
  { id: "f87e52c1-5493-488b-812e-71616f248626", message_id: "web-1774788620634-6dalfr9vfzi", direction: "inbound", content: "hi", sender: null, timestamp: "2026-03-29T12:50:41.218Z", meta: null },
  { id: "ec137a3d-6fb5-4454-96af-6027ef505c19", message_id: "web-1774788620634-6dalfr9vfzi", direction: "bot", content: "Hello! 👋 Welcome to Brilliant System Solutions!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?", sender: null, timestamp: "2026-03-29T12:50:41.219Z", meta: '{"source":"faq"}' },
  { id: "be533b28-3f12-4cab-af0b-25b3cce32bac", message_id: "web-1774796985032-xcgh2p5e47p", direction: "inbound", content: "hi", sender: null, timestamp: "2026-03-29T15:15:32.625Z", meta: null },
  { id: "dc78cd16-4b7e-491c-bc74-daf8f4cb596d", message_id: "web-1774796985032-xcgh2p5e47p", direction: "bot", content: "Hello! 👋 Welcome to Brilliant System Solutions!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?", sender: null, timestamp: "2026-03-29T15:15:32.629Z", meta: '{"source":"faq"}' },
  { id: "79a5df15-9a0a-4dc2-a957-3c10f856e9dd", message_id: "5dfab308-5caa-412a-9dfc-884aca735074", direction: "outbound", content: "hi", sender: null, timestamp: "2026-03-29T15:15:43.114Z", meta: null },
  { id: "8439e6bf-166d-4325-b951-fa1cc83beadd", message_id: "web-1774796985032-xcgh2p5e47p", direction: "inbound", content: "hi two", sender: null, timestamp: "2026-03-29T15:15:52.344Z", meta: null },
  { id: "9ea0e860-e3e7-4edd-84cd-e3b1ec029b71", message_id: "7de47730-fba6-487d-8f8d-9fe98cfcf884", direction: "outbound", content: "khekle", sender: null, timestamp: "2026-03-29T15:17:11.113Z", meta: null },
]);

export { db, randomUUID as uuid };

