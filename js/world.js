import * as THREE from 'three';
import { makeLabel, drawCanvas, wrapText, mulberry32, FONT, MONO } from './utils.js';
import { PROFILE, EXPERIENCE, PROJECTS, SKILLS, PUBLICATIONS, THESES, JOURNEY } from './data.js';
import { INDIA, MANIPUR } from './india.js';
import { std, glowMat, mesh, beam, jitter, groundDisc, glowRing, waterTime, oceanMaterial, riverMaterial } from './helpers.js';
import { buildNature, FALLS, SNOW } from './nature.js';
import { buildLab } from './lab.js';
import { buildArena } from './arena.js';
import { buildArchipelago, STATIONS } from './archipelago.js';

export const ISLAND_R = 64;
export const WALK_R = 62.6;
export const SPAWN = { x: 0, z: 31 };

export const ZONES = [
  { id: 'about', name: 'Profile Totem', sub: 'who I am', x: 0, z: 18, r: 7, color: '#5eead4' },
  { id: 'skills', name: 'The Skill Tree', sub: 'what I work with', x: 0, z: 0, r: 10, color: '#4ade80' },
  { id: 'journey', name: 'India Journey Map', sub: 'from Thoubal, Manipur', x: 44, z: 1, r: 16, color: '#fb923c' },
  { id: 'experience', name: 'Career Timeline', sub: 'how I got here', x: 31, z: -17, r: 15, color: '#fbbf24' },
  { id: 'projects', name: 'Project Data Center', sub: 'things I built', x: -30, z: -18, r: 11, color: '#60a5fa' },
  { id: 'education', name: 'Hall of Credentials', sub: 'degrees & certifications', x: 30, z: 21, r: 9, color: '#f472b6' },
  { id: 'publications', name: 'Research Library', sub: 'papers & theses', x: -30, z: 21, r: 9, color: '#c084fc' },
  { id: 'contact', name: 'Signal Beacon', sub: 'get in touch', x: 0, z: -38, r: 9, color: '#f87171' },
  { id: 'arena', name: 'Brain Arena', sub: "maths · code · flying Rubik's cube", x: 18, z: -44, r: 9, color: '#f59e0b' },
  { id: 'lab', name: 'AI Learning Lab', sub: 'agents · 3D · ML · neural nets', x: -46, z: 2, r: 9.5, color: '#22d3ee' },
  { id: 'park', name: 'Fun Park', sub: 'ride · throw · bounce', x: 4, z: 45, r: 12, color: '#f97316' },
  { id: 'falls', name: 'Waterfall Lagoon', sub: 'listen to the water', x: -28, z: 40, r: 10, color: '#38bdf8' },
  { id: 'snow', name: 'Snow Peak Valley', sub: 'climb to the summit', x: -26, z: -39, r: 12, color: '#bae6fd' },
];

export const SKY_ISLAND = { x: -16, z: -5, r: 4.8, top: 12 };
const PAD = { x: -8, z: 9 };
const ORB_SPOTS = [
  [14, 12, 1.4], [-20, 4, 1.4], [17, -31, 1.4], [-13, -33, 1.4], [52, -18, 1.4], [-52, -15, 1.4],
  [SKY_ISLAND.x + 2.4, SKY_ISLAND.z - 1.5, SKY_ISLAND.top + 1.4],
];
// Areas (segments with a radius) kept clear of decorative trees.
const NO_TREES = [
  [FALLS.x, FALLS.z, FALLS.x * 1.32, FALLS.z * 1.32, 3.5], // lagoon outflow stream
  [FALLS.x, FALLS.z, FALLS.x, FALLS.z, 11.5], // lagoon + cliff
  [13, 47, 34, 47, 3.5], // stunt ramp run-up
  [5, 28, 5, 28, 2.5], // challenge board
  [17, 32, 17, 32, 7], // Golden Workshop (dog.js)
  [SNOW.x, SNOW.z, SNOW.x, SNOW.z, 13],
  // stations and bridgeheads to the other islands
  ...Object.values(STATIONS).map(([x, z]) => [x, z, x * 1.2, z * 1.2, 5]),
];
const CRATES = [
  ['EC2', 8, 6], ['S3', 9.8, 7.4], ['Lambda', 8.4, 8.9], ['VPC', 7, -10], ['ECS', 8.6, -11.2], ['IAM', -11, -9],
];

// =====================================================================

