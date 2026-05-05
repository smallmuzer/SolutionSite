import express from "express";
import cors from "cors";
import multer from "multer";
import { join, dirname, basename, extname, resolve } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync, appendFileSync, readdirSync, unlinkSync } from "fs";
import { db, uuid, DB_PATH } from "./db.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { EventEmitter } from "events";
import { createServer } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("etag", false);
app.set("etag", false);
app.disable("x-powered-by");
app.disable("etag");
const server = createServer(app);
const PORT = 4001;

const CACHE_CONTROL_NO_CACHE = "no-cache, no-store, must-revalidate, private, max-age=0";
const CACHE_CONTROL_PUBLIC = "public, max-age=0, must-revalidate, no-cache";
 
 

function setNoCache(res) {
  res.setHeader("Cache-Control", CACHE_CONTROL_NO_CACHE);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.removeHeader("Last-Modified");
  res.removeHeader("ETag");
  res.setHeader("Vary", "*");
}

const TRUSTED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:4001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4001",
  "http://syssolution",
  "https://syssolution",
]);

const SAFE_TABLES = new Set([
  "contact_submissions", "job_applications", "services", "testimonials", "career_jobs",
  "products", "client_logos", "site_content", "seo_settings", "users", "chat_threads",
  "chat_messages", "submission_replies", "application_replies", "appointments", "hero_stats",
  "technologies"
]);

app.use(cors({ origin: Array.from(TRUSTED_ORIGINS), credentials: true }));
app.use(express.json({ limit: "30mb" }));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    // Strip conditional headers so server never returns 304 for API calls
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    delete req.headers["if-match"];
    delete req.headers["if-unmodified-since"];
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, private, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.removeHeader("Last-Modified");
    res.removeHeader("ETag");
  }
  next();
});


let secCache = { data: {}, lastFetch: 0 };
function getSecuritySettings() {
  const now = Date.now();
  if (now - secCache.lastFetch < 10000) return secCache.data;
  try {
    const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'security'").get();
    secCache = { data: row && row.content ? JSON.parse(row.content) : {}, lastFetch: now };
    return secCache.data;
  } catch (e) {
    return secCache.data;
  }
}

const requestCounts = new Map();
setInterval(() => requestCounts.clear(), 30000);

app.use((req, res, next) => {
  const sec = getSecuritySettings();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";

  if (sec.ip_logging && req.url.startsWith("/api")) {
    try {
      appendFileSync(join(__dirname, "server.log"), `${new Date().toISOString()} [security.ip_activity] ${JSON.stringify({ ip, method: req.method, url: req.url })}\n`);
    } catch { }
  }

  if (sec.content_security) {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (sec.rate_limiting && req.url.startsWith("/api")) {
    const count = (requestCounts.get(ip) || 0) + 1;
    requestCounts.set(ip, count);
    if (count > 200) {
      return res.status(429).json({ error: { message: "Rate limit exceeded" }, data: null });
    }
  }

  if (sec.cors_protection && req.headers.origin) {
    if (TRUSTED_ORIGINS.has(req.headers.origin)) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Vary", "Origin");
    }
  }

  next();
});

function isTrustedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return TRUSTED_ORIGINS.has(url.origin);
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const mutatingMethods = ["POST", "PATCH", "PUT", "DELETE"];
  if (!mutatingMethods.includes(req.method) || req.path.startsWith("/api/webhook") || req.path.startsWith("/api/health")) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // No origin = proxied request from Vite dev server — allow it
  if (!origin) return next();
  if (isTrustedOrigin(origin)) return next();
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (isTrustedOrigin(refererOrigin)) return next();
    } catch { }
  }

  res.status(403).json({ data: null, error: { message: "CSRF protection: untrusted origin" } });
});

// ── File uploads ──────────────────────────────────────────────────────────────
const PUBLIC_ASSETS = join(__dirname, "../public/assets");
const UPLOADS_DIR = join(PUBLIC_ASSETS, "uploads");
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_FOLDERS = ["uploads"];
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

function resolveAssetTarget(requestedPath = "") {
  const rawPath = String(requestedPath || "").replace(/\\/g, "/").trim();
  const parts = rawPath.split("/").filter(Boolean);
  const requestedName = basename(parts.length ? parts.join("/") : "upload.jpg");
  const rawExt = extname(requestedName).toLowerCase();
  const extension = ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : ".jpg";
  const safeBase = basename(requestedName, rawExt || extname(requestedName))
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "file";
  const filename = `${safeBase}${extension}`;
  const dir = UPLOADS_DIR;
  return { folder: "uploads", dir, filename };
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { dir } = resolveAssetTarget(req.body?.path);
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const original = String(file.originalname || "upload.jpg");
    const requestedPath = String(req.body?.path || original);
    const target = resolveAssetTarget(requestedPath.includes("/") ? requestedPath : `uploads/${original}`);
    cb(null, target.filename);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(String(file.originalname || "")).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.has(ext) || !String(file.mimetype || "").startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

app.get("/api/assets", (req, res) => {
  try {
    const folder = "uploads";
    const dir = join(PUBLIC_ASSETS, folder);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const files = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        name: entry.name,
        publicUrl: `/assets/uploads/${entry.name}`.replace(/\/+/g, "/"),
      }))
      .filter((entry) => ALLOWED_IMAGE_EXTS.has(extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ data: { folder, files }, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: { message: e.message } });
  }
});

app.delete("/api/assets", (req, res) => {
  try {
    const { filename } = req.query;
    if (!filename) return res.status(400).json({ error: "filename required" });
    
    // Safety check: only allow deleting from uploads folder
    const safeName = basename(String(filename));
    const filePath = join(UPLOADS_DIR, safeName);
    
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      res.json({ data: { success: true }, error: null });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Auth ──────────────────────────────────────────────────────────────────────
// token → { id, email, userrole }
const SESSIONS = new Map();

const DEFAULT_SETTINGS = {
  site_name: "Brilliant System Solutions",
  whatsapp_number: "9489477144",
  viber_number: "9489477144",
  contact_email: "info@solutions.com.mv",
  contact_from_email: "",
  hr_email: "hr@company.com",
  demo_url: "https://demo.hrmetrics.mv/",
  bot_api_url: "",
  bot_api_token: "",
  ai_model: "gpt-4o-mini",
  site_logo: "/logo.png",
  show_tour: true,
};

// Bot/Human mode toggle (in-memory, resets on restart)
let botMode = "bot"; // "bot" | "human"

function getSettings() {
  try {
    const row = db.prepare("SELECT content FROM site_content WHERE section_key = 'settings'").get();
    return { ...DEFAULT_SETTINGS, ...(row ? JSON.parse(row.content) : {}) };
  } catch (e) {
    console.error("[settings] failed to load settings", e);
    return { ...DEFAULT_SETTINGS };
  }
}

function appendLog(kind, payload) {
  try {
    appendFileSync(join(__dirname, "server.log"), `${new Date().toISOString()} [${kind}] ${JSON.stringify(payload)}\n`);
  } catch { }
}

const bus = new EventEmitter();
function emitEvent(event, data) {
  bus.emit(event, data);
}

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare("SELECT id, email, password, userrole FROM users WHERE email = ?").get(email);
    const passwordValid = user && typeof user.password === "string" && typeof password === "string" &&
      user.password.length === password.length &&
      crypto.timingSafeEqual(Buffer.from(user.password), Buffer.from(password));
    if (passwordValid) {
      const token = uuid();
      SESSIONS.set(token, { id: user.id, email: user.email, userrole: user.userrole });
      return res.json({ data: { session: { access_token: token, user: { id: user.id, email: user.email, userrole: user.userrole } } }, error: null });
    }
  } catch (e) {
    console.error("[auth] Login error:", e);
  }

  res.status(401).json({ data: { session: null }, error: { message: "Invalid credentials" } });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) SESSIONS.delete(token);
  res.json({ error: null });
});

