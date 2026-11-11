// Ответы анкеты в читаемом виде — общие для кабинета и страницы «Участники».
import { lang, esc } from './account.js';

const CFG = () => window.AGORA_ANKETA;

export const L = (o) => (o ? (o[lang()] || o.ru || '') : '');
export const optName = (opts, v) => { const o = (opts || []).find((x) => x.v === v); return o ? L(o) : v; };
export const roleName = (v) => { const r = CFG().roles.find((x) => x.v === v); return r ? L(r) : v; };
export const valueName = (v) => optName(CFG().values, v);
export const safeUrl = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? u : null);

export function skillsField() {
  return CFG().blocks.find((b) => b.id === 'b7').fields.find((x) => x.id === 'skills');
}
export const skillName = (v) => optName(skillsField().rows, v);

// HTML for one field's answer, or null when empty.
export function fmtField(f, data) {
  const v = data[f.id];
  switch (f.type) {
    case 'text': case 'textarea': case 'number':
      return v == null || v === '' ? null : esc(String(v)).replace(/\n/g, '<br>');
    case 'single': case 'select':
      return v ? esc(optName(f.options, v)) : null;
    case 'multi': {
      const arr = (Array.isArray(v) ? v : []).map((x) => optName(f.options, x));
      if (data[f.id + '_other']) arr.push(data[f.id + '_other']);
      return arr.length ? esc(arr.join(', ')) : null;
    }
    case 'role':
      return v ? esc(roleName(v)) : null;
    case 'roles':
      return Array.isArray(v) && v.length ? esc(v.map(roleName).join(', ')) : null;
    case 'list':
      return Array.isArray(v) && v.length ? esc(v.join(' · ')) : null;
    case 'links':
      return Array.isArray(v) && v.length ? v.map((l) => {
        const u = safeUrl(l.url);
        const name = optName(f.options, l.type);
        return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : esc(name + ': ' + l.url);
      }).join(' · ') : null;
    case 'pick':
      return Array.isArray(v) && v.length ? esc(v.map(valueName).join(', ')) : null;
    case 'slider':
      if (!v) return null;
      return '<span class="cab-slider"><span>' + esc(L(f.left)) + '</span><span class="cab-sdots">' +
        [1, 2, 3, 4, 5].map((i) => '<i class="' + (i === v ? 'on' : '') + '"></i>').join('') +
        '</span><span>' + esc(L(f.right)) + '</span></span>';
    case 'matrix': {
      const m = v && typeof v === 'object' ? v : {};
      const lines = f.cols.map((c) => {
        const rows = f.rows.filter((r) => m[r.v] === c.v).map((r) => L(r));
        return rows.length ? '<b>' + esc(L(c)) + ':</b> ' + esc(rows.join(', ')) : null;
      }).filter(Boolean);
      return lines.length ? lines.join('<br>') : null;
    }
  }
  return null;
}

// Plain-text version for CSV export.
export function textField(f, data) {
  const v = data[f.id];
  if (v == null || v === '') return '';
  switch (f.type) {
    case 'single': case 'select': return optName(f.options, v);
    case 'multi': {
      const arr = (Array.isArray(v) ? v : []).map((x) => optName(f.options, x));
      if (data[f.id + '_other']) arr.push(data[f.id + '_other']);
      return arr.join('; ');
    }
    case 'role': return roleName(v);
    case 'roles': return (Array.isArray(v) ? v : []).map(roleName).join('; ');
    case 'list': return (Array.isArray(v) ? v : []).join('; ');
    case 'links': return (Array.isArray(v) ? v : []).map((l) => l.type + ': ' + l.url).join('; ');
    case 'pick': return (Array.isArray(v) ? v : []).map(valueName).join('; ');
    case 'slider': return String(v) + '/5';
    case 'matrix': {
      const m = v && typeof v === 'object' ? v : {};
      return f.cols.map((c) => {
        const rows = f.rows.filter((r) => m[r.v] === c.v).map((r) => L(r));
        return rows.length ? L(c) + ': ' + rows.join(', ') : '';
      }).filter(Boolean).join(' | ');
    }
    default: return String(v);
  }
}