export function buildWorld(scene, { quality = 'high' } = {}) {
  const rng = mulberry32(20261015);
  const W = {
    colliders: [],
    platforms: [SKY_ISLAND],
    polyPlatforms: [],
    isles: [{ id: 'main', x: 0, z: 0, r: WALK_R }],
    decks: [],
    lakes: [],
    ramps: [],
    ice: [],
    interactables: [],
    orbs: [],
    crates: [],
    updaters: [],
    fruits: [],
    pad: PAD,
    chest: null,
  };

  const rampHeight = (r, x, z) => {
    const rx = x - r.ox, rz = z - r.oz;
    const u = rx * r.dx + rz * r.dz, v = -rx * r.dz + rz * r.dx;
    return u < 0 || u > r.len || Math.abs(v) > r.w / 2 ? null : (r.h * u) / r.len;
  };
  const inCircle = (c, x, z) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r;

  W.groundAt = (x, z, y = 0) => {
    let g = -Infinity;
    for (const s of W.isles) {
      if ((x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r) {
        g = 0;
        for (const l of W.lakes) if (inCircle(l, x, z)) g = l.depth;
        break;
      }
    }
    for (const d of W.decks) {
      if (!d.enabled) continue;
      const rx = x - d.ax, rz = z - d.az;
      const t = (rx * d.dx + rz * d.dz) / d.len;
      if (t < 0 || t > 1 || Math.abs(-rx * d.dz + rz * d.dx) > d.w / 2) continue;
      const h = d.h(t);
      if (y >= h - 0.75) g = Math.max(g, h);
    }
    for (const r of W.ramps) {
      const h = rampHeight(r, x, z);
      if (h !== null && y >= h - 0.75) g = Math.max(g, h);
    }
    for (const p of W.platforms) {
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz < p.r * p.r && y >= p.top - 0.75) g = Math.max(g, p.top);
    }
    for (const p of W.polyPlatforms) {
      if (y >= p.top - 0.75 && x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ && pointInRings(p.rings, x, z)) g = Math.max(g, p.top);
    }
    return g;
  };

  W.rampAt = (x, z) => {
    for (const r of W.ramps) {
      const h = rampHeight(r, x, z);
      if (h !== null) return { h, slope: r.h / r.len, dx: r.dx, dz: r.dz };
    }
    return null;
  };
  // 'water' | 'ice' | null — changes how you move
  W.surfaceAt = (x, z, y) => {
    if (y > 0.3) return null;
    for (const l of W.lakes) if (inCircle(l, x, z)) return 'water';
    for (const i of W.ice) if (inCircle(i, x, z)) return 'ice';
    return null;
  };

  // Push a point out of every static collider (xz plane). Returns true on contact.
  W.resolve = (p, r) => {
    let hit = false;
    for (const c of W.colliders) {
      if (p.y > c.top || p.y + 2 < c.bottom) continue;
      if (c.type === 'circle') {
        const dx = p.x - c.x, dz = p.z - c.z;
        const R = c.r + r;
        const d2 = dx * dx + dz * dz;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1e-4;
          p.x += (dx / d) * (R - d);
          p.z += (dz / d) * (R - d);
          hit = true;
        }
      } else if (c.type === 'seg') {
        // a thin wall along a line (bridge railings, gates)
        if (c.enabled === false) continue;
        const vx = c.bx - c.ax, vz = c.bz - c.az;
        const t = Math.max(0, Math.min(1, ((p.x - c.ax) * vx + (p.z - c.az) * vz) / (vx * vx + vz * vz)));
        const dx = p.x - (c.ax + vx * t), dz = p.z - (c.az + vz * t);
        const R = c.r + r, d2 = dx * dx + dz * dz;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1e-4;
          p.x += (dx / d) * (R - d);
          p.z += (dz / d) * (R - d);
          hit = true;
        }
      } else {
        const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          hit = true;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            p.x += (dx / d) * (r - d);
            p.z += (dz / d) * (r - d);
          } else {
            const pen = [p.x - c.minX + r, c.maxX - p.x + r, p.z - c.minZ + r, c.maxZ - p.z + r];
            const i = pen.indexOf(Math.min(...pen));
            if (i === 0) p.x -= pen[0];
            else if (i === 1) p.x += pen[1];
            else if (i === 2) p.z -= pen[2];
            else p.z += pen[3];
          }
        }
      }
    }
    return hit;
  };

  const circle = (x, z, r, top = 99, bottom = -99) => W.colliders.push({ type: 'circle', x, z, r, top, bottom });
  const box = (minX, maxX, minZ, maxZ, top = 99) => W.colliders.push({ type: 'box', minX, maxX, minZ, maxZ, top, bottom: -99 });
  const interact = (o) => W.interactables.push({ y: 0, r: 3, ...o });
  W.circle = circle;

  // ---------- sky, light, fog ----------
  const sunDir = new THREE.Vector3(0.55, 0.6, 0.35).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color('#2a5bd7') },
        mid: { value: new THREE.Color('#93c5fd') },
        bottom: { value: new THREE.Color('#ffd7c4') },
        sunDir: { value: sunDir },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir;
        varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.65, h)) : mix(mid, bottom, smoothstep(0.0, -0.3, h));
          c = mix(c, bottom, exp(-abs(h) * 9.0) * 0.55);
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          c += vec3(1.0, 0.86, 0.62) * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.22);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  );
  sky.renderOrder = -1;
  scene.add(sky);
  W.sky = sky;
  scene.fog = new THREE.Fog('#c3daf4', 110, 380);

  scene.add(new THREE.HemisphereLight('#cfe6ff', '#56603f', 1.25));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.1);
  sun.position.copy(sunDir).multiplyScalar(90);
  sun.castShadow = true;
  const sm = quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -72, right: 72, top: 72, bottom: -72, near: 10, far: 220 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  W.sun = sun;
  W.sunDir = sunDir;

  // ---------- island ----------
  const grass = mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.4, 0.8, 72), std('#78c27b'), 0, -0.4, 0);
  grass.castShadow = false;
  scene.add(grass);
  const dirt = mesh(jitter(new THREE.CylinderGeometry(ISLAND_R - 0.4, ISLAND_R - 6, 6, 48, 2), 1.4, rng, (x, y) => y > 2.9), std('#9b6b4c'), 0, -3.8, 0);
  scene.add(dirt);
  const coneGeo = new THREE.ConeGeometry(ISLAND_R - 6, 48, 30, 5);
  jitter(coneGeo, 4, rng, (x, y) => y < -23.9);
  coneGeo.rotateX(Math.PI);
  scene.add(mesh(coneGeo, std('#6f6159'), 0, -6.8 - 24, 0));

  // edge rocks
  {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const im = new THREE.InstancedMesh(geo, std('#9aa0a8'), 46);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < im.count; i++) {
      const a = rng() * Math.PI * 2;
      const r = 57 + rng() * 5.5;
      const s = 0.4 + rng() * 1.1;
      m4.compose(
        new THREE.Vector3(Math.sin(a) * r, s * 0.3, Math.cos(a) * r),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3)),
        new THREE.Vector3(s, s * 0.7, s)
      );
      im.setMatrixAt(i, m4);
    }
    im.castShadow = im.receiveShadow = true;
    scene.add(im);
  }

  // ---------- paths & plaza ----------
  const pathMat = new THREE.MeshStandardMaterial({ color: '#ecdcae', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const strip = (x1, z1, x2, z2, w = 3) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = new THREE.PlaneGeometry(w, len);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, pathMat);
    m.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    m.receiveShadow = true;
    scene.add(m);
  };
  strip(0, 40, 0, 9);
  for (const z of ZONES) {
    if (z.id === 'skills' || z.id === 'about') continue;
    if (z.id === 'journey') {
      const L = Math.hypot(z.x, z.z);
      strip(0, 0, z.x - (z.x / L) * z.r, z.z - (z.z / L) * z.r); // stop at the map's edge
    } else strip(0, 0, z.x, z.z);
  }
  scene.add(groundDisc(10, '#ddd3bf', 0.03));
  scene.add(glowRing(10, 0.25, '#4ade80', 1.3));
  // spawn pad
  scene.add(groundDisc(2.6, '#cbd5e1', 0.035).translateX(SPAWN.x).translateZ(SPAWN.z));
  scene.add(glowRing(2.6, 0.18, '#5eead4', 1.5, 0.06).translateX(SPAWN.x).translateZ(SPAWN.z));

  for (const z of ZONES) {
    if (['skills', 'journey', 'lab', 'falls', 'snow', 'arena'].includes(z.id)) continue; // these have their own ground
    const d = groundDisc(Math.min(z.r * 0.7, 8), '#e2dccd', 0.03);
    d.position.x = z.x;
    d.position.z = z.z;
    scene.add(d);
    const ring = glowRing(Math.min(z.r * 0.7, 8), 0.2, z.color, 1.4);
    ring.position.x = z.x;
    ring.position.z = z.z;
    scene.add(ring);
  }

  // ---------- zone builders ----------
  buildAboutTotem(scene, W, circle, box, interact);
  buildSkillTree(scene, W, circle, interact);
  buildTimeline(scene, W, circle, interact, strip);
  buildDataCenter(scene, W, circle, interact);
  buildHall(scene, W, circle, interact);
  buildLibrary(scene, W, circle, interact);
  buildBeacon(scene, W, circle, interact);
  buildSkyIsland(scene, W, circle, interact);
  buildOrbs(scene, W);
  buildCrates(scene, W);
  buildJourneyMap(scene, W, interact, circle, quality);
  W.spots = buildNature(scene, W, circle, quality);
  buildLab(scene, W, circle, interact);
  buildArena(scene, W, circle, interact);
  buildArchipelago(scene, W, circle, interact, quality);
  W.updaters.push((t) => (waterTime.value = t));

  // zone labels
  const labelY = { arena: 9.6, lab: 8.6, park: 7, falls: 12, snow: 15.5, journey: 9.5, about: 7.4, skills: 13.6, experience: 10.5, projects: 7.5, education: 10.8, publications: 8.6, contact: 19 };
  for (const z of ZONES) {
    const l = makeLabel(z.name, { sub: z.sub, accent: z.color, height: 1.25 });
    l.position.set(z.x, labelY[z.id], z.z);
    scene.add(l);
  }

  buildScenery(scene, W, rng, circle, quality);
  return W;
}

// =====================================================================
// Zones
// =====================================================================

function buildAboutTotem(scene, W, circle, box, interact) {
  const g = new THREE.Group();
  g.position.set(0, 0, 18);
  const dark = std('#1e2539', { metalness: 0.3, roughness: 0.5 });
  g.add(mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.35, 8), std('#cbd5e1'), 0, 0.17, 0));
  for (const x of [-2.9, 2.9]) g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 5, 8), dark, x, 2.5, 0));
  g.add(mesh(new THREE.BoxGeometry(6.6, 3.9, 0.3), dark, 0, 3.3, 0));

  const tex = drawCanvas(1024, 576, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#0b1533');
    grd.addColorStop(1, '#1b1244');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(94,234,212,0.09)';
    for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = '#5eead4';
    c.font = `500 30px ${MONO}`;
    c.fillText('> hello world, I am', 64, 104);
    c.fillStyle = '#f8fafc';
    c.font = `700 96px ${FONT}`;
    c.fillText(PROFILE.displayName, 60, 210);
    c.fillStyle = '#c7d2fe';
    c.font = `500 36px ${FONT}`;
    wrapText(c, PROFILE.title, 64, 278, 900, 46);
    let x = 64;
    c.font = `600 28px ${MONO}`;
    for (const f of PROFILE.focus) {
      const tw = c.measureText(f).width + 40;
      c.fillStyle = 'rgba(94,234,212,0.14)';
      c.beginPath();
      c.roundRect(x, 380, tw, 54, 27);
      c.fill();
      c.fillStyle = '#5eead4';
      c.fillText(f, x + 20, 417);
      x += tw + 16;
    }
    c.fillStyle = '#94a3b8';
    c.font = `500 26px ${MONO}`;
    c.fillText('[E] open profile  ·  ' + PROFILE.location, 64, 516);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.5), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 3.3, 0.16);
  g.add(screen);

  const gem = mesh(new THREE.IcosahedronGeometry(0.55, 0), glowMat('#5eead4', 2.6), 0, 6, 0);
  g.add(gem);
  scene.add(g);
  W.updaters.push((t) => {
    gem.rotation.y = t * 0.9;
    gem.rotation.x = t * 0.5;
    gem.position.y = 6 + Math.sin(t * 1.6) * 0.18;
  });

  box(-3.3, 3.3, 17.8, 18.2, 6);
  circle(-2.9, 18, 0.3);
  circle(2.9, 18, 0.3);
  interact({ id: 'about', zone: 'about', label: 'Read profile', x: 0, z: 19.8, r: 3.6, object: g });
}