app.get("/api/auth/session", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = token && SESSIONS.get(token);
  if (user) {
    // Re-verify user still exists and is still admin in DB
    try {
      const dbUser = db.prepare("SELECT id, email, userrole FROM users WHERE id = ? AND userrole = 'admin'").get(user.id);
      if (dbUser) {
        return res.json({ data: { session: { access_token: token, user: { id: dbUser.id, email: dbUser.email, userrole: dbUser.userrole } } }, error: null });
      }
    } catch { }
    SESSIONS.delete(token);
  }
  res.json({ data: { session: null }, error: null });
});

// ── Generic table helpers ─────────────────────────────────────────────────────

const UNIQUE_COLS = { site_content: "section_key", seo_settings: "page_key" };

function now() { return new Date().toISOString(); }

function buildSelect(table, filters, orderCol, orderAsc) {
  if (!SAFE_TABLES.has(table)) throw new Error("Invalid table");
  const allowedCols = TABLE_COLS[table] || [];
  const safeFilters = filters.filter(f => allowedCols.includes(f.col));

  let sql = `SELECT * FROM ${table}`;
  const vals = [];

  if (safeFilters.length) {
    sql += " WHERE " + safeFilters.map(f => `${f.col} = ?`).join(" AND ");
    vals.push(...safeFilters.map(f => f.val));
  }
  if (orderCol) sql += ` ORDER BY ${orderCol} ${orderAsc ? "ASC" : "DESC"}`;
  return { sql, vals };
}

function isAllowedExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname)) return false;
    if (hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

async function sendWhatsAppMessage({ to, text, settings }) {
  if (!settings.bot_api_url || !isAllowedExternalUrl(settings.bot_api_url)) {
    return { status: "skipped", detail: "Invalid or unset bot_api_url" };
  }
  try {
    const res = await fetch(settings.bot_api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.bot_api_token ? { Authorization: `Bearer ${settings.bot_api_token}` } : {}),
      },
      body: JSON.stringify({ to, message: text }),
    });
    if (!res.ok) throw new Error(`Remote responded ${res.status}`);
    const json = await res.json().catch(() => ({}));
    return { status: "sent", detail: json };
  } catch (e) {
    appendLog("wa.error", { to, message: text, error: e?.message });
    return { status: "failed", detail: e?.message || "Unknown error" };
  }
}

function getLiveContext() {
  try {
    const products = db.prepare("SELECT name, tagline, description, extra_text FROM products WHERE is_visible = 1 ORDER BY sort_order ASC").all();
    const services = db.prepare("SELECT title, description FROM services WHERE is_visible = 1 ORDER BY sort_order ASC").all();
    const about = db.prepare("SELECT content FROM site_content WHERE section_key = 'about'").get();
    let ctx = "";
    if (products.length) {
      ctx += "\n\nOUR PRODUCTS:\n" + products.map(p => `- ${p.name}: ${p.tagline}. ${p.description}${p.extra_text ? " Features: " + p.extra_text : ""}`).join("\n");
    }
    if (services.length) {
      ctx += "\n\nOUR SERVICES:\n" + services.map(s => `- ${s.title}: ${s.description}`).join("\n");
    }
    if (about?.content) {
      try {
        const c = typeof about.content === "string" ? JSON.parse(about.content) : about.content;
        if (c?.intro) ctx += `\n\nABOUT US: ${c.intro}`;
      } catch { }
    }
    return ctx;
  } catch { return ""; }
}

