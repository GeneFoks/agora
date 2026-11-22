// Геометрия участка без three.js (нужна и 3D-сцене, и SVG-фолбэку).
// d — метры от дороги на запад, y — метры от южной границы на север.
// План (сцена): X = −d (восток → +X), Z = −север (север → −Z).
const LAND = window.AGORA_LAND;
export const FX = 694.687;                 // x межевания у дороги, d = 0
const POLY = LAND.local;
const SOUTH = [POLY[3], POLY[4], POLY[5], POLY[6]];

export function southY(xs) {
  if (xs >= SOUTH[0][0]) return SOUTH[0][1];
  for (let i = 0; i < SOUTH.length - 1; i++) {
    const a = SOUTH[i], b = SOUTH[i + 1];
    if (xs <= a[0] && xs >= b[0]) return a[1] + (b[1] - a[1]) * (a[0] - xs) / (a[0] - b[0]);
  }
  return SOUTH[SOUTH.length - 1][1];
}
// Южный и северный край участка (в метрах межевания) на линии x
export function span(xs) {
  const ys = [];
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const a = POLY[j], b = POLY[i];
    if ((a[0] - xs) * (b[0] - xs) <= 0 && a[0] !== b[0]) ys.push(a[1] + (b[1] - a[1]) * (xs - a[0]) / (b[0] - a[0]));
  }
  ys.sort((p, q) => p - q);
  return ys.length >= 2 ? [ys[0], ys[ys.length - 1]] : null;
}
export function toScene(d, y) { const xs = FX - d; return [-d, -(y + southY(xs))]; }
export function fromScene(X, Z) { const d = -X, xs = FX - d; return [d, -Z - southY(xs)]; }
export const POLY_LOCAL = POLY;
export const LOT2D = POLY.map((p) => [p[0] - FX, -p[1]]);
export function insideLot(X, Z) {
  let c = false;
  for (let i = 0, j = LOT2D.length - 1; i < LOT2D.length; j = i++) {
    const [xi, zi] = LOT2D[i], [xj, zj] = LOT2D[j];
    if (((zi > Z) !== (zj > Z)) && (X < (xj - xi) * (Z - zi) / (zj - zi) + xi)) c = !c;
  }
  return c;
}
// Обрезка многоугольника полосой X ∈ [x0, x1]
export function clipX(poly, x0, x1) {
  function cut(pts, keep, edgeX) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ina = keep(a[0]), inb = keep(b[0]);
      if (ina) out.push(a);
      if (ina !== inb) { const t = (edgeX - a[0]) / (b[0] - a[0]); out.push([edgeX, a[1] + t * (b[1] - a[1])]); }
    }
    return out;
  }
  return cut(cut(poly, (x) => x >= x0, x0), (x) => x <= x1, x1);
}
// Центр полосы зоны (для подписи)
export function zoneMid(dFrom, dTo) {
  const xm = -(Number(dFrom) + Number(dTo)) / 2, sp = span(FX + xm);
  return sp ? [xm, -(sp[0] + sp[1]) / 2] : null;
}
