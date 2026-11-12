// Bob's order page. Talks to /api/admin/* (cookie login).
(() => {
  const $ = (s) => document.querySelector(s);
  const api = async (path, opts = {}) => {
    const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { show('login'); throw new Error('login'); }
    if (!r.ok || data.ok === false) throw new Error(data.error || 'Something went wrong.');
    return data;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = (n) => `$${Number(n).toFixed(2)}`;
  const when = (iso) => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const addrRow = (o) => [o.name, [o.street, o.apt].filter(Boolean).join(' '), `${o.city} ${o.state}`, o.zip];
  const show = (id) => { $('#login').hidden = id !== 'login'; $('#app').hidden = id !== 'app'; if (id === 'login') $('#pw').focus(); };

  let filter = 'unprinted', data = null, batch = [];

  async function load() {
    data = await api(`/api/admin/orders?filter=${filter}`);
    show('app');
    const s = data.settings;
    $('#envBadge').textContent = data.env === 'live' ? 'LIVE' : 'TEST MODE (Sandbox)';
    $('#envBadge').className = 'badge' + (data.env === 'live' ? ' live' : '');
    $('#shopState').className = 'shop' + (s.open ? ' open' : '');
    $('#shopText').textContent = s.open ? 'Taking orders' : 'Orders paused';
    $('#toggleShop').textContent = s.open ? 'Pause orders' : 'Open orders';
    $('#toggleShop').className = s.open ? 'small ghost' : 'small';
    if (document.activeElement !== $('#cap')) $('#cap').value = s.cap;
    $('#todayCount').textContent = `Paid today: ${data.today}${s.cap ? ` of ${s.cap}` : ''}`;
    for (const b of document.querySelectorAll('.tabs button')) {
      const f = b.dataset.f, n = data.counts[f] ?? 0;
      b.textContent = `${b.textContent.replace(/\s*\(\d+\)$/, '')} (${n})`;
      b.setAttribute('aria-pressed', String(f === filter));
      if (f === 'check') b.hidden = n === 0;
    }
    $('#copy30').hidden = filter !== 'unprinted';
    $('#excel').href = `/api/admin/export?filter=${filter}`;
    $('#excel').textContent = filter === 'unprinted' ? 'Download Excel (all not printed)' : 'Download Excel (this list)';
    $('#tools').hidden = !data.orders.length;
    render();
  }

  function render() {
    const L = $('#list');
    if (!data.orders.length) { L.innerHTML = `<p class="empty">${filter === 'unprinted' ? 'All caught up. No orders waiting to print.' : 'No orders here yet.'}</p>`; return; }
    L.innerHTML = data.orders.map((o) => `
      <article class="order${o.status === 'check' ? ' check' : ''}" data-id="${esc(o.id)}">
        <div class="row spread"><span class="pack">${o.pack_q} labels</span><span class="status">${esc(label(o.status))}</span></div>
        <div class="tel">${esc(o.tel)}</div>
        ${o.status === 'check' ? '<p class="warn">Payment amount did not match. Check this payment in PayPal before shipping.</p>' : ''}
        <div class="addr"><strong>${esc(o.name)}</strong><br>${esc([o.street, o.apt].filter(Boolean).join(' '))}<br>${esc(o.city)} ${esc(o.state)} ${esc(o.zip)}</div>
        <div class="meta">${esc(o.email)} · ${money(o.total)} · ${when(o.paid_at || o.created_at)} · ${esc(o.id)}</div>
        <div class="row" style="margin-top:.6rem">${actions(o)}</div>
      </article>`).join('');
  }
  const label = (s) => ({ paid: 'Not printed', printed: 'Printed', shipped: 'Shipped', check: 'Check payment', refunded: 'Refunded' })[s] || s;
  function actions(o) {
    const b = (st, t, cls = 'small') => `<button type="button" class="${cls}" data-set="${st}">${t}</button>`;
    const out = [];
    if (o.status === 'paid' || o.status === 'check') out.push(b('printed', 'Mark printed'));
    if (o.status === 'printed') out.push(b('shipped', 'Mark shipped'), b('paid', 'Undo', 'small ghost'));
    if (o.status === 'shipped') out.push(b('printed', 'Undo', 'small ghost'));
    if (o.status !== 'refunded') out.push(b('refunded', 'Mark refunded', 'link'));
    else out.push(b('paid', 'Undo refund', 'small ghost'));
    return out.join('');
  }

  async function setStatus(ids, status) {
    await api('/api/admin/orders', { method: 'POST', body: JSON.stringify({ ids, status }) });
    await load();
  }

  // Copy the next 30 (oldest first) in the same 4 columns as the Excel file, one address per line.
  async function copy30() {
    const unprinted = data.orders.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    batch = unprinted.slice(0, 30);
    const text = batch.map((o) => addrRow(o).join('\t')).join('\n');
    $('#batch').hidden = false;
    $('#batchText').textContent = `${batch.length} address${batch.length === 1 ? '' : 'es'} copied. Paste them into your label app, print, then:`;
    $('#excelBatch').href = `/api/admin/export?ids=${batch.map((o) => o.id).join(',')}`;
    $('#markBatch').textContent = `Mark these ${batch.length} printed`;
    try { await navigator.clipboard.writeText(text); $('#copyFallback').hidden = true; }
    catch { $('#copyText').value = text; $('#copyFallback').hidden = false; $('#copyText').select(); $('#batchText').textContent = `${batch.length} addresses ready.`; }
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#loginMsg').textContent = '';
    try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#pw').value }) }); $('#pw').value = ''; await load(); }
    catch (err) { if (err.message !== 'login') $('#loginMsg').textContent = err.message; else $('#loginMsg').textContent = 'Wrong password.'; }
  });
  $('#logout').addEventListener('click', async () => { await fetch('/api/admin/login', { method: 'DELETE' }); show('login'); });
  $('#toggleShop').addEventListener('click', async () => {
    const open = !data.settings.open;
    try { await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ open }) }); await load(); } catch (e) { msg(e.message); }
  });
  $('#saveCap').addEventListener('click', async () => {
    try { await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({ cap: $('#cap').value || 0 }) }); msg('Daily limit saved.'); await load(); } catch (e) { msg(e.message); }
  });
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    filter = b.dataset.f; cancelBatch(); load().catch(() => {});
  });
  $('#list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-set]'); if (!b) return;
    b.disabled = true;
    try { await setStatus([b.closest('.order').dataset.id], b.dataset.set); } catch (err) { msg(err.message); b.disabled = false; }
  });
  $('#copy30').addEventListener('click', () => copy30().catch((e) => msg(e.message)));
  $('#markBatch').addEventListener('click', async () => {
    const n = batch.length;
    try { await setStatus(batch.map((o) => o.id), 'printed'); cancelBatch(); msg(`${n} orders marked printed.`); } catch (e) { msg(e.message); }
  });
  const cancelBatch = () => { batch = []; $('#batch').hidden = true; $('#copyFallback').hidden = true; };
  $('#cancelBatch').addEventListener('click', cancelBatch);
  const msg = (t) => { $('#toolMsg').textContent = t; };

  load().catch((e) => { if (e.message !== 'login') { show('login'); $('#loginMsg').textContent = e.message; } });
  setInterval(() => { if (!$('#app').hidden && !batch.length) load().catch(() => {}); }, 60000);
})();
