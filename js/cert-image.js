// Draws a certificate as a 2000×1414 image (with its QR code), and saves images.
// Loaded only when a certificate is opened, so it costs nothing until then.
import { drawQR } from './qr.js';

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
  return y + lh;
}
// shrink a font until the text fits
function fit(g, text, weight, size, family, maxW) {
  do g.font = `${weight} ${size}px ${family}`; while (g.measureText(text).width > maxW && (size -= 2) > 20);
}

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Space Grotesk", sans-serif';

export function renderCertificate({ name, cert, date, code, grand = false, list = [], url = '' }) {
  const W = 2000, H = 1414;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const gold = '#b8892e', ink = '#1f2937', muted = '#4b5563', accent = grand ? '#b8892e' : '#0f766e';
  // paper
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fffdf6');
  bg.addColorStop(1, '#f5efe0');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // borders
  g.strokeStyle = accent;
  g.lineWidth = 18;
  g.strokeRect(40, 40, W - 80, H - 80);
  g.strokeStyle = gold;
  g.lineWidth = 3;
  g.strokeRect(78, 78, W - 156, H - 156);
  for (const [x, y] of [[78, 78], [W - 78, 78], [78, H - 78], [W - 78, H - 78]]) {
    g.fillStyle = gold;
    g.beginPath();
    g.arc(x, y, 16, 0, Math.PI * 2);
    g.fill();
  }
  g.textAlign = 'center';
  g.fillStyle = accent;
  g.font = `700 34px ${SANS}`;
  g.fillText('☁️  CLOUD ISLAND ACADEMY  ☁️', W / 2, 190);
  g.fillStyle = ink;
  g.font = `700 ${grand ? 92 : 88}px ${SERIF}`;
  g.fillText(grand ? 'Grand Certificate of Achievement' : 'Certificate of Achievement', W / 2, 320);
  g.font = `italic 40px ${SERIF}`;
  g.fillStyle = muted;
  g.fillText('This certifies that', W / 2, 420);
  g.fillStyle = ink;
  fit(g, name, 700, 96, SERIF, 1500);
  g.fillText(name, W / 2, 545);
  g.strokeStyle = gold;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W / 2 - 520, 580);
  g.lineTo(W / 2 + 520, 580);
  g.stroke();
  g.font = `italic 40px ${SERIF}`;
  g.fillStyle = muted;
  g.fillText(grand ? (list.length ? 'has earned ten or more Cloud Island certificates, including' : 'has been awarded the') : 'has successfully completed', W / 2, 660);
  let y;
  if (grand && list.length) {
    g.font = `600 34px ${SANS}`;
    g.fillStyle = ink;
    const cols = 2, colW = 760;
    list.slice(0, 10).forEach((c, i) => {
      const cx = W / 2 + (i % cols === 0 ? -colW / 2 : colW / 2);
      g.fillText(`${c.icon} ${c.title}`, cx, 740 + Math.floor(i / cols) * 54);
    });
    y = 740 + Math.ceil(Math.min(list.length, 10) / cols) * 54;
    if (list.length > 10) {
      g.font = `italic 30px ${SERIF}`;
      g.fillStyle = muted;
      g.fillText(`and ${list.length - 10} more`, W / 2, y);
      y += 50;
    }
  } else {
    g.fillStyle = accent;
    fit(g, `${cert.icon}  ${cert.title}`, 700, 70, SANS, 1500);
    g.fillText(`${cert.icon}  ${cert.title}`, W / 2, 760);
    g.fillStyle = '#374151';
    g.font = `500 36px ${SANS}`;
    y = wrap(g, cert.skill, W / 2, 836, 1400, 50);
  }
  // the skills practised: what this certificate tells an employer
  if (cert?.skills?.length && y < 1000) {
    g.fillStyle = accent;
    fit(g, `Skills: ${cert.skills.join('  ·  ')}`, 600, 30, SANS, 1400);
    g.fillText(`Skills: ${cert.skills.join('  ·  ')}`, W / 2, y + 8);
  }

  // signature block (left)
  g.textAlign = 'left';
  g.strokeStyle = '#6b7280';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(200, 1095);
  g.lineTo(760, 1095);
  g.stroke();
  g.fillStyle = ink;
  g.font = `600 34px ${SANS}`;
  g.fillText('Yumnam Momojit Singh', 200, 1140);
  g.font = `500 24px ${SANS}`;
  g.fillStyle = muted;
  g.fillText('Creator, Cloud Island · Assistant Professor & Researcher', 200, 1178);
  g.fillText(`Issued ${date}`, 200, 1216);
  g.fillText(`Certificate ID ${code}`, 200, 1254);

  // seal (centre)
  const sx = W / 2, sy = 1135;
  g.fillStyle = grand ? '#d4a63a' : '#14b8a6';
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 100 : 118;
    g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  }
  g.fill();
  g.fillStyle = '#fffdf6';
  g.beginPath();
  g.arc(sx, sy, 78, 0, Math.PI * 2);
  g.fill();
  g.textAlign = 'center';
  g.fillStyle = accent;
  g.font = `700 48px ${SANS}`;
  g.fillText(grand ? '★' : 'CI', sx, sy + 8);
  g.font = `700 18px ${SANS}`;
  g.fillText(grand ? 'GRAND' : 'ACADEMY', sx, sy + 40);

  // QR code to the public check page (right)
  if (url) {
    const q = 230, qx = W - 200 - q, qy = 1005;
    g.fillStyle = '#ffffff';
    g.fillRect(qx - 6, qy - 6, q + 12, q + 12);
    g.strokeStyle = gold;
    g.lineWidth = 2;
    g.strokeRect(qx - 6, qy - 6, q + 12, q + 12);
    drawQR(g, url, qx, qy, q);
    g.fillStyle = muted;
    g.font = `600 22px ${SANS}`;
    g.fillText('Scan to verify', qx + q / 2, qy + q + 36);
  }
  g.font = `italic 21px ${SERIF}`;
  g.fillStyle = '#6b7280';
  g.fillText('Awarded for interactive learning on Cloud Island, the 3D portfolio of Yumnam Momojit Singh. Not an accredited academic qualification.', W / 2, H - 100);
  return cv;
}

export function downloadCanvas(cv, filename) {
  cv.toBlob((blob) => downloadBlob(blob, filename), 'image/png');
}
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
