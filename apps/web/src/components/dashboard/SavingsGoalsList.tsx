'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Plus } from 'lucide-react'
import { mockSavingsGoals } from '@/mock/data'

function fmtAmount(n: number) {
  return n.toLocaleString('en-IN')
}

export function SavingsGoalsList() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col space-y-3 px-5 py-5">
      {mockSavingsGoals.map((goal, i) => {
        const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
        return (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 bg-[#0D1526] border border-[#1E2B42] rounded-xl px-4 py-3"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0 mt-0.5"
              style={{ background: `${goal.color}20` }}
            >
              {goal.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-[14px] font-medium text-white truncate">{goal.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[12px] text-[#5A6A85] tabular-nums">
                    {fmtAmount(goal.currentAmount)} / {fmtAmount(goal.targetAmount)}
                  </span>
                  <span className="text-[12px] text-[#5A6A85]">{pct.toFixed(0)}%</span>
                </div>
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

      <div className="px-5 py-3 border-t border-[#1E2B42] flex items-center justify-between">
        <Link
          href="/goals"
          className="flex items-center gap-1 text-[13px] text-[#6C3AED] hover:text-[#A78BFA] transition-colors"
        >
          View all goals <ArrowUpRight size={12} />
        </Link>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#6C3AED] text-[12px] text-white font-medium hover:bg-[#7C4AFF] transition-colors">
          <Plus size={12} /> New Goal
        </button>
      </div>
    </div>
  )
}
