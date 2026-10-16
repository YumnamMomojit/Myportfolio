// The island manager. Each island's adventure lives in its own module (js/islands/<id>.js),
// downloaded only when the island is unlocked and you come near, so the main page stays light.
// An island with a trial seals the way home behind you until you solve it; the quest card on
// the HUD shows the steps, the briefing explains the purpose, and hints help when you're stuck.
import * as THREE from 'three';
import { ISLANDS } from '../archipelago.js';
import { mulberry32, esc } from '../utils.js';

export function createIslandManager(ctx) {
  const { W, player, UI } = ctx;
  const S = ctx.state;
  const meta = Object.fromEntries(ISLANDS.map((I) => [I.id, I]));
  const rt = {}, pending = {}, failed = {};
  let shownQuest = '';

  const unlocked = (I) => ctx.level() >= I.req && (I.id !== 'mystery' || S().riddles.includes('mystery'));
  const solved = (id) => S().done.includes(meta[id].task);
  const sealed = (id) => !!rt[id]?.trial && !solved(id);
  const isleAt = (x, z, pad = 0) => ISLANDS.find((I) => Math.hypot(x - I.c[0], z - I.c[1]) < I.r - pad) || null;
  // where you stand when you (re)appear on an island: by its welcome sign, facing inland
  function arrival(I) {
    const L = Math.hypot(I.c[0], I.c[1]), k = I.r * 0.45 - 3;
    const x = I.c[0] - (I.c[0] / L) * k, z = I.c[1] - (I.c[1] / L) * k;
    return { x, z, yaw: Math.atan2(I.c[0] - x, I.c[1] - z) };
  }

  // ------------------------------------------------------------ loading
  function ensure(id) {
    if (rt[id] || failed[id]) return Promise.resolve(rt[id] || null);
    if (pending[id]) return pending[id];
    const I = meta[id];
    W.shrouds[id]?.setLoading(true);
    pending[id] = I.load()
      .then((mod) => {
        rt[id] = mod.default(kitFor(I)) || {};
        W.shrouds[id]?.reveal();
        return rt[id];
      })
      .catch((err) => {
        console.error(`Could not load ${I.name}`, err);
        failed[id] = true;
        W.shrouds[id]?.setLoading(false);
        if (S().stranded === id) {
          S().stranded = null;
          ctx.persist();
        }
        ctx.toast(`${I.name} could not load`, 'Check your connection, then reload the page', '⚠️');
        return null;
      });
    return pending[id];
  }

  // what an island module gets to build its adventure with
  function kitFor(I) {
    let seed = 0;
    for (const ch of I.id) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    return {
      ...ctx, I,
      rng: mulberry32(seed),
      circle: W.circle,
      interact: (o) => W.interactables.push({ y: 0, r: 3, ...o }),
      // a save slot for this island's own progress
      data: () => ((S().isles ||= {})[I.id] ||= {}),
      // call when the island's trial is complete: the task is ticked off (certificate + points follow)
      solve: () => ctx.progress(I.task, 1),
      isSolved: () => solved(I.id),
      openBriefing: () => openBriefing(I.id),
    };
  }

  // ------------------------------------------------------------ every frame
  function update(dt, t) {
    const p = player.pos;
    // load islands you can reach once you come near; the rest stay in the mist and cost nothing
    for (const I of ISLANDS) {
      if (!rt[I.id] && !pending[I.id] && !failed[I.id] && unlocked(I) && Math.hypot(p.x - I.c[0], p.z - I.c[1]) < I.r + 80) ensure(I.id);
    }
    // arriving on an island with an unsolved trial seals the way home
    const deep = ctx.riding() ? null : isleAt(p.x, p.z, 5);
    if (deep && sealed(deep.id) && S().stranded !== deep.id) {
      S().stranded = deep.id;
      ctx.persist();
      ctx.toast(`🔒 ${deep.name}: the way home is sealed`, `Complete ${deep.trial} to leave. Open 📜 Briefing in the quest card.`, deep.icon);
    }
    const st = S().stranded;
    if (st && rt[st] && !sealed(st)) {
      S().stranded = null;
      ctx.persist();
      freed(meta[st]);
    }
    for (const s of W.seals) s.set(S().stranded === s.isle);
    syncTransportLabels();
    for (const r of Object.values(rt)) r.update?.(dt, t);
    // first visit: the island briefing
    if (deep && rt[deep.id] && rt[deep.id].briefing !== false && !UI.isOverlayOpen()) {
      const seen = (S().briefed ||= []);
      if (!seen.includes(deep.id)) {
        seen.push(deep.id);
        ctx.persist();
        openBriefing(deep.id);
      }
    }
    renderQuest(isleAt(p.x, p.z));
  }

  function freed(I) {
    ctx.sound.fanfare?.();
    ctx.toast(`🔓 The way home is open`, `${I.trial} complete. Explore ${I.name} as long as you like.`, I.icon);
    for (const s of W.seals) if (s.isle === I.id) ctx.bursts.spawn(new THREE.Vector3(s.x, 1.5, s.z), I.color, 30, 5, { up: 3 });
  }

  // the "board back home" buttons at island stations say why they're locked
  const transportItems = {};
  function syncTransportLabels() {
    for (const tr of Object.values(W.transports)) {
      const it = (transportItems[tr.id] ||= W.interactables.find((i) => i.id === `travel:${tr.id}:1`));
      if (!it) continue;
      it.baseLabel ||= it.label;
      it.label = S().stranded === tr.isle ? `🔒 Sealed until you complete ${meta[tr.isle].trial}` : it.baseLabel;
    }
  }

  // ------------------------------------------------------------ HUD quest card
  function renderQuest(I) {
    const r = I && rt[I.id];
    let q = null;
    if (r?.quest) {
      q = { id: I.id, icon: I.icon, title: r.title || I.name, color: I.color, steps: r.quest(), sealed: sealed(I.id), solved: r.trial ? solved(I.id) : false, hints: !!r.hints?.length };
    }
    const key = q ? JSON.stringify(q) : '';
    if (key === shownQuest) return;
    shownQuest = key;
    UI.islandQuest(q);
  }

  // ------------------------------------------------------------ panels
  function openBriefing(id) {
    const I = meta[id], r = rt[id];
    if (!r) return false;
    const cert = ctx.certTitle(I.cert);
    UI.showRawPanel({
      kicker: `${I.icon} ${I.name} · island briefing`, title: r.title || I.name, color: I.color,
      html: `<p class="lead">${esc(I.purpose)}</p>
        <div class="brief">
          <div><h3>🎯 Your mission</h3>${r.mission || ''}</div>
          <div><h3>🧠 You will learn</h3><ul>${I.learn.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
        </div>
        ${r.trial
          ? solved(id)
            ? '<div class="callout done-callout">✔ Trial complete: the way home is open. Explore as long as you like.</div>'
            : `<div class="callout">🔒 <b>The way home is sealed</b> until you complete <b>${esc(I.trial)}</b>. Stuck? Press 💡 Hint in the quest card.</div>`
          : ''}
        <p class="muted">Reward: 🎓 <b>${esc(cert)}</b> certificate, plus points for every step.</p>
        ${r.extraBriefing || ''}`,
    });
    ctx.sound.open();
    return true;
  }

  function openHint(id) {
    const I = meta[id], r = rt[id];
    if (!r?.hints?.length) return;
    const used = (S().hints ||= {});
    const n = Math.min(r.hints.length, (used[id] || 0) + 1);
    used[id] = n;
    ctx.persist();
    UI.showRawPanel({
      kicker: `${I.icon} ${I.name} · hints`, title: `💡 Hint ${n} of ${r.hints.length}`, color: I.color,
      html: `${r.hints.slice(0, n).map((h, i) => `<p class="${i === n - 1 ? 'lead' : 'muted'}">${i + 1}. ${h}</p>`).join('')}
        ${n < r.hints.length ? `<button class="btn small" data-isle-hint="${id}">Another hint</button>` : '<p class="muted">That was the last hint. You can do it!</p>'}`,
    });
    ctx.sound.open();
  }

  return {
    ensure,
    update,
    openBriefing,
    arrival: (id) => arrival(meta[id]),
    loaded: (id) => !!rt[id],
    runtime: (id) => rt[id],
    stranded: () => S().stranded || null,
    isSealed: (id) => sealed(id),
    // E on an island object: '<island>:<thing>'
    interact(id) {
      const r = rt[id.split(':')[0]];
      return !!r?.interact?.(id);
    },
    handleClick(target) {
      const b = target.closest('[data-isle-brief]');
      if (b) return openBriefing(b.dataset.isleBrief), true;
      const h = target.closest('[data-isle-hint]');
      if (h) return openHint(h.dataset.isleHint), true;
      for (const r of Object.values(rt)) if (r.handleClick?.(target)) return true;
      return false;
    },
    vehicleAction() {
      for (const r of Object.values(rt)) r.vehicleAction?.();
    },
    // after a fall: back to your last safe spot, unless that's off the island you're stranded on
    respawnPoint(last) {
      const id = S().stranded;
      if (!id) return null;
      const I = meta[id];
      return Math.hypot(last.x - I.c[0], last.z - I.c[1]) < I.r ? null : arrival(I);
    },
    // on page load: if you left while stranded, you're back on that island
    restore() {
      const id = S().stranded;
      if (!id) return null;
      const I = meta[id];
      if (!I || !unlocked(I) || solved(id)) {
        S().stranded = null;
        return null;
      }
      ensure(id);
      return arrival(I);
    },
  };
}
