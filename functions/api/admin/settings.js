// POST /api/admin/settings {open: true|false, cap: number}  (cap 0 = no daily limit)
import { json, fail, requireAdmin, setSetting, getSettings } from '../../../server/lib.js';
export async function onRequestPost({ request, env }) {
  const no = await requireAdmin(request, env); if (no) return no;
  const b = await request.json().catch(() => ({}));
  if (typeof b.open === 'boolean') await setSetting(env, 'open', b.open ? '1' : '0');
  if (b.cap !== undefined) {
    const cap = Number.parseInt(b.cap, 10);
    if (!(cap >= 0 && cap <= 10000)) return fail('Daily limit must be 0 or more.');
    await setSetting(env, 'cap', cap);
  }
  return json({ ok: true, settings: await getSettings(env) });
}
