import { useEffect, useRef, useState } from 'react';
import { cssSize } from './devices';

// Shows a site at the selected device's CSS size, scaled to fit the stage.
export default function Simulator({ device, url }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (el) setBox({ w: el.clientWidth, h: el.clientHeight });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const css = cssSize(device);
  const scale = box.w ? Math.min(box.w / css.w, box.h / css.h) : 0;

  return (
    <div className="sim" ref={wrapRef}>
      {url ? (
        <div className="frame" style={{ width: css.w * scale, height: css.h * scale }}>
          <iframe
            key={url}
            src={url}
            title="Site preview"
            style={{ width: css.w, height: css.h, transform: `scale(${scale})` }}
          />
        </div>
      ) : (
        <p className="sim-note">Paste a website link in the Site tab.</p>
      )}
    </div>
  );
}
