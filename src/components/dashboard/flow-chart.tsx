"use client";

interface Series {
  label: string;
  color: string;
  points: number[];
}

const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

// Near-flat data matching the observed (mostly empty) account, with a small
// signal so the chart doesn't look broken.
const series: Series[] = [
  { label: "Arkëtuar", color: "#10b981", points: [0, 0, 0, 0, 0, 12] },
  { label: "Shpenzime", color: "#f43f5e", points: [8, 0, 0, 0, 0, 0] },
  { label: "Të hyra", color: "#a3a3a3", points: [0, 0, 0, 0, 0, 24] },
];

const W = 720;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const MAX = 600;
const yTicks = [0, 150, 300, 450, 600];

function x(i: number) {
  const innerW = W - PAD.left - PAD.right;
  return PAD.left + (innerW * i) / (months.length - 1);
}
function y(v: number) {
  const innerH = H - PAD.top - PAD.bottom;
  return PAD.top + innerH * (1 - v / MAX);
}

export function FlowChart() {
  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[300px] w-full min-w-[520px]"
        role="img"
        aria-label="Rrjedha financiare (6 muajt e fundit)"
      >
        {/* grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="currentColor"
              className="text-slate-300"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-slate-400 text-[11px]"
            >
              {t}
            </text>
          </g>
        ))}
        {months.map((m, i) => (
          <text
            key={m}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-400 text-[11px]"
          >
            {m}
          </text>
        ))}
        {/* series */}
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points.map((p, i) => `${x(i)},${y(p)}`).join(" ")}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p)} r={2.5} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-5">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2 w-4 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
