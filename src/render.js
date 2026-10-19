// Items use normalized coords (x, y = centre; size = base unit as a fraction of H),
// so the preview and the full-resolution export lay out identically.

// Centre-crop the image to the W×H aspect ratio (CSS object-fit: cover).
export function coverRect(iw, ih, W, H) {
  const s = Math.max(W / iw, H / ih);
  const sw = W / s;
  const sh = H / s;
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh };
}

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

// Card looks. `fill` is a colour or [offset, colour] gradient stops; `accent` marks the title and ticks.
export const WIDGET_STYLES = ['glass', 'dark', 'paper', 'outline', 'minimal', 'neon', 'gradient', 'sticker'];
const LOOK = {
  glass: {
    fill: [
      [0, 'rgba(255, 255, 255, 0.34)'],
      [1, 'rgba(255, 255, 255, 0.12)'],
    ],
    ink: '#ffffff',
    stroke: 'rgba(255, 255, 255, 0.45)',
    accent: '#ffffff',
  },
  dark: {
    fill: [
      [0, 'rgba(30, 30, 36, 0.86)'],
      [1, 'rgba(10, 10, 12, 0.74)'],
    ],
    ink: '#ffffff',
    stroke: 'rgba(255, 255, 255, 0.08)',
    accent: '#a5b4fc',
  },
  paper: { fill: 'rgba(255, 255, 255, 0.97)', ink: '#17171a', stroke: null, accent: '#6366f1' },
  outline: { fill: null, ink: '#ffffff', stroke: 'rgba(255, 255, 255, 0.9)', accent: '#ffffff' },
  // No panel: text floats on the photo with a soft shadow, so it reads as part of the wallpaper.
  minimal: { fill: null, ink: '#ffffff', stroke: null, accent: '#ffffff', textShadow: true },
  neon: {
    fill: 'rgba(8, 10, 24, 0.72)',
    ink: '#e0faff',
    stroke: '#22d3ee',
    strokeW: 0.025,
    glow: 'rgba(34, 211, 238, 0.8)',
    accent: '#22d3ee',
  },
  gradient: {
    fill: [
      [0, '#6366f1'],
      [1, '#ec4899'],
    ],
    ink: '#ffffff',
    stroke: null,
    accent: '#fde68a',
  },
  // White card with a thick white border and a drop shadow, like a sticker stuck on the photo.
  sticker: { fill: '#ffffff', ink: '#17171a', stroke: '#ffffff', strokeW: 0.05, accent: '#f472b6' },
};

