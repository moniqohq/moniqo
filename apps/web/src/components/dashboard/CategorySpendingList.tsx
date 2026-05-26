'use client'

import { motion } from 'framer-motion'
import { mockCategorySpending } from '@/mock/data'
import { formatCurrencyCompact } from '@/lib/utils'

export function CategorySpendingList() {
  return (
    <div className="space-y-3">
      {mockCategorySpending.map((cat, i) => {
        const pct = Math.min((cat.amount / cat.budget) * 100, 100)
        const overBudget = cat.amount > cat.budget
        return (
          <motion.div
            key={cat.category}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
              style={{ background: `${cat.color}20` }}
            >
              {cat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium text-[#A8B4CC]">{cat.category}</span>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className={overBudget ? 'text-[#EF4444]' : 'text-[#A8B4CC]'}>
                    {formatCurrencyCompact(cat.amount)}
                  </span>
                  <span className="text-[#2A3A54]">/</span>
                  <span className="text-[#5A6A85]">{formatCurrencyCompact(cat.budget)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-[#1E2B42] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: overBudget ? '#EF4444' : cat.color }}
                />
              </div>
            </div>
            <div className="w-10 flex-shrink-0 text-right">
              <span
                className="text-[12px] font-medium tabular-nums"
                style={{ color: overBudget ? '#EF4444' : '#5A6A85' }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
