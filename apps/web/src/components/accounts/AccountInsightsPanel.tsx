'use client'

import {
  Plus, ArrowLeftRight, CheckCircle, Download,
  BarChart2, Archive, TrendingUp, TrendingDown, Lock,
  ArrowRight,
} from 'lucide-react'
import { mockTransactions } from '@/mock/data'
import { formatCurrency, cn } from '@/lib/utils'

interface Props { accountId: string }

const QUICK_ACTIONS = [
  {
    icon: <Plus size={16} />,
    color: '#6C3AED', bg: 'rgba(108,58,237,0.15)',
    title: 'Create Transaction',
    desc: 'Record a new transaction',
  },
  {
    icon: <ArrowLeftRight size={16} />,
    color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',
    title: 'Record Transfer',
    desc: 'Move money between accounts',
  },
  {
    icon: <CheckCircle size={16} />,
    color: '#22C55E', bg: 'rgba(34,197,94,0.15)',
    title: 'Reconcile Balance',
    desc: 'Verify cleared transactions',
  },
  {
    icon: <Download size={16} />,
    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',
    title: 'Export Transactions',
    desc: 'Download CSV or PDF',
  },
  {
    icon: <BarChart2 size={16} />,
    color: '#06B6D4', bg: 'rgba(6,182,212,0.15)',
    title: 'View Reports',
    desc: 'Account spending insights',
  },
  {
    icon: <Archive size={16} />,
    color: '#6B7280', bg: 'rgba(107,114,128,0.12)',
    title: 'Archive Account',
    desc: 'Hide from active accounts',
  },
]

export function AccountInsightsPanel({ accountId }: Props) {
  const txns = mockTransactions.filter(t => t.accountId === accountId)
  const inflows  = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const outflows = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const net      = inflows - outflows

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[#1A2540]">
          <h3 className="text-sm font-bold text-white">Quick Actions</h3>
        </div>
        <div className="p-3 space-y-1">
          {QUICK_ACTIONS.map(({ icon, color, bg, title, desc }) => (
            <button
              key={title}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#0D1525] hover:border-[#1A2540] border border-transparent transition-all group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: bg, color }}
              >
                {icon}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-[#C8D4E8] group-hover:text-white transition-colors leading-tight">{title}</p>
                <p className="text-[10px] text-[#3A4A60] mt-0.5 leading-tight">{desc}</p>
              </div>
              <ArrowRight size={12} className="text-[#3A4A60] group-hover:text-[#6C3AED] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Account Insights */}
      <div className="bg-[#0B1120] border border-[#1A2540] rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[#1A2540]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Account Insights</h3>
            <span className="text-[10px] text-[#3A4A60] bg-[#0D1525] border border-[#1A2540] rounded-full px-2 py-0.5">MTD</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[rgba(34,197,94,0.12)] flex items-center justify-center">
                <TrendingUp size={12} className="text-[#22C55E]" />
              </div>
              <span className="text-xs text-[#5A6A85]">Total Inflows</span>
            </div>
            <span className="text-xs font-bold text-[#4ADE80] tabular-nums">{formatCurrency(inflows)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[rgba(239,68,68,0.12)] flex items-center justify-center">
                <TrendingDown size={12} className="text-[#F87171]" />
              </div>
              <span className="text-xs text-[#5A6A85]">Total Outflows</span>
            </div>
            <span className="text-xs font-bold text-[#F87171] tabular-nums">{formatCurrency(outflows)}</span>
          </div>

          <div className="h-px bg-[#111B2D]" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#5A6A85]">Net Change</span>
            <span className={cn('text-sm font-bold tabular-nums', net >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </div>

          <button className="w-full mt-1 text-xs text-[#7C3AED] hover:text-[#A78BFA] font-semibold text-right transition-colors">
            View Full Report →
          </button>
        </div>
      </div>

      {/* Immutable notice */}
      <div className="bg-[rgba(108,58,237,0.06)] border border-[rgba(108,58,237,0.2)] rounded-2xl p-4 shadow-[0_0_20px_rgba(108,58,237,0.06)]">
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-lg bg-[rgba(108,58,237,0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock size={13} className="text-[#7C3AED]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#A78BFA] mb-1">Immutable Transactions</p>
            <p className="text-[10px] text-[#5A6A85] leading-relaxed">
              Transactions are immutable once recorded. To correct an entry, use a reversing transaction or contact your budget administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
