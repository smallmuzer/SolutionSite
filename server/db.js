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
    company_name TEXT NOT NULL DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    site_name TEXT NOT NULL DEFAULT '',
    site_url TEXT DEFAULT '',
    site_logo TEXT NOT NULL DEFAULT '/logo.png',
    site_favicon TEXT NOT NULL DEFAULT '/favicon.ico',
    whatsapp_number TEXT DEFAULT '',
    viber_number TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    contact_phone TEXT DEFAULT '',
    google_analytics_id TEXT DEFAULT '',
    microsoft_clarity_id TEXT DEFAULT '',
    contact_from_email TEXT DEFAULT '',
    hr_email TEXT DEFAULT '',
    smtp_host TEXT DEFAULT '',
    smtp_port TEXT DEFAULT '',
    smtp_user TEXT DEFAULT '',
    smtp_pass TEXT DEFAULT '',
    chatbot_enabled TEXT DEFAULT 'false',
    chatbot_script_url TEXT DEFAULT '',
    chatbot_api_key TEXT DEFAULT '',
    chatbot_title TEXT DEFAULT '',
    chatbot_subtitle TEXT DEFAULT '',
    chatbot_accent TEXT DEFAULT '',
    chatbot_accent2 TEXT DEFAULT '',
    chatbot_bot_bubble TEXT DEFAULT '',
    chatbot_user_color TEXT DEFAULT '',
    chatbot_position TEXT DEFAULT '',
    chatbot_btn_size TEXT DEFAULT '',
    overall_bot_visible TEXT DEFAULT 'true',
    theme TEXT DEFAULT 'light',
    font_style TEXT DEFAULT '',
    header_font_family TEXT DEFAULT '',
    font_size TEXT DEFAULT '',
    card_style TEXT DEFAULT '',
    accent_color TEXT DEFAULT '',
    global_view TEXT DEFAULT '',
    nav_items TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS social_links (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    icon TEXT NOT NULL,
    url TEXT NOT NULL,
    color TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
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
    more_info_label TEXT,
    demo_label TEXT,
    contact_url TEXT NOT NULL DEFAULT '#contact',
    demo_url TEXT,
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

  CREATE TABLE IF NOT EXISTS global_presence (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL DEFAULT 0,
    lng REAL NOT NULL DEFAULT 0,
    clients TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    flag TEXT NOT NULL DEFAULT '',
    landmark TEXT NOT NULL DEFAULT '',
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS our_network (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    desc TEXT NOT NULL DEFAULT '',
    href TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL DEFAULT '',
    flag TEXT NOT NULL DEFAULT '',
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

try {
  // Drop user_roles table if it exists
  db.exec("DROP TABLE IF EXISTS user_roles;");

  const settingsCols = db.prepare("PRAGMA table_info(site_settings)").all().map(c => c.name);
  if (!settingsCols.includes("site_url")) {
    db.exec("ALTER TABLE site_settings ADD COLUMN site_url TEXT DEFAULT '';");
  }
  if (!settingsCols.includes("header_font_family")) {
    db.exec("ALTER TABLE site_settings ADD COLUMN header_font_family TEXT DEFAULT '';");
  }
  if (!settingsCols.includes("overall_bot_visible")) {
    db.exec("ALTER TABLE site_settings ADD COLUMN overall_bot_visible TEXT DEFAULT 'true';");
  }
  if (!settingsCols.includes("site_favicon")) {
    db.exec("ALTER TABLE site_settings ADD COLUMN site_favicon TEXT DEFAULT '/favicon.ico';");
  }

  const testCols = db.prepare("PRAGMA table_info(testimonials)").all().map(c => c.name);
  if (!testCols.includes("sort_order")) {
    db.exec("ALTER TABLE testimonials ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");
    // Initialize sort_order based on created_at
    const tests = db.prepare("SELECT id FROM testimonials ORDER BY created_at ASC").all();
    const updateStmt = db.prepare("UPDATE testimonials SET sort_order = ? WHERE id = ?");
    db.transaction(() => {
      tests.forEach((t, i) => updateStmt.run(i, t.id));
    })();
  }
  if (!testCols.includes("company_name")) {
    db.exec("ALTER TABLE testimonials ADD COLUMN company_name TEXT NOT NULL DEFAULT '';");
  }

  // Add extra_text / extra_color / more_info_label / demo_label to products if missing
  const prodCols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  if (!prodCols.includes("extra_text")) db.exec("ALTER TABLE products ADD COLUMN extra_text TEXT;");
  if (!prodCols.includes("extra_color")) db.exec("ALTER TABLE products ADD COLUMN extra_color TEXT;");
  if (!prodCols.includes("more_info_label")) db.exec("ALTER TABLE products ADD COLUMN more_info_label TEXT;");
  if (!prodCols.includes("demo_label")) db.exec("ALTER TABLE products ADD COLUMN demo_label TEXT;");

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
    { title_like: "%Software%", icon: "Code" },
    { title_like: "%Web%", icon: "Globe" },
    { title_like: "%Mobile%", icon: "Smartphone" },
    { title_like: "%ERP%", icon: "Database" },
    { title_like: "%HR%", icon: "Users" },
    { title_like: "%Consulting%", icon: "Briefcase" },
    { title_like: "%SEO%", icon: "Search" },
    { title_like: "%Design%", icon: "Palette" },
    { title_like: "%Cloud%", icon: "Cloud" },
    { title_like: "%Security%", icon: "Shield" },
    { title_like: "%Marketing%", icon: "Megaphone" },
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
    { title_like: "%Developer%", icon: "Code2" },
    { title_like: "%Engineer%", icon: "Code2" },
    { title_like: "%Software%", icon: "Code2" },
    { title_like: "%Mobile%", icon: "Smartphone" },
    { title_like: "%Design%", icon: "Palette" },
    { title_like: "%UI%", icon: "Palette" },
    { title_like: "%UX%", icon: "Palette" },
    { title_like: "%HR%", icon: "Users" },
    { title_like: "%Payroll%", icon: "Users" },
    { title_like: "%Marketing%", icon: "TrendingUp" },
    { title_like: "%SEO%", icon: "Search" },
    { title_like: "%Data%", icon: "BarChart2" },
    { title_like: "%Analyst%", icon: "BarChart2" },
    { title_like: "%Business%", icon: "Briefcase" },
    { title_like: "%Sales%", icon: "Briefcase" },
    { title_like: "%Executive%", icon: "Briefcase" },
    { title_like: "%Manager%", icon: "Briefcase" },
    { title_like: "%Cloud%", icon: "Cloud" },
    { title_like: "%DevOps%", icon: "Server" },
    { title_like: "%Security%", icon: "Shield" },
    { title_like: "%Support%", icon: "Headphones" },
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

  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes("is_active")) db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;");

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
  // Auto-patching colors removed to avoid overwriting user settings.

  // Hero Stats: add suffix column if missing
  const heroStatsCols = db.prepare("PRAGMA table_info(hero_stats)").all().map(c => c.name);
  if (!heroStatsCols.includes("suffix")) {
    db.exec("ALTER TABLE hero_stats ADD COLUMN suffix TEXT NOT NULL DEFAULT '+';");
    db.prepare("UPDATE hero_stats SET suffix='%' WHERE sort_order = 2").run();
    console.log('[db] Migration: added suffix column to hero_stats.');
  }

  // Products: add demo_url column if missing
  const productCols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  if (!productCols.includes("demo_url")) {
    db.exec("ALTER TABLE products ADD COLUMN demo_url TEXT;");
    console.log('[db] Migration: added demo_url column to products.');
  }

  // Hero Stats: clean duplicates and seed correctly
  const heroStatsRows = db.prepare("SELECT COUNT(*) as c FROM hero_stats").get().c;
  const heroStatsDupes = db.prepare("SELECT sort_order, COUNT(*) as c FROM hero_stats GROUP BY sort_order HAVING c > 1").all();
  if (heroStatsRows === 0 || heroStatsDupes.length > 0) {
    db.prepare("DELETE FROM hero_stats").run();
    const heroRow = db.prepare("SELECT content FROM site_content WHERE section_key = 'hero'").get();
    const hc = heroRow ? JSON.parse(heroRow.content) : {};
    const cleanStats = [
      { id: 'hs-1', count: hc.stats_projects_count || '300', suffix: '+', label: hc.stats_projects_label || 'Projects Completed', color: 'gradient', is_visible: 1, sort_order: 0 },
      { id: 'hs-2', count: hc.stats_clients_count || '50', suffix: '+', label: hc.stats_clients_label || 'Happy Clients', color: 'gradient', is_visible: 1, sort_order: 1 },
      { id: 'hs-3', count: hc.stats_satisfaction_count || '100', suffix: '%', label: hc.stats_satisfaction_label || 'Client Satisfaction', color: 'gradient', is_visible: 1, sort_order: 2 },
    ];
    const ins = db.prepare('INSERT INTO hero_stats (id,count,suffix,label,color,is_visible,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
    const now = new Date().toISOString();
    cleanStats.forEach(s => ins.run(s.id, s.count, s.suffix, s.label, s.color, s.is_visible, s.sort_order, now, now));
    console.log('[db] Seeded/fixed hero_stats: 3 rows.');
  }

  // Migrate global_presence JSON to global_presence table
  const presenceCount = db.prepare("SELECT COUNT(*) as c FROM global_presence").get().c;
  if (presenceCount === 0) {
    const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'global_presence'").get();
    if (row && row.content) {
      try {
        const parsed = JSON.parse(row.content);
        if (parsed.locations && Array.isArray(parsed.locations)) {
          const insertLoc = db.prepare("INSERT INTO global_presence (id, name, lat, lng, clients, description, flag, landmark, is_visible, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
          db.transaction(() => {
            parsed.locations.forEach((loc, idx) => {
              const locId = 'loc-' + Date.now() + '-' + idx;
              insertLoc.run(locId, loc.name || '', loc.lat || 0, loc.lng || 0, loc.clients || '', loc.description || '', loc.flag || '', loc.landmark || '', loc.is_visible !== false ? 1 : 0, idx, new Date().toISOString(), new Date().toISOString());
            });
          })();
        }
      } catch (e) { console.error("Failed to migrate global_presence", e); }
    }
  }

  // Migrate our_network JSON to our_network table
  const networkCount = db.prepare("SELECT COUNT(*) as c FROM our_network").get().c;
  if (networkCount === 0) {
    const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'our_network'").get();
    if (row && row.content) {
      try {
        const parsed = JSON.parse(row.content);
        if (parsed.companies && Array.isArray(parsed.companies)) {
          const insertNet = db.prepare("INSERT INTO our_network (id, name, subtitle, desc, href, logo_url, accent, flag, is_visible, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
          db.transaction(() => {
            parsed.companies.forEach((comp, idx) => {
              const compId = comp.id || 'comp-' + Date.now() + '-' + idx;
              insertNet.run(compId, comp.name || '', comp.subtitle || '', comp.desc || '', comp.href || '', comp.logo_url || '', comp.accent || '', comp.flag || '', comp.is_visible !== false ? 1 : 0, idx, new Date().toISOString(), new Date().toISOString());
            });
          })();
        }
      } catch (e) { console.error("Failed to migrate our_network", e); }
    }
  }



} catch (e) { console.error("[db] Migration error:", e.message); }

// â”€â”€ Seed data (only if tables are empty) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const t0 = new Date().toISOString();

function seedIfEmpty(table, rows) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  if (count === 0) seedData(table, rows, "id", "1=0");
}

function seedData(table, rows, conflictKey = "id", updateCondition = null) {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const placeholders = keys.map(() => "?").join(", ");

  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

  let condition = updateCondition;
  if (!condition) {
    if (cols.includes("created_at") && cols.includes("updated_at")) {
      condition = `${table}.updated_at = ${table}.created_at OR ${table}.updated_at IS NULL`;
    } else if (cols.includes("updated_by")) {
      condition = `${table}.updated_by IS NULL`;
    }
  }

  const sql = `INSERT OR IGNORE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);
  const insertMany = db.transaction((items) => {
    let affected = 0;
    for (const item of items) {
      const res = stmt.run(Object.values(item));
      affected += res.changes;
    }
    return affected;
  });

  const changes = insertMany(rows);
  if (changes > 0) console.log(`[db] Processed ${table}: ${changes} rows affected (inserted/updated)`);
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
  { id: "tst-1", name: "Ahmed Rasheed", company: "CTO", company_name: "Villa Group", message: "Systems Solutions transformed our operations with their ERP system. The team was professional, responsive, and delivered exactly what we needed.", avatar_url: "/assets/testimonials/ahmed.jpg", rating: 5, is_visible: 1, created_at: t0, updated_at: t0 },
  { id: "tst-2", name: "Fatima Zahir", company: "Director", company_name: "OBLU Resorts", message: "Their web development team built us a stunning booking platform. Traffic and conversions have increased significantly since launch.", avatar_url: "/assets/testimonials/fatima.jpg", rating: 5, is_visible: 1, created_at: t0, updated_at: t0 },
  { id: "tst-3", name: "Dorji Wangchuk", company: "Manager", company_name: "RCSC Bhutan", message: "Excellent consulting services. They understood our requirements perfectly and delivered a robust HR system on time and within budget.", avatar_url: "/assets/testimonials/dorji.jpg", rating: 5, is_visible: 1, created_at: t0, updated_at: t0 },
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
    // Parse nav_items if stored as a JSON string (backward compat)
    if (typeof c.nav_items === 'string') {
      try { c.nav_items = JSON.parse(c.nav_items); dirty = true; } catch { c.nav_items = null; }
    }
    if (!Array.isArray(c.nav_items) || c.nav_items.length === 0) {
      c.nav_items = [
        { label: 'Home', href: '#home' },
        { label: 'About', href: '#about' },
        { label: 'Services', href: '#services' },
        { label: 'Products', href: '#products' },
        { label: 'Portfolio', href: '#portfolio' },
        { label: 'Technologies', href: '#technologies' },
        { label: 'Careers', href: '#careers' },
        { label: 'Contact', href: '#contact' },
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

const siteSettingsSeeds = [
  {
    id: "settings",
    site_name: "Systems Solutions",
    site_url: "http://beta.solutions.com.mv",
    site_logo: "/logo.png",
    contact_email: "info@solutions.com.mv",
    contact_phone: "+960 301-1355",
    nav_items: JSON.stringify([
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Services', href: '#services' },
      { label: 'Products', href: '#products' },
      { label: 'Portfolio', href: '#portfolio' },
      { label: 'Technologies', href: '#technologies' },
      { label: 'Careers', href: '#careers' },
      { label: 'Contact', href: '#contact' },
    ]),
    created_at: t0, updated_at: t0
  }
];
seedIfEmpty("site_settings", siteSettingsSeeds);

const socialLinksSeeds = [
  { id: "sl-1", platform: "Facebook", icon: "Facebook", url: "https://www.facebook.com/brilliantsystemssolutions/", color: "#1877F2", is_visible: 1, sort_order: 0, created_at: t0, updated_at: t0 },
  { id: "sl-2", platform: "Twitter", icon: "Twitter", url: "https://x.com/bsspl_india", color: "#1DA1F2", is_visible: 1, sort_order: 1, created_at: t0, updated_at: t0 },
  { id: "sl-3", platform: "LinkedIn", icon: "Linkedin", url: "https://in.linkedin.com/company/brilliantsystemssolutions", color: "#0A66C2", is_visible: 1, sort_order: 2, created_at: t0, updated_at: t0 },
  { id: "sl-4", platform: "Instagram", icon: "Instagram", url: "https://www.instagram.com/brilliantsystemssolutions", color: "#E4405F", is_visible: 1, sort_order: 3, created_at: t0, updated_at: t0 },
  { id: "sl-5", platform: "Viber", icon: "Viber", url: "viber://chat?number=", color: "#7360f2", is_visible: 1, sort_order: 4, created_at: t0, updated_at: t0 },
  { id: "sl-6", platform: "WhatsApp", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-whatsapp"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`, url: "https://wa.me/9603011355", color: "#25D366", is_visible: 1, sort_order: 5, created_at: t0, updated_at: t0 }
];
seedIfEmpty("social_links", socialLinksSeeds);

const siteContentSeeds = [
  {
    section_key: "hero", content: JSON.stringify({
      title: "Leading IT Solutions Company in Maldives",
      subtitle: "Transform your business with cutting-edge technology solutions.",
      cta_text: "Get Started",
      badge: "Maldives' Leading IT Solutions Partner",
      hero_images: "/assets/uploads/whiteland5.jpg,/assets/uploads/Maldives.png",
      hero_image: "/assets/uploads/modern_hero_glass_1775323942548.webp"
    })
  },
  {
    section_key: "about", content: JSON.stringify({
      title: "Driving Digital Transformation",
      description: "Systems Solutions Pvt Ltd is a tech-leading IT consulting and software development company in the Digital Era!",
      vision: "Our journey began out of the passion for a unique position in the industry.",
      card_mission: "Deliver innovative technology solutions that transform businesses.",
      card_team: "Expert developers, designers, and consultants dedicated to your success.",
      card_quality: "Every solution we build meets the highest standards of performance.",
      card_global: "Serving clients across Maldives, Bhutan, and beyond.",
      card_mission_image: "/assets/uploads/white_designer_1775410426535.png",
      card_team_image: "/assets/uploads/white_dev_1775409804566.png",
      card_quality_image: "/assets/uploads/white_business_1775409832581.png",
      card_global_image: "/assets/uploads/CloudInfra_1775027818619.png"
    })
  },
  {
    section_key: "contact", content: JSON.stringify({
      title: "Get In Touch",
      subtitle: "Ready to transform your business? Contact us today.",
      address: "Alia Building, 7th Floor\nGandhakoalhi Magu\nMalé, Maldives",
      email: "info@solutions.com.mv",
      phone: "+960 301-1355",
      landline: "+91-452 238 7388",
      hours: "Sun–Thu: 9AM–6PM\\nSat: 9AM–1PM",
      facebook: "https://www.facebook.com/brilliantsystemssolutions/",
      twitter: "https://x.com/bsspl_india",
      linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
      instagram: "https://www.instagram.com/brilliantsystemssolutions"
    })
  },
  {
    section_key: "footer", content: JSON.stringify({
      copyright: `© 2026 Systems Solutions Pvt Ltd. All rights reserved.`,
      tagline: "Leading IT consulting and software development company delivering cutting-edge technology solutions.",
      facebook: "https://www.facebook.com/brilliantsystemssolutions/",
      twitter: "https://x.com/bsspl_india",
      linkedin: "https://in.linkedin.com/company/brilliantsystemssolutions",
      instagram: "https://www.instagram.com/brilliantsystemssolutions"
    })
  },
  {
    section_key: "clients", content: JSON.stringify({
      badge: "Our Clients", title: "Trusted by", highlight: "Industry Leaders",
      description: "We're proud to have served over 300+ successful projects for leading companies across the Maldives and beyond."
    })
  },
  { section_key: "services", content: JSON.stringify({ title: "Services & Solutions We Deliver", subtitle: "Team up with the perfect digital partner for all your technical needs to achieve your business goals, reduce costs and accelerate growth." }) },
  { section_key: "testimonials", content: JSON.stringify({ badge: "Testimonials", title: "What Our", highlight: "Clients Say" }) },
  { section_key: "careers", content: JSON.stringify({ badge: "Careers", title: "Join Our", highlight: "Team", description: "Be part of a dynamic team building cutting-edge technology solutions for clients worldwide." }) },
  { section_key: "technologies", content: JSON.stringify({ badge: "Our Stack", title: "Technologies", highlight: "We Use", description: "We leverage cutting-edge technologies to build robust, scalable, and future-proof solutions for our clients." }) },
];
const mappedSiteContentSeeds = siteContentSeeds.map(s => ({
  id: randomUUID(),
  section_key: s.section_key,
  content: s.content,
  created_at: t0,
  updated_at: t0
}));
seedIfEmpty("site_content", mappedSiteContentSeeds);

// User-managed table: Do not auto-seed 'technologies' to prevent overwriting user deletions

seedIfEmpty("users", [
  { id: "admin-local", email: "admin@solutions.com.mv", password: "Admin@1234", userrole: "admin", created_at: t0, updated_at: t0 }
]);

seedIfEmpty("contact_submissions", []);
seedIfEmpty("submission_replies", []);
seedIfEmpty("job_applications", []);
seedIfEmpty("application_replies", []);
seedIfEmpty("chat_messages", []);
seedIfEmpty("chat_threads", []);

export { db, randomUUID as uuid };

