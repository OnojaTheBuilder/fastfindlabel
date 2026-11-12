// POST /api/orders/create: validate the form, price it on the server, create the PayPal order, save as pending.
import { json, fail, db, shopStatus, validateOrder, newId, paypal, limited, ip, today } from '../../../server/lib.js';
import { C } from '../../../src/data/content.js';

export async function onRequestPost({ request, env }) {
  try {
    if (await limited(env, `create:${ip(request)}`, 20, 3600)) return fail('Too many attempts. Please try again later.', 429);
    const st = await shopStatus(env);
    if (!st.open) return fail(C.pausedNote, 403);
    const body = await request.json().catch(() => null);
    const { order, error } = validateOrder(body);
    if (error) return fail(error);

    const id = newId();
    const total = order.total.toFixed(2);
    const pp = await paypal(env, '/v2/checkout/orders', {
      intent: 'CAPTURE',
      application_context: { brand_name: C.brand, shipping_preference: 'SET_PROVIDED_ADDRESS', user_action: 'PAY_NOW' },
      purchase_units: [{
        reference_id: id, custom_id: id, invoice_id: id,
        description: `FFL ${order.pack_q} labels | Print ${order.tel}`.slice(0, 127),
        amount: { currency_code: 'USD', value: total, breakdown: {
          item_total: { currency_code: 'USD', value: (order.total - C.shipping).toFixed(2) },
          shipping: { currency_code: 'USD', value: C.shipping.toFixed(2) } } },
        items: [{ name: `${C.brand} - ${order.pack_q} labels`, description: `Print: ${order.tel}`, quantity: '1', category: 'PHYSICAL_GOODS',
          unit_amount: { currency_code: 'USD', value: (order.total - C.shipping).toFixed(2) } }],
        shipping: { name: { full_name: order.name }, address: {
          address_line_1: order.street, ...(order.apt ? { address_line_2: order.apt } : {}),
          admin_area_2: order.city, admin_area_1: order.state, postal_code: order.zip, country_code: 'US' } }
      }]
    }, id);
    if (!pp.ok || !pp.data.id) {
      console.log('paypal create failed', pp.status, JSON.stringify(pp.data).slice(0, 500));
      return fail('PayPal could not start the payment. Please check your address and try again.', 502);
    }
    const d = await db(env);
    await d.prepare(`INSERT INTO orders (id, created_at, day, status, pack_q, total, tel, name, email, street, apt, city, state, zip, paypal_order_id, site)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, new Date().toISOString(), today(), order.pack_q, order.total, order.tel, order.name, order.email,
        order.street, order.apt, order.city, order.state, order.zip, pp.data.id, 'fastfindlabel').run();
    return json({ ok: true, id: pp.data.id });
  } catch (e) {
    console.log('create error', e && e.stack);
    return fail('Something went wrong. Nothing was charged. Please try again.', 500);
  }
}
