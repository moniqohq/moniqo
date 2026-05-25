'use client'

import {
  Wallet, TrendingUp, TrendingDown, PiggyBank,
  Plus, Download,
} from 'lucide-react'
import { StatCard } from './StatCard'
import { MonthlyChart } from './MonthlyChart'
import { CategorySpendingList } from './CategorySpendingList'
import { SavingsGoalsList } from './SavingsGoalsList'
import { RecentTransactions } from './RecentTransactions'
import { EnvelopeOverview } from './EnvelopeOverview'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'

export function DashboardView() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Dashboard"
        description="May 2026 · Personal Budget"
        actions={
          <>
            <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#1E2B42] text-[12px] text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white transition-colors">
              <Download size={13} />
              Import
            </button>
            <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#6C3AED] text-[12px] text-white font-medium hover:bg-[#7C4AFF] transition-colors">
              <Plus size={13} />
              Add Transaction
            </button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Worth"
          amount={645000}
          change={4.3}
          icon={Wallet}
          iconColor="#6C3AED"
          iconBg="rgba(108,58,237,0.15)"
          index={0}
        />
        <StatCard
          label="Monthly Income"
          amount={470000}
          change={4.4}
          icon={TrendingUp}
          iconColor="#22C55E"
          iconBg="rgba(34,197,94,0.12)"
          index={1}
        />
        <StatCard
          label="Monthly Expenses"
          amount={189000}
          change={-3.1}
          icon={TrendingDown}
          iconColor="#EF4444"
          iconBg="rgba(239,68,68,0.12)"
          index={2}
        />
        <StatCard
          label="To Be Budgeted"
          amount={294000}
          icon={PiggyBank}
          iconColor="#F59E0B"
          iconBg="rgba(245,158,11,0.12)"
          index={3}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left col — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Income vs Expenses" description="Last 6 months">
            <MonthlyChart />
          </SectionCard>

          <SectionCard title="Recent Transactions" noPadding>
            <RecentTransactions />
          </SectionCard>
        </div>

        {/* Right col — 1/3 width */}
        <div className="space-y-4">
          <SectionCard title="Category Spending" description="This month">
            <CategorySpendingList />
          </SectionCard>

          <SectionCard title="Savings Goals">
            <SavingsGoalsList />
          </SectionCard>
        </div>
      </div>

      {/* Envelope overview */}
      <SectionCard title="Budget Envelopes" description="May 2026" actions={
        <span className="text-[11px] text-[#5A6A85]">₹2,94,000 left to budget</span>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EnvelopeOverview />
        </div>
      </SectionCard>
    </div>
  )
}
