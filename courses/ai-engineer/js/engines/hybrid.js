// Hybrid search: blend keyword (BM25) and dense scores so every query fetches the right book.
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, setLabel, bfs, C, PALETTE } from '../kit.js';

const DOCS = [
  ['Error E-4031', 'disk quota exceeded'],
  ['Error E-4032', 'request timed out'],
  ['How to recover', 'a forgotten login'],
  ['Storage plans', 'and space limits'],
  ['Invoices and', 'payment history'],
  ['Speeding up slow', 'connections'],
];
// Scores are already scaled to 0–1. index = document.
const QUERIES = [
  { q: '“E-4031”', want: 0, bm25: [1.0, 0.6, 0, 0, 0, 0], dense: [0.5, 0.55, 0.1, 0.45, 0.05, 0.2] },
  { q: '“I can’t remember my password”', want: 2, bm25: [0, 0, 0.15, 0, 0.4, 0], dense: [0.1, 0.1, 0.9, 0.1, 0.2, 0.1] },
  { q: '“disk full error”', want: 0, bm25: [0.7, 0.5, 0, 0.1, 0, 0], dense: [0.6, 0.3, 0.05, 0.9, 0.05, 0.1] },
  { q: '“why is the site so slow”', want: 5, bm25: [0, 0.5, 0, 0, 0, 0.25], dense: [0.1, 0.55, 0.05, 0.1, 0.05, 0.85] },
];
const ALPHAS = [...Array(11)].map((_, i) => +(i / 10).toFixed(1));
const BOOK_COLORS = [C.red, C.orange, C.blue, C.green, C.purple, C.teal];

const top1 = (q, a) => {
  const s = q.dense.map((d, i) => a * d + (1 - a) * q.bm25[i]);
  return s.indexOf(Math.max(...s));
};

export default function hybrid(ctx) {
  const { stage, params } = ctx;
  let ai = params.alpha0 ?? 10;
  const allOk = (a) => QUERIES.every((q) => top1(q, ALPHAS[a]) === q.want);
  const par = bfs(ai, (a) => [a - 1, a + 1].filter((x) => x >= 0 && x < ALPHAS.length), allOk);
  ctx.budget({ par });

  // shelf and books
  const shelf = box(12.4, 0.35, 1.6, 0x9a5b2e, 0.1);
  shelf.position.set(0, -2.9, 0);
  stage.root.add(shelf);
  const books = DOCS.map((d, i) => {
    const g = new THREE.Group();
    g.position.set((i - 2.5) * 2.0, -1.6, 0);
    const b = box(1.75, 2.3, 1.0, BOOK_COLORS[i], 0.14);
    const t = textPlane(`${d[0]}\n${d[1]}`, { size: 34, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.93)', height: 0.3, pad: 10, radius: 12 });
    const scale = Math.min(1, 1.6 / t.geometry.parameters.width);
    t.scale.setScalar(scale);
    t.position.set(0, 0.25, 0.52);
    const id = label(`D${i + 1}`, { size: 40, weight: 700, color: '#ffffff', stroke: '#15331f', height: 0.34, pad: 4 });
    id.position.set(0, -0.75, 0.6);
    g.add(b, t, id);
    stage.root.add(g);
    return g;
  });

  // query drones
  const drones = QUERIES.map((q, i) => {
    const g = new THREE.Group();
    g.position.set((i - 1.5) * 3.1, 3.2, 0);
    const body = candy('ball', C.white, 0.7);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 30), candyMat(C.grey));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    const bubble = textPlane(q.q, { size: 36, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.95)', height: 0.32, pad: 12, radius: 14 });
    bubble.scale.setScalar(Math.min(1, 2.9 / bubble.geometry.parameters.width));
    bubble.position.set(0, 0.85, 0);
    const mark = label('', { size: 56, weight: 700, height: 0.45, pad: 4 });
    mark.position.set(0.55, -0.4, 0.4);
    g.add(body, ring, bubble, mark);
    stage.root.add(g);
    const beamGeo = new THREE.BufferGeometry();
    const beam = new THREE.Line(beamGeo, new THREE.LineDashedMaterial({ color: 0xff9f1c, dashSize: 0.2, gapSize: 0.12 }));
    stage.root.add(beam);
    return { g, mark, beam, beamGeo, ring };
  });

  stage.frame({ target: [0, 0.35, 0], w: 13, h: 7.8, yaw: 0, pitch: 0.1 });

  const aStep = ctx.ui.stepper('α (0 = keywords, 1 = meaning)', ALPHAS, ai, (_, i) => { ai = i; changed(); }, { cost: 1, format: (v) => v.toFixed(1) });
  refresh();

  function changed() {
    ctx.sound.pop();
    refresh();
    if (allOk(ai)) {
      ctx.sound.gem();
      drones.forEach((d) => stage.fx.burst(d.g.position.clone(), PALETTE, 12, 3));
      ctx.win({ note: `α = ${ALPHAS[ai]}: keywords catch the exact error code, embeddings catch the paraphrases.` });
    }
  }

  function refresh() {
    const a = ALPHAS[ai];
    let ok = 0;
    QUERIES.forEach((q, i) => {
      const t = top1(q, a);
      const good = t === q.want;
      ok += good;
      const d = drones[i];
      setLabel(d.mark, good ? '✅' : '❌', { size: 56, weight: 700, height: 0.45, pad: 4 });
      const from = d.g.position.clone().add(new THREE.Vector3(0, -0.4, 0));
      const to = books[t].position.clone().add(new THREE.Vector3(0, 1.2, 0.3));
      d.beamGeo.setFromPoints([from, to]);
      d.beam.computeLineDistances();
      d.beam.material.color.set(good ? 0x1c9e58 : 0xff4d6d);
    });
    ctx.status(`score = <b>${a.toFixed(1)}</b>·dense + <b>${(1 - a).toFixed(1)}</b>·BM25 · <b class="${ok === 4 ? 'ok' : ''}">${ok} / 4</b> queries fetch the right book`);
  }

  return {
    update(dt) {
      const t = performance.now() / 1000;
      drones.forEach((d, i) => {
        d.ring.rotation.z += dt * 8;
        d.g.position.y = 3.2 + Math.sin(t * 2 + i) * 0.08;
      });
    },
  };
}
