// Connect every AI app to every tool: one custom connector per pair, or MCP on each side.
// params: { apps: [names], tools: [names] }
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, C, PALETTE } from '../../../shared/kit.js';

export default function wiring(ctx) {
  const { stage, params } = ctx;
  const tall = innerHeight > innerWidth; // phone in portrait: columns closer together
  const X = tall ? 2.3 : 5.2;
  const NODE_W = tall ? 2.4 : 3.2;
  const apps = params.apps.map((name, i) => ({ name, mcp: false, pos: new THREE.Vector3(-X, (params.apps.length - 1) / 2 * 1.9 - i * 1.9, 0) }));
  const tools = params.tools.map((name, i) => ({ name, mcp: false, pos: new THREE.Vector3(X, (params.tools.length - 1) / 2 * 1.6 - i * 1.6, 0) }));
  const custom = new Set();
  const hub = new THREE.Vector3(0, 0, 0);
  let selApp = -1;

  const appObjs = apps.map((a, i) => node(a, C.blue, () => pickApp(i)));
  const toolObjs = tools.map((t, j) => node(t, C.orange, () => pickTool(j)));
  const hubObj = candy('ball', C.green, tall ? 0.9 : 1.4);
  hubObj.visible = false;
  const hubTag = label('MCP', { size: 44, weight: 700, color: '#ffffff', stroke: '#13753f', height: 0.4, pad: 4 });
  hubTag.position.set(0, 1.05, 0.3);
  hubTag.visible = false;
  stage.root.add(hubObj, hubTag);
  const lines = new THREE.Group();
  stage.root.add(lines);

  function node(item, color, fn) {
    const g = new THREE.Group();
    g.position.copy(item.pos);
    const body = box(NODE_W, 0.9, 0.4, color, 0.22);
    const t = textPlane(item.name, { size: 40, weight: 700, color: '#ffffff', stroke: 'rgba(18,48,29,0.45)', height: 0.32, pad: 4 });
    t.scale.setScalar(Math.min(1, (NODE_W - 0.3) / t.geometry.parameters.width));
    t.position.z = 0.21;
    const plug = label('🔌', { size: 40, height: 0.36, pad: 2 });
    plug.visible = false;
    plug.position.set(item.pos.x < 0 ? NODE_W / 2 + 0.1 : -NODE_W / 2 - 0.1, 0.5, 0.3);
    g.add(body, t, plug);
    stage.root.add(g);
    stage.clickable(g, fn);
    return { g, body, plug };
  }

  stage.frame({ target: [0, 0, 0], w: X * 2 + NODE_W + 0.6, h: 7.4, yaw: 0, pitch: 0.1 });

  const g1 = ctx.ui.group('Add an MCP client to:');
  const clientBtns = apps.map((a, i) => ctx.ui.button(a.name, () => addClient(i), { parent: g1, cls: 'blue small', cost: 1 }));
  ctx.ui.break();
  const g2 = ctx.ui.group('Add an MCP server for:');
  const serverBtns = tools.map((t, j) => ctx.ui.button(t.name, () => addServer(j), { parent: g2, cls: 'orange small', cost: 1 }));
  const connected = (i, j) => custom.has(`${i}-${j}`) || (apps[i].mcp && tools[j].mcp);
  const count = () => apps.reduce((s, _, i) => s + tools.filter((_, j) => connected(i, j)).length, 0);
  draw();

  function pickApp(i) {
    if (ctx.over || ctx.busy) return;
    selApp = selApp === i ? -1 : i;
    ctx.sound.pickup();
    draw();
  }

  function pickTool(j) {
    if (ctx.over || ctx.busy || selApp < 0) return;
    if (connected(selApp, j)) {
      ctx.toast('Those two are already connected.', 'hint');
      return;
    }
    if (!ctx.move()) return;
    custom.add(`${selApp}-${j}`);
    ctx.sound.pop();
    draw();
    check();
  }

  function addClient(i) {
    apps[i].mcp = true;
    clientBtns[i].disabled = true;
    ctx.sound.collect();
    draw();
    check();
  }

  function addServer(j) {
    tools[j].mcp = true;
    serverBtns[j].disabled = true;
    ctx.sound.collect();
    draw();
    check();
  }

  function draw() {
    lines.children.forEach((l) => l.geometry.dispose());
    lines.clear();
    const seg = (a, b, color) => {
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      lines.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
    };
    const anyMcp = apps.some((a) => a.mcp) || tools.some((t) => t.mcp);
    hubObj.visible = hubTag.visible = anyMcp;
    apps.forEach((a, i) => {
      appObjs[i].body.material = candyMat(i === selApp ? C.yellow : C.blue);
      appObjs[i].plug.visible = a.mcp;
      if (a.mcp) seg(a.pos.clone().setX(a.pos.x + NODE_W / 2), hub, 0x1c9e58);
    });
    tools.forEach((t, j) => {
      toolObjs[j].plug.visible = t.mcp;
      if (t.mcp) seg(hub, t.pos.clone().setX(t.pos.x - NODE_W / 2), 0x1c9e58);
    });
    custom.forEach((key) => {
      const [i, j] = key.split('-').map(Number);
      seg(apps[i].pos.clone().setX(apps[i].pos.x + NODE_W / 2), tools[j].pos.clone().setX(tools[j].pos.x - NODE_W / 2), 0xff9f1c);
    });
    const total = apps.length * tools.length;
    ctx.status(`<b>${count()}</b> of ${total} app–tool pairs connected · ${selApp >= 0 ? `now click a tool to build a custom connector for ${apps[selApp].name}` : 'click an app then a tool for a custom connector, or add MCP parts below'}`);
  }

  function check() {
    if (count() === apps.length * tools.length) {
      ctx.sound.gem();
      stage.fx.burst(hub.clone(), PALETTE, 30, 4);
      ctx.win({ note: `${custom.size} custom connector${custom.size === 1 ? '' : 's'} and ${apps.filter((a) => a.mcp).length + tools.filter((t) => t.mcp).length} MCP parts.` });
    }
  }
}
