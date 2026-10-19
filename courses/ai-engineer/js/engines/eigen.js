// Turn an arrow and apply a matrix: find the arrows that only stretch (eigenvectors).
import * as THREE from 'three';
import { arrow, grid, label, C, PALETTE } from '../../../shared/kit.js';

export default function eigen(ctx) {
  const { stage, params } = ctx;
  const A = params.A;
  const stepDeg = params.step ?? 15;
  const need = 2;

  stage.root.add(grid(-4, 4, -4, 4, { step: 1, opacity: 0.25 }));
  const circle = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.02, 64), new THREE.MeshBasicMaterial({ color: 0x13753f, transparent: true, opacity: 0.5 }));
  circle.position.z = 0.01;
  stage.root.add(circle);
  stage.frame({ target: [0, 0, 0], w: 9.5, h: 9.5, yaw: 0, pitch: 0.12 });

  const lineMat = new THREE.LineDashedMaterial({ color: 0x15331f, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.55 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6, 0, 0.02), new THREE.Vector3(6, 0, 0.02)]);
  const line = new THREE.Line(lineGeo, lineMat);
  line.computeLineDistances();
  stage.root.add(line);

  const v = arrow(C.pink, 0.07);
  const av = arrow(C.orange, 0.06);
  av.visible = false;
  stage.root.add(v, av);
  const avLabel = label('A·v', { size: 44, weight: 700, color: '#ff9f1c', stroke: '#ffffff', height: 0.42, pad: 6 });
  avLabel.visible = false;
  stage.root.add(avLabel);

  let angle = 0;
  const found = [];
  let shownAngle = 0;

  ctx.ui.button('⟲ Turn 15°', () => turn(stepDeg), { cls: 'blue' });
  ctx.ui.button('⟳ Turn −15°', () => turn(-stepDeg), { cls: 'blue' });
  ctx.ui.button('✨ Apply A', apply, { cls: 'orange', cost: 1 });
  status();

  function turn(d) {
    angle = (((angle + d) % 360) + 360) % 360;
    av.visible = false;
    avLabel.visible = false;
    status();
  }

  function dir(a) {
    const r = THREE.MathUtils.degToRad(a);
    return [Math.cos(r), Math.sin(r)];
  }

  async function apply() {
    const [x, y] = dir(angle);
    const ax = A[0][0] * x + A[0][1] * y;
    const ay = A[1][0] * x + A[1][1] * y;
    ctx.busy = true;
    ctx.sound.warp();
    av.visible = true;
    avLabel.visible = true;
    await stage.tweens.add(0.6, (k) => {
      const px = x + (ax - x) * k;
      const py = y + (ay - y) * k;
      av.set(new THREE.Vector3(0, 0, 0.18), new THREE.Vector3(px, py, 0.18));
      avLabel.position.set(px * 1.08 + 0.2, py * 1.08 + 0.3, 0.3);
    });
    ctx.busy = false;
    const cross = x * ay - y * ax;
    const lambda = x * ax + y * ay;
    const avAngle = THREE.MathUtils.radToDeg(Math.atan2(ay, ax));
    let off = Math.abs((((avAngle - angle) % 180) + 180) % 180);
    off = Math.min(off, 180 - off);
    if (Math.abs(cross) < 1e-6) {
      const key = angle % 180;
      if (found.includes(key)) {
        ctx.toast('You already found this direction. Look for the other one!', 'hint');
        return;
      }
      found.push(key);
      ctx.sound.gem();
      const gold = arrow(0xffc61a, 0.09);
      gold.set(new THREE.Vector3(0, 0, 0.1), new THREE.Vector3(x * lambda, y * lambda, 0.1));
      stage.root.add(gold);
      const tag = label(`λ = ${+lambda.toFixed(2)}`, { size: 44, weight: 700, color: '#ffffff', bg: '#ffb800', height: 0.45, pad: 10, radius: 20 });
      tag.position.set(x * lambda + 0.4, y * lambda + 0.4, 0.4);
      stage.root.add(tag);
      stage.fx.burst(new THREE.Vector3(ax, ay, 0.3), PALETTE, 24, 4);
      ctx.toast(`Eigenvector found! A only stretches it, by λ = ${+lambda.toFixed(2)}.`, 'good');
      if (found.length >= need) ctx.win();
    } else {
      ctx.toast(`A·v leans ${off.toFixed(0)}° off v’s line: not an eigenvector.`, 'bad');
    }
    status();
  }

  function status() {
    ctx.status(`v points at <b>${angle}°</b> · eigenvectors found: <b>${found.length} / ${need}</b>`);
  }

  return {
    update(dt) {
      shownAngle += ((((angle - shownAngle + 540) % 360) - 180)) * (1 - Math.exp(-dt * 10));
      const [x, y] = dir(shownAngle);
      v.set(new THREE.Vector3(0, 0, 0.25), new THREE.Vector3(x, y, 0.25));
      line.rotation.z = THREE.MathUtils.degToRad(shownAngle);
    },
  };
}
