// Shared server helpers for Cloudflare Pages Functions.
// Needs these Cloudflare settings (Settings > Variables and Secrets / Bindings):
//   DB               D1 database binding
//   PAYPAL_ENV       "sandbox" or "live"
//   PAYPAL_CLIENT_ID PayPal REST app Client ID (matching PAYPAL_ENV)
//   PAYPAL_SECRET    PayPal REST app Secret (encrypt it)
//   ADMIN_PASSWORD   Bob's admin page password (encrypt it)
import { C } from '../src/data/content.js';

export const SHIPPING = C.shipping;
export const PACKS = C.price; // [{q,p}] prices before shipping, the ONLY price list the server trusts
const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const TZ = 'America/New_York';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
export const fail = (msg, status = 400) => json({ ok: false, error: msg }, status);

let ready = false;
export async function db(env) {
  if (!env.DB) throw new Error('Database not connected (DB binding missing)');
  if (!ready) {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, paid_at TEXT, day TEXT, status TEXT NOT NULL,
        pack_q INTEGER NOT NULL, total REAL NOT NULL, tel TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
        street TEXT NOT NULL, apt TEXT, city TEXT NOT NULL, state TEXT NOT NULL, zip TEXT NOT NULL,
        paypal_order_id TEXT, capture_id TEXT, site TEXT, printed_at TEXT, shipped_at TEXT)`),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS orders_status ON orders(status, created_at)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS orders_pp ON orders(paypal_order_id)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS hits (k TEXT PRIMARY KEY, n INTEGER, reset INTEGER)')
    ]);
    ready = true;
  }
  return env.DB;
}

export async function getSettings(env) {
  const d = await db(env);
  const { results } = await d.prepare('SELECT k, v FROM settings').all();
  const s = Object.fromEntries((results || []).map((r) => [r.k, r.v]));
  return { open: s.open === '1', cap: Math.max(0, parseInt(s.cap || '0', 10) || 0) };
}
export async function setSetting(env, k, v) {
  const d = await db(env);
  await d.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, String(v)).run();
}

export const today = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

export async function paidToday(env) {
  const d = await db(env);
  const r = await d.prepare("SELECT COUNT(*) AS n FROM orders WHERE day = ? AND status != 'pending'").bind(today()).first();
  return r ? r.n : 0;
}

// Is the shop taking orders right now? Closed if paused, cap reached or PayPal not configured.
export async function shopStatus(env) {
  const s = await getSettings(env);
  const configured = !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET);
  let open = s.open && configured;
  if (open && s.cap > 0 && (await paidToday(env)) >= s.cap) open = false;
  return { open, clientId: configured ? env.PAYPAL_CLIENT_ID : '', env: env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox' };
}

// Simple fixed-window rate limit stored in D1. Returns true when the caller is over the limit.
export async function limited(env, key, max, seconds) {
  const d = await db(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await d.prepare('SELECT n, reset FROM hits WHERE k = ?').bind(key).first();
  if (!row || row.reset <= now) {
    await d.prepare('INSERT INTO hits (k, n, reset) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = 1, reset = excluded.reset').bind(key, now + seconds).run();
    return false;
  }
  if (row.n >= max) return true;
  await d.prepare('UPDATE hits SET n = n + 1 WHERE k = ?').bind(key).run();
  return false;
}
export const ip = (request) => request.headers.get('cf-connecting-ip') || 'local';

// Validate and clean the order form. Returns {order} or {error}.
export function validateOrder(b) {
  if (!b || typeof b !== 'object') return { error: 'Missing order details.' };
  const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const pack = Number.parseInt(b.pack, 10);
  if (!(pack >= 0 && pack < PACKS.length)) return { error: 'Please choose a pack.' };
  const digits = String(b.tel ?? '').replace(/\D/g, '');
  if (digits.length !== 10 || /^[01]/.test(digits)) return { error: 'Please enter a 10-digit US phone number to print.' };
  const o = {
    pack_q: PACKS[pack].q,
    total: PACKS[pack].p + SHIPPING,
    tel: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    name: str(b.name, 80), email: str(b.email, 120).toLowerCase(),
    street: str(b.street, 100), apt: str(b.apt, 40), city: str(b.city, 60),
    state: str(b.state, 2).toUpperCase(), zip: str(b.zip, 5)
  };
  if (o.name.length < 2) return { error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)) return { error: 'Please enter a valid email.' };
  if (o.street.length < 3) return { error: 'Please enter your street address.' };
  if (o.city.length < 2) return { error: 'Please enter your city.' };
  if (!STATES.includes(o.state)) return { error: 'Please enter a 2-letter US state, like OH.' };
  if (!/^\d{5}$/.test(o.zip)) return { error: 'Please enter a 5-digit ZIP.' };
  return { order: o };
}

export const newId = () => {
  const d = today().replace(/-/g, '').slice(2);
  const r = crypto.getRandomValues(new Uint8Array(3));
  return `FFL-${d}-${[...r].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 5).toUpperCase()}`;
};

// ---- PayPal REST ----
const ppBase = (env) => (env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
async function ppToken(env) {
  const r = await fetch(`${ppBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`), 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) throw new Error(`PayPal login failed (${r.status})`);
  return (await r.json()).access_token;
}
export async function paypal(env, path, body, requestId) {
  const token = await ppToken(env);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation' };
  if (requestId) headers['paypal-request-id'] = requestId;
  const r = await fetch(`${ppBase(env)}${path}`, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, data };
}

// ---- Admin session (signed cookie) ----
const enc = new TextEncoder();
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]);
}
const secretFor = (env) => `ffl-admin|${env.ADMIN_PASSWORD}`;
export async function makeSession(env) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  return `${exp}.${await hmac(secretFor(env), String(exp))}`;
}
export const sessionCookie = (value, maxAge) =>
  `ffl_admin=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
export async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)ffl_admin=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(secretFor(env), exp));
}
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export const requireAdmin = async (request, env) => ((await isAdmin(request, env)) ? null : fail('Please log in.', 401));
