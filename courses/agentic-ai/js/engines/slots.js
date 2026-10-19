// Fix a spec line by line: pick the best option for each field, then check.
// params: { title, fields: [{ key, options, answer, why }], start: [option index per field] }
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, disposeTree, C, PALETTE, MONO } from '../../../shared/kit.js';
import { wrap } from './sort.js';

export default function slots(ctx) {
  const { stage, params } = ctx;
  const fields = params.fields;
  const choice = fields.map((_, k) => params.start?.[k] ?? 0);
  const wrongAtStart = fields.filter((f, k) => choice[k] !== f.answer).length;
  const par = wrongAtStart + 1; // fix each wrong field, then one check
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });

  const tall = innerHeight > innerWidth; // phone in portrait: a narrower layout
  const W = tall ? 7.4 : 12.4, H = tall ? 1.5 : 1.05, GAP = 0.18;
  const KEYW = tall ? 1.8 : 2.6;
  const top = ((fields.length - 1) / 2) * (H + GAP);
  const title = textPlane(params.title, { font: MONO, size: 44, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.42, pad: 14, radius: 12 });
  title.position.set(-W / 2 + title.geometry.parameters.width / 2, top + H / 2 + 0.55, 0.1);
  stage.root.add(title);

  const rows = fields.map((f, k) => {
    const g = new THREE.Group();
    g.position.set(0, top - k * (H + GAP), 0);
    const body = box(W, H, 0.4, C.white, 0.22);
    const key = textPlane(f.key, { font: MONO, size: 40, weight: 700, color: '#13753f', height: 0.34, pad: 4 });
    key.scale.setScalar(Math.min(1, KEYW / key.geometry.parameters.width));
    key.position.set(-W / 2 + 0.25 + (key.geometry.parameters.width * key.scale.x) / 2, 0, 0.22);
    const mark = label('', { size: 50, height: 0.42, pad: 4 });
    mark.position.set(W / 2 + 0.45, 0, 0.3);
    g.add(body, key, mark);
    stage.root.add(g);
    stage.clickable(g, () => select(k));
    return { g, body, value: null, mark };
  });

  stage.frame({ target: [0.3, 0.3, 0], w: W + 1.6, h: fields.length * (H + GAP) + 1.8, yaw: 0, pitch: 0.12 });

  let sel = -1;
  const optGroup = ctx.ui.group('Pick a line in the scene');
  ctx.ui.break();
  ctx.ui.button('✔ Check', check, { cls: 'green', cost: 1 });
  fields.forEach((_, k) => drawValue(k));
  select(0);

  function drawValue(k) {
    const r = rows[k];
    if (r.value) {
      r.g.remove(r.value);
      disposeTree(r.value);
    }
    const text = wrap(fields[k].options[choice[k]], tall ? 30 : 52);
    const v = textPlane(text, { size: 38, weight: 500, color: '#15331f', height: 0.3, pad: 4, align: 'left' });
    const maxW = W - KEYW - 0.8;
    const s = Math.min(1, maxW / v.geometry.parameters.width, (H - 0.12) / v.geometry.parameters.height);
    v.scale.setScalar(s);
    v.position.set(-W / 2 + KEYW + 0.4 + (v.geometry.parameters.width * s) / 2, 0, 0.22);
    r.g.add(v);
    r.value = v;
    r.mark.visible = false;
  }

  function select(k) {
    if (ctx.over || ctx.busy) return;
    sel = k;
    rows.forEach((r, j) => {
      r.body.material = candyMat(j === k ? 0xfff1c2 : C.white);
      r.g.position.z = j === k ? 0.25 : 0;
    });
    optGroup.innerHTML = `<span class="glabel">${fields[k].key}:</span>`;
    fields[k].options.forEach((o, j) => {
      ctx.ui.button(o.length > 60 ? o.slice(0, 57) + '…' : o, () => pick(k, j), { parent: optGroup, cls: `small ${j === choice[k] ? 'green' : 'ghost'}`, cost: j === choice[k] ? 0 : 1, title: o });
    });
    ctx.status(`Line <b>${k + 1}</b> of ${fields.length} selected · click another line in the scene to edit it · <b>Check</b> shows which lines are still wrong`);
  }

  function pick(k, j) {
    if (choice[k] === j) return;
    choice[k] = j;
    ctx.sound.pop();
    drawValue(k);
    select(k);
  }

  function check() {
    const wrong = fields.map((f, k) => (choice[k] !== f.answer ? k : -1)).filter((k) => k >= 0);
    rows.forEach((r, k) => {
      r.mark.visible = true;
      setLabel(r.mark, wrong.includes(k) ? '❌' : '✅', { size: 50, height: 0.42, pad: 4 });
    });
    if (!wrong.length) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0, 0.6), PALETTE, 30, 4);
      ctx.win({ note: fields.map((f) => `<b>${f.key}</b>: ${f.why}`).join('<br>') });
    } else {
      ctx.sound.thud();
      ctx.toast(`${wrong.length} line${wrong.length > 1 ? 's are' : ' is'} still not right.`, 'bad');
      select(wrong[0]);
    }
  }
}
