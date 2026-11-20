// Страница ивента /e/<slug>: карточка ивента, «Иду» в один клик для
// своих, регистрация + запись сразу для новых людей.
// Absolute path: the page is served at /e/<slug>, so "./" would point into /e/.
import { supabase, t, lang, esc, CONSENT_VERSION, authErrorText, currentUser, loadMe } from '/account.js';

const root = document.getElementById('event');
const tf = (k, v) => t(k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''));
const L = (row, f) => (lang() === 'en' && row[f + '_en']) ? row[f + '_en'] : (row[f + '_ru'] || '');
const PHONE_RE = /^\+?[0-9 ()\-]{7,25}$/;

// /e/dec-2026  (на локальном сервере также /event?slug=dec-2026)
const slug = (location.pathname.match(/^\/e\/([a-z0-9-]+)/) || [])[1] ||
             new URLSearchParams(location.search).get('slug') || '';
const here = '/e/' + slug;

let ev = null, me = null, reg = null, user = null;
let view = 'main';   // main | join
let msg = '', busy = false;

function errText(err) {
  const m = String((err && err.message) || err);
  if (/event_full/.test(m)) return t('ev.full');
  if (/registration_closed/.test(m)) return t('ev.closed');
  return authErrorText(err);
}

// ─── Render ─────────────────────────────────────────────────────────────────
function render() {
  if (!ev) {
    root.innerHTML = '<div class="ev-card"><p class="auth-lead">' + esc(t('ev.not_found')) + '</p>' +
      '<a class="btn btn-outline" href="/">' + esc(t('acc.back_home')) + '</a></div>';
    return;
  }
  document.title = L(ev, 'title') + ' · AGORA';
  const going = !ev.going ? t('ev.first')
    : (ev.capacity ? tf('ev.going_cap', { n: ev.going, cap: ev.capacity }) : tf('ev.going', { n: ev.going }));
  const placeUrl = ev.place_url && /^(https?:\/\/|\/)/.test(ev.place_url) ? ev.place_url : null;
  const desc = esc(L(ev, 'description')).replace(/\n/g, '<br>');

  root.innerHTML =
    '<div class="ev-hero"' + (ev.cover_url ? ' style="background-image:url(\'' + esc(ev.cover_url) + '\')"' : '') + '>' +
      '<div class="ev-hero-in">' +
        '<div class="section-label">' + esc(t('ev.label')) + '</div>' +
        '<h1>' + esc(L(ev, 'title')) + '</h1>' +
        '<div class="ev-meta">' +
          '<div><span>' + esc(t('ev.when')) + '</span><b>' + esc(L(ev, 'date_text')) + '</b></div>' +
          '<div><span>' + esc(t('ev.where')) + '</span><b>' + (placeUrl ? '<a href="' + esc(placeUrl) + '">' + esc(L(ev, 'place')) + '</a>' : esc(L(ev, 'place'))) + '</b></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="ev-body">' +
      '<div class="ev-desc">' + (desc ? '<p>' + desc + '</p>' : '') +
        '<p class="ev-going"><i></i>' + esc(going) + '</p></div>' +
      '<div class="ev-card" id="evAction">' + actionHTML() + '</div>' +
    '</div>';
}

