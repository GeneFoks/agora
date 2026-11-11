// Кабинет — «Портрет агорца»: шапка, кратко, блоки анкеты с видимостью и
// редактированием, Big Five, история развития, мои данные (экспорт/удаление).
import { supabase, t, lang, esc, pageTitle, requireMember, authErrorText } from './account.js';
import { ipipBars, ipipLine } from './ipip-view.js';
import { L, optName, roleName, skillName, safeUrl, fmtField } from './anketa-view.js';

const CFG = window.AGORA_ANKETA;
const IP = window.AGORA_IPIP;
const root = document.getElementById('cab');

let me = null;
let answers = {};      // block_id → { data, visibility }
let progress = {};
let tests = [];        // ipip results, newest first
let growth = [];
let photoUrl = null;
let msg = '';
let delOpen = false;
let busy = false;

const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
const fmtDate = (d) => new Date(d).toLocaleDateString(lang() === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function visSwitch(scope, current) {
  return '<div class="an-segs cab-vis">' + ['all', 'coordinators', 'self'].map((v) =>
    '<button type="button" class="an-seg' + (current === v ? ' on' : '') + '" data-act="vis" data-scope="' + scope +
    '" data-v="' + v + '" aria-pressed="' + (current === v) + '">' + esc(t('an.vis.' + v)) + '</button>').join('') + '</div>';
}

// ─── Sections ───────────────────────────────────────────────────────────────
function headerHTML() {
  const b1 = (answers.b1 || {}).data || {};
  const initial = (me.name || me.email || '?').trim().charAt(0).toUpperCase();
  const links = Array.isArray(me.links) ? me.links : [];
  const since = me.created_at ? fmtDate(me.created_at) : '';
  return '<div class="cab-head">' +
      '<div class="cab-photo">' +
        (photoUrl ? '<img class="cab-avatar" src="' + esc(photoUrl) + '" alt="">' : '<div class="cab-avatar">' + esc(initial) + '</div>') +
      '</div>' +
      '<div style="min-width:0">' +
        '<h1 style="margin:0 0 6px;">' + esc(me.name || '') + '</h1>' +
        (me.city ? '<div class="cab-meta" style="margin-bottom:8px">' + esc(me.city) + '</div>' : '') +
        '<div class="cab-badges">' +
          (b1.role_primary ? '<span class="cab-badge">' + esc(roleName(b1.role_primary)) + '</span>' : '') +
          (b1.role_secondary ? '<span class="cab-badge ghost">' + esc(roleName(b1.role_secondary)) + '</span>' : '') +
          (me.role && me.role !== 'member' ? '<span class="cab-badge sys">' + esc(t('role.' + me.role)) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="cab-photo-actions">' +
      '<label class="auth-link">' + esc(t(me.photo_url ? 'cab.photo.change' : 'cab.photo.add')) +
        '<input type="file" accept="image/jpeg,image/png,image/webp" data-act="photo" hidden></label>' +
      (me.photo_url ? '<button type="button" class="auth-link" data-act="photo-del">' + esc(t('cab.photo.remove')) + '</button>' : '') +
    '</div>' +
    (links.length ? '<div class="cab-links">' + links.map((l) => {
      const u = safeUrl(l.url);
      const f = CFG.blocks[0].fields.find((x) => x.id === 'links');
      return u ? '<a class="an-chip" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(optName(f.options, l.type)) + '</a>' : '';
    }).join('') + '</div>' : '') +
    '<div class="cab-meta">' + esc(me.email || '') + ' · ' + esc(t('acc.cab.since')) + ' ' + esc(since) + '</div>' +
    (me.role === 'coordinator' || me.role === 'admin'
      ? '<div class="cab-anketa"><a class="btn btn-earth" href="/members">' + esc(t('mem.open')) + '</a></div>' : '');
}

function summaryHTML() {
  const b1 = (answers.b1 || {}).data || {};
  const b3 = (answers.b3 || {}).data || {};
  const top = Array.isArray(b3.top3) ? b3.top3.map((x) => optName(CFG.values, x)).join(', ') : '';
  const row = (k, v) => '<div class="cab-row"><span>' + esc(t(k)) + '</span><b>' + (v ? esc(v) : '<i class="an-note">' + esc(t('cab.not_set')) + '</i>') + '</b></div>';
  return '<section class="cab-section"><h2>' + esc(t('cab.summary')) + '</h2>' +
    row('cab.role_main', [b1.role_primary, b1.role_secondary].filter(Boolean).map(roleName).join(' + ')) +
    row('cab.top_values', top) +
    row('cab.bigfive', tests[0] ? ipipLine(tests[0]) : t('cab.test_none')) +
  '</section>';
}

function blocksHTML() {
  const filled = CFG.blocks.filter((b) => answers[b.id]).length;
  const done = !!progress.completed_at;
  return '<section class="cab-section"><h2>' + esc(t('cab.answers')) + '</h2>' +
    '<p class="an-note" style="margin:-6px 0 16px">' + esc(tf('acc.cab.anketa_progress', { k: filled, total: CFG.blocks.length })) + '</p>' +
    (done ? '' : '<div class="cab-anketa" style="margin:0 0 18px"><a class="btn btn-earth" href="/anketa">' +
      esc(t(filled ? 'acc.cab.anketa_continue' : 'acc.cab.anketa_start')) + '</a></div>') +
    CFG.blocks.map((b) => {
      const saved = answers[b.id];
      const data = saved ? saved.data || {} : {};
      const rows = saved ? b.fields.map((f) => {
        const val = fmtField(f, data);
        return val ? '<div class="cab-ans"><span>' + esc(L(f.label)) + '</span><div>' + val + '</div></div>' : '';
      }).join('') : '';
      return '<div class="cab-block" id="' + b.id + '">' +
        '<div class="cab-bhead"><div><span class="an-note">' + esc(tf('an.block', { n: b.num })) + '</span><h3>' + esc(L(b.title)) + '</h3></div>' +
          '<a class="btn btn-outline cab-edit" href="/anketa?block=' + b.id + '&return=cabinet">' + esc(t(saved ? 'cab.edit' : 'cab.fill')) + '</a></div>' +
        (saved ? (rows || '<p class="an-note">' + esc(t('cab.empty')) + '</p>') + visSwitch(b.id, saved.visibility)
               : '<p class="an-note">' + esc(t('cab.empty')) + '</p>') +
      '</div>';
    }).join('') +
  '</section>';
}

function bigFiveHTML() {
  const last = tests[0];
  let body;
  if (!last) {
    body = '<p class="an-note">' + esc(t('ip.cab.none')) + '</p><div class="cab-anketa"><a class="btn btn-earth" href="/test">' + esc(t('ip.cab.take')) + '</a></div>';
  } else {
    const next = new Date(last.taken_at); next.setMonth(next.getMonth() + IP.retakeMonths);
    const canRetake = next <= new Date();
    body = '<p class="an-note" style="margin:-6px 0 16px">' + esc(tf('ip.taken', { date: fmtDate(last.taken_at) })) + '</p>' +
      '<div class="ip-factors">' + ipipBars(last, { compact: true }) + '</div>' +
      (tests.length > 1 ? '<p class="an-note">' + esc(tf('cab.history_dates', { list: tests.map((r) => fmtDate(r.taken_at)).join(', ') })) + '</p>' : '') +
      visSwitch('b4', last.visibility) +
      '<div class="cab-anketa" style="margin-top:16px">' +
        (canRetake ? '<a class="btn btn-earth" href="/test?view=retake">' + esc(t('ip.retake')) + '</a>'
                   : '<p class="an-note">' + esc(tf('ip.retake_at', { date: fmtDate(next) })) + '</p>') +
        '<a class="btn btn-outline" href="/test">' + esc(t('cab.details')) + '</a>' +
      '</div>';
  }
  return '<section class="cab-section" id="b4"><h2>' + esc(t('ip.cab.title')) + '</h2>' + body + '</section>';
}

function growthText(g) {
  const p = g.payload || {};
  const list = (arr) => (Array.isArray(arr) ? arr.map(skillName).join(', ') : '');
  switch (g.kind) {
    case 'role_changed': {
      const parts = [];
      if (p.to_primary !== p.from_primary) {
        parts.push(p.from_primary ? tf('g.role_changed', { from: roleName(p.from_primary), to: p.to_primary ? roleName(p.to_primary) : '—' })
                                  : tf('g.role_first', { to: roleName(p.to_primary) }));
      }
      if (p.to_secondary !== p.from_secondary && p.to_secondary) parts.push(tf('g.role_secondary', { to: roleName(p.to_secondary) }));
      return parts.join('. ') || tf('g.role_first', { to: roleName(p.to_primary) });
    }
    case 'skill_added': return tf('g.skill_added', { list: list(p.skills) });
    case 'skill_learning': return tf('g.skill_learning', { list: list(p.skills) });
    case 'test_taken': return t('g.test_taken');
    case 'anketa_completed': return t('g.anketa_completed');
    case 'note': return g.note || '';
  }
  return g.kind;
}

function growthHTML() {
  return '<section class="cab-section"><h2>' + esc(t('cab.growth')) + '</h2>' +
    '<div class="cab-note-form"><textarea class="an-input" id="noteText" rows="2" maxlength="1000" placeholder="' + esc(t('cab.growth.note_ph')) + '"></textarea>' +
      '<button type="button" class="btn btn-outline" data-act="note-add">' + esc(t('cab.growth.add')) + '</button></div>' +
    (growth.length ? '<ul class="cab-growth">' + growth.map((g) =>
      '<li class="' + (g.kind === 'note' ? 'note' : '') + '"><span class="cab-gdate">' + esc(fmtDate(g.created_at)) + '</span>' +
        '<span class="cab-gtext">' + esc(growthText(g)).replace(/\n/g, '<br>') + '</span>' +
        (g.kind === 'note' ? '<button type="button" class="an-x cab-gdel" data-act="note-del" data-v="' + g.id + '" aria-label="' + esc(t('cab.growth.del')) + '">×</button>' : '') +
      '</li>').join('') + '</ul>'
      : '<p class="an-note">' + esc(t('cab.growth.empty')) + '</p>') +
  '</section>';
}

function dataHTML() {
  const word = t('cab.del.word');
  return '<section class="cab-section"><h2>' + esc(t('cab.data')) + '</h2>' +
    '<p class="an-note" style="margin-bottom:16px">' + esc(t('cab.data.text')) + '</p>' +
    '<div class="cab-anketa">' +
      '<button type="button" class="btn btn-outline" data-act="export">' + esc(t('cab.data.download')) + '</button>' +
      (delOpen ? '' : '<button type="button" class="auth-link cab-danger" data-act="del-open">' + esc(t('cab.data.delete')) + '</button>') +
    '</div>' +
    (delOpen ? '<div class="cab-del">' +
      '<h3>' + esc(t('cab.del.title')) + '</h3>' +
      '<p>' + esc(tf('cab.del.text', { word: '«' + word + '»' })) + '</p>' +
      '<input class="an-input" id="delWord" autocomplete="off" placeholder="' + esc(word) + '">' +
      '<div class="an-nav" style="margin-top:14px">' +
        '<button type="button" class="btn btn-outline" data-act="del-cancel">' + esc(t('cab.del.cancel')) + '</button>' +
        '<button type="button" class="btn cab-danger-btn" data-act="del-go" id="delGo" disabled>' + esc(t('cab.del.confirm')) + '</button>' +
      '</div></div>' : '') +
  '</section>';
}

function render() {
  if (!me) return;
  const y = window.scrollY;
  root.innerHTML =
    '<div class="section-label">' + esc(t('acc.cab.label')) + '</div>' +
    headerHTML() +
    '<div class="auth-msg' + (msg ? ' show error' : '') + '" role="alert" style="margin-top:14px">' + esc(msg) + '</div>' +
    summaryHTML() + blocksHTML() + bigFiveHTML() + growthHTML() + dataHTML() +
    '<div style="margin-top:32px;"><button type="button" class="btn btn-outline" data-act="logout">' + esc(t('acc.cab.logout')) + '</button></div>';
  window.scrollTo({ top: y, behavior: 'instant' });
}

// ─── Data ───────────────────────────────────────────────────────────────────
async function loadAll() {
  const [ans, prof, ip, gr] = await Promise.all([
    supabase.from('answers').select('block_id,data,visibility,version,updated_at').eq('user_id', me.id),
    supabase.from('profiles').select('anketa_progress,photo_url').eq('id', me.id).single(),
    supabase.from('ipip_results').select('id,taken_at,extraversion,agreeableness,conscientiousness,emotional_stability,openness,visibility')
      .eq('user_id', me.id).order('taken_at', { ascending: false }),
    supabase.from('growth_log').select('id,kind,payload,note,created_at').eq('user_id', me.id)
      .order('created_at', { ascending: false }).limit(100),
  ]);
  for (const r of [ans, ip, gr]) if (r.error) throw r.error;
  answers = {};
  (ans.data || []).forEach((r) => { answers[r.block_id] = r; });
  progress = (prof.data && prof.data.anketa_progress) || {};
  me.photo_url = prof.data ? prof.data.photo_url : null;
  tests = ip.data || [];
  growth = gr.data || [];
  await loadPhoto();
}

async function loadPhoto() {
  photoUrl = null;
  if (!me.photo_url) return;
  const { data } = await supabase.storage.from('avatars').createSignedUrl(me.photo_url, 3600);
  photoUrl = data ? data.signedUrl : null;
}

// Shrink to ≤512px JPEG in the browser before upload.
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 512 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}

async function exportData() {
  const [meFull, roles, ans, ip, gr] = await Promise.all([
    supabase.rpc('agora_me'),
    supabase.from('user_roles').select('role,updated_at').eq('user_id', me.id),
    supabase.from('answers').select('*').eq('user_id', me.id),
    supabase.from('ipip_results').select('*').eq('user_id', me.id),
    supabase.from('growth_log').select('*').eq('user_id', me.id),
  ]);
  const dump = {
    exported_at: new Date().toISOString(),
    source: 'agorafundation.com',
    profile: meFull.data,
    roles: roles.data,
    anketa_progress: progress,
    questionnaire_answers: ans.data,
    big_five_results: ip.data,
    growth_log: gr.data,
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agora-my-data-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function deleteAccount() {
  if (me.photo_url) await supabase.storage.from('avatars').remove([me.photo_url]);
  const { error } = await supabase.rpc('agora_delete_my_account');
  if (error) throw error;
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('agora_ipip_draft_')).forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
  await supabase.auth.signOut().catch(() => {});
  try { localStorage.removeItem('sb-coohrbdmzfysnenoclbs-auth-token'); } catch (_) {}
  root.innerHTML = '<h1>' + esc(t('acc.cab.title')) + '</h1><p class="auth-lead">' + esc(t('cab.del.done')) + '</p>' +
    '<a class="btn btn-outline" href="/">' + esc(t('acc.back_home')) + '</a>';
  me = null;
}

// ─── Events ─────────────────────────────────────────────────────────────────
root.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || busy) return;
  const act = el.dataset.act;
  if (act === 'photo') return; // handled by change
  busy = true; msg = '';
  try {
    if (act === 'vis') {
      const scope = el.dataset.scope, v = el.dataset.v;
      if (scope === 'b4') {
        const { error } = await supabase.from('ipip_results').update({ visibility: v }).eq('user_id', me.id);
        if (error) throw error;
        tests.forEach((r) => { r.visibility = v; });
      } else {
        const { error } = await supabase.from('answers').update({ visibility: v }).eq('user_id', me.id).eq('block_id', scope);
        if (error) throw error;
        answers[scope].visibility = v;
        if (scope === 'b0') {
          const { error: e2 } = await supabase.from('profiles').update({ header_visibility: v }).eq('id', me.id);
          if (e2) throw e2;
          me.header_visibility = v;
        }
      }
    } else if (act === 'note-add') {
      const text = document.getElementById('noteText').value.trim();
      if (!text) { busy = false; return; }
      const { data, error } = await supabase.from('growth_log')
        .insert({ user_id: me.id, kind: 'note', note: text.slice(0, 1000) })
        .select('id,kind,payload,note,created_at').single();
      if (error) throw error;
      growth.unshift(data);
    } else if (act === 'note-del') {
      const { error } = await supabase.from('growth_log').delete().eq('id', el.dataset.v);
      if (error) throw error;
      growth = growth.filter((g) => g.id !== el.dataset.v);
    } else if (act === 'photo-del') {
      await supabase.storage.from('avatars').remove([me.photo_url]);
      const { error } = await supabase.from('profiles').update({ photo_url: null }).eq('id', me.id);
      if (error) throw error;
      me.photo_url = null; photoUrl = null;
    } else if (act === 'export') {
      await exportData();
    } else if (act === 'del-open') {
      delOpen = true;
    } else if (act === 'del-cancel') {
      delOpen = false;
    } else if (act === 'del-go') {
      await deleteAccount();
      busy = false;
      return;
    } else if (act === 'logout') {
      await supabase.auth.signOut();
      location.replace('/');
      return;
    }
  } catch (err) {
    msg = authErrorText(err);
  }
  busy = false;
  render();
  if (act === 'del-open') { const i = document.getElementById('delWord'); if (i) i.focus(); }
});

root.addEventListener('input', (e) => {
  if (e.target.id === 'delWord') {
    const ok = e.target.value.trim().toUpperCase() === t('cab.del.word').toUpperCase();
    document.getElementById('delGo').disabled = !ok;
  }
});

root.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-act="photo"]') || !e.target.files[0]) return;
  busy = true; msg = '';
  try {
    const blob = await shrink(e.target.files[0]);
    const path = me.id + '/avatar.jpg';
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    const { error: e2 } = await supabase.from('profiles').update({ photo_url: path }).eq('id', me.id);
    if (e2) throw e2;
    me.photo_url = path;
    await loadPhoto();
  } catch (err) {
    msg = t('cab.photo.err');
  }
  busy = false;
  render();
});

document.addEventListener('agora:lang', render);

// ─── Start ──────────────────────────────────────────────────────────────────
pageTitle('acc.cab.title');
try {
  me = await requireMember();
  if (me) {
    await loadAll();
    render();
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }), 30);
    }
  }
} catch (err) {
  root.innerHTML = '<div class="auth-msg show error">' + esc(authErrorText(err)) + '</div>';
}
