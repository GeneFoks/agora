// Тест Big Five (IPIP-50): 5 страниц по 10 утверждений в перемешанном
// порядке, черновик держится в браузере, итог считает база.
import { supabase, t, lang, esc, pageTitle, requireMember, authErrorText } from './account.js';

const IP = window.AGORA_IPIP;
const root = document.getElementById('ipip');
const PAGES = Math.ceil(IP.items.length / IP.perPage);
const byN = {};
IP.items.forEach((it) => { byN[it.n] = it; });

let me = null;
let results = [];       // own results, newest first
let draft = null;       // { order: [n...], answers: {n: 1..5}, page }
let view = 'intro';     // intro | test | result
let shown = null;       // result row being shown
let msg = '';
let busy = false;

const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
const fmtDate = (d) => new Date(d).toLocaleDateString(lang() === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const draftKey = () => 'agora_ipip_draft_' + me.id;

function loadDraft() {
  try { const d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); if (d && Array.isArray(d.order) && d.order.length === 50) return d; } catch (_) {}
  return null;
}
function storeDraft() { try { localStorage.setItem(draftKey(), JSON.stringify(draft)); } catch (_) {} }
function dropDraft() { try { localStorage.removeItem(draftKey()); } catch (_) {} }

function shuffled() {
  const a = IP.items.map((it) => it.n);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function nextAllowed() {
  if (!results.length) return null;
  const d = new Date(results[0].taken_at);
  d.setMonth(d.getMonth() + IP.retakeMonths);
  return d;
}
const canTake = () => { const d = nextAllowed(); return !d || d <= new Date(); };

// ─── Views ──────────────────────────────────────────────────────────────────
function renderIntro() {
  const resume = draft && Object.keys(draft.answers).length > 0;
  root.innerHTML =
    '<div class="section-label">' + esc(t('ip.label')) + '</div>' +
    '<h1>' + esc(t('ip.title')) + '</h1>' +
    '<p class="auth-lead">' + esc(t('ip.intro')) + '</p>' +
    '<p class="an-note" style="margin:-10px 0 24px">' + esc(t('ip.disclaimer')) + '</p>' +
    '<div class="auth-msg' + (msg ? ' show error' : '') + '">' + esc(msg) + '</div>' +
    '<button type="button" class="btn btn-earth" data-act="start">' + esc(t(resume ? 'ip.resume' : 'ip.start')) + '</button>';
}

function renderTest() {
  const page = draft.page;
  const slice = draft.order.slice(page * IP.perPage, (page + 1) * IP.perPage);
  const answeredTotal = Object.keys(draft.answers).length;
  const pct = Math.round((answeredTotal / 50) * 100);
  const scale = [1, 2, 3, 4, 5].map((v) => t('ip.s' + v));

  root.innerHTML =
    '<div class="an-top">' +
      '<div class="an-stepline"><span>' + esc(tf('ip.page', { n: page + 1, total: PAGES })) + '</span><span>' + answeredTotal + ' / 50</span></div>' +
      '<div class="an-bar"><i style="width:' + pct + '%"></i></div>' +
    '</div>' +
    '<div class="ip-hint">' + esc(t('ip.scale_hint')) + '</div>' +
    '<div class="ip-items">' + slice.map((n) => {
      const it = byN[n];
      const val = draft.answers[n];
      const miss = msg && !val;
      return '<div class="ip-item' + (miss ? ' miss' : '') + '" data-n="' + n + '">' +
        '<div class="ip-text">' + esc(lang() === 'en' ? it.en : it.ru) + '</div>' +
        '<div class="ip-scale">' +
          '<span class="ip-pole">' + esc(scale[0]) + '</span>' +
          '<div class="ip-dots">' + [1, 2, 3, 4, 5].map((v) =>
            '<button type="button" class="an-dot' + (val === v ? ' on' : '') + '" data-act="ans" data-n="' + n + '" data-v="' + v +
            '" aria-pressed="' + (val === v) + '" aria-label="' + esc(scale[v - 1]) + '" title="' + esc(scale[v - 1]) + '"></button>').join('') +
          '</div>' +
          '<span class="ip-pole right">' + esc(scale[4]) + '</span>' +
        '</div>' +
        (val ? '<div class="ip-chosen">' + esc(scale[val - 1]) + '</div>' : '') +
      '</div>';
    }).join('') + '</div>' +
    '<div class="auth-msg' + (msg ? ' show error' : '') + '" role="alert">' + esc(msg) + '</div>' +
    '<div class="an-nav">' +
      (page > 0 ? '<button type="button" class="btn btn-outline" data-act="back">' + esc(t('ip.back')) + '</button>' : '<span></span>') +
      '<button type="button" class="btn btn-earth" data-act="next">' + esc(t(page === PAGES - 1 ? 'ip.submit' : 'ip.next')) + '</button>' +
    '</div>';
}

function bars(row) {
  return IP.factors.map((f) => {
    const score = IP.displayScore(row, f);
    const lvl = IP.level(f.id, score);
    const pct = Math.round(((score - 10) / 40) * 100);
    const th = IP.thresholds[f.id];
    const lo = ((th.low_max + 0.5 - 10) / 40) * 100, hi = ((th.high_min - 0.5 - 10) / 40) * 100;
    const en = lang() === 'en';
    return '<div class="ip-factor">' +
      '<div class="ip-fhead"><b>' + esc(en ? f.en : f.ru) + '</b><span class="ip-lvl ' + lvl + '">' + esc(t('ip.level.' + lvl)) + ' · ' + score + '</span></div>' +
      '<div class="ip-track"><i class="ip-band" style="left:' + lo + '%;width:' + (hi - lo) + '%"></i><i class="ip-fill" style="width:' + pct + '%"></i></div>' +
      '<div class="ip-poles"><span>' + esc(en ? f.low_en : f.low_ru) + '</span><span>' + esc(en ? f.high_en : f.high_ru) + '</span></div>' +
      '<p class="ip-explain">' + esc(IP.texts[f.id][lvl][en ? 'en' : 'ru']) + '</p>' +
    '</div>';
  }).join('');
}

function renderResult() {
  const row = shown;
  const next = nextAllowed();
  const vis = row.visibility;
  const visBtns = ['all', 'coordinators', 'self'].map((v) =>
    '<button type="button" class="an-seg' + (vis === v ? ' on' : '') + '" data-act="vis" data-v="' + v + '" aria-pressed="' + (vis === v) + '">' +
      esc(t('an.vis.' + v)) + '</button>').join('');
  const history = results.length > 1
    ? '<div class="ip-history"><div class="an-label">' + esc(t('ip.history')) + '</div>' + results.map((r) =>
        '<button type="button" class="an-chip' + (r.id === row.id ? ' on' : '') + '" data-act="show" data-v="' + r.id + '">' + esc(fmtDate(r.taken_at)) + '</button>').join(' ') + '</div>'
    : '';

  root.innerHTML =
    '<div class="section-label">' + esc(t('ip.label')) + '</div>' +
    '<h1>' + esc(t('ip.result')) + '</h1>' +
    '<p class="an-note" style="margin:-4px 0 24px">' + esc(tf('ip.taken', { date: fmtDate(row.taken_at) })) + '</p>' +
    '<div class="ip-factors">' + bars(row) + '</div>' +
    '<p class="an-note ip-disc">' + esc(t('ip.disclaimer')) + '</p>' +
    history +
    '<div class="an-vis"><div class="an-label">' + esc(t('ip.vis.label')) + '</div><div class="an-segs">' + visBtns + '</div></div>' +
    '<div class="auth-msg' + (msg ? ' show error' : '') + '" role="alert">' + esc(msg) + '</div>' +
    '<div class="cab-anketa">' +
      (canTake() ? '<button type="button" class="btn btn-earth" data-act="retake">' + esc(t('ip.retake')) + '</button>'
                 : '<p class="an-note">' + esc(tf('ip.retake_at', { date: fmtDate(next) })) + '</p>') +
      '<a class="btn btn-outline" href="/cabinet">' + esc(t('ip.to_cabinet')) + '</a>' +
    '</div>';
}

function render() {
  if (view === 'test') renderTest();
  else if (view === 'result') renderResult();
  else renderIntro();
}

// ─── Actions ────────────────────────────────────────────────────────────────
async function submit() {
  busy = true;
  const btn = root.querySelector('[data-act="next"]');
  if (btn) { btn.disabled = true; btn.textContent = t('ip.saving'); }
  const raw = {};
  for (let n = 1; n <= 50; n++) raw[n] = draft.answers[n];
  const en = lang() === 'en';
  const { data, error } = await supabase.from('ipip_results').insert({
    user_id: me.id,
    test_version: IP.version,
    item_lang: en ? 'en' : 'ru',
    translation: en ? 'en-original' : IP.translation.id,
    raw_answers: raw,
  }).select().single();
  busy = false;
  if (error) {
    msg = /retake_too_soon/.test(error.message) ? t('ip.err.too_soon') : authErrorText(error);
    render();
    return;
  }
  dropDraft();
  draft = null;
  results.unshift(data);
  shown = data;
  view = 'result';
  msg = '';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

root.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || busy) return;
  const act = el.dataset.act;

  if (act === 'start' || act === 'retake') {
    if (!canTake()) { msg = t('ip.err.too_soon'); render(); return; }
    if (!draft) draft = { order: shuffled(), answers: {}, page: 0 };
    storeDraft();
    view = 'test'; msg = '';
    render(); window.scrollTo({ top: 0 });
  } else if (act === 'ans') {
    const n = Number(el.dataset.n);
    draft.answers[n] = Number(el.dataset.v);
    storeDraft();
    const item = el.closest('.ip-item');
    item.classList.remove('miss');
    item.querySelectorAll('.an-dot').forEach((d) => { const on = d === el; d.classList.toggle('on', on); d.setAttribute('aria-pressed', on); });
    let chosen = item.querySelector('.ip-chosen');
    if (!chosen) { chosen = document.createElement('div'); chosen.className = 'ip-chosen'; item.appendChild(chosen); }
    chosen.textContent = t('ip.s' + draft.answers[n]);
    const cnt = Object.keys(draft.answers).length;
    const line = root.querySelector('.an-stepline span:last-child'); if (line) line.textContent = cnt + ' / 50';
    const bar = root.querySelector('.an-bar i'); if (bar) bar.style.width = Math.round((cnt / 50) * 100) + '%';
  } else if (act === 'next') {
    const slice = draft.order.slice(draft.page * IP.perPage, (draft.page + 1) * IP.perPage);
    const left = slice.filter((n) => !draft.answers[n]).length;
    if (left) {
      msg = tf('ip.unanswered', { k: left });
      render();
      const miss = root.querySelector('.ip-item.miss');
      if (miss) miss.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    msg = '';
    if (draft.page === PAGES - 1) { await submit(); return; }
    draft.page++; storeDraft();
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (act === 'back') {
    msg = ''; draft.page = Math.max(0, draft.page - 1); storeDraft();
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (act === 'vis') {
    const v = el.dataset.v;
    const { error } = await supabase.from('ipip_results').update({ visibility: v }).eq('user_id', me.id);
    if (error) { msg = authErrorText(error); render(); return; }
    results.forEach((r) => { r.visibility = v; });
    msg = ''; render();
  } else if (act === 'show') {
    shown = results.find((r) => r.id === el.dataset.v) || shown;
    render();
  }
});

document.addEventListener('agora:lang', () => render());

// ─── Start ──────────────────────────────────────────────────────────────────
pageTitle('ip.title');
try {
  me = await requireMember();
  if (me) {
    const { data, error } = await supabase.from('ipip_results')
      .select('id,taken_at,test_version,item_lang,extraversion,agreeableness,conscientiousness,emotional_stability,openness,visibility')
      .eq('user_id', me.id).order('taken_at', { ascending: false });
    if (error) throw error;
    results = data || [];
    draft = loadDraft();
    if (results.length && !canTake()) { view = 'result'; shown = results[0]; dropDraft(); draft = null; }
    else if (draft && Object.keys(draft.answers).length) view = 'test';
    else if (results.length && new URLSearchParams(location.search).get('view') !== 'retake') { view = 'result'; shown = results[0]; }
    render();
  }
} catch (err) {
  root.innerHTML = '<div class="auth-msg show error">' + esc(authErrorText(err)) + '</div>';
}
