'use client';

/**
 * Recharts client components for the researcher dashboard.
 * Kept dependency-only-on-recharts and CSP-safe (SVG output, no network).
 */

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BAND_COLORS, bandForDvi } from '@/lib/dashboard-data';

const DVI_COLOR = '#2563eb'; // blue-600
const AXIS_COLOR = '#9ca3af'; // gray-400
const LABEL_STYLE = { fontSize: 12, fill: '#374151' } as const;

export interface ScoreDatum {
  label: string;
  value: number | null;
}

/**
 * Horizontal bar chart for 0–5 average scores (DVI by group, or the four
 * barrier components). Optionally colours each bar by its DVI band.
 */
export function ScoreBarChart({
  data,
  colorByBand = false,
  height = 240,
}: {
  data: ScoreDatum[];
  colorByBand?: boolean;
  height?: number;
}) {
  const rows = data.map((d) => ({ label: d.label, value: d.value ?? 0 }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
        <XAxis
          type="number"
          domain={[0, 5]}
          tickCount={6}
          tick={{ fontSize: 12 }}
          stroke={AXIS_COLOR}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tick={{ fontSize: 12 }}
          stroke={AXIS_COLOR}
        />
        <Tooltip
          cursor={{ fill: 'rgba(37,99,235,0.06)' }}
          formatter={(value: unknown) => [Number(value).toFixed(2), 'Avg DVI']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={34}>
          {rows.map((r, i) => (
            <Cell key={i} fill={colorByBand ? BAND_COLORS[bandForDvi(r.value)] : DVI_COLOR} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: unknown) => Number(value).toFixed(2)}
            style={LABEL_STYLE}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Vertical bar chart of DVI band counts (Weak → Strong), coloured per band. */
export function BandBarChart({
  data,
  height = 240,
}: {
  data: { band: string; interviews: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: 8 }}>
        <XAxis dataKey="band" tick={{ fontSize: 12 }} stroke={AXIS_COLOR} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke={AXIS_COLOR} />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          formatter={(value: unknown) => [Number(value), 'Interviews']}
        />
        <Bar dataKey="interviews" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={64}>
          {data.map((r, i) => (
            <Cell key={i} fill={BAND_COLORS[r.band] ?? '#6b7280'} />
          ))}
          <LabelList dataKey="interviews" position="top" style={LABEL_STYLE} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
