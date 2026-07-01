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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  PiggyBank,
  Trash2,
  TrendingUp,
  Wallet,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeftRight,
  CalendarClock,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  Landmark,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { mockAccounts, mockTransactions, mockBudgets } from "@/mock/data";
import type { AccountType } from "@/types";

/* ── Types ─────────────────────────────────────────────── */

interface DeletionCheck {
  id: string;
  label: string;
  rule: string;
  passed: boolean;
  detail: string;
}

interface TimelineStep {
  icon: React.ReactNode;
  label: string;
  date: string;
  status: string;
  state: "completed" | "current" | "future";
}

/* ── Account type metadata ──────────────────────────────── */

const TYPE_META: Record<
  AccountType,
  { icon: React.ReactNode; label: string; color: string; bg: string }
> = {
  checking: {
    icon: <Building2 size={20} />,
    label: "Checking",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.15)",
  },
  savings: {
    icon: <PiggyBank size={20} />,
    label: "Savings",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.15)",
  },
  credit: {
    icon: <CreditCard size={20} />,
    label: "Credit",
    color: "#F87171",
    bg: "rgba(239,68,68,0.15)",
  },
  cash: {
    icon: <Wallet size={20} />,
    label: "Cash",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
  },
  investment: {
    icon: <TrendingUp size={20} />,
    label: "Investment",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.15)",
  },
  loan: {
    icon: <Landmark size={20} />,
    label: "Loan",
    color: "#EC4899",
    bg: "rgba(236,72,153,0.15)",
  },
};

/* ── helpers ────────────────────────────────────────────── */

function buildDeletionChecks(
  txCount: number,
  balance: number,
  transfers: number,
  scheduled: number,
  reconciliations: number,
): DeletionCheck[] {
  return [
    {
      id: "tx",
      label: "Transaction History",
      rule: "Account must contain zero transactions",
      passed: txCount === 0,
      detail: txCount === 0 ? "0 transactions" : `${txCount} transactions found`,
    },
    {
      id: "balance",
      label: "Current Balance",
      rule: "Balance must equal zero",
      passed: balance === 0,
      detail: formatCurrency(balance),
    },
    {
      id: "transfers",
      label: "Transfer Dependencies",
      rule: "No transfer relationships exist",
      passed: transfers === 0,
      detail: transfers === 0 ? "No transfers" : `${transfers} transfer references`,
    },
    {
      id: "scheduled",
      label: "Scheduled Transactions",
      rule: "No recurring transactions attached",
      passed: scheduled === 0,
      detail: scheduled === 0 ? "No scheduled items" : `${scheduled} scheduled items`,
    },
    {
      id: "recon",
      label: "Reconciliation History",
      rule: "No reconciliation records exist",
      passed: reconciliations === 0,
      detail: reconciliations === 0 ? "No reconciliations" : `${reconciliations} reconciliations`,
    },
  ];
}

/* ── Sub-components ─────────────────────────────────────── */

function RequirementCard({ check }: { check: DeletionCheck }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4",
        check.passed
          ? "border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.04)]"
          : "border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)]",
      )}
    >
      <div className="flex items-start gap-2">
        {check.passed ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#22C55E]" />
        ) : (
          <XCircle size={16} className="mt-0.5 shrink-0 text-[#EF4444]" />
        )}
        <span className="text-[13px] leading-tight font-semibold text-[#E8EEF8]">
          {check.label}
        </span>
      </div>
      <p className="pl-5 text-[11px] leading-relaxed text-[#5A6A85]">{check.rule}</p>
      <p
        className={cn(
          "pl-5 text-[12px] font-semibold",
          check.passed ? "text-[#22C55E]" : "text-[#EF4444]",
        )}
      >
        {check.detail}
      </p>
    </div>
  );
}

function EmptyTabState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-[#5A6A85]"
        style={{ background: "rgba(90,106,133,0.1)" }}
      >
        {icon}
      </div>
      <p className="text-[14px] font-semibold text-[#A8B4CC]">{title}</p>
      <p className="max-w-[280px] text-center text-[12px] text-[#5A6A85]">{description}</p>
    </div>
  );
}

const TX_COLS = ["Date", "Type", "Payee", "Category", "Amount", "Status"];