function buildSkillTree(scene, W, circle, interact) {
  const g = new THREE.Group();
  const rng = mulberry32(7);
  const bark = std('#7b5334');
  g.add(mesh(jitter(new THREE.CylinderGeometry(0.75, 1.5, 6.4, 8, 3), 0.25, rng), bark, 0, 3.2, 0));
  const branches = [
    [new THREE.Vector3(0, 4.6, 0), new THREE.Vector3(2.4, 7, 0.8)],
    [new THREE.Vector3(0, 4.9, 0), new THREE.Vector3(-2.3, 7.2, -0.6)],
    [new THREE.Vector3(0, 5.3, 0), new THREE.Vector3(0.6, 7.4, -2.4)],
    [new THREE.Vector3(0, 5.1, 0), new THREE.Vector3(-0.8, 7, 2.4)],
  ];
  for (const [a, b] of branches) g.add(beam(a, b, 0.32, bark));
  // roots
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    g.add(beam(new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2), 0.28, bark));
  }

  const leaf = std('#3fb87a', { emissive: '#0f5132', emissiveIntensity: 0.35 });
  const blobs = [
    [0, 8.3, 0, 3.6], [2.7, 7.3, 1, 2.4], [-2.6, 7.5, -0.8, 2.5], [0.8, 7.6, -2.7, 2.3],
    [-1, 7.2, 2.6, 2.2], [0.2, 10.4, 0.3, 2.3], [2.2, 9.4, -1.6, 1.8], [-2.2, 9.6, 1.4, 1.8],
  ];
  for (const [x, y, z, r] of blobs) {
    const m = mesh(jitter(new THREE.IcosahedronGeometry(r, 1), r * 0.22, rng), leaf, x, y, z);
    m.rotation.set(rng() * 3, rng() * 3, 0);
    g.add(m);
  }
  // fruits: one per skill category, lit when its orb is collected
  const fruitSpots = [[3.3, 6.8, 2.6], [-3.6, 7.6, 1.6], [2.4, 9.4, -2.9], [-1.9, 10.4, -2.4], [0.4, 12.4, 0.8], [-3.4, 6.4, -2.4], [1.5, 6.4, 3.8]];
  SKILLS.forEach((s, i) => {
    const m = mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: '#475569', emissive: '#000000', roughness: 0.4 }), ...fruitSpots[i]);
    m.userData.color = s.color;
    g.add(m);
    W.fruits.push(m);
  });
  scene.add(g);

  const ring = glowRing(2.9, 0.12, '#4ade80', 2.2, 0.07);
  scene.add(ring);
  W.updaters.push((t) => {
    ring.scale.setScalar(1 + Math.sin(t * 1.4) * 0.06);
    W.fruits.forEach((f, i) => (f.position.y = fruitSpots[i][1] + Math.sin(t * 2 + i) * 0.08));
  });

  circle(0, 0, 1.6, 20);
  interact({ id: 'skills', zone: 'skills', label: 'Inspect the Skill Tree', x: 0, z: 0, r: 4.6, object: g });
}

function buildTimeline(scene, W, circle, interact, strip) {
  const a = new THREE.Vector2(21, -7);
  const b = new THREE.Vector2(42, -27);
  const dir = b.clone().sub(a);
  const perp = new THREE.Vector2(-dir.y, dir.x).normalize();
  const stone = std('#ece6da');
  const base = std('#9ca3af');
  const gold = glowMat('#fbbf24', 2.4);
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fbbf24').multiplyScalar(1.3) });
  const pts = [];

  EXPERIENCE.forEach((e, i) => {
    const t = i / (EXPERIENCE.length - 1);
    const p = a.clone().addScaledVector(dir, t).addScaledVector(perp, Math.sin(t * Math.PI * 1.6) * 3.2);
    pts.push(p);
    const h = 2.2 + i * 0.9;
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.y);
    g.add(mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 6), base, 0, 0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.85, h, 6), stone, 0, 0.4 + h / 2, 0));
    const torus = mesh(new THREE.TorusGeometry(0.95, 0.08, 6, 24), gold, 0, h + 0.45, 0);
    torus.rotation.x = Math.PI / 2;
    g.add(torus);
    const badge = mesh(new THREE.OctahedronGeometry(e.current ? 0.65 : 0.45, 0), e.current ? glowMat('#5eead4', 2.8) : gold, 0, h + 1.4, 0);
    g.add(badge);
    const label = makeLabel(e.short, { sub: e.period, accent: e.current ? '#5eead4' : '#fbbf24', height: 0.62 });
    label.position.set(0, h + 2.9, 0);
    g.add(label);
    scene.add(g);
    W.updaters.push((tt) => {
      badge.rotation.y = tt * 1.2 + i;
      badge.position.y = h + 1.4 + Math.sin(tt * 2 + i) * 0.15;
    });
    circle(p.x, p.y, 1.15, 10);
    interact({ id: `exp:${i}`, zone: 'experience', label: `${e.role} · ${e.short}`, x: p.x, z: p.y, r: 3.3, object: g });
  });
  // glowing timeline line between pillars
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const len = p1.distanceTo(p2);
    const geo = new THREE.PlaneGeometry(0.22, len);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, lineMat);
    m.position.set((p1.x + p2.x) / 2, 0.06, (p1.y + p2.y) / 2);
    m.rotation.y = Math.atan2(p2.x - p1.x, p2.y - p1.y);
    scene.add(m);
  }
}

function buildDataCenter(scene, W, circle, interact) {
  const zone = ZONES.find((z) => z.id === 'projects');
  const cx = zone.x, cz = zone.z;
  const toCenter = Math.atan2(-cx, -cz);
  const rackMat = std('#1e293b', { metalness: 0.45, roughness: 0.45 });
  const trim = std('#475569', { metalness: 0.5, roughness: 0.4 });

  PROJECTS.forEach((p, i) => {
    const a = toCenter + Math.PI + (i - (PROJECTS.length - 1) / 2) * 0.43;
    const R = 7.4;
    const g = new THREE.Group();
    g.position.set(cx + Math.sin(a) * R, 0, cz + Math.cos(a) * R);
    g.rotation.y = a + Math.PI;
    g.add(mesh(new THREE.BoxGeometry(1.7, 3.3, 1.2), rackMat, 0, 1.65, 0));
    g.add(mesh(new THREE.BoxGeometry(1.8, 0.12, 1.3), trim, 0, 3.36, 0));

    const tex = drawCanvas(512, 384, (c, w, h) => {
      c.fillStyle = '#0a1022';
      c.fillRect(0, 0, w, h);
      c.fillStyle = p.color;
      c.fillRect(0, 0, w, 14);
      c.font = `600 26px ${MONO}`;
      c.fillStyle = p.color;
      c.fillText(`PROJECT_0${i + 1}`, 30, 64);
      c.fillStyle = '#f1f5f9';
      c.font = `700 50px ${FONT}`;
      const yEnd = wrapText(c, p.short, 30, 140, 452, 58, 2);
      c.fillStyle = '#94a3b8';
      c.font = `500 24px ${MONO}`;
      wrapText(c, p.tech.slice(0, 3).join(' · '), 30, Math.max(yEnd + 14, 250), 452, 32, 2);
      c.fillStyle = '#22c55e';
      c.beginPath();
      c.arc(w - 40, 56, 9, 0, Math.PI * 2);
      c.fill();
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.125), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(0, 2.45, 0.61);
    g.add(screen);

    // blinking LEDs
    const led = glowMat(p.color, 2);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        const l = mesh(new THREE.BoxGeometry(0.16, 0.06, 0.03), led, -0.5 + c * 0.25, 0.45 + r * 0.32, 0.61, false);
        g.add(l);
      }
    }
    scene.add(g);
    W.updaters.push((t) => {
      led.emissiveIntensity = 1.2 + Math.max(0, Math.sin(t * (3 + i) + i * 1.7)) * 2.2;
    });

    circle(g.position.x, g.position.z, 1.05, 3.5);
    interact({
      id: `proj:${i}`, zone: 'projects', label: p.name,
      x: g.position.x - Math.sin(a) * 1.4, z: g.position.z - Math.cos(a) * 1.4, r: 2.4, object: g,
    });
  });

  // Archive kiosk in the middle
  const k = new THREE.Group();
  k.position.set(cx + Math.sin(toCenter) * 1.5, 0, cz + Math.cos(toCenter) * 1.5);
  k.rotation.y = toCenter;
  k.add(mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.1, 8), trim, 0, 0.55, 0));
  const tex = drawCanvas(512, 320, (c, w, h) => {
    c.fillStyle = '#071226';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#60a5fa';
    c.font = `700 44px ${MONO}`;
    c.fillText('$ ls ./archive', 30, 80);
    c.font = `500 26px ${MONO}`;
    c.fillStyle = '#93c5fd';
    ['fraud-detection/', 'video-summary/', 'text-to-image/', 'face-attendance/', '...'].forEach((s, i) => c.fillText(s, 30, 140 + i * 36));
  });
  const scr = mesh(new THREE.BoxGeometry(1.3, 0.85, 0.08), std('#0f172a'), 0, 1.35, 0);
  scr.rotation.x = -0.5;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = 0.045;
  scr.add(face);
  k.add(scr);
  scene.add(k);
  circle(k.position.x, k.position.z, 0.5, 2);
  interact({ id: 'proj:archive', zone: 'projects', label: 'Browse the project archive', x: k.position.x, z: k.position.z, r: 2.2, object: k });
}

