// POST /api/orders/capture: capture the approved PayPal order, check status and amount, mark paid.
import { json, fail, db, paypal, limited, ip, today } from '../../../server/lib.js';

export async function onRequestPost({ request, env }) {
  try {
    if (await limited(env, `capture:${ip(request)}`, 30, 3600)) return fail('Too many attempts. Please try again later.', 429);
    const body = await request.json().catch(() => null);
    const ppId = String(body?.orderID || '').slice(0, 40);
    if (!/^[A-Z0-9]{8,40}$/.test(ppId)) return fail('Missing order.');
    const d = await db(env);
    const o = await d.prepare('SELECT * FROM orders WHERE paypal_order_id = ?').bind(ppId).first();
    if (!o) return fail('Order not found.', 404);
    if (o.status !== 'pending') return json({ ok: true, order: pub(o) }); // already captured (double click / retry)

    const pp = await paypal(env, `/v2/checkout/orders/${ppId}/capture`, null, `cap-${o.id}`);
    const unit = pp.data?.purchase_units?.[0];
    const cap = unit?.payments?.captures?.[0];
    if (pp.data?.details?.[0]?.issue === 'INSTRUMENT_DECLINED') return json({ ok: false, retry: true, error: 'Your payment method was declined. Please try another one.' }, 402);
    if (!pp.ok || pp.data.status !== 'COMPLETED' || !cap) {
      console.log('capture failed', pp.status, JSON.stringify(pp.data).slice(0, 500));
      return fail('The payment did not go through. Nothing was charged. Please try again.', 402);
    }
    const amount = Number(cap.amount?.value), cur = cap.amount?.currency_code;
    if (cur !== 'USD' || Math.abs(amount - o.total) > 0.001 || (unit.custom_id && unit.custom_id !== o.id)) {
      await d.prepare("UPDATE orders SET status = 'check', capture_id = ? WHERE id = ?").bind(cap.id, o.id).run();
      console.log('amount mismatch', o.id, amount, cur, o.total);
      return fail('We received your payment but need to check it. We will email you shortly.', 409);
    }
    const now = new Date();
    await d.prepare("UPDATE orders SET status = 'paid', paid_at = ?, day = ?, capture_id = ? WHERE id = ? AND status = 'pending'")
      .bind(now.toISOString(), today(now), cap.id, o.id).run();
    return json({ ok: true, order: pub({ ...o, status: 'paid' }) });
  } catch (e) {
    console.log('capture error', e && e.stack);
    return fail('Something went wrong while confirming your payment. If you were charged, we will email you.', 500);
  }
}
const pub = (o) => ({ id: o.id, q: o.pack_q, total: o.total, tel: o.tel, name: o.name });
