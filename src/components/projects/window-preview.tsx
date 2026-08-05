"use client";

import { computeLayout } from "@/lib/window-calc";
import type { ModelType } from "@/types";

// Live technical drawing of the configured window/door — mirrors the original
// Proferto preview (frame + sashes + mullions + glass + opening diagonals +
// dimension lines with overall and per-section measurements).
export function WindowPreview({
  modelType,
  widthMm,
  heightMm,
  hasRoleta,
}: {
  modelType: ModelType;
  widthMm: number;
  heightMm: number;
  hasRoleta?: boolean;
}) {
  const W = Math.max(200, widthMm || 1000);
  const H = Math.max(200, heightMm || 1000);
  const layout = computeLayout(modelType, W, H);

  const MAXW = 420;
  const MAXH = 360;
  const scale = Math.min(MAXW / W, MAXH / H);
  const ox = 24;
  const oy = 16;
  const pw = W * scale;
  const ph = H * scale;
  const frameT = Math.max(7, 55 * scale);
  const mulT = Math.max(5, 42 * scale);

  const vbW = ox + pw + 78;
  const vbH = oy + ph + 62;
  const roletaH = hasRoleta ? Math.max(14, 180 * scale) : 0;

  const mm = (n: number) => Math.round(n);
  const isShape = !!layout.shape;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-full max-h-[420px] w-full" role="img" aria-label="Skica teknike e produktit">
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bcd4ef" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#9fc0e8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#cfe0f2" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Roller shutter box on top */}
      {hasRoleta && (
        <rect x={ox} y={oy - roletaH - 3} width={pw} height={roletaH} rx="2"
          className="fill-slate-300" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-400)" }} />
      )}

      {isShape ? (
        <ShapeOutline shape={layout.shape!} ox={ox} oy={oy} pw={pw} ph={ph} frameT={frameT} />
      ) : (
        <>
          {/* frame */}
          <rect x={ox} y={oy} width={pw} height={ph} rx="3" className="fill-slate-300/40" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-500)" }} />
          {/* glass panes with opening diagonal */}
          {layout.panes.map((p, i) => {
            const gx = ox + p.x * scale;
            const gy = oy + p.y * scale;
            const gw = p.w * scale;
            const gh = p.h * scale;
            return (
              <g key={i}>
                <rect x={gx} y={gy} width={gw} height={gh} fill="url(#glass)" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-400)" }} />
                <line x1={gx + 2} y1={gy + gh - 2} x2={gx + gw - 2} y2={gy + 2} stroke="currentColor" strokeWidth="0.75" style={{ color: "var(--color-slate-400)" }} opacity="0.7" />
              </g>
            );
          })}
          {/* vertical mullions (t-shtyllë) */}
          {layout.vMullions.map((v, i) => (
            <rect key={`v${i}`} x={ox + v.x * scale - mulT / 2} y={oy + v.y * scale} width={mulT} height={v.h * scale}
              className="fill-slate-300/60" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-500)" }} />
          ))}
          {/* horizontal transoms */}
          {layout.hMullions.map((h, i) => (
            <rect key={`h${i}`} x={ox + h.x * scale} y={oy + h.y * scale - mulT / 2} width={h.w * scale} height={mulT}
              className="fill-slate-300/60" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-500)" }} />
          ))}
        </>
      )}

      {/* dimension line — height (right) */}
      <g style={{ color: "var(--color-slate-400)" }} className="text-slate-400">
        <line x1={ox + pw + 22} y1={oy} x2={ox + pw + 22} y2={oy + ph} stroke="currentColor" strokeWidth="1" />
        <line x1={ox + pw + 18} y1={oy} x2={ox + pw + 26} y2={oy} stroke="currentColor" strokeWidth="1" />
        <line x1={ox + pw + 18} y1={oy + ph} x2={ox + pw + 26} y2={oy + ph} stroke="currentColor" strokeWidth="1" />
        <text x={ox + pw + 30} y={oy + ph / 2} fontSize="12" fill="currentColor" transform={`rotate(90 ${ox + pw + 34} ${oy + ph / 2})`} textAnchor="middle">{mm(H)}</text>
      </g>

      {/* dimension line — overall width + per-section (bottom) */}
      <g style={{ color: "var(--color-slate-400)" }}>
        <line x1={ox} y1={oy + ph + 24} x2={ox + pw} y2={oy + ph + 24} stroke="currentColor" strokeWidth="1" />
        {Array.from({ length: layout.mainCols + 1 }).map((_, i) => {
          const x = ox + (pw * i) / layout.mainCols;
          return <line key={i} x1={x} y1={oy + ph + 20} x2={x} y2={oy + ph + 28} stroke="currentColor" strokeWidth="1" />;
        })}
        {Array.from({ length: layout.mainCols }).map((_, i) => {
          const cx = ox + (pw * (i + 0.5)) / layout.mainCols;
          return <text key={i} x={cx} y={oy + ph + 42} fontSize="12" fill="currentColor" textAnchor="middle">{mm(W / layout.mainCols)}</text>;
        })}
      </g>
    </svg>
  );
}

function ShapeOutline({ shape, ox, oy, pw, ph, frameT }: { shape: string; ox: number; oy: number; pw: number; ph: number; frameT: number }) {
  const style = { color: "var(--color-slate-500)" } as const;
  const glassStyle = { color: "var(--color-slate-400)" } as const;
  if (shape === "arch") {
    const d = `M ${ox} ${oy + ph} L ${ox} ${oy + ph * 0.4} Q ${ox + pw / 2} ${oy - ph * 0.1} ${ox + pw} ${oy + ph * 0.4} L ${ox + pw} ${oy + ph} Z`;
    return (
      <>
        <path d={d} fill="url(#glass)" stroke="currentColor" strokeWidth={2} style={style} />
        <line x1={ox + 4} y1={oy + ph - 4} x2={ox + pw - 4} y2={oy + ph * 0.35} stroke="currentColor" strokeWidth="0.75" style={glassStyle} opacity="0.7" />
      </>
    );
  }
  let pts = "";
  if (shape === "triangle") pts = `${ox + pw / 2},${oy} ${ox + pw},${oy + ph} ${ox},${oy + ph}`;
  else if (shape === "trapez") pts = `${ox + pw * 0.25},${oy} ${ox + pw * 0.75},${oy} ${ox + pw},${oy + ph} ${ox},${oy + ph}`;
  else pts = `${ox + pw / 2},${oy} ${ox + pw},${oy + ph * 0.4} ${ox + pw * 0.8},${oy + ph} ${ox + pw * 0.2},${oy + ph} ${ox},${oy + ph * 0.4}`;
  return (
    <>
      <polygon points={pts} fill="url(#glass)" stroke="currentColor" strokeWidth={Math.max(2, frameT / 3)} style={style} />
    </>
  );
}