function actionHTML() {
  const err = msg ? '<div class="auth-msg show error" role="alert">' + esc(msg) + '</div>' : '';
  const closed = ev.status !== 'published';
  const full = ev.capacity && ev.going >= ev.capacity;

  if (reg && reg.status === 'attended') return '<h2>' + esc(t('ev.attended')) + '</h2>' + linksHTML();
  if (reg && reg.status === 'registered') {
    return '<h2>' + esc(t('ev.in_title')) + '</h2><p class="auth-lead">' + esc(t('ev.in_text')) + '</p>' + err +
      linksHTML() +
      (closed ? '' : '<button type="button" class="auth-link ev-cancel" data-act="cancel">' + esc(t('ev.cancel')) + '</button>');
  }
  if (closed) return '<p class="auth-lead">' + esc(t('ev.closed')) + '</p>';
  if (full) return '<p class="auth-lead">' + esc(t('ev.full')) + '</p>';

  const cancelledNote = reg && reg.status === 'cancelled' ? '<p class="an-note" style="margin:0 0 14px">' + esc(t('ev.cancelled')) + '</p>' : '';

  // Signed in
  if (user) {
    if (!me || !me.consent_at) {
      return '<p class="auth-lead">' + esc(t('ev.need_consent')) + '</p>' +
        '<a class="btn btn-earth auth-btn" href="/consent?next=' + encodeURIComponent(here) + '">' + esc(t('ev.consent_btn')) + '</a>';
    }
    const needPhone = !me.phone;
    return cancelledNote + err +
      (needPhone ? '<div class="auth-field" style="margin-bottom:14px"><label for="evPhone">' + esc(t('ev.phone')) + '</label>' +
        '<input id="evPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="' + esc(t('ev.phone_ph')) + '">' +
        '<div class="auth-hint">' + esc(t('ev.phone_hint')) + '</div></div>' : '') +
      '<button type="button" class="btn btn-earth auth-btn" data-act="go"' + (busy ? ' disabled' : '') + '>' + esc(t('ev.go')) + '</button>';
  }

  // Guest: short sign-up form right here
  if (view !== 'join') {
    return cancelledNote + '<button type="button" class="btn btn-earth auth-btn" data-act="open">' + esc(t('ev.go')) + '</button>' +
      '<p class="auth-foot">' + esc(t('ev.have_account')) + ' <a href="/login?next=' + encodeURIComponent(here) + '">' + esc(t('ev.signin')) + '</a></p>';
  }
  return '<h2>' + esc(t('ev.join_title')) + '</h2><p class="auth-lead">' + esc(t('ev.join_lead')) + '</p>' +
    '<form class="auth-form" id="evForm" novalidate>' +
      field('evName', t('acc.name'), 'text', 'name', t('acc.name.ph')) +
      field('evEmail', t('acc.email'), 'email', 'email', '') +
      field('evPhone', t('ev.phone'), 'tel', 'tel', t('ev.phone_ph'), t('ev.phone_hint')) +
      field('evPass', t('acc.password'), 'password', 'new-password', '', t('acc.register.pw_hint')) +
      '<div><label class="auth-check"><input type="checkbox" id="evConsent"><span>' + esc(t('acc.register.consent')) + '</span></label>' +
        '<details class="consent-more"><summary>' + esc(t('acc.register.consent_more')) + '</summary><div class="consent-text">' + t('acc.consent.text') + '</div></details></div>' +
      err +
      '<button type="submit" class="btn btn-earth auth-btn"' + (busy ? ' disabled' : '') + '>' + esc(t('ev.go')) + '</button>' +
    '</form>' +
    '<p class="auth-foot">' + esc(t('ev.have_account')) + ' <a href="/login?next=' + encodeURIComponent(here) + '">' + esc(t('ev.signin')) + '</a></p>';
}

function field(id, label, type, ac, ph, hint) {
  return '<div class="auth-field"><label for="' + id + '">' + esc(label) + '</label>' +
    '<input id="' + id + '" type="' + type + '" autocomplete="' + ac + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') +
    (type === 'tel' ? ' inputmode="tel"' : '') + (type === 'email' ? ' inputmode="email"' : '') + '>' +
    (hint ? '<div class="auth-hint">' + esc(hint) + '</div>' : '') + '</div>';
}

function linksHTML() {
  return '<div class="cab-anketa">' +
    '<a class="btn btn-outline" href="/anketa">' + esc(t('ev.anketa')) + '</a>' +
    '<a class="auth-link" href="/cabinet">' + esc(t('ev.cabinet')) + '</a>' +
    (ev.place_url === '/map' ? '<a class="auth-link" href="/map">' + esc(t('ev.map')) + '</a>' : '') +
  '</div>';
}

