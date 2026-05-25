'use client'

import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrencyCompact } from '@/lib/utils'

interface StatCardProps {
  label: string
  amount: number
  change?: number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  index?: number
}

export function StatCard({
  label, amount, change, icon: Icon, iconColor = '#6C3AED', iconBg = 'rgba(108,58,237,0.15)', index = 0,
}: StatCardProps) {
  const isPositive = (change ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className="bg-[#0F1623] border border-[#1E2B42] rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#5A6A85] uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
      </div>
      <div>
        <div className="text-[24px] font-semibold text-white tracking-tight leading-none">
          {formatCurrencyCompact(amount)}
        </div>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 mt-1.5 text-[12px]', isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{isPositive ? '+' : ''}{change}% vs last month</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
