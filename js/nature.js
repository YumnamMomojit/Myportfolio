// Nature areas: the Waterfall Lagoon and the Snow Peak Valley.
import * as THREE from 'three';
import { makeLabel, drawCanvas, mulberry32 } from './utils.js';
import { std, mesh, jitter, waterMaterial, fallsMaterial, softSpriteTexture } from './helpers.js';

export const FALLS = { x: -28, z: 40, r: 7 };
export const SNOW = { x: -26, z: -39, r: 12 };
export const PEAK = { x: -30, z: -44, h: 10, r: 6 };
const POND = { x: -20, z: -43.5, r: 2.6 };
const SNOWMAN = { x: -19.5, z: -35.5 };

export function buildNature(scene, W, circle, quality) {
  const spots = {};
  buildFalls(scene, W, circle, spots, quality);
  buildSnow(scene, W, circle, spots, quality);
  return spots;
}

// =====================================================================
// Waterfall Lagoon — cliff, waterfall (with a secret cave behind it),
// a wadeable lagoon, and a stream that pours off the island's edge.
// =====================================================================

function buildFalls(scene, W, circle, spots, quality) {
  const rng = mulberry32(42);
  const L = new THREE.Vector2(FALLS.x, FALLS.z);
  const o = L.clone().normalize(); // outward, toward the island rim
  const c = new THREE.Vector2(-o.y, o.x); // from the lagoon toward the cliff
  const at = (alongC, alongO) => new THREE.Vector2(L.x + c.x * alongC + o.x * alongO, L.y + c.y * alongC + o.y * alongO);
  const faceC = Math.atan2(c.x, c.y); // local +z → c
  const water = waterMaterial({ deep: '#0b4f7c', shallow: '#3cc4f0', opacity: 0.88, scale: 1.2 });

  // lagoon
  const shore = mesh(new THREE.CircleGeometry(FALLS.r + 0.9, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e7d7a8', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), L.x, 0.035, L.y, false);
  shore.receiveShadow = true;
  scene.add(shore);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(FALLS.r, 64).rotateX(-Math.PI / 2), water);
  lake.position.set(L.x, 0.07, L.y);
  scene.add(lake);
  W.lakes.push({ x: L.x, z: L.y, r: FALLS.r - 0.3, depth: -0.6 });

  // cliff made of rock columns, with a recess (the secret cave) in the middle
  const rocks = [std('#7c7468'), std('#6b645b'), std('#857a6c')];
  const moss = std('#4f7d3b');
  for (const k of [-4.6, -3.2, -1.9, 0, 1.9, 3.2, 4.6]) {
    const recess = k === 0;
    const depth = recess ? 9.9 : 8.6;
    const h = recess ? 8.6 : 7.6 + rng() * 2.2;
    const p = at(depth, k);
    const b = mesh(jitter(new THREE.BoxGeometry(1.75, h, 2.6, 2, 3, 2), 0.35, rng), rocks[Math.floor(rng() * 3)], p.x, h / 2, p.y);
    b.rotation.y = faceC;
    scene.add(b);
    const cap = mesh(jitter(new THREE.BoxGeometry(1.95, 0.5, 2.8, 2, 1, 2), 0.25, rng), moss, p.x, h + 0.15, p.y);
    cap.rotation.y = faceC;
    scene.add(cap);
    circle(p.x, p.y, recess ? 1.0 : 1.0, h + 0.4);
    if (Math.abs(k) > 3) circle(at(depth - 0.6, k).x, at(depth - 0.6, k).y, 1.0, h + 0.4);
  }
  // overhanging lip the water pours from
  const lipP = at(8.2, 0);
  const lip = mesh(jitter(new THREE.BoxGeometry(3.6, 0.6, 3.6, 2, 1, 2), 0.2, rng), rocks[0], lipP.x, 8.9, lipP.y);
  lip.rotation.y = faceC;
  scene.add(lip);
  const topStream = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4).rotateX(-Math.PI / 2), waterMaterial({ deep: '#0b4f7c', shallow: '#7dd3fc', flow: 1.6 }));
  topStream.position.set(lipP.x, 9.22, lipP.y);
  topStream.rotation.y = faceC;
  scene.add(topStream);

  // the waterfall
  const fallsMat = fallsMaterial();
  const sheetP = at(6.75, 0);
  const sheetGeo = new THREE.PlaneGeometry(2.6, 9.1, 1, 12);
  const pos = sheetGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y01 = (pos.getY(i) + 4.55) / 9.1; // 0 bottom → 1 top
    pos.setZ(i, (1 - y01) * (1 - y01) * 0.5); // the base billows out toward the lagoon
  }
  sheetGeo.computeVertexNormals();
  const sheet = new THREE.Mesh(sheetGeo, fallsMat);
  sheet.position.set(sheetP.x, 4.55, sheetP.y);
  sheet.rotation.y = Math.atan2(-c.x, -c.y);
  sheet.renderOrder = 2;
  scene.add(sheet);

  // splash: foam rings, spray and mist
  const base = at(6.2, 0);
  spots.fallsSound = new THREE.Vector3(base.x, 1, base.y);
  const foam = [0, 1].map((i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: '#f0f9ff', transparent: true, depthWrite: false }));
    m.rotation.x = Math.PI / 2;
    m.position.set(base.x, 0.1, base.y);
    scene.add(m);
    return { m, ph: i * 0.5 };
  });
  const SPRAY = quality === 'high' ? 90 : 50;
  const sprayPos = new Float32Array(SPRAY * 3);
  const sprayVel = [];
  const resetDrop = (i) => {
    sprayPos[i * 3] = base.x + (rng() - 0.5) * 2.2;
    sprayPos[i * 3 + 1] = 0.1;
    sprayPos[i * 3 + 2] = base.y + (rng() - 0.5) * 2.2;
    sprayVel[i] = [(rng() - 0.5) * 2.5 - c.x * 1.2, 2 + rng() * 3.5, (rng() - 0.5) * 2.5 - c.y * 1.2];
  };
  for (let i = 0; i < SPRAY; i++) {
    resetDrop(i);
    sprayPos[i * 3 + 1] = rng() * 2;
  }
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: '#e0f2fe', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
  spray.frustumCulled = false;
  scene.add(spray);
  const mistTex = softSpriteTexture('235,248,255');
  const mists = [0, 1, 2].map((i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.35 }));
    s.position.set(base.x - c.x * 0.8 * i, 0.8 + i * 0.7, base.y - c.y * 0.8 * i);
    s.scale.setScalar(3.5 + i * 1.2);
    scene.add(s);
    return s;
  });

  // lily pads
  for (let i = 0; i < 5; i++) {
    const a = Math.atan2(-c.y, -c.x) + (rng() - 0.5) * 2.6;
    const rr = 2 + rng() * 3.6;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14, 0.4, Math.PI * 1.8).rotateX(-Math.PI / 2), std('#3f9d4a'));
    pad.position.set(L.x + Math.cos(a) * rr, 0.09, L.y + Math.sin(a) * rr);
    pad.rotation.y = rng() * 6;
    scene.add(pad);
    if (i % 2 === 0) scene.add(mesh(new THREE.IcosahedronGeometry(0.13, 0), std('#f9a8d4', { emissive: '#be185d', emissiveIntensity: 0.3 }), pad.position.x + 0.1, 0.2, pad.position.z, false));
    const ph = rng() * 6;
    W.updaters.push((t) => (pad.position.y = 0.09 + Math.sin(t * 1.2 + ph) * 0.02));
  }

  // shore rocks (not on the cliff side nor the outflow)
  const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2;
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    if (dir.dot(c) > 0.35 || dir.dot(o) > 0.88) continue;
    const s = 0.5 + rng() * 0.9;
    const r = mesh(rockGeo, rocks[i % 3], L.x + dir.x * (FALLS.r + 0.5), s * 0.25, L.y + dir.y * (FALLS.r + 0.5));
    r.scale.set(s, s * 0.7, s);
    r.rotation.set(rng() * 3, rng() * 3, 0);
    scene.add(r);
  }

  // outflow stream → edge falls
  const s0 = at(0, FALLS.r - 0.4), s1 = at(0, 15.6);
  const streamLen = s0.distanceTo(s1);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(2.2, streamLen).rotateX(-Math.PI / 2), waterMaterial({ deep: '#0b4f7c', shallow: '#56cdf5', flow: 2.2, opacity: 0.9 }));
  stream.position.set((s0.x + s1.x) / 2, 0.06, (s0.y + s1.y) / 2);
  stream.rotation.y = Math.atan2(-o.x, -o.y);
  scene.add(stream);
  for (const side of [-1.35, 1.35]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.5, streamLen).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8c48f', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    b.position.set((s0.x + s1.x) / 2 + c.x * side, 0.04, (s0.y + s1.y) / 2 + c.y * side);
    b.rotation.y = stream.rotation.y;
    b.receiveShadow = true;
    scene.add(b);
  }
  const edgeP = at(0, 15.3);
  const edgeFall = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 34, 1, 1), fallsMaterial());
  edgeFall.position.set(edgeP.x, -17, edgeP.y);
  edgeFall.rotation.y = Math.atan2(o.x, o.y);
  scene.add(edgeFall);
  const edgeMist = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 }));
  edgeMist.position.set(edgeP.x + o.x * 1.5, -30, edgeP.y + o.y * 1.5);
  edgeMist.scale.setScalar(12);
  scene.add(edgeMist);

  spots.caveGem = new THREE.Vector3(at(8.1, 0).x, 0.9, at(8.1, 0).y);

  W.updaters.push((t, dt) => {
    for (const f of foam) {
      const p = (t * 0.6 + f.ph) % 1;
      f.m.scale.setScalar(0.8 + p * 2.2);
      f.m.material.opacity = (1 - p) * 0.8;
    }
    for (let i = 0; i < SPRAY; i++) {
      const v = sprayVel[i];
      v[1] -= 9 * dt;
      sprayPos[i * 3] += v[0] * dt;
      sprayPos[i * 3 + 1] += v[1] * dt;
      sprayPos[i * 3 + 2] += v[2] * dt;
      if (sprayPos[i * 3 + 1] < 0.05) resetDrop(i);
    }
    sprayGeo.attributes.position.needsUpdate = true;
    mists.forEach((m, i) => {
      m.material.opacity = 0.28 + Math.sin(t * 1.3 + i * 2) * 0.1;
      m.scale.setScalar(3.6 + i * 1.2 + Math.sin(t * 0.9 + i) * 0.4);
    });
  });
}

