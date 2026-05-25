'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { mockAnalytics } from '@/mock/data'
import { formatCurrencyCompact } from '@/lib/utils'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#131C2E] border border-[#1E2B42] rounded-lg px-3 py-2.5 shadow-xl text-[12px]">
      <div className="text-[#A8B4CC] mb-1.5 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#5A6A85] capitalize">{p.name}:</span>
          <span className="text-white font-medium">{formatCurrencyCompact(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={mockAnalytics} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3AED" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6C3AED" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2B42" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#5A6A85', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#5A6A85', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrencyCompact(v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#6C3AED"
          strokeWidth={2}
          fill="url(#incomeGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#6C3AED', stroke: '#080C14', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#EF4444"
          strokeWidth={2}
          fill="url(#expensesGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#EF4444', stroke: '#080C14', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
