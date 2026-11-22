// АГОРА ТЕХАС — 3D-карта (цифровой двойник). Загружается лениво только в
// режиме «3D» на /map. Без сборки: three.js с CDN как ES-модуль.
//
// Координаты данных (как в мастер-плане): d — метры от дороги на запад,
// y — метры от южной границы на север. В сцене 1 единица = 1 метр, Y — вверх,
// север — направление −Z, восток — +X (дорога у X ≈ 0, участок уходит в −X).
// (В ТЗ указано x = d; это зеркалит карту, поэтому берём x = −d.)
// Привязка к земле — точная граница из межевания (window.AGORA_LAND).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { MapControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/MapControls.js/+esm';
import { makeGround } from '/map3d/ground.js';

import { FX, POLY_LOCAL as POLY, span, toScene, fromScene, LOT2D, insideLot, clipX } from '/map3d/geo.js';
export { toScene, fromScene };

function shapeGeo(pts2d, y) {
  const shape = new THREE.Shape(pts2d.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

// ─── Цвета ──────────────────────────────────────────────────────────────────
const CAT = {
  building: '#d8b48a', residence: '#c79f7a', lodging: '#e3c49c', wellness: '#d4876a', farm: '#9fbf72',
  utility: '#8aa3b5', infrastructure: '#a19b8f', parking: '#b6b0a3', landmark: '#c4894a', feature: '#e2b25a',
  water: '#5aa6d2', reserve: '#c7c1b2',
};
const PATH_STYLE = {
  ribbon_road: { color: '#b8a888', layer: 'paths' }, road: { color: '#a8987a', layer: 'paths' },
  track: { color: '#a89a6e', layer: 'paths' }, trail: { color: '#e8873a', layer: 'run' },
  walkway: { color: '#6fa85a', layer: 'paths' }, hedge: { color: '#4f7f3d', layer: 'trees' },
  utility: { color: '#8a5a32', layer: 'nets' },
};

// ─── Ленты (дороги и тропы) ─────────────────────────────────────────────────
function ribbon(points, width, y, closed) {
  const pts = closed ? points.concat([points[0]]) : points;
  const pos = [], idx = [];
  const half = width / 2;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const nx = -dz, nz = dx;
    pos.push(p[0] + nx * half, y, p[1] + nz * half, p[0] - nx * half, y, p[1] - nz * half);
    if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Пунктир: режем линию на отрезки «есть / нет»
function dashed(points, on, off, closed) {
  const pts = closed ? points.concat([points[0]]) : points;
  const out = [];
  let draw = true, left = on, cur = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    let a = pts[i]; const b = pts[i + 1];
    let segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (segLen > 0) {
      const step = Math.min(left, segLen), t = step / segLen;
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (draw) cur.push(p);
      left -= step; segLen -= step; a = p;
      if (left <= 1e-6) {
        if (draw && cur.length >= 2) out.push(cur);
        draw = !draw; left = draw ? on : off; cur = [p];
      }
    }
  }
  if (draw && cur.length >= 2) out.push(cur);
  return out;
}

// ─── Примитивы объектов ─────────────────────────────────────────────────────
function rng(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function gableRoof(w, l, h) {
  const s = new THREE.Shape();
  s.moveTo(-l / 2 - 0.3, 0); s.lineTo(l / 2 + 0.3, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.6, bevelEnabled: false });
  g.translate(0, 0, -(w + 0.6) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

function buildShape(o, mat, edgeMat) {
  const g = new THREE.Group();
  const w = Number(o.w) || 2, l = Number(o.l) || 2, h = Number(o.h) || 0.3, r = Number(o.r) || 2;
  const add = (geo, m, y, opts) => {
    const mesh = new THREE.Mesh(geo, m || mat);
    mesh.position.y = y || 0;
    if (opts && opts.x) mesh.position.x = opts.x;
    if (opts && opts.z) mesh.position.z = opts.z;
    mesh.userData.pick = o.id;
    g.add(mesh);
    if (edgeMat && !(opts && opts.noEdge)) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edgeMat);
      e.position.copy(mesh.position); g.add(e);
    }
    return mesh;
  };
  switch (o.shape) {
    case 'house': {
      const wallH = h * 0.62;
      add(new THREE.BoxGeometry(w, wallH, l), null, wallH / 2);
      add(gableRoof(w, l, h - wallH), null, wallH);
      break;
    }
    case 'pavilion': {
      const postH = h * 0.75;
      for (const sx of [-1, 1]) for (const sz of [-1, 0, 1])
        add(new THREE.CylinderGeometry(0.15, 0.15, postH, 6), null, postH / 2, { x: sx * (w / 2 - 0.3), z: sz * (l / 2 - 0.3), noEdge: true });
      add(gableRoof(w, l, h - postH), null, postH);
      break;
    }
    case 'greenhouse': {
      const geo = new THREE.CylinderGeometry(l / 2, l / 2, w, 16, 1, false, 0, Math.PI);
      geo.rotateZ(Math.PI / 2); geo.rotateX(Math.PI / 2);
      add(geo, null, 0); break;
    }
    case 'cylinder': add(new THREE.CylinderGeometry(r, r, h, 20), null, h / 2); break;
    case 'tower': {
      const legs = 4, top = 0.35;
      for (let i = 0; i < legs; i++) {
        const sx = i < 2 ? -1 : 1, sz = i % 2 ? -1 : 1;
        const leg = new THREE.CylinderGeometry(0.12, 0.18, h, 5);
        const m = add(leg, null, h / 2, { x: sx * (w / 2) * (1 - top / 2), z: sz * (l / 2) * (1 - top / 2), noEdge: true });
        m.rotation.z = -sx * 0.06; m.rotation.x = sz * 0.06;
      }
      for (let k = 1; k <= 3; k++) {
        const y = (h / 4) * k, s = 1 - (top * y) / h;
        add(new THREE.BoxGeometry(w * s, 0.12, 0.12), null, y, { z: (l / 2) * s, noEdge: true });
        add(new THREE.BoxGeometry(w * s, 0.12, 0.12), null, y, { z: -(l / 2) * s, noEdge: true });
        add(new THREE.BoxGeometry(0.12, 0.12, l * s), null, y, { x: (w / 2) * s, noEdge: true });
        add(new THREE.BoxGeometry(0.12, 0.12, l * s), null, y, { x: -(w / 2) * s, noEdge: true });
      }
      const lamp = add(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 0.6 }), h + 0.7, { noEdge: true });
      lamp.userData.lantern = true;
      if (o.h_final && o.h_final > h) {
        const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, o.h_final - h, 4), new THREE.MeshBasicMaterial({ color: '#c4894a', transparent: true, opacity: 0.4 }));
        ghost.position.y = h + (o.h_final - h) / 2; g.add(ghost);
      }
      break;
    }
    case 'gate': {
      const pw = Math.max(w, 1.2), opening = l * 0.6;
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(pw, h, (l - opening) / 2), null, h / 2, { z: s * (opening / 2 + (l - opening) / 4) });
      const arch = new THREE.TorusGeometry(opening / 2, 0.45, 6, 16, Math.PI);
      arch.rotateY(Math.PI / 2);
      add(arch, null, h * 0.55, { noEdge: true });
      break;
    }
    case 'rock_wall': {
      const geo = new THREE.BoxGeometry(w, h, l, 2, 2, Math.max(2, Math.round(l)));
      const p = geo.attributes.position, rnd = rng(o.id);
      for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) * (0.8 + rnd() * 0.5)); p.setY(i, p.getY(i) * (0.75 + rnd() * 0.5)); }
      geo.computeVertexNormals();
      add(geo, null, h / 2, { noEdge: true });
      break;
    }
    case 'ring': {
      const geo = new THREE.TorusGeometry(r, 0.35, 6, 32); geo.rotateX(Math.PI / 2);
      add(geo, null, Math.max(h, 0.35) / 2);
      add(new THREE.CylinderGeometry(0.8, 0.9, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#6b4a32' }), 0.15, { noEdge: true });
      break;
    }
    case 'ring_path': {
      const geo = new THREE.RingGeometry(r - 1, r + 1, 64); geo.rotateX(-Math.PI / 2);
      add(geo, null, 0.07, { noEdge: true }); break;
    }
    case 'ring_sectors': {
      const geo = new THREE.CircleGeometry(r, 48); geo.rotateX(-Math.PI / 2);
      add(geo, null, 0.06, { noEdge: true });
      const n = Number(o.sectors) || 8, pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push(0, 0.09, 0, Math.cos(a) * r, 0.09, Math.sin(a) * r); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#5c7a3c' })); g.add(lines);
      const rim = new THREE.RingGeometry(r - 0.25, r + 0.25, 64); rim.rotateX(-Math.PI / 2);
      add(rim, new THREE.MeshBasicMaterial({ color: '#7b6a4a' }), 0.08, { noEdge: true });
      break;
    }
    case 'flat': { const geo = new THREE.PlaneGeometry(w, l); geo.rotateX(-Math.PI / 2); add(geo, null, 0.06, { noEdge: true }); break; }
    case 'flat_dashed': {
      const geo = new THREE.PlaneGeometry(w, l); geo.rotateX(-Math.PI / 2);
      add(geo, new THREE.MeshBasicMaterial({ color: mat.color, transparent: true, opacity: 0.12, depthWrite: false }), 0.05, { noEdge: true });
      const hw = w / 2, hl = l / 2;
      const outline = new THREE.BufferGeometry().setFromPoints([[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl], [-hw, -hl]].map(([x, z]) => new THREE.Vector3(x, 0.1, z)));
      const line = new THREE.Line(outline, new THREE.LineDashedMaterial({ color: '#6d665a', dashSize: 2, gapSize: 1.5 }));
      line.computeLineDistances(); g.add(line);
      break;
    }
    case 'pond': {
      const geo = new THREE.CircleGeometry(0.5, 40); geo.rotateX(-Math.PI / 2); geo.scale(w, 1, l);
      add(geo, new THREE.MeshStandardMaterial({ color: '#4c9ccc', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }), 0.08, { noEdge: true });
      break;
    }
    case 'pole': {
      add(new THREE.CylinderGeometry(0.08, 0.08, h, 6), null, h / 2, { noEdge: true });
      add(new THREE.BoxGeometry(0.4, 0.3, 0.3), null, h, { noEdge: true });
      break;
    }
    default: add(new THREE.BoxGeometry(w, h, l), null, h / 2);
  }
  return g;
}

