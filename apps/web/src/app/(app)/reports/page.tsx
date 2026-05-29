import Link from 'next/link'
import { BarChart2, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Reports — Moniqo' }

export default function ReportsPage() {
  return (
    <div className="layout-page py-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-white tracking-tight">Reports</h1>
        <p className="text-[13px] text-[#5A6A85] mt-0.5">Analyse your budget and spending patterns.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/reports/spending-by-envelope"
          className="group bg-[#0F1623] border border-[#1E2B42] rounded-xl p-5 hover:border-[#6C3AED]/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(108,58,237,0.15)] flex items-center justify-center">
              <BarChart2 size={18} className="text-[#6C3AED]" />
            </div>
            <ArrowRight size={14} className="text-[#3A4A60] group-hover:text-[#6C3AED] transition-colors" />
          </div>
          <h2 className="text-[14px] font-semibold text-white mb-1">Spending by Envelope</h2>
          <p className="text-[12px] text-[#5A6A85] leading-relaxed">
            Compare spending against budgeted amounts across all your envelopes.
          </p>
        </Link>
      </div>
    </div>
  )
}