function buildHall(scene, W, circle, interact) {
  const { x, z } = ZONES.find((zz) => zz.id === 'education');
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const marble = std('#f1ede6');
  const pink = glowMat('#f472b6', 1.8);
  g.add(mesh(new THREE.CylinderGeometry(6, 6.4, 0.5, 8), std('#d6d0c4'), 0, 0.25, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const px = Math.sin(a) * 5, pz = Math.cos(a) * 5;
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.42, 5, 8), marble, px, 3, pz));
    circle(x + px, z + pz, 0.45, 6);
  }
  g.add(mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.45, 8), marble, 0, 5.7, 0));
  const ring = mesh(new THREE.TorusGeometry(6.6, 0.07, 6, 48), pink, 0, 5.95, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.add(mesh(new THREE.ConeGeometry(7, 2.6, 8), std('#e9a8c7'), 0, 7.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 1.1, 1.6), marble, 0, 1.05, 0));

  // the badge
  const badgeTex = drawCanvas(512, 512, (c, w, h) => {
    c.fillStyle = '#1b1530';
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.fillStyle = '#fbbf24';
    c.font = `700 92px ${FONT}`;
    c.fillText('AWS', w / 2, 220);
    c.fillStyle = '#f8fafc';
    c.font = `600 44px ${FONT}`;
    c.fillText('Certified', w / 2, 290);
    c.fillText('Educator', w / 2, 345);
  });
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.16, 6),
    [new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#a16207', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }),
     new THREE.MeshBasicMaterial({ map: badgeTex, toneMapped: false }),
     new THREE.MeshBasicMaterial({ map: badgeTex, toneMapped: false })]
  );
  badge.rotation.x = Math.PI / 2;
  const holder = new THREE.Group();
  holder.position.y = 2.75;
  holder.add(badge);
  g.add(holder);

  // orbiting graduation caps
  const caps = new THREE.Group();
  caps.position.y = 2.7;
  for (let i = 0; i < 2; i++) {
    const cap = new THREE.Group();
    const a = i * Math.PI;
    cap.position.set(Math.sin(a) * 2.1, 0.3 * i, Math.cos(a) * 2.1);
    cap.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.95), std('#1f2937'), 0, 0.22, 0));
    cap.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.26, 10), std('#1f2937'), 0, 0.06, 0));
    cap.add(mesh(new THREE.SphereGeometry(0.06, 6, 6), glowMat('#fbbf24', 2), 0.42, 0.18, 0.42));
    cap.rotation.y = 0.6;
    caps.add(cap);
  }
  g.add(caps);
  scene.add(g);

  W.updaters.push((t) => {
    holder.rotation.y = t * 0.8;
    holder.position.y = 2.75 + Math.sin(t * 1.5) * 0.15;
    caps.rotation.y = -t * 0.6;
  });
  W.platforms.push({ x, z, r: 6.1, top: 0.5 });
  circle(x, z, 1.15, 3);
  interact({ id: 'education', zone: 'education', label: 'View degrees & certifications', x, z, y: 0.5, r: 3.4, object: g });
}

function buildLibrary(scene, W, circle, interact) {
  const { x, z } = ZONES.find((zz) => zz.id === 'publications');
  const toCenter = Math.atan2(-x, -z);
  const books = [...PUBLICATIONS.map((p) => p.spine), ...THESES.map((t) => t.spine)];
  const colors = ['#7c3aed', '#2563eb', '#db2777', '#0d9488', '#ea580c', '#4f46e5', '#be123c'];
  books.forEach((title, i) => {
    const a = toCenter + Math.PI + (i - (books.length - 1) / 2) * 0.42;
    const R = 5.2;
    const h = 4 + ((i * 7) % 3) * 0.5;
    const tex = drawCanvas(128, 512, (c, w, hh) => {
      c.fillStyle = colors[i];
      c.fillRect(0, 0, w, hh);
      c.fillStyle = '#fbbf24';
      c.fillRect(0, 30, w, 8);
      c.fillRect(0, hh - 38, w, 8);
      c.save();
      c.translate(w / 2 + 12, hh / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.fillStyle = '#fff7ed';
      c.font = `700 34px ${FONT}`;
      c.fillText(title, 0, 0);
      c.restore();
    });
    const side = std(colors[i]);
    const spine = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const pages = std('#fef3c7');
    // faces: +x, -x, +y, -y, +z (spine, turned toward the lectern), -z
    const b = mesh(new THREE.BoxGeometry(0.9, h, 3), [side, side, pages, pages, spine, pages]);
    const bx = x + Math.sin(a) * R, bz = z + Math.cos(a) * R;
    b.position.set(bx, h / 2, bz);
    b.rotation.y = a + Math.PI;
    scene.add(b);
    circle(bx, bz, 1.25, h);
  });

  // lectern with an open book
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = toCenter;
  const wood = std('#8b5a3c');
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.2, 6), wood, 0, 0.6, 0));
  const top = mesh(new THREE.BoxGeometry(1.5, 0.12, 1.1), wood, 0, 1.25, 0);
  top.rotation.x = 0.35;
  g.add(top);
  const pageMat = std('#fffbeb');
  for (const s of [-1, 1]) {
    const p = mesh(new THREE.BoxGeometry(0.62, 0.04, 0.85), pageMat, s * 0.33, 1.36, 0.02);
    p.rotation.set(0.35, 0, s * -0.12);
    g.add(p);
  }
  scene.add(g);

  // floating pages
  const pg = new THREE.Group();
  pg.position.set(x, 0, z);
  const fp = new THREE.MeshStandardMaterial({ color: '#fefce8', side: THREE.DoubleSide, emissive: '#c084fc', emissiveIntensity: 0.25 });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), fp);
    m.userData = { a: (i / 7) * Math.PI * 2, r: 2.3 + (i % 3) * 0.5, y: 2.4 + (i % 4) * 0.7 };
    pg.add(m);
  }
  scene.add(pg);
  W.updaters.push((t) => {
    pg.children.forEach((m, i) => {
      const u = m.userData;
      const a = u.a + t * 0.35;
      m.position.set(Math.sin(a) * u.r, u.y + Math.sin(t * 1.3 + i) * 0.3, Math.cos(a) * u.r);
      m.rotation.set(Math.sin(t + i) * 0.6, a, Math.cos(t * 0.8 + i) * 0.4);
    });
  });

  circle(x, z, 0.6, 2);
  interact({ id: 'publications', zone: 'publications', label: 'Read publications', x, z, r: 3.2, object: g });
}

