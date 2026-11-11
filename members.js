// «Участники» — для координаторов и админов. Данные читаются обычными
// запросами: база (RLS) сама отдаёт только то, что открыто координаторам
// или всем. Админ дополнительно назначает роли.
import { supabase, t, lang, esc, pageTitle, requireMember, authErrorText } from './account.js';
import { L, optName, roleName, valueName, skillName, skillsField, fmtField, textField } from './anketa-view.js';
import { ipipLine } from './ipip-view.js';

const CFG = window.AGORA_ANKETA;
const IP = window.AGORA_IPIP;
const root = document.getElementById('members');

let me = null;
let members = [];          // [{ id, profile, answers: {b1: row}, ipip, sysRole }]
let open = new Set();      // expanded rows
let msg = '', note = '';
const F = { q: '', role: '', skill: '', skillLevel: 'can', value: '', factor: '', level: '', land: '', hours: '', day: '' };

const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
const fmtDate = (d) => new Date(d).toLocaleDateString(lang() === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const field = (bid, fid) => CFG.blocks.find((b) => b.id === bid).fields.find((f) => f.id === fid);
const D = (m, bid) => (m.answers[bid] ? m.answers[bid].data || {} : {});

function nameOf(m) { return (m.profile && m.profile.name) || D(m, 'b0').name || null; }
function cityOf(m) { return (m.profile && m.profile.city) || D(m, 'b0').city || ''; }
function levelOf(m, fid) {
  if (!m.ipip) return null;
  const f = IP.factors.find((x) => x.id === fid);
  return IP.level(fid, IP.displayScore(m.ipip, f));
}

// ─── Filtering ──────────────────────────────────────────────────────────────
function matches(m) {
  const b1 = D(m, 'b1'), b3 = D(m, 'b3'), b7 = D(m, 'b7'), b8 = D(m, 'b8');
  if (F.q) {
    const hay = ((nameOf(m) || '') + ' ' + cityOf(m)).toLowerCase();
    if (hay.indexOf(F.q.toLowerCase()) === -1) return false;
  }
  if (F.role && b1.role_primary !== F.role && b1.role_secondary !== F.role) return false;
  if (F.skill) {
    const lvl = (b7.skills || {})[F.skill];
    if (!lvl || (F.skillLevel !== 'any' && lvl !== F.skillLevel)) return false;
  }
  if (F.value && !(Array.isArray(b3.top3) && b3.top3.indexOf(F.value) !== -1)) return false;
  if (F.factor) {
    const lvl = levelOf(m, F.factor);
    if (!lvl || (F.level && lvl !== F.level)) return false;
  }
  if (F.land && b8.can_visit_land !== F.land) return false;
  if (F.hours !== '' && !(Number(b8.hours_week) >= Number(F.hours))) return false;
  if (F.day && !(Array.isArray(b8.days) && b8.days.indexOf(F.day) !== -1)) return false;
  return true;
}

// ─── Rendering ──────────────────────────────────────────────────────────────
function sel(key, options, anyLabel) {
  return '<select class="an-input" data-filter="' + key + '"><option value="">' + esc(anyLabel || t('mem.f.any')) + '</option>' +
    options.map((o) => '<option value="' + esc(o.v) + '"' + (F[key] === o.v ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
    '</select>';
}

function filtersHTML() {
  const roles = CFG.roles.map((r) => ({ v: r.v, label: L(r) }));
  const skills = skillsField().rows.map((r) => ({ v: r.v, label: L(r) }));
  const skillCols = skillsField().cols.map((c) => ({ v: c.v, label: L(c) })).concat([{ v: 'any', label: t('mem.f.any_level') }]);
  const values = CFG.values.map((v) => ({ v: v.v, label: L(v) }));
  const factors = IP.factors.map((f) => ({ v: f.id, label: lang() === 'en' ? f.en : f.ru }));
  const levels = ['low', 'mid', 'high'].map((l) => ({ v: l, label: t('ip.level.' + l) }));
  const land = field('b8', 'can_visit_land').options.map((o) => ({ v: o.v, label: L(o) }));
  const days = field('b8', 'days').options.map((o) => ({ v: o.v, label: L(o) }));
  const box = (label, inner) => '<label class="mem-f"><span>' + esc(label) + '</span>' + inner + '</label>';
  return '<div class="mem-filters">' +
    box(t('mem.f.search'), '<input class="an-input" type="search" data-filter="q" value="' + esc(F.q) + '">') +
    box(t('mem.f.role'), sel('role', roles)) +
    box(t('mem.f.skill'), '<div class="mem-pair">' + sel('skill', skills) +
      '<select class="an-input" data-filter="skillLevel">' + skillCols.map((o) => '<option value="' + o.v + '"' + (F.skillLevel === o.v ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></div>') +
    box(t('mem.f.value'), sel('value', values)) +
    box(t('mem.f.factor'), '<div class="mem-pair">' + sel('factor', factors) + sel('level', levels, t('mem.f.any_level')) + '</div>') +
    box(t('mem.f.land'), sel('land', land)) +
    box(t('mem.f.hours'), '<input class="an-input" type="number" min="0" max="80" inputmode="numeric" data-filter="hours" value="' + esc(F.hours) + '">') +
    box(t('mem.f.day'), sel('day', days)) +
    '<button type="button" class="auth-link" data-act="reset">' + esc(t('mem.f.reset')) + '</button>' +
  '</div>';
}

function bfShort(m) {
  if (!m.ipip) return '<span class="an-note">—</span>';
  const arrow = { low: '↓', mid: '·', high: '↑' };
  return IP.factors.map((f) => {
    const lvl = levelOf(m, f.id);
    return '<span class="mem-bf ' + lvl + '" title="' + esc((lang() === 'en' ? f.en : f.ru) + ': ' + t('ip.level.' + lvl)) + '">' +
      esc(t('mem.bf.' + f.id)) + arrow[lvl] + '</span>';
  }).join('');
}

function availShort(m) {
  const b8 = D(m, 'b8');
  const parts = [];
  if (b8.hours_week != null) parts.push(tf('mem.hours', { n: b8.hours_week }));
  if (Array.isArray(b8.days) && b8.days.length) parts.push(b8.days.map((d) => optName(field('b8', 'days').options, d)).join(' '));
  if (b8.can_visit_land) parts.push('🏕 ' + optName(field('b8', 'can_visit_land').options, b8.can_visit_land));
  return parts.length ? esc(parts.join(' · ')) : '<span class="an-note">—</span>';
}

function sysCell(m) {
  if (me.role !== 'admin' || m.id === me.id) return esc(t('role.' + (m.sysRole || 'member')));
  return '<select class="an-input mem-role" data-act="setrole" data-id="' + m.id + '">' +
    ['member', 'coordinator', 'admin'].map((r) => '<option value="' + r + '"' + (m.sysRole === r ? ' selected' : '') + '>' + esc(t('role.' + r)) + '</option>').join('') +
    '</select>';
}

function detailsHTML(m) {
  const blocks = CFG.blocks.map((b) => {
    const row = m.answers[b.id];
    if (!row) return '';
    const lines = b.fields.map((f) => {
      const v = fmtField(f, row.data || {});
      return v ? '<div class="cab-ans"><span>' + esc(L(f.label)) + '</span><div>' + v + '</div></div>' : '';
    }).join('');
    return lines ? '<div class="mem-dblock"><h4>' + esc(tf('an.block', { n: b.num }) + ' · ' + L(b.title)) +
      ' <span class="an-note">(' + esc(t('an.vis.' + row.visibility)) + ')</span></h4>' + lines + '</div>' : '';
  }).join('');
  const bf = m.ipip ? '<div class="mem-dblock"><h4>Big Five <span class="an-note">(' + esc(fmtDate(m.ipip.taken_at)) + ')</span></h4><p>' + esc(ipipLine(m.ipip)) + '</p></div>' : '';
  return (m.profile ? '' : '<p class="an-note">' + esc(t('mem.hidden_note')) + '</p>') +
    ((blocks + bf) || '<p class="an-note">' + esc(t('mem.no_visible')) + '</p>');
}

function render() {
  if (!me) return;
  const list = members.filter(matches);
  const y = window.scrollY;
  const head = ['mem.col.name', 'mem.col.role', 'mem.col.values', 'mem.col.skills', 'mem.col.bf', 'mem.col.avail', 'mem.col.sys'];
  root.innerHTML =
    '<div class="section-label">' + esc(t('mem.label')) + '</div>' +
    '<h1>' + esc(t('mem.title')) + '</h1>' +
    '<p class="auth-lead">' + esc(t('mem.lead')) + '</p>' +
    filtersHTML() +
    '<div class="mem-bar"><span class="an-note">' + esc(tf('mem.count', { n: list.length, total: members.length })) + '</span>' +
      '<span class="mem-exp"><button type="button" class="btn btn-outline" data-act="csv">' + esc(t('mem.export_csv')) + '</button>' +
      '<button type="button" class="btn btn-outline" data-act="json">' + esc(t('mem.export_json')) + '</button></span></div>' +
    '<p class="an-note" style="margin:-4px 0 12px">' + esc(t('mem.export_note')) + '</p>' +
    (note ? '<div class="auth-msg show ok">' + esc(note) + '</div>' : '') +
    (msg ? '<div class="auth-msg show error">' + esc(msg) + '</div>' : '') +
    (list.length ? '<div class="mem-scroll"><table class="mem-table"><thead><tr>' + head.map((h) => '<th>' + esc(t(h)) + '</th>').join('') + '<th></th></tr></thead><tbody>' +
      list.map((m) => {
        const b1 = D(m, 'b1'), b3 = D(m, 'b3'), b7 = D(m, 'b7');
        const name = nameOf(m);
        const can = Object.keys(b7.skills || {}).filter((k) => b7.skills[k] === 'can').map(skillName);
        const isOpen = open.has(m.id);
        return '<tr class="' + (isOpen ? 'open' : '') + '">' +
          '<td><b>' + (name ? esc(name) : '<i class="an-note">' + esc(t('mem.hidden')) + '</i>') + '</b>' +
            (cityOf(m) ? '<div class="an-note">' + esc(cityOf(m)) + '</div>' : '') + '</td>' +
          '<td>' + esc([b1.role_primary, b1.role_secondary].filter(Boolean).map(roleName).join(' + ') || '—') + '</td>' +
          '<td>' + esc(Array.isArray(b3.top3) ? b3.top3.map(valueName).join(', ') : '—') + '</td>' +
          '<td>' + esc(can.join(', ') || '—') + '</td>' +
          '<td class="mem-bfcell">' + bfShort(m) + '</td>' +
          '<td>' + availShort(m) + '</td>' +
          '<td>' + sysCell(m) + '</td>' +
          '<td><button type="button" class="auth-link" data-act="toggle" data-id="' + m.id + '">' + esc(t(isOpen ? 'mem.close' : 'mem.details')) + '</button></td>' +
        '</tr>' +
        (isOpen ? '<tr class="mem-drow"><td colspan="8">' + detailsHTML(m) + '</td></tr>' : '');
      }).join('') + '</tbody></table></div>'
      : '<p class="an-note">' + esc(t('mem.empty')) + '</p>');
  window.scrollTo({ top: y, behavior: 'instant' });
}

// ─── Export ─────────────────────────────────────────────────────────────────
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const stamp = () => new Date().toISOString().slice(0, 10);

function exportJSON() {
  const list = members.filter(matches).map((m) => ({
    id: m.id,
    name: nameOf(m),
    city: cityOf(m) || null,
    system_role: m.sysRole || null,
    profile: m.profile,
    answers: Object.fromEntries(Object.entries(m.answers).map(([k, r]) => [k, { visibility: r.visibility, version: r.version, updated_at: r.updated_at, data: r.data }])),
    big_five: m.ipip ? {
      taken_at: m.ipip.taken_at, test_version: m.ipip.test_version,
      scores: Object.fromEntries(IP.factors.map((f) => [f.id, IP.displayScore(m.ipip, f)])),
      levels: Object.fromEntries(IP.factors.map((f) => [f.id, levelOf(m, f.id)])),
    } : null,
  }));
  download('agora-members-' + stamp() + '.json',
    JSON.stringify({ exported_at: new Date().toISOString(), questionnaire_version: CFG.version, filters: F, members: list }, null, 2),
    'application/json');
}

function exportCSV() {
  const cols = [['id', (m) => m.id], ['name', (m) => nameOf(m) || ''], ['city', cityOf], ['system_role', (m) => m.sysRole || '']];
  CFG.blocks.forEach((b) => b.fields.forEach((f) => {
    if (b.id === 'b0' && (f.id === 'name' || f.id === 'city')) return;
    cols.push([b.id + '_' + f.id, (m) => (m.answers[b.id] ? textField(f, m.answers[b.id].data || {}) : '')]);
  }));
  cols.push(['bigfive_taken_at', (m) => (m.ipip ? m.ipip.taken_at : '')]);
  IP.factors.forEach((f) => {
    cols.push(['bigfive_' + f.id, (m) => (m.ipip ? IP.displayScore(m.ipip, f) : '')]);
    cols.push(['bigfive_' + f.id + '_level', (m) => levelOf(m, f.id) || '']);
  });
  const q = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [cols.map((c) => q(c[0])).join(',')].concat(members.filter(matches).map((m) => cols.map((c) => q(c[1](m))).join(',')));
  download('agora-members-' + stamp() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
}

// ─── Events ─────────────────────────────────────────────────────────────────
root.addEventListener('input', (e) => {
  const k = e.target.dataset.filter;
  if (!k) return;
  F[k] = e.target.value;
  if (e.target.tagName === 'INPUT') {
    // keep focus while typing
    const pos = e.target.selectionStart;
    render();
    const el = root.querySelector('[data-filter="' + k + '"]');
    if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} }
  } else render();
});

root.addEventListener('change', async (e) => {
  if (e.target.dataset.act !== 'setrole') return;
  const id = e.target.dataset.id, role = e.target.value;
  msg = ''; note = '';
  const { error } = await supabase.rpc('agora_set_role', { target: id, new_role: role });
  if (error) msg = authErrorText(error) + ' (' + error.message + ')';
  else { members.find((m) => m.id === id).sysRole = role; note = t('mem.role_saved'); }
  render();
});

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'toggle') { const id = el.dataset.id; if (open.has(id)) open.delete(id); else open.add(id); render(); }
  else if (act === 'reset') { Object.assign(F, { q: '', role: '', skill: '', skillLevel: 'can', value: '', factor: '', level: '', land: '', hours: '', day: '' }); render(); }
  else if (act === 'csv') exportCSV();
  else if (act === 'json') exportJSON();
});

document.addEventListener('agora:lang', render);

// ─── Start ──────────────────────────────────────────────────────────────────
pageTitle('mem.title');
try {
  me = await requireMember();
  if (me && me.role !== 'coordinator' && me.role !== 'admin') {
    root.innerHTML = '<h1>' + esc(t('mem.title')) + '</h1><p class="auth-lead">' + esc(t('mem.denied')) + '</p>' +
      '<a class="btn btn-outline" href="/cabinet">' + esc(t('ip.to_cabinet')) + '</a>';
    me = null;
  } else if (me) {
    const [pr, an, ip, ro] = await Promise.all([
      supabase.from('profiles').select('id,name,city,languages,links,header_visibility,created_at'),
      supabase.from('answers').select('user_id,block_id,data,visibility,version,updated_at'),
      supabase.from('ipip_results').select('user_id,taken_at,test_version,extraversion,agreeableness,conscientiousness,emotional_stability,openness').order('taken_at', { ascending: false }),
      supabase.rpc('agora_member_roles'),
    ]);
    for (const r of [pr, an, ip, ro]) if (r.error) throw r.error;
    const map = new Map();
    const get = (id) => { if (!map.has(id)) map.set(id, { id, profile: null, answers: {}, ipip: null, sysRole: null }); return map.get(id); };
    (pr.data || []).forEach((p) => { get(p.id).profile = p; });
    (an.data || []).forEach((a) => { get(a.user_id).answers[a.block_id] = a; });
    (ip.data || []).forEach((r) => { const m = get(r.user_id); if (!m.ipip) m.ipip = r; });
    const roles = new Map((ro.data || []).map((r) => [r.user_id, r.role]));
    if (me.role === 'admin') roles.forEach((_, id) => get(id)); // admins see every account (to assign roles)
    map.forEach((m) => { m.sysRole = roles.get(m.id) || 'member'; });
    members = [...map.values()].sort((a, b) => (nameOf(a) || '￿').localeCompare(nameOf(b) || '￿'));
    render();
  }
} catch (err) {
  root.innerHTML = '<div class="auth-msg show error">' + esc(authErrorText(err)) + '</div>';
}
