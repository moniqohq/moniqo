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

import {
  Plus,
  ArrowLeftRight,
  CheckCircle,
  Download,
  BarChart2,
  Archive,
  Lock,
  ArrowRight,
  ArrowUpDown,
  Receipt,
  Tag,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency, cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import { useAccounts } from "@/hooks/useAccounts";
import { useEnvelopes } from "@/hooks/useEnvelopes";
import { useTransactions } from "@/hooks/useTransactions";

interface Props {
  accountId: number;
  budgetId: number;
}

const QUICK_ACTIONS = [
  {
    icon: <Plus size={16} />,
    color: "#6C3AED",
    bg: "rgba(108,58,237,0.15)",
    title: "Create Transaction",
    desc: "Record a new transaction",
  },
  {
    icon: <ArrowLeftRight size={16} />,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.15)",
    title: "Record Transfer",
    desc: "Move money between accounts",
  },
  {
    icon: <CheckCircle size={16} />,
    color: "#22C55E",
    bg: "rgba(34,197,94,0.15)",
    title: "Reconcile Balance",
    desc: "Verify cleared transactions",
  },
  {
    icon: <Download size={16} />,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
    title: "Export Transactions",
    desc: "Download CSV or PDF",
  },
  {
    icon: <BarChart2 size={16} />,
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.15)",
    title: "View Reports",
    desc: "Account spending insights",
  },
  {
    icon: <Archive size={16} />,
    color: "#6B7280",
    bg: "rgba(107,114,128,0.12)",
    title: "Archive Account",
    desc: "Hide from active accounts",
  },
];

export function AccountInsightsPanel({ accountId, budgetId }: Props) {
  const router = useRouter();
  const { accountMap } = useAccounts(budgetId);
  const { envelopeMap } = useEnvelopes(budgetId);
  const { transactions: txns } = useTransactions(budgetId, accountMap, envelopeMap, { accountId });
  const inflows = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const outflows = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = inflows - outflows;

  const largestExpense = txns
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];

  const categoryTotals = txns
    .filter((t) => t.type === "expense" && t.envelopeName)
    .reduce<Record<string, { name: string; icon: string; total: number }>>((acc, t) => {
      const key = t.envelopeName!;
      if (!acc[key]) acc[key] = { name: key, icon: key[0] ?? "E", total: 0 };
      acc[key].total += Math.abs(t.amount);
      return acc;
    }, {});
  const topCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0];

  const lastTxn = txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  /* eslint-disable react-hooks/purity */
  const daysSinceLast = lastTxn
    ? Math.floor((Date.now() - new Date(lastTxn.date).getTime()) / 86_400_000)
    : null;
  /* eslint-enable react-hooks/purity */

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Quick Actions */}
      <div className="overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120]">
        <div className="border-b border-[#1A2540] px-4 pt-4 pb-3">
          <h3 className="text-sm font-bold text-white">Quick Actions</h3>
        </div>
        <div className="space-y-1 p-3">
          {QUICK_ACTIONS.map(({ icon, color, bg, title, desc }) => (
            <button
              key={title}
              onClick={
                title === "Reconcile Balance"
                  ? () => router.push(`/budgets/${budgetId}/accounts/${accountId}/reconcile`)
                  : undefined
              }
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-[#1A2540] hover:bg-[#0D1525]"
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                style={{ backgroundColor: bg, color }}
              >
                {icon}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs leading-tight font-semibold text-[#C8D4E8] transition-colors group-hover:text-white">
                  {title}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-[#5A6A85]">{desc}</p>
              </div>
              <ArrowRight
                size={12}
                className="flex-shrink-0 text-[#3A4A60] transition-colors group-hover:text-[#6C3AED]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Account Insights */}
      <div className="overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120]">
        <div className="border-b border-[#1A2540] px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Account Insights</h3>
            <span className="rounded-full border border-[#1A2540] bg-[#0D1525] px-2 py-0.5 text-[10px] text-[#3A4A60]">
              MTD
            </span>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {/* Net Cash Flow */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(108,58,237,0.12)]">
                <ArrowUpDown size={12} className="text-[#A78BFA]" />
              </div>
              <span className="text-xs text-[#8A9AB5]">Net Cash Flow</span>
            </div>
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                net >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
              )}
            >
              {net >= 0 ? "+" : ""}
              {formatCurrency(net)}
            </span>
          </div>

          {/* Largest Expense */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(239,68,68,0.12)]">
                <Receipt size={12} className="text-[#F87171]" />
              </div>
              <span className="truncate text-xs text-[#8A9AB5]">Largest Expense</span>
            </div>
            {largestExpense ? (
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-[#F87171] tabular-nums">
                  {formatCurrency(Math.abs(largestExpense.amount))}
                </p>
                <p className="max-w-[80px] truncate text-[10px] text-[#3A4A60]">
                  {largestExpense.payee}
                </p>
              </div>
            ) : (
              <span className="text-xs text-[#3A4A60]">—</span>
            )}
          </div>

          {/* Top Category */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.12)]">
                <Tag size={12} className="text-[#F59E0B]" />
              </div>
              <span className="truncate text-xs text-[#8A9AB5]">Top Category</span>
            </div>
            {topCategory ? (
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-[#C8D4E8]">
                  {topCategory.icon} {topCategory.name}
                </p>
                <p className="text-[10px] text-[#3A4A60]">{formatCurrency(topCategory.total)}</p>
              </div>
            ) : (
              <span className="text-xs text-[#3A4A60]">—</span>
            )}
          </div>

          {/* Days since last transaction */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(6,182,212,0.12)]">
                <Clock size={12} className="text-[#06B6D4]" />
              </div>
              <span className="truncate text-xs text-[#8A9AB5]">Last Transaction</span>
            </div>
            {daysSinceLast !== null ? (
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-[#C8D4E8] tabular-nums">
                  {daysSinceLast} {daysSinceLast === 1 ? "day" : "days"} ago
                </p>
                <p className="text-[10px] text-[#3A4A60]">{lastTxn!.payee}</p>
              </div>
            ) : (
              <span className="text-xs text-[#3A4A60]">—</span>
            )}
          </div>

          <button className="mt-1 w-full text-right text-xs font-semibold text-[#7C3AED] transition-colors hover:text-[#A78BFA]">
            View Full Report →
          </button>
        </div>
      </div>

      {/* Immutable notice */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(108,58,237,0.2)] bg-[rgba(108,58,237,0.06)] p-5 shadow-[0_0_20px_rgba(108,58,237,0.06)]">
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(108,58,237,0.18)] shadow-[0_0_12px_rgba(108,58,237,0.25)]">
            <Lock size={16} className="text-[#A78BFA]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#C4B5FD]">Immutable Transactions</p>
            <p className="mt-0.5 text-[10px] text-[#5A6A85]">Audit-safe ledger protection</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(108,58,237,0.15)]" />

        {/* Body */}
        <p className="text-xs leading-relaxed text-[#6A7A95]">
          Transaction immutability is <span className="font-medium text-[#A78BFA]">enabled</span>{" "}
          for this account.
        </p>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6C3AED]" />
            <p className="text-[11px] leading-snug text-[#5A6A85]">
              Use a <span className="font-medium text-[#C4B5FD]">reversing transaction</span> to
              correct a mistake.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6C3AED]" />
            <p className="text-[11px] leading-snug text-[#5A6A85]">
              This can be changed in <span className="font-medium text-[#C4B5FD]">Settings</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
