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
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Banknote,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Filter,
  Heart,
  Landmark,
  Music,
  Package,
  PiggyBank,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  X,
  Clock,
  AlertCircle,
  Utensils,
  Layers,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { mockAccounts, mockBudgets } from "@/mock/data";
import type { AccountType } from "@/types";

/* ── Constants ─────────────────────────────────────────────── */

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

const OPENING_RECON_BALANCE = 426215.5;

type ReconTx = {
  id: string;
  date: string;
  payee: string;
  category: string;
  subLabel?: string;
  inflow: number;
  outflow: number;
  runningBalance: number;
  cleared: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  type: "income" | "expense" | "transfer";
};

const INITIAL_TRANSACTIONS: ReconTx[] = [
  {
    id: "r1",
    date: "2024-05-01",
    payee: "Salary Deposit",
    category: "Income",
    inflow: 75000,
    outflow: 0,
    runningBalance: 458250,
    cleared: true,
    type: "income",
    icon: <TrendingUp size={14} />,
    iconBg: "rgba(34,197,94,0.15)",
    iconColor: "#22C55E",
  },
  {
    id: "r2",
    date: "2024-05-02",
    payee: "Swiggy",
    category: "Food & Dining",
    inflow: 0,
    outflow: 620,
    runningBalance: 457630,
    cleared: true,
    type: "expense",
    icon: <Utensils size={14} />,
    iconBg: "rgba(249,115,22,0.15)",
    iconColor: "#F97316",
  },
  {
    id: "r3",
    date: "2024-05-03",
    payee: "DMart",
    category: "Groceries",
    inflow: 0,
    outflow: 2345.5,
    runningBalance: 455284.5,
    cleared: true,
    type: "expense",
    icon: <ShoppingCart size={14} />,
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3B82F6",
  },
  {
    id: "r4",
    date: "2024-05-05",
    payee: "Credit Card Payment",
    category: "Credit Card Payments",
    inflow: 0,
    outflow: 25000,
    runningBalance: 430284.5,
    cleared: true,
    type: "expense",
    icon: <CreditCard size={14} />,
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3B82F6",
  },
  {
    id: "r5",
    date: "2024-05-07",
    payee: "Transfer to Savings",
    category: "Transfers",
    subLabel: "→ Savings Account",
    inflow: 0,
    outflow: 10000,
    runningBalance: 420284.5,
    cleared: true,
    type: "transfer",
    icon: <ArrowLeftRight size={14} />,
    iconBg: "rgba(90,106,133,0.2)",
    iconColor: "#8899AA",
  },
  {
    id: "r6",
    date: "2024-05-10",
    payee: "ATM Withdrawal",
    category: "Cash & ATM",
    inflow: 0,
    outflow: 5000,
    runningBalance: 415284.5,
    cleared: true,
    type: "expense",
    icon: <Banknote size={14} />,
    iconBg: "rgba(245,158,11,0.15)",
    iconColor: "#F59E0B",
  },
  {
    id: "r7",
    date: "2024-05-12",
    payee: "Freelance Payment",
    category: "Income",
    inflow: 15000,
    outflow: 0,
    runningBalance: 430284.5,
    cleared: false,
    type: "income",
    icon: <Briefcase size={14} />,
    iconBg: "rgba(34,197,94,0.15)",
    iconColor: "#22C55E",
  },
  {
    id: "r8",
    date: "2024-05-13",
    payee: "Amazon.in",
    category: "Shopping",
    inflow: 0,
    outflow: 3499,
    runningBalance: 426785.5,
    cleared: false,
    type: "expense",
    icon: <Package size={14} />,
    iconBg: "rgba(245,158,11,0.15)",
    iconColor: "#F59E0B",
  },
  {
    id: "r9",
    date: "2024-05-14",
    payee: "Transfer from Savings",
    category: "Transfers",
    subLabel: "← Savings Account",
    inflow: 5000,
    outflow: 0,
    runningBalance: 431785.5,
    cleared: false,
    type: "transfer",
    icon: <ArrowLeftRight size={14} />,
    iconBg: "rgba(90,106,133,0.2)",
    iconColor: "#8899AA",
  },
  {
    id: "r10",
    date: "2024-05-15",
    payee: "Pharmacy",
    category: "Health",
    inflow: 0,
    outflow: 850,
    runningBalance: 430935.5,
    cleared: false,
    type: "expense",
    icon: <Heart size={14} />,
    iconBg: "rgba(236,72,153,0.15)",
    iconColor: "#EC4899",
  },
  {
    id: "r11",
    date: "2024-05-15",
    payee: "Spotify Subscription",
    category: "Entertainment",
    inflow: 0,
    outflow: 149,
    runningBalance: 430786.5,
    cleared: false,
    type: "expense",
    icon: <Music size={14} />,
    iconBg: "rgba(34,197,94,0.15)",
    iconColor: "#1DB954",
  },
];

