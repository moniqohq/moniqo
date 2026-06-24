/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrencyCompact } from "@/lib/utils";

export interface ChartPoint {
  date: string;
  value: number;
}

interface Props {
  data: ChartPoint[];
}

function CustomDot(props: { cx?: number; cy?: number; [key: string]: unknown }) {
  const { cx = 0, cy = 0 } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#0B1120" stroke="#7C3AED" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2} fill="#A78BFA" />
    </g>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey?: string; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1E2B42] bg-[#131C2E] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 text-[#5A6A85]">{label}</p>
      <p className="font-bold text-white">{formatCurrencyCompact(payload[0].value)}</p>
    </div>
  );
}

export function BalanceChart({ data }: Props) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);

  const step = 5000;
  const start = 60000;
  const ticks: number[] = [];
  for (let t = start; t <= max + step; t += step) ticks.push(t);

  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="#1A2540" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={["May 15", "May 22", "May 29", "Jun 05", "Jun 12"]}
          tick={{ fontSize: 10, fill: "#3A4A60", fontFamily: "system-ui, sans-serif" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          ticks={ticks}
          domain={[60000, (dataMax: number) => Math.ceil((dataMax - 60000) / step) * step + 60000]}
          tick={{ fontSize: 10, fill: "#3A4A60", fontFamily: "system-ui, sans-serif" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrencyCompact(v)}
          width={52}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2A3A54", strokeWidth: 1 }} />
        <Line
          type="linear"
          dataKey="value"
          stroke="#A78BFA"
          strokeWidth={1.8}
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: "#A78BFA", stroke: "#0B1120", strokeWidth: 2 }}
        ></Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
