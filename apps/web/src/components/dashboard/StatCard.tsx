'use client'

import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'
import { cn, formatCurrencyCompact } from '@/lib/utils'

interface StatCardProps {
  label: string
  amount: number
  change?: number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  accentColor?: string
  sparkData?: { v: number }[]
  index?: number
}

function SparkTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; dataKey?: string; name?: string }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#131C2E] border border-[#1E2B42] rounded px-2 py-1 text-[11px] text-white shadow-xl">
      {formatCurrencyCompact(payload[0].value)}
    </div>
  )
}

export function StatCard({
  label, amount, change, icon: Icon,
  iconColor = '#6C3AED', iconBg = 'rgba(108,58,237,0.15)',
  accentColor = '#6C3AED',
  sparkData,
  index = 0,
}: StatCardProps) {
  const isPositive = (change ?? 0) >= 0
  const gradId = `spark-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className="bg-[#0F1623] border border-[#1E2B42] rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#5A6A85] uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
      </div>

      <div>
        <div className="text-[24px] font-semibold text-white tracking-tight leading-none">
          {formatCurrencyCompact(amount)}
        </div>
        <div className={cn('flex items-center gap-1 mt-1.5 text-[13px]', change === undefined ? 'invisible' : isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{change ?? 0}% vs last month</span>
        </div>
      </div>

      {sparkData && (
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<SparkTooltip />} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 3, fill: accentColor, stroke: '#080C14', strokeWidth: 1.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}