function fmtAmt(v: number) {
  if (v === 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtFull(v: number) {
  const s = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(v));
  return `₹${s}`;
}

/* ── Circular Progress ─────────────────────────────────────── */

function CircularProgress({
  value,
  size = 110,
  strokeWidth = 9,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  const color = value >= 100 ? "#22C55E" : "#6C3AED";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1E2B42"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg leading-none font-bold text-white">{Math.round(value)}%</span>
        <span className="mt-0.5 text-[10px] text-[#5A6A85]">Complete</span>
      </div>
    </div>
  );
}

/* ── Reconciliation Success Dialog ─────────────────────────── */

function ReconciliationSuccessDialog({
  open,
  onClose,
  onViewAccount,
  clearedCount,
  totalCount,
  clearedBalance,
  statementDate,
}: {
  open: boolean;
  onClose: () => void;
  onViewAccount: () => void;
  clearedCount: number;
  totalCount: number;
  clearedBalance: number;
  statementDate: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#5A6A85] transition-colors hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 20 }}
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(34,197,94,0.15)]"
              >
                <CheckCircle2 size={32} className="text-[#22C55E]" />
              </motion.div>

              <h2 className="mb-1 text-xl font-bold text-white">Account Reconciled Successfully</h2>
              <p className="mb-6 text-sm text-[#5A6A85]">
                Ledger balance matches statement balance.
              </p>

              <div className="mb-7 grid w-full grid-cols-3 gap-3">
                {[
                  { label: "Transactions Cleared", value: `${clearedCount} of ${totalCount}` },
                  { label: "Reconciled Amount", value: fmtFull(clearedBalance), green: true },
                  { label: "Statement Date", value: fmtDate(statementDate) },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-[#131C2E] p-3">
                    <p className="mb-1 text-[10px] leading-tight text-[#5A6A85]">{item.label}</p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        item.green ? "text-[#22C55E]" : "text-white",
                      )}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={onViewAccount}
                  className="h-10 flex-1 rounded-xl border border-[#1E2B42] text-sm font-medium text-[#C4B5FD] transition-colors hover:bg-[#1E2B42]"
                >
                  View Account
                </button>
                <button
                  onClick={onClose}
                  className="h-10 flex-1 rounded-xl bg-[#6C3AED] text-sm font-semibold text-white transition-colors hover:bg-[#7C4AF0]"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Reconciliation Timeline ───────────────────────────────── */

type TimelineStage = "completed" | "current" | "future";

function ReconciliationTimeline({ progress }: { progress: number }) {
  const nodes = [
    {
      icon: <Building2 size={16} />,
      title: "Account Created",
      date: "Apr 10, 2024",
      meta: "Opening balance ₹50,000.00",
      stage: "completed" as TimelineStage,
    },
    {
      icon: <CheckCircle2 size={16} />,
      title: "Reconciled",
      date: "Apr 30, 2024",
      meta: "Balance · ₹4,28,500.00",
      stage: "completed" as TimelineStage,
    },
    {
      icon: <Download size={16} />,
      title: "Statement Imported",
      date: "May 1, 2024",
      meta: "Statement balance ₹4,58,250.00",
      stage: "completed" as TimelineStage,
    },
    {
      icon: <SlidersHorizontal size={16} />,
      title: "Manual Adjustment",
      date: "May 1, 2024",
      meta: "+₹0.00 (No adjustment)",
      stage: "completed" as TimelineStage,
    },
    {
      icon: <BadgeCheck size={16} />,
      title: "Current Reconciliation",
      date: "May 15, 2024",
      meta: `In Progress · ${progress}%`,
      stage: "current" as TimelineStage,
    },
  ];

  const stageColor: Record<TimelineStage, string> = {
    completed: "#22C55E",
    current: "#6C3AED",
    future: "#1E2B42",
  };
  const stageBg: Record<TimelineStage, string> = {
    completed: "rgba(34,197,94,0.12)",
    current: "rgba(108,58,237,0.15)",
    future: "rgba(30,43,66,0.5)",
  };
  const stageTextColor: Record<TimelineStage, string> = {
    completed: "#22C55E",
    current: "#C4B5FD",
    future: "#3A4A60",
  };

  return (
    <div className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-6">
      <h3 className="mb-6 text-base font-semibold text-white">Reconciliation Timeline</h3>
      <div className="relative">
        <div className="absolute top-5 right-0 left-0 mx-8 h-px bg-[#1E2B42]" />
        <div
          className="absolute top-5 left-0 mx-8 h-px transition-all duration-700"
          style={{
            background: "linear-gradient(90deg, #22C55E 0%, #22C55E 75%, #6C3AED 100%)",
            right: "20%",
          }}
        />

        <div className="relative flex justify-between">
          {nodes.map((node) => (
            <div key={node.title} className="flex flex-1 flex-col items-center">
              <div
                className="z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
                style={{
                  background: stageBg[node.stage],
                  borderColor: stageColor[node.stage],
                  color: stageColor[node.stage],
                }}
              >
                {node.icon}
              </div>
              <p className="mb-1 text-center text-xs leading-tight font-medium text-white">
                {node.title}
              </p>
              <p className="mb-0.5 text-center text-[11px] text-[#5A6A85]">{node.date}</p>
              <p
                className={cn("text-center text-[10px] leading-tight", stageTextColor[node.stage])}
              >
                {node.meta}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

interface Props {
  budgetId: string;
  accountId: string;
}

export function ReconcileAccountView({ budgetId, accountId }: Props) {
  const router = useRouter();

  const account = mockAccounts.find((a) => a.id === accountId) ?? mockAccounts[0];
  const budget = mockBudgets.find((b) => b.id === budgetId) ?? mockBudgets[0];
  const typeMeta = TYPE_META[account.type];

  const [transactions, setTransactions] = useState<ReconTx[]>(INITIAL_TRANSACTIONS);
  const [statementBalanceStr, setStatementBalanceStr] = useState("458250");
  const [statementDate, setStatementDate] = useState("2024-05-15");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "cleared" | "uncleared" | "income" | "expense" | "transfer"
  >("all");
  const [sortBy, setSortBy] = useState<string>("date-oldest");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  /* ── Derived ─────────────────────────────────────────────── */

  const statementBalance = parseFloat(statementBalanceStr.replace(/,/g, "")) || 0;

  const clearedBalance = useMemo(() => {
    const net = transactions
      .filter((t) => t.cleared)
      .reduce((acc, t) => acc + t.inflow - t.outflow, 0);
    return OPENING_RECON_BALANCE + net;
  }, [transactions]);

  const difference = statementBalance - clearedBalance;
  const clearedCount = transactions.filter((t) => t.cleared).length;
  const totalCount = transactions.length;
  const progress = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;
  const canFinish = Math.abs(difference) < 0.005;

  const reconciliationStatus =
    clearedCount === 0 ? "Not Started" : canFinish ? "Reconciled" : "In Progress";

  const diffColor = canFinish ? "#22C55E" : Math.abs(difference) < 5000 ? "#F59E0B" : "#EF4444";

  /* ── Filtered & sorted rows ──────────────────────────────── */

  const filteredRows = useMemo(() => {
    let rows = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.payee.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
      );
    }
    if (filter === "cleared") rows = rows.filter((t) => t.cleared);
    if (filter === "uncleared") rows = rows.filter((t) => !t.cleared);
    if (filter === "income") rows = rows.filter((t) => t.type === "income");
    if (filter === "expense") rows = rows.filter((t) => t.type === "expense");
    if (filter === "transfer") rows = rows.filter((t) => t.type === "transfer");

    rows.sort((a, b) => {
      switch (sortBy) {
        case "date-newest":
          return b.date.localeCompare(a.date);
        case "date-oldest":
          return a.date.localeCompare(b.date);
        case "amount":
          return Math.abs(b.inflow - b.outflow) - Math.abs(a.inflow - a.outflow);
        case "payee":
          return a.payee.localeCompare(b.payee);
        default:
          return 0;
      }
    });
    return rows;
  }, [transactions, search, filter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearedRows = filteredRows.filter((t) => t.cleared);
  const unclearedRows = filteredRows.filter((t) => !t.cleared);
  const clearedFooterAmt = clearedRows.reduce((s, t) => s + t.outflow, 0);
  const unclearedFooterAmt =
    unclearedRows.length > 0 ? unclearedRows[unclearedRows.length - 1].runningBalance : 0;

  /* ── Handlers ────────────────────────────────────────────── */

  function toggleCleared(id: string) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, cleared: !t.cleared } : t)));
  }

  function markAllCleared() {
    setTransactions((prev) => prev.map((t) => ({ ...t, cleared: true })));
  }

  function handleAllCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setTransactions((prev) => prev.map((t) => ({ ...t, cleared: checked })));
  }

  const allChecked = transactions.length > 0 && transactions.every((t) => t.cleared);
  const someChecked = transactions.some((t) => t.cleared) && !allChecked;

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#080C14] text-[#E8EEF8]">
      <ReconciliationSuccessDialog
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        onViewAccount={() => router.push(`/budgets/${budgetId}/accounts`)}
        clearedCount={clearedCount}
        totalCount={totalCount}
        clearedBalance={clearedBalance}
        statementDate={statementDate}
      />

      {/* ── Scrollable content ── */}
      <div className="layout-page space-y-5 py-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reconcile Account</h1>
            <p className="mt-0.5 text-sm text-[#5A6A85]">
              Verify account balances against your bank statement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="h-10 rounded-xl border border-[#1E2B42] px-5 text-sm font-medium text-[#E8EEF8] transition-colors hover:bg-[#131C2E]"
            >
              Cancel
            </button>
            <button
              disabled={!canFinish}
              onClick={() => setShowSuccess(true)}
              className={cn(
                "h-10 rounded-xl px-5 text-sm font-semibold transition-all",
                canFinish
                  ? "bg-[#6C3AED] text-white shadow-lg shadow-purple-900/30 hover:bg-[#7C4AF0]"
                  : "cursor-not-allowed bg-[#6C3AED]/30 text-white/40",
              )}
            >
              Finish Reconciliation
            </button>
          </div>
        </div>

        {/* ── Summary Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-5"
        >
          <div className="flex flex-wrap items-center gap-5">
            {/* Account identity */}
            <div className="flex min-w-0 flex-shrink-0 items-center gap-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: typeMeta.bg, color: typeMeta.color }}
              >
                {typeMeta.icon}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold whitespace-nowrap text-white">
                    {account.institution
                      ? `${account.institution} ${account.name.replace(account.institution, "").trim()}`
                      : account.name}
                  </span>
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{ background: typeMeta.bg, color: typeMeta.color }}
                  >
                    {typeMeta.label}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-[#5A6A85]">
                  <Layers size={11} />
                  <span>{budget.name}</span>
                </div>
              </div>
            </div>

            <div className="hidden h-10 w-px bg-[#1E2B42] lg:block" />

            {/* Metrics row */}
            <div className="flex flex-1 flex-wrap items-center gap-6">
              <div className="min-w-[110px]">
                <p className="mb-0.5 text-[11px] text-[#5A6A85]">Current Ledger Balance</p>
                <p className="text-lg font-bold text-white">{fmtFull(account.balance)}</p>
              </div>

              <div className="min-w-[110px]">
                <p className="mb-0.5 text-[11px] text-[#5A6A85]">Cleared Balance</p>
                <p className="text-lg font-bold text-[#22C55E]">{fmtFull(clearedBalance)}</p>
              </div>

              <div className="min-w-[110px]">
                <p className="mb-0.5 text-[11px] text-[#5A6A85]">Statement Balance</p>
                <p className="text-lg font-bold text-white">{fmtFull(statementBalance)}</p>
              </div>

              <div className="min-w-[90px]">
                <p className="mb-0.5 text-[11px] text-[#5A6A85]">Difference</p>
                <p className="text-lg font-bold transition-colors" style={{ color: diffColor }}>
                  {fmtFull(difference)}
                </p>
              </div>

              <div className="hidden h-10 w-px bg-[#1E2B42] xl:block" />

              {/* Status + last reconciled */}
              <div className="flex flex-col gap-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                    reconciliationStatus === "Reconciled"
                      ? "bg-[rgba(34,197,94,0.12)] text-[#22C55E]"
                      : reconciliationStatus === "In Progress"
                        ? "bg-[rgba(245,158,11,0.12)] text-[#F59E0B]"
                        : "bg-[rgba(90,106,133,0.15)] text-[#5A6A85]",
                  )}
                >
                  {reconciliationStatus === "Reconciled" && <CheckCircle2 size={12} />}
                  {reconciliationStatus === "In Progress" && <Clock size={12} />}
                  {reconciliationStatus === "Not Started" && <AlertCircle size={12} />}
                  {reconciliationStatus}
                </span>
                <div className="text-[11px] text-[#5A6A85]">
                  <span className="block">Last reconciled</span>
                  <span className="font-medium text-[#8899AA]">May 1, 2024</span>
                </div>
              </div>

              {/* Circular progress */}
              <div className="ml-auto">
                <CircularProgress value={progress} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Main 2-column layout ── */}
        <div className="flex items-start gap-5">
          {/* ── LEFT: Transaction Table (70%) ── */}
          <div className="min-w-0 flex-1 space-y-0 overflow-hidden rounded-2xl border border-[#1E2B42] bg-[#0F1623]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[#1E2B42] px-4 py-3">
              {/* Search */}
              <div className="flex h-9 max-w-xs min-w-[160px] flex-1 items-center gap-2 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3">
                <Search size={14} className="flex-shrink-0 text-[#5A6A85]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transactions..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#E8EEF8] placeholder-[#3A4A60] outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X size={13} className="text-[#5A6A85] hover:text-white" />
                  </button>
                )}
              </div>

              {/* Filters dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowFilterMenu((v) => !v);
                    setShowSortMenu(false);
                  }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 text-sm text-[#8899AA] transition-colors hover:border-[#2A3A54] hover:text-white"
                >
                  <Filter size={14} />
                  <span>Filters</span>
                  {filter !== "all" && <span className="h-1.5 w-1.5 rounded-full bg-[#6C3AED]" />}
                </button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-full left-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#131C2E] py-1 shadow-xl"
                    >
                      {(
                        ["all", "cleared", "uncleared", "income", "expense", "transfer"] as const
                      ).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            setFilter(f);
                            setShowFilterMenu(false);
                            setPage(1);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm capitalize transition-colors",
                            filter === f
                              ? "bg-[rgba(108,58,237,0.12)] text-[#C4B5FD]"
                              : "text-[#8899AA] hover:bg-[#1E2B42] hover:text-white",
                          )}
                        >
                          {f === "all"
                            ? "All Transactions"
                            : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mark all cleared */}
              <button
                onClick={markAllCleared}
                className="flex h-9 items-center gap-2 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 text-sm text-[#8899AA] transition-colors hover:border-[#2A3A54] hover:text-white"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Mark All Cleared</span>
              </button>

              {/* Sort dropdown */}
              <div className="relative ml-auto">
                <button
                  onClick={() => {
                    setShowSortMenu((v) => !v);
                    setShowFilterMenu(false);
                  }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 text-sm text-[#8899AA] transition-colors hover:border-[#2A3A54] hover:text-white"
                >
                  <SlidersHorizontal size={14} />
                  <span className="hidden sm:inline">
                    Sort:{" "}
                    {sortBy === "date-oldest"
                      ? "Date (Oldest)"
                      : sortBy === "date-newest"
                        ? "Date (Newest)"
                        : sortBy === "amount"
                          ? "Amount"
                          : "Payee"}
                  </span>
                </button>
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-full right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-[#1E2B42] bg-[#131C2E] py-1 shadow-xl"
                    >
                      {[
                        { value: "date-newest", label: "Date (Newest)" },
                        { value: "date-oldest", label: "Date (Oldest)" },
                        { value: "amount", label: "Amount" },
                        { value: "payee", label: "Payee" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSortMenu(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm transition-colors",
                            sortBy === opt.value
                              ? "bg-[rgba(108,58,237,0.12)] text-[#C4B5FD]"
                              : "text-[#8899AA] hover:bg-[#1E2B42] hover:text-white",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E2B42]">
                    <th className="w-10 py-3 pl-4">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked;
                        }}
                        onChange={handleAllCheckbox}
                        className="h-4 w-4 cursor-pointer rounded border-[#2A3A54] bg-[#131C2E] accent-[#6C3AED]"
                      />
                    </th>
                    <th className="py-3 pr-4 text-left text-[11px] font-medium whitespace-nowrap text-[#5A6A85]">
                      Date
                    </th>
                    <th className="py-3 pr-4 text-left text-[11px] font-medium text-[#5A6A85]">
                      Payee
                    </th>
                    <th className="hidden py-3 pr-4 text-left text-[11px] font-medium text-[#5A6A85] md:table-cell">
                      Category / Envelope
                    </th>
                    <th className="py-3 pr-4 text-right text-[11px] font-medium text-[#5A6A85]">
                      Inflow
                    </th>
                    <th className="py-3 pr-4 text-right text-[11px] font-medium text-[#5A6A85]">
                      Outflow
                    </th>
                    <th className="hidden py-3 pr-4 text-right text-[11px] font-medium text-[#5A6A85] lg:table-cell">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {pageRows.map((tx) => (
                      <motion.tr
                        key={tx.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleCleared(tx.id)}
                        className={cn(
                          "group cursor-pointer border-b border-[#0F1623] transition-colors",
                          tx.cleared
                            ? "bg-[rgba(34,197,94,0.04)] hover:bg-[rgba(34,197,94,0.08)]"
                            : "hover:bg-[#131C2E]",
                        )}
                      >
                        <td className="w-10 py-3 pl-4">
                          <div
                            className={cn(
                              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all",
                              tx.cleared
                                ? "border-[#22C55E] bg-[#22C55E]"
                                : "border-[#2A3A54] bg-[#131C2E] group-hover:border-[#6C3AED]",
                            )}
                          >
                            {tx.cleared && (
                              <CheckCheck size={11} className="text-white" strokeWidth={3} />
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm whitespace-nowrap text-[#8899AA]">
                          {fmtDate(tx.date)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{ background: tx.iconBg, color: tx.iconColor }}
                            >
                              {tx.icon}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "max-w-[160px] truncate text-sm font-medium",
                                  tx.cleared ? "text-white" : "text-[#E8EEF8]",
                                )}
                              >
                                {tx.payee}
                              </p>
                              {tx.subLabel && (
                                <p className="truncate text-[10px] text-[#5A6A85]">{tx.subLabel}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden py-3 pr-4 md:table-cell">
                          <span className="text-sm text-[#5A6A85]">{tx.category}</span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {tx.inflow > 0 ? (
                            <span className="text-sm font-medium text-[#22C55E]">
                              ₹{fmtAmt(tx.inflow)}
                            </span>
                          ) : (
                            <span className="text-sm text-[#3A4A60]">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {tx.outflow > 0 ? (
                            <span className="text-sm font-medium text-[#EF4444]">
                              -₹{fmtAmt(tx.outflow)}
                            </span>
                          ) : (
                            <span className="text-sm text-[#3A4A60]">—</span>
                          )}
                        </td>
                        <td className="hidden py-3 pr-4 text-right lg:table-cell">
                          <span className="text-sm text-[#8899AA]">
                            ₹
                            {new Intl.NumberFormat("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(tx.runningBalance)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredRows.length === 0 && (
                <div className="py-14 text-center text-sm text-[#5A6A85]">
                  No transactions match your filters.
                </div>
              )}
            </div>

            {/* Table footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1E2B42] px-4 py-3">
              <div className="flex items-center gap-5 text-sm">
                <span className="text-[#5A6A85]">
                  Cleared:{" "}
                  <span className="font-medium text-[#22C55E]">
                    {clearedRows.length} (₹
                    {new Intl.NumberFormat("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(clearedFooterAmt)}
                    )
                  </span>
                </span>
                <span className="text-[#5A6A85]">
                  Uncleared:{" "}
                  <span className="font-medium text-[#8899AA]">
                    {unclearedRows.length} (₹
                    {new Intl.NumberFormat("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(unclearedFooterAmt)}
                    )
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[#5A6A85]">{filteredRows.length} transactions</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1E2B42] text-[#5A6A85] transition-colors hover:border-[#2A3A54] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-1 text-xs text-[#5A6A85]">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1E2B42] text-[#5A6A85] transition-colors hover:border-[#2A3A54] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <span className="text-xs text-[#5A6A85]">{PAGE_SIZE} / page</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (30%) ── */}
          <div className="w-[300px] flex-shrink-0 space-y-4">
            {/* Card 1: Statement Input */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-xs font-bold text-white">
                  1
                </span>
                <h3 className="text-sm font-semibold text-white">Statement Input</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[11px] text-[#5A6A85]">
                    Statement Ending Balance
                  </label>
                  <div className="flex h-10 items-center gap-1.5 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 transition-colors focus-within:border-[#6C3AED]">
                    <span className="text-sm text-[#5A6A85]">₹</span>
                    <input
                      type="text"
                      value={statementBalanceStr}
                      onChange={(e) =>
                        setStatementBalanceStr(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] text-[#5A6A85]">Statement Date</label>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-[#1E2B42] bg-[#131C2E] px-3 transition-colors focus-within:border-[#6C3AED]">
                    <input
                      type="date"
                      value={statementDate}
                      onChange={(e) => setStatementDate(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm text-white [color-scheme:dark] outline-none"
                    />
                    <Calendar size={14} className="flex-shrink-0 text-[#5A6A85]" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Reconciliation Progress */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-xs font-bold text-white">
                  2
                </span>
                <h3 className="text-sm font-semibold text-white">Reconciliation Progress</h3>
              </div>

              <div className="flex items-center gap-4">
                <CircularProgress value={progress} size={96} strokeWidth={8} />
                <div className="min-w-0 flex-1 space-y-2">
                  {[
                    { label: "Cleared Balance", value: fmtFull(clearedBalance), color: "#22C55E" },
                    { label: "Remaining Difference", value: fmtFull(difference), color: diffColor },
                    {
                      label: "Transactions Cleared",
                      value: `${clearedCount} of ${totalCount}`,
                      color: "white",
                    },
                    {
                      label: "Reconciliation Progress",
                      value: `${progress}%`,
                      color: progress === 100 ? "#22C55E" : "#C4B5FD",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] leading-tight text-[#5A6A85]">{item.label}</span>
                      <span
                        className="text-xs font-semibold whitespace-nowrap"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!canFinish && (
                <p className="mt-3 border-t border-[#1A2438] pt-3 text-[10px] leading-snug text-[#5A6A85]">
                  Remaining difference must equal zero before reconciliation can be completed.
                </p>
              )}
            </motion.div>

            {/* Card 3: Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-[#1E2B42] bg-[#0F1623] p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#6C3AED] text-xs font-bold text-white">
                  3
                </span>
                <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    icon: <SlidersHorizontal size={18} />,
                    label: "Add Adjustment Transaction",
                    color: "#6C3AED",
                    bg: "rgba(108,58,237,0.12)",
                  },
                  {
                    icon: <Plus size={18} />,
                    label: "Create Missing Transaction",
                    color: "#22C55E",
                    bg: "rgba(34,197,94,0.12)",
                  },
                  {
                    icon: <Banknote size={18} />,
                    label: "Record Bank Fee",
                    color: "#F59E0B",
                    bg: "rgba(245,158,11,0.12)",
                  },
                  {
                    icon: <Download size={18} />,
                    label: "Export Report",
                    color: "#3B82F6",
                    bg: "rgba(59,130,246,0.12)",
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-[#1E2B42] p-3 text-center transition-all hover:border-[#2A3A54] hover:bg-[#131C2E]"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                      style={{ background: action.bg, color: action.color }}
                    >
                      {action.icon}
                    </div>
                    <span className="text-[10px] leading-tight text-[#8899AA]">{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Reconciliation Timeline ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ReconciliationTimeline progress={progress} />
        </motion.div>
      </div>
    </div>
  );
}
