// The share sheet for certificates and progress snapshots: a preview of the image, plus
// download, copy, "post on LinkedIn" (text ready + image to attach) and the phone's share menu.
import { esc } from './utils.js';
import { downloadBlob } from './cert-image.js';

// LinkedIn's post composer, opened with the text already filled in
export const linkedInPostURL = (text) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

let current = null; // { blob, url, file, filename, title, text, downloaded, onAction }

export async function openShareSheet({ UI, kicker, title, color, canvas, filename, alt, text, intro = '', extra = '', note = '', onAction = null }) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (current) URL.revokeObjectURL(current.url);
  const file = new File([blob], filename, { type: 'image/png' });
  current = { blob, url: URL.createObjectURL(blob), file, filename, title, text, downloaded: false, onAction };
  const canNative = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const canCopy = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
  UI.showRawPanel({
    kicker, title, color,
    html: `${intro}
      <figure class="share-preview"><img src="${current.url}" alt="${esc(alt || title)}" /></figure>
      <div class="share-actions">
        ${canNative ? '<button class="btn primary" data-share="native">📤 Share…</button>' : ''}
        <button class="btn ${canNative ? '' : 'primary'} li-post" data-share="linkedin"><b class="li-mark">in</b> Post on LinkedIn</button>
        <button class="btn" data-share="download">⬇ Download image</button>
        ${canCopy ? '<button class="btn" data-share="copy">📋 Copy image</button>' : ''}
        ${extra}
      </div>
      <p class="share-status" id="share-status" role="status" aria-live="polite"></p>
      <label class="share-text"><span>Your post (edit it as you like)</span><textarea id="share-text" rows="8" spellcheck="true">${esc(text)}</textarea></label>
      <p class="muted">“Post on LinkedIn” copies this text, saves the image and opens LinkedIn's post box. Add the image there with the photo button (or press Ctrl+V after “Copy image”), check the text and press Post. ${note}</p>`,
  });
}

function status(msg) {
  const el = document.getElementById('share-status');
  if (el) el.textContent = msg;
}
function download() {
  downloadBlob(current.blob, current.filename);
  current.downloaded = true;
}

// Called from the page's click handler; returns true when it handled the click
export function handleShareClick(target) {
  const b = target.closest('[data-share]');
  if (!b || !current) return false;
  const kind = b.dataset.share;
  const text = document.getElementById('share-text')?.value || current.text;
  if (kind === 'download') {
    download();
    status('⬇ Saved to your downloads.');
  } else if (kind === 'copy') {
    navigator.clipboard.write([new ClipboardItem({ 'image/png': current.blob })]).then(
      () => status('📋 Image copied. Paste it into a LinkedIn post with Ctrl+V.'),
      () => status('This browser would not copy the image. Use “Download image” instead.')
    );
  } else if (kind === 'linkedin') {
    window.open(linkedInPostURL(text), '_blank', 'noopener');
    navigator.clipboard?.writeText(text).catch(() => {});
    if (!current.downloaded) download();
    status('✔ Post text copied · ✔ Image saved · LinkedIn is opening in a new tab. Add the image with the photo button, then press Post.');
  } else if (kind === 'native') {
    navigator.share({ files: [current.file], title: current.title, text }).catch(() => {});
  } else if (kind === 'link') {
    navigator.clipboard?.writeText(b.dataset.link).then(
      () => status('🔗 Link copied.'),
      () => status(b.dataset.link)
    );
  } else return false;
  current.onAction?.(kind);
  return true;
}
