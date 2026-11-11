// Анкета агорца: один блок — один экран, автосохранение после каждого блока,
// видимость блока (всем / координаторам / только мне) проверяет база.
import { supabase, t, lang, esc, pageTitle, requireMember, authErrorText } from './account.js';

const CFG = window.AGORA_ANKETA;
const BLOCKS = CFG.blocks;
const TOTAL = BLOCKS.length;
const root = document.getElementById('anketa');

let me = null;
let answers = {};          // block_id → { data, visibility }
let progress = {};         // profiles.anketa_progress
let idx = 0;               // current block index
let draft = {};            // edits for the current block
let vis = 'coordinators';
let dirty = false;
let errors = {};           // field id → message
let busy = false;
let done = false;

const L = (o) => (o ? (o[lang()] || o.ru || '') : '');
const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
const optLabel = (opt) => opt[lang()] || opt.ru;

function roleOptions() {
  return CFG.roles.map((r) => ({ v: r.v, ru: r.ru, en: r.en, hint: lang() === 'en' ? r.hint_en : r.hint_ru }));
}
function optionsFor(f) {
  if (f.source === 'values') return CFG.values;
  if (f.type === 'roles') return roleOptions();
  return f.options || [];
}

// ─── Rendering ──────────────────────────────────────────────────────────────
function chip(act, fid, v, label, on, disabled, extra) {
  return '<button type="button" class="an-chip' + (on ? ' on' : '') + '" data-act="' + act + '" data-f="' + fid +
    '" data-v="' + esc(v) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') +
    (extra || '') + '>' + esc(label) + '</button>';
}

