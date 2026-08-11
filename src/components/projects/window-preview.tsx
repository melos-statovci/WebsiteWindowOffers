"use client";

import { computeLayout, effectiveDims, isDoorProduct, FRAME_FACE, MODELS } from "@/domain/configurator/window-calc";
import type { WindowConfig, OpeningType } from "@/domain/types";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

// Live technical drawing. Panes are clickable (onPaneClick) to cycle their
// opening type; opening panes get the red dashed casement/tilt symbols like the
// real Kornizo configurator.
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
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="mx-auto h-full max-h-full w-full" role="img" aria-label="Skica e roletës">
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
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="mx-auto h-full max-h-full w-full" role="img" aria-label="Skica e derës">
        <defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d4d4d8" stopOpacity="0.5" /><stop offset="100%" stopColor="#f4f4f5" stopOpacity="0.45" /></linearGradient></defs>
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
  // A shtesë carves the window down: the drawing spans the full W×H, but the
  // actual window occupies the effective region, offset by any top/left bands.
  const { ew, eh } = effectiveDims(config);
  const layout = computeLayout(config.modelType, ew, eh, config);
  const previewScale = Math.min(250 / W, 224 / H);
  const mullionPx = 6;
  const frameOuterW = Math.max(76, ew * previewScale);
  const frameOuterH = Math.max(86, eh * previewScale);
  const shutterPx = config.roleta ? Math.max(16, Math.min(42, 180 * previewScale)) : 0;
  const stageW = Math.ceil(frameOuterW + 118);
  const stageH = Math.ceil(frameOuterH + shutterPx + 78);
  const modelRows = layout.shape ? [] : layoutRows(config);
  const rowStarts = modelRows.map((_, rowIndex) => modelRows.slice(0, rowIndex).reduce((sum, row) => sum + row.cols, 0));

  return (
    <div className="relative mx-auto flex max-h-full w-full items-center justify-center" role="img" aria-label="Skica teknike e produktit">
      <div className="relative" style={{ width: stageW, height: stageH }}>
        <div className="absolute left-1/2 top-1/2" style={{ width: frameOuterW, height: frameOuterH, transform: `translate(-50%, calc(-50% + ${shutterPx / 2}px))` }}>
          {config.roleta && <PreviewRoleta width={frameOuterW} height={shutterPx} />}
          {config.shtesa.map((sh) => (
            <ShteseBand key={sh.id} side={sh.side} width={Math.max(8, sh.widthMm * previewScale)} frameW={frameOuterW} frameH={frameOuterH} label={`${mm(sh.widthMm)}MM`} />
          ))}

          {layout.shape ? (
            <ShapePreview shape={layout.shape} width={frameOuterW} height={frameOuterH} onClick={onPaneClick ? () => onPaneClick(0) : undefined} />
          ) : (
            <div
              className="relative z-10 rounded-sm border-[7px] border-white bg-transparent p-0 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2),inset_0_0_2px_rgba(0,0,0,0.3)] transition-all duration-500"
              style={{ width: frameOuterW, height: frameOuterH }}
            >
              <div className="absolute inset-0 -z-20 bg-slate-200" />
              <div className="pointer-events-none absolute inset-[-7px] border border-slate-500" />
              <div className="pointer-events-none absolute inset-0 z-20 border border-slate-400" />
              <CornerMarks />
              <div className="relative flex h-full w-full flex-col bg-slate-200">
                {modelRows.map((row, rowIndex) => {
                  const rowStart = rowStarts[rowIndex] ?? 0;
                  return (
                    <div key={`row-${rowIndex}`} className="contents">
                      <div className="flex min-h-0 w-full" style={{ flex: row.hf }}>
                        {Array.from({ length: row.cols }).map((_, colIndex) => {
                          const thisPane = rowStart + colIndex;
                          const opening = (config.openings?.[thisPane] ?? "fiks") as OpeningType;
                          return (
                            <div key={`pane-${rowIndex}-${colIndex}`} className="relative min-w-0 flex-1 bg-slate-200">
                              <GlassPane opening={opening} onClick={onPaneClick ? () => onPaneClick(thisPane) : undefined} />
                            </div>
                          );
                        }).flatMap((pane, colIndex, arr) => colIndex < arr.length - 1 ? [
                          pane,
                          <div
                            key={`vm-${rowIndex}-${colIndex}`}
                            className="relative flex h-full items-center justify-center border-x border-slate-400 bg-white shadow-[inset_0_0_2px_rgba(0,0,0,0.1)]"
                            style={{ width: mullionPx }}
                            title="Profil T-Shtyllë"
                          >
                            <div className="absolute inset-y-0 w-px bg-slate-300" />
                          </div>,
                        ] : [pane])}
                      </div>
                      {rowIndex < modelRows.length - 1 && (
                        <div
                          className="relative flex w-full items-center justify-center border-y border-slate-400 bg-white shadow-[inset_0_0_2px_rgba(0,0,0,0.1)]"
                          style={{ height: mullionPx }}
                          title="Profil T-Shtyllë"
                        >
                          <div className="absolute inset-x-0 h-px bg-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <HtmlDimLines width={frameOuterW} height={frameOuterH} cols={layout.mainCols} W={ew} H={eh} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function layoutRows(config: WindowConfig) {
  if (config.modelType === "custom") {
    const cols = Math.min(6, Math.max(1, Math.round(config.customVerticalMullions ?? 1) + 1));
    const rows = Math.min(6, Math.max(1, Math.round(config.customHorizontalMullions ?? 0) + 1));
    return Array.from({ length: rows }, () => ({ hf: 1, cols }));
  }
  return (MODELS[config.modelType] ?? MODELS.njeshe).rows;
}

function PreviewRoleta({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="absolute left-0 z-0 rounded-[2px] border border-slate-400 bg-slate-300/60"
      style={{ top: -height - 4, width, height }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="absolute left-1 right-1 border-t border-slate-400/60" style={{ top: ((i + 1) * height) / 7 }} />
      ))}
    </div>
  );
}

function ShteseBand({
  side,
  width,
  frameW,
  frameH,
  label,
}: {
  side: WindowConfig["shtesa"][number]["side"];
  width: number;
  frameW: number;
  frameH: number;
  label: string;
}) {
  if (!width) return null;
  const vertical = side === "Majtas" || side === "Djathtas";
  const style: CSSProperties = {
    width: vertical ? width : frameW,
    height: vertical ? frameH : width,
    left: side === "Djathtas" ? frameW : 0,
    top: side === "Poshtë" ? frameH : 0,
    transform: side === "Majtas" ? `translateX(${-width}px)` : side === "Lart" ? `translateY(${-width}px)` : undefined,
    backgroundImage: "repeating-linear-gradient(45deg, rgba(148,163,184,0.28) 0 5px, rgba(203,213,225,0.38) 5px 10px)",
  };
  return (
    <div className="absolute z-0 grid place-items-center border border-slate-500/60 text-[10px] font-semibold tracking-wide text-slate-500" style={style}>
      <span className={vertical ? "-rotate-90" : ""}>SHTESË {label}</span>
    </div>
  );
}

function ShapePreview({
  shape,
  width,
  height,
  onClick,
}: {
  shape: NonNullable<ReturnType<typeof computeLayout>["shape"]>;
  width: number;
  height: number;
  onClick?: () => void;
}) {
  const paths: Record<string, { outer: string; inner: string }> = {
    triangle: { outer: "M 0 110 L 110 110 L 55 0 Z", inner: "M 11 102 L 99 102 L 55 15 Z" },
    trapez: { outer: "M 0 110 L 110 110 L 110 0 L 0 44 Z", inner: "M 7 103 L 103 103 L 103 10.3 L 7 48.7 Z" },
    pentagon: { outer: "M 0 110 L 110 110 L 110 38.5 L 55 0 L 0 38.5 Z", inner: "M 7 103 L 103 103 L 103 42.1 L 55 8.5 L 7 42.1 Z" },
    arch: { outer: "M 0 110 L 0 49 C 0 18 24 0 55 0 C 86 0 110 18 110 49 L 110 110 Z", inner: "M 8 102 L 8 50 C 8 25 28 8 55 8 C 82 8 102 25 102 50 L 102 102 Z" },
    circle: { outer: "", inner: "" },
  };
  return (
    <button
      type="button"
      className={cn("relative z-10 block bg-transparent p-0", onClick && "cursor-pointer")}
      style={{ width, height }}
      onClick={onClick}
      aria-label="Kliko për të ndryshuar hapjen"
    >
      <svg viewBox="0 0 110 110" className="h-full w-full overflow-visible" preserveAspectRatio="none">
        {shape === "circle" ? (
          <>
            <circle cx="55" cy="55" r="52" fill="rgba(212,212,216,0.12)" stroke="#a1a1aa" strokeWidth="4" />
            <circle cx="55" cy="55" r="43" fill="#ffffff" stroke="#d4d4d8" strokeWidth="3" />
          </>
        ) : (
          <>
            <path d={paths[shape].outer} fill="rgba(212,212,216,0.12)" stroke="#a1a1aa" strokeWidth="4" strokeLinejoin="round" />
            <path d={paths[shape].inner} fill="#ffffff" stroke="#d4d4d8" strokeWidth="3" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </button>
  );
}

function CornerMarks() {
  return (
    <>
      <div className="pointer-events-none absolute left-[-7px] top-[-7px] h-px w-[10px] origin-left rotate-45 bg-slate-400" />
      <div className="pointer-events-none absolute right-[-7px] top-[-7px] h-px w-[10px] origin-right -rotate-45 bg-slate-400" />
      <div className="pointer-events-none absolute bottom-[-7px] left-[-7px] h-px w-[10px] origin-left -rotate-45 bg-slate-400" />
      <div className="pointer-events-none absolute bottom-[-7px] right-[-7px] h-px w-[10px] origin-right rotate-45 bg-slate-400" />
    </>
  );
}

function GlassPane({ opening, onClick }: { opening: OpeningType; onClick?: () => void }) {
  const open = opening !== "fiks";
  return (
    <button
      type="button"
      className={cn("group relative h-full w-full border-0 bg-transparent p-0 text-left transition-all duration-300", onClick && "cursor-pointer")}
      onClick={onClick}
      aria-label="Kliko për të ndryshuar hapjen"
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className={cn("absolute inset-0 z-0 bg-sky-400/10 transition-colors duration-500", open ? "m-[10px]" : "m-0")}>
          <div className="pointer-events-none absolute left-[-50%] top-[-50%] h-[200%] w-[200%] rotate-12 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-10" />
          <div className="absolute left-[15%] top-[5%] h-[90%] w-[4px] rotate-12 bg-white/20 blur-[1px]" />
          <div className="absolute left-[35%] top-[15%] h-[70%] w-[2px] rotate-12 bg-white/15 blur-[0.5px]" />
          <div className="absolute left-[60%] top-[40%] h-[40%] w-px rotate-12 bg-white/10" />
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-white/10 to-transparent" />
        </div>
      </div>
      {open && (
        <div className="pointer-events-none absolute inset-0 z-10 border-[10px] border-white">
          <div className="absolute inset-0 border border-slate-400/80" />
        </div>
      )}
      <OpeningOverlay type={opening} />
      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-10 transition-opacity group-hover:opacity-20">
        <div className="absolute h-px w-1/2 bg-white" />
        <div className="absolute h-1/2 w-px bg-white" />
      </div>
      <span className="absolute inset-0 z-30" />
    </button>
  );
}

function OpeningOverlay({ type }: { type: OpeningType }) {
  if (type === "fiks") return null;
  const casement =
    type === "majtas" || type === "majtas-kip"
      ? "M 11 11 L 89 50 L 11 89"
      : type === "djathtas" || type === "djathtas-kip"
        ? "M 89 11 L 11 50 L 89 89"
        : null;
  const tilt = type === "kip" || type === "majtas-kip" || type === "djathtas-kip"
    ? "M 11 89 L 50 11 L 89 89"
    : null;
  return (
    <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.8">
        {casement && <path d={casement} strokeLinecap="round" strokeLinejoin="round" />}
        {tilt && <path d={tilt} strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    </svg>
  );
}

function HtmlDimLines({ width, height, cols, W, H }: { width: number; height: number; cols: number; W: number; H: number }) {
  return (
    <>
      <div className="absolute bottom-[-52px] left-0 flex text-slate-500" style={{ width }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="relative flex h-10 flex-1 items-start justify-center border-t border-slate-400">
            <div className="absolute left-0 top-[-4px] h-2 border-l border-slate-400" />
            {i === cols - 1 && <div className="absolute right-0 top-[-4px] h-2 border-l border-slate-400" />}
            <input
              readOnly
              tabIndex={-1}
              value={String(Math.round(W / cols))}
              className="mt-1 w-10 bg-transparent text-center text-[13px] font-light text-slate-700 outline-none"
              aria-label="Gjerësia e ndarjes"
            />
          </div>
        ))}
      </div>
      <div className="absolute right-[-52px] top-0 flex flex-col text-slate-500" style={{ height }}>
        <div className="absolute bottom-0 left-[-4px] h-full border-l border-slate-400" />
        <div className="absolute left-[-8px] top-0 w-2 border-t border-slate-400" />
        <div className="absolute bottom-0 left-[-8px] w-2 border-t border-slate-400" />
        <input
          readOnly
          tabIndex={-1}
          value={String(Math.round(H))}
          className="absolute left-1/2 top-1/2 w-10 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-transparent text-center text-[13px] font-light text-slate-700 outline-none"
          aria-label="Lartësia"
        />
      </div>
    </>
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
