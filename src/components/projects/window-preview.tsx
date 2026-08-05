"use client";

import { computeLayout, isDoorProduct, FRAME_FACE } from "@/lib/window-calc";
import type { WindowConfig, OpeningType } from "@/types";

// Live technical drawing. Panes are clickable (onPaneClick) to cycle their
// opening type; opening panes get the red+blue casement/tilt symbols like the
// real Proferto configurator.
export function WindowPreview({
  config,
  onPaneClick,
}: {
  config: WindowConfig;
  onPaneClick?: (index: number) => void;
}) {
  const W = Math.max(200, config.widthMm || 1000);
  const H = Math.max(200, config.heightMm || 1000);

  const MAXW = 420;
  const MAXH = 380;
  const scale = Math.min(MAXW / W, MAXH / H);
  const ox = 24;
  const oy = 16;
  const pw = W * scale;
  const ph = H * scale;
  const mm = (n: number) => Math.round(n);

  const roletaH = config.roleta ? Math.max(14, 180 * scale) : 0;
  const vbW = ox + pw + 78;
  const vbH = oy + ph + 62 + roletaH;

  // ---- Roletë: a shutter box + slats ------------------------------------
  if (config.productType === "Roletë") {
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-full max-h-[420px] w-full" role="img" aria-label="Skica e roletës">
        <rect x={ox} y={oy} width={pw} height={ph * 0.18} rx="3" className="fill-slate-300/50" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-500)" }} />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={ox + 3} y1={oy + ph * 0.18 + ((ph * 0.82) / 9) * (i + 1)} x2={ox + pw - 3} y2={oy + ph * 0.18 + ((ph * 0.82) / 9) * (i + 1)} stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-400)" }} opacity="0.6" />
        ))}
        <rect x={ox} y={oy + ph * 0.18} width={pw} height={ph * 0.82} rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-500)" }} />
        <DimLines ox={ox} oy={oy} pw={pw} ph={ph} cols={1} W={W} H={H} mm={mm} />
      </svg>
    );
  }

  // ---- Doors: leaf + panel + handle -------------------------------------
  if (isDoorProduct(config.productType)) {
    const inX = ox + FRAME_FACE * scale;
    const inY = oy + FRAME_FACE * scale;
    const inW = pw - 2 * FRAME_FACE * scale;
    const inH = ph - 2 * FRAME_FACE * scale;
    const glass = config.sashComposition === "glass";
    return (
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-full max-h-[420px] w-full" role="img" aria-label="Skica e derës">
        <defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#bcd4ef" stopOpacity="0.5" /><stop offset="100%" stopColor="#cfe0f2" stopOpacity="0.45" /></linearGradient></defs>
        <rect x={ox} y={oy} width={pw} height={ph} rx="3" className="fill-slate-300/40" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-500)" }} />
        {glass ? (
          <>
            <rect x={inX} y={inY} width={inW} height={inH * 0.45} fill="url(#glass)" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-400)" }} />
            <rect x={inX} y={inY + inH * 0.5} width={inW} height={inH * 0.5} className="fill-slate-300/50" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-400)" }} />
          </>
        ) : (
          <rect x={inX} y={inY} width={inW} height={inH} className="fill-slate-300/50" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-400)" }} />
        )}
        <text x={inX + 6} y={inY + 14} fontSize="10" fill="currentColor" style={{ color: "var(--color-slate-500)" }}>{config.doorModel ?? "ARIES"}</text>
        <circle cx={inX + inW - 10} cy={inY + inH / 2} r="3.5" fill="currentColor" style={{ color: "var(--color-slate-500)" }} />
        <DimLines ox={ox} oy={oy} pw={pw} ph={ph} cols={1} W={W} H={H} mm={mm} />
      </svg>
    );
  }

  // ---- Windows / sliding -------------------------------------------------
  const layout = computeLayout(config.modelType, W, H);
  const frameT = Math.max(7, FRAME_FACE * scale);
  const mulT = Math.max(5, 42 * scale);

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-full max-h-[420px] w-full" role="img" aria-label="Skica teknike e produktit">
      <defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#bcd4ef" stopOpacity="0.55" /><stop offset="55%" stopColor="#9fc0e8" stopOpacity="0.35" /><stop offset="100%" stopColor="#cfe0f2" stopOpacity="0.5" /></linearGradient></defs>

      {config.roleta && (
        <rect x={ox} y={oy} width={pw} height={roletaH} rx="2" className="fill-slate-300/60" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-400)" }} />
      )}
      <g transform={`translate(0 ${roletaH ? roletaH + 3 : 0})`}>
        {layout.shape ? (
          <ShapeOutline shape={layout.shape} ox={ox} oy={oy} pw={pw} ph={ph} frameT={frameT} />
        ) : (
          <>
            <rect x={ox} y={oy} width={pw} height={ph} rx="3" className="fill-slate-300/40" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-slate-500)" }} />
            {layout.panes.map((p, i) => {
              const gx = ox + p.x * scale, gy = oy + p.y * scale, gw = p.w * scale, gh = p.h * scale;
              const opening = (config.openings?.[i] ?? "fiks") as OpeningType;
              return (
                <g key={i}>
                  <rect x={gx} y={gy} width={gw} height={gh} fill="url(#glass)" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-400)" }} />
                  <OpeningSymbol x={gx} y={gy} w={gw} h={gh} type={opening} />
                  {onPaneClick && (
                    <rect x={gx} y={gy} width={gw} height={gh} fill="transparent" className="cursor-pointer" onClick={() => onPaneClick(i)}>
                      <title>Kliko për të ndryshuar hapjen</title>
                    </rect>
                  )}
                </g>
              );
            })}
            {layout.vMullions.map((v, i) => (
              <rect key={`v${i}`} x={ox + v.x * scale - mulT / 2} y={oy + v.y * scale} width={mulT} height={v.h * scale} className="fill-slate-300/60" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-500)" }} />
            ))}
            {layout.hMullions.map((h, i) => (
              <rect key={`h${i}`} x={ox + h.x * scale} y={oy + h.y * scale - mulT / 2} width={h.w * scale} height={mulT} className="fill-slate-300/60" stroke="currentColor" strokeWidth="1" style={{ color: "var(--color-slate-500)" }} />
            ))}
          </>
        )}
      </g>
      <g transform={`translate(0 ${roletaH ? roletaH + 3 : 0})`}>
        <DimLines ox={ox} oy={oy} pw={pw} ph={ph} cols={layout.mainCols} W={W} H={H} mm={mm} />
      </g>
    </svg>
  );
}