function fieldHTML(f) {
  const val = draft[f.id];
  const err = errors[f.id] ? '<div class="an-err">' + esc(errors[f.id]) + '</div>' : '';
  let label = esc(L(f.label));
  if (f.required) label += ' <span class="an-req">*</span>';
  if (f.type === 'multi' && f.max) label += ' <span class="an-note">(' + esc(tf('an.max', { n: f.max })) + ')</span>';
  let body = '';

  switch (f.type) {
    case 'text':
      body = '<input class="an-input" type="text" data-k="text" data-f="' + f.id + '" maxlength="' + (f.max || 300) +
        '" value="' + esc(val || '') + '">';
      break;
    case 'textarea':
      body = '<textarea class="an-input" rows="3" data-k="text" data-f="' + f.id + '" maxlength="' + (f.max || 1000) + '">' +
        esc(val || '') + '</textarea>';
      break;
    case 'number':
      body = '<input class="an-input an-num" type="number" inputmode="numeric" data-k="number" data-f="' + f.id +
        '" min="' + f.min + '" max="' + f.max + '" value="' + (val == null ? '' : esc(val)) + '">';
      break;
    case 'single':
      body = '<div class="an-chips">' + f.options.map((o) => chip('single', f.id, o.v, optLabel(o), val === o.v)).join('') + '</div>';
      break;
    case 'multi': {
      const arr = Array.isArray(val) ? val : [];
      const full = f.max && arr.length >= f.max;
      body = '<div class="an-chips">' + f.options.map((o) => {
        const on = arr.indexOf(o.v) !== -1;
        return chip('multi', f.id, o.v, optLabel(o), on, full && !on);
      }).join('');
      if (f.other) {
        const otherOn = draft[f.id + '_other'] != null;
        body += chip('other', f.id, '_other', t('an.other'), otherOn, false);
        body += '</div>';
        if (otherOn) {
          body += '<input class="an-input" style="margin-top:10px" type="text" maxlength="120" data-k="text" data-f="' + f.id +
            '_other" placeholder="' + esc(t('an.other_ph')) + '" value="' + esc(draft[f.id + '_other'] || '') + '">';
        }
      } else {
        body += '</div>';
      }
      break;
    }
    case 'roles': {
      const arr = Array.isArray(val) ? val : [];
      const taken = [draft.role_primary, draft.role_secondary];
      body = '<div class="an-chips">' + roleOptions().map((o) => {
        const on = arr.indexOf(o.v) !== -1;
        return chip('multi', f.id, o.v, optLabel(o), on, !on && taken.indexOf(o.v) !== -1, ' title="' + esc(o.hint) + '"');
      }).join('') + '</div>';
      break;
    }
    case 'select':
      body = '<select class="an-input" data-k="select" data-f="' + f.id + '"><option value="">' + esc(t('an.none')) + '</option>' +
        f.options.map((o) => '<option value="' + esc(o.v) + '"' + (val === o.v ? ' selected' : '') + '>' + esc(optLabel(o)) + '</option>').join('') +
        '</select>';
      break;
    case 'role': {
      const blocked = f.exclude ? draft[f.exclude] : null;
      const avoid = Array.isArray(draft.role_avoid) ? draft.role_avoid : [];
      body = '<div class="an-roles">' + roleOptions().map((o) => {
        const on = val === o.v;
        const dis = !on && (o.v === blocked || avoid.indexOf(o.v) !== -1);
        return '<button type="button" class="an-role' + (on ? ' on' : '') + '" data-act="role" data-f="' + f.id + '" data-v="' + o.v +
          '" aria-pressed="' + on + '"' + (dis ? ' disabled' : '') + '><b>' + esc(optLabel(o)) + '</b><span>' + esc(o.hint) + '</span></button>';
      }).join('') + '</div>';
      break;
    }
    case 'list': {
      const arr = Array.isArray(val) ? val : [];
      body = '<div class="an-list">';
      for (let i = 0; i < f.max; i++) {
        body += '<input class="an-input" type="text" data-k="list" data-f="' + f.id + '" data-i="' + i + '" maxlength="' +
          (f.maxlen || 120) + '" value="' + esc(arr[i] || '') + '" placeholder="' + (i + 1) + '">';
      }
      body += '</div>';
      break;
    }
    case 'links': {
      const arr = Array.isArray(val) ? val : [];
      body = '<div class="an-links">' + arr.map((l, i) =>
        '<div class="an-link-row">' +
          '<select class="an-input" data-k="link-type" data-f="' + f.id + '" data-i="' + i + '">' +
            f.options.map((o) => '<option value="' + o.v + '"' + (l.type === o.v ? ' selected' : '') + '>' + esc(optLabel(o)) + '</option>').join('') +
          '</select>' +
          '<input class="an-input" type="url" inputmode="url" data-k="link-url" data-f="' + f.id + '" data-i="' + i +
            '" maxlength="300" placeholder="' + esc(t('an.link_ph')) + '" value="' + esc(l.url || '') + '">' +
          '<button type="button" class="an-x" data-act="link-del" data-f="' + f.id + '" data-v="' + i + '" aria-label="×">×</button>' +
        '</div>').join('') + '</div>';
      if (arr.length < (f.max || 8)) {
        body += '<button type="button" class="auth-link an-add" data-act="link-add" data-f="' + f.id + '">' + esc(t('an.add_link')) + '</button>';
      }
      break;
    }
    case 'pick': {
      const arr = Array.isArray(val) ? val : [];
      const other = Array.isArray(draft[f.exclude]) ? draft[f.exclude] : [];
      const full = arr.length >= f.exact;
      label += ' <span class="an-note">' + arr.length + ' / ' + f.exact + '</span>';
      body = '<div class="an-chips">' + optionsFor(f).map((o) => {
        const on = arr.indexOf(o.v) !== -1;
        return chip('pick', f.id, o.v, optLabel(o), on, !on && (full || other.indexOf(o.v) !== -1));
      }).join('') + '</div>';
      break;
    }
    case 'slider': {
      body = '<div class="an-slider"><span class="an-pole">' + esc(L(f.left)) + '</span><div class="an-dots">';
      for (let i = 1; i <= 5; i++) {
        body += '<button type="button" class="an-dot' + (val === i ? ' on' : '') + '" data-act="slider" data-f="' + f.id +
          '" data-v="' + i + '" aria-pressed="' + (val === i) + '" aria-label="' + i + '"></button>';
      }
      body += '</div><span class="an-pole right">' + esc(L(f.right)) + '</span></div>';
      break;
    }
    case 'matrix': {
      const m = val && typeof val === 'object' ? val : {};
      body = '<div class="an-matrix">' + f.rows.map((r) =>
        '<div class="an-mrow"><span class="an-mlabel">' + esc(optLabel(r)) + '</span><div class="an-mcells">' +
          f.cols.map((c) => chip('matrix', f.id, r.v + '|' + c.v, optLabel(c), m[r.v] === c.v)).join('') +
        '</div></div>').join('') + '</div><div class="an-note" style="margin-top:8px">' + esc(t('an.matrix_hint')) + '</div>';
      break;
    }
  }
  return '<div class="an-field" data-field="' + f.id + '"><div class="an-label">' + label + '</div>' + body + err + '</div>';
}

