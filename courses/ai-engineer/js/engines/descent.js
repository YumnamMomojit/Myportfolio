// Gradient descent on a 3D loss landscape: pick the learning rate (and momentum), then step.
import * as THREE from 'three';
import { candy, candyMat, C, PALETTE } from '../../../shared/kit.js';

const TERRAINS = {
  bowl: {
    L: (x, z) => 0.2 * (x * x + z * z),
    G: (x, z) => [0.4 * x, 0.4 * z],
    start: [5, 4], target: 0.05, ys: 0.35,
  },
  ravine: {
    L: (x, z) => 0.1 * x * x + z * z,
    G: (x, z) => [0.2 * x, 2 * z],
    start: [6, 1.5], target: 0.1, ys: 0.12,
  },
  bumpy: {
    L: (x, z) => 0.05 * (x * x + z * z) - 0.6 * Math.exp(-((x - 3) ** 2 + (z - 2.4) ** 2) / 0.6),
    G: (x, z) => {
      const e = Math.exp(-((x - 3) ** 2 + (z - 2.4) ** 2) / 0.6);
      return [0.1 * x + (0.6 * e * 2 * (x - 3)) / 0.6, 0.1 * z + (0.6 * e * 2 * (z - 2.4)) / 0.6];
    },
    start: [5.2, 4.2], target: 0.05, ys: 1.2,
  },
};
const R = 7; // the map is a disc of radius R

export default function descent(ctx) {
  const { stage, params } = ctx;
  const T = TERRAINS[params.terrain];
  const lrs = params.lrs;
  const momenta = params.momenta || [0];
  const height = (x, z) => T.L(x, z) * T.ys;

  // Par: the fewest steps any available setting needs.
  let par = Infinity;
  for (const lr of lrs) for (const b of momenta) par = Math.min(par, simulate(T, lr, b));
  ctx.budget({ par, moves: par + (params.extra ?? 8) });

  // A round terrain mesh coloured by height.
  const geo = new THREE.RingGeometry(0.001, R, 128, 64);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const lo = new THREE.Color(0x5ee6a8);
  const mid = new THREE.Color(0xc4ea6a);
  const hi = new THREE.Color(0xf5b301);
  let maxH = 0;
  for (let i = 0; i < pos.count; i++) maxH = Math.max(maxH, height(pos.getX(i), pos.getZ(i)));
  for (let i = 0; i < pos.count; i++) {
    const h = height(pos.getX(i), pos.getZ(i));
    pos.setY(i, h);
    const k = Math.pow(Math.max(h, 0) / maxH, 0.5);
    const c = k < 0.5 ? lo.clone().lerp(mid, k * 2) : mid.clone().lerp(hi, (k - 0.5) * 2);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.6, flatShading: false }));
  stage.root.add(land);
  const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.08 }));
  wire.position.y = 0.01;
  stage.root.add(wire);

  // Goal ring around the true minimum.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 10, 40), candyMat(0xffc61a, { emissive: 0x996600, emissiveIntensity: 0.6 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, height(0, 0) + 0.05, 0);
  stage.root.add(ring);

  const ball = candy('ball', C.red, 0.6);
  stage.root.add(ball);
  const trail = new THREE.Group();
  stage.root.add(trail);

  let [x, z] = T.start;
  let vx = 0, vz = 0;
  let steps = 0;
  placeBall(x, z);

  stage.orbit = true;
  stage.frame({ target: [0, 1.0, 0], w: 14.5, h: 7.5, yaw: 0.65, pitch: 0.62 });

  const lrStep = ctx.ui.stepper('learning rate η', lrs, params.lr0 ?? 0, () => status());
  let mStep = null;
  if (params.momenta) mStep = ctx.ui.stepper('momentum β', momenta, 0, () => status());
  ctx.ui.break();
  ctx.ui.button('⬇ Step', () => run(1), { cls: 'green', cost: 1 });
  ctx.ui.button('⏩ Step ×5', () => run(5), { cls: 'orange', cost: 5 });
  status();

  function placeBall(px, pz) {
    ball.position.set(px, height(px, pz) + 0.3, pz);
  }

  function status() {
    const L = T.L(x, z);
    ctx.status(`Loss <b>${L.toFixed(3)}</b> · goal ≤ <b>${T.target}</b> · steps <b>${steps}</b> · drag to look around`);
  }

  async function run(n) {
    ctx.busy = true;
    let done = 0;
    for (; done < n; done++) {
      const lr = lrStep.value;
      const beta = mStep ? mStep.value : 0;
      const [gx, gz] = T.G(x, z);
      vx = beta * vx - lr * gx;
      vz = beta * vz - lr * gz;
      const nx = x + vx;
      const nz = z + vz;
      steps++;
      const dot = candy('ball', C.white, 0.16);
      dot.position.copy(ball.position).setY(ball.position.y - 0.2);
      trail.add(dot);
      if (!Number.isFinite(nx) || Math.hypot(nx, nz) > R) {
        await flyOff(nx, nz);
        ctx.refund(n - done - 1);
        ctx.busy = false;
        ctx.fail(`Diverged! With η = ${lr} the step overshot so far that the ball flew off the map. Try a smaller learning rate.`);
        return;
      }
      await hop(nx, nz);
      x = nx;
      z = nz;
      status();
      if (T.L(x, z) <= T.target) {
        ctx.refund(n - done - 1);
        ctx.sound.gem();
        stage.fx.burst(ball.position.clone(), PALETTE, 30, 4);
        ctx.busy = false;
        ctx.win();
        return;
      }
    }
    ctx.busy = false;
  }

  function hop(nx, nz) {
    const ox = x, oz = z;
    ctx.sound.tone?.(300 + Math.random() * 80, 0.08, 'triangle', 0.04);
    return stage.tweens.add(0.28, (k) => {
      const px = ox + (nx - ox) * k;
      const pz = oz + (nz - oz) * k;
      placeBall(px, pz);
      ball.position.y += Math.sin(k * Math.PI) * Math.min(1.5, 0.3 + Math.hypot(nx - ox, nz - oz) * 0.25);
    });
  }

  function flyOff(nx, nz) {
    ctx.sound.boing();
    const from = ball.position.clone();
    const dir = new THREE.Vector3(nx - x, 0, nz - z).normalize();
    return stage.tweens.add(0.9, (k) => {
      ball.position.copy(from).addScaledVector(dir, k * 12);
      ball.position.y = from.y + Math.sin(k * Math.PI * 0.8) * 5;
    });
  }

  return {
    update(dt) {
      ring.rotation.z += dt;
    },
  };
}

function simulate(T, lr, beta, max = 60) {
  let [x, z] = T.start;
  let vx = 0, vz = 0;
  for (let k = 1; k <= max; k++) {
    const [gx, gz] = T.G(x, z);
    vx = beta * vx - lr * gx;
    vz = beta * vz - lr * gz;
    x += vx;
    z += vz;
    if (!Number.isFinite(x) || Math.hypot(x, z) > R) return Infinity;
    if (T.L(x, z) <= T.target) return k;
  }
  return Infinity;
}
