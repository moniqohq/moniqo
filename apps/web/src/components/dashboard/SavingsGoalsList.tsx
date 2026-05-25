'use client'

import { motion } from 'framer-motion'
import { mockSavingsGoals } from '@/mock/data'
import { formatCurrencyCompact, formatDate } from '@/lib/utils'

export function SavingsGoalsList() {
  return (
    <div className="space-y-3">
      {mockSavingsGoals.map((goal, i) => {
        const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
        return (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0 mt-0.5"
              style={{ background: `${goal.color}20` }}
            >
              {goal.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[13px] font-medium text-white">{goal.name}</span>
                <span className="text-[11px] text-[#5A6A85]">{pct.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-[#5A6A85]">
                  {formatCurrencyCompact(goal.currentAmount)} of {formatCurrencyCompact(goal.targetAmount)}
                </span>
                {goal.targetDate && (
                  <span className="text-[10px] text-[#2A3A54]">
                    {formatDate(goal.targetDate, 'short')}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-[#1E2B42] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.06 + 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: goal.color }}
                />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
