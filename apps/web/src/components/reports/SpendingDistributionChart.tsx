"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { EnvelopeReport, CHART_COLORS, fmtINR } from "./types";

interface Props {
  envelopes: EnvelopeReport[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1E2B42] bg-[#131C2E] px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-[#A8B4CC]">{fmtINR(payload[0].value)}</p>
    </div>
  );
}

export function SpendingDistributionChart({ envelopes }: Props) {
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0);

  const top5 = [...envelopes].sort((a, b) => b.spent - a.spent).slice(0, 5);
  const othersSpent = envelopes
    .filter((e) => !top5.find((t) => t.id === e.id))
    .reduce((s, e) => s + e.spent, 0);

  const chartData = [
    ...top5.map((e) => ({ name: e.name, value: e.spent })),
    ...(othersSpent > 0 ? [{ name: "Others", value: othersSpent }] : []),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
      <div className="border-b border-[#1E2B42] px-5 py-4">
        <h2 className="text-[14px] font-semibold text-white">Spending Distribution</h2>
        <p className="mt-0.5 text-[12px] text-[#5A6A85]">By amount spent</p>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* Doughnut chart */}
          <div className="relative h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={66}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={2}
                  stroke="#0F1623"
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[9px] uppercase leading-none tracking-wider text-[#5A6A85]">
                Total Spent
              </p>
              <p className="mt-0.5 text-[13px] font-bold leading-tight text-white">
                {fmtINR(totalSpent)}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="min-w-0 flex-1 space-y-2">
            {chartData.map((item, i) => {
              const pct = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
              return (
                <div key={item.name} className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-[12px] text-[#A8B4CC]">{item.name}</span>
                  <span className="shrink-0 text-[11px] font-medium text-[#E8EEF8]">
                    {fmtINR(item.value)}
                  </span>
                  <span className="w-7 shrink-0 text-right text-[11px] text-[#5A6A85]">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
