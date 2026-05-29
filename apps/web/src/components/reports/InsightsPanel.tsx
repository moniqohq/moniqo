'use client'

import { AlertTriangle, CheckCircle, Eye, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnvelopeReport, fmtINR, getRemaining, getPercentUsed, getBudgetStatus } from './types'

interface Insight {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}

function buildInsights(envelopes: EnvelopeReport[]): Insight[] {
  const insights: Insight[] = []

  for (const env of envelopes) {
    const status = getBudgetStatus(env)
    const remaining = getRemaining(env)
    const pct = getPercentUsed(env)

    if (status === 'over') {
      const overage = Math.abs(remaining)
      const overPct = pct - 100
      insights.push({
        icon: <AlertTriangle size={14} />,
        iconBg: 'rgba(239,68,68,0.15)',
        title: `${env.name} is over budget`,
        description: `You've spent ${fmtINR(overage)} (${overPct}%) more than your budget.`,
      })
    } else if (status === 'under' && pct < 50) {
      insights.push({
        icon: <CheckCircle size={14} />,
        iconBg: 'rgba(34,197,94,0.15)',
        title: `Great job on ${env.name.toLowerCase()}!`,
        description: `You're under budget by ${fmtINR(remaining)} (${100 - pct}%).`,
      })
    } else if (status === 'near') {
      insights.push({
        icon: <Eye size={14} />,
        iconBg: 'rgba(245,158,11,0.15)',
        title: `${env.name} looks good`,
        description: `You're within ${100 - pct}% of your budget.`,
      })
    }
  }

  return insights.slice(0, 4)
}

interface Props {
  envelopes: EnvelopeReport[]
}

export function InsightsPanel({ envelopes }: Props) {
  const insights = buildInsights(envelopes)

  const iconColorMap: Record<string, string> = {
    'rgba(239,68,68,0.15)':  '#EF4444',
    'rgba(34,197,94,0.15)':  '#22C55E',
    'rgba(245,158,11,0.15)': '#F59E0B',
  }

  return (
    <div className="bg-[#0F1623] border border-[#1E2B42] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1E2B42]">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#F59E0B]" />
          <h2 className="text-[14px] font-semibold text-white">Insights</h2>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {insights.length === 0 ? (
          <p className="text-[12px] text-[#5A6A85] text-center py-4">No insights available.</p>
        ) : (
          insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#0A1020] border border-[#1E2B42]/60">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: ins.iconBg, color: iconColorMap[ins.iconBg] || '#6C3AED' }}
              >
                {ins.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#E8EEF8] leading-snug">{ins.title}</p>
                <p className="text-[11px] text-[#5A6A85] mt-0.5 leading-relaxed">{ins.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-5 pb-4">
        <button className="text-[12px] text-[#6C3AED] hover:text-[#9C72FF] transition-colors">
          View all insights →
        </button>
      </div>
    </div>
  )
}
