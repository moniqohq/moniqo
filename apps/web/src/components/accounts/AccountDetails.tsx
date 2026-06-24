"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  Plus,
  ArrowLeftRight,
  CheckCircle,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { mockAccounts, mockTransactions, mockBudgets } from "@/mock/data";
import { formatCurrency, cn } from "@/lib/utils";
import type { AccountType } from "@/types";
import { BalanceChart, type ChartPoint } from "./BalanceChart";
import { ModifyAccountModal } from "./ModifyAccountModal";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { ForceDeleteAccountDialog } from "./ForceDeleteAccountDialog";

/* ── account metadata & balance history ──────────────── */

const TYPE_META: Record<
  AccountType,
  { icon: React.ReactNode; label: string; color: string; bg: string }
> = {
  checking: {
    icon: <Building2 size={22} />,
    label: "Checking",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.15)",
  },
  savings: {
    icon: <PiggyBank size={22} />,
    label: "Savings",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.15)",
  },
  credit: {
    icon: <CreditCard size={22} />,
    label: "Credit Card",
    color: "#F87171",
    bg: "rgba(239,68,68,0.15)",
  },
  cash: {
    icon: <Wallet size={22} />,
    label: "Cash",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
  },
  investment: {
    icon: <TrendingUp size={22} />,
    label: "Investment",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.15)",
  },
  loan: {
    icon: <Landmark size={22} />,
    label: "Loan",
    color: "#EC4899",
    bg: "rgba(236,72,153,0.15)",
  },
};

interface AccountMeta {
  accountNumber: string;
  createdDate: string;
  lastActivity: string;
  lastReconciled: string;
  onBudget: boolean;
  requiresReconciliation: boolean;
  notes: string;
  clearedBalance: number;
  unclearedBalance: number;
  monthChangePct: number;
  balanceHistory: ChartPoint[];
}

