/**
 * SQLite REST API client — pure fetch, zero Supabaxse dependency.
 * All data goes to the Express + better-sqlite3 backend at /api/db/:table
 */

const BASE = "/api/db";

type Row = Record<string, any>;
type ApiResult<T> = { data: T | null; error: { message: string } | null };

// ── Generic CRUD helpers ──────────────────────────────────────────────────────

export async function dbSelect<T = Row[]>(
  table: string,
  filters: Record<string, any> = {},
  opts: { order?: string; asc?: boolean; single?: boolean } = {}
): Promise<ApiResult<T>> {
  try {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => p.set(k, String(v)));
    if (opts.order) { p.set("_order", opts.order); p.set("_asc", String(opts.asc !== false)); }
    if (opts.single) p.set("_single", "1");
    const res = await fetch(`${BASE}/${table}?${p}`);
    return await res.json();
  } catch (e: any) {
    return { data: null, error: { message: e?.message ?? "Network error" } };
  }
}

export async function dbInsert<T = Row>(table: string, data: Row): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e: any) {
    return { data: null, error: { message: e?.message ?? "Network error" } };
  }
}

export async function dbUpdate<T = Row>(
  table: string,
  filters: Record<string, any>,
  data: Row
): Promise<ApiResult<T>> {
  try {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => p.set(k, String(v)));
    const res = await fetch(`${BASE}/${table}?${p}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e: any) {
    return { data: null, error: { message: e?.message ?? "Network error" } };
  }
}

export async function dbDelete(table: string, filters: Record<string, any>): Promise<ApiResult<null>> {
  try {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => p.set(k, String(v)));
    const res = await fetch(`${BASE}/${table}?${p}`, { method: "DELETE" });
    return await res.json();
  } catch (e: any) {
    return { data: null, error: { message: e?.message ?? "Network error" } };
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

const SESSION_KEY = "app_admin_session";

interface Session { user: { id: string; email: string }; access_token: string; }

function getSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function setSession(s: Session | null) {
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}

export const auth = {
  async getSession() {
    const s = getSession();
    if (!s) return { data: { session: null }, error: null };
    try {
      const res = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${s.access_token}` } });
      const json = await res.json();
      if (json.data?.session) return { data: { session: s }, error: null };
    } catch { }
    setSession(null);
    return { data: { session: null }, error: null };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.data?.session) {
      setSession(json.data.session);
      return { data: { user: json.data.session.user, session: json.data.session }, error: null };
    }
    return { data: { user: null, session: null }, error: json.error };
  },

  async signOut() {
    const s = getSession();
    if (s) {
      await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${s.access_token}` } }).catch(() => {});
    }
    setSession(null);
    return { error: null };
  },
};

// ── Storage helpers ───────────────────────────────────────────────────────────

export const storage = {
  from(_bucket: string) {
    return {
      async upload(path: string, file: File): Promise<{ error: any }> {
        const form = new FormData();
        form.append("file", file);
        form.append("path", path);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        return { error: null };
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: `/assets/${path}` } };
      },
    };
  },
};