function buildBeacon(scene, W, circle, interact) {
  const { x, z } = ZONES.find((zz) => zz.id === 'contact');
  const H = 15;
  const white = std('#e5e7eb', { metalness: 0.3, roughness: 0.5 });
  const red = std('#ef4444', { metalness: 0.3, roughness: 0.5 });
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const corners = [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]];
  const at = (cx, cz, y) => {
    const k = 1 - (y / H) * 0.8;
    return new THREE.Vector3(cx * k, y, cz * k);
  };
  corners.forEach(([cx, cz], i) => {
    g.add(beam(at(cx, cz, 0), at(cx, cz, H), 0.16, i % 2 ? white : red));
    circle(x + cx, z + cz, 0.35, H);
  });
  for (let l = 1; l < 5; l++) {
    const y0 = (l - 1) * (H / 4), y1 = l * (H / 4);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 4];
      g.add(beam(at(ax, az, y0), at(bx, bz, y1), 0.06, white));
      g.add(beam(at(ax, az, y1), at(bx, bz, y1), 0.08, l % 2 ? red : white));
    }
  }
  const lampMat = glowMat('#f87171', 3);
  const lamp = mesh(new THREE.SphereGeometry(0.75, 16, 12), lampMat, 0, H + 0.8, 0);
  g.add(lamp);
  const halo = new THREE.Group();
  halo.position.y = H + 0.8;
  for (let i = 0; i < 2; i++) {
    const r = mesh(new THREE.TorusGeometry(1.4 + i * 0.5, 0.05, 6, 40), glowMat('#fda4af', 2), 0, 0, 0, false);
    r.rotation.x = Math.PI / 2 + i * 0.6;
    halo.add(r);
  }
  g.add(halo);

  // expanding signal waves
  const waves = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.04, 6, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#fca5a5').multiplyScalar(1.6), transparent: true, depthWrite: false })
    );
    m.rotation.x = Math.PI / 2;
    m.position.y = H + 0.8;
    g.add(m);
    waves.push(m);
  }

  // mailbox
  const mb = new THREE.Group();
  mb.position.set(0, 0, 4.6);
  mb.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), std('#57534e'), 0, 0.55, 0));
  mb.add(mesh(new THREE.BoxGeometry(0.75, 0.55, 1), std('#2563eb'), 0, 1.35, 0));
  const domeGeo = new THREE.CylinderGeometry(0.375, 0.375, 1, 12, 1, false, Math.PI / 2, Math.PI);
  domeGeo.rotateX(Math.PI / 2);
  mb.add(mesh(domeGeo, std('#2563eb'), 0, 1.62, 0));
  const flag = mesh(new THREE.BoxGeometry(0.05, 0.4, 0.2), red, 0.42, 1.65, -0.2);
  mb.add(flag);
  g.add(mb);
  scene.add(g);

  W.updaters.push((t) => {
    lampMat.emissiveIntensity = 1.5 + (Math.sin(t * 3) > 0.2 ? 2.5 : 0);
    halo.rotation.y = t * 0.9;
    halo.rotation.z = Math.sin(t * 0.5) * 0.2;
    waves.forEach((w, i) => {
      const p = (t * 0.35 + i / 3) % 1;
      w.scale.setScalar(1 + p * 14);
      w.material.opacity = (1 - p) * 0.8;
    });
    flag.rotation.z = Math.sin(t * 2) * 0.3;
  });
  circle(x, z + 4.6, 0.5, 2);
  interact({ id: 'contact', zone: 'contact', label: 'Send a signal (contact)', x, z: z + 5.6, r: 3.6, object: g });
}

function buildSkyIsland(scene, W, circle, interact) {
  const S = SKY_ISLAND;
  const rng = mulberry32(99);
  const g = new THREE.Group();
  g.position.set(S.x, S.top, S.z);
  g.add(mesh(new THREE.CylinderGeometry(S.r + 0.2, S.r - 0.3, 0.8, 24), std('#7dd3a0'), 0, -0.4, 0));
  const under = jitter(new THREE.ConeGeometry(S.r - 0.3, 6, 12, 2), 0.7, rng, (x, y) => y < -2.9);
  under.rotateX(Math.PI);
  g.add(mesh(under, std('#7c6a5d'), 0, -3.8, 0));

  // treasure chest
  const chest = new THREE.Group();
  chest.position.set(-1, 0, 1);
  chest.rotation.y = 0.5;
  const wood = std('#92400e');
  const goldM = std('#fbbf24', { metalness: 0.7, roughness: 0.3, emissive: '#78350f', emissiveIntensity: 0.4 });
  chest.add(mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), wood, 0, 0.4, 0));
  chest.add(mesh(new THREE.BoxGeometry(1.45, 0.12, 0.95), goldM, 0, 0.78, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.8, -0.45);
  const lidMesh = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 10, 1, false, 0, Math.PI), wood, 0, 0, 0.45);
  lidMesh.rotation.z = Math.PI / 2;
  lid.add(lidMesh);
  chest.add(lid);
  const sparkle = mesh(new THREE.OctahedronGeometry(0.25), glowMat('#fde68a', 3), 0, 1.9, 0, false);
  chest.add(sparkle);
  g.add(chest);

  // a little tree
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.2, 6), std('#7b5334'), 2, 0.6, 1.4));
  g.add(mesh(new THREE.ConeGeometry(1, 2, 7), std('#2f9e6a'), 2, 1.9, 1.4));
  scene.add(g);

  W.chest = { lid, open: false, sparkle };
  W.updaters.push((t, dt) => {
    lid.rotation.x = THREE.MathUtils.damp(lid.rotation.x, W.chest.open ? -1.9 : 0, 6, dt);
    sparkle.visible = !W.chest.open;
    sparkle.rotation.y = t * 2;
    sparkle.position.y = 1.9 + Math.sin(t * 3) * 0.15;
  });
  const cx = S.x + chest.position.x, cz = S.z + chest.position.z;
  circle(cx, cz, 0.8, S.top + 1, S.top);
  interact({ id: 'secret', zone: null, label: 'Open the treasure chest', x: cx, z: cz, y: S.top, r: 2.6, object: chest });

  // bounce pad
  const pad = new THREE.Group();
  pad.position.set(PAD.x, 0, PAD.z);
  pad.add(mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 20), std('#334155', { metalness: 0.4 }), 0, 0.15, 0));
  const top = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.06, 20), glowMat('#5eead4', 1.6), 0, 0.32, 0, false);
  pad.add(top);
  const arrow = mesh(new THREE.ConeGeometry(0.45, 0.8, 4), glowMat('#5eead4', 2.4), 0, 1.6, 0, false);
  pad.add(arrow);
  const lbl = makeLabel('Bounce Pad', { sub: 'step on it ↑', accent: '#5eead4', height: 0.55 });
  lbl.position.y = 3.2;
  pad.add(lbl);
  scene.add(pad);
  W.updaters.push((t) => {
    top.material.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.6;
    arrow.position.y = 1.5 + ((t * 1.2) % 1) * 0.9;
    arrow.rotation.y = t * 2;
  });
}

function buildOrbs(scene, W) {
  const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 30, 12, 1, true);
  SKILLS.forEach((s, i) => {
    const [x, z, y] = ORB_SPOTS[i];
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const core = mesh(new THREE.OctahedronGeometry(0.45, 0), glowMat(s.color, 3), 0, 0, 0, false);
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.8, 0),
      new THREE.MeshBasicMaterial({ color: s.color, wireframe: true, transparent: true, opacity: 0.6 })
    );
    const pillar = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    pillar.position.y = 15 - 1.4;
    g.add(core, shell, pillar);
    scene.add(g);
    W.orbs.push({ index: i, group: g, core, shell, baseY: y, collected: false, skill: s });
  });
  W.updaters.push((t) => {
    for (const o of W.orbs) {
      if (o.collected) continue;
      o.group.position.y = o.baseY + Math.sin(t * 2 + o.index) * 0.25;
      o.core.rotation.y = t * 2;
      o.shell.rotation.x = t * 0.7;
      o.shell.rotation.y = -t * 0.9;
    }
  });
}