function render(msg) {
  if (done) return renderDone();
  const b = BLOCKS[idx];
  const pct = Math.round((idx / TOTAL) * 100);
  const visBtns = ['all', 'coordinators', 'self'].map((v) =>
    '<button type="button" class="an-seg' + (vis === v ? ' on' : '') + '" data-act="vis" data-v="' + v + '" aria-pressed="' + (vis === v) + '">' +
      esc(t('an.vis.' + v)) + '</button>').join('');

  root.innerHTML =
    '<div class="an-top">' +
      '<div class="an-stepline"><span>' + esc(tf('an.step', { n: idx + 1, total: TOTAL })) + '</span>' +
        '<span>' + esc(tf('an.block', { n: b.num })) + '</span></div>' +
      '<div class="an-bar"><i style="width:' + pct + '%"></i></div>' +
    '</div>' +
    '<h1>' + esc(L(b.title)) + '</h1>' +
    (b.required ? '<div class="cab-badge" style="margin-bottom:12px">' + esc(t('an.required')) + '</div>' : '') +
    '<p class="auth-lead">' + esc(L(b.intro)) + '</p>' +
    '<div class="an-fields">' + b.fields.map(fieldHTML).join('') + '</div>' +
    '<div class="an-vis"><div class="an-label">' + esc(t('an.vis.label')) + '</div><div class="an-segs">' + visBtns + '</div></div>' +
    '<div class="auth-msg' + (msg ? ' show error' : '') + '" id="anMsg" role="alert">' + esc(msg || '') + '</div>' +
    '<div class="an-nav">' +
      (idx > 0 ? '<button type="button" class="btn btn-outline" data-act="back">' + esc(t('an.back')) + '</button>' : '<span></span>') +
      '<div class="an-nav-right">' +
        (!b.required ? '<button type="button" class="auth-link" data-act="skip">' + esc(t('an.skip')) + '</button>' : '') +
        '<button type="button" class="btn btn-earth" data-act="next">' + esc(t(idx === TOTAL - 1 ? 'an.finish' : 'an.next')) + '</button>' +
      '</div>' +
    '</div>';
}

function renderDone() {
  root.innerHTML =
    '<div class="an-top"><div class="an-bar"><i style="width:100%"></i></div></div>' +
    '<h1>' + esc(t('an.done.title')) + '</h1>' +
    '<p class="auth-lead">' + esc(t('an.done.text')) + '</p>' +
    '<div class="cab-anketa">' +
      '<a class="btn btn-earth" href="/test">' + esc(t('an.done.test')) + '</a>' +
      '<a class="btn btn-outline" href="/cabinet">' + esc(t('an.done.cabinet')) + '</a>' +
    '</div>';
}