// =====================================================================
// Snow Peak Valley — snowfall, snowy pines, a snowman, a slippery
// frozen pond, and a mountain you climb on icy stepping stones.
// =====================================================================

function buildSnow(scene, W, circle, spots, quality) {
  const rng = mulberry32(7);

  // soft-edged snow blanket
  const snowTex = drawCanvas(512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(250,252,255,1)');
    g.addColorStop(0.72, 'rgba(241,246,252,0.96)');
    g.addColorStop(1, 'rgba(241,246,252,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(186,214,240,${0.15 + rng() * 0.25})`;
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * w * 0.42;
      c.fillRect(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 2, 2);
    }
  });
  const blanket = new THREE.Mesh(
    new THREE.CircleGeometry(SNOW.r, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: snowTex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 })
  );
  blanket.position.set(SNOW.x, 0.04, SNOW.z);
  blanket.receiveShadow = true;
  scene.add(blanket);
  const snowMat = std('#f8fafc');
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, r = 4 + rng() * 6;
    const x = SNOW.x + Math.cos(a) * r, z = SNOW.z + Math.sin(a) * r;
    if (Math.hypot(x - PEAK.x, z - PEAK.z) < PEAK.r + 1.5 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1) continue;
    const d = mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), snowMat, x, 0, z);
    d.scale.set(1 + rng() * 1.4, 0.35 + rng() * 0.3, 0.8 + rng());
    scene.add(d);
  }

  // the mountain
  const rock = std('#8a8178');
  const coneGeo = jitter(new THREE.ConeGeometry(PEAK.r, PEAK.h, 10, 5), 0.5, rng, (x, y) => y < -PEAK.h / 2 + 0.01 || y > PEAK.h / 2 - 0.01);
  scene.add(mesh(coneGeo, rock, PEAK.x, PEAK.h / 2, PEAK.z));
  const capH = PEAK.h * 0.5;
  const capGeo = jitter(new THREE.ConeGeometry(PEAK.r * 0.55, capH, 10, 2), 0.2, rng, (x, y) => y > capH / 2 - 0.01);
  scene.add(mesh(capGeo, snowMat, PEAK.x, PEAK.h - capH / 2 + 0.05, PEAK.z));
  circle(PEAK.x, PEAK.z, 4.6, 4);

  // icy stepping stones spiralling up to the summit
  const a0 = Math.atan2(-PEAK.x, -PEAK.z);
  const stoneMat = std('#a7b4c2');
  for (let i = 0; i < 8; i++) {
    const y = 1.1 * (i + 1);
    const ang = a0 + i * 0.78;
    const rr = PEAK.r * (1 - y / PEAK.h) + 1.2;
    const x = PEAK.x + Math.sin(ang) * rr, z = PEAK.z + Math.cos(ang) * rr;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(mesh(jitter(new THREE.CylinderGeometry(1.0, 0.7, 0.55, 7), 0.12, rng), stoneMat, 0, -0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.1, 7), snowMat, 0, -0.02, 0));
    scene.add(g);
    W.platforms.push({ x, z, r: 1.05, top: y });
    const ph = rng() * 6;
    W.updaters.push((t) => (g.rotation.y = Math.sin(t * 0.4 + ph) * 0.1));
  }
  // summit
  W.platforms.push({ x: PEAK.x, z: PEAK.z, r: 1.8, top: PEAK.h });
  scene.add(mesh(new THREE.CylinderGeometry(1.85, 2.0, 0.45, 10), snowMat, PEAK.x, PEAK.h - 0.22, PEAK.z));
  const flag = new THREE.Group();
  flag.position.set(PEAK.x + 0.9, PEAK.h, PEAK.z);
  flag.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), std('#e5e7eb', { metalness: 0.5 }), 0, 1.3, 0));
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7, 6, 1), new THREE.MeshStandardMaterial({ color: '#f97316', side: THREE.DoubleSide, emissive: '#7c2d12', emissiveIntensity: 0.3 }));
  cloth.position.set(0.55, 0.6, 0);
  flag.add(cloth);
  scene.add(flag);
  const sumLabel = makeLabel('Snow Peak Summit', { sub: '10 m · you made it?', accent: '#e0f2fe', height: 0.5 });
  sumLabel.position.set(PEAK.x, PEAK.h + 3.4, PEAK.z);
  scene.add(sumLabel);
  const clothPos = cloth.geometry.attributes.position;
  const clothBase = Float32Array.from(clothPos.array);
  W.summit = { x: PEAK.x, z: PEAK.z, top: PEAK.h, cloth, raised: false };
  W.updaters.push((t, dt) => {
    for (let i = 0; i < clothPos.count; i++) {
      const x = clothBase[i * 3];
      clothPos.setZ(i, Math.sin(t * 6 + x * 5) * 0.08 * (x + 0.55));
    }
    clothPos.needsUpdate = true;
    cloth.position.y = THREE.MathUtils.damp(cloth.position.y, W.summit.raised ? 2.2 : 0.6, 3, dt);
  });

  // snowman (faces the island centre); a gem hides behind him
  const sm = new THREE.Group();
  sm.position.set(SNOWMAN.x, 0, SNOWMAN.z);
  sm.rotation.y = Math.atan2(-SNOWMAN.x, -SNOWMAN.z);
  sm.add(mesh(new THREE.SphereGeometry(0.8, 16, 12), snowMat, 0, 0.7, 0));
  sm.add(mesh(new THREE.SphereGeometry(0.56, 16, 12), snowMat, 0, 1.6, 0));
  sm.add(mesh(new THREE.SphereGeometry(0.38, 16, 12), snowMat, 0, 2.3, 0));
  const coal = std('#111827');
  for (const x of [-0.13, 0.13]) sm.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), coal, x, 2.4, 0.33));
  for (let i = 0; i < 3; i++) sm.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), coal, 0, 1.75 - i * 0.2, 0.53 - i * 0.02));
  const nose = mesh(new THREE.ConeGeometry(0.07, 0.4, 8), std('#f97316'), 0, 2.3, 0.52);
  nose.rotation.x = Math.PI / 2;
  sm.add(nose);
  sm.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 12), coal, 0, 2.78, 0));
  sm.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 14), coal, 0, 2.6, 0));
  const scarf = mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 18), std('#dc2626'), 0, 1.98, 0);
  scarf.rotation.x = Math.PI / 2;
  sm.add(scarf);
  scene.add(sm);
  circle(SNOWMAN.x, SNOWMAN.z, 0.8, 3);
  const out = new THREE.Vector2(SNOWMAN.x, SNOWMAN.z).normalize();
  spots.snowGem = new THREE.Vector3(SNOWMAN.x + out.x * 1.25, 0.8, SNOWMAN.z + out.y * 1.25);

  // frozen pond (slippery!)
  const ice = mesh(new THREE.CircleGeometry(POND.r, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#cfeefe', roughness: 0.08, metalness: 0.15, emissive: '#1e3a5f', emissiveIntensity: 0.15, polygonOffset: true, polygonOffsetFactor: -2 }), POND.x, 0.05, POND.z, false);
  ice.receiveShadow = true;
  scene.add(ice);
  W.ice.push(POND);

  // snowy pines
  const trunk = std('#7b5334');
  const green = std('#2b7a5b');
  for (const [x, z, s] of [[-34, -33, 1.2], [-36.5, -38.5, 1], [-22, -49.5, 1.1], [-16.5, -40, 0.9], [-31, -31.5, 1], [-38, -46, 1.2], [-25, -30.5, 0.85], [-17.5, -46.5, 1]]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.2, 5), trunk, 0, 0.6, 0));
    [[1.25, 1.9, 1.9], [0.95, 1.6, 3.0], [0.62, 1.3, 3.95]].forEach(([r, h, y]) => {
      g.add(mesh(new THREE.ConeGeometry(r, h, 7), green, 0, y, 0));
      g.add(mesh(new THREE.ConeGeometry(r * 0.75, h * 0.45, 7), snowMat, 0, y + h * 0.3, 0));
    });
    scene.add(g);
    circle(x, z, 0.45 * s, 6);
  }

  // falling snow
  const N = quality === 'high' ? 420 : 220;
  const sp = new Float32Array(N * 3);
  const seed = [];
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * SNOW.r;
    sp[i * 3] = SNOW.x + Math.cos(a) * r;
    sp[i * 3 + 1] = rng() * 16;
    sp[i * 3 + 2] = SNOW.z + Math.sin(a) * r;
    seed.push(rng() * 6);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const flakes = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true, opacity: 0.95, depthWrite: false }));
  flakes.frustumCulled = false;
  scene.add(flakes);
  W.updaters.push((t, dt) => {
    for (let i = 0; i < N; i++) {
      sp[i * 3 + 1] -= (1.1 + (seed[i] % 1) * 0.8) * dt;
      sp[i * 3] += Math.sin(t * 0.8 + seed[i]) * 0.35 * dt;
      if (sp[i * 3 + 1] < 0) sp[i * 3 + 1] = 16;
    }
    sg.attributes.position.needsUpdate = true;
  });
}
