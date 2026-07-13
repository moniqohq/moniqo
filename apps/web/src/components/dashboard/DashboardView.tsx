/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { useDashboardStats } from "@/hooks/use-dashboard";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ChevronDown,
  LayoutGrid,
  ShoppingBag,
  Receipt,
} from "lucide-react";
import { StatCard } from "./StatCard";

const sparkNetWorth = [
  { v: 580000 },
  { v: 595000 },
  { v: 572000 },
  { v: 610000 },
  { v: 598000 },
  { v: 625000 },
  { v: 618000 },
  { v: 640000 },
  { v: 632000 },
  { v: 645000 },
];
const sparkIncome = [
  { v: 390000 },
  { v: 420000 },
  { v: 405000 },
  { v: 450000 },
  { v: 435000 },
  { v: 460000 },
  { v: 445000 },
  { v: 470000 },
  { v: 455000 },
  { v: 470000 },
];
const sparkExpenses = [
  { v: 210000 },
  { v: 195000 },
  { v: 220000 },
  { v: 185000 },
  { v: 205000 },
  { v: 198000 },
  { v: 215000 },
  { v: 192000 },
  { v: 200000 },
  { v: 189000 },
];
const sparkToBudget = [
  { v: 180000 },
  { v: 225000 },
  { v: 185000 },
  { v: 265000 },
  { v: 230000 },
  { v: 262000 },
  { v: 230000 },
  { v: 278000 },
  { v: 255000 },
  { v: 294000 },
];
import { CategorySpendingList } from "./CategorySpendingList";
import { RecentTransactions } from "./RecentTransactions";
import { BudgetOverview } from "./BudgetOverview";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";

const DATE_OPTIONS = [
  { label: "This Month", value: "this-month" },
  { label: "Last Month", value: "last-month" },
  { label: "Last 3 Months", value: "last-3-months" },
  { label: "Last 6 Months", value: "last-6-months" },
  { label: "This Year", value: "this-year" },
  { label: "All Time", value: "all-time" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// The dashboard endpoint accepts a single ?month=YYYY-MM. Range options resolve
// to the first month of their window (e.g. "Last 3 Months" -> the month 2 back);
// "All Time" has no single month, so it omits the param and the backend defaults
// to the current month.
function periodToMonth(period: string): string | undefined {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  switch (period) {
    case "this-month":
      return fmt(now);
    case "last-month":
      return fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    case "last-3-months":
      return fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    case "last-6-months":
      return fmt(new Date(now.getFullYear(), now.getMonth() - 5, 1));
    case "this-year":
      return fmt(new Date(now.getFullYear(), 0, 1));
    case "all-time":
    default:
      return undefined;
  }
}

export function DashboardView() {
  const [period, setPeriod] = useState("this-month");
  const [open, setOpen] = useState(false);
  const selected = DATE_OPTIONS.find((o) => o.value === period)!;
  const user = useAuthStore((s) => s.user);
  const displayName = user?.name || user?.username || "there";
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const month = useMemo(() => periodToMonth(period), [period]);
  const { data: dashStats } = useDashboardStats(activeBudgetId, month);

  return (
    <div className="layout-page space-y-6 py-6">
      <PageHeader
        title={`${getGreeting()}, ${displayName} 👋`}
        description="Here's what's happening with your finance today."
        actions={
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-[#1E2B42] px-4 text-[14px] text-[#A8B4CC] transition-colors hover:bg-[#131C2E] hover:text-white"
            >
              {selected.label}
              <ChevronDown
                size={13}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-[#1E2B42] bg-[#0D1525] py-1 shadow-xl">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPeriod(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[12px] transition-colors ${
                      opt.value === period
                        ? "bg-[#131C2E] text-white"
                        : "text-[#A8B4CC] hover:bg-[#131C2E] hover:text-white"
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-10">
        {/* ── Left col stat cards (cols 1–4) ── */}
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Net Worth"
            amount={dashStats?.netWorth ?? 0}
            change={4.3}
            icon={Wallet}
            iconColor="#6C3AED"
            iconBg="rgba(108,58,237,0.15)"
            accentColor="#6C3AED"
            sparkData={
              dashStats?.sparkline.map((p) => ({ v: p.income - p.expenses })) ?? sparkNetWorth
            }
            index={0}
          />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Monthly Income"
            amount={dashStats?.monthlyIncome ?? 0}
            icon={TrendingUp}
            iconColor="#22C55E"
            iconBg="rgba(34,197,94,0.12)"
            accentColor="#22C55E"
            sparkData={dashStats?.sparkline.map((p) => ({ v: p.income })) ?? sparkIncome}
            index={1}
          />
        </div>

        {/* ── Middle col stat cards (cols 5–8) ── */}
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Monthly Expenses"
            amount={dashStats?.monthlyExpenses ?? 0}
            icon={TrendingDown}
            iconColor="#EF4444"
            iconBg="rgba(239,68,68,0.12)"
            accentColor="#EF4444"
            sparkData={dashStats?.sparkline.map((p) => ({ v: p.expenses })) ?? sparkExpenses}
            index={2}
          />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <StatCard
            label="Monthly Savings"
            amount={dashStats?.monthlySavings ?? 0}
            icon={PiggyBank}
            iconColor="#F59E0B"
            iconBg="rgba(245,158,11,0.12)"
            accentColor="#F59E0B"
            sparkData={
              dashStats?.sparkline.map((p) => ({ v: p.income - p.expenses })) ?? sparkToBudget
            }
            index={3}
          />
        </div>

        {/* ── Budget Overview — spans stat-card row + Expense Categories row (cols 9–10, rows 1–2) ── */}
        <div className="col-span-2 row-span-1 h-full lg:col-span-2 lg:row-span-2">
          <SectionCard
            title="Budget Overview"
            noPadding
            noHeaderBorder
            icon={LayoutGrid}
            iconColor="#6C3AED"
            iconBg="rgba(108,58,237,0.15)"
            className="h-full"
          >
            <BudgetOverview />
          </SectionCard>
        </div>

        {/* ── Row 2 left — Recent Transactions (cols 1–4) ── */}
        <div className="col-span-2 h-full lg:col-span-4">
          <SectionCard
            title="Recent Transactions"
            description="This week"
            noPadding
            icon={Receipt}
            iconColor="#22C55E"
            iconBg="rgba(34,197,94,0.12)"
            className="h-full"
          >
            <RecentTransactions />
          </SectionCard>
        </div>

        {/* ── Row 2 middle — Expense Categories (cols 5–8) ── */}
        <div className="col-span-2 h-full lg:col-span-4">
          <SectionCard
            title="Expense Categories"
            description="This month"
            icon={ShoppingBag}
            iconColor="#F59E0B"
            iconBg="rgba(245,158,11,0.12)"
            className="h-full"
          >
            <CategorySpendingList />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