async function generateBotReply(messages, settings) {
  const s = settings || getSettings();
  const lastUser = messages.filter(m => m.role === "user").pop();
  const userText = (lastUser?.content || "").trim();
  const lower = userText.toLowerCase();

  const siteName = s.site_name || "BSS";
  const liveCtx = getLiveContext();
  const systemPrompt = s.system_prompt && s.system_prompt.trim()
    ? s.system_prompt.trim() + liveCtx
    : `You are a friendly, helpful AI assistant for ${siteName}. Answer questions about our website, products, and services naturally and concisely. Always be helpful and route complex queries to the team.${liveCtx}`;

  appendLog("bot.request", { text: userText.substring(0, 80), model: s.ai_model || "default" });

  // ── 1. OpenAI-compatible API (OpenRouter, OpenAI, or custom) ──────────────
  const apiKey = s.openai_api_key || process.env.OPENAI_API_KEY || "";
  if (apiKey && apiKey.trim()) {
    // Determine base URL: OpenRouter key → openrouter.ai, else openai.com
    const isOpenRouter = apiKey.startsWith("sk-or-");
    const baseUrl = isOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = s.ai_model || (isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini");
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`,
          ...(isOpenRouter ? { "HTTP-Referer": "https://solutions.com.mv", "X-Title": siteName } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 600,
          temperature: 0.7,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const reply = json?.choices?.[0]?.message?.content;
      if (reply && reply.trim()) {
        appendLog("bot.success", { source: isOpenRouter ? "openrouter" : "openai", model });
        return { reply: reply.trim(), source: isOpenRouter ? "openrouter" : "openai" };
      }
      if (json?.error) appendLog("bot.api_error", { error: json.error?.message || json.error, model });
    } catch (e) {
      appendLog("bot.openai_error", { error: e?.message, model });
    }
  }

  // ── 2. Google Gemini ──────────────────────────────────────────────────────
  if (s.gemini_api_key && s.gemini_api_key.trim()) {
    try {
      const geminiModel = s.ai_model?.includes("/") ? "gemini-1.5-flash" : (s.ai_model || "gemini-1.5-flash");
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${s.gemini_api_key.trim()}`;
      const payload = {
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nUser: ${userText}` }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      };
      const res = await fetch(gUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        appendLog("bot.success", { source: "gemini", model: geminiModel });
        return { reply: reply.trim(), source: "gemini" };
      }
      if (json?.error) appendLog("bot.gemini_error", { error: json.error?.message || json.error });
    } catch (e) {
      appendLog("bot.gemini_error", { error: e?.message });
    }
  }

  // ── 3. Custom external bot API ────────────────────────────────────────────
  if (s.bot_api_url && isAllowedExternalUrl(s.bot_api_url)) {
    // Append /chat/completions if it looks like a base URL
    const endpoint = s.bot_api_url.endsWith("/chat/completions")
      ? s.bot_api_url
      : s.bot_api_url.replace(/\/$/, "") + "/chat/completions";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(s.bot_api_token ? { Authorization: `Bearer ${s.bot_api_token}` } : {}),
        },
        body: JSON.stringify({
          model: s.ai_model || "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 600,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const reply = json?.choices?.[0]?.message?.content || json?.reply;
      if (reply && reply.trim()) {
        appendLog("bot.success", { source: "custom", endpoint });
        return { reply: reply.trim(), source: "custom" };
      }
    } catch (e) {
      appendLog("bot.custom_error", { error: e?.message });
    }
  }

  // ── 4. FAQ keyword fallback (only when all AI calls fail) ─────────────────
  appendLog("bot.fallback", { reason: "all AI sources failed", text: userText.substring(0, 60) });
  const contact_info = `\n📧 ${s.contact_email || "info@solutions.com.mv"}\n📱 WhatsApp: ${s.whatsapp_number || "9603011355"}\n📞 ${s.landline || "+91-452 238 7388"}`;

  const rules = [
    {
      match: () => /^(hi+|hello|hey|good\s*(morning|afternoon|evening)|howdy|greetings)/i.test(lower),
      reply: `Hello! 👋 Welcome to ${siteName}!\n\nI can help you with:\n• HR & Payroll software (HR-Metrics)\n• ERP & CRM systems (BSOL)\n• Web & Mobile development\n• IT Consulting & Cloud\n• Pricing, demos & trials\n\nWhat can I help you with today?`
    },
    {
      match: () => /(hr.metric|hrmetric|hr software|payroll|attendance|leave|employee|performance|okr|workforce)/i.test(lower),
      reply: `**HR-Metrics** — Complete HR & Payroll platform:\n\n✅ Employee Management & Payroll\n✅ Attendance & Leave Tracking\n✅ Performance Reviews & KPIs\n✅ Cloud-based SaaS · 24/7 Support\n\n🎯 **15 Days Free Trial!**\n🔗 ${s.demo_url || "https://demo.hrmetrics.mv/"}${contact_info}`
    },
    {
      match: () => /(bsol|\berp\b|enterprise resource|inventory|procurement|accounting|crm|sales pipeline)/i.test(lower),
      reply: `**BSOL** — Flagship ERP + CRM platform:\n\n✅ Finance & Accounting\n✅ Inventory & Procurement\n✅ Sales Pipeline & CRM\n✅ Multi-branch & Multi-currency\n\n🎯 **15 Days Free Trial!**${contact_info}`
    },
    {
      match: () => /(price|cost|how much|pricing|quote|plan|subscription)/i.test(lower),
      reply: `Our pricing is flexible:\n\n💡 All products — 15 Days Free Trial\n☁️ Cloud SaaS subscription plans\n🏢 Custom enterprise pricing\n\nContact us for a quote:${contact_info}`
    },
    {
      match: () => /(demo|free trial|try|test|evaluation)/i.test(lower),
      reply: `🎯 **Try FREE for 15 Days!**\n\n🔗 HR-Metrics: ${s.demo_url || "https://demo.hrmetrics.mv/"}\n\nFor BSOL, GoBoat & PromisePro demos:${contact_info}`
    },
    {
      match: () => /(contact|reach|phone|email|whatsapp|address|office|location)/i.test(lower),
      reply: `📞 **Contact ${siteName}:**\n\n📧 ${s.contact_email || "info@solutions.com.mv"}\n📱 WhatsApp: ${s.whatsapp_number || "9603011355"}\n📱 Viber: ${s.viber_number || "9489477144"}\n📞 ${s.landline || "+91-452 238 7388"}\n\n🏢 Malé, Maldives · ⏰ Sun–Thu 9AM–6PM`
    },
    {
      match: () => /(career|job|hiring|vacancy|apply|join)/i.test(lower),
      reply: `🚀 **Join ${siteName}!**\n\nApply via our Careers section or:\n📧 ${s.hr_email || "hr@solutions.com.mv"}`
    },
    {
      match: () => /^(thank|thanks|thank you|thx|great|awesome|perfect)/i.test(lower),
      reply: "You're welcome! 😊 Is there anything else I can help you with?"
    },
    {
      match: () => /^(bye|goodbye|see you|later|take care)/i.test(lower),
      reply: "Goodbye! 👋 Feel free to reach out anytime. Have a great day!"
    },
  ];

  for (const rule of rules) {
    if (rule.match()) return { reply: rule.reply, source: "faq" };
  }

  // Final fallback
  const words = userText.split(/\s+/).length;
  const fallback = words <= 2
    ? `I'd love to help! Could you tell me more?\n\nOr reach us directly:${contact_info}`
    : `Thanks for your message! 🙏\n\nLet me connect you with our team:${contact_info}\n\n⏰ We respond within 24 hours on business days.`;
  return { reply: fallback, source: "fallback" };
}

// ── Email helpers ────────────────────────────────────────────────────────────

function createTransport(settings) {
  const host = settings.smtp_host || process.env.SMTP_HOST || "";
  const port = Number(settings.smtp_port || process.env.SMTP_PORT || 465);
  const user = settings.smtp_user || process.env.SMTP_USER || "";
  const pass = settings.smtp_pass || process.env.SMTP_PASS || "";
  const secure = port === 465;

  if (!host || !user || !pass) {
    console.log(`[email] SMTP not configured - host: ${!!host}, user: ${!!user}, pass: ${!!pass}`);
    appendLog("email.transport", { host: !!host, user: !!user, pass: !!pass, reason: "missing_credentials" });
    return null;
  }

  console.log(`[email] Creating transport: ${host}:${port} (SSL: ${secure}) as ${user}`);
  appendLog("email.transport", { host, port, secure, user });

  return nodemailer.createTransport({
    host, port, secure,
    auth: user ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });
}

function sendFallbackEmail({ subject, body, settings }) {
  const transport = createTransport(settings);
  if (!transport) {
    appendLog("email.skipped", { subject, reason: "smtp_not_configured" });
    return { queued: false, reason: "SMTP not configured" };
  }
  
  appendLog("email.queue", { subject, to: settings.hr_email });
  try {
    transport.sendMail({
      from: settings.smtp_user || settings.contact_from_email || "devteam.bss@gmail.com",
      to: settings.hr_email || settings.contact_email,
      subject,
      text: body,
    }).catch(err => appendLog("email.error", err?.message || err));
  } catch (e) {
    appendLog("email.error", e?.message || e);
  }
  return { queued: true };
}

async function sendEmailNow({ to, subject, text, html, settings }) {
  const transport = createTransport(settings);
  if (!transport) {
    console.warn(`[email] Cannot send email - SMTP not configured. To: ${to}, Subject: ${subject}`);
    appendLog("email.skipped", { to, subject, reason: "smtp_not_configured" });
    return { ok: false, error: "SMTP not configured" };
  }
  
  try {
    const from = settings.smtp_user || settings.contact_from_email || "devteam.bss@gmail.com";
    console.log(`[email] Sending to ${to} from ${from} (Subject: ${subject})`);
    await transport.sendMail({ from, to, subject, text, ...(html ? { html } : {}) });
    appendLog("email.sent", { to, from, subject });
    return { ok: true };
  } catch (e) {
    console.error("[email] Failed to send email", e);
    appendLog("email.error", { error: e?.message || e, to, subject });
    return { ok: false, error: e?.message };
  }
}

// ── Batch endpoint: /api/db/batch?tables=t1,t2&t1_order=sort_order&... ──────
app.get("/api/db/batch", (req, res) => {
  try {
    const tables = String(req.query.tables || "").split(",").map(t => t.trim()).filter(Boolean);
    if (!tables.length) return res.status(400).json({ data: null, error: { message: "tables param required" } });
    const result = {};
    for (const table of tables) {
      if (!SAFE_TABLES.has(table)) { result[table] = { data: [], error: "Invalid table" }; continue; }
      const orderCol = String(req.query[`${table}_order`] || "");
      const orderAsc = String(req.query[`${table}_asc`] || "true") !== "false";
      const filterStr = req.query[`${table}_filter`];
      const filters = [];
      if (filterStr) {
        try {
          const parsed = JSON.parse(filterStr);
          for (const [k, v] of Object.entries(parsed)) {
            const val = v === true || v === "true" ? 1 : v === false || v === "false" ? 0 : v;
            filters.push({ col: k, val });
          }
        } catch { }
      }
      const { sql, vals } = buildSelect(table, filters, orderCol, orderAsc);
      const rows = db.prepare(sql).all(...vals).map(r => normaliseRow(table, r));
      result[table] = { data: rows, error: null };
    }
    res.json({ data: result, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: { message: e.message } });
  }
});

// ── REST API: /api/db/:table ──────────────────────────────────────────────────

// SELECT
app.get("/api/db/:table", (req, res) => {
  try {
    const { table } = req.params;
    if (!SAFE_TABLES.has(table)) return res.status(400).json({ data: null, error: { message: "Invalid table" } });
    const filters = [];
    const allowedCols = TABLE_COLS[table] || [];

    let orderCol = String(req.query._order || "");
    let orderAsc = String(req.query._asc || "true") !== "false";

    // Support Supabase-style sorting: ?_order=created_at.desc
    if (orderCol.endsWith(".desc")) {
      orderCol = orderCol.slice(0, -5);
      orderAsc = false;
    } else if (orderCol.endsWith(".asc")) {
      orderCol = orderCol.slice(0, -4);
      orderAsc = true;
    }
    // Whitelist orderCol to only known safe column names (prevent SQL injection)
    const safeColPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (orderCol && (!safeColPattern.test(orderCol) || !allowedCols.includes(orderCol))) orderCol = "";

    const wantSingle = req.query._single === "1";

    for (const [k, v] of Object.entries(req.query)) {
      if (!k.startsWith("_")) {
        // coerce boolean strings to SQLite integers
        const val = v === "true" ? 1 : v === "false" ? 0 : v;
        filters.push({ col: k, val });
      }
    }

    const { sql, vals } = buildSelect(table, filters, orderCol, orderAsc);
    let rows = db.prepare(sql).all(...vals);
    rows = rows.map(r => normaliseRow(table, r));

    if (wantSingle) return res.json({ data: rows[0] ?? null, error: null });
    res.json({ data: rows, error: null });
  } catch (e) {
    console.error(`[db.get] Error fetching from ${req.params.table}:`, e);
    res.status(500).json({ data: null, error: { message: e.message } });
  }
});

// ── Known columns per table (prevents unknown-column errors) ─────────────────
const TABLE_COLS = {
  contact_submissions: ["id", "name", "full_name", "company_name", "email", "phone", "message", "status", "is_read", "website", "created_at"],
  job_applications: ["id", "applicant_name", "email", "phone", "job_id", "resume_url", "cover_letter", "status", "website", "created_at", "updated_at"],
  services: ["id", "title", "description", "image_url", "icon", "is_visible", "sort_order", "created_at", "updated_at"],
  testimonials: ["id", "name", "company", "message", "avatar_url", "rating", "is_visible", "created_at", "updated_at"],
  career_jobs: ["id", "title", "description", "location", "job_type", "image_url", "icon", "is_visible", "sort_order", "created_at", "updated_at"],
  products: ["id", "name", "tagline", "description", "image_url", "extra_text", "extra_color", "contact_url", "is_popular", "is_visible", "sort_order", "created_at", "updated_at"],
  client_logos: ["id", "name", "logo_url", "is_visible", "sort_order", "created_at", "updated_at"],
  site_content: ["id", "section_key", "content", "created_at", "updated_at"],
  seo_settings: ["id", "page_key", "title", "description", "keywords", "og_image", "updated_at", "updated_by"],
  users: ["id", "email", "password", "userrole", "created_at", "updated_at"],
  chat_messages: ["id", "session_id", "ip_address", "channel", "status", "created_at", "updated_at"],
  chat_threads: ["id", "message_id", "direction", "content", "sender", "timestamp", "meta"],
  submission_replies: ["id", "submission_id", "sender", "message", "created_at"],
  application_replies: ["id", "application_id", "sender", "message", "created_at"],
  appointments: ["id", "reference_type", "reference_id", "name", "email", "title", "description", "notes", "appointment_date", "created_at"],
  hero_stats: ["id", "count", "suffix", "label", "color", "is_visible", "sort_order", "created_at", "updated_at"],
  technologies: ["id", "name", "description", "image_url", "icon", "category", "name_color", "category_color", "is_visible", "sort_order", "created_at", "updated_at"],
};

function filterCols(table, row) {
  const allowed = TABLE_COLS[table];
  if (!allowed) return row;
  return Object.fromEntries(Object.entries(row).filter(([k]) => allowed.includes(k)));
}

// INSERT
app.post("/api/db/:table", (req, res) => {
  try {
    const { table } = req.params;
    const input = req.body;
    const uCol = UNIQUE_COLS[table];
    const row = {
      id: input.id || uuid(),
      created_at: input.created_at || now(),
      updated_at: now(),
      ...input,
    };

    if (table === "contact_submissions") {
      const email = String(row.email || "").trim();
      const message = String(row.message || "").trim();
      const fullName = String(row.full_name || row.name || "").trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ data: null, error: { message: "A valid email address is required." } });
      }
      if (!fullName) {
        return res.status(400).json({ data: null, error: { message: "Full name is required." } });
      }
      if (!message) {
        return res.status(400).json({ data: null, error: { message: "Message content is required." } });
      }
      row.email = email;
      row.message = message;
      row.full_name = fullName;
      row.status = row.status || "new";
    }

    if (table === "job_applications") {
      const email = String(row.email || "").trim();
      const applicantName = String(row.applicant_name || "").trim();
      const emailRegex = /^[^\s@]+@[^^\s@]+\.[^\s@]+$/;
      if (!applicantName) {
        return res.status(400).json({ data: null, error: { message: "Applicant name is required." } });
      }
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ data: null, error: { message: "A valid applicant email address is required." } });
      }
      row.email = email;
      row.applicant_name = applicantName;
      row.job_id = row.job_id || "General";
      row.status = row.status || "new";
    }

    const dbRow = filterCols(table, serialiseRow(table, row));

    if (uCol && dbRow[uCol] != null) {
      const existing = db.prepare(`SELECT id FROM ${table} WHERE ${uCol} = ?`).get(dbRow[uCol]);
      if (existing) {
        const sets = Object.keys(dbRow).filter(k => k !== "id").map(k => `${k} = ?`).join(", ");
        db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...Object.keys(dbRow).filter(k => k !== "id").map(k => dbRow[k]), existing.id);
        const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(existing.id);
        return res.json({ data: normaliseRow(table, updated), error: null });
      }
    }

    const keys = Object.keys(dbRow);
    db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).run(...keys.map(k => dbRow[k]));
    const inserted = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(dbRow.id);
    const normalised = normaliseRow(table, inserted);

    // Hooks for specific tables
    if (table === "contact_submissions") {
      // Honeypot spam check — if 'website' field is filled, it's a bot
      if (normalised.website) {
        appendLog("spam.blocked", { email: normalised.email });
        return res.json({ data: normalised, error: null });
      }
      emitEvent("submission", normalised);
      const settings = getSettings();
      const siteName = settings.site_name || "Brilliant System Solutions";
      // 1. Auto-reply to submitter
      sendEmailNow({
        to: normalised.email,
        subject: `Thank you for contacting ${siteName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
          <h2 style="color:#3b82f6;margin-bottom:8px">Thank you, ${normalised.full_name || normalised.name || "there"}!</h2>
          <p style="color:#374151">We've received your message and our team will get back to you within <strong>24 hours</strong>.</p>
          <div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:4px">
            <p style="margin:0;color:#6b7280;font-size:14px"><strong>Your message:</strong><br>${(normalised.message || "").replace(/\n/g, "<br>")}</p>
          </div>
          <p style="color:#374151">Best regards,<br><strong>${siteName} Team</strong></p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">${settings.contact_email || ""}</p>
        </div>`,
        text: `Thank you ${normalised.full_name || normalised.name || "there"}!\n\nWe've received your message and will get back to you within 24 hours.\n\nYour message: ${normalised.message}\n\nBest regards,\n${siteName} Team`,
        settings,
      });
      // 2. HR / admin notification
      const hrTo = settings.hr_email || settings.contact_email;
      if (hrTo) {
        sendEmailNow({
          to: hrTo,
          subject: `📩 New Contact: ${normalised.full_name || normalised.name || normalised.email}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
            <h2 style="color:#3b82f6">New Contact Form Submission</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#6b7280;width:120px">Name</td><td style="padding:6px 0;color:#111827;font-weight:600">${normalised.full_name || normalised.name || "N/A"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0"><a href="mailto:${normalised.email}" style="color:#3b82f6">${normalised.email}</a></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Phone</td><td style="padding:6px 0;color:#111827">${normalised.phone || "N/A"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Company</td><td style="padding:6px 0;color:#111827">${normalised.company_name || "N/A"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Submitted</td><td style="padding:6px 0;color:#111827">${new Date(normalised.created_at).toLocaleString()}</td></tr>
            </table>
            <div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:4px">
              <p style="margin:0;color:#374151;font-size:14px"><strong>Message:</strong><br>${(normalised.message || "").replace(/\n/g, "<br>")}</p>
            </div>
          </div>`,
          text: `New Contact Submission\n\nName: ${normalised.full_name || normalised.name || "N/A"}\nEmail: ${normalised.email}\nPhone: ${normalised.phone || "N/A"}\nCompany: ${normalised.company_name || "N/A"}\n\nMessage:\n${normalised.message}\n\nSubmitted: ${normalised.created_at}`,
          settings,
        });
      }
    }
    if (table === "job_applications") {
      // Honeypot spam check
      if (normalised.website) {
        appendLog("spam.blocked", { email: normalised.email });
        return res.json({ data: normalised, error: null });
      }
      emitEvent("application", normalised);
      const settings = getSettings();
      const siteName = settings.site_name || "Brilliant System Solutions";
      // 1. Auto-reply to applicant
      sendEmailNow({
        to: normalised.email,
        subject: `Application Received – ${normalised.job_id || "Position"} | ${siteName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
          <h2 style="color:#3b82f6">Application Received!</h2>
          <p style="color:#374151">Dear <strong>${normalised.applicant_name}</strong>,</p>
          <p style="color:#374151">Thank you for applying for <strong>${normalised.job_id || "the position"}</strong> at ${siteName}. Our HR team will review your application and contact you shortly.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px 16px;margin:16px 0;border-radius:4px;font-size:14px">
            <p style="margin:0 0 4px;color:#6b7280">Position: <strong style="color:#111827">${normalised.job_id || "N/A"}</strong></p>
            <p style="margin:0;color:#6b7280">Status: <strong style="color:#3b82f6">${normalised.status}</strong></p>
          </div>
          <p style="color:#374151">Best regards,<br><strong>HR Team – ${siteName}</strong></p>
          <p style="color:#9ca3af;font-size:12px">${settings.hr_email || settings.contact_email || ""}</p>
        </div>`,
        text: `Dear ${normalised.applicant_name},\n\nThank you for applying for "${normalised.job_id || "the position"}" at ${siteName}.\n\nOur HR team will review your application and contact you shortly.\n\nStatus: ${normalised.status}\n\nBest regards,\nHR Team – ${siteName}`,
        settings,
      });
      // 2. HR notification
      const hrTo = settings.hr_email || settings.contact_email;
      if (hrTo) {
        sendEmailNow({
          to: hrTo,
          subject: `💼 New Application: ${normalised.applicant_name} → ${normalised.job_id || "General"}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
            <h2 style="color:#3b82f6">New Job Application</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#6b7280;width:120px">Applicant</td><td style="padding:6px 0;color:#111827;font-weight:600">${normalised.applicant_name}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0"><a href="mailto:${normalised.email}" style="color:#3b82f6">${normalised.email}</a></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Phone</td><td style="padding:6px 0;color:#111827">${normalised.phone || "N/A"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Position</td><td style="padding:6px 0;color:#111827;font-weight:600">${normalised.job_id || "N/A"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Submitted</td><td style="padding:6px 0;color:#111827">${new Date(normalised.created_at).toLocaleString()}</td></tr>
            </table>
            ${normalised.cover_letter ? `<div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:4px"><p style="margin:0;color:#374151;font-size:14px"><strong>Cover Letter:</strong><br>${normalised.cover_letter.replace(/\n/g, "<br>")}</p></div>` : ""}
          </div>`,
          text: `New Job Application\n\nApplicant: ${normalised.applicant_name}\nEmail: ${normalised.email}\nPhone: ${normalised.phone || "N/A"}\nPosition: ${normalised.job_id || "N/A"}\n\nCover Letter:\n${normalised.cover_letter || "N/A"}\n\nSubmitted: ${normalised.created_at}`,
          settings,
        });
      }
    }
    if (table === "appointments") {
      emitEvent("appointment", normalised);
      const settings = getSettings();
      const siteName = settings.site_name || "Brilliant System Solutions";

      sendEmailNow({
        to: normalised.email,
        subject: `Appointment Scheduled | ${siteName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
          <h2 style="color:#3b82f6;margin-bottom:8px">Your appointment is confirmed</h2>
          <p style="color:#374151">Hello ${normalised.name || "there"},</p>
          <p style="color:#374151">Your appointment has been scheduled successfully. Here are the details:</p>
          <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:18px;margin:12px 0">
            <li><strong>Date & Time:</strong> ${new Date(normalised.appointment_date).toLocaleString()}</li>
            <li><strong>Title:</strong> ${normalised.title || "Appointment"}</li>
            <li><strong>Email:</strong> ${normalised.email}</li>
          </ul>
          ${normalised.description ? `<p style="color:#374151"><strong>Description:</strong><br>${normalised.description.replace(/\n/g, "<br>")}</p>` : ""}
          <p style="color:#374151">We will follow up with any updates shortly.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">${siteName} Team</p>
        </div>`,
        text: `Hello ${normalised.name || "there"},\n\nYour appointment has been scheduled successfully.\n\nDate & Time: ${new Date(normalised.appointment_date).toLocaleString()}\nTitle: ${normalised.title || "Appointment"}\nEmail: ${normalised.email}\n\n${normalised.description ? `Description:\n${normalised.description}\n\n` : ""}We will follow up with any updates shortly.\n\n${siteName} Team`,
        settings,
      });

      const adminTo = settings.hr_email || settings.contact_email;
      if (adminTo) {
        sendEmailNow({
          to: adminTo,
          subject: `📅 New Appointment Created | ${siteName}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
            <h2 style="color:#3b82f6;margin-bottom:8px">New appointment created</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#6b7280;width:130px">Name</td><td style="padding:6px 0;color:#111827;font-weight:600">${normalised.name}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0;color:#111827">${normalised.email}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Date</td><td style="padding:6px 0;color:#111827">${new Date(normalised.appointment_date).toLocaleString()}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Title</td><td style="padding:6px 0;color:#111827">${normalised.title || "Appointment"}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Reference</td><td style="padding:6px 0;color:#111827">${normalised.reference_type || "manual"}</td></tr>
            </table>
            ${normalised.description ? `<div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:4px"><p style="margin:0;color:#374151;font-size:14px"><strong>Description:</strong><br>${normalised.description.replace(/\n/g, "<br>")}</p></div>` : ""}
          </div>`,
          text: `New appointment created\n\nName: ${normalised.name}\nEmail: ${normalised.email}\nDate: ${new Date(normalised.appointment_date).toLocaleString()}\nTitle: ${normalised.title || "Appointment"}\nReference: ${normalised.reference_type || "manual"}\n\n${normalised.description ? `Description:\n${normalised.description}\n\n` : ""}`,
          settings,
        });
      }
    }

    res.json({ data: normalised, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: { message: e.message } });
  }
});

// UPDATE
app.patch("/api/db/:table", (req, res) => {
  try {
    const { table } = req.params;
    if (!SAFE_TABLES.has(table)) return res.status(400).json({ data: null, error: { message: "Invalid table" } });
    const allowedCols = TABLE_COLS[table] || [];
    const filters = [];
    for (const [k, v] of Object.entries(req.query)) {
      if (!k.startsWith("_") && allowedCols.includes(k)) {
        const val = v === "true" ? 1 : v === "false" ? 0 : v;
        filters.push({ col: k, val });
      }
    }
    if (!filters.length) return res.status(400).json({ data: null, error: { message: "No filters for update" } });

    const patch = { ...req.body, updated_at: now() };
    const dbPatch = Object.fromEntries(Object.entries(serialiseRow(table, patch)).filter(([k]) => allowedCols.includes(k)));

    const sets = Object.keys(dbPatch).map(k => `${k} = ?`).join(", ");
    const where = filters.map(f => `${f.col} = ?`).join(" AND ");
    db.prepare(`UPDATE ${table} SET ${sets} WHERE ${where}`).run(...Object.values(dbPatch), ...filters.map(f => f.val));

    const { sql, vals } = buildSelect(table, filters, "", true);
    const rows = db.prepare(sql).all(...vals).map(r => normaliseRow(table, r));
    res.json({ data: rows[0] ?? null, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: { message: e.message } });
  }
});

// DELETE
app.delete("/api/db/:table", (req, res) => {
  try {
    const { table } = req.params;
    if (!SAFE_TABLES.has(table)) return res.status(400).json({ data: null, error: { message: "Invalid table" } });
    const allowedCols = TABLE_COLS[table] || [];
    const filters = [];
    for (const [k, v] of Object.entries(req.query)) {
      if (!k.startsWith("_") && allowedCols.includes(k)) {
        const val = v === "true" ? 1 : v === "false" ? 0 : v;
        filters.push({ col: k, val });
      }
    }
    if (!filters.length) return res.status(400).json({ data: null, error: { message: "No filters for delete" } });
    const where = filters.map(f => `${f.col} = ?`).join(" AND ");
    db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...filters.map(f => f.val));
    res.json({ data: null, error: null });
  } catch (e) {
    res.status(500).json({ data: null, error: { message: e.message } });
  }
});

// ── File upload ───────────────────────────────────────────────────────────────
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  // Build public URL from actual saved path relative to public/
  const relPath = req.file.path
    .replace(join(__dirname, "../public"), "")
    .replace(/\\/g, "/");
  const publicUrl = relPath.startsWith("/") ? relPath : `/${relPath}`;
  res.json({ data: { publicUrl }, error: null });
});

// ── Bot mode toggle ───────────────────────────────────────────────────────────
app.post("/api/bot/mode", (req, res) => {
  const { mode } = req.body || {};
  if (mode === "bot" || mode === "human") {
    botMode = mode;
    console.log(`[bot] Mode switched to: ${mode}`);
    res.json({ data: { mode: botMode }, error: null });
  } else {
    res.status(400).json({ error: { message: "mode must be 'bot' or 'human'" }, data: null });
  }
});

app.get("/api/bot/mode", (req, res) => {
  res.json({ data: { mode: botMode }, error: null });
});

// Close a chat session manually
app.post("/api/chat/close", (req, res) => {
  const { session_id } = req.body || {};
  if (!session_id) return res.status(400).json({ error: { message: "session_id required" }, data: null });
  db.prepare("UPDATE chat_messages SET status = 'closed', updated_at = ? WHERE id = ?").run(new Date().toISOString(), session_id);
  res.json({ data: { closed: true }, error: null });
});

// Auto-close sessions idle > 30 min (runs every 5 min)
setInterval(() => {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();
  db.prepare("UPDATE chat_messages SET status = 'closed' WHERE status = 'active' AND updated_at < ?").run(cutoff);
}, 5 * 60 * 1000);

// Session inactivity timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

app.post("/api/chat/send", async (req, res) => {
  const { message, session_id, from, history } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: { message: "message is required" }, data: null });

  const settings = getSettings();
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown IP";
  const userChannel = req.body.channel || "website";

  let masterId = null;

  if (from !== "admin") {
    // Try to reuse an existing open session for this IP within timeout window
    const existing = db.prepare(
      `SELECT id, updated_at FROM chat_messages WHERE ip_address = ? AND status != 'closed' ORDER BY updated_at DESC LIMIT 1`
    ).get(ip);
    if (existing) {
      const lastActive = new Date(existing.updated_at).getTime();
      if (nowMs - lastActive < SESSION_TIMEOUT_MS) {
        masterId = existing.id;
      } else {
        // Expired — close it
        db.prepare("UPDATE chat_messages SET status = 'closed', updated_at = ? WHERE id = ?").run(nowIso, existing.id);
      }
    }
  } else {
    // Admin reply — use the provided session_id directly
    if (session_id) {
      const existing = db.prepare("SELECT id FROM chat_messages WHERE id = ?").get(session_id);
      if (existing) masterId = session_id;
    }
  }

  if (!masterId) {
    masterId = uuid();
    db.prepare(`INSERT INTO chat_messages (id, session_id, ip_address, channel, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'active', ?, ?)`)
      .run(masterId, masterId, ip, userChannel, nowIso, nowIso);
  } else {
    db.prepare("UPDATE chat_messages SET updated_at = ?, status = 'active' WHERE id = ?").run(nowIso, masterId);
  }

  const direction = from === "admin-panel" || from === "admin" ? "outbound" : "inbound";
  const detailId = uuid();
  const userMeta = JSON.stringify({ ip, source: "website" });

  // Save to Detail table (chat_threads)
  db.prepare(`INSERT INTO chat_threads (id, message_id, direction, content, sender, timestamp, meta)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(detailId, masterId, direction, message, from || "website", nowIso, userMeta);

  emitEvent("chat", { id: detailId, message_id: masterId, direction, content: message, timestamp: nowIso });

  // Send via WA if configured
  const waResult = await sendWhatsAppMessage({ to: settings.whatsapp_number, text: message, settings });

  // Bot Reply Logic
  const isAdminReply = from === "admin";
  if (!isAdminReply && botMode === "bot") {
    // Load context for bot
    const dbHistory = db.prepare("SELECT direction, content FROM chat_threads WHERE message_id = ? ORDER BY timestamp ASC LIMIT 20").all(masterId);
    const contextMsgs = dbHistory
      .filter(m => m.direction !== "outbound")
      .map(m => ({ role: m.direction === "bot" ? "assistant" : "user", content: m.content }));
    if (!contextMsgs.length) contextMsgs.push({ role: "user", content: message });

    const botReply = await generateBotReply(contextMsgs, settings);
    const botDetailId = uuid();
    db.prepare(`INSERT INTO chat_threads (id, message_id, direction, content, sender, timestamp, meta)
                VALUES (?, ?, 'bot', ?, 'AI Assistant', ?, ?)`)
      .run(botDetailId, masterId, botReply.reply, new Date().toISOString(), JSON.stringify({ source: botReply.source }));

    emitEvent("chat", { id: botDetailId, message_id: masterId, direction: "bot", content: botReply.reply, timestamp: new Date().toISOString() });

    res.json({
      data: {
        session_id: masterId,
        user_message: { id: detailId, status: waResult.status },
        bot_message: { id: botDetailId, reply: botReply.reply, source: botReply.source },
      },
      error: null,
    });
  } else {
    res.json({ data: { session_id: masterId, user_message: { id: detailId, status: waResult.status }, bot_message: null }, error: null });
  }
});

app.get("/api/chat/history", (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || "50", 10), 200));
  const rows = db.prepare(`
    SELECT m.id as session_id, m.ip_address, m.status as session_status, m.updated_at as session_updated_at,
           t.id, t.direction, t.content, t.timestamp, t.sender
    FROM chat_threads t
    JOIN chat_messages m ON t.message_id = m.id
    ORDER BY t.timestamp DESC
    LIMIT ?
  `).all(limit);
  res.json({ data: rows.reverse(), error: null });
});

