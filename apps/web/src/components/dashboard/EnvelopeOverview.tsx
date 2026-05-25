'use client'

import { motion } from 'framer-motion'
import { mockEnvelopes } from '@/mock/data'
import { formatCurrencyCompact, cn } from '@/lib/utils'

export function EnvelopeOverview() {
  const essentials = mockEnvelopes.filter(e => e.groupName === 'Essentials')
  const lifestyle  = mockEnvelopes.filter(e => e.groupName === 'Lifestyle')

  const renderGroup = (label: string, envelopes: typeof mockEnvelopes) => (
    <div>
      <div className="text-[10px] font-semibold text-[#2A3A54] uppercase tracking-widest mb-2 px-1">
        {label}
      </div>
      <div className="space-y-1.5">
        {envelopes.map((env, i) => {
          const pct = Math.min((env.spent / env.allocated) * 100, 100)
          const low = env.available <= env.allocated * 0.1
          const empty = env.available <= 0
          return (
            <motion.div
              key={env.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#131C2E] transition-colors cursor-pointer"
            >
              <span className="text-[13px] flex-shrink-0">{env.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[12px] text-[#A8B4CC] truncate">{env.name}</span>
                  <span className={cn(
                    'text-[11px] font-medium tabular-nums',
                    empty ? 'text-[#EF4444]' : low ? 'text-[#F59E0B]' : 'text-[#22C55E]',
                  )}>
                    {formatCurrencyCompact(env.available)}
                  </span>
                </div>
                <div className="h-1 bg-[#1E2B42] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: empty ? '#EF4444' : low ? '#F59E0B' : env.color,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {renderGroup('Essentials', essentials)}
      {renderGroup('Lifestyle', lifestyle)}
    </div>
  )
}
