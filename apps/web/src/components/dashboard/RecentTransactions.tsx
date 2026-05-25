'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { mockTransactions } from '@/mock/data'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

export function RecentTransactions() {
  const recent = mockTransactions.slice(0, 6)

  return (
    <div>
      <div className="divide-y divide-[#1E2B42]">
        {recent.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 py-2.5 px-5 hover:bg-[#131C2E] transition-colors cursor-pointer"
          >
            {/* Payee initial */}
            <div className="w-7 h-7 rounded-full bg-[#1E2B42] flex items-center justify-center text-[11px] font-medium text-[#A8B4CC] flex-shrink-0">
              {tx.payee[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-white truncate">{tx.payee}</div>
              <div className="text-[11px] text-[#5A6A85] truncate">
                {tx.envelopeName ?? tx.accountName} · {formatDate(tx.date, 'short')}
              </div>
            </div>
            <div className={cn(
              'text-[13px] font-semibold tabular-nums flex-shrink-0',
              tx.amount > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]',
            )}>
              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-[#1E2B42]">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-[12px] text-[#6C3AED] hover:text-[#A78BFA] transition-colors"
        >
          View all transactions <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  )
}