// ─── State ──────────────────────────────────────────────────────────────────
function loadBlock(i) {
  idx = Math.max(0, Math.min(TOTAL - 1, i));
  const b = BLOCKS[idx];
  const saved = answers[b.id];
  draft = saved ? JSON.parse(JSON.stringify(saved.data || {})) : {};
  if (b.id === 'b0' && !saved) {
    // Prefill from the profile created at sign-up.
    if (me.name) draft.name = me.name;
    if (me.city) draft.city = me.city;
  }
  vis = saved ? saved.visibility : (b.id === 'b0' ? (me.header_visibility || 'coordinators') : 'coordinators');
  dirty = false;
  errors = {};
  done = false;
  const u = new URL(location.href);
  u.searchParams.set('block', b.id);
  history.replaceState(null, '', u);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function normUrl(type, raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('@')) {
    const h = s.slice(1);
    if (type === 'telegram') return 'https://t.me/' + h;
    if (type === 'instagram') return 'https://instagram.com/' + h;
    if (type === 'youtube') return 'https://youtube.com/@' + h;
  }
  if (!/^https?:\/\//i.test(s) && /^[^\s/]+\.[^\s]+/.test(s)) s = 'https://' + s;
  return s;
}

// Trim strings, drop empty values. Returns a clean copy of the draft.
function clean(b) {
  const out = {};
  b.fields.forEach((f) => {
    let v = draft[f.id];
    if (f.type === 'text' || f.type === 'textarea') v = typeof v === 'string' ? v.trim().slice(0, f.max || 1000) : '';
    if (f.type === 'number') v = v === '' || v == null || isNaN(v) ? null : Math.max(f.min, Math.min(f.max, Math.round(Number(v))));
    if (f.type === 'list') v = (Array.isArray(v) ? v : []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, f.max);
    if (f.type === 'links') v = (Array.isArray(v) ? v : []).map((l) => ({ type: l.type, url: normUrl(l.type, l.url) })).filter((l) => l.url);
    if (f.type === 'matrix') v = v && typeof v === 'object' ? v : {};
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
    if (!empty) out[f.id] = v;
    if (f.other) {
      const ov = typeof draft[f.id + '_other'] === 'string' ? draft[f.id + '_other'].trim().slice(0, 120) : '';
      if (ov) out[f.id + '_other'] = ov;
    }
  });
  return out;
}

function validate(b, data) {
  errors = {};
  b.fields.forEach((f) => {
    if (f.required && data[f.id] == null) errors[f.id] = f.type === 'role' ? t('an.req_role') : t('an.req_field');
    if (f.type === 'pick' && Array.isArray(data[f.id]) && data[f.id].length !== f.exact) {
      errors[f.id] = tf('an.pick_exact', { n: f.exact, k: data[f.id].length });
    }
    if (f.type === 'links' && Array.isArray(data[f.id]) && data[f.id].some((l) => !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(l.url))) {
      errors[f.id] = t('an.bad_url');
    }
  });
  return !Object.keys(errors).length;
}

async function saveBlock(b, data) {
  const { error } = await supabase.from('answers').upsert(
    { user_id: me.id, block_id: b.id, version: CFG.version, data, visibility: vis },
    { onConflict: 'user_id,block_id' }
  );
  if (error) throw error;
  answers[b.id] = { data, visibility: vis };

  if (b.id === 'b0') {
    const langs = (data.languages || []).slice();
    if (data.languages_other) langs.push(data.languages_other);
    const upd = { name: data.name, city: data.city || null, languages: langs, links: data.links || [], header_visibility: vis };
    const { error: e2 } = await supabase.from('profiles').update(upd).eq('id', me.id);
    if (e2) throw e2;
    Object.assign(me, upd);
  }
}

async function saveProgress(step, completed) {
  progress = Object.assign({}, progress, { step: step });
  if (completed) progress.completed_at = new Date().toISOString();
  progress.version = CFG.version;
  await supabase.from('profiles').update({ anketa_progress: progress }).eq('id', me.id);
}

async function go(direction) {
  if (busy) return;
  const b = BLOCKS[idx];
  const data = clean(b);
  const skipping = direction === 'skip';

  if (direction === 'next' && !validate(b, data)) {
    render();
    const first = root.querySelector('.an-err');
    if (first) first.closest('.an-field').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  busy = true;
  setButtons(true);
  try {
    const hasData = Object.keys(data).length > 0;
    const saved = answers[b.id];
    const changed = dirty || (saved && saved.visibility !== vis);
    // Save new data, or changes to an existing row. A skip never saves;
    // going back saves only if the block is valid (otherwise edits are dropped).
    const shouldSave = !skipping && ((hasData && (changed || !saved)) || (saved && changed));
    if (shouldSave && (direction !== 'back' || validate(b, data))) await saveBlock(b, data);
    if (direction === 'back') {
      loadBlock(idx - 1);
    } else if (idx === TOTAL - 1) {
      await saveProgress(TOTAL, true);
      done = true;
      const u = new URL(location.href);
      u.searchParams.delete('block');
      history.replaceState(null, '', u);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (!progress.completed_at || (progress.step || 0) < idx + 1) await saveProgress(Math.max(progress.step || 0, idx + 1));
      loadBlock(idx + 1);
    }
  } catch (err) {
    render(t('an.save_err') + ' (' + authErrorText(err) + ')');
  } finally {
    busy = false;
    setButtons(false);
  }
}

function setButtons(disabled) {
  root.querySelectorAll('[data-act="next"],[data-act="back"],[data-act="skip"]').forEach((el) => { el.disabled = disabled; });
  const n = root.querySelector('[data-act="next"]');
  if (n && disabled) n.textContent = t('an.saving');
}

// ─── Events ─────────────────────────────────────────────────────────────────
function fieldById(id) { return BLOCKS[idx].fields.find((f) => f.id === id); }

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const fid = el.dataset.f;
  const v = el.dataset.v;

  if (act === 'next' || act === 'back' || act === 'skip') { go(act); return; }

  if (act === 'vis') vis = v;
  else if (act === 'single' || act === 'role') draft[fid] = draft[fid] === v ? undefined : v;
  else if (act === 'multi' || act === 'pick') {
    const arr = Array.isArray(draft[fid]) ? draft[fid].slice() : [];
    const i = arr.indexOf(v);
    if (i === -1) arr.push(v); else arr.splice(i, 1);
    draft[fid] = arr;
  } else if (act === 'other') {
    if (draft[fid + '_other'] != null) delete draft[fid + '_other']; else draft[fid + '_other'] = '';
  } else if (act === 'slider') {
    const n = Number(v);
    draft[fid] = draft[fid] === n ? undefined : n;
  } else if (act === 'matrix') {
    const [row, col] = v.split('|');
    const m = Object.assign({}, draft[fid] || {});
    if (m[row] === col) delete m[row]; else m[row] = col;
    draft[fid] = m;
  } else if (act === 'link-add') {
    const f = fieldById(fid);
    const arr = Array.isArray(draft[fid]) ? draft[fid].slice() : [];
    const used = arr.map((l) => l.type);
    const nextType = (f.options.find((o) => used.indexOf(o.v) === -1) || f.options[f.options.length - 1]).v;
    arr.push({ type: nextType, url: '' });
    draft[fid] = arr;
  } else if (act === 'link-del') {
    const arr = (draft[fid] || []).slice();
    arr.splice(Number(v), 1);
    draft[fid] = arr;
  } else return;

  dirty = true;
  if (errors[fid]) delete errors[fid];
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
  if (act === 'other' && draft[fid + '_other'] === '') {
    const inp = root.querySelector('[data-f="' + fid + '_other"]');
    if (inp) inp.focus();
  }
});