// Get replies for a submission
app.get("/api/submissions/:id/replies", (req, res) => {
  const { id } = req.params;
  const replies = db.prepare("SELECT * FROM submission_replies WHERE submission_id = ? ORDER BY datetime(created_at) ASC").all(id);
  res.json({ data: replies, error: null });
});
app.get('/api/services', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM services").all();
    res.json(rows);
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// Contact submission replies
app.post("/api/submissions/:id/reply", async (req, res) => {
  const { id } = req.params;
  const { message, sender = "admin" } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });
  const submission = db.prepare("SELECT * FROM contact_submissions WHERE id = ?").get(id);
  if (!submission) return res.status(404).json({ error: "not found" });
  const replyId = uuid();
  const nowIso = new Date().toISOString();
  db.prepare("INSERT INTO submission_replies (id, submission_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(replyId, id, sender, message, nowIso);
  // Mark as read + responded
  db.prepare("UPDATE contact_submissions SET is_read = 1, status = 'responded' WHERE id = ?").run(id);
  emitEvent("submission", { replyId, submission_id: id, message, sender, created_at: nowIso });
  const settings = getSettings();
  await sendEmailNow({
    to: submission.email,
    subject: "Reply to your enquiry",
    text: message,
    settings,
  });
  res.json({ ok: true });
});

