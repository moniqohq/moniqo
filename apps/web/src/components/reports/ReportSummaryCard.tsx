'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtINR } from './types'

interface Props {
  budgeted: number
  spent: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name?: string }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-[#A8B4CC]">{payload[0].value}%</p>
    </div>
  )
}

export function ReportSummaryCard({ budgeted, spent }: Props) {
  const remaining = budgeted - spent
  const pctUsed = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0
  const pctRemaining = 100 - pctUsed

  const donutData = [
    { name: 'Spent',     value: pctUsed },
    { name: 'Remaining', value: pctRemaining },
  ]

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl px-5 py-4">
      <div className="flex items-start justify-between">
        {/* left: title + metrics */}
        <div className="flex-1">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-[14px] font-semibold text-white">Summary</h2>
            <span className="text-[11px] text-[#5A6A85]">All amounts in INR</span>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {/* Total Budgeted */}
            <div>
              <p className="text-[11px] text-[#5A6A85] uppercase tracking-wider mb-1">Total Budgeted</p>
              <p className="text-[20px] font-semibold text-white tracking-tight">{fmtINR(budgeted)}</p>
            </div>

            {/* Total Spent */}
            <div>
              <p className="text-[11px] text-[#5A6A85] uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-[20px] font-semibold text-white tracking-tight">{fmtINR(spent)}</p>
            </div>

            {/* Remaining */}
            <div>
              <p className="text-[11px] text-[#5A6A85] uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-[20px] font-semibold tracking-tight" style={{ color: '#22C55E' }}>{fmtINR(remaining)}</p>
            </div>

            {/* % Used */}
            <div>
              <p className="text-[11px] text-[#5A6A85] uppercase tracking-wider mb-1">Percent of Budget Used</p>
              <p className="text-[20px] font-semibold text-white mb-2">{pctUsed}%</p>
              <div className="h-1.5 bg-[#1A2438] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pctUsed, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #6C3AED, #9C72FF)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* right: doughnut chart */}
        <div className="flex items-center gap-4 ml-6 shrink-0">
          <div className="w-[96px] h-[96px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={44}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  <Cell fill="#6C3AED" />
                  <Cell fill="#1E2B42" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6C3AED] shrink-0" />
              <span className="text-[12px] text-[#A8B4CC]">Spent</span>
              <span className="text-[12px] font-semibold text-white ml-auto pl-4">{pctUsed}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2A3A52] border border-[#3A4A62] shrink-0" />
              <span className="text-[12px] text-[#A8B4CC]">Remaining</span>
              <span className="text-[12px] font-semibold text-white ml-auto pl-4">{pctRemaining}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