function buildCrates(scene, W) {
  const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  for (const [name, x, z] of CRATES) {
    const tex = drawCanvas(256, 256, (c, w, h) => {
      c.fillStyle = '#f59e0b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1f2937';
      c.fillRect(14, 14, w - 28, h - 28);
      c.strokeStyle = '#f59e0b';
      c.lineWidth = 6;
      c.strokeRect(30, 30, w - 60, h - 60);
      c.fillStyle = '#fde68a';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 ${name.length > 4 ? 56 : 72}px ${FONT}`;
      c.fillText(name, w / 2, h / 2 - 8);
      c.font = `500 22px ${MONO}`;
      c.fillStyle = '#fbbf24';
      c.fillText('cloud service', w / 2, h / 2 + 50);
    });
    const m = mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), x, 0.6, z);
    scene.add(m);
    W.crates.push({
      name, mesh: m, r: 0.72, half: 0.6,
      pos: new THREE.Vector3(x, 0.6, z), vel: new THREE.Vector3(), home: new THREE.Vector3(x, 0.6, z),
      spin: 0, fallen: false,
    });
  }
}

// =====================================================================
// Decoration
// =====================================================================

function buildScenery(scene, W, rng, circle, quality) {
  // where decorations should NOT go
  const blocked = (x, z, pad) => {
    if (Math.hypot(x, z) < 13 + pad) return true;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6 + pad) return true;
    if (Math.abs(x) < 2.8 + pad && z > 0 && z < 42) return true;
    if (Math.hypot(x - PAD.x, z - PAD.z) < 3 + pad) return true;
    for (const zz of ZONES) {
      if (Math.hypot(x - zz.x, z - zz.z) < zz.r + 1.5 + pad) return true;
      // distance to path segment center → zone
      const L = Math.hypot(zz.x, zz.z);
      const t = Math.max(0, Math.min(1, (x * zz.x + z * zz.z) / (L * L)));
      if (Math.hypot(x - zz.x * t, z - zz.z * t) < 2.6 + pad) return true;
    }
    for (const [ax, az, bx, bz, r] of NO_TREES) {
      const vx = bx - ax, vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
      if (Math.hypot(x - ax - vx * t, z - az - vz * t) < r + pad) return true;
    }
    for (const [, cx, cz] of CRATES) if (Math.hypot(x - cx, z - cz) < 2.5) return true;
    for (const [ox, oz] of ORB_SPOTS) if (Math.hypot(x - ox, z - oz) < 2.5) return true;
    return false;
  };

  // pine trees (instanced)
  const N = 52;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.26, 1.3, 5), std('#7b5334'), N);
  const tierGeo = [new THREE.ConeGeometry(1.25, 1.9, 7), new THREE.ConeGeometry(0.95, 1.6, 7), new THREE.ConeGeometry(0.62, 1.3, 7)];
  const tiers = tierGeo.map((gg) => new THREE.InstancedMesh(gg, std('#ffffff'), N));
  const greens = ['#2f9e6a', '#38a873', '#278a5b', '#4caf7d', '#2b8f74'];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < 900 && n < N; tries++) {
    const a = rng() * Math.PI * 2;
    const r = 12 + Math.sqrt(rng()) * 47;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (blocked(x, z, 0.5)) continue;
    const s = 0.85 + rng() * 0.8;
    q.setFromEuler(new THREE.Euler(0, rng() * 6, 0));
    m4.compose(new THREE.Vector3(x, 0.65 * s, z), q, new THREE.Vector3(s, s, s));
    trunk.setMatrixAt(n, m4);
    col.set(greens[Math.floor(rng() * greens.length)]);
    [1.9, 3.0, 3.95].forEach((y, k) => {
      m4.compose(new THREE.Vector3(x, y * s, z), q, new THREE.Vector3(s, s, s));
      tiers[k].setMatrixAt(n, m4);
      tiers[k].setColorAt(n, col);
    });
    circle(x, z, 0.45 * s, 6 * s);
    n++;
  }
  for (const im of [trunk, ...tiers]) {
    im.count = n;
    im.castShadow = im.receiveShadow = true;
    scene.add(im);
  }

  // grass tufts + flowers
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 0.5, 3), std('#5fae5f'), quality === 'high' ? 700 : 350);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), std('#ffffff', { emissive: '#222', emissiveIntensity: 0.2 }), 160);
  const flowerCols = ['#fde047', '#f9a8d4', '#ffffff', '#c4b5fd', '#fca5a5'];
  const place = (im, y, scaleFn, colorFn) => {
    let k = 0;
    for (let tries = 0; tries < im.count * 6 && k < im.count; tries++) {
      const a = rng() * Math.PI * 2;
      const r = 3 + Math.sqrt(rng()) * 58;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (blocked(x, z, -0.8)) continue;
      const s = scaleFn();
      m4.compose(new THREE.Vector3(x, y * s, z), q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.4, rng() * 6, (rng() - 0.5) * 0.4)), new THREE.Vector3(s, s, s));
      im.setMatrixAt(k, m4);
      if (colorFn) im.setColorAt(k, col.set(colorFn()));
      k++;
    }
    im.count = k;
    im.receiveShadow = true;
    scene.add(im);
  };
  place(tufts, 0.22, () => 0.7 + rng() * 0.8);
  place(flowers, 0.25, () => 0.8 + rng() * 0.6, () => flowerCols[Math.floor(rng() * flowerCols.length)]);

  // cloud sea + high clouds
  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, emissive: '#dbe7f7', emissiveIntensity: 0.25 });
  const puffs = [];
  for (let c = 0; c < 70; c++) {
    const low = c < 52;
    const a = rng() * Math.PI * 2;
    const r = low ? 60 + rng() * 230 : 90 + rng() * 170;
    const cy = low ? -16 - rng() * 16 : 30 + rng() * 30;
    const cx = Math.sin(a) * r, cz = Math.cos(a) * r;
    const count = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
      const s = (low ? 5 : 3) + rng() * (low ? 7 : 4);
      puffs.push([cx + (i - count / 2) * s * 0.9, cy + rng() * s * 0.4, cz + (rng() - 0.5) * s, s]);
    }
  }
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, puffs.length);
  puffs.forEach(([x, y, z, s], i) => {
    m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(new THREE.Euler(rng(), rng(), 0)), new THREE.Vector3(s, s * 0.62, s));
    clouds.setMatrixAt(i, m4);
  });
  const cloudGroup = new THREE.Group();
  cloudGroup.add(clouds);
  scene.add(cloudGroup);
  W.updaters.push((t) => (cloudGroup.rotation.y = t * 0.004));

  // distant floating islets
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.5;
    const r = 280 + rng() * 80; // far beyond the archipelago
    const s = 3 + rng() * 5;
    const g = new THREE.Group();
    g.position.set(Math.sin(a) * r, -6 + rng() * 22, Math.cos(a) * r);
    g.add(mesh(new THREE.CylinderGeometry(s, s * 0.92, s * 0.25, 10), std('#7cc08a'), 0, 0, 0, false));
    const cg = jitter(new THREE.ConeGeometry(s * 0.92, s * 1.6, 9, 2), s * 0.15, rng, (x, y) => y < -s * 0.79);
    cg.rotateX(Math.PI);
    g.add(mesh(cg, std('#7a6a5f'), 0, -s * 0.92, 0, false));
    g.add(mesh(new THREE.ConeGeometry(s * 0.25, s * 0.6, 6), std('#2f9e6a'), s * 0.3, s * 0.4, 0, false));
    scene.add(g);
    const by = g.position.y, ph = rng() * 6;
    W.updaters.push((t) => (g.position.y = by + Math.sin(t * 0.4 + ph) * 1.2));
  }

  // drifting sparkles
  const SP = quality === 'high' ? 220 : 110;
  const spGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(SP * 3);
  const seeds = [];
  for (let i = 0; i < SP; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 60;
    seeds.push([Math.sin(a) * r, 0.6 + rng() * 9, Math.cos(a) * r, rng() * 6]);
  }
  spGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparkles = new THREE.Points(
    spGeo,
    new THREE.PointsMaterial({ color: new THREE.Color('#fff4c2').multiplyScalar(2), size: 0.16, transparent: true, opacity: 0.85, depthWrite: false })
  );
  sparkles.frustumCulled = false;
  scene.add(sparkles);
  W.updaters.push((t) => {
    for (let i = 0; i < SP; i++) {
      const s = seeds[i];
      pos[i * 3] = s[0] + Math.sin(t * 0.3 + s[3]) * 1.5;
      pos[i * 3 + 1] = s[1] + Math.sin(t * 0.7 + s[3] * 2) * 0.6;
      pos[i * 3 + 2] = s[2] + Math.cos(t * 0.25 + s[3]) * 1.5;
    }
    spGeo.attributes.position.needsUpdate = true;
  });
}

// =====================================================================
// India Journey Map — a walkable, extruded map of India
// =====================================================================

export const MAP = { cx: 44, cz: 1, r: 14, s: 0.75, lon0: 82.5, lat0: 22.5, k: Math.cos((22.5 * Math.PI) / 180), top: 0.3, maniTop: 0.5 };
export const project = (lon, lat) => [MAP.cx + (lon - MAP.lon0) * MAP.s * MAP.k, MAP.cz - (lat - MAP.lat0) * MAP.s];

export function pointInRings(rings, x, z) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, zi] = r[i], [xj, zj] = r[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
  }
  return inside;
}

function polyPlatform(rings, top) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const r of rings) for (const [x, z] of r) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return { rings, top, minX, maxX, minZ, maxZ };
}

// Rough courses of major rivers (lon, lat) — drawn on the map texture, clipped to India.
const RIVERS = [
  [[78.16, 29.95], [79.4, 28.6], [80.33, 26.45], [81.85, 25.43], [82.97, 25.32], [85.14, 25.6], [87.0, 25.25], [87.92, 24.8], [88.25, 23.4], [88.36, 22.57], [88.1, 21.6]],
  [[77.6, 30.5], [77.23, 28.6], [78.0, 27.18], [79.5, 26.4], [81.85, 25.43]],
  [[95.4, 28.2], [94.9, 27.48], [94.2, 26.75], [92.8, 26.62], [91.74, 26.18], [89.97, 26.02], [89.8, 25.3]],
  [[81.6, 22.7], [79.95, 23.17], [77.7, 22.6], [75.5, 22.1], [72.97, 21.7]],
  [[73.8, 19.95], [75.9, 19.4], [78.6, 18.9], [80.9, 17.67], [81.78, 17.0], [82.3, 16.6]],
  [[73.65, 17.92], [75.5, 16.5], [78.2, 16.2], [80.62, 16.5], [81.1, 15.8]],
  [[75.7, 12.4], [76.8, 12.3], [78.7, 10.85], [79.8, 11.1]],
  [[81.9, 21.2], [83.9, 21.5], [85.9, 20.46], [86.6, 20.3]],
];

// Himalayan peaks on the map (lon, lat, height).
const HIMALAYA = [
  [74.8, 34.6, 0.8], [75.9, 34.0, 1.0], [77.2, 34.9, 1.25], [78.3, 34.2, 1.0], [76.8, 33.3, 0.9], [78.8, 32.8, 0.8],
  [77.3, 32.3, 0.8], [79.3, 31.0, 0.95], [80.2, 30.4, 0.8], [88.3, 27.75, 0.9], [92.2, 27.9, 0.7], [93.5, 28.2, 0.85],
  [94.8, 28.6, 0.9], [96.0, 28.4, 0.7],
];

// Soft colour regions that give the map a realistic terrain feel (lon, lat, radius lon, radius lat, colour, alpha).
const REGIONS = [
  [80, 26.5, 9, 3.2, '#a7c957', 0.8],
  [81, 22, 4, 3, '#4f9d3a', 0.55],
  [77.5, 17.5, 5, 4.5, '#b9a86c', 0.7],
  [71.5, 27, 4.6, 3.6, '#e9c46a', 0.95],
  [69.8, 23.6, 1.6, 0.9, '#d9c08c', 0.9],
  [74.6, 13, 1.3, 6.2, '#2f7a3f', 0.85],
  [93.5, 25.6, 3.8, 2.6, '#2d6a4f', 0.85],
  [83.5, 18.5, 2.2, 3, '#6a994e', 0.6],
  [88.9, 21.9, 0.9, 0.5, '#24573f', 0.8],
  [77.5, 33.3, 6.5, 3.6, '#9c8b74', 0.9],
  [77, 34.6, 4, 2.6, '#f1f5f9', 0.9],
  [78.6, 31.3, 2.2, 1, '#eef2f7', 0.75],
  [88.5, 27.9, 0.45, 0.45, '#f1f5f9', 0.85],
  [94, 28.4, 3.6, 0.7, '#eef2f7', 0.7],
];

function buildJourneyMap(scene, W, interact, circle, quality) {
  const { cx, cz, r } = MAP;
  const rings = INDIA.map((ring) => ring.map(([lo, la]) => project(lo, la)));
  const mani = MANIPUR.map(([lo, la]) => project(lo, la));
  W.indiaRings = rings;

  // --- holographic base with a lat/long graticule
  const gratTex = drawCanvas(1024, 1024, (c, w, h) => {
    const toPx = (x, z) => [(((x - cx) / r + 1) / 2) * w, (((z - cz) / r + 1) / 2) * h];
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(94,234,212,0.22)';
    c.fillStyle = 'rgba(148,197,255,0.6)';
    c.font = `500 20px ${MONO}`;
    for (let lon = 60; lon <= 105; lon += 5) {
      const [x1, y1] = toPx(...project(lon, 45)), [x2, y2] = toPx(...project(lon, 0));
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      if (lon % 10 === 0) c.fillText(`${lon}°E`, x1 + 6, toPx(...project(lon, 4))[1]);
    }
    for (let lat = 0; lat <= 45; lat += 5) {
      const [x1, y1] = toPx(...project(55, lat)), [x2, y2] = toPx(...project(110, lat));
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      if (lat % 10 === 0 && lat > 0) c.fillText(`${lat}°N`, toPx(...project(65.2, lat))[0], y1 - 6);
    }
    c.setLineDash([14, 10]);
    c.strokeStyle = 'rgba(251,191,36,0.55)';
    const [tx1, ty] = toPx(...project(55, 23.44)), [tx2] = toPx(...project(110, 23.44));
    c.beginPath(); c.moveTo(tx1, ty); c.lineTo(tx2, ty); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(251,191,36,0.75)';
    c.fillText('Tropic of Cancer', toPx(...project(64.5, 23.44))[0], ty - 8);
    c.fillStyle = 'rgba(148,197,255,0.55)';
    c.font = `600 26px ${FONT}`;
    c.fillText('Arabian Sea', ...toPx(...project(64.6, 15)));
    c.fillText('Bay of Bengal', ...toPx(...project(85.6, 15.2)));
    c.fillText('Indian Ocean', ...toPx(...project(74, 5.6)));
  });
  const baseGeo = new THREE.CircleGeometry(r, 72);
  baseGeo.rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(baseGeo, oceanMaterial(gratTex));
  base.position.set(cx, 0.03, cz);
  base.receiveShadow = true;
  scene.add(base);
  const rim = glowRing(r, 0.24, '#fb923c', 1.5, 0.06);
  rim.position.set(cx, 0.06, cz);
  scene.add(rim);
  const north = makeLabel('N', { accent: '#fb923c', height: 0.7 });
  north.position.set(cx, 0.9, cz - r + 0.9);
  scene.add(north);

  // --- terrain-coloured land texture
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const ring of rings) for (const [x, z] of ring) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  const WW = x1 - x0, HH = z1 - z0;
  const TW = quality === 'high' ? 2048 : 1024;
  const landTex = drawCanvas(TW, Math.round((TW * HH) / WW), (c, w, h) => {
    const P = (lon, lat) => {
      const [x, z] = project(lon, lat);
      return [((x - x0) / WW) * w, ((z - z0) / HH) * h];
    };
    const outline = () => {
      c.beginPath();
      for (const ring of INDIA) {
        ring.forEach(([lo, la], i) => (i ? c.lineTo(...P(lo, la)) : c.moveTo(...P(lo, la))));
        c.closePath();
      }
    };
    c.fillStyle = '#86b86a';
    outline();
    c.fill();
    c.save();
    outline();
    c.clip();
    for (const [lon, lat, rx, ry, col, a] of REGIONS) {
      const [px, py] = P(lon, lat);
      const rxp = ((rx * MAP.s * MAP.k) / WW) * w, ryp = ((ry * MAP.s) / HH) * h;
      c.save();
      c.translate(px, py);
      c.scale(1, ryp / rxp);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, rxp);
      const rgb = new THREE.Color(col);
      const rgba = (al) => `rgba(${(rgb.r * 255) | 0},${(rgb.g * 255) | 0},${(rgb.b * 255) | 0},${al})`;
      g.addColorStop(0, rgba(a));
      g.addColorStop(0.6, rgba(a * 0.6));
      g.addColorStop(1, rgba(0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, rxp, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.strokeStyle = 'rgba(56,140,220,0.85)';
    c.lineCap = c.lineJoin = 'round';
    c.lineWidth = w / 420;
    for (const river of RIVERS) {
      c.beginPath();
      river.forEach(([lo, la], i) => (i ? c.lineTo(...P(lo, la)) : c.moveTo(...P(lo, la))));
      c.stroke();
    }
    c.restore();
    c.strokeStyle = '#f5ead0';
    c.lineWidth = w / 340;
    outline();
    c.stroke();
  });
  landTex.repeat.set(1 / WW, 1 / HH);
  landTex.offset.set(-(x0 - cx) / WW, (z1 - cz) / HH);

  const extrude = (rs, depth) => {
    const shapes = rs.map((ring) => new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x - cx, -(z - cz)))));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  };
  const land = mesh(extrude(rings, MAP.top + 0.15), [new THREE.MeshStandardMaterial({ map: landTex, roughness: 0.9 }), std('#b9976a')], cx, -0.15, cz);
  scene.add(land);
  const maniMat = new THREE.MeshStandardMaterial({ color: '#fb923c', emissive: '#c2410c', emissiveIntensity: 0.55, roughness: 0.6 });
  const maniMesh = mesh(extrude([mani], MAP.maniTop + 0.15), [maniMat, std('#c2410c')], cx, -0.15, cz);
  scene.add(maniMesh);

  // glowing coastline & Manipur border
  const loop = (ring, y, color, mult) => {
    const pts = ring.map(([x, z]) => new THREE.Vector3(x, y, z));
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(mult) }));
  };
  for (const ring of rings) scene.add(loop(ring, MAP.top + 0.01, '#fde68a', 1.1));
  const maniLine = loop(mani, MAP.maniTop + 0.01, '#fff7ed', 2.2);
  scene.add(maniLine);

  W.polyPlatforms.push(polyPlatform(rings, MAP.top), polyPlatform([mani], MAP.maniTop));

  // flowing rivers
  const riverMat = riverMaterial();
  for (const river of RIVERS) {
    const pts = river.map(([lo, la]) => {
      const [x, z] = project(lo, la);
      return new THREE.Vector3(x, MAP.top + 0.03, z);
    });
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 10, 0.05, 5), riverMat));
  }

  // snow-capped Himalayan peaks (only where they fall inside India)
  const prng = mulberry32(5);
  const peakRock = std('#8d7f70'), peakSnow = std('#f8fafc');
  for (const [lo, la, h] of HIMALAYA) {
    const [x, z] = project(lo, la);
    if (!pointInRings(rings, x, z)) continue;
    const r = 0.32 + h * 0.18;
    scene.add(mesh(jitter(new THREE.ConeGeometry(r, h, 6, 1), 0.06, prng, (px, py) => Math.abs(py) > h / 2 - 0.01), peakRock, x, MAP.top + h / 2, z));
    scene.add(mesh(new THREE.ConeGeometry(r * 0.5, h * 0.5, 6), peakSnow, x, MAP.top + h * 0.75 + 0.01, z));
  }
  const HN = quality === 'high' ? 160 : 80;
  const [hx0, hz0] = project(73.8, 36.2), [hx1, hz1] = project(80.8, 30.2);
  const hp = new Float32Array(HN * 3);
  for (let i = 0; i < HN; i++) {
    hp[i * 3] = hx0 + prng() * (hx1 - hx0);
    hp[i * 3 + 1] = MAP.top + prng() * 4;
    hp[i * 3 + 2] = hz0 + prng() * (hz1 - hz0);
  }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  const hflakes = new THREE.Points(hg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.08, transparent: true, depthWrite: false }));
  hflakes.frustumCulled = false;
  scene.add(hflakes);
  W.updaters.push((t, dt) => {
    for (let i = 0; i < HN; i++) {
      hp[i * 3 + 1] -= 0.7 * dt;
      if (hp[i * 3 + 1] < MAP.top + 0.3) hp[i * 3 + 1] = MAP.top + 4;
    }
    hg.attributes.position.needsUpdate = true;
  });

  // --- journey stops
  const stops = JOURNEY.map((s) => {
    const [x, z] = project(s.lon, s.lat);
    return { ...s, x, z, y: pointInRings([mani], x, z) ? MAP.maniTop : MAP.top };
  });
  W.journeyStops = stops;
  const stickMat = std('#334155', { metalness: 0.4 });
  for (const s of stops) {
    const col = s.home ? '#fb923c' : s.current ? '#5eead4' : s.event ? '#c084fc' : '#fbbf24';
    const g = new THREE.Group();
    g.position.set(s.x, s.y, s.z);
    let head;
    if (s.home) {
      g.add(mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), std('#fff7ed'), 0, 0.2, 0));
      const roof = mesh(new THREE.ConeGeometry(0.5, 0.36, 4), std('#b91c1c'), 0, 0.58, 0);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.22, 0.02), std('#7c2d12'), 0, 0.11, 0.28));
      head = mesh(new THREE.SphereGeometry(0.24, 16, 12), glowMat(col, 3), 0, 1.35, 0, false);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 12, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      beam.position.y = 6.5;
      g.add(beam);
      const waves = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.025, 6, 40),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.8), transparent: true, depthWrite: false })
        );
        m.rotation.x = Math.PI / 2;
        m.position.y = 0.03;
        g.add(m);
        return m;
      });
      W.updaters.push((t) => {
        waves.forEach((m, i) => {
          const p = (t * 0.45 + i / 3) % 1;
          m.scale.setScalar(1 + p * 5);
          m.material.opacity = (1 - p) * 0.9;
        });
        maniMat.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.2;
      });
    } else {
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), stickMat, 0, 0.4, 0));
      head = mesh(new THREE.SphereGeometry(0.17, 14, 10), glowMat(col, 2.6), 0, 0.85, 0, false);
      const ring = mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 24), glowMat(col, 1.8), 0, 0.02, 0, false);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
    g.add(head);
    const label = makeLabel(s.home ? `🏠 ${s.place}` : s.place, { sub: s.home ? 'my hometown' : s.when, accent: col, height: s.home ? 0.5 : 0.36 });
    label.position.y = s.labelY;
    g.add(label);
    scene.add(g);
    const hy = head.position.y;
    W.updaters.push((t) => (head.position.y = hy + Math.sin(t * 2.4 + s.x) * 0.08));
    interact({
      id: `city:${s.id}`, zone: 'journey', label: s.home ? `Visit my hometown — ${s.place}` : `Visit ${s.place}`,
      x: s.x, z: s.z, y: s.y, r: s.home ? 1.6 : 1.15, object: g,
    });
  }

  // --- route arcs + a travelling comet
  const lift = (s) => new THREE.Vector3(s.x, s.y + (s.home ? 1.35 : 0.85), s.z);
  const arc = (a, b, col, opacity) => {
    const pa = lift(a), pb = lift(b);
    const mid = pa.clone().lerp(pb, 0.5);
    mid.y += pa.distanceTo(pb) * 0.35 + 0.4;
    const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
    scene.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.035, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.4), transparent: true, opacity })
    ));
    return curve;
  };
  const route = stops.filter((s) => !s.event);
  const path = new THREE.CurvePath();
  for (let i = 0; i < route.length - 1; i++) path.add(arc(route[i], route[i + 1], '#fde68a', 0.75));
  const pune = stops.find((s) => s.current);
  for (const ev of stops.filter((s) => s.event)) arc(pune, ev, '#c084fc', 0.55);

  const comet = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.13 * (1 - i * 0.12), 10, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(i ? '#fb923c' : '#fff7ed').multiplyScalar(i ? 2 : 3), transparent: true, opacity: 1 - i * 0.13 })
    );
    scene.add(m);
    comet.push(m);
  }
  W.updaters.push((t) => {
    const u = (t * 0.055) % 1;
    comet.forEach((m, i) => m.position.copy(path.getPointAt(Math.max(0, u - i * 0.007))));
  });

  // --- journey log kiosk (in the Arabian Sea)
  const [kx, kz] = project(70, 12.6);
  const k = new THREE.Group();
  k.position.set(kx, 0, kz);
  k.add(mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 10), std('#1e293b', { metalness: 0.4 }), 0, 0.45, 0));
  const globe = new THREE.Group();
  globe.position.y = 1.55;
  globe.add(mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.4, metalness: 0.2 }), 0, 0, 0, false));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.53, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5eead4').multiplyScalar(1.5), wireframe: true, transparent: true, opacity: 0.6 })));
  globe.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat('#fb923c', 3), 0.36, 0.2, 0.3, false));
  k.add(globe);
  const kl = makeLabel('Journey Log', { sub: 'Thoubal → Pune', accent: '#fb923c', height: 0.45 });
  kl.position.y = 2.6;
  k.add(kl);
  scene.add(k);
  W.updaters.push((t) => {
    globe.rotation.y = t * 0.6;
    globe.position.y = 1.55 + Math.sin(t * 1.5) * 0.08;
  });
  circle(kx, kz, 0.6, 3);
  interact({ id: 'journey', zone: 'journey', label: 'Open my India journey log', x: kx, z: kz, r: 2.4, object: k });
}
