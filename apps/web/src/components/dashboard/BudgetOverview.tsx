'use client'

import { Wallet } from 'lucide-react'
import { mockBudgetOverview } from '@/mock/data'
import { formatCurrency } from '@/lib/utils'

export function BudgetOverview() {
  const { totalBudget, spent, remaining } = mockBudgetOverview
  const pct = Math.round((spent / totalBudget) * 100)

  return (
    <div className="flex flex-col h-full">
      {/* Icon + status */}
      <div className="flex flex-col items-center gap-2 py-5">
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: 'rgba(0,230,180,0.08)', boxShadow: '0 0 28px 4px rgba(0,230,180,0.18)' }}
        >
          <Wallet size={28} style={{ color: '#00E6B4' }} />
        </div>
        <p className="text-[14px] font-semibold text-white mt-1">You&apos;re on track!</p>
        <p className="text-[11px] text-[#5A6A85] text-center leading-tight px-2">
          You&apos;ve used {pct}% of your<br />total budget
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-[#1E2B42] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00C49A, #00E6B4)' }}
            />
          </div>
          <span className="text-[11px] text-[#A8B4CC] shrink-0">{pct}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 space-y-3 flex-1">
        <div>
          <p className="text-[11px] text-[#5A6A85]">Total Budget</p>
          <p className="text-[15px] font-semibold text-white">{formatCurrency(totalBudget)}</p>
        </div>
        <div>
          <p className="text-[11px] text-[#5A6A85]">Spent</p>
          <p className="text-[15px] font-semibold text-[#EF4444]">{formatCurrency(spent)}</p>
        </div>
        <div>
          <p className="text-[11px] text-[#5A6A85]">Remaining</p>
          <p className="text-[15px] font-semibold text-[#00E6B4]">{formatCurrency(remaining)}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-4 pb-5">
        <button className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'rgba(108,58,237,0.55)', border: '1px solid rgba(108,58,237,0.3)' }}
        >
          View Budget
        </button>
      </div>
    </div>
  )
}
