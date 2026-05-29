'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { SlidersHorizontal, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

import { MOCK_ENVELOPES, ReportFilters, getBudgetStatus, getRemaining } from './types'
import { ReportSummaryCard } from './ReportSummaryCard'
import { EnvelopeSpendingTable } from './EnvelopeSpendingTable'
import { SpendingDistributionChart } from './SpendingDistributionChart'
import { OverBudgetEnvelopesCard } from './OverBudgetEnvelopesCard'
import { EnvelopeDetailsTable } from './EnvelopeDetailsTable'
import { InsightsPanel } from './InsightsPanel'
import { ReportFiltersDrawer } from './ReportFiltersDrawer'
import { ReportExportMenu } from './ReportExportMenu'
import { ReportDateRangePicker } from './ReportDateRangePicker'

const DEFAULT_FILTERS: ReportFilters = {
  envelopes: [], types: [], natures: [], statuses: [],
  minAmount: '', maxAmount: '', hideEmpty: false,
}

export function SpendingByEnvelopeReportPage() {
  const today = new Date()
  const [dateFrom, setDateFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dateTo,   setDateTo]   = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  const [filters,  setFilters]  = useState<ReportFilters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    return (
      (filters.envelopes.length > 0 ? 1 : 0) +
      (filters.types.length > 0 ? 1 : 0) +
      (filters.natures.length > 0 ? 1 : 0) +
      (filters.statuses.length > 0 ? 1 : 0) +
      (filters.minAmount || filters.maxAmount ? 1 : 0) +
      (filters.hideEmpty ? 1 : 0)
    )
  }, [filters])

  const filteredEnvelopes = useMemo(() => {
    return MOCK_ENVELOPES.filter(env => {
      if (filters.envelopes.length && !filters.envelopes.includes(env.id)) return false
      if (filters.types.length && !filters.types.includes(env.type)) return false
      if (filters.natures.length && !filters.natures.includes(env.nature)) return false
      if (filters.statuses.length && !filters.statuses.includes(getBudgetStatus(env))) return false
      if (filters.minAmount && env.spent < Number(filters.minAmount)) return false
      if (filters.maxAmount && env.spent > Number(filters.maxAmount)) return false
      if (filters.hideEmpty && env.spent === 0) return false
      return true
    })
  }, [filters])

  const totalBudgeted = filteredEnvelopes.reduce((s, e) => s + e.budgeted, 0)
  const totalSpent    = filteredEnvelopes.reduce((s, e) => s + e.spent, 0)

  return (
    <div className="layout-page py-6 space-y-5">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#5A6A85] hover:text-[#A8B4CC] transition-colors mb-3"
        >
          <ArrowLeft size={12} />
          Back to all reports
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-white tracking-tight">Spending by Envelope Report</h1>
            <p className="text-[13px] text-[#5A6A85] mt-0.5">
              See how your spending compares to your budgeted amounts across all envelopes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <ReportDateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
            />
            <ReportExportMenu />
            <button
              onClick={() => setFiltersOpen(true)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors',
                activeFilterCount > 0
                  ? 'border-[#6C3AED]/60 bg-[rgba(108,58,237,0.1)] text-[#C4B5FD]'
                  : 'border-[#1E2B42] bg-[#0F1623] text-[#A8B4CC] hover:border-[#6C3AED]/50 hover:text-white',
              )}
            >
              <SlidersHorizontal size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#6C3AED] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Card ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <ReportSummaryCard budgeted={totalBudgeted} spent={totalSpent} />
      </motion.div>

      {/* ── Main Content: 60/40 split ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Left column — 60% */}
        <div className="xl:col-span-3 space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
            <EnvelopeSpendingTable envelopes={filteredEnvelopes} />
          </motion.div>
        </div>

        {/* Right column — 40% */}
        <div className="xl:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <SpendingDistributionChart envelopes={filteredEnvelopes} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
            <OverBudgetEnvelopesCard envelopes={filteredEnvelopes} />
          </motion.div>
        </div>
      </div>

      {/* ── Bottom: Details + Insights ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
            <EnvelopeDetailsTable envelopes={filteredEnvelopes} />
          </motion.div>
        </div>
        <div className="xl:col-span-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}>
            <InsightsPanel envelopes={filteredEnvelopes} />
          </motion.div>
        </div>
      </div>

      {/* ── Filters Drawer ────────────────────────────────────── */}
      <ReportFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        envelopes={MOCK_ENVELOPES}
      />
    </div>
  )
}