// ─── Actions ────────────────────────────────────────────────────────────────
async function register() {
  // insert first time; re-join after cancel = update back to registered
  let res;
  if (reg) res = await supabase.from('event_registrations').update({ status: 'registered' }).eq('id', reg.id).select().single();
  else res = await supabase.from('event_registrations').insert({ event_id: ev.id, user_id: user.id }).select().single();
  if (res.error) throw res.error;
  reg = res.data;
  await refreshEvent();
}

async function refreshEvent() {
  const { data } = await supabase.rpc('agora_event_public', { p_slug: slug });
  if (data) ev = data;
}

root.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || busy) return;
  const act = el.dataset.act;
  msg = '';
  if (act === 'open') { view = 'join'; render(); const n = document.getElementById('evName'); if (n) n.focus(); return; }
  busy = true;
  try {
    if (act === 'go') {
      if (!me.phone) {
        const ph = (document.getElementById('evPhone') || {}).value || '';
        if (!ph.trim()) throw new Error(t('ev.phone_need'));
        if (!PHONE_RE.test(ph.trim())) throw new Error(t('ev.phone_bad'));
        const { error } = await supabase.from('profiles').update({ phone: ph.trim() }).eq('id', user.id);
        if (error) throw error;
        me.phone = ph.trim();
      }
      await register();
    } else if (act === 'cancel') {
      const { data, error } = await supabase.from('event_registrations').update({ status: 'cancelled' }).eq('id', reg.id).select().single();
      if (error) throw error;
      reg = data;
      await refreshEvent();
    }
  } catch (err) {
    msg = err && err.message && !err.code ? err.message : errText(err);
  }
  busy = false;
  render();
});

root.addEventListener('submit', async (e) => {
  if (e.target.id !== 'evForm') return;
  e.preventDefault();
  if (busy) return;
  const v = (id) => document.getElementById(id).value.trim();
  const name = v('evName'), email = v('evEmail'), phone = v('evPhone'), pass = document.getElementById('evPass').value;
  msg = '';
  if (!name) msg = t('an.req_field');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) msg = t('acc.err.email');
  else if (!phone) msg = t('ev.phone_need');
  else if (!PHONE_RE.test(phone)) msg = t('ev.phone_bad');
  else if (pass.length < 8) msg = t('acc.err.weak');
  else if (!document.getElementById('evConsent').checked) msg = t('acc.register.need_consent');
  if (msg) { render(); restore({ name, email, phone }); return; }

  busy = true; render(); restore({ name, email, phone });
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { name, phone, lang: lang(), consent_version: CONSENT_VERSION }, emailRedirectTo: location.origin + here },
    });
    if (error) throw error;
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error(t('acc.err.exists'));
    if (!data.session) { busy = false; root.querySelector('#evAction').innerHTML = '<div class="auth-msg show ok">' + esc(t('acc.register.check_email')) + '</div>'; return; }
    user = data.session.user;
    me = await loadMe();
    await register();
    view = 'main';
  } catch (err) {
    msg = err && err.message && !err.code && !err.status ? err.message : errText(err);
  }
  busy = false;
  render();
  if (msg) restore({ name, email, phone });
});

function restore(vals) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('evName', vals.name); set('evEmail', vals.email); set('evPhone', vals.phone);
}

document.addEventListener('agora:lang', render);

// ─── Start ──────────────────────────────────────────────────────────────────
try {
  const { data, error } = await supabase.rpc('agora_event_public', { p_slug: slug });
  if (error) throw error;
  ev = data;
  user = await currentUser();
  if (ev && user) {
    me = await loadMe();
    const r = await supabase.from('event_registrations').select('*').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle();
    reg = r.data || null;
  }
} catch (err) {
  console.error(err);
}
render();