// Get replies for an application
app.get("/api/applications/:id/replies", (req, res) => {
  const { id } = req.params;
  const replies = db.prepare("SELECT * FROM application_replies WHERE application_id = ? ORDER BY datetime(created_at) ASC").all(id);
  res.json({ data: replies, error: null });
});

// Job application status & replies
app.get("/api/applications", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email required" });
  const apps = db.prepare("SELECT * FROM job_applications WHERE email = ? ORDER BY datetime(created_at) DESC").all(email);
  res.json({ data: apps, error: null });
});

app.post("/api/applications/:id/reply", (req, res) => {
  const { id } = req.params;
  const { message, sender = "admin", status } = req.body || {};
  if (!message && !status) return res.status(400).json({ error: "message or status required" });
  const appRow = db.prepare("SELECT * FROM job_applications WHERE id = ?").get(id);
  if (!appRow) return res.status(404).json({ error: "not found" });
  const nowIso = new Date().toISOString();
  if (status) {
    db.prepare("UPDATE job_applications SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso, id);
  }
  if (message) {
    const replyId = uuid();
    db.prepare("INSERT INTO application_replies (id, application_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(replyId, id, sender, message, nowIso);
  }
  emitEvent("application", { id, status: status || appRow.status, message, created_at: nowIso });
  const settings = getSettings();
  if (message) {
    sendEmailNow({
      to: appRow.email,
      subject: `Update on your application (${status || appRow.status})`,
      text: message,
      settings,
    });
  }
  res.json({ ok: true });
});

app.post("/api/webhook/whatsapp", async (req, res) => {
  const { from, message } = req.body || {};
  if (!from || !message) return res.status(400).json({ error: "missing from/message" });
  const settings = getSettings();
  const threadId = uuid();
  const nowIso = new Date().toISOString();
  db.prepare(`INSERT INTO chat_threads (id, title, contact, channel, last_message, created_at, updated_at)
              VALUES (?, ?, ?, 'whatsapp', ?, ?, ?)`)
    .run(threadId, `WA ${from}`, from, message, nowIso, nowIso);
  const inboundId = uuid();
  db.prepare(`INSERT INTO chat_messages (id, thread_id, direction, channel, message, to_number, from_number, status, created_at)
              VALUES (?, ?, 'inbound', 'whatsapp', ?, ?, ?, 'delivered', ?)`)
    .run(inboundId, threadId, message, settings.whatsapp_number, from, nowIso);
  emitEvent("chat", { id: inboundId, thread_id: threadId, direction: "inbound", channel: "whatsapp", message, created_at: nowIso });

  const botReply = await generateBotReply([{ role: "user", content: message }], settings);
  const botMsgId = uuid();
  db.prepare(`INSERT INTO chat_messages (id, thread_id, direction, channel, message, to_number, from_number, status, model, meta, created_at)
              VALUES (?, ?, 'bot', 'whatsapp', ?, ?, ?, 'sent', ?, ?, ?)`)
    .run(botMsgId, threadId, botReply.reply, from, settings.whatsapp_number, settings.ai_model, JSON.stringify({ source: botReply.source }), new Date().toISOString());
  emitEvent("chat", { id: botMsgId, thread_id: threadId, direction: "bot", channel: "whatsapp", message: botReply.reply, created_at: new Date().toISOString() });
  // Try sending reply back out
  await sendWhatsAppMessage({ to: from, text: botReply.reply, settings });
  res.json({ ok: true });
});

app.post("/api/webhook/viber", async (req, res) => {
  const { from, message } = req.body || {};
  if (!from || !message) return res.status(400).json({ error: "missing from/message" });
  const settings = getSettings();
  const threadId = uuid();
  const nowIso = new Date().toISOString();
  db.prepare(`INSERT INTO chat_threads (id, title, contact, channel, last_message, created_at, updated_at)
              VALUES (?, ?, ?, 'viber', ?, ?, ?)`)
    .run(threadId, `Viber ${from}`, from, message, nowIso, nowIso);
  const inboundId = uuid();
  db.prepare(`INSERT INTO chat_messages (id, thread_id, direction, channel, message, to_number, from_number, status, created_at)
              VALUES (?, ?, 'inbound', 'viber', ?, ?, ?, 'delivered', ?)`)
    .run(inboundId, threadId, message, settings.viber_number, from, nowIso);
  emitEvent("chat", { id: inboundId, thread_id: threadId, direction: "inbound", channel: "viber", message, created_at: nowIso });
  const botReply = await generateBotReply([{ role: "user", content: message }], settings);
  const botMsgId = uuid();
  db.prepare(`INSERT INTO chat_messages (id, thread_id, direction, channel, message, to_number, from_number, status, model, meta, created_at)
              VALUES (?, ?, 'bot', 'viber', ?, ?, ?, 'sent', ?, ?, ?)`)
    .run(botMsgId, threadId, botReply.reply, from, settings.viber_number, settings.ai_model, JSON.stringify({ source: botReply.source }), new Date().toISOString());
  emitEvent("chat", { id: botMsgId, thread_id: threadId, direction: "bot", channel: "viber", message: botReply.reply, created_at: new Date().toISOString() });
  res.json({ ok: true });
});

app.get("/api/health/integrations", async (_req, res) => {
  const settings = getSettings();
  const results = { whatsapp: "not_configured", bot: "not_configured", email: "not_configured" };
  // WhatsApp health: check if API URL is set
  results.whatsapp = settings.bot_api_url ? "configured" : "not_configured";
  // Bot health: quick ping
  if (settings.bot_api_url && isAllowedExternalUrl(settings.bot_api_url)) {
    try {
      const ping = await fetch(settings.bot_api_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(settings.bot_api_token ? { Authorization: `Bearer ${settings.bot_api_token}` } : {}) },
        body: JSON.stringify({ messages: [{ role: "user", content: "ping" }], model: settings.ai_model }),
      });
      results.bot = ping.ok ? "ok" : "error";
    } catch { results.bot = "error"; }
  } else if (settings.bot_api_url) {
    results.bot = "invalid_url";
  }
  // Email health
  const transport = createTransport(settings);
  if (transport) {
    try {
      await transport.verify();
      results.email = "ok";
    } catch (e) { results.email = "error"; }
  } else {
    results.email = "not_configured";
  }
  res.json({ data: results, error: null });
});

