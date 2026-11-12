// GET  /api/admin/orders?filter=unprinted|printed|shipped|check|all   -> paid orders (newest first)
// POST /api/admin/orders {ids:[...], status:"printed"|"shipped"|"paid"|"refunded"}
import { json, fail, db, requireAdmin, getSettings, paidToday } from '../../../server/lib.js';
export const FILTERS = {
  unprinted: "status = 'paid'", printed: "status = 'printed'", shipped: "status = 'shipped'",
  check: "status = 'check'", refunded: "status = 'refunded'", all: "status != 'pending'"
};
export async function onRequestGet({ request, env }) {
  const no = await requireAdmin(request, env); if (no) return no;
  const f = new URL(request.url).searchParams.get('filter') || 'unprinted';
  const where = FILTERS[f] || FILTERS.unprinted;
  const d = await db(env);
  const { results } = await d.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT 1000`).all();
  const counts = {};
  for (const [k, w] of Object.entries(FILTERS)) counts[k] = (await d.prepare(`SELECT COUNT(*) AS n FROM orders WHERE ${w}`).first()).n;
  return json({ ok: true, orders: results || [], counts, settings: await getSettings(env), today: await paidToday(env), env: env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox' });
}
const STAMP = { printed: 'printed_at', shipped: 'shipped_at' };
export async function onRequestPost({ request, env }) {
  const no = await requireAdmin(request, env); if (no) return no;
  const b = await request.json().catch(() => ({}));
  const ids = Array.isArray(b.ids) ? b.ids.filter((x) => /^FFL-[\w-]{4,20}$/.test(x)).slice(0, 500) : [];
  if (!ids.length || !['printed', 'shipped', 'paid', 'refunded'].includes(b.status)) return fail('Nothing to update.');
  const d = await db(env), now = new Date().toISOString();
  const col = STAMP[b.status];
  await d.batch(ids.map((id) => d.prepare(`UPDATE orders SET status = ?${col ? `, ${col} = COALESCE(${col}, ?)` : ''} WHERE id = ? AND status != 'pending'`)
    .bind(...(col ? [b.status, now, id] : [b.status, id]))));
  return json({ ok: true, updated: ids.length });
}
