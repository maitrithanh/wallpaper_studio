import { useEffect, useState } from 'react';
import Editor from './Editor';
import Simulator from './Simulator';
import { DEVICES, GROUPS } from './devices';
import { renderPng } from './export';
import { WIDGET_STYLES, alignPatch, boxFor, dayTasks, edgeDistances, toggleTask } from './render';
import './styles.scss';

const STICKERS = ['⭐', '🌙', '🌸', '☕', '🎧', '🚀', '🌿', '❤️'];
const WIDGETS = [
  { kind: 'clock', label: 'Clock', icon: '🕘' },
  { kind: 'date', label: 'Date', icon: '📅' },
  { kind: 'reminder', label: 'Reminder', icon: '🔔' },
  { kind: 'day', label: 'Day plan', icon: '🗓️' },
  { kind: 'gym', label: 'Gym plan', icon: '🏋️' },
  { kind: 'week', label: 'Week plan', icon: '📆' },
];
const KIND_LABEL = { ...Object.fromEntries(WIDGETS.map((w) => [w.kind, w.label])), sticker: 'Sticker' };
const DEFAULT_SIZE = { clock: 0.16, date: 0.035, reminder: 0.04, sticker: 0.08, day: 0.024, gym: 0.024, week: 0.024 };
const DEFAULT_Y = { clock: 0.3, date: 0.42 };
const PRESET = {
  day: { title: 'Today', lines: ['09:00 Stand-up', '13:00 Lunch', '18:30 Gym'] },
  gym: { title: 'Gym plan', lines: ['Bench press 4×8', 'Squat 4×6', 'Pull-ups 3×10', 'Plank 3×45s'] },
  week: { title: 'This week' },
};
const CARD_KINDS = ['day', 'gym', 'week'];
const LIST_KINDS = ['day', 'gym'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TABS = [
  ['device', 'Device'],
  ['add', 'Add'],
  ['layers', 'Layers'],
  ['site', 'Site'],
  ['edit', 'Edit'],
];
const STORAGE_KEY = 'wallpaper-edit:v1';

// Accepts 'example.com' or a full link; returns '' for anything that isn't http(s).
function toUrl(text) {
  const t = text.trim();
  if (!t) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function newItem(kind, extra = {}) {
  return {
    id: crypto.randomUUID(),
    kind,
    x: 0.5,
    y: DEFAULT_Y[kind] ?? 0.6,
    size: DEFAULT_SIZE[kind],
    style: 'glass',
    align: 'left',
    text: kind === 'reminder' ? 'Reminder' : '',
    title: PRESET[kind]?.title ?? '',
    lines: PRESET[kind]?.lines ?? [],
    notes: kind === 'week' ? Array(7).fill('') : undefined,
    ...extra,
  };
}

// Layout is saved; the photo is not (it can be far too large for localStorage).
function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export default function App() {
  const [deviceId, setDeviceId] = useState(DEVICES[0].id);
  const [img, setImg] = useState(null);
  const [items, setItems] = useState(loadItems);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('device');
  const [status, setStatus] = useState('');
  const [simulator, setSimulator] = useState(false);
  const [siteInput, setSiteInput] = useState('');
  const [siteUrl, setSiteUrl] = useState('');

  const device = DEVICES.find((d) => d.id === deviceId);
  const selected = items.find((i) => i.id === selectedId);
  const needsUpscale = img && Math.max(device.w / img.naturalWidth, device.h / img.naturalHeight) > 1;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked: layout just won't persist.
    }
  }, [items]);

  // Edge distances for the selected widget, in device pixels.
  const metrics = selected && edgeDistances(boxFor(selected, device.w, device.h), device.w, device.h);

  const select = (id) => {
    setSelectedId(id);
    if (id) setTab('edit');
  };

  const add = (kind, extra = {}) => {
    const item = newItem(kind, extra);
    setItems((prev) => [...prev, item]);
    select(item.id);
  };

  const update = (patch) =>
    setItems((prev) => prev.map((i) => (i.id === selectedId ? { ...i, ...patch } : i)));

  const placeWidget = (h, v) => update(alignPatch(boxFor(selected, device.w, device.h), device.w, device.h, { h, v }));

  // Week notes are stored as 7 lists of tasks, Monday first.
  const setNote = (i, text) =>
    update({ notes: Array.from({ length: 7 }, (_, k) => (k === i ? text.split('\n') : dayTasks(selected.notes?.[k]))) });

  // Tap a checkbox on the wallpaper: day is null for list widgets, 0–6 for the week plan.
  const toggleCheck = (id, day, index) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (day === null) {
          const lines = [...(it.lines ?? [])];
          lines[index] = toggleTask(lines[index]);
          return { ...it, lines };
        }
        const notes = Array.from({ length: 7 }, (_, k) => {
          const tasks = [...dayTasks(it.notes?.[k])];
          if (k === day) tasks[index] = toggleTask(tasks[index]);
          return tasks;
        });
        return { ...it, notes };
      }),
    );

  // Later items draw on top, so "up" moves toward the end of the array.
  const move = (id, dir) =>
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') remove(selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const loadPhoto = (src) => {
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = src;
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  // The photo is embedded as a data URL, so the project file can be reopened on its own.
  const exportProject = () => {
    const data = { app: 'wallpaper-edit', version: 1, deviceId, items, photo: img ? img.src : null };
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'wallpaper-project.json');
  };

  const onImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.app !== 'wallpaper-edit' || !Array.isArray(data.items)) throw new Error('not a wallpaper project');
        setDeviceId(DEVICES.some((d) => d.id === data.deviceId) ? data.deviceId : DEVICES[0].id);
        setItems(data.items);
        setSelectedId(null);
        if (data.photo) loadPhoto(data.photo);
        else setImg(null);
        setStatus('Project imported.');
      } catch (err) {
        setStatus(`Could not import: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const onSave = async () => {
    setStatus('Rendering…');
    const blob = await renderPng(device, img, items);
    const file = new File([blob], `wallpaper-${device.w}x${device.h}.png`, { type: 'image/png' });
    let shared = false;
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Wallpaper' });
        shared = true;
      } catch (err) {
        if (err.name === 'AbortError') return setStatus('');
      }
    }
    if (!shared) download(file, file.name);
    exportProject();
    setStatus(
      shared
        ? 'Shared. Choose "Set as wallpaper" from the share sheet. Project JSON saved too.'
        : 'Saved PNG and project JSON. Phone: set it from Photos. Desktop: Set as desktop background.',
    );
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Wallpaper Studio</span>
        <div className="topbar-actions">
          <button
            className={simulator ? 'btn on' : 'btn'}
            aria-pressed={simulator}
            onClick={() => setSimulator((v) => !v)}
          >
            Simulator
          </button>
          <label className="btn">
            {img ? 'Change photo' : 'Upload'}
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          <label className="btn">
            Import
            <input type="file" accept="application/json,.json" onChange={onImport} hidden />
          </label>
          <button className="btn primary" disabled={!img} onClick={onSave}>
            Save
          </button>
        </div>
      </header>

      <main className="stage">
        {!img && !simulator && (
          <label className="empty">
            <span className="empty-card">
              <strong>Upload a photo</strong>
              <small>JPG or PNG. Full resolution is kept on save.</small>
            </span>
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
        )}
        {simulator ? (
          <Simulator device={device} url={siteUrl} />
        ) : (
          <Editor
            device={device}
            img={img}
            items={items}
            setItems={setItems}
            selectedId={selectedId}
            onSelect={select}
            onToggle={toggleCheck}
          />
        )}
        {status && <div className="toast">{status}</div>}
      </main>

      <nav className="sheet">
        <div className="segmented" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'seg on' : 'seg'}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'device' && (
          <div className="tab-body">
            <small className="hint">
              Selected: {device.name} · {device.w} × {device.h}
            </small>
            {GROUPS.map((g) => {
              const list = DEVICES.filter((d) => (g.id === 'popular' ? d.popular : d.brand === g.id));
              return (
                <details key={g.id} className="group" open={g.id === 'popular'}>
                  <summary>
                    <span>{g.label}</span>
                    <small>{list.length}</small>
                  </summary>
                  <div className="device-grid">
                    {list.map((d) => (
                      <button
                        key={d.id}
                        className={d.id === deviceId ? 'device on' : 'device'}
                        onClick={() => setDeviceId(d.id)}
                      >
                        <strong>{d.name}</strong>
                        <small>
                          {d.w} × {d.h}
                        </small>
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
            {needsUpscale && <small className="hint">Photo is smaller than this device; it will be upscaled.</small>}
          </div>
        )}

        {tab === 'add' && (
          <div className="tab-body">
            <div className="widget-grid">
              {WIDGETS.map((w) => (
                <button key={w.kind} className="widget" onClick={() => add(w.kind)}>
                  <span aria-hidden>{w.icon}</span>
                  {w.label}
                </button>
              ))}
            </div>
            <h2>Stickers</h2>
            <div className="sticker-row">
              {STICKERS.map((s) => (
                <button key={s} className="sticker" onClick={() => add('sticker', { text: s })}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'layers' && (
          <div className="tab-body">
            {items.length === 0 && <small className="hint">No widgets yet. Add some in the Add tab.</small>}
            <ul className="layers">
              {[...items].reverse().map((it) => (
                <li key={it.id} className={it.id === selectedId ? 'layer on' : 'layer'}>
                  <button className="layer-name" onClick={() => select(it.id)}>
                    <span>{KIND_LABEL[it.kind]}</span>
                    <small>{it.title || it.text || ''}</small>
                  </button>
                  <button className="icon-btn" aria-label="Move up" onClick={() => move(it.id, 1)}>
                    ▲
                  </button>
                  <button className="icon-btn" aria-label="Move down" onClick={() => move(it.id, -1)}>
                    ▼
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'site' && (
          <div className="tab-body">
            <form
              className="site-form"
              onSubmit={(e) => {
                e.preventDefault();
                setSiteUrl(toUrl(siteInput));
                setSimulator(true);
              }}
            >
              <input
                type="text"
                className="field"
                placeholder="Paste a website link"
                value={siteInput}
                onChange={(e) => setSiteInput(e.target.value)}
              />
              <button className="btn primary" type="submit">
                Load
              </button>
            </form>
            {siteUrl && (
              <>
                <small className="hint">
                  {siteUrl} at {device.name} size. Some sites block embedding.
                </small>
                <button
                  className="btn"
                  onClick={() => {
                    setSiteUrl('');
                    setSiteInput('');
                  }}
                >
                  Clear site
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'edit' && (
          <div className="tab-body">
            {!selected && <small className="hint">Pick a widget on the photo or in Layers.</small>}
            {selected && (
              <>
                <small className="hint">{KIND_LABEL[selected.kind]}</small>
                {(selected.kind === 'reminder' || selected.kind === 'sticker') && (
                  <input
                    type="text"
                    className="field"
                    value={selected.text}
                    onChange={(e) => update({ text: e.target.value })}
                  />
                )}
                {CARD_KINDS.includes(selected.kind) && (
                  <input
                    type="text"
                    className="field"
                    placeholder="Title"
                    value={selected.title ?? ''}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                )}
                {CARD_KINDS.includes(selected.kind) && <h2>Text align</h2>}
                {CARD_KINDS.includes(selected.kind) && (
                  <div className="segmented three">
                    {['left', 'center', 'right'].map((a) => (
                      <button
                        key={a}
                        className={(selected.align ?? 'left') === a ? 'seg on' : 'seg'}
                        onClick={() => update({ align: a })}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
                {CARD_KINDS.includes(selected.kind) && (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.checks)}
                      onChange={(e) => update({ checks: e.target.checked })}
                    />
                    Checkboxes
                  </label>
                )}
                {LIST_KINDS.includes(selected.kind) && (
                  <textarea
                    className="field"
                    rows={4}
                    placeholder="One item per line"
                    value={(selected.lines ?? []).join('\n')}
                    onChange={(e) => update({ lines: e.target.value.split('\n') })}
                  />
                )}
                {selected.kind === 'week' &&
                  DAY_NAMES.map((name, i) => (
                    <label key={name} className="day-note">
                      <span>{name}</span>
                      <textarea
                        className="field"
                        rows={2}
                        placeholder="One task per line"
                        value={dayTasks(selected.notes?.[i]).join('\n')}
                        onChange={(e) => setNote(i, e.target.value)}
                      />
                    </label>
                  ))}
                {(CARD_KINDS.includes(selected.kind) || selected.kind === 'reminder') && (
                  <div className="swatches">
                    {WIDGET_STYLES.map((s) => (
                      <button
                        key={s}
                        className={`swatch s-${s}${(selected.style ?? 'glass') === s ? ' on' : ''}`}
                        onClick={() => update({ style: s })}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <h2>Position</h2>
                <div className="segmented three">
                  {['left', 'center', 'right'].map((h) => (
                    <button key={h} className="seg" onClick={() => placeWidget(h, null)}>
                      {h}
                    </button>
                  ))}
                </div>
                <div className="segmented three">
                  {['top', 'middle', 'bottom'].map((v) => (
                    <button key={v} className="seg" onClick={() => placeWidget(null, v)}>
                      {v}
                    </button>
                  ))}
                </div>
                <dl className="metrics">
                  <div>
                    <dt>Top</dt>
                    <dd>{metrics.top} px</dd>
                  </div>
                  <div>
                    <dt>Bottom</dt>
                    <dd>{metrics.bottom} px</dd>
                  </div>
                  <div>
                    <dt>Left</dt>
                    <dd>{metrics.left} px</dd>
                  </div>
                  <div>
                    <dt>Right</dt>
                    <dd>{metrics.right} px</dd>
                  </div>
                </dl>
                <label className="range">
                  <span>Size</span>
                  <input
                    type="range"
                    min="0.02"
                    max="0.3"
                    step="0.005"
                    value={selected.size}
                    onChange={(e) => update({ size: Number(e.target.value) })}
                  />
                </label>
                <button className="btn danger" onClick={() => remove(selected.id)}>
                  Delete widget
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