const ACCOUNT_META: Record<string, AccountMeta> = {
  a1: {
    accountNumber: "00001234",
    createdDate: "Jan 1, 2026",
    lastActivity: "May 15, 2026",
    lastReconciled: "May 1, 2026",
    onBudget: true,
    requiresReconciliation: true,
    notes: "Primary checking account for daily expenses",
    monthChangePct: 3.8,
    clearedBalance: 448500,
    unclearedBalance: 9750,
    balanceHistory: [
      { date: "May 15", value: 432000 },
      { date: "May 16", value: 433300 },
      { date: "May 17", value: 434600 },
      { date: "May 18", value: 435900 },
      { date: "May 19", value: 437100 },
      { date: "May 20", value: 438400 },
      { date: "May 21", value: 439700 },
      { date: "May 22", value: 441000 },
      { date: "May 23", value: 440300 },
      { date: "May 24", value: 439600 },
      { date: "May 25", value: 438900 },
      { date: "May 26", value: 438100 },
      { date: "May 27", value: 437400 },
      { date: "May 28", value: 436700 },
      { date: "May 29", value: 436000 },
      { date: "May 30", value: 438100 },
      { date: "May 31", value: 440300 },
      { date: "Jun 01", value: 442400 },
      { date: "Jun 02", value: 444600 },
      { date: "Jun 03", value: 446700 },
      { date: "Jun 04", value: 448900 },
      { date: "Jun 05", value: 451000 },
      { date: "Jun 06", value: 452000 },
      { date: "Jun 07", value: 453100 },
      { date: "Jun 08", value: 454100 },
      { date: "Jun 09", value: 455100 },
      { date: "Jun 10", value: 456200 },
      { date: "Jun 11", value: 457200 },
      { date: "Jun 12", value: 458250 },
    ],
  },
  a2: {
    accountNumber: "00005678",
    createdDate: "Jan 1, 2026",
    lastActivity: "May 14, 2026",
    lastReconciled: "Apr 30, 2026",
    onBudget: true,
    requiresReconciliation: false,
    notes: "Emergency fund and long-term savings",
    monthChangePct: 5.2,
    clearedBalance: 121500,
    unclearedBalance: 3500,
    balanceHistory: [
      { date: "May 15", value: 112000 },
      { date: "May 16", value: 112600 },
      { date: "May 17", value: 113100 },
      { date: "May 18", value: 113700 },
      { date: "May 19", value: 114300 },
      { date: "May 20", value: 114900 },
      { date: "May 21", value: 115400 },
      { date: "May 22", value: 116000 },
      { date: "May 23", value: 116400 },
      { date: "May 24", value: 116900 },
      { date: "May 25", value: 117300 },
      { date: "May 26", value: 117700 },
      { date: "May 27", value: 118100 },
      { date: "May 28", value: 118600 },
      { date: "May 29", value: 119000 },
      { date: "May 30", value: 119400 },
      { date: "May 31", value: 119900 },
      { date: "Jun 01", value: 120300 },
      { date: "Jun 02", value: 120700 },
      { date: "Jun 03", value: 121100 },
      { date: "Jun 04", value: 121600 },
      { date: "Jun 05", value: 122000 },
      { date: "Jun 06", value: 122400 },
      { date: "Jun 07", value: 122900 },
      { date: "Jun 08", value: 123300 },
      { date: "Jun 09", value: 123700 },
      { date: "Jun 10", value: 124100 },
      { date: "Jun 11", value: 124600 },
      { date: "Jun 12", value: 125000 },
    ],
  },
  a3: {
    accountNumber: "00009012",
    createdDate: "Mar 15, 2026",
    lastActivity: "May 13, 2026",
    lastReconciled: "May 1, 2026",
    onBudget: true,
    requiresReconciliation: true,
    notes: "Used for online and subscription payments",
    monthChangePct: -2.1,
    clearedBalance: -15200,
    unclearedBalance: -3200,
    balanceHistory: [
      { date: "May 15", value: 2000 },
      { date: "May 16", value: 2400 },
      { date: "May 17", value: 2700 },
      { date: "May 18", value: 3100 },
      { date: "May 19", value: 3400 },
      { date: "May 20", value: 3800 },
      { date: "May 21", value: 4100 },
      { date: "May 22", value: 4500 },
      { date: "May 23", value: 4300 },
      { date: "May 24", value: 4100 },
      { date: "May 25", value: 3900 },
      { date: "May 26", value: 3600 },
      { date: "May 27", value: 3400 },
      { date: "May 28", value: 3200 },
      { date: "May 29", value: 3000 },
      { date: "May 30", value: 3400 },
      { date: "May 31", value: 3900 },
      { date: "Jun 01", value: 4300 },
      { date: "Jun 02", value: 4700 },
      { date: "Jun 03", value: 5100 },
      { date: "Jun 04", value: 5600 },
      { date: "Jun 05", value: 6000 },
      { date: "Jun 06", value: 6300 },
      { date: "Jun 07", value: 6600 },
      { date: "Jun 08", value: 6800 },
      { date: "Jun 09", value: 7100 },
      { date: "Jun 10", value: 7400 },
      { date: "Jun 11", value: 7700 },
      { date: "Jun 12", value: 8000 },
    ],
  },
  a4: {
    accountNumber: "—",
    createdDate: "Jan 1, 2026",
    lastActivity: "May 14, 2026",
    lastReconciled: "—",
    onBudget: true,
    requiresReconciliation: false,
    notes: "Petty cash for small purchases",
    monthChangePct: -8.7,
    clearedBalance: 4200,
    unclearedBalance: 0,
    balanceHistory: [
      { date: "May 15", value: 1500 },
      { date: "May 16", value: 1700 },
      { date: "May 17", value: 1900 },
      { date: "May 18", value: 2100 },
      { date: "May 19", value: 2400 },
      { date: "May 20", value: 2600 },
      { date: "May 21", value: 2800 },
      { date: "May 22", value: 3000 },
      { date: "May 23", value: 2900 },
      { date: "May 24", value: 2800 },
      { date: "May 25", value: 2700 },
      { date: "May 26", value: 2600 },
      { date: "May 27", value: 2500 },
      { date: "May 28", value: 2500 },
      { date: "May 29", value: 2500 },
      { date: "May 30", value: 2700 },
      { date: "May 31", value: 3000 },
      { date: "Jun 01", value: 3200 },
      { date: "Jun 02", value: 3400 },
      { date: "Jun 03", value: 3700 },
      { date: "Jun 04", value: 3900 },
      { date: "Jun 05", value: 4000 },
      { date: "Jun 06", value: 4000 },
      { date: "Jun 07", value: 4100 },
      { date: "Jun 08", value: 4100 },
      { date: "Jun 09", value: 4100 },
      { date: "Jun 10", value: 4200 },
      { date: "Jun 11", value: 4200 },
      { date: "Jun 12", value: 4200 },
    ],
  },
  a5: {
    accountNumber: "00003456",
    createdDate: "Mar 15, 2026",
    lastActivity: "May 12, 2026",
    lastReconciled: "Apr 30, 2026",
    onBudget: true,
    requiresReconciliation: false,
    notes: "Shared office account for team expenses",
    monthChangePct: 4.6,
    clearedBalance: 69500,
    unclearedBalance: 4500,
    balanceHistory: [
      { date: "May 15", value: 66000 },
      { date: "May 16", value: 66600 },
      { date: "May 17", value: 67100 },
      { date: "May 18", value: 67700 },
      { date: "May 19", value: 68300 },
      { date: "May 20", value: 68900 },
      { date: "May 21", value: 69400 },
      { date: "May 22", value: 70000 },
      { date: "May 23", value: 69700 },
      { date: "May 24", value: 69400 },
      { date: "May 25", value: 69100 },
      { date: "May 26", value: 68800 },
      { date: "May 27", value: 68400 },
      { date: "May 28", value: 68200 },
      { date: "May 29", value: 68000 },
      { date: "May 30", value: 68900 },
      { date: "May 31", value: 69700 },
      { date: "Jun 01", value: 70600 },
      { date: "Jun 02", value: 71400 },
      { date: "Jun 03", value: 71700 },
      { date: "Jun 04", value: 71900 },
      { date: "Jun 05", value: 72000 },
      { date: "Jun 06", value: 72300 },
      { date: "Jun 07", value: 72600 },
      { date: "Jun 08", value: 72900 },
      { date: "Jun 09", value: 73200 },
      { date: "Jun 10", value: 73500 },
      { date: "Jun 11", value: 73700 },
      { date: "Jun 12", value: 74000 },
    ],
  },
};

