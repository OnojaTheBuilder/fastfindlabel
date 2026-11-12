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
  const paused = $('#paused');
  // Ask the server whether the shop is open (Bob's switch in /admin) and which PayPal ID to use.
  let shop = { open: false, clientId: '' };
  const status = fetch('/api/status', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ open: false }))
    .then((s) => { shop = s; if (paused) paused.hidden = !!s.open; return s; });

  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) { const e = new Error(j.error || C.form.payError); e.retry = j.retry; throw e; } return j; });

  const loadSdk = (id) => new Promise((ok, no) => {
    if (window.paypal) return ok();
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(id)}&currency=USD&intent=capture`;
    s.onload = ok; s.onerror = no; document.head.append(s);
  });

  // The server sets the price and checks the payment; the browser only collects the form.
  const pay = () => {
    btn.hidden = true;
    loadSdk(shop.clientId).then(() => paypal.Buttons({
      onClick: (_, a) => (f.reportValidity() ? a.resolve() : a.reject()),
      createOrder: () => post('/api/orders/create', data()).then((j) => j.id).catch((e) => { say(e.message); throw e; }),
      onApprove: (d, a) => post('/api/orders/capture', { orderID: d.orderID })
        .then((j) => { f.hidden = true; say(fill(C.form.thanks, { name: j.order.name, q: j.order.q, tel: j.order.tel, total: j.order.total })); })
        .catch((e) => { if (e.retry) return a.restart(); say(e.message); }),
      onCancel: () => say(C.form.cancelled),
      onError: () => { if (!done.textContent) say(C.form.payError); }
    }).render('#pp')).catch(() => { btn.hidden = false; say(C.form.payError); });
  };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    done.hidden = true; done.textContent = '';
    const s = await status;
    if (!s.open || !s.clientId) return say(fill(C.form.notOpen, { email: C.email }));
    if (!pp.hasChildNodes()) pay();
  });
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
