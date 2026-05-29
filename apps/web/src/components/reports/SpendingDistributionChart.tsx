'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { EnvelopeReport, CHART_COLORS, fmtINR } from './types'

interface Props {
  envelopes: EnvelopeReport[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-[#A8B4CC]">{fmtINR(payload[0].value)}</p>
    </div>
  )
}

export function SpendingDistributionChart({ envelopes }: Props) {
  const totalSpent = envelopes.reduce((s, e) => s + e.spent, 0)

  const top5 = [...envelopes].sort((a, b) => b.spent - a.spent).slice(0, 5)
  const othersSpent = envelopes
    .filter(e => !top5.find(t => t.id === e.id))
    .reduce((s, e) => s + e.spent, 0)

  const chartData = [
    ...top5.map(e => ({ name: e.name, value: e.spent })),
    ...(othersSpent > 0 ? [{ name: 'Others', value: othersSpent }] : []),
  ]

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1E2B42]">
        <h2 className="text-[14px] font-semibold text-white">Spending Distribution</h2>
        <p className="text-[12px] text-[#5A6A85] mt-0.5">By amount spent</p>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* Doughnut chart */}
          <div className="relative w-[140px] h-[140px] shrink-0">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[9px] text-[#5A6A85] uppercase tracking-wider leading-none">Total Spent</p>
              <p className="text-[13px] font-bold text-white leading-tight mt-0.5">{fmtINR(totalSpent)}</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 min-w-0">
            {chartData.map((item, i) => {
              const pct = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0
              return (
                <div key={item.name} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-[12px] text-[#A8B4CC] truncate flex-1">{item.name}</span>
                  <span className="text-[11px] text-[#E8EEF8] font-medium shrink-0">{fmtINR(item.value)}</span>
                  <span className="text-[11px] text-[#5A6A85] w-7 text-right shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