/* ── sub-components ──────────────────────────────────── */

function StatCell({
  label,
  value,
  color,
  valueSize,
}: {
  label: string;
  value: string;
  color?: string;
  valueSize?: string;
}) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-[#5A6A85]">{label}</p>
      <p className={cn(valueSize ?? "text-base", "font-bold tabular-nums", color ?? "text-white")}>
        {value}
      </p>
    </div>
  );
}

function MetaCard({
  label,
  value,
  masked,
  showMask,
  onToggleMask,
  valueColor,
  multiline,
}: {
  label: string;
  value: string;
  masked?: boolean;
  showMask?: boolean;
  onToggleMask?: () => void;
  valueColor?: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#1A2540] bg-[#0B1120] p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5A6A85]">
        {label}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "font-semibold",
            multiline ? "line-clamp-2 text-xs leading-relaxed" : "truncate text-sm",
          )}
          style={{ color: valueColor ?? "#C8D4E8" }}
        >
          {masked && !showMask ? `••••${value.slice(-4)}` : value}
        </p>
        {masked && onToggleMask && (
          <button
            onClick={onToggleMask}
            className="flex-shrink-0 text-[#5A6A85] transition-colors hover:text-[#A78BFA]"
          >
            {showMask ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────── */

interface Props {
  accountId: string;
}

export function AccountDetails({ accountId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAccNum, setShowAccNum] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [addTxDefault, setAddTxDefault] = useState<"expense" | "income" | "transfer">("expense");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const account = mockAccounts.find((a) => a.id === accountId) ?? mockAccounts[0];
  const meta = ACCOUNT_META[account.id] ?? ACCOUNT_META.a1;
  const budget = mockBudgets.find((b) => b.id === account.budgetId);
  const typeMeta = TYPE_META[account.type];

  const allTxns = mockTransactions.filter((t) => t.accountId === accountId);
  const filtered = allTxns.filter(
    (t) =>
      !search ||
      t.payee.toLowerCase().includes(search.toLowerCase()) ||
      (t.memo ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const pageTxns = filtered.slice(0, 5);

  return (
    <div className="min-w-0 space-y-4">
      {/* ── Account Header + Balance Overview + Metadata ── */}
      <div className="space-y-5 rounded-2xl border border-[#1A2540] bg-[#0B1120] p-5">
        {/* Account Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{
                backgroundColor: typeMeta.bg,
                color: typeMeta.color,
                boxShadow: `0 0 20px ${typeMeta.color}25`,
              }}
            >
              {typeMeta.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">{account.name}</h2>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                >
                  {typeMeta.label}
                </span>
                {account.archived && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#252F45] bg-[#1A2540] px-2.5 py-0.5 text-xs font-semibold text-[#5A6A85]">
                    <Archive size={11} />
                    Archived
                  </span>
                )}
              </div>
              {budget && <p className="mt-1 text-xs font-medium text-[#7C4AFF]">{budget.name}</p>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
            {account.archived ? (
              <>
                <button
                  title="Restore Account"
                  onClick={undefined}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] px-3 py-1.5 text-xs font-medium text-[#4ADE80] transition-all hover:border-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.15)]"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">Restore Account</span>
                </button>
                <button
                  title="Delete Account"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] px-3 py-1.5 text-xs font-medium text-[#F87171] transition-all hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.15)]"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Delete Account</span>
                </button>
              </>
            ) : (
              (
                [
                  {
                    icon: <Plus size={14} />,
                    label: "Add Transaction",
                    onClick: () => {
                      setAddTxDefault("expense");
                      setAddTxOpen(true);
                    },
                  },
                  {
                    icon: <ArrowLeftRight size={14} />,
                    label: "Transfer",
                    onClick: () => {
                      setAddTxDefault("transfer");
                      setAddTxOpen(true);
                    },
                  },
                  {
                    icon: <CheckCircle size={14} />,
                    label: "Reconcile",
                    onClick: () =>
                      router.push(`/budgets/${account.budgetId}/accounts/${accountId}/reconcile`),
                  },
                  { icon: <Edit2 size={14} />, label: "Edit", onClick: () => setModifyOpen(true) },
                  {
                    icon: <Archive size={14} />,
                    label: "Archive",
                    onClick: () =>
                      router.push(`/budgets/${account.budgetId}/accounts/${accountId}/archive`),
                  },
                ] as { icon: React.ReactNode; label: string; onClick?: () => void }[]
              ).map(({ icon, label, onClick }) => (
                <button
                  key={label}
                  title={label}
                  onClick={onClick}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2540] bg-[#0D1525] px-3 py-1.5 text-xs font-medium text-[#E2EAF4] transition-all hover:border-[#2A3A54] hover:bg-[#111B2D] hover:text-white"
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Balance Overview — nested card */}
        <div className="rounded-xl border border-[#1A2540] bg-[#060C18] p-4">
          <div className="mb-5 flex items-center justify-between gap-6">
            <div className="flex flex-1 flex-wrap items-start gap-14">
              <div className="flex items-start gap-8">
                <div>
                  <p className="mb-0.5 text-xs text-[#5A6A85]">Current Balance</p>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      account.balance < 0 ? "text-[#F87171]" : "text-white",
                    )}
                  >
                    {formatCurrency(account.balance)}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {meta.monthChangePct >= 0 ? (
                      <TrendingUp size={11} className="text-[#22C55E]" />
                    ) : (
                      <TrendingDown size={11} className="text-[#F87171]" />
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        meta.monthChangePct >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                      )}
                    >
                      {meta.monthChangePct >= 0 ? "+" : ""}
                      {meta.monthChangePct}% vs last month
                    </span>
                  </div>
                </div>
                <div className="mx-1 w-px self-stretch bg-[#1A2540]" />
              </div>
              <StatCell
                label="Cleared Balance"
                value={formatCurrency(meta.clearedBalance)}
                color="text-[#4ADE80]"
              />
              <StatCell
                label="Uncleared Balance"
                value={formatCurrency(meta.unclearedBalance)}
                color="text-[#F59E0B]"
              />
              <StatCell label="Last Reconciled" value={meta.lastReconciled} valueSize="text-sm" />
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-xs font-semibold text-[#4ADE80]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                Reconciled
              </span>
              <p className="text-[10px] text-[#3A4A60]">Up to {meta.lastReconciled}</p>
            </div>
          </div>
          <BalanceChart data={meta.balanceHistory} />
        </div>

        {/* Account Information */}
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <MetaCard label="Account Type" value={typeMeta.label} />
            <MetaCard label="Institution" value={account.institution ?? "N/A"} />
            <MetaCard
              label="Requires Reconciliation"
              value={meta.requiresReconciliation ? "Yes" : "No"}
              valueColor={meta.requiresReconciliation ? "#86EFAC" : "#FCD34D"}
            />
            <MetaCard
              label="On Budget"
              value={meta.onBudget ? "Yes" : "No"}
              valueColor={meta.onBudget ? "#4ADE80" : "#F87171"}
            />
            <MetaCard label="Created Date" value={meta.createdDate} />
            <MetaCard label="Last Activity" value={meta.lastActivity} />
            <MetaCard label="Notes" value={meta.notes} multiline />
            <MetaCard
              label="Account Number"
              value={meta.accountNumber}
              masked={meta.accountNumber !== "—"}
              showMask={showAccNum}
              onToggleMask={() => setShowAccNum((s) => !s)}
            />
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ───────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-[#1A2540] bg-[#0B1120]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#1A2540] px-5 py-4">
          <h3 className="flex-shrink-0 text-sm font-bold text-white">Recent Transactions</h3>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div className="relative max-w-[220px] flex-1">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6A85]"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search transactions…"
                className="w-full rounded-lg border border-[#1A2540] bg-[#0D1525] py-1.5 pl-8 pr-3 text-xs text-white transition-all placeholder:text-[#2A3A54] focus:border-[#6C3AED] focus:outline-none focus:ring-2 focus:ring-[#6C3AED]/40"
              />
            </div>
            <button className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#1A2540] bg-[#0D1525] px-2.5 py-1.5 text-xs text-[#7A8BA8] transition-colors hover:text-white">
              <Filter size={12} />
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#111B2D]">
                {["Date", "Payee", "Category", "Amount", "Status"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#5A6A85]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0D1525]">
              {pageTxns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#3A4A60]">
                    No transactions found
                  </td>
                </tr>
              ) : (
                pageTxns.map((tx) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="cursor-pointer transition-colors hover:bg-[#0D1525]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[#8A9AB5]">
                      {new Date(tx.date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                          style={{ backgroundColor: tx.payeeColor ?? "#1E2B42" }}
                        >
                          {tx.payee[0]}
                        </div>
                        <span className="max-w-[120px] truncate font-medium text-[#C8D4E8]">
                          {tx.payee}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {tx.envelopeName ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${tx.envelopeColor ?? "#6C3AED"}20`,
                            color: tx.envelopeColor ?? "#A78BFA",
                          }}
                        >
                          {tx.envelopeIcon} {tx.envelopeName}
                        </span>
                      ) : (
                        <span className="text-[#3A4A60]">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-3 font-bold tabular-nums",
                        tx.amount >= 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                      )}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          tx.cleared
                            ? "border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] text-[#4ADE80]"
                            : "border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] text-[#FCD34D]",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1 w-1 rounded-full",
                            tx.cleared ? "bg-[#22C55E]" : "bg-[#F59E0B]",
                          )}
                        />
                        {tx.cleared ? "Cleared" : "Uncleared"}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {allTxns.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[#3A4A60]">No transactions for this account yet.</p>
          </div>
        )}
      </div>

      <ModifyAccountModal
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        accountId={accountId}
      />
      <AddTransactionModal
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        defaultType={addTxDefault}
      />
      <ForceDeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        account={{ id: account.id, name: account.name, type: account.type }}
      />
    </div>
  );
}
