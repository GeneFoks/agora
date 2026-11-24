// Сменный модуль «земля». Сейчас — плоская земля: поле вокруг и участок.
// Позже (этап «рельеф») этот файл заменяется на загрузчик карты высот
// (DEM USGS 3DEP / TxGIO → heightmap) с тем же интерфейсом:
//   makeGround(THREE, { lot, shapeGeo, fx, renderer }) → { object, heightAt(X, Z) }
// Остальная сцена ставит объекты на heightAt(), поэтому переписывать её не придётся.
//
// Земля участка расчерчена сеткой как на 2D-карте: клетки 1×1 м и сотки 10×10 м
// (жирнее), по метрам межевания — начало сетки в точке (0, 0) межевания.
function gridTexture(THREE, renderer) {
  const N = 1024, M = N / 10;                     // текстура = 10×10 м, 102,4 px на метр
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#b9cf8f'; g.fillRect(0, 0, N, N);
  g.fillStyle = 'rgba(52, 70, 34, 0.32)';         // клетки 1×1 м
  for (let i = 1; i < 10; i++) { const p = Math.round(i * M); g.fillRect(p - 1, 0, 2, N); g.fillRect(0, p - 1, N, 2); }
  g.fillStyle = 'rgba(52, 70, 34, 0.62)';         // границы соток 10×10 м
  g.fillRect(0, 0, 3, N); g.fillRect(N - 3, 0, 3, N); g.fillRect(0, 0, N, 3); g.fillRect(0, N - 3, N, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  return t;
}

export function makeGround(THREE, { lot, shapeGeo, fx = 0, renderer }) {
  const g = new THREE.Group();
  const field = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshStandardMaterial({ color: '#a3a77f', roughness: 1 }));
  field.rotation.x = -Math.PI / 2;
  field.position.set(-350, -0.02, -75);
  g.add(field);
  // UV у ShapeGeometry = (x межевания − fx, y межевания) в метрах → сдвигаем на fx
  const tex = gridTexture(THREE, renderer);
  tex.repeat.set(0.1, 0.1);
  tex.offset.set((fx * 0.1) % 1, 0);
  const lotMesh = new THREE.Mesh(shapeGeo(lot, 0.01), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  g.add(lotMesh);
  return { object: g, heightAt: () => 0 };
}