// Материал по статусу: planned — «призрак» с контуром; in_progress — каркас;
// done — сплошной цвет категории.
function materialsFor(o) {
  const color = new THREE.Color(CAT[o.category] || '#cccccc');
  if (o.status === 'done') return { mat: new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), edge: null };
  if (o.status === 'in_progress') {
    return { mat: new THREE.MeshStandardMaterial({ color, roughness: 0.9, wireframe: true }),
             edge: new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.6) }) };
  }
  return { mat: new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: true, opacity: 0.38, depthWrite: false }),
           edge: new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.55), transparent: true, opacity: 0.85 }) };
}

// ─── Сцена ──────────────────────────────────────────────────────────────────
export function createScene(container, data, opts = {}) {
  let needs = true, raf = 0, frameHook = null;   // рендер по требованию
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 8000);
  const controls = new MapControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 8;
  controls.maxDistance = 2200;
  controls.screenSpacePanning = false;

  const hemi = new THREE.HemisphereLight('#f4efe2', '#6d7a4f', 1.1);
  const sun = new THREE.DirectionalLight('#fff3dc', 1.6);
  sun.position.set(-200, 400, 300);
  scene.add(hemi, sun);

  const layers = { zones: new THREE.Group(), objects: new THREE.Group(), paths: new THREE.Group(), run: new THREE.Group(),
                   trees: new THREE.Group(), nets: new THREE.Group(), context: new THREE.Group() };
  Object.values(layers).forEach((g) => scene.add(g));

  // Земля — сменный модуль (сейчас плоская; потом карта высот)
  const ground = makeGround(THREE, { lot: LOT2D, shapeGeo });
  layers.context.add(ground.object);

  // Зоны — полосы по d, обрезанные контуром
  const zoneLabels = [];
  for (const z of data.zones) {
    const x0 = -Number(z.d_to), x1 = -Number(z.d_from);
    const poly = clipX(LOT2D, x0, x1);
    if (poly.length < 3) continue;
    const mat = new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: z.no_build ? 0.55 : 0.42, depthWrite: false });
    const mesh = new THREE.Mesh(shapeGeo(poly, 0.04), mat);
    layers.zones.add(mesh);
    const xm = (x0 + x1) / 2, sp = span(FX + xm);
    if (sp) zoneLabels.push({ text: z.name_ru, text_en: z.name_en, pos: new THREE.Vector3(xm, 0.5, -(sp[0] + sp[1]) / 2), zone: true, noBuild: z.no_build });
  }
  // Граница участка
  const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(LOT2D.map(([x, z]) => new THREE.Vector3(x, 0.15, z))),
    new THREE.LineBasicMaterial({ color: '#c2185b' }));
  layers.context.add(border);

  // Дорога CR 132 и опоры ЛЭП (вне участка, вдоль передней границы)
  {
    const a = POLY[3], b = POLY[1];
    const dir = new THREE.Vector2(b[0] - a[0], b[1] - a[1]).normalize();       // вдоль дороги (межевание)
    const east = new THREE.Vector2(dir.y, -dir.x);                                // наружу, на восток
    const mid = new THREE.Vector2((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    const P = (t, off) => { const p = mid.clone().add(dir.clone().multiplyScalar(t)).add(east.clone().multiplyScalar(off)); return [p.x - FX, -p.y]; };
    const roadPts = []; for (let t = -400; t <= 400; t += 20) roadPts.push(P(t, 11));
    layers.context.add(new THREE.Mesh(ribbon(roadPts, 7.5, 0.03), new THREE.MeshStandardMaterial({ color: '#8f8676', roughness: 1 })));
    const poleMat = new THREE.MeshStandardMaterial({ color: '#6e5a44' });
    const wire = [];
    for (let t = -360; t <= 360; t += 60) {
      const [x, z] = P(t, 3);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 9, 6), poleMat);
      pole.position.set(x, 4.5, z); layers.context.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), poleMat);
      arm.position.set(x, 8.6, z); arm.rotation.y = Math.atan2(dir.x, dir.y); layers.context.add(arm);
      wire.push(new THREE.Vector3(x, 8.6, z));
    }
    layers.context.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: '#3d3d3d' })));
  }

  // Пути
  const pathItems = [];
  for (const p of data.paths) {
    const st = PATH_STYLE[p.type] || PATH_STYLE.walkway;
    const pts = (p.points || []).map(([d, y]) => toScene(Number(d), Number(y)));
    const g = new THREE.Group();
    const planned = p.status !== 'done';
    const color = new THREE.Color(st.color);
    if (p.type === 'ribbon_road') {
      // две гравийные колеи
      for (const off of [-0.9, 0.9]) {
        const shifted = pts.map(([x, z], i) => { const n = pts[Math.min(i + 1, pts.length - 1)], pr = pts[Math.max(i - 1, 0)]; const dx = n[0] - pr[0], dz = n[1] - pr[1], len = Math.hypot(dx, dz) || 1; return [x - (dz / len) * off, z + (dx / len) * off]; });
        g.add(new THREE.Mesh(ribbon(shifted, 0.6, 0.09), new THREE.MeshBasicMaterial({ color, transparent: planned, opacity: planned ? 0.75 : 1 })));
      }
    } else if (p.type === 'trail' || p.type === 'utility') {
      const segs = dashed(pts, p.type === 'trail' ? 6 : 3, p.type === 'trail' ? 4 : 3, p.closed);
      for (const s of segs) g.add(new THREE.Mesh(ribbon(s, Number(p.width) || 1, 0.11), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })));
    } else if (p.type === 'hedge') {
      const shrub = new THREE.SphereGeometry(1, 8, 6);
      const total = pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
      const n = Math.max(2, Math.floor(total / 2.5));
      const inst = new THREE.InstancedMesh(shrub, new THREE.MeshStandardMaterial({ color, transparent: planned, opacity: planned ? 0.6 : 1 }), n);
      const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { const t = i / (n - 1); const x = pts[0][0] + (pts[pts.length - 1][0] - pts[0][0]) * t, z = pts[0][1] + (pts[pts.length - 1][1] - pts[0][1]) * t; m.compose(new THREE.Vector3(x, 0.8, z), new THREE.Quaternion(), new THREE.Vector3(1.1, 0.9, 1.1)); inst.setMatrixAt(i, m); }
      g.add(inst);
    } else {
      g.add(new THREE.Mesh(ribbon(pts, Number(p.width) || 2, p.type === 'walkway' ? 0.1 : 0.08),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: p.phase >= 2 && planned ? 0.45 : (planned ? 0.85 : 1), depthWrite: false })));
    }
    g.userData = { phase: p.phase, status: p.status, kind: 'path' };
    (layers[st.layer] || layers.paths).add(g);
    pathItems.push(g);
  }

  // Объекты
  const objectItems = new Map();
  const labels = [...zoneLabels];
  const LABELED = new Set(['building', 'wellness', 'landmark', 'farm', 'feature', 'water', 'lodging', 'residence']);
  for (const o of data.objects) {
    const { mat, edge } = materialsFor(o);
    const g = buildShape(o, mat, edge);
    const [X, Z] = toScene(Number(o.d), Number(o.y));
    g.position.set(X, 0, Z);
    g.rotation.y = -THREE.MathUtils.degToRad(Number(o.rotation_deg) || 0);
    g.userData = { id: o.id, obj: o, phase: o.phase, status: o.status, kind: 'object' };
    layers.objects.add(g);
    objectItems.set(o.id, g);
    if (LABELED.has(o.category)) labels.push({ text: o.name_ru, text_en: o.name_en, pos: new THREE.Vector3(X, (Number(o.h) || 1) + 2.5, Z), id: o.id });
  }

  // Деревья — инстансами
  const treeItems = [];
  {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.6, 5); trunkGeo.translate(0, 0.8, 0);
    const coneGeo = new THREE.ConeGeometry(1.6, 4.5, 7); coneGeo.translate(0, 3.6, 0);
    const ballGeo = new THREE.IcosahedronGeometry(1.7, 0); ballGeo.translate(0, 2.9, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4f36' });
    for (const ta of data.trees) {
      const spots = [];
      if (ta.type === 'line_offset_from_north') {
        for (let d = Number(ta.d_from); d <= Number(ta.d_to); d += Number(ta.spacing) || 8) {
          const sp = span(FX - d); if (!sp) continue;
          spots.push([-d, -(sp[1] - (Number(ta.offset) || 3))]);
        }
      } else {
        const rnd = rng(ta.id), excl = (ta.exclude || []).map((id) => data.objects.find((x) => x.id === id)).filter(Boolean);
        let guard = 0;
        while (spots.length < (Number(ta.count) || 30) && guard++ < 5000) {
          const d = Number(ta.d_from) + rnd() * (Number(ta.d_to) - Number(ta.d_from));
          const sp = span(FX - d); if (!sp) continue;
          const yy = sp[0] + 4 + rnd() * Math.max(0, sp[1] - sp[0] - 8);
          const [X, Z] = [-d, -yy];
          if (!insideLot(X, Z)) continue;
          if (excl.some((e) => { const [ex, ez] = toScene(Number(e.d), Number(e.y)); return Math.hypot(ex - X, ez - Z) < (Number(e.r) || 10) + 3; })) continue;
          spots.push([X, Z]);
        }
      }
      const crownGeo = ta.type === 'scatter' ? ballGeo : coneGeo;
      const planned = ta.status !== 'done';
      const crownMat = new THREE.MeshStandardMaterial({ color: ta.type === 'scatter' ? '#6c9a3e' : '#3f6b35', transparent: planned, opacity: planned ? 0.55 : 1, flatShading: true });
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
      const crowns = new THREE.InstancedMesh(crownGeo, crownMat, spots.length);
      const m = new THREE.Matrix4(), rnd = rng(ta.id + 's');
      spots.forEach(([x, z], i) => { const s = 0.8 + rnd() * 0.45; m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trunks.setMatrixAt(i, m); crowns.setMatrixAt(i, m); });
      const g = new THREE.Group(); g.add(trunks, crowns);
      g.userData = { phase: ta.phase, status: ta.status, kind: 'trees' };
      layers.trees.add(g); treeItems.push(g);
    }
  }

  // Звёзды (ночной режим)
  const stars = (() => {
    const n = 1800, pos = new Float32Array(n * 3), rnd = rng('stars');
    for (let i = 0; i < n; i++) {
      const u = rnd(), v = rnd() * 0.5 + 0.02, th = u * Math.PI * 2, ph = Math.acos(1 - v);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 3500 - 350; pos[i * 3 + 1] = Math.cos(ph) * 3500; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 3500 - 75;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff8e8', size: 2.2, sizeAttenuation: false, fog: false }));
    p.visible = false; scene.add(p); return p;
  })();
  const lanternLight = new THREE.PointLight('#ffb347', 0, 120, 1.6);
  const lh = objectItems.get('lighthouse');
  if (lh) { lanternLight.position.set(lh.position.x, (Number(lh.userData.obj.h) || 6) + 1, lh.position.z); scene.add(lanternLight); }

  // ─── Камеры ───────────────────────────────────────────────────────────────
  const CENTER = new THREE.Vector3(-347, 0, -72);
  const views = {
    road: { pos: new THREE.Vector3(150, 240, 150), target: new THREE.Vector3(-290, 0, -70) },
    top: { pos: new THREE.Vector3(CENTER.x, 820, CENTER.z + 0.01), target: CENTER.clone() },
  };
  camera.position.copy(views.road.pos); controls.target.copy(views.road.target); controls.update();

  let anim = null;
  function flyTo(pos, target, ms = 700) {
    anim = { t0: performance.now(), ms, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos.clone(), t1: target.clone() };
    request();
  }
  function setView(name) {
    const v = views[name]; if (!v) return;
    // на узком экране отодвигаем камеру, чтобы участок поместился
    const k = Math.max(1, 1.25 / Math.max(0.3, camera.aspect));
    flyTo(v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(k)), v.target);
  }
  function focusObject(id) {
    const g = objectItems.get(id); if (!g) return false;
    const o = g.userData.obj, size = Math.max(Number(o.w) || 0, Number(o.l) || 0, (Number(o.r) || 0) * 2, 8);
    const target = new THREE.Vector3(g.position.x, 0, g.position.z);
    const dist = Math.max(30, size * 3.2);
    flyTo(new THREE.Vector3(target.x + dist * 0.75, dist * 0.8, target.z + dist * 0.55), target);
    return true;
  }

  // ─── Видимость: слои, фаза, «только построенное» ──────────────────────────
  const state = { phase: 3, doneOnly: false, layers: { zones: true, objects: true, paths: true, run: true, trees: true, nets: false, labels: true }, night: false };
  function applyFilters() {
    const ok = (u) => u.phase <= state.phase && (!state.doneOnly || u.status === 'done');
    for (const [k, g] of Object.entries(layers)) if (k !== 'context') g.visible = state.layers[k] !== false;
    objectItems.forEach((g) => { g.visible = ok(g.userData); });
    pathItems.forEach((g) => { g.visible = ok(g.userData); });
    treeItems.forEach((g) => { g.visible = ok(g.userData); });
    request();
  }
  function setNight(on) {
    state.night = on;
    scene.background = new THREE.Color(on ? '#0b1020' : '#cfe0ea');
    scene.fog = on ? new THREE.Fog('#0b1020', 900, 4200) : new THREE.Fog('#cfe0ea', 1400, 5200);
    hemi.intensity = on ? 0.25 : 1.1; sun.intensity = on ? 0.12 : 1.6;
    stars.visible = on; lanternLight.intensity = on ? 2.6 : 0;
    scene.traverse((m) => { if (m.userData && m.userData.lantern) m.material.emissiveIntensity = on ? 2.2 : 0.6; });
    request();
  }
  setNight(false);
  applyFilters();

  // ─── Выделение ─────────────────────────────────────────────────────────────
  const sel = new THREE.Mesh(new THREE.RingGeometry(1, 1.25, 48), new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0.95, depthWrite: false }));
  sel.rotation.x = -Math.PI / 2; sel.visible = false; scene.add(sel);
  function select(id) {
    const g = id && objectItems.get(id);
    if (!g) { sel.visible = false; request(); return; }
    const o = g.userData.obj, rad = Math.max(Number(o.r) || 0, Math.hypot(Number(o.w) || 2, Number(o.l) || 2) / 2) + 1.5;
    sel.scale.setScalar(rad); sel.position.set(g.position.x, 0.2, g.position.z); sel.visible = true; request();
  }

  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(layers.objects.children, true).filter((h) => h.object.userData.pick && h.object.parent.visible);
    if (hits.length) return { id: hits[0].object.userData.pick };
    const gh = raycaster.intersectObject(ground.object, true)[0];
    if (gh) { const [d, y] = fromScene(gh.point.x, gh.point.z); return { ground: { d, y, inside: insideLot(gh.point.x, gh.point.z) } }; }
    return null;
  }

  // ─── Подписи (DOM) ─────────────────────────────────────────────────────────
  const labelLayer = document.createElement('div');
  labelLayer.className = 'm3-labels';
  container.appendChild(labelLayer);
  labels.forEach((L) => { L.el = document.createElement('div'); L.el.className = 'm3-label' + (L.zone ? ' zone' : '') + (L.noBuild ? ' nobuild' : ''); labelLayer.appendChild(L.el); });
  function setLabelTexts(lang) { labels.forEach((L) => { L.el.textContent = (lang === 'en' && L.text_en) ? L.text_en : L.text; }); }
  const v3 = new THREE.Vector3();
  function placeLabels() {
    const show = state.layers.labels;
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    const camDist = camera.position.distanceTo(controls.target);
    labels.forEach((L) => {
      let vis = show;
      if (vis && L.id) { const g = objectItems.get(L.id); vis = g && g.visible && state.layers.objects && camDist < 330; }
      if (vis && L.zone) vis = state.layers.zones && camDist > 120;
      if (vis) { v3.copy(L.pos).project(camera); vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1; }
      if (!vis) { L.el.style.display = 'none'; return; }
      L.el.style.display = 'block';
      L.el.style.transform = 'translate(-50%,-100%) translate(' + ((v3.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - v3.y) / 2 * H).toFixed(1) + 'px)';
    });
  }

  // ─── Рендер по требованию ─────────────────────────────────────────────────

  function request() { needs = true; if (!raf) raf = requestAnimationFrame(loop); }
  function loop(now) {
    raf = 0;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0v, anim.t1, e);
      if (k >= 1) anim = null;
      needs = true;
    }
    const moved = controls.update();
    if (needs || moved || anim) {
      needs = false;
      renderer.render(scene, camera);
      placeLabels();
      if (frameHook) frameHook(camera, controls);
    }
    if (anim || moved) raf = requestAnimationFrame(loop);
  }
  controls.addEventListener('change', request);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); request();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  { const v = views.road, k = Math.max(1, 1.25 / Math.max(0.3, camera.aspect));
    camera.position.copy(v.target.clone().add(v.pos.clone().sub(v.target).multiplyScalar(k))); controls.update(); request(); }

  return {
    THREE, renderer, scene, camera, controls, state, objectItems,
    setView, flyTo, focusObject, select, pick, applyFilters, setNight, request, setLabelTexts,
    onFrame(fn) { frameHook = fn; },
    dispose() { ro.disconnect(); cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); container.innerHTML = ''; },
  };
}
