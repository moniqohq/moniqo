'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { mockWeeklyCashFlow } from '@/mock/data'
import { formatCurrencyCompact } from '@/lib/utils'

function fmtK(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(0)}K`
  return `₹${abs}`
}

const INCOME_COLOR  = '#22C55E'
const EXPENSE_COLOR = '#EF4444'
const SAVINGS_COLOR = '#A855F7'

const chartData = mockWeeklyCashFlow.map(d => ({
  ...d,
  expensesNeg: -d.expenses,
}))

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey?: string; name?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  const income   = payload.find((p: { dataKey: string; value: number }) => p.dataKey === 'income')
  const expenses = payload.find((p: { dataKey: string; value: number }) => p.dataKey === 'expensesNeg')
  const savings  = payload.find((p: { dataKey: string; value: number }) => p.dataKey === 'savings')
  return (
    <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg px-3 py-2.5 shadow-xl text-[12px] min-w-[170px]">
      <div className="text-[#A8B4CC] mb-2 font-medium">{label}</div>
      {income && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: INCOME_COLOR }} />
          <span className="text-[#5A6A85]">Income</span>
          <span className="text-white font-medium ml-auto">{formatCurrencyCompact(income.value)}</span>
        </div>
      )}
      {expenses && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXPENSE_COLOR }} />
          <span className="text-[#5A6A85]">Expenses</span>
          <span className="text-white font-medium ml-auto">{formatCurrencyCompact(Math.abs(expenses.value))}</span>
        </div>
      )}
      {savings && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SAVINGS_COLOR }} />
          <span className="text-[#5A6A85]">Savings</span>
          <span className="text-white font-medium ml-auto">{formatCurrencyCompact(savings.value)}</span>
        </div>
      )}
    </div>
  )
}

export function MonthlyChart() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: INCOME_COLOR }} />
          <span className="text-[#A8B4CC]">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: EXPENSE_COLOR }} />
          <span className="text-[#A8B4CC]">Expenses</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: SAVINGS_COLOR }} />
          <span className="text-[#A8B4CC]">Savings</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2B42" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#5A6A85', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#5A6A85', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtK}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2A3A55', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="#2A3A55" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="income"
            stroke={INCOME_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: INCOME_COLOR, stroke: '#080C14', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: INCOME_COLOR, stroke: '#080C14', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="expensesNeg"
            stroke={EXPENSE_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: EXPENSE_COLOR, stroke: '#080C14', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: EXPENSE_COLOR, stroke: '#080C14', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="savings"
            stroke={SAVINGS_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: SAVINGS_COLOR, stroke: '#080C14', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: SAVINGS_COLOR, stroke: '#080C14', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
