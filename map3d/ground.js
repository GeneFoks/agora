// Сменный модуль «земля». Сейчас — плоская земля: поле вокруг и участок.
// Позже (этап «рельеф») этот файл заменяется на загрузчик карты высот
// (DEM USGS 3DEP / TxGIO → heightmap) с тем же интерфейсом:
//   makeGround(THREE, { lot, shapeGeo }) → { object, heightAt(X, Z) }
// Остальная сцена ставит объекты на heightAt(), поэтому переписывать её не придётся.
export function makeGround(THREE, { lot, shapeGeo }) {
  const g = new THREE.Group();
  const field = new THREE.Mesh(new THREE.PlaneGeometry(4000, 3000), new THREE.MeshStandardMaterial({ color: '#a3a77f', roughness: 1 }));
  field.rotation.x = -Math.PI / 2;
  field.position.set(-350, -0.02, -75);
  g.add(field);
  const lotMesh = new THREE.Mesh(shapeGeo(lot, 0.01), new THREE.MeshStandardMaterial({ color: '#b9cf8f', roughness: 1 }));
  g.add(lotMesh);
  return { object: g, heightAt: () => 0 };
}
