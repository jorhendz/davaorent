"use client";

import { useState } from "react";

// Chart palette — validated (dataviz six checks, light surface #ffffff):
// series-1 teal #0d9488, series-2 blue #2a78d6. Text stays in ink tokens.
export const SERIES_1 = "#0d9488";
export const SERIES_2 = "#2a78d6";
const GRID = "#e5e7eb";
const AXIS_INK = "#6b7280";

type WeekPoint = { label: string; listings: number; users: number };

// Two-series line chart with gridlines, legend, direct end-labels, and a
// crosshair hover tooltip.
export function WeeklyTrendChart({ data }: { data: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 560;
  const H = 220;
  const PAD = { top: 16, right: 88, bottom: 28, left: 32 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const max = Math.max(1, ...data.map((d) => Math.max(d.listings, d.users)));
  const yMax = Math.ceil(max * 1.2);
  const x = (i: number) => PAD.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  const path = (key: "listings" | "users") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  const ticks = [0, Math.round(yMax / 2), yMax];
  const last = data.length - 1;

  return (
    <div className="relative">
      {/* Legend */}
      <div className="mb-2 flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES_1 }} /> New listings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES_2 }} /> New users
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="New listings and new users per week">
        {/* gridlines */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={AXIS_INK}>
              {t}
            </text>
          </g>
        ))}
        {/* x labels */}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={AXIS_INK}>
            {d.label}
          </text>
        ))}

        {/* crosshair */}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" />
        )}

        {/* lines: 2px, round joins */}
        <path d={path("users")} fill="none" stroke={SERIES_2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("listings")} fill="none" stroke={SERIES_1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* markers on hover (8px, white ring) */}
        {hover !== null && (
          <>
            <circle cx={x(hover)} cy={y(data[hover].users)} r={4} fill={SERIES_2} stroke="#fff" strokeWidth={2} />
            <circle cx={x(hover)} cy={y(data[hover].listings)} r={4} fill={SERIES_1} stroke="#fff" strokeWidth={2} />
          </>
        )}

        {/* direct labels at line ends — ink follows text, dot carries identity */}
        <circle cx={x(last)} cy={y(data[last].listings)} r={3} fill={SERIES_1} />
        <text x={x(last) + 8} y={y(data[last].listings) + 3.5} fontSize={11} fontWeight={600} fill="#374151">
          Listings
        </text>
        <circle cx={x(last)} cy={y(data[last].users)} r={3} fill={SERIES_2} />
        <text x={x(last) + 8} y={y(data[last].users) + 3.5} fontSize={11} fontWeight={600} fill="#374151">
          Users
        </text>

        {/* hover hit targets — full-height columns, bigger than the marks */}
        {data.map((_, i) => (
          <rect
            key={i}
            x={x(i) - iw / (data.length - 1) / 2}
            y={PAD.top}
            width={iw / (data.length - 1)}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {/* tooltip */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: 24,
            transform: x(hover) > W / 2 ? "translateX(-110%)" : "translateX(12px)",
          }}
        >
          <p className="font-semibold text-gray-800">Week of {data[hover].label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIES_1 }} />
            {data[hover].listings} new listing{data[hover].listings === 1 ? "" : "s"}
          </p>
          <p className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIES_2 }} />
            {data[hover].users} new user{data[hover].users === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}

// Single-measure horizontal bars: one hue (magnitude, not identity), thin marks,
// 4px rounded data-end, value labels in ink, per-row hover wash.
export function HBarChart({
  data,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div
          key={d.label}
          className={`grid grid-cols-[110px_1fr_36px] items-center gap-2 rounded-md px-1 py-0.5 text-xs transition ${
            hover === i ? "bg-gray-50" : ""
          }`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate text-gray-600" title={d.label}>
            {d.label}
          </span>
          <div className="h-3.5 overflow-hidden rounded-r">
            <div
              className="h-full rounded-r"
              style={{
                width: `${Math.max(2, (d.value / max) * 100)}%`,
                background: SERIES_1,
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums text-gray-800">{formatValue(d.value)}</span>
        </div>
      ))}
      {data.length === 0 && <p className="py-4 text-center text-xs text-gray-400">No data yet</p>}
    </div>
  );
}
