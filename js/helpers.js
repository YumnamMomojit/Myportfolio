// Shared mesh / material helpers used by every part of the world.
import * as THREE from 'three';

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.82, metalness: 0.04, ...o });
export const glowMat = (color, intensity = 2.2) =>
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.5 });

export function mesh(geo, mat, x = 0, y = 0, z = 0, shadows = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  return m;
}

export function beam(a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = mesh(new THREE.CylinderGeometry(r, r, dir.length(), 6), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function jitter(geo, amt, rng, skip = () => false) {
  const p = geo.attributes.position;
  const offsets = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (skip(x, y, z)) continue;
    const k = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    let o = offsets.get(k);
    if (!o) offsets.set(k, (o = [(rng() - 0.5) * amt, (rng() - 0.5) * amt, (rng() - 0.5) * amt]));
    p.setXYZ(i, x + o[0], y + o[1], z + o[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

export function groundDisc(r, color, y = 0.03, opts = {}) {
  const g = new THREE.CircleGeometry(r, 48);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, ...opts }));
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

export function glowRing(r, width, color, intensity = 1.6, y = 0.05) {
  const g = new THREE.RingGeometry(r - width, r, 64);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.y = y;
  return m;
}

// ---------------------------------------------------------------- water

// One clock shared by every water surface (advanced by the world updater).
export const waterTime = { value: 0 };

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;
const VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// Rippling lake / stream surface. `flow` > 0 scrolls the ripples along the plane's v axis (streams).
export function waterMaterial({ deep = '#0e5a8a', shallow = '#38bdf8', opacity = 0.9, flow = 0, scale = 1 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: {
      t: waterTime,
      deep: { value: new THREE.Color(deep) },
      shallow: { value: new THREE.Color(shallow) },
      opacity: { value: opacity },
      flow: { value: flow },
      scale: { value: scale },
    },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float t; uniform float opacity; uniform float flow; uniform float scale;
      uniform vec3 deep; uniform vec3 shallow;
      varying vec2 vUv; varying vec3 vW;
      void main() {
        vec2 p = vW.xz * scale;
        if (flow > 0.0) p = vec2(vUv.x * 5.0, vUv.y * 12.0 - t * flow);
        float w = sin(p.x * 1.7 + t * 1.3) * sin(p.y * 1.9 - t * 1.1) + 0.5 * sin((p.x + p.y) * 3.1 + t * 2.0);
        float hl = smoothstep(0.75, 1.2, w);
        vec3 c = mix(deep, shallow, 0.5 + 0.25 * w) + vec3(0.9, 0.97, 1.0) * hl * 0.55;
        gl_FragColor = vec4(c, opacity);
        ${OUT}
      }`,
  });
}

// Falling water sheet: bright streaks racing down the plane.
export function fallsMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { t: waterTime },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float t; varying vec2 vUv; varying vec3 vW;
      float h(float n) { return fract(sin(n * 91.345) * 43758.5453); }
      void main() {
        float col = floor(vUv.x * 30.0);
        float r = h(col);
        float s = fract(vUv.y * 2.4 + t * (1.5 + r * 0.9) + r * 7.0);
        float streak = smoothstep(0.0, 0.2, s) * smoothstep(1.0, 0.55, s);
        vec3 c = mix(vec3(0.42, 0.7, 0.95), vec3(0.97, 0.99, 1.0), 0.35 + streak * 0.65);
        float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        gl_FragColor = vec4(c, (0.5 + streak * 0.45) * edge);
        ${OUT}
      }`,
  });
}

// Ocean around the India map, with a transparent overlay texture (lat/long grid, sea names).
export function oceanMaterial(overlay) {
  return new THREE.ShaderMaterial({
    polygonOffset: true,
    polygonOffsetFactor: -1,
    uniforms: { t: waterTime, overlay: { value: overlay } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float t; uniform sampler2D overlay;
      varying vec2 vUv; varying vec3 vW;
      void main() {
        vec2 p = vW.xz * 1.6;
        float w = sin(p.x * 1.3 + t * 0.9) * sin(p.y * 1.1 - t * 0.7) + 0.5 * sin((p.x - p.y) * 2.3 + t * 1.6);
        vec3 c = mix(vec3(0.02, 0.13, 0.32), vec3(0.07, 0.33, 0.6), 0.5 + 0.25 * w);
        c += vec3(0.6, 0.85, 1.0) * smoothstep(0.85, 1.25, w) * 0.22;
        c *= 1.0 - length(vUv - 0.5) * 0.5;
        vec4 o = texture2D(overlay, vUv);
        c = mix(c, o.rgb, o.a);
        gl_FragColor = vec4(c, 1.0);
        ${OUT}
      }`,
  });
}

// Glowing river lines whose highlights flow downstream (TubeGeometry: u runs along the curve).
export function riverMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { t: waterTime },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float t; varying vec2 vUv; varying vec3 vW;
      void main() {
        float s = fract(vUv.x * 18.0 - t * 0.9);
        float b = smoothstep(0.0, 0.3, s) * smoothstep(1.0, 0.6, s);
        vec3 c = mix(vec3(0.1, 0.45, 0.9), vec3(0.75, 0.95, 1.0), b * 0.8);
        gl_FragColor = vec4(c * 1.2, 1.0);
        ${OUT}
      }`,
  });
}

// Soft round sprite texture (mist, sparkles).
export function softSpriteTexture(color = '255,255,255') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${color},1)`);
  grad.addColorStop(0.5, `rgba(${color},0.45)`);
  grad.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
