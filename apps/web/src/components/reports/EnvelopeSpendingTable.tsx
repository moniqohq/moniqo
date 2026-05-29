'use client'

import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EnvelopeReport, fmtINR, getRemaining, getPercentUsed, getBudgetStatus,
} from './types'

interface Props {
  envelopes: EnvelopeReport[]
}

function StatusBar({ pct, status }: { pct: number; status: ReturnType<typeof getBudgetStatus> }) {
  const color =
    status === 'over'  ? '#EF4444' :
    status === 'near'  ? '#F59E0B' : '#22C55E'

  return (
    <div className="w-[72px] h-1.5 bg-[#1A2438] rounded-full overflow-hidden shrink-0">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

export function EnvelopeSpendingTable({ envelopes }: Props) {
  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2B42]">
        <h2 className="text-[14px] font-semibold text-white">Spending by Envelope</h2>
        <button className="flex items-center gap-1.5 text-[12px] text-[#6C3AED] hover:text-[#9C72FF] transition-colors">
          <BarChart2 size={12} />
          View as Chart →
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E2B42]">
              <th className="text-left px-5 py-2.5 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider">Envelope</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider">Budgeted</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider">Spent</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider">Remaining</th>
              <th className="text-right px-5 py-2.5 text-[11px] font-medium text-[#5A6A85] uppercase tracking-wider">% Used</th>
            </tr>
          </thead>
          <tbody>
            {envelopes.map((env, i) => {
              const remaining = getRemaining(env)
              const pct       = getPercentUsed(env)
              const status    = getBudgetStatus(env)
              const pctColor  =
                status === 'over'  ? '#EF4444' :
                status === 'near'  ? '#F59E0B' : '#22C55E'

              return (
                <motion.tr
                  key={env.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="border-b border-[#1E2B42]/50 hover:bg-[#141E30] transition-colors"
                >
                  {/* Envelope name + progress bar */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[12px] shrink-0"
                        style={{ background: env.iconBg }}
                      >
                        {env.iconEmoji}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#E8EEF8] leading-none">{env.name}</p>
                        <div className="mt-1.5">
                          <StatusBar pct={pct} status={status} />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Budgeted */}
                  <td className="px-3 py-3 text-right text-[13px] text-[#A8B4CC]">{fmtINR(env.budgeted)}</td>

                  {/* Spent */}
                  <td className="px-3 py-3 text-right text-[13px] text-[#E8EEF8]">{fmtINR(env.spent)}</td>

                  {/* Remaining */}
                  <td className={cn('px-3 py-3 text-right text-[13px] font-medium', remaining < 0 ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
                    {fmtINR(remaining)}
                  </td>

                  {/* % Used */}
                  <td className="px-5 py-3 text-right">
                    <span className="text-[13px] font-semibold" style={{ color: pctColor }}>{pct}%</span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* legend */}
      <div className="px-5 py-3 flex items-center gap-4">
        {[
          { color: '#22C55E', label: 'Under Budget' },
          { color: '#F59E0B', label: 'Near Budget' },
          { color: '#EF4444', label: 'Over Budget' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[11px] text-[#5A6A85]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