root.addEventListener('input', (e) => {
  const el = e.target.closest('[data-k]');
  if (!el) return;
  const k = el.dataset.k;
  const fid = el.dataset.f;
  if (k === 'text' || k === 'select') draft[fid] = el.value;
  else if (k === 'number') draft[fid] = el.value === '' ? '' : Number(el.value);
  else if (k === 'list') {
    const arr = Array.isArray(draft[fid]) ? draft[fid].slice() : [];
    arr[Number(el.dataset.i)] = el.value;
    draft[fid] = arr;
  } else if (k === 'link-url' || k === 'link-type') {
    const arr = (draft[fid] || []).map((l) => Object.assign({}, l));
    arr[Number(el.dataset.i)][k === 'link-url' ? 'url' : 'type'] = el.value;
    draft[fid] = arr;
  }
  dirty = true;
});
// <select> fires "change" in some browsers without "input".
root.addEventListener('change', (e) => {
  if (e.target.matches('select[data-k]')) e.target.dispatchEvent(new Event('input', { bubbles: true }));
});

document.addEventListener('agora:lang', () => render());

// ─── Start ──────────────────────────────────────────────────────────────────
pageTitle('an.title');
try {
  me = await requireMember();
  if (me) {
    const [ans, prof] = await Promise.all([
      supabase.from('answers').select('block_id,data,visibility').eq('user_id', me.id),
      supabase.from('profiles').select('anketa_progress').eq('id', me.id).single(),
    ]);
    if (ans.error) throw ans.error;
    (ans.data || []).forEach((r) => { answers[r.block_id] = { data: r.data, visibility: r.visibility }; });
    progress = (prof.data && prof.data.anketa_progress) || {};

    const want = new URLSearchParams(location.search).get('block');
    const wantIdx = BLOCKS.findIndex((b) => b.id === want);
    let start = wantIdx !== -1 ? wantIdx : (progress.completed_at ? 0 : (progress.step || 0));
    // Required blocks first: can't land past them while they're empty.
    const firstMissingRequired = BLOCKS.findIndex((b) => b.required && !answers[b.id]);
    if (firstMissingRequired !== -1 && start > firstMissingRequired) start = firstMissingRequired;
    loadBlock(start);
  }
} catch (err) {
  root.innerHTML = '<div class="auth-msg show error">' + esc(authErrorText(err)) + '</div>';
}
