import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignPatch, coverRect, edgeDistances, layout } from './render.js';

// Stub canvas context: text width is 5px per character, enough for layout maths.
const ctx = { font: '', measureText: (t) => ({ width: t.length * 5 }) };

test('coverRect centre-crops to the target aspect ratio', () => {
  // wide image into a square: crop left/right
  assert.deepEqual(coverRect(2000, 1000, 1000, 1000), { sx: 500, sy: 0, sw: 1000, sh: 1000 });
  // square image into a tall screen: crop top/bottom
  assert.deepEqual(coverRect(1000, 1000, 500, 1000), { sx: 250, sy: 0, sw: 500, sh: 1000 });
});

test('card layout is 7 units wide and grows with non-empty lines', () => {
  // size 0.025 of H=2000 → unit 50px; blank lines are skipped
  const it = { kind: 'gym', x: 0.5, y: 0.5, size: 0.025, lines: ['a', '', 'b'] };
  const b = layout(ctx, 1000, 2000, it, new Date());
  assert.equal(b.x1 - b.x0, 350);
  // pad 25 + title 18×1.5 + accent bar 7 + two lines (14 × 1.7 each) + pad 25
  assert.ok(Math.abs(b.y1 - b.y0 - 131.6) < 1e-6);
});

test('left / centre / right move the task block inside the card', () => {
  const base = { kind: 'gym', x: 0.5, y: 0.5, size: 0.025, lines: ['abc'] };
  const x = (align) => layout(ctx, 1000, 2000, { ...base, align }, new Date()).cells[0].x;
  assert.ok(x('left') < x('center'));
  assert.ok(x('center') < x('right'));
});

test('position buttons put the box against the chosen edges', () => {
  const it = { kind: 'gym', x: 0.5, y: 0.5, size: 0.025, lines: ['a'] };
  const W = 1000;
  const H = 2000;
  const top_left = { ...it, ...alignPatch(layout(ctx, W, H, it, new Date()), W, H, { h: 'left', v: 'top' }) };
  const d = edgeDistances(layout(ctx, W, H, top_left, new Date()), W, H);
  assert.equal(d.left, 50); // 5% of width
  assert.equal(d.top, 100); // 5% of height
  const bottom_right = { ...it, ...alignPatch(layout(ctx, W, H, it, new Date()), W, H, { h: 'right', v: 'bottom' }) };
  const e = edgeDistances(layout(ctx, W, H, bottom_right, new Date()), W, H);
  assert.equal(e.right, 50);
  assert.equal(e.bottom, 100);
});
