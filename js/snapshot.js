// Explorer snapshot: the current 3D view with a scorecard (name, level, points, progress)
// and a QR code back to the island, ready to share.
import { drawQR } from './qr.js';

const SANS = '"Space Grotesk", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
function fitFont(g, text, weight, size, family, maxW) {
  do g.font = `${weight} ${size}px ${family}`; while (g.measureText(text).width > maxW && (size -= 2) > 18);
}

// shot: a canvas with the rendered scene. info: { name, level, title, xp, inLevel, perLevel, stats: [[icon, label, n, of]], date, url, host }
export function composeSnapshot(shot, info) {
  const W = 1600, H = 900;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  // the scene, cropped to fill
  const s = Math.max(W / shot.width, H / shot.height);
  const sw = shot.width * s, sh = shot.height * s;
  g.drawImage(shot, (W - sw) / 2, (H - sh) / 2, sw, sh);
  // readable left side
  const fade = g.createLinearGradient(0, 0, 900, 0);
  fade.addColorStop(0, 'rgba(7, 11, 26, 0.9)');
  fade.addColorStop(0.65, 'rgba(7, 11, 26, 0.55)');
  fade.addColorStop(1, 'rgba(7, 11, 26, 0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, 900, H);

  g.textAlign = 'left';
  g.fillStyle = '#fbbf24';
  g.font = `700 22px ${MONO}`;
  g.fillText('☁️  CLOUD ISLAND · EXPLORER SNAPSHOT', 70, 92);
  g.fillStyle = '#f8fafc';
  fitFont(g, info.name, 700, 66, SANS, 720);
  g.fillText(info.name, 70, 170);

  // level pill
  const pill = `LV ${info.level} · ${info.title}`;
  g.font = `700 30px ${SANS}`;
  const pw = g.measureText(pill).width + 44;
  const pg = g.createLinearGradient(70, 0, 70 + pw, 0);
  pg.addColorStop(0, '#5eead4');
  pg.addColorStop(1, '#a78bfa');
  g.fillStyle = pg;
  roundRect(g, 70, 200, pw, 52, 26);
  g.fill();
  g.fillStyle = '#04121a';
  g.fillText(pill, 92, 237);

  // points
  g.fillStyle = '#fbbf24';
  g.font = `800 112px ${SANS}`;
  const pts = info.xp.toLocaleString('en-US');
  g.fillText(pts, 66, 372);
  const w = g.measureText(pts).width;
  g.fillStyle = '#e2e8f0';
  g.font = `600 40px ${SANS}`;
  g.fillText('points', 66 + w + 16, 372);
  // progress to the next level
  g.fillStyle = 'rgba(255, 255, 255, 0.14)';
  roundRect(g, 70, 400, 640, 16, 8);
  g.fill();
  const fill = g.createLinearGradient(70, 0, 710, 0);
  fill.addColorStop(0, '#fbbf24');
  fill.addColorStop(1, '#f472b6');
  g.fillStyle = fill;
  roundRect(g, 70, 400, Math.max(16, 640 * (info.inLevel / info.perLevel)), 16, 8);
  g.fill();
  g.fillStyle = '#94a3b8';
  g.font = `500 22px ${MONO}`;
  g.fillText(`${info.inLevel} / ${info.perLevel} XP to LV ${info.level + 1}`, 70, 448);

  // stats grid
  info.stats.forEach(([icon, label, n, of], i) => {
    const x = 70 + (i % 2) * 330, y = 490 + Math.floor(i / 2) * 104;
    g.fillStyle = 'rgba(255, 255, 255, 0.07)';
    roundRect(g, x, y, 310, 88, 16);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = `400 38px ${SANS}`;
    g.fillText(icon, x + 18, y + 58);
    g.fillStyle = n >= of ? '#4ade80' : '#f8fafc';
    g.font = `700 36px ${SANS}`;
    g.fillText(`${n}/${of}`, x + 78, y + 46);
    g.fillStyle = '#94a3b8';
    g.font = `500 20px ${SANS}`;
    g.fillText(label, x + 78, y + 74);
  });
  g.fillStyle = '#94a3b8';
  g.font = `500 20px ${MONO}`;
  g.fillText(info.date, 70, H - 52);

  // "play it yourself" + QR (bottom right)
  const bx = W - 520, by = H - 230;
  g.fillStyle = 'rgba(7, 11, 26, 0.78)';
  roundRect(g, bx, by, 470, 190, 22);
  g.fill();
  const q = 150;
  drawQR(g, info.url, W - 50 - 20 - q, by + 20, q);
  g.textAlign = 'right';
  g.fillStyle = '#f8fafc';
  g.font = `700 28px ${SANS}`;
  g.fillText('Can you beat this?', W - 50 - 20 - q - 20, by + 74);
  g.fillStyle = '#5eead4';
  fitFont(g, info.host, 600, 20, MONO, 260);
  g.fillText(info.host, W - 50 - 20 - q - 20, by + 108);
  g.fillStyle = '#94a3b8';
  g.font = `500 18px ${SANS}`;
  g.fillText('3D portfolio by', W - 50 - 20 - q - 20, by + 142);
  g.fillText('Yumnam Momojit Singh', W - 50 - 20 - q - 20, by + 166);
  return cv;
}