// Simple SSE bus for lightweight realtime updates
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Disable Nagle's algorithm so small chunks are sent immediately
  if (req.socket) {
    req.socket.setNoDelay(true);
    req.socket.setTimeout(0); // Disable socket timeout
  }

  res.flushHeaders?.();

  // Send initial ping to confirm connection
  res.write(": connected\n\n");

  const send = (event, data) => {
    if (res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) {}
  };

  const chatHandler = (data) => send("chat", data);
  const submissionHandler = (data) => send("submission", data);
  const applicationHandler = (data) => send("application", data);
  const appointmentHandler = (data) => send("appointment", data);

  bus.on("chat", chatHandler);
  bus.on("submission", submissionHandler);
  bus.on("application", applicationHandler);
  bus.on("appointment", appointmentHandler);

  // Heartbeat every 25s to keep proxy and browser connections alive
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      try { res.write(": heartbeat\n\n"); } catch (_) {}
    } else {
      clearInterval(heartbeat);
    }
  }, 25000);

  // Handle client disconnect gracefully
  const cleanup = () => {
    clearInterval(heartbeat);
    bus.off("chat", chatHandler);
    bus.off("submission", submissionHandler);
    bus.off("application", applicationHandler);
    bus.off("appointment", appointmentHandler);
  };

  req.on("close", cleanup);
  res.on("close", cleanup);
});

// ── Row normalisation helpers ─────────────────────────────────────────────────

const BOOL_COLS = ["is_visible", "is_popular", "is_read"];

function normaliseRow(table, row) {
  const out = { ...row };
  for (const col of BOOL_COLS) {
    if (col in out) out[col] = out[col] === 1 || out[col] === true;
  }
  if (table === "chat_messages" && typeof out.meta === "string") {
    try { out.meta = JSON.parse(out.meta); } catch { }
  }
  if (table === "site_content" && typeof out.content === "string") {
    try { out.content = JSON.parse(out.content); } catch { }
  }
  return out;
}

function serialiseRow(table, row) {
  const out = { ...row };
  for (const col of BOOL_COLS) {
    if (col in out) out[col] = out[col] ? 1 : 0;
  }
  if (table === "site_content" && out.content && typeof out.content === "object") {
    out.content = JSON.stringify(out.content);
  }
  return out;
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] SQLite API running on http://localhost:${PORT}`);
  console.log(`[server] DB file: ${DB_PATH}`);
});
