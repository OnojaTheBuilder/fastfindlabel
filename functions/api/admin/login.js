// POST /api/admin/login {password}  ->  sets the admin cookie.  DELETE  ->  logs out.
import { json, fail, safeEqual, makeSession, sessionCookie, limited, ip } from '../../../server/lib.js';
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return fail('Admin password is not set in Cloudflare yet.', 503);
  if (await limited(env, `login:${ip(request)}`, 8, 900)) return fail('Too many tries. Please wait 15 minutes.', 429);
  const body = await request.json().catch(() => ({}));
  if (!safeEqual(String(body.password || ''), env.ADMIN_PASSWORD)) return fail('Wrong password.', 401);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(await makeSession(env), 30 * 24 * 3600) });
}
export const onRequestDelete = () => json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
