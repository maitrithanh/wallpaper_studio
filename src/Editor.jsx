import { useEffect, useRef, useState } from 'react';
import { drawScene, layout } from './render';

const clamp = (v) => Math.min(1, Math.max(0, v));

export default function Editor({ device, img, items, setItems, selectedId, onSelect, onToggle }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [now, setNow] = useState(() => new Date());

  // Fit the device aspect ratio into the available area.
  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const a = device.w / device.h;
      let w = el.clientWidth;
      let h = w / a;
      if (h > el.clientHeight) {
        h = el.clientHeight;
        w = h * a;
      }
      setBox({ w: Math.floor(w), h: Math.floor(h) });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [device]);

  // Keeps clock and date widgets current.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box.w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = box.w * dpr;
    canvas.height = box.h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, box.w, box.h, img, items, now);

    const sel = items.find((i) => i.id === selectedId);
    if (sel) {
      const b = layout(ctx, box.w, box.h, sel, now);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x0 - 4, b.y0 - 4, b.x1 - b.x0 + 8, b.y1 - b.y0 + 8);
    }
  }, [box, img, items, selectedId, now]);

  const toLocal = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { px: e.clientX - r.left, py: e.clientY - r.top };
  };

  const onDown = (e) => {
    const { px, py } = toLocal(e);
    const ctx = canvasRef.current.getContext('2d');
    // Topmost item first, same order as drawing.
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const b = layout(ctx, box.w, box.h, it, now);
      if (px < b.x0 || px > b.x1 || py < b.y0 || py > b.y1) continue;
      onSelect(it.id);
      const cell = it.checks && b.cells?.find((c) => px >= c.x - 4 && px <= c.x + c.bs + 4 && Math.abs(py - c.y) <= c.bs);
      if (cell) return onToggle(it.id, cell.day, cell.index);
      canvasRef.current.setPointerCapture(e.pointerId);
      dragRef.current = { id: it.id, dx: px - it.x * box.w, dy: py - it.y * box.h };
      return;
    }
    onSelect(null);
  };

  const onMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { px, py } = toLocal(e);
    const x = clamp((px - drag.dx) / box.w);
    const y = clamp((py - drag.dy) / box.h);
    setItems((prev) => prev.map((i) => (i.id === drag.id ? { ...i, x, y } : i)));
  };

  const onUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="editor" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: box.w, height: box.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
