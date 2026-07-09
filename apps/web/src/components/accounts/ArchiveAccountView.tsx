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
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Landmark,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn, formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { useAccounts, useArchiveAccount } from "@/hooks/accounts/use-accounts";
import { useBudgets } from "@/hooks/use-budgets";
import { useAccounts as useAccountsLegacy } from "@/hooks/useAccounts";
import { useEnvelopes } from "@/hooks/useEnvelopes";
import { useTransactions } from "@/hooks/useTransactions";
import type { AccountType } from "@/types";

/* ── Constants ───────────────────────────────────────────── */

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
  loan: {
    icon: <Landmark size={20} />,
    label: "Loan",
    color: "#EC4899",
    bg: "rgba(236,72,153,0.15)",
  },
};

const CHART_DATA = [
  { date: "Jan '24", value: 0 },
  { date: "Feb '24", value: 3200 },
  { date: "Mar '24", value: 5800 },
  { date: "Apr '24", value: 8400 },
  { date: "May '24", value: 2450 },
];

/* ── Balance chart ───────────────────────────────────────── */

function BalanceOverTimeChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={CHART_DATA} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="#1A2540" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#3A4A60" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#3A4A60" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
          width={48}
          domain={[0, 10000]}
          ticks={[0, 5000, 10000]}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-[#1E2B42] bg-[#131C2E] px-3 py-2 text-xs shadow-xl">
                <p className="mb-1 text-[#5A6A85]">{label}</p>
                <p className="font-bold text-white">{formatCurrency(payload[0].value as number)}</p>
              </div>
            );
          }}
          cursor={{ stroke: "#2A3A54", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#7C3AED"
          strokeWidth={2}
          dot={{ r: 4, fill: "#080C14", stroke: "#7C3AED", strokeWidth: 1.5 }}
          activeDot={{ r: 5, fill: "#A78BFA", stroke: "#080C14", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Confirmation Dialog ─────────────────────────────────── */

function ArchiveConfirmationDialog({
  accountName,
  balance,
  txCount,
  lastActivity,
  onClose,
  onConfirm,
  error,
  isLoading,
}: {
  accountName: string;
  balance: number;
  txCount: number;
  lastActivity: string;
  onClose: () => void;
  onConfirm: () => void;
  error?: string | null;
  isLoading?: boolean;
}) {
  const [understood, setUnderstood] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-[400px] overflow-hidden rounded-2xl border border-[#1E2B42] bg-[#0F1623] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E2B42] px-5 py-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(108,58,237,0.15)" }}
          >
            <Archive size={16} className="text-[#6C3AED]" />
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          <h2 className="text-[16px] font-bold text-[#E8EEF8]">Archive this account?</h2>
          <p className="mt-1 text-[12px] text-[#5A6A85]">
            You can restore archived accounts later if needed.
          </p>

          {/* Summary rows */}
          <div className="mt-4 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#080C14]">
            {[
              { label: "Account Name", value: accountName, accent: false },
              { label: "Current Balance", value: formatCurrency(balance), accent: balance > 0 },
              { label: "Transaction Count", value: String(txCount), accent: false },
              { label: "Last Activity", value: lastActivity, accent: false },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-[#1E2B42]/60 px-4 py-2.5 last:border-0"
              >
                <span className="text-[12px] text-[#5A6A85]">{row.label}</span>
                <span
                  className={cn(
                    "text-[12px] font-semibold",
                    row.accent ? "text-[#F59E0B]" : "text-[#E8EEF8]",
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Checkbox */}
          <label
            className="mt-4 flex cursor-pointer items-start gap-3"
            onClick={() => setUnderstood((v) => !v)}
          >
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all",
                understood ? "border-[#6C3AED] bg-[#6C3AED]" : "border-[#2A3A54] bg-transparent",
              )}
            >
              {understood && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <span className="text-[12px] leading-relaxed text-[#A8B4CC] select-none">
              I understand this account will become read-only.
            </span>
          </label>
        </div>

        {error && (
          <div className="mx-5 mb-1 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2.5">
            <p className="text-[12px] text-[#EF4444]">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[#1E2B42] px-5 py-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-[#1E2B42] py-2.5 text-[13px] font-medium text-[#A8B4CC] transition-all hover:border-[#2A3A54] hover:text-[#E8EEF8] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={understood && !isLoading ? onConfirm : undefined}
            disabled={!understood || isLoading}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all",
              understood && !isLoading
                ? "text-white shadow-lg shadow-purple-900/20"
                : "cursor-not-allowed text-[#6C3AED]/40",
            )}
            style={
              understood && !isLoading
                ? { background: "linear-gradient(135deg, #6C3AED, #7C4AFF)" }
                : { background: "rgba(108,58,237,0.15)" }
            }
          >
            {isLoading ? "Archiving…" : "Archive Account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Success Dialog ──────────────────────────────────────── */

function ArchiveSuccessDialog({
  accountName,
  onViewArchived,
  onReturn,
}: {
  accountName: string;
  onViewArchived: () => void;
  onReturn: () => void;
}) {
  const archivedOn = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-[400px] overflow-hidden rounded-2xl border border-[#1E2B42] bg-[#0F1623] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onReturn}
          className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-[#5A6A85] transition-all hover:bg-[#1E2B42] hover:text-[#A8B4CC]"
        >
          <X size={14} />
        </button>

        <div className="flex flex-col items-center px-5 pt-8 pb-4 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.3)" }}
          >
            <CheckCircle2 size={28} className="text-[#22C55E]" />
          </div>
          <h2 className="text-[18px] font-bold text-[#E8EEF8]">Account Archived</h2>
          <p className="mt-1 text-[12px] text-[#5A6A85]">
            Your account history has been safely preserved.
          </p>
        </div>

        <div className="px-5 pb-4">
          <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#080C14]">
            {[
              { label: "Account Name", value: accountName },
              { label: "Archived On", value: archivedOn },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-[#1E2B42]/60 px-4 py-2.5 last:border-0"
              >
                <span className="text-[12px] text-[#5A6A85]">{row.label}</span>
                <span className="text-[12px] font-semibold text-[#E8EEF8]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={onViewArchived}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6C3AED, #7C4AFF)" }}
          >
            View Archived Accounts
          </button>
          <button
            onClick={onReturn}
            className="flex-1 rounded-xl border border-[#1E2B42] py-2.5 text-[13px] font-medium text-[#A8B4CC] transition-all hover:border-[#2A3A54] hover:text-[#E8EEF8]"
          >
            Return to Accounts
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main View ───────────────────────────────────────────── */

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

interface Props {
  budgetId: number;
  accountId: number;
}

export function ArchiveAccountView({ budgetId, accountId }: Props) {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: budgets } = useBudgets();
  const budgetName = budgets.find((b) => b.id === budgetId)?.name;
  const archiveMutation = useArchiveAccount();
  const account = accounts.find((a) => a.id === accountId);
  const meta = account ? TYPE_META[account.type] : TYPE_META.checking;

  const { accountMap: legacyAccountMap } = useAccountsLegacy(budgetId);
  const { envelopeMap } = useEnvelopes(budgetId);
  const { transactions: accountTransactions } = useTransactions(
    budgetId,
    legacyAccountMap,
    envelopeMap,
    { accountId },
  );
  const rawAccount = legacyAccountMap.get(accountId);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "transfer",
      label: "Transfer Remaining Balance",
      description: "Move funds to another account",
      checked: true,
    },
    {
      id: "pending",
      label: "Clear Pending Transactions",
      description: "Resolve any uncleared items",
      checked: false,
    },
    {
      id: "reconcile",
      label: "Reconcile Account",
      description: "Make sure account is up to date",
      checked: false,
    },
  ]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const balance = account?.balance ?? 0;
  const txCount = accountTransactions.length;
  const openingBalance = 0;
  const lastActivityDate = accountTransactions[0]?.date;
  const lastActivity = lastActivityDate ? formatDate(lastActivityDate) : "No activity yet";
  const lastActivityAgo = lastActivityDate ? formatRelativeDate(lastActivityDate) : "";
  const lastReconciled = rawAccount?.last_reconciled_at
    ? formatDate(rawAccount.last_reconciled_at)
    : "Never";
  const createdDate = rawAccount?.created_at ? formatDate(rawAccount.created_at) : "—";
  const hasBalance = balance !== 0;
  const riskLevel = hasBalance ? "Medium" : "Low";
  const archiveStatus = hasBalance ? "Archive Recommended" : "Ready to Archive";
  const riskDotColor = ({ Low: "#22C55E", Medium: "#F59E0B", High: "#EF4444" } as const)[riskLevel];

  function toggleCheck(id: string) {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c)));
  }

  async function handleArchiveConfirmed() {
    setArchiveError(null);
    try {
      await archiveMutation.mutateAsync(String(accountId));
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (e) {
      if (e instanceof ApiError) {
        const balanceField = e.fields?.find((f) => f.field === "balance");
        setArchiveError(
          balanceField ? "Account balance must be zero before archiving." : e.message,
        );
      } else {
        setArchiveError("Something went wrong. Please try again.");
      }
    }
  }

  /* ── Timeline nodes ───────────────────────────────────── */
  type TimelineStage = "completed" | "current" | "future";
  const timelineNodes: {
    icon: React.ReactNode;
    label: string;
    date: string;
    meta: string;
    stage: TimelineStage;
  }[] = [
    {
      icon: <Calendar size={16} />,
      label: "Account Created",
      date: createdDate,
      meta: `Opening balance ${formatCurrency(openingBalance)}`,
      stage: "completed",
    },
    {
      icon: <RefreshCw size={16} />,
      label: "Last Reconciled",
      date: lastReconciled,
      meta: `Balance · ${formatCurrency(balance)}`,
      stage: "completed",
    },
    {
      icon: <CheckCircle2 size={16} />,
      label: "Last Activity",
      date: lastActivity,
      meta: `${lastActivityAgo} · ${txCount} transactions`,
      stage: "current",
    },
    {
      icon: <Archive size={16} />,
      label: "Archive Date",
      date: "Pending",
      meta: "Not yet archived",
      stage: "future",
    },
  ];
  const tlColor: Record<TimelineStage, string> = {
    completed: "#22C55E",
    current: "#6C3AED",
    future: "#1E2B42",
  };
  const tlBg: Record<TimelineStage, string> = {
    completed: "rgba(34,197,94,0.12)",
    current: "rgba(108,58,237,0.15)",
    future: "rgba(30,43,66,0.5)",
  };
  const tlMetaText: Record<TimelineStage, string> = {
    completed: "#22C55E",
    current: "#C4B5FD",
    future: "#3A4A60",
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-[#E8EEF8]">
      <div className="layout-page flex flex-col gap-5 py-6">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] leading-tight font-bold text-[#E8EEF8]">Archive Account</h1>
            <p className="mt-1 text-[13px] text-[#5A6A85]">
              Close this account while preserving transaction history
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
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #6C3AED, #7C4AFF)" }}
            >
              <Archive size={14} />
              Archive Account
            </button>
          </div>
        </div>

        {/* ── Info Banner ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-6 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)] px-5 py-4"
        >
          <div className="flex items-start gap-4">
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <AlertTriangle size={18} className="text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#F59E0B]">
                Archived accounts keep their history
              </p>
              <p className="mt-0.5 text-[12px] text-[#A8B4CC]">
                Transactions, reports, and balances will remain available for historical reference.
              </p>
            </div>
          </div>
          <p className="shrink-0 text-right text-[12px] leading-snug font-semibold text-[#F59E0B]">
            Archived accounts cannot
            <br />
            receive new transactions.
          </p>
        </motion.div>

        {/* ── Account Summary Card ──────────────────────── */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-6 py-5">
          <div className="flex flex-wrap items-center gap-6">
            {/* Icon + name */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.icon}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-bold text-[#E8EEF8]">
                    {account?.name ?? "Account"}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Archive size={11} className="text-[#5A6A85]" />
                  <p className="text-[11px] text-[#5A6A85]">{budgetName ?? "—"}</p>
                </div>
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
                    hasBalance ? "text-[#F59E0B]" : "text-[#22C55E]",
                  )}
                >
                  {formatCurrency(balance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                  Last Activity
                </p>
                <p className="mt-0.5 text-[14px] font-semibold text-[#E8EEF8]">{lastActivity}</p>
                <p className="mt-0.5 text-[10px] text-[#5A6A85]">{lastActivityAgo}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                  Transaction Count
                </p>
                <p className="mt-0.5 text-[16px] font-bold text-[#E8EEF8]">{txCount}</p>
              </div>
            </div>

            <div className="hidden h-10 w-px bg-[#1E2B42] lg:block" />

            {/* Status + Risk */}
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-3 py-1 text-[11px] font-semibold text-[#F59E0B]">
                {archiveStatus}
                <span className="text-[8px]">◉</span>
              </span>
              {hasBalance && (
                <span className="text-[11px] font-medium text-[#F59E0B]">Balance not zero</span>
              )}
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ background: riskDotColor }} />
                <span className="text-[11px] font-medium text-[#A8B4CC]">{riskLevel} Risk</span>
              </div>
            </div>
          </div>

          {/* Balance warning */}
          {hasBalance && (
            <div className="flex items-center gap-2 border-t border-[#1E2B42] pt-3">
              <AlertTriangle size={13} className="shrink-0 text-[#F59E0B]" />
              <p className="text-[12px] text-[#F59E0B]">
                Transfer remaining balance before archiving.
              </p>
            </div>
          )}
        </div>

        {/* ── Two-Column Layout ──────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* ── LEFT COLUMN ─────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* Account Overview + Chart */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Account Overview</h2>
              </div>
              <div className="grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
                {[
                  {
                    label: "Opening Balance",
                    value: formatCurrency(openingBalance),
                    accent: false,
                  },
                  { label: "Current Balance", value: formatCurrency(balance), accent: true },
                  { label: "Total Transactions", value: String(txCount), accent: false },
                  { label: "Last Reconciled", value: lastReconciled, accent: false },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-[10px] font-medium tracking-wide text-[#5A6A85] uppercase">
                      {stat.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[15px] font-bold",
                        stat.accent
                          ? hasBalance
                            ? "text-[#F59E0B]"
                            : "text-[#22C55E]"
                          : "text-[#E8EEF8]",
                      )}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-5">
                <p className="mb-3 text-[11px] font-medium text-[#5A6A85]">Balance Over Time</p>
                <BalanceOverTimeChart />
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Recent Transactions</h2>
              </div>

              <div className="grid grid-cols-[160px_1fr_1fr_120px] border-b border-[#1E2B42] px-5 py-2.5">
                {["Date", "Payee", "Category", "Amount"].map((col) => (
                  <span key={col} className="text-[11px] font-medium text-[#5A6A85]">
                    {col}
                  </span>
                ))}
              </div>

              {accountTransactions.length === 0 && (
                <p className="px-5 py-6 text-center text-[12px] text-[#5A6A85]">
                  No transactions to display.
                </p>
              )}

              {accountTransactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-[160px_1fr_1fr_120px] border-b border-[#1E2B42]/50 px-5 py-3 transition-colors hover:bg-[#131C2E]"
                >
                  <span className="text-[12px] text-[#A8B4CC]">{formatDate(tx.date)}</span>
                  <span className="truncate pr-2 text-[12px] font-medium text-[#E8EEF8]">
                    {tx.payee}
                  </span>
                  <span className="text-[12px] text-[#A8B4CC]">{tx.envelopeName ?? "—"}</span>
                  <span
                    className={cn(
                      "text-[12px] font-semibold",
                      tx.amount > 0 ? "text-[#22C55E]" : "text-[#F87171]",
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}

              <div className="px-5 py-3">
                <button className="text-[12px] font-medium text-[#6C3AED] transition-colors hover:text-[#7C4AFF]">
                  View all transactions →
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Before You Archive */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Before You Archive</h2>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 transition-all",
                      item.checked
                        ? "border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.04)]"
                        : "border-[#1E2B42] bg-[#080C14]",
                    )}
                  >
                    <button
                      onClick={() => toggleCheck(item.id)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                        item.checked
                          ? "border-[#22C55E] bg-[#22C55E]"
                          : "border-[#2A3A54] bg-transparent hover:border-[#5A6A85]",
                      )}
                    >
                      {item.checked && <CheckCircle2 size={11} className="text-[#080C14]" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[12px] font-semibold",
                          item.checked ? "text-[#22C55E]" : "text-[#E8EEF8]",
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6A85]">{item.description}</p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-[#5A6A85]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                {[
                  { icon: <ArrowLeftRight size={18} />, label: "Transfer\nFunds" },
                  { icon: <RefreshCw size={18} />, label: "Reconcile\nAccount" },
                  { icon: <Download size={18} />, label: "Export\nTransactions" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[#1E2B42] bg-[#080C14] p-3 transition-all hover:border-[#2A3A54] hover:bg-[#131C2E]"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6C3AED]"
                      style={{ background: "rgba(108,58,237,0.12)" }}
                    >
                      {action.icon}
                    </div>
                    <p className="text-center text-[11px] leading-tight font-medium whitespace-pre-line text-[#A8B4CC] transition-colors group-hover:text-[#E8EEF8]">
                      {action.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* What Happens Next */}
            <div className="overflow-hidden rounded-xl border border-[#1E2B42] bg-[#0F1623]">
              <div className="border-b border-[#1E2B42] px-5 py-4">
                <h2 className="text-[14px] font-semibold text-[#E8EEF8]">What Happens Next</h2>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(108,58,237,0.12)" }}
                  >
                    <ShieldCheck size={18} className="text-[#6C3AED]" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      "Account will be hidden from active lists",
                      "Historical reports will remain available",
                      "Transactions will remain unchanged",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" />
                        <p className="text-[12px] leading-relaxed text-[#A8B4CC]">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-4 border-t border-[#1E2B42] pt-4 text-[11px] text-[#5A6A85]">
                  You can restore archived accounts anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Account Timeline (full width) ─────────────── */}
        <div className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-6">
          <h3 className="mb-6 text-base font-semibold text-white">Account Timeline</h3>
          <div className="relative">
            <div className="absolute top-5 right-0 left-0 mx-8 h-px bg-[#1E2B42]" />
            <div
              className="absolute top-5 left-0 mx-8 h-px transition-all duration-700"
              style={{
                background: "linear-gradient(90deg, #22C55E 0%, #22C55E 60%, #6C3AED 100%)",
                right: "25%",
              }}
            />
            <div className="relative flex justify-between">
              {timelineNodes.map((node) => (
                <div key={node.label} className="flex flex-1 flex-col items-center">
                  <div
                    className="z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
                    style={{
                      background: tlBg[node.stage],
                      borderColor: tlColor[node.stage],
                      color: tlColor[node.stage],
                    }}
                  >
                    {node.icon}
                  </div>
                  <p className="mb-1 text-center text-xs leading-tight font-medium text-white">
                    {node.label}
                  </p>
                  <p className="mb-0.5 text-center text-[11px] text-[#5A6A85]">{node.date}</p>
                  <p
                    className={cn("text-center text-[10px] leading-tight", tlMetaText[node.stage])}
                  >
                    {node.meta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && !showSuccess && (
          <ArchiveConfirmationDialog
            key="confirm"
            accountName={account?.name ?? "Account"}
            balance={balance}
            txCount={txCount}
            lastActivity={lastActivity}
            onClose={() => {
              setShowConfirm(false);
              setArchiveError(null);
            }}
            onConfirm={handleArchiveConfirmed}
            error={archiveError}
            isLoading={archiveMutation.isPending}
          />
        )}
        {showSuccess && (
          <ArchiveSuccessDialog
            key="success"
            accountName={account?.name ?? "Account"}
            onViewArchived={() => router.push(`/budgets/${budgetId}/accounts?status=archived`)}
            onReturn={() => router.push(`/budgets/${budgetId}/accounts`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
