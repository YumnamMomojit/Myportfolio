// Mysterious Island: the cybersecurity escape. Its scenery is here; the adventure (cipher locks,
// phishing traps and a hidden temple) arrives in a coming update.
import * as THREE from 'three';
import { std, glowMat, mesh, jitter, softSpriteTexture } from '../helpers.js';
import { scatter, clearPath, instanced } from './kit.js';

export default function build(kit) {
  const { scene, W, I, circle, rng } = kit;
  const [cx, cz] = I.c;
  // stepped temple with a glowing rune door
  const temple = new THREE.Group();
  temple.position.set(cx, 0, cz - 4);
  const stone = std('#57534e');
  for (let i = 0; i < 5; i++) temple.add(mesh(new THREE.BoxGeometry(14 - i * 2.6, 1.6, 14 - i * 2.6), stone, 0, 0.8 + i * 1.6, 0));
  const door = mesh(new THREE.PlaneGeometry(2.4, 3), glowMat('#c084fc', 1.8), 0, 1.6, 7.02, false);
  temple.add(door);
  scene.add(temple);
  circle(cx, cz - 4, 7.2, 8);
  W.updaters.push((t) => (door.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.6));
  // broken columns
  const cols = scatter(I, 12, rng, 11, I.r - 3, clearPath(I));
  for (const [x, z, k] of cols) {
    const h = 1 + k * 4;
    const c = mesh(new THREE.CylinderGeometry(0.6, 0.7, h, 10), std('#78716c'), x, h / 2, z);
    c.rotation.z = (k - 0.5) * 0.3;
    scene.add(c);
    circle(x, z, 0.75, h);
  }
  // crystals and orbiting stones
  const crystals = scatter(I, 16, rng, 6, I.r - 3, clearPath(I));
  instanced(scene, new THREE.OctahedronGeometry(0.6, 0), glowMat('#a855f7', 1.6), crystals, ([x, z, k]) => ({ x, y: 0.5 + k, z, sx: 0.6 + k, sy: 1.4 + k * 2, sz: 0.6 + k, ry: k * 5 }));
  const orbit = new THREE.Group();
  orbit.position.set(cx, 12, cz - 4);
  for (let i = 0; i < 6; i++) {
    const s = mesh(jitter(new THREE.DodecahedronGeometry(0.8 + rng() * 0.6, 0), 0.2, rng), std('#6d6875'), Math.cos(i) * 8, Math.sin(i * 2) * 1.5, Math.sin(i) * 8, false);
    orbit.add(s);
  }
  scene.add(orbit);
  W.updaters.push((t) => (orbit.rotation.y = t * 0.15));
  // low drifting mist
  const mistTex = softSpriteTexture('210,200,235');
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.35 }));
    const a = rng() * Math.PI * 2, r = rng() * I.r * 0.8;
    s.position.set(cx + Math.cos(a) * r, 1.2, cz + Math.sin(a) * r);
    s.scale.setScalar(8 + rng() * 6);
    scene.add(s);
  }

  return {
    title: I.name,
    briefing: false,
    quest: () => [{ text: 'This island\u2019s adventure arrives in a coming update. Explore freely!', done: false }],
  };
}
