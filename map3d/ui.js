// АГОРА ТЕХАС — 3D-карта: интерфейс (табло, поиск, слои, фазы, камеры,
// компас, ночь, карточка объекта с летописью). Без WebGL — SVG-схема сверху.
import { supabase } from '/supabaseClient.js';
import { LOT2D, toScene, clipX, zoneMid, defaultFence } from '/map3d/geo.js';

const I18N = {
  ru: {
    'm3.loading': 'Загружаю 3D-карту…', 'm3.error': 'Не получилось загрузить карту. Обнови страницу.',
    'm3.score': 'Построено <b>{done}</b> из <b>{total}</b> · <b>{hours}</b> ч труда',
    'm3.search': 'Найти объект…', 'm3.nothing': 'Ничего не нашлось',
    'm3.cam.road': 'Вид с дороги', 'm3.cam.top': 'Сверху', 'm3.cam.reset': 'Сбросить',
    'm3.night': 'Ночь', 'm3.layers': 'Слои',
    'm3.l.zones': 'Зоны', 'm3.l.objects': 'Постройки', 'm3.l.paths': 'Дороги и тропы', 'm3.l.run': 'Беговое кольцо',
    'm3.l.trees': 'Деревья и изгородь', 'm3.l.nets': 'Сети (кабель, вода)', 'm3.l.labels': 'Подписи',
    'm3.ph.0': 'Сейчас', 'm3.ph.1': '2027', 'm3.ph.2': '2029', 'm3.ph.3': '2030+',
    'm3.doneonly': 'Только построенное', 'm3.compass': 'Север — повернуть карту на север',
    'm3.hint': 'Тяни — двигать · два пальца / правая кнопка — вращать · колесо — масштаб',
    'm3.st.planned': 'Запланировано', 'm3.st.in_progress': 'Строится', 'm3.st.done': 'Готово',
    'm3.vis.members': 'Видно участникам', 'm3.vis.founders': 'Видно основателям',
    'm3.f.phase': 'Очередь', 'm3.f.size': 'Размер', 'm3.f.height': 'Высота', 'm3.f.built': 'Строит',
    'm3.f.permit': 'Разрешение', 'm3.f.hours': 'Часов труда', 'm3.f.cost': 'Стоимость', 'm3.f.started': 'Начато',
    'm3.f.done': 'Готово', 'm3.f.where': 'Где', 'm3.where': '{d} м от дороги · {y} м от южной границы',
    'm3.h.final': '{h} м, потом {f} м', 'm3.m': '{v} м', 'm3.size': '{w} × {l} м', 'm3.diam': 'Ø {d} м',
    'm3.history': 'Летопись', 'm3.noevents': 'Пока событий нет — здесь появится история стройки.',
    'm3.share': 'Скопировать ссылку', 'm3.copied': 'Ссылка скопирована',
    'm3.cam.walk': 'Прогуляться', 'm3.walk.exit': '← Выйти из прогулки', 'm3.walk.here': 'Подойти сюда',
    'm3.walk.hint': 'WASD или стрелки — идти · Shift — бегом · зажми кнопку мыши и веди — поворот · нажми на землю — пойти туда',
    'm3.walk.hint.touch': 'Джойстик — идти · веди пальцем — оглядеться · нажми на землю — пойти туда',
    'm3.svg.note': 'Упрощённая схема: этот браузер не показывает 3D',
    'm3.c.building': 'Постройка', 'm3.c.residence': 'Жильё основателей', 'm3.c.lodging': 'Домик для гостей', 'm3.c.wellness': 'Баня и здоровье',
    'm3.c.farm': 'Ферма', 'm3.c.utility': 'Инженерия', 'm3.c.infrastructure': 'Инфраструктура', 'm3.c.parking': 'Парковка',
    'm3.c.landmark': 'Символ места', 'm3.c.feature': 'Место встречи', 'm3.c.water': 'Вода', 'm3.c.reserve': 'Резерв',
  },
  en: {
    'm3.loading': 'Loading the 3D map…', 'm3.error': 'The map did not load. Please refresh the page.',
    'm3.score': 'Built <b>{done}</b> of <b>{total}</b> · <b>{hours}</b> hours of work',
    'm3.search': 'Find a place…', 'm3.nothing': 'Nothing found',
    'm3.cam.road': 'From the road', 'm3.cam.top': 'Top', 'm3.cam.reset': 'Reset',
    'm3.night': 'Night', 'm3.layers': 'Layers',
    'm3.l.zones': 'Zones', 'm3.l.objects': 'Buildings', 'm3.l.paths': 'Roads and paths', 'm3.l.run': 'Running loop',
    'm3.l.trees': 'Trees and hedge', 'm3.l.nets': 'Utilities (power, water)', 'm3.l.labels': 'Labels',
    'm3.ph.0': 'Now', 'm3.ph.1': '2027', 'm3.ph.2': '2029', 'm3.ph.3': '2030+',
    'm3.doneonly': 'Built only', 'm3.compass': 'North — turn the map to face north',
    'm3.hint': 'Drag to move · two fingers / right button to rotate · wheel to zoom',
    'm3.st.planned': 'Planned', 'm3.st.in_progress': 'In progress', 'm3.st.done': 'Done',
    'm3.vis.members': 'Members only', 'm3.vis.founders': 'Founders only',
    'm3.f.phase': 'Phase', 'm3.f.size': 'Size', 'm3.f.height': 'Height', 'm3.f.built': 'Built by',
    'm3.f.permit': 'Permit', 'm3.f.hours': 'Hours of work', 'm3.f.cost': 'Cost', 'm3.f.started': 'Started',
    'm3.f.done': 'Finished', 'm3.f.where': 'Where', 'm3.where': '{d} m from the road · {y} m from the south line',
    'm3.h.final': '{h} m, later {f} m', 'm3.m': '{v} m', 'm3.size': '{w} × {l} m', 'm3.diam': 'Ø {d} m',
    'm3.history': 'History', 'm3.noevents': 'No events yet — the building story will appear here.',
    'm3.share': 'Copy link', 'm3.copied': 'Link copied',
    'm3.cam.walk': 'Take a walk', 'm3.walk.exit': '← Leave the walk', 'm3.walk.here': 'Walk up to it',
    'm3.walk.hint': 'WASD or arrows to walk · Shift to run · hold the mouse button and move to turn · click the ground to go there',
    'm3.walk.hint.touch': 'Joystick to walk · drag to look around · tap the ground to go there',
    'm3.svg.note': 'Simplified plan: this browser cannot show 3D',
    'm3.c.building': 'Building', 'm3.c.residence': 'Founders’ home', 'm3.c.lodging': 'Guest cabin', 'm3.c.wellness': 'Bath and wellness',
    'm3.c.farm': 'Farm', 'm3.c.utility': 'Utilities', 'm3.c.infrastructure': 'Infrastructure', 'm3.c.parking': 'Parking',
    'm3.c.landmark': 'Landmark', 'm3.c.feature': 'Gathering place', 'm3.c.water': 'Water', 'm3.c.reserve': 'Reserve',
  },
};
window.AgoraI18n && window.AgoraI18n.extend(I18N);
const lang = () => (window.AgoraI18n ? window.AgoraI18n.getLang() : 'ru');
function t(k, vars) {
  let s = (window.AgoraI18n && window.AgoraI18n.t(k)) || I18N.ru[k] || k;
  if (s === k) s = (I18N[lang()] || I18N.ru)[k] || k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.split('{' + a + '}').join(b);
  return s;
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nm = (o) => (lang() === 'en' && o.name_en) ? o.name_en : o.name_ru;
const num = (v) => (Math.round(Number(v) * 10) / 10).toLocaleString(lang() === 'en' ? 'en-US' : 'ru-RU');

async function loadData() {
  const [z, p, o, tr] = await Promise.all([
    supabase.from('site_zones').select('*').order('sort'),
    supabase.from('site_paths').select('*'),
    supabase.from('site_objects').select('*').order('d'),
    supabase.from('site_tree_areas').select('*'),
  ]);
  for (const r of [z, p, o, tr]) if (r.error) throw r.error;
  return { zones: z.data, paths: p.data, objects: o.data, trees: tr.data };
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

const PHASE_YEAR = { 0: 'm3.ph.0', 1: 'm3.ph.1', 2: 'm3.ph.2', 3: 'm3.ph.3' };

export async function mount(root, opts = {}) {
  root.classList.add('m3');
  root.innerHTML = '<div class="m3-loading">' + esc(t('m3.loading')) + '</div>';
  let data;
  try { data = await loadData(); }
  catch (e) { console.error(e); root.innerHTML = '<div class="m3-loading">' + esc(t('m3.error')) + '</div>'; return null; }

  root.innerHTML =
    '<div class="m3-view"></div>' +
    '<div class="m3-score m3-pill" aria-live="polite"></div>' +
    '<div class="m3-cams">' +
      '<button type="button" data-cam="road"></button><button type="button" data-cam="top"></button><button type="button" data-cam="reset"></button><button type="button" data-cam="walk"></button>' +
    '</div>' +
    '<div class="m3-search"><input type="search" autocomplete="off"><div class="m3-results m3-pill" role="listbox"></div></div>' +
    '<div class="m3-right"><button type="button" class="m3-night-btn"></button><button type="button" class="m3-layers-btn" aria-expanded="false"></button></div>' +
    '<div class="m3-layers m3-pill"></div>' +
    '<div class="m3-bottom"><div class="m3-phases m3-pill" role="group"></div>' +
      '<label class="m3-done m3-pill"><input type="checkbox"><span></span></label></div>' +
    '<button type="button" class="m3-compass m3-pill"><svg viewBox="-22 -22 44 44"><circle r="20" fill="none" stroke="rgba(240,235,224,.25)"/>' +
      '<g class="needle"><path d="M0,-16 L5,0 L-5,0Z" fill="#e2564a"/><path d="M0,16 L5,0 L-5,0Z" fill="#f0ebe0"/>' +
      '<text y="-7" x="0" font-size="0" fill="#fff">N</text></g></svg></button>' +
    '<div class="m3-hint m3-pill"></div>' +
    '<div class="m3-joy" aria-hidden="true"><div class="knob"></div></div>' +
    '<aside class="m3-card" aria-live="polite"></aside>';
  const $ = (s) => root.querySelector(s);
  const view = $('.m3-view'), card = $('.m3-card');

  const LAYERS = ['zones', 'objects', 'paths', 'run', 'trees', 'nets', 'labels'];
  const TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  let walking = false;
  let scene3 = null;

  // ─── 3D или SVG ───────────────────────────────────────────────────────────
  if (hasWebGL() && !opts.forceSvg) {
    try {
      const { createScene } = await import('/map3d/viewer.js');
      scene3 = createScene(view, data, { onWalk: (on) => onWalk(on) });
    } catch (e) { console.error('3D failed, falling back to SVG', e); scene3 = null; }
  }
  const svg = scene3 ? null : drawSvg(view, data, (id) => openCard(id));
  if (!scene3) { $('.m3-cams').style.display = 'none'; $('.m3-compass').style.display = 'none'; $('.m3-night-btn').style.display = 'none'; }
  const state = scene3 ? scene3.state : { phase: 3, doneOnly: false, layers: Object.fromEntries(LAYERS.map((k) => [k, k !== 'nets'])) };

  // ─── Табло ────────────────────────────────────────────────────────────────
  function renderScore() {
    const objs = data.objects.filter((o) => o.category !== 'reserve');
    const done = objs.filter((o) => o.status === 'done').length;
    const hours = data.objects.reduce((s, o) => s + (Number(o.hours) || 0), 0);
    $('.m3-score').innerHTML = t('m3.score', { done, total: objs.length, hours: num(hours) });
  }

  // ─── Тексты интерфейса (и при смене языка) ────────────────────────────────
  function renderTexts() {
    root.querySelectorAll('[data-cam]').forEach((b) => { b.textContent = t(b.dataset.cam === 'walk' && walking ? 'm3.walk.exit' : 'm3.cam.' + b.dataset.cam); });
    $('.m3-search input').placeholder = t('m3.search');
    $('.m3-night-btn').textContent = t('m3.night');
    $('.m3-layers-btn').textContent = t('m3.layers');
    $('.m3-layers').innerHTML = LAYERS.map((k) => '<label><input type="checkbox" data-layer="' + k + '"' + (state.layers[k] !== false ? ' checked' : '') + '> ' + esc(t('m3.l.' + k)) + '</label>').join('');
    $('.m3-phases').innerHTML = [0, 1, 2, 3].map((p) => '<button type="button" data-ph="' + p + '" class="' + (state.phase === p ? 'on' : '') + '">' + esc(t(PHASE_YEAR[p])) + '</button>').join('');
    $('.m3-done span').textContent = t('m3.doneonly');
    $('.m3-compass').title = t('m3.compass'); $('.m3-compass').setAttribute('aria-label', t('m3.compass'));
    $('.m3-hint').textContent = t(walking ? (TOUCH ? 'm3.walk.hint.touch' : 'm3.walk.hint') : 'm3.hint');
    if (scene3) scene3.setLabelTexts(lang());
    if (svg) svg.setLang(lang());
    renderScore();
    if (current) openCard(current, true);
  }

  function applyFilters() { if (scene3) scene3.applyFilters(); if (svg) svg.apply(state); }

  // ─── Управление ───────────────────────────────────────────────────────────
  root.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.cam;
    if (c === 'walk') { if (walking) scene3.exitWalk(); else { closeCard(); scene3.enterWalk(); } }
    else if (c === 'reset') { closeCard(); scene3.setView('road'); } else scene3.setView(c);
  }));
  $('.m3-night-btn').addEventListener('click', (e) => {
    const on = !scene3.state.night; scene3.setNight(on); e.currentTarget.classList.toggle('on', on); root.classList.toggle('night', on);
  });
  $('.m3-layers-btn').addEventListener('click', (e) => {
    const open = $('.m3-layers').classList.toggle('open'); e.currentTarget.classList.toggle('on', open); e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  $('.m3-layers').addEventListener('change', (e) => {
    const k = e.target.dataset.layer; if (!k) return; state.layers[k] = e.target.checked; applyFilters(); if (scene3) scene3.request();
  });
  $('.m3-phases').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ph]'); if (!b) return;
    state.phase = Number(b.dataset.ph);
    root.querySelectorAll('[data-ph]').forEach((x) => x.classList.toggle('on', x === b));
    applyFilters();
  });
  $('.m3-done input').addEventListener('change', (e) => { state.doneOnly = e.target.checked; applyFilters(); });
  $('.m3-compass').addEventListener('click', () => {
    if (!scene3) return;
    if (scene3.walking) { scene3.faceNorth(); return; }
    const c = scene3.controls, cam = scene3.camera, tg = c.target;
    const dist = cam.position.distanceTo(tg), pol = Math.acos(Math.min(1, (cam.position.y - tg.y) / dist));
    const P = new scene3.THREE.Vector3(tg.x, tg.y + dist * Math.cos(pol), tg.z + dist * Math.sin(pol));
    scene3.flyTo(P, tg.clone());
  });

  // Поиск
  const input = $('.m3-search input'), results = $('.m3-results');
  let hits = [], act = 0;
  function renderResults() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.classList.remove('open'); return; }
    hits = data.objects.filter((o) => [o.name_ru, o.name_en, o.id, t('m3.c.' + o.category)].some((s) => s && String(s).toLowerCase().includes(q))).slice(0, 12);
    act = 0;
    results.innerHTML = hits.length
      ? hits.map((o, i) => '<button type="button" role="option" data-id="' + esc(o.id) + '" class="' + (i === 0 ? 'act' : '') + '">' + esc(nm(o)) + '<small>' + esc(t('m3.c.' + o.category)) + '</small></button>').join('')
      : '<div class="m3-empty" style="padding:7px 8px">' + esc(t('m3.nothing')) + '</div>';
    results.classList.add('open');
  }
  input.addEventListener('input', renderResults);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!hits.length) return;
      act = (act + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
      results.querySelectorAll('button').forEach((b, i) => b.classList.toggle('act', i === act));
    } else if (e.key === 'Enter' && hits[act]) { choose(hits[act].id); }
    else if (e.key === 'Escape') { input.value = ''; results.classList.remove('open'); }
  });
  results.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) choose(b.dataset.id); });
  function choose(id) {
    results.classList.remove('open'); input.value = ''; input.blur();
    const o = data.objects.find((x) => x.id === id);
    if (o && o.phase > state.phase) { state.phase = 3; root.querySelectorAll('[data-ph]').forEach((x) => x.classList.toggle('on', x.dataset.ph === '3')); }
    if (o && state.doneOnly && o.status !== 'done') { state.doneOnly = false; $('.m3-done input').checked = false; }
    state.layers.objects = true; applyFilters(); renderTexts();
    openCard(id); focus(id);
  }
  function focus(id) {
    if (scene3) { if (scene3.walking) scene3.walkTo(id); else scene3.focusObject(id); scene3.select(id); }
    if (svg) svg.select(id);
  }

  // ─── Прогулка ─────────────────────────────────────────────────────────────
  function onWalk(on) {
    walking = on;
    root.classList.toggle('walking', on);
    renderTexts();
    const h = $('.m3-hint');
    if (on) { h.classList.add('show'); clearTimeout(onWalk.tm); onWalk.tm = setTimeout(() => h.classList.remove('show'), 8000); }
    else h.classList.remove('show');
    const u = new URL(location.href);
    if (on) u.searchParams.set('walk', '1'); else u.searchParams.delete('walk');
    history.replaceState(null, '', u);
  }
  // Джойстик для телефона
  {
    const joy = $('.m3-joy'), knob = joy.querySelector('.knob'), RAD = 40;
    let jid = null, cx = 0, cy = 0;
    const move = (e) => {
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
      if (d > RAD) { dx *= RAD / d; dy *= RAD / d; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      if (scene3) scene3.setJoy(dx / RAD, dy / RAD);
    };
    joy.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); jid = e.pointerId; joy.setPointerCapture(jid);
      const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e);
      $('.m3-hint').classList.remove('show');
    });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) move(e); });
    const end = (e) => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; if (scene3) scene3.setJoy(0, 0); };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  }

  // Клик по сцене
  if (scene3) {
    const cv = scene3.renderer.domElement;
    let down = null;
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; $('.m3-hint').classList.remove('show'); results.classList.remove('open'); });
    cv.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const hit = scene3.pick(e.clientX, e.clientY);
      if (hit && hit.id) { openCard(hit.id); scene3.select(hit.id); }
      else { closeCard(); if (hit && hit.ground && scene3.walking) scene3.walkToPoint(hit.ground.X, hit.ground.Z); }
      if (opts.onGroundClick && hit && hit.ground) opts.onGroundClick(hit.ground);
    });
    // компас
    const needle = $('.m3-compass .needle');
    scene3.onFrame((cam, ctr) => {
      const dir = cam.getWorldDirection(new scene3.THREE.Vector3());
      const az = Math.atan2(-dir.x, -dir.z);   // 0 — смотрим на север
      needle.setAttribute('transform', 'rotate(' + (az * 180 / Math.PI).toFixed(1) + ')');
    });
    $('.m3-hint').classList.add('show');
    setTimeout(() => $('.m3-hint').classList.remove('show'), 6000);
  }

  // ─── Карточка объекта ─────────────────────────────────────────────────────
  let current = null, evToken = 0;
  function row(label, value) { return value == null || value === '' ? '' : '<div class="m3-row"><span>' + esc(label) + '</span><span>' + esc(value) + '</span></div>'; }
  function fmtDate(s) { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString(lang() === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function openCard(id, keepScroll) {
    const o = data.objects.find((x) => x.id === id); if (!o) return;
    current = id;
    const desc = (lang() === 'en' && o.description_en) ? o.description_en : o.description_ru;
    const size = o.r ? t('m3.diam', { d: num(o.r * 2) }) : (o.w && o.l ? t('m3.size', { w: num(o.w), l: num(o.l) }) : '');
    const height = o.h ? (o.h_final ? t('m3.h.final', { h: num(o.h), f: num(o.h_final) }) : t('m3.m', { v: num(o.h) })) : '';
    card.innerHTML =
      '<button type="button" class="x" aria-label="×">×</button>' +
      '<div class="m3-cat">' + esc(t('m3.c.' + o.category)) + '</div>' +
      '<h3>' + esc(nm(o)) + '</h3>' +
      '<span class="m3-chip ' + esc(o.status) + '">' + esc(t('m3.st.' + o.status)) + '</span>' +
      (o.visibility !== 'public' ? '<span class="m3-chip vis">' + esc(t('m3.vis.' + o.visibility)) + '</span>' : '') +
      row(t('m3.f.phase'), t(PHASE_YEAR[o.phase])) +
      row(t('m3.f.size'), size) + row(t('m3.f.height'), height) +
      row(t('m3.f.built'), o.built_by) + row(t('m3.f.permit'), o.permit) +
      row(t('m3.f.hours'), o.hours ? num(o.hours) : '') +
      row(t('m3.f.cost'), o.cost_usd ? '$' + Number(o.cost_usd).toLocaleString('en-US') : '') +
      row(t('m3.f.started'), fmtDate(o.date_started)) + row(t('m3.f.done'), fmtDate(o.date_done)) +
      (o.visibility === 'public' ? row(t('m3.f.where'), t('m3.where', { d: num(o.d), y: num(o.y) })) : '') +
      (desc ? '<p class="m3-desc">' + esc(desc) + '</p>' : '') +
      ((o.photos || []).length ? '<div class="m3-photos">' + o.photos.map((u) => /^https:\/\//.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="" loading="lazy"></a>' : '').join('') + '</div>' : '') +
      '<h4>' + esc(t('m3.history')) + '</h4><div class="m3-events"><div class="m3-empty">…</div></div>' +
      '<div class="m3-share">' + (scene3 ? '<button type="button" class="m3-go">' + esc(t('m3.walk.here')) + '</button> ' : '') +
      '<button type="button" class="m3-copy">' + esc(t('m3.share')) + '</button></div>';
    card.classList.add('open');
    if (!keepScroll) card.scrollTop = 0;
    card.querySelector('.x').addEventListener('click', closeCard);
    if (scene3) card.querySelector('.m3-go').addEventListener('click', () => {
      scene3.walkTo(id); scene3.select(id);
      if (TOUCH) card.classList.remove('open');
    });
    card.querySelector('.m3-copy').addEventListener('click', (e) => {
      const u = new URL(location.href); u.searchParams.set('object', id); u.searchParams.delete('embed');
      (navigator.clipboard ? navigator.clipboard.writeText(u.toString()) : Promise.reject()).then(() => { e.target.textContent = t('m3.copied'); }).catch(() => { prompt('', u.toString()); });
    });
    const u = new URL(location.href);
    if (u.searchParams.get('object') !== id) { u.searchParams.set('object', id); history.replaceState(null, '', u); }
    const my = ++evToken;
    supabase.from('site_object_events').select('happened_on,kind,text,by_name,hours,photos').eq('object_id', id).order('happened_on', { ascending: false }).order('created_at', { ascending: false }).limit(50)
      .then(({ data: ev, error }) => {
        if (my !== evToken) return;
        const box = card.querySelector('.m3-events'); if (!box) return;
        if (error || !ev || !ev.length) { box.innerHTML = '<div class="m3-empty">' + esc(t('m3.noevents')) + '</div>'; return; }
        box.innerHTML = ev.map((x) => '<div class="m3-ev"><time>' + esc(fmtDate(x.happened_on)) + (x.by_name ? ' · ' + esc(x.by_name) : '') + (x.hours ? ' · ' + esc(num(x.hours)) + ' ч' : '') + '</time>' + esc(x.text || '') + '</div>').join('');
      });
  }
  function closeCard() {
    current = null; card.classList.remove('open');
    if (scene3) scene3.select(null); if (svg) svg.select(null);
    const u = new URL(location.href); if (u.searchParams.has('object')) { u.searchParams.delete('object'); history.replaceState(null, '', u); }
  }
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (current) closeCard(); else if (scene3 && scene3.walking) scene3.exitWalk();
  });

  document.addEventListener('agora:lang', renderTexts);
  renderTexts();
  applyFilters();

  // Глубокая ссылка ?object=id
  const want = new URL(location.href).searchParams.get('object');
  const wantWalk = scene3 && new URL(location.href).searchParams.get('walk') === '1';
  if (want && data.objects.some((o) => o.id === want)) setTimeout(() => { openCard(want); if (wantWalk) { scene3.walkTo(want); scene3.select(want); } else focus(want); }, 60);
  else if (wantWalk) setTimeout(() => scene3.enterWalk(), 60);

  return { data, scene: scene3, openCard, closeCard, focus,
           dispose() { document.removeEventListener('agora:lang', renderTexts); if (scene3) scene3.dispose(); } };
}

// ─── SVG-схема сверху (без WebGL) ──────────────────────────────────────────
function drawSvg(view, data, onPick) {
  const NS = 'http://www.w3.org/2000/svg';
  const xs = LOT2D.map((p) => p[0]), zs = LOT2D.map((p) => p[1]);
  const minX = Math.min(...xs) - 10, maxX = Math.max(...xs) + 10, minZ = Math.min(...zs) - 10, maxZ = Math.max(...zs) + 10;
  const wrap = document.createElement('div'); wrap.className = 'm3-svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', [minX, minZ, maxX - minX, maxZ - minZ].join(' '));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
  el('polygon', { points: pts(LOT2D), fill: '#b9cf8f', stroke: '#c2185b', 'stroke-width': 1 });
  const gZones = el('g', {}), gPaths = el('g', {}), gObj = el('g', {}), gLab = el('g', {});
  const labels = [];
  for (const z of data.zones) {
    const poly = clipX(LOT2D, -Number(z.d_to), -Number(z.d_from)); if (poly.length < 3) continue;
    el('polygon', { points: pts(poly), fill: z.color, 'fill-opacity': 0.55 }, gZones);
    const m = zoneMid(z.d_from, z.d_to);
    if (m) labels.push({ e: el('text', { x: m[0], y: m[1], 'font-size': 6, 'text-anchor': 'middle', fill: '#2a2a22', 'font-family': 'Jost, sans-serif' }, gLab), o: z });
  }
  for (const p of data.paths) {
    const line = (p.points || []).map(([d, y]) => toScene(Number(d), Number(y)));
    if (p.closed) line.push(line[0]);
    const color = { trail: '#e8873a', utility: '#8a5a32', hedge: '#4f7f3d', walkway: '#6fa85a' }[p.type] || '#a8987a';
    const e = el('polyline', { points: pts(line), fill: 'none', stroke: color, 'stroke-width': Math.max(1, Number(p.width) || 1), 'stroke-linecap': 'round',
      'stroke-dasharray': p.type === 'trail' ? '6 4' : (p.type === 'utility' ? '3 3' : '') }, gPaths);
    e.dataset.phase = p.phase; e.dataset.status = p.status; e.dataset.layer = p.type === 'trail' ? 'run' : (p.type === 'utility' ? 'nets' : (p.type === 'hedge' ? 'trees' : 'paths'));
  }
  for (const line of defaultFence()) {   // будущий забор — светлый пунктир
    const e = el('polyline', { points: pts(line), fill: 'none', stroke: '#fbf8ef', 'stroke-width': 0.8, 'stroke-dasharray': '2 1.5' }, gPaths);
    e.dataset.phase = 1; e.dataset.status = 'planned'; e.dataset.layer = 'objects';
  }
  const objEls = new Map();
  const CAT = { building: '#d8b48a', residence: '#c79f7a', lodging: '#e3c49c', wellness: '#d4876a', farm: '#9fbf72', utility: '#8aa3b5',
    infrastructure: '#a19b8f', parking: '#b6b0a3', landmark: '#c4894a', feature: '#e2b25a', water: '#5aa6d2', reserve: '#c7c1b2' };
  for (const o of data.objects) {
    const [X, Z] = toScene(Number(o.d), Number(o.y));
    const g = el('g', { class: 'obj', transform: 'translate(' + X.toFixed(1) + ',' + Z.toFixed(1) + ') rotate(' + (-(Number(o.rotation_deg) || 0)) + ')' }, gObj);
    const st = o.status === 'done' ? { fill: CAT[o.category], 'fill-opacity': 1 } : { fill: CAT[o.category], 'fill-opacity': o.status === 'in_progress' ? 0.6 : 0.35, stroke: '#5b5345', 'stroke-width': 0.4, 'stroke-dasharray': o.status === 'planned' ? '1.5 1' : '' };
    if (o.r) el('circle', Object.assign({ r: Math.max(1.5, Number(o.r)) }, st), g);
    else { const w = Math.max(2, Number(o.w) || 2), l = Math.max(2, Number(o.l) || 2); el('rect', Object.assign({ x: -w / 2, y: -l / 2, width: w, height: l }, st), g); }
    el('title', {}, g).textContent = o.name_ru;
    g.addEventListener('click', () => onPick(o.id));
    g.dataset.phase = o.phase; g.dataset.status = o.status;
    objEls.set(o.id, g);
  }
  const sel = el('circle', { r: 6, fill: 'none', stroke: '#ff8a3d', 'stroke-width': 1.5, visibility: 'hidden' });
  wrap.appendChild(svg); view.appendChild(wrap);
  const note = document.createElement('div'); note.className = 'm3-svg-note m3-pill'; view.appendChild(note);
  return {
    setLang(l) {
      note.textContent = t('m3.svg.note');
      labels.forEach((L) => { L.e.textContent = (l === 'en' && L.o.name_en) ? L.o.name_en : L.o.name_ru; });
      objEls.forEach((g, id) => { const o = data.objects.find((x) => x.id === id); g.querySelector('title').textContent = (l === 'en' && o.name_en) ? o.name_en : o.name_ru; });
    },
    apply(state) {
      const ok = (e) => Number(e.dataset.phase) <= state.phase && (!state.doneOnly || e.dataset.status === 'done');
      gZones.style.display = state.layers.zones ? '' : 'none';
      gLab.style.display = state.layers.labels ? '' : 'none';
      gObj.style.display = state.layers.objects ? '' : 'none';
      objEls.forEach((g) => { g.style.display = ok(g) ? '' : 'none'; });
      gPaths.querySelectorAll('polyline').forEach((p) => { p.style.display = ok(p) && state.layers[p.dataset.layer] !== false ? '' : 'none'; });
    },
    select(id) {
      const o = id && data.objects.find((x) => x.id === id);
      if (!o) { sel.setAttribute('visibility', 'hidden'); return; }
      const [X, Z] = toScene(Number(o.d), Number(o.y));
      sel.setAttribute('cx', X); sel.setAttribute('cy', Z); sel.setAttribute('r', Math.max(6, (Number(o.r) || Math.hypot(Number(o.w) || 2, Number(o.l) || 2) / 2) + 3));
      sel.setAttribute('visibility', 'visible');
    },
  };
}