function OpeningSymbol({ x, y, w, h, type }: { x: number; y: number; w: number; h: number; type: OpeningType }) {
  if (type === "fiks") return null;
  const pad = 3;
  const l = x + pad, r = x + w - pad, t = y + pad, b = y + h - pad, cx = x + w / 2, cy = y + h / 2;
  const blue = "#3b82f6", red = "#ef4444";
  const dash = "3 3";
  if (type === "majtas") {
    // hinge on the right → apex at right
    return <g fill="none" strokeWidth="1.1" strokeDasharray={dash}><polyline points={`${l},${t} ${r},${cy} ${l},${b}`} stroke={blue} /></g>;
  }
  if (type === "djathtas") {
    return <g fill="none" strokeWidth="1.1" strokeDasharray={dash}><polyline points={`${r},${t} ${l},${cy} ${r},${b}`} stroke={blue} /></g>;
  }
  // kip (tilt-turn): casement (blue) + tilt (red, apex bottom)
  return (
    <g fill="none" strokeWidth="1.1" strokeDasharray={dash}>
      <polyline points={`${r},${t} ${l},${cy} ${r},${b}`} stroke={blue} />
      <polyline points={`${l},${t} ${cx},${b} ${r},${t}`} stroke={red} />
    </g>
  );
}

function DimLines({ ox, oy, pw, ph, cols, W, H, mm }: { ox: number; oy: number; pw: number; ph: number; cols: number; W: number; H: number; mm: (n: number) => number }) {
  return (
    <g style={{ color: "var(--color-slate-400)" }}>
      <line x1={ox + pw + 22} y1={oy} x2={ox + pw + 22} y2={oy + ph} stroke="currentColor" strokeWidth="1" />
      <line x1={ox + pw + 18} y1={oy} x2={ox + pw + 26} y2={oy} stroke="currentColor" strokeWidth="1" />
      <line x1={ox + pw + 18} y1={oy + ph} x2={ox + pw + 26} y2={oy + ph} stroke="currentColor" strokeWidth="1" />
      <text x={ox + pw + 30} y={oy + ph / 2} fontSize="12" fill="currentColor" transform={`rotate(90 ${ox + pw + 34} ${oy + ph / 2})`} textAnchor="middle">{mm(H)}</text>
      <line x1={ox} y1={oy + ph + 24} x2={ox + pw} y2={oy + ph + 24} stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: cols + 1 }).map((_, i) => {
        const x = ox + (pw * i) / cols;
        return <line key={i} x1={x} y1={oy + ph + 20} x2={x} y2={oy + ph + 28} stroke="currentColor" strokeWidth="1" />;
      })}
      {Array.from({ length: cols }).map((_, i) => {
        const cx = ox + (pw * (i + 0.5)) / cols;
        return <text key={i} x={cx} y={oy + ph + 42} fontSize="12" fill="currentColor" textAnchor="middle">{mm(W / cols)}</text>;
      })}
    </g>
  );
}

function ShapeOutline({ shape, ox, oy, pw, ph, frameT }: { shape: string; ox: number; oy: number; pw: number; ph: number; frameT: number }) {
  const style = { color: "var(--color-slate-500)" } as const;
  if (shape === "arch") {
    const d = `M ${ox} ${oy + ph} L ${ox} ${oy + ph * 0.4} Q ${ox + pw / 2} ${oy - ph * 0.1} ${ox + pw} ${oy + ph * 0.4} L ${ox + pw} ${oy + ph} Z`;
    return <path d={d} fill="url(#glass)" stroke="currentColor" strokeWidth={2} style={style} />;
  }
  let pts = "";
  if (shape === "triangle") pts = `${ox + pw / 2},${oy} ${ox + pw},${oy + ph} ${ox},${oy + ph}`;
  else if (shape === "trapez") pts = `${ox + pw * 0.25},${oy} ${ox + pw * 0.75},${oy} ${ox + pw},${oy + ph} ${ox},${oy + ph}`;
  else pts = `${ox + pw / 2},${oy} ${ox + pw},${oy + ph * 0.4} ${ox + pw * 0.8},${oy + ph} ${ox + pw * 0.2},${oy + ph} ${ox},${oy + ph * 0.4}`;
  return <polygon points={pts} fill="url(#glass)" stroke="currentColor" strokeWidth={Math.max(2, frameT / 3)} style={style} />;
}
