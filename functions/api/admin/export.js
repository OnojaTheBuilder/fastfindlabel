// GET /api/admin/export?filter=unprinted&ids=FFL-...,FFL-...  ->  Excel file for Bob's address-label app.
import { fail, db, requireAdmin } from '../../../server/lib.js';
import { xlsx, addressRow } from '../../../server/xlsx.js';
import { FILTERS } from './orders.js';
export async function onRequestGet({ request, env }) {
  const no = await requireAdmin(request, env); if (no) return no;
  const q = new URL(request.url).searchParams;
  const d = await db(env);
  let rows;
  const ids = (q.get('ids') || '').split(',').filter((x) => /^FFL-[\w-]{4,20}$/.test(x)).slice(0, 1000);
  if (ids.length) {
    rows = (await d.prepare(`SELECT * FROM orders WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at ASC`).bind(...ids).all()).results;
  } else {
    const where = FILTERS[q.get('filter')] || FILTERS.unprinted;
    rows = (await d.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY created_at ASC`).all()).results;
  }
  if (!rows || !rows.length) return fail('No orders to export.', 404);
  const file = xlsx(rows.map(addressRow), [26, 34, 18, 8]);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(file, { headers: {
    'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'content-disposition': `attachment; filename="fastfindlabel-addresses-${day}.xlsx"`, 'cache-control': 'no-store' } });
}
