'use client'

import { useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, ChevronDown,
  LayoutGrid, BarChart2, ShoppingBag, Receipt, Target, ArrowUpRight,
} from 'lucide-react'
import { StatCard } from './StatCard'

const sparkNetWorth   = [{ v: 580000 }, { v: 595000 }, { v: 572000 }, { v: 610000 }, { v: 598000 }, { v: 625000 }, { v: 618000 }, { v: 640000 }, { v: 632000 }, { v: 645000 }]
const sparkIncome     = [{ v: 390000 }, { v: 420000 }, { v: 405000 }, { v: 450000 }, { v: 435000 }, { v: 460000 }, { v: 445000 }, { v: 470000 }, { v: 455000 }, { v: 470000 }]
const sparkExpenses   = [{ v: 210000 }, { v: 195000 }, { v: 220000 }, { v: 185000 }, { v: 205000 }, { v: 198000 }, { v: 215000 }, { v: 192000 }, { v: 200000 }, { v: 189000 }]
const sparkToBudget   = [{ v: 180000 }, { v: 225000 }, { v: 185000 }, { v: 265000 }, { v: 230000 }, { v: 262000 }, { v: 230000 }, { v: 278000 }, { v: 255000 }, { v: 294000 }]
import { MonthlyChart } from './MonthlyChart'
import { CategorySpendingList } from './CategorySpendingList'
import { SavingsGoalsList } from './SavingsGoalsList'
import { RecentTransactions } from './RecentTransactions'
import { BudgetOverview } from './BudgetOverview'
import { SubscriptionsList } from './SubscriptionsList'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionCard } from '@/components/shared/SectionCard'

const DATE_OPTIONS = [
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 3 Months', value: 'last-3-months' },
  { label: 'Last 6 Months', value: 'last-6-months' },
  { label: 'This Year', value: 'this-year' },
  { label: 'All Time', value: 'all-time' },
]

export function DashboardView() {
  const [period, setPeriod] = useState('this-month')
  const [open, setOpen] = useState(false)
  const selected = DATE_OPTIONS.find(o => o.value === period)!

  return (
    <div className="layout-page py-6 space-y-6">
      <PageHeader
        title="Good Morning, Saqib 👋"
        description="Here's what's happening with your finance today."
        actions={
          <div className="relative">
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-[#1E2B42] text-[14px] text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white transition-colors"
            >
              {selected.label}
              <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg border border-[#1E2B42] bg-[#0D1525] shadow-xl z-50 py-1">
                {DATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                      opt.value === period
                        ? 'text-white bg-[#131C2E]'
                        : 'text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* Unified grid — stat cards + content aligned in shared columns */}
      <div className="grid grid-cols-2 lg:grid-cols-10 gap-4">

        {/* ── Left col stat cards (cols 1–4) ── */}
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Net Worth"
            amount={645000}
            change={4.3}
            icon={Wallet}
            iconColor="#6C3AED"
            iconBg="rgba(108,58,237,0.15)"
            accentColor="#6C3AED"
            sparkData={sparkNetWorth}
            index={0}
          />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Monthly Income"
            amount={470000}
            change={4.4}
            icon={TrendingUp}
            iconColor="#22C55E"
            iconBg="rgba(34,197,94,0.12)"
            accentColor="#22C55E"
            sparkData={sparkIncome}
            index={1}
          />
        </div>

        {/* ── Middle col stat cards (cols 5–8) ── */}
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Monthly Expenses"
            amount={189000}
            change={-3.1}
            icon={TrendingDown}
            iconColor="#EF4444"
            iconBg="rgba(239,68,68,0.12)"
            accentColor="#EF4444"
            sparkData={sparkExpenses}
            index={2}
          />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="To Be Budgeted"
            amount={294000}
            icon={PiggyBank}
            iconColor="#F59E0B"
            iconBg="rgba(245,158,11,0.12)"
            accentColor="#F59E0B"
            sparkData={sparkToBudget}
            index={3}
          />
        </div>

        {/* ── Budget Overview — spans stat-card row + Expense Categories row (cols 9–10, rows 1–2) ── */}
        <div className="col-span-2 lg:col-span-2 row-span-1 lg:row-span-2 h-full">
          <SectionCard title="Budget Overview" noPadding noHeaderBorder icon={LayoutGrid} iconColor="#6C3AED" iconBg="rgba(108,58,237,0.15)" className="h-full">
            <BudgetOverview />
          </SectionCard>
        </div>

        {/* ── Row 2 left — Cash Flow (cols 1–4) ── */}
        <div className="col-span-2 lg:col-span-4 h-full">
          <SectionCard title="Cash Flow" description="This week" icon={BarChart2} iconColor="#3B82F6" iconBg="rgba(59,130,246,0.12)" className="h-full">
            <MonthlyChart />
          </SectionCard>
        </div>

        {/* ── Row 2 middle — Expense Categories (cols 5–8) ── */}
        <div className="col-span-2 lg:col-span-4 h-full">
          <SectionCard title="Expense Categories" description="This month" icon={ShoppingBag} iconColor="#F59E0B" iconBg="rgba(245,158,11,0.12)" className="h-full">
            <CategorySpendingList />
          </SectionCard>
        </div>

        {/* ── Row 3 left — Recent Transactions (cols 1–4) ── */}
        <div className="col-span-2 lg:col-span-4 h-full">
          <SectionCard title="Recent Transactions" description="This week" noPadding icon={Receipt} iconColor="#22C55E" iconBg="rgba(34,197,94,0.12)" className="h-full">
            <RecentTransactions />
          </SectionCard>
        </div>

        {/* ── Row 3 middle — Financial Goals (cols 5–8) ── */}
        <div className="col-span-2 lg:col-span-4 h-full">
          <SectionCard title="Financial Goals" description="Overview" icon={Target} iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.12)" noPadding className="h-full">
            <SavingsGoalsList />
          </SectionCard>
        </div>

        {/* ── Row 3 right — Subscriptions aligned with Financial Goals (cols 9–10) ── */}
        <div className="col-span-2 lg:col-span-2 h-full">
          <SectionCard
            title="Subscriptions"
            description="This month"
            noPadding
            className="h-full"
            actions={
              <button className="flex items-center gap-1 text-[11px] font-medium text-[#6C3AED] hover:text-[#A78BFA] transition-colors">
                View All <ArrowUpRight size={12} />
              </button>
            }
          >
            <SubscriptionsList />
          </SectionCard>
        </div>

      </div>

    </div>
  )
}
