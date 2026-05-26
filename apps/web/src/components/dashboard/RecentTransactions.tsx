'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { mockTransactions } from '@/mock/data'
import { formatCurrency, formatTableDate, cn } from '@/lib/utils'

type Status = 'Done' | 'Reconciled' | 'Pending'

const STATUSES: Status[] = ['Done', 'Reconciled', 'Pending', 'Done', 'Done', 'Reconciled', 'Pending', 'Done', 'Reconciled', 'Pending', 'Done', 'Reconciled']

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Done:       'bg-[rgba(34,197,94,0.12)] text-[#4ADE80]',
    Reconciled: 'bg-[rgba(99,179,237,0.12)] text-[#7DD3FC]',
    Pending:    'bg-[rgba(245,158,11,0.12)] text-[#FBB74B]',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide', styles[status])}>
      {status}
    </span>
  )
}

export function RecentTransactions() {
  const recent = mockTransactions.slice(0, 7)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              <th className="px-5 py-2.5 text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider">Merchant</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider">Envelope</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider">Date</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider text-right">Amount</th>
              <th className="px-5 py-2.5 text-[11px] font-semibold text-[#5A6A85] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B42]">
            {recent.map((tx, i) => {
              const amountColor =
                tx.type === 'income' ? 'text-[#4ADE80]'
                : tx.type === 'transfer' ? (tx.amount >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')
                : 'text-[#F87171]'

              return (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-[#0D1828] transition-colors cursor-pointer"
                >
                  {/* Merchant */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none"
                        style={{ backgroundColor: tx.payeeColor ?? '#1E2B42' }}
                      >
                        {tx.payee[0]}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#E8EEF8] leading-tight truncate max-w-[140px]">{tx.payee}</p>
                        {tx.memo && (
                          <p className="text-[11px] text-[#5A6A85] leading-tight truncate max-w-[140px]">{tx.memo}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Envelope */}
                  <td className="px-4 py-3">
                    {tx.envelopeName ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-[11px] flex-shrink-0"
                          style={{ backgroundColor: tx.envelopeColor ?? '#1E2B42' }}
                        >
                          {tx.envelopeIcon ?? tx.envelopeName[0]}
                        </div>
                        <span className="text-[13px] text-[#A8B4CC] whitespace-nowrap">{tx.envelopeName}</span>
                      </div>
                    ) : (
                      <span className="text-[#2A3A54] text-sm select-none">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-[13px] text-[#A8B4CC] whitespace-nowrap">
                    {formatTableDate(tx.date)}
                  </td>

                  {/* Amount */}
                  <td className={cn('px-4 py-3 text-[13px] font-semibold tabular-nums text-right whitespace-nowrap', amountColor)}>
                    {tx.amount >= 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={STATUSES[i % STATUSES.length]} />
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-[#1E2B42]">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-[13px] text-[#6C3AED] hover:text-[#A78BFA] transition-colors"
        >
          View all transactions <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  )
}
