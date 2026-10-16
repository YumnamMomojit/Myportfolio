// Water Island: the networking harbour. Its scenery is here; the adventure (packets, DNS and the
// TCP handshake) arrives in a coming update.
import * as THREE from 'three';
import { std, glowMat, mesh, waterMaterial } from '../helpers.js';
import { scatter, clearPath, palm } from './kit.js';

const norm = (x, z) => { const l = Math.hypot(x, z); return [x / l, z / l]; };

export default function build(kit) {
  const { scene, W, I, circle, rng } = kit;
  const [cx, cz] = I.c;
  const lagoon = { x: cx, z: cz, r: 17 };
  const w = new THREE.Mesh(new THREE.CircleGeometry(lagoon.r, 56).rotateX(-Math.PI / 2), waterMaterial({ deep: '#075985', shallow: '#38bdf8', opacity: 0.92 }));
  w.position.set(cx, 0.07, cz);
  scene.add(w);
  W.lakes.push({ x: cx, z: cz, r: lagoon.r - 0.4, depth: -0.6 });
  // lighthouse on the far rim
  const away = norm(I.c[0], I.c[1]);
  const lx = cx + away[0] * (I.r - 6), lz = cz + away[1] * (I.r - 6);
  const lh = new THREE.Group();
  lh.position.set(lx, 0, lz);
  for (let i = 0; i < 5; i++) lh.add(mesh(new THREE.CylinderGeometry(1.5 - i * 0.18, 1.6 - i * 0.18, 2, 16), std(i % 2 ? '#dc2626' : '#f8fafc'), 0, 1 + i * 2, 0));
  const lamp = mesh(new THREE.SphereGeometry(0.7, 14, 10), glowMat('#fef08a', 3), 0, 10.8, 0, false);
  lh.add(lamp);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fef9c3', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.rotation.z = Math.PI / 2;
  beam.position.set(7, 0, 0);
  const pivot = new THREE.Group();
  pivot.position.y = 10.8;
  pivot.add(beam);
  lh.add(pivot);
  scene.add(lh);
  circle(lx, lz, 1.7, 12);
  W.updaters.push((t) => (pivot.rotation.y = t * 0.8));
  // boats bobbing in the lagoon
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.4, r = 6 + i * 2.2;
    const b = new THREE.Group();
    b.position.set(cx + Math.cos(a) * r, 0.1, cz + Math.sin(a) * r);
    b.add(mesh(new THREE.BoxGeometry(1.2, 0.4, 2.6), std(['#f97316', '#2563eb', '#16a34a', '#facc15'][i]), 0, 0.2, 0));
    b.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), std('#e5e7eb'), 0, 1.3, 0));
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), new THREE.MeshStandardMaterial({ color: '#f8fafc', side: THREE.DoubleSide }));
    sail.position.set(0, 1.4, 0.4);
    sail.rotation.y = Math.PI / 2;
    b.add(sail);
    b.rotation.y = a;
    scene.add(b);
    W.updaters.push((t) => {
      b.position.y = 0.1 + Math.sin(t * 1.5 + i) * 0.06;
      b.rotation.z = Math.sin(t * 1.2 + i) * 0.06;
    });
  }
  const palms = scatter(I, 12, rng, lagoon.r + 3, I.r - 3, clearPath(I));
  for (const [x, z] of palms) palm(scene, circle, x, z, rng);

  return {
    title: I.name,
    briefing: false,
    quest: () => [{ text: 'This island\u2019s adventure arrives in a coming update. Explore freely!', done: false }],
  };
}
