// GET /api/status: is the shop open, and which PayPal Client ID the browser should load.
import { json, shopStatus } from '../../server/lib.js';
export async function onRequestGet({ env }) {
  try { return json({ ok: true, ...(await shopStatus(env)) }); }
  catch (e) { return json({ ok: false, open: false, error: 'Shop is not set up yet.' }, 503); }
}
