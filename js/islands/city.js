// City Island: learn by building. Its scenery is here; the adventure (build a city of cloud services,
// then survive a traffic spike) arrives in a coming update.
import * as THREE from 'three';
import { drawCanvas } from '../utils.js';
import { std, mesh } from '../helpers.js';
import { clearPath } from './kit.js';

export default function build(kit) {
  const { scene, W, I, circle, rng } = kit;
  const [cx, cz] = I.c;
  const roadTex = drawCanvas(1024, 1024, (c, w, h) => {
    c.fillStyle = '#6b7280';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#374151';
    for (let i = 0; i < 4; i++) {
      c.fillRect(0, 120 + i * 260, w, 70);
      c.fillRect(120 + i * 260, 0, 70, h);
    }
    c.strokeStyle = '#fde68a';
    c.setLineDash([24, 18]);
    c.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.moveTo(0, 155 + i * 260); c.lineTo(w, 155 + i * 260); c.stroke();
      c.beginPath(); c.moveTo(155 + i * 260, 0); c.lineTo(155 + i * 260, h); c.stroke();
    }
  });
  const pave = mesh(new THREE.CircleGeometry(I.r - 1, 56).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }), cx, 0.03, cz, false);
  pave.receiveShadow = true;
  scene.add(pave);
  const winTex = drawCanvas(128, 256, (c, w, h) => {
    c.fillStyle = '#1e293b';
    c.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 22) for (let x = 8; x < w; x += 24) {
      c.fillStyle = rng() < 0.6 ? '#fde68a' : '#334155';
      c.fillRect(x, y, 14, 12);
    }
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  // a few finished towers and many empty plots waiting to be built
  const blocks = [];
  for (let gx = -2; gx <= 1; gx++) for (let gz = -2; gz <= 1; gz++) blocks.push([cx + gx * 13 + 6.5 - 1.5, cz + gz * 13 + 6.5 - 1.5]);
  blocks.forEach(([x, z], i) => {
    if (Math.hypot(x - cx, z - cz) > I.r - 9 || clearPath(I)(x, z)) return;
    if (i % 3 === 0) {
      const h = 6 + rng() * 14;
      const map = winTex.clone();
      map.repeat.set(2, Math.max(1, h / 6));
      map.needsUpdate = true;
      const mat = new THREE.MeshStandardMaterial({ map, emissive: '#fde68a', emissiveMap: map, emissiveIntensity: 0.35, roughness: 0.5 });
      scene.add(mesh(new THREE.BoxGeometry(6, h, 6), mat, x, h / 2, z));
      circle(x, z, 4, h);
    } else {
      const plot = mesh(new THREE.BoxGeometry(7, 0.12, 7), std('#a3a3a3'), x, 0.06, z, false);
      plot.receiveShadow = true;
      scene.add(plot);
      scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), std('#f97316'), x - 3.2, 0.6, z - 3.2));
    }
  });

  return {
    title: I.name,
    briefing: false,
    quest: () => [{ text: 'This island\u2019s adventure arrives in a coming update. Explore freely!', done: false }],
  };
}