function TransactionTable({ transactions }: { transactions: typeof mockTransactions }) {
  if (transactions.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={<FileText size={22} />}
          title="No transactions found"
          description="This account has no transaction history. It's safe to delete."
        />
        <div className="border-t border-[#1E2B42]">
          <div className="grid grid-cols-6 gap-4 px-4 py-2">
            {TX_COLS.map((c) => (
              <span key={c} className="text-[11px] font-medium text-[#5A6A85]">
                {c}
              </span>
            ))}
          </div>
          <p className="px-4 py-6 text-center text-[12px] text-[#5A6A85]">
            No transactions to display.
          </p>
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-4 border-b border-[#1E2B42] px-4 py-2">
        {TX_COLS.map((c) => (
          <span key={c} className="text-[11px] font-medium text-[#5A6A85]">
            {c}
          </span>
        ))}
      </div>
      {transactions.slice(0, 5).map((tx) => (
        <div
          key={tx.id}
          className="grid grid-cols-6 gap-4 border-b border-[#1E2B42]/50 px-4 py-3 transition-colors hover:bg-[#0F1623]/60"
        >
          <span className="text-[12px] text-[#A8B4CC]">{tx.date}</span>
          <span className="text-[12px] text-[#A8B4CC] capitalize">{tx.type}</span>
          <span className="text-[12px] text-[#E8EEF8]">{tx.payee}</span>
          <span className="text-[12px] text-[#A8B4CC]">{tx.envelopeName ?? "—"}</span>
          <span
            className={cn(
              "text-[12px] font-semibold",
              tx.amount < 0 ? "text-[#F87171]" : "text-[#22C55E]",
            )}
          >
            {formatCurrency(tx.amount)}
          </span>
          <span
            className={cn(
              "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
              tx.cleared
                ? "bg-[rgba(34,197,94,0.12)] text-[#22C55E]"
                : "bg-[rgba(245,158,11,0.12)] text-[#F59E0B]",
            )}
          >
            {tx.cleared ? "Cleared" : "Pending"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AlternativeCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0A0E1A] px-4 py-3 text-left transition-all hover:border-[#2A3A54] hover:bg-[#0F1623]"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#6C3AED]"
        style={{ background: "rgba(108,58,237,0.12)" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#E8EEF8]">{label}</p>
        <p className="mt-0.5 text-[11px] text-[#5A6A85]">{description}</p>
      </div>
      <ChevronRight
        size={14}
        className="shrink-0 text-[#5A6A85] transition-colors group-hover:text-[#A8B4CC]"
      />
    </button>
  );
}

function RiskIndicator({ level }: { level: "Low" | "Medium" | "High" }) {
  const stops = ["Low", "Medium", "High"] as const;
  const idx = stops.indexOf(level);
  const colors = { Low: "#22C55E", Medium: "#F59E0B", High: "#EF4444" };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
        Risk Level
      </span>
      <div className="flex items-center gap-2">
        <div className="relative flex w-32 items-center gap-0">
          <div className="absolute inset-y-1/2 right-0 left-0 h-[2px] -translate-y-1/2 bg-[#1E2B42]" />
          {stops.map((s, i) => (
            <div key={s} className="relative flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "z-10 h-2.5 w-2.5 rounded-full border-2",
                  i <= idx ? "border-transparent" : "border-[#2A3A54] bg-[#0A0E1A]",
                )}
                style={
                  i <= idx
                    ? {
                        background: colors[level],
                        boxShadow: i === idx ? `0 0 8px ${colors[level]}60` : undefined,
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
        <span className="text-[11px] font-semibold" style={{ color: colors[level] }}>
          {level}
        </span>
      </div>
      <div className="flex w-32 justify-between">
        {stops.map((s) => (
          <span key={s} className="text-[9px] text-[#5A6A85]">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineNode({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
  const colors = {
    completed: { ring: "#22C55E", bg: "rgba(34,197,94,0.12)", text: "#22C55E", line: "#22C55E" },
    current: { ring: "#6C3AED", bg: "rgba(108,58,237,0.15)", text: "#6C3AED", line: "#2A3A54" },
    future: { ring: "#2A3A54", bg: "rgba(42,58,84,0.3)", text: "#5A6A85", line: "#2A3A54" },
  };
  const c = colors[step.state];

  return (
    <div className="relative flex flex-1 flex-col items-center gap-3">
      {!isLast && (
        <div className="absolute top-5 left-1/2 h-[2px] w-full" style={{ background: c.line }} />
      )}
      <div
        className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
        style={{ borderColor: c.ring, background: c.bg, color: c.text }}
      >
        {step.icon}
      </div>
      <div className="text-center">
        <p className="text-[12px] font-semibold text-[#E8EEF8]">{step.label}</p>
        <p className="mt-0.5 text-[11px] text-[#5A6A85]">{step.date}</p>
        <p className={cn("mt-0.5 text-[10px] font-medium")} style={{ color: c.text }}>
          {step.status}
        </p>
      </div>
    </div>
  );
}

/* ── Main View ──────────────────────────────────────────── */

interface Props {
  budgetId: string;
  accountId: string;
}

export function DeleteAccountView({ budgetId, accountId }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("transactions");
  const [isDeleting, setIsDeleting] = useState(false);

  const account = mockAccounts.find((a) => a.id === accountId) ?? mockAccounts[3];
  const budget = mockBudgets.find((b) => b.id === (account.budgetId ?? budgetId)) ?? mockBudgets[0];
  const meta = TYPE_META[account.type];

  const accountTransactions = mockTransactions.filter((t) => t.accountId === account.id);
  const txCount = accountTransactions.length;
  const balance = account.balance;
  const transfers = 0;
  const scheduled = 0;
  const reconciliations = 0;

  const checks = buildDeletionChecks(txCount, balance, transfers, scheduled, reconciliations);
  const allPass = checks.every((c) => c.passed);
  const riskLevel = allPass ? "Low" : txCount > 0 || balance !== 0 ? "High" : "Medium";

  const createdDate = "May 15, 2024";
  const lastActivity = "May 15, 2024";
  const lastActivityAgo = "15 days ago";

  const timelineSteps: TimelineStep[] = [
    {
      icon: <Calendar size={16} />,
      label: "Account Created",
      date: "May 15, 2024",
      status: "Completed",
      state: "completed",
    },
    {
      icon: txCount > 0 ? <CheckCircle2 size={16} /> : <Clock size={16} />,
      label: "First Transaction",
      date: "—",
      status: txCount > 0 ? "Has activity" : "No activity",
      state: txCount > 0 ? "completed" : "current",
    },
    {
      icon: reconciliations > 0 ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />,
      label: "Last Reconciliation",
      date: "—",
      status: reconciliations > 0 ? "Reconciled" : "No reconciliations",
      state: reconciliations > 0 ? "completed" : "current",
    },
    {
      icon: allPass ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />,
      label: "Archive Recommended",
      date: "May 15, 2024",
      status: allPass ? "Eligible for deletion" : "Recommended",
      state: allPass ? "completed" : "current",
    },
    {
      icon: <Trash2 size={16} />,
      label: "Delete Attempt",
      date: "—",
      status: "Not started",
      state: "future",
    },
  ];

  async function handleDelete() {
    if (!allPass) return;
    setIsDeleting(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push(`/accounts`);
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-[#E8EEF8]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-6 py-6">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] leading-tight font-bold text-[#E8EEF8]">Delete Account</h1>
            <p className="mt-1 text-[13px] text-[#5A6A85]">
              Permanently remove an unused ledger account
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-[#1E2B42] px-5 py-2 text-[13px] font-medium text-[#A8B4CC] transition-all hover:border-[#2A3A54] hover:text-[#E8EEF8]"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!allPass || isDeleting}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-all",
                allPass && !isDeleting
                  ? "bg-[#EF4444] text-white shadow-lg shadow-red-900/20 hover:bg-[#DC2626]"
                  : "cursor-not-allowed bg-[#EF4444]/20 text-[#EF4444]/40",
              )}
            >
              <Trash2 size={14} />
              {isDeleting ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </div>

        {/* ── Danger Banner ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-4 rounded-xl border border-[#EF4444]/40 bg-[rgba(239,68,68,0.05)] px-5 py-4"
        >
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle size={18} className="text-[#EF4444]" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[#EF4444]">
              Deleting accounts may permanently remove ledger data
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#A8B4CC]">
              Accounts with transaction history cannot be safely deleted because historical
              financial integrity must be preserved.
              <br />
              Accounts with activity should be archived instead.
            </p>
          </div>
          <button className="shrink-0 rounded-xl border border-[#2A3A54] bg-[#0F1623] px-4 py-2 text-[12px] font-semibold whitespace-nowrap text-[#E8EEF8] transition-all hover:bg-[#1A2438]">
            Archive Instead
          </button>
        </motion.div>

        {/* ── Account Summary Card ────────────────────────── */}
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-6 py-5">
          {/* Icon + name */}
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold text-[#E8EEF8]">{account.name}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#5A6A85]">{budget.name}</p>
            </div>
          </div>

          <div className="h-10 w-px bg-[#1E2B42]" />

          {/* Stats */}
          <div className="flex flex-1 flex-wrap items-center gap-8">
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                Current Balance
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[18px] font-bold",
                  balance === 0
                    ? "text-[#22C55E]"
                    : balance < 0
                      ? "text-[#F87171]"
                      : "text-[#E8EEF8]",
                )}
              >
                {formatCurrency(balance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                Transaction Count
              </p>
              <p className="mt-0.5 text-[16px] font-bold text-[#E8EEF8]">{txCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                Created Date
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-[#E8EEF8]">{createdDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                Last Activity
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-[#E8EEF8]">{lastActivity}</p>
              <p className="mt-0.5 text-[10px] text-[#5A6A85]">{lastActivityAgo}</p>
            </div>
          </div>

          <div className="hidden h-10 w-px bg-[#1E2B42] lg:block" />

          {/* Eligibility + Risk */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                Delete Eligibility
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
                  allPass
                    ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.1)] text-[#22C55E]"
                    : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] text-[#EF4444]",
                )}
              >
                {allPass ? (
                  <>
                    <CheckCircle2 size={11} /> Eligible for deletion
                  </>
                ) : (
                  <>
                    <XCircle size={11} /> Cannot be deleted
                  </>
                )}
              </span>
            </div>
            <RiskIndicator level={riskLevel} />
          </div>
        </div>

        {/* ── Deletion Eligibility ────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
          <div className="border-b border-[#1E2B42] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[#E8EEF8]">
              Can this account be deleted?
            </h2>
            <p className="mt-0.5 text-[12px] text-[#5A6A85]">
              All conditions below must be met to permanently delete this account.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
            {checks.map((check, i) => (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <RequirementCard check={check} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Ledger Inspection + Sidebar ────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
          {/* Left: Ledger Inspection */}
          <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
            <div className="border-b border-[#1E2B42] px-5 py-4">
              <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Ledger Inspection</h2>
            </div>
            <div className="p-5">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList
                  variant="line"
                  className="mb-5 w-full justify-start gap-0 rounded-none border-b border-[#1E2B42] pb-0"
                >
                  {[
                    { id: "transactions", label: "Recent Transactions" },
                    { id: "transfers", label: "Transfers" },
                    { id: "scheduled", label: "Scheduled" },
                    { id: "envelopes", label: "Linked Envelopes" },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        "-mb-px rounded-none border-b-2 border-transparent px-4 py-2.5 text-[12px] font-medium transition-colors",
                        activeTab === tab.id
                          ? "border-[#6C3AED] text-[#6C3AED]"
                          : "text-[#5A6A85] hover:text-[#A8B4CC]",
                      )}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="transactions">
                  <TransactionTable transactions={accountTransactions} />
                </TabsContent>

                <TabsContent value="transfers">
                  <EmptyTabState
                    icon={<ArrowLeftRight size={22} />}
                    title="No transfer references"
                    description="This account has no transfer relationships with other accounts."
                  />
                </TabsContent>

                <TabsContent value="scheduled">
                  <EmptyTabState
                    icon={<CalendarClock size={22} />}
                    title="No scheduled transactions"
                    description="No recurring or scheduled transactions are attached to this account."
                  />
                </TabsContent>

                <TabsContent value="envelopes">
                  <EmptyTabState
                    icon={<BookOpen size={22} />}
                    title="No linked envelopes"
                    description="This account is not linked to any budget envelopes."
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Safe Alternatives */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Safe Alternatives</h2>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <AlternativeCard
                  icon={<Archive size={16} />}
                  label="Archive Account"
                  description="Keep history, remove from active view"
                />
                <AlternativeCard
                  icon={<ArrowLeftRight size={16} />}
                  label="Transfer Funds"
                  description="Move any balance to another account"
                />
                <AlternativeCard
                  icon={<ShieldCheck size={16} />}
                  label="Reconcile Account"
                  description="Ensure everything is up to date"
                />
                <AlternativeCard
                  icon={<Download size={16} />}
                  label="Export Account Ledger"
                  description="Download transactions & history"
                />
              </div>
            </div>

            {/* Before You Delete */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Before You Delete</h2>
              </div>
              <div className="flex flex-col gap-2.5 p-4">
                {[
                  "Archiving is the recommended way to close an account while preserving history.",
                  "You cannot recover deleted ledger data.",
                  "Deletion should only be used for unused accounts.",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CalendarCheck size={14} className="mt-0.5 shrink-0 text-[#22C55E]" />
                    <p className="text-[12px] leading-relaxed text-[#A8B4CC]">{item}</p>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <div className="px-4 pb-4">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #6C3AED, #7C4AFF)" }}
                >
                  <Archive size={15} />
                  Archive Account Instead
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Account Lifecycle Timeline ──────────────────── */}
        <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
          <div className="border-b border-[#1E2B42] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Account Lifecycle</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-2">
              {timelineSteps.map((step, i) => (
                <TimelineNode
                  key={step.label}
                  step={step}
                  isLast={i === timelineSteps.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