const CARD_KINDS = ['day', 'gym', 'week'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Week tasks sit on pastel pills, cycled by position; today's date is circled in red.
const CHIP_COLORS = ['#fde68a', '#bbf7d0', '#fbcfe8', '#bfdbfe'];
const TODAY_RED = '#ef4444';

// A task is one line. A leading "[x] " marks it done (shown only when the widget has checkboxes).
export function parseTask(text) {
  const m = /^\[x\]\s*/i.exec(text);
  return { done: Boolean(m), label: text.slice(m ? m[0].length : 0) };
}

export function toggleTask(text) {
  const { done, label } = parseTask(text);
  return done ? label : `[x] ${label}`;
}

// Week notes: seven days, each a list of tasks. Older saves stored one string per day.
export function dayTasks(v) {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

// Keeps each task's index in the saved list, so a tap can find it again.
function visibleRows(list) {
  return list.map((text, index) => ({ text, index })).filter((r) => r.text.trim());
}

// Places one task in its column. Checkbox and text move together for left, centre or right.
function placeCell(ctx, { text, index, day, colL, colW, y, fs, bs, checks, align, chip }) {
  const { label } = parseTask(text);
  ctx.font = `500 ${fs}px ${FONT}`;
  const boxW = checks ? bs * 1.6 : 0;
  const pad = chip ? fs * 0.45 : 0;
  const textW = Math.min(ctx.measureText(label).width, colW - boxW - pad * 2);
  const blockW = boxW + textW + pad * 2;
  const x =
    align === 'center' ? colL + (colW - blockW) / 2 : align === 'right' ? colL + colW - blockW : colL;
  return { day, index, text, x, y, fs, bs, boxW, pad, chip, color: CHIP_COLORS[index % CHIP_COLORS.length], maxW: colW - boxW - pad * 2 };
}

// Card geometry. Text is sized against the card width so task columns keep room between them.
function cardLayout(ctx, W, H, it) {
  const u = it.size * H;
  const isWeek = it.kind === 'week';
  const pad = u * 0.5;
  const titleSize = u * 0.36;
  const titleH = titleSize * 1.5 + u * 0.14; // accent bar sits above the title
  const lineSize = u * 0.28;
  const lineH = lineSize * 1.7;
  const align = it.align ?? 'left';
  const checks = Boolean(it.checks);
  const days = isWeek ? Array.from({ length: 7 }, (_, i) => visibleRows(dayTasks(it.notes?.[i]))) : null;
  const rows = isWeek ? [] : visibleRows(it.lines ?? []);
  const busiest = isWeek ? Math.max(0, ...days.map((d) => d.length)) : rows.length;
  const contentH = isWeek ? u * 1.0 + busiest * u * 0.28 + u * 0.12 : rows.length * lineH;
  const w = u * (isWeek ? 8.4 : 7);
  const h = pad * 2 + titleH + contentH;
  const cx = it.x * W;
  const cy = it.y * H;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const left = x0 + pad;
  const right = x0 + w - pad;
  const bodyTop = y0 + pad + titleH;

  // One cell per visible task, with its position for drawing and taps.
  const cells = [];
  if (isWeek) {
    const colW = (right - left) / 7;
    const gap = colW * 0.12;
    days.forEach((list, day) =>
      list.forEach((r, k) =>
        cells.push(
          placeCell(ctx, {
            text: r.text,
            index: r.index,
            day,
            colL: left + colW * day + gap / 2,
            colW: colW - gap,
            y: bodyTop + u * 1.0 + k * u * 0.28,
            fs: u * 0.14,
            bs: u * 0.12,
            checks,
            align,
            chip: true,
          }),
        ),
      ),
    );
  } else {
    rows.forEach((r, k) =>
      cells.push(
        placeCell(ctx, {
          text: r.text,
          index: r.index,
          day: null,
          colL: left,
          colW: right - left,
          y: bodyTop + (k + 0.5) * lineH,
          fs: lineSize,
          bs: lineSize * 0.9,
          checks,
          align,
        }),
      ),
    );
  }
  return { u, pad, titleSize, titleH, left, right, bodyTop, align, cells, x0, x1: x0 + w, y0, y1: y0 + h };
}

// Pixel box of an item on a W×H canvas. Shared by drawing and hit-testing.
export function layout(ctx, W, H, it, now) {
  if (CARD_KINDS.includes(it.kind)) return cardLayout(ctx, W, H, it);

  const px = it.size * H;
  const reminder = it.kind === 'reminder';
  let text = it.text ?? '';
  let font;
  if (it.kind === 'clock') {
    text = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    font = `200 ${px}px ${FONT}`;
  } else if (it.kind === 'date') {
    text = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    font = `500 ${px}px ${FONT}`;
  } else if (reminder) {
    font = `600 ${px}px ${FONT}`;
  } else {
    font = `${px}px ${EMOJI_FONT}`;
  }
  ctx.font = font;
  const padX = reminder ? px * 0.6 : 0;
  const padY = reminder ? px * 0.3 : 0;
  const w = ctx.measureText(text).width + padX * 2;
  const h = px * 1.2 + padY * 2;
  const cx = it.x * W;
  const cy = it.y * H;
  return { text, font, px, x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
}

// Widget position on the canvas. `b` is a box from layout(); returns the new normalized x / y.
// Margins are 5% of the canvas size. Axes passed as null are left unchanged.
export function alignPatch(b, W, H, { h, v }) {
  const bw = b.x1 - b.x0;
  const bh = b.y1 - b.y0;
  const patch = {};
  if (h) {
    const left = h === 'left' ? W * 0.05 : h === 'right' ? W * 0.95 - bw : (W - bw) / 2;
    patch.x = (left + bw / 2) / W;
  }
  if (v) {
    const top = v === 'top' ? H * 0.05 : v === 'bottom' ? H * 0.95 - bh : (H - bh) / 2;
    patch.y = (top + bh / 2) / H;
  }
  return patch;
}

// Distance in canvas px from each edge of the device to the widget's box.
export function edgeDistances(b, W, H) {
  return { top: Math.round(b.y0), bottom: Math.round(H - b.y1), left: Math.round(b.x0), right: Math.round(W - b.x1) };
}

// Box for UI use outside a render pass (App); needs a DOM canvas.
const scratch = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
export function boxFor(it, W, H) {
  return layout(scratch, W, H, it, new Date());
}

function drawBox(ctx, x, y, s, done, look) {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.beginPath();
  ctx.roundRect(x, y - s / 2, s, s, s * 0.28);
  if (done) {
    ctx.fillStyle = look.accent;
    ctx.fill();
  } else {
    ctx.strokeStyle = look.ink;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCell(ctx, c, look, checks) {
  const { done, label } = parseTask(c.text);
  const showDone = checks && done;
  ctx.font = `500 ${c.fs}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (checks) drawBox(ctx, c.x, c.y, c.bs, showDone, look);
  const pillX = c.x + c.boxW;
  const tx = pillX + c.pad;
  const textW = Math.min(ctx.measureText(label).width, c.maxW);
  if (c.chip) {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(pillX, c.y - c.fs * 0.75, textW + c.pad * 2, c.fs * 1.5, c.fs * 0.75);
    ctx.fill();
  }
  ctx.fillStyle = c.chip ? '#17171a' : look.ink;
  ctx.globalAlpha = showDone ? 0.5 : 0.92;
  ctx.fillText(label, tx, c.y, c.maxW);
  if (showDone) ctx.fillRect(tx, c.y, textW, Math.max(1, c.fs * 0.07));
  ctx.globalAlpha = 1;
}

function drawWeekHeader(ctx, b, ink, now) {
  const colW = (b.right - b.left) / 7;
  const today = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - today);
  const letterY = b.bodyTop + b.u * 0.14;
  const numY = b.bodyTop + b.u * 0.56;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 7; i++) {
    const cx = b.left + colW * (i + 0.5);
    ctx.font = `500 ${b.u * 0.2}px ${FONT}`;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = ink;
    ctx.fillText(DAYS[i], cx, letterY);
    ctx.globalAlpha = 1;
    if (i === today) {
      ctx.fillStyle = TODAY_RED;
      ctx.beginPath();
      ctx.arc(cx, numY, b.u * 0.19, 0, Math.PI * 2);
      ctx.fill();
    }
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    ctx.font = `600 ${b.u * 0.26}px ${FONT}`;
    ctx.fillStyle = i === today ? '#ffffff' : ink;
    ctx.fillText(String(date.getDate()), cx, numY);
  }
}

// Panel colour: a solid string, or a vertical gradient from the stop list.
function panelFill(ctx, look, b) {
  if (typeof look.fill === 'string') return look.fill;
  const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
  for (const [offset, color] of look.fill) g.addColorStop(offset, color);
  return g;
}

function drawCard(ctx, b, it, now) {
  const look = LOOK[it.style] ?? LOOK.glass;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, b.u * 0.4);
  if (look.fill) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = b.u * 0.6;
    ctx.shadowOffsetY = b.u * 0.15;
    ctx.fillStyle = panelFill(ctx, look, b);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (look.stroke) {
    ctx.save();
    if (look.glow) {
      ctx.shadowColor = look.glow;
      ctx.shadowBlur = b.u * 0.5;
    }
    ctx.strokeStyle = look.stroke;
    ctx.lineWidth = Math.max(2, b.u * (look.strokeW ?? 0.03));
    ctx.stroke();
    ctx.restore();
  }

  if (look.textShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = b.u * 0.2;
    ctx.shadowOffsetY = b.u * 0.04;
  }

  // Accent bar and title follow the same left / centre / right alignment as the tasks.
  const mid = (b.left + b.right) / 2;
  const barW = b.u * 0.8;
  const pick = (l, c, r) => (b.align === 'center' ? c : b.align === 'right' ? r : l);
  ctx.fillStyle = look.accent;
  ctx.fillRect(pick(b.left, mid - barW / 2, b.right - barW), b.y0 + b.pad, barW, b.u * 0.06);

  ctx.fillStyle = look.ink;
  ctx.textAlign = pick('left', 'center', 'right');
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${b.titleSize}px ${FONT}`;
  ctx.letterSpacing = `${b.u * 0.015}px`;
  ctx.fillText(it.title ?? '', pick(b.left, mid, b.right), b.y0 + b.pad + b.u * 0.14 + b.titleSize * 0.75, b.right - b.left);
  ctx.letterSpacing = '0px';

  if (it.kind === 'week') drawWeekHeader(ctx, b, look.ink, now);
  for (const c of b.cells) drawCell(ctx, c, look, Boolean(it.checks));
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
}

function drawItem(ctx, W, H, it, now) {
  const b = layout(ctx, W, H, it, now);
  if (CARD_KINDS.includes(it.kind)) return drawCard(ctx, b, it, now);

  const look = LOOK[it.style] ?? LOOK.glass;
  ctx.save();
  ctx.font = b.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  if (it.kind === 'reminder') {
    ctx.fillStyle = typeof look.fill === 'string' ? look.fill : 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, b.px * 0.6);
    ctx.fill();
    ctx.fillStyle = look.ink;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = b.px * 0.12;
    ctx.shadowOffsetY = b.px * 0.04;
  }
  ctx.fillText(b.text, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
  ctx.restore();
}

export function drawScene(ctx, W, H, img, items, now) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (img) {
    const { sx, sy, sw, sh } = coverRect(img.naturalWidth, img.naturalHeight, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  }
  for (const it of items) drawItem(ctx, W, H, it, now);
}
