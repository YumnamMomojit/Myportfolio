// Move candies between jars to hit a target entropy.
import * as THREE from 'three';
import { candy, box, label, setLabel, C, PALETTE } from '../kit.js';

const COLORS = [C.pink, C.blue, C.green, C.orange];

export default function entropy(ctx) {
  const { stage, params } = ctx;
  const counts = params.start.slice();
  const N = counts.reduce((a, b) => a + b, 0);
  const targets = params.targets;
  let round = 0;
  let sel = -1;

  const gap = 2.3;
  const jars = counts.map((_, i) => {
    const g = new THREE.Group();
    g.position.set((i - 1.5) * gap, -1.6, 0);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.7, 2.5, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.y = 1.25;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 10, 40), new THREE.MeshPhysicalMaterial({ color: COLORS[i], clearcoat: 1, roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 2.5;
    const base = box(1.7, 0.25, 1.7, COLORS[i], 0.1);
    base.position.y = -0.12;
    const info = label('', { size: 40, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.62, pad: 10, radius: 16 });
    info.position.set(0, -0.85, 0.6);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 40), new THREE.MeshBasicMaterial({ color: 0xffc61a, transparent: true, opacity: 0 }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    g.add(glass, rim, base, info, glow);
    stage.root.add(g);
    stage.clickable(g, () => pick(i));
    return { g, info, glow, balls: [] };
  });

  // entropy gauge
  const gaugeW = 8;
  const track = box(gaugeW, 0.32, 0.3, 0xfff1c2, 0.14);
  track.position.set(0, 2.75, 0);
  const fill = box(1, 0.3, 0.32, C.purple, 0.12);
  const marker = box(0.08, 0.7, 0.4, C.red, 0.03);
  const markerTag = label('', { size: 40, weight: 700, color: '#ffffff', bg: '#ff4d6d', height: 0.38, pad: 8, radius: 14 });
  const hTag = label('', { size: 48, weight: 700, color: '#15331f', height: 0.45, pad: 6 });
  hTag.position.set(0, 3.4, 0);
  stage.root.add(track, fill, marker, markerTag, hTag);
  for (let b = 0; b <= 2; b++) {
    const t = label(`${b} bit${b === 1 ? '' : 's'}`, { size: 34, weight: 600, color: '#4f6b55', height: 0.3, pad: 4 });
    t.position.set(-gaugeW / 2 + (b / 2) * gaugeW, 2.3, 0.2);
    stage.root.add(t);
  }

  stage.frame({ target: [0, 0.6, 0], w: 9.6, h: 7.4, yaw: 0, pitch: 0.12 });
  rebuildBalls();
  setRound();

  function H(cs) {
    return -cs.reduce((s, c) => (c ? s + (c / N) * Math.log2(c / N) : s), 0);
  }

  function setRound() {
    ctx.round(round + 1, targets.length);
    ctx.goal(`Move candies until the entropy is exactly <b>${targets[round]} bit${targets[round] === 1 ? '' : 's'}</b>.`);
    update();
  }

  function pick(i) {
    if (ctx.over || ctx.busy) return;
    if (sel < 0) {
      if (!counts[i]) {
        ctx.toast('That jar is empty. Pick a jar with candies in it.', 'hint');
        return;
      }
      sel = i;
      ctx.sound.pickup();
      jars[i].glow.material.opacity = 0.9;
      jars[i].g.position.y = -1.25; // lift the picked jar
      return;
    }
    const from = sel;
    jars[from].glow.material.opacity = 0;
    jars[from].g.position.y = -1.6;
    sel = -1;
    if (from === i) return;
    if (!ctx.move()) return;
    counts[from]--;
    counts[i]++;
    ctx.sound.pop();
    const flying = jars[from].balls.pop();
    const start = flying.getWorldPosition(new THREE.Vector3());
    stage.root.attach(flying);
    ctx.busy = true;
    const end = jars[i].g.position.clone().add(slot(counts[i] - 1));
    stage.tweens.add(0.45, (k) => {
      flying.position.lerpVectors(start, end, k);
      flying.position.y += Math.sin(k * Math.PI) * 2.2;
    }).then(() => {
      stage.root.remove(flying);
      rebuildBalls();
      ctx.busy = false;
      update();
      check();
    });
  }

  function slot(k) {
    return new THREE.Vector3((k % 2 ? 0.22 : -0.22), 0.3 + Math.floor(k / 2) * 0.46, (k % 4 < 2 ? 0.08 : -0.08));
  }

  function rebuildBalls() {
    jars.forEach((j, i) => {
      j.balls.forEach((b) => j.g.remove(b));
      j.balls = [];
      for (let k = 0; k < counts[i]; k++) {
        const b = candy('ball', COLORS[i], 0.42);
        b.position.copy(slot(k));
        j.g.add(b);
        j.balls.push(b);
      }
    });
  }

  function update() {
    const h = H(counts);
    jars.forEach((j, i) => {
      const p = counts[i] / N;
      setLabel(j.info, p ? `p = ${counts[i]}/${N}\nsurprise ${(-Math.log2(p)).toFixed(2)} bits` : 'p = 0\nnever drawn', { size: 40, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.62, pad: 10, radius: 16 });
    });
    const t = targets[round];
    marker.position.set(-gaugeW / 2 + (t / 2) * gaugeW, 2.75, 0);
    setLabel(markerTag, `goal ${t}`, { size: 40, weight: 700, color: '#ffffff', bg: '#ff4d6d', height: 0.38, pad: 8, radius: 14 });
    markerTag.position.set(marker.position.x, 3.35, 0.4);
    hTag.position.y = 3.35;
    setLabel(hTag, `H = ${h.toFixed(2)} bits`, { size: 48, weight: 700, color: '#15331f', height: 0.45, pad: 6 });
    hTag.position.x = -gaugeW / 2 + hTag.scale.x / 2;
    ctx.status(`Entropy <b>H = ${h.toFixed(3)}</b> bits · goal <b>${t}</b> · H = −Σ p·log₂ p = average surprise`);
  }

  function check() {
    if (Math.abs(H(counts) - targets[round]) > 1e-9) return;
    ctx.sound.gem();
    stage.fx.burst(new THREE.Vector3(0, 2.75, 0.4), PALETTE, 30, 4);
    round++;
    if (round >= targets.length) {
      ctx.win();
      return;
    }
    ctx.toast(`Exactly ${targets[round - 1]} bits! Next goal: ${targets[round]} bits.`, 'good');
    setRound();
  }

  return {
    update(dt) {
      const h = H(counts);
      const target = Math.max((h / 2) * gaugeW, 0.001);
      fill.scale.x += (target - fill.scale.x) * (1 - Math.exp(-dt * 8));
      fill.position.set(-gaugeW / 2 + fill.scale.x / 2, 2.75, 0.02);
      if (sel >= 0) jars[sel].glow.rotation.z += dt * 2;
    },
  };
}
