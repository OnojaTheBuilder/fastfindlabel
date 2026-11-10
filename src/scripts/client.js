import { C } from '../data/content.js';
const $ = (s) => document.querySelector(s);
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

// Order form
const f = $('#of');
if (f) {
  const tn = $('#tn'), tot = $('#tot'), done = $('#done'), btn = f.querySelector('button[type=submit]'), pp = $('#pp');
  const fmt = (v) => { const d = v.replace(/\D/g, '').slice(0, 10); return d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d; };
  const pk = () => C.price[+f.pack.value];
  const total = () => pk().p + C.shipping;
  const upd = () => { tot.textContent = `$${pk().p} + $${C.shipping} shipping = $${total()}`; };
  const data = () => Object.fromEntries(new FormData(f));
  const say = (t) => { done.textContent = t; done.hidden = false; done.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); };
  tn.addEventListener('input', () => { tn.value = fmt(tn.value); });
  f.addEventListener('change', upd); upd();
  const live = () => /^[A-Za-z0-9_-]{20,}$/.test(C.paypalClientId || '');

  // Note: the price is set in the browser. Until the server checkout (HANDOFF.md section 6) is built,
  // Bob must check in PayPal that each payment matches the pack before he ships.
  const pay = () => {
    btn.hidden = true;
    new Promise((ok, no) => { if (window.paypal) return ok(); const s = document.createElement('script'); s.src = `https://www.paypal.com/sdk/js?client-id=${C.paypalClientId}&currency=USD&intent=capture`; s.onload = ok; s.onerror = no; document.head.append(s); })
      .then(() => paypal.Buttons({
        onClick: (_, a) => (f.reportValidity() ? a.resolve() : a.reject()),
        createOrder: (_, x) => { const d = data(); return x.order.create({
          application_context: { shipping_preference: 'SET_PROVIDED_ADDRESS', brand_name: C.brand },
          purchase_units: [{
            description: `FFL x${pk().q} | Print ${d.tel} | ${d.email}`.slice(0, 127),
            custom_id: d.tel,
            amount: { currency_code: 'USD', value: total().toFixed(2) },
            shipping: { name: { full_name: d.name }, address: { address_line_1: d.street, address_line_2: d.apt || undefined, admin_area_2: d.city, admin_area_1: d.state.toUpperCase(), postal_code: d.zip, country_code: 'US' } }
          }]
        }); },
        onApprove: (_, x) => x.order.capture().then(() => { const d = data(); f.hidden = true; say(fill(C.form.thanks, { name: d.name, q: pk().q, tel: d.tel, total: total() })); }),
        onError: () => say(C.form.payError)
      }).render('#pp'))
      .catch(() => { btn.hidden = false; say(C.form.payError); });
  };
  f.addEventListener('submit', (e) => { e.preventDefault(); if (live()) { if (!pp.hasChildNodes()) pay(); } else say(fill(C.form.notOpen, { email: C.email })); });
}

// Map dialog opened from the tagline
const dlg = $('#map');
if (dlg) {
  const S = C.map.stops, dot = $('#dot'), tip = $('#mapTip'), step = $('#mapStep'), back = $('#mapBack'), next = $('#mapNext');
  let i = 0;
  const show = () => {
    const s = S[i];
    dot.setAttribute('transform', `translate(${s.x} ${s.y})`);
    tip.innerHTML = `<strong>${s.name}.</strong> ${s.tip}`;
    step.textContent = `${i + 1} / ${S.length}`;
    back.disabled = i === 0; next.disabled = i === S.length - 1;
  };
  $('#mapOpen').addEventListener('click', () => { i = 0; show(); dlg.showModal(); });
  back.addEventListener('click', () => { if (i > 0) { i--; show(); } });
  next.addEventListener('click', () => { if (i < S.length - 1) { i++; show(); } });
  $('#mapClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}
