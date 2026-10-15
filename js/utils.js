import * as THREE from 'three';

export const FONT = "'Space Grotesk', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function drawCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return canvasTexture(c);
}

// Word-wraps `text` inside maxWidth; returns the y after the last line.
export function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines === maxLines - 1) {
        ctx.fillText(line + '…', x, y);
        return y + lineHeight;
      }
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineHeight;
}

// A floating billboard label (always faces the camera).
export function makeLabel(text, { sub = '', accent = '#5eead4', height = 1 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const tFont = `700 64px ${FONT}`;
  const sFont = `500 32px ${MONO}`;
  ctx.font = tFont;
  let w = ctx.measureText(text).width;
  if (sub) {
    ctx.font = sFont;
    w = Math.max(w, ctx.measureText(sub).width);
  }
  const pad = 46;
  c.width = Math.ceil(w + pad * 2);
  c.height = sub ? 176 : 116;

  ctx.fillStyle = 'rgba(7, 11, 26, 0.8)';
  ctx.beginPath();
  ctx.roundRect(4, 4, c.width - 8, c.height - 8, 30);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = tFont;
  ctx.fillStyle = '#eef2f8';
  ctx.fillText(text, c.width / 2, sub ? 66 : c.height / 2 + 3);
  if (sub) {
    ctx.font = sFont;
    ctx.fillStyle = accent;
    ctx.fillText(sub, c.width / 2, 130);
  }

  const mat = new THREE.SpriteMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(mat);
  const h = height * (c.height / 116);
  s.scale.set((h * c.width) / c.height, h, 1);
  s.renderOrder = 10;
  return s;
}

export function dampAngle(current, target, lambda, dt) {
  let d = target - current;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return current + d * (1 - Math.exp(-lambda * dt));
}
